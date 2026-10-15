# Console → API → app: backend integration guide, for Ryan

Written 6 October 2026. **Start here.** This guide says what to build, in
what order, so the owner can edit content in the deployed console and have
it reach students. The full specification stays in
[`console-content-api-contract.md`](console-content-api-contract.md) (the
"contract"). This guide links into it by section. **Where the two disagree,
this guide wins**; [What changed](#2-what-changed-since-the-30-september-contract)
lists every place they do.

All paths are in the `Webapp-Refactor` repo. The console work is on `main`
(PR #186); the artifacts and the seed export named here land with the PR
that adds this guide. Frontend follow-up is marked as such.

---

## 1. What this enables

Today the deployed console is **read-only**. Every row in the Table and every
field in Cortex and the mirror is locked, because the API does not answer
`GET /capabilities` with `features.export: true`. So far the owner has edited
only on their own machine, in "repo mode" (`VITE_CONTENT_REPO=1`), which
writes straight into the repo's data files. That means about 2,000 new
records and 13,500 values: artists, records, studios, labels, hometowns,
credits, vocabularies and progressions.

The goal: the admin edits in the deployed console, publishes, and students
see the change on their next page load. A change to one record shows up
everywhere that record is connected.

```
 Console (Table · Cortex · mirror · Publishing)
   │  PUT /items        one item per request, with expectedRevision
   ▼
 API store (drafts, proposals, revisions)
   │  derive:           song-* globe events, display text (§6)
   │  POST /releases → parts → activate        (one kind at a time, in order)
   ▼
 CDN  content/manifest.json  +  content/<bundle>/v<n>/part-<i>.json
   │
   ▼
 Student app: reads the manifest once per page load, falls back to bundled data
```

### One owner per fact

Every fact is stored once, on the record that owns it:

- a song's lead act (`origin.artistGlobeId`) and credits;
- an artist's City (`basedInPlaceId`);
- a record's label (`release.labelId`);
- a progression's songs (`songIds`);
- an event's artists (`artistIds`).

The console never writes the reverse side. Edges, "Appears on" lists, member
lists, scenes, years and decades are all **derived** from the records
(`src/content/graph/deriveEdges.ts`, `src/features/admin/table/link/links.ts`).
Every console write is one item: a Table cell, a Link…, an accept. No write
is a multi-record changeset.

So "everything connected updates" needs three things:

|       | What                                                                                                                                                                      | Who                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **a** | Store the owning record and publish its kind.                                                                                                                             | API (§4, §5)                |
| **b** | Re-derive the few things the API computes from other records: `song-*` globe events (pin, genre names, credits, record ids) and display text that copies a record's name. | API (§6)                    |
| **c** | Load that kind at runtime in the student app. Today only songs, globe events, lessons and Piano Fundamentals are loaded that way.                                         | Us, frontend follow-up (§8) |

Inside the console, (a) is enough. The Table, Cortex and Integrity re-derive
every connection from `GET /export` after each save, so they update at once.

---

## 2. What changed since the 30 September contract

| The contract says                                                                                                                            | Now                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Vocabularies stay in code… no endpoints" (Decisions)                                                                                        | `genre`, `subgenre` and `instrument` are **content kinds** the owner edits in the Table. Schemas: `src/scripts/apiContract/vocabularyRecordSchemas.ts`. See §4.2. |
| `chord_progression` "stands as written" in the old handoff                                                                                   | The console edits progressions (chords, songs, styles, vibes). Schema: `progressionBodySchema.ts`. Rules: `progressionRules.generated.json`. See §4.3.            |
| Revision check on `PUT` is "Requested" (§5b)                                                                                                 | **Required.** The Table's write queue sends `expectedRevision` on every cell save and retries once on 409 (`src/features/admin/table/edit/writeQueue.ts`).        |
| Seeds: 883 artists, 299 cities, 4 studios, 4 labels, no records                                                                              | One export of everything the repo holds (§5): 1,903 artists, 648 places, 109 studios, 137 labels, 407 records and more.                                           |
| §10 and §5b: accepted values carry `source: 'musicbrainz'`, MusicBrainz links stay on credits, `artist.externalIds`, reuse by MusicBrainz id | **Owner rule (30 Sep):** no MusicBrainz or Wikidata name, link or id in any stored or served body. See §7.                                                        |
| `artifactsVersion` 3 with a version 4 draft                                                                                                  | **Version 4 is handed over** (this change). See §3.                                                                                                               |
| CDN bundles for artist, release, studio, label, globe_city                                                                                   | Also `progressions`, `genres`, `subgenres`, `instruments` (§4.4).                                                                                                 |
| Questions 2 and 4 open                                                                                                                       | Answered: the seed comes from our export script (§5), and the server recomputes progression fields (§4.3).                                                        |

---

## 3. Copy the contract artifacts (version 4)

`src/scripts/apiContract/manifest.json` is at `artifactsVersion: 4` with no
open draft, so every file below is exactly what version 4 means. Copy them
together; never retype them. The schema files import only `zod` (3.23.8),
and the JSON is plain data.

| File                                                                | New in 4                        | What                                                    |
| ------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------- |
| `songBodySchema.v1.ts`, `songBodySchema.v2.ts`, `songBodySchema.ts` | v2                              | Song body levels                                        |
| `recordBodySchemas.ts`                                              | `globe_event` v2, `artist.born` | artist, release, studio, label, globe_city, globe_event |
| `refPaths.ts`                                                       | entries for the above           | Every body path that names another item                 |
| `suggestionSchema.ts`                                               | yes                             | §10 rows (Phase 4)                                      |
| `progressionBodySchema.ts`                                          | **yes**                         | `chord_progression` body                                |
| `progressionRules.generated.json`                                   | **yes**                         | Progression rules as data (§4.3)                        |
| `vocabularyRecordSchemas.ts`                                        | **yes**                         | genre, subgenre, instrument bodies                      |
| `slugPatterns.generated.json`                                       | vocab kinds                     | Identity field and slug pattern per kind                |
| `vocabulary.generated.json`                                         | –                               | The API's copy of every vocabulary, for `vocab` checks  |
| `../../content/graph/slugs.ts`                                      | –                               | `toSlug`, `artistSlug`: copy as is                      |

Report `artifactsVersion: 4` in `/capabilities` once you run these. The
console then sends `X-Content-Artifacts: 4` on content requests. Add that
header to the CORS allow-list next to `X-App-Session` in the same deploy, or
the preflight fails (contract, "How the artifacts are versioned").

---

## 4. Phase 1: the write API

Do these in order. Each ships alone. The console reads `/capabilities` and
turns on only what it reports.

### 4.0 Publishing must reach students first (do this before anything else)

Your pipeline already builds sharded bundles under immutable keys and points
`content/manifest.json` at them (`src/content/manifest.ts` describes the
client side). What we cannot confirm is that production reads it:

1. **`VITE_CONTENT_CDN_URL` is set in no env file in the repo**, so we
   cannot tell whether Vercel production sets it. Without it the app silently
   uses the data bundled at build time, and no publish ever reaches a
   student. Tell the owner the CDN base URL. The owner sets it in Vercel for
   both projects (`music-atlas-webapp` and `webapp-refactor`) and redeploys,
   because it is baked in at build time.
2. **The manifest** at `{CDN}/content/manifest.json` must have:
   - `schemaVersion: 1` (anything else throws);
   - `kinds` keyed by bundle name, each with
     `{ version, itemCount, objects: [{ key, bytes, sha256 }], publishedAt }`;
   - CORS for the app's origins; it is fetched with `credentials: 'omit'`;
   - `Cache-Control: max-age=60`.
3. **Shard keys never get overwritten.** For example
   `content/songs/v12/part-0.json`, a JSON array of compiled bodies (body +
   overrides). Serve them with `Cache-Control: immutable`. The client caches
   each shard URL forever in Cache Storage `ma-content-v1`, so a key reused
   for new content would never refresh.
4. **Publish `fundamentals` alongside `lessons`.** A missing `fundamentals`
   bundle becomes `[]`, and Piano Fundamentals then throws instead of falling
   back (`src/content/flowStore.ts`).
5. **Smoke test:** edit a song's title in the console → Publish → reload the
   app → the Songs page shows the new title.

### 4.1 Contract priorities 1–7

Build these as the contract specifies:

| #   | What                                                                                                                                                     | Contract section                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1   | Adopt `songBodySchema.v1.ts`, then v2 (`songBodySchema.v2.ts`)                                                                                           | §1, §5b, §6                     |
| 2   | `GET /capabilities`                                                                                                                                      | §2                              |
| 3   | `GET /items/lookup`, `GET /export`, `PUT /items` with `create: true`, PUT answers `{ item, warnings }`                                                   | §3                              |
| 3a  | **`revision` on `/export` items and `GET /items/:id`; `expectedRevision` on PUT → 409 `REVISION_CONFLICT` with the current `revision`, nothing written** | §5b ("Requested", now required) |
| 4   | The `artist` kind + the first two reference checks                                                                                                       | §4                              |
| 5   | `release`, `studio`, `label`, `globe_city` v2                                                                                                            | §5                              |
| 6   | Song v2, `globe_event` v2, `artist.born`                                                                                                                 | §5b, §6                         |
| 7   | Reference validation from `REF_PATHS`, DELETE 409 `REFERENCED`                                                                                           | §7                              |

Plus §4.2 and §4.3 below, which the contract does not have.

### 4.2 New: the vocabulary kinds `genre`, `subgenre`, `instrument`

- **Bodies:** `vocabularyRecordSchemas.ts` (`.strict()`). Identity is `id`,
  kebab-case (`slugPatterns.generated.json`).
- **Ids never change** (the graph keys on them), and neither does a genre's
  `taught`. A PUT that changes either is 409 `IMMUTABLE_ID`.
- **Delete** is 409 `REFERENCED` even with `force`, because songs, artists,
  events and progressions name them.
- **What students see:** an instrument's `name` and `section` (the song
  page's instrument pills), and genre names on globe events (§6). Nothing
  else from these kinds reaches students today.
- **Keep `vocabulary.generated.json` in step.** It is the API's copy used for
  `vocab` checks on other kinds. When these kinds are stored, validate `vocab`
  paths against the stored, published vocabulary instead. Until then the
  generated copy is the fallback.
- **Bundles:** `genres`, `subgenres`, `instruments`.
- **Reference implementation:** the mock's `vocabularyWriteProblems` and
  `heldVocabulary` (`src/features/admin/content/mock/contentMockServer.ts`).

### 4.3 New: `chord_progression`

- **Body:** `progressionBodySchema.ts`. Identity is the numeric `id`, so the
  item's slug is `String(id)`.
- **Rules,** all in `progressionRules.generated.json` and all errors on PUT
  unless noted:
  - **Chords:** every chord is `<degree> <type>`, with one space; the degree
    matches `degreePattern` and the type is one of `chordTypes`.
  - **Count:** `minChords` to `maxChords` chords (2 to 7).
  - **No duplicates:** no two progressions may have the same chords, compared
    after each chord is trimmed, inner spaces are collapsed and
    `spellingFixes` are applied. Code `DUPLICATE_PROGRESSION`, with `target`
    `progression:<other id>`.
  - **Derived fields:** **recompute them on every write.** These are
    `progression = chords.join(' - ')`, `chordCount`, `startingChord` and
    `startingDegree` (`derivedFields`). The console sends them correct;
    recomputing them closes the contract's question 4.
  - **New ids:** a new id must be above the highest id ever issued. The seed
    manifest gives `progressionIdHighWater` (698 today). Never reuse an id:
    UNISON stores progression ids. Keep the mark in the store and raise it on
    every create.
  - **Grandfathered problems:** a problem the stored body already had is a
    _warning_, so editing one of the eight existing duplicate pairs still
    saves (`validateProgression` with `before`,
    `src/curriculum/engine/progressionValidation.ts`).
- **Reference implementation:** `progressionWriteProblems` in the mock, and
  `src/features/admin/content/mock/progressionProblems.ts`.
- **Bundle:** `progressions`.

### 4.4 Bundles: names fixed now

| Kind                         | Bundle                          | Read by the student app today?               |
| ---------------------------- | ------------------------------- | -------------------------------------------- |
| `song`                       | `songs`                         | yes                                          |
| `globe_event`                | `globe-events`                  | yes                                          |
| `activity_flow`              | `lessons`                       | yes                                          |
| `fundamentals_flow`          | `fundamentals`                  | yes                                          |
| `artist`                     | `artists`                       | after frontend follow-up (§8)                |
| `globe_city`                 | `places`                        | after §8                                     |
| `chord_progression`          | `progressions`                  | after §8                                     |
| `instrument`                 | `instruments`                   | after §8                                     |
| `genre`, `subgenre`          | `genres`, `subgenres`           | after §8                                     |
| `release`, `studio`, `label` | `releases`, `studios`, `labels` | no; students see them through song text (§6) |
| `artist_location`            | none                            | –                                            |

Publish them all now. A kind the app does not read yet costs nothing, and the
publish checks read live releases (contract §7).

### 4.5 `/capabilities` is the switch

What the console turns on as you report each piece:

| You report                     | The console                                                                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `features.export: true`        | Leaves read-only. The Table, Cortex, Integrity and the row panel read `/export` and save (`src/features/admin/content/graph/useWorkingGraph.ts`, `src/features/admin/table/edit/editability.ts`). |
| a kind in `kinds[]`            | Makes that kind's rows editable. A kind not listed stays "Read-only: the content API does not serve … yet".                                                                                       |
| `song.schemaVersion: 2`        | Turns on records, subgenres, studio/label/place ids on songs.                                                                                                                                     |
| `globe_event.schemaVersion: 2` | Turns on an event's Artists, Songs, Place, Records, Studios, Labels.                                                                                                                              |
| `artist.schemaVersion: 2`      | Turns on Born.                                                                                                                                                                                    |
| `features.create`              | Enables New… and creating the records an accept needs (sends `create: true`).                                                                                                                     |
| `features.lookup`              | Lets the mirror resolve `/songs/:slug` in one request.                                                                                                                                            |
| `authoritative: true`          | Stops merging the repo's copy for that kind, so deletes are final (§5).                                                                                                                           |
| `features.suggestions`         | Turns on the Suggestions UI (Phase 4; leave `false`).                                                                                                                                             |
| `artifactsVersion: 4`          | Starts sending `X-Content-Artifacts` (CORS!).                                                                                                                                                     |

### 4.6 Every endpoint the console calls

All under `/api/admin/content`. Auth is `Authorization: Bearer`, optional
`X-App-Session`. 2xx bodies are SuperJSON; errors are plain JSON
`{ error, code?, ...details }` (contract, "Ground rules").

| Method and path                                                                                                                                                                                                              | Body or query                                                                  | Status                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| GET `/capabilities`                                                                                                                                                                                                          | –                                                                              | new (§2)                                                      |
| GET `/overview`                                                                                                                                                                                                              | –                                                                              | today; `changedSincePublish` must count re-derived items (§6) |
| GET `/items?kind=&status=&search=`                                                                                                                                                                                           | no `limit` = all rows                                                          | today                                                         |
| GET `/items?kind=&limit=200&cursor=`                                                                                                                                                                                         | paged                                                                          | today                                                         |
| GET `/items/lookup?kind=&slug=`                                                                                                                                                                                              | –                                                                              | new (§3)                                                      |
| GET `/items/:id`                                                                                                                                                                                                             | –                                                                              | today, plus `revision`                                        |
| GET `/template/:kind`                                                                                                                                                                                                        | –                                                                              | today; add the new kinds                                      |
| GET `/export?kind=&view=&omit=sections,audioSources&limit=500&cursor=`                                                                                                                                                       | –                                                                              | new (§3), plus `revision`                                     |
| PUT `/items`                                                                                                                                                                                                                 | `{ kind, slug, body, status?, note?, overrides?, create?, expectedRevision? }` | today + `create`, `expectedRevision`, `{ item, warnings }`    |
| DELETE `/items/:id`                                                                                                                                                                                                          | the console never sends `force`                                                | today + 409 `REFERENCED`                                      |
| GET `/pending`; POST `/items/:id/approve`, `/reject` `{ note }`, `/discard-edit`                                                                                                                                             | –                                                                              | today; approve can answer 422                                 |
| GET `/validate/:kind`                                                                                                                                                                                                        | –                                                                              | today + `REF_PATHS` checks                                    |
| GET `/derivation-health`                                                                                                                                                                                                     | –                                                                              | today; group by slug (contract "Placement by slug")           |
| GET `/releases`; POST `/releases` `{ kind }` → `{ releaseId, version, itemCount, parts[] }`; POST `/releases/:id/parts/:n`; POST `/releases/:id/activate`; POST `/releases/:id/cancel`; POST `/rollback` `{ kind, version }` | –                                                                              | today                                                         |
| POST `/asset` (multipart `file` → plain JSON `{ url }`)                                                                                                                                                                      | –                                                                              | Phase 4                                                       |
| GET `/suggestions`, POST `/suggestions/decisions`, GET `/suggestions/decisions`                                                                                                                                              | –                                                                              | Phase 4                                                       |

Who sends `expectedRevision`:

- **Sends it:** the row panel, the full editor and the mirror
  (`itemEditor/useItemSession.ts`), and every Table cell
  (`table/edit/writeQueue.ts`). Each retries once on `REVISION_CONFLICT` or
  `SLUG_TAKEN`.
- **Doesn't send it:** Link…, the bulk writer, New… and the song import,
  which re-read just before writing.

---

## 5. Phase 2: one-time seed import (the cutover)

**Decision (owner, 6 Oct 2026):** after this import, the API is the only
source of truth for content. The repo's data files become the bundled
fallback and stop changing. Repo mode is retired for content edits (§8), so
the store and the repo never diverge.

### 5.1 Export

From a clean checkout of `main`:

```
npx tsx src/scripts/apiContract/exportSeed.ts --out seed-export
```

It reads the repo exactly as repo mode and the offline mock do
(`loadRepoStore`). It refuses to run if any data file it reads is
uncommitted, and refuses to write if any body fails its contract schema,
identity or slug pattern, or names an outside catalogue. It writes:

- **`<kind>.ndjson`:** one item per line,
  `{ kind, slug, status, body, derivedFrom? }`, ordered by slug.
- **`seed-manifest.json`:**
  - per kind: file, count, sha256, identity;
  - `publishOrder`;
  - `artifactsVersion`;
  - `progressionIdHighWater`;
  - `gitHead`.

On 6 October 2026 (the data as merged in PR #186):

| Kind                | Items | Notes                                                                                                                                                                                          |
| ------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `genre`             | 29    | 12 `taught`                                                                                                                                                                                    |
| `subgenre`          | 582   |                                                                                                                                                                                                |
| `instrument`        | 59    |                                                                                                                                                                                                |
| `globe_city`        | 648   | 299 globe cities + 349 `pin: false` places (hometowns)                                                                                                                                         |
| `label`             | 137   |                                                                                                                                                                                                |
| `studio`            | 109   |                                                                                                                                                                                                |
| `artist`            | 1,903 | 883 on the globe's roster + 1,020 more                                                                                                                                                         |
| `release`           | 407   |                                                                                                                                                                                                |
| `song`              | 640   | 638 published, 2 drafts (`thank_you`, `this_must_be_the_place`, not in the app's bundle)                                                                                                       |
| `globe_event`       | 1,723 | 1,083 `evt-*`, 640 `song-*`. 639 carry `derivedFrom`. The other, `song-valerie_bbc_live_version`, is the song `valerie` through `src/components/atlas/data/songEventAliases.ts` (contract §7). |
| `chord_progression` | 695   |                                                                                                                                                                                                |
| `artist_location`   | 349   | Read only by pin placement step 3; retiring (contract "artist_location → artist.basedInPlaceId")                                                                                               |

Lessons (`activity_flow`, `fundamentals_flow`) are not in the seed. The API
already holds them, and repo mode never edited them.

### 5.2 Import

1. **Write every item** with its body and status. Don't demote anything: an
   item the store already publishes stays published.
   - **Songs:** the seed is the repo's chart, which today's level-0 schema
     refuses for 602 of 640. Import after song v2 (§4.1 #1), or re-run the
     console's Import songs (contract §1), which compares before it writes.
   - **`song-*` events:** import the bodies as they are, `location` included,
     and link each to its song through `derivedFrom`. The derivation keeps an
     existing pin unless the lead act's live `basedInPlaceId` places it
     (`deriveEventBody` in the mock). So the import moves no pin. Run
     `/derivation-health` before and after.
   - **Overrides:** keep any `overrides` the store holds on events. The seed
     body is what a publish compiles today.
2. **Release each kind in `publishOrder`:** vocabularies → places → labels →
   studios → artists → records → songs → globe events → progressions →
   artist locations. Each release's reference checks then find their targets
   live.
3. **Set `authoritative: true`** on every seeded kind once its release is
   live. That includes `song` and `globe_event`, because the store now holds
   the whole set. Leave the two lesson kinds as they are.
4. **Store the high-water mark:** `progressionIdHighWater` becomes the
   store's mark.
5. **Tell us the cutover commit.** From then on we treat the repo's data
   files as frozen.

---

## 6. Phase 3: cascades, "everything connected"

What the API must re-derive, so a change to one record reaches what depends
on it. Everything not listed is a derived edge the console and graph compute
themselves (contract §5a). Students see a `song-*` event change only after a
`globe_event` publish.

| When this changes                                                                          | The API does this                                                                                                                                                                                                                                                                                                                         | Students see it after            |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| A song is saved or approved                                                                | Derive its `song-<id>` event (existing; mock `deriveSongEvent`, contract "Song → globe event carries the recording")                                                                                                                                                                                                                      | `songs` + `globe-events` publish |
| An artist's `basedInPlaceId`, at artist release activate **or rollback**                   | Re-derive the `song-*` events of every song whose lead act it is, so pins follow the City (mock `rederiveLeadActs`; contract §5b "Re-deriving on an artist release")                                                                                                                                                                      | `globe-events` publish           |
| A place's `name`, `country` or `coordinates`, at `globe_city` release activate or rollback | Re-derive the `song-*` events placed there through a lead act's `basedInPlaceId`, so pins move with the place                                                                                                                                                                                                                             | `globe-events` publish           |
| A genre's `name`, at `genre` release activate                                              | Re-derive the `song-*` events of songs whose `genreTags` include it. The event's `genre[]` is display names looked up by id (mock `GENRE_NAMES`).                                                                                                                                                                                         | `globe-events` publish           |
| A studio's, label's or place's `name`                                                      | On every song that links it (`session.studioId`, `session.labelId`, `session.placeId`), set the display text (`session.studio`, `session.label`, `session.city`) to the new name **only where the text still equals the old name**. Text someone typed is never touched. Then re-derive those songs' events (they copy `studio`/`label`). | `songs` + `globe-events` publish |
| An artist's `name`                                                                         | On every song whose lead act it is (`origin.artistGlobeId`), set `song.artist` to the new name only where it still equals the old one, then re-derive the event (its title is "Title — Artist"). Never touch `credits[].name`, which is the credit as printed. **The old spelling is removed, never kept as an alias** (owner rule).      | `songs` + `globe-events` publish |
| A record is deleted that others reference                                                  | 409 `REFERENCED` with `referrers` (contract §7). The console never forces.                                                                                                                                                                                                                                                                | –                                |
| Rename or merge of an id                                                                   | Later (contract §8). Song and event ids are immutable; vocabulary ids are immutable.                                                                                                                                                                                                                                                      | –                                |

The two display-text rows are new. They extend the console's own rule for
linking (contract §5b: fill the text from the record's name when it is empty
or still the old record's name). Run them on the saved item, the same way an
admin save derives a song's event, and write each touched song as a normal
revision with a note such as `Follows the studio's rename`.

**Bookkeeping.** Every re-derived or rewritten item counts in its kind's
`/overview.changedSincePublish`. The console's "Changes (n)" and "Publish
all" then pick it up. "Publish all" runs in the order above, `globe_event`
after songs (`src/features/admin/content/publishing/publishRun.ts`
`PUBLISH_ORDER`).

**Recommended:** when an upstream activation (artist, place, genre, studio,
label) re-derived any event, start a `globe_event` release yourself after it.
Then the pin moves without the admin having to know to publish Globe events.

---

## 7. Owner rules the API enforces

- **No outside catalogue on the site.** No stored or served body may hold a
  MusicBrainz or Wikidata name, link or id (or a MetaBrainz/MBID one).
  Refuse such a PUT with 422 `VALIDATION_FAILED`, and say nothing in the
  message that names the catalogue, because the console shows it. The test
  is the repo store's `CATALOGUE_MENTION` (`src/scripts/repoContent/importRules.ts`);
  the console's guard is `src/features/admin/__tests__/noSourceNames.test.ts`.
  This replaces the contract's `source: 'musicbrainz'` examples and
  `externalIds`. Don't store `externalIds`, and don't reuse records by
  external id.
- **Imported values are plain data.** No unverified mark, no source.
- **Merged duplicates lose the old spelling** entirely. It is not kept as an
  alias.
- **Ids never change** for songs, events and vocabularies. Progression ids
  are never reused.

---

## 8. What we build on the frontend (follow-up, not in this change)

So a published edit reaches students without a deploy:

1. **Runtime loaders**, each falling back to the bundled data like
   `songStore`. Until each ships, an edit to that kind needs a commit and a
   deploy to reach students, even though the console shows it at once.
   - `artists`: the globe's roster (artist names, aliases, search);
   - `places`: the globe's cities (`pin !== false` only);
   - `progressions`: UNISON matching and the curriculum generator;
   - `instruments`: the song page's pills.
2. **Retired progression ids:** wire `src/curriculum/data/retiredProgressionIds.ts`
   into the lookups, so ids merged away still resolve.
3. **Freeze repo mode** for content once the cutover commit is named (§5.2
   step 5).
4. **Genres:** song-library genre labels come from code tables
   (`SongLibraryPage.tsx`, `CircleOfFifthsSvg.tsx`), not the vocabulary. A
   genre rename reaches students only through globe-event genre names until
   those move onto the `genres` bundle.

Students see changes on their next page load. Nothing polls.

---

## 9. Phase 4 (later)

- **Suggestions,** contract §10, without provenance (§7). The importer's
  output is already applied to the repo, so this is for the remaining review
  queue only.
- **`POST /asset`** for artist images.
- **Rename and merge,** contract §8.
- **Teach read endpoints,** contract §9.

---

## 10. The reference implementation: the offline mock

The console's offline mock implements this contract in-process. Run the
console against it to see any behaviour live:
`VITE_CONTENT_MOCK=1 VITE_DEV_AUTH_BYPASS=1 VITE_DEV_AUTH_BYPASS_ROLE=admin npm run dev`,
then open `/console` (the bypass signs you in as an admin, DEV only). In `src/features/admin/content/mock/contentMockServer.ts`:

| Behaviour                                                          | Function                                              |
| ------------------------------------------------------------------ | ----------------------------------------------------- |
| Revisions, `SLUG_TAKEN`, `REVISION_CONFLICT`, `{ item, warnings }` | `putItem`, `touch`                                    |
| Schema, identity and reference checks on PUT                       | `checkWrite` (+ `mock/validation.ts`)                 |
| Vocabulary and progression rules                                   | `vocabularyWriteProblems`, `progressionWriteProblems` |
| Delete with referrers                                              | the DELETE handler (`REFERENCED`)                     |
| Song → event derivation, placement                                 | `deriveSongEvent`, `deriveEventBody`, `placeSong`     |
| Pins follow an artist's City                                       | `rederiveLeadActs`                                    |
| Releases, shards of 200, activate, rollback                        | `createRelease`, `buildPart`, `activate`, `rollback`  |
| CDN manifest and objects                                           | `cdnManifest`, `cdnObjectText`                        |
| Capabilities                                                       | `capabilities`                                        |
| Kinds, identities, bundles, templates                              | `mock/mockKinds.ts`                                   |
| Suggestions (Phase 4)                                              | `mock/decisions.ts`                                   |

The mock does not yet do the place, genre and display-text cascades in §6.
Those are specified here first.

---

## 11. Acceptance checklist

Point a console build at staging (`VITE_MUSIC_ATLAS_API_URL`) and the app
at the staging CDN, then run these as the admin:

1. **Read-only lifts.** `/console/table/artists` rows are editable, and the
   banner saying the rows are the repo's snapshot is gone.
2. **Cell save.**
   - Edit an artist's Active from year → the save sticks after reload.
   - Edit the same row in two tabs → the second gets the conflict prompt (409
     `REVISION_CONFLICT`), not a silent overwrite.
3. **Create.** New… studio with an existing slug → `SLUG_TAKEN`. A fresh one
   is created.
4. **Pin follows City.**
   - Set an artist's City in the Table → the pin-move report lists their
     songs.
   - Publish all → reload the app's globe → the song pins sit in the new city.
5. **Rename cascade.**
   - Rename a studio → the songs recorded there show the new name on the
     Songs page after Publish all.
   - A song whose studio text was typed differently is unchanged.
6. **Genre rename.** Rename a genre → after Publish all, globe event genre
   pills show the new name.
7. **Delete guard.** Delete a label that a record names → 409 with the
   referrers listed, and nothing deleted.
8. **Progression.**
   - Edit a progression's chords → `chordCount` and `startingChord` follow.
   - A duplicate of another progression's chords is refused.
   - The `progressions` bundle holds the edit after publish.
9. **Outside catalogue.** Paste a MusicBrainz link into an artist's bio → 422.
10. **Rollback.** Roll back the artist release → the pins return after the
    next `globe-events` publish.

---

## 12. Questions to answer back

1. **The production CDN base URL**, so the owner can set
   `VITE_CONTENT_CDN_URL`. Is the bundle pipeline live in production today?
2. **A staging API URL** for the acceptance run.
3. **How strict are today's validators** for `globe_event`, `globe_city`,
   `artist_location` and the flows? This decides whether the reference checks
   can reject on day one or start as warnings (contract question 5).
4. **Deleted items in `/export`:** absent, or a tombstone
   `{ id, slug, deleted: true }`? Once every kind is authoritative, absent is
   enough (contract question 7).
5. **Anything here that conflicts with how the store works**, especially the
   display-text cascade (§6), which is new.
