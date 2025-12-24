/**
 * Analyze AI review results and update statistics
 */

import { log } from '../utils/logger';
import { STATS } from '../utils/stats';
import { AIReview } from '../types';

/**
 * Analyze AI review results and update stats
 */
export function analyzeAIReview(aiReview: AIReview | null): void {
  if (!aiReview) {
    log.warning('No AI review data available');
    return;
  }

  // Use metrics from parsed markdown if available
  if (aiReview.metrics && aiReview.metrics.length > 0) {
    log.info('Using category metrics from review markdown');

    aiReview.metrics.forEach((metric) => {
      const category = metric.category.toLowerCase();
      const issueCount = metric.issueCount || 0;

      // Map categories to STATS
      if (category.includes('test') || category.includes('coverage')) {
        STATS.testCoverageIssues += issueCount;
      }
      if (category.includes('type') || category.includes('safety')) {
        STATS.typeSafetyIssues += issueCount;
      }
      if (category.includes('document') || category.includes('logging')) {
        STATS.documentationIssues += issueCount;
      }
      if (category.includes('security')) {
        STATS.securityIssues += issueCount;
      }
      if (category.includes('performance')) {
        STATS.performanceIssues += issueCount;
      }
      if (category.includes('accessibility')) {
        STATS.accessibilityIssues += issueCount;
      }
    });
  }

  // Count issues by severity from inline comments
  if (aiReview.inlineComments && aiReview.inlineComments.length > 0) {
    aiReview.inlineComments.forEach((comment) => {
      const severity = comment.severity?.toLowerCase();
      if (severity === 'critical') {
        STATS.criticalCount++;
      } else if (severity === 'moderate') {
        STATS.moderateCount++;
      } else if (severity === 'minor') {
        STATS.minorCount++;
      }

      // Categorize by type if not already counted from metrics
      if (!aiReview.metrics || aiReview.metrics.length === 0) {
        if (
          comment.title?.includes('Test') ||
          comment.title?.includes('Coverage')
        ) {
          STATS.testCoverageIssues++;
        }
        if (
          comment.title?.includes('Type') ||
          comment.title?.includes('any')
        ) {
          STATS.typeSafetyIssues++;
        }
        if (
          comment.title?.includes('Console') ||
          comment.title?.includes('Logging')
        ) {
          STATS.documentationIssues++;
        }
        if (
          comment.title?.includes('Security') ||
          comment.title?.includes('Error')
        ) {
          STATS.securityIssues++;
        }
      }
    });
  }

  log.success(
    `AI Analysis complete - Found ${STATS.criticalCount} critical, ${STATS.moderateCount} moderate, ${STATS.minorCount} minor issues`
  );
  log.info(
    `Category issues - Test: ${STATS.testCoverageIssues}, Type Safety: ${STATS.typeSafetyIssues}, Security: ${STATS.securityIssues}, Performance: ${STATS.performanceIssues}, Accessibility: ${STATS.accessibilityIssues}`
  );
  console.log('');
}

