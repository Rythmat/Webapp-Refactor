import { describe, expect, it } from 'vitest';
import type { ChordRegion } from '@/daw/store/prismSlice';
import type { Track } from '@/daw/store/tracksSlice';
import {
  chordSelectionSnapshot,
  nextChordSelection,
  noteSelectionKey,
  noteSelectionSnapshot,
  notesInMarquee,
  resolveNoteSelection,
} from './insightSelection';

const BAR = 1920;
// Deliberately out of timeline order: selection results must be in order.
const regions = [
  { id: 'c', startTick: 2 * BAR },
  { id: 'a', startTick: 0 },
  { id: 'd', startTick: 3 * BAR },
  { id: 'b', startTick: BAR },
];
const plain = { shift: false, toggle: false };

describe('nextChordSelection', () => {
  it('selects just the clicked chord on a plain click', () => {
    expect(nextChordSelection(regions, ['a', 'b'], 'a', 'c', plain)).toEqual({
      selectedIds: ['c'],
      anchorId: 'c',
    });
  });

  it('adds and removes chords with Cmd/Ctrl-click, keeping timeline order', () => {
    const toggle = { shift: false, toggle: true };
    const added = nextChordSelection(regions, ['c'], 'c', 'a', toggle);
    expect(added.selectedIds).toEqual(['a', 'c']);
    const removed = nextChordSelection(
      regions,
      added.selectedIds,
      'a',
      'c',
      toggle,
    );
    expect(removed.selectedIds).toEqual(['a']);
  });

  it('selects the run from the anchor with Shift-click, in either direction', () => {
    const shift = { shift: true, toggle: false };
    expect(nextChordSelection(regions, ['b'], 'b', 'd', shift)).toEqual({
      selectedIds: ['b', 'c', 'd'],
      anchorId: 'b',
    });
    expect(
      nextChordSelection(regions, ['d'], 'd', 'a', shift).selectedIds,
    ).toEqual(['a', 'b', 'c', 'd']);
  });

  it('treats Shift-click with no anchor as a plain click', () => {
    const shift = { shift: true, toggle: false };
    expect(
      nextChordSelection(regions, [], null, 'b', shift).selectedIds,
    ).toEqual(['b']);
  });
});

const note = (n: number, startTick: number, durationTicks = BAR) => ({
  note: n,
  velocity: 100,
  startTick,
  durationTicks,
  channel: 0,
});
const chord = (id: string, bar: number) =>
  ({ id, startTick: bar * BAR, endTick: (bar + 1) * BAR }) as ChordRegion;

const session = (tracks: unknown[]) => ({
  tracks: tracks as Track[],
  chordRegions: [
    chord('i', 0),
    chord('ii', 1),
    chord('iii', 2),
    chord('iv', 3),
  ],
  bpm: 92,
  timeSignatureNumerator: 4,
  timeSignatureDenominator: 4,
  rootNote: 0,
  mode: 'ionian',
});

// Keys: a clip starting at bar 2 with C major then F major (clip-relative).
const keys = {
  id: 'keys',
  name: 'Keys',
  type: 'midi',
  instrument: 'electric-piano',
  trackRole: 'chords',
  midiClips: [
    {
      id: 'k',
      startTick: BAR,
      events: [
        note(60, 0),
        note(64, 0),
        note(67, 0),
        note(65, BAR),
        note(69, BAR),
        note(72, BAR),
      ],
    },
  ],
  audioClips: [],
};
const bass = {
  id: 'bass',
  name: 'Bass',
  type: 'midi',
  instrument: 'soundfont',
  trackRole: 'bass',
  midiClips: [
    {
      id: 'b',
      startTick: 0,
      events: [
        note(36, 0),
        note(36, BAR),
        note(41, 2 * BAR),
        note(43, 3 * BAR),
      ],
    },
  ],
  audioClips: [],
};

