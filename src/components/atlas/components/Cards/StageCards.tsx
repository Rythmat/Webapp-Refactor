import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { useMemo } from 'react';
import { SpectrumBar } from '@/components/art/light/SpectrumLight';
import { ATLAS_LINK } from '@/components/atlas/components/UI/primitives';
import { getCityById } from '@/components/atlas/data/lookups';
import { MUSICAL_ERAS } from '@/components/atlas/data/musicalEras';
import { regionLabel } from '@/components/atlas/data/placeTree';
import { getTimelineIndex } from '@/components/atlas/data/timelineIndex';
import { useAtlasNavigate } from '@/components/atlas/navigation/useAtlasNavigate';
import {
  edgesInWindow,
  worldLinks,
} from '@/components/atlas/network/placeNetwork';
import { useNetwork } from '@/components/atlas/network/useNetwork';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import { useStageSignals } from '@/components/atlas/state/stageSignals';
import { musicWeights } from '@/components/atlas/stats/musicWeights';
import { scopeStats, type Bin } from '@/components/atlas/stats/placeStats';
import { ERA_BG } from '@/components/atlas/theme/eraClasses';
import { windowLabel } from '@/components/atlas/timeline/timeWindow';
import { CardShell, StatTile } from './CardShell';
import { BarList } from './charts/BarList';
import { CountUp } from './charts/CountUp';
import { StackedBar } from './charts/StackedBar';
import { TrendChart } from './charts/TrendChart';
import { binLabel, eventsWord } from './charts/describe';

const ERA_LABEL = new Map(MUSICAL_ERAS.map((e) => [e.id, e.label]));

/**
 * The cards over the map (owner, 2026-10-29: the Studio frame with
 * floating cards, after the map-dashboard reference). With nothing chosen,
 * the world's: how much music, when, the strongest links between regions,
 * the busiest places, in the years the era rail shows. Compact keeps the
 * first two.
 */
export default function StageCards({ compact }: { compact: boolean }) {
  return <WorldCards compact={compact} />;
}

function WorldCards({ compact }: { compact: boolean }) {
  const w = useAtlasSelector((s) => s.timeWindow);
  const dispatch = useAtlasDispatch();
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
  const links = network.index ? edgesInWindow(network.index, w).length : null;
  const strongest = useMemo(
    () =>
      network.index
        ? worldLinks(network.index, w, { limit: 5 }).map((link) => ({
            key: link.id,
            label: `${network.index!.node(link.from)?.label ?? ''} → ${network.index!.node(link.to)?.label ?? ''}`,
            value: link.weight,
          }))
        : [],
    [network.index, w],
  );
  const years = w ? windowLabel(w) : 'All years';
  const pick = (bin: Bin) =>
    dispatch({
      type: 'SET_WINDOW',
      payload: { from: bin.start, to: bin.start + bin.size - 1 },
    });

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
          <StackedBar
            label="Events by era"
            segments={stats.eras.map((e) => ({
              key: e.id,
              count: e.count,
              className: ERA_BG[e.id],
              label: ERA_LABEL.get(e.id) ?? e.id,
            }))}
          />
        </div>
      </CardShell>

      <CardShell order={1} title="Music over time">
        {stats.events === 0 ? (
          <p className="text-[0.8125rem] text-atlas-text-2">
            No music in these years.{' '}
            <button
              className={ATLAS_LINK}
              type="button"
              onClick={() => dispatch({ type: 'SET_WINDOW', payload: null })}
            >
              Show all years
            </button>
          </p>
        ) : (
          <>
            <TrendChart bins={stats.bins} label="Events" onPick={pick} />
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

      {!compact && (
        <CardShell order={2} title="Strongest connections">
          {network.status === 'error' ? (
            <p className="text-[0.8125rem] text-atlas-text-2">
              The links didn’t load.{' '}
              <button
                className={ATLAS_LINK}
                type="button"
                onClick={network.retry}
              >
                Try again
              </button>
            </p>
          ) : network.status === 'loading' ? (
            <SpectrumBar className="my-2 w-full" label="Loading the links" />
          ) : strongest.length === 0 ? (
            <p className="text-[0.8125rem] text-atlas-text-2">
              No influences recorded in these years.
            </p>
          ) : (
            <BarList
              label="The strongest links between regions"
              rows={strongest}
              onHover={(key) => signals.linkFocus.set(key)}
            />
          )}
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
