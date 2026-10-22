/**
 * A class's Echo, round by round (docs/echo-classroom.md): the pure rules
 * the teacher's computer, the students' devices and the projector share.
 *
 * A ROUND
 * One call, run as solo Echo runs it: a bar of count-in, Atlas's call, the
 * count-off bar, the answer, the final downbeat (engine/echo/grading.ts
 * `echoTimeline`). The Boss plays one call a round too, so the class's
 * result can hit it after each. Atlas makes the calls with the engine
 * (roundCall, bossCalls), from a seed per session and slide: each round's
 * from its own run number, so a teacher's page reloaded mid-lesson makes
 * the same calls it would have.
 *
 * THE START
 * The teacher's computer sends each round with its count-in's start on the
 * server's clock, about two seconds ahead (CLASS_ROUND_LEAD_MS), so slow
 * devices are ready in time. A device that gets it later than
 * LATE_START_MS after that sits the round out: its run would no longer be
 * the class's.
 *
 * THE CLASS RESULT
 * Counts only: how many echoed it well (`good`), how many played anything
 * (`answered`), how many are joined. The projector shows "21 of 24 echoed
 * it!": good of answered. The teacher also sees the notes the class missed
 * most (`missedMost`), from each student's note-by-note timing.
 *
 * THE BOSS, AS A CLASS
 * Each of its calls, the class's share of good echoes hits it: 70% of the
 * students who answered, or more, is a hit (CLASS_HIT_SHARE). Three hits
 * win; two misses lose. Four calls always decide it.
 *
 * THE GRID
 * A row per student, a column per round: ✓ good, ✗ missed, – no answer,
 * ○ not joined; then their percentage (good of the rounds since they first
 * answered) and best streak.
 *
 * Pure, no React.
 */

import { roundCall } from '@/components/Games/Echo/echoCalls';
import { SECTION_ROUNDS } from '@/components/Games/Echo/echoFlow';
import {
  BEAT_TICKS,
  BOSS_GOOD_TO_WIN,
  bossCalls,
  echoLevel,
  echoRandom,
  echoTimeline,
  ticksToMs,
  type EchoCall,
  type EchoLevelNumber,
} from '@/curriculum/engine/echo';
import { FINAL_DOWNBEAT_BEATS } from '@/curriculum/engine/musicLiteracy/run';
import type {
  EchoClassBoss,
  EchoClassKey,
  EchoClassResult,
  EchoClassSection,
  EchoClassSettings,
  EchoMark,
  EchoNameRow,
  EchoResponsePayload,
  EchoRoundResult,
} from './types';

/** How far ahead of now a round is set to start (ms). */
export const CLASS_ROUND_LEAD_MS = 2000;
/** A device this late for a round's start (ms) sits it out. */
export const LATE_START_MS = 500;
/** After a round's end, how long the teacher's computer waits for answers (ms). */
export const RESULT_GRACE_MS = 1500;
/** How long the class's result shows before the next round (ms). */
export const RESULT_HOLD_MS = 3500;
/** The share of answering students whose good echoes hit the Boss. */
export const CLASS_HIT_SHARE = 0.7;
/** Hits that beat the Boss. */
export const CLASS_BOSS_HITS_TO_WIN = BOSS_GOOD_TO_WIN;
/** Misses that lose the fight. */
export const CLASS_BOSS_MISSES_TO_LOSE = 2;

/** Rounds a section plays before Atlas stops for the teacher (the Boss: until decided). */
export const classSectionRounds = (section: EchoClassSection): number =>
  section === 'boss' ? Infinity : SECTION_ROUNDS[section];

/** The seed a session's Echo slide makes its calls from. */
export const echoClassSeed = (sessionId: string, slideId: string): string =>
  `${sessionId}:${slideId}`;

export interface ClassRoundCallInput {
  seed: string;
  /** The round's run number: its own random source. */
  run: number;
  section: EchoClassSection;
  level: EchoLevelNumber;
  key: EchoClassKey;
  tempo: number;
  /** The Boss: which fight (each fight its four calls) and which call. */
  fight?: number;
  bossAt?: number;
  /** Contour ids played lately, not to repeat while others remain. */
  exclude?: readonly string[];
}

