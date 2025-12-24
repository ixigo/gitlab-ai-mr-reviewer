# Phase 3: Filter Duplicate Issues

## YOUR TASK

You are given:
1. **NEW ISSUES** with precisely calculated line numbers
2. **EXISTING DISCUSSIONS** from previous reviews on this MR

Your job: Remove duplicates and very similar issues to avoid noise in the MR.

## DUPLICATE DETECTION CRITERIA

Mark an issue as DUPLICATE if it matches an existing discussion with:

### 1. Same File ✅
Both must be in the same source file.

### 2. Same or Nearby Line ✅
Line numbers within ±5 lines of each other.

### 3. Similar Topic ✅
The issue addresses the same concern or problem.

**Examples of DUPLICATES**:
- New: "Missing null check at line 703" vs Existing: "Add null validation at line 701" → DUPLICATE ✅
- New: "Use proper type at line 150" vs Existing: "Replace any with specific type at line 152" → DUPLICATE ✅
- New: "Add test coverage at line 400" vs Existing: "Missing unit tests at line 395" → DUPLICATE ✅

**Examples of NOT DUPLICATES**:
- New: "Missing null check at line 703" vs Existing: "Add documentation at line 705" → NOT duplicate ❌
- New: "Security issue at line 100" vs Existing: "Security issue at line 200" → NOT duplicate (different location) ❌
- New: "Fix TypeScript type at line 50" vs Existing: "Add null check at line 52" → NOT duplicate (different topic) ❌

## INPUT FORMAT

You will receive issues in this format:

```json
{
  "newIssues": [
    {
      "file": "src/services/CommonHelperService.java",
      "new_path": "src/services/CommonHelperService.java",
      "new_line": 703,
      "old_line": 703,
      "codeSnippet": "String distributionApiKey = appRequest.getAuthHeaders().get(...);",
      "severity": "critical",
      "title": "Potential NullPointerException - missing null check",
      "issue": "The code accesses appRequest.getAuthHeaders() without null check...",
      "recommendation": "Add null check before accessing authHeaders",
      "codeExample": "...",
      "effort": "5 min",
      "impact": "Can cause application crash"
    }
  ],
  "existingDiscussions": [
    {
      "file": "src/services/CommonHelperService.java",
      "line": 701,
      "comment": "Consider adding null validation for authHeaders to prevent NPE",
      "author": "john.doe",
      "created": "2024-11-26T10:30:00Z"
    }
  ]
}
```

## OUTPUT FORMAT

Return ONLY a JSON object:

```json
{
  "filteredIssues": [
    {
      "file": "src/services/UserService.java",
      "new_path": "src/services/UserService.java",
      "new_line": 450,
      "old_line": 448,
      "codeSnippet": "user.getName()",
      "severity": "moderate",
      "title": "Missing null check",
      "issue": "...",
      "recommendation": "...",
      "codeExample": "...",
      "effort": "...",
      "impact": "..."
    }
  ],
  "duplicatesRemoved": [
    {
      "file": "src/services/CommonHelperService.java",
      "line": 703,
      "title": "Potential NullPointerException - missing null check",
      "reason": "Similar null check comment exists at line 701 by john.doe",
      "existingComment": "Consider adding null validation for authHeaders to prevent NPE"
    }
  ],
  "summary": {
    "totalNewIssues": 25,
    "duplicatesFound": 5,
    "keptIssues": 20
  }
}
```

## COMPARISON ALGORITHM

For each NEW ISSUE:

```python
for new_issue in newIssues:
    for existing in existingDiscussions:
        # Check 1: Same file?
        if new_issue.file != existing.file:
            continue  # Different files, not duplicate
        
        # Check 2: Nearby lines? (within ±5)
        if abs(new_issue.new_line - existing.line) > 5:
            continue  # Too far apart, not duplicate
        
        # Check 3: Similar topic?
        if is_similar_topic(new_issue.title, existing.comment):
            # DUPLICATE FOUND!
            mark_as_duplicate(new_issue, existing)
            break
```

## TOPIC SIMILARITY EXAMPLES

### Similar Topics (Mark as Duplicate):
- "Missing null check" ≈ "Add null validation"
- "Use proper type" ≈ "Replace any type"
- "Add test coverage" ≈ "Missing unit tests"
- "Security vulnerability" ≈ "Security concern"
- "Memory leak" ≈ "Potential memory issue"

### Different Topics (Keep Both):
- "Missing null check" ≠ "Add documentation"
- "Type safety issue" ≠ "Performance problem"
- "Security vulnerability" ≠ "Code style"

## EDGE CASES

### Multiple Issues on Same Line:
If multiple different issues exist on the same line:
- Keep all if they address different concerns
- Remove if they're variations of the same concern

### Existing Comment is Vague:
If existing comment is vague but new issue is detailed:
- Mark as duplicate (don't re-comment)
- The existing comment is good enough

### Existing Comment is Outdated:
If existing comment refers to old code that's now changed:
- Keep new issue (existing is no longer relevant)
- Not a duplicate

## VALIDATION CHECKLIST

Before returning your JSON:
- [ ] Every NEW ISSUE was checked against ALL EXISTING DISCUSSIONS
- [ ] Duplicate detection used all 3 criteria (file, line, topic)
- [ ] filteredIssues contains only non-duplicates
- [ ] duplicatesRemoved explains WHY each was marked duplicate
- [ ] Summary counts are accurate
- [ ] All fields from input are preserved in filteredIssues

## REMEMBER

🎯 **Be conservative** - If unsure, mark as duplicate (reduce noise)

📍 **Explain your reasoning** - duplicatesRemoved should show why

⚠️ **Preserve all fields** - Don't remove any fields from issues

Output ONLY valid JSON. No markdown, no code blocks, no text before/after.

