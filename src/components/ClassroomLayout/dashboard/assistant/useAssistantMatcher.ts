import { useCallback } from 'react';
import {
  AtlasRoutes,
  CurriculumRoutes,
  GameRoutes,
  LearnRoutes,
  LibraryRoutes,
  StudioRoutes,
} from '@/constants/routes';
import {
  GUITAR_THEORY_CATALOG,
  isGuitarTheorySlug,
} from '@/curriculum/data/guitar/theoryCatalog';
import { isGuitarLearnEnabled } from '@/features/learn/useInstrumentStore';
import type { ActivityEntry, MatchResult } from './types';

// ── Activity Catalog ──────────────────────────────────────────────

const ACTIVITY_CATALOG: ActivityEntry[] = [
  // ── Genres ──
  {
    label: 'African',
    description: 'Genre Course',
    route: CurriculumRoutes.genre({ genre: 'african' }),
    keywords: ['african', 'africa'],
    category: 'genre',
  },
  {
    label: 'Blues',
    description: 'Genre Course',
    route: CurriculumRoutes.genre({ genre: 'blues' }),
    keywords: ['blues', 'blue'],
    category: 'genre',
  },
  {
    label: 'Electronic',
    description: 'Genre Course',
    route: CurriculumRoutes.genre({ genre: 'electronic' }),
    keywords: ['electronic', 'edm', 'synth', 'techno', 'house'],
    category: 'genre',
  },
  {
    label: 'Folk',
    description: 'Genre Course',
    route: CurriculumRoutes.genre({ genre: 'folk' }),
    keywords: ['folk', 'acoustic', 'singer-songwriter'],
    category: 'genre',
  },
  {
    label: 'Funk',
    description: 'Genre Course',
    route: CurriculumRoutes.genre({ genre: 'funk' }),
    keywords: ['funk', 'funky', 'groove'],
    category: 'genre',
  },
  {
    label: 'Hip Hop',
    description: 'Genre Course',
    route: CurriculumRoutes.genre({ genre: 'hip-hop' }),
    keywords: ['hip hop', 'hiphop', 'hip-hop', 'rap', 'beats'],
    category: 'genre',
  },
  {
    label: 'Jam Band',
    description: 'Genre Course',
    route: CurriculumRoutes.genre({ genre: 'jam-band' }),
    keywords: ['jam band', 'jam', 'jamband', 'improvisation', 'improv'],
    category: 'genre',
  },
  {
    label: 'Jazz',
    description: 'Genre Course',
    route: CurriculumRoutes.genre({ genre: 'jazz' }),
    keywords: ['jazz', 'swing', 'bebop', 'bop'],
    category: 'genre',
  },
  {
    label: 'Latin',
    description: 'Genre Course',
    route: CurriculumRoutes.genre({ genre: 'latin' }),
    keywords: ['latin', 'salsa', 'bossa', 'samba', 'merengue'],
    category: 'genre',
  },
  {
    label: 'Neo Soul',
    description: 'Genre Course',
    route: CurriculumRoutes.genre({ genre: 'neo-soul' }),
    keywords: ['neo soul', 'neo-soul', 'neosoul'],
    category: 'genre',
  },
  {
    label: 'Pop',
    description: 'Genre Course',
    route: CurriculumRoutes.genre({ genre: 'pop' }),
    keywords: ['pop', 'popular'],
    category: 'genre',
  },
  {
    label: 'R&B',
    description: 'Genre Course',
    route: CurriculumRoutes.genre({ genre: 'rnb' }),
    keywords: ['r&b', 'rnb', 'r and b', 'rhythm and blues'],
    category: 'genre',
  },
  {
    label: 'Reggae',
    description: 'Genre Course',
    route: CurriculumRoutes.genre({ genre: 'reggae' }),
    keywords: ['reggae', 'ska', 'dub'],
    category: 'genre',
  },
  {
    label: 'Rock',
    description: 'Genre Course',
    route: CurriculumRoutes.genre({ genre: 'rock' }),
    keywords: ['rock', 'guitar', 'band'],
    category: 'genre',
  },

  // ── Modes ──
  {
    label: 'Ionian (Major)',
    description: 'Scale & Mode',
    route: LearnRoutes.overview({ mode: 'ionian' }),
    keywords: ['ionian', 'major', 'major scale'],
    category: 'mode',
  },
  {
    label: 'Dorian',
    description: 'Scale & Mode',
    route: LearnRoutes.overview({ mode: 'dorian' }),
    keywords: ['dorian'],
    category: 'mode',
  },
  {
    label: 'Phrygian',
    description: 'Scale & Mode',
    route: LearnRoutes.overview({ mode: 'phrygian' }),
    keywords: ['phrygian'],
    category: 'mode',
  },
  {
    label: 'Lydian',
    description: 'Scale & Mode',
    route: LearnRoutes.overview({ mode: 'lydian' }),
    keywords: ['lydian'],
    category: 'mode',
  },
  {
    label: 'Mixolydian',
    description: 'Scale & Mode',
    route: LearnRoutes.overview({ mode: 'mixolydian' }),
    keywords: ['mixolydian'],
    category: 'mode',
  },
  {
    label: 'Aeolian (Minor)',
    description: 'Scale & Mode',
    route: LearnRoutes.overview({ mode: 'aeolian' }),
    keywords: ['aeolian', 'minor', 'natural minor', 'minor scale'],
    category: 'mode',
  },
  {
    label: 'Locrian',
    description: 'Scale & Mode',
    route: LearnRoutes.overview({ mode: 'locrian' }),
    keywords: ['locrian'],
    category: 'mode',
  },
  {
    label: 'Melodic Minor',
    description: 'Scale & Mode',
    route: LearnRoutes.overview({ mode: 'melodicminor' }),
    keywords: ['melodic minor', 'melodic'],
    category: 'mode',
  },
  {
    label: 'Harmonic Minor',
    description: 'Scale & Mode',
    route: LearnRoutes.overview({ mode: 'harmonicminor' }),
    keywords: ['harmonic minor', 'harmonic'],
    category: 'mode',
  },
  {
    label: 'Harmonic Major',
    description: 'Scale & Mode',
    route: LearnRoutes.overview({ mode: 'harmonicmajor' }),
    keywords: ['harmonic major'],
    category: 'mode',
  },

  // ── Games ──
  {
    label: 'Chroma',
    description: 'Ear Training Game',
    route: GameRoutes.chroma.definition,
    keywords: ['chroma', 'ear training', 'pitch', 'interval'],
    category: 'game',
  },
  {
    label: 'Constellations',
    description: 'Ear Training Game',
    route: GameRoutes.constellations.definition,
    keywords: ['constellations', 'ear training', 'melodic'],
    category: 'game',
  },
  {
    label: 'Board Choice',
    description: 'Theory Game',
    route: GameRoutes.boardChoice.definition,
    keywords: ['board choice', 'theory', 'identify', 'chord theory'],
    category: 'game',
  },
  {
    label: 'Chord Connection',
    description: 'Theory Game',
    route: GameRoutes.chordConnection.definition,
    keywords: ['chord connection', 'progression', 'connect'],
    category: 'game',
  },
  {
    label: 'Chord Press',
    description: 'Technique Game',
    route: GameRoutes.chordPress.definition,
    keywords: ['chord press', 'technique', 'keyboard'],
    category: 'game',
  },
  {
    label: 'Major Arcanum',
    description: 'Technique Game',
    route: GameRoutes.majorArcanum.definition,
    keywords: ['major arcanum', 'arcanum', 'voicing'],
    category: 'game',
  },
  {
    label: 'Play Along',
    description: 'Performance Game',
    route: GameRoutes.playAlong.definition,
    keywords: ['play along', 'backing track', 'performance'],
    category: 'game',
  },
  {
    label: 'Foli',
    description: 'Rhythm Game',
    route: GameRoutes.foli.definition,
    keywords: ['foli', 'rhythm', 'pattern', 'drum'],
    category: 'game',
  },
  {
    label: 'Groove Lab',
    description: 'Rhythm Game',
    route: GameRoutes.grooveLab.definition,
    keywords: ['groove lab', 'groove', 'rhythm'],
    category: 'game',
  },
  {
    label: 'Wave Sculptor',
    description: 'Sound Lab',
    route: GameRoutes.waveSculptor.definition,
    keywords: ['wave sculptor', 'synthesis', 'synth', 'sound design'],
    category: 'game',
  },
  {
    label: 'Harmonic Strings',
    description: 'Sound Lab',
    route: GameRoutes.harmonicStrings.definition,
    keywords: ['harmonic strings', 'harmonics', 'strings'],
    category: 'game',
  },
  {
    label: 'Signal Flow',
    description: 'Sound Lab',
    route: GameRoutes.signalFlow.definition,
    keywords: ['signal flow', 'signal', 'routing', 'processing'],
    category: 'game',
  },
  {
    label: 'Jam Room',
    description: 'Multiplayer',
    route: GameRoutes.jamLobby.definition,
    keywords: ['jam room', 'multiplayer', 'jam session'],
    category: 'game',
  },

  // ── Sections ──
  {
    label: 'Studio',
    description: 'DAW & Composition',
    route: StudioRoutes.root.definition,
    keywords: [
      'studio',
      'compose',
      'composition',
      'create',
      'produce',
      'daw',
      'record',
    ],
    category: 'section',
  },
  {
    label: 'Music Atlas',
    description: 'History & Geography',
    route: AtlasRoutes.root.definition,
    keywords: [
      'atlas',
      'globe',
      'history',
      'geography',
      'explore',
      'world',
      'map',
    ],
    category: 'section',
  },
  {
    label: 'Library',
    description: 'Your Collection',
    route: LibraryRoutes.root.definition,
    keywords: ['library', 'collection', 'saved', 'favorites', 'bookmarks'],
    category: 'section',
  },
  {
    label: 'Piano Fundamentals',
    description: 'Beginner Course',
    route: CurriculumRoutes.root.definition,
    keywords: [
      'piano',
      'fundamentals',
      'basics',
      'beginner',
      'start',
      'piano fundamentals',
    ],
    category: 'section',
  },
];

