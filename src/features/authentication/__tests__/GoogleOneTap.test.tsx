// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetGisForTests } from '@/auth/google/gis';
import { GoogleOneTap } from '../components/GoogleOneTap';
import { fakeCredential, installFakeGis } from './googleTestUtils';

/**
 * One Tap on the landing/marketing pages: signed-out visitors only, never
 * auto-selecting, loaded after the page is idle; a pick hands over to the app
 * host (from musicatlas.io) or starts the hinted Auth0 login (on app.).
 */

const CLIENT_ID = 'test-client.apps.googleusercontent.com';

const cfg = vi.hoisted(() => ({ enabled: true, marketingHost: false }));
vi.mock('@/auth/google/config', () => ({
  GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com',
  isGoogleIdentityEnabled: () => cfg.enabled,
  gisStateCookieDomain: () => undefined,
  ONE_TAP_ON_MARKETING: true,
}));
vi.mock('@/constants/hosts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/constants/hosts')>()),
  isMarketingHost: () => cfg.marketingHost,
}));

const redirectTo = vi.hoisted(() => vi.fn());
vi.mock('@/auth/google/redirect', () => ({ redirectTo }));

const auth = vi.hoisted(() => ({
  isBootstrapLoading: false,
  isAuth0Authenticated: false,
  appUser: null as object | null,
  signInWithGoogleHint: vi.fn(async () => {}),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuthContext: () => auth }));

const mount = () =>
  render(
    <StrictMode>
      <GoogleOneTap />
    </StrictMode>,
  );

/** Past the idle load and the prompt delay. */
const settle = () => act(() => vi.advanceTimersByTimeAsync(5_000));

beforeEach(() => {
  vi.useFakeTimers();
  cfg.enabled = true;
  cfg.marketingHost = false;
  auth.isBootstrapLoading = false;
  auth.isAuth0Authenticated = false;
  auth.appUser = null;
  sessionStorage.clear();
  __resetGisForTests();
  delete window.google;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('GoogleOneTap', () => {
  it('prompts signed-out visitors once, without auto-select', async () => {
    const { gis, lastConfig } = installFakeGis();
    mount();
    expect(gis.prompt).not.toHaveBeenCalled();
    await settle();

    expect(lastConfig()).toMatchObject({
      client_id: CLIENT_ID,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    expect(gis.prompt).toHaveBeenCalledOnce();
  });

  it('stays quiet while loading, when signed in, after sign-out, or when disabled', async () => {
    const cases: Array<() => void> = [
      () => (auth.isBootstrapLoading = true),
      () => (auth.isAuth0Authenticated = true),
      () => (auth.appUser = { id: 'u1' }),
      () => sessionStorage.setItem('musicAtlas:googleOneTapQuiet', '1'),
      () => (cfg.enabled = false),
    ];
    for (const arrange of cases) {
      const { gis } = installFakeGis();
      arrange();
      mount();
      await settle();
      expect(gis.initialize).not.toHaveBeenCalled();
      expect(gis.prompt).not.toHaveBeenCalled();
      cleanup();
      auth.isBootstrapLoading = false;
      auth.isAuth0Authenticated = false;
      auth.appUser = null;
      cfg.enabled = true;
      sessionStorage.clear();
    }
  });

  it('hands a pick on musicatlas.io over to the app host sign-in page', async () => {
    cfg.marketingHost = true;
    const { respond } = installFakeGis();
    mount();
    await settle();

    act(() => respond(fakeCredential('ada@gmail.com', CLIENT_ID)));
    expect(redirectTo).toHaveBeenCalledOnce();
    const url = new URL(redirectTo.mock.calls[0][0] as string);
    expect(url.origin).toBe('https://app.musicatlas.io');
    expect(url.pathname).toBe('/auth/sign-in');
    expect(new URLSearchParams(url.hash.slice(1)).get('google_hint')).toBe(
      'ada@gmail.com',
    );
    expect(auth.signInWithGoogleHint).not.toHaveBeenCalled();
  });

  it('starts the hinted login on the app host, landing on Home', async () => {
    const { respond } = installFakeGis();
    mount();
    await settle();

    act(() => respond(fakeCredential('ada@gmail.com', CLIENT_ID)));
    expect(auth.signInWithGoogleHint).toHaveBeenCalledWith('ada@gmail.com', {
      returnTo: '/home',
    });
    expect(redirectTo).not.toHaveBeenCalled();
  });
});
