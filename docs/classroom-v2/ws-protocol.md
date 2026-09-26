# Classroom v2 — WebSocket Protocol

Companion document to [`openapi.yaml`](./openapi.yaml). This file specifies the
realtime layer used by **P3 Live Sessions** and **P4 Interactions**.

Scope note: everything below assumes the accounts-only path from the plan
(guest tier deferred). Every message carries an `enrollmentId` (or an
`enrollmentId: null` shorthand for the teacher-owner).

---

## Transport

- Path: `wss://<api>/ws/classrooms/:classroomId/sessions/:sessionId`
- Auth: send the existing Music Atlas JWT as the `Authorization: Bearer <jwt>`
  header at handshake time. If the socket implementation cannot carry headers
  (some browser WS libs), fall back to `wss://…?token=<jwt>`.
- Subprotocol: `music-atlas.classroom.v1`.
- Server rejects the upgrade with a 4001 close code if:
  - JWT is invalid or expired,
  - the caller is not the teacher-owner nor an `active` enrollment for the classroom,
  - the session's `status` is `ended`.

## Late join / reconnect strategy

- The socket **is not** the source of truth. State lives on the server; it is
  fetched via REST `GET /classrooms/:id/sessions/:sessionId` on connect or
  reconnect, then the socket subscribes for _deltas_ going forward.
- No message replay on the server side. If a client misses a message, its next
  REST poll (see §Degradation) reconciles.
- Reconnect target: within 10 s of the drop the client should be re-subscribed
  and rendered at the current position.

## Presence

Once connected the server tracks presence per socket. Every 5 s the server
emits a delta to all subscribers:

```json
{
  "type": "presence",
  "at": "2026-07-15T14:23:11.123Z",
  "delta": [
    { "enrollmentId": "en_...", "state": "joined" | "active" | "idle" | "left" }
  ]
}
```

`state` is derived from last-heartbeat: `active` if a socket message landed in
the last 15 s, `idle` if 15–60 s, `left` on socket close.

## Teacher → server broadcasts

The teacher client sends these messages; the server rebroadcasts to all
subscribers (including the teacher, so the projector view can drive off the
same message stream as the students).

The server ALSO calls the corresponding REST `PATCH /sessions/:sessionId`
endpoint on every mutation so the persisted `SessionState` (see openapi.yaml)
stays in sync. Late joiners get the current state via REST; steady-state
subscribers get the fast broadcast via the socket. Belt-and-suspenders.

### `nav` — advance / retreat within the Day

```json
{
  "type": "nav",
  "phase": "connectRegulate",
  "interactionIndex": 0,
  "focusOpen": false,
  "slideIndex": 3
}
```

- `interactionIndex = -1` means the phase card is focused with no interaction open.
- `focusOpen = true` maps to Presentation Mode Focus level; `false` maps to Board level.
- `slideIndex` (optional) — index into the published Day's `deck.slides` for
  interactive-slides sessions. Absent or `-1` = legacy phase-granular nav.
  When present, `phase` MUST equal `deck.slides[slideIndex].phase` (clients
  derive the current phase from the slide). The party fans it out verbatim;
  the API persists it inside `SessionState` like every other state field.

### `lock` — freeze student screens

```json
{ "type": "lock", "on": true }
```

Student clients render a lock screen (opaque overlay) that blocks navigation.

### `share` — toggle anonymous-share overlay on the projector

```json
{ "type": "share", "interactionId": "inx_abc", "on": true }
```

**Constraint**: an `Interaction.type === 'check-in'` MUST reject this call
client-side and server-side. The `buildProjectorView` selector further guards
this at render time (Rule 2 firewall test).

### `mode` — teacher-paced vs student-paced

```json
{ "type": "mode", "value": "student_paced" }
```

In `student_paced`, the student client ignores subsequent `nav` broadcasts and
lets the student walk through interactions on their own. Server-side, `nav`
messages are still broadcast so the projector view updates for the teacher.

### `end` — session ends

```json
{ "type": "end" }
```

Server sets `sessions.status = 'ended'`, purges the presence table, and closes
all sockets with code 4002 ("session ended"). Clients drop into the offline
presentation fallback (existing `PresentationMode`).

## Server → clients

All teacher broadcasts above are echoed back over the same subprotocol so
students and the projector view drive off a single stream. In addition, the
server emits:

### `response` — a student answered

```json
{
  "type": "response",
  "at": "2026-07-15T14:23:15.001Z",
  "interactionId": "inx_abc",
  "enrollmentId": "en_...",
  "displayName": "Alice K.",
  "payload": {
    /* per ResponsePayload in openapi.yaml */
  }
}
```

**Rule 2 constraint**: the server MUST NOT include `enrollmentId`,
`displayName`, or any other identifier when broadcasting **to the projector
view socket** (see §Projector sockets below). The teacher dashboard socket
DOES receive them.

