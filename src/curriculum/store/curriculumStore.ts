/**
 * Phase 18 — Curriculum Store.
 *
 * Standalone Zustand store for curriculum state management.
 * Separate from the DAW store to keep concerns isolated.
 *
 * Manages:
 * - Current genre/level selection
 * - Generated content cache
 * - Assessment results history
 * - Key root selection
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { CurriculumGenreId } from '../bridge/genreIdMap';
import type { AssessmentResult } from '../engine/assessmentEngine';
import type { GeneratedActivity } from '../engine/contentOrchestrator';
import type { ActivitySectionId } from '../types/activity';
import type { CurriculumLevelId } from '../types/curriculum';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Assessment result with metadata */
export interface StoredAssessmentResult {
  genre: CurriculumGenreId;
  level: CurriculumLevelId;
  section: ActivitySectionId;
  stepIndex: number;
  result: AssessmentResult;
  timestamp: number;
  attempt: number;
}

/** Cache key for generated content */
type ContentCacheKey = `${CurriculumGenreId}:${CurriculumLevelId}:${number}`;

export interface CurriculumState {
  // ── Navigation ──────────────────────────────────────────────────────
  /** Currently selected genre */
  currentGenre: CurriculumGenreId | null;
  /** Currently selected level */
  currentLevel: CurriculumLevelId | null;
  /** Currently active section */
  currentSection: ActivitySectionId;
  /** Key root MIDI note (default: 60 = C4) */
  keyRoot: number;

  // ── Generated content cache ─────────────────────────────────────────
  /** Cached generated activities keyed by genre:level:keyRoot */
  contentCache: Map<ContentCacheKey, GeneratedActivity>;

  // ── Assessment history ──────────────────────────────────────────────
  /** Assessment results history (most recent first) */
  assessmentHistory: StoredAssessmentResult[];

  // ── Actions ─────────────────────────────────────────────────────────
  setGenre: (genre: CurriculumGenreId) => void;
  setLevel: (level: CurriculumLevelId) => void;
  setGenreLevel: (genre: CurriculumGenreId, level: CurriculumLevelId) => void;
  setSection: (section: ActivitySectionId) => void;
  setKeyRoot: (keyRoot: number) => void;

  /** Cache a generated activity */
  cacheContent: (activity: GeneratedActivity) => void;
  /** Get cached content for current genre/level/key */
  getCachedContent: () => GeneratedActivity | undefined;
  /** Clear content cache (e.g., when regenerating) */
  clearContentCache: () => void;

  /** Record an assessment result */
  recordAssessment: (
    section: ActivitySectionId,
    stepIndex: number,
    result: AssessmentResult,
  ) => void;
  /** Get assessment history for current genre/level */
  getAssessmentHistory: () => StoredAssessmentResult[];
  /** Get the last N assessment results for current genre/level */
  getRecentAssessments: (count: number) => StoredAssessmentResult[];

  /** Reset store to initial state */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const INITIAL_STATE = {
  currentGenre: null as CurriculumGenreId | null,
  currentLevel: null as CurriculumLevelId | null,
  currentSection: 'A' as ActivitySectionId,
  keyRoot: 60,
  contentCache: new Map<ContentCacheKey, GeneratedActivity>(),
  assessmentHistory: [] as StoredAssessmentResult[],
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCurriculumStore = create<CurriculumState>()(
  subscribeWithSelector((set, get) => ({
    ...INITIAL_STATE,

    setGenre: (genre) => set({ currentGenre: genre }),

    setLevel: (level) => set({ currentLevel: level }),

    setGenreLevel: (genre, level) =>
      set({ currentGenre: genre, currentLevel: level, currentSection: 'A' }),

    setSection: (section) => set({ currentSection: section }),

    setKeyRoot: (keyRoot) => set({ keyRoot }),

    cacheContent: (activity) => {
      const { currentGenre, currentLevel, keyRoot } = get();
      if (!currentGenre || !currentLevel) return;
      const key: ContentCacheKey = `${currentGenre}:${currentLevel}:${keyRoot}`;
      set((state) => {
        const next = new Map(state.contentCache);
        next.set(key, activity);
        return { contentCache: next };
      });
    },

    getCachedContent: () => {
      const { currentGenre, currentLevel, keyRoot, contentCache } = get();
      if (!currentGenre || !currentLevel) return undefined;
      const key: ContentCacheKey = `${currentGenre}:${currentLevel}:${keyRoot}`;
      return contentCache.get(key);
    },

    clearContentCache: () => set({ contentCache: new Map() }),

    recordAssessment: (section, stepIndex, result) => {
      const { currentGenre, currentLevel, assessmentHistory } = get();
      if (!currentGenre || !currentLevel) return;

      // Count previous attempts for this step
      const prevAttempts = assessmentHistory.filter(
        (r) =>
          r.genre === currentGenre &&
          r.level === currentLevel &&
          r.section === section &&
          r.stepIndex === stepIndex,
      ).length;

      const entry: StoredAssessmentResult = {
        genre: currentGenre,
        level: currentLevel,
        section,
        stepIndex,
        result,
        timestamp: Date.now(),
        attempt: prevAttempts + 1,
      };

      set({ assessmentHistory: [entry, ...assessmentHistory] });
    },

    getAssessmentHistory: () => {
      const { currentGenre, currentLevel, assessmentHistory } = get();
      if (!currentGenre || !currentLevel) return [];
      return assessmentHistory.filter(
        (r) => r.genre === currentGenre && r.level === currentLevel,
      );
    },

    getRecentAssessments: (count) => {
      const history = get().getAssessmentHistory();
      return history.slice(0, count);
    },

    reset: () =>
      set({ ...INITIAL_STATE, contentCache: new Map(), assessmentHistory: [] }),
  })),
);
