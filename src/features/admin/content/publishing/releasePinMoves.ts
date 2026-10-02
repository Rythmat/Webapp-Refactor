import type { ExportRow } from '@/hooks/data/admin/useContentExport';
import {
  type PinMovesResult,
  pinReportFor,
  type PinSourcesResult,
} from '../../table/panel/PinMoves';

/**
 * What the next artist release does to the globe's song pins (design §5.1,
 * "Pin moves": the report runs again in Publishing before an artist
 * release).
 *
 * A song is pinned where its lead act's live City is. An artist release
 * that changes an act's City (`basedInPlaceId`) has the server derive the
 * act's songs' globe events again (contract §5b; the offline mock does the
 * same), so each of those songs moves to the new City — the same question
 * the row panel's City card asks of one act (`pinReportFor`), asked here of
 * every act whose City the release changes.
 *
 * What the release takes is every published item's stored body, as the
 * working export has it; what it replaces is the live release, as the
 * published export has it. A City must be in the live cities release when
 * Artists publish: one that is not refuses the whole publish (contract §5b,
 * `DANGLING_REFERENCE`), so its act's pins are not counted as moving
 * (`publishOutlook`). An act the release leaves without a City is listed
 * apart (`citiesCleared`): the server pins its songs by the next step of
 * the placement order, its song pin (`artist_location`), while the offline
 * mock leaves them where they are. Pure.
 */

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

/** One act whose City the next artist release changes. */
export interface CityChange {
  /** The artist's slug. */
  artist: string;
  /** Its name, as the report says it. */
  act: string;
  /** The City it will have. */
  placeId: string;
  /** The City it has live now; null when it has none, or is not live. */
  was: string | null;
}

const collator = new Intl.Collator(undefined, { sensitivity: 'base' });

/**
 * The acts whose City the next artist release changes, by name: each
 * published item whose body names a City its live copy does not.
 */
export function cityChanges(
  working: readonly ExportRow[],
  live: readonly ExportRow[],
): CityChange[] {
  const liveCity = new Map(
    live.map((row) => [row.slug, text(row.body?.basedInPlaceId) ?? null]),
  );
  const changes: CityChange[] = [];
  for (const row of working) {
    // A draft or archived item is not in the release; a proposal waits for
    // review, and the stored body is what ships.
    if (row.status !== 'published' || !row.body) continue;
    const placeId = text(row.body.basedInPlaceId);
    if (!placeId) continue;
    const was = liveCity.get(row.slug) ?? null;
    if (placeId === was) continue;
    changes.push({
      artist: row.slug,
      act: text(row.body.name) ?? row.slug,
      placeId,
      was,
    });
  }
  return changes.sort(
    (a, b) =>
      collator.compare(a.act, b.act) || a.artist.localeCompare(b.artist),
  );
}

/** An act the next artist release leaves without the City it has live. */
export interface CityCleared {
  artist: string;
  act: string;
  /** The City it has live now. */
  was: string;
}

/** The published acts whose body has no City where their live copy has one. */
export function citiesCleared(
  working: readonly ExportRow[],
  live: readonly ExportRow[],
): CityCleared[] {
  const liveCity = new Map(
    live.map((row) => [row.slug, text(row.body?.basedInPlaceId) ?? null]),
  );
  const cleared: CityCleared[] = [];
  for (const row of working) {
    if (row.status !== 'published' || !row.body) continue;
    const was = liveCity.get(row.slug);
    if (!was || text(row.body.basedInPlaceId)) continue;
    cleared.push({
      artist: row.slug,
      act: text(row.body.name) ?? row.slug,
      was,
    });
  }
  return cleared.sort(
    (a, b) =>
      collator.compare(a.act, b.act) || a.artist.localeCompare(b.artist),
  );
}

/**
 * Where a City stands on the globe: `live` in the live cities release,
 * `next` published and waiting for the next Globe cities publish, `draft`
 * not published at all. An Artists publish naming a City that is not live
 * when it runs is refused.
 */
export type PlaceState = 'live' | 'next' | 'draft';

/** One act's moves, as the report lists them. */
export interface ActPinMoves extends CityChange {
  result: PinMovesResult;
  place: PlaceState;
}

export type ReleasePinMoves =
  | { state: 'loading' }
  | { state: 'unknown'; why: string }
  | {
      state: 'ready';
      /** Each act given a new City, with its moves. */
      acts: ActPinMoves[];
      /** Each act whose City the release takes away. */
      cleared: CityCleared[];
    };

/** The report, from the artists' exports and the report's sources. */
export function releasePinMoves({
  working,
  live,
  cities,
  liveCities,
  sources,
}: {
  /** The artist kind's working export. */
  working: readonly ExportRow[];
  /** Its published export: the live release. */
  live: readonly ExportRow[];
  /** The places' working export. */
  cities: readonly ExportRow[];
  /** Their published export. */
  liveCities: readonly ExportRow[];
  sources: PinSourcesResult;
}): ReleasePinMoves {
  const changes = cityChanges(working, live);
  const cleared = citiesCleared(working, live);
  if (changes.length === 0) return { state: 'ready', acts: [], cleared };
  if (sources.state !== 'ready') return sources;
  const isLive = new Set(liveCities.map((row) => row.slug));
  const published = new Set(
    cities.flatMap((row) => (row.status === 'published' ? [row.slug] : [])),
  );
  const acts = changes.map(
    (change): ActPinMoves => ({
      ...change,
      result: pinReportFor(sources.sources, change.artist, change.placeId),
      place: isLive.has(change.placeId)
        ? 'live'
        : published.has(change.placeId)
          ? 'next'
          : 'draft',
    }),
  );
  return { state: 'ready', acts, cleared };
}

/** What an Artists publish does with the acts' new Cities, in one run. */
export interface PublishOutlook {
  /** Acts whose songs' pins move. */
  moving: ActPinMoves[];
  /** Acts whose new City moves no pin, or whose moves are not known. */
  quiet: ActPinMoves[];
  /** Acts whose City is not live when Artists publish, each with why. */
  refused: { act: ActPinMoves; why: string }[];
  /** Every song pin that moves: the moving acts' only. */
  moves: number;
}

/**
 * The outlook for a publish: `citiesFirst` when the same run publishes
 * Globe cities before Artists, so a City published and waiting is live by
 * then. A City still a draft, or waiting with no cities publish first,
 * refuses the whole Artists publish: its act moves nothing, and the rest
 * wait with it.
 */
export function publishOutlook(
  acts: readonly ActPinMoves[],
  { citiesFirst }: { citiesFirst: boolean },
): PublishOutlook {
  const out: PublishOutlook = { moving: [], quiet: [], refused: [], moves: 0 };
  for (const act of acts) {
    const name =
      act.result.state === 'ready' ? act.result.place.name : act.placeId;
    if (act.place === 'draft') {
      out.refused.push({
        act,
        why: `${name} is not published: the Artists publish is refused until it is, and Globe cities publish it.`,
      });
      continue;
    }
    if (act.place === 'next' && !citiesFirst) {
      out.refused.push({
        act,
        why: `${name} is not live yet: the Artists publish is refused until Globe cities publish it.`,
      });
      continue;
    }
    const moves =
      act.result.state === 'ready' ? act.result.report.moves.length : 0;
    if (moves > 0) {
      out.moving.push(act);
      out.moves += moves;
    } else out.quiet.push(act);
  }
  return out;
}
