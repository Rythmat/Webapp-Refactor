import { songIdForEvent } from '@/components/atlas/data/songEventAliases';
import type { ArtistRecord } from '@/content/records/types';
import type { Song } from '@/curriculum/types/songLibrary';
import { artistBirthSchema } from '@/scripts/apiContract/recordBodySchemas';
import { REF_PATHS, type RefPath } from '@/scripts/apiContract/refPaths';
import { edgesForSong } from './deriveEdges';
import {
  type ArtistLocationInput,
  buildGraph,
  edgesForArtistLocation,
  edgesForEvent,
  type GlobeEventInput,
  type Graph,
  type GraphSnapshot,
  INFLUENCE_ARC_PATH,
  isGroupArtist,
  type SnapshotList,
} from './deriveGraph';
import { resolveGenreTag } from './genreTags';
import { canonicalId, isWellFormedSlug, toEntityId } from './ids';
import { artistSlug, normalizeArtistName } from './slugs';
import { decadesBetween, isCalendarDate, yearOf } from './time';
import {
  EDGE_KINDS,
  ENTITY_KINDS,
  type Edge,
  type EdgeKind,
  type EdgeVia,
  type EntityId,
  type EntityKind,
  type GraphEdge,
  isCodeOwnedVia,
  isWellFormed,
} from './types';

/**
 * What is wrong with the Atlas's metadata, as rows for the console's Integrity
 * page (design §3.5), plus how much of each reference field is filled in.
 *
 * It reads a snapshot and the graph built from it and changes neither. Every
 * check is here because the graph's own promises depend on someone acting on
 * it: `buildGraph` never drops a bad edge silently and never invents a node, so
 * a malformed id, a reference to nothing or an edge between the wrong kinds
 * surfaces here instead of vanishing.
 *
 * Each row names the node it is about and, where one field states the
 * problem, the item and field to fix (`fix`, from the edge's `via`). The
 * console decides whether that item is editable: a code-owned list (a Teach
 * day, a pathway, the influence arcs) links to its owner's explanation.
 *
 * Severity:
 *  - `error` — a stored reference is wrong: it names nothing, the wrong kind,
 *    or breaks the id grammar; a loop where there must be none; an edge the
 *    graph refused;
 *  - `warning` — two stated facts disagree, two records look like one thing,
 *    published content points at a draft, years active cannot be read as a
 *    span, or the globe has an event for a song the library lacks;
 *  - `info` — worth a look, never wrong on its own: a guess from display text
 *    that matches no record, an unconnected node, a near-miss spelling, an
 *    unconfirmed claim, an artist influence the globe already states, song
 *    pins somewhere other than the act's City, a group with a birthplace, a
 *    song's label id beside records that name no label.
 */

/* ── Rows ────────────────────────────────────────────────────────────── */

export type IntegrityCheck =
  /** A stored id that names nothing. */
  | 'dangling'
  /** A value that names something of another kind. */
  | 'wrong-kind'
  /** A value that breaks its kind's id grammar. */
  | 'malformed'
  /** An edge between kinds it may not join, after folding song events. */
  | 'endpoints'
  /** A guess from display text that matches no record. */
  | 'unresolved'
  | 'orphan'
  | 'duplicate'
  | 'cycle'
  /**
   * Two fields that should agree do not: a lead act the billing leaves out,
   * an event's stored place and its city, song pins away from the act's City,
   * a group's birthplace beside its City, members on a record not marked a
   * group, a song's label id beside its records'.
   */
  | 'conflicting-owners'
  /**
   * Years the calendar cannot read: years active that end before they start
   * or span centuries, a year field that is not a year at all, a birth that
   * is no date, still to come, or after the first year active.
   */
  | 'impossible-years'
  /** An artist influence the globe's arcs already state (Amendment 2). */
  | 'restated-influence'
  /** Published content pointing at an unpublished item. */
  | 'draft-reference'
  | 'unverified';

export const INTEGRITY_CHECKS: readonly IntegrityCheck[] = [
  'dangling',
  'wrong-kind',
  'malformed',
  'endpoints',
  'unresolved',
  'orphan',
  'duplicate',
  'cycle',
  'conflicting-owners',
  'impossible-years',
  'restated-influence',
  'draft-reference',
  'unverified',
];

export type IntegritySeverity = 'error' | 'warning' | 'info';

/** The item and field that state a problem: where the Fix link goes. */
export interface IntegrityFix {
  kind: EntityKind;
  id: EntityId;
  /** A body path as REF_PATHS writes it, or a code list's own path. */
  path: string;
}

export interface IntegrityRow {
  check: IntegrityCheck;
  severity: IntegritySeverity;
  /** The kind of the node the row is about, for grouping. */
  kind: EntityKind;
  /** The node the row is about, canonical (the mind map's `?focus=`). */
  id: EntityId;
  /** Its field at fault, when one field is. */
  path?: string;
  message: string;
  fix?: IntegrityFix;
  /** The other nodes involved: the missing target, the twin, the loop. */
  related?: EntityId[];
}

/* ── Coverage ────────────────────────────────────────────────────────── */

/**
 * How much of one reference field is filled in, over one content kind.
 *
 * A field is an id path together with the display-text paths it links
 * (`credits[].artistGlobeId` with `credits[].name`), because a credit written
 * only as a name is the same fact, not yet linked. A text field with no id
 * field yet (`session.studio` before v2) is its own row, all guesses.
 *
 * `linked + inferred = set`: an item counts as linked only when every value
 * of the field is a stored id, so one unlinked credit keeps its song on the
 * worklist.
 */
export interface CoverageRow {
  /** The content kind, as REF_PATHS names it. */
  kind: ContentKind;
  /** The id path, or the text path when the field has no id path yet. */
  path: string;
  target: string;
  /** The display-text paths this id path links; empty when there are none. */
  legacyPaths: string[];
  /** Items of this kind in the snapshot. */
  items: number;
  /** Items with the field set at all, by id or by text. */
  set: number;
  /** Items whose every value is a stored id. */
  linked: number;
  /** Items with at least one value only as text: a guess until linked. */
  inferred: number;
  /** The same split, counted per value. */
  values: { linked: number; inferred: number };
}

export interface IntegrityReport {
  /** Most severe first, then by check, node and field. */
  rows: IntegrityRow[];
  coverage: CoverageRow[];
  /** Rows per check, for the page's tabs. */
  counts: Record<IntegrityCheck, number>;
  /** Unconfirmed records (nodes) and connections (edges). */
  unverified: { nodes: number; edges: number };
}

/* ── Content kinds ───────────────────────────────────────────────────── */

export type ContentKind = RefPath['kind'];

/** The snapshot lists that hold content items. */
type RecordList = Exclude<
  SnapshotList,
  | 'dayStubs'
  | 'pathways'
  | 'influenceArcs'
  // Instrument content is code-owned too: no content kind yet.
  | 'grooves'
  | 'parts'
  | 'feels'
  | 'patches'
  | 'kits'
  | 'lessons'
>;

type Body = Readonly<Record<string, unknown>>;

/**
 * Where each content kind's items sit in a snapshot, which graph kind they
 * are, and which body field is their identity (decision 3). Typed as a
 * complete record so a new REF_PATHS kind fails to compile until it is here.
 *
 * Two kinds need more than a field. A globe event's paths are held to the
 * hand-authored `evt-` events: a `song-` event is its song, and the graph
 * reads nothing of its own (`only`). An artist location is keyed by the act's
 * name in lowercase, and the node it speaks for is the artist of that name
 * (`nodeSlug`).
 */
export const CONTENT_KINDS: Record<
  ContentKind,
  {
    entity: EntityKind;
    list: RecordList;
    identity: 'id' | 'slug';
    /** The identity value → the node's slug, where the two differ. */
    nodeSlug?: (value: string) => string;
    /** The items of the list that are this kind's, where not all are. */
    only?: (item: Body) => boolean;
  }
> = {
  song: { entity: 'song', list: 'songs', identity: 'id' },
  chord_progression: {
    entity: 'progression',
    list: 'progressions',
    identity: 'id',
  },
  artist: { entity: 'artist', list: 'artists', identity: 'slug' },
  release: { entity: 'release', list: 'releases', identity: 'slug' },
  studio: { entity: 'studio', list: 'studios', identity: 'slug' },
  label: { entity: 'label', list: 'labels', identity: 'slug' },
  globe_city: { entity: 'place', list: 'places', identity: 'id' },
  globe_event: {
    entity: 'event',
    list: 'events',
    identity: 'id',
    only: (event) => String(event.id).trim().startsWith('evt-'),
  },
  artist_location: {
    entity: 'artist',
    list: 'artistLocations',
    identity: 'id',
    nodeSlug: artistSlug,
  },
};

const itemsOf = (
  snapshot: GraphSnapshot,
  kind: ContentKind,
): readonly object[] => {
  const { list, only } = CONTENT_KINDS[kind];
  const items: readonly object[] = snapshot[list] ?? [];
  return only ? items.filter((item) => only(item as Body)) : items;
};

