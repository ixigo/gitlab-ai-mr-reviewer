# Architecture

This document describes the internal architecture and design of Review-Robo.

---

## System Overview

Review-Robo follows a pipeline architecture with distinct stages for fetching, analyzing, and publishing code reviews.

```
┌─────────────────────────────────────────────────────────────┐
│                      Review-Robo System                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │           1. Prerequisites Check                    │    │
│  │  - Node.js version                                  │    │
│  │  - Cursor CLI installation                          │    │
│  │  - Environment variables                            │    │
│  │  - GitLab connectivity                              │    │
│  └────────────────┬───────────────────────────────────┘    │
│                   │                                          │
│                   ▼                                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │           2. Data Fetching Layer                    │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  GitLab API Client                           │  │    │
│  │  │  - Fetch MR metadata                         │  │    │
│  │  │  - Get changed files list                    │  │    │
│  │  │  - Retrieve unified diff                     │  │    │
│  │  │  - Extract base/head SHAs                    │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  └────────────────┬───────────────────────────────────┘    │
│                   │                                          │
│                   ▼                                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │           3. Configuration Layer                    │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Config Setup Service                        │  │    │
│  │  │  - Select tech config (next-ts/java-maven)  │  │    │
│  │  │  - Copy cli.json to .cursor/                │  │    │
│  │  │  - Copy rules/*.mdc to .cursor/rules/       │  │    │
│  │  │  - Create output directories                 │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  └────────────────┬───────────────────────────────────┘    │
│                   │                                          │
│                   ▼                                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │           4. AI Review Layer                        │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Cursor Agent CLI Wrapper                    │  │    │
│  │  │  - Generate review prompt with schema       │  │    │
│  │  │  - Execute cursor-agent command             │  │    │
│  │  │  - Handle JSON/Markdown output              │  │    │
│  │  │  - Fix truncated responses                  │  │    │
│  │  └──────────────┬───────────────────────────────┘  │    │
│  │                 │                                    │    │
│  │                 ▼                                    │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Claude Sonnet 4.5 (via Cursor API)         │  │    │
│  │  │  - Analyze code diff                         │  │    │
│  │  │  - Apply review rules                        │  │    │
│  │  │  - Generate structured output               │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  └────────────────┬───────────────────────────────────┘    │
│                   │                                          │
│                   ▼                                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │           5. Processing Layer                       │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Parser (JSON/Markdown)                      │  │    │
│  │  │  - Extract review structure                  │  │    │
│  │  │  - Validate schema                           │  │    │
│  │  │  - Handle incomplete data                    │  │    │
│  │  └──────────────┬───────────────────────────────┘  │    │
│  │                 │                                    │    │
│  │                 ▼                                    │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Analyzer                                    │  │    │
│  │  │  - Count issues by severity                 │  │    │
│  │  │  - Calculate metrics                        │  │    │
│  │  │  - Validate line numbers                    │  │    │
│  │  └──────────────┬───────────────────────────────┘  │    │
│  │                 │                                    │    │
│  │                 ▼                                    │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Grading Engine                              │  │    │
│  │  │  - Apply threshold rules                     │  │    │
│  │  │  - Calculate score (0-100)                   │  │    │
│  │  │  - Assign grade (A+ to F)                    │  │    │
│  │  │  - Determine verdict                         │  │    │
│  │  └──────────────┬───────────────────────────────┘  │    │
│  │                 │                                    │    │
│  │                 ▼                                    │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Transformer                                 │  │    │
│  │  │  - Map line numbers to diff positions       │  │    │
│  │  │  - Format comments for GitLab               │  │    │
│  │  │  - Prepare payload structures               │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  └────────────────┬───────────────────────────────────┘    │
│                   │                                          │
│                   ▼                                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │           6. Publishing Layer                       │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Inline Comment Poster                       │  │    │
│  │  │  - Post issues to specific lines            │  │    │
│  │  │  - Track success/failure                     │  │    │
│  │  │  - Handle line mapping errors                │  │    │
│  │  └──────────────┬───────────────────────────────┘  │    │
│  │                 │                                    │    │
│  │                 ▼                                    │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  General Comment Poster                      │  │    │
│  │  │  - Format assessment report                  │  │    │
│  │  │  - Include metrics and grading               │  │    │
│  │  │  - Post to MR discussion                     │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  └────────────────┬───────────────────────────────────┘    │
│                   │                                          │
│                   ▼                                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │           7. Artifacts & Logging                    │    │
│  │  - review-data.json (complete review)               │    │
│  │  - mr-diff.patch (analyzed diff)                    │    │
│  │  - cursor-agent-output.json (raw AI output)         │    │
│  │  - changed-files.json (file list)                   │    │
│  │  - Execution statistics                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Main Entry Point (`src/index.js`)

**Responsibility**: Orchestrates the entire review workflow

**Key Functions**:
- Initialize prerequisites check
- Coordinate all stages of review
- Handle errors and exit codes
- Log execution summary

**Workflow**:
```javascript
async function main() {
  checkPrerequisites();
  const mrData = await fetchMRData();
  const changedFiles = await getChangedFiles();
  const aiReview = await runCursorAgentReview(changedFiles, mrData);
  analyzeAIReview(aiReview);
  await postAIInlineComments(aiReview, mrData);
  await postGeneralComment(mrData, aiReview);
  updateReviewDataWithStats(reviewJsonPath);
  // Exit with status based on critical issues
}
```

---

### 2. GitLab API Layer (`src/api/gitlab.js`)

**Responsibility**: All interactions with GitLab API

**Key Functions**:

#### `fetchMRData()`
```javascript
// Returns: { title, author, baseSha, startSha, headSha }
```
Fetches merge request metadata required for comment positioning.

#### `getChangedFiles()`
```javascript
// Returns: ['file1.ts', 'file2.tsx', ...]
```
Filters and returns only TypeScript/TSX files changed in the MR.

#### `getMRDiff()`
```javascript
// Returns: { diffContent, fileCount, changes }
```
Retrieves unified diff in Git patch format for AI analysis.

#### `postInlineComment(filePath, lineNumber, commentBody, mrData)`
```javascript
// Posts a threaded discussion on a specific line
// Requires: base_sha, start_sha, head_sha for positioning
```

#### `postGeneralNote(comment)`
```javascript
// Posts a general note to the MR (not tied to specific lines)
```

**Authentication**:
- Uses `PRIVATE-TOKEN` header with GitLab token
- Supports both `GITLAB_TOKEN` and `CI_JOB_TOKEN`

---

### 3. Review Orchestration (`src/review/`)

#### Cursor Agent Wrapper (`cursor-agent.js`)

**Responsibility**: Execute and manage Cursor CLI for AI review

**Process**:
1. Setup cursor config from tech-specific directory
2. Generate detailed JSON schema prompt
3. Execute cursor-agent CLI with:
   - Model: `sonnet-4.5`
   - Output format: `text` (to avoid wrapping)
   - Timeout: Configurable (default 5 minutes)
4. Handle output:
   - Try parsing as JSON first
   - Fallback to markdown parsing if needed
   - Fix truncated JSON responses
   - Validate completeness
5. Save artifacts (JSON, diff, prompt)

**Line Number Calculation**:
```javascript
// Critical: Convert diff line numbers to source file line numbers
// Diff format: @@ -old_start,old_count +new_start,new_count @@
// Example: @@ -0,0 +1,92 @@ means new file, lines start at 1
// Count '+' lines from new_start to find actual line number
```

**Truncation Handling**:
```javascript
// Strategies for incomplete JSON:
// 1. Find last complete issue object via },\n pattern
// 2. Search for last "priority" field (end of issue)
// 3. Close JSON structure properly
// 4. Fill in missing required fields
```

#### Parser (`parser.js`)

**Responsibility**: Extract structured data from markdown output

**Handles**:
- Markdown-formatted reviews (fallback)
- Section parsing (Assessment, Issues, Metrics)
- Code block extraction
- Severity classification

#### Analyzer (`analyzer.js`)

**Responsibility**: Validate and analyze review data

**Functions**:
- Count issues by severity
- Validate line numbers
- Check metric thresholds
- Detect mismatches between metrics and issues

#### Grading Engine (`grading.js`)

**Responsibility**: Calculate quality score and grade

**Algorithm**:
```javascript
score = 100 - (critical × weight_critical) 
            - (moderate × weight_moderate)
            - (minor × weight_minor)

