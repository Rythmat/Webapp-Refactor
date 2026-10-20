import type { LiteracyScaleDegree } from '@/content/musicLiteracy/schemas';
import {
  chordCall,
  contoursOfLevel,
  echoTonic,
  melodyCall,
  pickOne,
  type EchoCall,
  type EchoContour,
  type EchoLevelNumber,
  type EchoRandom,
} from '@/curriculum/engine/echo';
import type { LiteracyKey } from '@/curriculum/engine/musicLiteracy/pitch';

// ── The calls a game plays, and the easier one after a miss ────────────────
// Every call comes from the engine (engine/echo/calls.ts). The game adds one
// rule of its own, to keep a child going: Echo is forgiving.
//
// AFTER A MISS, THE NEXT CALL IS EASIER (a choice the play screens made)
//   melody   a three-note contour from Level 1's starter set (the easiest
//            set, and its shortest shapes: 1 2 3, 3 2 1, 1 2 1, 1 7 1), on
//            the 1, in Level 1's rhythms (quarters and eighths). Placed in
//            the level's own register, so a pad still plays what Atlas did.
//   chords   home to the 1 chord and out to the 4 or the 5 (the 1 and its
//            nearest neighbours), in Level 1's rhythms.
// Only the one call after a miss: a good echo brings the level's own calls
// back. The Final Boss is never made easier; its four calls are its own.

export type EchoSectionName = 'melodyEcho' | 'chordEcho';

/** Level 1's shortest contours: what an easier melody call is made of. */
export function easiestContours(): EchoContour[] {
  const own = contoursOfLevel(1);
  const shortest = Math.min(...own.map((c) => c.noteCount));
  return own.filter((c) => c.noteCount === shortest);
}

/** The chords an easier chord call moves to from the 1. */
export const EASY_CHORD_MOVES: readonly LiteracyScaleDegree[] = ['4', '5'];

export interface RoundCallOptions {
  /** The last echo missed: make this one easier. */
  easier?: boolean;
  /** Contour ids played lately, not to repeat while others remain. */
  exclude?: readonly string[];
}

/** An easier melody call at `level`: Level 1's, in the level's register. */
function easierMelody(
  level: EchoLevelNumber,
  key: LiteracyKey,
  rng: EchoRandom,
  exclude: readonly string[],
): EchoCall {
  const pool = easiestContours();
  const fresh = pool.filter((c) => !exclude.includes(c.id));
  const contour = pickOne(rng, fresh.length ? fresh : pool);
  const call = melodyCall(1, key, rng, {
    contourId: contour.id,
    zeroPoint: 1,
  });
  // A level's 1 can sit an octave from Level 1's (D and D♭ do): move the
  // call there, so it lands on the level's pads and keys.
  const shift = echoTonic(level, key) - call.tonic;
  return {
    ...call,
    level,
    tonic: call.tonic + shift,
    notes: call.notes.map((note) => ({ ...note, midi: note.midi + shift })),
  };
}

/** One round's call: the level's own, or after a miss, an easier one. */
export function roundCall(
  section: EchoSectionName,
  level: EchoLevelNumber,
  key: LiteracyKey,
  rng: EchoRandom,
  { easier = false, exclude = [] }: RoundCallOptions = {},
): EchoCall {
  if (section === 'melodyEcho') {
    return easier
      ? easierMelody(level, key, rng, exclude)
      : melodyCall(level, key, rng, { exclude });
  }
  if (!easier) return chordCall(level, key, rng);
  // Level 1's rhythms; a chord call's register is the key's at any level.
  return {
    ...chordCall(1, key, rng, {
      degrees: ['1', pickOne(rng, EASY_CHORD_MOVES)],
    }),
    level,
  };
}
