import {
  AudioLines,
  BookOpen,
  Ear,
  Hand,
  Users,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import type { GameRoutes } from '@/constants/routes';

export type ArcadeCategory =
  | 'Multiplayer'
  | 'Ear Training'
  | 'Technique'
  | 'Theory'
  | 'Rhythm'
  | 'Sound Lab';

export interface ArcadeGame {
  title: string;
  category: ArcadeCategory;
  /** One-line, player-facing description for cards + the hero. */
  blurb: string;
  featured?: boolean;
  route?: keyof typeof GameRoutes;
}

export const CATEGORY_ORDER: ArcadeCategory[] = [
  'Multiplayer',
  'Ear Training',
  'Technique',
  'Theory',
  'Rhythm',
  'Sound Lab',
];

/** Per-category header icon (shelf headers), matching the app's lucide set. */
export const CATEGORY_ICON: Record<ArcadeCategory, LucideIcon> = {
  Multiplayer: Users,
  'Ear Training': Ear,
  Technique: Hand,
  Theory: BookOpen,
  Rhythm: AudioLines,
  'Sound Lab': Waves,
};

export const ARCADE_GAMES: ArcadeGame[] = [
  {
    title: 'Jam Room',
    category: 'Multiplayer',
    blurb: 'Drop into a live room and trade fours with friends in real time.',
    featured: true,
    route: 'jamLobby',
  },
  {
    title: 'Chroma',
    category: 'Ear Training',
    blurb: 'Colour-match the pitch before the crystal fades.',
    route: 'chroma',
  },
  {
    title: 'Constellations',
    category: 'Ear Training',
    blurb: 'Trace the melody through the stars.',
    route: 'constellations',
  },
  {
    title: 'Major Arcanum',
    category: 'Technique',
    blurb: 'Master every scale and mode across the keyboard.',
    route: 'majorArcanum',
  },
  {
    title: 'Chord Press',
    category: 'Technique',
    blurb: 'Sharpen your voicings under the clock.',
    route: 'chordPress',
  },
  {
    title: 'Board Choice',
    category: 'Theory',
    blurb: 'Name the chord before the board resets.',
    route: 'boardChoice',
  },
  {
    title: 'Chord Connection',
    category: 'Theory',
    blurb: 'Build the progression, connection by connection.',
    route: 'chordConnection',
  },
  {
    title: 'Foli',
    category: 'Rhythm',
    blurb: 'Call-and-response percussion, one groove at a time.',
    route: 'foli',
  },
  {
    title: 'Groove Lab',
    category: 'Rhythm',
    blurb: 'Program the beat and lock in the pocket.',
    route: 'grooveLab',
  },
  {
    title: 'Wave Sculptor',
    category: 'Sound Lab',
    blurb: 'Shape the oscillators to match the target waveform.',
    route: 'waveSculptor',
  },
  {
    title: 'Harmonic Strings',
    category: 'Sound Lab',
    blurb: 'Explore the overtone series string by string.',
    route: 'harmonicStrings',
  },
  {
    title: 'Signal Flow',
    category: 'Sound Lab',
    blurb: 'Wire up the signal chain and route the sound.',
    route: 'signalFlow',
  },
];

/** The single spotlighted game shown in the hero. */
export const FEATURED_GAME: ArcadeGame =
  ARCADE_GAMES.find((g) => g.featured) ?? ARCADE_GAMES[0];

/** Routes of games available to free-tier users. */
export const FREE_GAME_ROUTES = new Set<string>([
  'chroma',
  'chordPress',
  'boardChoice',
  'chordConnection',
  'harmonicStrings',
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
