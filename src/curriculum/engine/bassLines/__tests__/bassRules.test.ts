import { describe, expect, it } from 'vitest';
import {
  chartKeyScale,
  chordDiatonic,
  realizeLine,
  type BassLine,
} from '../bassLine';
import { chordSpans, parseChart, parseChord } from '../harmony';

/**
 * Walk and Approach by genre: Pop walks diatonically toward the next root
 * and approaches from a diatonic neighbour; Funk, Hip Hop and Latin walk
 * diatonically toward the next chord tone and approach from a diatonic or
 * chromatic neighbour. Other genres keep the free rules.
 */

const line = (notes: BassLine['notes']): BassLine => ({
  id: 't',
  name: 't',
  status: 'draft',
  timeSignature: [4, 4],
  length: '1m',
  gridResolution: '8n',
  instrument: 'electric',
  grooves: [],
  anchorOnChange: true,
  notes,
});
const n = (time: string, degree: BassLine['notes'][number]['degree']) => ({
  time,
  degree,
  dur: 0.9,
  velocity: 0.8,
});

const C_MAJOR = new Set([0, 2, 4, 5, 7, 9, 11]);
const CHART = parseChart('| C | Am | F | G | C | Dm | Em | G |').bars;
const SEEDS = Array.from({ length: 24 }, (_, i) => i + 1);

const play = (tpl: BassLine, genre: string | undefined, seed: number) =>
  realizeLine(tpl, CHART, { genre, seed }).notes;

/** Each walking or approach note, with the note before and after it. */
function around(tpl: BassLine, genre: string, degree: 'W' | 'A') {
  return SEEDS.flatMap((seed) => {
    const notes = play(tpl, genre, seed);
    return notes.flatMap((note, i) =>
      note.degree === degree && i > 0 && i < notes.length - 1
        ? [{ prev: notes[i - 1], note, next: notes[i + 1] }]
        : [],
    );
  });
}

describe('the chart key', () => {
  it('reads a C major chart as C major', () => {
    expect(new Set(chartKeyScale(chordSpans(CHART, [4, 4]).spans))).toEqual(
      C_MAJOR,
    );
  });

  it('lets a chord tone outside the key replace the note it alters', () => {
    // E7 in A minor: G♯ in for G, A kept.
    const e7 = chordDiatonic([...C_MAJOR], parseChord('E7')!);
    expect(e7.has(8)).toBe(true);
    expect(e7.has(7)).toBe(false);
    expect(e7.has(9)).toBe(true);
    // C7 in C: B♭ in for B.
    const c7 = chordDiatonic([...C_MAJOR], parseChord('C7')!);
    expect(c7.has(10)).toBe(true);
    expect(c7.has(11)).toBe(false);
  });
});

