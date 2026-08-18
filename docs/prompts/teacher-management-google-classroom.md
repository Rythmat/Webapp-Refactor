# Prompt: Restyle the Teacher Management surface into a Google‑Classroom‑style workspace

> Self‑contained implementation prompt for a Claude Code session. Follow it top to bottom.
> Scope of this pass = **layout/component structure only** (dark theme kept). Feature‑parity
> capabilities (rubrics, analytics, SIS, etc.) are documented as a roadmap in Step 9 — **do not build them**.

## Objective

Turn the per‑classroom teacher surface (`/teacher/classroom/:classroomId`) into a Google‑Classroom‑style
**tabbed workspace**: one class header with a **hero banner**, a breadcrumb, and an **underline tab bar**
(`Overview · Classwork · People · Grades`) that unifies the teacher pages currently scattered across
unrelated URLs. Assemble it almost entirely from components that already exist.

## Hard constraints

- **Keep the dark theme.** Use the app's existing dark‑glass tokens: surfaces `rounded-2xl border
border-white/[0.06] bg-white/[0.02]`; primary CTA = white pill `bg-white text-black rounded-full
hover:bg-white/85`; text ramp `text-white` / `text-white/60` / `text-white/40`; eyebrow labels
  `text-xs uppercase tracking-wider`; font Glacial Indifference (inherited). Reserve gold `#FFCC33`
  (`brand-base`) as the single hero accent. **No light‑gray page, no Material blue, no new fonts**
  (Outfit/Urbanist are not used in this app).
- **Do not touch** the global `ClassroomSidebar` (72px icon rail) or `TopRail` — they're shared app‑wide
  and already rendered by the `ClassroomDashboard` layout. Your pages render into its `<Outlet/>`. Do
  **not** add another root scroll container — the parent `<main>` owns scroll (see `docs/dashboard-responsive.md`).
- Reuse existing tiles, dialogs, hooks, and patterns. Preserve all existing data/logic.

## Read these first (context)

- Routes: `src/features/teacher/TeacherPages.tsx`, `src/constants/routes.ts` (the `TeacherRoutes` block).
- Target pages: `src/features/teacher/TeacherDashboardPage.tsx`, `src/features/teacher/ClassroomStudentsPage.tsx`,
  `src/features/classroom/assignments/AssignmentsPage.tsx`, `src/features/classroom/assignments/AssignmentProgressPage.tsx`.
- Reuse patterns: `src/components/ClassroomLayout/dashboard/FeaturedSongCard.tsx` (hero glass/gradient),
  `src/features/admin/telemetry/AdminTelemetryLayout.tsx` (underline `NavLink` tabs),
  `src/features/teacher/dashboard/DashboardTile.tsx` (tile shell),
  `src/features/teacher/ClassroomSelectionPage.tsx` (copy‑code chip + `EmptyState`),
  `src/features/teacher/components/RosterTabs.tsx` (roster), `src/features/teacher/components/EditClassroomDialog.tsx`.
- Data hooks: `@/hooks/data` → `useClassroom`, `useClassrooms`, `useMe`; `useAssignments`
  (`src/features/classroom/assignments/useAssignments.ts`); `useTeachers` / `useCreateTeacherInvitation`
  (`src/hooks/data/teachers/`); `useEnrollments` (`src/features/classroom/enrollments/useEnrollments.ts`).

## GC → app tab mapping

| Tab              | Backing page              | Change                                                |
| ---------------- | ------------------------- | ----------------------------------------------------- |
| Overview (index) | `TeacherDashboardPage`    | restyle to 2‑column; strip header + guard             |
| Classwork        | `AssignmentsPage`         | reuse; only de‑dupe an internal title if present      |
| People           | `ClassroomStudentsPage`   | restyle to Teachers + Students sections; strip header |
| Grades           | new `ClassroomGradesPage` | thin gradebook → per‑assignment progress              |

---

## Step 1 — Route restructure (the critical, highest‑risk step)

In `src/constants/routes.ts`, add one definition to `TeacherRoutes`:

```ts
grades: createRouteDefinition<{ classroomId: string }>(
  '/classroom/:classroomId/grades', { prefix: teacherPrefix },
),
```

In `src/features/teacher/TeacherPages.tsx`, add lazy imports for a new `ClassroomWorkspaceLayout` and
`ClassroomGradesPage`, then **nest** the four tab pages under the workspace layout route while leaving all
deep pages as siblings:

```
ClassroomDashboard (path /teacher)                    ← unchanged (icon rail + TopRail + scroll)
 ├─ index → TeacherLanding                             ← unchanged
 ├─ /teacher/classrooms → ClassroomSelectionPage       ← unchanged
 ├─ ClassroomWorkspaceLayout (path classroomDashboard.definition)  ← NEW: hero+breadcrumb+tabs+<Outlet/>
 │    ├─ { index: true, element: <TeacherDashboardPage /> }        // Overview
 │    ├─ { path: students.definition,    element: <ClassroomStudentsPage /> }   // People
 │    ├─ { path: assignments.definition, element: <AssignmentsPage /> }         // Classwork
 │    └─ { path: grades.definition,      element: <ClassroomGradesPage /> }      // Grades (NEW)
 └─ deep pages stay SIBLINGS (chrome‑free): plan, plan/live-deck, plan/:dayId, plan/:dayId/preview,
      plan/annual, plan/annual/unit/:unitId, present/:dayId, assignments/:assignmentId/progress,
      sessions/:sessionId, sessions/:sessionId/projector, sessions/:sessionId/report, reports
```

Why this works: child paths stay **absolute** and begin with the workspace path
(`/teacher/classroom/:classroomId/...`), which React Router v6 permits. Deep URLs like `.../plan` and
`.../assignments/:id/progress` have no matching workspace child, so the router falls through to the more
specific sibling route — the workspace never swallows them. **This is the #1 thing to verify at runtime.**

## Step 2 — `ClassroomWorkspaceLayout.tsx` (new, `src/features/teacher/workspace/`)

- Read `classroomId` (`useParams`), `useClassroom(cid)`, `useClassrooms`, `useMe`.
- **Move the ownership guard here** (currently `TeacherDashboardPage.tsx` lines 33–43): compute
  `owned`/`hasMany`/`ownsThisClassroom`; if `!isClassroomsLoading && me?.id && cid && !ownsThisClassroom`
  → `<Navigate to={TeacherRoutes.root()} replace />`. This now protects all four tabs at once.
- Layout: `mx-auto w-full max-w-[1400px] px-6 py-6 md:px-10 md:py-10`, `flex flex-col gap-6 md:gap-8`,
  containing: a compact breadcrumb (`All classrooms › {name}`, link shown only when `hasMany`) →
  `<ClassroomHeroBanner classroomId={cid} hasMany={hasMany} />` → `<ClassroomTabBar classroomId={cid} />`
  → `<Suspense fallback={…}><Outlet/></Suspense>`.

## Step 3 — `ClassroomHeroBanner.tsx` (new)

Model on `FeaturedSongCard`: `glass-panel relative overflow-hidden rounded-2xl` with
`style={{ border: '1px solid var(--color-border)' }}`, min‑height `clamp(140px,18vw,200px)`. Dark base +
a **soft brand‑gold (or classroom‑color) gradient wash** and the grain texture (no bright fill — stays
on the dark theme). Contents:

- Eyebrow: `GraduationCap` + `Classroom` (`text-xs uppercase tracking-wider text-white/60`).
- Class name: `text-3xl md:text-4xl font-medium text-white`.
- **Copy‑to‑clipboard class‑code chip** — reuse the copy logic from `ClassroomSelectionPage.tsx`.
- Top‑right: a `Customize` white‑pill button opening the existing `EditClassroomDialog`, and the
  `All classrooms` link when `hasMany` (→ `TeacherRoutes.classrooms()`).

## Step 4 — `ClassroomTabBar.tsx` (new)

Copy the underline pattern from `AdminTelemetryLayout.tsx`:

```tsx
<nav className="flex gap-1 border-b border-white/10 pb-px">
  {tabs.map((t) => (
    <NavLink
      key={t.to}
      to={t.to}
      end={t.end}
      className={({ isActive }) =>
        `px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? 'border-b-2 border-white text-white'
            : 'text-white/60 hover:text-white'
        }`
      }
    >
      {t.label}
    </NavLink>
  ))}
</nav>
```

Tabs: Overview `end` → `TeacherRoutes.classroomDashboard(cid)`; Classwork → `assignments(cid)`;
People → `students(cid)`; Grades → `grades(cid)`.

## Step 5 — `TeacherDashboardPage.tsx` (Overview) restyle

Remove its `<header>` and ownership guard (both now owned by the workspace). Re‑lay the **same 8 tiles**
into two columns:

```tsx
<div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(300px,340px)_1fr] lg:gap-5">
  <div className="flex flex-col gap-4">
    {/* utility: QuickActionsTile, LiveSessionTile, UpcomingAssignmentsTile, PendingApprovalsTile */}
  </div>
  <div className="flex flex-col gap-4">
    {/* main: TodaysLessonTile, WeekStripTile, RosterSnapshotTile, RecentSessionsTile */}
  </div>
</div>
```

No `DashboardTile` change needed — its `md:col-span-*` classes are inert inside a flex column.
(Optional polish: add a `colSpanMd?: … | 'auto'` opt‑out that emits no col‑span class.)

## Step 6 — `ClassroomStudentsPage.tsx` (People) restyle

Remove its `<header>` (hero owns the title). Present GC's **two sections** with eyebrow headers:

- **Teachers** — list from `useTeachers`, add‑teacher icon wired to the existing
  `useCreateTeacherInvitation` flow (degrade gracefully to showing the owner if that flow is heavier
  than expected).
- **Students** — keep the existing search box + `RosterTabs` (Active/Pending/Removed) + `InviteStudentDialog`.
  Reuse the dividers/avatar/empty‑state idioms already in the file / `RosterTabs`.

## Step 7 — `ClassroomGradesPage.tsx` (new, thin gradebook)

List assignments from `useAssignments(cid)`; each row shows turned‑in / graded counts and links to the
existing `AssignmentProgressPage` (`.../assignments/:id/progress`). Card/row styling = the
`bg-white/[0.02]` list idiom; illustrated empty state copied from `ClassroomSelectionPage`'s `EmptyState`.
**No backend changes.** (May be deferred — ship 3 tabs first — to reduce scope.)

## Step 8 — `AssignmentsPage.tsx` (Classwork) light touch

Only if it renders its own class title that would duplicate the hero: remove/soften that title. Keep all logic.

---

## Step 9 — Document the GC feature roadmap (author, DO NOT build)

Create `docs/prompts/teacher-management-gc-feature-roadmap.md` capturing the Google‑Classroom **feature**
capabilities that go beyond layout (from the official product page). Phased, each mapped to its tab:

- **Phase A — Grading depth (Grades/Classwork):** customizable **rubrics**, **reusable comment banks**,
  **bulk grading**, grading periods & scales. UI + a stored‑grades backend contract.
- **Phase B — Insights/analytics (Overview/Grades):** completion rates, grade trends, engagement. A
  _light, display‑only_ version (roster size, active students, assignment turned‑in counts from
  `useEnrollments`/`useAssignments`) is backend‑free; richer trends need a backend/telemetry contract.
- **Phase C — Academic integrity:** originality/plagiarism reports. External service + backend.
- **Phase D — Interoperability:** SIS gradebook **sync/export** (PowerSchool, Infinite Campus, Skyward,
  Follett Aspen). Backend + integrations.
- **Phase E — Reuse & scale (Classwork):** **class templates** (import/share classwork) + an **EdTech
  integrations** hub.

Note (consistent with the app's data model): real grades/analytics/SIS data must come from the external
backend — anything shown before those contracts ship is **display‑only**, the same way bonus XP/boosts
are handled today.

---

## Acceptance criteria / verification

Use the **`Webapp-Refactor:verify`** skill (dev server on 5179 + Playwright). Run `nvm use 20` first
(husky/engines pin). Use the dev auth bypass (`VITE_DEV_AUTH_BYPASS=1`) or a seeded teacher with ≥1 class.

1. `/teacher/classroom/:classroomId` shows: hero banner (name + copyable code + Customize), tab bar with
   the **underline on the active tab**, and the Overview two‑column tile layout.
2. **Routing regression (critical):** each tab updates URL + active underline + content; then open each
   **deep page** directly — `.../assignments/:id/progress`, `.../plan`, `.../present/:dayId`,
   `.../sessions/...` — and confirm they render **without** tab chrome (workspace did not swallow them).
3. Ownership guard still redirects a non‑owned classroom to `/teacher`.
4. People shows Teachers + Students sections; invite dialogs open. Grades lists assignments, links to
   progress, and shows the empty state with no assignments.
5. `tsc` + lint clean; two‑column collapses to one column below `lg`.

## Out of scope (this pass)

Global `ClassroomSidebar`; `TopRail`; student‑side classroom pages; a real grades/rubric/analytics/SIS
backend; deep‑page redesigns; new fonts. The Step 9 roadmap items are documented, not built.
