/**
 * Severity mapping and related constants
 */

import { SeverityMap, SeverityEmoji, EffortMap, GradeMap } from '../types';

export const SEVERITY_MAP: SeverityMap = {
  high: 'critical',
  error: 'critical',
  medium: 'moderate',
  warning: 'moderate',
  low: 'minor',
  info: 'minor',
};

export const SEVERITY_EMOJI: SeverityEmoji = {
  critical: '🔴',
  moderate: '🟡',
  minor: '🟢',
};

export const EFFORT_MAP: EffortMap = {
  critical: '30 minutes',
  moderate: '15 minutes',
  minor: '5 minutes',
};

export const GRADE_MAP: GradeMap = {
  90: 'A+',
  85: 'A',
  80: 'A-',
  75: 'B+',
  70: 'B',
  65: 'B-',
  60: 'C+',
  55: 'C',
  50: 'C-',
  0: 'D',
};

