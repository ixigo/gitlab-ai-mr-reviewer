/**
 * Post general review comment to GitLab MR
 */

import { CONFIG } from '../constants';
import { log } from '../utils/logger';
import { STATS } from '../utils/stats';
import { postGeneralNote } from '../api/gitlab';
import { calculateGrade } from '../review/grading';
import { AIReview, MRData, Metric } from '../types';

/**
 * Get emoji for metric category
 */
function getMetricEmoji(category: string): string {
  if (category === 'Critical Issues') return '🔴';
  if (category === 'Moderate Issues') return '🟡';
  if (category === 'Minor Issues') return '🟢';
  return '';
}

/**
 * Get key focus areas based on metrics
 */
function getKeyFocusAreas(aiReview: AIReview | null): string[] {
  const focusAreas: string[] = [];
  
  if (!aiReview?.metrics) return focusAreas;
  
  const criticalMetric = aiReview.metrics.find(m => m.category === 'Critical Issues');
  const moderateMetric = aiReview.metrics.find(m => m.category === 'Moderate Issues');
  const minorMetric = aiReview.metrics.find(m => m.category === 'Minor Issues');
  const securityMetric = aiReview.metrics.find(m => m.category === 'Security Issues');
  const typeSafetyMetric = aiReview.metrics.find(m => m.category === 'Type Safety Issues');
  const testMetric = aiReview.metrics.find(m => m.category === 'Test Coverage Issues');
  const performanceMetric = aiReview.metrics.find(m => m.category === 'Performance Issues');
  
  const criticalCount = criticalMetric?.count || 0;
  const moderateCount = moderateMetric?.count || 0;
  const minorCount = minorMetric?.count || 0;
  
  if (criticalCount > 0) {
    focusAreas.push(`🚨 **${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} require immediate fix**`);
  }
  
  if (moderateCount > 0) {
    focusAreas.push(`⚠️ **${moderateCount} improvement${moderateCount > 1 ? 's' : ''} recommended**`);
  }
  
  if (minorCount > 0) {
    focusAreas.push(`💡 **${minorCount} minor suggestion${minorCount > 1 ? 's' : ''}**`);
  }
  
  if (securityMetric && securityMetric.count > 0) {
    focusAreas.push(`🔒 **Security:** Review sensitive data handling (${securityMetric.count} issue${securityMetric.count > 1 ? 's' : ''})`);
  }
  
  if (typeSafetyMetric && typeSafetyMetric.count > 0) {
    focusAreas.push(`✅ **Type Safety:** Add proper TypeScript types (${typeSafetyMetric.count} issue${typeSafetyMetric.count > 1 ? 's' : ''})`);
  }
  
  if (testMetric && testMetric.count > 0) {
    focusAreas.push(`🧪 **Testing:** Add missing test coverage (${testMetric.count} file${testMetric.count > 1 ? 's' : ''})`);
  }
  
  if (performanceMetric && performanceMetric.count > 0) {
    focusAreas.push(`⚡ **Performance:** Optimization opportunities identified (${performanceMetric.count} issue${performanceMetric.count > 1 ? 's' : ''})`);
  }
  
  return focusAreas;
}

/**
 * Post general review comment with concise summary
 */
