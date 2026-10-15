import type { LessonOrigin } from '@/lib/learn/lessonOrigin';
import { modeCharacter, modeDegreeFormula } from '@/lib/learn/modeCharacter';
import { getScaleLesson } from '@/lib/learn/scaleLessons';

/**
 * The sentence an activity ends on: what the student just played, named —
 * and, when they came from a song in the Studio, where it lives in that song.
 */
export interface ActivityPayoff {
  /** "That's D Dorian. Minor with a bright raised 6th." */
  headline: string;
  /** "Scale degrees: 1 2 ♭3 4 5 6 ♭7", when it adds something. */
  detail: string | null;
  /** "It's the sound under the 2 min9 in Midnight Groove." */
  fromSong: string | null;
}

export interface ActivityPayoffInput {
  activityKey: string;
  modeSlug: string;
  /** Display name of the mode, e.g. "Dorian". */
  modeTitle: string;
  rootKey: string;
  /** Scale steps in semitones above the tonic. */
  steps: readonly number[];
  /** Chord symbols on the activity, already in the reader's notation. */
  chordSymbols?: readonly { text: string }[];
  origin?: LessonOrigin | null;
}

/** A chord symbol that isn't just the degree restated (hybrid "4 maj"). */
const namesMoreThanDegree = (text: string) => !/^\d/.test(text.trim());

export function activityPayoff({
  activityKey,
  modeSlug,
  modeTitle,
  rootKey,
  steps,
  chordSymbols = [],
  origin,
}: ActivityPayoffInput): ActivityPayoff {
  const scale = `${rootKey} ${modeTitle}`;
  const symbols = [...new Set(chordSymbols.map((c) => c.text))];
  let headline: string;
  let detail: string | null = null;

  // Chords chapter keys: `triad-4-arp-pa`, `seventh-progression-1-pa`.
  const arpeggio = /^(triad|seventh)-(\d+)-arp/.exec(activityKey);
  if (arpeggio) {
    const symbol = symbols.find(namesMoreThanDegree);
    const noun = arpeggio[1] === 'seventh' ? '7th chord' : 'chord';
    headline = `That's the ${arpeggio[2]} ${noun} of ${scale}${symbol ? `: ${symbol}` : ''}.`;
  } else if (activityKey.startsWith('scale-chord-')) {
    const symbol = symbols.find(namesMoreThanDegree);
    headline = `That's a ${scale} chord${symbol ? `: ${symbol}` : ''}.`;
  } else if (/^(triad|seventh)-progression-/.test(activityKey)) {
    headline = `Those are chords from ${scale}${symbols.length ? `: ${symbols.join(' – ')}` : ''}.`;
  } else {
    const character = modeCharacter(modeSlug);
    headline = character
      ? `That's ${scale}. ${character}.`
      : `That's ${scale}.`;
    // Five- and six-note scales carry their own formula (1 – ♭3 – 4 – 5 – ♭7).
    const formula =
      getScaleLesson(modeSlug)?.formula ?? modeDegreeFormula(steps);
    detail = formula ? `Scale degrees: ${formula}` : null;
  }

  const fromSong = origin
    ? origin.chord
      ? `It's the sound under the ${origin.chord} in ${origin.song}.`
      : `It's a sound from ${origin.song}.`
    : null;

  return { headline, detail, fromSong };
}
