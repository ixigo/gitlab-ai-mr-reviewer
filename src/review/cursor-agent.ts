/**
 * Cursor-agent CLI integration for AI code review
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from '../constants';
import { log } from '../utils/logger';
import { getMRDiff } from '../api/gitlab';
import { parseMarkdownReview } from './parser';
import { transformCursorAgentOutput } from './transformer';
import { MRData, AIReview, ReviewData, InlineComment } from '../types';
import { fetchAndStoreExistingDiscussions, loadExistingDiscussions, isSimilarCommentExists } from '../services/discussion-manager';
import { calculateLinePositionsForIssues } from '../utils/diff-line-calculator';

interface ReviewIssue {
  // New format fields from AI
  position_type?: string;
  new_path?: string;
  diff_line?: number;
  new_line?: number;
  
  // Legacy fields (for backward compatibility)
  file?: string;
  line?: number;
  startLineCodeOfChangedFileForSuggestion?: string;
  startLineNumberOfChangedFileForSuggestion?: number;
  
  // Common fields
  severity?: string;
  title?: string;
  issue?: string;
  message?: string;
  recommendation?: string;
  codeExample?: string;
  effort?: string;
  impact?: string;
  priority?: string;
}

interface RawReviewData {
  assessment?: any;
  metrics?: any[];
  issues?: ReviewIssue[];
  issueBreakdown?: any;
  nextSteps?: any[];
  verdict?: string;
}

interface SpawnResult {
  stdout: string;
  stderr: string;
}

/**
 * Load a prompt template from file and substitute variables
 * @param templatePath Path to the template file
 * @param variables Object with key-value pairs to substitute
 * @returns The template with variables substituted
 */
function loadPromptTemplate(templatePath: string, variables: Record<string, string>): string {
  try {
    let template = fs.readFileSync(templatePath, 'utf-8');
    
    // Substitute variables using {{variableName}} syntax
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      template = template.replace(regex, value);
    }
    
    return template;
  } catch (error) {
    log.error(`Failed to load prompt template from ${templatePath}: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Fix incomplete JSON review data by filling in missing required fields
 */
function fixIncompleteJSON(reviewData: RawReviewData): RawReviewData {
  log.info('Fixing incomplete JSON data...');

  // Ensure assessment exists (no grade/score - will be calculated later)
  if (!reviewData.assessment) {
    reviewData.assessment = {
      summary: 'Review data incomplete',
      strengths: [],
      weaknesses: [],
      recommendations: [],
    };
  }

  // Ensure metrics exists
  if (!reviewData.metrics || reviewData.metrics.length === 0) {
    reviewData.metrics = [
      { category: 'Critical Issues', count: 0, threshold: 5, status: 'Pass' },
      { category: 'Moderate Issues', count: 0, threshold: 10, status: 'Pass' },
      { category: 'Minor Issues', count: 0, threshold: 15, status: 'Pass' },
      { category: 'Test Coverage Issues', count: 0, threshold: null, status: null },
      { category: 'Type Safety Issues', count: 0, threshold: null, status: null },
      { category: 'Console Statements', count: 0, threshold: null, status: null },
      { category: 'Security Issues', count: 0, threshold: null, status: null },
    ];
  }

  // Ensure issues array exists
  if (!reviewData.issues) {
    reviewData.issues = [];
  }

  // Remove incomplete issues (check last few issues)
  if (reviewData.issues.length > 0) {
    // Check last 3 issues for incompleteness (truncation can affect multiple)
    const issuesToCheck = Math.min(3, reviewData.issues.length);
    for (let i = 0; i < issuesToCheck; i++) {
      const lastIssue = reviewData.issues[reviewData.issues.length - 1];
      if (!lastIssue) break;

      // Check if issue is incomplete
      const isIncomplete =
        !lastIssue.recommendation ||
        lastIssue.recommendation.length < 10 ||
        !lastIssue.effort ||
        !lastIssue.impact ||
        !lastIssue.priority ||
        !lastIssue.codeExample ||
        lastIssue.codeExample.length < 10 ||
        lastIssue.issue?.endsWith('...') ||
        lastIssue.recommendation?.endsWith('...') ||
        lastIssue.codeExample?.endsWith('...') ||
        // Check for truncated in common places
        lastIssue.codeExample?.includes('"<') || // Truncated JSX
        lastIssue.codeExample?.match(/[^;\s]\s*$/); // Ends without proper closure

      if (isIncomplete) {
        log.warning(`Removing incomplete issue #${reviewData.issues.length}: ${lastIssue.title || 'unknown'}`);
        reviewData.issues.pop();
      } else {
        break; // Stop checking if we found a complete issue
      }
    }
  }

  // Ensure issueBreakdown exists
  if (!reviewData.issueBreakdown) {
    reviewData.issueBreakdown = {
      critical: reviewData.issues.filter(i => i.severity === 'critical').map(i => i.title),
      moderate: reviewData.issues.filter(i => i.severity === 'moderate').map(i => i.title),
      minor: reviewData.issues.filter(i => i.severity === 'minor').map(i => i.title),
    };
  }

  // Ensure nextSteps exists
  if (!reviewData.nextSteps) {
    reviewData.nextSteps = [
      {
        title: 'Review inline comments',
        description: 'Address issues identified in the review',
        effort: '1 hour',
      },
    ];
  }

  // Ensure verdict exists
  if (!reviewData.verdict) {
    const criticalCount = reviewData.issues.filter(i => i.severity === 'critical').length;
    reviewData.verdict = criticalCount > 0 ? 'REQUEST CHANGES' : 'APPROVE WITH MINOR CHANGES';
  }

  log.success('Fixed incomplete JSON data');
  return reviewData;
}

