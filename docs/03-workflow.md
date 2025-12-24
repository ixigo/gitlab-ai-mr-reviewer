# Workflow

This document provides a detailed breakdown of the Review-Robo workflow with diagrams and examples.

---

## Review Strategy

Review-Robo performs a **complete MR diff review** every time the pipeline runs.

### Complete MR Diff Review

- **Always**: Reviews the entire merge request diff
- **Fetches**: Complete MR changes using GitLab API (`/merge_requests/:iid/changes`)
- **Posts**: Both inline comments on specific lines + general MR summary comment
- **Best For**: Comprehensive code review with full context

**Benefits**:
- Complete context for every review
- No missed issues from earlier commits
- Consistent review quality regardless of when code was pushed
- Simple and predictable behavior

---

## Overview Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         REVIEW-ROBO WORKFLOW                          │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│   Developer     │
│   Creates MR    │
│   in GitLab     │
└────────┬────────┘
         │
         ├──────────────────────────────────────────────┐
         │                                               │
         ▼                                               ▼
┌─────────────────────────────────┐         ┌────────────────────────┐
│   GitLab CI Pipeline Triggers   │         │   Manual Execution     │
│   - Event: MR created/updated   │         │   (Local Testing)      │
│   - Stage: review                │         └────────┬───────────────┘
└────────┬────────────────────────┘                   │
         │                                             │
         └──────────────────┬──────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 0: PREREQUISITES CHECK                                         │
