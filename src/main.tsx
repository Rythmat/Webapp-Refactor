import { Auth0Provider } from '@auth0/auth0-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary.tsx';
import './index.css';
import { Env } from './constants/env';

const { App } = await import('./App.tsx');

const auth0Audience = Env.get('VITE_AUTH0_AUDIENCE');
const auth0RedirectUri =
  Env.get('VITE_AUTH0_REDIRECT_URI', { nullable: true }) ||
  window.location.origin;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <Auth0Provider
        domain={Env.get('VITE_AUTH0_DOMAIN')}
        clientId={Env.get('VITE_AUTH0_CLIENT_ID')}
        authorizationParams={{
          redirect_uri: auth0RedirectUri,
          audience: auth0Audience,
        }}
        onRedirectCallback={(appState) => {
          const returnTo = appState?.returnTo || '/';
          window.history.replaceState({}, '', returnTo);
          window.location.replace(returnTo);
        }}
      >
        <App />
      </Auth0Provider>
    </GlobalErrorBoundary>
  </StrictMode>,
);
