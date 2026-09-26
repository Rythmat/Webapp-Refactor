# Teacher Office — Phased Master Prompt

> **Purpose.** Make the Teacher Office of Music Atlas function completely: a combination of
> **Google Classroom** (class management, stream, classwork, people, grades, calendar),
> **Canva** (slide design) and **Pear Deck** (interactive slides, student devices follow, live
> responses), in service of one goal — letting an in-school classroom music teacher build and
> run a curriculum. Scope was set by a nine-subsystem read-only audit of
> `src/features/teacher/**` and `src/features/classroom/**` on 2026-09-21, a three-lens design
> panel, and an analysis of 76 real lesson decks (789 slides) the teacher uses today.
>
> **Two product requirements drive the slide work and are non-negotiable:**
>
> 1. **A standardized position for all content on the slides** — one canonical grid, every
>    slide, every surface.
> 2. **Every piece of content is both embedded and linked** — it renders live _and_ carries a
>    canonical link to its full page.
>
> **How to use this document.** Run one phase per fresh Claude Code session, in order
> (P0 → P11, then the Capstone). Phases are dependency-ordered; each names what it depends on.
> For every session: paste **§Shared Context** plus the single phase prompt. A phase's
> Definition of Done is the cut line — anything you discover beyond it moves into a later
> phase's scope rather than extending the session.

---

## §Shared Context (paste with every phase)

You are working in `/Users/marfizo/Documents/Full App Code/Webapp-Refactor` — a Vite + React 18

- TypeScript app, branch `aaron`. The Teacher Office is:

* `/office` — the classroom picker (`src/features/teacher/ClassroomSelectionPage.tsx`, routed by
  `officePages()` in `src/features/teacher/TeacherPages.tsx`).
* `/teacher/classroom/:classroomId` — a Google-Classroom-style tabbed workspace
  (Overview · Lessons · Calendar · People · Grades) via
  `src/features/teacher/workspace/ClassroomWorkspaceLayout.tsx` + `ClassroomTabBar.tsx`.
* Deep pages under `ClassroomDeepPageLayout` — deck wizard, Unit page, Day editor, preview,
  assignment progress, live session dashboard, reports. Present and Projector deliberately sit
  **outside** that layout so projected surfaces render chrome-free.

### Architecture cheat-sheet

- **Curriculum tree.** `Year → semesters → Unit → dayIds → Day → cells{5 PhaseKeys} → Cell`.
  A `Cell` is `{presentation, rationale}` and **only `presentation` may ever reach a student**
  (`src/features/classroom/types.ts`). `Unit.weeks` exists but is write-only dead data.
  Month indices in this domain are 1–12, never `Date.getMonth()`.
- **Phases.** `PHASES` in `src/features/classroom/phases.ts` is the five-key IMPACT model
  (`connectRegulate`, `groupPractice`, `creativeProjects`, `presentPerform`,
  `respondReflectReset`). Student-facing labels are a **separate** mapping; the settled product
  labels are Connect · Observe · Practice · Create · Present · Respond, where **Observe is a
  label on MODEL steps, not a sixth phase**.
- **Deck.** A `Day` may carry `deck?: SlideDeck` (`slides/types.ts`) — an ordered presentation
  projection over the Day. Every slide is anchored to a `PhaseKey`; interaction-bearing slides
  reference `Interaction`s **by id**, and the interactions themselves live in
  `cells[phase].presentation.interactions`.
- **Firewall (load-bearing).** Rule 1: `rationale` never reaches students.
  `publish/publishDay.ts` whitelist-copies a `Day` into a snapshot (named fields only, never a
  spread) and `buildStudentView.ts` is the only selector student surfaces read. Rule 2:
  teachers see identified responses; the projector gets anonymized data only while an
  interaction is shared; check-in and showcase payloads are hard-refused from the projector at
  any depth (`live/buildProjectorView.ts`, `daw/collab/server/classroom_session/firewall.ts`).
- **Live sessions.** REST is the source of truth; the PartyKit party
  (`src/daw/collab/server/classroom_session/party.ts`) is **pure fan-out** — clients may not
  write state over the socket, only `ping` and a student `position`. All state changes go
  REST → API → authenticated webhook POST to the party. Sessions whose id starts with
  `local-sess-` bypass the socket entirely and run through the local mock
  (`live/sessionsStore.ts` + `useLocalSessionStore`), which is how the offline demo works.
- **Generated API client.** `src/contexts/MusicAtlasContext/musicAtlas.generated.ts` is produced
  by `.swagger/generate.ts` from the live swagger, and `npm run predev` regenerates it on every
  `npm run dev`. **Never hand-edit it, and never import a type for an endpoint that has not
  shipped** — `tsc -b` will break the next time anyone runs dev. Clients for unshipped
  endpoints go in hand-written adapters under `src/lib/<area>/api.ts`, modelled on
  `src/lib/classroom-sessions/api.ts` (authFetch, catch, degrade to empty), behind a flag in
  `src/constants/serverEndpoints.ts`.
- **Local store idiom.** Keys are `ma-teacher:<store>:v1`, each with a `SCHEMA_VERSION`; a
  version mismatch copies the old blob to `<key>.bak` and returns empty; writes dispatch a
  same-tab `<key>:changed` event and listen to `storage` for cross-tab. Per-user stores append
  `:${userId}`. The heavy stores (annual plan, published days) go through
  `src/lib/local-store/idbMirror.ts`, which keeps the synchronous API, migrates the value into
  IndexedDB once, **frees the localStorage copy**, and restores cross-tab sync via a
  `BroadcastChannel`.
- **Content banks.** `src/features/classroom/content/canonical/` normalizes and derives 96
  activities, ~106 CLOs, 35 lesson seeds, 12+ themes and the Idea Bank on load, validated in
  DEV. The annual curriculum template is 24 Units × 10 day stubs = 240 stubs
  (`annual/curriculumTemplate.ts`, ~6000 lines — do not read it whole).
- **Dependencies that already exist:** `react-qr-code`, `react-dropzone`, `react-easy-crop`,
  `framer-motion`, `lucide-react`, Radix UI, `@tanstack/react-query`.
  **`dnd-kit` is NOT a dependency** — reuse the native HTML5 drag pattern in
  `annual/calendarDnd.ts` rather than adding one.

### Invariants — never violate these

1. **`publishDay` never reads `cell.rationale`.** Every projection function is a named
   whitelist copy with no spread. Adding a field without adding it to `projectSlide` /
   `projectCell` means it silently vanishes at publish; adding it to the wrong side leaks
   teacher-only pedagogy to students.
2. **`buildStudentView` is the only data source for student surfaces**, and it reuses
   `projectDeck` rather than re-implementing it. Do not add a second deck projection.
3. **Rule 2:** check-in and showcase responses never reach the projector regardless of the
   `shareable` flag; projector payloads carry no participant identifiers.
4. **Slide components never import response hooks, the response aggregator, or the roster.**
   Response data reaches a slide only through the pre-gated `slots` the owning surface injects
   (`slides/SlideRenderer.tsx`).
5. **Interaction ids are the join key** for responses across live sessions and async
   assignments. Any copy, duplicate or regenerate operation must re-key them
   (`slides/deckEdit.ts` `duplicateSlideAt` is the reference implementation).
6. **The session message envelope is versioned.** Bump `v` for a new body; never mutate a
   `v: 1` body in place. The party binds to these shapes 1:1, so an envelope change is a
   cross-team change that ships on both sides together. (`docs/renovation/stage-1-plan.md`
   Appendix B calls the envelope "frozen"; that still holds for existing bodies. Presence,
   moderation and hand-raise genuinely need new ones, so the rule here is additive-only rather
   than no-change.)
7. **Slide-kind and media-type switches are exhaustive with no `default`.** A missing case
   returns `undefined` at runtime and strands the slide; `tsc -b` catches it only while the
   unions stay closed and no default is added.
8. **The PartyKit party is named `classroom_session` with an underscore** — PartyKit codegen
   breaks on hyphens.
9. **Calendar dates are local-time by construction**: build with `new Date(y, m - 1, d)`, serialize
   with `toIsoDate`, never `new Date(isoString)`.
10. **Every student-facing string is `LocalizedText`** (`{en, es?}`, English fallback) rendered
    per the student's language toggle.

### Verification recipe (run for every phase)

```bash
nvm use 20                 # engines pins node 20; husky hooks call npx yarn
npm run lint               # prettier --check + eslint --max-warnings 0 + tsc -b
npm run test:unit          # vitest
npx vitest run src/features/classroom   # the firewall suites specifically
npm run build              # tsc -b && vite build
```

The firewall suites are the acceptance gate for anything touching slides, publish or sessions:
`publish/publishDay.test.ts`, `buildStudentView.test.ts`, `live/buildProjectorView.test.ts`,
`content/content.firewall.test.ts`.

**Three-tab manual loop** (no backend needed — local-mock sessions):

```bash
VITE_DEV_AUTH_BYPASS=1 npx vite --port 5179 --strictPort
```

1. Teacher: `/teacher/classroom/<cid>/plan/live-deck` → generate → Go Live
2. Student: `/classrooms/<cid>/live/<sid>`
3. Projector: `/teacher/classroom/<cid>/sessions/<sid>/projector`

