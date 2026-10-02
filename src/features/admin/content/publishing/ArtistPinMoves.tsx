import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import { useContentExports } from '@/hooks/data/admin/useContentExport';
import { PinMovesNote, usePinSources } from '../../table/panel/PinMoves';
import { tableHref } from '../../table/tablePaths';
import { CONSOLE_LABEL } from '../../ui/styles';
import {
  type ActPinMoves,
  publishOutlook,
  releasePinMoves,
  type ReleasePinMoves,
} from './releasePinMoves';

/**
 * Publishing's pin-move report: every song pin the next artist release
 * moves, act by act, each song with where it is pinned now, where it goes
 * and how far (`releasePinMoves.ts`, the row panel's City card asked of
 * every act whose City changes); first, any City not live when Artists
 * publish, which refuses the whole publish; last, the acts it leaves with
 * no City. On the Review & publish tab while the artist kind has changes,
 * and in the "Publish everything that changed" confirmation, which waits
 * for it.
 *
 * It reads the artists and the places twice — as they will ship and as they
 * are live — and the songs with their pins, all from the exports the Table
 * shares. Loaded lazily, and only while artists have changes: the console's
 * eager code never loads it (eagerBoundary.test.ts).
 */

/** The artists and the places, as they will ship and as they are live. */
const KINDS: readonly ContentKind[] = ['artist', 'globe_city'];

