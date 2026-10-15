// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetGisForTests } from '@/auth/google/gis';
import { SignInForm } from '../components/SignInForm';
import { fakeCredential, installFakeGis } from './googleTestUtils';

/**
 * The sign-in page: the official Google button + One Tap when GIS is
 * available, our own Google button when it isn't, and email/sign-up on Auth0.
 */

const CLIENT_ID = 'test-client.apps.googleusercontent.com';

const cfg = vi.hoisted(() => ({ enabled: true }));
vi.mock('@/auth/google/config', () => ({
  GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com',
  isGoogleIdentityEnabled: () => cfg.enabled,
  gisStateCookieDomain: () => undefined,
  ONE_TAP_ON_MARKETING: true,
}));

const auth = vi.hoisted(() => ({
  error: null as string | null,
  isAuth0Authenticated: false,
  signInWithEmailAndPassword: vi.fn(async () => {}),
  signInWithProvider: vi.fn(async () => {}),
  signInWithGoogleHint: vi.fn(async () => {}),
  signUp: vi.fn(async () => {}),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuthContext: () => auth }));

const playFailure = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useMusicalForm', () => ({
  useMusicalForm: () => ({ playFailureProgression: playFailure }),
}));

const renderForm = () =>
  render(
    <StrictMode>
      <MemoryRouter>
        <SignInForm />
      </MemoryRouter>
    </StrictMode>,
  );

const gsiScript = () =>
  document.head.querySelector('script[src*="accounts.google.com/gsi/client"]');

beforeEach(() => {
  cfg.enabled = true;
  auth.error = null;
  auth.isAuth0Authenticated = false;
  localStorage.clear();
  sessionStorage.clear();
  __resetGisForTests();
  delete window.google;
  gsiScript()?.remove();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('without Google Identity Services', () => {
  it('shows our own Google button, which goes to Auth0 Google login', () => {
    cfg.enabled = false;
    renderForm();

    fireEvent.click(
      screen.getByRole('button', { name: /continue with google/i }),
    );
    expect(auth.signInWithProvider).toHaveBeenCalledWith('google');
    expect(screen.getByText('Redirecting…')).toBeInTheDocument();
    expect(gsiScript()).toBeNull();
  });

  it('falls back to that button when the GIS script fails to load', async () => {
    renderForm();
    const script = gsiScript();
    expect(script).not.toBeNull();
    act(() => {
      script!.dispatchEvent(new Event('error'));
    });
    expect(
      await screen.findByRole('button', { name: /continue with google/i }),
    ).toBeInTheDocument();
  });

  it('keeps email sign-in and sign-up on Auth0', () => {
    cfg.enabled = false;
    renderForm();
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with email' }),
    );
    expect(auth.signInWithEmailAndPassword).toHaveBeenCalledOnce();
    cleanup();

    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }));
    expect(auth.signUp).toHaveBeenCalledOnce();
  });
});

describe('with Google Identity Services', () => {
  it('renders the official button and prompts One Tap once (StrictMode)', async () => {
    const { gis, lastConfig } = installFakeGis();
    renderForm();

    await waitFor(() => expect(gis.renderButton).toHaveBeenCalled());
    expect(lastConfig()).toMatchObject({
      client_id: CLIENT_ID,
      auto_select: true,
      context: 'signin',
      itp_support: true,
      cancel_on_tap_outside: false,
    });
    expect(gis.renderButton.mock.calls.at(-1)?.[1]).toMatchObject({
      theme: 'outline',
      shape: 'pill',
      size: 'large',
      text: 'continue_with',
      width: expect.any(Number),
    });
    await waitFor(() => expect(gis.prompt).toHaveBeenCalledOnce());
    expect(
      screen.getByRole('button', { name: /trouble with google/i }),
    ).toBeInTheDocument();
  });

  it('does not auto-select right after a sign-out', async () => {
    localStorage.setItem('musicAtlas:googleAutoSelectOff', '1');
    const { gis, lastConfig } = installFakeGis();
    renderForm();
    await waitFor(() => expect(gis.initialize).toHaveBeenCalled());
    expect(lastConfig()?.auto_select).toBe(false);
  });

  it('turns a Google pick into the hinted Auth0 login', async () => {
    const { gis, respond } = installFakeGis();
    renderForm();
    await waitFor(() => expect(gis.initialize).toHaveBeenCalled());

    act(() => respond(fakeCredential('ada@gmail.com', CLIENT_ID)));
    expect(auth.signInWithGoogleHint).toHaveBeenCalledWith('ada@gmail.com');
    expect(gis.cancel).toHaveBeenCalled();
    expect(screen.getByText('Redirecting…')).toBeInTheDocument();

    // A second answer (One Tap and the button both firing) is ignored.
    act(() => respond(fakeCredential('ada@gmail.com', CLIENT_ID)));
    expect(auth.signInWithGoogleHint).toHaveBeenCalledOnce();
  });

  it('uses the plain Google login when the credential is unreadable', async () => {
    const { gis, respond } = installFakeGis();
    renderForm();
    await waitFor(() => expect(gis.initialize).toHaveBeenCalled());

    act(() => respond('not-a-token'));
    expect(auth.signInWithGoogleHint).not.toHaveBeenCalled();
    expect(auth.signInWithProvider).toHaveBeenCalledWith('google');
  });

  it('does not follow an automatic pick that comes straight back', async () => {
    sessionStorage.setItem('musicAtlas:googleLastAutoAt', String(Date.now()));
    const { gis, respond, lastConfig } = installFakeGis();
    renderForm();
    await waitFor(() => expect(gis.initialize).toHaveBeenCalled());
    expect(lastConfig()?.auto_select).toBe(false);

    act(() => respond(fakeCredential('ada@gmail.com', CLIENT_ID), 'auto'));
    expect(auth.signInWithGoogleHint).not.toHaveBeenCalled();
    expect(
      screen.getByText(/automatic sign-in didn’t finish/i),
    ).toBeInTheDocument();
  });

  it('stays off while Auth0 is signed in but the profile failed', () => {
    auth.isAuth0Authenticated = true;
    installFakeGis();
    renderForm();
    expect(
      screen.getByRole('button', { name: /continue with google/i }),
    ).toBeInTheDocument();
    expect(window.google?.accounts?.id?.initialize).not.toHaveBeenCalled();
  });
});

describe('errors', () => {
  it('shows the auth error as an alert', () => {
    cfg.enabled = false;
    auth.error = 'Login attempt failed. Please try again.';
    renderForm();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Login attempt failed. Please try again.',
    );
    // Not after a click here, so no failure chord.
    expect(playFailure).not.toHaveBeenCalled();
  });
});
