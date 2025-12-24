/**
 * Utility to calculate correct line numbers from diff hunks
 * 
 * Algorithm:
 * FOR each hunk in diff:
 *   READ hunk header `@@ -a,b +c,d @@`
 *   SET start_line = c  // start line in the new file
 *   
 *   FOR each line in hunk starting from hunk header:
 *     IF line is not removed (don't count `-` lines):
 *       INCREMENT line counter
 *       IF line contains "target_code":
 *         RETURN start_line + line counter - 1
 */

import { InlineComment, GitLabChange } from '../types';
import { log } from './logger';

interface HunkInfo {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  header: string;
  lines: string[];
}

/**
 * Parse diff hunks from a diff string
 */
function parseDiffHunks(diff: string): HunkInfo[] {
  const hunks: HunkInfo[] = [];
  const lines = diff.split('\n');
  
  let currentHunk: HunkInfo | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Match hunk header: @@ -a,b +c,d @@
    const hunkMatch = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
    
    if (hunkMatch) {
      // Save previous hunk if exists
      if (currentHunk) {
        hunks.push(currentHunk);
      }
      
      // Start new hunk
      currentHunk = {
        oldStart: parseInt(hunkMatch[1], 10),
        oldCount: parseInt(hunkMatch[2] || '1', 10),
        newStart: parseInt(hunkMatch[3], 10),
        newCount: parseInt(hunkMatch[4] || '1', 10),
        header: line,
        lines: [],
      };
    } else if (currentHunk && (line.startsWith('+') || line.startsWith('-') || line.startsWith(' '))) {
      // Add line to current hunk
      currentHunk.lines.push(line);
    }
  }
  
  // Save last hunk
  if (currentHunk) {
    hunks.push(currentHunk);
  }
  
  return hunks;
}


/**
 * Result of line number calculation including old_line for GitLab API
 */
export interface LinePosition {
  new_line: number;
  old_line: number | null; // null for newly added lines
}

/**
 * Calculate both new_line and old_line for GitLab API from diff
 * 
 * @param issue - The inline comment/issue
 * @param fileDiff - The diff for the specific file
 * @returns The calculated line positions
 */
export function calculateLinePosition(issue: InlineComment, fileDiff: string): LinePosition {
  const hunks = parseDiffHunks(fileDiff);
  
  if (hunks.length === 0) {
    log.warning(`No hunks found in diff for ${issue.new_path || issue.file}`);
    const fallbackLine = issue.new_line || issue.line || 0;
    return { new_line: fallbackLine, old_line: null };
  }
  
  // Try to use new_line first (AI-provided), fallback to line
  const targetLineNumber = issue.new_line || issue.line || 0;
  
  // Find the line in hunks and determine if it's added, removed, or context
  for (const hunk of hunks) {
    const hunkEndLine = hunk.newStart + hunk.newCount - 1;
    
    if (targetLineNumber >= hunk.newStart && targetLineNumber <= hunkEndLine) {
      let currentNewLine = hunk.newStart;
      let currentOldLine = hunk.oldStart;
      
      for (const line of hunk.lines) {
        // Track both old and new line numbers
        if (line.startsWith('-')) {
          // Removed line - only increment old
          currentOldLine++;
        } else if (line.startsWith('+')) {
          // Added line - only increment new
          if (currentNewLine === targetLineNumber) {
            log.info(`✓ Found added line at new_line ${currentNewLine} for ${issue.new_path || issue.file}`);
            return { new_line: currentNewLine, old_line: null }; // null for added lines
          }
          currentNewLine++;
        } else {
          // Context line - increment both
          if (currentNewLine === targetLineNumber) {
            log.info(`✓ Found context line at new_line ${currentNewLine}, old_line ${currentOldLine} for ${issue.new_path || issue.file}`);
            return { new_line: currentNewLine, old_line: currentOldLine };
          }
          currentNewLine++;
          currentOldLine++;
        }
      }
    }
  }
  
  // Fallback: assume it's an added line
  log.warning(`Could not calculate position for ${issue.new_path || issue.file}:${targetLineNumber}, using fallback`);
  return { new_line: targetLineNumber, old_line: null };
}

/**
 * Calculate new_line for an issue from the diff (backward compatibility)
 * 
 * @param issue - The inline comment/issue
 * @param fileDiff - The diff for the specific file
 * @returns The calculated new_line number
 */
export function calculateNewLine(issue: InlineComment, fileDiff: string): number {
  const position = calculateLinePosition(issue, fileDiff);
  return position.new_line;
}

/**
 * Calculate line positions (new_line and old_line) for all issues in the review
 * 
 * @param issues - Array of inline comments
 * @param diffChanges - Array of GitLab changes with diffs
 */
export function calculateLinePositionsForIssues(
  issues: InlineComment[],
  diffChanges: GitLabChange[]
): void {
  log.info(`Calculating line positions for ${issues.length} issues`);
  
  // Create a map of file paths to diffs for quick lookup
  const diffMap = new Map<string, string>();
  for (const change of diffChanges) {
    diffMap.set(change.new_path, change.diff);
  }
  
  for (const issue of issues) {
    const filePath = issue.new_path || issue.file || '';
    const fileDiff = diffMap.get(filePath);
    
    if (!fileDiff) {
      log.warning(`No diff found for ${filePath}, using original line number`);
      issue.new_line = issue.new_line || issue.line || 0;
      issue.old_line = null; // Assume added line if no diff found
      continue;
    }
    
    const position = calculateLinePosition(issue, fileDiff);
    issue.new_line = position.new_line;
    issue.old_line = position.old_line;
  }
  
  log.success(`✓ Calculated line positions for all issues`);
}

/**
 * Calculate new_line for all issues in the review (backward compatibility)
 * 
 * @param issues - Array of inline comments
 * @param diffChanges - Array of GitLab changes with diffs
 */
export function calculateNewLinesForIssues(
  issues: InlineComment[],
  diffChanges: GitLabChange[]
): void {
  calculateLinePositionsForIssues(issues, diffChanges);
}

