// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type {
  ContentKind,
  ContentOverviewRow,
} from '@/hooks/data/admin/useAdminContent';
import {
  readImportMemory,
  rememberImport,
  shouldOfferImport,
} from '../../songImport/importMemory';
import {
  dismissPublishRun,
  kindsToPublish,
  resetPublishRunForTests,
  runPublish,
  usePublishRun,
} from '../publishRun';

afterEach(() => {
  resetPublishRunForTests();
  localStorage.clear();
});

const row = (
  kind: ContentKind,
  changedSincePublish: number,
  published = 10,
): ContentOverviewRow => ({
  kind,
  total: published,
  published,
  changedSincePublish,
  pendingReview: 0,
  liveVersion: 1,
  livePublishedAt: null,
});

describe('what "publish everything" publishes', () => {
  it('takes only changed kinds, referenced kinds first', () => {
    expect(
      kindsToPublish([
        row('song', 3),
        row('activity_flow', 1),
        row('globe_event', 0),
        row('artist', 2),
        row('globe_city', 1),
      ]),
    ).toEqual(['globe_city', 'artist', 'song', 'activity_flow']);
  });

  it('skips a kind with nothing published yet', () => {
    // Its Publish button is disabled too: the first publish is deliberate.
    expect(kindsToPublish([row('label', 4, 0), row('song', 1)])).toEqual([
      'song',
    ]);
  });
});

describe('a publish run', () => {
  it('publishes in order and says so', async () => {
    const { result } = renderHook(() => usePublishRun());
    const order: ContentKind[] = [];
    await act(() =>
      runPublish(['globe_city', 'song'], async (kind) => {
        order.push(kind);
      }),
    );
    expect(order).toEqual(['globe_city', 'song']);
    expect(result.current).toMatchObject({
      status: 'done',
      published: ['globe_city', 'song'],
      current: null,
    });
  });

  it('stops at the first failure', async () => {
    const { result } = renderHook(() => usePublishRun());
    const order: ContentKind[] = [];
    await act(() =>
      runPublish(['globe_city', 'artist', 'song'], async (kind) => {
        order.push(kind);
        if (kind === 'artist') throw new Error('422 VALIDATION_FAILED');
      }),
    );
    expect(order).toEqual(['globe_city', 'artist']);
    expect(result.current).toMatchObject({
      status: 'failed',
      current: 'artist',
      published: ['globe_city'],
      error: '422 VALIDATION_FAILED',
    });
  });

  it('refuses a second run while one is going', async () => {
    let finish!: () => void;
    const first = runPublish(
      ['song'],
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    expect(await runPublish(['globe_city'], async () => {})).toBe(false);
    finish();
    expect(await first).toBe(true);
    // Finished runs stay until dismissed; then a new one may start.
    dismissPublishRun();
    expect(await runPublish(['globe_city'], async () => {})).toBe(true);
  });
});

describe('whether Publishing offers the import', () => {
  it('offers it until a compare finds nothing to write', () => {
    expect(shouldOfferImport()).toBe(true);
    rememberImport({ toWrite: 341, failures: 0 });
    expect(shouldOfferImport()).toBe(true);
    rememberImport({ toWrite: 0, failures: 2 });
    expect(shouldOfferImport()).toBe(true);
    rememberImport({ toWrite: 0, failures: 0 });
    expect(shouldOfferImport()).toBe(false);
    expect(readImportMemory()?.at).toMatch(/^\d{4}-/);
  });

  it('keeps offering it when storage holds junk', () => {
    localStorage.setItem('console.songImport.lastCompare', '{nope');
    expect(shouldOfferImport()).toBe(true);
  });
});