const itemIdOf = (kind: ContentKind, item: object): EntityId => {
  const spec = CONTENT_KINDS[kind];
  const value = String((item as Body)[spec.identity]).trim();
  return `${spec.entity}:${spec.nodeSlug ? spec.nodeSlug(value) : value}`;
};

/**
 * Display-text paths → the id path that links each. REF_PATHS names these
 * pairs only in prose (its `note`) until the legacy linker needs them machine
 * readable; the test holds this table to REF_PATHS.
 *
 * A globe event's `title` and `tags[]` are not here: each names artists and
 * songs at once, so it links two id paths (`artistIds[]`, `songIds[]`), and
 * what it states is what the matcher found (`MATCHED_PATHS`), so each keeps a
 * row of its own. Its `location.city` is one place, linked by `placeId`.
 */
export const LINKED_BY: Readonly<Record<string, string>> = {
  'song|artist': 'origin.artistGlobeId',
  'song|credits[].name': 'credits[].artistGlobeId',
  'song|relatedRecordings[].artist': 'relatedRecordings[].artistGlobeId',
  'song|session.studio': 'session.studioId',
  'song|session.label': 'session.labelId',
  'song|session.city': 'session.placeId',
  'chord_progression|song': 'songIds[]',
  'globe_event|location.city': 'placeId',
};

/* ── Reading body paths ──────────────────────────────────────────────── */

const segmentsOf = (path: string): string[] => path.split('.');

/** Every value at a REF_PATHS path: `credits[].name` → each credit's name. */
function walk(value: unknown, segments: readonly string[]): unknown[] {
  if (!segments.length) return [value];
  if (value === null || typeof value !== 'object') return [];
  const [head, ...rest] = segments;
  const many = head.endsWith('[]');
  const child = (value as Body)[many ? head.slice(0, -2) : head];
  if (many) {
    return Array.isArray(child) ? child.flatMap((el) => walk(el, rest)) : [];
  }
  return child === undefined ? [] : walk(child, rest);
}

/** A blank string states nothing, so it counts as unset. */
const isSet = (value: unknown): value is string | number =>
  typeof value === 'string'
    ? value.trim() !== ''
    : typeof value === 'number' && Number.isFinite(value);

/**
 * How many leading segments a set of paths share as one array element
 * (`credits[]` for `credits[].name` and `credits[].artistGlobeId`), so a
 * name and an id are compared credit by credit rather than song by song.
 */
function sharedScope(paths: readonly string[]): number {
  const all = paths.map(segmentsOf);
  const shortest = Math.min(...all.map((s) => s.length - 1));
  let depth = 0;
  for (let i = 0; i < shortest; i++) {
    const segment = all[0][i];
    if (!all.every((s) => s[i] === segment)) break;
    if (segment.endsWith('[]')) depth = i + 1;
  }
  return depth;
}

/**
 * Whether a song's billing line names an artist at all. 'Traditional' and
 * 'Various Artists' do not, and the deriver draws nothing from them, so
 * counting them as guesses would hold such songs on the lead-act worklist for
 * good. Asked of the deriver itself, on a song with nothing else in it, so the
 * two cannot disagree about which lines those are.
 */
const billsAnArtist = (text: string): boolean =>
  edgesForSong({ id: 'coverage', artist: text } as Song).some(
    (e) => e.via?.path === 'artist',
  );

/** Text that states no reference, per `<kind>|<text path>`: not a guess. */
const STATES_NOTHING: Readonly<Record<string, (text: string) => boolean>> = {
  'song|artist': (text) => !billsAnArtist(text),
};

/**
 * Display text the graph reads only some of the time, per `<kind>|<path>`:
 * whether one item's text there gives the graph a guess to draw. A city the
 * registry cannot place states nothing, and neither does a song pin for an
 * act with no artist record, or one with a City of its own, which the pin
 * then stands in for no longer, or a song's label written beside the records
 * it is on, which name their own. Asked of the derivers themselves, as
 * `billsAnArtist` is, so coverage counts the guesses the graph drew: 149
 * events and 118 song pins on the repo's data draw none. An item that cannot
 * be read draws nothing; `buildGraph` names it. A text path linked by an id
 * path (`LINKED_BY`) is asked the same, item by item, on its id path's row.
 */
const DRAWS_A_GUESS: Readonly<
  Record<string, (snapshot: GraphSnapshot) => (item: Body) => boolean>
> = {
  'song|session.label': () => (song) => {
    try {
      return edgesForSong(song as unknown as Song).some(
        (e) => e.via?.path === 'session.label',
      );
    } catch {
      return false;
    }
  },
  // A stored place wins over the city, so the city is then no guess either.
  'globe_event|location.city': () => (event) => {
    try {
      return edgesForEvent(event as unknown as GlobeEventInput).some(
        (e) => e.via?.path === 'location.city',
      );
    } catch {
      return false;
    }
  },
  'artist_location|city': (snapshot) => {
    // First definition wins, as for nodes.
    const artists = new Map<string, ArtistRecord>();
    for (const artist of snapshot.artists ?? []) {
      if (typeof artist?.slug !== 'string') continue;
      const slug = artist.slug.trim();
      if (!artists.has(slug)) artists.set(slug, artist);
    }
    return (pin) => {
      try {
        const location = pin as unknown as ArtistLocationInput;
        return (
          edgesForArtistLocation(
            location,
            artists.get(artistSlug(String(location.id))),
          ).length > 0
        );
      } catch {
        return false;
      }
    };
  },
};

/**
 * Whether display text read through a curated table (`RefPath.resolvedBy`)
 * resolves. What does is linked, as good as a stored id; what does not
 * states nothing, and is neither linked nor a guess to link.
 */
const RESOLVES: Readonly<
  Record<NonNullable<RefPath['resolvedBy']>, (text: string) => boolean>
> = {
  genreTag: (text) => resolveGenreTag(text) !== null,
};

function measure(
  items: readonly object[],
  idPath: string | null,
  textPaths: readonly string[],
  statesNothing: (path: string, text: string) => boolean = () => false,
  /** Whether a text path's value on this item is a guess the graph draws. */
  drawsGuess: (path: string, item: Body) => boolean = () => true,
): Pick<CoverageRow, 'set' | 'linked' | 'inferred' | 'values'> {
  const paths = [...(idPath ? [idPath] : []), ...textPaths];
  const depth = sharedScope(paths);
  const scope = segmentsOf(paths[0]).slice(0, depth);
  const tail = (path: string) => segmentsOf(path).slice(depth);
  const row = {
    set: 0,
    linked: 0,
    inferred: 0,
    values: { linked: 0, inferred: 0 },
  };
  for (const item of items) {
    let linked = 0;
    let guessed = 0;
    for (const element of walk(item, scope)) {
      const ids = idPath
        ? walk(element, tail(idPath))
            .filter(isSet)
            .filter((v) => !statesNothing(idPath, String(v).trim()))
        : [];
      if (ids.length) {
        linked += ids.length;
        continue;
      }
      guessed += textPaths
        .filter((p) => drawsGuess(p, item as Body))
        .flatMap((p) =>
          walk(element, tail(p))
            .filter(isSet)
            .filter((v) => !statesNothing(p, String(v).trim())),
        ).length;
    }
    row.values.linked += linked;
    row.values.inferred += guessed;
    if (!linked && !guessed) continue;
    row.set++;
    if (guessed) row.inferred++;
    else row.linked++;
  }
  return row;
}

/**
 * Text read by the event matcher: a title is prose and tags are a bag of
 * words, so what they state is what `eventMatches` found in them, not every
 * value there. Keyed `<kind>|<path>`.
 */
const MATCHED_PATHS: ReadonlySet<string> = new Set([
  'globe_event|title',
  'globe_event|tags[]',
]);

/**
 * `measure` for a path the event matcher reads: an event counts once it
 * names someone or something there, and each thing it names is a guess until
 * the event stores its ids. An event it found no one in states nothing, and
 * neither do matches its stored ids overrule, since the graph draws none of
 * them (`edgesForEvent`).
 */
function measureMatches(
  items: readonly object[],
  matches: GraphSnapshot['eventMatches'],
  path: string,
): Pick<CoverageRow, 'set' | 'linked' | 'inferred' | 'values'> {
  const row = {
    set: 0,
    linked: 0,
    inferred: 0,
    values: { linked: 0, inferred: 0 },
  };
  for (const item of items) {
    const event = item as GlobeEventInput;
    const match = matches?.get(String(event.id).trim());
    const found = [
      ...(Array.isArray(event.artistIds) ? [] : (match?.artists ?? [])),
      ...(Array.isArray(event.songIds) ? [] : (match?.songs ?? [])),
    ].filter((m) => m.path === path).length;
    if (!found) continue;
    row.set++;
    row.inferred++;
    row.values.inferred += found;
  }
  return row;
}

/**
 * Per reference field, how many items fill it, and how many of those are
 * linked by id rather than guessed from text. Every REF_PATHS kind gets its
 * rows, even with no items in the snapshot: "0 of 0" says there are no
 * records yet, which is itself worth seeing.
 */
