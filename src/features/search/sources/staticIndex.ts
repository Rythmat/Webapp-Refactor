import { MUSIC_HISTORY } from '@/components/atlas/data/events';
import { COURSES_GENRE_OPTIONS } from '@/components/learn/learnFilterOptions';
import {
  AtlasRoutes,
  ClassroomRoutes,
  CurriculumRoutes,
  GameRoutes,
  LearnRoutes,
  ProfileRoutes,
  SettingsRoutes,
  SongRoutes,
  StudioRoutes,
} from '@/constants/routes';
import {
  getGenreTileImage,
  getTheoryTileImage,
} from '@/curriculum/data/learnTileImages';
import { getAllSongs } from '@/curriculum/data/songs';
import { CATEGORY_META } from '../categories';
import type { SearchCategory, SearchResult } from '../types';

/** One searchable record: matchable keywords + the result it yields. */
export interface IndexEntry {
  category: SearchCategory;
  keywords: string[];
  result: SearchResult;
}

/* ── Songs (~650, static bundle) ─────────────────────────────────────── */
function buildSongs(): IndexEntry[] {
  const icon = CATEGORY_META.songs.icon;
  // Popularity-desc so the default browse view leads with well-known songs;
  // search re-ranks each category by match score, so this only affects browse.
  return [...getAllSongs()]
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .map((s) => ({
      category: 'songs' as const,
      keywords: [s.title, s.artist],
      result: {
        id: `song-${s.id}`,
        category: 'songs',
        title: s.title,
        subtitle: s.artist,
        to: SongRoutes.song({ songId: s.id }),
        icon,
        thumb: {
          src: s.artistImageRef,
          avatarSeed: s.genreTags[0] ?? s.artist,
          shape: 'circle',
        },
      },
    }));
}

/* ── Artists (derived from song.artist, deduped case-insensitively) ──── */
function buildArtists(): IndexEntry[] {
  const icon = CATEGORY_META.artists.icon;
  // Dedupe artists case-insensitively; capture a representative portrait from
  // any of their songs that carries one.
  const seen = new Map<string, { name: string; image?: string }>();
  for (const s of getAllSongs()) {
    const name = s.artist.trim();
    const key = name.toLowerCase();
    if (!key) continue;
    const existing = seen.get(key);
    if (!existing) seen.set(key, { name, image: s.artistImageRef });
    else if (!existing.image && s.artistImageRef) {
      existing.image = s.artistImageRef;
    }
  }
  return [...seen.values()].map(({ name, image }) => ({
    category: 'artists' as const,
    keywords: [name],
    result: {
      id: `artist-${name.toLowerCase()}`,
      category: 'artists',
      title: name,
      subtitle: 'Artist',
      // Jump to the Song Library filtered to this artist (it reads `?q=`).
      to: SongRoutes.root(undefined, { q: name }),
      icon,
      thumb: { src: image, avatarSeed: name, shape: 'circle' },
    },
  }));
}

/* ── Courses / genres ────────────────────────────────────────────────── */
function buildCourses(): IndexEntry[] {
  const icon = CATEGORY_META.courses.icon;
  return COURSES_GENRE_OPTIONS.filter((o) => o.value !== 'all').map((o) => ({
    category: 'courses' as const,
    keywords: [o.label, o.value],
    result: {
      id: `course-${o.value}`,
      category: 'courses',
      title: o.label,
      subtitle: 'Course',
      to: CurriculumRoutes.genre({ genre: o.value }),
      icon,
      thumb: { src: getGenreTileImage(o.value), shape: 'hex' },
    },
  }));
}

