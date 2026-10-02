import { resolveArea, type ResolvedArea } from './areas';
import { type RegistryArtist, titleKey } from './cacheStage';
import type { MbArea, MusicBrainzClient } from './musicbrainz';
import { HttpError, ServerClosedError } from './politeHttp';
import { songWorks } from './songCredits';
import {
  actIds,
  type AlbumChoice,
  type AlbumRelease,
  type ArtistPick,
  chooseAlbum,
  chooseRelease,
  type CutOff,
  type LeadAct,
  leadActOf,
  matchSong,
  type SongFacts,
  type SongMatch,
} from './songMatch';
import {
  GONE,
  type Looked,
  MAX_RECORDING_PAGES,
  type MbLabel,
  type MbPlace,
  type MbRecordingFull,
  type MbReleaseFull,
  type MbSearchRecording,
  type MbWork,
  RECORDING_PAGE,
  releaseLabels,
  type SongMusicBrainz,
  wholePlaceOf,
} from './songSources';
import type { WikidataClient } from './wikidata';

/**
 * The song half of the fetch (F2): per library song, its recording and what
 * MusicBrainz says about it; then, once for all of them, the albums' releases,
 * their labels, the studios, the areas those are in, and the Wikidata items
 * of those areas (their coordinates).
 *
 * Per song, in library order:
 * 1. The recordings of its title credited to its lead act (or to a band
 *    named after it, `actBands`) — from `_mb_cache.json` when the old
 *    search's answer was whole (fewer than the 25 it kept) and its earliest
 *    take is on the act's own record, from our year (±1) when we have one;
 *    else a search by the act's ids (up to three pages of 100; a search cut
 *    short says so, and its match is only likely). A song whose act has no
 *    MusicBrainz id is
 *    searched by the billed name only when its year is to be looked for
 *    again, and nothing but the year is read from it.
 * 2. The match (`songMatch.ts`). A match, and only a match, is looked up:
 *    the recording with its relationships, the work it performs, and the
 *    studios it was recorded at — a room ("Abbey Road Studios: Studio 2")
 *    with the building it is part of.
 * Then, per album (a release group, shared by its songs): the release its
 * label is read from, looked up with its labels, producers and studios; each
 * label and studio looked up; their areas resolved to a town and a country
 * (`areas.ts`); and the Wikidata items of those areas.
 *
 * Every answer lands in the per-URL cache, so a rerun resumes, and scoring
 * walks the same plan again with getters that only read the cache: it sees
 * what the fetch has gathered, finished or not, and no report can go stale.
 */

export interface SongToFetch extends SongFacts {
  lead: LeadAct | null;
  /** No act of ours with an id: the billed name the year is searched by. */
  byName: string | null;
  /** No year, and a miss of `enrichSongYears.mjs` or a placeholder event year: look again. */
  requery: boolean;
  /** The old cache's whole answer, settling the song: no search needed. */
  oldRecordings: MbSearchRecording[] | null;
  /** Why nothing is fetched for it. */
  skip?: string;
}

/** `buildGlobeData.mjs` pins a song with no year at this year on the globe. */
export const PLACEHOLDER_YEAR = 2000;

/**
 * The songs whose year is looked for again (C15): no year in the library,
 * and either missed by `enrichSongYears.mjs` (`_year_misses.json`, several
 * of them HTTP 503s) or shown on the globe at the placeholder year. The 49
 * others with no year carry a real event year: the app's own suggestion
 * (Stage 1) covers them.
 */
export function requerySet(
  songs: readonly Pick<SongFacts, 'id' | 'year'>[],
  misses: readonly string[],
  events: readonly { id: string; year: number }[],
): Set<string> {
  const missed = new Set(misses);
  const placeholders = new Set(
    events
      .filter((e) => e.id.startsWith('song-') && e.year === PLACEHOLDER_YEAR)
      .map((e) => e.id.slice('song-'.length)),
  );
  return new Set(
    songs
      .filter(
        (s) =>
          s.year === undefined && (missed.has(s.id) || placeholders.has(s.id)),
      )
      .map((s) => s.id),
  );
}

