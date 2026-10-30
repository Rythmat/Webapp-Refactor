import { useMemo, useState } from 'react';
import { ATLAS_SEGMENT } from '@/components/atlas/components/UI/primitives';
import { LANES } from '@/components/atlas/data/lineage';
import { getCityById } from '@/components/atlas/data/lookups';
import { useAtlasNavigate } from '@/components/atlas/navigation/useAtlasNavigate';
import { scopeLinks } from '@/components/atlas/network/placeNetwork';
import type { PlaceLink, ScopeLinks } from '@/components/atlas/network/types';
import { useNetwork } from '@/components/atlas/network/useNetwork';
import { useAtlasSelector } from '@/components/atlas/state/atlasStore';
import { useStageSignals } from '@/components/atlas/state/stageSignals';
import { scopeStats } from '@/components/atlas/stats/placeStats';
import type { StopScope } from '@/components/atlas/stats/stopScope';
import { ROOTS_RAMP, ROUTES_RAMP } from '@/components/atlas/theme/marks';
import { windowLabel } from '@/components/atlas/timeline/timeWindow';
import type { SelectedLocation } from '@/components/atlas/types';
import { RainbowWriteIn } from '@/components/kit/RainbowWriteIn';
import { cn } from '@/lib/utils';
import { CardShell, StatTile } from './CardShell';
import {
  AllYearsLink,
  EraBar,
  LinksReady,
  NOTE,
  OverTimeCard,
} from './cardParts';
import { BarList } from './charts/BarList';
import { CountUp } from './charts/CountUp';
import { FlowChart } from './charts/FlowChart';

const LANE = new Map(LANES.map((l) => [l.id, l]));
const KIND_WORD = { place: 'Place', artist: 'Artist', event: 'Event' } as const;

/** How many places each side of the flow chart names. */
const FLOW_SIDE = 4;
/** How many rows a list shows. */
const ROWS = 5;

const influenceSum = (links: readonly PlaceLink[]) =>
  links.reduce((n, l) => n + l.weight, 0);

/**
 * A stop's cards: what it is and how much music, when, where its music came
 * from and went to (a flow chart and the lists under it), and its sounds or,
 * for an artist, the places they played. An event's stop is its city, the
 * event pinned in its header and marked on the chart, its connections its
 * own (whatever the years). Compact keeps the first two.
 */
export function StopCards({
  scope,
  compact,
}: {
  scope: StopScope;
  compact: boolean;
}) {
  const w = useAtlasSelector((s) => s.timeWindow);
  const stats = useMemo(() => scopeStats(scope.events, w), [scope, w]);
  const network = useNetwork();
  const ix = network.index;
  const pinned = scope.pinned;
  const links: ScopeLinks | null = useMemo(() => {
    if (!ix) return null;
    return pinned
      ? scopeLinks(ix, new Set([pinned.event.id]), null)
      : scopeLinks(ix, scope.eventIds, w);
  }, [ix, scope, pinned, w]);
  const years = w ? windowLabel(w) : 'All years';
  const artist = scope.kind === 'artist';

  return (
    <>
      <CardShell order={0} title={`${KIND_WORD[scope.kind]} · ${years}`}>
        <p className="text-base font-bold leading-6">
          <RainbowWriteIn key={scope.key} text={scope.title} />
        </p>
        {scope.subtitle && (
          <p className="truncate text-xs text-atlas-text-2">{scope.subtitle}</p>
        )}
        {pinned && (
          <p className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/[0.08] px-2.5 py-1 text-xs text-atlas-text">
            <span className="text-atlas-text-2">Pinned</span>
            <span className="truncate font-bold">{pinned.event.title}</span>
            <span className="shrink-0 tabular-nums text-atlas-text-2">
              {pinned.year}
            </span>
          </p>
        )}
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
          <StatTile label="Events">
            <CountUp value={stats.events} />
          </StatTile>
          {artist ? (
            <StatTile label="Career">
              {stats.span ? `${stats.span[0]}–${stats.span[1]}` : '—'}
            </StatTile>
          ) : (
            <StatTile label="Artists">
              <CountUp value={stats.artists} />
            </StatTile>
          )}
          <StatTile label="Genres">
            <CountUp value={stats.genres} />
          </StatTile>
          <StatTile label={pinned ? 'Its influences' : 'Influences'}>
            {links ? (
              <CountUp
                value={influenceSum(links.roots) + influenceSum(links.routes)}
              />
            ) : (
              '—'
            )}
          </StatTile>
        </div>
        <div className="mt-3">
          <EraBar stats={stats} />
        </div>
      </CardShell>

      <OverTimeCard
        mark={pinned?.year}
        order={1}
        stats={stats}
        title={artist ? 'Career over time' : 'Music over time'}
      />

      {!compact && (
        <CardShell
          order={2}
          title={pinned ? 'This event’s connections' : 'Connections'}
        >
          <LinksReady network={network}>
            {links && ix && (
              <Connections
                label={(id) => ix.node(id)?.label ?? id}
                links={links}
                place={(id) => ix.node(id)?.place ?? null}
                title={pinned ? pinned.event.title : scope.title}
                years={
                  pinned ? 'any year' : years === 'All years' ? null : years
                }
              />
            )}
          </LinksReady>
        </CardShell>
      )}

      {!compact &&
        (artist ? (
          <WherePlayed order={3} scope={scope} />
        ) : (
          stats.lanes.length > 0 && (
            <CardShell order={3} title="Top sounds">
              <BarList
                label="The sounds most heard here"
                rows={stats.lanes.map((l) => ({
                  key: l.id,
                  label: LANE.get(l.id)?.label ?? l.id,
                  value: l.count,
                  color: LANE.get(l.id)?.color,
                }))}
              />
            </CardShell>
          )
        ))}
    </>
  );
}

