import { memo, useState, type CSSProperties } from 'react';
import { eventImage } from '@/components/atlas/data/eventImage';
import type { TimelineEvent } from '@/components/atlas/data/timelineIndex';
import { RIVER } from '@/components/atlas/theme/river';
import { eventPlaceName } from '@/components/atlas/utils/eventPlace';
import { cn } from '@/lib/utils';
import type { RiverCluster } from './riverLevels';
import { countLabel, coverOf, type MarkerKind } from './riverModel';

export interface PlacedMarker {
  cluster: RiverCluster<TimelineEvent>;
  /** Its lane's centre line in its year, px from the lanes' top. */
  y: number;
  kind: MarkerKind;
}

/** Keyboard focus on a coloured band: white, which no era colour hides. */
export const ATLAS_FOCUS_ON_BAND =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-atlas-page';

/** How a marker names itself to a screen reader and in the tooltip. */
export function describeCluster(cluster: RiverCluster<TimelineEvent>): {
  title: string;
  detail: string;
} {
  if (cluster.items.length === 1) {
    const { event } = cluster.items[0];
    return {
      title: event.title,
      detail: `${eventPlaceName(event)} · ${event.year}`,
    };
  }
  const years =
    cluster.year === cluster.lastYear
      ? String(cluster.year)
      : `${cluster.year}–${cluster.lastYear}`;
  return { title: `${cluster.items.length} events`, detail: years };
}

const countSize = (n: number) =>
  Math.min(RIVER.countMaxPx, RIVER.countMinPx + Math.log2(n) * 3);

function Poster({ src, size }: { src: string; size: number }) {
  // A poster that fails to load falls back to a dot.
  const [failed, setFailed] = useState(false);
  if (failed) return <Dot />;
  return (
    <span
      className="block overflow-hidden rounded-full bg-atlas-panel ring-2 ring-atlas-page transition-transform group-hover:scale-110"
      style={{ width: size, height: size }}
    >
      <img
        alt=""
        className="size-full object-cover"
        decoding="async"
        draggable={false}
        height={size}
        loading="lazy"
        src={src}
        width={size}
        onError={() => setFailed(true)}
      />
    </span>
  );
}

function Dot() {
  return (
    <span className="block size-2.5 rounded-full bg-white/85 transition-transform group-hover:scale-150" />
  );
}

/**
 * The river's events: a round poster for one event, a white count for a
 * cluster, a dot for an event with no picture or past the poster budget.
 * Real buttons, one of them in the tab order at a time (TimeRiver roves the
 * rest with the arrow keys).
 */
export const RiverMarkers = memo(function RiverMarkers({
  markers,
  top,
  laneHeight,
  focusedKey,
  onActivate,
  onHover,
  onFocusKey,
}: {
  markers: readonly PlacedMarker[];
  top: number;
  laneHeight: number;
  focusedKey: string | null;
  onActivate: (cluster: RiverCluster<TimelineEvent>, el: HTMLElement) => void;
  onHover: (
    cluster: RiverCluster<TimelineEvent> | null,
    el: HTMLElement | null,
  ) => void;
  onFocusKey: (key: string) => void;
}) {
  const poster = Math.max(22, Math.min(RIVER.posterPx, laneHeight - 2));
  const tabKey = focusedKey ?? markers[0]?.cluster.key;
  return (
    <>
      {markers.map(({ cluster, y, kind }) => {
        const { title, detail } = describeCluster(cluster);
        const size =
          kind === 'count'
            ? countSize(cluster.items.length)
            : kind === 'poster' || kind === 'stack'
              ? poster
              : 24;
        return (
          <button
            key={cluster.key}
            aria-label={`${title}, ${detail}`}
            className={cn(
              'atlas-river-item group flex items-center justify-center rounded-full',
              ATLAS_FOCUS_ON_BAND,
            )}
            data-river-item={cluster.key}
            style={
              {
                '--yr': cluster.year,
                top: top + y,
                width: size,
                height: size,
              } as CSSProperties
            }
            tabIndex={cluster.key === tabKey ? 0 : -1}
            type="button"
            onBlur={() => onHover(null, null)}
            onClick={(e) => onActivate(cluster, e.currentTarget)}
            onFocus={(e) => {
              onFocusKey(cluster.key);
              onHover(cluster, e.currentTarget);
            }}
            onPointerEnter={(e) => onHover(cluster, e.currentTarget)}
            onPointerLeave={() => onHover(null, null)}
          >
            {kind === 'count' ? (
              <span className="flex size-full items-center justify-center rounded-full bg-white text-xs font-bold text-atlas-page shadow-md transition-transform group-hover:scale-110">
                {countLabel(cluster.items.length)}
              </span>
            ) : kind === 'poster' || kind === 'stack' ? (
              <>
                <Poster
                  size={size}
                  src={eventImage(coverOf(cluster)!.event, 'lane')!}
                />
                {kind === 'stack' && (
                  <span className="absolute -bottom-1.5 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold leading-none text-atlas-page ring-2 ring-atlas-page">
                    {countLabel(cluster.items.length)}
                  </span>
                )}
              </>
            ) : (
              <Dot />
            )}
          </button>
        );
      })}
    </>
  );
});
