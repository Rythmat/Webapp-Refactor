/**
 * Every note the store holds has an id of its own (decision D2), and the
 * actions that write notes see to it, whatever made the notes.
 *
 * - A clip coming in (addMidiClip, a track's new clips) gets an id on every
 *   note, unique across the project: a duplicated or pasted clip, whose
 *   notes are copies, never shares its ids with the clip it came from.
 * - An edit to a clip's notes (updateMidiClipEvents, updateMidiClip) fills in
 *   missing ids and splits a repeat within the clip, and looks no further.
 *   It hands the same array back while every note has its id: the piano roll
 *   writes on every drag frame, and collab, undo and the engines compare by
 *   reference.
 * - Prism Create's notes, which the worker sends without ids, get them too.
 *
 * Run: npx vitest run src/daw/store/__tests__/noteIdWrites.test.ts
 */
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  CHORD_RHYTHMS,
  InstrumentChannel,
  generateChordMidi,
  type MidiNoteEvent,
} from '@prism/engine';
import { splitMidiClipAt } from '@/daw/components/Timeline/splitMidiClipAt';
import { assertNoteIds, isNoteId, mintNoteId } from '@/daw/model/noteIds';
import type { MidiWorkerRequest } from '@/daw/workers/midiWorker';
import { useStore } from '../index';
import type { MidiClip, Track } from '../tracksSlice';

const s = () => useStore.getState();
const BAR = 1920;

/** A note without an id, as an editor or importer makes one. */
const bare = (startTick: number, pitch: number): MidiNoteEvent => ({
  note: pitch,
  velocity: 90,
  startTick,
  durationTicks: 480,
  channel: 0,
});

/** A note that already has its id. */
const withId = (startTick: number, pitch: number): MidiNoteEvent => ({
  id: mintNoteId(),
  ...bare(startTick, pitch),
});

const clip = (id: string, events: MidiNoteEvent[], bar = 0): MidiClip => ({
  id,
  startTick: bar * BAR,
  events,
});

const trackById = (id: string): Track => {
  const track = s().tracks.find((t) => t.id === id);
  if (!track) throw new Error(`no track ${id}`);
  return track;
};
const clipOf = (trackId: string, clipId: string): MidiClip => {
  const found = trackById(trackId).midiClips.find((c) => c.id === clipId);
  if (!found) throw new Error(`no clip ${clipId}`);
  return found;
};
const idsOf = (c: MidiClip) => c.events.map((e) => e.id);

let keys = '';
let bass = '';

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  keys = s().addTrack('midi', 'piano-sampler', 'Keys');
  bass = s().addTrack('midi', 'bass-electric', 'Bass');
});

describe('a clip coming in', () => {
  it('gets an id on every note that has none', () => {
    s().addMidiClip(keys, clip('verse', [bare(0, 60), bare(480, 64)]));
    expect(idsOf(clipOf(keys, 'verse')).every(isNoteId)).toBe(true);
    expect(assertNoteIds(s().tracks)).toEqual([]);
  });

  it('keeps a clip whose notes have their ids as it is', () => {
    const verse = clip('verse', [withId(0, 60), withId(480, 64)]);
    s().addMidiClip(keys, verse);
    expect(clipOf(keys, 'verse')).toBe(verse);
  });

  it('gives a duplicated clip ids of its own, and leaves the original be', () => {
    s().addMidiClip(keys, clip('verse', [bare(0, 60), bare(480, 64)]));
    const original = clipOf(keys, 'verse');
    // What Cmd+D does: a deep copy under a new clip id.
    s().addMidiClip(keys, {
      ...structuredClone(original),
      id: 'verse-dup',
      startTick: BAR,
    });

    const copy = clipOf(keys, 'verse-dup');
    expect(clipOf(keys, 'verse')).toBe(original);
    expect(idsOf(copy).every(isNoteId)).toBe(true);
    expect(idsOf(copy).filter((id) => idsOf(original).includes(id))).toEqual(
      [],
    );
    expect(assertNoteIds(s().tracks)).toEqual([]);
  });

  it('gives a clip pasted onto another track ids of its own', () => {
    s().addMidiClip(keys, clip('riff', [withId(0, 48)]));
    s().setClipboard([structuredClone(clipOf(keys, 'riff'))]);
    // What Cmd+V does, twice.
    for (const n of [1, 2]) {
      s().addMidiClip(bass, {
        ...structuredClone(s().clipboardClips[0]),
        id: `paste-${n}`,
        startTick: n * BAR,
      });
    }
    expect(assertNoteIds(s().tracks)).toEqual([]);
    expect(
      new Set(s().tracks.flatMap((t) => t.midiClips.flatMap(idsOf))).size,
    ).toBe(3);
  });

  it('splits a repeat within the clip: the first note keeps the id', () => {
    const shared = mintNoteId();
    s().addMidiClip(
      keys,
      clip('verse', [
        { ...bare(0, 60), id: shared },
        { ...bare(0, 60), id: shared },
      ]),
    );
    const [first, second] = idsOf(clipOf(keys, 'verse'));
    expect(first).toBe(shared);
    expect(isNoteId(second)).toBe(true);
    expect(second).not.toBe(shared);
  });

  it('keeps the ids of a clip moved to another track (removed, then added)', () => {
    s().addMidiClip(keys, clip('verse', [withId(0, 60), withId(480, 64)]));
    const moved = clipOf(keys, 'verse');
    // What the Timeline does when a clip is dragged onto another track.
    s().removeMidiClip(keys, 'verse');
    s().addMidiClip(bass, { ...moved, startTick: BAR });
    expect(idsOf(clipOf(bass, 'verse'))).toEqual(idsOf(moved));
  });

  it("gives a track's new clips ids unique across the project (updateTrack)", () => {
    s().addMidiClip(bass, clip('bass-line', [withId(0, 36)]));
    const taken = idsOf(clipOf(bass, 'bass-line'))[0];
    s().updateTrack(keys, {
      midiClips: [
        clip('a', [bare(0, 60), { ...bare(480, 62), id: taken }]),
        clip('b', [bare(0, 64)]),
      ],
    });
    expect(clipOf(bass, 'bass-line').events[0].id).toBe(taken);
    expect(idsOf(clipOf(keys, 'a'))).not.toContain(taken);
    expect(assertNoteIds(s().tracks)).toEqual([]);
  });

  it('cuts a clip in two without touching an id (the scissors)', () => {
    s().addMidiClip(
      keys,
      clip('verse', [withId(0, 60), withId(BAR, 64), withId(BAR + 480, 67)]),
    );
    const before = idsOf(clipOf(keys, 'verse'));
    const rightId = splitMidiClipAt(keys, 'verse', BAR);
    if (!rightId) throw new Error('no split');
    expect([
      ...idsOf(clipOf(keys, 'verse')),
      ...idsOf(clipOf(keys, rightId)),
    ]).toEqual(before);
  });
});

