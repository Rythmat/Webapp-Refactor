import type { PrismModeSlug } from '@/hooks/data/prism';
import { GENRE_GROOVES } from '@/lib/learn/genreGrooves';
import { modeCharacter } from '@/lib/learn/modeCharacter';
import { getScaleLesson } from '@/lib/learn/scaleLessons';
import {
  alteredDegrees,
  pitchClassesOf,
  stepPattern,
  thirdsStars,
} from '@/lib/learn/scalePitches';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { GENRE_COURSES } from '../genreCourses';

// ── What a Learn tile draws (owner, 2026-10-26) ───────────────────────────
// From a tile's own data: a mode or scale its figure on the twelve-note
// circle, a Relative tile its key's, a Parallel tile its tonic's seven
// modes, a genre its groove, a technique its interval. With the corner
// stats, the strip along its foot and the line under its title.

export type SigilSpec =
  | {
      kind: 'scale';
      pcs: number[];
      tonic: number;
      stars: number[][];
      altered: { pc: number; label: string }[];
      layers?: number[][];
      weights?: Record<number, number>;
      accent: string;
      stats: string;
      strip: string[];
      character?: string;
    }
  | {
      kind: 'groove';
      steps: number;
      hits: readonly number[];
      /** The genre's art, for its accent. */
      art?: string;
      stats: string;
      strip: string[];
      character: string;
    }
  | {
      kind: 'interval';
      ratio: readonly [number, number];
      art?: string;
      stats: string;
      strip: string[];
      character?: string;
    };

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const DIATONIC: readonly PrismModeSlug[] = [
  'ionian',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'aeolian',
  'locrian',
];
const LETTER: Readonly<Record<string, number>> = {
  c: 0,
  d: 2,
  e: 4,
  f: 5,
  g: 7,
  a: 9,
  b: 11,
};

/** A key from its URL form ('fsharp', 'dflat', 'c'): its pitch class and
 *  its name ('F♯'). */
function keyOf(param: string): { pc: number; name: string } | null {
  const m = /^([a-g])(sharp|flat)?$/.exec(param.toLowerCase());
  if (!m) return null;
  const shift = m[2] === 'sharp' ? 1 : m[2] === 'flat' ? -1 : 0;
  return {
    pc: (LETTER[m[1]] + shift + 12) % 12,
    name: m[1].toUpperCase() + (shift > 0 ? '♯' : shift < 0 ? '♭' : ''),
  };
}

const up = (pcs: readonly number[], by: number) =>
  pcs.map((pc) => (pc + by) % 12).sort((a, b) => a - b);

/** A mode's figure, rooted on C. */
function modeSpec(mode: string): SigilSpec | null {
  const pcs = pitchClassesOf(mode);
  if (!pcs) return null;
  const altered = alteredDegrees(pcs);
  // Pentatonic and blues take their parent mode's colour.
  const scale = getScaleLesson(mode.toLowerCase());
  const accent = colorForKeyMode(
    'C',
    (scale?.parentMode ?? mode) as PrismModeSlug,
  );
  const marks =
    altered.length === 0
      ? 'major'
      : altered.length <= 3
        ? altered.map((a) => a.label).join(' ')
        : `${altered.length} altered`;
  return {
    kind: 'scale',
    pcs,
    tonic: 0,
    stars: thirdsStars(pcs),
    altered,
    accent,
    stats: `${pcs.length} notes · ${marks}`,
    strip: stepPattern(pcs),
    character: modeCharacter(mode),
  };
}

/** A Relative tile: its key's major scale, which all seven modes share. */
function relativeSpec(param: string): SigilSpec | null {
  const key = keyOf(param);
  if (!key) return null;
  const pcs = up(MAJOR, key.pc);
  return {
    kind: 'scale',
    pcs,
    tonic: key.pc,
    stars: thirdsStars(pcs),
    altered: [],
    accent: colorForKeyMode(key.name.replace('♯', '#'), 'ionian'),
    stats: `7 modes · ${key.name} major`,
    strip: stepPattern(MAJOR),
    character: `The seven modes of ${key.name} major`,
  };
}

