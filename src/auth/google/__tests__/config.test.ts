import { describe, expect, it } from 'vitest';
import {
  gisStateCookieDomain,
  isGisAllowedOrigin,
  isGoogleIdentityEnabled,
} from '../config';

describe('isGisAllowedOrigin', () => {
  it('allows the production hosts and the owner dev server', () => {
    for (const origin of [
      'https://musicatlas.io',
      'https://www.musicatlas.io',
      'https://app.musicatlas.io',
      'http://localhost:5179',
    ]) {
      expect(isGisAllowedOrigin(origin, []), origin).toBe(true);
    }
  });

  it('keeps previews and other ports off unless listed as extras', () => {
    expect(isGisAllowedOrigin('https://webapp-git-x.vercel.app', [])).toBe(
      false,
    );
    expect(isGisAllowedOrigin('http://localhost:5262', [])).toBe(false);
    expect(
      isGisAllowedOrigin('http://localhost:5262', ['http://localhost:5262']),
    ).toBe(true);
  });
});

describe('gisStateCookieDomain', () => {
  it('shares the GIS state cookie across musicatlas.io hosts only', () => {
    expect(gisStateCookieDomain('musicatlas.io')).toBe('musicatlas.io');
    expect(gisStateCookieDomain('app.musicatlas.io')).toBe('musicatlas.io');
    expect(gisStateCookieDomain('localhost')).toBeUndefined();
    expect(gisStateCookieDomain('notmusicatlas.io')).toBeUndefined();
  });
});

describe('isGoogleIdentityEnabled', () => {
  const on = {
    clientId: 'id.apps.googleusercontent.com',
    origin: 'https://app.musicatlas.io',
    bypass: false,
  };

  it('needs a client id, an allowed origin and no dev bypass', () => {
    expect(isGoogleIdentityEnabled(on)).toBe(true);
    expect(isGoogleIdentityEnabled({ ...on, clientId: null })).toBe(false);
    expect(
      isGoogleIdentityEnabled({ ...on, origin: 'https://x.vercel.app' }),
    ).toBe(false);
    expect(isGoogleIdentityEnabled({ ...on, bypass: true })).toBe(false);
  });
});