export function coverageOf(snapshot: GraphSnapshot): CoverageRow[] {
  const textsFor = new Map<string, string[]>();
  for (const [key, idPath] of Object.entries(LINKED_BY)) {
    const [kind, textPath] = key.split('|');
    const list = textsFor.get(`${kind}|${idPath}`) ?? [];
    list.push(textPath);
    textsFor.set(`${kind}|${idPath}`, list);
  }
  const rows: CoverageRow[] = [];
  for (const ref of REF_PATHS) {
    // A linked text path is counted on its id path's row.
    if (ref.legacy && LINKED_BY[`${ref.kind}|${ref.path}`]) continue;
    const items = itemsOf(snapshot, ref.kind);
    const legacyPaths = ref.legacy
      ? []
      : (textsFor.get(`${ref.kind}|${ref.path}`) ?? []);
    const resolves = ref.resolvedBy && RESOLVES[ref.resolvedBy];
    const statesNothing = (path: string, text: string) =>
      resolves && path === ref.path
        ? !resolves(text)
        : (STATES_NOTHING[`${ref.kind}|${path}`]?.(text) ?? false);
    const draws = DRAWS_A_GUESS[`${ref.kind}|${ref.path}`]?.(snapshot);
    const drawsLinked = new Map(
      legacyPaths.map((p) => [
        p,
        DRAWS_A_GUESS[`${ref.kind}|${p}`]?.(snapshot),
      ]),
    );
    const measured = MATCHED_PATHS.has(`${ref.kind}|${ref.path}`)
      ? measureMatches(items, snapshot.eventMatches, ref.path)
      : ref.legacy
        ? measure(
            draws ? items.filter((item) => draws(item as Body)) : items,
            null,
            [ref.path],
            statesNothing,
          )
        : measure(
            items,
            ref.path,
            legacyPaths,
            statesNothing,
            (path, item) => drawsLinked.get(path)?.(item) ?? true,
          );
    rows.push({
      kind: ref.kind,
      path: ref.path,
      target: ref.target,
      legacyPaths,
      items: items.length,
      ...measured,
    });
  }
  return rows;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

const kindOf = (id: EntityId): EntityKind =>
  id.slice(0, id.indexOf(':')) as EntityKind;

const slugOf = (id: string): string => id.slice(id.indexOf(':') + 1);

const fixAt = (via: EdgeVia): IntegrityFix => ({
  kind: kindOf(via.item),
  id: via.item,
  path: via.path,
});

const article = (word: string) => (/^[aeiou]/.test(word) ? 'an' : 'a');

const isEntityKind = (kind: string): kind is EntityKind =>
  (ENTITY_KINDS as readonly string[]).includes(kind);

const line = (e: Pick<GraphEdge, 'from' | 'kind' | 'to'>) =>
  `${e.from} —${e.kind}→ ${e.to}`;

/**
 * The end of an edge that its source field names: the end that is not the
 * field's own item. A credit names the artist, a group's member list the
 * member, a cover the other recording. When neither end is the item — the
 * instrument hung off a credit's player `on` the song, a member's instrument,
 * the city a song reaches through its studio — the field names `to`; the
 * player is another field's. A code list (the influence arcs) states the
 * pair, so it names both ends.
 */
function namedBy(
  edge: Pick<Edge, 'from' | 'to'>,
  via: EdgeVia,
): readonly EntityId[] {
  if (isCodeOwnedVia(via)) return [edge.from, edge.to];
  if (edge.from === via.item) return [edge.to];
  if (edge.to === via.item) return [edge.from];
  return [edge.to];
}

/** Display-text paths, keyed `<graph kind of the item>|<path>`. */
const TEXT_PATHS: ReadonlySet<string> = new Set(
  REF_PATHS.filter((r) => r.legacy).map(
    (r) => `${CONTENT_KINDS[r.kind].entity}|${r.path}`,
  ),
);

/**
 * Did this one source read display text rather than a stored id? Asked per
 * source, not of the merged edge: a lead act id and a credit written only as
 * a name can both name one missing artist, and the name is still a guess.
 */
const isGuess = (via: EdgeVia): boolean =>
  !isCodeOwnedVia(via) && TEXT_PATHS.has(`${kindOf(via.item)}|${via.path}`);

/**
 * `related`, keeping only ids the graph has a node for: each one links to the
 * mind map's `?focus=`, which has nothing to show for any other id.
 */
function onGraph(
  graph: Graph,
  ids: readonly EntityId[],
): { related?: EntityId[] } {
  const kept = [...new Set(ids)].filter((id) => graph.nodes.has(id));
  return kept.length ? { related: kept } : {};
}

/**
 * Every content item in the snapshot by its node id, to quote its fields.
 * The node's own record comes first: an artist's song pins speak for the
 * artist node too, but they are not its body.
 */
function bodiesOf(snapshot: GraphSnapshot): Map<EntityId, object> {
  const bodies = new Map<EntityId, object>();
  for (const kind of Object.keys(CONTENT_KINDS) as ContentKind[]) {
    for (const item of itemsOf(snapshot, kind)) {
      const id = itemIdOf(kind, item);
      if (!bodies.has(id)) bodies.set(id, item);
    }
  }
  return bodies;
}

/**
 * The display text at `path` that was read as `target`: the value whose own
 * id is the target, or the only value there is. A city resolved through the
 * place registry has an id its text does not slug to, hence the fallback.
 */
function textNaming(
  body: object | undefined,
  path: string,
  target: EntityId,
): string | undefined {
  if (!body) return undefined;
  const values = walk(body, segmentsOf(path)).filter(isSet).map(String);
  return (
    values.find((v) => toEntityId(kindOf(target), v) === target) ??
    (values.length === 1 ? values[0] : undefined)
  );
}

/**
 * Kinds that are code vocabularies: they exist to be pointed at. Years and
 * decades are the calendar's.
 */
const VOCABULARY_KINDS: ReadonlySet<EntityKind> = new Set([
  'key',
  'mode',
  'vibe',
  'genre',
  'subgenre',
  'era',
  'year',
  'decade',
]);

/* ── Dangling, wrong-kind, malformed, endpoints ──────────────────────── */

/**
 * What a malformed endpoint was meant to be. A value carrying another kind's
 * prefix (`artist:toto` in a label field), or a song's globe event id where
 * the song id belongs (`song-africa`), is the wrong kind rather than a typo.
 */
function diagnoseMalformed(end: string): {
  check: 'wrong-kind' | 'malformed';
  message: string;
} {
  const kind = end.slice(0, end.indexOf(':'));
  const value = slugOf(end);
  const prefix = value.includes(':') ? value.slice(0, value.indexOf(':')) : '';
  if (prefix && prefix !== kind && isEntityKind(prefix)) {
    return {
      check: 'wrong-kind',
      message: `Holds '${value}', ${article(prefix)} ${prefix} id, where ${article(kind)} ${kind} slug belongs.`,
    };
  }
  if (prefix === kind) {
    return {
      check: 'malformed',
      message: `Holds the full id '${value}'; the field stores the bare slug '${slugOf(value)}'.`,
    };
  }
  if (kind === 'song' && /^song-[a-z0-9_]+$/.test(value)) {
    // The event's song, through its alias when it has one (a second
    // recording's event names its song, `songEventAliases.ts`).
    return {
      check: 'wrong-kind',
      message: `Holds the globe event id '${value}' where the song id '${songIdForEvent(value)}' belongs.`,
    };
  }
  const suggestion = isEntityKind(kind) ? toEntityId(kind, value) : null;
  const hint =
    suggestion && isWellFormed(suggestion) && slugOf(suggestion) !== value
      ? ` Did you mean '${slugOf(suggestion)}'?`
      : '';
  return {
    check: 'malformed',
    message: `'${value}' is not a well-formed ${kind} slug.${hint}`,
  };
}

/**
 * A record whose own id breaks the grammar. `buildGraph` keeps such a node
 * (it defines something), but no edge from it survives, so it is reported
 * once here rather than once per field.
 */
function malformedNodeRows(graph: Graph): IntegrityRow[] {
  const rows: IntegrityRow[] = [];
  for (const node of graph.nodes.values()) {
    if (isWellFormed(node.id)) continue;
    const content = Object.values(CONTENT_KINDS).find(
      (c) => c.entity === node.kind,
    );
    const path = content?.identity;
    rows.push({
      check: 'malformed',
      severity: 'error',
      kind: node.kind,
      id: node.id,
      ...(path ? { path, fix: { kind: node.kind, id: node.id, path } } : {}),
      message: `Its own id: ${diagnoseMalformed(node.id).message}`,
    });
  }
  return rows;
}

/**
 * What `storedIdRows` has already said about a malformed stored value, so the
 * graph's view of the same value is not reported again.
 */
interface Reported {
  /**
   * `<item>|<target id as stored>`: a value the graph refused as malformed,
   * which `violationRows` would otherwise report too.
   */
  values: Set<string>;
  /**
   * `<item>|<path>|<id the deriver made of it>`: a value the song or
   * progression deriver slugged into a well-formed id ('Toto' became
   * `artist:toto`). When nothing defines that id, `missingRows` would say the
   * field names it — which the field does not — as a second error.
   */
  fields: Set<string>;
}

/**
 * The edges `buildGraph` refused. One row per item and bad value: a credit's
 * malformed artist id also spoils the instrument edge hung off that artist,
 * and saying so twice would point at the instrument field for an artist
 * problem. A bad value that is the item's own id is `malformedNodeRows`';
 * one already read from the body is `storedIdRows`'.
 */
function violationRows(graph: Graph, reported: Reported): IntegrityRow[] {
  const rows: IntegrityRow[] = [];
  const seen = new Set<string>(reported.values);
  for (const { reason, edge } of graph.violations) {
    const via = edge.via;
    const subject = via?.item ?? edge.from;
    // The row is about a node the mind map can focus: the item that states
    // the edge, or — when that is not a node, as for an influence arc from a
    // malformed event id no event list defines — an end that is.
    const about =
      [subject, edge.from, edge.to].find((id) => graph.nodes.has(id)) ??
      subject;
    const base = {
      severity: 'error' as const,
      kind: kindOf(about),
      id: about,
      ...(via ? { path: via.path, fix: fixAt(via) } : {}),
    };
    if (reason !== 'malformed') {
      const key = `${subject}|${line(edge)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        ...base,
        check: 'endpoints',
        message:
          reason === 'no-via'
            ? `${line(edge)} names no field it came from, so it was left out of the graph (a deriver bug).`
            : `${line(edge)} joins kinds a ${edge.kind} edge cannot join, so it was left out of the graph.`,
        ...onGraph(graph, [edge.from, edge.to]),
      });
      continue;
    }
    const bad =
      [edge.from, edge.to, ...(edge.on ? [edge.on] : [])].find(
        (end) => !isWellFormed(end),
      ) ?? edge.to;
    if (bad === subject && graph.nodes.has(bad)) continue;
    const key = `${subject}|${bad}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ ...base, ...diagnoseMalformed(bad) });
  }
  return rows;
}

