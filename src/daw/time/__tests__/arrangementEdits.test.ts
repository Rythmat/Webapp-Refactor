import { describe, expect, it } from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';
import { audioClipSection } from '@/daw/audio/audioClipCuts';
import type { AutomationLanes, AutomationPoint } from '@/daw/audio/automation';
import {
  midiClipSection,
  splitMidiClip,
} from '@/daw/components/Timeline/midiClipCuts';
import { noteKey } from '@/daw/model/noteKeys';
import { DEFAULT_SECTION_BARS, type SongSection } from '@/daw/model/sections';
import type { Marker } from '@/daw/store/markersSlice';
import type { ChordRegion } from '@/daw/store/prismSlice';
import type { AudioClip, MidiClip, Track } from '@/daw/store/tracksSlice';
import type { SectionType } from '@/unison/types/schema';
import {
  arrangementBlocker,
  duplicateSectionEdit,
  insertSectionEdit,
  insertTimeEdit,
  type ArrangementEdit,
  type Mint,
} from '../arrangementEdits';
import { measureEditPatch, type MeasureEditState } from '../measureEdits';

// ── Arrangement edits ──────────────────────────────────────────────────────
// Insert time, Duplicate a section with its clips, and Insert a section
// before or after one (milestone 2.13): each one edit to everything on the
// timeline, written at once as one undo step. Written from the milestone's
// contract, apart from the code, so it checks the code rather than
// repeating it. The mint counts per kind ('clip-1', 'region-1', …); a test
// finds what an edit made by the ids the state didn't have before, so the
// order an edit mints in doesn't matter.

const BAR = 1920; // a bar of 4/4
const BPM = 96; // a beat is 0.625 s, so every tick-to-second sum here is exact

/** The store's keys an arrangement edit reads, as plain data. */
interface Snapshot {
  tracks: Track[];
  chordRegions: ChordRegion[];
  markers: Marker[];
  sections: SongSection[];
  masterAutomation: AutomationLanes;
  loopStart: number;
  loopEnd: number;
  bpm: number;
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
  remoteUsers: Map<
    number,
    { userId: string; userName: string; selectedTrackId: string | null }
  >;
  isRecording: boolean;
  leadSheetBars: number | null;
  leadSheetRepeats: Array<{ startMeasure: number; endMeasure: number }>;
  measureRestMap: Record<number, number> | null;
  measureFermatas: number[] | null;
  measureRowSizes: number[] | null;
  scoreSystemBreaks: number[];
  scorePageBreaks: number[];
  scoreSystemRuns: Array<[number, number]>;
  scoreTextMarks: Array<{
    id: string;
    measureIdx: number;
    kind: string;
    text?: string;
  }>;
  scoreArticulations: string[];
  scoreSlurs: string[];
  scoreSpellings: string[];
  scoreSlashNotes: string[];
}

const snapshot = (over: Partial<Snapshot> = {}): Snapshot => ({
  tracks: [],
  chordRegions: [],
  markers: [],
  sections: [],
  masterAutomation: {},
  loopStart: 0,
  loopEnd: 4 * BAR,
  bpm: BPM,
  timeSignatureNumerator: 4,
  timeSignatureDenominator: 4,
  remoteUsers: new Map(),
  isRecording: false,
  leadSheetBars: null,
  leadSheetRepeats: [],
  measureRestMap: null,
  measureFermatas: null,
  measureRowSizes: null,
  scoreSystemBreaks: [],
  scorePageBreaks: [],
  scoreSystemRuns: [],
  scoreTextMarks: [],
  scoreArticulations: [],
  scoreSlurs: [],
  scoreSpellings: [],
  scoreSlashNotes: [],
  ...over,
});

// The functions take a store snapshot; these hand them the plain one.
const insertTime = (s: Snapshot, at: number, ticks: number, mint: Mint) =>
  insertTimeEdit(
    s as unknown as Parameters<typeof insertTimeEdit>[0],
    at,
    ticks,
    mint,
  );
const duplicate = (s: Snapshot, sectionId: string, mint: Mint) =>
  duplicateSectionEdit(
    s as unknown as Parameters<typeof duplicateSectionEdit>[0],
    sectionId,
    mint,
  );
const insertSection = (
  s: Snapshot,
  sectionId: string,
  where: 'before' | 'after',
  input: { type: SectionType; label: string },
  mint: Mint,
) =>
  insertSectionEdit(
    s as unknown as Parameters<typeof insertSectionEdit>[0],
    sectionId,
    where,
    input,
    mint,
  );
const blocker = (s: Snapshot) =>
  arrangementBlocker(s as unknown as Parameters<typeof arrangementBlocker>[0]);
/** + Measure's patch, for the chart's fields an insert of whole bars shifts. */
const barsPatch = (s: Snapshot, at: number, count: number) =>
  measureEditPatch(
    s as unknown as MeasureEditState,
    at,
    count,
  ) as unknown as Partial<Snapshot> | null;

/** The state after the edit's one write. */
const applied = (s: Snapshot, edit: ArrangementEdit | null): Snapshot => {
  if (!edit) throw new Error('the edit was refused');
  return { ...s, ...(edit.patch as unknown as Partial<Snapshot>) };
};

/** A mint that counts per kind ('clip-1', 'note-1', …) and keeps what it made. */
function counter() {
  const made: Record<string, string[]> = {
    clip: [],
    note: [],
    region: [],
    section: [],
  };
  const mint: Mint = (kind) => {
    const id = `${kind}-${made[kind].length + 1}`;
    made[kind].push(id);
    return id;
  };
  return { mint, made };
}

// ── Building a song ────────────────────────────────────────────────────────

const n = (id: string, midi: number, startTick: number): MidiNoteEvent => ({
  id,
  note: midi,
  velocity: 90,
  startTick,
  durationTicks: 480,
  channel: 0,
});

