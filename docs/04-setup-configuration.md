# Setup & Configuration

This guide covers installation, configuration, and deployment of Review-Robo.

---

## Prerequisites

### System Requirements

- **Node.js**: 18.0.0 or higher
- **Operating System**: Linux, macOS, or Windows (with WSL)
- **Memory**: Minimum 512MB RAM
- **Disk Space**: ~200MB (including dependencies)

### Required Access

- **GitLab Instance**: API access with token
- **Cursor API**: Valid API key
- **Git Repository**: Clone access to your project

---

## Installation

### Option 1: Local Development Setup

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd review-robo
```

#### 2. Install Dependencies

```bash
npm install
```

This installs:
- `dotenv` (for environment variable management)
- No other runtime dependencies (minimal footprint)

#### 3. Install Cursor CLI

```bash
# Install Cursor CLI globally
curl https://cursor.com/install -fsS | bash

# Verify installation
cursor-agent --version
```

The Cursor CLI will be installed to `~/.local/bin/cursor-agent`.

#### 4. Configure Environment Variables

```bash
# Copy the example environment file
cp env.example .env

# Edit .env with your values
nano .env
```

See [Environment Variables](#environment-variables) section below for details.

#### 5. Verify Setup

```bash
# Run prerequisites check
node src/index.js

# Should output environment validation (will fail if no MR context)
```

---

### Option 2: Docker Setup

#### 1. Build Docker Image

```bash
# Using the provided Dockerfile
docker build -f base.Dockerfile -t review-robo:latest .
```

**Dockerfile Overview**:
```dockerfile
FROM node:20.11.1 AS base

# Install Cursor CLI
RUN curl https://cursor.com/install -fsS | bash
ENV PATH="/root/.local/bin:$PATH"

# Copy application
COPY src /app/src
COPY config /app/config
COPY package*.json /app/

WORKDIR /app
RUN npm install
```

#### 2. Test Docker Image

```bash
docker run --rm \
  -e CURSOR_API_KEY=your-key \
  -e GITLAB_TOKEN=your-token \
  -e CI_PROJECT_ID=12345 \
  -e CI_MERGE_REQUEST_IID=42 \
  review-robo:latest \
  node src/index.js
```

#### 3. Push to Registry (for CI/CD)

```bash
# Tag for your registry
docker tag review-robo:latest registry.example.com/review-robo:latest

# Push to registry
docker push registry.example.com/review-robo:latest
```

---

## Environment Variables

### Required Variables

#### GitLab Configuration

```bash
# GitLab server URL
CI_SERVER_URL=https://gitlab.com

# Project identifier (URL-encoded project path or numeric ID)
CI_PROJECT_ID=12345
PROJECT_ID=12345

# Merge request IID (not the global ID!)
CI_MERGE_REQUEST_IID=42

# Authentication (use one or both)
GITLAB_TOKEN=glpat-xxxxxxxxxxxxx      # Personal/project access token
CI_JOB_TOKEN=xxxxxxxxxxxxx           # Automatic in GitLab CI
```

**Note**: `CI_JOB_TOKEN` is automatically provided by GitLab CI/CD and is the preferred method for automation.

#### Cursor API Configuration

```bash
# Cursor API key (get from https://cursor.com/settings)
CURSOR_API_KEY=cur-xxxxxxxxxxxxx
```

### Optional Variables

#### Review Configuration

```bash
# Tech stack configuration (default: next-ts)
REVIEW_CONFIG_TYPE=next-ts

