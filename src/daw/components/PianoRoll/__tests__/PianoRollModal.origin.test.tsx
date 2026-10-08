// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { MidiNoteEvent } from '@prism/engine';

// ── Piano roll modal origin ────────────────────────────────────────────────
// The modal used to start its roll at min(first note, clip.startTick), mixing
// a clip-relative tick with a song tick: an emptied clip at bar 9 re-anchored
// at tick 15360, so its next note was stored eight bars late, and a clip whose
// first note came after its start drew bar lines mid-bar.

const roll = vi.hoisted(() => ({
  props: null as null | { clipStartTick: number; timelineStartTick: number },
}));
vi.mock('@/daw/components/PianoRoll/PianoRoll', () => ({
  PianoRoll: (props: NonNullable<typeof roll.props>) => {
    roll.props = props;
    return null;
  },
}));
vi.mock('@/daw/audio/auditionNote', () => ({ auditionNote: vi.fn() }));

import { useStore } from '@/daw/store';
import { PianoRollModal } from '../PianoRollModal';

const BAR = 1920;

const note = (startTick: number): MidiNoteEvent => ({
  note: 64,
  velocity: 90,
  startTick,
  durationTicks: 240,
  channel: 0,
});

let trackId = '';

function openClip(startTick: number, events: MidiNoteEvent[]) {
  useStore.getState().addMidiClip(trackId, {
    id: 'clip',
    name: 'Verse',
    startTick,
    events,
  });
  useStore.getState().setEditingClip('clip', trackId);
  render(<PianoRollModal />);
}

beforeEach(() => {
  roll.props = null;
  useStore.setState({ tracks: [], remoteUsers: new Map() });
  trackId = useStore.getState().addTrack('midi', 'piano-sampler', 'Keys');
});

afterEach(() => {
  useStore.getState().setEditingClip(null, null);
  cleanup();
});

describe('PianoRollModal origin', () => {
  it('starts an emptied clip at bar 9 at its own start', () => {
    openClip(8 * BAR, []);
    expect(roll.props).toEqual(
      expect.objectContaining({ clipStartTick: 0, timelineStartTick: 8 * BAR }),
    );
  });

  it('starts at the clip start, not at a later first note', () => {
    // First note on beat 3: the grid still begins on the clip's downbeat.
    openClip(8 * BAR, [note(960), note(1440)]);
    expect(roll.props!.clipStartTick).toBe(0);
  });

  it('starts a clip at bar 1 at tick 0 as before', () => {
    openClip(0, [note(0)]);
    expect(roll.props).toEqual(
      expect.objectContaining({ clipStartTick: 0, timelineStartTick: 0 }),
    );
  });
});
