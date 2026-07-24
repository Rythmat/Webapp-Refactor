import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TutorialProgressState {
  /** Unix ms of when each tutorial id was first completed. */
  completedAt: Record<string, number>;
  /** Record a tutorial as completed (first-completion time only). */
  markComplete: (id: string) => void;
  isComplete: (id: string) => boolean;
}

/**
 * Persists which Studio tutorials the user has finished, so the Lessons picker
 * can show a "Completed" badge across sessions. Client-side localStorage, same
 * pattern as `useAwardEarnedStore` / `useSeenChallengesStore`.
 */
export const useTutorialProgressStore = create<TutorialProgressState>()(
  persist(
    (set, get) => ({
      completedAt: {},
      markComplete: (id) =>
        set((state) =>
          state.completedAt[id] != null
            ? state
            : { completedAt: { ...state.completedAt, [id]: Date.now() } },
        ),
      isComplete: (id) => get().completedAt[id] != null,
    }),
    { name: 'music-atlas-tutorial-progress' },
  ),
);
