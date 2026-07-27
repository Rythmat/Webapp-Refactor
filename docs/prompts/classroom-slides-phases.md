# Interactive Classroom Slides — Phased Master Prompt

> **Purpose.** Give Teacher Management + Classroom v2 a beautiful interactive
> Slides system (Pear Deck / Nearpod class) deeply integrated with the rest of
> Music Atlas: live sessions where the teacher presents slides, students answer
> on their devices, the teacher reveals anonymized results to the projector,
> and slides route students into real app modules (Theory, Song Charts, Globe,
> Studio) with progress flowing back. Research basis: Pear Deck, Nearpod,
> Mentimeter, Poll Everywhere, Slidea (interaction patterns) + Teachable,
> Kajabi (curriculum-structure patterns). Design plan of record:
> the 2026-07-22 planning session (8-step teacher user flow).
>
> **How to use this document.** Run one phase per fresh Claude Code session, in
> order (P1 → P4). Phases are dependency-ordered; P2+ each assume the previous
> phase is merged. Paste **§Shared Context** plus the single phase prompt.
> **Phase 1 shipped with the change that introduced this document** — its
> section is kept as the reference spec for how the system fits together.

---

## §Shared Context (paste with every phase)

You are working in `/Users/marfizo/Documents/Full App Code/Webapp-Refactor` — a
Vite + React 18 + TypeScript app. Classroom v2 lives in
`src/features/classroom/`; the interactive-slides layer is
`src/features/classroom/slides/`.

### Architecture cheat-sheet

- **Data model.** `Day` (5 IMPACT-phase `cells`, each `presentation` +
  teacher-only `rationale`) may carry `deck?: SlideDeck`
  (`slides/types.ts`) — an ORDERED projection over the Day. Each `Slide` is
  anchored to a `PhaseKey`; interaction-bearing slides reference
  `cells[phase].presentation.interactions` BY ID (helpers in `slides/deck.ts`:
  `interactionsForSlide`, `findDanglingInteractionIds`). Publishing
  (`publish/publishDay.ts`) whitelist-copies the deck via `projectDeck` —
  never spread a slide into the snapshot.
- **Firewalls (load-bearing).** Rule 1: `rationale` never reaches
  students — `publishDay` + `buildStudentView` + forbidden-substring tests
  ('assessment','rationale','clo','impact','scaffold','standard','initiation',
  'createdby','notes','localcontext' — template copy must avoid these words,
  including Spanish like "impacto"). Rule 2: teachers see identified
  responses; the projector gets anonymized data ONLY while an interaction is
  shared (`live/buildProjectorView.ts` — check-ins hard-refused); students
  never see peer responses. `slides/` components never import
  `useLiveResponses`/`buildResponseAggregate`/`useEnrollments` — response data
  arrives via pre-gated `slots` (see `slides/SlideRenderer.tsx`), and the
  projector viz path is typed on `ProjectorView`
  (`slides/viz/buildVizAggregate.fromProjectorView`) so identified rows are a
  compile-time impossibility.
- **Realtime.** REST is the source of truth; the PartyKit party
  (`src/daw/collab/server/classroom_session/party.ts`) is pure fan-out.
  Teacher sends PATCH the full merged `SessionState`
  (`live/sessionSocketController.ts` `buildStatePatch` — every new state field
  must be carried there or non-nav PATCHes drop it). `SessionState.slideIndex`
  (-1 = legacy phase nav) + `nav.slideIndex` are the slide-granular additions.
  Local mock: sessions whose id starts with `local-sess-` bypass the socket —
  `useSessionSync` routes sends through `applyMessageForUser`
  (`live/sessionsStore.ts`), so the whole feature works offline; keep both
  paths in strict parity (`SessionMessageBody` + `SessionSocketMessage`).
- **Rendering.** One `SlideRenderer` (`slides/SlideRenderer.tsx`) with
  `surface: 'projector'|'student'|'teacher'` + `slots {input, reveal,
statusChip}`. Surfaces: `slides/student/StudentSlideView.tsx` (mounted by
  `live/LiveSessionPage.tsx` when a deck exists), `slides/projector/
ProjectorDeckView.tsx` (`live/ProjectorPage.tsx`), teacher strip + panel in
  `slides/teacher/` (`live/TeacherSessionDashboard.tsx`). Legacy slide-less
  sessions keep the old UI — never regress them.
