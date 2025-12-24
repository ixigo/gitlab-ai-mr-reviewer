/**
 * Parse markdown review output from cursor-agent
 */

import { log } from '../utils/logger';
import { AIReview, InlineComment, Metric, NextStep, IssueBreakdown } from '../types';

/**
 * Parse markdown review output from cursor-agent
 * Handles the actual cursor-agent output format with emoji headers and code blocks
 */
export function parseMarkdownReview(markdown: string): AIReview {
  log.info('=== STARTING MARKDOWN PARSING ===');
  log.info(`Markdown length: ${markdown.length} characters`);
  log.info(`First 200 chars: ${markdown.substring(0, 200)}`);

  const issues: InlineComment[] = [];
  let grade = 'B';
  let score = 80;
  let summary = '';
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  // Extract overall grade and score
  log.info('--- Extracting grade and score ---');
  // Format 1: "Overall Assessment: B+ (87/100)"
  // Format 2: "Overall Assessment: B+ (Good Quality)" - extract only grade
  let gradeMatch = markdown.match(
    /(?:Overall Assessment|Overall Grade)[:\s]+\*{0,2}([A-F][+-]?)\s*\((\d+)\/100\)\*{0,2}/i
  );
  if (gradeMatch) {
    grade = gradeMatch[1];
    score = parseInt(gradeMatch[2], 10);
    log.info(`✓ Found grade with score: ${grade} (${score}/100)`);
  } else {
    log.info('✗ No grade with score found, trying without numeric score');
    // Try format without numeric score: "B+ (Good Quality)"
    gradeMatch = markdown.match(
      /(?:Overall Assessment|Overall Grade)[:\s]+\*{0,2}([A-F][+-]?)\s*\([^)]+\)\*{0,2}/i
    );
    if (gradeMatch) {
      grade = gradeMatch[1];
      // Estimate score from grade
      const gradeScores: Record<string, number> = {
        'A+': 98, 'A': 95, 'A-': 92,
        'B+': 88, 'B': 85, 'B-': 82,
        'C+': 78, 'C': 75, 'C-': 72,
        'D+': 68, 'D': 65, 'D-': 62,
        'F': 50
      };
      score = gradeScores[grade] || 80;
      log.info(`✓ Found grade without score: ${grade}, estimated score: ${score}`);
    } else {
      log.warning(`✗ No grade found, using defaults: ${grade} (${score})`);
    }
  }

  // Extract summary
  log.info('--- Extracting summary ---');
  let summaryMatch = markdown.match(
    /##\s*📋\s*Code Review Summary\s*([\s\S]*?)(?=\n##|\n---)/i
  );
  if (!summaryMatch) {
    log.info('✗ "Code Review Summary" not found, trying "Executive Summary"');
    summaryMatch = markdown.match(
      /##\s*Executive Summary\s*([\s\S]*?)(?=\n##|\n---)/i
    );
  }
  if (summaryMatch) {
    summary = summaryMatch[1].trim();
    log.info(`✓ Found summary: ${summary.substring(0, 100)}...`);
  } else {
    log.warning('✗ No summary found');
  }

  // Extract strengths
  // Try format: ### **✅ Strengths**
  log.info('--- Extracting strengths ---');
  let strengthsMatch = markdown.match(
    /###\s*(?:\*\*)?✅\s*(?:\*\*)?Strengths(?:\*\*)?\s*([\s\S]*?)(?=\n###|\n##|\n---)/i
  );
  if (strengthsMatch) {
    log.info('✓ Found strengths section');
    const strengthsText = strengthsMatch[1];
    // Try numbered list with bold: 1. **Text** - description
    let strengthItems = strengthsText.match(/^\d+\.\s*\*\*([^*]+)\*\*[^\n]*/gm);
    if (strengthItems) {
      strengthItems.forEach((item) => {
        const match = item.match(/^\d+\.\s*\*\*([^*]+)\*\*/);
        if (match) {
          strengths.push(match[1].trim());
        }
      });
    } else {
      // Try simple numbered list: 1. Text
      strengthItems = strengthsText.match(/^\d+\.\s*(.+)$/gm);
      if (strengthItems) {
        strengthItems.forEach((item) => {
          const cleaned = item.replace(/^\d+\.\s*/, '').trim();
          if (cleaned && !cleaned.startsWith('*')) {
            strengths.push(cleaned);
          }
        });
      }
    }
  }

  // Extract weaknesses
  const weaknessMatch = markdown.match(
    /###\s*Areas for Improvement\s*⚠️\s*([\s\S]*?)(?=\n###|\n##|\n---)/i
  );
  if (weaknessMatch) {
    log.info('✓ Found weaknesses section');
    const weaknessText = weaknessMatch[1];
    const weaknessItems = weaknessText.match(/^\d+\.\s*\*\*([^*]+)\*\*/gm);
    if (weaknessItems) {
      weaknessItems.forEach((item) => {
        const match = item.match(/^\d+\.\s*\*\*([^*]+)\*\*/);
        if (match) {
          weaknesses.push(match[1].trim());
        }
      });
    }
    log.info(`✓ Extracted ${weaknesses.length} weaknesses`);
  } else {
    log.warning('✗ No weaknesses section found');
  }

  // Extract recommendations
  log.info('--- Extracting recommendations ---');
  const recMatch = markdown.match(
    /\*\*Recommendations:\*\*\s*([\s\S]*?)(?=\n---|\n##|\n\*\*Effort)/i
  );
  if (recMatch) {
    log.info('✓ Found recommendations section');
    const recLines = recMatch[1].match(/^\s*\d+\.\s*(.+)$/gm);
    if (recLines) {
      recLines.forEach((line) => {
        const cleaned = line.replace(/^\s*\d+\.\s*/, '').trim();
        if (cleaned) recommendations.push(cleaned);
      });
    }
    log.info(`✓ Extracted ${recommendations.length} recommendations`);
  } else {
    log.warning('✗ No recommendations section found');
  }

  // Extract review metrics
  log.info('--- Extracting metrics ---');
  const metrics = extractMetrics(markdown);

  // Extract issue breakdown
  const issueBreakdown = extractIssueBreakdown(markdown);

  // Extract next steps
  const nextSteps = extractNextSteps(markdown);

  // Extract verdict
  const verdict = extractVerdict(markdown);

  // Parse detailed findings
  parseDetailedIssues(markdown, issues);

  log.info(
    `Parsed ${issues.length} issues from markdown review (${issues.filter((i) => i.severity === 'critical').length} critical, ${issues.filter((i) => i.severity === 'moderate').length} moderate, ${issues.filter((i) => i.severity === 'minor').length} minor)`
  );

  log.info('=== PARSING COMPLETE ===');
  log.info(`Summary: grade=${grade}, score=${score}, strengths=${strengths.length}, weaknesses=${weaknesses.length}, issues=${issues.length}, metrics=${metrics.length}`);

  return {
    inlineComments: issues,
    metrics,
    issueBreakdown,
    nextSteps,
    verdict,
    assessment: {
      grade,
      score,
      summary,
      strengths,
      weaknesses,
      recommendations:
        recommendations.length > 0
          ? recommendations
          : [
              'Review and address critical issues',
              'Improve test coverage',
              'Follow best practices',
            ],
    },
  };
}

