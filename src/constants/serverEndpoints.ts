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
 * Flip a flag to `true` in the same change that ships its endpoint — never
 * before, and never as a batch. Every flag below is listed against its routes
 * in `docs/classroom-v2/CONTRACT-DELTAS.md`; the two files are kept in lockstep
 * by `serverEndpoints.test.ts`, so adding a flag here without a matching row
 * there (or vice versa) fails the unit suite.
 *
 * A missing route costs ONE request, not four: a 4xx is never retried, and the
 * client treats any error from these calls as "capability absent" and degrades
 * to a visibly-badged local path rather than a silent one.
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

// ─── P1 · Ownership and roles ────────────────────────────────────────────────

/**
 * `GET`/`POST`/`PATCH`/`DELETE /classrooms/:id/teachers`, and `myRole` on
 * `GET /classrooms` + `GET /classrooms/:id`.
 *
 * The co-teacher CRUD is already generated from swagger and has zero call
 * sites; what is missing is `myRole` and the inclusion of co-taught classrooms
 * in the list. Without those a co-teacher cannot see the class they were added
 * to, so the client keeps deriving ownership locally until this flips.
 */
export const SERVER_CLASSROOM_TEACHERS_ENABLED = false;

// ─── P3 · Embedded and linked ────────────────────────────────────────────────

/**
 * `GET /link-preview?url=`
 *
 * Title, favicon and image for an external link card. Optional by design — the
 * client degrades to a hostname label plus a local known-host icon, which is
 * why external link cards never block on the network.
 */
export const SERVER_LINK_PREVIEW_ENABLED = false;

// ─── P4 · Editor ─────────────────────────────────────────────────────────────

/**
 * `POST /classrooms/:id/assets` → `{assetId, signedUploadUrl, maxUploadBytes}`,
 * `POST .../assets/:assetId/finalize`, `GET .../assets/:assetId/url`.
 *
 * Image upload for the Picture element, mirroring the shipped studio-assets
 * three-step flow. The signed GET must be readable by active enrollments.
 */
export const SERVER_ASSETS_ENABLED = false;

// ─── P5 · Published days and live sessions ───────────────────────────────────

/**
 * `GET /classrooms/:id/published-days/:publishedDayId` and
 * `GET /classrooms/:id/published-days?sourceRef=`
 *
 * The most load-bearing row in the whole contract. Publish is currently
 * WRITE-ONLY, so a published deck is readable only in the authoring teacher's
 * browser and every assignment and session points at an id no student can
 * resolve. The list form is what makes republish idempotent — without it the
 * client accumulates duplicate published days for one source Day.
 */
export const SERVER_PUBLISHED_DAYS_ENABLED = false;

/**
 * `PATCH /classrooms/:id/sessions/:sessionId` (widened state union) and
 * `POST /classrooms/:id/sessions/:sessionId/heartbeat`.
 *
 * The client already sends the full `{mode, phase, interactionIndex, locked,
 * share, slideIndex, pairs, showcase, timer, media}` state and the party
 * already routes it; only the REST contract and its persistence into the
 * `hello` snapshot are missing. The heartbeat is what expires a session whose
 * teacher simply closed the tab, instead of leaving it live forever.
 */
export const SERVER_SESSION_STATE_V2_ENABLED = false;

/**
 * `GET /classrooms/:id/sessions/:sessionId/responses` and
 * `GET`/`POST /classrooms/:id/sessions/:sessionId/positions`.
 *
 * Backfill and restore after a reload. The projector role must receive
 * server-stripped anonymous rows salted with the SAME salt as the party's
 * `stripForProjector`, or a projector reload double-counts every reveal.
 */
export const SERVER_RESPONSE_BACKFILL_ENABLED = false;

/**
 * `POST /sessions/join {code}` → `{classroomId, sessionId}`
 *
 * Join-by-code. The server session already carries `code`; nothing can consume
 * it today, so the printed/projected join code is decorative until this ships.
 */
