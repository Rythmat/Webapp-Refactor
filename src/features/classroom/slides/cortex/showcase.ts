import { cortexColor } from '@/content/graph/cortexPalette';
import type { EdgeKind, EntityId, GraphNode } from '@/content/graph/types';
import type { LocalizedText } from '../../types';
import { atRef } from '../globe/slideGlobeStops';
import { getYouTubeVideoId } from '../songDeepLinks';
import type { SlideMedia } from '../types';
import { ARTIST_STORIES } from './artistStories';
import type { LessonCatalog } from './catalog';
import { linked, listOf, slugOf, type LessonGraph } from './graphQueries';
import type {
  LessonFocus,
  ShowcaseContent,
  ShowcaseFact,
  ShowcaseListen,
} from './types';

/**
 * The Showcase slide's content, read from the focus's connections: a few
 * facts in the student's language, a portrait or a mini-globe, and something
 * to listen to.
 */

/** Lines on the Showcase slide. */
export const MAX_FACTS = 5;
/** Event spots marked on a city's mini-globe, besides the city itself. */
const MAX_EVENT_MARKERS = 6;

const quote = (title: string): string => `“${title}”`;

const fact = (
  source: ShowcaseFact['source'],
  about: GraphNode[],
  en: string,
  es: string,
): ShowcaseFact => ({
  text: { en, es },
  source,
  about: about.map((n) => n.id),
});

const labels = (nodes: GraphNode[], max: number): string[] =>
  nodes.slice(0, max).map((n) => n.label);

/** "the 1960s" / "los 1960s", from a decade node's label. */
const decadeSpan = (
  decades: GraphNode[],
): { en: string; es: string } | null => {
  const sorted = decades.map((d) => d.label).sort();
  if (sorted.length === 0) return null;
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  return first === last
    ? { en: `in the ${first}`, es: `en los ${first}` }
    : {
        en: `from the ${first} to the ${last}`,
        es: `de los ${first} a los ${last}`,
      };
};

/** An event's own line: "1971: Marvin Gaye releases “What's Going On”". */
const eventFact = (
  catalog: LessonCatalog,
  source: EdgeKind,
  event: GraphNode,
): ShowcaseFact => {
  const year = catalog.events.get(slugOf(event.id))?.year;
  const line = year ? `${year}: ${event.label}` : event.label;
  return fact(source, [event], line, line);
};

/** The genres an artist is in, or a city is a scene of. */
const genresOf = (
  graph: LessonGraph,
  id: EntityId,
  edge: 'in_genre' | 'scene_of',
): GraphNode[] => linked(graph, id, edge, 'out');

