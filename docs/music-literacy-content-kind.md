# The Music Literacy content kind

What the content API needs so the Music Literacy lessons, Learn's
call-and-response series on scale degrees, are stored, validated and
published like every other content kind. For Ryan (the API) and Aaron
(console review). October 2026. Modelled on
[instrument-content-kinds.md](instrument-content-kinds.md), which the
console side follows exactly.

The console side is done: the kind is registered, repo mode serves it from
the repo's files, the offline mock seeds it, and the console's Music
Literacy editor saves it. What is left is the API, described in **What the
API needs** below.

## The short version

- **Create one kind:** `music_literacy`. Identity field `id`, schema
  version 1, one CDN bundle, `music-literacy`.
- **Not a graph node.** Cortex does not read it, and nothing else names a
  lesson, so it has no `REF_PATHS` entries.
- The body, slug pattern and bundle name below are the contract. The
  machine-readable copies are `src/content/musicLiteracy/schemas.ts` (zod)
  and `src/scripts/apiContract/slugPatterns.generated.json` (contract
  draft 5).

## The kind

| Kind             | What it is                                                             | Identity | Slug pattern               | Bundle           | Authoritative | In the repo today |
| ---------------- | ---------------------------------------------------------------------- | -------- | -------------------------- | ---------------- | ------------- | ----------------- |
| `music_literacy` | One Music Literacy lesson (Part 1, Part 2…): a key, a tempo, its steps | `id`     | `^[a-z0-9]+(-[a-z0-9]+)*$` | `music-literacy` | yes           | 1 (Part 1)        |

The slug pattern is the part's kebab pattern, the one the body holds `id`
to; the kind borrows it without being a graph entity.

**Authoritative from the start.** There is no code registry to merge with:
the repo's files are the whole set. Set `authoritative: true` once the
import below has run.

**Publish order:** anywhere. A lesson names no other item and no item names
a lesson.

## Body

Strict: a key not listed is an error, not something kept. Types are JSON
types; `int` is an integer.

### The lesson

| Field           | Type              | Required | Notes                                                                                                            |
| --------------- | ----------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `id`            | string            | yes      | The slug, kebab-case.                                                                                            |
| `name`          | string            | yes      | Not empty.                                                                                                       |
| `description`   | string            | no       |                                                                                                                  |
| `status`        | `draft` \| `live` | yes      | The lesson's own switch: students see `live` lessons only. Separate from the item's status.                      |
| `part`          | int ≥ 1           | yes      | Its place in the series (Part 1 = 1).                                                                            |
| `order`         | int               | no       | Order within a part.                                                                                             |
| `key`           | `{ tonic, mode }` | yes      | `tonic` one of `C Db D Eb E F F# Gb G Ab A Bb B`; `mode` `major` \| `minor`. Every note is a degree of this key. |
| `tempo`         | number > 0        | yes      | Quarter-note bpm.                                                                                                |
| `timeSignature` | [int, int]        | yes      | Both ≥ 1.                                                                                                        |
| `countInBars`   | int 0–2           | yes      |                                                                                                                  |
| `steps`         | object[]          | yes      | At least one, below.                                                                                             |

### A step

| Field       | Type         | Required | Notes                                                                                                  |
| ----------- | ------------ | -------- | ------------------------------------------------------------------------------------------------------ |
| `tag`       | string       | yes      | `^[a-z0-9][a-z0-9-]*$`, unique within the lesson. Students' progress keys off it, so it never changes. |
| `title`     | string       | yes      | Not empty.                                                                                             |
| `direction` | string       | no       | What the student is told.                                                                              |
| `words`     | words        | yes      | The line the teacher sings, below.                                                                     |
| `call`      | figure       | yes      | What the teacher plays.                                                                                |
| `response`  | figure       | no       | What the student plays back. Left out, the student echoes the call.                                    |
| `tempo`     | number > 0   | no       | Overrides the lesson's.                                                                                |
| `passMark`  | number 0–100 | no       | Percent needed to pass; left out, the house mark.                                                      |

