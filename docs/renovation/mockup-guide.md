# Atlas Teacher Portal — Mockup Guide

**For:** whoever is designing the Teacher Portal mockups in Canva.
**Goal:** mockups that can go straight into implementation. Each screen should show its real states, answer its open questions, and not accidentally require a rebuild of something that already works.
**Sources:** Atlas Teacher Workflow (vision) · Teacher Portal Renovation Stage 1 (engineering plan) · a code review of the current app (2026-09-18).

## 1. How to use this guide

1. Mock screens in the **priority order** in §4. Stage 1 screens come first because implementation starts there.
2. Each screen has an **ID** (M0, M1, …). Name Canva pages `M11-a Slide editor — Add element menu open`, and so on, so feedback and code tasks can point at them.
3. Each screen is labelled **EXISTS**, **PARTIAL** or **NEW**:
   - **EXISTS:** redesign freely, but keep the listed behaviors.
   - **PARTIAL:** extend what's there. Screenshot the current screen as your starting frame.
   - **NEW:** blank page.
4. Answer the **open design questions** on each screen, either as sticky notes on the frame or in the handoff sheet (§6). Questions already answered are listed as **Settled**.
5. If a mockup crosses a **Constraint** (§3), that's allowed. Just mark it so we can cost it. Those are the expensive items.
6. Extra screens beyond this list are welcome, e.g. dark mode or MIDI in Song Charts. Give them their own IDs (M14+).

**Canva frame sizes**

- App screens: 1440 × 900 (desktop teacher).
- Slide canvas: **1280 × 720**. This is the real slide coordinate space, so design slides at exactly this size.
- Student screens: one tablet frame, 1024 × 768.
- Projector view: 1920 × 1080.

## 2. Decisions already made

| Topic                            | Decision                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Default structure**            | **Standards-Based is the default Process for every Day, always.** It's a new _name_ for Atlas's fundamental curricular structure, not a new concept.                                                                                                                                                                                          |
| **Other Processes**              | Join-the-Expert, Try-it-First and Learn-to-Apply are alternatives. A teacher who uses one consistently **duplicates that Process onto any or all days** using Duplicate / Copy To (M10). There's no global "change my default" setting.                                                                                                       |
| **Process vs. phases**           | A Process is a **template** laid over the core phases. Each step shows in the Process's own words and belongs to one phase.                                                                                                                                                                                                                   |
| **Step order**                   | **Slides follow the Process's order**, even when that departs from the default sequence. Try-it-First deliberately runs Create before Practice; the different sequence is the point.                                                                                                                                                          |
| **Student-facing phase labels**  | **Connect · Observe · Practice · Create · Present · Respond**. "Observe" is new, next to Practice. **Any Process step containing MODEL maps to Observe.** Observe is a **label only**, not a sixth phase. Today students see Connect / Practice / Create / Share / Reflect, so "Share" becomes **Present** and "Reflect" becomes **Respond**. |
| **CLO responses**                | The CLO's sentence stem is **copied into a student prompt** (a text response). The CLO record, standards and rationale are never shown to students.                                                                                                                                                                                           |
| **Planning layers are optional** | Teachers may plan with **Days only**, **Units + Days** (skipping Weeks), or **Units + Weeks + Days**. Every combination must work.                                                                                                                                                                                                            |
| **Calendar is central**          | The classroom **dashboard calendar** is where all planning shows up, whichever layers the teacher uses. It stays close to the current design.                                                                                                                                                                                                 |
| **Warehouse is flat**            | The Curriculum Warehouse holds the Processes, Banks, Project Menu and Frameworks. The content is nested, but **no heading may be hidden inside a nest**: every section is visible from the top level.                                                                                                                                         |
| **Google Slides parity**         | **Primitives, not parity**: text, picture, link, song, activity and student interaction as elements.                                                                                                                                                                                                                                          |

## 3. Constraints from the code

These are cheap to respect and expensive to break.

