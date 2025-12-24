# GitLab CI Integration

This guide provides complete examples for integrating Review-Robo into your GitLab CI/CD pipeline.

---

## Basic Integration

### Minimal Example

```yaml
# .gitlab-ci.yml

stages:
  - review

code_review:
  stage: review
  image: registry.example.com/review-robo:latest
  variables:
    REVIEW_CONFIG_TYPE: "next-ts"
  script:
    - node src/index.js
  only:
    - merge_requests
```

**Explanation**:
- Runs on every merge request
- Uses Docker image with Review-Robo pre-installed
- Defaults to TypeScript/Next.js configuration
- Uses `CI_JOB_TOKEN` for GitLab authentication (automatic)

---

## Complete Example with All Features

```yaml
# .gitlab-ci.yml

stages:
  - review
  - test
  - build

# Review job runs on every MR
automated_code_review:
  stage: review
  image: registry.example.com/review-robo:latest
  variables:
    REVIEW_CONFIG_TYPE: "next-ts"
    OUTPUT_DIR: ".cursor/reviews"
  before_script:
    - echo "Starting automated code review..."
    - echo "MR IID: $CI_MERGE_REQUEST_IID"
    - echo "Project ID: $CI_PROJECT_ID"
  script:
    - node /app/src/index.js
  after_script:
    - echo "Review artifacts saved to $OUTPUT_DIR"
  artifacts:
    paths:
      - .cursor/reviews/
    expire_in: 7 days
    when: always
  allow_failure: true  # Don't block pipeline if review fails
  only:
    - merge_requests
  except:
    - schedules
    - tags
```

**Features**:
- ✅ Runs only on merge requests
- ✅ Saves review artifacts for 7 days
- ✅ Doesn't block pipeline on failure
- ✅ Excludes scheduled pipelines and tags
- ✅ Logs MR context for debugging

---

## Advanced Patterns

### Pattern 1: Fail Pipeline on Critical Issues

```yaml
code_review_strict:
  stage: review
  image: registry.example.com/review-robo:latest
  variables:
    REVIEW_CONFIG_TYPE: "next-ts"
  script:
    - node /app/src/index.js
  allow_failure: false  # Block MR if critical issues found
  only:
    - merge_requests
```

**Behavior**: Pipeline fails (exit code 1) if critical issues are found, blocking merge until fixed.

---

### Pattern 2: Multiple Tech Stacks

```yaml
# Review frontend (TypeScript/React)
review_frontend:
  stage: review
  image: registry.example.com/review-robo:latest
  variables:
    REVIEW_CONFIG_TYPE: "next-ts"
  script:
    - node /app/src/index.js
  only:
    refs:
      - merge_requests
    changes:
      - "frontend/**/*.ts"
      - "frontend/**/*.tsx"
      - "shared/**/*.ts"

# Review backend (Java/Maven)
review_backend:
  stage: review
  image: registry.example.com/review-robo:latest
  variables:
    REVIEW_CONFIG_TYPE: "java-maven"
  script:
    - node /app/src/index.js
  only:
    refs:
      - merge_requests
    changes:
      - "backend/**/*.java"
      - "api/**/*.java"
```

**Benefits**:
- Different configurations for different parts of codebase
- Only runs when relevant files change
- Parallel execution for faster reviews

---

### Pattern 3: Complete MR Diff Review (Default Behavior)

Review-Robo always reviews the complete MR diff. No special configuration needed:

```yaml
code_review:
  stage: review
  image: registry.example.com/review-robo:latest
  script:
    - node /app/src/index.js
  only:
    - merge_requests
```

**Behavior**:
- Reviews the entire merge request diff
- Posts inline comments on specific lines
- Posts general summary comment with AI assessment
- Provides comprehensive context for every review

---

### Pattern 4: Conditional Review (Large MRs Only)

