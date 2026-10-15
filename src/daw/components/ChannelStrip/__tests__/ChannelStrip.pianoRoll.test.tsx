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

import { ClipPianoRollPart } from '@/daw/shell/lazyParts';
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

// The roll is its own chunk (milestone 1.12a); loaded here, the dock renders
// it at once, as after a preload in the editor.
beforeAll(async () => {
  await ClipPianoRollPart.preload();
});

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
    // addMidiClip gave the id-less notes ids (decision D2), so the store
    // holds a copy of `events`; the roll gets the stored array itself.
    const stored = useStore.getState().tracks.find((t) => t.id === trackId)!
      .midiClips[0].events;
    expect(roll.props!.events).toBe(stored);
    expect(stored).toEqual(
      events.map((e) => ({ ...e, id: expect.any(String) })),
    );
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

  it("opens on the track's clip with nothing selected, not an empty roll", () => {
    // A chord track with its clip at bar 5; the student selects the track,
    // not the clip, and opens the piano roll (dock-instruments-10).
    useStore.getState().addMidiClip(trackId, {
      id: 'chords',
      startTick: 4 * BAR,
      events: [note(0)],
    });
    render(<ChannelStrip />);

    expect(roll.props!.events).toHaveLength(1);
    expect(roll.props!.timelineStartTick).toBe(4 * BAR);
    // A note drawn there joins that clip: no second clip on bar 1.
    act(() => roll.props!.onChange([note(0), note(960)]));
    const clips = useStore
      .getState()
      .tracks.find((t) => t.id === trackId)!.midiClips;
    expect(clips).toHaveLength(1);
    expect(clips[0].events.map((e) => e.startTick)).toEqual([0, 960]);
  });

  it('edits the clip under the playhead when the track has several', () => {
    for (const [id, bar] of [
      ['verse', 0],
      ['chorus', 8],
    ] as const) {
      useStore.getState().addMidiClip(trackId, {
        id,
        startTick: bar * BAR,
        durationTicks: 8 * BAR,
        events: [note(0)],
      });
    }
    useStore.setState({ position: 9 * BAR });
    render(<ChannelStrip />);
    expect(roll.props!.timelineStartTick).toBe(8 * BAR);
  });

  it("starts a blank roll at the playhead's bar", () => {
    useStore.setState({ position: 5 * BAR + 300 });
    render(<ChannelStrip />);
    expect(roll.props!.timelineStartTick).toBe(5 * BAR);
    act(() => roll.props!.onChange([note(0)]));
    const [clip] = useStore
      .getState()
      .tracks.find((t) => t.id === trackId)!.midiClips;
    expect(clip.startTick).toBe(5 * BAR);
  });
});
