import { GENRE_GROOVES } from '@/lib/learn/genreGrooves';
import { pitchClassesOf, stepPattern } from '@/lib/learn/scalePitches';
import { keyColor, keyPair, truchetPair } from './color';
import type {
  CoverMotif,
  CoverSpec,
  TruchetLayout,
  TruchetTiles,
} from './types';

// ── Which cover each kind of course gets (owner, 2026-11-04) ───────────────
// One family per kind, so a page reads as a set while no two cards match:
// Theory families are Truchet tapestries, genres Suno's colour fields,
// Technique a bold motif, Audio's courses interference rings and its gear
// and anatomy lessons hex noodles; Relative and Parallel split by ratios.

/** Each Theory family's arrangement of Carlson's winged tiles. */
const FAMILY_LAYOUT: Readonly<Record<string, TruchetLayout>> = {
  diatonic: 'mirror',
  'pentatonic-blues': 'kaleido',
  'harmonic-minor': 'diagonal',
  'melodic-minor': 'pinwheel',
  'harmonic-major': 'pinwheel-lines',
  'double-harmonic': 'mirror-dots',
};

const MAJOR = [0, 2, 4, 5, 7, 9, 11];

/** A Theory family: its parent mode's notes and steps as Truchet tiles. */
export function theoryCover(
  seed: string,
  family: string,
  parentMode: string | undefined,
  key: string,
): CoverSpec {
  const colors = keyPair(key);
  if (!parentMode || !FAMILY_LAYOUT[family]) {
    return {
      family: 'subdivide',
      seed,
      colors,
      stacked: true,
      // Relative walks a key's modes by their roots; Parallel stacks them.
      ratios:
        family === 'relative'
          ? [
              [3, 2],
              [2, 1],
              [4, 3],
            ]
          : [
              [4, 3],
              [5, 4],
              [3, 2],
            ],
      depth: 4,
    };
  }
  const pcs = pitchClassesOf(parentMode) ?? MAJOR;
  return {
    family: 'truchet',
    seed,
    colors: truchetPair(key),
    stacked: true,
    layout: FAMILY_LAYOUT[family],
    steps: stepPattern(pcs),
    pcs,
  };
}

/**
 * Each genre's two keys, every pair its own, so no two genre tiles share
 * colours (Learn's order: Pop, Rock, Hip Hop, R&B, Jazz, Blues, Folk, Funk,
 * Neo Soul, Electronic, Latin, Reggae, Jam Band, African). Reggae is red and
 * green.
 */
const GENRE_KEYS: Readonly<Record<string, readonly [string, string]>> = {
  pop: ['F', 'B♭'],
  rock: ['C', 'G'],
  'hip-hop': ['A♭', 'E♭'],
  rnb: ['E♭', 'F'],
  jazz: ['D♭', 'A♭'],
  blues: ['F#', 'D♭'],
  folk: ['E', 'B'],
  funk: ['G', 'D'],
  'neo-soul': ['B♭', 'D♭'],
  electronic: ['B', 'F#'],
  latin: ['C', 'F'],
  reggae: ['E', 'C'],
  'jam-band': ['A♭', 'F#'],
  african: ['G', 'E'],
};

/** A genre: its groove placing its colours. */
export function genreCover(
  seed: string,
  slug: string,
  title: string,
): CoverSpec {
  const groove = GENRE_GROOVES[slug] ?? { steps: 16, hits: [0, 4, 8, 12] };
  const [first, second] = GENRE_KEYS[slug] ?? ['F#', 'D♭'];
  return {
    family: 'mesh',
    seed,
    colors: [keyColor(first), keyColor(second)],
    stacked: true,
    groove: { steps: groove.steps, hits: groove.hits },
    title,
  };
}

