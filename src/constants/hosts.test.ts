/**
 * The marketing host's allowlist lives in two places: `hosts.ts` (in-page
 * navigation) and the catch-all redirect in `vercel.json` (direct loads).
 * This pins them together so a new public section can't be served by one
 * and bounced to the app host by the other.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  APP_ORIGIN,
  appHref,
  isMarketingHost,
  isMarketingPath,
  MARKETING_PATH_PREFIXES,
} from './hosts';

interface Redirect {
  source: string;
  destination: string;
  has?: { type: string; value: string }[];
}

const vercel = JSON.parse(
  readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'),
) as { redirects: Redirect[] };

describe('isMarketingHost', () => {
  it('is true only for the apex and www', () => {
    expect(isMarketingHost('musicatlas.io')).toBe(true);
    expect(isMarketingHost('www.musicatlas.io')).toBe(true);
    expect(isMarketingHost('app.musicatlas.io')).toBe(false);
    expect(isMarketingHost('localhost')).toBe(false);
    expect(isMarketingHost('webapp-refactor-git-aaron.vercel.app')).toBe(false);
  });
});

describe('isMarketingPath', () => {
  it.each([
    '/',
    '/features/studio',
    '/features',
    '/for-teachers',
    '/blog',
    '/blog/some-post',
    '/documents/privacy',
    '/documents/licensing',
  ])('serves %s on the marketing host', (path) => {
    expect(isMarketingPath(path)).toBe(true);
  });

  it.each(['/auth/sign-in', '/home', '/studio', '/featuresX', '/blogger'])(
    'hands %s off to the app host',
    (path) => {
      expect(isMarketingPath(path)).toBe(false);
    },
  );
});

describe('appHref', () => {
  it('is absolute on the marketing host and relative elsewhere', () => {
    expect(appHref('/auth/sign-in', 'musicatlas.io')).toBe(
      `${APP_ORIGIN}/auth/sign-in`,
    );
    expect(appHref('/auth/sign-in', 'app.musicatlas.io')).toBe('/auth/sign-in');
    expect(appHref('/studio', 'localhost')).toBe('/studio');
  });
});

describe('vercel.json', () => {
  const marketingHostRedirects = vercel.redirects.filter((r) =>
    r.has?.some((h) => h.type === 'host' && h.value.includes('musicatlas')),
  );
  const catchAll = marketingHostRedirects.find((r) =>
    r.destination.startsWith(APP_ORIGIN),
  );

  it('only redirects on the marketing host', () => {
    expect(marketingHostRedirects).toHaveLength(vercel.redirects.length);
  });

  it('exempts exactly MARKETING_PATH_PREFIXES from the app redirect', () => {
    const exempt = catchAll?.source.match(/\(\?!\(\?:([^)]+)\)/)?.[1];
    expect(exempt?.split('|').sort()).toEqual(
      [...MARKETING_PATH_PREFIXES].sort(),
    );
  });

  it('sends the app redirect last, after the legacy Webflow redirects', () => {
    expect(vercel.redirects.at(-1)).toBe(catchAll);
  });
});
