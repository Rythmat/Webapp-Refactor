# Classroom v2 — Backend Implementation Brief

**Audience**: the platform team (Ryan) building the server-side of Classroom
v2. The client-side of every phase lands in this repo (Webapp-Refactor) against
the contract documented here.

**Companion documents**

- [`openapi.yaml`](./openapi.yaml) — REST contract (source of truth for
  request/response shapes).
- [`ws-protocol.md`](./ws-protocol.md) — WebSocket protocol (source of truth
  for realtime messages).
- Client-side firewall selectors:
  - [`../../src/features/classroom/buildStudentView.ts`](../../src/features/classroom/buildStudentView.ts)
    (already shipped) — Rule 1 baseline.
  - [`../../src/features/classroom/publish/publishDay.test.ts`](../../src/features/classroom/publish/publishDay.test.ts)
    — Rule 1 scaffold, `describe.skip` until P2.
  - [`../../src/features/classroom/live/buildProjectorView.test.ts`](../../src/features/classroom/live/buildProjectorView.test.ts)
    — Rule 2 scaffold, `describe.skip` until P4.

---

## 1. What we're building

Classroom v2 adds four subsystems on top of the existing REST classroom API:

| Subsystem                                                        | REST endpoints (new)           | Realtime               | Client phase |
| ---------------------------------------------------------------- | ------------------------------ | ---------------------- | ------------ |
| Roster + approval lifecycle                                      | `/classrooms/:id/enrollments*` | —                      | P1           |
| Publish pipeline (immutable Day snapshots)                       | `/classrooms/:id/publish`      | —                      | P2           |
| Assignments (persistent tasks)                                   | `/classrooms/:id/assignments*` | —                      | P2           |
| Live Sessions (Pear Deck-class realtime)                         | `/classrooms/:id/sessions*`    | WebSocket              | P3 + P4      |
| Module Session Protocol (Atlas modules as answerable activities) | `/msp/token`, `/msp/response`  | postMessage / callback | P5           |

**Locked-in scope decisions** (from the plan):

- **Extend the existing REST backend + add WebSockets**. No Supabase.
- **Accounts only**. Every `enrollment` and `session_participant` row resolves
  to a real `accountId`. Guest tier deferred.
- **Client-driven phases**: P0 (contract) → P1 (roster) → P2 (publish +
  assignments) → P3 (live core) → P4 (interactions) → P5 (MSP + Learn) → P6
  (reports + hardening). The client-side of each phase is scoped and estimated;
  server-side is what this brief describes.

---

## 2. Database schema

Seven new tables. Names follow existing repo conventions (snake_case,
`created_at` / `updated_at` on every row, UUID PKs).

If your Postgres is on the existing musicatlas.io stack, land these under a
new migration file, e.g. `202607_classroom_v2.sql`.

