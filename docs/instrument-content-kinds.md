# Instrument content kinds

What the content API needs so the console's instrument content — drum
grooves, instrumental parts and feel profiles — is stored, validated and
published like every other content kind. For Ryan (the API) and Aaron
(console review). October 2026.

The console side is done: the kinds are registered, repo mode serves them
from the repo's files, the offline mock seeds them, and Cortex reads them.
What is left is the API, described in **What the API needs** below.

## The short version

- **Create three kinds now:** `drum_groove`, `instrument_part`,
  `feel_profile`. Identity field `id` for all three, schema version 1, one
  CDN bundle each.
- **Two more later:** `synth_patch` and `drum_kit`. They stay code-owned for
  now; see [Later kinds](#later-kinds).
- **`lesson` is a graph node, not a content kind.** It is derived from
  `activity_flow`; nothing to create.
- The bodies, slug patterns and bundle names below are the contract. The
  machine-readable copies are `src/content/instrument/schemas.ts` (zod) and
  `src/scripts/apiContract/slugPatterns.generated.json` (in contract draft
  4).

## The kinds

| Kind              | What it is                                                            | Identity | Slug pattern                  | Bundle             | Authoritative | In the repo today                           |
| ----------------- | --------------------------------------------------------------------- | -------- | ----------------------------- | ------------------ | ------------- | ------------------------------------------- |
| `drum_groove`     | A drum groove: written hits plus played feel, meter, kit, loop length | `id`     | `^[a-z0-9]+([_-][a-z0-9]+)*$` | `drum-grooves`     | yes           | 48 (19 lesson, 29 imported from the Studio) |
| `instrument_part` | A piano, bass or guitar part, filed by role, style and level          | `id`     | `^[a-z0-9]+(-[a-z0-9]+)*$`    | `instrument-parts` | yes           | 1                                           |
| `feel_profile`    | Per-16th timing and accents measured from a player                    | `id`     | `^[a-z0-9]+(-[a-z0-9]+)*$`    | `feel-profiles`    | yes           | 0                                           |

**Why a groove id keeps underscores.** Lesson steps already store groove ids
(`groove_funk_02`, `trap_a`) and the Studio's are kebab (`groove-rock-2`).
Re-slugging would break those references, the same reason song ids are
verbatim. New grooves are kebab.

**Authoritative from the start.** None of the three has a code registry the
API would need to merge with: the repo's files are the whole set. Set
`authoritative: true` once the import below has run.

**Publish order:** `feel_profile`, then `drum_groove`, then
`instrument_part` — a feel before the grooves and parts that name it.

## Bodies

Strict: a key not listed is an error, not something kept. Types are JSON
types; `int` is an integer.

### `drum_groove`

| Field           | Type                                                | Required | Notes                                                                                                                                     |
| --------------- | --------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | string                                              | yes      | The slug. What lesson steps name in `grooveId`.                                                                                           |
| `name`          | string                                              | yes      | Not empty.                                                                                                                                |
| `description`   | string                                              | no       |                                                                                                                                           |
| `genre`         | string                                              | no       | A genre id (`funk`, `hip-hop`).                                                                                                           |
| `style`         | string                                              | no       | Free text finer than the genre (`Trap`, `Bossa Nova`).                                                                                    |
| `tags`          | string[]                                            | no       |                                                                                                                                           |
| `status`        | `draft` \| `live`                                   | yes      | The groove's own switch: lessons and the Studio play only `live` grooves. Separate from the item's status.                                |
| `timeSignature` | [int, int]                                          | yes      | Both ≥ 1.                                                                                                                                 |
| `feltBeats`     | int ≥ 1                                             | yes      | Pulses per bar a musician taps (4 for a 12/8 shuffle).                                                                                    |
| `bars`          | int ≥ 1                                             | yes      | Loop length.                                                                                                                              |
| `tempo`         | number > 0                                          | yes      | Always quarter-note bpm.                                                                                                                  |
| `tempoUnit`     | `quarter` \| `dotted-quarter` \| `half` \| `eighth` | yes      | What the number means on screen.                                                                                                          |
| `swing`         | number 0–100                                        | yes      | 50 is straight.                                                                                                                           |
| `grid`          | `8n` \| `16n` \| `8t` \| `16t` \| `32n`             | yes      | Editor grid only.                                                                                                                         |
| `kit`           | string                                              | yes      | A drum kit id (`natural`, `808`, `house`, or a custom kit's).                                                                             |
| `padGains`      | object                                              | yes      | Pad note (as a string key, `"42"`) → level ≥ 0.                                                                                           |
| `humanize`      | `{ timing: number ≥ 0, velocity: number ≥ 0 }`      | yes      |                                                                                                                                           |
| `hits`          | object[]                                            | yes      | Each `{ tick: int ≥ 0, note: int 0–127, velocity: int 1–127, offset?: int }`. `tick` is where it is written; `offset` is the played feel. |

### `instrument_part`

| Field                                     | Type                                                                              | Required | Notes                                                                                                                                                                                  |
| ----------------------------------------- | --------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                      | string                                                                            | yes      | Kebab.                                                                                                                                                                                 |
| `name`                                    | string                                                                            | yes      | Not empty.                                                                                                                                                                             |
| `description`                             | string                                                                            | no       |                                                                                                                                                                                        |
| `instrument`                              | `piano` \| `bass` \| `guitar` \| `drums`                                          | yes      |                                                                                                                                                                                        |
| `role`                                    | `melody` \| `comping` \| `two-hand` \| `bassline` \| `riff` \| `groove` \| `fill` | yes      |                                                                                                                                                                                        |
| `genre`, `style`                          | string                                                                            | no       | As for grooves.                                                                                                                                                                        |
| `level`                                   | int 1–5                                                                           | yes      | Basic → Pro.                                                                                                                                                                           |
| `tags`                                    | string[]                                                                          | yes      |                                                                                                                                                                                        |
| `status`                                  | `draft` \| `live`                                                                 | yes      | As for grooves.                                                                                                                                                                        |
| `key`                                     | `{ tonic: int 0–11, mode: string }`                                               | yes      | The key the notes are written in.                                                                                                                                                      |
| `timeSignature`, `bars`, `tempo`, `swing` |                                                                                   | yes      | As for grooves.                                                                                                                                                                        |
| `feel`                                    | string                                                                            | no       | A `feel_profile` id.                                                                                                                                                                   |
| `chordSymbols`                            | string[]                                                                          | no       | Context, one per bar.                                                                                                                                                                  |
| `sound`                                   | string                                                                            | yes      | The Studio sound: `piano-sampler`, `bass-electric:finger`, `oracle-synth:DRIFT`…                                                                                                       |
| `notes`                                   | object[]                                                                          | yes      | Each `{ tick: int ≥ 0, duration: int ≥ 1, midi: int 0–127, velocity: int 1–127, hand?: lh \| rh, string?: int ≥ 1, fret?: int ≥ 0, offset?: int, grace?: boolean, finger?: int 1–5 }`. |
| `source`                                  | object                                                                            | yes      | One of `{ kind: "lesson", genre, level, section, stepNumber, title?, tag?, variant?, hands?, tickOffset? }`, `{ kind: "midi", fileName, track? }`, `{ kind: "scratch" }`.              |

### `feel_profile`

| Field         | Type         | Required | Notes                                                                         |
| ------------- | ------------ | -------- | ----------------------------------------------------------------------------- |
| `id`          | string       | yes      | Kebab.                                                                        |
| `name`        | string       | yes      | Not empty.                                                                    |
| `description` | string       | no       |                                                                               |
| `step`        | int ≥ 1      | yes      | Grid the positions are counted on, in ticks (120 = 16ths).                    |
| `positions`   | int ≥ 1      | yes      | Positions per cycle (4 = a beat of 16ths, 8 = a 2/4 bar).                     |
| `offsets`     | number[]     | yes      | One per position, in ticks; negative is ahead. Length must equal `positions`. |
| `velocity`    | number[] ≥ 0 | no       | Accent multiplier per position.                                               |
| `source`      | string       | no       | Who or what it was measured from.                                             |

### List projection (`/items`)

| Kind              | `title` | `subtitle`            | `sortYear` | `tags` |
| ----------------- | ------- | --------------------- | ---------- | ------ |
| `drum_groove`     | `name`  | `style`, else `genre` | null       | `tags` |
| `instrument_part` | `name`  | `instrument`          | null       | `tags` |
| `feel_profile`    | `name`  | `source`              | null       | none   |

### Templates (`GET /template/:kind`)

The mock's are in `src/features/admin/content/mock/mockKinds.ts`
(`templateFor`): a blank 1-bar 4/4 groove on the natural kit, a blank 2-bar
piano part in C, and a 4-position feel with zero offsets.

## References

| From              | Field                            | To             | Checked                                                                                                                                      |
| ----------------- | -------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `instrument_part` | `feel`                           | `feel_profile` | Recommended: refuse a delete of a feel a part names (`REFERENCED`).                                                                          |
| `activity_flow`   | `sections[].steps[].grooveId`    | `drum_groove`  | No. A step may name a code groove that has no item; the lesson engine falls back to code. Cortex's integrity report flags the dangling ones. |
| `drum_groove`     | `kit`                            | a drum kit     | No, until `drum_kit` is a kind.                                                                                                              |
| `instrument_part` | `sound` (`oracle-synth:<patch>`) | a synth patch  | No, until `synth_patch` is a kind.                                                                                                           |

None of these fields matches the `Id`/`Ids` naming rule, so `REF_PATHS` has
no entries for them yet. They join it when the references become checked.

## What the API needs

1. **Register the kinds** in `GET /capabilities`:
   `{ kind, schemaVersion: 1, bundle, identity: "id", authoritative }` for
   each of the three, with the bundles above.
2. **Validate bodies** with the schemas in
   `src/content/instrument/schemas.ts` (copy them as you copy
   `recordBodySchemas.ts`), and slugs with
   `slugPatterns.generated.json` (contract draft 4).
3. **Store and serve them like any record kind:** `GET /items?kind=`,
   `GET /items/:id`, `PUT /items` (an editor's save is a proposal),
   `DELETE /items/:id`, `GET /template/:kind`, `GET /validate/:kind`,
   export.
4. **Publish** each to its CDN bundle (`drum-grooves`, `instrument-parts`,
   `feel-profiles`), in the publish order above.
5. **Import the repo's set once**, then set `authoritative: true`:

   - grooves: `src/curriculum/data/drumGrooves/*.json` and
     `src/curriculum/data/drumGrooves/studio/*.json`
   - parts: `src/curriculum/data/parts/*.json`
   - feels: `src/curriculum/data/feels/*.json`

   One JSON body per file, the file named for its `id`. The mock's seed
   (`src/features/admin/content/mock/seed.ts`) reads the same files.

## What the console does now

- **Saving.** The Drum Grooves designer and the Parts Library save through
  the content API when `/capabilities` serves the kind, and repo mode
  (`VITE_CONTENT_REPO=1`) serves all three today
  (`src/scripts/repoContent/sources/instrumentContent.ts`, one file per
  item, laid out by the repo's prettier). Otherwise, on the dev server, they
  write the files directly (`scripts/vite/devContentWriter.ts`); that path
  retires once the API serves the kinds.
- **Editing.** Grooves and parts keep their own pages; their
  `records/:kind` URLs redirect there. Feels list among the other records.
- **Cortex.** The working graph reads the served items through a
  projection (`src/features/admin/content/graph/instrumentInputs.ts`), so
  the API's copies replace the repo's once the kind is authoritative.

## What changes on our side when the API lands

- The registries (`src/curriculum/engine/drumGrooves/registry.ts`,
  `src/curriculum/engine/parts/registry.ts`, `src/curriculum/engine/parts/feel.ts`)
  hydrate from the CDN with `fetchBundle`, the way `src/content/songStore.ts`
  does, falling back to the repo's files when no CDN is set.
- Lessons, Practice Tracks and the Studio's Parts and Grooves tabs then read
  published content, not the app bundle.
- The dev writer stops writing these three kinds.

## Later kinds

| Kind          | Why later                                                                                                                                                                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `synth_patch` | Most patches are the synth's factory presets, in code. A content kind would serve only the Music Atlas patches, and an authoritative kind would hide the factory ones from Cortex. Needs a decision on whether factory presets move into the store. |
| `drum_kit`    | Stock kits are code, and a custom kit points at uploaded audio. Needs the asset upload (`POST /asset`) first, then a kind whose body names asset ids.                                                                                               |

Until then both stay code-owned in Cortex (`patch`, `kit` nodes), and the
dev writer saves custom kits and Music Atlas patches.

## Trying it

- `VITE_CONTENT_REPO=1 npm run dev`: repo mode serves the three kinds;
  saves write the repo's files.
- `VITE_CONTENT_MOCK=1 npm run dev`: the offline mock serves and seeds them,
  with releases and a mock CDN.
- Tests: `src/content/instrument/__tests__/instrumentSchemas.test.ts` holds
  every file in the repo to the schemas; repo mode's own suites
  (`repoStore.noop`, `repoProfile`) cover the source.
