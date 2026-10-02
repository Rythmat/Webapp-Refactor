import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sameJson, suggestionId } from '@/content/suggestions/keys';
import type {
  RequiredRecord,
  Suggestion,
  SuggestionSource,
} from '@/content/suggestions/types';
import type { MockKind } from '@/features/admin/content/mock/mockKinds';
import { acquireRunLock } from '@/scripts/enrichment/import/runLock';
import type { GitRunner } from '../gitStatus';
import {
  gitHolds,
  type ImportOptions,
  type ImportReport,
  LOCK_FILE,
  parseCliArgs,
  PROTECTED_FILES,
  runImport,
  summaryLines,
} from '../importAll';
import {
  DECISIONS_PATH,
  loadRepoStore,
  REPO_ROOT,
  SUGGESTIONS_DIR,
  writeRepoFiles,
} from '../repoStore';
import { ARTISTS_FILE } from '../sources/artists';
import { fsReader, type ItemChange, sha256 } from '../sources/common';
import { EVENTS_DIR } from '../sources/events';
import { REPO_SOURCES } from '../sources/index';
import { CITIES_FILE, PLACES_FILE } from '../sources/places';
import { RECORD_FILES } from '../sources/records';
import { songFileOf } from '../sources/songs';

/**
 * The bulk import, run for real, on copies of the repo's data files in a
 * temp directory: the repo's own files are never written (the last test
 * checks their hashes). The rows are made up here, as the importer's
 * artifacts would carry them (sources, `unverified`, MusicBrainz links and
 * ids on values and records), onto real items, and the app's planners are
 * left out, so each case knows exactly what is on offer.
 *
 * Each copy holds every file the store's adapters read (asked of the
 * adapters, so the vocabularies are there and a kind added later is too),
 * which is every file the site reads that the import could write.
 */

const MBID = 'afdb7919-059d-43c1-b668-ba1d265e7e42';
const MB: SuggestionSource = {
  provider: 'musicbrainz',
  url: `https://musicbrainz.org/artist/${MBID}`,
  externalId: MBID,
};
const WD: SuggestionSource = {
  provider: 'wikidata',
  url: 'https://www.wikidata.org/wiki/Q189758',
  externalId: 'Q189758',
};
const APP = (label: string): SuggestionSource => ({ provider: 'app', label });

/** What a site-readable file may never say after the import. */
const PROVENANCE =
  /musicbrainz|wikidata|metabrainz|\bmbid\b|externalIds|unverified/i;

const row = (
  kind: string,
  slug: string,
  path: string,
  value: unknown,
  extra: Partial<Suggestion> = {},
): Suggestion => {
  const target = { kind, slug };
  const op = path.endsWith('[]') ? 'add' : 'set';
  return {
    id: suggestionId({ target, path, op, value }),
    target,
    path,
    op,
    value,
    display: `${path} ${JSON.stringify(value)}`,
    sources: [MB],
    evidence: [],
    confidence: 0.9,
    tier: 'sure',
    batch: 'mb-test',
    ...extra,
  };
};

/* ── The rows on offer ── */

const ID = row('artist', 'marvin-gaye', 'externalIds.mbid', MBID);
const ID_WD = row('artist', 'marvin-gaye', 'externalIds.wikidata', 'Q189758', {
  sources: [MB, WD],
  dependsOn: ID.id,
});
const onMarvin = (path: string, value: unknown, extra = {}) =>
  row('artist', 'marvin-gaye', path, value, { dependsOn: ID.id, ...extra });

