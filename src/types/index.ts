/**
 * Type definitions for the review-robo application
 */

export interface MRData {
  title: string;
  author: string;
  baseSha: string;
  startSha: string;
  headSha: string;
}

export interface DiffData {
  diffContent: string;
  fileCount: number;
  changes: GitLabChange[];
}

export interface GitLabChange {
  old_path: string;
  new_path: string;
  diff: string;
  new_file: boolean;
  renamed_file: boolean;
  deleted_file: boolean;
}

export interface InlineComment {
  // New format from AI (expected fields)
  position_type?: string; // 'text' for text-based diffs
  new_path?: string; // File path in repository (e.g., "src/api/UserService.ts")
  diff_line?: number; // Line number in diff patch
  new_line?: number; // Line number in the new file (AI-provided or calculated)
  newLineCode?: string; // Actual code content at the issue line
  old_line?: number | null; // Line number in the old file (calculated from diff, null for added lines)
  
  // Legacy fields (for backward compatibility - will be removed in future)
  file?: string; // Deprecated: use new_path
  line?: number; // Deprecated: use diff_line or new_line
  startLineCodeOfChangedFileForSuggestion?: string; // Deprecated: removed from prompt
  startLineNumberOfChangedFileForSuggestion?: number; // Deprecated: removed from prompt
  
  // Issue details (required)
  severity: 'critical' | 'moderate' | 'minor';
  title: string;
  message: string;
  recommendation: string;
  codeExample?: string;
  effort: string;
  impact: string;
  priority?: string;
}

export interface Metric {
  category: string;
  count: number;
  threshold: number | null;
  status: string | null;
  emoji?: string;
  grade?: string;
  issueCount?: number;
}

export interface Assessment {
  grade?: string; // Optional - calculated after AI review
  score?: number; // Optional - calculated after AI review
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface IssueBreakdown {
  critical: string[];
  moderate: string[];
  minor: string[];
}

export interface NextStep {
  title: string;
  description: string;
  effort?: string;
}

export interface AIReview {
  inlineComments: InlineComment[];
  metrics: Metric[];
  issueBreakdown: IssueBreakdown;
  nextSteps: NextStep[];
  verdict: string | null;
  assessment: Assessment;
  _reviewJsonPath?: string;
}

export interface ReviewData {
  mrOverview: {
    iid: string;
    title: string;
    author: string;
    baseSha: string;
    headSha: string;
    reviewTimestamp: string;
  };
  summary: string;
  grade: string;
  score: number;
  metrics: Metric[];
  issues: InlineComment[];
  issueBreakdown: IssueBreakdown;
  nextSteps: NextStep[];
  verdict: string;
  assessment: Assessment;
  executionStats: {
    issueCount: {
      critical: number;
      moderate: number;
      minor: number;
      testCoverage: number;
      typeSafety: number;
      consoleStatements: number;
      security: number;
      documentation: number;
      performance: number;
      accessibility: number;
    };
    comments: {
      total: number;
      posted: number;
      failed: number;
    };
    completedAt: string | null;
  };
}

export interface Config {
  scriptDir: string;
  gitlabUrl: string;
  projectId: string;
  mrIid: string;
  gitlabToken: string;
  cursorApiKey: string;
  configType: string | null;
  outputDir: string;
  reviewRules: string;
  reviewOutput: string;
  commandTimeout: number;
  commentDelay: number;
  mustPassReviewQuality: boolean;
}

export interface Stats {
  criticalCount: number;
  moderateCount: number;
  minorCount: number;
  testCoverageIssues: number;
  typeSafetyIssues: number;
  documentationIssues: number;
  securityIssues: number;
  performanceIssues: number;
  accessibilityIssues: number;
  inlineTotal: number;
  inlineSuccess: number;
}

export interface Colors {
  reset: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  cyan: string;
}

export interface SeverityMap {
  [key: string]: 'critical' | 'moderate' | 'minor';
}

export interface SeverityEmoji {
  critical: string;
  moderate: string;
  minor: string;
}

export interface EffortMap {
  critical: string;
  moderate: string;
  minor: string;
}

export interface GradeMap {
  [score: number]: string;
}

export interface Thresholds {
  CRITICAL_COUNT: number;
  MODERATE_COUNT: number;
  MINOR_COUNT: number;
}

export interface HTTPSRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | Record<string, any>;
}

// ============================================
// Review Types
// ============================================

export type DiffStrategy = 'full-mr';

export interface ReviewContext {
  commitSha: string;
  mrIid: string;
}

export interface DiffDataV2 {
  changes: GitLabChange[];
  strategy: DiffStrategy;
  fileCount: number;
}

export interface GitLabDiscussion {
  id: string;
  individual_note: boolean;
  notes: GitLabNote[];
}

export interface GitLabNote {
  id: number;
  type: string;
  body: string;
  author: {
    id: number;
    username: string;
    name: string;
  };
  created_at: string;
  system: boolean;
}

export interface ReviewResult {
  comments: InlineComment[];
  filesReviewed: number;
  issuesFound: number;
  strategy: DiffStrategy;
}