describe('an edit to a clip', () => {
  beforeEach(() => {
    s().addMidiClip(keys, clip('verse', [withId(0, 60), withId(480, 64)]));
  });

  it('hands the same array back while every note has its id (a drag frame)', () => {
    const moved = clipOf(keys, 'verse').events.map((e) => ({
      ...e,
      startTick: e.startTick + 120,
    }));
    s().updateMidiClipEvents(keys, 'verse', moved);
    expect(clipOf(keys, 'verse').events).toBe(moved);
  });

  it('gives a drawn note an id and keeps the rest', () => {
    const before = idsOf(clipOf(keys, 'verse'));
    // A drum machine step: the editors make notes without ids.
    s().updateMidiClipEvents(keys, 'verse', [
      ...clipOf(keys, 'verse').events,
      bare(960, 67),
    ]);
    const after = idsOf(clipOf(keys, 'verse'));
    expect(after.slice(0, 2)).toEqual(before);
    expect(isNoteId(after[2])).toBe(true);
    expect(assertNoteIds(s().tracks)).toEqual([]);
  });

  it('splits a repeat within the clip', () => {
    const [first] = clipOf(keys, 'verse').events;
    s().updateMidiClipEvents(keys, 'verse', [
      first,
      { ...first, startTick: 960 },
    ]);
    const [a, b] = idsOf(clipOf(keys, 'verse'));
    expect(a).toBe(first.id);
    expect(b).not.toBe(first.id);
    expect(assertNoteIds(s().tracks)).toEqual([]);
  });

  it("looks only within the clip it edits, never at the project's other notes", () => {
    s().addMidiClip(keys, clip('chorus', [withId(0, 72)], 1));
    const [held] = clipOf(keys, 'verse').events;
    // A note whose id the verse holds too: the edit leaves it as it came,
    // since checking every other clip on every drag frame would make each
    // frame cost the whole project. A caller copying notes across clips
    // gives the copies new ids itself, or adds them as a clip.
    const events = [
      ...clipOf(keys, 'chorus').events,
      { ...held, startTick: 0 },
    ];
    s().updateMidiClipEvents(keys, 'chorus', events);
    expect(clipOf(keys, 'chorus').events).toBe(events);
    expect(idsOf(clipOf(keys, 'chorus'))).toContain(held.id);
  });

  it('fills in ids on a trim that rewrites the notes (updateMidiClip)', () => {
    const kept = clipOf(keys, 'verse').events;
    s().updateMidiClip(keys, 'verse', { events: kept, startTick: 240 });
    expect(clipOf(keys, 'verse').events).toBe(kept);

    s().updateMidiClip(keys, 'verse', { events: [...kept, bare(960, 67)] });
    expect(idsOf(clipOf(keys, 'verse')).every(isNoteId)).toBe(true);
    expect(idsOf(clipOf(keys, 'verse')).slice(0, 2)).toEqual(
      kept.map((e) => e.id),
    );
  });
});

// ── Prism Create ───────────────────────────────────────────────────────────
// Node has no Worker: a stand-in answers the way midiWorker.ts does.

class StandInWorker {
  onmessage: ((e: { data: { events: MidiNoteEvent[] } }) => void) | null = null;

  postMessage(r: MidiWorkerRequest) {
    const { events } = generateChordMidi({
      chordSeq: r.chordSeq,
      stringSeq: r.stringSeq,
      rhythmPattern: CHORD_RHYTHMS[r.rhythmName] ?? CHORD_RHYTHMS['Quarters'],
      swing: r.swing,
      strum: r.strum,
      strumAmount: r.strumAmount,
      tilt: r.tilt,
      tiltAmount: r.tiltAmount,
      channel: InstrumentChannel.Chords,
    });
    queueMicrotask(() => this.onmessage?.({ data: { events } }));
  }

  terminate() {}
}

describe('Prism Create', () => {
  beforeAll(() => {
    vi.stubGlobal('Worker', StandInWorker);
  });
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('gives every note of its take an id', async () => {
    s().setSelectedTrackId(keys);
    for (const name of ['1 major', '4 major', '5 major']) s().addChord(name);
    s().generateToTracks();
    await vi.waitFor(() => expect(trackById(keys).midiClips).toHaveLength(1));

    const take = trackById(keys).midiClips[0];
    expect(take.events.length).toBeGreaterThan(0);
    expect(take.events.every((e) => isNoteId(e.id))).toBe(true);
    expect(assertNoteIds(s().tracks)).toEqual([]);
  });
});
