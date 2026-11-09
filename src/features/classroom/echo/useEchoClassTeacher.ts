import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  echoLevel,
  echoTempoRange,
  fromEchoCallWire,
  toEchoCallWire,
  type EchoCall,
  type EchoLevelNumber,
} from '@/curriculum/engine/echo';
import type { PresenceStateValue } from '../live/sessionsStore';
import type { InteractionResponsePayload } from '../types';
import {
  CLASS_ROUND_LEAD_MS,
  RESULT_GRACE_MS,
  RESULT_HOLD_MS,
  bossOutcome,
  bossTally,
  classHit,
  classResultOf,
  classRoundCall,
  classRoundLengthMs,
  classSectionRounds,
  classStartTempo,
  echoClassSeed,
  echoGrid,
  echoPayloadOf,
  missedMost,
  projectorNames,
  type MissedNote,
  type EchoGridRow,
  type EchoRosterEntry,
} from './classRound';
import { useEchoClassSettings } from './classSettings';
import type {
  EchoClassKey,
  EchoClassResult,
  EchoClassSection,
  EchoClassSettings,
  EchoInteractionConfig,
  EchoResponsePayload,
  SessionEcho,
} from './types';

// ── The teacher's computer runs the class's Echo ───────────────────────────
// Atlas leads (docs/echo-classroom.md, Build Order step 2). The teacher's
// strip says what to play; this makes the calls and publishes each round in
// `SessionState.echo`, set to start about two seconds ahead on the server's
// clock. Every device plays the round itself and posts its student's
// result; this gathers them into the grid and the class's result.
//
// DRIVEN BY WHAT'S PUBLISHED
// The round's own state decides what happens next, so a teacher's page
// reloaded mid-lesson carries on:
//
//   a round under way    when it's over (and a grace for answers to come),
//                        the class's result is counted and published
//   its result shown     after a moment, the next round, unless paused,
//                        the section's rounds are done, or the Boss is
//                        decided
//   answers come late    the counts are published again (a Boss's verdict
//                        stands as it was called)
//
// THE STRIP
//   Start / Next Round   a new call (Atlas's, from the session's seed)
//   Again                the same call once more, a new round
//   Pause / Play         paused, every device stops; Play plays the call
//                        again from its count-in (or the next one, if the
//                        round was over)
//   Melody / Chords /    what the next round plays; the level, key and
//   Boss, level, key,    tempo too. Picked between rounds, they're staged
//   tempo                for the next one
//
// What this computer remembers that the state doesn't (the rounds played,
// the Boss's verdicts) is kept in sessionStorage per session and slide.

/** Where the next round is staged: what the strip shows. */
export interface EchoStage {
  section: EchoClassSection;
  level: EchoLevelNumber;
  key: EchoClassKey;
  tempo: number;
}

interface PlayedRun {
  run: number;
  section: EchoClassSection;
  /** Its result was counted: a column of the grid. */
  finished?: boolean;
  /** Stopped part way (paused, or skipped): not a column. */
  aborted?: boolean;
  /** A melody call's contour, not to repeat soon. */
  contourId?: string;
}

interface TeacherMemory {
  runs: PlayedRun[];
  /** The Boss fight under way: its number (its four calls) and verdicts. */
  fight: number;
  verdicts: (boolean | null)[];
  /** Rounds finished in the section under way. */
  roundInSection: number;
  stage: EchoStage | null;
}

const EMPTY_MEMORY: TeacherMemory = {
  runs: [],
  fight: 0,
  verdicts: [],
  roundInSection: 0,
  stage: null,
};

const memoryKey = (sessionId: string, slideId: string) =>
  `echo-class:v1:${sessionId}:${slideId}`;

function readMemory(key: string): TeacherMemory {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return EMPTY_MEMORY;
    const parsed = JSON.parse(raw) as Partial<TeacherMemory>;
    return {
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      fight: typeof parsed.fight === 'number' ? parsed.fight : 0,
      verdicts: Array.isArray(parsed.verdicts) ? parsed.verdicts : [],
      roundInSection:
        typeof parsed.roundInSection === 'number' ? parsed.roundInSection : 0,
      stage: parsed.stage ?? null,
    };
  } catch {
    return EMPTY_MEMORY;
  }
}

