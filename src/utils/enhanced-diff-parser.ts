/**
 * Enhanced Diff Parser - Correctly maps line numbers from diff hunks
 * 
 * This parser builds a complete mapping of:
 * - diff_line (line in patch) → old_line, new_line (lines in actual files)
 */

export interface DiffLine {
  type: 'added' | 'removed' | 'context';
  content: string;
  old_line: number | null;  // null for added lines
  new_line: number | null;  // null for removed lines
  diff_line_in_patch: number;  // Line number in the entire patch file
}

export interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
  headerLine: string;
}

export interface FileDiff {
  oldPath: string;
  newPath: string;
  isNewFile: boolean;
  isDeletedFile: boolean;
  hunks: DiffHunk[];
}

/**
 * Parse entire diff patch into structured format with line mappings
 */
export function parseDiffPatch(diffContent: string): Map<string, FileDiff> {
  const files = new Map<string, FileDiff>();
  const lines = diffContent.split('\n');
  
  let currentFile: FileDiff | null = null;
  let currentHunk: DiffHunk | null = null;
  let patchLineNumber = 0;
  let oldLineNumber = 0;
  let newLineNumber = 0;
  
  for (let i = 0; i < lines.length; i++) {
    patchLineNumber = i + 1;
    const line = lines[i];
    
    // File header: diff --git a/path b/path
    if (line.startsWith('diff --git ')) {
      // Push current hunk to previous file before saving
      if (currentHunk && currentFile) {
        currentFile.hunks.push(currentHunk);
        currentHunk = null;
      }
      
      // Save previous file
      if (currentFile && currentFile.hunks.length > 0) {
        files.set(currentFile.newPath, currentFile);
      }
      
      const match = line.match(/diff --git a\/(.*) b\/(.*)/);
      if (match) {
        currentFile = {
          oldPath: match[1],
          newPath: match[2],
          isNewFile: false,
          isDeletedFile: false,
          hunks: [],
        };
      }
      continue;
    }
    
    // New file marker
    if (line.startsWith('new file mode')) {
      if (currentFile) currentFile.isNewFile = true;
      continue;
    }
    
    // Deleted file marker
    if (line.startsWith('deleted file mode')) {
      if (currentFile) currentFile.isDeletedFile = true;
      continue;
    }
    
    // Hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    if (line.startsWith('@@')) {
      if (currentHunk) {
        currentFile?.hunks.push(currentHunk);
      }
      
      const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (match) {
        const oldStart = parseInt(match[1]);
        const oldCount = match[2] ? parseInt(match[2]) : 1;
        const newStart = parseInt(match[3]);
        const newCount = match[4] ? parseInt(match[4]) : 1;
        
        currentHunk = {
          oldStart,
          oldCount,
          newStart,
          newCount,
          lines: [],
          headerLine: line,
        };
        
        oldLineNumber = oldStart;
        newLineNumber = newStart;
      }
      continue;
    }
    
    // Hunk content lines
    if (currentHunk) {
      if (line.startsWith('+')) {
        // Added line
        currentHunk.lines.push({
          type: 'added',
          content: line.substring(1),
          old_line: null,
          new_line: newLineNumber,
          diff_line_in_patch: patchLineNumber,
        });
        newLineNumber++;
      } else if (line.startsWith('-')) {
        // Removed line
        currentHunk.lines.push({
          type: 'removed',
          content: line.substring(1),
          old_line: oldLineNumber,
          new_line: null,
          diff_line_in_patch: patchLineNumber,
        });
        oldLineNumber++;
      } else if (line.startsWith(' ')) {
        // Context line
        currentHunk.lines.push({
          type: 'context',
          content: line.substring(1),
          old_line: oldLineNumber,
          new_line: newLineNumber,
          diff_line_in_patch: patchLineNumber,
        });
        oldLineNumber++;
        newLineNumber++;
      }
      // Skip other lines (file headers within hunks, etc.)
    }
  }
  
  // Add last hunk and file
  if (currentHunk) {
    currentFile?.hunks.push(currentHunk);
  }
  if (currentFile && currentFile.hunks.length > 0) {
    files.set(currentFile.newPath, currentFile);
  }
  
  return files;
}

/**
 * Find correct line numbers for an issue by matching code content
 */
