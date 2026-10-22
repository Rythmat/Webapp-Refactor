import { describe, expect, it } from 'vitest';
import {
  BOSS_GOOD_TO_WIN,
  XP_BOSS_DEFEATED,
  XP_ROUND_PASSED,
  XP_SONG_FINISHED,
  echoGameReducer,
  echoGameSummary,
  newEchoGame,
  sectionPercent,
  type EchoGameEvent,
  type EchoGameStats,
  type EchoSection,
} from '../stats';

/**
 * A game's numbers: each section's rounds, the running and best streak,
 * the boss's health (three good echoes of four), and the XP.
 */

const echo = (section: EchoSection, passed: boolean): EchoGameEvent => ({
  type: 'echo',
  section,
  passed,
});

const play = (events: EchoGameEvent[], start = newEchoGame(1)) =>
  events.reduce<EchoGameStats>(echoGameReducer, start);

describe('the streak', () => {
  it('counts good echoes in a row, across sections, and keeps the best', () => {
    const stats = play([
      echo('melodyEcho', true),
      echo('melodyEcho', true),
      echo('melodyEcho', true),
      echo('melodyEcho', false),
      echo('chordEcho', true),
      echo('chordEcho', true),
    ]);
    expect(stats.streak).toBe(2);
    expect(stats.bestStreak).toBe(3);
    const longer = play([echo('chordEcho', true), echo('boss', true)], stats);
    expect(longer.streak).toBe(4);
    expect(longer.bestStreak).toBe(4);
  });
});

describe('the sections', () => {
  it('counts rounds tried and passed, as percentages', () => {
    const stats = play([
      echo('melodyEcho', true),
      echo('melodyEcho', false),
      echo('melodyEcho', true),
      echo('chordEcho', true),
    ]);
    expect(stats.sections.melodyEcho).toEqual({ tried: 3, passed: 2 });
    expect(sectionPercent(stats.sections.melodyEcho)).toBe(67);
    expect(sectionPercent(stats.sections.chordEcho)).toBe(100);
    expect(sectionPercent(stats.sections.boss)).toBeNull();
    expect(echoGameSummary(stats).sections).toEqual([
      { section: 'melodyEcho', tried: 3, passed: 2, percent: 67 },
      { section: 'chordEcho', tried: 1, passed: 1, percent: 100 },
      { section: 'boss', tried: 0, passed: 0, percent: null },
    ]);
  });

  it('is pure: the state it was given is unchanged', () => {
    const before = newEchoGame(2);
    const after = echoGameReducer(before, echo('melodyEcho', true));
    expect(before).toEqual(newEchoGame(2));
    expect(after).not.toBe(before);
  });
});

describe('the boss', () => {
  it('is beaten by three good echoes of four, its health dropping each', () => {
    let stats = newEchoGame(1);
    expect(stats.boss.health).toBe(BOSS_GOOD_TO_WIN);
    stats = play([echo('boss', true)], stats);
    expect(stats.boss.health).toBe(2);
    stats = play([echo('boss', false)], stats);
    expect(stats.boss).toMatchObject({ health: 2, outcome: 'fighting' });
    stats = play([echo('boss', true)], stats);
    expect(stats.boss).toMatchObject({ health: 1, outcome: 'fighting' });
    stats = play([echo('boss', true)], stats);
    expect(stats.boss).toMatchObject({
      calls: 4,
      good: 3,
      health: 0,
      outcome: 'won',
    });
    expect(echoGameSummary(stats).bossDefeated).toBe(true);
  });

  it('wins straight off at three in a row', () => {
    const stats = play([
      echo('boss', true),
      echo('boss', true),
      echo('boss', true),
    ]);
    expect(stats.boss.outcome).toBe('won');
  });

  it('is lost at a second miss, and a retry fights it again', () => {
    let stats = play([
      echo('melodyEcho', true),
      echo('boss', false),
      echo('boss', true),
      echo('boss', false),
    ]);
    expect(stats.boss.outcome).toBe('lost');
    // A boss echo after the fight is decided changes nothing of the boss.
    stats = play([echo('boss', true)], stats);
    expect(stats.boss).toMatchObject({ good: 1, outcome: 'lost' });
    expect(stats.sections.boss).toEqual({ tried: 4, passed: 2 });
    stats = echoGameReducer(stats, { type: 'bossRetry' });
    expect(stats.boss).toMatchObject({
      calls: 0,
      good: 0,
      health: BOSS_GOOD_TO_WIN,
      outcome: 'fighting',
      attempts: 2,
    });
    // The level's sections stay as they were: only the boss starts over.
    expect(stats.sections.melodyEcho).toEqual({ tried: 1, passed: 1 });
    stats = play(
      [echo('boss', true), echo('boss', true), echo('boss', true)],
      stats,
    );
    expect(stats.boss.outcome).toBe('won');
    expect(stats.sections.boss).toEqual({ tried: 7, passed: 5 });
  });
});

describe('XP', () => {
  it('earns for good echoes, the boss beaten and the song finished, once each', () => {
    let stats = play([
      echo('melodyEcho', true),
      echo('melodyEcho', false),
      echo('chordEcho', true),
      echo('boss', true),
      echo('boss', true),
      echo('boss', true),
    ]);
    expect(stats.xp).toBe(5 * XP_ROUND_PASSED + XP_BOSS_DEFEATED);
    stats = echoGameReducer(stats, { type: 'songFinished' });
    stats = echoGameReducer(stats, { type: 'songFinished' });
    expect(stats.xp).toBe(
      5 * XP_ROUND_PASSED + XP_BOSS_DEFEATED + XP_SONG_FINISHED,
    );
    expect(stats.awards).toEqual({
      echo_round_passed: 5,
      echo_boss_defeated: 1,
      echo_song_finished: 1,
    });
  });
});
