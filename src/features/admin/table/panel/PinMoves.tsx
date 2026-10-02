import { MapPin } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import {
  type ContentExports,
  useContentExports,
} from '@/hooks/data/admin/useContentExport';
import {
  leadActOf,
  type PinPlace,
  pinMoves,
  pinPlaceOf,
  type PinReport,
} from '../data/pinMoves';

/**
 * The pin-move report, where a City is set: on a City suggestion's card and
 * under an artist's Details when the draft changes its City (design §5.1,
 * "a report lists each move before any City accept"), and on Publishing
 * before an artist release (`ArtistPinMoves.tsx`, which reads the same
 * sources and asks the same question of each act whose City changes). Read
 * from the kinds' exports the working graph has loaded already.
 */

/** The exports the report reads: the songs, their pins, the places. */
export const PIN_KINDS: readonly ContentKind[] = [
  'song',
  'globe_event',
  'globe_city',
];
const NONE: readonly ContentKind[] = [];

/** How many moves are listed before "Show N more". */
const LISTED = 6;

type Body = Readonly<Record<string, unknown>>;

export type PinMovesResult =
  | { state: 'loading' }
  | { state: 'unknown'; why: string }
  | { state: 'ready'; place: PinPlace; report: PinReport };

/** What every report is worked out from, read once for all of them. */
export interface PinSources {
  /** Each act's songs, by the act that pins them (`leadActOf`). */
  songsByAct: ReadonlyMap<string, readonly { slug: string; body: Body }[]>;
  /** Each globe event's body by its id: `song-<id>` is where a song is pinned. */
  pins: ReadonlyMap<string, Body | null>;
  /** Each place's body by its slug. */
  places: ReadonlyMap<string, Body | null>;
}

export type PinSourcesResult =
  | { state: 'loading' }
  | { state: 'unknown'; why: string }
  | { state: 'ready'; sources: PinSources };

/** The report's sources from the exports of `PIN_KINDS`. */
export function pinSourcesOf(exports: ContentExports): PinSourcesResult {
  if (!exports.ready) return { state: 'loading' };
  const songs = exports.byKind.get('song');
  const events = exports.byKind.get('globe_event');
  const cities = exports.byKind.get('globe_city');
  if (songs?.source !== 'export' || events?.source !== 'export' || !cities)
    return {
      state: 'unknown',
      why: 'the server does not export songs and their pins here',
    };
  const songsByAct = new Map<string, { slug: string; body: Body }[]>();
  for (const row of songs.rows) {
    if (!row.body) continue;
    const act = leadActOf(row.body);
    const list = songsByAct.get(act);
    const song = { slug: row.slug, body: row.body };
    if (list) list.push(song);
    else songsByAct.set(act, [song]);
  }
  return {
    state: 'ready',
    sources: {
      songsByAct,
      pins: new Map(events.rows.map((row) => [row.slug, row.body])),
      places: new Map(cities.rows.map((row) => [row.slug, row.body])),
    },
  };
}

/**
 * The report for setting `artist`'s City to `placeId`; `made` is the
 * place's body when it does not exist yet (a suggestion that makes it).
 */
export function pinReportFor(
  sources: PinSources,
  artist: string,
  placeId: string,
  made?: Body | null,
): PinMovesResult {
  const place = pinPlaceOf(sources.places.get(placeId) ?? made);
  if (!place)
    return {
      state: 'unknown',
      why: `the place “${placeId}” has no coordinates here`,
    };
  return {
    state: 'ready',
    place: { ...place, name: place.name || placeId },
    report: pinMoves(
      artist,
      place,
      sources.songsByAct.get(artist) ?? [],
      sources.pins,
    ),
  };
}

/** The report's sources, read while `enabled`; null while not. */
export function usePinSources(enabled: boolean): PinSourcesResult | null {
  // Nothing is read while nothing asks.
  const exports = useContentExports(enabled ? PIN_KINDS : NONE);
  return useMemo(
    () => (enabled ? pinSourcesOf(exports) : null),
    // The fingerprint says when the rows changed (useContentExport.ts).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exports.fingerprint, exports.ready, enabled],
  );
}

/**
 * The report for setting `artist`'s City to `placeId`; `made` is the
 * place's body when it does not exist yet (a suggestion that makes it).
 * Null when no City is being set.
 */
export function usePinMoves(
  artist: string,
  placeId: string | null | undefined,
  made?: Body | null,
): PinMovesResult | null {
  const sources = usePinSources(!!placeId);
  return useMemo(() => {
    if (!placeId || !sources) return null;
    if (sources.state !== 'ready') return sources;
    return pinReportFor(sources.sources, artist, placeId, made);
  }, [sources, artist, placeId, made]);
}

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`;

export const PinMovesNote = ({
  result,
  act,
  when = 'once Artists, then Globe events, publish',
}: {
  result: PinMovesResult;
  /** The act's name, as the note says it. */
  act: string;
  /**
   * When students see the pins move, as the note says it: an Artists
   * publish derives the songs' globe events again, and the next Globe
   * events publish shows them.
   */
  when?: string;
}) => {
  const [all, setAll] = useState(false);
  const box =
    'flex flex-col gap-1 rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-white/65';
  if (result.state === 'loading')
    return (
      <p aria-busy className={box}>
        Working out which song pins this moves…
      </p>
    );
  if (result.state === 'unknown')
    return (
      <p className={box}>
        Which song pins this moves cannot be worked out: {result.why}.
      </p>
    );
  const { place, report } = result;
  const { moves } = report;
  const shown = all ? moves : moves.slice(0, LISTED);
  const already =
    report.staying > 0
      ? `${plural(report.staying, 'song')} ${act} leads ${report.staying === 1 ? 'is' : 'are'} pinned in ${place.name} already`
      : null;
  return (
    <div className={box} data-pin-moves={moves.length}>
      <p className="flex items-start gap-1.5 text-white/80">
        <MapPin aria-hidden className="mt-0.5 size-3 shrink-0" />
        {moves.length
          ? `Moves ${plural(moves.length, 'song pin')} to ${place.name} ${when}:`
          : `No song pin moves${already ? `: ${already}` : report.unpinned ? '' : `: no song ${act} leads is pinned`}.`}
      </p>
      {moves.length > 0 && (
        <ul className="flex flex-col gap-0.5 pl-4">
          {shown.map((move) => (
            <li key={move.song}>
              {move.title}
              <span className="text-white/50">
                {' '}
                · {move.from} → {place.name}, {move.km.toLocaleString()} km
              </span>
            </li>
          ))}
          {moves.length > shown.length && (
            <li>
              <button
                type="button"
                onClick={() => setAll(true)}
                className="text-white/55 underline-offset-2 hover:text-white hover:underline"
              >
                Show {(moves.length - shown.length).toLocaleString()} more
              </button>
            </li>
          )}
        </ul>
      )}
      {moves.length > 0 && already && (
        <p className="text-white/50">
          {already[0].toUpperCase() + already.slice(1)}.
        </p>
      )}
      {report.unpinned > 0 && (
        <p className="text-white/50">
          {plural(report.unpinned, 'song')} with no pin yet will be pinned
          there.
        </p>
      )}
    </div>
  );
};
