import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect, Plugin, ResolvedConfig, ViteDevServer } from 'vite';

/**
 * The dev repo content server (design A, "repo mode"): with
 * `VITE_CONTENT_REPO=1`, the console on this dev server saves straight into
 * the repo's data files on this machine. Git is the review; commit and
 * deploy is the publish.
 *
 *   VITE_CONTENT_REPO=1 npx vite
 *   VITE_CONTENT_REPO=1 REPO_CONTENT_ROOT=/path/to/a/copy npx vite --port 5243
 *
 * What it does:
 *  - Serves the content API contract at `/__repo-content/api/admin/content/*`,
 *    same origin, from `src/scripts/repoContent/repoHttp.ts`, which it
 *    loads once through `ssrLoadModule` and holds (the store keeps its
 *    state in that one instance). The console's `contentPath` points there
 *    when the same flag is set (`mockSwitch.ts`).
 *  - Keeps everything off the network but this machine's own pages: the
 *    request must come from loopback with no proxy in between, name this
 *    machine as its Host (never `server.allowedHosts`, which a tunnel's
 *    host is added to), come from this origin (`Sec-Fetch-Site`,
 *    `Origin`), and send any write as JSON. An `OPTIONS` preflight is never
 *    granted, so no other origin can send the bearer token or a JSON body
 *    at all.
 *  - Watches the data files: an edit made outside the console reloads the
 *    store and tells the page (`repo-content:changed`), which refetches.
 *  - Lets the store's own writes cause no HMR (`hotUpdate`): the console
 *    already has what it saved, and a reload would lose the page's state.
 *  - Answers every failure as a 500 JSON error. The dev server never goes
 *    down with it.
 *
 * Inert unless `VITE_CONTENT_REPO` is `1`, outside vitest (which also
 * starts Vite in serve mode) and with the offline mock off
 * (`VITE_CONTENT_MOCK`, which wins). `apply: 'serve'`: a build never runs
 * it. `REPO_CONTENT_ROOT` (a process variable) points the store at a
 * scratch copy, for tests and checks that must not touch the working tree.
 *
 * It imports only Vite's types and Node's own modules, never `src/`.
 */

/** Where the repo content server answers, on this dev server. */
export const REPO_CONTENT_PREFIX = '/__repo-content';
const API_PREFIX = '/api/admin/content';
/** The HTTP layer, loaded with `ssrLoadModule` from the Vite root. */
const MODULE = '/src/scripts/repoContent/repoHttp.ts';
/** The page's event after an edit made outside the console. */
export const REPO_CHANGED_EVENT = 'repo-content:changed';
/** The largest body read: a bulk decision post runs to a few megabytes. */
export const BODY_LIMIT = 32 * 1024 * 1024;
/** How long the watcher waits for a burst of edits to settle. */
const SETTLE_MS = 300;

/**
 * The handle `repoHttp.ts` gives (`createRepoContentHandle`). Declared here
 * as well, since this file may not import `src/`; a test holds the two
 * shapes together.
 */
export interface RepoContentHandle {
  readonly root: string;
  ready(): Promise<void>;
  handle(request: {
    method: string;
    url: string;
    headers: Readonly<Record<string, string | readonly string[] | undefined>>;
    bodyText: string;
  }): Promise<{
    status: number;
    headers: Record<string, string>;
    text: string;
  }>;
  watchPaths(): string[];
  covers(absolute: string): boolean;
  isOwnWrite(absolute: string, text: string | null): boolean;
  externalChange(files: readonly string[]): Promise<string[]>;
}

type Env = Readonly<Record<string, string | undefined>>;

/**
 * Whether repo mode runs on this dev server: `VITE_CONTENT_REPO=1`, not
 * under vitest, and not with the offline mock, which takes precedence.
 */
export function repoContentActive(viteEnv: Env, processEnv: Env): boolean {
  return (
    viteEnv.VITE_CONTENT_REPO === '1' &&
    !processEnv.VITEST &&
    viteEnv.VITE_CONTENT_MOCK !== '1'
  );
}

