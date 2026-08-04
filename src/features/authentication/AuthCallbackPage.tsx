import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorBox } from '@/components/ErrorBox';
import { FullScreenLoading } from '@/components/FullScreenLoading';
import { Button } from '@/components/ui/button';
import { AuthRoutes } from '@/constants/routes';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';

// If the exchange + bootstrap hasn't resolved (and hasn't errored) by this point,
// treat it as stuck rather than showing an indefinite spinner.
const LOADING_TIMEOUT_MS = 15_000;

/**
 * OAuth callback landing (`/auth/callback`). The Auth0 SDK performs the code/state
 * exchange in main.tsx; on success it rewrites the URL and this route never sticks.
 * This component only renders when something went wrong or is still in flight, so it
 * must surface the real failure instead of spinning forever:
 *   - Auth0 authorize errors arrive as `?error=` URL params.
 *   - Token-exchange failures (e.g. "Invalid state"/stale transaction, consumed code)
 *     land in `useAuth0().error` — NOT the URL.
 *   - Post-exchange backend failures (`/auth/session`, `/auth/me`) land in the app
 *     auth context `error`.
 * Any of these gives the user a message plus a way out.
 */
export const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const { error: auth0Error, loginWithRedirect } = useAuth0();
  const { error: contextError } = useAuthContext();

  const params = new URLSearchParams(window.location.search);
  const urlError = params.get('error');
  const urlErrorDescription = params.get('error_description');

  const [timedOut, setTimedOut] = useState(false);

  const hasError = Boolean(urlError || auth0Error || contextError);

  // Start a watchdog while we're still (apparently) loading with no error yet.
  useEffect(() => {
    if (hasError) return;
    const id = window.setTimeout(() => setTimedOut(true), LOADING_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [hasError]);

  const message = urlError
    ? `Auth0 callback failed: ${urlErrorDescription || urlError}`
    : auth0Error
      ? `Sign-in failed: ${auth0Error.message}`
      : contextError
        ? `Sign-in failed: ${contextError}`
        : timedOut
          ? 'Signing you in is taking longer than expected. Your session may have expired or the connection was interrupted.'
          : null;

  if (message) {
    // Restarting login mints a fresh Auth0 transaction (new state/PKCE), which
    // clears the common "Invalid state"/stale-cookie failure on its own.
    const retry = () => {
      void loginWithRedirect();
    };

    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 p-6">
        <ErrorBox message={message} />
        <div className="flex flex-col gap-2">
          <Button
            className="w-full bg-[#4d3a49] text-white hover:bg-[#5c4657]"
            onClick={retry}
            type="button"
          >
            Try signing in again
          </Button>
          <Button
            className="w-full border-0 bg-[#3a3535] text-white hover:bg-[#726969]"
            onClick={() => navigate(AuthRoutes.signIn())}
            type="button"
            variant="outline"
          >
            Back to sign-in
          </Button>
        </div>
      </div>
    );
  }

  // Auth0 React SDK handles code/state exchange; keep this route passive while loading.
  return <FullScreenLoading />;
};