```yaml
code_review_large_mrs:
  stage: review
  image: registry.example.com/review-robo:latest
  variables:
    REVIEW_CONFIG_TYPE: "next-ts"
  script:
    # Only review if more than 10 files changed
    - |
      CHANGED_FILES=$(git diff --name-only $CI_MERGE_REQUEST_DIFF_BASE_SHA $CI_COMMIT_SHA | wc -l)
      echo "Changed files: $CHANGED_FILES"
      if [ $CHANGED_FILES -gt 10 ]; then
        echo "Large MR detected, running full review..."
        node /app/src/index.js
      else
        echo "Small MR, skipping automated review"
      fi
  only:
    - merge_requests
```

**Use Case**: Save AI API costs by only reviewing substantial changes.

---

### Pattern 4: Review with Custom Checks

```yaml
comprehensive_review:
  stage: review
  image: registry.example.com/review-robo:latest
  variables:
    REVIEW_CONFIG_TYPE: "next-ts"
  before_script:
    # Install dependencies if needed for pre-checks
    - cd $CI_PROJECT_DIR
    - npm ci --prefer-offline --no-audit
  script:
    # Run linter first (fast)
    - npm run lint
    # Run type checking (fast)
    - npm run type-check
    # Then run AI review (slow but comprehensive)
    - node /app/src/index.js
  artifacts:
    paths:
      - .cursor/reviews/
    reports:
      junit: lint-results.xml  # Optional: lint results
  only:
    - merge_requests
```

**Benefits**:
- Combines fast local checks with AI review
- Fails fast on obvious issues
- Comprehensive review for complex issues

---

### Pattern 5: Review with Notifications

```yaml
code_review_with_notify:
  stage: review
  image: registry.example.com/review-robo:latest
  variables:
    REVIEW_CONFIG_TYPE: "next-ts"
  script:
    - node /app/src/index.js
  after_script:
    # Send notification to Slack/Teams/etc.
    - |
      if [ -f .cursor/reviews/review-data.json ]; then
        GRADE=$(jq -r '.grade' .cursor/reviews/review-data.json)
        SCORE=$(jq -r '.score' .cursor/reviews/review-data.json)
        
        curl -X POST $SLACK_WEBHOOK_URL \
          -H 'Content-Type: application/json' \
          -d "{
            \"text\": \"Code review complete for MR !${CI_MERGE_REQUEST_IID}\",
            \"attachments\": [{
              \"color\": \"good\",
              \"fields\": [
                {\"title\": \"Grade\", \"value\": \"$GRADE\", \"short\": true},
                {\"title\": \"Score\", \"value\": \"$SCORE/100\", \"short\": true},
                {\"title\": \"MR\", \"value\": \"<${CI_MERGE_REQUEST_URL}|View MR>\"}
              ]
            }]
          }"
      fi
  only:
    - merge_requests
```

**Requires**: `SLACK_WEBHOOK_URL` variable set in CI/CD settings.

---

### Pattern 6: Review with Custom Output Directory

```yaml
review_with_custom_output:
  stage: review
  image: registry.example.com/review-robo:latest
  variables:
    OUTPUT_DIR: "/tmp/review-artifacts"
  script:
    - node /app/src/index.js
  artifacts:
    paths:
      - /tmp/review-artifacts/
    expire_in: 7 days
  only:
    - merge_requests
```

**Note**: Review-Robo automatically reviews the complete MR diff, providing comprehensive context for every review.

---

### Pattern 7: Review with Retry

```yaml
code_review_with_retry:
  stage: review
  image: registry.example.com/review-robo:latest
  variables:
    REVIEW_CONFIG_TYPE: "next-ts"
  script:
    - node /app/src/index.js
  retry:
    max: 2
    when:
      - api_failure      # Retry on API failures
      - runner_system_failure
      - stuck_or_timeout_failure
  timeout: 10 minutes   # Prevent hanging
  only:
    - merge_requests
```

**Benefits**: Handles transient API failures automatically.

---

## Docker Image Patterns

