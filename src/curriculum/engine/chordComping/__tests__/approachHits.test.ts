import { describe, expect, it } from 'vitest';
import { chordSymbolTones } from '../../genreGeneration/chordSymbolTones';
import { realizeComping, type ChordCompingHit } from '../chordComping';

const NAMES = 'C Db D Eb E F Gb G Ab A Bb B'.split(' ');
const name = (m: number) => NAMES[((m % 12) + 12) % 12];

const pattern = (hits: ChordCompingHit[]) => ({
  timeSignature: [4, 4] as [number, number],
  length: '1m',
  ceiling: 76,
  hits,
});

const chart = (...symbols: string[]) => {
  const tones = symbols.map((s) => chordSymbolTones(s)!);
  return (tick: number) => tones[Math.floor(tick / 1920) % tones.length];
};

/** Each onset's notes, low to high. */
const byOnset = (notes: { onset: number; note: number }[]) => {
  const out = new Map<number, number[]>();
  for (const n of notes)
    out.set(n.onset, [...(out.get(n.onset) ?? []), n.note]);
  return [...out].map(
    ([onset, ns]) => [onset, ns.sort((a, b) => a - b)] as const,
  );
};

describe('comping approaches', () => {
  // Two 8ths on beat 2, chromatic from above, into the chord on beat 3.
  const into3 = pattern([
    {
      time: '0:1:0',
      dur: 0.5,
      velocity: 0.8,
      approach: { step: 2, motion: 'chromatic' },
    },
    {
      time: '0:1:2',
      dur: 0.5,
      velocity: 0.8,
      approach: { step: 1, motion: 'chromatic' },
    },
    { time: '0:2:0', dur: 2, velocity: 0.9 },
  ]);

  it('plays the goal’s voicing two and one half steps above: C9 B9 into B♭9', () => {
    const hits = byOnset(realizeComping(into3, chart('Bb9'), 1));
    const [c, b, goal] = hits.map(([, ns]) => ns);
    expect(c).toEqual(goal.map((m) => m + 2));
    expect(b).toEqual(goal.map((m) => m + 1));
    expect(name(goal[0])).toBeDefined();
  });

  it('lands wherever the goal does: over G7 they are A and A♭ shapes', () => {
    const hits = byOnset(realizeComping(into3, chart('G7'), 1));
    const [first, second, goal] = hits.map(([, ns]) => ns);
    expect(first).toEqual(goal.map((m) => m + 2));
    expect(second).toEqual(goal.map((m) => m + 1));
    expect(goal.map(name).sort()).toEqual(['B', 'D', 'F', 'G'].sort());
  });

  it('planes diatonically through the key: Dm7 from above is Em7, in C', () => {
    const p = pattern([
      {
        time: '0:0:0',
        dur: 1,
        velocity: 0.8,
        approach: { step: 1, motion: 'diatonic' },
      },
      { time: '0:1:0', dur: 3, velocity: 0.9 },
    ]);
    const hits = byOnset(
      realizeComping(p, chart('Dm7'), 1, [4, 4], {
        approachKey: [0, 2, 4, 5, 7, 9, 11],
      }),
    );
    expect(hits[0][1].map(name).sort()).toEqual(['B', 'D', 'E', 'G'].sort());
  });

  it('plays an ordinary pattern exactly as before', () => {
    const p = pattern([
      { time: '0:0:0', dur: 1, velocity: 0.8 },
      { time: '0:2:0', dur: 1, velocity: 0.8, tones: 'upper' },
    ]);
    const notes = realizeComping(p, chart('Cmaj7', 'Am7'), 2);
    expect(notes.length).toBeGreaterThan(0);
    expect(notes.every((n) => n.part === 'chords')).toBe(true);
  });
});