const midiTrack = (
  id: string,
  midiClips: MidiClip[],
  automation?: AutomationLanes,
): Track =>
  ({
    id,
    name: id,
    type: 'midi',
    volume: 0.8,
    pan: 0,
    midiClips,
    audioClips: [],
    ...(automation ? { automation } : {}),
  }) as unknown as Track;

const audioTrack = (id: string, audioClips: AudioClip[]): Track =>
  ({
    id,
    name: id,
    type: 'audio',
    volume: 0.8,
    pan: 0,
    midiClips: [],
    audioClips,
  }) as unknown as Track;

const audio = (
  id: string,
  startTick: number,
  duration: number,
  over: Partial<AudioClip> = {},
): AudioClip => ({
  id,
  startTick,
  duration,
  fadeInTicks: 0,
  fadeOutTicks: 0,
  assetId: `asset-${id}`,
  offsetSeconds: 0,
  gain: 1,
  ...over,
});

const chord = (
  id: string,
  startTick: number,
  endTick: number,
  name: string,
  over: Partial<ChordRegion> = {},
): ChordRegion => ({
  id,
  startTick,
  endTick,
  name,
  noteName: name,
  color: [1, 2, 3],
  ...over,
});

const marker = (id: string, tick: number): Marker => ({
  id,
  tick,
  name: id,
  color: '#e8e8f0',
});

const sec = (
  id: string,
  type: SectionType,
  label: string,
  startTick: number,
  endTick: number,
): SongSection => ({ id, type, label, startTick, endTick });

// ── Reading the result ─────────────────────────────────────────────────────

const trackIn = (s: Snapshot, id: string): Track => {
  const found = s.tracks.find((t) => t.id === id);
  if (!found) throw new Error(`no track ${id}`);
  return found;
};
const midiIn = (s: Snapshot, trackId: string, clipId: string) =>
  trackIn(s, trackId).midiClips.find((c) => c.id === clipId);
const audioIn = (s: Snapshot, trackId: string, clipId: string) =>
  trackIn(s, trackId).audioClips.find((c) => c.id === clipId);

/** What `after` holds that `before` didn't, by id. */
const added = <T extends { id: string }>(
  before: readonly T[],
  after: readonly T[],
): T[] => {
  const had = new Set(before.map((x) => x.id));
  return after.filter((x) => !had.has(x.id));
};

const sorted = (list: readonly string[]): string[] => [...list].sort();

/** Where each of a clip's notes plays in the song, as `pitch@tick`. */
const songNotes = (clip: MidiClip): string[] =>
  sorted(clip.events.map((e) => `${e.note}@${clip.startTick + e.startTick}`));

/** A lane's points as [tick, value], in time order. */
const points = (lane: AutomationPoint[] | undefined): number[][] =>
  (lane ?? []).map((p) => [p.tick, p.value]).sort((a, b) => a[0] - b[0]);

const pairs = (list: ReadonlyArray<{ from: string; to: string }>): string[] =>
  sorted(list.map((p) => `${p.from}>${p.to}`));

/** Each section as `id from-to`, in bars of `bar` ticks, in start order. */
const spans = (list: readonly SongSection[], bar = BAR): string[] =>
  [...list]
    .sort((a, b) => a.startTick - b.startTick)
    .map((x) => `${x.id} ${x.startTick / bar}-${x.endTick / bar}`);

// ── Insert time ────────────────────────────────────────────────────────────

const AT = 8 * BAR; // the insert point, the downbeat of bar 9
const TICKS = 2 * BAR; // two bars of 4/4

/** Keys: k2 runs over the insert point (bars 7–10). */
const K2: MidiClip = {
  id: 'k2',
  startTick: 6 * BAR,
  durationTicks: 4 * BAR,
  events: [
    n('k2a', 64, 0),
    n('k2b', 65, BAR),
    n('k2c', 67, 2 * BAR),
    n('k2d', 69, 3 * BAR),
  ],
};
/** Bass: b1 runs over it on another track (bars 8–9). */
const B1: MidiClip = {
  id: 'b1',
  startTick: 7 * BAR,
  durationTicks: 2 * BAR,
  events: [n('b1a', 40, 0), n('b1b', 43, BAR)],
};
/** Vox: a2 runs over it (bars 8–9), trimmed and faded. */
const A2 = audio('a2', 7 * BAR, 2 * BAR, {
  fadeInTicks: 120,
  fadeOutTicks: 240,
  offsetSeconds: 0.5,
  gain: 0.8,
});

