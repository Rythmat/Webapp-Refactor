# The Atlas Table and a denser mind map: the full design (Amendment 5)

Amendment 5's full, file-level design, copied into the repo at checkpoint C1
so that the later phases (B, C2, E, F1, F2, D) can read it here. It was
produced by a design workflow — three design lenses, a synthesis, two
adversarial reviews and a revision — and approved by the owner on
29 September 2026. The text below is that revision as it was approved;
only the file paths were made relative to the repo.

- The summary, the owner's answers and the phase list are Amendment 5 in
  [`console-content-graph-design.md`](console-content-graph-design.md).
  What was built, the measured numbers and every place the build differs
  from this text are in that file's "as built" sections, starting with
  "Checkpoint A2 + C1 as built".
- Where this text and the owner's decisions differ, the owner's win: event
  and city genre names are drawn solid, through the curated genre table
  (`resolvedBy`); the song-pin cities (`artist_location`) are guesses until
  the owner accepts one or the sources agree; the MusicBrainz and Wikidata
  import comes after the app's own data (F1, F2).
- Counts below are the design's own measurements and estimates at the time.
  Re-measure before relying on one.

Its original title: _Plan: a richer Mind Map and a Table section in the
console (revised after the feasibility and intent reviews)_.

---

## 1. Context

**Why.** The owner wants the Mind Map to show many more connections. Before Phase A the graph had 3,973 nodes and 9,175 edges:

- 536 of the 908 artist nodes had no edge at all.
- 906 of 907 artists were joined only by a guess made from a name.
- Events were joined only by influence arcs.

Much of the missing data is already in the repo but never becomes an edge:

- event years, cities, genres, and artists found by tag matching;
- about 250 artist song-pin locations from `artist_location`;
- 676 links between cities and genres;
- song years.

The rest (Born, Years Active, Albums, Labels, Studios, Producers, Composers) has to come from MusicBrainz and Wikidata. It arrives as unconfirmed suggestions that the owner accepts.

**Baseline: what is already built (uncommitted working tree).** This plan is re-baselined against it.

- **Phase A (Time and readability) is done:**
  - `src/content/graph/time.ts` and the `year`/`decade` kinds;
  - `from_year`, `in_decade` and year→era `from_era`;
  - compiler-checked `EDGE_KINDS`/`ENTITY_KINDS` and `CODE_OWNERS.calendar`/`eras`;
  - the Time category and the kind-based hubs (`graphVocabulary.ts:95-113`);
  - hub-stop, hub focus at 1 hop, and a visible "Walk through hubs" toggle (`MindMapPage.tsx:55-94,211`);
  - the mixed-kind group split (`layoutEgo.ts:414-456`);
  - the orphan exemption for year and decade, and their tests.
- **The Table shell is done:**
  - `AdminRoutes.table`/`tableList`/`tableRow`;
  - the Table item in the sidebar for every console role;
  - `GuardOutlet` over the content area and the Table;
  - lazy `TableLayout`/`TableBar`/`TablePage`, with `PLANNED_COLUMNS` shown to the owner;
  - `tablePaths.ts` with `CATEGORY_NAV`;
  - the tests `eagerBoundary`, `tablePaths` and `TableRoutes`.
- **Not built yet:**
  - the edge kinds `about`, `took_place_in`, `scene_of`, `born_year`, `formed_year`, `born_in` and `active_in`;
  - every deriver below, and the working graph;
  - the Table's rows and editing;
  - suggestions and the importer.

**What changes for the owner.**

1. **The Mind Map gets new connections.** Events join to artists, songs, cities, genres and years. Cities join to scenes. Artists join to where their songs are pinned. Instruments join to genres. Very large hubs (big cities, later Motown) stop cluttering two-step views and show a count instead.
2. **The Table** at `/console/table` gets the owner's 10 categories and exact columns. Every cell is a view of the same graph the Mind Map draws. A row panel edits the stored fields; editors' saves become proposals.
3. **Filling the data happens in the Table:**
   - the app's own data shows as dotted (guessed) connections straight away;
   - "Suggestions" turn the sure ones into stored facts;
   - an importer adds MusicBrainz and Wikidata suggestions for the same review.
4. **Honest limits.**
   - Until Ryan's backend serves the artist, record, `globe_event` v2 and suggestion kinds, reviewing and accepting happen only on the local offline mock.
   - The production console shows the read-only repo graph.
   - What survives is the committed decisions log (§5.3). The mock replays it, and Ryan's import takes it as its payload.
5. **Ryan gets one contract version per hand-off:**
   - artifactsVersion 3: graph-fidelity paths;
   - artifactsVersion 4: the stored fields, `globe_event` v2, song v2 and the suggestion schema;
   - artifactsVersion 5: the artist-location mapping table, once every entry is decided, plus contract §10.
6. **Nothing changes for students** until an admin publishes content. The globe is pinned byte-identical by a test.

This plan takes over the unbuilt checkpoints 1f and 1h. It is recorded as **Amendment 5** in `docs/console-content-graph-design.md`, together with the as-built record above.

---

## 2. Decisions

### 2a. Decisions (one line each)

1. The Table is its own console section at `/console/table/:table/:row?` (built).
2. **Rows and cells.**
   - Table rows are graph nodes (plus code vocabularies) joined with their stored item. Columns are hop paths over `graph.adjacency`.
   - A rolled-up cell (two or more hops) takes the style of its weakest hop and splits its count: "stated n · via songs m · via events k".
   - Sort, filter and the coverage strip count stated facts by default.
3. **`useWorkingGraph()` is the one data hook** for the Table, the Mind Map and Integrity. It merges `/export` over the repo sources.
   - Its rebuild fingerprint is FNV-1a over each export row's slug, status, editState and a hash of its `body` and `pendingBody` JSON.
   - The contract asks for an export `revision` field that can replace the hashing later.
4. Years and decades are entity kinds (built).
5. **Events get their own deriver, which reads `evt-` events only.**
   - Stored ids win per field.
   - Otherwise `about` edges come dotted from `eventMatches`, which never matches a tag that is also a place or genre name, and the place comes dotted from `location.city`.
   - `genre[]` goes through `resolveGenreTag` and is drawn solid (RefPath `resolvedBy: 'genreTag'`, not `vocab`).
6. **Artists gain one field**, `born: {date?, placeId?, unverified?, source?}`, with date `YYYY[-MM[-DD]]`.
   - For a group, `born.date` is the year it formed, and City (`basedInPlaceId`) is where it formed.
   - It lands in C2, just before the first writer.
7. **Cities and song pins.**
   - City `genres[]` become `scene_of` (solid, `resolvedBy`).
   - City `activeDecades` become `scene_active_in`, a chip of its own that is off by default.
   - Each `artist_location` item gives a dotted `based_in` edge labelled "song pins", with `via` naming that item, only where the artist has no `basedInPlaceId`.
8. **Song schema v2** (C2): `releases[]`, `subgenreIds` (→ subgenre), `session.studioId/labelId/placeId/source`, `credits[].source`, `relatedRecordings[].source`.
9. **Suggestions are a sidecar, never body fields.**
   - Shape: `{id, target, path, op, value, display, sources, evidence, confidence, tier, requires, batch}`. The id stays stable across re-imports.
   - Accepting is a normal save: a proposal for editors, a direct save for admins.
10. **Accepted means confirmed.**
    - Every accept, replace, reject, drop and review goes into the committed decisions log with `method: single | bulk`.
    - Every accept writes a revision note naming the suggestion id and its sources.
    - `source` is written wherever the schema has `RefMeta`.
11. **The importer is a Node script** (`npx tsx`).
    - Its artifacts are committed. The mock loads them in dev only, through `?raw` plus `JSON.parse`.
    - The hashes of its local-only inputs go in the artifacts manifest.
12. **Readability.**
    - Kind hubs, the kind split, hub focus at 1 hop and the toggle are built.
    - New: a node with more than 60 solid edges is also a hub (degree stop), and a stopped hub shows "+N via Detroit".
13. **Bundle.**
    - Only route constants, `tablePaths.ts`/`tableIds.ts` and the sidebar item are eager; the eager-boundary test enforces this.
    - `verifyProdBundle` lists only DEV-only strings.
14. Until the backend serves the new kinds, accepting happens on the local mock. The committed decisions log is the durable record and the payload for Ryan.

### 2b. Conflicts between the three designs (and the reviews), resolved