const artistFacts = (
  graph: LessonGraph,
  catalog: LessonCatalog,
  focus: GraphNode,
): ShowcaseFact[] => {
  const facts: ShowcaseFact[] = [];
  const bornIn = linked(graph, focus.id, 'born_in', 'out')[0];
  const bornYear = linked(graph, focus.id, 'born_year', 'out')[0];
  const formedYear = linked(graph, focus.id, 'formed_year', 'out')[0];
  const basedIn = linked(graph, focus.id, 'based_in', 'out')[0];

  if (formedYear) {
    const where = basedIn ? ` in ${basedIn.label}` : '';
    const whereEs = basedIn ? ` en ${basedIn.label}` : '';
    facts.push(
      fact(
        'formed_year',
        [formedYear, ...(basedIn ? [basedIn] : [])],
        `Formed${where} in ${formedYear.label}.`,
        `Se formó${whereEs} en ${formedYear.label}.`,
      ),
    );
  } else if (bornIn) {
    const when = bornYear ? ` in ${bornYear.label}` : '';
    const whenEs = bornYear ? ` en ${bornYear.label}` : '';
    facts.push(
      fact(
        'born_in',
        [bornIn, ...(bornYear ? [bornYear] : [])],
        `Born in ${bornIn.label}${when}.`,
        `Nació en ${bornIn.label}${whenEs}.`,
      ),
    );
  }
  if (basedIn && !formedYear && basedIn.id !== bornIn?.id) {
    facts.push(
      fact(
        'based_in',
        [basedIn],
        `Based in ${basedIn.label}.`,
        `Con base en ${basedIn.label}.`,
      ),
    );
  }

  const songs = [
    ...linked(graph, focus.id, 'performed_by', 'in'),
    ...linked(graph, focus.id, 'written_by', 'in'),
  ].filter((s, i, all) => all.findIndex((x) => x.id === s.id) === i);
  if (songs.length > 0) {
    const titles = labels(songs, 2).map(quote);
    facts.push(
      fact(
        'performed_by',
        songs.slice(0, 2),
        `Known for ${listOf(titles, 'and')}.`,
        `Conocido por ${listOf(titles, 'y')}.`,
      ),
    );
  }

  const genres = genresOf(graph, focus.id, 'in_genre');
  if (genres.length > 0) {
    const names = labels(genres, 3);
    facts.push(
      fact(
        'in_genre',
        genres.slice(0, 3),
        `Sound: ${listOf(names, 'and')}.`,
        `Sonido: ${listOf(names, 'y')}.`,
      ),
    );
  }

  for (const event of linked(graph, focus.id, 'about', 'in').slice(0, 2))
    facts.push(eventFact(catalog, 'about', event));

  const groups = linked(graph, focus.id, 'member_of', 'out');
  if (groups.length > 0) {
    const names = labels(groups, 2);
    facts.push(
      fact(
        'member_of',
        groups.slice(0, 2),
        `Member of ${listOf(names, 'and')}.`,
        `Miembro de ${listOf(names, 'y')}.`,
      ),
    );
  }
  const members = linked(graph, focus.id, 'member_of', 'in');
  if (members.length > 0) {
    const names = labels(members, 3);
    facts.push(
      fact(
        'member_of',
        members.slice(0, 3),
        `Members include ${listOf(names, 'and')}.`,
        `Entre sus miembros: ${listOf(names, 'y')}.`,
      ),
    );
  }

  const span = decadeSpan(linked(graph, focus.id, 'active_in', 'out'));
  if (span)
    facts.push(
      fact('active_in', [], `Active ${span.en}.`, `Activo ${span.es}.`),
    );
  return facts;
};

const placeFacts = (
  graph: LessonGraph,
  catalog: LessonCatalog,
  focus: GraphNode,
): ShowcaseFact[] => {
  const facts: ShowcaseFact[] = [];
  const description = catalog.places.get(slugOf(focus.id))?.description;
  if (description)
    facts.push({ text: { en: description }, source: 'description', about: [] });

  const scenes = genresOf(graph, focus.id, 'scene_of');
  if (scenes.length > 0) {
    const names = labels(scenes, 3);
    facts.push(
      fact(
        'scene_of',
        scenes.slice(0, 3),
        `Known for ${listOf(names, 'and')}.`,
        `Conocida por ${listOf(names, 'y')}.`,
      ),
    );
  }

  const born = linked(graph, focus.id, 'born_in', 'in');
  if (born.length > 0) {
    const names = labels(born, 3);
    facts.push(
      fact(
        'born_in',
        born.slice(0, 3),
        `Birthplace of ${listOf(names, 'and')}.`,
        `Cuna de ${listOf(names, 'y')}.`,
      ),
    );
  }
  const named = new Set(born.slice(0, 3).map((n) => n.id));
  // Labels and studios are "based in" a city too; this line is about people.
  const based = linked(graph, focus.id, 'based_in', 'in').filter(
    (n) => n.kind === 'artist' && !named.has(n.id),
  );
  if (based.length > 0) {
    const names = labels(based, 3);
    facts.push(
      fact(
        'based_in',
        based.slice(0, 3),
        `Home to ${listOf(names, 'and')}.`,
        `Hogar de ${listOf(names, 'y')}.`,
      ),
    );
  }

  for (const event of linked(graph, focus.id, 'took_place_in', 'in').slice(
    0,
    2,
  ))
    facts.push(eventFact(catalog, 'took_place_in', event));

  const recorded = linked(graph, focus.id, 'recorded_in', 'in');
  if (recorded.length > 0) {
    const titles = labels(recorded, 2).map(quote);
    facts.push(
      fact(
        'recorded_in',
        recorded.slice(0, 2),
        `${listOf(titles, 'and')} ${recorded.length > 1 ? 'were' : 'was'} recorded here.`,
        `Aquí se ${recorded.length > 1 ? 'grabaron' : 'grabó'} ${listOf(titles, 'y')}.`,
      ),
    );
  }

  const span = decadeSpan(linked(graph, focus.id, 'scene_active_in', 'out'));
  if (span)
    facts.push(
      fact(
        'scene_active_in',
        [],
        `Its scene was active ${span.en}.`,
        `Su escena estuvo activa ${span.es}.`,
      ),
    );
  return facts;
};

