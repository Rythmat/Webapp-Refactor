// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { BulkWrite } from '../useBulkWrite';

/**
 * The bulk write loop against a stubbed content API: what it sends, in what
 * order, what it lists, and that it refetches once.
 */

const api = vi.hoisted(() => ({
  role: 'admin' as 'admin' | 'editor',
  userId: 'me',
  /** What `/capabilities` reports served. */
  features: new Set(['lookup', 'create']),
  calls: [] as { path: string; method: string; body?: unknown }[],
  /** Slugs whose PUT fails, and how. */
  refuse: new Map<string, Error>(),
  /** The stored items, by DB id, for the re-read. */
  stored: new Map<string, Record<string, unknown>>(),
  /** Runs inside each PUT, before it answers. */
  duringPut: null as null | (() => void),
}));

vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ role: api.role, userId: api.userId, token: 'test' }),
}));
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => ({
    feature: (name: string) => api.features.has(name),
  }),
}));
vi.mock('@/hooks/data/admin/useAdminContent', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/hooks/data/admin/useAdminContent')>();
  return {
    ...actual,
    contentRequest: async (
      path: string,
      _token: string,
      init?: RequestInit,
    ) => {
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      api.calls.push({ path, method, body });
      if (method === 'PUT') {
        api.duringPut?.();
        const refused = api.refuse.get(body.slug);
        if (refused) throw refused;
        return { item: {}, warnings: [] };
      }
      const lookup = /^\/items\/lookup\?kind=(\w+)&slug=(.+)$/.exec(path);
      if (lookup) {
        const id = `id-${decodeURIComponent(lookup[2])}`;
        if (api.stored.has(id)) return { id };
        throw new actual.ContentApiError(404, { code: 'NOT_FOUND' });
      }
      const item = /^\/items\/(.+)$/.exec(path);
      if (item && api.stored.has(item[1])) return api.stored.get(item[1]);
      throw new actual.ContentApiError(404, { error: 'No such item.' });
    },
  };
});

let useBulkWrite: typeof import('../useBulkWrite').useBulkWrite;
let ContentApiError: typeof import('@/hooks/data/admin/useAdminContent').ContentApiError;
beforeAll(async () => {
  ({ useBulkWrite } = await import('../useBulkWrite'));
  ({ ContentApiError } = await import('@/hooks/data/admin/useAdminContent'));
});

afterEach(() => {
  cleanup();
  api.role = 'admin';
  api.userId = 'me';
  api.features = new Set(['lookup', 'create']);
  api.calls = [];
  api.refuse.clear();
  api.stored.clear();
  api.duringPut = null;
});

const setup = () => {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useBulkWrite(), { wrapper });
  return { hook, invalidate };
};

const song = (slug: string, extra: Partial<BulkWrite> = {}): BulkWrite => ({
  kind: 'song',
  slug,
  body: { id: slug },
  note: 'Linked artist names to their records',
  ...extra,
});

const puts = () =>
  api.calls.filter((c) => c.method === 'PUT').map((c) => c.body);