describe('chordSelectionSnapshot', () => {
  it('keeps only the selected chords and the notes sounding during them', () => {
    const snap = chordSelectionSnapshot(session([keys, bass]), ['iii', 'ii']);
    expect(snap.chordRegions.map((r) => r.id)).toEqual(['ii', 'iii']);
    // Keys notes land at bars 2 and 3 once the clip offset is applied.
    expect(
      snap.tracks[0].midiClips[0].events.map((e) => [e.note, e.startTick]),
    ).toEqual([
      [60, BAR],
      [64, BAR],
      [67, BAR],
      [65, 2 * BAR],
      [69, 2 * BAR],
      [72, 2 * BAR],
    ]);
    expect(snap.tracks[1].midiClips[0].events.map((e) => e.note)).toEqual([
      36, 41,
    ]);
    expect([snap.rootNote, snap.mode, snap.bpm]).toEqual([0, 'ionian', 92]);
  });
});

describe('note selection', () => {
  // Drawn note bars: a chord stacked at x 100–180, a note at x 200–260 in the
  // same clip, and a bass note below.
  const bar = (
    clipId: string,
    index: number,
    x: number,
    y: number,
    w = 80,
  ) => ({
    trackId: clipId === 'b' ? 'bass' : 'keys',
    clipId,
    index,
    x,
    y,
    w,
    h: 3,
  });
  const drawn = [
    bar('k', 0, 100, 40),
    bar('k', 1, 100, 34),
    bar('k', 2, 100, 28),
    bar('k', 3, 200, 40, 60),
    bar('b', 0, 100, 130),
  ];

  it('selects every note a marquee touches, even one that started before it', () => {
    // Begun partway through the chord: its notes are still captured.
    expect(notesInMarquee(drawn, { x0: 150, y0: 25, x1: 170, y1: 45 })).toEqual(
      [{ trackId: 'keys', clipId: 'k', noteIndices: [0, 1, 2] }],
    );
  });

  it('selects across clips and tracks, dragged in either direction', () => {
    expect(
      notesInMarquee(drawn, { x0: 230, y0: 140, x1: 120, y1: 30 }),
    ).toEqual([
      { trackId: 'keys', clipId: 'k', noteIndices: [0, 1, 2, 3] },
      { trackId: 'bass', clipId: 'b', noteIndices: [0] },
    ]);
  });

  it('selects nothing when the marquee touches no note', () => {
    expect(notesInMarquee(drawn, { x0: 0, y0: 0, x1: 90, y1: 200 })).toEqual(
      [],
    );
    expect(
      notesInMarquee(drawn, { x0: 110, y0: 50, x1: 170, y1: 120 }),
    ).toEqual([]);
  });

  it('resolves to absolute ticks per track and drops stale notes', () => {
    const resolved = resolveNoteSelection(session([keys, bass]).tracks, [
      { trackId: 'keys', clipId: 'k', noteIndices: [3, 99] },
      { trackId: 'keys', clipId: 'gone', noteIndices: [0] },
    ]);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].events.map((e) => [e.note, e.startTick])).toEqual([
      [65, 2 * BAR],
    ]);
  });

  it('detects chords from just the selected notes, in the session key', () => {
    const snap = noteSelectionSnapshot(session([keys, bass]), [
      { trackId: 'keys', clipId: 'k', noteIndices: [0, 1, 2, 3, 4, 5] },
    ]);
    expect(snap.tracks.map((t) => t.id)).toEqual(['keys']);
    expect(snap.chordRegions.map((r) => r.degreeKey)).toEqual([
      '1 major',
      '4 major',
    ]);
  });

  it('keys an analysis to the selected notes, so editing one makes it stale', () => {
    const selection = [{ trackId: 'keys', clipId: 'k', noteIndices: [0] }];
    const before = noteSelectionKey(session([keys]).tracks, selection);
    const moved = {
      ...keys,
      midiClips: [
        {
          ...keys.midiClips[0],
          events: [note(62, 0), ...keys.midiClips[0].events.slice(1)],
        },
      ],
    };
    expect(noteSelectionKey(session([moved]).tracks, selection)).not.toBe(
      before,
    );
  });
});
