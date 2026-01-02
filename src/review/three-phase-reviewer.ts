/**
 * Three-Phase Hybrid Review Flow
 * 
 * Phase 1: AI finds issues (no line numbers)
 * Phase 2: Node.js calculates line numbers (100% accurate)
 * Phase 3: AI filters duplicates using calculated line numbers
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from '../constants';
import { log } from '../utils/logger';
import { AIReview, InlineComment } from '../types';
import { parseDiffPatch, findCorrectLineNumbers } from '../utils/enhanced-diff-parser';

interface Phase1Issue {
  file: string;
  diff_line: number; // Line number in diff patch (provided by AI)
  codeSnippet: string;
  severity: 'critical' | 'moderate' | 'minor';
  title: string;
  issue: string;
  recommendation: string;
  codeExample?: string;
  effort: string;
  impact: string;
}

interface Phase1Response {
  assessment: any;
  metrics: any[];
  issues: Phase1Issue[];
}

interface Phase3Response {
  filteredIssues: InlineComment[];
  duplicatesRemoved: any[];
  summary: {
    totalNewIssues: number;
    duplicatesFound: number;
    keptIssues: number;
  };
}

/**
 * Execute cursor-agent CLI with a prompt
 */
async function executeCursorAgent(promptText: string, projectRoot: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Write prompt to a temporary file
    const promptPath = path.join(CONFIG.outputDir, 'temp-prompt.txt');
    fs.writeFileSync(promptPath, promptText);
    
    // Use shell command to invoke cursor-agent (same as cursor-agent.ts)
    const command = `cursor-agent -p "$(cat ${promptPath})" --model "sonnet-4.5" --output-format text`;
    
    const cursorProcess = spawn('sh', ['-c', command], {
      cwd: projectRoot,
      env: {
        ...process.env,
        CURSOR_API_KEY: CONFIG.cursorApiKey,
        PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}`,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    cursorProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      stdout += output;
    });

    cursorProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    cursorProcess.on('close', (code) => {
      // Clean up temp file
      try {
        fs.unlinkSync(promptPath);
      } catch (e) {
        // Ignore cleanup errors
      }
      
      if (code !== 0) {
        reject(new Error(`cursor-agent exited with code ${code}: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });

    cursorProcess.on('error', (error) => {
      // Clean up temp file
      try {
        fs.unlinkSync(promptPath);
      } catch (e) {
        // Ignore cleanup errors
      }
      reject(error);
    });

    // Timeout handling
    const timeout = setTimeout(() => {
      cursorProcess.kill('SIGTERM');
      try {
        fs.unlinkSync(promptPath);
      } catch (e) {
        // Ignore cleanup errors
      }
      reject(new Error(`cursor-agent timed out after ${CONFIG.commandTimeout}ms`));
    }, CONFIG.commandTimeout);

    cursorProcess.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

/**
 * Build Phase 1 prompt (find issues without line numbers)
 */
function buildPhase1Prompt(diffContent: string): string {
  const configDir = path.resolve(__dirname, '../../config');
  const phase1Template = fs.readFileSync(
    path.join(configDir, 'prompts/phase1-find-issues.md'),
    'utf-8'
  );
  
  return `${phase1Template}

---

## MERGE REQUEST DIFF

\`\`\`diff
${diffContent}
\`\`\`

---

Analyze the diff above and return your findings in JSON format as specified.
`;
}

/**
 * Build Phase 3 prompt (filter duplicates)
 */
function buildPhase3Prompt(
  issuesWithLineNumbers: InlineComment[],
  existingDiscussions: any[]
): string {
  const configDir = path.resolve(__dirname, '../../config');
  const phase3Template = fs.readFileSync(
    path.join(configDir, 'prompts/phase3-filter-duplicates.md'),
    'utf-8'
  );
  
  return `${phase3Template}

---

## INPUT DATA

### NEW ISSUES (with calculated line numbers):

\`\`\`json
${JSON.stringify({ newIssues: issuesWithLineNumbers }, null, 2)}
\`\`\`

### EXISTING DISCUSSIONS:

\`\`\`json
${JSON.stringify({ existingDiscussions }, null, 2)}
\`\`\`

---

Analyze and filter duplicates. Return your findings in JSON format as specified.
`;
}

/**
 * Parse JSON from AI response (with error recovery)
 */
function parseAIResponse(output: string, phaseName: string): any {
  let jsonStr = output.trim();
  
  // Remove markdown code blocks
  jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  
  // Remove any text before first {
  const firstBrace = jsonStr.indexOf('{');
  if (firstBrace > 0) {
    jsonStr = jsonStr.substring(firstBrace);
  }
  
  // Remove any text after last }
  const lastBrace = jsonStr.lastIndexOf('}');
  if (lastBrace !== -1 && lastBrace < jsonStr.length - 1) {
    jsonStr = jsonStr.substring(0, lastBrace + 1);
  }
  
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    log.error(`Failed to parse ${phaseName} JSON response`);
    log.error(`Error: ${(error as Error).message}`);
    log.error(`Output (first 500 chars): ${output.substring(0, 500)}`);
    throw error;
  }
}

