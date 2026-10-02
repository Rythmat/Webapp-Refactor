import { EventEmitter } from 'node:events';
import {
  createServer,
  request as httpRequest,
  type IncomingHttpHeaders,
  type Server,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  createRepoMiddleware,
  hostAllowed,
  isLoopback,
  PROXY_HEADERS,
  REPO_CHANGED_EVENT,
  REPO_CONTENT_PREFIX,
  type RepoContentHandle as HeldHandle,
  repoContentActive,
  repoContentPlugin,
  refusalFor,
} from '../../../../scripts/vite/repoContentPlugin';
import type {
  createRepoContentHandle,
  RepoContentHandle as ServedHandle,
} from '../repoHttp';

/**
 * The dev server's plugin for repo mode (scripts/vite/repoContentPlugin.ts):
 * when it runs, the transport checks that keep everyone but this machine's
 * own pages out, the middleware's answers, and its wiring into Vite (the
 * watcher, the page event, the HMR hook that lets the store's own writes
 * pass).
 */

// The plugin declares the handle's shape itself (it may not import src/):
// what `repoHttp.ts` gives must be what the plugin holds. `tsc -b` checks
// these two lines; they do nothing at run time.
const fits = (handle: ServedHandle): HeldHandle => handle;
const made = (handle: ReturnType<typeof createRepoContentHandle>): HeldHandle =>
  fits(handle);
void made;

describe('when repo mode runs', () => {
  it('runs only with VITE_CONTENT_REPO=1, outside vitest, with the mock off', () => {
    expect(repoContentActive({ VITE_CONTENT_REPO: '1' }, {})).toBe(true);
    expect(repoContentActive({}, {})).toBe(false);
    expect(repoContentActive({ VITE_CONTENT_REPO: 'true' }, {})).toBe(false);
    expect(
      repoContentActive({ VITE_CONTENT_REPO: '1' }, { VITEST: 'true' }),
    ).toBe(false);
    expect(
      repoContentActive({ VITE_CONTENT_REPO: '1', VITE_CONTENT_MOCK: '1' }, {}),
    ).toBe(false);
  });
});

