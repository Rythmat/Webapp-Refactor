import { ARCADE_GAMES } from '@/components/Games/arcadeGames';
import type { HistoricalEvent } from '@/components/atlas/types';
import { getChordScales } from '@/components/learn/chordScaleData';
import { GameRoutes, LearnRoutes } from '@/constants/routes';
import { getGenre, SONG_TAG_TO_GENRE } from '@/content/graph/genres';
import { canonicalId } from '@/content/graph/ids';
import { keyColourOfSlugs } from '@/content/graph/keyColour';
import type { EntityId } from '@/content/graph/types';
import {
  AUDIO_MODULES,
  audioLessonRoute,
  type AudioLesson,
  type AudioModule,
} from '@/curriculum/audio/catalog';
import {
  CURRICULUM_GENRE_SLUGS,
  type CurriculumGenreId,
} from '@/curriculum/bridge/genreIdMap';
import { getSong } from '@/curriculum/data/songs';
import { LITERACY_PATH } from '@/curriculum/musicLiteracy/literacyPath';
import type { Song } from '@/curriculum/types/songLibrary';
import { getTutorialEntry } from '@/daw/components/Tutorial/tutorialCatalog';
import { engineModeName, keyColourOf } from '@/daw/prism-engine/data/keyColour';
import { keyLabelToUrlParam } from '@/lib/musicKeyUrl';
import { sessionDisplayName } from '@/lib/studio-projects/sessionName';
import type { WebActivity } from './buildWeb';
import { genreLessonId, kindOfId, type CortexId } from './ids';
import type { CortexRecord } from './ledger';
import {
  artistConcept,
  keyConcept,
  modeConcept,
  songConcepts,
  type ConceptRef,
} from './songConcepts';

/**
 * What the map knows about a record: its name, where it opens and what it
 * shares with other activities. Loads with the Cortex page, not the dashboard:
 * this is where the catalogues come in. A record that names nothing this build
 * knows (a song since removed) draws nothing.
 */

export interface DescribeContext {
  /** The student's Studio projects, by id; undefined until they've loaded. */
  projects?: ReadonlyMap<string, ProjectFacts>;
  /** A Globe event's name, once the Globe's data has loaded. */
  eventTitle?: (id: string) => string | undefined;
}

export interface ProjectFacts {
  name: string;
  genre: string | null;
}

const words = (slug: string) =>
  slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');

const COURSE_GENRES = Object.values(CURRICULUM_GENRE_SLUGS) as string[];

/** The curriculum's neo-soul is a subgenre of the songs' R&B: they should meet. */
const GENRE_OF_COURSE: Readonly<Record<string, string>> = {
  'neo-soul': 'rnb',
};

const genreConcept = (genreId: string): ConceptRef => {
  const course = COURSE_GENRES.includes(genreId) ? genreId : undefined;
  return {
    id: `genre:${genreId}`,
    kind: 'genre',
    label: getGenre(genreId)?.name ?? words(genreId),
    route: course ? LearnRoutes.genreCourse({ genre: course }) : undefined,
  };
};

const instrumentConcept = (instrument: string): ConceptRef => ({
  id: `instrument:${instrument}`,
  kind: 'instrument',
  label: words(instrument),
});

const groupConcept = (
  id: string,
  label: string,
  route?: string,
): ConceptRef => ({
  id: `group:${id}`,
  kind: 'group',
  label,
  route,
});

const STUDIO_GROUP = groupConcept('studio', 'Studio', '/studio/production');

const conceptsOfSong = (song: Song) =>
  songConcepts(song, (tag) => {
    const genreId = SONG_TAG_TO_GENRE[tag] ?? tag;
    return genreId ? genreConcept(genreId) : null;
  });

/** `d-flat` → the lesson route's `dflat`. */
const keyParamOfSlug = (slug: string): string =>
  keyLabelToUrlParam(
    `${slug[0].toUpperCase()}${
      slug.endsWith('-flat') ? '♭' : slug.endsWith('-sharp') ? '♯' : ''
    }`,
  );

const THEORY_SEGMENT: Readonly<Record<string, string>> = {
  piano: 'keyboard',
  guitar: 'guitar',
  bass: 'bass',
  ukulele: 'ukulele',
};