/* ── Theory / modes (diatonic + minor/major variants) ────────────────── */
const MODES: { slug: string; label: string; keywords: string[] }[] = [
  {
    slug: 'ionian',
    label: 'Ionian (Major)',
    keywords: ['ionian', 'major', 'major scale'],
  },
  { slug: 'dorian', label: 'Dorian', keywords: ['dorian'] },
  { slug: 'phrygian', label: 'Phrygian', keywords: ['phrygian'] },
  { slug: 'lydian', label: 'Lydian', keywords: ['lydian'] },
  { slug: 'mixolydian', label: 'Mixolydian', keywords: ['mixolydian'] },
  {
    slug: 'aeolian',
    label: 'Aeolian (Minor)',
    keywords: ['aeolian', 'minor', 'natural minor', 'minor scale'],
  },
  { slug: 'locrian', label: 'Locrian', keywords: ['locrian'] },
  {
    slug: 'melodicMinor',
    label: 'Melodic Minor',
    keywords: ['melodic minor', 'melodic'],
  },
  {
    slug: 'harmonicMinor',
    label: 'Harmonic Minor',
    keywords: ['harmonic minor'],
  },
  {
    slug: 'harmonicMajor',
    label: 'Harmonic Major',
    keywords: ['harmonic major'],
  },
];

function buildTheory(): IndexEntry[] {
  const icon = CATEGORY_META.theory.icon;
  return MODES.map((m) => ({
    category: 'theory' as const,
    keywords: [m.label, ...m.keywords],
    result: {
      id: `mode-${m.slug}`,
      category: 'theory',
      title: m.label,
      subtitle: 'Scale & Mode',
      to: LearnRoutes.overview({ mode: m.slug }),
      icon,
      thumb: { src: getTheoryTileImage(m.slug.toLowerCase()), shape: 'hex' },
    },
  }));
}

/* ── Globe / music-history events ────────────────────────────────────── */
function buildGlobe(): IndexEntry[] {
  const icon = CATEGORY_META.globe.icon;
  return MUSIC_HISTORY.map((e) => ({
    category: 'globe' as const,
    keywords: [e.title, ...(e.tags ?? []), e.location?.city ?? ''].filter(
      Boolean,
    ),
    result: {
      id: `globe-${e.id}`,
      category: 'globe',
      title: e.title,
      subtitle: e.location?.city
        ? `${e.year} · ${e.location.city}`
        : String(e.year),
      // atlas.tsx resolves `?event=<id>` against MUSIC_HISTORY by exact id.
      to: AtlasRoutes.root(undefined, { event: e.id }),
      icon,
      thumb: e.videoId
        ? {
            src: `https://img.youtube.com/vi/${e.videoId}/mqdefault.jpg`,
            shape: 'rounded',
          }
        : undefined,
    },
  }));
}

/* ── Arcade games ────────────────────────────────────────────────────── */
const GAMES: {
  id: string;
  label: string;
  description: string;
  to: string;
  keywords: string[];
}[] = [
  {
    id: 'chroma',
    label: 'Chroma',
    description: 'Ear Training Game',
    to: GameRoutes.chroma.definition,
    keywords: ['chroma', 'ear training', 'pitch', 'interval'],
  },
  {
    id: 'constellations',
    label: 'Constellations',
    description: 'Ear Training Game',
    to: GameRoutes.constellations.definition,
    keywords: ['constellations', 'ear training', 'melodic'],
  },
  {
    id: 'board-choice',
    label: 'Board Choice',
    description: 'Theory Game',
    to: GameRoutes.boardChoice.definition,
    keywords: ['board choice', 'theory', 'identify'],
  },
  {
    id: 'chord-connection',
    label: 'Chord Connection',
    description: 'Theory Game',
    to: GameRoutes.chordConnection.definition,
    keywords: ['chord connection', 'progression', 'connect'],
  },
  {
    id: 'chord-press',
    label: 'Chord Press',
    description: 'Technique Game',
    to: GameRoutes.chordPress.definition,
    keywords: ['chord press', 'technique', 'keyboard'],
  },
  {
    id: 'major-arcanum',
    label: 'Major Arcanum',
    description: 'Technique Game',
    to: GameRoutes.majorArcanum.definition,
    keywords: ['major arcanum', 'arcanum', 'voicing'],
  },
  {
    id: 'play-along',
    label: 'Play Along',
    description: 'Performance Game',
    to: GameRoutes.playAlong.definition,
    keywords: ['play along', 'backing track', 'performance'],
  },
  {
    id: 'foli',
    label: 'Foli',
    description: 'Rhythm Game',
    to: GameRoutes.foli.definition,
    keywords: ['foli', 'rhythm', 'pattern', 'drum'],
  },
  {
    id: 'groove-lab',
    label: 'Groove Lab',
    description: 'Rhythm Game',
    to: GameRoutes.grooveLab.definition,
    keywords: ['groove lab', 'groove', 'rhythm'],
  },
  {
    id: 'wave-sculptor',
    label: 'Wave Sculptor',
    description: 'Sound Lab',
    to: GameRoutes.waveSculptor.definition,
    keywords: ['wave sculptor', 'synthesis', 'synth', 'sound design'],
  },
  {
    id: 'harmonic-strings',
    label: 'Harmonic Strings',
    description: 'Sound Lab',
    to: GameRoutes.harmonicStrings.definition,
    keywords: ['harmonic strings', 'harmonics', 'strings'],
  },
  {
    id: 'signal-flow',
    label: 'Signal Flow',
    description: 'Sound Lab',
    to: GameRoutes.signalFlow.definition,
    keywords: ['signal flow', 'signal', 'routing'],
  },
  {
    id: 'jam-room',
    label: 'Jam Room',
    description: 'Multiplayer',
    to: GameRoutes.jamLobby.definition,
    keywords: ['jam room', 'multiplayer', 'jam session'],
  },
];

