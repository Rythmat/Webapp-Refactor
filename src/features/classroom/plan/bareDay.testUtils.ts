import { PHASES } from '../phases';
import type { Day } from '../types';
import { newBlankDay } from './newBlankDay';

/**
 * A new Day without its starter check-in and exit question: every cell
 * truly empty, for tests about writing interactions into cells.
 */
export const bareDay = (label?: string): Day => {
  const day = newBlankDay(label);
  for (const phase of PHASES) delete day.cells[phase].presentation.interactions;
  return day;
};