// Weights:
// Critical: 10 points each
// Moderate: 3 points each  
// Minor: 1 point each

// Grade mapping:
// 95-100: A+
// 90-94:  A
// 85-89:  B+
// 80-84:  B
// 70-79:  C
// <70:    F
```

#### Transformer (`transformer.js`)

**Responsibility**: Transform AI output to GitLab-compatible format

**Functions**:
- Map line numbers to diff positions
- Format markdown for GitLab
- Structure comment payloads
- Handle file path normalization

---

### 4. Comment Publishing (`src/comments/`)

#### Inline Comments (`inline.js`)

**Responsibility**: Post issue-specific comments on code lines

**Logic**:
```javascript
for each issue in aiReview.issues:
  format comment with:
    - Severity badge (🔴 Critical, 🟠 Moderate, 🟡 Minor)
    - Issue title
    - Detailed description
    - Recommendation
    - Code example
    - Effort estimate
    
  try:
    postInlineComment(file, line, comment, mrData)
    track success
  catch:
    log failure (line not in diff)
    continue
```

**Comment Format**:
```markdown
🔴 **Critical**: Use of 'any' type violates type safety

**Issue**: The bookingDetails parameter is typed as 'any', which bypasses 
TypeScript's type checking...

**Recommendation**: Replace with proper interface type

