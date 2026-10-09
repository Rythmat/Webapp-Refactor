// ── A typed failure from the Studio projects API (milestone 1.4) ───────────
//
// request() (projectsClient) throws this for every HTTP failure and for a
// request that never reached the server (status 0), so a caller can tell
// "offline" from "signed out" from "the project is gone" without reading the
// message. The message is today's ("PUT /api/studio/projects/<id> failed
// (404): …"): it is for logs only, and never reaches a student, since it
// names ids and codes. classifyStudioFailure turns any error into the kind a
// caller words for the student.
//
// No imports: the dashboard's project lists load the client that throws it.

export interface StudioApiErrorInit {
  /** The HTTP status; 0 when the request never got an answer. */
  status: number;
  /** A machine-readable code from the JSON error body, when it had one. */
  code?: string | null;
  method: string;
  path: string;
  /** For logs: method, path, status and the server's own message. */
  message: string;
  cause?: unknown;
}

export class StudioApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly method: string;
  readonly path: string;
  // lib ES2020 has no ErrorOptions: keep the cause ourselves.
  readonly cause: unknown;

  constructor(init: StudioApiErrorInit) {
    super(init.message);
    this.name = 'StudioApiError';
    this.status = init.status;
    this.code = init.code ?? null;
    this.method = init.method;
    this.path = init.path;
    this.cause = init.cause;
  }
}

/** Whether `error` is a StudioApiError (also across module copies). */
export function isStudioApiError(error: unknown): error is StudioApiError {
  return (
    error instanceof StudioApiError ||
    (error instanceof Error &&
      error.name === 'StudioApiError' &&
      typeof (error as Partial<StudioApiError>).status === 'number')
  );
}

export type StudioFailureKind =
  | 'offline'
  | 'signed-out'
  | 'no-access'
  | 'not-found'
  | 'too-large'
  | 'conflict'
  | 'server'
  | 'timeout'
  | 'unknown';

/** The failure kind of an HTTP status (0 = no answer). */
export function failureKindOfStatus(status: number): StudioFailureKind {
  if (status === 0) return 'offline';
  if (status === 401) return 'signed-out';
  if (status === 403) return 'no-access';
  if (status === 404 || status === 410) return 'not-found';
  if (status === 409 || status === 412) return 'conflict';
  if (status === 413) return 'too-large';
  if (status === 408) return 'timeout';
  if (status >= 500) return 'server';
  return 'unknown';
}

/**
 * What went wrong, in a kind the caller can word for a student:
 * a StudioApiError by its status, an aborted or timed-out fetch as
 * 'timeout', a fetch that never reached the server ('Failed to fetch') as
 * 'offline', and anything else as 'unknown'. Never throws.
 */
export function classifyStudioFailure(error: unknown): StudioFailureKind {
  if (isStudioApiError(error)) return failureKindOfStatus(error.status);
  if (error instanceof Error || isDomExceptionLike(error)) {
    const name = (error as { name?: unknown }).name;
    if (name === 'TimeoutError' || name === 'AbortError') return 'timeout';
    if (error instanceof TypeError) return 'offline';
  }
  return 'unknown';
}

function isDomExceptionLike(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { name?: unknown }).name === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  );
}

/** Whether `error` is an abort (the caller's signal, or a timeout). */
export function isAbortLike(error: unknown): boolean {
  const name =
    typeof error === 'object' && error !== null
      ? (error as { name?: unknown }).name
      : undefined;
  return name === 'AbortError' || name === 'TimeoutError';
}