/**
 * Three-phase hybrid review
 */
export async function runThreePhaseReview(
  diffContent: string,
  existingDiscussions: any[],
  projectRoot: string
): Promise<AIReview | null> {
  
  // ========================================
  // PHASE 1: AI FINDS ISSUES
  // ========================================
  
  log.section('🤖 PHASE 1: AI Analyzing Code for Issues');
  log.info('AI will identify issues without calculating line numbers...');
  
  const phase1Prompt = buildPhase1Prompt(diffContent);
  
  // Save Phase 1 prompt for debugging
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'phase1-prompt.txt'),
    phase1Prompt
  );
  
  const phase1Output = await executeCursorAgent(phase1Prompt, projectRoot);
  const phase1Response: Phase1Response = parseAIResponse(phase1Output, 'Phase 1');
  
  log.success(`✅ AI found ${phase1Response.issues.length} potential issues`);
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'phase1-output.json'),
    JSON.stringify(phase1Response, null, 2)
  );
  
  if (phase1Response.issues.length === 0) {
    log.info('No issues found by AI');
    return {
      assessment: phase1Response.assessment,
      metrics: phase1Response.metrics,
      inlineComments: [],
      issueBreakdown: { critical: [], moderate: [], minor: [] },
      nextSteps: [],
      verdict: 'APPROVED',
    };
  }
  
  // ========================================
  // PHASE 2: NODE.JS CALCULATES LINE NUMBERS
  // ========================================
  
  log.section('📐 PHASE 2: Calculating Precise Line Numbers');
  log.info('Using enhanced diff parser to calculate exact line numbers...');
  
  const diffHunks = parseDiffPatch(diffContent);
  log.info(`Parsed ${diffHunks.size} files with changes`);
  
  const issuesWithLineNumbers: InlineComment[] = [];
  let exactMatches = 0;
  let fuzzyMatches = 0;
  let failed = 0;
  
  for (const issue of phase1Response.issues) {
    const position = findCorrectLineNumbers(
      issue.file,
      issue.codeSnippet,
      issue.diff_line, // Use AI-provided diff_line as hint
      diffHunks
    );
    
    if (position.confidence === 'exact') {
      exactMatches++;
    } else if (position.confidence === 'fuzzy') {
      fuzzyMatches++;
    } else {
      failed++;
      log.warning(`Could not calculate line number for: ${issue.file}:${issue.diff_line} - ${issue.title}`);
      continue; // Skip issues we can't locate
    }
    
    issuesWithLineNumbers.push({
      new_path: issue.file,
      file: issue.file,
      diff_line: issue.diff_line, // Preserve for debugging
      new_line: position.new_line,
      old_line: position.old_line,
      newLineCode: issue.codeSnippet,
      severity: issue.severity,
      title: issue.title,
      message: issue.issue,
      recommendation: issue.recommendation,
      codeExample: issue.codeExample,
      effort: issue.effort,
      impact: issue.impact,
      position_type: 'text',
    });
  }
  
  log.success(`✅ Calculated line numbers for ${issuesWithLineNumbers.length} issues`);
  log.info(`  - Exact matches: ${exactMatches}`);
  log.info(`  - Fuzzy matches: ${fuzzyMatches}`);
  log.info(`  - Failed to map: ${failed}`);
  
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'phase2-output.json'),
    JSON.stringify({ issuesWithLineNumbers }, null, 2)
  );
  
  if (issuesWithLineNumbers.length === 0) {
    log.warning('No issues could be mapped to line numbers');
    return {
      assessment: phase1Response.assessment,
      metrics: phase1Response.metrics,
      inlineComments: [],
      issueBreakdown: { critical: [], moderate: [], minor: [] },
      nextSteps: [],
      verdict: 'APPROVED',
    };
  }
  
  // ========================================
  // PHASE 3: AI FILTERS DUPLICATES
  // ========================================
  
  log.section('🔍 PHASE 3: AI Filtering Duplicate Issues');
  log.info(`AI will compare ${issuesWithLineNumbers.length} issues with ${existingDiscussions.length} existing discussions...`);
  
  const phase3Prompt = buildPhase3Prompt(issuesWithLineNumbers, existingDiscussions);
  
  // Save Phase 3 prompt for debugging
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'phase3-prompt.txt'),
    phase3Prompt
  );
  
  const phase3Output = await executeCursorAgent(phase3Prompt, projectRoot);
  const phase3Response: Phase3Response = parseAIResponse(phase3Output, 'Phase 3');
  
  log.success(`✅ Filtered to ${phase3Response.filteredIssues.length} non-duplicate issues`);
  
  if (phase3Response.duplicatesRemoved && phase3Response.duplicatesRemoved.length > 0) {
    log.info(`  Removed ${phase3Response.duplicatesRemoved.length} duplicates:`);
    phase3Response.duplicatesRemoved.slice(0, 5).forEach((d: any) => {
      log.info(`    - ${d.file}:${d.line} - ${d.reason}`);
    });
    if (phase3Response.duplicatesRemoved.length > 5) {
      log.info(`    ... and ${phase3Response.duplicatesRemoved.length - 5} more`);
    }
  }
  
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'phase3-output.json'),
    JSON.stringify(phase3Response, null, 2)
  );
  
  // ========================================
  // FINAL RESULT
  // ========================================
  
  log.info('');
  log.success('Three-phase review complete!');
  log.info(`  Phase 1: ${phase1Response.issues.length} issues found`);
  log.info(`  Phase 2: ${issuesWithLineNumbers.length} issues mapped to line numbers`);
  log.info(`  Phase 3: ${phase3Response.filteredIssues.length} non-duplicate issues`);
  
  // Build issue breakdown (convert to string arrays)
  const criticalIssues = phase3Response.filteredIssues.filter(i => i.severity === 'critical');
  const moderateIssues = phase3Response.filteredIssues.filter(i => i.severity === 'moderate');
  const minorIssues = phase3Response.filteredIssues.filter(i => i.severity === 'minor');
  
  const issueBreakdown = {
    critical: criticalIssues.map(i => i.title),
    moderate: moderateIssues.map(i => i.title),
    minor: minorIssues.map(i => i.title),
  };
  
  return {
    assessment: phase1Response.assessment,
    metrics: phase1Response.metrics,
    inlineComments: phase3Response.filteredIssues,
    issueBreakdown,
    nextSteps: [],
    verdict: criticalIssues.length > 0 ? 'CHANGES REQUESTED' : 'APPROVE WITH MINOR CHANGES',
  };
}