- **C1. One of each element kind per slide.** Today a slide has one title, one prompt, one body, one main media, one side media, and so on. A mockup showing **two text boxes or three pictures on one slide** means a slide-model rebuild. That may be worth it, but flag it.
- **C2. Elements can already be moved, resized, hidden and layered** (bring to front / send to back). **Rotation, transparency and background image or colour don't exist yet** (a slide only has an accent colour). They're buildable. Mark them as Stage 1 or later.
- **C3. The student firewall.** Anything teacher-only must be visually separate from what students see: rationale, CLO records, standards, assessment notes, "why I chose this". The teacher side panel already exists, so keep teacher-only material in a clearly teacher-only area.
- **C4. Everything in planning is saved on this computer only**, until the backend ships (Stage 2). Mockups can assume sync, but don't design around "a student opens it on their own device" for Stage 1 screens.
- **C5. The server stores very little about a classroom**: name, description, year and join code. Start/end dates, days of the week, location and thumbnail all need new backend fields. Design them, marked "needs backend".
- **C6. Existing lessons must keep working.** Existing lessons are already Standards-Based in all but name, so they open as Standards-Based Days with no change.

## 4. Screen priority

| #   | ID  | Screen                                           | Status                     | Stage |
| --- | --- | ------------------------------------------------ | -------------------------- | ----- |
| 1   | M11 | Slide editor: add and arrange elements           | PARTIAL                    | 1     |
| 2   | M10 | Daily plan: Process + Duplicate / Copy To        | PARTIAL                    | 1     |
| 3   | M12 | Present mode + following links from a slide      | PARTIAL                    | 1     |
| 4   | M3  | Classroom dashboard (calendar, the central view) | PARTIAL                    | 1–2   |
| 5   | M1  | Teacher Office hub                               | PARTIAL                    | 1–2   |
| 6   | M2  | Classroom card actions                           | PARTIAL                    | 1–2   |
| 7   | M0  | Global nav + Console exit                        | PARTIAL                    | 1     |
| 8   | M4  | Curriculum Warehouse home (flat)                 | NEW                        | 2     |
| 9   | M5  | Process gallery                                  | NEW                        | 2     |
| 10  | M9  | Frameworks: Unit / Week / Day (optional layers)  | PARTIAL                    | 2     |
| 11  | M6  | Activity Bank                                    | EXISTS (inside the editor) | 2     |
| 12  | M7  | CLO Bank                                         | PARTIAL                    | 2     |
| 13  | M8  | Project Menu + rubrics                           | NEW                        | 2–3   |
| 14  | M13 | Student view: assigned work + CLO responses      | PARTIAL                    | 2     |

## 5. Screen briefs

### M0 — Global nav and Console exit · PARTIAL · Stage 1

**Today:**

- Teachers reach their area through a "Manage" icon in the left sidebar.
- Content editors and admins who open the Content Console are **forced back into it** whenever they try to leave. That's the "locked in" report.

**Mock:**

- The menu-bar icon that opens the Teacher Office.
- The Console sidebar with a visible **Exit Console → Atlas** control.

**Open:**

- Where does Exit Console land: the Teacher Office, or the user's last page?
- Should users with both roles (teacher + editor) see a role switcher?

### M1 — Teacher Office hub · PARTIAL · Stage 1–2

**Today:**

- `/teacher` sends a teacher with one classroom straight into it, and shows a grid of classroom cards to a teacher with several.
- There's no page showing **Classrooms and Curriculum** together.

**Mock:**

- The Office with two zones, **Classrooms** (cards) and **Curriculum** (the entry to the Warehouse, M4).
- States: first-time teacher with no classrooms, one classroom, many classrooms.

**Open:**

- Does a single-classroom teacher still land on the Office, or skip into the classroom?
- Is the Curriculum Warehouse shared across all of a teacher's classrooms, or per classroom? This matters for the data model: saved lessons are shared today, while the calendar is per classroom.

