import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DRAFT_LOCK_PREFIX,
  IMPORT_LOCK,
  acquireDraftLock,
  lockedDraftIds,
  setDefaultLockManager,
  withImportLock,
} from '../draftLock';
import { createFakeLockManager } from './fakeLocks';

// ── Draft locks (milestone 1.4, E4) ────────────────────────────────────────
// Run: npx vitest run src/lib/studio-projects/drafts/__tests__/draftLock.test.ts
//
// Every case passes its own fake LockManager (or null): Node 24 has a real,
// process-wide navigator.locks, which these tests must never take.

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (caught) {
    return caught;
  }
  throw new Error('expected a rejection');
}

describe('acquireDraftLock', () => {
  it('without a lock manager, proceeds with an unheld handle', async () => {
    const lock = await acquireDraftLock('d1', { waitMs: 0, locks: null });
    expect(lock).toMatchObject({ draftId: 'd1', held: false });
    lock?.release();
  });

  it('takes a free lock, which lockedDraftIds lists until it is released', async () => {
    const locks = createFakeLockManager();
    const lock = await acquireDraftLock('d1', { waitMs: 0, locks });
    expect(lock).toMatchObject({ draftId: 'd1', held: true });
    expect(locks.heldNames()).toEqual([`${DRAFT_LOCK_PREFIX}d1`]);
    expect(await lockedDraftIds({ locks })).toEqual(new Set(['d1']));
    lock!.release();
    lock!.release(); // idempotent
    await tick();
    expect(await lockedDraftIds({ locks })).toEqual(new Set());
  });

  it('ifAvailable: null when another tab holds it', async () => {
    const locks = createFakeLockManager();
    locks.holdElsewhere(`${DRAFT_LOCK_PREFIX}d1`);
    expect(await acquireDraftLock('d1', { waitMs: 0, locks })).toBeNull();
  });

  it('ifAvailable with a signal never passes the signal (NotSupportedError in browsers)', async () => {
    const locks = createFakeLockManager();
    const controller = new AbortController();
    const lock = await acquireDraftLock('d1', {
      waitMs: 0,
      signal: controller.signal,
      locks,
    });
    expect(lock?.held).toBe(true);
    expect(locks.calls[0].options).toEqual({ ifAvailable: true });
    lock?.release();
  });

  it('an aborted signal rejects before asking, even with ifAvailable', async () => {
    const locks = createFakeLockManager();
    const controller = new AbortController();
    controller.abort();
    const caught = await rejectionOf(
      acquireDraftLock('d1', { waitMs: 0, signal: controller.signal, locks }),
    );
    expect((caught as Error).name).toBe('AbortError');
    expect(locks.calls).toHaveLength(0);
    const waiting = await rejectionOf(
      acquireDraftLock('d1', { waitMs: 500, signal: controller.signal, locks }),
    );
    expect((waiting as Error).name).toBe('AbortError');
  });

  it('the boot wait gets a lock released within it (a reload’s old document)', async () => {
    const locks = createFakeLockManager();
    const releaseOld = locks.holdElsewhere(`${DRAFT_LOCK_PREFIX}d1`);
    const pending = acquireDraftLock('d1', { waitMs: 500, locks });
    await tick(20);
    releaseOld();
    const lock = await pending;
    expect(lock?.held).toBe(true);
    lock?.release();
  });

  it('the boot wait resolves null (fork) when the lock stays held past it', async () => {
    const locks = createFakeLockManager();
    locks.holdElsewhere(`${DRAFT_LOCK_PREFIX}d1`);
    const started = Date.now();
    const controller = new AbortController();
    const lock = await acquireDraftLock('d1', {
      waitMs: 60,
      signal: controller.signal,
      locks,
    });
    expect(lock).toBeNull();
    expect(Date.now() - started).toBeGreaterThanOrEqual(50);
    // The wait's own timeout never leaks into the caller's signal.
    expect(controller.signal.aborted).toBe(false);
  });

  it('the caller aborting during the wait rejects AbortError (cancel/supersede), never null', async () => {
    const locks = createFakeLockManager();
    locks.holdElsewhere(`${DRAFT_LOCK_PREFIX}d1`);
    const controller = new AbortController();
    const pending = acquireDraftLock('d1', {
      waitMs: 5000,
      signal: controller.signal,
      locks,
    });
    await tick(10);
    controller.abort();
    const caught = await rejectionOf(pending);
    expect((caught as Error).name).toBe('AbortError');
  });

  it('a caller abort with its own reason rejects with that reason', async () => {
    const locks = createFakeLockManager();
    locks.holdElsewhere(`${DRAFT_LOCK_PREFIX}d1`);
    const controller = new AbortController();
    const pending = acquireDraftLock('d1', {
      waitMs: 5000,
      signal: controller.signal,
      locks,
    });
    const reason = new Error('superseded');
    controller.abort(reason);
    expect(await rejectionOf(pending)).toBe(reason);
  });

  it('other lock-manager failures proceed without a lock (held:false)', async () => {
    const boom = new DOMException('opaque origin', 'SecurityError');
    const locks = {
      request: () => Promise.reject(boom),
      query: () => Promise.resolve({ held: [], pending: [] }),
    } as unknown as LockManager;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const a = await acquireDraftLock('d1', { waitMs: 0, locks });
    expect(a).toMatchObject({ draftId: 'd1', held: false });
    const b = await acquireDraftLock('d1', { waitMs: 100, locks });
    expect(b).toMatchObject({ draftId: 'd1', held: false });
    expect(warn).toHaveBeenCalledTimes(2);
    // The caller's abort still wins over a failure.
    const controller = new AbortController();
    const hanging = {
      request: (_n: string, opts: LockOptions) =>
        new Promise((_r, reject) =>
          opts.signal?.addEventListener('abort', () =>
            reject(new Error('manager failed on abort')),
          ),
        ),
      query: () => Promise.resolve({ held: [], pending: [] }),
    } as unknown as LockManager;
    const pending = acquireDraftLock('d1', {
      waitMs: 1000,
      signal: controller.signal,
      locks: hanging,
    });
    controller.abort();
    expect((await rejectionOf(pending)) as DOMException).toMatchObject({
      name: 'AbortError',
    });
    warn.mockRestore();
  });
});

