import { beforeEach, describe, expect, it } from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';
import { useStore } from '@/daw/store';
import type { AudioClip, MidiClip } from '@/daw/store/tracksSlice';
import type { UserPresence } from '@/daw/collab/types';
import { pushUndo, resetUndoHistory, undo } from '@/daw/store/undoMiddleware';
import { splitMidiClipAt } from '../splitMidiClipAt';

// ── Scissors on a MIDI clip ─────────────────────────────────────────────────
// Most clips start after bar 1. The old scissors compared their clip-relative
// notes with the song tick: an unsized clip there didn't split at all, and a
// sized one kept every note on the left (timeline-04).

const BAR = 1920;

const note = (midi: number, startTick: number, durationTicks = 480) =>
  ({
    note: midi,
    velocity: 96,
    startTick,
    durationTicks,
    channel: 0,
  }) satisfies MidiNoteEvent;

const intro: MidiClip = {
  id: 'intro',
  startTick: 0,
  events: [note(48, 0, BAR)],
};
/** Unsized, at bar 5: two bars of notes. */
const verse: MidiClip = {
  id: 'verse',
  name: 'Verse',
  startTick: 4 * BAR,
  events: [note(60, 0), note(64, 960), note(67, BAR), note(72, BAR + 960)],
};
const chorus: MidiClip = {
  id: 'chorus',
  startTick: 8 * BAR,
  events: [note(65, 0)],
};

let trackId = '';
const track = () => useStore.getState().tracks.find((t) => t.id === trackId)!;

beforeEach(() => {
  useStore.setState({ tracks: [], remoteUsers: new Map(), selectedNotes: [] });
  trackId = useStore.getState().addTrack('midi', 'piano-sampler', 'Keys');
  for (const clip of [intro, verse, chorus]) {
    useStore.getState().addMidiClip(trackId, clip);
  }
  resetUndoHistory();
});

describe('splitMidiClipAt', () => {
  it('splits a clip after bar 1 where the cursor is, in place', () => {
    const rightId = splitMidiClipAt(trackId, 'verse', 5 * BAR);

    expect(rightId).toMatch(/^clip-split-/);
    expect(track().midiClips).toEqual([
      intro,
      { ...verse, events: [note(60, 0), note(64, 960)] },
      {
        ...verse,
        id: rightId,
        startTick: 5 * BAR,
        events: [note(67, 0), note(72, 960)],
      },
      chorus,
    ]);
  });

  it('is one store write, and undo brings the clip back whole', () => {
    pushUndo(); // what auto-capture records before the edit
    let writes = 0;
    const stop = useStore.subscribe(
      (s) => s.tracks,
      () => {
        writes += 1;
      },
    );

    splitMidiClipAt(trackId, 'verse', 5 * BAR);
    stop();
    expect(writes).toBe(1);

    undo();
    expect(track().midiClips).toEqual([intro, verse, chorus]);
  });

  it('drops a note selection in the clip it cut, and only that one', () => {
    const elsewhere = { trackId, clipId: 'chorus', noteIndices: [0] };
    useStore.setState({
      selectedNotes: [
        { trackId, clipId: 'verse', noteIndices: [2] },
        elsewhere,
      ],
    });

    splitMidiClipAt(trackId, 'verse', 5 * BAR);

    expect(useStore.getState().selectedNotes).toEqual([elsewhere]);
  });

  it('does nothing outside the clip, for an audio clip, or on a locked track', () => {
    const take: AudioClip = {
      id: 'take',
      startTick: 0,
      duration: BAR,
      fadeInTicks: 0,
      fadeOutTicks: 0,
    };
    useStore.getState().addAudioClip(trackId, take);
    const before = track();

    expect(splitMidiClipAt(trackId, 'verse', 4 * BAR)).toBeNull();
    expect(splitMidiClipAt(trackId, 'verse', 6 * BAR)).toBeNull();
    expect(splitMidiClipAt(trackId, 'take', 960)).toBeNull();
    expect(splitMidiClipAt('no-track', 'verse', 5 * BAR)).toBeNull();
    expect(track()).toBe(before);

    useStore.setState({
      remoteUsers: new Map([
        [7, { selectedTrackId: trackId } as unknown as UserPresence],
      ]),
    });
    expect(splitMidiClipAt(trackId, 'verse', 5 * BAR)).toBeNull();
    expect(track()).toBe(before);
  });
});
