import { useMemo, useState } from 'react';
import { ATLAS_SEGMENT } from '@/components/atlas/components/UI/primitives';
import { stopKey } from '@/components/atlas/navigation/atlasStop';
import {
  useAtlasNavigate,
  useAtlasStop,
} from '@/components/atlas/navigation/useAtlasNavigate';
import {
  scopeLinks,
  worldLinks,
} from '@/components/atlas/network/placeNetwork';
import type { PlaceLink, ScopeLinks } from '@/components/atlas/network/types';
import { useNetwork } from '@/components/atlas/network/useNetwork';
import { useAtlasSelector } from '@/components/atlas/state/atlasStore';
import { useStageSignals } from '@/components/atlas/state/stageSignals';
import { stopScope, type StopScope } from '@/components/atlas/stats/stopScope';
import { ROOTS_RAMP, ROUTES_RAMP } from '@/components/atlas/theme/marks';
import { windowLabel } from '@/components/atlas/timeline/timeWindow';
import type { SelectedLocation } from '@/components/atlas/types';
import { cn } from '@/lib/utils';
import { CardShell } from './CardShell';
import { AllYearsLink, LinksReady, NOTE } from './cardParts';
import { BarList } from './charts/BarList';
import { FlowChart } from './charts/FlowChart';

/** How many places each side of the flow chart names. */
const FLOW_SIDE = 4;
/** How many rows a list shows. */
const ROWS = 5;

/**
 * The one card over the map besides the events (owner, 2026-10-30: the region
 * is the hero, only the most important information): where the music went.
 * With nothing chosen, the strongest links between regions; at a stop, where
 * its music came from and went to. A tour or a pathway has its own card.
 */
export default function StageCards() {
  const stop = useAtlasStop();
  const key = stopKey(stop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scope = useMemo(() => stopScope(stop), [key]);
  if (stop.kind === 'home' || stop.kind === 'search') return <WorldLinks />;
  return scope ? <StopLinks key={scope.key} scope={scope} /> : null;
}

function WorldLinks() {
  const w = useAtlasSelector((s) => s.timeWindow);
  const signals = useStageSignals();
  const network = useNetwork();
  const ix = network.index;
  const rows = useMemo(
    () =>
      ix
        ? worldLinks(ix, w, { limit: ROWS }).map((link) => ({
            key: link.id,
            label: `${ix.node(link.from)?.label ?? ''} → ${ix.node(link.to)?.label ?? ''}`,
            value: link.weight,
          }))
        : [],
    [ix, w],
  );
  return (
    <CardShell order={0} title="Strongest connections">
      <LinksReady network={network}>
        {rows.length === 0 ? (
          <p className={NOTE}>No influences recorded in these years.</p>
        ) : (
          <BarList
            label="The strongest links between regions"
            rows={rows}
            onHover={(key) => signals.linkFocus.set(key)}
          />
        )}
      </LinksReady>
    </CardShell>
  );
}

function StopLinks({ scope }: { scope: StopScope }) {
  const w = useAtlasSelector((s) => s.timeWindow);
  const network = useNetwork();
  const ix = network.index;
  const pinned = scope.pinned;
  const links: ScopeLinks | null = useMemo(() => {
    if (!ix) return null;
    return pinned
      ? scopeLinks(ix, new Set([pinned.event.id]), null)
      : scopeLinks(ix, scope.eventIds, w);
  }, [ix, scope, pinned, w]);
  return (
    <CardShell
      order={0}
      title={pinned ? 'This event’s connections' : 'Connections'}
    >
      <LinksReady network={network}>
        {links && ix && (
          <Connections
            label={(id) => ix.node(id)?.label ?? id}
            links={links}
            place={(id) => ix.node(id)?.place ?? null}
            title={pinned ? pinned.event.title : scope.title}
            years={pinned ? 'any year' : w ? windowLabel(w) : null}
          />
        )}
      </LinksReady>
    </CardShell>
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
