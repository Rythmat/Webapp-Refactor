/**
 * useGenreProgress.ts — Local progress tracking for v2 genre curriculum.
 *
 * Self-contained with dongle interfaces for future external connections
 * (Globe, Studio, Arcade, Backend).
 */

import { useState, useCallback } from 'react';
import { keyLabelToUrlParam } from '@/lib/musicKeyUrl';
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
  /** Passed at some point, whatever its latest try scored. */
  everPassed?: boolean;
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
        // A step counts once: passing it again doesn't move its section on.
        const before = prev.completedSteps[stepId];
        const passedBefore = Boolean(
          before?.everPassed || before?.score?.passed,
        );
        const updated: GenreProgress = {
          ...prev,
          lastKeyUsed: context.key,
          lastStyleRef: context.styleRef,
          xpTotal: prev.xpTotal + result.xpEarned,
          skillTags: [...new Set([...prev.skillTags, ...context.skillTags])],
          completedSteps: {
            ...prev.completedSteps,
            [stepId]: {
              stepId,
              score: result,
              keyUsed: context.key,
              styleRef: context.styleRef,
              timestamp: Date.now(),
              attempts: (prev.completedSteps[stepId]?.attempts ?? 0) + 1,
              everPassed: passedBefore || result.passed,
            },
          },
          sections: updateSectionProgress(
            prev.sections,
            context.section,
            result,
            context.stepsTotal,
            !passedBefore,
          ),
        };

        // Persist locally — never crash on storage failure
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
          if (result.passed) {
            recordKeyPass(
              genre,
              level,
              context.key,
              context.section,
              stepId,
              context.stepsTotal,
            );
          }
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

// ── Reading it elsewhere ─────────────────────────────────────────────────────

export interface GenreLevelProgressSummary {
  /** Any step tried. */
  started: boolean;
  /** Steps passed so far. */
  passedSteps: number;
  /** The first section not yet complete; null when every one is. */
  resumeSection: ActivitySectionId | null;
}

/**
 * A level's saved progress, read once, as the lesson saves it (the genre
 * course page's Continue).
 */
export function readGenreProgress(
  genre: string,
  level: number,
): GenreLevelProgressSummary {
  let progress = initProgress(genre, level);
  try {
    const stored = localStorage.getItem(`genre_progress_${genre}_${level}`);
    if (stored) progress = JSON.parse(stored) as GenreProgress;
  } catch {
    // Private browsing or corrupted data: nothing saved
  }
  const steps = Object.values(progress.completedSteps ?? {});
  const sectionIds: ActivitySectionId[] = ['A', 'B', 'C', 'D'];
  return {
    started: steps.length > 0,
    passedSteps: steps.filter((s) => s.score?.passed).length,
    resumeSection:
      sectionIds.find((id) => !progress.sections?.[id]?.completed) ?? null,
  };
}

/** A level's sections as saved, read once, for a path's discs. */
export function readGenreSections(
  genre: string,
  level: number,
): { started: boolean; sections: Partial<GenreProgress['sections']> } {
  const progress = readStored(genre, level);
  if (!progress) return { started: false, sections: {} };
  return {
    started: Object.keys(progress.completedSteps ?? {}).length > 0,
    sections: progress.sections ?? {},
  };
}

// ── Per key ──────────────────────────────────────────────────────────────────
// A lesson's main record is the same across its 12 keys, so a path that shows
// each key apart needs its own: the steps passed in that key, section by section.

type KeyRecord = Record<
  string,
  Record<string, { steps: string[]; total: number }>
>;

/** A lesson's key is written "F# Dorian" or "C Major (Ionian)": its first word. */
const keyParam = (key: string) =>
  keyLabelToUrlParam(key.trim().split(/\s+/)[0]);

const keyStorageKey = (genre: string, level: number) =>
  `genre_keys_${genre}_${level}`;

function readKeyRecord(genre: string, level: number): KeyRecord {
  try {
    const stored = localStorage.getItem(keyStorageKey(genre, level));
    return stored ? (JSON.parse(stored) as KeyRecord) : {};
  } catch {
    return {};
  }
}

function recordKeyPass(
  genre: string,
  level: number,
  key: string,
  section: string,
  stepId: string,
  total: number,
) {
  const record = readKeyRecord(genre, level);
  const at = keyParam(key);
  const inKey = (record[at] ??= {});
  const inSection = (inKey[section] ??= { steps: [], total });
  inSection.total = total;
  if (!inSection.steps.includes(stepId)) inSection.steps.push(stepId);
  localStorage.setItem(keyStorageKey(genre, level), JSON.stringify(record));
}

/** Every step passed in one key, whichever section it's in. */
export function readGenreKeySteps(
  genre: string,
  level: number,
  key: string,
): readonly string[] {
  const inKey = readKeyRecord(genre, level)[keyParam(key)] ?? {};
  return Object.values(inKey).flatMap((section) => section.steps);
}

/** A lesson's progress in one key, with anything saved before keys were kept. */
export function readGenreKeyProgress(
  genre: string,
  level: number,
  key: string,
): {
  started: boolean;
  sections: Readonly<Record<string, { passed: number; total: number }>>;
} {
  const at = keyParam(key);
  const inKey = readKeyRecord(genre, level)[at] ?? {};
  const sections = Object.fromEntries(
    Object.entries(inKey).map(([id, s]) => [
      id,
      { passed: s.steps.length, total: s.total },
    ]),
  );
  const earlier = Object.values(readStored(genre, level)?.completedSteps ?? {});
  const started =
    Object.keys(inKey).length > 0 ||
    earlier.some(
      (step) =>
        step.score?.passed && step.keyUsed && keyParam(step.keyUsed) === at,
    );
  return { started, sections };
}

function readStored(genre: string, level: number): GenreProgress | null {
  try {
    const stored = localStorage.getItem(`genre_progress_${genre}_${level}`);
    return stored ? (JSON.parse(stored) as GenreProgress) : null;
  } catch {
    return null;
  }
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
  /** False if this step has passed before, so that it isn't counted twice. */
  firstPass = true,
): GenreProgress['sections'] {
  const current = sections[section];
  const stepsCompleted =
    current.stepsCompleted + (result.passed && firstPass ? 1 : 0);
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
