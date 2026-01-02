/**
 * Post inline comments to GitLab MR
 */

import { CONFIG, SEVERITY_EMOJI, colors } from '../constants';
import { log } from '../utils/logger';
import { postInlineComment } from '../api/gitlab';
import { STATS } from '../utils/stats';
import { AIReview, MRData } from '../types';

/**
 * Post AI-generated inline comments to GitLab
 * Returns the successfully posted comments for accurate metrics
 */
export async function postAIInlineComments(aiReview: AIReview | null, mrData: MRData): Promise<any[]> {
  log.section('[STEP 2/3] Posting AI-generated inline comments to GitLab');

  if (
    !aiReview ||
    !aiReview.inlineComments ||
    aiReview.inlineComments.length === 0
  ) {
    log.warning('No inline comments from AI review JSON');
    return [];
  }

  log.info(
    `Processing ${aiReview.inlineComments.length} issues from extracted JSON for inline comments`
  );
  console.log('');

  const successfullyPostedComments: any[] = [];

  for (const aiComment of aiReview.inlineComments) {
    const severityEmoji =
      SEVERITY_EMOJI[aiComment.severity?.toLowerCase() as keyof typeof SEVERITY_EMOJI] || '🔵';

    const severityLabel =
      aiComment.severity?.charAt(0).toUpperCase() +
        aiComment.severity?.slice(1) || 'Info';

    const codeExampleSection = aiComment.codeExample
      ? `\n\n**Example:**\n\`\`\`\n${aiComment.codeExample}\n\`\`\``
      : '';

    // Use new_line (AI-provided or calculated from diff)
    const targetLineNumber = aiComment.new_line || aiComment.line || 0;
    
    // Use new_path from AI, fallback to legacy file field
    const filePath = aiComment.new_path || aiComment.file || 'unknown';

    // Add code context if available (showing the problematic line)
    const codeContextSection = aiComment.newLineCode
      ? `\n\n**Current code:**\n\`\`\`\n${aiComment.newLineCode}\n\`\`\``
      : '';

    const comment = `## ${severityEmoji} ${severityLabel}: ${aiComment.title}
${codeContextSection}

${aiComment.message}

**Recommendation:**
${aiComment.recommendation}${codeExampleSection}

💡 **Impact:** ${aiComment.impact || 'Code quality improvement'}  
⏱️ **Effort:** ${aiComment.effort}`;

    console.log(
      `  ${colors.cyan}→${colors.reset} Posting AI comment on ${filePath}:${targetLineNumber}...`
    );

    const success = await postInlineComment(
      filePath,
      targetLineNumber,
      comment,
      mrData,
      aiComment.old_line
    );

    if (success) {
      console.log(`    ${colors.green}✓${colors.reset} Posted successfully`);
      successfullyPostedComments.push(aiComment);
    } else {
      console.log(
        `    ${colors.yellow}⚠${colors.reset} Could not post (line may not be in diff)`
      );
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, CONFIG.commentDelay));
  }

  console.log('');
  log.success(
    `Posted ${STATS.inlineSuccess}/${STATS.inlineTotal} AI-generated inline comments`
  );
  console.log('');
  
  return successfullyPostedComments;
}

