import { describe, expect, it } from 'vitest';
import { echoTimeline, ticksToMs } from '@/curriculum/engine/echo';
import { FINAL_DOWNBEAT_BEATS } from '@/curriculum/engine/musicLiteracy/run';
import {
  askedTiming,
  bestStreakOf,
  bossHealth,
  bossOutcome,
  bossTally,
  classHit,
  classResultLine,
  classResultOf,
  classRoundCall,
  classRoundLengthMs,
  echoGrid,
  firstName,
  markOf,
  missedMost,
  missedNoteLine,
  projectorNames,
  streakOf,
  withRound,
} from '../classRound';
import type { EchoResponsePayload, EchoRoundResult } from '../types';

/**
 * A class's Echo, round by round (classRound.ts): Atlas's calls from the
 * session's seed, the class's result in counts, the Boss fought as a class,
 * the teacher's grid, and first names for the projector only as chosen.
 */

const C = { tonic: 'C', mode: 'major' } as const;
const round = (
  run: number,
  passed: boolean,
  played = ['1'],
): EchoRoundResult => ({
  run,
  passed,
  score: passed ? 100 : 33,
  asked: ['1', '2', '3'],
  played,
});
const payload = (...rounds: EchoRoundResult[]): EchoResponsePayload =>
  withRound(
    rounds.length > 1 ? withRound(null, 's1', rounds[0]) : null,
    's1',
    rounds[rounds.length - 1],
  );

describe('a class’s rounds', () => {
  it('makes the same call for the same session, slide and run', () => {
    const input = {
      seed: 'sess:slide',
      run: 3,
      section: 'melodyEcho' as const,
      level: 2 as const,
      key: C,
      tempo: 96,
    };
    expect(classRoundCall(input)).toEqual(classRoundCall(input));
    expect(classRoundCall({ ...input, run: 4 })).not.toEqual(
      classRoundCall(input),
    );
    expect(classRoundCall(input).tempo).toBe(96);
  });

  it('plays the Boss’s four calls in turn, a fight at a time', () => {
    const at = (bossAt: number, fight = 1) =>
      classRoundCall({
        seed: 's',
        run: 9,
        section: 'boss',
        level: 1,
        key: C,
        tempo: 90,
        fight,
        bossAt,
      });
    expect([0, 1, 2, 3].map((i) => at(i).kind)).toEqual([
      'melody',
      'chords',
      'melody',
      'chords',
    ]);
    expect(at(0).boss).toBe(true);
    expect(at(0, 2)).not.toEqual(at(0, 1));
  });

  it('knows how long a round runs: count-in to the final downbeat', () => {
    const call = classRoundCall({
      seed: 's',
      run: 1,
      section: 'melodyEcho',
      level: 1,
      key: C,
      tempo: 80,
    });
    const timeline = echoTimeline(call, { tempo: 80 });
    expect(classRoundLengthMs(call, 80)).toBeCloseTo(
      ticksToMs(timeline.total + FINAL_DOWNBEAT_BEATS * 480, 80),
    );
    // Four bars and two beats at 80 BPM.
    expect(classRoundLengthMs(call, 80)).toBeCloseTo(13_500);
  });
});

describe('a student’s rounds', () => {
  it('times a melody note by note, and a chord call bar by bar', () => {
    const melody = classRoundCall({
      seed: 't',
      run: 1,
      section: 'melodyEcho',
      level: 1,
      key: C,
      tempo: 90,
    });
    const offsets = melody.notes.map((_, i) => (i === 0 ? null : 20));
    expect(askedTiming(melody, offsets, 90)).toEqual(
      melody.notes.map((_, i) => (i === 0 ? null : 28)),
    );
    const chords = classRoundCall({
      seed: 't',
      run: 2,
      section: 'chordEcho',
      level: 1,
      key: C,
      tempo: 90,
    });
    // Every strike of the first bar missed; the second bar's answered.
    if (chords.kind !== 'chords') throw new Error('a chord call');
    const strikes = chords.attacks.map((a) => (a.bar === 0 ? null : -40));
    expect(askedTiming(chords, strikes, 90)).toEqual([null, -56]);
  });

  it('adds each round to the cumulative payload, a run once', () => {
    let p = withRound(null, 's1', round(1, true));
    p = withRound(p, 's1', round(2, true));
    p = withRound(p, 's1', round(3, false));
    p = withRound(p, 's1', round(3, true)); // the same run again: replaced
    expect(p.rounds.map((r) => [r.run, r.passed])).toEqual([
      [1, true],
      [2, true],
      [3, true],
    ]);
    expect(p.bestStreak).toBe(3);
    expect(p.kind).toBe('echo');
    // Another slide's rounds don't carry over.
    expect(withRound(p, 's2', round(1, false)).rounds).toHaveLength(1);
  });

  it('counts the streak and the best streak', () => {
    const rounds = [
      round(1, true),
      round(2, false),
      round(3, true),
      round(4, true),
    ];
    expect(bestStreakOf(rounds)).toBe(2);
    expect(streakOf(rounds)).toBe(2);
    expect(streakOf([...rounds, round(5, false)])).toBe(0);
  });
});