export interface SongPlanInput {
  songs: readonly SongFacts[];
  registry: ReadonlyMap<string, RegistryArtist>;
  /** Our artists' sure and likely MusicBrainz identities (F1), by slug. */
  picks: ReadonlyMap<string, ArtistPick>;
  /** The songs whose year is looked for again. */
  requery: ReadonlySet<string>;
  /**
   * The old cache's answer for a song — its own question, answered, and
   * whole (fewer recordings than the 25 the old search kept) — else null.
   */
  oldAnswer: (songId: string) => MbSearchRecording[] | null;
}

export function planSongFetch(input: SongPlanInput): SongToFetch[] {
  return [...input.songs]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((song) => {
      const requery = input.requery.has(song.id);
      const resolved = leadActOf(song.artist, input.registry, input.picks);
      if (resolved.kind === 'pick') {
        const lead = resolved.lead;
        const old = input.oldAnswer(song.id);
        const match = old ? matchSong(song, old, { lead }) : null;
        // Settled by the old answer only when it matches the act's own
        // record of the song, from the year we have, with nothing in it to
        // doubt: a search by id may find more.
        const usable =
          match?.status === 'matched' &&
          match.take.originals.length > 0 &&
          (song.year === undefined ||
            Math.abs(match.take.year - song.year) <= 1);
        return {
          ...song,
          lead,
          byName: null,
          requery,
          oldRecordings: usable ? old : null,
        };
      }
      return {
        ...song,
        lead: null,
        byName: requery ? resolved.name : null,
        requery,
        oldRecordings: null,
        ...(requery ? {} : { skip: resolved.reason }),
      };
    });
}

/** What the walk found for one song. */
export interface SongWalkRow {
  songId: string;
  /** The lead act's slug. */
  lead: string | null;
  source: 'old-cache' | 'search' | 'name-search' | 'skipped';
  /** Pages of search read. */
  pages: number;
  /** The search had more recordings than were read. */
  cutOff?: CutOff;
  skipped?: string;
  /** An answer it needs is not in the cache yet (a dry run, or a fetch still going). */
  pending?: 'search' | 'recording' | 'work' | 'place';
  error?: string;
  match?: SongMatch;
  /** The matched recording, looked up; absent when MusicBrainz no longer has it. */
  recording?: MbRecordingFull;
  workIds?: string[];
  /** Why no work is read for composers. */
  worksNote?: string;
  album?: AlbumChoice | null;
  /** Places the recording was "recorded at" (any kind; scoring keeps studios). */
  placeIds?: string[];
}

export interface AlbumWalk {
  groupId: string;
  /** The release its label is read from; `firstIssue` when from the album's first year. */
  release: AlbumRelease & { firstIssue: boolean };
  /** Its lookup; null while not in the cache, or when MusicBrainz no longer has it. */
  full: MbReleaseFull | null;
  /** Songs on it, by id. */
  songIds: string[];
}

export interface SongWalk {
  rows: SongWalkRow[];
  works: Map<string, MbWork>;
  albums: Map<string, AlbumWalk>;
  labels: Map<string, MbLabel>;
  places: Map<string, MbPlace>;
  /** A room a take was recorded in → the building it is part of, by id. */
  wholes: Map<string, string>;
  /** Areas of labels and studios, resolved. */
  areas: Map<string, ResolvedArea>;
  /** Members of our lead acts that are groups, by the group's MBID. */
  members: Map<string, Set<string>>;
  /** Answers not in the cache yet, by what they are: the fetch has not finished. */
  missing: Record<string, number>;
}

export interface SongClients {
  songs: SongMusicBrainz;
  /** The artist half's client: areas, and our acts' own lookups (their members). */
  mb: Pick<MusicBrainzClient, 'lookupArea' | 'lookupArtist'>;
  wikidata: WikidataClient;
}

export interface WalkOptions {
  log?: (line: string) => void;
  maxFailuresInARow?: number;
}

/** A lookup's answer, or undefined while it is not in the cache (and why, counted). */
function answered<T>(
  value: Looked<T>,
  missing: Record<string, number>,
  what: string,
): T | typeof GONE | undefined {
  if (value === null) {
    missing[what] = (missing[what] ?? 0) + 1;
    return undefined;
  }
  return value;
}

