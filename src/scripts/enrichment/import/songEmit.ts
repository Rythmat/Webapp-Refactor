import {
  type ArtifactFile,
  ARTIFACTS_VERSION,
  rowsJson,
  type SuggestionsManifest,
} from './emit';
import { sha256 } from './fileCache';
import { ledgerJson } from './recordSlugs';
import type {
  BuiltSongSuggestions,
  SongCounts,
  SongUnmapped,
} from './songSuggestions';

/**
 * The song half's committed artifacts (`src/scripts/enrichment/suggestions/`),
 * beside the artist half's, in the same form — one row per line, no
 * timestamps, so the same cache emits the same bytes:
 *
 *  - `songs.json` — the suggestion rows: Album, Studio, Credits and Year on
 *    songs, and Label on the releases the Album rows create;
 *  - `matches.json` — every library song and the recording, work and album
 *    it was matched to (or why not): the review's account, and the
 *    backend's song ↔ MusicBrainz table, kept off the song bodies;
 *  - `releases.json`, `labels.json`, `studios.json` — the records the rows
 *    need made, each once, with the rows that need it;
 *  - `artists-created.json` — the people the credits need made (C30: billed
 *    performers, members of the song's group, songwriters, producers), each
 *    once; every row that needs one also carries it in its `requires`, so a
 *    row is complete on its own and this file is the list to review;
 *  - `record-places.json` — the `pin: false` towns labels and studios are in
 *    that are neither one of our cities nor a place the artist half makes;
 *  - `record-slugs.json` — the ledger of every slug handed to a release,
 *    label, studio or person, by MusicBrainz id: `emit` reads it and only
 *    adds to it, so a record keeps its slug — and its rows their ids — on
 *    every later import (`recordSlugs.ts`).
 *
 * `manifest.json` gains these files' hashes and a `songs` part (counts per
 * tier and field, what was not mapped). The artist half's files, and its
 * part of the manifest, are written exactly as before: the song half never
 * changes a byte of `artists.json` or `places.json`.
 */

export const SONG_ARTIFACT_FILES = {
  songs: 'songs.json',
  matches: 'matches.json',
  releases: 'releases.json',
  labels: 'labels.json',
  studios: 'studios.json',
  artists: 'artists-created.json',
  places: 'record-places.json',
  ledger: 'record-slugs.json',
} as const;

const WHAT: Record<keyof typeof SONG_ARTIFACT_FILES, string> = {
  songs:
    'Suggestion rows for songs (Album, Studio, Credits, Year) and for the releases they create (Label), one per line.',
  matches:
    'Every library song and the MusicBrainz recording, work and album it was matched to, or why not.',
  releases:
    'Release records the Album rows need made, with the rows that need each.',
  labels:
    'Label records the Label rows need made, with the rows that need each.',
  studios:
    'Studio records the Studio rows need made, with the rows that need each.',
  artists:
    'Artist records the credits need made (C30: billed, members, songwriters, producers), created unverified with their MBID.',
  places:
    'pin:false towns the labels and studios need made, beyond our cities and the artist half’s places.',
  ledger:
    'The slug each release, label, studio and person was given, by MusicBrainz id: read by emit and only added to.',
};

/** The manifest's account of the song half. */
export interface SongManifestPart {
  batch: string;
  description: string;
  counts: SongCounts;
  unmapped: SongUnmapped;
  /** The songs whose year was looked for again: no year, and a miss or a placeholder. */
  requery: number;
  /**
   * Whether the song rows' sure tier has been measured. No song calibration
   * exists yet, so song rows are never bulk-accepted: their batch is not the
   * artist half's, which is the one `calibrated` speaks for.
   */
  calibrated: false;
}

export interface EmittedSongArtifacts {
  files: Record<string, string>;
  entries: ArtifactFile[];
  part: SongManifestPart;
}

