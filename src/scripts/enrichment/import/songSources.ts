import type { CachedGetter } from './fileCache';
import {
  isMbid,
  MB_API,
  type MbArea,
  type MbArtistCredit,
  type MbArtistRef,
  type MbLifeSpan,
  type MbRecording,
  type MbReleaseGroupRef,
  type MbReleaseRef,
} from './musicbrainz';

/**
 * MusicBrainz, as the song half of the importer asks it (F2): a song's
 * recordings, the one chosen looked up with its relationships, the work it
 * performs, the album's release, its labels and the studios it was recorded
 * in.
 *
 * The same rules as the artist half (`musicbrainz.ts`): one polite client,
 * every URL built the same way every time — the URL is the cache key — and
 * nothing here searches by anything but the song's own title.
 */

// ── Response shapes (only the fields the importer reads) ─────────────────

/** A place as a relationship embeds it or its own lookup gives it. */
export interface MbPlace {
  id: string;
  name: string;
  /** Studio, Venue, Stadium, Religious building, …. */
  type?: string | null;
  disambiguation?: string;
  address?: string;
  area?: MbArea | null;
  /** MusicBrainz gives them as numbers or as numeric strings. */
  coordinates?: {
    latitude: number | string;
    longitude: number | string;
  } | null;
  'life-span'?: MbLifeSpan;
  /** Its own lookup's place-rels: the building a studio room is part of. */
  relations?: MbPlaceRelation[];
}

/** A place's relationship to another place. */
export interface MbPlaceRelation {
  type: string;
  'target-type'?: string;
  direction?: string;
  place?: MbPlace;
}

export interface MbWorkRef {
  id: string;
  title: string;
  type?: string | null;
  disambiguation?: string;
}

/** An artist as a relationship embeds it: `type` says person or group. */
export interface MbRelatedArtist extends MbArtistRef {
  type?: string | null;
}

/**
 * A relationship from a recording, work or release. `direction` is from the
 * entity looked up: an artist who produced a recording is `backward` from
 * the recording, the studio it was recorded at is `forward`.
 */
export interface MbSongRelation {
  type: string;
  'target-type'?: string;
  direction?: string;
  attributes?: string[];
  /** What the release credits the artist as, when that differs. */
  'target-credit'?: string;
  artist?: MbRelatedArtist;
  work?: MbWorkRef;
  place?: MbPlace;
}

/** A release as a recording search embeds it: its tracks say where the recording sits. */
export interface MbSearchRelease extends MbReleaseRef {
  media?: {
    position?: number;
    format?: string | null;
    track?: { id: string; number?: string; title?: string }[];
    'track-offset'?: number;
  }[];
}

export interface MbSearchRecording extends MbRecording {
  video?: boolean | null;
  releases?: MbSearchRelease[];
}

export interface MbRecordingSearch {
  count: number;
  offset: number;
  recordings: MbSearchRecording[];
}

export interface MbRecordingFull {
  id: string;
  title: string;
  disambiguation?: string;
  'first-release-date'?: string;
  'artist-credit'?: MbArtistCredit[];
  relations?: MbSongRelation[];
}

export interface MbWork {
  id: string;
  title: string;
  type?: string | null;
  relations?: MbSongRelation[];
}

export interface MbLabelRef {
  id: string;
  name: string;
  'sort-name'?: string;
  disambiguation?: string;
  type?: string | null;
}

export interface MbLabelInfo {
  'catalog-number'?: string | null;
  label?: MbLabelRef | null;
}

export interface MbReleaseFull {
  id: string;
  title: string;
  status?: string | null;
  date?: string;
  country?: string | null;
  'label-info'?: MbLabelInfo[];
  'release-group'?: MbReleaseGroupRef;
  relations?: MbSongRelation[];
}

export interface MbLabel extends MbLabelRef {
  area?: MbArea | null;
  country?: string | null;
  'life-span'?: MbLifeSpan;
}

// ── URLs ─────────────────────────────────────────────────────────────────

/** MusicBrainz's largest search page. */
export const RECORDING_PAGE = 100;
/**
 * Pages of one song's recordings read at most. Filtered by our artist's id,
 * a song past 300 recordings is a standard sung live for fifty years; the
 * studio original is dated, and the search puts it among the first.
 */
export const MAX_RECORDING_PAGES = 3;

/** A Lucene phrase: inside quotes only `\` and `"` are special. */
const phrase = (text: string) => `"${text.replace(/(["\\])/g, '\\$1')}"`;

const page = (offset: number) => (offset ? `&offset=${offset}` : '');