export function findCorrectLineNumbers(
  filePath: string,
  codeContent: string,
  aiProvidedNewLine: number | undefined,
  fileDiffs: Map<string, FileDiff>
): { old_line: number | null; new_line: number; confidence: 'exact' | 'fuzzy' | 'fallback' } {
  const fileDiff = fileDiffs.get(filePath);
  
  if (!fileDiff) {
    console.warn(`No diff found for file: ${filePath}`);
    return { old_line: null, new_line: aiProvidedNewLine || 0, confidence: 'fallback' };
  }
  
  if (!codeContent || codeContent.trim().length === 0) {
    console.warn(`Empty code content for ${filePath}`);
    return { old_line: null, new_line: aiProvidedNewLine || 0, confidence: 'fallback' };
  }
  
  // Normalize code for comparison - preserve structure but normalize whitespace
  const normalizeCode = (code: string) => {
    return code
      .trim()
      .replace(/\s+/g, ' ')   // Collapse all whitespace to single space
      .replace(/\s*([;,\(\)\{\}=])\s*/g, '$1'); // Remove spaces around punctuation
  };
  
  const targetCode = normalizeCode(codeContent);
  
  // Skip if target is too short or too generic
  if (targetCode.length < 5) {
    console.warn(`Code too short: "${targetCode}"`);
    return { old_line: null, new_line: aiProvidedNewLine || 0, confidence: 'fallback' };
  }
  
  // Skip generic lines
  const genericPatterns = ['}', '{', '};', '', 'return;', 'break;', 'continue;'];
  if (genericPatterns.includes(targetCode)) {
    console.warn(`Code too generic: "${targetCode}"`);
    return { old_line: null, new_line: aiProvidedNewLine || 0, confidence: 'fallback' };
  }
  
  let bestMatch: { old_line: number | null; new_line: number; confidence: 'exact' | 'fuzzy' } | null = null;
  let bestMatchScore = 0;
  
  // Search through all hunks
  for (const hunk of fileDiff.hunks) {
    for (const line of hunk.lines) {
      // Skip removed lines (they don't exist in new file)
      if (line.type === 'removed') continue;
      
      const lineCode = normalizeCode(line.content);
      
      // Skip empty lines
      if (lineCode.length < 3) continue;
      
      // Exact match
      if (lineCode === targetCode) {
        return {
          old_line: line.old_line,
          new_line: line.new_line!,
          confidence: 'exact',
        };
      }
      
      // Fuzzy match: Check if codes are similar enough
      // Method 1: Target is a substring of line
      if (targetCode.length >= 15 && lineCode.includes(targetCode)) {
        const score = targetCode.length / lineCode.length;
        if (score > bestMatchScore) {
          bestMatchScore = score;
          bestMatch = {
            old_line: line.old_line,
            new_line: line.new_line!,
            confidence: 'fuzzy',
          };
        }
      }
      
      // Method 2: Line is a substring of target
      if (lineCode.length >= 15 && targetCode.includes(lineCode)) {
        const score = lineCode.length / targetCode.length;
        if (score > bestMatchScore) {
          bestMatchScore = score;
          bestMatch = {
            old_line: line.old_line,
            new_line: line.new_line!,
            confidence: 'fuzzy',
          };
        }
      }
      
      // Method 3: Similarity ratio (Levenshtein-like - count matching chars)
      if (targetCode.length >= 20 && lineCode.length >= 20) {
        let matchingChars = 0;
        const minLen = Math.min(targetCode.length, lineCode.length);
        for (let i = 0; i < minLen; i++) {
          if (targetCode[i] === lineCode[i]) matchingChars++;
        }
        const similarity = matchingChars / Math.max(targetCode.length, lineCode.length);
        if (similarity > 0.6 && similarity > bestMatchScore) {
          bestMatchScore = similarity;
          bestMatch = {
            old_line: line.old_line,
            new_line: line.new_line!,
            confidence: 'fuzzy',
          };
        }
      }
    }
  }
  
  // Return best match if score is good enough
  if (bestMatch && bestMatchScore > 0.4) {
    return bestMatch;
  }
  
  // Fallback: DON'T use AI's line - it's likely wrong (diff_line confused with new_line)
  // Instead, return 0 to indicate we couldn't find it
  console.warn(`Could not find line number for code: ${codeContent.substring(0, 50)}... (best score: ${bestMatchScore})`);
  return { old_line: null, new_line: 0, confidence: 'fallback' };
}

/**
 * Fix line numbers for all issues using parsed diff
 */
export function fixLineNumbersForIssues(
  issues: Array<{
    new_path?: string;
    file?: string;
    new_line?: number;
    line?: number;
    newLineCode?: string;
    [key: string]: any;
  }>,
  diffPatchContent: string
): Array<{ issue: any; old: number | undefined; new: number; confidence: string }> {
  const fileDiffs = parseDiffPatch(diffPatchContent);
  const results: Array<{ issue: any; old: number | undefined; new: number; confidence: string }> = [];
  
  for (const issue of issues) {
    const filePath = issue.new_path || issue.file || '';
    const codeContent = issue.newLineCode || '';
    const aiNewLine = issue.new_line || issue.line;
    
    const corrected = findCorrectLineNumbers(filePath, codeContent, aiNewLine, fileDiffs);
    
    results.push({
      issue,
      old: aiNewLine,
      new: corrected.new_line,
      confidence: corrected.confidence,
    });
    
    // Update issue with corrected values
    issue.new_line = corrected.new_line;
    issue.old_line = corrected.old_line;
  }
  
  return results;
}