### Figures, words and notes

| Shape  | Fields                                                            | Notes                                                                                               |
| ------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| figure | `{ bars: int 1–8, notes: note[] }`                                | At least one note. `bars` is how long the segment lasts, trailing rests included.                   |
| words  | `{ bars: int 1–8, pickup?: int ≥ 240, notes: word[] }`            | As a figure, each note a syllable. `pickup`: below.                                                 |
| note   | `{ tick: int ≥ 0, duration: int ≥ 1, degree, octave?: int −2…2 }` | `tick` from the segment's start at 480 per quarter. `degree` one of `1 b2 2 b3 3 4 #4 5 b6 6 b7 7`. |
| word   | a note plus `text: string`, its `tick` any int                    | `text` not empty: one sung syllable. A pickup's syllables have negative ticks.                      |

Rests are the gaps between notes; nothing stores them.

### A pickup

The words may open with a pickup (an anacrusis): syllables sung at the end
of the count-in, leading into the words' first downbeat. "When I" on beat 4
and its "and" is a quarter's pickup:

```json
"words": {
  "bars": 2,
  "pickup": 480,
  "notes": [
    { "tick": -480, "duration": 240, "degree": "1", "text": "When" },
    { "tick": -240, "duration": 240, "degree": "1", "text": "I" },
    { "tick": 0, "duration": 480, "degree": "1", "text": "play" }
  ]
}
```

- `pickup` is the pickup's length in ticks, from an eighth (240) up to a
  bar less an eighth (1680 in 4/4). Left out, there is none, and the
  words start on their downbeat as before: every file without one means
  what it always did.
- A pickup's syllables are stored with **negative ticks**, back from the
  words' downbeat (tick 0), and none may start before `-pickup`.
- The downbeat stays where it always is, at the end of the count-in, so
  nothing after it moves: the call, the response, the grading and the
  drums all keep their places. The pickup is sung over the count-in's last
  beats, which click as always.
- A step with a pickup counts in **at least one bar**, whatever the
  lesson's `countInBars`: a lesson with no count-in still gets the bar its
  pickup sits in. (A pickup is always shorter than a bar, so one is
  enough.)
- Only the words have one; a figure's notes start at 0 or later.

### Rules beyond the field types

- No two steps share a `tag`.
- No note runs past its segment: `tick + duration` ≤ `bars` × the bar's
  ticks (`beats × 1920 / unit`), counted from the downbeat.
- A words `pickup` is at least an eighth shorter than the bar.
- No syllable starts before the words' pickup: `tick` ≥ `-pickup` (≥ 0
  without one).

The zod schema checks them (`superRefine`), with these messages:
`Step tag "…" is used twice`, `A call note runs past its 1 bar(s)`,
`A pickup must be at least an eighth shorter than a bar`,
`A syllable starts before the pickup: make the pickup longer` and
`A syllable starts before the words do: give them a pickup`.

### List projection (`/items`)

| Kind             | `title` | `subtitle`    | `sortYear` | `tags` |
| ---------------- | ------- | ------------- | ---------- | ------ |
| `music_literacy` | `name`  | `Part <part>` | null       | none   |

### Template (`GET /template/music_literacy`)

The mock's is in `src/features/admin/content/mock/mockKinds.ts`
(`templateFor`, from `src/content/musicLiteracy/template.ts`): a draft in C
major at 80 with a one-bar count-in, and one step whose line is four quarter
notes on the 1 and whose call is three, with an empty name to fill in.

## What the API needs

1. **Register the kind** in `GET /capabilities`:
   `{ kind: "music_literacy", schemaVersion: 1, bundle: "music-literacy", identity: "id", authoritative }`.
2. **Validate bodies** with `musicLiteracyBodySchema` in
   `src/content/musicLiteracy/schemas.ts`, and slugs with
   `slugPatterns.generated.json` (contract draft 5).