- **Templates.** `slides/templates/songSession.ts`
  (`buildSongSessionDay`) + `slides/templates/fromPlannedDay.ts`
  (`enrichDayWithSongSessionDeck`) generate a Day + deck; the wizard
  (`slides/wizard/DeckWizardPage.tsx`, route `TeacherRoutes.deckWizard`) runs
  the EXACT PlanPage go-live path: `useLocalPlan.saveDay` →
  `usePublishedDays.publishDayToClassroom` → `useLocalSessionStore
.startSession({..., initialSlideIndex: 0})` → `TeacherRoutes.session`.
- **Announcements.** Home banner source `'live_session'`
  (`src/features/announcements/useLiveSessionAnnouncements.ts`): server
  `GET /classrooms/:id/sessions?status=live` (degrades to []) merged with the
  local mock store; priority 200, non-dismissible, CTA → `ClassroomRoutes.live`.
- **Contracts.** REST/schemas: `docs/classroom-v2/openapi.yaml` (SlideDeck /
  Slide / SlideMedia / SessionState.slideIndex / GET sessions). Socket:
  `docs/classroom-v2/ws-protocol.md`. Extend BOTH for any protocol change; the
  client must degrade gracefully when an endpoint doesn't exist yet (pattern:
  `src/lib/classroom-sessions/api.ts`).
- **Deep links (P2+).** Existing conventions: `/learn/:mode/:key?activity=`,
  `/curriculum/:genre/:level?section=A|B|C|D`, `/atlas?event=|?pathway=`,
  `/songs/:songId`, `/studio/editor?template=|?collab=new&invite=`. Pure
  helpers in `slides/songDeepLinks.ts`; `ContentRef`s
  (`src/curriculum/types/songLibrary.ts`) + `LaunchTile`/`Interaction.atlas`/
  `AtlasAssignmentRef` all share `{module, activityRef}`.
- **Curriculum anchors.** Annual Plan `CANONICAL_ANNUAL_TEMPLATE`
  (`annual/curriculumTemplate.ts`, ~6000 lines — do NOT read whole) →
  `DayStub {phaseSeeds, songId, globeEventIds}` materialized by
  `annual/stubMaterialization.ts`. Genre Curriculum `GENRE_CURRICULUM_MAP`
  (`src/curriculum/data/genreCurriculumMap.ts`, keyed `POP:L1`) +
  `getActivityFlow(genre, level)`. Progress ledger: `src/lib/progress/api.ts`
  (`PATCH /api/progress/activity`; lessonIds `curriculum:{GENRE}:{LEVEL}`,
  `mode-lesson-flow__<key>__<mode>`). MSP module-routing:
  `src/features/classroom/msp/` (`useMspTokenMint`, `mspResponseInbox`).

### Verification recipe (run for every phase)

1. `nvm use 20` (husky calls `npx yarn`; engines pin node 20).
2. `npx tsc --noEmit -p tsconfig.app.json` — clean.
3. `npx vitest run src/features/classroom` — all green, including the firewall
   suites (`publishDay.test.ts`, `buildStudentView.test.ts`,
   `buildProjectorView.test.ts`, `slides/viz/buildVizAggregate.test.ts`,
   `slides/templates/songSession.test.ts`).
4. Three-tab manual loop with `VITE_DEV_AUTH_BYPASS=1 npx vite` (no backend
   needed — local-mock sessions): teacher `/teacher/classroom/<cid>/plan/live-deck`
   → generate → Go Live; student tab `/classrooms/<cid>/live/<sid>`; projector
   tab `/teacher/classroom/<cid>/sessions/<sid>/projector`. Use the dev-only
   `SessionSimulationPanel` (Seed + Auto-respond) on the teacher dashboard to
   generate responses; verify reveal → animated aggregate on the projector,
   check-ins never on the projector, session report lists everything after End.

### Hard constraints

- Bilingual: every student-facing string is `LocalizedText` (en required,
  es translation) rendered per the student's language toggle.
- Dark-glass idiom: `#141416` fields, teal `#7ecfcf` accents,
  `bg-white/[0.03] border-white/10 rounded-2xl`; framer-motion only (no new
  deps); honor `prefers-reduced-motion`.
