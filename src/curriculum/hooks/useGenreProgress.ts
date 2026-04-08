/**
 * useGenreProgress.ts — Local progress tracking for v2 genre curriculum.
 *
 * Self-contained with dongle interfaces for future external connections
 * (Globe, Studio, Arcade, Backend).
 */

import { useState, useCallback } from 'react';
import type { ActivitySectionId } from '../types/activity';
import type { StyleSubProfile } from '../types/activity.v2';
import type { AssessmentResult } from './useGenreAssessment';

// ── Core data shapes ─────────────────────────────────────────────────────────

interface StepResult {
  stepId: string;
  score: AssessmentResult;
  keyUsed: string;
  styleRef: string;
  timestamp: number;
  attempts: number;
}

interface SectionProgress {
  completed: boolean;
  stepsCompleted: number;
  stepsTotal: number;
  bestScore: number;
}

interface GenreProgress {
  genre: string;
  level: number;
  sections: Record<ActivitySectionId, SectionProgress>;
  completedSteps: Record<string, StepResult>;
  xpTotal: number;
  skillTags: string[];
  lastKeyUsed: string;
  lastStyleRef: string;
}

// ── Dongle interfaces (future external connections) ──────────────────────────

// Globe dongle — what has this student learned?
export interface GlobeDongleData {
  styleRefUnlocked: StyleSubProfile;
  genre: string;
  level: number;
}

// Studio dongle — what musical context did they just work in?
export interface StudioDongleData {
  genre: string;
  level: number;
  section: ActivitySectionId;
  key: string;
  styleRef: StyleSubProfile;
  progression?: string;
}

// Arcade dongle — what skills has this student earned?
export interface ArcadeDongleData {
  skillTag: string;
  source: string;
  genre: string;
}

// Backend dongle — sync to Ryan's server
export interface BackendDongleData {
  genre: string;
  level: number;
  stepId: string;
  score: AssessmentResult;
  keyUsed: string;
  timestamp: number;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

interface DongleCallbacks {
  onGlobeUpdate?: (data: GlobeDongleData) => void;
  onStudioUpdate?: (data: StudioDongleData) => void;
  onArcadeUpdate?: (data: ArcadeDongleData) => void;
  onBackendSync?: (data: BackendDongleData) => void;
}

export function useGenreProgress(
  genre: string,
  level: number,
  dongles: DongleCallbacks = {},
) {
  const storageKey = `genre_progress_${genre}_${level}`;

  const [progress, setProgress] = useState<GenreProgress>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return JSON.parse(stored) as GenreProgress;
    } catch {
      // Private browsing or corrupted data — start fresh
    }
    return initProgress(genre, level);
  });

  const recordResult = useCallback(
    (
      stepId: string,
      result: AssessmentResult,
      context: {
        section: ActivitySectionId;
        key: string;
        styleRef: string;
        stepsTotal: number;
        skillTags: string[];
      },
    ) => {
      setProgress((prev) => {
        const updated: GenreProgress = {
          ...prev,
          lastKeyUsed: context.key,
          lastStyleRef: context.styleRef,
          xpTotal: prev.xpTotal + result.xpEarned,
          skillTags: [
            ...new Set([...prev.skillTags, ...context.skillTags]),
          ],
          completedSteps: {
            ...prev.completedSteps,
            [stepId]: {
              stepId,
              score: result,
              keyUsed: context.key,
              styleRef: context.styleRef,
              timestamp: Date.now(),
              attempts:
                (prev.completedSteps[stepId]?.attempts ?? 0) + 1,
            },
          },
          sections: updateSectionProgress(
            prev.sections,
            context.section,
            result,
            context.stepsTotal,
          ),
        };

        // Persist locally — never crash on storage failure
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {
          // Storage full or private browsing — progress lives in memory only
        }

        return updated;
      });

      // Fire dongles (all optional — do nothing if not connected)
      dongles.onBackendSync?.({
        genre,
        level,
        stepId,
        score: result,
        keyUsed: context.key,
        timestamp: Date.now(),
      });

      context.skillTags.forEach((tag) => {
        dongles.onArcadeUpdate?.({
          skillTag: tag,
          source: stepId,
          genre,
        });
      });
    },
    [genre, level, dongles, storageKey],
  );

  const recordSectionComplete = useCallback(
    (
      section: ActivitySectionId,
      key: string,
      styleRef: StyleSubProfile,
      progression?: string,
    ) => {
      dongles.onStudioUpdate?.({
        genre,
        level,
        section,
        key,
        styleRef,
        progression,
      });
      dongles.onGlobeUpdate?.({
        styleRefUnlocked: styleRef,
        genre,
        level,
      });
    },
    [genre, level, dongles],
  );

  const isStepComplete = useCallback(
    (stepId: string): boolean => {
      return (
        stepId in progress.completedSteps &&
        progress.completedSteps[stepId].score.passed
      );
    },
    [progress.completedSteps],
  );

  const getSectionProgress = useCallback(
    (
      section: ActivitySectionId,
    ): { completed: number; total: number; percentage: number } => {
      const s = progress.sections[section];
      return {
        completed: s.stepsCompleted,
        total: s.stepsTotal,
        percentage:
          s.stepsTotal > 0
            ? Math.round((s.stepsCompleted / s.stepsTotal) * 100)
            : 0,
      };
    },
    [progress.sections],
  );

  return {
    progress,
    recordResult,
    recordSectionComplete,
    isStepComplete,
    getSectionProgress,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function initProgress(genre: string, level: number): GenreProgress {
  return {
    genre,
    level,
    sections: {
      A: {
        completed: false,
        stepsCompleted: 0,
        stepsTotal: 0,
        bestScore: 0,
      },
      B: {
        completed: false,
        stepsCompleted: 0,
        stepsTotal: 0,
        bestScore: 0,
      },
      C: {
        completed: false,
        stepsCompleted: 0,
        stepsTotal: 0,
        bestScore: 0,
      },
      D: {
        completed: false,
        stepsCompleted: 0,
        stepsTotal: 0,
        bestScore: 0,
      },
    },
    completedSteps: {},
    xpTotal: 0,
    skillTags: [],
    lastKeyUsed: '',
    lastStyleRef: '',
  };
}

function updateSectionProgress(
  sections: GenreProgress['sections'],
  section: ActivitySectionId,
  result: AssessmentResult,
  stepsTotal: number,
): GenreProgress['sections'] {
  const current = sections[section];
  const stepsCompleted = current.stepsCompleted + (result.passed ? 1 : 0);
  return {
    ...sections,
    [section]: {
      stepsCompleted,
      stepsTotal,
      bestScore: Math.max(current.bestScore, result.overallScore),
      completed: stepsCompleted >= stepsTotal,
    },
  };
}