describe('the class’s result', () => {
  const payloads = [
    payload(round(1, true)),
    payload(round(1, true)),
    payload(round(1, false)),
    payload(round(1, false, [])), // played nothing
    null,
  ];

  it('is counts only: good of those who answered, and who’s joined', () => {
    const result = classResultOf(1, payloads, 5);
    expect(result).toEqual({ run: 1, good: 2, answered: 3, joined: 5 });
    expect(Object.keys(result)).not.toContain('names');
    expect(classResultLine(result)).toBe('2 of 3 echoed it!');
    expect(classResultLine({ ...result, good: 3 })).toBe('All 3 echoed it!');
    expect(classResultLine({ ...result, good: 0, answered: 0 })).toMatch(
      /Nobody/,
    );
  });

  it('names the notes the class missed most', () => {
    const timed = (run: number, timing: (number | null)[]) =>
      withRound(null, 's1', { ...round(run, false), timing });
    const missed = missedMost(1, [
      timed(1, [10, null, null]),
      timed(1, [0, -20, null]),
      timed(1, [5, 5, 5]),
      null,
    ]);
    expect(missed).toEqual([
      { index: 2, label: '3', missed: 2 },
      { index: 1, label: '2', missed: 1 },
    ]);
    expect(missedNoteLine(missed[0])).toBe('the 3rd (3), 2 missed');
    expect(missedMost(1, [timed(1, [1, 2, 3])])).toEqual([]);
  });

  it('hits the Boss at 70% of those who answered', () => {
    expect(classHit({ good: 7, answered: 10 })).toBe(true);
    expect(classHit({ good: 6, answered: 10 })).toBe(false);
    expect(classHit({ good: 0, answered: 0 })).toBe(false);
  });

  it('wins the fight at three hits and loses it at two misses', () => {
    expect(bossOutcome(bossTally([true, true]))).toBe('fighting');
    expect(bossOutcome(bossTally([true, false, true, true]))).toBe('won');
    expect(bossOutcome(bossTally([false, true, false]))).toBe('lost');
    expect(bossHealth(bossTally([true, true]))).toBe(1);
    expect(bossHealth(undefined)).toBe(3);
  });
});

describe('the teacher’s grid', () => {
  const roster = [
    { enrollmentId: 'a', displayName: 'Ana Perez' },
    { enrollmentId: 'b', displayName: 'Ben K.' },
    { enrollmentId: 'c', displayName: 'Cleo R.' },
  ];
  const ana = withRound(
    withRound(withRound(null, 's1', round(1, true)), 's1', round(2, true)),
    's1',
    round(3, false),
  );
  const ben = withRound(null, 's1', round(2, false, []));
  const rows = echoGrid({
    roster,
    runs: [1, 2, 3],
    payloads: { a: ana, b: ben },
    isJoined: (id) => id !== 'c',
  });

  it('marks each round ✓ ✗ – ○', () => {
    expect(rows.map((r) => r.marks)).toEqual([
      ['good', 'good', 'miss'],
      ['none', 'none', 'none'],
      ['out', 'out', 'out'],
    ]);
    expect(markOf(undefined, true)).toBe('none');
    expect(markOf(undefined, false)).toBe('out');
  });

  it('ends each row with a percentage and the best streak', () => {
    expect(rows[0]).toMatchObject({ good: 2, percent: 67, bestStreak: 2 });
    // Ben first answered in round 2: two rounds since, none good.
    expect(rows[1]).toMatchObject({ good: 0, percent: 0, bestStreak: 0 });
    expect(rows[0].last?.run).toBe(3);
  });

  it('puts first names on the projector only as the teacher chose', () => {
    expect(projectorNames(rows, 'class')).toBeUndefined();
    const board = projectorNames(rows, 'leaderboard')!;
    expect(board).toEqual([{ name: 'Ana', good: 2, bestStreak: 2, marks: [] }]);
    const grid = projectorNames(rows, 'grid')!;
    expect(grid.map((r) => r.name)).toEqual(['Ana', 'Ben', 'Cleo']);
    // First names only: no surnames, no ids.
    const text = JSON.stringify(grid);
    expect(text).not.toContain('Perez');
    expect(text).not.toContain('enrollmentId');
    expect(firstName('  Ana   Perez ')).toBe('Ana');
  });
});
