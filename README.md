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

## 📋 Quick Start

### Prerequisites

- Node.js 18+
- GitLab instance with API access
- Cursor API key ([Get one here](https://cursor.com/settings))

### Installation

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
# Edit .env with your credentials

# Run review (requires active MR context)
npm start
```

### GitLab CI Integration

```yaml
# .gitlab-ci.yml
stages:
  - review

code_review:
  stage: review
  image: registry.example.com/review-robo:latest
  # Tech stack is auto-detected - no configuration needed!
  script:
    - node /app/src/index.js
  artifacts:
    paths:
      - .cursor/reviews/
    expire_in: 7 days
  only:
    - merge_requests
```

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

### Project Updates
- **[📢 Tech Townhall (Nov 2025)](./docs/tech_townhall_nov_25.md)** - Evolution, current status, and roadmap

**Start here**: [Documentation Index](./docs/INDEX.md)

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

## 🛠️ Supported Technologies

Review-Robo **automatically detects** your project's tech stack - no configuration needed!

### TypeScript/Next.js (`next-ts`)

**Auto-Detected When**:
- `package.json` contains `next` and `react` dependencies

**Focus Areas**:
- TypeScript type safety
- React hooks validation
- Next.js patterns (Server/Client components)
- Performance optimization
- Accessibility (WCAG)

**Common Issues Detected**:
- `any` type usage
- Missing hook dependencies
- Improper component usage
- Performance anti-patterns

### Java/Maven (`java-maven`)

**Auto-Detected When**:
- `pom.xml` exists in project root
- Java source files (`.java`) are present

**Focus Areas**:
- Java best practices (Java 17+)
- SOLID principles
- Thread safety
- Spring framework validation
- Maven dependency management

**Common Issues Detected**:
- Thread safety violations
- Null pointer risks
- Stream API misuse
- Spring bean lifecycle issues

### Unsupported Projects

If your project doesn't match any supported tech stack, Review-Robo will:
- Log a clear message explaining the supported stacks
- Skip the review gracefully with exit code 0
- Not fail your CI pipeline

### Custom Tech Stacks

Want to add support for new languages? You can extend the detection logic in `src/services/tech-stack-detector.js`. See [Configuration Guide](./docs/04-setup-configuration.md#creating-custom-configurations).

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

## 🚀 Deployment

### Docker Deployment

```bash
# Build image
docker build -f base.Dockerfile -t review-robo:latest .

# Push to registry
docker tag review-robo:latest registry.example.com/review-robo:latest
docker push registry.example.com/review-robo:latest

# Use in GitLab CI
# .gitlab-ci.yml
code_review:
  image: registry.example.com/review-robo:latest
  script:
    - node /app/src/index.js
```

### GitLab CI Setup

1. **Add CI/CD Variables**:
   - `CURSOR_API_KEY` (masked)
   - `GITLAB_TOKEN` (masked) - optional, can use CI_JOB_TOKEN

2. **Add Job to Pipeline**:
   ```yaml
   # .gitlab-ci.yml
   stages:
     - review

   code_review:
     stage: review
     image: registry.example.com/review-robo:latest
     # Tech stack is auto-detected, no configuration needed!
     script:
       - node /app/src/index.js
     only:
       - merge_requests
   ```

3. **Test with Sample MR**

**See**: [Complete CI Integration Guide](./docs/05-gitlab-ci-integration.md)

---

## 🔧 Configuration

### Environment Variables

```bash
# Required
CI_PROJECT_ID=12345
CI_MERGE_REQUEST_IID=42
CURSOR_API_KEY=cur-xxxxx
GITLAB_TOKEN=glpat-xxxxx  # or use CI_JOB_TOKEN

# Optional
OUTPUT_DIR=.cursor/reviews
```

**Note**: Tech stack is **automatically detected**! No configuration needed.
- `next-ts`: Auto-detected if `package.json` has `next` and `react`
- `java-maven`: Auto-detected if `pom.xml` exists with Java files

### Custom Configuration

To add support for a new tech stack, extend the detection logic:

```bash
# Edit the tech stack detector
nano src/services/tech-stack-detector.js

# Add your detection logic
# Create matching config directory
mkdir -p config/my-tech-stack/rules/
```

**See**: [Configuration Reference](./docs/06-api-reference.md)

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

## 🤝 Contributing

Contributions welcome! Areas for improvement:

1. **New Language Support**: Add configurations for Python, Go, Rust, etc.
2. **Enhanced Rules**: Improve review guidelines
3. **Better Parsing**: Handle edge cases in AI output
4. **Performance**: Optimize for very large diffs
5. **Integrations**: Support GitHub, Bitbucket

**To Contribute**:
1. Fork the repository
2. Create feature branch
3. Add documentation
4. Test with sample MRs
5. Submit pull request

---

## 📄 License

ISC License - See LICENSE file for details

---

## 🆘 Support

### Documentation
- [Complete Documentation Index](./docs/INDEX.md)
- [Troubleshooting Guide](./docs/07-troubleshooting.md)
- [API Reference](./docs/06-api-reference.md)

### Getting Help
1. Check [Troubleshooting Guide](./docs/07-troubleshooting.md)
2. Search existing issues
3. Ask in team chat
4. File new issue with debug info

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

