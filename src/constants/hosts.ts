/**
 * The site is split across two hosts served by one Vercel build:
 * - `musicatlas.io` (and `www.`, which Vercel redirects to it) serves only
 *   the public pages: landing, `/features/*`, `/blog`, `/for-teachers` and
 *   `/documents/*`.
 * - `app.musicatlas.io` serves everything, including sign-in and the app.
 *
 * Sign-in state is per origin (Auth0 callback and cache, the single app
 * session), so the marketing host must never run the app — app routes hand
 * off to `APP_ORIGIN`. Keep `MARKETING_PATH_PREFIXES` in sync with the
 * marketing-host redirects in `vercel.json`.
 */

/** Canonical origin for public pages (SEO, sitemap, share links). */
export const SITE_ORIGIN = 'https://musicatlas.io';

/** Where sign-in and every app route live. */
export const APP_ORIGIN = 'https://app.musicatlas.io';

const MARKETING_HOSTS = new Set(['musicatlas.io', 'www.musicatlas.io']);

/** First path segments the marketing host serves (besides `/`). */
export const MARKETING_PATH_PREFIXES = [
  'features',
  'for-teachers',
  'blog',
  'documents',
] as const;

const currentHostname = () =>
  typeof window === 'undefined' ? '' : window.location.hostname;

/** True on the public marketing host; false on the app host, previews and localhost. */
export const isMarketingHost = (hostname = currentHostname()) =>
  MARKETING_HOSTS.has(hostname);

/** Whether the marketing host serves this pathname. */
export const isMarketingPath = (pathname: string) => {
  const first = pathname.split('/')[1] ?? '';
  return (
    first === '' ||
    (MARKETING_PATH_PREFIXES as readonly string[]).includes(first)
  );
};

/**
 * Link target for an app route from a public page: absolute on the
 * marketing host (so it leaves for the app host), unchanged elsewhere.
 */
export const appHref = (path: string, hostname = currentHostname()) =>
  isMarketingHost(hostname) ? `${APP_ORIGIN}${path}` : path;
