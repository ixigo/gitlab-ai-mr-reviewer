# API Reference

Complete reference for all environment variables, configuration options, and output formats used by Review-Robo.

---

## Environment Variables

### Required Variables

#### `CI_PROJECT_ID` / `PROJECT_ID`
- **Type**: String or Number
- **Required**: Yes
- **Description**: GitLab project identifier
- **Format**: Either numeric ID or URL-encoded path
- **Examples**:
  ```bash
  CI_PROJECT_ID=12345
  # OR
  CI_PROJECT_ID=group%2Fsubgroup%2Fproject
  ```
- **Where**: Automatically set in GitLab CI, manual in local runs
- **How to find**: Project → Settings → General → Project ID

#### `CI_MERGE_REQUEST_IID`
- **Type**: Number
- **Required**: Yes
- **Description**: Merge Request internal ID (IID), not global ID
- **Format**: Integer
- **Example**: `CI_MERGE_REQUEST_IID=42`
- **Where**: Automatically set in GitLab CI for MR pipelines
- **Note**: This is the number in the MR URL (`!42`), not the global ID

#### `CI_SERVER_URL`
- **Type**: String (URL)
- **Required**: Yes
- **Description**: Base URL of GitLab instance
- **Format**: `https://domain.com` (no trailing slash)
- **Examples**:
- **Where**: Automatically set in GitLab CI, manual in local runs

#### `CURSOR_API_KEY`
- **Type**: String
- **Required**: Yes
- **Description**: API key for Cursor/Claude access
- **Format**: Starts with `cur-`
- **Example**: `CURSOR_API_KEY=cur-xxxxxxxxxxxxx`
- **Where**: GitLab CI/CD Variables (masked) or local `.env`
- **How to get**: https://cursor.com/settings → API Keys
- **Security**: ⚠️ Always mask in CI/CD settings

#### `GITLAB_TOKEN` or `CI_JOB_TOKEN`
- **Type**: String
- **Required**: One of these two
- **Description**: Authentication token for GitLab API
- **Format**:
  - `GITLAB_TOKEN`: Starts with `glpat-` (personal/project token)
  - `CI_JOB_TOKEN`: Automatically provided in GitLab CI
- **Examples**:
  ```bash
  GITLAB_TOKEN=glpat-xxxxxxxxxxxxx
  # OR (automatic in GitLab CI)
  CI_JOB_TOKEN=xxxxxxxxxxxxx
  ```
- **Scopes Required** (for GITLAB_TOKEN):
  - `api` - Read/write API access
  - `read_repository` - Read repository
  - `write_repository` - Post comments
- **Recommendation**: Use `CI_JOB_TOKEN` in CI, `GITLAB_TOKEN` for local testing
- **Security**: ⚠️ Always mask in CI/CD settings

---

### Optional Variables

#### `REVIEW_CONFIG_TYPE`
- **Type**: String
- **Required**: No
- **Description**: Technology stack configuration to use
- **Format**: Directory name in `config/`
- **Default**: `next-ts`
- **Options**:
  - `next-ts` - TypeScript/Next.js/React
  - `java-maven` - Java with Maven
  - `<custom>` - Custom config directory name
- **Example**: `REVIEW_CONFIG_TYPE=java-maven`

#### `OUTPUT_DIR`
- **Type**: String (path)
- **Required**: No
- **Description**: Directory for review artifacts
- **Format**: Relative or absolute path
- **Default**: `.cursor/reviews`
- **Example**: `OUTPUT_DIR=/tmp/review-artifacts`
- **Note**: Created automatically if doesn't exist

#### Review Strategy

Review-Robo always performs a **complete MR diff review**:
- Fetches the entire merge request diff
- Posts both inline comments and general MR summary
- Provides comprehensive context for every review
- No configuration needed - behavior is consistent and predictable

---

### GitLab CI Variables (Auto-Provided)

These are automatically available in GitLab CI pipelines:

#### `CI_MERGE_REQUEST_TITLE`
- **Type**: String
- **Description**: Title of the merge request
- **Usage**: Logged for context

#### `CI_MERGE_REQUEST_TARGET_BRANCH_NAME`
- **Type**: String
- **Description**: Target branch (e.g., `main`, `develop`)
- **Usage**: Can be used for conditional logic

#### `CI_MERGE_REQUEST_SOURCE_BRANCH_NAME`
- **Type**: String
- **Description**: Source branch (e.g., `feature/new-feature`)
- **Usage**: Logged for context