export async function postGeneralComment(_mrData: MRData, aiReview: AIReview | null): Promise<{ grade: string; score: number }> {
  log.section('[STEP 3/3] Posting general review comment');

  log.info(
    'Using extracted JSON data for general comment (assessment, metrics, summary, verdict)'
  );

  // Use AI assessment if available, otherwise calculate
  const grade = aiReview?.assessment?.grade || calculateGrade().grade;
  const score = aiReview?.assessment?.score || calculateGrade().score;
  
  // Get counts from metrics
  const criticalMetric = aiReview?.metrics.find(m => m.category === 'Critical Issues');
  const moderateMetric = aiReview?.metrics.find(m => m.category === 'Moderate Issues');
  const minorMetric = aiReview?.metrics.find(m => m.category === 'Minor Issues');
  
  const criticalCount = criticalMetric?.count || 0;
  const moderateCount = moderateMetric?.count || 0;
  const minorCount = minorMetric?.count || 0;
  const totalIssues = criticalCount + moderateCount + minorCount;
  
  const verdict = criticalCount === 0
    ? '✅ **APPROVED** with suggestions'
    : '❌ **CHANGES REQUESTED**';
  
  const gradeEmoji = score >= 90 ? '🌟' : score >= 80 ? '✨' : score >= 70 ? '👍' : score >= 60 ? '⚠️' : '🔴';
  
  // Get key focus areas
  const focusAreas = getKeyFocusAreas(aiReview);
  const focusAreasSection = focusAreas.length > 0
    ? `\n\n**Key Focus Areas:**\n${focusAreas.map(area => `- ${area}`).join('\n')}`
    : '';
  
  // Build next steps based on severity
  const nextSteps: string[] = [];
  if (criticalCount > 0) {
    nextSteps.push('🔴 **Fix critical issues immediately** - blocking merge');
  }
  if (moderateCount > 0) {
    nextSteps.push('🟡 **Address moderate issues** - review inline comments');
  }
  if (minorCount > 0) {
    nextSteps.push('🟢 **Consider minor improvements** - optional but recommended');
  }
  if (STATS.inlineTotal - STATS.inlineSuccess > 0) {
    nextSteps.push(`ℹ️ **Note:** ${STATS.inlineTotal - STATS.inlineSuccess} issue${(STATS.inlineTotal - STATS.inlineSuccess) > 1 ? 's' : ''} could not be posted (line not in diff)`);
  }
  
  const nextStepsSection = nextSteps.length > 0
    ? `\n\n**Next Steps:**\n${nextSteps.map(step => `${step}`).join('\n')}`
    : '';

  const comment = `## 🔍 Code Review Summary

${gradeEmoji} **Overall Grade:** ${grade} (${score}/100)  
📍 **${STATS.inlineSuccess}** specific issue${STATS.inlineSuccess !== 1 ? 's' : ''} posted inline for ${STATS.inlineSuccess > 0 ? 'immediate attention' : 'review'}${totalIssues > STATS.inlineSuccess ? ` (${totalIssues} total including existing)` : ''}.${focusAreasSection}${nextStepsSection}

---

**Verdict:** ${verdict}  
${criticalCount === 0 ? '✅ Code quality meets standards. Address suggestions when convenient.' : '⚠️ Critical issues must be resolved before merge.'}

<details>
<summary>📊 <strong>View Detailed Metrics</strong></summary>

| Metric | Count | Status |
|--------|-------|--------|
${aiReview?.metrics ? aiReview.metrics.map((m: Metric) => {
  const emoji = getMetricEmoji(m.category);
  const status = m.count === 0 ? '✅' : m.count <= (m.threshold || 999) ? '⚠️' : '❌';
  return `| ${emoji} ${m.category} | ${m.count} | ${status} |`;
}).join('\n') : `| 🔴 Critical | ${criticalCount} | ${criticalCount === 0 ? '✅' : '❌'} |\n| 🟡 Moderate | ${moderateCount} | ${moderateCount === 0 ? '✅' : '⚠️'} |\n| 🟢 Minor | ${minorCount} | ${minorCount === 0 ? '✅' : '⚠️'} |`}

_Includes existing discussions + newly posted issues_

</details>

---

💬 **Review all inline comments in the "Changes" tab** • 🔄 **Re-request review after fixes**  
🤖 _Automated Code Review_ • MR #${CONFIG.mrIid}`;

  try {
    await postGeneralNote(comment);
    log.success('General review comment posted successfully');
  } catch (error) {
    log.error(`Failed to post general comment: ${(error as Error).message}`);
  }

  console.log('');
  return { grade, score };
}

