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
import {
  CHORD_RHYTHMS,
  InstrumentChannel,
  generateChordMidi,
  type MidiNoteEvent,
} from '@prism/engine';
import type { MidiWorkerRequest } from '@/daw/workers/midiWorker';
import { useStore, type AllSlices } from '../index';
import {
  nextChordId,
  replaceChordRegionsInRange,
  type ChordRegion,
} from '../prismSlice';
import type { MidiClip } from '../tracksSlice';
import {
  canUndo,
  initUndoTracking,
  resetUndoHistory,
  undo,
} from '../undoMiddleware';

// ── Prism Create and Clear never delete the song ───────────────────────────
// Create used to clear the selected track and replace the whole chord lane;
// the builder's Clear wiped the chord lane and the lead-sheet layout. These
// drive the real store. Node has no Worker, so a stand-in answers the way
// midiWorker.ts does, but only when a test lets it, so a test can change the
// project while Create is in flight.

const BAR = 1920;
const WRITTEN_END = 4 * BAR; // Create fills bars 1–4
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const inFlight: StandInWorker[] = [];

class StandInWorker {
  onmessage: ((e: { data: { events: MidiNoteEvent[] } }) => void) | null = null;
  terminated = false;
  private request: MidiWorkerRequest | null = null;

  postMessage(request: MidiWorkerRequest) {
    this.request = request;
    inFlight.push(this);
  }

  terminate() {
    this.terminated = true;
  }

  reply() {
    const r = this.request!;
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
    this.onmessage?.({ data: { events } });
  }
}

/** Let every Create in flight finish; returns the workers it used. */
function finishCreate(): StandInWorker[] {
  const workers = inFlight.splice(0);
  for (const worker of workers) worker.reply();
  return workers;
}

const st = () => useStore.getState();
const trackById = (id: string) => st().tracks.find((t) => t.id === id)!;

const notes = (startTick: number): MidiNoteEvent[] =>
  [60, 64, 67].map((note) => ({
    note,
    velocity: 90,
    startTick,
    durationTicks: 480,
    channel: 0,
  }));

const clipAt = (id: string, bar: number): MidiClip => ({
  id,
  startTick: bar * BAR,
  durationTicks: 4 * BAR,
  events: notes(0),
});

const chord = (
  id: string,
  startBar: number,
  endBar: number,
  extra: Partial<ChordRegion> = {},
): ChordRegion => ({
  id,
  startTick: startBar * BAR,
  endTick: endBar * BAR,
  name: '1 maj',
  noteName: 'C maj',
  color: [200, 120, 40],
  ...extra,
});

/** A song's chord lane: two chords inside bars 1–4, one crossing bar 5,
 *  two well after it. */
const chart = (): ChordRegion[] => [
  chord('song-a', 0, 2),
  chord('song-b', 2, 3.5),
  chord('song-c', 3.5, 6, { rawStartTick: 3.5 * BAR - 7 }),
  chord('song-d', 8, 12),
  chord('song-e', 28, 32),
];

/** I–IV–V–vi with Whole Notes: one chord per bar, the same every run. */
function buildProgression() {
  for (const name of ['1 major', '4 major', '5 major', '6 minor']) {
    st().addChord(name);
  }
}

let keys = '';
let other = '';