#### `CI_COMMIT_SHA`
- **Type**: String (SHA hash)
- **Description**: Current commit SHA
- **Usage**: Internal - used for diff retrieval

#### `GITLAB_USER_NAME`
- **Type**: String
- **Description**: Name of user who triggered pipeline
- **Usage**: Logged for context

---

## Configuration Files

### CLI Configuration (`config/<tech>/cli.json`)

#### Structure

```json
{
  "version": "1.0",
  "settings": {
    "review": {
      "focus_areas": ["array", "of", "strings"],
      "severity_levels": ["critical", "moderate", "minor"],
      "thresholds": {
        "critical": 5,
        "moderate": 10,
        "minor": 15
      },
      "output_format": "markdown"
    },
    "ai": {
      "model": "claude-sonnet-4.5",
      "temperature": 0.2,
      "max_tokens": 8000
    },
    "typescript": { },
    "react": { },
    "nextjs": { }
  }
}
```

#### Fields Reference

##### `version`
- **Type**: String
- **Description**: Configuration schema version
- **Current**: `"1.0"`

##### `settings.review.focus_areas`
- **Type**: Array of strings
- **Description**: Areas to focus on during review
- **Options**:
  - `"type_safety"` - TypeScript type checking
  - `"react_hooks"` - React hooks validation
  - `"performance"` - Performance optimization
  - `"error_handling"` - Error handling patterns
  - `"security"` - Security vulnerabilities
  - `"best_practices"` - General best practices
  - `"testing"` - Test coverage and quality
  - `"accessibility"` - WCAG compliance
  - `"solid_principles"` - SOLID design principles
  - `"thread_safety"` - Concurrency issues (Java)

##### `settings.review.severity_levels`
- **Type**: Array of strings
- **Description**: Severity classifications
- **Required**: `["critical", "moderate", "minor"]`
- **Fixed**: Do not modify

##### `settings.review.thresholds`
- **Type**: Object
- **Description**: Maximum allowed issues before failing
- **Defaults**:
  ```json
  {
    "critical": 5,   // Fail if > 5 critical issues
    "moderate": 10,  // Fail if > 10 moderate issues
    "minor": 15      // Fail if > 15 minor issues
  }
  ```

##### `settings.review.output_format`
- **Type**: String
- **Description**: AI output format
- **Options**: `"markdown"`, `"json"`
- **Default**: `"markdown"`

##### `settings.ai.model`
- **Type**: String
- **Description**: AI model to use
- **Default**: `"claude-sonnet-4.5"`
- **Supported**: `"claude-sonnet-4.5"`, `"claude-sonnet-4"`

##### `settings.ai.temperature`
- **Type**: Number (0.0 - 1.0)
- **Description**: Randomness in AI responses (lower = more deterministic)
- **Default**: `0.2`
- **Recommendation**: `0.1-0.3` for code reviews

##### `settings.ai.max_tokens`
- **Type**: Number
- **Description**: Maximum tokens in AI response
- **Default**: `8000`
- **Range**: `1000 - 16000`

##### Technology-Specific Settings

**TypeScript (`settings.typescript`)**:
```json
{
  "strict_mode": true,
  "no_any": true,
  "no_explicit_any": true
}
```

**React (`settings.react`)**:
```json
{
  "check_hooks_deps": true,
  "check_prop_types": true,
  "prefer_functional": true
}
```

**Next.js (`settings.nextjs`)**:
```json
{
  "check_server_client": true,
  "check_image_optimization": true,
  "check_dynamic_imports": true
}
```

**Java (`settings.java`)**:
```json
{
  "version": "17",
  "strict_null_checks": true,
  "check_thread_safety": true
}
```

**Spring (`settings.spring`)**:
```json
{
  "check_bean_lifecycle": true,
  "check_transaction_boundaries": true
}
```

**Maven (`settings.maven`)**:
```json
{
  "check_dependencies": true,
  "check_security_vulnerabilities": true
}
```

---

### Rule Files (`config/<tech>/rules/*.mdc`)

Custom markdown documents with review guidelines.

#### Format