```sql
-- ============================================================
-- Classroom v2 — schema migration (accounts-only)
-- ============================================================

-- 2.1 enrollments — student ↔ classroom link with a lifecycle state machine.
CREATE TABLE enrollments (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id  uuid        NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  account_id    uuid        NOT NULL REFERENCES accounts(id)   ON DELETE CASCADE,
  display_name  text,       -- optional teacher-set override; NULL falls back to accounts.nickname/username
  status        text        NOT NULL CHECK (status IN ('pending', 'active', 'removed')),
  joined_at     timestamptz NOT NULL DEFAULT now(),
  approved_at   timestamptz,
  removed_at    timestamptz,
  UNIQUE (classroom_id, account_id)
);

CREATE INDEX enrollments_classroom_status_idx ON enrollments (classroom_id, status);
CREATE INDEX enrollments_account_idx ON enrollments (account_id);

-- 2.2 published_days — immutable snapshots of a teacher's local Day. Server
-- data is student-safe BY CONSTRUCTION per Rule 1.
CREATE TABLE published_days (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id  uuid        NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  teacher_id    uuid        NOT NULL REFERENCES accounts(id),
  source_ref    text,       -- opaque client-side hint (local dayId) for traceability
  snapshot      jsonb       NOT NULL,      -- see openapi.yaml DaySnapshot
  age_preset    text        NOT NULL DEFAULT 'high',
  languages     text[]      NOT NULL DEFAULT ARRAY['en'],
  published_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX published_days_classroom_idx ON published_days (classroom_id);
CREATE INDEX published_days_teacher_idx   ON published_days (teacher_id);

-- 2.3 assignments — persistent classroom tasks.
CREATE TABLE assignments (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id       uuid        NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  title              text        NOT NULL,
  instructions       text,
  kind               text        NOT NULL CHECK (kind IN ('day', 'atlas', 'instructions')),
  published_day_id   uuid        REFERENCES published_days(id),
  atlas_ref          jsonb,      -- shape: { module, activityRef, expects } — required when kind='atlas'
  due_at             timestamptz,
  status             text        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (kind = 'day'          AND published_day_id IS NOT NULL AND atlas_ref IS NULL) OR
    (kind = 'atlas'        AND atlas_ref IS NOT NULL        AND published_day_id IS NULL) OR
    (kind = 'instructions' AND published_day_id IS NULL     AND atlas_ref IS NULL)
  )
);

CREATE INDEX assignments_classroom_status_idx ON assignments (classroom_id, status);

-- 2.4 assignment_progress — one row per (assignment, enrollment).
CREATE TABLE assignment_progress (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id  uuid        NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  enrollment_id  uuid        NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  status         text        NOT NULL CHECK (status IN ('not_started', 'in_progress', 'done')),
  artifact_ref   jsonb,      -- optional: { module, deepLink, preview } for atlas-kind completions
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, enrollment_id)
);

CREATE INDEX assignment_progress_assignment_idx ON assignment_progress (assignment_id);
CREATE INDEX assignment_progress_enrollment_idx ON assignment_progress (enrollment_id);

-- 2.5 sessions — live classroom sessions.
CREATE TABLE sessions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id      uuid        NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  teacher_id        uuid        NOT NULL REFERENCES accounts(id),
  published_day_id  uuid        NOT NULL REFERENCES published_days(id),
  code              text        NOT NULL UNIQUE,          -- 6-char unambiguous join code
  status            text        NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'ended')),
  state             jsonb       NOT NULL,                 -- see openapi.yaml SessionState
  started_at        timestamptz NOT NULL DEFAULT now(),
  ended_at          timestamptz
);

CREATE INDEX sessions_classroom_idx ON sessions (classroom_id);
CREATE INDEX sessions_code_idx      ON sessions (code) WHERE status = 'live';

-- 2.6 session_participants — presence + join-history for a session.
CREATE TABLE session_participants (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     uuid        NOT NULL REFERENCES sessions(id)    ON DELETE CASCADE,
  enrollment_id  uuid        NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  joined_at      timestamptz NOT NULL DEFAULT now(),
  last_seen      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, enrollment_id)
);

CREATE INDEX session_participants_session_idx ON session_participants (session_id);

-- 2.7 responses — unified store for both live-session and async-assignment answers.
CREATE TABLE responses (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     uuid        REFERENCES sessions(id)    ON DELETE CASCADE,
  assignment_id  uuid        REFERENCES assignments(id) ON DELETE CASCADE,
  interaction_id text        NOT NULL,      -- client-side id from Cell.presentation.interactions[]
  enrollment_id  uuid        NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  payload        jsonb       NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (session_id IS NOT NULL OR assignment_id IS NOT NULL)
);

CREATE INDEX responses_session_interaction_idx ON responses (session_id, interaction_id) WHERE session_id IS NOT NULL;
CREATE INDEX responses_assignment_idx          ON responses (assignment_id)              WHERE assignment_id IS NOT NULL;
CREATE INDEX responses_enrollment_idx          ON responses (enrollment_id);
```

**Notes on the schema**

- `accounts` is your existing student/teacher account table. Adjust the FK
  references if the table is named differently.
