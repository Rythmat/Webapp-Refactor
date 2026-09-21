import { describe, expect, it } from 'vitest';
import type { ChordRegion } from '@/daw/store/prismSlice';
import {
  buildClipboard,
  isEmptyRoadmap,
  pasteChords,
  pasteRoadmap,
  roadmapAt,
  type CopySource,
} from '../leadSheetClipboard';

const BAR = 1920;
const grey: [number, number, number] = [128, 128, 128];

const region = (
  id: string,
  startTick: number,
  endTick: number,
  noteName: string,
): ChordRegion => ({
  id,
  startTick,
  endTick,
  name: noteName,
  noteName,
  color: grey,
});

/** Bar 0: C on 1, Am on 3. Bar 1: F for the whole bar. */
const regions = (): ChordRegion[] => [
  region('a', 0, 960, 'C'),
  region('b', 960, BAR, 'Am'),
  region('c', BAR, BAR * 2, 'F'),
];

const measureCopy = (over: Partial<CopySource> = {}): CopySource => ({
  kind: 'measure',
  startTick: 0,
  startMeasure: 0,
  spanTicks: BAR,
  spanMeasures: 1,
  replace: true,
  chords: regions().slice(0, 2),
  notes: [],
  roadmap: [],
  ...over,
});

describe('building a clipboard', () => {
  it('stores chords relative to the start of the block', () => {
    const clipboard = buildClipboard(measureCopy());
    expect(clipboard.chords).toEqual([
      expect.objectContaining({ tickOffset: 0, noteName: 'C' }),
      expect.objectContaining({ tickOffset: 960, noteName: 'Am' }),
    ]);
  });

  it('stores a block copied from later in the piece at offset zero', () => {
    const clipboard = buildClipboard(
      measureCopy({
        startTick: BAR * 4,
        startMeasure: 4,
        chords: [region('x', BAR * 4 + 480, BAR * 5, 'G')],
      }),
    );
    expect(clipboard.chords[0].tickOffset).toBe(480);
  });

  it('stores melody notes and roadmap marks relative too', () => {
    const clipboard = buildClipboard(
      measureCopy({
        startTick: BAR * 2,
        startMeasure: 2,
        notes: [
          { tick: BAR * 2 + 240, midi: 60, durationTicks: 240, velocity: 90 },
        ],
        roadmap: [
          {
            measureIndex: 3,
            sectionLabel: 'B',
            repeatStart: true,
            repeatEnd: false,
            systemBreak: false,
          },
        ],
      }),
    );
    expect(clipboard.notes[0]).toMatchObject({ tickOffset: 240, midi: 60 });
    expect(clipboard.roadmap[0]).toMatchObject({
      measureOffset: 1,
      sectionLabel: 'B',
      repeatStart: true,
    });
  });
});

describe('pasting chords', () => {
  it('replaces the chords in the destination bar', () => {
    const clipboard = buildClipboard(measureCopy());
    const next = pasteChords(regions(), clipboard, BAR);
    expect(next.map((r) => [r.startTick, r.noteName, r.endTick])).toEqual([
      [0, 'C', 960],
      [960, 'Am', BAR],
      [BAR, 'C', BAR + 960],
      [BAR + 960, 'Am', BAR * 2],
    ]);
  });

  it('leaves regions contiguous after a paste', () => {
    const next = pasteChords(regions(), buildClipboard(measureCopy()), BAR);
    for (let i = 0; i < next.length - 1; i++) {
      expect(next[i].endTick).toBe(next[i + 1].startTick);
    }
  });

  it('clears a destination bar when an empty measure is pasted', () => {
    const empty = buildClipboard(measureCopy({ chords: [] }));
    const next = pasteChords(regions(), empty, BAR);
    expect(next.map((r) => r.noteName)).toEqual(['C', 'Am']);
    expect(next.at(-1)?.endTick).toBe(BAR * 2);
  });

  it('adds a loose chord without clearing the bar around it', () => {
    const loose = buildClipboard(
      measureCopy({
        kind: 'chord',
        replace: false,
        spanTicks: 0,
        chords: [region('b', 960, BAR, 'Am')],
        startTick: 960,
      }),
    );
    const next = pasteChords(regions(), loose, 480);
    expect(next.map((r) => [r.startTick, r.noteName])).toEqual([
      [0, 'C'],
      [480, 'Am'],
      [960, 'Am'],
      [BAR, 'F'],
    ]);
  });

  it('replaces a chord landing exactly on an existing one', () => {
    const loose = buildClipboard(
      measureCopy({
        kind: 'chord',
        replace: false,
        spanTicks: 0,
        chords: [region('c', BAR, BAR * 2, 'F')],
        startTick: BAR,
      }),
    );
    const next = pasteChords(regions(), loose, 960);
    expect(next.map((r) => [r.startTick, r.noteName])).toEqual([
      [0, 'C'],
      [960, 'F'],
      [BAR, 'F'],
    ]);
  });

  it('extends the piece when pasting past the end', () => {
    const next = pasteChords(regions(), buildClipboard(measureCopy()), BAR * 3);
    expect(next.at(-1)?.endTick).toBe(BAR * 4);
  });
});

describe('pasting roadmap marks', () => {
  const clipboard = buildClipboard(
    measureCopy({
      spanMeasures: 2,
      roadmap: [
        {
          measureIndex: 0,
          sectionLabel: 'A',
          repeatStart: true,
          repeatEnd: false,
          systemBreak: false,
        },
        {
          measureIndex: 1,
          sectionLabel: null,
          repeatStart: false,
          repeatEnd: true,
          systemBreak: true,
        },
      ],
    }),
  );

  it('offsets marks to the destination', () => {
    expect(pasteRoadmap(clipboard, 4, 16)).toEqual([
      expect.objectContaining({ measureIndex: 4, sectionLabel: 'A' }),
      expect.objectContaining({ measureIndex: 5, systemBreak: true }),
    ]);
  });

  it('drops marks that would fall outside the piece', () => {
    expect(pasteRoadmap(clipboard, 16, 16)).toEqual([
      expect.objectContaining({ measureIndex: 16 }),
    ]);
  });
});

describe('reading roadmap marks', () => {
  const sections = [{ measureIdx: 2, label: 'B' }];
  const repeats = [{ startMeasure: 2, endMeasure: 5 }];

  it('reads what is attached to a barline', () => {
    expect(roadmapAt(2, sections, repeats, new Set([2]))).toEqual({
      measureIndex: 2,
      sectionLabel: 'B',
      repeatStart: true,
      repeatEnd: false,
      systemBreak: true,
    });
  });

  it('reads a closing repeat as belonging to the barline after it', () => {
    expect(roadmapAt(6, sections, repeats, new Set()).repeatEnd).toBe(true);
  });

  it('recognises a bare barline', () => {
    expect(isEmptyRoadmap(roadmapAt(9, sections, repeats, new Set()))).toBe(
      true,
    );
    expect(isEmptyRoadmap(roadmapAt(2, sections, repeats, new Set()))).toBe(
      false,
    );
  });
});
