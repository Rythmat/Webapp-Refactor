// @vitest-environment jsdom
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
} from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import type { MidiNoteEvent } from '@prism/engine';

// ── Instrument views edit clips in clip-relative ticks ─────────────────────
// Playback schedules a clip's events at clip.startTick + event.startTick, so
// an editor's left edge is the clip's own tick 0. The drum grid used the
// clip's song position as that origin: a kick drawn on beat 1 of a clip at
// bar 5 was stored to play at bar 9.

// Engines and live-input plumbing aren't under test.
vi.mock('@/daw/hooks/usePlaybackEngine', () => ({
  trackEngineRegistry: new Map(),
}));
vi.mock('@/daw/collab/studioRealtime', () => ({
  studioRealtime: { shouldBroadcast: () => false, send: vi.fn() },
}));
vi.mock('@/daw/instruments/SoundFontAdapter', () => ({
  SoundFontAdapter: class {},
}));
vi.mock('@/daw/audio/auditionNote', () => ({ auditionNote: vi.fn() }));

import { useStore } from '@/daw/store';
import { DrumMachineView } from '../DrumMachineView';

const BAR = 1920;
const KICK = 36;
const RIDE = 51;
// The drum grid's rows, top to bottom: Ride (row 0) … Kick (row 10), 28 px.
const ROW_H = 28;
const RIDE_Y = ROW_H / 2;
const KICK_Y = 10 * ROW_H + ROW_H / 2;

const hit = (note: number, startTick: number): MidiNoteEvent => ({
  note,
  velocity: 100,
  startTick,
  durationTicks: 120,
  channel: 10,
});

let trackId = '';
const clipEvents = () =>
  useStore.getState().tracks.find((t) => t.id === trackId)!.midiClips[0].events;

beforeAll(() => {
  // jsdom has no 2D canvas; the views skip drawing without one, and hit
  // testing and editing don't need it.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

beforeEach(() => {
  useStore.setState({
    tracks: [],
    remoteUsers: new Map(),
    isPlaying: false,
    position: 0,
  });
});

afterEach(cleanup);

describe('DrumMachineView grid', () => {
  /** The drum grid canvas (the ruler comes first). */
  const grid = (container: HTMLElement) =>
    container.querySelectorAll('canvas')[1];

  beforeEach(() => {
    trackId = useStore.getState().addTrack('midi', 'drum-machine', 'Drums');
    useStore.getState().addMidiClip(trackId, {
      id: 'beat',
      name: 'Beat',
      startTick: 4 * BAR,
      events: [hit(KICK, 0)],
    });
  });

  it('stores a hit drawn on the clip’s first beat at clip tick 0', () => {
    const { container } = render(<DrumMachineView trackId={trackId} />);

    // Grid x = 0 is the clip's first beat, whatever the zoom. A double-click
    // on empty grid adds a hit there.
    fireEvent.doubleClick(grid(container), { clientX: 0, clientY: RIDE_Y });

    const ride = clipEvents().filter((e) => e.note === RIDE);
    expect(ride.map((e) => e.startTick)).toEqual([0]);
  });

  it('draws the clip’s first hit at the left edge, where clicking selects it', () => {
    const { container } = render(<DrumMachineView trackId={trackId} />);

    // A click on a hit takes it and adds nothing: the kick at clip tick 0
    // must be at x = 0.
    fireEvent.mouseDown(grid(container), { clientX: 0, clientY: KICK_Y });
    fireEvent.mouseUp(grid(container), { clientX: 0, clientY: KICK_Y });

    expect(clipEvents()).toMatchObject([hit(KICK, 0)]);
  });

  it('adds nothing on a single click of empty grid, as the piano roll', () => {
    const { container } = render(<DrumMachineView trackId={trackId} />);

    fireEvent.mouseDown(grid(container), { clientX: 0, clientY: RIDE_Y });
    fireEvent.mouseUp(grid(container), { clientX: 0, clientY: RIDE_Y });

    expect(clipEvents()).toMatchObject([hit(KICK, 0)]);
  });

  it('takes a hit away on a double-click', () => {
    const { container } = render(<DrumMachineView trackId={trackId} />);

    fireEvent.doubleClick(grid(container), { clientX: 1, clientY: KICK_Y });

    expect(clipEvents()).toEqual([]);
  });

  it('moves a hit dragged along its row', () => {
    const { container } = render(<DrumMachineView trackId={trackId} />);
    const canvas = grid(container);
    // jsdom has no width, so the grid is at its widest zoom-out (0.15):
    // 40 × 0.15 px a beat, a bar 24 px.
    fireEvent.mouseDown(canvas, { clientX: 1, clientY: KICK_Y });
    fireEvent.mouseMove(canvas, { clientX: 25, clientY: KICK_Y });
    fireEvent.mouseUp(canvas, { clientX: 25, clientY: KICK_Y });

    expect(clipEvents()).toMatchObject([{ note: KICK, startTick: BAR }]);
  });

  it('edits the selected groove, not always the track’s first clip', () => {
    // A second groove later in the song, selected on the timeline: the grid
    // shows and edits it (dock-instruments-03).
    useStore.getState().addMidiClip(trackId, {
      id: 'fill',
      name: 'Fill',
      startTick: 12 * BAR,
      events: [],
    });
    useStore.getState().setSelectedClip('fill', trackId);
    const { container } = render(<DrumMachineView trackId={trackId} />);

    fireEvent.doubleClick(grid(container), { clientX: 0, clientY: RIDE_Y });

    const clips = useStore
      .getState()
      .tracks.find((t) => t.id === trackId)!.midiClips;
    expect(clips.find((c) => c.id === 'fill')!.events).toMatchObject([
      { note: RIDE, startTick: 0 },
    ]);
    expect(clips.find((c) => c.id === 'beat')!.events).toHaveLength(1);
  });

  it('keeps the playhead in song time: at the clip start it is at x = 0', () => {
    const { container } = render(<DrumMachineView trackId={trackId} />);

    act(() => useStore.setState({ isPlaying: true, position: 4 * BAR }));

    const playhead = container.querySelector<HTMLElement>(
      'div[style*="translateX"]',
    );
    expect(playhead?.style.transform).toBe('translateX(0px)');
  });
});