| #   | Conflict                                   | Choice                                                                                                                                                                                                                                                                   | Why                                                                                                                                                           |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Where event→artist guesses come from       | Pure `eventMatches.ts` taking `{artists, placeNames, genreNames}` as parameters. `loadEventArtists` is deleted                                                                                                                                                           | It runs on working data and adds song matches. The collision sets keep a store-created "Chicago" from matching every `chicago` tag (the registry test's rule) |
| C2  | Event artists and places: derive or write  | Both: dotted in C1, stored ids through accepted suggestions in E                                                                                                                                                                                                         | Visible at once, then made walkable                                                                                                                           |
| C3  | Event and city genres: solid or guessed    | Solid, through a new RefPath flag `resolvedBy: 'genreTag'`: display text, not checked by the API, resolved through the curated table, counted as linked by integrity                                                                                                     | `vocab: true` would make the API reject saves (`UNKNOWN_VOCAB_ID`). 161 event and 244 city strings are not ids                                                |
| C4  | City→genre edge name                       | `scene_of`                                                                                                                                                                                                                                                               | Different meaning; keeps genre arcs clean                                                                                                                     |
| C5  | Year edge names                            | The graph's names (built)                                                                                                                                                                                                                                                | One vocabulary                                                                                                                                                |
| C6  | Shape of `born`                            | `date` string, validated by a new `@pattern` JSDoc                                                                                                                                                                                                                       | Keeps precision                                                                                                                                               |
| C7  | A group's birthplace                       | Its City (`basedInPlaceId`); integrity notes a group `born.placeId` as info                                                                                                                                                                                              | The owner's words                                                                                                                                             |
| C8  | Per-field `provenance[]`                   | Rejected                                                                                                                                                                                                                                                                 | The decisions log gives the per-field trace without changing the contract shape                                                                               |
| C9  | Accepted: confirmed or still unverified    | Confirmed; bulk accepts are traced (C29)                                                                                                                                                                                                                                 | The owner "reviews and accepts"                                                                                                                               |
| C10 | Where suggestions are stored               | `/suggestions` endpoints                                                                                                                                                                                                                                                 | No publish lifecycle; keeps Publishing clean                                                                                                                  |
| C11 | What is stored of a review                 | **Every** decision, `{suggestionId, op: accept, replace, reject, drop or review, target, path, value?, valueHash, method, by, at}`, in the store and in the committed `decisions.json`                                                                                   | Patches go stale when a seed changes (`persist.ts:36-41`). The mapping table needs the accepts and drops                                                      |
| C12 | Where Stage 1 is written                   | The Table. The planners are `provider: 'app'` producers. `LegacyLinkPage`'s loop becomes `useBulkWrite`                                                                                                                                                                  | One review UI                                                                                                                                                 |
| C13 | Artist Genres from songs and events        | Not suggested; shown muted and used as picker ranking                                                                                                                                                                                                                    | One owner per fact                                                                                                                                            |
| C14 | Years Active from event spans              | Not suggested; a muted hint                                                                                                                                                                                                                                              | Low precision                                                                                                                                                 |
| C15 | Songs with no year                         | App suggestions only for the **49** whose `song-` event year is not the 2000 placeholder (`buildGlobeData.mjs:211`, and the mock's `deriveEventBody` also defaults to 2000). Accepted one at a time. The other 22, and the 65 `_year_misses.json` entries, go to Stage 2 | 22 of 71 carry the placeholder                                                                                                                                |
| C16 | Id fields on `song-` events                | Allowed (contract). The graph ignores every `song-` event field                                                                                                                                                                                                          | The contract's derivation table                                                                                                                               |
| C17 | Event legacy REF_PATHS                     | `title` and `tags[]` → artist, with `alsoTargets: ['song']`. `genre[]` and city `genres[]` → genre, with `alsoTargets: ['subgenre']`                                                                                                                                     | Inferred song edges must name a declared path, and "each path once" forbids a second entry                                                                    |
| C18 | Target of `subgenreIds`                    | `subgenre`                                                                                                                                                                                                                                                               | That kind exists                                                                                                                                              |
| C19 | Where the column query layer lives         | `features/admin/table/model/*`, pure. It imports only the route-free `tableIds.ts`                                                                                                                                                                                       | `tablePaths.ts` pulls in React through the router                                                                                                             |
| C20 | Studio or label id with empty display text | Fill the text from the record's name; never overwrite                                                                                                                                                                                                                    | Avoids changing `SongCredits`                                                                                                                                 |
| C21 | Phase order                                | A2 → C1 → B → C2 → E → F1 → F2 → D                                                                                                                                                                                                                                       | Dense map first, the working graph next, accepting before the hand editors, the importer's fields earlier                                                     |
| C22 | Mock persistence                           | A Stage-1 storage budget test in E; IndexedDB in F1 (pulled into E if the budget fails); flush on `visibilitychange`/`pagehide`                                                                                                                                          | Measured need; async writes on tab close                                                                                                                      |
| C23 | `artist_location` as the owner's City      | No. It is where songs are pinned (upbringing or birthplace, e.g. Marvin Gaye → Washington, Madonna → Detroit). City suggestions from it are **likely** (no bulk) until MusicBrainz area or Wikidata P740/P551 agrees. A value equal to P19 is offered as `born.placeId`  | The owner defined City as the scene                                                                                                                           |
| C24 | Owner of the song-pin edges                | The `artist_location` content item (REF_PATHS kind `artist_location`, `city` → place, legacy), not `via.code`                                                                                                                                                            | The store serves it and the console edits it                                                                                                                  |
| C25 | Hub-stop: kind list or degree              | Both: kind hubs (built), plus degree above 60 solid edges, plus a count badge                                                                                                                                                                                            | Cities become hubs (New York City 100 events) and later labels                                                                                                |
| C26 | Key rows                                   | The key nodes used by songs, with a Modes column                                                                                                                                                                                                                         | Rows are graph nodes                                                                                                                                          |
| C27 | Genre rows                                 | The 29 genres by default; the 582 subgenres behind "Show subgenres"                                                                                                                                                                                                      | Readability                                                                                                                                                   |
| C28 | Year column order                          | As the owner has seen it: Songs · Artists · Events · Genre · Location · Records                                                                                                                                                                                          | Already shown in `TablePage`                                                                                                                                  |
| C29 | Bulk accepts                               | `method: bulk` in the log; the filter "Accepted in bulk, not reviewed"; "Mark reviewed"; a count in the Publishing diff                                                                                                                                                  | Reviewed and auto-accepted facts are told apart                                                                                                               |
| C30 | Credited people                            | Records for billed performers, group members, composers and producers. Other roles stay as credit name plus MBID in `source`, and "Create artist" works on demand                                                                                                        | Avoids a table of 2,000 rows                                                                                                                                  |
| C31 | Contract versions                          | One bump per hand-off (v3 C1, v4 end of E, v5 mapping and §10)                                                                                                                                                                                                           | The manifest rule; less churn for Ryan                                                                                                                        |
| C32 | Instruments data                           | `instrumentGenres.ts` / `typical_in` (code, owner-reviewed) moves into C1. Empty cells explain where the data will come from                                                                                                                                             | `instrumentIds` is 0/907; only 14 credit uses                                                                                                                 |
| C33 | A 409 on create                            | Artists: reuse only with the same `externalIds.mbid`; otherwise stop for review or mint a disambiguated slug. Places: reuse with the same name and country within 25 km                                                                                                  | `bill-evans` and similar namesakes                                                                                                                            |

---

## 3. The Table section

### 3.1 Route, sidebar and bar (the shell is built; what remains)

- **Built:**
  - the routes and the redirects for the index, `recording` and unknown tables;
  - `GuardOutlet`, which blocks only on a pathname change;
  - the sidebar Table item for every `isConsoleRole`, highlighted under `/console/table`;
  - the category pills from `CATEGORY_NAV`;
  - Mind map and Publishing on the bar.
- **Remaining:**
  - `createRouteDefinition` drops `undefined` query values (today `{q: undefined}` prints `q=undefined`), with a test;
  - split the route-free `tableIds.ts` (`TABLE_IDS`, `CATEGORY_NAV`, `isTableId`, `tableForAppPage` → `{table, row?}`) out of `tablePaths.ts`, which keeps the hrefs and re-exports;
  - a Changes link (admin) on the bar, and Mind map focused on the open row.

### 3.2 The 10 categories: 13 views, exact columns

**Legend:**

- The first column is the sticky identity column.
- **Bold** columns are the owner's list, visible by default, in order, and pinned by `categories.test`. Proposed columns follow `PLANNED_COLUMNS` as the owner has seen them.
- **Stored** = edited in the row panel. **Derived** = owned by another item; one-hop derived cells have a **Link…** action that writes the owning item's field through `ConfirmConnectionDialog`. **Code** = read-only.

**Common to every view:**

- a status badge;
- muted italics when the item is unverified;
- a count of open suggestions;
- filters for status, has-suggestions, unconfirmed, guesses, orphan, missing and "accepted in bulk, not reviewed";
- a Columns menu, stored in localStorage as `ma-console-table-columns-v1`;
- chips: solid, dotted (guessed), dashed (unconfirmed), hollow (missing), ghost (suggestion);
- a rolled-up chip takes its weakest hop's style;
- an empty cell names where its data will come from ("no instrument data yet: Wikidata P1303 in the import").

#### Artist (`artists`)

Rows are artist nodes. Default filter **Acts**; a second view is **Credited people**.

| Column           | Source                                                                                                     | Edit                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Artist Name**  | `name`; aliases and "Group"                                                                                | Stored                                                                |
| **Born**         | `born` ("1939-04-02 · Washington"; a group shows "Formed 1977")                                            | Stored: date or year, plus a place picker                             |
| **City**         | `based_in` from `basedInPlaceId`. When unset, a dotted chip "song pins: Washington" from `artist_location` | Stored: place picker. The panel lists the song pins that would move   |
| **Genres**       | `in_genre` from `genreIds`; muted "from songs" and "from events"                                           | Stored: picker ranked by those                                        |
| **Years Active** | `activeFrom`–`activeTo`; a muted "events 1964–1983" hint                                                   | Stored                                                                |
| **Songs**        | People edges in (role on each chip)                                                                        | Derived; **Link…** writes a song's `origin.artistGlobeId` or a credit |
| **Events**       | `about` in                                                                                                 | Derived; **Link…** or Confirm writes the event's `artistIds`          |
| **Instruments**  | `plays_instrument` from `instrumentIds`, plus muted chips from members and credits                         | Stored                                                                |

- Opt-in columns: Aliases, Members / Member of, Labels, Influenced by, Records, External ids, Bio.
- Filters: missing-born, missing-city, missing-genres, missing-years, groups, people, no-songs.

#### Songs (`songs`)

| Column                | Source                                                       | Edit                                                                                                                               |
| --------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Title                 | `title`; the lead act                                        | Page editor or the panel                                                                                                           |
| **Composers**         | `written_by` (the `composer` text is only a dotted fallback) | Stored: credits                                                                                                                    |
| **Year**              | `year`                                                       | Stored, one row at a time                                                                                                          |
| **Album**             | `on_release` from `releases[]`                               | Stored (v2)                                                                                                                        |
| **Label**             | The release's label rolled up, or `session.labelId`          | Always editable. With no release it writes `session.labelId`; with a release it writes that release's `labelId` through the dialog |
| **Studio**            | `recorded_at` from `session.studioId`                        | Stored (display text filled when empty)                                                                                            |
| **Credits**           | `credits[]` summary                                          | Stored                                                                                                                             |
| **Producer**          | `produced_by`                                                | Stored: credits                                                                                                                    |
| **Genre**             | `genreTags` plus `subgenreIds`                               | Stored                                                                                                                             |
| **Key**               | `key` and `mode`                                             | "Edit in page editor ↗" (the key belongs to the chart)                                                                            |
| **Chord Progression** | `uses_progression` from the progression's `songIds`          | Derived; **Link…**                                                                                                                 |
| **Events**            | `about` in, plus `influenced` arcs                           | Derived; **Link…** writes the event's `songIds`                                                                                    |

- Opt-in columns: Artist, Mode, Vibes, Recorded in, Covers, Teach days, Pathways, Popularity.
- Filters: missing-year (71: 49 with an app suggestion, 22 placeholders), no-album, no-credits, unlinked-lead-act, no-progression.

#### Genre (`genres`): Code

- Rows: the 29 `GENRES`. **Show subgenres** adds the 582; a genre row counts through its subgenres.
- Columns:
  - **Artists:** "stated n · via songs m · via events k".
  - **Songs**.
  - **Year:** a decade histogram.
  - **Location:** `scene_of` in, plus event places, plus artists' `based_in`.
  - **Instruments:** `typical_in` (code), plus through artists and credits.
- Opt-in columns: Events, Progressions, Subgenres, Parent, Keys, Vibes.

#### Location (`locations`)

- Rows: the 299 cities, the 18 regions and the `pin:false` hometowns. Content kind `globe_city`.
- Columns:
  - **Artists:** "based" (`based_in`), "born" (`born_in`), "song pins" (dotted).
  - **Songs:** `recorded_in`, plus rolled up through based artists.
  - **Genre:** `scene_of`, plus event and artist rollups.
  - **Instruments:** rolled up, with a coverage note.
- Opt-in columns: Events, Studios, Labels, Years, Scene decades, Region, Coordinates.
- Filters: cities, regions, hometowns, no-artists.

#### Instruments (`instruments`): Code

Rows are the 59 `SESSION_INSTRUMENTS`. Columns: Artists · Songs · Genre (`typical_in` solid, plus rollups) · Location · Year.

#### Events (`events`)

Rows are the 1,083 `evt-` events. The panel has `GlobeEventVisualEditor` plus pickers.

| Column      | Source                                                                         | Edit                                              |
| ----------- | ------------------------------------------------------------------------------ | ------------------------------------------------- |
| Event       | Title; "1969 · Bethel, US"                                                     | Stored                                            |
| **Artists** | `about` out: solid from `artistIds`, dotted from matches                       | Stored (`artistIds`; `[]` means "reviewed, none") |
| **Songs**   | `about` out, plus arcs                                                         | Stored (`songIds`)                                |
| **Genre**   | `in_genre` through `resolveGenreTag` (solid); an unresolved string shows muted | Stored as `genre[]` text                          |

- Opt-in columns: Year, Place, Records / Studios / Labels, Pathways, Teach days, Influence.
- Filters: unresolved-place (139 after the ISO fix), no-artists (395), no-genre.

#### Recording: Records | Studios | Labels

| View                    | Columns                                             | Stored                                      | Derived (with Link…)                                                                     |
| ----------------------- | --------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Records** (`release`) | Record · **Artist · Year · Label · Studio · Songs** | title, `artistIds`, year, `labelId`, format | Studio (from its tracks' sessions); Songs (**Link…** writes a song's `releases[]`)       |
| **Studios**             | Studio · **City · Artists · Songs**                 | name, `placeId`, years, coordinates         | Songs (**Link…** writes `session.studioId`); Artists rolled up                           |
| **Labels**              | Label · **City · Artists · Records**                | name, `placeId`, `parentLabelId`, years     | Records (**Link…** writes the release's `labelId`); Artists via `signed_to` plus records |

#### Key (`keys`): computed

- Rows are the key nodes used by songs (`key:c`, …).
- Columns: Key · **Modes** ("major 120 · minor 38 · mixolydian 4"; a mode filter narrows every count) · Songs · Artists · Genre · Chord Progression · Year.
- Read-only.

#### Chord Progression (`progressions`)

- Columns: Progression · Songs · Artists · Genre · Year. Key is opt-in, because 683 of 695 progressions have no key path.
- **Stored:** `songIds`, `styles`, vibes, complexity. Legacy text is shown muted.
- Filters: names-song-unlinked (57), orphan (102).

#### Year (`years` | `decades`): Code

- Columns: Year · Songs · Artists · Events · Genre · Location · Records.
- Decades add "Active" (`active_in`) and, opt-in, "Scene decades".
- Opt-in columns: Born / Formed, Labels and Studios founded, Era, Instruments.

### 3.3 The row panel (lazy; 440 px, or a Sheet below xl)

**Header:** name and badges; **Open in mind map**; **Open page**; close. **Full editor ↗** shows only for a kind whose panel is not complete yet, and disappears per kind as D lands.

**Sections:**

1. **Details:** stored fields with `data-field` anchors.
2. **Suggestions (n):** Accept, Reject, or Replace on a conflict, with the current and suggested values side by side.
3. **Connections:** the table's columns in full, then "All connections" by label with `via`. Code-owned rows name their file; `artist_location` rows link to their item.

**Sticky footer:** Save (admin, with status) or Submit for review (editor, with note); Discard; inline errors.

**Mechanics:**

- **Session (lands in E):** `useItemSession` (no `kinds.ts`) plus a thin `useContentItemEditor` wrapper. `getPath`, `setPath` and `jsonRemainder` move to `content/bodyPaths.ts`.
- **Field widgets (E):** date-or-year, place picker, genre and subgenre picker, year range, instrument multi-picker, and event artist, song and place pickers. They serve both Replace and direct editing of the Artist and Event owner columns.
- **Record editors (D):** `ArtistFields`, `ReleaseFields`, `StudioFields`, `LabelFields`, `PlaceFields`, `ProgressionFields`, each also its kind's `KindSpec` editor (1f).
- **Song panel (D):** `ConnectionsPanel` with the v2 pickers, a Year input, and Key read-only.
- **Pending proposals.**
  - When an item has a pending proposal, an admin's Accept, Confirm or Link on it is disabled with "Review the pending proposal first".
  - An editor's writes go into their own proposal.
  - Bulk skips such items and lists them.
- **`ConfirmConnectionDialog` (Confirm and Link…, D):**
  1. names the owning item and field;
  2. re-reads the item;
  3. shows the whole resulting field (e.g. the full `artistIds` set, with the other guessed artists as checkboxes, sure ones pre-ticked) and a `ProposalDiff`;
  4. saves once and invalidates once.
- **Live draft edges:** the item's own deriver runs on the draft and is laid over the graph's incoming edges.

### 3.4 Performance

- **Grid:** `react-window` `FixedSizeList`, 44 px rows, 10 rows of overscan, sticky header and title cell.
- **Model:** cached per (graph, table) in a `WeakMap`; 60 ms per table or less, checked by a perf test.
- **Search:** folds case and accents like `normalizeArtistName`, uses `useDeferredValue`, and writes the URL after 250 ms. Sorting uses `Intl.Collator({numeric: true})`.
- **Edited rows** stay visible under a filter they no longer match, with a note.
- **Rebuilds:** `keepPreviousData` and a "Refreshing…" chip, keyed on the body-hash fingerprint (decision 3).
- **Budget:** a rebuild under 500 ms. Above that, `buildGraph` and `buildTableModel` move to a module Worker (1 day of contingency).
- **Repo mode** (production today): the repo graph, read-only, with a callout.

### 3.5 What happens to `records/:kind` and the Page | Table toggle

- **`records/:kind` redirects** to the Table, keeping `?q`:
  - song → songs, globe_event → events, globe_city → locations, artist → artists;
  - release → records, studio → studios, label → labels, chord_progression → progressions.
- An "Other records" list stays for `activity_flow`, `fundamentals_flow` and `artist_location`. An unknown kind goes to `/console/table`.
- `records/:kind/:id` and `records/vocabulary` stay.
- **MirrorBar:**
  - the "Table" link uses `tableForAppPage` from `tableIds.ts`: `/songs/africa` → `songs/africa`, `?event=` → `events/<id>`, `?artist=` → `artists/<slug>`, `?place=city:x` → `locations/x`, `/learn` → `songs`, `/curriculum` → `records/activity_flow`;
  - "Edit event" opens the Events row;
  - the Records menu becomes Table · Lessons · Fundamentals · Artist locations | Vocabulary · Import songs.
- **Other links** now open the owning Table row: `graphVocabulary.editorFor`, `reviewHref`, and "Open in Table" on the Mind Map.

---

## 4. Data model changes

### 4.1 Types

**C1 (no body changes):**

- **The `RefPath` type** gains two fields:
  - `resolvedBy?: 'genreTag'`: display text resolved through a curated code table. The API does not check it; its edges are solid, and integrity counts them as linked.
  - `alsoTargets?: readonly string[]`: legacy paths that can also name these kinds.
- The RefPath `kind` union gains `globe_event` and `artist_location`.
- **`GraphSnapshot`:**
  - `events` becomes full `GlobeEventInput`;
  - it gains `artistLocations` (items) and `eventMatches` and `asOfYear` (not item lists);
  - `SnapshotList` and `IDENTITY` exclude `eventMatches`, `asOfYear` and `statuses`;
  - `artistLocations` identity is `artistSlug(id)` (an identity function, not a field).

**C2:**

- **`src/content/records/types.ts`:**
  - `ArtistBirth {date? /** @pattern ^\d{4}(-\d{2}(-\d{2})?)?$ */, placeId?, unverified?, source?}` and `ArtistRecord.born?`.
  - `GlobeEventRecord extends HistoricalEvent`, adding:
    - `artistIds?`, `songIds?`, `placeId?`, `releaseIds?`, `studioIds?`, `labelIds?`, `unverified?`, `source?`;
    - the server-derived `song-` event fields: `label?`, `studio?`, `recordedYear?`, `credits?: Credit[]` (the latest `Credit`, a superset of v1).
    - On `evt-` events, absent means "the graph infers" and `[]` means "exactly none". `song-` events never carry `[]` (contract).
- **`atlas/types/index.ts`:** `EventLocation` named (type-only).
- **`songLibrary.ts`:** the song v2 fields.

**Edge kinds** (declared in A2; derived in C1/C2):

| Edge                                 | From → to                                    | Stated by                                                   | Phase                                                                          |
| ------------------------------------ | -------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `from_year`, `in_decade`, `from_era` | (built)                                      |                                                             | A (built); C1 adds events, labels, studios and releases as `from_year` sources |
| `about`                              | event → artist, song, release, studio, label | id fields (C2); else `title`/`tags[]` (dotted)              | C1                                                                             |
| `took_place_in`                      | event → place                                | `placeId` (C2); else `location.city` (dotted)               | C1                                                                             |
| `in_genre` (widened)                 | event → genre, subgenre                      | `genre[]` (`resolvedBy`)                                    | C1                                                                             |
| `scene_of`                           | place → genre, subgenre                      | `globe_city.genres[]` (`resolvedBy`)                        | C1                                                                             |
| `scene_active_in`                    | place → decade                               | `activeDecades[]`; own chip "Scene decades", off by default | C1                                                                             |
| `based_in` (dotted, "song pins")     | artist → place                               | the `artist_location` item's `city`                         | C1                                                                             |
| `typical_in`                         | instrument → genre                           | code (`instrumentGenres.ts`, owner-reviewed)                | C1                                                                             |
| `born_year`, `formed_year`           | artist → year                                | `born.date` (by `group`)                                    | C2                                                                             |
| `born_in`                            | artist → place                               | `born.placeId` (people only)                                | C2                                                                             |
| `active_in`                          | artist → decade                              | `activeFrom`…`activeTo` (or `asOfYear`)                     | C2                                                                             |

- `CODE_OWNERS` gains `instrumentGenres`.
- `EdgeCategory` gains "Scene decades" (off by default); `history` is relabelled "Events & influence".

### 4.2 Derivers (all pure)

- **`eventMatches.ts` (C1):**
  - `PARTICLES` and `leadingNames` move here, and `artists.ts` delegates. The characterization test lands first, so the globe stays byte-identical.
  - A name that is also a place or genre never matches on a tag alone; it matches only on a title phrase plus a tag, or through a stored id.
  - Songs match when a phrase equals a title of 4 characters or more **and** the song's artist is among the matches.
- **`edgesForEvent(event, match?)`:**
  - skips `song-` events;
  - year → `from_year`; place → `took_place_in`; `genre[]` → `in_genre`;
  - `about` from stored ids, else the matches.
- **Places and song pins:** `edgesForPlace` gains `scene_of` and `scene_active_in`. `edgesForArtistLocation` emits only when the artist has no `basedInPlaceId`.
- **`instrumentGenres.ts`:** the `typical_in` rows with `via.code`.
- **C2:** `edgesForArtist` gains `born_year`/`formed_year`, `born_in` and `active_in`. Song v2 sources:
  - `on_release` ← `releases[]`
  - `recorded_at` ← `session.studioId`
  - `released_on` ← `session.labelId` (only with no releases)
  - `recorded_in` ← `session.placeId`
  - `in_genre` ← `subgenreIds`
- **`egoNetwork`:** `stopAt` is built. `MindMapPage` composes `isHub(id) || solidDegree(id) > 60`. A degree hub as focus defaults to 1 hop, and `layoutEgo` labels a stopped hub "+N via X".
- **`places.ts`:** `countryKey = normalize(normCountry(x))`, which keeps accent and punctuation folding. `countryRegionOf` is added.

### 4.3 Graph size (repo snapshot; later rows are projections, re-measured at each checkpoint with the default filters)

| After                                             | Nodes                                | Edges (all / default filters)          | Orphans: no edges / guessed-only artists |
| ------------------------------------------------- | ------------------------------------ | -------------------------------------- | ---------------------------------------- |
| A (built)                                         | ≈4,050                               | ≈9,300                                 | 706 / ≈900 (re-measured at C1 start)     |
| C1                                                | ≈4,810 (+≈50 instruments)            | ≈18,100 / ≈16,300 (scene decades off)  | ≈130 / most of 907                       |
| B (Links page "sure matches" applied in the mock) | same                                 | same (637 `performed_by` become solid) | ≈130 / ≈540                              |
| E (Stage 1 sure-tier bulk, plus one-by-one work)  | ≈4,900 (+84 `pin:false`, +5 artists) | ≈18,300                                | ≈120 / measured                          |
| F2 (projection)                                   | ≈5,500–6,500                         | ≈25,000–30,000                         | <100                                     |

**How the edges after C1 break down:**

| Edge                     | Count                                    |
| ------------------------ | ---------------------------------------- |
| `from_year`              | 1,652                                    |
| `from_era`               | 178                                      |
| `in_decade`              | 178                                      |
| `in_genre`               | +2,330 (events), +524 (subgenre parents) |
| `took_place_in`          | ≈944                                     |
| `about`                  | ≈816 artists, 41–48 songs                |
| `scene_of`               | 676                                      |
| `scene_active_in`        | 1,794 (off by default)                   |
| `based_in` ("song pins") | ≈250                                     |
| `typical_in`             | ≈150–250 (depends on the reviewed table) |

**Walk honesty.** Past the focus only solid edges walk (`deriveGraph.ts:1036-1053`), and every artist-side C1 edge is dotted. So in C1:

- artist, event and place foci get denser at **hop 1**;
- hop 2 grows through Time, Genre and scenes;
- `place:detroit` at hop 2 is small until Stage 1 accepts.

Stage 1 accepts and the Links-page apply are what make hop 2 walk.

**Hubs.** Hop 1 is about 550 for `genre:rock` and about 210 for `decade:1970s` with scene decades on. `place:new-york` (≈130 edges) becomes a degree hub.

---

## 5. Population

### 5.1 Stage 1: derive (C1), then accept (E)

**Derived with no writes (C1):** event years, places, genres, artists and songs; city scenes and scene decades; song pins; instrument genres.

**Accepted into stored ids (E).** Pure planners in `src/content/linking/` produce `provider: 'app'` suggestions:

| Suggestion                  | Writes                    | Measured                                                                                                                                                                       | Bulk?                                                      |
| --------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Event artists               | `artistIds` (`evt-` only) | 688 events / 816 pairs; one-word names are "close"                                                                                                                             | Sure tier only; the rest one at a time                     |
| Event songs                 | `songIds`                 | 41–48 pairs                                                                                                                                                                    | Yes                                                        |
| Event place                 | `placeId`                 | ≈944 resolved; 139 listed (link by hand, or create a `pin:false` place from lat/lng)                                                                                           | Yes                                                        |
| City from `artist_location` | `basedInPlaceId`          | ≈250 resolve; 102 entries in 84 cities need `pin:false` places (`requires`); 5 missing artists (creating Chicago warns about the place collision); 3 joint billings; 2 dropped | **No**: likely tier until F1 corroborates; pin-move report |
| Progression songs           | `songIds`                 | 5 sure + 6 close                                                                                                                                                               | Sure only                                                  |
| Song years                  | `year`                    | **49** (the 22 placeholders excluded)                                                                                                                                          | No                                                         |

**Bulk accept** (`bulk/BulkAcceptDialog` on `useBulkWrite`) runs in this order:

1. a dry run with counts and the first diffs, listing items skipped for a pending proposal;
2. creates first (places → artists), with the C33 409 rule;
3. per item: re-read, check the precondition (the path still holds the value seen at review, or is empty), then save. A failed check is listed as a conflict;
4. progress and a Stop button;
5. one invalidation;
6. decisions appended with `method: bulk`.

**Pin moves.**

- The report runs for every City accept (Stage 1 and 2) and again in Publishing before an artist release. It lists each song pin that moves, and by how many km.
- In the mock, pins move when song events re-derive. Contract §5b proposes that the server re-derives the lead-act songs' events when an artist release changes `basedInPlaceId`, and the mock does the same at that publish.

**The mapping for Ryan.** It is built from the hometown decisions (accept, replace or drop) plus the owner's replacements. E ships a dry-run report. The committed `artistLocationMapping.json` lands in v5 once all 362 entries are decided, which is the contract's retirement condition.

**B's checkpoint** runs the existing Links page "Apply the sure matches" (370 names, 634 songs) on the mock. The working graph then shows 637 `performed_by` edges solid.

### 5.2 Stage 2: MusicBrainz and Wikidata (F1, F2)

**Script:** `src/scripts/enrichment/importSuggestions.ts`.

- Stages `cache | fetch | score | emit`, plus `--only`, `--limit` and `--dry-run`.
- **The cache pass runs first, offline**, from `_mb_cache.json`: song-billed artist MBIDs (+0.40 identity evidence) and album candidates for 637 songs.
- The unattended fetch starts as soon as the fetch stage exists: about 5,800 MusicBrainz requests (≈1.8 h), one at a time at least 1.1 s apart, with back-off on 503/429 and `Retry-After`, and resumable.
- Wikidata `wbgetentities`: batches of 50, `maxlag=5`, about 70 calls.
- `_cache/` is added to `.gitignore`. The inputs covered by `**/_*.json` are local-only, so their sha256 goes in the artifacts manifest.

**Field map:**

| Field                        | Source and rule                                                                                                                                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity                     | `externalIds.mbid` and `.wikidata`; every other suggestion depends on it                                                                                                                                          |
| Born                         | Person: MusicBrainz life-span begin + begin-area, or P569/P19. Group: P571 formed. Date precision is kept. P19 equal to the `artist_location` value is offered here                                               |
| City                         | MusicBrainz area of type City, P740 or P551; for a group, begin-area or P740. Agreement with `artist_location` upgrades that suggestion to sure. A different existing value is a conflict and never bulk-accepted |
| Genres                       | P136 through `genreMap`, top 3. MusicBrainz genres are a signal only (CC BY-NC-SA)                                                                                                                                |
| Years Active                 | Group life-span, or P2031/P2032; never a person's life-span                                                                                                                                                       |
| Instruments                  | P1303 and member-of attributes                                                                                                                                                                                    |
| Composers, Producer, Credits | Work and recording relationships → `credits[]`                                                                                                                                                                    |
| Album                        | The earliest official Album release group by the same artist credit                                                                                                                                               |
| Label                        | The release's `labelId`                                                                                                                                                                                           |
| Studio                       | `session.studioId` (display text filled when empty)                                                                                                                                                               |
| Year                         | Re-query the 65 `_year_misses.json` entries (several were HTTP 503) and the 22 placeholders; `_year_audit.json` rules for evidence                                                                                |

- **Created on accept (`requires`):**
  - releases, labels, studios;
  - `pin:false` places (P625);
  - people only per C30: billed performers, members, composers and producers, created `unverified` with an `mbid`;
  - other credits keep their name plus MBID in `source`.
- **Never imported:** `genreTags`, `key`, progressions, `bio`, display text.

**Matching.**

- Artist identity is scored as before: name +0.35 (alias +0.25), song credit +0.40, release title in their events +0.25, area +0.10, life-span +0.10, genre +0.05.
- Tiers: sure ≥0.85, likely 0.6–0.85.
- Ambiguous (runner-up within 0.15): one "pick the artist" row and no field suggestions.
- A one-word name is never sure without song evidence.
- **Calibration:** at F1 start the owner labels 100 artists, 20 of them one-word names (≈2–3 h). Sure-tier precision must be at least 98%, and the measured value goes in the manifest.
- **Corroboration:** agreement between the two sources is one suggestion with +0.1; competing values are both shown and neither is sure.

**Artifacts** (`src/scripts/enrichment/suggestions/*.json`, about 5–6 MB) are loaded only by the mock in `all` mode, through `?raw` plus `JSON.parse`.

**Review:**

- ghost chips; Accept, Reject or Replace in the panel;
- bulk (admin): sure tier, confidence at least 0.85 and never below 0.7, identity accepted, required records resolved, no pending proposal;
- rejections are remembered by id.

### 5.3 Durability of the owner's review

- **Every decision** (C11) is kept in the mock store and also downloaded as `src/scripts/enrichment/suggestions/decisions.json`. That file is committed and not `_`-prefixed.
- A banner shows "n decisions not yet downloaded".
- **Replay on load.** After persisted patches, the mock replays the committed accept and replace decisions through `apply.ts`:
  - only where the current value differs;
  - `requires` records are created create-only;
  - each replay is an admin save with a revision note naming the suggestion id and sources;
  - a conflict is listed and never forced.
- A seed change that makes patches stale therefore loses no accepted value.
- **Contract §10:** `decisions.json` together with the suggestion artifacts is the import payload `POST /suggestions/decisions` accepts.

---

## 6. Contract, mock, schema and test impact

**artifactsVersion 3 (end of C1).**

- **`refPaths.ts`:** the new flags and kind union.

  | Kind              | Path → target              | Flags                                     |
  | ----------------- | -------------------------- | ----------------------------------------- |
  | `globe_event`     | `title`, `tags[]` → artist | legacy, `alsoTargets: ['song']`           |
  | `globe_event`     | `location.city` → place    | legacy                                    |
  | `globe_event`     | `location.country` → place | legacy, `derive:false`                    |
  | `globe_event`     | `genre[]` → genre          | `resolvedBy`, `alsoTargets: ['subgenre']` |
  | `globe_city`      | `genres[]` → genre         | `resolvedBy`, `alsoTargets: ['subgenre']` |
  | `artist_location` | `city` → place             | legacy                                    |

- **Contract doc:**
  - the rule table gets a `resolvedBy` row: "no check; display text";
  - the per-path vocabulary list notes these paths "not checked";
  - a §5a note that years, decades, scenes, song pins and `typical_in` are client-side derivations.
- The manifest hash and version are updated; Amendment 5 is written.

**artifactsVersion 4 (written in C2, handed off at the end of E).**

1. **Generator:**
   - `@pattern` → `z.string().regex()`;
   - `unknown` → `z.unknown()` (for `suggestionSchema.ts`);
   - `WANTED` gains `ArtistBirth`, `EventLocation`, `HistoricalEvent` and `GlobeEventRecord`;
   - `songLibrary.ts` becomes a source for `Credit`;
   - the footer adds `globe_event`.
2. **Regenerate** `recordBodySchemas.ts` and `songBodySchema.ts` (v2); v1 stays frozen.
3. **REF_PATHS:**

   - `globe_event`: `artistIds[]`, `songIds[]`, `placeId`, `releaseIds[]`, `studioIds[]`, `labelIds[]`, and `credits[].artistGlobeId` → artist (`derive:false`);
   - `artist`: `born.placeId`;
   - `song`: `releases[].releaseId`, `session.studioId`, `session.labelId`, `session.placeId` (`minSongSchema: 2`), and `subgenreIds[]` → subgenre (vocab, `minSongSchema: 2`).

   The test's `NOT_REFERENCES` gains `videoId`.

4. **Contract §5b:**
   - the `globe_event` v2 body;
   - `placeId` means the recording place on `song-` events and the event's own place on `evt-` events;
   - `[]` is preserved on `evt-` events and never emitted on `song-` events;
   - `credits` use the latest `Credit`, a superset of v1 (line 717 is updated);
   - `placeId` never moves a pin, and re-derivation happens on an artist release (proposed);
   - `artist.born` and the song v2 field list;
   - per-path vocabulary rows (`song subgenreIds[]` → `subgenres[].id`);
   - an export `revision` field (requested).
5. **`suggestionSchema.ts`** is generated from `src/content/suggestions/types.ts`, including the decision shape.

**artifactsVersion 5 (F2, or when complete):** `artistLocationMapping.json` and contract §10: `GET /suggestions`, `POST /suggestions/decisions`, admin `POST /suggestions/import`, stable ids, `features.suggestions`, and optional `GET /items/lookup?externalId=`.

**Mock.**

- **C2:**
  - `schemaVersionOf`: `globe_event` → 2 and `song` → 2 in `all` mode;
  - `validation.schemaFor` uses the latest song schema and `recordBodySchemas.globe_event`;
  - `deriveEventBody` copies the v2 ids;
  - `DERIVED_V1_FIELDS` gains `releaseIds`, `studioIds`, `labelIds` and `placeId`.
- **E:**
  - the `/suggestions` endpoints and the decisions store;
  - decision replay (`mock/decisions.ts`);
  - `features.suggestions: true`;
  - re-deriving lead-act song events on an artist release;
  - the Stage-1 budget test.
- **F1:**
  - `seed.ts` loads the artifacts;
  - `persist.ts` → IndexedDB (`ma-console-mock-db`), with a one-time migration and a flush on `visibilitychange`/`pagehide`.
- Seed totals are unchanged.

**Tests that move.**

- **`refPaths.test.ts`:**
  - `DERIVED_KINDS`, `ENTITY_OF` and `kindOf` gain `globe_event` and `artist_location`;
  - "only targets kinds the graph knows" also checks `alsoTargets`;
  - `BUCKETED_VALUES` gains `event:year`, `place:activeDecades[]`, `label:foundedYear`, `studio:openedYear` (C1), and `artist:born.date`, `artist:activeFrom` (C2);
  - `CODE_OWNED_PATHS` gains `instrument:typical_in`;
  - fixtures: a linked and an unlinked `evt-` event with `eventMatches`, an `artist_location` item, a person and a group with born and active years, and `asOfYear`.
- **`deriveGraph.test.ts`:**
  - `scene_of` is 676, `took_place_in` ≈944, and every `evt-` event has a year edge;
  - bounds become 3k–12k nodes and 12k–60k edges;
  - missing stays the 4 ids;
  - new units: stored beats inferred, `[]` suppresses, `song-` events are skipped, a colliding tag does not match, an unresolved city gives no edge, `basedInPlaceId` suppresses a song pin, the degree hub.
- **`integrity.test.ts`:**
  - `CONTENT_KINDS` covers `globe_event` (`evt-` only) and `artist_location`;
  - event guesses are counted from `eventMatches` (an event with no match states nothing), and `resolvedBy` paths count as linked;
  - rows: event `placeId` against its city (`evt-` only), `artist_location` against `basedInPlaceId`, a group with `born.placeId`, birth and active-year sanity.
- **Other graph and model tests:**
  - `purity.test.ts`: `eventMatches`, `instrumentGenres`, `workingSnapshot`, `table/model/*`, `tableIds`, `content/linking/*`, `content/suggestions/*`;
  - `layoutEgo.test.ts`: the "+N via" hub label;
  - `categories.test`: the owner's columns verbatim, and the proposed ones as in `PLANNED_COLUMNS`.
- **Schema and data tests:**
  - `recordBodySchemas.test.ts`: 1,723 events validate, and `born` rejects `1939-4-2`;
  - places: `resolvePlaceName('Oslo','NO')` resolves and accents still fold;
  - `artistIndex.characterization.test.ts` lands first.
- **Mock and capability tests:**
  - `contentMockServer.test.ts:237-242`: song `schemaVersion` is 2 in `all` mode;
  - `useCapabilities.test.tsx:89`, with `ContentFeature` gaining `suggestions`;
  - `persist.test` Stage-1 scenario (the Links write, 634 songs plus events, revisions, 3 snapshots);
  - a decisions-replay test (a seed change, then the accepts are re-applied).
- **Routing tests:** `createRouteDefinition` drops `undefined`; `Sidebar.test.tsx` as built.

---

## 7. Phases, checkpoints and estimates (one developer, in sequence)

| Phase                                        | Work                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Days                                                   | What the owner sees                                                                                                                                                                                                                                                  | Verification                                                                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Time and readability**                  | Built                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 0                                                      | Year, decade and era chains; hub-stop; kind split                                                                                                                                                                                                                    | Done                                                                                                                                          |
| **A2. Remaining kinds and hubs**             | Declare the edge kinds in §4.1 and the "Scene decades" category (off); degree hub stop and "+N via" label; tests                                                                                                                                                                                                                                                                                                                                                                                                          | 1                                                      | Big nodes show "+N via X"                                                                                                                                                                                                                                            | Unit tests; browser at `focus=genre:rock`                                                                                                     |
| **C1. Derive events, places, song pins; v3** | Characterization test → `eventMatches` (collision sets) → `artists.ts` delegates; `countryKey` fix; the `resolvedBy`/`alsoTargets`/kind-union changes; the event, place, `artist_location` and `typical_in` derivers; label/studio/release `from_year`; loader (full events, matches, `artist_location`, `asOfYear`; `loadEventArtists` deleted); integrity kinds and rows; REF_PATHS and tests; manifest v3; contract notes; Amendment 5                                                                                 | 4                                                      | Events joined to artists, songs, cities, genres and years; cities to scenes; artists to song pins (dotted); instruments to genres. Hop 1 is dense; hop 2 grows through Time and Genre. ≈4,810 / 18,100 (≈16,300 at default filters); no-edge orphans ≈130            | Full vitest run; globe characterization unchanged; browser at `artist:marvin-gaye`, `place:detroit`, `event:<evt>`; counts reported both ways |
| **B. Table, read-only**                      | Working graph **first** (`useContentExport`, `loadRepoSources`, `mergeSnapshot`, `useWorkingGraph`, body-hash fingerprint; working mode for the map and Integrity) (1.5); `tableIds.ts` split, query fix, Changes link (0.25); model registry for 13 views with rollup provenance, keys and query (2.5); virtual grid, cells, toolbar, coverage strip and notes, URL state, keyboard and ARIA (2); read-only panel, "Open in Table" (1); `records/:kind` redirects, "Other records", MirrorBar (0.5); browser pass (0.25) | 8                                                      | Every category filled from the working graph. Run the Links page "Apply the sure matches": 637 edges turn solid and artist maps walk to hop 2. Coverage, e.g. "City 0/907 · song pins ≈250"                                                                          | `categories.test`; perf ≤60 ms; `VirtualTable.test`; browser as admin and editor; `verify:prod:scan`                                          |
| **C2. Stored fields and song v2**            | `ArtistBirth`, `GlobeEventRecord`, `EventLocation`, song v2 types; generator (`@pattern`, `unknown`); regenerate; REF_PATHS (+`videoId`, `credits[].artistGlobeId`); born/active and song-v2 derivers; mock schema versions and `DERIVED_V1_FIELDS`; §5b                                                                                                                                                                                                                                                                  | 3.5                                                    | No visible change (the fields are empty); writes are now valid                                                                                                                                                                                                       | Schema, REF_PATHS and mock tests                                                                                                              |
| **E. Review and accept (Stage 1); v4**       | Suggestion types, status, `apply.ts`; planners; `useItemSession` and `bodyPaths`; field widgets for the Artist and Event owner columns; `recordBodies.ts`; `useSuggestions`; ghost cells; Suggestions section; `useBulkWrite` and `BulkAcceptDialog` (pending-skip, re-read, 409 rule, pin-move report); mock endpoints, decisions store, replay and download; re-derive on artist release; bulk-review filter and "Mark reviewed"; mapping dry run; `suggestionSchema.ts`; Stage-1 budget test; manifest v4              | 7                                                      | Bulk-accept ≈944 event places, sure event artists and songs, and 5 progression links. One at a time: 49 song years (≈30 min) and City rows (≈250, or wait for F1). Edit Born, City, Genres, Years Active, Instruments and event artists directly. Dotted turns solid | Planner tests pinned to 688/816, 944/139, 49, and the hometown numbers; one invalidation per bulk; replay after a simulated seed change       |
| **F1. Importer: artists**                    | Cache pass; clients, cache, CLI, `.gitignore` (2); identity scoring, area → place, artist fields, corroboration with `artist_location` (3); emit and seed (1); IndexedDB (1)                                                                                                                                                                                                                                                                                                                                              | 7 (+ owner labelling ≈2–3 h; +≈1.8 h unattended fetch) | Identity rows, then Born, City, Years Active, Genres and Instruments suggestions; hometowns upgraded to sure where sources agree                                                                                                                                     | Precision ≥98% on the 100 labelled artists; `persist.test`                                                                                    |
| **F2. Importer: songs and records; v5**      | Recordings → release groups → releases, works → credits, releases, labels, studios, year re-query (3); conflict UI, `requires` chains, reject memory (1.5); calibration and gaps (1.5); contract §10 and the mapping table when complete (0.5)                                                                                                                                                                                                                                                                            | 6.5 (+ owner review ≈6–10 h)                           | Albums, Labels, Studios, Producers, Composers and Credits; accepting creates the records                                                                                                                                                                             | Seed count pinned to the manifest; Marvin Gaye's Born and one album survive a reload and a replay                                             |
| **D. Hand editors and Link**                 | `recordEditors/*` plus KindSpecs (1f); song panel v2 pickers; New flows; review banner; `ConfirmConnectionDialog` with Link… in one-hop derived cells; Label via release; multi-kind `EntityMultiPicker`; "Full editor ↗" removed per complete kind                                                                                                                                                                                                                                                                      | 4.5                                                    | Create records, studios, labels and places by hand; link from any derived cell                                                                                                                                                                                       | `TableDetailPanel.test`; mock scenario §8.1                                                                                                   |

**Totals:**

- about **41.5 dev-days**, plus 1 day of Worker contingency;
- A2 through E is about 23.5 days;
- machine time (the fetch) and owner time (labelling, review) run beside the developer, not as parallel dev work.

**Optional (G):** a "suggested edges" overlay on the map, off by default (0.5 days); the globe's artist chips reading stored `artistIds` (an owner decision, student-visible).

---

## 8. Verification and risks

### 8.1 Verification

**Static checks:** `npx tsc -b`, `npx eslint <changed> --max-warnings 0`, `npx prettier --check`, `npx vitest run` (the known `_generated_index.ts:648` failure is not a regression).

**Browser (mock):** run `VITE_DEV_AUTH_BYPASS=1 VITE_DEV_AUTH_BYPASS_ROLE=admin VITE_CONTENT_MOCK=1 ./node_modules/.bin/vite --port 5199 --strictPort`, then:

1. Open `/console/table`: every category, search, sort, filters, a deep link to `/console/table/events/<evt-id>`, Back closes the panel, 1,083 rows scroll smoothly.
2. As **editor**, set Marvin Gaye's City to Detroit (his song pins say Washington, his birthplace) and Born to 1939-04-02 · Washington.
   - The row shows Pending, and the map shows the draft edges.
   - A second revision of the proposal also shows (fingerprint).
3. As **admin**, approve it. The pin-move report lists his songs moving from Washington to Detroit, and Detroit's Artists count rises.
4. Bulk-accept event places: one refetch, pending-proposal items are skipped and listed, and the result survives a reload.
5. Confirm a guessed event artist from the Artist panel. The dialog shows the full `artistIds` set.
6. Download `decisions.json`, reset the mock, reload: the accepts are replayed.
7. (F) Accept an import suggestion that creates a release.
8. With `VITE_CONTENT_MOCK_KINDS=legacy`: repo mode, read-only.
9. As `ROLE=student`: `/songs/africa` and `/atlas/globe` are unchanged.

**Bundle:**

- `npm run build && npm run verify:prod:scan`.
- `eagerBoundary.test.ts` makes `kinds.ts`, `deriveGraph`, `table/model/*`, `entityKinds`, `react-window` and `recordEditors/*` throw on import, and checks that `Sidebar`, `MirrorBar`, `tablePaths`, `tableIds` and `AdminPages` still load.
- `FORBIDDEN` gains only DEV-only strings: `ma-console-mock-db` and the suggestion artifacts' marker. It does **not** gain the Table columns key, which ships in the production console chunk.

### 8.2 Risks

1. **Wrong-artist matches** (the main harm). Mitigations:
   - "close" grading for one-word names;
   - collision sets in `eventMatches`, and a warning when creating a colliding name;
   - song evidence required for sure;
   - identity rows for ambiguous artists;
   - measured precision;
   - a 409 reuses a record only on the same `mbid`.
2. **The owner's review work being lost:** mitigated by the committed decisions log and replay (§5.3). Production shows nothing new until the backend lands (Q10 is still open).
3. **Content reaching students on publish:** pins move (report on every City accept and before an artist release), years appear on song pages (one at a time, placeholders excluded), bulk facts (the "not reviewed" filter and a Publishing count).
4. **Semantics of `artist_location`:** it is where songs are pinned, not the scene. Its City suggestions are "likely", and P19 matches go to Born.
5. **Graph build time:** the fingerprint, `keepPreviousData`, the Worker.
6. **Hub clutter:** kind and degree stops, "+N via", and scene decades off.
7. **Server lag:** everything runs on the mock; production shows the repo Table.
8. **Mock storage:** the budget test, IndexedDB and flush on hide.
9. **Licensing:** MusicBrainz core data is CC0; its genres are signals only; no Wikipedia text; become a MetaBrainz supporter.
10. **Registry growth:** limited per C30, created unverified, with a Credited people view.
11. **Refetch storm on save:** the fingerprint; `setQueryData` as the fallback.
12. **Globe and graph disagreeing on event artists** once `artistIds` is stored (the globe still reads tags): an owner decision (G).

### 8.3 Owner decisions to confirm

1. Event and city genres drawn solid (a one-line change to dotted).
2. A song's era only through its year (built).
3. City scene decades: recommended off by default, as their own chip.
4. Review `instrumentGenres.ts` (`typical_in`). Confirmed correct by the owner (30 Sep 2026), unchanged.
5. Map the progression style `gospel` to the gospel subgenre? Yes (30 Sep 2026): mapped, and `chord_progression.styles[]` may now name a subgenre (`alsoTargets: ['subgenre']`).
6. Become a MetaBrainz supporter.
7. Accept City changes knowing song pins move after publish.
8. `artist_location` is where songs are pinned (e.g. Marvin Gaye → Washington). Accept it as City row by row, or wait for MusicBrainz/Wikidata agreement?
9. Later: should the globe's artist chips read stored `artistIds`?
10. Budget about 2–3 h to label 100 calibration artists and 6–10 h for the F2 review.

---

## Files to create or modify

**Create:**

- **Graph modules:**
  - src/content/graph/eventMatches.ts
  - src/content/graph/instrumentGenres.ts
- **Suggestions and planners:**
  - src/content/suggestions/{types,status,apply,decisions}.ts
  - src/content/linking/{eventArtists,eventPlaces,eventSongs,hometowns,progressionSongs,songYears}.ts
- **Table** (src/features/admin/table/):
  - tableIds.ts, TableView.tsx
  - toolbar/_, grid/_
  - model/{types,edges,categories,fields,aggregate,keys,buildTableModel,query}.ts
  - data/{useTableModel,useTableUrlState,useVisibleColumns,useSuggestions}.ts
  - panel/\*, bulk/{BulkAcceptDialog.tsx,useBulkWrite.ts}
- **Content area:**
  - src/features/admin/content/recordEditors/{ArtistFields,ReleaseFields,StudioFields,LabelFields,PlaceFields,ProgressionFields}.tsx
  - src/features/admin/content/itemEditor/useItemSession.ts
  - src/features/admin/content/bodyPaths.ts
  - src/features/admin/content/entities/recordBodies.ts
  - src/features/admin/content/graph/{workingSnapshot.ts,useWorkingGraph.ts}
  - src/features/admin/content/mock/decisions.ts
  - src/hooks/data/admin/useContentExport.ts
- **Importer:**
  - src/scripts/enrichment/importSuggestions.ts
  - src/scripts/enrichment/{sources,match,map}/\*
  - src/scripts/enrichment/suggestions/{manifest,artist,song,records,matches,decisions}.json
- **Contract artifacts:**
  - src/scripts/apiContract/{suggestionSchema.ts,artistLocationMapping.json}
- **Tests:**
  - src/components/atlas/data/**tests**/artistIndex.characterization.test.ts

**Modify:**

- **Graph:**
  - src/content/graph/{types,deriveGraph,deriveEdges,integrity,places}.ts
  - src/features/admin/content/graph/{graphVocabulary,layoutEgo,repoSnapshot,useAtlasGraph}.ts, MindMapPage.tsx, IntegrityPage.tsx, LegacyLinkPage.tsx
- **Types:**
  - src/content/records/types.ts
  - src/components/atlas/types/index.ts
  - src/curriculum/types/songLibrary.ts
  - src/components/atlas/data/artists.ts
- **Contract artifacts:**
  - src/scripts/apiContract/{refPaths.ts,manifest.json,recordBodySchemas.ts,songBodySchema.ts,generateSongSchema.ts,generateRecordSchema.ts}
  - src/scripts/apiContract/**tests**/refPaths.test.ts
- **Mock:**
  - src/features/admin/content/mock/{mockKinds,validation,contentMockServer,seed,persist,handleMockRequest}.ts
  - the tests contentMockServer.test.ts and persist.test.ts
- **Table shell:**
  - src/features/admin/table/{tablePaths.ts,TablePage.tsx,TableLayout.tsx,TableBar.tsx}
  - src/features/admin/table/**tests**/eagerBoundary.test.ts
- **Routes, nav and editors:**
  - src/util/createRouteDefinition.ts
  - src/features/admin/AdminPages.tsx
  - src/features/admin/content/{AdminContentListPage.tsx,kinds.ts}
  - src/features/admin/content/mirror/MirrorBar.tsx
  - src/features/admin/content/itemEditor/useContentItemEditor.ts
  - src/features/admin/content/entities/{EntityMultiPicker.tsx,useEntityIndex.ts,CreateEntityDialog.tsx}
  - src/features/admin/content/songEditor/ConnectionsPanel.tsx
  - src/features/admin/content/publishing/{reviewHref,kindLabels}.ts
  - src/hooks/data/admin/useCapabilities.ts (and its test)
- **Build and docs:**
  - scripts/verifyProdBundle.mjs
  - .gitignore
  - docs/console-content-api-contract.md
  - docs/console-content-graph-design.md

### Critical Files for Implementation

- src/content/graph/deriveGraph.ts
- src/scripts/apiContract/refPaths.ts
- src/features/admin/content/graph/repoSnapshot.ts
- src/features/admin/content/mock/contentMockServer.ts
- src/content/records/types.ts

---

## Review disposition

F = the feasibility review, I = the intent review. I checked the load-bearing claims against the working tree before deciding.

**Accepted as written:**

- **Feasibility:** F1, F3, F5–F11, F13, F15–F28.
  - Checked: `verifyProdBundle` scans every chunk; `videoId` matches `/(Id|Ids|GlobeId)$/`; `buildGlobeData.mjs:211` uses `year || 2000` (22 of 71 yearless songs); a proposal does not bump `updatedAt`; `new URLSearchParams({q: undefined})` prints `q=undefined`.
- **Intent:** I2, I5, I7, I8, I10, I11, I13–I17.
  - Checked: `artistLocations.json` has Marvin Gaye → Washington and Madonna → Detroit; `PLANNED_COLUMNS` has the Year order.

**Accepted with changes:**

- **F2:** taken as a new flag, `resolvedBy: 'genreTag'`.
- **F4:** re-baselined. Phase A shrinks to A2 (1 day) and the B shell work is dropped; the time saved goes to the new work.
- **F12:** taken as its first option, an honest checkpoint measured with the default filters plus earlier solidifying. No new `resolved` walk flag.
- **F14:** uses `alsoTargets` rather than `targets`, so existing consumers of `target` do not break.
- **I1:** all decisions are logged, replayed and used as Ryan's payload, and §1 now states the mock-only limit.
- **I4:** the degree stop and "+N via" label are accepted.
- **I6:** the new order, the cache pass, the early fetch and the owner's labelling hours are accepted.
- **I9:** the bulk log, the filter, "Mark reviewed" and writing `source` are accepted.
- **I12:** billed performers and group members also get records, not only composers and producers.

**Rejected:**

- **I3, "treat an exact `resolvePlaceName` match as vocab/solid":** it is a name lookup, and the same lookup on song `session.city` is already drawn dotted (`deriveEdges.ts:179-180`). `vocab` would also make the API reject saves (F2).
- **I4, "ship hub-stop with C, not ahead" and "make Walk through hubs visible":** moot. Both are already built, and the toggle is visible (`MindMapPage.tsx:211-215`).
- **I6, "read-only ghost chips in B":** there are no imported suggestions before F1, so this would be a second rendering path with nothing to show.
- **I9, "bulk accepts write `unverified: true`":** it contradicts C9 and the owner's "reviews and accepts", and would show accepted facts muted to students. The log and Publishing count cover the need.