# Options:
# - next-ts: TypeScript/Next.js/React
# - java-maven: Java with Maven
# - <custom>: Path to your custom config directory
```

#### Output Configuration

```bash
# Output directory for review artifacts (default: .cursor/reviews)
OUTPUT_DIR=.cursor/reviews
```

---

## Configuration Types

Review-Robo supports multiple technology stacks through configuration files.

### Built-in Configurations

#### 1. TypeScript/Next.js (`next-ts`)

**Location**: `config/next-ts/`

**Focus Areas**:
- TypeScript type safety
- React hooks validation
- Next.js server/client components
- Performance optimization
- Accessibility (WCAG)

**Configuration** (`config/next-ts/cli.json`):
```json
{
  "version": "1.0",
  "settings": {
    "review": {
      "focus_areas": [
        "type_safety",
        "react_hooks",
        "next_js_patterns",
        "performance",
        "accessibility",
        "error_handling",
        "best_practices"
      ],
      "severity_levels": ["critical", "moderate", "minor"],
      "thresholds": {
        "critical": 5,
        "moderate": 10,
        "minor": 15
      }
    },
    "ai": {
      "model": "claude-sonnet-4.5",
      "temperature": 0.2,
      "max_tokens": 8000
    },
    "typescript": {
      "strict_mode": true,
      "no_any": true,
      "no_explicit_any": true
    },
    "react": {
      "check_hooks_deps": true,
      "check_prop_types": true,
      "prefer_functional": true
    },
    "nextjs": {
      "check_server_client": true,
      "check_image_optimization": true,
      "check_dynamic_imports": true
    }
  }
}
```

**Custom Rules** (`config/next-ts/rules/`):
- `design-principles.mdc`: Design patterns and principles
- `typescript-rules.mdc`: TypeScript-specific guidelines
- `review-rules.mdc`: General review guidelines

#### 2. Java/Maven (`java-maven`)

**Location**: `config/java-maven/`

**Focus Areas**:
- Java best practices (Java 17+)
- SOLID principles
- Concurrency & thread safety
- Spring framework validation
- Maven dependency management
- JUnit/Mockito testing patterns

**Configuration** (`config/java-maven/cli.json`):
```json
{
  "version": "1.0",
  "settings": {
    "review": {
      "focus_areas": [
        "solid_principles",
        "thread_safety",
        "null_safety",
        "resource_management",
        "error_handling",
        "testing",
        "best_practices"
      ],
      "severity_levels": ["critical", "moderate", "minor"],
      "thresholds": {
        "critical": 5,
        "moderate": 10,
        "minor": 15
      }
    },
    "ai": {
      "model": "claude-sonnet-4.5",
      "temperature": 0.2,
      "max_tokens": 8000
    },
    "java": {
      "version": "17",
      "strict_null_checks": true,
      "check_thread_safety": true
    },
    "spring": {
      "check_bean_lifecycle": true,
      "check_transaction_boundaries": true
    },
    "maven": {
      "check_dependencies": true,
      "check_security_vulnerabilities": true
    }
  }
}
```

---

### Creating Custom Configurations

To add support for a new language or framework:

#### 1. Create Configuration Directory

```bash
mkdir -p config/my-tech-stack
```

#### 2. Create `cli.json`

```bash
cat > config/my-tech-stack/cli.json << 'EOF'
{
  "version": "1.0",
  "settings": {
    "review": {
      "focus_areas": [
        "code_quality",
        "best_practices",
        "error_handling",
        "testing"
      ],
      "severity_levels": ["critical", "moderate", "minor"],
      "thresholds": {
        "critical": 5,
        "moderate": 10,
        "minor": 15
      }
    },
    "ai": {
      "model": "claude-sonnet-4.5",
      "temperature": 0.2,
      "max_tokens": 8000
    }
  }
}
EOF
```

#### 3. (Optional) Add Custom Rules

```bash
mkdir -p config/my-tech-stack/rules

cat > config/my-tech-stack/rules/custom-guidelines.mdc << 'EOF'
# My Tech Stack Review Guidelines

## Best Practices

1. Always use proper error handling
2. Follow the framework conventions
3. Write comprehensive tests

## Common Issues

- Issue 1: Description and how to fix
- Issue 2: Description and how to fix

## Severity Guidelines

