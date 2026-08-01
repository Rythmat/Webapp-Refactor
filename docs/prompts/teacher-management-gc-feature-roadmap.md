# Teacher Management — Google-Classroom feature roadmap (documented, not built)

> Companion to `teacher-management-google-classroom.md` (the layout pass, which is built).
> This doc captures the Google-Classroom **feature** capabilities that go beyond layout,
> phased and mapped to the workspace tabs. **None of these are implemented here** — this is
> the backlog the tabbed workspace was designed to grow into.
>
> Data-model rule (consistent with the rest of the app): real grades/analytics/SIS data must
> come from the external backend. Anything shown before those contracts ship is **display-only**
> — the same posture used for bonus XP / boosts today.

## Phase A — Grading depth (Grades / Classwork)
- **Customizable rubrics** — criteria × performance levels, attach to an assignment, grade against them.
- **Reusable comment banks** — saved feedback snippets a teacher inserts while grading.
- **Bulk grading** — grade many submissions at once; return with one action.
- **Grading periods & scales** — terms/quarters; points, percentage, or letter scales.
- *Backend:* a stored-grades contract (per-student, per-assignment, per-criterion scores). UI lands in the Grades tab + the assignment progress grid.

## Phase B — Insights / analytics (Overview / Grades)
- Completion rates, grade trends, engagement over time; per-standard mastery (see the content plan's Standards Alignment).
- **Light, display-only slice is backend-free** and can ship first: roster size + active students (`useEnrollments`), assignment turned-in counts (`useAssignments`/`useAssignmentProgress`), and the per-unit standards **coverage** view (aggregated from `cell.rationale`). Model on GC's "Learning goals" Grades view (color-coded % legend).
- Richer trends (grade-over-time, engagement) need a backend/telemetry contract. This is the concrete continuation of the Standards/Learning-Goals work in the content-integration plan (Phase 4) and the v3 analytics roadmap.

## Phase C — Academic integrity
- Originality / plagiarism reports on submissions. Requires an external service + backend; surfaced on the assignment/submission view.

## Phase D — Interoperability
- **SIS gradebook sync/export** — PowerSchool, Infinite Campus, Skyward, Follett Aspen.
- Align standards to the **1EdTech CASE®** format (as GC does, via Satchel/Rosetta) so exported grades/standards are portable. Backend + integrations; ties into the content plan's CASE-aware standards model.

## Phase E — Reuse & scale (Classwork)
- **Class templates** — import/share classwork sets between classes/teachers.
- **EdTech integrations hub** — connect third-party tools into the classwork Create flow.

---

### Mapping to tabs
| Tab | Roadmap phases |
|---|---|
| Overview | B (insights summary) |
| Classwork | A (rubrics/comment banks), E (templates, integrations) |
| Grades | A (grading depth), B (analytics + standards mastery), C (integrity), D (SIS/CASE export) |
| People | — |
