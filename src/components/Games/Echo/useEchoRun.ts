import { useCallback, useEffect, useRef, useState } from 'react';
import {
  awaitsTeacher,
  type EchoCall,
  type PlayedNote,
} from '@/curriculum/engine/echo';
import {
  applyCue,
  IDLE_RUN_VIEW,
  type RunCue,
  type RunView,
} from '@/curriculum/engine/musicLiteracy/run';
import { drumsForGroove } from '@/curriculum/musicLiteracy/literacyGrooves';
import {
  addLiteracyRunCues,
  literacyClock,
  startLiteracyRun,
  stopLiteracyRun,
} from '@/curriculum/musicLiteracy/literacyRun';
import { getDrumGrooveSettings } from '@/learn/audio/drumGrooveSettingsStore';
import type { EchoOutcome } from './echoFlow';
import { gradeRunCall } from './echoOutcome';
import {
  answerCues,
  echoRunCues,
  placeCall,
  wholeTimeline,
  type RunCall,
} from './echoRunCues';
import type { EchoNoteOff, EchoNoteOn } from './input';

// ── A run on the transport, and the student's notes in it ──────────────────
// One round, or the boss's calls back to back, played by Music Literacy's
// runner (literacyRun.ts) from Echo's cues (echoRunCues.ts). The student's
// notes, from the input layer, are stamped on the same clock
// (literacyClock.soundingTicks, at the event's own time) and each call's
// echo is graded as soon as its answer is over: a boss call while the next
// one starts, the last (or a round's one) when the run ends, once the final
// downbeat has rung.
//
// In class (Presenter mode) the game grades its own way (`grade`): an answer
// played here, quantized, and none at all is the teacher's to judge
// (`onUnanswered`). A teacher's call is played over its call bars: when
// they're over, `teach` makes it from the notes played, and the run takes
// it on for the count-off and the answer (`onTaught`; null: nothing heard).
//
// The drums are a Music Literacy groove: the one the student picked for
// lessons (Settings → Play along), or Pop 01. With them the click stops
// after the count-in, unless the student asked for it; without them it
// keeps time.

/** The groove under Echo when the student hasn't picked one for lessons. */
export const ECHO_GROOVE_ID = 'groove_pop_01';

export interface EchoRunHandlers {
  /** Call `index` of the run, graded: its answer is over. */
  onGraded: (index: number, outcome: EchoOutcome) => void;
  /** The run is over, every call graded. */
  onEnd?: () => void;
  /** How an echo is graded; null: nothing was answered. gradeRunCall's when left out. */
  grade?: (
    placed: RunCall,
    played: readonly PlayedNote[],
  ) => EchoOutcome | null;
  /** Call `index`'s answer came unplayed (`grade` said null). */
  onUnanswered?: (index: number) => void;
  /** A teacher's call, made from what was played over its call bars. */
  teach?: (placed: RunCall, played: readonly PlayedNote[]) => EchoCall | null;
  /** Call `index`, the teacher's, is played (null: nothing heard). */
  onTaught?: (index: number, call: EchoCall | null) => void;
}

export interface EchoRunStart {
  /** The run's id (EchoFlow.run): what its calls belong to. */
  id: number;
  calls: RunCall[];
  /** Play the drum groove under it. */
  groove: boolean;
}

interface LiveRun {
  calls: RunCall[];
  graded: number;
  over: boolean;
  /** The teacher's calls already made from what was played. */
  taught: Set<number>;
}