/** Each genre's home scale, as pitch classes: its Truchet tiles' steps. */
const GENRE_SCALES: Readonly<Record<string, readonly number[]>> = {
  pop: [0, 2, 4, 5, 7, 9, 11], // major
  rock: [0, 2, 4, 5, 7, 9, 10], // Mixolydian
  'hip-hop': [0, 2, 3, 5, 7, 8, 10], // natural minor
  rnb: [0, 2, 3, 5, 7, 9, 10], // Dorian
  jazz: [0, 2, 3, 5, 7, 9, 11], // melodic minor
  blues: [0, 3, 5, 6, 7, 10], // blues
  folk: [0, 2, 4, 7, 9], // major pentatonic
  funk: [0, 3, 5, 7, 10], // minor pentatonic
  'neo-soul': [0, 2, 4, 6, 7, 9, 11], // Lydian
  electronic: [0, 1, 3, 5, 7, 8, 10], // Phrygian
  latin: [0, 2, 3, 5, 7, 8, 11], // harmonic minor
  reggae: [0, 2, 4, 5, 7, 9, 11], // major
  'jam-band': [0, 2, 4, 6, 7, 9, 10], // Lydian dominant
  african: [0, 2, 4, 7, 9], // major pentatonic
};

/**
 * Each genre's pattern (owner, 2026-11-05: "more variations"): its symmetry,
 * tiles across, which motifs its steps draw, whether ink and paper swap,
 * and where it splits. Neighbours in Learn's order differ in at least two.
 */
const GENRE_PATTERN: Readonly<
  Record<
    string,
    {
      layout: TruchetLayout;
      grid: number;
      tiles: TruchetTiles;
      invert?: boolean;
      split?: 'centre' | 'ring' | 'none';
    }
  >
> = {
  pop: { layout: 'mirror', grid: 4, tiles: 'arcs', split: 'centre' },
  rock: { layout: 'kaleido', grid: 3, tiles: 'mixed', invert: true },
  'hip-hop': { layout: 'pinwheel', grid: 5, tiles: 'arcs', split: 'none' },
  rnb: { layout: 'diagonal', grid: 4, tiles: 'lines', split: 'none' },
  jazz: {
    layout: 'mirror-dots',
    grid: 5,
    tiles: 'mixed',
    invert: true,
    split: 'centre',
  },
  blues: { layout: 'pinwheel-lines', grid: 4, tiles: 'lines', split: 'none' },
  folk: { layout: 'kaleido', grid: 5, tiles: 'arcs', split: 'centre' },
  funk: { layout: 'pinwheel', grid: 3, tiles: 'mixed', invert: true },
  'neo-soul': { layout: 'kaleido', grid: 4, tiles: 'lines', invert: true },
  electronic: {
    layout: 'pinwheel-lines',
    grid: 5,
    tiles: 'arcs',
    split: 'none',
  },
  latin: { layout: 'diagonal', grid: 5, tiles: 'mixed', split: 'centre' },
  reggae: { layout: 'mirror-dots', grid: 4, tiles: 'dots', split: 'none' },
  'jam-band': { layout: 'mirror', grid: 3, tiles: 'mixed', invert: true },
  african: { layout: 'diagonal', grid: 3, tiles: 'dots' },
};

/**
 * The Best Of row's keys, in order round the spectrum (owner, 2026-11-05:
 * Pop red, Rock vermillion, and on): the circle of fifths, which the key
 * colours follow, without A's amber.
 */
const SPECTRUM_KEYS = [
  'C',
  'G',
  'D',
  'E',
  'B',
  'F#',
  'D♭',
  'A♭',
  'E♭',
  'B♭',
  'F',
] as const;

/** The genres in the library's order (the song filter's). */
const GENRE_ORDER = Object.keys(GENRE_PATTERN);

/**
 * A genre's place round the spectrum: its place in `order` (the Best Of
 * row's, where a page has one), else in the library's genres, else 0.
 */
export function genreSpectrumIndex(
  slug: string,
  order: readonly string[] = GENRE_ORDER,
): number {
  const at = order.indexOf(slug);
  return at >= 0 ? at : Math.max(0, GENRE_ORDER.indexOf(slug));
}

/** A genre's two colours: its Best Of tile's (genreTruchetCover's at the
 *  same place). */
export function genrePair(
  slug: string,
  order?: readonly string[],
): [string, string] {
  return truchetPair(
    SPECTRUM_KEYS[genreSpectrumIndex(slug, order) % SPECTRUM_KEYS.length],
  );
}

