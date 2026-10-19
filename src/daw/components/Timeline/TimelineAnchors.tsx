import {
  memo,
  useEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  CHORD_LANE_PX,
  LANE_HEADER_PX,
  RULER_PX,
  rowLayoutOf,
} from '@/daw/shell/tracklist/rowLayout';
import { useStore, type AllSlices } from '@/daw/store';
import type { Track } from '@/daw/store/tracksSlice';
import { LOOP_STRIP_H } from '@/daw/utils/rulerLoop';
import {
  TICKS_PER_BEAT,
  pixelsPerBeat,
  tickToPixel,
} from '@/daw/utils/timelineScale';
import { midiClipLength } from './midiClipCuts';
import {
  CLIP_INSET,
  MIN_MIDI_CLIP_PX,
  useTimelineTracks,
} from './timelineGeometry';

// ── Lesson anchors over the timeline canvas ─────────────────────────────────
//
// The timeline draws its rulers, lanes and clips on a canvas, which a lesson
// step cannot point at. These are boxes laid over it, invisible and
// pointer-transparent, each with a `data-tutorial-id`, so a step can
// spotlight a clip, a track's lane, the empty stretch just after a lane's
// last clip, the bar ruler, the loop strip, the loop region or the chord
// lane. Clicks go straight through to the canvas.
//
// They are placed as the Edit pill is (ClipEditPill), in the canvas's own
// coordinates from the track list's row layout (rowLayout.ts) and the
// clip geometry the canvas draws with (timelineGeometry.ts), so they scroll
// with the lanes; the rulers stay at the top of the lanes' scroller
// (TrackArea), as the canvas draws them. They follow the store, not the
// drawing: a clip is boxed where it sits, not where a drag is taking it.

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface ClipAnchor extends Rect {
  track: number;
  clip: number;
  selected: boolean;
}

/** A track's clips as the canvas spans them: start, length, least width. */
function clipSpans(track: Track) {
  return track.type === 'audio'
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
        minWidth: MIN_MIDI_CLIP_PX,
      }));
}

/** The clips in sight, boxed as the canvas draws them, by track and index. */
function clipAnchors(
  tracks: readonly Track[],
  selectedClipId: string | null,
  zoom: number,
  scrollLeft: number,
  width: number,
): ClipAnchor[] {
  const rows = rowLayoutOf(tracks);
  const ppb = pixelsPerBeat(zoom);
  return tracks.flatMap((track, t) => {
    const clips = clipSpans(track);
    return clips.flatMap((clip, c) => {
      const left = tickToPixel(clip.start, zoom, scrollLeft);
      const w = Math.max((clip.length / TICKS_PER_BEAT) * ppb, clip.minWidth);
      if (left + w <= 0 || left >= width) return [];
      return [
        {
          track: t,
          clip: c,
          selected: clip.id === selectedClipId,
          left,
          top: LANE_HEADER_PX + rows.tops[t] + CLIP_INSET,
          width: w,
          height: rows.heights[t] - CLIP_INSET * 2,
        },
      ];
    });
  });
}

interface LaneEndAnchor extends Rect {
  track: number;
}

/**
 * Each lane's empty stretch right after its last clip, half a beat wide,
 * while in sight: where a right-click opens the lane's menu (Paste here) at
 * the bar line the clip ends on, as the grid snaps it. A lane with no clips
 * has none.
 */
function laneEndAnchors(
  tracks: readonly Track[],
  zoom: number,
  scrollLeft: number,
  width: number,
): LaneEndAnchor[] {
  const rows = rowLayoutOf(tracks);
  const ppb = pixelsPerBeat(zoom);
  const boxWidth = ppb / 2;
  return tracks.flatMap((track, t) => {
    const clips = clipSpans(track);
    if (clips.length === 0) return [];
    const right = Math.max(
      ...clips.map(
        (clip) =>
          tickToPixel(clip.start, zoom, scrollLeft) +
          Math.max((clip.length / TICKS_PER_BEAT) * ppb, clip.minWidth),
      ),
    );
    if (right < 0 || right + boxWidth > width) return [];
    return [
      {
        track: t,
        left: right,
        top: LANE_HEADER_PX + rows.tops[t] + CLIP_INSET,
        width: boxWidth,
        height: rows.heights[t] - CLIP_INSET * 2,
      },
    ];
  });
}

/** What the boxes are drawn from, besides the tracks' geometry. */
const drawnFrom = (s: AllSlices) => [
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

export interface TimelineAnchorsProps {
  /** The lanes' scroller (TrackArea), for its vertical scroll. */
  scrollRef: RefObject<HTMLDivElement>;
  /** The canvas's width, px. */
  viewportWidth: number;
}

export const TimelineAnchors = memo(function TimelineAnchors({
  scrollRef,
  viewportWidth: width,
}: TimelineAnchorsProps) {
  const tracks = useTimelineTracks();
  const [zoom, scrollLeft, selectedClipId, loopStart, loopEnd] = useStore(
    useShallow(drawnFrom),
  ) as [number, number, string | null, number, number];

  // The rulers sit at the scroller's top, over the lanes.
  const [scrollTop, setScrollTop] = useState(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let frame = 0;
    const read = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScrollTop(el.scrollTop));
    };
    setScrollTop(el.scrollTop);
    el.addEventListener('scroll', read, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('scroll', read);
    };
  }, [scrollRef]);

  if (width <= 0) return null;
  const rows = rowLayoutOf(tracks);
  const clips = clipAnchors(tracks, selectedClipId, zoom, scrollLeft, width);
  const selected = clips.find((box) => box.selected);
  const laneEnds = laneEndAnchors(tracks, zoom, scrollLeft, width);
  const loopLeft = Math.max(0, tickToPixel(loopStart, zoom, scrollLeft));
  const loopRight = Math.min(width, tickToPixel(loopEnd, zoom, scrollLeft));

  return (
    <div
      aria-hidden
      data-testid="timeline-anchors"
      className="pointer-events-none absolute inset-0"
    >
      {tracks.map((track, t) => (
        <div
          key={track.id}
          data-tutorial-id={`timeline-lane-${t}`}
          className={BOX}
          style={place({
            left: 0,
            top: LANE_HEADER_PX + rows.tops[t],
            width,
            height: rows.heights[t],
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
      {laneEnds.map((box) => (
        <div
          key={`end:${box.track}`}
          data-tutorial-id={`timeline-lane-end-${box.track}`}
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
        style={place({ left: 0, top: scrollTop, width, height: RULER_PX })}
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
          top: scrollTop + RULER_PX,
          width,
          height: CHORD_LANE_PX,
        })}
      />
    </div>
  );
});