export const SERVER_SESSION_JOIN_ENABLED = false;

/**
 * `POST /classrooms/:id/sessions/:sessionId/projector-token`
 *
 * A short-lived projector credential so a podium display can join without
 * signing a teacher's account into a shared machine.
 */
export const SERVER_PROJECTOR_TOKEN_ENABLED = false;

// ─── P6 · Assignments ────────────────────────────────────────────────────────

/**
 * `POST` and `GET /classrooms/:id/assignments/:assignmentId/responses`, plus
 * `GET /classrooms/:id/enrollments/me`.
 *
 * Async answers off the live-session path, and the signed-in student's own
 * enrollment id (today the client keeps a local one, which cannot be trusted
 * across devices).
 */
export const SERVER_ASSIGNMENT_RESPONSES_ENABLED = false;

/**
 * `POST`/`PATCH /classrooms/:id/assignments` with `targets`, and
 * `GET /classrooms/:id/assignments/:assignmentId/progress`.
 *
 * Targeting MUST be enforced server-side. Filtering client-side leaks the
 * existence of an assignment to the students it was not assigned to.
 */
export const SERVER_ASSIGNMENT_TARGETS_ENABLED = false;

// ─── P7 · Grades, attendance and progress ────────────────────────────────────

/**
 * `PATCH /classrooms/:id/assignments/:assignmentId/progress` (score, maxPoints,
 * rubric, feedback), `GET /classrooms/:id/gradebook`, and
 * `POST /classrooms/:id/sessions/:sessionId/grades`.
 *
 * Every field this adds is teacher-only and is already named in
 * `FORBIDDEN_KEYS` (publishDay.ts) so it can never ride a published snapshot.
 */
export const SERVER_GRADEBOOK_ENABLED = false;

/**
 * `GET /classrooms/:id/sessions/:sessionId/attendance`
 *
 * Attendance derived from join and presence events. Depends on the presence
 * side-map landing first (P0 task 7).
 */
export const SERVER_ATTENDANCE_ENABLED = false;

/**
 * `GET /classrooms/:id/progress`
 *
 * Classroom-scoped per-student mastery.
 */
export const SERVER_CLASSROOM_PROGRESS_ENABLED = false;

// ─── P9 · Stream, classwork and class metadata ───────────────────────────────

/**
 * `GET`/`POST`/`PATCH`/`DELETE /classrooms/:id/topics`
 *
 * Classwork topics — the grouping layer above assignments.
 */
export const SERVER_CLASSROOM_TOPICS_ENABLED = false;

/**
 * `PATCH /classrooms/:id` (section, subject, room, period, theme) and
 * `POST /classrooms/:id/duplicate`.
 */
export const SERVER_CLASSROOM_METADATA_ENABLED = false;

/**
 * `POST /classrooms/:id/invitations`
 *
 * Pending co-teacher invites by email. NOTE: the client currently POSTs to this
 * route even though it does not exist, which is why the invite dialog always
 * fails — P1 moves the dialog onto `/classrooms/:id/teachers` and this flag
 * covers only the genuinely-pending-invite case.
 */
export const SERVER_CLASSROOM_INVITATIONS_ENABLED = false;

// ─── P10 · Remote curriculum storage ─────────────────────────────────────────

/**
 * `GET`/`PUT /classrooms/:id/plan`, `GET`/`PUT /teachers/me/warehouse`,
 * `GET`/`PUT /classrooms/:id/settings`, and `GET`/`POST`/`PATCH`
 * `/teachers/me/rubrics`.
 *
 * The versioned curriculum blob and the teacher's personal warehouse. This is
 * the flag the P1 `CurriculumRepository` seam exists for: flipping it swaps the
 * local adapter for the remote one with no call-site changes.
 */
export const SERVER_CURRICULUM_ENABLED = false;