Drive it with Playwright and **read the screenshots** — verification has caught real bugs
(missing anchors, wrong components, surfaces disagreeing) every time. Use the dev-only
`SessionSimulationPanel` on the teacher dashboard to generate responses.

**Production safety**, for any phase that touches the dev bypass or adds a local-only mode:

```bash
npm run build
grep -rl "dev-bypass-token\|dev@localhost\|local-mock" dist/   # must return nothing
```

### Hard constraints

- **No silent mocks.** Nothing may present itself as server-backed when it is not. Every
  degraded path shows a visible badge and names the missing capability. This is the single most
  important behavioural rule in this document: a teacher standing in front of a class must be
  able to tell a working session from a practice one.
- **Feature flags** live in `src/constants/serverEndpoints.ts` with the doc-block convention
  already used there. A flag is flipped in the same change that ships its endpoint, never
  before. A missing route costs one request, not four (4xx is never retried), and every 404
  writes a server-side telemetry row.
- **Backend contract.** Every server change is written into `docs/classroom-v2/openapi.yaml`
  and listed in `docs/classroom-v2/CONTRACT-DELTAS.md` with its client flag, in the same phase
  that needs it.
- **Visual idiom.** Dark glass: `rounded-2xl border border-white/[0.06] bg-white/[0.02]`,
  white-pill primary CTA, text ramp `text-white` / `white/60` / `white/40`, gold `#FFCC33` as
  the single accent, teal `#7ecfcf` on slide surfaces. `framer-motion` only, honor
  `prefers-reduced-motion`. No new fonts, no new UI dependencies.
- **Do not touch `src/daw/**`** except `src/daw/collab/server/classroom_session/\*\*` (the party)
  and, in P11, the extraction of the chord-chart component.
- **Do not regress the legacy deck-less session path** until the phase that explicitly retires
  it. Every live surface currently branches on `snapshot.deck && slides.length > 0`.

### Definition of Done (every phase)

- [ ] The feature works end-to-end in the running app, not only in tests.
- [ ] Every new teacher-only field is added to `FORBIDDEN_KEYS` **and** a firewall test in the
      same commit.
- [ ] Every new slide/snapshot field is named in `publishDay`'s projection with a round-trip test.
- [ ] Server changes are written into `openapi.yaml` + `CONTRACT-DELTAS.md` with a client flag.
- [ ] Any degraded path shows a visible badge naming the missing capability.
- [ ] Static gates green (`npm run lint`, `npm run test:unit`); the three-tab loop run and its
      screenshots reviewed where the phase touches a slide or session surface.
- [ ] Existing decks, snapshots and plans still load — migrations are versioned, idempotent and
      keep a `.bak`.

---

## §Standardized Slide Grid (the spec P2–P4 implement)

### Where this comes from

The teacher's 76 real decks already encode a standard anatomy, held stable across two school
years. Normalized from their 960×540 canvas to our 1280×720 one:

| Observed in the decks                                                        | Frequency        | Normalized rect                       |
| ---------------------------------------------------------------------------- | ---------------- | ------------------------------------- |
| Phase chip, top-left, text is one of Connect/Practice/Create/Present/Respond | 264 slides       | ~(16,48,240,67)                       |
| Logo lockup, top-centre **or** bottom-right, raised when a footer exists     | 207 slides       | (551,39,181,76) / (1116,645,141,61)   |
| Interaction strip, full-bleed bottom, always exactly 100px tall at y=620     | 327 slides (41%) | (0,620,1280,100)                      |
| Page number, bottom-right                                                    | 116 slides       | (1104,640,77,55)                      |
| Left accent bar, objectives family                                           | 149 slides       | (0,0,16,720)                          |
| 16:9 media **left**, questions **right** (Artist Spotlight)                  | dominant         | media 427×240                         |
| Bilingual strip directly under its English twin                              | ~236 slides      | 700×61                                |
| Utility link ("lyrics / letra"), top-right                                   | 54 slides        | (1068,17,185,67)                      |
| Centred CTA ("Explore the Project Menu")                                     | 76 slides        | (419,355,457,125)                     |
| Objectives What/How/Why rows, label column left, body from x=240             | 41 slides        | rows at y 167/343/503                 |
| "Last 5" reset: title over body, centred                                     | 40 slides        | (297,164,707,183) / (297,364,707,183) |

Two facts from that corpus shape the design. First, **nothing is truly embedded** — there is not
one video, audio or OLE relationship in 76 decks; every video is a static thumbnail carrying a
hyperlink, so embed and link are forced onto the same object. That is the workaround our product
requirement replaces: we can render the real thing _and_ keep the canonical link. Second, only
three interaction types appear anywhere: free-response text (313), freehand drawing layered over
a chord chart or rhythm grid (24), and an embedded website (4). No multiple choice, no numeric,
no draggable. That is the MVP interaction set.

### The grid

Canvas 1280×720. Margin `M = 64`. Snap 8. Content safe area is x 64…1216, y 96…604.

**Chrome zones** are rendered from deck and slide flags and cannot be moved by a teacher:

| Zone         | Rect (x,y,w,h)  | Notes                                                                          |
| ------------ | --------------- | ------------------------------------------------------------------------------ |
| `accentBar`  | 0,0,16,720      | objectives family only, opt-in per preset                                      |
| `phaseChip`  | 64,32,256,56    | student phase label + accent dot; **visible unless `hidePhaseLabel === true`** |
| `logoTop`    | 552,24,176,72   | deck flag; auto-used when `logo: 'bottomRight'` collides with an interaction   |
| `pageNumber` | 1104,644,112,56 | inside the footer band, drawn above the strip                                  |
| `footer`     | 0,620,1280,100  | the interaction band; strip content at 64,636,928,68                           |

**Content zones** hold elements:

| Zone                | Rect (x,y,w,h)  | Family      | Holds                                             |
| ------------------- | --------------- | ----------- | ------------------------------------------------- |
| `utilityTopRight`   | 1032,32,184,56  | any         | one link element                                  |
| `title`             | 64,96,1152,104  | any         | title text                                        |
| `subtitle`          | 64,208,1152,72  | any         | prompt line                                       |
| `body`              | 64,288,1152,316 | body        | full-width text, checklist or interaction preview |
| `bodyShort`         | 64,288,1152,232 | bodyShort   | body shortened to make room for `tileRow`         |
| `tileRow`           | 64,536,1152,68  | bodyShort   | a row of link cards / Atlas cards (max 4)         |
| `left`              | 64,288,560,316  | split       | left column                                       |
| `right`             | 656,288,560,316 | split       | right column (32 gutter)                          |
| `mediaLeft`         | 64,288,560,315  | split       | 16:9 media, left                                  |
| `mediaRight`        | 656,288,560,315 | split       | 16:9 media, right                                 |
| `heroMedia`         | 292,200,696,392 | hero        | centred 16:9; replaces `subtitle` + `body`        |
| `rowA`              | 64,208,1152,120 | rows        | "What" — label column 160 wide, body from x=240   |
| `rowB`              | 64,352,1152,120 | rows        | "How" — auto-derivable from the Day's five cells  |
| `rowC`              | 64,496,1152,108 | rows        | "Why"                                             |
| `ctaCenter`         | 416,352,448,128 | cta         | centred call to action                            |
| `centerStackTop`    | 288,160,704,184 | centreStack | "Last 5" title                                    |
| `centerStackBottom` | 288,360,704,184 | centreStack | "Last 5" body                                     |

### Rules

1. **No content zone enters y ≥ 620.** A unit test asserts this for every zone and every preset,
   so it is a static guarantee rather than a runtime condition.
2. **The footer band is reserved on every slide**, not only when an interaction exists. Four
   reasons: a template that shifts between slides makes "standardized position" meaningless;
   adding an interaction later must never reflow the content above it; the band is never dead
   space because it carries the page number, the logo variant and — on the projector — the join
   code; and it keeps the zone table a single constant with no per-slide branch. The teacher's
   own decks already reserve it 41% of the time and manually raise the logo to clear it; we
   remove that manual step.
3. **Elements store `{zone, order, hidden?, z?}` — never `x/y/w/h`.** Rectangles are derived from
   the grid. This is what keeps layout data free of free text, which is what keeps `publishDay`'s
   whitelist projection trivially safe.
4. **Zone families are mutually exclusive** for the middle band: `body` · `bodyShort`+`tileRow` ·
   `split` · `hero` · `rows` · `cta` · `centreStack`. `title` and `utilityTopRight` combine with
   every family except `centreStack`; `subtitle` combines with `body`, `bodyShort` and `split`
   only, because `hero`, `rows` and `centreStack` all begin inside its band and replace it. (The
   teacher's objectives and "Last 5" slides carry a title and their rows, never a separate
   prompt line.) `validateLayout()` fails a slide that mixes families or pairs a zone with an
   excluded one, and every preset must pass it.
5. **Multiple elements in one zone stack vertically** in `order`, 16px gap. A zone declares its
   flow: `single` (a second element is a validation error), `column`, or `row` with a max.
6. **Text shrinks to fit and then clips.** Fixed zone height, `fontScale` clamped 0.5–2, overflow
   hidden with a clipped-text indicator in the editor and filmstrip. Authored positions stop
   being advisory — this replaces today's `minHeight` behaviour where a long bilingual title
   simply grows over whatever is beneath it.
