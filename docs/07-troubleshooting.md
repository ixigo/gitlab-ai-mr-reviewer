# Troubleshooting Guide

Common issues and solutions for Review-Robo.

---

## Table of Contents

- [Prerequisites Issues](#prerequisites-issues)
- [Environment Configuration](#environment-configuration)
- [GitLab API Issues](#gitlab-api-issues)
- [Cursor API Issues](#cursor-api-issues)
- [Pipeline Failures](#pipeline-failures)
- [Review Quality Issues](#review-quality-issues)
- [Performance Issues](#performance-issues)
- [Docker Issues](#docker-issues)

---

## Prerequisites Issues

### Issue: "cursor-agent not found in PATH"

**Symptom**:
```
✗ Prerequisites check failed
Error: cursor-agent command not found
```

**Cause**: Cursor CLI not installed or not in PATH

**Solution**:

```bash
# Install Cursor CLI
curl https://cursor.com/install -fsS | bash

# Verify installation
which cursor-agent
# Should output: /home/user/.local/bin/cursor-agent

# If not in PATH, add it
export PATH="$HOME/.local/bin:$PATH"

# Add to .bashrc or .zshrc for persistence
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**Docker Solution**:
Ensure Dockerfile includes:
```dockerfile
RUN curl https://cursor.com/install -fsS | bash
ENV PATH="/root/.local/bin:$PATH"
```

---

### Issue: "Node.js version too old"

**Symptom**:
```
✗ Node.js 16.x.x detected
✗ Minimum required version: 18.0.0
```

**Cause**: Node.js version < 18.0.0

**Solution**:

```bash
# Check current version
node --version

# Using nvm (recommended)
nvm install 18
nvm use 18
nvm alias default 18

# Or update system Node.js
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS
brew install node@18
brew link node@18
```

**Docker Solution**:
```dockerfile
FROM node:18.11.1
```

---

## Environment Configuration

### Issue: "Missing required environment variable"

**Symptom**:
```
✗ Missing required environment variable: CURSOR_API_KEY
```

**Cause**: Environment variable not set

**Solution**:

**Local Development**:
```bash
# Create .env file
cat > .env << 'EOF'
CI_PROJECT_ID=12345
CI_MERGE_REQUEST_IID=42
GITLAB_TOKEN=glpat-xxxxx
CURSOR_API_KEY=cur-xxxxx
REVIEW_CONFIG_TYPE=next-ts
EOF

# Load environment
export $(cat .env | xargs)

# OR use dotenv (automatic)
node src/index.js
```

**GitLab CI**:
```yaml
# .gitlab-ci.yml
code_review:
  variables:
    REVIEW_CONFIG_TYPE: "next-ts"
  # Add CURSOR_API_KEY and GITLAB_TOKEN in CI/CD settings
```

Add in GitLab:
1. Settings → CI/CD → Variables
2. Add `CURSOR_API_KEY` (masked)
3. Add `GITLAB_TOKEN` (masked)

---

### Issue: "Invalid REVIEW_CONFIG_TYPE"

**Symptom**:
```
✗ Configuration directory not found: config/invalid-type
```

**Cause**: Config type doesn't exist

**Solution**:

```bash
# Check available configs
ls config/

# Should show:
# next-ts/
# java-maven/
# README.md

# Use existing config
export REVIEW_CONFIG_TYPE=next-ts

# OR create custom config
mkdir -p config/my-config
cp config/next-ts/cli.json config/my-config/
export REVIEW_CONFIG_TYPE=my-config
```

---

## GitLab API Issues

### Issue: "Failed to fetch MR data: 401 Unauthorized"

**Symptom**:
```
✗ Failed to fetch MR data: HTTP 401
Error: Unauthorized
```

**Cause**: Invalid or expired GitLab token

**Solution**:

```bash
# Test GitLab token
curl -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "$CI_SERVER_URL/api/v4/projects/$CI_PROJECT_ID/merge_requests/$CI_MERGE_REQUEST_IID"

# Should return JSON, not 401

# If 401, generate new token:
# GitLab → Settings → Access Tokens
# Scopes: api, read_repository, write_repository
```

**CI Solution**: Use `CI_JOB_TOKEN` (automatic):
```yaml
code_review:
  script:
    - node src/index.js
  # CI_JOB_TOKEN is automatically available
```

---

### Issue: "Failed to fetch MR data: 404 Not Found"

**Symptom**:
```
✗ Failed to fetch MR data: HTTP 404
Error: 404 Project Not Found
```

**Cause**: Incorrect project ID or MR IID

**Solution**:

```bash
# Verify project ID
echo $CI_PROJECT_ID

# Find project ID in GitLab
# Project → Settings → General → Project ID: 12345

# Verify MR IID (not global ID!)
echo $CI_MERGE_REQUEST_IID

# MR IID is the number in URL: /merge_requests/42
# NOT the global ID shown in MR details

# Test API call
curl -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "$CI_SERVER_URL/api/v4/projects/$CI_PROJECT_ID"
# Should return project info

curl -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "$CI_SERVER_URL/api/v4/projects/$CI_PROJECT_ID/merge_requests/$CI_MERGE_REQUEST_IID"
# Should return MR info
```

---

### Issue: "Failed to post inline comment: 400 Bad Request"

**Symptom**:
```
✗ Failed to post comment: src/file.ts:42
Error: 400 Bad Request - line not in diff
```

**Cause**: Line number not in the MR diff

**Why**: AI provided incorrect line number, or line was in context (not changed)

**Solution**: This is expected behavior for some comments. The system logs and continues.

**To Investigate**:
```bash
# Check the diff file
cat .cursor/reviews/mr-diff.patch

# Search for the file
grep -A 20 "diff --git a/src/file.ts" .cursor/reviews/mr-diff.patch

# Look for the line number in the diff
# Lines starting with '+' or '-' are in diff
# Lines starting with ' ' (space) are context only
```

**Prevention**: AI is instructed to calculate line numbers correctly, but may occasionally get it wrong for complex diffs.

---

### Issue: "GitLab API rate limit exceeded"

**Symptom**:
```
✗ Failed to post comment: HTTP 429
Error: Rate limit exceeded
```

**Cause**: Too many API requests (>2000/minute)

**Solution**:

**Immediate**:
```bash
# Wait 1 minute, then retry
sleep 60
node src/index.js
```

**Prevention**:
```yaml
# Add retry logic in CI
code_review:
  retry:
    max: 2
    when:
      - api_failure
```

**Long-term**:
- Reduce review frequency
- Batch multiple changes before review
- Contact GitLab admin to increase rate limit

---

## Cursor API Issues

### Issue: "Cursor API authentication failed"

**Symptom**:
```
[cursor-agent stderr]: Authentication failed
Error: Invalid API key
```

**Cause**: Invalid or expired `CURSOR_API_KEY`

**Solution**:

```bash
# Test Cursor API key
cursor-agent -p "test prompt" --model "sonnet-4.5"

# If fails, generate new key:
# 1. Go to https://cursor.com/settings
# 2. Navigate to API Keys
# 3. Generate new key
# 4. Update environment variable

export CURSOR_API_KEY=cur-xxxxx

# Update in GitLab CI:
# Settings → CI/CD → Variables → Edit CURSOR_API_KEY
```

---

### Issue: "cursor-agent timed out"

**Symptom**:
```
✗ cursor-agent timed out after 300000ms
Error: Command timeout
```

**Cause**: Large diff or slow AI response

**Solution**:

**Temporary** (for large MRs):
```javascript
// src/constants/config.js
// Increase timeout
commandTimeout: 600000 // 10 minutes (default: 5 minutes)
```

**Pipeline**:
```yaml
code_review:
  timeout: 15 minutes  # Increase job timeout
```

**Prevention**:
- Break large MRs into smaller ones
- Exclude generated files from diff
- Review only critical files

---

### Issue: "Cursor API rate limit / quota exceeded"

**Symptom**:
```
[cursor-agent stderr]: Rate limit exceeded
Error: Too many requests
```

**Cause**: Exceeded Cursor API quota

**Solution**:

**Immediate**: Wait or upgrade plan

**Check Usage**:
```bash
# Check Cursor dashboard
# https://cursor.com/dashboard → Usage
```

**Prevention**:
- Limit reviews to important MRs only
- Use conditional logic (large MRs only)
- Increase Cursor plan quota

```yaml
# Only review large MRs
code_review:
  script:
    - |
      CHANGED_FILES=$(git diff --name-only $CI_MERGE_REQUEST_DIFF_BASE_SHA $CI_COMMIT_SHA | wc -l)
      if [ $CHANGED_FILES -gt 10 ]; then
        node src/index.js
      fi
```

---

### Issue: "Truncated JSON response"

**Symptom**:
```
⚠ JSON appears incomplete - missing verdict field (likely truncated)
```

**Cause**: AI response exceeded max tokens

**Impact**: Partial review data, some issues may be missing

**Solution**: This is handled automatically by `fixIncompleteJSON()`, but you can:

**Adjust max_tokens**:
```json
// config/<tech>/cli.json
{
  "settings": {
    "ai": {
      "max_tokens": 12000  // Increase (default: 8000)
    }
  }
}
```

**Check Output**:
```bash
# View raw output
cat .cursor/reviews/cursor-agent-output.json

# Check if complete
jq '.verdict, .nextSteps' .cursor/reviews/review-data.json
```

---

## Pipeline Failures

### Issue: "Job pending - no runners available"

**Symptom**:
```
Pipeline stuck on "pending"
```

**Cause**: No GitLab runners with matching tags

**Solution**:

**Remove tags**:
```yaml
code_review:
  # Remove or adjust tags
  # tags:
  #   - docker
  script:
    - node src/index.js
```

**Or configure runner tags**:
1. Settings → CI/CD → Runners
2. Ensure runners have required tags
3. OR use shared runners

---

### Issue: "Docker image pull failed"

**Symptom**:
```
Error: Cannot pull image registry.example.com/review-robo:latest
```

**Cause**: Image not found or authentication issue

**Solution**:

**Verify image exists**:
```bash
docker pull registry.example.com/review-robo:latest
```

**Authentication**:
```yaml
# .gitlab-ci.yml
code_review:
  image: registry.example.com/review-robo:latest
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
```

**Or use public image**:
```yaml
code_review:
  image: node:18
  before_script:
    - curl https://cursor.com/install -fsS | bash
    - export PATH="$HOME/.local/bin:$PATH"
    - npm install
```

---

### Issue: "Pipeline runs on every commit"

**Symptom**: Review job runs too frequently

**Solution**:

```yaml
# Only run on MRs
code_review:
  only:
    - merge_requests  # MR pipelines only
  except:
    - schedules       # Exclude scheduled pipelines
    - tags            # Exclude tag pipelines

# Or only when specific files change
code_review:
  only:
    refs:
      - merge_requests
    changes:
      - "src/**/*.ts"
      - "src/**/*.tsx"
```

---

## Review Quality Issues

### Issue: "AI provides incorrect line numbers"

**Symptom**: Inline comments posted on wrong lines or fail to post

**Cause**: AI miscalculated line numbers from diff

**Why**: Complex diffs, multiple hunks, renamed files

**Solution**:

**Check prompt**: Ensure prompt includes line number guidance (already included)

**Verify diff format**:
```bash
cat .cursor/reviews/mr-diff.patch

# Ensure format is correct:
# @@ -old_start,old_count +new_start,new_count @@
```

**Manual correction** (if needed):
```javascript
// src/review/transformer.js
// Add validation/correction logic if patterns emerge
```

**Report Pattern**: If consistent issues, document pattern and adjust prompt.

---

### Issue: "Too many false positives"

**Symptom**: AI flags correct code as issues

**Solution**:

**Adjust rules**:
```json
// config/<tech>/cli.json
// Add exclusions or adjust focus_areas
{
  "settings": {
    "review": {
      "focus_areas": [
        "type_safety",
        "security"
        // Remove "code_style" if too strict
      ]
    }
  }
}
```

**Add custom rules**:
```markdown
// config/<tech>/rules/overrides.mdc
# Custom Rules

## Acceptable Patterns

- Pattern 1: Description of acceptable usage
- Pattern 2: When this is okay
```

**Adjust temperature**:
```json
{
  "settings": {
    "ai": {
      "temperature": 0.1  // More deterministic (less false positives)
    }
  }
}
```

---

### Issue: "Metric counts don't match issues array"

**Symptom**:
```
⚠ MISMATCH: Metrics report 20 total issues but issues array has 15 entries
```

**Cause**: AI counted issues but didn't provide details for all

**Impact**: Some issues not posted as inline comments

**Solution**: This is logged as a warning. The system uses available issues.

**To improve**:
- Increase `max_tokens` in config
- Break large MRs into smaller ones
- Re-run review (AI may provide more details)

---

### Issue: "Grade seems too harsh/lenient"

**Symptom**: Grade doesn't match code quality expectations

**Solution**:

**Adjust thresholds**:
```json
// config/<tech>/cli.json
{
  "settings": {
    "review": {
      "thresholds": {
        "critical": 3,   // Stricter (default: 5)
        "moderate": 8,   // Stricter (default: 10)
        "minor": 12      // Stricter (default: 15)
      }
    }
  }
}
```

**Adjust weights** (requires code change):
```javascript
// src/review/grading.js
const WEIGHTS = {
  CRITICAL: 15,  // Harsher (default: 10)
  MODERATE: 5,   // Harsher (default: 3)
  MINOR: 2       // Harsher (default: 1)
};
```

---

## Performance Issues

### Issue: "Review takes too long (>5 minutes)"

**Symptom**: Pipeline timeout or slow reviews

**Causes**:
- Large diff (>1000 lines)
- Many files changed (>20)
- Slow AI response

**Solution**:

**Optimize diff**:
```yaml
# Only review specific files
code_review:
  only:
    changes:
      - "src/**/*.ts"
      - "!src/**/*.test.ts"  # Exclude tests
      - "!src/**/*.spec.ts"
```

**Increase timeout**:
```yaml
code_review:
  timeout: 15 minutes
```

**Split reviews**:
```yaml
# Review frontend separately
review_frontend:
  script:
    - node src/index.js
  only:
    changes:
      - "frontend/**/*.ts"

# Review backend separately
review_backend:
  script:
    - node src/index.js
  only:
    changes:
      - "backend/**/*.java"
```

---

### Issue: "High Cursor API costs"

**Symptom**: Unexpected API charges

**Cause**: Many reviews or large diffs

**Solution**:

**Monitor usage**:
```bash
# Track in review data
jq '.executionStats' .cursor/reviews/review-data.json
```

**Reduce reviews**:
```yaml
# Only review on specific branches
code_review:
  only:
    refs:
      - merge_requests
    variables:
      - $CI_MERGE_REQUEST_TARGET_BRANCH_NAME == "main"

# Or only large MRs
code_review:
  script:
    - |
      LINES_CHANGED=$(git diff --stat $CI_MERGE_REQUEST_DIFF_BASE_SHA $CI_COMMIT_SHA | tail -1 | awk '{print $4}')
      if [ $LINES_CHANGED -gt 500 ]; then
        node src/index.js
      fi
```

---

## Docker Issues

### Issue: "Docker build fails"

**Symptom**:
```
Error: Failed to build image
```

**Solution**:

**Check Dockerfile**:
```bash
# Test build locally
docker build -f base.Dockerfile -t review-robo:test .

# Check for errors in output
```

**Common issues**:
```dockerfile
# Ensure base image is accessible
FROM node:20.11.1  # Use specific version

# Ensure Cursor install works
RUN curl https://cursor.com/install -fsS | bash

# Verify PATH
ENV PATH="/root/.local/bin:$PATH"

# Verify files exist
COPY src /app/src
COPY config /app/config
```

---

### Issue: "Container exits immediately"

**Symptom**: Job starts but fails instantly

**Cause**: Missing environment variables or permissions

**Solution**:

**Test locally**:
```bash
docker run --rm \
  -e CURSOR_API_KEY=$CURSOR_API_KEY \
  -e GITLAB_TOKEN=$GITLAB_TOKEN \
  -e CI_PROJECT_ID=12345 \
  -e CI_MERGE_REQUEST_IID=42 \
  review-robo:latest \
  node /app/src/index.js
```

**Check logs**:
```yaml
code_review:
  after_script:
    - cat /app/logs/* || true
```

---

## Debugging Tips

### Enable Debug Mode

```bash
# Set debug environment variable
export DEBUG=true

# Run with verbose logging
node src/index.js 2>&1 | tee review-debug.log
```

### Check Artifacts

```bash
# Review all artifacts
ls -la .cursor/reviews/

# review-data.json - Complete review
# mr-diff.patch - The diff that was analyzed
# cursor-agent-output.json - Raw AI output
# review-prompt.txt - Prompt sent to AI
# changed-files.json - Files list
```

### Test Individual Components

```bash
# Test GitLab API
node -e "
  const { fetchMRData } = require('./src/api/gitlab');
  fetchMRData().then(console.log).catch(console.error);
"

# Test Cursor CLI
cursor-agent -p "Review this code: console.log('test')" --model "sonnet-4.5"

# Test config loading
node -e "
  const { setupCursorConfig } = require('./src/services/config-setup');
  setupCursorConfig(process.cwd());
  console.log('Config setup successful');
"
```

### Validate Environment

```bash
# Check all environment variables
env | grep -E '(GITLAB|CURSOR|CI_PROJECT|CI_MERGE|REVIEW)'

# Should output:
# CURSOR_API_KEY=cur-...
# CI_PROJECT_ID=...
# CI_MERGE_REQUEST_IID=...
# REVIEW_CONFIG_TYPE=...
```

---

## Getting Help

### Before Asking for Help

Collect this information:

1. **Environment**:
   ```bash
   node --version
   cursor-agent --version
   cat .cursor/reviews/review-data.json | jq '.mrOverview'
   ```

2. **Error messages**:
   ```bash
   # Full error output
   cat review-debug.log
   ```

3. **Configuration**:
   ```bash
   cat config/$REVIEW_CONFIG_TYPE/cli.json
   ```

4. **Diff size**:
   ```bash
   wc -l .cursor/reviews/mr-diff.patch
   ```

### Support Channels

1. **Documentation**: Check all docs in `docs/` directory
2. **Issue Tracker**: Search existing issues
3. **Team Chat**: Ask in team channel
4. **GitLab Issues**: File bug report with above info

---

## FAQ

**Q: Why does the review fail but the pipeline passes?**  
A: `allow_failure: true` in CI config. Change to `false` to block pipeline.

**Q: Can I review specific files only?**  
A: Yes, use `only: changes:` in GitLab CI. Review-Robo already filters by file type.

**Q: How do I skip review for draft MRs?**  
A: Add to CI config:
```yaml
except:
  variables:
    - $CI_MERGE_REQUEST_TITLE =~ /^(Draft|WIP):/
```

**Q: Can I customize the comment format?**  
A: Yes, edit `src/comments/inline.js` and `src/comments/general.js`.

**Q: Does it review the entire codebase?**  
A: No, only the diff (changed lines) in the MR.

**Q: Can I use a different AI model?**  
A: Yes, change `model` in `config/<tech>/cli.json` (e.g., `"claude-sonnet-4"`).

---

**Still having issues?** Check:
- [API Reference](./06-api-reference.md) for configuration options
- [Workflow](./03-workflow.md) to understand the process
- [Setup Guide](./04-setup-configuration.md) for initial configuration

---

**Last Updated**: Documentation v1.0.0

