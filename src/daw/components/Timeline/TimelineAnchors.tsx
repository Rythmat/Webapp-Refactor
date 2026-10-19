import { memo, useEffect, useState, type CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore, type AllSlices } from '@/daw/store';
import { LOOP_STRIP_H } from '@/daw/utils/rulerLoop';
import {
  TICKS_PER_BEAT,
  pixelsPerBeat,
  tickToPixel,
} from '@/daw/utils/timelineScale';
import { midiClipLength } from './midiClipCuts';

// ── Lesson anchors over the timeline canvas ─────────────────────────────────
//
// The timeline draws its rulers, lanes and clips on a canvas, which a lesson
// step cannot point at. These are boxes laid over it, invisible and
// pointer-transparent, each with a `data-tutorial-id`, so a step can
// spotlight a clip, a track's lane, the bar ruler, the loop strip, the loop
// region or the chord lane. Clicks go straight through to the canvas.
//
// They follow the store, not the drawing: a clip is boxed where it sits, not
// where a drag is taking it. The rulers stay at the top while the lanes
// scroll, as the canvas draws them (the scroll container's scrollTop).

export interface TimelineGeometry {
  trackHeight: number;
  rulerHeight: number;
  chordRulerHeight: number;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface ClipBox extends Rect {
  track: number;
  clip: number;
  selected: boolean;
}

/** The visible clips' boxes, in canvas space, as the canvas draws them. */
function clipBoxes(
  state: AllSlices,
  geometry: TimelineGeometry,
  width: number,
): ClipBox[] {
  const { timelineZoom: zoom, timelineScrollLeft: scrollLeft } = state;
  const ppb = pixelsPerBeat(zoom);
  const rulers = geometry.rulerHeight + geometry.chordRulerHeight;
  return state.tracks.flatMap((track, t) => {
    const clips =
      track.type === 'audio'
        ? track.audioClips.map((clip) => ({
            id: clip.id,
            start: clip.startTick,
            length: clip.duration,
            minWidth: 0,
          }))
        : track.midiClips.map((clip) => ({
            id: clip.id,
            start: clip.startTick,
            length: midiClipLength(clip),
            // A note clip is never drawn under 20 px.
            minWidth: 20,
          }));
    return clips.flatMap((clip, c) => {
      const left = tickToPixel(clip.start, zoom, scrollLeft);
      const w = Math.max((clip.length / TICKS_PER_BEAT) * ppb, clip.minWidth);
      if (left + w <= 0 || left >= width) return [];
      return [
        {
          track: t,
          clip: c,
          selected: clip.id === state.selectedClipId,
          left,
          top: rulers + t * geometry.trackHeight + 2,
          width: w,
          height: geometry.trackHeight - 4,
        },
      ];
    });
  });
}

/** What the boxes are drawn from: a re-render when any of it changes. */
const drawnFrom = (s: AllSlices) => [
  s.tracks,
  s.timelineZoom,
  s.timelineScrollLeft,
  s.selectedClipId,
  s.loopStart,
  s.loopEnd,
];

const place = ({ left, top, width, height }: Rect): CSSProperties => ({
  left,
  top,
  width,
  height,
});

const BOX = 'pointer-events-none absolute';

export const TimelineAnchors = memo(function TimelineAnchors({
  geometry,
  width,
  scrollParent,
}: {
  geometry: TimelineGeometry;
  /** The canvas's width in px. */
  width: number;
  /** The element the timeline scrolls in, vertically. */
  scrollParent: () => HTMLElement | null;
}) {
  useStore(useShallow(drawnFrom));
  const state = useStore.getState();
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const el = scrollParent();
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScrollTop(el.scrollTop));
    };
    setScrollTop(el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('scroll', onScroll);
    };
  }, [scrollParent]);

  if (width <= 0) return null;
  const { trackHeight, rulerHeight, chordRulerHeight } = geometry;
  const rulers = rulerHeight + chordRulerHeight;
  const clips = clipBoxes(state, geometry, width);
  const selected = clips.find((box) => box.selected);
  const loopLeft = Math.max(
    0,
    tickToPixel(state.loopStart, state.timelineZoom, state.timelineScrollLeft),
  );
  const loopRight = Math.min(
    width,
    tickToPixel(state.loopEnd, state.timelineZoom, state.timelineScrollLeft),
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {state.tracks.map((track, t) => (
        <div
          key={track.id}
          data-tutorial-id={`timeline-lane-${t}`}
          className={BOX}
          style={place({
            left: 0,
            top: rulers + t * trackHeight,
            width,
            height: trackHeight,
          })}
        />
      ))}
      {clips.map((box) => (
        <div
          key={`${box.track}:${box.clip}`}
          data-tutorial-id={`timeline-clip-${box.track}-${box.clip}`}
          className={BOX}
          style={place(box)}
        />
      ))}
      {selected ? (
        <div
          data-tutorial-id="timeline-clip-selected"
          className={BOX}
          style={place(selected)}
        />
      ) : null}
      <div
        data-tutorial-id="timeline-ruler"
        className={BOX}
        style={place({ left: 0, top: scrollTop, width, height: rulerHeight })}
      />
      <div
        data-tutorial-id="timeline-loop-strip"
        className={BOX}
        style={place({ left: 0, top: scrollTop, width, height: LOOP_STRIP_H })}
      />
      {loopRight > loopLeft ? (
        <div
          data-tutorial-id="loop-region"
          className={BOX}
          style={place({
            left: loopLeft,
            top: scrollTop,
            width: loopRight - loopLeft,
            height: LOOP_STRIP_H,
          })}
        />
      ) : null}
      <div
        data-tutorial-id="timeline-chord-lane"
        className={BOX}
        style={place({
          left: 0,
          top: scrollTop + rulerHeight,
          width,
          height: chordRulerHeight,
        })}
      />
    </div>
  );
});