/** What the transport checks read off a request. */
export interface GuardedRequest {
  method: string;
  remoteAddress: string | undefined;
  headers: Readonly<Record<string, string | string[] | undefined>>;
}

/** A refusal, answered as JSON with no CORS headers. */
export interface Refusal {
  status: number;
  code: string;
  error: string;
}

const header = (
  headers: GuardedRequest['headers'],
  name: string,
): string | undefined => {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
};

/** Loopback: the request came from a process on this machine. */
export const isLoopback = (address: string | undefined): boolean =>
  !!address &&
  (address === '::1' ||
    address.startsWith('127.') ||
    address.startsWith('::ffff:127.'));

/** The host name of a `Host` header, without its port or brackets. */
export const hostName = (host: string): string => {
  const trimmed = host.trim().toLowerCase();
  if (trimmed.startsWith('[')) {
    const end = trimmed.indexOf(']');
    return end > 0 ? trimmed.slice(1, end) : trimmed;
  }
  const colon = trimmed.lastIndexOf(':');
  return colon > 0 ? trimmed.slice(0, colon) : trimmed;
};

/**
 * Whether the `Host` header names this machine: `localhost`, a
 * `*.localhost` name, a 127.x.x.x address or `[::1]`. Nothing else, and
 * never what `server.allowedHosts` adds: Vite's own "This host is not
 * allowed" message asks for a tunnel's host to be put there, and a tunnel
 * connects from 127.0.0.1, so a name it allows would let the internet in.
 * Rejecting every other name also stops DNS rebinding: a page on an
 * attacker's domain that resolves to 127.0.0.1 still sends its own name.
 */
export function hostAllowed(host: string | undefined): boolean {
  if (!host) return false;
  const name = hostName(host);
  return (
    name === 'localhost' ||
    name.endsWith('.localhost') ||
    name === '::1' ||
    /^127\.\d+\.\d+\.\d+$/.test(name)
  );
}

/**
 * The headers a proxy or tunnel adds on the way in (ngrok, cloudflared, a
 * reverse proxy). A request that carries one came from further away than
 * the loopback socket it arrived on, so it is refused whatever its Host:
 * this covers a tunnel that rewrites Host to `localhost` as well.
 */
export const PROXY_HEADERS: readonly string[] = [
  'forwarded',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-real-ip',
  'cf-connecting-ip',
  'true-client-ip',
  'cdn-loop',
  'via',
];

const WRITES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const METHODS = new Set(['GET', 'HEAD', ...WRITES]);

/**
 * The transport checks (design A.3), in order; null when the request may
 * be served. These are the security boundary: the bearer token only names
 * who wrote.
 *
 *  - `OPTIONS` is never granted (405, no CORS headers): a page on another
 *    origin cannot send `Authorization` or a JSON body without a preflight.
 *  - The caller must be on loopback, with no proxy header
 *    (`PROXY_HEADERS`): a tunnel's agent connects from loopback too.
 *  - The `Host` must name this machine (`hostAllowed`), whatever
 *    `server.allowedHosts` says.
 *  - `Sec-Fetch-Site`, when the browser sends it, must be `same-origin`,
 *    and `Origin`, when present, must be this Host.
 *  - A write must be `application/json`: no form or text post qualifies.
 */
