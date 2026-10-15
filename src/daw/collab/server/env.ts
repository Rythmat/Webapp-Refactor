// ── Collab worker environment ─────────────────────────────────────────────
// Bindings and variables of the `music-atlas-collab` worker (wrangler.jsonc).
// Declared on Cloudflare.Env — what `wrangler types` would generate — so
// partyserver's `this.env` is typed in every party.

/**
 * The worker's variables. All are set with `wrangler secret put` (none are
 * committed), and every reader treats a missing one as "not configured".
 */
export interface CollabVars {
  /** Must match the web app's VITE_AUTH0_DOMAIN (see auth.ts). */
  AUTH0_DOMAIN?: string;
  /** Must match the web app's VITE_AUTH0_AUDIENCE (see auth.ts). */
  AUTH0_AUDIENCE?: string;
  /** The Music Atlas API base URL, for room tracking and classroom auth. */
  MUSIC_ATLAS_API_URL?: string;
  /** Shared with the API: gates server-to-server calls in both directions. */
  PARTYKIT_WEBHOOK_SECRET?: string;
  /** DEV ONLY — local `wrangler dev` sign-in (see auth.ts). Never deploy it. */
  PARTYKIT_DEV_AUTH?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cloudflare {
    interface Env extends CollabVars {
      /** Studio and jam rooms: the `main` party, /parties/main/<room>. */
      Main: DurableObjectNamespace;
      /** Classroom sessions: /parties/classroom-session/<sessionId>. */
      ClassroomSession: DurableObjectNamespace;
    }
  }
}