async function recordingsOf(
  song: SongToFetch,
  mb: SongMusicBrainz,
): Promise<{
  recordings: MbSearchRecording[];
  pages: number;
  cutOff: CutOff | null;
} | null> {
  const search = (offset: number) =>
    song.lead
      ? mb.searchRecordings(song.title, actIds(song.lead), offset)
      : mb.searchRecordingsByName(song.title, song.byName ?? '', offset);
  const first = await search(0);
  if (!first) return null;
  const recordings = [...first.recordings];
  let pages = 1;
  while (
    pages < MAX_RECORDING_PAGES &&
    recordings.length < first.count &&
    first.recordings.length === RECORDING_PAGE
  ) {
    const next = await search(pages * RECORDING_PAGE);
    if (!next) return null;
    pages++;
    if (!next.recordings.length) break;
    recordings.push(...next.recordings);
  }
  return {
    recordings,
    pages,
    cutOff:
      recordings.length < first.count
        ? { count: first.count, read: recordings.length }
        : null,
  };
}

/** The "recorded at" places of a recording or a release. */
export const recordedAt = (relations: MbRecordingFull['relations']): string[] =>
  [
    ...new Set(
      (relations ?? [])
        .filter((r) => r.type === 'recorded at' && r.place?.id)
        .map((r) => r.place!.id),
    ),
  ].sort();

async function walkSong(
  song: SongToFetch,
  clients: SongClients,
  walk: SongWalk,
): Promise<SongWalkRow> {
  const row: SongWalkRow = {
    songId: song.id,
    lead: song.lead?.slug ?? null,
    source: song.skip
      ? 'skipped'
      : song.oldRecordings
        ? 'old-cache'
        : song.lead
          ? 'search'
          : 'name-search',
    pages: 0,
  };
  if (song.skip) return { ...row, skipped: song.skip };

  let recordings = song.oldRecordings;
  if (!recordings) {
    const found = await recordingsOf(song, clients.songs);
    if (!found) {
      walk.missing.search = (walk.missing.search ?? 0) + 1;
      return { ...row, pending: 'search' };
    }
    recordings = found.recordings;
    row.pages = found.pages;
    if (found.cutOff) row.cutOff = found.cutOff;
  }
  const match = matchSong(
    song,
    recordings,
    song.lead ? { lead: song.lead } : { byName: song.byName ?? '' },
    { cutOff: row.cutOff },
  );
  row.match = match;
  // Found by name, only the year is read: nothing more to look up.
  if (match.status !== 'matched' || !song.lead) return row;

  const leadIds = new Set(actIds(song.lead));
  // Every take of the song from the year of the one matched (±1): the
  // single edit and the album take, not a live-at-the-Garden take of 2025.
  row.album = chooseAlbum(
    match.all
      .filter((t) => Math.abs(t.year - match.take.year) <= 1)
      .map((t) => t.recording),
    leadIds,
  );

  const looked = answered(
    await clients.songs.lookupRecording(match.take.recording.id),
    walk.missing,
    'recording',
  );
  if (looked === undefined) return { ...row, pending: 'recording' };
  if (looked === GONE) return row;
  row.recording = looked;

  const works = songWorks(looked, titleKey, titleKey(song.title));
  row.workIds = works.ids;
  if (works.reason) row.worksNote = works.reason;
  for (const id of works.ids.slice(0, 2)) {
    if (walk.works.has(id)) continue;
    const work = answered(
      await clients.songs.lookupWork(id),
      walk.missing,
      'work',
    );
    if (work === undefined) row.pending ??= 'work';
    else if (work !== GONE) walk.works.set(id, work);
  }

  row.placeIds = recordedAt(looked.relations);
  for (const id of row.placeIds) await lookPlace(id, clients, walk, row);
  return row;
}

async function lookPlace(
  id: string,
  clients: SongClients,
  walk: SongWalk,
  row?: SongWalkRow,
) {
  if (walk.places.has(id)) return;
  const place = answered(
    await clients.songs.lookupPlace(id),
    walk.missing,
    'place',
  );
  if (place === undefined) {
    if (row) row.pending ??= 'place';
    return;
  }
  if (place === GONE) return;
  walk.places.set(id, place);
  // A room is part of a building: the building is the studio.
  const whole = wholePlaceOf(place);
  if (whole && whole.id !== id) {
    walk.wholes.set(id, whole.id);
    await lookPlace(whole.id, clients, walk, row);
  }
}