### Pattern 1: Building Review-Robo Image in Pipeline

```yaml
stages:
  - build
  - review

# Build the review-robo image
build_review_image:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - cd review-robo  # Submodule or separate repo
    - docker build -f base.Dockerfile -t $CI_REGISTRY_IMAGE/review-robo:latest .
    - docker push $CI_REGISTRY_IMAGE/review-robo:latest
  only:
    changes:
      - review-robo/**/*
    refs:
      - main

# Use the built image for reviews
code_review:
  stage: review
  image: $CI_REGISTRY_IMAGE/review-robo:latest
  script:
    - node /app/src/index.js
  only:
    - merge_requests
```

---

### Pattern 2: Using Public/Shared Registry

```yaml
code_review:
  stage: review
  # Use from shared registry
  image: registry.company.com/devops/review-robo:v1.0.0
  variables:
    REVIEW_CONFIG_TYPE: "next-ts"
  script:
    - node /app/src/index.js
  only:
    - merge_requests
```

---

### Pattern 3: Build Image Per Project (Custom Config)

```yaml
stages:
  - prepare
  - review

# Build custom image with project-specific config
prepare_review:
  stage: prepare
  image: docker:latest
  services:
    - docker:dind
  script:
    # Create Dockerfile with custom config
    - |
      cat > Dockerfile.review << 'EOF'
      FROM registry.company.com/review-robo:base
      COPY .review-config/ /app/config/custom/
      EOF
    - docker build -f Dockerfile.review -t review-robo:custom .
  artifacts:
    paths:
      - Dockerfile.review
  only:
    - merge_requests

code_review:
  stage: review
  image: review-robo:custom
  variables:
    REVIEW_CONFIG_TYPE: "custom"
  script:
    - node /app/src/index.js
  dependencies:
    - prepare_review
  only:
    - merge_requests
```

---

## Environment-Specific Configurations

### Pattern 1: Different Rules per Environment

```yaml
# Review for development branches (lenient)
review_dev:
  stage: review
  image: registry.example.com/review-robo:latest
  variables:
    REVIEW_CONFIG_TYPE: "next-ts"
  script:
    - node /app/src/index.js
  allow_failure: true  # Don't block development
  only:
    - merge_requests
  except:
    variables:
      - $CI_MERGE_REQUEST_TARGET_BRANCH_NAME == "main"

# Review for main branch (strict)
review_main:
  stage: review
  image: registry.example.com/review-robo:latest
  variables:
    REVIEW_CONFIG_TYPE: "next-ts"
  script:
    - node /app/src/index.js
  allow_failure: false  # Block if issues found
  only:
    - merge_requests
  only:
    variables:
      - $CI_MERGE_REQUEST_TARGET_BRANCH_NAME == "main"
```

---

### Pattern 2: Branch-Specific Configurations

```yaml
review_feature:
  stage: review
  image: registry.example.com/review-robo:latest
  variables:
    REVIEW_CONFIG_TYPE: "next-ts"
  script:
    - node /app/src/index.js
  only:
    - merge_requests
  only:
    refs:
      - /^feature\/.*$/   # Only feature branches

review_hotfix:
  stage: review
  image: registry.example.com/review-robo:latest
  variables:
    REVIEW_CONFIG_TYPE: "next-ts"
  script:
    - node /app/src/index.js
  allow_failure: true      # Don't block urgent hotfixes
  timeout: 5 minutes       # Faster timeout
  only:
    - merge_requests
  only:
    refs:
      - /^hotfix\/.*$/
```

---

## Performance Optimization

### Pattern 1: Parallel Reviews (Multi-Stage)

```yaml
stages:
  - review_fast
  - review_deep

# Fast checks (linting, formatting)
quick_review:
  stage: review_fast
  image: node:18
  script:
    - npm ci
    - npm run lint
    - npm run type-check
  only:
    - merge_requests

# Deep AI review (parallel with tests)
ai_review:
  stage: review_deep
  image: registry.example.com/review-robo:latest
  script:
    - node /app/src/index.js
  needs: []  # Don't wait for quick_review
  only:
    - merge_requests
```

