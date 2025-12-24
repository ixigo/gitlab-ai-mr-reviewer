/**
 * Execute shell commands
 */

import { execSync, ExecSyncOptions } from 'child_process';

interface ExecOptions extends ExecSyncOptions {
  silent?: boolean;
  ignoreError?: boolean;
}

/**
 * Execute shell command with visible output
 */
export function exec(command: string, options: ExecOptions = {}): string {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options,
    }) as string;
  } catch (error) {
    if (!options.ignoreError) {
      throw error;
    }
    return '';
  }
}

/**
 * Delay execution for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