- **Critical**: Security vulnerabilities, major bugs
- **Moderate**: Performance issues, best practice violations
- **Minor**: Code style, minor improvements
EOF
```

#### 4. Use Custom Configuration

```bash
export REVIEW_CONFIG_TYPE=my-tech-stack
node src/index.js
```

---

## GitLab Token Setup

### Creating a GitLab Personal Access Token

1. Navigate to GitLab
2. Go to **Profile** → **Access Tokens**
3. Create token with these scopes:
   - `api` (required for MR access and commenting)
   - `read_repository` (for reading code)
   - `write_repository` (for posting comments)
4. Copy the token (starts with `glpat-`)
5. Set as `GITLAB_TOKEN` environment variable

### Using Project Access Token (Recommended for CI)

1. Go to your project → **Settings** → **Access Tokens**
2. Create token with:
   - **Role**: Developer or higher
   - **Scopes**: `api`, `read_repository`, `write_repository`
3. Set as `GITLAB_TOKEN` in CI/CD variables

### Using CI Job Token (Automatic in GitLab CI)

GitLab CI automatically provides `CI_JOB_TOKEN`. No setup needed, but ensure:

```yaml
# .gitlab-ci.yml
variables:
  GIT_STRATEGY: clone # Required for MR context
```

---

## Cursor API Key Setup

### Getting a Cursor API Key

1. Go to [Cursor Settings](https://cursor.com/settings)
2. Navigate to **API Keys**
3. Generate new API key
4. Copy the key (starts with `cur-`)
5. Set as `CURSOR_API_KEY` environment variable

### Setting in GitLab CI/CD

1. Go to project → **Settings** → **CI/CD** → **Variables**
2. Add variable:
   - **Key**: `CURSOR_API_KEY`
   - **Value**: `cur-xxxxxxxxxxxxx`
   - **Type**: Variable
   - **Protected**: Yes (recommended)
   - **Masked**: Yes (required for security)

---

## Testing Your Setup

### Local Testing

```bash
# 1. Set environment variables
export CI_PROJECT_ID=12345
export CI_MERGE_REQUEST_IID=42
export GITLAB_TOKEN=glpat-xxxxx
export CURSOR_API_KEY=cur-xxxxx
export REVIEW_CONFIG_TYPE=next-ts

# 2. Run review
npm start

# OR
node src/index.js
```

**Expected Output**:
```
✓ Prerequisites check passed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[STEP 1/3] Fetching MR data and performing AI code review
✓ MR Title: feat: Add booking confirmation
✓ Author: John Doe
✓ Base SHA: abc123...
✓ Head SHA: ghi789...
✓ Found 12 TypeScript/TSX files changed

Running cursor-agent CLI for MR diff review...
...
✓ REVIEW COMPLETE
```

### Docker Testing

```bash
# Build image
docker build -f base.Dockerfile -t review-robo:test .

# Run review
docker run --rm \
  -e CURSOR_API_KEY=$CURSOR_API_KEY \
  -e GITLAB_TOKEN=$GITLAB_TOKEN \
  -e CI_PROJECT_ID=12345 \
  -e CI_MERGE_REQUEST_IID=42 \
  -e REVIEW_CONFIG_TYPE=next-ts \
  review-robo:test \
  node src/index.js
```

---

## Troubleshooting Setup

### Issue: "cursor-agent not found"

**Solution**:
```bash
# Ensure Cursor CLI is installed
curl https://cursor.com/install -fsS | bash

# Add to PATH
export PATH="$HOME/.local/bin:$PATH"

# Verify
cursor-agent --version
```

### Issue: "Missing required environment variable"

**Solution**:
Check that all required variables are set:
```bash
env | grep -E '(GITLAB|CURSOR|CI_PROJECT|CI_MERGE)'
```

Required:
- `GITLAB_TOKEN` or `CI_JOB_TOKEN`
- `CURSOR_API_KEY`
- `CI_PROJECT_ID`
- `CI_MERGE_REQUEST_IID`

### Issue: "Failed to fetch MR data"

**Possible Causes**:
1. Invalid `GITLAB_TOKEN`
2. Incorrect `CI_PROJECT_ID` or `CI_MERGE_REQUEST_IID`
3. Insufficient token permissions
4. Network connectivity issues

**Solution**:
```bash
# Test GitLab API access
curl -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "$CI_SERVER_URL/api/v4/projects/$CI_PROJECT_ID/merge_requests/$CI_MERGE_REQUEST_IID"