/** Atlas's call for a round (A ROUND above). */
export function classRoundCall({
  seed,
  run,
  section,
  level,
  key,
  tempo,
  fight = 0,
  bossAt = 0,
  exclude = [],
}: ClassRoundCallInput): EchoCall {
  if (section === 'boss') {
    const calls = bossCalls(level, key, echoRandom(`${seed}:boss:${fight}`), {
      tempo,
    });
    return calls[Math.min(bossAt, calls.length - 1)];
  }
  return roundCall(section, level, key, echoRandom(`${seed}:${run}`), {
    exclude,
    tempo,
  });
}

/** A round's length, its count-in to the end of its final downbeat (ms). */
export function classRoundLengthMs(
  call: Pick<EchoCall, 'bars' | 'barTicks' | 'level' | 'tempo'>,
  tempo = call.tempo,
): number {
  const timeline = echoTimeline(call, { tempo });
  const end = timeline.total + FINAL_DOWNBEAT_BEATS * BEAT_TICKS;
  return ticksToMs(end, tempo);
}

/** The tempo a level starts at in class: the slide's, else the level's base. */
export const classStartTempo = (
  level: EchoLevelNumber,
  tempo?: number,
): number => tempo ?? echoLevel(level).tempo;

// ── A student's rounds ─────────────────────────────────────────────────────

/**
 * Each thing a call asked, ms early (−) or late (+), null where it was
 * missed: what the teacher's grid shows note by note. A melody's notes one
 * by one; a chord call by bar, as its `asked` lists them, each bar the
 * first of its strikes answered.
 */
export function askedTiming(
  call: EchoCall,
  offsets: readonly (number | null)[],
  tempo: number,
): (number | null)[] {
  const ms = (ticks: number | null) =>
    ticks === null ? null : Math.round(ticksToMs(ticks, tempo));
  if (call.kind === 'melody') return offsets.map(ms);
  return call.labels.map((_, bar) => {
    const at = call.attacks.findIndex(
      (a, i) =>
        a.bar === bar && offsets[i] !== null && offsets[i] !== undefined,
    );
    return at === -1 ? null : ms(offsets[at]);
  });
}

/** The longest run of good echoes, rounds in order. */
export function bestStreakOf(rounds: readonly EchoRoundResult[]): number {
  let best = 0;
  let now = 0;
  for (const round of [...rounds].sort((a, b) => a.run - b.run)) {
    now = round.passed ? now + 1 : 0;
    best = Math.max(best, now);
  }
  return best;
}

/** The good echoes in a row up to the latest round. */
export function streakOf(rounds: readonly EchoRoundResult[]): number {
  const sorted = [...rounds].sort((a, b) => b.run - a.run);
  let n = 0;
  for (const round of sorted) {
    if (!round.passed) break;
    n += 1;
  }
  return n;
}

/**
 * A student's payload with a round added (or replacing the same run's):
 * what their device posts after each round, cumulative.
 */
export function withRound(
  payload: EchoResponsePayload | null | undefined,
  slideId: string,
  round: EchoRoundResult,
): EchoResponsePayload {
  const kept =
    payload && payload.slideId === slideId
      ? payload.rounds.filter((r) => r.run !== round.run)
      : [];
  const rounds = [...kept, round].sort((a, b) => a.run - b.run);
  return {
    kind: 'echo',
    slideId,
    rounds,
    bestStreak: bestStreakOf(rounds),
    ...(payload?.tunedInMs !== undefined
      ? { tunedInMs: payload.tunedInMs }
      : {}),
  };
}

/** An echo payload of a slide, or null for anything else. */
export function echoPayloadOf(
  payload: unknown,
  slideId: string,
): EchoResponsePayload | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Partial<EchoResponsePayload>;
  return p.kind === 'echo' && p.slideId === slideId && Array.isArray(p.rounds)
    ? (p as EchoResponsePayload)
    : null;
}