7. **Media contain-fits its zone.** 16:9 is the default aspect because video is the dominant
   media in the corpus; the current 456×456 square default is wrong and goes away.
8. **Templates are zone assignments** — `{id, family, zones: Record<role, ZoneName>, chrome}`.
   "Reset to standard" re-applies the slide's preset. `deck.layoutLock` (default on) restricts
   re-zoning to preset switches; unlocked allows drag between zones. There is no freeform
   positioning in either mode.
9. **Interaction elements are valid only in `footer`.** A draw interaction may name a
   `drawTargetElementId`, and the drawing overlay is rendered at that element's zone rect —
   which is how the teacher's rhythm-grid and chord-chart annotation slides actually work.
10. **Bilingual text** uses a `secondary: 'stacked' | 'inline' | 'off'` render mode within the
    same zone; `stacked` is the default and reproduces the 700×61 strip under its English twin.
11. **Student devices** at ≥768px render the identical stage, contain-fit. Below that, a derived
    reflow in zone reading order: `phaseChip`, `title`, `subtitle`, `rowA–C`,
    `heroMedia`/`mediaLeft`/`left`, `right`/`mediaRight`, `body`, `ctaCenter`, `tileRow`,
    `footer`. The hand-written per-kind student branches are deleted.
12. **Migration from v1 rects** maps each legacy block to its nearest zone by rect centroid, then
    ignores the stored rect. Deterministic, idempotent, covered by golden fixtures. The legacy
    rect tables survive only as test fixtures.

### The element contract

```ts
type ZoneName = keyof typeof SLIDE_GRID;

interface SlideElementBase {
  id: string; // element uid; NOT the response join key
  zone: ZoneName; // enum token only — no free text in layout data
  order?: number;
  hidden?: boolean;
  z?: number;
  style?: {
    fontScale?: number;
    bold?: boolean;
    align?: 'left' | 'center' | 'right';
  };
}

/** What renders inline. Ids only — never a URL, never free text. */
type EmbedDescriptor =
  | SlideMedia // youtube | artistImage | globePreview |
  // globePathway | chordChart | scaleKeyboard
  | { type: 'image'; assetId: string }
  | { type: 'atlasCard'; ref: string }; // the info card that replaces LaunchTile

/** Where the content lives. Exactly one href per content element. */
type ContentHref =
  | { kind: 'atlas'; ref: string } // namespaced activityRef, resolved by
  // slides/resolveContentHref.ts
  | { kind: 'external'; url: string; host: string }; // https only, validated at author time

interface ContentElement extends SlideElementBase {
  kind: 'content';
  embed: EmbedDescriptor | null; // null => renders as a link card
  href: ContentHref; // REQUIRED
  label: LocalizedText;
  caption?: LocalizedText;
}

type SlideElement =
  | ({
      kind: 'text';
      role: 'title' | 'subtitle' | 'body' | 'label';
      text: LocalizedText;
      secondary?: 'stacked' | 'inline' | 'off';
    } & SlideElementBase)
  | ContentElement
  | ({ kind: 'checklist'; items: LocalizedText[] } & SlideElementBase)
  | ({
      kind: 'interaction';
      interactionId: string;
      reveal?: 'bars' | 'wall' | 'words' | 'scale';
      drawTargetElementId?: string;
    } & SlideElementBase);
```

**The invariant that delivers requirement 2:** `hrefForEmbed(embed)` is **total** over the
`EmbedDescriptor` union and never returns empty, so an element that has an embed can never lack a
link. An element with `embed: null` is a link card. There is no third state.

`hrefForEmbed` mappings: `youtube` → the external watch URL (with start time);
`artistImage` / `chordChart` / `atlasCard(song)` → the Atlas song route; `globePathway` →
the Globe pathway route; `globePreview` → the Globe route; `scaleKeyboard` → the Learn lesson
route for that mode and key; `image` → the href the teacher chose when placing it.

**Embedding policy.** Atlas content and YouTube embed live. **Every other external host renders
as a link card** — favicon or thumbnail, label, hostname, external indicator — and is never
placed in an iframe. `parseEmbeddableUrl(url)` returns a descriptor only for `youtube.com` and
`youtu.be`; everything else returns null.

**Opening policy.** `openHref(href, surface)`:

- teacher · present · projector → an in-app `LinkOverlay` with a "Back to lesson" bar. Atlas
  hrefs render the route inside the overlay; external hrefs show the enlarged card with "Open in
  new window" (`window.open`, `noopener`). **The projector never navigates away from the
  session** — that is why `PathwayGlobePreview`'s current in-SPA `<Link>` must go.
- student → a new tab, `rel="noopener noreferrer"`, with the external indicator.

**Enforcement sits at three points:** author time (`PickerResultList.tsx` and the link editor
both refuse an unsafe URL or a key collision), publish time (an exhaustive whitelist projection
that re-validates and throws on the write path), and render time (`openHref` refuses an href that
fails validation).

---

## Phase 0 — Ground truth: an honest, leak-free substrate

**Depends on:** nothing. **Size:** one session.

**Goal.** Make the existing product honest and safe to extend before any new field or feature is
added: an exact-key firewall that fails soft on read, versioned snapshots, no silent local mocks,
the two projector leaks closed, the contract docs under version control, and the handful of small
defects a teacher hits in the first five minutes.

**Why.** Every later phase adds slide fields, and today's substring matcher would hard-fail
Present on a field named `onClose` or `standardLayout`. Two data leaks reach the one screen the
whole class is looking at. And a teacher currently cannot tell a working live session from one
no student can join — the dashboard shows a green "connected" pill either way.

**Tasks.**

1. **Exact-key firewall.** In `publish/publishDay.ts` replace `FORBIDDEN_SUBSTRINGS` with
   `FORBIDDEN_KEYS` — the exact `CellRationale` field names: `assessment`, `standards`,
   `commonAnchors`, `selCompetencies`, `impactTags`, `cloRefs`, `cloText`, `cloIds`,
   `activityRefs`, `notes`, `initiationStyle`, `scaffoldLaneIds`, `createdBy`, `localContext`,
   `rationale`, plus the fields later phases add: `duplicatedFrom`, `score`, `feedback`,
   `rubricId`, `returnedAt`, `gradedAt`. Match `key === forbidden` case-insensitively, never
   `includes`. Keep a deprecated `FORBIDDEN_SUBSTRINGS` alias for one cycle —
   `slides/contentRefs.ts` and four test files import it.
2. **Fail soft on read.** Add `sanitizeSnapshot(snapshot) → {snapshot, stripped: string[]}`
   (structural clone dropping forbidden keys). The **write** path
   (`usePublishedDays.publishDayToClassroom` and `publishDayForUser`) still throws. Every
   **read** path calls `sanitizeSnapshot`, renders, and reports `stripped` to `src/telemetry/`:
   `assignments/AssignmentDayRunner.tsx` (which today blanks the whole lesson on any hit),
   `live/LiveSessionPage.tsx`, `live/ProjectorPage.tsx`, `PresentationMode.tsx`. A teacher in
   front of a class must never be blocked by a stray key — stripping it protects the student,
   blocking the lesson protects nobody.
3. **Snapshot versioning.** Add `snapshotVersion` to `PublishedDay`; normalize legacy records to
   1; re-project anything below the current version from its source Day when available, else
   sanitize in place. This is the mechanism P2 relies on when the deck shape changes.
4. **Value scanning.** `refFirewallCollision` in `contentRefs.ts` currently scans ref and label
   **text**, which blocks legitimate content — a song called "Tears of a Clown" is unpickable.
   Reduce it to a key-name check over the candidate object. `PickerResultList.tsx` is the caller
   and stays the single author-time gate.