const TESTVILLE: RequiredRecord = {
  kind: 'globe_city',
  slug: 'testville',
  body: {
    id: 'testville',
    name: 'Testville',
    country: 'US',
    subdivision: '',
    region: 'north-america',
    coordinates: [10.123, -150.456],
    genres: [],
    description: '',
    activeDecades: [],
    pin: false,
    unverified: true,
    source: 'https://www.wikidata.org/wiki/Q1',
  },
};
const JAMERSON: RequiredRecord = {
  kind: 'artist',
  slug: 'james-jamerson-test',
  body: {
    slug: 'james-jamerson-test',
    name: 'James Jamerson',
    externalIds: { mbid: '8f08eb4f-873e-4d63-8271-fa7a5563c2d1' },
    unverified: true,
    source: 'musicbrainz',
  },
};
/** Another person the credits name James Jamerson: a namesake. */
const JAMERSON_TOO: RequiredRecord = {
  kind: 'artist',
  slug: 'james-jamerson-other',
  body: { slug: 'james-jamerson-other', name: 'James Jamerson' },
};
const WGO_ALBUM: RequiredRecord = {
  kind: 'release',
  slug: 'marvin-gaye-whats-going-on-test',
  body: {
    slug: 'marvin-gaye-whats-going-on-test',
    title: 'What’s Going On',
    artistIds: ['marvin-gaye'],
    format: 'album',
    year: 1971,
    externalIds: { mbid: '0e2f3b8a-7a2c-3b4f-9a55-2a0a3f9d7b10' },
    unverified: true,
    source: 'musicbrainz',
  },
};
const BAD_ALBUM: RequiredRecord = {
  kind: 'release',
  slug: 'ed-sheeran--2017',
  body: {
    slug: 'ed-sheeran--2017',
    title: '÷',
    artistIds: ['ed-sheeran'],
    format: 'album',
    year: 2017,
  },
};

const R = {
  bornTieMb: onMarvin('born.date', '1939-04-02', {
    tier: 'likely',
    confidence: 0.84,
  }),
  bornTieWd: onMarvin('born.date', '1939-04-03', {
    tier: 'likely',
    confidence: 0.84,
    sources: [WD],
  }),
  activeWinner: onMarvin('activeFrom', 1961, { sources: [MB, WD] }),
  activeLoser: onMarvin('activeFrom', 1960, {
    tier: 'likely',
    confidence: 0.8,
  }),
  genre: onMarvin('genreIds[]', 'soul', { sources: [WD] }),
  instrument: onMarvin('instrumentIds[]', 'piano', { sources: [WD] }),
  bornPlace: onMarvin('born.placeId', 'testville', {
    sources: [WD],
    requires: [TESTVILLE],
  }),
  pinCity: row('artist', 'marvin-gaye', 'basedInPlaceId', 'detroit', {
    tier: 'likely',
    confidence: 0.7,
    sources: [APP('artist_location "marvin gaye"')],
    batch: 'app-test',
  }),
  stevieId: row('artist', 'stevie-wonder', 'externalIds.mbid', 'mbid-2', {
    tier: 'ambiguous',
  }),
  credit: row(
    'song',
    'whats_going_on',
    'credits[]',
    {
      name: 'James Jamerson',
      role: 'songwriter',
      artistGlobeId: 'james-jamerson-test',
      unverified: true,
      source:
        'https://musicbrainz.org/artist/8f08eb4f-873e-4d63-8271-fa7a5563c2d1',
    },
    { dependsOn: ID.id, requires: [JAMERSON] },
  ),
  namesakeCredit: row(
    'song',
    'lets_get_it_on',
    'credits[]',
    {
      name: 'James Jamerson',
      role: 'producer',
      artistGlobeId: 'james-jamerson-other',
    },
    { dependsOn: ID.id, requires: [JAMERSON_TOO] },
  ),
  year: row('song', 'whats_going_on', 'year', 1971, { dependsOn: ID.id }),
  album: row(
    'song',
    'whats_going_on',
    'releases[]',
    {
      releaseId: 'marvin-gaye-whats-going-on-test',
      track: 1,
      unverified: true,
      source: 'musicbrainz',
    },
    { dependsOn: ID.id, requires: [WGO_ALBUM] },
  ),
  studio: row('song', 'whats_going_on', 'session.studioId', 'hitsville-u-s-a', {
    dependsOn: ID.id,
  }),
  creditedSong: row(
    'song',
    'something',
    'credits[]',
    { name: 'Someone New', role: 'engineer', unverified: true },
    { dependsOn: ID.id },
  ),
  badAlbum: row(
    'song',
    'shape_of_you',
    'releases[]',
    { releaseId: 'ed-sheeran--2017' },
    { requires: [BAD_ALBUM] },
  ),
  hallelujah: row(
    'chord_progression',
    '578',
    'songIds[]',
    'hallelujah_i_love_her_so',
    {
      tier: 'likely',
      confidence: 0.7,
      sources: [APP('chord_progression 578 song')],
      batch: 'app-test',
    },
  ),
  eventArtists: row(
    'globe_event',
    'evt-afrobeat-lagos-1971',
    'artistIds',
    ['fela-kuti'],
    { sources: [APP('evt-afrobeat-lagos-1971 tags')], batch: 'app-test' },
  ),
  // Found by the name in the event's text, which two people now go by.
  eventNamesake: row(
    'globe_event',
    'evt-highlife-accra-1960',
    'artistIds',
    ['james-jamerson-test'],
    { sources: [APP('evt-highlife-accra-1960 tags')], batch: 'app-test' },
  ),
};
const STEVIE_ACTIVE = row('artist', 'stevie-wonder', 'activeFrom', 1961, {
  dependsOn: R.stevieId.id,
});
const LABEL = row(
  'release',
  'marvin-gaye-whats-going-on-test',
  'labelId',
  'tamla',
  {
    requires: [WGO_ALBUM],
    dependsOn: R.album.id,
  },
);
const BAD_LABEL = row('release', 'ed-sheeran--2017', 'labelId', 'tamla', {
  requires: [BAD_ALBUM],
  dependsOn: R.badAlbum.id,
});