3. **Store and serve it like any record kind:** `GET /items?kind=`,
   `GET /items/:id`, `PUT /items` (an editor's save is a proposal),
   `DELETE /items/:id`, `GET /template/:kind`, `GET /validate/:kind`,
   export.
4. **Publish** to its CDN bundle, `music-literacy`.
5. **Import the repo's set once**, then set `authoritative: true`:
   `src/curriculum/data/musicLiteracy/*.json`, one JSON body per file, the
   file named for its `id`. The mock's seed
   (`src/features/admin/content/mock/seed.ts`) reads the same files.

## What the console does now

- **Editing.** The Music Literacy editor (`/console/music-literacy`, in the
  bar's Records menu) lists the lessons and edits one: its key, tempo and
  status, and each step's words, call and response as chips of notes and
  rests, or in the Parts editor's piano roll and staff. The words' Pickup
  control sets a pickup: its chips sit before a double bar (‖) and count
  the pickup bar's beats ("4", "4&"). Its
  `records/music_literacy[/:id]` URLs redirect there, and a lesson's Learn
  page in the console offers Edit lesson.
- **Saving.** Through the content API when `/capabilities` serves the kind;
  repo mode (`VITE_CONTENT_REPO=1`) does today
  (`src/scripts/repoContent/sources/instrumentContent.ts`, one file per
  item, laid out by the repo's prettier). Otherwise, on the dev server, it
  writes the file directly (`PUT /__dev/music-literacy/<id>`,
  `scripts/vite/devContentWriter.ts`); a deployed console with neither can
  only export the JSON. Every save is checked against the schema first.

## What changes on our side when the API lands

- `src/curriculum/engine/musicLiteracy/registry.ts` hydrates from the CDN
  with `fetchBundle`, the way `src/content/songStore.ts` does, falling back
  to the repo's files when no CDN is set. It is the one module that reads
  the lessons.
- The dev writer stops writing the kind.

## Planned: progress saved to the student's account

Decided by the product owner on 2026-10-17: progress has to belong to the
**user account, not the device**. Today each step's best score, passes and
attempts live in the browser's localStorage
(`src/curriculum/musicLiteracy/useLiteracyProgress.ts`, key
`music_literacy_progress_<lessonId>`). A student who switches Chromebooks
starts over, and a teacher can't see it. That's fine for the prototype but
not for classrooms.

The plan:

- Record every graded try through the existing progress API, the one the
  Theory lessons use (`src/lib/progress/api.ts`):
  - `PATCH /progress/activity` per step, with `status`, `attemptsDelta` and
    `score`;
  - `GET /progress/lesson` to load a lesson's state.
- One activity per step. Instance ids follow the Theory shape, built from
  the lesson id and the step's **tag** (tags survive edits and reordering),
  e.g. `music-literacy-part-1::v1::<tag>`.
- Keep localStorage only as an offline cache that syncs up on sign-in.
  Merge with "best score wins, a pass is never taken back".
- Start Here (`literacyPath.ts`) and the Home card read the same store, so
  they show the account's progress on any device.
- Teachers see it with the rest of the classroom progress. The classroom
  completion report (`reportCompletion`) already fires on the last pass.

**For the API (Ryan):** confirm `/progress/activity` accepts these lesson
and instance ids for a lesson that isn't a Theory mode, or say what it
needs.

## Trying it

- `npm run dev`: the editor saves through the dev writer.
- `VITE_CONTENT_REPO=1 npm run dev`: repo mode serves the kind; saves write
  the repo's files.
- `VITE_CONTENT_MOCK=1 npm run dev`: the offline mock serves and seeds it.
- Tests: `src/content/musicLiteracy/__tests__/musicLiteracySchemas.test.ts`
  holds the files to the schema; `src/features/admin/musicLiteracy/__tests__`
  covers the editor; repo mode's suites (`repoStore.noop`, `repoProfile`,
  `repoStore.parity`) cover the source.