/**
 * Guitar (The Guitar Atlas): its key centers are Theory → Ionian (Major) on
 * guitar; GUITAR_THEORY_ACTIVITIES are the other tiles guitar teaches.
 * Offered while its rollout flag is on.
 */
const GUITAR_ACTIVITY: ActivityEntry = {
  label: 'Guitar: Ionian (Major)',
  description: 'Theory · The Guitar Atlas',
  route: LearnRoutes.guitarOverview({ mode: 'ionian' }),
  keywords: [
    'guitar',
    'guitar atlas',
    'tab',
    'tablature',
    'chords',
    'key centers',
    'music maps',
  ],
  category: 'mode',
};

/** Theory's other live guitar tiles, each named with "guitar". */
const GUITAR_THEORY_ACTIVITIES: ActivityEntry[] = GUITAR_THEORY_CATALOG.filter(
  (e) => e.key !== 'ionian' && isGuitarTheorySlug(e.slug),
).map((e) => ({
  label: `Guitar: ${e.title}`,
  description: 'Theory · Guitar',
  route: LearnRoutes.guitarOverview({ mode: e.slug }),
  keywords: [`guitar ${e.name.toLowerCase()}`],
  category: 'mode',
}));

// ── Intent words that boost specific categories ──

const CATEGORY_INTENT: Record<string, ActivityEntry['category'][]> = {
  learn: ['genre', 'mode'],
  study: ['genre', 'mode'],
  practice: ['genre', 'mode'],
  teach: ['genre', 'mode'],
  game: ['game'],
  games: ['game'],
  arcade: ['game'],
  compose: ['section'],
  create: ['section'],
  produce: ['section'],
  explore: ['section'],
  history: ['section'],
};

