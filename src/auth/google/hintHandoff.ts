import { APP_ORIGIN } from '@/constants/hosts';
import { AuthRoutes } from '@/constants/routes';

/**
 * Carries a One Tap pick from the marketing host (musicatlas.io) to the app
 * host, where sign-in state lives. The marketing page sends the visitor to
 * `app.musicatlas.io/auth/sign-in#google_hint=<email>&t=<ms>`, and the
 * sign-in page there starts the Auth0 Google login with that email as
 * `login_hint`.
 *
 * The email rides in the fragment, so it never reaches a server log or a
 * Referer header, and the sign-in page strips it from history at once. `t`
 * makes the hint expire: a bookmarked, shared or crafted link doesn't redirect
 * anyone to Google after a couple of minutes. (A hint only pre-selects an
 * account; Google still authenticates.)
 */

const GOOGLE_HINT_PARAM = 'google_hint';
const TIME_PARAM = 't';

/** How long a handoff link stays live. */
export const GOOGLE_HINT_MAX_AGE_MS = 120_000;
/** Tolerance for a `t` slightly in the future (same browser, so tiny). */
const FUTURE_SKEW_MS = 5_000;

export const isPlausibleEmail = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length <= 254 &&
  /^[^\s@]+@[^\s@]+$/.test(value);

const paramsOf = (hash: string) => new URLSearchParams(hash.replace(/^#/, ''));

/** The app host's sign-in URL carrying `email` as a fresh hint (plain sign-in without one). */
export const buildGoogleHintHandoffUrl = (
  email: string | null,
  now = Date.now(),
  appOrigin = APP_ORIGIN,
) => {
  const base = `${appOrigin}${AuthRoutes.signIn()}`;
  if (!isPlausibleEmail(email)) return base;
  const params = new URLSearchParams({
    [GOOGLE_HINT_PARAM]: email,
    [TIME_PARAM]: String(now),
  });
  return `${base}#${params.toString()}`;
};

/** Whether the fragment carries a hint at all (fresh or not). */
export const hasGoogleHint = (hash: string) =>
  paramsOf(hash).has(GOOGLE_HINT_PARAM);

/** The hinted email, if the fragment carries a valid, fresh hint. */
export const readGoogleHint = (
  hash: string,
  now = Date.now(),
): { email: string } | null => {
  const params = paramsOf(hash);
  const email = params.get(GOOGLE_HINT_PARAM);
  const sentAt = Number(params.get(TIME_PARAM) ?? NaN);
  if (!isPlausibleEmail(email) || !Number.isFinite(sentAt)) return null;
  const age = now - sentAt;
  if (age > GOOGLE_HINT_MAX_AGE_MS || age < -FUTURE_SKEW_MS) return null;
  return { email };
};

/** The fragment without the hint (any other params kept), `''` when nothing is left. */
export const stripGoogleHint = (hash: string) => {
  const params = paramsOf(hash);
  params.delete(GOOGLE_HINT_PARAM);
  params.delete(TIME_PARAM);
  const rest = params.toString();
  return rest ? `#${rest}` : '';
};
