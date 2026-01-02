# 📍 AI Instructions: How to Calculate Line Numbers from Diff Hunks

## ⚠️ CRITICAL: Read This Entire Section Before Analyzing Code

You MUST calculate correct line numbers for GitLab to accept your inline comments. Follow these instructions EXACTLY.

---

## 🎯 Step 1: Understand the Diff Format

A diff hunk looks like this:

```diff
@@ -oldStart,oldCount +newStart,newCount @@ context
 context line (unchanged)
-removed line (deleted)
+added line (new)
 context line (unchanged)
```

**Key Points:**
- Lines starting with **space** ` ` = context lines (exist in both old and new file)
- Lines starting with **minus** `-` = removed lines (only in old file, NOT in new file)
- Lines starting with **plus** `+` = added lines (only in new file)
- Hunk header `@@` tells you where this chunk is in the files

---

## 📐 Step 2: Parse the Hunk Header

### Hunk Header Format
```diff
@@ -oldStart,oldCount +newStart,newCount @@
```

### What Each Number Means

| Part | Meaning | Example |
|------|---------|---------|
| `oldStart` | Line number where this hunk starts in OLD file | `-1699` → starts at line 1699 |
| `oldCount` | Number of lines from OLD file in this hunk | `,7` → 7 lines |
| `newStart` | Line number where this hunk starts in NEW file | `+1699` → starts at line 1699 |
| `newCount` | Number of lines from NEW file in this hunk | `,7` → 7 lines |

### Example:
```diff
@@ -1699,7 +1699,7 @@ public class Example {
```
- **OLD file**: Lines 1699-1705 (1699 + 7 - 1)
- **NEW file**: Lines 1699-1705 (1699 + 7 - 1)

---

## 🧮 Step 3: Count Lines in NEW File (Algorithm)

**GOLDEN RULE**: `new_line` = lines that exist in the NEW file after changes

### Algorithm:

```
1. Start counting from newStart (from hunk header)
2. For each line in the hunk:
   a. If line starts with ' ' (space/context) → count it, increment counter
   b. If line starts with '+' (added) → count it, increment counter
   c. If line starts with '-' (removed) → DON'T count it, don't increment
3. The counter value at any line is that line's new_line number
```

### Code Example:

```python
new_line = newStart  # Start from hunk header value

for line in hunk_lines:
    if line.startswith(' '):  # Context line
        # This line exists in new file at new_line
        new_line += 1
    elif line.startswith('+'):  # Added line
        # This line exists in new file at new_line
        new_line += 1
    elif line.startswith('-'):  # Removed line
        # This line does NOT exist in new file
        # Don't increment new_line counter
        pass
```

---

## 📝 Step 4: Worked Example (Simple)

### Given Diff:
```diff
@@ -10,4 +20,6 @@ function example() {
   const data = getData();
+  console.log(data);
+  
   return processData(data);
 }
```

### Line Number Calculation:

| Line in Diff | Type | Code | new_line Calculation | new_line |
|--------------|------|------|---------------------|----------|
| (header) | - | `@@ -10,4 +20,6 @@` | Start from 20 | - |
| 1 | context | `  const data = getData();` | 20 (first line) | **20** |
| 2 | added | `+  console.log(data);` | 20 + 1 | **21** ✅ ISSUE HERE |
| 3 | added | `+  ` | 21 + 1 | **22** |
| 4 | context | `  return processData(data);` | 22 + 1 | **23** |
| 5 | context | ` }` | 23 + 1 | **24** |

### Result for console.log issue:
```json
{
  "new_line": 21,
  "newLineCode": "  console.log(data);"
}
```

---

## 📝 Step 5: Worked Example (With Removed Lines)

### Given Diff:
```diff
@@ -1699,7 +1699,7 @@ public class Example {
                     roomAvailability.getProviderId(), 
                     roomAvailability, 
                     context.getHotelOfferEligibility(), 
-                    context.getImm());
+                    context.getImm(), null);
         } catch (Exception e) {
             JLOG.error(new Log(LogMessage.ERROR)
```

### Line Number Calculation:

| Line | Type | Code | new_line Calculation | new_line |
|------|------|------|---------------------|----------|
| (header) | - | `@@ -1699,7 +1699,7 @@` | Start from 1699 | - |
| 1 | context | `                     roomAvailability.getProviderId(),` | 1699 | **1699** |
| 2 | context | `                     roomAvailability,` | 1699 + 1 | **1700** |
| 3 | context | `                     context.getHotelOfferEligibility(),` | 1700 + 1 | **1701** |
| 4 | removed | `-                    context.getImm());` | DON'T COUNT | - |
| 5 | added | `+                    context.getImm(), null);` | 1701 + 1 | **1702** ✅ |
| 6 | context | `         } catch (Exception e) {` | 1702 + 1 | **1703** |
| 7 | context | `             JLOG.error(new Log(LogMessage.ERROR)` | 1703 + 1 | **1704** |

