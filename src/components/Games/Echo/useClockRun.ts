import { useEffect, useMemo, useState } from 'react';
import { secondsPerTick } from '@/curriculum/engine/musicLiteracy/literacy';
import {
  applyCue,
  IDLE_RUN_VIEW,
  type RunCue,
  type RunView,
} from '@/curriculum/engine/musicLiteracy/run';
import { echoRunCues, type RunCall } from './echoRunCues';

// ── A run drawn from the clock, silent ─────────────────────────────────────
// The projector and the teacher's screen in a connected class show the
// round as the students hear it, without playing it: the circle, the hub's
// cues (Get Ready, Listen, the count-off, Your Turn) and the call's degrees
// lighting, read off the clock rather than the audio transport. So they
// need no sound, no tap to start audio, and they can sit on the same page
// as a student's own run (the dev class page).
//
// The view at a moment is every cue of the run up to it, folded as the
// transport's runner folds them (run.ts `applyCue`): the same cues as a
// student's run (echoRunCues.ts), with no groove.

/** The run's view once every cue up to `tick` has happened. */
export function runViewAt(cues: readonly RunCue[], tick: number): RunView {
  let view = IDLE_RUN_VIEW;
  for (const cue of cues) {
    if (cue.tick > tick) break;
    view = applyCue(view, cue, 0);
  }
  return view;
}

export interface ClockRun {
  calls: readonly RunCall[];
  /** When the count-in begins, in Date.now() ms on this device. */
  startsAt: number;
}

export interface ClockRunState {
  view: RunView;
  /** Between the count-in's first beat and the end. */
  running: boolean;
  /** Its end has gone by. */
  ended: boolean;
}

const IDLE: ClockRunState = {
  view: IDLE_RUN_VIEW,
  running: false,
  ended: false,
};

/** How often the view is read off the clock (ms): smooth enough for a hub. */
const FRAME_MS = 40;

/**
 * A run's view, read off the clock as it goes (above). Null: no run, the
 * idle view.
 */
export function useClockRun(run: ClockRun | null): ClockRunState {
  const cues = useMemo(
    () =>
      run && run.calls.length
        ? echoRunCues(run.calls, { metronome: true })
        : null,
    [run],
  );
  const [state, setState] = useState<ClockRunState>(IDLE);

  useEffect(() => {
    if (!run || !cues) {
      setState(IDLE);
      return;
    }
    const tempo = run.calls[0].timeline.tempo;
    const spt = secondsPerTick(tempo);
    const end = cues[cues.length - 1]?.tick ?? 0;
    let last = -2;
    const read = () => {
      const tick = (Date.now() - run.startsAt) / 1000 / spt;
      if (tick < 0) {
        if (last !== -1) setState(IDLE);
        last = -1;
        return;
      }
      if (tick >= end) {
        setState({
          view: { ...runViewAt(cues, end), hub: null, lit: [] },
          running: false,
          ended: true,
        });
        window.clearInterval(timer);
        return;
      }
      const view = runViewAt(cues, tick);
      if (view.tick === last) return;
      last = view.tick;
      setState({ view, running: true, ended: false });
    };
    const timer = window.setInterval(read, FRAME_MS);
    read();
    return () => window.clearInterval(timer);
  }, [run, cues]);

  return state;
}
