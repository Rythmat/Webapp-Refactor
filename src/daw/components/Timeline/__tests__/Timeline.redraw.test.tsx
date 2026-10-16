// @vitest-environment jsdom
import { useEffect } from 'react';
import { DAW_PALETTE_EVENT } from '@/daw/ui/tokens';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
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

// ── Timeline redraws (timeline-07, timeline-10) ─────────────────────────────
// The canvas redrew on any change to the tracks array, a fader step or a
// rename included, once for every change, and drag previews were drawn only
// while the transport was stopped. Now everything asks for a redraw and the
// canvas is drawn at most once a frame, only for changes to what it shows,
// and a drag redraws while the transport plays.

const h = vi.hoisted(() => ({ commits: 0 }));
vi.mock('@/daw/dev/DevProfiler', () => ({
  useDevCommitCount: () => {
    useEffect(() => {
      h.commits += 1;
    });
  },
}));
vi.mock('@/hooks/useIsPremium', () => ({
  useIsPremium: () => ({ isPremium: true, isLoading: false }),
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => () => {} }));

import { useStore } from '@/daw/store';
import { tickToPixel } from '@/daw/utils/timelineScale';
import { LANE_HEADER_PX, TRACK_ROW_PX } from '@/daw/shell/tracklist/rowLayout';
import { ScrolledTimeline } from './scrolledTimeline';

const s = () => useStore.getState();
const VIEWPORT = 1200;
const ZOOM = 1;

/** Every canvas call, by method name. */
let calls: { name: string; args: unknown[] }[] = [];
/** Each draw opens with setTransform. */
const draws = () => calls.filter((c) => c.name === 'setTransform').length;
const lastDraw = () =>
  calls.slice(calls.map((c) => c.name).lastIndexOf('setTransform'));

/** A 2D context that records what is drawn and ignores the rest. */
function recordingContext() {
  const state: Record<string | symbol, unknown> = {};
  return new Proxy(state, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'measureText') {
        return (text: string) => ({ width: text.length * 6 });
      }
      return (...args: unknown[]) => {
        calls.push({ name: String(prop), args });
        return { addColorStop() {} };
      };
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
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => VIEWPORT,
  });
  HTMLCanvasElement.prototype.getContext = (() =>
    recordingContext()) as unknown as typeof getContext;
});
afterAll(() => {
  if (clientWidth) {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', clientWidth);
  }
  HTMLCanvasElement.prototype.getContext = getContext;
});

/** Frames asked for and not yet run. */
let frames: FrameRequestCallback[] = [];
function runFrames() {
  const due = frames;
  frames = [];
  for (const cb of due) cb(performance.now());
}