/**
 * A node the graph had to create because something names it and nothing
 * defines it. One row per field that names it: that is what needs fixing —
 * and only a field that names it, never one that merely sits on an edge
 * touching it (a credit's instrument field, on the edge from its player). A
 * stored id naming nothing is an error — unless another kind has that slug,
 * when it is probably the wrong field; display text naming nothing is only a
 * guess that found no record. A field whose malformed value was slugged into
 * this id is `storedIdRows`' to report, as malformed.
 *
 * The calendar is never the other kind: every year in use is a node, so a
 * missing song called '1979' (or a progression numbered 1982) would
 * otherwise be blamed on the wrong field, when nothing defines it at all.
 */
function missingRows(
  snapshot: GraphSnapshot,
  graph: Graph,
  reported: Reported,
): IntegrityRow[] {
  const rows: IntegrityRow[] = [];
  const bodies = bodiesOf(snapshot);
  for (const node of graph.nodes.values()) {
    if (node.status !== 'missing') continue;
    const named = node.label !== slugOf(node.id) ? ` ('${node.label}')` : '';
    const edges = graph.adjacency.get(node.id) ?? [];
    if (!edges.length) {
      // Only globe events create a node with nothing pointing at it: a
      // `song-<id>` event whose song the library lacks.
      rows.push({
        check: 'dangling',
        severity: 'warning',
        kind: node.kind,
        id: node.id,
        message: `The globe has an event for ${node.id}${named}, but the song library has no such song.`,
      });
      continue;
    }
    const other = ENTITY_KINDS.filter(
      (k) => k !== node.kind && k !== 'year' && k !== 'decade',
    )
      .map((k) => `${k}:${slugOf(node.id)}` as EntityId)
      .filter((id) => {
        const found = graph.nodes.get(id);
        return found && found.status !== 'missing';
      });
    const seen = new Set<string>();
    for (const edge of edges) {
      for (const via of edge.via) {
        if (!namedBy(edge, via).includes(node.id)) continue;
        const key = `${via.item}|${via.path}`;
        if (seen.has(key) || reported.fields.has(`${key}|${node.id}`)) {
          continue;
        }
        seen.add(key);
        const where = {
          kind: kindOf(via.item),
          id: via.item,
          path: via.path,
          fix: fixAt(via),
          related: [node.id],
        };
        if (isGuess(via)) {
          const text = textNaming(bodies.get(via.item), via.path, node.id);
          rows.push({
            ...where,
            check: 'unresolved',
            severity: 'info',
            message: `${text ? `'${text}'` : 'The text'} was read as ${node.id}, and no ${node.kind} record has that id. Link it to a record, or create one.`,
          });
        } else if (other.length) {
          rows.push({
            ...where,
            check: 'wrong-kind',
            severity: 'error',
            message: `${via.path} names ${node.id}, which does not exist; ${other.join(' and ')} does — the wrong kind?`,
            related: [node.id, ...other],
          });
        } else {
          rows.push({
            ...where,
            check: 'dangling',
            severity: 'error',
            message: `${via.path} names ${node.id}${named}, which nothing defines.`,
          });
        }
      }
    }
  }
  return rows;
}

/** Record kinds a stored id can be checked against. */
const RECORD_LISTS: Partial<Record<EntityKind, RecordList>> = {
  song: 'songs',
  artist: 'artists',
  release: 'releases',
  studio: 'studios',
  label: 'labels',
};

/**
 * Content kinds whose deriver (`deriveEdges.ts`) mints ids through
 * `entityId`, which slugs text on the way in; the record derivers read a
 * stored id verbatim, so a malformed one there is refused instead.
 */
const SLUGGING_DERIVERS: ReadonlySet<ContentKind> = new Set([
  'song',
  'chord_progression',
]);

/**
 * Vocabulary fields that store a slug, which the deriver slugs again on the
 * way in, so 'Dorian' quietly becomes `mode:dorian`. The other vocabulary
 * fields are read through a table in their own spelling (genre tags,
 * progression styles like 'r&b') or hold display text by design (a song's
 * key, 'E♭ major'), and are not held to the slug grammar.
 */
export const SLUGGED_VOCAB: ReadonlySet<string> = new Set([
  'song|mode',
  'song|credits[].instrument',
  'chord_progression|vibes[]',
]);

/**
 * Stored ids read straight from the bodies, for what the graph cannot show:
 *
 *  - a malformed value the song deriver quietly normalised on its way in
 *    (`artistGlobeId: 'Jeff Porcaro'` becomes `artist:jeff-porcaro`, so no
 *    edge is refused and nothing else would say the field is wrong); the
 *    same for the vocabulary fields in `SLUGGED_VOCAB`;
 *  - a stored id the graph drew no edge from, which can name nothing without
 *    any node going missing: fields it does not derive at all (`derive:
 *    false`, such as a song's "X on the Globe" `contentRefs[].globeArtistId`),
 *    and values a deriver passes over (a related recording's artist id when
 *    its song id says which recording, or a sample with no song id). Those
 *    are checked against the records the snapshot holds, and only for kinds
 *    it holds at all, or every value would look dangling. Not-derived fields
 *    naming code-side things (scenes, eras, regions as the globe writes them)
 *    have no grammar to hold them to yet, so they are left alone.
 *
 * Records each malformed value in `reported`, so the graph's view of the same
 * value is not reported twice.
 */
function storedIdRows(
  snapshot: GraphSnapshot,
  graph: Graph,
  reported: Reported,
): IntegrityRow[] {
  // Every value a field put into the graph, refused or not, as
  // `<item>|<path>|<end>`: those are missingRows' and violationRows' to judge.
  const drawn = new Set<string>();
  for (const edge of graph.edges) {
    for (const via of edge.via) {
      for (const end of namedBy(edge, via)) {
        drawn.add(`${via.item}|${via.path}|${end}`);
      }
    }
  }
  for (const { edge } of graph.violations) {
    if (!edge.via) continue;
    for (const end of [edge.from, edge.to]) {
      drawn.add(`${edge.via.item}|${edge.via.path}|${end}`);
    }
  }

  const rows: IntegrityRow[] = [];
  for (const ref of REF_PATHS) {
    // Display text, however it is read: nothing here is a stored id.
    if (ref.legacy || ref.code || ref.resolvedBy) continue;
    if (ref.vocab && !SLUGGED_VOCAB.has(`${ref.kind}|${ref.path}`)) continue;
    if (!isEntityKind(ref.target)) continue;
    const target = ref.target;
    const list = RECORD_LISTS[target];
    if (ref.derive === false && !list) continue;
    const checkable = !ref.vocab && !!list && !!snapshot[list];
    const slugs = SLUGGING_DERIVERS.has(ref.kind);
    for (const item of itemsOf(snapshot, ref.kind)) {
      const id = itemIdOf(ref.kind, item);
      const where = {
        kind: kindOf(id),
        id,
        path: ref.path,
        fix: { kind: kindOf(id), id, path: ref.path },
      };
      for (const raw of walk(item, segmentsOf(ref.path)).filter(isSet)) {
        const value = String(raw).trim();
        const named: EntityId = `${target}:${value}`;
        if (!isWellFormedSlug(target, value)) {
          reported.values.add(`${id}|${named}`);
          if (slugs) {
            const minted = canonicalId(toEntityId(target, value));
            reported.fields.add(`${id}|${ref.path}|${minted}`);
          }
          rows.push({
            ...where,
            severity: 'error',
            ...diagnoseMalformed(named),
          });
          continue;
        }
        const node = canonicalId(named);
        if (!checkable || drawn.has(`${id}|${ref.path}|${node}`)) continue;
        const found = graph.nodes.get(node);
        if (!found || found.status === 'missing') {
          rows.push({
            ...where,
            check: 'dangling',
            severity: 'error',
            message: `${ref.path} names ${node}, which nothing defines.`,
            ...onGraph(graph, [node]),
          });
        }
      }
    }
  }
  return rows;
}

