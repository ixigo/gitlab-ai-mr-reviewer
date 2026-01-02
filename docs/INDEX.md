# Review-Robo Documentation Index

Welcome to the **Review-Robo** documentation! This is an AI-powered automated code review system that integrates with GitLab merge requests using Claude Sonnet 4.5 via the Cursor Agent CLI.

> **Note**: This is the documentation index. For the main project README, see [`README.md`](../README.md) in the root directory.

---

## 📚 Documentation Index

### Getting Started
- **[Introduction](./01-introduction.md)** - What is Review-Robo and why use it?
- **[Setup & Configuration](./04-setup-configuration.md)** - Installation and environment setup

### Understanding the System
- **[Architecture](./02-architecture.md)** - System design and components
- **[Workflow](./03-workflow.md)** - How the code review process works (with diagrams)

### Integration & Usage
- **[GitLab CI Integration](./05-gitlab-ci-integration.md)** - CI/CD pipeline examples and best practices
- **[API Reference](./06-api-reference.md)** - Environment variables and configuration options

### Troubleshooting
- **[Troubleshooting Guide](./07-troubleshooting.md)** - Common issues and solutions

### Project Updates & Presentations
- **[Tech Townhall (Nov 2025)](./tech_townhall_nov_25.md)** - Evolution, current status, and future roadmap

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- GitLab instance with API access
- Cursor API key

### Local Development

```bash
# 1. Clone the repository
git clone <repository-url>
cd review-robo

# 2. Install dependencies
npm install

# 3. Configure environment
cp env.example .env
# Edit .env with your credentials

# 4. Run review (requires active MR context)
npm start
```

### Docker Usage

```bash
# Build the Docker image
docker build -f base.Dockerfile -t review-robo:latest .

# Run in GitLab CI
# See GitLab CI Integration guide for details
```

---

## 🎯 Key Features

- ✅ **AI-Powered Reviews**: Uses Claude Sonnet 4.5 for intelligent code analysis
- 🔍 **Inline Comments**: Posts specific issues directly on changed lines
- 📊 **Comprehensive Reports**: Detailed metrics, grading, and recommendations
- 🛠️ **Multi-Language Support**: TypeScript/Next.js and Java/Maven configurations
- 🔄 **GitLab Integration**: Native support for GitLab MR workflow
- 🎨 **Customizable Rules**: Configurable review focus areas and severity thresholds
- 📈 **Quality Metrics**: Tracks critical, moderate, and minor issues with thresholds

---

## 📖 Documentation Structure

```
docs/
├── INDEX.md                       # This file - documentation index
├── 01-introduction.md             # Project overview and use cases
├── 02-architecture.md             # System architecture and components
├── 03-workflow.md                 # Detailed workflow with diagrams
├── 04-setup-configuration.md      # Setup and configuration guide
├── 05-gitlab-ci-integration.md    # GitLab CI examples and patterns
├── 06-api-reference.md            # Environment variables and API
├── 07-troubleshooting.md          # Common issues and solutions
├── tech_townhall_nov_25.md        # Tech Townhall presentation (Nov 2025)
├── DIAGRAMS.md                    # Visual diagrams
└── DOCUMENTATION_SUMMARY.md       # Documentation overview
```

---

## 🏗️ Project Structure

```
review-robo/
├── README.md                      # Main project README
├── src/
│   ├── index.js                   # Main entry point
│   ├── api/                       # GitLab API interactions
│   │   └── gitlab.js
│   ├── review/                    # Core review logic
│   │   ├── cursor-agent.js        # Cursor CLI integration
│   │   ├── analyzer.js            # Review analysis
│   │   ├── grading.js             # Score calculation
│   │   ├── parser.js              # Output parsing
│   │   └── transformer.js         # Data transformation
│   ├── comments/                  # Comment posting logic
│   │   ├── inline.js              # Inline comments
│   │   └── general.js             # General MR comments
│   ├── services/                  # Supporting services
│   │   ├── config-setup.js        # Config management
│   │   ├── file-manager.js        # File operations
│   │   └── prerequisites.js       # Dependency checks
│   ├── utils/                     # Utility functions
│   │   ├── logger.js              # Logging
│   │   ├── stats.js               # Statistics tracking
│   │   └── exec.js                # Command execution
│   └── constants/                 # Configuration constants
│       ├── config.js
│       ├── severity.js
│       ├── thresholds.js
│       └── colors.js
├── config/                        # Tech-specific configurations
│   ├── next-ts/                   # TypeScript/Next.js config
│   │   ├── cli.json
│   │   └── rules/
│   ├── java-maven/                # Java/Maven config
│   │   └── cli.json
│   └── README.md
├── base.Dockerfile                # Docker image definition
├── package.json                   # Node.js dependencies
├── env.example                    # Environment template
└── docs/                          # Documentation (you are here!)
    ├── INDEX.md                   # This file
    ├── 01-introduction.md
    ├── 02-architecture.md
    ├── 03-workflow.md
    ├── 04-setup-configuration.md
    ├── 05-gitlab-ci-integration.md
    ├── 06-api-reference.md
    ├── 07-troubleshooting.md
    ├── tech_townhall_nov_25.md    # Tech Townhall presentation
    ├── DIAGRAMS.md
    └── DOCUMENTATION_SUMMARY.md
```

---

## 🤝 Contributing

Contributions are welcome! To add support for new languages or frameworks:

1. Create a new config directory: `config/<tech-name>/`
2. Add `cli.json` with appropriate settings
3. (Optional) Add custom rules in `rules/` folder
4. Update documentation
5. Test with a sample MR

---

## 📄 License

ISC License - See LICENSE file for details

---

## 🆘 Need Help?

- Check the [Troubleshooting Guide](./07-troubleshooting.md)
- Review [API Reference](./06-api-reference.md) for configuration options
- See [Workflow](./03-workflow.md) for process details

---

## 📝 Version Information

- **Current Version**: 1.0.0
- **Node.js Requirement**: 18.0.0+
- **AI Model**: Claude Sonnet 4.5
- **Cursor Agent**: Latest version via curl install

---

**Next Steps**: Start with the [Introduction](./01-introduction.md) to learn more about Review-Robo's capabilities and use cases.

