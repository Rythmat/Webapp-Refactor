import { Info, X } from 'lucide-react';
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ATLAS_CARD,
  ATLAS_EYEBROW,
  AtlasIconButton,
} from '@/components/atlas/components/UI/primitives';
import { getTimelineIndex } from '@/components/atlas/data/timelineIndex';
import { stopKey } from '@/components/atlas/navigation/atlasStop';
import { useAtlasStop } from '@/components/atlas/navigation/useAtlasNavigate';
import {
  edgesInWindow,
  scopeLinks,
  worldLinks,
} from '@/components/atlas/network/placeNetwork';
import { useNetwork } from '@/components/atlas/network/useNetwork';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import { scopeStats } from '@/components/atlas/stats/placeStats';
import { stopScope } from '@/components/atlas/stats/stopScope';
import { windowLabel } from '@/components/atlas/timeline/timeWindow';
import { cn } from '@/lib/utils';
import { LegendCard } from './LegendCard';
import { EraBar } from './cardParts';
import { binLabel, eventsWord } from './charts/describe';

/**
 * The floating cards on a phone (owner, 2026-10-29: a strip above the
 * bottom rail): a row of small cards that snap as they scroll, with the
 * same facts as the column, the world's or the stop's, and a Legend chip at
 * the end that opens the Legend over the map.
 */
export default function PhoneStrip() {
  const stop = useAtlasStop();
  const key = stopKey(stop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scope = useMemo(() => stopScope(stop), [key]);
  const world = stop.kind === 'home' || stop.kind === 'search';
  const w = useAtlasSelector((s) => s.timeWindow);
  const index = getTimelineIndex();
  const events = world ? index : (scope?.events ?? []);
  const stats = useMemo(
    () => scopeStats(events, w, { world }),
    [events, w, world],
  );
  const network = useNetwork();
  const ix = network.index;
  const links = useMemo(() => {
    if (!ix) return null;
    if (world) {
      const top = worldLinks(ix, w, { limit: 1 })[0];
      return {
        total: edgesInWindow(ix, w).length,
        line: top
          ? `${ix.node(top.from)?.label ?? ''} → ${ix.node(top.to)?.label ?? ''} · ${top.weight}`
          : 'None in these years',
      };
    }
    if (!scope) return null;
    const s = scope.pinned
      ? scopeLinks(ix, new Set([scope.pinned.event.id]), null)
      : scopeLinks(ix, scope.eventIds, w);
    return {
      total: s.total - s.local,
      line: `Came from ${s.roots.length} · Went to ${s.routes.length}`,
    };
  }, [ix, world, scope, w]);
  const [legend, setLegend] = useState(false);
  const dispatch = useAtlasDispatch();
  const years = w ? windowLabel(w) : 'All years';
  const title = world ? 'Music around the world' : (scope?.title ?? '');
  const kind = world
    ? 'The world'
    : scope?.kind === 'artist'
      ? 'Artist'
      : scope?.kind === 'event'
        ? 'Event'
        : 'Place';

  if (!world && !scope) return null;
  return (
    <div className="pointer-events-auto relative w-full" data-atlas-strip>
      {legend && (
        <div className="absolute inset-x-0 bottom-full mb-2 max-h-[50vh] overflow-y-auto overscroll-contain rounded-[1.25rem]">
          <div className="relative">
            <LegendCard order={0} />
            <AtlasIconButton
              aria-label="Close the legend"
              className="absolute right-10 top-1.5"
              size="sm"
              onClick={() => setLegend(false)}
            >
              <X aria-hidden className="size-4" />
            </AtlasIconButton>
          </div>
        </div>
      )}
      <ul
        aria-label="At a glance"
        className="-mx-2 flex snap-x snap-mandatory gap-2 overflow-x-auto px-2 [scrollbar-width:none]"
      >
        <StripCard order={0} title={`${kind} · ${years}`}>
          <p className="truncate text-sm font-bold text-atlas-text">{title}</p>
          <p className="text-xs text-atlas-text-2">
            {eventsWord(stats.events)} · {stats.artists} artists ·{' '}
            {stats.genres} genres
          </p>
          <div className="mt-2">
            <EraBar stats={stats} />
          </div>
        </StripCard>
        <StripCard order={1} title="Busiest">
          {stats.busiest ? (
            <>
              <p className="text-sm font-bold text-atlas-text">
                {eventsWord(stats.busiest.count)}
              </p>
              <p className="text-xs text-atlas-text-2">
                {binLabel(stats.busiest)}
              </p>
            </>
          ) : (
            <p className="text-xs text-atlas-text-2">No music in these years</p>
          )}
        </StripCard>
        <StripCard order={2} title="Connections">
          <p className="text-sm font-bold text-atlas-text">
            {links ? `${links.total} influences` : '—'}
          </p>
          <p className="truncate text-xs text-atlas-text-2">
            {links?.line ?? 'Loading the links'}
          </p>
        </StripCard>
        <li className="flex shrink-0 snap-start items-center">
          <button
            aria-expanded={legend}
            className={cn(
              ATLAS_CARD,
              'flex h-[6.25rem] w-24 flex-col items-center justify-center gap-1 text-xs font-bold',
            )}
            type="button"
            onClick={() => {
              if (!legend) {
                dispatch({
                  type: 'SET_CARD_PREFS',
                  payload: { legendOpen: true },
                });
              }
              setLegend(!legend);
            }}
          >
            <Info aria-hidden className="size-4" />
            Legend
          </button>
        </li>
      </ul>
    </div>
  );
}

function StripCard({
  title,
  order,
  children,
}: {
  title: string;
  order: number;
  children: ReactNode;
}) {
  return (
    <li
      className={cn(
        ATLAS_CARD,
        'atlas-card-in h-[6.25rem] w-64 shrink-0 snap-start overflow-hidden px-4 py-3',
      )}
      style={{ '--i': order } as CSSProperties}
    >
      <p className={cn(ATLAS_EYEBROW, 'truncate')}>{title}</p>
      <div className="mt-1.5">{children}</div>
    </li>
  );
}
