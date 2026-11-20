import { useMemo, useState, type ReactNode } from 'react';
import { ATLAS_SEGMENT } from '@/components/atlas/components/UI/primitives';
import { stopKey } from '@/components/atlas/navigation/atlasStop';
import {
  useAtlasNavigate,
  useAtlasStop,
} from '@/components/atlas/navigation/useAtlasNavigate';
import type { NetworkIndex } from '@/components/atlas/network/networkIndex';
import {
  farTotals,
  scopeLinks,
  worldLinks,
} from '@/components/atlas/network/placeNetwork';
import type { PlaceLink, ScopeLinks } from '@/components/atlas/network/types';
import { useNetwork } from '@/components/atlas/network/useNetwork';
import { useAtlasSelector } from '@/components/atlas/state/atlasStore';
import { useStageSignals } from '@/components/atlas/state/stageSignals';
import { stopScope, type StopScope } from '@/components/atlas/stats/stopScope';
import { AddToStoryButton } from '@/components/atlas/story/AddToStoryButton';
import { useStoryMode } from '@/components/atlas/story/storyMode';
import { linkTarget, linkTitle } from '@/components/atlas/story/storyTargets';
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

/** A link's Add to Story at a row's end. */
function StoryRowAdd({
  ix,
  link,
}: {
  ix: NetworkIndex;
  link: PlaceLink | undefined;
}) {
  const target = link ? linkTarget(ix, link) : null;
  if (!target) return null;
  return (
    <AddToStoryButton
      target={target}
      title={linkTitle(target.from.label, target.to.label)}
    />
  );
}

/**
 * In Story mode, a row's link can go on the student's Story
 * (owner, 2026-11-16): a plus at its end. Elsewhere, none.
 */
function useStoryRowAction(
  ix: NetworkIndex | null,
  links: readonly PlaceLink[],
): ((key: string) => ReactNode) | undefined {
  const building = useStoryMode();
  if (!building || !ix) return undefined;
  return function rowAction(key) {
    return <StoryRowAdd ix={ix} link={links.find((l) => l.id === key)} />;
  };
}

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
  const links = useMemo(
    () => (ix ? worldLinks(ix, w, { limit: ROWS }) : []),
    [ix, w],
  );
  const rows = useMemo(
    () =>
      ix
        ? links.map((link) => ({
            key: link.id,
            label: `${ix.node(link.from)?.label ?? ''} → ${ix.node(link.to)?.label ?? ''}`,
            value: link.weight,
          }))
        : [],
    [ix, links],
  );
  const rowAction = useStoryRowAction(ix, links);
  return (
    <CardShell order={0} title="Strongest connections">
      <LinksReady network={network}>
        {rows.length === 0 ? (
          <p className={NOTE}>No influences recorded in these years.</p>
        ) : (
          <BarList
            label="The strongest links between regions"
            rowAction={rowAction}
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
            ix={ix}
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
  ix,
  links,
  title,
  years,
  label,
  place,
}: {
  ix: NetworkIndex;
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
  const rowAction = useStoryRowAction(
    ix,
    side === 'in' ? links.roots : links.routes,
  );
  if (links.roots.length === 0 && links.routes.length === 0) {
    return (
      <p className={NOTE}>
        No connections recorded for {title}
        {years ? ` in ${years}` : ''} yet. <AllYearsLink />
      </p>
    );
  }
  // Each far place once, totalled: a country's cities may all link to it. A
  // row's key is the place's strongest link, which it points out on the map.
  const places = (list: readonly PlaceLink[], s: 'from' | 'to') =>
    farTotals(list, s).map(({ node, weight }) => ({
      node,
      weight,
      key: list.find((l) => l[s] === node)?.id ?? node,
      label: label(node),
    }));
  const cameFrom = places(links.roots, 'from');
  const wentTo = places(links.routes, 'to');
  const shown = side === 'in' ? cameFrom : wentTo;
  return (
    <>
      <FlowChart
        from={cameFrom.slice(0, FLOW_SIDE)}
        to={wentTo.slice(0, FLOW_SIDE)}
      />
      <div
        aria-label="Which way"
        className="mb-1 mt-2 flex gap-1 rounded-full bg-white/[0.05] p-0.5"
        role="group"
      >
        {(
          [
            ['in', 'Came from', cameFrom.length],
            ['out', 'Went to', wentTo.length],
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
        rows={shown.slice(0, ROWS).map((row) => ({
          key: row.key,
          label: row.label,
          value: row.weight,
          // The map's colours: cool came in, warm went out.
          color: side === 'in' ? ROOTS_RAMP[1] : ROUTES_RAMP[2],
        }))}
        rowAction={rowAction}
        onHover={(key) => signals.linkFocus.set(key)}
        onSelect={(key) => {
          const row = shown.find((r) => r.key === key);
          const to = row ? place(row.node) : null;
          if (to) navigate.toPlace(to);
        }}
      />
    </>
  );
}