/** Sixteen bars of 4/4 with something on every lane and in the chart. */
function song(over: Partial<Snapshot> = {}): Snapshot {
  return snapshot({
    tracks: [
      midiTrack(
        'keys',
        [
          {
            id: 'k1',
            startTick: 0,
            events: [n('k1a', 60, 0), n('k1b', 62, BAR)],
          },
          K2,
          { id: 'k3', startTick: 12 * BAR, events: [n('k3a', 72, 0)] },
        ],
        {
          volume: [
            { tick: 0, value: 0.5 },
            { tick: AT, value: 0.7 },
            { tick: 20000, value: 0.9 },
          ],
          pan: [{ tick: 14000, value: -0.5 }],
        },
      ),
      midiTrack('bass', [
        B1,
        { id: 'b2', startTick: 10 * BAR, events: [n('b2a', 45, 0)] },
      ]),
      midiTrack('drums', [
        { id: 'd1', startTick: AT, events: [n('d1a', 36, 0)] },
      ]),
      audioTrack('vox', [
        audio('a1', 2 * BAR, 2 * BAR),
        A2,
        audio('a3', 12 * BAR, BAR),
      ]),
      midiTrack('empty', []),
    ],
    chordRegions: [
      chord('r1', 0, 4 * BAR, 'C'),
      chord('r5', 4 * BAR, 6 * BAR, 'F', { sourceClipId: 'k2' }),
      chord('r2', 6 * BAR, 9 * BAR, 'G', { rawStartTick: 6 * BAR - 20 }),
      chord('r3', 9 * BAR, 10 * BAR, 'Am', { sourceClipId: 'k2' }),
      chord('r4', 10 * BAR, 12 * BAR, 'Dm', {
        rawStartTick: 10 * BAR + 10,
        sourceClipId: 'k3',
      }),
    ],
    markers: [marker('m1', 4 * BAR), marker('m2', AT), marker('m3', 13 * BAR)],
    sections: [
      sec('intro', 'intro', 'Intro', 0, 4 * BAR),
      sec('verse', 'verse', 'Verse 1', 4 * BAR, 8 * BAR),
      sec('chorus', 'chorus', 'Chorus', 8 * BAR, 12 * BAR),
    ],
    masterAutomation: {
      volume: [
        { tick: 2 * BAR, value: 1 },
        { tick: AT, value: 0.5 },
        { tick: 16000, value: 0.25 },
      ],
    },
    loopStart: 9 * BAR,
    loopEnd: 11 * BAR,
    leadSheetBars: 16,
    leadSheetRepeats: [
      { startMeasure: 0, endMeasure: 3 },
      { startMeasure: 6, endMeasure: 9 },
      { startMeasure: 12, endMeasure: 15 },
    ],
    measureRestMap: { 2: 2, 12: 2 },
    measureFermatas: [3, 8, 9],
    measureRowSizes: [4, 4, 4, 2],
    scoreSystemBreaks: [4, 8],
    scorePageBreaks: [8],
    scoreSystemRuns: [
      [0, 4],
      [8, 4],
    ],
    scoreTextMarks: [
      { id: 't1', measureIdx: 9, kind: 'text', text: 'rit.' },
      { id: 't2', measureIdx: 2, kind: 'segno' },
    ],
    // k2c and k2d land in k2's right half, b1b in b1's.
    scoreArticulations: [
      'keys:k2:3840:67|staccato',
      'keys:k2:0:64|accent',
      'keys:k3:0:72|tenuto',
    ],
    scoreSlurs: ['keys:k2:1920:65|keys:k2:3840:67'],
    scoreSpellings: ['keys:k2:5760:69|A4', 'bass:b1:1920:43|G2'],
    scoreSlashNotes: ['bass:b1:1920:43', 'bass:b1:0:40'],
    ...over,
  });
}

/** The chart's bar-indexed fields, which shift when whole bars go in. */
const CHART_KEYS = [
  'leadSheetRepeats',
  'measureRestMap',
  'measureFermatas',
  'measureRowSizes',
  'scoreSystemBreaks',
  'scorePageBreaks',
  'scoreSystemRuns',
  'scoreTextMarks',
] as const;

/** Every store key Insert time may write. */
const INSERT_KEYS = new Set<string>([
  'tracks',
  'chordRegions',
  'markers',
  'sections',
  'masterAutomation',
  'loopStart',
  'loopEnd',
  'leadSheetBars',
  ...CHART_KEYS,
  'scoreArticulations',
  'scoreSlurs',
  'scoreSpellings',
  'scoreSlashNotes',
]);

