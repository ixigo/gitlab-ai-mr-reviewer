/**
 * Statistics tracking for the review process
 */

import { Stats } from '../types';

export const STATS: Stats = {
  criticalCount: 0,
  moderateCount: 0,
  minorCount: 0,
  testCoverageIssues: 0,
  typeSafetyIssues: 0,
  documentationIssues: 0,
  securityIssues: 0,
  performanceIssues: 0,
  accessibilityIssues: 0,
  inlineTotal: 0,
  inlineSuccess: 0,
};

/**
 * Reset all statistics to zero
 */
export function resetStats(): void {
  Object.keys(STATS).forEach((key) => {
    (STATS as any)[key] = 0;
  });
}

/**
 * Get current statistics
 */
export function getStats(): Stats {
  return { ...STATS };
}

