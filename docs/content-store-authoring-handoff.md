# Everything in the Content Store: handoff for Ryan and Aaron

What the content API and the console need so that **all** lesson authoring
lives in the Content Store and is edited from the back office: lessons,
Bands, Parts and the rest of the rhythm section. For Ryan (the API) and
Aaron (console review and app integration). From Peter, 3 November 2026.

This builds on two documents you already have, and does not repeat them:

- [`instrument-content-kinds.md`](instrument-content-kinds.md) (October
  2026): `drum_groove`, `instrument_part` and `feel_profile`.
- [`console-backend-integration.md`](console-backend-integration.md): the
  write API, the seed import and the phases.

## The decision

Peter's decision on 3 November: **the Content Store is the home for
everything authored in the back office.** Repo data files stop being the
source of truth. He wants to make every edit himself in the back office,
with no AI and no repo changes needed.

The workflow this serves:

1. A level is drafted. That creates a skeleton: the level's styles, a Band
   variation for each style, and its sections and steps.
2. Peter refines the Band's variations and publishes them.
3. Lesson activities and Practice Tracks are built from the Band's parts.
4. Peter edits those activities in the back office: adds or deletes steps,
   rewrites the text, edits notes in the Piano Roll or Score, or re-records
   them from a MIDI keyboard. Then he saves and publishes.
5. Practice Tracks follow. They are built live from each step's chords, key,
   tempo and Band, so an edited step's track changes with it.

An activity made from a Band part keeps a link to it. When the part changes,
the activity offers "update from the Band" and never changes on its own.

## Where things stand

| Kind              | In the store today                                          | In the repo today                                   | Count       |
| ----------------- | ----------------------------------------------------------- | --------------------------------------------------- | ----------- |
| `activity_flow`   | Yes (a legacy kind), not authoritative                      | `src/curriculum/data/activityFlows/*_v2.ts`         | see §3      |
| `drum_groove`     | Specified in October; console side done; waiting on the API | `src/curriculum/data/drumGrooves/*.json`, `studio/` | 59 + 29     |
| `instrument_part` | Specified in October; console side done; waiting on the API | `src/curriculum/data/parts/*.json`                  | 326 (was 1) |
| `feel_profile`    | Specified in October; console side done; waiting on the API | none yet                                            | 0           |
| `band`            | **Not a kind yet**                                          | `src/curriculum/data/bands/*.json`                  | 6           |
| `lesson_pairing`  | **Not a kind yet**                                          | `src/curriculum/data/lessonPairings/*.json`         | 24          |
| `player`          | **Not a kind yet**                                          | `src/curriculum/data/players/*.json`                | 57          |
| `bass_line`       | **Not a kind yet**                                          | `src/curriculum/data/bassLines/*.json`              | 28          |
| `chord_comping`   | **Not a kind yet**                                          | `src/curriculum/data/chordComping/*.json`           | 3           |

The five kinds that are not in the store yet are saved today by the dev
server's file writer (`scripts/vite/devContentWriter.ts`). That only works
on a local machine, which is why Peter can't edit them from a deployed
console.

---

## Ryan: the API

### 1. Finish the October kinds

Everything in [`instrument-content-kinds.md`](instrument-content-kinds.md)
still stands. Only the counts have grown: parts went from 1 to 326, and
grooves to 59 lesson grooves plus 29 Studio grooves. Do these first, because
the new kinds below reference them.

### 2. Add five new kinds

All five are identified by `id`, schema version 1, with one CDN bundle each.
Bodies are strict, like the October kinds: a key not listed is an error.
Each repo file is one body, named for its `id`.

