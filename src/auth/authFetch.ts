import { getCurrentAppSessionId } from './app-session-store';
import { emitSessionError, parseSessionError } from './session-errors';

/**
 * `fetch` with the app's auth headers, and — critically — 401 handling.
 *
 * Only the axios client wired up the session-error interceptor. The hand-rolled
 * `fetch` modules (progress, experience, studio assets/projects, game options,
 * classroom sessions, announcements, credits, subscription) each duplicated the
 * header construction and none of them looked at 401 bodies. So when a session
 * was revoked server-side — which is routine, since signing in on another
 * device replaces the previous session — those callers kept firing against a
 * dead session indefinitely and the user was never signed out.
 *
 * The backend encodes session errors as JSON inside the 401 message, so the
 * body is parsed with the same `parseSessionError` the axios interceptor uses.
 */
export async function authFetch(
  url: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  const appSessionId = getCurrentAppSessionId();

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(appSessionId ? { 'X-App-Session': appSessionId } : {}),
      ...init?.headers,
    },
  });

  if (response.status === 401) {
    // Clone so the caller can still read the body for its own error message.
    const body = await response
      .clone()
      .text()
      .catch(() => '');
    const sessionError = parseSessionError(body);
    if (sessionError) emitSessionError(sessionError);
  }

  return response;
}