const theoryFacts = (rest: string) => {
  const [instrument, mode, key] = rest.split('.');
  const segment = THEORY_SEGMENT[instrument];
  const modeName = getChordScales(mode)?.modeName;
  if (!segment || !key || !modeName) return null;
  return {
    label: `${modeName} in ${keyConcept(key).label.replace('Key of ', '')}`,
    detail: instrument === 'piano' ? undefined : words(instrument),
    route: `/learn/${segment}/${encodeURIComponent(mode)}/${keyParamOfSlug(key)}`,
    keyColour: keyColourOfSlugs(key, mode) ?? undefined,
    concepts: [
      modeConcept(mode, modeName),
      keyConcept(key),
      // Every piano lesson sharing "Piano" would only make a hub.
      ...(instrument === 'piano' ? [] : [instrumentConcept(instrument)]),
    ],
  };
};

const genreLessonFacts = (rest: string) => {
  const match = /^(.+)-l(\d+)$/.exec(rest);
  if (!match) return null;
  const slug = COURSE_GENRES.find(
    (s) => genreLessonId(s, match[2]) === `lesson:${rest}`,
  );
  if (!slug) return null;
  const name =
    getGenre(slug)?.name ??
    words(
      Object.entries(CURRICULUM_GENRE_SLUGS).find(
        ([, s]) => s === slug,
      )?.[0] as CurriculumGenreId,
    );
  const genre = genreConcept(GENRE_OF_COURSE[slug] ?? slug);
  return {
    label: `${name} · Level ${match[2]}`,
    route: LearnRoutes.genreLesson({ genre: slug, level: match[2] }),
    concepts: [
      slug in GENRE_OF_COURSE
        ? { ...genre, route: LearnRoutes.genreCourse({ genre: slug }) }
        : genre,
    ],
  };
};

const findLesson = (
  find: (module: AudioModule, lesson: AudioLesson) => boolean,
) => {
  for (const module of AUDIO_MODULES) {
    for (const lesson of module.lessons) {
      if (find(module, lesson)) return { module, lesson };
    }
  }
  return null;
};

const audioFacts = (rest: string) => {
  const [moduleId, lessonId] = rest.split('.');
  const found = findLesson(
    (m, l) =>
      m.id === moduleId &&
      l.id === lessonId &&
      (l.kind === 'lab' || l.kind === 'guided'),
  );
  if (!found) return null;
  return {
    label: found.lesson.title,
    detail: found.module.title,
    route: audioLessonRoute(found.module, found.lesson),
    concepts: [groupConcept(`audio-${found.module.id}`, found.module.title)],
  };
};

/** Which instrument an Anatomy lesson connects to; the Gear shelf has none. */
const ANATOMY_INSTRUMENT: Readonly<Record<string, string>> = {
  piano: 'piano',
  keyboard: 'piano',
  synth: 'synth',
  guitar: 'guitar',
  bass: 'bass',
  ukulele: 'ukulele',
};

const anatomyFacts = (rest: string) => {
  const found = findLesson((_, l) => l.kind === 'anatomy' && l.id === rest);
  if (!found) return null;
  const instrument = ANATOMY_INSTRUMENT[rest];
  return {
    label: found.lesson.title,
    route: audioLessonRoute(found.module, found.lesson),
    concepts: instrument
      ? [instrumentConcept(instrument)]
      : [groupConcept('gear', 'Gear')],
  };
};

const TECHNIQUE: Readonly<
  Record<string, { label: string; route: string; instrument: string }>
> = {
  harmonics: {
    label: 'Guitar Harmonics',
    route: LearnRoutes.guitarHarmonics(),
    instrument: 'guitar',
  },
  'linus-and-lucy': {
    label: 'Linus and Lucy',
    route: LearnRoutes.linusAndLucy(),
    instrument: 'piano',
  },
  'piano-fundamentals': {
    label: 'Piano Fundamentals',
    route: '/curriculum/piano-fundamentals',
    instrument: 'piano',
  },
  'applied-theory': {
    label: 'Applied Theory Fundamentals',
    route: '/curriculum/applied-theory-fundamentals',
    instrument: 'piano',
  },
  'guitar-applied-theory': {
    label: 'Applied Theory Fundamentals',
    route: '/curriculum/guitar/applied-theory-fundamentals',
    instrument: 'guitar',
  },
};

const facts = (
  id: string,
  ctx: DescribeContext,
): Pick<
  WebActivity,
  'label' | 'detail' | 'route' | 'concepts' | 'keyColour'
