import {
  awaitsTeacher,
  bossCalls,
  echoBossTempo,
  emptyTaughtCall,
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
import type { StepTimeline } from '@/curriculum/engine/musicLiteracy/literacy';
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
//   bossIntro  "The Echo Boss Appears!": the boss emerges from the circle
//   boss       four calls, a bar between them for the boss to react; won
//              at the third good echo, lost at the second miss ("Try the
//              Boss again" fights it afresh)
//   gate       "You beat the Echo Boss!": the game's numbers
//   song       Make Your Song (makeYourSong/MakeYourSong.tsx)
//
// PRESENTER MODE (docs/echo-classroom.md): the class plays along with the
// teacher's screen, not on it (`audience: 'class'`). An answer played on it
// is graded (the class's way, quantized); one that isn't asks the teacher
// how the class did (`judging`): Got It!, Missed It, or Again. The teacher
// may lead (`leader`): a round's call is then theirs, played over its call
// bars (engine/echo/taught.ts), and a round with nothing played runs again
// ("No call heard"). The boss plays one call a run, so each can be judged,
// and is always Atlas's.
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

/** Who's playing: one student, or a class at the teacher's screen. */
export type EchoAudience = 'solo' | 'class';

/** Who makes a class's calls: Atlas, or the teacher. */
export type EchoLeader = 'atlas' | 'teacher';

/** How the teacher says the class did. */
export type EchoVerdict = 'good' | 'miss' | 'again';

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
      /** In class, the answer wasn't played here: the teacher says how it went. */
      judging: boolean;
      /** The teacher led and played nothing: the round runs again. */
      noCall: boolean;
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
      /** In class, the call at `at` was answered off this screen: the teacher says. */
      judging: boolean;
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
  /** One student, or a class at the teacher's screen (Presenter mode). */
  audience: EchoAudience;
  /** Who makes a class's calls; a change plays from the next call. */
  leader: EchoLeader;
}

export type EchoFlowEvent =
  /** Setup's Start, Play Again, Next Level!: a new game. */
  | {
      type: 'begin';
      level: EchoLevelNumber;
      key: EchoKeyChoice;
      seed: string;
      /** Straight to the Echo Boss (a development shortcut: `?boss`). */
      skipTo?: 'boss';
      /** A class at the teacher's screen; one student when left out. */
      audience?: EchoAudience;
      leader?: EchoLeader;
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
  | { type: 'exit' }
  /** Who leads the class's calls, from the next one. */
  | { type: 'leader'; leader: EchoLeader }
  /** The teacher's call, played over its call bars, in run `run`. */
  | { type: 'taught'; run: number; call: EchoCall }
  /** The teacher led and played nothing. */
  | { type: 'noCall' }
  /** In class, the answer came unplayed here: the teacher is to say. */
  | { type: 'unanswered' }
  /** The teacher says how the class did. */
  | { type: 'judge'; verdict: EchoVerdict };

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
    audience: 'solo',
    leader: 'atlas',
  };
}

/** A class's section is led by its teacher. */
const teacherLeads = (flow: EchoFlow) =>
  flow.audience === 'class' && flow.leader === 'teacher';

/** The flow with a round of `section` under way: a fresh call. */
function playRound(
  flow: EchoFlow,
  section: EchoSectionName,
  round: number,
): EchoFlow {
  const taught = teacherLeads(flow);
  const call = taught
    ? emptyTaughtCall(section === 'melodyEcho' ? 'melody' : 'chords', {
        level: flow.level,
        key: flow.key,
        tempo: flow.tempo.bpm,
      })
    : roundCall(section, flow.level, flow.key, random(flow), {
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
      easier: !taught && flow.easier,
      outcome: null,
      judging: false,
      noCall: false,
    },
    made: flow.made + 1,
    recent:
      call.kind === 'melody' && !taught
        ? [call.contour.id, ...flow.recent].slice(0, RECENT_CONTOURS)
        : flow.recent,
    run: flow.run + 1,
  };
}

/** The same round once more: the same call, or the teacher's to play again. */
function againRound(
  flow: EchoFlow,
  screen: Extract<EchoScreen, { kind: 'round' }>,
): EchoFlow {
  const call = screen.call.taught
    ? emptyTaughtCall(screen.call.kind, {
        level: flow.level,
        key: flow.key,
        tempo: screen.tempo,
      })
    : screen.call;
  return {
    ...flow,
    screen: { ...screen, call, outcome: null, judging: false, noCall: false },
    run: flow.run + 1,
  };
}

