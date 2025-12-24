/**
 * Service to manage existing GitLab MR discussions
 */

import * as fs from 'fs';
import * as path from 'path';
import { getExistingDiscussions } from '../api/gitlab';
import { GitLabDiscussion, GitLabNote } from '../types';
import { log } from '../utils/logger';
import { CONFIG } from '../constants';

export interface ExistingDiscussionComment {
  id: string;
  file: string | null;
  line: number | null;
  body: string;
  author: string;
  createdAt: string;
  isSystemNote: boolean;
}

export interface ExistingDiscussionsData {
  mrIid: string;
  fetchedAt: string;
  totalDiscussions: number;
  comments: ExistingDiscussionComment[];
}

/**
 * Fetch existing discussions from GitLab and store them
 */
export async function fetchAndStoreExistingDiscussions(
  mrIid: string,
  outputDir: string = CONFIG.outputDir
): Promise<string> {
  log.info('📋 Fetching existing MR discussions...');

  try {
    const discussions = await getExistingDiscussions(mrIid);
    log.info(`Found ${discussions.length} discussions`);

    // Transform discussions into a more usable format
    const comments: ExistingDiscussionComment[] = [];

    discussions.forEach((discussion: GitLabDiscussion) => {
      if (!discussion.notes || discussion.notes.length === 0) {
        return;
      }

      // Process each note in the discussion
      discussion.notes.forEach((note: GitLabNote) => {
        // Extract position info if available (for inline comments)
        const position = (note as any).position;

        comments.push({
          id: `${discussion.id}-${note.id}`,
          file: position?.new_path || null,
          line: position?.new_line || null,
          body: note.body,
          author: note.author.username,
          createdAt: note.created_at,
          isSystemNote: note.system,
        });
      });
    });

    // Filter out system notes
    const userComments = comments.filter(c => !c.isSystemNote);

    const discussionsData: ExistingDiscussionsData = {
      mrIid,
      fetchedAt: new Date().toISOString(),
      totalDiscussions: discussions.length,
      comments: userComments,
    };

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save to file
    const filePath = path.join(outputDir, 'existing-discussions.json');
    fs.writeFileSync(filePath, JSON.stringify(discussionsData, null, 2));

    log.success(`Saved ${userComments.length} existing comments to ${filePath}`);
    log.info(`  - Inline comments: ${userComments.filter(c => c.file && c.line).length}`);
    log.info(`  - General comments: ${userComments.filter(c => !c.file || !c.line).length}`);

    return filePath;
  } catch (error) {
    log.error(`Failed to fetch existing discussions: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Check if a similar comment already exists at the same location
 */
export function isSimilarCommentExists(
  file: string,
  line: number,
  commentBody: string,
  existingComments: ExistingDiscussionComment[],
  lineToleranceRange: number = 3
): boolean {
  // Filter comments for the same file
  const fileComments = existingComments.filter(c => c.file === file);

  if (fileComments.length === 0) {
    return false;
  }

  // Check for similar comments at nearby lines
  for (const existingComment of fileComments) {
    if (!existingComment.line) continue;

    // Check if line is within tolerance range
    const lineDiff = Math.abs(existingComment.line - line);
    if (lineDiff > lineToleranceRange) {
      continue;
    }

    // Check for similar content (basic similarity check)
    const similarity = calculateSimilarity(commentBody, existingComment.body);
    if (similarity > 0.6) {
      // 60% similarity threshold
      log.info(`  ⚠️  Similar comment found at ${file}:${existingComment.line} (${Math.round(similarity * 100)}% similar)`);
      return true;
    }
  }

  return false;
}

/**
 * Calculate text similarity (simple Jaccard similarity)
 */
function calculateSimilarity(text1: string, text2: string): number {
  // Normalize text
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3); // Only words longer than 3 chars

  const words1 = new Set(normalize(text1));
  const words2 = new Set(normalize(text2));

  if (words1.size === 0 && words2.size === 0) return 1;
  if (words1.size === 0 || words2.size === 0) return 0;

  // Calculate Jaccard similarity
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Load existing discussions from file
 */
export function loadExistingDiscussions(filePath: string): ExistingDiscussionsData | null {
  try {
    if (!fs.existsSync(filePath)) {
      log.warning(`Existing discussions file not found: ${filePath}`);
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    log.error(`Failed to load existing discussions: ${(error as Error).message}`);
    return null;
  }
}

