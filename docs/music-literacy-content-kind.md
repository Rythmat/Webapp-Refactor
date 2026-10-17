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

| Kind             | What it is                                                             | Identity | Slug pattern               | Bundle           | Authoritative | In the repo today           |
| ---------------- | ---------------------------------------------------------------------- | -------- | -------------------------- | ---------------- | ------------- | --------------------------- |
| `music_literacy` | One Music Literacy lesson (Part 1, Part 2…): a key, a tempo, its steps | `id`     | `^[a-z0-9]+(-[a-z0-9]+)*$` | `music-literacy` | yes           | 2 (Part 1; Part 2, a draft) |

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

| Field           | Type                      | Required | Notes                                                                                                                |
| --------------- | ------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| `id`            | string                    | yes      | The slug, kebab-case.                                                                                                |
| `name`          | string                    | yes      | Not empty.                                                                                                           |
| `description`   | string                    | no       |                                                                                                                      |
| `status`        | `draft` \| `live`         | yes      | The lesson's own switch: students see `live` lessons only. Separate from the item's status.                          |
| `part`          | int ≥ 1                   | yes      | Its place in the series (Part 1 = 1).                                                                                |
| `order`         | int                       | no       | Order within a part.                                                                                                 |
| `key`           | `{ tonic, mode }`         | yes      | `tonic` one of `C Db D Eb E F F# Gb G Ab A Bb B`; `mode` `major` \| `minor`. Every note is a degree of this key.     |
| `keyChoice`     | `lesson` \| `student`     | no       | Part 2. `student`: the student picks the key and mode, and `key` is the default and preview key. Left out, `lesson`. |
| `numbering`     | `chromatic` \| `scale`    | no       | Part 2. How degrees read; left out, `chromatic` (Part 1). Below, **Part 2**.                                         |
| `passes`        | `{ challenge?, create? }` | no       | The passes its echo steps offer beyond the echo; left out, the challenge on and the create pass off. Below.          |
| `tempo`         | number > 0                | yes      | Quarter-note bpm.                                                                                                    |
| `timeSignature` | [int, int]                | yes      | Both ≥ 1.                                                                                                            |
| `countInBars`   | int 0–2                   | yes      |                                                                                                                      |
| `steps`         | object[]                  | yes      | At least one, below.                                                                                                 |

### A step

This is the echo, call and response, every Part 1 step's kind and the
default: a step with no `kind` is one. Part 2's other kinds are below.

| Field       | Type                                   | Required | Notes                                                                                                  |
| ----------- | -------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `kind`      | `echo`                                 | no       | Left out, an echo. The editor writes none.                                                             |
| `tag`       | string                                 | yes      | `^[a-z0-9][a-z0-9-]*$`, unique within the lesson. Students' progress keys off it, so it never changes. |
| `section`   | string                                 | no       | Part 2. A label grouping steps ("Choose a Color"), any kind.                                           |
| `title`     | string                                 | yes      | Not empty.                                                                                             |
| `direction` | string                                 | no       | What the student is told.                                                                              |
| `words`     | words                                  | no       | The line the teacher sings, below. Left out (Part 2), none: the call comes in after the count-in.      |
| `call`      | figure \| chord figure                 | yes      | What the teacher plays: notes, or (Part 2) chords.                                                     |
| `response`  | figure                                 | no       | What the student plays back. Left out, the student echoes the call. Never with a chord call.           |
| `passes`    | `{ challenge?, create?, createBars? }` | no       | This step's passes, over the lesson's. Below.                                                          |
| `tempo`     | number > 0                             | no       | Overrides the lesson's.                                                                                |
| `passMark`  | number 0–100                           | no       | Percent needed to pass; left out, the house mark.                                                      |

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
`A syllable starts before the words do: give them a pickup`. Part 2's
rules and messages are below.

## Part 2

