/**
 * Centralized session error event bus.
 * When the backend rejects a request due to an invalid/replaced/expired app session,
 * the API interceptor fires an event here. The AuthContext listens and triggers logout.
 */

export type SessionErrorCode =
  | 'SESSION_REPLACED'
  | 'SESSION_EXPIRED'
  | 'SESSION_INVALID';

export type SessionErrorPayload = {
  code: SessionErrorCode;
  message: string;
};

type Listener = (payload: SessionErrorPayload) => void;

const listeners = new Set<Listener>();

export const onSessionError = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const emitSessionError = (payload: SessionErrorPayload) => {
  listeners.forEach((listener) => listener(payload));
};

const SESSION_ERROR_CODES = new Set<string>([
  'SESSION_REPLACED',
  'SESSION_EXPIRED',
  'SESSION_INVALID',
]);

/**
 * Attempt to parse a backend 401 response body for a session error code.
 * Returns the payload if found, null otherwise.
 */
export const parseSessionError = (
  responseData: unknown,
): SessionErrorPayload | null => {
  if (!responseData || typeof responseData !== 'object') {
    // The backend may return the JSON-stringified error as the top-level string
    if (typeof responseData === 'string') {
      try {
        const parsed = JSON.parse(responseData);
        return parseSessionError(parsed);
      } catch {
        return null;
      }
    }
    return null;
  }

  const data = responseData as Record<string, unknown>;

  // Check top-level { error: "SESSION_REPLACED", message: "..." }
  if (typeof data.error === 'string' && SESSION_ERROR_CODES.has(data.error)) {
    return {
      code: data.error as SessionErrorCode,
      message:
        (typeof data.message === 'string' ? data.message : '') || data.error,
    };
  }

  // The backend wraps Elysia error() strings in { error: stringifiedJSON }
  if (typeof data.error === 'string') {
    try {
      const inner = JSON.parse(data.error);
      if (
        inner &&
        typeof inner.error === 'string' &&
        SESSION_ERROR_CODES.has(inner.error)
      ) {
        return {
          code: inner.error as SessionErrorCode,
          message:
            (typeof inner.message === 'string' ? inner.message : '') ||
            inner.error,
        };
      }
    } catch {
      // not JSON — ignore
    }
  }

  return null;
};