describe('insertTimeEdit', () => {
  it('moves the MIDI clips after the point, splits the one across it and leaves the ones before it', () => {
    const s = song();
    const { mint, made } = counter();
    const next = applied(s, insertTime(s, AT, TICKS, mint));
    const fresh = added(
      trackIn(s, 'keys').midiClips,
      trackIn(next, 'keys').midiClips,
    );
    expect(fresh).toHaveLength(1);
    const [right] = fresh;
    expect(made.clip).toContain(right.id);

    // k1 ends long before the point; k3 starts after it.
    expect(midiIn(next, 'keys', 'k1')).toEqual(midiIn(s, 'keys', 'k1'));
    expect(midiIn(next, 'keys', 'k3')).toEqual({
      ...midiIn(s, 'keys', 'k3'),
      startTick: 12 * BAR + TICKS,
    });

    // k2 is cut at the point the way splitMidiClip cuts it, and its right
    // half moves two bars on.
    const halves = splitMidiClip(K2, AT, right.id);
    expect(halves).not.toBeNull();
    const [wantLeft, wantRight] = halves!;
    expect(midiIn(next, 'keys', 'k2')).toEqual(wantLeft);
    expect(right).toEqual({ ...wantRight, startTick: AT + TICKS });
    // As the song plays it: the left half keeps the id and the notes before
    // the cut; the right half's notes, ids kept, play two bars later.
    expect(songNotes(midiIn(next, 'keys', 'k2')!)).toEqual(
      sorted(['64@11520', '65@13440']),
    );
    expect(right.events.map((e) => [e.id, e.startTick])).toEqual([
      ['k2c', 0],
      ['k2d', BAR],
    ]);
    expect(songNotes(right)).toEqual(sorted(['67@19200', '69@21120']));
    expect(trackIn(next, 'keys').midiClips).toHaveLength(4);
  });

  it('does the same on every track', () => {
    const s = song();
    const { mint, made } = counter();
    const next = applied(s, insertTime(s, AT, TICKS, mint));
    const [keysRight] = added(
      trackIn(s, 'keys').midiClips,
      trackIn(next, 'keys').midiClips,
    );
    const bassNew = added(
      trackIn(s, 'bass').midiClips,
      trackIn(next, 'bass').midiClips,
    );
    expect(bassNew).toHaveLength(1);
    const [bassRight] = bassNew;
    expect(made.clip).toContain(bassRight.id);
    expect(bassRight.id).not.toBe(keysRight.id);

    const [wantLeft, wantRight] = splitMidiClip(B1, AT, bassRight.id)!;
    expect(midiIn(next, 'bass', 'b1')).toEqual(wantLeft);
    expect(bassRight).toEqual({ ...wantRight, startTick: AT + TICKS });
    expect(midiIn(next, 'bass', 'b2')?.startTick).toBe(10 * BAR + TICKS);
    // A clip that starts right on the point moves too.
    expect(midiIn(next, 'drums', 'd1')?.startTick).toBe(AT + TICKS);
    expect(trackIn(next, 'empty')).toEqual(trackIn(s, 'empty'));
  });

  it("moves and splits audio clips, the right half playing the original's audio", () => {
    const s = song();
    const { mint, made } = counter();
    const edit = insertTime(s, AT, TICKS, mint);
    const next = applied(s, edit);
    const fresh = added(
      trackIn(s, 'vox').audioClips,
      trackIn(next, 'vox').audioClips,
    );
    expect(fresh).toHaveLength(1);
    const [right] = fresh;
    expect(made.clip).toContain(right.id);

    expect(audioIn(next, 'vox', 'a1')).toEqual(audioIn(s, 'vox', 'a1'));
    expect(audioIn(next, 'vox', 'a2')).toEqual(
      audioClipSection(A2, A2.startTick, AT, BPM),
    );
    expect(right).toEqual({
      ...audioClipSection(A2, AT, A2.startTick + A2.duration, BPM),
      id: right.id,
      startTick: AT + TICKS,
    });
    // It reads on from the cut: half a second in, plus the bar before it.
    expect(right.offsetSeconds).toBe(0.5 + 2.5);
    expect(audioIn(next, 'vox', 'a3')?.startTick).toBe(12 * BAR + TICKS);
    expect(edit.sharedAudio).toEqual([{ from: 'a2', to: right.id }]);
  });

  it('moves the automation at and after the point, on the tracks and on the master', () => {
    const s = song();
    const next = applied(s, insertTime(s, AT, TICKS, counter().mint));
    const lanes = trackIn(next, 'keys').automation;
    expect(points(lanes?.volume)).toEqual([
      [0, 0.5],
      [AT + TICKS, 0.7],
      [20000 + TICKS, 0.9],
    ]);
    expect(points(lanes?.pan)).toEqual([[14000, -0.5]]);
    expect(points(next.masterAutomation.volume)).toEqual([
      [2 * BAR, 1],
      [AT + TICKS, 0.5],
      [16000 + TICKS, 0.25],
    ]);
  });

  it('moves the chords after the point and splits the one across it', () => {
    const s = song();
    const { mint, made } = counter();
    const next = applied(s, insertTime(s, AT, TICKS, mint));
    const [keysRight] = added(
      trackIn(s, 'keys').midiClips,
      trackIn(next, 'keys').midiClips,
    );
    const byId = (id: string) => next.chordRegions.find((r) => r.id === id);
    const was = (id: string) => s.chordRegions.find((r) => r.id === id);

    expect(byId('r1')).toEqual(was('r1'));
    // r5 starts before the point: it stays, still read from k2, whose left
    // half kept the id.
    expect(byId('r5')).toEqual(was('r5'));
    // r2 runs over the point: its left part keeps the id and ends there; its
    // right part has a new id, the same chord, after the new bars.
    expect(byId('r2')).toMatchObject({ startTick: 6 * BAR, endTick: AT });
    const fresh = added(s.chordRegions, next.chordRegions);
    expect(fresh).toHaveLength(1);
    const [right] = fresh;
    expect(made.region).toContain(right.id);
    expect(right).toMatchObject({
      startTick: AT + TICKS,
      endTick: 9 * BAR + TICKS,
      name: 'G',
      noteName: 'G',
      color: [1, 2, 3],
    });
    expect(right.rawStartTick).toBeUndefined();
    // r3 was read from k2 after the point, so it follows k2's right half.
    expect(byId('r3')).toEqual({
      ...was('r3'),
      startTick: 9 * BAR + TICKS,
      endTick: 10 * BAR + TICKS,
      sourceClipId: keysRight.id,
    });
    // r4 takes its unsnapped start along, and k3 moved whole.
    expect(byId('r4')).toEqual({
      ...was('r4'),
      startTick: 10 * BAR + TICKS,
      endTick: 12 * BAR + TICKS,
      rawStartTick: 10 * BAR + 10 + TICKS,
    });
    expect(next.chordRegions).toHaveLength(6);
  });

  it('moves the markers at and after the point', () => {
    const s = song();
    const next = applied(s, insertTime(s, AT, TICKS, counter().mint));
    expect(Object.fromEntries(next.markers.map((m) => [m.id, m.tick]))).toEqual(
      { m1: 4 * BAR, m2: AT + TICKS, m3: 13 * BAR + TICKS },
    );
  });

  it('moves the sections after the point, keeps one that ends on it and lengthens one across it', () => {
    const s = song();
    const atNine = applied(s, insertTime(s, AT, TICKS, counter().mint));
    expect(atNine.sections).toEqual([
      sec('intro', 'intro', 'Intro', 0, 4 * BAR),
      sec('verse', 'verse', 'Verse 1', 4 * BAR, 8 * BAR),
      sec('chorus', 'chorus', 'Chorus', 10 * BAR, 14 * BAR),
    ]);
    const atSeven = applied(s, insertTime(s, 6 * BAR, TICKS, counter().mint));
    expect(spans(atSeven.sections)).toEqual([
      'intro 0-4',
      'verse 4-10',
      'chorus 10-14',
    ]);
  });

  it('moves a loop after the point, stretches one across it and leaves one before it', () => {
    const loop = (start: number, end: number) => {
      const s = song({ loopStart: start, loopEnd: end });
      const next = applied(s, insertTime(s, AT, TICKS, counter().mint));
      return [next.loopStart / BAR, next.loopEnd / BAR];
    };
    expect(loop(9 * BAR, 11 * BAR)).toEqual([11, 13]);
    expect(loop(AT, 10 * BAR)).toEqual([10, 12]);
    expect(loop(6 * BAR, 10 * BAR)).toEqual([6, 12]);
    expect(loop(0, 4 * BAR)).toEqual([0, 4]);
  });

  it("shifts the chart's bars as + Measure does when whole bars go in", () => {
    const s = song();
    const next = applied(s, insertTime(s, AT, TICKS, counter().mint));
    expect(next.leadSheetRepeats).toEqual([
      { startMeasure: 0, endMeasure: 3 },
      { startMeasure: 6, endMeasure: 11 },
      { startMeasure: 14, endMeasure: 17 },
    ]);
    expect(next.measureRestMap).toEqual({ 2: 2, 14: 2 });
    expect(next.measureFermatas).toEqual([3, 10, 11]);
    expect(next.measureRowSizes).toEqual([4, 6, 4, 2]);
    expect(next.scoreSystemBreaks).toEqual([4, 10]);
    expect(next.scorePageBreaks).toEqual([10]);
    expect(next.scoreSystemRuns).toEqual([
      [0, 4],
      [10, 4],
    ]);
    expect(next.scoreTextMarks.map((m) => [m.id, m.measureIdx])).toEqual([
      ['t1', 11],
      ['t2', 2],
    ]);
    // Field for field what + Measure writes for two bars at bar 9.
    const plus = barsPatch(s, AT / BAR, TICKS / BAR);
    expect(plus).not.toBeNull();
    for (const key of CHART_KEYS) {
      expect({ key, value: next[key] }).toEqual({ key, value: plus![key] });
    }
  });

  it("grows the chart's bar count only when it is set and the new bars land inside it", () => {
    const barsAfter = (leadSheetBars: number | null) => {
      const s = song({ leadSheetBars });
      return applied(s, insertTime(s, AT, TICKS, counter().mint)).leadSheetBars;
    };
    expect(barsAfter(16)).toBe(18);
    expect(barsAfter(null)).toBeNull();
    expect(barsAfter(6)).toBe(6);
  });

  it("leaves the chart's bars alone when the insert isn't whole bars", () => {
    const s = song();
    const at = AT + 480;
    const next = applied(s, insertTime(s, at, 960, counter().mint));
    for (const key of [...CHART_KEYS, 'leadSheetBars'] as const) {
      expect({ key, value: next[key] }).toEqual({ key, value: s[key] });
    }
    // The music after the point still moves.
    expect(next.markers.find((m) => m.id === 'm3')?.tick).toBe(13 * BAR + 960);
    expect(next.sections.find((x) => x.id === 'chorus')).toMatchObject({
      startTick: 8 * BAR,
      endTick: 12 * BAR + 960,
    });
  });

  it("carries the Score's marks on split notes to their new keys", () => {
    const s = song();
    const next = applied(s, insertTime(s, AT, TICKS, counter().mint));
    const [keysRight] = added(
      trackIn(s, 'keys').midiClips,
      trackIn(next, 'keys').midiClips,
    );
    const [bassRight] = added(
      trackIn(s, 'bass').midiClips,
      trackIn(next, 'bass').midiClips,
    );
    const k = keysRight.id;
    const b = bassRight.id;
    expect(sorted(next.scoreArticulations)).toEqual(
      sorted([
        `keys:${k}:0:67|staccato`,
        'keys:k2:0:64|accent',
        'keys:k3:0:72|tenuto',
      ]),
    );
    expect(next.scoreSlurs).toEqual([`keys:k2:1920:65|keys:${k}:0:67`]);
    expect(sorted(next.scoreSpellings)).toEqual(
      sorted([`keys:${k}:1920:69|A4`, `bass:${b}:0:43|G2`]),
    );
    expect(sorted(next.scoreSlashNotes)).toEqual(
      sorted([`bass:${b}:0:43`, 'bass:b1:0:40']),
    );
  });

  it('writes nothing else', () => {
    const s = song();
    const edit = insertTime(s, AT, TICKS, counter().mint);
    expect(Object.keys(edit.patch).filter((k) => !INSERT_KEYS.has(k))).toEqual(
      [],
    );
    const next = applied(s, edit);
    expect(next.tracks.map((t) => t.id)).toEqual(s.tracks.map((t) => t.id));
    // A track keeps everything but its clips and automation.
    const rest = (t: Track) => ({
      ...t,
      midiClips: [],
      audioClips: [],
      automation: undefined,
    });
    for (const t of next.tracks) {
      expect(rest(t)).toEqual(rest(trackIn(s, t.id)));
    }
  });

  it('never changes the state it is given', () => {
    const s = song();
    const copy = structuredClone(s);
    insertTime(s, AT, TICKS, counter().mint);
    expect(s).toEqual(copy);
  });
});

