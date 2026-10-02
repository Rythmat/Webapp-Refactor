import type { Suggestion } from '@/content/suggestions/types';
import type {
  BuiltSuggestions,
  PlaceArtifact,
  SuggestionCounts,
  Unmapped,
} from './buildSuggestions';
import { type CacheManifest, sha256 } from './fileCache';
import { AMBIGUOUS_WITHIN, LIKELY, SURE, WEIGHTS } from './scoreIdentity';
import type { SongManifestPart } from './songEmit';

/**
 * The committed artifacts (`src/scripts/enrichment/suggestions/`):
 *
 *  - `artists.json` — the suggestion rows for artists, one per line so a
 *    re-import reads as a diff of the rows that changed;
 *  - `places.json` — the `pin: false` places those rows need created first,
 *    each with the rows that need it;
 *  - `manifest.json` — what they are: the version of their shape, each
 *    file's hash, the counts per tier and field, and what they were scored
 *    from (the cache's digest and the local-only inputs' hashes, which are
 *    gitignored and so stand in for the inputs themselves). `calibrated`
 *    stays false, and `measuredPrecision` null, until the owner's labelled
 *    sample measures the sure tier at 98% or better (`calibrate`).
 *
 * The rows carry no timestamps, so the same cache emits the same bytes.
 */

/** Bumped whenever the artifacts' shape changes, as the contract's is. */
export const ARTIFACTS_VERSION = 1;

export const ARTIFACT_FILES = {
  artists: 'artists.json',
  places: 'places.json',
  manifest: 'manifest.json',
} as const;

/** Sure-tier precision the owner's labels must show before bulk is trusted. */
export const PRECISION_BAR = 0.98;

/** `{ … "key": [\n row,\n row\n] }`: one row per line. */
export function rowsJson(
  head: Record<string, unknown>,
  key: string,
  rows: unknown[],
) {
  const top = Object.entries(head)
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
    .join('\n');
  const body = rows.map((row) => `    ${JSON.stringify(row)}`).join(',\n');
  return `{\n${top}\n  ${JSON.stringify(key)}: [${rows.length ? `\n${body}\n  ` : ''}]\n}\n`;
}

export const artistsJson = (batch: string, suggestions: Suggestion[]) =>
  rowsJson(
    { artifactsVersion: ARTIFACTS_VERSION, batch },
    'suggestions',
    suggestions,
  );

export const placesJson = (batch: string, places: PlaceArtifact[]) =>
  rowsJson({ artifactsVersion: ARTIFACTS_VERSION, batch }, 'places', places);

export interface ArtifactFile {
  file: string;
  sha256: string;
  bytes: number;
  what: string;
}

export interface SuggestionsManifest {
  artifactsVersion: number;
  description: string;
  batch: string;
  generatedAt: string;
  files: ArtifactFile[];
  counts: SuggestionCounts & { registryArtists: number };
  /** What the sources said that maps to nothing of ours, most frequent first. */
  unmapped: Unmapped;
  /** MusicBrainz ids picked for more than one of our artists. */
  sharedPicks: string[];
  /** The per-URL cache the rows were scored from. */
  cache: {
    digest: string;
    responses: number;
    byHost: Record<string, number>;
  };
  /** The gitignored local inputs, by content. */
  inputs: Record<string, { sha256: string; bytes: number }>;
  /** The cache stage's fingerprint (registry, songs, its code, the inputs). */
  stageFingerprint: string | null;
  scoring: {
    weights: typeof WEIGHTS;
    sure: number;
    likely: number;
    ambiguousWithin: number;
  };
  calibrated: boolean;
  measuredPrecision: number | null;
  /** How the precision was measured, once it has been. */
  calibration?: {
    file: string;
    labelled: number;
    sureLabelled: number;
    sureCorrect: number;
    /** Per stratum of the sample (`calibrate.ts`): its size in the scoring, and the verdicts. */
    strata?: Record<
      string,
      { population: number; correct: number; wrong: number }
    >;
    measuredAt: string;
  };
  /** The song half (F2): its files are listed in `files` after the artist half's. */
  songs?: SongManifestPart;
}

