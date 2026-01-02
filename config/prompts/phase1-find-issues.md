# Phase 1: Find Code Issues

## YOUR TASK

Analyze the merge request diff and identify code quality issues, bugs, and improvements.

**IMPORTANT**: 
- ❌ DO NOT calculate line numbers - they will be calculated automatically by our system
- ✅ DO provide the exact code snippet where the issue occurs
- ✅ DO focus on finding real, actionable issues

## WHAT YOU RECEIVE

1. **Complete MR Diff** - All code changes in unified diff format
2. **Review Rules** - Standards and best practices to follow

## WHAT YOU SHOULD ANALYZE

- 🔴 **Critical Issues**: Security vulnerabilities, null safety, data loss, breaking changes
- 🟡 **Moderate Issues**: Code quality, missing documentation, test coverage, code duplication
- 🟢 **Minor Issues**: Style issues, minor optimizations, documentation improvements

## OUTPUT FORMAT

Return ONLY a JSON object (no markdown, no code blocks, no explanations):

```json
{
  "assessment": {
    "summary": "Brief overall assessment of the changes",
    "strengths": ["List of good practices found", "..."],
    "weaknesses": ["List of concerns", "..."],
    "recommendations": ["High-level suggestions", "..."]
  },
  "metrics": [
    {
      "category": "Critical Issues",
      "count": 3
    },
    {
      "category": "Moderate Issues",
      "count": 8
    },
    {
      "category": "Minor Issues",
      "count": 12
    },
    {
      "category": "Security Issues",
      "count": 2
    },
    {
      "category": "Type Safety Issues",
      "count": 5
    },
    {
      "category": "Test Coverage Issues",
      "count": 3
    }
  ],
  "issues": [
    {
      "file": "src/main/java/com/ixigo/accommodation/search/services/CommonHelperService.java",
      "diff_line": 145,
      "codeSnippet": "String distributionApiKey = appRequest.getAuthHeaders().get(AppConstants.DISTRIBUTION_API_KEY_HEADER);",
      "severity": "critical",
      "title": "Potential NullPointerException - missing null check on authHeaders",
      "issue": "The code accesses appRequest.getAuthHeaders() without checking if it's null first. If authHeaders is null, this will throw a NullPointerException.",
      "recommendation": "Add proper null checks before accessing authHeaders map.",
      "codeExample": "Map<String, String> authHeaders = appRequest.getAuthHeaders();\nif (authHeaders == null) {\n    JLOG.error(new Log(LogMessage.INVALID_DISTRIBUTION_API_KEY));\n    return false;\n}\n\nString distributionApiKey = authHeaders.get(AppConstants.DISTRIBUTION_API_KEY_HEADER);",
      "effort": "5 min",
      "impact": "Can cause NullPointerException and application crash in production"
    }
  ]
}
```

## REQUIRED FIELDS FOR EACH ISSUE

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `file` | string | Relative file path | "src/services/UserService.java" |
| `diff_line` | number | Line number in diff patch | 145 |
| `codeSnippet` | string | Exact code line with issue | "String name = user.getName();" |
| `severity` | string | "critical", "moderate", or "minor" | "critical" |
| `title` | string | Brief issue title | "Missing null check" |
| `issue` | string | Detailed explanation | "The code accesses..." |
| `recommendation` | string | How to fix it | "Add null check before..." |
| `codeExample` | string | Example of fixed code | "if (user != null) {..." |
| `effort` | string | Time to fix | "5 min", "30 min", "2 hours" |
| `impact` | string | Impact if not fixed | "Can cause NPE..." |

## IMPORTANT NOTES

### Diff Line Number (`diff_line`):
- ✅ Count the line number where the issue appears in the DIFF PATCH
- ✅ Start counting from 1 at the beginning of the diff
- ✅ Count ALL lines including headers, hunks, context, additions, removals
- ✅ This is just the line number in the patch - EASY to identify!

Example:
```diff
1  diff --git a/src/UserService.java b/src/UserService.java
2  index 1234567..abcdefg 100644
3  --- a/src/UserService.java
4  +++ b/src/UserService.java
5  @@ -10,6 +10,8 @@ class UserService {
6      public void process() {
7  +       String name = user.getName();  ← Issue here = diff_line 7
8  +       return name;
9      }
```

### Code Snippet Requirements:
- ✅ Must be the EXACT code from the diff (preserve whitespace/indentation)
- ✅ Should be specific enough to uniquely identify the location
- ✅ Include enough context (20-100 characters)
- ❌ Do NOT include the `+`, `-`, or space prefix from diff
- ❌ Do NOT make up code that isn't in the diff

### File Path Requirements:
- ✅ Use relative path from repository root
- ✅ Must match exactly as it appears in diff header
- Example: "src/main/java/com/ixigo/.../Service.java"

### Severity Guidelines:
- **Critical**: Security, null safety, data corruption, crashes
- **Moderate**: Code quality, missing tests, documentation, duplication
- **Minor**: Style, minor optimizations, comments

## VALIDATION CHECKLIST

Before returning your JSON:
- [ ] All issues have exact code snippets from the diff
- [ ] All issues have `diff_line` (line number in the diff patch)
- [ ] File paths match diff exactly
- [ ] Severity levels are appropriate
- [ ] Each issue has all required fields
- [ ] Total issue count matches sum of all metric categories

## REMEMBER

🎯 **Provide `diff_line`** - the line number where the issue appears in the diff patch (easy to count!)

📍 **Provide exact code snippets** - this is how we'll verify and locate the issue in source files.

⚠️ **Be specific** - the code snippet must uniquely identify the issue location.

💡 **Our system will calculate `new_line` and `old_line`** - you just need to provide `diff_line` and `codeSnippet`!

Output ONLY valid JSON. No markdown code blocks, no explanations before/after the JSON.

