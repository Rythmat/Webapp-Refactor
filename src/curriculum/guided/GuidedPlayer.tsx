import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Play } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { OUTLINE_PILL, WHITE_PILL_LG } from '@/components/kit/pills';
import type { PathFigure } from '@/components/learn/path/types';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/components/utilities';
import { Rich } from '@/curriculum/audio/player/Rich';
import { FinishSequence } from '@/curriculum/audio/player/finish/FinishSequence';
import {
  initialPlayer,
  isSettled,
  playerReducer,
} from '@/curriculum/audio/player/playerMachine';
import { PassMoment } from '@/curriculum/flow/PassMoment';
import { StageRail } from '@/curriculum/flow/StageRail';
import { StageTransition } from '@/curriculum/flow/StageTransition';
import { XpRise } from '@/curriculum/flow/XpRise';
import { useStepFlow } from '@/curriculum/flow/useStepFlow';
import {
  KeyboardSlot,
  zonesFor,
  type GuitarActionBarProps,
} from '@/curriculum/guitar/layout/GuitarActionBar';
import type { GuitarStepStatus } from '@/curriculum/guitar/layout/types';
import { useLearnXp } from '@/hooks/data/experience/useLearnXp';
import { gradeNotePick } from './notePick';
import {
  ChoiceList,
  FeedbackBubble,
  LessonTopBar,
  SkillIntro,
  TakeawayCard,
  VerdictFrame,
  WhyDialog,
} from './shell/LessonShell';
import { NotePicker } from './shell/NotePicker';
import type { TakeReport } from './takeFeedback';
import {
  chapterPracticeStart,
  chapterScreens,
  isCheckedScreen,
  type GuidedChapter,
  type GuidedScreen,
  type StepRef,
} from './types';
import './guided.css';

// ── The guided player, for what's played ───────────────────────────────────
// The Audio player's screen, over the engines that already run a lesson: the
// container or ActivityFlow keeps its hooks, its scoring and its input, and hands
// over the same models it gives its other layouts, plus this binding. The player
// only decides which step is on, and what to say when a take comes back.

export interface GuidedBinding {
  chapter: GuidedChapter;
  /** Which lesson and key this is, so that its XP counts once a day. */
  xpScope: string;
  accent: string;
  ratio: readonly [number, number];
  figure?: PathFigure;
  /** The step the engine is on. */
  currentStep: StepRef;
  status: (step: StepRef) => GuitarStepStatus;
  goToStep: (step: StepRef) => void;
  /** Mark these as done, by having passed `from`. */
  credit: (steps: readonly StepRef[], from: StepRef) => void;
  /** The last take, once it's over; null while one's running or none has. */
  take: TakeReport | null;
  /** Clear that take and go back to the step's preview. */
  clearTake: () => void;
  onLeave: () => void;
  /** Report the chapter done: the XP it really earned, if the server said. */
  finish: () => Promise<number | null>;
  /** The next chapter of this lesson; null at the end. */
  next: { id: string; name: string; open: () => void } | null;
  practiceTrack: (() => void) | null;
  /** The skill check: the engine stops showing the notes. */
  onFromMemoryChange: (on: boolean) => void;
  /** After several misses, the student may count a step themselves. */
  countItMyself?: (() => void) | null;
  /** Sound one note, for a note chosen with the mouse. */
  hearNote?: (midi: number) => void;
  /** Worth looping when a take goes badly. */
  suggestion?: { label: string; start: () => void } | null;
  /** What to check, when a take couldn't be heard. */
  troubleshoot?: ReactNode;
}

const pct = (value: number) => `${Math.round(value * 100)}%`;

const NO_NOTES: ReadonlySet<number> = new Set();

/** A step's take has passed. */
const isPassed = (status: GuitarStepStatus) =>
  status === 'passed' || status === 'selfReported';