export function emitSongArtifacts(
  built: BuiltSongSuggestions,
  batch: string,
  requery: number,
): EmittedSongArtifacts {
  const head = { artifactsVersion: ARTIFACTS_VERSION, batch };
  const texts: Record<keyof typeof SONG_ARTIFACT_FILES, string> = {
    songs: rowsJson(head, 'suggestions', built.suggestions),
    matches: rowsJson(head, 'matches', built.matches),
    releases: rowsJson(head, 'releases', built.releases),
    labels: rowsJson(head, 'labels', built.labels),
    studios: rowsJson(head, 'studios', built.studios),
    artists: rowsJson(head, 'artists', built.artists),
    places: rowsJson(head, 'places', built.places),
    ledger: ledgerJson(built.ledger, ARTIFACTS_VERSION),
  };
  const files: Record<string, string> = {};
  const entries: ArtifactFile[] = [];
  for (const key of Object.keys(
    SONG_ARTIFACT_FILES,
  ) as (keyof typeof SONG_ARTIFACT_FILES)[]) {
    const file = SONG_ARTIFACT_FILES[key];
    files[file] = texts[key];
    entries.push({
      file,
      sha256: sha256(texts[key]),
      bytes: Buffer.byteLength(texts[key]),
      what: WHAT[key],
    });
  }
  return {
    files,
    entries,
    part: {
      batch,
      description:
        'MusicBrainz suggestions for songs and the records they need, written by ' +
        'importSuggestions.ts (emit). Every song row rests on its lead act’s identity row ' +
        '(dependsOn) and a Label row on its release’s Album row.',
      counts: built.counts,
      unmapped: {
        roles: built.unmapped.roles.slice(0, 25),
        instruments: built.unmapped.instruments.slice(0, 25),
        places: built.unmapped.places.slice(0, 25),
        namesakes: built.unmapped.namesakes.slice(0, 25),
        years: built.unmapped.years,
      },
      requery,
      calibrated: false,
    },
  };
}

const SONG_FILES: ReadonlySet<string> = new Set(
  Object.values(SONG_ARTIFACT_FILES),
);

/**
 * The manifest with the song half's files and part: fresh ones, or — when
 * only the artist half was emitted — the ones the manifest on disk already
 * had. The artist half's entries come first and are left as they are.
 */
export function withSongs(
  manifest: SuggestionsManifest,
  songs: Pick<EmittedSongArtifacts, 'entries' | 'part'> | null,
  previous?: SuggestionsManifest | null,
): SuggestionsManifest {
  const artistFiles = manifest.files.filter((f) => !SONG_FILES.has(f.file));
  const entries =
    songs?.entries ??
    previous?.files.filter((f) => SONG_FILES.has(f.file)) ??
    [];
  const part = songs?.part ?? previous?.songs;
  const out: SuggestionsManifest = {
    ...manifest,
    files: [...artistFiles, ...entries],
  };
  delete out.songs;
  if (part) out.songs = part;
  return out;
}

/**
 * The rows of a `songs.json` that rest on a row neither it nor the new
 * artist half has (`dependsOn` an identity row `artists.json` no longer
 * has): kept on disk beside that `artists.json`, they could never be
 * accepted. The song half left out keeps its files only while this is 0.
 */
export function strandedSongRows(
  songsText: string,
  artistRowIds: ReadonlySet<string>,
): number {
  const rows =
    (
      JSON.parse(songsText) as {
        suggestions?: { id: string; dependsOn?: string }[];
      }
    ).suggestions ?? [];
  const own = new Set(rows.map((r) => r.id));
  return rows.filter(
    (r) =>
      !!r.dependsOn && !own.has(r.dependsOn) && !artistRowIds.has(r.dependsOn),
  ).length;
}

/** The manifest as `emit` writes it. */
export const manifestJson = (manifest: SuggestionsManifest): string =>
  `${JSON.stringify(manifest, null, 2)}\n`;