describe('the transport checks', () => {
  const ok = {
    method: 'GET',
    remoteAddress: '127.0.0.1',
    headers: { host: 'localhost:5243', 'sec-fetch-site': 'same-origin' },
  };

  it('let this machine’s own page through', () => {
    expect(refusalFor(ok)).toBeNull();
    expect(
      refusalFor({
        ...ok,
        method: 'PUT',
        remoteAddress: '::1',
        headers: {
          ...ok.headers,
          origin: 'http://localhost:5243',
          'content-type': 'application/json; charset=utf-8',
        },
      }),
    ).toBeNull();
    // A request with no browser headers at all (curl on this machine).
    expect(
      refusalFor({ ...ok, headers: { host: '127.0.0.1:5243' } }),
    ).toBeNull();
  });

  it('never grants a preflight', () => {
    expect(refusalFor({ ...ok, method: 'OPTIONS' })).toMatchObject({
      status: 405,
    });
    expect(refusalFor({ ...ok, method: 'TRACE' })).toMatchObject({
      status: 405,
    });
  });

  it('answers loopback only', () => {
    expect(isLoopback('127.0.0.1')).toBe(true);
    expect(isLoopback('::ffff:127.0.0.1')).toBe(true);
    expect(isLoopback('::1')).toBe(true);
    for (const address of [
      '192.168.1.20',
      '10.0.0.2',
      '::ffff:10.0.0.2',
      undefined,
    ]) {
      expect(refusalFor({ ...ok, remoteAddress: address })).toMatchObject({
        status: 403,
        code: 'REPO_LOOPBACK_ONLY',
      });
    }
  });

  it('answers this machine’s host names only, whatever the dev server allows', () => {
    expect(hostAllowed('localhost:5243')).toBe(true);
    expect(hostAllowed('app.localhost:5243')).toBe(true);
    expect(hostAllowed('[::1]:5243')).toBe(true);
    expect(hostAllowed('127.0.0.1')).toBe(true);
    expect(hostAllowed('attacker.example:5243')).toBe(false);
    expect(hostAllowed(undefined)).toBe(false);
    // What `server.allowedHosts` might hold (a tunnel's host, a LAN name)
    // never counts: the guard does not read it.
    expect(hostAllowed('abc123.ngrok-free.app')).toBe(false);
    expect(hostAllowed('dev.example.test')).toBe(false);
    expect(hostAllowed('localhost.attacker.example')).toBe(false);
    expect(
      refusalFor({
        ...ok,
        headers: { ...ok.headers, host: 'rebound.example:5243' },
      }),
    ).toMatchObject({ status: 403, code: 'REPO_BAD_HOST' });
  });

  /** A forged admin token with no signature, as anyone can make one. */
  const unsigned = `Bearer ${btoa(JSON.stringify({ alg: 'none' }))}.${btoa(
    JSON.stringify({ role: 'admin', user_id: 'internet-stranger' }),
  )}.`;

  it('refuses a request through a tunnel, which arrives on loopback', () => {
    // ngrok's agent connects from 127.0.0.1 and passes the page's own Host
    // and Origin through; only the headers it adds give it away.
    const tunnel = {
      method: 'POST',
      remoteAddress: '127.0.0.1',
      headers: {
        host: 'abc123.ngrok-free.app',
        origin: 'https://abc123.ngrok-free.app',
        'sec-fetch-site': 'same-origin',
        'content-type': 'application/json',
        authorization: unsigned,
        'x-forwarded-for': '203.0.113.9',
      },
    };
    expect(refusalFor(tunnel)).toMatchObject({
      status: 403,
      code: 'REPO_PROXIED',
    });
    // A tunnel that rewrites Host to localhost is refused for the same reason.
    for (const name of PROXY_HEADERS) {
      expect(
        refusalFor({
          ...ok,
          headers: { ...ok.headers, [name]: 'anything' },
        }),
      ).toMatchObject({ status: 403, code: 'REPO_PROXIED' });
    }
    // And one that adds no header at all still names a host that is not
    // this machine.
    const { 'x-forwarded-for': _forwarded, ...bare } = tunnel.headers;
    void _forwarded;
    expect(refusalFor({ ...tunnel, headers: bare })).toMatchObject({
      status: 403,
      code: 'REPO_BAD_HOST',
    });
  });

  it('refuses a rebound page, even on a dev server that allows every host', () => {
    // `allowedHosts: true` lets Vite serve any Host; the guard still names
    // this machine only, so a rebound attacker page is turned away.
    expect(
      refusalFor({
        method: 'POST',
        remoteAddress: '127.0.0.1',
        headers: {
          host: 'rebind.attacker.example:5244',
          origin: 'http://rebind.attacker.example:5244',
          'sec-fetch-site': 'same-origin',
          'content-type': 'application/json',
          authorization: unsigned,
        },
      }),
    ).toMatchObject({ status: 403, code: 'REPO_BAD_HOST' });
  });

  it('refuses another site’s page, even one on this machine', () => {
    for (const site of ['same-site', 'cross-site', 'none']) {
      expect(
        refusalFor({
          ...ok,
          headers: { ...ok.headers, 'sec-fetch-site': site },
        }),
      ).toMatchObject({ status: 403, code: 'REPO_CROSS_SITE' });
    }
    expect(
      refusalFor({
        ...ok,
        headers: {
          host: 'localhost:5243',
          origin: 'http://localhost:3000',
        },
      }),
    ).toMatchObject({ status: 403, code: 'REPO_CROSS_SITE' });
  });

  it('takes writes as JSON only', () => {
    for (const type of [
      undefined,
      'text/plain',
      'application/x-www-form-urlencoded',
      'multipart/form-data; boundary=x',
    ]) {
      expect(
        refusalFor({
          ...ok,
          method: 'POST',
          headers: {
            ...ok.headers,
            ...(type ? { 'content-type': type } : {}),
          },
        }),
      ).toMatchObject({ status: 415, code: 'REPO_JSON_ONLY' });
    }
  });
});

/* ── The middleware, over a real socket ── */

interface Answer {
  status: number;
  headers: IncomingHttpHeaders;
  text: string;
}

const send = (
  port: number,
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: string,
): Promise<Answer> =>
  new Promise((resolve, reject) => {
    const req = httpRequest(
      { host: '127.0.0.1', port, method, path, headers },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => (text += chunk));
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, headers: res.headers, text }),
        );
      },
    );
    req.on('error', reject);
    if (body !== undefined) req.write(body);
    req.end();
  });

