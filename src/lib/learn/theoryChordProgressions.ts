import { getChordScales } from '@/components/learn/chordScaleData';

// Theory lessons' Chords chapter: which progressions each mode plays, and
// the rules every Theory chord activity has to obey (Peter, 2026-10-13).
//
// 1. No diminished chord in a progression — the degree whose triad is
//    diminished, and so its half-diminished/diminished 7th too. They're rare
//    in real music and must never look like a normal progression. Playing the
//    chords up the scale one at a time (the stand-alone activities) is fine.
//    A mode whose 1 chord is diminished (Locrian and friends) gets no
//    progressions at all.
// 2. Basic training: never more than one chord per bar, and no chord shorter
//    than a quarter note.
//
// Jazz and some genre lessons do use diminished chords; these rules are
// Theory's alone.
//
// Degrees are 1–7: the mode's own scale steps, as the chord-scale table
// numbers them. A two-chord progression is three bars, ending home on 1
// ("| 1 | 2 | (1)"); a four-chord one is four bars.

export const THEORY_BAR_TICKS = 1920;
export const THEORY_MIN_CHORD_TICKS = 480;

export interface TheoryProgressions {
  triads: number[][];
  sevenths: number[][];
}

/**
 * Hand-picked for the common modes, each leaning on the chord that gives the
 * mode its colour (Dorian's 4, Phrygian's ♭2, Lydian's 2, Mixolydian's ♭7,
 * harmonic minor's major 5). Ionian is Peter's own list.
 */
const AUTHORED: Record<string, TheoryProgressions> = {
  ionian: {
    triads: [
      [1, 2, 1],
      [1, 4, 1],
      [5, 4, 1, 6],
      [1, 5, 6, 4],
    ],
    sevenths: [
      [1, 2, 1],
      [3, 4, 1],
      [3, 6, 2, 5],
      [1, 6, 4, 5],
    ],
  },
  dorian: {
    triads: [
      [1, 4, 1],
      [1, 2, 1],
      [1, 4, 1, 7],
      [1, 7, 3, 4],
    ],
    sevenths: [
      [1, 4, 1],
      [2, 5, 1],
      [1, 4, 2, 5],
      [1, 3, 4, 7],
    ],
  },
  phrygian: {
    triads: [
      [1, 2, 1],
      [1, 7, 1],
      [1, 2, 3, 2],
      [1, 7, 6, 2],
    ],
    sevenths: [
      [1, 2, 1],
      [4, 7, 1],
      [1, 2, 6, 7],
      [1, 4, 7, 2],
    ],
  },
  lydian: {
    triads: [
      [1, 2, 1],
      [1, 5, 1],
      [1, 2, 7, 1],
      [1, 2, 6, 5],
    ],
    sevenths: [
      [1, 2, 1],
      [6, 2, 1],
      [1, 2, 3, 2],
      [1, 6, 2, 5],
    ],
  },
  mixolydian: {
    triads: [
      [1, 7, 1],
      [1, 4, 1],
      [1, 7, 4, 1],
      [1, 5, 7, 4],
    ],
    sevenths: [
      [1, 7, 1],
      [5, 4, 1],
      [1, 7, 4, 1],
      [2, 5, 4, 1],
    ],
  },
  aeolian: {
    triads: [
      [1, 7, 1],
      [1, 4, 1],
      [1, 6, 3, 7],
      [1, 4, 5, 1],
    ],
    sevenths: [
      [1, 4, 1],
      [6, 7, 1],
      [1, 6, 3, 7],
      [1, 4, 7, 3],
    ],
  },
  harmonicminor: {
    triads: [
      [1, 5, 1],
      [1, 4, 1],
      [1, 4, 5, 1],
      [1, 6, 4, 5],
    ],
    sevenths: [
      [1, 5, 1],
      [4, 5, 1],
      [1, 6, 4, 5],
      [1, 4, 6, 5],
    ],
  },
  melodicminor: {
    triads: [
      [1, 4, 1],
      [1, 5, 1],
      [1, 4, 5, 1],
      [1, 2, 4, 5],
    ],
    sevenths: [
      [1, 4, 1],
      [2, 5, 1],
      [1, 4, 2, 5],
      [1, 2, 4, 5],
    ],
  },
};