/**
 * Extract metrics from markdown
 */
function extractMetrics(markdown: string): Metric[] {
  const metrics: Metric[] = [];

  const metricsTableMatch = markdown.match(
    /##\s*📊\s*(?:\*\*)?(?:Review )?Metrics(?:\*\*)?\s*([\s\S]*?)(?=\n---|\n##)/i
  );
  if (metricsTableMatch) {
    const tableContent = metricsTableMatch[1];

    // Try table format first
    const rowPattern =
      /\|\s*([^|]+?)\s*\*\*([^*]+)\*\*\s*\|\s*([A-F][+-]?)\s*\|\s*(\d+)\s*\|\s*([^|]+)\s*\|/g;
    let rowMatch;
    let foundTable = false;

    while ((rowMatch = rowPattern.exec(tableContent)) !== null) {
      foundTable = true;
      const emoji = rowMatch[1].trim();
      const category = rowMatch[2].trim();
      const grade = rowMatch[3].trim();
      const issueCount = parseInt(rowMatch[4], 10);
      const status = rowMatch[5].trim();

      metrics.push({
        emoji,
        category,
        count: issueCount,
        grade,
        issueCount,
        status,
        threshold: null,
      });
    }

    // Simple list format fallback
    if (!foundTable) {
      const kvMatches = tableContent.match(/^([^:\n]+):\s*(.+)$/gm);
      if (kvMatches) {
        kvMatches.forEach((line) => {
          const [key, value] = line.split(':').map((s) => s.trim());
          if (key && value) {
            metrics.push({
              emoji: '📊',
              category: key,
              count: 0,
              grade: 'N/A',
              issueCount: 0,
              status: value,
              threshold: null,
            });
          }
        });
      }
    }
  }

  log.info(`Parsed ${metrics.length} category metrics from review`);
  return metrics;
}

