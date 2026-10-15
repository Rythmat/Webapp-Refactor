import { describe, expect, it } from 'vitest';
import { DraftStorageError, isDraftStorageError } from '../types';

// ── The draft error class (milestone 1.4, E1) ─────────────────────────────
// Run: npx vitest run src/lib/studio-projects/drafts/__tests__/types.test.ts

describe('DraftStorageError', () => {
  it('carries its kind and name', () => {
    const err = new DraftStorageError('quota', 'full');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('DraftStorageError');
    expect(err.kind).toBe('quota');
    expect(err.message).toBe('full');
    expect(isDraftStorageError(err)).toBe(true);
    expect(isDraftStorageError(err, 'quota')).toBe(true);
    expect(isDraftStorageError(err, 'conflict')).toBe(false);
    expect(isDraftStorageError(new Error('x'))).toBe(false);
  });

  it('has no own cause without one, and a non-enumerable one with one', () => {
    const bare = new DraftStorageError('unavailable', 'no db');
    expect(Object.prototype.hasOwnProperty.call(bare, 'cause')).toBe(false);
    expect(Object.keys(bare)).not.toContain('cause');

    const inner = new DOMException('quota', 'QuotaExceededError');
    const wrapped = new DraftStorageError('quota', 'full', { cause: inner });
    expect(wrapped.cause).toBe(inner);
    expect(Object.keys(wrapped)).not.toContain('cause');
    expect(JSON.parse(JSON.stringify(wrapped))).not.toHaveProperty('cause');
  });
});
