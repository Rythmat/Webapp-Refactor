import { create } from 'zustand';
import { onSessionGeneration } from '@/daw/session/sessionGeneration';
import type { BrowserItem } from './items';
import { EMPTY_QUERY, type BrowserQuery } from './query';

// ── The Library's own state (milestone 2.14) ───────────────────────────────
//
// What the browser is showing and doing, outside the project's store: the
// search and filters (kept while the panel closes and the view changes, gone
// with the page), the tempo question a groove is waiting on, the preview
// playing and the item being dragged. None of it is anything a project
// holds, saves or undoes (as canvasMenuStore), so the registry doesn't list
// it.

export type PreviewStatus = 'loading' | 'playing';

/** A groove at another tempo, waiting for the student's answer. */
export interface TempoQuestion {
  itemId: string;
  name: string;
  itemBpm: number;
  songBpm: number;
  /**
   * Runs the add with the answer: change the song's tempo (true), keep it
   * (false), or add nothing (null, Cancel).
   */
  answer(changeTempo: boolean | null): void;
}

interface BrowserState {
  query: BrowserQuery;
  setQuery(patch: Partial<BrowserQuery>): void;
  clearQuery(): void;
  question: TempoQuestion | null;
  ask(question: TempoQuestion): void;
  /** Takes the question down (its answer has been given). */
  dismissQuestion(): void;
  preview: { itemId: string; status: PreviewStatus } | null;
  setPreview(preview: BrowserState['preview']): void;
  /**
   * The row being dragged, while it is (a dragover can't read the drag's
   * data), and the last one dragged, which a drop adds (the drop's handler
   * loads after the drag has ended).
   */
  dragging: BrowserItem | null;
  dragged: BrowserItem | null;
  setDragging(item: BrowserItem | null): void;
  /** Items being added (a groove's notes load first), for a busy +. */
  adding: readonly string[];
  setAdding(itemId: string, busy: boolean): void;
}

export const useBrowserStore = create<BrowserState>()((set, get) => ({
  query: EMPTY_QUERY,
  setQuery: (patch) => set((s) => ({ query: { ...s.query, ...patch } })),
  clearQuery: () => set({ query: EMPTY_QUERY }),
  question: null,
  // A question asked over another cancels it, so no add waits forever.
  ask: (question) => {
    const before = get().question;
    set({ question });
    before?.answer(null);
  },
  dismissQuestion: () => set({ question: null }),
  preview: null,
  setPreview: (preview) => set({ preview }),
  dragging: null,
  dragged: null,
  setDragging: (item) =>
    set((s) => ({ dragging: item, dragged: item ?? s.dragged })),
  adding: [],
  setAdding: (itemId, busy) =>
    set((s) => ({
      adding: busy
        ? [...s.adding.filter((id) => id !== itemId), itemId]
        : s.adding.filter((id) => id !== itemId),
    })),
}));

// A new session (a project opened, a template, a lesson) cancels a tempo
// question still waiting, wherever it was asked: its groove was for the
// song before.
onSessionGeneration(() => {
  const { question, dismissQuestion } = useBrowserStore.getState();
  if (!question) return;
  dismissQuestion();
  question.answer(null);
});
