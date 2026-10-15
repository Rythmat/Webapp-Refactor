import { afterEach, describe, expect, it, vi } from 'vitest';
import { beginTake, takesInFlight, whenTakesSettled } from '../takesInFlight';

// ── Takes in flight (milestone 1.4, E10) ──────────────────────────────────
// Run: npx vitest run src/daw/session/__tests__/takesInFlight.test.ts

const settles: Array<() => void> = [];
const begin = (kind: 'midi' | 'audio', alive?: () => boolean) => {
  const settle = beginTake(kind, alive ? { alive } : undefined);
  settles.push(settle);
  return settle;
};

afterEach(() => {
  settles.splice(0).forEach((settle) => settle());
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('takesInFlight', () => {
  it('counts takes until they settle, per kind too', () => {
    expect(takesInFlight()).toBe(0);
    const a = begin('audio');
    begin('midi');
    expect(takesInFlight()).toBe(2);
    expect(takesInFlight('audio')).toBe(1);
    expect(takesInFlight('midi')).toBe(1);
    a();
    expect(takesInFlight()).toBe(1);
    expect(takesInFlight('audio')).toBe(0);
  });

  it('settles each take once, however often its settle is called', () => {
    const a = begin('audio');
    begin('audio');
    a();
    a();
    a();
    expect(takesInFlight()).toBe(1);
  });
});

describe('whenTakesSettled', () => {
  it('resolves true at once with nothing in flight', async () => {
    await expect(whenTakesSettled(0)).resolves.toBe(true);
  });

  it('resolves true when the last take settles', async () => {
    const a = begin('midi');
    const b = begin('audio');
    const waiting = whenTakesSettled(10_000);
    let result: boolean | null = null;
    void waiting.then((r) => (result = r));
    a();
    await Promise.resolve();
    expect(result).toBeNull();
    b();
    await expect(waiting).resolves.toBe(true);
  });

  it('resolves false at the timeout', async () => {
    vi.useFakeTimers();
    begin('audio');
    const waiting = whenTakesSettled(10_000);
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(waiting).resolves.toBe(false);
  });
});

describe('a take that never settles', () => {
  it('counts as settled once its liveness check says it has gone', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    begin('audio', () => false);
    expect(takesInFlight()).toBe(0);
    await expect(whenTakesSettled(10_000)).resolves.toBe(true);
  });

  it('is swept while someone waits, without waiting for the timeout', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    let recording = true;
    begin('audio', () => recording);
    const waiting = whenTakesSettled(10_000);
    let result: boolean | null = null;
    void waiting.then((r) => (result = r));
    await vi.advanceTimersByTimeAsync(1000);
    expect(result).toBeNull();
    recording = false;
    await vi.advanceTimersByTimeAsync(250);
    expect(result).toBe(true);
  });

  it('keeps a live take counted, and treats a throwing check as gone', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    begin('midi', () => true);
    expect(takesInFlight()).toBe(1);
    begin('audio', () => {
      throw new Error('boom');
    });
    expect(takesInFlight()).toBe(1);
    expect(takesInFlight('audio')).toBe(0);
  });
});
