# Review-Robo 🤖

**AI-Powered Automated Code Review System for GitLab Merge Requests**

Review-Robo is an intelligent code review automation tool that leverages **Claude Sonnet 4.5** through **Cursor Agent CLI** to provide comprehensive, context-aware code reviews for your GitLab merge requests.

---

## 🚀 Quick Start

### Pull the Image

```bash
docker pull your-registry/review-robo:latest
```

### Basic Usage in GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - review

code_review:
  stage: review
  image: your-registry/review-robo:latest
  script:
    - node /app/dist/index.js
  artifacts:
    paths:
      - .cursor/reviews/
    expire_in: 7 days
  only:
    - merge_requests
```

**That's it!** Review-Robo automatically:
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

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `CURSOR_API_KEY` | Cursor API key for AI access | `cur-xxxxxxxxxxxxx` |
| `CI_PROJECT_ID` | GitLab project ID | `12345` |
| `CI_MERGE_REQUEST_IID` | Merge request internal ID | `42` |
| `GITLAB_TOKEN` | GitLab API token (or use `CI_JOB_TOKEN`) | `glpat-xxxxx` |

**Note**: In GitLab CI, `CI_JOB_TOKEN` is automatically provided - no manual token needed!

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OUTPUT_DIR` | Output directory for review artifacts | `.cursor/reviews` |
| `CI_SERVER_URL` | GitLab server URL | `https://gitlab.com` |

---

## 🎯 Supported Technologies

Review-Robo **automatically detects** your project's tech stack:

- **TypeScript/Next.js** (`next-ts`) - Auto-detected when `package.json` has `next` and `react`
- **Java/Maven** (`java-maven`) - Auto-detected when `pom.xml` exists
- **Java/Gradle** (`java-gradle`) - Auto-detected when `build.gradle` exists
- **Kotlin** (`kotlin`) - Auto-detected when `build.gradle.kts` exists

No manual configuration needed!

---

## 📖 Usage Examples

### Example 1: Basic GitLab CI Integration

```yaml
code_review:
  stage: review
  image: your-registry/review-robo:latest
  script:
    - node /app/dist/index.js
  only:
    - merge_requests
```

### Example 2: With Artifacts and Timeout

```yaml
code_review:
  stage: review
  image: your-registry/review-robo:latest
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
  image: your-registry/review-robo:latest
  script:
    - node /app/dist/index.js
  only:
    changes:
      - "frontend/**/*.{ts,tsx}"

# Review backend
review_backend:
  stage: review
  image: your-registry/review-robo:latest
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
  your-registry/review-robo:latest \
  node /app/dist/index.js
```

---

## 🏗️ Image Details

### Base Image
- **Node.js**: 20.11.1
- **OS**: Debian-based (from official Node image)

### Included Components
- ✅ Node.js runtime (v20.11.1)
- ✅ Cursor CLI (pre-installed)
- ✅ Review-Robo application (compiled TypeScript)
- ✅ Multi-tech-stack configurations

### Image Size
- **Approximate**: ~500MB (includes Node.js, Cursor CLI, and application)

### Working Directory
- `/app` - Application root directory

### Entry Point
- `node /app/dist/index.js` - Main application entry point

---

## 📊 What Review-Robo Does

1. **Fetches MR Diff** - Retrieves all changes from GitLab API
2. **Detects Tech Stack** - Automatically identifies project technology
3. **AI Analysis** - Uses Claude Sonnet 4.5 to analyze code changes
4. **Posts Comments** - Creates inline comments on specific lines
5. **Summary Report** - Posts overall assessment with metrics and grading

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
- ✅ Mask `CURSOR_API_KEY` in CI/CD variables
- ✅ Use read-only tokens when possible
- ✅ Rotate API keys regularly

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
The image includes Cursor CLI pre-installed. If you see this error, ensure you're using the correct image.

### Issue: "Missing required environment variable"
Ensure all required variables are set:
- `CURSOR_API_KEY`
- `CI_PROJECT_ID`
- `CI_MERGE_REQUEST_IID`
- `GITLAB_TOKEN` or `CI_JOB_TOKEN`

### Issue: "Failed to fetch MR data"
- Verify `GITLAB_TOKEN` has `api` scope
- Check `CI_PROJECT_ID` and `CI_MERGE_REQUEST_IID` are correct
- Ensure GitLab server URL is accessible

### Issue: "Cursor API error"
- Verify `CURSOR_API_KEY` is valid
- Check API rate limits
- Ensure network connectivity to Cursor API

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

Contributions welcome! See the [Contributing Guide](https://github.com/ixigo/gitlab-ai-mr-reviewer/blob/main/CONTRIBUTING.md) for:
- Development setup
- Commit guidelines (Conventional Commits)
- Pull request process

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

- [Cursor Documentation](https://cursor.com/docs)
- [Claude Sonnet 4.5](https://www.anthropic.com/claude)
- [GitLab MR API](https://docs.gitlab.com/ee/api/merge_requests.html)

---

**Made with ❤️ for better code quality**

*Automate your code reviews with AI-powered intelligence*

