/**
 * Interactive lesson container for Piano Fundamentals sections.
 *
 * Renders step-by-step activities with MIDI input, real-time evaluation,
 * and success feedback. Follows the GenreLessonContainer UI patterns.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { triggerPianoAttack, triggerPianoRelease } from '@/audio/pianoSampler';
import { SavedRollViewSwitch } from '@/components/notation/RollViewToggle';
import { CurriculumRoutes, SettingsRoutes } from '@/constants/routes';
import { usePlayNote } from '@/contexts/PianoContext';
import type { PlaybackEvent } from '@/contexts/PlaybackContext/helpers';
import GenrePianoRoll from '@/curriculum/components/GenrePianoRoll';
import { loadPianoFundamentals } from '@/curriculum/data/activityFlows';
import {
  evaluateStep,
  isStepNote,
  pitchClassName,
  noteName,
} from '@/curriculum/engine/fundamentalsEvaluator';
import { midiToPitchName } from '@/curriculum/engine/genreGeneration/resolveStepContent';
import {
  Primary,
  Secondary,
  type Zones,
} from '@/curriculum/guitar/layout/GuitarActionBar';
import type { BarState, NavStep } from '@/curriculum/guitar/layout/types';
import { useFundamentalsFlow } from '@/curriculum/hooks/useFundamentalsFlow';
import type {
  FundamentalsFlow,
  FundamentalsSection,
} from '@/curriculum/types/fundamentals';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import type { MidiNoteEvent } from '@/hooks/music/useMidiInput';
import { LessonKeyboard } from '@/learn/components/LessonKeyboard';
import {
  LearnInputProvider,
  useLearnInputStable,
} from '@/learn/context/LearnInputContext';
import type { PlayedKeys } from '@/learn/keyboard/playedKeys';
import {
  TheoryLessonLayout,
  TheoryResultPanel,
} from '../Games/TheoryLessonLayout';
import '@/components/learn/learn.css';

// ---------------------------------------------------------------------------
// Note name helpers for quiz display
// ---------------------------------------------------------------------------

const PITCH_CLASS_DISPLAY: Record<number, string> = {
  0: 'C',
  1: 'C# / Db',
  2: 'D',
  3: 'D# / Eb',
  4: 'E',
  5: 'F',
  6: 'F# / Gb',
  7: 'G',
  8: 'G# / Ab',
  9: 'A',
  10: 'A# / Bb',
  11: 'B',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FundamentalsLessonContainerProps {
  sectionId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FundamentalsLessonContainer(
  props: FundamentalsLessonContainerProps,
) {
  return (
    <LearnInputProvider detectionMode="monophonic">
      <FundamentalsLessonContainerInner {...props} />
    </LearnInputProvider>
  );
}

function FundamentalsLessonContainerInner({
  sectionId,
}: FundamentalsLessonContainerProps) {
  const navigate = useNavigate();
  const playNote = usePlayNote();
  // The settings sheet's audio timing (TheoryLessonLayout).
  const outputLatencyMs = useSettingsStore((st) => st.outputLatencyMs);
  const [flow, setFlow] = useState<FundamentalsFlow | null>(null);
  const accentColor = '#7ecfcf';

  // Load fundamentals data
  useEffect(() => {
    let cancelled = false;
    loadPianoFundamentals().then((data) => {
      if (!cancelled) setFlow(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const section: FundamentalsSection | null = useMemo(
    () => flow?.sections.find((s) => s.id === sectionId) ?? null,
    [flow, sectionId],
  );

  const {
    currentStepIndex,
    currentStep,
    totalSteps,
    completedSteps,
    isPassed,
    isSectionComplete,
    evalResult,
    quizState,
    onNoteReceived,
    advance,
    goToStep,
    resetStep,
  } = useFundamentalsFlow(section);

  const {
    subscribeNoteOn,
    subscribeNoteOff,
    start: startInput,
    stop: stopInput,
  } = useLearnInputStable();

  // Preview / Practice / Performance gating — mirrors the Demo/Practice/
  // Performance pattern used by genre lessons, adapted for Fundamentals'
  // single-note (non-timeline) steps.
  const [activityState, setActivityState] = useState<
    'preview' | 'practice' | 'performance'
  >('preview');
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [demoHighlightMidis, setDemoHighlightMidis] = useState<Set<number>>(
    new Set(),
  );
  const demoTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stopDemo = useCallback(() => {
    demoTimeoutsRef.current.forEach(clearTimeout);
    demoTimeoutsRef.current = [];
    setIsPlayingDemo(false);
    setDemoHighlightMidis(new Set());
  }, []);

  // Reset to the preview gate whenever the step changes (advance, retry, or dot click)
  useEffect(() => {
    stopDemo();
    setActivityState('preview');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIndex]);

  // The keys held right now: the accent colour when the step asks for them,
  // null when it doesn't (see playedKeys.ts).
  const [playedKeys, setPlayedKeys] = useState<PlayedKeys>(() => new Map());

  const handleNoteOff = useCallback((event: MidiNoteEvent) => {
    // Only the sampler's own sound to stop — an acoustic piano stops itself
    if (event.source !== 'audio') {
      void triggerPianoRelease(midiToPitchName(event.number));
    }
    setPlayedKeys((prev) => {
      const next = new Map(prev);
      next.delete(event.number);
      return next;
    });
  }, []);

  // MIDI input handling — sound and light the key in every state, so the
  // student hears and sees their keyboard before pressing start too; evaluate
  // only once they have.
  const handleNoteOn = useCallback(
    (event: MidiNoteEvent) => {
      if (event.velocity === 0) {
        handleNoteOff(event);
        return;
      }
      // Only play sampler sound for MIDI input — acoustic piano already produces sound
      if (event.source !== 'audio') {
        void triggerPianoAttack(midiToPitchName(event.number), event.velocity);
      }
      // A quiz is judged against the question on screen once it's running.
      const quizExpected =
        activityState !== 'preview' && quizState && !quizState.done
          ? quizState.queue[quizState.currentIndex]
          : undefined;
      const right =
        !!currentStep &&
        isStepNote(currentStep.midiEval, event.number, quizExpected);
      setPlayedKeys((prev) =>
        new Map(prev).set(event.number, right ? accentColor : null),
      );

      if (activityState === 'preview') return;
      onNoteReceived(event.number, activityState === 'performance');
    },
    [handleNoteOff, onNoteReceived, activityState, currentStep, quizState],
  );

  useEffect(() => {
    startInput();
    return () => stopInput();
  }, [startInput, stopInput]);

  useEffect(() => {
    const unsubOn = subscribeNoteOn(handleNoteOn);
    const unsubOff = subscribeNoteOff(handleNoteOff);
    return () => {
      unsubOn();
      unsubOff();
    };
  }, [subscribeNoteOn, subscribeNoteOff, handleNoteOn, handleNoteOff]);

  // Keyboard click handler (fallback for users without MIDI controller)
  const handleKeyClick = useCallback(
    (midi: number) => {
      if (activityState === 'preview') return;
      playNote(midi);
      onNoteReceived(midi, activityState === 'performance');
    },
    [playNote, onNoteReceived, activityState],
  );

  // Back to overview
  const handleBackToOverview = useCallback(() => {
    navigate(CurriculumRoutes.genre({ genre: 'piano-fundamentals' }));
  }, [navigate]);

  // Compute keyboard range from midiEval
  const { startC, endC } = useMemo(() => {
    if (!currentStep) return { startC: 2, endC: 7 };
    const rule = currentStep.midiEval;

    switch (rule.type) {
      case 'range':
        return {
          startC: Math.max(1, Math.floor(rule.min / 12) - 1),
          endC: Math.min(8, Math.ceil(rule.max / 12) + 1),
        };
      case 'multi_zone': {
        const allMins = rule.zones.map((z) => z.min);
        const allMaxs = rule.zones.map((z) => z.max);
        return {
          startC: Math.max(1, Math.floor(Math.min(...allMins) / 12) - 1),
          endC: Math.min(8, Math.ceil(Math.max(...allMaxs) / 12) + 1),
        };
      }
      case 'simultaneous': {
        const mn = Math.min(...rule.midi);
        const mx = Math.max(...rule.midi);
        return {
          startC: Math.max(1, Math.floor(mn / 12) - 1),
          endC: Math.min(8, Math.ceil(mx / 12) + 1),
        };
      }
      default:
        return { startC: 2, endC: 7 };
    }
  }, [currentStep]);

  // Highlight notes on keyboard based on midiEval
  const highlightNotes = useMemo<PlaybackEvent[]>(() => {
    if (!currentStep || isPassed) return [];
    const rule = currentStep.midiEval;
    const now = Date.now();

    switch (rule.type) {
      case 'exact_midi':
      case 'simultaneous':
        return rule.midi.map((midi, i) => ({
          id: `hl-${i}`,
          type: 'note' as const,
          midi,
          time: now,
          duration: 999,
          velocity: 0.3,
          color: '#7ecfcf',
        }));
      case 'sequence':
        if (rule.octaveAware) {
          return rule.notes.map((midi, i) => ({
            id: `hl-${i}`,
            type: 'note' as const,
            midi,
            time: now,
            duration: 999,
            velocity: 0.3,
            color: '#7ecfcf',
          }));
        }
        return [];
      default:
        return [];
    }
  }, [currentStep, isPassed]);

  // Target MIDI notes this step expects — used by the preview modal's Demo
  // button. Only defined for the step types highlightNotes already covers
  // (exact_midi, simultaneous, octave-aware sequence); quiz/range/multi_zone
  // steps have no single "answer" to demo.
  const demoTargetMidis = useMemo(
    () => highlightNotes.map((n) => n.midi),
    [highlightNotes],
  );
  const canDemo = demoTargetMidis.length > 0;

  // What practice lights: the next note of a sequence, the notes still to
  // find, a chord whole. Before the first note, what the rule asks first.
  const practiceDue = useMemo(() => {
    const rule = currentStep?.midiEval;
    if (!rule || rule.type === 'quiz') return new Set<number>();
    return new Set((evalResult ?? evaluateStep(rule, [])).due ?? []);
  }, [currentStep, evalResult]);

  // Every note the step could ask for, so the keyboard shows all of it: the
  // exact targets, or the ends of the zone a range step plays in.
  const keyboardTargets = useMemo(() => {
    const rule = currentStep?.midiEval;
    if (!rule) return demoTargetMidis;
    switch (rule.type) {
      case 'exact_midi':
      case 'simultaneous':
        return rule.midi;
      case 'sequence':
        return rule.octaveAware ? rule.notes : demoTargetMidis;
      case 'range':
        return [rule.min, rule.max];
      case 'multi_zone':
        return rule.zones.flatMap((z) => [z.min, z.max]);
      case 'ordered_ranges':
        return rule.phases.flatMap((p) => [p.min, p.max]);
      case 'quiz':
        return rule.notePool;
      default:
        return demoTargetMidis;
    }
  }, [currentStep, demoTargetMidis]);

  // Piano Roll — reuses the genre lesson's roll to preview the target note(s)
  // for this step. Fundamentals has no note-timeline/tempo data, so this is a
  // static (non-scrolling) rendering, not a live playhead like genre lessons.
  // Only steps with a fixed target (the same ones highlightNotes covers) have
  // anything meaningful to show; other step types render no roll.
  const pianoRollEvents = useMemo(() => {
    if (demoTargetMidis.length === 0) return [];
    const isSimultaneous = currentStep?.midiEval.type === 'simultaneous';
    const NOTE_GAP_TICKS = 480; // 1 beat between notes, matches Demo's staggered playback
    const NOTE_DURATION_TICKS = 400;
    return demoTargetMidis.map((midi, i) => ({
      id: `fundamentals_target_${i}`,
      pitchName: midiToPitchName(midi),
      midi,
      startTicks: isSimultaneous ? 0 : i * NOTE_GAP_TICKS,
      durationTicks: NOTE_DURATION_TICKS,
      velocity: 80,
      color: `${accentColor}b3`,
    }));
  }, [demoTargetMidis, currentStep, accentColor]);

  const pianoRollBars = useMemo(() => {
    if (pianoRollEvents.length === 0) return 1;
    const lastEndTick = Math.max(
      ...pianoRollEvents.map((e) => e.startTicks + e.durationTicks),
    );
    return Math.max(1, Math.ceil(lastEndTick / 1920));
  }, [pianoRollEvents]);

  const playDemo = useCallback(async () => {
    if (demoTargetMidis.length === 0) return;
    stopDemo();
    setIsPlayingDemo(true);

    const NOTE_GAP_MS = 500;
    // Each key lit while it sounds; a chord's build up and stay together.
    const isChord = currentStep?.midiEval.type === 'simultaneous';
    demoTargetMidis.forEach((midi, i) => {
      const t = setTimeout(() => {
        playNote(midi);
        setDemoHighlightMidis((prev) =>
          isChord ? new Set(prev).add(midi) : new Set([midi]),
        );
      }, i * NOTE_GAP_MS);
      demoTimeoutsRef.current.push(t);
    });

    const totalMs = demoTargetMidis.length * NOTE_GAP_MS + 400;
    const endTimeout = setTimeout(() => {
      setIsPlayingDemo(false);
      setDemoHighlightMidis(new Set());
    }, totalMs);
    demoTimeoutsRef.current.push(endTimeout);
  }, [currentStep, demoTargetMidis, playNote, stopDemo]);

  const handleStartPractice = useCallback(() => {
    stopDemo();
    resetStep();
    setActivityState('practice');
  }, [stopDemo, resetStep]);

  const handleStartPerformance = useCallback(() => {
    stopDemo();
    resetStep();
    setActivityState('performance');
  }, [stopDemo, resetStep]);

  // Practice runs evaluate for live feedback but don't count toward the
  // step's checkmark — only a Play Now (Performance) pass does. When a
  // practice attempt meets the step criteria, prompt the user to try it
  // for real instead of silently marking it complete.
  const practiceComplete = useMemo(() => {
    if (activityState !== 'practice' || isPassed || !currentStep) return false;
    if (currentStep.midiEval.type === 'quiz') {
      return quizState?.done ?? false;
    }
    return evalResult?.passed ?? false;
  }, [activityState, isPassed, currentStep, quizState, evalResult]);

  // Quiz display note
  const quizDisplayNote = useMemo(() => {
    if (!quizState || quizState.done || !currentStep) return null;
    if (currentStep.midiEval.type !== 'quiz') return null;

    const noteValue = quizState.queue[quizState.currentIndex];
    if (noteValue == null) return null;

    if (currentStep.midiEval.octaveAware) {
      return noteName(noteValue);
    }
    return PITCH_CLASS_DISPLAY[noteValue] ?? pitchClassName(noteValue);
  }, [quizState, currentStep]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Loading
  if (!flow) {
    return (
      <div
        className="learn-root p-8"
        style={{ color: 'var(--color-text-dim)' }}
      >
        Loading...
      </div>
    );
  }

  if (!section) {
    return (
      <div
        className="learn-root p-8"
        style={{ color: 'var(--color-text-dim)' }}
      >
        Section not found.
      </div>
    );
  }

  // ── The one-page screen (TheoryLessonLayout, as Theory's) ─────────────────
  // No start card: a step waits in its preview with its notes lit, Demo /
  // Practice / Play Now in the bar under the keyboard. A pass, the practice
  // prompt, a missed quiz and the section's end take the activity's place,
  // their buttons in the bar. The direction is in About this step.

  const sectionIdx = flow.sections.findIndex((s) => s.id === sectionId);
  const nextSection = flow.sections[sectionIdx + 1] ?? null;
  const quizFailed =
    activityState === 'performance' &&
    currentStep?.midiEval.type === 'quiz' &&
    !!quizState?.done &&
    !isPassed;
  const passMarkPct =
    currentStep?.midiEval.type === 'quiz'
      ? Math.round(
          (currentStep.midiEval.passThreshold / currentStep.midiEval.count) *
            100,
        )
      : 100;
  const continueLabel =
    currentStepIndex < totalSteps - 1 ? 'Continue' : 'Finish Section';

  const backToPreview = () => {
    stopDemo();
    resetStep();
    setActivityState('preview');
  };

  const navSteps: NavStep[] = section.steps.map((step, i) => ({
    code: String(i + 1),
    title: step.activity,
    subsection: section.name,
    status: completedSteps.has(i) ? 'passed' : 'todo',
  }));

  const result = isSectionComplete
    ? {
        heading: 'Section Complete!',
        status: null,
        lines: [`You completed “${section.name}”.`],
      }
    : isPassed && currentStep
      ? {
          heading: 'Great job!',
          status: 'Passed',
          lines: [
            currentStep.successFeedback,
            ...(evalResult?.progress ? [evalResult.progress] : []),
          ],
        }
      : practiceComplete
        ? {
            heading: 'Nice practicing!',
            status: null,
            lines: ['Try it in Play Now to complete this step.'],
          }
        : quizFailed
          ? {
              heading: 'Not quite yet',
              status: `Not yet · ${passMarkPct}% passes`,
              lines: [evalResult?.progress ?? 'Not enough correct answers.'],
            }
          : null;

  const barCustom: Zones | null = isSectionComplete
    ? {
        lead: null,
        meta: null,
        actions: (
          <>
            <Secondary onClick={handleBackToOverview}>
              Back to Overview
            </Secondary>
            {nextSection && (
              <Primary
                onClick={() =>
                  navigate(
                    CurriculumRoutes.fundamentalsSection({
                      sectionId: nextSection.id,
                    }),
                  )
                }
              >
                Continue to {nextSection.name}
              </Primary>
            )}
          </>
        ),
      }
    : isPassed
      ? {
          lead: null,
          meta: null,
          actions: (
            <>
              <Secondary onClick={backToPreview}>Restart</Secondary>
              <Primary onClick={advance}>{continueLabel}</Primary>
            </>
          ),
        }
      : practiceComplete
        ? {
            lead: null,
            meta: null,
            actions: (
              <>
                <Secondary onClick={handleStartPractice}>
                  Practice Again
                </Secondary>
                <Primary onClick={handleStartPerformance}>Play Now</Primary>
              </>
            ),
          }
        : quizFailed
          ? {
              lead: null,
              meta: null,
              actions: (
                <Primary onClick={handleStartPerformance}>Try Again</Primary>
              ),
            }
          : activityState === 'preview' && !canDemo
            ? {
                // Nothing to demo on a range or quiz step: no dead button.
                lead: null,
                meta: null,
                actions: (
                  <>
                    <Secondary onClick={handleStartPractice}>
                      Practice
                    </Secondary>
                    <Primary onClick={handleStartPerformance}>Play Now</Primary>
                  </>
                ),
                corner: (
                  <span className="whitespace-nowrap text-xs text-white/45">
                    Pass = {passMarkPct}%
                  </span>
                ),
              }
            : null;

  const barState: BarState = result
    ? 'result'
    : activityState === 'practice'
      ? 'practice'
      : activityState === 'performance'
        ? 'performance'
        : 'preview';

  const content = (
    <div className="flex flex-col gap-4">
      {/* Quiz display */}
      {quizDisplayNote && (
        <div
          className="flex flex-col items-center gap-2 self-center rounded-xl px-8 py-6"
          style={{
            background: 'rgba(126, 207, 207, 0.08)',
            border: `1px solid ${accentColor}`,
          }}
        >
          <span className="text-xs font-medium uppercase tracking-wider text-white/55">
            Play this note
          </span>
          <span className="text-4xl font-bold" style={{ color: accentColor }}>
            {quizDisplayNote}
          </span>
          {quizState && (
            <span className="text-xs text-white/55">
              {quizState.currentIndex + 1} of {quizState.queue.length}
              {' — '}
              {quizState.correct} correct
            </span>
          )}
        </div>
      )}

      {/* Progress on the step, while it's being played */}
      {evalResult && currentStep?.midiEval.type !== 'quiz' && (
        <p className="text-center text-sm text-white/55">
          {evalResult.progress}
        </p>
      )}

      {/* Piano Roll — static preview of the step's target note(s).
          Fundamentals has no timeline/tempo data, so this doesn't scroll
          like genre lessons' roll; it just shows the shape of the target. */}
      {pianoRollEvents.length > 0 && (
        <div className="w-full" style={{ height: '180px', flexShrink: 0 }}>
          <GenrePianoRoll
            key={`fundamentals-roll-${currentStepIndex}`}
            showViewToggle={false}
            events={pianoRollEvents}
            bars={pianoRollBars}
            beatsPerBar={4}
            subdivision={1}
            rowHeight={140}
            // The step's own notes and a few keys either side, so each lane
            // is tall enough to read (the octaves the keyboard spans made
            // them slivers).
            midiRangeMin={
              demoTargetMidis.length
                ? Math.min(...demoTargetMidis) - 4
                : startC * 12
            }
            midiRangeMax={
              demoTargetMidis.length
                ? Math.max(...demoTargetMidis) + 4
                : (endC + 1) * 12 - 1
            }
            inTime={false}
            isPlaying={false}
            keyColor={accentColor}
            targetMidiSet={new Set(demoTargetMidis)}
          />
        </div>
      )}

      <LessonKeyboard
        minHeight={238}
        targetMidis={keyboardTargets}
        enableClick
        enableMidiInterface={false}
        onKeyClick={handleKeyClick}
        playingNotes={
          // Every target only while the step waits; then just the notes in
          // sequence: the demo's as they sound, what's due next in practice,
          // nothing in Play Now.
          isPlayingDemo
            ? highlightNotes.filter((n) => demoHighlightMidis.has(n.midi))
            : activityState === 'practice'
              ? highlightNotes.filter((n) => practiceDue.has(n.midi))
              : activityState === 'performance'
                ? []
                : highlightNotes
        }
        playedKeys={playedKeys}
        activeWhiteKeyColor={accentColor}
        activeBlackKeyColor={accentColor}
      />
    </div>
  );

  return (
    <div
      className="learn-root flex min-h-screen w-full flex-col"
      style={{ backgroundColor: '#101012', color: 'var(--color-text)' }}
    >
      <TheoryLessonLayout
        header={{
          crumbs: [
            { label: 'Piano Fundamentals', onClick: handleBackToOverview },
          ],
          keyLabel: section.name,
          keyColor: accentColor,
          subsection: '',
          activity: currentStep?.activity ?? section.name,
        }}
        nav={{
          sections: [],
          onSection: () => {},
          steps: navSteps,
          index: currentStepIndex,
          goToStep,
          practiceTrack: null,
          extra:
            pianoRollEvents.length > 0 ? <SavedRollViewSwitch /> : undefined,
        }}
        content={content}
        panel={result ? <TheoryResultPanel {...result} /> : null}
        bar={{
          state: barState,
          run: {
            state:
              barState === 'practice' || barState === 'performance'
                ? barState
                : 'preview',
            restartingPass: false,
            instruction: currentStep?.direction ?? '',
            listen: { mode: 'waitForMe', passMarkPct },
            loading: false,
            demo: {
              playing: isPlayingDemo,
              play: () => void playDemo(),
              stop: stopDemo,
            },
            practise: handleStartPractice,
            playNow: handleStartPerformance,
            back: backToPreview,
            stopTake: backToPreview,
            hint: null,
          },
          tempo: null,
          practice: { presets: [] },
          result: null,
          offer: null,
          custom: barCustom,
        }}
        about={{
          activity: currentStep?.activity ?? section.name,
          instruction: currentStep?.direction ?? '',
          chords: [],
          key: null,
        }}
        audio={{
          outputLatencyMs,
          openAudioTiming: () => navigate(`${SettingsRoutes.root()}/audio`),
        }}
        announcement={
          result
            ? [result.heading, result.status].filter(Boolean).join('. ')
            : ''
        }
      />
    </div>
  );
}