const ARTIST_ROWS = [
  ID,
  ID_WD,
  R.bornTieMb,
  R.bornTieWd,
  R.activeWinner,
  R.activeLoser,
  R.genre,
  R.instrument,
  R.bornPlace,
  R.pinCity,
  R.stevieId,
  STEVIE_ACTIVE,
];
const SONG_ROWS = [
  R.credit,
  R.namesakeCredit,
  R.year,
  R.album,
  R.studio,
  R.creditedSong,
  R.badAlbum,
  LABEL,
  BAD_LABEL,
];
const APP_ROWS = [R.hallelujah, R.eventArtists, R.eventNamesake];

/* ── Copies of the repo ── */

/** Every file the store's adapters read that exists, repo-relative. */
async function dataFiles(): Promise<string[]> {
  const reader = fsReader(REPO_ROOT);
  const files = new Set<string>();
  for (const source of REPO_SOURCES)
    for (const path of await source.files(reader))
      if (existsSync(join(REPO_ROOT, path))) files.add(path);
  return [...files].sort();
}

/**
 * The fields each item the rows above are about must not have yet, as the
 * cases assume them: the state before any import. The owner's real run
 * fills these very items (What's Going On gets its credits and its year,
 * Marvin Gaye his record fields), so the base copy is set back to that
 * state, whatever the repo holds now.
 */
const BEFORE_IMPORT: readonly {
  kind: MockKind;
  slug: string;
  drop: readonly string[] | 'record-fields';
}[] = [
  // The roster's own fields stay; everything else is artists.json's.
  { kind: 'artist', slug: 'marvin-gaye', drop: 'record-fields' },
  { kind: 'artist', slug: 'stevie-wonder', drop: 'record-fields' },
  {
    kind: 'song',
    slug: 'whats_going_on',
    drop: ['credits', 'year', 'releases', 'session'],
  },
  { kind: 'song', slug: 'lets_get_it_on', drop: ['credits', 'releases'] },
  { kind: 'song', slug: 'shape_of_you', drop: ['releases'] },
  { kind: 'globe_event', slug: 'evt-afrobeat-lagos-1971', drop: ['artistIds'] },
  { kind: 'globe_event', slug: 'evt-highlife-accra-1960', drop: ['artistIds'] },
];

/**
 * Sets the `BEFORE_IMPORT` items back in a copy, through the store's own
 * planner, read-back check and writer, so the copy stays a repo the store
 * loads. A no-op on a repo no import has run over.
 */
