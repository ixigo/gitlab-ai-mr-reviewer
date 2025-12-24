/**
 * Review Comment Formatter
 * 
 * Handles formatting and posting review comments to GitLab MR
 */

import { DiffDataV2, InlineComment, MRData } from '../types';
import { log } from '../utils/logger';
import { postInlineComment } from '../api/gitlab';
import { delay } from '../utils/exec';
import { CONFIG } from '../constants';

/**
 * Post review comments to GitLab MR
 */
export async function postReviewComments(
  comments: InlineComment[],
  mrData: MRData
): Promise<{ posted: number; failed: number }> {
  let posted = 0;
  let failed = 0;

  if (comments.length === 0) {
    log.info('✅ No issues found - great work!');
    return { posted, failed };
  }

  log.info(`📝 Posting review comments (${comments.length} total)...`);

  for (const comment of comments) {
    if (!comment.file || !comment.new_line) {
      log.warning(`Skipping comment without file/line: ${comment.title}`);
      failed++;
      continue;
    }

    try {
      // Format comment
      const commentBody = formatInlineComment(comment);

      // Post to GitLab
      const success = await postInlineComment(
        comment.file,
        comment.new_line,
        commentBody,
        mrData
      );

      if (success) {
        posted++;
        log.info(`  ✅ ${comment.file}:${comment.new_line} - ${comment.severity}`);
      } else {
        failed++;
        log.warning(`  ❌ Failed: ${comment.file}:${comment.new_line} (line not in diff)`);
      }

      // Delay to avoid rate limiting
      await delay(CONFIG.commentDelay);
    } catch (error) {
      failed++;
      log.error(`  ❌ Error posting comment: ${error}`);
    }
  }

  log.info(`📊 Posted: ${posted}, Failed: ${failed}`);
  return { posted, failed };
}

/**
 * Format inline comment with appropriate styling
 */
function formatInlineComment(comment: InlineComment): string {
  const severityEmoji = {
    critical: '🔴',
    moderate: '🟡',
    minor: '🔵',
  };

  const emoji = severityEmoji[comment.severity] || '🔵';

  let body = `<!-- review-robo -->\n`;
  body += `${emoji} **${comment.severity.toUpperCase()}**: ${comment.title}\n\n`;
  body += `${comment.message}\n\n`;

  if (comment.recommendation) {
    body += `**💡 Recommendation:**\n${comment.recommendation}\n\n`;
  }

  if (comment.codeExample) {
    body += `**✨ Suggested Fix:**\n\`\`\`typescript\n${comment.codeExample}\n\`\`\`\n\n`;
  }

  body += `---\n`;
  body += `**Effort:** ${comment.effort} | **Impact:** ${comment.impact}\n\n`;
  body += `*🤖 Code Review by review-robo*`;

  return body;
}

/**
 * Log review summary
 */
export function logReviewSummary(
  diffData: DiffDataV2,
  commentsCount: number,
  posted: number,
  failed: number
): void {
  log.info('');
  log.info('═══════════════════════════════════════════');
  log.info(`📊 Review Summary`);
  log.info('═══════════════════════════════════════════');
  log.info(`Review Type:     Complete MR Diff`);
  log.info(`Strategy:        ${diffData.strategy}`);
  log.info(`Files Reviewed:  ${diffData.fileCount}`);
  log.info(`Issues Found:    ${commentsCount}`);
  log.info(`Comments Posted: ${posted}`);
  log.info(`Failed:          ${failed}`);
  log.info('═══════════════════════════════════════════');
  log.info('');
}

/**
 * Validate that comments have valid line numbers
 */
export function validateComments(comments: InlineComment[]): InlineComment[] {
  return comments.filter((comment) => {
    if (!comment.file) {
      log.warning(`Invalid comment: missing file - ${comment.title}`);
      return false;
    }

    if (!comment.new_line || comment.new_line <= 0) {
      log.warning(`Invalid comment: invalid line number ${comment.new_line} - ${comment.title}`);
      return false;
    }

    return true;
  });
}