/** A song's video, captioned "“Title” · Artist · Year". */
const songListen = (
  catalog: LessonCatalog,
  songNode: GraphNode,
): ShowcaseListen | null => {
  const song = catalog.songs.get(slugOf(songNode.id));
  const video = song ? getYouTubeVideoId(song) : null;
  if (!song || !video) return null;
  return {
    videoId: video.videoId,
    ...(video.startSec !== undefined ? { startSec: video.startSec } : {}),
    title: song.title,
    caption: [
      quote(song.title),
      song.artist,
      song.year ? String(song.year) : '',
    ]
      .filter(Boolean)
      .join(' · '),
    songId: song.id,
  };
};

/** An event's own video, captioned "Year · Title". */
const eventListen = (
  catalog: LessonCatalog,
  eventNode: GraphNode,
): ShowcaseListen | null => {
  const event = catalog.events.get(slugOf(eventNode.id));
  if (!event?.videoId) return null;
  return {
    videoId: event.videoId,
    title: event.title,
    caption: [event.year ? String(event.year) : '', event.title]
      .filter(Boolean)
      .join(' · '),
  };
};

const firstOf = <T>(
  items: readonly GraphNode[],
  pick: (node: GraphNode) => T | null,
): T | null => {
  for (const item of items) {
    const found = pick(item);
    if (found) return found;
  }
  return null;
};

/** How many places a globe slide visits. */
const MAX_STOPS = 10;

type GlobeStop = NonNullable<
  Extract<SlideMedia, { type: 'globePreview' }>['stops']
>[number];

/** At most this many words in a stop's story. */
export const STORY_MAX_WORDS = 32;

/**
 * The sentence of an event's description that says what it has to do with
 * the subject (the first naming them), else its first; past
 * `STORY_MAX_WORDS`, without its asides between dashes, then cut at a word.
 */