async function resetFixtureItems(root: string): Promise<void> {
  const store = await loadRepoStore({ root });
  const changes: ItemChange[] = [];
  for (const { kind, slug, drop } of BEFORE_IMPORT) {
    const item = store.item(kind, slug);
    if (!item)
      throw new Error(
        `${kind} ${slug} is no longer in the repo; pick another item for these cases`,
      );
    const body =
      drop === 'record-fields'
        ? Object.fromEntries(
            Object.entries(item.body).filter(([key]) =>
              ['slug', 'name', 'aliases'].includes(key),
            ),
          )
        : Object.fromEntries(
            Object.entries(item.body).filter(([key]) => !drop.includes(key)),
          );
    if (!sameJson(body, item.body)) changes.push({ kind, slug, body });
  }
  if (!changes.length) return;
  const plans = await store.plan(changes);
  await store.verify(changes, plans);
  await writeRepoFiles(
    root,
    plans.map(({ path, text }) => ({ path, text })),
  );
}

let base: string;
const copies: string[] = [];
let FILES: string[] = [];
/** The repo's own files as the tests found them. */
const repoHashes = new Map<string, string>();

beforeAll(async () => {
  FILES = await dataFiles();
  base = mkdtempSync(join(tmpdir(), 'repo-import-base-'));
  for (const path of FILES) {
    const target = join(base, path);
    mkdirSync(dirname(target), { recursive: true });
    const bytes = readFileSync(join(REPO_ROOT, path));
    writeFileSync(target, bytes);
    repoHashes.set(path, sha256(bytes));
  }
  await resetFixtureItems(base);
  const artifact = (rows: Suggestion[]) =>
    `${JSON.stringify({ artifactsVersion: 1, batch: 'mb-test', suggestions: rows })}\n`;
  mkdirSync(join(base, SUGGESTIONS_DIR), { recursive: true });
  writeFileSync(
    join(base, SUGGESTIONS_DIR, 'artists.json'),
    artifact(ARTIST_ROWS),
  );
  writeFileSync(
    join(base, SUGGESTIONS_DIR, 'songs.json'),
    artifact([...SONG_ROWS, ...APP_ROWS]),
  );
}, 60_000);

afterAll(() => {
  for (const dir of [base, ...copies])
    if (dir) rmSync(dir, { recursive: true, force: true });
});

/** A fresh copy of the base: every case starts from the repo as it is. */
function freshCopy(): string {
  const root = mkdtempSync(join(tmpdir(), 'repo-import-'));
  cpSync(base, root, { recursive: true });
  copies.push(root);
  return root;
}

/** Every file under a root, with its hash. */
function hashes(root: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      const path = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path);
      else out.set(path, sha256(readFileSync(join(root, path))));
    }
  };
  walk('');
  return out;
}

const changedBetween = (
  before: Map<string, string>,
  after: Map<string, string>,
): string[] =>
  [...new Set([...before.keys(), ...after.keys()])]
    .filter((path) => before.get(path) !== after.get(path))
    .sort();

let clock = 0;
const run = (root: string, options: Partial<ImportOptions> = {}) =>
  runImport({
    dryRun: false,
    root,
    planners: false,
    report: null,
    // A temp copy is no repository; the git tests hand in a git of their own.
    git: false,
    now: () => new Date(Date.UTC(2026, 9, 1) + (clock += 1000)),
    ...options,
  });

const outcomeOf = (report: ImportReport, suggestion: Suggestion) => {
  const found = report.rows[suggestion.id];
  if (!found) return 'not offered';
  if (found.outcome === 'skipped') return found.reason;
  if (found.outcome === 'refused') return `refused ${found.code}`;
  return found.outcome;
};

const read = (root: string, path: string) =>
  readFileSync(join(root, path), 'utf8');
const readJson = (root: string, path: string) =>
  JSON.parse(read(root, path)) as Record<string, unknown>[];

