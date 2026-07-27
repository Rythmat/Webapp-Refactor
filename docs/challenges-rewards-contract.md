# Challenges + XP boost — post-cutover contract

**As of:** 2026-07-15 — challenges are fully **backend-owned** in
`music-atlas-api` (`VITE_MUSIC_ATLAS_API_URL`). The old same-origin serverless
`api/challenges/*` is deleted; the challenge event bus + completion detection
stays client-side, but generation, storage, statuses, and XP now all live
server-side (deterministic per-period generator, persisted in
`user_challenge_state`).

**Frontend client:** [src/lib/challenges/api.ts](../src/lib/challenges/api.ts)
routes through `apiRequest` from
[src/lib/experience/api.ts](../src/lib/experience/api.ts) — same auth header,
same SuperJSON `{ json, meta }` unwrapping, same error handling.

## Auth

`Authorization: Bearer <JWT>`. The token's `sub` is the user id. Same auth as
`/api/experience/*`.

## Endpoints

All responses are SuperJSON-wrapped and unwrapped by `parseApiResponse`.

### `POST /api/challenges/list`

**Body:** `{ "profile": InterestProfile }`
**Response `200`:** `ChallengesListResponse` — `{ challenges, boost }`.

### `POST /api/challenges/:id/complete`

**Body:** `{ "evidence"?: Record<string, unknown> }`
**Response `200`:** `{ challenge, boostEarned?, experience? }`.

- Grants the challenge's XP reward **directly** — no follow-up `/experience/award`
  call from the client. Any active boost multiplier is applied server-side.
- `experience` echoes the fresh `ExperienceSummaryResponse` so the client can
  invalidate its local summary query.
- Idempotent by `(userId, challengeId)`; re-completing does not double-grant.

### `POST /api/challenges/boost/claim`

**Response `200`:** `{ "multiplier": number, "expiresAt": string | null }`

- Activates the pending Double-XP boost **directly** on the backend and
  returns the active window. Pre-cutover this returned
  `{ multiplier, durationMs }` and required a separate `POST /experience/boost`
  follow-up; that dance is now server-side.

### `GET /api/experience/boost`

**Response `200`:** `{ "multiplier": number, "expiresAt": string | null }` —
active window, or `{ 1, null }` when no boost. Still lives under the
experience API (frontend feed for the boost badge / XP tile).

## The multiplier applies to ALL awards

While a user has an active boost (`now < expiresAt`), **every** XP award —
lesson, lesson-activity, arcade, and challenge — is multiplied by
`multiplier`. Implemented centrally in the backend's XP-granting path so all
award types honor it automatically.

**Arcade cap change:** the daily cap applies to _base_ round XP only; the
boost bonus is allowed to exceed it (a 2× player can earn up to 1000 arcade
XP/day).

## Award security

`POST /api/experience/award` still exists (temporarily deprecated pending
callers finishing their cutover) but **derives the amount server-side** from
the `source` — the client-sent `amount` is ignored. An unknown `source`
returns `400`. Real client flows on the challenge path don't call `/award`
anymore; use `POST /api/challenges/:id/complete`.

## Client integration reference

- `challengesApi.fetchList(token, profile)` — react-query key `['challenges']`.
- `challengesApi.complete(token, id, evidence?)` — called from
  `useCompleteChallenge`; on success invalidates `['challenges']` +
  `['experienceSummary']`.
- `challengesApi.claimBoost(token)` — called from `useXpBoost`; returns
  `{ multiplier, expiresAt }`. No separate follow-up.
- `experienceApi.getBoost(token)` — react-query key `['xpBoost']`; drives the
  boost badge.

## Deploy state

- Backend: **deployed** (2 migrations + backend-owned challenges live).
- Frontend: this cutover PR flips the client atomically. Deterministic
  generation means the same period yields the same challenges server-side, so
  there's no split-brain across the flip.