const fakeHandle = (
  overrides: Partial<HeldHandle> = {},
): HeldHandle & { handle: ReturnType<typeof vi.fn> } =>
  ({
    root: '/repo',
    ready: async () => undefined,
    handle: vi.fn(async (request: { url: string; bodyText: string }) => ({
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Seen': request.url },
      text: JSON.stringify({ body: request.bodyText }),
    })),
    watchPaths: () => ['/repo/data'],
    covers: (file: string) => file.startsWith('/repo/'),
    isOwnWrite: (_file: string, text: string | null) => text === 'mine',
    externalChange: vi.fn(async () => ['song']),
    ...overrides,
  }) as HeldHandle & { handle: ReturnType<typeof vi.fn> };

describe('the middleware', () => {
  let server: Server;
  let port: number;
  let current = fakeHandle();

  beforeAll(async () => {
    const middleware = createRepoMiddleware({
      handle: async () => current,
      bodyLimit: 64,
    });
    server = createServer((req, res) => middleware(req, res, () => undefined));
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    port = (server.address() as AddressInfo).port;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  afterEach(() => {
    current = fakeHandle();
  });

  const host = () => ({ host: `localhost:${port}` });

  it('hands a request to the store and sends its answer back', async () => {
    const answer = await send(
      port,
      'PUT',
      '/api/admin/content/items?kind=song',
      {
        ...host(),
        'content-type': 'application/json',
        'sec-fetch-site': 'same-origin',
        authorization: 'Bearer t',
      },
      '{"a":1}',
    );
    expect(answer.status).toBe(200);
    expect(answer.headers['x-seen']).toBe('/api/admin/content/items?kind=song');
    expect(JSON.parse(answer.text)).toEqual({ body: '{"a":1}' });
    expect(current.handle).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PUT',
        url: '/api/admin/content/items?kind=song',
        headers: expect.objectContaining({ authorization: 'Bearer t' }),
      }),
    );
  });

  it('grants no preflight: 405, and no CORS header', async () => {
    const answer = await send(port, 'OPTIONS', '/api/admin/content/items', {
      ...host(),
      origin: 'http://localhost:3000',
      'access-control-request-method': 'PUT',
      'access-control-request-headers': 'authorization,content-type',
    });
    expect(answer.status).toBe(405);
    expect(answer.headers['access-control-allow-origin']).toBeUndefined();
    expect(current.handle).not.toHaveBeenCalled();
  });

  it('refuses a form post and another site before reading anything', async () => {
    const form = await send(
      port,
      'POST',
      '/api/admin/content/items',
      { ...host(), 'content-type': 'text/plain' },
      'x',
    );
    expect(form.status).toBe(415);
    const site = await send(port, 'GET', '/api/admin/content/items', {
      ...host(),
      'sec-fetch-site': 'cross-site',
    });
    expect(site.status).toBe(403);
    expect(current.handle).not.toHaveBeenCalled();
  });

  it('refuses a tunnel’s request on the socket, before the store sees it', async () => {
    const tunnel = await send(
      port,
      'POST',
      '/api/admin/content/repo/roster',
      {
        host: 'abc123.ngrok-free.app',
        origin: 'https://abc123.ngrok-free.app',
        'sec-fetch-site': 'same-origin',
        'content-type': 'application/json',
        'x-forwarded-for': '203.0.113.9',
      },
      '{}',
    );
    expect(tunnel.status).toBe(403);
    expect(JSON.parse(tunnel.text)).toMatchObject({ code: 'REPO_PROXIED' });
    expect(current.handle).not.toHaveBeenCalled();
  });

  it('answers 404 off the API, 413 over the size limit, 500 when the store throws', async () => {
    expect((await send(port, 'GET', '/elsewhere', host())).status).toBe(404);
    const big = await send(
      port,
      'PUT',
      '/api/admin/content/items',
      { ...host(), 'content-type': 'application/json' },
      JSON.stringify({ text: 'x'.repeat(200) }),
    );
    expect(big.status).toBe(413);
    current = fakeHandle({
      handle: vi.fn(async () => {
        throw new Error('disk on fire');
      }),
    });
    const failed = await send(port, 'GET', '/api/admin/content/items', host());
    expect(failed.status).toBe(500);
    expect(JSON.parse(failed.text)).toEqual({
      error: 'disk on fire',
      code: 'REPO_SERVER_ERROR',
    });
  });
});

/* ── The plugin in a dev server ── */