/** How many acts are listed before "Show all". */
const LISTED_ACTS = 8;

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`;

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/** Every song pin the next artist release moves. */
export function useReleasePinMoves(): ReleasePinMoves {
  const working = useContentExports(KINDS);
  const live = useContentExports(KINDS, { view: 'published' });
  const sources = usePinSources(true);
  return useMemo((): ReleasePinMoves => {
    const failed = working.error ?? live.error;
    if (failed) return { state: 'unknown', why: message(failed) };
    if (!working.ready || !live.ready || !sources) return { state: 'loading' };
    const artists = working.byKind.get('artist');
    const liveArtists = live.byKind.get('artist');
    if (artists?.source !== 'export' || liveArtists?.source !== 'export')
      return {
        state: 'unknown',
        why: 'the server does not export the artists here',
      };
    return releasePinMoves({
      working: artists.rows,
      live: liveArtists.rows,
      cities: working.byKind.get('globe_city')?.rows ?? [],
      liveCities: live.byKind.get('globe_city')?.rows ?? [],
      sources,
    });
    // The fingerprints say when the rows changed (useContentExport.ts).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    working.fingerprint,
    working.ready,
    working.error,
    live.fingerprint,
    live.ready,
    live.error,
    sources,
  ]);
}

const Act = ({
  act,
  when,
  refused,
}: {
  act: ActPinMoves;
  when: string;
  /** Why the Artists publish is refused over this act's City, if it is. */
  refused?: string;
}) => (
  <li className="flex flex-col gap-1" data-act={act.artist}>
    <Link
      to={tableHref('artists', act.artist)}
      className="self-start text-sm text-white/85 underline-offset-2 hover:text-white hover:underline"
    >
      {act.act}
    </Link>
    {refused ? (
      <p className="text-xs text-amber-200/80">{refused}</p>
    ) : (
      <PinMovesNote result={act.result} act={act.act} when={when} />
    )}
  </li>
);

/**
 * The report. `run` is the publish it is shown before, in its order: the
 * places going live first, and the globe events after, change what it says.
 * `onKnown` hears whether the report has been worked out (or cannot be).
 */
export const ArtistPinMovesReport = ({
  run,
  onKnown,
}: {
  run?: readonly ContentKind[];
  onKnown?(known: boolean): void;
}) => {
  const result = useReleasePinMoves();
  const [all, setAll] = useState(false);
  useEffect(() => {
    onKnown?.(result.state !== 'loading');
  }, [onKnown, result.state]);

  const box = 'flex flex-col gap-2 text-sm text-white/70';
  if (result.state === 'loading')
    return (
      <p aria-busy className={box}>
        Working out which song pins the artist publish moves…
      </p>
    );
  if (result.state === 'unknown')
    return (
      <p className={box}>
        Which song pins the artist publish moves cannot be worked out:{' '}
        {result.why}.
      </p>
    );

  const artistAt = run?.indexOf('artist') ?? -1;
  const citiesFirst = !!run && run.indexOf('globe_city') > -1;
  const eventsAfter =
    !!run && artistAt > -1 && run.indexOf('globe_event') > artistAt;
  // Students see a pin move once the songs' globe events publish.
  const when = eventsAfter
    ? 'when this run publishes Globe events'
    : run
      ? 'at the first Globe events publish after this one'
      : 'once Artists, then Globe events, publish';
  const outlook = publishOutlook(result.acts, { citiesFirst });
  const refusedBy = new Map(
    outlook.refused.map(({ act, why }) => [act.artist, why]),
  );
  // Acts whose new City moves nothing are counted, not listed; one whose
  // moves cannot be worked out says why.
  const unworked = outlook.quiet.filter((act) => act.result.state !== 'ready');
  const listed = [
    ...outlook.refused.map(({ act }) => act),
    ...outlook.moving,
    ...unworked,
  ];
  const quiet = outlook.quiet.length - unworked.length;
  const shown = all ? listed : listed.slice(0, LISTED_ACTS);
  const { cleared } = result;

  if (result.acts.length === 0 && cleared.length === 0)
    return (
      <p className={box} data-pin-moves={0}>
        No song pin moves: no act’s City changes in this publish.
      </p>
    );
  return (
    <div className={box} data-pin-moves={outlook.moves}>
      {outlook.refused.length > 0 && (
        <p className="text-amber-200/90">
          The Artists publish will be refused:{' '}
          {outlook.refused.length === 1
            ? '1 act names a City that is not live'
            : `${outlook.refused.length.toLocaleString()} acts name Cities that are not live`}{' '}
          when it runs. No pin below moves until{' '}
          {outlook.refused.length === 1 ? 'it is' : 'they are'}.
        </p>
      )}
      {result.acts.length > 0 && (
        <p className="text-white/80">
          {outlook.moves > 0
            ? `Moves ${plural(outlook.moves, 'song pin')} of ${plural(outlook.moving.length, 'act')} to their new City.`
            : 'No song pin moves.'}
          {quiet > 0 &&
            ` ${plural(quiet, 'other act')} ${quiet === 1 ? 'gets' : 'get'} a new City without moving a pin.`}
        </p>
      )}
      {shown.length > 0 && (
        <ul className="flex flex-col gap-3">
          {shown.map((act) => (
            <Act
              key={act.artist}
              act={act}
              when={when}
              refused={refusedBy.get(act.artist)}
            />
          ))}
        </ul>
      )}
      {listed.length > shown.length && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="self-start text-xs text-white/60 underline-offset-2 hover:text-white hover:underline"
        >
          Show all {listed.length.toLocaleString()} acts
        </button>
      )}
      {cleared.length > 0 && (
        <p className="text-xs text-white/60">
          {plural(cleared.length, 'act')}{' '}
          {cleared.length === 1 ? 'loses its' : 'lose their'} City (
          {cleared.map((act) => act.act).join(', ')}): the server pins their
          songs by their song pins instead (placement step 3), and the offline
          mock leaves them where they are.
        </p>
      )}
      {outlook.moves > 0 && (
        <p className="text-xs text-white/50">
          {eventsAfter
            ? 'Their songs’ globe events are derived again when Artists publish, and Globe events publish after it in this run: students see the pins move.'
            : 'Their songs’ globe events are derived again when Artists publish; students see the pins move with the first Globe events publish after it.'}
        </p>
      )}
    </div>
  );
};

/** On the Review & publish tab, while the artist kind has changes. */
export const ArtistPinMovesSection = () => (
  <section
    aria-labelledby="artist-pin-moves"
    className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3"
  >
    <h2 id="artist-pin-moves" className={CONSOLE_LABEL}>
      Song pins the artist publish moves
    </h2>
    <ArtistPinMovesReport />
  </section>
);