- No `guest_name` / `device_key` columns. Guest tier is deferred.
- `published_days.snapshot` is the _entire_ student-safe Day payload. Storage
  cost is per-classroom-per-publish; expect ~30–100 KB per snapshot depending
  on how many activities the teacher references.
- `sessions.state` is a JSON blob so we can evolve `SessionState` shape without
  a migration. Keep the top-level keys stable (`phase`, `interactionIndex`,
  `mode`, `locked`, `share`).
- `responses.payload` is capped at ~200 KB (draw stroke JSON is the worst
  case). Enforce at the API layer, not the DB.

---

## 3. REST endpoint implementation notes

Full request/response shapes are in `openapi.yaml`. Below is only the
**behavior + edge cases** the OpenAPI can't express.

### 3.1 `POST /classrooms/:id/publish`

- **RBAC**: teacher must own the classroom (existing `classrooms.teacher_id`
  check).
- **Server-side firewall (Rule 1 belt-and-suspenders)**: after parsing the
  request body, run `runFirewallTest(snapshot)` — the same forbidden-substring
  regex the client uses at `buildStudentView.test.ts`. Reject with **400 +
  `{ code: 'firewall_violation', match: '<substring>' }`** if any of these
  appear lowercased in `JSON.stringify(snapshot)`:

  ```
  assessment | rationale | clo | impact | scaffold | standard |
  initiation | createdby | notes | localcontext
  ```

  The client already scrubs, so this is defense-in-depth. Log the violation
  with the classroom + teacher IDs so we can trace client bugs.

- **Idempotency**: not idempotent. Publishing the same Day twice creates two
  `published_days` rows. Client tracks the latest per local `dayId` via
  `source_ref`; the server treats each publish independently.
- **Returns**: 201 + full `PublishedDay` (id + timestamps).

### 3.2 `GET /classrooms/:id/enrollments`

- **RBAC**: teacher-owner OR any enrollee (they can see themselves via a
  filter — server enforces).
- **Query params**: `status = all | pending | active | removed` (default
  `active`).
- **Ordering**: `joined_at DESC` for pending, `display_name ASC` (or fallback
  to nickname) for active.
- **Display name resolution**: `SELECT COALESCE(e.display_name,
a.nickname, a.username, 'Student') AS display_name FROM enrollments e JOIN
accounts a ON a.id = e.account_id`.

### 3.3 `PATCH /classrooms/:id/enrollments/:enrollmentId`

- **RBAC**: teacher-owner only.
- **Transitions allowed**:

  | From    | To      | Effect                                     |
  | ------- | ------- | ------------------------------------------ |
  | pending | active  | `approved_at = now()`, `removed_at = NULL` |
  | pending | removed | `removed_at = now()`                       |
  | active  | removed | `removed_at = now()`                       |
  | removed | active  | `approved_at = now()`, `removed_at = NULL` |

  Any other transition → **400 `invalid_transition`**.

- **`displayName` field**: optional; if provided, overwrites teacher-set
  display name. Client uses this for name normalization when accounts have
  unhelpful nicknames.

### 3.4 `GET /classrooms/:id/assignments`

- **RBAC**: teacher-owner OR active enrollment. Server filters:
  - Teacher: all assignments in this classroom, both `open` and `closed`.
  - Student: only `open` assignments (closed ones can be listed via a future
    `?status=all` filter but keep the default clean).
- **Ordering**: `due_at ASC NULLS LAST`, then `created_at DESC`.

### 3.5 `POST /classrooms/:id/assignments`

- **RBAC**: teacher-owner only.
- **Validation** (server-side belt on the DB CHECK constraint):
  - `kind === 'day'` requires `publishedDayId` referencing a row where
    `classroom_id === :classroomId`. Reject with 400 otherwise.
  - `kind === 'atlas'` requires `atlasRef.module ∈ {learn, studio, globe,
arcade}` and non-empty `activityRef`.
  - `kind === 'instructions'` requires non-empty `instructions`.
