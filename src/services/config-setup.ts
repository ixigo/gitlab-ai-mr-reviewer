/**
 * Setup configuration for cursor-agent
 * Copies the appropriate config to .cursor/ directory
 */

import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from '../constants';
import { log } from '../utils/logger';

/**
 * Get the config source directory based on config type
 */
function getConfigSourcePath(configType: string): string {
  // Check if it's a built-in config type
  const builtInConfigs: Record<string, string> = {
    'next-ts': path.join(__dirname, '../../config/next-ts'),
    'java-gradle': path.join(__dirname, '../../config/java-gradle'),
    'java-maven': path.join(__dirname, '../../config/java-maven'),
    'kotlin': path.join(__dirname, '../../config/kotlin'),
  };

  if (builtInConfigs[configType]) {
    return builtInConfigs[configType];
  }

  // Otherwise treat it as a custom path
  return configType;
}

/**
 * Setup cursor-agent config for the project
 * Copies cli.json and rules from config directory to project's .cursor/
 */
export function setupCursorConfig(projectRoot: string = process.cwd()): boolean {
  const configType = CONFIG.configType;

  if (!configType) {
    log.error('No config type detected');
    throw new Error('Invalid config type');
  }

  log.info(`Setting up cursor-agent config: ${configType}`);

  try {
    // Get source config directory
    const sourceConfigDir = getConfigSourcePath(configType);

    if (!fs.existsSync(sourceConfigDir)) {
      log.error(`Config directory not found: ${sourceConfigDir}`);
      throw new Error(`Invalid config type: ${configType}`);
    }

    // Ensure .cursor directory exists in project root
    const targetCursorDir = path.join(projectRoot, '.cursor');
    if (!fs.existsSync(targetCursorDir)) {
      fs.mkdirSync(targetCursorDir, { recursive: true });
    }

    // Note: cursor-agent doesn't use cli.json - it uses command line args
    // Skipping cli.json copy as it causes cursor-agent to fail with schema validation error
    log.info('Skipping cli.json (cursor-agent uses command line args only)');

    // Copy rules directory if it exists
    const sourceRulesDir = path.join(sourceConfigDir, 'rules');
    const targetRulesDir = path.join(targetCursorDir, 'rules');

    if (fs.existsSync(sourceRulesDir)) {
      // Create target rules directory
      if (!fs.existsSync(targetRulesDir)) {
        fs.mkdirSync(targetRulesDir, { recursive: true });
      }

      // Copy all .mdc files from rules directory
      const ruleFiles = fs.readdirSync(sourceRulesDir).filter(f => f.endsWith('.mdc'));

      ruleFiles.forEach(file => {
        const sourceFile = path.join(sourceRulesDir, file);
        const targetFile = path.join(targetRulesDir, file);
        fs.copyFileSync(sourceFile, targetFile);
      });

      log.success(`Copied ${ruleFiles.length} rule files to ${targetRulesDir}`);
    } else {
      log.warning(`Rules directory not found at ${sourceRulesDir}`);
    }

    log.success(`Config setup complete for: ${configType}`);
    return true;

  } catch (error) {
    log.error(`Failed to setup config: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Cleanup cursor config (optional - call after review if needed)
 */
export function cleanupCursorConfig(projectRoot: string = process.cwd()): void {
  const targetCursorDir = path.join(projectRoot, '.cursor');

  try {
    // Only remove cli.json and rules, keep reviews directory
    const cliJsonPath = path.join(targetCursorDir, 'cli.json');
    const rulesDir = path.join(targetCursorDir, 'rules');

    if (fs.existsSync(cliJsonPath)) {
      fs.unlinkSync(cliJsonPath);
      log.info('Removed cli.json');
    }

    if (fs.existsSync(rulesDir)) {
      fs.rmSync(rulesDir, { recursive: true, force: true });
      log.info('Removed rules directory');
    }
  } catch (error) {
    log.warning(`Failed to cleanup config: ${(error as Error).message}`);
  }
}

export { getConfigSourcePath };

