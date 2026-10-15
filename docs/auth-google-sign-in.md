# Google sign-in (One Tap + "Sign in with Google")

How Google One Tap and the official Google button are wired, and the Google
Cloud + Auth0 setup needed before turning them on in production.

## How it works

- **Where it shows.** One Tap prompts signed-out visitors on the landing page
  and every marketing page (`LandingShell` → `GoogleOneTap`), and on
  `/auth/sign-in`. The sign-in page also always shows the official "Continue
  with Google" button, plus "Continue with email" and "Create an account" for
  email/password accounts.
- **What a Google pick does.** GIS returns a Google ID token. We never trust or
  send it anywhere; we only read the email from it and start Auth0's
  `google-oauth2` login with that email as `login_hint`
  (`AuthContext.signInWithGoogleHint`). Auth0 still runs the real Google
  sign-in, so tokens, `/auth/callback`, the backend session and the collab
  server are unchanged.
- **From musicatlas.io.** The marketing host has no sign-in (sign-in state is
  per origin), so a pick there redirects to
  `https://app.musicatlas.io/auth/sign-in#google_hint=<email>&t=<ms>`, and that
  page continues to Auth0 at once. The fragment keeps the email out of server
  logs and Referer headers; the page strips it from history, and hints older
  than 2 minutes are ignored (`src/auth/google/hintHandoff.ts`).
- **Auto sign-in.** The sign-in page lets GIS auto-select a returning user's
  account. Marketing pages never auto-select. Signing out sets a flag that keeps
  auto-select off until the next explicit Google sign-in, and quiets the
  marketing prompt for the rest of the tab session
  (`src/auth/google/autoSelect.ts`).
- **When GIS is off.** With no `VITE_GOOGLE_CLIENT_ID`, on an origin that isn't
  allowlisted in `src/auth/google/config.ts` (Vercel previews, other dev
  ports), under `VITE_DEV_AUTH_BYPASS`, or when Google's script is blocked or
  times out, there is no One Tap, and the sign-in page shows our own
  brand-compliant Google button, which goes straight to Auth0's Google login.
- **Kill switch.** `ONE_TAP_ON_MARKETING` in `src/auth/google/config.ts` turns
  off the marketing-page prompt; the sign-in page is unaffected.

## Known limitations

- **Workspace and school accounts see Google's account chooser.** Auth0's
  Google social connection forwards `login_hint` only for `@gmail.com`
  addresses (by design, to block an account-takeover route), so those users
  pick their account once more after One Tap. Gmail users go straight through.
  Removing the extra step would mean swapping `signInWithGoogleHint` for Auth0
  Custom Token Exchange (`loginWithCustomTokenExchange`; B2C Professional plan
  or above, plus an Auth0 Action that verifies the Google token). The UI
  wouldn't change.
- **Duplicate accounts.** Someone with an email/password account who picks
  Google gets a separate `google-oauth2|…` Auth0 user, as with the Google
  button before. One Tap makes this more likely. Decide on Auth0 account
  linking before relying on the marketing prompt.
- **FedCM.** One Tap runs through the browser's FedCM API. Chrome shows it;
  Safari and Firefox may show nothing, and the button still works there. Brave
  can hang the prompt; "Trouble with Google? Try another way" goes to Auth0's
  Google login directly.

## Setup checklist

### Google Cloud (Google Auth Platform)

1. Use **one project and one Web OAuth client** for both GIS and Auth0's
   `google-oauth2` connection. Consent given in One Tap then carries over, so
   the hinted Auth0 redirect doesn't show a consent screen.
2. Branding: app name "Music Atlas", a generic support address (not a
   personal one), the logo, home page `https://musicatlas.io`, privacy policy
   `https://musicatlas.io/documents/privacy`, terms
   `https://musicatlas.io/documents/terms`, authorised domain `musicatlas.io`.
3. Scopes: `openid`, `email`, `profile` only. Publish the app to production
   and complete brand verification.
4. Web client:
   - Authorised JavaScript origins: `https://musicatlas.io`,
     `https://www.musicatlas.io`, `https://app.musicatlas.io`,
     `http://localhost`, `http://localhost:5179`.
   - Authorised redirect URI: `https://<auth0-tenant>.us.auth0.com/login/callback`.
5. Put the client ID in Vercel (**Production** only) and in `.env.local` as
   `VITE_GOOGLE_CLIENT_ID`. The client secret goes only into Auth0.
6. Schools on Google Workspace for Education may need to allowlist the client
   ID for under-18 users (Admin console → Security → API controls).

### Auth0

1. Authentication → Social → `google-oauth2`: replace Auth0's developer keys
   with the client ID and secret above. Existing users keep their IDs (Google's
   `sub` is per Google account, not per client).
2. Check the connection is enabled for the SPA application.
3. Test with a Gmail account that the account chooser is skipped after One Tap.
4. No new callback, logout or web-origin URLs are needed: the marketing host
   never talks to Auth0.

The tenant domain starts with `dev-`; confirm that's the one meant for
production. Brand verification may also push towards an Auth0 custom domain
(for example `login.musicatlas.io`), which would change `VITE_AUTH0_DOMAIN`
and the redirect URI above.

## Verifying

- Unit tests: `npx vitest run src/auth/google src/features/authentication`.
- Locally on `localhost:5179` with a real client ID, in Chrome: landing page →
  One Tap → Auth0 → back to `/home`. Sign out → the landing page doesn't
  prompt, and `/auth/sign-in` prompts without auto-selecting.