---

### Pattern 2: Cached Dependencies

```yaml
code_review:
  stage: review
  image: registry.example.com/review-robo:latest
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
      - .cursor/
  script:
    - node /app/src/index.js
  only:
    - merge_requests
```

---

## Security Best Practices

### Pattern 1: Masked Variables

```yaml
code_review:
  stage: review
  image: registry.example.com/review-robo:latest
  variables:
    # Define in GitLab CI/CD settings as MASKED
    # CURSOR_API_KEY: cur-xxxxxx (masked)
    # GITLAB_TOKEN: glpat-xxxxxx (masked)
    REVIEW_CONFIG_TYPE: "next-ts"
  script:
    - node /app/src/index.js
  only:
    - merge_requests
```

**Setup in GitLab**:
1. Settings → CI/CD → Variables
2. Add `CURSOR_API_KEY` - check "Mask variable"
3. Add `GITLAB_TOKEN` - check "Mask variable"

---

### Pattern 2: Protected Branches Only

```yaml
code_review:
  stage: review
  image: registry.example.com/review-robo:latest
  variables:
    REVIEW_CONFIG_TYPE: "next-ts"
  script:
    - node /app/src/index.js
  only:
    - merge_requests
  only:
    refs:
      - main
      - develop
      - /^release\/.*$/
```

---

## Troubleshooting Pipeline Issues

### Issue: Job Hangs or Times Out

**Solution**:
```yaml
code_review:
  stage: review
  image: registry.example.com/review-robo:latest
  script:
    - node /app/src/index.js
  timeout: 15 minutes  # Increase if needed
  retry:
    max: 1
    when: stuck_or_timeout_failure
  only:
    - merge_requests
```

---

### Issue: "Missing CI_JOB_TOKEN"

**Solution**: Ensure `GIT_STRATEGY` is set:
```yaml
variables:
  GIT_STRATEGY: clone  # Required for MR context

code_review:
  stage: review
  image: registry.example.com/review-robo:latest
  script:
    - node /app/src/index.js
  only:
    - merge_requests
```

---

### Issue: Image Pull Failures

**Solution**:
```yaml
code_review:
  stage: review
  # Use specific version instead of :latest
  image: registry.example.com/review-robo:v1.0.0
  script:
    - node /app/src/index.js
  retry:
    max: 2
    when: runner_system_failure
  only:
    - merge_requests
```

---

## Complete Production-Ready Example

