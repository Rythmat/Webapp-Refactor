// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  appendMspLaunchParams,
  clearStashedMspLaunchParams,
  fallbackInboxToken,
  readMspLaunchParams,
  readStashedMspLaunchParams,
  stashMspLaunchParams,
  type MspLaunchParams,
} from './mspLaunchParams';

const PARAMS: MspLaunchParams = {
  token: 'tok-abc',
  interactionId: 'ix-1',
  enrollmentId: 'en-1',
  module: 'learn',
  activityRef: 'song:test:lesson',
  expects: 'completion',
};

const queryOf = (url: string): string => {
  const i = url.indexOf('?');
  return i === -1 ? '' : url.slice(i);
};

describe('appendMspLaunchParams', () => {
  it('preserves an existing query such as ?activity=', () => {
    const url = appendMspLaunchParams('/learn/ionian/c?activity=scale', PARAMS);
    expect(url.split('?')[0]).toBe('/learn/ionian/c');
    const q = new URLSearchParams(queryOf(url));
    expect(q.get('activity')).toBe('scale');
    expect(q.get('msp')).toBe('tok-abc');
    expect(q.get('interactionId')).toBe('ix-1');
    expect(q.get('activityRef')).toBe('song:test:lesson');
  });

  it('omits msp when launched tokenless (offline)', () => {
    const { token: _token, ...tokenless } = PARAMS;
    const url = appendMspLaunchParams('/learn/ionian/c', tokenless);
    expect(new URLSearchParams(queryOf(url)).get('msp')).toBeNull();
    expect(new URLSearchParams(queryOf(url)).get('enrollmentId')).toBe('en-1');
  });
});

describe('readMspLaunchParams', () => {
  it('round-trips through append', () => {
    const url = appendMspLaunchParams('/x', PARAMS);
    expect(readMspLaunchParams(queryOf(url))).toEqual(PARAMS);
  });

  it('returns null when required fields are missing', () => {
    expect(readMspLaunchParams('?interactionId=only')).toBeNull();
  });
});

describe('fallbackInboxToken', () => {
  it('is deterministic per interaction/enrollment', () => {
    expect(fallbackInboxToken('ix', 'en')).toBe('local:ix:en');
  });
});

describe('stash', () => {
  beforeEach(() => clearStashedMspLaunchParams());

  it('stash → read → clear round-trips', () => {
    expect(readStashedMspLaunchParams()).toBeNull();
    stashMspLaunchParams(PARAMS);
    expect(readStashedMspLaunchParams()).toEqual(PARAMS);
    clearStashedMspLaunchParams();
    expect(readStashedMspLaunchParams()).toBeNull();
  });
});
