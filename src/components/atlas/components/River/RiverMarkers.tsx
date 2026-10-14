import { memo, useState, type CSSProperties } from 'react';
import { eventImage } from '@/components/atlas/data/eventImage';
import type { TimelineEvent } from '@/components/atlas/data/timelineIndex';
import { RIVER } from '@/components/atlas/theme/river';
import { eventPlaceName } from '@/components/atlas/utils/eventPlace';
import { cn } from '@/lib/utils';
import type { RiverCluster } from './riverLevels';
import { countLabel, coversOf, type MarkerKind } from './riverModel';

export interface PlacedMarker {
  cluster: RiverCluster<TimelineEvent>;
  /** Its height, px from the lanes' top: its lane's, or a row of it. */
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

/**
 * A frame's height on a lane this thick: smaller where it carries two rows,
 * and on a phone, where the years have little room.
 */
export function posterSize(laneHeight: number, narrow = false): number {
  const share = laneHeight >= RIVER.twoRowsAt ? 0.38 : 0.7;
  const max = narrow ? RIVER.posterMaxPxNarrow : RIVER.posterMaxPx;
  return Math.round(
    Math.max(RIVER.posterMinPx, Math.min(max, laneHeight * share)),
  );
}

/** A frame's width: the pictures' own 16:9. */
export const frameWidth = (height: number): number =>
  Math.round(height * RIVER.frameAspect);

/** One elevation for every frame: a crisp contact shadow and a soft drop. */
const FRAME =
  'block overflow-hidden rounded-md bg-white/15 shadow-[0_1px_2px_rgba(0,0,0,0.4),0_6px_14px_-6px_rgba(0,0,0,0.6)]';

/**
 * A still, whole: the frame is the picture's own shape, so nothing is cut
 * away. It fades in over a soft placeholder as it loads; one that fails
 * tells its marker, which falls back to a dot (or drops it from a deck).
 */
function Picture({
  src,
  width,
  height,
  onFail,
}: {
  src: string;
  width: number;
  height: number;
  onFail: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <span className={FRAME} style={{ width, height }}>
      <img
        alt=""
        className={cn(
          'size-full object-cover transition-opacity duration-200 [transition-timing-function:var(--ease-out)]',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
        decoding="async"
        draggable={false}
        height={height}
        loading="lazy"
        src={src}
        width={width}
        onError={onFail}
        // YouTube answers a removed video with a 120×90 grey placeholder
        // rather than an error.
        onLoad={(e) => {
          if (e.currentTarget.naturalWidth <= 120) onFail();
          else setLoaded(true);
        }}
      />
    </span>
  );
}

function Dot() {
  return (
    <span className="block size-2.5 rounded-full bg-white/85 shadow-[0_0_0_3px_rgba(0,0,0,0.15)] transition-transform group-hover:scale-150" />
  );
}

function CountBadge({ n }: { n: number }) {
  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold leading-none text-atlas-page shadow-[0_1px_3px_rgba(0,0,0,0.35)]">
      {countLabel(n)}
    </span>
  );
}

/** One event: its still, or a dot if it has none that loads. */
function PosterMarker({
  src,
  width,
  height,
}: {
  src: string;
  width: number;
  height: number;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Dot />;
  return (
    <span className="block transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-hover:scale-[1.06]">
      <Picture
        height={height}
        src={src}
        width={width}
        onFail={() => setFailed(true)}
      />
    </span>
  );
}

/**
 * A cluster: a small deck of its stills, the first in front and whole, the
 * others peeking out behind it, with the count at the front's corner.
 */
function DeckMarker({
  covers,
  count,
  width,
  height,
}: {
  covers: readonly TimelineEvent[];
  count: number;
  width: number;
  height: number;
}) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const shown = covers.filter((t) => !failed.has(t.event.id));
  const step = Math.max(3, Math.round(height * RIVER.deckStep));
  const back = shown.length - 1;
  const fail = (id: string) => setFailed((f) => new Set(f).add(id));
  return (
    <span
      className="relative block transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-hover:scale-[1.06]"
      style={{ width: width + 2 * step, height: height + 2 * step }}
    >
      {shown.length === 0 ? (
        <span
          className={cn(FRAME, 'absolute bottom-0 left-0')}
          style={{ width, height }}
        />
      ) : (
        // Back to front, so the first still is on top.
        [...shown].reverse().map((t, r) => {
          const depth = back - r;
          return (
            <span
              key={t.event.id}
              className={cn('absolute', depth > 0 && 'brightness-[0.6]')}
              style={{ left: depth * step, bottom: depth * step }}
            >
              <Picture
                height={height}
                src={eventImage(t.event, 'lane')!}
                width={width}
                onFail={() => fail(t.event.id)}
              />
            </span>
          );
        })
      )}
      <span
        className="absolute"
        style={{ left: width - 14, top: 2 * step + height - 12 }}
      >
        <CountBadge n={count} />
      </span>
    </span>
  );
}

/**
 * The river's events: a 16:9 still for one event, a deck of stills with a
 * count for a cluster, a plain count where the picture budget has run out,
 * a dot for an event with no picture. Real buttons, one of them in
 * the tab order at a time (TimeRiver roves the rest with the arrow keys).
 */
export const RiverMarkers = memo(function RiverMarkers({
  markers,
  top,
  laneHeight,
  narrow,
  focusedKey,
  onActivate,
  onHover,
  onFocusKey,
}: {
  markers: readonly PlacedMarker[];
  top: number;
  laneHeight: number;
  narrow: boolean;
  focusedKey: string | null;
  onActivate: (cluster: RiverCluster<TimelineEvent>, el: HTMLElement) => void;
  onHover: (
    cluster: RiverCluster<TimelineEvent> | null,
    el: HTMLElement | null,
  ) => void;
  onFocusKey: (key: string) => void;
}) {
  const height = posterSize(laneHeight, narrow);
  const width = frameWidth(height);
  const tabKey = focusedKey ?? markers[0]?.cluster.key;
  return (
    <>
      {markers.map(({ cluster, y, kind }) => {
        const { title, detail } = describeCluster(cluster);
        const dot = kind === 'dot';
        return (
          <button
            key={cluster.key}
            aria-label={`${title}, ${detail}`}
            className={cn(
              'atlas-river-item group flex items-center justify-center',
              dot
                ? 'size-6 rounded-full'
                : kind === 'count'
                  ? 'rounded-full'
                  : 'rounded-md',
              ATLAS_FOCUS_ON_BAND,
            )}
            data-river-item={cluster.key}
            style={
              {
                '--yr': cluster.year,
                '--y': `${y}px`,
                top,
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
            {kind === 'poster' ? (
              <PosterMarker
                height={height}
                src={eventImage(cluster.items[0].event, 'lane')!}
                width={width}
              />
            ) : kind === 'stack' ? (
              <DeckMarker
                count={cluster.items.length}
                covers={coversOf(cluster, RIVER.stackPosters)}
                height={height}
                width={width}
              />
            ) : kind === 'count' ? (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-black/20 px-2 text-xs font-bold text-white ring-1 ring-inset ring-white/30 transition-[background-color] duration-150 group-hover:bg-black/40">
                {countLabel(cluster.items.length)}
              </span>
            ) : (
              <Dot />
            )}
          </button>
        );
      })}
    </>
  );
});
