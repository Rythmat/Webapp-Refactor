import { memo, useCallback, useRef, useState, type PointerEvent } from 'react';
import { useTimelineTracks } from '@/daw/components/Timeline/timelineGeometry';
import { pauseFollow } from '@/daw/editor/follow';
import { songLengthOf } from '@/daw/editor/viewport';
import { useStore } from '@/daw/store';
import { ticksPerBar } from '@/daw/time/timeModel';
import { pixelsPerBeat, TICKS_PER_BEAT } from '@/daw/utils/timelineScale';

// ── The timeline's scrollbar (milestone 2.6) ───────────────────────────────
//
// The footer under the lanes, where it costs them no height; it has the
// footer to itself since Master moved to the bottom rail (B4a). Always
// shown: when the song fits, the thumb fills the track. Dragging the thumb
// scrolls; a click on the track moves a page. The student has taken the
// view, so Follow waits for Play or Stop.

const MIN_THUMB_PX = 30;

export const TimelineScrollbar = memo(function TimelineScrollbar() {
  const tracks = useTimelineTracks();
  const zoom = useStore((s) => s.timelineZoom);
  const scrollLeft = useStore((s) => s.timelineScrollLeft);
  const tsNum = useStore((s) => s.timeSignatureNumerator);
  const tsDen = useStore((s) => s.timeSignatureDenominator);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const observer = useRef<ResizeObserver | null>(null);

  // The track is as wide as the lanes above it.
  const measure = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    trackRef.current = el;
    if (!el) return;
    setWidth(el.clientWidth);
    observer.current = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.current.observe(el);
  }, []);

  const song = songLengthOf(
    tracks,
    ticksPerBar({ numerator: tsNum, denominator: tsDen }),
  );
  const content = (song / TICKS_PER_BEAT) * pixelsPerBeat(zoom);
  const scrollable = width > 0 && content > width;
  const maxScroll = Math.max(1, content - width);
  const thumb = scrollable
    ? Math.max(MIN_THUMB_PX, (width / content) * width)
    : width;
  const left = scrollable
    ? (Math.min(scrollLeft, maxScroll) / maxScroll) * (width - thumb)
    : 0;

  const scrollTo = (px: number) => {
    pauseFollow();
    useStore
      .getState()
      .setTimelineScrollLeft(Math.max(0, Math.min(maxScroll, px)));
  };

  const onThumbDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!scrollable || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const start = useStore.getState().timelineScrollLeft;
    const onMove = (m: globalThis.PointerEvent) =>
      scrollTo(start + ((m.clientX - startX) / (width - thumb)) * maxScroll);
    const onUp = () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
  };

  const onTrackDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!scrollable || e.button !== 0) return;
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    scrollTo(scrollLeft + (x < left ? -width : width) * 0.9);
  };

  return (
    <div
      ref={measure}
      data-testid="timeline-scrollbar"
      className="relative h-3 w-full rounded-full bg-daw-meter-track"
      onPointerDown={onTrackDown}
    >
      <div
        aria-hidden
        className="absolute inset-y-0.5 rounded-full bg-daw-outline hover:bg-daw-focus"
        style={{
          width: thumb,
          left,
          cursor: scrollable ? 'grab' : 'default',
          opacity: scrollable ? 1 : 0.4,
        }}
        onPointerDown={onThumbDown}
      />
    </div>
  );
});
