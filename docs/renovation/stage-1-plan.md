# Teacher Portal Renovation — Stage 1 Implementation Plan

> ## Corrections (2026-09-18)
>
> This doc was checked against the code at `91655571`. Where the two disagree, these notes win.
> The mockup guide (`docs/renovation/mockup-guide.md`) records the product decisions made since.
>
> - **S0-1 firewall.** `findForbiddenKey` was already narrowed to key names only in `2f64f180` (Sep 3). A `'clo'` message can only come from the client-side check, and current code can't produce it on a normal lesson, so the report most likely came from an older deployed build: **confirm the deployed build first**. Still worth doing:
>
>   - switch to exact-key matching;
>   - fix the outdated text-based check in `slides/contentRefs.ts:113`, which still blocks e.g. `tears_of_a_clown`;
>   - rebuild published snapshots, which are reused forever by `PlanPage.handleStartSession` and have no per-snapshot version.
>
>   The Present path is `PlanPage.tsx:437` → `handleStartSession` → `publishDayToClassroom` → `window.alert`.
>
> - **S0-2 Console.** An exit button alone won't work. `src/contexts/AuthContext/ProtectedPage.tsx:87-92` redirects every admin or editor back to `/console`, and so does `AuthPage.tsx:23-25`. Fix the redirect, then add the exit link. Flag for Ryan: do teachers wrongly hold the `editor` role?
> - **S0-3 Globe links.** The bug is in `src/features/songs/useSongActions.ts:66`, not the files listed below. It goes to `/atlas?event=` (the dashboard, which ignores `event`) instead of `/atlas/globe`. Use the existing `songGlobeRoute` (`slides/songDeepLinks.ts:86`). The same hook also serves `SongCard`, `SongLibraryPage` and `FeaturedSongCard`.
> - **S3-1 / D5 co-teacher invites.** A generated `/classrooms/:id/teachers` endpoint with `viewer|editor` roles already exists and no UI uses it. That is a quicker path than waiting on the new `/invitations` endpoint.
> - **S1-4 images.** Admin image upload (`useAdminAssetUpload`) points at an endpoint that hasn't shipped. The studio-assets signed-upload flow is the better model, but it's audio-specific.
> - **S2-1 duplicate.** `duplicateSlideAt` (`slides/deckEdit.ts:173`) already re-keys interaction ids. Build the Day copy from it.
> - **D2 (four vs. five phases)** is resolved differently from the default below:
>   - Standards-Based is the default Process and is the existing five phases, with student labels **Connect / Practice / Create / Present / Respond**.
>   - **Observe** is added for MODEL steps. It is a **label only**, not a sixth phase, so no server change is needed.
>   - Other Processes are templates over the phases, in their own step order, applied through Duplicate.
> - **CLOs on slides.** A CLO's sentence stem is copied into a student text prompt. The CLO itself stays teacher-only, so the firewall rule is unchanged.