const fileEntry = (file: string, text: string, what: string): ArtifactFile => ({
  file,
  sha256: sha256(text),
  bytes: Buffer.byteLength(text),
  what,
});

export interface EmitInput {
  built: BuiltSuggestions;
  batch: string;
  registryArtists: number;
  cache: SuggestionsManifest['cache'];
  inputs: SuggestionsManifest['inputs'];
  stageFingerprint: string | null;
  /** The manifest now on disk: its calibration carries over while the rows are unchanged. */
  previous?: SuggestionsManifest | null;
  now?: () => Date;
}

export interface EmittedArtifacts {
  files: Record<string, string>;
  manifest: SuggestionsManifest;
}

export function emitArtifacts(input: EmitInput): EmittedArtifacts {
  const { built, batch } = input;
  const artists = artistsJson(batch, built.suggestions);
  const places = placesJson(batch, built.places);
  const files = [
    fileEntry(
      ARTIFACT_FILES.artists,
      artists,
      'Suggestion rows for artists (identity, Born, City, Years Active, Genres, Instruments), one per line.',
    ),
    fileEntry(
      ARTIFACT_FILES.places,
      places,
      'pin:false places the artist rows need created first, with the rows that need each.',
    ),
  ];
  // Calibration measures these exact rows: it carries over only while the
  // rows hash the same, and a re-score that changes them must be measured again.
  const previous = input.previous;
  const sameRows =
    !!previous &&
    previous.files.find((f) => f.file === ARTIFACT_FILES.artists)?.sha256 ===
      files[0].sha256;
  const manifest: SuggestionsManifest = {
    artifactsVersion: ARTIFACTS_VERSION,
    description:
      'MusicBrainz and Wikidata suggestions for the console Table, written by ' +
      'src/scripts/enrichment/importSuggestions.ts (emit). Rows are suggestions, never edits: ' +
      'the owner accepts them one at a time, or in bulk (sure tier only, once calibrated).',
    batch,
    generatedAt: (input.now ?? (() => new Date()))().toISOString(),
    files,
    counts: { ...built.counts, registryArtists: input.registryArtists },
    unmapped: {
      genres: built.unmapped.genres.slice(0, 25),
      instruments: built.unmapped.instruments.slice(0, 25),
      places: built.unmapped.places.slice(0, 25),
      residences: built.unmapped.residences.slice(0, 25),
    },
    sharedPicks: built.shared,
    cache: input.cache,
    inputs: input.inputs,
    stageFingerprint: input.stageFingerprint,
    scoring: {
      weights: WEIGHTS,
      sure: SURE,
      likely: LIKELY,
      ambiguousWithin: AMBIGUOUS_WITHIN,
    },
    calibrated: sameRows ? previous.calibrated : false,
    measuredPrecision: sameRows ? previous.measuredPrecision : null,
    ...(sameRows && previous.calibration
      ? { calibration: previous.calibration }
      : {}),
  };
  return {
    files: {
      [ARTIFACT_FILES.artists]: artists,
      [ARTIFACT_FILES.places]: places,
      [ARTIFACT_FILES.manifest]: `${JSON.stringify(manifest, null, 2)}\n`,
    },
    manifest,
  };
}

/**
 * The run a suggestion batch names: the day of the newest answer scoring
 * read — MusicBrainz and Query Service answers about our artists. Not the
 * newest answer anywhere in the cache: F2's song requests would then rename
 * every artist row, rewrite `artists.json` whole and void its calibration.
 * (Wikidata answers are read through the entities in hand, not by URL, and
 * do not move the batch.)
 */
export function batchOf(
  manifest: Pick<CacheManifest, 'responses'>,
  read: ReadonlySet<string>,
): string {
  const newest = manifest.responses.entries.reduce(
    (latest, e) =>
      read.has(e.url) && e.fetchedAt > latest ? e.fetchedAt : latest,
    '',
  );
  return newest ? `mb-${newest.slice(0, 10)}` : 'mb-unfetched';
}
