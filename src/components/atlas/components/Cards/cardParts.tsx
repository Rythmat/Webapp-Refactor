import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { SpectrumBar } from '@/components/art/light/SpectrumLight';
import { ATLAS_LINK } from '@/components/atlas/components/UI/primitives';
import { MUSICAL_ERAS } from '@/components/atlas/data/musicalEras';
import type { NetworkState } from '@/components/atlas/network/useNetwork';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import type { Bin, ScopeStats } from '@/components/atlas/stats/placeStats';
import { ERA_BG } from '@/components/atlas/theme/eraClasses';
import { CardShell } from './CardShell';
import { StackedBar } from './charts/StackedBar';
import { TrendChart } from './charts/TrendChart';
import { binLabel, eventsWord } from './charts/describe';

/** The parts the world's cards and a stop's share. */

const ERA_LABEL = new Map(MUSICAL_ERAS.map((e) => [e.id, e.label]));

export const NOTE = 'text-[0.8125rem] text-atlas-text-2';

/** How the events fall across the eras, as one thin bar. */
export function EraBar({ stats }: { stats: ScopeStats }) {
  return (
    <StackedBar
      label="Events by era"
      segments={stats.eras.map((e) => ({
        key: e.id,
        count: e.count,
        className: ERA_BG[e.id],
        label: ERA_LABEL.get(e.id) ?? e.id,
      }))}
    />
  );
}

/** A line that lets all of time back in, when only some years show. */
export function AllYearsLink() {
  const dispatch = useAtlasDispatch();
  const filtered = useAtlasSelector((s) => s.timeWindow !== null);
  if (!filtered) return null;
  return (
    <button
      className={ATLAS_LINK}
      type="button"
      onClick={() => dispatch({ type: 'SET_WINDOW', payload: null })}
    >
      Show all years
    </button>
  );
}

/** The busiest or the quietest stretch on the chart, as the reference's
 *  "highest & lowest" tiles: how much, which, when. */
function HighLow({
  bin,
  icon: Icon,
  word,
}: {
  bin: Bin;
  icon: LucideIcon;
  word: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-bold leading-5 text-atlas-text">
        {eventsWord(bin.count)}
      </p>
      <p className="flex items-center gap-1 text-xs leading-4 text-atlas-text-2">
        <Icon aria-hidden className="size-3.5 shrink-0" />
        {word}
      </p>
      <p className="text-xs leading-4 text-atlas-text-2">{binLabel(bin)}</p>
    </div>
  );
}

/**
 * Events over time, its busiest and quietest stretches: a reader picking a
 * stretch on the chart sets the era rail to it.
 */
export function OverTimeCard({
  title,
  stats,
  order,
  mark,
}: {
  title: string;
  stats: ScopeStats;
  order: number;
  /** A year to mark on the chart: a pinned event's. */
  mark?: number;
}) {
  const dispatch = useAtlasDispatch();
  const pick = (bin: Bin) =>
    dispatch({
      type: 'SET_WINDOW',
      payload: { from: bin.start, to: bin.start + bin.size - 1 },
    });
  return (
    <CardShell order={order} title={title}>
      {stats.events === 0 ? (
        <p className={NOTE}>
          No music in these years. <AllYearsLink />
        </p>
      ) : (
        <>
          <TrendChart
            bins={stats.bins}
            label="Events"
            mark={mark}
            onPick={pick}
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            {stats.busiest && (
              <HighLow bin={stats.busiest} icon={TrendingUp} word="Busiest" />
            )}
            {stats.quietest && (
              <HighLow
                bin={stats.quietest}
                icon={TrendingDown}
                word="Quietest"
              />
            )}
          </div>
        </>
      )}
    </CardShell>
  );
}

/**
 * The links' own states while they load: a spectrum bar, or a way to try
 * again; once there, `children`.
 */
export function LinksReady({
  network,
  children,
}: {
  network: NetworkState;
  children: ReactNode;
}) {
  if (network.status === 'error') {
    return (
      <p className={NOTE}>
        The links didn’t load.{' '}
        <button className={ATLAS_LINK} type="button" onClick={network.retry}>
          Try again
        </button>
      </p>
    );
  }
  if (network.status === 'loading') {
    return <SpectrumBar className="my-2 w-full" label="Loading the links" />;
  }
  return <>{children}</>;
}