/**
 * Recordings of this title credited to this MusicBrainz artist (`arid`):
 * covers by others never come back, so one page usually holds every take —
 * studio, live, remastered — of the song by the act.
 *
 * An act that also recorded under its band's name ("Chuck Brown & The Soul
 * Searchers") is asked for under every id at once, the act's own first:
 * `arid:a OR arid:b`. One id keeps the one-id spelling, so the searches
 * already cached stay what they were.
 */
export function recordingSearchUrl(
  title: string,
  artistMbids: string | readonly string[],
  offset = 0,
): string {
  const ids = [
    ...new Set(typeof artistMbids === 'string' ? [artistMbids] : artistMbids),
  ];
  if (!ids.length) throw new Error('no MusicBrainz id to search by');
  for (const id of ids)
    if (!isMbid(id)) throw new Error(`not a MusicBrainz id: ${id}`);
  const who =
    ids.length === 1
      ? `arid:${ids[0]}`
      : `(${ids.map((id) => `arid:${id}`).join(' OR ')})`;
  const query = `recording:${phrase(title.trim())} AND ${who}`;
  return `${MB_API}/recording/?query=${encodeURIComponent(query)}&limit=${RECORDING_PAGE}${page(offset)}&fmt=json`;
}

/**
 * By the billed name instead, for a song whose act we have no MusicBrainz id
 * for: only its year is ever read from the answer (the year re-query).
 */
export function recordingNameSearchUrl(
  title: string,
  artistName: string,
  offset = 0,
): string {
  const query = `recording:${phrase(title.trim())} AND artist:${phrase(artistName.trim())}`;
  return `${MB_API}/recording/?query=${encodeURIComponent(query)}&limit=${RECORDING_PAGE}${page(offset)}&fmt=json`;
}

const lookup = (entity: string, id: string, inc: readonly string[]) => {
  if (!isMbid(id)) throw new Error(`not a MusicBrainz id: ${id}`);
  return `${MB_API}/${entity}/${id}?${inc.length ? `inc=${inc.join('+')}&` : ''}fmt=json`;
};

/**
 * Who did what on the recording (producer, engineer, mix, players, singers,
 * arranger, conductor), the work it performs, and the place it was recorded
 * at. Its releases come with the search, whole (a lookup caps them at 25).
 */
export const RECORDING_LOOKUP_INC = [
  'artist-credits',
  'artist-rels',
  'work-rels',
  'place-rels',
] as const;
export const recordingLookupUrl = (id: string): string =>
  lookup('recording', id, RECORDING_LOOKUP_INC);

/** The song as written: composer, lyricist and writer. */
export const WORK_LOOKUP_INC = ['artist-rels'] as const;
export const workLookupUrl = (id: string): string =>
  lookup('work', id, WORK_LOOKUP_INC);

/**
 * The album as issued: its labels and catalog numbers, the release group's
 * first date, and the album-wide credits and studios (weaker than the
 * recording's own: an album producer usually, not always, produced every
 * track).
 */
export const RELEASE_LOOKUP_INC = [
  'labels',
  'release-groups',
  'artist-rels',
  'place-rels',
] as const;
export const releaseLookupUrl = (id: string): string =>
  lookup('release', id, RELEASE_LOOKUP_INC);

/** A label's area (where it was based) and life-span (founded, defunct). */
export const labelLookupUrl = (id: string): string => lookup('label', id, []);

/**
 * A place's type (is it a studio), area, coordinates and life-span, and the
 * place it is part of: MusicBrainz may name the room ("Studio 2") a take was
 * recorded in, and the studio is the building.
 */
export const PLACE_LOOKUP_INC = ['place-rels'] as const;
export const placeLookupUrl = (id: string): string =>
  lookup('place', id, PLACE_LOOKUP_INC);

/**
 * The place this one is part of, as its own lookup states it ("Studio 2" is
 * part of "Abbey Road Studios"): MusicBrainz keeps the relationship on the
 * whole, so from the part it points backward. Null when it states none, or
 * more than one.
 */
export function wholePlaceOf(
  place: Pick<MbPlace, 'relations'> | undefined,
): MbPlace | null {
  const wholes = [
    ...new Map(
      (place?.relations ?? [])
        .filter(
          (r) =>
            (r.type === 'parts' || r.type === 'part of') &&
            r.direction === 'backward' &&
            !!r.place?.id,
        )
        .map((r) => [r.place!.id, r.place!]),
    ).values(),
  ];
  return wholes.length === 1 ? wholes[0] : null;
}

// ── Client ───────────────────────────────────────────────────────────────

/**
 * A lookup MusicBrainz answered with "no such thing" (404), or an id that is
 * not one: an answer, unlike `null`, which is a dry run's miss.
 */
