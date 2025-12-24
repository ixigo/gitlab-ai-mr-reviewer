#!/usr/bin/env node

/**
 * Automated MR Code Review System - Main Entry Point
 *
 * Uses cursor-agent CLI tool for AI-powered code review with Claude Sonnet 4.5
 * Posts inline comments and general assessment to GitLab MR
 *
 * Requirements:
 * - Node.js 18+
 * - cursor-agent CLI (installed via npm or curl)
 * - CURSOR_API_KEY environment variable
 * - GitLab API access (GITLAB_TOKEN or CI_JOB_TOKEN)
 */

// Load environment variables from .env file for local development
import 'dotenv/config';

import * as path from 'path';
import * as fs from 'fs';
import { CONFIG, colors } from './constants';
import { log } from './utils/logger';
import { STATS } from './utils/stats';
import { checkPrerequisites } from './services/prerequisites';
import { fetchMRData, getDiffForReview } from './api/gitlab';
import { saveChangedFiles, updateReviewDataWithStats } from './services/file-manager';
import { runCursorAgentReview } from './review/cursor-agent';
import { runThreePhaseReview } from './review/three-phase-reviewer';
import { analyzeAIReview } from './review/analyzer';
import { postAIInlineComments } from './comments/inline';
import { postGeneralComment } from './comments/general';
import { getReviewContext } from './services/review-context';
import { logReviewSummary } from './review/comment-formatter';
import { calculateScore, checkPassingCriteria, GRADING_CONFIG } from './constants/grading';
import { createUnifiedDiff } from './api/gitlab';

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    // Step 0: Check tech stack
    if (!CONFIG.configType) {
      log.section('⚠️  NO MATCHING TECH STACK DETECTED');
      log.warning('This project does not match any of the supported tech stacks.');
      log.info('Supported tech stacks:');
      log.info('  • java-gradle: Java projects using Gradle build system');
      log.info('  • next-ts: Requires package.json with "next" and "react" dependencies');
      log.info('  • java-maven: Requires pom.xml and Java source files');
      console.log('');
      log.info('Skipping code review for this project.');
      console.log('');
      process.exit(0);
    }

    log.info(`Using tech stack: ${colors.yellow}${CONFIG.configType}${colors.reset}`);
    console.log('');

    // Step 1: Check prerequisites
    checkPrerequisites();

    // Step 1.5: Get review context
    log.section('🔍 GETTING REVIEW CONTEXT');
    await getReviewContext();
    console.log('');

    // Step 2: Fetch MR data and perform AI code review
    log.section('[STEP 1/3] Fetching MR data and performing AI code review');
    const mrData = await fetchMRData();

    log.success(`MR Title: ${colors.yellow}${mrData.title}${colors.reset}`);
    log.success(`Author: ${colors.yellow}${mrData.author}${colors.reset}`);
    log.success(
      `Base SHA: ${colors.yellow}${mrData.baseSha.substring(0, 8)}...${colors.reset}`
    );
    log.success(
      `Head SHA: ${colors.yellow}${mrData.headSha.substring(0, 8)}...${colors.reset}`
    );
    console.log('');

    // Fetch complete MR diff
    log.info(`Fetching complete MR diff...`);
    const diffData = await getDiffForReview();
    
    log.success(`Strategy: ${colors.yellow}${diffData.strategy}${colors.reset}`);
    log.success(
      `Found ${colors.yellow}${diffData.fileCount}${colors.reset} files changed`
    );
    console.log('');

    const changedFiles = diffData.changes.map(c => c.new_path);

    // Save changed files list for artifacts
    saveChangedFiles(changedFiles);

    // Load existing discussions for duplicate filtering
    const existingDiscussionsPath = path.join(CONFIG.outputDir, 'existing-discussions.json');
    let existingDiscussions: any[] = [];
    try {
      const existingData = JSON.parse(fs.readFileSync(existingDiscussionsPath, 'utf-8'));
      existingDiscussions = existingData.inlineComments || [];
      log.info(`Loaded ${existingDiscussions.length} existing discussions for duplicate filtering`);
    } catch (error) {
      log.info('No existing discussions found');
    }
    console.log('');

    // Create unified diff content for three-phase review
    const diffContent = createUnifiedDiff(diffData.changes);

    // Run three-phase hybrid review (AI finds issues → Node.js calculates lines → AI filters duplicates)
    let aiReview;
    try {
      aiReview = await runThreePhaseReview(
        diffContent,
        existingDiscussions,
        process.cwd() // Project root directory
      );
    } catch (error) {
      log.warning(`Three-phase review failed: ${(error as Error).message}`);
      log.info('Falling back to single-phase review...');
      aiReview = await runCursorAgentReview(changedFiles, mrData);
    }

    if (!aiReview) {
      log.warning(
        'No AI review data available - skipping inline and general comments'
      );
      process.exit(0);
    }

    // Analyze AI review results from extracted JSON
    analyzeAIReview(aiReview);
    console.log('');

    log.section('📤 PUBLISHING REVIEW TO GITLAB MR');
    log.info(
      'Using extracted JSON data from .cursor/reviews/review-data.json'
    );
    console.log('');

    // Step 2: Post AI-generated inline comments from extracted JSON issues
    const successfullyPostedComments = await postAIInlineComments(aiReview, mrData);
    
    // Use existing discussions already loaded earlier
    const existingIssues = existingDiscussions;

    // Combine existing + successfully posted issues for accurate grading
    const allActiveIssues = [...existingIssues, ...successfullyPostedComments];
    
    // Calculate grade and score based on existing + successfully posted issues (POST-POSTING grading)
    log.section('📊 CALCULATING GRADE AND SCORE');
    log.info('Calculating score based on existing discussions + successfully posted issues...');
    log.info(`  - Existing issues: ${existingIssues.length}`);
    log.info(`  - New posted issues: ${successfullyPostedComments.length}`);
    log.info(`  - Total active issues: ${allActiveIssues.length}`);
    console.log('');
    
    // Update metrics to reflect only successfully posted comments
    const updatedMetrics = aiReview.metrics.map((m: any) => {
      const successCount = successfullyPostedComments.filter((issue: any) => {
        if (m.category === 'Critical Issues') return issue.severity === 'critical';
        if (m.category === 'Moderate Issues') return issue.severity === 'moderate';
        if (m.category === 'Minor Issues') return issue.severity === 'minor';
        return false;
      }).length;
      
      const existingCount = existingIssues.filter((issue: any) => {
        if (m.category === 'Critical Issues') return issue.severity === 'critical';
        if (m.category === 'Moderate Issues') return issue.severity === 'moderate';
        if (m.category === 'Minor Issues') return issue.severity === 'minor';
        return false;
      }).length;
      
      return {
        ...m,
        count: existingCount + successCount
      };
    });
    
    const gradingResult = calculateScore(allActiveIssues, updatedMetrics);
    
    log.success(`Grade: ${colors.yellow}${gradingResult.grade}${colors.reset}`);
    log.success(`Score: ${colors.yellow}${gradingResult.score}/100${colors.reset}`);
    log.info(`Grading breakdown:`);
    gradingResult.breakdown.deductions.forEach((d: any) => {
      log.info(`  - ${d.category}: -${d.deductions} points (${d.issues.critical}C/${d.issues.moderate}M/${d.issues.minor}m)`);
    });
    console.log('');

    // Update aiReview with calculated grade, score, and updated metrics
    aiReview.assessment.grade = gradingResult.grade;
    aiReview.assessment.score = gradingResult.score;
    aiReview.metrics = updatedMetrics;
    aiReview.inlineComments = successfullyPostedComments; // Update to reflect only posted comments

    // Step 3: Post general comment with updated metrics
    await postGeneralComment(mrData, aiReview);
    log.success('Posted general review comment');
    console.log('');

    // Update review-data.json with execution statistics and calculated grade
    const reviewJsonPath =
      (aiReview as any)._reviewJsonPath ||
      path.join(CONFIG.outputDir, 'review-data.json');
    
    // Update the saved JSON with calculated grade/score and metrics
    try {
      const reviewData = JSON.parse(fs.readFileSync(reviewJsonPath, 'utf-8'));
      reviewData.grade = gradingResult.grade;
      reviewData.score = gradingResult.score;
      reviewData.assessment.grade = gradingResult.grade;
      reviewData.assessment.score = gradingResult.score;
      reviewData.gradingBreakdown = gradingResult.breakdown;
      reviewData.metrics = updatedMetrics; // Update with accurate metrics
      reviewData.issues = successfullyPostedComments; // Update with successfully posted issues only
      fs.writeFileSync(reviewJsonPath, JSON.stringify(reviewData, null, 2));
      log.success(`Updated review data with calculated grade and score`);
    } catch (error) {
      log.warning(`Failed to update review data with grade: ${(error as Error).message}`);
    }
    
    updateReviewDataWithStats(reviewJsonPath);

    // Summary (use successfully posted count, not total AI-found issues)
    logReviewSummary(
      diffData,
      successfullyPostedComments.length,
      STATS.inlineSuccess,
      STATS.inlineTotal - STATS.inlineSuccess
    );
    
    log.section('REVIEW COMPLETE');
    log.success(`Step 1: AI code review completed`);
    log.success(
      `Step 2: Posted ${STATS.inlineSuccess}/${STATS.inlineTotal} inline comments`
    );
    log.success(`Step 3: Posted general review with AI assessment`);
    console.log('');

    const projectPath = CONFIG.projectId.replace(/%2F/g, '/');
    console.log(
      `🔗 View MR: ${colors.yellow}${CONFIG.gitlabUrl}/${projectPath}/-/merge_requests/${CONFIG.mrIid}${colors.reset}`
    );
    console.log('');

    // Check if review passes thresholds
    log.section('🎯 CHECKING PASSING CRITERIA');
    const issueCount = {
      critical: STATS.criticalCount,
      moderate: STATS.moderateCount,
      minor: STATS.minorCount,
    };
    
    const passingCheck = checkPassingCriteria(
      gradingResult.score,
      gradingResult.grade,
      issueCount
    );

    console.log(
      `Review Type: ${colors.yellow}Complete MR Diff${colors.reset}`
    );
    console.log(
      `Overall Grade: ${colors.yellow}${gradingResult.grade} (${gradingResult.score}/100)${colors.reset}`
    );
    console.log(
      `Passing Thresholds:`
    );
    console.log(
      `  - Minimum Score: ${GRADING_CONFIG.passingThresholds.minimumScore}`
    );
    console.log(
      `  - Minimum Grade: ${GRADING_CONFIG.passingThresholds.minimumGrade}`
    );
    console.log(
      `  - Max Critical Issues: ${GRADING_CONFIG.passingThresholds.criticalIssuesMax}`
    );
    console.log(
      `  - Max Moderate Issues: ${GRADING_CONFIG.passingThresholds.moderateIssuesMax}`
    );
    console.log('');

    if (passingCheck.passed) {
      console.log(
        `${colors.green}✅ REVIEW PASSED${colors.reset}`
      );
      log.success(`MR meets all quality thresholds!`);
      console.log('');
      process.exit(0);
    } else {
      console.log(
        `${colors.red}❌ REVIEW FAILED${colors.reset}`
      );
      log.error(`MR does not meet quality thresholds:`);
      passingCheck.failures.forEach(failure => {
        log.error(`  - ${failure}`);
      });
      console.log('');

      if (CONFIG.mustPassReviewQuality) {
        log.error('Quality gate enforcement is enabled - failing CI pipeline');
        process.exit(1);
      } else {
        log.warning('Quality gate enforcement is disabled - allowing pipeline to pass');
        log.warning('Review comments have been posted, but merge is not blocked');
        process.exit(0);
      }
    }
  } catch (error) {
    log.error(`Review failed: ${(error as Error).message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run main function
main();