export const storySentence = (description: string, subject: string): string => {
  const sentences = description
    .split(/(?<=[.!?][”"'’]?)\s+(?=[A-Z"“'‘])/)
    .map((s) => s.trim())
    .filter(Boolean);
  const surname = subject.split(/\s+/).pop() ?? subject;
  const about =
    sentences.find((s) => s.includes(subject)) ??
    sentences.find((s) => surname.length > 3 && s.includes(surname)) ??
    sentences[0] ??
    '';
  // A long sentence loses its asides between dashes first.
  const trimmed =
    about.split(/\s+/).length > STORY_MAX_WORDS
      ? about.replace(/\s+[—–]\s+[^—–]+?\s+[—–]\s+/g, ' ')
      : about;
  const words = trimmed.split(/\s+/);
  return words.length <= STORY_MAX_WORDS
    ? trimmed
    : `${words
        .slice(0, STORY_MAX_WORDS)
        .join(' ')
        .replace(/[,;:—–-]+$/, '')}…`;
};

/**
 * The artist's places, in story order, for the full-screen globe (owner,
 * 2026-11-10): where they were born or based, then each event about them
 * that has a place and the lesson's own moments of it (artistStories.ts),
 * earliest first. Each named "Gary · 1958", and each with
 * its story: why the place matters to them (the event, the sentence of it
 * that names them, its video), shown on the slide's card at that stop.
 */
const artistStops = (
  graph: LessonGraph,
  catalog: LessonCatalog,
  focus: GraphNode,
  home: GraphNode,
  homeAt: [number, number],
  portraitSongId: string | undefined,
): GlobeStop[] => {
  const year =
    linked(graph, focus.id, 'born_year', 'out')[0] ??
    linked(graph, focus.id, 'formed_year', 'out')[0];
  const named = (place: string, when?: string | number): LocalizedText => {
    const text = when ? `${place} · ${when}` : place;
    return { en: text, es: text };
  };
  const spot = ([lat, lng]: [number, number]) =>
    `${lat.toFixed(1)},${lng.toFixed(1)}`;
  // Events pinned on the home town are the songs' pins, not moments of the
  // story; anywhere else, several moments may share a city (Los Angeles).
  const home$ = spot(homeAt);
  const later: { stop: GlobeStop; year: number }[] = [];
  for (const node of linked(graph, focus.id, 'about', 'in')) {
    const event = catalog.events.get(slugOf(node.id));
    if (typeof event?.lat !== 'number' || typeof event.lng !== 'number')
      continue;
    const at: [number, number] = [event.lat, event.lng];
    if (spot(at) === home$) continue;
    const city =
      linked(graph, node.id, 'took_place_in', 'out')[0]?.label ?? event.city;
    const body = event.description
      ? storySentence(event.description, focus.label)
      : '';
    later.push({
      stop: {
        location: at,
        label: named(city ?? event.title, event.year),
        ref: `event:${event.id}`,
        story: {
          title: { en: event.title, es: event.title },
          ...(body ? { body: { en: body, es: body } } : {}),
          ...(event.videoId ? { videoId: event.videoId } : {}),
          // Their photo, when the event's video has no picture.
          ...(portraitSongId ? { songId: portraitSongId } : {}),
        },
      },
      year: event.year ?? Number.MAX_SAFE_INTEGER,
    });
  }
  // The lesson's own moments of the story (artistStories.ts).
  for (const moment of ARTIST_STORIES[slugOf(focus.id)] ?? []) {
    later.push({
      stop: {
        location: moment.location,
        label: named(moment.place, moment.year),
        story: {
          title: moment.title,
          body: moment.body,
          ...(portraitSongId ? { songId: portraitSongId } : {}),
        },
      },
      year: moment.year,
    });
  }
  later.sort((a, b) => a.year - b.year);
  // The Globe pins the places it calls cities; a town it doesn't (Gary) is
  // opened by position, as the state it lies in.
  const homeRecord = catalog.places.get(slugOf(home.id));
  const homeRef =
    homeRecord && homeRecord.pin !== false
      ? `place:city:${homeRecord.id}`
      : atRef(homeAt);
  // Where the story starts: born (or based) here, with their photo.
  const born = linked(graph, focus.id, 'born_in', 'out')[0]?.id === home.id;
  const when = year ? ` in ${year.label}` : '';
  const whenEs = year ? ` en ${year.label}` : '';
  const homeStory = {
    title: born
      ? {
          en: `${focus.label} is born in ${home.label}${when}.`,
          es: `${focus.label} nace en ${home.label}${whenEs}.`,
        }
      : {
          en: `${focus.label} makes ${home.label} home.`,
          es: `${focus.label} hace de ${home.label} su hogar.`,
        },
    ...(portraitSongId ? { songId: portraitSongId } : {}),
  };
  return [
    {
      location: homeAt,
      label: named(home.label, year?.label),
      ref: homeRef,
      story: homeStory,
    },
    ...later.map((l) => l.stop),
  ].slice(0, MAX_STOPS);
};

const artistMedia = (
  graph: LessonGraph,
  catalog: LessonCatalog,
  focus: GraphNode,
): Pick<ShowcaseContent, 'visual' | 'listen' | 'globe' | 'portrait'> => {
  // Songs the artist performed, confirmed first: a portrait resolves through
  // a song, and only a song they performed carries their own portrait.
  const performed = [
    ...linked(graph, focus.id, 'performed_by', 'in'),
    ...linked(graph, focus.id, 'performed_by', 'in', { guesses: true }),
  ];
  const portrait = performed.find(
    (s) => catalog.songs.get(slugOf(s.id))?.artistImageRef,
  );
  const place =
    linked(graph, focus.id, 'born_in', 'out')[0] ??
    linked(graph, focus.id, 'based_in', 'out')[0];
  const coordinates = place
    ? catalog.places.get(slugOf(place.id))?.coordinates
    : undefined;
  const visual: SlideMedia | undefined = portrait
    ? { type: 'artistImage', songId: slugOf(portrait.id) }
    : coordinates
      ? {
          type: 'globePreview',
          markers: [{ location: coordinates, size: 0.09 }],
        }
      : undefined;
  const stops = coordinates
    ? artistStops(
        graph,
        catalog,
        focus,
        place!,
        coordinates,
        portrait ? slugOf(portrait.id) : undefined,
      )
    : [];
  const globe: SlideMedia | undefined = coordinates
    ? {
        type: 'globePreview',
        markers: [{ location: coordinates, size: 0.06 }],
        focus: coordinates,
        ...(stops.length > 0 ? { stops } : {}),
      }
    : undefined;
  const written = linked(graph, focus.id, 'written_by', 'in');
  const listen =
    firstOf(performed, (s) => songListen(catalog, s)) ??
    firstOf(linked(graph, focus.id, 'about', 'in'), (e) =>
      eventListen(catalog, e),
    ) ??
    firstOf(written, (s) => songListen(catalog, s));
  return {
    ...(visual ? { visual } : {}),
    ...(globe ? { globe } : {}),
    ...(portrait
      ? {
          portrait: {
            type: 'artistImage',
            songId: slugOf(portrait.id),
          } satisfies SlideMedia,
        }
      : {}),
    ...(listen ? { listen } : {}),
  };
};

const placeMedia = (
  graph: LessonGraph,
  catalog: LessonCatalog,
  focus: GraphNode,
): Pick<ShowcaseContent, 'visual' | 'listen' | 'globe' | 'portrait'> => {
  const coordinates = catalog.places.get(slugOf(focus.id))?.coordinates;
  const events = linked(graph, focus.id, 'took_place_in', 'in');
  // Most events are pinned on the city itself: one marker per spot, and none
  // on top of the city's own.
  const spot = (lat: number, lng: number) =>
    `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const marked = new Set(coordinates ? [spot(...coordinates)] : []);
  const eventMarkers: { location: [number, number]; size: number }[] = [];
  for (const e of events) {
    const event = catalog.events.get(slugOf(e.id));
    if (typeof event?.lat !== 'number' || typeof event.lng !== 'number')
      continue;
    const key = spot(event.lat, event.lng);
    if (marked.has(key)) continue;
    marked.add(key);
    eventMarkers.push({ location: [event.lat, event.lng], size: 0.05 });
    if (eventMarkers.length >= MAX_EVENT_MARKERS) break;
  }
  const visual: SlideMedia | undefined = coordinates
    ? {
        type: 'globePreview',
        markers: [{ location: coordinates, size: 0.09 }, ...eventMarkers],
      }
    : undefined;
  const homeArtists = [
    ...linked(graph, focus.id, 'born_in', 'in'),
    ...linked(graph, focus.id, 'based_in', 'in'),
  ];
  // The city's face: the first of its own artists with a portrait.
  const portraitSong = firstOf(homeArtists, (artist) =>
    firstOf(linked(graph, artist.id, 'performed_by', 'in'), (s) =>
      catalog.songs.get(slugOf(s.id))?.artistImageRef ? s : null,
    ),
  );
  const listen =
    firstOf(linked(graph, focus.id, 'recorded_in', 'in'), (s) =>
      songListen(catalog, s),
    ) ??
    firstOf(events, (e) => eventListen(catalog, e)) ??
    firstOf(homeArtists, (artist) =>
      firstOf(linked(graph, artist.id, 'performed_by', 'in'), (s) =>
        songListen(catalog, s),
      ),
    );
  return {
    ...(visual ? { visual } : {}),
    ...(visual && coordinates
      ? { globe: { ...visual, focus: coordinates } as SlideMedia }
      : {}),
    ...(portraitSong
      ? {
          portrait: {
            type: 'artistImage',
            songId: slugOf(portraitSong.id),
          } satisfies SlideMedia,
        }
      : {}),
    ...(listen ? { listen } : {}),
  };
};

/** The Showcase for a focus: facts, a visual, and something to listen to. */
export const showcaseFor = (
  graph: LessonGraph,
  catalog: LessonCatalog,
  focus: LessonFocus,
): ShowcaseContent => {
  const node = graph.nodes.get(focus.id);
  if (!node) return { facts: [], accent: accentFor(focus) };
  const facts =
    focus.kind === 'artist'
      ? artistFacts(graph, catalog, node)
      : placeFacts(graph, catalog, node);
  const media =
    focus.kind === 'artist'
      ? artistMedia(graph, catalog, node)
      : placeMedia(graph, catalog, node);
  return {
    facts: facts.slice(0, MAX_FACTS),
    ...media,
    accent: accentFor(focus),
  };
};

/** The focus kind's Cortex colour: artists teal, places rust. */
export const accentFor = (focus: Pick<LessonFocus, 'kind'>): string =>
  cortexColor(focus.kind === 'artist' ? 'Artists' : 'Location');

/** The Showcase facts as one slide body, a line each. */
/**
 * How many facts the Showcase slide shows. Shown in both languages they are
 * twice as many lines, and more than three run off the slide; the rest go to
 * the teacher's notes as things to say.
 */
export const SHOWCASE_SLIDE_FACTS = 3;

/** The Showcase slide's body: its first facts, one a line. */
export const showcaseBody = (facts: readonly ShowcaseFact[]): LocalizedText => {
  const shown = facts.slice(0, SHOWCASE_SLIDE_FACTS);
  return {
    en: shown.map((f) => f.text.en).join('\n'),
    es: shown.map((f) => f.text.es ?? f.text.en).join('\n'),
  };
};

/** At most this many words in a portrait's bio (owner, 2026-11-10). */
export const BIO_MAX_WORDS = 25;

const wordCount = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

/**
 * The portrait's short bio: who and what, in two sentences at most. Facts
 * about events stay off it (they are the globe's places and the teacher's
 * talking points); a fact that would take the bio past its word budget is
 * skipped.
 */
export const showcaseBio = (facts: readonly ShowcaseFact[]): LocalizedText => {
  const picked: ShowcaseFact[] = [];
  let words = 0;
  for (const fact of facts) {
    if (picked.length === 2) break;
    if (fact.source === 'about' || fact.source === 'took_place_in') continue;
    const n = wordCount(fact.text.en);
    if (words + n > BIO_MAX_WORDS) continue;
    picked.push(fact);
    words += n;
  }
  return {
    en: picked.map((f) => f.text.en).join(' '),
    es: picked.map((f) => f.text.es ?? f.text.en).join(' '),
  };
};