5. **No silent mocks.** Delete the `catch {}` → `startLocal` fallback in
   `live/useStartClassroomSession.ts`. Return a discriminated result:
   `{transport: 'server', sessionId}` or `{transport: 'local', sessionId, reason: 'flag-off' |
'no-token' | 'network' | 'http-<status>'}`. Callers (`plan/PlanPage.tsx`,
   `slides/wizard/DeckWizardPage.tsx`) confirm before starting a local session ("Practice mode —
   this device only. Students cannot join."). Change `useSessionSync`'s `connectionStatus` union
   to `'connecting' | 'connected' | 'offline' | 'practice'` so a `local-sess-` id can never
   report `connected`, and add `live/ConnectionBadge.tsx` to the teacher dashboard, projector,
   student page and the Present button.
6. **Projector anonymous bucket.** `stripForProjector` removes `enrollmentId` and adds `anon`, but
   `applySocketMessageForUser` in `live/sessionsStore.ts` still buckets by
   `msg.enrollmentId` — so on the real socket every projector response lands under the key
   `undefined` and a 30-student class reveals one card. Branch on the stripped shape and bucket
   by `anon`. `ProjectorDeckView`'s reveal slot and `ParticipationPulse` count distinct keys.
7. **Presence leak.** `party.ts` `emitPresence` broadcasts `{enrollmentId, state}` to
   `['teacher','student','projector']` — the same identifier class `stripForProjector` exists to
   remove. Restrict the identified stream to `['teacher']`, send
   `{type:'presenceCount', joined, active}` to the others, and have the socket controller drop a
   presence body arriving on a student or projector client as defence in depth. Store presence in
   a side-map `RosterPanel` reads, so "N joined" stops meaning "N enrolled" and a disconnected
   student greys out.
8. **Contract docs.** Already restored in this change: `docs/classroom-v2/{openapi.yaml,
backend-directions.md, ws-protocol.md}` and `docs/classroom-announcements-contract.md`, with
   `docs/classroom-v2/CONTRACT-DELTAS.md` as the running list. Add the flag block to
   `src/constants/serverEndpoints.ts` for every capability later phases gate on, each with the
   doc-block convention already in that file.
9. **Phase chip default.** `SlideFrame.tsx:53` and `SlideFrameChrome.tsx:32` both gate on
   `slide.hidePhaseLabel === false`, and nothing in the codebase ever writes `false` — so the
   chip, the anchor of the whole standardized anatomy, is invisible on every freshly authored
   slide. Invert to render unless `hidePhaseLabel === true` and fix
   `SlideAppearanceMenu.tsx:129` to match.
10. **Small defects, all verified:** the sidebar "Office" item routes to `/teacher` instead of
    `/office`, so a teacher with one classroom can never reach the hub;
    `ProtectedPage.tsx` bounces an admin who is also a teacher out of the Office the sidebar
    offered them; `TeacherRoutes.assignments` is defined but never registered;
    `PreviewPage` renders the five phase cells instead of the deck the teacher just authored, and
    nothing links to it (`PlanPage`'s "Preview" button goes to Present); `ClassroomSelectionPage`
    calls `navigate()` during render instead of returning `<Navigate replace/>`;
    `plan/deckEditor/AssignPanel.tsx` is dead code (zero importers) — delete it, P6 rebuilds the
    flow properly.
11. **Export repair.** `ClassroomSettingsDialog`'s "Download my plan" reads
    `ma-teacher:annualPlan:v1` from localStorage, but `idbMirror` migrated that value into
    IndexedDB and called `clearLegacy()` to remove the key — so the only backup a teacher has
    silently omits the entire Unit tree. Route export and restore through each store's mirror.
12. **Prod-safety script.** Add `verify:prod` to `package.json`: build, then grep `dist/` for
    dev-bypass and practice-mode markers.

**Backend needs.** `DELETE /classrooms/{id}` added to the spec (the client already calls it raw);
the server's Rule 1 check switched to exact-key matching. Both recorded in `CONTRACT-DELTAS.md`.

**Definition of Done.**

- A key named `onClose` or `standardLayout` passes the firewall; `cloRefs` still fails on publish;
  a stored snapshot containing a stray `notes` key **presents successfully** with the key absent
  from the render and a telemetry event emitted.
- A song id containing `clo` (e.g. `tears_of_a_clown`) is pickable and publishes.
- Starting a session with no token or a failing POST shows the practice-mode confirmation; the
  dashboard badge reads practice, in amber; no code path returns a `local-sess-` id while
  reporting `connected`.
- Unit test: `applySocketMessageForUser` with a stripped message (no `enrollmentId`, has `anon`)
  buckets by `anon`; 30 distinct anons produce 30 cards, not 1.
- Party test: a presence body with `enrollmentId` never reaches a projector or student socket.
- Every freshly authored slide shows its phase chip; the sidebar reaches `/office`; an
  admin-and-teacher account can open it; Preview renders the deck and is linked from the Lessons
  card.
- Download my plan → clear site data → Restore reproduces Units, dayIds and school-calendar
  exceptions (round-trip test).
- `npm run lint`, `npm run test:unit` and `npm run verify:prod` green.

---

## Phase 1 — Ownership and storage

**Depends on:** P0. **Size:** two sessions.

**Goal.** One role model backed by the co-teacher API that already exists, Days scoped to their
classroom with a versioned migration, and one repository seam through which all curriculum
reads and writes pass — local now, remote in P10.

**Why.** Two structural facts block almost everything downstream. A complete co-teacher API
(`GET`/`POST`/`PATCH`/`DELETE /classrooms/{id}/teachers`, roles `viewer|editor`) sits generated
with **zero call sites**, while the invite dialog POSTs to `/classrooms/{id}/invitations`, a
route that does not exist — so the dialog always fails, and seven places hard-code
`c.teacherId === me.id` as the definition of "my class", which would bounce an accepted
co-teacher out of every tab anyway. Separately, Days live in one global bucket with no classroom
id while annual plans are per classroom: the Calendar's Reset wipes every classroom's Days, and
orphan Days are adopted into whichever classroom opens Lessons first. Multi-section teachers are
the core persona, so that is the first thing that breaks in real use.

**Tasks.**

1. **Co-teacher hooks** in `src/hooks/data/classrooms/`: `useClassroomTeachers` (GET),
   `useAddClassroomTeacher` (POST `{email, role}`), `useUpdateClassroomTeacherRole` (PATCH),
   `useRemoveClassroomTeacher` (DELETE), all over the **generated** client. Delete the three
   hand-rolled `/invitations` hooks and `classroomInvitations.types.ts`.
2. **One role hook.** `useClassroomRole(classroomId) → 'owner' | 'editor' | 'viewer' | null` and
   `useMyClassrooms()` = owned + co-taught. Replace all seven ownership checks:
   `ClassroomWorkspaceLayout`, `ClassroomDeepPageLayout`, `ClassroomSelectionPage`,
   `ClassroomStudentsPage`, `ClassSelector`, `TeacherLanding`, `ClassroomPickerPage`. A grep for
   `teacherId === me.id` returns zero outside the hook. Add `useCanEditClassroom` and gate every
   mutating control: a viewer gets a read-only editor and no Go Live.
3. **Invite dialog.** `InviteTeacherDialog` gains an Editor/Viewer role picker and calls the real
   endpoint. The People tab's Teachers section becomes a real list (owner + co-teachers, role
   badge, change role, remove) instead of one card synthesized from `useMe`.
4. **Day scoping.** `Day.classroomId`; `useLocalPlan` bumps to schema version 2 with
   `migratePlanV1toV2(plan, annualStore)`: a Day's classroom is the one whose `Unit.dayIds`
   references it, else the single classroom if only one plan exists, else unassigned. Nothing is
   deleted; the v1 blob is kept at `.bak`. `listDays`, `clearAllDays` and
   `useEnsureLessonUnits`'s orphan sweep all take a `classroomId`. `AnnualPlanPage.handleReset`
   is scoped. Unassigned Days surface in a visible "not in a classroom" tray, never silently.
5. **Repository seam.** `src/features/classroom/persistence/CurriculumRepository.ts` (new) — one
   interface for `listDays`, `getDay`, `saveDay`, `deleteDay`, `getAnnualPlan`, `saveAnnualPlan`,
   `listSavedLessons`, `getLibrary`, `putLibrary`, `exportClassroom`, `importClassroom`, plus a
   `subscribe` channel that becomes the only cross-tab notification path. One local adapter over
   `idbMirror` now; P10 adds the remote one behind a flag. Every consumer moves onto it in this
   phase so P10 changes no call sites.
6. **Migration harness.** `src/lib/local-store/migrations.ts` (new) with `runMigrations(store, steps)`
   and a golden-fixture pattern under `__fixtures__/`. P2's much larger deck migration reuses it.
7. **Per-classroom config.** `useTeacherConfig` keyed by classroom (`ma-teacher:settings:v2` =
   `Record<classroomId, TeacherConfig>`) with a global default and a migration. Add `language` so
   the calendar's language stops resetting on every navigation. `AgePreset` is
   middle/high/college — per-section configuration is exactly what it is for.

**Backend needs.** `myRole` on `GET /classrooms` and `GET /classrooms/{id}`, plus co-taught
classes in the list — without it a co-teacher cannot see the class they were added to. Confirm
whether `POST /classrooms/{id}/teachers` accepts an unregistered email as a pending invite.

**Definition of Done.**

- Invite a co-teacher as editor through the real endpoint (mocked in tests); they see the class
  with an "Editor" chip and can open the Day editor; a viewer cannot Go Live. Zero
  `teacherId === me.id` outside `useClassroomRole`.
- Two classrooms with Days: Reset in A leaves B intact; opening Lessons in B never shows A's
  Days; the migration test covers the referenced, single-classroom and orphan cases and keeps a
  `.bak`.
- Every curriculum read and write goes through the repository (grep gate: no `useLocalPlan`
  storage access outside the adapter).
- Export → clear site data → Restore round-trips a classroom including Units, dayIds and
  exceptions.
- `npm run lint` and `npm run test:unit` green.

---

## Phase 2 — The standardized slide grid

**Depends on:** P0, P1. **Size:** two sessions. **This is the largest single change in the
document.**

**Goal.** Replace the closed eight-key block layout with an ordered element array where every
element is assigned to a named zone of one `SLIDE_GRID`; make `SlideStage` the **only** renderer
for all six slide kinds on all four surfaces; convert the competing rect tables into zone
presets; migrate existing decks deterministically.

**Why.** This is requirement 1. Today only `ContentSlide` mounts `SlideStage` — the other five
kinds render a flow layout on the projector and the student device, so a teacher arranges a
question slide, it saves, it publishes, and the class screen silently ignores it. Worse, inside
one live session the teacher's Present view goes through `SlideStage` (freeform) while the
projector goes through the per-kind flow components, so the two screens disagree. Meanwhile
there are three competing layout sources (`defaultLayoutForKind`'s two `hasMedia` branches, eight
hand-tuned tables in `slideTemplates.ts`, and templates that set no layout at all), and the
defaults self-collide: `body`, `interaction` and `sideMedia` all occupy the same band at x=64,
and `launchTiles` and `resetChecklist` share an origin — inside the footer band the real decks
reserve.

**Tasks.**

1. **`slides/slideGrid.ts`** (new, pure): `SLIDE_CANVAS`, `M`, `SAFE_AREA`, `FOOTER_BAND`,
   `SLIDE_GRID` as a `Record<ZoneName, ZoneSpec {rect, role: 'chrome'|'content'|'footer', flow:
'single'|'column'|'row', max?}>`, `ZONE_NAMES` (the allow-list the publish projector
   iterates), `ZONE_FAMILIES`, `validateLayout(slide) → issues[]`, `resolveElementRects(slide)`,
   `resetToPreset(slide, presetId)`, `nearestZone(rect)`.
2. **`slides/types.ts`**: the element union from §Standardized Slide Grid. `SlideCommon` gains
   `elements: SlideElement[]` and `presetId?`; `layout` becomes deprecated and read-only.
   `SlideDeck` gains `layoutLock?: boolean` (default true). **The `kind` union is untouched** so
   the firewall and the exhaustive switches stay as they are.
3. **`slides/migrateDeckV1.ts`** (new): `title` → text/title in `title`; `prompt` →
   text/subtitle in `subtitle`; `body` → text/body in `body`; `media` → content in `mediaLeft`,
   `mediaRight` or `heroMedia` by centroid and aspect; `sideMedia` → content in the opposite
   column; `launchTiles` → one content element each in `tileRow`; `resetChecklist` → checklist;
   `interaction` → interaction in `footer`. Resolve by `nearestZone` on the **stored** rect so a
   block the teacher dragged right lands in `right`, not in the preset default. Run lazily in
   `resolveElements(slide)` so old decks and old published snapshots render, and write the
   migrated deck back on the next save. Golden fixtures from `fixtures/demoDay.ts`, the song
   session and genre lesson templates; assert idempotency.
4. **`SlideStage.tsx` becomes the one renderer** for every kind and surface: zones positioned
   absolutely from the grid, each a flex column stacking its elements by `order`; text autofit
   then clip; media contain-fit; chrome from `SlideChrome`; editor mode is drag-to-zone (the
   nearest valid zone highlights) with **no resize handles**. Reduce
   `ContentSlide` / `MediaSlide` / `QuestionSlide` / `CheckInSlide` / `ExitPollSlide` /
   `AppRouteSlide` / `ShowcaseSlide` / `StudioCollabSlide` to element-node maps consumed by the
   stage — the shape `ContentSlide` already uses. `SlidePresentBody` drops
   `slideToPresentContent`, which is what makes `body` visible in the editor, the filmstrip and
   Present for the first time. Delete `SlideFrame`'s flow path and `presentation/Board.tsx`
   (zero importers). Point `DeckPreview` at `useStageScale` instead of its own width-only math.
5. **Presets** in `slides/templates/presets.ts`, derived from the real decks: artist-spotlight,
   turn-and-talk, project-menu CTA, chord-chart, personal-project-time, objectives (rows +
   accent bar), last-5 (centre stack), greeting/check-in, group-practice, share-day,
   stations-rotation, tone-set, rhythm-grid (hero + footer draw), plus title, section, media and
   question. `slideTemplates.LAYOUTS` is deleted; `songSession`, `genreLesson`, `deckFromCells`,
   `fromPlannedDay` and `newSlide` all emit `presetId` + elements. The Idea Bank's seven-slide
   spotlight template — shipped as data today and never applied — becomes a real deck template,
   and the ten-slide arc of the teacher's own "Template General Lesson Slide Deck" becomes the
   default new-Day deck.
6. **Publish.** `projectElement` is an exhaustive switch over element kinds with named copies;
   `zone` is validated against `ZONE_NAMES`, never `Object.keys`; `projectDeck` carries
   `presetId` and `layoutLock`; `SNAPSHOT_VERSION` → 2.
7. **Student surface.** `StudentSlideView` renders the same stage contain-fit at ≥768px, else the
   derived reflow. Delete the hand-written per-kind student branches and fold
   `WatchTheScreen.tsx` in as a zone-aware element.
8. **Editor.** "Reset to standard" per slide and a deck-level layout lock in
   `EditorSettingsMenu`; `HiddenComponentsTray` lists hidden elements;
   `SlideThumbnail`/`lessonThumbnail` render from elements; `duplicateSlideAt` re-keys element
   ids **and** interaction ids.

**Backend needs.** None beyond the snapshot key allow-list recorded in `CONTRACT-DELTAS.md`
(P2 row).

**Definition of Done.**

- `slideGrid.test.ts`: every zone rect is inside the canvas; no content zone crosses y=620; every
  preset occupies exactly one family; no two occupied zones in a preset overlap.
- A legacy Day migrates and renders by the same zone occupancy in the editor, Present, projector
  and student surfaces. A Playwright three-tab run screenshots teacher-Present against projector
  for **each of the six kinds** and they match.
- `migrateDeckV1.test.ts`: golden fixtures round-trip with all text, media, tiles and interaction
  ids preserved; running it twice is a no-op.
- Body text authored by a template is visible in the editor, the filmstrip and Present.
- Drag a title onto `mediaRight`: it snaps; dragging into an excluded family is refused with a
  reason; "Reset to standard" restores the preset; with the lock on, per-slide re-zoning is
  disabled while preset switching still works.
- `publishDay` round-trips `elements`, `presetId` and `layoutLock`; a forbidden key inside an
  element is caught; an unknown zone is dropped.
- Student view at 1024px shows the scaled stage; at 390px the reflow in zone order.
- Lint (including exhaustive switches with no `default`) and vitest green.

---

## Phase 3 — Embedded and linked

**Depends on:** P2. **Size:** two sessions.

**Goal.** Requirement 2, end to end. Every content element carries `{embed | null, href, label}`.
Atlas content and YouTube embed live and always expose their canonical link; every other external
URL renders as a link card, never an iframe. Links open in an in-app overlay on teacher, present
and projector surfaces and in a new tab on student devices.

**Why.** Today no embed carries a link at all: YouTube, artist image, globe preview, scale
keyboard and chord chart all render zero hrefs. The only link primitive is `LaunchTile` — content
slides only, Atlas refs only, always `target="_blank"`, which cold-boots the whole SPA mid-lesson.
The one exception, `PathwayGlobePreview`'s hand-built in-SPA `<Link>`, navigates the **projector**
out of a live session. Four of eight picker tabs emit a link with no embed. `chordChart` is a
declared media type with no producer and a "Coming soon" placeholder. And the teacher's decks
carry 1300+ hyperlinks — YouTube 334, Google Translate 94, Canva 78, Drive 60, drumbit 44,
musicca 25 — with **zero** links into Music Atlas, which is the gap this phase closes from both
ends.

**Tasks.**

1. **`slides/contentElement.ts`**: the types from §Standardized Slide Grid, plus
   `hrefForEmbed(embed)` — total over the union, exhaustive switch, no default.
2. **`slides/linkPolicy.ts`**: `validateExternalUrl(url)` (https only, no credentials, no
   `javascript:`/`data:`, ≤2048 chars, normalized hostname); `parseEmbeddableUrl(url)` returning
   a descriptor for `youtube.com`/`youtu.be` **only**; `KNOWN_HOSTS` with local icons for the
   hosts the corpus actually uses so a card is recognizable without a network fetch.
3. **`slides/parts/ContentElementView.tsx`**: embed present → the embed renderer plus a persistent
   open affordance bound to the href (corner chip on media, whole-surface on a card); embed null
   → `LinkCard` (icon, label, hostname, external indicator). Replace
   `PathwayGlobePreview`'s bespoke `<Link>` with the shared affordance.
4. **`presentation/openHref.ts` + `LinkOverlay.tsx`**: the opening policy from the contract. The
   overlay keeps the session route mounted so the socket stays connected. If rendering an Atlas
   route inside the overlay proves unstable (heavy providers, the Globe), fall back to a
   same-origin iframe for Atlas hrefs only — still never for external ones.
5. **Song insertion emits three independent elements** — the YouTube embed with its watch href,
   the artist/info card with the Atlas song href, and the chord-chart element — so deleting the
   card leaves the link and vice versa. This is the explicit teacher request in the Stage 1 plan.
6. **`LaunchTile` becomes a content element** with `embed: null` and an Atlas href;
   `LaunchTileRowEditor` becomes the `tileRow` editor. `resolveModuleUrl` returns
   `{kind: 'exact' | 'fallback', href}` so the editor can warn on an unresolvable ref instead of
   silently landing the class on a module dashboard — today that fallback branch means
   `LaunchTile`'s "Configure in Settings" state is unreachable dead code.
   `applySeed.atlasToTiles` currently mints `activityRef: ''`, which can never resolve; thread
   the seed's `resourceId` through instead and surface anything still unbound.
7. **Every picker tab emits embed + href.** Theory gains the scale keyboard (already built),
   Genre a profile card, Studio a template preview, Eras a timeline strip; each keeps its Atlas
   href. `PickerResultList.tsx` stays the single author-time gate and now also validates hrefs.
8. **`SlideMediaEditor`** accepts a pasted YouTube **URL** (parse the id and start time) rather
   than demanding a raw video id, and any https URL becomes a link element.
9. **Publish.** `projectContentElement` — exhaustive over `embed.type` and `href.kind`; the
   external URL is copied only after re-validation; the write path throws, the read path
   sanitizes.

**Backend needs.** Optional `GET /link-preview?url=` for card titles and thumbnails; the client
degrades to a host label without it.

**Definition of Done.**

- Insert a song: three elements appear; delete any one and the others still resolve; all survive
  publish.
- Paste a YouTube URL → live player on the projector, thumbnail plus an open chip elsewhere.
  Paste a Google Doc URL → a link card with icon, label and external indicator on every surface,
  and **no iframe anywhere in the DOM** (assert in the test).
- During a live session, clicking a Globe pathway link on the projector opens the overlay with
  "Back to lesson" and `connectionStatus` is unchanged (assert it in the Playwright driver); on
  the student tab the same link opens a new tab with `rel="noopener"`.
- A `javascript:` or plain-`http:` href is refused at author time with the picker's warning UI,
  and refused again by `publishDay`.
- **Every** member of the embed union has a non-null `hrefForEmbed` result that resolves to a
  registered route — one table-driven test, no exceptions.
- Lint and vitest green.

---

## Phase 4 — The editor

**Depends on:** P2, P3. **Size:** two sessions.

**Goal.** Turn the deck editor into the authoring surface the mockups describe, on top of the
settled model: one add-element menu, a preset gallery, every slide kind creatable, undo/redo with
keyboard shortcuts, a picture element, a Preview that shows the real deck, per-slide timers and a
CLO-response interaction.

**Why.** Today `newSlide()` has exactly one caller, with the literal `'interaction'`; everything
else comes from a template that always returns `kind: 'content'`. So a teacher cannot create a
media, app-route, studio-collab or showcase slide, cannot convert one kind to another, and the
whole kind-change branch of `updateSlideAt` is dead from the editor. There is no undo (one
`useState` with a 500ms autosave — nothing to undo to), no multi-select, no alignment guides, no
keyboard shortcuts at all, and `snap()` exists in `slideLayout.ts` but is never imported. The
only way to get a picture on a slide is a song's artist portrait. `timerSec` publishes but no
control sets it.

**Tasks.**

1. **`AddElementMenu.tsx`** consolidating `AddSlideMenu`'s content half, `ChooseContentButton` and
   `ContentPickerDialog` into six element types with a default zone each: Text, Picture, Link,
   Song, Activity, Student interaction. One predictable path to "put a thing on this slide".
   `AddSlideMenu` keeps slide presets only.
2. **Preset gallery and kind switcher.** Every one of the six kinds is creatable; converting a
   kind runs `preserveLayoutOnKindChange`'s successor over zones.
3. **Picture element.** `{type: 'image', assetId}` with an `AssetRepository` seam: a local IDB
   adapter now (blobs under `ma-teacher:assets:v1`, object URLs), a remote adapter behind
   `SERVER_ASSETS_ENABLED` mirroring the shipped studio-assets three-step flow. **A local-only
   image is visible to the teacher and not to students** — badge the element and warn at publish
   time listing unreachable assets, or a teacher will build a lesson around pictures nobody can
   see. `react-dropzone` and `react-easy-crop` are already dependencies.
4. **Undo/redo.** `useDeckHistory` — a command stack over the deck operations, 100 steps,
   Cmd/Ctrl+Z and Shift+Z. Autosave debounces off the reducer state instead of raw `useState`.
5. **Shortcuts.** Delete removes the selected element, Cmd+D duplicates the slide, arrows move
   the selection through zones in reading order, `/` opens the add menu. Document them in
   `EditorSettingsMenu`.
6. **Filmstrip** grouped by phase with the student label on each group (Process steps arrive in
   P8). Reorder uses the native HTML5 pattern from `annual/calendarDnd.ts` — **not** dnd-kit,
   which is not a dependency. Today reorder is one-step chevrons only.
7. **Preview.** `PreviewPage` renders the deck through the stage in student-paced mode with a
   stage/reflow toggle, and `EditorTopBar` links to it. (P0 made it render the deck; this makes
   it a real rehearsal surface.)
8. **Per-slide timer** control in `SlideAppearanceMenu`, writing `timerSec`.
9. **CLO-response interaction.** Pick a CLO, its sentence stem becomes the student prompt, then
   choose Public (anonymous on the projector) or Private (teacher only). The CLO record,
   standards and rationale stay teacher-only — only the stem text crosses, which is the settled
   decision. Today CLOs are reachable only from the teacher-only rationale panel with no bridge
   to an interaction at all.
10. **Text controls.** Autofit shown as S/M/L in `TextFormatMenu`, and the bilingual
    `secondary` mode toggle.

**Backend needs.** The classroom asset trio, behind `SERVER_ASSETS_ENABLED`.

**Definition of Done.**

- Every slide kind is creatable and convertible from the editor; `AddElementMenu` is the only
  add path.
- Place a library image in `mediaLeft`: it renders contain-fit on all four surfaces, carries an
  href, and projects. The upload path works against a mocked signed-upload adapter and is hidden
  when the flag is off; a local-only image is badged and warned about at publish.
- `useDeckHistory` round-trips 20 mixed edits; shortcuts documented and working.
- A CLO stem becomes a student prompt; the CLO record never appears in a snapshot (firewall test).
- Preview renders the authored deck in both stage and reflow modes.
- Lint and vitest green.

---

## Phase 5 — The cross-device live classroom

**Depends on:** P2, P3. **Size:** two sessions.

**Goal.** Students on their own devices find the live class, load the slides, follow the teacher,
answer, and restore after a reload; the projector shows correct anonymized aggregates. Every
server dependency is flagged and, until it ships, says so.

**Why.** This is the Pear Deck half of the flagship loop and today none of it crosses a device.
`POST /publish` has no GET, so the deck never reaches a second account and the student falls
through to a legacy branch that prints "No interactions on this phase yet". Discovery is
hard-disabled. The session PATCH state union has no `slideIndex`, which is precisely what
"students follow the teacher's slide" means. PartyKit points at localhost with both its secrets
absent. The server session carries a join `code` that nothing displays, while the roster panel
tells teachers to "share the join code". A student's in-session work lives only in that tab's
`sessionStorage`. And the lock screen is a `pointer-events: none` overlay a student can simply
navigate away from.

**Tasks.**

1. **Published-day read path.** `src/lib/published-days/api.ts` (new) behind
   `SERVER_PUBLISHED_DAYS_ENABLED`; `usePublishedDays` gains a read-through
   (local mirror → server → sanitize → cache). `LiveSessionPage`, `AssignmentDayRunner` and
   `ProjectorPage` render an explicit "slides not available on this device" state naming the
   missing capability rather than the legacy fall-through.
2. **Discovery** via an optional `liveSessionId` on `GET /classrooms` — the approach
   `serverEndpoints.ts` itself recommends, because it costs zero extra requests where restoring
   the poll costs one per classroom per interval. `useClassroomLiveSession` exposes
   `source: 'server' | 'local'` and the banner shows it.
3. **State union.** Send `slideIndex`, `pairs`, `showcase`, `timer` and `media` through PATCH when
   `SERVER_SESSION_STATE_V2_ENABLED`; otherwise queue locally and say once per session that slide
   controls are local. The party already routes all of these.
4. **Backfill.** `GET .../responses` (teacher identified, `?mine=1` for a student, server-anonymized
   for the projector) and positions, called on `hello`. Without this a teacher who reloads, opens
   the projector late, or shares an interaction after students answered sees nothing. **The
   server's anonymization must use the same salt as the party's `stripForProjector`** or reveals
   double-count after a projector reload.
5. **Join code and QR** on the teacher dashboard and in the projector footer band when the slide
   has no interaction (`react-qr-code` is already a dependency), plus a join-by-code route.
6. **Real lock.** A route guard while `state.locked` that re-asserts on navigation, with the
   actual classroom and teacher names instead of the hard-coded "Classroom" and "your teacher".
7. **Student restore** from the responses adapter on connect, replacing the `sessionStorage`-only
   cache.
8. **PartyKit deployment**: `VITE_PARTYKIT_HOST`, `PARTYKIT_WEBHOOK_SECRET` and
   `MUSIC_ATLAS_API_URL` documented in `.env.example` and the backend brief; `useSessionSync`
   refuses to report `connected` until the party's `hello` arrives.
9. **Projector token** so a podium display can join without signing in the teacher's account.
10. **Retire the legacy deck-less path** once every Day gets a deck at publish
    (`deckFromCells` when absent), so the live surfaces stop forking.

**Backend needs.** The P5 block of `CONTRACT-DELTAS.md` — published-day GET (the most
load-bearing row in the document), `liveSessionId`, the widened state union, responses and
positions, join-by-code, projector token, heartbeat expiry, and the PartyKit deployment. Plus the
open question: **what role does `POST .../authorize` return when a teacher's token requests
`projector`?** If it answers `teacher`, the projector receives identified responses and Rule 2 is
bypassed on the class screen. Answer it before flipping any flag.

**Definition of Done.**

- Three-tab loop: the teacher navigates, student and projector follow; with the real stripped
  shape the projector shows N cards for N responses.
- With every flag off, the dashboard shows the practice badge and the student page names the
  missing capability; flipping one flag changes the code path and nothing else (adapter tests
  with a mocked fetch).
- Reloading the student tab restores answers and gated-slide state.
- Presence never reaches the projector; the roster greys a disconnected student.
- Join code and QR visible; a locked student cannot navigate away.
- Every P5 delta is written into `openapi.yaml`. Lint and vitest green.

---

## Phase 6 — Assignments reach students

**Depends on:** P5. **Size:** two sessions.

**Goal.** A teacher assigns a Day to all or a chosen subset; a student opens it on their own
device as the same standardized deck, self-paced; answers persist; the progress grid shows names
and true not-started counts.

**Why.** Every student currently reads and writes progress under the hard-coded enrollment id
`local-preview`, so their own status can never match a server row. The runner renders the five
phase cells and ignores the deck entirely, so a teacher who builds a deck and assigns it gets a
student experience that looks nothing like the lesson. Per-interaction answers never leave the
browser, which makes the response dashboard and the CSV structurally empty in production.
Assignments have no targeting field at all — "assign to specific students" is the most-used
differentiation lever an in-school teacher has. And the teacher-facing assignments page is
unroutable dead code.

**Tasks.**

1. **Real identity.** `useMyEnrollmentId(classroomId)` from `useEnrollments`; delete
   `LOCAL_ENROLLMENT_ID` from all four files that redeclare it, keeping a clearly labelled
   preview enrollment for the dev bypass only. A student with no enrollment gets an explicit
   "not enrolled" state — never a fabricated id.
2. **Deck-mode runner.** `AssignmentDayRunner` walks `snapshot.deck` through the stage in
   student-paced mode with gating, falling back to cells only when a snapshot has no deck.
3. **Async responses** through `src/lib/assignment-responses/api.ts` (new) behind
   `SERVER_ASSIGNMENT_RESPONSES_ENABLED`, with a labelled local fallback.
4. **Assign from the Day.** The editor's top bar and the Lessons card publish the Day (reusing
   the id by `sourceRef` and reconciling duplicates) and open the composer prefilled.
