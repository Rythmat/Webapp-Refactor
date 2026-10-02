import { isAbsolute, join, resolve } from 'node:path';
import SuperJSON from 'superjson';
import type {
  MockResponse,
  MockViewer,
} from '@/features/admin/content/mock/contentMockServer';
import { viewerFromHeaders } from '@/features/admin/content/mock/mockHttp';
import {
  LiveRepoStore,
  type LiveRepoOptions,
  repoContentRoot,
} from './repoStore';

/**
 * The repo content server's HTTP face (design A.2, A.3): what the dev
 * server's plugin (`scripts/vite/repoContentPlugin.ts`) hands each request
 * under `/__repo-content/api/admin/content/*`, and gets a status and a text
 * back. Loaded only through Vite's `ssrLoadModule`, once, when repo mode is
 * on; never by the app, and never by the bulk import, which drives the
 * store in-process.
 *
 * It answers the content API contract, as the content mock does in its
 * `repo` profile (`LiveRepoStore`, which writes each change into the repo's
 * files before the answer goes), plus three routes of its own:
 *
 *  - `GET /repo/status`: which data files git has not committed, for the
 *    console's "Commit and deploy" view (design B).
 *  - `GET /repo/roster`: the slugs on the globe roster (`artistRegistry.ts`).
 *  - `POST /repo/roster` `{ slug, on }`: an artist onto the roster or off it.
 *
 * The caller is read from the bearer token the way the mock reads it
 * (`viewerFromHeaders`: the dev bypass's token, or the app JWT's claims,
 * not verified). Only an admin is served (403 `REPO_ADMIN_ONLY`): the token
 * only names who wrote a decision. The plugin's transport checks (loopback,
 * same origin, the Host, JSON writes, no preflight) are what keep anyone
 * else out.
 *
 * Success goes out as SuperJSON, as the API's does; an error as plain JSON
 * `{ error, code }`. Nothing here throws: an unexpected failure is a 500.
 */

/** A request as the plugin read it off the wire. */
export interface RepoHttpRequest {
  method: string;
  /** The path and query under `/__repo-content`, e.g. `/api/admin/content/items?kind=song`. */
  url: string;
  headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  /** The body as text; empty when there was none. */
  bodyText: string;
}

/** What goes back on the wire. */
export interface RepoHttpResponse {
  status: number;
  headers: Record<string, string>;
  text: string;
}

/**
 * What the plugin holds: the live store behind an HTTP handler, and what
 * its watcher and HMR hook ask about the files. The plugin declares the
 * same shape itself (it may not import `src/`), and a test holds the two
 * together.
 */
export interface RepoContentHandle {
  /** The directory the store reads and writes. */
  readonly root: string;
  /** Loads the store now instead of on the first request; rejects if it cannot. */
  ready(): Promise<void>;
  handle(request: RepoHttpRequest): Promise<RepoHttpResponse>;
  /** Absolute folders and files a watcher should cover. Empty until loaded. */
  watchPaths(): string[];
  /** Whether an absolute path is one of the data files. False until loaded. */
  covers(absolute: string): boolean;
  /** Whether `text` (null: no file) at an absolute path is the store's own last write. */
  isOwnWrite(absolute: string, text: string | null): boolean;
  /**
   * Files the watcher saw change. Reloads when one no longer holds what the
   * store read, and returns the kinds that changed (none otherwise).
   */
  externalChange(files: readonly string[]): Promise<string[]>;
}

export const API_PREFIX = '/api/admin/content';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

const plainJson = (status: number, body: unknown): RepoHttpResponse => ({
  status,
  headers: { ...JSON_HEADERS },
  text: JSON.stringify(body),
});

const superJson = (body: unknown): RepoHttpResponse => ({
  status: 200,
  headers: { ...JSON_HEADERS },
  text: SuperJSON.stringify(body),
});

const answer = ({ status, body }: MockResponse): RepoHttpResponse =>
  status < 400 ? superJson(body) : plainJson(status, body);

const refuse = (status: number, code: string, error: string) =>
  plainJson(status, { error, code });

/** The one header value, however Node gave it. */
const headerOf = (
  headers: RepoHttpRequest['headers'],
  name: string,
): string | undefined => {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : (value as string | undefined);
};

export interface RepoContentHandleOptions
  extends Omit<LiveRepoOptions, 'root' | 'dryRun'> {
  /** `REPO_CONTENT_ROOT`, or the repo when it is unset. */
  root?: string;
}

/**
 * The handle the plugin holds. The store is loaded on the first request
 * (or `ready()`); a load that fails is tried again on the next one.
 */