// ── A window of a MIDI clip ────────────────────────────────────────────────

describe('midiClipSection', () => {
  /** Bars 2–5, a note on each downbeat. */
  const clip: MidiClip = {
    id: 'k',
    name: 'Keys',
    startTick: BAR,
    durationTicks: 4 * BAR,
    events: [
      n('a', 60, 0),
      n('b', 62, BAR),
      n('c', 64, 2 * BAR),
      n('d', 65, 3 * BAR),
    ],
  };

  it('keeps the notes that start inside the window, where they play', () => {
    const part = midiClipSection(clip, 2 * BAR, 4 * BAR);
    expect(part).not.toBeNull();
    expect(part!.startTick).toBe(2 * BAR);
    // d starts right where the window ends.
    expect(songNotes(part!)).toEqual(sorted(['62@3840', '64@5760']));
  });

  it('takes the part of the clip in a window that starts before it', () => {
    const part = midiClipSection(clip, 0, 3 * BAR);
    expect(part).not.toBeNull();
    expect(songNotes(part!)).toEqual(sorted(['60@1920', '62@3840']));
  });

  it('is null for a window that misses the clip', () => {
    expect(midiClipSection(clip, 6 * BAR, 8 * BAR)).toBeNull();
    expect(midiClipSection(clip, 0, BAR)).toBeNull();
  });

  it('never changes the clip', () => {
    const copy = structuredClone(clip);
    midiClipSection(clip, 2 * BAR, 4 * BAR);
    expect(clip).toEqual(copy);
  });
});

