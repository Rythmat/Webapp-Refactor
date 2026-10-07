// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import type { MidiNoteEvent } from '@prism/engine';

// ── PIANO ROLL dock tab: where a clip's notes are drawn ────────────────────
// Clip events are clip-relative (playback adds clip.startTick), so the roll's
// origin is the clip's own tick 0 and the clip's song position is only its
// timelineStartTick. Passing the song position as both put every clip after
// bar 1 off the left edge and stored new notes that many ticks late.

const roll = vi.hoisted(() => ({
  props: null as null | {
    events: MidiNoteEvent[];
    clipStartTick: number;
    timelineStartTick: number;
    onChange: (events: MidiNoteEvent[]) => void;
  },
}));
vi.mock('@/daw/components/PianoRoll/PianoRoll', () => ({
  PianoRoll: (props: typeof roll.props) => {
    roll.props = props;
    return null;
  },
}));

// The other dock tabs and their engines aren't under test.
vi.mock('@/daw/components/Controls/TrackControlsPanel', () => ({
  TrackControlsPanel: () => null,
}));
vi.mock('@/daw/components/Effects/EffectsPanel', () => ({
  EffectsPanel: () => null,
}));
vi.mock('@/daw/components/Prism/PrismPanel', () => ({
  PrismPanel: () => null,
}));
vi.mock('@/daw/components/Controls/GroovesBrowser', () => ({
  GroovesBrowser: () => null,
}));
vi.mock('@/hooks/useIsPremium', () => ({
  useIsPremium: () => ({ isPremium: true }),
}));
vi.mock('@/daw/audio/auditionNote', () => ({ auditionNote: vi.fn() }));

import { useStore } from '@/daw/store';
import { ChannelStrip } from '../ChannelStrip';

const BAR = 1920;

const note = (startTick: number): MidiNoteEvent => ({
  note: 60,
  velocity: 100,
  startTick,
  durationTicks: 480,
  channel: 0,
});

let trackId = '';

beforeEach(() => {
  roll.props = null;
  useStore.setState({ tracks: [], remoteUsers: new Map() });
  useStore.getState().setSelectedClip(null, null);
  trackId = useStore.getState().addTrack('midi', 'piano-sampler', 'Keys');
  useStore.getState().setChannelStripTab('piano-roll');
});

afterEach(cleanup);

describe('ChannelStrip PIANO ROLL tab', () => {
  it('draws a clip at bar 5 from its own start, placed at bar 5 in the song', () => {
    const events = [note(0), note(BAR)];
    useStore.getState().addMidiClip(trackId, {
      id: 'later',
      name: 'Pasted',
      startTick: 4 * BAR,
      events,
    });
    useStore.getState().setSelectedClip('later', trackId);

    render(<ChannelStrip />);

    expect(roll.props).not.toBeNull();
    expect(roll.props!.events).toBe(events);
    // PianoRoll's contract: its left edge is clip tick `clipStartTick` (a note
    // drawn there is stored at it) and song tick `timelineStartTick +
    // clipStartTick` (where its playhead and loop are measured from).
    const { clipStartTick, timelineStartTick } = roll.props!;
    expect(clipStartTick).toBe(0);
    expect(timelineStartTick + clipStartTick).toBe(4 * BAR);
  });

  it('keeps a blank roll at bar 1, creating its clip there on the first note', () => {
    render(<ChannelStrip />);

    expect(roll.props!.clipStartTick).toBe(0);
    expect(roll.props!.timelineStartTick).toBe(0);

    act(() => roll.props!.onChange([note(480)]));
    const [clip] = useStore
      .getState()
      .tracks.find((t) => t.id === trackId)!.midiClips;
    expect(clip.startTick).toBe(0);
    expect(clip.events.map((e) => e.startTick)).toEqual([480]);
  });
});
