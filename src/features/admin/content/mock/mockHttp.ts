import { jwtDecode } from 'jwt-decode';
import SuperJSON from 'superjson';
import { DEV_AUTH_BYPASS, DEV_BYPASS_AUTH_DATA } from '@/auth/devBypass';
import type { ContentMockServer, MockViewer } from './contentMockServer';

/**
 * The mock's HTTP face, shared by the browser adapter (handleMockRequest.ts)
 * and the msw handlers tests use (mswHandlers.ts): a request in fetch's terms
 * goes to the pure server, and a Response shaped like the real API's comes
 * back (SuperJSON 2xx, plain JSON errors).
 */

const API_PREFIX = '/api/admin/content';

export const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const superjsonResponse = (body: unknown) =>
  new Response(SuperJSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

type Refusal = { status: number; error: string; code: string };

/**
 * Who is asking, read from the bearer token as the real API reads it, so the
 * mock's role always matches the one the console's UI was drawn for. The dev
 * bypass's token names its own role; any other token is the app's JWT, whose
 * `role` and `user_id` claims say the rest.
 */
export function viewerFromHeaders(
  headers: HeadersInit | undefined,
): MockViewer | Refusal {
  const auth = new Headers(headers).get('Authorization') ?? '';
  const token = /^Bearer\s+(.+)$/i.exec(auth)?.[1]?.trim() ?? '';
  const bypass = DEV_AUTH_BYPASS ? DEV_BYPASS_AUTH_DATA : null;

  let role: string | null | undefined;
  let userId: string | null | undefined;
  let name: string | null | undefined;
  if (bypass && token === bypass.token) {
    role = bypass.role;
    userId = bypass.userId;
    name = bypass.appUser?.fullName;
  } else {
    try {
      const claims = jwtDecode<{ role?: string; user_id?: string }>(token);
      role = claims.role;
      userId = claims.user_id;
    } catch {
      return {
        status: 401,
        code: 'UNAUTHORIZED',
        error:
          'The offline mock could not read a session from this request. Sign in, or start Vite with VITE_DEV_AUTH_BYPASS=1.',
      };
    }
  }
  if (role !== 'admin' && role !== 'editor')
    return {
      status: 403,
      code: 'FORBIDDEN',
      error: 'The content API is open to admins and editors.',
    };
  const id = userId ?? `mock-${role}`;
  return { role, userId: id, name: name ?? id };
}

const readBody = (body: BodyInit | null | undefined): unknown => {
  if (body === undefined || body === null) return undefined;
  if (typeof body === 'string') return body ? JSON.parse(body) : undefined;
  return body;
};

const uploadAsset = (server: ContentMockServer, body: unknown) => {
  // Today's API has no uploads, and neither has repo mode (features.asset
  // is off there): an image belongs in the repo, not in a tab's memory.
  if (server.mode === 'legacy' || server.mode === 'repo')
    return jsonResponse(404, { error: 'Not found.', code: 'NOT_FOUND' });
  const file = body instanceof FormData ? body.get('file') : null;
  if (!(file instanceof Blob))
    return jsonResponse(400, {
      error: 'Send the image as the multipart field `file`.',
      code: 'BAD_REQUEST',
    });
  // An object URL lives as long as the tab, which is as long as an offline
  // upload needs to; a data: URL would put the image into localStorage.
  const name = file instanceof File ? file.name : 'upload';
  const url =
    typeof URL.createObjectURL === 'function'
      ? URL.createObjectURL(file)
      : `blob:mock/${encodeURIComponent(name)}`;
  return jsonResponse(200, { url });
};

export interface ServedRequest {
  response: Response;
  /** The kind whose live release moved (activate or rollback), if any. */
  published: string | null;
}

/**
 * Answer one /api/admin/content request. `viewer` overrides the session
 * token, for tests that act as a fixed user.
 */
export function serveContentRequest(
  server: ContentMockServer,
  url: string,
  init: RequestInit | undefined,
  viewer?: MockViewer,
): ServedRequest {
  const answer = (response: Response): ServedRequest => ({
    response,
    published: null,
  });
  const parsed = new URL(url, 'http://mock.local');
  const at = parsed.pathname.indexOf(API_PREFIX);
  if (at === -1)
    return answer(
      jsonResponse(404, {
        error: 'Not a content API path.',
        code: 'NOT_FOUND',
      }),
    );
  const path = parsed.pathname.slice(at + API_PREFIX.length) || '/';
  const method = (init?.method ?? 'GET').toUpperCase();

  const who = viewer ?? viewerFromHeaders(init?.headers);
  if ('status' in who)
    return answer(
      jsonResponse(who.status, { error: who.error, code: who.code }),
    );

  let body: unknown;
  try {
    body = readBody(init?.body);
  } catch {
    return answer(
      jsonResponse(400, {
        error: 'The body is not JSON.',
        code: 'BAD_REQUEST',
      }),
    );
  }

  if (path === '/asset' && method === 'POST')
    return answer(uploadAsset(server, body));

  const result = server.handle({
    method,
    path,
    query: Object.fromEntries(parsed.searchParams),
    body,
    viewer: who,
  });
  if (result.status >= 400)
    return answer(jsonResponse(result.status, result.body));

  const moved =
    method === 'POST' &&
    (/^\/releases\/[^/]+\/activate$/.test(path) || path === '/rollback');
  return {
    response: superjsonResponse(result.body),
    published: moved ? ((result.body as { kind?: string }).kind ?? null) : null,
  };
}
