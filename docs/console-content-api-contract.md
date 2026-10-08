# Console content: the API contract, for Ryan

> **Start with [`console-backend-integration.md`](console-backend-integration.md)**
> (6 October 2026). It orders this work, adds the vocabulary and
> progression kinds, the cutover seed and the cascades, and records the
> owner's later rules. **Where the two disagree, it wins.** Artifacts
> version 4 is handed over: `manifest.json` has no open draft.

Written 29 September 2026. **Draft, sent at checkpoint 1a.** It is finalized
at checkpoint 1i together with a contract test suite; items marked **Later**
are outlined here and specified then. Updated 30 September 2026 after the
Atlas Table's build (Amendment 5 of the design): the version 4 draft's
contents, the revision check on `PUT`, and
[§10, suggestions](#10-suggestions-get-suggestions-and-post-suggestionsdecisions).

It continues `docs/phase-2-api-handoff.md` (where the two differ, this one
wins) and `docs/song-body-schema-gap.md`. The design behind it is
`docs/console-content-graph-design.md`. The files it names under
`src/scripts/apiContract/`, `src/content/records/` and `src/content/graph/`
are in the `Webapp-Refactor` working tree and go in with the 1a PR; they are
not on `main` yet. Everything under **What we need** is `music-atlas-api` work.

---

## The short version

We are rebuilding `/console/content` so it shows the app itself, with edit
and publish on top, and turning the content into a connected graph: artists,
records, studios, labels and places, linked to songs by id. From checkpoint
1b the console half will run offline against a local mock that implements
this contract. It needs these from the API, in this order:

1. **Adopt `songBodySchema.v1.ts`.** The existing ask. Together with
   priority 2 it unblocks credit and lead-act linking, because the console
   learns the song level from `/capabilities`.
2. **`GET /capabilities`**, so the console knows what is served.
3. **`GET /items/lookup`, `GET /export`, and `create: true` on `PUT /items`.**
4. **The `artist` kind, with the first two reference checks.** 883 to
   import.
5. **The `release`, `studio` and `label` kinds, and the `globe_city` v2
   body.** 299 cities to import.
6. **Song v2.** The fields are in the version 4 draft, with the
   `globe_event` v2 body and `artist.born` (5b).
7. **The rest of reference validation from `REF_PATHS`.**
8. **Rename and merge.** Later.
9. **Teach read endpoints.** Later.
10. **Suggestions: `GET /suggestions` and `POST /suggestions/decisions`.**
    The owner's review of the MusicBrainz, Wikidata and app suggestions
    runs against the offline mock until then, and its committed
    `decisions.json` is the import payload.

Each one can ship on its own. The console reads `/capabilities` and turns on
only what is served; against today's API it falls back to the six kinds it
has now. The handoff's `chord_progression` kind sits outside this order (see
the end of **What we need**).

---

## What changed on our side

### The contract has a machine-readable half

`src/scripts/apiContract/` holds the files the API copies, plus one file from
`src/content/graph/`. Copy them; do not retype them. The schema files import
only `zod` (3.23.8 here); `refPaths.ts` and `slugs.ts` import nothing; the
rest is JSON.

| File                          | What it is                                                                                                                                                                                                                                                     | Kept honest by                                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `songBodySchema.v1.ts`        | Song body, level v1. Frozen. Use its `songBodySchema` export.                                                                                                                                                                                                  | `songBodySchema.v1.test.ts`: the hash, and that the v2 field `releases` is rejected                              |
| `songBodySchema.v2.ts`        | Song body, level v2. Frozen in the version 4 draft. It adds only optional fields to v1: `releases[]`, `subgenreIds`, `session.studioId`/`labelId`/`placeId`/`source`, `credits[].source`, `relatedRecordings[].source`.                                        | `songBodySchema.v2.test.ts`: the hash, and that it takes the v2 fields and nothing else                          |
| `songBodySchema.ts`           | Song body, latest, regenerated from `src/curriculum/types/songLibrary.ts`. It says what v2 says until new song fields open level v3.                                                                                                                           | `songBodySchema.test.ts`: regenerates it, validates the corpus                                                   |
| `recordBodySchemas.ts`        | Bodies of `artist`, `release`, `studio`, `label`, `globe_city` and `globe_event` (body v2), keyed by kind in the `recordBodySchemas` export. Generated from `src/content/records/types.ts`, the globe's `City` and `HistoricalEvent`, and the song's `Credit`. | `recordBodySchemas.test.ts`: regenerates it, validates the seeds and the 1,723 bundled events, checks strictness |
| `refPaths.ts`                 | `REF_PATHS`: every body path that names another thing, with its target kind.                                                                                                                                                                                   | `refPaths.test.ts`: every id-shaped schema field is listed; derived paths = edge sources                         |
| `suggestionSchema.ts`         | A suggestion and a decision (§10): `suggestionSchema`, `suggestionDecisionSchema`. Generated from `src/content/suggestions/types.ts`. New in the version 4 draft.                                                                                              | `suggestionSchema.test.ts`: regenerates it; the importer's committed rows pass it                                |
| `vocabulary.generated.json`   | The code-owned vocabularies as data: `genres` (29, 12 taught), `subgenres` (582), `songGenreTags` (12), `progressionStyles` (15), `instruments` (59), `vibes` (16), `modes` (9), `regions` (18), `eras` (7).                                                   | `vocabulary.test.ts`: regenerates it                                                                             |
| `slugPatterns.generated.json` | Each content kind's identity field (`id` or `slug`) and slug pattern, as a regex source string (`null` where a kind has none). Generated from `SLUG_PATTERN` in `src/content/graph/ids.ts`.                                                                    | `slugPatterns.test.ts`: regenerates it; every seed id passes its pattern                                         |
| `src/content/graph/slugs.ts`  | `toSlug`, `artistSlug`, `normalizeArtistName`. Copy it as it is rather than porting it: its accent folding and apostrophe handling have to match exactly.                                                                                                      | `ids.test.ts`, `artistRegistry.test.ts`                                                                          |
| `manifest.json`               | `artifactsVersion`, a sha256 per file, and the song level → file map.                                                                                                                                                                                          | `manifest.test.ts`                                                                                               |

The tests are in `src/scripts/apiContract/__tests__/`. The generated files
are rewritten through their tests: `WRITE_SONG_SCHEMA=1` for
`songBodySchema.ts`, `WRITE_CONTRACT=1` for `recordBodySchemas.ts`,
`suggestionSchema.ts`, `vocabulary.generated.json` and
`slugPatterns.generated.json`.

### How the artifacts are versioned

`manifest.json` has these parts:

- **`artifactsVersion`**, an integer, 3 today: the version last handed over.
  It moves once per hand-off, not once per edit. Version 3 changed
  `refPaths.ts` only: two flags (`resolvedBy`, `alsoTargets`), two kinds
  (`globe_event`, `artist_location`), seven entries for fields the store
  already holds, and `alsoTargets: ['subgenre']` on artist `genreIds[]`,
  which the vocabulary table already allowed (priority 7). No body schema
  changed, and none of the seven is checked, so a server on version 2
  rejects nothing that version 3 accepts.
- **`draftVersion`**, present while the repo's files differ from the last
  hand-off: 4 today. Each file carries `handedOff`, its hash at the last
  hand-off, beside its current `sha256`; a file whose two differ is part of
  the draft. `manifest.test.ts` fails when a file changes without its
  `sha256` being updated, and holds `draftVersion` to `artifactsVersion + 1`
  exactly while some file differs. A file new in the draft has a
  `handedOff` of 64 zeros until the hand-off.
- **`files[]`**, `{ file, sha256, handedOff, what }` for the nine files
  above (paths relative to `src/scripts/apiContract/`, so `slugs.ts` is
  `../../content/graph/slugs.ts`).
- **`songSchemaLevels`**: `v1` → `songBodySchema.v1.ts` and `v2` →
  `songBodySchema.v2.ts`, each with its hash. Level v0 is your current song
  schema and has no file.

**The version 4 draft**, handed over at the close of the review stage
(phase E), holds:

- song v2: `songBodySchema.v2.ts` (new, frozen) and `songBodySchema.ts`,
  which says the same;
- the `globe_event` v2 body and artist `born` (artist body level 2), in
  `recordBodySchemas.ts`;
