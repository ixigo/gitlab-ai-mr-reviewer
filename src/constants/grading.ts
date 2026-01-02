/**
 * Grading configuration for post-AI score calculation
 */

export interface GradingCriteria {
  category: string;
  weight: number; // Percentage weight (0-100)
  maxDeductions: number; // Maximum points to deduct for this category
  issueDeductions: {
    critical: number; // Points deducted per critical issue
    moderate: number; // Points deducted per moderate issue
    minor: number; // Points deducted per minor issue
  };
}

export interface GradingConfig {
  baseScore: number; // Starting score (default: 100)
  criteria: GradingCriteria[];
  passingThresholds: {
    minimumScore: number; // Minimum score to pass (e.g., 70)
    minimumGrade: string; // Minimum grade to pass (e.g., 'C')
    criticalIssuesMax: number; // Max critical issues allowed
    moderateIssuesMax: number; // Max moderate issues allowed
  };
  gradeScale: {
    [grade: string]: { min: number; max: number };
  };
}

/**
 * Default grading configuration
 * 
 * Score calculation:
 * - Start with 100 points
 * - Deduct points based on issue severity and category
 * - Apply weights to different categories
 * - Convert final score to letter grade
 */
export const GRADING_CONFIG: GradingConfig = {
  baseScore: 100,
  
  criteria: [
    {
      category: 'Code Quality',
      weight: 30,
      maxDeductions: 30,
      issueDeductions: {
        critical: 10,
        moderate: 5,
        minor: 2,
      },
    },
    {
      category: 'Type Safety',
      weight: 20,
      maxDeductions: 20,
      issueDeductions: {
        critical: 8,
        moderate: 4,
        minor: 1,
      },
    },
    {
      category: 'Security',
      weight: 25,
      maxDeductions: 25,
      issueDeductions: {
        critical: 15,
        moderate: 8,
        minor: 3,
      },
    },
    {
      category: 'Test Coverage',
      weight: 15,
      maxDeductions: 15,
      issueDeductions: {
        critical: 10,
        moderate: 5,
        minor: 2,
      },
    },
    {
      category: 'Performance',
      weight: 10,
      maxDeductions: 10,
      issueDeductions: {
        critical: 7,
        moderate: 4,
        minor: 1,
      },
    },
  ],
  
  passingThresholds: {
    minimumScore: 70, // Must score at least 70/100
    minimumGrade: 'C', // Must get at least C grade
    criticalIssuesMax: 3, // No more than 3 critical issues
    moderateIssuesMax: 8, // No more than 8 moderate issues
  },
  
  gradeScale: {
    'A+': { min: 97, max: 100 },
    'A': { min: 93, max: 96 },
    'A-': { min: 90, max: 92 },
    'B+': { min: 87, max: 89 },
    'B': { min: 83, max: 86 },
    'B-': { min: 80, max: 82 },
    'C+': { min: 77, max: 79 },
    'C': { min: 73, max: 76 },
    'C-': { min: 70, max: 72 },
    'D+': { min: 67, max: 69 },
    'D': { min: 63, max: 66 },
    'D-': { min: 60, max: 62 },
    'F': { min: 0, max: 59 },
  },
};

/**
 * Calculate score based on issues found
 */
export function calculateScore(issues: any[], metrics: any[]): { score: number; grade: string; breakdown: any } {
  let totalDeductions = 0;
  const breakdown: any = {
    baseScore: GRADING_CONFIG.baseScore,
    deductions: [],
  };

  // Count issues by severity
  const issueCount = {
    critical: issues.filter(i => i.severity === 'critical').length,
    moderate: issues.filter(i => i.severity === 'moderate').length,
    minor: issues.filter(i => i.severity === 'minor').length,
  };

  // Extract specialized counts from metrics
  const metricCounts: any = {};
  metrics.forEach(m => {
    metricCounts[m.category] = m.count || 0;
  });

  // Calculate deductions for each criteria
  GRADING_CONFIG.criteria.forEach(criteria => {
    let categoryDeductions = 0;

    // Map metric categories to grading criteria
    let relevantIssues = { critical: 0, moderate: 0, minor: 0 };

    switch (criteria.category) {
      case 'Code Quality':
        // General critical/moderate/minor issues
        relevantIssues = {
          critical: issueCount.critical - (metricCounts['Security Issues'] || 0) - (metricCounts['Type Safety Issues'] || 0),
          moderate: issueCount.moderate,
          minor: issueCount.minor,
        };
        break;
      case 'Type Safety':
        relevantIssues.critical = metricCounts['Type Safety Issues'] || 0;
        break;
      case 'Security':
        relevantIssues.critical = metricCounts['Security Issues'] || 0;
        break;
      case 'Test Coverage':
        relevantIssues.moderate = metricCounts['Test Coverage Issues'] || 0;
        break;
      case 'Performance':
        relevantIssues.moderate = metricCounts['Performance Issues'] || 0;
        break;
    }

    // Calculate deductions
    categoryDeductions += relevantIssues.critical * criteria.issueDeductions.critical;
    categoryDeductions += relevantIssues.moderate * criteria.issueDeductions.moderate;
    categoryDeductions += relevantIssues.minor * criteria.issueDeductions.minor;

    // Cap at max deductions for this category
    categoryDeductions = Math.min(categoryDeductions, criteria.maxDeductions);

    breakdown.deductions.push({
      category: criteria.category,
      weight: criteria.weight,
      issues: relevantIssues,
      deductions: categoryDeductions,
    });

    totalDeductions += categoryDeductions;
  });

  // Calculate final score
  const finalScore = Math.max(0, Math.min(100, GRADING_CONFIG.baseScore - totalDeductions));
  breakdown.totalDeductions = totalDeductions;
  breakdown.finalScore = finalScore;

  // Determine grade
  let grade = 'F';
  for (const [gradeLevel, range] of Object.entries(GRADING_CONFIG.gradeScale)) {
    if (finalScore >= range.min && finalScore <= range.max) {
      grade = gradeLevel;
      break;
    }
  }

  breakdown.grade = grade;

  return {
    score: Math.round(finalScore),
    grade,
    breakdown,
  };
}

/**
 * Check if review passes the thresholds
 */
export function checkPassingCriteria(score: number, grade: string, issueCount: any): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  const thresholds = GRADING_CONFIG.passingThresholds;

  // Check score
  if (score < thresholds.minimumScore) {
    failures.push(`Score ${score} is below minimum ${thresholds.minimumScore}`);
  }

  // Check grade
  const gradeValue = getGradeValue(grade);
  const minGradeValue = getGradeValue(thresholds.minimumGrade);
  if (gradeValue < minGradeValue) {
    failures.push(`Grade ${grade} is below minimum ${thresholds.minimumGrade}`);
  }

  // Check critical issues
  if (issueCount.critical > thresholds.criticalIssuesMax) {
    failures.push(`${issueCount.critical} critical issues exceeds maximum ${thresholds.criticalIssuesMax}`);
  }

  // Check moderate issues
  if (issueCount.moderate > thresholds.moderateIssuesMax) {
    failures.push(`${issueCount.moderate} moderate issues exceeds maximum ${thresholds.moderateIssuesMax}`);
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Get numeric value for grade comparison
 */
function getGradeValue(grade: string): number {
  const grades = ['F', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];
  return grades.indexOf(grade);
}