beforeEach(() => {
  calls = [];
  frames = [];
  h.commits = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
    frames.push(cb),
  );
  vi.stubGlobal('cancelAnimationFrame', () => {});
  useStore.setState({
    tracks: [],
    bpm: 120,
    position: 0,
    isPlaying: false,
    activeTool: 'cursor',
    timelineZoom: ZOOM,
    timelineScrollLeft: 0,
    timelineSnapEnabled: false,
    selectedClipId: null,
    remoteUsers: new Map(),
    isCollabActive: false,
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** An audio track with a 4-bar clip at bar 1. Returns the track's id. */
function addClip(id = 'clip'): string {
  const trackId = s().addTrack('audio', 'vocal-fx', 'Vocals');
  s().addAudioClip(trackId, {
    id,
    startTick: 0,
    duration: 4 * 1920,
    fadeInTicks: 0,
    fadeOutTicks: 0,
    assetId: null,
    offsetSeconds: 0,
  });
  return trackId;
}

/** Where the clip's box was drawn: its first roundRect in the last draw. */
const clipX = () =>
  lastDraw().find((c) => c.name === 'roundRect')?.args[0] as number;

describe('timeline redraws', () => {
  it('draws before the first paint', () => {
    addClip();
    render(<ScrolledTimeline />);
    expect(draws()).toBe(1);
  });

  it('a fader step, a rename or a mute neither redraws nor re-renders it', () => {
    const trackId = addClip();
    render(<ScrolledTimeline />);
    const drawn = draws();
    const commits = h.commits;

    act(() => {
      s().updateTrack(trackId, { volume: 0.3 });
      s().updateTrack(trackId, { name: 'Lead vocal' });
      s().updateTrack(trackId, { mute: true });
    });
    act(() => runFrames());

    expect(draws()).toBe(drawn);
    expect(h.commits).toBe(commits);
  });

  it('draws the changes made in one frame once, on that frame', () => {
    const trackId = addClip();
    render(<ScrolledTimeline />);
    const drawn = draws();

    act(() => {
      s().setTimelineScrollLeft(40);
      s().setSelectedClip('clip', trackId);
      s().updateAudioClip(trackId, 'clip', { fadeInTicks: 480 });
    });
    expect(draws()).toBe(drawn);

    act(() => runFrames());
    expect(draws()).toBe(drawn + 1);
  });

  it('moves a dragged clip with the pointer while the transport plays, on and off the canvas', () => {
    addClip();
    const { container } = render(<ScrolledTimeline />);
    const canvas = container.querySelector('canvas')!;
    act(() => useStore.setState({ isPlaying: true }));
    expect(clipX()).toBeCloseTo(tickToPixel(0, ZOOM, 0));

    // Grab the clip in the middle of bar 2 and move it right, by whole beats
    // (with snap off, a move still lands on a beat).
    const beat = tickToPixel(480, ZOOM, 0);
    const grabX = tickToPixel(1920 + 960, ZOOM, 0);
    const y = LANE_HEADER_PX + TRACK_ROW_PX / 2;
    fireEvent.mouseDown(canvas, { clientX: grabX, clientY: y });
    fireEvent.mouseMove(canvas, { clientX: grabX + 3 * beat, clientY: y });
    act(() => runFrames());
    expect(clipX()).toBeCloseTo(3 * beat);

    // Off the canvas (over the transport bar, say) it keeps following.
    fireEvent.mouseMove(document.body, {
      clientX: grabX + 7 * beat,
      clientY: y,
    });
    act(() => runFrames());
    expect(clipX()).toBeCloseTo(7 * beat);

    fireEvent.mouseUp(window);
    act(() => runFrames());
    expect(s().tracks[0].audioClips[0].startTick).toBe(7 * 480);
  });

  it('draws from the DAW palette, and again when the tokens change', () => {
    addClip();
    const read = vi.spyOn(window, 'getComputedStyle');
    const { container } = render(
      <div className="daw-root">
        <ScrolledTimeline />
      </div>,
    );
    const canvas = container.querySelector('canvas')!;
    const canvasReads = () =>
      read.mock.calls.filter(([el]) => el === canvas).length;

    for (let i = 1; i <= 3; i++) {
      act(() => s().setTimelineScrollLeft(i * 10));
      act(() => runFrames());
    }
    expect(draws()).toBe(4);
    // The colours come from getDawPalette's cache, not the canvas's style.
    expect(canvasReads()).toBe(0);

    act(() => {
      window.dispatchEvent(new Event(DAW_PALETTE_EVENT));
    });
    act(() => runFrames());
    expect(draws()).toBe(5);
  });
});

describe('lanes on the track list’s rows (milestone 2.6)', () => {
  it('moves a clip into the lane under the pointer, 64 px a row', () => {
    addClip();
    s().addTrack('audio', 'vocal-fx', 'Second');
    s().addTrack('audio', 'vocal-fx', 'Third');
    const { container } = render(<ScrolledTimeline />);
    const canvas = container.querySelector('canvas')!;
    const x = tickToPixel(960, ZOOM, 0);
    fireEvent.mouseDown(canvas, {
      clientX: x,
      clientY: LANE_HEADER_PX + TRACK_ROW_PX / 2,
    });
    fireEvent.mouseMove(canvas, {
      clientX: x,
      clientY: LANE_HEADER_PX + 2 * TRACK_ROW_PX + 10,
    });
    fireEvent.mouseUp(window);
    expect(s().tracks.map((t) => t.audioClips.length)).toEqual([0, 0, 1]);
  });

  it('draws a one-bar clip in the MIDI lane clicked with Draw, from the grid line before it', () => {
    s().addTrack('midi', 'piano-sampler', 'Keys');
    const synth = s().addTrack('midi', 'oracle-synth', 'Synth');
    useStore.setState({
      activeTool: 'pencil',
      timelineSnapEnabled: true,
      timelineGridSize: '1/4',
    });
    const { container } = render(<ScrolledTimeline />);
    const canvas = container.querySelector('canvas')!;
    fireEvent.mouseDown(canvas, {
      // Bar 2, a little after its second beat.
      clientX: tickToPixel(1920 + 480 + 100, ZOOM, 0),
      clientY: LANE_HEADER_PX + TRACK_ROW_PX + 20,
    });
    const clip = s().tracks[1].midiClips[0];
    expect(clip).toMatchObject({ startTick: 1920 + 480, durationTicks: 1920 });
    expect(s().selectedTrackId).toBe(synth);
    expect(s().selectedClipId).toBe(clip.id);
    expect(s().channelStripTab).toBe('piano-roll');
  });

  it('never overprints the ruler’s labels (timeline-22)', () => {
    addClip();
    useStore.setState({ timelineZoom: 4 });
    render(<ScrolledTimeline />);
    const labels = lastDraw()
      .filter((c) => c.name === 'fillText')
      .map((c) => ({ text: c.args[0] as string, x: c.args[1] as number }))
      .filter((l) => /^\d+(\.\d+)*$/.test(l.text))
      .sort((a, b) => a.x - b.x);
    expect(labels.length).toBeGreaterThan(4);
    for (let i = 1; i < labels.length; i++) {
      const prev = labels[i - 1];
      expect(labels[i].x).toBeGreaterThanOrEqual(prev.x + prev.text.length * 6);
    }
  });
});
