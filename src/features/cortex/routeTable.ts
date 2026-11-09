import { GameRoutes } from '@/constants/routes';
import { artistSlug } from '@/content/graph/slugs';
import {
  genreLessonId,
  theoryId,
  type CortexId,
  type TheoryInstrument,
} from './ids';

/**
 * Which activity an address is, or null when it isn't one (a list, a hub, a
 * settings page). Pure: the capture hook times how long it stays on one.
 */

const INSTRUMENT_SEGMENTS: Readonly<Record<string, TheoryInstrument>> = {
  keyboard: 'piano',
  guitar: 'guitar',
  bass: 'bass',
  ukulele: 'ukulele',
};

/** Segments under an instrument that outrank a lesson's '/:mode/:key'. */
const NOT_A_MODE = new Set([
  'start-here',
  'songs',
  'genre',
  'theory',
  'technique',
  'world-harmony',
  'relative',
  'parallel',
]);

const decode = (segment: string): string => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

/** '/arcade/chroma' → 'chroma', from the routes themselves. */
const gameBySegment = (): ReadonlyMap<string, string> => {
  const games = new Map<string, string>();
  for (const [key, route] of Object.entries(GameRoutes)) {
    if (key === 'root' || key === 'picker') continue;
    const [, , segment] = route.definition.split('/');
    // Every jam address (the lobby, a room, local) is one game: its lobby.
    if (segment && !games.has(segment))
      games.set(segment, segment === 'jam' ? 'jamLobby' : key);
  }
  return games;
};

const learnActivity = (parts: readonly string[]): CortexId | null => {
  const [section, a, b, c] = parts;
  if (section === 'audio') {
    if (a === 'anatomy') return b ? `anatomy:${b}` : null;
    return a && b ? `audio:${a}.${b}` : null;
  }
  const instrument = INSTRUMENT_SEGMENTS[section];
  if (!instrument) return null;
  if (a === 'technique') {
    return b === 'harmonics' || b === 'linus-and-lucy'
      ? `technique:${b}`
      : null;
  }
  if (a === 'genre') {
    return instrument === 'piano' && b && c ? genreLessonId(b, c) : null;
  }
  if (!a || !b || c || NOT_A_MODE.has(a)) return null;
  return theoryId(instrument, decode(a), decode(b));
};

const curriculumActivity = (parts: readonly string[]): CortexId | null => {
  const [a, b, c] = parts;
  if (a === 'piano-fundamentals') return 'technique:piano-fundamentals';
  if (a === 'applied-theory-fundamentals') return 'technique:applied-theory';
  if (a === 'guitar' && b === 'applied-theory-fundamentals')
    return 'technique:guitar-applied-theory';
  if (a === 'music-literacy' && b && !c) return `literacy:${b}`;
  return null;
};

const globeActivity = (params: URLSearchParams): CortexId | null => {
  // A pathway or tour drives the map itself: its stops aren't the student's.
  if (params.get('pathway') || params.get('tour')) return null;
  const event = params.get('event');
  if (event) {
    return event.startsWith('song-')
      ? `song:${event.slice('song-'.length)}`
      : `event:${event}`;
  }
  const artist = params.get('artist');
  if (artist) return `artist:${artistSlug(artist)}`;
  const place = params.get('place');
  if (place) return `place:${place.replace(/^[a-z]+:/, '')}`;
  return null;
};

export const activityForLocation = (
  pathname: string,
  search: string,
): CortexId | null => {
  const [root, ...rest] = pathname.split('/').filter(Boolean);
  const params = new URLSearchParams(search);
  switch (root) {
    case 'songs': {
      const [songId, extra] = rest;
      return songId && songId !== 'setlists' && !extra
        ? `song:${decode(songId)}`
        : null;
    }
    case 'learn':
      return rest.length > 0 ? learnActivity(rest) : null;
    case 'curriculum':
      return curriculumActivity(rest);
    case 'arcade': {
      const game = rest[0] ? gameBySegment().get(rest[0]) : undefined;
      return game ? `game:${game}` : null;
    }
    case 'studio': {
      if (rest.length > 0) return null;
      const project = params.get('project');
      if (project) return `project:${project}`;
      const tutorial = params.get('tutorial');
      return tutorial ? `tutorial:${tutorial}` : null;
    }
    case 'globe':
      return globeActivity(params);
    default:
      return null;
  }
};