"Part 2 · Choose a color" (the Start Here path's second stop): the
student picks a key center on the circle of fifths and major or minor,
then plays melodies and chord progressions in it, each step twice: Atlas's
call echoed, then a call of their own. The seed is
`src/curriculum/data/musicLiteracy/music-literacy-part-2.json`, a **draft**
until the player supports it. Every field below is optional or a new kind,
so a Part 1 file means exactly what it did: no kind is an echo, no
`numbering` is chromatic, no `passes` is the challenge on and the create
pass off.

### The lesson's key, the student's choice

`"keyChoice": "student"` makes the key the student's: a `chooseKey` step
picks the tonic and a `chooseMode` step the mode (Part 2 asks for the mode
at the start of each section). Until they choose, and in the editor's
preview, the lesson plays in `key`. A choose step in a lesson whose key is
its own is refused.

The register stays the series': the 1 sits F♯3–F4, melodies run from the
low 5 to the 5 above, and chords are voiced in root position with every
root in D3–C♯4 (MIDI 50–61).

### Numbering

`"numbering": "scale"` reads a degree as the mode's: `3` is the 3rd of
the chosen mode, so minor turns 3, 6 and 7 into ♭3, ♭6 and ♭7 (natural
minor). One figure plays in either mode. Scale numbering writes only the
plain degrees `1`–`7` (an accidental is refused: the mode gives the
flats). `chromatic`, Part 1's, reads every label as written (`3` is
always the major 3rd).

What the app shows is the hybrid numbering either way: "♭3" for minor's 3,
chords as "4 maj", "♭6 maj", "5 dom7", never Roman numerals.

### The step kinds

`kind` picks one; every kind has `tag`, `section`, `title`, `direction`
and `tempo` (the tempo whatever it plays runs at).

| Kind           | Fields                                                                              | What the student does                                                                            |
| -------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `echo`         | `words?`, `call`, `response?`, `passes?`, `passMark?` (above)                       | Plays Atlas's call back (Pass 1), then, with the create pass, a call of their own (Pass 2).      |
| `chooseKey`    | none                                                                                | Picks the tonic on the circle of fifths, in the key colors ("choose a color").                   |
| `chooseMode`   | none                                                                                | Picks major or minor.                                                                            |
| `chooseChords` | `template` (`1`/`X` bars, 1–8), `distinct` (int ≥ 1), `harmony`, `saveAs` (a tag)   | Fills the X bars from the mode's palette with `distinct` different chords; saved under `saveAs`. |
| `replay`       | `progression` (a saved name), `harmonies?` (left out: triads, then 7ths), `rhythm?` | Listens: Atlas plays their progression once in each harmony. Nothing is graded.                  |

```json
{
  "kind": "chooseKey",
  "tag": "choose-your-key",
  "section": "Choose a Color",
  "title": "Choose your key",
  "direction": "Pick a color on the circle. Its note is your 1."
}
```

```json
{
  "kind": "chooseMode",
  "tag": "choose-major-or-minor",
  "section": "Choose a Color",
  "title": "Major or minor?",
  "direction": "Pick one. It sets your 3."
}
```

```json
{
  "kind": "chooseChords",
  "tag": "choose-1-x-x-x",
  "section": "Create a Chord Progression",
  "title": "Add a 3rd chord: | 1 | X | X | X |",
  "direction": "Fill the X bars with two different chords.",
  "template": ["1", "X", "X", "X"],
  "distinct": 2,
  "harmony": "triads",
  "saveAs": "three-chords-1"
}
```

```json
{
  "kind": "replay",
  "tag": "your-progression-with-7ths",
  "section": "7th Chords",
  "title": "Your progression, now with 7ths",
  "progression": "four-chords"
}
```

A melodic echo is Part 1's shape, with no words:

```json
{
  "tag": "play-1-3-1",
  "section": "Choose a Color",
  "title": "1-3-1",
  "direction": "Listen, then play it back.",
  "call": {
    "bars": 1,
    "notes": [
      { "tick": 0, "duration": 480, "degree": "1" },
      { "tick": 480, "duration": 480, "degree": "3" },
      { "tick": 960, "duration": 480, "degree": "1" }
    ]
  }
}
```

The 7 neighbor of the 1 is the 7 below it: `{ "degree": "7", "octave": -1 }`.

### Chord figures

An echo's `call` in chords: one chord a bar, each struck in the same
rhythm. It has a `harmony`; a melodic figure never does, which is how the
two are told apart.