/** What the teacher's verdict counts as: what was asked, nothing played. */
const judged = (call: EchoCall, passed: boolean): EchoOutcome => ({
  passed,
  percent: passed ? 100 : 0,
  asked: call.kind === 'melody' ? call.notes.map((n) => n.label) : call.labels,
  played: [],
});

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
      judging: false,
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
        screen:
          event.skipTo === 'boss'
            ? { kind: 'bossIntro' }
            : { kind: 'intro', section: 'melodyEcho' },
        run: flow.run,
        audience: event.audience ?? 'solo',
        leader: event.leader ?? 'atlas',
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
      const stats = echoGameReducer(flow.stats, {
        type: 'echo',
        section: 'boss',
        passed: event.outcome.passed,
      });
      return {
        ...flow,
        screen: { ...screen, at: screen.at + 1, outcomes, judging: false },
        stats,
        easier: false,
        // In class each call is a run of its own: the next one starts.
        run:
          flow.audience === 'class' && stats.boss.outcome === 'fighting'
            ? flow.run + 1
            : flow.run,
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

    case 'leader':
      return flow.audience === 'class'
        ? { ...flow, leader: event.leader }
        : flow;

    case 'taught':
      return screen.kind === 'round' &&
        event.run === flow.run &&
        awaitsTeacher(screen.call)
        ? { ...flow, screen: { ...screen, call: event.call } }
        : flow;

    case 'noCall':
      return screen.kind === 'round' && awaitsTeacher(screen.call)
        ? { ...flow, screen: { ...screen, noCall: true } }
        : flow;

    case 'unanswered':
      if (flow.audience !== 'class') return flow;
      if (screen.kind === 'round' && !screen.outcome) {
        return { ...flow, screen: { ...screen, judging: true } };
      }
      if (screen.kind === 'boss' && flow.stats.boss.outcome === 'fighting') {
        return { ...flow, screen: { ...screen, judging: true } };
      }
      return flow;

    case 'judge': {
      if (screen.kind === 'round' && (screen.judging || screen.noCall)) {
        if (event.verdict === 'again' || screen.noCall) {
          return againRound(flow, screen);
        }
        const graded = echoFlowReducer(
          { ...flow, screen: { ...screen, judging: false } },
          {
            type: 'graded',
            outcome: judged(screen.call, event.verdict === 'good'),
          },
        );
        return echoFlowReducer(graded, { type: 'next' });
      }
      if (screen.kind === 'boss' && screen.judging) {
        if (event.verdict === 'again') {
          return {
            ...flow,
            screen: { ...screen, judging: false },
            run: flow.run + 1,
          };
        }
        return echoFlowReducer(flow, {
          type: 'bossGraded',
          index: screen.at,
          outcome: judged(screen.calls[screen.at], event.verdict === 'good'),
        });
      }
      return flow;
    }
  }
}

/**
 * Bars between the boss's calls: a good echo makes it frown, a miss makes
 * it nod (bossArt.ts), and the groove goes on under it. Each later call's
 * count-in, so the hub says GET READY there.
 */
export const BOSS_GAP_BARS = 1;

/**
 * The boss's calls one after another, at one tempo: the first after a
 * count-in, each of the rest BOSS_GAP_BARS after the last one's response.
 * (The engine's bossTimelines lays them back to back; the play screens
 * leave the boss room to react.)
 */
export function bossRunTimelines(
  calls: readonly EchoCall[],
  tempo: number,
): StepTimeline[] {
  let start = 0;
  return calls.map((call, i) => {
    const timeline = echoTimeline(call, {
      tempo,
      countInBars: i === 0 ? undefined : BOSS_GAP_BARS,
      start,
    });
    start = timeline.total;
    return timeline;
  });
}

/** A run belongs on screen now: a round not yet graded, or a boss fight on. */
export const wantsRun = (flow: EchoFlow): boolean =>
  (flow.screen.kind === 'round' &&
    !flow.screen.outcome &&
    !flow.screen.judging &&
    !flow.screen.noCall) ||
  (flow.screen.kind === 'boss' &&
    flow.stats.boss.outcome === 'fighting' &&
    !flow.screen.judging);

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
    // In class, one call a run, so the teacher can judge each.
    const calls = screen.calls.slice(
      screen.at,
      flow.audience === 'class' ? screen.at + 1 : undefined,
    );
    if (calls.length === 0) return [];
    const timelines = bossRunTimelines(calls, screen.tempo);
    return calls.map((call, i) => placeCall(call, timelines[i]));
  }
  return [];
}