/* ── Orphans ─────────────────────────────────────────────────────────── */

/**
 * A node nothing connects to. Code vocabularies are left out (a key exists to
 * be filtered by), and so are missing nodes, which have their own rows.
 */
function orphanRows(graph: Graph): IntegrityRow[] {
  const rows: IntegrityRow[] = [];
  for (const node of graph.nodes.values()) {
    if (VOCABULARY_KINDS.has(node.kind) || node.status === 'missing') continue;
    if (graph.adjacency.get(node.id)?.length) continue;
    rows.push({
      check: 'orphan',
      severity: 'info',
      kind: node.kind,
      id: node.id,
      message: `'${node.label}' is connected to nothing.`,
    });
  }
  return rows;
}

/* ── Duplicates ──────────────────────────────────────────────────────── */

interface Named {
  slug: string;
  name: string;
  aliases?: readonly string[];
}

/**
 * The comparison key: `normalizeArtistName` (case, accents, apostrophes, '&'
 * folded) with a leading "the" set aside, since a billing adds or drops it
 * freely ('The Temptations', 'Temptations').
 */
const matchKey = (text: string): string =>
  normalizeArtistName(text).replace(/^the /, '');

/** Edit distance within `max`, bailing out as soon as it cannot be. */
export function withinEditDistance(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
      current.push(value);
      if (value < best) best = value;
    }
    if (best > max) return false;
    previous = current;
  }
  return previous[b.length] <= max;
}

/** Names shorter than this differ by two letters too easily ('Chic', 'Cher'). */
const NEAR_MIN_LENGTH = 6;
const NEAR_MAX_DISTANCE = 2;

/**
 * Records of one kind that may be the same thing: a name that matches
 * another's name or alias once normalized (a warning), a name within two
 * edits of another (a hint), and — for artists — a combined billing whose
 * halves are both artists already ('Alicia Keys and Justin Timberlake' is
 * two primary credits, not a third artist). A name led by a quotation mark
 * is flagged too: that is how film titles were once captured as artists.
 */
function duplicateRows(
  kind: 'artist' | 'studio' | 'label',
  records: readonly Named[],
  graph: Graph,
): IntegrityRow[] {
  const rows: IntegrityRow[] = [];
  const id = (slug: string): EntityId => `${kind}:${slug.trim()}`;
  // Of two look-alikes, the one more of the Atlas already points at is the
  // one to keep ('Marvin Gaye', not 'Marivn Gaye'); a tie keeps the first.
  const degree = (slugs: readonly string[]) =>
    Math.max(...slugs.map((s) => graph.adjacency.get(id(s))?.length ?? 0));
  const keepsFirst = (a: readonly string[], b: readonly string[]) =>
    degree(a) > degree(b) || (degree(a) === degree(b) && a[0] < b[0]);
  const byKey = new Map<
    string,
    { slug: string; text: string; alias: boolean }[]
  >();
  const file = (text: string, slug: string, alias: boolean) => {
    const key = matchKey(text);
    if (!key) return;
    const bucket = byKey.get(key) ?? [];
    bucket.push({ slug, text, alias });
    byKey.set(key, bucket);
  };
  for (const r of records) {
    file(r.name, r.slug, false);
    for (const alias of r.aliases ?? []) file(alias, r.slug, true);
  }

  const paired = new Set<string>();
  const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

  for (const bucket of byKey.values()) {
    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const [a, b] = [bucket[i], bucket[j]];
        if (a.slug === b.slug || paired.has(pairKey(a.slug, b.slug))) continue;
        paired.add(pairKey(a.slug, b.slug));
        // A record whose NAME is another's alias is the likely duplicate.
        const [dupe, keep] =
          a.alias !== b.alias
            ? a.alias
              ? [b, a]
              : [a, b]
            : keepsFirst([a.slug], [b.slug])
              ? [b, a]
              : [a, b];
        const why =
          keep.alias && dupe.alias
            ? `both list the alias '${keep.text}'`
            : keep.alias
              ? `its name matches ${id(keep.slug)}'s alias '${keep.text}'`
              : `'${dupe.text}' and '${keep.text}' are the same name once case, accents, '&' and a leading 'The' are set aside`;
        rows.push({
          check: 'duplicate',
          severity: 'warning',
          kind,
          id: id(dupe.slug),
          message: `May be the same ${kind} as ${id(keep.slug)}: ${why}.`,
          related: [id(keep.slug)],
        });
      }
    }
  }

  // Near misses, names only, one row per pair of distinct spellings: records
  // that already share a spelling were paired above, and repeating the pair
  // for each of them would only be noise. Sorted by length so each spelling
  // is compared only with those close enough in length to be within reach.
  const spellings = new Map<string, Named[]>();
  for (const r of records) {
    const key = matchKey(r.name);
    if (key.length < NEAR_MIN_LENGTH) continue;
    const list = spellings.get(key) ?? [];
    list.push(r);
    spellings.set(key, list);
  }
  const keys = [...spellings.keys()].sort(
    (a, b) => a.length - b.length || (a < b ? -1 : 1),
  );
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      if (keys[j].length - keys[i].length > NEAR_MAX_DISTANCE) break;
      if (!withinEditDistance(keys[i], keys[j], NEAR_MAX_DISTANCE)) continue;
      const [a, b] = [spellings.get(keys[i])!, spellings.get(keys[j])!];
      // An alias already ties them: that row says more than this one would.
      if (a.some((x) => b.some((y) => paired.has(pairKey(x.slug, y.slug))))) {
        continue;
      }
      const slugs = (list: Named[]) => list.map((r) => r.slug);
      const [dupe, keep] = keepsFirst(slugs(a), slugs(b)) ? [b, a] : [a, b];
      rows.push({
        check: 'duplicate',
        severity: 'info',
        kind,
        id: id(dupe[0].slug),
        message: `'${dupe[0].name}' is within ${NEAR_MAX_DISTANCE} letters of '${keep[0].name}' (${keep.map((k) => id(k.slug)).join(', ')}): one thing misspelled, or two things?`,
        related: keep.map((k) => id(k.slug)),
      });
    }
  }

  if (kind === 'artist') {
    for (const r of records) {
      const parts = matchKey(r.name).split(' and ');
      for (let at = 1; at < parts.length; at++) {
        const halves = [parts.slice(0, at), parts.slice(at)].map((p) =>
          matchKey(p.join(' and ')),
        );
        const found = halves.map((h) =>
          (byKey.get(h) ?? []).map((e) => e.slug).find((s) => s !== r.slug),
        );
        if (!found[0] || !found[1]) continue;
        rows.push({
          check: 'duplicate',
          severity: 'warning',
          kind,
          id: id(r.slug),
          message: `'${r.name}' bills two artists, ${id(found[0])} and ${id(found[1])}: credit them both as primary on the song instead.`,
          related: [id(found[0]), id(found[1])],
        });
        break;
      }
    }
  }

  for (const r of records) {
    if (!/^["“”]/.test(r.name.trim())) continue;
    rows.push({
      check: 'duplicate',
      severity: 'warning',
      kind,
      id: id(r.slug),
      message: `'${r.name}' starts with a quotation mark: a title captured as a ${kind}?`,
    });
  }
  return rows;
}

/* ── Cycles ──────────────────────────────────────────────────────────── */

/**
 * Edges that must never lead back to where they started: the ones REF_PATHS
 * marks `acyclic` (the API rejects a write that closes such a loop), so a new
 * one is checked here without a second list to keep, plus `located_in`, whose
 * field is a region vocabulary rather than a reference REF_PATHS can mark.
 */
export const ACYCLIC_EDGES: readonly EdgeKind[] = [
  ...new Set<EdgeKind>([
    ...REF_PATHS.flatMap((r) =>
      r.acyclic && (EDGE_KINDS as readonly string[]).includes(r.acyclic)
        ? [r.acyclic as EdgeKind]
        : [],
    ),
    'located_in',
  ]),
];

/** Tarjan's strongly connected components over one edge kind. */
function stronglyConnected(
  out: ReadonlyMap<EntityId, readonly GraphEdge[]>,
): EntityId[][] {
  let counter = 0;
  const index = new Map<EntityId, number>();
  const low = new Map<EntityId, number>();
  const stack: EntityId[] = [];
  const onStack = new Set<EntityId>();
  const components: EntityId[][] = [];
  const visit = (v: EntityId) => {
    index.set(v, counter);
    low.set(v, counter);
    counter++;
    stack.push(v);
    onStack.add(v);
    for (const edge of out.get(v) ?? []) {
      const w = edge.to;
      if (!index.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, index.get(w)!));
      }
    }
    if (low.get(v) !== index.get(v)) return;
    const component: EntityId[] = [];
    let w: EntityId;
    do {
      w = stack.pop()!;
      onStack.delete(w);
      component.push(w);
    } while (w !== v);
    components.push(component);
  };
  for (const v of [...out.keys()].sort()) if (!index.has(v)) visit(v);
  return components;
}

