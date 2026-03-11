/**
 * State machine hook for Piano Fundamentals lessons.
 *
 * Manages step progression within a single section, accumulates
 * MIDI notes, and calls the evaluator after each new note.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  evaluateStep,
  type NoteRecord,
  type EvalResult,
} from '../engine/fundamentalsEvaluator';
import type {
  FundamentalsSection,
  FundamentalsStep,
} from '../types/fundamentals';

// ---------------------------------------------------------------------------
// Quiz sub-state
// ---------------------------------------------------------------------------

export interface QuizState {
  /** The shuffled list of notes to present. */
  queue: number[];
  /** Index of the current note being shown. */
  currentIndex: number;
  /** Number of correct answers so far. */
  correct: number;
  /** Timestamp when the current note was shown (for timed quizzes). */
  shownAt: number;
  /** Whether the quiz is finished. */
  done: boolean;
}

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface FundamentalsFlowState {
  currentStepIndex: number;
  currentStep: FundamentalsStep | null;
  totalSteps: number;
  completedSteps: Set<number>;
  isPassed: boolean;
  isSectionComplete: boolean;
  evalResult: EvalResult | null;
  quizState: QuizState | null;
  /** Feed a MIDI note into the evaluator. */
  onNoteReceived: (midi: number) => void;
  /** Advance to the next step. */
  advance: () => void;
  /** Go back to a specific step. */
  goToStep: (index: number) => void;
  /** Reset current step (clear accumulated notes). */
  resetStep: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFundamentalsFlow(
  section: FundamentalsSection | null,
): FundamentalsFlowState {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isPassed, setIsPassed] = useState(false);
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const notesRef = useRef<NoteRecord[]>([]);

  const steps = section?.steps ?? [];
  const totalSteps = steps.length;
  const currentStep = steps[currentStepIndex] ?? null;
  const isSectionComplete = completedSteps.size >= totalSteps;

  // Initialize quiz state when entering a quiz step
  const initQuizIfNeeded = useCallback((step: FundamentalsStep) => {
    if (step.midiEval.type !== 'quiz') {
      setQuizState(null);
      return;
    }
    const rule = step.midiEval;
    const queue = rule.octaveAware
      ? [...rule.notePool] // exact MIDI notes, presented in order
      : shuffleArray(rule.notePool).slice(0, rule.count);
    setQuizState({
      queue,
      currentIndex: 0,
      correct: 0,
      shownAt: Date.now(),
      done: false,
    });
  }, []);

  // Feed a note into the evaluator
  const onNoteReceived = useCallback(
    (midi: number) => {
      if (!currentStep || isPassed) return;

      const record: NoteRecord = { midi, timestamp: Date.now() };
      notesRef.current.push(record);

      // Quiz steps have special handling
      if (currentStep.midiEval.type === 'quiz') {
        setQuizState((prev) => {
          if (!prev || prev.done) return prev;
          const rule = currentStep.midiEval;
          if (rule.type !== 'quiz') return prev;

          const expected = prev.queue[prev.currentIndex];

          // Check time limit
          const timeLimitMs = rule.timeLimitMs;
          const elapsed = Date.now() - prev.shownAt;
          const timedOut = timeLimitMs != null && elapsed > timeLimitMs;

          let isCorrect: boolean;
          if (timedOut) {
            isCorrect = false;
          } else if (rule.octaveAware) {
            isCorrect = midi === expected;
          } else {
            isCorrect = midi % 12 === expected;
          }

          const newCorrect = prev.correct + (isCorrect ? 1 : 0);
          const newIndex = prev.currentIndex + 1;
          const done = newIndex >= prev.queue.length;

          if (done) {
            const passed = newCorrect >= rule.passThreshold;
            setEvalResult({
              passed,
              progress: `${newCorrect} of ${prev.queue.length} correct`,
            });
            if (passed) {
              setIsPassed(true);
              setCompletedSteps((s) => new Set(s).add(currentStepIndex));
            }
          }

          return {
            ...prev,
            currentIndex: newIndex,
            correct: newCorrect,
            shownAt: Date.now(),
            done,
          };
        });
        return;
      }

      // Non-quiz: run the evaluator
      const result = evaluateStep(currentStep.midiEval, notesRef.current);
      setEvalResult(result);

      if (result.passed && !isPassed) {
        setIsPassed(true);
        setCompletedSteps((s) => new Set(s).add(currentStepIndex));
      }
    },
    [currentStep, currentStepIndex, isPassed],
  );

  const advance = useCallback(() => {
    const nextIdx = currentStepIndex + 1;
    if (nextIdx < totalSteps) {
      setCurrentStepIndex(nextIdx);
      setIsPassed(false);
      setEvalResult(null);
      notesRef.current = [];
      const nextStep = steps[nextIdx];
      if (nextStep) initQuizIfNeeded(nextStep);
    }
  }, [currentStepIndex, totalSteps, steps, initQuizIfNeeded]);

  const goToStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalSteps) {
        setCurrentStepIndex(index);
        setIsPassed(completedSteps.has(index));
        setEvalResult(null);
        notesRef.current = [];
        const step = steps[index];
        if (step) initQuizIfNeeded(step);
      }
    },
    [totalSteps, completedSteps, steps, initQuizIfNeeded],
  );

  const resetStep = useCallback(() => {
    setIsPassed(false);
    setEvalResult(null);
    notesRef.current = [];
    if (currentStep) initQuizIfNeeded(currentStep);
  }, [currentStep, initQuizIfNeeded]);

  // Reset all state when the section changes (e.g. "Continue to:" navigation)
  useEffect(() => {
    setCurrentStepIndex(0);
    setCompletedSteps(new Set());
    setIsPassed(false);
    setEvalResult(null);
    setQuizState(null);
    notesRef.current = [];
    const firstStep = section?.steps[0];
    if (firstStep?.midiEval.type === 'quiz') {
      initQuizIfNeeded(firstStep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section?.id]);

  return {
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
  };
}