export function refusalFor(request: GuardedRequest): Refusal | null {
  const method = request.method.toUpperCase();
  if (method === 'OPTIONS' || !METHODS.has(method)) {
    return {
      status: 405,
      code: 'METHOD_NOT_ALLOWED',
      error: `${method} is not served here.`,
    };
  }
  if (!isLoopback(request.remoteAddress)) {
    return {
      status: 403,
      code: 'REPO_LOOPBACK_ONLY',
      error: 'The repo content server answers this machine only.',
    };
  }
  if (PROXY_HEADERS.some((name) => request.headers[name] !== undefined)) {
    return {
      status: 403,
      code: 'REPO_PROXIED',
      error:
        'The repo content server answers this machine only, never through a proxy or tunnel.',
    };
  }
  const host = header(request.headers, 'host');
  if (!hostAllowed(host)) {
    return {
      status: 403,
      code: 'REPO_BAD_HOST',
      error: 'The repo content server answers this dev server’s own host only.',
    };
  }
  const site = header(request.headers, 'sec-fetch-site');
  if (site !== undefined && site !== 'same-origin') {
    return {
      status: 403,
      code: 'REPO_CROSS_SITE',
      error:
        'The repo content server answers this dev server’s own pages only.',
    };
  }
  const origin = header(request.headers, 'origin');
  if (origin !== undefined) {
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host.toLowerCase();
    } catch {
      originHost = null;
    }
    if (originHost !== host!.trim().toLowerCase()) {
      return {
        status: 403,
        code: 'REPO_CROSS_SITE',
        error:
          'The repo content server answers this dev server’s own pages only.',
      };
    }
  }
  if (WRITES.has(method)) {
    const type = (header(request.headers, 'content-type') ?? '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    if (type !== 'application/json') {
      return {
        status: 415,
        code: 'REPO_JSON_ONLY',
        error: 'Send writes as application/json.',
      };
    }
  }
  return null;
}

const send = (
  res: ServerResponse,
  status: number,
  headers: Record<string, string>,
  text: string,
) => {
  if (res.headersSent) {
    res.end();
    return;
  }
  res.statusCode = status;
  for (const [name, value] of Object.entries(headers)) {
    res.setHeader(name, value);
  }
  res.end(text);
};

