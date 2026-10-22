import {
  memo,
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { cn } from '@/components/utilities';
import { useTimelineTracks } from '@/daw/components/Timeline/timelineGeometry';
import { pauseFollow } from '@/daw/editor/follow';
import { songLengthOf, timelineWidth } from '@/daw/editor/viewport';
import { clampZoom, fitZoom } from '@/daw/editor/zoom';
import { useStore } from '@/daw/store';
import { ticksPerBar } from '@/daw/time/timeModel';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { pixelsPerBeat, TICKS_PER_BEAT } from '@/daw/utils/timelineScale';

// ── The song at a glance, under the lanes (owner, 2026-10-22) ──────────────
//
// After Suno Studio's timeline strip: the whole song from its start to its
// end in minutes and seconds, and a lighter box over the part the lanes
// show. It follows the zoom however it changes (the footer's − and +, the
// keys, the wheel, Fit): zoomed in, the box narrows; zoomed out, it widens.
// - Drag the box: the view scrolls along the song.
// - Drag either edge of the box: the view zooms, the other edge staying put.
// - Click the strip outside the box: the view centres there.
// The student has taken the view, so Follow waits for Play or Stop. It took
// the place of the footer's scrollbar.

/** The box's edges take a press this far in (px) to resize it. */
const EDGE_PX = 6;
/** The box is never narrower than this (px), so its edges stay grabbable. */
const MIN_BOX_PX = 16;
/** The labels' steps, in seconds: the first that leaves room between them. */
const LABEL_STEPS = [1, 2, 5, 10, 15, 20, 30, 60, 120, 300, 600];
/** The least room (px) between two labels. */
const LABEL_MIN_PX = 64;
/** No label or tick starts this near the strip's end (px). */
const LABEL_END_PX = 40;
/** Small ticks between two labels. */
const TICKS_BETWEEN = 4;

/** 'm:ss' as Suno writes it, two-digit minutes ('00:20', '01:40'). */
export function clockText(seconds: number): string {
  const whole = Math.round(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** The label step for a strip `width` px wide showing `seconds` of song. */
export function labelStep(seconds: number, width: number): number {
  if (seconds <= 0 || width <= 0) return LABEL_STEPS[0];
  const perPx = seconds / width;
  return (
    LABEL_STEPS.find((step) => step / perPx >= LABEL_MIN_PX) ??
    LABEL_STEPS[LABEL_STEPS.length - 1]
  );
}

export const TimelineOverview = memo(function TimelineOverview() {
  const tracks = useTimelineTracks();
  const zoom = useStore((s) => s.timelineZoom);
  const scrollLeft = useStore((s) => s.timelineScrollLeft);
  const bpm = useStore((s) => s.bpm);
  const tsNum = useStore((s) => s.timeSignatureNumerator);
  const tsDen = useStore((s) => s.timeSignatureDenominator);
  const sections = useStore((s) => s.sections);
  const [width, setWidth] = useState(0);
  const observer = useRef<ResizeObserver | null>(null);

  // The strip's own width; a resize re-renders it, and the lanes' width
  // (timelineWidth) is read again then.
  const measure = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    if (!el) return;
    setWidth(el.clientWidth);
    observer.current = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.current.observe(el);
  }, []);

  const ppb = pixelsPerBeat(zoom);
  const view = timelineWidth() || width;
  const viewStart = (scrollLeft / ppb) * TICKS_PER_BEAT;
  const viewTicks = (view / ppb) * TICKS_PER_BEAT;
  const song = songLengthOf(
    tracks,
    ticksPerBar({ numerator: tsNum, denominator: tsDen }),
    sections,
  );
  // The strip spans the song, or the view where it goes past the song's end.
  const total = Math.max(song, viewStart + viewTicks, 1);
  const pxPerTick = width > 0 ? width / total : 0;
  const secondsPerTick = 60 / (Math.max(1, bpm) * TICKS_PER_BEAT);

  const boxW = Math.max(MIN_BOX_PX, viewTicks * pxPerTick);
  const boxLeft = Math.min(viewStart * pxPerTick, Math.max(0, width - boxW));

  /** Shows the ticks from `start` across the lanes: scroll, and zoom too
   *  when `span` is given. */
  const showFrom = (start: number, span?: number) => {
    const s = useStore.getState();
    pauseFollow();
    const nextZoom =
      span === undefined
        ? s.timelineZoom
        : clampZoom(fitZoom(view, Math.max(1, span)));
    if (nextZoom !== s.timelineZoom) s.setTimelineZoom(nextZoom);
    const px = (Math.max(0, start) / TICKS_PER_BEAT) * pixelsPerBeat(nextZoom);
    s.setTimelineScrollLeft(px);
  };

  const tickAt = (clientX: number, el: HTMLElement) =>
    pxPerTick > 0 ? (clientX - el.getBoundingClientRect().left) / pxPerTick : 0;

  /** A press on the box: its middle moves it, an edge resizes it. */
  const onBoxDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || pxPerTick <= 0) return;
    e.preventDefault();
    e.stopPropagation();
    const box = e.currentTarget;
    const strip = box.parentElement as HTMLElement;
    const x = e.clientX - box.getBoundingClientRect().left;
    const mode =
      x <= EDGE_PX ? 'start' : x >= box.clientWidth - EDGE_PX ? 'end' : 'move';
    const start = viewStart;
    const end = viewStart + viewTicks;
    const grab = tickAt(e.clientX, strip) - start;
    // A tick's least span: one beat, so the view never shrinks to nothing.
    const least = TICKS_PER_BEAT;
    box.setPointerCapture?.(e.pointerId);
    const onMove = (m: PointerEvent) => {
      const t = tickAt(m.clientX, strip);
      if (mode === 'move') showFrom(Math.min(t - grab, total - viewTicks));
      else if (mode === 'start') {
        const from = Math.max(0, Math.min(t, end - least));
        showFrom(from, end - from);
      } else {
        const to = Math.max(t, start + least);
        showFrom(start, to - start);
      }
    };
    const onUp = () => {
      box.removeEventListener('pointermove', onMove);
      box.removeEventListener('pointerup', onUp);
      box.removeEventListener('pointercancel', onUp);
    };
    box.addEventListener('pointermove', onMove);
    box.addEventListener('pointerup', onUp);
    box.addEventListener('pointercancel', onUp);
  };

  /** A click on the strip outside the box: the view centres there. */
  const onStripDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || pxPerTick <= 0) return;
    showFrom(tickAt(e.clientX, e.currentTarget) - viewTicks / 2);
  };

  // The labels, and the small ticks between them.
  const seconds = total * secondsPerTick;
  const step = labelStep(seconds, width);
  const marks: { x: number; label: string | null }[] = [];
  if (pxPerTick > 0) {
    const minor = step / TICKS_BETWEEN;
    for (let i = 0; i * minor <= seconds; i++) {
      const at = i * minor;
      const x = (at / secondsPerTick) * pxPerTick;
      // A label too near the strip's end would run into the one before it.
      if (x > width - LABEL_END_PX) break;
      marks.push({
        x,
        label: i % TICKS_BETWEEN === 0 ? clockText(at) : null,
      });
    }
  }

  return (
    <div
      ref={measure}
      role="group"
      aria-label="Song overview"
      data-testid="timeline-overview"
      data-view-start={Math.round(viewStart)}
      data-view-ticks={Math.round(viewTicks)}
      className="relative h-6 w-full cursor-pointer select-none overflow-hidden"
      onPointerDown={onStripDown}
    >
      {/* The view, behind the labels as Suno draws it; the labels let a
          press through to it. */}
      <div
        data-testid="timeline-overview-view"
        aria-hidden
        className="group/box absolute inset-y-0.5 cursor-grab rounded-[var(--daw-radius-sm)] bg-daw-hover active:cursor-grabbing"
        style={{ left: boxLeft, width: boxW }}
        onPointerDown={onBoxDown}
      >
        {/* The edges: grab to zoom. */}
        <span className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize" />
        <span className="absolute inset-y-1 left-0.5 w-0.5 rounded-full bg-daw-text-3 opacity-0 group-hover/box:opacity-100" />
        <span className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize" />
        <span className="absolute inset-y-1 right-0.5 w-0.5 rounded-full bg-daw-text-3 opacity-0 group-hover/box:opacity-100" />
      </div>
      {marks.map((mark) =>
        mark.label ? (
          <span
            key={mark.x}
            aria-hidden
            className={cn(
              TYPE_CLASS.label,
              'pointer-events-none absolute top-1/2 -translate-y-1/2 tabular-nums text-daw-text-3',
            )}
            style={{ left: mark.x }}
          >
            {mark.label}
          </span>
        ) : (
          <span
            key={mark.x}
            aria-hidden
            className="pointer-events-none absolute top-1/2 h-1.5 w-px -translate-y-1/2 bg-daw-hairline"
            style={{ left: mark.x }}
          />
        ),
      )}
    </div>
  );
});