export function useEchoRun(handlers: EchoRunHandlers) {
  const latest = useRef(handlers);
  latest.current = handlers;
  const [view, setView] = useState<RunView>(IDLE_RUN_VIEW);
  /** The transport is under way: notes played now are stamped. */
  const [live, setLive] = useState(false);
  const [played, setPlayed] = useState<readonly PlayedNote[]>([]);
  /** The run's calls, kept after it ends (the result shows over them). */
  const [calls, setCalls] = useState<RunCall[] | null>(null);
  const [id, setId] = useState(-1);
  const runRef = useRef<LiveRun | null>(null);
  const liveRef = useRef(false);
  const playedRef = useRef<PlayedNote[]>([]);

  const stop = useCallback(() => {
    runRef.current = null;
    liveRef.current = false;
    stopLiteracyRun();
    setLive(false);
    setView((v) => ({ ...v, hub: null, lit: [] }));
  }, []);

  const grade = useCallback((run: LiveRun, upTo: number) => {
    while (run.graded <= upTo && runRef.current === run) {
      const index = run.graded;
      run.graded += 1;
      const { grade: gradeOf = gradeRunCall } = latest.current;
      const outcome = gradeOf(run.calls[index], playedRef.current);
      if (outcome) latest.current.onGraded(index, outcome);
      else latest.current.onUnanswered?.(index);
    }
  }, []);

  /** A teacher's call whose bars are over, made from what was played. */
  const teach = useCallback((run: LiveRun, tick: number) => {
    run.calls.forEach((placed, index) => {
      const { call, timeline } = placed;
      if (run.taught.has(index) || !awaitsTeacher(call)) return;
      if (tick < timeline.call.start + timeline.call.length) return;
      run.taught.add(index);
      const made = latest.current.teach?.(placed, playedRef.current) ?? null;
      if (made) {
        const next = placeCall(made, timeline);
        run.calls = run.calls.map((c, i) => (i === index ? next : c));
        setCalls(run.calls);
        addLiteracyRunCues(answerCues(next));
      }
      latest.current.onTaught?.(index, made);
    });
  }, []);

  const start = useCallback(
    ({ id: runId, calls: list, groove }: EchoRunStart) => {
      stop();
      const run: LiveRun = {
        calls: list,
        graded: 0,
        over: false,
        taught: new Set(),
      };
      runRef.current = run;
      playedRef.current = [];
      setPlayed([]);
      setCalls(list);
      setId(runId);
      setView(IDLE_RUN_VIEW);

      const whole = wholeTimeline(list);
      const last = list.length - 1;
      const onCue = (cue: RunCue) => {
        if (runRef.current !== run || run.over) return;
        setView((v) => applyCue(v, cue, 0));
        teach(run, cue.tick);
        if (runRef.current !== run) return;
        // A call's echo is graded once its answer is over; the run's last
        // when the run is.
        let due = run.graded - 1;
        while (due + 1 < last && cue.tick >= list[due + 1].timeline.total) {
          due += 1;
        }
        if (cue.kind === 'end') due = last;
        if (due >= run.graded) grade(run, due);
        if (cue.kind === 'end' && runRef.current === run) {
          run.over = true;
          runRef.current = null;
          liveRef.current = false;
          stopLiteracyRun();
          setLive(false);
          latest.current.onEnd?.();
        }
      };

      const begin = async () => {
        const settings = getDrumGrooveSettings();
        const from = whole.call.start;
        const drums = groove
          ? await drumsForGroove(
              settings.grooveId ?? ECHO_GROOVE_ID,
              (whole.total - from) / whole.barTicks,
            ).catch((error: unknown) => {
              console.warn('[Echo] the groove did not load', error);
              return null;
            })
          : null;
        if (runRef.current !== run) return false;
        return startLiteracyRun({
          cues: echoRunCues(list, {
            metronome: drums ? settings.click : true,
            groove: drums?.groove,
          }),
          tempo: whole.tempo,
          onCue,
          kit: drums?.kit,
        });
      };
      void begin().then(
        (started) => {
          if (!started || runRef.current !== run) return;
          liveRef.current = true;
          setLive(true);
        },
        (error: unknown) => {
          // No sound to run on (the piano didn't load): nothing to play.
          console.warn('[Echo] the run could not start', error);
          if (runRef.current === run) stop();
        },
      );
    },
    [grade, stop, teach],
  );

  // Leaving the game stops the music.
  useEffect(() => () => stopLiteracyRun(), []);

  const noteOn = useCallback(({ midi, perfMs }: EchoNoteOn) => {
    if (!runRef.current || !liveRef.current) return;
    const tick = literacyClock.soundingTicks(perfMs);
    if (tick === null) return;
    playedRef.current = [
      ...playedRef.current,
      { midi, onset: tick, duration: 0 },
    ];
    setPlayed(playedRef.current);
  }, []);

  const noteOff = useCallback(({ midi, perfMs }: EchoNoteOff) => {
    if (!runRef.current || !liveRef.current) return;
    const tick = literacyClock.soundingTicks(perfMs);
    if (tick === null) return;
    const list = playedRef.current;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].midi === midi && list[i].duration === 0) {
        const closed = [...list];
        closed[i] = { ...list[i], duration: Math.max(1, tick - list[i].onset) };
        playedRef.current = closed;
        setPlayed(closed);
        break;
      }
    }
  }, []);

  return { start, stop, id, view, live, played, calls, noteOn, noteOff };
}