| Kind             | What it is                                                                                       | Slug pattern            | Bundle            | Import from                                 |
| ---------------- | ------------------------------------------------------------------------------------------------ | ----------------------- | ----------------- | ------------------------------------------- |
| `bass_line`      | A bass line written as chord degrees (R, 3, 5, approach…), walked over any chart                 | `^[a-z0-9][a-z0-9_-]*$` | `bass-lines`      | `src/curriculum/data/bassLines/*.json`      |
| `chord_comping`  | A comping rhythm whose hits voice whatever chord is sounding                                     | `^[a-z0-9][a-z0-9_-]*$` | `chord-comping`   | `src/curriculum/data/chordComping/*.json`   |
| `player`         | A band member (Jazz-Pianist-1): the items they own, grouped into families of versions            | `^[a-z0-9][a-z0-9_-]*$` | `players`         | `src/curriculum/data/players/*.json`        |
| `band`           | A style's rhythm section: members, each one's sound and level, and one variation per style       | `^[a-z0-9][a-z0-9_-]*$` | `bands`           | `src/curriculum/data/bands/*.json`          |
| `lesson_pairing` | Which Band (and variation) a lesson style plays, with overrides for particular sections or steps | the lesson style's id   | `lesson-pairings` | `src/curriculum/data/lessonPairings/*.json` |

The TypeScript types are the source for these bodies: `bassLine.ts`,
`chordComping.ts`, `players/player.ts`, `band/band.ts` and
`lessonPairings/registry.ts`, all under `src/curriculum/engine/`. **Zod
schemas for all five will land in `src/content/instrument/schemas.ts` in a PR
from Peter's branch,** next to the October three. Copy them from there, as
before. The tables below summarise them.

#### `bass_line`

| Field            | Type                    | Required | Notes                                                                                                |
| ---------------- | ----------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `id`, `name`     | string                  | yes      |                                                                                                      |
| `description`    | string                  | no       |                                                                                                      |
| `tags`           | string[]                | no       |                                                                                                      |
| `status`         | `draft` \| `live`       | yes      | The item's own switch, as for grooves.                                                               |
| `order`          | int                     | no       | List position.                                                                                       |
| `genre`          | string                  | no       | Whose walking and approach rules it plays by.                                                        |
| `timeSignature`  | [int, int]              | yes      |                                                                                                      |
| `length`         | string `"<n>m"`         | yes      | Bars, e.g. `"2m"`, `"32m"`.                                                                          |
| `gridResolution` | `8n` \| `16n` \| `8t`   | yes      | Editor only.                                                                                         |
| `instrument`     | `upright` \| `electric` | yes      |                                                                                                      |
| `grooves`        | string[]                | yes      | `drum_groove` ids it goes with, best first.                                                          |
| `anchorOnChange` | boolean                 | yes      |                                                                                                      |
| `notes`          | object[]                | yes      | Each `{ time: "bar:beat:16th", degree, dur: number > 0, velocity: 0–1, approach?, goal?: boolean }`. |

`degree` is one of `8 7 6 5 4 3 2 R 7- 5- A W X`. `approach` is
`{ step: int ≠ 0, motion: chromatic | diatonic, scale?: key | goal }`.

#### `chord_comping`

| Field                                             | Type                  | Required | Notes                                                                                                           |
| ------------------------------------------------- | --------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `id`, `name`, `status`, `timeSignature`, `length` | as for `bass_line`    | yes      |                                                                                                                 |
| `description`, `tags`, `order`                    | as for `bass_line`    | no       |                                                                                                                 |
| `gridResolution`                                  | `8n` \| `16n` \| `8t` | yes      |                                                                                                                 |
| `ceiling`                                         | int 0–127             | yes      | The highest note a voicing may reach (72 is C5).                                                                |
| `grooves`                                         | string[]              | yes      | `drum_groove` ids.                                                                                              |
| `hits`                                            | object[]              | yes      | Each `{ time, dur, velocity, tones?: full \| upper \| top, approach?, goal? }`, the same shapes as a bass note. |

#### `player`

