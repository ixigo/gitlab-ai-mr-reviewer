/**
 * Check prerequisites before running the review
 */

import { CONFIG } from '../constants';
import { log } from '../utils/logger';
import { ensureOutputDirectory } from './file-manager';

/**
 * Check prerequisites
 */
export function checkPrerequisites(): void {
  log.section('AUTOMATED CODE REVIEW SYSTEM - AI Powered');
  console.log(`  MR #${CONFIG.mrIid}\n`);

  if (!CONFIG.mrIid) {
    log.error('Not running in merge request pipeline');
    process.exit(1);
  }

  if (!CONFIG.gitlabToken) {
    log.error('GITLAB_TOKEN not set');
    process.exit(1);
  }

  if (!CONFIG.cursorApiKey) {
    log.warning('CURSOR_API_KEY not set - will skip AI review');
  }

  ensureOutputDirectory();

  log.success('Prerequisites check passed');
}

