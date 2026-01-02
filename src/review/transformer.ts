/**
 * Transform cursor-agent output to expected format
 */

import { SEVERITY_MAP, EFFORT_MAP, GRADE_MAP } from '../constants';
import { InlineComment, AIReview, GitLabChange } from '../types';

interface CursorAgentIssue {
  file?: string;
  path?: string;
  line?: number;
  lineNumber?: number;
  startLineCodeOfChangedFileForSuggestion?: string;
  startLineNumberOfChangedFileForSuggestion?: number;
  severity?: string;
  level?: string;
  title?: string;
  message?: string;
  description?: string;
  issue?: string;
  recommendation?: string;
  suggestion?: string;
  fix?: string;
  codeExample?: string;
  effort?: string;
  impact?: string;
  priority?: string;
}

interface CursorAgentOutput {
  issues?: CursorAgentIssue[];
  findings?: CursorAgentIssue[];
  inlineComments?: InlineComment[];
  assessment?: any;
  metrics?: any[];
  issueBreakdown?: any;
  nextSteps?: any[];
  verdict?: string | null;
  rawOutput?: string;
}

/**
 * Transform cursor-agent output to our expected format
 */
export function transformCursorAgentOutput(cursorOutput: CursorAgentOutput, _diffChanges: GitLabChange[] = []): AIReview {
  // Handle new JSON format with issues array
  if (cursorOutput.issues && cursorOutput.assessment) {
    const inlineComments: InlineComment[] = cursorOutput.issues.map((issue) => ({
      file: issue.file || issue.path || '',
      line: issue.line || issue.lineNumber || 1,
      startLineCodeOfChangedFileForSuggestion: issue.startLineCodeOfChangedFileForSuggestion || '',
      startLineNumberOfChangedFileForSuggestion: issue.startLineNumberOfChangedFileForSuggestion || issue.line || issue.lineNumber || 1,
      severity: (issue.severity || 'moderate') as 'critical' | 'moderate' | 'minor',
      title: issue.title || 'Code Issue',
      message: issue.issue || issue.message || issue.description || '',
      recommendation: issue.recommendation || issue.suggestion || issue.fix || '',
      codeExample: issue.codeExample || '',
      effort: issue.effort || estimateEffort(issue.severity),
      impact: issue.impact || 'Code quality improvement',
      priority: issue.priority || 'Medium',
    }));

    return {
      inlineComments,
      metrics: cursorOutput.metrics || [],
      issueBreakdown: cursorOutput.issueBreakdown || {
        critical: inlineComments.filter(c => c.severity === 'critical').map(c => c.title),
        moderate: inlineComments.filter(c => c.severity === 'moderate').map(c => c.title),
        minor: inlineComments.filter(c => c.severity === 'minor').map(c => c.title),
      },
      nextSteps: cursorOutput.nextSteps || [],
      verdict: cursorOutput.verdict || null,
      assessment: cursorOutput.assessment,
    };
  }

  // Legacy format: inlineComments already present
  if (cursorOutput.inlineComments && cursorOutput.assessment) {
    return {
      inlineComments: cursorOutput.inlineComments,
      metrics: cursorOutput.metrics || [],
      issueBreakdown: cursorOutput.issueBreakdown || {
        critical: [],
        moderate: [],
        minor: [],
      },
      nextSteps: cursorOutput.nextSteps || [],
      verdict: cursorOutput.verdict || null,
      assessment: cursorOutput.assessment,
    };
  }

  // Legacy format: findings array
  const issues = cursorOutput.issues || cursorOutput.findings || [];

  if (issues.length === 0 && cursorOutput.rawOutput) {
    return {
      inlineComments: [],
      metrics: [],
      issueBreakdown: { critical: [], moderate: [], minor: [] },
      nextSteps: [],
      verdict: null,
      assessment: {
        grade: 'N/A',
        score: 0,
        summary: 'cursor-agent review completed. See raw output for details.',
        strengths: [],
        weaknesses: [],
        recommendations: ['Review the cursor-agent output manually'],
      },
    };
  }

  const inlineComments: InlineComment[] = issues.map((issue) => ({
    file: issue.file || issue.path || '',
    line: issue.line || issue.lineNumber || 1,
    startLineCodeOfChangedFileForSuggestion: issue.startLineCodeOfChangedFileForSuggestion || '',
    startLineNumberOfChangedFileForSuggestion: issue.startLineNumberOfChangedFileForSuggestion || issue.line || issue.lineNumber || 1,
    severity: (issue.severity || mapSeverity(issue.level)) as 'critical' | 'moderate' | 'minor',
    title: issue.title || issue.message?.split('\n')[0] || 'Code Issue',
    message: issue.message || issue.description || '',
    recommendation:
      issue.recommendation || issue.suggestion || issue.fix || '',
    effort: issue.effort || estimateEffort(issue.severity),
    impact: issue.impact || 'Code quality improvement',
    codeExample: issue.codeExample || '',
    priority: issue.priority,
  }));

  return {
    inlineComments,
    metrics: cursorOutput.metrics || [],
    issueBreakdown: cursorOutput.issueBreakdown || {
      critical: [],
      moderate: [],
      minor: [],
    },
    nextSteps: cursorOutput.nextSteps || [],
    verdict: cursorOutput.verdict || null,
    assessment:
      cursorOutput.assessment || generateAssessmentFromIssues(inlineComments),
  };
}

/**
 * Map cursor-agent severity to our format
 */
export function mapSeverity(severity?: string): 'critical' | 'moderate' | 'minor' {
  if (!severity) return 'moderate';
  return SEVERITY_MAP[severity.toLowerCase()] || 'moderate';
}

/**
 * Estimate effort based on severity
 */
export function estimateEffort(severity?: string): string {
  if (!severity) return '15 minutes';
  return EFFORT_MAP[severity as keyof typeof EFFORT_MAP] || '15 minutes';
}

/**
 * Generate assessment from issues if cursor-agent doesn't provide one
 */
export function generateAssessmentFromIssues(issues: InlineComment[]) {
  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const moderateCount = issues.filter((i) => i.severity === 'moderate').length;
  const minorCount = issues.filter((i) => i.severity === 'minor').length;

  const score = Math.max(
    0,
    100 - criticalCount * 20 - moderateCount * 5 - minorCount * 2
  );

  const grade =
    Object.entries(GRADE_MAP).find(
      ([threshold]) => score >= parseInt(threshold)
    )?.[1] || 'F';

  return {
    grade,
    score,
    summary: `Found ${issues.length} issues: ${criticalCount} critical, ${moderateCount} moderate, ${minorCount} minor`,
    strengths:
      issues.length < 5
        ? ['Clean code structure', 'Good practices']
        : ['Some good patterns found'],
    weaknesses: issues.map((i) => i.title).slice(0, 3),
    recommendations: [
      'Review and address critical issues',
      'Improve code quality',
      'Follow best practices',
    ],
  };
}