> | null => {
  const kind = kindOfId(id);
  const rest = id.slice(id.indexOf(':') + 1);
  switch (kind) {
    case 'song': {
      const song = getSong(rest);
      if (!song) return null;
      return {
        label: song.title,
        detail: song.artist,
        route: `/songs/${song.id}`,
        concepts: conceptsOfSong(song),
        // Its key centre's colour: 24k Magic, in F minor, is A♭'s indigo.
        keyColour: keyColourOf(
          song.keyRoot,
          engineModeName(song.mode) ?? 'ionian',
        ),
      };
    }
    case 'theory':
      return theoryFacts(rest);
    case 'lesson':
      return genreLessonFacts(rest);
    case 'audio':
      return audioFacts(rest);
    case 'anatomy':
      return anatomyFacts(rest);
    case 'technique': {
      const item = TECHNIQUE[rest];
      if (!item) return null;
      return {
        label: item.label,
        detail:
          item.instrument === 'piano' ? undefined : words(item.instrument),
        route: item.route,
        concepts: [instrumentConcept(item.instrument)],
      };
    }
    case 'literacy': {
      const stop = LITERACY_PATH.find(
        (s) => s.lessonId === rest || s.id === rest,
      );
      if (!stop) return null;
      return {
        label: stop.title,
        detail: 'Music Literacy',
        route: `/curriculum/music-literacy/${encodeURIComponent(rest)}`,
        concepts: [
          groupConcept(
            'music-literacy',
            'Music Literacy',
            '/curriculum/music-literacy',
          ),
        ],
      };
    }
    case 'game': {
      const game = ARCADE_GAMES.find((g) => g.route === rest);
      if (!game) return null;
      const route = GameRoutes[rest as keyof typeof GameRoutes];
      return {
        label: game.title,
        detail: game.category,
        route: route?.definition,
        concepts: [groupConcept(`arcade-${game.category}`, game.category)],
      };
    }
    case 'project': {
      const project = ctx.projects?.get(rest);
      if (!project) return null;
      const genre = project.genre
        ? genreConcept(SONG_TAG_TO_GENRE[project.genre] ?? project.genre)
        : null;
      return {
        label: sessionDisplayName(project.name),
        detail: 'Studio',
        route: `/studio?project=${encodeURIComponent(rest)}`,
        concepts: genre ? [genre, STUDIO_GROUP] : [STUDIO_GROUP],
      };
    }
    case 'tutorial': {
      const entry = getTutorialEntry(rest);
      if (!entry) return null;
      return {
        label: entry.title,
        detail: 'Studio lesson',
        route: `/studio?tutorial=${encodeURIComponent(rest)}`,
        concepts: [STUDIO_GROUP],
      };
    }
    case 'artist': {
      const name = words(rest);
      const concept = artistConcept(name);
      return {
        label: name,
        detail: 'Globe',
        route: concept.route,
        concepts: [groupConcept('globe', 'Globe', '/globe')],
      };
    }
    case 'place':
      return {
        label: words(rest),
        detail: 'Globe',
        route: `/globe?place=${encodeURIComponent(`city:${rest}`)}`,
        concepts: [groupConcept('globe', 'Globe', '/globe')],
      };
    case 'event': {
      const title = ctx.eventTitle?.(rest);
      if (!title) return null;
      return {
        label: title,
        detail: 'Globe',
        route: `/globe?event=${encodeURIComponent(rest)}`,
        concepts: [groupConcept('globe', 'Globe', '/globe')],
      };
    }
    default:
      return null;
  }
};

/** Ms from a record's minutes; 0 and backfill's undated 1 both say "no date". */
const fromMinutes = (minutes: number) => (minutes > 1 ? minutes * 60_000 : 0);

/** A record as a map activity, or null when it names nothing known. */
export const describeActivity = (
  id: string,
  record: CortexRecord,
  ctx: DescribeContext,
): WebActivity | null => {
  // A Globe event that's really a song's recording is that song.
  const canonical = id.startsWith('event:')
    ? (canonicalId(id as EntityId) as string)
    : id;
  const kind = kindOfId(canonical);
  const about = facts(canonical, ctx);
  if (!kind || !about) return null;
  return {
    id: canonical as CortexId,
    kind,
    ...about,
    done: record[2] > 0,
    lastAt: fromMinutes(record[1]),
    doneAt: fromMinutes(record[2]),
  };
};

export const eventTitleLookup = (
  events: readonly HistoricalEvent[],
): ((id: string) => string | undefined) => {
  const byId = new Map(events.map((e) => [e.id, e.title]));
  return (id) => byId.get(id);
};