### M2 — Classroom card actions · PARTIAL · Stage 1–2

| Action                   | Today                                                        | Mock                                                                                |
| ------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| **Edit**                 | Name + description only                                      | Add start/end dates, days of week, location, thumbnail upload _(needs backend, C5)_ |
| **Enter**                | Opens the Overview tab                                       | Opens the calendar dashboard (M3)                                                   |
| **Invite Students**      | EXISTS: code, join link, QR                                  | Restyle only                                                                        |
| **Invite Teacher/Admin** | Email invite with a fixed "co-teacher" role; currently fails | Role picker: **Editor / Viewer** (the backend already supports these two roles)     |
| **Duplicate**            | NEW                                                          | Rename field + "Carry over current students" / "Start with an empty roster" choice  |
| **Delete**               | Asks you to type the classroom name                          | Change to typing **DELETE**                                                         |

**Open:**

- Does Duplicate copy the calendar and lessons too, or only settings and roster?
- What does a Viewer co-teacher see and not see? Mock one Viewer frame.

### M3 — Classroom dashboard (calendar) · PARTIAL · Stage 1–2

**Today:**

- A month calendar already exists (Calendar tab), showing Units, Days, holidays and breaks with drag-and-drop.
- The classroom opens on an Overview tab (Quick Start, This Week, Due This Week, Recent Sessions).

**Direction:** keep it **very close to the current design**. The calendar is **where all planning shows up**, whatever layers the teacher uses.

**Mock three states of the same month:**

1. **Days-only teacher:** Days on dates, no Unit or Week bands.
2. **Units + Days teacher:** Unit bands across dates, Days inside them, no Weeks.
3. **All-layers teacher:** Unit bands, Week markers, and Days.

Each Day chip shows its name and its Process when it isn't Standards-Based. Click-through goes into the Day (M10).

**Open:**

- Is the calendar the default view when entering a classroom, as the Workflow doc says? If so, where do the Overview widgets go?
- How does an unscheduled Day (no date yet) appear: a side tray?

### M4 — Curriculum Warehouse home · NEW · Stage 2

**Direction:** a **flat** layout. **Every section is visible from the top level**, with none hidden inside another:

**Process · Activity Bank · CLO Bank · Project Menu · Frameworks · Saved Lessons**

The _content_ is hierarchical (a Unit contains Weeks and Days; a Project links CLOs), but the _navigation_ is not. A teacher should never need to open one section to discover another exists.

**Mock:** the Warehouse landing, plus one section open, showing that the other sections stay visible (e.g. a persistent left rail or top tabs).

**Open:**

- Can the Banks also be opened as a side drawer from inside the slide editor? The vision implies picking from the Banks while building slides.

### M5 — Process gallery · NEW · Stage 2

**Mock:**

- A gallery of the 4 Processes, **Standards-Based first and marked "Default"**.
- Each card shows its steps (with their student phase labels), primary contexts and the "who leads" line.
- A **"Copy this Process to days…"** action that opens the same Copy To dialog as M10.

**Step → phase mapping** (MODEL → Observe applied; confirm in the mockup):

| Process                       | Steps → student phase label                                                                                                                                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Standards-Based** (default) | CONNECT/REGULATE → Connect · DEMO/PRACTICE → Practice · CREATE/PRODUCE → Create · PERFORM/PRESENT → Present · RESPOND/RESET → Respond                                                                                            |
| **Join-the-Expert**           | CONNECT/REGULATE → Connect · TEACHER MODEL APPLIED SKILLS → **Observe** · INVITE PARTICIPATION → Practice · FACILITATE COLLABORATION → Create · REFINE PRODUCTION → Create · PERFORM/PRESENT → Present · RESPOND/RESET → Respond |
| **Try-it-First**              | CONNECT/REGULATE → Connect · TRY TO APPLY → Create · DISCOVER NEEDED SKILLS → Practice · TEACHER ASSIST/MODEL → **Observe** · CONNECT TO CONTEXT → Respond? · RESPOND/RESET → Respond                                            |
| **Learn-to-Apply**            | CONNECT/REGULATE → Connect · ARTICULATE CONTEXT → Connect · TEACHER MODEL/ASSIST → **Observe** · BUILD SKILL → Practice · APPLY SKILL → Create _(or Present for ensembles?)_ · RESPOND/RESET → Respond                           |

