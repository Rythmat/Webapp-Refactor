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

    // Production: verify JWT with JWKS
    if (auth0Domain && auth0Audience) {
      try {
        const JWKS = getJWKS(auth0Domain);
        const { payload } = await jwtVerify(token, JWKS, {
          issuer: `https://${auth0Domain}/`,
          audience: auth0Audience,
        });
        if (!payload.sub) return null;
        return { userId: payload.sub, role };
      } catch (err) {
        console.error('JWT verification failed:', err);
        return null;
      }
    }

    // Development fallback: decode JWT payload without verification
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
    );
    if (!payload.sub) return null;

    return { userId: payload.sub, role };
  } catch {
    return null;
  }
}