│ -------------------------------------------------------------------- │
│ ✓ Node.js >= 18.0.0                                                 │
│ ✓ Cursor CLI installed (/root/.local/bin/cursor-agent)             │
│ ✓ Environment variables set (GITLAB_TOKEN, CURSOR_API_KEY, etc.)   │
│ ✓ Output directory writable (.cursor/reviews/)                     │
│ ✓ GitLab API accessible                                             │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 1: FETCH MR DATA & PREPARE FOR REVIEW                         │
│ -------------------------------------------------------------------- │
│ 1.0 Detect Review Context                                           │
│     GET /api/v4/projects/:id/merge_requests/:iid/versions           │
│     → Check version count (1 = first review, >1 = incremental)      │
│     → Determine review mode (auto/full/incremental)                 │
│     → Decision: Full MR review OR Incremental review                │
│                                                                      │
│ 1.1 Fetch MR Metadata                                               │
│     GET /api/v4/projects/:id/merge_requests/:iid                    │
│     → Extract: title, author, base_sha, head_sha                    │
│                                                                      │
│ 1.2 Fetch Diff (Strategy Based on Mode)                             │
│     Full Mode:                                                       │
│       GET /api/v4/projects/:id/merge_requests/:iid/changes          │
│     Incremental Mode:                                                │
│       GET /api/v4/projects/:id/merge_requests/:iid/versions/:id     │
│     → Extract changed files and diffs                                │
│     → Save: changed-files.json, mr-diff.patch                       │
│                                                                      │
│ 1.3 Setup Configuration                                             │
│     → Auto-detect tech stack (java-maven/java-gradle/kotlin/next-ts)│
│     → Copy config/{tech}/cli.json → .cursor/                        │
│     → Copy config/{tech}/rules/ → .cursor/rules/                    │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 2: AI CODE REVIEW (CURSOR AGENT)                              │
│ -------------------------------------------------------------------- │
│ 2.1 Generate Review Prompt                                          │
│     → Create JSON schema with detailed instructions                 │
│     → Include line number calculation guidance                      │
│     → Define expected output structure                              │
│     → Save: review-prompt.txt                                       │
│                                                                      │
│ 2.2 Execute Cursor Agent CLI                                        │
│     $ cursor-agent -p "$(cat review-prompt.txt)" \                  │
│                     --model "sonnet-4.5" \                          │
│                     --output-format text                            │
│                                                                      │
│     Environment:                                                    │
│     - CURSOR_API_KEY=xxx                                            │
│     - Working directory: project root                               │
│     - Timeout: 5 minutes                                            │
│                                                                      │
│ 2.3 Claude Sonnet 4.5 Analyzes Code                                 │
│     → Read mr-diff.patch                                            │
│     → Apply rules from .cursor/cli.json                             │
│     → Identify issues (critical, moderate, minor)                   │
│     → Calculate metrics and grade                                   │
│     → Generate structured JSON output                               │
│                                                                      │
│ 2.4 Capture & Validate Output                                       │
│     → Capture stdout/stderr                                         │
│     → Parse JSON (handle truncation)                                │
│     → Fallback to markdown parsing if needed                        │
│     → Validate required fields                                      │
│     → Save: cursor-agent-output.json                                │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 3: PROCESS & ANALYZE REVIEW DATA                              │
│ -------------------------------------------------------------------- │
│ 3.1 Parse Review Output                                             │
│     → Extract assessment (grade, score, summary)                    │
│     → Extract metrics (issue counts, thresholds)                    │
│     → Extract issues (file, line, severity, description)            │
│     → Extract next steps and verdict                                │
│                                                                      │
│ 3.2 Validate & Fix Data                                             │
│     → Check JSON completeness                                       │
│     → Remove incomplete issues                                      │
│     → Verify metric counts match issue array                        │
│     → Validate line numbers (source lines, not diff lines)          │
│     → Fill missing required fields                                  │
│                                                                      │
│ 3.3 Analyze Review                                                  │
│     → Count issues by severity                                      │
│     → Calculate statistics                                          │
│     → Check threshold violations                                    │
│     → Determine overall verdict                                     │
│                                                                      │
│ 3.4 Calculate Grading                                               │
│     score = 100 - (critical×10 + moderate×3 + minor×1)             │
│     grade = map_score_to_grade(score)                               │
│                                                                      │
│ 3.5 Transform for GitLab                                            │
│     → Map line numbers to diff positions                            │
│     → Format comments in GitLab markdown                            │
│     → Prepare comment payloads                                      │
│     → Save: review-data.json                                        │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 4: PUBLISH TO GITLAB MR                                        │
│ -------------------------------------------------------------------- │
│ 4.1 Post Inline Comments                                            │
│     For each issue in review.issues:                                │
│       POST /api/v4/projects/:id/merge_requests/:iid/discussions     │
│       Payload: {                                                    │
│         body: formatted_comment,                                    │
│         position: {                                                 │
│           position_type: 'text',                                    │
│           new_line: issue.line,                                     │
│           new_path: issue.file,                                     │
│           base_sha: mrData.baseSha,                                 │
│           start_sha: mrData.startSha,                               │
│           head_sha: mrData.headSha                                  │
│         }                                                            │
│       }                                                              │
│                                                                      │
│     Track: success_count, failure_count                             │
│     Note: Some comments may fail if line not in diff                │
│                                                                      │
│ 4.2 Post General Comment                                            │
│     POST /api/v4/projects/:id/merge_requests/:iid/notes             │
│     Content:                                                        │
│       - 📊 Overall grade and score                                  │
│       - 📈 Metrics table with thresholds                            │
│       - 🔍 Issue breakdown by severity                              │
│       - ✅ Strengths                                                 │
│       - ⚠️  Weaknesses                                               │
│       - 💡 Recommendations                                           │
│       - 📋 Next steps                                                │
│       - ✓ or ✗ Verdict                                              │
│                                                                      │
│ 4.3 Update Statistics                                               │
│     → Update review-data.json with execution stats                  │
│     → Record: comment counts, duration, timestamp                   │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 5: COMPLETE & REPORT                                          │
│ -------------------------------------------------------------------- │
│ 5.1 Log Summary                                                     │
│     ✓ Step 1: AI code review completed                             │
│     ✓ Step 2: Posted X/Y inline comments                           │
│     ✓ Step 3: Posted general review                                │
│                                                                      │
│ 5.2 Display Results                                                 │
│     🔗 View MR: <gitlab-url>                                        │
│     Overall Grade: B+ (85/100)                                      │
│     Verdict: ✅ Approve with Suggestions  OR  ❌ Request Changes     │
│                                                                      │
│ 5.3 Exit with Status                                                │
│     if critical_issues > 0:                                         │
│       exit(1)  # Fail pipeline                                      │
│     else:                                                            │
│       exit(0)  # Pass pipeline                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Step-by-Step Workflow

