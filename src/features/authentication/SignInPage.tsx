import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  hasGoogleHint,
  readGoogleHint,
  stripGoogleHint,
} from '@/auth/google/hintHandoff';
import { useAuthContext } from '@/contexts/AuthContext';
import { AuthStatus } from '@/layouts/AuthLayout/AuthStatus';
import { SignInForm } from './components/SignInForm';

/**
 * `/auth/sign-in`. Normally the sign-in form; when a marketing page's One Tap
 * handed the visitor over (`#google_hint=…`, see hintHandoff), it goes
 * straight on to Auth0's Google login instead, showing only "Signing you in…".
 */
export const SignInPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuth0Loading, isAuth0Authenticated, signInWithGoogleHint, error } =
    useAuthContext();

  const [hint] = useState(() => readGoogleHint(location.hash));
  const [redirecting, setRedirecting] = useState(hint !== null);
  const startedRef = useRef(false);

  // Take the email out of the address bar and history straight away.
  useEffect(() => {
    if (!hasGoogleHint(location.hash)) return;
    navigate(
      {
        pathname: location.pathname,
        search: location.search,
        hash: stripGoogleHint(location.hash),
      },
      { replace: true },
    );
  }, [location.hash, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!hint || startedRef.current || isAuth0Loading) return;
    startedRef.current = true;
    if (isAuth0Authenticated) {
      // Already signed in on this host: the auth context sends them home.
      setRedirecting(false);
      return;
    }
    void signInWithGoogleHint(hint.email);
  }, [hint, isAuth0Authenticated, isAuth0Loading, signInWithGoogleHint]);

  // Back from Google (page restored from bfcache) or the attempt failed: show the form.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setRedirecting(false);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  useEffect(() => {
    if (error) setRedirecting(false);
  }, [error]);

  return redirecting ? (
    <AuthStatus overlay label="Signing you in…" />
  ) : (
    <SignInForm />
  );
};