```markdown
# Rule Category

## Rule Name

Description of the rule and why it's important.

### Pattern
Regular expression or description of pattern to detect.

### Severity
critical | moderate | minor

### Example (Bad)
\`\`\`typescript
// Bad code example
const data: any = fetchData();
\`\`\`

### Example (Good)
\`\`\`typescript
// Good code example
const data: IData = fetchData();
\`\`\`

### Recommendation
Specific guidance on how to fix.
```

---

## Output Formats

### Review Data JSON (`review-data.json`)

Complete review output saved to `${OUTPUT_DIR}/review-data.json`.

#### Schema

```typescript
interface ReviewData {
  // MR Context
  mrOverview: {
    iid: number;
    title: string;
    author: string;
    baseSha: string;
    headSha: string;
    reviewTimestamp: string; // ISO 8601
  };
  
  // Overall Assessment
  summary: string;
  grade: string;  // A+, A, B+, B, C, F
  score: number;  // 0-100
  verdict: string; // "APPROVE" | "APPROVE WITH CHANGES" | "REQUEST CHANGES"
  
  // Assessment Details
  assessment: {
    grade: string;
    score: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  
  // Metrics
  metrics: Array<{
    category: string;
    count: number;
    threshold: number | null;
    status: "Pass" | "Fail" | null;
  }>;
  
  // Detailed Issues
  issues: Array<{
    file: string;
    line: number;
    severity: "critical" | "moderate" | "minor";
    title: string;
    issue: string;
    recommendation: string;
    codeExample: string;
    effort: string;
    impact: string;
    priority: "High" | "Medium" | "Low";
  }>;
  
  // Issue Summary
  issueBreakdown: {
    critical: string[];
    moderate: string[];
    minor: string[];
  };
  
  // Next Steps
  nextSteps: Array<{
    title: string;
    description: string;
    effort: string;
  }>;
  
  // Execution Stats
  executionStats: {
    issueCount: {
      critical: number;
      moderate: number;
      minor: number;
      testCoverage: number;
      typeSafety: number;
      consoleStatements: number;
      security: number;
      documentation: number;
      performance: number;
      accessibility: number;
    };
    comments: {
      total: number;
      posted: number;
      failed: number;
    };
    duration: string;
    completedAt: string; // ISO 8601
  };
}
```

#### Example

```json
{
  "mrOverview": {
    "iid": 42,
    "title": "feat: Add booking confirmation page",
    "author": "John Doe",
    "baseSha": "abc123def456",
    "headSha": "ghi789jkl012",
    "reviewTimestamp": "2024-01-15T10:30:00Z"
  },
  "summary": "Good code quality with some improvements needed",
  "grade": "B+",
  "score": 85,
  "verdict": "APPROVE WITH MINOR CHANGES",
  "assessment": {
    "grade": "B+",
    "score": 85,
    "summary": "Good code quality with some improvements needed",
    "strengths": [
      "Clean component structure",
      "Proper error boundaries"
    ],
    "weaknesses": [
      "Type safety violations with 'any' usage",
      "Console.log in production code"
    ],
    "recommendations": [
      "Replace 'any' types with proper interfaces",
      "Use structured logging"
    ]
  },
  "metrics": [
    {
      "category": "Critical Issues",
      "count": 2,
      "threshold": 5,
      "status": "Pass"
    },
    {
      "category": "Moderate Issues",
      "count": 4,
      "threshold": 10,
      "status": "Pass"
    },
    {
      "category": "Minor Issues",
      "count": 8,
      "threshold": 15,
      "status": "Pass"
    }
  ],
  "issues": [
    {
      "file": "src/pages/BookingConfirmation.tsx",
      "line": 12,
      "severity": "critical",
      "title": "Use of 'any' type violates type safety",
      "issue": "The details parameter uses 'any' type...",
      "recommendation": "Define proper interface",
      "codeExample": "interface Props { details: IBookingDetails; }",
      "effort": "10 min",
      "impact": "High",
      "priority": "High"
    }
  ],
  "issueBreakdown": {
    "critical": ["Use of 'any' type", "Missing null check"],
    "moderate": ["Console.log in production", "Unnecessary re-render"],
    "minor": ["Magic number", "Variable naming"]
  },
  "nextSteps": [
    {
      "title": "Fix type safety violations",
      "description": "Replace 'any' types with proper interfaces",
      "effort": "30 min"
    }
  ],
  "executionStats": {
    "issueCount": {
      "critical": 2,
      "moderate": 4,
      "minor": 8,
      "testCoverage": 1,
      "typeSafety": 2,
      "consoleStatements": 1,
      "security": 0,
      "documentation": 0,
      "performance": 0,
      "accessibility": 0
    },
    "comments": {
      "total": 14,
      "posted": 12,
      "failed": 2
    },
    "duration": "2m 45s",
    "completedAt": "2024-01-15T10:35:00Z"
  }
}
```

