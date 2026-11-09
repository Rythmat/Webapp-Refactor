import { pickOne, type EchoRandom } from '@/curriculum/engine/echo/random';
import {
  STYLE_INFO,
  VIBE_INFO,
  type StyleTag,
  type VibeTag,
} from '@/curriculum/engine/progressionRules';
import type {
  MusicPrompt,
  PromptFlavor,
  PromptGenre,
  PromptMode,
} from './parseMusicPrompt';

// ── What a prompt leaves out, filled in ─────────────────────────────────────
//
// A genre from the mood when none is named, a mode where the mood and the
// style agree (progressionRules.ts VIBE_INFO / STYLE_INFO), a key the genre
// is often played in, a level, and how rich the chords are. Every choice
// goes through the seeded `rng`, so a seed gives the same song.

export type PromptComplexity = 'triad' | '7th' | 'extended';

export interface PromptPlan {
  prompt: MusicPrompt;
  genre: PromptGenre;
  flavor: PromptFlavor | null;
  /** The progression library's style tag for the genre ('r&b', 'gospel'). */
  styleTag: StyleTag;
  vibes: VibeTag[];
  level: 1 | 2 | 3;
  complexity: PromptComplexity;
  tonicPc: number;
  tonicLabel: string;
  mode: PromptMode;
  /** What the prompt didn't say and the plan chose. */
  defaulted: ('genre' | 'key' | 'mode')[];
  /** Nothing in the prompt was read: a starting point, not its song. */
  fallback: boolean;
}

/** A genre for a mood, when the prompt names none. */
const GENRE_FOR_VIBE: Record<VibeTag, PromptGenre> = {
  cool: 'neo-soul',
  sexy: 'rnb',
  intriguing: 'jazz',
  dark: 'hip-hop',
  emotional: 'pop',
  sophisticated: 'jazz',
  fun: 'pop',
  happy: 'pop',
  melancholic: 'pop',
  aggressive: 'rock',
  dreamy: 'electronic',
  hypnotic: 'electronic',
  triumphant: 'pop',
  spiritual: 'rnb',
  rebellious: 'rock',
  romantic: 'rnb',
};

/** Keys each genre is often played in, as a student would spell them. */
const GENRE_KEYS: Record<PromptGenre, readonly string[]> = {
  pop: ['C', 'G', 'D', 'A', 'F', 'E'],
  rock: ['E', 'A', 'G', 'D'],
  'hip-hop': ['C', 'D', 'F', 'G', 'A'],
  rnb: ['Eb', 'Ab', 'Bb', 'F', 'C'],
  jazz: ['F', 'Bb', 'Eb', 'C', 'G'],
  blues: ['E', 'A', 'G', 'C'],
  folk: ['G', 'D', 'C', 'A'],
  funk: ['E', 'A', 'D', 'G'],
  'neo-soul': ['Eb', 'Ab', 'Db', 'F'],
  electronic: ['A', 'F', 'C', 'G'],
  latin: ['A', 'D', 'G', 'E'],
  reggae: ['A', 'G', 'D', 'C'],
  'jam-band': ['E', 'A', 'D', 'G'],
  african: ['C', 'F', 'G', 'A'],
};

const NOTE_PC: Record<string, number> = {
  C: 0,
  Db: 1,
  D: 2,
  Eb: 3,
  E: 4,
  F: 5,
  Gb: 6,
  G: 7,
  Ab: 8,
  A: 9,
  Bb: 10,
  B: 11,
};

const PROMPT_MODES: readonly PromptMode[] = [
  'ionian',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'aeolian',
];
const isPromptMode = (m: string): m is PromptMode =>
  (PROMPT_MODES as readonly string[]).includes(m);

/** A flavor's level: the band variation it is closest to. */
const FLAVOR_LEVEL: Partial<Record<PromptFlavor, 1 | 2 | 3>> = {
  trap: 1,
  'boom-bap': 2,
  lofi: 3,
  ballad: 1,
  dance: 2,
};

/** Genres whose chords are sevenths at the least. */
const SEVENTH_GENRES = new Set<PromptGenre>([
  'jazz',
  'neo-soul',
  'rnb',
  'funk',
]);

const COMPLEXITY_BY_LEVEL: Record<1 | 2 | 3, PromptComplexity> = {
  1: 'triad',
  2: '7th',
  3: 'extended',
};

/** The progression library's style tag for a genre and flavor. */
export function styleTagFor(
  genre: PromptGenre,
  flavor: PromptFlavor | null,
): StyleTag {
  if (flavor === 'gospel') return 'gospel';
  return genre === 'rnb' ? 'r&b' : genre;
}

/**
 * The mode a mood and a style agree on; else the mood's, the style's, major.
 * `within` narrows the choice: a key named as a letter alone ("in Eb") is
 * major or minor, never Lydian.
 */
function modeFor(
  vibes: readonly VibeTag[],
  styleTag: StyleTag,
  rng: EchoRandom,
  within: readonly PromptMode[] = PROMPT_MODES,
): PromptMode {
  const fits = (m: string): m is PromptMode =>
    isPromptMode(m) && within.includes(m);
  const styleModes = STYLE_INFO[styleTag].primaryModes.filter(fits);
  const vibeModes = vibes.length
    ? VIBE_INFO[vibes[0]].applicableModes.filter(fits)
    : [];
  const both = vibeModes.filter((m) => styleModes.includes(m));
  const pool = both.length ? both : vibeModes.length ? vibeModes : styleModes;
  return pool.length ? pickOne(rng, pool) : within[0];
}

export function planPrompt(prompt: MusicPrompt, rng: EchoRandom): PromptPlan {
  const defaulted: PromptPlan['defaulted'] = [];
  const fallback = prompt.matched.length === 0;

  let genre = prompt.genre;
  if (!genre) {
    genre = prompt.vibes.length ? GENRE_FOR_VIBE[prompt.vibes[0]] : 'pop';
    defaulted.push('genre');
  }
  const flavor = prompt.flavor;
  const styleTag = styleTagFor(genre, flavor);

  let mode = prompt.mode;
  if (!mode) {
    // A 12-bar blues is dominant: its I7 is Mixolydian's tonic.
    mode =
      prompt.form === '12-bar'
        ? 'mixolydian'
        : fallback
          ? 'ionian'
          : prompt.tonicPc !== null
            ? modeFor(prompt.vibes, styleTag, rng, ['ionian', 'aeolian'])
            : modeFor(prompt.vibes, styleTag, rng);
    defaulted.push('mode');
  }

  let tonicPc = prompt.tonicPc;
  let tonicLabel = prompt.tonicLabel;
  if (tonicPc === null || tonicLabel === null) {
    tonicLabel = fallback ? 'C' : pickOne(rng, GENRE_KEYS[genre]);
    tonicPc = NOTE_PC[tonicLabel];
    defaulted.push('key');
  }

  const level = prompt.level ?? (flavor && FLAVOR_LEVEL[flavor]) ?? 1;
  let complexity = COMPLEXITY_BY_LEVEL[level];
  if (complexity === 'triad' && SEVENTH_GENRES.has(genre)) complexity = '7th';

  return {
    prompt,
    genre,
    flavor,
    styleTag,
    vibes: prompt.vibes,
    level,
    complexity,
    tonicPc,
    tonicLabel,
    mode,
    defaulted,
    fallback,
  };
}
