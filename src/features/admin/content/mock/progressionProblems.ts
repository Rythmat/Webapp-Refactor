import {
  type ProgressionCheckOptions,
  validateProgression,
} from '@/curriculum/engine/progressionValidation';
import type { ValidationProblem } from '@/hooks/data/admin/useAdminContent';
import type { Body } from './mockKinds';

/**
 * A chord progression save, held to the library's rules (the shared
 * validator, src/curriculum/engine/progressionValidation.ts) and answered
 * in the contract's shape: one `ValidationProblem` per issue, at its body
 * path, so the console marks the field it belongs to.
 *
 * A duplicate is `DUPLICATE_PROGRESSION`, naming the progression it
 * copies as its `target`; every other rule (a chord Prism does not know,
 * too few or too many chords, derived fields that disagree with the
 * chords, an id handed out before) is `INVALID_BODY`. A problem the stored
 * progression already had is a warning, so it never refuses a save that
 * does not touch it.
 */
export function progressionProblems(
  slug: string,
  body: Body,
  options: ProgressionCheckOptions,
): ValidationProblem[] {
  return validateProgression(body, options).map((issue) => ({
    code: issue.rule === 'duplicate' ? 'DUPLICATE_PROGRESSION' : 'INVALID_BODY',
    slug,
    detail: issue.message,
    severity: issue.severity,
    path: issue.path,
    ...(issue.rule === 'duplicate' && issue.ids?.length
      ? { target: `progression:${issue.ids[0]}` }
      : {}),
  }));
}