- Never write response data into slide/deck structures; never render
  identified data on the projector; check-ins are teacher-only everywhere.
- Additive protocol changes only; legacy (deck-less) sessions must keep
  working through every phase.

---

## Phase 1 — Slide engine + song-session template + polls + reveal + Home banner ✅ (shipped)

**Goal.** End-to-end: teacher generates a deck from a song (or today's planned
Day), goes live; students get the Home-banner notification, join, answer a
check-in, watch a media slide, answer a question; teacher reveals animated
anonymized results on the projector; exit poll; report.

**Covers user-flow steps 1–4 + 8.** Shipped surface map (reference):
model `slides/types.ts` + `slides/deck.ts`; publish/student-view projection
(`projectDeck`); nav plumbing (`slideIndex` through sessionsStore /
sessionSocketController / useSessionSync / party.ts); renderer + parts
(`slides/`, `slides/parts/`, `src/hooks/media/useYouTubeIframePlayer.ts`); viz
(`slides/viz/`); templates (`slides/templates/`, `slides/songDeepLinks.ts`);
wizard (`slides/wizard/`, route `TeacherRoutes.deckWizard`, entry on PlanPage);
surfaces (`slides/student|projector|teacher/` + deck branches in
LiveSessionPage / ProjectorPage / TeacherSessionDashboard); announcements
(`useLiveSessionAnnouncements` + `live_session` source + AnnouncementsRow
meta); contracts (openapi.yaml + ws-protocol.md).

---

## Phase 2 — App-route slides + curriculum integration (user-flow step 5)