```yaml
# .gitlab-ci.yml
# Production-ready Review-Robo integration

# Global variables
variables:
  GIT_STRATEGY: clone
  REVIEW_IMAGE: registry.company.com/devops/review-robo:v1.2.0

# Pipeline stages
stages:
  - review
  - test
  - build

# ==============================================================================
# CODE REVIEW JOB
# ==============================================================================

automated_code_review:
  stage: review
  image: $REVIEW_IMAGE
  
  # Variables
  variables:
    REVIEW_CONFIG_TYPE: "next-ts"
    OUTPUT_DIR: ".cursor/reviews"
  
  # Setup
  before_script:
    - echo "========================================"
    - echo "Starting Automated Code Review"
    - echo "========================================"
    - echo "MR: !${CI_MERGE_REQUEST_IID}"
    - echo "Title: ${CI_MERGE_REQUEST_TITLE}"
    - echo "Author: ${GITLAB_USER_NAME}"
    - echo "Target: ${CI_MERGE_REQUEST_TARGET_BRANCH_NAME}"
    - echo "Source: ${CI_MERGE_REQUEST_SOURCE_BRANCH_NAME}"
    - echo "Config: ${REVIEW_CONFIG_TYPE}"
    - echo "========================================"
  
  # Main execution
  script:
    - node /app/src/index.js
  
  # Cleanup
  after_script:
    - echo "Review complete. Artifacts saved to ${OUTPUT_DIR}"
    - |
      if [ -f ${OUTPUT_DIR}/review-data.json ]; then
        echo "Review Summary:"
        jq -r '.grade, .score, .verdict' ${OUTPUT_DIR}/review-data.json
      fi
  
  # Artifacts
  artifacts:
    name: "review-mr-${CI_MERGE_REQUEST_IID}"
    paths:
      - ${OUTPUT_DIR}/
    reports:
      dotenv: ${OUTPUT_DIR}/review.env  # Optional: export variables
    expire_in: 14 days
    when: always
  
  # Performance
  cache:
    key: review-cache-${CI_COMMIT_REF_SLUG}
    paths:
      - .cursor/
  
  # Reliability
  retry:
    max: 2
    when:
      - api_failure
      - runner_system_failure
  
  timeout: 15 minutes
  
  # Don't block pipeline, but log failure
  allow_failure: true
  
  # Run conditions
  only:
    - merge_requests
  except:
    - schedules
    - tags
  
  # Run only when relevant files change
  only:
    changes:
      - "src/**/*.{ts,tsx,js,jsx}"
      - "components/**/*.{ts,tsx}"
      - "pages/**/*.{ts,tsx}"
      - "lib/**/*.{ts,tsx}"
  
  # Tags for specific runners (optional)
  tags:
    - docker
    - linux

# ==============================================================================
# OTHER JOBS (run in parallel)
# ==============================================================================

unit_tests:
  stage: test
  image: node:18
  script:
    - npm ci
    - npm run test
  needs: []  # Don't wait for review
  only:
    - merge_requests

integration_tests:
  stage: test
  image: node:18
  script:
    - npm ci
    - npm run test:integration
  needs: []
  only:
    - merge_requests
```

---

## Monitoring and Metrics

### Pattern: Export Review Metrics

```yaml
code_review:
  stage: review
  image: registry.example.com/review-robo:latest
  script:
    - node /app/src/index.js
    # Export metrics for monitoring
    - |
      if [ -f .cursor/reviews/review-data.json ]; then
        # Send to metrics service (Prometheus, DataDog, etc.)
        CRITICAL=$(jq -r '.executionStats.issueCount.critical' .cursor/reviews/review-data.json)
        MODERATE=$(jq -r '.executionStats.issueCount.moderate' .cursor/reviews/review-data.json)
        MINOR=$(jq -r '.executionStats.issueCount.minor' .cursor/reviews/review-data.json)
        GRADE=$(jq -r '.grade' .cursor/reviews/review-data.json)
        
        echo "code_review_critical_issues{project=\"$CI_PROJECT_NAME\"} $CRITICAL" | \
          curl --data-binary @- http://pushgateway:9091/metrics/job/code_review
      fi
  only:
    - merge_requests
```

---

## Next Steps

- **[API Reference](./06-api-reference.md)** - Detailed variable documentation
- **[Troubleshooting](./07-troubleshooting.md)** - Common issues and solutions
- **[Workflow](./03-workflow.md)** - Understand the review process

---

## CI/CD Checklist

Before deploying Review-Robo to production:

- [ ] Docker image built and pushed to registry
- [ ] `CURSOR_API_KEY` added to CI/CD variables (masked)
- [ ] `GITLAB_TOKEN` added to CI/CD variables (masked) - or use `CI_JOB_TOKEN`
- [ ] Review config type selected and tested
- [ ] Pipeline job added to `.gitlab-ci.yml`
- [ ] Tested with sample MR
- [ ] Artifact retention period configured
- [ ] `allow_failure` set appropriately
- [ ] Timeout configured
- [ ] Retry logic added
- [ ] Team notified about automated reviews
- [ ] Documentation updated with project-specific details

---

**Questions?** See [Troubleshooting](./07-troubleshooting.md) for common issues.

