import { describe, expect, it } from 'vitest';
import type { ChordSymbolTones } from '../../genreGeneration/chordSymbolTones';
import {
  chordPcs,
  realizeComping,
  voiceChord,
  type ChordComping,
} from '../chordComping';
import { listCompings } from '../registry';

const tones = (rootPc: number, intervals: number[]): ChordSymbolTones => ({
  rootPc,
  bassPc: rootPc,
  intervals,
  third: intervals.find((i) => i === 3 || i === 4),
  fifth: intervals.includes(7) ? 7 : undefined,
  seventh: intervals.find((i) => i === 10 || i === 11),
});
const Em = tones(4, [0, 3, 7]);
const C = tones(0, [0, 4, 7]);
const B7 = tones(11, [0, 4, 7, 10]);
const Am9 = tones(9, [0, 3, 7, 10, 14]);

const pattern = (over: Partial<ChordComping>): ChordComping => ({
  id: 't',
  name: 'T',
  status: 'live',
  timeSignature: [4, 4],
  length: '1m',
  gridResolution: '8n',
  ceiling: 72,
  grooves: [],
  hits: [],
  ...over,
});

describe('voicing', () => {
  it('drops the 5th from a chord of more than four tones', () => {
    expect(chordPcs(Am9).sort((a, b) => a - b)).toEqual(
      [0, 7, 9, 11].sort((a, b) => a - b),
    );
  });

  it('stays at or under the ceiling, within an octave of it', () => {
    const v = voiceChord(B7, 72, null);
    expect(Math.max(...v)).toBeLessThanOrEqual(72);
    expect(Math.max(...v)).toBeGreaterThan(60);
    expect(new Set(v.map((m) => m % 12))).toEqual(new Set([11, 3, 6, 9]));
  });

  it('leads each chord from the last one', () => {
    const em = voiceChord(Em, 72, null);
    const c = voiceChord(C, 72, em);
    const moved = c.reduce((d, m, i) => d + Math.abs(m - em[i]), 0);
    // Em → C by voice leading moves one note a half step (B → C).
    expect(moved).toBeLessThanOrEqual(2);
  });
});

describe('realizeComping', () => {
  it("plays each hit on the chord sounding there, as 'upper' without the root", () => {
    const p = pattern({
      timeSignature: [3, 4],
      hits: [
        { time: '0:1:0', dur: 0.5, velocity: 0.7, tones: 'upper' },
        { time: '0:2:0', dur: 0.5, velocity: 0.7, tones: 'upper' },
      ],
    });
    const chordAt = (t: number) => (t < 1440 ? C : Em);
    const notes = realizeComping(p, chordAt, 2, [3, 4]);
    expect([...new Set(notes.map((n) => n.onset))]).toEqual([
      480, 960, 1920, 2400,
    ]);
    expect(
      notes.filter((n) => n.onset === 480).every((n) => n.note % 12 !== 0),
    ).toBe(true);
    expect(notes.every((n) => n.part === 'chords' && n.duration === 240)).toBe(
      true,
    );
  });

  it('tiles a 1-bar pattern across the bars and stops at the end', () => {
    const p = pattern({ hits: [{ time: '0:0:2', dur: 0.25, velocity: 0.7 }] });
    const notes = realizeComping(p, () => Em, 4, [4, 4]);
    expect([...new Set(notes.map((n) => n.onset))]).toEqual([
      240, 2160, 4080, 6000,
    ]);
  });

  it("plays 'top' as one note", () => {
    const p = pattern({
      hits: [{ time: '0:0:0', dur: 1, velocity: 0.7, tones: 'top' }],
    });
    expect(realizeComping(p, () => B7, 1)).toHaveLength(1);
  });
});

describe('the comping files', () => {
  it.each(listCompings().map((c) => [c.id, c] as const))(
    '%s is well formed',
    (_, c) => {
      expect(c.id).toMatch(/^[a-z0-9][a-z0-9_-]*$/);
      expect(c.length).toMatch(/^\d+m$/);
      expect(c.ceiling).toBeGreaterThan(48);
      c.hits.forEach((h) => {
        expect(h.time).toMatch(/^\d+:\d+:\d+(\.\d+)?$/);
        expect(h.dur).toBeGreaterThan(0);
        expect(h.velocity).toBeGreaterThan(0);
        expect(h.velocity).toBeLessThanOrEqual(1);
      });
    },
  );
});
