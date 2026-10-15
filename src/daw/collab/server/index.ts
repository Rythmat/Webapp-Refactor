// ── Collab worker entry ───────────────────────────────────────────────────
// The `music-atlas-collab` Cloudflare Worker (wrangler.jsonc). Each party is a
// PartyServer Durable Object, served by routePartykitRequest at
// /parties/<party>/<room> where <party> is its kebab-cased binding name:
//
//   Main             → /parties/main/<room>                studio + jam rooms
//   ClassroomSession → /parties/classroom-session/<id>     classroom sessions
//
// This replaced the managed PartyKit deploy. Clients connect to the same URLs
// as before; only the host changed (VITE_PARTYKIT_HOST / the API's
// PARTYKIT_HOST).

import { routePartykitRequest } from 'partyserver';

import './env';

export { default as CollabServer } from './party';
export { default as ClassroomSessionServer } from './classroom_session/party';

// PartyKit named the classroom party `classroom_session`, and the web app and
// the API still address /parties/classroom_session/…. routePartykitRequest
// turns a binding name's underscores into hyphens, so point those requests at
// the party's path now.
const LEGACY_CLASSROOM_PATH = '/parties/classroom_session/';
const CLASSROOM_PATH = '/parties/classroom-session/';

function withCurrentPartyPath(request: Request): Request {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(LEGACY_CLASSROOM_PATH)) return request;
  url.pathname =
    CLASSROOM_PATH + url.pathname.slice(LEGACY_CLASSROOM_PATH.length);
  return new Request(url, request);
}

export default {
  async fetch(request, env) {
    return (
      (await routePartykitRequest(withCurrentPartyPath(request), env)) ??
      new Response('Not Found', { status: 404 })
    );
  },
} satisfies ExportedHandler<Cloudflare.Env>;