beforeAll(() => {
  vi.stubGlobal('Worker', StandInWorker);
  initUndoTracking();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.useFakeTimers();
  inFlight.length = 0;
  useStore.setState({
    tracks: [],
    chordRegions: [],
    chordSeq: [],
    stringSeq: [],
    availableNextChords: [],
    rootNote: null,
    mode: 'ionian',
    rhythmName: 'Whole Notes',
    swing: 0,
    strumAmount: 0,
    tiltAmount: 0,
    measuresPerLine: 4,
    measureRowSizes: null,
    measureRestMap: null,
    measureFermatas: null,
    chordRecordMode: 'replace',
    remoteUsers: new Map(),
  } as Partial<AllSlices>);

  other = st().addTrack('midi', 'piano-sampler', 'Bass');
  st().addMidiClip(other, clipAt('bass-take', 0));
  keys = st().addTrack('midi', 'piano-sampler', 'Rhodes');
  st().addMidiClip(keys, clipAt('recorded-take', 0));
  st().addMidiClip(keys, clipAt('chorus-take', 8));
  st().setSelectedTrackId(keys);
  useStore.setState({ chordRegions: chart() });
  buildProgression();
  resetUndoHistory();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Create', () => {
  it("adds its clip and keeps the track's other clips", () => {
    const before = trackById(keys).midiClips;
    const otherTrack = trackById(other);

    st().generateToTracks();
    const [worker] = finishCreate();

    const clips = trackById(keys).midiClips;
    expect(clips).toHaveLength(3);
    expect(clips[0]).toBe(before[0]);
    expect(clips[1]).toBe(before[1]);
    expect(clips[2]).toMatchObject({ startTick: 0, durationTicks: 7680 });
    expect(clips[2].id).toMatch(UUID);
    expect(clips[2].events.length).toBeGreaterThan(0);
    expect(trackById(other)).toBe(otherTrack);
    expect(worker.terminated).toBe(true);
  });

  it('replaces chords only across the bars it wrote', () => {
    st().generateToTracks();
    finishCreate();

    const lane = st().chordRegions;
    const written = lane.filter((r) => r.startTick < WRITTEN_END);
    expect(written.map((r) => [r.startTick, r.endTick])).toEqual([
      [0, BAR],
      [BAR, 2 * BAR],
      [2 * BAR, 3 * BAR],
      [3 * BAR, 4 * BAR],
    ]);
    expect(written.map((r) => r.degreeKey)).toEqual([
      '1 major',
      '4 major',
      '5 major',
      '6 minor',
    ]);

    // The chord crossing bar 5 keeps its tail, under its own id, and drops
    // the hit time that now lies before it. The later chords are untouched.
    const after = lane.filter((r) => r.startTick >= WRITTEN_END);
    expect(after.map((r) => [r.id, r.startTick, r.endTick])).toEqual([
      ['song-c', 4 * BAR, 6 * BAR],
      ['song-d', 8 * BAR, 12 * BAR],
      ['song-e', 28 * BAR, 32 * BAR],
    ]);
    expect(after[0].rawStartTick).toBeUndefined();
    expect(after[1]).toEqual(chord('song-d', 8, 12));
    expect(new Set(lane.map((r) => r.id)).size).toBe(lane.length);
  });

  it('leaves a fresh chord lane every time, so lesson steps see it ran', () => {
    st().generateToTracks();
    finishCreate();
    const first = st().chordRegions;

    // Same progression again: the chords come out the same, the array is new.
    st().generateToTracks();
    finishCreate();
    const second = st().chordRegions;

    expect(second).not.toBe(first);
    expect(second.length).toBeGreaterThan(0);
    expect(second.map((r) => [r.startTick, r.noteName])).toEqual(
      first.map((r) => [r.startTick, r.noteName]),
    );
  });

  it('is one undo step that puts the clips and chords back', () => {
    const clipsBefore = structuredClone(trackById(keys).midiClips);
    const laneBefore = structuredClone(st().chordRegions);

    st().generateToTracks();
    finishCreate();
    vi.advanceTimersByTime(300);

    expect(canUndo()).toBe(true);
    undo();
    expect(trackById(keys).midiClips).toEqual(clipsBefore);
    expect(st().chordRegions).toEqual(laneBefore);
    expect(canUndo()).toBe(false);
  });

  it('writes nothing when the track is deleted before the worker answers', () => {
    const lane = st().chordRegions;
    st().generateToTracks();
    useStore.setState({ tracks: st().tracks.filter((t) => t.id !== keys) });
    finishCreate();

    expect(st().chordRegions).toBe(lane);
  });

  it('writes nothing to a track a collaborator has taken meanwhile', () => {
    const track = trackById(keys);
    const lane = st().chordRegions;
    st().generateToTracks();
    useStore.setState({
      remoteUsers: new Map([['peer', { selectedTrackId: keys }]]),
    } as unknown as Partial<AllSlices>);
    finishCreate();

    expect(trackById(keys)).toBe(track);
    expect(st().chordRegions).toBe(lane);
  });
});

