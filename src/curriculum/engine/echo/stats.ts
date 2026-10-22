/**
 * A game of Echo's numbers, as a pure reducer: what the stats screen shows
 * after the gate (docs/echo-game.md, The flow 5), and the High Score.
 *
 *   sections   Melody Echo, Chord Echo, the Boss: rounds tried and passed
 *   streak     good echoes in a row, across every section; the best of the
 *              game is the High Score's candidate
 *   the boss   four calls, three good echoes to win: its health drops with
 *              each; two misses and it can't be beaten, so it's lost, and a
 *              retry starts the boss over (not the level)
 *   XP         earned in the game, by the events the server will award
 *              (echo_round_passed, echo_boss_defeated, echo_song_finished)
 *
 * A boss echo after the fight is decided counts in the section and the
 * streak, but not against the boss. The server decides real XP and its
 * daily cap; these amounts are what the stats screen shows until it does.
 * Pure, no React.
 */

import { BOSS_CALLS, type EchoLevelNumber } from './levels';

export type EchoSection = 'melodyEcho' | 'chordEcho' | 'boss';

export const ECHO_SECTIONS: readonly EchoSection[] = [
  'melodyEcho',
  'chordEcho',
  'boss',
];

/** The XP events the server will award (docs/echo-game.md, XP). */
export type EchoXpEvent =
  | 'echo_round_passed'
  | 'echo_boss_defeated'
  | 'echo_song_finished';

/** XP for a good echo, in any section. */
export const XP_ROUND_PASSED = 10;
/** XP for beating the Echo Boss, once a game. */
export const XP_BOSS_DEFEATED = 50;
/** XP for finishing the song, once a game. */
export const XP_SONG_FINISHED = 25;

export const ECHO_XP: Readonly<Record<EchoXpEvent, number>> = {
  echo_round_passed: XP_ROUND_PASSED,
  echo_boss_defeated: XP_BOSS_DEFEATED,
  echo_song_finished: XP_SONG_FINISHED,
};

/** The good echoes of the boss's four calls it takes to beat it. */
export const BOSS_GOOD_TO_WIN = 3;

export interface SectionStats {
  tried: number;
  passed: number;
}

export interface BossFight {
  /** Calls echoed in this fight. */
  calls: number;
  good: number;
  missed: number;
  /** Its health left, BOSS_GOOD_TO_WIN down to 0: one less a good echo. */
  health: number;
  outcome: 'fighting' | 'won' | 'lost';
  /** Fights begun, this one included. */
  attempts: number;
}

export interface EchoGameStats {
  level: EchoLevelNumber;
  sections: Record<EchoSection, SectionStats>;
  streak: number;
  bestStreak: number;
  boss: BossFight;
  xp: number;
  /** How many of each XP event the game earned (for the server, later). */
  awards: Record<EchoXpEvent, number>;
  songFinished: boolean;
}

export type EchoGameEvent =
  /** An echo graded, in a section. */
  | { type: 'echo'; section: EchoSection; passed: boolean }
  /** The boss lost to: fight it again. */
  | { type: 'bossRetry' }
  /** Finish, on the song. */
  | { type: 'songFinished' };

const freshBoss = (attempts: number): BossFight => ({
  calls: 0,
  good: 0,
  missed: 0,
  health: BOSS_GOOD_TO_WIN,
  outcome: 'fighting',
  attempts,
});

/** A game's numbers before its first call. */
export function newEchoGame(level: EchoLevelNumber): EchoGameStats {
  return {
    level,
    sections: {
      melodyEcho: { tried: 0, passed: 0 },
      chordEcho: { tried: 0, passed: 0 },
      boss: { tried: 0, passed: 0 },
    },
    streak: 0,
    bestStreak: 0,
    boss: freshBoss(1),
    xp: 0,
    awards: {
      echo_round_passed: 0,
      echo_boss_defeated: 0,
      echo_song_finished: 0,
    },
    songFinished: false,
  };
}

const award = (stats: EchoGameStats, event: EchoXpEvent): EchoGameStats => ({
  ...stats,
  xp: stats.xp + ECHO_XP[event],
  awards: { ...stats.awards, [event]: stats.awards[event] + 1 },
});

/** The boss after an echo: won at three good, lost once three can't be. */
function fightOn(boss: BossFight, passed: boolean): BossFight {
  if (boss.outcome !== 'fighting') return boss;
  const good = boss.good + (passed ? 1 : 0);
  const missed = boss.missed + (passed ? 0 : 1);
  const outcome =
    good >= BOSS_GOOD_TO_WIN
      ? 'won'
      : missed > BOSS_CALLS - BOSS_GOOD_TO_WIN
        ? 'lost'
        : 'fighting';
  return {
    ...boss,
    calls: boss.calls + 1,
    good,
    missed,
    health: Math.max(0, BOSS_GOOD_TO_WIN - good),
    outcome,
  };
}

/** A game's numbers after an event. */
export function echoGameReducer(
  stats: EchoGameStats,
  event: EchoGameEvent,
): EchoGameStats {
  switch (event.type) {
    case 'echo': {
      const section = stats.sections[event.section];
      const streak = event.passed ? stats.streak + 1 : 0;
      let next: EchoGameStats = {
        ...stats,
        sections: {
          ...stats.sections,
          [event.section]: {
            tried: section.tried + 1,
            passed: section.passed + (event.passed ? 1 : 0),
          },
        },
        streak,
        bestStreak: Math.max(stats.bestStreak, streak),
      };
      if (event.passed) next = award(next, 'echo_round_passed');
      if (event.section === 'boss') {
        const boss = fightOn(stats.boss, event.passed);
        next = { ...next, boss };
        if (boss.outcome === 'won' && stats.boss.outcome !== 'won') {
          next = award(next, 'echo_boss_defeated');
        }
      }
      return next;
    }
    case 'bossRetry':
      return stats.boss.outcome === 'won'
        ? stats
        : { ...stats, boss: freshBoss(stats.boss.attempts + 1) };
    case 'songFinished':
      return stats.songFinished
        ? stats
        : award({ ...stats, songFinished: true }, 'echo_song_finished');
  }
}

/** Passed of tried, as a whole percent; null before any round. */
export const sectionPercent = ({
  tried,
  passed,
}: SectionStats): number | null =>
  tried === 0 ? null : Math.round((passed / tried) * 100);

/** One line of the stats screen. */
export interface SectionSummary extends SectionStats {
  section: EchoSection;
  percent: number | null;
}

/** The stats screen: each section's rate, the best streak, the XP. */
export function echoGameSummary(stats: EchoGameStats): {
  sections: SectionSummary[];
  bestStreak: number;
  xp: number;
  bossDefeated: boolean;
} {
  return {
    sections: ECHO_SECTIONS.map((section) => ({
      section,
      ...stats.sections[section],
      percent: sectionPercent(stats.sections[section]),
    })),
    bestStreak: stats.bestStreak,
    xp: stats.xp,
    bossDefeated: stats.boss.outcome === 'won',
  };
}