describe('the plugin', () => {
  const devServer = (handle: HeldHandle) => {
    const watcher = Object.assign(new EventEmitter(), { add: vi.fn() });
    const httpServer = new EventEmitter();
    const sent: unknown[] = [];
    const server = {
      config: {
        logger: { info: vi.fn(), warn: vi.fn() },
        // Every host allowed, as a tunnel setup or `--host` might leave it:
        // the guard does not read this.
        server: { allowedHosts: true },
      },
      middlewares: { stack: [] as { route: string; handle: unknown }[] },
      watcher,
      httpServer,
      ws: { send: (payload: unknown) => sent.push(payload) },
      ssrLoadModule: vi.fn(async () => ({
        createRepoContentHandle: () => handle,
      })),
    };
    return { server, watcher, httpServer, sent };
  };

  type Hook = (...args: unknown[]) => unknown;
  const hook = (plugin: ReturnType<typeof repoContentPlugin>, name: string) =>
    plugin[name as keyof typeof plugin] as unknown as Hook;

  it('only ever serves a dev server, and does nothing without the flag', () => {
    const plugin = repoContentPlugin();
    expect(plugin.apply).toBe('serve');
    hook(plugin, 'configResolved')({ env: {} });
    const { server } = devServer(fakeHandle());
    hook(plugin, 'configureServer')(server);
    expect(server.middlewares.stack).toEqual([]);
    expect(server.ssrLoadModule).not.toHaveBeenCalled();
  });

  it('turns a rebound page away on a dev server that allows every host', async () => {
    vi.stubEnv('VITEST', '');
    let socket: Server | null = null;
    try {
      const handle = fakeHandle();
      const plugin = repoContentPlugin();
      hook(plugin, 'configResolved')({ env: { VITE_CONTENT_REPO: '1' } });
      const { server } = devServer(handle);
      hook(plugin, 'configureServer')(server);
      const mounted = server.middlewares.stack[0].handle as Parameters<
        typeof createServer
      >[1] &
        object;
      socket = createServer((req, res) => mounted(req, res));
      await new Promise<void>((resolve) =>
        socket!.listen(0, '127.0.0.1', resolve),
      );
      const { port } = socket.address() as AddressInfo;
      const answer = await send(
        port,
        'POST',
        '/api/admin/content/repo/roster',
        {
          host: `rebind.attacker.example:${port}`,
          origin: `http://rebind.attacker.example:${port}`,
          'sec-fetch-site': 'same-origin',
          'content-type': 'application/json',
        },
        '{}',
      );
      expect(answer.status).toBe(403);
      expect(JSON.parse(answer.text)).toMatchObject({ code: 'REPO_BAD_HOST' });
      expect(handle.handle).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
      if (socket)
        await new Promise<void>((done) => socket!.close(() => done()));
    }
  });

  it('mounts first, loads the store once it listens, watches its files, and passes its own writes by', async () => {
    vi.stubEnv('VITEST', '');
    try {
      const handle = fakeHandle();
      const plugin = repoContentPlugin();
      hook(plugin, 'configResolved')({ env: { VITE_CONTENT_REPO: '1' } });
      const { server, watcher, httpServer, sent } = devServer(handle);
      server.middlewares.stack.push({ route: '', handle: 'vite-cors' });
      hook(plugin, 'configureServer')(server);

      // Ahead of Vite's own middleware, CORS included.
      expect(server.middlewares.stack[0].route).toBe(REPO_CONTENT_PREFIX);

      httpServer.emit('listening');
      await vi.waitFor(() =>
        expect(watcher.add).toHaveBeenCalledWith(['/repo/data']),
      );
      expect(server.ssrLoadModule).toHaveBeenCalledTimes(1);

      const hot = hook(plugin, 'hotUpdate');
      const update = (file: string, text: string, type = 'update') =>
        hot({ file, type, read: async () => text });
      expect(await update('/repo/data/a.ts', 'mine')).toEqual([]);
      expect(await update('/repo/data/a.ts', 'someone else’s')).toBeUndefined();
      expect(await update('/elsewhere/a.ts', 'mine')).toBeUndefined();

      // An edit made outside: once it settles, the store is asked, and the
      // page told.
      watcher.emit('change', '/repo/data/a.ts');
      watcher.emit('change', '/elsewhere/b.ts');
      await vi.waitFor(
        () =>
          expect(sent).toEqual([
            {
              type: 'custom',
              event: REPO_CHANGED_EVENT,
              data: { kinds: ['song'] },
            },
          ]),
        { timeout: 2000 },
      );
      expect(handle.externalChange).toHaveBeenCalledWith(['/repo/data/a.ts']);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
