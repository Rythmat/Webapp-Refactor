/**
 * Flags for API endpoints the client is written against but the server does not
 * register yet.
 *
 * Polling a route that does not exist is not free. Each hook below fans out ONE
 * request per classroom, so a student in three classes was issuing six requests
 * a minute that could only ever 404 — and every 404 also wrote a row into
 * `telemetry_event` via the backend error middleware.
 *
 * The client already treats any error from these calls as "nothing live"
 * (`.catch(() => [])`), so disabling the network call is behaviourally
 * identical to what users see today. The local session store used by the
 * offline classroom demo is unaffected and still drives the banner.
 *
 * Flip a flag to `true` in the same change that ships its endpoint.
 */

/**
 * `GET /classrooms/:id/sessions?status=live`
 *
 * Not registered — `classroom-v2.ts` has `POST /:id/sessions` and
 * `GET /:id/sessions/:sessionId`, but no list route.
 *
 * When this is wanted, prefer folding a `liveSessionId` into the existing
 * `GET /classrooms` payload the client already fetches: that costs zero extra
 * requests, where re-enabling this poll costs one per classroom per 20-30s.
 */
export const SERVER_LIVE_SESSIONS_ENABLED = false;

/**
 * `GET /classrooms/:id/announcements`
 *
 * Not registered — there is no `announcements` route anywhere in the API.
 */
export const SERVER_CLASSROOM_ANNOUNCEMENTS_ENABLED = false;