describe('Create again', () => {
  /** Create once and return the take it wrote. */
  function firstTake(): MidiClip {
    st().generateToTracks();
    finishCreate();
    return trackById(keys).midiClips[2];
  }

  it('swaps the take it wrote last time for the new one', () => {
    const [recorded, chorus] = trackById(keys).midiClips;
    const first = firstTake();

    useStore.setState({ rhythmName: 'Quarters' }); // trying a variation
    st().generateToTracks();
    finishCreate();

    const clips = trackById(keys).midiClips;
    expect(clips).toHaveLength(3);
    expect(clips[0]).toBe(recorded);
    expect(clips[1]).toBe(chorus);
    expect(clips[2].id).not.toBe(first.id);
    expect(clips[2].events.length).toBeGreaterThan(first.events.length);
  });

  it.each<[string, (take: MidiClip) => void]>([
    [
      'edited',
      (take) =>
        st().updateMidiClipEvents(
          keys,
          take.id,
          take.events.map((e) => ({ ...e, velocity: 60 })),
        ),
    ],
    ['moved', (take) => st().updateMidiClip(keys, take.id, { startTick: BAR })],
    [
      'trimmed',
      (take) => st().updateMidiClip(keys, take.id, { durationTicks: 2 * BAR }),
    ],
    [
      'renamed',
      (take) => st().updateMidiClip(keys, take.id, { name: 'Verse' }),
    ],
  ])('keeps a take the student has %s', (_, touch) => {
    const first = firstTake();
    touch(first);
    const touched = trackById(keys).midiClips[2];

    st().generateToTracks();
    finishCreate();

    const clips = trackById(keys).midiClips;
    expect(clips).toHaveLength(4);
    expect(clips[2]).toBe(touched);
    expect(clips[3]).toMatchObject({ startTick: 0, durationTicks: 7680 });
  });

  it('swaps a take that undo brought back as a copy', () => {
    const first = firstTake();
    vi.advanceTimersByTime(300);
    useStore.setState({ rhythmName: 'Quarters' });
    st().generateToTracks();
    finishCreate();
    vi.advanceTimersByTime(300);

    undo();
    const restored = trackById(keys).midiClips[2];
    expect(restored).not.toBe(first);
    expect(restored).toEqual(first);

    st().generateToTracks();
    finishCreate();

    const clips = trackById(keys).midiClips;
    expect(clips).toHaveLength(3);
    expect(clips.map((c) => c.id)).not.toContain(first.id);
  });

  it("leaves another track's take alone", () => {
    const keysTake = firstTake();

    st().setSelectedTrackId(other);
    st().generateToTracks();
    finishCreate();

    expect(trackById(keys).midiClips[2]).toBe(keysTake);
    expect(trackById(other).midiClips).toHaveLength(2);
  });
});

