import { useMemo } from 'react';
import { getCityById } from '@/components/atlas/data/lookups';
import { regionLabel } from '@/components/atlas/data/placeTree';
import { getTimelineIndex } from '@/components/atlas/data/timelineIndex';
import { useAtlasNavigate } from '@/components/atlas/navigation/useAtlasNavigate';
import {
  edgesInWindow,
  worldLinks,
} from '@/components/atlas/network/placeNetwork';
import { useNetwork } from '@/components/atlas/network/useNetwork';
import { useAtlasSelector } from '@/components/atlas/state/atlasStore';
import { useStageSignals } from '@/components/atlas/state/stageSignals';
import { musicWeights } from '@/components/atlas/stats/musicWeights';
import { scopeStats } from '@/components/atlas/stats/placeStats';
import { windowLabel } from '@/components/atlas/timeline/timeWindow';
import { CardShell, StatTile } from './CardShell';
import { EraBar, LinksReady, NOTE, OverTimeCard } from './cardParts';
import { BarList } from './charts/BarList';
import { CountUp } from './charts/CountUp';

/**
 * With nothing chosen, the world's cards: how much music, when, the
 * strongest links between regions, the busiest places, in the years the era
 * rail shows. Compact keeps the first two.
 */
export function WorldCards({ compact }: { compact: boolean }) {
  const w = useAtlasSelector((s) => s.timeWindow);
  const navigate = useAtlasNavigate();
  const signals = useStageSignals();
  const index = getTimelineIndex();
  const stats = useMemo(
    () => scopeStats(index, w, { world: true }),
    [index, w],
  );
  const busiestPlaces = useMemo(() => {
    const weights = musicWeights(w);
    return [...weights.places.entries()]
      .sort((a, b) => b[1].events - a[1].events || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .flatMap(([id, p]) => {
        const city = getCityById(id);
        return city
          ? [
              {
                key: id,
                label: city.name,
                detail: regionLabel(city.region),
                value: p.events,
              },
            ]
          : [];
      });
  }, [w]);
  const network = useNetwork();
  const ix = network.index;
  const links = ix ? edgesInWindow(ix, w).length : null;
  const strongest = useMemo(
    () =>
      ix
        ? worldLinks(ix, w, { limit: 5 }).map((link) => ({
            key: link.id,
            label: `${ix.node(link.from)?.label ?? ''} → ${ix.node(link.to)?.label ?? ''}`,
            value: link.weight,
          }))
        : [],
    [ix, w],
  );
  const years = w ? windowLabel(w) : 'All years';

  return (
    <>
      <CardShell order={0} title={`The world · ${years}`}>
        <p className="text-base font-bold leading-6 text-atlas-text">
          Music around the world
        </p>
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
          <StatTile label="Events">
            <CountUp value={stats.events} />
          </StatTile>
          <StatTile label="Artists">
            <CountUp value={stats.artists} />
          </StatTile>
          <StatTile label="Genres">
            <CountUp value={stats.genres} />
          </StatTile>
          <StatTile label="Influences">
            {links === null ? '—' : <CountUp value={links} />}
          </StatTile>
        </div>
        <div className="mt-3">
          <EraBar stats={stats} />
        </div>
      </CardShell>

      <OverTimeCard order={1} stats={stats} title="Music over time" />

      {!compact && (
        <CardShell order={2} title="Strongest connections">
          <LinksReady network={network}>
            {strongest.length === 0 ? (
              <p className={NOTE}>No influences recorded in these years.</p>
            ) : (
              <BarList
                label="The strongest links between regions"
                rows={strongest}
                onHover={(key) => signals.linkFocus.set(key)}
              />
            )}
          </LinksReady>
        </CardShell>
      )}

      {!compact && busiestPlaces.length > 0 && (
        <CardShell order={3} title="Busiest places">
          <BarList
            label="The busiest places"
            rows={busiestPlaces}
            onHover={(key) => signals.placeFocus.set(key)}
            onSelect={(id) => navigate.toPlace({ type: 'city', id })}
          />
        </CardShell>
      )}
    </>
  );
}
