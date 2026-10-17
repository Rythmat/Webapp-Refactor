import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '../index';
import {
  canRedo,
  canUndo,
  initUndoTracking,
  redo,
  resetUndoHistory,
  subscribeUndo,
  undo,
  undoVersion,
  withTransaction,
} from '../undoMiddleware';

// ── Undo ───────────────────────────────────────────────────────────────────
// Undo has to carry the score's markings as well as its notes: a slur, a
// repeat or a system break is an edit, and undo that leaves them behind
// looks broken. These drive the store directly rather than the UI.

const setMarks = (over: Partial<Parameters<typeof useStore.setState>[0]>) =>
  useStore.setState(over as never);
/** One edit: an undo step of its own. */
const edit = (over: Partial<Parameters<typeof useStore.setState>[0]>) =>
  withTransaction('Edit score', () => setMarks(over));

let release: () => void = () => {};

beforeEach(() => {
  setMarks({
    scoreArticulations: [],
    scoreSlurs: [],
    scoreChordHidden: [],
    sections: [],
    leadSheetRepeats: [],
    measureRowSizes: null,
    measureFermatas: null,
  });
  resetUndoHistory();
  release = initUndoTracking();
});

afterEach(() => {
  release();
  resetUndoHistory();
});

describe('what undo restores', () => {
  it('has nothing to undo on a fresh history', () => {
    expect(canUndo()).toBe(false);
    expect(canRedo()).toBe(false);
  });

  it('puts an articulation back', () => {
    edit({ scoreArticulations: ['n1|staccato'] });
    expect(undo()).toBe(true);
    expect(useStore.getState().scoreArticulations).toEqual([]);
  });

  it('puts a slur back', () => {
    edit({ scoreSlurs: ['a|b'] });
    undo();
    expect(useStore.getState().scoreSlurs).toEqual([]);
  });

  it('puts a rehearsal mark back', () => {
    withTransaction('Edit score', () =>
      useStore.getState().markSectionAtBar(4, 'B'),
    );
    expect(useStore.getState().sections).toHaveLength(1);
    undo();
    expect(useStore.getState().sections).toEqual([]);
  });

  it('puts a repeat back', () => {
    edit({ leadSheetRepeats: [{ startMeasure: 0, endMeasure: 3 }] });
    undo();
    expect(useStore.getState().leadSheetRepeats).toEqual([]);
  });

  it('puts a system break back', () => {
    edit({ measureRowSizes: [6, 2] });
    undo();
    expect(useStore.getState().measureRowSizes).toBeNull();
  });

  it('puts a fermata back', () => {
    edit({ measureFermatas: [7] });
    undo();
    expect(useStore.getState().measureFermatas).toBeNull();
  });

  it('restores a mark it had cleared, not just an empty list', () => {
    const verse = {
      id: 'section-a',
      type: 'custom' as const,
      label: 'A',
      startTick: 1920,
      endTick: 3840,
    };
    setMarks({ sections: [verse] });
    edit({ sections: [] });
    undo();
    expect(useStore.getState().sections).toEqual([verse]);
  });

  it('keeps what an edit replaced, by reference: the store never edits in place', () => {
    const before = [{ startMeasure: 0, endMeasure: 1 }];
    edit({ leadSheetRepeats: before });
    edit({ leadSheetRepeats: [] });
    undo();
    expect(useStore.getState().leadSheetRepeats).toBe(before);
  });
});

describe('redo', () => {
  it('puts back what undo took away', () => {
    edit({ measureRowSizes: [4, 4] });
    undo();
    expect(useStore.getState().measureRowSizes).toBeNull();
    expect(canRedo()).toBe(true);
    expect(redo()).toBe(true);
    expect(useStore.getState().measureRowSizes).toEqual([4, 4]);
  });

  it('walks back and forth over several edits', () => {
    edit({ scoreSlurs: ['a|b'] });
    edit({ scoreSlurs: ['a|b', 'c|d'] });

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
    edit({ scoreSlurs: ['a|b'] });
    undo();
    expect(canRedo()).toBe(true);
    edit({ scoreSlurs: ['c|d'] });
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
    edit({ scoreSlurs: ['a|b'] });
    expect(listener).toHaveBeenCalled();
    stop();
  });

  it('stops firing once unsubscribed', () => {
    const listener = vi.fn();
    subscribeUndo(listener)();
    edit({ scoreSlurs: ['a|b'] });
    expect(listener).not.toHaveBeenCalled();
  });

  it('moves the version along with every change', () => {
    const before = undoVersion();
    edit({ scoreSlurs: ['a|b'] });
    expect(undoVersion()).toBeGreaterThan(before);
  });
});

describe('forgetting history', () => {
  it('leaves nothing to undo or redo', () => {
    edit({ scoreSlurs: ['a|b'] });
    undo();
    resetUndoHistory();
    expect(canUndo()).toBe(false);
    expect(canRedo()).toBe(false);
  });
});
