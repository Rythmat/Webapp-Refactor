import { useCallback, useRef, useState } from 'react';
import { isOneTapQuiet } from '@/auth/google/autoSelect';
import {
  GOOGLE_CLIENT_ID,
  isGoogleIdentityEnabled,
  ONE_TAP_ON_MARKETING,
} from '@/auth/google/config';
import { emailFromCredential } from '@/auth/google/credential';
import type { GisCredentialResponse } from '@/auth/google/gis';
import { buildGoogleHintHandoffUrl } from '@/auth/google/hintHandoff';
import { redirectTo } from '@/auth/google/redirect';
import { useGoogleIdentity } from '@/auth/google/useGoogleIdentity';
import { isMarketingHost } from '@/constants/hosts';
import { AuthRoutes, ProfileRoutes } from '@/constants/routes';
import { useAuthContext } from '@/contexts/AuthContext';

/**
 * Google One Tap on the landing and marketing pages, for signed-out visitors
 * (renders nothing). It never auto-selects here, so nobody reading a page is
 * pulled into the app without tapping, and it loads GIS only once the page is
 * idle, so the page's load speed is unaffected.
 *
 * A tap starts the Auth0 Google login with the picked email as `login_hint`.
 * On musicatlas.io, which has no sign-in, it first hands over to the app
 * host's sign-in page (see hintHandoff).
 */
export const GoogleOneTap = () => {
  const {
    isBootstrapLoading,
    isAuth0Authenticated,
    appUser,
    signInWithGoogleHint,
  } = useAuthContext();
  // Quiet for the rest of the tab session after signing out.
  const [quiet] = useState(() => isOneTapQuiet());
  const handledRef = useRef(false);

  const onCredential = useCallback(
    (response: GisCredentialResponse) => {
      if (handledRef.current) return;
      handledRef.current = true;
      const email = emailFromCredential(response.credential, GOOGLE_CLIENT_ID);
      if (isMarketingHost()) {
        redirectTo(buildGoogleHintHandoffUrl(email));
        return;
      }
      if (email) {
        // Not back to this marketing page: on to the app.
        void signInWithGoogleHint(email, { returnTo: ProfileRoutes.root() });
      } else {
        redirectTo(AuthRoutes.signIn());
      }
    },
    [signInWithGoogleHint],
  );

  useGoogleIdentity({
    enabled:
      ONE_TAP_ON_MARKETING &&
      isGoogleIdentityEnabled() &&
      !isBootstrapLoading &&
      !isAuth0Authenticated &&
      !appUser &&
      !quiet,
    load: 'idle',
    oneTap: true,
    promptDelayMs: 1500,
    autoSelect: false,
    context: 'signin',
    itpSupport: false,
    cancelOnTapOutside: true,
    onCredential,
  });

  return null;
};