// ── Matching ──

function normalize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^\w\s&-]/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

function scoreEntry(tokens: string[], entry: ActivityEntry): number {
  let score = 0;
  const inputJoined = tokens.join(' ');

  for (const keyword of entry.keywords) {
    // Multi-word keyword match (e.g. "hip hop", "ear training")
    if (keyword.includes(' ') && inputJoined.includes(keyword)) {
      score += 15;
      continue;
    }

    for (const token of tokens) {
      if (token === keyword) {
        score += 10;
      } else if (keyword.includes(token) && token.length >= 3) {
        score += 3;
      } else if (token.includes(keyword) && keyword.length >= 3) {
        score += 3;
      }
    }
  }

  // Intent bonus
  for (const token of tokens) {
    const boostedCategories = CATEGORY_INTENT[token];
    if (boostedCategories?.includes(entry.category)) {
      score += 5;
      break;
    }
  }

  return score;
}

const MIN_SCORE = 3;
const MAX_RESULTS = 3;

export function useAssistantMatcher() {
  const match = useCallback((input: string): MatchResult[] => {
    const tokens = normalize(input);
    if (tokens.length === 0) return [];

    const catalog = isGuitarLearnEnabled()
      ? [...ACTIVITY_CATALOG, GUITAR_ACTIVITY, ...GUITAR_THEORY_ACTIVITIES]
      : ACTIVITY_CATALOG;
    return catalog
      .map((entry) => ({
        entry,
        score: scoreEntry(tokens, entry),
      }))
      .filter((r) => r.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS);
  }, []);

  return { match };
}
