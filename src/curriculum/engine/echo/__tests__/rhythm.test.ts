import { describe, expect, it } from 'vitest';
import {
  LITERACY_MODES,
  LITERACY_TONICS,
} from '@/content/musicLiteracy/schemas';
import CHORD_FILE from '@/curriculum/data/echo/chordRhythms.json';
import MELODY_FILE from '@/curriculum/data/echo/melodyRhythms.json';
import { bossCalls, chordAttacks, chordCall, melodyCall } from '../calls';
import { CONTOUR_LIBRARY } from '../contours';
import {
  BAR_TICKS,
  BEAT_TICKS,
  ECHO_LEVELS,
  ECHO_LEVEL_NUMBERS,
  type EchoLevelNumber,
} from '../levels';
import { echoRandom } from '../random';
import {
  CHORD_RHYTHMS,
  MELODY_RHYTHMS,
  chordRhythmBars,
  chordRhythmById,
  melodyRhythmById,
} from '../rhythm';

/**
 * The owner's rhythm libraries as Echo plays them (importRhythms.mjs): the
 * melody phrase rhythms, a bar of three to five notes each, and the
 * comping patterns, one bar and two. Calls take them whole: a melody call
 * is a contour on one, a chord call strikes one, each level on its tiers
 * and the boss on the tier above.
 */

const KEYS = LITERACY_TONICS.flatMap((tonic) =>
  LITERACY_MODES.map((mode) => ({ tonic, mode })),
);

/** Many calls of a level, across the keys, seeded. */
function manyMelodyCalls(level: EchoLevelNumber, boss = false, n = 240) {
  const rng = echoRandom(`melody-${level}-${boss}`);
  return Array.from({ length: n }, (_, i) =>
    melodyCall(level, KEYS[i % KEYS.length], rng, { boss }),
  );
}
function manyChordCalls(level: EchoLevelNumber, boss = false, n = 240) {
  const rng = echoRandom(`chords-${level}-${boss}`);
  return Array.from({ length: n }, (_, i) =>
    chordCall(level, KEYS[i % KEYS.length], rng, { boss }),
  );
}

const onsets = (hits: readonly { onset: number }[]) => hits.map((h) => h.onset);

describe('the melody rhythms', () => {
  it('are the library’s one-bar phrases, straight, written as their grids say', () => {
    expect(MELODY_RHYTHMS.length).toBe(47);
    for (const r of MELODY_RHYTHMS) {
      expect(r.hits).toHaveLength(r.notes);
      expect([3, 4, 5]).toContain(r.notes);
      const grid = [...r.grid].flatMap((c, i) => (c === 'x' ? [i * 120] : []));
      expect(onsets(r.hits), r.id).toEqual(grid);
      for (const hit of r.hits) {
        expect(hit.onset % 120).toBe(0);
        expect(hit.onset + hit.duration).toBeLessThanOrEqual(BAR_TICKS);
      }
    }
  });

  it('keeps each rhythm once, the genres that share it named', () => {
    const keys = MELODY_RHYTHMS.map((r) => JSON.stringify(r.hits));
    expect(new Set(keys).size).toBe(keys.length);
    // "1 2 3": five genres, one rhythm.
    const oneTwoThree = melodyRhythmById('mp_pop_3a')!;
    expect(oneTwoThree.genres).toEqual(
      expect.arrayContaining(['pop', 'rock', 'folk']),
    );
    expect(onsets(oneTwoThree.hits)).toEqual([0, 480, 960]);
  });

  it('leaves out only the swung phrases and the two-bar ones', () => {
    for (const left of MELODY_FILE.leftOut) {
      expect(left.why, left.id).toMatch(/triplets|2 bars/);
      if (/triplets/.test(left.why)) {
        expect(left.id).toMatch(/^mp_(blues|jazz)_/);
      }
    }
  });

  it('tiers them: on the beat and the eighth first, the 16ths last', () => {
    const tier = (t: number) => MELODY_RHYTHMS.filter((r) => r.tier === t);
    for (const t of [1, 2, 3, 4]) {
      // Every tier has rhythms for a contour of 3, 4 and 5 notes.
      expect(new Set(tier(t).map((r) => r.notes)), `Tier ${t}`).toEqual(
        new Set([3, 4, 5]),
      );
    }
    for (const r of tier(1)) {
      expect(r.hits[0].onset).toBe(0);
      expect(r.hits.every((h) => h.onset % 240 === 0)).toBe(true);
      expect(r.hits.at(-1)!.onset).toBeLessThanOrEqual(3 * BEAT_TICKS);
    }
    for (const r of tier(2)) {
      expect(r.hits.every((h) => h.onset % 240 === 0)).toBe(true);
    }
    for (const r of [...tier(3), ...tier(4)]) {
      expect(r.hits.some((h) => h.onset % 240 !== 0)).toBe(true);
    }
  });
});