**Why.** The differentiator: slides that route students into REAL modules
(Theory lesson for the song's key/mode, Song Chart, Globe pathway) with live
progress on the teacher dashboard — Nearpod activities are toys by comparison.

**Tasks.**

1. `slides/resolveContentHref.ts` — ONE shared resolver from
   `{module, activityRef}` + song `ContentRef` to real routes. activityRef
   conventions: `song:<id>:lesson|chart`, `learn:<mode>:<key>[:activity]`,
   `curriculum:<GENRE>:<L#>[:section]`, `globe:event:<id>|pathway:<id>`,
   `studio:song:<id>|template:<id>`. Make
   `presentation/resolveModuleUrl.ts` delegate to it (replacing the `?ref=`
   placeholder); adopt in `slides/songDeepLinks.ts` consumers.
2. `app-route` slide renderers: student = big Launch tile (MSP mint via
   `useMspTokenMint` where `MODULE_CAPABILITIES` allows embed, new-tab
   otherwise) + "come back when you're done"; teacher = live progress strip;
   projector = instructions only.
3. Pure `live/buildSlideProgress.ts`: `(roster, responsesByEnrollment,
mspInboxEntries, slide) → { perStudent: Record<enrollmentId,
'not_started'|'in_module'|'done'>, counts }` (+ tests). Feed the teacher
   panel + RosterPanel dots.
4. "Genre lesson" wizard source: pick `GCMKey` → `GenreProfile.levels[n]`
   overview slides + `ActivityFlowV2` steps as app-route slides +
   `learnCurriculumLinks` theory suggestion. Template `includeAppRoute` on by
   default for song sessions (route to the song's Theory lesson via
   `songLessonRoute`).
5. Session coverage block on `SessionReportPage`: derive covered curriculum
   items from `deck.templateRef` + app-route results ("Covered: Unit … ·
   JAZZ:L1 §A · Theory dorian/G"). Optional: mirror to
   `PATCH /api/progress/activity` with lessonId `slides:<deckId>` (existing
   `ProgressActivityPatch` contract — no new backend concepts).

**Files.** New: `slides/resolveContentHref.ts` (+test),
`live/buildSlideProgress.ts` (+test), `slides/AppRouteSlide.tsx`,
wizard source step addition. Modified: `presentation/resolveModuleUrl.ts`,
`slides/SlideRenderer.tsx` (replace the app-route placeholder),
`slides/teacher/CurrentSlidePanel.tsx`, `live/SessionReportPage.tsx`,
`slides/templates/songSession.ts` (app-route slide emission),
`slides/wizard/*`, openapi.yaml if any contract delta.

**Definition of Done.** Three-tab loop: student taps Launch on the app-route
slide → lands on the real Theory lesson for the song's key/mode → completes →
teacher dashboard flips that student to done live; report shows the coverage
block; CSV includes results; firewall suites still green.

---

## Phase 3 — Studio pairing + showcase (user-flow steps 6–7)

**Why.** Students apply what they learned creatively in the Studio — paired as
collaborators using the EXISTING collab stack (Yjs + PartyKit + invites; zero
new sync code) — then offer to share, and the teacher features projects on the
projector.

**Tasks.**

1. Protocol (additive; spec in openapi.yaml + ws-protocol.md first):
   `SessionState.pairs: [{id, enrollmentIds, hostEnrollmentId}] | null` +
   `pairs` fan-out (teacher+student, NOT projector);
   `SessionState.showcase: {slideId, enrollmentId, displayName, artifact
{projectId, roomId?, name}} | null` + `showcase` fan-out (all roles — a
   deliberate, teacher-approved share, not a Rule 2 leak). Carry both through
   `buildStatePatch`, both reducers, and the local-mock envelope.
2. New `Interaction.type: 'showcase'` + response payload
   `{kind: 'offer', artifact: {projectId, roomId?, name}}` — offers ride the
   existing response pipeline (teacher-only per Rule 2 routing; extend
   `buildProjectorView` to hard-refuse 'showcase' like 'check-in').
3. `studio-collab` slide: teacher `PairingPanel` (auto-shuffle roster or drag
   pairs/trios) → PATCH `state.pairs`. Student device: on `pairs`, the
   `hostEnrollmentId` client auto-navigates to
   `/studio/editor?collab=new&invite=<partnerAccountId>` (existing DawApp boot
   param creates room + invite; partner accepts via the existing invite
   bell). Solo grouping: everyone gets `/studio/editor?new=1` (or the song's
   `openInStudio` seed).
4. `showcase` slide: student "Offer to share" button → `sendResponse` offer
   with their current project (id from the studio store / recent projects).
   Teacher: offer list + **Feature** button → PATCH `state.showcase` →
   projector renders the feature frame ("Now presenting: <first name> —
   <project name>"). v1 artifact = the live collab project: the teacher opens
   `artifact.roomId` via the existing join flow on the projector machine and
   presses play. (Audio-bounce upload is a stretch; a read-only viewer role
   does not exist — rejected for v1.)
5. Timers stay manual this phase (P4).

**Definition of Done.** Teacher pairs roster → both students land in ONE
collab project (existing collab UX visible: presence cursors, chat) → student
offers → teacher features → projector shows the frame; offers never reach the
projector or other students; report lists offers; legacy sessions unaffected.

---

## Phase 4 — Timers, freeform deck editing, student-paced + coverage panel

**Tasks.**

1. `timer` protocol: `SessionState.timer: {slideId, endsAt, durationSec,
autoAdvance} | null` + fan-out to all roles; countdown UI on all three
   surfaces; the TEACHER CLIENT fires the advancing `nav` PATCH at zero (the
   server never schedules). `Slide.timerSec` (already in the model) seeds the
   teacher's timer control; wizard exposes per-stage timer params.
2. Freeform deck editing in `plan/DayEditor.tsx`: reorder/insert/delete/edit
   slides (all kinds), still publishing through `publishDay` + firewall tests;
   `findDanglingInteractionIds` gate on save.
3. Student-paced decks: audit `mode: student_paced` — student walks slides
   with prev/next, lock-until-complete gating for interaction slides (the
   Kajabi pattern), teacher sees per-student position.
4. Classroom-wide curriculum coverage panel (teacher dashboard):
   `useProgressSummary` over the lessonIds referenced by the classroom's decks
   - assignments — closes the "teachers can't see curriculum progress" gap.
5. Viz polish: word-cloud + scale/Likert reveals; remote play/pause `media`
   message for the projector video.

**Definition of Done.** Timer auto-advances a live session hands-free;
teacher edits a generated deck in DayEditor and re-presents; student-paced
deck session completes with gating; coverage panel shows real progress; all
suites green.

## Backlog appendix (pick up opportunistically)

- Word cloud response type (new Interaction subtype or text post-processing).
- Draw-slide reveal wall (draw thumbnails exist in `buildResponseAggregate`).
- Deck sharing between teachers (content bank integration).
- Per-student accommodations (age presets per enrollment).
- PDF/CSV deck-session report export enrichments.
