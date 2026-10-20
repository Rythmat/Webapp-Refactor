import {
  bossCalls,
  bossTimelines,
  echoBossTempo,
  echoGameReducer,
  echoTimeline,
  echoRandom,
  newEchoGame,
  newEchoTempo,
  nextEchoTempo,
  type EchoCall,
  type EchoGameStats,
  type EchoLevelNumber,
  type EchoTempo,
} from '@/curriculum/engine/echo';
import { roundCall, type EchoSectionName } from './echoCalls';
import type { EchoKeyChoice } from './echoProgress';
import { placeCall, type RunCall } from './echoRunCues';

// ── A game of Echo, screen by screen ───────────────────────────────────────
// The play screens as one pure reducer, so the whole game can be walked in
// a test without a sound:
//
//   setup      pick a color, major or minor, and a level
//   intro      a section's title card: Melody Echo, then Chord Echo
//   round      one call and its echo: playing, then its result, briefly
//   bossIntro  "The Echo Boss appears!"
//   boss       four calls back to back; won at the third good echo, lost
//              at the second miss ("Try the Boss again" fights it afresh)
//   gate       "You beat the Echo Boss!": the game's numbers
//   song       Make Your Song (makeYourSong/MakeYourSong.tsx)
//
// The numbers (sections, streak, the boss's health, XP) are the engine's
// (engine/echo/stats.ts echoGameReducer). Each call is made from the game's
// seed and its number, so a seed replays the same game. After a miss the
// next call is an easier one (echoCalls.ts). The tempo climbs with good
// echoes and eases after a miss (engine/echo/tempo.ts nextEchoTempo): each
// call is made at the tempo of its moment and keeps it, and the boss plays
// at the highest the game reached. The boss's echoes don't move the ramp.
// `run` counts the runs asked for: the screen starts the transport each
// time it moves.

/** Melody Echo's rounds, then Chord Echo's. */
export const MELODY_ECHO_ROUNDS = 8;
export const CHORD_ECHO_ROUNDS = 6;

export const SECTION_ROUNDS: Readonly<Record<EchoSectionName, number>> = {
  melodyEcho: MELODY_ECHO_ROUNDS,
  chordEcho: CHORD_ECHO_ROUNDS,
};

/** The sections in order, before the boss. */
export const ECHO_SECTION_ORDER: readonly EchoSectionName[] = [
  'melodyEcho',
  'chordEcho',
];

/** How many recent melody contours a new call avoids. */
const RECENT_CONTOURS = 3;

/** What an echo came to, as the result shows it. */
export interface EchoOutcome {
  passed: boolean;
  percent: number;
  /** What the student played, as shown: degrees ("1", "♭3") or chords ("4 maj"). */
  played: string[];
  /** What the call asked for, the same way. */
  asked: string[];
}

export type EchoScreen =
  | { kind: 'setup' }
  | { kind: 'intro'; section: EchoSectionName }
  | {
      kind: 'round';
      section: EchoSectionName;
      /** From 0. */
      round: number;
      call: EchoCall;
      /** BPM it plays at. */
      tempo: number;
      /** An easier call, after a miss. */
      easier: boolean;
      outcome: EchoOutcome | null;
    }
  | { kind: 'bossIntro' }
  | {
      kind: 'boss';
      calls: EchoCall[];
      /** BPM they play at: the game's highest. */
      tempo: number;
      /** The call being played (or the next to play). */
      at: number;
      outcomes: (EchoOutcome | null)[];
    }
  | { kind: 'gate' }
  | { kind: 'song' };

export interface EchoFlow {
  screen: EchoScreen;
  level: EchoLevelNumber;
  key: EchoKeyChoice;
  seed: string;
  stats: EchoGameStats;
  tempo: EchoTempo;
  /** Each section's echoes so far: good or not (the round pips). */
  pips: Record<EchoSectionName, boolean[]>;
  /** The last echo missed: the next call is easier. */
  easier: boolean;
  /** Calls made so far: the next one's number. */
  made: number;
  /** Melody contours played lately. */
  recent: string[];
  /** Runs asked for. */
  run: number;
}

export type EchoFlowEvent =
  /** Setup's Start, Play Again, Next Level!: a new game. */
  | {
      type: 'begin';
      level: EchoLevelNumber;
      key: EchoKeyChoice;
      seed: string;
    }
  /** A section's title card is done: its first round. */
  | { type: 'go' }
  /** The round's echo, graded. */
  | { type: 'graded'; outcome: EchoOutcome }
  /** On from a round's result. */
  | { type: 'next' }
  /** "Fight!": the boss's four calls. */
  | { type: 'fight' }
  /** One of the boss's echoes, graded. */
  | { type: 'bossGraded'; index: number; outcome: EchoOutcome }
  /** Try the Boss again: the boss alone, afresh. */
  | { type: 'bossRetry' }
  /** On from the beaten boss to the gate. */
  | { type: 'toGate' }
  /** Make Your Song. */
  | { type: 'toSong' }
  /** The song is finished: the victory shows. */
  | { type: 'songFinished' }
  /** Back to setup. */
  | { type: 'exit' };

const random = (flow: Pick<EchoFlow, 'seed' | 'made'>) =>
  echoRandom(`${flow.seed}:${flow.made}`);

/** A game before setup: Level 1 in C major. */
export function newEchoFlow(
  level: EchoLevelNumber = 1,
  key: EchoKeyChoice = { tonic: 'C', mode: 'major' },
): EchoFlow {
  return {
    screen: { kind: 'setup' },
    level,
    key,
    seed: '',
    stats: newEchoGame(level),
    tempo: newEchoTempo(level),
    pips: { melodyEcho: [], chordEcho: [] },
    easier: false,
    made: 0,
    recent: [],
    run: 0,
  };
}

