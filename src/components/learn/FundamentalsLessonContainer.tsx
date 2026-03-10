/**
 * Interactive lesson container for Piano Fundamentals sections.
 *
 * Renders step-by-step activities with MIDI input, real-time evaluation,
 * and success feedback. Follows the GenreLessonContainer UI patterns.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import { CurriculumRoutes } from '@/constants/routes';
import { usePlayNote } from '@/contexts/PianoContext';
import type { PlaybackEvent } from '@/contexts/PlaybackContext/helpers';
import { loadPianoFundamentals } from '@/curriculum/data/activityFlows';
import {
  pitchClassName,
  noteName,
} from '@/curriculum/engine/fundamentalsEvaluator';
import { useFundamentalsFlow } from '@/curriculum/hooks/useFundamentalsFlow';
import type {
  FundamentalsFlow,
  FundamentalsSection,
} from '@/curriculum/types/fundamentals';
import { useMidiInput } from '@/hooks/music/useMidiInput';
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

export function FundamentalsLessonContainer({
  sectionId,
}: FundamentalsLessonContainerProps) {
  const navigate = useNavigate();
  const playNote = usePlayNote();
  const [flow, setFlow] = useState<FundamentalsFlow | null>(null);

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
    resetStep,
  } = useFundamentalsFlow(section);

  // MIDI input handling — play sound and evaluate
  const handleNoteOn = useCallback(
    (event: { number: number }) => {
      playNote(event.number);
      onNoteReceived(event.number);
    },
    [playNote, onNoteReceived],
  );

  const { startListening, stopListening } = useMidiInput(undefined, {
    onNoteOn: handleNoteOn,
  });

  useEffect(() => {
    const stop = startListening();
    return () => {
      if (typeof stop === 'function') {
        stop();
        return;
      }
      stopListening();
    };
  }, [startListening, stopListening]);

  // Keyboard click handler (fallback for users without MIDI controller)
  const handleKeyClick = useCallback(
    (midi: number) => {
      playNote(midi);
      onNoteReceived(midi);
    },
    [playNote, onNoteReceived],
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

  const accentColor = '#7ecfcf';

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
        {section.steps.map((_, i) => {
          const isCompleted = completedSteps.has(i);
          const isCurrent = i === currentStepIndex;
          return (
            <div
              key={i}
              style={{
                width: isCurrent ? '24px' : '16px',
                height: '6px',
                borderRadius: '3px',
                background: isCompleted
                  ? '#4aff4a'
                  : isCurrent
                    ? accentColor
                    : 'rgba(255,255,255,0.1)',
                transition: 'all 0.2s',
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
            <span className="text-4xl font-bold" style={{ color: accentColor }}>
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

        {/* Piano keyboard */}
        <div className="w-full max-w-3xl">
          <PianoKeyboard
            startC={startC}
            endC={endC}
            enableClick
            enableMidiInterface={false}
            onKeyClick={handleKeyClick}
            playingNotes={highlightNotes}
            activeWhiteKeyColor={accentColor}
            activeBlackKeyColor={accentColor}
            gaming
          />
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

        {/* Retry for failed quiz */}
        {currentStep?.midiEval.type === 'quiz' &&
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
