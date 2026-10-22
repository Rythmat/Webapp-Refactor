import { describe, expect, it } from 'vitest';
import { echoRandom } from '../../echo/random';
import { degreeOf, MAJOR_STEPS } from '../harmony';
import {
  ARCANUM_LEVELS,
  ARCANUM_MODES,
  keyRootMidi,
  LEVEL_KEYS,
  MODES,
  type ArcanumMode,
} from '../levels';
import { buildRun, type ArcanumRun } from '../song';

/** A note's scale position above the run's 1 (it must be in the key). */
function position(run: ArcanumRun, midi: number): number {
  const semis = midi - run.rootMidi;
  const octave = Math.floor(semis / 12);
  const step = MAJOR_STEPS.indexOf(
    (((semis % 12) + 12) % 12) as (typeof MAJOR_STEPS)[number],
  );
  expect(step, `${midi} is in the key`).toBeGreaterThanOrEqual(0);
  return step + 7 * octave;
}

const runs = (mode: ArcanumMode, part: 'melody' | 'chords', seeds = 6) =>
  ARCANUM_LEVELS.flatMap((level) =>
    LEVEL_KEYS[level].flatMap((keyPc) =>
      Array.from({ length: seeds }, (_, s) =>
        buildRun({
          mode,
          level,
          keyPc,
          part,
          rng: echoRandom(`${mode}-${level}-${keyPc}-${part}-${s}`),
        }),
      ),
    ),
  );

describe('Major Arcanum’s melodies', () => {
  it('keep to each mode’s range: 1–5 in Novice, 1–8 in Pro, two and three octaves after', () => {
    for (const mode of ARCANUM_MODES)
      for (const run of runs(mode, 'melody', 3)) {
        const { low, high } = MODES[mode].melodyRange;
        for (const n of run.notes) {
          const p = position(run, n.midi);
          expect(p, `${mode} ${run.keyPc}`).toBeGreaterThanOrEqual(low);
          expect(p, `${mode} ${run.keyPc}`).toBeLessThanOrEqual(high);
        }
      }
  });

  it('end every phrase as a question or an answer, on a long note', () => {
    for (const mode of ARCANUM_MODES)
      for (const run of runs(mode, 'melody', 3))
        for (const phrase of run.phrases) {
          const notes = run.notes.filter((n) => n.phrase === phrase.index);
          const last = notes[notes.length - 1];
          const degree = degreeOf(position(run, last.midi));
          if (phrase.ending === 'open') expect([1, 4, 6]).toContain(degree);
          else expect([0, 2]).toContain(degree);
          expect(last.duration).toBeGreaterThanOrEqual(2);
          expect(last.beat + last.duration).toBeLessThanOrEqual(phrase.endBeat);
        }
  });

  it('bring motif A back, as a hook comes back', () => {
    for (const run of runs('pro', 'melody', 4)) {
      const firstBar = (i: number) =>
        run.notes
          .filter(
            (n) => n.phrase === i && n.beat < run.phrases[i].startBeat + 4,
          )
          .map((n) => n.beat - run.phrases[i].startBeat);
      expect(firstBar(1)).toEqual(firstBar(0));
      expect(firstBar(3)).toEqual(firstBar(0));
    }
  });

  it('play in Novice on the beats at Levels 1 and 2', () => {
    for (const run of runs('novice', 'melody', 3).filter((r) => r.level <= 2))
      for (const n of run.notes)
        expect(Number.isInteger(n.beat * 2), `${n.beat}`).toBe(true);
  });

  it('are the same for the same seed', () => {
    const make = () =>
      buildRun({
        mode: 'pro',
        level: 3,
        keyPc: 2,
        part: 'melody',
        rng: echoRandom('same'),
      });
    expect(make()).toEqual(make());
  });
});

describe('Major Arcanum’s chords', () => {
  const chordsAt = (run: ArcanumRun) => {
    const by = new Map<number, number[]>();
    for (const n of run.notes)
      by.set(n.beat, [...(by.get(n.beat) ?? []), n.midi]);
    return [...by.values()].map((m) => m.sort((a, b) => a - b));
  };

  it('are root-position triads in Novice, in the computer keyboard’s reach', () => {
    for (const run of runs('novice', 'chords', 3))
      for (const chord of chordsAt(run)) {
        expect(chord).toHaveLength(3);
        const ps = chord.map((m) => position(run, m));
        expect(ps[1] - ps[0]).toBe(2);
        expect(ps[2] - ps[1]).toBe(2);
        expect(Math.min(...ps)).toBeGreaterThanOrEqual(0);
        expect(Math.max(...ps)).toBeLessThanOrEqual(12);
      }
  });

  it('add root-position 7ths in Pro', () => {
    let sevenths = 0;
    for (const run of runs('pro', 'chords', 3))
      for (const chord of chordsAt(run)) {
        if (chord.length === 4) sevenths++;
        const ps = chord.map((m) => position(run, m));
        ps.slice(1).forEach((p, j) => expect(p - ps[j]).toBe(2));
        expect(Math.max(...ps)).toBeLessThanOrEqual(12);
      }
    expect(sevenths).toBeGreaterThan(0);
  });

  it('move to the nearest inversion in Expert and Maestro', () => {
    for (const mode of ['expert', 'maestro'] as const) {
      const all = runs(mode, 'chords', 3);
      let inverted = 0;
      let moves = 0;
      let count = 0;
      for (const run of all) {
        const chords = chordsAt(run);
        chords.forEach((c, i) => {
          const ps = c.map((m) => position(run, m));
          if (ps.some((p, j) => j > 0 && p - ps[j - 1] !== 2)) inverted++;
          if (i > 0) {
            moves += Math.abs(
              c[c.length - 1] - chords[i - 1][chords[i - 1].length - 1],
            );
            count++;
          }
        });
      }
      expect(inverted, mode).toBeGreaterThan(0);
      // The top voice moves by a step or two on average, not by leaps.
      expect(moves / count, mode).toBeLessThan(4);
    }
  });

  it('name their chords in the key: F♯m in D, B♭ in F', () => {
    const run = buildRun({
      mode: 'novice',
      level: 3,
      keyPc: 2,
      part: 'chords',
      rng: echoRandom('names'),
    });
    for (const mark of run.chords)
      expect(mark.symbol).not.toMatch(/[A-G](#|b)/);
    expect(keyRootMidi(2, 'novice', 'chords')).toBe(62);
  });
});