describe('the bulk write', () => {
  it('saves one item at a time, lists failures, and refetches once', async () => {
    api.refuse.set('b', new Error('Unknown vocabulary id'));
    const { hook, invalidate } = setup();
    let result: Awaited<ReturnType<typeof hook.result.current.run>>;
    await act(async () => {
      result = await hook.result.current.run([song('a'), song('b'), song('c')]);
    });
    expect(puts()).toEqual([
      {
        kind: 'song',
        slug: 'a',
        body: { id: 'a' },
        note: 'Linked artist names to their records',
      },
      expect.objectContaining({ slug: 'b' }),
      expect.objectContaining({ slug: 'c' }),
    ]);
    expect(result!).toEqual({
      done: 3,
      total: 3,
      failed: ['b: Unknown vocabulary id'],
      skipped: [],
      conflicts: [],
    });
    expect(hook.result.current.progress).toEqual(result!);
    expect(hook.result.current.busy).toBe(false);
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'content'] });
  });

  it('closes the dry run after the last write and before the refetch', async () => {
    const { hook, invalidate } = setup();
    const order: string[] = [];
    invalidate.mockImplementation(async () => {
      order.push('invalidate');
    });
    await act(async () => {
      await hook.result.current.run([song('a')], {
        onWritten: () => order.push('written'),
      });
    });
    expect(order).toEqual(['written', 'invalidate']);
  });

  it('finishes the item in flight on Stop, then writes no more', async () => {
    const { hook } = setup();
    api.duringPut = () => {
      if (api.calls.length === 2) hook.result.current.stop();
    };
    let result: Awaited<ReturnType<typeof hook.result.current.run>>;
    await act(async () => {
      result = await hook.result.current.run([song('a'), song('b'), song('c')]);
    });
    expect(puts().map((b) => (b as { slug: string }).slug)).toEqual(['a', 'b']);
    expect(result!.done).toBe(2);
    expect(hook.result.current.busy).toBe(false);
  });

  it('passes over items with a proposal awaiting review, and lists them', async () => {
    const { hook } = setup();
    let result: Awaited<ReturnType<typeof hook.result.current.run>>;
    await act(async () => {
      result = await hook.result.current.run(
        [song('a', { pending: true }), song('b')],
        { skipPending: true },
      );
    });
    expect(puts().map((b) => (b as { slug: string }).slug)).toEqual(['b']);
    expect(result!.skipped).toEqual(['a']);
    expect(result!.done).toBe(2);
  });

  it('lets an editor write into their own proposal, and never over someone else’s', async () => {
    api.role = 'editor';
    api.stored.set('id-a', {
      body: { id: 'a' },
      pendingBody: { id: 'a', mine: true },
      pendingById: 'me',
      editState: 'pending',
    });
    // Another editor's: the server hides the body, and a save would replace it.
    api.stored.set('id-b', {
      body: { id: 'b' },
      pendingBody: null,
      pendingById: 'someone-else',
      editState: 'pending',
    });
    const { hook } = setup();
    let result: Awaited<ReturnType<typeof hook.result.current.run>>;
    await act(async () => {
      result = await hook.result.current.run([
        song('a', { pending: true }),
        song('b', { pending: true }),
        song('c', { id: 'id-b', rebase: (body) => ({ body }) }),
      ]);
    });
    expect(puts().map((b) => (b as { slug: string }).slug)).toEqual(['a']);
    expect(result!.skipped).toEqual(['b', 'c']);
  });

  it('re-reads before writing when the plan rests on what it saw', async () => {
    api.stored.set('id-a', {
      body: { id: 'a', year: 1982 },
      editState: null,
    });
    api.stored.set('id-b', {
      body: { id: 'b', year: 1999 },
      editState: null,
    });
    const rebase = (current: Record<string, unknown>) =>
      current.year === 1982
        ? { body: { ...current, placeId: 'la' } }
        : { conflict: 'the year has changed' };
    const { hook } = setup();
    let result: Awaited<ReturnType<typeof hook.result.current.run>>;
    await act(async () => {
      result = await hook.result.current.run([
        song('a', { id: 'id-a', rebase }),
        // No id: found by its slug first.
        song('b', { rebase }),
      ]);
    });
    expect(api.calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'GET /items/id-a',
      'PUT /items',
      'GET /items/lookup?kind=song&slug=b',
      'GET /items/id-b',
    ]);
    expect(puts()[0]).toMatchObject({
      body: { id: 'a', year: 1982, placeId: 'la' },
    });
    expect(result!.conflicts).toEqual(['b: the year has changed']);
  });

  it('builds an editor’s write on their own proposal', async () => {
    api.role = 'editor';
    api.stored.set('id-a', {
      body: { id: 'a' },
      pendingBody: { id: 'a', mine: true },
      pendingById: 'me',
      editState: 'pending',
    });
    const { hook } = setup();
    await act(async () => {
      await hook.result.current.run([
        song('a', { id: 'id-a', rebase: (body) => ({ body }) }),
      ]);
    });
    expect(puts()[0]).toMatchObject({ body: { id: 'a', mine: true } });
  });

  it('skips an item whose proposal appeared since the plan', async () => {
    api.stored.set('id-a', { body: { id: 'a' }, editState: 'pending' });
    const { hook } = setup();
    let result: Awaited<ReturnType<typeof hook.result.current.run>>;
    await act(async () => {
      result = await hook.result.current.run(
        [song('a', { id: 'id-a', rebase: (body) => ({ body }) })],
        { skipPending: true },
      );
    });
    expect(puts()).toHaveLength(0);
    expect(result!.skipped).toEqual(['a']);
  });

  it('creates records first, in publish order, and holds back what needs one that was not made', async () => {
    api.refuse.set(
      'motown',
      new ContentApiError(409, { error: 'Taken', code: 'SLUG_TAKEN' }),
    );
    api.stored.set('id-motown', { body: { slug: 'motown', name: 'Motown' } });
    const { hook } = setup();
    let result: Awaited<ReturnType<typeof hook.result.current.run>>;
    const artist = {
      kind: 'artist' as const,
      slug: 'marvin-gaye',
      body: { slug: 'marvin-gaye', labelIds: ['motown'] },
      needs: ['label:motown'],
    };
    await act(async () => {
      result = await hook.result.current.run([
        artist,
        {
          kind: 'artist',
          slug: 'tammi-terrell',
          body: { slug: 'tammi-terrell', name: 'Tammi Terrell' },
          makes: true,
        },
        {
          kind: 'label',
          slug: 'motown',
          body: { slug: 'motown', name: 'Motown' },
          makes: true,
        },
        {
          kind: 'globe_city',
          slug: 'detroit',
          body: { id: 'detroit' },
          makes: true,
        },
      ]);
    });
    expect(
      puts().map(
        (b) =>
          `${(b as { kind: string }).kind}:${(b as { slug: string }).slug}`,
      ),
    ).toEqual(['globe_city:detroit', 'label:motown', 'artist:tammi-terrell']);
    expect(puts()[0]).toMatchObject({ create: true });
    // The placeholder rule: a taken slug is held for a person, and so is
    // everything that needed it.
    // Several kinds in the run: each is named with its kind.
    expect(result!.conflicts).toEqual([
      'label:motown: a record with this id already exists; check it is the same one',
      'artist:marvin-gaye: waits for label:motown',
    ]);
  });

  it('uses a taken record when the rule says it is the same one', async () => {
    // The 409 names the record there, so it is read without a lookup.
    api.refuse.set(
      'motown',
      new ContentApiError(409, {
        error: 'Taken',
        code: 'SLUG_TAKEN',
        id: 'id-motown',
      }),
    );
    api.stored.set('id-motown', { body: { slug: 'motown', name: 'Motown' } });
    const onSlugTaken = vi.fn(() => 'reuse' as const);
    const { hook } = setup();
    let result: Awaited<ReturnType<typeof hook.result.current.run>>;
    await act(async () => {
      result = await hook.result.current.run(
        [
          {
            kind: 'artist',
            slug: 'marvin-gaye',
            body: { slug: 'marvin-gaye', labelIds: ['motown'] },
            needs: ['label:motown'],
          },
          {
            kind: 'label',
            slug: 'motown',
            body: { slug: 'motown', name: 'Motown' },
            makes: true,
          },
        ],
        { onSlugTaken },
      );
    });
    expect(onSlugTaken).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'motown' }),
      { body: { slug: 'motown', name: 'Motown' } },
    );
    expect(result!.conflicts).toEqual([]);
    expect(puts().map((b) => (b as { slug: string }).slug)).toEqual([
      'motown',
      'marvin-gaye',
    ]);
    expect(api.calls.some((c) => c.path.startsWith('/items/lookup'))).toBe(
      false,
    );
  });

  it('never makes a record with a plain PUT over one already there', async () => {
    // No create-only on this server: the slug is looked up first.
    api.features = new Set(['lookup']);
    api.stored.set('id-motown', { body: { slug: 'motown', name: 'Motown' } });
    const onSlugTaken = vi.fn(() => ({ held: 'not the same label' }));
    const label = (slug: string) => ({
      kind: 'label' as const,
      slug,
      body: { slug, name: slug },
      makes: true,
    });
    const { hook } = setup();
    let result: Awaited<ReturnType<typeof hook.result.current.run>>;
    await act(async () => {
      result = await hook.result.current.run([label('motown'), label('stax')], {
        onSlugTaken,
      });
    });
    expect(onSlugTaken).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'motown' }),
      { body: { slug: 'motown', name: 'Motown' } },
    );
    // Stax was not there: made, as a plain PUT since that is all there is.
    expect(puts()).toEqual([
      { kind: 'label', slug: 'stax', body: { slug: 'stax', name: 'stax' } },
    ]);
    expect(result!.conflicts).toEqual(['motown: not the same label']);

    // Neither create-only nor lookup: nothing is made at all.
    api.features = new Set();
    api.calls = [];
    const bare = setup();
    await act(async () => {
      result = await bare.hook.result.current.run([label('stax')]);
    });
    expect(puts()).toEqual([]);
    expect(result!.conflicts).toEqual([
      expect.stringMatching(/^stax: this server can neither/),
    ]);
  });

  it('needs an id to re-read where the server cannot look a slug up', async () => {
    api.features = new Set();
    const { hook } = setup();
    let result: Awaited<ReturnType<typeof hook.result.current.run>>;
    await act(async () => {
      result = await hook.result.current.run([
        song('a', { rebase: (body) => ({ body }) }),
      ]);
    });
    expect(api.calls).toEqual([]);
    expect(result!.failed).toEqual([
      expect.stringMatching(/^a: this server cannot find an item by its slug/),
    ]);
  });

  it('fails the item, not the run, when a rule throws', async () => {
    api.refuse.set(
      'motown',
      new ContentApiError(409, { error: 'Taken', code: 'SLUG_TAKEN' }),
    );
    api.stored.set('id-motown', { body: { slug: 'motown' } });
    const { hook } = setup();
    let result: Awaited<ReturnType<typeof hook.result.current.run>>;
    await act(async () => {
      result = await hook.result.current.run(
        [
          { kind: 'label', slug: 'motown', body: {}, makes: true },
          { kind: 'label', slug: 'stax', body: {}, makes: true },
        ],
        {
          onSlugTaken: () => {
            throw new Error('the rule broke');
          },
        },
      );
    });
    expect(result!).toMatchObject({
      done: 2,
      total: 2,
      failed: ['motown: the rule broke'],
    });
    expect(puts().map((b) => (b as { slug: string }).slug)).toEqual([
      'motown',
      'stax',
    ]);
    expect(hook.result.current.busy).toBe(false);
  });

  it('writes each item once, and a record after the records it needs', async () => {
    const { hook } = setup();
    let result: Awaited<ReturnType<typeof hook.result.current.run>>;
    const artist = (slug: string, extra: Partial<BulkWrite> = {}) => ({
      kind: 'artist' as const,
      slug,
      body: { slug },
      makes: true,
      ...extra,
    });
    await act(async () => {
      result = await hook.result.current.run([
        // The group is listed before its members; it is written after them.
        artist('the-funk-brothers', {
          needs: ['artist:james-jamerson', 'artist:benny-benjamin'],
        }),
        artist('james-jamerson'),
        artist('benny-benjamin'),
        song('a'),
        song('a', { body: { id: 'a', again: true } }),
      ]);
    });
    expect(
      puts().map(
        (b) =>
          `${(b as { kind: string }).kind}:${(b as { slug: string }).slug}`,
      ),
    ).toEqual([
      'artist:james-jamerson',
      'artist:benny-benjamin',
      'artist:the-funk-brothers',
      'song:a',
    ]);
    expect(result!.conflicts).toEqual([
      'song:a: planned twice in this run; the second was not written',
    ]);
  });
});