- **Notifications** (P6, out of scope for P2): once the notification feed
  ships, creating an assignment fires a notification to every active
  enrollment.
- **Returns**: 201 + full `Assignment`.

### 3.6 `PATCH /classrooms/:id/assignments/:assignmentId`

- **RBAC**: teacher-owner only.
- **Allowed changes**: `title`, `instructions`, `dueAt`, `status`. The
  discriminator fields (`kind`, `publishedDayId`, `atlasRef`) are immutable —
  reject with 400 if the client tries to change them.
- **Closing**: setting `status = 'closed'` freezes new response inserts on
  the `/progress` endpoint but does NOT delete any existing progress rows.

### 3.7 `GET /classrooms/:id/assignments/:assignmentId/progress`

- **RBAC**:
  - Teacher-owner → returns all `assignment_progress` rows for this
    assignment.
  - Student with an active enrollment → returns only their own row (server
    enforces via the JWT's accountId).
- **Ordering** (teacher path): `display_name ASC`.

### 3.8 `POST /classrooms/:id/assignments/:assignmentId/progress`

- **RBAC**: student updating their OWN row. Server derives `enrollment_id`
  from `(classroom_id, jwt.accountId)` — never trust the client's
  `enrollmentId`.
- **Idempotency**: `UPSERT ON CONFLICT (assignment_id, enrollment_id) DO
UPDATE SET status = EXCLUDED.status, artifact_ref = EXCLUDED.artifact_ref,
updated_at = now()`.
- **Transitions**: any of `not_started → in_progress → done`. `done → *` is
  allowed (a student can reopen); log for pattern analysis.
- **Assignment closed**: 409 `assignment_closed` if `assignments.status =
'closed'`.

### 3.9 `POST /classrooms/:id/sessions`

- **RBAC**: teacher-owner only.
- **Validation**: `publishedDayId` must exist AND belong to this classroom.
- **Code generation**: 6 chars from the unambiguous alphabet
  `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (excludes `0/O/1/I/L`). Retry on collision
  with active sessions (`WHERE status = 'live'`).
- **State initialization**: `{ phase: 'connectRegulate', interactionIndex: -1,
mode: 'teacher_paced', locked: false, share: null }`.
- **Returns**: 201 + full `Session`.

### 3.10 `GET /classrooms/:id/sessions/:sessionId`

- **RBAC**: teacher-owner OR active enrollment.
- **Used by**: late-join / reconnect / degraded polling.
- Cache-Control: `no-store` — this is realtime data.

### 3.11 `PATCH /classrooms/:id/sessions/:sessionId`

- **RBAC**: teacher-owner only.
- **Body**: partial `SessionState` (any subset of `phase`, `interactionIndex`,
  `mode`, `locked`, `share`) AND/OR `status`.
- **Ending a session**: `status = 'ended'` sets `ended_at = now()`, closes the
  session's WebSocket connections (broadcast a synthetic `end` message), and
  purges the presence entry from `session_participants` for participants
  currently connected.
- **Broadcasts**: on successful update, broadcast the corresponding message
  on the session's WebSocket channel (see §4).
- **`share` gate**: if the body contains `share.on = true` on an interaction
  where `Interaction.type === 'check-in'` OR `Interaction.shareable === false`,
  reject with **400 `check_in_not_shareable`** (Rule 2, server side).

### 3.12 `POST /classrooms/:id/sessions/:sessionId/responses`

- **RBAC**: active enrollment in this classroom. Reject teacher inserts (they
  don't answer their own interactions).
- **Body**: `{ interactionId, assignmentId?, payload }`. Server derives
  `enrollment_id` from `(classroom_id, jwt.accountId)`.
- **Idempotency**: **NOT** idempotent by default — every submit is a new row
  (choice / text / number can be resubmitted; teacher dashboard shows the
  latest). If we want per-interaction uniqueness later, add a UNIQUE partial
  index and switch to UPSERT.
- **Payload size cap**: reject if `LENGTH(payload::text) > 200 KB` (draw
  strokes are the fat case). Return 413 `payload_too_large`.
- **Session closed**: 409 `session_ended` if `sessions.status = 'ended'`.
- **After insert**: broadcast a `response` message on the session's WebSocket
  (see §4) — the teacher dashboard uses this for live grid updates. Student
  sockets DO NOT receive peer responses.

### 3.13 MSP endpoints (P5)

**`POST /msp/token`** — mints a signed JWT for launching an Atlas module.

- **RBAC**: teacher-owner (they're driving the launch on behalf of a student).
- **JWT claims**:
  ```json
  {
    "iss": "musicatlas-classroom",
    "aud": "msp",
    "sub": "<accountId>",
    "ctx": { "sessionId": "...", "assignmentId": "...", "interactionId": "..." },
    "expects": "completion | score | artifact",
    "return": "<url>",
    "exp": <now + 30 min>,
    "jti": "<uuid>"
  }
  ```
- **Signature**: HS256 or RS256 — up to you; the client just carries it
  opaquely.
- **Returns**: 200 + `{ msp: '<jwt>' }`.

**`POST /msp/response`** — callback used by modules launched in a new tab.

- **Auth**: `Authorization: Bearer <msp jwt>` (NOT the user's session JWT).
- **Validation**: verify signature + `exp`, extract `sub` (student accountId),
  `ctx.sessionId | ctx.assignmentId`, `ctx.interactionId`.
- **Behavior**: insert into `responses` with `kind: 'atlas'` payload; broadcast
  on the session's WebSocket if `sessionId` is set.
- **Returns**: 202 (fire-and-forget from the module's POV).
- **Rate limit**: 60 / minute per `sub` — the module shouldn't be spamming.

---

## 4. WebSocket implementation

### 4.1 Infrastructure choice

Three viable paths, ranked:

1. **Socket.IO on the existing Node/Express API server** _(recommended)_

   - Same process, same JWT auth pipeline, same deploy.
   - Built-in reconnection, presence, rooms per session.
   - Battle-tested at the load numbers we care about (60 concurrent per
     session, ~100 concurrent sessions across the tenant).

2. **Native `ws` library** (bare WebSocket)

   - Lighter dependency; you write reconnection + presence yourself.
   - Same process as the API server.

3. **Standalone WebSocket service**
   - Separate deployment. Overkill until scale >> our numbers.

Regardless of choice, the WebSocket path must be one of:

- `wss://<api>/ws/classrooms/:classroomId/sessions/:sessionId` (Socket.IO
  namespace or plain path)
