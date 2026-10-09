import { DEV_AUTH_BYPASS } from '@/auth/devBypass';
import { Env } from '@/constants/env';
import { APP_ORIGIN, SITE_ORIGIN } from '@/constants/hosts';

/**
 * Google Identity Services (GIS) config: One Tap and the official "Sign in
 * with Google" button.
 *
 * GIS only picks the Google account. Sign-in itself still runs through Auth0's
 * `google-oauth2` connection (the account's email goes along as
 * `login_hint`), so tokens, the backend and the session are unchanged. See
 * docs/auth-google-sign-in.md for the Google Cloud and Auth0 setup.
 *
 * The client ID is optional. When it is unset, or the page runs on an origin
 * Google hasn't authorised (Vercel previews, other dev ports), GIS stays off
 * and the sign-in page shows its own "Continue with Google" button, which goes
 * straight to Auth0.
 */
export const GOOGLE_CLIENT_ID =
  Env.get('VITE_GOOGLE_CLIENT_ID', { nullable: true })?.trim() || null;

/**
 * Origins registered as "Authorised JavaScript origins" on the Google OAuth
 * client. On any other origin GIS still loads but the button and prompt fail
 * with "origin not allowed", which the page can't detect, so it never tries.
 */
const DEFAULT_ALLOWED_ORIGINS = [
  SITE_ORIGIN,
  'https://www.musicatlas.io',
  APP_ORIGIN,
  'http://localhost:5179',
] as const;

const EXTRA_ALLOWED_ORIGINS = (
  Env.get('VITE_GOOGLE_ALLOWED_ORIGINS', { nullable: true }) ?? ''
)
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const currentOrigin = () =>
  typeof window === 'undefined' ? '' : window.location.origin;

export const isGisAllowedOrigin = (
  origin = currentOrigin(),
  extra: readonly string[] = EXTRA_ALLOWED_ORIGINS,
) =>
  (DEFAULT_ALLOWED_ORIGINS as readonly string[]).includes(origin) ||
  extra.includes(origin);

/**
 * Shares GIS's `g_state` cookie (One Tap cooldowns, "don't auto-select")
 * between musicatlas.io and app.musicatlas.io, so dismissing the prompt on
 * one host also counts on the other.
 */
export const gisStateCookieDomain = (
  hostname = typeof window === 'undefined' ? '' : window.location.hostname,
) =>
  hostname === 'musicatlas.io' || hostname.endsWith('.musicatlas.io')
    ? 'musicatlas.io'
    : undefined;

/** Whether GIS may run here: a client ID, an authorised origin, and no dev auth bypass. */
export const isGoogleIdentityEnabled = ({
  clientId = GOOGLE_CLIENT_ID,
  origin = currentOrigin(),
  bypass = DEV_AUTH_BYPASS,
}: { clientId?: string | null; origin?: string; bypass?: boolean } = {}) =>
  !bypass && Boolean(clientId) && isGisAllowedOrigin(origin);

/**
 * Kill switch for the One Tap prompt on the landing and marketing pages. The
 * sign-in page always offers Google regardless.
 */
export const ONE_TAP_ON_MARKETING = true;