describe('the chord rhythms', () => {
  it('are the library’s comping, a bar or two, written as their grids say', () => {
    expect(CHORD_RHYTHMS.length).toBe(131);
    for (const r of CHORD_RHYTHMS) {
      expect([1, 2]).toContain(r.bars);
      const grid = [...r.grid.replace(/\s*\|\s*/g, '')].flatMap((c, i) =>
        c === 'x' ? [i * 120] : [],
      );
      expect(onsets(r.hits), r.id).toEqual(grid);
      for (const hit of r.hits) {
        // A chord changes on the bar line: nothing rings over it.
        const barEnd = (Math.floor(hit.onset / BAR_TICKS) + 1) * BAR_TICKS;
        expect(hit.onset + hit.duration).toBeLessThanOrEqual(barEnd);
      }
    }
  });

  it('strikes each bar’s chord before its last beat, three times a beat at most', () => {
    for (const r of CHORD_RHYTHMS) {
      const bars = chordRhythmBars(r, 2);
      for (const bar of bars) {
        expect(
          bar.some((h) => h.onset < 3 * BEAT_TICKS),
          r.id,
        ).toBe(true);
        for (let beat = 0; beat < 4; beat++) {
          const inBeat = bar.filter(
            (h) =>
              h.onset >= beat * BEAT_TICKS && h.onset < (beat + 1) * BEAT_TICKS,
          );
          expect(inBeat.length, r.id).toBeLessThanOrEqual(3);
        }
      }
    }
  });

  it('plays a one-bar pattern in both bars, a two-bar one across them', () => {
    const quarters = chordRhythmById('comp_pop_01')!;
    expect(chordRhythmBars(quarters, 2).map(onsets)).toEqual([
      [0, 480, 960, 1440],
      [0, 480, 960, 1440],
    ]);
    const gospel = chordRhythmById('comp2_rnb_03')!;
    expect(chordRhythmBars(gospel, 2).map(onsets)).toEqual([
      [0, 960, 1680],
      [0, 960, 1680],
    ]);
    const build = chordRhythmById('comp2_pop_03')!;
    expect(chordRhythmBars(build, 2).map(onsets)).toEqual([
      [0, 960],
      [0, 480, 960, 1440],
    ]);
  });

  it('leaves out what a straight 4/4 echo can’t play, and says why', () => {
    const left = new Map(CHORD_FILE.leftOut.map((l) => [l.id, l.why]));
    expect(left.get('comp_folk_04')).toBe('not 4/4');
    expect(left.get('comp_blues_02')).toMatch(/shuffle/);
    expect(left.get('comp_pop_03')).toMatch(/4 strikes in a beat/);
    expect(left.get('comp_rnb_03')).toMatch(/before its last beat/);
    // The rows whose grid and array disagree wait for the owner.
    expect(left.get('comp_latin_03')).toMatch(/disagree/);
    expect(left.get('comp_neo_08')).toMatch(/disagree/);
    expect(left.get('comp_afr_04')).toMatch(/disagree/);
  });

  it('tiers them: the beats, the eighths, the skanks and a few 16ths, the rest', () => {
    const tier = (t: number) => CHORD_RHYTHMS.filter((r) => r.tier === t);
    for (const r of tier(1)) {
      expect(r.hits[0].onset).toBe(0);
      expect(r.hits.every((h) => h.onset % BEAT_TICKS === 0)).toBe(true);
    }
    for (const r of tier(2)) {
      expect(r.hits[0].onset).toBe(0);
      expect(r.hits.every((h) => h.onset % 240 === 0)).toBe(true);
    }
    expect(chordRhythmById('comp_pop_01')!.tier).toBe(1);
    expect(chordRhythmById('comp_pop_02')!.tier).toBe(2);
    expect(chordRhythmById('comp_reg_01')!.tier).toBe(3);
    expect(chordRhythmById('comp_funk_03a')!.tier).toBe(4);
  });
});