describe('the bulk import on a copy of the repo', () => {
  let root: string;
  let before: Map<string, string>;
  let report: ImportReport;

  beforeAll(async () => {
    root = freshCopy();
    before = hashes(root);
    report = await run(root, { report: 'import-report.json' });
  }, 120_000);

  it('imports what the rules take, and says why it leaves out the rest', () => {
    const outcomes = Object.fromEntries(
      Object.entries({ ID, ID_WD, STEVIE_ACTIVE, LABEL, BAD_LABEL, ...R }).map(
        ([name, suggestion]) => [name, outcomeOf(report, suggestion)],
      ),
    );
    expect(outcomes).toEqual({
      ID: 'identity',
      ID_WD: 'identity',
      STEVIE_ACTIVE: 'rests-on-skipped',
      LABEL: 'imported',
      BAD_LABEL: 'rests-on-skipped',
      bornTieMb: 'sources-disagree',
      bornTieWd: 'sources-disagree',
      activeWinner: 'imported',
      activeLoser: 'lost',
      genre: 'imported',
      instrument: 'imported',
      bornPlace: 'imported',
      pinCity: 'imported',
      stevieId: 'ambiguous',
      credit: 'imported',
      namesakeCredit: 'imported',
      year: 'imported',
      album: 'imported',
      studio: 'imported',
      creditedSong: 'student-visible-filled',
      badAlbum: 'refused REQUIRED_RECORD_INVALID',
      hallelujah: 'known-wrong',
      eventArtists: 'imported',
      eventNamesake: 'ambiguous',
    });
    // The Label row waited for the Album row that makes its release.
    expect(report.rows[LABEL.id]).toMatchObject({ outcome: 'imported' });
    expect(report.rows[LABEL.id].wave).toBeGreaterThan(
      report.rows[R.album.id].wave,
    );
    expect(report.gate).toEqual({
      ok: true,
      protectedFiles: [],
      overwrites: [],
      studentVisible: [],
      sourceMentions: [],
      problems: [],
    });
    expect(report.wrote).toBe(true);
    // What students would see: credits on the uncredited song only (the
    // namesake's too), and the year it lacked.
    expect(
      report.studentVisible.credits.list.map(({ song, credits }) => ({
        song,
        credits,
      })),
    ).toEqual([
      {
        song: 'lets_get_it_on',
        credits: [
          {
            name: 'James Jamerson',
            role: 'producer',
            artistGlobeId: 'james-jamerson-other',
          },
        ],
      },
      {
        song: 'whats_going_on',
        credits: [
          {
            name: 'James Jamerson',
            role: 'songwriter',
            artistGlobeId: 'james-jamerson-test',
          },
        ],
      },
    ]);
    expect(report.studentVisible.years.list).toMatchObject([
      { song: 'whats_going_on', year: 1971, providers: 'musicbrainz' },
    ]);
    expect(report.sourcesDisagree.fields).toBe(1);
    // The design's four entries, then the four the review of 30 September
    // 2026 added (Dock of the Bay's film producers and 1964 album, Eric
    // Clapton's end year); none of those is in this copy's made-up rows.
    expect(report.knownWrongEntries.map((entry) => entry.rows)).toEqual([
      1, 0, 0, 0, 0, 0, 0, 0,
    ]);
    expect(existsSync(join(root, 'import-report.json'))).toBe(true);
  });

  it('writes exactly the planned files, and never a protected one', () => {
    const changed = changedBetween(before, hashes(root));
    expect(changed).toEqual(
      [...report.files.map((file) => file.path), 'import-report.json'].sort(),
    );
    expect(changed).toEqual(
      [
        songFileOf('whats_going_on'),
        songFileOf('lets_get_it_on'),
        `${EVENTS_DIR}/african.ts`,
        ARTISTS_FILE,
        PLACES_FILE,
        RECORD_FILES.release,
        DECISIONS_PATH,
        'import-report.json',
      ].sort(),
    );
    for (const path of PROTECTED_FILES)
      expect(changed, path).not.toContain(path);
  });

  it('writes plain data: no source, no unverified mark, no outside id', () => {
    for (const file of report.files) {
      if (file.path === DECISIONS_PATH) continue;
      const text = read(root, file.path);
      expect(text, file.path).not.toMatch(PROVENANCE);
      if (file.path.endsWith('.json'))
        expect(text, file.path).not.toMatch(/"source"/);
    }
    const song = read(root, songFileOf('whats_going_on'));
    expect(song).toContain('year: 1971,');
    expect(song).not.toMatch(/\bsource:/);
    expect(song).toMatch(
      /credits: \[\s*\{\s*name: 'James Jamerson',\s*role: 'songwriter',\s*artistGlobeId: 'james-jamerson-test',?\s*\},?\s*\]/,
    );
    expect(song).toContain(
      "releases: [{ releaseId: 'marvin-gaye-whats-going-on-test', track: 1 }]",
    );
    // No display text is filled in beside the id: students read that.
    expect(song).toContain("session: { studioId: 'hitsville-u-s-a' }");

    const artists = readJson(root, ARTISTS_FILE);
    expect(artists.find((a) => a.slug === 'marvin-gaye')).toEqual({
      slug: 'marvin-gaye',
      born: { placeId: 'testville' },
      basedInPlaceId: 'detroit',
      activeFrom: 1961,
      genreIds: ['soul'],
      instrumentIds: ['piano'],
    });
    expect(artists.find((a) => a.slug === 'james-jamerson-test')).toEqual({
      slug: 'james-jamerson-test',
      name: 'James Jamerson',
    });
    expect(
      readJson(root, RECORD_FILES.release).find(
        (release) => release.slug === 'marvin-gaye-whats-going-on-test',
      ),
    ).toEqual({
      slug: 'marvin-gaye-whats-going-on-test',
      title: 'What’s Going On',
      artistIds: ['marvin-gaye'],
      format: 'album',
      year: 1971,
      labelId: 'tamla',
    });
    const place = readJson(root, PLACES_FILE).find((p) => p.id === 'testville');
    expect(place).toMatchObject({ name: 'Testville', pin: false });
    expect(place).not.toHaveProperty('source');
    expect(read(root, `${EVENTS_DIR}/african.ts`)).toContain(
      "artistIds: ['fela-kuti']",
    );
  });

  it('leaves no file the site reads naming an outside catalogue', () => {
    // Every data file in the copy, written or not, and the decisions log
    // the console reads. The count may not grow anywhere; the one file
    // that named a catalogue before (a code comment in the roster, which
    // the import never writes) keeps exactly what it had.
    const mentions = (text: string) =>
      (text.match(new RegExp(PROVENANCE.source, 'gi')) ?? []).length;
    const named: string[] = [];
    for (const path of [...FILES, DECISIONS_PATH]) {
      const now = mentions(read(root, path));
      const had = existsSync(join(base, path)) ? mentions(read(base, path)) : 0;
      expect(now, path).toBeLessThanOrEqual(had);
      if (now) named.push(path);
    }
    expect(named.filter((path) => mentions(read(base, path)) === 0)).toEqual(
      [],
    );
  });

  it('logs each value as an import in decisions.json, bare', () => {
    const file = JSON.parse(read(root, DECISIONS_PATH)) as {
      decisions: { method: string; by: string; suggestionId: string }[];
    };
    expect(file.decisions).toHaveLength(report.imported.rows);
    expect(new Set(file.decisions.map((d) => d.method))).toEqual(
      new Set(['import']),
    );
    expect(new Set(file.decisions.map((d) => d.by))).toEqual(
      new Set(['repo-import']),
    );
    expect(read(root, DECISIONS_PATH)).not.toMatch(PROVENANCE);
    expect(read(root, DECISIONS_PATH)).not.toMatch(/"source"/);
  });

  it('writes nothing, and logs nothing, the second time', async () => {
    const between = hashes(root);
    const again = await run(root);
    expect(changedBetween(between, hashes(root))).toEqual([]);
    expect(again.files).toEqual([]);
    expect(again.imported.rows).toBe(0);
    expect(again.decisions.added).toBe(0);
    expect(again.wrote).toBe(false);
    expect(outcomeOf(again, R.credit)).toBe('already');
    expect(outcomeOf(again, R.activeLoser)).toBe('conflict');
  });
});

