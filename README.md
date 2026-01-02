# Review-Robo 🤖

**AI-Powered Automated Code Review System for GitLab Merge Requests**

Review-Robo is an intelligent code review automation tool that leverages Claude Sonnet 4.5 through Cursor Agent CLI to provide comprehensive, context-aware code reviews for your GitLab merge requests.

---

## 🌟 Features

- ✅ **AI-Powered Analysis**: Uses Claude Sonnet 4.5 for intelligent code understanding
- 🔍 **Inline Comments**: Posts specific issues directly on problematic lines
- 📊 **Comprehensive Reports**: Detailed metrics, grading, and actionable recommendations
- 🛠️ **Multi-Language Support**: TypeScript/Next.js and Java/Maven configurations out-of-the-box
- 🤖 **Auto-Detection**: Automatically identifies project tech stack - no configuration needed!
- 🔄 **GitLab Native**: Seamless integration with GitLab MR workflow
- ⚡ **Incremental Reviews**: Smart mode reviews full MR on creation, only new changes on subsequent pushes
- 🎨 **Customizable Rules**: Configurable review focus areas and severity thresholds
- 📈 **Quality Metrics**: Tracks critical, moderate, and minor issues with thresholds
- 🚀 **Fast**: Typically completes in 2-3 minutes
- 🐳 **Containerized**: Docker-ready for easy deployment

---

## 🚀 GitLab Integration Setup

### Quick Setup

Review-Robo integrates seamlessly with GitLab CI/CD pipelines. Follow these steps to get started:

#### 1. Add CI/CD Variables

In your GitLab project, go to **Settings → CI/CD → Variables** and add:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `CURSOR_API_KEY` | ✅ Yes | Cursor API key for AI access | `cur-xxxxxxxxxxxxx` |
| `GITLAB_TOKEN` | ✅ Yes | GitLab personal/project token with API access | `glpat-xxxxxxxxxxxxx` |

**Note**: 
- `CURSOR_API_KEY` must be **manually added** in CI/CD Variables
- `GITLAB_TOKEN` is **optional** in GitLab CI because `CI_JOB_TOKEN` is automatically provided and can be used instead
- If you choose to use `GITLAB_TOKEN`, it must be **manually added** with scopes: `api`, `read_repository`, `write_repository`
- For local testing, `GITLAB_TOKEN` is **required** and must have API access

**Security**: ⚠️ Always **mask** these variables in GitLab CI/CD settings to prevent exposure in logs.

#### 2. Add Review Job to Pipeline

Add this to your `.gitlab-ci.yml`:

```yaml
stages:
  - review

code_review:
  stage: review
  image: registry.example.com/review-robo:latest
  script:
    - node /app/src/index.js
  artifacts:
    paths:
      - .cursor/reviews/
    expire_in: 7 days
  allow_failure: true  # Don't block pipeline on review failure
  only:
    - merge_requests
```

**That's it!** Review-Robo will automatically:
- Detect your project's tech stack
- Fetch MR changes
- Run AI-powered code review
- Post comments to your MR

### Complete Configuration

#### Environment Variables for GitLab CI

##### Required Variables

| Variable | Description | How to Set |
|----------|-------------|------------|
| `CI_PROJECT_ID` | GitLab project ID | ✅ Automatically set by GitLab CI |
| `CI_MERGE_REQUEST_IID` | MR internal ID (e.g., `!42`) | ✅ Automatically set by GitLab CI |
| `CI_SERVER_URL` | GitLab instance URL | ✅ Automatically set by GitLab CI |
| `CURSOR_API_KEY` | Cursor API key | ⚠️ **Manual**: Add in CI/CD Variables |
| `GITLAB_TOKEN` | GitLab auth token with API access | ⚠️ **Manual**: Add `GITLAB_TOKEN` in CI/CD Variables |

**Important**: 
- `GITLAB_TOKEN` must be **manually added** in GitLab CI/CD Variables with **API access** scopes: `api`, `read_repository`, `write_repository`
- Alternatively, `CI_JOB_TOKEN` is automatically provided by GitLab CI and has necessary permissions (no setup needed)
- If using `GITLAB_TOKEN`, it must have access to read repository and post comments on merge requests

##### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REVIEW_CONFIG_TYPE` | `next-ts` | Tech stack config (`next-ts`, `java-maven`, `java-gradle`, `kotlin`) |
| `OUTPUT_DIR` | `.cursor/reviews` | Directory for review artifacts |

#### Advanced GitLab CI Configuration

```yaml
stages:
  - review
  - test
  - build

automated_code_review:
  stage: review
  image: registry.example.com/review-robo:latest
  variables:
    REVIEW_CONFIG_TYPE: "next-ts"  # Optional: override auto-detection
    OUTPUT_DIR: ".cursor/reviews"   # Optional: custom output directory
  before_script:
    - echo "Starting code review for MR !$CI_MERGE_REQUEST_IID"
  script:
    - node /app/src/index.js
  after_script:
    - echo "Review artifacts saved to $OUTPUT_DIR"
  artifacts:
    paths:
      - .cursor/reviews/
    expire_in: 7 days
    when: always
  allow_failure: true  # Don't block pipeline
  only:
    - merge_requests
  except:
    - schedules
    - tags
```

#### Docker Image Setup

If you need to build and push your own Docker image:

```bash
# Build the image
docker build -f base.Dockerfile -t review-robo:latest .

# Tag for your registry
docker tag review-robo:latest registry.example.com/review-robo:latest

# Push to registry
docker push registry.example.com/review-robo:latest
```

### Supported Tech Stacks

Review-Robo **automatically detects** your project's tech stack:

| Tech Stack | Auto-Detection | Config Name |
|------------|----------------|-------------|
| **TypeScript/Next.js** | `package.json` has `next` + `react` | `next-ts` |
| **Java/Maven** | `pom.xml` exists | `java-maven` |
| **Java/Gradle** | `build.gradle` exists | `java-gradle` |
| **Kotlin** | `.kt` files + `build.gradle.kts` | `kotlin` |

**No configuration needed!** The system automatically selects the appropriate review rules.

#### Environment Variables for Local Testing

For local development and testing, you need to set all variables manually:

| Variable | Description | Required |
|----------|-------------|----------|
| `CI_PROJECT_ID` | GitLab project ID | ✅ Yes |
| `CI_MERGE_REQUEST_IID` | MR internal ID (e.g., `!42`) | ✅ Yes |
| `CI_SERVER_URL` | GitLab instance URL | ✅ Yes |
| `CURSOR_API_KEY` | Cursor API key | ✅ Yes |
| `GITLAB_TOKEN` | GitLab personal/project token with API access | ✅ Yes |

**Setup for Local Testing**:

```bash
# Clone repository
git clone <repository-url>
cd review-robo

# Install dependencies
npm install

# Install Cursor CLI
curl https://cursor.com/install -fsS | bash

# Configure environment
cp env.example .env
# Edit .env with your credentials:
# CI_PROJECT_ID=12345
# CI_MERGE_REQUEST_IID=42
# CI_SERVER_URL=https://gitlab.com
# CURSOR_API_KEY=cur-xxxxx
# GITLAB_TOKEN=glpat-xxxxx  # Required: Must have API access (api, read_repository, write_repository scopes)

# Run review
npm start
```

**See**: [Complete GitLab CI Integration Guide](./docs/05-gitlab-ci-integration.md) for more examples and patterns.

**See**: [API Reference](./docs/06-api-reference.md) for complete environment variable documentation.

---

## 🎯 How It Works

```
┌─────────────────┐
│  Developer      │
│  Creates MR     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  GitLab CI Pipeline Triggered   │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  1. Fetch MR diff from GitLab   │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  2. Run Cursor Agent (Claude)   │
│     - Analyze code changes      │
│     - Apply tech-specific rules │
│     - Generate review report    │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  3. Parse & Process Results     │
│     - Extract issues            │
│     - Calculate grade           │
│     - Validate line numbers     │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  4. Post to GitLab MR           │
│     - Inline comments on code   │
│     - General assessment        │
│     - Metrics & recommendations │
└─────────────────────────────────┘
```

**See**: [Detailed Workflow](./docs/03-workflow.md) for complete process breakdown.

---

## 🤝 How to Contribute

