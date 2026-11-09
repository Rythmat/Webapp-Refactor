import { describe, expect, it } from 'vitest';
import { echoRandom } from '../../echo/random';
import { gradeAnswer, toleranceFor, type FoliHit } from '../grade';
import { foliLevel, LAST_LEVEL, TRIPLET_LEVEL } from '../levels';
import {
  BAR_TICKS,
  buildCall,
  CALL_END_TICK,
  RHYTHM_CELLS,
  type FoliNote,
} from '../rhythms';

describe('Foli’s levels', () => {
  it('add 16ths, then a second bar, then 10 BPM a level, triplets at Level 10, to 300', () => {
    expect(foliLevel(1)).toMatchObject({
      bpm: 90,
      bars: 1,
      subdivisions: ['eighths'],
    });
    expect(foliLevel(2)).toMatchObject({
      bpm: 90,
      bars: 1,
      introduces: 'sixteenths',
    });
    expect(foliLevel(3)).toMatchObject({ bpm: 90, bars: 2 });
    expect(foliLevel(4).bpm).toBe(100);
    expect(foliLevel(9).bpm).toBe(150);
    expect(foliLevel(9).subdivisions).not.toContain('triplets');
    expect(foliLevel(TRIPLET_LEVEL)).toMatchObject({
      bpm: 150,
      introduces: 'triplets',
    });
    expect(foliLevel(11).bpm).toBe(160);
    expect(LAST_LEVEL).toBe(25);
    expect(foliLevel(LAST_LEVEL).bpm).toBe(300);
  });
});

describe('Foli’s calls', () => {
  const calls = (level: number, mode: 'two' | 'four', n = 60) =>
    Array.from({ length: n }, (_, s) =>
      buildCall(
        foliLevel(level),
        mode,
        echoRandom(`call-${level}-${mode}-${s}`),
      ),
    );

  it('start on beat 1 and fit their bars', () => {
    for (const level of [1, 2, 3, 4, 9])
      for (const call of calls(level, 'two')) {
        expect(call[0].startTick).toBe(0);
        const bars = foliLevel(level).bars;
        for (const n of call)
          expect(n.startTick).toBeLessThan(bars * BAR_TICKS);
        expect(call.length).toBeGreaterThanOrEqual(3 * bars);
        expect(call.length).toBeLessThanOrEqual(9 * bars);
      }
  });

  /** Each bar's beats that hold a triplet figure. */
  const tripletBeatsPerBar = (call: FoliNote[]) => {
    const beats = new Map<number, number[]>();
    for (const n of call) {
      const beat = Math.floor(n.startTick / 480);
      beats.set(beat, [...(beats.get(beat) ?? []), n.startTick % 480]);
    }
    const perBar = new Map<number, number>();
    for (const [beat, offsets] of beats)
      if (offsets.some((o) => o % 160 === 0 && o % 120 !== 0)) {
        const bar = Math.floor(beat / 4);
        perBar.set(bar, (perBar.get(bar) ?? 0) + 1);
      }
    return [...perBar.values()];
  };

  it('keep to the level’s subdivisions, and show off the one it brings in', () => {
    for (const call of calls(1, 'two'))
      for (const n of call) expect(n.startTick % 240, 'only 8ths').toBe(0);
    for (const call of calls(2, 'two'))
      expect(call.some((n) => n.startTick % 240 !== 0)).toBe(true);
    for (const level of [2, 5, 9])
      for (const call of calls(level, 'two', 40))
        expect(tripletBeatsPerBar(call), `no triplets at ${level}`).toEqual([]);
    for (const call of calls(TRIPLET_LEVEL, 'two'))
      expect(tripletBeatsPerBar(call).length).toBeGreaterThan(0);
  });

  it('end by the "and" of 4: nothing on the last 16th before the answer', () => {
    for (const level of [1, 2, 3, 6, TRIPLET_LEVEL, 18, LAST_LEVEL])
      for (const mode of ['two', 'four'] as const)
        for (const call of calls(level, mode, 60)) {
          const last = Math.max(...call.map((n) => n.startTick));
          const lastBar = (foliLevel(level).bars - 1) * BAR_TICKS;
          expect(last - lastBar, `level ${level}`).toBeLessThanOrEqual(
            CALL_END_TICK,
          );
        }
  });

  it('hold a triplet on one beat a bar at most', () => {
    for (const level of [TRIPLET_LEVEL, 14, 20, LAST_LEVEL])
      for (const mode of ['two', 'four'] as const)
        for (const call of calls(level, mode, 60))
          for (const n of tripletBeatsPerBar(call))
            expect(n).toBeLessThanOrEqual(1);
  });

  it('alternate the bongos on two drums, and groove on four', () => {
    for (const call of calls(1, 'two', 10))
      call.forEach((n, i) =>
        expect(n.drum).toBe(i % 2 === 0 ? 'bongoHigh' : 'bongoLow'),
      );
    for (const call of calls(3, 'four', 20))
      call.forEach((n, i) => {
        if (i === call.length - 1) return;
        const inBar = n.startTick % BAR_TICKS;
        if (inBar % 960 === 0) expect(n.drum).toBe('bongoLow');
        else if (inBar % 480 === 0) expect(n.drum).toBe('sidestick');
        else expect(n.drum).toBe('bongoHigh');
      });
  });

  it('write every triplet beat with its first partial, so the staff shows the triplet', () => {
    for (const level of [TRIPLET_LEVEL, 15, LAST_LEVEL])
      for (const call of calls(level, 'two', 40)) {
        const byBeat = new Map<number, number[]>();
        for (const n of call) {
          const beat = Math.floor(n.startTick / 480);
          byBeat.set(beat, [...(byBeat.get(beat) ?? []), n.startTick % 480]);
        }
        for (const offsets of byBeat.values())
          if (offsets.some((o) => o % 160 === 0 && o % 120 !== 0))
            expect(offsets).toContain(160);
      }
  });

  it('come from the library’s cells, every subdivision there', () => {
    const kinds = new Set(RHYTHM_CELLS.map((c) => c.subdivision));
    expect([...kinds].sort()).toEqual(['eighths', 'sixteenths', 'triplets']);
  });
});

