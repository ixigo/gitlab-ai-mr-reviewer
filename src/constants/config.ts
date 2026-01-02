/**
 * Application configuration from environment variables
 */

import { detectTechStack } from '../services/tech-stack-detector';
import { Config } from '../types';

export const CONFIG: Config = {
  scriptDir: __dirname,
  gitlabUrl:
    process.env.CI_SERVER_URL || 'https://www.gitlab.com',
  projectId: process.env.CI_PROJECT_ID || process.env.PROJECT_ID || '',
  mrIid: process.env.CI_MERGE_REQUEST_IID || '',
  gitlabToken:
    process.env.GITLAB_TOKEN ||
    process.env.NPM_TOKEN ||
    process.env.CI_JOB_TOKEN ||
    '',
  cursorApiKey: process.env.CURSOR_API_KEY || '',

  // Config type: auto-detected based on project files
  // 'java-gradle': Gradle build files with Java source files
  // 'next-ts': package.json with 'next' and 'react' dependencies
  // 'java-maven': pom.xml with Java source files
  // Returns null if no tech stack is detected
  configType: detectTechStack(),

  // Paths - all output files go here
  outputDir: process.env.OUTPUT_DIR || '.cursor/reviews',
  reviewRules: '.cursor/rules/review-rules.mdc',
  reviewOutput: '.cursor/reviews/review-output.md',

  // Timeouts
  commandTimeout: 300000, // 5 minutes
  commentDelay: 500, // Delay between posting comments to avoid rate limiting

  // Quality gate enforcement
  // If true (default), exit with code 1 when quality thresholds are not met (fails CI pipeline)
  // If false, log warnings but exit with code 0 (allows pipeline to pass)
  mustPassReviewQuality:
    process.env.MUST_PASS_REVIEW_QUALITY === undefined ||
    process.env.MUST_PASS_REVIEW_QUALITY.toLowerCase() === 'true',
};