// ── Duplicate a section ────────────────────────────────────────────────────

const VERSE_START = 4 * BAR; // Verse 1 is bars 5–8
const VERSE_END = 8 * BAR; // where the Chorus starts
const VERSE_LENGTH = VERSE_END - VERSE_START;

/** Intro, Verse 1 and Chorus, four bars each, with music in and around the verse. */
function verseSong(): Snapshot {
  return snapshot({
    tracks: [
      midiTrack(
        'keys',
        [
          // Wholly before the verse.
          {
            id: 'k0',
            startTick: 0,
            events: [n('k0a', 60, 0), n('k0b', 64, BAR)],
          },
          // From bar 3 to the verse's end: k1a is before the verse, k1b
          // (its downbeat) and k1c inside it.
          {
            id: 'k1',
            startTick: 2 * BAR,
            durationTicks: 6 * BAR,
            events: [
              n('k1a', 60, 0),
              n('k1b', 62, 2 * BAR),
              n('k1c', 64, 3 * BAR),
            ],
          },
        ],
        {
          volume: [
            { tick: 0, value: 0.1 },
            { tick: VERSE_START, value: 0.2 },
            { tick: 5 * BAR, value: 0.3 },
            { tick: VERSE_END, value: 0.4 },
          ],
        },
      ),
      midiTrack('bass', [
        // Exactly the verse, named and muted.
        {
          id: 'b1',
          name: 'Riff',
          muted: true,
          startTick: VERSE_START,
          durationTicks: VERSE_LENGTH,
          events: [n('b1a', 40, 0), n('b1b', 43, BAR)],
        },
        { id: 'b2', startTick: VERSE_END, events: [n('b2a', 45, 0)] },
      ]),
      audioTrack('vox', [
        // Bars 3–6: over the verse's start.
        audio('a1', 2 * BAR, 4 * BAR, {
          fadeInTicks: 100,
          fadeOutTicks: 200,
          offsetSeconds: 1,
        }),
        // Bars 8–9: over the verse's end.
        audio('a3', 7 * BAR, 2 * BAR, { fadeInTicks: 50, fadeOutTicks: 60 }),
        audio('a2', 10 * BAR, BAR),
      ]),
    ],
    chordRegions: [
      chord('c1', 0, 2 * BAR, 'C'),
      chord('c2', 2 * BAR, 5 * BAR, 'Am'),
      chord('c3', 5 * BAR, 6 * BAR, 'F', { sourceClipId: 'b1' }),
      chord('c4', 6 * BAR, 8 * BAR, 'G', { sourceClipId: 'k0' }),
      chord('c5', 8 * BAR, 10 * BAR, 'C'),
    ],
    markers: [marker('hit', 5 * BAR), marker('drop', VERSE_END)],
    sections: [
      sec('intro', 'intro', 'Intro', 0, VERSE_START),
      sec('verse', 'verse', 'Verse 1', VERSE_START, VERSE_END),
      sec('chorus', 'chorus', 'Chorus', VERSE_END, 12 * BAR),
    ],
    masterAutomation: {
      volume: [
        { tick: 8000, value: 0.9 },
        { tick: 16000, value: 0.5 },
      ],
    },
    scoreArticulations: [
      'bass:b1:0:40|staccato',
      'keys:k1:3840:62|accent',
      'keys:k0:0:60|tenuto',
    ],
    // The second slur starts on k1a, before the verse.
    scoreSlurs: [
      'bass:b1:0:40|bass:b1:1920:43',
      'keys:k1:0:60|keys:k1:5760:64',
    ],
    scoreSpellings: ['bass:b1:1920:43|G2'],
    scoreSlashNotes: ['keys:k1:5760:64'],
  });
}