- Auth: `Authorization: Bearer <jwt>` header at handshake, OR `?token=<jwt>`
  query param as fallback.

### 4.2 Room / channel model

One room per session. Room key: `session:<sessionId>`.

Three participant roles distinguished by a `role` query param on connect:

| role        | Who connects                                                | Receives                                                                                                                                |
| ----------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `teacher`   | The session's owner                                         | All teacher broadcasts + all `response` events (WITH identifiers) + `presence`                                                          |
| `student`   | An active enrollee                                          | All teacher broadcasts + `presence` — **NEVER** peer `response` events. Their own `response` may echo for optimistic UI reconciliation. |
| `projector` | The teacher's projector view (second socket on same client) | All teacher broadcasts + `presence` + **`response` events with identifiers STRIPPED**, only for the currently-shared interaction        |

The role-scoping is where **Rule 2 (response-privacy firewall)** lives at the
transport layer. The client-side `buildProjectorView` selector is
belt-and-suspenders.

### 4.3 Auth

- Reject the upgrade with WebSocket close code `4001` if:
  - JWT invalid or expired,
  - caller is not the teacher-owner nor an active enrollee,
  - session `status = 'ended'`.
- Cache the auth decision per socket connection; don't re-verify on every
  message.

### 4.4 Message routing

**Teacher → server**: all state mutations come through `PATCH /sessions/:id`
(REST). The server calls the DB update, THEN broadcasts to the room. This
means:

- Every mutation is persisted before any client sees it (durability).
- The socket layer is purely a fan-out mechanism; if it drops a message,
  the next REST poll reconciles.

**Server → clients**: broadcast the corresponding message shape per
`ws-protocol.md`. Include `at` (server-side timestamp) on every message so
clients can detect out-of-order delivery.

**Presence**: emit `presence` deltas every 5 s based on `session_participants
.last_seen`. Update `last_seen` on every socket ping/pong.

**Rate limits (server-enforced)**:

- Teacher `PATCH /sessions/:id`: 10 / second per session.
- Student `POST /responses`: 100 / minute per enrollment.
- `presence` heartbeats: server-emitted, no client limit needed.

### 4.5 Reconnect + degradation

- On reconnect, the client fetches `GET /sessions/:id` for authoritative
  state, then re-joins the room.
- If a socket has been idle for >60 s without pings, close it with code
  `4003 idle_timeout` — the client will reconnect if the session is still
  live.
- If the socket infrastructure itself is down, clients fall back to
  polling `GET /sessions/:id` every 5 s. REST-only mode still works; only
  realtime feel degrades.

### 4.6 Ending a session

`PATCH /sessions/:id { status: 'ended' }` triggers:

1. Update `sessions.status = 'ended'`, `ended_at = now()`.
2. Broadcast `{ type: 'end' }` to the room.
3. Close all sockets in the room with code `4002 session_ended`.
4. Refuse subsequent socket upgrades to that session.

Responses inserted after `status = 'ended'` are rejected at the REST layer
(§3.12).

---

## 5. Firewall — server-side enforcement

Two rules, both mirror the client-side tests we already scaffold.

### Rule 1 — Publish-time firewall (server belt)

Client-side firewall test lives at
`src/features/classroom/publish/publishDay.test.ts` (currently
`describe.skip`, activated in P2).

**Server**: on `POST /classrooms/:id/publish`, run the same forbidden-substring
regex against `LOWER(request.body.snapshot::text)`. Match → 400 with
`firewall_violation`. Log the classroom / teacher / matched substring.

Recommend: extract the substring list into a shared config so client + server
never drift.

### Rule 2 — Response-privacy firewall

Two enforcement points on the server:

**5.1** `PATCH /sessions/:id { share: { interactionId, on: true } }` — before
committing the state change, look up the referenced interaction on the
associated `published_days.snapshot`. If `Interaction.type === 'check-in'` OR
`Interaction.shareable === false`, reject with 400 `check_in_not_shareable`.

**5.2** WebSocket message routing — see §4.2. The `projector` role never
receives identifier fields in `response` events. Implement this as a strip
function applied to the message just before send:

```js
function stripForProjector(msg) {
  if (msg.type !== 'response') return msg;
  return {
    type: 'response',
    at: msg.at,
    interactionId: msg.interactionId,
    // enrollmentId + displayName intentionally omitted
    anon: crypto
      .createHash('sha256')
      .update(msg.enrollmentId + ':' + msg.sessionId)
      .digest('hex')
      .slice(0, 8),
    payload: msg.payload,
  };
}
```

The `anon` field lets the projector view group responses by the same student
without leaking identity. Salt with `sessionId` so anons don't cross sessions.

---

## 6. Testing surface

At minimum:

**Firewall tests** (must pass in CI, no skips):

- Rule 1: publish a snapshot with every forbidden substring; assert 400.
- Rule 2a: teacher tries to share a `check-in` interaction; assert 400.
- Rule 2b: broadcast a `response` to a projector role socket; assert
  identifier fields absent.

**Endpoint contract tests**: one happy path + one RBAC violation per endpoint.

**WebSocket integration test**:

- Set up a session, connect two `student` sockets and one `teacher` socket.
- Teacher patches state; both students receive the broadcast within 100 ms.
- Student A inserts a response; teacher socket receives it, student B does
  NOT.

