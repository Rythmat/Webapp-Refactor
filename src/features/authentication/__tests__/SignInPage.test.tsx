// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignInPage } from '../SignInPage';

/**
 * A One Tap pick handed over from musicatlas.io (`#google_hint=…`) goes
 * straight on to Auth0's Google login, once, and leaves no email in the URL.
 */

const auth = vi.hoisted(() => ({
  error: null as string | null,
  isAuth0Loading: false,
  isAuth0Authenticated: false,
  signInWithGoogleHint: vi.fn(async () => {}),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuthContext: () => auth }));
vi.mock('../components/SignInForm', () => ({
  SignInForm: () => <div data-testid="sign-in-form" />,
}));

const HashProbe = () => <span data-testid="hash">{useLocation().hash}</span>;

const renderAt = (entry: string) =>
  render(
    <StrictMode>
      <MemoryRouter initialEntries={[entry]}>
        <SignInPage />
        <HashProbe />
      </MemoryRouter>
    </StrictMode>,
  );

const hintFor = (email: string, t = Date.now()) =>
  `/auth/sign-in#google_hint=${encodeURIComponent(email)}&t=${t}`;

beforeEach(() => {
  auth.error = null;
  auth.isAuth0Loading = false;
  auth.isAuth0Authenticated = false;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SignInPage', () => {
  it('shows the form without a hint', () => {
    renderAt('/auth/sign-in?continue=%2Fstudio');
    expect(screen.getByTestId('sign-in-form')).toBeInTheDocument();
    expect(auth.signInWithGoogleHint).not.toHaveBeenCalled();
  });

  it('continues a fresh hint to Google once and strips it from the URL', () => {
    renderAt(hintFor('a+b@gmail.com'));
    expect(screen.getByRole('status')).toHaveTextContent('Signing you in…');
    expect(screen.queryByTestId('sign-in-form')).toBeNull();
    expect(auth.signInWithGoogleHint).toHaveBeenCalledOnce();
    expect(auth.signInWithGoogleHint).toHaveBeenCalledWith('a+b@gmail.com');
    expect(screen.getByTestId('hash').textContent).toBe('');
  });

  it('ignores a stale hint (but still strips it)', () => {
    renderAt(hintFor('ada@gmail.com', Date.now() - 10 * 60_000));
    expect(screen.getByTestId('sign-in-form')).toBeInTheDocument();
    expect(auth.signInWithGoogleHint).not.toHaveBeenCalled();
    expect(screen.getByTestId('hash').textContent).toBe('');
  });

  it('does not restart sign-in for someone already signed in', () => {
    auth.isAuth0Authenticated = true;
    renderAt(hintFor('ada@gmail.com'));
    expect(auth.signInWithGoogleHint).not.toHaveBeenCalled();
    expect(screen.getByTestId('sign-in-form')).toBeInTheDocument();
  });

  it('falls back to the form when the attempt errors', () => {
    auth.error = 'Google sign-in failed. Please try again.';
    renderAt(hintFor('ada@gmail.com'));
    expect(screen.getByTestId('sign-in-form')).toBeInTheDocument();
  });
});
