import { Square } from 'lucide-react';
import {
  forwardRef,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { cn } from '@/components/utilities';
import { GraphCanvas, type GraphCanvasProps, sameShape } from './GraphCanvas';
import { gatherPerNode, revealGraph } from './model/timelapseGraph';
import {
  createTimelapsePlayer,
  type TimelapsePlayer,
  type TimelapseSnapshot,
} from './timelapsePlayer';
import { timelapseScope } from './useLayout';

/**
 * Cortex's "Animate": the whole Atlas growing year by year, from its
 * earliest dated item to the 2020s in about 30 seconds, with a year counter
 * on the graph.
 *
 * Obsidian replays a vault in the order its notes were made. The Atlas
 * replays history instead (`model/timelapse.ts`): each item appears in its
 * earliest year, an undated one (a city, a label) with the first thing it
 * is linked to, and a link once both its ends are showing. The player
 * (`timelapsePlayer.ts`) steps through the batches about twelve times a
 * second.
 *
 * `TimelapseCanvas` stands in for `GraphCanvas` and takes the same props.
 * While a run plays it hands the canvas the graph showing at the current
 * step instead of the whole one (`revealGraph`), with each step's colours
 * picked out of the whole graph's, as a layout run of its own
 * (`timelapseScope`). So the layout worker grows its simulation step by
 * step from nothing: each step's new nodes start beside the neighbours they
 * join and are pushed into place while the next ones arrive, and each dot
 * grows as its links come in. The camera keeps the growing graph framed
 * until the reader moves it. Nothing it does is cached.
 *
 * When the run ends, by Stop, Escape on the graph, or a moment after the
 * last year, the canvas gets the whole graph and the global scope back. The
 * layout then starts again from the positions it had settled at before the
 * run (kept in memory when the run began), so it is the same settled
 * picture, and the dots glide home to it with the camera
 * (`GraphCanvas`'s `TIMELAPSE_RESTORE_MS`).
 *
 * A run belongs to the graph it was planned over: if that graph changes
 * shape (a filter, a search, a save that added a link) the run stops. The
 * page stops it too when it leaves the global graph or the picture, and
 * offers none under reduced motion.
 */

export interface TimelapseCanvasProps extends GraphCanvasProps {
  /** The page's timelapse player (`useTimelapsePlayer`). */
  player: TimelapsePlayer;
}

/** The page's timelapse player, made once and stopped when the page goes. */
export function useTimelapsePlayer(): TimelapsePlayer {
  const [player] = useState(() => createTimelapsePlayer());
  useEffect(() => () => player.dispose(), [player]);
  return player;
}

/** The player's state, as React state. */
function useTimelapse(player: TimelapsePlayer): TimelapseSnapshot {
  return useSyncExternalStore(
    player.subscribe,
    player.getSnapshot,
    player.getSnapshot,
  );
}

/**
 * Whether a run is going. Only its start and end redraw the caller, never
 * its steps, so the page around the graph stays still while it plays.
 */
export function useTimelapseActive(player: TimelapsePlayer): boolean {
  const read = () => player.getSnapshot().status !== 'idle';
  return useSyncExternalStore(player.subscribe, read, read);
}

export const TimelapseCanvas = forwardRef<HTMLDivElement, TimelapseCanvasProps>(
  function TimelapseCanvas(
    { player, graph, colors, spotlight, scope, signature, onSettled, ...rest },
    ref,
  ) {
    const snapshot = useTimelapse(player);
    const running =
      snapshot.status !== 'idle' &&
      snapshot.graph !== null &&
      snapshot.plan !== null;
    // The plan numbers the nodes of the graph it was made for; a graph of
    // another shape cannot be grown from it.
    const fits = running && sameShape(snapshot.graph, graph);
    useEffect(() => {
      if (running && !fits) player.stop();
    }, [running, fits, player]);
    const active = running && fits;
    const plan = snapshot.plan;
    const batch = snapshot.batch;

    const revealed = useMemo(
      () => (active && plan ? revealGraph(graph, plan, batch) : null),
      [active, graph, plan, batch],
    );
    const drawnColors = useMemo(
      () => (revealed ? gatherPerNode(colors, revealed.source, 4) : colors),
      [revealed, colors],
    );
    const drawnSpotlight = useMemo(
      () =>
        revealed && spotlight
          ? gatherPerNode(spotlight, revealed.source)
          : spotlight,
      [revealed, spotlight],
    );

    // The page announces how a run ended ("…back as it was"); the global
    // graph then resumes at rest, which is not news, so the first "settled"
    // after a run is kept back rather than talk over that.
    const settledRef = useRef(onSettled);
    settledRef.current = onSettled;
    const handingBack = useRef(false);
    useEffect(
      () =>
        player.onEnd(() => {
          handingBack.current = true;
        }),
      [player],
    );
    const settled = useCallback(() => {
      if (handingBack.current) {
        handingBack.current = false;
        return;
      }
      settledRef.current?.();
    }, []);

    const { onKeyDown } = rest;
    const keyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (active && event.key === 'Escape') player.stop();
    };

    return (
      <GraphCanvas
        ref={ref}
        {...rest}
        graph={revealed?.graph ?? graph}
        colors={drawnColors}
        spotlight={drawnSpotlight}
        scope={active ? timelapseScope(snapshot.run) : scope}
        signature={active ? null : signature}
        // The grown picture settling is part of the show, not news.
        onSettled={active ? undefined : settled}
        onKeyDown={keyDown}
      />
    );
  },
);

const yearText = (year: number | null) => (year === null ? '' : String(year));

/**
 * The year counter over the graph while a timelapse plays: the year the
 * picture has reached, how far through it is, and Stop. It is not a live
 * region (a year twelve times a second would drown a screen reader); the page
 * says when a run starts and ends instead, and a reader who visits the
 * counter hears the year it shows.
 */
export function TimelapseCounter({
  player,
  onStop,
  className,
}: {
  player: TimelapsePlayer;
  onStop(): void;
  className?: string;
}) {
  const { status, year, progress } = useTimelapse(player);
  if (status === 'idle') return null;
  const percent = Math.round(progress * 100);
  return (
    <div
      role="group"
      aria-label="Timelapse"
      data-timelapse=""
      className={cn(
        'absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-popover/90 py-1.5 pl-4 pr-1.5 shadow-lg',
        className,
      )}
    >
      <span
        data-timelapse-year=""
        className="min-w-[5ch] text-center text-[22px] leading-none tracking-wide text-foreground tabular-nums"
      >
        {yearText(year)}
      </span>
      <div
        role="progressbar"
        aria-label="Timelapse progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1 w-28 overflow-hidden rounded-full bg-white/10"
      >
        <div
          className="h-full rounded-full bg-foreground/70"
          style={{ width: `${percent}%` }}
        />
      </div>
      <button
        type="button"
        onClick={onStop}
        className="flex h-7 items-center gap-1.5 rounded-full px-3 text-xs text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <Square aria-hidden className="size-3 fill-current" />
        Stop
      </button>
    </div>
  );
}
