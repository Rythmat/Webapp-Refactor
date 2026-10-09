import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { beforeAll, describe, expect, it } from 'vitest';
import { createDraftStore } from '../draftStore';
import { createLocalStorageDrafts } from '../localStorageDrafts';
import {
  KEPT_SOFT_CAP,
  MEDIA_QUOTA_GRACE_MS,
  planPrune,
  planQuotaDrafts,
  runPrune,
  userSeenKey,
  type PruneInput,
  type PrunePolicy,
} from '../prune';
import type { DraftMeta, DraftMediaRecord } from '../types';
import {
  createWrite,
  DAY,
  manualClock,
  MemoryStorage,
  updateWrite,
  writeMeta,
  type DraftKind,
} from './draftTestUtils';

// ── Pruning (milestone 1.4, spec §5) ───────────────────────────────────────
// Run: npx vitest run src/lib/studio-projects/drafts/__tests__/prune.test.ts

beforeAll(() => {
  (globalThis as { IDBKeyRange?: unknown }).IDBKeyRange = IDBKeyRange;
});

const NOW = 400 * DAY;

/** A stored meta, `ageDays` old (updatedAt and createdAt). */
function meta(
  draftId: string,
  userKey: string,
  kind: DraftKind,
  ageDays: number,
  extra: Partial<DraftMeta> = {},
): DraftMeta {
  const at = NOW - ageDays * DAY;
  return {
    ...writeMeta(draftId, userKey, kind),
    v: 1,
    writeSeq: 1,
    updatedAt: at,
    createdAt: at,
    writer: { build: 'b', doc: 'd' },
    contentHash: 'h1:c',
    chars: 10,
    ...extra,
  } as DraftMeta;
}

function policy(over: Partial<PrunePolicy> = {}): PrunePolicy {
  return {
    userKey: 'me',
    protect: new Set(),
    reason: 'boot',
    schemaVersion: 3,
    now: NOW,
    ...over,
  };
}

function plan(input: Partial<PruneInput> & { policy?: PrunePolicy }): string[] {
  return planPrune({
    policy: input.policy ?? policy(),
    now: NOW,
    mine: input.mine ?? [],
    device: input.device ?? [],
    others: input.others ?? [],
  })
    .drafts.map((m) => m.draftId)
    .sort();
}