We welcome contributions! Review-Robo is open to improvements in:

- **New Language Support**: Add configurations for Python, Go, Rust, etc.
- **Enhanced Rules**: Improve review guidelines and patterns
- **Better Parsing**: Handle edge cases in AI output
- **Performance**: Optimize for very large diffs
- **Integrations**: Support GitHub, Bitbucket, etc.

### Quick Contribution Guide

1. **Fork the repository**
2. **Create a feature branch** (never commit to `main`, `prod`, `master`, or `production`)
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **Make your changes** following our [TypeScript guidelines](./.cursor/rules/typescript-rules.mdc)
4. **Add documentation** if needed
5. **Test with sample MRs**
6. **Commit using conventional format**:
   ```bash
   git commit -m "feat: add your feature description"
   ```
7. **Submit a pull request**

### Detailed Contribution Guidelines

For complete contribution guidelines, including:
- Development setup
- Commit message format (Conventional Commits)
- Pull request process
- Code style and standards
- Testing requirements

**See**: [CONTRIBUTING.md](./CONTRIBUTING.md) for full details.

---

## 📖 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) directory:

### Getting Started
- **[📘 Introduction](./docs/01-introduction.md)** - What is Review-Robo and why use it?
- **[⚙️ Setup & Configuration](./docs/04-setup-configuration.md)** - Installation and environment setup

### Understanding the System
- **[🏗️ Architecture](./docs/02-architecture.md)** - System design and components
- **[🔄 Workflow](./docs/03-workflow.md)** - Step-by-step process with diagrams

### Integration & Usage
- **[🚀 GitLab CI Integration](./docs/05-gitlab-ci-integration.md)** - Pipeline examples and patterns
- **[📚 API Reference](./docs/06-api-reference.md)** - Environment variables and configuration

### Support
- **[🔧 Troubleshooting](./docs/07-troubleshooting.md)** - Common issues and solutions

**Start here**: [Documentation Index](./docs/INDEX.md)

---

## 🔍 Example Output

### Inline Comment

```
📁 src/pages/BookingConfirmation.tsx
   Line 12: bookingDetails: any;

💬 Review-Robo commented:

🔴 CRITICAL: Use of 'any' type violates type safety

Issue: The bookingDetails parameter uses 'any' type, bypassing TypeScript's 
type checking. This can lead to runtime errors and makes refactoring dangerous.

Recommendation: Define a proper interface for booking details

Code Example:
interface BookingConfirmationProps {
  bookingId: string;
  bookingDetails: IBookingDetails;
}

Effort: 10 min | Impact: High | Priority: High
```

### General Assessment

```markdown
# 🤖 AI Code Review Report

## 📊 Overall Assessment

**Grade**: B+ (85/100)  
**Verdict**: ✅ Approve with Minor Changes

## 📈 Metrics

| Category | Count | Threshold | Status |
|----------|-------|-----------|--------|
| 🔴 Critical Issues | 2 | ≤ 5 | ✅ Pass |
| 🟠 Moderate Issues | 4 | ≤ 10 | ✅ Pass |
| 🟡 Minor Issues | 8 | ≤ 15 | ✅ Pass |

## 💡 Key Recommendations
1. Replace 'any' types with proper interfaces (30 min)
2. Use structured logging instead of console.log (20 min)
3. Add error boundaries to components (15 min)
```

---

## 📊 Grading System

| Grade | Score | Description |
|-------|-------|-------------|
| A+ | 95-100 | Excellent - production ready |
| A | 90-94 | Very Good - minor polishing |
| B+ | 85-89 | Good - improvements recommended |
| B | 80-84 | Acceptable - changes suggested |
| C | 70-79 | Below Standard - changes required |
| F | <70 | Needs Major Work - review required |

**Scoring**:
- Critical issues: -10 points each
- Moderate issues: -3 points each
- Minor issues: -1 point each

---

## 🛠️ Supported Technologies

Review-Robo **automatically detects** your project's tech stack - no configuration needed!

