// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import type { MidiNoteEvent } from '@prism/engine';
import { GROOVES } from '@/daw/data/groovesLibrary';

// ── The Grooves tab loads grooves with the shared loader ──────────────────
// Preview and Add each had their own copy of the fetch, parse and rescale
// that loadGrooveEvents does for practice tracks and demos
// (dock-instruments-24); both now use it.

const loader = vi.hoisted(() => ({
  events: null as MidiNoteEvent[] | null,
  calls: [] as string[],
}));
vi.mock('@/daw/midi/loadGrooveEvents', () => ({
  loadGrooveEvents: async (id: string) => {
    loader.calls.push(id);
    return loader.events;
  },
}));

const engine = vi.hoisted(() => ({
  registry: new Map<string, unknown>(),
  noteOn: vi.fn(),
  noteOff: vi.fn(),
  allNotesOff: vi.fn(),
}));
vi.mock('@/daw/hooks/usePlaybackEngine', () => ({
  trackEngineRegistry: engine.registry,
}));

// The preview books its notes on the audio clock, which the test moves on.
const clock = vi.hoisted(() => ({ ctx: { currentTime: 0 } }));
vi.mock('@/daw/audio/AudioEngine', () => ({
  audioEngine: {
    getIsInitialized: () => true,
    resumeIfNeeded: async () => {},
    getContext: () => clock.ctx,
  },
}));

import { useStore } from '@/daw/store';
import { GroovesBrowser } from '../GroovesBrowser';

const groove = GROOVES[0];
/** Two hits a beat apart, already at Studio's 480 PPQ. */
const HITS: MidiNoteEvent[] = [
  { note: 36, velocity: 100, startTick: 0, durationTicks: 120, channel: 10 },
  { note: 38, velocity: 90, startTick: 480, durationTicks: 120, channel: 10 },
];

const firstRow = () =>
  screen.getAllByTitle('Add to track')[0].closest('div.group') as HTMLElement;

let trackId = '';

beforeEach(() => {
  loader.events = HITS;
  loader.calls = [];
  engine.registry.clear();
  engine.noteOn.mockClear();
  engine.noteOff.mockClear();
  engine.allNotesOff.mockClear();
  clock.ctx.currentTime = 0;
  useStore.setState({ tracks: [], bpm: groove.bpm });
  trackId = useStore.getState().addTrack('midi', 'drum-machine', 'Drums');
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** Moves the audio clock and the timers on together. */
async function play(ms: number) {
  for (let t = 0; t < ms; t += 25) {
    clock.ctx.currentTime += 0.025;
    await act(() => vi.advanceTimersByTimeAsync(25));
  }
}

function previewFirstGroove() {
  engine.registry.set(trackId, {
    trackEngine: {
      noteOn: engine.noteOn,
      noteOff: engine.noteOff,
      allNotesOff: engine.allNotesOff,
    },
  });
  return render(<GroovesBrowser trackId={trackId} />);
}

describe('GroovesBrowser loading', () => {
  it('adds the loaded groove as a clip on the track', async () => {
    render(<GroovesBrowser trackId={trackId} />);
    await act(async () => {
      fireEvent.click(within(firstRow()).getByTitle('Add to track'));
    });

    expect(loader.calls).toEqual([groove.id]);
    const track = useStore.getState().tracks.find((t) => t.id === trackId)!;
    expect(track.midiClips).toHaveLength(1);
    expect(track.midiClips[0]).toEqual(
      expect.objectContaining({
        name: groove.name,
        startTick: 0,
        // The store gives every note an id (milestone 1.3); the hits are
        // otherwise exactly the groove's.
        events: HITS.map((hit) => ({ ...hit, id: expect.any(String) })),
      }),
    );
  });

  it('adds nothing when the groove fails to load', async () => {
    loader.events = null;
    render(<GroovesBrowser trackId={trackId} />);
    await act(async () => {
      fireEvent.click(within(firstRow()).getByTitle('Add to track'));
    });
    const track = useStore.getState().tracks.find((t) => t.id === trackId)!;
    expect(track.midiClips).toHaveLength(0);
  });

  it('previews the loaded notes at the groove tempo, on the audio clock', async () => {
    vi.useFakeTimers();
    previewFirstGroove();
    await act(async () => {
      fireEvent.click(within(firstRow()).getAllByRole('button')[0]);
    });
    await play(25);
    expect(loader.calls).toEqual([groove.id]);

    // Booked a little ahead, each at its own time on the context clock
    // (dock-instruments-07): not fired by wall-clock timers at "now".
    const beat = 60 / groove.bpm;
    expect(engine.noteOn).toHaveBeenCalledTimes(1);
    const [note, velocity, start] = engine.noteOn.mock.calls[0];
    expect([note, velocity]).toEqual([36, 100]);
    expect(start).toBeGreaterThan(0);

    await play(beat * 1000);
    expect(engine.noteOn).toHaveBeenCalledWith(38, 90, start + beat);
    expect(engine.noteOff).toHaveBeenCalledWith(36, start + beat / 4);
  });

  it('stops when the song starts playing', async () => {
    vi.useFakeTimers();
    previewFirstGroove();
    await act(async () => {
      fireEvent.click(within(firstRow()).getAllByRole('button')[0]);
    });
    await play(25);
    expect(engine.noteOn).toHaveBeenCalledTimes(1);

    act(() => useStore.setState({ isPlaying: true }));
    expect(engine.allNotesOff).toHaveBeenCalled();
    await play(2000);
    expect(engine.noteOn).toHaveBeenCalledTimes(1);
    act(() => useStore.setState({ isPlaying: false }));
  });

  it('stops when the tab goes', async () => {
    vi.useFakeTimers();
    const { unmount } = previewFirstGroove();
    await act(async () => {
      fireEvent.click(within(firstRow()).getAllByRole('button')[0]);
    });
    await play(25);
    unmount();
    expect(engine.allNotesOff).toHaveBeenCalled();
    await play(2000);
    expect(engine.noteOn).toHaveBeenCalledTimes(1);
  });
});