/** An interval's two colours: the Truchet pair of its upper note above C
 *  (a fifth G's, a fourth F's). */
export function intervalPair([a, b]: readonly [number, number]): [
  string,
  string,
] {
  const semis = Math.round(12 * Math.log2(Math.max(a, b) / Math.min(a, b)));
  return truchetPair(PC_NAMES[((semis % 12) + 12) % 12]);
}

const PC_NAMES = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
] as const;

/**
 * A genre as a Truchet tapestry (owner, 2026-11-05: the Learn page's
 * "Best Of" tiles): its home scale's steps, in its own pattern. Its colours come from its place in the row, so the row runs round
 * the spectrum: the place's key, into the one three fifths away.
 */
export function genreTruchetCover(
  seed: string,
  slug: string,
  position: number,
): CoverSpec {
  const pcs = GENRE_SCALES[slug] ?? MAJOR;
  const key = SPECTRUM_KEYS[Math.max(0, position) % SPECTRUM_KEYS.length];
  return {
    family: 'truchet',
    seed,
    colors: truchetPair(key),
    stacked: true,
    ...(GENRE_PATTERN[slug] ?? { layout: 'mirror', grid: 4, tiles: 'arcs' }),
    steps: stepPattern(pcs),
    pcs,
  };
}

const MOTIFS: readonly CoverMotif[] = ['burst', 'sun', 'rays', 'tunnel'];
const TECHNIQUE_KEYS = ['B♭', 'F#', 'E♭', 'E', 'D♭'];

/** A Technique item: one bold motif, its counts from the interval. */
export function techniqueCover(
  seed: string,
  index: number,
  ratio: readonly [number, number],
): CoverSpec {
  return {
    family: 'motif',
    seed,
    colors: keyPair(TECHNIQUE_KEYS[index % TECHNIQUE_KEYS.length]),
    stacked: false,
    motif: MOTIFS[index % MOTIFS.length],
    ratio,
  };
}

/** Audio's modules nearly all share E: covers take their own keys in turn. */
const AUDIO_KEYS = ['F#', 'E♭', 'C', 'D♭', 'F', 'G', 'B', 'A♭', 'B♭', 'E'];

/** An Audio course: two tones beating, as interference rings. */
export function audioCourseCover(
  seed: string,
  index: number,
  ratio: readonly [number, number],
): CoverSpec {
  return {
    family: 'rings',
    seed,
    colors: keyPair(AUDIO_KEYS[index % AUDIO_KEYS.length]),
    stacked: true,
    ratio,
    variant: index,
  };
}

/** An Audio gear, anatomy or hands-on lesson: cables, as noodles. */
export function audioLessonCover(
  seed: string,
  index: number,
  ratio: readonly [number, number],
): CoverSpec {
  return {
    family: 'noodles',
    seed,
    colors: keyPair(AUDIO_KEYS[(index * 3 + 1) % AUDIO_KEYS.length]),
    stacked: false,
    ratio,
  };
}

// ── Every Learn card a Truchet tapestry (owner, 2026-11-05) ────────────────
// The sigils give way to Truchet patterns, each from the card's own music
// (a Theory family its scale, a genre course its Best Of tile's pattern
// with ink and paper swapped, Technique and Audio their interval stacked
// into a scale) and in the colours the sigil had (sigilColors).

type TruchetPattern = {
  layout: TruchetLayout;
  grid: number;
  tiles: TruchetTiles;
  invert?: boolean;
  split?: 'centre' | 'ring' | 'none';
};

