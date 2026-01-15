# GitLab AI MR Reviewer 🤖

**AI-Powered Automated Code Review System for GitLab Merge Requests**

GitLab AI MR Reviewer is an intelligent **automated code review** tool for **GitLab merge requests** that uses **AI-powered code analysis** with **Claude Sonnet 4.5** through **Cursor Agent CLI**. This **Docker-based code review automation** integrates seamlessly with **GitLab CI/CD pipelines** to provide comprehensive, context-aware code reviews for your merge requests. Perfect for teams looking to automate code quality checks, improve code review efficiency, and maintain consistent code standards across **TypeScript**, **Java**, **Kotlin**, and other supported technologies.

---

## 🚀 Quick Start

### Pull the Image

```bash
docker pull ixigotech/gitlab-ai-mr-reviewer:latest
```

### Basic Usage in GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - review

code_review:
  stage: review
  image: ixigotech/gitlab-ai-mr-reviewer:latest
  script:
    - node /app/dist/index.js
  artifacts:
    paths:
      - .cursor/reviews/
    expire_in: 7 days
  only:
    - merge_requests
```

**That's it!** GitLab AI MR Reviewer automatically:
- ✅ Detects your project's tech stack (TypeScript/Next.js, Java/Maven, Kotlin, etc.)
- ✅ Fetches MR diff from GitLab
- ✅ Performs AI-powered code review
- ✅ Posts inline comments and summary to your MR

---

## 🌟 Key Features

- **🤖 Auto-Detection**: Automatically identifies project tech stack - no configuration needed!
- **🔍 Inline Comments**: Posts specific issues directly on problematic lines
- **📊 Comprehensive Reports**: Detailed metrics, grading, and actionable recommendations
- **🛠️ Multi-Language Support**: TypeScript/Next.js, Java/Maven, Kotlin, Java/Gradle
- **⚡ Fast**: Typically completes in 2-3 minutes
- **🔄 GitLab Native**: Seamless integration with GitLab MR workflow

---

## 📋 Environment Variables

### Required Variables for GitLab CI

These variables must be configured in your GitLab project's **CI/CD Variables** (Settings → CI/CD → Variables):

| Variable | Description | How to Set | Example |
|----------|-------------|------------|---------|
| `CURSOR_API_KEY` | Cursor API key for AI access | ⚠️ **Manual**: Add in CI/CD Variables | `cur-xxxxxxxxxxxxx` |
| `CI_PROJECT_ID` | GitLab project ID | ✅ **Automatic**: Set by GitLab CI | `12345` |
| `CI_MERGE_REQUEST_IID` | Merge request internal ID | ✅ **Automatic**: Set by GitLab CI | `42` |
| `CI_SERVER_URL` | GitLab instance URL | ✅ **Automatic**: Set by GitLab CI | `https://gitlab.com` |
| `GITLAB_TOKEN` | GitLab API token | ⚠️ **Optional**: Use `CI_JOB_TOKEN` instead (automatic) | `glpat-xxxxx` |

