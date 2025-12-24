/**
 * Calculate grade and score based on statistics
 */

import { STATS } from '../utils/stats';

interface GradeResult {
  grade: string;
  score: number;
}

/**
 * Calculate grade and score
 */
export function calculateGrade(): GradeResult {
  let score = 100;

  // Deduct points
  score -= STATS.criticalCount * 15;
  score -= STATS.moderateCount * 5;
  score -= STATS.minorCount * 2;

  score = Math.max(0, score);

  let grade = 'F';
  if (score >= 95) grade = 'A+';
  else if (score >= 90) grade = 'A';
  else if (score >= 85) grade = 'A-';
  else if (score >= 80) grade = 'B+';
  else if (score >= 75) grade = 'B';
  else if (score >= 70) grade = 'B-';
  else if (score >= 65) grade = 'C+';
  else if (score >= 60) grade = 'C';
  else if (score >= 55) grade = 'C-';
  else if (score >= 50) grade = 'D';

  return { grade, score };
}

