import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '../index';
import {
  canRedo,
  canUndo,
  pushUndo,
  redo,
  resetUndoHistory,
  subscribeUndo,
  undo,
  undoVersion,
} from '../undoMiddleware';

// ── Undo ───────────────────────────────────────────────────────────────────
// The snapshot has to carry the score's markings as well as its notes: a
// slur, a repeat or a system break is an edit, and undo that leaves them
// behind looks broken. These drive the store directly rather than the UI.

const setMarks = (over: Partial<Parameters<typeof useStore.setState>[0]>) =>
  useStore.setState(over as never);

beforeEach(() => {
  setMarks({
    scoreArticulations: [],
    scoreSlurs: [],
    scoreChordHidden: [],
    leadSheetSections: [],
    leadSheetRepeats: [],
    measureRowSizes: null,
    measureFermatas: null,
  });
  resetUndoHistory();
});

describe('what undo restores', () => {
  it('has nothing to undo on a fresh history', () => {
    expect(canUndo()).toBe(false);
    expect(canRedo()).toBe(false);
  });

  it('puts an articulation back', () => {
    pushUndo();
    setMarks({ scoreArticulations: ['n1|staccato'] });
    expect(undo()).toBe(true);
    expect(useStore.getState().scoreArticulations).toEqual([]);
  });

  it('puts a slur back', () => {
    pushUndo();
    setMarks({ scoreSlurs: ['a|b'] });
    undo();
    expect(useStore.getState().scoreSlurs).toEqual([]);
  });

  it('puts a rehearsal mark back', () => {
    pushUndo();
    setMarks({ leadSheetSections: [{ measureIdx: 4, label: 'B' }] });
    undo();
    expect(useStore.getState().leadSheetSections).toEqual([]);
  });

  it('puts a repeat back', () => {
    pushUndo();
    setMarks({ leadSheetRepeats: [{ startMeasure: 0, endMeasure: 3 }] });
    undo();
    expect(useStore.getState().leadSheetRepeats).toEqual([]);
  });

  it('puts a system break back', () => {
    pushUndo();
    setMarks({ measureRowSizes: [6, 2] });
    undo();
    expect(useStore.getState().measureRowSizes).toBeNull();
  });

  it('puts a fermata back', () => {
    pushUndo();
    setMarks({ measureFermatas: [7] });
    undo();
    expect(useStore.getState().measureFermatas).toBeNull();
  });

  it('restores a mark it had cleared, not just an empty list', () => {
    setMarks({ leadSheetSections: [{ measureIdx: 1, label: 'A' }] });
    pushUndo();
    setMarks({ leadSheetSections: [] });
    undo();
    expect(useStore.getState().leadSheetSections).toEqual([
      { measureIdx: 1, label: 'A' },
    ]);
  });

  it('keeps the snapshot independent of later edits', () => {
    setMarks({ leadSheetRepeats: [{ startMeasure: 0, endMeasure: 1 }] });
    pushUndo();
    // Mutating the live array must not reach into the snapshot.
    useStore.getState().leadSheetRepeats.push({
      startMeasure: 9,
      endMeasure: 9,
    });
    setMarks({ leadSheetRepeats: [] });
    undo();
    expect(useStore.getState().leadSheetRepeats).toEqual([
      { startMeasure: 0, endMeasure: 1 },
    ]);
  });
});

describe('redo', () => {
  it('puts back what undo took away', () => {
    pushUndo();
    setMarks({ measureRowSizes: [4, 4] });
    undo();
    expect(useStore.getState().measureRowSizes).toBeNull();
    expect(canRedo()).toBe(true);
    expect(redo()).toBe(true);
    expect(useStore.getState().measureRowSizes).toEqual([4, 4]);
  });

  it('walks back and forth over several edits', () => {
    pushUndo();
    setMarks({ scoreSlurs: ['a|b'] });
    pushUndo();
    setMarks({ scoreSlurs: ['a|b', 'c|d'] });

    undo();
    expect(useStore.getState().scoreSlurs).toEqual(['a|b']);
    undo();
    expect(useStore.getState().scoreSlurs).toEqual([]);
    redo();
    expect(useStore.getState().scoreSlurs).toEqual(['a|b']);
    redo();
    expect(useStore.getState().scoreSlurs).toEqual(['a|b', 'c|d']);
  });

  it('drops the redo trail once a new edit is made', () => {
    pushUndo();
    setMarks({ scoreSlurs: ['a|b'] });
    undo();
    expect(canRedo()).toBe(true);
    pushUndo();
    expect(canRedo()).toBe(false);
  });

  it('does nothing when there is nothing to redo', () => {
    expect(redo()).toBe(false);
  });

  it('does nothing when there is nothing to undo', () => {
    expect(undo()).toBe(false);
  });
});

describe('telling the buttons', () => {
  it('fires when the stacks change', () => {
    const listener = vi.fn();
    const stop = subscribeUndo(listener);
    pushUndo();
    expect(listener).toHaveBeenCalled();
    stop();
  });

  it('stops firing once unsubscribed', () => {
    const listener = vi.fn();
    subscribeUndo(listener)();
    pushUndo();
    expect(listener).not.toHaveBeenCalled();
  });

  it('moves the version along with every change', () => {
    const before = undoVersion();
    pushUndo();
    expect(undoVersion()).toBeGreaterThan(before);
  });
});

describe('forgetting history', () => {
  it('leaves nothing to undo or redo', () => {
    pushUndo();
    setMarks({ scoreSlurs: ['a|b'] });
    undo();
    resetUndoHistory();
    expect(canUndo()).toBe(false);
    expect(canRedo()).toBe(false);
  });
});
