import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  isAutoSelection,
  isGoogleAutoSelectSuppressed,
  markAutoAttempt,
  shouldBlockAutoRetry,
} from '@/auth/google/autoSelect';
import {
  GOOGLE_CLIENT_ID,
  isGoogleIdentityEnabled,
} from '@/auth/google/config';
import { emailFromCredential } from '@/auth/google/credential';
import { cancelOneTap, type GisCredentialResponse } from '@/auth/google/gis';
import { useGoogleIdentity } from '@/auth/google/useGoogleIdentity';
import { cn } from '@/components/utilities';
import { FailureProgression } from '@/constants/musicalConstants';
import { LegalRoutes } from '@/constants/routes';
import { useAuthContext } from '@/contexts/AuthContext';
import { useMusicalForm } from '@/hooks/useMusicalForm';
import { AuthAlert } from '@/layouts/AuthLayout/AuthAlert';
import {
  AUTH_GHOST_BUTTON,
  AUTH_TEXT_LINK,
} from '@/layouts/AuthLayout/authStyles';
import { GoogleSignInButton } from './GoogleSignInButton';

type Pending = 'google' | 'email' | 'signup';

/**
 * The sign-in page: Google first (One Tap prompts on arrival and signs a
 * returning user straight in; the official button is always there, since One
 * Tap can be dismissed or turned off), then email/password and sign-up on
 * Auth0's page for accounts that aren't Google.
 *
 * A Google pick never signs in by itself: its email goes to Auth0's Google
 * login as `login_hint` (see signInWithGoogleHint), so every sign-in still
 * ends at /auth/callback with Auth0 tokens.
 */
export const SignInForm = () => {
  const {
    signInWithEmailAndPassword,
    signInWithProvider,
    signInWithGoogleHint,
    signUp,
    error,
    isAuth0Authenticated,
  } = useAuthContext();

  const [pending, setPending] = useState<Pending | null>(null);
  /** An automatic pick arrived too soon after the last one, so it wasn't followed. */
  const [autoRetryStopped, setAutoRetryStopped] = useState(false);
  const [autoSelectAllowed] = useState(
    () => !isGoogleAutoSelectSuppressed() && !shouldBlockAutoRetry(),
  );
  /** One credential at a time (One Tap and the button can both answer). */
  const handledRef = useRef(false);
  /** Only play the failure chord for errors that follow a click here. */
  const actedRef = useRef(false);

  const { playFailureProgression } = useMusicalForm({
    failureProgression: FailureProgression,
  });
  const playFailureRef = useRef(playFailureProgression);
  useEffect(() => {
    playFailureRef.current = playFailureProgression;
  });

  const onCredential = useCallback(
    (response: GisCredentialResponse) => {
      if (handledRef.current) return;
      if (isAutoSelection(response.select_by)) {
        if (shouldBlockAutoRetry()) {
          setAutoRetryStopped(true);
          return;
        }
        markAutoAttempt();
      }
      handledRef.current = true;
      actedRef.current = true;
      cancelOneTap();
      setPending('google');
      const email = emailFromCredential(response.credential, GOOGLE_CLIENT_ID);
      void (email ? signInWithGoogleHint(email) : signInWithProvider('google'));
    },
    [signInWithGoogleHint, signInWithProvider],
  );

  const status = useGoogleIdentity({
    // Signed in to Auth0 but the profile failed to load: no auto-select loop.
    enabled: isGoogleIdentityEnabled() && !isAuth0Authenticated,
    load: 'now',
    oneTap: !pending,
    promptDelayMs: 150,
    autoSelect: autoSelectAllowed && !autoRetryStopped && !error,
    context: 'signin',
    itpSupport: true,
    cancelOnTapOutside: false,
    onCredential,
  });

  // Back from Auth0/Google via the back button (page restored from bfcache),
  // or the attempt failed: let the user choose again.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      setPending(null);
      handledRef.current = false;
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  useEffect(() => {
    if (!error) return;
    setPending(null);
    handledRef.current = false;
    if (actedRef.current) playFailureRef.current();
  }, [error]);

  const start = (kind: Pending, action: () => Promise<void>) => {
    actedRef.current = true;
    setPending(kind);
    void action();
  };

  const onGoogleFallback = () =>
    start('google', () => signInWithProvider('google'));
  const onEmail = () =>
    // The arguments are unused: Auth0's page collects the credentials.
    start('email', () => signInWithEmailAndPassword('', ''));
  const onSignUp = () => start('signup', signUp);

  const message = pending
    ? 'Redirecting…'
    : autoRetryStopped
      ? 'Automatic sign-in didn’t finish. Choose an option above.'
      : '';

  return (
    <div className="flex animate-fade-in-bottom flex-col items-center px-2 py-2 text-center sm:px-4 sm:py-4">
      <h1 className="text-4xl font-normal leading-none tracking-[-0.03em] text-white sm:text-5xl">
        Music Atlas
      </h1>
      <p className="mt-3 text-base text-white/55">
        Sign in or create your free account.
      </p>

      <div className="mt-8 flex w-full max-w-[400px] flex-col items-center gap-3">
        <GoogleSignInButton
          status={status}
          disabled={Boolean(pending)}
          onFallbackClick={onGoogleFallback}
          onGisClick={cancelOneTap}
        />

        <div
          aria-hidden
          className="flex w-full items-center gap-3 text-xs uppercase tracking-[0.14em] text-white/35"
        >
          <span className="h-px flex-1 bg-white/[0.08]" />
          or
          <span className="h-px flex-1 bg-white/[0.08]" />
        </div>

        <button
          type="button"
          className={AUTH_GHOST_BUTTON}
          disabled={Boolean(pending)}
          onClick={onEmail}
        >
          Continue with email
        </button>

        <p className="mt-1 text-sm text-white/55">
          New to Music Atlas?{' '}
          <button
            type="button"
            className={AUTH_TEXT_LINK}
            disabled={Boolean(pending)}
            onClick={onSignUp}
          >
            Create an account
          </button>
        </p>
      </div>

      <p aria-live="polite" className="mt-4 min-h-5 text-sm text-white/55">
        {message}
      </p>

      {error && (
        <AuthAlert className="mt-2 w-full max-w-[400px]">{error}</AuthAlert>
      )}

      {status === 'ready' && (
        <button
          type="button"
          className={cn(AUTH_TEXT_LINK, 'mt-3 text-xs text-white/55')}
          disabled={Boolean(pending)}
          onClick={onGoogleFallback}
        >
          Trouble with Google? Try another way
        </button>
      )}

      <p className="mt-8 max-w-[340px] text-xs leading-relaxed text-white/40">
        By continuing, you agree to our{' '}
        <Link className={AUTH_TEXT_LINK} to={LegalRoutes.termsOfService()}>
          Terms
        </Link>{' '}
        and{' '}
        <Link className={AUTH_TEXT_LINK} to={LegalRoutes.privacyPolicy()}>
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
};