describe('planPrune: boot and switch', () => {
  it("removes drafts without work except the user's newest", () => {
    const mine = [
      meta('newest-pristine', 'me', 'pristine', 0),
      meta('pristine', 'me', 'pristine', 1),
      meta('empty', 'me', 'empty', 2),
      meta('work', 'me', 'work', 3),
    ];
    expect(plan({ mine })).toEqual(['empty', 'pristine']);
    expect(plan({ mine, policy: policy({ reason: 'switch' }) })).toEqual([
      'empty',
      'pristine',
    ]);
  });

  it("removes cloud-equal drafts except the user's newest (what resume opens)", () => {
    const mine = [
      meta('cloud-newest', 'me', 'cloud-equal', 0),
      meta('cloud', 'me', 'cloud-equal', 1),
      meta('work', 'me', 'work', 2),
    ];
    expect(plan({ mine })).toEqual(['cloud']);
    expect(plan({ mine: [meta('only', 'me', 'cloud-equal', 3)] })).toEqual([]);
  });

  it('never removes a record a later build wrote (v other than 1)', () => {
    const later = {
      ...meta('later', 'me', 'pristine', 90),
      v: 2,
    } as unknown as DraftMeta;
    const laterDevice = {
      ...meta('later-dev', '~device', 'work', 90),
      v: 2,
    } as unknown as DraftMeta;
    expect(
      plan({
        mine: [meta('n', 'me', 'work', 0), later],
        device: [laterDevice],
      }),
    ).toEqual([]);
    expect(planQuotaDrafts([later], policy({ reason: 'quota' }), NOW)).toEqual(
      [],
    );
  });

  it('a cloud copy with media on this device is not cloud-equal', () => {
    const withMedia = meta('cloud-media', 'me', 'cloud-equal', 1, {
      media: [
        {
          mediaId: 'm',
          contentType: 'audio/wav',
          size: 1,
          clipIds: ['c'],
          samplerSampleIds: [],
        },
      ],
    });
    const missing = meta('cloud-missing', 'me', 'cloud-equal', 2, {
      mediaMissing: 1,
    });
    expect(
      plan({ mine: [meta('n', 'me', 'work', 0), withMedia, missing] }),
    ).toEqual([]);
  });

  it('never removes the protected set, read-only drafts or recent work', () => {
    const mine = [
      meta('newest', 'me', 'work', 0),
      meta('protected', 'me', 'pristine', 1),
      meta('future', 'me', 'empty', 2, { schema: 4 }),
      meta('future-cloud', 'me', 'cloud-equal', 2, { schema: 9 }),
      meta('recent-work', 'me', 'work', 29),
    ];
    expect(
      plan({ mine, policy: policy({ protect: new Set(['protected']) }) }),
    ).toEqual([]);
  });

  it('an unknown fingerprint counts as work', () => {
    const unknown = meta('unknown', 'me', 'pristine', 3, {
      docFingerprint: null,
    });
    expect(plan({ mine: [meta('n', 'me', 'work', 0), unknown] })).toEqual([]);
  });

  it('above 50 drafts, removes kept drafts older than 30 days, oldest first', () => {
    const mine: DraftMeta[] = [];
    for (let i = 0; i < KEPT_SOFT_CAP; i++)
      mine.push(meta(`w${i}`, 'me', 'work', i % 20));
    mine.push(
      meta('kept-31', 'me', 'work', 31, {
        origin: 'kept',
        keptAt: NOW - 31 * DAY,
      }),
    );
    mine.push(
      meta('kept-90', 'me', 'work', 90, {
        origin: 'kept',
        keptAt: NOW - 90 * DAY,
      }),
    );
    mine.push(
      meta('kept-60', 'me', 'work', 60, {
        origin: 'kept',
        keptAt: NOW - 60 * DAY,
      }),
    );
    mine.push(
      meta('kept-new', 'me', 'work', 10, {
        origin: 'kept',
        keptAt: NOW - 10 * DAY,
      }),
    );
    // 54 drafts: the three old kept ones are candidates, 4 over the cap.
    expect(plan({ mine })).toEqual(['kept-31', 'kept-60', 'kept-90']);
    // 52 drafts: only the two oldest go.
    expect(
      plan({
        mine: mine.filter(
          (m) => m.draftId !== 'kept-new' && m.draftId !== 'w0',
        ),
      }),
    ).toEqual(['kept-60', 'kept-90']);
  });

  it('at or under 50 drafts, old kept work stays', () => {
    const mine = [
      meta('n', 'me', 'work', 0),
      meta('kept-old', 'me', 'work', 300, {
        origin: 'kept',
        keptAt: NOW - 300 * DAY,
      }),
    ];
    expect(plan({ mine })).toEqual([]);
  });

  it("removes '~device' drafts older than 30 days, measured from when they arrived", () => {
    const device = [
      meta('dev-old', '~device', 'work', 31),
      meta('dev-new', '~device', 'work', 5),
      // An import of old content (updatedAt = its own time) that arrived recently.
      meta('dev-imported', '~device', 'work', 200, {
        createdAt: NOW - 2 * DAY,
      }),
      meta('dev-protected', '~device', 'work', 45),
    ];
    expect(
      plan({ device, policy: policy({ protect: new Set(['dev-protected']) }) }),
    ).toEqual(['dev-old']);
  });

  it('for users unseen for 60 days, removes their caches but never their work', () => {
    const others: PruneInput['others'] = [
      {
        userKey: 'gone',
        lastSeenAt: NOW - 61 * DAY,
        drafts: [
          meta('gone-newest-pristine', 'gone', 'pristine', 61),
          meta('gone-cloud', 'gone', 'cloud-equal', 70),
          meta('gone-work', 'gone', 'work', 100),
        ],
      },
      {
        userKey: 'recent',
        lastSeenAt: NOW - 59 * DAY,
        drafts: [meta('recent-pristine', 'recent', 'pristine', 59)],
      },
      {
        userKey: 'never-recorded',
        lastSeenAt: null,
        drafts: [meta('unknown-pristine', 'never-recorded', 'pristine', 365)],
      },
    ];
    expect(plan({ others })).toEqual(['gone-cloud', 'gone-newest-pristine']);
  });

  it('collects media for the user, and for each owner whose drafts went', () => {
    const result = planPrune({
      policy: policy(),
      now: NOW,
      mine: [],
      device: [meta('dev-old', '~device', 'work', 31)],
      others: [
        {
          userKey: 'gone',
          lastSeenAt: NOW - 90 * DAY,
          drafts: [meta('g', 'gone', 'pristine', 90)],
        },
      ],
    });
    expect(result.gcMedia.map((g) => g.userKey)).toEqual([
      'me',
      '~device',
      'gone',
    ]);
    expect(result.gcMedia.every((g) => g.graceMs === 10 * 60 * 1000)).toBe(
      true,
    );
  });

  it("always collects '~device' media (copies a claim left behind)", () => {
    const result = planPrune({
      policy: policy(),
      now: NOW,
      mine: [],
      device: [],
      others: [],
    });
    expect(result.gcMedia.map((g) => g.userKey)).toEqual(['me', '~device']);
    const asDevice = planPrune({
      policy: policy({ userKey: '~device' }),
      now: NOW,
      mine: [],
      device: [],
      others: [],
    });
    expect(asDevice.gcMedia.map((g) => g.userKey)).toEqual(['~device']);
  });
});

