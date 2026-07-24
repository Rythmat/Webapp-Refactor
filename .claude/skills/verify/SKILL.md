---
name: verify
description: Build/launch/drive recipe for verifying Webapp-Refactor changes end-to-end (dev server + Playwright), including the offline classroom live-session loop.
---

# Verifying Webapp-Refactor changes

## Launch

- `nvm use 20` first (engines pin; husky calls `npx yarn` on commit).
- Dev server: `VITE_DEV_AUTH_BYPASS=1 npx vite --port 5180 --strictPort`
  - Port **5179 is often already taken** by the owner's own dev server (without
    the bypass flag) — do NOT kill it; use 5180+.
  - The bypass signs you in as `dev-bypass-user` with `role: 'teacher'` and
    premium, so `/teacher/*` (teacherOnly) and premium gates all open.
    See `src/auth/devBypass.ts`. DEV-only; folds out of prod builds.
- Driver: Playwright is NOT a repo dep. `npm i playwright` in a scratch dir —
  chromium builds are already cached in `~/Library/Caches/ms-playwright`.
  One browser context = shared localStorage across pages, which is exactly
  what the classroom local-mock needs (three "tabs": teacher / student /
  projector as three pages).

## Offline classroom live-session loop (no backend needed)

Everything below runs against localStorage mocks — sessions with ids
`local-sess-*` bypass PartyKit/REST entirely (see `useSessionSync`), and in
DEV `publishDayToClassroom` falls back to the local publish store when the
API is unreachable.

1. Teacher page → `/teacher/classroom/<anyCid>/plan/live-deck` (deck wizard)
   → pick "Song Session" → Browse songs (search matches title/artist/genre)
   → Next through Questions/Preview → **Go Live** (button name collides with
   the stepper chip "4. Go Live" — use `exact: true`).
2. Session URL is `/teacher/classroom/<cid>/sessions/<local-sess-…>`; extract
   the sid from the URL.
3. Student page → `/classrooms/<cid>/live/<sid>`; projector page →
   `/teacher/classroom/<cid>/sessions/<sid>/projector`.
4. Teacher slide nav: click strip thumbnails (`[role="tablist"] [role="tab"]`)
   or ArrowLeft/ArrowRight. Student/projector follow via storage events.
5. Student inputs: check-in = emoji buttons **plus a Submit button** (tap
   alone doesn't send); choice = option button then Submit.
6. Reveal: teacher "Reveal to class" button → projector shows animated bars /
   card wall. Check-in reveal buttons are disabled by design (Rule 2).
7. `window.alert` is used for error surfacing in Plan/wizard flows — attach a
   `page.on('dialog')` listener or failures are silently dismissed.
8. Dev-only `SessionSimulationPanel` on the teacher dashboard (Seed +
   Auto-respond to current phase) generates fake student responses.

## Gates (CI-shaped, run before hand-off, not as the verification)

- `npx tsc --noEmit -p tsconfig.app.json`
- `npx vitest run src/features/classroom` (firewall suites live here)
- `npx vite build` (chunk-size warnings are pre-existing noise)