**Load test**: 60 concurrent sockets per session, 10 sessions concurrent.
Target: teacher `nav` → student render within 1 s at p95.

---

## 7. Phased rollout (backend deliverables per client phase)

The client-side is already gated on this ordering; ship backend in the same
sequence.

| Client phase                   | Backend deliverables                                                                                                                                                                                                       |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1 — Roster**                | `enrollments` migration + `GET/PATCH /classrooms/:id/enrollments*`. Extend the existing student-join flow (`POST /classrooms/join`) to create the `enrollments` row with `status = 'pending'` instead of instantly-active. |
| **P2 — Publish + Assignments** | `published_days` + `assignments` + `assignment_progress` migrations + `POST /publish`, `GET/POST/PATCH /assignments*`, `GET/POST /assignments/:id/progress`. Server-side Rule 1 firewall on `/publish`.                    |
| **P3 — Live core**             | `sessions` + `session_participants` migrations + `POST /sessions`, `GET /sessions/:id`, `PATCH /sessions/:id` + WebSocket layer (auth, room routing, teacher-broadcast handling). No response endpoint yet.                |
| **P4 — Interactions**          | `responses` migration + `POST /sessions/:id/responses`. Rule 2 enforcement on the socket layer (`projector` role strip + `check-in`-share rejection). Load test at this stage.                                             |
| **P5 — MSP + Learn pilot**     | `POST /msp/token` + `POST /msp/response` + JWT signing key rotation. Coordinate with the Learn team on the client-side embed contract.                                                                                     |
| **P6 — Reports + hardening**   | `GET /classrooms/:id/sessions/:sessionId/report` (session summary + CSV export). Retention: `DELETE /classrooms/:id/data` cascade endpoint (teacher-triggered).                                                            |

---

## 8. Open questions

These block a phase's start; capture your answers back in a comment on this
file or a follow-up doc.

1. **WebSocket infrastructure** — Socket.IO vs. `ws` vs. standalone service?
   (I recommend Socket.IO; call out constraints if not.)
2. **Existing accounts table shape** — does it already have `role`
   (`teacher` / `student`), or do we join on a separate `teachers` table? The
   OpenAPI assumes a single `accounts` table with a role column.
3. **Existing `classrooms.join_code` semantics** — the current REST creates
   8-character codes for classroom joining. Session codes are a separate
   6-character alphabet. Confirm no collision on the join-code lookup path.
4. **Existing student-join lifecycle** — does `POST /classrooms/join`
   currently create an "instant-active" enrollment? P1 changes this to
   `pending` by default. Migration plan for existing rows?
5. **JWT scopes** — do we already differentiate teacher / student JWTs, or
   is role derived from the accountId lookup at request-verify time?
6. **MSP signing key management** — HS256 with a shared secret, or RS256 with
   a rotating keypair? If RS256, the Learn / Studio / Globe / Arcade modules
   need to fetch the JWKS.
7. **Rate-limiting backend** — sliding window on the API layer (existing
   Redis?), or does the WebSocket service handle it?
8. **Notification feed for assignments** — P6 out of scope, but confirm the
   assignment-created event can flow through the existing notification
   infrastructure when we're ready.
9. **Data retention on classroom deletion** — cascade is written into the
   migration (`ON DELETE CASCADE` on every FK to `classrooms`). Confirm
   this matches your data-retention policy for existing tables.
10. **Postgres version** — the schema uses `gen_random_uuid()` (pgcrypto).
    Confirm the extension is enabled in production.

---

## 9. Contact + coordination

- Client-side owner: this repo (Webapp-Refactor).
- Contract source of truth: `docs/classroom-v2/openapi.yaml` +
  `ws-protocol.md`. Any change to either MUST be a coordinated PR with the
  matching client-side change.
- Firewall regressions block merges on both sides. Client tests scaffolded
  at `src/features/classroom/publish/publishDay.test.ts` and
  `src/features/classroom/live/buildProjectorView.test.ts`.
