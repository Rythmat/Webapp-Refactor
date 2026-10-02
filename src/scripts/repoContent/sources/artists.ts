import {
  type ArtistRow,
  composeArtists,
  type RosterArtist,
  splitArtist,
} from '@/content/records/compose';
import type { ArtistRecord } from '@/content/records/types';
import type { Body } from '@/features/admin/content/mock/mockKinds';
import { JSON_LINES_LAYOUTS } from '../jsonLines';
import { ARTIST_REGISTRY_DECLARATION } from '../literal';
import { TS_FILE_KINDS, writeTsElements } from '../tsWrite';
import {
  badChange,
  checkIdentity,
  declarationValue,
  type FilePlan,
  type ItemChange,
  itemKey,
  jsonLinesRecords,
  jsonLinesText,
  loadFailed,
  newest,
  oneChangePerItem,
  type PlanContext,
  type PlanOptions,
  planFor,
  readJsonLinesFile,
  type RepoItem,
  type RepoReader,
  type RepoSource,
  slugPattern,
  unwritable,
} from './common';

/**
 * Artists: the globe roster, and everything else in `artists.json` (design
 * C.1).
 *
 *  - `src/components/atlas/data/artistRegistry.ts` (`ARTIST_REGISTRY`) is
 *    the globe's roster: a roster artist's slug, name and aliases, which
 *    students see through the globe's artist matcher and chips. It is
 *    edited surgically, as an element found by its slug.
 *  - `src/content/data/artists.json`, one record per line, holds every
 *    other field of a roster artist (born, genres, members, ids in other
 *    catalogues) as a row with its slug, and every artist off the roster
 *    whole. No student module reads it. It starts out empty (`[]`); if it
 *    has gone missing, it reads as no rows.
 *
 * `composeArtists` and `splitArtist` (`src/content/records/compose.ts`) make
 * one artist out of the two and split one back, so a save sends each field
 * to its file: a roster artist's new `born` lands in artists.json and leaves
 * the registry untouched, and a renamed one changes one registry line.
 *
 * A new artist starts off the roster, so the import's 1,021 artists never
 * reach students. `roster` on a change moves an artist on to it (its name
 * and aliases go to the registry, appended) or off it (the whole artist to
 * its row), which is what `POST /repo/roster` does.
 */

export const REGISTRY_FILE = 'src/components/atlas/data/artistRegistry.ts';
export const ARTISTS_FILE = 'src/content/data/artists.json';

const ARTIST_SLUG = slugPattern('artist');
const LAYOUT = JSON_LINES_LAYOUTS.artist;

async function load(reader: RepoReader) {
  const registry = await reader.read(REGISTRY_FILE);
  if (!registry) {
    throw loadFailed(REGISTRY_FILE, new Error('the file is missing'));
  }
  let roster: RosterArtist[];
  try {
    roster = declarationValue(
      registry,
      ARTIST_REGISTRY_DECLARATION,
    ) as unknown as RosterArtist[];
  } catch (error) {
    throw loadFailed(REGISTRY_FILE, error);
  }
  const rows = await readJsonLinesFile(reader, ARTISTS_FILE, LAYOUT);
  let artists: ArtistRecord[];
  try {
    artists = composeArtists(roster, rows.records as unknown as ArtistRow[]);
  } catch (error) {
    throw loadFailed(ARTISTS_FILE, error);
  }
  const onRoster = new Set(roster.map((entry) => entry.slug));
  const withRow = new Set(rows.records.map((row) => String(row.slug)));
  const items: RepoItem[] = artists.map((artist) => {
    const files = onRoster.has(artist.slug)
      ? [
          registry,
          ...(withRow.has(artist.slug) && rows.file ? [rows.file] : []),
        ]
      : [rows.file!];
    return {
      kind: 'artist',
      slug: artist.slug,
      body: artist as unknown as Body,
      status: 'published',
      updatedAt: newest(files.map((file) => file.mtime)),
      file: files[0].path,
      sha256: files[0].sha256,
      files: files.map((file) => file.path),
    };
  });
  return {
    items,
    files: rows.file ? [registry, rows.file] : [registry],
    missing: rows.file ? [] : [ARTISTS_FILE],
    warnings: rows.warnings,
  };
}

async function plan(
  changes: readonly ItemChange[],
  context: PlanContext,
  options: PlanOptions = {},
): Promise<FilePlan[]> {
  oneChangePerItem(changes);
  const upsert: RosterArtist[] = [];
  const remove: string[] = [];
  const registryItems: string[] = [];
  const rowItems: string[] = [];
  const artistsFile = context.file(ARTISTS_FILE);
  // The rows as the loaded file has them, by slug.
  const rows = new Map(
    jsonLinesRecords(ARTISTS_FILE, artistsFile, LAYOUT).records.map((row) => [
      String(row.slug),
      row,
    ]),
  );

  for (const change of changes) {
    checkIdentity(change, 'slug', ARTIST_SLUG);
    const key = itemKey('artist', change.slug);
    const existing = context.item('artist', change.slug);
    if (!existing && change.body === null) {
      throw badChange(change, 'there is no such artist');
    }
    const wasOn = existing?.file === REGISTRY_FILE;
    const on = change.body !== null && (change.roster ?? wasOn);
    if (wasOn || on) registryItems.push(key);
    rowItems.push(key);

    if (change.body === null) {
      if (wasOn) remove.push(change.slug);
      rows.delete(change.slug);
      continue;
    }
    const split = splitArtist(change.body as unknown as ArtistRecord, on);
    if (split.roster) upsert.push(split.roster);
    else if (wasOn) remove.push(change.slug);
    if (split.row) {
      rows.set(change.slug, split.row as unknown as Record<string, unknown>);
    } else rows.delete(change.slug);
  }

  const plans: FilePlan[] = [];
  if (registryItems.length) {
    const registry = context.file(REGISTRY_FILE);
    if (!registry) {
      throw loadFailed(REGISTRY_FILE, new Error('the file is missing'));
    }
    try {
      const written = await writeTsElements({
        text: registry.text,
        fileName: REGISTRY_FILE,
        ...TS_FILE_KINDS.artistRegistry,
        upsert,
        remove,
        force: options.force,
      });
      const planned = planFor(
        REGISTRY_FILE,
        registry,
        written.text,
        registryItems,
        options.force,
      );
      if (planned) plans.push(planned);
    } catch (error) {
      throw unwritable(REGISTRY_FILE, error);
    }
  }
  if (rowItems.length) {
    // A file nobody has saved to stays absent while it would hold nothing.
    const text =
      !artistsFile && rows.size === 0
        ? null
        : jsonLinesText(ARTISTS_FILE, [...rows.values()], LAYOUT);
    const planned = planFor(
      ARTISTS_FILE,
      artistsFile,
      text,
      rowItems,
      options.force && text !== null,
    );
    if (planned) plans.push(planned);
  }
  return plans;
}

export const artistsSource: RepoSource = {
  name: 'artists',
  kinds: ['artist'],
  readOnly: false,
  files: async () => [REGISTRY_FILE, ARTISTS_FILE],
  load,
  plan,
};