/**
 * Where a stop's music came from and went to: the flow chart, then one
 * side at a time in words. A row points out its link on the map and opens
 * the far place.
 */
function Connections({
  links,
  title,
  years,
  label,
  place,
}: {
  links: ScopeLinks;
  title: string;
  /** The years shown, or null for all. */
  years: string | null;
  label: (id: string) => string;
  place: (id: string) => SelectedLocation | null;
}) {
  const navigate = useAtlasNavigate();
  const signals = useStageSignals();
  const [side, setSide] = useState<'in' | 'out'>(
    links.roots.length >= links.routes.length ? 'in' : 'out',
  );
  if (links.roots.length === 0 && links.routes.length === 0) {
    return (
      <p className={NOTE}>
        No connections recorded for {title}
        {years ? ` in ${years}` : ''} yet. <AllYearsLink />
      </p>
    );
  }
  const far = (l: PlaceLink, s: 'in' | 'out') => (s === 'in' ? l.from : l.to);
  const flow = (list: readonly PlaceLink[], s: 'in' | 'out') =>
    list.slice(0, FLOW_SIDE).map((l) => ({
      key: l.id,
      label: label(far(l, s)),
      weight: l.weight,
    }));
  const shown = side === 'in' ? links.roots : links.routes;
  const byId = new Map(shown.map((l) => [l.id, l]));
  return (
    <>
      <FlowChart
        from={flow(links.roots, 'in')}
        to={flow(links.routes, 'out')}
      />
      <div
        aria-label="Which way"
        className="mb-1 mt-2 flex gap-1 rounded-full bg-white/[0.05] p-0.5"
        role="group"
      >
        {(
          [
            ['in', 'Came from', links.roots.length],
            ['out', 'Went to', links.routes.length],
          ] as const
        ).map(([id, word, n]) => (
          <button
            key={id}
            aria-pressed={side === id}
            className={cn(
              ATLAS_SEGMENT,
              'h-7 flex-1 px-2 text-xs aria-pressed:bg-atlas-pill-on aria-pressed:font-bold aria-pressed:text-atlas-text',
            )}
            disabled={n === 0}
            type="button"
            onClick={() => setSide(id)}
          >
            {word} · {n}
          </button>
        ))}
      </div>
      <BarList
        label={
          side === 'in' ? 'Where its music came from' : 'Where its music went'
        }
        rows={shown.slice(0, ROWS).map((l) => ({
          key: l.id,
          label: label(far(l, side)),
          value: l.weight,
          // The map's colours: cool came in, warm went out.
          color: side === 'in' ? ROOTS_RAMP[1] : ROUTES_RAMP[2],
        }))}
        onHover={(key) => signals.linkFocus.set(key)}
        onSelect={(key) => {
          const link = byId.get(key);
          const to = link ? place(far(link, side)) : null;
          if (to) navigate.toPlace(to);
        }}
      />
    </>
  );
}

/** An artist's places, busiest first: each opens on the map. */
function WherePlayed({ scope, order }: { scope: StopScope; order: number }) {
  const w = useAtlasSelector((s) => s.timeWindow);
  const navigate = useAtlasNavigate();
  const signals = useStageSignals();
  const rows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of scope.events) {
      if (!t.cityId || (w && (t.year < w.from || t.year > w.to))) continue;
      counts.set(t.cityId, (counts.get(t.cityId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, ROWS)
      .map(([id, n]) => ({
        key: id,
        label: getCityById(id)?.name ?? id,
        value: n,
      }));
  }, [scope, w]);
  if (rows.length === 0) return null;
  return (
    <CardShell order={order} title="Where they played">
      <BarList
        label="The places their music happened"
        rows={rows}
        onHover={(key) => signals.placeFocus.set(key)}
        onSelect={(id) => navigate.toPlace({ type: 'city', id })}
      />
    </CardShell>
  );
}