describe('a dry run', () => {
  it('does all the work in memory and writes only its report', async () => {
    const root = freshCopy();
    const before = hashes(root);
    const report = await run(root, {
      dryRun: true,
      report: 'dry-report.json',
    });
    expect(report.imported.rows).toBeGreaterThan(10);
    expect(report.files.map((file) => file.path)).toContain(
      songFileOf('whats_going_on'),
    );
    expect(report.wrote).toBe(false);
    expect(changedBetween(before, hashes(root))).toEqual(['dry-report.json']);
    // The lock is let go.
    expect(existsSync(join(root, LOCK_FILE))).toBe(false);
  });

  it('holds back what students read, when asked', async () => {
    const report = await run(freshCopy(), {
      dryRun: true,
      holdStudentVisible: true,
    });
    expect(outcomeOf(report, R.credit)).toBe('held');
    expect(outcomeOf(report, R.year)).toBe('held');
    expect(outcomeOf(report, R.album)).toBe('imported');
    expect(report.studentVisible.credits.songs).toBe(0);
    expect(report.studentVisible.years.songs).toBe(0);
    expect(report.gate.ok).toBe(true);
  });

  it('takes one group when asked, and passes over the others', async () => {
    const report = await run(freshCopy(), {
      dryRun: true,
      only: new Set(['artists'] as const),
    });
    expect(outcomeOf(report, R.genre)).toBe('imported');
    expect(outcomeOf(report, R.credit)).toBe('out-of-scope');
    expect(outcomeOf(report, R.eventArtists)).toBe('out-of-scope');
    expect(report.only).toEqual(['artists']);
    expect(report.files.map((file) => file.path).sort()).toEqual(
      [ARTISTS_FILE, PLACES_FILE, DECISIONS_PATH].sort(),
    );
  });
});