/**
 * Run cursor-agent CLI tool for AI code review on MR diff
 */
export async function runCursorAgentReview(_changedFiles: string[], mrData: MRData, projectRoot: string = process.cwd()): Promise<AIReview | null> {
  log.info('Running cursor-agent CLI for MR diff review...');

  if (!CONFIG.cursorApiKey) {
    log.warning('CURSOR_API_KEY not set - skipping AI review');
    return null;
  }

  try {
    // Setup cursor-agent config (copies cli.json and rules to .cursor/)
    const { setupCursorConfig } = require('../services/config-setup');
    setupCursorConfig(projectRoot);

    // Step 1: Fetch and store existing discussions BEFORE running AI review
    log.info('📋 Step 1: Fetching existing MR discussions...');
    const existingDiscussionsPath = await fetchAndStoreExistingDiscussions(
      CONFIG.mrIid,
      CONFIG.outputDir
    );
    const existingDiscussions = loadExistingDiscussions(existingDiscussionsPath);
    log.success(`✓ Loaded ${existingDiscussions?.comments.length || 0} existing comments`);

    // Get the MR diff instead of full files
    const diffData = await getMRDiff();

    if (!diffData) {
      log.error('No diff data available for review');
      process.exit(1);
    }

    log.info(`Reviewing MR diff with ${diffData.fileCount} changed files`);

    // Save diff to file
    const diffPath = path.join(CONFIG.outputDir, 'mr-diff.patch');
    fs.writeFileSync(diffPath, diffData.diffContent);

    // Load the prompt template from config/prompts/code-review.md
    const promptTemplatePath = path.join(projectRoot, 'config', 'prompts', 'code-review.md');
    const jsonPrompt = loadPromptTemplate(promptTemplatePath, {
      diffPath: diffPath,
      existingDiscussionsPath: existingDiscussionsPath,
    });
    log.info(`Loaded prompt template from ${promptTemplatePath}`);

    // Save the prompt to a file for cursor-agent
    const promptPath = path.join(CONFIG.outputDir, 'review-prompt.txt');
    fs.writeFileSync(promptPath, jsonPrompt);

    // Run cursor-agent with JSON request
    // Note: Using 'text' format because 'json' wraps output in a result object
    const command = `cursor-agent -p "$(cat ${promptPath})" --model "sonnet-4.5" --output-format text`;

    log.info(`Executing: cursor-agent with JSON format request`);
    log.info(`Working directory: ${projectRoot}`);
    log.info(`Cursor API key present: ${!!CONFIG.cursorApiKey}`);

    // Use spawn with stdin ignored to prevent cursor-agent from hanging
    const result = await new Promise<SpawnResult>((resolve, reject) => {
      const child: ChildProcess = spawn('sh', ['-c', command], {
        cwd: projectRoot, // Run from project root where .cursor/ is
        env: {
          ...process.env,
          CURSOR_API_KEY: CONFIG.cursorApiKey,
          PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}`,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;
        log.info(`[cursor-agent stdout]: ${chunk.substring(0, 200)}...`);
      });

      child.stderr?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stderr += chunk;
        log.warning(`[cursor-agent stderr]: ${chunk}`);
      });

      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${CONFIG.commandTimeout}ms`));
      }, CONFIG.commandTimeout);

      child.on('close', (code: number | null) => {
        clearTimeout(timeout);
        log.info(`cursor-agent process closed with code: ${code}`);
        log.info(`stdout length: ${stdout.length}, stderr length: ${stderr.length}`);

        if (code === 0 || code === null) {
          resolve({ stdout, stderr });
        } else {
          log.error(`cursor-agent failed with exit code ${code}`);
          log.error(`Full stderr output: ${stderr}`);
          log.error(`Full stdout output: ${stdout.substring(0, 500)}`);
          reject(new Error(`Command failed with exit code ${code}: ${stderr}`));
        }
      });

      child.on('error', (err: Error) => {
        clearTimeout(timeout);
        log.error(`cursor-agent process error: ${err.message}`);
        reject(err);
      });
    });

    const { stdout, stderr } = result;

    log.info(`=== CURSOR-AGENT EXECUTION COMPLETE ===`);
    log.info(`stdout length: ${stdout.length} bytes`);
    log.info(`stderr length: ${stderr.length} bytes`);

    if (stderr) {
      log.warning(`cursor-agent stderr output: ${stderr}`);
    }

    if (!stdout || stdout.trim().length === 0) {
      log.error('cursor-agent did not produce any output (empty stdout)');
      log.error('This could mean:');
      log.error('  1. cursor-agent is not installed or not in PATH');
      log.error('  2. CURSOR_API_KEY is invalid');
      log.error('  3. The diff file is in wrong format');
      log.error('  4. cursor-agent encountered an error');
      process.exit(1);
    }

    log.success(`cursor-agent produced output: ${stdout.length} bytes`);

    // Try to parse as JSON first
    let reviewData: RawReviewData;
    try {
      log.info('Attempting to parse output as JSON...');
      let cleanOutput = stdout.trim();

      // Check if it's wrapped in cursor-agent result format
      if (cleanOutput.startsWith('{"type":"result"')) {
        log.info('Detected cursor-agent wrapped format, extracting result field...');
        try {
          const wrapperObj = JSON.parse(cleanOutput);
          if (wrapperObj.result) {
            cleanOutput = wrapperObj.result;
            log.info('Extracted result field from wrapper');
          }
        } catch (wrapperError) {
          log.warning('Failed to parse wrapper, continuing with original output');
        }
      }

      // Remove markdown code blocks if present
      if (cleanOutput.includes('```json')) {
        log.info('Removing markdown code blocks...');
        // Extract content between ```json and ```
        const jsonMatch = cleanOutput.match(/```json\s*\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          cleanOutput = jsonMatch[1];
        } else {
          // Fallback: remove just the markers
          cleanOutput = cleanOutput.replace(/```json\s*\n?/g, '').replace(/\n?```/g, '');
        }
      } else if (cleanOutput.startsWith('```')) {
        cleanOutput = cleanOutput.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
      }

      // Remove any text before the first {
      const firstBrace = cleanOutput.indexOf('{');
      if (firstBrace > 0) {
        log.info(`Removing ${firstBrace} chars of preamble text before JSON...`);
        cleanOutput = cleanOutput.substring(firstBrace);
      }
      
      // Remove any text after the last }
      const lastBrace = cleanOutput.lastIndexOf('}');
      if (lastBrace > 0 && lastBrace < cleanOutput.length - 1) {
        log.info('Removing text after JSON...');
        cleanOutput = cleanOutput.substring(0, lastBrace + 1);
      }

      // Try to fix truncated JSON by finding the last complete object
      if (!cleanOutput.endsWith('}')) {
        log.warning('JSON appears truncated, attempting to fix...');

        // Strategy 1: Find the last complete issue object (ends with },\n)
        // This pattern indicates a complete issue followed by a comma
        const lastCompleteIssuePattern = /\},\s*\n\s*\{/g;
        let lastCompleteIssuePos = -1;
        let match;

        while ((match = lastCompleteIssuePattern.exec(cleanOutput)) !== null) {
          lastCompleteIssuePos = match.index + 1; // Position after the },
        }

        if (lastCompleteIssuePos > 0) {
          log.info(`Found last complete issue at position ${lastCompleteIssuePos}`);
          // Truncate to after the last complete issue
          cleanOutput = cleanOutput.substring(0, lastCompleteIssuePos);
          // Close the issues array and add minimal structure
          cleanOutput += '\n  ],\n  "issueBreakdown": {},\n  "nextSteps": [],\n  "verdict": ""\n}';
          log.info('Rebuilt JSON structure after last complete issue');
        } else {
          // Strategy 2: Look for last complete object in issues array
          // Pattern: "priority": "High"\n    }
          const priorityPattern = /"priority":\s*"(High|Medium|Low)"\s*\}/g;
          let lastPriorityPos = -1;

          while ((match = priorityPattern.exec(cleanOutput)) !== null) {
            lastPriorityPos = match.index + match[0].length;
          }

          if (lastPriorityPos > 0) {
            log.info(`Found last complete issue via priority field at position ${lastPriorityPos}`);
            cleanOutput = cleanOutput.substring(0, lastPriorityPos);
            // Add array closing and minimal structure
            cleanOutput += '\n  ],\n  "issueBreakdown": {},\n  "nextSteps": [],\n  "verdict": ""\n}';
            log.info('Rebuilt JSON structure after last complete issue (via priority)');
          } else {
            // Strategy 3: Generic fallback - find last }
            const lastCompleteBrace = cleanOutput.lastIndexOf('}');
            if (lastCompleteBrace > 0) {
              cleanOutput = cleanOutput.substring(0, lastCompleteBrace + 1);
              log.info('Truncated JSON to last complete brace (fallback)');
            }
          }
        }
      }

      try {
        reviewData = JSON.parse(cleanOutput);
        log.success('Successfully parsed JSON output from cursor-agent');
      } catch (parseError) {
        // Try to fix common JSON issues
        log.warning(`JSON parse failed at position, attempting fixes...`);
        
        // Replace unescaped quotes in strings (common issue)
        let fixedOutput = cleanOutput
          .replace(/([^\\])"/g, (match, p1, offset) => {
            // Check if this quote is inside a string value
            const beforeQuote = cleanOutput.substring(0, offset + 1);
            const openQuotes = (beforeQuote.match(/:\s*"/g) || []).length;
            const closeQuotes = (beforeQuote.match(/",/g) || []).length;
            
            // If we have more opens than closes, this is likely an unescaped quote
            if (openQuotes > closeQuotes && p1 !== ':' && p1 !== '[' && p1 !== '{') {
              return p1 + '\\"';
            }
            return match;
          });
        
        try {
          reviewData = JSON.parse(fixedOutput);
          log.success('✓ Fixed and parsed JSON successfully');
        } catch (secondError) {
          // If still failing, throw the original error
          throw parseError;
        }
      }

      // Validate JSON completeness
      let isIncomplete = false;
      if (!reviewData.verdict) {
        log.warning('JSON appears incomplete - missing verdict field (likely truncated)');
        isIncomplete = true;
      }
      if (!reviewData.nextSteps || reviewData.nextSteps.length === 0) {
        log.warning('JSON appears incomplete - missing or empty nextSteps (likely truncated)');
        isIncomplete = true;
      }
      if (!reviewData.issueBreakdown) {
        log.warning('JSON appears incomplete - missing issueBreakdown (likely truncated)');
        isIncomplete = true;
      }

      // Check if last issue seems incomplete
      if (reviewData.issues && reviewData.issues.length > 0) {
        const lastIssue = reviewData.issues[reviewData.issues.length - 1];
        if (!lastIssue.recommendation || lastIssue.recommendation.length < 10) {
          log.warning('Last issue appears incomplete - recommendation is missing or truncated');
          isIncomplete = true;
        }
      }

      // Validate issue counts match metrics
      if (reviewData.metrics && reviewData.issues) {
        const totalMetricCount = reviewData.metrics.reduce((sum, m) => sum + (m.count || 0), 0);
        const actualIssueCount = reviewData.issues.length;

        if (totalMetricCount !== actualIssueCount) {
          log.warning(`⚠️  MISMATCH: Metrics report ${totalMetricCount} total issues but issues array has ${actualIssueCount} entries`);
          log.warning('   This means the AI did not provide detailed issues for all counted problems');
          log.warning('   Consider re-running the review or manually checking the diff');

          // Log breakdown
          const criticalCount = reviewData.issues.filter(i => i.severity === 'critical').length;
          const moderateCount = reviewData.issues.filter(i => i.severity === 'moderate').length;
          const minorCount = reviewData.issues.filter(i => i.severity === 'minor').length;

          const criticalMetric = reviewData.metrics.find(m => m.category === 'Critical Issues');
          const moderateMetric = reviewData.metrics.find(m => m.category === 'Moderate Issues');
          const minorMetric = reviewData.metrics.find(m => m.category === 'Minor Issues');

          log.info(`   Metrics: ${criticalMetric?.count || 0} critical, ${moderateMetric?.count || 0} moderate, ${minorMetric?.count || 0} minor`);
          log.info(`   Issues array: ${criticalCount} critical, ${moderateCount} moderate, ${minorCount} minor`);
        } else {
          log.success(`✓ Issue counts match: ${totalMetricCount} total issues with detailed entries`);
        }
      }

      // Fix incomplete JSON
      if (isIncomplete) {
        reviewData = fixIncompleteJSON(reviewData);
      }

      // Save the JSON output
      const jsonOutputPath = path.join(CONFIG.outputDir, 'cursor-agent-output.json');
      fs.writeFileSync(jsonOutputPath, JSON.stringify(reviewData, null, 2));
      log.success(`Saved JSON output to ${jsonOutputPath}`);

    } catch (jsonError) {
      log.warning('Failed to parse as JSON, falling back to markdown parsing...');
      log.info(`JSON parse error: ${(jsonError as Error).message}`);

      // Save as markdown for debugging
      const markdownPath = path.join(CONFIG.outputDir, 'cursor-agent-output.md');
      fs.writeFileSync(markdownPath, stdout);
      log.info(`Saved markdown output to ${markdownPath}`);

      // Parse markdown and extract JSON data
      try {
        const parsedReview = parseMarkdownReview(stdout);
        log.success(`Successfully parsed markdown with ${parsedReview.inlineComments.length} issues`);
        reviewData = parsedReview as any;
      } catch (parseError) {
        log.error(`Failed to parse markdown output: ${(parseError as Error).message}`);
        log.error(`Parse error stack: ${(parseError as Error).stack}`);
        log.error(`First 500 chars of output: ${stdout.substring(0, 500)}`);
        process.exit(1);
      }
    }

    // Validate required fields in reviewData
    const requiredFields = [
      'assessment',
      'metrics',
      'issues',
    ];
    const missingFields = requiredFields.filter(
      (field) => !Object.prototype.hasOwnProperty.call(reviewData, field)
    );

    if (missingFields.length > 0) {
      log.error(
        `Missing required fields in parsed output: ${missingFields.join(', ')}`
      );
      process.exit(1);
    }

    if (!reviewData.assessment) {
      log.error('Invalid assessment structure - missing assessment');
      process.exit(1);
    }

    log.success(
      `Validated review data with ${reviewData.issues?.length || 0} issues`
    );

    // Step 2: Process line positions from AI response and calculate old_line from diff hunks
    log.info('📐 Step 2: Processing line positions (new_line and old_line)...');
    const issuesForCalculation = (reviewData.issues || []).map((issue: ReviewIssue) => {
      // Handle new format (position_type, new_path, diff_line, new_line)
      // PRIORITY: new_line > line > diff_line (new_line is the actual line in new file)
      const filePath = issue.new_path || issue.file || '';
      const providedNewLine = issue.new_line || issue.line || issue.diff_line || 0;
      const diffLine = issue.diff_line;
      
      return {
        ...issue,
        new_path: filePath,
        file: filePath, // Keep for backward compatibility
        line: providedNewLine, // Use new_line as the primary line number
        new_line: providedNewLine, // Use AI-provided new_line if available
        diff_line: diffLine,
        old_line: null, // Will be calculated from diff
        severity: (issue.severity || 'minor') as 'critical' | 'moderate' | 'minor',
        title: issue.title || '',
        message: issue.issue || '',
        recommendation: issue.recommendation || '',
        effort: issue.effort || '',
        impact: issue.impact || '',
      } as InlineComment;
    });
    
    // Calculate both new_line and old_line from diff hunks for GitLab API
    log.info(`Calculating line positions (old_line and new_line) for ${issuesForCalculation.length} issues...`);
    calculateLinePositionsForIssues(issuesForCalculation, diffData.changes);
    log.success('✓ Calculated line positions for all issues');
    
    // Update reviewData.issues with processed/calculated values
    reviewData.issues = issuesForCalculation.map((issue, index) => ({
      ...reviewData.issues![index],
      new_line: issue.new_line,
      old_line: issue.old_line,
      file: issue.file,
      line: issue.line,
    }));

    // Step 3: Filter out duplicate issues that already exist in discussions
    log.info('🔍 Step 3: Filtering duplicate issues...');
    const originalIssueCount = reviewData.issues?.length || 0;
    if (existingDiscussions && reviewData.issues) {
      reviewData.issues = reviewData.issues.filter((issue: ReviewIssue) => {
        const filePath = issue.new_path || issue.file || '';
        const lineNumber = issue.new_line || issue.line || 0;
        
        const isDuplicate = isSimilarCommentExists(
          filePath,
          lineNumber,
          issue.issue || '',
          existingDiscussions.comments,
          3 // line tolerance
        );
        
        if (isDuplicate) {
          log.info(`  ⏭️  Skipping duplicate issue at ${filePath}:${lineNumber} - "${issue.title}"`);
        }
        
        return !isDuplicate;
      });
    }
    
    const filteredCount = reviewData.issues?.length || 0;
    if (originalIssueCount !== filteredCount) {
      log.success(`✓ Filtered out ${originalIssueCount - filteredCount} duplicate issues`);
      log.info(`  Remaining issues to post: ${filteredCount}`);
    } else {
      log.info(`  No duplicate issues found`);
    }

    // Count issues by severity
    const issueCount = {
      critical: reviewData.issues?.filter(i => i.severity === 'critical').length || 0,
      moderate: reviewData.issues?.filter(i => i.severity === 'moderate').length || 0,
      minor: reviewData.issues?.filter(i => i.severity === 'minor').length || 0,
    };

    // Extract specialized issue counts from metrics or issues
    const testCoverageCount = reviewData.metrics?.find(m => m.category === 'Test Coverage Issues')?.count || 0;
    const typeSafetyCount = reviewData.metrics?.find(m => m.category === 'Type Safety Issues')?.count || 0;
    const consoleStatementsCount = reviewData.metrics?.find(m => m.category === 'Console Statements')?.count || 0;
    const securityCount = reviewData.metrics?.find(m => m.category === 'Security Issues')?.count || 0;

    // Create complete review JSON with MR overview (grade/score will be calculated later)
    const reviewJSON: ReviewData = {
      mrOverview: {
        iid: CONFIG.mrIid,
        title: mrData.title,
        author: mrData.author,
        baseSha: mrData.baseSha,
        headSha: mrData.headSha,
        reviewTimestamp: new Date().toISOString(),
      },
      summary: reviewData.assessment.summary || '',
      grade: 'PENDING', // Will be calculated after AI review
      score: 0, // Will be calculated after AI review
      metrics: reviewData.metrics || [],
      issues: (reviewData.issues || []).map((issue: ReviewIssue) => ({
        ...issue,
        file: issue.new_path || issue.file || '',
        line: issue.line || issue.diff_line || 0,
        new_line: issue.new_line,
        severity: (issue.severity || 'minor') as 'critical' | 'moderate' | 'minor',
        title: issue.title || '',
        message: issue.issue || '',
        recommendation: issue.recommendation || '',
        effort: issue.effort || '',
        impact: issue.impact || '',
      } as InlineComment)),
      issueBreakdown: reviewData.issueBreakdown || {
        critical: reviewData.issues?.filter(i => i.severity === 'critical').map(i => i.title || '') || [],
        moderate: reviewData.issues?.filter(i => i.severity === 'moderate').map(i => i.title || '') || [],
        minor: reviewData.issues?.filter(i => i.severity === 'minor').map(i => i.title || '') || [],
      },
      nextSteps: reviewData.nextSteps || [],
      verdict: reviewData.verdict || 'REVIEW REQUIRED',
      assessment: reviewData.assessment,
      executionStats: {
        issueCount: {
          critical: issueCount.critical,
          moderate: issueCount.moderate,
          minor: issueCount.minor,
          testCoverage: testCoverageCount,
          typeSafety: typeSafetyCount,
          consoleStatements: consoleStatementsCount,
          security: securityCount,
          documentation: 0,
          performance: 0,
          accessibility: 0,
        },
        comments: {
          total: 0,
          posted: 0,
          failed: 0,
        },
        completedAt: null,
      },
    };

    // Save extracted JSON to file
    const jsonPath = path.join(CONFIG.outputDir, 'review-data.json');
    fs.writeFileSync(jsonPath, JSON.stringify(reviewJSON, null, 2));
    log.success(`Saved extracted JSON to ${jsonPath}`);

    // Log summary
    log.info(`Review Summary (Grade/Score will be calculated later):`);
    log.info(
      `  - Issues: ${reviewJSON.issues.length} (will be used for inline comments)`
    );
    log.info(`  - Metrics: ${reviewJSON.metrics.length} categories`);
    log.info(`  - Next Steps: ${reviewJSON.nextSteps.length}`);
    log.info(`  - Verdict: ${reviewJSON.verdict || 'N/A'}`);

    log.success('AI review complete - ready for grading and MR comment posting');
    console.log('');

    // Transform to format expected by rest of the script
    const transformed = transformCursorAgentOutput(
      reviewData as any,
      diffData.changes
    );
    (transformed as any)._reviewJsonPath = jsonPath;
    return transformed;
  } catch (error) {
    const err = error as any;
    if (err.killed) {
      log.error(
        `cursor-agent timed out after ${err.timeout || CONFIG.commandTimeout}ms`
      );
    } else if (err.code === 'ETIMEDOUT') {
      log.error('cursor-agent command timed out');
    } else {
      log.error(`cursor-agent review failed: ${err.message}`);
      log.error(`Error details: ${err.stack}`);
    }
    process.exit(1);
  }
}

