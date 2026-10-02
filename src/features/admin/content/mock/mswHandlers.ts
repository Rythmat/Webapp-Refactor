import { http } from 'msw';
import type { ContentMockServer, MockViewer } from './contentMockServer';
import { serveContentRequest } from './mockHttp';

/**
 * The offline mock as msw handlers, for hook tests that should meet the
 * contract's semantics rather than a stub written for the test:
 *
 *   const server = createContentMockServer({ seed, mode: 'all' });
 *   startMockApi(...contentMockHandlers(server, { apiBase: API_BASE }));
 *
 * Every request under `${apiBase}/api/admin/content/` goes to the same pure
 * server the browser mock uses. The caller is read from the bearer token as
 * in the browser; pass `viewer` to act as a fixed user instead. Test-only:
 * nothing in the app imports this module.
 */
export function contentMockHandlers(
  server: ContentMockServer,
  { apiBase, viewer }: { apiBase: string; viewer?: MockViewer },
) {
  return [
    http.all(`${apiBase}/api/admin/content/*`, async ({ request }) => {
      const multipart = (request.headers.get('Content-Type') ?? '').startsWith(
        'multipart/form-data',
      );
      const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
      const body = !hasBody
        ? undefined
        : multipart
          ? await request.formData()
          : await request.text();
      return serveContentRequest(
        server,
        request.url,
        { method: request.method, headers: request.headers, body },
        viewer,
      ).response;
    }),
  ];
}
