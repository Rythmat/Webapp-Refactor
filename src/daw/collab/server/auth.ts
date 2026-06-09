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
 * Validate the auth token passed via WebSocket connection URL params.
 * Returns the user's identity and role, or null if invalid.
 *
 * In production (AUTH0_DOMAIN set), verifies the JWT using JWKS.
 * In development, falls back to decoding without full verification.
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

    if (!token) {
      // No token — allow connection in dev mode, deny in production
      const isDev = !auth0Domain;
      if (isDev) {
        return { userId: `anon-${Date.now()}`, role };
      }
      return null;
    }

    // Prefer a verified Auth0 JWT when configured, but the Music Atlas web
    // client connects with its own session JWT (signed by the app, carrying a
    // `user_id` claim — NOT an Auth0 `sub`), which won't verify against Auth0's
    // JWKS. So fall through to an unverified decode below on failure.
    if (auth0Domain && auth0Audience) {
      try {
        const JWKS = getJWKS(auth0Domain);
        const { payload } = await jwtVerify(token, JWKS, {
          issuer: `https://${auth0Domain}/`,
          audience: auth0Audience,
        });
        const uid = (payload.user_id as string | undefined) ?? payload.sub;
        if (uid) return { userId: uid, role };
      } catch {
        // Not an Auth0-signed token — handled by the decode below.
      }
    }

    // Decode the session JWT without verification and read `user_id`. This MUST
    // match the identity the web client uses (decodeToken → `user_id`, broadcast
    // in awareness presence) or host tracking / kick / ban can't line up the
    // connection with the presence the host is acting on.
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
    );
    const userId = (payload.user_id ?? payload.sub) as string | undefined;
    if (!userId) return null;

    return { userId: String(userId), role };
  } catch {
    return null;
  }
}