/** A studio, by its lookup's type. */
export const isStudio = (place: MbPlace | undefined): boolean =>
  place?.type === 'Studio';

/**
 * The studio a take recorded at a place was made in: the building a room
 * is part of when that is a studio, else the place itself when it is one;
 * null for a place that is no studio (a venue, a church).
 */
export function studioOf(
  walk: Pick<SongWalk, 'places' | 'wholes'>,
  placeId: string,
): string | null {
  const whole = walk.wholes.get(placeId);
  if (whole && isStudio(walk.places.get(whole))) return whole;
  return isStudio(walk.places.get(placeId)) ? placeId : null;
}

/** The studios among the places a recording or an album names, each once. */
export const studiosOf = (
  walk: Pick<SongWalk, 'places' | 'wholes'>,
  placeIds: readonly string[],
): string[] =>
  [
    ...new Set(
      placeIds
        .map((id) => studioOf(walk, id))
        .filter((id): id is string => !!id),
    ),
  ].sort();

function describe(row: SongWalkRow): string {
  if (row.skipped) return `skipped: ${row.skipped}`;
  if (row.error) return `ERROR ${row.error}`;
  const how = `${row.source}${row.pages > 1 ? ` (${row.pages} pages)` : ''}${row.cutOff ? ` (${row.cutOff.read} of ${row.cutOff.count} read)` : ''}`;
  if (row.pending === 'search') return `${how}: not cached yet`;
  const match = row.match;
  if (!match) return how;
  if (match.status !== 'matched')
    return `${how}: ${match.status} — ${match.reasons.join('; ')}`;
  const album = row.album ? `; album "${row.album.title}"` : '; no album';
  const pending = row.pending ? `; ${row.pending} not cached yet` : '';
  return `${how}: ${match.tier} "${match.take.recording.title}" ${match.take.date}${album}${pending}`;
}

/**
 * Walk the songs, then the albums, labels, studios, areas and Wikidata
 * items they lead to. With a cache-only getter this is scoring's read of the
 * cache; with a fetching one, the fetch.
 */
