// ── Classroom Session — PartyKit auth ─────────────────────────────────────
// Resolves a connection's authoritative role by calling the Music Atlas API's
// server-to-server authorize endpoint (gated by PARTYKIT_WEBHOOK_SECRET). The
// socket's `role` query param is only a *request*; the API decides teacher vs
// student vs projector from the DB. This is the transport half of Rule 2 —
// role can't be spoofed to receive identified peer responses.

export type Role = 'teacher' | 'student' | 'projector';

export interface SessionSnapshot {
  id: string;
  classroomId: string;
  teacherId: string;
  publishedDayId: string;
  code: string;
  status: 'live' | 'ended';
  state: unknown;
  startedAt: string;
  endedAt: string | null;
}

export interface ClassroomAuth {
  userId: string;
  role: Role;
  enrollmentId: string | null;
  displayName: string | null;
  session: SessionSnapshot;
}

export type AuthResult =
  | { ok: true; auth: ClassroomAuth }
  | { ok: false; reason: 'unauthorized' | 'not_found' | 'ended' };

function envValue(
  env: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  return (
    (env?.[key] as string | undefined) ??
    (globalThis as { process?: { env?: Record<string, string> } }).process
      ?.env?.[key]
  );
}

/**
 * Authorize a classroom_session socket. `sessionId` is the party room id;
 * `classroomId`, `token`, and the requested `role` come from the connection URL.
 */
export async function authorizeClassroomConnection(opts: {
  url: string;
  sessionId: string;
  env?: Record<string, unknown>;
}): Promise<AuthResult> {
  try {
    const params = new URL(opts.url).searchParams;
    const token = params.get('token');
    const requestedRole = (params.get('role') as Role | null) ?? 'student';
    const classroomId = params.get('classroomId');

    const apiUrl = envValue(opts.env, 'MUSIC_ATLAS_API_URL');
    const secret = envValue(opts.env, 'PARTYKIT_WEBHOOK_SECRET');

    if (!token || !classroomId || !apiUrl || !secret) {
      return { ok: false, reason: 'unauthorized' };
    }

    const res = await fetch(
      `${apiUrl}/classrooms/${classroomId}/sessions/${opts.sessionId}/authorize`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ token, role: requestedRole }),
      },
    );

    if (res.status === 404) return { ok: false, reason: 'not_found' };
    if (res.status === 409) return { ok: false, reason: 'ended' };
    if (!res.ok) return { ok: false, reason: 'unauthorized' };

    // Responses are SuperJSON-wrapped ({ json, meta }); the payload is under
    // `.json`. Dates arrive as ISO strings, which is fine — the party forwards
    // the session opaquely in `hello`.
    const body = (await res.json()) as { json?: ClassroomAuth } & ClassroomAuth;
    const auth = body.json ?? body;
    if (!auth?.userId || !auth?.role || !auth?.session) {
      return { ok: false, reason: 'unauthorized' };
    }

    return { ok: true, auth };
  } catch {
    return { ok: false, reason: 'unauthorized' };
  }
}