| Field         | Type             | Required | Notes                                                                                                                   |
| ------------- | ---------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| `id`, `name`  | string           | yes      | `jazz-pianist-1`, `Jazz-Pianist-1`.                                                                                     |
| `instrument`  | band instrument  | yes      | `drums percussion bass keys guitar synth strings horns`.                                                                |
| `genre`       | string           | no       |                                                                                                                         |
| `kind`        | `placeholder`    | yes      | Only placeholders for now; named personas later.                                                                        |
| `description` | string           | no       |                                                                                                                         |
| `order`       | int              | no       |                                                                                                                         |
| `items`       | `{ kind, id }[]` | yes      | The items they own. `kind` is `groove` \| `bassLine` \| `comping` \| `part`. **An item belongs to at most one player.** |
| `families`    | object[]         | no       | Each `{ id, name, style?, versions: { part, use: band \| teaching \| both, levels: int[] }[] }`.                        |

#### `band`

| Field            | Type              | Required | Notes                                                                                                                                               |
| ---------------- | ----------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `name`     | string            | yes      |                                                                                                                                                     |
| `description`    | string            | no       |                                                                                                                                                     |
| `genre`, `style` | string            | no       |                                                                                                                                                     |
| `tags`           | string[]          | no       |                                                                                                                                                     |
| `status`         | `draft` \| `live` | yes      | Lessons and Practice Tracks play only `live` bands.                                                                                                 |
| `order`          | int               | no       |                                                                                                                                                     |
| `timeSignature`  | [int, int]        | yes      |                                                                                                                                                     |
| `tempo`          | number > 0        | yes      | Preview tempo, in quarter-note bpm.                                                                                                                 |
| `swing`          | number 50–75      | no       | Preview swing (new this week). Lessons keep their own.                                                                                              |
| `swingUnit`      | `8n` \| `16n`     | no       | What the swing moves.                                                                                                                               |
| `layers`         | object[]          | yes      | Members: `{ id, name, instrument, source?: { kind, id }, sound?, volume?: 0–1, muted?, player? }`. In a band with variations, `source` is left out. |
| `variations`     | object[]          | no       | `{ id, name, style?, timeSignature?, tempo?, swing?, swingUnit?, plays: { [memberId]: { kind, id } }, sounds?: { [memberId]: string } }`.           |
| `preview`        | object            | no       | Editor only: `{ progression?, key?, chart?, chartKey?: { tonic, minor } }`.                                                                         |

#### `lesson_pairing`

| Field                      | Type     | Required | Notes                                                                                                                          |
| -------------------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `id`                       | string   | yes      | A lesson style id (`jazz-l2-transfer`, `blues-l1-shuffle`), from `src/curriculum/data/lessonStyles.ts`.                        |
| `band`                     | string   | no       | A `band` id.                                                                                                                   |
| `variation`                | string   | no       | One of that band's variation ids.                                                                                              |
| `overrides`                | object[] | no       | `{ section?: A–D, steps?: int[], band, variation? }`. `steps` are the level's step numbers; see §3 on why they must not shift. |
| `drums`, `bass`, `comping` | string   | no       | Legacy single-item pairings. Keep accepting them.                                                                              |

A pairing with nothing in it means "no pairing". The console deletes the
item rather than saving it empty.

#### References between kinds

| From                         | Field                                              | To                                       | Checked                                                        |
| ---------------------------- | -------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------- |
| `band`                       | `layers[].source`, `variations[].plays[*]`         | groove / bass line / comping / part      | Recommended: refuse to delete a referenced item (`REFERENCED`) |
| `band`                       | `layers[].player`                                  | `player`                                 | Recommended                                                    |
| `band`                       | `variations[].style`                               | a lesson style (code, `lessonStyles.ts`) | No                                                             |
| `player`                     | `items[]`, `families[].versions[].part`            | groove / bass line / comping / part      | Recommended                                                    |
| `lesson_pairing`             | `band`, `overrides[].band` (and their `variation`) | `band`                                   | Recommended                                                    |
| `bass_line`, `chord_comping` | `grooves[]`                                        | `drum_groove`                            | No (audition only)                                             |
| `instrument_part`            | `feel`                                             | `feel_profile`                           | As in October                                                  |
| `activity_flow`              | `steps[].grooveId`                                 | `drum_groove`                            | As in October (no)                                             |

**Publish order**, so every reference resolves: `feel_profile`,
`drum_groove`, `bass_line`, `chord_comping`, `instrument_part`, `player`,
`band`, `lesson_pairing`, then `activity_flow`.