| Field         | Type                         | Notes                                                                                                                     |
| ------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `chords`      | (`1`–`7` \| `X`)[], 1–8 bars | Each bar's chord, by its root's degree of the mode (minor's `3` is the ♭3 chord), or `X`.                                 |
| `progression` | a saved name                 | A progression a `chooseChords` step **before** this one saves. Alone, the call plays it; with `chords`, it fills the X's. |
| `rhythm`      | int[] (ticks)                | Every bar's rhythm, back to back from the downbeat; what's left of the bar is a rest. Part 2's: `[480, 480, 960]`.        |
| `harmony`     | `triads` \| `sevenths`       | The chords, or the same chords with their 7ths.                                                                           |

An echo with chords of its own, one playing a saved progression, and one
taking its X from one:

```json
{
  "tag": "the-1-chord",
  "section": "Create a Chord Progression",
  "title": "The 1 chord",
  "direction": "Play the 1 chord in this rhythm: short, short, long.",
  "call": {
    "chords": ["1", "1"],
    "rhythm": [480, 480, 960],
    "harmony": "triads"
  }
}
```

```json
{
  "tag": "play-1-x",
  "section": "Create a Chord Progression",
  "title": "Play | 1 | X |",
  "call": {
    "progression": "one-and-x",
    "rhythm": [480, 480, 960],
    "harmony": "triads"
  }
}
```

```json
{
  "tag": "play-x-1-7ths",
  "section": "7th Chords",
  "title": "Play | X | 1 |",
  "call": {
    "chords": ["X", "1"],
    "progression": "one-and-x-7ths",
    "rhythm": [480, 480, 960],
    "harmony": "sevenths"
  }
}
```

The bars are the chords' count (or the progression's template's). The
student echoes it in as many bars after, with no `response`. A saved
progression plays in the key and mode the student made it in.

**The chords** (`src/curriculum/engine/musicLiteracy/chords.ts`):
natural major and minor, the diminished chord left out (major's 7,
minor's 2), the 5 chord minor in minor.

| Mode  | Triads                                      | 7ths                                              |
| ----- | ------------------------------------------- | ------------------------------------------------- |
| Major | 1 maj, 2 min, 3 min, 4 maj, 5 maj, 6 min    | 1 maj7, 2 min7, 3 min7, 4 maj7, 5 dom7, 6 min7    |
| Minor | 1 min, ♭3 maj, 4 min, 5 min, ♭6 maj, ♭7 maj | 1 min7, ♭3 maj7, 4 min7, 5 min7, ♭6 maj7, ♭7 dom7 |

The palette an X is picked from is the mode's chords but the 1: major
2, 3, 4, 5, 6; minor ♭3, 4, 5, ♭6, ♭7.

### The passes

| Pass      | Who has it                                                                  | What happens                                                                                                                                                                                  |
| --------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| echo      | every echo step                                                             | Pass 1: Atlas calls, the student plays it back exactly. A chord call repeats one rhythm a bar, and the student echoes those chords in it.                                                     |
| challenge | melodic echoes, on by default (Part 1 without a field); Part 2 turns it off | "Want a challenge just for fun? Go again and play ALL the notes!" The same run; the student plays every note along with Atlas (the words, the call), then the response. Every note is graded. |
| create    | off by default; Part 2 turns it on lesson-wide                              | Pass 2, "Now Create Your Own Rhythms!": count-in, then the student's own call, then their repeat of it, on one pulse.                                                                         |

The lesson's `passes` set the defaults; a step's `passes` override them
(`createBars`: the create pass's call in bars, left out the call's; a
melody only, since a chord call's create pass lasts its chords). The
student's progress for the echo stays under the step's tag, as Part 1's
always has; the others go under `<tag>:challenge` and `<tag>:create`.

**The create pass.** The material is what the step uses: a melody's
pitches (on 1-3-5, just 1, 3 and 5, in their octaves), or each bar's
chord. Atlas plays no notes. When the call's bars are over, Atlas
quantizes it to the 16th grid (120 ticks; an onset rounds to the nearest,
an end too, at least a 16th long, never past the call or, for a chord, its
bar), transcribes it in the format's own note shape (for the roll and the
staff), and leaves out and flags notes outside the material (a chord's
notes outside its bar's chord; a chord missing a tone is kept and
flagged). An empty call means try again. The repeat is graded against the
transcription by the same graders and the same pass rule; the call's own
notes are never taken for it.

**Grading a chord echo.** Notes struck within 100 ticks of an attack's
first note are one attack. Each target attack is answered by the nearest
attack within a beat that has one of its notes; it needs every pitch class
of the chord, in any octave and any order (an inversion passes). A missing
tone fails that attack; notes outside the chord, and attacks where none
was called, cost what wrong notes do. Timing is the attack's first onset,
scored like a melodic note's. Pass: 70% overall and timing 50%, as ever.

**Grading the challenge.** Every note of the words, the call and the
response is a target, scored by the same maths and pass rule. Each
segment pairs only the notes played from an eighth before it starts to an
eighth before the next does, so a note in the words never answers the
call. The teacher's turn is graded, so a wrong key there shows gray.

### The student's choices

The key, the mode and the saved progressions are one small, versioned
object (`src/curriculum/engine/musicLiteracy/choices.ts`), kept by the
player beside the lesson's progress (`music_literacy_choices_<lessonId>`
in localStorage now, the student's account later, as for progress):

```json
{
  "version": 1,
  "tonic": "Eb",
  "mode": "minor",
  "progressions": {
    "one-and-x": {
      "template": ["1", "X"],
      "chords": ["1", "6"],
      "harmony": "triads",
      "tonic": "Eb",
      "mode": "minor"
    }
  }
}
```

The 7ths section opens by replaying the student's progression from the
chord section, and Studio's "Hear it with your band" stop will play it
from the same object.

### Part 2's rules and messages

- A choose-key or choose-mode step only in a student-key lesson: `Only a
lesson whose key is the student’s choice asks for it`.
- Scale numbering, plain degrees: `Scale numbering writes the plain
degrees 1–7: the mode gives the flats`.
- A template with an X: `A template needs an X bar for the student to
choose`; `distinct` that fits: `2 different chords don’t fit in 1 X
bar`, `There are only 5 chords to choose from`; one step per name:
  `Progression "…" is saved by two steps`.
- A chord call or replay names a progression saved before it: `No
choose-chords step before this one saves "…"`; has chords or a
  progression: `A chord call needs its chords, or a progression to play`;
  an X has a progression of one X chord: `An X needs a progression to
take its chord from`, `X stands for one chord, but "…" has 2: play the
progression itself`; `A chord call with chords of its own takes a
progression only for an X`.
- No diminished chord (in either mode when the student picks it): `The 7
chord is diminished in major: use another`.
- A rhythm fits a bar: `A chord rhythm runs past its bar`; a chord call
  has no response, challenge or create bars: `A chord call is echoed as it
is: leave the response out`, `The challenge pass is for melodies, not
chord calls`, `A chord call’s create pass lasts its chords’ bars: leave
its bars out`.
- Create bars only with a create pass: `Create-pass bars on a step without
a create pass`.

### Where the code is

| What                                               | Where (`src/curriculum/engine/musicLiteracy/`) |
| -------------------------------------------------- | ---------------------------------------------- |
| Pitches, modal numbering                           | `pitch.ts` (re-exported by `literacy.ts`)      |
| Timelines, notes, chord figures, replays, sections | `literacy.ts`                                  |
| Chords, palette, voicing, progressions             | `chords.ts`                                    |
| The student's choices                              | `choices.ts`                                   |
| Which passes a step has                            | `passes.ts`                                    |
| Grading: the echo, the challenge                   | `grading.ts`                                   |
| Grading a chord echo                               | `chordGrading.ts`                              |
| The create pass                                    | `createPass.ts`                                |
| Run cues (challenge hints, the create run)         | `run.ts`                                       |

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
  holds the files to the schema (`musicLiteracyPart2Schemas.test.ts`, Part
  2's rules); `src/curriculum/engine/musicLiteracy/__tests__` covers the
  music, the grading and the passes, on frozen fixtures (`__fixtures__/`);
  `src/features/admin/musicLiteracy/__tests__` covers the editor; repo
  mode's suites (`repoStore.noop`, `repoProfile`, `repoStore.parity`) cover
  the source.
