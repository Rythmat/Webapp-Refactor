import { artistSlug, normalizeArtistName } from '@/content/graph/slugs';
import type {
  MbArtistCredit,
  MbArtistRef,
  MbRecording,
  MbReleaseGroup,
} from './musicbrainz';

/**
 * The cache stage: what `_mb_cache.json` already knows, read offline before a
 * single new request is made (design §5.2).
 *
 * `enrichSongYears.mjs` searched MusicBrainz for every library song in May
 * and kept the answers: release groups and recordings named like the song,
 * each with its artist credit. Two things in there are worth more than the
 * years it was written for:
 *
 * - **Song-billed artist ids.** A recording titled exactly like one of our
 *   songs and credited to our artist's exact name says which MusicBrainz
 *   artist that is — the strongest identity evidence the scoring has (+0.40),
 *   and for about 300 artists it replaces a search.
 * - **Album candidates.** The official studio albums those recordings appear
 *   on, earliest first: where the Album suggestion starts.
 *
 * Pure: the songs, the registry and the old cache are parameters, so the test
 * runs it on a fixture and the CLI on the real 197 MB file.
 */

export interface LibrarySong {
  id: string;
  title: string;
  artist: string;
  year?: number;
  /**
   * `origin.artistGlobeId`: the act a printed billing names when the billing
   * is no registry name ("Rufus and Chaka Khan" is `rufus`), as the graph
   * reads it.
   */
  artistGlobeId?: string;
}

export interface RegistryArtist {
  slug: string;
  name: string;
  aliases?: readonly string[];
}

/** One `artist|title` answer in `_mb_cache.json`. */
export interface MbCacheEntry {
  releaseGroups?: MbReleaseGroup[];
  recordings?: MbRecording[];
  queriedAt?: string;
  /** Set when MusicBrainz refused the query ("HTTP 503"). */
  error?: string;
}

export type MbCache = Readonly<Record<string, MbCacheEntry>>;

/** One line of `_year_audit.json`. */
export interface YearAuditRow {
  slug: string;
  decision: string;
  /** The year MusicBrainz gave, which `accept` wrote into the song. */
  year?: number;
}

// ── Keys ─────────────────────────────────────────────────────────────────

/**
 * `enrichSongYears.mjs`'s `normalize`, reproduced exactly: the old cache is
 * keyed by it, accents dropped rather than folded ("Beyoncé" → "beyonc").
 */