---

### Changed Files JSON (`changed-files.json`)

List of files changed in the MR.

```json
{
  "files": [
    "src/pages/BookingConfirmation.tsx",
    "src/components/BookingCard.tsx",
    "src/utils/api.ts"
  ],
  "count": 3,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

### MR Diff Patch (`mr-diff.patch`)

Unified diff in Git patch format.

```diff
diff --git a/src/pages/BookingConfirmation.tsx b/src/pages/BookingConfirmation.tsx
--- a/src/pages/BookingConfirmation.tsx
+++ b/src/pages/BookingConfirmation.tsx
@@ -0,0 +1,150 @@
+import React from 'react';
+// ... rest of diff
```

---

## GitLab API Endpoints Used

Review-Robo interacts with these GitLab API endpoints:

### Fetch MR Metadata
```
GET /api/v4/projects/:id/merge_requests/:iid
```

### Fetch MR Changes
```
GET /api/v4/projects/:id/merge_requests/:iid/changes
```

### Post Inline Comment
```
POST /api/v4/projects/:id/merge_requests/:iid/discussions
```

### Post General Note
```
POST /api/v4/projects/:id/merge_requests/:iid/notes
```

---

## Exit Codes

| Code | Meaning | Reason |
|------|---------|--------|
| 0 | Success | No critical issues found |
| 1 | Failure | Critical issues found OR system error |

**Note**: Exit code 1 can be used to fail CI pipeline when critical issues are detected.

---

## Constants

### Severity Levels

```javascript
const SEVERITY = {
  CRITICAL: 'critical',  // 🔴 Red - Security, major bugs, type safety
  MODERATE: 'moderate',  // 🟠 Orange - Performance, best practices
  MINOR: 'minor'        // 🟡 Yellow - Style, minor improvements
};
```

### Default Thresholds

```javascript
const THRESHOLDS = {
  CRITICAL: 5,   // Fail if > 5 critical issues
  MODERATE: 10,  // Fail if > 10 moderate issues
  MINOR: 15      // Fail if > 15 minor issues
};
```

### Grade Mapping

```javascript
const GRADES = {
  'A+': { min: 95, max: 100 },
  'A':  { min: 90, max: 94 },
  'B+': { min: 85, max: 89 },
  'B':  { min: 80, max: 84 },
  'C':  { min: 70, max: 79 },
  'F':  { min: 0,  max: 69 }
};
```

### Scoring Weights

```javascript
const WEIGHTS = {
  CRITICAL: 10,  // -10 points per critical issue
  MODERATE: 3,   // -3 points per moderate issue
  MINOR: 1       // -1 point per minor issue
};
```

### Timeout

```javascript
const TIMEOUT = {
  CURSOR_CLI: 300000,  // 5 minutes
  GITLAB_API: 30000    // 30 seconds
};
```

---

## Logging Levels

Review-Robo uses color-coded logging:

```javascript
log.success('✓ Operation successful');  // Green
log.error('✗ Operation failed');        // Red
log.warning('⚠ Warning message');       // Yellow
log.info('ℹ Information');              // Cyan
log.section('=== SECTION HEADER ===');  // Bold
```

---

## Version Information

```json
{
  "name": "review-robo",
  "version": "1.0.0",
  "engines": {
    "node": ">=18.0.0"
  },
  "ai": {
    "model": "claude-sonnet-4.5",
    "provider": "Cursor"
  }
}
```

---

## API Rate Limits

### GitLab API
- **Authenticated**: 2,000 requests/minute
- **Impact**: Minimal (typically 3-5 requests per review)

### Cursor API
- **Depends on plan**: Check Cursor pricing
- **Impact**: 1 request per review (can be expensive for large diffs)

---

## Next Steps

- **[Troubleshooting](./07-troubleshooting.md)** - Common issues and solutions
- **[Setup](./04-setup-configuration.md)** - Configure your environment
- **[GitLab CI](./05-gitlab-ci-integration.md)** - Pipeline integration

---

**Need help?** See [Troubleshooting Guide](./07-troubleshooting.md) or check project README.

