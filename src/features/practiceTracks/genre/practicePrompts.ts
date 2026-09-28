/**
 * practicePrompts.ts — Things to try on a Practice Track.
 *
 * A Practice Track's one instruction is "play over this", which is freedom and,
 * for a student who has only ever played written notes, paralysis. These are the
 * way out of it: small, concrete, and answerable in two bars. The section's own
 * direction leads, because it is the thing they were just working on.
 */

import type { StudentPart } from './buildGenrePracticeTrack';

const MELODY_PROMPTS = [
  'Start on the 1 and end on the 1.',
  'Play a two-bar phrase, then leave two bars of silence.',
  'Answer the phrase you just played, a little higher.',
  'Use three notes of the scale and nothing else.',
  'Land on a different note of the scale each time round.',
];

const CHORD_PROMPTS = [
  'Play the chords on beat 1 only, then add one more stab per bar.',
  'Keep your hand still and let the rhythm do the work.',
  'Push a chord a sixteenth early and hear it pull.',
  'Play through the changes with no chord repeated the same way twice.',
];

const BASS_PROMPTS = [
  'Root notes on beat 1, nothing else, all the way round.',
  'Add the octave pop on the and of 2.',
  'Walk into each new chord with one note before it.',
  'Lock in with the kick drum and leave the rest alone.',
];

const PERFORMANCE_PROMPTS = [
  'Left hand alone until it is solid, then bring the right hand in.',
  'Bass on 1 and 3, chords in the gaps.',
  'Drop the right hand for a bar and let the groove carry it.',
  'Play the whole form once through without stopping.',
];

/**
 * The prompts for one Practice Track: the section's own direction first, then a
 * set chosen by what the student is playing. A two-part track is a Performance,
 * whatever its parts happen to be.
 */
export function practicePrompts(
  studentParts: StudentPart[],
  sourceDirection: string | null,
): string[] {
  const byPart =
    studentParts.length > 1
      ? PERFORMANCE_PROMPTS
      : studentParts[0] === 'melody'
        ? MELODY_PROMPTS
        : studentParts[0] === 'chords'
          ? CHORD_PROMPTS
          : BASS_PROMPTS;
  return sourceDirection ? [sourceDirection, ...byPart] : [...byPart];
}