/** A Parallel tile: the seven modes on its tonic, layered. */
function parallelSpec(param: string): SigilSpec | null {
  const key = keyOf(param);
  if (!key) return null;
  const weights: Record<number, number> = {};
  const layers = DIATONIC.map((mode) => {
    const pcs = up(pitchClassesOf(mode) ?? MAJOR, key.pc);
    for (const pc of pcs) weights[pc] = (weights[pc] ?? 0) + 1;
    return thirdsStars(pcs)[0];
  });
  const pcs = Object.keys(weights)
    .map(Number)
    .sort((a, b) => a - b);
  const major = up(MAJOR, key.pc);
  return {
    kind: 'scale',
    pcs,
    tonic: key.pc,
    stars: [thirdsStars(major)[0]],
    altered: [],
    layers,
    weights,
    accent: colorForKeyMode(key.name.replace('♯', '#'), 'ionian'),
    stats: `7 modes · on ${key.name}`,
    strip: DIATONIC.map((m) => m.slice(0, 3)),
    character: `Seven modes from one tonic, ${key.name}`,
  };
}

const INTERVAL_NAME: Readonly<Record<string, string>> = {
  '1:1': 'unison',
  '1:2': 'octave',
  '2:3': 'fifth',
  '3:4': 'fourth',
  '3:5': 'major sixth',
  '4:5': 'major third',
  '5:6': 'minor third',
  '5:8': 'minor sixth',
  '8:9': 'whole tone',
};

/** The sigil a Learn tile draws, from its data; null for one with none. */
export function sigilFor(item: {
  mode?: string;
  expandId?: string;
  image?: string;
  ratio?: readonly [number, number];
}): SigilSpec | null {
  if (item.mode) return modeSpec(item.mode);
  const [kind, param] = (item.expandId ?? '').split(':');
  if (kind === 'relative' && param) return relativeSpec(param);
  if (kind === 'parallel' && param) return parallelSpec(param);
  if (kind === 'course') {
    const course = GENRE_COURSES.find((c) => c.expandId === item.expandId);
    const groove = course && GENRE_GROOVES[course.slug];
    if (groove) return grooveSpec(course.slug, item.image);
  }
  if (item.ratio) {
    const [a, b] = item.ratio;
    const name = INTERVAL_NAME[`${a}:${b}`];
    return {
      kind: 'interval',
      ratio: item.ratio,
      art: item.image,
      stats: name ? `${a}:${b} · ${name}` : `${a}:${b}`,
      strip: [],
    };
  }
  return null;
}

/** A genre's groove, by its course slug. */
export function grooveSpec(slug: string, art?: string): SigilSpec | null {
  const groove = GENRE_GROOVES[slug];
  if (!groove) return null;
  const hit = new Set(groove.hits);
  return {
    kind: 'groove',
    steps: groove.steps,
    hits: groove.hits,
    art,
    stats: `${groove.steps} steps · ${groove.hits.length} hits`,
    strip: Array.from({ length: groove.steps }, (_, i) =>
      hit.has(i) ? 'x' : '',
    ),
    character: groove.name,
  };
}

/** Two decimals, with no "-0.00". */
const fixed = (v: number) => (Math.abs(v) < 0.005 ? 0 : v).toFixed(2);

/** A Lissajous figure, as the harmonograph draws an interval: x and y
 *  swinging at `ratio`, `phase` apart, `amp` from the middle. The landing
 *  mark's convention (motion/lissajous.ts): x = sin(a·t), y = sin(b·t −
 *  phase), so 2:3 at phase 0 is the logo. */
export function lissajousPath(
  [a, b]: readonly [number, number],
  phase: number,
  amp: number,
  samples = 360,
) {
  const parts: string[] = [];
  for (let s = 0; s <= samples; s++) {
    const t = (2 * Math.PI * s) / samples;
    const x = amp * Math.sin(a * t);
    const y = amp * Math.sin(b * t - phase);
    parts.push(`${s ? 'L' : 'M'}${fixed(x)},${fixed(y)}`);
  }
  return parts.join('');
}