**Important Notes**:
- ✅ `CI_PROJECT_ID`, `CI_MERGE_REQUEST_IID`, and `CI_SERVER_URL` are **automatically provided** by GitLab CI - no setup needed!
- ✅ `CI_JOB_TOKEN` is **automatically provided** by GitLab CI and has necessary permissions - no manual token needed!
- ⚠️ `CURSOR_API_KEY` **must be manually added** in GitLab CI/CD Variables (see [How to Get Cursor API Key](#-how-to-get-cursor-api-key) below)
- ⚠️ If you choose to use `GITLAB_TOKEN` instead of `CI_JOB_TOKEN`, it must be manually added with scopes: `api`, `read_repository`, `write_repository`

### How to Get Cursor API Key

GitLab AI MR Reviewer uses **Cursor Agent CLI** which connects to **Claude Sonnet 4.5** for AI-powered code reviews.

**Steps to get your Cursor API Key**:

1. **Sign up/Login to Cursor**:
   - Go to [https://cursor.com](https://cursor.com)
   - Create an account or sign in

2. **Navigate to API Settings**:
   - Go to [https://cursor.com/settings](https://cursor.com/settings)
   - Click on **"API Keys"** section

3. **Create New API Key**:
   - Click **"Create API Key"** or **"Generate New Key"**
   - Copy the API key (it starts with `cur-`)
   - ⚠️ **Important**: Save it immediately - you won't be able to see it again!

4. **Add to GitLab CI/CD Variables**:
   - In your GitLab project, go to **Settings → CI/CD → Variables**
   - Click **"Add variable"**
   - **Key**: `CURSOR_API_KEY`
   - **Value**: Paste your API key (e.g., `cur-xxxxxxxxxxxxx`)
   - ✅ **Check "Mask variable"** to hide it in logs
   - ✅ **Check "Protect variable"** if you want it only in protected branches
   - Click **"Add variable"**

**API Key Format**:
- Starts with `cur-` prefix
- Example: `cur-abc123def456ghi789`

**Security Best Practices**:
- ✅ Always **mask** the variable in GitLab CI/CD settings
- ✅ Use **protected variables** for production branches
- ✅ Rotate API keys regularly
- ✅ Never commit API keys to repository

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OUTPUT_DIR` | Output directory for review artifacts | `.cursor/reviews` |
| `CI_SERVER_URL` | GitLab server URL | `https://gitlab.com` |

---

## 🎯 Supported Technologies

GitLab AI MR Reviewer **automatically detects** your project's tech stack:

- **TypeScript/Next.js** (`next-ts`) - Auto-detected when `package.json` has `next` and `react`
- **Java/Maven** (`java-maven`) - Auto-detected when `pom.xml` exists
- **Java/Gradle** (`java-gradle`) - Auto-detected when `build.gradle` exists
- **Kotlin** (`kotlin`) - Auto-detected when `build.gradle.kts` exists

No manual configuration needed!

---

## 🤝 Contributing & Adding New Tech Stacks

Want to add support for your favorite programming language or framework? We welcome contributions!

### How to Contribute

1. **Fork the Repository**
   - Visit [GitHub Repository](https://github.com/ixigo/gitlab-ai-mr-reviewer)
   - Click "Fork" to create your own copy

2. **Add Your Tech Stack**
   - Create a new configuration directory: `config/<your-tech-stack>/`
   - Add `cli.json` with review settings
   - Create `rules/` directory with tech-specific review rules
   - Update `src/services/tech-stack-detector.ts` to detect your stack
   - Test with sample code

3. **Submit a Pull Request**
   - Follow our [Contributing Guidelines](https://github.com/ixigo/gitlab-ai-mr-reviewer/blob/main/CONTRIBUTING.md)
   - Use conventional commit format (e.g., `feat: add Python support`)
   - Include examples and documentation

### Quick Guide: Adding a Tech Stack

**Example**: Adding Python support

1. **Create config directory**:
   ```bash
   mkdir -p config/python
   ```

2. **Add `cli.json`**:
   ```json
   {
     "version": "1.0",
     "settings": {
       "review": {
         "focus_areas": ["code_quality", "best_practices", "error_handling"],
         "severity_levels": ["critical", "moderate", "minor"],
         "thresholds": {
           "critical": 5,
           "moderate": 10,
           "minor": 15
         }
       },
       "ai": {
         "model": "claude-sonnet-4.5",
         "temperature": 0.2
       }
     }
   }
   ```

3. **Add review rules**:
   ```bash
   mkdir -p config/python/rules
   # Create python-rules.mdc, review-rules.mdc, etc.
   ```

4. **Update tech stack detector**:
   - Edit `src/services/tech-stack-detector.ts`
   - Add detection logic (e.g., check for `requirements.txt` or `setup.py`)

5. **Test and submit PR**:
   - Test with a sample Python project
   - Submit pull request with description

**Full Documentation**: See [Contributing Guide](https://github.com/ixigo/gitlab-ai-mr-reviewer/blob/main/CONTRIBUTING.md) and [Configuration Guide](https://github.com/ixigo/gitlab-ai-mr-reviewer/blob/main/docs/04-setup-configuration.md#creating-custom-configurations) for detailed instructions.

---

## 📖 Usage Examples

### Example 1: Basic GitLab CI Integration

```yaml
code_review:
  stage: review
  image: ixigotech/gitlab-ai-mr-reviewer:latest
  script:
    - node /app/dist/index.js
  only:
    - merge_requests
```

### Example 2: With Artifacts and Timeout

```yaml
code_review:
  stage: review
  image: ixigotech/gitlab-ai-mr-reviewer:latest
  script:
    - node /app/dist/index.js
  artifacts:
    paths:
      - .cursor/reviews/
    expire_in: 7 days
  timeout: 15 minutes
  allow_failure: true
  only:
    - merge_requests
```

### Example 3: Multiple Tech Stacks

```yaml
# Review frontend
review_frontend:
  stage: review
  image: ixigotech/gitlab-ai-mr-reviewer:latest
  script:
    - node /app/dist/index.js
  only:
    changes:
      - "frontend/**/*.{ts,tsx}"

# Review backend
review_backend:
  stage: review
  image: ixigotech/gitlab-ai-mr-reviewer:latest
  script:
    - node /app/dist/index.js
  only:
    changes:
      - "backend/**/*.java"
```

### Example 4: Local Testing

```bash
docker run --rm \
  -e CURSOR_API_KEY=cur-xxxxx \
  -e GITLAB_TOKEN=glpat-xxxxx \
  -e CI_PROJECT_ID=12345 \
  -e CI_MERGE_REQUEST_IID=42 \
  -v $(pwd):/workspace \
  -w /workspace \
  ixigotech/gitlab-ai-mr-reviewer:latest \
  node /app/dist/index.js
```

---

## 🏗️ Image Details

### Base Image
- **Node.js**: 20.11.1
- **OS**: Debian-based (from official Node image)

### Included Components
- ✅ Node.js runtime (v20.11.1)
- ✅ Cursor Agent CLI (pre-installed)
- ✅ GitLab AI MR Reviewer application (compiled TypeScript)
- ✅ Multi-tech-stack configurations

### Image Size
- **Approximate**: ~500MB (includes Node.js, Cursor CLI, and application)

### Working Directory
- `/app` - Application root directory

### Entry Point
- `node /app/dist/index.js` - Main application entry point

---

## 📊 What GitLab AI MR Reviewer Does

1. **Fetches MR Diff** - Retrieves all changes from GitLab API
2. **Detects Tech Stack** - Automatically identifies project technology
3. **AI Analysis** - Uses **Cursor Agent CLI** with **Claude Sonnet 4.5** to analyze code changes
4. **Posts Comments** - Creates inline comments on specific lines
5. **Summary Report** - Posts overall assessment with metrics and grading

### AI Agent Details

- **Agent**: Cursor Agent CLI
- **AI Model**: Claude Sonnet 4.5 (via Cursor)
- **Provider**: Cursor (powered by Anthropic)
- **API Key Required**: Yes (`CURSOR_API_KEY`)
- **How to Get API Key**: See [How to Get Cursor API Key](#-how-to-get-cursor-api-key) section above

### Review Output

- **Inline Comments**: Specific issues posted on problematic code lines
- **General Comment**: Overall MR assessment with:
  - Grade (A+ to F)
  - Score (0-100)
  - Issue counts (Critical, Moderate, Minor)
  - Key recommendations
  - Quality metrics

---

## 🔒 Security

- **Diff-Only Analysis**: Only MR changes sent to AI, not entire codebase
- **No Data Retention**: Cursor/Claude don't store code after analysis
- **Secure Communication**: All API calls use HTTPS
- **Token Security**: Use masked variables in GitLab CI/CD settings

**Best Practices**:
- ✅ Use `CI_JOB_TOKEN` in GitLab CI (automatic, no manual token needed)
- ✅ Mask `CURSOR_API_KEY` in CI/CD variables (Settings → CI/CD → Variables → Mask variable)
- ✅ Protect variables for production branches (Settings → CI/CD → Variables → Protect variable)
- ✅ Rotate API keys regularly
- ✅ Never commit API keys to repository

---

## 📈 Performance

**Typical Review Times**:
- Small MR (5-10 files): ~1-2 minutes
- Medium MR (10-20 files): ~2-3 minutes
- Large MR (20+ files): ~3-5 minutes

**Resource Usage**:
- Memory: ~200MB
- CPU: Minimal (mostly waiting for AI API)
- Network: ~1-2 MB per review

---

## 🐛 Troubleshooting

### Issue: "cursor-agent not found"
The image includes Cursor Agent CLI pre-installed. If you see this error, ensure you're using the correct image.

### Issue: "Missing required environment variable"
Ensure all required variables are set in GitLab CI/CD Variables:

**Automatically provided by GitLab CI** (no setup needed):
- `CI_PROJECT_ID` - Automatically set
- `CI_MERGE_REQUEST_IID` - Automatically set
- `CI_SERVER_URL` - Automatically set
- `CI_JOB_TOKEN` - Automatically set (can be used instead of `GITLAB_TOKEN`)

**Must be manually added in CI/CD Variables**:
- `CURSOR_API_KEY` - ⚠️ **Required**: Add in Settings → CI/CD → Variables
  - Get your key from: https://cursor.com/settings → API Keys
  - Format: `cur-xxxxxxxxxxxxx`
  - ✅ Mask the variable to hide it in logs

**Optional** (if not using `CI_JOB_TOKEN`):
- `GITLAB_TOKEN` - Only needed if you want to use a personal/project token instead of `CI_JOB_TOKEN`

### Issue: "Failed to fetch MR data"
- Verify `GITLAB_TOKEN` has `api` scope
- Check `CI_PROJECT_ID` and `CI_MERGE_REQUEST_IID` are correct
- Ensure GitLab server URL is accessible

### Issue: "Cursor API error"
- Verify `CURSOR_API_KEY` is valid and correctly set in CI/CD Variables
- Check that the API key format is correct (starts with `cur-`)
- Verify the key hasn't expired or been revoked
- Check API rate limits on your Cursor plan
- Ensure network connectivity to Cursor API from your GitLab runner
- **How to verify**: Go to https://cursor.com/settings → API Keys to check your key status

---

## 📚 Documentation

For detailed documentation, see:

- **[GitHub Repository](https://github.com/ixigo/gitlab-ai-mr-reviewer)** - Source code and full documentation
- **[Setup Guide](https://github.com/ixigo/gitlab-ai-mr-reviewer/blob/main/docs/04-setup-configuration.md)** - Detailed setup instructions
- **[GitLab CI Integration](https://github.com/ixigo/gitlab-ai-mr-reviewer/blob/main/docs/05-gitlab-ci-integration.md)** - Complete CI/CD examples
- **[API Reference](https://github.com/ixigo/gitlab-ai-mr-reviewer/blob/main/docs/06-api-reference.md)** - Environment variables and configuration
- **[Troubleshooting](https://github.com/ixigo/gitlab-ai-mr-reviewer/blob/main/docs/07-troubleshooting.md)** - Common issues and solutions

---

## 🏷️ Image Tags

- `latest` - Latest stable release
- `v1.0.0` - Specific version (semantic versioning)
- `v1.0.x` - Patch versions

**Recommended**: Use specific version tags in production (e.g., `v1.0.0`) instead of `latest` for stability.

---

## 🤝 Contributing

Contributions are welcome! We especially encourage contributions for:

- **New Tech Stack Support**: Add support for Python, Go, Rust, PHP, Ruby, and more
- **Enhanced Review Rules**: Improve existing tech stack review guidelines
- **Bug Fixes**: Help us fix issues and improve reliability
- **Documentation**: Improve guides and examples

**Get Started**:
- 📖 [Contributing Guide](https://github.com/ixigo/gitlab-ai-mr-reviewer/blob/main/CONTRIBUTING.md) - Development setup, commit guidelines, PR process
- 🔧 [Configuration Guide](https://github.com/ixigo/gitlab-ai-mr-reviewer/blob/main/docs/04-setup-configuration.md#creating-custom-configurations) - How to add new tech stacks
- 🐛 [Report Issues](https://github.com/ixigo/gitlab-ai-mr-reviewer/issues) - Found a bug? Let us know!
- 💡 [Feature Requests](https://github.com/ixigo/gitlab-ai-mr-reviewer/issues) - Have an idea? Share it!

**Quick Links**:
- [GitHub Repository](https://github.com/ixigo/gitlab-ai-mr-reviewer)
- [Contributing Guide](https://github.com/ixigo/gitlab-ai-mr-reviewer/blob/main/CONTRIBUTING.md)
- [Configuration Documentation](https://github.com/ixigo/gitlab-ai-mr-reviewer/blob/main/config/README.md)

**See also**: [Contributing & Adding New Tech Stacks](#-contributing--adding-new-tech-stacks) section above for detailed instructions on adding tech stack support.

---

## 📄 License

ISC License - See [LICENSE](https://github.com/ixigo/gitlab-ai-mr-reviewer/blob/main/LICENSE) file for details.

---

## 🆘 Support

- **Documentation**: [Full Documentation Index](https://github.com/ixigo/gitlab-ai-mr-reviewer/blob/main/docs/INDEX.md)
- **Issues**: [GitHub Issues](https://github.com/ixigo/gitlab-ai-mr-reviewer/issues)
- **Troubleshooting**: [Troubleshooting Guide](https://github.com/ixigo/gitlab-ai-mr-reviewer/blob/main/docs/07-troubleshooting.md)

---

## 🎓 Learn More

- **Cursor Agent CLI**: [Cursor Documentation](https://cursor.com/docs)
- **Get Cursor API Key**: [Cursor Settings → API Keys](https://cursor.com/settings)
- **Claude Sonnet 4.5**: [Anthropic Claude](https://www.anthropic.com/claude)
- **GitLab MR API**: [GitLab Merge Requests API](https://docs.gitlab.com/ee/api/merge_requests.html)

---

## ❓ Frequently Asked Questions (FAQ)

### What is GitLab AI MR Reviewer?

GitLab AI MR Reviewer is an **automated code review tool** that uses AI (Claude Sonnet 4.5) to analyze code changes in GitLab merge requests. It automatically detects your tech stack, reviews code changes, and posts inline comments and summary reports directly to your MR.

### How does automated code review work?

The tool fetches your merge request diff from GitLab, uses Cursor Agent CLI with Claude Sonnet 4.5 to analyze the code changes, identifies issues, bugs, and improvements, then posts detailed feedback as inline comments on specific code lines and a general assessment summary.

### What programming languages are supported?

Currently supports:
- **TypeScript/Next.js** - React, Next.js applications
- **Java/Maven** - Java projects using Maven build system
- **Java/Gradle** - Java projects using Gradle build system
- **Kotlin** - Kotlin projects with Gradle

Want to add more? See our [Contributing Guide](#-contributing--adding-new-tech-stacks)!

### Do I need to configure anything?

No! The tool **automatically detects** your project's tech stack. Just add the Docker image to your GitLab CI pipeline and set the `CURSOR_API_KEY` environment variable. Everything else is automatic.

### Is my code secure?

Yes! The tool only sends **merge request diffs** (changed code) to the AI, not your entire codebase. Cursor/Claude don't store code after analysis. All communication uses HTTPS, and you can mask sensitive variables in GitLab CI/CD settings.

### How long does a code review take?

Typically **2-3 minutes** for medium-sized merge requests:
- Small MR (5-10 files): ~1-2 minutes
- Medium MR (10-20 files): ~2-3 minutes
- Large MR (20+ files): ~3-5 minutes

### Can I use this with GitHub or Bitbucket?

Currently, GitLab AI MR Reviewer is designed specifically for **GitLab**. For GitHub or Bitbucket support, please [submit a feature request](https://github.com/ixigo/gitlab-ai-mr-reviewer/issues).

### How do I get a Cursor API key?

1. Sign up at [cursor.com](https://cursor.com)
2. Go to [Settings → API Keys](https://cursor.com/settings)
3. Create a new API key
4. Add it to your GitLab CI/CD Variables

See our [detailed guide](#-how-to-get-cursor-api-key) above for step-by-step instructions.

### Does this work with GitLab self-hosted instances?

Yes! GitLab AI MR Reviewer works with both **GitLab.com** and **self-hosted GitLab instances**. Just ensure your GitLab runner can access the Docker registry and has network connectivity to Cursor API.

### Can I customize the review rules?

Yes! You can customize review rules by modifying the configuration files in the `config/` directory. Each tech stack has its own rules directory where you can add or modify review guidelines. See our [Configuration Guide](https://github.com/ixigo/gitlab-ai-mr-reviewer/blob/main/docs/04-setup-configuration.md) for details.

### What if my tech stack isn't supported?

If your tech stack isn't currently supported, the tool will gracefully skip the review with exit code 0 (won't fail your pipeline). You can [contribute support for your tech stack](#-contributing--adding-new-tech-stacks) or [request it as a feature](https://github.com/ixigo/gitlab-ai-mr-reviewer/issues).

---

**Made with ❤️ for better code quality**

*Automate your code reviews with AI-powered intelligence using Cursor Agent CLI and Claude Sonnet 4.5*

**Keywords**: automated code review, GitLab code review, AI code review, code review automation, GitLab CI/CD, Docker code review, merge request review, automated code analysis, code quality automation, GitLab merge request automation, AI-powered code review tool, code review bot, automated code inspection