/** The flow with a round of `section` under way: a fresh call. */
function playRound(
  flow: EchoFlow,
  section: EchoSectionName,
  round: number,
): EchoFlow {
  const call = roundCall(section, flow.level, flow.key, random(flow), {
    easier: flow.easier,
    exclude: flow.recent,
    tempo: flow.tempo.bpm,
  });
  return {
    ...flow,
    screen: {
      kind: 'round',
      section,
      round,
      call,
      tempo: call.tempo,
      easier: flow.easier,
      outcome: null,
    },
    made: flow.made + 1,
    recent:
      call.kind === 'melody'
        ? [call.contour.id, ...flow.recent].slice(0, RECENT_CONTOURS)
        : flow.recent,
    run: flow.run + 1,
  };
}

/** The boss's screen with four fresh calls. */
function fightBoss(flow: EchoFlow): EchoFlow {
  const tempo = echoBossTempo(flow.tempo, flow.level);
  const calls = bossCalls(flow.level, flow.key, random(flow), { tempo });
  return {
    ...flow,
    screen: {
      kind: 'boss',
      calls,
      tempo,
      at: 0,
      outcomes: calls.map(() => null),
    },
    made: flow.made + 1,
    run: flow.run + 1,
  };
}

/** What follows a section's last round. */
function afterSection(flow: EchoFlow, section: EchoSectionName): EchoFlow {
  const next = ECHO_SECTION_ORDER[ECHO_SECTION_ORDER.indexOf(section) + 1];
  return {
    ...flow,
    screen: next ? { kind: 'intro', section: next } : { kind: 'bossIntro' },
  };
}

export function echoFlowReducer(
  flow: EchoFlow,
  event: EchoFlowEvent,
): EchoFlow {
  const { screen } = flow;
  switch (event.type) {
    case 'begin':
      return {
        ...newEchoFlow(event.level, event.key),
        seed: event.seed,
        screen: { kind: 'intro', section: 'melodyEcho' },
        run: flow.run,
      };

    case 'go':
      return screen.kind === 'intro'
        ? playRound(flow, screen.section, 0)
        : flow;

    case 'graded': {
      if (screen.kind !== 'round' || screen.outcome) return flow;
      const { passed } = event.outcome;
      return {
        ...flow,
        screen: { ...screen, outcome: event.outcome },
        stats: echoGameReducer(flow.stats, {
          type: 'echo',
          section: screen.section,
          passed,
        }),
        pips: {
          ...flow.pips,
          [screen.section]: [...flow.pips[screen.section], passed],
        },
        easier: !passed,
        tempo: nextEchoTempo(flow.tempo, flow.level, { passed }),
      };
    }

    case 'next': {
      if (screen.kind !== 'round' || !screen.outcome) return flow;
      const round = screen.round + 1;
      return round < SECTION_ROUNDS[screen.section]
        ? playRound(flow, screen.section, round)
        : afterSection(flow, screen.section);
    }

    case 'fight':
      return screen.kind === 'bossIntro' ? fightBoss(flow) : flow;

    case 'bossGraded': {
      if (
        screen.kind !== 'boss' ||
        event.index !== screen.at ||
        flow.stats.boss.outcome !== 'fighting'
      ) {
        return flow;
      }
      const outcomes = [...screen.outcomes];
      outcomes[event.index] = event.outcome;
      return {
        ...flow,
        screen: { ...screen, at: screen.at + 1, outcomes },
        stats: echoGameReducer(flow.stats, {
          type: 'echo',
          section: 'boss',
          passed: event.outcome.passed,
        }),
        easier: false,
      };
    }

    case 'bossRetry':
      if (screen.kind !== 'boss' || flow.stats.boss.outcome !== 'lost') {
        return flow;
      }
      return fightBoss({
        ...flow,
        stats: echoGameReducer(flow.stats, { type: 'bossRetry' }),
      });

    case 'toGate':
      return screen.kind === 'boss' && flow.stats.boss.outcome === 'won'
        ? { ...flow, screen: { kind: 'gate' } }
        : flow;

    case 'toSong':
      return screen.kind === 'gate'
        ? { ...flow, screen: { kind: 'song' } }
        : flow;

    case 'songFinished':
      return screen.kind === 'song'
        ? {
            ...flow,
            stats: echoGameReducer(flow.stats, { type: 'songFinished' }),
          }
        : flow;

    case 'exit':
      return { ...newEchoFlow(flow.level, flow.key), run: flow.run };
  }
}

/** A run belongs on screen now: a round not yet graded, or a boss fight on. */
export const wantsRun = (flow: EchoFlow): boolean =>
  (flow.screen.kind === 'round' && !flow.screen.outcome) ||
  (flow.screen.kind === 'boss' && flow.stats.boss.outcome === 'fighting');

/**
 * The calls the screen's run plays, laid out at its tempo: a round's one,
 * or the boss's from the call it's on (a fight paused and resumed picks up
 * there, after a count-in).
 */
export function runCallsOf(flow: EchoFlow): RunCall[] {
  const { screen } = flow;
  if (screen.kind === 'round') {
    return [
      placeCall(
        screen.call,
        echoTimeline(screen.call, { tempo: screen.tempo }),
      ),
    ];
  }
  if (screen.kind === 'boss') {
    const calls = screen.calls.slice(screen.at);
    if (calls.length === 0) return [];
    const timelines = bossTimelines(calls, { tempo: screen.tempo });
    return calls.map((call, i) => placeCall(call, timelines[i]));
  }
  return [];
}