/** Each Theory family's pattern: three or four tiles across, none a genre's. */
const THEORY_PATTERN: Readonly<Record<string, TruchetPattern>> = {
  diatonic: { layout: 'pinwheel', grid: 3, tiles: 'arcs', invert: true },
  'pentatonic-blues': { layout: 'mirror', grid: 3, tiles: 'lines' },
  'harmonic-minor': { layout: 'kaleido', grid: 4, tiles: 'mixed' },
  'melodic-minor': {
    layout: 'diagonal',
    grid: 4,
    tiles: 'arcs',
    split: 'none',
  },
  'harmonic-major': {
    layout: 'mirror-dots',
    grid: 4,
    tiles: 'lines',
    invert: true,
    split: 'none',
  },
  'double-harmonic': {
    layout: 'pinwheel-lines',
    grid: 4,
    tiles: 'mixed',
    split: 'centre',
  },
  relative: { layout: 'mirror', grid: 4, tiles: 'dots', split: 'none' },
  parallel: { layout: 'diagonal', grid: 3, tiles: 'mixed', invert: true },
};

/** A Theory family as Truchet tiles: its scale's steps, its own pattern. */
export function theoryTruchetCover(
  seed: string,
  family: string,
  pcs: readonly number[],
  colors: readonly [string, string],
): CoverSpec {
  return {
    family: 'truchet',
    seed,
    colors: [colors[0], colors[1]],
    stacked: true,
    ...(THEORY_PATTERN[family] ?? THEORY_PATTERN.diatonic),
    steps: stepPattern(pcs),
    pcs: [...pcs],
  };
}

/** A genre's course: its Best Of tile's tapestry, ink and paper swapped,
 *  so the two read as kin without repeating. */
export function genreCourseTruchetCover(
  seed: string,
  slug: string,
  position: number,
): CoverSpec {
  const tile = genreTruchetCover(seed, slug, position);
  return tile.family === 'truchet' ? { ...tile, invert: !tile.invert } : tile;
}

/** Technique's and Audio's patterns, in turn along a shelf. */
const INTERVAL_PATTERNS: readonly TruchetPattern[] = [
  { layout: 'pinwheel', grid: 4, tiles: 'arcs', split: 'none' },
  { layout: 'mirror', grid: 4, tiles: 'mixed', invert: true },
  { layout: 'kaleido', grid: 3, tiles: 'lines', split: 'centre' },
  { layout: 'diagonal', grid: 4, tiles: 'arcs', invert: true },
  { layout: 'mirror-dots', grid: 3, tiles: 'arcs' },
  { layout: 'pinwheel-lines', grid: 3, tiles: 'lines', invert: true },
];

/**
 * An interval stacked into a seven-note scale: the interval again and
 * again round the octave (a fifth gives Lydian), starting a semitone up
 * each time it comes home early (a major third's augmented triads).
 */
export function stackedInterval([a, b]: readonly [number, number]): number[] {
  const semis =
    Math.round(12 * Math.log2(Math.max(a, b) / Math.min(a, b))) % 12;
  const notes = new Set<number>();
  for (let start = 0; notes.size < 7 && start < 12; start += 1) {
    for (let k = 0; notes.size < 7; k += 1) {
      const pc = (start + k * semis) % 12;
      if (notes.has(pc)) break;
      notes.add(pc);
      if (semis === 0) break;
    }
  }
  return [...notes].sort((x, y) => x - y);
}

/** A Technique or Audio card: its interval stacked, the shelf's next
 *  pattern. */
export function intervalTruchetCover(
  seed: string,
  index: number,
  ratio: readonly [number, number],
  colors: readonly [string, string],
  stacked: boolean,
): CoverSpec {
  const pcs = stackedInterval(ratio);
  return {
    family: 'truchet',
    seed,
    colors: [colors[0], colors[1]],
    stacked,
    ...INTERVAL_PATTERNS[index % INTERVAL_PATTERNS.length],
    steps: stepPattern(pcs),
    pcs,
  };
}

/**
 * A student's first step (owner, 2026-11-05: Piano Fundamentals "very
 * simple"): four tiles, one motif, turned about the middle: a single ring
 * of arcs and its wings, nothing split.
 */
export function firstStepTruchetCover(
  seed: string,
  colors: readonly [string, string],
): CoverSpec {
  return {
    family: 'truchet',
    seed,
    colors: [colors[0], colors[1]],
    stacked: false,
    layout: 'kaleido',
    grid: 2,
    tiles: 'arcs',
    split: 'none',
    steps: ['W'],
    pcs: [0],
  };
}
