/**
 * GitLab API interactions
 */

import * as https from 'https';
import { CONFIG } from '../constants';
import { log } from '../utils/logger';
import { STATS } from '../utils/stats';
import {
  MRData,
  DiffData,
  HTTPSRequestOptions,
  GitLabChange,
  GitLabDiscussion,
  DiffDataV2,
} from '../types';

/**
 * Make HTTPS request (Promise-based)
 */
export function httpsRequest(url: string, options: HTTPSRequestOptions = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'PRIVATE-TOKEN': CONFIG.gitlabToken,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(
        typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body)
      );
    }

    req.end();
  });
}

/**
 * Fetch MR data from GitLab
 */
export async function fetchMRData(): Promise<MRData> {
  try {
    const url = `${CONFIG.gitlabUrl}/api/v4/projects/${CONFIG.projectId}/merge_requests/${CONFIG.mrIid}`;
    const mrData = await httpsRequest(url);

    return {
      title: mrData.title,
      author: mrData.author.name,
      baseSha: mrData.diff_refs.base_sha,
      startSha: mrData.diff_refs.start_sha,
      headSha: mrData.sha,
    };
  } catch (error) {
    log.error(`Failed to fetch MR data: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Get changed files from MR
 */
export async function getChangedFiles(): Promise<string[]> {
  try {
    const url = `${CONFIG.gitlabUrl}/api/v4/projects/${CONFIG.projectId}/merge_requests/${CONFIG.mrIid}/changes`;
    const data = await httpsRequest(url);

    const changedFiles = data.changes
      // .filter((change: any) => /\.(ts|tsx)$/.test(change.new_path))
      .map((change: any) => change.new_path);

    return changedFiles;
  } catch (error) {
    log.error(`Failed to fetch changed files: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Get MR diff for review
 */
export async function getMRDiff(): Promise<DiffData | null> {
  try {
    const url = `${CONFIG.gitlabUrl}/api/v4/projects/${CONFIG.projectId}/merge_requests/${CONFIG.mrIid}/changes`;
    const response = await httpsRequest(url);

    if (!response.changes || response.changes.length === 0) {
      log.warning('No changes found in MR');
      return null;
    }

    // Create a unified diff file for cursor-agent
    const diffContent = response.changes
      .map((change: any) => {
        const header = `diff --git a/${change.old_path} b/${change.new_path}
--- a/${change.old_path}
+++ b/${change.new_path}`;
        return `${header}\n${change.diff}`;
      })
      .join('\n\n');

    return {
      diffContent,
      fileCount: response.changes.length,
      changes: response.changes,
    };
  } catch (error) {
    log.error(`Failed to fetch MR diff: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Post inline comment to GitLab
 */
export async function postInlineComment(filePath: string, lineNumber: number, commentBody: string, mrData: MRData, oldLine?: number | null): Promise<boolean> {
  STATS.inlineTotal++;

  // Build position object based on whether it's an added line or modified/context line
  const position: any = {
    position_type: 'text',
    base_sha: mrData.baseSha,
    start_sha: mrData.startSha,
    head_sha: mrData.headSha,
  };

  // For added lines (oldLine is null), only set new_path and new_line
  // For modified/context lines, set old_path, new_path, old_line, and new_line
  if (oldLine === null || oldLine === undefined) {
    // Added line - only new_path and new_line
    position.new_path = filePath;
    position.new_line = lineNumber;
  } else {
    // Modified or context line - GitLab requires both old_path and new_path
    position.old_path = filePath;
    position.new_path = filePath;
    position.old_line = oldLine;
    position.new_line = lineNumber;
  }

  const payload = {
    body: commentBody,
    position,
  };

  console.log('payload', JSON.stringify(payload, null, 2));

  try {
    const url = `${CONFIG.gitlabUrl}/api/v4/projects/${CONFIG.projectId}/merge_requests/${CONFIG.mrIid}/discussions`;
    await httpsRequest(url, { method: 'POST', body: payload });
    STATS.inlineSuccess++;
    return true;
  } catch (error) {
    // Line might not be in diff
    log.error(`Failed to post inline comment: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Post general note to GitLab MR
 */
export async function postGeneralNote(comment: string): Promise<boolean> {
  try {
    const url = `${CONFIG.gitlabUrl}/api/v4/projects/${CONFIG.projectId}/merge_requests/${CONFIG.mrIid}/notes`;
    await httpsRequest(url, { method: 'POST', body: { body: comment } });
    return true;
  } catch (error) {
    log.error(`Failed to post general comment: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Get existing discussions (comments) on the MR
 */
export async function getExistingDiscussions(mrIid: string): Promise<GitLabDiscussion[]> {
  try {
    const url = `${CONFIG.gitlabUrl}/api/v4/projects/${CONFIG.projectId}/merge_requests/${mrIid}/discussions`;
    const discussions = await httpsRequest(url);
    return discussions;
  } catch (error) {
    log.error(`Failed to fetch discussions: ${(error as Error).message}`);
    return [];
  }
}

/**
 * Get complete MR diff for review
 * 
 * Always fetches the full merge request diff.
 */
export async function getDiffForReview(): Promise<DiffDataV2> {
  log.info('📋 Fetching complete MR diff...');
  const mrDiffData = await getMRDiff();

  if (!mrDiffData) {
    throw new Error('Failed to fetch MR diff');
  }

  return {
    changes: mrDiffData.changes,
    strategy: 'full-mr',
    fileCount: mrDiffData.fileCount,
  };
}

/**
 * Create unified diff content from changes array
 */
export function createUnifiedDiff(changes: GitLabChange[]): string {
  return changes
    .map((change) => {
      const header = `diff --git a/${change.old_path} b/${change.new_path}
--- a/${change.old_path}
+++ b/${change.new_path}`;
      return `${header}\n${change.diff}`;
    })
    .join('\n\n');
}

