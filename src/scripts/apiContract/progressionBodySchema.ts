// ─────────────────────────────────────────────────────────────────────────
//  The `chord_progression` body, for the content API to validate with.
//
//  A copy of `chordProgressionBodySchema` in
//  src/features/admin/content/mock/progressionSchema.ts, which is held to the
//  library's type (`ChordProgressionEntry`). That file imports the type from
//  the app, so the API cannot copy it; this one imports only zod.
//  `progressionBodySchema.test.ts` fails when the two part ways, and runs
//  every library entry through both.
//
//  The rules a body must also keep (chord spellings Prism knows, 2 to 7
//  chords, no second copy of another progression's chords, derived fields
//  that follow the chords, new ids above the high-water mark) are data in
//  `progressionRules.generated.json`. See docs/console-backend-integration.md.
//  manifest.json records this file's hash.
// ─────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

export const chordProgressionBodySchema = z
  .object({
    /** The identity: a number, so the item's slug is `String(id)`. */
    id: z.number().int().nonnegative(),
    /** Derived: `chords.join(' - ')`. */
    progression: z.string(),
    /** Each chord a scale degree and a Prism chord type: "2 minor7", "b7 major". */
    chords: z.array(z.string()),
    /** Derived: `chords.length`. */
    chordCount: z.number().int().nonnegative(),
    /** Derived: `chords[0]`, or '' when there are none. */
    startingChord: z.string(),
    /** Derived: the first chord's degree ("b7" of "b7 major"), or ''. */
    startingDegree: z.string(),
    complexity: z.string(),
    vibes: z.array(z.string()),
    styles: z.array(z.string()),
    /** The source sheet's artist text, kept as written. */
    artist: z.string(),
    /** The source sheet's song text, kept as written. */
    song: z.string(),
    /** Song ids: the progression owns its link to the songs that use it. */
    songIds: z.array(z.string()).optional(),
  })
  .strict();

export type ChordProgressionBody = z.infer<typeof chordProgressionBodySchema>;
