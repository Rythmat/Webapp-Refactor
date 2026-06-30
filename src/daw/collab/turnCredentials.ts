// ── TURN credentials ─────────────────────────────────────────────────────────
// Fetches short-lived ICE servers (Cloudflare TURN) from music-atlas-api for the
// studio live-monitor WebRTC mesh. TURN lets audio relay between collaborators
// when a direct P2P path can't form (symmetric NAT / CGNAT); without it, live
// monitoring between two real remote users frequently connects to nothing.
//
// The server mints the credentials so no long-lived TURN secret ever reaches the
// browser. We cache the result for the session (creds live ~24h) and fall back to
// STUN-only on any failure, so a missing/misconfigured TURN key degrades to
// "direct P2P only" rather than breaking the mesh outright.

import SuperJSON from 'superjson';
import { getCurrentAppSessionId } from '@/auth/app-session-store';
import { Env } from '@/constants/env';

interface TurnCredentialsResponse {
  iceServers: RTCIceServer[];
  expiresAt: Date;
}

/** STUN-only config used until/unless TURN credentials are available. */
export const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
];

// Re-mint a little before expiry to avoid handing out creds that lapse mid-call.
const EXPIRY_SKEW_MS = 5 * 60 * 1000;

let cached: { iceServers: RTCIceServer[]; expiresAtMs: number } | null = null;

function apiBase(): string {
  return Env.get('VITE_MUSIC_ATLAS_API_URL').replace(/\/+$/, '');
}

function turnCredentialsUrl(): string {
  const base = apiBase();
  const path = base.endsWith('/api')
    ? '/studio/turn/credentials'
    : '/api/studio/turn/credentials';
  return `${base}${path}`;
}

/**
 * Return ICE servers for an RTCPeerConnection. Yields Cloudflare TURN + STUN when
 * available, or STUN-only on any failure (no token, TURN not configured, network
 * error). Never throws — the mesh always gets a usable (if direct-only) config.
 */
export async function fetchTurnIceServers(
  token: string | null,
): Promise<RTCIceServer[]> {
  if (!token) return FALLBACK_ICE_SERVERS;

  if (cached && cached.expiresAtMs - Date.now() > EXPIRY_SKEW_MS) {
    return cached.iceServers;
  }

  try {
    const appSessionId = getCurrentAppSessionId();
    const res = await fetch(turnCredentialsUrl(), {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(appSessionId ? { 'X-App-Session': appSessionId } : {}),
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const text = await res.text();
    // The API serialises responses with SuperJSON (expiresAt round-trips as Date).
    const data = SuperJSON.parse<TurnCredentialsResponse>(text);
    if (!data.iceServers?.length) {
      throw new Error('no iceServers in response');
    }

    cached = {
      iceServers: data.iceServers,
      expiresAtMs: new Date(data.expiresAt).getTime(),
    };
    return data.iceServers;
  } catch (err) {
    console.warn(
      '[turn] credential fetch failed; falling back to STUN only',
      err,
    );
    return FALLBACK_ICE_SERVERS;
  }
}