5. **Targeting** `{mode: 'all' | 'subset', enrollmentIds[]}`, plus points, topic and attachments.
   **Enforce server-side** — client-side filtering leaks the existence of an assignment to
   students it was not assigned to. Until the flag is on, store it in a local sidecar and say
   that targeting is not yet enforced.
6. **Classwork tab** registered at last, grouped by Unit. Denominators come from the active
   roster, not from respondents; the progress grid backfills `not_started` rows and prints
   student **names** instead of raw enrollment ids.
7. **Enable the `atlas` assignment kind** — the model, the server payload and the completion
   plumbing all exist; only a client flag holds it off. It is the cheapest path to auto-graded
   work.

**Backend needs.** `GET /enrollments/me`; assignment responses POST and GET; targeting, points,
topic, attachments on the assignment payload; `not_started` materialization.

**Definition of Done.**

- A student opens an assigned deck Day, sees the P2 stage self-paced, and their answers survive a
  reload; the progress row is under their real enrollment id.
- The teacher grid lists every active student by name; "2 of 30 turned in" is correct against a
  30-student fixture.
- An excluded student does not see a subset-targeted assignment.
- `assignmentsLoop.test.ts` covers publish → assign → open → answer → progress with a mocked
  adapter. Lint and vitest green.

---

## Phase 7 — Grades, review and records

