import { describe, expect, it } from 'vitest';
import { APP_ORIGIN } from '@/constants/hosts';
import {
  buildGoogleHintHandoffUrl,
  GOOGLE_HINT_MAX_AGE_MS,
  hasGoogleHint,
  isPlausibleEmail,
  readGoogleHint,
  stripGoogleHint,
} from '../hintHandoff';

/**
 * The marketing host hands a One Tap pick to the app host's sign-in page in
 * the URL fragment; the hint must survive the trip intact and expire quickly.
 */

const NOW = 1_800_000_000_000;
const hashOf = (url: string) => url.slice(url.indexOf('#'));

describe('buildGoogleHintHandoffUrl / readGoogleHint', () => {
  it('points at the app host sign-in page with the hint in the fragment', () => {
    const url = buildGoogleHintHandoffUrl('ada@gmail.com', NOW);
    expect(url.startsWith(`${APP_ORIGIN}/auth/sign-in#`)).toBe(true);
    expect(url).not.toContain('?');
    expect(readGoogleHint(hashOf(url), NOW)).toEqual({
      email: 'ada@gmail.com',
    });
  });

  it('keeps plus-addresses intact (a raw + would decode as a space)', () => {
    const url = buildGoogleHintHandoffUrl('a+b@gmail.com', NOW);
    expect(url).toContain('a%2Bb%40gmail.com');
    expect(readGoogleHint(hashOf(url), NOW)?.email).toBe('a+b@gmail.com');
    expect(readGoogleHint('#google_hint=a+b@gmail.com&t=' + NOW, NOW)).toBe(
      null,
    );
  });

  it('falls back to the plain sign-in URL without a usable email', () => {
    expect(buildGoogleHintHandoffUrl(null, NOW)).toBe(
      `${APP_ORIGIN}/auth/sign-in`,
    );
    expect(buildGoogleHintHandoffUrl('not-an-email', NOW)).toBe(
      `${APP_ORIGIN}/auth/sign-in`,
    );
  });

  it('expires stale, future and undated hints', () => {
    const hash = hashOf(buildGoogleHintHandoffUrl('ada@gmail.com', NOW));
    expect(readGoogleHint(hash, NOW + GOOGLE_HINT_MAX_AGE_MS)).not.toBe(null);
    expect(readGoogleHint(hash, NOW + GOOGLE_HINT_MAX_AGE_MS + 1)).toBe(null);
    expect(readGoogleHint(hash, NOW - 60_000)).toBe(null);
    expect(readGoogleHint('#google_hint=ada%40gmail.com', NOW)).toBe(null);
    expect(readGoogleHint('#google_hint=ada%40gmail.com&t=soon', NOW)).toBe(
      null,
    );
  });

  it('rejects invalid emails and fragments without a hint', () => {
    expect(readGoogleHint(`#google_hint=nope&t=${NOW}`, NOW)).toBe(null);
    expect(readGoogleHint('', NOW)).toBe(null);
    expect(readGoogleHint('#section-2', NOW)).toBe(null);
  });
});

describe('hasGoogleHint / stripGoogleHint', () => {
  it('removes the hint and its timestamp, keeping anything else', () => {
    expect(hasGoogleHint(`#google_hint=x&t=${NOW}`)).toBe(true);
    expect(hasGoogleHint('#t=1')).toBe(false);
    expect(stripGoogleHint(`#google_hint=x&t=${NOW}`)).toBe('');
    expect(stripGoogleHint(`#google_hint=x&t=${NOW}&tab=2`)).toBe('#tab=2');
    expect(stripGoogleHint('')).toBe('');
  });
});

describe('isPlausibleEmail', () => {
  it('accepts ordinary addresses and rejects junk', () => {
    expect(isPlausibleEmail('teacher@school.k12.us')).toBe(true);
    expect(isPlausibleEmail('a b@gmail.com')).toBe(false);
    expect(isPlausibleEmail('a@b@c')).toBe(false);
    expect(isPlausibleEmail(`${'a'.repeat(250)}@x.io`)).toBe(false);
    expect(isPlausibleEmail(42)).toBe(false);
  });
});