/** A student's round of a run, if they sent one. */
export const roundOf = (
  payload: EchoResponsePayload | null | undefined,
  run: number,
): EchoRoundResult | undefined => payload?.rounds.find((r) => r.run === run);

/** Whether a round's student played anything. */
const playedIn = (round: EchoRoundResult | undefined): boolean =>
  !!round && round.played.length > 0;

/** A cell of the grid (THE GRID above). */
export function markOf(
  round: EchoRoundResult | undefined,
  joined: boolean,
): EchoMark {
  if (playedIn(round)) return round!.passed ? 'good' : 'miss';
  return round || joined ? 'none' : 'out';
}

// ── The class ──────────────────────────────────────────────────────────────

/** How the class did in a run, counts only. */
export function classResultOf(
  run: number,
  payloads: readonly (EchoResponsePayload | null | undefined)[],
  joined: number,
  boss?: EchoClassBoss,
): EchoClassResult {
  let good = 0;
  let answered = 0;
  for (const payload of payloads) {
    const round = roundOf(payload, run);
    if (!playedIn(round)) continue;
    answered += 1;
    if (round!.passed) good += 1;
  }
  return {
    run,
    good,
    answered,
    joined: Math.max(joined, answered),
    ...(boss ? { boss } : {}),
  };
}

/** A note of the call the class missed, and how many missed it. */
export interface MissedNote {
  /** Its place in the call, from 0. */
  index: number;
  label: string;
  missed: number;
}

/**
 * The notes of a run's call the class missed most (The Teacher's Screen):
 * of the students who played anything, how many didn't answer each note,
 * the most missed first, at most `top`. None missed by anyone: none.
 */
export function missedMost(
  run: number,
  payloads: readonly (EchoResponsePayload | null | undefined)[],
  top = 2,
): MissedNote[] {
  const counts = new Map<number, MissedNote>();
  for (const payload of payloads) {
    const round = roundOf(payload, run);
    if (!playedIn(round) || !round!.timing) continue;
    round!.timing.forEach((ms, index) => {
      if (ms !== null) return;
      const was = counts.get(index);
      counts.set(index, {
        index,
        label: round!.asked[index] ?? '?',
        missed: (was?.missed ?? 0) + 1,
      });
    });
  }
  return [...counts.values()]
    .sort((a, b) => b.missed - a.missed || a.index - b.index)
    .slice(0, top);
}

/** "the 3rd (♭3), 4 missed": a note of the call, as the teacher reads it. */
export function missedNoteLine(note: MissedNote): string {
  const nth = note.index + 1;
  const suffix =
    nth % 10 === 1 && nth !== 11
      ? 'st'
      : nth % 10 === 2 && nth !== 12
        ? 'nd'
        : nth % 10 === 3 && nth !== 13
          ? 'rd'
          : 'th';
  return `the ${nth}${suffix} (${note.label}), ${note.missed} missed`;
}

/** Whether the class's round hits the Boss: 70% of those who answered, or more. */
export const classHit = (result: Pick<EchoClassResult, 'good' | 'answered'>) =>
  result.answered > 0 && result.good / result.answered >= CLASS_HIT_SHARE;

/** The fight so far, from each of its calls' verdicts (null: not played). */
export function bossTally(
  verdicts: readonly (boolean | null)[],
): EchoClassBoss {
  return {
    hits: verdicts.filter((v) => v === true).length,
    misses: verdicts.filter((v) => v === false).length,
  };
}

/** Where the class's fight stands. */
export function bossOutcome(
  boss: EchoClassBoss | undefined,
): 'fighting' | 'won' | 'lost' {
  if (!boss) return 'fighting';
  if (boss.hits >= CLASS_BOSS_HITS_TO_WIN) return 'won';
  if (boss.misses >= CLASS_BOSS_MISSES_TO_LOSE) return 'lost';
  return 'fighting';
}

