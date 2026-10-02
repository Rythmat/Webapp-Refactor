import { z } from 'zod';
import type { ChordProgressionEntry } from '@/curriculum/data/chordProgressionLibrary';

/**
 * A chord progression's body as the library holds it: one entry of
 * `CHORD_PROGRESSION_LIBRARY` (src/curriculum/data/chordProgressionLibrary.ts),
 * key for key, and nothing else.
 *
 * The contract has no generated schema for this kind yet (the handoff's
 * `chord_progression` stands as written), so the content API takes any
 * body. Repo mode cannot: a save is written straight into that typed
 * file, which students' vibe and style engines read, and a body with a
 * string where the chords go, a key missing or a key the type lacks would
 * leave the repo failing `tsc -b`. So the mock holds a repo-mode save to
 * this (validation.ts `schemaFor`), and the check below holds this to the
 * type: change one and the other has to follow.
 */
export const chordProgressionBodySchema = z
  .object({
    id: z.number().int().nonnegative(),
    progression: z.string(),
    chords: z.array(z.string()),
    chordCount: z.number().int().nonnegative(),
    startingChord: z.string(),
    startingDegree: z.string(),
    complexity: z.string(),
    vibes: z.array(z.string()),
    styles: z.array(z.string()),
    artist: z.string(),
    song: z.string(),
    songIds: z.array(z.string()).optional(),
  })
  .strict();

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/** Fails to compile when the schema and `ChordProgressionEntry` part ways. */
const matchesTheType: Same<
  z.infer<typeof chordProgressionBodySchema>,
  ChordProgressionEntry
> = true;
void matchesTheType;