# Should return MR JSON data
```

### Issue: "Cursor API error"

**Possible Causes**:
1. Invalid `CURSOR_API_KEY`
2. API rate limit exceeded
3. Network connectivity to Cursor API

**Solution**:
```bash
# Verify Cursor API key
cursor-agent -p "test prompt" --model "sonnet-4.5"

# Should return AI response (if key valid)
```

### Issue: "Node.js version mismatch"

**Solution**:
```bash
# Check Node.js version
node --version

# Should be >= 18.0.0
# If not, install Node 18+:
nvm install 18
nvm use 18
```

---

## Configuration Best Practices

### Security

1. **Never commit tokens**: Use `.env` file (gitignored) or CI variables
2. **Use masked variables**: In GitLab CI, always mask sensitive variables
3. **Rotate tokens regularly**: Update tokens every 90 days
4. **Use minimal permissions**: Only grant required scopes
5. **Use project tokens**: Prefer project tokens over personal tokens for CI

### Performance

1. **Use Docker**: Faster startup in CI compared to npm install
2. **Cache dependencies**: Use GitLab CI cache for npm_modules
3. **Set appropriate timeouts**: Adjust based on MR size
4. **Limit file types**: Review only relevant files (*.ts, *.tsx)

### Reliability

1. **Handle failures gracefully**: Don't fail pipeline on non-critical errors
2. **Log artifacts**: Save review data for debugging
3. **Monitor usage**: Track Cursor API usage and costs
4. **Test before deploying**: Verify configuration with test MRs

---

## Advanced Configuration

### Custom Output Directory

```bash
export OUTPUT_DIR=/tmp/review-robo-artifacts
```

Benefits:
- Separate from project files
- Easy cleanup
- Custom artifact retention

### Custom Thresholds

Edit `config/<tech>/cli.json`:

```json
{
  "settings": {
    "review": {
      "thresholds": {
        "critical": 3,   // More strict (default: 5)
        "moderate": 8,   // More strict (default: 10)
        "minor": 12      // More strict (default: 15)
      }
    }
  }
}
```

### Multiple Review Types in One Project

```yaml
# .gitlab-ci.yml
review_frontend:
  script:
    - export REVIEW_CONFIG_TYPE=next-ts
    - node src/index.js
  only:
    changes:
      - "frontend/**/*.ts"
      - "frontend/**/*.tsx"

review_backend:
  script:
    - export REVIEW_CONFIG_TYPE=java-maven
    - node src/index.js
  only:
    changes:
      - "backend/**/*.java"
```

---

## Next Steps

Now that Review-Robo is configured:

1. **[GitLab CI Integration](./05-gitlab-ci-integration.md)** - Add to your pipeline
2. **[API Reference](./06-api-reference.md)** - Detailed environment variable reference
3. **[Workflow](./03-workflow.md)** - Understand the review process

---

## Configuration Checklist

Before deploying to production:

- [ ] Node.js 18+ installed
- [ ] Cursor CLI installed and in PATH
- [ ] GitLab token created with required scopes
- [ ] Cursor API key obtained
- [ ] Environment variables configured
- [ ] Configuration type selected (next-ts/java-maven/custom)
- [ ] Tested with sample MR locally
- [ ] Docker image built and pushed (if using Docker)
- [ ] GitLab CI pipeline configured
- [ ] Team notified about automated reviews

---

**Ready to integrate?** See [GitLab CI Integration](./05-gitlab-ci-integration.md) for pipeline examples.