describe('planPrune: sign-out', () => {
  it("removes only the user's cloud-equal drafts", () => {
    const mine = [
      meta('cloud', 'me', 'cloud-equal', 0),
      meta('pristine', 'me', 'pristine', 1),
      meta('work', 'me', 'work', 2),
      meta('cloud-protected', 'me', 'cloud-equal', 3),
    ];
    expect(
      plan({
        mine,
        device: [meta('dev-old', '~device', 'work', 90)],
        policy: policy({
          reason: 'sign-out',
          protect: new Set(['cloud-protected']),
        }),
      }),
    ).toEqual(['cloud']);
  });
});

describe('planQuotaDrafts: one step per call', () => {
  it('cloud-equal first, then no-work, then the single oldest old kept draft', () => {
    const p = policy({ reason: 'quota' });
    const all = [
      meta('cloud', 'me', 'cloud-equal', 0),
      meta('pristine', 'me', 'pristine', 0),
      meta('kept-40', 'me', 'work', 40, {
        origin: 'kept',
        keptAt: NOW - 40 * DAY,
      }),
      meta('kept-50', 'me', 'work', 50, {
        origin: 'kept',
        keptAt: NOW - 50 * DAY,
      }),
      meta('work', 'me', 'work', 0),
    ];
    const ids = (ms: DraftMeta[]) =>
      planQuotaDrafts(ms, p, NOW).map((m) => m.draftId);
    expect(ids(all)).toEqual(['cloud']);
    const step2 = all.filter((m) => m.draftId !== 'cloud');
    expect(ids(step2)).toEqual(['pristine']);
    const step3 = step2.filter((m) => m.draftId !== 'pristine');
    expect(ids(step3)).toEqual(['kept-50']);
    const step4 = step3.filter((m) => m.draftId !== 'kept-50');
    expect(ids(step4)).toEqual(['kept-40']);
    expect(ids(step4.filter((m) => m.draftId !== 'kept-40'))).toEqual([]);
  });

  it('never the protected set, read-only drafts or recent work', () => {
    const p = policy({ reason: 'quota', protect: new Set(['active']) });
    expect(
      planQuotaDrafts(
        [
          meta('active', 'me', 'pristine', 0),
          meta('future', 'me', 'cloud-equal', 0, { schema: 9 }),
          meta('kept-recent', 'me', 'work', 10, {
            origin: 'kept',
            keptAt: NOW - 10 * DAY,
          }),
        ],
        p,
        NOW,
      ),
    ).toEqual([]);
  });
});

