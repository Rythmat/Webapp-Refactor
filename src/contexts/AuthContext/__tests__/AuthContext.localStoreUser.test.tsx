// @vitest-environment jsdom
/**
 * Whom device storage belongs to (userScope.ts) follows auth, in 1.4's three
 * states: unknown while auth is still loading (nothing is written under
 * 'anon' during boot), the user once known, and signed out only when Auth0
 * says so, or at sign-out AFTER the before-sign-out tasks ran, so the Studio's
 * draft flush still sees the outgoing user. A burst of session errors runs
 * those tasks once.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { useContext } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerBeforeSignOut } from '@/auth/beforeSignOut';
import { emitSessionError } from '@/auth/session-errors';
import {
  getLocalStoreUser,
  isLocalStoreUserKnown,
  setLocalStoreUser,
} from '@/lib/local-store/userScope';
import { AuthContext, AuthContextProvider } from '../AuthContext';
import type { AuthContextValue } from '../types';

const auth0 = vi.hoisted(() => ({
  state: {
    isAuthenticated: false,
    isLoading: true,
  },
  // Auth0's logout ends the session (then redirects, which a test can't).
  logout: vi.fn(async () => {
    auth0.state.isAuthenticated = false;
  }),
}));

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    isAuthenticated: auth0.state.isAuthenticated,
    isLoading: auth0.state.isLoading,
    error: undefined,
    getAccessTokenSilently: async () => 'token-a',
    loginWithRedirect: async () => {},
    logout: auth0.logout,
  }),
}));

vi.mock('../../MusicAtlasContext/api', () => ({
  useGlobalMusicAtlas: () => ({
    auth: { getAuthMe: async () => ({ id: 'user-a', role: 'student' }) },
  }),
}));

vi.mock('@/auth/devBypass', () => ({
  DEV_AUTH_BYPASS: false,
  DEV_BYPASS_AUTH_DATA: null,
}));

vi.mock('@/auth/session-sse', () => ({
  connectSessionSSE: () => () => {},
}));

vi.mock('@/audio/AudioEngine', () => ({
  audioEngine: { playAudioClip: () => {}, registerAudioClips: () => {} },
}));

vi.mock('@/hooks/data/subscription/useMySubscription', () => ({
  SUBSCRIPTION_QUERY_KEY: ['subscription', 'status'],
  fetchSubscriptionStatus: async () => null,
}));

vi.mock('@/constants/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/constants/env')>();
  class Env extends actual.Env {
    static override get(key: string, options?: { nullable?: boolean }) {
      if (key === 'VITE_AUTH0_AUDIENCE') return 'audience';
      if (options?.nullable) return '';
      return 'value';
    }
  }
  return { ...actual, Env };
});

vi.mock('@/util/toast', () => ({ showError: () => {} }));

let ctx: AuthContextValue | null = null;

function Capture() {
  ctx = useContext(AuthContext);
  return null;
}

function renderProvider() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/studio/editor']}>
        <AuthContextProvider>
          <Capture />
        </AuthContextProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  setLocalStoreUser(undefined);
  auth0.state.isAuthenticated = false;
  auth0.state.isLoading = true;
  auth0.logout.mockClear();
  ctx = null;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('', { status: 500 })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  setLocalStoreUser(undefined);
});

describe('AuthContext → userScope', () => {
  it('leaves the user unknown while auth is loading, then publishes a confirmed sign-out', () => {
    const view = renderProvider();
    expect(isLocalStoreUserKnown()).toBe(false);

    auth0.state.isLoading = false;
    view.rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/studio/editor']}>
          <AuthContextProvider>
            <Capture />
          </AuthContextProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(isLocalStoreUserKnown()).toBe(true);
    expect(getLocalStoreUser()).toBeNull();
  });

  it('stays unknown while signed in but the profile has not loaded yet', async () => {
    auth0.state.isLoading = false;
    auth0.state.isAuthenticated = true;
    renderProvider();
    expect(isLocalStoreUserKnown()).toBe(false);
    await waitFor(() => expect(getLocalStoreUser()).toBe('user-a'));
  });

  it('runs the sign-out tasks while the user is still known, then signs the scope out', async () => {
    auth0.state.isLoading = false;
    auth0.state.isAuthenticated = true;
    renderProvider();
    await waitFor(() => expect(getLocalStoreUser()).toBe('user-a'));

    const seen: (string | null)[] = [];
    const unregister = registerBeforeSignOut(() => {
      seen.push(getLocalStoreUser());
    });
    try {
      await act(async () => {
        await ctx!.signOut();
      });
    } finally {
      unregister();
    }
    expect(seen).toEqual(['user-a']);
    expect(isLocalStoreUserKnown()).toBe(true);
    expect(getLocalStoreUser()).toBeNull();
    expect(auth0.logout).toHaveBeenCalledTimes(1);
  });

  it('runs the sign-out tasks once for a burst of session errors, before the scope signs out', async () => {
    auth0.state.isLoading = false;
    auth0.state.isAuthenticated = true;
    renderProvider();
    await waitFor(() => expect(getLocalStoreUser()).toBe('user-a'));

    const seen: (string | null)[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const unregister = registerBeforeSignOut(async () => {
      seen.push(getLocalStoreUser());
      await gate;
    });
    try {
      await act(async () => {
        for (let i = 0; i < 3; i++) {
          emitSessionError({ code: 'SESSION_EXPIRED', message: 'expired' });
        }
        release();
        await waitFor(() => expect(auth0.logout).toHaveBeenCalled());
      });
    } finally {
      unregister();
    }
    expect(seen).toEqual(['user-a']);
    expect(auth0.logout).toHaveBeenCalledTimes(1);
    expect(getLocalStoreUser()).toBeNull();
  });
});