describe('lockedDraftIds', () => {
  it('lists only draft locks; empty without a manager or when query fails', async () => {
    const locks = createFakeLockManager();
    locks.holdElsewhere(`${DRAFT_LOCK_PREFIX}a`);
    locks.holdElsewhere(IMPORT_LOCK);
    locks.holdElsewhere('something-else');
    expect(await lockedDraftIds({ locks })).toEqual(new Set(['a']));
    expect(await lockedDraftIds({ locks: null })).toEqual(new Set());
    const broken = {
      query: () => Promise.reject(new Error('no')),
    } as unknown as LockManager;
    expect(await lockedDraftIds({ locks: broken })).toEqual(new Set());
  });
});

describe('the default lock manager', () => {
  let restore: (() => void) | null = null;
  afterEach(() => {
    restore?.();
    restore = null;
  });

  it('is injectable', async () => {
    const locks = createFakeLockManager();
    restore = setDefaultLockManager(() => locks);
    const lock = await acquireDraftLock('d9', { waitMs: 0 });
    expect(lock?.held).toBe(true);
    expect(await lockedDraftIds()).toEqual(new Set(['d9']));
    lock?.release();
    restore();
    restore = setDefaultLockManager(() => null);
    expect((await acquireDraftLock('d9', { waitMs: 0 }))?.held).toBe(false);
  });
});

describe('withImportLock', () => {
  it('runs one import at a time', async () => {
    const locks = createFakeLockManager();
    const order: string[] = [];
    const job = (name: string) => async () => {
      order.push(`${name}:start`);
      await tick(15);
      order.push(`${name}:end`);
      return name;
    };
    const results = await Promise.all([
      withImportLock(job('a'), { locks }),
      withImportLock(job('b'), { locks }),
    ]);
    expect(results).toEqual(['a', 'b']);
    expect(order).toEqual(['a:start', 'a:end', 'b:start', 'b:end']);
  });

  it('runs anyway once the wait runs out (a stuck tab)', async () => {
    const locks = createFakeLockManager();
    locks.holdElsewhere(IMPORT_LOCK);
    expect(await withImportLock(async () => 'ran', { locks, waitMs: 30 })).toBe(
      'ran',
    );
  });

  it('runs without a lock manager, or when the lock cannot be asked for', async () => {
    expect(await withImportLock(async () => 1, { locks: null })).toBe(1);
    const broken = {
      request: () => Promise.reject(new DOMException('no', 'SecurityError')),
    } as unknown as LockManager;
    expect(await withImportLock(async () => 2, { locks: broken })).toBe(2);
  });

  it('passes the import’s own failure through, once', async () => {
    const locks = createFakeLockManager();
    let runs = 0;
    const boom = new Error('import failed');
    const caught = await rejectionOf(
      withImportLock(
        async () => {
          runs += 1;
          throw boom;
        },
        { locks },
      ),
    );
    expect(caught).toBe(boom);
    expect(runs).toBe(1);
    await tick();
    expect(locks.heldNames()).toEqual([]);
  });
});
