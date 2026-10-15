import { describe, expect, it } from 'vitest';
import { INITIAL_DRAFT_STATUS, useDraftStatusStore } from '../draftStatusStore';

// ── The live draft's status (milestone 1.4) ───────────────────────────────
// Run: npx vitest run src/daw/persistence/drafts/__tests__/draftStatusStore.test.ts

describe('useDraftStatusStore', () => {
  it('starts with zeros, no draft and no retry', () => {
    const s = useDraftStatusStore.getState();
    expect(s).toEqual(INITIAL_DRAFT_STATUS);
    expect(s.draftId).toBeNull();
    expect(s.pendingSeq).toBe(0);
    expect(s.committedSeq).toBe(0);
    expect(s.mirror).toBe('none');
    expect(s.retry).toBeNull();
    expect(s.media).toEqual({
      pendingInMemory: 0,
      stored: 0,
      missing: 0,
      writing: 0,
      restoring: 0,
      lastError: null,
    });
  });

  it('never shares its media object with the frozen initial value', () => {
    expect(useDraftStatusStore.getState().media).not.toBe(
      INITIAL_DRAFT_STATUS.media,
    );
    expect(Object.isFrozen(useDraftStatusStore.getState().media)).toBe(false);
  });
});
