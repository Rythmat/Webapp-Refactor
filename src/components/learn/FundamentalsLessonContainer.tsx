/**
 * Interactive lesson container for Piano Fundamentals sections.
 *
 * Renders step-by-step activities with MIDI input, real-time evaluation,
 * and success feedback. Follows the GenreLessonContainer UI patterns.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import { CurriculumRoutes } from '@/constants/routes';
import { usePlayNote } from '@/contexts/PianoContext';
import type { PlaybackEvent } from '@/contexts/PlaybackContext/helpers';
import GenrePianoRoll from '@/curriculum/components/GenrePianoRoll';
import { loadPianoFundamentals } from '@/curriculum/data/activityFlows';
import {
  pitchClassName,
  noteName,
} from '@/curriculum/engine/fundamentalsEvaluator';
import { midiToPitchName } from '@/curriculum/engine/genreGeneration/resolveStepContent';
import { useFundamentalsFlow } from '@/curriculum/hooks/useFundamentalsFlow';
import type {
  FundamentalsFlow,
  FundamentalsSection,
} from '@/curriculum/types/fundamentals';
import { LessonVolumeDial } from '@/learn/components/LessonVolumeDial';
import {
  LearnInputProvider,
  useLearnInputStable,
} from '@/learn/context/LearnInputContext';
import { HeaderBar } from '../ClassroomLayout/HeaderBar';
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

  // MIDI input handling — play sound and evaluate
  const handleNoteOn = useCallback(
    (event: { number: number; source?: 'midi' | 'audio' }) => {
      if (activityState === 'preview') return;
      // Only play sampler sound for MIDI input — acoustic piano already produces sound
      if (event.source !== 'audio') {
        playNote(event.number);
      }
      onNoteReceived(event.number, activityState === 'performance');
    },
    [playNote, onNoteReceived, activityState],
  );

  useEffect(() => {
    startInput();
    return () => stopInput();
  }, [startInput, stopInput]);

  useEffect(() => {
    return subscribeNoteOn(handleNoteOn);
  }, [subscribeNoteOn, handleNoteOn]);

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
    demoTargetMidis.forEach((midi, i) => {
      const t = setTimeout(() => {
        playNote(midi);
        setDemoHighlightMidis((prev) => new Set(prev).add(midi));
      }, i * NOTE_GAP_MS);
      demoTimeoutsRef.current.push(t);
    });

    const totalMs = demoTargetMidis.length * NOTE_GAP_MS + 400;
    const endTimeout = setTimeout(() => {
      setIsPlayingDemo(false);
      setDemoHighlightMidis(new Set());
    }, totalMs);
    demoTimeoutsRef.current.push(endTimeout);
  }, [demoTargetMidis, playNote, stopDemo]);

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

  // Section complete screen
  if (isSectionComplete) {
    const sectionIdx = flow.sections.findIndex((s) => s.id === sectionId);
    const nextSection = flow.sections[sectionIdx + 1] ?? null;

    return (
      <div
        className="learn-root flex min-h-screen w-full flex-col"
        style={{
          backgroundColor: 'var(--color-bg)',
          color: 'var(--color-text)',
        }}
      >
        <HeaderBar title="Piano Fundamentals" />
        <div className="flex min-h-[60vh] items-center justify-center p-4">
          <div
            className="glass-panel w-full max-w-3xl rounded-2xl p-6"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--glass-shadow)',
            }}
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <h1
                className="text-2xl font-semibold"
                style={{ color: 'var(--color-text)' }}
              >
                Section Complete!
              </h1>
              <p className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
                You completed &ldquo;{section.name}&rdquo;.
              </p>
            </div>
            <div className="mt-6 grid gap-4">
              {nextSection && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      CurriculumRoutes.fundamentalsSection({
                        sectionId: nextSection.id,
                      }),
                    )
                  }
                  className="glass-panel-sm rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors duration-150"
                  style={{
                    background: 'rgba(126, 207, 207, 0.12)',
                    border: `1px solid ${accentColor}`,
                    color: accentColor,
                  }}
                >
                  Continue to: {nextSection.name}
                </button>
              )}
              <button
                type="button"
                onClick={handleBackToOverview}
                className="glass-panel-sm rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors duration-150"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                Back to Overview
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main lesson UI
  return (
    <div
      className="learn-root flex min-h-screen w-full flex-col"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      <HeaderBar title="Piano Fundamentals" />

      {/* Info bar */}
      <div
        className="glass-panel-sm flex items-center justify-between px-4 py-3"
        style={{
          borderBottom: '1px solid var(--color-border)',
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        <div className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
          {section.name}
        </div>
        <div className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
          Step {currentStepIndex + 1} of {totalSteps}
        </div>
      </div>

      {/* Step progress dots */}
      <div className="flex items-center gap-1.5 px-4 py-3">
        {section.steps.map((step, i) => {
          const isCompleted = completedSteps.has(i);
          const isCurrent = i === currentStepIndex;

          if (isCompleted) {
            return (
              <button
                key={i}
                type="button"
                onClick={() => goToStep(i)}
                aria-label={`Go to step ${i + 1} — completed`}
                title={`${step.activity} ✓ Passed`}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: `1.5px solid ${accentColor}`,
                  background: `${accentColor}22`,
                  color: accentColor,
                  fontSize: '10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                &#10003;
              </button>
            );
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => goToStep(i)}
              aria-label={`Go to step ${i + 1}`}
              style={{
                width: isCurrent ? '24px' : '16px',
                height: '6px',
                borderRadius: '3px',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                background: isCurrent ? accentColor : 'rgba(255,255,255,0.1)',
                transition: 'all 0.2s',
                flexShrink: 0,
              }}
            />
          );
        })}
        <span
          className="ml-2 text-xs"
          style={{ color: 'var(--color-text-dim)' }}
        >
          {currentStepIndex + 1}/{totalSteps}
        </span>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col items-center gap-6 overflow-y-auto px-4 pb-8">
        {/* Activity name */}
        {currentStep && (
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            {currentStep.activity}
          </h2>
        )}

        {/* Direction card */}
        {currentStep && (
          <div
            className="glass-panel-sm w-full max-w-2xl rounded-xl p-5"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--color-border)',
            }}
          >
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'var(--color-text)' }}
            >
              {currentStep.direction}
            </p>
          </div>
        )}

        {/* Interactive area — preview modal overlays this until a mode is chosen */}
        <div
          className="flex w-full max-w-3xl flex-col items-center gap-6"
          style={{ position: 'relative' }}
        >
          {/* Preview modal — Demo / Practice / Performance gate */}
          {activityState === 'preview' && currentStep && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(17,17,17,0.88)',
                borderRadius: '16px',
                zIndex: 40,
              }}
            >
              <div
                style={{
                  maxWidth: '420px',
                  width: '100%',
                  padding: '28px',
                  borderRadius: '16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid #444',
                  textAlign: 'center',
                }}
              >
                <h2
                  style={{
                    fontSize: '20px',
                    fontWeight: 600,
                    marginBottom: '10px',
                    color: '#fff',
                  }}
                >
                  Ready to start?
                </h2>
                <p
                  style={{
                    fontSize: '13px',
                    color: '#aaa',
                    marginBottom: '20px',
                    lineHeight: 1.5,
                  }}
                >
                  {currentStep.direction}
                </p>
                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    justifyContent: 'center',
                  }}
                >
                  {canDemo && (
                    <button
                      type="button"
                      onClick={() => void playDemo()}
                      disabled={isPlayingDemo}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '24px',
                        border: '1px solid #444',
                        background: isPlayingDemo ? '#1a1a1a' : '#2a2a2a',
                        color: isPlayingDemo ? '#666' : '#fff',
                        fontSize: '13px',
                        cursor: isPlayingDemo ? 'default' : 'pointer',
                      }}
                    >
                      {isPlayingDemo ? '◼ Playing...' : '▶ Demo'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleStartPractice}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '24px',
                      border: '1px solid #555',
                      background: 'transparent',
                      color: '#eee',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Practice
                  </button>
                  <button
                    type="button"
                    onClick={handleStartPerformance}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '24px',
                      border: 'none',
                      background: accentColor,
                      color: '#111',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Play Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quiz display */}
          {quizDisplayNote && (
            <div
              className="flex flex-col items-center gap-2 rounded-xl px-8 py-6"
              style={{
                background: 'rgba(126, 207, 207, 0.08)',
                border: `1px solid ${accentColor}`,
              }}
            >
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--color-text-dim)' }}
              >
                Play this note
              </span>
              <span
                className="text-4xl font-bold"
                style={{ color: accentColor }}
              >
                {quizDisplayNote}
              </span>
              {quizState && (
                <span
                  className="text-xs"
                  style={{ color: 'var(--color-text-dim)' }}
                >
                  {quizState.currentIndex + 1} of {quizState.queue.length}
                  {' — '}
                  {quizState.correct} correct
                </span>
              )}
            </div>
          )}

          {/* Progress indicator */}
          {evalResult && !isPassed && currentStep?.midiEval.type !== 'quiz' && (
            <div className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
              {evalResult.progress}
            </div>
          )}

          {/* Piano Roll — static preview of the step's target note(s).
              Fundamentals has no timeline/tempo data, so this doesn't scroll
              like genre lessons' roll; it just shows the shape of the target. */}
          {pianoRollEvents.length > 0 && (
            <div className="w-full" style={{ height: '140px', flexShrink: 0 }}>
              <GenrePianoRoll
                key={`fundamentals-roll-${currentStepIndex}`}
                events={pianoRollEvents}
                bars={pianoRollBars}
                beatsPerBar={4}
                subdivision={1}
                rowHeight={140}
                midiRangeMin={startC * 12}
                midiRangeMax={(endC + 1) * 12 - 1}
                inTime={false}
                isPlaying={false}
                keyColor={accentColor}
                targetMidiSet={new Set(demoTargetMidis)}
              />
            </div>
          )}

          {/* Piano keyboard with volume dial alongside */}
          <div
            className="flex w-full items-stretch gap-3"
            style={{ alignItems: 'stretch' }}
          >
            <div className="flex-1 min-w-0">
              <PianoKeyboard
                startC={startC}
                endC={endC}
                enableClick
                enableMidiInterface={false}
                onKeyClick={handleKeyClick}
                playingNotes={
                  isPlayingDemo
                    ? highlightNotes.filter((n) =>
                        demoHighlightMidis.has(n.midi),
                      )
                    : activityState === 'performance'
                      ? []
                      : highlightNotes
                }
                activeWhiteKeyColor={accentColor}
                activeBlackKeyColor={accentColor}
                gaming
              />
            </div>
            <LessonVolumeDial />
          </div>
        </div>

        {/* Success overlay */}
        {isPassed && currentStep && (
          <div
            className="glass-panel w-full max-w-2xl rounded-xl p-6"
            style={{
              background: 'rgba(74, 255, 74, 0.06)',
              border: '1px solid rgba(74, 255, 74, 0.3)',
            }}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div
                className="flex size-12 items-center justify-center rounded-full text-xl"
                style={{
                  background: 'rgba(74, 255, 74, 0.15)',
                  color: '#4aff4a',
                }}
              >
                &#10003;
              </div>
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--color-text)' }}
              >
                {currentStep.successFeedback}
              </p>
              {evalResult && (
                <p
                  className="text-xs"
                  style={{ color: 'var(--color-text-dim)' }}
                >
                  {evalResult.progress}
                </p>
              )}
              <button
                type="button"
                onClick={advance}
                className="glass-panel-sm rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors duration-150"
                style={{
                  background: 'rgba(126, 207, 207, 0.15)',
                  border: `1px solid ${accentColor}`,
                  color: accentColor,
                  cursor: 'pointer',
                }}
              >
                {currentStepIndex < totalSteps - 1
                  ? 'Continue'
                  : 'Finish Section'}
              </button>
            </div>
          </div>
        )}

        {/* Practice attempt met the criteria — doesn't count until Play Now */}
        {practiceComplete && (
          <div
            className="glass-panel w-full max-w-2xl rounded-xl p-6"
            style={{
              background: 'rgba(126, 207, 207, 0.06)',
              border: `1px solid ${accentColor}`,
            }}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                Nice practicing! Try it in Play Now to complete this step.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleStartPractice}
                  className="glass-panel-sm rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors duration-150"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                  }}
                >
                  Practice Again
                </button>
                <button
                  type="button"
                  onClick={handleStartPerformance}
                  className="glass-panel-sm rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors duration-150"
                  style={{
                    background: accentColor,
                    border: `1px solid ${accentColor}`,
                    color: '#111',
                    cursor: 'pointer',
                  }}
                >
                  Play Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Retry for failed graded quiz */}
        {activityState === 'performance' &&
          currentStep?.midiEval.type === 'quiz' &&
          quizState?.done &&
          !isPassed && (
            <div
              className="glass-panel w-full max-w-2xl rounded-xl p-6"
              style={{
                background: 'rgba(255, 74, 74, 0.06)',
                border: '1px solid rgba(255, 74, 74, 0.3)',
              }}
            >
              <div className="flex flex-col items-center gap-4 text-center">
                <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                  {evalResult?.progress ?? 'Not enough correct answers.'} Try
                  again!
                </p>
                <button
                  type="button"
                  onClick={resetStep}
                  className="glass-panel-sm rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors duration-150"
                  style={{
                    background: 'rgba(126, 207, 207, 0.15)',
                    border: `1px solid ${accentColor}`,
                    color: accentColor,
                    cursor: 'pointer',
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          )}
      </div>

      {/* Bottom bar — back button */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          borderTop: '1px solid var(--color-border)',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <button
          type="button"
          onClick={handleBackToOverview}
          className="text-sm transition-colors duration-150"
          style={{ color: 'var(--color-text-dim)', cursor: 'pointer' }}
        >
          &#8592; Back to Overview
        </button>
      </div>
    </div>
  );
}
