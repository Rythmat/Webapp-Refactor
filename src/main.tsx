import { Auth0Provider } from '@auth0/auth0-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary.tsx';
import './index.css';
import { Env } from './constants/env';

const renderStartupError = (message: string) => {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  rootElement.innerHTML = `
    <div style="min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;background:#111;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
      <div style="max-width:680px;width:100%;border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:20px;background:rgba(255,255,255,.04);">
        <h1 style="margin:0 0 10px;font-size:20px;">Startup Configuration Error</h1>
        <p style="margin:0 0 8px;opacity:.88;">The app could not start because required environment variables are missing or invalid.</p>
        <pre style="margin:0;white-space:pre-wrap;opacity:.95;">${message}</pre>
      </div>
    </div>
  `;
};

const readAuth0Config = () => {
  return {
    audience: Env.get('VITE_AUTH0_AUDIENCE'),
    redirectUri:
      Env.get('VITE_AUTH0_REDIRECT_URI', { nullable: true }) ||
      window.location.origin,
    domain: Env.get('VITE_AUTH0_DOMAIN'),
    clientId: Env.get('VITE_AUTH0_CLIENT_ID'),
  };
};

let auth0Config: ReturnType<typeof readAuth0Config>;
try {
  auth0Config = readAuth0Config();
} catch (caught) {
  const message =
    caught instanceof Error ? caught.message : 'Unknown startup error';
  renderStartupError(message);
  throw caught;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <Auth0Provider
        domain={auth0Config.domain}
        clientId={auth0Config.clientId}
        authorizationParams={{
          redirect_uri: auth0Config.redirectUri,
          audience: auth0Config.audience,
        }}
        onRedirectCallback={(appState) => {
          sessionStorage.setItem('auth0:interactive-login-callback', '1');
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