export function createRepoContentHandle(
  options: RepoContentHandleOptions = {},
): RepoContentHandle {
  const root = resolve(
    options.root && !isAbsolute(options.root)
      ? join(process.cwd(), options.root)
      : (options.root ?? repoContentRoot()),
  );
  let loading: Promise<LiveRepoStore> | null = null;
  let live: LiveRepoStore | null = null;
  const open = (): Promise<LiveRepoStore> => {
    loading ??= LiveRepoStore.open({ ...options, root }).then(
      (store) => {
        live = store;
        return store;
      },
      (error: unknown) => {
        loading = null;
        throw error;
      },
    );
    return loading;
  };

  const repoRoute = async (
    store: LiveRepoStore,
    method: string,
    route: string,
    body: unknown,
  ): Promise<RepoHttpResponse> => {
    if (route === '/repo/status' && method === 'GET') {
      return superJson(await store.refreshGit());
    }
    if (route === '/repo/roster' && method === 'GET') {
      return superJson({ slugs: await store.roster() });
    }
    if (route === '/repo/roster' && method === 'POST') {
      const input = (body ?? {}) as { slug?: unknown; on?: unknown };
      if (typeof input.slug !== 'string' || !input.slug) {
        return refuse(400, 'BAD_REQUEST', '`slug` names the artist.');
      }
      if (typeof input.on !== 'boolean') {
        return refuse(
          400,
          'BAD_REQUEST',
          '`on` is true to put the artist on the globe roster, false to take it off.',
        );
      }
      try {
        const moved = await store.setRoster(input.slug, input.on);
        if (!moved) {
          return refuse(
            404,
            'NOT_FOUND',
            `No artist '${input.slug}' in the repo files: save it first.`,
          );
        }
        return superJson(moved);
      } catch (error) {
        const failure = error as {
          status?: number;
          code?: string;
          message?: string;
        };
        if (typeof failure.status === 'number' && failure.code) {
          return refuse(
            failure.status,
            failure.code,
            failure.message ?? 'The roster could not be written.',
          );
        }
        throw error;
      }
    }
    return refuse(404, 'NOT_FOUND', `No route for ${method} ${route}.`);
  };

  const handle = async (
    request: RepoHttpRequest,
  ): Promise<RepoHttpResponse> => {
    const parsed = new URL(request.url, 'http://repo-content.local');
    if (!parsed.pathname.startsWith(API_PREFIX)) {
      return refuse(404, 'NOT_FOUND', 'Not a content API path.');
    }
    const path = parsed.pathname.slice(API_PREFIX.length) || '/';
    const method = request.method.toUpperCase();

    const authorization = headerOf(request.headers, 'authorization');
    const who = viewerFromHeaders(
      authorization ? { Authorization: authorization } : {},
    );
    if ('status' in who) {
      // The mock's own words name the offline mock; this is the repo.
      return who.status === 401
        ? refuse(
            401,
            who.code,
            'The repo content server could not read a session from this request. Sign in, or start Vite with VITE_DEV_AUTH_BYPASS=1.',
          )
        : refuse(who.status, who.code, who.error);
    }
    const viewer: MockViewer = who;

    let body: unknown;
    try {
      body = request.bodyText ? JSON.parse(request.bodyText) : undefined;
    } catch {
      return refuse(400, 'BAD_REQUEST', 'The body is not JSON.');
    }

    // Repo mode keeps no uploads (`features.asset` is off): an image
    // belongs in the repo, and the editor falls back to a pasted URL.
    if (path === '/asset') return refuse(404, 'NOT_FOUND', 'Not found.');

    const store = await open();
    if (path.startsWith('/repo/')) {
      if (viewer.role !== 'admin') {
        return refuse(
          403,
          'REPO_ADMIN_ONLY',
          'Repo mode is admin-only: a save here goes straight into the repo files. Proposals need the content API.',
        );
      }
      return repoRoute(store, method, path, body);
    }
    return answer(
      await store.handle({
        method,
        path,
        query: Object.fromEntries(parsed.searchParams),
        body,
        viewer,
      }),
    );
  };

  return {
    root,
    ready: async () => {
      await open();
    },
    async handle(request) {
      try {
        return await handle(request);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        options.log?.(
          `[repo-content] ${request.method} ${request.url}: ${message}`,
        );
        return refuse(500, 'REPO_SERVER_ERROR', message);
      }
    },
    watchPaths: () => live?.watchPaths() ?? [],
    covers: (absolute) => live?.covers(absolute) ?? false,
    isOwnWrite: (absolute, text) => live?.isOwnWrite(absolute, text) ?? false,
    externalChange: async (files) => (live ? live.externalChange(files) : []),
  };
}