**Settled:**

- Slides follow the Process's order (Try-it-First goes Create → Practice → Observe).
- Students see the **phase label** on each slide (Connect, Observe, Practice, Create, Present or Respond), not the Process step name. Step names are for the teacher.

**Open:**

- Standards-Based's DEMO/PRACTICE says "Demo", not "Model". Should it stay Practice, or should the demo portion be Observe?
- Try-it-First's CONNECT TO CONTEXT: Respond, or Connect?
- Learn-to-Apply's APPLY SKILL: Create, or Present?
- When two steps share a label (Join-the-Expert's two Create steps), should they show as two sections or one?

### M6 — Activity Bank · EXISTS (inside the editor) · Stage 2

**Today:**

- 96 built-in activities, each tagged with a phase and a process style.
- Search is filtered to the current phase.
- "Create your own" is a title + description form.

**Mock:**

- A full-page bank with **tag filters** (phase label, Process, step).
- Activity cards.
- An expanded **Create your own** form.

**Settled:** each card can show **phase, standards, linked Atlas content and linked CLOs**. All are **optional fields**, so a teacher creating their own activity can skip any of them without friction. In the form, show the optional fields as clearly skippable, e.g. collapsed "Add standards", "Link Atlas content" and "Link CLOs".

### M7 — CLO Bank · PARTIAL · Stage 2

**Today:**

- CLOs exist, sorted along three strands (Feeling / Technique / Context), and are written as stems ("When I… I feel…", "I can…").
- The data for "Create your own" exists, but there's no screen for it.

**Mock:**

- The bank, with activity links.
- A **Create your own** form with a **Choose Activity** field (optional, per the M6 principle).

**Open:**

- Should the bank be organized by strand or by activity?
- A CLO is teacher-only (C3). Should the bank make clear that "this stem will be shown to students as a prompt"?

### M8 — Project Menu and rubrics · NEW · Stage 2–3

**Mock:**

- Three categories: **Ambassador · Producer · Performer**, with their example projects.
- **Assign** to an individual, a group or the whole class.
- A **Rubric builder**: goals, linked CLOs, and an optional assessment measure.

**Open:**

- Is a Project a multi-day thing linked to a Unit or Week, or a single assignment?
- What does a student see for a Project?
- **Groups don't exist in the app yet.** Mock how a teacher creates a group; this screen and M9/M11 all depend on it.

### M9 — Frameworks: Unit / Week / Day · PARTIAL · Stage 2

**Today:**

- Units exist, with a name, monthly theme, overview and essential questions.
- **Weeks exist only on paper**: Days link straight to Units.
- Artifacts don't exist.

**Direction:** **every layer is optional.** A Day doesn't need a Week or Unit; a Week doesn't need a Unit. Layout follows the flat-Warehouse rule: show Units, Weeks and Days as three visible lists or columns (with filters like "Days not in a Unit"), not a tree that hides lower levels.

**Mock:**

- **Unit edit**: name, monthly theme(s), Artifacts picker.
- **Week edit**: Goals prompt, plus Projects / Activities / CLOs with an "assign to individual / group / whole class" control.
- **Day** rows: showing which Unit and Week, if any, they belong to.
- Attaching a loose Day to a Unit or Week, and detaching it.

**Open:**

- Is a week always Mon–Fri on the calendar, or a named teaching block?
- Do "Artifacts" mean _student work to collect_, or _materials to reuse_?

### M10 — Daily plan · PARTIAL · Stage 1

**Today:**

- A Day has a name, phase cells, a slide deck, a scheduled date, and **Present** and **Preview** buttons.
- **No Duplicate** yet.

**Mock:**

- The Day header: name, **Process indicator** (shows "Standards-Based" by default), Present, Duplicate.
- The **Copy To dialog**, used for two jobs:
  1. **Copy this Day**: its content and slides go to one day, specific weekdays, or every day until the end date. Optionally attach the copies to a Unit/Week.
  2. **Apply a Process**: put a chosen Process's structure onto one, some or all days. This is how a teacher who always uses Try-it-First overrides the default.

**Settled:** each copy is independent; editing one never changes the others.

**Open:**

- When a Process is applied to a Day that already has content, what happens to the existing slides? Remap them into the new step order, keep them and add empty steps, or warn first?
- After copying, show a list of the created copies?

### M11 — Slide editor · PARTIAL · Stage 1 (the main Stage 1 build)

**Today (keep):**

- Filmstrip with add, duplicate, delete and reorder.
- A 1280×720 canvas where blocks can be moved, resized, hidden and layered.
- Text size, bold and alignment.
- Accent colour.
- A content picker with Songs, Theory, Genre, Studio, Events, Regions, Globe/Pathways and Eras.
- YouTube, artist image, chord chart and globe media.
- Student interactions: choice, text, number, draw, check-in.
- A teacher-only side panel.

**Mock the "Add an element" menu with six types:**

1. **Activity** (from the Bank, with Atlas links)
2. **Song**. It inserts **two separate elements**: an **info card** (title, artist, era, region, pulled live from Globe) and a **Chord Chart link**. Show deleting the card while the link stays.
3. **Link**: label + URL. Show how external links look to students, i.e. an external-link icon.
4. **Picture**: from the Atlas library first; upload from device later _(needs backend)_.
5. **Text**
6. **Student interaction**, including a **CLO response**: pick a CLO, its stem becomes the prompt, then choose **Public** (anonymous on the projector) or **Private** (teacher only).

**Also mock:**

- The filmstrip grouped by **Process step**, in the Process's order, with the student phase label on each group.
- **Assign to** on a slide: all / multiple / one student.
- **Content from Globe / Learn / Studio / Arcade** as a **screenshot + link + editable description**. Today this inserts a live widget or a launch tile, not a screenshot. Decide which you want.
- **Arrange:** layer order (exists), transparency, background, rotate (new, C2).
- **Timeline:** timed or cued entrances, plus auto-advance.

**Open:**

- Do you need **more than one** text, picture or link per slide (C1)? This is the single biggest cost decision in Stage 1.
- Timeline: a strip under the canvas, or a per-element "enter on click #N" setting?
- Where does "Presentation Preview" live: the top bar, or next to Present?

### M12 — Present mode and following links · PARTIAL · Stage 1

**Today:** Present and live sessions exist: projector view, slide gating, timers, roster, response walls and word clouds.

**Mock:**

- The projector frame with the new phase labels (Connect / Observe / Practice / Create / Present / Respond).
- **Public CLO responses posted anonymously.**
- The teacher control strip.
- **The nav bar shown after clicking a content link out of a slide.** The vision requires a clear "Back to lesson" at the top.

**Open:** does following a link during Present open inside the app (with the back bar), or in a new tab or window?

### M13 — Student view · PARTIAL · Stage 2

**Mock:**

- What a student sees on their device for an assigned slide.
- A CLO-stem prompt, with its Public or Private indicator.
- A Project assignment.

**Open:** can students see their own past CLO responses?

## 6. Handoff checklist

When returning with mockups, bring:

- [ ] Canva pages named by screen ID (M0–M13, plus any M14+ extras), with states shown (empty, filled, error where relevant).
- [ ] Answers to every **Open** question, as sticky notes on the frames or in a one-page list.
- [ ] The **Process step → phase label** table (M5), confirmed or corrected.
- [ ] A clear yes or no on **multiple elements of the same kind per slide** (M11, C1).
- [ ] Every frame that crosses a constraint (C1–C6), marked.
- [ ] Any change to the priority order in §4.

---

## Appendix A — Where each screen lives in code (for the implementation phase)

- M0: `src/layouts/DashboardLayout/Sidebar.tsx`, `src/contexts/AuthContext/ProtectedPage.tsx:87-92` (the redirect)
- M1: `src/features/teacher/TeacherLanding.tsx`, `ClassroomSelectionPage.tsx`
- M2: `src/features/teacher/components/*Dialog.tsx`; roles already exist in the generated client, `/classrooms/:id/teachers` (`viewer|editor`)
- M3: `src/features/classroom/annual/CalendarView.tsx`, `src/features/teacher/TeacherDashboardPage.tsx`
- M5 / phase labels: `src/features/classroom/phases.ts` (labels Share→Present, Reflect→Respond; the Observe label is new); `InitiationStyle` in `src/features/classroom/types.ts:185` already has three of the four Processes as tags
- M6/M7: `src/features/classroom/plan/ActivityBankPicker.tsx`, `content/usePersonalContent.ts` (`addActivity`, `addClo`)
- M9: `src/features/classroom/types.ts` (`Unit`, `Week`, `Day`), `annual/useAnnualPlan.ts`, `annual/UnitPage.tsx`
- M10: `src/features/classroom/plan/PlanPage.tsx`, `plan/useLocalPlan.ts`; reuse the slide copy in `slides/deckEdit.ts:173` (`duplicateSlideAt`, which re-keys interaction ids)
- M11: `src/features/classroom/slides/types.ts`, `slides/parts/SlideStage.tsx`, `plan/deckEditor/`, `publish/publishDay.ts`
- M12: `src/features/classroom/live/`, `PresentationMode.tsx`

## Appendix B — Corrections to the Stage 1 doc (verified 2026-09-18)

- **S0-1 firewall.** The check was already narrowed to key names only in `2f64f180` (Sep 3). A `'clo'` message can only come from the client-side check, and current code can't produce it on a normal lesson, so the report most likely came from an older deployed build: **confirm the deployed build first**.
  Still worth doing:
  - switch to exact-key matching;
  - fix the outdated text-based check in `slides/contentRefs.ts:113`, which still blocks e.g. `tears_of_a_clown`;
  - rebuild published snapshots, which are reused forever by `PlanPage.handleStartSession` and have no per-snapshot version.
- **S0-2 Console.** An exit button alone won't work. `ProtectedPage.tsx:87-92` redirects every admin or editor back to `/console`, and so does `AuthPage.tsx:23-25`. Fix the redirect, then add the exit link. Flag for Ryan: do teachers wrongly hold the `editor` role?
- **S0-3 Globe links.** The bug is in `src/features/songs/useSongActions.ts:66`: it goes to `/atlas?event=` (the dashboard, which ignores `event`) instead of `/atlas/globe`. Use the existing `songGlobeRoute` in `slides/songDeepLinks.ts:86`. The same hook also serves `SongCard`, `SongLibraryPage` and `FeaturedSongCard`.
- **S3-1 co-teacher invites.** A generated `/classrooms/:id/teachers` endpoint with `viewer|editor` roles already exists and is unused. That is a quicker path than waiting on the new `/invitations` endpoint.
- **S1-4 images.** Admin image upload (`useAdminAssetUpload`) points at an endpoint that hasn't shipped. The studio-assets signed-upload flow is the better model, but it's audio-specific.
- **S2-1 duplicate.** `duplicateSlideAt` already re-keys interaction ids. Build the Day copy from it.
- **D2 (four vs. five phases)** is resolved differently from the Stage 1 doc's default. Standards-Based = the existing five, with student labels **Connect / Practice / Create / Present / Respond**. **Observe** is a label only, shown on MODEL steps. It is not a sixth phase, so no server change is needed.
