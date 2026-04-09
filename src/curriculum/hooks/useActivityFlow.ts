/**
 * Phase 13 — Activity Flow State Hook.
 *
 * Manages the state machine for an activity flow:
 * navigation between sections (A/B/C/D), step progression,
 * content generation, and assessment tracking.
 */

import { useState, useCallback, useMemo } from 'react';
import type { CurriculumGenreId } from '../bridge/genreIdMap';
import { evaluate, type AssessmentResult } from '../engine/assessmentEngine';
import {
  generateFullActivity,
  type GeneratedActivity,
} from '../engine/contentOrchestrator';
import type { MidiNoteEvent } from '../engine/melodyPipeline';
import type {
  ActivityFlow,
  ActivitySectionId,
  ActivityStep,
} from '../types/activity';
import type { CurriculumLevelId } from '../types/curriculum';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StepStatus = 'locked' | 'active' | 'completed' | 'failed';

export interface StepState {
  step: ActivityStep;
  status: StepStatus;
  assessmentResult?: AssessmentResult;
  attempts: number;
}

export interface ActivityFlowState {
  /** The activity flow data */
  flow: ActivityFlow | null;
  /** Current section ID */
  currentSectionId: ActivitySectionId;
  /** Current step index within the section (0-based) */
  currentStepIndex: number;
  /** Per-step state tracking */
  stepStates: Map<string, StepState>;
  /** Generated content for the current activity */
  generatedContent: GeneratedActivity | null;
  /** Whether content is being generated */
  isGenerating: boolean;
  /** Overall completion status */
  isFlowComplete: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useActivityFlow(
  flow: ActivityFlow | null,
  genre: CurriculumGenreId,
  level: CurriculumLevelId,
  keyRoot: number,
) {
  const [currentSectionId, setCurrentSectionId] =
    useState<ActivitySectionId>('A');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepStates, setStepStates] = useState<Map<string, StepState>>(
    new Map(),
  );
  const [generatedContent, setGeneratedContent] =
    useState<GeneratedActivity | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Current section and step
  const currentSection = useMemo(
    () => flow?.sections.find((s) => s.id === currentSectionId) ?? null,
    [flow, currentSectionId],
  );

  const currentStep = useMemo(
    () => currentSection?.steps[currentStepIndex] ?? null,
    [currentSection, currentStepIndex],
  );

  const stepKey = useCallback(
    (sectionId: ActivitySectionId, stepIndex: number) =>
      `${sectionId}:${stepIndex}`,
    [],
  );

  // Generate content for the current context
  const generateContent = useCallback(
    (tempo?: number) => {
      setIsGenerating(true);
      try {
        const content = generateFullActivity(genre, level, keyRoot, tempo);
        setGeneratedContent(content);
      } finally {
        setIsGenerating(false);
      }
    },
    [genre, level, keyRoot],
  );

  // Navigate to a specific section
  const goToSection = useCallback((sectionId: ActivitySectionId) => {
    setCurrentSectionId(sectionId);
    setCurrentStepIndex(0);
  }, []);

  // Advance to the next step
  const nextStep = useCallback(() => {
    if (!currentSection) return;

    if (currentStepIndex < currentSection.steps.length - 1) {
      setCurrentStepIndex((i) => i + 1);
    } else {
      // Move to next section
      const sectionOrder: ActivitySectionId[] = ['A', 'B', 'C', 'D'];
      const currentIdx = sectionOrder.indexOf(currentSectionId);
      if (currentIdx < sectionOrder.length - 1) {
        const nextSectionId = sectionOrder[currentIdx + 1];
        const nextSection = flow?.sections.find((s) => s.id === nextSectionId);
        if (nextSection && nextSection.steps.length > 0) {
          setCurrentSectionId(nextSectionId);
          setCurrentStepIndex(0);
        }
      }
    }
  }, [currentSection, currentStepIndex, currentSectionId, flow]);

  // Go to previous step
  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((i) => i - 1);
    }
  }, [currentStepIndex]);

  // Mark current step as completed
  const completeStep = useCallback(
    (assessmentResult?: AssessmentResult) => {
      const key = stepKey(currentSectionId, currentStepIndex);
      setStepStates((prev) => {
        const next = new Map(prev);
        const existing = next.get(key);
        next.set(key, {
          step: currentStep!,
          status: 'completed',
          assessmentResult,
          attempts: (existing?.attempts ?? 0) + 1,
        });
        return next;
      });
    },
    [currentSectionId, currentStepIndex, currentStep, stepKey],
  );

  // Submit an assessment for the current step
  const submitAssessment = useCallback(
    (receivedNotes: MidiNoteEvent[]): AssessmentResult | null => {
      if (!currentStep?.assessment || !generatedContent) return null;

      const result = evaluate(
        generatedContent.melody,
        receivedNotes,
        currentStep.assessment,
        generatedContent.tempo,
      );

      const key = stepKey(currentSectionId, currentStepIndex);
      setStepStates((prev) => {
        const next = new Map(prev);
        const existing = next.get(key);
        next.set(key, {
          step: currentStep,
          status: result.score.passed ? 'completed' : 'failed',
          assessmentResult: result,
          attempts: (existing?.attempts ?? 0) + 1,
        });
        return next;
      });

      return result;
    },
    [
      currentStep,
      generatedContent,
      currentSectionId,
      currentStepIndex,
      stepKey,
    ],
  );

  // Get status of a specific step
  const getStepStatus = useCallback(
    (sectionId: ActivitySectionId, stepIndex: number): StepStatus => {
      const key = stepKey(sectionId, stepIndex);
      return stepStates.get(key)?.status ?? 'locked';
    },
    [stepStates, stepKey],
  );

  // Check if the entire flow is complete
  const isFlowComplete = useMemo(() => {
    if (!flow) return false;
    for (const section of flow.sections) {
      for (let i = 0; i < section.steps.length; i++) {
        const key = stepKey(section.id, i);
        if (stepStates.get(key)?.status !== 'completed') return false;
      }
    }
    return true;
  }, [flow, stepStates, stepKey]);

  // Section completion percentages
  const sectionProgress = useMemo(() => {
    if (!flow) return {} as Record<ActivitySectionId, number>;
    const progress: Partial<Record<ActivitySectionId, number>> = {};
    for (const section of flow.sections) {
      if (section.steps.length === 0) {
        progress[section.id] = 100;
        continue;
      }
      let completed = 0;
      for (let i = 0; i < section.steps.length; i++) {
        const key = stepKey(section.id, i);
        if (stepStates.get(key)?.status === 'completed') completed++;
      }
      progress[section.id] = Math.round(
        (completed / section.steps.length) * 100,
      );
    }
    return progress as Record<ActivitySectionId, number>;
  }, [flow, stepStates, stepKey]);

  return {
    // State
    currentSectionId,
    currentStepIndex,
    currentSection,
    currentStep,
    generatedContent,
    isGenerating,
    isFlowComplete,
    sectionProgress,
    stepStates,
    // Actions
    goToSection,
    nextStep,
    prevStep,
    completeStep,
    submitAssessment,
    generateContent,
    getStepStatus,
  };
}