function buildArcade(): IndexEntry[] {
  const icon = CATEGORY_META.arcade.icon;
  return GAMES.map((g) => ({
    category: 'arcade' as const,
    keywords: [g.label, ...g.keywords],
    result: {
      id: `game-${g.id}`,
      category: 'arcade',
      title: g.label,
      subtitle: g.description,
      to: g.to,
      icon,
    },
  }));
}

/* ── Top-level pages / sections ──────────────────────────────────────── */
const PAGES: { id: string; label: string; to: string; keywords: string[] }[] = [
  {
    id: 'home',
    label: 'Home',
    to: ProfileRoutes.root(),
    keywords: ['home', 'dashboard'],
  },
  {
    id: 'learn',
    label: 'Learn',
    to: LearnRoutes.root(),
    keywords: ['learn', 'lessons', 'theory'],
  },
  {
    id: 'studio',
    label: 'Studio',
    to: StudioRoutes.root(),
    keywords: ['studio', 'daw', 'compose', 'produce', 'record'],
  },
  {
    id: 'globe',
    label: 'Globe',
    to: AtlasRoutes.root(),
    keywords: ['globe', 'atlas', 'world', 'map', 'history'],
  },
  {
    id: 'arcade',
    label: 'Arcade',
    to: GameRoutes.root(),
    keywords: ['arcade', 'games', 'play'],
  },
  {
    id: 'songs',
    label: 'Song Library',
    to: SongRoutes.root(),
    keywords: ['songs', 'song library', 'tracks'],
  },
  {
    id: 'classroom',
    label: 'Classroom',
    to: ClassroomRoutes.root(),
    keywords: ['classroom', 'class'],
  },
  {
    id: 'settings',
    label: 'Settings',
    to: SettingsRoutes.root(),
    keywords: ['settings', 'system', 'preferences', 'account'],
  },
];

function buildPages(): IndexEntry[] {
  const icon = CATEGORY_META.pages.icon;
  return PAGES.map((p) => ({
    category: 'pages' as const,
    keywords: [p.label, ...p.keywords],
    result: {
      id: `page-${p.id}`,
      category: 'pages',
      title: p.label,
      subtitle: 'Go to page',
      to: p.to,
      icon,
    },
  }));
}

/* ── Lazily-built, cached index (search route is itself lazy-loaded) ──── */
let cache: IndexEntry[] | null = null;

export function getStaticIndex(): IndexEntry[] {
  if (!cache) {
    cache = [
      ...buildSongs(),
      ...buildArtists(),
      ...buildCourses(),
      ...buildTheory(),
      ...buildGlobe(),
      ...buildArcade(),
      ...buildPages(),
    ];
  }
  return cache;
}
