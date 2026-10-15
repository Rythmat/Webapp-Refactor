import { cortexColor } from '@/content/graph/cortexPalette';
import type { EdgeKind, EntityId, GraphNode } from '@/content/graph/types';
import type { LocalizedText } from '../../types';
import { getYouTubeVideoId } from '../songDeepLinks';
import type { SlideMedia } from '../types';
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

const artistMedia = (
  graph: LessonGraph,
  catalog: LessonCatalog,
  focus: GraphNode,
): Pick<ShowcaseContent, 'visual' | 'listen'> => {
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
  const written = linked(graph, focus.id, 'written_by', 'in');
  const listen =
    firstOf(performed, (s) => songListen(catalog, s)) ??
    firstOf(linked(graph, focus.id, 'about', 'in'), (e) =>
      eventListen(catalog, e),
    ) ??
    firstOf(written, (s) => songListen(catalog, s));
  return {
    ...(visual ? { visual } : {}),
    ...(listen ? { listen } : {}),
  };
};

const placeMedia = (
  graph: LessonGraph,
  catalog: LessonCatalog,
  focus: GraphNode,
): Pick<ShowcaseContent, 'visual' | 'listen'> => {
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