**Depends on:** P6. **Size:** two sessions.

**Goal.** The Grades tab becomes a students × assignments matrix with scores, a light rubric,
private feedback and a return action; live responses can be scored into it; a To-review queue
exists; session reports and attendance survive a change of device.

**Why.** The Grades tab is 91 lines listing per-assignment counts whose denominator is
respondents, so a 30-student class where two finished reads "2 students". The progress record
carries no score, grader, comment or returned timestamp. Session reports and CSV exports read the
teacher's own browser, so the class's entire record evaporates on a lab machine. And the
curriculum-coverage percentages are the signed-in **teacher's** own progress, because no
classroom-scoped progress endpoint exists — the source says so in a comment.

**Tasks.**

1. **Gradebook model.** `GradeRecord {assignmentId, enrollmentId, score?, maxPoints?, rubric?,
feedback?, gradedAt?, returnedAt?, late?}` and a light `Rubric {criteria[{label, levels[],
cloRef?}]}` in the teacher library. Add `score`, `feedback`, `rubricId`, `returnedAt` and
   `gradedAt` to `FORBIDDEN_KEYS` in the same commit — feedback is teacher-only.
2. **`ClassroomGradesPage`** becomes the matrix: rows from the active roster, columns from
   assignments grouped by Unit, inline score and feedback entry, a return action, per-assignment
   average and a CSV export. `AppRouteProgressStrip.tsx` is the existing prior art for a
   roster × state grid.