export const legacyKeyPart = (text: string): string =>
  text
    .toLowerCase()
    .replace(/['`ʼ‘’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * The keys a song may be filed under. In May some song files wrote `&amp;`
 * for `&` ("Bob Seger &amp; The Silver Bullet Band") and some wrote "and"
 * ("Kool and the Gang", "Hall and Oates"); the files say `&` now, and the old
 * keys kept whichever spelling was there.
 */
export function legacyKeys(song: Pick<LibrarySong, 'artist' | 'title'>) {
  const spellings = (text: string) =>
    text.includes('&')
      ? [text, text.replace(/&/g, '&amp;'), text.replace(/&/g, 'and')]
      : [text];
  const keys: string[] = [];
  for (const artist of spellings(song.artist)) {
    for (const title of spellings(song.title)) {
      keys.push(`${legacyKeyPart(artist)}|${legacyKeyPart(title)}`);
    }
  }
  return keys;
}

/**
 * A trailing "(Remastered 2009)", " - Single Version" or "[feat. X]" names a
 * pressing, not a different song.
 */
const VERSION_WORDS =
  /\b(remaster(ed)?|single version|radio edit|album version|mono|stereo|feat\.?|ft\.?|featuring|with)\b/i;
const TRAILING_PART = /\s*(?:\(([^()]*)\)|\[([^[\]]*)\]|\s[-–—]\s([^-–—]*))$/;

/** The trailing "(…)", "[…]" and " - …" parts of a title, last one first. */
function trailingParts(title: string): { part: string; start: number }[] {
  const parts: { part: string; start: number }[] = [];
  let text = title.trim();
  for (;;) {
    const match = TRAILING_PART.exec(text);
    const part = match && (match[1] ?? match[2] ?? match[3]);
    if (!match || !part) return parts;
    parts.push({ part, start: match.index });
    text = text.slice(0, match.index).trim();
  }
}

export function stripVersion(title: string): string {
  const whole = title.trim();
  let text = whole;
  for (const { part, start } of trailingParts(whole)) {
    if (!VERSION_WORDS.test(part)) break;
    text = whole.slice(0, start).trim();
  }
  return text;
}

/** Title comparison: accents, case and punctuation folded, "&" read as "and". */
export const titleKey = (title: string): string =>
  normalizeArtistName(stripVersion(title));

/**
 * Name comparison, with a leading article optional on both sides — the old
 * script searched "Fugees" for "The Fugees" for the same reason. "The"
 * always; "A" only when two words or more remain, so our "Taste Of Honey"
 * meets MusicBrainz's "A Taste of Honey" while a-ha stays "a ha".
 */
export const nameKey = (name: string): string => {
  const key = normalizeArtistName(name).replace(/^the /, '');
  const rest = key.replace(/^a /, '');
  return rest !== key && rest.includes(' ') ? rest : key;
};

/**
 * Live takes, remixes, demos and karaoke carry the artist's name but are not
 * the record: they still say who the artist is, but no album is chosen
 * through them.
 */
const ALTERNATE_TAKE =
  /\b(live|remix(ed)?|karaoke|instrumental|demo|rehearsal|acoustic|a cappella)\b/i;

export const isAlternateTake = (recording: MbRecording): boolean =>
  ALTERNATE_TAKE.test(recording.disambiguation ?? '') ||
  trailingParts(recording.title).some(({ part }) => ALTERNATE_TAKE.test(part));

// ── Output ───────────────────────────────────────────────────────────────

export interface ReleaseCandidate {
  releaseGroupId: string;
  title: string;
  /** Earliest date seen for it (`YYYY`, `YYYY-MM` or `YYYY-MM-DD`). */
  firstDate?: string;
}

export interface CreditedArtist {
  mbid: string;
  name: string;
  disambiguation?: string;
  /** Distinct recordings with the song's title credited to this artist. */
  recordings: number;
}

export interface BilledArtist extends CreditedArtist {
  /**
   * On an official plain album or single credited to it. Billing on
   * compilations, promos and live sets alone is weak: a same-named act turns
   * up on those (a 50s rockabilly "The Commodores" on a hits compilation).
   */
  onRelease: boolean;
}

export interface SongCacheRow {
  songId: string;
  title: string;
  artist: string;
  /** The registry artist the song's billing names, when there is one. */
  artistSlug: string | null;
  /**
   * The `_mb_cache.json` answers read: the song's own key, or — when its
   * artist was spelled differently in May — every answer for its title.
   */
  cacheKeys: string[];
  /**
   * Read through its title alone (`cacheKeys` are other artists' questions,
   * or a misspelling of ours).
   */
  byTitle: boolean;
  /**
   * `missing`: the old cache never asked about this song — no key, or only
   * other artists' answers for its title and none of them credits ours (F2
   * asks again); `error`: MusicBrainz refused it; `matched`: a recording has
   * this title and this artist; `unmatched`: the answer holds no such
   * recording.
   */
  status: 'missing' | 'error' | 'matched' | 'unmatched';
  /** Recordings with exactly this title credited to exactly this artist. */
  exactRecordings: number;
  /**
   * The artist ids those recordings credit under our artist's name, best
   * evidence first.
   */
  billed: BilledArtist[];
  /**
   * The artist credited on the most recordings of this exact title in the
   * song's own answer, when that is not a billed id — the answer was a search
   * for this song, so someone else carrying it is a warning: the billing may
   * name the wrong artist of the same name, or ours under another name.
   */
  topCredit?: CreditedArtist;
  /**
   * The credit matches only as a whole ("Alicia Keys & Justin Timberlake"):
   * a joint billing, which no single artist id stands for.
   */
  jointCredit: boolean;
  /** Official studio albums carrying the recording, earliest first. */
  albums: ReleaseCandidate[];
  /** Official singles named like the song, earliest first. */
  singles: ReleaseCandidate[];
  /** Earliest first-release date among the studio recordings. */
  firstReleaseDate?: string;
  /**
   * The stored year was copied from MusicBrainz by `enrichSongYears.mjs`, so
   * MusicBrainz agreeing with it later is not independent evidence.
   */
  yearFromMusicBrainz: boolean;
}

export interface ArtistCandidate extends CreditedArtist {
  /** The library songs billed to it. */
  songIds: string[];
  /** Of those, the ones where it is on an official plain album or single. */
  releaseSongIds: string[];
}

export interface ArtistCacheRow {
  slug: string;
  name: string;
  songIds: string[];
  /**
   * Song-billed artist ids, best evidence first: official releases, then
   * recordings, then songs. Song counts alone tie too often — both
   * Commodores are billed on two songs, but one has two compilation
   * credits and the other the band's own records.
   */
  candidates: ArtistCandidate[];
}

/** No official plain album or single behind the best candidate. */
export const isWeakBilling = (artist: ArtistCacheRow): boolean =>
  !artist.candidates[0]?.releaseSongIds.length;

export interface CacheStageCounts {
  songs: number;
  /** Songs the old cache holds an answer for (errors included). */
  cached: number;
  errors: number;
  /** Songs with a recording whose title and artist match exactly. */
  exactMatch: number;
  withBilledArtist: number;
  jointCredits: number;
  withAlbum: number;
  withSingle: number;
  /** Songs read through their title alone. */
  byTitle: number;
  /** Matched songs whose title is credited more often to someone unbilled. */
  topCreditElsewhere: number;
  yearsFromMusicBrainz: number;
  /** Distinct artist names the songs are billed to. */
  songArtistNames: number;
  songArtistNamesWithId: number;
  songArtistNamesWithSeveralIds: number;
  songsOutsideRegistry: number;
  registryArtists: number;
  registryArtistsWithSongs: number;
  registryArtistsWithId: number;
  registryArtistsWithSeveralIds: number;
  /** Registry artists whose best song-billed id is on no official release. */
  registryArtistsWeak: number;
}

export interface CacheStageResult {
  counts: CacheStageCounts;
  songs: SongCacheRow[];
  /** Registry artists with at least one library song, in registry order. */
  artists: ArtistCacheRow[];
}

// ── Extraction ───────────────────────────────────────────────────────────

const creditText = (credits: readonly MbArtistCredit[]) =>
  credits.map((c) => `${c.name}${c.joinphrase ?? ''}`).join('');

/**
 * Which of a credit's artists are ours: the artist's own name, or one of its
 * aliases, equal to a name ours goes by. Not the name it is credited AS on
 * this recording — karaoke labels credit themselves "as" the original act.
 */
function billedIn(
  credits: readonly MbArtistCredit[],
  names: ReadonlySet<string>,
): { artists: MbArtistRef[]; joint: boolean } {
  const artists = credits
    .filter(({ artist }) =>
      [artist.name, ...(artist.aliases ?? []).map((a) => a.name)].some((name) =>
        names.has(nameKey(name)),
      ),
    )
    .map((c) => c.artist);
  // "Alicia Keys & Justin Timberlake" billed as one act: two artists, and
  // only the credit as a whole is ours.
  const joint =
    artists.length === 0 &&
    credits.length > 1 &&
    names.has(nameKey(creditText(credits)));
  return { artists, joint };
}

/** ISO dates and their prefixes sort as text; undated ones go last. */
const byDate = (a: ReleaseCandidate, b: ReleaseCandidate) =>
  (a.firstDate ?? '9999').localeCompare(b.firstDate ?? '9999') ||
  a.title.localeCompare(b.title);

const earlier = (a: string | undefined, b: string | undefined) =>
  !a ? b : !b ? a : a <= b ? a : b;

/** Nothing but the primary type: no Compilation, Live or Soundtrack. */
const isPlain = (
  group: { 'primary-type'?: string | null; 'secondary-types'?: string[] },
  type: 'Album' | 'Single',
) => group['primary-type'] === type && !group['secondary-types']?.length;

function addCandidate(
  into: Map<string, ReleaseCandidate>,
  id: string,
  title: string,
  date: string | undefined,
) {
  const seen = into.get(id);
  if (seen) seen.firstDate = earlier(seen.firstDate, date || undefined);
  else
    into.set(id, { releaseGroupId: id, title, firstDate: date || undefined });
}

interface Credited {
  artist: MbArtistRef;
  recordings: Set<string>;
}

const credited = ({ artist, recordings }: Credited): CreditedArtist => ({
  mbid: artist.id,
  name: artist.name,
  ...(artist.disambiguation ? { disambiguation: artist.disambiguation } : {}),
  recordings: recordings.size,
});

function readSong(
  song: LibrarySong,
  entry: MbCacheEntry,
  names: ReadonlySet<string>,
) {
  const wanted = titleKey(song.title);
  // Every credit on a recording of this title, ours or not: the yardstick
  // the billed ids are held against.
  const anyone = new Map<string, Credited>();
  const billed = new Map<string, Credited & { onRelease: boolean }>();
  const bill = (artist: MbArtistRef) => {
    const seen = billed.get(artist.id);
    if (seen) return seen;
    const fresh = { artist, recordings: new Set<string>(), onRelease: false };
    billed.set(artist.id, fresh);
    return fresh;
  };
  const albums = new Map<string, ReleaseCandidate>();
  const singles = new Map<string, ReleaseCandidate>();
  let exact = 0;
  let joint = false;
  let firstReleaseDate: string | undefined;

  for (const recording of entry.recordings ?? []) {
    if (titleKey(recording.title) !== wanted) continue;
    for (const { artist } of recording['artist-credit'] ?? []) {
      const seen = anyone.get(artist.id) ?? {
        artist,
        recordings: new Set<string>(),
      };
      seen.recordings.add(recording.id);
      anyone.set(artist.id, seen);
    }
    const credit = billedIn(recording['artist-credit'] ?? [], names);
    if (credit.joint) joint = true;
    if (credit.artists.length === 0) continue;
    exact++;
    for (const artist of credit.artists) {
      bill(artist).recordings.add(recording.id);
    }
    if (isAlternateTake(recording)) continue;
    firstReleaseDate = earlier(
      firstReleaseDate,
      recording['first-release-date'] || undefined,
    );
    const ours = new Set(credit.artists.map((a) => a.id));
    for (const release of recording.releases ?? []) {
      const group = release['release-group'];
      if (!group || release.status !== 'Official') continue;
      // A release without its own credit is credited like the recording; a
      // "Various Artists" compilation fails here even when typed Album.
      const releaseCredit =
        release['artist-credit'] ?? recording['artist-credit'] ?? [];
      const on = releaseCredit.filter((c) => ours.has(c.artist.id));
      if (on.length === 0) continue;
      const album = isPlain(group, 'Album');
      if (album) addCandidate(albums, group.id, group.title, release.date);
      else if (isPlain(group, 'Single'))
        addCandidate(singles, group.id, group.title, release.date);
      else continue;
      for (const c of on) bill(c.artist).onRelease = true;
    }
  }

  // The release-group search looked for the song's own title, so it finds
  // singles (and the odd title track) rather than the albums.
  for (const group of entry.releaseGroups ?? []) {
    if (titleKey(group.title) !== wanted) continue;
    const credit = billedIn(group['artist-credit'] ?? [], names);
    if (credit.artists.length === 0) continue;
    const date = group['first-release-date'];
    const single = isPlain(group, 'Single');
    const album = !single && isPlain(group, 'Album');
    if (single) addCandidate(singles, group.id, group.title, date);
    else if (album) addCandidate(albums, group.id, group.title, date);
    for (const artist of credit.artists) {
      const seen = bill(artist);
      if (single || album) seen.onRelease = true;
    }
  }

  const byEvidence = [...billed.values()].sort(
    (a, b) =>
      Number(b.onRelease) - Number(a.onRelease) ||
      b.recordings.size - a.recordings.size,
  );
  const mostBilled = Math.max(0, ...byEvidence.map((b) => b.recordings.size));
  const [top] = [...anyone.values()].sort(
    (a, b) =>
      b.recordings.size - a.recordings.size ||
      a.artist.id.localeCompare(b.artist.id),
  );
  return {
    exact,
    joint: joint && billed.size === 0,
    billed: byEvidence.map(
      (b): BilledArtist => ({ ...credited(b), onRelease: b.onRelease }),
    ),
    topCredit:
      top && !billed.has(top.artist.id) && top.recordings.size > mostBilled
        ? credited(top)
        : undefined,
    albums: [...albums.values()].sort(byDate),
    singles: [...singles.values()].sort(byDate),
    firstReleaseDate,
  };
}

type SongRead = ReturnType<typeof readSong>;

function statusOf(
  keys: readonly string[],
  byTitle: boolean,
  found: SongRead | null,
): SongCacheRow['status'] {
  if (found && found.exact > 0) return 'matched';
  // Read by title alone, the answers were to other questions: unless one of
  // them credits our artist, nobody ever asked about this song.
  if (!keys.length || (byTitle && !found?.billed.length)) return 'missing';
  return found ? 'unmatched' : 'error';
}

export function extractCacheStage({
  songs,
  registry,
  mbCache,
  yearAudit = [],
}: {
  songs: readonly LibrarySong[];
  registry: readonly RegistryArtist[];
  mbCache: MbCache;
  yearAudit?: readonly YearAuditRow[];
}): CacheStageResult {
  // A song names its artist the way the graph does: its linked lead act
  // when it has one, otherwise the whole billing, slugged, against the
  // registry's slugs and its aliases.
  const bySlug = new Map<string, RegistryArtist>();
  for (const artist of registry) {
    bySlug.set(artist.slug, artist);
    for (const alias of artist.aliases ?? []) {
      if (!bySlug.has(artistSlug(alias))) bySlug.set(artistSlug(alias), artist);
    }
  }
  // The year `accept` wrote. A song whose year has been corrected by hand
  // since no longer carries it, and MusicBrainz agreeing with the new year
  // is real evidence again.
  const auditYears = new Map<string, number>();
  for (const row of yearAudit) {
    if (row.decision === 'accept' && typeof row.year === 'number') {
      auditYears.set(row.slug, row.year);
    }
  }

  // The old keys by title alone, for songs whose artist was spelled
  // differently in May ("marivn gaye", "ccr", "jimmy hendrix") and has been
  // corrected since. Safe, because nothing is read from an answer unless one
  // of its credits names our artist.
  const titleOf = (key: string) => key.slice(key.indexOf('|') + 1);
  const keysByTitle = new Map<string, string[]>();
  for (const key of Object.keys(mbCache)) {
    keysByTitle.set(titleOf(key), [
      ...(keysByTitle.get(titleOf(key)) ?? []),
      key,
    ]);
  }

  const rows: SongCacheRow[] = [];
  for (const song of songs) {
    const linked = song.artistGlobeId?.trim();
    const artist =
      (linked ? bySlug.get(artistSlug(linked)) : undefined) ??
      bySlug.get(artistSlug(song.artist)) ??
      null;
    const names = new Set(
      [song.artist, artist?.name ?? '', ...(artist?.aliases ?? [])]
        .filter(Boolean)
        .map(nameKey),
    );
    const spelled = legacyKeys(song);
    const exactKey = spelled.find((key) => key in mbCache);
    const keys = exactKey
      ? [exactKey]
      : [
          ...new Set(
            spelled.flatMap((key) => keysByTitle.get(titleOf(key)) ?? []),
          ),
        ];
    const byTitle = !exactKey && keys.length > 0;
    const answered = keys.map((key) => mbCache[key]).filter((e) => !e.error);
    const found = answered.length
      ? readSong(
          song,
          {
            recordings: answered.flatMap((e) => e.recordings ?? []),
            releaseGroups: answered.flatMap((e) => e.releaseGroups ?? []),
          },
          names,
        )
      : null;
    // Only the song's own answer says who carries its title: read by title,
    // the answers are other artists' songs of the same name.
    const topCredit = byTitle ? undefined : found?.topCredit;
    rows.push({
      songId: song.id,
      title: song.title,
      artist: song.artist,
      artistSlug: artist?.slug ?? null,
      cacheKeys: keys,
      byTitle,
      status: statusOf(keys, byTitle, found),
      exactRecordings: found?.exact ?? 0,
      billed: found?.billed ?? [],
      ...(topCredit ? { topCredit } : {}),
      jointCredit: found?.joint ?? false,
      albums: found?.albums ?? [],
      singles: found?.singles ?? [],
      ...(found?.firstReleaseDate
        ? { firstReleaseDate: found.firstReleaseDate }
        : {}),
      yearFromMusicBrainz:
        song.year !== undefined && auditYears.get(song.id) === song.year,
    });
  }

  const artists = collectArtists(registry, rows);
  return {
    counts: countRows(rows, artists, registry.length),
    songs: rows,
    artists,
  };
}

function collectArtists(
  registry: readonly RegistryArtist[],
  rows: readonly SongCacheRow[],
): ArtistCacheRow[] {
  const bySlug = new Map<string, SongCacheRow[]>();
  for (const row of rows) {
    if (!row.artistSlug) continue;
    const list = bySlug.get(row.artistSlug) ?? [];
    list.push(row);
    bySlug.set(row.artistSlug, list);
  }
  const out: ArtistCacheRow[] = [];
  for (const artist of registry) {
    const songRows = bySlug.get(artist.slug);
    if (!songRows) continue;
    const candidates = new Map<string, ArtistCandidate>();
    for (const row of songRows) {
      for (const { onRelease, ...billed } of row.billed) {
        const seen = candidates.get(billed.mbid) ?? {
          ...billed,
          recordings: 0,
          songIds: [],
          releaseSongIds: [],
        };
        seen.recordings += billed.recordings;
        seen.songIds.push(row.songId);
        if (onRelease) seen.releaseSongIds.push(row.songId);
        candidates.set(billed.mbid, seen);
      }
    }
    out.push({
      slug: artist.slug,
      name: artist.name,
      songIds: songRows.map((r) => r.songId),
      candidates: [...candidates.values()].sort(
        (a, b) =>
          b.releaseSongIds.length - a.releaseSongIds.length ||
          b.recordings - a.recordings ||
          b.songIds.length - a.songIds.length ||
          a.mbid.localeCompare(b.mbid),
      ),
    });
  }
  return out;
}

function countRows(
  rows: readonly SongCacheRow[],
  artists: readonly ArtistCacheRow[],
  registryArtists: number,
): CacheStageCounts {
  const idsByName = new Map<string, Set<string>>();
  for (const row of rows) {
    const ids = idsByName.get(nameKey(row.artist)) ?? new Set<string>();
    for (const billed of row.billed) ids.add(billed.mbid);
    idsByName.set(nameKey(row.artist), ids);
  }
  const names = [...idsByName.values()];
  const count = (test: (row: SongCacheRow) => boolean) =>
    rows.filter(test).length;
  return {
    songs: rows.length,
    cached: count((r) => r.status !== 'missing'),
    errors: count((r) => r.status === 'error'),
    exactMatch: count((r) => r.exactRecordings > 0),
    withBilledArtist: count((r) => r.billed.length > 0),
    jointCredits: count((r) => r.jointCredit),
    withAlbum: count((r) => r.albums.length > 0),
    withSingle: count((r) => r.singles.length > 0),
    byTitle: count((r) => r.byTitle),
    topCreditElsewhere: count((r) => r.billed.length > 0 && !!r.topCredit),
    yearsFromMusicBrainz: count((r) => r.yearFromMusicBrainz),
    songArtistNames: names.length,
    songArtistNamesWithId: names.filter((ids) => ids.size > 0).length,
    songArtistNamesWithSeveralIds: names.filter((ids) => ids.size > 1).length,
    songsOutsideRegistry: count((r) => r.artistSlug === null),
    registryArtists,
    registryArtistsWithSongs: artists.length,
    registryArtistsWithId: artists.filter((a) => a.candidates.length > 0)
      .length,
    registryArtistsWithSeveralIds: artists.filter(
      (a) => a.candidates.length > 1,
    ).length,
    registryArtistsWeak: artists.filter(
      (a) => a.candidates.length > 0 && isWeakBilling(a),
    ).length,
  };
}