/** The shortest loop from `start` back to itself inside one component. */
function loopThrough(
  start: EntityId,
  out: ReadonlyMap<EntityId, readonly GraphEdge[]>,
  members: ReadonlySet<EntityId>,
): GraphEdge[] {
  const reachedBy = new Map<EntityId, GraphEdge>();
  const queue: EntityId[] = [start];
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i];
    for (const edge of out.get(at) ?? []) {
      if (!members.has(edge.to)) continue;
      if (edge.to === start) {
        const loop = [edge];
        for (let back = at; back !== start; ) {
          const step = reachedBy.get(back)!;
          loop.unshift(step);
          back = step.from;
        }
        return loop;
      }
      if (!reachedBy.has(edge.to)) {
        reachedBy.set(edge.to, edge);
        queue.push(edge.to);
      }
    }
  }
  return [];
}

/**
 * A group that is (through other groups) its own member, a label that is its
 * own parent, a place inside itself. For each node of a tangle, the shortest
 * loop through it, each distinct loop once: two loops that share a node (a
 * group listing b and c, each listing it back) are both named, though a
 * tangle with more loops than nodes can hide one until another is fixed. Each
 * row is on the loop's first node, with the fix on the field that closes it.
 */
function cycleRows(graph: Graph): IntegrityRow[] {
  const rows: IntegrityRow[] = [];
  for (const kind of ACYCLIC_EDGES) {
    const out = new Map<EntityId, GraphEdge[]>();
    for (const edge of graph.edges) {
      if (edge.kind !== kind) continue;
      const list = out.get(edge.from);
      if (list) list.push(edge);
      else out.set(edge.from, [edge]);
    }
    for (const component of stronglyConnected(out)) {
      const members = new Set(component);
      const sorted = [...component].sort();
      const selfLoop = (out.get(sorted[0]) ?? []).some(
        (e) => e.to === sorted[0],
      );
      if (component.length < 2 && !selfLoop) continue;
      const named = new Set<string>();
      for (const start of sorted) {
        const loop = loopThrough(start, out, members);
        if (!loop.length) continue;
        // The same loop entered at another of its nodes is not a new one.
        const key = loop
          .map((e) => `${e.from}>${e.to}`)
          .sort()
          .join(' ');
        if (named.has(key)) continue;
        named.add(key);
        const path = [start, ...loop.map((e) => e.to)];
        const via = loop[loop.length - 1].via[0];
        rows.push({
          check: 'cycle',
          severity: 'error',
          kind: kindOf(start),
          id: start,
          ...(via ? { path: via.path, fix: fixAt(via) } : {}),
          message: `${kind} goes round in a circle: ${path.join(' → ')}.`,
          related: [...new Set(path)].sort(),
        });
      }
    }
  }
  return rows;
}

/* ── Conflicting owners ──────────────────────────────────────────────── */

/**
 * Decision 7: the lead act (`origin.artistGlobeId`) must be one of the billed
 * artists once the billing is linked (any primary credit carries an id). The
 * artists are compared as the graph resolves them: a primary credit still
 * written only as a name bills the artist its name slugs to, and a stored id
 * is read the way the song deriver reads it. A malformed lead act is left to
 * its malformed row. A session label beside the song's records is
 * `sessionLabelRows`'.
 */
function conflictingOwnerRows(
  snapshot: GraphSnapshot,
  graph: Graph,
): IntegrityRow[] {
  const rows: IntegrityRow[] = [];
  const text = (value: unknown) =>
    typeof value === 'string' ? value.trim() : '';
  for (const song of snapshot.songs ?? []) {
    const stored = text(song.origin?.artistGlobeId);
    if (!stored || !isWellFormedSlug('artist', stored)) continue;
    const lead = toEntityId('artist', stored);
    const primaries = (song.credits ?? []).filter((c) => c.primary);
    if (!primaries.some((c) => text(c.artistGlobeId))) continue;
    const billed = [
      ...new Set(
        primaries
          .map((c) => text(c.artistGlobeId) || text(c.name))
          .filter(Boolean)
          .map((named) => toEntityId('artist', named))
          .filter(isWellFormed),
      ),
    ];
    if (billed.includes(lead)) continue;
    const id: EntityId = `song:${song.id}`;
    rows.push({
      check: 'conflicting-owners',
      severity: 'warning',
      kind: 'song',
      id,
      path: 'origin.artistGlobeId',
      message: `The lead act ${lead} is not among the billed artists (${billed.join(', ')}).`,
      fix: { kind: 'song', id, path: 'origin.artistGlobeId' },
      ...onGraph(graph, [lead, ...billed]),
    });
  }
  return rows;
}

/**
 * A hand-authored event whose stored place is not the city it is written as
 * happening in. Once a reviewer stores `placeId` (event body v2) the graph
 * reads that and no longer places the city, but the globe still shows the
 * city as written, so the two must say the same thing. The city is placed by
 * asking the event deriver itself, on an event with nothing else in it, so
 * the two cannot disagree about where a city is; a city it cannot place
 * gives nothing to compare. A malformed `placeId` is left to its malformed
 * row. No event stores its place yet, so this finds nothing until they do.
 */
function eventPlaceRows(snapshot: GraphSnapshot, graph: Graph): IntegrityRow[] {
  const rows: IntegrityRow[] = [];
  for (const item of itemsOf(snapshot, 'globe_event')) {
    const event = item as GlobeEventInput;
    const stored =
      typeof event.placeId === 'string' ? event.placeId.trim() : '';
    if (!stored || !isWellFormedSlug('place', stored)) continue;
    const id = itemIdOf('globe_event', item);
    const written = edgesForEvent({
      id: slugOf(id),
      location: event.location,
    }).find((e) => e.kind === 'took_place_in');
    const place: EntityId = `place:${stored}`;
    if (!written || written.to === place) continue;
    rows.push({
      check: 'conflicting-owners',
      severity: 'warning',
      kind: 'event',
      id,
      path: 'placeId',
      message: `Its place is ${place}, but the city it is written in, '${String(event.location?.city).trim()}', is ${written.to}. The globe shows the city as written.`,
      fix: { kind: 'event', id, path: 'placeId' },
      ...onGraph(graph, [place, written.to]),
    });
  }
  return rows;
}

/**
 * An act whose song pins (`artist_location`) are somewhere other than its
 * City. Often both are right: the pins are usually where someone was born or
 * grew up (Marvin Gaye's say Washington, where his scene was Detroit), so
 * this is only worth a look. What it tells the reviewer is that the pins will
 * move: the globe places an act's songs at its City before its song pins
 * (the contract's placement by slug), so publishing the City moves them. The
 * pin's city is placed by asking the song-pin deriver itself; one it cannot
 * place gives nothing to compare, and a malformed City is left to its
 * malformed row.
 */
function songPinRows(snapshot: GraphSnapshot, graph: Graph): IntegrityRow[] {
  // First definition wins, as for nodes.
  const artists = new Map<string, ArtistRecord>();
  for (const artist of snapshot.artists ?? []) {
    if (typeof artist?.slug !== 'string') continue;
    const slug = artist.slug.trim();
    if (!artists.has(slug)) artists.set(slug, artist);
  }
  const rows: IntegrityRow[] = [];
  for (const item of itemsOf(snapshot, 'artist_location')) {
    const pin = item as ArtistLocationInput;
    if (typeof pin.id !== 'string') continue;
    const artist = artists.get(artistSlug(pin.id));
    const city =
      typeof artist?.basedInPlaceId === 'string'
        ? artist.basedInPlaceId.trim()
        : '';
    if (!artist || !city || !isWellFormedSlug('place', city)) continue;
    const pinned = edgesForArtistLocation(pin, { slug: artist.slug })[0];
    const place: EntityId = `place:${city}`;
    if (!pinned || pinned.to === place) continue;
    const id: EntityId = `artist:${artist.slug.trim()}`;
    rows.push({
      check: 'conflicting-owners',
      severity: 'info',
      kind: 'artist',
      id,
      path: 'basedInPlaceId',
      message: `Its songs are pinned in '${String(pin.city).trim()}' (${pinned.to}), but its City is ${place}. Both can be true, but publishing the City moves the pins there.`,
      fix: { kind: 'artist', id, path: 'basedInPlaceId' },
      ...onGraph(graph, [pinned.to, place]),
    });
  }
  return rows;
}

