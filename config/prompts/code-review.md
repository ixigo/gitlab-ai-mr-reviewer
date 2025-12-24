Review the code changes in "{{diffPath}}" and provide a comprehensive code review in STRICT JSON format.

## Context: Existing Discussions

Before providing your review, check the existing discussions file at "{{existingDiscussionsPath}}" to see comments that have already been made on this MR. DO NOT repeat issues that are already covered in existing discussions at the same file and line location.

## Issue Categorization

All identified issues must be categorized as:

* **Critical:** Security vulnerabilities, type safety violations, major bugs that must be addressed immediately
* **Moderate:** Performance issues, best practice violations, code smells that should be addressed in the near future
* **Minor:** Style improvements, minor optimizations, recommended improvements for code quality

**IMPORTANT:** Only report actual problems, bugs, or areas needing improvement. Positive changes, good practices, or improvements already implemented should NOT be flagged as issues. If code is good, acknowledge it in strengths, not issues.

## Review Requirements

Your review MUST include:

1. **Strengths:** Identify what was done well, good practices followed, and positive improvements
2. **Issues:** Detailed analysis of problems found (with file, line, severity, recommendation, code example)
3. **Weaknesses:** Areas that could be improved but aren't critical issues
4. **Recommendations:** Actionable suggestions for future improvements
5. **Verdict:** Overall assessment (APPROVE, APPROVE WITH MINOR CHANGES, REQUEST CHANGES, REJECT)
6. **Metrics:** Count of issues by category

**IMPORTANT: DO NOT include grade or score in your response.** The grade and score will be calculated automatically after your review based on the issues you identify.

---

CRITICAL REQUIREMENTS:
1. Every issue you count in metrics MUST have a corresponding detailed entry in the issues array
2. Line numbers MUST be calculated accurately from diff hunks (see Line Number Calculation section below)
3. File paths must match the diff exactly (e.g., shared/pages/BookingConfirmation/File.tsx)
4. POSITIVE IMPACT SHOULD NOT BE AN ISSUE: Only flag problems, bugs, or needed improvements. Good code, best practices already followed, or positive changes should be acknowledged in "strengths", NOT flagged as issues
5. ONLY comment on lines that are visible in the diff (added lines with + or context lines)

Your response must be ONLY valid JSON with no markdown, no explanations, no additional text. The JSON structure MUST be:

{
  "assessment": {
    "summary": "Brief overall summary of the code quality",
    "strengths": ["strength 1", "strength 2"],
    "weaknesses": ["weakness 1", "weakness 2"],
    "recommendations": ["recommendation 1", "recommendation 2"]
  },
  "metrics": [
    {
      "category": "Critical Issues",
      "count": 0,
      "threshold": 5,
      "status": "Pass"
    },
    {
      "category": "Moderate Issues", 
      "count": 0,
      "threshold": 10,
      "status": "Pass"
    },
    {
      "category": "Minor Issues",
      "count": 0,
      "threshold": 15,
      "status": "Pass"
    },
    {
      "category": "Test Coverage Issues",
      "count": 0,
      "threshold": null,
      "status": null
    },
    {
      "category": "Type Safety Issues",
      "count": 0,
      "threshold": null,
      "status": null
    },
    {
      "category": "Console Statements",
      "count": 0,
      "threshold": null,
      "status": null
    },
    {
      "category": "Security Issues",
      "count": 0,
      "threshold": null,
      "status": null
    }
  ],
  "issues": [
    {
      "position_type": "text",
      "new_path": "shared/pages/BookingConfirmation/ConfirmationStatusActions.tsx",
      "diff_line": 112,
      "new_line": 57,
      "newLineCode": "  bookingDetails: any;"
      "severity": "critical",
      "title": "Use of 'any' type violates type safety",
      "issue": "The bookingDetails parameter is typed as 'any'...",
      "recommendation": "Replace with proper interface type",
      "codeExample": "interface IConfirmationStatusActionsProps {\\n  bookingDetails: IBookingDetailResponse;\\n}",
      "effort": "10 min",
      "impact": "Type safety violation can cause runtime errors",
      "priority": "High"
    }
  ],
  "issueBreakdown": {
    "critical": ["Brief issue 1", "Brief issue 2"],
    "moderate": ["Brief issue 1"],
    "minor": ["Brief issue 1", "Brief issue 2"]
  },
  "nextSteps": [
    {
      "title": "Action item title",
      "description": "Description of what needs to be done",
      "effort": "30 min"
    }
  ],
  "verdict": "APPROVE WITH MINOR CHANGES"
}

CRITICAL: Output ONLY the JSON object, nothing else. No markdown code blocks, no explanations, NO GRADE OR SCORE fields.

## LINE NUMBER CALCULATION (CRITICAL)

⚠️ **EXTREMELY IMPORTANT**: Calculating correct line numbers is MANDATORY for GitLab to accept your inline comments.

📖 **READ THE DETAILED INSTRUCTIONS**: `config/prompts/AI_LINE_NUMBER_INSTRUCTIONS.md`

**This file contains:**
- ✅ Complete step-by-step algorithm with pseudocode
- ✅ 3 detailed worked examples (simple, with removed lines, new file)
- ✅ Validation checklist (5 checks before returning)
- ✅ Common mistakes to avoid
- ✅ **MANDATORY source file verification step**

**You MUST read and follow AI_LINE_NUMBER_INSTRUCTIONS.md before analyzing code.**

### Quick Summary (Full Details in AI_LINE_NUMBER_INSTRUCTIONS.md):

1. **Parse hunk header**: `@@ -oldStart,oldCount +newStart,newCount @@`
2. **Count from newStart**: Start your line counter at `newStart`
3. **Count correctly**: 
   - Lines with ` ` (space) → count and increment
   - Lines with `+` (added) → count and increment  
   - Lines with `-` (removed) → SKIP, don't increment
4. **Calculate new_line**: The counter value is your `new_line`
5. **VERIFY**: Read `${CI_PROJECT_DIR}/${new_path}` and confirm line matches your `newLineCode`

### Required Fields for Each Issue:
- **`position_type`**: Always `"text"`
- **`new_path`**: File path (e.g., "src/api/UserService.ts")
- **`diff_line`**: Line in diff patch (informational)
- **`new_line`**: Line in source file (calculated from hunk + VERIFIED against actual file)
- **`newLineCode`**: Actual code content (no `+`/`-` prefix)

### CRITICAL VALIDATION:
Before including ANY issue in your response:
1. ✅ Calculate `new_line` from diff hunk
2. ✅ Verify against actual source file at `${CI_PROJECT_DIR}/${new_path}`
3. ✅ Confirm code at `new_line` matches your `newLineCode`
4. ✅ If mismatch, search nearby lines and correct
5. ✅ Only include issues that pass verification

**If you cannot verify the line number, DO NOT include that issue.**

---

VALIDATION CHECKLIST BEFORE RESPONDING:
1. Count all issues in your issues array
2. Sum all counts in your metrics array (Critical + Moderate + Minor + Test Coverage + Type Safety + Console + Security)
3. Verify these two numbers are EQUAL
4. If not equal, add more detailed issues until they match
5. Every issue MUST have: position_type, new_path, diff_line, new_line, newLineCode, severity, title, issue, recommendation, codeExample, effort, impact, priority
6. VERIFY LINE NUMBERS:
   - `diff_line` is the line number in the diff patch file
   - `new_line` is calculated by counting through the hunk (skip removed lines)
   - `newLineCode` is the actual code content at that line (copy from diff)
   - The line MUST be an added (+) or context ( ) line, NOT a removed (-) line
   - The line MUST be within a diff hunk range