/** The Boss's health: its hearts left. */
export const bossHealth = (boss: EchoClassBoss | undefined): number =>
  Math.max(0, CLASS_BOSS_HITS_TO_WIN - (boss?.hits ?? 0));

/** "21 of 24 echoed it!" */
export function classResultLine(result: EchoClassResult): string {
  if (result.answered === 0) return 'Nobody played that one. Next time!';
  if (result.good === result.answered) {
    return result.answered === 1
      ? 'Echoed it!'
      : `All ${result.answered} echoed it!`;
  }
  return `${result.good} of ${result.answered} echoed it!`;
}

// ── The teacher's grid ─────────────────────────────────────────────────────

export interface EchoRosterEntry {
  enrollmentId: string;
  displayName: string;
}

export interface EchoGridRow extends EchoRosterEntry {
  marks: EchoMark[];
  good: number;
  /** Good echoes of the rounds since they first answered, 0–100. */
  percent: number;
  bestStreak: number;
  joined: boolean;
  /** Their latest round, for opening their last answer. */
  last?: EchoRoundResult;
}

export interface EchoGridInput {
  roster: readonly EchoRosterEntry[];
  /** The rounds to show, oldest first: each a column. */
  runs: readonly number[];
  payloads: Readonly<Record<string, EchoResponsePayload | null | undefined>>;
  isJoined: (enrollmentId: string) => boolean;
}

/** The live grid (THE GRID above). A student who answered but isn't on the roster gets a row too. */
export function echoGrid({
  roster,
  runs,
  payloads,
  isJoined,
}: EchoGridInput): EchoGridRow[] {
  const known = new Set(roster.map((r) => r.enrollmentId));
  const everyone: EchoRosterEntry[] = [
    ...roster,
    ...Object.keys(payloads)
      .filter((id) => !known.has(id) && payloads[id])
      .map((id) => ({ enrollmentId: id, displayName: id })),
  ];
  return everyone.map((student) => {
    const payload = payloads[student.enrollmentId];
    const joined = isJoined(student.enrollmentId) || !!payload;
    const marks = runs.map((run) => markOf(roundOf(payload, run), joined));
    const first = runs.findIndex((run) => !!roundOf(payload, run));
    const since = first === -1 ? 0 : runs.length - first;
    const good = marks.filter((m) => m === 'good').length;
    let best = 0;
    let now = 0;
    for (const mark of marks) {
      now = mark === 'good' ? now + 1 : 0;
      best = Math.max(best, now);
    }
    const rounds = payload?.rounds ?? [];
    const last = [...rounds].sort((a, b) => b.run - a.run)[0];
    return {
      ...student,
      marks,
      good,
      percent: since ? Math.round((100 * good) / since) : 0,
      bestStreak: best,
      joined,
      ...(last ? { last } : {}),
    };
  });
}

/** A first name: the name's first word. */
export const firstName = (displayName: string): string =>
  displayName.trim().split(/\s+/)[0] ?? '';

/** The most first names a leaderboard shows. */
export const LEADERBOARD_SIZE = 10;
/** The rounds the projector's grid shows, the latest. */
export const PROJECTOR_GRID_ROUNDS = 8;

/**
 * First names for the projector, only as the teacher chose (Teacher
 * Settings, The projector shows): none for the class only; the leaders by
 * good echoes; or everyone's latest rounds. First names only, never ids.
 */
export function projectorNames(
  rows: readonly EchoGridRow[],
  projector: EchoClassSettings['projector'],
): EchoNameRow[] | undefined {
  if (projector === 'class') return undefined;
  const named = rows.map((row) => ({
    name: firstName(row.displayName),
    good: row.good,
    bestStreak: row.bestStreak,
    marks: row.marks.slice(-PROJECTOR_GRID_ROUNDS),
  }));
  if (projector === 'grid') return named;
  return named
    .filter((row) => row.good > 0)
    .sort((a, b) => b.good - a.good || b.bestStreak - a.bestStreak)
    .slice(0, LEADERBOARD_SIZE)
    .map((row) => ({ ...row, marks: [] }));
}