### Stage 0: Prerequisites Check

#### Purpose
Validate that all required dependencies and configurations are in place before starting the review.

#### Checks Performed

```javascript
checkPrerequisites() {
  // 1. Node.js version
  const nodeVersion = process.version;
  if (!satisfies(nodeVersion, '>=18.0.0')) {
    throw new Error('Node.js 18+ required');
  }

  // 2. Cursor CLI
  const cursorPath = which('cursor-agent');
  if (!cursorPath) {
    throw new Error('cursor-agent not found in PATH');
  }

  // 3. Environment variables
  const required = [
    'CI_PROJECT_ID',
    'CI_MERGE_REQUEST_IID',
    'CURSOR_API_KEY'
  ];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing: ${key}`);
    }
  }

  // 4. GitLab token (either one)
  if (!process.env.GITLAB_TOKEN && !process.env.CI_JOB_TOKEN) {
    throw new Error('Missing GitLab authentication');
  }

  // 5. Output directory
  const outputDir = CONFIG.outputDir;
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
}
```

#### Output
```
✓ Node.js version: 20.11.1
✓ Cursor CLI found: /root/.local/bin/cursor-agent
✓ Environment variables set
✓ GitLab authentication configured
✓ Output directory ready: .cursor/reviews/
```

---

### Stage 1: Fetch MR Data

#### 1.1 Fetch MR Metadata

**API Call**:
```http
GET https://gitlab.com/api/v4/projects/12345/merge_requests/42
Headers:
  PRIVATE-TOKEN: glpat-xxx
```

**Response** (relevant fields):
```json
{
  "iid": 42,
  "title": "feat: Add booking confirmation page",
  "author": {
    "name": "John Doe",
    "username": "johndoe"
  },
  "diff_refs": {
    "base_sha": "abc123...",
    "start_sha": "def456...",
    "head_sha": "ghi789..."
  },
  "sha": "ghi789..."
}
```

**Extracted Data**:
```javascript
mrData = {
  title: "feat: Add booking confirmation page",
  author: "John Doe",
  baseSha: "abc123...",
  startSha: "def456...",
  headSha: "ghi789..."
}
```

#### 1.2 Fetch Changed Files

**API Call**:
```http
GET https://gitlab.com/api/v4/projects/12345/merge_requests/42/changes
```

**Response** (relevant fields):
```json
{
  "changes": [
    {
      "old_path": "src/pages/BookingConfirmation.tsx",
      "new_path": "src/pages/BookingConfirmation.tsx",
      "diff": "@@ -0,0 +1,150 @@\n+import React from 'react';\n..."
    },
    {
      "old_path": "src/utils/api.ts",
      "new_path": "src/utils/api.ts",
      "diff": "@@ -42,7 +42,10 @@\n export function fetchBooking()..."
    }
  ]
}
```

**Filter & Extract**:
```javascript
changedFiles = response.changes
  .filter(change => /\.(ts|tsx)$/.test(change.new_path))
  .map(change => change.new_path);

