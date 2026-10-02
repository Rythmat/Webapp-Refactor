import type { EntityId } from '@/content/graph/types';
import {
  type EntityEntry,
  type MatchTier,
  type RankedEntity,
  rankEntities,
} from './rankEntities';

/**
 * Legacy text → ids, in bulk (design §3.4, `/graph/links`).
 *
 * The songs name their artists as text — the billing line, each credit, each
 * related recording — and the graph guesses the record from it. This finds
 * every such name not yet linked, groups the occurrences by the text, and
 * proposes a record for each, graded so the page can apply the safe ones at
 * once and leave the rest to a click:
 *
 *  - `sure`     — the text is a record's name, an alias, or equal once folded;
 *  - `close`    — a prefix, word or near-spelling match: a person decides;
 *  - `combined` — a joint billing ("Stevie Wonder & Paul McCartney") that no
 *    record is called: two artists, never linked as one;
 *  - `none`     — nothing like it; create the record from a picker.
 *
 * The text is never touched: it is what the page shows. Only the id field
 * beside it is written (`linkBody`).
 */

export type LinkTier = 'sure' | 'close' | 'combined' | 'none';

/** One place a name is written, and the id field that would link it. */
export interface LegacyOccurrence {
  /** The song's id (its slug). */
  item: string;
  /** Where the text is: `artist`, `credits[3].name`. */
  textPath: string;
  /** Where its id goes: `origin.artistGlobeId`, `credits[3].artistGlobeId`. */
  idPath: string;
}

export interface LegacyGroup {
  text: string;
  occurrences: LegacyOccurrence[];
  tier: LinkTier;
  /** Best first; the first is what "apply" writes for a `sure` group. */
  candidates: RankedEntity[];
}

export interface SongLike {
  id: string;
  artist?: string;
  origin?: { artistGlobeId?: string };
  credits?: { name?: string; artistGlobeId?: string }[];
  relatedRecordings?: { artist?: string; artistGlobeId?: string }[];
}

/** Billing words that are not an artist at all (deriveEdges' list). */
const NOT_AN_ARTIST = new Set([
  'traditional',
  'unknown artist',
  'various artists',
]);

const SURE: readonly MatchTier[] = ['exact', 'alias', 'normalized'];

/** Joint billings: "A & B", "A and B", "A feat. B", "A with B", "A / B", "A, B". */
const JOINT = /\s(&|and|feat\.?|featuring|ft\.|with|x)\s|\s*\/\s*|,\s/i;

const blank = (s: unknown): boolean => typeof s !== 'string' || !s.trim();

/** Every unlinked artist name in the songs, one occurrence per field. */
export function unlinkedArtistNames(
  songs: readonly SongLike[],
): { text: string; occurrence: LegacyOccurrence }[] {
  const out: { text: string; occurrence: LegacyOccurrence }[] = [];
  const add = (text: string | undefined, occurrence: LegacyOccurrence) => {
    if (blank(text) || NOT_AN_ARTIST.has(text!.trim().toLowerCase())) return;
    out.push({ text: text!.trim(), occurrence });
  };
  for (const song of songs) {
    if (blank(song.origin?.artistGlobeId)) {
      add(song.artist, {
        item: song.id,
        textPath: 'artist',
        idPath: 'origin.artistGlobeId',
      });
    }
    song.credits?.forEach((credit, i) => {
      if (blank(credit.artistGlobeId)) {
        add(credit.name, {
          item: song.id,
          textPath: `credits[${i}].name`,
          idPath: `credits[${i}].artistGlobeId`,
        });
      }
    });
    song.relatedRecordings?.forEach((rel, i) => {
      if (blank(rel.artistGlobeId)) {
        add(rel.artist, {
          item: song.id,
          textPath: `relatedRecordings[${i}].artist`,
          idPath: `relatedRecordings[${i}].artistGlobeId`,
        });
      }
    });
  }
  return out;
}

/** Group the unlinked names and grade each group's best candidate. */
export function resolveLegacyArtists(
  songs: readonly SongLike[],
  artists: readonly EntityEntry[],
): LegacyGroup[] {
  const byText = new Map<string, LegacyOccurrence[]>();
  for (const { text, occurrence } of unlinkedArtistNames(songs)) {
    const list = byText.get(text);
    if (list) list.push(occurrence);
    else byText.set(text, [occurrence]);
  }
  const groups: LegacyGroup[] = [];
  for (const [text, occurrences] of byText) {
    const candidates = rankEntities(artists, text, { limit: 3 });
    const top = candidates[0];
    const tier: LinkTier =
      top && SURE.includes(top.tier)
        ? 'sure'
        : JOINT.test(text)
          ? 'combined'
          : top
            ? 'close'
            : 'none';
    groups.push({ text, occurrences, tier, candidates });
  }
  const order: Record<LinkTier, number> = {
    sure: 0,
    close: 1,
    combined: 2,
    none: 3,
  };
  return groups.sort(
    (a, b) =>
      order[a.tier] - order[b.tier] ||
      b.occurrences.length - a.occurrences.length ||
      (a.text < b.text ? -1 : a.text > b.text ? 1 : 0),
  );
}

/**
 * The body with `slug` written at each id path — and nothing else changed.
 * Paths are the concrete ones `unlinkedArtistNames` produced
 * (`credits[3].artistGlobeId`); an index past the array's end is skipped
 * rather than grown, because the body moved on since it was read.
 */
export function linkBody(
  body: Record<string, unknown>,
  links: readonly { idPath: string; slug: string }[],
): Record<string, unknown> {
  const next = structuredClone(body);
  for (const { idPath, slug } of links) {
    const parts = idPath.match(/[^.[\]]+/g) ?? [];
    let node: unknown = next;
    for (let i = 0; i < parts.length - 1 && node !== undefined; i++) {
      const key = parts[i];
      if (Array.isArray(node)) {
        // Never grow an array: the element is gone, so the link is stale.
        node = node[Number(key)];
      } else if (node !== null && typeof node === 'object') {
        const parent = node as Record<string, unknown>;
        // A missing object (origin on a song that has none) is created.
        if (parent[key] === undefined && !/^\d+$/.test(parts[i + 1])) {
          parent[key] = {};
        }
        node = parent[key];
      } else {
        node = undefined;
      }
    }
    if (node !== null && typeof node === 'object' && !Array.isArray(node)) {
      (node as Record<string, unknown>)[parts[parts.length - 1]] = slug;
    }
  }
  return next;
}

/** A group's applied links, per song. */
export function linksBySong(
  groups: readonly { group: LegacyGroup; slug: string }[],
): Map<string, { idPath: string; slug: string }[]> {
  const out = new Map<string, { idPath: string; slug: string }[]>();
  for (const { group, slug } of groups) {
    for (const o of group.occurrences) {
      const list = out.get(o.item);
      const link = { idPath: o.idPath, slug };
      if (list) list.push(link);
      else out.set(o.item, [link]);
    }
  }
  return out;
}

export const idOf = (slug: string): EntityId => `artist:${slug}` as EntityId;