3. **To-review queue** — turned in and unscored, across assignments — on the Overview tab and
   rolled up across classes on the Office hub.
4. **Score a live response** from the session dashboard.
5. **Durable reports.** `SessionReportsListPage` and `SessionReportPage` read from the server
   first and the local mirror second, with a source badge. The CSV omits teacher-only check-in
   values unless explicitly included, and says so.
6. **Attendance** derived from join and presence events, surfaced on People.
7. **Honest coverage.** `buildCurriculumCoverage` consumes a classroom-scoped progress endpoint
   behind a flag and labels the per-account fallback for what it is.

**Backend needs.** Graded fields on progress; an optional gradebook matrix; the session list;
grading a live response; attendance; classroom-scoped progress; an optional rubric resource.

**Definition of Done.** The matrix renders 30 students × N assignments with correct denominators;
a score plus feedback persists and Return marks it returned; feedback never appears in any
student-facing selector (firewall test); the To-review queue lists unscored turned-in work; a
report on a fresh browser profile reads from the mocked history adapter, and with flags off says
"local records only". Lint and vitest green.

---

## Phase 8 — The curriculum spine

**Depends on:** P1, P4. **Size:** two sessions.

**Goal.** Duplicate and Copy-To, the four Processes with the settled labels, real Unit handling, a
tray for unscheduled Days, standards that actually propagate, and the flat Curriculum Warehouse.

**Why.** Building a year means copying and varying lessons, and today every Day is authored from
scratch — there is no duplicate-a-Day anywhere. The four Processes are unmodelled; the only trace
is `InitiationStyle`, a five-value tag on teacher-only rationale that does not even include
Standards-Based. `phases.ts` still ships "Share" and "Reflect" where the settled labels are
Present and Respond, with Observe as a label on MODEL steps. `addCustomUnit`, `renameUnit`,
`deleteUnit` and `clearPlan` are implemented with **zero callers**, so a teacher is locked into
24 canonical Units. And the Standards Alignment summary — the artifact a teacher hands an
evaluator, and the stated payoff of the whole curriculum layer — renders blank out of the box
through four independent holes.

**Tasks.**

