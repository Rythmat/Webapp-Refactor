import { describe, expect, it } from 'vitest';
import {
  ACTIVE_DRAFT_KEY,
  readActiveDraft,
  writeActiveDraft,
} from '../activeDraft';
import { MemoryStorage, throwingStorage } from './draftTestUtils';

// ── This tab's draft pointer (milestone 1.4, E2/E4) ────────────────────────
// Run: npx vitest run src/lib/studio-projects/drafts/__tests__/activeDraft.test.ts

describe('the active-draft pointer', () => {
  it('round-trips, names its owner, and clears', () => {
    const storage = new MemoryStorage();
    expect(readActiveDraft(storage)).toBeNull();
    writeActiveDraft({ draftId: 'd1', userKey: 'alice' }, storage);
    expect(readActiveDraft(storage)).toEqual({
      draftId: 'd1',
      userKey: 'alice',
    });
    // The caller compares userKey: another user's pointer is theirs, not ours.
    writeActiveDraft({ draftId: 'd2', userKey: 'bob%40school' }, storage);
    expect(readActiveDraft(storage)?.userKey).toBe('bob%40school');
    writeActiveDraft(null, storage);
    expect(storage.getItem(ACTIVE_DRAFT_KEY)).toBeNull();
    expect(readActiveDraft(storage)).toBeNull();
  });

  it('reads junk as no pointer', () => {
    const storage = new MemoryStorage();
    for (const junk of [
      'not json',
      'null',
      '42',
      '[]',
      '{"draftId":""}',
      '{"draftId":"d1"}',
      '{"draftId":7,"userKey":"a"}',
    ]) {
      storage.setItem(ACTIVE_DRAFT_KEY, junk);
      expect(readActiveDraft(storage)).toBeNull();
    }
  });

  it('never throws, and writes nothing invalid', () => {
    expect(readActiveDraft(throwingStorage())).toBeNull();
    expect(() =>
      writeActiveDraft({ draftId: 'd1', userKey: 'a' }, throwingStorage()),
    ).not.toThrow();
    expect(readActiveDraft(null)).toBeNull();
    const storage = new MemoryStorage();
    writeActiveDraft({ draftId: 'd1', userKey: 'a' }, storage);
    writeActiveDraft({ draftId: '', userKey: 'a' }, storage);
    expect(readActiveDraft(storage)).toBeNull();
  });

  it('a full storage leaves the old pointer', () => {
    const storage = new MemoryStorage();
    writeActiveDraft({ draftId: 'd1', userKey: 'a' }, storage);
    storage.setBudget(storage.used());
    writeActiveDraft({ draftId: 'd-longer-id', userKey: 'a' }, storage);
    expect(readActiveDraft(storage)).toEqual({ draftId: 'd1', userKey: 'a' });
  });
});