**List projection (`/items`):** `title` is `name` (for `lesson_pairing`, the
`id`). `subtitle` is `genre` for bass lines, comping, players and bands, and
`band` for pairings. `tags` are `tags` where the kind has them.

**Templates (`GET /template/:kind`):**

- a 1-bar 4/4 bass line of roots;
- a 1-bar comping pattern with one whole-bar hit (`blankComping`);
- an empty placeholder player;
- a band with no layers;
- an empty pairing.

**Import once**, then set `authoritative: true`, the same as the October
kinds.

### 3. Lessons (`activity_flow`)

The API already serves lessons. Three things are new.

1. **Accept the newer step fields.** Recent lessons use step-level
   `key`, `tempo`, `swing`, `swingUnit` (`8n` | `16n`), `timeSignature`
   (including `[12, 8]`), `chordsPerBar` (`2`), `variants`, `grooveId`,
   `instrument_config` and `backing_parts`. If the API validates or trims
   `activity_flow` bodies, please make sure these survive a save. The type is
   `ActivityStepV2` in `src/curriculum/types/activity.v2.ts`.
2. **A step's number is its identity.** Student progress is keyed by
   `curriculum:<genre>:<level>:<section>:<stepNumber>`
   (`src/curriculum/hooks/useCurriculumProgress.ts`), and pairing overrides
   name steps by number. From now on the console never renumbers steps:

   - a new step takes the level's highest number plus one;
   - a moved step keeps its number;
   - a deleted step leaves a gap.

   Recommended: warn on a save where an existing step (same `tag`) changes
   its `stepNumber`.

3. **Bringing the repo's newer lessons in.** Blues L1–L3 are new
   (`blues-l1`…`blues-l3`), and Jazz L1–L3 have changed since the store's
   copy. The console will save them once, through `PUT /items` as Peter (an
   admin), from a one-time import page like the chord-chart import. That
   needs nothing new from the API, provided the bodies pass validation (item
   1).

**Coming later, with its schema sent before use:** a step will record the
Band part it was made from (part id, bars, hands, and the part's version
when copied). That's what lets "update from the Band" offer itself.

### Ryan's checklist

- [ ] `drum_groove`, `instrument_part`, `feel_profile` registered, validated, served, published and imported ([October doc](instrument-content-kinds.md)).
- [ ] `bass_line`, `chord_comping`, `player`, `band`, `lesson_pairing` registered in `GET /capabilities` with the bundles above.
- [ ] Bodies validated with the zod schemas from Peter's PR; slugs checked against the patterns above.
- [ ] `GET/PUT/DELETE /items`, `GET /template/:kind` and `GET /validate/:kind` work for all eight instrument kinds, with an editor's save landing as a proposal.
- [ ] Each kind publishes to its CDN bundle, in the publish order above.
- [ ] One-time import from the repo folders listed above, then `authoritative: true`.
- [ ] `activity_flow` saves keep the step fields listed in §3.
- [ ] Optional: `REFERENCED` on delete for the references above, and a step-number warning on `activity_flow` saves.

---

## Aaron: the console and the app

### Coming from Peter's branch, for you to review

1. **Editing a lesson in place.** In the mirrored lesson page
   (`/console/content/curriculum/<genre>/<level>`), Edit opens the step side
   by side with the live student view. The editor brings the Parts editor's
   tools: Piano Roll, Score, live MIDI capture over the step's own band,
   hands and approaches. It also covers the step's text and settings, and
   adding, duplicating, deleting and moving steps. Saving goes to the
   `activity_flow` item through the normal content save. In local testing it
   runs against the offline mock (`VITE_CONTENT_MOCK=1`).
2. **The five new kinds, console side:**
   - zod schemas in `src/content/instrument/schemas.ts`;
   - registration in `useAdminContent.ts` and `kinds.ts`;
   - repo-mode sources (`src/scripts/repoContent/sources/`) and offline-mock
     seeds;
   - the Band, Bass Line, Comping, Player and pairing editors saving through
     the content system when `/capabilities` serves the kind, falling back to
     the dev file writer until then (the pattern in
     `src/features/admin/drumGrooves/instrumentStore.ts`).