// Result:
// ['src/pages/BookingConfirmation.tsx', 'src/utils/api.ts']
```

**Save Artifact**:
```json
// .cursor/reviews/changed-files.json
{
  "files": [
    "src/pages/BookingConfirmation.tsx",
    "src/utils/api.ts"
  ],
  "count": 2,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 1.3 Generate Unified Diff

**Transform to Git Patch Format**:
```diff
# .cursor/reviews/mr-diff.patch

diff --git a/src/pages/BookingConfirmation.tsx b/src/pages/BookingConfirmation.tsx
--- a/src/pages/BookingConfirmation.tsx
+++ b/src/pages/BookingConfirmation.tsx
@@ -0,0 +1,150 @@
+import React from 'react';
+import { useBooking } from '../hooks/useBooking';
+
+interface BookingConfirmationProps {
+  bookingId: string;
+  details: any; // ← Issue here!
+}
+
+export const BookingConfirmation: React.FC<BookingConfirmationProps> = ({
+  bookingId,
+  details
+}) => {
+  const { confirm } = useBooking();
+  // ... rest of component
+};

diff --git a/src/utils/api.ts b/src/utils/api.ts
--- a/src/utils/api.ts
+++ b/src/utils/api.ts
@@ -42,7 +42,10 @@
 export function fetchBooking(id: string) {
-  return fetch(`/api/bookings/${id}`);
+  return fetch(`/api/bookings/${id}`)
+    .then(res => res.json())
+    .catch(err => console.log(err)); // ← Issue here!
 }
```

#### 1.4 Setup Configuration

**Copy Tech-Specific Config**:
```bash
# Source: config/next-ts/
# Target: .cursor/

cp config/next-ts/cli.json .cursor/cli.json
cp -r config/next-ts/rules/ .cursor/rules/
```

**Configuration Applied**:
```json
// .cursor/cli.json
{
  "version": "1.0",
  "settings": {
    "review": {
      "focus_areas": [
        "type_safety",
        "react_hooks",
        "performance",
        "error_handling",
        "best_practices"
      ],
      "severity_levels": ["critical", "moderate", "minor"]
    },
    "ai": {
      "model": "claude-sonnet-4.5",
      "temperature": 0.2,
      "max_tokens": 8000
    }
  }
}
```

---

### Stage 2: AI Code Review

#### 2.1 Generate Review Prompt

**Prompt Structure**:
```
Review the code changes in ".cursor/reviews/mr-diff.patch" and provide 
a comprehensive code review in STRICT JSON format.

CRITICAL REQUIREMENTS:
1. Every issue you count in metrics MUST have a detailed entry in issues array
2. Calculate CORRECT line numbers from diff hunks (not diff file line numbers)
3. File paths must match the diff exactly

LINE NUMBER CALCULATION EXAMPLE:
  @@ -0,0 +1,150 @@ means new file, lines start at 1
  Count '+' lines from the hunk start:
    Line 1: +import React from 'react';
    Line 2: +import { useBooking } ...
    Line 5: +  details: any; ← This is SOURCE LINE 5, not diff line 235

JSON STRUCTURE:
{
  "assessment": { "grade": "A+", "score": 95, ... },
  "metrics": [ { "category": "Critical Issues", "count": 2, ... } ],
  "issues": [ 
    { 
      "file": "src/pages/BookingConfirmation.tsx",
      "line": 5,  ← SOURCE LINE NUMBER
      "severity": "critical",
      "title": "Use of 'any' type",
      "issue": "Detailed description...",
      "recommendation": "Use proper interface...",
      "codeExample": "interface Props { details: IBooking; }",
      "effort": "10 min",
      "impact": "High",
      "priority": "High"
    }
  ],
  ...
}

Output ONLY valid JSON, no markdown blocks, no explanations.
```

#### 2.2 Execute Cursor Agent

**Command**:
```bash
cursor-agent \
  -p "$(cat .cursor/reviews/review-prompt.txt)" \
  --model "sonnet-4.5" \
  --output-format text
```

**Environment**:
```bash
export CURSOR_API_KEY=cur-xxxxxx
export PATH=/root/.local/bin:$PATH
```

**Execution Details**:
- Working Directory: Project root (where `.cursor/` exists)
- Timeout: 5 minutes (300,000 ms)
- stdin: ignored (prevents hanging)
- stdout: captured
- stderr: captured and logged

#### 2.3 Claude Analyzes Code

**What Claude Does**:

1. **Reads the diff**: Parses unified diff format
2. **Applies rules**: Checks against `.cursor/cli.json` and `.cursor/rules/*.mdc`
3. **Identifies patterns**: 
   - Type safety violations (`any`, `unknown`, missing types)
   - React anti-patterns (missing dependencies, improper hooks)
   - Error handling issues (console.log, swallowed errors)
   - Performance concerns (unnecessary re-renders, large bundles)
   - Security issues (XSS, injection risks)
4. **Categorizes by severity**:
   - **Critical**: Security, major bugs, type safety violations
   - **Moderate**: Performance, best practice violations
   - **Minor**: Style, minor improvements
5. **Generates recommendations**: Specific, actionable fixes with code examples
6. **Calculates metrics**: Counts by category, checks thresholds
7. **Assigns grade**: Based on issue counts and severity

#### 2.4 Capture Output

**Raw Output** (example):
```json
{
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
      "Use structured logging instead of console.log"
    ]
  },
  "metrics": [
    { "category": "Critical Issues", "count": 2, "threshold": 5, "status": "Pass" },
    { "category": "Moderate Issues", "count": 4, "threshold": 10, "status": "Pass" },
    { "category": "Minor Issues", "count": 8, "threshold": 15, "status": "Pass" }
  ],
  "issues": [
    {
      "file": "src/pages/BookingConfirmation.tsx",
      "line": 5,
      "severity": "critical",
      "title": "Use of 'any' type violates type safety",
      "issue": "The details parameter uses 'any' type, bypassing TypeScript's type checking. This can lead to runtime errors and makes refactoring dangerous.",
      "recommendation": "Define a proper interface for booking details",
      "codeExample": "interface BookingConfirmationProps {\n  bookingId: string;\n  details: IBookingDetails;\n}",
      "effort": "10 min",
      "impact": "Type safety violation, potential runtime errors",
      "priority": "High"
    },
    {
      "file": "src/utils/api.ts",
      "line": 46,
      "severity": "moderate",
      "title": "Console.log in production code",
      "issue": "Using console.log for error handling. Logs may not be captured in production.",
      "recommendation": "Use a proper logging framework",
      "codeExample": "import { logger } from './logger';\n\n.catch(err => logger.error('Failed to fetch booking', err));",
      "effort": "5 min",
      "impact": "Poor observability in production",
      "priority": "Medium"
    }
  ],
  "issueBreakdown": {
    "critical": ["Use of 'any' type", "Missing null check"],
    "moderate": ["Console.log in production", "Unnecessary re-render", "Missing error boundary"],
    "minor": ["Magic number", "Variable naming", "Missing JSDoc"]
  },
  "nextSteps": [
    {
      "title": "Fix type safety violations",
      "description": "Replace 'any' types with proper interfaces",
      "effort": "30 min"
    }
  ],
  "verdict": "APPROVE WITH MINOR CHANGES"
}
```

**Validation**:
```javascript
// Check completeness
✓ assessment exists with grade and score
✓ metrics array has 7 categories
✓ issues array has entries
✓ Issue count (14) matches sum of metrics (2+4+8)
✓ All issues have required fields
✓ Line numbers are valid (1-150, not 500+)
```

**Save Artifacts**:
```bash
.cursor/reviews/cursor-agent-output.json  # Raw AI output
.cursor/reviews/review-data.json          # Processed review data
```

---

### Stage 3: Process & Analyze

#### 3.1 Parse Review Output

Already in JSON format from Stage 2.4, so parsing is straightforward.

If markdown fallback needed:
```javascript
// Parse markdown sections
const assessment = extractSection(markdown, '## Overall Assessment');
const issues = extractIssues(markdown);
const metrics = extractMetrics(markdown);
```

#### 3.2 Validate & Fix Data

**Validation Checks**:
```javascript
// 1. Check for truncated JSON
if (!reviewData.verdict || !reviewData.nextSteps) {
  log.warning('JSON appears incomplete (truncated)');
  reviewData = fixIncompleteJSON(reviewData);
}

// 2. Remove incomplete issues
reviewData.issues = reviewData.issues.filter(issue => {
  return issue.recommendation && 
         issue.recommendation.length > 10 &&
         issue.codeExample &&
         !issue.codeExample.endsWith('...');
});

// 3. Verify metric counts
const totalMetrics = reviewData.metrics.reduce((sum, m) => sum + m.count, 0);
const actualIssues = reviewData.issues.length;
if (totalMetrics !== actualIssues) {
  log.warning(`Mismatch: ${totalMetrics} metrics vs ${actualIssues} issues`);
}

// 4. Validate line numbers
for (const issue of reviewData.issues) {
  if (issue.line > 1000) {
    log.warning(`Suspicious line number: ${issue.line} in ${issue.file}`);
    // Likely using diff line instead of source line
  }
}
```

#### 3.3 Analyze Review

**Statistics**:
```javascript
analyzeAIReview(aiReview) {
  // Count by severity
  STATS.criticalCount = aiReview.issues.filter(i => i.severity === 'critical').length;
  STATS.moderateCount = aiReview.issues.filter(i => i.severity === 'moderate').length;
  STATS.minorCount = aiReview.issues.filter(i => i.severity === 'minor').length;
  
  // Check thresholds
  const criticalThreshold = 5;
  const moderateThreshold = 10;
  const minorThreshold = 15;
  
  log.info(`Issues: ${STATS.criticalCount} critical, ${STATS.moderateCount} moderate, ${STATS.minorCount} minor`);
  
  if (STATS.criticalCount > criticalThreshold) {
    log.error(`Critical issues exceed threshold (${criticalThreshold})`);
  }
}
```

**Output**:
```
📊 REVIEW ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue Breakdown:
  🔴 Critical:  2/5  ✅ Pass
  🟠 Moderate:  4/10 ✅ Pass
  🟡 Minor:     8/15 ✅ Pass

Additional Metrics:
  📝 Test Coverage Issues: 1
  🔒 Type Safety Issues:   2
  💬 Console Statements:   1
  🛡️  Security Issues:      0
```

#### 3.4 Calculate Grading

**Algorithm**:
```javascript
function calculateGrade() {
  const critical = STATS.criticalCount;
  const moderate = STATS.moderateCount;
  const minor = STATS.minorCount;
  
  // Deduct points
  let score = 100;
  score -= critical * 10;  // -10 points per critical
  score -= moderate * 3;   // -3 points per moderate
  score -= minor * 1;      // -1 point per minor
  
  score = Math.max(0, score); // Floor at 0
  
  // Map to grade
  let grade;
  if (score >= 95) grade = 'A+';
  else if (score >= 90) grade = 'A';
  else if (score >= 85) grade = 'B+';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else grade = 'F';
  
  return { grade, score };
}
```

**Example Calculation**:
```
Issues: 2 critical, 4 moderate, 8 minor

Score = 100 - (2×10) - (4×3) - (8×1)
      = 100 - 20 - 12 - 8
      = 60
      = F (Below 70)

However, AI might assign B+ (85) based on context and code quality
```

#### 3.5 Transform for GitLab

**Line Number Mapping**:
```javascript
// AI provides source file line numbers (1-150)
// GitLab needs diff position
// Transformation done internally by GitLab API
// We just provide: file, line, base_sha, head_sha
```

**Comment Formatting**:
```javascript
function formatInlineComment(issue) {
  const severityEmoji = {
    critical: '🔴',
    moderate: '🟠',
    minor: '🟡'
  };
  
  return `
${severityEmoji[issue.severity]} **${issue.severity.toUpperCase()}**: ${issue.title}

**Issue**: ${issue.issue}

**Recommendation**: ${issue.recommendation}

**Code Example**:
\`\`\`typescript
${issue.codeExample}
\`\`\`

**Effort**: ${issue.effort} | **Impact**: ${issue.impact} | **Priority**: ${issue.priority}

---
*Automated review by Review-Robo 🤖 powered by Claude Sonnet 4.5*
`.trim();
}
```

---

### Stage 4: Publish to GitLab

#### 4.1 Post Inline Comments

**Process**:
```javascript
async function postAIInlineComments(aiReview, mrData) {
  for (const issue of aiReview.issues) {
    const comment = formatInlineComment(issue);
    
    try {
      await postInlineComment(
        issue.file,
        issue.line,
        comment,
        mrData
      );
      STATS.inlineSuccess++;
      log.success(`✓ Posted inline comment: ${issue.file}:${issue.line}`);
    } catch (error) {
      log.warning(`✗ Failed to post comment: ${issue.file}:${issue.line}`);
      // Continue with other comments
    }
  }
  
  log.info(`Posted ${STATS.inlineSuccess}/${aiReview.issues.length} inline comments`);
}
```

**GitLab API Call**:
```http
POST /api/v4/projects/12345/merge_requests/42/discussions
Content-Type: application/json
PRIVATE-TOKEN: glpat-xxx

