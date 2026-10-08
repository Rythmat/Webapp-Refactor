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
}));
vi.mock('@/daw/hooks/usePlaybackEngine', () => ({
  trackEngineRegistry: engine.registry,
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
  useStore.setState({ tracks: [], bpm: groove.bpm });
  trackId = useStore.getState().addTrack('midi', 'drum-machine', 'Drums');
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

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
        events: HITS,
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

  it('previews the loaded notes at the groove tempo', async () => {
    vi.useFakeTimers();
    engine.registry.set(trackId, {
      trackEngine: { noteOn: engine.noteOn, noteOff: engine.noteOff },
    });
    render(<GroovesBrowser trackId={trackId} />);
    await act(async () => {
      fireEvent.click(within(firstRow()).getAllByRole('button')[0]);
    });
    expect(loader.calls).toEqual([groove.id]);

    const beatMs = 60_000 / groove.bpm;
    act(() => vi.advanceTimersByTime(1));
    expect(engine.noteOn).toHaveBeenCalledWith(36, 100);
    expect(engine.noteOn).not.toHaveBeenCalledWith(38, 90);

    act(() => vi.advanceTimersByTime(beatMs));
    expect(engine.noteOn).toHaveBeenCalledWith(38, 90);
    expect(engine.noteOff).toHaveBeenCalledWith(36);
  });
});