**Repo:** `Rythmat/Webapp-Refactor` (`music-atlas-webapp`)
**Baseline commit:** `ca2d1e0` (merge of PR #175, 2026-09-03)
**Status:** First draft. Decision gates in §2 are unresolved.

---

## How to use this document

Drop this at `docs/renovation/stage-1-plan.md` in the repo so Claude Code can read it
alongside the source.

Each task carries an ID (`S0-1`, `S1-3`, …), the files it touches, the change, and
acceptance criteria. Work a task by opening this file, then the listed paths. Tasks
inside a workstream are ordered; workstreams can run in parallel except where a
`Blocks:` line says otherwise.

Verification for every task, unless the task says otherwise:

```bash
npm run test:unit      # vitest
npm run lint           # no-hats + prettier + eslint --max-warnings 0 + tsc -b
npm run build
```

`npm run lint` runs `tsc -b`, so type errors fail lint. Husky runs lint-staged
pre-commit and there is a pre-push hook; assume both are enforced.

---

## 1. Ground truth

Orientation for anyone (or any agent) reading this cold.

### What is already built

`src/features/classroom/` is 281 files and already implements most of the
Plan/Present blueprint:

| Capability                                                                                    | Location                                       |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Slide deck model (6 slide kinds, freeform 1280×720 block layout, per-block text style)        | `slides/types.ts`                              |
| Deck editor (filmstrip, canvas, add-slide menu, content picker)                               | `plan/deckEditor/`                             |
| Content picker tabs: Songs, Globe, Genre, Theory, Studio, Eras, Events, Regions               | `plan/deckEditor/contentPicker/`               |
| Live sessions (socket controller, slide gating, roster, projector, timers, pairing, showcase) | `live/`                                        |
| 7 interaction input types + response aggregation and viz                                      | `live/interactions/`, `slides/viz/`            |
| MSP — Atlas module as live answer (token mint, response inbox, completion)                    | `msp/`                                         |
| Assignments (composer, runner, progress, response dashboard)                                  | `assignments/`                                 |
| Enrollments with status state machine                                                         | `enrollments/`                                 |
| Annual plan (calendar, DnD, school calendar, stub materialization, unit alignment)            | `annual/`                                      |
| Student-safe projection + firewall                                                            | `publish/publishDay.ts`, `buildStudentView.ts` |

Stable IDs already exist where the blueprint needs them: `Day.id`,
`Day.scheduledDate`, `Unit.dayIds` (cross-reference, not containment).

### What is not built

- Attendance — zero occurrences in the codebase.
- Gradebook — `grades/ClassroomGradesPage.tsx` is 91 lines. Effectively a stub.
- Student View impersonation — zero occurrences.
- Warehouse as a unified surface (pieces exist: `plan/useSavedLessons.ts`,
  `content/usePersonalContent.ts`, `plan/ActivityBankPicker.tsx`).
- Rubrics bank, grading schema.
- Per-student teacher comments / feedback.

### The persistence situation

**Everything in `features/classroom` is localStorage-backed.** This is deliberate and
documented in the source, but it governs what Stage 1 can deliver.

| Store                             | Key                         | Note in source                                                                                                      |
| --------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `plan/useLocalPlan.ts`            | `ma-teacher:plan:v1`        | "nothing hits the server until v2's Supabase schema ships"                                                          |
| `live/sessionsStore.ts`           | `ma-teacher:sessions:v1`    | "local CustomEvent + storage broadcast mocks realtime… Ryan's PartyKit handler in Sprint 5 binds to this shape 1:1" |
| `enrollments/enrollmentsStore.ts` | `ma-teacher:enrollments:v1` | "matches Ryan's REST shape"                                                                                         |
| `publish/usePublishedDays.ts`     | (local)                     | "there is no GET-one endpoint on the backend"                                                                       |

`src/lib/classroom-sessions/api.ts` calls a real endpoint but catches all errors and
returns `[]`, "so the feature is inert until the backend ships."

Consequence: a live session today runs inside one browser. A second device cannot
join. Anything requiring cross-device state is Stage 2.

`docs/classroom-v2/openapi.yaml` and `docs/classroom-v2/backend-directions.md` are
referenced throughout the source but **are not tracked in this repo**. See `S3-0`.

---

## 2. Decision gates

These block or reshape work downstream. Defaults are proposed so implementation is
not stalled; changing a default after the fact is expensive where noted.

| #   | Decision                                                                                                                                                               | Blocks             | Proposed default                                                                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Image storage.** Teacher uploads to our bucket, or selection from a curated Atlas media library, or both?                                                            | `S1-4`, `S1-5`     | Both, phased: library picker first (no new infra), upload second.                                                                                        |
| D2  | **Four phases or five.** The renovation sketches show Connect / Practice / Create / Wrap-Up. The code implements five, with `presentPerform` as a first-class phase.   | Nothing in Stage 1 | Keep five. Sketches were a brainstorm; changing `PHASES` touches taxonomy, seeds, activity records, reports, and every deck. Revisit as its own project. |
| D3  | **"Make it Google Slides."** Does this mean freeform drag-and-drop authoring parity, or specific missing primitives (text box, image, link)?                           | `S1` scope         | Primitives, not parity. `SlideLayout` already supports freeform blocks.                                                                                  |
| D4  | **Firewall posture on Present.** Hard-fail or fail-soft?                                                                                                               | `S0-1`             | Fail-soft on read/present, hard-fail on write/publish. Rationale in `S0-1`.                                                                              |
| D5  | **Co-teacher invites**: extend the existing platform-level `musicAtlas.teachers.postTeachersInvitations`, or ship classroom-scoped `POST /classrooms/:id/invitations`? | `S3-1`             | Ryan's call. Client is already written against the latter.                                                                                               |

---

## Workstream S0 — Stabilize

Teacher-reported defects that cost class time. Ship first, independently of
everything else.

### S0-1 — Firewall: exact-key matching and fail-soft on present

**Priority:** P0. A teacher standing in front of a class currently cannot present.

**Reported as:** _"Pressing Present on a lesson brings up Error Rule 1 firewall
violation: 'clo'"_

**Files:**

- `src/features/classroom/publish/publishDay.ts`
- `src/features/classroom/publish/usePublishedDays.ts` (throw sites ~171–174, ~304–307, ~325)
- `src/features/classroom/assignments/AssignmentDayRunner.tsx` (~49)
- `src/features/classroom/publish/publishDay.test.ts`

**Diagnosis.** Two separate problems.

_Problem A — the matcher is too broad._ `FORBIDDEN_SUBSTRINGS` contains the
three-character string `'clo'`, and `findForbiddenKey` tests
`key.toLowerCase().includes(forbidden)` recursively over every object key. That
matches `onClose`, `clock`, `cloud`, `clone`, `closeable`, `disclosure`. `'notes'`
matches `footnotes` and `annotations`. `'standard'` matches `standardLayout`.
`'impact'` matches `impactRadius`. Any future slide field with those letters
hard-fails Present.

_Problem B — probable stale snapshots (hypothesis, needs confirmation)._ The
projection path in `publishDay` is airtight for a well-formed `Day`: every field is
explicitly named, nothing is spread, and both `switch` statements are exhaustive. A
freshly projected snapshot cannot contain a `clo*` key. But
`AssignmentDayRunner.tsx:49` validates `publishedDay.snapshot` **read from
localStorage**, and stored snapshots carry no schema version and have no migration. A
snapshot written by an earlier build — before the whitelist tightened and before the
scan narrowed to keys only — gets re-validated by today's stricter check and fails.
This explains why it did not surface in testing: a clean browser will not reproduce
it.

**Reproduction to confirm B before fixing:** in a browser with the reported failure,
dump `localStorage` keys matching `ma-teacher:published*` and inspect the stored
`snapshot` objects for any key matching `/clo/i`. If present, hypothesis confirmed.

**Changes:**

1. Replace `FORBIDDEN_SUBSTRINGS` with an exact-match key set derived from the real
   `CellRationale` field names:

   ```
   assessment, standards, commonAnchors, selCompetencies, impactTags,
   cloRefs, cloText, cloIds, activityRefs, notes, initiationStyle,
   scaffoldLaneIds, createdBy, localContext, rationale
   ```

   Match on `key === forbidden` (case-insensitive), not `includes`.
   Keep the export name if other modules import it; rename the constant to
   `FORBIDDEN_KEYS` and leave a deprecated alias for one cycle if needed.

2. Split the check into two functions:

   - `findForbiddenKey(snapshot)` — unchanged semantics, used on the **write** path
     (`publishDayForUser`, `publishDayToClassroom`). Still throws.
   - `sanitizeSnapshot(snapshot)` — strips any forbidden key, returns
     `{ snapshot, stripped: string[] }`. Used on the **read/present** path.

3. On the present path (`AssignmentDayRunner`, and anywhere a stored snapshot is read
   for display), call `sanitizeSnapshot`, render the lesson, and report `stripped` to
   telemetry (`src/telemetry/`) rather than throwing. Per D4: the firewall protects
   students from teacher-only content; stripping the key achieves that. Blocking the
   lesson does not protect anyone.

4. Add `snapshotVersion` to the stored `PublishedDay` record and a migration that
   re-projects any snapshot below the current version from its source `Day` when
   available, or sanitizes in place when not.

**Acceptance:**

- A `Day` whose stored snapshot contains a stray `cloRefs` key presents successfully,
  with the key absent from what renders and a telemetry event emitted.
- A publish attempt on a `Day` with a genuine rationale leak still throws.
- New tests: a key named `onClose` does **not** trip the firewall; a key named
  `cloRefs` does.
- Existing `publishDay.test.ts` and `content.firewall.test.ts` pass unchanged.

---

### S0-2 — Exit route from the Content Console

**Reported as:** _"Users Locked into Music Atlas content Console! Need button out of there!"_

**Files:** `src/features/admin/`, `src/layouts/`

**Change:** Identify the console layout that renders without the primary app chrome
and add a persistent "Back to Atlas" / "Exit Console" control that routes to the
teacher dashboard (or the user's landing route by role). Confirm the route is
reachable by keyboard and does not depend on browser back.

**Acceptance:** From any console page, one visible control returns the user to their
role's home route. Verified for teacher and admin roles.

---

### S0-3 — Globe links from chord chart resolve to the correct song

**Reported as:** _"Globe links from chord chart updated so they actually go to the songs."_

**Files:**

- `src/features/classroom/slides/songDeepLinks.ts`
- `src/features/classroom/slides/resolveContentHref.ts`
- `src/features/classroom/slides/contentRefs.ts`
- `src/features/classroom/legacySongSlug.ts`

**Change:** Trace the href construction from a chord-chart context to a Globe
destination. Suspect areas: legacy slug handling (there is already a
`stripLegacySongSlug` path in `publishDay.ts`, implying two slug generations coexist),
and whether the Globe route expects a song id, an artist id, or a location id.

**Acceptance:** Add a table-driven test in `resolveContentHref.test.ts` covering at
least ten real songs spanning both slug generations, asserting the resolved Globe
href loads that song's entry. Manual spot-check of three in the running app.

---

## Workstream S1 — Slide element system

The core of Stage 1. Satisfies five teacher requests and builds the foundation the
Plan sketch's "ADD AN ELEMENT" menu requires.

**Design note before starting:** `SlideBlockKey` / `SlideLayout` / `SlideTextStyle` in
`slides/types.ts` already model independently positioned, individually hideable blocks
on a 1280×720 canvas. The freeform substrate exists. Most of this workstream is adding
block _kinds_ and the editor affordances to place them — not building a layout engine.

**Firewall constraint for every task in S1:** any new field added to a `Slide` or to
`CellPresentation` must be explicitly named in `publishDay.ts`'s projection functions
(`projectSlide`, `projectSlideMedia`, `projectSlideLayout`, `projectTextStyle`,
`projectCell`). Never spread. Never add a field whose key collides with the forbidden
key set from `S0-1`. Add a projection test with each new field.

### S1-1 — Extend `SlideBlockKey` for composite content

**Blocks:** S1-2, S1-3

**Files:** `src/features/classroom/slides/types.ts`, `publish/publishDay.ts`,
`slides/slideLayout.ts`, `slides/parts/`

**Change:** Today `SLIDE_BLOCK_KEYS` is
`title | prompt | body | media | sideMedia | launchTiles | resetChecklist | interaction`.
Add the keys S1-2 through S1-5 need. Proposed additions: `link`, `image`, `infoCard`.

Update in lockstep:

- `SLIDE_BLOCK_KEYS` (the canonical allow-list the publish projector iterates)
- `defaultLayoutForKind` in `slides/slideLayout.ts`
- the block renderer switch in `slides/parts/`
- `projectSlideLayout` / `projectTextStyle` (both iterate `SLIDE_BLOCK_KEYS`, so they
  should pick this up — verify with a test rather than assuming)

**Acceptance:** A slide carrying every block key round-trips through `publishDay`
unchanged. `slideLayout.test.ts` covers default rects for the new keys at each slide
kind.

---

### S1-2 — Insert link element

**Reported as:** _"Insert link option"_

**Files:** `plan/deckEditor/AddSlideMenu.tsx`, new
`plan/deckEditor/LinkBlockEditor.tsx`, `slides/parts/SlideLink.tsx` (new),
`slides/types.ts`

**Change:** A `link` block holding `{ href: string; label: LocalizedText }`.

Decide and document the href policy, because it interacts with the Atlas-native
architectural constraint:

- **Atlas-internal** (`/songs/:id`, `/globe/...`) — always allowed, resolved through
  `resolveContentHref`.
- **External URL** — allowed or not? The Atlas-native-resources-only decision predates
  this request. Teachers are asking for it and Ambassador projects explicitly reference
  external resources. Recommend allowing, with an explicit carve-out recorded in the
  architecture notes, `rel="noopener noreferrer"`, and a visible external-link
  indicator on the student surface.

**Acceptance:** Teacher can add a link block to any slide, set label and href, position
it, and hide it. Link renders and is clickable on teacher, projector, and student
surfaces. Link survives publish projection. External links open in a new tab with
`noopener`.

---

### S1-3 — Song block split: info card and chord-chart link as separate elements

**Reported as:** _"Put song into slide, pull info from Globe along with link to Chord
Chart page. Make sure the info box is separate from the link so teacher can erase it if
they want without erasing the link."_

**Blocked by:** S1-1

**Files:** `plan/deckEditor/contentPicker/SongsTab.tsx`,
`plan/deckEditor/SlideMediaEditor.tsx`, `slides/parts/`, `slides/songDeepLinks.ts`

**Change:** When a teacher inserts a song, emit **two independent blocks** rather than
one composite:

1. `infoCard` — song metadata pulled from Globe (title, artist, era, region, whatever
   the Globe record exposes). Store the **song id only**; resolve at render, matching
   the existing `artistImage` / `globePathway` pattern. Do not denormalize Globe copy
   into the slide.
2. `link` — to the Chord Chart page for that song, reusing S1-2's link block.

Each is independently positionable and independently hideable via
`SlideBlockRect.hidden`, which is how block removal already works.

**Acceptance:** Insert a song; both blocks appear. Delete the info card; the chord
chart link remains and still resolves. Delete the link; the info card remains. Both
survive publish. Info card reflects a Globe metadata edit without re-inserting the song.

---

### S1-4 — Image element (library picker)

**Reported as:** _"Import image option – pictures, pdfs?"_ / _"Image storage urls"_
**Gated by:** D1

**Files:** `plan/deckEditor/contentPicker/` (new `MediaTab.tsx`), `slides/types.ts`
(`SlideMedia` union), `publish/publishDay.ts` (`projectSlideMedia`)

**Change:** Add `{ type: 'image'; assetId: string }` to the `SlideMedia` union — an id,
not a URL, consistent with every other member of that union. Resolve to a URL at render.

Phase one is a picker over existing Atlas media. `src/lib/studio-assets/` and
`src/features/admin/content/songEditor/ArtistImageUpload.tsx` are the precedents for
where assets live and how they are referenced; read both before designing the picker.

**Acceptance:** Teacher can place an image from the library on a slide, position,
resize, and hide it. `projectSlideMedia` has an explicit `case 'image'` (the switch is
exhaustive with no default — a missing case returns `undefined` and strands the slide).
Test covers projection.

---

### S1-5 — Image upload from personal device

**Gated by:** D1 and backend (`S3-2`)
**Depends on:** S1-4

**Files:** upload component (`react-dropzone` and `react-easy-crop` are already
dependencies), new asset API client under `src/lib/`

**Change:** Upload to the teacher's classroom asset scope, returning an `assetId`
consumable by S1-4's picker. Requires a bucket, a signed-upload endpoint, size and type
limits, and a moderation/retention answer. **Do not start until D1 and S3-2 are
resolved.**

PDF: treat as out of scope for Stage 1 unless D1 explicitly includes it. A PDF is not
an image block; it needs either a page-rasterizing pipeline or an embedded viewer, and
that is its own task.

**Acceptance:** Deferred pending gates.

---

### S1-6 — Add-element menu consolidation

**Depends on:** S1-2, S1-3, S1-4

**Files:** `plan/deckEditor/AddSlideMenu.tsx`,
`plan/deckEditor/contentPicker/ContentPickerDialog.tsx`

**Change:** The blueprint's "ADD AN ELEMENT" menu is: Activity Bank w/ Atlas links,
Song List, Link, Picture, Text, Student Interaction. Reconcile the current split
between `AddSlideMenu` (adds slides) and `ContentPickerDialog` (adds content) so a
teacher has one predictable path to "put a thing on this slide."

**Acceptance:** One menu, six element types, consistent placement behavior. Existing
decks unaffected.

---

## Workstream S2 — Warehouse foundation

### S2-1 — Duplicate Lesson

**Reported as:** _"Need Duplicate Lesson feature – easy button for copying any given
lesson and assigning which day or multiple days."_

This is the blueprint's Warehouse `COPY TO...` action.

**Files:** `plan/useSavedLessons.ts`, `plan/useLocalPlan.ts`,
`plan/deckEditor/AssignPanel.tsx`, `annual/UnitPage.tsx`, `annual/CalendarView.tsx`,
`annual/stubMaterialization.ts`

**Change:**

1. `duplicateDay(dayId): Day` — deep copy with a fresh `Day.id`, fresh ids for every
   slide and interaction (ids must not collide; response records key off
   `interactionId`), `scheduledDate: null`, and `sourceSeedId` preserved for provenance.
   Add a `duplicatedFrom: string` field for lineage. Add it to the forbidden-key review
   in `S0-1` — it is teacher-facing provenance and must **not** reach the snapshot;
   confirm `publishDay` does not name it.
2. Assign-to-date: a calendar popover writing `scheduledDate`.
3. Assign-to-multiple-dates: N copies, one per date, each independently editable. Do
   **not** create shared references — teachers expect to edit one period without
   changing another.
4. Assign-to-unit: push the new `Day.id` onto `Unit.dayIds`.

**Acceptance:** Duplicate a fully authored day with a deck and interactions; both
copies present independently; editing one does not affect the other; interaction
responses recorded against one do not appear under the other. Unit-level and
calendar-level assignment both work. Round-trips `useLocalPlan` serialization.

---

### S2-2 — Saved-lessons surface

**Depends on:** S2-1

**Files:** `plan/useSavedLessons.ts`, `content/usePersonalContent.ts`, new route under
`TeacherRoutes`

**Change:** A minimal Warehouse: list saved Days and Units with Copy To and Delete.
Full Warehouse (four Banks, rubrics, standards sets, gradebooks) is Stage 2 — this task
is the shell and the Days tab only.

**Acceptance:** Saved days list, copy-to opens the S2-1 date picker, delete confirms.

---

## Workstream S3 — Backend contract

Owner: Ryan. Listed here because S1-5 and several teacher requests are gated on it.

### S3-0 — Track the API contract in this repo

**P0 for coordination.** `docs/classroom-v2/openapi.yaml` and
`docs/classroom-v2/backend-directions.md` are cited in at least a dozen source comments
and do not exist in the repo. If they are the agreed frontend/backend interface they
belong under version control here, or the comments should point at wherever they
actually live.

### S3-1 — `POST /classrooms/:id/invitations`

**Reported as:** _"Teachers can't invite Teachers to classrooms (says Could Not send
the Invitation)"_

Not a frontend bug. `src/hooks/data/classrooms/useCreateClassroomInvitation.ts` is a
hand-rolled call written against an endpoint that does not exist; its own comment says
so. `InviteTeacherDialog.tsx` surfaces the generic failure toast.

Per D5, decide between extending the existing platform-level
`musicAtlas.teachers.postTeachersInvitations` and shipping the classroom-scoped
endpoint the client already expects. Once it exists, run `npm run generate:api` and
migrate the hand-rolled hook to the generated client.

### S3-2 — Asset upload endpoint

Blocks S1-5. Needs: signed upload, per-classroom scoping, type/size limits, retention
and moderation policy.

### S3-3 — Persistence for the classroom feature

Not Stage 1, but the gate on all of Stage 2. The client envelopes are already frozen to
bind 1:1 (`sessionsStore`, `enrollmentsStore`, `usePublishedDays`). Anything
cross-device — multi-student live sessions, gradebook, attendance, assignments that
actually reach a student — waits on this.

---

## 3. Sequencing

**Week 1:** S0-1, S0-2, S0-3. All three are costing class time now. S0-1 first.

**Weeks 2–4:** S1-1 → S1-2 → S1-3 → S1-4 → S1-6. This is the body of Stage 1.
S1-5 only if D1 and S3-2 land.

**Weeks 3–5, parallel:** S2-1, then S2-2. Independent of S1 except that duplicating a
deck must survive whatever S1 adds to the slide model — so land S1-1 before S2-1's deep
copy, or write the copy generically over `SLIDE_BLOCK_KEYS`.

**Continuous:** S3-0 immediately. S3-1 and S3-2 on Ryan's timeline.

---

## 4. Deferred, with rationale

**Office (gradebook, attendance, class communications, student view).** No teacher
asked for it in the current request list — they are asking for authoring tools, not
administration. It is also the surface most dependent on S3-3, since all of it is
per-student persistent state. Stage 2.

**Light / dark mode.** _"Make light mode choice vs dark mode."_ This is not a toggle.
`next-themes` is installed but only `components/ui/sonner.tsx` uses it.
`tailwind.config.ts` sets `darkMode: ['class']`, and there are **four** `dark:`
utilities in the entire application. Every color is hardcoded. Delivering this means a
design-token pass across the component tree. Real work, worth doing, scoped as its own
project — not slipped into Stage 1.

**Multi-window / "one window at a time."** Underspecified. Two plausible needs are
mixed together: opening a reference (chord chart, Globe) without losing editor state,
and running the projector on a second display. The first is a drawer/panel problem; the
second is a genuine second-window problem that interacts with how Present works.
Observe a teacher doing it before designing.

**MIDI in the new Song Chart editor.** Different subsystem (`src/daw/`, `src/audio/`).
Separate track, separate owner.

**Four-vs-five phases (D2).** Changing `PHASES` touches taxonomy, rationale defaults,
seed templates, the `phase` tag on every canonical activity, slide anchoring, session
reports, and curriculum coverage. Not a renovation item.

---

## Appendix A — Orientation commands

```bash
# What exists in the classroom feature
find src/features/classroom -type f | sed 's|src/features/classroom/||' | sort

# Firewall surface
grep -rn "FORBIDDEN\|findForbiddenKey\|Rule 1 firewall" src/features/classroom

# Every localStorage-backed store
grep -rn "STORAGE_KEY" src/features/classroom

# Where the API is actually called from the classroom feature
grep -rln "authFetch\|musicAtlas\." src/features/classroom

# Slide block keys and their renderers
grep -rn "SLIDE_BLOCK_KEYS" src/features/classroom
```

## Appendix B — Invariants not to break

1. **`publishDay` never reads `cell.rationale`.** Stated in the source as the
   load-bearing invariant. Every projection function is a whitelist copy; no spreads.
2. **Rule 2: `check-in` interactions are hard-`false` for `shareable`** regardless of
   the stored value, and `buildProjectorView` refuses to emit check-in payloads.
3. **Slide kind and media type switches are exhaustive with no `default`.** Adding a
   variant without adding its case returns `undefined` at runtime and strands the
   slide. TypeScript will catch it at `tsc -b`; do not silence it with a default.
4. **Session message envelopes are frozen** (`v: 1` in `sessionsStore.ts`). Ryan's
   PartyKit handler binds to them 1:1. Changing a message shape is a cross-team change.
5. **Interaction ids are the join key** for responses across live sessions and async
   assignments. Any copy/duplicate operation must re-key them (see S2-1).