- their `REF_PATHS` entries, in `refPaths.ts`
  ([5b](#5b-the-stored-fields-globe_event-v2-artistborn-song-v2));
- `alsoTargets: ['subgenre']` on chord_progression `styles[]`, also in
  `refPaths.ts`: the style `gospel` now lands on the gospel subgenre (the
  owner's call, 30 September). It changes no check, and `progressionStyles`
  is as it was;
- the suggestion and decision rows, in `suggestionSchema.ts` (new; §10);
- one change of reading, not of a file: a `song-` globe event names its song
  through the alias table in `src/components/atlas/data/songEventAliases.ts`
  (`song-valerie_bbc_live_version` → `valerie`), which your check on song
  events must read too ([§7](#7-reference-validation-from-ref_paths)).

Nothing else changed: `vocabulary.generated.json`,
`slugPatterns.generated.json`, `slugs.ts` and `songBodySchema.v1.ts` are as
version 3 handed them over. At the hand-off, `artifactsVersion` becomes 4,
every `handedOff` becomes its file's `sha256`, and `draftVersion` goes.
**Copy only at a hand-off**: the files of a version are the ones whose
`sha256` equals `handedOff` once `draftVersion` is gone. Until then the
console sends `X-Content-Artifacts: 3`; its offline mock runs the repo's
files, so it reports the draft's number, 4.

What we need from the API:

- Copy the nine files and `manifest.json` together, and report that
  manifest's `artifactsVersion` in `/capabilities`. A test on your side that
  re-hashes your copies against the copied manifest keeps the number true.
- The console sends its own version as
  `X-Content-Artifacts: <artifactsVersion>` on content requests, but only to
  a server whose `/capabilities` reported a non-null `artifactsVersion`. The
  API is on another origin, so a header missing from the CORS allow-list
  fails the preflight and the request with it. Add it next to `X-App-Session`
  no later than the deploy that first reports a version.
- When your `artifactsVersion` is lower than the header's, report
  `UNKNOWN_VOCAB_ID` and `UNKNOWN_CODE_ID` as warnings rather than errors:
  the id is probably newer than your copy. Without the header, treat the two
  versions as equal.

### Record types, ids and the artist registry

- `src/content/records/types.ts`: `ArtistRecord`, `ReleaseRecord`,
  `StudioRecord`, `LabelRecord`, `PlaceRecord`. `recordBodySchemas.ts` is
  generated from it.
- `src/content/graph/ids.ts`: the slug grammar per kind (`SLUG_PATTERN`),
  which `slugPatterns.generated.json` re-keys by content kind for you.
  `places.ts` resolves a city name and country to a `CITIES` id.
- `src/components/atlas/data/artistRegistry.ts` now holds **883** artists.
  The handoff said 912: five film and TV titles the old derivation had read as
  artists were deleted on 29 September, and a guard test keeps them out. On
  30 September the owner merged 23 duplicates (misspellings, acts held with
  and without "The", a short form and a band's billing) into the name kept,
  and "Remind In Light", an album title read as an artist, went too. The old
  spellings were removed, not aliased. No exclusion list is needed on import.

---

## Ground rules for everything below

### Transport

- Base path `/api/admin/content`, auth as today: `Authorization: Bearer`,
  optional `X-App-Session`. Open to the admin and editor roles unless stated.
- 2xx bodies are SuperJSON strings, like every endpoint here today
  (`fetchWithAuth` in `src/hooks/data/admin/useAdminContent.ts` parses them
  with `SuperJSON.parse`). The one exception is `POST /asset` (Later), which
  the console already calls: a multipart request with the image in the field
  `file`, answered with plain JSON `{ url }`, which
  `src/hooks/data/admin/useAdminAssetUpload.ts` reads with `res.json()`.
- Error bodies stay plain JSON, read with `res.json()`:
  `{ error: string, code?: string, ...details }`. `error` is shown to the user
  as written.

### Errors

Today `fetchWithAuth` throws away the status and everything except `error`.
From checkpoint 1b it throws a `ContentApiError { status, body }` and the
console branches on both, so both need to be right.

| Status | `code`              | When                                                                               | Extra fields                                     |
| ------ | ------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------ |
| 400    | `BAD_REQUEST`       | A missing or malformed parameter or JSON body, or a kind the server does not serve | –                                                |
| 404    | `NOT_FOUND`         | No such item, or a lookup miss                                                     | –                                                |
| 409    | `SLUG_TAKEN`        | `create: true` for a (kind, slug) that already exists                              | `kind`, `slug`, `id` of the existing item        |
| 409    | `REFERENCED`        | `DELETE` of an item other items point at, without `force`                          | `referrers: { kind, id, slug, title, path }[]`   |
| 409    | `IMMUTABLE_ID`      | Later: renaming a song or a globe event                                            | –                                                |
| 409    | `REVISION_CONFLICT` | Requested: a PUT whose `expectedRevision` is not the item's (5b)                   | `revision`, the item's current one               |
| 422    | `VALIDATION_FAILED` | A PUT, an approve or a publish that finds an error (below)                         | `problems: ValidationProblem[]` (see priority 7) |

**What rejects.** Any `ValidationProblem` with severity `error` rejects a PUT
or an approve with 422 `VALIDATION_FAILED`, and nothing is written. `problems`
then lists everything found, errors and warnings together. Warnings alone
never reject. What blocks a publish is under
[Publishing order](#7-reference-validation-from-ref_paths). The suggestion
endpoints add codes of their own, listed in
[§10](#10-suggestions-get-suggestions-and-post-suggestionsdecisions).

The console decides on `code`. It reads the status alone in two places only:
a 404 from `/capabilities` means an older server, and a 404 from
`/items/lookup` means the item is absent.

### Identity: which body field is the slug

Today the slug is always `body.id`. The new kinds use a `slug` field instead,
so each kind states its identity field. `PUT`'s `slug` must equal it, and
`SLUG_ID_MISMATCH` compares against it.

| Kind                                 | Identity | Pattern (block below)                                                           | Seed data checked against it                         |
| ------------------------------------ | -------- | ------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `song`                               | `id`     | `song`                                                                          | all 638 bundled songs                                |
| `globe_event`                        | `id`     | `globe_event`                                                                   | all 1,723 bundled events (640 `song-`, 1,083 `evt-`) |
| `globe_city`                         | `id`     | `globe_city`                                                                    | all 299 cities, no duplicates                        |
| `chord_progression`                  | `id`     | `chord_progression`; `id` is a number, so `slug` must equal `String(body.id)`   | the 695 library entries                              |
| `artist`                             | `slug`   | `artist`                                                                        | all 883; each equals `artistSlug(name)`              |
| `studio`, `label`                    | `slug`   | `studio`, `label`                                                               | the 8 pilot records below                            |
| `release`                            | `slug`   | `release`                                                                       | –                                                    |
| `activity_flow`, `fundamentals_flow` | `id`     | None; keep today's rule (activity flows are `<genre>-l<n>`)                     | –                                                    |
| `artist_location`                    | `id`     | None: the id is the artist's lowercase name (`ac/dc`), and the kind is retiring | –                                                    |

Take the patterns from `slugPatterns.generated.json`; the block below is a
readable copy of it. A `REF_PATHS` target uses the pattern of the kind that
holds it; `place` is `globe_city`.

```ts
const CONTENT_SLUG_PATTERN = {
  song: /^[a-z0-9_]+$/, // SLUG_PATTERN.song
  globe_event: /^(evt-[a-z0-9-]+|song-[a-z0-9_]+)$/, // SLUG_PATTERN.event
  chord_progression: /^\d+$/, // SLUG_PATTERN.progression
  globe_city: /^[a-z0-9]+(-[a-z0-9]+)*$/, // SLUG_PATTERN.place
  artist: /^[a-z0-9]+(-[a-z0-9]+)*$/, // SLUG_PATTERN.artist
  studio: /^[a-z0-9]+(-[a-z0-9]+)*$/, // SLUG_PATTERN.studio
  label: /^[a-z0-9]+(-[a-z0-9]+)*$/, // SLUG_PATTERN.label
  release: /^[a-z0-9]+(-[a-z0-9]+)*$/, // joins SLUG_PATTERN with its deriver at 1d
};
```

- **A mismatch** between `slug` and `body[identity]` is a 422
  `VALIDATION_FAILED` with a `SLUG_ID_MISMATCH` problem. **An identity value
  that fails its pattern** is a 422 with an `INVALID_BODY` problem whose
  `path` is the identity field.
- The pattern is enforced on PUT for `artist`, `release`, `studio`, `label`
  and `globe_city` from priorities 4 and 5, and for `song` and `globe_event`
  from priority 7, after its dry run over the store. Kinds with no pattern
  keep today's rule.
- No pattern allows `:`. Stored references are bare slugs; `<kind>:<slug>`
  never appears in a body.
- A new artist's slug is `artistSlug(name)`, but only the pattern is checked:
  correcting a name's spelling does not change its slug. Likewise a
  release's `<artist-slug>-<title-slug>` shape (priority 5) is a convention
  the console follows; only the pattern is checked.
- **Song and globe event ids are immutable.** `eventConnections.ts` and
  `curriculumTemplate.ts` reference them from code, where no rename can reach.
  When rename ships (priority 8) it answers 409 `IMMUTABLE_ID` for both.

---

## What we need

### 1. Adopt `songBodySchema.v1.ts`

As in `docs/song-body-schema-gap.md`: copy the file and point the song branch
of the content validator at its `songBodySchema` export. Report song
`schemaVersion: 1` in `/capabilities` once it is live.

After that we re-run Import songs (`/console/content/publishing/import`), which compares before it writes
and lands the 341 charts the old schema rejected. The song → globe event
derivation then has credits and session data to carry (see
[Derivation changes](#derivation-changes)).

A v1 server must keep rejecting v2 fields. v1 is `.strict()`, so it does.

### 2. `GET /capabilities`

`GET /api/admin/content/capabilities` → 200:

```ts
{
  kinds: {
    kind: string;           // exactly the kinds served: 'song', 'artist', …
    schemaVersion: number;  // see below
    bundle: string | null;  // its name in the CDN manifest; null if not published to the CDN
    identity: 'id' | 'slug';
    authoritative: boolean; // see "When a kind is authoritative" under priority 4
  }[];
  features: {
    export: boolean;     // GET /export
    lookup: boolean;     // GET /items/lookup
    create: boolean;     // PUT /items honours create: true
    rename: boolean;     // Later
    merge: boolean;      // Later
    asset: boolean;      // POST /asset, Later
    teachUsage: boolean; // Later
    suggestions: boolean; // GET /suggestions, POST /suggestions/decisions (§10)
  };
  artifactsVersion: number | null; // null until any artifact is adopted
}
```

`schemaVersion` per kind:

- `song`: 0 is today's schema, 1 is `songBodySchema.v1.ts`, 2 is
  `songBodySchema.v2.ts`. The console enables a field only when this is at
  least the field's `minSongSchema` in `REF_PATHS`.
- `globe_city`: 1 is today's body, 2 is `placeRecordSchema`.
- `globe_event`: 1 is today's body, 2 is `recordBodySchemas.globe_event`,
  the event body v2 (see [5b](#5b-the-stored-fields-globe_event-v2-artistborn-song-v2)).
  Report 2 once the validator accepts the v2 fields on every event.
- `artist`: 1 is `artistRecordSchema` without `born` (artifacts 3); 2 is
  `artistRecordSchema` with `born` (artifacts 4, see
  [5b](#5b-the-stored-fields-globe_event-v2-artistborn-song-v2)). A level-1
  server refuses a body with `born` (`.strict()`), so the console edits Born
  only at 2. Report 2 once the validator accepts `born`.
- `release`, `studio`, `label`: 1 is `recordBodySchemas.ts` at the reported
  `artifactsVersion`.
- Every other kind: 1.

`bundle` today, matching what the app fetches: `song` → `songs`,
`globe_event` → `globe-events`, `activity_flow` → `lessons`,
`fundamentals_flow` → `fundamentals`; `globe_city` and `artist_location` →
`null`. A new kind reports its bundle from its first live release (see
[CDN bundles](#cdn-bundles)).

The console sends `create: true` only when `features.create` is true. A server
that drops the unknown key would run today's upsert, which is the overwrite
priority 3 exists to stop.

When this endpoint 404s, the console takes its kinds from `/overview` rows,
with song at level 0, every feature off and nothing authoritative. If
`/overview` fails too, it uses the six kinds it knows today.

### 3. Lookup, export, and create-only PUT

#### `GET /items/lookup?kind=&slug=`

- Both parameters are required. `slug` is matched exactly against the
  identity field.
- 200: the `ContentListItem`, the same shape `/items` lists. 404 `NOT_FOUND`
  when absent.
- It must find every (kind, slug) that `create: true` would refuse: drafts,
  archived items, and new items that exist only as a pending proposal.
- Register it before `/items/:id`, or `lookup` is read as an id.

Why: the song mirror opens `/songs/africa` and needs the item's DB id from
its slug. Without lookup it has to page through every `/items?kind=song`,
because `search` matches titles.

#### `GET /export`

| Parameter | Meaning                                                                                                                          |
| --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `kind`    | Required.                                                                                                                        |
| `view`    | `working` (the default) or `published`.                                                                                          |
| `omit`    | Comma-separated; only `sections` and `audioSources` are allowed (anything else is a 400). Dropped from `body` and `pendingBody`. |
| `cursor`  | Opaque, from the previous page's `nextCursor`.                                                                                   |
| `limit`   | Default 200. Above 500 is clamped to 500; anything that is not a positive integer is a 400.                                      |

→ 200:

```ts
{
  items: {
    id: string;
    slug: string;
    status: 'draft' | 'published' | 'archived';
    editState: 'pending' | 'rejected' | null;
    updatedAt: Date;
    body: Record<string, unknown> | null; // null only for a new proposal, below
    pendingBody?: Record<string, unknown>;
  }[];
  nextCursor: string | null; // null on the last page
}
```

- Ordered by `slug`. Send it compressed: the song corpus with sections runs
  to megabytes.
- `view=working` includes drafts and archived items; `status` says which.
- `view=working`, **admin**: `body` is the stored body, and `pendingBody` is
  present whenever one exists (pending, or sent back).
- `view=working`, **editor**: `body` is the caller's own `pendingBody` when
  the caller is its `pendingById`, and the stored body otherwise. There is no
  `pendingBody` field, so an editor never sees another editor's proposal.
- **A new item that exists only as a proposal** (`isNew` in `/pending`): an
  admin gets `body: null` with the proposal in `pendingBody`; the editor who
  proposed it gets `body` = the proposal; other editors do not get the item.
  It is never in `view=published`.
- `view=published`: exactly the items and bodies in the kind's live release,
  which is what the CDN bundle holds. `slug` and `body` come from the release;
  `id` is the item it was built from, even if that item has since been
  deleted; `status` is `published`, `editState` `null` and `updatedAt` the
  release's `publishedAt`. No `pendingBody`. An empty list if the kind has
  never been published.
- For an item with `overrides` (the song-derived globe events), `body` is
  what a publish would compile: overrides applied. `pendingBody` is compiled
  the same way, from the proposal's `pendingBody` and `pendingOverrides`.

Why: the console's previews and the graph's working view need every item's
body. Today that is one `/items/:id` request per item.

#### `GET /items/:id` for a new proposal, and `GET /items` without `limit`

The console relies on two details of today's item endpoints:

- **A new item that exists only as a proposal:** `GET /items/:id` answers
  with the proposal as `body` as well as in `pendingBody`, so a detail's
  `body` is never null. The admin opens it for review like any other item.
  (`/export` keeps `body: null` for admins, as above.)
- **`GET /items` without `limit`** returns every match. With `limit`, it
  pages and returns `nextCursor`.

#### `PUT /items` with `create: true`

The request is today's payload plus one field:

```ts
{
  kind: ContentKind;
  slug: string;          // equals body[identity]
  body: unknown;
  status?: 'draft' | 'published' | 'archived'; // ignored for editors, as today
  note?: string;
  overrides?: unknown;
  create?: true;         // new
}
```

- With `create: true`, if (kind, slug) exists in any state: 409 `SLUG_TAKEN`
  with `kind`, `slug` and the existing `id`. Nothing is written.
- With `create: true`, if it does not exist: created exactly as today's
  upsert would create it (for an editor, a new proposal, `isNew` in
  `/pending`).
- Without `create`: today's upsert, unchanged.

Why: today every create path can overwrite. Two editors creating "Sunset
Sound" at once, or a "create from repo copy" racing an import, must not
silently replace a record.

#### The PUT response carries warnings

Every 2xx `PUT /items` returns

```ts
{ item: ContentItemDetail; warnings: ValidationProblem[] } // warnings: [] when none
```

instead of the bare `ContentItemDetail`. For an editor's save, `item` is the
detail with the proposal in `pendingBody`, and the warnings are about the
proposal.

How this coexists with today's shape: nothing in the console reads the PUT
response body. `AdminContentEditPage.tsx`, `AdminLessonCoursePage.tsx` and
`AdminSongImportPage.tsx` await it and discard it, so the change breaks no
deployed client. From 1b the console unwraps `item` when that key is present
and otherwise treats the whole body as the item with no warnings, so it works
against either server. Approve, reject and discard keep their current 2xx
responses; approve can now also answer 422 (see
[Approve](#7-reference-validation-from-ref_paths) under priority 7).

### 4. The `artist` kind

Priorities 4 and 5 add five record kinds. All five are validated by their
schema in `recordBodySchemas.ts`, which is `.strict()`: an unknown key is a
422, not a silent field, for the reason `song-body-schema-gap.md` gives. The
identity field must also match its pattern (see
[Identity](#identity-which-body-field-is-the-slug)).

**The first two reference checks ship here**, for every PUT of every kind:
the slug pattern (`INVALID_REFERENCE`, which rejects) and the existence
warning (`UNPUBLISHED_REFERENCE`), as the table under priority 7 defines
them. Without them the new kinds would store `place:detroit` or
`Motown Records` in an id field. Priority 7 adds the rest.

| Kind              | Body schema (`recordBodySchemas.<kind>`) | List projection: `title` / `subtitle` / `sortYear` / `tags` | Template body (`GET /template/:kind`)                 | Seed                         |
| ----------------- | ---------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------- | ---------------------------- |
| `artist`          | `artistRecordSchema`                     | `name` / `basedInPlaceId` / `activeFrom` / `aliases`        | `{ slug, name: '' }`                                  | 883, `ARTIST_REGISTRY`       |
| `release`         | `releaseRecordSchema`                    | `title` / `artistIds` joined by `, ` / `year` / `[]`        | `{ slug, title: '', artistIds: [], format: 'album' }` | none                         |
| `studio`          | `studioRecordSchema`                     | `name` / `placeId` / `openedYear` / `aliases`               | `{ slug, name: '' }`                                  | 4, below                     |
| `label`           | `labelRecordSchema`                      | `name` / `placeId` / `foundedYear` / `aliases`              | `{ slug, name: '' }`                                  | 4, below                     |
| `globe_city` (v2) | `placeRecordSchema`                      | `name` / `country` / `null` / `aliases`                     | Today's template; `aliases` and `pin` absent          | 299, `CITIES` in `cities.ts` |

Missing optional values project as `null`, and `tags` as `[]`. In the
template, the identity field takes the `?slug=` value the template endpoint
already accepts, or `''`. Import seeds as `published`, then release the kind
(`POST /releases`) so they are in its live release: they are what the app
shows today, and nothing reads the new bundles yet. **The seed counts in this
table are superseded:** the cutover seed is one export of everything the
repo holds (`console-backend-integration.md` §5).

**The artist body** is the handoff's `{ slug, name, aliases }` extended:
`group`, `members[]`, `basedInPlaceId`, `activeFrom`, `activeTo`,
`genreIds`, `instrumentIds`, `labelIds`, `influencedBy[]`, `bio`,
`externalIds`, `unverified`, `source`. There is no image field:
`song.artistImageRef` owns artwork. (Since the owner's rule of 30 Sep 2026
no stored body carries `externalIds` or an outside catalogue's `source`;
`console-backend-integration.md` §7.)

- `influencedBy: { artistId, unverified?, source? }[]` sits on the influenced
  artist. It is the one relationship an editor states outright (see
  [Decisions](#decisions-already-made)).
- **Seed:** `ARTIST_REGISTRY` in
  `src/components/atlas/data/artistRegistry.ts`, 883 entries, flat. Every slug
  is unique, kebab-case and equal to `artistSlug(name)`. No entry has aliases
  today: the one there was, "Andy Grammar" on `andy-grammer`, was a
  misspelling, and went with the owner's duplicate merge (30 September).
  `aliases` stays in the body for real alternate billings.

#### When a kind is authoritative

`authoritative: true` means the store holds the whole set. The console then
stops merging in its code registry for that kind, so a delete or a merge in
the store is final. Until then it shows the code registry plus your items,
yours winning per id.

It is a stored flag per kind, not a count. The import sets it once it has
written and released the whole seed, and nothing clears it, so deleting an
artist afterwards leaves it `true`. A kind never goes back to `false`.

| Kind                                                                           | Authoritative when                                                                                     |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `artist`                                                                       | The 883 are imported.                                                                                  |
| `globe_city`                                                                   | The 299 are imported. It is served today with no items (`docs/songs-wiring-inventory.md`), so `false`. |
| `studio`, `label`                                                              | The four pilot records of each are imported. There is no code registry to merge.                       |
| `release`                                                                      | From the start. There is no seed and no code registry.                                                 |
| `song`, `globe_event`, `activity_flow`, `fundamentals_flow`, `artist_location` | `false` until we agree the store is complete, and you set it.                                          |

### 5. `release`, `studio`, `label`, and the `globe_city` v2 body

The table under priority 4 covers schemas, projections, templates and seeds.

- **`release`** is a record as issued: album, single, EP, compilation, live,
  soundtrack. Slug `<artist-slug>-<title-slug>`, with `-<year>` when that
  alone is ambiguous. It holds only release facts (`artistIds`, `format`,
  `year`, `labelId`, `catalogNumber`, `coverRef`). It has no tracklist,
  because songs point at releases (`song.releases[]`, v2), and no studio,
  place or credits, because recording facts live on the song. The console
  calls this kind "Records".
- **`studio`**: `placeId` is a `CITIES` id; `coordinates` gives the building
  its own pin; `imageRef` is a served photo URL.
- **`label`**: `parentLabelId` names the label it is an imprint of (Tamla →
  Motown). It must not form a cycle (priority 7).
- **`globe_city` v2** is the globe's `City` plus `aliases` and `pin`. `pin`
  absent means `true`; `pin: false` is a place that is not a globe pin, such
  as an artist's hometown. The kind holds no items today, so the schema change
  migrates nothing. **Seed:** `CITIES` in
  `src/components/atlas/data/cities.ts`, 299 cities, all of which pass
  `placeRecordSchema`. None carries `aliases` or `pin` yet. Seed the one
  alias the resolver knows (`places.ts`: "New York" and "NYC" for
  `new-york`, registered as "New York City"): `new-york` gets
  `aliases: ['New York', 'NYC']` at import.

**Studio and label seed: the four pilot sessions.** These are the only songs
with a `session` today. Slugs are `toSlug(name)`. A studio's `placeId` is
`resolvePlace(city, country)` of the session. A label's is where the label
was based, which is not always where the song was recorded: Columbia was in
New York. `recordBodySchemas.test.ts` validates these bodies, using the
session city for the labels too, which proves the shape but is not what to
import.

| Song                           | Studio             | Studio slug          | Studio `placeId` | Label     | Label slug  | Label `placeId` |
| ------------------------------ | ------------------ | -------------------- | ---------------- | --------- | ----------- | --------------- |
| `aint_no_mountain_high_enough` | Hitsville U.S.A.   | `hitsville-u-s-a`    | `detroit`        | Tamla     | `tamla`     | `detroit`       |
| `africa`                       | Sunset Sound       | `sunset-sound`       | `los-angeles`    | Columbia  | `columbia`  | `new-york`      |
| `nothing_compares_2_u`         | Britannia Row      | `britannia-row`      | `london`         | Chrysalis | `chrysalis` | `london`        |
| `something`                    | Abbey Road Studios | `abbey-road-studios` | `london`         | Apple     | `apple`     | `london`        |

### 5a. What the console derives, and the API never stores

Nothing to build. The console's graph reads more out of the fields above,
and out of `globe_event` and `artist_location` bodies, than it stores, and
none of that is an API field, an endpoint or a check:

- **Years and decades.** A year node per year a song, record, label
  (`foundedYear`), studio (`openedYear`) or hand-authored event states, each
  in its decade and era. A decade is a bucket of years, not a value anyone
  stores.
- **Scenes.** A city's `genres[]` (the genres it is known for) and
  `activeDecades[]` (when that scene was active), read through the genre
  table (`resolvedBy`, above).
- **Song pins.** An `artist_location` entry places its act at that city, as
  a guess, only while the artist has no `basedInPlaceId`. Placement on the
  globe is unchanged (see [Placement by slug](#placement-by-slug)).
- **`typical_in`.** Which genres an instrument is typical of, from a table in
  code the owner reviews (`src/content/graph/instrumentGenres.ts`). Like the
  vocabularies, it has no endpoint.
- **Who and where a hand-authored event is about**: its artists and songs
  matched in the title and tags, and its city placed through `CITIES`, all
  as guesses. That is why the event's `title`, `tags[]` and `location.city`
  entries in `REF_PATHS` are `legacy`: display text the console reads, never
  checked. Stored ids for them come with the event body v2
  ([5b](#5b-the-stored-fields-globe_event-v2-artistborn-song-v2)); a
  stored id wins over the guess, field by field.
- **Births and years active**: an artist's `born.date` as its birth year
  (a group's as the year it formed), a person's `born.placeId` as their
  birthplace, and `activeFrom`…`activeTo` as every decade the span touches,
  an open span running to the current year.

Each is recomputed from the bodies whenever they change, so a save or a
publish that changes one of those fields is all the API has to do.

### 5b. The stored fields: `globe_event` v2, `artist.born`, song v2

Artifacts version 4 (the draft now in the repo, handed over at the end of
the review stage). Everything here is optional and additive: a body valid
today stays valid, and no field is filled until someone confirms it. The
schemas are the specification; this section says what the fields mean.

**The `globe_event` v2 body** (`recordBodySchemas.globe_event`, generated
from `GlobeEventRecord` in `src/content/records/types.ts`) is the globe's
`HistoricalEvent` plus:

```ts
artistIds?: string[];   // artist slugs it is about, lead act first
songIds?: string[];     // song ids it is about
placeId?: string;       // a globe_city id: see below
releaseIds?: string[];  // release slugs it is about
studioIds?: string[];   // studio slugs it is about
labelIds?: string[];    // label slugs it is about
unverified?: boolean;
source?: string;
// song- events only, derived (see "Song → globe event carries the recording"):
label?: string;
studio?: string;
recordedYear?: number;
credits?: Credit[];
```

- **Absent and `[]` mean different things on a hand-authored `evt-`
  event.** Absent: nobody has said, and the console infers the artists and
  songs from the title and tags, and the place from `location.city`, drawn
  as guesses; nothing infers the records, studios and labels, so for those
  absent is simply not stated. `[]`: a reviewer has said "none", which is
  how a wrong guess is answered. Store `[]` exactly as sent; never drop it, and never turn it
  into absent or `null`. A stored list replaces the guesses for that field
  only.
- **A `song-` event never carries `[]`.** Each derived field is omitted when
  the song gives it no value (see the derivation table). The console reads
  no field of a `song-` event: the song is the node.
- **`placeId`** on an `evt-` event is where the event happened; on a `song-`
  event it is where the song was recorded (`session.placeId`). Neither moves
  a pin: `location` is the pin, and placement by slug is unchanged.
- **`credits`** on a `song-` event is the latest `Credit`: `creditSchema` in
  `songBodySchema.ts`, a superset of v1's (it adds `source`). Copy the
  song's credits as they are.
- **Checks.** The six id fields and `credits[].artistGlobeId` are
  `REF_PATHS` entries with the usual targets (priority 7): the pattern check
  on PUT, existence as a warning on PUT, `DANGLING_REFERENCE` at publish
  for an authoritative kind. `credits[].artistGlobeId` is `derive: false`
  (the song states it), but it is still checked and rewritten on rename.
  The rest of what a `song-` event copies is listed as the song lists it,
  all `derive: false`: `credits[].instrument` (`vocab`), and `credits[].name`,
  `studio` and `label` (display text, `legacy`).
- **Re-deriving on an artist release (proposed).** When a publish of the
  `artist` kind changes an artist's `basedInPlaceId`, re-derive the `song-`
  events of the songs whose lead act that artist is, so their pins follow
  (placement by slug, step 2). The offline mock does it: an artist publish or
  rollback derives those events again, with the note "Derived again: its lead
  act's basedInPlaceId changed in artist v<n>". It matters now that the Table
  accepts Cities: the console shows the owner each song pin a City would move
  before the accept and again before the publish. An artist whose City a
  release takes away falls to step 3, its song pin; the mock instead leaves
  such a song where it is (its seed pins came from the retired substring
  match, which it does not repeat, so a live City is the one signal it
  trusts to move a pin), and the console's report lists those acts apart
  rather than as moves. Students see any of it only once `globe_event`
  publishes after the artist release, and an artist release naming a City
  outside the live `globe_city` release is refused (`DANGLING_REFERENCE`),
  so the report says so first.

**`artist.born`**, `{ date?, placeId?, unverified?, source? }`:

- `date` is `'YYYY'`, `'YYYY-MM'` or `'YYYY-MM-DD'`, as precise as the source
  (the schema's
  `z.string().regex(/^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/)`:
  the month 01–12, the day 01–31). Whether that day is in that month
  (`1939-02-30`) is the console's integrity check; the API does not refuse
  it. For a group, `date` is the year it formed.
- A record with `members` is read as a group whether or not `group` is set,
  since only a group has members; the console's integrity page asks for the
  flag. Nothing changes for the API.
- `placeId` is a person's birthplace, a `globe_city` id (a `pin: false`
  place when the globe draws no pin there). A group's birthplace is its City
  (`basedInPlaceId`), so the console reads no `born.placeId` on a group; the
  API stores it anyway, and the console's integrity page notes it.
- `born.placeId` is a `REF_PATHS` reference like `basedInPlaceId`.

**Song v2** (`songBodySchema.v2.ts`, frozen; `songBodySchema.ts` says the
same; v1 stays frozen and keeps rejecting all of these):

| Field                                                              | Meaning                                                                                                             |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `releases[]`: `{ releaseId, track?, unverified?, source? }`        | The records it appears on, first issue first. A release's `labelId` is the song's label.                            |
| `subgenreIds[]`                                                    | Subgenre ids (`subgenres[].id`), finer than `genreTags`.                                                            |
| `session.studioId`                                                 | The studio's record. `session.studio` stays the text shown.                                                         |
| `session.labelId`                                                  | The label's record, read only when the song has no `releases`. `session.label` stays the text shown.                |
| `session.placeId`                                                  | Where it was recorded, a `globe_city` id. `session.city` stays the text shown. It never moves the song's pin.       |
| `session.source`, `credits[].source`, `relatedRecordings[].source` | Where the fact came from: `'liner notes'`, a URL; never an outside catalogue (`console-backend-integration.md` §7). |

- The display text stays, because it is what the song page shows. When the
  console links a studio, label or city whose text is empty, or still the
  name of the record the link replaces, it fills the text from the record's
  name; it never overwrites text someone typed. An accepted suggestion does
  the same (§10). No server work follows from that for a PUT.
- `REF_PATHS` has the four id paths (`releases[].releaseId`,
  `session.studioId`, `session.labelId`, `session.placeId`) and the
  vocabulary path `subgenreIds[]`, all with `minSongSchema: 2`
  (`subgenreIds[]` is `vocab`: see the per-path table under priority 7).
- Report song `schemaVersion: 2` once `songBodySchema.v2.ts` is the
  validator. The console turns the v2 fields on only then.

**Required (was requested): an export `revision`.** Each `GET /export` item gains
`revision: number`, bumped on every stored change to that item (`body`,
`pendingBody`, `status` or `editState`). The console's working graph keys
its rebuild on a fingerprint of every row; today it hashes each body to
make one, and a revision would replace that. Optional: without it the
console keeps hashing.

**Required with it (was requested): a revision check on `PUT /items`.** The Table sends it on every cell save. The request may
carry `expectedRevision`, the `revision` the editor started from; when the
item has moved since, answer 409 `REVISION_CONFLICT` with the current
`revision` and write nothing. Without the field, today's upsert. The console
needs it because the Table saves one item from several places (the row
panel, **Link…**, an accepted suggestion) while others save it too. Until
the check exists, the console re-reads the item before every save and lays
its changes onto the newer version field by field, asking the editor where
both sides changed one field; the check closes the window between that read
and the write.

### 6. Song v2

Specified in [5b](#5b-the-stored-fields-globe_event-v2-artistborn-song-v2):
the fields are in `songLibrary.ts`, and level v2 is frozen as
`songBodySchema.v2.ts`, with its hash in `manifest.json`. `artifactsVersion`
goes to 4 when that draft is handed over. There is nothing to build before
it.

### 7. Reference validation from `REF_PATHS`

Each `REF_PATHS` entry is `{ kind, path, target }` plus flags. `kind` is the
content kind whose body holds the field; `path` uses `[]` for every element
(`credits[].artistGlobeId`); `target` is the graph kind the value names.
`alsoTargets` lists other kinds the same text can name, because a path is
listed once: a globe event's tag can be a song's title as well as an
artist's name, and a genre string can land on a subgenre. It changes no
check below. The slug pattern check and the existence warning on PUT ship
with priority 4; everything else here is priority 7.

**`ValidationProblem` gains three optional fields and five codes:**

```ts
type TodaysCode =
  | 'INVALID_BODY'
  | 'SLUG_ID_MISMATCH'
  | 'DUPLICATE_ID'
  | 'DANGLING_REFERENCE';

type NewCode =
  | 'INVALID_REFERENCE'
  | 'UNPUBLISHED_REFERENCE'
  | 'REFERENCE_CYCLE'
  | 'UNKNOWN_VOCAB_ID'
  | 'UNKNOWN_CODE_ID';

interface ValidationProblem {
  code: TodaysCode | NewCode;
  slug: string;
  detail: string;
  severity?: 'error' | 'warning'; // absent means 'error', today's meaning
  path?: string; // the body path with indices: 'credits[2].artistGlobeId'
  target?: string; // what the value names, as '<kind>:<slug>': 'artist:toto'
}
```

**The rule for each entry:**

| Entry                                                                                                 | Check                                                                               | On `PUT`                                                           | On `/validate` and publish |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------- |
| `legacy: true`                                                                                        | None. It is display text.                                                           | –                                                                  | –                          |
| `resolvedBy: 'genreTag'`                                                                              | None. It is display text, resolved through a curated code table (`resolveGenreTag`) | –                                                                  | –                          |
| `vocab: true`                                                                                         | The value is in its list (table below)                                              | `UNKNOWN_VOCAB_ID`, error; a warning when your artifacts are older | Same                       |
| `code: true`                                                                                          | The value is in `codeCatalog.generated.json`                                        | Skipped: that file ships in Phases 4–5                             | Skipped                    |
| Target `artist`, `place`, `studio`, `label`, `song` or `release`                                      | The value matches the target's slug pattern                                         | `INVALID_REFERENCE`, error: the PUT is rejected                    | Same                       |
| The same                                                                                              | The target exists and is published (`place` is `globe_city`)                        | See **Existence** below                                            | See **Existence** below    |
| Target `scene` or `era`, and `contentRefs[].globeRegion` (its value is a region id, not a place slug) | None in this draft                                                                  | –                                                                  | –                          |

**The rows are exclusive.** An entry flagged `legacy`, `resolvedBy`, `vocab`
or `code` gets only its flag's row; the target rows apply only to entries
with none of the four. So `globe_city` `region` (`vocab`, target `place`) is
checked against `regions` only, and `session.city` (`legacy`, target
`place`) is not checked.

**`resolvedBy` is not `vocab`.** A globe event's `genre[]` and a city's
`genres[]` hold genre names as the globe writes them ('Hip Hop', 'Delta
Blues', 'Motown'), not ids: none of the 700 distinct strings on the
hand-authored events, or the 519 on the cities, is in `genres` or
`subgenres` as written, so checking them there would reject every save. The
console reads each through its own curated table and draws what resolves as
a solid edge; a string the table does not know states nothing. That is 161
of the 700 event strings (186 of 2,520 uses) and 244 of the 519 city
strings (261 of 937 uses), which is why the cities' 937 scene strings give
676 `scene_of` edges. The misses are gaps in the console's table, not in the
data ('Drum & Bass' where the table knows 'Drum and Bass'; Philly Soul, Surf
Rock, Zydeco, Miami Bass, Kansas City Jazz), and filling one is a change to
`genreTags.ts`, not to the API. Store them as written.

The pattern check is what catches a wrong-kind value. References hold bare
slugs, so a namespaced `artist:toto` fails every pattern, and `marvin-gaye`
in `relatedRecordings[].songId` fails the snake_case song pattern.

**Existence.** The target is looked up by slug in its kind.

- **On PUT**, an item in any status counts as existing, including one that
  exists only as a pending create. A target that is missing, or whose
  `status` is not `published` (a draft, an archived item, a pending create),
  gets `UNPUBLISHED_REFERENCE`, a warning, with `detail` saying which. A
  target with `status: 'published'` gets nothing. It is only a warning so that inline
  creation in any order works (an editor proposes "Sunset Sound", then links
  the song to it), and so do links to registry artists before the artist
  import lands.
- **On `/validate` and publish**, a target counts as published when it is in
  its kind's live release, or, at publish, in the release being built when
  it is the same kind. For a `published` referring item, a target that is not
  published is `DANGLING_REFERENCE`, an error, when the target's kind is
  served and authoritative, and `UNPUBLISHED_REFERENCE`, a warning, when it
  is not. For a draft, it is `UNPUBLISHED_REFERENCE`, a warning, and never
  blocks. Archived items are not checked.
- A seeded kind becomes authoritative only after its import, which ends with
  a release (priority 4), so links to seeded items resolve from the start.
  `release` is authoritative with no seed: a record has to be published
  before a published song that links it.

**Vocabulary lists per path.** This mapping is not in `REF_PATHS` yet; until
it is, this table is the contract.

| `REF_PATHS` entry                                               | List in `vocabulary.generated.json` |
| --------------------------------------------------------------- | ----------------------------------- |
| song `genreTags[]`                                              | `songGenreTags`                     |
| song `subgenreIds[]` (v2)                                       | `subgenres[].id`                    |
| song `mode`                                                     | `modes`                             |
| song `credits[].instrument`, globe_event `credits[].instrument` | `instruments[].id`                  |
| song `key`, song `contentRefs[].genre`                          | None yet: not checked               |
| chord_progression `vibes[]`                                     | `vibes`                             |
| chord_progression `styles[]`                                    | `progressionStyles`                 |
| artist `genreIds[]`                                             | `genres[].id` or `subgenres[].id`   |
| artist `instrumentIds[]`, artist `members[].instrumentIds[]`    | `instruments[].id`                  |
| globe_city `region`                                             | `regions`                           |
| globe_event `genre[]`, globe_city `genres[]` (`resolvedBy`)     | None: display text, not checked     |

In the repo, turning these checks on rejects nothing. Every bundled song's
`genreTags`, `mode` and credit instruments, and every progression's `styles`
and `vibes`, are in their lists today. The corpus holds one id reference so
far (`origin.artistGlobeId: 'journey'` in `dont_stop_believin.ts`), and it
passes; the 12 `songIds` in the progression library all name real songs.

The store can differ from the repo: the 341 charts the old schema rejected
are still older copies there, and two songs exist only in the store
(`song-body-schema-gap.md`). So before any check in this section rejects,
run it over the store as a warnings-only `/validate` pass, together with the
`song` and `globe_event` id patterns, and send us what it reports.

**Cycles.** An entry with `acyclic` names the edge a cycle would form:
`artist` `members[].artistId` (`member_of`) and `label` `parentLabelId`
(`imprint_of`). Reject a PUT that closes a cycle through working bodies,
including an item that points at itself, as 422 with `REFERENCE_CYCLE`.
Working bodies here are every item's stored body, with the incoming body in
place of its own; other people's pending proposals are not included.
`/validate` reports a cycle as a `REFERENCE_CYCLE` error too, so it also
blocks publish. The two edge names join the graph's `EdgeKind` at 1d; the
check needs only the field.

**Approve.** `POST /items/:id/approve` runs the same checks as an admin's PUT
of the proposal, against the bodies as they are when it runs. An error
answers 422 `VALIDATION_FAILED` with `problems`, and the proposal stays
pending. This is what stops two proposals that are each fine alone (label X
under Y, and Y under X) from storing a cycle, and an id that left the
vocabulary between submission and approval from being stored.

**Delete.** `DELETE /items/:id` for an item that another item's working or
pending body names, through any non-legacy `REF_PATHS` entry targeting its
kind, answers 409 `REFERENCED` with `referrers`. `DELETE /items/:id?force=true`
deletes it anyway; the references then surface as validation problems.

**Publishing order.** `POST /releases` for a kind answers 422
`VALIDATION_FAILED`, with `problems`, when an item it would publish carries
one of the new errors: `INVALID_REFERENCE`, `DANGLING_REFERENCE` from a
`REF_PATHS` entry, `REFERENCE_CYCLE` or `UNKNOWN_VOCAB_ID`. Today's codes
keep whatever effect they have on publish now. A target counts as published
as defined under **Existence**, which fixes the order: places, labels,
studios, artists, releases, songs.

`/validate/:kind` keeps its response, `{ ok, problems }`: `ok` is false only
when there is an error, and warnings are listed alongside. Today's
`DANGLING_REFERENCE` checks for globe events stay as they are, with one
change: a `song-` event's song is read through the alias table in
`src/components/atlas/data/songEventAliases.ts`, not only by dropping the
prefix. It names one alias today, `song-valerie_bbc_live_version` →
`valerie`: the BBC live recording of the library's "Valerie", which keeps its
own pin and video (the owner's call, 30 September). Read it as
`songIdForEvent` does (the alias, else the id without `song-`); the file
imports nothing, so it can be copied as it is. Without it, a Globe events
publish of the repo data is refused for that one event. The console's mock
already reads it, and `songEventLinks.test.ts` fails an alias whose song is
missing or that shadows a song of its own id.

### 8. Rename and merge (Later)

- `POST /items/:id/rename { newSlug, dryRun }` and
  `POST /items/:id/merge { intoId, dryRun }`.
- Both rewrite every `REF_PATHS` occurrence in one transaction, including
  `origin.artistGlobeId` and `derive: false` paths such as
  `contentRefs[].globeArtistId`, and keep a redirects table.
- Merge moves the merged item's names into `aliases`.
- References in code (`eventConnections.ts`, `curriculumTemplate.ts`) are
  reported, never rewritten. Songs and globe events answer 409
  `IMMUTABLE_ID`.

Specified at checkpoint 1i.

### 9. Teach read endpoints (Later)

Admin-only and read-only, over the decks teachers publish through
`POST /classrooms/:cid/publish`, which has no GET today:

- `GET /api/admin/teach/published-days?entity=<kind>:<slug>&classroomId&since&cursor&limit`
  → `{ items: [{ id, classroomId, teacherId, sourceRef, label, publishedAt, updatedAt, refs }], nextCursor }`
- `GET /api/admin/teach/published-days/:id` → the `PublishedDay` snapshot
  (`src/features/classroom/publish/usePublishedDays.ts`)
- `GET /api/admin/teach/usage?entities=<kind>:<slug>,…`
  → `{ [entityId]: { publishedDays, classrooms, lastUsedAt } }`

`refs` come from each deck's `activityRef` strings, through a mapping table
the final contract carries. Decks feed usage counts only, never graph edges.
Specified at checkpoint 1i.

### 10. Suggestions: `GET /suggestions` and `POST /suggestions/decisions`

The owner fills in the Atlas by reviewing suggested facts in the console's
Table: an event's artists read from its tags, an act's City from where its
songs are pinned, a birth date from MusicBrainz. A suggestion is kept beside
the content, never in it (no body has a "suggested" field), and accepting
one is an ordinary save. Every decision about one is kept as well, because
the committed `decisions.json` is how the owner's review reaches the store.
The offline mock implements all of it
(`src/features/admin/content/mock/{suggestions,decisions}.ts`); where this
section is silent, the mock is the reference. Report
`features.suggestions: true` once it is served. Until then the console never
calls these endpoints, and the Table shows no suggestions.

**The rows** are `suggestionSchema.ts` (version 4 draft), generated from
`src/content/suggestions/types.ts`, whose comments say what each field
means:

```ts
interface Suggestion {
  id: string; // stable: see below
  target: { kind: string; slug: string };
  path: string; // as REF_PATHS spells it: 'born', 'artistIds', 'releases[]', 'credits[3].artistGlobeId'
  anchor?: string; // which element an index means, by who it is; required with an index
  op: 'set' | 'add'; // 'add' puts one element into the list a path ending in [] names
  value: unknown; // in the body's own shape
  display: string; // one line for the owner
  sources: {
    provider: 'app' | 'musicbrainz' | 'wikidata';
    url?: string;
    label?: string;
    externalId?: string;
  }[];
  evidence: string[];
  confidence: number; // 0 to 1
  tier: 'sure' | 'likely' | 'ambiguous';
  requires?: { kind: string; slug: string; body: unknown }[]; // records to make first
  dependsOn?: string; // the suggestion it rests on: an artist's identity row
  batch: string; // the run: 'mb-2026-09-30', 'mb-songs-2026-09-30', 'app-stage1'
}

// One row of decisions.json.
interface SuggestionDecision {
  suggestionId: string;
  op: 'accept' | 'replace' | 'reject' | 'drop' | 'review' | 'reopen';
  target: { kind: string; slug: string };
  path: string;
  anchor?: string;
  value?: unknown; // accept, replace: what was written (the owner's, if they changed it)
  valueHash: string; // the suggestion's value as the owner saw it
  seenHash?: string; // replace: the hash of what it wrote over
  requires?: { kind: string; slug: string; body: unknown }[]; // accept, replace: records its value needed
  method: 'single' | 'bulk';
  by: string; // the user's id
  at: string; // ISO time
}
```

`drop` is for a song-pin City the owner decides no act should get (the
mapping under [Derivation changes](#artist_location--artistbasedinplaceid)
needs those as much as the accepts); `review` keeps an earlier bulk accept
after a look; `reopen` takes back a reject or a drop, and nothing else.

**Stable ids.** `id` is a hash of the target, the path and the value's
identity (`keys.ts` `suggestionId`), never of the source. A rejection
therefore stays rejected when the importer runs again, and a changed value
(another birth year) arrives as a new suggestion. A list element is named
by its `anchor`, not its position, so a reordered list keeps its ids. Store
and serve ids as given; never mint your own, since the committed decisions
name these.

**Where they come from.** Two producers, one list:

- **The importer's committed artifacts**, `src/scripts/enrichment/suggestions/`:
  the rows in `artists.json` (batch `mb-2026-09-30`, 5,877 rows) and
  `songs.json` (`mb-songs-2026-09-30`, 7,783); the records rows need made
  first, each listing the rows that need it, in `places.json`,
  `record-places.json`, `releases.json`, `labels.json`, `studios.json` and
  `artists-created.json`; `record-slugs.json` (each MusicBrainz id's slug,
  only ever added to); `matches.json` (a report); and `manifest.json` (per
  run: counts, input hashes, `calibrated`, `measuredPrecision`). Load them
  as you copy the contract artifacts, and again when the manifest's hashes
  change. Today all 13,689 rows pass `suggestionSchema`.
- **The app's own** (`provider: 'app'`, batch `app-stage1`): `planStageOne` in
  `src/content/linking/index.ts`, run over the store's live bodies with the
  importer's rows beside it. Today it plans 2,208 (event artists, songs and
  places, song-pin Cities, progression songs, song years) and 170 places to
  make. It is pure TypeScript that imports, types aside, only
  `src/content/graph`, `src/content/suggestions` and the globe's country table;
  plan again when those bodies change. Run it as copied code, as `slugs.ts` is
  copied: a planner re-typed would mint other ids (question 6 below).
- **One id from both is one suggestion**, with both sources; the importer's
  `batch` and `dependsOn` win (`src/content/suggestions/merge.ts`).

**`GET /suggestions`** (admin and editor) → 200:

| Parameter    | Meaning                                                     |
| ------------ | ----------------------------------------------------------- |
| `kind`       | A served content kind.                                      |
| `slug`, `id` | Comma-separated target slugs, or suggestion ids.            |
| `path`       | Exactly as the suggestion spells it.                        |
| `provider`   | `app`, `musicbrainz` or `wikidata`: any of its sources.     |
| `tier`       | `sure`, `likely` or `ambiguous`.                            |
| `batch`      | One run.                                                    |
| `status`     | Comma-separated statuses (below).                           |
| `decision`   | Comma-separated: `open`, `accepted`, `rejected`, `dropped`. |
| `unreviewed` | `1`: only bulk accepts no one has marked reviewed.          |
| `cursor`     | Opaque, from `nextCursor`.                                  |
| `limit`      | Default 200, at most 1000.                                  |

A value outside a parameter's list is a 400. Rows are ordered by kind,
slug, path, then id.

```ts
{
  items: {
    suggestion: Suggestion;
    status: SuggestionStatus;
    decision: SuggestionDecision | null; // the one that stands; null while open
    unreviewed: boolean; // accepted in bulk, not marked reviewed since
    dependency?: {
      // the suggestion `dependsOn` names, when it is served
      id: string;
      target: { kind: string; slug: string };
      path: string;
      display: string;
      status: SuggestionStatus; // its own row's, for the same viewer
      stands: boolean; // the bulk rule below: its item's stored body says it
    };
  }[];
  nextCursor: string | null;
  total: number; // rows the filter selects
  batches: {
    batch: string;
    providers: string[];
    count: number;
    calibrated: boolean | null; // the importer manifest's, per run; null for the app's
    measuredPrecision: number | null;
  }[];
  decisions: { total: number; notDownloaded: number; proposed: number };
  replay: ReplayReport | null; // what the last import of decisions.json did (below)
  notServed: { artifacts: string[]; planners: string | null }; // what could not be served, and why
}
```

A status is read against the body the viewer's next save builds on: an
editor's own proposal, else the stored body. `dependency` is there because
what a row rests on is often another item's (a song's rows rest on the lead
act's identity row, a Label row on a song's Album row), which a list of one
item's or one kind's rows never holds: the console reads it for the bulk
dialog and for "Rests on …" on a card.

- `open`: the path is empty, and nothing is decided.
- `accepted`: accepted, and not in the body yet: it waits in a proposal.
- `applied`: the body says it, whoever wrote it.
- `conflict`: the path holds something else.
- `unreachable`: the item or the list element it names is gone.
- `removed`: accepted, then taken out by a later save.
- `rejected`, `dropped`: decided so, and the decision stands.

**`POST /suggestions/decisions`** (admin and editor, as below):

```ts
{
  decisions: {
    suggestionId: string;
    op: 'accept' | 'replace' | 'reject' | 'drop' | 'review' | 'reopen';
    method?: 'single' | 'bulk'; // default 'single'
    value?: unknown; // accept: the owner's own value, when they changed it first
    seen?: unknown; // replace: what the path held when the owner chose to write over it
  }[]; // 1 to 5,000
  threshold?: number; // bulk: the lowest confidence taken, 0 to 1; default 0.85, never below 0.7
}
```

- **Who.** An editor accepts and replaces one at a time, into their
  proposal. Reject, drop, review, reopen and every bulk accept are admin
  only: no one reviews those afterwards.
- **Writing.** Every accept or replace for one item in one request is one
  `PUT /items` of the item with the values applied, validated as any PUT
  is: a direct save for an admin, the proposal for an editor, with a
  revision note naming the suggestion ids, their providers and batch. A
  value goes where the path is empty or, for a replace, where it still
  holds `seen`. An `add` to an `evt-` event's id list that nobody has
  stored is refused: that list starts as a `set` of the whole list, so one
  accept cannot narrow the guesses. An accepted value loses `unverified`
  and gains `source` (the providers, merged into any `source` there; a
  credit's `https://musicbrainz.org/artist/<mbid>` stays, as it is the only
  place that MBID is kept). **Superseded (owner, 30 Sep 2026):** an accept
  writes the value bare, with no `source`, link or outside id
  (`console-backend-integration.md` §7). Accepting a value already there but unverified
  confirms it. Linking `session.studioId` or `session.labelId` fills
  `session.studio` or `session.label` from the record's name when it is
  empty or still the name of the record being replaced; typed text is
  never overwritten. A song's `source` fields are written only at song
  level 2.
- **Records to make first.** Only those the value, the owner's if changed,
  still names, and only once the item's save would pass: create-only, in
  publish order (places, labels, studios, artists, releases). A record the
  store already has is used instead: an artist, release, label or studio
  with the same MusicBrainz id (`externalIds.mbid`, or for a label or
  studio the `https://musicbrainz.org/label/<mbid>` or `/place/<mbid>` link
  in its `source`); a place with the same folded name within 5 km whatever
  the country, or within 25 km in the same country
  (`src/content/linking/samePlace.ts`), in which case the value is written
  with the store's slug and the decision logs it so; any other record (a
  release, label or studio with no MusicBrainz id on either side) only when
  its body is the same, `unverified` and `source` aside. An artist is never
  reused without the same MusicBrainz id: namesakes are the commonest wrong
  match. (Since the owner's rule of 30 Sep 2026 no body holds such an id, so
  the reuse by id lives only in the importer's tooling;
  `console-backend-integration.md` §7.) `requires` never lists
  the item itself: a Label row targets the release it labels, which its
  Album row makes, so until then it answers 404 saying so; once the release
  exists it writes into it, edited or not.
- **Bulk** (`method: 'bulk'`). Only as offered: no replace, no changed
  value. A suggestion goes when it is not a City read from song pins (a
  `basedInPlaceId` whose sources include an `app` source labelled
  `artist_location…`: a person checks each), nor a song's `year` (students
  read it on the song's page; C15), it is `open`, it is `sure`, its
  confidence is at least the threshold, an importer's row comes from a
  batch whose manifest says `calibrated` (an unknown batch is not), and
  the suggestion it `dependsOn` stands: the stored body of the item that
  one is for says its value, whoever put it there. An accept still in an
  editor's proposal does not stand, nor one taken out by a later save, nor
  another value the owner chose instead (another MusicBrainz artist).
  Otherwise 422 `NOT_BULK`, the reason in `error`. A path that changed under it since the owner's dry run
  answers as a single accept would: 409 with `current`, never forced. A
  bulk accept is `unreviewed` until an admin sends a `review` for it.
- **Reject and drop** leave the item as it is, so they are refused while
  its stored body, or a proposal on it, still says the value: 409
  `SUGGESTION_APPLIED`. Otherwise the log would say "rejected" beside a body
  that says it, and an import of the log would drop the value. The owner
  takes it out by editing the item first.
- **Reopen** works on a rejected or dropped suggestion only; the reject
  stays in the log, and the suggestion is offered again. Decisions in one
  request are read in order, so a reject and its reopen can go together.
- **Logging.** Each decision is logged in the row shape above. An editor's
  accept is held with its proposal: approving the proposal confirms the
  accepts its body still holds; withdrawing it, or saving it again without
  a value, drops those. Only confirmed decisions are downloaded or
  replayed. An accept whose value the item already held is logged too.
- **Approving.** The records an editor's accepts made are that editor's
  new proposals (the release an Album row names; the label a Label row then
  put on that release). `POST /items/:id/approve` approves them with the
  item, records first in publish order, each checked before any is
  approved, so the item never goes live naming a record that is only a
  proposal (its next publish would fail on the reference). A record another
  editor proposed stops the approval: 409 `PENDING_PROPOSAL`, naming it.

One decision refused answers with that refusal's status and
`{ error, code, suggestionId, current? }`. Otherwise 200:

```ts
{
  results: (
    | {
        suggestionId: string;
        outcome: 'saved' | 'proposed' | 'already' | 'recorded'; // recorded: reject, drop, review, reopen
        decision: SuggestionDecision;
        itemId?: string; // the item written
      }
    | {
        suggestionId: string;
        outcome: 'refused';
        status: number; // what this refusal alone would answer
        code: string;
        error: string;
        current?: unknown; // a conflict: what the path holds now
      }
  )[]; // one per decision, in order
  decisions: { total: number; notDownloaded: number; proposed: number };
}
```

| Status | `code`                    | When                                                                                                   |
| ------ | ------------------------- | ------------------------------------------------------------------------------------------------------ |
| 400    | `BAD_REQUEST`             | A malformed request, more than 5,000 decisions, a bad `threshold`, or one suggestion accepted twice    |
| 403    | `FORBIDDEN`               | An editor's reject, drop, review, reopen or bulk accept                                                |
| 404    | `NO_SUCH_SUGGESTION`      | The id is not served                                                                                   |
| 404    | `NOT_FOUND`               | The target item does not exist (for a Label row, the error says to accept its Album row first)         |
| 409    | `PENDING_PROPOSAL`        | Someone else's proposal waits on the item, or was sent back to them                                    |
| 409    | `SUGGESTION_CONFLICT`     | The path holds something else, returned as `current`; a replace with `seen` equal to it writes over it |
| 409    | `SUGGESTION_UNREACHABLE`  | The element it names is gone, or it adds to an event list nobody has stored                            |
| 409    | `NOT_REOPENABLE`          | A reopen of a suggestion that is open or accepted                                                      |
| 409    | `SUGGESTION_APPLIED`      | A reject or drop of a value the item, or a proposal on it, still says                                  |
| 409    | `REQUIRED_RECORD_TAKEN`   | A record to make has a slug that a different record holds                                              |
| 422    | `NOT_BULK`                | A bulk accept the rules above refuse                                                                   |
| 422    | `REQUIRED_RECORD_INVALID` | A record to make has no body, or would not validate                                                    |
| 422    | `VALIDATION_FAILED`       | The item's save would be refused (`problems`)                                                          |

**`GET /suggestions/decisions`** (admin and editor) →
`{ artifactsVersion: 1, decisions: SuggestionDecision[] }`: every confirmed
decision, oldest first, which is what `decisions.json` should hold now (the
console writes it one row per line). `decisions.notDownloaded` counts the
confirmed decisions not in the `decisions.json` last imported.

**Importing `decisions.json`** (admin; the design names it
`POST /suggestions/import`, taking the file's JSON; the mock instead replays
the file it was built with, after load and after Reset). For each
suggestion, take its latest decision other than a review or a reopen; where
that is an accept or a replace, write its `value` again where the store has
lost it: onto an empty path, or for a replace over a value that still
hashes to `seenHash`, never over anything newer. Make its `requires` first
(the row's, else the suggestion's), as above. List, and never force, an item
with a proposal on it, a value that no longer fits and a save the schema
refuses; count, and leave, a value taken out by a save made after the
decision (an item untouched since the seed counts as never saved). An
import's own saves are no such save: a store that imported an earlier
`decisions.json` still writes what a fuller one adds. One admin
save per item, noted "Replayed from decisions.json: …". Keep every row in
the log. A second import writes nothing. Report it, and serve it as
`replay`:

```ts
interface ReplayReport {
  considered: number; // accepts and replaces that still stand
  applied: number; // written again
  already: number; // the store said them
  removedSince: number; // taken out by a later save, and left so
  created: number; // records made
  conflicts: {
    suggestionId: string;
    target: { kind: string; slug: string };
    path: string;
    reason: string;
  }[];
  refused: string[]; // rows the schema does not describe
  error: string | null; // why the file could not be read at all
}
```

**Requested: counts and ghosts per row.** The Table shows each row's open
count and, in each empty field, the value a suggestion would put there. To
draw those it reads every suggestion of the table today: for Artists, 6,045
rows in 7 pages, 3.5 MB. A lighter answer for one kind would do, such as
each slug's open, conflict and unreviewed counts and, per path, the
`display` an empty field would show; the shape is to agree. The full list
stays for the row panel.

**Measured against the mock**: a bulk accept of 943 event places took
3.4 s, 25 items per request; one Accept from the row panel 235–259 ms;
replaying 1,454 Stage-1 decisions 143 ms; after a Reset, replaying the song
half's 5,320 accepts made about 1,370 records again, with no conflict.

Not in this list: the handoff's `chord_progression` kind still stands as
written there. The console registers it in Phase 4, and its `REF_PATHS`
entries are already in `refPaths.ts`. It sits outside the order above: ship
it whenever suits, before Phase 4. Its identity is `id`, a number, so
`slug` must equal `String(body.id)` (see
[Identity](#identity-which-body-field-is-the-slug)).

---

### 5c. Instrument content: `drum_groove`, `instrument_part`, `feel_profile`

Three new kinds for the console's drum grooves, Parts Library parts and feel
profiles, each with `id` as its identity and one bundle (see CDN bundles).
Their bodies, slug patterns, references, publish order and import are in
[instrument-content-kinds.md](instrument-content-kinds.md); the zod bodies
are `src/content/instrument/schemas.ts` and the slug patterns are in
`slugPatterns.generated.json` (draft 4). Repo mode and the mock serve them
already.

## Derivation changes

All in `music-atlas-api/src/services/content/derive/song-to-globe-event.ts`.

### Song → globe event carries the recording

Handoff item 3, plus the ids. The text fields have data as soon as v1 is
adopted (priority 1); the id fields need song v2 (priority 6), except
`artistIds`, which is built from v1 fields.

| From the song                                                          | Onto the event | Level |
| ---------------------------------------------------------------------- | -------------- | ----- |
| `session.label`                                                        | `label`        | v1    |
| `session.studio`                                                       | `studio`       | v1    |
| `session.recordedYear`                                                 | `recordedYear` | v1    |
| `credits[]`, as they are (with `artistGlobeId` and `unverified`)       | `credits`      | v1    |
| `origin.artistGlobeId`, then primary credits' `artistGlobeId`, deduped | `artistIds`    | v1    |
| `releases[].releaseId`                                                 | `releaseIds`   | v2    |
| `session.studioId`                                                     | `studioIds`    | v2    |
| `session.labelId`, only when the song has no `releases`                | `labelIds`     | v2    |
| `session.placeId`                                                      | `placeId`      | v2    |

The additions to the event, typed. Each is omitted when the song gives it no
value: never `null`, never `[]`.

```ts
label?: string;         // session.label, as written
studio?: string;        // session.studio, as written
recordedYear?: number;  // session.recordedYear
credits?: Credit[];     // the latest creditSchema (songBodySchema.ts), v1's plus `source`
artistIds?: string[];   // artist slugs, lead act first
releaseIds?: string[];  // v2
studioIds?: string[];   // v2: [session.studioId]
labelIds?: string[];    // v2: [session.labelId], only when the song has no releases
placeId?: string;       // v2: session.placeId, a globe_city id
```

- A song with `releases` reaches its labels through `releaseIds` (each
  record's `labelId`), so its event has no `labelIds`. The text `label` is
  carried either way.
- The `globe_event` body validator must accept these fields on every event:
  hand-authored `evt-*` events get the id fields in Phase 2, under the same
  names, so the globe reads one shape. `overrides` treat them like the
  existing event fields.

### Placement by slug

Where a song's event is pinned, in this order:

1. The artist is the first of these that is set: `origin.artistGlobeId`, the
   first primary credit's `artistGlobeId`, `artistSlug(song.artist)`.
2. That artist's `basedInPlaceId`, read from the artist kind's live release,
   never from a draft or a proposal: pin at that `globe_city` as its live
   release has it, with `lat`/`lng` from `coordinates` (`[lat, lng]`) and
   `city`/`country` from `name`/`country`. A `pin: false` city is a valid
   location; it is what the migration below creates hometowns as. If the
   artist or the city is not in a live release, go on to step 3.
3. Otherwise the `artist_location` entry whose `artistSlug(id)` equals the
   artist's slug: pin there.
4. Otherwise New York, counted in `defaultedToNewYork` as today.

This replaces the lowercase-name substring match that the server inherited
(`src/scripts/buildGlobeData.mjs:173-185` here). Before switching, run both
and list the songs whose pin moves. We would rather fix those by linking than
keep the substring match.

`/derivation-health` keeps its fields and groups by slug, so "Hall & Oates"
and "Hall and Oates" are one row:

```ts
{
  totalSongs: number;
  matched: number;
  defaultedToNewYork: number;
  artistLocationCount: number;
  placedBy: { basedInPlace: number; artistLocation: number; defaulted: number }; // new
  unmatchedArtists: {
    slug: string;       // new: the key
    artist: string;     // a display spelling
    songCount: number;
    songs: string[];
  }[];
}
```

### `artist_location` → `artist.basedInPlaceId`

Measured against `src/scripts/artistLocations.json` on 29 September, 362
entries (349 since the owner's duplicate merge of 30 September; see the last
item):

- **By plain city name**, 134 entries name a city that is not in `CITIES`,
  across 86 city names.
- **Alias- and country-aware**, using `resolvePlaceName` in `places.ts`, 254
  resolve to exactly one city. Of the 108 that do not, 102 entries name 84
  cities that are not registered (some may be other spellings of registered
  ones). Six are ambiguous or match a same-named city in another country:
  Portland and Charleston, US (two of each are registered), and San Jose (US),
  Athens (US) and Halifax (GB), where only the Costa Rican, Greek and Canadian
  cities are registered.
- **The file uses ISO-2 country codes** (`NO`, `SE`, `IE`, …), while `CITIES`
  spells countries out except `US` and `UK`. `places.ts` only folds US and UK
  spellings, so 25 entries resolve only once the codes are translated. The
  mapping has to translate them.
- **16 keys are not a registered artist's lowercased name.** Six resolve
  through `normalizeArtistName` or an alias (Andy Grammar, Guns N' Roses,
  Des'ree, Herman's Hermits, "Earth, Wind, and Fire", and one combined
  billing that is itself a registry entry). The other ten: three combined
  billings ("a great big world and christina aguilera", "blackstreet and dr.
  dre", "frankie valli and the four seasons"), two that are not artists
  ("traditional", and a garbled "es una historia – i am singing – stevie
  wonder"), and five artists missing from the registry: Chicago, Jamie
  Lidell, Kenny Loggins, Patti LaBelle and Roberta Flack. The registry's seed
  dropped names that collide with a place, which is how Chicago went missing.
- **Since 30 September**, 349 entries. Thirteen went: twelve under a removed
  spelling (eleven in the same city as the kept name's own pin, and "joe
  legend" in Ottawa beside John Legend's Springfield) and "remind in light",
  which repeated Talking Heads'. Ten moved to the kept name. "andy grammar"
  is keyed "andy grammer" now, and the Lady Marmalade billing lost its stray
  comma, so 15 keys are not a registered artist's lowercased name, five of
  them resolving.

The migration (Later: the table is Phase 2 work, and its file and row shape
are specified with it):

1. We produce a dry-run mapping report and a committed mapping table
   (Phase 2): entry → artist slug → `globe_city` id. It is alias-aware,
   matches on name and country, and resolves combined billings through
   credits first.
2. The API applies it: it sets `artist.basedInPlaceId`, and creates each
   unregistered hometown as a `globe_city` with `pin: false`. The table
   carries complete bodies, since `City` requires every field:
   `subdivision`, `genres`, `description` and `activeDecades` (empty where
   unknown), a real `region` id, and `coordinates` as `[lat, lng]` from the
   entry. It also carries full artist bodies for the five missing artists,
   which the API creates the same way.
3. `artist_location` stays served, and read by placement step 3, until every
   entry maps. An entry maps when the table gives it an artist slug and a
   `globe_city` id, or marks it `drop`, as for the two that are not artists.
   Only then is the kind retired and dropped from `/capabilities`.

**Where the mapping stands (30 September, after the owner's duplicate
merge).** The console's planners now offer each entry as a City suggestion on
its act (§10), never accepted in bulk, beside a report of the pins the accept
would move. Of the 349 entries, 329 are offered as 328 suggestions (Earth,
Wind & Fire's two pins are one), all likely: 233 at an existing city and 96 at
85 new `pin: false` places, whose complete bodies ride in the suggestion's
`requires`. The six "Washington" pins resolve to Washington, D.C.; San Jose
(US), Athens (US) and Halifax (GB) get places of their own. Where the
importer gives the same place, 242 are offered as the act's City and 86 as a
person's birthplace. 13 joint billings are listed, not offered; the records
one letter from another act that were listed before the merge are gone; and
the five missing artists are still missing. Each accept, replace or drop is a
row of `decisions.json`, so the mapping table is those rows plus what is left
to list.

---

## CDN bundles

New bundles, one per kind, in the same format as `songs`: sharded JSON arrays
of published bodies, listed under `kinds` in the CDN `manifest.json`, and
reported as `bundle` in `/capabilities` from the kind's first live release.
The names and format are fixed now, because each new kind's import ends with
a release (priority 4) and the publish checks read live releases
(priority 7). What the app reads from them, and when, is Later.

| Kind                | Bundle             |
| ------------------- | ------------------ |
| `artist`            | `artists`          |
| `release`           | `releases`         |
| `studio`            | `studios`          |
| `label`             | `labels`           |
| `globe_city`        | `places`           |
| `chord_progression` | `progressions`     |
| `genre`             | `genres`           |
| `subgenre`          | `subgenres`        |
| `instrument`        | `instruments`      |
| `drum_groove`       | `drum-grooves`     |
| `instrument_part`   | `instrument-parts` |
| `feel_profile`      | `feel-profiles`    |

The last four are from `console-backend-integration.md` §4.4. The Teach
kinds follow later. If `globe_city` already
publishes under another name on your side, keep that name and report it. The
rest is specified at checkpoint 1i.

---

## Decisions already made

Please treat these as settled.

**Ids are namespaced: `<kind>:<slug>`.** Bodies store bare slugs, and the
field name implies the kind (`studioId`, `basedInPlaceId`). The namespaced
form appears only in derivation, the graph, URLs, integrity checks and
`ValidationProblem.target`.

**Edges are derived from record fields, never stored separately.** One
amendment, approved by the owner on 29 September 2026: artist-level influence
is a field on the artist record, `influencedBy`, which derives artist → artist
`influenced` edges. This amends the handoff's "influence lives only in
`eventConnections.ts`" for artists only. The globe's event-to-event arcs stay
in that file, code-owned, and the console flags an artist influence that
merely restates one of them.

**Vocabularies stay in code.** Superseded for genres, subgenres and
instruments: the owner made them editable (30 Sep 2026), so they are content
kinds (`console-backend-integration.md` §4.2). Modes, vibes, regions and
eras still have no endpoints. `vocabulary.generated.json` is the API's copy,
for validation.

**`unverified` is kept, not hidden.** Credits, sessions, related recordings,
members, influences and whole records can carry `unverified`, and `source`
alongside it (on the song's fields from v2). The UI renders them muted;
nothing filters them out server-side.

**No nav link to an unserved kind.** The console registers a kind only when
`/capabilities` lists it. Until then its editor shows "Not served by the API
yet" rather than a link that 404s.

---

## What happens on our side when each lands

- **v1:** we re-run the song import to land the remaining charts. The
  lead-act and credit pickers become editable once `/capabilities` reports
  song level 1.
- **Capabilities:** `useCapabilities` replaces the fixed list of six. Nav,
  New, pickers and the mirror's context actions filter on served kinds.
- **Lookup, export, create:** the song mirror resolves slugs in one request,
  previews and the working graph read `/export`, and every create sends
  `create: true` once `features.create` is true.
- **Each record kind:** a `KindSpec` with its `identity`. Once the kind is
  authoritative, the graph and pickers stop reading the code registry for it.
- **Validation:** problems attach to their field through `path`, and warnings
  show after a save instead of blocking it.
- **Song v2, event v2, artist level 2:** the row panel's record pickers,
  "Appears on", subgenres, an event's Artists, Songs and Place, and Born turn
  editable, each at its own level.
- **Suggestions:** the Table shows ghost values, counts and the Suggestions
  section, the admin's bulk accept and the decisions banner, reading and
  writing only through §10. The owner's review moves from the mock to the
  store, starting from the imported `decisions.json`.
- **Revision check:** the row panel sends `expectedRevision` and, on a 409,
  asks the editor as it does today after its own re-read.

Checkpoint 1i adds a contract test suite
(`src/scripts/apiContract/contract/*.test.ts`) that runs against our mock by
default, or against a staging API with `CONTRACT_API_URL=…`.

---

## Questions worth asking before you start

1. **Is `VITE_CONTENT_CDN_URL` set in production?** It is not set in any
   `.env` file in the repo, and without it the app reads bundled data and a
   publish never reaches students. This decides whether "published" means
   anything to the app today.
2. **Does a publish carry repo data into the server, or must content be
   entered through the console?** Still open from the handoff. It decides
   whether the 883 artists and 299 cities are an import script, as
   `importArtistLocations.ts` was for artist locations, or a migration.
3. **Does `/overview` list kinds with zero items?** The capabilities fallback
   builds the kind list from its rows. If it skips empty kinds, `globe_city`
   disappears from the console on a server without `/capabilities`.
4. **Should `chordCount`, `startingChord`, `startingDegree` and `progression`
   be recomputed server-side on write?** Still open from the handoff; they are
   all functions of `chords`.
5. **How strict are the validators for the non-song kinds today?**
   `globe_event`, `globe_city`, `artist_location` and the two flows: strict
   Zod, loose, or none? It decides whether the reference checks can reject
   on day one or have to start as warnings.
6. **Can the API run the app's planners?** `planStageOne`
   (`src/content/linking/`) is pure TypeScript with no React, store or
   network. Running it as copied code keeps the app's suggestion ids equal
   to the ones the committed decisions name; the other way is for us to
   commit its output as one more artifact, planned from the repo's data
   rather than the store's.
7. **What should `/export` say about a deleted item?** As specified, and
   in the mock, it is simply absent. For a kind that is not authoritative
   the console then falls back to the repo's copy, so a song or an event
   deleted in the console comes back as "In code". A tombstone
   (`{ id, slug, deleted: true }`) or a list of deleted slugs would let the
   working graph drop it.