### Result:
```json
{
  "new_line": 1702,
  "newLineCode": "                    context.getImm(), null);"
}
```

**Note**: The removed line at old_line 1702 is NOT counted. The added line takes its place at new_line 1702.

---

## 📝 Step 6: Worked Example (New File)

### Given Diff (New File):
```diff
@@ -0,0 +1,36 @@
+package com.example;
+
+import java.util.*;
+
+@RestController
+@RequestMapping("/api")
+public class MyController {
```

### Line Number Calculation:

| Line | Type | Code | new_line Calculation | new_line |
|------|------|------|---------------------|----------|
| (header) | - | `@@ -0,0 +1,36 @@` | Start from 1 | - |
| 1 | added | `+package com.example;` | 1 | **1** |
| 2 | added | `+` (blank) | 1 + 1 | **2** |
| 3 | added | `+import java.util.*;` | 2 + 1 | **3** |
| 4 | added | `+` (blank) | 3 + 1 | **4** |
| 5 | added | `+@RestController` | 4 + 1 | **5** |
| 6 | added | `+@RequestMapping("/api")` | 5 + 1 | **6** |
| 7 | added | `+public class MyController {` | 6 + 1 | **7** ✅ |

### Result:
```json
{
  "new_line": 7,
  "newLineCode": "public class MyController {"
}
```

---

## ✅ Step 7: Validation Checklist

Before returning your JSON, verify EACH issue:

### 1. ✅ Is new_line within the hunk range?
```
hunk_start = newStart (from hunk header)
hunk_end = newStart + newCount - 1

new_line MUST be: hunk_start ≤ new_line ≤ hunk_end
```

### 2. ✅ Did you count only context and added lines?
- Count lines with ` ` (space) prefix
- Count lines with `+` prefix
- SKIP lines with `-` prefix

### 3. ✅ Did you start from newStart?
- First line number = newStart (from `+newStart,newCount`)
- NOT from oldStart
- NOT from line 1

### 4. ✅ Is the code from an added or context line?
- NEVER report issues on removed lines (-)
- Only report on added (+) or context ( ) lines

### 5. ✅ Did you capture the code correctly?
- `newLineCode` should NOT include the `+` or ` ` prefix
- Should be the actual code content
- Include leading whitespace (indentation)

---

## ❌ Common Mistakes (DO NOT DO THIS)

### Mistake 1: Using Diff Patch Line Number
```json
❌ WRONG:
{
  "new_line": 687,  // This is line 687 in the PATCH FILE
  "newLineCode": "context.getImm(), null);"
}

✅ CORRECT:
{
  "new_line": 1702,  // This is line 1702 in the SOURCE FILE
  "newLineCode": "context.getImm(), null);"
}
```

### Mistake 2: Counting Removed Lines
```diff
@@ -10,5 +10,4 @@
  line 1    → new_line = 10
  line 2    → new_line = 11
- removed   → DON'T COUNT (not in new file)
+ added     → new_line = 12 (NOT 13!)
  line 3    → new_line = 13
```

### Mistake 3: Starting from Wrong Number
```diff
@@ -1699,7 +1699,7 @@
```
- ❌ Start from 1: WRONG
- ❌ Start from 1699 (oldStart): WRONG
- ✅ Start from 1699 (newStart): CORRECT

### Mistake 4: Including Line Prefix in Code
```json
❌ WRONG:
{
  "newLineCode": "+  console.log(data);"
}

✅ CORRECT:
{
  "newLineCode": "  console.log(data);"
}
```

---

## 🎯 Quick Reference Card

```
HUNK HEADER: @@ -oldStart,oldCount +newStart,newCount @@

COUNTING RULES:
• Start: newStart (from + side of hunk header)
• Count: lines with ' ' or '+' prefix
• Skip: lines with '-' prefix
• Result: new_line = current count

VALIDATION:
• new_line must be: newStart ≤ new_line ≤ (newStart + newCount - 1)
• Code must NOT include prefix (+, -, or space)
• Code must be from a line that exists in new file
```

---

## 📋 Output Format

For EACH issue you identify:

