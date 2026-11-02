import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Play,
  Square,
  TriangleAlert,
  Volume2,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ComponentType,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OUTLINE_PILL, WHITE_PILL_LG } from '@/components/kit/pills';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/components/utilities';
import { LearnRoutes } from '@/constants/routes';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import { colorForKeyMode } from '@/lib/modeColorShift';
import type { AudioModule } from '../catalog';
import { LabVolumeRow, TapToHear } from '../lab/LabControls';
import { guidedResumeIndex, useGuidedProgress } from '../lab/audioProgress';
import {
  allScreens,
  isChecked,
  practiceStart,
  sceneAt,
  type LessonScript,
  type Screen,
} from '../lessons/types';
import { useMixEngine, type Mix } from '../mix/useMixEngine';
import { Rich } from './Rich';
import { FinishSequence } from './finish/FinishSequence';
import {
  initialPlayer,
  isSettled,
  playerReducer,
  type Phase,
} from './playerMachine';
import './player.css';

// ── The lesson player ──────────────────────────────────────────────────────
// The whole window, one screen at a time, with the stage staying put underneath
// so that faders and meters carry from screen to screen. Check grades what's on
// the stage: the frame answers in green or amber, the groove plays their answer,
// and the bubble says what that exact mistake means. "Why?" holds the depth, out
// of the way until it's asked for.

export interface StageProps<S> {
  scene: S;
  setScene: (patch: Partial<S>) => void;
  screen: Screen<S>;
  accent: string;
  mix: Mix;
  /** The result is showing: the controls hold still. */
  locked: boolean;
  /** A part was pressed, on a screen for finding one. */
  onIdentify: (term: string) => void;
}

const RIGHT = '#34d399';
const WRONG = '#f59e0b';

function SkillIntro({
  accent,
  onDone,
  reduced,
}: {
  accent: string;
  onDone: () => void;
  reduced: boolean;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, reduced ? 700 : 1700);
    return () => clearTimeout(timer);
  }, [onDone, reduced]);
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-4"
      data-skill-intro
    >
      <motion.span
        className="flex size-16 items-center justify-center rounded-full text-[#101012]"
        style={{ backgroundColor: accent }}
        initial={reduced ? false : { rotateY: 180, scale: 0.6 }}
        animate={{ rotateY: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 170, damping: 14 }}
      >
        <Check className="size-8" strokeWidth={3} aria-hidden />
      </motion.span>
      <p className="text-lg font-bold text-white">Skill check</p>
      <p className="text-[0.9375rem] text-white/60">Three on your own.</p>
    </div>
  );
}

