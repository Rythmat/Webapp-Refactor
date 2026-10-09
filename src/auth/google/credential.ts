import { jwtDecode } from 'jwt-decode';
import { isPlausibleEmail } from './hintHandoff';

const GOOGLE_ISSUERS = new Set([
  'accounts.google.com',
  'https://accounts.google.com',
]);

interface GoogleIdTokenClaims {
  email?: unknown;
  email_verified?: unknown;
  aud?: unknown;
  iss?: unknown;
}

/**
 * The email in a GIS credential (a Google ID token), used only as Auth0's
 * `login_hint`. The token is never trusted or sent anywhere: Auth0 runs the
 * real Google sign-in, so these are sanity checks, and a forged token could at
 * most choose which account Google pre-selects.
 */
export const emailFromCredential = (
  credential: unknown,
  expectedAud?: string | null,
): string | null => {
  if (typeof credential !== 'string' || !credential) return null;

  let claims: GoogleIdTokenClaims;
  try {
    claims = jwtDecode<GoogleIdTokenClaims>(credential);
  } catch {
    return null;
  }
  if (!claims || typeof claims !== 'object') return null;

  if (typeof claims.iss !== 'string' || !GOOGLE_ISSUERS.has(claims.iss)) {
    return null;
  }
  if (expectedAud && claims.aud !== expectedAud) return null;
  if (claims.email_verified === false) return null;

  return isPlausibleEmail(claims.email) ? claims.email : null;
};
