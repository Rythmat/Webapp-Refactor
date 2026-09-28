import { afterEach, describe, expect, it, vi } from 'vitest';
import { fretToMidi, shapeNotes } from '@/lib/guitar/fretboard';
import type { FretPosition, GuitarStringNumber } from '@/lib/guitar/types';
import { buildTab, type TabNoteInput } from '../buildTab';

const Q = 480;
const BAR = 4 * Q;
const OPTIONS = { timeSignature: [4, 4] as [number, number], minMeasures: 1 };

let nextId = 0;
const fretted = (
  string: GuitarStringNumber,
  fret: number,
  startTick: number,
  durationTicks: number,
): TabNoteInput => {
  const fretPosition: FretPosition = { string, fret };
  return {
    id: `n${nextId++}`,
    midi: fretToMidi(fretPosition),
    startTick,
    durationTicks,
    fretPosition,
  };
};

/** A book shape strummed at one onset. */
const strum = (frets: string, startTick: number, durationTicks: number) =>
  shapeNotes(frets).map(({ position }) =>
    fretted(position.string, position.fret, startTick, durationTicks),
  );

const onlyVoice = (score: ReturnType<typeof buildTab>, measure = 0) => {
  const voices = score.measures[measure].voices;
  expect(voices).toHaveLength(1);
  return voices[0].items;
};

afterEach(() => vi.restoreAllMocks());

describe('buildTab', () => {
  it('writes a whole-note open C as one item with every string it sounds', () => {
    const notes = strum('X-3-2-0-1-0', 0, BAR);
    const [item, ...rest] = onlyVoice(buildTab(notes, OPTIONS));
    expect(rest).toHaveLength(0);
    expect(item).toMatchObject({ kind: 'note', value: 'w', ghost: false });
    expect(item.positions.map((p) => [p.string, p.fret])).toEqual([
      [1, 0],
      [2, 1],
      [3, 0],
      [4, 2],
      [5, 3],
    ]);
    // Every fret still knows the lesson note it draws.
    expect(item.positions.map((p) => p.noteId).sort()).toEqual(
      notes.map((n) => n.id).sort(),
    );
  });

  it('writes two half notes as two half-note items', () => {
    const items = onlyVoice(
      buildTab(
        [
          ...strum('X-3-2-0-1-0', 0, 2 * Q),
          ...strum('3-2-0-0-0-3', 2 * Q, 2 * Q),
        ],
        OPTIONS,
      ),
    );
    expect(items.map((i) => [i.kind, i.value, i.startTick])).toEqual([
      ['note', 'h', 0],
      ['note', 'h', 2 * Q],
    ]);
    expect(items[1].positions.map((p) => p.fret)).toEqual([3, 0, 0, 0, 2, 3]);
  });

  it('writes an empty count-in bar as a whole-measure rest', () => {
    const score = buildTab(strum('X-3-2-0-1-0', BAR, BAR), {
      ...OPTIONS,
      minMeasures: 2,
    });
    expect(score.measures).toHaveLength(2);
    expect(onlyVoice(score, 0)).toEqual([
      expect.objectContaining({
        kind: 'rest',
        wholeMeasure: true,
        positions: [],
      }),
    ]);
    expect(onlyVoice(score, 1)[0].kind).toBe('note');
  });

  it('writes the tied half of a note as a ghost fret', () => {
    // Beats 3–6: a half note tied over the barline.
    const score = buildTab([fretted(3, 5, 2 * Q, BAR)], {
      ...OPTIONS,
      minMeasures: 2,
    });
    const before = onlyVoice(score, 0).find((i) => i.kind === 'note')!;
    const after = onlyVoice(score, 1).find((i) => i.kind === 'note')!;
    expect(before.ghost).toBe(false);
    expect(after.ghost).toBe(true);
    expect(after.positions).toEqual([
      expect.objectContaining({ string: 3, fret: 5 }),
    ]);
  });

  it('keeps the first of two notes on one string and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const first = fretted(2, 3, 0, Q); // D4
    const second = fretted(2, 1, 0, Q); // C4 — lower, but written second
    const items = onlyVoice(buildTab([first, second], OPTIONS));
    expect(items[0].positions).toEqual([
      expect.objectContaining({ string: 2, fret: 3, noteId: first.id }),
    ]);
    expect(warn).toHaveBeenCalledOnce();
  });

  it('keeps both frets of a unison played on two strings', () => {
    // E4 twice — the open high e and the B string's fifth fret — is one
    // notehead on a staff but two frets on TAB.
    const open = fretted(1, 0, 0, Q);
    const fifth = fretted(2, 5, 0, Q);
    const [item] = onlyVoice(buildTab([fifth, open], OPTIONS));
    expect(item.positions.map((p) => [p.string, p.fret, p.noteId])).toEqual([
      [1, 0, open.id],
      [2, 5, fifth.id],
    ]);
  });

  it('reports ticks from the origin, like the staff', () => {
    const score = buildTab(strum('X-3-2-0-1-0', 960, Q), {
      ...OPTIONS,
      originTick: 960,
    });
    expect(score.originTick).toBe(960);
    expect(score.measures[0].startTick).toBe(960);
    expect(onlyVoice(score)[0].startTick).toBe(960);
  });
});