describe('the gate', () => {
  it('stops a real run that would pin a new place, writing only the report', async () => {
    const root = freshCopy();
    // A place a row needs, with no `pin: false`: made as a city the globe
    // pins, into cities.ts.
    const pinned: RequiredRecord = {
      kind: 'globe_city',
      slug: 'pinville',
      body: {
        id: 'pinville',
        name: 'Pinville',
        country: 'US',
        subdivision: '',
        region: 'north-america',
        coordinates: [-20.5, 120.25],
        genres: [],
        description: '',
        activeDecades: [],
      },
    };
    const born = row('artist', 'marvin-gaye', 'born.placeId', 'pinville', {
      requires: [pinned],
    });
    writeFileSync(
      join(root, SUGGESTIONS_DIR, 'artists.json'),
      JSON.stringify({ artifactsVersion: 1, suggestions: [born] }),
    );
    rmSync(join(root, SUGGESTIONS_DIR, 'songs.json'));
    const before = hashes(root);
    await expect(run(root, { report: 'gate-report.json' })).rejects.toThrow(
      /the gate refused the plan, so no data file was written/,
    );
    expect(changedBetween(before, hashes(root))).toEqual(['gate-report.json']);
    const report = JSON.parse(read(root, 'gate-report.json')) as ImportReport;
    expect(report.gate.ok).toBe(false);
    expect(report.gate.protectedFiles).toEqual([CITIES_FILE]);
    expect(report.gate.studentVisible).toEqual([
      {
        item: 'globe_city:pinville',
        problems: ['a new place the globe would pin (pin is not false)'],
      },
    ]);
    expect(report.wrote).toBe(false);
  });

  it('stops a real run that would name an outside catalogue, writing only the report', async () => {
    const root = freshCopy();
    // The stripping takes out `source`, `unverified` and `externalIds`; a
    // description quoting a catalogue is text it does not know to take out.
    const quoting: RequiredRecord = {
      kind: 'globe_city',
      slug: 'quoteville',
      body: {
        ...(TESTVILLE.body as Record<string, unknown>),
        id: 'quoteville',
        name: 'Quoteville',
        coordinates: [11.5, -151.5],
        description: 'A town, as MusicBrainz lists it',
      },
    };
    const born = row('artist', 'marvin-gaye', 'born.placeId', 'quoteville', {
      requires: [quoting],
    });
    writeFileSync(
      join(root, SUGGESTIONS_DIR, 'artists.json'),
      JSON.stringify({ artifactsVersion: 1, suggestions: [born] }),
    );
    rmSync(join(root, SUGGESTIONS_DIR, 'songs.json'));
    const before = hashes(root);
    await expect(run(root, { report: 'gate-report.json' })).rejects.toThrow(
      /the gate refused the plan, so no data file was written: .*would name an outside catalogue/,
    );
    expect(changedBetween(before, hashes(root))).toEqual(['gate-report.json']);
    const report = JSON.parse(read(root, 'gate-report.json')) as ImportReport;
    expect(report.gate.ok).toBe(false);
    // The place file, and the decisions log that records the place it made.
    expect(report.gate.sourceMentions).toEqual([
      { path: PLACES_FILE, added: 1, examples: ['MusicBrainz'] },
      { path: DECISIONS_PATH, added: 1, examples: ['MusicBrainz'] },
    ]);
    expect(report.gate.protectedFiles).toEqual([]);
    expect(report.wrote).toBe(false);
  });
});

