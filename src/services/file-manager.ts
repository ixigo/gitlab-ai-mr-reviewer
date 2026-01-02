/**
 * File management operations
 */

import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from '../constants';
import { log } from '../utils/logger';
import { STATS } from '../utils/stats';

/**
 * Ensure output directory exists
 */
export function ensureOutputDirectory(): void {
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
}

/**
 * Save changed files list
 */
export function saveChangedFiles(changedFiles: string[]): void {
  const changedFilesPath = path.join(CONFIG.outputDir, 'changed-files.txt');
  fs.writeFileSync(changedFilesPath, changedFiles.join('\n'));
  log.info(`Saved ${changedFiles.length} changed files to ${changedFilesPath}`);
}

/**
 * Update review-data.json with execution statistics
 */
export function updateReviewDataWithStats(jsonPath: string): void {
  try {
    log.info('Updating review-data.json with execution statistics...');

    // Read existing JSON
    const reviewData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    // Update execution stats
    reviewData.executionStats = {
      issueCount: {
        critical: STATS.criticalCount,
        moderate: STATS.moderateCount,
        minor: STATS.minorCount,
        testCoverage: STATS.testCoverageIssues,
        typeSafety: STATS.typeSafetyIssues,
        documentation: STATS.documentationIssues,
        security: STATS.securityIssues,
        performance: STATS.performanceIssues,
        accessibility: STATS.accessibilityIssues,
      },
      comments: {
        total: STATS.inlineTotal,
        posted: STATS.inlineSuccess,
        failed: STATS.inlineTotal - STATS.inlineSuccess,
      },
      completedAt: new Date().toISOString(),
    };

    // Save updated JSON
    fs.writeFileSync(jsonPath, JSON.stringify(reviewData, null, 2));
    log.success(`Updated ${jsonPath} with execution statistics`);
  } catch (error) {
    log.warning(`Failed to update review-data.json: ${(error as Error).message}`);
  }
}