describe('duplicateSectionEdit', () => {
  const E = VERSE_END;
  const L = VERSE_LENGTH;

  /** The verse duplicated, with the clips each track gained. */
  const duplicated = () => {
    const s = verseSong();
    const { mint, made } = counter();
    const edit = duplicate(s, 'verse', mint);
    const next = applied(s, edit);
    const gained = (trackId: string) =>
      added(trackIn(s, trackId).midiClips, trackIn(next, trackId).midiClips);
    return { s, next, edit: edit!, made, gained };
  };

  it("moves everything after the section on by the section's length", () => {
    const { next } = duplicated();
    expect(midiIn(next, 'bass', 'b2')?.startTick).toBe(E + L);
    expect(audioIn(next, 'vox', 'a2')?.startTick).toBe(10 * BAR + L);
    expect(next.chordRegions.find((r) => r.id === 'c5')).toMatchObject({
      startTick: E + L,
      endTick: 10 * BAR + L,
    });
    expect(next.sections.find((x) => x.id === 'chorus')).toEqual(
      sec('chorus', 'chorus', 'Chorus', E + L, 12 * BAR + L),
    );
    expect(next.markers.find((m) => m.id === 'drop')?.tick).toBe(E + L);
  });

  it('copies the notes in the section into a new clip after it, name and mute kept', () => {
    const { s, next, made, gained } = duplicated();
    const fresh = gained('bass');
    expect(fresh).toHaveLength(1);
    const [riff] = fresh;
    expect(made.clip).toContain(riff.id);
    expect(riff).toMatchObject({
      startTick: E,
      durationTicks: L,
      name: 'Riff',
      muted: true,
    });
    expect(songNotes(riff)).toEqual(sorted(['40@15360', '43@17280']));
    // The original stays as it was.
    expect(midiIn(next, 'bass', 'b1')).toEqual(midiIn(s, 'bass', 'b1'));
  });

  it('copies only the part inside the section of a clip that starts before it', () => {
    const { s, next, made, gained } = duplicated();
    // k0 lies wholly before the verse, so k1's part is the one new clip.
    const fresh = gained('keys');
    expect(fresh).toHaveLength(1);
    const [part] = fresh;
    expect(made.clip).toContain(part.id);
    expect(part).toMatchObject({ startTick: E, durationTicks: L });
    expect(songNotes(part)).toEqual(sorted(['62@15360', '64@17280']));
    expect(midiIn(next, 'keys', 'k1')).toEqual(midiIn(s, 'keys', 'k1'));
  });

  it('gives every copied note a new id of its own', () => {
    const { made, gained } = duplicated();
    const ids = [...gained('keys'), ...gained('bass')].flatMap((c) =>
      c.events.map((e) => e.id),
    );
    expect(ids).toHaveLength(4);
    for (const id of ids) expect(made.note).toContain(id);
    expect(new Set(ids).size).toBe(4);
  });

  it("copies the audio windows in the section, each playing its source clip's recording", () => {
    const { s, next, edit, made } = duplicated();
    const a1 = audioIn(s, 'vox', 'a1')!;
    const a3 = audioIn(s, 'vox', 'a3')!;
    const fresh = added(
      trackIn(s, 'vox').audioClips,
      trackIn(next, 'vox').audioClips,
    );
    // a1's part in the verse, a3's part in it, and a3's right half, which
    // the insert at the verse's end cut off.
    expect(fresh).toHaveLength(3);
    for (const c of fresh) expect(made.clip).toContain(c.id);
    const at = (tick: number) => {
      const found = fresh.find((c) => c.startTick === tick);
      if (!found) throw new Error(`no new audio clip at ${tick}`);
      return found;
    };
    const a1Copy = at(E);
    const a3Copy = at(7 * BAR + L);
    const a3Right = at(E + L);
    expect(a1Copy).toEqual({
      ...audioClipSection(a1, VERSE_START, E, BPM),
      id: a1Copy.id,
      startTick: E,
    });
    // Two bars into a1's recording: a second in, plus 2 × 2.5 s.
    expect(a1Copy.offsetSeconds).toBe(6);
    expect(a3Copy).toEqual({
      ...audioClipSection(a3, VERSE_START, E, BPM),
      id: a3Copy.id,
      startTick: 7 * BAR + L,
    });
    expect(a3Right).toEqual({
      ...audioClipSection(a3, E, 9 * BAR, BPM),
      id: a3Right.id,
      startTick: E + L,
    });
    expect(pairs(edit.sharedAudio)).toEqual(
      pairs([
        { from: 'a1', to: a1Copy.id },
        { from: 'a3', to: a3Copy.id },
        { from: 'a3', to: a3Right.id },
      ]),
    );
  });

  it('copies the chords over the section with new ids, read from the copied clips', () => {
    const { s, next, made, gained } = duplicated();
    const [riff] = gained('bass');
    const fresh = added(s.chordRegions, next.chordRegions);
    expect(fresh).toHaveLength(3);
    for (const r of fresh) expect(made.region).toContain(r.id);
    const at = (tick: number) => {
      const found = fresh.find((r) => r.startTick === tick);
      if (!found) throw new Error(`no new chord at ${tick}`);
      return found;
    };
    // c2 (Am) starts before the verse: its part in it, bar 5, is copied.
    expect(at(E)).toMatchObject({ endTick: E + BAR, name: 'Am' });
    expect(at(E).sourceClipId).toBeUndefined();
    // c3 (F) was read from b1: its copy is read from b1's copy.
    expect(at(E + BAR)).toMatchObject({
      endTick: E + 2 * BAR,
      name: 'F',
      sourceClipId: riff.id,
    });
    // c4 (G) was read from k0, which has no copy.
    expect(at(E + 2 * BAR)).toMatchObject({ endTick: E + L, name: 'G' });
    expect(at(E + 2 * BAR).sourceClipId).toBeUndefined();
    // The chords up to the verse's end stay as they were.
    const kept = ['c1', 'c2', 'c3', 'c4'];
    expect(next.chordRegions.filter((r) => kept.includes(r.id))).toEqual(
      s.chordRegions.slice(0, 4),
    );
  });

  it('copies the automation in the section, on the tracks and on the master', () => {
    const { next } = duplicated();
    expect(points(trackIn(next, 'keys').automation?.volume)).toEqual([
      [0, 0.1],
      [VERSE_START, 0.2],
      [5 * BAR, 0.3],
      [E, 0.2],
      [E + BAR, 0.3],
      [E + L, 0.4],
    ]);
    expect(points(next.masterAutomation.volume)).toEqual([
      [8000, 0.9],
      [8000 + L, 0.9],
      [16000 + L, 0.5],
    ]);
  });

  it("copies the Score's marks of the copied notes, and a slur only when both its ends were copied", () => {
    const { s, next, gained } = duplicated();
    const [riff] = gained('bass');
    const [part] = gained('keys');
    /** The Score key of the copy's note at song tick `tick`. */
    const key = (trackId: string, clip: MidiClip, tick: number, midi: number) =>
      noteKey(trackId, clip.id, tick - clip.startTick, midi);
    const riffLow = key('bass', riff, E, 40);
    const riffHigh = key('bass', riff, E + BAR, 43);
    expect(sorted(next.scoreArticulations)).toEqual(
      sorted([
        ...s.scoreArticulations,
        `${riffLow}|staccato`,
        `${key('keys', part, E, 62)}|accent`,
      ]),
    );
    expect(sorted(next.scoreSlurs)).toEqual(
      sorted([...s.scoreSlurs, `${riffLow}|${riffHigh}`]),
    );
    expect(sorted(next.scoreSpellings)).toEqual(
      sorted([...s.scoreSpellings, `${riffHigh}|G2`]),
    );
    expect(sorted(next.scoreSlashNotes)).toEqual(
      sorted([...s.scoreSlashNotes, key('keys', part, E + BAR, 64)]),
    );
  });

  it('adds a section of the same type and name over the copy, and copies no markers', () => {
    const { s, next, made } = duplicated();
    const fresh = added(s.sections, next.sections);
    expect(fresh).toHaveLength(1);
    const [copy] = fresh;
    expect(made.section).toContain(copy.id);
    expect(copy).toEqual(sec(copy.id, 'verse', 'Verse 1', E, E + L));
    expect(spans(next.sections)).toEqual([
      'intro 0-4',
      'verse 4-8',
      `${copy.id} 8-12`,
      'chorus 12-16',
    ]);
    expect(Object.fromEntries(next.markers.map((m) => [m.id, m.tick]))).toEqual(
      { hit: 5 * BAR, drop: E + L },
    );
  });

  it('is null for a section that is not there', () => {
    expect(duplicate(verseSong(), 'nope', counter().mint)).toBeNull();
  });

  it('never changes the state it is given', () => {
    const s = verseSong();
    const copy = structuredClone(s);
    duplicate(s, 'verse', counter().mint);
    expect(s).toEqual(copy);
  });
});