{
  "body": "🔴 **CRITICAL**: Use of 'any' type...",
  "position": {
    "position_type": "text",
    "new_line": 5,
    "new_path": "src/pages/BookingConfirmation.tsx",
    "base_sha": "abc123...",
    "start_sha": "def456...",
    "head_sha": "ghi789..."
  }
}
```

**Result in GitLab**:
![Inline Comment Example]
```
📁 src/pages/BookingConfirmation.tsx
   Line 5: details: any;

💬 Review-Robo commented 2 minutes ago:

🔴 **CRITICAL**: Use of 'any' type violates type safety

**Issue**: The details parameter uses 'any' type, bypassing TypeScript's 
type checking. This can lead to runtime errors and makes refactoring dangerous.

**Recommendation**: Define a proper interface for booking details

**Code Example**:
interface BookingConfirmationProps {
  bookingId: string;
  details: IBookingDetails;
}

**Effort**: 10 min | **Impact**: High | **Priority**: High

---
Automated review by Review-Robo 🤖 powered by Claude Sonnet 4.5
```

#### 4.2 Post General Comment

**Format**:
```markdown
# 🤖 AI Code Review Report

## 📊 Overall Assessment

**Grade**: B+ (85/100)  
**Verdict**: ✅ Approve with Minor Changes