// ── runPrune over real adapters ────────────────────────────────────────────

describe('runPrune', () => {
  it('skips a draft another writer changed between the plan and the delete', async () => {
    const clock = manualClock(NOW);
    const ls = createLocalStorageDrafts({
      storage: new MemoryStorage(),
      now: clock,
      writer: { build: 'b', doc: 'd' },
    });
    await ls.write(createWrite('a', 'me', 'pristine'));
    clock.advance(1);
    await ls.write(createWrite('b', 'me', 'pristine'));
    clock.advance(1);
    await ls.write(createWrite('c', 'me', 'work'));
    // The plan reads the list; then another tab writes 'a' before the delete.
    const report = await runPrune(
      {
        ...ls,
        list: async (userKey) => {
          const listed = await ls.list(userKey);
          if (userKey === 'me') {
            const a = (await ls.getMeta('a')) as DraftMeta;
            await ls.write(updateWrite(a, 'other tab'));
          }
          return listed;
        },
      },
      policy({ now: clock() }),
    );
    expect(report.deletedDrafts).toEqual(['b']);
    expect(await ls.getMeta('a')).not.toBeNull();
  });

  it('skips a draft patched between the plan and the delete (claim, cloud link cleared)', async () => {
    const clock = manualClock(NOW);
    const store = createLocalStorageDrafts({
      storage: new MemoryStorage(),
      now: clock,
      writer: { build: 'b', doc: 'd' },
    });
    await store.write(createWrite('cloud', 'me', 'cloud-equal'));
    clock.advance(1);
    await store.write(createWrite('cloud-2', 'me', 'cloud-equal'));
    clock.advance(1);
    await store.write(createWrite('newest', 'me', 'work'));
    const report = await runPrune(
      {
        ...store,
        list: async (userKey) => {
          const listed = await store.list(userKey);
          // File ▸ Delete elsewhere: the cloud link goes, so it is work now.
          if (userKey === 'me')
            await store.patchMeta('cloud', { cloud: null, projectId: null });
          return listed;
        },
      },
      policy({ now: clock() }),
    );
    expect(report.deletedDrafts).toEqual(['cloud-2']);
    expect(await store.getMeta('cloud')).not.toBeNull();
  });

  it("an old import that just arrived in '~device' survives the same boot's prune", async () => {
    const clock = manualClock(NOW);
    const store = createDraftStore({
      indexedDB: new IDBFactory(),
      storage: new MemoryStorage(),
      now: clock,
    });
    await store.write({
      ...createWrite('imported', '~device', 'work', {
        origin: 'migrated',
        createdAt: NOW - 90 * DAY,
      }),
      updatedAt: NOW - 90 * DAY,
    });
    const report = await store.prune(policy({ now: clock() }));
    expect(report.deletedDrafts).toEqual([]);
    expect((await store.getMeta('imported'))?.updatedAt).toBe(NOW - 90 * DAY);
    // 31 days later it goes.
    clock.advance(31 * DAY);
    const later = await store.prune(policy({ now: clock() }));
    expect(later.deletedDrafts).toEqual(['imported']);
  });

  it('keeps media named in protectMedia past the grace (a mirror references it)', async () => {
    const clock = manualClock(NOW);
    const store = createDraftStore({
      indexedDB: new IDBFactory(),
      storage: new MemoryStorage(),
      now: clock,
    });
    const put = (mediaId: string) =>
      store.putMedia({
        key: `me:${mediaId}`,
        mediaId,
        userKey: 'me',
        blob: new Blob(['x']),
        contentType: 'audio/wav',
        size: 1,
        createdAt: clock() - DAY,
      });
    await put('in-mirror');
    await put('orphan');
    const report = await store.prune(
      policy({ now: clock(), protectMedia: new Set(['in-mirror']) }),
    );
    expect(report.deletedMedia).toBe(1);
    expect(await store.hasMedia('me', ['in-mirror', 'orphan'])).toEqual(
      new Set(['in-mirror']),
    );
  });

  it('reads lastSeenAt from the meta store for unseen users', async () => {
    const clock = manualClock(NOW - 90 * DAY);
    const store = createDraftStore({
      indexedDB: new IDBFactory(),
      storage: new MemoryStorage(),
      now: clock,
    });
    await store.write(createWrite('theirs', 'them', 'pristine'));
    await store.write(createWrite('theirs-work', 'them', 'work'));
    await store.write(createWrite('unknown', 'nobody-recorded', 'pristine'));
    await store.setMetaValue(userSeenKey('them'), { lastSeenAt: clock() });
    clock.set(NOW);
    await store.write(createWrite('mine', 'me', 'pristine'));
    const report = await store.prune(policy());
    expect(report.deletedDrafts).toEqual(['theirs']);
    expect((await store.list('them')).map((m) => m.draftId)).toEqual([
      'theirs-work',
    ]);
    expect(await store.list('nobody-recorded')).toHaveLength(1);
  });

  it('quota: orphan media first (2-minute grace, minus protectMedia), then drafts', async () => {
    const clock = manualClock(NOW);
    const store = createDraftStore({
      indexedDB: new IDBFactory(),
      storage: new MemoryStorage(),
      now: clock,
    });
    const media = (mediaId: string, createdAt: number): DraftMediaRecord => ({
      key: `me:${mediaId}`,
      mediaId,
      userKey: 'me',
      blob: new Blob(['x']),
      contentType: 'audio/wav',
      size: 1,
      createdAt,
    });
    const old = clock() - MEDIA_QUOTA_GRACE_MS - 1;
    await store.putMedia(media('orphan', old));
    await store.putMedia(media('pending', old));
    // Another tab of this user just stored it; its draft write is coming.
    await store.putMedia(media('other-tab-take', clock() - 5_000));
    await store.write(createWrite('cloud', 'me', 'cloud-equal'));
    await store.write(createWrite('work', 'me', 'work'));
    const quota = policy({
      reason: 'quota',
      protectMedia: new Set(['pending']),
    });
    expect(await store.prune(quota)).toEqual({
      deletedDrafts: [],
      deletedMedia: 1,
      freedChars: 0,
    });
    const second = await store.prune(quota);
    expect(second.deletedDrafts).toEqual(['cloud']);
    expect(second.freedChars).toBeGreaterThan(0);
    expect((await store.prune(quota)).deletedDrafts).toEqual([]);
    expect(
      await store.hasMedia('me', ['pending', 'other-tab-take', 'orphan']),
    ).toEqual(new Set(['pending', 'other-tab-take']));
    expect((await store.list('me')).map((m) => m.draftId)).toEqual(['work']);
  });

  it('sign-out removes cloud-equal drafts, then collects media', async () => {
    const clock = manualClock(NOW);
    const store = createDraftStore({
      indexedDB: new IDBFactory(),
      storage: new MemoryStorage(),
      now: clock,
    });
    await store.putMedia({
      key: 'me:old',
      mediaId: 'old',
      userKey: 'me',
      blob: new Blob(['x']),
      contentType: 'audio/wav',
      size: 1,
      createdAt: clock() - DAY,
    });
    await store.write(createWrite('cloud', 'me', 'cloud-equal'));
    await store.write(createWrite('pristine', 'me', 'pristine'));
    const report = await store.prune(policy({ reason: 'sign-out' }));
    expect(report).toMatchObject({ deletedDrafts: ['cloud'], deletedMedia: 1 });
    expect((await store.list('me')).map((m) => m.draftId)).toEqual([
      'pristine',
    ]);
  });
});
