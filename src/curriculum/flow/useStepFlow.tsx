import { useReducedMotion } from 'framer-motion';
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  Primary,
  type Zones,
} from '@/curriculum/guitar/layout/GuitarActionBar';
import { TempoStepper } from '@/curriculum/guitar/layout/TempoStepper';
import type { RunModel, TempoModel } from '@/curriculum/guitar/layout/types';
import { useLearnTourStore } from '@/features/learnTour/learnTourStore';
import { useLearnXp } from '@/hooks/data/experience/useLearnXp';
import { usePracticeSettings } from '@/learn/audio/usePracticeSettings';
import { subscribeXpGains, type LearnXpAction } from '@/lib/experience/learnXp';
import {
  flowReducer,
  initialFlow,
  passHoldMs,
  stageOf,
  transitionOf,
  type FlowStage,
  type FlowStatus,
} from './stepFlow';

// ── Running an activity by itself ──────────────────────────────────────────
// Drives what every engine already hands its layout: the run model's Demo, Practice
// and Perform. It only decides when to press them. Engines keep their sound, input
// and scoring, and stop whatever's playing as each of those starts.

/** So that arrowing through steps doesn't set off every demo on the way. */
const ARM_MS = 400;
export const TRANSITION_MS = 1400;
const TRANSITION_REDUCED_MS = 600;
/** A demo that hasn't started by now isn't going to (a step with no notes). */
const DEMO_START_MS = 8000;

/** What a pass says, and where it goes. */
export interface PassPlan {
  /** The step's own Next; null while there's nowhere to go. */
  advance: (() => void) | null;
  /** The name of what's next. */
  nextLabel?: string | null;
  /** "92%". */
  score?: string | null;
  /** The line the step has for a pass. */
  detail?: string | null;
}

export interface StepFlow {
  /** Off in browsers that can't say if sound's allowed, and by the setting. */
  available: boolean;
  status: FlowStatus;
  /** The stage to mark on the rail, whether it's running itself or not. */
  stage: FlowStage | null;
  /** The change of stage on show. */
  transition: FlowStage | null;
  /** Practice heard nothing, so it's waiting rather than moving on. */
  held: boolean;
  /** A sheet is open or the tab's hidden: nothing's moving on by itself. */
  blocked: boolean;
  /** What a pass on show says, and the XP the server has granted for it so far. */
  pass: (Omit<PassPlan, 'advance'> & { earned: number; holdMs: number }) | null;
  /** On to the next step now, rather than when the pass has had its time. */
  passNext: () => void;
  /** Stay on the step that passed: the student's driving again. */
  passStay: () => void;
  /** Sound can't start until there's been a click: Demo begins the run. */
  needsStart: boolean;
  /** The run model to hand the bar: pressing anything takes over. */
  run: RunModel;
  skip: () => void;
  takeOver: () => void;
  /** Try again: straight back to Perform. */
  performAgain: () => void;
  /** The bar's buttons while the flow's in charge; null to leave them be. */
  zones: (tempo?: TempoModel | null) => Zones | null;
}

/** Whether a click has happened, so that sound may start; null if it can't tell. */
function soundAllowed(): boolean | null {
  const activation = (
    navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }
  ).userActivation;
  return activation ? activation.hasBeenActive : null;
}