**Code Example**:
​```typescript
interface IConfirmationStatusActionsProps {
  bookingDetails: IBookingDetailResponse;
}
​```

**Effort**: 10 min | **Impact**: High | **Priority**: High
```

#### General Comments (`general.js`)

**Responsibility**: Post comprehensive review summary

**Includes**:
- Overall grade and score
- Metrics table
- Issue breakdown by severity
- Strengths and weaknesses
- Recommendations
- Next steps
- Verdict (Approve/Request Changes)

---

### 5. Configuration System (`src/services/config-setup.js`)

**Responsibility**: Manage tech-specific configurations

**Process**:
```javascript
function setupCursorConfig(projectRoot) {
  const configType = process.env.REVIEW_CONFIG_TYPE || 'next-ts';
  const sourceDir = `config/${configType}`;
  const targetDir = `${projectRoot}/.cursor`;
  
  // Copy cli.json
  copyFile(`${sourceDir}/cli.json`, `${targetDir}/cli.json`);
  
  // Copy rules (if exists)
  if (exists(`${sourceDir}/rules`)) {
    copyDirectory(`${sourceDir}/rules`, `${targetDir}/rules`);
  }
}
```

**Config Structure**:
```json
{
  "version": "1.0",
  "settings": {
    "review": {
      "focus_areas": ["type_safety", "best_practices", ...],
      "severity_levels": ["critical", "moderate", "minor"],
      "output_format": "markdown"
    },
    "ai": {
      "model": "claude-sonnet-4.5",
      "temperature": 0.2,
      "max_tokens": 8000
    },
    "typescript": { /* tech-specific settings */ }
  }
}
```

---

### 6. Supporting Services

#### Prerequisites Checker (`services/prerequisites.js`)

**Checks**:
- ✓ Node.js version >= 18.0.0
- ✓ Cursor CLI installed and in PATH
- ✓ Required environment variables set
- ✓ GitLab API accessible
- ✓ Output directories writable

#### File Manager (`services/file-manager.js`)

**Functions**:
- `saveChangedFiles()`: Save file list as JSON artifact
- `updateReviewDataWithStats()`: Append execution stats to review JSON
- Create output directories
- Handle file I/O errors

---

### 7. Utilities

#### Logger (`utils/logger.js`)

**Features**:
- Color-coded output (success=green, error=red, warning=yellow)
- Section headers
- Structured logging
- Debug mode support

#### Stats Tracker (`utils/stats.js`)

**Tracks**:
```javascript
STATS = {
  criticalCount: 0,
  moderateCount: 0,
  minorCount: 0,
  inlineTotal: 0,
  inlineSuccess: 0,
  startTime: Date.now(),
  endTime: null
}
```

#### Command Executor (`utils/exec.js`)

**Purpose**: Execute shell commands with proper error handling and timeouts

---

## Data Flow

### Input Data

```javascript
// Environment Variables
{
  CI_SERVER_URL: 'https://gitlab.com',
  CI_PROJECT_ID: '12345',
  CI_MERGE_REQUEST_IID: '42',
  GITLAB_TOKEN: 'glpat-xxx',
  CURSOR_API_KEY: 'cur-xxx',
  REVIEW_CONFIG_TYPE: 'next-ts'
}
```

### Intermediate Data

```javascript
// MR Diff (unified format)
`
diff --git a/src/Component.tsx b/src/Component.tsx
--- a/src/Component.tsx
+++ b/src/Component.tsx
@@ -10,7 +10,8 @@
-  const value: any = props.data;
+  const value: IData = props.data;
`