function writeMemory(key: string, memory: TeacherMemory): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(memory));
  } catch {
    // Storage blocked: remembered in memory only.
  }
}

/** Where a class's Echo is, for the strip. */
export type EchoTeacherPhase =
  | 'idle'
  | 'playing'
  | 'result'
  | 'paused'
  /** The section's rounds are done: the teacher picks what's next. */
  | 'done'
  | 'won'
  | 'lost';

export interface UseEchoClassTeacherInput {
  sessionId: string;
  classroomId: string;
  slideId: string;
  interactionId: string;
  config: EchoInteractionConfig;
  /** `SessionState.echo`, whatever slide it's for. */
  echo: SessionEcho | null | undefined;
  /** The session's responses: enrollment → interaction → payload. */
  responses: Readonly<
    Record<string, Readonly<Record<string, InteractionResponsePayload>>>
  >;
  roster: readonly EchoRosterEntry[];
  /** Live presence (teacher only); empty in a practice session. */
  presence?: Readonly<Record<string, PresenceStateValue>>;
  /** Now on the server's clock (epoch ms). */
  serverNow: () => number;
  sendEcho: (echo: SessionEcho | null) => void;
}

export interface UseEchoClassTeacher {
  /** The published round of this slide, if any. */
  echo: SessionEcho | null;
  phase: EchoTeacherPhase;
  stage: EchoStage;
  setStage: (patch: Partial<EchoStage>) => void;
  settings: EchoClassSettings;
  updateSettings: (patch: Partial<EchoClassSettings>) => void;
  start: () => void;
  nextRound: () => void;
  again: () => void;
  pause: () => void;
  play: () => void;
  /** A new fight with the Boss, once one is decided. */
  fightAgain: () => void;
  grid: EchoGridRow[];
  /** The grid's columns: the rounds played, oldest first. */
  runs: number[];
  /** The last round's result, if it's counted. */
  classResult: EchoClassResult | null;
  /** The notes of the last round the class missed most. */
  missed: MissedNote[];
  joined: number;
  rosterCount: number;
  /** Rounds finished in the section under way, and how many it plays. */
  roundInSection: number;
  sectionRounds: number;
  /** When the round under way ends, on the server's clock (ms). */
  endsAt: number | null;
}

const isJoinedState = (state: PresenceStateValue | undefined) =>
  state === 'joined' || state === 'active' || state === 'idle';