**app-route slides (Phase 2)**: an atlas interaction legitimately emits the
same `(enrollmentId, interactionId)` more than once — first a
`{status:'launched'}` marker, then a completion — so the server MUST upsert
per pair (matching the client store's single-payload overwrite). These
interactions are authored `shareable:false`, so their payloads never reach the
projector socket (Rule 2 unchanged). The optional progress-ledger mirror
(`PATCH /api/progress/activity`, lessonId `slides:<deckId>`) is a REST
side-effect on the student device — **not** a socket message.

**Studio pairing + showcase (Phase 3)**: two additive `SessionState` fields,
carried through the same merged `state` PATCH + echoed as state updates:

- `pairs` (`SessionState.pairs`) — Studio collaboration groups. Fan-out to
  **teacher + student sockets, NEVER the projector**: pairs carry enrollment
  ids, so projecting them would leak identifiers (Rule 2). The
  `hostEnrollmentId` client mints the collab room (`/studio/editor?collab=new&invite=…`).
- `showcase` (`SessionState.showcase`) — the single teacher-featured project.
  Fan-out to **all roles including the projector** — a deliberate,
  teacher-approved share (first name + project name only). Not a Rule 2 leak.

Student `showcase` OFFERS ride the normal `response` event with
`payload.kind:'showcase'`, authored `shareable:false`, so the raw offer stream
is teacher-only (buildProjectorView hard-refuses `showcase` like `check-in`).
Featuring is the separate `showcase` state broadcast, never the anonymized
reveal path.

**Timers, media control, student position (Phase 4)**: three additive
mechanisms.

- `timer` (`SessionState.timer`) — the running slide countdown. All-role
  fan-out. `endsAt` is an epoch-ms deadline; the TEACHER client fires the
  advancing `nav` at zero — the server never schedules.
- `media` (`SessionState.media`) — remote play/pause for a media slide's video.
  All-role fan-out (the projector's iframe player reacts). `cmdId` nonce makes
  repeated identical commands re-fire.
- `position` — a student's local slide index in a student-paced deck. Sent by
  the student over the SOCKET as `{type:'position', slideIndex}` (an ephemeral,
  presence-like signal, NOT a state PATCH); the server stamps the enrollmentId
  from the socket auth and fans out to **the teacher only** (Rule 2 — position
  is identified). It is stored in a `positions` side-map, never SessionState,
  so it never rides the state broadcast and never reaches the projector.

Timer + media are carried through the merged state PATCH (`buildStatePatch`)
like every other SessionState field. The PartyKit party relays `pairs`
(teacher+student), `showcase`/`timer`/`media` (all roles), and `position`
(teacher only); the Music Atlas API must POST these to the party's onRequest
for the socket path (the local-mock dev loop already routes them end-to-end).

### `presence` — see §Presence above

### `hello` — server → new subscriber, immediately after handshake

```json
{
  "type": "hello",
  "session": { /* full Session per openapi.yaml */ },
  "role": "teacher" | "student" | "projector"
}
```

Client uses this to size the initial UI without a REST round-trip.

## Projector sockets

The projector view is a **separate** socket subscription. The teacher client
opens two: one for their dashboard (role `teacher`) and one for the projector
(role `projector`). The server distinguishes them via a `role=projector`
query param on the WS URL.

The projector socket receives only:

- All `nav`, `lock`, `share`, `mode`, `end`, `hello`, `presence` messages.
- `response` events **only for the currently-shared interaction**, with all
  identifiers stripped (`enrollmentId` set to `"anon-<sha256-truncated>"`,
  `displayName` omitted).

This is the socket-layer half of Rule 2. The other half is the
`buildProjectorView(session, interactionId)` selector inside the projector
view UI: even if a malformed server sneaks identifiers through, the selector
strips them before render.

## Student sockets

Student clients open one socket, role `student`. They receive:

- `hello`, `presence`, all teacher-driven state broadcasts.
- **Never** `response` events for any student except themselves (server does
  not broadcast peer responses to student sockets). If a student's own
  response is echoed, it's for optimistic UI reconciliation only.

## Rate limits

- Teacher `nav` messages: max 5 per second (debounce arrow-key mashing).
- Student response inserts: enforced by the REST endpoint (100/min per
  enrollment); the socket doesn't accept student writes.
- `presence` heartbeat: server-emitted; clients don't drive it.

## Backpressure & degradation

If the socket drops for more than 5 seconds:

1. Student client transitions to REST polling: `GET /sessions/:sessionId`
   every 5 s to pick up `SessionState` changes.
2. Teacher client shows a "reconnecting" indicator; teacher can force-end the
   session at any time (routes through REST regardless of socket).
3. On socket recovery, the client refetches via REST, then resubscribes.

Under sustained socket failure the classroom degrades gracefully to the
existing offline `PresentationMode` — the teacher can always dismiss the
session and continue projecting locally.

## Non-functional targets

Repeated from SPEC v2 §12 with our accounts-only adaptation:

- Teacher `nav` → student render lag: **<1 s at classroom scale** (design
  target 40 concurrent, tested to 60).
- Student view fully usable on a phone.
- Reconnect <10 s restores exact position; no lost responses (REST inserts
  are durable independent of socket state).
- Local Presentation Mode remains 100% functional offline and signed-out.

## Open questions (owned by Ryan)

- Which WebSocket infrastructure — Socket.IO on the existing API server, a
  standalone WebSocket service, or the API gateway's native WS support?
- Auth propagation: header vs. query-param subprotocol handshake?
- Are there existing JWT scopes to reuse for `role=teacher` vs `role=student`
  vs `role=projector`, or do we mint session-scoped tokens on session create?
- Rate-limit backend: sliding window on the API layer, or does the WS service
  handle it?
- Scale: at 60 concurrent per session, per-tenant classroom count, how do we
  shard? (Likely fine on a single Node process at these numbers, but worth
  confirming.)

These block P3 execution but don't block P0/P1 client-side work — the client
just needs the socket path + auth mechanism finalized before P3 lands.
