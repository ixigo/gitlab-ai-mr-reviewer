/**
 * Logging utilities with colored output
 */

import { colors } from '../constants';

export const log = {
  info: (msg: string): void => console.log(`${colors.blue}${msg}${colors.reset}`),
  success: (msg: string): void => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  warning: (msg: string): void => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  error: (msg: string): void => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  section: (msg: string): void => {
    console.log(`\n${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}${msg}${colors.reset}`);
    console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}\n`);
  },
};