/**
 * Extract issue breakdown from markdown
 */
function extractIssueBreakdown(markdown: string): IssueBreakdown {
  const issueBreakdown: IssueBreakdown = {
    critical: [],
    moderate: [],
    minor: [],
  };

  const issueBreakdownMatch = markdown.match(
    /##\s*📋\s*Issue Breakdown\s*([\s\S]*?)(?=\n---)/i
  );
  if (issueBreakdownMatch) {
    const breakdownContent = issueBreakdownMatch[1];
    const sections = breakdownContent.split(/###\s*/);

    sections.forEach((section) => {
      if (/^🔴\s*Critical/i.test(section)) {
        const items = section.match(/[-•]\s*\[[ x]\]\s*(.+)/g);
        if (items) {
          items.forEach((item) => {
            const cleaned = item.replace(/[-•]\s*\[[ x]\]\s*/, '').trim();
            if (cleaned) issueBreakdown.critical.push(cleaned);
          });
        }
      } else if (/^🟡\s*Moderate/i.test(section)) {
        const items = section.match(/[-•]\s*\[[ x]\]\s*(.+)/g);
        if (items) {
          items.forEach((item) => {
            const cleaned = item.replace(/[-•]\s*\[[ x]\]\s*/, '').trim();
            if (cleaned) issueBreakdown.moderate.push(cleaned);
          });
        }
      } else if (/^🟢\s*Minor/i.test(section)) {
        const items = section.match(/[-•]\s*\[[ x]\]\s*(.+)/g);
        if (items) {
          items.forEach((item) => {
            const cleaned = item.replace(/[-•]\s*\[[ x]\]\s*/, '').trim();
            if (cleaned) issueBreakdown.minor.push(cleaned);
          });
        }
      }
    });
  }

  log.info(
    `Parsed issue breakdown: ${issueBreakdown.critical.length} critical, ${issueBreakdown.moderate.length} moderate, ${issueBreakdown.minor.length} minor`
  );
  return issueBreakdown;
}

/**
 * Extract next steps from markdown
 */
function extractNextSteps(markdown: string): NextStep[] {
  const nextSteps: NextStep[] = [];

  let nextStepsMatch = markdown.match(
    /##\s*🎯\s*\*\*Action Items\*\*\s*([\s\S]*?)(?=\n---|\n##)/i
  );
  if (!nextStepsMatch) {
    nextStepsMatch = markdown.match(
      /##\s*🎬\s*(?:\*\*)?Next Steps(?:\*\*)?\s*([\s\S]*?)(?=\n---|\n##)/i
    );
  }

  if (nextStepsMatch) {
    const stepsContent = nextStepsMatch[1];

    const subsectionMatches = stepsContent.match(
      /###[^#\n]+\n([\s\S]*?)(?=\n###|$)/g
    );
    if (subsectionMatches) {
      subsectionMatches.forEach((subsection) => {
        const titleMatch = subsection.match(/###\s*[🟡🟢🔴]?\s*\*\*([^*]+)\*\*/);
        const sectionTitle = titleMatch ? titleMatch[1].trim() : 'Action Items';

        const items = subsection.match(
          /^[-•]\s*\[[ x]\]\s*([^-\n]+)(?:-\s*\*\*([^*]+)\*\*)?/gm
        );
        if (items) {
          items.forEach((item) => {
            const match = item.match(
              /^[-•]\s*\[[ x]\]\s*([^-\n]+)(?:-\s*\*\*([^*]+)\*\*)?/
            );
            if (match) {
              nextSteps.push({
                title: match[1].trim(),
                description: sectionTitle,
                effort: match[2] ? match[2].trim() : '',
              });
            }
          });
        }
      });
    } else {
      // No subsections, try numbered list
      const stepItems = stepsContent.match(/^\d+\.\s*\*\*([^*]+)\*\*[^\n]*(.*)$/gm);
      if (stepItems) {
        stepItems.forEach((item) => {
          const match = item.match(/^\d+\.\s*\*\*([^*]+)\*\*[^\n]*(.*)$/);
          if (match) {
            const title = match[1].trim();
            const description = match[2].replace(/^[-:]\s*/, '').trim();
            nextSteps.push({
              title,
              description,
            });
          }
        });
      }
    }
  }

  log.info(`Parsed ${nextSteps.length} next steps/action items`);
  return nextSteps;
}

/**
 * Extract verdict from markdown
 */
function extractVerdict(markdown: string): string | null {
  let verdict: string | null = null;

  // Try format: ## **Verdict: ✅ APPROVE WITH MINOR CHANGES**
  let verdictMatch = markdown.match(
    /##\s*\*\*Verdict:\s*[✅❌]?\s*([^*]+)\*\*/i
  );
  if (!verdictMatch) {
    // Try format: ## 🎬 **Verdict** \n **text**
    verdictMatch = markdown.match(
      /##\s*🎬\s*\*\*Verdict\*\*\s*\n\s*\*\*([^*]+)\*\*/i
    );
  }
  if (!verdictMatch) {
    // Try format: **✅ APPROVE...** or **❌ REQUEST CHANGES**
    verdictMatch = markdown.match(
      /\*\*[✅❌]\s*(APPROVE[^*]+|REQUEST CHANGES[^*]*)\*\*/i
    );
  }
  if (verdictMatch) {
    verdict = verdictMatch[1].trim();
  }

  if (verdict) {
    log.info(`Parsed verdict: ${verdict}`);
  }
  return verdict;
}

/**
 * Parse detailed issues from markdown sections
 * Handles the actual cursor-agent format:
 * #### **1. 🟡 Moderate: Title**
 * or
 * #### 1. **Title** (Line X-Y)
 */
function parseDetailedIssues(markdown: string, issues: InlineComment[]): void {
  log.info('Attempting to parse issues with new format (#### **N. 🟡 Moderate: Title**)');

  // First try new format: #### **N. 🟡 Moderate: Title**
  // Note: Using alternation for emojis instead of character class due to multi-byte chars
  const issuePattern = /####\s*\*\*(\d+)\.\s*(🔴|🟡|🟢)\s*(Critical|Moderate|Minor):\s*([^*]+)\*\*/gi;
  let match;
  let issueCount = 0;

  while ((match = issuePattern.exec(markdown)) !== null) {
    issueCount++;
    log.info(`  Found issue #${issueCount}: ${match[3]} - ${match[4].substring(0, 50)}...`);
    const issueNumber = match[1];
    const severityText = match[3].toLowerCase() as 'critical' | 'moderate' | 'minor';
    const title = match[4].trim();

    // Extract the issue block (from this issue to next #### or ---)
    const startPos = match.index + match[0].length;
    const nextIssueMatch = markdown.substring(startPos).match(/(?:\n####|\n---)/);
    const endPos = nextIssueMatch && nextIssueMatch.index !== undefined ? startPos + nextIssueMatch.index : markdown.length;
    const issueBlock = markdown.substring(startPos, endPos);

    // Extract code block for file path and line number
    const codeBlockMatch = issueBlock.match(/```(\d+):(\d+):([^\n]+)/);
    const file = codeBlockMatch ? codeBlockMatch[3].trim() : 'unknown';
    const line = codeBlockMatch ? parseInt(codeBlockMatch[1], 10) : 1;

    if (codeBlockMatch) {
      log.info(`    Code block found: ${file}:${line}`);
    } else {
      log.warning(`    No code block found for issue #${issueNumber}`);
    }

    // Extract issue description
    const issueMatch = issueBlock.match(/\*\*Issue[:\s]*\*\*\s*([^\n]+)/i);
    const issueDesc = issueMatch ? issueMatch[1].trim() : title;

    // Extract recommendation (everything after **Recommendation:** until next section)
    const recommendationMatch = issueBlock.match(
      /\*\*Recommendation[:\s]*\*\*\s*([\s\S]*?)(?=\n\*\*Impact|\n\*\*Priority|\n---|\n####|$)/i
    );
    let recommendation = recommendationMatch ? recommendationMatch[1].trim() : '';

    // Clean up recommendation - remove code blocks but keep the content
    recommendation = recommendation.replace(/```[a-z]*\n([\s\S]*?)\n```/g, '$1');

    // Extract impact
    const impactMatch = issueBlock.match(/\*\*Impact[:\s]*\*\*\s*([^\n]+)/i);
    const impact = impactMatch ? impactMatch[1].trim() : '';

    // Build message
    let message = issueDesc;
    if (impact) {
      message += `\n\n**Impact:** ${impact}`;
    }

    // Determine effort based on severity
    const effort = severityText === 'critical' ? '30 min' : '15 min';

    // Try to extract startLineCodeOfChangedFileForSuggestion and startLineNumberOfChangedFileForSuggestion
    // These might be in the markdown in format like:
    // **Suggestion Line:** `bookingDetails: any;` (Line 57)
    let startLineCode = '';
    let startLineNumber = line; // Default to the line number

    const suggestionLineMatch = issueBlock.match(/\*\*Suggestion Line[:\s]*\*\*\s*`([^`]+)`\s*\(Line\s+(\d+)\)/i);
    if (suggestionLineMatch) {
      startLineCode = suggestionLineMatch[1].trim();
      startLineNumber = parseInt(suggestionLineMatch[2], 10);
    }

    issues.push({
      file,
      line,
      startLineCodeOfChangedFileForSuggestion: startLineCode,
      startLineNumberOfChangedFileForSuggestion: startLineNumber,
      severity: severityText,
      title,
      message,
      recommendation,
      effort,
      impact: impact || 'Code quality improvement',
      priority: severityText === 'critical' ? 'High' : 'Medium',
      codeExample: '',
    });

    log.info(`    ✓ Issue #${issueNumber} added to list`);
  }

  log.info(`Found ${issueCount} issues with new format`);

  // Fallback: Try old format with sections
  if (issues.length === 0) {
    log.info('No issues found with new format, trying old format (sections)...');
    parseOldFormatIssues(markdown, issues);
  } else {
    log.info('Skipping old format parsing (already found issues with new format)');
  }
}

/**
 * Parse old format issues (fallback)
 */
function parseOldFormatIssues(markdown: string, issues: InlineComment[]): void {
  const sections = [
    {
      regex: /### 🔴 \*\*Critical Issues\*\*\s*([\s\S]*?)(?=\n### |$)/i,
      severity: 'critical' as const,
    },
    {
      regex: /### 🟡 \*\*Moderate Issues\*\*\s*([\s\S]*?)(?=\n### |$)/i,
      severity: 'moderate' as const,
    },
    {
      regex: /### 🟢 \*\*Minor Issues\*\*\s*([\s\S]*?)(?=\n### |$)/i,
      severity: 'minor' as const,
    },
  ];

  sections.forEach(({ regex, severity }) => {
    const sectionMatch = markdown.match(regex);
    if (!sectionMatch) {
      log.info(`  No ${severity} section found`);
      return;
    }

    log.info(`  ✓ Found ${severity} section`);
    const sectionContent = sectionMatch[1];
    const oldIssuePattern =
      /####\s*\d+\.\s*\*\*([^*]+)\*\*\s*\(Line\s+(\d+)(?:-\d+)?\)/gi;
    let oldMatch;

    while ((oldMatch = oldIssuePattern.exec(sectionContent)) !== null) {
      const title = oldMatch[1].trim();
      const line = parseInt(oldMatch[2], 10);
      log.info(`    Found old format issue: ${title} at line ${line}`);

      const afterIssue = sectionContent.substring(oldMatch.index);
      const codeBlockMatch = afterIssue.match(/```(\d+):(\d+):([^\n]+)/);
      const file = codeBlockMatch ? codeBlockMatch[3].trim() : 'unknown';

      const startPos = oldMatch.index + oldMatch[0].length;
      const nextIssueMatch = sectionContent
        .substring(startPos)
        .match(/####\s*\d+\./);
      const endPos = nextIssueMatch && nextIssueMatch.index !== undefined
        ? startPos + nextIssueMatch.index
        : sectionContent.length;
      const issueBlock = sectionContent.substring(startPos, endPos);

      const issueMatch = issueBlock.match(/\*\*Issue:\*\*\s*([^\n]+)/);
      const issueDesc = issueMatch ? issueMatch[1].trim() : '';

      const recommendationMatch = issueBlock.match(
        /\*\*Recommendation:\*\*\s*([\s\S]*?)(?=\*\*Impact|\*\*Priority|\*\*Effort|####|---|\n\n###)/
      );
      const recommendation = recommendationMatch
        ? recommendationMatch[1].trim()
        : '';

      const impactMatch = issueBlock.match(/\*\*Impact:\*\*\s*([^\n]+)/);
      const impact = impactMatch ? impactMatch[1].trim() : '';

      let message = title;
      if (issueDesc) {
        message = `${issueDesc}`;
      }
      if (impact) {
        message += `\n\n**Impact:** ${impact}`;
      }

      const effort = severity === 'critical' ? '30 min' : '15 min';

      // Try to extract startLineCodeOfChangedFileForSuggestion and startLineNumberOfChangedFileForSuggestion
      let startLineCode = '';
      let startLineNumber = line; // Default to the line number

      const suggestionLineMatch = issueBlock.match(/\*\*Suggestion Line[:\s]*\*\*\s*`([^`]+)`\s*\(Line\s+(\d+)\)/i);
      if (suggestionLineMatch) {
        startLineCode = suggestionLineMatch[1].trim();
        startLineNumber = parseInt(suggestionLineMatch[2], 10);
      }

      issues.push({
        file,
        line,
        startLineCodeOfChangedFileForSuggestion: startLineCode,
        startLineNumberOfChangedFileForSuggestion: startLineNumber,
        severity,
        title,
        message,
        recommendation,
        effort,
        impact: impact || 'Code quality improvement',
        priority: severity === 'critical' ? 'High' : 'Medium',
        codeExample: '',
      });

      log.info(`    ✓ Old format issue added`);
    }
  });

  log.info(`Found ${issues.length} issues with old format`);
}