| Tech Stack | Auto-Detection | Focus Areas |
|------------|----------------|-------------|
| **TypeScript/Next.js** | `package.json` has `next` + `react` | Type safety, React hooks, Next.js patterns, Performance, Accessibility |
| **Java/Maven** | `pom.xml` exists | Java best practices, SOLID principles, Thread safety, Spring validation |
| **Java/Gradle** | `build.gradle` exists | Same as Java/Maven with Gradle-specific patterns |
| **Kotlin** | `.kt` files + `build.gradle.kts` | Kotlin idioms, Null safety, Coroutines, DSL patterns |

### Unsupported Projects

If your project doesn't match any supported tech stack, Review-Robo will:
- Log a clear message explaining the supported stacks
- Skip the review gracefully with exit code 0
- Not fail your CI pipeline

### Custom Tech Stacks

Want to add support for new languages? You can extend the detection logic in `src/services/tech-stack-detector.ts`. See [Configuration Guide](./docs/04-setup-configuration.md#creating-custom-configurations).

---

## 📁 Project Structure

```
review-robo/
├── src/
│   ├── index.js                 # Main entry point
│   ├── api/                     # GitLab API client
│   ├── review/                  # Core review logic
│   │   ├── cursor-agent.js      # Cursor CLI integration
│   │   ├── analyzer.js          # Review analysis
│   │   ├── grading.js           # Score calculation
│   │   └── parser.js            # Output parsing
│   ├── comments/                # Comment posting
│   ├── services/                # Supporting services
│   ├── utils/                   # Utilities
│   └── constants/               # Configuration
├── config/                      # Tech-specific configs
│   ├── next-ts/                 # TypeScript/Next.js
│   └── java-maven/              # Java/Maven
├── docs/                        # Documentation
├── base.Dockerfile              # Docker image
└── package.json
```

---

## 🔒 Security

- **Diff-Only Analysis**: Only MR changes sent to AI, not entire codebase
- **No Data Retention**: Cursor/Claude don't store code after analysis
- **Secure Communication**: All API calls use HTTPS
- **Token Security**: GitLab tokens use minimal required permissions
- **Masked Variables**: Sensitive data masked in CI logs

**Best Practices**:
- ✅ Use read-only tokens when possible
- ✅ Rotate API keys regularly
- ✅ Use CI_JOB_TOKEN in pipelines
- ✅ Mask all secrets in CI/CD settings

---

## 📈 Performance

**Typical Review Times**:
- Small MR (5-10 files): ~1-2 minutes
- Medium MR (10-20 files): ~2-3 minutes
- Large MR (20+ files): ~3-5 minutes

**Resource Usage**:
- Memory: ~200MB
- CPU: Minimal (mostly waiting for AI)
- Network: ~1-2 MB per review

**Optimization Tips**:
- Use file filters in GitLab CI
- Exclude test files if not needed
- Break large MRs into smaller ones
- Cache Docker layers

---

## 📄 License

ISC License - See LICENSE file for details

---

## 🆘 Support

### Getting Help
1. Check [Troubleshooting Guide](./docs/07-troubleshooting.md)
2. Review [Documentation Index](./docs/INDEX.md)
3. Search existing issues
4. Ask in team chat
5. File new issue with debug info

---

## 🎓 Learn More

- [Cursor Documentation](https://cursor.com/docs)
- [Claude Sonnet 4.5 Details](https://www.anthropic.com/claude)
- [GitLab MR API](https://docs.gitlab.com/ee/api/merge_requests.html)

---

## 🌟 Acknowledgments

- **Claude Sonnet 4.5**: AI model by Anthropic
- **Cursor**: CLI interface for Claude API
- **GitLab**: MR platform and CI/CD

---

## 📊 Status

- **Version**: 1.0.0
- **Status**: Production Ready
- **Node.js**: 18.0.0+
- **AI Model**: Claude Sonnet 4.5

---

**Ready to get started?** Head to the [Setup Guide](./docs/04-setup-configuration.md) or check out [GitLab CI Integration](./docs/05-gitlab-ci-integration.md) examples.

---

<div align="center">

**Made with ❤️ for better code quality**

[Documentation](./docs/INDEX.md) • [Setup](./docs/04-setup-configuration.md) • [Examples](./docs/05-gitlab-ci-integration.md) • [Troubleshooting](./docs/07-troubleshooting.md)

</div>