describe('grading a Foli answer', () => {
  const call: FoliNote[] = [
    { startTick: 0, durationTick: 480, drum: 'bongoHigh' },
    { startTick: 960, durationTick: 480, drum: 'bongoLow' },
  ];
  const bpm = 90;
  const beat = 60 / bpm;
  const start = 10;
  const tol = toleranceFor(call, bpm);

  it('counts a downbeat played a little early', () => {
    const hits: FoliHit[] = [
      { t: start - 0.02, drum: 'bongoHigh' },
      { t: start + 2 * beat, drum: 'bongoLow' },
    ];
    expect(gradeAnswer(call, hits, start, bpm, 1, tol).passed).toBe(true);
  });

  it('pairs closest first, so a late note can’t steal the next one’s hit', () => {
    const quick: FoliNote[] = [
      { startTick: 0, durationTick: 240, drum: 'bongoHigh' },
      { startTick: 240, durationTick: 240, drum: 'bongoHigh' },
    ];
    const t = toleranceFor(quick, bpm);
    const hits: FoliHit[] = [
      { t: start + 0.03, drum: 'bongoHigh' },
      { t: start + beat / 2 + 0.01, drum: 'bongoHigh' },
    ];
    const grade = gradeAnswer(quick, hits, start, bpm, 1, t);
    expect(grade.matched.size).toBe(2);
    expect(grade.passed).toBe(true);
  });

  it('fails a wrong drum, a missing note, or a pile of extra hits', () => {
    expect(
      gradeAnswer(
        call,
        [
          { t: start, drum: 'bongoLow' },
          { t: start + 2 * beat, drum: 'bongoLow' },
        ],
        start,
        bpm,
        1,
        tol,
      ).passed,
    ).toBe(false);
    expect(
      gradeAnswer(call, [{ t: start, drum: 'bongoHigh' }], start, bpm, 1, tol)
        .passed,
    ).toBe(false);
    const spam: FoliHit[] = Array.from({ length: 16 }, (_, i) => ({
      t: start + (i * beat) / 4,
      drum: i % 2 ? 'bongoLow' : 'bongoHigh',
    }));
    expect(gradeAnswer(call, spam, start, bpm, 1, tol).passed).toBe(false);
  });

  it('gives an 8th-note call about 120 ms each way at 90 BPM, less when it’s faster', () => {
    expect(tol).toBeCloseTo(0.12, 2);
    const sixteenths: FoliNote[] = [0, 120, 240].map((s) => ({
      startTick: s,
      durationTick: 120,
      drum: 'bongoHigh',
    }));
    expect(toleranceFor(sixteenths, 300)).toBeCloseTo(0.04, 2);
  });
});