**Summary**: Good code quality with some improvements needed in type safety 
and error handling.

---

## 📈 Metrics

| Category | Count | Threshold | Status |
|----------|-------|-----------|--------|
| 🔴 Critical Issues | 2 | ≤ 5 | ✅ Pass |
| 🟠 Moderate Issues | 4 | ≤ 10 | ✅ Pass |
| 🟡 Minor Issues | 8 | ≤ 15 | ✅ Pass |
| 📝 Test Coverage | 1 | - | ℹ️ Info |
| 🔒 Type Safety | 2 | - | ℹ️ Info |
| 💬 Console Statements | 1 | - | ℹ️ Info |

---

## 🔍 Issue Breakdown

### 🔴 Critical (2)
- Use of 'any' type violates type safety
- Missing null check in user data access

### 🟠 Moderate (4)
- Console.log in production code
- Unnecessary re-render in BookingList
- Missing error boundary
- Unoptimized image component

### 🟡 Minor (8)
- Magic number in pagination
- Inconsistent variable naming
- Missing JSDoc comments
- (5 more...)

---

## ✅ Strengths

- Clean component structure and separation of concerns
- Proper use of React hooks
- Good test coverage for utilities

## ⚠️ Weaknesses

- Type safety violations with 'any' usage
- Error handling needs improvement
- Some performance optimization opportunities