export const GONE = 'gone' as const;
export type Looked<T> = T | typeof GONE | null;

export interface SongMusicBrainz {
  /** Null for a dry-run miss. One id or several (the act and its bands). */
  searchRecordings(
    title: string,
    artistMbids: string | readonly string[],
    offset?: number,
  ): Promise<MbRecordingSearch | null>;
  searchRecordingsByName(
    title: string,
    artistName: string,
    offset?: number,
  ): Promise<MbRecordingSearch | null>;
  lookupRecording(id: string): Promise<Looked<MbRecordingFull>>;
  lookupWork(id: string): Promise<Looked<MbWork>>;
  lookupRelease(id: string): Promise<Looked<MbReleaseFull>>;
  lookupLabel(id: string): Promise<Looked<MbLabel>>;
  lookupPlace(id: string): Promise<Looked<MbPlace>>;
}

const EMPTY_SEARCH: MbRecordingSearch = { count: 0, offset: 0, recordings: [] };

export function createSongMusicBrainz(get: CachedGetter): SongMusicBrainz {
  const search = async (url: string): Promise<MbRecordingSearch | null> => {
    const res = await get(url);
    if (!res) return null;
    if (res.status !== 200) return EMPTY_SEARCH;
    const body = res.body as Partial<MbRecordingSearch>;
    return {
      count: body.count ?? 0,
      offset: body.offset ?? 0,
      recordings: body.recordings ?? [],
    };
  };
  const one =
    <T>(url: (id: string) => string) =>
    async (id: string): Promise<Looked<T>> => {
      if (!isMbid(id)) return GONE;
      const res = await get(url(id));
      if (!res) return null;
      return res.status === 200 ? (res.body as T) : GONE;
    };
  return {
    searchRecordings: (title, artistMbids, offset = 0) =>
      search(recordingSearchUrl(title, artistMbids, offset)),
    searchRecordingsByName: (title, artistName, offset = 0) =>
      search(recordingNameSearchUrl(title, artistName, offset)),
    lookupRecording: one<MbRecordingFull>(recordingLookupUrl),
    lookupWork: one<MbWork>(workLookupUrl),
    lookupRelease: one<MbReleaseFull>(releaseLookupUrl),
    lookupLabel: one<MbLabel>(labelLookupUrl),
    lookupPlace: one<MbPlace>(placeLookupUrl),
  };
}

/** A place's coordinates as numbers, when it has them. */
export function placeCoordinates(
  place: Pick<MbPlace, 'coordinates'> | null | undefined,
): [number, number] | null {
  const lat = Number(place?.coordinates?.latitude);
  const lng = Number(place?.coordinates?.longitude);
  return place?.coordinates && Number.isFinite(lat) && Number.isFinite(lng)
    ? [lat, lng]
    : null;
}

/** The label MusicBrainz uses for "no label" (self-released, white label). */
export const NO_LABEL_MBID = '157afde4-4bf5-4039-8ad2-5a15acc85176';

/**
 * Label types that issue records. A release's label info also names its
 * distributor, manufacturer, publisher or rights society — companies, not
 * the label the record came out on.
 */
const NOT_A_RECORD_LABEL: ReadonlySet<string> = new Set([
  'Distributor',
  'Holding',
  'Rights Society',
  'Publisher',
  'Manufacturer',
  'Bootleg Production',
]);

/** The labels a release came out on, each once, with its catalog number. */
export function releaseLabels(
  info: readonly MbLabelInfo[] | undefined,
): { id: string; name: string; catalog?: string }[] {
  const out: { id: string; name: string; catalog?: string }[] = [];
  for (const entry of info ?? []) {
    const label = entry.label;
    if (
      !label?.id ||
      label.id === NO_LABEL_MBID ||
      (label.type && NOT_A_RECORD_LABEL.has(label.type)) ||
      out.some((o) => o.id === label.id)
    )
      continue;
    const catalog = entry['catalog-number']?.trim();
    out.push({
      id: label.id,
      name: label.name,
      ...(catalog && catalog.toLowerCase() !== '[none]' ? { catalog } : {}),
    });
  }
  return out;
}

export const MB_RECORDING = 'https://musicbrainz.org/recording/';
export const MB_RELEASE = 'https://musicbrainz.org/release/';
export const MB_RELEASE_GROUP = 'https://musicbrainz.org/release-group/';
export const MB_WORK = 'https://musicbrainz.org/work/';
export const MB_LABEL = 'https://musicbrainz.org/label/';
export const MB_PLACE = 'https://musicbrainz.org/place/';
