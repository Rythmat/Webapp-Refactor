import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import SuperJSON from 'superjson';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRepoContentHandle, type RepoContentHandle } from '../repoHttp';
import { ARTISTS_FILE, REGISTRY_FILE } from '../sources/artists';
import { scratchCopy } from './scratchCopy';

/**
 * The repo content server's HTTP face (`repoHttp.ts`) over a copy of the
 * data files: who it serves, what it answers, and how. The transport
 * checks in front of it are the plugin's (repoContentPlugin.test.ts).
 */

/** An app JWT with these claims; the server reads them without verifying. */
const jwt = (claims: Record<string, unknown>) =>
  [{ alg: 'none', typ: 'JWT' }, claims]
    .map((part) => Buffer.from(JSON.stringify(part)).toString('base64url'))
    .join('.') + '.unsigned';

const ADMIN = `Bearer ${jwt({ role: 'admin', user_id: 'admin-1' })}`;
const EDITOR = `Bearer ${jwt({ role: 'editor', user_id: 'ed-1' })}`;

let root: string;
let handle: RepoContentHandle;

beforeAll(async () => {
  root = await scratchCopy('repo-http-');
  handle = createRepoContentHandle({ root, planners: false, git: false });
}, 60_000);

afterAll(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

const call = (
  method: string,
  path: string,
  { auth = ADMIN, body }: { auth?: string | null; body?: string } = {},
) =>
  handle.handle({
    method,
    url: `/api/admin/content${path}`,
    headers: {
      ...(auth ? { authorization: auth } : {}),
      'content-type': 'application/json',
    },
    bodyText: body ?? '',
  });

const parsed = <T>(text: string) => SuperJSON.parse<T>(text);

describe('the repo content server over HTTP', () => {
  it('knows nothing of the files until it loads', async () => {
    const fresh = createRepoContentHandle({
      root,
      planners: false,
      git: false,
    });
    expect(fresh.watchPaths()).toEqual([]);
    expect(fresh.covers(join(root, ARTISTS_FILE))).toBe(false);
    expect(await fresh.externalChange([join(root, ARTISTS_FILE)])).toEqual([]);
  });

  it('serves an admin the contract, as SuperJSON, and says it is the repo', async () => {
    const answer = await call('GET', '/capabilities');
    expect(answer.status).toBe(200);
    expect(answer.headers['Content-Type']).toMatch(/application\/json/);
    expect(answer.headers['Cache-Control']).toBe('no-store');
    expect(parsed<{ store: string }>(answer.text).store).toBe('repo');
    await handle.ready();
    expect(handle.root).toBe(root);
    expect(handle.watchPaths().every((path) => path.startsWith(root))).toBe(
      true,
    );
    expect(handle.covers(join(root, ARTISTS_FILE))).toBe(true);
  }, 60_000);

  it('turns away a request with no session, and an editor everywhere', async () => {
    const none = await call('GET', '/capabilities', { auth: null });
    expect(none.status).toBe(401);
    expect(JSON.parse(none.text).error).toMatch(/^The repo content server/);
    for (const path of ['/capabilities', '/repo/status', '/repo/roster']) {
      const answer = await call('GET', path, { auth: EDITOR });
      expect(answer.status).toBe(403);
      expect(JSON.parse(answer.text)).toMatchObject({
        code: 'REPO_ADMIN_ONLY',
      });
    }
  });

  it('answers errors as plain JSON: a body that is not JSON, an upload, a path it does not have', async () => {
    const bad = await call('PUT', '/items', { body: '{not json' });
    expect(bad.status).toBe(400);
    expect(JSON.parse(bad.text)).toMatchObject({ code: 'BAD_REQUEST' });
    expect((await call('POST', '/asset')).status).toBe(404);
    const elsewhere = await handle.handle({
      method: 'GET',
      url: '/api/other',
      headers: { authorization: ADMIN },
      bodyText: '',
    });
    expect(elsewhere.status).toBe(404);
    expect((await call('GET', '/repo/nothing')).status).toBe(404);
  });

  it('saves a PUT into the files and answers with the item', async () => {
    const list = await call('GET', '/items?kind=artist&limit=1');
    const [row] = parsed<{ items: { id: string; slug: string }[] }>(
      list.text,
    ).items;
    const item = parsed<{ body: Record<string, unknown>; revision: number }>(
      (await call('GET', `/items/${row.id}`)).text,
    );
    // The artist's record row, if it has one: since the bulk import of 30
    // September 2026 most artists do, so the save changes that row's
    // `activeFrom` and keeps the rest of it.
    const recordRow = () =>
      (
        JSON.parse(readFileSync(join(root, ARTISTS_FILE), 'utf8')) as {
          slug: string;
        }[]
      ).find((record) => record.slug === row.slug);
    const before = recordRow() ?? { slug: row.slug };
    const saved = await call('PUT', '/items', {
      body: JSON.stringify({
        kind: 'artist',
        slug: row.slug,
        body: { ...item.body, activeFrom: 1971 },
        expectedRevision: item.revision,
      }),
    });
    expect(saved.status).toBe(200);
    expect(recordRow()).toEqual({ ...before, activeFrom: 1971 });
    const stale = await call('PUT', '/items', {
      body: JSON.stringify({
        kind: 'artist',
        slug: row.slug,
        body: { ...item.body, activeFrom: 1972 },
        expectedRevision: item.revision,
      }),
    });
    expect(stale.status).toBe(409);
    expect(JSON.parse(stale.text)).toMatchObject({ code: 'REVISION_CONFLICT' });
  }, 60_000);

  it('says what git has not committed, and that there is no git here', async () => {
    const answer = await call('GET', '/repo/status');
    expect(answer.status).toBe(200);
    expect(parsed(answer.text)).toMatchObject({
      root,
      git: false,
      files: [],
    });
  });

  it('lists the globe roster and moves an artist on and off it', async () => {
    const roster = parsed<{ slugs: string[] }>(
      (await call('GET', '/repo/roster')).text,
    ).slugs;
    expect(roster.length).toBeGreaterThan(100);
    const slug = roster[roster.length - 1];

    for (const [body, code] of [
      ['{}', 'BAD_REQUEST'],
      [JSON.stringify({ slug, on: 'yes' }), 'BAD_REQUEST'],
      [JSON.stringify({ slug: 'no-such-artist-here', on: true }), 'NOT_FOUND'],
    ] as const) {
      const refused = await call('POST', '/repo/roster', { body });
      expect(JSON.parse(refused.text)).toMatchObject({ code });
    }

    const off = await call('POST', '/repo/roster', {
      body: JSON.stringify({ slug, on: false }),
    });
    expect(off.status).toBe(200);
    expect(parsed(off.text)).toMatchObject({ slug, on: false, changed: true });
    expect(readFileSync(join(root, REGISTRY_FILE), 'utf8')).not.toContain(
      `slug: '${slug}'`,
    );
    const back = await call('POST', '/repo/roster', {
      body: JSON.stringify({ slug, on: true }),
    });
    expect(parsed(back.text)).toMatchObject({ on: true, changed: true });
  }, 60_000);
});