```json
{
  "position_type": "text",
  "new_path": "path/to/file.java",
  "diff_line": 687,  // Line number in patch file (informational)
  "new_line": 1702,  // ✅ CALCULATED using algorithm above
  "newLineCode": "                    context.getImm(), null);",
  "severity": "minor",
  "title": "...",
  "issue": "...",
  "recommendation": "...",
  "codeExample": "...",
  "effort": "...",
  "impact": "..."
}
```

---

## 🧪 Step 8: MANDATORY Verification Against Source File

**CRITICAL**: Before returning your JSON, you MUST verify EACH line number against the actual source file.

### Verification Algorithm:

```
For each issue:
1. Calculate new_line from diff (using steps 1-7 above)
2. Build file path: filePath = `${CI_PROJECT_DIR}/${new_path}`
3. Read the source file at filePath
4. Get line at new_line: actualLine = lines[new_line - 1]
5. Compare: does actualLine contain newLineCode?
   - If YES: ✅ Line number is CORRECT
   - If NO: ❌ Recalculate or search nearby lines
```

### How to Verify:

**Step 1**: After calculating `new_line`, read the actual source file:

```bash
# Example: You calculated new_line = 1702 for CommonHelperService.java
# File path: src/main/java/com/ixigo/accommodation/search/services/CommonHelperService.java
# Full path: ${CI_PROJECT_DIR}/src/main/java/.../CommonHelperService.java

# Read that specific line
sed -n '1702p' "${CI_PROJECT_DIR}/src/main/java/.../CommonHelperService.java"
```

**Step 2**: Compare with your `newLineCode`:

```
Expected (your newLineCode): "                    context.getImm(), null);"
Actual (line 1702 in file):   "                    context.getImm(), null);"

Match? YES ✅ → Line number is CORRECT
```

### Example Verification Process:

**Issue**: Passing null as clientId parameter

**Calculated from diff**:
```json
{
  "new_path": "src/main/java/.../HotelRoomDetailsBatchServiceImpl.java",
  "new_line": 1702,
  "newLineCode": "                    context.getImm(), null);"
}
```

**Verification Steps**:

1. **Read file at line 1702**:
   ```bash
   sed -n '1702p' "${CI_PROJECT_DIR}/src/main/java/.../HotelRoomDetailsBatchServiceImpl.java"
   ```
   
2. **Compare**:
   - Expected: `context.getImm(), null);`
   - Actual: `                    context.getImm(), null);`
   - Match (ignoring leading whitespace)? **YES** ✅

3. **Result**: Line number 1702 is CORRECT!

---

### If Verification FAILS:

If the actual file line doesn't match your `newLineCode`:

**Option 1: Search Nearby Lines** (±5 lines)
```bash
# Check lines 1697-1707
sed -n '1697,1707p' "${CI_PROJECT_DIR}/path/to/file.java"
```

Look for your code in these lines. If found at different line:
- Update `new_line` to the correct line
- Recount from diff to understand where you went wrong

**Option 2: Double-Check Your Counting**
- Go back to the hunk header
- Recount line by line
- Verify you didn't count removed lines (-)
- Verify you started from newStart

**Option 3: Skip This Issue**
If you absolutely cannot find the code in the file:
- The code might not be in a diff hunk (AI hallucination)
- Don't include this issue in your output

---

### Verification Checklist:

For EVERY issue before adding to your JSON response:

- [ ] ✅ Calculated `new_line` from diff hunk
- [ ] ✅ Read actual source file at `${CI_PROJECT_DIR}/${new_path}`
- [ ] ✅ Checked line `new_line` in actual file
- [ ] ✅ Verified `newLineCode` matches actual line (ignoring whitespace)
- [ ] ✅ If not matched, searched nearby lines and corrected
- [ ] ✅ Updated `new_line` to verified line number

**Only include issues that pass ALL checks!**

---

## 🧪 Self-Test Before Responding

1. Pick an issue from your list
2. Find its hunk header
3. Count through the hunk following the algorithm
4. Verify your new_line is within hunk range
5. Double-check you didn't count removed lines
6. **READ THE ACTUAL SOURCE FILE** at `${CI_PROJECT_DIR}/${new_path}`
7. **VERIFY** the code at `new_line` matches `newLineCode`
8. If mismatch, search nearby lines and correct

If all checks pass, your line numbers are correct! ✅

---

## 🚨 REMEMBER

**GitLab will REJECT your comment if new_line is wrong!**

**You have access to the actual source files!** Use them to verify!

File path format: `${CI_PROJECT_DIR}/${new_path}`

Example:
- `new_path`: "src/main/java/com/example/Service.java"
- Full path: `${CI_PROJECT_DIR}/src/main/java/com/example/Service.java`

Take your time. Count carefully. **VERIFY EVERY LINE NUMBER**. Follow the algorithm exactly.