/**
 * Years active the calendar cannot read as a span: one that ends before it
 * starts, one still open that starts after the snapshot's year, or one so
 * long the calendar takes it for a mistyped year (1065 for 1965). An open
 * span runs to `asOfYear`, as the decades an artist is active in do
 * (`edgesForArtist`). Asked of the calendar itself (`yearOf`,
 * `decadesBetween`), so the two cannot disagree about which spans those are:
 * each would otherwise leave the artist active in no decade without a word.
 * So would a first or last year that is set but is no year at all (0,
 * 1982.5), which the body's schema lets through as a number.
 *
 * With them, the birth (`born.date`, design §4.1): a date the calendar has no
 * such day for ('1939-02-30', which the schema's pattern lets through), a
 * birth or a forming still to come, and one after the first year active. A
 * group's `born.placeId` is `groupBirthplaceRows`'.
 */
function lifeSpanRows(snapshot: GraphSnapshot): IntegrityRow[] {
  const rows: IntegrityRow[] = [];
  for (const artist of snapshot.artists ?? []) {
    if (typeof artist?.slug !== 'string') continue;
    const id: EntityId = `artist:${artist.slug.trim()}`;
    rows.push(...birthRows(artist, id, snapshot.asOfYear));
    const row = (path: 'activeFrom' | 'activeTo', message: string) =>
      rows.push({
        check: 'impossible-years',
        severity: 'warning',
        kind: 'artist',
        id,
        path,
        message,
        fix: { kind: 'artist', id, path },
      });
    // Null is how a JSON body leaves a field unset.
    const isSet = (value: unknown) => value !== undefined && value !== null;
    const notYears = (['activeFrom', 'activeTo'] as const).filter(
      (path) => isSet(artist[path]) && yearOf(artist[path]) === null,
    );
    for (const path of notYears) {
      const which = path === 'activeFrom' ? 'first' : 'last';
      row(
        path,
        `Its ${which} year active is ${JSON.stringify(artist[path])}, which is not a year.`,
      );
    }
    if (notYears.length) continue;

    const from = yearOf(artist.activeFrom);
    const open = !isSet(artist.activeTo);
    const to = yearOf(open ? snapshot.asOfYear : artist.activeTo);
    if (from === null || to === null) continue;
    if (to >= from && decadesBetween(from, to).length) continue;
    row(
      'activeFrom',
      to < from
        ? open
          ? `Active from ${from}, a year still to come (it is ${to}).`
          : `Active from ${from} to ${to}: the span ends before it starts.`
        : `Active from ${from} to ${open ? `today (${to})` : to}: too long a span for one career, so one of the years is probably mistyped.`,
    );
  }
  return rows;
}

/**
 * An artist's birth, or a group's forming, that the API would refuse or the
 * calendar cannot place where the rest of the record does (see
 * `lifeSpanRows`). The shape is the API schema's own (`artistBirthSchema`,
 * generated from the `@pattern` on `ArtistBirth.date`), so the two cannot
 * drift: '1939-4-2' is refused there and listed here, although the graph,
 * reading the year as `yearOf` does, still draws 1939 from it. Then the
 * calendar: a day the month does not have, a year still to come, a year
 * after the first year active.
 */
function birthRows(
  artist: ArtistRecord,
  id: EntityId,
  asOfYear: number | undefined,
): IntegrityRow[] {
  const born = artist.born;
  if (!born || typeof born !== 'object') return [];
  const written = typeof born.date === 'string' ? born.date : '';
  const date = written.trim();
  if (!date) return [];
  const formed = isGroupArtist(artist);
  const row = (message: string): IntegrityRow => ({
    check: 'impossible-years',
    severity: 'warning',
    kind: 'artist',
    id,
    path: 'born.date',
    message,
    fix: { kind: 'artist', id, path: 'born.date' },
  });
  if (!artistBirthSchema.shape.date.safeParse(written).success) {
    return [
      row(
        `Its ${formed ? 'forming' : 'birth'} date is ${JSON.stringify(written)}, which is not written as a date: a year, a year and month, or a full date (1939, 1939-04, 1939-04-02).`,
      ),
    ];
  }
  const year = yearOf(date);
  if (year === null || !isCalendarDate(date)) {
    return [
      row(
        `Its ${formed ? 'forming' : 'birth'} date is '${date}', which is not a date the calendar has.`,
      ),
    ];
  }
  const now = yearOf(asOfYear);
  if (now !== null && year > now) {
    return [
      row(
        `${formed ? 'Formed' : 'Born'} in ${year}, a year still to come (it is ${now}).`,
      ),
    ];
  }
  const first = yearOf(artist.activeFrom);
  if (first !== null && year > first) {
    return [
      row(
        `${formed ? 'Formed' : 'Born'} in ${year}, after its first year active, ${first}.`,
      ),
    ];
  }
  return [];
}

/**
 * A group with a birthplace. A group is born where it formed, which is its
 * City (`basedInPlaceId`), so the graph reads no `born.placeId` on a group
 * and this one says nothing (design C7). Worth a look rather than wrong: it
 * may be the City that is missing, a person marked as a group, or a
 * birthplace the import put on the wrong record. A malformed one is left to
 * its malformed row.
 */
function groupBirthplaceRows(
  snapshot: GraphSnapshot,
  graph: Graph,
): IntegrityRow[] {
  const rows: IntegrityRow[] = [];
  for (const artist of snapshot.artists ?? []) {
    if (typeof artist?.slug !== 'string' || !isGroupArtist(artist)) continue;
    const born = artist.born;
    const stored =
      born && typeof born === 'object' && typeof born.placeId === 'string'
        ? born.placeId.trim()
        : '';
    if (!stored || !isWellFormedSlug('place', stored)) continue;
    const id: EntityId = `artist:${artist.slug.trim()}`;
    const place: EntityId = `place:${stored}`;
    const city =
      typeof artist.basedInPlaceId === 'string'
        ? artist.basedInPlaceId.trim()
        : '';
    const where = !city
      ? `It has no City: if the group formed there, that is where this belongs.`
      : city === stored
        ? `Its City says the same, so it can go.`
        : `Its City is place:${city}.`;
    rows.push({
      check: 'conflicting-owners',
      severity: 'info',
      kind: 'artist',
      id,
      path: 'born.placeId',
      message: `A group, with a birthplace (${place}), which the graph does not read: a group is born where it formed, its City. ${where}`,
      fix: {
        kind: 'artist',
        id,
        path: city ? 'born.placeId' : 'basedInPlaceId',
      },
      ...onGraph(graph, [
        place,
        ...(city ? [`place:${city}` as EntityId] : []),
      ]),
    });
  }
  return rows;
}

/**
 * A record with members that is not marked a group. Only a group has
 * members, so the graph already reads it as one (`isGroupArtist`): its Born
 * is the year it formed, and a birthplace on it is not read. Worth a look
 * rather than wrong: tick Group so the record says what the graph reads, or
 * move the members if they were put on the wrong record.
 */
function unmarkedGroupRows(snapshot: GraphSnapshot): IntegrityRow[] {
  const rows: IntegrityRow[] = [];
  for (const artist of snapshot.artists ?? []) {
    if (typeof artist?.slug !== 'string' || artist.group === true) continue;
    if (!isGroupArtist(artist)) continue;
    const id: EntityId = `artist:${artist.slug.trim()}`;
    const count = artist.members?.length ?? 0;
    rows.push({
      check: 'conflicting-owners',
      severity: 'info',
      kind: 'artist',
      id,
      path: 'group',
      message: `It lists ${count} member${count === 1 ? '' : 's'} but is not marked a group, so the graph reads it as one: its Born is the year it formed, and a birthplace on it is not read.`,
      fix: { kind: 'artist', id, path: 'group' },
    });
  }
  return rows;
}

/**
 * A song on a record whose session still names a label by id. A record
 * names its own label (`release.labelId`), so while the song names any
 * record the graph reads its label from there and not `session.labelId`
 * (song v2). The two agreeing is fine; otherwise this says which the song is
 * on: a warning when the records name another label, worth a look when they
 * name none, since then the label is known only where it is not read. Only
 * well-formed ids are compared; a malformed one is left to its malformed row.
 */
