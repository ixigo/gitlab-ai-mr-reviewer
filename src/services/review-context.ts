/**
 * Review Context Service
 * 
 * Provides basic context information for the review process.
 * Always performs a complete MR diff review.
 */

import { ReviewContext } from '../types';
import { log } from '../utils/logger';

/**
 * Get the review context for the current pipeline run
 */
export async function getReviewContext(): Promise<ReviewContext> {
  const mrIid = process.env.CI_MERGE_REQUEST_IID!;
  const commitSha = process.env.CI_COMMIT_SHA!;
  const pipelineSource = process.env.CI_PIPELINE_SOURCE;

  log.info('🔍 Getting review context...');
  log.info(`  Pipeline Source: ${pipelineSource}`);
  log.info(`  Commit SHA: ${commitSha}`);
  log.info(`  Review Type: Complete MR Diff`);

  return {
    commitSha,
    mrIid,
  };
}