describe('Walk by genre', () => {
  // Root, three walking notes, into the next bar's root.
  const walking = line([
    n('0:0:0', 'R'),
    n('0:1:0', 'W'),
    n('0:2:0', 'W'),
    n('0:3:0', 'W'),
  ]);

  /** Each run: where it starts, its walking notes, and what follows. */
  const runs = (tpl: BassLine, genre: string, size: number) =>
    SEEDS.flatMap((seed) => {
      const notes = play(tpl, genre, seed);
      const out = [];
      // One run a bar, after the bar's root.
      const bar = tpl.notes.length;
      for (let i = 0; i + size + 1 < notes.length; i += bar)
        out.push({
          from: notes[i].midi,
          walk: notes.slice(i + 1, i + 1 + size).map((x) => x.midi),
          next: notes[i + 1 + size].midi,
        });
      return out;
    });

  /** Diatonic steps (one third at most), ending next to the target. */
  const expectPlannedWalk = (from: number, walk: number[], target: number) => {
    let prev = from;
    let thirds = 0;
    for (const m of walk) {
      expect(C_MAJOR.has(m % 12)).toBe(true);
      const step = Math.abs(m - prev);
      expect(step).toBeGreaterThan(0);
      expect(step).toBeLessThanOrEqual(4);
      if (step > 2) thirds += 1;
      prev = m;
    }
    expect(thirds).toBeLessThanOrEqual(1);
    // Never on the target, so the downbeat doesn't repeat it.
    expect(prev).not.toBe(target);
    if (Math.abs(target - from) <= 7)
      expect([1, 2]).toContain(Math.abs(target - prev));
  };

  it('Pop: diatonic steps to beside the next root, never onto it', () => {
    for (const { from, walk, next } of runs(walking, 'pop', 3))
      expectPlannedWalk(from, walk, next);
  });

  it('Funk, Hip Hop and Latin: diatonic steps to beside the next chord tone', () => {
    // Root, two walking notes, then the third: the walk heads for the third.
    const toThird = line([
      n('0:0:0', 'R'),
      n('0:1:0', 'W'),
      n('0:2:0', 'W'),
      n('0:3:0', '3'),
    ]);
    for (const genre of ['funk', 'hip-hop', 'latin'])
      for (const { from, walk, next } of runs(toThird, genre, 2))
        expectPlannedWalk(from, walk, next);
  });

  it('never ends on the note that follows it', () => {
    // Pop heads for the next root, so the bar's third falls in its way.
    const intoThird = line([
      n('0:0:0', 'R'),
      n('0:1:0', 'W'),
      n('0:2:0', 'W'),
      n('0:3:0', '3'),
    ]);
    for (const genre of ['pop', 'funk', 'hip-hop', 'latin'])
      for (const { note, next } of around(intoThird, genre, 'W'))
        expect(note.midi).not.toBe(next.midi);
  });

  it('a far target is walked straight toward', () => {
    // Root, one walking note, then the fifth four steps up.
    const toFifth = line([n('0:0:0', 'R'), n('0:1:0', 'W'), n('0:2:0', '5')]);
    for (const genre of ['funk', 'hip-hop', 'latin'])
      for (const { prev, note, next } of around(toFifth, genre, 'W')) {
        expect(C_MAJOR.has(note.midi % 12)).toBe(true);
        expect([1, 2]).toContain(Math.abs(note.midi - prev.midi));
        expect(Math.sign(note.midi - prev.midi)).toBe(
          Math.sign(next.midi - prev.midi),
        );
      }
  });
});

describe('Approach by genre', () => {
  // Root, fifth, third, then an approach into the next bar's root.
  const approaching = line([
    n('0:0:0', 'R'),
    n('0:1:0', '5'),
    n('0:2:0', '3'),
    n('0:3:0', 'A'),
  ]);

  it('Pop: a diatonic neighbour of the next note, above or below', () => {
    const sides = new Set<number>();
    for (const { note, next } of around(approaching, 'pop', 'A')) {
      expect(C_MAJOR.has(note.midi % 12)).toBe(true);
      const gap = note.midi - next.midi;
      expect([1, 2]).toContain(Math.abs(gap));
      sides.add(Math.sign(gap));
    }
    expect(sides).toEqual(new Set([1, -1]));
  });

  it('Funk, Hip Hop and Latin: diatonic or chromatic, above or below', () => {
    for (const genre of ['funk', 'hip-hop', 'latin']) {
      let chromatic = 0;
      let diatonic = 0;
      for (const { note, next } of around(approaching, genre, 'A')) {
        const gap = Math.abs(note.midi - next.midi);
        expect([1, 2]).toContain(gap);
        if (C_MAJOR.has(note.midi % 12)) diatonic += 1;
        else chromatic += 1;
      }
      expect(chromatic).toBeGreaterThan(0);
      expect(diatonic).toBeGreaterThan(0);
    }
  });

  it('a genre without rules keeps the free approach', () => {
    for (const seed of SEEDS)
      expect(play(approaching, 'jazz', seed)).toEqual(
        play(approaching, undefined, seed),
      );
  });
});