export async function walkSongs(
  queue: readonly SongToFetch[],
  clients: SongClients,
  { log = () => undefined, maxFailuresInARow = 3 }: WalkOptions = {},
): Promise<SongWalk> {
  const walk: SongWalk = {
    rows: [],
    works: new Map(),
    albums: new Map(),
    labels: new Map(),
    places: new Map(),
    wholes: new Map(),
    areas: new Map(),
    members: new Map(),
    missing: {},
  };
  const guard = guardFailures(maxFailuresInARow);

  for (const [index, song] of queue.entries()) {
    let row: SongWalkRow;
    try {
      row = await walkSong(song, clients, walk);
      guard.ok();
    } catch (error) {
      row = {
        songId: song.id,
        lead: song.lead?.slug ?? null,
        source: song.lead ? 'search' : 'name-search',
        pages: 0,
        error: guard.failed(error),
      };
    }
    walk.rows.push(row);
    log(`[${index + 1}/${queue.length}] ${song.id} — ${describe(row)}`);
  }

  // Albums: one release per release group, over every song on it.
  const leads = new Map(queue.map((s) => [s.id, s.lead]));
  const groups = new Map<
    string,
    { releases: AlbumRelease[]; songs: string[] }
  >();
  for (const row of walk.rows) {
    if (!row.album) continue;
    const group = groups.get(row.album.groupId) ?? { releases: [], songs: [] };
    group.releases.push(...row.album.releases);
    group.songs.push(row.songId);
    groups.set(row.album.groupId, group);
  }
  for (const [groupId, group] of [...groups].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const songIds = [...new Set(group.songs)].sort();
    const unique = [...new Map(group.releases.map((r) => [r.id, r])).values()];
    const release = chooseRelease(
      unique,
      leads.get(songIds[0])?.countryCode ?? null,
    );
    if (!release) continue;
    const album: AlbumWalk = { groupId, release, full: null, songIds };
    walk.albums.set(groupId, album);
    try {
      const full = answered(
        await clients.songs.lookupRelease(release.id),
        walk.missing,
        'release',
      );
      if (full && full !== GONE) album.full = full;
      guard.ok();
    } catch (error) {
      log(`  release ${release.id}: ${guard.failed(error)}`);
    }
  }

  // Labels, and the album's studios for songs whose recording names none.
  const studioLess = new Set(
    walk.rows
      .filter((r) => r.recording && !studiosOf(walk, r.placeIds ?? []).length)
      .map((r) => r.songId),
  );
  for (const album of walk.albums.values()) {
    const labelIds = releaseLabels(album.full?.['label-info'])
      .map((l) => l.id)
      .sort();
    for (const id of labelIds) {
      if (walk.labels.has(id)) continue;
      try {
        const label = answered(
          await clients.songs.lookupLabel(id),
          walk.missing,
          'label',
        );
        if (label && label !== GONE) walk.labels.set(id, label);
        guard.ok();
      } catch (error) {
        log(`  label ${id}: ${guard.failed(error)}`);
      }
    }
    if (album.songIds.some((id) => studioLess.has(id)))
      for (const id of recordedAt(album.full?.relations)) {
        try {
          await lookPlace(id, clients, walk);
          guard.ok();
        } catch (error) {
          log(`  place ${id}: ${guard.failed(error)}`);
        }
      }
  }

  // The areas labels were based in and studios stand in.
  const areas = new Map<string, MbArea>();
  for (const label of walk.labels.values())
    if (label.area?.id) areas.set(label.area.id, label.area);
  const studios = new Set(studiosOf(walk, [...walk.places.keys()]));
  for (const place of walk.places.values())
    if (studios.has(place.id) && place.area?.id)
      areas.set(place.area.id, place.area);
  for (const [id, area] of [...areas].sort(([a], [b]) => a.localeCompare(b))) {
    try {
      const resolved = await resolveArea(clients.mb, area);
      if (!resolved.complete) walk.missing.area = (walk.missing.area ?? 0) + 1;
      walk.areas.set(id, resolved);
      guard.ok();
    } catch (error) {
      log(`  area ${id}: ${guard.failed(error)}`);
    }
  }
  // Their coordinates, to create a town that is none of ours.
  const items = [...walk.areas.values()]
    .map((a) => a.wikidata)
    .filter((q): q is string => !!q);
  if (items.length) {
    try {
      await clients.wikidata.getEntities(items, ['labels', 'claims']);
    } catch (error) {
      if (!(error instanceof HttpError) || error instanceof ServerClosedError)
        throw error;
      log(`The Wikidata items of the record areas failed: ${error.message}`);
    }
  }

  // Our lead acts' members (C30): their lookups are the artist half's, cached.
  const leadIds = [
    ...new Set(
      walk.rows.flatMap((r) =>
        r.recording && leads.get(r.songId) ? [leads.get(r.songId)!.mbid] : [],
      ),
    ),
  ].sort();
  for (const id of leadIds) {
    let artist: Awaited<ReturnType<SongClients['mb']['lookupArtist']>> = null;
    try {
      artist = await clients.mb.lookupArtist(id);
      guard.ok();
    } catch (error) {
      log(`  artist ${id}: ${guard.failed(error)}`);
    }
    if (!artist) continue;
    const members = (artist.relations ?? [])
      .filter(
        (r) =>
          r.type === 'member of band' &&
          r.direction === 'backward' &&
          r.artist?.id,
      )
      .map((r) => r.artist!.id);
    if (members.length) walk.members.set(id, new Set(members));
  }
  return walk;
}

/**
 * A request that failed every retry costs one song (or one album, label or
 * studio), not the run — unless it keeps happening, which means the server
 * is refusing us; a server that has said "come back later" stops the run at
 * once. A rerun resumes from the cache.
 */
function guardFailures(max: number) {
  let inARow = 0;
  return {
    /** The failure, counted; anything but a request that failed is thrown. */
    failed(error: unknown): string {
      if (!(error instanceof HttpError) || error instanceof ServerClosedError)
        throw error;
      inARow++;
      if (inARow >= max)
        throw new Error(
          `stopped after ${inARow} failed requests in a row; rerun later and the cache resumes where this stopped`,
        );
      return error.message;
    },
    ok() {
      inARow = 0;
    },
  };
}