/** Where to open: the first thing still to play, or the top. */
export function resumeScreen(
  screens: readonly GuidedScreen[],
  status: (step: StepRef) => GuitarStepStatus,
): number {
  const plays = screens.filter(
    (screen) => screen.kind === 'play' && !screen.fromMemory,
  );
  const anyDone = plays.some(
    (screen) =>
      screen.kind === 'play' &&
      screen.rungs.some((rung) => isPassed(status(rung.step))),
  );
  if (!anyDone) return 0;
  const at = screens.findIndex(
    (screen) =>
      screen.kind === 'play' &&
      !screen.fromMemory &&
      screen.rungs.some((rung) => !isPassed(status(rung.step))),
  );
  return at < 0 ? 0 : at;
}

/** The first rung still to play, or the first. */
const firstOpenRung = (
  screen: GuidedScreen,
  status: (step: StepRef) => GuitarStepStatus,
) => {
  if (screen.kind !== 'play') return 0;
  const at = screen.rungs.findIndex((rung) => !isPassed(status(rung.step)));
  return at < 0 ? 0 : at;
};

/** The step a screen shows, if it shows one. */
function stepOnScreen(screen: GuidedScreen, rung: number): StepRef | null {
  switch (screen.kind) {
    case 'hook':
      return screen.hear ?? null;
    case 'play':
      return screen.rungs[rung]?.step ?? screen.rungs[0]?.step ?? null;
    case 'choose':
      return screen.step ?? null;
    case 'explain':
      if (!screen.show) return null;
      return 'step' in screen.show ? screen.show.step : screen.show.overview;
    default:
      return null;
  }
}

function RungStrip({
  screen,
  rung,
  status,
  disabled,
  accent,
  onPick,
}: {
  screen: GuidedScreen & { kind: 'play' };
  rung: number;
  status: (step: StepRef) => GuitarStepStatus;
  disabled: boolean;
  accent: string;
  onPick: (index: number) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Parts of this screen"
      data-rungs
      className="flex flex-wrap gap-1.5"
    >
      {screen.rungs.map((part, i) => {
        const done = isPassed(status(part.step));
        return (
          <button
            key={part.step}
            type="button"
            aria-current={i === rung ? 'step' : undefined}
            data-rung={part.step}
            data-rung-done={done || undefined}
            disabled={disabled}
            onClick={() => onPick(i)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[0.8125rem] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-default',
              i === rung
                ? 'border-white bg-white/[0.1] text-white'
                : 'border-white/15 text-white/70 hover:bg-white/[0.05] disabled:hover:bg-transparent',
            )}
          >
            {done && (
              <Check
                className="size-3.5"
                style={{ color: accent }}
                strokeWidth={3}
                aria-hidden
              />
            )}
            {part.label}
          </button>
        );
      })}
    </div>
  );
}

