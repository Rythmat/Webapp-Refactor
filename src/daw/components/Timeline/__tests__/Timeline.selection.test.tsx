// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

// ── Drag-to-select for the prompt bar (owner, 2026-10-23) ─────────────────
// A plain drag in empty lane space selects the bars it crosses, whole, on
// the lane it started in — below the last lane, a new track — and the
// prompt bar takes that as its spot. The drag still selects notes for
// Insight; a ⌘-drag selects notes only; a click clears the selection (and
// seeks, as before). Across a MIDI clip's notes a drag highlights bars on
// its track too; the clip moves only by its title strip (owner, 2026-10-24).
// Run:
// npx vitest run src/daw/components/Timeline/__tests__/Timeline.selection.test.tsx

const h = vi.hoisted(() => ({ seeks: [] as number[] }));
vi.mock('@/hooks/useIsPremium', () => ({
  useIsPremium: () => ({ isPremium: true, isLoading: false }),
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => () => {} }));
vi.mock('@/daw/hooks/useTransport', () => ({
  seekTo: (tick: number) => {
    h.seeks.push(tick);
  },
}));

import { usePromptBarStore } from '@/daw/shell/prompt/promptBarStore';
import { LANE_HEADER_PX, TRACK_ROW_PX } from '@/daw/shell/tracklist/rowLayout';
import { useStore } from '@/daw/store';
import { installDomShims } from '@/daw/ui/__tests__/dom';
import { tickToPixel } from '@/daw/utils/timelineScale';
import { CLIP_INSET } from '../timelineGeometry';
import { ScrolledTimeline } from './scrolledTimeline';

const BAR = 1920;
const s = () => useStore.getState();
const selection = () => usePromptBarStore.getState().selection;

/** A 2D context that paints nothing. */
function quietContext() {
  const state: Record<string | symbol, unknown> = {};
  return new Proxy(state, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return () => ({ width: 10 });
      return () => ({ addColorStop() {} });
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
}

const clientWidth = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'clientWidth',
);
const getContext = HTMLCanvasElement.prototype.getContext;
beforeAll(() => {
  installDomShims();
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => 1200,
  });
  HTMLCanvasElement.prototype.getContext = (() =>
    quietContext()) as unknown as typeof getContext;
});
afterAll(() => {
  if (clientWidth) {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', clientWidth);
  }
  HTMLCanvasElement.prototype.getContext = getContext;
});

let keys = '';
let bass = '';
beforeEach(() => {
  h.seeks = [];
  useStore.setState(useStore.getInitialState(), true);
  useStore.setState({
    currentView: 'arrange',
    activeTool: 'cursor',
    timelineZoom: 1,
    timelineScrollLeft: 0,
    timelineSnapEnabled: true,
    timelineGridSize: '1/4',
    position: 0,
  });
  keys = s().addTrack('midi', 'soundfont', 'Keys');
  bass = s().addTrack('midi', 'soundfont', 'Bass', { trackRole: 'bass' });
  usePromptBarStore.setState({ selection: null, laneSpot: null });
});
afterEach(cleanup);

const canvas = () => document.querySelector('canvas')!;
/** The middle of lane `row`, in the canvas's own px. */
const laneY = (row: number) =>
  LANE_HEADER_PX + row * TRACK_ROW_PX + TRACK_ROW_PX / 2;
const x = (tick: number) => tickToPixel(tick, 1, 0);
const drag = (from: number, to: number, y: number, meta = false) => {
  fireEvent.mouseDown(canvas(), {
    clientX: from,
    clientY: y,
    button: 0,
    metaKey: meta,
  });
  fireEvent.mouseMove(canvas(), {
    clientX: from + 10,
    clientY: y,
    metaKey: meta,
  });
  fireEvent.mouseMove(canvas(), { clientX: to, clientY: y, metaKey: meta });
  fireEvent.mouseUp(canvas(), {
    clientX: to,
    clientY: y,
    button: 0,
    metaKey: meta,
  });
};

describe('drag-to-select', () => {
  it('selects the bars a drag crosses, whole, on the lane it started in', () => {
    render(<ScrolledTimeline />);
    // From the middle of bar 3 to the middle of bar 5, on the Bass lane.
    drag(x(2.5 * BAR), x(4.5 * BAR), laneY(1));
    expect(selection()).toEqual({
      startTick: 2 * BAR,
      endTick: 5 * BAR,
      trackId: bass,
    });
    // Backwards works too, on Keys.
    drag(x(6.2 * BAR), x(5.1 * BAR), laneY(0));
    expect(selection()).toEqual({
      startTick: 5 * BAR,
      endTick: 7 * BAR,
      trackId: keys,
    });
  });

  it('targets a new track below the last lane', () => {
    render(<ScrolledTimeline />);
    drag(x(0.2 * BAR), x(1.5 * BAR), laneY(2));
    expect(selection()).toEqual({
      startTick: 0,
      endTick: 2 * BAR,
      trackId: null,
    });
  });

  it('leaves a ⌘-drag to the note marquee, and a click clears the selection', () => {
    render(<ScrolledTimeline />);
    drag(x(1.2 * BAR), x(3.5 * BAR), laneY(0), true);
    expect(selection()).toBeNull();
    drag(x(1.2 * BAR), x(3.5 * BAR), laneY(0));
    expect(selection()).not.toBeNull();
    fireEvent.mouseDown(canvas(), {
      clientX: x(8 * BAR),
      clientY: laneY(0),
      button: 0,
    });
    fireEvent.mouseUp(canvas(), {
      clientX: x(8 * BAR),
      clientY: laneY(0),
      button: 0,
    });
    expect(selection()).toBeNull();
    expect(h.seeks.length).toBe(1);
  });
});

describe('a drag across a MIDI clip', () => {
  const bassClip = () => s().tracks.find((t) => t.id === bass)!.midiClips[0];
  beforeEach(() => {
    s().addMidiClip(bass, {
      id: 'bass-1',
      startTick: 0,
      durationTicks: 8 * BAR,
      events: [
        {
          note: 40,
          velocity: 90,
          startTick: 0,
          durationTicks: 480,
          channel: 0,
        },
      ],
    });
  });

  it('highlights the bars its notes are dragged across, and leaves the clip', () => {
    render(<ScrolledTimeline />);
    drag(x(2.5 * BAR), x(4.5 * BAR), laneY(1) + 8);
    expect(selection()).toEqual({
      startTick: 2 * BAR,
      endTick: 5 * BAR,
      trackId: bass,
    });
    expect(bassClip().startTick).toBe(0);
    // No notes picked up for Insight on the way.
    expect(s().selectedNotes ?? []).toHaveLength(0);
  });

  it('moves the clip by its title strip', () => {
    render(<ScrolledTimeline />);
    const strip = LANE_HEADER_PX + TRACK_ROW_PX + CLIP_INSET + 6;
    drag(x(1 * BAR), x(3 * BAR), strip);
    expect(bassClip().startTick).toBe(2 * BAR);
    expect(selection()).toBeNull();
  });
});