export function useStepFlow({
  stepKey,
  run,
  paused = false,
  takeEnded = false,
  demoOnly = false,
  autoStart = true,
  xpScope,
  pass: passPlan,
}: {
  /** What's being played; null when there's nothing to run. */
  stepKey: string | null;
  run: RunModel;
  /** A sheet or dialog is open: nothing new starts. */
  paused?: boolean;
  /** The take has been scored. */
  takeEnded?: boolean;
  demoOnly?: boolean;
  /** False for a step that waits to be started: it still earns, and moves on. */
  autoStart?: boolean;
  /** Which lesson and key this is, so that each step's XP counts once a day. */
  xpScope?: string;
  /** Set, a passed take shows what it earned and then moves on by itself. */
  pass?: PassPlan;
}): StepFlow {
  const { autoFlow } = usePracticeSettings();
  const touring = useLearnTourStore((s) => !!s.tour);
  const reduced = useReducedMotion() ?? false;
  const [state, dispatch] = useReducer(flowReducer, initialFlow);
  const [hidden, setHidden] = useState(() => document.hidden);
  const [needsStart, setNeedsStart] = useState(false);
  const available = soundAllowed() !== null && autoFlow && !touring;
  const blocked = paused || hidden;

  const runRef = useRef(run);
  runRef.current = run;
  const passRef = useRef(passPlan);
  passRef.current = passPlan;
  const availableRef = useRef(available);
  availableRef.current = available;
  const [earned, setEarned] = useState(0);
  /** Gains count towards the pass on show, from the moment it's passed. */
  const countingGains = useRef(false);
  const awardXp = useLearnXp();
  const xpFor = useRef<(action: LearnXpAction) => void>(() => {});
  xpFor.current = (action) => {
    if (xpScope && stepKey) void awardXp(action, `${xpScope}:${stepKey}`);
  };

  useEffect(() => {
    const onChange = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  // A new step: wait a moment, then start, if a click has made sound possible.
  useEffect(() => {
    const auto = available && stepKey !== null && autoStart;
    const allowed = soundAllowed() === true;
    setNeedsStart(auto && !allowed);
    dispatch({ type: 'arm', auto: auto && allowed, demoOnly });
  }, [autoStart, available, demoOnly, stepKey]);

  useEffect(() => {
    if (state.status !== 'armed' || blocked) return undefined;
    const timer = setTimeout(() => dispatch({ type: 'armElapsed' }), ARM_MS);
    return () => clearTimeout(timer);
  }, [blocked, state.status, stepKey]);

  // Each stage presses its own button, once, as it begins.
  const { status } = state;
  useEffect(() => {
    if (status === 'demo') runRef.current.demo.play();
    if (status === 'practice') runRef.current.practise();
    if (status === 'perform') runRef.current.playNow();
  }, [status]);

  // A dialog that was in the way of starting (guitar setup) has gone: try again.
  const wasBlocked = useRef(blocked);
  useEffect(() => {
    const was = wasBlocked.current;
    wasBlocked.current = blocked;
    if (!was || blocked || run.state !== 'preview') return;
    if (status === 'practice') runRef.current.practise();
    if (status === 'perform') runRef.current.playNow();
  }, [blocked, run.state, status]);

  // The demo's over.
  const demoStarted = useRef(false);
  const demoPlaying = run.demo.playing;
  useEffect(() => {
    if (status !== 'demo') {
      demoStarted.current = false;
      return undefined;
    }
    if (demoPlaying) {
      demoStarted.current = true;
      return undefined;
    }
    if (demoStarted.current) {
      dispatch({ type: 'demoEnded' });
      return undefined;
    }
    const timer = setTimeout(
      () => dispatch({ type: 'demoEnded' }),
      DEMO_START_MS,
    );
    return () => clearTimeout(timer);
  }, [demoPlaying, status]);

  // Heard to its end, whoever started it. Stopping or skipping it doesn't count.
  const demoCut = useRef(false);
  const demoWasPlaying = useRef(false);
  useEffect(() => {
    const ended = demoWasPlaying.current && !demoPlaying;
    demoWasPlaying.current = demoPlaying;
    if (demoPlaying) demoCut.current = false;
    if (ended && !demoCut.current) xpFor.current('demo');
  }, [demoPlaying]);

  // A change of stage plays out, then moves on.
  useEffect(() => {
    if (!transitionOf(status) || blocked) return undefined;
    const timer = setTimeout(
      () => dispatch({ type: 'transitionDone' }),
      reduced ? TRANSITION_REDUCED_MS : TRANSITION_MS,
    );
    return () => clearTimeout(timer);
  }, [blocked, reduced, status]);

  // A practice has ended. This also counts one the student drove themselves.
  const lastPracticeId = run.lastPractice?.id ?? null;
  const seenPractice = useRef(lastPracticeId);
  useEffect(() => {
    if (lastPracticeId === seenPractice.current) return;
    seenPractice.current = lastPracticeId;
    const heard = runRef.current.lastPractice?.heard ?? false;
    if (heard) xpFor.current('practice');
    dispatch({ type: 'practiceEnded', heard });
  }, [lastPracticeId]);

  // A take has been scored: a little for playing it, more for passing.
  const lastTakeId = run.lastTake?.id ?? null;
  const seenTake = useRef(lastTakeId);
  useEffect(() => {
    if (lastTakeId === seenTake.current) return;
    seenTake.current = lastTakeId;
    const take = runRef.current.lastTake;
    if (take?.passed && availableRef.current && passRef.current?.advance) {
      countingGains.current = true;
      setEarned(0);
      dispatch({ type: 'takePassed' });
    }
    if (take?.heard) xpFor.current('perform');
    if (take?.passed) xpFor.current('pass');
  }, [lastTakeId]);

  // The take's been scored. Only once it's really been running: the last take's
  // result can still be up as this one starts.
  const performing = run.state === 'performance';
  const performStarted = useRef(false);
  useEffect(() => {
    if (status !== 'perform') {
      performStarted.current = false;
      return;
    }
    if (performing) performStarted.current = true;
    if (performStarted.current && takeEnded) {
      dispatch({ type: 'performEnded' });
    }
  }, [performing, status, takeEnded]);

  useEffect(
    () =>
      subscribeXpGains((gain) => {
        if (countingGains.current) setEarned((total) => total + gain);
      }),
    [],
  );

  const passNext = useCallback(() => {
    countingGains.current = false;
    dispatch({ type: 'passOver' });
    passRef.current?.advance?.();
  }, []);

  // A pass has its moment, then moves on.
  useEffect(() => {
    if (status !== 'passed' || blocked) return undefined;
    const timer = setTimeout(passNext, passHoldMs(passRef.current?.detail));
    return () => clearTimeout(timer);
  }, [blocked, passNext, status]);

  // Something was started by another way, from a practice that heard nothing.
  useEffect(() => {
    if (status === 'held' && run.state !== 'preview') {
      dispatch({ type: 'takeOver' });
    }
  }, [run.state, status]);

  const takeOver = useCallback(() => {
    setNeedsStart(false);
    dispatch({ type: 'takeOver' });
  }, []);
  const passStay = useCallback(() => {
    countingGains.current = false;
    takeOver();
  }, [takeOver]);
  const skip = useCallback(() => {
    // The demo's still going: Practice stops it, and so does this if it's first.
    if (status === 'demo' || status === 'armed') {
      demoCut.current = true;
      runRef.current.demo.stop();
    }
    dispatch({ type: 'skip' });
  }, [status]);
  const performAgain = useCallback(() => {
    if (available) dispatch({ type: 'performAgain' });
  }, [available]);

  const held = status === 'held';
  const wrapped = useMemo<RunModel>(
    () =>
      !available
        ? run
        : {
            ...run,
            demo: {
              ...run.demo,
              play: () => {
                // The click sound has been waiting for: from here it runs itself.
                if (needsStart) {
                  setNeedsStart(false);
                  dispatch({ type: 'start' });
                  return;
                }
                takeOver();
                run.demo.play();
              },
              stop: () => {
                demoCut.current = true;
                takeOver();
                run.demo.stop();
              },
            },
            practise: () => {
              if (held) {
                dispatch({ type: 'practiceAgain' });
                return;
              }
              takeOver();
              run.practise();
            },
            playNow: () => {
              takeOver();
              run.playNow();
            },
            back: () => {
              takeOver();
              run.back();
            },
            stopTake: () => {
              takeOver();
              run.stopTake();
            },
          },
    [available, held, needsStart, run, takeOver],
  );

  const running = stageOf(status);
  const stage: FlowStage | null =
    running ??
    (run.demo.playing
      ? 'demo'
      : run.state === 'practice' || run.restartingPass
        ? 'practice'
        : run.state === 'performance' || run.state === 'complete'
          ? 'perform'
          : null);

  const zones = useCallback(
    (tempo?: TempoModel | null): Zones | null =>
      status === 'demo' || status === 'armed'
        ? {
            lead: null,
            meta: tempo ? (
              <TempoStepper
                bpm={tempo.bpm}
                effectiveBpm={tempo.effectiveBpm}
                onChange={tempo.onChange}
              />
            ) : null,
            actions: <Primary onClick={skip}>Skip to Practice</Primary>,
          }
        : null,
    [skip, status],
  );

  return {
    available,
    status,
    stage,
    transition: available ? transitionOf(status) : null,
    held,
    blocked,
    pass:
      status === 'passed'
        ? {
            nextLabel: passPlan?.nextLabel,
            score: passPlan?.score,
            detail: passPlan?.detail,
            earned,
            holdMs: passHoldMs(passPlan?.detail),
          }
        : null,
    passNext,
    passStay,
    needsStart,
    run: wrapped,
    skip,
    takeOver,
    performAgain,
    zones,
  };
}