3. **A one-time import page** for the repo's newer lessons (§3).
4. **Later:** "New step from a Band part", "update from the Band", and
   drafting a level from the back office.

### Integration: who builds it?

When the API serves a kind, the app has to read the published content
instead of the bundled repo files. Every registry below loads its files with
`import.meta.glob` today. Each should load its CDN bundle with `fetchBundle`
(the way `src/content/songStore.ts` does), and fall back to the repo files
when no CDN is set:

- `src/curriculum/engine/drumGrooves/registry.ts`
- `src/curriculum/engine/parts/registry.ts` (and `parts/feel.ts`)
- `src/curriculum/engine/bassLines/registry.ts`
- `src/curriculum/engine/chordComping/registry.ts`
- `src/curriculum/engine/players/registry.ts`
- `src/curriculum/engine/band/registry.ts`
- `src/curriculum/engine/lessonPairings/registry.ts`

Several of these are read synchronously during a build (the band engine,
Practice Tracks). They will need the same "await hydration first" step that
`flowStore.ts` uses for lessons. **Open question for you:** do you want to
own this, or should it come from Peter's branch for you to review?

### What to watch for in review

- Step numbers are never renumbered (§3, item 2). The old level editor's
  `renumber` (`LessonLevelEditor.tsx`) still does it, numbering each
  section from 1. The current lessons number across the whole level
  (A1 is 1, D3 ends at 42), so one structural edit there would move
  progress and pairing overrides onto other steps. Until it retires, add,
  move and delete steps in the new editor only.
- A test session never writes the real store. Use `VITE_CONTENT_MOCK=1`, or
  `VITE_CONTENT_REPO=1` for kinds served from repo files.
- Nothing should overwrite Peter's edits on its own. Generated drafts arrive
  as reviewable changes.

### Aaron's checklist

- [ ] Review and merge the in-place lesson editor PR.
- [ ] Review and merge the five-kinds PR (schemas, registration, repo-mode sources, mock seeds, saving through the content system).
- [ ] Decide who builds CDN hydration for the seven registries, and land it once Ryan's kinds are live.
- [ ] When a kind is live and authoritative, stop the dev file writer from writing it (`scripts/vite/devContentWriter.ts`).

---

## Questions to answer back

1. **Ryan:** where are the October kinds (`drum_groove`, `instrument_part`,
   `feel_profile`)? Has the seed import (cutover) run?
2. **Ryan:** does `PUT /items` for `activity_flow` validate or trim bodies?
   If so, against what schema?
3. **Both:** has any version of Jazz L2 or L3 reached students? Steps there
   were removed and inserted in the repo before the never-renumber rule. If
   students have progress on those levels, the import needs a plan to keep
   their marks on the right steps.
4. **Aaron:** CDN hydration: yours, or from Peter's branch?
5. **Both:** to make _everything_ editable, two more groups are still code:
   lesson styles (`src/curriculum/data/lessonStyles.ts`) and genre Overviews
   (`src/curriculum/data/genreProfiles/*.ts`). Are you happy for us to specify
   `lesson_style` and `genre_profile` as the next kinds?

## Working on it locally

- `VITE_CONTENT_MOCK=1 npm run dev`: the offline mock serves and seeds the
  kinds the console knows (lessons, and the new five once their PR lands);
  saves stay in the browser.
- `VITE_CONTENT_REPO=1 npm run dev`: repo mode serves the instrument kinds
  from the repo's files, and saves write them (it serves no lessons).
- `VITE_DEV_AUTH_BYPASS=1 VITE_DEV_AUTH_BYPASS_ROLE=admin`: signs in as a
  dev admin, so the console opens (`src/auth/devBypass.ts`).
- Tests: `src/content/instrument/__tests__/instrumentSchemas.test.ts` holds
  every repo file to the schemas; `src/scripts/repoContent/__tests__/` covers
  repo mode.