export function useEchoClassTeacher({
  sessionId,
  classroomId,
  slideId,
  interactionId,
  config,
  echo: published,
  responses,
  roster,
  presence,
  serverNow,
  sendEcho,
}: UseEchoClassTeacherInput): UseEchoClassTeacher {
  const echo = published?.slideId === slideId ? published : null;
  const [settings, saveSettings] = useEchoClassSettings(
    classroomId,
    config.settings,
  );
  const key = memoryKey(sessionId, slideId);
  const [memory, setMemoryState] = useState<TeacherMemory>(() =>
    readMemory(key),
  );
  const memoryRef = useRef(memory);
  memoryRef.current = memory;
  const setMemory = useCallback(
    (update: (m: TeacherMemory) => TeacherMemory) => {
      const next = update(memoryRef.current);
      memoryRef.current = next;
      writeMemory(key, next);
      setMemoryState(next);
    },
    [key],
  );

  const initialStage = useMemo<EchoStage>(
    () => ({
      section: echo?.section ?? 'melodyEcho',
      level: echo?.level ?? config.level,
      key: echo?.key ?? config.key,
      tempo: echo?.tempo ?? classStartTempo(config.level, config.tempo),
    }),
    // The first stage only; the strip moves it after.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const stage = memory.stage ?? initialStage;

  // ── Who's here, and what they've played ──
  const payloads = useMemo(() => {
    const out: Record<string, EchoResponsePayload | null> = {};
    for (const [enrollmentId, bag] of Object.entries(responses)) {
      const payload = echoPayloadOf(bag[interactionId], slideId);
      if (payload) out[enrollmentId] = payload;
    }
    return out;
  }, [responses, interactionId, slideId]);
  const hasPresence = !!presence && Object.keys(presence).length > 0;
  const isJoined = useCallback(
    (enrollmentId: string) =>
      hasPresence
        ? isJoinedState(presence?.[enrollmentId])
        : // A practice session has no presence: a student who has played is here.
          !!payloads[enrollmentId],
    [hasPresence, presence, payloads],
  );
  const joined = useMemo(() => {
    const ids = new Set<string>();
    for (const r of roster)
      if (isJoined(r.enrollmentId)) ids.add(r.enrollmentId);
    for (const id of Object.keys(payloads)) ids.add(id);
    return ids.size;
  }, [roster, isJoined, payloads]);

  const runs = useMemo(() => {
    const finished = memory.runs
      .filter((r) => r.finished && !r.aborted)
      .map((r) => r.run);
    if (echo?.classResult && !finished.includes(echo.classResult.run)) {
      finished.push(echo.classResult.run);
    }
    return [...new Set(finished)].sort((a, b) => a - b);
  }, [memory.runs, echo?.classResult]);
  const grid = useMemo(
    () => echoGrid({ roster, runs, payloads, isJoined }),
    [roster, runs, payloads, isJoined],
  );

  // Everything the callbacks read, at its latest.
  const latest = useRef({
    echo,
    settings,
    stage,
    payloads,
    joined,
    grid,
    serverNow,
    sendEcho,
  });
  latest.current = {
    echo,
    settings,
    stage,
    payloads,
    joined,
    grid,
    serverNow,
    sendEcho,
  };

  const seed = echoClassSeed(sessionId, slideId);

  /** The round's state, as everyone gets it. */
  const publish = useCallback(
    (round: Omit<SessionEcho, 'slideId' | 'leader' | 'settings'>) => {
      const now = latest.current;
      // Names go out only as the settings say, and always fresh.
      const { names: _stale, ...next } = round as SessionEcho;
      void _stale;
      now.sendEcho({
        ...next,
        slideId,
        leader: 'atlas',
        settings: now.settings,
        ...(now.settings.projector !== 'class'
          ? { names: projectorNames(now.grid, now.settings.projector) }
          : {}),
      });
    },
    [slideId],
  );

  /** A round of this call: a new run, starting two seconds from now. */
  const playCall = useCallback(
    (
      call: EchoCall,
      at: { section: EchoClassSection; bossAt?: number; fresh?: boolean },
    ) => {
      const now = latest.current;
      const run = (now.echo?.run ?? 0) + 1;
      const current = now.echo;
      // A round cut short by this one is no column of the grid.
      setMemory((m) => ({
        ...m,
        runs: [
          ...m.runs.map((r) =>
            current && r.run === current.run && !r.finished
              ? { ...r, aborted: true }
              : r,
          ),
          {
            run,
            section: at.section,
            ...(call.kind === 'melody' ? { contourId: call.contour.id } : {}),
          },
        ],
      }));
      publish({
        run,
        section: at.section,
        level: call.level,
        key: { tonic: call.key.tonic, mode: call.key.mode },
        tempo: call.tempo,
        startsAt: now.serverNow() + CLASS_ROUND_LEAD_MS,
        call: toEchoCallWire(call),
        paused: false,
        ...(at.bossAt !== undefined ? { bossAt: at.bossAt } : {}),
        // The last result stays for the Boss's health; a new fight starts clean.
        ...(current?.classResult && !at.fresh
          ? { classResult: current.classResult }
          : {}),
      });
    },
    [publish, setMemory],
  );

  /** The next call, as staged: a new one from Atlas. */
  const nextRound = useCallback(
    (options: { newFight?: boolean } = {}) => {
      const now = latest.current;
      const { section, level, key: k, tempo } = now.stage;
      const m = memoryRef.current;
      const sectionChanged = now.echo?.section !== section || !now.echo?.call;
      // Its rounds all played, the section starts a fresh set.
      const doneBefore =
        !!now.echo &&
        now.echo.section !== 'boss' &&
        m.roundInSection >= classSectionRounds(now.echo.section);
      const fightOver =
        bossOutcome(bossTally(m.verdicts)) !== 'fighting' ||
        m.verdicts.length >= 4;
      const newFight =
        section === 'boss' && (options.newFight || sectionChanged || fightOver);
      const fight = newFight ? m.fight + 1 : m.fight;
      const bossAt =
        section === 'boss' ? (newFight ? 0 : m.verdicts.length) : undefined;
      setMemory((mm) => ({
        ...mm,
        fight,
        verdicts: newFight ? [] : mm.verdicts,
        roundInSection:
          sectionChanged || newFight || doneBefore ? 0 : mm.roundInSection,
      }));
      const exclude = m.runs
        .filter((r) => r.contourId)
        .slice(-3)
        .map((r) => r.contourId!);
      const run = (now.echo?.run ?? 0) + 1;
      const call = classRoundCall({
        seed,
        run,
        section,
        level,
        key: k,
        tempo,
        fight,
        bossAt,
        exclude,
      });
      playCall(call, { section, bossAt, fresh: newFight });
    },
    [seed, playCall, setMemory],
  );

  /** The same call once more. */
  const again = useCallback(() => {
    const now = latest.current;
    const call = fromEchoCallWire(now.echo?.call);
    if (!call || !now.echo) {
      nextRound();
      return;
    }
    if (now.echo.section === 'boss' && now.echo.bossAt !== undefined) {
      // Its verdict is the replay's: taken off until it's counted again.
      const at = now.echo.bossAt;
      setMemory((m) => ({
        ...m,
        verdicts: m.verdicts.slice(0, at),
      }));
    }
    playCall(call, { section: now.echo.section, bossAt: now.echo.bossAt });
  }, [nextRound, playCall, setMemory]);

  const pause = useCallback(() => {
    const now = latest.current;
    if (!now.echo || now.echo.paused) return;
    publish({ ...now.echo, paused: true });
  }, [publish]);

  const endOf = (e: SessionEcho | null): number | null => {
    const call = fromEchoCallWire(e?.call);
    return call && e ? e.startsAt + classRoundLengthMs(call, e.tempo) : null;
  };

  const play = useCallback(() => {
    const now = latest.current;
    if (!now.echo) return;
    const counted = now.echo.classResult?.run === now.echo.run;
    if (counted) {
      nextRound();
    } else {
      // Stopped part way: the call again, from its count-in.
      again();
    }
  }, [nextRound, again]);

  // ── The lobby: before the first round, every device knows the setup ──
  const lobbyFor = useRef<string | null>(null);
  useEffect(() => {
    if (echo || lobbyFor.current === slideId) return;
    lobbyFor.current = slideId;
    publish({
      run: 0,
      section: stage.section,
      level: stage.level,
      key: stage.key,
      tempo: stage.tempo,
      startsAt: 0,
      call: null,
      paused: false,
    });
  }, [echo, slideId, stage, publish]);

  // ── A round under way: counted when it's over ──
  const run = echo?.run ?? 0;
  const counted = !!echo && echo.classResult?.run === run;
  const endsAt = endOf(echo);
  useEffect(() => {
    if (!echo || !echo.call || echo.paused || counted || endsAt === null) {
      return;
    }
    const finish = () => {
      const now = latest.current;
      const e = now.echo;
      if (!e || e.run !== run || e.paused) return;
      const result = classResultOf(
        run,
        Object.values(now.payloads),
        now.joined,
      );
      let boss = undefined as EchoClassResult['boss'];
      if (e.section === 'boss' && e.bossAt !== undefined) {
        const verdicts = [...memoryRef.current.verdicts];
        verdicts[e.bossAt] = classHit(result);
        boss = bossTally(verdicts);
        setMemory((m) => ({ ...m, verdicts }));
      }
      setMemory((m) => ({
        ...m,
        roundInSection: m.roundInSection + 1,
        runs: m.runs.map((r) => (r.run === run ? { ...r, finished: true } : r)),
      }));
      publish({ ...e, classResult: { ...result, ...(boss ? { boss } : {}) } });
    };
    const wait = endsAt + RESULT_GRACE_MS - latest.current.serverNow();
    const timer = setTimeout(finish, Math.max(0, wait));
    return () => clearTimeout(timer);
    // One timer per round: its run, its start, paused or not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, echo?.startsAt, echo?.paused, counted, endsAt]);

  // ── Answers that come late: the counts again ──
  useEffect(() => {
    if (!echo || !counted || !echo.classResult) return;
    const was = echo.classResult;
    const now = classResultOf(run, Object.values(payloads), joined);
    if (now.good === was.good && now.answered === was.answered) return;
    publish({
      ...echo,
      classResult: { ...now, ...(was.boss ? { boss: was.boss } : {}) },
    });
  }, [echo, counted, run, payloads, joined, publish]);

  // ── The result shown: the next round, unless it's time to stop ──
  const tally = echo?.classResult?.boss;
  const outcome = echo?.section === 'boss' ? bossOutcome(tally) : 'fighting';
  const sectionRounds = classSectionRounds(
    echo?.call ? echo.section : stage.section,
  );
  const sectionDone =
    !!echo &&
    echo.section !== 'boss' &&
    memory.roundInSection >= classSectionRounds(echo.section);
  const moveOn =
    counted && !echo?.paused && outcome === 'fighting' && !sectionDone;
  useEffect(() => {
    if (!moveOn || endsAt === null) return;
    const wait =
      endsAt + RESULT_GRACE_MS + RESULT_HOLD_MS - latest.current.serverNow();
    const timer = setTimeout(() => nextRound(), Math.max(0, wait));
    return () => clearTimeout(timer);
    // Once per counted round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveOn, run]);

  // ── The strip's staging ──
  const setStage = useCallback(
    (patch: Partial<EchoStage>) => {
      setMemory((m) => {
        const from = m.stage ?? latest.current.stage;
        const next = { ...from, ...patch };
        if (patch.level !== undefined && patch.tempo === undefined) {
          next.tempo = echoLevel(patch.level).tempo;
        }
        const range = echoTempoRange(next.level);
        next.tempo = Math.min(range.high, Math.max(range.low, next.tempo));
        return { ...m, stage: next };
      });
    },
    [setMemory],
  );

  // Before the first round, a new setup goes out at once (the students'
  // pads follow the key); and settings, whenever they change.
  const updateSettings = useCallback(
    (patch: Partial<EchoClassSettings>) => saveSettings(patch),
    [saveSettings],
  );
  const settingsKey = JSON.stringify(settings);
  const stageKey = JSON.stringify(stage);
  const sent = useRef({ settingsKey, stageKey });
  useEffect(() => {
    const was = sent.current;
    sent.current = { settingsKey, stageKey };
    const e = latest.current.echo;
    if (!e) return;
    const settingsChanged = was.settingsKey !== settingsKey;
    const setupChanged = was.stageKey !== stageKey && e.run === 0;
    if (!settingsChanged && !setupChanged) return;
    if (e.run === 0) {
      publish({
        ...e,
        section: stage.section,
        level: stage.level,
        key: stage.key,
        tempo: stage.tempo,
      });
    } else {
      publish(e);
    }
    // Republished only when the settings or (before the first round) the setup change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsKey, stageKey]);

  // First names on the projector, when allowed: sent again as the grid fills.
  const namesKey =
    settings.projector === 'class'
      ? ''
      : JSON.stringify(projectorNames(grid, settings.projector) ?? null);
  useEffect(() => {
    if (!echo || !namesKey) return;
    if (JSON.stringify(echo.names ?? null) === namesKey) return;
    publish(echo);
    // Only when the names to show change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namesKey]);

  const phase: EchoTeacherPhase =
    !echo || !echo.call
      ? 'idle'
      : echo.paused
        ? 'paused'
        : outcome === 'won'
          ? 'won'
          : outcome === 'lost'
            ? 'lost'
            : counted
              ? sectionDone
                ? 'done'
                : 'result'
              : 'playing';

  return {
    echo,
    phase,
    stage,
    setStage,
    settings,
    updateSettings,
    start: () => nextRound(),
    nextRound: () => nextRound(),
    again,
    pause,
    play,
    fightAgain: () => nextRound({ newFight: true }),
    grid,
    runs,
    classResult: counted ? (echo?.classResult ?? null) : null,
    missed: counted ? missedMost(run, Object.values(payloads)) : [],
    joined,
    rosterCount: roster.length,
    roundInSection: memory.roundInSection,
    sectionRounds,
    endsAt,
  };
}