// AI Review Output (parsed)
{
  assessment: { grade: 'B+', score: 85, ... },
  metrics: [{ category: 'Critical Issues', count: 2, ... }],
  issues: [{ file, line, severity, title, issue, recommendation, ... }],
  verdict: 'REQUEST CHANGES'
}
```

### Output Data

```javascript
// Saved Artifacts (.cursor/reviews/)
{
  'review-data.json': {
    mrOverview: { iid, title, author, baseSha, headSha },
    grade: 'B+',
    score: 85,
    issues: [...],
    metrics: [...],
    executionStats: { issueCount, comments, completedAt }
  },
  'mr-diff.patch': '...',
  'cursor-agent-output.json': '...',
  'changed-files.json': ['file1.ts', 'file2.tsx']
}

// GitLab MR
{
  inlineComments: [/* threaded discussions on specific lines */],
  generalComment: '/* markdown report with grade, metrics, recommendations */'
}
```

---

## Error Handling Strategy

### Graceful Degradation

1. **Cursor CLI Failure**: Log error, exit with code 1
2. **Inline Comment Failure**: Log, continue with other comments
3. **Parsing Failure**: Attempt markdown fallback
4. **JSON Truncation**: Fix incomplete data, proceed with available issues
5. **Network Errors**: Retry with exponential backoff (GitLab API)

### Exit Codes

- `0`: Success, no critical issues
- `1`: Failure or critical issues found

---

## Performance Considerations

### Optimization Strategies

1. **Parallel API Calls**: Fetch MR data and changed files simultaneously
2. **Streaming Output**: Process cursor-agent stdout in chunks
3. **Timeout Management**: Kill hanging processes after threshold
4. **Artifact Caching**: Save intermediate results for debugging
5. **Minimal Dependencies**: Keep npm footprint small

### Scalability

- **Stateless Design**: Each review is independent
- **Docker Containerization**: Easy horizontal scaling
- **Resource Limits**: Configurable timeouts and token limits
- **Concurrent Reviews**: Can run multiple MRs in parallel

---

## Security Architecture

### API Token Security

```javascript
// Token hierarchy (priority order):
1. GITLAB_TOKEN (preferred for automation)
2. CI_JOB_TOKEN (automatic in GitLab CI)

// Token permissions required:
- api (read/write access to API)
- read_repository (access MR diffs)
- write_repository (post comments)
```

### Data Isolation

- Only MR diff sent to Cursor/Claude (not full codebase)
- Temporary files in `.cursor/reviews/` (gitignored)
- No persistent storage of code
- Artifacts cleaned up between runs (optional)

### Environment Isolation

- Runs in containerized environment
- No access to host filesystem outside project
- Network access limited to GitLab and Cursor API
- Credentials via environment variables (not hardcoded)

---

## Extension Points

### Adding New Language Support

1. Create `config/<language>/cli.json`
2. Define language-specific rules
3. Add severity thresholds
4. Set `REVIEW_CONFIG_TYPE=<language>`

### Custom Review Rules

```javascript
// config/<tech>/rules/custom-rule.mdc
# Rule: No console.log in production

Check for console.log, console.debug statements in production code.
These should use a proper logging framework.

Severity: moderate
Pattern: /console\.(log|debug|info)/
```

### Plugin Architecture (Future)

Potential extension points:
- Pre-review hooks (dependency install, build)
- Post-review hooks (notifications, metrics export)
- Custom comment formatters
- Alternative AI providers
- Additional VCS platforms (GitHub, Bitbucket)

---

## Technology Decisions

### Why Node.js?

- ✅ Excellent async/await for API orchestration
- ✅ Rich ecosystem (minimal dependencies needed)
- ✅ Fast startup time (critical for CI/CD)
- ✅ JSON-native (easy data manipulation)
- ✅ Cross-platform (Linux, macOS, Windows)

### Why Cursor CLI?

- ✅ Simplified Claude API access
- ✅ Automatic token management
- ✅ Rule-based customization
- ✅ Output format flexibility
- ✅ Active development and support

### Why GitLab-Native?

- ✅ Rich MR API (diff positioning, threaded discussions)
- ✅ Native CI/CD integration
- ✅ Artifact storage
- ✅ Job token authentication
- ✅ Merge request events

---

**Next**: See [Workflow](./03-workflow.md) for a step-by-step breakdown of the review process.

