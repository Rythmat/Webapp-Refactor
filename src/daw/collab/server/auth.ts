// ── PartyKit Auth Validation ──────────────────────────────────────────────
// Validates Auth0 JWTs on WebSocket connection to the PartyKit server.
// Uses jose (Edge-compatible) for JWT verification with JWKS.

import { jwtVerify, createRemoteJWKSet } from 'jose';
import type { CollabRole } from '../types';

interface ConnectionAuth {
  userId: string;
  role: CollabRole;
}

// Cache the JWKS keyset per domain to avoid re-fetching on every connection
let cachedJWKS: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedDomain: string | null = null;

function getJWKS(domain: string) {
  if (cachedJWKS && cachedDomain === domain) return cachedJWKS;
  cachedDomain = domain;
  cachedJWKS = createRemoteJWKSet(
    new URL(`https://${domain}/.well-known/jwks.json`),
  );
  return cachedJWKS;
}

/**
 * Validate the auth token passed via the WebSocket connection URL and return the
 * user's identity + requested collab role, or null if invalid.
 *
 * The token is the Auth0 access token (audience = the API audience) carrying a
 * custom `user_id` claim = the app User.id. We verify its signature against
 * Auth0's JWKS (RS256) and check issuer + audience, then read the VERIFIED
 * `user_id`. Fails CLOSED: a missing / invalid / expired token, or an
 * unconfigured environment, returns null so the connection is rejected. It never
 * decodes an unverified token — doing so would let a caller forge any `user_id`
 * and `role` and connect as (or host as) any user.
 *
 * REQUIRES `AUTH0_DOMAIN` + `AUTH0_AUDIENCE` in the PartyKit environment,
 * matching the client's `VITE_AUTH0_DOMAIN` / `VITE_AUTH0_AUDIENCE`. Local
 * `partykit dev` must set them too, or collab connections are rejected.
 */
export async function validateConnection(
  url: string,
  env?: Record<string, unknown>,
): Promise<ConnectionAuth | null> {
  try {
    const params = new URL(url).searchParams;
    const token = params.get('token');
    const role = (params.get('role') as CollabRole) ?? 'editor';

    const auth0Domain =
      (env?.AUTH0_DOMAIN as string) ?? globalThis.process?.env?.AUTH0_DOMAIN;
    const auth0Audience =
      (env?.AUTH0_AUDIENCE as string) ??
      globalThis.process?.env?.AUTH0_AUDIENCE;

    // Fail closed — we cannot verify without a token and Auth0 config.
    if (!token || !auth0Domain || !auth0Audience) return null;

    const JWKS = getJWKS(auth0Domain);
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://${auth0Domain}/`,
      audience: auth0Audience,
    });

    // The app User.id travels in a custom `user_id` claim (fallback: `sub`).
    // This MUST match the identity the web client broadcasts in awareness
    // presence, or host tracking / kick / ban can't line up the connection with
    // the presence the host is acting on.
    const uid =
      (payload.user_id as string | undefined) ??
      (payload.sub as string | undefined);
    if (!uid) return null;

    return { userId: String(uid), role };
  } catch {
    return null;
  }
}