function WhyDialog({
  screen,
  open,
  onOpenChange,
}: {
  screen: Screen<unknown>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!isChecked(screen)) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] max-w-[34rem] overflow-y-auto rounded-2xl border-white/10 bg-[#1b1b1f] p-7 text-white">
        <DialogTitle className="text-lg font-bold text-white">
          {screen.why.title}
        </DialogTitle>
        <div className="flex flex-col gap-3 text-[0.9375rem] leading-6 text-white/85">
          {screen.why.paragraphs.map((paragraph, i) => (
            <p key={i}>
              <Rich text={paragraph} />
            </p>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PlayerTopBar({
  index,
  count,
  practiceFrom,
  canBack,
  onBack,
  onClose,
  answered,
  firstTry,
  screens,
}: {
  index: number;
  count: number;
  practiceFrom: number;
  canBack: boolean;
  onBack: () => void;
  onClose: () => void;
  answered: readonly string[];
  firstTry: readonly string[];
  screens: readonly { id: string }[];
}) {
  const [volumeOpen, setVolumeOpen] = useState(false);
  const main = Math.min(1, (index + 1) / practiceFrom);
  return (
    <div className="relative flex h-14 shrink-0 items-center gap-3 px-4 sm:px-6">
      <button
        type="button"
        aria-label="Leave the lesson"
        onClick={onClose}
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-white/70 outline-none transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"
      >
        <X className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Back a screen"
        onClick={onBack}
        disabled={!canBack}
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-white/70 outline-none transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-0"
      >
        <ArrowLeft className="size-5" aria-hidden />
      </button>
      <div
        role="progressbar"
        aria-label="Lesson progress"
        aria-valuemin={0}
        aria-valuemax={count}
        aria-valuenow={index + 1}
        className="mx-auto flex w-full max-w-xl items-center gap-1.5"
      >
        <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.1]">
          <span
            className="block h-full rounded-full bg-emerald-400 transition-[width] duration-300 ease-out"
            style={{ width: `${main * 100}%` }}
          />
        </span>
        {screens.slice(practiceFrom).map((s, i) => {
          const at = practiceFrom + i;
          const done = answered.includes(s.id);
          return (
            <span
              key={s.id}
              data-practice-dot={
                firstTry.includes(s.id) ? 'first-try' : done ? 'done' : 'todo'
              }
              className={cn(
                'size-2.5 shrink-0 rounded-full border',
                firstTry.includes(s.id)
                  ? 'border-emerald-400 bg-emerald-400'
                  : done
                    ? 'border-emerald-400'
                    : at === index
                      ? 'border-white/70'
                      : 'border-white/20',
              )}
            />
          );
        })}
      </div>
      <div className="relative shrink-0">
        <button
          type="button"
          aria-label="Volume"
          aria-expanded={volumeOpen}
          onClick={() => setVolumeOpen((open) => !open)}
          className="flex size-9 items-center justify-center rounded-full text-white/70 outline-none transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <Volume2 className="size-5" aria-hidden />
        </button>
        {volumeOpen && (
          <div className="absolute right-0 top-11 z-30 w-72 rounded-2xl border border-white/10 bg-[#1b1b1f] p-4 shadow-xl">
            <LabVolumeRow />
          </div>
        )}
      </div>
    </div>
  );
}

function ChoiceList<S>({
  screen,
  picked,
  eliminated,
  phase,
  correct,
  onPick,
}: {
  screen: Screen<S> & { kind: 'choose' };
  picked: string | null;
  eliminated: readonly string[];
  phase: Phase;
  correct: string;
  onPick: (id: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Choices" className="flex flex-col gap-2">
      {screen.choices.map((choice) => {
        const gone = eliminated.includes(choice.id);
        const on = picked === choice.id;
        const settled = isSettled(phase);
        return (
          <button
            key={choice.id}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={gone || settled || phase === 'wrong'}
            onClick={() => onPick(choice.id)}
            className={cn(
              'flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-[0.9375rem] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/60',
              on
                ? 'border-white bg-white/[0.1] text-white'
                : 'border-white/20 text-white/90 hover:bg-white/[0.05]',
              gone &&
                'border-white/10 text-white/35 line-through hover:bg-transparent',
              settled &&
                choice.id === correct &&
                'border-emerald-400 bg-emerald-400/10 text-white',
            )}
          >
            <span className="min-w-0 flex-1">
              <Rich text={choice.text} />
            </span>
            {settled && choice.id === correct && (
              <Check className="size-4 shrink-0 text-emerald-400" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function LessonPlayer<S>({
  script,
  Stage,
  module,
  lessonId,
  ratio,
}: {
  script: LessonScript<S>;
  Stage: ComponentType<StageProps<S>>;
  module: AudioModule;
  lessonId: string;
  ratio: readonly [number, number];
}) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const reduced = useReducedMotion() ?? false;
  const accent = colorForKeyMode(module.accentKey);
  const screens = useMemo(() => allScreens(script), [script]);
  const practiceFrom = practiceStart(script);
  const ids = useMemo(() => screens.map((s) => s.id), [screens]);
  const { screenDone, finish } = useGuidedProgress(module.id, lessonId);
  const mix = useMixEngine(script.needs);

  const [start] = useState(() => {
    const asked = ids.indexOf(params.get('screen') ?? '');
    if (asked >= 0) return asked;
    return guidedResumeIndex(
      useTutorialProgressStore.getState().completedAt,
      module.id,
      lessonId,
      ids,
    );
  });
  const [state, dispatch] = useReducer(playerReducer, start, initialPlayer);
  const [scene, setSceneState] = useState<S>(() => sceneAt(script, start));
  /** What the stage held on leaving each screen, for coming back to it. */
  const left = useRef(new Map<number, S>());
  /** What it held on arriving: Check waits until something's changed. */
  const arrived = useRef<S>(scene);
  const [whyOpen, setWhyOpen] = useState(false);
  const [abFlip, setAbFlip] = useState(false);
  const [abSide, setAbSide] = useState<'a' | 'b' | null>(null);
  const [xp, setXp] = useState<number | null | 'waiting'>('waiting');

  const screen = screens[state.index];
  const headingRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  const setScene = useCallback(
    (patch: Partial<S>) => setSceneState((prev) => ({ ...prev, ...patch })),
    [],
  );

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

  // Nothing to listen to on this screen.
  useEffect(() => {
    if (screen.quiet && mix.playing) mix.stop();
  }, [mix, screen.quiet]);

  // A new screen: the keyboard starts from its text.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    setAbSide(null);
    setAbFlip(Math.random() < 0.5);
  }, [state.index]);

  // A result: the keyboard moves to what comes next.
  useEffect(() => {
    if (state.phase !== 'acting') primaryRef.current?.focus();
  }, [state.phase]);

  const goTo = useCallback(
    (index: number) => {
      left.current.set(state.index, scene);
      const known = left.current.get(index);
      const next = known ?? {
        ...scene,
        ...screens[index]?.scene,
      };
      arrived.current = next;
      setSceneState(next);
    },
    [scene, screens, state.index],
  );

  const startPractice = useCallback(
    () => dispatch({ type: 'startPractice' }),
    [],
  );

  const onContinue = useCallback(() => {
    const earnsXp = state.index >= practiceFrom || screen.kind === 'takeaway';
    screenDone(screen.id, state.attempts, earnsXp);
    if (state.index + 1 >= screens.length) {
      mix.stop();
      setXp('waiting');
      finish().then(setXp, () => setXp(null));
    } else {
      goTo(state.index + 1);
    }
    dispatch({
      type: 'continue',
      count: screens.length,
      practiceFrom,
    });
  }, [
    finish,
    goTo,
    mix,
    practiceFrom,
    screen,
    screenDone,
    screens.length,
    state.attempts,
    state.index,
  ]);

  const correctChoice = useMemo(() => {
    if (screen.kind === 'choose') return screen.correct;
    if (screen.kind === 'ab') {
      if (screen.correct === 'same') return 'same';
      return (screen.correct === 'a') !== abFlip ? 'a' : 'b';
    }
    return '';
  }, [abFlip, screen]);

  // Once it's answered, the stage shows and plays the answer, whichever side they
  // last listened to, so that what it says and what's there agree.
  const showAnswer = useCallback(() => {
    if (screen.kind !== 'ab' || screen.correct === 'same') return;
    setScene(screen.correct === 'a' ? screen.a : screen.b);
    setAbSide(correctChoice as 'a' | 'b');
  }, [correctChoice, screen, setScene]);

  const onCheck = useCallback(() => {
    if (screen.kind === 'do') {
      // They should hear their own answer.
      if (!mix.playing && mix.ready) mix.play();
      const verdict = screen.evaluate(scene);
      if (verdict.ok) {
        dispatch({ type: 'verdict', screenId: screen.id, ok: true });
      } else {
        dispatch({
          type: 'verdict',
          screenId: screen.id,
          ok: false,
          mistake: verdict.mistake,
        });
      }
      return;
    }
    if (screen.kind === 'choose' || screen.kind === 'ab') {
      if (state.picked === correctChoice) {
        showAnswer();
        dispatch({ type: 'verdict', screenId: screen.id, ok: true });
      } else if (state.picked) {
        dispatch({
          type: 'verdict',
          screenId: screen.id,
          ok: false,
          mistake: state.picked,
        });
      }
    }
  }, [correctChoice, mix, scene, screen, showAnswer, state.picked]);

  const onIdentify = useCallback(
    (term: string) => {
      if (state.phase !== 'acting') return;
      if (screen.kind !== 'anatomy' || screen.mode !== 'identify') return;
      if (term === screen.target) {
        dispatch({ type: 'verdict', screenId: screen.id, ok: true });
      } else {
        dispatch({
          type: 'verdict',
          screenId: screen.id,
          ok: false,
          mistake: term,
        });
      }
    },
    [screen, state.phase],
  );

  const onSeeAnswer = useCallback(() => {
    if (screen.kind === 'do') setScene(screen.answer);
    showAnswer();
    dispatch({
      type: 'seeAnswer',
      screenId: screen.id,
      answer:
        screen.kind === 'choose' || screen.kind === 'ab'
          ? correctChoice
          : undefined,
    });
  }, [correctChoice, screen, setScene, showAnswer]);

  const listen = useCallback(
    (side: 'a' | 'b') => {
      if (screen.kind !== 'ab') return;
      setAbSide(side);
      const real = (side === 'a') !== abFlip ? 'a' : 'b';
      setScene(real === 'a' ? screen.a : screen.b);
      if (!mix.playing && mix.ready) mix.play();
    },
    [abFlip, mix, screen, setScene],
  );

  const checked = isChecked(screen);
  const acted =
    screen.kind === 'do'
      ? JSON.stringify(scene) !== JSON.stringify(arrived.current)
      : screen.kind === 'choose' || screen.kind === 'ab'
        ? state.picked != null
        : false;

  // The primary action on Enter, the groove on Space, back on the left arrow:
  // not while a control has the key for its own use.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (whyOpen || state.view !== 'lesson') return;
      if (
        event.key === 'Enter' &&
        tag !== 'BUTTON' &&
        tag !== 'INPUT' &&
        tag !== 'SUMMARY' &&
        tag !== 'A'
      ) {
        primaryRef.current?.click();
      }
      // A fader has no use for Space, so it still plays with one in hand.
      if (event.key === ' ' && tag !== 'BUTTON') {
        event.preventDefault();
        if (mix.playing) mix.stop();
        else mix.play();
      }
      if (state.phase === 'acting' && /^[1-9]$/.test(event.key)) {
        const nth = Number(event.key) - 1;
        if (screen.kind === 'choose' && screen.choices[nth]) {
          const choice = screen.choices[nth];
          if (!state.eliminated.includes(choice.id)) {
            dispatch({ type: 'pick', id: choice.id });
          }
        }
      }
      if (event.key === 'ArrowLeft' && tag !== 'INPUT' && state.index > 0) {
        goTo(state.index - 1);
        dispatch({ type: 'back' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    goTo,
    mix,
    screen,
    state.eliminated,
    state.index,
    state.phase,
    state.view,
    whyOpen,
  ]);

  const leave = () => navigate(LearnRoutes.audioCourse({ module: module.id }));

  if (state.view === 'finish') {
    const questions = state.answered.length;
    return (
      <FinishSequence
        accent={accent}
        ratio={ratio}
        xp={xp}
        firstTry={state.firstTry.length}
        questions={questions}
        onContinue={() =>
          navigate(LearnRoutes.audioCourse({ module: module.id }), {
            state: { justFinished: lessonId },
          })
        }
      />
    );
  }

  const feedback = (() => {
    if (state.phase === 'right' || state.phase === 'revealed') {
      if (!checked) return null;
      if (state.phase === 'revealed' && screen.kind !== 'do') {
        return `Here’s the answer. ${screen.right}`;
      }
      if (state.phase === 'revealed')
        return `Here’s the answer. ${screen.right}`;
      return state.index >= practiceFrom
        ? `Correct! ${screen.right}`
        : screen.right;
    }
    if (state.phase === 'wrong' && state.mistake != null) {
      if (screen.kind === 'do') return screen.feedback[state.mistake];
      if (screen.kind === 'choose') {
        return screen.choices.find((c) => c.id === state.mistake)?.feedback;
      }
      if (screen.kind === 'ab') return screen.wrong;
      if (screen.kind === 'anatomy' && screen.mode === 'identify') {
        return screen.wrong(state.mistake);
      }
    }
    return null;
  })();

  const verdictColor =
    state.phase === 'right' || state.phase === 'revealed'
      ? RIGHT
      : state.phase === 'wrong'
        ? WRONG
        : null;
  const locked = isSettled(state.phase);

  return (
    <div
      className="relative flex h-full min-h-0 flex-col bg-[#101012] font-sans text-[#e8e8f0]"
      data-lesson-player={script.id}
      data-screen={screen.id}
      data-phase={state.phase}
    >
      <PlayerTopBar
        index={state.index}
        count={screens.length}
        practiceFrom={practiceFrom}
        canBack={state.index > 0 && state.view === 'lesson'}
        onBack={() => {
          goTo(state.index - 1);
          dispatch({ type: 'back' });
        }}
        onClose={leave}
        answered={state.answered}
        firstTry={state.firstTry}
        screens={screens}
      />
      <div className="relative mx-2 mb-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.25rem] sm:mx-4 sm:mb-4">
        {/* The frame answers: its border and a glow from its foot. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 rounded-[1.25rem] border transition-colors duration-200"
          style={{ borderColor: verdictColor ?? 'rgb(255 255 255 / 0.12)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-48 transition-opacity duration-300"
          style={{
            opacity: verdictColor ? 0.22 : 0,
            background: `linear-gradient(to top, ${verdictColor ?? 'transparent'}, transparent)`,
          }}
        />
        {state.view === 'skillIntro' ? (
          <SkillIntro
            accent={accent}
            reduced={reduced}
            onDone={startPractice}
          />
        ) : (
          <>
            <div
              className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden"
              style={{
                maskImage:
                  'linear-gradient(to bottom, #000 calc(100% - 1.5rem), transparent)',
              }}
            >
              <div className="mx-auto flex w-full max-w-[52rem] flex-1 flex-col gap-4 px-4 pb-6 pt-5 sm:px-8 sm:pt-6">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={screen.id}
                    ref={headingRef}
                    tabIndex={-1}
                    className="flex flex-col gap-2.5 outline-none"
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
                        'max-w-[42rem] leading-7 text-white/90',
                        state.index >= practiceFrom
                          ? 'text-[1.0625rem] font-bold text-white'
                          : 'text-[1.0625rem]',
                      )}
                    >
                      <Rich text={screen.body} />
                    </p>
                  </motion.div>
                </AnimatePresence>

                <Stage
                  scene={scene}
                  setScene={setScene}
                  screen={screen}
                  accent={accent}
                  mix={mix}
                  locked={locked}
                  onIdentify={onIdentify}
                />

                {screen.caption && (
                  <p className="text-[0.8125rem] leading-5 text-white/55">
                    <Rich text={screen.caption} />
                  </p>
                )}

                {screen.kind === 'takeaway' && (
                  <div className="flex flex-col gap-3" data-takeaway>
                    <ul className="flex flex-col gap-1.5 text-[0.9375rem] leading-6 text-white/85">
                      {screen.points.map((point, i) => (
                        <li key={i} className="flex gap-2.5">
                          <Check
                            className="mt-1 size-4 shrink-0"
                            style={{ color: accent }}
                            aria-hidden
                          />
                          <span>
                            <Rich text={point} />
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div
                      className="rounded-2xl border p-4"
                      style={{ borderColor: `${accent}66` }}
                    >
                      <p
                        className="mb-1 text-xs font-bold uppercase tracking-[0.14em]"
                        style={{ color: accent }}
                      >
                        In your session
                      </p>
                      <p className="text-[0.9375rem] leading-6 text-white">
                        <Rich text={screen.inSession} />
                      </p>
                    </div>
                    <p className="text-[0.8125rem] leading-5 text-white/55">
                      <Rich text={screen.limits} /> <Rich text={screen.next} />
                    </p>
                  </div>
                )}

                {screen.kind === 'choose' && (
                  <div className="flex flex-col gap-3">
                    <p className="text-[1.0625rem] font-bold leading-7 text-white">
                      <Rich text={screen.question} />
                    </p>
                    <ChoiceList
                      screen={screen}
                      picked={state.picked}
                      eliminated={state.eliminated}
                      phase={state.phase}
                      correct={screen.correct}
                      onPick={(id) => dispatch({ type: 'pick', id })}
                    />
                  </div>
                )}

                {screen.kind === 'ab' && (
                  <div className="flex flex-col gap-3" data-ab>
                    <p className="text-[1.0625rem] font-bold leading-7 text-white">
                      <Rich text={screen.question} />
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(['a', 'b'] as const).map((side) => (
                        <button
                          key={side}
                          type="button"
                          aria-pressed={abSide === side}
                          onClick={() => listen(side)}
                          className={cn(
                            abSide === side ? WHITE_PILL_LG : OUTLINE_PILL,
                            'h-11 min-w-28 px-6 text-[0.9375rem]',
                          )}
                        >
                          Hear {side.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <div
                      role="radiogroup"
                      aria-label="Your answer"
                      className="flex flex-col gap-2"
                    >
                      {[
                        { id: 'a', text: `A: ${screen.choiceA}` },
                        { id: 'b', text: `B: ${screen.choiceB}` },
                        ...(screen.sameLabel
                          ? [{ id: 'same', text: screen.sameLabel }]
                          : []),
                      ].map((choice) => (
                        <button
                          key={choice.id}
                          type="button"
                          role="radio"
                          aria-checked={state.picked === choice.id}
                          disabled={
                            state.phase !== 'acting' ||
                            state.eliminated.includes(choice.id)
                          }
                          onClick={() =>
                            dispatch({ type: 'pick', id: choice.id })
                          }
                          className={cn(
                            'min-h-12 w-full rounded-xl border px-4 py-2.5 text-left text-[0.9375rem] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/60',
                            state.picked === choice.id
                              ? 'border-white bg-white/[0.1] text-white'
                              : 'border-white/20 text-white/90 hover:bg-white/[0.05]',
                            state.eliminated.includes(choice.id) &&
                              'border-white/10 text-white/35 line-through',
                          )}
                        >
                          {choice.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* The foot: what they did, then the groove and what's next. */}
            <div className="relative z-10 flex shrink-0 flex-col gap-2 px-4 pb-4 pt-2 sm:px-6 sm:pb-5">
              {feedback && (
                <motion.p
                  role="status"
                  data-feedback={state.phase}
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.16 }}
                  className="flex w-fit max-w-md gap-2 rounded-2xl px-3.5 py-2.5 text-[0.9375rem] font-bold leading-6 text-[#101012]"
                  style={{ backgroundColor: verdictColor ?? '#e8e8f0' }}
                >
                  {state.phase === 'wrong' ? (
                    <TriangleAlert
                      className="mt-1 size-4 shrink-0"
                      aria-hidden
                    />
                  ) : (
                    <Check className="mt-1 size-4 shrink-0" aria-hidden />
                  )}
                  <span>
                    <Rich text={feedback} />
                  </span>
                </motion.p>
              )}
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  {!screen.quiet && (
                    <>
                      <button
                        type="button"
                        aria-pressed={mix.playing}
                        aria-label={mix.playing ? 'Stop' : 'Play'}
                        disabled={!mix.ready}
                        onClick={() => (mix.playing ? mix.stop() : mix.play())}
                        className={cn(
                          OUTLINE_PILL,
                          'h-11 px-4 text-[0.9375rem] sm:px-5',
                        )}
                      >
                        {mix.playing ? (
                          <Square aria-hidden />
                        ) : (
                          <Play aria-hidden />
                        )}
                        <span className="max-sm:sr-only">
                          {mix.failed
                            ? 'Sound unavailable'
                            : !mix.ready
                              ? 'Loading…'
                              : mix.playing
                                ? 'Stop'
                                : 'Play'}
                        </span>
                      </button>
                      <TapToHear show={mix.needsTap} />
                    </>
                  )}
                </div>
                <div className="flex min-w-0 shrink-0 justify-end gap-2 max-sm:flex-1">
                  {!checked ? (
                    <button
                      ref={primaryRef}
                      type="button"
                      className={cn(WHITE_PILL_LG, 'min-w-44 max-sm:flex-1')}
                      onClick={onContinue}
                    >
                      Continue
                    </button>
                  ) : state.phase === 'acting' ? (
                    screen.kind === 'anatomy' ? null : (
                      <button
                        ref={primaryRef}
                        type="button"
                        disabled={!acted}
                        className={cn(
                          WHITE_PILL_LG,
                          'min-w-44 max-sm:flex-1 disabled:opacity-35',
                        )}
                        onClick={onCheck}
                      >
                        Check
                      </button>
                    )
                  ) : state.phase === 'wrong' ? (
                    <>
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
                      <button
                        ref={primaryRef}
                        type="button"
                        className={cn(WHITE_PILL_LG, 'max-sm:flex-1')}
                        onClick={() => dispatch({ type: 'tryAgain' })}
                      >
                        Try again
                      </button>
                    </>
                  ) : (
                    <>
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
                      <button
                        ref={primaryRef}
                        type="button"
                        className={cn(WHITE_PILL_LG, 'min-w-36 max-sm:flex-1')}
                        onClick={onContinue}
                      >
                        Continue
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <WhyDialog
        screen={screen as Screen<unknown>}
        open={whyOpen}
        onOpenChange={setWhyOpen}
      />
    </div>
  );
}