describe('Create on a locked chord lane', () => {
  beforeEach(() => {
    st().setChordRecordMode('locked');
  });

  it('keeps every chord already there', () => {
    const lane = st().chordRegions;

    st().generateToTracks();
    finishCreate();

    // Bars 1–4 were full, so nothing new fits. Still a fresh array, so a
    // lesson step waiting on Create sees it ran.
    expect(st().chordRegions).not.toBe(lane);
    expect(st().chordRegions).toEqual(lane);
    expect(trackById(keys).midiClips).toHaveLength(3);
  });

  it('only fills the gaps', () => {
    useStore.setState({
      chordRegions: [chord('song-a', 0, 2), chord('song-d', 8, 12)],
    });
    const lane = st().chordRegions;

    st().generateToTracks();
    finishCreate();

    const after = st().chordRegions;
    expect(after[0]).toBe(lane[0]);
    expect(after[3]).toBe(lane[1]);
    expect(
      after.map((r) => [r.startTick, r.endTick, r.degreeKey ?? r.id]),
    ).toEqual([
      [0, 2 * BAR, 'song-a'],
      [2 * BAR, 3 * BAR, '5 major'],
      [3 * BAR, 4 * BAR, '6 minor'],
      [8 * BAR, 12 * BAR, 'song-d'],
    ]);
  });
});

describe('Clear', () => {
  it('empties the progression being built and nothing else', () => {
    useStore.setState({
      measuresPerLine: 5,
      measureRowSizes: [4, 5, 4],
      measureRestMap: { 8: 2 },
      measureFermatas: [11],
    });
    const before = st();

    st().clearSequence();

    const after = st();
    expect(after.chordSeq).toEqual([]);
    expect(after.stringSeq).toEqual([]);
    expect(after.availableNextChords).toEqual([]);
    expect(after.chordRegions).toBe(before.chordRegions);
    expect(after.measuresPerLine).toBe(5);
    expect(after.measureRowSizes).toBe(before.measureRowSizes);
    expect(after.measureRestMap).toBe(before.measureRestMap);
    expect(after.measureFermatas).toBe(before.measureFermatas);
    expect(after.tracks).toBe(before.tracks);
  });

  it('makes no undo step, since the song did not change', () => {
    st().clearSequence();
    vi.advanceTimersByTime(300);
    expect(canUndo()).toBe(false);
  });
});

describe('chord ids', () => {
  it('are UUIDs, never repeated', () => {
    const ids = Array.from({ length: 1000 }, nextChordId);
    for (const id of ids) expect(id).toMatch(UUID);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never collide with the ids an older save restored', () => {
    // A save from before this fix: counter ids, restored as they were.
    useStore.setState({
      chordRegions: [chord('cr-1', 0, 1), chord('cr-2', 1, 2)],
    });
    st().insertChordRegion(4 * BAR, '4 maj', 'F maj');
    const added = st().chordRegions.find((r) => r.startTick === 4 * BAR)!;
    expect(added.id).toMatch(UUID);

    st().deleteChordRegion(added.id);
    expect(st().chordRegions.map((r) => r.id)).toEqual(['cr-1', 'cr-2']);
  });
});

describe('replaceChordRegionsInRange', () => {
  it('splits a chord spanning the whole range into two with their own ids', () => {
    const long = chord('long', 1, 6, { rawStartTick: BAR + 5 });
    const incoming = [chord('new', 2, 4)];

    const lane = replaceChordRegionsInRange([long], incoming, 2 * BAR, 4 * BAR);

    expect(lane.map((r) => [r.startTick, r.endTick])).toEqual([
      [BAR, 2 * BAR],
      [2 * BAR, 4 * BAR],
      [4 * BAR, 6 * BAR],
    ]);
    expect(lane[0]).toEqual({ ...long, endTick: 2 * BAR });
    expect(lane[1]).toBe(incoming[0]);
    expect(lane[2].id).toMatch(UUID);
    expect(lane[2].rawStartTick).toBeUndefined();
  });

  it('keeps chords that only touch the range', () => {
    const before = chord('before', 0, 2);
    const after = chord('after', 4, 5);

    const lane = replaceChordRegionsInRange(
      [before, after],
      [chord('new', 2, 4)],
      2 * BAR,
      4 * BAR,
    );

    expect(lane.map((r) => r.id)).toEqual(['before', 'new', 'after']);
    expect(lane[0]).toBe(before);
    expect(lane[2]).toBe(after);
  });
});
