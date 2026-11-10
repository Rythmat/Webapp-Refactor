# Lesson slides: sections, Showcase, doing the app together

How a lesson's slides are put together since November 2026, and what the
server side needs for it. Contract rows are in `CONTRACT-DELTAS.md`.

## Six sections over five phases

Every lesson runs **Connect → Showcase → Group Project → Individual Project →
Present → Reflect**. The sections are a layer over the five IMPACT phases,
which stay the key for storage, the wire and reports:

| Section | Phase |
|---|---|
| connect, showcase | `connectRegulate` |
| groupProject | `groupPractice` |
| individualProject | `creativeProjects` |
| present | `presentPerform` |
| reflect | `respondReflectReset` |

`Slide.section` is optional. Slides saved without it are placed by
`sectionOf()` (`src/features/classroom/slides/sections.ts`). Never rename a
phase id.

## Connect: the feelings check-in

`checkIn: { style: 'feelings', level: 'simple' | 'advanced' | 'complex' }`.
Answers are strings such as `simple:great` or `wheel:joy:2+trust:1`
(`feelings/feelings.ts`). They are teacher-only: never projected, never
shareable (`slides/interactionPolicy.ts` `NEVER_PROJECTED`).

## The lesson's subject

`deck.templateRef.focusId` (`artist:<slug>` or `place:<slug>`) is what the
lesson is about. The lesson generator sets it, and so does choosing the
Showcase in the editor's Content picker. `slides/focus/lessonFocus.ts`
`relatedForFocus` decides what the Group Project may be for that subject,
by role:

- Promoter: the Globe's city or region tour for the subject's place, then
  its mind map;
- Producer: the Studio tutorials for the subject's genres;
- Performer: the subject's song lessons and its genre's Learn course.

A Group Project slide whose activity isn't among those shows "Match the
Showcase" in the editor.

## The Showcase slide

Preset `showcase`. The globe (a `globePreview` with `focus: [lat, lng]`)
fills the left half and flies to the subject's place when the slide is
shown; the photo (`artistImage`) fills the right half, with the title and
facts in the `captionTitle` / `captionBody` zones. The halves are chrome
(`halfLeft` / `halfRight`), painted by `slides/parts/ShowcaseBackdrop.tsx`.

## Doing the Group Project together (lockstep)

An activity with `atlas.follow: true` is done by the whole class at the
teacher's pace. The teacher's step is the class's step: every student's
tab moves to it and cannot run ahead.

- **State:** `SessionState.activity = { slideId, ref, step, total?, title? }`,
  set by the teacher; who finished which step is a teacher-only side-map
  (`activityDone`).
- **Wire:** two socket messages the party relays itself, with no REST
  PATCH: `activity` (teacher → every role, replayed after `hello`) and
  `activityDone` (student → teachers only, stamped with the enrollment).
- **The activity's tab** opens with `follow=1&session=<id>` (plus
  `lead=1` for the teacher's "Open and lead"). It has no socket: it reads
  the class's step from the session mirror in localStorage and writes
  "done" to an outbox the class tab sends on (`follow/classFollow.ts`).
- **Players:** `follow/useStepFollow.ts` is the one lockstep; the Studio
  tutorial (`TutorialLayer`), genre lessons (`GenreLessonContainerV2`),
  guided lessons (`GuidedPlayer`, by screen) and Theory song lessons
  (`ActivityFlow`) run on it.

**Deploy:** the party (`src/daw/collab/server/classroom_session/party.ts`)
must be redeployed for lockstep to work across devices. Until then it works
in practice sessions in one browser.

**Not yet:** the Globe tour in lockstep, and artist tours on the Globe. Both
wait on the Globe Tours work in `guidedTours.ts`, `useStartTour.ts` and
`ToursPanel.tsx`. A Promoter can already pick a region or city tour; it
just isn't followed step by step yet.
