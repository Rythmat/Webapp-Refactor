import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Play, Square } from 'lucide-react';
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
import { cn } from '@/components/utilities';
import { LearnRoutes } from '@/constants/routes';
import { XpRise } from '@/curriculum/flow/XpRise';
import {
  ChoiceList,
  FeedbackBubble,
  LessonTopBar,
  SkillIntro,
  TakeawayCard,
  VerdictFrame,
  WhyDialog,
} from '@/curriculum/guided/shell/LessonShell';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import { useLearnXp } from '@/hooks/data/experience/useLearnXp';
import {
  LessonKeyboardSlotContext,
  type LessonKeyboardSlot,
} from '@/learn/keyboard/lessonKeyboardSlot';
import { colorForKeyMode } from '@/lib/modeColorShift';
import type { AudioModule } from '../catalog';
import { LabVolumeRow, TapToHear } from '../lab/LabControls';
import {
  audioLessonId,
  lessonResumeIndex,
  useGuidedProgress,
} from '../lab/audioProgress';
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
import { initialPlayer, isSettled, playerReducer } from './playerMachine';
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

/**
 * Where a lesson belongs, for a course that isn't Audio's (owner, 2026-11-05:
 * Piano Fundamentals): its colour, its course page, and the id its progress
 * and XP are kept under.
 */
export interface PlayerHome {
  accentKey: string;
  /** The course page: closing and finishing go back to it. */
  href: string;
  /** `piano:fundamentals:meet-your-instrument`. */
  lessonKey: string;
}

const audioHome = (module: AudioModule, lessonId: string): PlayerHome => ({
  accentKey: module.accentKey,
  href: LearnRoutes.audioCourse({ module: module.id }),
  lessonKey: audioLessonId(module.id, lessonId),
});

export function LessonPlayer<S>({
  script,
  Stage,
  module,
  home: ownHome,
  lessonId,
  ratio,
  dock = false,
}: {
  script: LessonScript<S>;
  Stage: ComponentType<StageProps<S>>;
  lessonId: string;
  ratio: readonly [number, number];
  /** A keyboard docked along the foot (LessonKeyboard renders into it). */
  dock?: boolean;
} & (
  | { module: AudioModule; home?: undefined }
  | { home: PlayerHome; module?: undefined }
)) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const reduced = useReducedMotion() ?? false;
  const home = useMemo(
    () => ownHome ?? audioHome(module!, lessonId),
    [ownHome, module, lessonId],
  );
  const accent = colorForKeyMode(home.accentKey);
  const screens = useMemo(() => allScreens(script), [script]);
  const practiceFrom = practiceStart(script);
  const ids = useMemo(() => screens.map((s) => s.id), [screens]);
  const { screenDone, finish } = useGuidedProgress(home.lessonKey);
  const mix = useMixEngine(script.needs);
  /** No groove at all (a keyboard lesson): no Play, no volume, no Space. */
  const silent = script.needs.length === 0;
  const awardXp = useLearnXp();
  const [keyboardEl, setKeyboardEl] = useState<HTMLElement | null>(null);
  const keyboardSlot = useMemo<LessonKeyboardSlot>(
    () => ({ el: keyboardEl, setEl: setKeyboardEl }),
    [keyboardEl],
  );

  const [start] = useState(() => {
    const asked = ids.indexOf(params.get('screen') ?? '');
    if (asked >= 0) return asked;
    return lessonResumeIndex(
      useTutorialProgressStore.getState().completedAt,
      home.lessonKey,
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
        void awardXp('answer', `${home.lessonKey}:${screen.id}`);
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
        void awardXp('answer', `${home.lessonKey}:${screen.id}`);
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
  }, [
    awardXp,
    correctChoice,
    home.lessonKey,
    mix,
    scene,
    screen,
    showAnswer,
    state.picked,
  ]);

  const onIdentify = useCallback(
    (term: string) => {
      if (state.phase !== 'acting') return;
      if (screen.kind !== 'anatomy' || screen.mode !== 'identify') return;
      if (term === screen.target) {
        void awardXp('answer', `${home.lessonKey}:${screen.id}`);
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
    [awardXp, home.lessonKey, screen, state.phase],
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
      if (event.key === ' ' && tag !== 'BUTTON' && !silent) {
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
    silent,
    state.eliminated,
    state.index,
    state.phase,
    state.view,
    whyOpen,
  ]);

  const leave = () => navigate(home.href);

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
          navigate(home.href, {
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

  const locked = isSettled(state.phase);

  return (
    <LessonKeyboardSlotContext.Provider value={dock ? keyboardSlot : null}>
      <div
        className="relative flex h-full min-h-0 flex-col bg-[#101012] font-sans text-[#e8e8f0]"
        data-lesson-player={script.id}
        data-screen={screen.id}
        data-phase={state.phase}
      >
        <LessonTopBar
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
          volume={silent ? undefined : <LabVolumeRow />}
        />
        <XpRise />
        <VerdictFrame phase={state.phase}>
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
                    <TakeawayCard
                      accent={accent}
                      points={screen.points}
                      inSession={screen.inSession}
                      limits={screen.limits}
                      next={screen.next}
                    />
                  )}

                  {screen.kind === 'choose' && (
                    <div className="flex flex-col gap-3">
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
                  <FeedbackBubble
                    phase={state.phase}
                    text={feedback}
                    reduced={reduced}
                  />
                )}
                <div className="flex items-center justify-between gap-2 sm:gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {!screen.quiet && !silent && (
                      <>
                        <button
                          type="button"
                          aria-pressed={mix.playing}
                          aria-label={mix.playing ? 'Stop' : 'Play'}
                          disabled={!mix.ready}
                          onClick={() =>
                            mix.playing ? mix.stop() : mix.play()
                          }
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
                          className={cn(
                            WHITE_PILL_LG,
                            'min-w-36 max-sm:flex-1',
                          )}
                          onClick={onContinue}
                        >
                          Continue
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {/* The keyboard, docked along the foot as in every lesson. */}
              {dock && (
                <div
                  ref={setKeyboardEl}
                  data-lesson-keyboard-dock
                  className="relative z-10 shrink-0 border-t border-white/[0.06] bg-[#0c0c0e] empty:hidden"
                />
              )}
            </>
          )}
        </VerdictFrame>
        <WhyDialog
          why={isChecked(screen) ? screen.why : null}
          open={whyOpen}
          onOpenChange={setWhyOpen}
        />
      </div>
    </LessonKeyboardSlotContext.Provider>
  );
}
