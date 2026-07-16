# Frontend cutover brief — Challenges are now backend-owned

**For:** the web client (`music-atlas-webapp`). **From:** Ryan (backend).
**Status:** the experience backend now owns challenge generation, values, status,
and XP. The endpoints are built, typechecked, tested, and their DB migration is
live. Nothing is deployed to the running API yet, and **the old serverless still
works** — so the client keeps functioning until you cut over.

## What changed and why

Per Aaron's call, challenge **definitions, values, and statuses moved to the
backend** (killing the two-repo reward-table sync). The backend generates the
same deterministic per-(user, period) set your `_generate.ts` did — I ported it
verbatim — persists it in Postgres, tracks completion, grants XP on completion,
and owns the boost lifecycle.

**One thing did NOT move:** completion _detection_. The `challengeEventBus` +
`matchCriteria` + `useChallengeWatcher` fire on live SPA events that only exist in
the browser. So the split is: **backend owns generate / store / status / XP; the
client still detects a criteria match and POSTs "complete challenge :id".** Keep
the event bus, criteria matching, `useChallenges`, `useInterestProfile`, `types.ts`.

## New endpoints (on the experience API — `VITE_MUSIC_ATLAS_API_URL`)

Base path is `/api/challenges` on the experience backend, **not same-origin**.
Auth is the same Bearer JWT as `/experience/*`.

### `POST /api/challenges/list`

Body: `{ profile?: { genres: InterestGenre[]; focus: string[] } }`
Returns (**same `ChallengesListResponse` shape you already render**):

```ts
{ challenges: Challenge[],   // each with status + completedAt resolved server-side
  boost: { pending: boolean; multiplier: number; claimableAt: number } | null }
```

Regenerates on day/week rollover; deterministic, so a user's set matches what the
old serverless produced for the same period.

### `POST /api/challenges/:id/complete`

Body: `{ evidence?: any }` (accepted for compat, **ignored** — completion is
trusted, same as the old serverless). Returns:

```ts
{ challenge: Challenge,           // status/completedAt resolved
  boostEarned: boolean,           // true when this completes all of today's dailies
  experience: ExperienceSummary } // ← NEW: XP was granted here; refresh from this
```

**XP is granted in this call now.** Idempotent by `challenge:<id>` — retries and
already-completed challenges don't double-grant.

### `POST /api/challenges/boost/claim`

No body. Returns the **active** window (claim now activates directly):

```ts
{
  multiplier: number;
  expiresAt: string | null;
}
```

⚠️ This **replaces** the old `{ multiplier, durationMs }` return. The old flow was
claim → then call `/experience/boost` to activate; that second call is gone.

## Client changes required

1. **Repoint `src/lib/challenges/api.ts`** from same-origin `/api/challenges/*` to
   `${VITE_MUSIC_ATLAS_API_URL}/api/challenges/*`.

2. **🔴 Parse SuperJSON.** The experience API wraps every response in SuperJSON
   (`{ json, meta }`). Your current `challengesApi` uses raw `res.json()` — that
   will return the envelope, not your data, and silently break. **Reuse the exact
   request wrapper from `src/lib/experience/api.ts`** (`apiRequest` / SuperJSON
   parse + `X-App-Session` header) instead of the hand-rolled `fetch` in
   `challenges/api.ts`. This is the single most likely thing to bite you.

3. **`useCompleteChallenge`** — drop the separate `experienceApi.awardChallenge`
   call. Completion returns `experience`; invalidate `['experienceSummary']`
   (or seed it from the returned summary). One call, not two.

4. **`useXpBoost`** — `claim` no longer needs `challengesApi.claimBoost` **then**
   `experienceApi.startBoost`. The single `claimBoost` activates and returns
   `{ multiplier, expiresAt }`. Use it directly.

5. **Delete the serverless** (in the same PR): `api/challenges/list.ts`,
   `api/challenges/[id]/complete.ts`, `api/challenges/boost/claim.ts`,
   `_generate.ts`, `_utils.ts`, and the challenges' Upstash Redis usage. Check
   nothing else imports `_utils`' re-exports (`getRedis`/`verifyAuthToken` come
   from `../collab/_utils` — leave those if collab still needs them).

6. **Remove `experienceApi.awardChallenge`** after cutover — the backend `/award`
   endpoint + its source-derivation are deprecated and will be deleted once no
   client calls them.

Keep: `matchCriteria.ts`, `eventBus.ts`, `useChallengeWatcher.ts`,
`useChallenges.ts` (repointed via `challengesApi`), `useInterestProfile.ts`,
`types.ts`.

## Cutover ordering & safety

- **Do it in one PR.** Backend deploys first (endpoints sit unused until you flip);
  then your PR repoints + deletes serverless + drops the award/startBoost calls
  atomically. Don't half-flip — a client hitting both stores split-brains.
- **No double XP:** the grant is idempotent by `challenge:<id>`, the same source
  key the old `/award` used, so even overlapping paths can't grant twice.
- **One-time transition artifact:** the old completion map lived in Redis; the new
  one is a fresh Postgres row. Because generation is deterministic, a user sees the
  _same_ challenges for the current period, but a challenge they completed pre-flip
  may show `active` again post-flip (their Postgres row starts empty). Re-completing
  is harmless — XP won't re-grant (idempotent). Acceptable for a one-time cutover.

## Notes

- Generation, rewards (u-lesson 20, u-arcade 15, u-invite 30, u-lesson-week 20,
  genre 25 daily / 35 weekly), COUNT=3, and the seeded shuffle are ported 1:1 from
  `_generate.ts`. New users with no interest genres still get 2 daily challenges
  (only 2 universal templates) — unchanged.
- Boost: earned when all of a day's dailies are done (2×, 24h, claimable next day),
  exactly as before. Pending state lives in the challenge row; the active window
  lives on the user (`xp_boost_multiplier` / `xp_boost_expires_at`).