export function GuidedPlayer({
  binding,
  bar,
  stage,
  overview,
  volume,
  extra,
  paused = false,
}: {
  binding: GuidedBinding;
  bar: GuitarActionBarProps;
  /** What's played on: kept mounted, so that the engine can measure it. */
  stage: ReactNode;
  /** The lesson's own overview, when a screen asks for it. */
  overview?: ReactNode;
  volume: ReactNode;
  extra?: ReactNode;
  /** A sheet or dialog is open: the activity won't move on by itself. */
  paused?: boolean;
}) {
  const { chapter, accent, status, take } = binding;
  const [params, setParams] = useSearchParams();
  const reduced = useReducedMotion() ?? false;
  const screens = useMemo(() => chapterScreens(chapter), [chapter]);
  const practiceFrom = chapterPracticeStart(chapter);

  const [start] = useState(() => {
    const asked = screens.findIndex((s) => s.id === params.get('screen'));
    return asked >= 0 ? asked : resumeScreen(screens, status);
  });
  const [state, dispatch] = useReducer(playerReducer, start, initialPlayer);
  const screen = screens[state.index];
  const [rung, setRung] = useState(() => firstOpenRung(screens[start], status));
  const [whyOpen, setWhyOpen] = useState(false);
  const [checkOpen, setCheckOpen] = useState(false);
  const [xp, setXp] = useState<number | null | 'waiting'>('waiting');
  const headingRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  /** The take already answered, so that it's only answered once. */
  const answeredTake = useRef<number | null>(take?.id ?? null);
  /** What the frame's answering, however soon the engine moves on from it. */
  const [verdict, setVerdict] = useState<TakeReport | null>(null);
  /** The notes chosen so far, on a screen for choosing them. */
  const [picks, setPicks] = useState<ReadonlySet<number>>(new Set());

  const running =
    bar.run.state === 'practice' || bar.run.state === 'performance';
  const wanted = stepOnScreen(screen, rung);

  // A screen's address, so that a teacher can link straight to it.
  useEffect(() => {
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev);
        out.set('screen', screen.id);
        return out;
      },
      { replace: true },
    );
  }, [screen.id, setParams]);

  // The engine follows the screen, on every render: an engine can reset itself as
  // it mounts, after this has already moved it. A take that's been answered and
  // left behind is cleared first.
  const { goToStep, clearTake, onFromMemoryChange } = binding;
  useEffect(() => {
    if (take && take.id === answeredTake.current && state.phase === 'acting') {
      clearTake();
    }
    if (wanted && wanted !== binding.currentStep) goToStep(wanted);
  });

  const fromMemory = screen.kind === 'play' && !!screen.fromMemory;
  const hintsOff = fromMemory && !isSettled(state.phase);
  useEffect(() => {
    onFromMemoryChange(hintsOff);
  }, [hintsOff, onFromMemoryChange]);

  // A new screen: the keyboard starts from its text.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    setWhyOpen(false);
  }, [state.index]);

  // A screen for choosing notes starts from its tonic.
  const pickTonic = screen.kind === 'pick' ? screen.tonicPc : null;
  useEffect(() => {
    setPicks(new Set(pickTonic === null ? [] : [pickTonic]));
  }, [pickTonic, screen.id]);

  // A take has come back: the frame answers.
  const { credit } = binding;
  useEffect(() => {
    if (!take || take.id === answeredTake.current) return;
    if (screen.kind !== 'play' || take.step !== wanted) return;
    answeredTake.current = take.id;
    setVerdict(take);
    // Counted by hand, after a miss that's still on show.
    if (state.phase === 'wrong') dispatch({ type: 'tryAgain' });
    if (take.passed) {
      const part = screen.rungs[rung];
      if (part) credit(part.credits ?? [], part.step);
      dispatch({ type: 'verdict', screenId: screen.id, ok: true });
    } else {
      dispatch({
        type: 'verdict',
        screenId: screen.id,
        ok: false,
        mistake: take.fault ?? 'other',
      });
    }
  }, [credit, rung, screen, state.phase, take, wanted]);

  // A result: the keyboard moves to what comes next.
  useEffect(() => {
    if (state.phase !== 'acting') primaryRef.current?.focus();
  }, [state.phase]);

  const goToScreen = useCallback(
    (index: number) => {
      setRung(firstOpenRung(screens[index], status));
    },
    [screens, status],
  );

  const onContinue = useCallback(() => {
    if (bar.run.demo.playing) bar.run.demo.stop();
    if (
      screen.kind === 'play' &&
      rung + 1 < screen.rungs.length &&
      state.phase !== 'acting'
    ) {
      clearTake();
      setRung(rung + 1);
      dispatch({ type: 'nextPart' });
      return;
    }
    if (state.index + 1 >= screens.length) {
      setXp('waiting');
      binding.finish().then(setXp, () => setXp(null));
    } else {
      goToScreen(state.index + 1);
    }
    dispatch({ type: 'continue', count: screens.length, practiceFrom });
  }, [
    bar.run.demo,
    binding,
    clearTake,
    goToScreen,
    practiceFrom,
    rung,
    screen,
    screens.length,
    state.index,
    state.phase,
  ]);

  // The activity runs itself, once the engine really is on its step. A pass shows
  // what it earned, then does what Continue does.
  const onItsStep = !!wanted && wanted === binding.currentStep;
  const lastPart = screen.kind === 'play' && rung === screen.rungs.length - 1;
  const flow = useStepFlow({
    stepKey:
      onItsStep &&
      state.view === 'lesson' &&
      (screen.kind === 'play' || screen.kind === 'hook')
        ? `${screen.id}|${wanted}`
        : null,
    run: bar.run,
    paused: paused || whyOpen || checkOpen,
    takeEnded: !!take,
    demoOnly: screen.kind === 'hook',
    autoStart: !(screen.kind === 'play' && screen.fromMemory),
    xpScope: binding.xpScope,
    pass: {
      advance: onContinue,
      nextLabel: screen.kind === 'play' ? screen.rungs[rung + 1]?.label : null,
      score: verdict && verdict.score !== null ? pct(verdict.score) : null,
      detail:
        screen.kind === 'play' && lastPart ? screen.right : verdict?.message,
    },
  });
  const awardXp = useLearnXp();

  const onBack = useCallback(() => {
    if (state.index === 0) return;
    goToScreen(state.index - 1);
    dispatch({ type: 'back' });
  }, [goToScreen, state.index]);

  const resetTake = useCallback(() => {
    clearTake();
    dispatch({ type: 'tryAgain' });
  }, [clearTake]);

  // On a question the attempt just stays. A take goes straight back to Perform.
  const onTryAgain = useCallback(() => {
    resetTake();
    if (screen.kind === 'play') flow.performAgain();
  }, [flow, resetTake, screen.kind]);

  const onPickRung = useCallback(
    (index: number) => {
      clearTake();
      setRung(index);
      if (state.phase !== 'acting') dispatch({ type: 'nextPart' });
    },
    [clearTake, state.phase],
  );

  const onCheckChoice = useCallback(() => {
    if (screen.kind !== 'choose' || !state.picked) return;
    if (state.picked === screen.correct) {
      void awardXp('answer', `${binding.xpScope}:${chapter.id}:${screen.id}`);
      dispatch({ type: 'verdict', screenId: screen.id, ok: true });
    } else {
      dispatch({
        type: 'verdict',
        screenId: screen.id,
        ok: false,
        mistake: state.picked,
      });
    }
  }, [awardXp, binding.xpScope, chapter.id, screen, state.picked]);

  const onTogglePick = useCallback(
    (pc: number) => {
      if (screen.kind !== 'pick') return;
      binding.hearNote?.(60 + pc);
      // The tonic is where the counting starts: it stays.
      if (pc === screen.tonicPc) return;
      setPicks((prev) => {
        const next = new Set(prev);
        if (!next.delete(pc)) next.add(pc);
        return next;
      });
    },
    [binding, screen],
  );

  const onCheckPicks = useCallback(() => {
    if (screen.kind !== 'pick') return;
    const graded = gradeNotePick(picks, screen.scale);
    if (graded.ok) {
      void awardXp('answer', `${binding.xpScope}:${chapter.id}:${screen.id}`);
      dispatch({ type: 'verdict', screenId: screen.id, ok: true });
    } else {
      dispatch({
        type: 'verdict',
        screenId: screen.id,
        ok: false,
        mistake: graded.extra.length ? 'extra' : 'missing',
      });
    }
  }, [awardXp, binding.xpScope, chapter.id, picks, screen]);

  const onSeeAnswer = useCallback(() => {
    if (screen.kind === 'pick') {
      setPicks(new Set(screen.scale));
      dispatch({ type: 'seeAnswer', screenId: screen.id });
      return;
    }
    if (screen.kind !== 'choose') return;
    dispatch({
      type: 'seeAnswer',
      screenId: screen.id,
      answer: screen.correct,
    });
  }, [screen]);

  // A skipped take doesn't mark anything: it just lets them move on.
  const onSkip = useCallback(() => {
    clearTake();
    dispatch({ type: 'seeAnswer', screenId: screen.id });
    if (screen.kind === 'play' && rung + 1 < screen.rungs.length) {
      setRung(rung + 1);
      dispatch({ type: 'nextPart' });
      return;
    }
    if (state.index + 1 < screens.length) goToScreen(state.index + 1);
    dispatch({ type: 'continue', count: screens.length, practiceFrom });
  }, [
    clearTake,
    goToScreen,
    practiceFrom,
    rung,
    screen,
    screens.length,
    state.index,
  ]);

  // Enter does the primary action, unless a control has the key for its own use.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (whyOpen || checkOpen || state.view !== 'lesson') return;
      if (
        event.key === 'Enter' &&
        tag !== 'BUTTON' &&
        tag !== 'INPUT' &&
        tag !== 'SELECT' &&
        tag !== 'A'
      ) {
        primaryRef.current?.click();
      }
      if (
        screen.kind === 'choose' &&
        state.phase === 'acting' &&
        /^[1-9]$/.test(event.key)
      ) {
        const choice = screen.choices[Number(event.key) - 1];
        if (choice && !state.eliminated.includes(choice.id)) {
          dispatch({ type: 'pick', id: choice.id });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [checkOpen, screen, state.eliminated, state.phase, state.view, whyOpen]);

  if (state.view === 'finish') {
    return (
      <div className="absolute inset-0 z-50 bg-[#101012]">
        <FinishSequence
          accent={accent}
          ratio={binding.ratio}
          figure={binding.figure}
          xp={xp}
          firstTry={state.firstTry.length}
          questions={state.answered.length}
          continueLabel={
            binding.next ? `On to ${binding.next.name}` : undefined
          }
          onContinue={() => {
            const { next } = binding;
            if (!next) {
              binding.onLeave();
              return;
            }
            // The next chapter's address, not this one's last screen.
            setParams(
              (prev) => {
                const out = new URLSearchParams(prev);
                out.delete('screen');
                out.set('section', next.id);
                return out;
              },
              { replace: true },
            );
            next.open();
          }}
        />
      </div>
    );
  }

  const settled = isSettled(state.phase);
  const showsStage =
    screen.kind === 'play' ||
    (screen.kind === 'hook' && !!screen.hear) ||
    (screen.kind === 'choose' && !!screen.step) ||
    (screen.kind === 'explain' && !!screen.show && 'step' in screen.show);
  const showsOverview =
    screen.kind === 'explain' && !!screen.show && 'overview' in screen.show;
  // The lesson's own overview, where it brings one; otherwise it's on the stage.
  const stageShown = showsStage || (showsOverview && !overview);

  const feedback = (() => {
    if (screen.kind === 'play') {
      if (state.phase === 'right') {
        const last = rung === screen.rungs.length - 1;
        if (!last) return verdict?.message ?? null;
        return state.index >= practiceFrom
          ? `Correct! ${screen.right}`
          : screen.right;
      }
      if (state.phase === 'wrong' && verdict) {
        return (
          (verdict.fault && screen.faults?.[verdict.fault]) ?? verdict.message
        );
      }
    }
    if (screen.kind === 'choose') {
      if (state.phase === 'right') {
        return state.index >= practiceFrom
          ? `Correct! ${screen.right}`
          : screen.right;
      }
      if (state.phase === 'revealed')
        return `Here’s the answer. ${screen.right}`;
      if (state.phase === 'wrong' && state.mistake) {
        return screen.choices.find((c) => c.id === state.mistake)?.feedback;
      }
    }
    if (screen.kind === 'pick') {
      if (state.phase === 'right') {
        return state.index >= practiceFrom
          ? `Correct! ${screen.right}`
          : screen.right;
      }
      if (state.phase === 'revealed')
        return `Here’s the answer. ${screen.right}`;
      if (state.phase === 'wrong') {
        const graded = gradeNotePick(picks, screen.scale);
        if (graded.ok) return null;
        return graded.extra.length
          ? screen.extra(graded.extra.map(screen.nameOf))
          : screen.missing(
              screen.scale.length - graded.missing.length,
              screen.scale.length,
            );
      }
    }
    return null;
  })();

  const takeNumbers =
    screen.kind === 'play' &&
    state.phase !== 'acting' &&
    verdict &&
    verdict.score !== null ? (
      <p
        className="text-[0.8125rem] text-white/60"
        data-take-score={verdict.score}
      >
        <span className="font-bold text-white">{pct(verdict.score)}</span>
        {verdict.parts.map((part) => (
          <span key={part.label}>
            {' · '}
            {part.label} {pct(part.value)}
          </span>
        ))}
        {!verdict.passed && ` · ${verdict.passMarkPct}% passes`}
      </p>
    ) : null;

  const barNow = { ...bar, run: flow.run };
  const zones =
    hintsOff && bar.run.state === 'preview' && !bar.custom
      ? {
          lead: null,
          meta: zonesFor(barNow).meta,
          corner: null,
          actions: (
            <button
              ref={primaryRef}
              type="button"
              data-primary
              disabled={bar.run.loading}
              className={cn(WHITE_PILL_LG, 'min-w-44 max-sm:flex-1')}
              onClick={flow.run.playNow}
            >
              Perform
            </button>
          ),
        }
      : (bar.custom ?? flow.zones(bar.tempo) ?? zonesFor(barNow));

  const needsTry = screen.kind === 'play' && state.phase === 'acting';
  const moreParts =
    screen.kind === 'play' && rung + 1 < screen.rungs.length
      ? screen.rungs[rung + 1].label
      : null;

  return (
    <div
      className="relative flex h-full min-h-0 flex-col bg-[#101012] font-sans text-[#e8e8f0]"
      data-guided-lesson={chapter.id}
      data-screen={screen.id}
      data-phase={state.phase}
      data-from-memory={hintsOff || undefined}
    >
      <LessonTopBar
        index={state.index}
        count={screens.length}
        practiceFrom={practiceFrom}
        fraction={
          screen.kind === 'play' && state.index < practiceFrom
            ? rung / screen.rungs.length
            : 0
        }
        canBack={state.index > 0 && !running}
        onBack={onBack}
        onClose={binding.onLeave}
        answered={state.answered}
        firstTry={state.firstTry}
        screens={screens}
        volume={volume}
        extra={extra}
      />
      <XpRise muted={flow.status === 'passed'} />
      <VerdictFrame phase={state.phase}>
        <StageTransition flow={flow} accent={accent} />
        <PassMoment flow={flow} accent={accent} />
        {flow.status === 'perform' && !reduced && (
          <motion.div
            aria-hidden
            data-perform-pulse
            className="pointer-events-none absolute inset-0 z-20 rounded-[1.25rem] border-2"
            style={{ borderColor: accent }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        )}
        {state.view === 'skillIntro' && (
          <div className="absolute inset-0 z-30 flex bg-[#101012]">
            <SkillIntro
              accent={accent}
              reduced={reduced}
              onDone={() => dispatch({ type: 'startPractice' })}
            />
          </div>
        )}
        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <div className="mx-auto flex min-h-0 w-full max-w-[74rem] flex-1 flex-col gap-3 px-4 pb-3 pt-4 sm:px-8 sm:pt-5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={screen.id}
                ref={headingRef}
                tabIndex={-1}
                className="flex max-w-[46rem] flex-col gap-2 outline-none"
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {screen.kind === 'hook' && (
                  <h1 className="text-[1.75rem] font-bold leading-tight tracking-[-0.01em] text-white">
                    {screen.title}
                  </h1>
                )}
                <p
                  className={cn(
                    'leading-7 text-white/90',
                    state.index >= practiceFrom
                      ? 'text-[1.0625rem] font-bold text-white'
                      : 'text-[1.0625rem]',
                  )}
                >
                  <Rich text={screen.body} />
                </p>
              </motion.div>
            </AnimatePresence>

            {screen.kind === 'play' && (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {!screen.fromMemory && (
                  <StageRail flow={flow} accent={accent} />
                )}
                {screen.rungs.length > 1 && (
                  <RungStrip
                    screen={screen}
                    rung={rung}
                    status={status}
                    disabled={running}
                    accent={accent}
                    onPick={onPickRung}
                  />
                )}
              </div>
            )}

            {screen.kind === 'choose' && (
              <div className="flex max-w-[46rem] flex-col gap-3">
                <p className="text-[1.0625rem] font-bold leading-7 text-white">
                  <Rich text={screen.question} />
                </p>
                <ChoiceList
                  choices={screen.choices}
                  picked={state.picked}
                  eliminated={state.eliminated}
                  phase={state.phase}
                  correct={screen.correct}
                  onPick={(id) => dispatch({ type: 'pick', id })}
                />
              </div>
            )}

            {screen.kind === 'pick' && (
              <div className="flex max-w-[46rem] flex-col gap-3">
                <p className="text-[1.0625rem] font-bold leading-7 text-white">
                  <Rich text={screen.question} />
                </p>
                <NotePicker
                  face={screen.face}
                  tonicPc={screen.tonicPc}
                  nameOf={screen.nameOf}
                  picked={picks}
                  wrong={
                    state.phase === 'wrong'
                      ? new Set(
                          [...picks].filter((pc) => !screen.scale.includes(pc)),
                        )
                      : NO_NOTES
                  }
                  settled={settled}
                  disabled={state.phase !== 'acting'}
                  accent={accent}
                  onToggle={onTogglePick}
                />
              </div>
            )}

            {screen.kind === 'takeaway' && (
              <div className="max-w-[46rem]">
                <TakeawayCard
                  accent={accent}
                  points={screen.points}
                  inSession={screen.inSession}
                  limits={screen.limits}
                  next={screen.next}
                />
              </div>
            )}

            {/* Kept mounted on every screen: the engine measures it. */}
            <div
              data-guided-stage
              className={cn(
                'min-h-0 min-w-0 flex-1 flex-col gap-3',
                stageShown ? 'flex' : 'hidden',
              )}
            >
              {stage}
            </div>
            {showsOverview && overview && (
              <div data-guided-overview className="min-w-0">
                {overview}
              </div>
            )}

            {screen.caption && (
              <p className="text-[0.8125rem] leading-5 text-white/55">
                <Rich text={screen.caption} />
              </p>
            )}
          </div>
        </div>

        {/* The foot: what they did, then the keys, then what's next. */}
        <div
          data-guitar-bar={bar.state}
          className="relative z-10 flex shrink-0 flex-col gap-2 pb-4 pt-1 sm:pb-5"
        >
          <div hidden={!stageShown}>
            <KeyboardSlot />
          </div>
          <div className="mx-auto flex w-full max-w-[74rem] flex-col gap-2 px-4 sm:px-8">
            {feedback && (
              <FeedbackBubble
                phase={state.phase}
                text={feedback}
                reduced={reduced}
                aside={takeNumbers}
              />
            )}
            <div
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
              data-guided-foot
            >
              {/* A take's words, its tempo, and its buttons. */}
              {needsTry ? (
                <>
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                    {zones.lead && (
                      <div data-bar-lead className="min-w-0">
                        {zones.lead}
                      </div>
                    )}
                    {zones.meta && (
                      <div
                        data-bar-meta
                        className="flex shrink-0 items-center gap-2"
                      >
                        {zones.meta}
                      </div>
                    )}
                    {zones.corner}
                  </div>
                  <div
                    data-bar-actions
                    className="flex shrink-0 flex-wrap items-center justify-end gap-2 [&_button]:h-11 [&_button]:px-5 [&_button]:text-[0.9375rem] max-sm:w-full max-sm:[&_button]:flex-1"
                  >
                    {zones.actions}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex min-w-0 items-center gap-3">
                    {screen.kind === 'hook' && screen.hear && (
                      <button
                        type="button"
                        aria-pressed={bar.run.demo.playing}
                        onClick={
                          bar.run.demo.playing
                            ? flow.run.demo.stop
                            : flow.run.demo.play
                        }
                        className={cn(
                          OUTLINE_PILL,
                          'h-11 px-5 text-[0.9375rem]',
                        )}
                      >
                        <Play aria-hidden />
                        {bar.run.demo.playing ? 'Stop' : 'Hear it'}
                      </button>
                    )}
                    {screen.kind === 'takeaway' && binding.practiceTrack && (
                      <button
                        type="button"
                        onClick={binding.practiceTrack}
                        className={cn(
                          OUTLINE_PILL,
                          'h-11 px-5 text-[0.9375rem]',
                        )}
                      >
                        Open a Practice Track
                      </button>
                    )}
                  </div>
                  <div className="flex min-w-0 shrink-0 flex-wrap justify-end gap-2 max-sm:flex-1">
                    {state.phase === 'acting' && screen.kind === 'pick' ? (
                      <button
                        ref={primaryRef}
                        type="button"
                        disabled={picks.size <= 1}
                        className={cn(
                          WHITE_PILL_LG,
                          'min-w-44 max-sm:flex-1 disabled:opacity-35',
                        )}
                        onClick={onCheckPicks}
                      >
                        Check
                      </button>
                    ) : state.phase === 'acting' && screen.kind === 'choose' ? (
                      <button
                        ref={primaryRef}
                        type="button"
                        disabled={!state.picked}
                        className={cn(
                          WHITE_PILL_LG,
                          'min-w-44 max-sm:flex-1 disabled:opacity-35',
                        )}
                        onClick={onCheckChoice}
                      >
                        Check
                      </button>
                    ) : state.phase === 'wrong' ? (
                      <>
                        {screen.kind === 'choose' || screen.kind === 'pick' ? (
                          <button
                            type="button"
                            className={cn(
                              OUTLINE_PILL,
                              'h-11 px-5 text-[0.9375rem]',
                            )}
                            onClick={onSeeAnswer}
                          >
                            See answer
                          </button>
                        ) : (
                          <>
                            {verdict?.fault === 'unclear' &&
                              binding.troubleshoot && (
                                <button
                                  type="button"
                                  className={cn(
                                    OUTLINE_PILL,
                                    'h-11 px-5 text-[0.9375rem]',
                                  )}
                                  onClick={() => setCheckOpen(true)}
                                >
                                  What to check
                                </button>
                              )}
                            {binding.suggestion && (
                              <button
                                type="button"
                                className={cn(
                                  OUTLINE_PILL,
                                  'h-11 px-5 text-[0.9375rem]',
                                )}
                                onClick={() => {
                                  dispatch({ type: 'tryAgain' });
                                  binding.suggestion?.start();
                                }}
                              >
                                {binding.suggestion.label}
                              </button>
                            )}
                            {binding.countItMyself && (
                              <button
                                type="button"
                                className={cn(
                                  OUTLINE_PILL,
                                  'h-11 px-5 text-[0.9375rem]',
                                )}
                                onClick={binding.countItMyself}
                              >
                                Count it myself
                              </button>
                            )}
                            {state.attempts >= 2 && !binding.countItMyself && (
                              <button
                                type="button"
                                data-skip-take
                                className={cn(
                                  OUTLINE_PILL,
                                  'h-11 px-5 text-[0.9375rem]',
                                )}
                                onClick={onSkip}
                              >
                                Skip for now
                              </button>
                            )}
                            <button
                              type="button"
                              className={cn(
                                OUTLINE_PILL,
                                'h-11 px-5 text-[0.9375rem]',
                              )}
                              onClick={() => {
                                resetTake();
                                flow.takeOver();
                                bar.run.demo.play();
                              }}
                            >
                              Hear it
                            </button>
                          </>
                        )}
                        <button
                          ref={primaryRef}
                          type="button"
                          className={cn(WHITE_PILL_LG, 'max-sm:flex-1')}
                          onClick={onTryAgain}
                        >
                          Try again
                        </button>
                      </>
                    ) : (
                      <>
                        {isCheckedScreen(screen) && settled && (
                          <button
                            type="button"
                            className={cn(
                              OUTLINE_PILL,
                              'h-11 px-5 text-[0.9375rem]',
                            )}
                            onClick={() => setWhyOpen(true)}
                          >
                            Why?
                          </button>
                        )}
                        <button
                          ref={primaryRef}
                          type="button"
                          className={cn(
                            WHITE_PILL_LG,
                            'min-w-36 max-sm:flex-1',
                          )}
                          onClick={onContinue}
                        >
                          {moreParts ? `Next: ${moreParts}` : 'Continue'}
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </VerdictFrame>
      <WhyDialog
        why={isCheckedScreen(screen) ? screen.why : null}
        open={whyOpen}
        onOpenChange={setWhyOpen}
      />
      <Dialog open={checkOpen} onOpenChange={setCheckOpen}>
        <DialogContent className="max-h-[85dvh] max-w-[34rem] overflow-y-auto rounded-2xl border-white/10 bg-[#1b1b1f] p-7 text-white">
          <DialogTitle className="text-lg font-bold text-white">
            What to check
          </DialogTitle>
          {binding.troubleshoot}
        </DialogContent>
      </Dialog>
    </div>
  );
}
