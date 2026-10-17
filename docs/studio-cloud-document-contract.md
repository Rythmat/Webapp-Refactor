# Backend brief — Studio projects: the `document` field and `revision`

**For:** the backend developer of **music-atlas-api** (the Studio controller at
`/api/studio/projects`, same host and auth as today).
**Status:** the web client is built (Studio milestone 1.5) and ships **before**
this API work. Until the API has the field, the client puts the same data on
the first track's `settings` blob (the "interim fallback" below). The client
spots the new field on its own (see "How the client tells"), so this can
deploy at any time. No flag and no client release are needed.

## Context: what and why

A Studio save today keeps the tracks, clips, tempo, key and mixer. It loses
everything else the editor holds: the chord lane, the mode, the time
signature, the loop range, markers, mastering, the Score and Lead Sheet
(marks, layout, sections), Prism's builder settings, clip lengths, controller
data (sustain pedal), note ids, muted clips and audio clips' names. The save
toast says "Project saved", but the project reopens without them.

The client now writes all of that as one JSON object, the **cloud document**.
The API's only job is to store it and give it back, plus a **revision** number
so two devices can't silently overwrite each other.

The document's format belongs to the client (codec v3,
`src/daw/persistence/projectDocument/cloudDocument.ts`). **The server never
reads or changes what is inside it.**

## Schema (additive migration, no backfill)

`studio_project` gains:

| column                | type                        | meaning                                                  |
| --------------------- | --------------------------- | -------------------------------------------------------- |
| `document`            | `JSONB NULL`                | the client's document, stored as sent                    |
| `document_schema`     | `INT NULL`                  | its format version (`documentSchema`), today `6`         |
| `revision`            | `BIGINT NOT NULL DEFAULT 0` | +1 on every successful POST and PUT                      |
| `written_at_revision` | `BIGINT NULL`               | the `revision` of the last write that carried `document` |

Existing rows start at `revision 0` with no document. Asset GC is unaffected:
the document names no assets.

## Endpoints

### `GET /api/studio/projects/:id`

Today's body, plus **always** these four keys:

```jsonc
{
  // …today's fields (id, name, bpm, prism, returns, tracks, …)
  "document": { "schema": 3 /* … */ }, // or null. The KEY must be present even when null.
  "documentSchema": 3, // or null
  "revision": 12,
  "writtenAtRevision": 12, // or null
}
```

> **The `document` key being there is how the client knows the API has the
> field.** Please make sure no serializer drops null keys from this response
> (POST and PUT answers too).

### `POST /api/studio/projects` (create)

Accepts two optional body keys, `document` (an object) and `documentSchema`
(an integer). Store them, set `revision = 1`, and set `writtenAtRevision = 1`
when `document` was sent (else `null`). Respond like GET.

### `PUT /api/studio/projects/:id` (save)

Accepts three optional body keys: `document`, `documentSchema` and
`baseRevision` (the revision this save is based on). Check them in this order
and **write nothing** if any check fails:

1. Body larger than **8 MiB** → `413 { "error", "code": "body_too_large" }`.
2. `baseRevision` sent and ≠ stored `revision` → `409`:
   ```json
   {
     "error": "…",
     "code": "revision_conflict",
     "revision": 14,
     "updatedAt": "2026-10-12T10:00:00.000Z"
   }
   ```
   No `baseRevision` (older apps, or a save the client can't place) means no
   check: last write wins, as today.
3. `documentSchema` sent and lower than the stored `document_schema` → `409`:
   ```json
   { "error": "…", "code": "document_schema_too_old", "documentSchema": 4 }
   ```
   This is an old browser tab writing over a newer app's document. It would
   drop fields it doesn't know, so it's refused. The student sees "Reload to
   update".
4. `document` that is neither an object nor `null` → `400`. If its JSON is
   over **2 MiB** → `413 { "error", "code": "document_too_large" }`.

Then write:

- **`document` absent** → keep the stored `document`, `document_schema` and
  `written_at_revision` as they are. This is what makes older apps safe: they
  never send the key, so they can never erase it.
- **`document` is an object** → replace it whole, **verbatim** (no merge, no
  stripping of keys you don't know). Set `document_schema` to the sent value
  (it is ≥ stored after check 3), and `written_at_revision` to the new
  revision.
- **`document: null`** → clear it (`document_schema` and
  `written_at_revision` become `null`). The client doesn't do this today.
- Tracks and clips: replaced as today.
- `revision = revision + 1`. Make check 2 and the increment one atomic step
  (for example `UPDATE … SET revision = revision + 1 … WHERE id = $1 AND
revision = $baseRevision`, then 409 when no row matched).

Respond like GET.

The `code` values are what the client reads. The client's error parser takes
`code` and the whole JSON body (for `revision`), and shows `error` only in
logs, so its wording is free.

### `GET /api/studio/projects` (list, for the Projects dialog)

Each summary adds:

```jsonc
{ "revision": 12, "documentSchema": 3, "trackCount": 4 }
```

Don't send the document in the list. (`rootNote` from the prism block would
also help the dialog show a key. Optional.)

### `PATCH /api/studio/projects/:id/meta`, `DELETE`, assets

No change. `PATCH /meta` does **not** bump `revision`: it only files the
project and doesn't touch what the editor saves.

## Copies: Save As, "Save as a copy", Duplicate

- **Save As** and **Save as a copy** (the conflict dialog's choice) are a
  plain `POST` of the whole body, `document` included. Nothing new is needed
  for them.
- Their audio clips name the **original** project's `assetId`s. See question
  6: the copy must keep playing if the original is later deleted.
- **Duplicate** from the project list has no endpoint today, and the client
  doesn't offer it yet. If you add one, `POST /:id/duplicate` should copy the
  rows, the `document` and `document_schema` as they are, start
  `revision = 1` with `writtenAtRevision = 1` (or `null` without a document),
  and carry asset references under the same rule as Save As.

## What older clients do (and why nothing breaks)

| Who saves                                    | What the API stores                                                                   | What a 1.5 client opens                                                                                                                                                                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| An app from before 1.5 (cached tab, old PWA) | the rows; `document` kept, `written_at_revision` stays behind `revision`              | the rows (they win for everything they carry) plus the document's other parts. Per-clip parts are checked against a checksum of the clip's notes and left out if those notes changed. The student is told an older version saved it last. |
| A 1.5 client before this API deploy          | `settings.projectDoc` (+ `projectDocSchema`) on the first track's settings blob       | the document from whichever track carries it                                                                                                                                                                                              |
| A 1.5 client after the deploy                | `document`; the first save after the deploy also drops `projectDoc` from the settings | the `document` field (preferred over any `projectDoc`)                                                                                                                                                                                    |
| An app from before 1.5 opening a 1.5 project | n/a                                                                                   | what it always opened; its next save keeps the document (above)                                                                                                                                                                           |

## How the client tells the API has the field

`cloudDocumentSupport.ts`: every project the API returns (GET, POST, PUT)
either has the `document` key or doesn't. Until a project has come back, saves
use the interim fallback. That way an API that rejects unknown body keys never
sees `document` or `baseRevision`. The first save after the deploy still goes
out as the fallback, and its answer flips the client. The save's echo check
compares the `document` it got back with the one it sent (JSON with sorted
keys), and treats the save as incomplete if they differ.

## Server tests we'd like to see

1. A PUT without `document` keeps the stored document and `writtenAtRevision`
   and bumps `revision`.
2. A PUT with `document` replaces it verbatim (including keys the server
   doesn't know) and sets `writtenAtRevision = revision`.
3. A stale `baseRevision` → 409 `revision_conflict` with the current
   `revision`; nothing written.
4. An older `documentSchema` → 409 `document_schema_too_old`; nothing
   written.
5. A document over 2 MiB → 413 `document_too_large`; a body over 8 MiB → 413
   `body_too_large`.
6. `PATCH /meta` leaves `revision` alone.
7. GET, POST and PUT always include the `document` key (null when there is
   none); the list includes `revision`, `documentSchema`, `trackCount`.

The client's mock of this contract is `scripts/studio-perf/mockStudioApi.mjs`
(mode `document`, tested in `scripts/studio-perf/__tests__/mockStudioApi.test.mjs`).
It's a usable reference implementation.

## Questions for you

1. **Settings blob:** does PUT/POST store each track's `settings` object
   verbatim, every key included (`sourceTrackId`, `oracleSynth`,
   `masterAutomation`, `trackRole`, and now `projectDoc`)? Is there a size
   limit on it? The client's request type doesn't declare `settings`, and
   track ids, effects and synth patches all ride there. The interim fallback
   depends on it too.
2. **Returns:** is the project-level `returns` array (the return FX buses)
   stored and returned? It isn't in the declared request type either. (The
   document carries a copy, so after this deploy it is safe either way.)
3. **MIDI clips:** are `midiClips` stored exactly as sent (`id`, `name`,
   `startTick` and the five note columns)? Are unknown keys inside a clip
   dropped or kept?
4. **Row ids:** does PUT mint new track and audio-clip row ids each time? (The
   client doesn't rely on them. It keys tracks by `settings.sourceTrackId`.
   We'd just like to know.)
5. **Body size:** what is the JSON body limit on these routes today? Express's
   default is 100 kB, and a long project's columnar MIDI already gets close.
   The contract asks for 8 MiB.
6. **Assets across copies:** may project B's clips reference assets whose
   `projectId` is A (Save As does this today)? When A is deleted, are A's
   assets reclaimed, which would silence B?
7. **Unknown body keys:** does validation reject them today (a strict zod
   schema, say)? The client is built to work either way. The answer decides
   whether anything else must deploy first.
8. **Timing:** who builds this, and when? Once it is on staging, we'll run one
   save/open against it to confirm the client switches from the fallback to
   the field.

## Acceptance

- [ ] The migration has run; GET, POST and PUT always return `document`,
      `documentSchema`, `revision` and `writtenAtRevision`.
- [ ] PUT keeps the document when the key is absent and stores it verbatim
      when present.
- [ ] 409s with the codes above, writing nothing; 413s with the size codes.
- [ ] The list returns `revision`, `documentSchema` and `trackCount`.
- [ ] One manual save → open against staging: the client sends `document`,
      and the next open reads it.
