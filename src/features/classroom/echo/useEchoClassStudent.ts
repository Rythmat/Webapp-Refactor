import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EchoOutcome } from '@/components/Games/Echo/echoFlow';
import { gradeRunCall } from '@/components/Games/Echo/echoOutcome';
import { placeCall, type RunCall } from '@/components/Games/Echo/echoRunCues';
import { useEchoRun } from '@/components/Games/Echo/useEchoRun';
import {
  echoTimeline,
  fromEchoCallWire,
  gradeQuantizedEcho,
  type QuantizedEcho,
} from '@/curriculum/engine/echo';
import { toLocalTime } from '../live/serverClock';
import { LATE_START_MS, askedTiming, streakOf, withRound } from './classRound';
import type {
  EchoClassSettings,
  EchoResponsePayload,
  EchoRoundResult,
  SessionEcho,
} from './types';

// ── A student's device in a class's Echo ───────────────────────────────────
// Follows the round the teacher's computer publishes (`SessionState.echo`)
// and plays it here, in the student's headphones: the count-in, Atlas's
// call, the count-off, the groove and the student's own notes, on this
// device's audio clock, so its grading is exact (docs/echo-classroom.md,
// Timing).
//
//   the start    each round's count-in is set on the server's clock; the
//                clock check's offset turns it into this device's, and the
//                run is scheduled for then (useEchoRun's `at`). A round
//                that arrives too late to start with the class
//                (LATE_START_MS) is sat out: "Join in on the next round."
//   the grade    the class's way, quantized (engine/echo/classGrading.ts),
//                or, with grading off, every echo with notes in it counts
//   the result   posted as the student's cumulative `echo` response after
//                each round: every round so far and the best streak
//   paused       the teacher's Pause stops the music here too
//
// The audio needs a tap first (iPad Safari won't play without one), so
// nothing runs until the student taps Join In (`ready`).

/** Where the student's device is in the class's Echo. */
export type EchoStudentStatus =
  | 'waiting'
  | 'tapToJoin'
  | 'getReady'
  | 'playing'
  | 'result'
  | 'paused'
  | 'sittingOut';

export interface UseEchoClassStudentInput {
  /** The class's round, this slide's (null: none yet). */
  echo: SessionEcho | null;
  slideId: string;
  /** The server's clock less this device's (ms): the clock check's. */
  offsetMs: number;
  /** The student's echoes so far, as last sent. */
  submitted: EchoResponsePayload | null;
  onSubmit: (payload: EchoResponsePayload) => void;
  /** Audio unlocked: runs may start. */
  ready: boolean;
  settings: EchoClassSettings;
}

export interface EchoStudentOutcome extends EchoOutcome {
  run: number;
}

export function useEchoClassStudent({
  echo,
  slideId,
  offsetMs,
  submitted,
  onSubmit,
  ready,
  settings,
}: UseEchoClassStudentInput) {
  const run = echo?.run ?? 0;
  const startsAt = echo?.startsAt ?? 0;
  // One call a round: read off the wire once per round.
  const call = useMemo(
    () => fromEchoCallWire(echo?.call),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run, startsAt],
  );
  const calls = useMemo<RunCall[]>(
    () =>
      call && echo
        ? [placeCall(call, echoTimeline(call, { tempo: echo.tempo }))]
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [call],
  );

  const [outcome, setOutcome] = useState<EchoStudentOutcome | null>(null);
  const [satOut, setSatOut] = useState<number | null>(null);
  const sent = useRef<EchoResponsePayload | null>(submitted);
  if (
    submitted &&
    (!sent.current || submitted.rounds.length > sent.current.rounds.length)
  ) {
    sent.current = submitted;
  }
  const latest = useRef({ settings, onSubmit, slideId, run });
  latest.current = { settings, onSubmit, slideId, run };
  const graded = useRef<QuantizedEcho | null>(null);

  const grade = useCallback(
    (placed: RunCall, played: Parameters<typeof gradeRunCall>[1]) => {
      const quantized = gradeQuantizedEcho(placed.call, played, {
        timeline: placed.timeline,
      });
      graded.current = quantized;
      const shown = gradeRunCall(placed, played);
      const counts =
        latest.current.settings.grading === 'off'
          ? quantized.playedAny
          : quantized.passed;
      return {
        ...shown,
        played: quantized.playedAny ? shown.played : [],
        passed: counts,
        percent: quantized.percent,
      };
    },
    [],
  );

  const echoRun = useEchoRun({
    grade,
    onGraded: (_index, result) => {
      const { slideId: slide, run: now } = latest.current;
      const quantized = graded.current;
      const tempo = calls[0]?.timeline.tempo ?? 90;
      const round: EchoRoundResult = {
        run: now,
        passed: result.passed,
        score: result.percent,
        asked: result.asked,
        played: result.played,
        ...(quantized && calls[0]
          ? { timing: askedTiming(calls[0].call, quantized.offsets, tempo) }
          : {}),
      };
      const payload = withRound(sent.current, slide, round);
      sent.current = payload;
      latest.current.onSubmit(payload);
      setOutcome({ ...result, run: now });
    },
  });
  const { start, stop } = echoRun;

  // ── Each round, started with the class ──
  const startedFor = useRef<string | null>(null);
  const paused = echo?.paused ?? false;
  useEffect(() => {
    if (!echo || !calls.length || paused || !ready) return;
    const id = `${run}:${startsAt}`;
    if (startedFor.current === id) return;
    startedFor.current = id;
    const at = toLocalTime(startsAt, offsetMs);
    if (Date.now() - at > LATE_START_MS) {
      setSatOut(run);
      return;
    }
    setOutcome(null);
    start({ id: run, calls, groove: true, at });
    // Each round once: its run and start; paused rounds start again on Play.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, startsAt, calls, paused, ready]);

  // Paused, or the round gone: the music stops here.
  useEffect(() => {
    if (paused) {
      stop();
      startedFor.current = null;
    }
  }, [paused, stop]);
  useEffect(() => () => stop(), [stop]);

  const rounds = sent.current?.rounds ?? [];
  const status: EchoStudentStatus =
    !echo || !echo.call
      ? 'waiting'
      : paused
        ? 'paused'
        : !ready
          ? 'tapToJoin'
          : satOut === run
            ? 'sittingOut'
            : echoRun.live && echoRun.id === run
              ? 'playing'
              : outcome?.run === run
                ? 'result'
                : startedFor.current === `${run}:${startsAt}`
                  ? 'getReady'
                  : 'waiting';

  return {
    status,
    calls,
    run: echoRun,
    outcome: outcome?.run === run ? outcome : null,
    streak: streakOf(rounds),
    bestStreak: sent.current?.bestStreak ?? 0,
    good: rounds.filter((r) => r.passed).length,
    rounds: rounds.length,
  };
}