describe('a melody call’s rhythm', () => {
  it('is one phrase rhythm, a bar, with the contour’s notes on it', () => {
    for (const level of ECHO_LEVEL_NUMBERS) {
      for (const call of manyMelodyCalls(level)) {
        expect(call.bars).toBe(1);
        expect(call.rhythm.notes).toBe(call.contour.noteCount);
        expect(call.notes.map((n) => [n.onset, n.duration])).toEqual(
          call.rhythm.hits.map((h) => [h.onset, h.duration]),
        );
      }
    }
  });

  it('draws on the level’s tiers, its newest about half the time', () => {
    for (const level of ECHO_LEVEL_NUMBERS) {
      const { rhythmTiers } = ECHO_LEVELS[level];
      const calls = manyMelodyCalls(level);
      const tiers = calls.map((c) => c.rhythm.tier);
      expect(new Set(tiers)).toEqual(new Set(rhythmTiers));
      const newest = tiers.filter((t) => t === Math.max(...rhythmTiers));
      if (level > 1) {
        expect(newest.length / tiers.length).toBeGreaterThan(0.35);
        expect(newest.length / tiers.length).toBeLessThan(0.65);
      }
    }
  });

  it('can be asked for by id, and must hold the contour’s notes', () => {
    const key = { tonic: 'C', mode: 'major' } as const;
    const call = melodyCall(1, key, echoRandom('id'), {
      contourId: '0,1,2',
      zeroPoint: 1,
      rhythmId: 'mp_pop_3a',
    });
    expect(call.notes.map((n) => [n.label, n.onset])).toEqual([
      ['1', 0],
      ['2', 480],
      ['3', 960],
    ]);
    expect(() =>
      melodyCall(1, key, echoRandom('id'), {
        contourId: '0,1,2',
        rhythmId: 'mp_pop_4a',
      }),
    ).toThrow(/3 notes/);
  });

  it('every contour finds a rhythm with its notes, at every tier', () => {
    const counts = new Set(CONTOUR_LIBRARY.map((c) => c.noteCount));
    for (const n of counts) {
      for (const t of [1, 2, 3, 4]) {
        expect(
          MELODY_RHYTHMS.some((r) => r.notes === n && r.tier === t),
          `${n} notes, Tier ${t}`,
        ).toBe(true);
      }
    }
  });
});

describe('a chord call’s rhythm', () => {
  it('strikes each bar’s chord in the pattern, the last beat a breath', () => {
    for (const level of ECHO_LEVEL_NUMBERS) {
      for (const call of manyChordCalls(level)) {
        const bars = chordRhythmBars(call.rhythm, 2);
        const end = 2 * BAR_TICKS - BEAT_TICKS;
        const expected = bars.flatMap((hits, bar) =>
          hits
            .map((h) => bar * BAR_TICKS + h.onset)
            .filter((onset) => onset < end),
        );
        expect(call.attacks.map((a) => a.onset)).toEqual(expected);
        for (const attack of call.attacks) {
          expect(attack.chord).toBe(call.chords[attack.bar]);
          expect(attack.onset + attack.duration).toBeLessThanOrEqual(end);
        }
      }
    }
  });

  it('draws on the level’s tiers, and the boss on the tier above, every call', () => {
    for (const level of ECHO_LEVEL_NUMBERS) {
      const { rhythmTiers, bossRhythmTier } = ECHO_LEVELS[level];
      const tiers = new Set(manyChordCalls(level).map((c) => c.rhythm.tier));
      expect(tiers).toEqual(new Set(rhythmTiers));
      expect(bossRhythmTier).toBe(level + 1);
      const rng = echoRandom(`boss-${level}`);
      for (let i = 0; i < 40; i++) {
        for (const call of bossCalls(level, KEYS[i % KEYS.length], rng)) {
          expect(call.boss).toBe(true);
          expect(call.rhythm.tier).toBe(bossRhythmTier);
        }
      }
    }
  });

  it('can strike a chord on every beat without a breath, for a song', () => {
    const quarters = chordRhythmById('comp_pop_01')!;
    const call = chordCall(1, { tonic: 'C', mode: 'major' }, echoRandom('q'), {
      degrees: ['1', '4'],
      rhythmId: 'comp_pop_01',
    });
    expect(call.attacks).toHaveLength(7);
    expect(chordAttacks(call.chords, quarters, { breath: false })).toHaveLength(
      8,
    );
  });
});
