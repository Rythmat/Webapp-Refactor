import {
  AudioLines,
  Ear,
  Hand,
  Puzzle,
  Users,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import type { GameRoutes } from '@/constants/routes';
import type {
  ArtKind,
  ArtPaletteName,
  ChladniMode,
  RingsVariant,
} from '@/lib/art';

export type ArcadeCategory =
  | 'Multiplayer'
  | 'Ear Training'
  | 'Skill'
  | 'Puzzles'
  | 'Rhythm'
  | 'Sound Lab';

/** A game's cover (lib/art): its kind left out, its category's. */
export interface ArcadeArt {
  kind?: ArtKind;
  variant?: RingsVariant;
  /** Chladni: the plate's mode, the game's own figure. */
  mode?: ChladniMode;
  palette?: ArtPaletteName;
}

export interface ArcadeGame {
  title: string;
  category: ArcadeCategory;
  /** One-line, player-facing description for cards + the hero. */
  blurb: string;
  featured?: boolean;
  route?: keyof typeof GameRoutes;
  art?: ArcadeArt;
}

export const CATEGORY_ORDER: ArcadeCategory[] = [
  'Multiplayer',
  'Ear Training',
  'Skill',
  'Puzzles',
  'Rhythm',
  'Sound Lab',
];

/** Per-category header icon (shelf headers), matching the app's lucide set. */
export const CATEGORY_ICON: Record<ArcadeCategory, LucideIcon> = {
  Multiplayer: Users,
  'Ear Training': Ear,
  Skill: Hand,
  Puzzles: Puzzle,
  Rhythm: AudioLines,
  'Sound Lab': Waves,
};

/**
 * Each category's cover kind, for a game that names none. Every catalog
 * game names its own figure (owner, 2026-10-28, after GRM Tools Atelier's
 * art and a Chladni chart): a plate's nodal lines in a mode of its own
 * (`art.mode`), simple and intricate mixed down the page ("include simple
 * ratios as well"): Echo's plain ripple (2, 1), Harmonic Strings' bare 2 : 1
 * ratio, Board Choice's board (2, 0), Groove Lab's rings within rings
 * (5, 4), the rest each its own star or rosette.
 */
export const CATEGORY_ART: Record<
  ArcadeCategory,
  { kind: ArtKind; variant?: RingsVariant }
> = {
  Multiplayer: { kind: 'strands' },
  'Ear Training': { kind: 'rings', variant: 'ripple' },
  Skill: { kind: 'contours' },
  Puzzles: { kind: 'rings', variant: 'orbit' },
  Rhythm: { kind: 'helix' },
  'Sound Lab': { kind: 'strands' },
};

export const ARCADE_GAMES: ArcadeGame[] = [
  {
    title: 'Jam Room',
    category: 'Multiplayer',
    blurb: 'Drop into a live room and trade fours with friends in real time.',
    featured: true,
    route: 'jamLobby',
    art: { kind: 'chladni', mode: { n: 5, m: 2, sign: 1 } },
  },
  {
    title: 'Chroma',
    category: 'Ear Training',
    blurb: 'Color-match the pitch before the crystal fades.',
    route: 'chroma',
    art: { kind: 'chladni', mode: { n: 3, m: 2, sign: 1 } },
  },
  {
    title: 'Constellations',
    category: 'Ear Training',
    blurb: 'Trace the melody through the stars.',
    route: 'constellations',
    art: { kind: 'chladni', mode: { n: 3, m: 1, sign: -1 } },
  },
  {
    title: 'Major Arcanum',
    category: 'Skill',
    blurb: 'Master every scale and mode across the keyboard.',
    route: 'majorArcanum',
    art: { kind: 'chladni', mode: { n: 4, m: 2, sign: 1 } },
  },
  {
    title: 'Chord Press',
    category: 'Skill',
    blurb: 'Sharpen your voicings under the clock.',
    route: 'chordPress',
    art: { kind: 'chladni', mode: { n: 2, m: 1, sign: -1 } },
  },
  {
    title: 'Board Choice',
    category: 'Puzzles',
    blurb: 'Name the chord before the board resets.',
    route: 'boardChoice',
    art: { kind: 'chladni', mode: { n: 2, m: 0, sign: 1 } },
  },
  {
    title: 'Chord Connection',
    category: 'Puzzles',
    blurb: 'Build the progression, connection by connection.',
    route: 'chordConnection',
    art: { kind: 'chladni', mode: { n: 4, m: 3, sign: -1 } },
  },
  {
    title: 'Echo',
    category: 'Ear Training',
    blurb: 'Echo Atlas’s tunes, beat the Echo Boss, then make your song.',
    route: 'echo',
    art: { kind: 'chladni', mode: { n: 2, m: 1, sign: 1 } },
  },
  {
    title: 'Foli',
    category: 'Rhythm',
    blurb: 'Call-and-response percussion, one groove at a time.',
    route: 'foli',
    art: { kind: 'chladni', mode: { n: 3, m: 0, sign: -1 } },
  },
  {
    title: 'Groove Lab',
    category: 'Rhythm',
    blurb: 'Program the beat and lock in the pocket.',
    route: 'grooveLab',
    art: { kind: 'chladni', mode: { n: 5, m: 4, sign: 1 } },
  },
  {
    title: 'Wave Sculptor',
    category: 'Sound Lab',
    blurb: 'Shape the oscillators to match the target waveform.',
    route: 'waveSculptor',
    art: { kind: 'chladni', mode: { n: 3, m: 1, sign: 0.5 } },
  },
  {
    title: 'Harmonic Strings',
    category: 'Sound Lab',
    blurb: 'Explore the overtone series string by string.',
    route: 'harmonicStrings',
    art: { kind: 'chladni', mode: { n: 2, m: 1, sign: 0 } },
  },
  {
    title: 'Signal Flow',
    category: 'Sound Lab',
    blurb: 'Wire up the signal chain and route the sound.',
    route: 'signalFlow',
    art: { kind: 'chladni', mode: { n: 4, m: 1, sign: -0.5 } },
  },
];

/** The single spotlighted game shown in the hero. */
export const FEATURED_GAME: ArcadeGame =
  ARCADE_GAMES.find((g) => g.featured) ?? ARCADE_GAMES[0];

/** Routes of games available to free-tier users. */
export const FREE_GAME_ROUTES = new Set<string>([
  'chroma',
  'echo',
  'chordPress',
  'boardChoice',
  'chordConnection',
  'harmonicStrings',
  // Its levels are free; the Circle (any key) is the upgrade, in the game.
  'majorArcanum',
]);

export const isGameFree = (game: ArcadeGame): boolean =>
  !!game.route && FREE_GAME_ROUTES.has(game.route);

export const gamesByCategory = CATEGORY_ORDER.map((category) => ({
  category,
  games: ARCADE_GAMES.filter((g) => g.category === category),
}));

/** Look up a game by its route key (for the "jump back in" recency row). */
export const getGameByRoute = (route: string): ArcadeGame | undefined =>
  ARCADE_GAMES.find((g) => g.route === route);

/** Look up a game by its title (the game header knows only that). */
export const getGameByTitle = (title: string): ArcadeGame | undefined =>
  ARCADE_GAMES.find((g) => g.title === title);

export interface ResolvedArcadeArt {
  seed: string;
  kind: ArtKind;
  variant?: RingsVariant;
  mode?: ChladniMode;
  palette?: ArtPaletteName;
  /**
   * Which of the page glow's two colours its figure takes as its hue
   * (GRM's figures are one hue each, with its tint and white): the games
   * alternate, so neighbours differ.
   */
  hue: 0 | 1;
  /** Seconds into its morphs it starts, so the cards don't move as one. */
  phase: number;
}

/**
 * A game's cover: its own choices over its category's, seeded by its route
 * so a renamed title keeps its picture.
 */
export const artForGame = (game: ArcadeGame): ResolvedArcadeArt => {
  const base = CATEGORY_ART[game.category];
  const index = ARCADE_GAMES.indexOf(game);
  return {
    seed: `arcade:${game.route ?? game.title}`,
    kind: game.art?.kind ?? base.kind,
    variant: game.art?.variant ?? base.variant,
    mode: game.art?.mode,
    palette: game.art?.palette,
    hue: index % 2 === 0 ? 0 : 1,
    phase: Math.max(0, index) * 1.9,
  };
};

/**
 * The cover for a game header's title: the game's, or for a page that isn't
 * in the catalog (Play Along) one seeded from the title.
 */
export const artForTitle = (title: string): ResolvedArcadeArt => {
  const game = getGameByTitle(title);
  return game
    ? artForGame(game)
    : { seed: `arcade:${title}`, kind: 'chladni', hue: 0, phase: 0 };
};
