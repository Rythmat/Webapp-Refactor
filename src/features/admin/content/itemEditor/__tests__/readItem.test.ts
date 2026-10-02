import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isNotFound, NO_LOOKUP, readItem, readStoredItem } from '../readItem';

/**
 * Reading an item as stored now, in full: by the id an export gives, else by
 * its slug where the server looks one up. Link… asks for null when it is not
 * there; a bulk write, which must find its item, for the reason.
 */

const api = vi.hoisted(() => ({
  paths: [] as string[],
  /** The stored items, by DB id; each is found by `slug` too. */
  stored: new Map<string, { id: string; slug: string }>(),
  /** What the next `/items/:id` throws, when set. */
  failRead: null as Error | null,
}));

vi.mock('@/hooks/data/admin/useAdminContent', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/hooks/data/admin/useAdminContent')>();
  const notFound = () => new actual.ContentApiError(404, { code: 'NOT_FOUND' });
  return {
    ...actual,
    contentRequest: async (path: string) => {
      api.paths.push(path);
      const lookup = /^\/items\/lookup\?kind=(\w+)&slug=(.+)$/.exec(path);
      if (lookup) {
        const slug = decodeURIComponent(lookup[2]);
        const hit = [...api.stored.values()].find((i) => i.slug === slug);
        if (hit) return { id: hit.id };
        throw notFound();
      }
      if (api.failRead) throw api.failRead;
      const id = decodeURIComponent(/^\/items\/(.+)$/.exec(path)![1]);
      const item = api.stored.get(id);
      if (item) return item;
      throw notFound();
    },
  };
});

beforeEach(() => {
  api.paths.length = 0;
  api.stored.clear();
  api.stored.set('db-toto', { id: 'db-toto', slug: 'toto' });
  api.failRead = null;
});

const toto = { kind: 'artist', slug: 'toto' } as const;

describe('readItem', () => {
  it('reads by the id given, without a lookup', async () => {
    expect(await readItem('t', { ...toto, id: 'db-toto' }, true)).toEqual({
      id: 'db-toto',
      slug: 'toto',
    });
    expect(api.paths).toEqual(['/items/db-toto']);
  });

  it('looks the slug up, then reads the item', async () => {
    expect((await readItem('t', toto, true))?.id).toBe('db-toto');
    expect(api.paths).toEqual([
      '/items/lookup?kind=artist&slug=toto',
      '/items/db-toto',
    ]);
  });

  it('is null for a slug the server has no item for, or cannot look up', async () => {
    expect(await readItem('t', { ...toto, slug: 'nobody' }, true)).toBeNull();
    expect(await readItem('t', toto, false)).toBeNull();
    // Without a lookup nothing is asked at all.
    expect(api.paths).toEqual(['/items/lookup?kind=artist&slug=nobody']);
  });

  it('throws when an id given has gone, and whatever else the server says', async () => {
    await expect(
      readItem('t', { ...toto, id: 'db-gone' }, true),
    ).rejects.toSatisfy(isNotFound);
    api.failRead = new Error('offline');
    await expect(readItem('t', toto, true)).rejects.toThrow('offline');
  });
});

describe('readStoredItem', () => {
  it('reads as readItem does', async () => {
    expect((await readStoredItem('t', toto, true)).id).toBe('db-toto');
  });

  it('throws what is not there: the lookup’s 404, or why it cannot look', async () => {
    await expect(
      readStoredItem('t', { ...toto, slug: 'nobody' }, true),
    ).rejects.toSatisfy(isNotFound);
    await expect(readStoredItem('t', toto, false)).rejects.toThrow(NO_LOOKUP);
  });
});
