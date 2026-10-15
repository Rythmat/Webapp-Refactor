import { CHORD_SPELLING_FIXES } from '@/curriculum/engine/openingTree';
import {
  CHORD_TYPES,
  COMPLEXITY_LEVELS,
  DEGREE_PATTERN,
  MAX_CHORDS,
  MIN_CHORDS,
} from '@/curriculum/engine/progressionValidation';

/**
 * The rules a chord progression keeps, as data the API copies
 * (`progressionRules.generated.json`). The console, the offline mock and
 * the repo content server all check a save with
 * src/curriculum/engine/progressionValidation.ts, which reads Prism's chord
 * table and so cannot be copied. `progressionRules.test.ts` regenerates the
 * file and fails if the committed copy has drifted.
 *
 * What the API does with it (docs/console-backend-integration.md):
 *  - every chord is `<degree> <type>`: one space, the degree matching
 *    `degreePattern`, the type one of `chordTypes`;
 *  - `minChords` to `maxChords` chords;
 *  - no two progressions with the same chords (`DUPLICATE_PROGRESSION`),
 *    compared after each chord is trimmed, its inner spaces collapsed to
 *    one, and `spellingFixes` applied;
 *  - `progression`, `chordCount`, `startingChord` and `startingDegree`
 *    follow the chords (`derivedFields`);
 *  - a new id is above the highest id ever issued (the seed export's
 *    `progressionIdHighWater`), never reused.
 *
 * `complexityLevels` are the values the library uses; the console suggests
 * one from the chords but does not refuse another.
 */
export function buildProgressionRules() {
  return {
    minChords: MIN_CHORDS,
    maxChords: MAX_CHORDS,
    degreePattern: DEGREE_PATTERN.source,
    complexityLevels: [...COMPLEXITY_LEVELS],
    derivedFields: {
      progression: "chords.join(' - ')",
      chordCount: 'chords.length',
      startingChord: "chords[0] ?? ''",
      startingDegree: "chords[0]?.split(/\\s+/)[0] ?? ''",
    },
    spellingFixes: { ...CHORD_SPELLING_FIXES },
    chordTypes: [...CHORD_TYPES],
  };
}