/** Every other mode: the first of these its chords allow, in this order. */
const FALLBACK_TWO = [
  [1, 5, 1],
  [1, 4, 1],
  [1, 2, 1],
  [1, 7, 1],
  [1, 6, 1],
  [1, 3, 1],
];
const FALLBACK_FOUR = [
  [1, 4, 5, 1],
  [1, 6, 4, 5],
  [1, 5, 6, 4],
  [1, 2, 5, 1],
  [1, 7, 4, 1],
  [1, 2, 7, 1],
  [1, 6, 2, 5],
  [1, 3, 4, 1],
  [1, 4, 7, 1],
  [1, 3, 6, 2],
  [1, 6, 7, 1],
  [1, 7, 6, 5],
  [1, 3, 6, 1],
];

/** Degrees (1–7) whose triad is diminished in this mode. */
export function diminishedDegrees(modeSlug: string): Set<number> {
  const triads = getChordScales(modeSlug)?.triads ?? [];
  const out = new Set<number>();
  triads.forEach((t, i) => {
    if (t.quality.startsWith('dim')) out.add(i + 1);
  });
  return out;
}

const allowed = (progression: number[], dim: Set<number>) =>
  progression.every((d) => d >= 1 && d <= 7 && !dim.has(d));

function pick(authored: number[][] | undefined, dim: Set<number>): number[][] {
  const kept = (authored ?? []).filter((p) => allowed(p, dim));
  const two = kept.filter((p) => p.length === 3);
  const four = kept.filter((p) => p.length === 4);
  const fill = (have: number[][], pool: number[][]) => {
    for (const p of pool) {
      if (have.length >= 2) break;
      if (allowed(p, dim) && !have.some((h) => h.join() === p.join())) {
        have.push(p);
      }
    }
    return have;
  };
  return [...fill(two, FALLBACK_TWO), ...fill(four, FALLBACK_FOUR)];
}

/**
 * The mode's progressions: two two-chord (three bars, home on 1) then two
 * four-chord, for triads and for 7ths. Empty when the 1 chord is diminished,
 * or for a mode with no chord table (the pentatonic and blues scales).
 */
export function theoryProgressionsFor(modeSlug: string): TheoryProgressions {
  const table = getChordScales(modeSlug);
  if (!table?.triads.length) return { triads: [], sevenths: [] };
  const dim = diminishedDegrees(modeSlug);
  if (dim.has(1)) return { triads: [], sevenths: [] };
  const authored = AUTHORED[modeSlug];
  return {
    triads: pick(authored?.triads, dim),
    sevenths: pick(authored?.sevenths, dim),
  };
}

/** Bar-by-bar degree chart, for directions: "| 1 | 2 | 1 |". */
export const progressionChart = (degrees: number[], labels?: string[]) =>
  `| ${degrees.map((d) => labels?.[d - 1] ?? String(d)).join(' | ')} |`;

/**
 * Rule 2, checked on built events: anything sounding together with another
 * note is a chord; a chord must last at least a quarter note, and a bar may
 * hold only one chord (it can be restruck). Returns what's wrong, or [].
 */
export function theoryChordRhythmProblems(
  events: readonly {
    pitchName: string;
    midi?: number;
    startTicks: number;
    durationTicks: number;
  }[],
): string[] {
  const byOnset = new Map<number, typeof events>();
  for (const e of events) {
    byOnset.set(e.startTicks, [...(byOnset.get(e.startTicks) ?? []), e]);
  }
  const problems: string[] = [];
  const chordsByBar = new Map<number, Set<string>>();
  for (const [onset, group] of byOnset) {
    if (group.length < 2) continue;
    const short = group.find((e) => e.durationTicks < THEORY_MIN_CHORD_TICKS);
    if (short) {
      problems.push(
        `chord at tick ${onset} lasts ${short.durationTicks} ticks (< a quarter note)`,
      );
    }
    const bar = Math.floor(onset / THEORY_BAR_TICKS);
    const key = group
      .map((e) => e.midi ?? e.pitchName)
      .sort()
      .join(',');
    const set = chordsByBar.get(bar) ?? new Set<string>();
    set.add(key);
    chordsByBar.set(bar, set);
  }
  for (const [bar, set] of chordsByBar) {
    if (set.size > 1) problems.push(`bar ${bar + 1} holds ${set.size} chords`);
  }
  return problems;
}