1. **`plan/duplicateDay.ts`** — deep copy with a fresh Day id, fresh slide and element ids,
   **re-keyed interaction ids** (build on `duplicateSlideAt`, which already does this correctly:
   interaction ids are the response join key, so a naive copy silently merges two lessons' data),
   `scheduledDate` per target, `sourceSeedId` preserved, `duplicatedFrom` set (teacher-only,
   already in `FORBIDDEN_KEYS` from P0).
2. **`CopyToDialog`** — one date, chosen weekdays, every meeting day until an end date, and
   optionally attach to a Unit; a result list of what was created. Reachable from the Day header,
   the calendar and the Lessons list. Each copy is independent.
3. **`content/processes.ts`** — the four Processes as ordered steps, each mapping to a `PhaseKey`
   and a student label, per the mockup guide's table. Default the four open mappings
   (DEMO/PRACTICE → Practice, CONNECT TO CONTEXT → Respond, APPLY SKILL → Create, two same-label
   steps → one section) as named constants so they are one edit to change. `Day.processId`
   defaults to Standards-Based. Applying a Process to a Day with content offers remap, append or
   cancel. Slides follow the Process's order; the filmstrip groups by step; students see the
   phase label, never the step name.
4. **Student labels.** Share → Present, Reflect → Respond, and `Observe` as a slide-level label
   token projected through publish so the chip can show it. **Not a sixth phase** — `PHASES` is
   untouched, so no server change and no taxonomy churn.
5. **Unit handling.** Wire the dead CRUD into a Unit edit dialog (create, rename, delete,
   re-theme). Replace the fragile `unitId.startsWith('unit-<slug>-')` template binding with a
   stored `templateSlug`. Dedupe stubs on a stored stub slug rather than the Day label, so
   renaming a Day stops resurrecting its stub as a duplicate suggestion. Decide Week explicitly:
   either build it as an optional layer with `dayIds`, or delete the type — it is write-only dead
   data today and the calendar owes three states (Days only, Units + Days, all three layers).
6. **Calendar.** An unscheduled-Day tray with drag-to-date (overflow stubs and any Day with no
   date are invisible today); a Process badge on Day chips; a choice about re-homing a Day
   dragged into another month's Unit.
7. **Standards propagation** — the four holes, all verified: `seededDayFromStub` writes no
   rationale, so all 240 canonical Days carry empty standards; `PHASE_RATIONALE_DEFAULTS` is five
   copies of empty arrays; `applySeedToDay` never copies the seed's own top-level `standards`;
   and `insertActivityIntoCell` omits `activity.standards` and `impactValues`. Fix all four,
   deduplicating per Day so one activity in three phases does not count three times.
8. **The flat Warehouse** at its own route: Processes, Activity Bank, CLO Bank, Project Menu,
   Frameworks and Saved Lessons, **all visible from the top level** — the banks are reachable
   only as drawers nested inside specific editors today, which is exactly what the flat-Warehouse
   decision forbids. Add the create-your-own forms for CLOs, themes and seeds whose store
   functions already exist with zero callers. The banks stay openable as a drawer from the editor.

**Backend needs.** None now; P10's curriculum document carries `processId`, `duplicatedFrom` and
the student label.

**Definition of Done.** Duplicate a Day with interactions to Mon/Wed/Fri for four weeks: twelve
independent Days; editing one leaves the others alone; responses against one never appear under
another. Apply Try-it-First: the filmstrip shows Connect → Create → Practice → Observe → Respond
and the chip shows Observe on the MODEL step. `duplicatedFrom` never reaches a snapshot (firewall
test). Create, rename and re-theme a custom Unit. The alignment summary is **non-empty** for a
seeded canonical Day. All six Warehouse sections are visible from the top level. Lint and vitest
green.

---

## Phase 9 — Office administration

**Depends on:** P1, P7. **Size:** two sessions.

**Goal.** The Office becomes the two-zone hub the mockups specify — Classrooms and Curriculum —
with co-taught classes, a real People tab, archive and duplicate, richer classroom metadata and a
class Stream.

**Why.** The hub is a card grid of owned classes only. There is no Stream, no announcements
composer, no topics, no archive UI despite `closedAt` existing on the row, no duplicate, and no
cross-class To-review. The classroom row is name, description, year and code — nothing a
Google-Classroom-style header or a class theme needs.

**Tasks.** Office hub with both zones, per-card actions (enter, share, invite, edit, duplicate,
archive, delete-by-typing-DELETE) and the states for zero, one and many classrooms, including
co-taught classes with a role chip; the To-review roll-up from P7; archive and restore through the
existing `closedAt` (fixing `useToggleClassroom`'s empty-body TODO) with an Archived filter;
duplicate classroom with a roster carry-over choice; classroom metadata (section, subject, room,
period, meeting days, term dates, header image) stored per classroom until the PATCH payload
accepts them, each marked as needing backend; a Stream on Overview with a composer behind the
announcements flag and local drafts when off; the clean-up of the orphaned `ClassroomSwitcher`
(which renders only inside the admin console shell), the fourteen unused data hooks and the stale
docstrings that still describe a Classwork tab and a join code in the tab bar.

**Backend needs.** Announcements CRUD; topics; the classroom metadata fields plus archive;
pending co-teacher invites by email if `POST /teachers` cannot take an unregistered address.

**Definition of Done.** A co-teacher sees the class in the hub with their role; archive hides a
class from the default grid and the filter shows it; duplicate creates a class with the chosen
roster behaviour; the Stream composes locally with the flag off (badged as a draft) and posts
through the adapter with it on; zero dead hooks remain. Lint and vitest green.

---

## Phase 10 — A server home for the curriculum

**Depends on:** P1, P8. **Size:** one session.

**Goal.** Everything the teacher authors mirrors to the server through one sync layer with
revision reconciliation, so a second device or a co-teacher sees the same curriculum. With the
flag off, nothing changes except an explicit "this browser only" badge.

**Why.** This is the top-ranked gap in the audit and the gate on co-teaching, sharing and any
school-wide warehouse. It is late only because it depends on endpoints that do not exist yet; P1
already built the seam so no call sites change here.

**Tasks.** A remote adapter behind the repository interface; versioned documents for the
classroom plan, the annual plan, the personal warehouse and per-classroom config, each with an
ETag and `If-Match`; a sync outbox in IndexedDB that queues offline and flushes on focus, with a
2s debounce; conflict handling that surfaces "a newer copy exists on the server" with keep-mine
and take-server actions, keeping the local `.bak`; a per-store sync badge in settings; viewers
never enqueue. Blob-level sync means last-writer-wins between two simultaneous editors — that is
acceptable for v1 and the follow-up is a normalized schema.

**Backend needs.** The P10 block: plan, warehouse and settings documents, all of which **must
reject student tokens**, because a Day carries `rationale`.

**Definition of Done.** With the flag off, only the badge changes. With it on and a mocked
adapter: editing a Day PUTs with `If-Match`; a simulated 412 surfaces the conflict and restores
cleanly; a second browser context pulls the Day and its deck. Export and restore still work.
`reconcile.test.ts` covers the dirty, clean and conflict matrices. Lint and vitest green.

---

## Phase 11 — Depth

**Depends on:** P4, P5. **Size:** two sessions.

**Goal.** The remaining Pear Deck and Canva depth that the teacher's own decks actually use.

**Tasks.** A freehand-draw interaction that layers over a media element's zone rect — the rhythm
grid and chord-chart annotation pattern, which is 24 slides of the corpus and cannot be
reproduced by a standalone drawing widget; the chord-chart embed, reusing the DAW's chart
component so the single most requested song case is finally embedded **and** linked; an
embedded-website interaction for the four slides that use one; response moderation (hide or star
one answer before projecting) and hand-raise, on a bumped envelope shipped with the party change
in the same phase; a deck theme of closed tokens (background, accent, font scale) projected
through publish; the objectives "How" row auto-filled from the Day's five phase cells, which is
what it literally contains in every deck; student-side refinements including their own past
CLO responses. Asset upload flips on when the endpoint ships.

**Backend needs.** Response moderation (`PATCH .../responses/{rid}` with `hidden` and `starred`)
plus the matching party routing under the same Rule 2 strip; the classroom asset endpoints from
P4 flipped on. Both are already listed in `CONTRACT-DELTAS.md`.

**Definition of Done.** A draw interaction over a chord chart captures strokes aligned to the
media rect (Playwright screenshot); moderation hides one response from the projector with the
Rule 2 strip intact; deck theme tokens project and every preset still passes the grid tests. Lint
and vitest green.

---

## Capstone — end-to-end acceptance

One session, run after P11 (or after any phase, as a regression sweep). Drive the whole teacher
journey in a real browser and read every screenshot.

1. **Set up.** Create a classroom, invite a co-teacher as Editor, invite students by code, and
   confirm the co-teacher sees the class with the right role and permissions.
2. **Plan.** Seed the year, open a Unit, apply a lesson seed, and confirm the Standards Alignment
   summary is non-empty and printable.
3. **Author.** Build a Day from the default ten-slide arc: an Artist Spotlight slide with a
   YouTube embed left and questions right, a song info card plus chord-chart link, an objectives
   slide, a text response, a draw-over-chart slide, a "Last 5" reset. Verify every element sits in
   its zone, every content element carries a link, and "Reset to standard" restores the preset.
4. **Duplicate.** Copy the Day to three weekdays for two weeks; confirm the copies are
   independent and their interaction ids differ.
5. **Present.** Go live. On three tabs — teacher, student, projector — confirm the slide the
   teacher is on is the slide the class sees, that the teacher's Present view and the projector
   agree zone for zone, that responses reveal anonymized, that check-ins never reach the
   projector, and that following a link on the projector returns without dropping the session.
6. **Assign.** Assign the Day to a subset; open it as a targeted student and as an excluded one;
   answer; reload and confirm the answers survive.
7. **Grade.** Score the work, leave private feedback, return it, and confirm the feedback appears
   in no student-facing selector.
8. **Report.** End the session, open the report, export the CSV, and confirm the numbers match
   what happened.
9. **Survive.** Export the plan, clear site data, restore, and confirm the year is intact.

Then run the full gate: `npm run lint`, `npm run test:unit`, `npm run build`,
`npm run verify:prod`, and the firewall suites by name.

---

## Backend contract

Everything the server must add is in
[`docs/classroom-v2/CONTRACT-DELTAS.md`](../classroom-v2/CONTRACT-DELTAS.md), row by row with
the client feature flag that gates it, and specified in
[`docs/classroom-v2/openapi.yaml`](../classroom-v2/openapi.yaml). The three rows worth reading
first, because the most teacher-visible capability is blocked on each:

1. **`GET /classrooms/{id}/published-days/{publishedDayId}`** — publish is write-only today, so a
   deck reaches nobody but its author.
2. **The widened session state union** carrying `slideIndex` — without it, "students follow the
   teacher's slide" has no wire representation.
3. **`POST`/`GET /classrooms/{id}/assignments/{assignmentId}/responses`** — without it, "turned
   in" is a status flag with no work behind it.

Two questions need Ryan's answer before the flags they gate can be flipped: whether
`POST .../sessions/{sid}/authorize` returns the `projector` role for a teacher's token, and
whether the API actually POSTs each state change to the PartyKit webhook. Neither is verifiable
from this repository — the party is a pure relay, so an undeployed party and a silent API look
identical from the client.