function sessionLabelRows(
  snapshot: GraphSnapshot,
  graph: Graph,
): IntegrityRow[] {
  // First definition wins, as for nodes.
  const labelOf = new Map<string, string>();
  for (const release of snapshot.releases ?? []) {
    if (typeof release?.slug !== 'string') continue;
    const slug = release.slug.trim();
    if (labelOf.has(slug)) continue;
    labelOf.set(
      slug,
      typeof release.labelId === 'string' ? release.labelId.trim() : '',
    );
  }
  const rows: IntegrityRow[] = [];
  for (const song of snapshot.songs ?? []) {
    const stored =
      typeof song?.session?.labelId === 'string'
        ? song.session.labelId.trim()
        : '';
    if (!stored || !isWellFormedSlug('label', stored)) continue;
    const records = (Array.isArray(song.releases) ? song.releases : [])
      .map((r) => (typeof r?.releaseId === 'string' ? r.releaseId.trim() : ''))
      .filter(Boolean);
    if (!records.length) continue;
    const labels = [
      ...new Set(records.map((r) => labelOf.get(r) ?? '').filter(Boolean)),
    ];
    if (labels.includes(stored)) continue;
    const id: EntityId = `song:${song.id}`;
    const label: EntityId = `label:${stored}`;
    const on = records.map((r) => `release:${r}`).join(', ');
    rows.push({
      check: 'conflicting-owners',
      severity: labels.length ? 'warning' : 'info',
      kind: 'song',
      id,
      path: 'session.labelId',
      message: labels.length
        ? `Its session names ${label}, but its records (${on}) are on ${labels.map((l) => `label:${l}`).join(', ')}. A song on a record takes its label from the record, so ${label} is not read.`
        : `Its session names ${label}, which is not read while the song is on a record (${on}): a record names its own label, and these name none. Set it on the record.`,
      fix: { kind: 'song', id, path: 'session.labelId' },
      ...onGraph(graph, [
        label,
        ...labels.map((l): EntityId => `label:${l}`),
        ...records.map((r): EntityId => `release:${r}`),
      ]),
    });
  }
  return rows;
}

/* ── Artist influence that restates an arc ───────────────────────────── */

const INFLUENCED_BY_PATH = 'influencedBy[].artistId';

/**
 * Amendment 2: an artist's `influencedBy` may say what the globe's arcs
 * already say. Artist A influenced by B restates an arc when one runs from a
 * recording of B's to a recording of A's.
 *
 * An artist's recordings are the songs the graph says they performed (lead
 * act, billing, or the display-name guess) and the globe events the graph
 * says are about them (`about`: the event's stored artists, or the ones its
 * title and tags name); a song's globe event is the song once folded, so the
 * two meet on one node. Most arcs run between the globe's hand-authored
 * `evt-` events, which only `about` reaches.
 */
function restatedInfluenceRows(graph: Graph): IntegrityRow[] {
  const arcs = new Set<string>();
  const stated: GraphEdge[] = [];
  for (const edge of graph.edges) {
    if (edge.kind !== 'influenced') continue;
    if (edge.via.some((v) => v.path === INFLUENCE_ARC_PATH)) {
      arcs.add(`${edge.from}>${edge.to}`);
    }
    if (edge.via.some((v) => v.path === INFLUENCED_BY_PATH)) stated.push(edge);
  }
  if (!arcs.size || !stated.length) return [];

  const recordingsBy = (artist: EntityId): Set<EntityId> =>
    new Set(
      (graph.adjacency.get(artist) ?? [])
        .filter(
          (e) =>
            e.to === artist &&
            ((e.kind === 'performed_by' && kindOf(e.from) === 'song') ||
              (e.kind === 'about' && kindOf(e.from) === 'event')),
        )
        .map((e) => e.from),
    );

  const rows: IntegrityRow[] = [];
  for (const edge of stated) {
    const found: string[] = [];
    const theirs = recordingsBy(edge.to);
    for (const from of recordingsBy(edge.from)) {
      for (const to of theirs) {
        if (arcs.has(`${from}>${to}`)) found.push(`${from} → ${to}`);
      }
    }
    if (!found.length) continue;
    found.sort();
    const via = edge.via.find((v) => v.path === INFLUENCED_BY_PATH)!;
    rows.push({
      check: 'restated-influence',
      severity: 'info',
      kind: kindOf(edge.to),
      id: edge.to,
      path: INFLUENCED_BY_PATH,
      message: `Influenced by ${edge.from} restates the globe's arc ${found.join('; ')}.`,
      fix: fixAt(via),
      related: [edge.from],
    });
  }
  return rows;
}

/* ── Draft references and unverified claims ──────────────────────────── */

/**
 * Published content pointing at a draft or a pending proposal: one row per
 * field and draft it names. Only what the field itself names counts — not
 * the player at the other end of a credit's instrument edge — and a code
 * list's statement is never held against the published item it is filed
 * under (see `EdgeVia.code`).
 */
function draftReferenceRows(graph: Graph): IntegrityRow[] {
  const rows: IntegrityRow[] = [];
  const seen = new Set<string>();
  for (const edge of graph.edges) {
    for (const via of edge.via) {
      if (isCodeOwnedVia(via)) continue;
      if (graph.nodes.get(via.item)?.status !== 'published') continue;
      for (const end of namedBy(edge, via)) {
        if (end === via.item) continue;
        const status = graph.nodes.get(end)?.status;
        if (status !== 'draft' && status !== 'pending') continue;
        const key = `${via.item}|${via.path}|${end}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({
          check: 'draft-reference',
          severity: 'warning',
          kind: kindOf(via.item),
          id: via.item,
          path: via.path,
          message: `Published, but names ${end}, which is still ${status === 'draft' ? 'a draft' : 'a pending proposal'}.`,
          fix: fixAt(via),
          related: [end],
        });
      }
    }
  }
  return rows;
}

/** Records marked unconfirmed, and connections no source confirms. */
function unverifiedRows(graph: Graph): IntegrityRow[] {
  const rows: IntegrityRow[] = [];
  for (const node of graph.nodes.values()) {
    if (!node.unverified) continue;
    rows.push({
      check: 'unverified',
      severity: 'info',
      kind: node.kind,
      id: node.id,
      message: `'${node.label}' is marked unverified: every connection it states is unconfirmed.`,
      fix: { kind: node.kind, id: node.id, path: 'unverified' },
    });
  }
  for (const edge of graph.edges) {
    if (!edge.unverified) continue;
    const via = edge.via[0];
    rows.push({
      check: 'unverified',
      severity: 'info',
      kind: kindOf(via.item),
      id: via.item,
      path: via.path,
      message: `${line(edge)} is unconfirmed${edge.source ? ` (source: ${edge.source})` : ''}.`,
      fix: fixAt(via),
      related: [edge.from, edge.to].filter((e) => e !== via.item),
    });
  }
  return rows;
}

/* ── The report ──────────────────────────────────────────────────────── */

const SEVERITY_RANK: Record<IntegritySeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

/**
 * Code-unit order, as for ids: the same for every viewer, where
 * `localeCompare` would follow each browser's locale and collation (names
 * like 'Cesária Évora' sort differently from one to the next).
 */
const byCodeUnit = (x: string, y: string): number =>
  x < y ? -1 : x > y ? 1 : 0;

const byPriority = (a: IntegrityRow, b: IntegrityRow): number =>
  SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
  INTEGRITY_CHECKS.indexOf(a.check) - INTEGRITY_CHECKS.indexOf(b.check) ||
  byCodeUnit(a.id, b.id) ||
  byCodeUnit(a.path ?? '', b.path ?? '') ||
  byCodeUnit(a.message, b.message);

/**
 * Every integrity check over one snapshot. Pass the graph when the caller has
 * already built it (the console memoizes one for the mind map); otherwise it
 * is built here.
 */
export function checkIntegrity(
  snapshot: GraphSnapshot,
  graph: Graph = buildGraph(snapshot),
): IntegrityReport {
  const reported: Reported = { values: new Set(), fields: new Set() };
  const rows = [
    ...malformedNodeRows(graph),
    // Before the two below: it records what it reported in `reported`.
    ...storedIdRows(snapshot, graph, reported),
    ...violationRows(graph, reported),
    ...missingRows(snapshot, graph, reported),
    ...orphanRows(graph),
    ...duplicateRows('artist', snapshot.artists ?? [], graph),
    ...duplicateRows('studio', snapshot.studios ?? [], graph),
    ...duplicateRows('label', snapshot.labels ?? [], graph),
    ...cycleRows(graph),
    ...conflictingOwnerRows(snapshot, graph),
    ...eventPlaceRows(snapshot, graph),
    ...songPinRows(snapshot, graph),
    ...groupBirthplaceRows(snapshot, graph),
    ...unmarkedGroupRows(snapshot),
    ...sessionLabelRows(snapshot, graph),
    ...lifeSpanRows(snapshot),
    ...restatedInfluenceRows(graph),
    ...draftReferenceRows(graph),
    ...unverifiedRows(graph),
  ].sort(byPriority);

  const counts = Object.fromEntries(
    INTEGRITY_CHECKS.map((c) => [c, 0]),
  ) as Record<IntegrityCheck, number>;
  for (const row of rows) counts[row.check]++;

  let nodes = 0;
  for (const node of graph.nodes.values()) if (node.unverified) nodes++;
  const edges = graph.edges.filter((e) => e.unverified).length;

  return {
    rows,
    coverage: coverageOf(snapshot),
    counts,
    unverified: { nodes, edges },
  };
}