// ── Insert a section before or after one ───────────────────────────────────

describe('insertSectionEdit', () => {
  const BAR3 = 1440; // a bar of 3/4
  const NEW = DEFAULT_SECTION_BARS * BAR3; // eight bars of 3/4

  /** A verse and a chorus of four bars of 3/4, a clip on the chorus's downbeat. */
  const waltz = () =>
    snapshot({
      timeSignatureNumerator: 3,
      timeSignatureDenominator: 4,
      tracks: [
        midiTrack('keys', [
          { id: 'k', startTick: 4 * BAR3, events: [n('ka', 60, 0)] },
        ]),
      ],
      sections: [
        sec('a', 'verse', 'Verse', 0, 4 * BAR3),
        sec('b', 'chorus', 'Chorus', 4 * BAR3, 8 * BAR3),
      ],
    });

  /** Each section as `type label from-to`, in bars of 3/4, in start order. */
  const layout = (s: Snapshot) =>
    [...s.sections]
      .sort((x, y) => x.startTick - y.startTick)
      .map(
        (x) => `${x.type} ${x.label} ${x.startTick / BAR3}-${x.endTick / BAR3}`,
      );

  it("puts eight bars of the project's metre before a section, which moves after them", () => {
    const s = waltz();
    const { mint, made } = counter();
    const next = applied(
      s,
      insertSection(
        s,
        'b',
        'before',
        { type: 'bridge', label: 'Bridge' },
        mint,
      ),
    );
    const fresh = added(s.sections, next.sections);
    expect(fresh).toHaveLength(1);
    const [bridge] = fresh;
    expect(made.section).toContain(bridge.id);
    expect(bridge).toEqual(
      sec(bridge.id, 'bridge', 'Bridge', 4 * BAR3, 4 * BAR3 + NEW),
    );
    expect(layout(next)).toEqual([
      'verse Verse 0-4',
      'bridge Bridge 4-12',
      'chorus Chorus 12-16',
    ]);
    // The music moves by the same eight bars.
    expect(midiIn(next, 'keys', 'k')?.startTick).toBe(4 * BAR3 + NEW);
  });

  it('puts eight bars after a section, which stays where it is', () => {
    const s = waltz();
    const afterVerse = applied(
      s,
      insertSection(
        s,
        'a',
        'after',
        { type: 'solo', label: 'Solo' },
        counter().mint,
      ),
    );
    expect(layout(afterVerse)).toEqual([
      'verse Verse 0-4',
      'solo Solo 4-12',
      'chorus Chorus 12-16',
    ]);
    expect(midiIn(afterVerse, 'keys', 'k')?.startTick).toBe(4 * BAR3 + NEW);

    const afterChorus = applied(
      s,
      insertSection(
        s,
        'b',
        'after',
        { type: 'custom', label: 'Rap break' },
        counter().mint,
      ),
    );
    expect(layout(afterChorus)).toEqual([
      'verse Verse 0-4',
      'chorus Chorus 4-8',
      'custom Rap break 8-16',
    ]);
    // Nothing after the chorus to move.
    expect(midiIn(afterChorus, 'keys', 'k')?.startTick).toBe(4 * BAR3);
  });

  it('moves the first section on when one goes in before it', () => {
    const s = waltz();
    const next = applied(
      s,
      insertSection(
        s,
        'a',
        'before',
        { type: 'intro', label: 'Intro' },
        counter().mint,
      ),
    );
    expect(layout(next)).toEqual([
      'intro Intro 0-8',
      'verse Verse 8-12',
      'chorus Chorus 12-16',
    ]);
  });

  it('is null for a section that is not there', () => {
    expect(
      insertSection(
        waltz(),
        'nope',
        'after',
        { type: 'verse', label: 'Verse' },
        counter().mint,
      ),
    ).toBeNull();
  });
});

// ── When an arrangement edit has to wait ───────────────────────────────────

describe('arrangementBlocker', () => {
  const user = (userName: string, selectedTrackId: string | null) => ({
    userId: `auth0|${userName}`,
    userName,
    selectedTrackId,
  });

  it('lets an arrangement edit through when nothing stands in its way', () => {
    expect(blocker(song())).toBeNull();
    // A collaborator who holds no track doesn't stop it.
    expect(
      blocker(song({ remoteUsers: new Map([[1, user('Ana', null)]]) })),
    ).toBeNull();
  });

  it('asks to stop recording first', () => {
    expect(blocker(song({ isRecording: true }))).toBe('Stop recording first');
  });

  it('names a collaborator who is holding a track', () => {
    const reason = blocker(
      song({
        remoteUsers: new Map([
          [1, user('Ana', null)],
          [2, user('Maya', 'bass')],
        ]),
      }),
    );
    expect(reason).toContain('Maya');
    expect(reason).toContain('is editing a track');
  });
});
