import { describe, expect, it, vi } from 'vitest';
import { lazyResource } from '@/components/atlas/data/lazyResource';
import { afterLoad, cancelPendingNavigation } from './pendingNavigation';

/** A resource whose load the test resolves or rejects by hand. */
function deferredResource() {
  let settle!: { resolve: (v: string) => void; reject: (e: Error) => void };
  const resource = lazyResource(
    () =>
      new Promise<string>((resolve, reject) => {
        settle = { resolve, reject };
      }),
  );
  return { resource, settle: () => settle };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('afterLoad', () => {
  it('runs at once when the data is already there', async () => {
    const resource = lazyResource(async () => 'ready');
    await resource.load();
    const apply = vi.fn();
    afterLoad(resource, apply);
    expect(apply).toHaveBeenCalledWith('ready');
  });

  it('runs when the data lands', async () => {
    const { resource, settle } = deferredResource();
    const apply = vi.fn();
    afterLoad(resource, apply);
    await flush();
    expect(apply).not.toHaveBeenCalled();
    settle().resolve('late');
    await flush();
    expect(apply).toHaveBeenCalledWith('late');
  });

  it('drops a wait that a newer one replaced', async () => {
    const { resource, settle } = deferredResource();
    const first = vi.fn();
    const second = vi.fn();
    afterLoad(resource, first);
    afterLoad(resource, second);
    await flush();
    settle().resolve('data');
    await flush();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('data');
  });

  it('drops a wait when the user has moved on', async () => {
    const { resource, settle } = deferredResource();
    const apply = vi.fn();
    afterLoad(resource, apply);
    cancelPendingNavigation();
    await flush();
    settle().resolve('data');
    await flush();
    expect(apply).not.toHaveBeenCalled();
  });

  it('still runs, without data, when the load fails', async () => {
    const { resource, settle } = deferredResource();
    const apply = vi.fn();
    afterLoad(resource, apply);
    await flush();
    settle().reject(new Error('offline'));
    await flush();
    expect(apply).toHaveBeenCalledWith(undefined);
  });
});
