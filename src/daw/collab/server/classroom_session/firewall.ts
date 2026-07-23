// ── Classroom Session — Rule 2 projector strip ────────────────────────────
// Web Crypto implementation of the identifier strip applied before a `response`
// event reaches a projector socket. Mirrors the server-side reference in
// music-atlas-api (src/services/classroom/v2/firewall.ts) but uses crypto.subtle
// because PartyKit runs on Cloudflare Workers (no node:crypto).

export interface ResponseBroadcast {
  type: 'response';
  at: string;
  interactionId: string;
  sessionId: string;
  enrollmentId: string;
  displayName?: string;
  payload: unknown;
}

export interface ProjectorResponseBroadcast {
  type: 'response';
  at: string;
  interactionId: string;
  anon: string;
  payload: unknown;
}

async function anonKey(
  enrollmentId: string,
  sessionId: string,
): Promise<string> {
  const data = new TextEncoder().encode(`${enrollmentId}:${sessionId}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex.slice(0, 8);
}

/**
 * Strip identifiers from a `response` before it goes to the projector. The
 * `anon` key groups responses by the same student without leaking identity and
 * is salted with `sessionId` so anons never cross sessions.
 */
export async function stripForProjector(
  msg: ResponseBroadcast,
): Promise<ProjectorResponseBroadcast> {
  return {
    type: 'response',
    at: msg.at,
    interactionId: msg.interactionId,
    anon: await anonKey(msg.enrollmentId, msg.sessionId),
    payload: msg.payload,
    // enrollmentId + displayName intentionally omitted
  };
}
