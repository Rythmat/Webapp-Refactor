// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import type { RefObject } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// ── Lesson anchors over the canvas (TimelineAnchors) ───────────────────────
// Invisible, pointer-transparent boxes where the canvas draws each lane,
// clip, each lane's end (just after its last clip), the ruler, the loop
// strip and region and the chord lane, placed from
// the track list's row layout and the canvas's clip geometry, so a lesson
// step can point at what is only pixels.
//
// Run: npx vitest run src/daw/components/Timeline/__tests__/timelineAnchors.test.tsx

import {
  CHORD_LANE_PX,
  LANE_HEADER_PX,
  RULER_PX,
  TRACK_ROW_PX,
} from '@/daw/shell/tracklist/rowLayout';
import { useStore } from '@/daw/store';
import { LOOP_STRIP_H } from '@/daw/utils/rulerLoop';
import { pixelsPerBeat, TICKS_PER_BEAT } from '@/daw/utils/timelineScale';
import { CLIP_INSET, MIN_MIDI_CLIP_PX } from '../timelineGeometry';
import { TimelineAnchors } from '../TimelineAnchors';

const s = () => useStore.getState();
const box = (id: string) => {
  const el = document.querySelector<HTMLElement>(`[data-tutorial-id="${id}"]`);
  if (!el) return null;
  const { left, top, width, height } = el.style;
  return {
    left: parseFloat(left),
    top: parseFloat(top),
    width: parseFloat(width),
    height: parseFloat(height),
  };
};

let keys = '';
let drums = '';

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  useStore.setState({
    timelineZoom: 1,
    timelineScrollLeft: 0,
    loopStart: 0,
    loopEnd: TICKS_PER_BEAT * 8,
  });
  keys = s().addTrack('midi', 'piano-sampler', 'Keys');
  drums = s().addTrack('midi', 'drum-machine', 'Drums');
  s().addMidiClip(keys, {
    id: 'verse',
    startTick: TICKS_PER_BEAT * 4,
    events: [
      { note: 60, velocity: 90, startTick: 0, durationTicks: 1920, channel: 0 },
    ],
  });
  s().addMidiClip(drums, {
    id: 'hit',
    startTick: 0,
    events: [
      { note: 36, velocity: 90, startTick: 0, durationTicks: 10, channel: 9 },
    ],
  });
});
afterEach(cleanup);

function renderAnchors(scrollTop = 0, width = 2000) {
  const scroller = document.createElement('div');
  Object.defineProperty(scroller, 'scrollTop', { value: scrollTop });
  const scrollRef = { current: scroller } as RefObject<HTMLDivElement>;
  render(<TimelineAnchors scrollRef={scrollRef} viewportWidth={width} />);
}

describe('the anchors over the canvas', () => {
  it('box each lane under the rulers, one row each', () => {
    renderAnchors();
    expect(box('timeline-lane-0')).toEqual({
      left: 0,
      top: LANE_HEADER_PX,
      width: 2000,
      height: TRACK_ROW_PX,
    });
    expect(box('timeline-lane-1')?.top).toBe(LANE_HEADER_PX + TRACK_ROW_PX);
  });

  it('box each clip where the canvas draws it, by track and index', () => {
    renderAnchors();
    const ppb = pixelsPerBeat(1);
    expect(box('timeline-clip-0-0')).toEqual({
      left: 4 * ppb,
      top: LANE_HEADER_PX + CLIP_INSET,
      width: 4 * ppb,
      height: TRACK_ROW_PX - CLIP_INSET * 2,
    });
    // A short note clip is never drawn under its minimum width.
    expect(box('timeline-clip-1-0')?.width).toBeGreaterThanOrEqual(
      MIN_MIDI_CLIP_PX,
    );
    expect(box('timeline-clip-selected')).toBeNull();
    act(() => s().setSelectedClip('verse', keys));
    expect(box('timeline-clip-selected')).toEqual(box('timeline-clip-0-0'));
  });

  it('box the stretch just after each lane’s last clip, half a beat wide', () => {
    renderAnchors();
    const ppb = pixelsPerBeat(1);
    // Where a right-click opens Paste here on the bar line the clip ends on.
    expect(box('timeline-lane-end-0')).toEqual({
      left: 8 * ppb,
      top: LANE_HEADER_PX + CLIP_INSET,
      width: ppb / 2,
      height: TRACK_ROW_PX - CLIP_INSET * 2,
    });
    // After a short clip as it is drawn, not its notes.
    const hit = box('timeline-clip-1-0')!;
    expect(box('timeline-lane-end-1')?.left).toBe(hit.left + hit.width);
    // A lane with no clips has none.
    act(() => {
      s().addTrack('midi', 'piano-sampler', 'Empty');
    });
    expect(box('timeline-lane-2')).not.toBeNull();
    expect(box('timeline-lane-end-2')).toBeNull();
  });

  it('box no lane end out of sight', () => {
    // The window ends where the keys' clip does.
    renderAnchors(0, 8 * pixelsPerBeat(1));
    expect(box('timeline-lane-end-0')).toBeNull();
    expect(box('timeline-lane-end-1')).not.toBeNull();
  });

  it('keep the rulers and the loop at the top of the scrolled lanes', () => {
    renderAnchors(40);
    expect(box('timeline-ruler')).toMatchObject({ top: 40, height: RULER_PX });
    expect(box('timeline-loop-strip')).toMatchObject({
      top: 40,
      height: LOOP_STRIP_H,
    });
    expect(box('timeline-chord-lane')).toMatchObject({
      top: 40 + RULER_PX,
      height: CHORD_LANE_PX,
    });
    expect(box('loop-region')).toMatchObject({
      left: 0,
      width: 8 * pixelsPerBeat(1),
    });
  });

  it('let every click through', () => {
    renderAnchors();
    const root = document.querySelector('[data-testid="timeline-anchors"]');
    expect(root).toHaveClass('pointer-events-none');
    expect(root).toHaveAttribute('aria-hidden', 'true');
  });
});