const sendJson = (res: ServerResponse, status: number, body: unknown) =>
  send(
    res,
    status,
    {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
    JSON.stringify(body),
  );

class BodyTooLarge extends Error {}

/**
 * The request body as text, refusing more than `limit` bytes. What comes
 * past the limit is read and dropped, so the refusal still reaches the
 * caller, and the connection closes after it.
 */
const readBody = (req: IncomingMessage, limit: number): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const collect = (chunk: Buffer) => {
      size += chunk.length;
      if (size <= limit) {
        chunks.push(chunk);
        return;
      }
      chunks.length = 0;
      req.off('data', collect);
      req.resume();
      reject(new BodyTooLarge());
    };
    req.on('data', collect);
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

export interface RepoMiddlewareOptions {
  /** The loaded handle; the first request waits for it. */
  handle: () => Promise<RepoContentHandle>;
  log?: (message: string) => void;
  /** For tests; `BODY_LIMIT` by default. */
  bodyLimit?: number;
}

/**
 * The middleware for `/__repo-content` (mounted with that prefix, which
 * connect strips from `req.url`). It checks the transport, reads the body,
 * hands the request to the store and writes the answer back. Every failure
 * is a JSON error; nothing it does can take the dev server down.
 */
export function createRepoMiddleware(
  options: RepoMiddlewareOptions,
): Connect.NextHandleFunction {
  return (req, res) => {
    void (async () => {
      try {
        const refused = refusalFor({
          method: req.method ?? 'GET',
          remoteAddress: req.socket.remoteAddress,
          headers: req.headers,
        });
        if (refused) {
          sendJson(res, refused.status, {
            error: refused.error,
            code: refused.code,
          });
          return;
        }
        const url = req.url ?? '/';
        if (!url.startsWith(API_PREFIX)) {
          sendJson(res, 404, {
            error: 'Not a content API path.',
            code: 'NOT_FOUND',
          });
          return;
        }
        let bodyText: string;
        try {
          bodyText = await readBody(req, options.bodyLimit ?? BODY_LIMIT);
        } catch (error) {
          if (error instanceof BodyTooLarge) {
            res.setHeader('Connection', 'close');
            sendJson(res, 413, {
              error: 'The body is too large.',
              code: 'PAYLOAD_TOO_LARGE',
            });
            return;
          }
          throw error;
        }
        const handle = await options.handle();
        const answer = await handle.handle({
          method: req.method ?? 'GET',
          url,
          headers: req.headers,
          bodyText,
        });
        send(res, answer.status, answer.headers, answer.text);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        options.log?.(`[repo-content] ${req.method} ${req.url}: ${message}`);
        sendJson(res, 500, { error: message, code: 'REPO_SERVER_ERROR' });
      }
    })();
  };
}

/** Loads `repoHttp.ts` once and keeps the handle; a failed load is tried again. */
function handleLoader(
  server: ViteDevServer,
  log: (message: string) => void,
): {
  get: () => Promise<RepoContentHandle>;
  current: () => RepoContentHandle | null;
} {
  let loading: Promise<RepoContentHandle> | null = null;
  let loaded: RepoContentHandle | null = null;
  const get = () => {
    loading ??= (async () => {
      const module = (await server.ssrLoadModule(MODULE)) as {
        createRepoContentHandle: (options: {
          root?: string;
          log?: (message: string) => void;
        }) => RepoContentHandle;
      };
      const handle = module.createRepoContentHandle({
        root: process.env.REPO_CONTENT_ROOT,
        log,
      });
      await handle.ready();
      loaded = handle;
      return handle;
    })().catch((error: unknown) => {
      loading = null;
      throw error;
    });
    return loading;
  };
  return { get, current: () => loaded };
}

export function repoContentPlugin(): Plugin {
  let active = false;
  let loader: ReturnType<typeof handleLoader> | null = null;

  return {
    name: 'music-atlas:repo-content',
    apply: 'serve',

    configResolved(config: ResolvedConfig) {
      active = repoContentActive(config.env as Env, process.env);
    },

    configureServer(server) {
      if (!active) return;
      const logger = server.config.logger;
      const log = (message: string) =>
        logger.warn(message, { timestamp: true });
      const current = handleLoader(server, log);
      loader = current;

      const middleware = createRepoMiddleware({
        handle: current.get,
        log,
      });
      // First in the stack, ahead of Vite's own CORS answer to preflights:
      // nothing under this prefix is ever granted to another origin.
      server.middlewares.stack.unshift({
        route: REPO_CONTENT_PREFIX,
        handle: middleware,
      });

      // External edits: once they settle, the store reloads if a data file
      // no longer holds what it read, and the page refetches.
      const pending = new Set<string>();
      let timer: ReturnType<typeof setTimeout> | null = null;
      const settle = async () => {
        timer = null;
        const files = [...pending];
        pending.clear();
        const handle = current.current();
        if (!handle || !files.length) return;
        try {
          const kinds = await handle.externalChange(files);
          if (kinds.length) {
            logger.info(
              `[repo-content] reloaded after an edit outside the console (${kinds.join(', ')})`,
              { timestamp: true },
            );
            server.ws.send({
              type: 'custom',
              event: REPO_CHANGED_EVENT,
              data: { kinds },
            });
          }
        } catch (error) {
          log(
            `[repo-content] the data files could not be read again: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      };
      const noticed = (file: string) => {
        const handle = current.current();
        if (!handle?.covers(file)) return;
        pending.add(file);
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => void settle(), SETTLE_MS);
      };
      server.watcher.on('add', noticed);
      server.watcher.on('change', noticed);
      server.watcher.on('unlink', noticed);

      // Load the store in the background once the server listens, so the
      // first request does not wait for it, then watch its files (a
      // scratch root outside the Vite root is not watched otherwise).
      server.httpServer?.once('listening', () => {
        current
          .get()
          .then((handle) => {
            server.watcher.add(handle.watchPaths());
            logger.info(
              `[repo-content] repo mode: console saves go into ${handle.root}`,
              { timestamp: true },
            );
          })
          .catch((error: unknown) =>
            log(
              `[repo-content] the store did not load: ${error instanceof Error ? error.message : String(error)}`,
            ),
          );
      });
    },

    // The store's own writes: the console has what it saved already, so no
    // HMR and no reload, in any environment. Everything else as usual.
    async hotUpdate({ file, type, read }) {
      const handle = active ? loader?.current() : null;
      if (!handle || !handle.covers(file)) return;
      const text = type === 'delete' ? null : await read();
      if (handle.isOwnWrite(file, text)) return [];
    },
  };
}