## 💡 Recommendations

1. Replace all 'any' types with proper interfaces
2. Use structured logging framework instead of console
3. Add error boundaries to top-level components
4. Optimize images with Next.js Image component

---

## 📋 Next Steps

1. **Fix type safety violations** - Replace 'any' types (30 min)
2. **Improve error handling** - Add structured logging (20 min)
3. **Add error boundaries** - Wrap route components (15 min)

---

## 📊 Review Statistics

- **Files Changed**: 12
- **Issues Found**: 14
- **Inline Comments**: 14
- **Reviewed By**: Claude Sonnet 4.5 via Review-Robo

---

*View detailed inline comments on specific lines above.*
*Questions? Discuss with your team or update the code as suggested.*
```

**GitLab API Call**:
```http
POST /api/v4/projects/12345/merge_requests/42/notes
Content-Type: application/json
PRIVATE-TOKEN: glpat-xxx

{
  "body": "# 🤖 AI Code Review Report\n\n## 📊 Overall Assessment\n\n..."
}
```

---

### Stage 5: Complete & Report

#### 5.1 Update Statistics

**Final Stats**:
```javascript
{
  "executionStats": {
    "issueCount": {
      "critical": 2,
      "moderate": 4,
      "minor": 8,
      "testCoverage": 1,
      "typeSafety": 2,
      "consoleStatements": 1,
      "security": 0
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

#### 5.2 Console Output

```
✓ REVIEW COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Step 1: AI code review completed (AI-powered)
✓ Step 2: Posted 12/14 inline comments
✓ Step 3: Posted general review with AI assessment

🔗 View MR: https://gitlab.com/project/repo/-/merge_requests/42

Overall Grade: B+ (85/100)
Verdict: ✅ Approve with Suggestions

No critical issues - Code quality looks good!
```

#### 5.3 Exit with Status

```javascript
if (STATS.criticalCount > 0) {
  log.error('Critical issues found - Review required');
  process.exit(1); // Fail CI pipeline
} else {
  log.success('No critical issues - Code quality looks good!');
  process.exit(0); // Pass CI pipeline
}
```

---

## Timing Breakdown

Typical execution time for a medium-sized MR (10-15 files, 500-1000 lines changed):

| Stage | Duration | Percentage |
|-------|----------|------------|
| Prerequisites Check | 2-3s | 2% |
| Fetch MR Data | 3-5s | 3% |
| AI Review (Cursor) | 120-180s | 85% |
| Process & Analyze | 5-8s | 4% |
| Publish Comments | 10-15s | 6% |
| **Total** | **140-211s** | **100%** |

**Average**: ~2.5-3.5 minutes per MR

---

## Error Handling

### Common Failure Scenarios

1. **Cursor CLI Timeout**
   - Retry: No (single attempt)
   - Fallback: Exit with error
   - Exit Code: 1

2. **GitLab API Rate Limit**
   - Retry: Yes (exponential backoff)
   - Fallback: Log warning, continue
   - Exit Code: 0 (if partial success)

3. **Truncated JSON Response**
   - Retry: No
   - Fallback: Fix incomplete data
   - Exit Code: 0 (proceed with available data)

4. **Line Not in Diff (inline comment)**
   - Retry: No
   - Fallback: Skip comment, continue
   - Exit Code: 0

---

## Artifacts Generated

All artifacts saved to `.cursor/reviews/` (configurable via `OUTPUT_DIR`):

```
.cursor/reviews/
├── review-data.json           # Complete review with MR context
├── cursor-agent-output.json   # Raw AI output
├── mr-diff.patch              # Analyzed diff
├── review-prompt.txt          # Prompt sent to AI
├── changed-files.json         # List of files changed
└── code-review-mr-diff.md     # Markdown report (optional)
```

---

**Next**: See [Setup & Configuration](./04-setup-configuration.md) to get started with Review-Robo.

