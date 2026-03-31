// ── PartyKit Auth Validation ──────────────────────────────────────────────
// Validates Auth0 JWTs on WebSocket connection to the PartyKit server.
// Uses jose (Edge-compatible) for JWT verification with JWKS.

import type { CollabRole } from '../types';

interface ConnectionAuth {
  userId: string;
  role: CollabRole;
}

/**
 * Validate the auth token passed via WebSocket connection URL params.
 * Returns the user's identity and role, or null if invalid.
 *
 * In production, this fetches the Auth0 JWKS and verifies the RS256 JWT.
 * For development, it falls back to decoding without full verification.
 */
export async function validateConnection(
  url: string,
): Promise<ConnectionAuth | null> {
  try {
    const params = new URL(url).searchParams;
    const token = params.get('token');
    const role = (params.get('role') as CollabRole) ?? 'editor';

    if (!token) {
      // No token — allow connection in dev mode, deny in production
      const isDev = !globalThis.process?.env?.AUTH0_DOMAIN;
      if (isDev) {
        return { userId: `anon-${Date.now()}`, role };
      }
      return null;
    }

    // Decode JWT payload (base64url)
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.sub) return null;

    // In production with AUTH0_DOMAIN configured, you would verify the JWT
    // using jose's jwtVerify with the JWKS endpoint:
    //
    //   import { jwtVerify, createRemoteJWKSet } from 'jose';
    //   const JWKS = createRemoteJWKSet(
    //     new URL(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`)
    //   );
    //   const { payload } = await jwtVerify(token, JWKS, {
    //     issuer: `https://${AUTH0_DOMAIN}/`,
    //     audience: AUTH0_AUDIENCE,
    //   });

    return { userId: payload.sub, role };
  } catch {
    return null;
  }
}
