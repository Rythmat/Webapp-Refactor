import { generateBodySchema, type TypeSource } from './generateSongSchema';

/**
 * The record kinds' body schemas — artist, release, studio, label, the place
 * body `globe_city` takes on, and the event body `globe_event` takes on (v2) —
 * generated from src/content/records/types.ts the same way the song schema is
 * generated from songLibrary.ts, and for the same reason: a second, hand-kept
 * copy of a shape drifts.
 *
 * `PlaceRecord` extends the globe's `City` and `GlobeEventRecord` its
 * `HistoricalEvent`, so the globe's type file is read too; a `song-` event
 * carries its song's credits, so `Credit` comes from songLibrary.ts, as the
 * latest song level has it.
 */

/** In dependency order: a type before anything that refers to it. */
const WANTED = [
  'RegionId',
  'City',
  'EventLocation',
  'HistoricalEvent',
  'CreditRole',
  'Credit',
  'ExternalIds',
  'ArtistMember',
  'ArtistInfluence',
  'ArtistBirth',
  'ArtistRecord',
  'ReleaseFormat',
  'ReleaseRecord',
  'StudioRecord',
  'LabelRecord',
  'PlaceRecord',
  'GlobeEventRecord',
] as const;

const header =
  () => `// ─────────────────────────────────────────────────────────────────────────
//  GENERATED — do not edit.
//
//  \`npx vitest run src/scripts/apiContract/__tests__/recordBodySchemas.test.ts\`
//  regenerates this from src/content/records/types.ts (with the globe's City
//  and HistoricalEvent from src/components/atlas/types/index.ts, and Credit
//  from src/curriculum/types/songLibrary.ts) and fails if what is committed
//  here has drifted from them. Set WRITE_CONTRACT=1 to rewrite it.
//
//  These are the bodies the content API must accept on
//  \`PUT /api/admin/content/items\` for the record kinds and \`globe_event\`,
//  keyed by kind in \`recordBodySchemas\` below. See
//  docs/console-content-api-contract.md.
// ─────────────────────────────────────────────────────────────────────────
import { z } from 'zod';`;

const footer =
  () => `/** What each record kind's body must satisfy, keyed by content kind. */
export const recordBodySchemas = {
  artist: artistRecordSchema,
  release: releaseRecordSchema,
  studio: studioRecordSchema,
  label: labelRecordSchema,
  globe_city: placeRecordSchema,
  globe_event: globeEventRecordSchema,
} as const;

export type RecordKind = keyof typeof recordBodySchemas;`;

/** The record schema file, as text. */
export function generateRecordSchema(sources: {
  records: TypeSource;
  atlas: TypeSource;
  songs: TypeSource;
}): string {
  return generateBodySchema({
    sources: [sources.atlas, sources.songs, sources.records],
    wanted: WANTED,
    header: header(),
    footer: footer(),
  });
}