describe('the run', () => {
  it('refuses a root that is not a copy of the repo, and makes nothing there', async () => {
    const root = join(tmpdir(), `repo-import-missing-${process.pid}`);
    await expect(run(root, { dryRun: true })).rejects.toThrow(
      /is not a copy of the repo/,
    );
    expect(existsSync(root)).toBe(false);
  });

  it('refuses to start beside another import on the same copy', async () => {
    const root = freshCopy();
    const held = acquireRunLock(join(root, LOCK_FILE));
    try {
      await expect(run(root, { dryRun: true })).rejects.toThrow(
        /another bulk import is running/,
      );
    } finally {
      held.release();
    }
  });

  it('refuses a real run over files git does not hold, unless asked not to', async () => {
    const root = freshCopy();
    const dry = await run(root, { dryRun: true });
    const over = dry.files.find((file) => file.bytesBefore !== null)!.path;
    const made = dry.files.find((file) => file.bytesBefore === null)?.path;
    // A git that says one file the run writes over has changed since the
    // last commit, and (when the run makes one) that a new file is untracked.
    const asked: string[][] = [];
    const git: GitRunner = async (args) => {
      asked.push([...args]);
      if (args[0] !== 'status') return 'main\n';
      return [` M ${over}`, ...(made ? [`?? ${made}`] : [])]
        .map((entry) => `${entry}\0`)
        .join('');
    };
    expect(dry.git).toEqual({
      answered: false,
      error: 'git is off',
      uncommitted: [],
    });

    // A dry run says so, and writes nothing but its report.
    const told = await run(root, { dryRun: true, git });
    expect(told.git).toEqual({
      answered: true,
      error: null,
      uncommitted: [{ path: over, code: ' M' }],
    });
    // Only files that exist are asked about: a file the run makes is taken
    // away again with git clean.
    const status = asked.find((args) => args[0] === 'status')!;
    if (made) expect(status).not.toContain(made);
    expect(summaryLines(told).join('\n')).toMatch(
      /Git: 1 of the files it would write over are not committed/,
    );

    const before = hashes(root);
    await expect(run(root, { git, report: 'git-report.json' })).rejects.toThrow(
      /git does not hold 1 of the files this run would write over .*commit them first, or pass --allow-uncommitted/,
    );
    expect(changedBetween(before, hashes(root))).toEqual(['git-report.json']);

    const wrote = await run(root, { git, allowUncommitted: true });
    expect(wrote.wrote).toBe(true);
    expect(changedBetween(before, hashes(root))).toContain(over);
  }, 120_000);

  it('asks git nothing when it would write over no file', async () => {
    const git: GitRunner = async () => {
      throw new Error('not asked');
    };
    expect(
      await gitHolds('/nowhere', [{ path: 'a.json', baseSha256: null }], git),
    ).toEqual({ answered: true, error: null, uncommitted: [] });
    expect(
      await gitHolds(
        '/nowhere',
        [{ path: 'a.json', baseSha256: 'x' }],
        async () => {
          throw new Error('fatal: not a git repository');
        },
      ),
    ).toEqual({
      answered: false,
      error: 'fatal: not a git repository',
      uncommitted: [],
    });
  });

  it('reads its command line', () => {
    expect(
      parseCliArgs([
        '--dry-run',
        '--only=artists,songs',
        '--hold-student-visible',
      ]),
    ).toEqual({
      dryRun: true,
      only: new Set(['artists', 'songs']),
      holdStudentVisible: true,
      allowUncommitted: false,
      report: null,
      help: false,
    });
    expect(parseCliArgs(['--allow-uncommitted']).allowUncommitted).toBe(true);
    expect(parseCliArgs([]).dryRun).toBe(false);
    expect(() => parseCliArgs(['--only', 'places'])).toThrow(/places/);
    expect(() => parseCliArgs(['--force'])).toThrow(/unknown argument/);
  });

  it('never wrote the repo’s own files', () => {
    for (const [path, hash] of repoHashes)
      expect(sha256(readFileSync(join(REPO_ROOT, path))), path).toBe(hash);
  });
});
