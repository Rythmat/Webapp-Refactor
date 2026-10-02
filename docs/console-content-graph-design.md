# Console content as a WYSIWYG app mirror, plus the Atlas metadata graph

Design reference for the `/console/content` rebuild. Approved by the owner on
29 September 2026. It is the reviewed output of a design panel: three competing
designs, three judges, a synthesis, three adversarial reviews (36 objections,
all dispositioned at the end of this file) and a final revision. The working
plan that sequences it is summarised in §5; the API half is
`docs/console-content-api-contract.md` (drafted at checkpoint 1a).

## Amendments after approval (29 September 2026) — these override the text below

1. **App-wide restyle instead of a mirror exemption.** Asked whether mirrored
   pages should look like the app or the console, the owner chose to change the
   app: the student app adopts the console/landing look — Glacial Indifference
   everywhere and no brand yellow (white pill primary). The mirror therefore
   needs no `.console-mirror` exemption. This is its own student-visible phase
   ("0b"): promote the `--ui-*` landing values from `html.console-theme` to
   `:root`; map Tailwind `fontFamily.sans/serif/mono` to Glacial and remove the
   inline serif/monospace families; exempt SMuFL music-glyph fonts (Bravura via
   VexFlow in `src/components/notation/*` and the DAW Score view — a blanket
   `!important` would break notation); keep semantic yellows (warnings, gold
   awards/stars, musical key colours) and strip brand-accent yellow, from an
   inventory the owner signs off first. Wherever §2, §5 or §7 below mention the
   exemption or "Q1", read this instead.
2. **Artist-level influence is an editable record field.** The owner approved
   `ArtistRecord.influencedBy: ({ artistId: string } & RefMeta)[]`, deriving
   `influenced` edges artist → artist. This amends the handoff's "influence
   lives only in `eventConnections.ts`" for artist-level influence; event arcs
   stay code-owned and are still read. Integrity reports overlaps between the
   two. It ships in slice 1 (types in 1a, deriver in 1d, editor in 1f), not
   Phase 6.
3. **Teach scope** (as in §1): canonical curriculum editable; published teacher
   decks read-only, usage signals only.
4. **The console is the app, plus Users and Telemetry** (owner, 29 Sep 2026:
   "I want the admin console to mirror the app, with the addition of having a
   section for Users and Telemetry"). Plan:
   `~/.claude/plans/review-console-i-want-wondrous-tiger.md`; built here as
   checkpoint 1b.0, before the rest of 1b.
   - The console's only sidebar is the app's own `ClassroomSidebar`, pointed
     at the console: Home, Learn, Studio, Globe, Arcade, Search, Classroom,
     Office, then Users and Telemetry for admins below a divider. There is no
     console rail and no second sidebar inside the mirror; the mirror bar has
     no segment pills and there is no "Teach" segment. Classroom and Office
     are separate items, as in the app; together they are what §1 calls
     Teach.
   - Admins land on Users; editors on the mirrored Home.
   - Publishing and Import songs join the content area:
     `/console/content/publishing[/history|/import]`. The vocabulary moves to
     `/console/content/records/vocabulary`. The old `/console/releases`,
     `/console/import-songs` and `/console/vocabulary` redirect, keeping their
     query.
   - `/teach` becomes `/office`; old `/teach` links redirect.
   - Step 2 (Publishing's tabs, "Changes (n)", "Publish everything that
     changed") is built; see below.
     Wherever §3.1, §5 or §7 below describe the console rail, segment pills, a
     Teach segment or the sidebar's Vocabulary link, read this instead.
5. **The Atlas Table, and a mind map that shows how connected the Atlas
   is** (owner, 29 Sep 2026). The mind map needs far more data points, and
   the Table becomes its own sidebar section with ten categories. The full
   file-level design (three design lenses, a synthesis, two adversarial
   reviews and a revision) is
   [`console-content-atlas-table-design.md`](console-content-atlas-table-design.md),
   copied into the repo at C1: the columns, the data model, the population
   stages, the contract and test impact, and the C1–C33 conflict table the
   later phases build on. It takes over checkpoints 1f and 1h.

   - **The ten categories.** The owner listed the columns of five: Artist
     (Artist Name, Born, City, Genres, Years Active, Songs, Events,
     Instruments), Songs (Composers, Year, Album, Label, Studio, Credits,
     Producer, Genre, Key, Chord Progression, Events), Genre (Artists, Songs,
     Year, Location, Instruments), Location (Artists, Songs, Genre,
     Instruments) and Events (Artists, Songs, Genre). Instruments, Recording,
     Key, Chord Progression and Year show the proposed columns he has seen.
     Recording is three views (Records, Studios, Labels) and Year two (years,
     and decades grouping them), so there are 13 tables.
   - **How it stays one picture.** A Table row is a graph node joined with
     its stored item, and a column is a walk over the graph, so the Table
     and the mind map cannot disagree. Each fact has one owner (an artist's
     Songs and Events are computed; **Link…** writes the item that owns the
     field), and one data hook, `useWorkingGraph`, feeds the Table, the map
     and Integrity.
   - **Filling the data, in three stages.** First derive what the app already
     has and never drew (C1). Then accept the sure derivations into stored
     ids, in the Table (E). Then import MusicBrainz and Wikidata as
     suggestions, reviewed and accepted in the Table (F1, F2). Suggestions
     are never body fields: accepting one is a normal save, and every
     decision goes into a committed `decisions.json` that the mock replays
     and Ryan imports.
   - **The owner's answers.** Derive first, import second; he becomes a
     MetaBrainz supporter and gives about 2–3 h to hand-check 100 artists
     for calibration and 6–10 h to review. Recording has three views. Year
     has a node per year, grouped by decade. Born is a date plus a
     birthplace; City is the hometown or the scene; for a band, Born is the
     year it formed and City where it formed. The globe's song-pin cities
     (`artist_location`) are guesses until he accepts one or the sources
     agree. Event and city genre names are drawn solid, through the curated
     genre table (`resolvedBy`).
   - **The phases**, in order:

     - **A2** (built): the remaining edge kinds declared; a node with more
       than 60 solid edges is a hub too, and a stopped hub shows "+N via X".
     - **C1** (built; contract v3): events tied to their artists, songs,
       city, genres and year; cities to their scenes; artists to their song
       pins; instruments to genres. See the as-built record below.
     - **B** (built): the Table, read-only: the working graph, the 13 views
       with the exact columns, a virtualized grid, filters, coverage and a
       read-only row panel; `records/:kind` redirects into it.
     - **C2** (built): the stored fields (song v2, event body v2, artist
       `born`), saveable but empty.
     - **E** (built; contract v4, still a draft): review and accept Stage 1
       in the Table: bulk accepts with a dry run, the decisions log and
       replay, and editing Born, City, Genres, Years Active, Instruments and
       an event's links.
     - **F1** (built; on 30 Sep 2026 the owner chose a bulk import over
       labelling the calibration sheet): the importer for artists (Born,
       City, Years Active, Genres, Instruments), with identity scoring held
       to 98% precision on the owner's 100 artists.
     - **F2** (built; no song calibration yet): the importer for songs and
       records (Album, Label, Studio, Producer, Composers, Credits). Its rows
       are in the version 4 draft's `suggestionSchema.ts`, so no version 5
       yet.
     - **D** (built): hand editors for every record kind, and **Link…** from
       any derived cell.

     The owner reviews after C1, B, E and F2. What each built, measured, is
     in the as-built records below; what is left is at the end of them, in
     [Open after Amendment 5](#open-after-amendment-5-30-september-2026).

6. **The bulk import** (30 Sep 2026): see
   [Amendment 6](#amendment-6-import-done-30-september-2026).
7. **Cortex, the Obsidian-style Mind Map** (1 Oct 2026). The Mind Map draws
   the whole Atlas as a force graph that looks and works like Obsidian's,
   the Table section and the map are renamed Cortex, and a click opens a
   row beside the graph. It reverses decision 12 ("no new dependency") and
   replaces the ring map of §3.5; see
   [Amendment 7](#amendment-7-cortex-the-obsidian-style-mind-map-1-october-2026).

### Phase 0 as built

- `src/content/graph/slugs.ts`, `ids.ts`, `places.ts`; `types.ts` and
  `deriveEdges.ts` fixed (bugs 1–6 in §4); `REF_PATHS`; frozen
  `songBodySchema.v1.ts` + `manifest.json`; bug 7; the five junk registry
  artists deleted (907 remain) with a guard test.
- The `technique` slug rule (snake_case, pass-through) lands with the
  `technique` entity kind in Phase 4, not in Phase 0: there is no technique
  node yet, so a pattern for it would guard nothing.
- The three characterization suites are one file,
  `src/components/songLibrary/__tests__/studentPath.characterization.test.tsx`
  (song page header snapshots + chart hashes for africa/something/dreams;
  credits snapshots; song-list hash).
- Session-derived place edges go through `placeSlugFor` (`places.ts`): the
  `CITIES` id when city + country pick out exactly one city; otherwise a slug
  that can never equal a registered id (`london-canada`, `portland-unplaced`) —
  a refused name must not fall back onto another registered city. All session
  edges are `inferred`.
- `buildFacetIndex` also files edges that point AT a song (an artist covering
  it), since `covers` now runs artist → song for `relation: 'cover'`.
- The `catalog_meta` slug pattern is deferred with the kind (Phases 4–5), like
  `technique`. No server regexes are generated yet; that waits for 1a.
- `REF_PATHS` as built: `kind` is the content kind (`song`,
  `chord_progression`); `legacy: true` flags a free-text path (the id path it
  pairs with is named in its `note` until the 1g linker needs a machine-readable
  `linksTo`); `target` may be a planned kind (`technique`, `theory_topic`,
  `studio_template`); region/country values target `place`. Its test checks
  both directions: every derived edge names a declared path, and every path
  declared as derived produces edges.
- `isContentKind` checks own keys only (it accepted `constructor`).
- The characterization snapshots renumber React/Radix `useId` values per render,
  so they do not depend on test order.
- An adversarial review of Phase 0 (15 agents) confirmed 11 findings, all fixed
  as above; one (the `song-valerie_bbc_live_version` event with no song record)
  was refuted for this change and is left to integrity (1d) to surface.

### Checkpoint 1a as built

- `src/content/records/types.ts`: `ArtistRecord` (with `members`,
  `influencedBy`, `externalIds` as named interfaces rather than intersections,
  so the schema generator can read them), `ReleaseRecord` + `ReleaseFormat`,
  `StudioRecord`, `LabelRecord`, `PlaceRecord extends City`.
- `generateSongSchema.ts` gained `generateBodySchema` (multi-file, one
  `extends` of a known interface); `generateRecordSchema.ts` emits
  `recordBodySchemas.ts`. The song schema output is unchanged.
- `REF_PATHS` covers the record kinds, with `acyclic` on `members[].artistId`
  and `parentLabelId`; its test walks every body schema. The reverse
  "declared-derived paths produce edges" check is limited to song and
  progression until the record derivers land at 1d.
- `vocabulary.generated.json` and `slugPatterns.generated.json` (identity and
  pattern per content kind) are generated with drift tests; `slugs.ts` joins
  the manifest as a copy-as-is artifact. `manifest.json` is at
  `artifactsVersion` 2 with a hash per file and a test enforcing it.
- `docs/console-content-api-contract.md` was drafted, reviewed as the
  implementer and against the code (27 findings, all accepted), and is linked
  from `docs/phase-2-api-handoff.md`.
- Owner decision after 0b: the song chord chart keeps its serif notation
  (`ChordChart.tsx` restored). The console mirror must exempt it from
  `console.css`'s `!important` Glacial rule to stay WYSIWYG.

### Checkpoint 1c as built (built before 1b, by owner direction: frontend first)

- `mirror/MirrorRouter.tsx` as designed (four context resets, key and state
  carried); `mirrorPaths.ts` pure; 20 tests pin link, relative link,
  search-param, programmatic, redirect, back, key and not-mirrored behaviour.
- `MirrorRoutes.tsx` reuses the app's route factories' `children`
  (`learnPages`, `songsPages`, `curriculumPages`, `atlasPages`, `studioPages`,
  `gamesPages`) rather than listing pages, so new app routes appear in the
  mirror automatically. Exceptions: Learn index → `LearnMirror` (settles a
  tab, never mounts Learn Home); set lists, the Studio editor and every game
  → `NotMirroredYet`; Home → `HomeMirror` (real content sections,
  `PerStudentPlaceholder` for per-student ones); `/teach` → `TeachMirror`
  (canonical year → `seededDayFromStub` → the real `DeckPreview`).
- `ConsoleMirrorShell` renders the real `ClassroomSidebar` and a TopRail
  placeholder inside a `.console-mirror` frame; `console.css`'s Glacial rule
  now skips `.console-mirror` descendants, so the chart's serif shows as in
  the app. `PremiumPreviewContext` (read by `useIsPremium`) previews as a
  premium student.
- Routes: `/console/content` → `learn?tab=Songs`; tables at
  `records/:kind[/:id]`; the six legacy kind URLs redirect keeping `?q`;
  `ProtectedPage` sends a console user's hard-loaded app URL to its mirror.
- Verified in a browser as admin (Learn, song page, Home, curriculum, Globe,
  Studio, Arcade, Teach, records, legacy redirect, hard-load backstop): no
  page errors; only 401s from the offline backend.

### Checkpoint 1b.0 as built (Amendment 4: the console's navigation)

- `ClassroomSidebar` gained console-only props — `lens` (`hrefFor`,
  `activeAppPath`), `showAllSections`, `extraSection`, `footer` — and renders
  exactly as before without them: student and teacher snapshots were taken
  before the change (`__tests__/ClassroomSidebar.test.tsx`).
  `SidebarMainNavItem` takes an explicit `active`, because in the console
  "current" means the app section showing, not the console path.
- `Sidebar.tsx` is now that sidebar: `lens={{hrefFor: toConsolePath,
activeAppPath: useConsoleAppPath()}}`, Users and Telemetry for admins,
  `UserWidget` (log out) as the footer. `consoleAppPath` maps a records table
  to the section its kind lives in (`segmentForKind`) and the lesson editor
  to Learn; Publishing, the vocabulary and Users highlight no app section.
- `DashboardLayout` is the sidebar plus a bare `<main>`; pages that want the
  old padding sit in `ConsolePage`. `ConsoleMirrorShell` is only the frame
  now: no sidebar, no TopRail placeholder. `MirrorBar` takes the TopRail's
  h-14 slot: Page | Table, the page's edit action, a Records menu (Records,
  Vocabulary, Import songs) and Publishing (admin).
- `ContentAreaLayout` wraps everything under `/console/content` with the bar.
  (The single `UnsavedChangesGuard` moved up in Slice A: `GuardOutlet` in
  `AdminPages` covers the content area and the Table.)
- The mirror gained Search, Classroom (placeholder until Phase 3) and Office
  (`TeachMirror`); `MIRRORED_PREFIXES` and `ProtectedPage`'s backstop follow.
- System (settings) in the sidebar opens `NotMirroredYet` ("A user's
  settings"), as the plan specifies.
- Verified in a browser at 1440×900 as admin, editor and student: one
  `aside` on every console route; admin lands on `/console/users`, editor on
  `/console/content/home` and is sent there from Users and Publishing; the
  three old URLs and `/teach` redirect; highlighting follows the section
  showing, including on `records/song` (Learn). The content panel of
  `/console/content/songs/africa` is pixel-identical to the student's
  `/songs/africa`; only the bar in the XP bar's slot differs.

### Slice A as built (Atlas Table + high-fidelity mind map, part 1)

The owner's request of 29 Sep 2026 — richer metadata for the mind map, the
Table as its own section with ten categories — is designed in full in
`console-content-atlas-table-design.md` (Amendment 5). Slice A is the part
every design agreed on:

- **Years and decades are graph nodes** (`year:1982`, `decade:1980s`;
  `src/content/graph/time.ts`). Songs, records, labels (`foundedYear`) and
  studios (`openedYear`) link to a year (`from_year`); every year in use
  links to its decade (`in_decade`) and era (`from_era`, now year → era
  only), stated by code. `ENTITY_KINDS` and `EDGE_KINDS` are compiler-checked
  lists. The mind map has a Time filter. Repo data: 569 `from_year`, 69 years
  across 11 decades.
- **Readability**: at two steps the map does not walk through hubs (genre,
  key, mode, vibe, era, decade, regions) unless "Walk through hubs"
  (`?hubs=1`); a hub focus opens at one step; a hop-1 group that mixes node
  kinds splits by kind (each capped at 40). The walk chips are disabled at
  Direct, where they change nothing. `song:africa` at two steps: 27 nodes,
  80 with hubs.
- **The Table section shell** at `/console/table/:table/:row?` (13 table ids:
  the ten categories, Recording as records | studios | labels, Year as years
  | decades; `features/admin/table/tablePaths.ts`), a Table item in the
  sidebar for admin and editor (above Users and Telemetry), a `TableBar` with
  the ten pills, and a placeholder page listing each table's columns (the
  owner's lists verbatim; "Lable" read as Label). Redirects keep the row and
  search. One `GuardOutlet` guards the content area and the Table; an
  eager-boundary test keeps the Table's code lazy.
- Verified in a browser against the mock as admin and editor; the entry
  chunk carries none of it.

### Checkpoint A2 + C1 as built (Amendment 5: derive what the app has)

- **A2, hubs by size.** The new edge kinds are declared with labels and
  endpoints: `about`, `took_place_in`, `scene_of`, `scene_active_in`,
  `typical_in`, `born_year`, `formed_year`, `born_in`, `active_in`, and
  `in_genre` from events. Past the focus, the map stops at a node it would
  walk on through more than 60 edges from (`EgoFilter.stopAbove`,
  `DEGREE_HUB_EDGES`), counted with the walk's own filters: solid edges,
  and guesses too once "Follow guessed links" is on. A focus with more than
  60 connections of any kind opens at one step, since its first ring draws
  them all; New York, Los Angeles and London do today. `EgoNetwork.stopped`
  says how many nodes each stop would have led on to, and the map draws that
  as its own "+N via Detroit" node beside the hub (double-click focuses the
  hub). `Graph.solidDegree` (a node's solid edges) stays, for the Table.
  "History" is now "Events & influence"; the new "Scene decades" chip
  starts off and is turned on with `?on=scene_decades`, so old `?off=` links
  mean what they did.
- **C1, the globe's matcher shared.** A characterization test pinned the
  globe first: sha256 hashes of the artist index (877 artists), of every
  event's artists (1,723 events) and of `getArtist` over every name, alias,
  slug and tag. The matcher then moved to a pure module,
  `src/content/graph/eventMatches.ts`, and `artists.ts` delegates to it;
  the hashes did not change. The matcher is its own lazy chunk
  (`eventMatches-*.js`), which the student globe page and the console's
  graph both load, so it holds no regex lookbehind: Safari before 16.4
  cannot parse one, and the globe would not load there (a test keeps it
  out). The graph passes it every place and genre name the Atlas knows
  (`placeAndGenreNames`), a city with its state or country as one name
  included ('Portland, Maine'), so a tag that is also a city or a genre
  never names an artist on its own: artist records called Chicago, Boston,
  Kansas and Europe, created in the console, would otherwise add 19 wrong
  pairs. The registry's guard test now checks the same lists. `places.ts`
  folds countries through the globe's `normCountry` (ISO codes included),
  which places 6 more events and 25 more song pins.
- **C1, the derivers.** `edgesForEvent` reads `evt-` events only: the year,
  the city placed through `CITIES` (a guess), the genres through the genre
  table (solid), and `about` from the matches (guesses). Stored `artistIds`,
  `songIds` and `placeId` already win when present, ahead of their
  `REF_PATHS` rows in C2 (`refPaths.test.ts` exercised them through
  `READ_AHEAD_OF_V4`, which C2 then removed), and stored `artistIds` are what a
  song match must agree with, so rejecting an artist drops the songs only
  that artist admitted. `edgesForPlace` adds `scene_of` and
  `scene_active_in`; `edgesForArtistLocation` gives a guessed `based_in`
  only while the artist has no `basedInPlaceId`, and nothing for a pin with
  no artist record. The edge names its pin (`via.statedBy`), so the
  connections table reads "Song pins ‘marvin gaye’" (B's shared
  `SongPinLink`) and opens that `artist_location` item, never the artist,
  and its Guessed badge says the
  guess comes from where the globe pins the act's songs; the relation is
  still labelled "based in", like the City it is not. `edgesForInstrument`
  reads `instrumentGenres.ts` (105 rows over 48 instruments, for the owner
  to review). The snapshot gains `artistLocations`, `eventMatches`,
  `asOfYear` and `instrumentGenres`; `repoSnapshot.ts` passes them and runs
  `matchSnapshotEvents`, and `loadEventArtists` (1d's `eventArtists`) is
  gone.
- **C1, the contract (v3).** `REF_PATHS` gains `resolvedBy: 'genreTag'`,
  `alsoTargets`, the kinds `globe_event` and `artist_location`, and seven
  entries (event `title`, `tags[]`, `location.city`, `location.country`,
  `genre[]`; city `genres[]`; song pin `city`), none of them checked by the
  API. `manifest.json` is at `artifactsVersion` 3. The contract doc has the
  `resolvedBy` rule, the per-path note and §5a (what the console derives
  and the API never stores).
- **C1, integrity.** Coverage counts as guesses only what the graph drew:
  event titles and tags by what the matcher found and no stored id
  overrules, cities and song pins by what the registry places (934 of 1,083
  event cities, 244 of 362 pins); a genre string the table resolves counts
  as linked. New rows under "Fields
  disagree": an `evt-` event whose stored place is not its city (a warning,
  ready for C2's `placeId`), and an act whose song pins are not in its City
  (worth a look: publishing the City moves them). A check of its own,
  "Years don't add up" (`impossible-years`), flags years active the
  calendar cannot read as a span, and a first or last year that is no year
  at all (0, 1982.5). The birth checks join it with `born` in C2.
- **Measured** (the repo snapshot as the loader builds it; "before" is as
  last measured, at 1d and Slice A):

  |                                 | Before | A2 + C1                                     |
  | ------------------------------- | ------ | ------------------------------------------- |
  | Nodes                           | 4,053  | 4,801 (instruments 9 → 50)                  |
  | Edges (all / Scene decades off) | 9,313  | 18,079 / 16,285                             |
  | Artists with no edge            | 536    | 6                                           |
  | Artists with a solid edge       | 1      | 1 (900 more are joined only by guesses)     |
  | `evt-` events with no edge      | –      | 0 of 1,083                                  |
  | Integrity rows                  | 745    | 147: 1 error, 15 warnings, 131 worth a look |
  | Unconnected nodes               | 706    | 108: 6 artists, 102 progressions, no events |

  - New edges: `from_year` from events 1,083 (songs still 569);
    `took_place_in` 934, all guesses (149 events name a city the registry
    cannot place); `about` 815 to artists over 687 events and 40 to songs,
    all guesses; `in_genre` from events 2,334, solid; `scene_of` 676;
    `scene_active_in` 1,794; song-pin `based_in` 243 from 244 pins (two
    spell Earth, Wind & Fire two ways, and are two sources of one edge),
    guesses; `typical_in` 105.
  - Hubs: 40 nodes have more than 60 solid edges, and all 40 are hubs by
    kind already. The busiest other node is `year:1971` (49). New York has
    150 edges but only 19 solid: it opens at one step, and stops a two-step
    walk once guesses are followed (bebop in New York with guesses on: 53
    nodes and "+127 via New York City", where it was 180).
  - The map at its defaults: `song:africa` at two steps shows 41 nodes (27
    at Slice A); `place:detroit` 47; `place:new-york` 138 at one step (194
    at two); `event:evt-beatles-liverpool-1963` 100; `genre:rock` at one
    step 484; `decade:1970s` 11, or 225 with Scene decades on.
    `artist:marvin-gaye` stays at 8: past the focus only solid edges walk,
    and every artist-side C1 edge is a guess, so hop 2 grows with the Links
    page's sure matches (B) and Stage 1 (E). His song pins say Washington,
    which the registry does not place, so his map shows no pin at all yet.
  - Building the graph takes about 40 ms and integrity about 120 ms.

- **Against the design's estimates**: 40 song pairs, not 41–48 (the rest
  are naming mismatches between song credits and registry entries, such as
  Santana and Carlos Santana); 934 event places, not about 944; 243 song
  pins, not about 250; 105 `typical_in` rows, not 150–250 (the table is
  deliberately conservative); 108 unconnected nodes, not about 130; and New
  York is a hub only as a focus, or once guesses are followed, until its
  event places are accepted (E).
- **After review** (two reviews of A2 and C1, each finding checked against
  the code first): the lookbehind above; the compound place names, which
  took one wrong subject ("Portland, Maine" on a Portland folk event) off
  the graph but not off the globe; stored event artists for song matches;
  the pin as its own source; coverage counting only drawn guesses; the
  walk-counted hub and the focus opening at one step by all its edges; the
  own check for years; `READ_AHEAD_OF_V4`; three `typical_in` rows that
  claimed a whole genre (the electric guitar and the piano in Blues, the
  harmonica in Folk); and the eager-boundary test now refusing the rest of
  the graph and the map's vocabulary and layout.
- **Open for the owner** (each is student-visible or a data call, so none
  was changed here):
  - The `instrumentGenres.ts` table. Mariachi sits under Classical and
    gospel under Funk in the subgenre table, so the trumpet reaches
    Classical, and the piano, organ and Hammond Funk, through them.
    Resolved: the owner confirmed the table correct (30 Sep 2026), unchanged.
  - The genre table's parents, now drawn solid: Soul, Neo Soul, Gospel,
    Motown, Alternative R&B and New Orleans R&B resolve under Funk, not
    `genre:rnb` (99 events, 112 genre strings, and 18 city scene strings
    reach Funk that way), and Dubstep under Reggae. A parent is one line.
  - Registry entries that are not artists, whose events now carry guessed
    `about` edges as the globe carries chips: Congo Square (the entry is
    "Congo Square:"), Éthiopiques (a reissue series), Māori (a people),
    Musica Transalpina (a 1588 anthology), Tresor (a club), Limón (a Costa
    Rican province), Manila Sound (one of Manila's scenes) and Portland,
    Maine; and two namesakes, War on U2's "War" event and Journey on a game
    score's. The registry's guard test lists Portland, Maine and Manila
    Sound as waiting on this decision.
  - Ten acts the registry holds twice, with and without "The" (the Beatles'
    songs are on `the-beatles`, their events on `beatles`; likewise the
    Temptations, the Rolling Stones, the Commodores, the Red Hot Chili
    Peppers, the Average White Band, the Four Tops, Talking Heads, the Steve
    Miller Band and the Doobie Brothers). Integrity lists all ten as
    look-alikes. They were to be merged or aliased before E, whose
    event-artist planner would otherwise write the split into stored ids,
    and the importer found one MusicBrainz artist for both slugs of each
    pair (E and F below). Resolved: merged by the owner with the other
    duplicates (30 Sep 2026; see
    [The owner's answers as built](#the-owners-answers-as-built-30-september-2026)).
  - Whether "Washington" should place as `washington-dc` (six pins say it,
    Marvin Gaye's among them), and the pin key "andy grammar", which misses
    the registry's `andy-grammer`. Either change moves pins on the globe.
    The pin key is resolved: it is "andy grammer" since the owner's merge
    (30 Sep 2026), so Andy Grammer's Los Angeles pin is drawn. "Washington"
    is still open.
  - City scene strings the genre table does not know: 244 of the 519
    distinct strings (261 of 937 uses) give no `scene_of`, among them
    Philly Soul, Surf Rock, Zydeco, Miami Bass, Kansas City Jazz and "Drum &
    Bass" (the table knows "Drum and Bass").
  - The progression style `gospel`. Resolved: the owner mapped it to the
    Gospel subgenre, under Funk (30 Sep 2026); `african` stays unmapped.
- **For E** (done in E, in part): the multi-word non-artists above would
  reach the sure tier of a bulk accept, which grades only one-word names as
  close. E's event-artist planner holds a list to likely when a name in it
  is also a place or a genre, or ends in `:` or `,`; Musica Transalpina,
  which no rule can tell from an artist, stays sure.

### Checkpoint C2 as built (Amendment 5: the stored fields)

- **C2a, the contract (the version 4 draft).** Artist `born`
  (`ArtistBirth`: `date` as 'YYYY', 'YYYY-MM' or 'YYYY-MM-DD', held to its
  pattern by a new `@pattern` JSDoc tag that the generator turns into
  `z.string().regex()`); the `globe_event` v2 body (`GlobeEventRecord`:
  `artistIds`, `songIds`, `placeId`, `releaseIds`, `studioIds`, `labelIds`,
  `unverified`, `source`, and the fields the server copies onto `song-`
  events); song v2 (`releases[]`, `subgenreIds`, `session.studioId`,
  `labelId`, `placeId` and `source`, and `source` on credits and related
  recordings). `recordBodySchemas.ts` and `songBodySchema.ts` are
  regenerated, v1 is frozen (same hash), and `REF_PATHS` has the new paths.
  The hashes are in `manifest.json`; `artifactsVersion` stays 3 until the
  draft is handed over at the end of E. The artist editor's Born field
  compiles in (its guard stopped compiling once `born` existed, as
  designed), but nothing mounted `RECORD_EDITORS` at C2, so it was not live
  anywhere (D mounts it); after the review it edits only on a server at
  artist body level 2 (below).
- **C2b, the derivers.** `edgesForArtist(artist, asOfYear?)` reads `born`:
  its date is `born_year` for a person and `formed_year` for a group, at
  whatever precision; its place is `born_in` for a person only, since a
  group is born where its City is. `activeFrom`…`activeTo` is `active_in`
  to every decade the span touches (`decadesBetween`); an open span runs to
  the snapshot's `asOfYear`, or states only its first decade without one,
  and a span the calendar cannot read states none. `born`'s own flag and
  source go with the birth edges. `edgesForSong` reads song v2:
  `on_release` from `releases[]`, `recorded_at` from `session.studioId`,
  `recorded_in` from `session.placeId`, `released_on` from
  `session.labelId` only while the song names no record (a record names its
  own label), and `in_genre` to each of `subgenreIds`. Each id is read
  verbatim and stated; the session's text is read, as a guess, only while
  its field has no id (a label's also only while the song names no record),
  and a studio or label id with empty text beside it is a link like any
  other. A song linked to its studio reaches the studio's city as a stated
  edge (it was a guess while the studio was). `edgesForEvent` states the
  records, studios and labels an event stores (`about`; nothing infers
  them), and an unverified event marks every edge it states. For every
  existing song these rules give exactly the edges they gave before.
- **C2b, integrity.** "Years don't add up" gains the birth: a date the
  calendar has no such day for (the pattern lets '1939-02-30' through), a
  birth or forming still to come, and one after the first year active.
  "Fields disagree" gains a group with a birthplace (worth a look: the
  graph reads none, and the row points at the City when there is none) and
  a song whose session label id its records overrule (a warning when the
  records name another label, worth a look when they name none). Coverage
  counts each session text on its id's row (`session.studio` on
  `session.studioId`, and so on) and an event's city on `placeId`'s row,
  and a label written beside records is no guess. An event's title and
  tags keep rows of their own: each names artists and songs at once, so it
  links two id fields, and it states what the matcher found in it.
- **C2b, the mock.** In `all` mode it reports song `schemaVersion` 2 and
  `globe_event` 2, validates songs against `songBodySchema.ts` and events
  against the v2 body, and its `song-` event derivation copies
  `releaseIds`, `studioIds`, `labelIds` (only for a song on no record) and
  `placeId`, each left out when the song has none, as the contract's
  derivation table says. Legacy mode is unchanged (song level 0, events
  unchecked). `capabilityHelpers` gains `schemaVersionOf(kind)`, so the
  Table can gate the event v2 fields the way the song panel gates on
  `songSchemaLevel`.
- **C2b, the song panel.** At song level 2 the Recording row puts a record
  picker beside the studio, city and label text (creating allowed), and
  picking one whose text is empty fills the text from the record's name
  (C20), so the song page shows what was linked. "Appears on" lists the
  records with a track number and a source; a row is added by picking and
  removed by clearing, so no blank id is ever written. Subgenres are a
  multi-picker that ranks those under the song's own genres first. The
  Source box beside each Unconfirmed flag now writes (it was drawn and
  dropped before). Below level 2 the note stays and none of this shows.
- **C2b, the contract doc.** §5b: the event v2 body, what absent and `[]`
  mean, `placeId` on `evt-` and `song-` events, the credits superset,
  `artist.born`, the song v2 field list, the proposed re-derivation on an
  artist release, and a requested export `revision`; `subgenreIds[]` in
  the per-path vocabulary table; `globe_event` schema versions in
  `/capabilities`.
- **Measured.** The repo graph is unchanged, because no repo record stores
  a C2 field yet: 4,801 nodes and 18,079 edges (16,285 with Scene decades
  off), no `born_year`, `formed_year`, `born_in`, `active_in` or
  `on_release` edge, and 147 integrity rows (1 error, 15 warnings, 131
  worth a look), none of them new. The four pilot songs' sessions now sit
  on their id rows in coverage, 4 of 638 set, all guesses; event cities are
  934 of 1,083 on `placeId`'s row, all guesses. Build about 45 ms,
  integrity about 130 ms. Only fixtures store the new fields: the Table's
  gain 7 edges (Toto formed in 1977; Jeff Porcaro born in 1954 in Hartford,
  unconfirmed, and active in three decades), and `refPaths.test.ts` fills
  every new path, so its pending list is gone and each path is held both
  ways like the rest. All 640 charts pass song v2 and v1 (read-only script,
  since `songBodySchema.test.ts` cannot load past the broken
  `_generated_index.ts`).
- **For E and D.** Nothing stores a C2 field until E's accepts and D's
  editors write one, so the map changes only then. A caller that maps
  `edgesForArtist` over a list must pass `asOfYear` itself: handed to
  `flatMap` directly, it takes the index for the year (the Table's fixture
  does this; its open span then states only its first decade).
- **C2 review fixes** (two reviews, contract and UI). The manifest records
  the open draft: `draftVersion` 4 beside `artifactsVersion` 3, and each
  file's `handedOff` hash (version 3's, recovered from the C2 start) beside
  its `sha256`; `manifest.test.ts` holds `draftVersion` to exactly "some
  file differs from its hand-off", so no edit bumps early and none is
  missed. The mock runs the draft, so it reports artifacts 4. Artist body
  level 2 is the body with `born` (contract §2): the mock reports it, and
  Born edits only there; below it a stored Born is shown with Remove,
  since a level-1 server refuses the save. `born.date`'s pattern holds the
  month to 01–12 and the day to 01–31 (before the hand-off, while nothing
  stores one); integrity checks the shape through the generated
  `artistBirthSchema` and the calendar through `isCalendarDate` (moved to
  `time.ts`), and so does the editor, so the three agree. A record with
  members is a group to the graph (`isGroupArtist`), flag or not, and
  integrity asks for the flag. A stored event list that is not a list
  states nothing instead of dropping the event. `REF_PATHS` lists the rest
  of a `song-` event's copies (`credits[].name`, `credits[].instrument`,
  `studio`, `label`; `derive: false`). The generator refuses a `@pattern`
  inside a sentence. `songBodySchema.test.ts` skips `_*.ts` and runs again.
  In the editors: `SongCredits` draws "Recorded" only for a session with
  text or a year (existing songs render the same); a studio, label or city
  text follows its record while it is that record's name (C20, refined);
  "Appears on" refuses a record twice and a track that is not a whole
  number from 1; below song v2 a song holding v2 fields is offered their
  removal; Born's flags wait for a date or place, and its anchors are
  `born`, `born.date` and `born.placeId`; birthplaces and recording towns
  are created with the pin off; the create dialog chooses no Format or
  Region, offers nothing while the index loads, and refuses a studio, label
  or record without the server's create-only save. The repo graph is
  unchanged (4,801 nodes, 18,079 edges, 147 integrity rows).

### Checkpoint B as built (Amendment 5: the Table, read-only)

- **Ids and the URL.** `tableIds.ts` holds the route-free ids, so eager
  code (the sidebar, MirrorBar) can import them: `TABLE_IDS`,
  `TABLE_FOR_CONTENT_KIND`, `TABLE_FOR_NODE_KIND`, `tableRowForNode` (a
  song's own event opens the song's row), `tableRowForItem` and
  `tableForAppPage`. `tablePaths.ts` adds `tableHrefForNode` and
  `tableHrefForItem`. A table's state is its URL, defaults left out: `q`,
  `sort` (`col` or `-col`), `f` (filters), `status`, `view`, `more=1`
  (subgenres), `narrow` (the Key table's mode), `field`, and from D `link`
  and `new`. `createRouteDefinition` now drops undefined query values (it
  printed `q=undefined`).
- **The registry** (`model/types.ts`, `model/categories.ts`): all 13
  tables. The owner's columns show by default, in his order and words
  ("Lable" as Label); the "Etc." tables show their proposed columns; the rest
  are opt-in in the Columns menu. A column is a walk over the graph (`Hop`:
  edge kinds, direction, target kinds, a `via` filter) in stated, fact,
  rollup and hint parts; a chip takes its weakest step's style, and its
  strongest path's. Every column says who edits it and where an empty
  cell's data will come from. Key gained Modes (C26), a progression's Key
  became opt-in, and Decades gained Active. `categories.test.ts` pins the
  owner's lists verbatim and checks each step against the graph's endpoints
  and each field against the generated schemas; `viaPaths.test.ts` checks
  that every `via` states a real edge and is the `REF_PATHS` entry of the
  kind that states it, and found no mismatch.
- **The model** (`model/{aggregate,buildTableModel,query}.ts`; pure, cached
  per graph). A row is a graph node joined with its stored item: the API's
  body, else its pending body, else the repo's, else the vocabulary entry.
  The vocabularies add the 29 genres and 582 subgenres (behind "Show
  subgenres") and the 59 instruments, and an API item the graph lacks is a
  row of its own ("Not in the repo snapshot"), so production's drafts still
  list. A stated part counts only edges whose `via` names the row and that
  no other item states (`statedBy`: a song pin is never the artist's City).
  An artist is an act when a song's billing line or an ensemble credit
  names them: Toto, the Funk Brothers and the Detroit Symphony Orchestra
  are acts, and 12 repo artists are credited people. Repo rows: 907
  artists, 1,083 events, 695 progressions, 317 locations.
- **One data hook.** `useContentExport` pages `/export` (lean:
  `omit=sections,audioSources`), or reads the `/items` list without it. A
  fingerprint over each row's slug, status, edit state and body hashes
  keys the build, so a refetch that changed nothing rebuilds nothing.
  `workingSnapshot.mergeSnapshot` lays the API's items over the repo's (the
  API wins per id; an authoritative kind drops the repo's copy; archived
  items leave the graph) and matches events again when songs, artists,
  cities or events came from the API. `useWorkingGraph` feeds the Table
  and, from B part 2, the mind map and Integrity (`{ items: false }` for
  those two). Fed the repo back as an export it builds the identical graph:
  4,801 nodes, 18,079 edges, edge-key hash `740864b4`. Without `/export`
  (production today) all three show the repo snapshot, read-only;
  `WorkingGraphNotice` says why on each, and Try again refetches only what
  failed. Old builds are dropped after 30 s.
- **The grid** (`grid/`): react-window rows of 44 px, a sticky header and
  title column, and `role=grid` with arrows, Page Up/Down, Home/End, Enter,
  Esc and `/`. The toolbar has the count line, the views, status, Acts |
  Credited people, Show subgenres, the Key mode picker and the mode badge;
  then the Filters and Columns menus, and the coverage strip ("City 0/892 ·
  song pins ≈242"; a click toggles its `missing-*` filter).
  `ValidationNotice` lists what would block a publish, linked to rows. An
  open row the filters hide is still listed, as "Outside this view", and
  closing a row goes back rather than adding history.
- **The row panel** (`panel/TableDetailPanel.tsx`, its own lazy chunk;
  440 px from xl, a Sheet below): the row's fields (`?field=` scrolls to
  one), each column in full with "Stated on the …", every connection by
  edge with where it is stated, and "Open in mind map" and "Open page".
  Read-only at B; D makes it the editor.
- **Redirects and links.** `records/:kind` for the eight kinds a table
  holds redirects to `/console/table/<table>`, keeping `?q`; "Other
  records" keeps Lessons, Fundamentals and Artist locations. MirrorBar's
  Page | Table goes to the page's row (an item's full editor to its row),
  and its Records menu is Table, Lessons, Fundamentals, Artist locations,
  Vocabulary and, for admins, Import songs. The map's Focus and Selected
  cards have "Open in Table"; `graphVocabulary.editorFor`, "Stated by" and
  Integrity's Fix links open Table rows; Publishing's Review opens a song
  in its page editor and every other table kind in its row.
- **Measured.**
  - Model builds on the repo graph, all within the 60 ms budget: Genres
    37.7 ms on its first build (31.9 ms best of three), Events 31.3 ms;
    all 13 tables 169 ms. The budget test is load-sensitive: it has missed
    once or twice under a busy parallel run and passes alone.
  - Rebuilding the mock's full working copy (4,634 rows, 2.75 MB of lean
    JSON), median of seven: 62 ms (fingerprint 8 ms, merge and matching
    18 ms, `buildGraph` 36 ms); Integrity 114 ms; all 13 models 137 ms.
  - In the browser against the mock: first rows 0.84–1.7 s after a cold
    load, switching tables 43–112 ms, opening a row 35–142 ms.
  - None of it is in the entry chunk (`eagerBoundary.test.ts` refuses each
    module); at B the page chunk was 57 KB, the model 50 KB and the panel
    19 KB.
- **The Links page's sure matches, applied** (against the mock, as B
  planned): 371 unlinked names in 640 songs, 370 sure (681 places); "Wrote
  634 of 634" in 24.6 s. `performed_by` went from 1 solid and 637 guessed
  to 639 solid and 1 guessed, artists with a solid credit from 1 to 363,
  and `artist:marvin-gaye` at two steps from 8 nodes to 41. The mock's
  working copy has 15 edges more than the repo's (18,094), all from its
  seed's pilot studios, labels and two songs.

### Checkpoint E as built (Amendment 5: review and accept, Stage 1)

- **The suggestions core** (`src/content/suggestions/`, pure, with
  `src/content/bodyPaths.ts` beside it):
  - `types.ts`: a `Suggestion` (target, path, `set` or `add`, value,
    display, sources, evidence, confidence, tier, `requires`, `dependsOn`,
    `anchor`, batch) and a `SuggestionDecision`. `suggestionSchema.ts` is
    generated from it (contract §10).
  - `keys.ts`: the id is a 64-bit FNV hash of kind, slug, path and the
    value's identity, never its source, so a rejection sticks across
    re-imports and a changed value is a new suggestion (2,000,000
    generated ids, no collision). A list element is found by its `anchor`
    (a credit's role and name), not its index.
  - `apply.ts`: writes only where the path is empty or still holds what
    the owner saw. An `add` to an event list nobody has stored is refused:
    the list starts as a `set` of the whole list, so one accept cannot
    narrow the guesses to one artist. An accepted value loses `unverified`
    and gains `source`, and accepting a value already there confirms it.
    From the follow-ups: a credit keeps its MusicBrainz link and merges the
    providers in (C30); linking a studio or label fills its text from the
    record's name when the text is empty or still names the record it
    replaces (C20); `musicBrainzIdOf` reads a label's or studio's MBID from
    its `source` link.
  - `status.ts`: open, accepted, applied, conflict, unreachable, removed,
    rejected or dropped, read against the body the viewer's next save
    builds on; `whyNotBulk` (below); `canReopen`.
  - `merge.ts`: one id from two sources is one suggestion, and the
    importer's `batch` and `dependsOn` win, whichever is read first.
- **The planners** (`src/content/linking/`, pure; `planStageOne` takes about
  95 ms, 113 ms with the importer's artifacts): 2,208 suggestions, 1,454 of
  them bulk-acceptable, and 170 places to make first.

  | Planner                                         | On the repo                                                                                                                                                                                                                                                                   |
  | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | Event artists (`evt-` only; one list per event) | 687 events / 815 pairs: sure 464 / 536, likely 223 / 279 (a one-word name; a place or genre name; "The" and one word; a registry name ending in `:` or `,`)                                                                                                                   |
  | Event songs                                     | 37 events / 40 pairs, all sure                                                                                                                                                                                                                                                |
  | Event places                                    | 943 sure (933 by name, 10 by the event's own pin); 140 likely (1 far off, and 139 that make 104 `pin: false` places)                                                                                                                                                          |
  | Song-pin cities                                 | 340 likely, from 341 pins (Earth, Wind & Fire's two are one): 242 in existing places, 99 needing 86 new ones; 14 joint billings and 6 near-duplicate records listed, not offered. With the importer's artifacts, 256 are a City and 84 a birthplace, 227 merged with its rows |
  | Progression songs                               | 10 sure, 2 likely (Hallelujah, the known wrong one)                                                                                                                                                                                                                           |
  | Song years                                      | 49 likely; the 20 songs at the 2000 placeholder are left out                                                                                                                                                                                                                  |

  One same-place rule, `linking/samePlace.ts` (the same folded name within
  5 km whatever the country, or within 25 km in the same country), serves
  the planners, the mock and the importer, and the planners' place book
  knows the importer's places and the store's cities
  (`createPlaceResolver`), so a place both make is one record under the
  importer's slug. The six "Washington" pins resolve to Washington, D.C.
  here; the graph still does not place them.

- **The mock's endpoints** (`mock/suggestions.ts`, `mock/decisions.ts`;
  `all` mode only, with `features.suggestions`): `GET /suggestions`,
  `POST /suggestions/decisions` and `GET /suggestions/decisions`, as contract
  §10 specifies. It serves the importer's committed rows, 13,689 with none
  refused (4,534 required records checked against `record-slugs.json`, none
  out of step), and the planners' rows over its live bodies, merged by id.
  The first request plans (the first for song suggestions took 200 ms);
  later ones read the cached catalog.
- **Decisions.** Every accept, replace, reject, drop, review and reopen is
  logged. An accept is an ordinary `PUT /items`: a direct save for an admin, a
  proposal for an editor, whose accepts wait (`proposedIn`) until approval
  confirms the ones its body still holds. The log downloads as `decisions.json`,
  one row per line, which the mock reads from the repo and replays after load
  and after Reset: onto an empty path, or for a replace over exactly the value
  the owner replaced (`seenHash`), never over anything newer. An item with a
  proposal on it is listed, never forced, and a value a later save took out is
  left out. Each row keeps the records its value needed (`requires`), so the
  file alone can make them again. Measured: 1,454 Stage-1 decisions replay in
  143 ms (5 ms the second time, 21 ms with no suggestions served); after a
  Reset, the song half's 5,320 accepts replay making about 1,370 records again,
  with no conflict. A follow-up fixed a replay that dropped all 290 Label
  decisions after a Reset (a record made during the replay counted as "saved
  since"). From the final review: "saved since" is measured from the last
  save a person made, so a replay's own saves (noted `Replayed from
decisions.json`) never count, and a store replayed from one file still
  takes a fuller one's accepts; approving an editor's proposal also approves
  the records its accepts made (the release an Album row names, the label a
  Label row put on it), so the item never goes live naming a proposal; a
  reject or drop of a value the item (or a proposal on it) still says is
  refused, 409 `SUGGESTION_APPLIED`, since the replay would then drop it;
  and a reject and its reopen can go in one request.
- **Bulk accept** is admin only, and a suggestion goes in bulk only when it
  is not a City read from song pins (C23: a person checks each, beside its
  pin report) nor a song's year (C15); it is open and sure; its confidence
  is at least the threshold (0.85 by default; the dialog sends the owner's,
  clamped to no lower than 0.7); an importer's row comes from a run whose
  manifest says `calibrated`; and what it rests on (`dependsOn`) stands: the
  item it is for says that value in its live body, whether accepted or
  typed by hand, and not an accept still in a proposal or taken out since.
  That is often another item's (a song's rows rest on the lead act's
  identity, a Label row on a song's Album row), so `GET /suggestions` sends
  it beside each row (`dependency`), and the dialog and the panel read it
  there. The
  server checks all of it again (422 `NOT_BULK`, with the reason),
  re-reads each item, refuses a conflict with what the path holds (409),
  skips an item with anyone's proposal, waiting or sent back (409
  `PENDING_PROPOSAL`), and makes the required records first, create-only,
  reusing what it has (C33: an artist, release, label or studio with the
  same MusicBrainz id; a place by the same-place rule). A bulk accept stays
  "accepted in bulk, not reviewed" until it is marked reviewed.
- **The calibrated gate.** Both importer runs are `calibrated: false`, so
  nothing MusicBrainz or Wikidata offers goes in bulk yet: 3,023 sure artist
  rows and 5,571 sure song rows wait (after the rerun of 30 Sep 2026; 2,949
  and 5,329 before), and so do the 191 sure app rows merged into them (10 of
  them song years, which go one at a time either way). The owner has since
  chosen to import them all without the hand check (Amendment 6, P4).
- **The Table's side.**
  - `useSuggestions` reads the three endpoints; a decision waits only for its
    own row, and the table's lists refresh behind it.
  - Ghost chips fill empty cells, a guessed chip that a suggestion would
    store gets a sparkle (`model/ghosts.ts`), rows show their open count, and
    the coverage strip ends "suggested ≈n".
  - The panel's Suggestions section lists the identity first, with Accept,
    Replace (current and suggested side by side), Reject and Drop behind a
    confirmation, Undo reject (admin), Mark reviewed, "Accept the N sure
    ones", "Mark all N reviewed", "Next with suggestions", "Not in bulk: …"
    on a sure card that will not go, and "In your proposal" for an editor.
  - The admin's bulk dialog: fields (a credit counted under Credits, its
    card under its role's column: Composers, Producer or Credits), a
    threshold from 100 down to 70% (85% unless changed; each request sends
    it), the calibration notice, a dry run, what is left out grouped by
    reason (each name opens its row), progress with Stop, and a report; 25
    items per request.
  - A card resting on another item's suggestion names it and links to its
    row ("Rests on “MusicBrainz: Marvin Gaye”, accepted"), and a Label card
    no longer lists the release it writes into as a record to make.
  - The decisions banner ("n decisions not yet downloaded", Download,
    remembered per decision), and "N accepted in bulk, not reviewed" in
    Publishing and the Changes popover, linking to `?f=bulk-unreviewed`.
- **The pin-move report.** Accepting a City moves the act's song pins: the
  next Artists publish derives their globe events again, and students see
  the pins move with the Globe events publish after it (the cards say so).
  A City card and the City field list each pin that
  would move (song, from → to, km), and Accept waits until the list is
  worked out. From the follow-ups, Publishing's Review & publish tab lists
  the same for every published act whose City changed, and "Publish
  everything that changed" asks first, showing it. Marvin Gaye set to
  Detroit: "Moves 5 song pins … Washington → Detroit, 634 km"; the publish
  took 200 ms and his song's pin moved. From the final review: a City not
  live when Artists publish refuses that whole publish (`DANGLING_REFERENCE`),
  so the report says so first and leaves those acts out of its count; an
  act whose City is cleared is listed apart (the server pins its songs by
  their song pins, placement step 3, while the mock leaves them).
- **Saving safely.** Every save of an existing item re-reads it and lays the
  draft onto the newer version field by field (`itemEditor/rebase.ts`);
  where both sides changed a field, the panel asks "Reload theirs / Keep
  mine". The panel, Link… and Confirm block on anyone else's proposal,
  waiting or sent back, as the server does. A save or link that now states
  a suggestion logs it as accepted (`logWritten.ts`), so `decisions.json`
  holds what the owner confirmed by hand too.
- **Measured in the browser** (mock, admin and editor): the Events dry run
  offers 943 places (140 left out), 464 artist lists (223 left out) and 37
  song lists; 943 places went in 3.4 s and 464 artist lists in 1.6 s. The
  Events table's Artists coverage rose from 0/1,083 to 464/1,083 and its
  open suggestions fell from 1,807 to 400; `place:memphis` went from 19
  guessed connections to 6. One Accept takes 235–259 ms (about 1 s before
  the review), Mark reviewed 452 ms, Undo reject 252 ms. Editors get no
  bulk, no banner and no Reject; their accepts go into their proposal.
- **Storage.** The mock's store is in IndexedDB (F1 below). The Links write
  and Stage 1's bulk runs, each published, save 2.93 M characters (the 1,680
  decisions 428 k) and encode in about 74 ms; with every artifact loaded,
  Stage 1 stays within the 8 M budget. With every sure song row accepted as
  well a save is 10.0 M characters and encodes in 85–125 ms: over budget,
  held by its own test at a 12 M ceiling rather than a raised budget.
- **Contract.** The version 4 draft gained `suggestionSchema.ts` (generated)
  and `songBodySchema.v2.ts` (song v2, frozen), both new with a `handedOff`
  of 64 zeros. The manifest stays at `artifactsVersion` 3 with
  `draftVersion` 4 until the hand-off at the close of E, so the console
  still sends `X-Content-Artifacts: 3`. `/capabilities` gained
  `features.suggestions`.

### Checkpoints F1 and F2 as built (Amendment 5: the importer)

- **The script**, `src/scripts/enrichment/importSuggestions.ts` (Node; no
  app file may import it, `appBoundary.test.ts`): stages
  `cache | fetch | score | emit | calibrate`, with `--only artists|songs`,
  `--limit N`, `--max-requests N`, `--dry-run`, `--partial` and `--out DIR`.
  A real `emit` refuses a cache with answers missing unless `--partial`;
  emitting twice gives the same bytes.
- **Requests.** MusicBrainz one at a time, 1.1 s apart, as
  `MusicAtlas/1.0 ( https://musicatlas.io )` with no email: artist search
  and lookup, release-group browses, area lookups up to the country,
  recording searches by the act's MBID together with its "& The …" bands
  (three pages of 100 at most), and place lookups (a studio room becomes
  its building). Wikidata `wbgetentities` in sorted batches of 50 with
  `maxlag=5`, and a Query Service P434 fallback for acts MusicBrainz links
  to no item. 429 and 5xx are retried as `Retry-After` says, a wait over
  five minutes stops the run, and a Wikidata error sent as a 200 is retried
  and never cached.
- **Cache.** One file per URL under `_cache/http/<host>/` (gitignored),
  200s and 404s only, written through an fsync and a rename; an unreadable
  file is a miss, set aside as `*.bad`. A run resumes from it, a lock stops
  two fetches overlapping, and a stage fingerprint reruns the cache stage
  when the registry, the songs or its code change. It holds 6,582 responses
  (MusicBrainz 6,507, Wikidata 68, Query Service 7); a rerun makes no
  request.
- **Identity** for the 907 registry artists: name 0.35, alias 0.25, a song
  credit 0.40 (0.20 when weak: compilations only), a release title 0.25, the
  area 0.10, the life-span 0.10, a genre 0.05; sure from 0.85, likely from
  0.60, ambiguous when the runner-up is within 0.15. Result: sure 345,
  likely 309, ambiguous 36, weak 175, no candidate 42. Ten MusicBrainz
  artists are picked for two of ours, and a pick shared that way is never
  sure: eight of the "The" pairs, Boyz II Men (`boyz-2-men`, `boyz-ii-men`)
  and Rufus (`rufus`, `rufus-and-chaka-khan`).
- **The artist half** (batch `mb-2026-09-30`): 5,932 suggestions for 654
  artists (sure 2,949, likely 2,947, ambiguous 36), every field row resting
  on its identity row (`dependsOn`); 363 values map to our cities and 307
  `pin: false` places are made first.

  | Field                  | Sure | Likely |
  | ---------------------- | ---- | ------ |
  | `externalIds.mbid`     | 345  | 309    |
  | `externalIds.wikidata` | 344  | 311    |
  | `group`                | 133  | 116    |
  | `born.date`            | 304  | 431    |
  | `born.placeId`         | 193  | 247    |
  | `basedInPlaceId`       | 104  | 183    |
  | `activeFrom`           | 303  | 388    |
  | `activeTo`             | 77   | 92     |
  | `genreIds[]`           | 777  | 589    |
  | `instrumentIds[]`      | 369  | 281    |

  City is sure only when the song pin agrees (C23); a residence (P551) can
  only agree, never make a City. `activeTo` is never sure while MusicBrainz
  says the act has not ended. Dates take the preferred statement, then the
  earliest (birth, formed, first active) or the latest (last active). A
  building, street, county or region is never a place, and a place no class
  settles is never sure; what is left out is listed in the manifest
  (`unmapped`). Place slugs come from the whole set, never the order asked
  (`springfield-us-q28515`, `london-canada`).

- **The song half** (batch `mb-songs-2026-09-30`): of 638 songs, 581 match a
  recording (459 sure, 122 likely), 34 are ambiguous, 18 match none and 5 are
  skipped; 54 years were looked up again. 7,757 suggestions for 574 songs (sure
  5,329, likely 2,428), each resting on its lead act's identity row.

  | Field                      | Sure  | Likely |
  | -------------------------- | ----- | ------ |
  | `releases[]` (Album)       | 432   | 94     |
  | `labelId` (on the release) | 292   | 153    |
  | `session.studioId`         | 151   | 228    |
  | credits: performer         | 1,767 | 1,146  |
  | credits: songwriter        | 949   | 346    |
  | credits: engineer          | 646   | 138    |
  | credits: producer          | 559   | 167    |
  | credits: vocals            | 326   | 98     |
  | credits: arranger          | 178   | 37     |
  | credits: conductor         | 16    | 5      |
  | `year`                     | 13    | 16     |

  Records made first: 412 releases, 176 labels, 207 studios, 1,021 people (C30:
  the billed, members, songwriters, producers) and 38 towns; 4 pilot labels and
  2 pilot studios are linked instead (`existingRecords.ts`). Credits link 1,311
  times to our artists, 2,795 to people made, and 2,272 stay names. A
  recording's artist credit is checked by MBID, never by name; live, remix,
  re-recorded and other takes are passed over; the album is the earliest
  official one within a year of the recording; the label comes from the album's
  first-year issue (a later issue's is only likely). A Label row targets the
  release and rests on its surest Album row. `record-slugs.json` keeps each
  MBID's slug, so a later run cannot rename a record.

- **Rerun on 30 Sep 2026**, after the owner's duplicate merge. The figures
  above are the first run's; the rerun's are in
  [The owner's answers as built](#the-owners-answers-as-built-30-september-2026).
- **The artifacts** (`src/scripts/enrichment/suggestions/`, 11.6 MB, one
  row per line; the mock loads them in dev only): `artists.json` (3.2 MB),
  `songs.json` (7.2 MB), `places.json`, `record-places.json`,
  `releases.json`, `labels.json`, `studios.json`, `artists-created.json`
  (each record with the rows that need it), `record-slugs.json`,
  `matches.json` (every song and what it matched, or why not) and
  `manifest.json` (per run: counts by tier and field, the cache digest, the
  input hashes, `calibrated` and `measuredPrecision`).
- **The calibration sheet**, `calibration/artists-100.json`: 100 artists,
  every one billed on a song in the library (the owner judges an act by its
  songs; sample rule 2, `sample.rule`), drawn by stratum from a fixed seed.
  Counting only artists with songs: 61 of the 275 sure picks with a song on
  the act's own record, all 7 sure picks without one (79 in all), 20 of 39
  likely, both ambiguous, all 5 weak, and 5 of 16 with no candidate; 20 are
  one-word names.
  Each row has its pick, the reasons and a blank `label`. `calibrate` passes
  when every sure pick is judged, at least 50 in all and 10 in each sure
  stratum (or all it has), and the weighted precision is at least 98%; it
  never overwrites labels, and a sheet with a label in it is never drawn
  again. The first sheet (rule 1: 37 / 28 / 25 / 5 / 5, only 42 of them
  with songs) was drawn again on 30 Sep 2026 before anyone labelled it. The
  song half has no calibration step.
- **The mock's store** moved from localStorage to IndexedDB
  (`ma-console-mock-db`, one text record; the old `ma-console-mock-v1` save is
  moved in once, and removed only if it is the one moved). Stage 1 alone was
  2.47 M characters, at Safari's localStorage limit; in real Chromium it stores
  in 1.2–2.8 ms. `verifyProdBundle.mjs` refuses the new name.

### Checkpoint D as built (Amendment 5: hand editors, panel editing, Link… and New)

- **Record editors** (`content/recordEditors/`): `ArtistFields`,
  `ReleaseFields`, `StudioFields`, `LabelFields`, `PlaceFields` and
  `ProgressionFields`, on shared controls. Each takes
  `{ body, onChange, readOnly? }`, so one component is a kind's editor in the
  content area and the row panel's Details (`RECORD_EDITORS`,
  `recordEditorFor`). They write only the field that changed (nothing on mount,
  nothing for an edit that changes nothing), remove a cleared optional field,
  keep a required one, write bare slugs and never a default. Each field has a
  `data-field` anchor (`fieldSelector`); the key lists are typed against the
  record types and checked against the API's schemas (`contract.test.tsx`); a
  member or parent label that would close a cycle is refused from the store's
  records; a place at `[0, 0]` is warned about. Born edits at artist body level
  2 only (C2). A progression's chords are read-only; its songs, styles (the
  API's 15 `progressionStyles`), vibes and complexity are edited.
  `progressionEditor/ProgressionEditor.tsx`, unused and on another style
  vocabulary, is deleted.
- **The row panel edits** all eight stored kinds (`PANEL_EDIT_KINDS`).
  `itemEditor/useItemSession.ts` is the editing session without `kinds.ts`
  (a create-only save carries on as that item). Details holds the kind's
  editor: a record editor, `SongPanel` (the year, the key with a link to the
  page editor, `ConnectionsPanel` with its v2 pickers) or `EventPanel`
  (artists, songs and place, where absent means matched, with "Keep the N
  sure matches", `[]` means reviewed and none, and "Back to matching"
  removes the field; then records, studios and labels; off below event body
  level 2). `PanelSaveBar` gives admins Status and Save and editors a note
  and Submit for review, and its errors jump to their field. The panel is
  read-only, saying why, in repo mode, for a kind the API does not serve,
  and on anyone else's proposal. `kinds.ts` has specs for artist, release,
  studio, label and `chord_progression`; `globe_city` uses `PlaceFields`;
  only songs keep a full editor (`FULL_EDITOR_KINDS`). `?field=` takes a
  column id or a body path.
- **Link…** (`table/link/links.ts`, `ConfirmConnectionDialog.tsx`) writes
  the item that owns the connection, for eight columns: Artist Songs (the
  lead act, or a credit: an unlinked credit that already names the artist
  is linked, not doubled); Artist Events and Song Events (the event's whole
  `artistIds` or `songIds`, the other guesses as checkboxes, sure ones
  ticked, one-word, place and genre names not); Song Chord Progression (the
  progression's `songIds`); Records Songs (`releases[]`); Studios Songs
  (`session.studioId`, its text filled when empty, C20); Labels Records (the
  record's `labelId`); and Song Label (the record's label, or with no record
  the song's own `session.labelId`). It reads the owner when it opens and
  again before writing, refuses if the field changed meanwhile, and makes
  one PUT (a proposal for an editor) and one refresh. It is a button on the
  grid cell (Shift+Enter) and in the panel, and Confirm on each guessed
  chip; repo mode hides it.
- **New …** (`panel/NewItemPanel.tsx`, `newItems.ts`), on the toolbar of all
  eight stored tables: the id follows the name (a progression takes the
  next number) and locks once made; it looks first (a taken id offers "Open
  it", near spellings are listed); it lists what the kind still needs,
  choosing no year, key or complexity for the author; it saves create-only
  (studios, labels and records only where the server has create-only): a
  draft for an admin, a proposal for an editor.
- **Unsaved changes in Connections** (a follow-up): `panel/draftEdges.ts`
  runs the graph's own deriver on the unsaved draft and on the saved body,
  for all eight kinds, and marks each connection new, removed or "was
  guessed". Aretha Franklin with City set to Memphis shows Memphis new and
  her guessed Detroit song pin removed.
- **Verified in the browser** as admin and editor: Marvin Gaye's Born
  1939-04-02 and City Detroit saved (admin) and sent for review (editor),
  with coverage, Changes and the map following; the Motown 1966 event's sure
  matches kept; Link… from his Songs cell to "What's Going On" turned the
  chip solid; a new studio, a new record, its song and Tamla's label
  chained; New artist from a search for "Stevie Ray Vaughn" found the
  existing one and stopped. The panel opens in 138 ms, a save takes 86 ms,
  and typing costs 12–27 ms a key.
- **Bundle.** Lazy chunks at the end: TablePage 63 KB, ConnectionsPanel
  (with the record editors) 49 KB, TableDetailPanel 39 KB,
  ConfirmConnectionDialog 14 KB, NewItemPanel 11 KB, BulkAcceptDialog
  10 KB. The entry chunk (934 KB) holds none of it, and the mock and the
  importer are in no production file (`verifyProdBundle`, 680 files).

### The owner's answers as built (30 September 2026)

The owner's answers of 30 Sep 2026 were:

- hand-check 100 artists, all with songs in the library;
- the BBC live Valerie event is the song `valerie`;
- merge the duplicate artists under the correct spelling, removing the old
  spelling and moving its tags to the kept one;
- map the progression style `gospel` to the gospel genre;
- `instrumentGenres.ts` is correct.

Later the same day he chose to import everything in bulk instead of the hand
check (Amendment 6). Gospel, the instrument table and Valerie are items 4, 5
and 10 of [Open after Amendment 5](#open-after-amendment-5-30-september-2026).

- **Duplicate artists** (`artistRegistry.ts`, 907 → 883). 23 were merged into
  the name kept: the act's own billing, with MusicBrainz's name as the
  tie-breaker. Each old spelling was removed, not aliased. Its tags, event
  titles and song billings moved to the kept name, and its song pin too
  where the kept name had none, so nothing resolves through an old
  spelling. Kept ← removed:
  - with and without "The" (10): `the-beatles` ← `beatles`,
    `the-rolling-stones` ← `rolling-stones`, `the-temptations` ←
    `temptations`, `the-doobie-brothers` ← `doobie-brothers`, `commodores` ←
    `the-commodores`, `red-hot-chili-peppers` ← `the-red-hot-chili-peppers`,
    `average-white-band` ← `the-average-white-band`, `four-tops` ←
    `the-four-tops`, `talking-heads` ← `the-talking-heads`,
    `steve-miller-band` ← `the-steve-miller-band`;
  - misspelt (11): `rihanna` ← `rhianna`, `the-weeknd` ← `the-weekend`,
    `jimi-hendrix` ← `jimmy-hendrix`, `stevie-ray-vaughan` ←
    `stevie-ray-vaughn`, `marvin-gaye` ← `marivn-gaye`, `eurythmics` ←
    `eurhythmics`, `gladys-knight-and-the-pips` ←
    `gladys-night-and-the-pips`, `lee-ann-womack` ← `leann-womack`,
    `boyz-ii-men` ← `boyz-2-men`, `john-legend` ← `joe-legend`, `redbone` ←
    `redbone-pat-vegas`;
  - a short form: `creedence-clearwater-revival` ← `ccr`, beyond the owner's
    list, by the same rule;
  - a band's billing: `rufus` ← `rufus-and-chaka-khan` (see the Rufus
    exception).
- **The same way, found in review.** The misspelt alias "Andy Grammar" on
  `andy-grammer` is gone; its event title, tag and pin key say "Andy
  Grammer". `remind-in-light` was the album title Remain in Light read as an
  artist, so it was removed: "Listening Wind" is Talking Heads', and its New
  York pin repeated theirs. "Christina, Aguilera, Lil’ Kim, Mya, Pink" lost
  its stray comma, with the slug unchanged.
- **The Rufus exception.** "Rufus and Chaka Khan" is the band Rufus's
  printed billing, not a misspelling. It stays on its two songs
  (`aint_nobody`, `sweet_thing`) and their event titles. The songs link to
  `rufus` through `origin.artistGlobeId`, and its tags moved to `rufus`. The
  importer reads `origin.artistGlobeId` too (`LibrarySong.artistGlobeId`),
  so it finds Rufus through its songs. Still the owner's call: both song
  pages now show a "Rufus and Chaka Khan on the Globe" link.
- **Joe Legend's pin.** The removed `joe-legend` pin said Ottawa; John Legend
  keeps his own Springfield pin. Still open: the "Ordinary People" event is
  still placed in Ottawa, which students see.
- **Kept separate**, each a different act or billing (Integrity still lists
  six of these as look-alikes, for a person to review):
  - a singer beside their band: Tom Petty and the Heartbreakers, Smokey
    Robinson and the Miracles, Bob Seger and the Silver Bullet Band;
  - a pianist beside his group: Robert Glasper and the Robert Glasper
    Experiment;
  - a band beside a person: Santana and Carlos Santana, though the importer
    finds one MusicBrainz candidate for both;
  - joint billings, each a registry entry beside its acts:
    `alicia-keys-and-justin-timberlake`,
    `michael-jackson-and-justin-timberlake`,
    `justin-timberlake-chris-stapleton`,
    `rihanna-kanye-west-and-paul-mccartney`, `the-beatles-isley-brothers`,
    `talking-heads-tina-weymouth`, `stevie-wonder-chaka-khan`,
    `stevie-wonder-nathan-watts`, `sly-and-the-family-stone-larry-graham`,
    `carole-king-rob-galloway`, `drake-scary-pockets`,
    `lou-donaldson-soulive`, `christina-aguilera-lil-kim-mya-pink` and
    `ike-and-tina-turner`;
  - look-alike names of different acts: Chet Baker / Chet Faker, Lorde /
    Lordi, J. Cole / JJ Cale, Hanson / Tansen, The Beatles / The Eagles,
    TLC / Terri Lyne Carrington, Devo / DeVotchKa, Queen / Queen Latifah,
    Pink / Pink Floyd, Drake / Nick Drake, Verdi / Monteverdi, Lotus / Flying
    Lotus, Franco / Ani DiFranco, Train / Meghan Trainor, Liszt / Lizzo,
    Wilco / Witch, Rufus / Rufus Wainwright, The Family / Sly and the Family
    Stone.
- **Prose left as written** where "The" is only an article ("The Commodores
  release…", "a Beatles single", "CCR's signature songs"). The registry's
  "Isley Brothers" lacks MusicBrainz's "The" and is no duplicate.
- **Artist images keep their file names.** Six songs' `artistImageRef` still
  name a removed slug's picture (`the-commodores.webp` on Brick House and
  Easy, `the-red-hot-chili-peppers.webp`, `the-average-white-band.webp`,
  `rufus-and-chaka-khan.webp` on Ain't Nobody and Sweet Thing). The files
  exist and no code builds an image path from a slug, so nothing is broken;
  renaming them changes what students load, so it is the owner's call.
- **The importer's ledger.** `record-slugs.json` is only ever added to, so a
  later run cannot rename a record. For the merge, the 22 release slugs named
  for a removed artist were pruned by hand before any `decisions.json` was
  committed. Examples: `beatles-abbey-road`, `boyz-2-men-ii`,
  `temptations-skys-the-limit`. The rerun made each again under the kept
  name, for the same MusicBrainz id (`the-beatles-abbey-road` and so on). The
  owner approved it as a one-off exception to the rule. The rerun also added
  7 records: 4 people, a label, a release and a studio.
- **The importer's rerun**, after the merge and the Rufus fix:
  - **Requests:** 16 to MusicBrainz in the rerun. One was a search for
    `rufus`; 15 (one a retry after a 503) filled the four songs never
    searched (Come and Get Your Love, I Hope You Dance, Pride and Joy, Sweet
    Dreams). Four more to MusicBrainz and one to Wikidata were made during
    the merge. The cache holds 6,602 responses (6,582 before).
  - **Artists:** 5,877 suggestions for 648 artists (sure 3,023, likely
    2,820, ambiguous 34), against 5,932 for 654. Identity: sure 354, likely
    294, ambiguous 34, weak 166, no candidate 35. No MusicBrainz artist is
    picked for two of ours any more (ten were).
  - **Songs:** 7,783 suggestions for 574 songs (sure 5,571, likely 2,212),
    against 7,757. 580 songs match a recording (495 sure, 85 likely), and 35
    are ambiguous.
  - **Records made first:** 413 releases, 177 labels, 208 studios, 1,025
    people and 38 towns. Credits link 1,315 times to our artists and 2,800
    to people made; 2,286 stay names.
  - **Checks:** every manifest hash matches its file, and no artifact names
    a removed slug. What is left is MusicBrainz's own text quoted in
    evidence, the real label `rolling-stones-records`, and pin-key text.
  - **Oddities, not fixed:** `sweet_dreams` now matches, at the likely tier,
    a 1987 "Sweet Dreams" recording found only on compilations
    (MusicBrainz's original is "Sweet Dreams (Are Made of This)"). It offers
    no rows, but P4's `KNOWN_WRONG` list may want it. `pride_and_joy` scores
    ambiguous, beside a 1978 take found only on compilations.
- **The calibration sheet** was drawn again under rule 2 (F1 and F2 above
  describe it). It is unlabelled and both runs stay `calibrated: false`,
  because the owner chose the bulk import over labelling it.
- **What moved, measured** on the repo snapshot through `buildGraph`: 4,801
  nodes and 18,079 edges before this work, 4,776 and 18,101 after, with no
  grammar violations. By change:
  - gospel: +30 `in_genre` edges;
  - the Valerie fold: −1 node (the song event with no chart) and its one arc;
  - the 23 merges: −23 artist nodes and −7 edges net. 27 went, and 20 came
    back under the kept act; the rest joined edges the kept act already had;
  - Remind In Light: −1 node. Its `based_in` edge went, and Andy Grammer's
    pin is drawn now, so the edge count is unchanged;
  - the one orphan artist left is the placeholder `unknown-artist`.
- **On the globe**:
  - the artist index went from 877 to 858. 24 names went, and five that
    were registered but named by no event joined: Jimi Hendrix, Eurythmics,
    Gladys Knight and the Pips, Lee Ann Womack and Redbone;
  - 34 event cards changed chips: 33 to the act kept, and one for the comma;
  - the events are unchanged at 1,723;
  - song pins went from 362 to 349.
- **What students see changed:** event titles and chips under the kept
  names, four song billings without "The" (Brick House and Easy by
  Commodores, Californication by Red Hot Chili Peppers, Pick Up The Pieces
  by Average White Band), and one description: Ordinary People's globe
  card now names John Legend, not "Joe Legend" (the song file's
  `historicalDescription`, which the card's text is copied from, too). The
  song list's characterization hash moved for the four billings alone:
  putting them back gives the old hash.
- **Tests re-pinned**, each number with its reason beside it:
  `slugPatterns`, `buildTableModel.repo`, `contentMockServer` and
  `suggestionEndpoints` (883 artists; the last is now exact, where it said
  more than 900); `repoSnapshot`, `contentMockServer` and `integrity` (349
  pins; one orphan artist); `linking/repo.test.ts` (349 entries, 328 Cities
  offered); `deriveGraph` (still 235 pins drawn, one out and one in);
  `artistIndex.characterization` (858, three hashes); `studentPath` (the
  list hash); and `decisionsBudget`'s measurements (Stage 1 2.92M
  characters; the song review 10.4M for 5,562 of 5,571 sure rows).

### Open after Amendment 5 (30 September 2026)

**For the owner** (each is a data call or student-visible, so none was made
here):

1. **Calibration.** Superseded (30 Sep 2026). The sheet was drawn again
   with only artists who have songs, as the owner asked (rule 2: 100 of 100
   with songs, 68 sure picks). The owner then chose to import everything in
   bulk instead of hand-checking it (Amendment 6, P4). The sheet stays
   unlabelled and both runs `calibrated: false`. Labelling it later still
   works as before: fill each `label`, then run
   `npx tsx src/scripts/enrichment/importSuggestions.ts calibrate`.
2. **Song calibration.** Superseded the same way. The song half's 5,571
   sure rows (after the rerun) go in with the bulk import, each marked
   unconfirmed with its source.
3. **The registry's duplicates.** Resolved (30 Sep 2026). 23 were merged,
   removing the old spelling and moving its tags. They are the ten "The"
   pairs, eleven misspellings, "CCR" and Rufus's billing (Boyz II Men and
   Rufus among them). The alias "Andy Grammar" and the non-artist "Remind In
   Light" went the same way. The Rufus billing stays as printed on its two
   songs. See
   [The owner's answers as built](#the-owners-answers-as-built-30-september-2026)
   for the pairs, what was kept separate and why, Joe Legend's pin, and the
   ledger pruning the owner approved as a one-off.
4. **`gospel`.** Resolved (30 Sep 2026): the owner mapped the progression
   style to the gospel subgenre. `PROGRESSION_STYLE_TO_GENRE` may now name a
   subgenre, as an artist's `genreIds` may, and the 30 gospel progressions
   gain `in_genre` to `subgenre:gospel` (not a new node: the globe's Gospel
   events, scenes and instruments already reach it), which walks up to Funk.
   `african` stays unmapped. Still the owner's to decide: Gospel's parent is
   Funk in the subgenre table, so the Genre table shows it only under "Show
   subgenres", and its progressions count in Funk's row. Its own umbrella
   would be an entry in `genres.ts` and Gospel and Gospel Choir re-parented
   in `genreTags.ts`; the progressions follow, since a genre id wins.
5. **`instrumentGenres.ts`**, 105 rows over 48 instruments, and the genre
   table's parents it runs through (A2 + C1 above). Resolved: the owner
   confirmed the table correct (30 Sep 2026); no code change.
6. **Plain instrument ids.** The sources name a plain guitar, keyboard,
   bass or saxophone (on artists and in song credits, after the 30 Sep
   rerun: guitar 208 and 305 times, keyboard 56 and 164, bass 17 and 97,
   saxophone 27 and 36), and the
   instrument list has no plain id for any, so an artist's is dropped and a
   credit's reads "not in our list" and is only likely. Adding the ids lets
   them through.
7. **"Accept the N sure ones".** It accepts sure rows from an importer run
   not yet calibrated, as one-at-a-time accepts by whoever is on the row
   (never the City, which goes alone with its pin report), on an artist's
   row and, once the act's identity is accepted, on a song's or a release's
   (the final review found it never showed there; it does now). Keep it, or
   hold it until calibration.
8. **Portland, Maine and Manila Sound**, the registry entries the matcher
   reads as artists (the guard test lists both as waiting), with the other
   non-artists in A2 + C1's list.
9. **Committing.** `src/scripts/enrichment/suggestions/` (11 files,
   11.6 MB) and `calibration/artists-100.json`, then after each review
   session the `decisions.json` the Table's banner downloads, into the same
   folder. None is committed yet; until it is, a reset of the mock loses the
   decisions made since. Both folders are in `.prettierignore` (their files
   are one row per line on purpose), so the push hook's `prettier --check`
   passes with them.
10. **The orphan `song-valerie_bbc_live_version`.** Resolved (30 Sep 2026):
    the owner confirmed it is the song `valerie` (Amy Winehouse, live at the
    BBC). It keeps its pin and video, and the import-free
    `src/components/atlas/data/songEventAliases.ts` names its song
    (`songIdForEvent`: the alias, else the id without `song-`). The globe's
    lead-sheet button opens `/songs/valerie`, `canonicalId` folds the event
    onto `song:valerie` (its one arc, to the record, would be the song
    influencing itself, so `edgesForInfluenceArcs` drops an arc whose ends
    fold onto one node), and the mock's check on song events, the mirror's
    "Edit song" and the Table's row links read the same alias, so a Globe
    events publish of the repo data goes through again.
    `songEventLinks.test.ts` holds every alias to a real song and fails a
    stale one. Still open: the event says 2000, the placeholder year
    (`docs/globe-review/event-corrections.md` §3 suggests 2007, not
    double-checked). The mock imitates today's API check on song events,
    which must read the alias too, or a real publish still refuses it. The
    contract now asks for that (§7, and "For Ryan" item 6).

Still open from the records above: the "Washington" pin key (the "andy
grammar" key was re-keyed on 30 Sep 2026) and the city scene strings the
genre table does not know (A2 + C1), and
whether a song with a studio id takes the studio's city over its session's
city text (C2).

**For Ryan** (each is in `docs/console-content-api-contract.md`):

1. The `/suggestions` endpoints and `features.suggestions` (§10), with the
   committed `decisions.json` and the artifacts as the import payload.
2. A revision check on `PUT /items`: an `expectedRevision` that answers 409
   when the item has moved (§5b). Until then the console re-reads and merges
   before every save.
3. The export `revision` field (§5b), which that check and the working
   graph's fingerprint would both use.
4. Suggestion counts and ghosts sent per row (§10), so a table need not read
   every suggestion: the Artists table reads 6,045 rows in 7 pages, 3.5 MB.
5. Re-deriving a lead act's `song-` events when an artist release changes
   its `basedInPlaceId` (§5b), so song pins follow a City; the mock does it.
6. The song-event alias (§7, and the version 4 draft): the check on song
   events reads `src/components/atlas/data/songEventAliases.ts`
   (`songIdForEvent`), so `song-valerie_bbc_live_version` publishes as the
   song `valerie`. Without it a Globe events publish of the repo data is
   refused.

**In the code:**

- **Table.** The dry run does not show the studio text an accept fills
  (C20 fills it on the server). Ghost chips for credits land in the right
  column now but draw nothing there (a credit is an object, not a slug).
- **Stage 1.** The song-pin mapping dry run planned for E (design §5.1:
  what `artistLocationMapping.json` would hold from the hometown decisions)
  was never built; it is needed before v5 retires `artist_location`.
- **Publishing.** The Changes popover's "Publish Artists" and the Artists
  row's Publish do not show the pin report; the tab's section does.
- **Row panel.** Until a save, the unsaved-changes view keeps a retitled
  event's guesses and does not bring song pins back when a City is cleared;
  the Connections columns show the saved version ("As saved"); New panels
  have no view. Passing the working snapshot from `TableView` into the panel
  lifts the first two.
- **Importer.** The Ed Sheeran release slugs `ed-sheeran--2014` and
  `ed-sheeran--2017` fail the release pattern (the 3 rows needing them and
  the 2 Label rows on them are refused); MusicBrainz's "Hitsville" became a
  new studio, `hitsville`, beside the pilot `hitsville-u-s-a`; a performing
  credit for the song's own solo act is emitted without `primary` (458
  performer and vocals rows for the act they rest on, 405 of them sure) — accepting one now bills the act (`apply.ts`), but the next
  emit should mark it too.
- **Mock storage.** Store each record once in the saved log and prune
  release snapshots sooner, to bring a save with every sure song row
  accepted back under 8 M characters.
- **Graph.** A city saved in the console places nothing in the working
  graph (`places.ts` indexes the code's `CITIES` only); Integrity's `fixAt`
  drops `statedBy` (the page finds the pin itself); the full editor's Back,
  save and delete do not return to the Table row; a save refetches every
  kind's export (about 14 requests); hint and hollow chips are below AA
  contrast.
- **Contract.** The version 4 hand-off at the close of E: `artifactsVersion`
  4, every `handedOff` its `sha256`, no `draftVersion`.
  `docs/phase-2-api-handoff.md` still names the deleted `ProgressionEditor`.

### Amendment 6: import done (30 September 2026)

The owner asked to bulk import everything now, and to update the Table
with all of it. The import ran into the repo's data files on the owner's
machine (`npx tsx src/scripts/repoContent/importAll.ts`, artists, then
songs, events and progressions). Nothing is committed: `git diff` is the
review, and students see it only once the owner commits and deploys.

- **What went in.** 13,530 values and 2,020 new records (1,022 artists,
  411 releases, 349 `pin: false` places, 133 labels, 105 studios) in 610
  files. Students gain credits on 561 songs that had none (6,325 credits)
  and a year on 58 undated songs. No globe pin moved. The repo graph went
  from 4,776 nodes and 18,109 edges to 8,154 and 34,205.
- **Left for a person.** Sources disagree on 285 fields (625 rows); 60
  rows conflict with a stated value; 36 are ambiguous; 1,297 outside-id
  rows are never written. A second run plans nothing.
- **No outside catalogue on the site** (owner, 30 Sep 2026). No data file
  the site reads names either catalogue, links to it or carries one of its
  ids, and no console or student text names them (the guard is
  `src/features/admin/__tests__/noSourceNames.test.ts`). Every accept of a
  suggestion with an outside provider, by the import or by a person (one,
  in bulk, or a replace), is written bare, and so are the records it makes
  (`fromOutside` in `apply.ts`, `bare` in `decide`). The repo store refuses
  any save that would add a catalogue's name, link or id to a data file
  (`refuseCatalogueMentions`). The trail stays in developer tooling under
  `src/scripts/`: the importer's artifacts and `decisions.json`.
- **Plain data** (owner, 30 Sep 2026). Imported values carry no unconfirmed
  mark and no source, look like hand-entered ones, and do not count as
  unreviewed. The unconfirmed style stays for other guessed values.
- **The review's fixes.** Six studio slugs ended in an outside id's first
  characters; they are named by place or years now. Values the review found
  wrong were taken out and rejected in the log: two film producers and a
  1964 album on "Dock of the Bay", four albums released 5 to 38 years after
  their recordings, and the end year on 12 groups still active and on Eric
  Clapton. Handel and Palestrina gained the years they died. Seven
  credited-as spellings use the app's names, and each song bills its own
  act first. From now on the import leaves for a person any row whose own
  evidence doubts it (`doubtOf` in `importRules.ts`). The Artists table,
  3,223 rows, builds in about 42 ms (budget 60).
- **Rollback.** The owner summary and the backup are in the session's
  scratchpad (`a6/import-result.md`, `p4-backup/restore.sh`). A restore puts
  back the data files only, and refuses if a file changed since.
- **Still open.** If production sets `VITE_CONTENT_CDN_URL`, students read
  songs from the CDN and a deploy does not show the new credits. Today's
  API schema (level 0) refuses 602 of the 640 repo charts until song v2.
  2,226 imported credits name someone with no artist record.

### Amendment 7: Cortex, the Obsidian-style Mind Map (1 October 2026)

The owner asked for the Mind Map to look and work like the graph view in
Obsidian, which he uses for his own notes: _"I want to update the look and
function of the Mind Map. Obsidian is installed on this computer with a
Second Brain. Review how that works. Create a plan to make the Music Atlas
Mind Map look like Obsidian."_ The plan is
`~/.claude/plans/i-am-changing-how-vectorized-fairy.md`. It is built and
verified, and nothing is committed. The ring map of checkpoint 1d
(`MindMap.tsx`, `layoutEgo.ts`) is gone. This section overrides decision 12
in §2.2 and the Rendering and Interaction bullets of §3.5.

**The owner's decisions (1 October 2026).**

1. **The whole Atlas is the default view**: one global graph of every item,
   as in his reference screenshot of an Obsidian vault. "Open in Cortex" from
   a row or a page opens a **local graph** around that item instead, with a
   depth of 1 to 5 steps and switches for incoming, outgoing and neighbour
   links.
2. **Colour groups**, edited as Obsidian's are: a query and a colour per
   group, reordered, added and deleted, with the first match winning.
3. **A click on a dot opens that item's Table row beside the graph**, where
   it can be read and edited without leaving the graph.
4. **The ring map is replaced.** The accessible "Connections of X" table
   stays, as the List view.
5. **Cortex.** The Table section of the sidebar and the Mind Map are both
   renamed Cortex, with a new outline icon. The graph is the section's
   default view at `/console/cortex`; a row beside it is
   `/console/cortex/:table/:row`; Integrity and Links are
   `/console/cortex/integrity` and `/console/cortex/links`. The table views
   keep `/console/table/:table/:row`, and old `/console/content/graph*` links
   redirect with their query. Code names (`MindMapPage`, `graph/map/`) stay.
6. **The app's own background**, `--ui-background` (#101012), "not dark
   navy". The canvas is transparent over the page, and the panels use the
   console's surface tokens.
7. **The app's twelve colours** (requested the same afternoon): _"use all 12
   of the app colors. Do not use white for a node, use white as the
   highlight connections color instead of purple."_ The preset groups are one
   kind family each, in Prism's twelve key colours, read from `KEY_COLORS`
   (`map/model/appPalette.ts`) so they cannot drift from the rest of the app.
   A node no group claims is a neutral grey, and hover, selection and the
   local focus are drawn in white.

**Stack.** This reverses decision 12 ("Mind map: no new dependency"). The
graph is Obsidian's own design without its drawing library:

- **Layout:** `d3-force` 3.0.0 and `d3-quadtree` 3.0.1 (ISC, pinned, with
  their types as dev dependencies), running in a Web Worker
  (`map/layout/layout.worker.ts`). The forces are Obsidian's: centring
  forces at 0.1, links of length 250 with strength 1 over the smaller degree,
  repulsion of −1000 (theta 0.9, minimum distance 30), collision at radius 60
  and strength 0.5, velocity decay 0.4 and alpha decay 0.0228, from a seeded
  random source. The slider mappings are pinned by tests (centre 0.5187 maps
  to 0.1, repel 10 to −1000). At the Atlas's size, d3's own repulsion and
  collision were too slow (about 64 ms a tick at 8,000 items), so
  `forceLayout.ts` replaces them with typed-array versions: a flat
  Barnes–Hut with d3's own test, which matches d3 exactly, and collision on a
  uniform grid, which settles to the same picture (median radius 5,140
  against d3's 5,153).
- **Renderer:** a purpose-built WebGL2 renderer of about 1,000 lines behind
  the `GraphRenderer` interface (`map/render/`). Node positions live in a
  float texture; lines are instanced quads that read both ends from it, so a
  layout tick costs one upload and three draw calls whatever the number of
  lines. Labels are drawn on a Canvas2D layer in Glacial Indifference. A
  one-day spike compared it on the real graph before anything else was built
  and the decision was to go ahead; the sigma.js fallback was never needed or
  installed, and the spike is deleted.
- **Lazy:** all of it loads with the Cortex page. In a production build the
  page's chunk is 204 KB (71 KB gzipped) and the worker is its own 20 KB
  chunk (7.9 KB gzipped). `eagerBoundary.test.ts` refuses `d3-force`,
  `d3-quadtree`, the renderer, its shaders, the layout's client and engine,
  the drawn-graph model, and the canvas with its scene, layout, interaction
  and timelapse modules in anything the app loads eagerly.
  `scripts/verifyProdBundle.mjs` refuses the dev hook's name
  (`__atlasGraphDebug`) anywhere in a build, and the shader's
  `u_atlasNodePositions` in the chunks `index.html` loads (it also fails if
  that name is missing from the build altogether, so a rename cannot switch
  the check off). It takes the build folder as an argument, so a build in a
  scratch folder can be checked.

**What is drawn** (`map/model/renderGraph.ts`, `nodeRoles.ts`, pure):

- **Notes** are always drawn: songs, artists, events, places (cities),
  records, labels, studios and progressions.
- **Tags** are off by default, as in Obsidian. With the Tags switch on, five
  families can each be turned off: Genres (genre, subgenre, scene), Time
  (year, decade, era), Theory (key, mode, vibe), Instruments, and Regions
  (`place:region-*`). With every tag on, the Atlas becomes a hairball of
  stars around them, which is why they start hidden.
- **Curriculum** (teach days and pathways) is Obsidian's "Attachments"
  switch, off by default.
- **Missing items** are Obsidian's unresolved notes: a dim grey at 50%,
  hidden by "Existing items only" (off by default). No group recolours them.
- **Lines:** one per pair of items; both directions merge into one line that
  keeps a flag for each way, for the arrows and for the local graph's
  incoming and outgoing switches. A line is guessed only if every edge behind
  it was guessed, and unconfirmed likewise; each has its own switch, both on.
  "Link confidence" draws them dotted and dashed, but only where a line is at
  least 16 px long on screen, so the zoomed-out picture has Obsidian's single
  style.
- **Size:** a dot's weight is its number of distinct visible neighbours, and
  its radius is node size × 3·√(weight + 1), held between 8 and 30, scaled
  with the square root of the zoom, in device pixels as Obsidian measures
  them. The Orphans switch (global only, on) keeps unlinked items; they
  settle into the outer ring.
- **Search** ("Search items…" under Filters) hides what does not match.
  While a saved search is in force the header shows a "Filtered" chip that
  clears it.

**Global and local in one page.** No `focus` in the URL is the global graph;
`?focus=<id>&depth=N` (1 to 5, left out when 1) is the local graph, walked by
`src/content/graph/localGraph.ts`. Every existing "Open in Cortex" link
therefore opens a local graph unchanged. An old link's `hops` is read as the
depth; the ring map's other parameters are read past and dropped at the
first change. As in Obsidian, the local walk shows a tag but never walks on
through it (two steps from Toto with Tags on reach 30 items rather than
987). The local graph starts from the global positions round its focus at a
mild reheat (0.3) and settles into Obsidian's compact shape; its focus is
drawn at the size cap with a white ring. Each mode keeps its own settings.
The header's Global | Local switch returns to the last focus.

**Groups and the query language** (`map/model/graphQuery.ts`,
`colorGroups.ts`, `facets.ts`).

| Group              | Query                                       | Colour     |
| ------------------ | ------------------------------------------- | ---------- |
| Songs              | `kind:song`                                 | Red        |
| Curriculum         | `is:curriculum`                             | Vermillion |
| Events             | `kind:event`                                | Orange     |
| Year               | `kind:year OR kind:decade OR kind:era`      | Yellow     |
| Location           | `kind:place`                                | Green      |
| Genre              | `kind:genre OR kind:subgenre OR kind:scene` | Sage       |
| Instruments        | `kind:instrument`                           | Teal       |
| Artists            | `kind:artist`                               | Blue       |
| Key                | `kind:key OR kind:mode OR kind:vibe`        | Indigo     |
| Records            | `kind:release`                              | Purple     |
| Studios & Labels   | `kind:studio OR kind:label`                 | Magenta    |
| Chord Progressions | `kind:progression`                          | Pink       |

- The Yellow is the key palette's, one of the twelve the owner named; the
  "no brand yellow" rule is about the console's chrome.
- **Queries:** a space means and; `OR` (in capitals), a leading `-`, quotes
  and parentheses work. Fields: `kind:` (ids, plurals or names, so
  `kind:records` is the release kind), `genre:` (subgenres count toward
  their genre), `place:` (based, born, recorded or took place in it; a
  region holds its cities), `year:1982` or `year:1960..1969`, `decade:`
  (`decade:80s` is the 1980s), `era:`, `status:`, `id:`, `name:`, and
  `is:tag|missing|orphan|curriculum`. Free text matches names. An unknown
  field is a hint and is searched as text; a malformed value is an error, and
  that group colours nothing. Each node's facets are worked out once per
  graph.
- **The editor** follows Obsidian's: a query box, a round colour swatch,
  delete, drag to reorder (Alt+↑/↓ from the keyboard) and "New group",
  which takes the next app colour not yet used. The list doubles as the legend, with counts, and pointing at a row
  lights only that group.
- **One colour source:** `graphVocabulary.ts` no longer has a colour table.
  `kindColor` asks the preset groups what a node of that kind would be, so
  Find, the List view and the preview card agree with the graph.
- Twelve hues cannot all be told apart by every viewer, so the kind is also
  given in words: the hover label, the preview card, the Groups list and
  the List view.

**Interaction**, matched to Obsidian:

- **Hover:** the dot keeps its colour and gains a white ring, its lines
  turn white, its neighbours stay at full strength and everything else fades
  to 20% over 150 ms. Its label always shows.
- **Click** opens the item's row in a drawer beside the graph (a child
  route, so the page, the renderer and the layout survive); items no table
  holds open read-only. **Drag** (past 5 px) pins the dot and reheats the
  layout; letting go unpins it. **Pan** has momentum. **Wheel and pinch**
  zoom by 1.5 for each 120 px of wheel, about the pointer, from 1/128 to 8.
- **Keys** on the graph region: arrows pan (three times as far with Shift),
  `=` and `−` zoom, `0` fits, `/` goes to Find, `[` and `]` step through the
  current item's neighbours, Enter opens it, L opens its local graph, and
  Escape clears.
- **Cmd or Ctrl** over a dot shows a preview card; **right-click** offers
  Open in Table, Open page, Local graph, Copy link and Copy id, or Fit and
  Reset zoom on empty stage. **Find** flies to the item and makes it
  current.
- **The settings panel** (top right, 240 px) has Filters, Groups, Display
  and Forces with Obsidian's ranges and defaults (centre 0.5187, repel 10,
  link 1, distance 250, node size 1, link thickness 1, text fade 0, arrows
  off, orphans on) and "Restore default settings".
- **Animate** grows the whole Atlas year by year, from 590 to 2024, in about
  30 seconds (347 steps), with a year counter and Stop. The Atlas has no
  creation dates, so a node's year is its earliest dated link; undated
  items arrive last. Stopping, or the end of the run, glides the graph back
  to where it had settled.
- **Kept:** settings and groups in `ma-console-graph-settings-v1` (version
  2, checked with zod, with settings from before the app colours brought up
  to date), the camera in `ma-console-graph-camera-v1` every 2 seconds, the
  drawer's width in `ma-console-graph-drawer-v1`, and settled positions in
  IndexedDB (`ma-console-graph-layout`), per filter signature, so reopening
  starts warm. Focus, depth, the List view and the open row are in the URL.

**Performance, measured.** All figures are from headless Chrome on the
real GPU (ANGLE Metal, Apple M3 Max) at a pixel ratio of 2, on the whole
Atlas of 6,942 items and 10,696 links (notes only), from two runs of
`scripts/graphSmoke.mjs` on 1 October 2026 (the ranges cover both) unless
noted. The worst case,
with Tags and curriculum on, is 8,148 items. The headed run on the owner's
Mac is still to do.

| Measure                         | Target   | Measured                                                                                                                                                                  |
| ------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Building the drawn graph        | ≤ 40 ms  | 8–11 ms (15 ms at the worst case)                                                                                                                                         |
| First frame, cold               | ≤ 150 ms | 46–97 ms after the layout starts (mock); 14–385 ms after the drawn graph is built, the longer gaps being the app's own work landing in between (see the long tasks below) |
| First frame, warm               | ≤ 300 ms | 0–9 ms after the layout starts; 58–61 ms (repo) and 129–370 ms (mock) after the drawn graph is built                                                                      |
| Frame rate while settling       | 60 fps   | 57.7–58.6; median frame gap 16.7 ms, 2–3 gaps over 20 ms per run                                                                                                          |
| Frame rate while panning        | 60 fps   | 60.0, every frame gap 16.8 ms or less, no long tasks                                                                                                                      |
| Layout tick                     | ≤ 12 ms  | median 8.0 ms (notes) and 11.0 ms (worst case); the slowest 5% of the worst case's are 12.5–12.7 ms, accepted at Milestone A                                              |
| Settle, cold                    | ≤ 5 s    | 2.6–2.7 s (mock), 2.8–2.9 s (repo); 3.1 s after turning Tags on                                                                                                           |
| Settle, warm                    | ≤ 0.5 s  | 0.61–0.94 s (mock), 0.63–0.65 s (repo), 67 ticks, after the early stop below                                                                                              |
| Local graph round Toto, depth 2 |          | 15 items, 14 links, settled in 64–117 ms                                                                                                                                  |
| Hover response                  | 1 frame  | 6.3 ms on Los Angeles (175 links)                                                                                                                                         |
| CPU when idle                   | none     | frames are drawn only when something changed                                                                                                                              |

- **The early stop** (the lead's decision): a warm start rests once nothing
  has moved more than half a device pixel for 10 ticks, which cut the warm
  run from 170 ticks to 67. A global graph that comes back unchanged (from a
  local graph or a timelapse) resumes at rest with no ticks at all.
- **Long tasks** remain on the main thread when the page loads and after a
  save: 77–92 ms and, with the offline mock, about 330 ms. They come from
  the mock server replaying its log (about 300 ms), the app's working-graph
  build (60–85 ms) and the drawer's table model, not from Cortex, whose own
  share is about 40 ms per graph arrival and 28 ms per save. They need
  measuring against the real API.
- **The timelapse** ran at 59.8 fps (frame gap p50 and p95 16.7 ms) over its
  30 s, and put every dot back within 0 px when it ended.
- **Without a GPU** (SwiftShader, pixel ratio 1) every check passes, at
  4.5 fps while settling and 8 fps while panning: a regression baseline, not
  a target.

**Accessibility.**

- The graph is a focusable region (`role="application"`, described as a
  graph) named by what it holds, "Cortex: 6,942 items, 10,696 links" or
  "Cortex around Toto: …", and described by the key help. The canvases are
  hidden from assistive technology.
- A skip link and the Graph | List switch lead to the List view
  (`?list=1`), "Connections of X" for the current item, the open row or the
  local focus. Its "To" buttons walk the graph one item at a time.
- One polite live region says what the keys made current ("Africa, song, 11
  links, 1 of 3 neighbours of Toto"), what was opened beside the graph, and
  "Layout settled".
- **Reduced motion:** the layout is worked out out of sight with an
  "Arranging… N%" progress bar and drawn once at rest; fades, flights,
  momentum and the timelapse are off.
- **Fallbacks:** without WebGL2 the page opens on the List view with a
  callout and Graph disabled, and runs no layout. A lost WebGL context
  shows "Graph paused" and redraws the same picture when it comes back. A
  layout worker that fails hands its run to the page where it stopped.

**Tests.** The pure modules (queries, groups, facets, the drawn graph, the
local walk, sizes, camera, hit-testing, settings, the timelapse, the
position cache with `fake-indexeddb`) have node tests, and the layout has
seeded determinism and convergence tests. The canvas, the robustness cases,
the timelapse and the settings panel have jsdom tests with a renderer that
records what it is told and the layout running inline. `graphPages.test.tsx`
reads the pages as a person would: the region's name, the List view, the
live region and the URL; it points and clicks where the renderer was told
to draw a dot, and checks depth and old `hops`, incoming and outgoing links,
Tags (`genre:rock` and `year:1982`), Existing items only and Guessed links.
`scripts/graphSmoke.mjs` starts its own dev servers (the offline mock on
5253 and repo mode on 5254, which it only reads, and proves it by comparing
`git status` of `src/content` before and after), checks the region's count,
a canvas that is not blank, no labels at fit, hover, three wheel notches
giving exactly 1.5³ about the pointer, a click opening Toto beside the
graph, the local graph and Tags, records the numbers above, and writes a
JSON report. It refuses port 5179.

**Deleted:** `MindMap.tsx`, `layoutEgo.ts` and its tests, the spike, and
from `graphVocabulary.ts` the colour table, `isHub`, `DEGREE_HUB_EDGES`, the
edge categories, `shownCategories`, `kindPlural` and the `layoutEgo` import.
`egoNetwork` in `deriveGraph.ts` stays (its tests pin it), though nothing in
Cortex uses it now.

**Open.**

- **Look decisions for the owner:** Link thickness 1 (Obsidian's stock, a
  fainter haze on Retina) or 2 (close to the reference's haze); the outer
  ring is almost all chord progressions (674 of 686 orphans), which link
  only through tags; the core is wider than the reference's; the smallest
  dots are about 1.2 CSS px at fit, Obsidian's true size for a graph this
  large. The twelve-colour palette (the app's key colours, in
  `map/model/appPalette.ts`) replaced the earlier palette question, but it
  is interim: the owner has since asked for Cortex's colours to be
  rethought so they do not clash with the colour logic the app already
  uses, which is Amendment 8's work. The swatch's picker of the twelve
  colours was never built for it, and the Groups list shows each preset's
  query but not yet its name ("Songs", "Artists" …).
- **The headed run** on the owner's Mac, for the real targets.
- **Warm settle** misses 0.5 s by 0.1–0.4 s; main-thread long tasks after
  a save miss "none"; and a cold first frame can wait behind the app's own
  working-graph build (up to 385 ms after the drawn graph is ready). All
  three come from work outside Cortex and need the real API to judge.
- **Smaller gaps:** the settings panel's open sections are not kept between
  visits; the parser's hints are not shown in the Groups list; the List view
  filters links but not hidden tag items; a Playwright wheel notch at a
  pixel ratio of 2 arrives as 60 px, so browser scripts send their own
  wheel events.

### Amendment 4, step 2 as built (Publishing folded in)

- `features/admin/content/publishing/`: `PublishingLayout` (header, tabs
  Review & publish · Publish history · Import from repo, lazy tab bodies),
  `PublishingOverview` (`PendingReviewSection`, `PublishKindsSection`,
  `GlobePlacementSection`), `PublishHistorySection`, `ChangesButton`,
  `kindLabels` (the record kinds named until their specs exist),
  `reviewHref`, `publishRun`. `AdminReleasesPage.tsx` is deleted.
- `publishRun` is a module store (`useSyncExternalStore`): one publish at a
  time from anywhere, progress that survives navigation, a `beforeunload`
  warning mid-run. "Publish everything that changed" runs the changed kinds
  in contract order (places, labels, studios, artists, records, songs, then
  the rest) and stops at the first failure, saying what went out before it.
- Restore asks first (AlertDialog). Queue rows have "Show changes": the
  proposal's diff, fetched on demand (`ProposalDiff defaultOpen`), so Approve
  never applies content nobody saw.
- Import from repo: a section inside Publishing; each compare is remembered
  (`songImport/importMemory.ts`) and the tab hides after a clean one (the URL
  still works); after a write it offers Publish Songs inline.
- The edit bar has "Changes (n)" for admins: proposals awaiting review plus
  items changed since publish, Publish for the section's kinds, and Open
  Publishing.
- Verified against the mock: edit Africa's title → Songs "1 pending" →
  Publish everything that changed (1) → Songs v2 → the mirrored song page
  shows the new title.

### Checkpoint 1d as built (the mind map, repo snapshot)

- Engine (built and reviewed by agents): `src/content/graph/deriveGraph.ts`
  (`buildGraph`, `egoNetwork`), `integrity.ts` (`checkIntegrity`: rows,
  coverage, counts), `features/admin/content/graph/layoutEgo.ts`.
- UI in `features/admin/content/graph/`: `repoSnapshot.ts` (every repo
  source by dynamic import, built once per load), `useAtlasGraph` (mode
  `repo`; `working`/`published` arrive in 1h), `MindMap` (SVG over
  `layoutEgo`: pan, zoom, click to select, double-click to focus; hop-2
  labels on zoom or around the selection; dotted = guessed, dashed =
  unconfirmed, hollow = missing), `ConnectionsTable` (the accessible twin,
  with each edge's `via`), `EntitySearch`, `MindMapPage`, `IntegrityPage`,
  `graphVocabulary` (kind colours and labels, the six filter categories —
  Classroom usage waits for Phase 3 — and where a node opens in the app).
- Routes `/console/content/graph[?focus=&hops=&off=&guesses=&unconfirmed=]`
  and `/graph/integrity[?check=&severity=]`, lazy, inside the content area.
  The edit bar's Graph link carries the page's node (`/songs/africa` →
  `focus=song:africa`; the globe's event, artist, pathway and city; an
  Office day).
- What the repo snapshot shows today: about 4k nodes, 9k edges; Africa has
  19 direct connections, 14 of them guesses from names; `origin.artistGlobeId`
  is linked on 1 of 638 songs and credits on none; 745 integrity rows
  (1 error, 15 warnings, 729 worth a look — mostly 706 unconnected nodes).

- After the engine's review (8 `deriveGraph` and 11 `integrity` findings,
  each reproduced, all fixed): a song whose session names a studio but no
  city gets an inferred `recorded_in` to the studio's town; subgenres get a
  code-owned `in_genre` to their parent; partial bodies no longer throw —
  unreadable items are listed on `Graph.unreadable`; `EdgeVia.code` marks
  what code states (arcs, pathways, the Teach year, subgenre parents; read it
  with `isCodeOwnedVia`); integrity takes the globe's event→artist map
  (`eventArtists`, built in `repoSnapshot.ts`) so an artist influence that
  restates an arc between `evt-` events is caught (superseded at C1:
  `eventArtists` is gone, and the check reads the graph's `about` edges);
  a purity test keeps the store, the artist index and React out of the
  graph modules.

### Checkpoint 1g as built (pickers and linking)

- `features/admin/content/entities/`: `rankEntities` (pure: exact, alias,
  normalized, prefix, word, contains, fuzzy within 1–2 edits; context lifts
  within a tier; a total order), `entityKinds` (picker kinds, their content
  kinds and name fields, the repo registries), `useEntityIndex` (repo +
  served — `/export` where the server has it, else the `/items` list — +
  session-created, API winning per id; an authoritative kind drops the
  repo's copy), `EntityPicker` / `EntityMultiPicker` (cmdk with its own
  filtering off; alias hits read "→ Name (alias)"; Tab takes the top hit,
  ⌘Enter creates, Backspace removes a chip; an unknown value is flagged, not
  dropped), `CreateEntityDialog` (looks first: a taken id offers "Use
  existing", near names warn; asks each kind only what its schema needs;
  create-only PUT, 409 SLUG_TAKEN switches to the existing record),
  `RefRow` (unconfirmed + source; source hidden until song schema v2).
- `songEditor/ConnectionsPanel` replaces `CreditsEditor` (deleted): the lead
  act, each credit's and related recording's artist, the related song, the
  twelve filter genres, and the connections the draft states (guesses
  marked) with a link to the graph. Session ids, records and subgenres wait
  for song schema v2 (1f) and say so.
- Verified against the mock: Africa's lead-act picker opens on "Toto", Tab
  links it, the live list turns "performed by toto" solid, and it survives a
  save and reload.
- `/console/content/graph/links` (`LegacyLinkPage` over
  `entities/resolveLegacy.ts`): every unlinked artist name in the store's
  songs (billing line, credits, related recordings) grouped by text and
  graded sure / close / joint billing / no record; "Apply the sure matches"
  dry-runs (`ProposalDiff`) and then writes song by song, id fields only.
  Verified against the mock: 371 names in 640 songs, 370 sure (681 places),
  634 songs written in about 20 s, one name left after a reload.
- Still to do in 1g: the picker's "save the typed name as an alias" offer.

### Checkpoint 1e as built (the song page as its own editor)

- `SongDetailPage` is now the route container (find the song, record the
  visit, "not found"); the page is `SongDetailView({song, slots, layout})`.
  Slots replace one region each (artwork, title, byline, credits, stats,
  actions, video, chart); `layout="document"` lets the page grow and scroll
  as a whole for the editor's sticky toolbar. The student characterization
  snapshots pass unchanged.
- `SongPageEditor` renders that view with inputs in the slots and keeps the
  real `SongCredits` line, drawn from the draft; `coerceSongDraft` makes a
  partial body renderable without its defaults ever being saved.
- `itemEditor/useContentItemEditor` + `ContentItemEditor`, split out of
  `AdminContentEditPage` (which now uses them): seeding and re-seeding as
  before, an identity-aware save (the kind's identity field; create-only for
  a new item where the server supports it), review errors shown (they used to
  vanish), and the content area's unsaved-changes guard — now read from a ref,
  with `markClean()`, so a page that saves and leaves is not stopped by it.
- The song kind's editor is `SongPageEditor`; `SongEditor.tsx` is deleted.
- The mirror's `/songs/:id` has Preview | Edit (`?edit=1`, in the edit bar):
  Edit resolves the store's item by `/items/lookup` or a list scan and opens
  it in place; a song the store lacks opens create-only, seeded from the
  app's copy. A song's globe event's "Edit song" and Publishing's "Review"
  for a song open this page. Verified against the mock: edit, the guard on
  the sidebar, save, Preview, and the table's editor still saving to the list.
- The content stores gained `refresh…Content()` (reload in place, generation
  only rises); the mock's publish uses them, so the globe's derived caches
  pick up a publish without a reload.

---

Paths are relative to the repo root. The base design is "reuse", with the judges' grafts, corrections and this review's accepted objections applied. The load-bearing claims were re-checked against the code on disk, including:

- react-router 6.30.3 `dist/index.js`
- `App.tsx:79`
- `LearnInlet.tsx:1285-1297/1449/1553-1558/1910/1914/1928`
- `chartOps.ts:229-250`
- `songBodySchema.ts:213/275/319` and `songBodySchema.test.ts:26-33`
- `AdminContentEditPage.tsx:203/236-240/373`
- `useAdminContent.ts:156-163/207/259-283`
- `manifest.ts:31-35/115-133`
- `SongCredits.tsx:116-126`
- `contentRefResolver.ts:197-230`
- `artistLocations.json` (362 keys; 134 name a city that is not in `CITIES`, across 86 cities)

---

## 1. Context

The owner wants three things:

1. `/console/content` should look exactly like the app (WYSIWYG), with add, edit and publish affordances.
2. Typed metadata inputs for everything, connecting Artists, Songs, Places, Events, Instruments, Progressions, Records, Studios, Producers and other Artists across Learn, Studio, Globe, Arcade and Teach.
3. A console-only mind map built from that metadata.

Scope set by the owner:

- Frontend plus a precise API contract for Ryan (`music-atlas-api`). The console runs offline against a local mock.
- Teach covers canonical content, which the console mirrors **and edits**. It also covers read-only browsing of teachers' published decks through a new admin read endpoint. Decks feed the graph only as usage signals.
- First slice: the mirror shell for all five segments, then the registry, metadata inputs and graph for Artists, Songs, Records, Studios, People and Places.

Facts that shape the design:

- **Console roles can't open the real app.** `ProtectedPage.tsx:87-92` redirects them from every app route to `/console`, so real app components have to be mounted inside `/console`.
- **The app uses a data router** (`createBrowserRouter`, `src/App.tsx:79`). App components hold many absolute links: `LearnInlet` alone has 62, and tab-bar roots, `ClassroomSidebar`, `SongCredits.tsx:22-31` and `GenreBadge` add more.
- **The song page can't render a draft.** `SongDetailPage` (489 lines) reads `useParams` and the store. `SongLibraryBody` (`SongLibraryPage.tsx:151`) calls `getAllSongs()` at `:156`, and `LearnInlet` renders it with no props at `:1928`.
- **`LearnInlet` always resets to Learn Home when `?tab` is absent.** Its effect at `:1553-1558` overrides `initialTab`. `LearnHome` mounts per-user hooks: `useStreak`, `useExperienceSummary` and `useLastLearnActivity`.
- **The graph is vocabulary only.** 15 EntityKinds and 23 EdgeKinds exist (`src/content/graph/types.ts`), but `deriveEdges.ts` has no runtime consumer. There is no release kind. Label, studio and place ids are minted from strings. Credits and session data exist on 4 of 640 song files.
- **Songs already carry some id fields.** `Song.origin.artistGlobeId` exists (`songLibrary.ts:169-180`, strict schema `:213`) and drives the "X on the Globe" content ref (`contentRefResolver.ts:197-230`). `Song.contentRefs[]` (`songLibrary.ts:183-209`) carries globe, topic and studio ids.
- **The server enumerates 6 kinds and validates song bodies strictly.** Root `credits`, `session`, `composer` and `relatedRecordings` are rejected today (`docs/song-body-schema-gap.md`). The repo's `src/scripts/apiContract/songBodySchema.ts` accepts them, including `Credit.artistGlobeId` at `:275` and `RelatedRecording.artistGlobeId` at `:319`. It is not adopted on the server yet.
- **Saves are upserts keyed by (kind, slug), and the slug comes from `body.id`.** `useAdminContent.ts:259-283` and `AdminContentEditPage.tsx:236-240`. `fetchWithAuth` throws a plain `Error` that drops the HTTP status and body (`useAdminContent.ts:156-163`).
- **Offline, the app never reads published content.** `VITE_CONTENT_CDN_URL` is unset in `.env`/`.env.local`, so stores load bundled data (`manifest.ts:31-35`). `fetchManifest`/`fetchBundle` use plain `fetch`, not `fetchWithAuth`.

## 2. Decisions and constraints

### 2.1 Settled decisions (respected as-is)

- Ids are `<kind>:<slug>`: kebab-case, except that songs and techniques keep snake_case. A song's event is `song-<songId>`.
- Edges are **derived from record fields only**. The single standalone edge store is influence (`eventConnections.ts`). It stays code-owned and is converted to edges during derivation.
- Vocabularies stay in code and read-only.
- `artist` is one kind for people and groups (`group` flag). Producers and engineers are artists with credit roles.
- The artist body is the handoff's `{slug, name, aliases}`, extended.
- `unverified` values are kept and rendered muted.
- A kind appears in the nav only when the API serves it.
- The editor role makes proposals. The song editor is a replica of the published page, with an Advanced section.
- Console kit rules apply:
  - build from `src/features/admin/ui/*` and the `CONSOLE_*` tokens, on `#101012`;
  - no brand yellow in console chrome;
  - regular-weight headings;
  - shadcn primitives untouched;
  - Glacial Indifference only — and, per Amendment 1, the whole app follows.
- Student components stay byte-identical on the student path. Edit props are opt-in only.

### 2.2 Decided here (each conflict resolved once)

1. **Mirror mechanism.**
   - A nested `MirrorRouter` under the data route resets **four** contexts: DataRouter, DataRouterState, Location, and **RouteContext** (`{outlet:null, matches:[], isDataRoute:false}`).
   - `toAppLocation` copies `key` and `state` from the outer location. Otherwise `Router` defaults `key` to `"default"` and breaks `useAtlasTrail.ts:88-100`.
   - The dirty guard is an outer-router `useBlocker` in `ConsoleMirrorShell`. It covers push, replace, `go` (the atlas trail at `useAtlasTrail.ts:111`) and browser Back.
   - The console-role branch of `ProtectedPage` gets a `toConsolePath` backstop for hard loads and anything that escapes.
2. **URL namespace.**
   - The mirror splat is `/console/content/*`.
   - The static prefixes `records`, `graph` and `teach` outrank it (no app route uses them).
   - Kind tables and editors move to `/console/content/records/:kind[/:id]`, so a `studio` kind can never shadow the Studio mirror.
   - Old URLs redirect only for the **6 legacy kinds**. A unit test checks that legacy kinds, reserved console prefixes and mirrored app prefixes are disjoint.
3. **New kinds and identity.**
   - New kinds: `artist`, `release` (UI label "Records"; "record" already means a content record), `studio` and `label`.
   - `KindSpec.identity: 'id' | 'slug'` states which body field is the slug:
     - `id` for song, `globe_event`, `globe_city`, the flows and `artist_location`;
     - `slug` for artist, release, studio, label and `catalog_meta`.
   - It is used by `useContentItemEditor` (replacing the hard-coded `body.id` at `AdminContentEditPage.tsx:236-240`), `CreateEntityDialog`, the mock, `REF_PATHS` resolution and the contract's `SLUG_ID_MISMATCH` rule.
4. **Places have one owner: `globe_city`.**
   - Its body is aligned to `City` (`atlas/types/index.ts:23-33`) plus `aliases` and `pin?: boolean`. `pin:false` marks hometowns that are not globe pins.
   - It is seeded from `CITIES`, which becomes the bundled fallback only.
   - Place id = `City.id`. Regions are `region-<RegionId>` and countries (Phase 2) are `country-<iso2>`; both are code vocabularies.
   - `artist_location` (362 entries) migrates into `artist.basedInPlaceId`:
     - through a dry-run mapping report (alias-aware, name+country, "New York" → `new-york`);
     - combined billings such as "blackstreet and dr. dre" are resolved through credits first;
     - `artist_location` stays live and read by placement until 100% of entries map. Today 134 entries across 86 cities don't.
5. **Reference fields store bare slugs; the field name implies the kind** (`studioId`, `releaseId`, as `DayStub.songId` already does).
   - `src/scripts/apiContract/refPaths.ts` (`REF_PATHS`, no imports) is the single machine-readable map of **every** id-bearing body path → target kind. That includes paths that are not derived (`derive:false`) and deprecated ones.
   - A sync test walks the generated Zod schemas. It fails on any field matching `/Id$|Ids$|GlobeId$/` that is missing from `REF_PATHS`, and on any derived path the derivers don't cover.
   - `src/content/graph/ids.ts` holds the per-kind slug grammar.
   - `<kind>:<slug>` appears only in derivation, graph, URLs and integrity.
6. **Credit artist reference = the existing `Credit.artistGlobeId`** (`songBodySchema.ts:275`). It is not renamed.
7. **One owner per fact.** Inverses and rollups are always computed. Any remaining overlap is caught by an integrity "conflicting owners" row.
   - **Billing.** There is no new `Song.artistIds`.
     - The lead act is the existing `origin.artistGlobeId` (v1; one per song; batch-linkable without v2).
     - Full billing is primary credits (`Credit.primary` + `artistGlobeId`, v1), which is what `SongCredits.tsx:122-126` renders.
     - When a song has primary credits, `origin.artistGlobeId` must be one of them; integrity flags it otherwise.
   - **Song ↔ release** is owned by `song.releases[]`; a release has no tracklist.
   - **Release-level facts** (label, format, year, catalog number, cover) are owned by the release. **Recording facts** (studio, place, recorded year, credits) are owned by the song's `session`/`credits`.
     - `session.label`/`labelId` is used only when the song has no `releases[]`.
     - A release's "recorded at" is computed from its tracks.
   - **Artist image.** `song.artistImageRef` stays. `ArtistRecord` has no `imageRef` in slice 1, because no app surface renders it.
8. **One node per real thing.**
   - `canonicalId('event:song-x') → 'song:x'`.
   - `buildGraph` validates endpoints **after** canonicalization. Violations go to integrity and are never silently dropped.
9. **Edge provenance.**
   - Every derived edge carries `via: {item, path}`.
   - `buildGraph` merges duplicate edges (same from/kind/to/on) into `via[]`.
   - `inferred: true` marks string-resolved edges. They get their own style, filter and coverage count, and are excluded from hop expansion by default.
   - A referenced but absent id becomes a `missing` node, never a silent phantom.
10. **Code-owned metadata** (games, templates, demos, theory topics, techniques, pathways) uses a `catalog_meta` sidecar kind.
    - Slugs are colon-free, with a kebab kind prefix: `<kebab(entity-kind)>-<codeId>`, e.g. `game-chroma`, `studio-template-project-rock`, `technique-eighth_note_chunking`. The `catalog_meta` pattern is `^[a-z0-9_-]+$`.
    - The body is a discriminated union with typed fields only.
11. **Teach.**
    - Canonical Teach content becomes editable kinds (Phase 3).
    - Teacher decks are browsed read-only through `GET /api/admin/teach/published-days`. Their refs come from `activityRef` strings through a contract-specified mapping table. They feed only `usage` annotations on graph nodes, never edges. There are no artist refs on decks; artist usage is computed client-side through song→artist edges.
    - Slice 1 derives Teach and Globe cross-segment edges straight from code (`DayStub.songId`/`globeEventIds`, pathway `eventIds`) as read-only "code" edges.
12. **Mind map: no new dependency.** A pure radial layout rendered in SVG, in a lazy console chunk.
    **Reversed by Amendment 7** (1 Oct 2026): Cortex draws the whole Atlas as an Obsidian-style force graph, with `d3-force` and `d3-quadtree` (pinned) in a Web Worker and a WebGL2 renderer of its own, still in a lazy console chunk. See [Amendment 7](#amendment-7-cortex-the-obsidian-style-mind-map-1-october-2026).
13. **Capabilities.**
    - `GET /capabilities` returns:
      - `kinds[{kind, schemaVersion, bundle, identity, authoritative}]`;
      - `features`;
      - `artifactsVersion`.
    - Fallback: `/overview` rows, then the legacy six. In fallback, every kind is non-authoritative.
    - Song schema levels are **named files**:
      - v0 = today's server schema (rejects credits);
      - v1 = `songBodySchema.v1.ts`, frozen in Phase 0 from today's generated output;
      - v2 = `songBodySchema.ts` as regenerated after the new id fields land.
    - Pickers become read-only ("awaiting API") below the level their field needs.
14. **Ids lock after the first save** (AdvancedFields id is read-only). A Rename action appears when the `rename` capability is served; until then the editor shows "used by N".
15. **Graph snapshot modes are explicit:**

    - `working` from `/export`;
    - `published` from CDN bundles (the mock CDN offline), or the bundled repo data labelled "Repo snapshot";
    - the open draft is overlaid live in the inspector.

    For each kind, the node source is:

    - not served, or served but not `authoritative`: the code registry ∪ API items, with API winning per id;
    - `authoritative`: API only, so deletes and merges stick.

    There is no baseline-plus-delta heuristic.

16. **Preview/Edit mode.**
    - Preview renders exactly what students see (published content).
    - Edit adds status badges, unpublished drafts and inspectors.
    - A Mirror | Table toggle switches between the mirrored surface and `records/:kind`.
17. **Creates are create-only.**
    - New items are PUT with `create:true`. The server answers 409 `SLUG_TAKEN` if the slug exists. Plain `PUT /items` remains the edit upsert.
    - The client never offers "create from repo copy" unless absence is confirmed, by `lookup` or an exhaustive exact-slug scan.
18. **`coerceSongDraft` is render-only.** Every edit patches the raw draft body, as `SongEditor.tsx:70-71` does today.

---

## 3. Architecture

### 3.1 Console information architecture

| URL                                                                                     | Renders                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/console/content`                                                                      | Redirects to `/console/content/home` (Amendment 4), the editors' `consoleHomeRoute`.                                                                                                                                                                                  |
| `/console/content/*`                                                                    | **Mirror.** App path = console path minus the prefix. Examples: `/console/content/songs/africa` ↔ `/songs/africa`; `/console/content/atlas/globe?artist=Toto` ↔ `/atlas/globe?artist=Toto`.                                                                         |
| `/console/content/records/:kind[/:id]`                                                  | The existing tables and editors, moved. Only the `AdminRoutes.contentKind` and `contentItem` definitions in `routes.ts:164-175` change. All **16 call sites in 8 files** follow, including `src/scripts/repairWorklist.ts:133` and 2 in `Sidebar.tsx` (`:40`, `:66`). |
| `/console/content/graph`, `/graph/integrity`, `/graph/links`                            | Mind map, integrity, and legacy-name linking (lazy chunk)                                                                                                                                                                                                             |
| `/console/content/lessons/:genre`                                                       | The course editor, unchanged, inside the content area.                                                                                                                                                                                                                |
| `/console/content/records/vocabulary`, `/console/content/publishing[/history\|/import]` | Amendment 4: the vocabulary, Publishing and Import songs, inside the content area. `/console/vocabulary`, `/console/releases` and `/console/import-songs` redirect.                                                                                                   |

**The mirror shell** (`mirror/ConsoleMirrorShell.tsx`) imports `@/components/ClassroomLayout/dashboard/dashboard.css`. That file is scoped to `.dashboard-root` and defines the `--color-*`, `--glass-*` and `--dash-*` tokens; today only `ClassroomDashboard` and `LandingShell` load it. The shell has two parts:

1. **The mirror bar** (console kit), which holds:

   - segment pills: Home · Learn · Studio · Globe · Arcade · **Teach** (console-only, because the app has no Teach item);
   - Preview | Edit;
   - Mirror | Table (on list surfaces);
   - **context actions** computed from the app location **and filtered by `useCapabilities`**:

     - `/songs/:id` → Edit song;
     - `?artist=X` → Edit artist;
     - `?event=evt-…` → Edit event;
     - `?event=song-x` → Edit song x;
     - `?place=city:x` → Edit place.

     When the kind isn't served, the action opens the owner explanation (`code:<file>`) instead of a dead editor;

   - "Drafts & changes (n)", New ▾ (served kinds only), Publish <kind> (admin, via `usePublishContent`), Graph, Records, an inspector toggle, and "Reset mock" (DEV only).

   Frame-width presets are dropped from slice 1. Tailwind and `matchMedia` breakpoints follow the viewport (`LearnInlet.tsx:1318-1330`, `ClassroomSidebar` `hidden md:flex`), so a narrowed container would render layouts no user sees. A same-origin iframe of a chrome-less mirror route is the Phase 6 option for true widths.

2. **The frame.** A `.console-mirror` root escapes `DashboardLayout`'s `px-6 py-8` padding with the editors' existing bleed pattern (`-mt-8 -mx-6 md:-mx-10`). It is a fixed-height box, `h-[calc(100dvh-var(--mirror-bar-h))]`, so `h-full` consumers work: `atlas.tsx:67-72` and the `LearnInlet` scrollers. Inside it:
   - It copies the `ClassroomDashboard.tsx:26-47` markup (`dashboard-root flex`; content frame `rounded-xl bg-[#101012] p-2`).
   - It renders a **static `h-14` TopRail placeholder** (TopRail itself calls user XP APIs, `TopRail.tsx:46-52`).
   - It renders the **real `ClassroomSidebar`** (156 lines, `useAuthContext` only).
   - `ClassroomDashboard` itself is not mounted, because its hooks at `:16-19` run progress, streak, challenge and award side effects.
   - ~~At a given viewport, the content area is narrower than the app's by the console sidebar's width.~~ Resolved by Amendment 4: the app's sidebar is the console's only sidebar, so the content area is the app's size.

**Per-segment mounts** (`mirror/segments/*`; thin compositions, not replicas):

| Segment                                  | Real components mounted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Placeholdered (per-student, not content)                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Home `/home`                             | `QuickStartSection`, `PathwaysSection`, `SongsSection`, `GlobeSection` (`components/ClassroomLayout/dashboard/*`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Announcements, Welcome, Recent activity, Challenges                                                            |
| Learn `/learn`                           | `LearnMirror` wraps `<LearnInlet initialTab="Songs"/>`. **When `tab` is absent, it replaces the location with `tab=genre ? 'Genre' : 'Songs'`** (other params kept). That is required because `LearnInlet.tsx:1553-1558` resets to Home whenever `?tab` is missing, whatever `initialTab` says, and the real `LearnTabBar` heading (`:36`) and `ClassroomSidebar` Learn item both link to bare `/learn`. `LearnInlet` renders `LearnTabBar` itself (`:1910`). Songs, Genre, Theory, Technique and WorldHarmony all come through as they are. `LearnInlet`'s own `useProgressSummary()` (`:1449`) is a GET under the admin token; it is accepted and recorded in the audit (Q3). | Learn Home (`LearnHome`, `:1914`) is never mounted. The PageInspector lists it as "per-student, not mirrored". |
| Songs `/songs/:songId`                   | `SongMirrorPage` (§3.2)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Favorites, set lists, Save version                                                                             |
| Curriculum `/curriculum/:genre[/:level]` | Adapter onto `AdminLessonCoursePage` (edit). Preview via `GenreLessonContainerV2 {flow}` comes in Phase 4.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | –                                                                                                              |
| Studio `/studio`                         | `StudioTabBar`, `StudioTemplates`, `StudioDemos`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | New project, Recent, Collaborate, and the Library tab (cloud API)                                              |
| Globe `/atlas`, `/atlas/globe`           | `GlobeInlet`, and the full `atlas.tsx` (lazy, WebGL) as a published-state preview. Its `useAtlasNavigate` is relative.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | –                                                                                                              |
| Arcade `/arcade`                         | `ArcadeInlet`, `ArcadeShelf`, `GameCard`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | "Jump back in" reads the admin's local store (harmless)                                                        |
| Teach `/teach`                           | **Not a mirror of the teacher UI.** It is a console-built read-only canonical browser, because the real `UnitPage` is bound to `useParams` and `useAnnualPlan`/`useLocalPlan(cid)` (`UnitPage.tsx:58-85`). The chain is units → day stubs → preview via `seededDayFromStub` (`annual/stubMaterialization.ts:66`) → `deckFromCells` (`slides/deckFromCells.ts:116`) → `SlideRenderer`. Phase 3 adds editing and the "Classroom usage" tab.                                                                                                                                                                                                                                       | Teacher workspaces `/teacher/*`, `/office`, `/classrooms/*`                                                    |

Unmapped app paths (`/studio/editor`, `/arcade/chroma`, `/learn/:mode/:key`, `/settings`) render `NotMirroredYet`. It names the real route and its owner (code file or user data), and later the item's derived connections.

**Page inspector.** `mirror/coverage.ts` plus `PageInspector.tsx` is a static manifest keyed by (pathname pattern, tab). It lists each region's owner:

- `content:<kind>`, with an edit link only when the kind is served;
- `code:<file>`, with its future `catalog_meta` status;
- `user-state`.

This surfaces code-owned content without injecting badges into student components.

### 3.2 WYSIWYG mechanism

**a. MirrorRouter** (`src/features/admin/content/mirror/MirrorRouter.tsx`):

```tsx
const outer = useLocation(); const outerNavigate = useNavigate();
const navigator: Navigator = {
  createHref: (to) => toConsolePath(createPath(asPath(to))),
  push: (to, state) => outerNavigate(toConsolePath(createPath(asPath(to))), { state }),
  replace: (to, state) => outerNavigate(toConsolePath(createPath(asPath(to))), { replace: true, state }),
  go: (n) => outerNavigate(n),
};
// toAppLocation(outer) = { pathname: minus prefix, search, hash, state: outer.state, key: outer.key }
<UNSAFE_DataRouterContext.Provider value={null}>
 <UNSAFE_DataRouterStateContext.Provider value={null}>
  <UNSAFE_LocationContext.Provider value={null as never}>
   <UNSAFE_RouteContext.Provider value={{ outlet: null, matches: [], isDataRoute: false }}>
    <Router location={toAppLocation(outer)} navigator={navigator}><MirrorRoutes /></Router>
```

Why each reset is needed, in react-router 6.30.3 `node_modules/react-router/dist/index.js`:

| Reset                      | Reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LocationContext` = null   | Satisfies the nested-`<Router>` invariant (~`:1193`).                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `RouteContext`             | `useNavigate` branches on `RouteContext.isDataRoute` (`:192-198`). Without the reset, `Link` clicks and `navigate()` call `useNavigateStable` → `router.navigate` (~`:895-916`), which bypasses the navigator; under nulled DataRouter contexts that path hits an invariant. The reset also stops inner `<Routes>` from inheriting the outer `/console/content/*` match (`useRoutesImpl`, `:325-386`). Otherwise 2 segments would be stripped and `/songs/africa` would match as `/`. |
| DataRouter contexts = null | Keeps basename and `router.navigate` logic out of the inner tree.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `key` copied               | `Router` sets `key="default"` when the location has none (~`:1213`). `useAtlasTrail.ts:88-100` records steps on `location.key`.                                                                                                                                                                                                                                                                                                                                                       |

Supporting details:

- No `src` code inside the mirror uses data-router hooks (`useBlocker`, `useLoaderData`, `useFetcher` and similar grep to 0).
- `useSearchParams`, `Link`, `NavLink`, `Navigate` and `useAtlasNavigate` all work unmodified.
- The mirror subtree is wrapped in `<ContentGate needs={['songs','events']}>`. ContentGate triggers the loaders itself (`ContentGate.tsx:36-60`).
- `mirrorPaths.ts` (pure) exports `toConsolePath`, `toAppLocation` and `isMirroredPrefix`. `toConsolePath` passes through paths already under `/console`, for console links rendered inside editors.
- **Dirty guard.** `MirrorGuardContext` is provided by `ConsoleMirrorShell`, and `ContentItemEditor` registers `isDirty`.
  - The shell sits under the outer data route, outside the resets. It calls `useBlocker(({currentLocation, nextLocation}) => guard.isDirty() && leavesOpenEditor(currentLocation, nextLocation))` and renders a console confirm dialog. This is the first `useBlocker` in `src`.
  - Every inner navigation becomes an outer navigation, so this one blocker covers app links, `replace`, `go` (atlas trail) and browser Back.
  - `beforeunload` already exists in the edit page and moves into `useContentItemEditor`.
- **Known leak:** atlas "Copy link" (`AtlasToolbar.tsx:82,87`) copies `window.location.href`, which gives a `/console/content/...` URL. It is noted in the inspector. Phase 2 maps it back through an opt-in `shareUrl` context.

**b. ProtectedPage backstop** (`src/contexts/AuthContext/ProtectedPage.tsx:90-92`). Only the console-role branch changes:

`<Navigate replace to={isMirroredPrefix(pathname) ? toConsolePath(location) : AdminRoutes.root()} />`

It catches hard loads, `window.location` assignments and portal links. Student and teacher branches are untouched.

**c. Opt-in contexts** (null by default, so the student code path is identical):

- `src/content/preview/ContentPreviewContext.ts`: `{ songs?: { all(): Song[]; get(id): Song|null }; adornSong?: (s: Song) => ReactNode }`.
  - `SongLibraryBody` changes one line: `useMemo(() => preview?.songs?.all() ?? getAllSongs(), [preview])`.
  - It gets a `{preview?.adornSong?.(song)}` slot in the row title cell.
  - This reaches the Songs tab through `LearnInlet` without editing `LearnInlet`.
- `src/hooks/PremiumPreviewContext.ts`, read first by `useIsPremium` (`src/hooks/useIsPremium.ts:19`). The mirror supplies `true` (a persona switch in the bar can override it), so `LockedFeatureOverlay`s don't mask content.

**d. Container/view splits:**

- `SongDetailPage.tsx`: the container keeps `useParams`/`getSong` (`:42-45`), the YouTube player, transposition, `recordSongView` (`:75-78`), `SongActionPills`, `FavoriteStar` and `SaveVersionDialog`. The new `SongDetailView.tsx` takes the header, artwork, title and artist line, `SongCredits`, the stat row and the chart region:

  ```ts
  interface SongDetailViewProps {
    song: Song;
    displaySong?: Song;
    backSlot?: ReactNode;
    keySlot: ReactNode;
    actionsSlot?: ReactNode;
    videoSlot: ReactNode;
    chartSlot: ReactNode;
    layout?: 'page' | 'embedded';
    edit?: {
      artwork?;
      title?;
      artistLine?;
      tempo?;
      timeSignature?;
      difficulty?;
      genre?;
      afterCredits?: ReactNode;
    };
  }
  ```

  Each region renders `edit?.x ?? <today's markup>`, and the view imports nothing from `features/admin`.

- `ArtistPanel.tsx` is **not** split in slice 1. It renders only the name, events and places (`ArtistPanel.tsx:17-81`), so none of the edited `ArtistRecord` fields would show. The artist editor uses the atlas `SidePanel`/`PanelRow` frame like the other record editors.
- `SongCredits.tsx` gets opt-in `onPillClick?(target)` and `pillState?(target) => 'unlinked'|'draft'|undefined`. In Edit mode, a pill click scrolls to that row in the inspector instead of navigating. Without these props it behaves as today (`Pill` navigates, `:51-75`).

**e. Editors:**

- `AdminContentEditPage.tsx` (660 lines) is split:
  - `useContentItemEditor({kind,id})` takes seeding, `seedKey` (`:174-189`), save (slug read via `KindSpec.identity`), status, `beforeunload` and the review banner;
  - `<ContentItemEditor kind id onSaved/>` renders it. It **owns the bar-height measurement** that `AdminContentEditPage.tsx:203/373` does today, and sets `--full-editor-bar-h` on its scroll container (MirrorBar height + editor bar height in the mirror), so the chart toolbar's `sticky top-[var(--full-editor-bar-h,0px)]` (`SongEditor.tsx:328`) pins below both bars. In the mirror it stays on the page after save instead of navigating to the list;
  - the page becomes a thin `useParams` adapter.
- `SongMirrorPage` resolves the slug to an item id. The editor loads by **DB id** (`useContentItem(params.id)`, `:108`, which fetches `/items/${id}` at `useAdminContent.ts:254`; list links use `item.id` at `AdminContentListPage.tsx:291-293`). Resolution order:
  1. `GET /items/lookup?kind=song&slug=` when the `lookup` capability is present;
  2. otherwise an **exhaustive paginated scan** of `/items?kind=song` matching `slug === songId`. `search` is title-oriented, so it is not authoritative;
  3. only when absence is confirmed → "Not in the content store yet: Create draft from repo copy". This sends `create:true`, so a race returns 409 `SLUG_TAKEN` instead of overwriting.
- **Preview** = `SongDetailView` over `coerceSongDraft(body)`. **Edit** = `SongPageEditor`, the new `CONTENT_KINDS.song.FullEditor`, which renders `SongDetailView` over `coerceSongDraft(body)` with:

  - `edit` slots from `visual/Editable.tsx` (`InlineText` `:67`, `InlineNumber` `:210`, `InlineSelect` `:296`), `KeyPicker`, `ArtistImageUpload` and `YouTubeField`;
  - `chartSlot` = the chart block moved verbatim from `SongEditor.tsx`: the sticky toolbar at `:328`, `useChartEditing`, `BarInspector` and `ChordEditorPopup`;
  - `afterCredits` = `ConnectionsPanel` (pickers, §3.4) plus `AdvancedFields`.

  **Every slot patches the raw body**: `onChange({ ...rawBody, ...patch })`, as `SongEditor.tsx:70-71` does. The coerced object is never written back.

  The hand-built header at `SongEditor.tsx:152-314` and the dead icons are deleted. The real `SongCredits` renders live from the draft.

- **`coerceSongDraft(body) = { ...makeEmptySong(), ...body, ...coerceSongForPreview(body) }`** (added to `songChart/chartOps.ts`). It is **render-only**.
  - `coerceSongForPreview` (`:229-250`) alone drops credits, session, composer, year and `artistImageRef`, and injects `id:'draft'`, `key:'C major'` and `tempo:120`.
  - `makeEmptySong` is at `songEditor/songDefaults.ts:93`.
  - This fixes the crash at `AdvancedFields.tsx:30,88` caused by the cast at `SongEditor.tsx:65`.
  - A unit test checks that patching the title of a partial body adds no other keys.

**f. Working set for browse (Edit mode only)** (`WorkingSetPreviewProvider`):

- **With `export`:** songs come from `/export?kind=song&view=working`.
- **Without it:**
  - start from the published store `getAllSongs()`;
  - add status badges from the paginated `/items?kind=song` list, keyed by slug (this also fixes the ignored `nextCursor`);
  - fetch bodies only for draft-only items (`/items/:id`, which are few).
- Badges are Draft, Changed, Pending and Archived (`ConsoleBadge` + `CONTENT_STATUS_TONE`, `EditStateBadge`).

Preview mode never uses this provider. It shows published content: the mock CDN offline (§3.6), the real CDN in production.

### 3.3 Metadata model (exact type additions)

**`src/curriculum/types/songLibrary.ts`.** Display strings stay; ids sit alongside them. There is no `Song.artistIds`, because billing uses the existing `origin.artistGlobeId` and primary credits (decision 7).

```ts
export interface SongRelease {
  releaseId: string;
  track?: number;
  unverified?: boolean;
  source?: string;
}
interface Song {
  /* … */ releases?: SongRelease[];
  subgenreIds?: string[];
} // v2
// genreTags stays restricted to the 12 SONG_TAG_TO_GENRE keys (genres.ts:101-114)
interface GlobeOrigin {
  /* artistGlobeId exists (v1) — now documented as the lead-act artist slug */
}
interface Credit {
  /* … */ artistGlobeId?: string;
  /* exists (:275) — artist slug (v1) */ source?: string;
} // source v2
interface RecordingSession {
  /* … */ studioId?: string;
  labelId?: string /* only when no releases[] */;
  placeId?: string /* City.id */;
  source?: string;
} // v2
interface RelatedRecording {
  /* songId, artistGlobeId exist (v1) */ source?: string;
} // v2
```

**`src/content/records/types.ts` (new):**

```ts
export interface RefMeta {
  unverified?: boolean;
  source?: string;
}
export interface ArtistRecord {
  slug: string;
  name: string;
  aliases?: string[];
  group?: boolean;
  members?: ({
    artistId: string;
    from?: number;
    to?: number;
    instrumentIds?: string[];
  } & RefMeta)[]; // on the group
  basedInPlaceId?: string;
  activeFrom?: number;
  activeTo?: number;
  genreIds?: string[];
  instrumentIds?: string[];
  labelIds?: string[];
  bio?: string;
  influencedBy?: ({ artistId: string } & RefMeta)[]; // Amendment 2: derives artist → artist `influenced`
  externalIds?: { mbid?: string; discogs?: string; wikidata?: string };
  unverified?: boolean;
  source?: string;
}
// no imageRef (song.artistImageRef owns artwork)
export interface ReleaseRecord {
  slug: string /* <artist-slug>-<title-slug>[-<year>] */;
  title: string;
  artistIds: string[];
  format: 'album' | 'single' | 'ep' | 'compilation' | 'live' | 'soundtrack';
  year?: number;
  labelId?: string;
  catalogNumber?: string;
  coverRef?: string;
  externalIds?: ArtistRecord['externalIds'];
  unverified?: boolean;
  source?: string;
}
// no tracklist (song owns it); no studioIds/placeId/credits (recording facts live on the song; rollups computed)
export interface StudioRecord {
  slug;
  name;
  aliases?;
  placeId?;
  openedYear?;
  closedYear?;
  coordinates?: [number, number];
  description?;
  imageRef?;
  unverified?;
  source?;
}
export interface LabelRecord {
  slug;
  name;
  aliases?;
  placeId?;
  parentLabelId?;
  foundedYear?;
  defunctYear?;
  description?;
  unverified?;
  source?;
}
export type PlaceRecord = City & { aliases?: string[]; pin?: boolean }; // globe_city body; pin:false = not a globe pin
```

**`globe_event` (Phase 2).** `evt-*` events only gain `artistIds?, placeId?, songIds?, releaseIds?, studioIds?, labelIds?`. Each field has an edge kind (see below). `song-*` events inherit everything from their song through canonicalization.

**`src/content/graph/types.ts`:**

- **`EntityKind`** += `release`, `teach_day`, `pathway` (slice 1). Later: `teach_unit`, `teach_theme`, `lesson`, `theory_topic`, `technique`, `studio_template`, `studio_demo`, `game`, `tour`, `world_scale`. Every new kind ships with a registry, a deriver and an `ids.ts` pattern.
- **`EdgeKind`, slice 1:**

  - `on_release` (song→release)
  - `member_of` (artist→artist)
  - `signed_to` (artist→label)
  - `imprint_of` (label→label)
  - `uses_song` (teach_day→song)
  - `references_event` (teach_day→event|song)
  - `part_of` (event|song→pathway)

  Phase 2 adds `about` (event→artist|song|release|studio|label) and `took_place_in` (event→place). Later: `teaches`, `practices`, `spotlights`.

- **Endpoint widenings (release is limited to release-owned facts):**
  - `performed_by`, `released_on` and `from_era`: `from` gains `release`;
  - `from_era`: `from` also gains `event`;
  - `covers`: `from` gains `artist`.
- **Labels:** forward and inverse `EDGE_LABELS` for every new kind.
- **`Edge`** += `via?: { item: EntityId; path: string }; inferred?: true`.
- **New graph types:**
  - `GraphNode { id; kind; label; status: 'published'|'draft'|'pending'|'code'|'missing'; origin: 'api'|'code'; unverified?; usage?: { publishedDays: number; classrooms: number } }`
  - `GraphEdge = Omit<Edge,'via'> & { via: {item; path}[] }`

**`src/content/graph/ids.ts` (new).** Per-kind `SLUG_PATTERN`:

| Kind            | Pattern                               |
| --------------- | ------------------------------------- |
| song, technique | `^[a-z0-9_]+$`                        |
| event           | `^(evt-[a-z0-9-]+\|song-[a-z0-9_]+)$` |
| progression     | `^\d+$`                               |
| catalog_meta    | `^[a-z0-9_-]+$` (kebab kind prefix)   |
| all others      | kebab                                 |

It also provides:

- `toEntityId` (passes song, event, progression and technique through unchanged);
- `canonicalId`;
- `keySlug` (spelled: `e-flat`, `f-sharp`).

The server regexes are generated from it.

**`REF_PATHS`** (`src/scripts/apiContract/refPaths.ts`, import-free) lists every id-bearing path. Examples:

- `{kind:'song', path:'credits[].artistGlobeId', target:'artist', legacy:'credits[].name', minSongSchema:1}`
- `{kind:'song', path:'origin.artistGlobeId', target:'artist', legacy:'artist', minSongSchema:1}`
- `{kind:'song', path:'origin.scene', target:'scene', derive:false}`, `origin.era` → `era`, `origin.region` → `region` (both `derive:false`)
- `{kind:'song', path:'contentRefs[].globeArtistId', target:'artist', derive:false}`, plus `globeSceneId` → scene, `globeRegion` → region, `globeEra` → era, `topicId` → theory_topic (code), `studioPreset` → studio_template (code); all `derive:false`
- `{kind:'song', path:'subgenreIds[]', target:'genre', vocab:true, minSongSchema:2}`
- `{kind:'progression', path:'song', legacy:true}` and `{kind:'progression', path:'artist', legacy:true}` (`chordProgressionLibrary.ts:19`)
- `{kind:'label', path:'parentLabelId', target:'label', acyclic:'imprint_of'}`

It drives the server's reference validation, rename and merge rewriting, the legacy scan, integrity, and schema-level gating. The sync test (decision 5) keeps it complete.

**Derivation rules:**

- **Lead act:** `origin.artistGlobeId` → `performed_by`. **Billing:** primary credits' `artistGlobeId` → `performed_by`. Both merge into one edge with `via[]`. Without either, `artistSlug(song.artist)` → `performed_by` (inferred).
- **Credit:** `artistGlobeId ?? artistSlug(name)` (inferred).
- **Session:** `*Id ?? string` (inferred), carrying `session.unverified`. `session.labelId`/`label` is derived only when the song has no `releases[]`.
- **`recorded_in`** falls back to the studio record's `placeId` (inferred, `via studio.placeId`). The studio picker never copies the place into the song.
- **Genre:** `genreTags` → `in_genre` via `SONG_TAG_TO_GENRE` (12 ids); `subgenreIds` → `in_genre` via its own deriver.
- **`year`** → `from_era` via `MUSICAL_ERAS`.
- **Influence:** `eventConnections` pairs become `influenced` edges, canonicalized.
- **Endpoints** are validated after canonicalization; violations are reported to integrity.

**Code-owned metadata: `catalog_meta` (Phases 4-5).**

- Body: `{ entityKind; codeId; …variant fields }`, e.g. `game: { practices: SkillTag[]; progressionIds?: number[]; genreIds?: string[]; songIds?: string[] }`.
- The slug is derived as `<kebab(entityKind)>-<codeId>`.
- It respects derive-only because each field is an attribute of one owner, targets are fixed by the schema, there is no generic `related[]`, and edges are computed. A deleted code entity leaves a dangling meta record that integrity flags.
- Game ids come from `GAMES` (`src/features/search/sources/staticIndex.ts:214`, 13 ids; a non-exported `const`). Before Phase 5 it moves to a shared exported module.
- `src/scripts/apiContract/codeCatalog.generated.json` lets the server validate `codeId`s.

**Teach kinds (Phase 3).** Free-text display fields stay; typed ids are added alongside:

| Kind                   | Body                                                                                                                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `teach_unit`           | `UnitTemplate & { genreId?; placeId?; eraId? }`, with `dayStubs: (DayStub & { artistIds? })[]`                                                                                            |
| `teach_theme`          | `Theme & { artistIds? }`                                                                                                                                                                  |
| `teach_activity`       | `Activity`; `atlasResources[]` gain `ref?`                                                                                                                                                |
| `teach_seed`           | `LessonSeed & { songIds? }`                                                                                                                                                               |
| `teach_slide_template` | The copy tables of `slides/templates/{generalLesson,genreLesson,songSession}.ts`. Builders and `presets.ts` zone plans stay in code, because `presets.test.ts` enforces their invariants. |

### 3.4 Metadata inputs

**Components** (`src/features/admin/content/entities/`):

- **`EntityPicker` / `EntityMultiPicker`**, built on `components/ui/command.tsx` (cmdk 1.0.0) inside `popover.tsx`. Primitives are untouched.
- **`useEntityIndex(kinds)`** merges three sources, following the authoritative rule in decision 15:

  - code registries: `ARTIST_REGISTRY` (912, of which 5 are junk), `CITIES`, `SESSION_INSTRUMENTS`, `GENRES` + subgenres, `MUSICAL_ERAS`, songs;
  - served items (list or export);
  - session-created drafts.

  Entries are tagged repo / published / draft / pending.

- **Ranking** (`rankEntities.ts`, pure): exact → alias → normalized (`normalizeArtistName`, which folds `&`/`and`, accents and apostrophes) → prefix and token (`scoreKeywords`, `src/features/search/match.ts:21`) → fuzzy.
  - A `context` prop boosts co-occurring entities, e.g. artists already on this song's release.
- **Alias handling.** Typing "Andy Grammar" shows "→ Andy Grammer (alias)" and writes the canonical slug. Picking a different canonical than what was typed offers "Save 'X' as an alias of Y".
- **`CreateEntityDialog`:**
  - slug preview (`artistSlug`/`toSlug`), written to the kind's identity field;
  - **runs lookup first. An exact slug match blocks creation** and offers "Use existing". Near-duplicates (normalized equality, or edit distance ≤2) only warn;
  - `group` flag;
  - required place for a studio or city (and coordinates for a new city, plus a `pin` choice);
  - PUTs `create:true, status:'draft'`, which becomes a proposal for editors; a 409 `SLUG_TAKEN` switches the dialog to "Use existing";
  - disabled with a tooltip when the kind isn't served.
- **`RefRow`** adds an unverified toggle (muted italic, the `SongCredits` convention) and a `source` datalist (discogs, wikipedia, musicbrainz, allmusic, liner notes).
  - These appear **only where the schema can hold them**: credits, session, related recordings, `releases[]` and `members[]`.
  - Bare-id arrays (`artistIds` on release, `labelIds`, `genreIds`, `instrumentIds`, `subgenreIds`) have no toggle.
  - A test checks that the toggle round-trips through save.
- **Keyboard:** ↑/↓, Enter, Tab accepts the top hit, ⌘Enter creates, Backspace removes a chip.

**Where the pickers appear:**

- **Song `ConnectionsPanel`** (replaces the free-text `CreditsEditor` form):

  - lead act → `origin.artistGlobeId` (v1);
  - credits → `artistGlobeId` and the `primary` flag (role and instrument selects kept, v1);
  - session studio / place (v2); label only when the song has no release;
  - "Appears on" → `releases[]` with track (v2);
  - related recordings (song + artist);
  - **genre:** a multi-select over the 12 `SONG_TAG_TO_GENRE` keys for `genreTags`, because it drives the student filter at `SongLibraryPage.tsx:71`, the page label at `SongDetailPage.tsx:178`, and the server's event `genre[]`. A separate `subgenreIds` multi-select (v2) covers subgenres and regional genres;
  - "Progressions using this song" as a read-only inverse.

  The same panel shows **live connections**: `deriveGraph` run on the open draft, with inferred edges marked.

- **Artist editor** (in the `SidePanel`/`PanelRow` frame): aliases, group and members, based in, labels, genres, instruments, bio, external ids. It states that these fields show only in the console graph until the app cross-links phase.
- **Release, Studio, Label and Place editors:** the corresponding fields, in the same frame.

**Legacy text → ids** (`src/content/graph/resolveLegacy.ts`, pure, `songImportPlan.ts` pattern):

- Scans every `legacy` path in `REF_PATHS`: `song.artist` (347 distinct) → `origin.artistGlobeId`, `credits[].name`, `session.*`, `relatedRecordings[].artist`, `progression.song` and `progression.artist`.
- Emits `{text, occurrences[], candidates[], tier}`. Combined billings ("X and Y") are proposed as two primary credits, not as one artist.
- `/graph/links` groups by text. "Apply N exact/alias matches" does a dry run with `diffBodies` (`review/bodyDiff.ts:35`), then per-item PUTs (proposals for editors). Fuzzy matches need a click. Display strings are never removed.
- **Coverage worklists** put `?worklist=<id>` on the editor. The mirror bar then shows "12 of 638 · Save & next".

### 3.5 Console-only mind map and integrity

- **Snapshot** (`graph/useGraphSnapshot.ts`): explicit modes, per decision 15.
  - Node sources per kind follow the authoritative rule. For example, `globe_city` is served but empty (`docs/songs-wiring-inventory.md:66-78`), so places come from `CITIES` ∪ API until it is authoritative.
  - Vocabularies, `eventConnections`, `curriculumTemplate` stubs and `HISTORICAL_MODULES` are always included.
  - Teach `usage` annotations are added when the `teachUsage` capability exists.
- **Derivation** (`src/content/graph/deriveGraph.ts`, pure). Derivers:

  - existing: `edgesForSong`, `edgesForProgression`;
  - new: `edgesForArtist`, `edgesForRelease`, `edgesForStudio`, `edgesForLabel`, `edgesForPlace` (`located_in` region), `edgesForDayStub`, `edgesForPathway`, `edgesForInfluence`.

  `buildGraph` merges edges, applies `canonicalId`, validates endpoints after canonicalization, and creates `missing` nodes. It also produces an adjacency index and `egoNetwork(focus, hops, filter)`. Scale is about 4.5k nodes and 12k edges, so it runs memoized on the main thread.

- **Rendering** (as first built; replaced by [Amendment 7](#amendment-7-cortex-the-obsidian-style-mind-map-1-october-2026), which deleted `layoutEgo.ts` and `MindMap.tsx` and draws the whole Atlas as a force graph) (`layoutEgo.ts`, pure, deterministic; `MindMap.tsx`, SVG, lazy-loaded in `AdminPages.tsx`):

  - focus at the centre;
  - hop-1 nodes on a ring, grouped into arcs by edge kind;
  - hop-2 nodes on an outer ring;
  - more than 40 nodes per group collapse into "+N" (e.g. `genre:rock`, 324 songs);
  - cap of 300 nodes.

  `ConnectionsTable.tsx` sits beside the canvas as the accessible alternative. It groups by `EDGE_LABELS` forward/inverse wording. Each row shows "from field X" and deep-links to the editor field **only when the kind is served**; code-origin rows link to the owner explanation (`code:<file>`).

- **Interaction:**
  - URL state: `?focus=artist:marvin-gaye&hops=2&edges=people,places&unverified=muted&inferred=muted&mode=working`.
  - Search box is an `EntityPicker`. Click refocuses. Double-click opens the editor in the mirror (served kinds) or the owner explanation (code nodes).
  - Filter chips: People, Places, Recordings, Music, Influence, Curriculum, Classroom usage, **Guessed links**.
  - Unverified edges are dashed at `white/35`. **Inferred edges are dotted** with their own chip. Both are excluded from hop expansion unless toggled (per `types.ts:314-315`).
  - Draft nodes get a dashed ring; `missing` nodes are hollow.
  - Colour is used only for keys (`getKeyColor`).
- **Integrity checks** (`integrity.ts` + `IntegrityPage.tsx`; every row has a Fix link):

| Check                        | Covers                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Dangling / missing           | Refs, including wrong-kind, malformed, and endpoint violations after canonicalization                                          |
| Orphans                      | Nodes with no edges                                                                                                            |
| Duplicate / alias candidates | Normalized collisions, edit distance ≤2, combined "X and Y" entries, the 5 `"`-prefixed junk registry entries                  |
| Cycles                       | `member_of`, `imprint_of`, `located_in`                                                                                        |
| Conflicting owners           | `origin.artistGlobeId` ∉ primary credits; `session.label*` on a song with `releases[]` that disagrees with the release's label |
| Unresolved legacy strings    | Per path                                                                                                                       |
| Draft references             | A published item pointing at a draft                                                                                           |
| Coverage                     | Per field and per segment (e.g. credits 4/640), with **linked vs inferred** counts                                             |
| Unverified                   | Counts and list                                                                                                                |

The coverage, orphan, duplicate and legacy rows work on the Repo snapshot alone. They ship with the read-only map in checkpoint 1d.

### 3.6 Offline mock and capability registration

- **Core:** `src/features/admin/content/mock/contentMockServer.ts`, a pure router plus an in-memory store. In slice 1 it implements every existing endpoint in `useAdminContent.ts:171-453` with real semantics:

  - editor saves → `pendingBody`; approve, reject, discard;
  - release parts and activate; cancel; rollback;
  - responses are SuperJSON strings.

  It also serves `/capabilities` (with `identity`, `authoritative` and `artifactsVersion`), `/items/lookup`, `/export`, `create:true` → 409 `SLUG_TAKEN`, basic `REF_PATHS` warnings on PUT, and asset upload (returns an object URL).

  **Deferred:** rename, merge, DELETE 409 and cycle rejection go to the phase that builds the Rename UI (Phase 2). Teach published-days and synthetic classrooms go to Phase 3. The contract still specifies all of them.

- **Mock CDN.** In mock mode, `contentCdnUrl()` returns `mock://cdn`, and `fetchManifest`/`fetchObject` (`manifest.ts:115-133`) route `mock:` bases through `handleMockRequest`.
  - Seeding writes an initial manifest and bundles from the seed's published set.
  - Release activate rebuilds them, then calls `resetManifestCache`, `resetSongContent` (`songStore.ts:76`) and `resetAtlasContent` (`contentStore.ts:89`), and rehydrates.
  - So a mock publish shows up in Preview (Songs list, `/songs/:id`, the Globe) and in graph `published` mode.
- **`seed.ts`** uses dynamic imports:
  - bundled songs (638 in `bundled.ts`; `thank_you` and `this_must_be_the_place` are not bundled), events and flows, and fundamentals;
  - `ARTIST_REGISTRY` → artist, minus the 5 junk entries (907), matching the contract;
  - `CITIES` → `globe_city`;
  - `artistLocations.json` (362 entries);
  - the progression library;
  - fixtures for the 4 pilot sessions (4 studios, 4 labels, releases).
- **`persist.ts`:** localStorage key `ma-console-mock-v1`, plus Reset. (F1
  moved it to IndexedDB, `ma-console-mock-db`: see F1 and F2 as built.)
  - It stores a **structural patch per changed item** (`{path, op, value}[]`, computed against the seed body; separate patches for `body` and `pendingBody`), not whole bodies. A batch link over every song stays small.
  - `QuotaExceededError` shows a "Mock storage full, Reset" banner and never corrupts silently.
- **Wiring.**
  - `fetchWithAuth` (`useAdminContent.ts:142`) branches on `CONTENT_MOCK = import.meta.env.DEV && import.meta.env.VITE_CONTENT_MOCK === '1'`, then `await import('…/mock/handleMockRequest')`. `contentRequest` (`:131`) goes through `fetchWithAuth`, so it is covered.
  - `fetchWithAuth` now throws a typed **`ContentApiError { status, body }`** (replacing the plain `Error` at `:156-163`). The mock returns real statuses and bodies, so the 404 fallback, 409 `SLUG_TAKEN`/`referrers` and validation problems stay readable.
  - `useAdminAssetUpload.ts` and `manifest.ts` get the same branch.
  - This follows `devBypass.ts:24-25`: Vite folds the constant to false and Rollup drops the chunk.
  - `mswHandlers.ts` wraps the same core for `startMockApi` (`src/test/mockApi.ts:20`; msw 2.15).
  - `scripts/verifyProdBundle.mjs:29-38` `FORBIDDEN` gains `ma-console-mock-v1`, `VITE_CONTENT_MOCK` and `mock://cdn` (and, from F1, `ma-console-mock-db`).
  - `VITE_CONTENT_MOCK_KINDS=legacy` serves only the 6 kinds at song schema v0 to rehearse production.
- **Capabilities** (`src/hooks/data/admin/useCapabilities.ts`):
  - It tries `GET /capabilities` → `{ kinds: [{kind, schemaVersion, bundle, identity, authoritative}], features: { export, lookup, create, rename, merge, asset, teachUsage, suggestions }, artifactsVersion }` (`create` from 1a's contract, `suggestions` from E).
  - On a `ContentApiError` with status 404: kinds come from `useContentOverview()` rows, song = v0, features off, nothing authoritative.
  - If that fails too: the legacy six.
  - `kinds.ts` registers every spec (artist, release, studio, label, chord*progression, later catalog_meta and teach*\*) with `identity`. Records tabs, New ▾, picker create-inline, context actions, graph deep links, `KIND_ORDER` and the Sidebar all filter on served kinds.
  - Field gating follows `REF_PATHS.minSongSchema`.
  - Deep links to unserved kinds show "Not served by the API yet", replacing the silent `globe_event` fallback (`AdminContentEditPage.tsx:94-96`).

### 3.7 Backend contract: `docs/console-content-api-contract.md` (new; linked from `docs/phase-2-api-handoff.md`)

A **draft covering items 1–6 and 8 goes to Ryan at checkpoint 1a** (about day 4–5). It depends only on Phase 0 and `records/types.ts`. It is finalized in 1i together with the contract test suite.

1. **Priority order for Ryan:**
   1. adopt `songBodySchema.v1.ts` (the existing ask that unblocks credit and lead-act links);
   2. `/capabilities`;
   3. lookup + export + `create:true`;
   4. artist;
   5. release, studio, label and `globe_city` v2;
   6. song v2;
   7. validation hardening;
   8. rename and merge;
   9. Teach.
2. **Settled decisions restated:**
   - the id grammar (generated from `ids.ts`) and slug rules per kind;
   - **the identity field per kind**: `id` for song, globe_event, globe_city, flows and artist_location; `slug` for artist, release, studio, label and catalog_meta. `SLUG_ID_MISMATCH` compares against that field;
   - song and event ids are immutable (rename → 409).
3. **Kinds:**
   - `artist`: handoff body + §3.3 extensions. Import **907** entries: the 5 junk film/TV slugs (`artistRegistry.ts:34-38`) are not imported, and they were deleted from `artistRegistry.ts` in Phase 0.
   - `release`, `studio`, `label`.
   - `globe_city`: body = `City` + `aliases` + `pin`; seeded from `CITIES`.
   - `chord_progression` reaffirmed.
   - For each: strict Zod body, list projection (title, subtitle, sortYear, `tags` = aliases), template body, and when the kind becomes `authoritative`.
4. **Schemas and artifacts.**
   - `generateSongSchema.ts` generalizes to `generateBodySchema(source, wanted)`. It emits `songBodySchema.ts` (latest, v2 after 1f) and `recordBodySchemas.ts`, plus `vocabulary.generated.json` (genres, subgenres, instruments, eras, regions).
   - `songBodySchema.v1.ts` is frozen.
   - All artifacts are listed in `src/scripts/apiContract/manifest.json`, with an `artifactsVersion`, per-file hashes, and a level→file map (v1 → `songBodySchema.v1.ts`, v2 → `songBodySchema.ts`).
   - The server reports the `artifactsVersion` it runs in `/capabilities`.
   - `UNKNOWN_VOCAB_ID` / `UNKNOWN_CODE_ID` are **warnings** when the client's `artifactsVersion` is newer than the server's.
5. **Validation from `REF_PATHS`:**
   - Every PUT rejects malformed or wrong-kind refs.
   - Refs to not-yet-existing registry slugs are **warnings** (`UNPUBLISHED_REFERENCE`), so inline-create order and pre-import registry links work.
   - Warnings arrive on a 2xx PUT as `{ item, warnings: ValidationProblem[] }`.
   - `/validate` and publish block `DANGLING_REFERENCE` for published items.
   - Priority 7 adds cycle rejection (`member_of`, `imprint_of`, `located_in`) and `UNKNOWN_CODE_ID` / `UNKNOWN_VOCAB_ID`.
   - `ValidationProblem` gains optional `severity`, `path`, `target`.
   - DELETE of a referenced item → 409 `{referrers[]}` unless `force`.
   - Publishing in dependency order is required.
6. **Endpoints:**
   - `GET /items/lookup?kind&slug` → the list item;
   - `GET /export?kind&view=working|published&omit=sections,audioSources&cursor` → `{items:[{id,slug,status,editState,updatedAt,body,pendingBody?}], nextCursor}`, gzip, with role semantics (`pendingBody ?? body` for the requesting editor);
   - `PUT /items` gains `create: true` → 409 `SLUG_TAKEN` if (kind, slug) exists. Without it, PUT is the existing upsert.
7. **Rename and merge:** `POST /items/:id/rename {newSlug, dryRun}` and `POST /items/:id/merge {intoId, dryRun}`.
   - Both rewrite every `REF_PATHS` occurrence, including `derive:false` paths such as `origin.artistGlobeId` and `contentRefs[].globeArtistId`, in one transaction, and keep a `redirects` table.
   - Merge moves names into `aliases`.
   - Code-owned references (`eventConnections.ts`, `curriculumTemplate.ts`) are reported, never rewritten.
8. **Derivation changes:**
   - song → event carries label, studio, recordedYear and credits (handoff item 3) plus the new ids.
   - Placement order: `origin.artistGlobeId` / primary credits / `artistSlug(artist)` → artist `basedInPlaceId` → `artist_location`, replacing the lowercase-name substring match (`buildGlobeData.mjs:172-185`).
   - **`artist_location` migration:**
     - a dry-run report plus a committed mapping table (alias-aware, name+country), covering the 362 entries, 134 unmapped cities across 86 names, and 16 non-registry keys;
     - unmapped hometowns become `globe_city` with `pin:false`;
     - combined billings are resolved through credits;
     - `artist_location` is retired only at 100% mapping.
   - `derivation-health` keyed by slug.
9. **CDN bundles:** artists, releases, studios, labels, places, progressions, teach-\*.
10. **Teach:**

    - canonical kinds (§3.3);
    - **`GET /api/admin/teach/published-days?entity=<kind>:<slug>&classroomId&since&cursor&limit`** → `{items:[{id, classroomId, teacherId, sourceRef, label, publishedAt, updatedAt, refs: EntityId[]}], nextCursor}`;
    - `GET /api/admin/teach/published-days/:id` → `PublishedDay` (`usePublishedDays.ts:36-47`), a student-safe snapshot per the publish firewall;
    - `GET /api/admin/teach/usage?entities=<kind>:<slug>,…` → `{[entityId]: {publishedDays, classrooms, lastUsedAt}}`;
    - **Ref extraction:** scan every `activityRef` in `snapshot.cells` and the deck's launch tiles (`publishDay.ts:69-88`), and map the grammar in `slides/contentRefs.ts:6-13`:

      | activityRef                                   | EntityId                           |
      | --------------------------------------------- | ---------------------------------- |
      | `song:<id>:chart\|lesson`, `studio:song:<id>` | `song:<id>`                        |
      | `globe:event:<id>`                            | `event:<id>` (canonicalized)       |
      | `globe:city:<id>`                             | `place:<id>`                       |
      | `globe:region:<id>`                           | `place:region-<id>`                |
      | `globe:era:<id>`                              | `era:<id>`                         |
      | `globe:pathway:<id>`                          | `pathway:<id>`                     |
      | `studio:template:<id>`                        | `studio_template:<id>`             |
      | `curriculum:<GENRE>:L<n>[:X]`                 | `lesson:<genre>-l<n>`              |
      | `learn:<mode>:<key>`                          | stored raw, unmapped until Phase 4 |

      There are no artist refs; artist usage is computed client-side through song→artist edges. The client's `activityRefBridge.ts` (Phase 3) implements the same table and is tested against it;

    - admin-only and read-only. The data sits behind `POST /classrooms/:cid/publish`, which has no GET today.

11. **`catalog_meta`** (slug rule per decision 10) and `codeCatalog.generated.json`.
12. **Asset upload** (`POST /asset`).
13. **Contract test suite** (`src/scripts/apiContract/contract/*.test.ts`): runs against the mock by default, or against staging with `CONTRACT_API_URL=…`.
14. **Open questions** for Ryan (§7), including Q10 (`VITE_CONTENT_CDN_URL` in production), asked in Phase 0.

---

## 4. Known bugs fixed along the way

| #   | Bug                                                                                                                                         | Fix                                                                                                                                                                                                                                                                                                                                         | Where                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | Key accidentals collapse: `E♭` → `key:e` (153 songs)                                                                                        | `keySlug`, spelled form                                                                                                                                                                                                                                                                                                                     | `deriveEdges.ts:145-146` → `types.ts:105-112`                                   |
| 2   | `covers` points the wrong way; `collaboration` → `covers`                                                                                   | `RELATION_EDGE` (`deriveEdges.ts:64-70`, used at `:150-156`) becomes direction-aware. `original`: this song covers the other. `cover`: the other artist or song covers this one (`EDGE_ENDPOINTS.covers.from` += artist). `collaboration`: `features` (0 rows use it). Data: The Family becomes `original` in `nothing_compares_2_u.ts:37`. | `deriveEdges.ts`                                                                |
| 3   | `entityId` slugifies event ids (`song-100_days…` → hyphens), technique ids (`eighth_note_chunking` → hyphens) and uses `toSlug` for artists | Pass song, event, progression and technique through unchanged. Delegate artist to `artistSlug`. (A latent trap: the deriver's own `artistId` at `:44` is correct.)                                                                                                                                                                          | `types.ts:115-116`                                                              |
| 4   | `parseEntityId('song:africa:chart')` is accepted                                                                                            | Strict per-kind pattern, no `:` in slugs. `activityRefBridge.ts` handles the Teach grammar (Phase 3).                                                                                                                                                                                                                                       | `types.ts:119-128`, `isWellFormed` `:134-140`                                   |
| 5   | Session edges drop `unverified`; `place:` minted from the city name; `artistGlobeId` and `origin.artistGlobeId` ignored                     | Carry the flag; use id fields first; CITIES name+country resolver                                                                                                                                                                                                                                                                           | `deriveEdges.ts:133-136`                                                        |
| 6   | Pure graph code pulls in `contentStore` (`deriveEdges` → `artists.ts` → store)                                                              | Move `normalizeArtistName`/`artistSlug` into leaf `src/content/graph/slugs.ts`, re-exported from `artists.ts`                                                                                                                                                                                                                               | –                                                                               |
| 7   | Invalid kind silently becomes `globe_event`                                                                                                 | Not-found callout                                                                                                                                                                                                                                                                                                                           | `AdminContentEditPage.tsx:94-96`                                                |
| 8   | `nextCursor` ignored                                                                                                                        | `useInfiniteQuery`                                                                                                                                                                                                                                                                                                                          | `AdminContentListPage.tsx:95`; hook `useContentItems`, `useAdminContent.ts:207` |
| 9   | Partial song body crash                                                                                                                     | `coerceSongDraft` (render-only)                                                                                                                                                                                                                                                                                                             | `SongEditor.tsx:65`; `AdvancedFields.tsx:30,88`                                 |
| 10  | Lesson editor submit sends no note; stale JSON textarea (Phase 4)                                                                           | Pass the note; key the textarea                                                                                                                                                                                                                                                                                                             | `AdminLessonCoursePage.tsx:187-193,417-420`                                     |
| 11  | `ProgressionEditor` wrote `rnb` (map expects `r&b`), `1 maj7` (data uses `1 major7`), string id (data uses number)                          | Gone: the editor was deleted in D, unused. `ProgressionFields` shows the chords and the id read-only and writes styles from the API's `progressionStyles`                                                                                                                                                                                   | `recordEditors/ProgressionFields.tsx`, `genres.ts:133-150`                      |
| 12  | Student-visible, owner-gated (Phase 2): `SongCredits` `?place=<name>`/`?era=1960s` broken; search `/atlas?event=`                           | Use `city:<id>` and `MUSICAL_ERAS` ids; `AtlasRoutes.globe()`                                                                                                                                                                                                                                                                               | `SongCredits.tsx:22-31`; `staticIndex.ts:201`                                   |
| 13  | `fetchWithAuth` discards HTTP status and error body                                                                                         | `ContentApiError { status, body }`                                                                                                                                                                                                                                                                                                          | `useAdminContent.ts:156-163`                                                    |

---

## 5. Phases

### Phase 0: guards and graph correctness (1.5 dev-days; one PR, no UI)

**Create:**

- **Characterization tests** (jsdom, `MemoryRouter` over the bundled store; `innerHTML` snapshots of africa, something, and one song without credits), committed **before** any refactor:
  - `src/components/songLibrary/__tests__/SongDetailPage.characterization.test.tsx`
  - `…/SongLibraryBody.characterization.test.tsx`
  - `…/SongCredits.characterization.test.tsx`
- `src/content/graph/slugs.ts`: `normalizeArtistName`, `artistSlug`, `keySlug`.
- `src/content/graph/ids.ts`: grammar (including technique snake and `catalog_meta`), `toEntityId`, `canonicalId`.
- `src/scripts/apiContract/refPaths.ts`: **every** id-bearing song and progression path, including `origin.*`, `contentRefs[].*` and the legacy `progression.artist`.
- **`src/scripts/apiContract/songBodySchema.v1.ts`:** a frozen copy of today's generated output. Its test asserts the hash recorded in `manifest.json`, so it is never regenerated. `docs/song-body-schema-gap.md` is repointed at this file.
- Tests: `src/content/graph/__tests__/{ids,refPaths}.test.ts`. The `refPaths` test walks the generated Zod schema for `/Id$|Ids$|GlobeId$/`.

**Modify:**

- `src/content/graph/types.ts`: bugs 3–4, `via`/`inferred`.
- `deriveEdges.ts`: bugs 1, 2, 5, 6; `via` on every edge; `inferred` on string-resolved edges.
- `src/components/atlas/data/artists.ts`: re-export from `slugs.ts`.
- `nothing_compares_2_u.ts`: bug 2 data fix.
- `AdminContentEditPage.tsx`: bug 7.
- Extend `types.test.ts` and `deriveEdges.test.ts`:
  - all 9 accidental tonics;
  - `artist:diana-ross covers song:aint_no_mountain_high_enough`;
  - `event:song-100_days_100_nights` and `technique:eighth_note_chunking` round-trip;
  - `song:africa:chart` is rejected;
  - session `unverified` propagates;
  - `origin.artistGlobeId` yields `performed_by`.

**Checks (no code):** ask the owner and Ryan Q10 (is `VITE_CONTENT_CDN_URL` set in production?). The answer decides whether "publish" reaches the app at all.

**Superseded by Amendment 1:** no mirror exemption; the app-wide restyle is Phase 0b.

### Phase 1: first slice, Foundation plus Songs/Artists end to end (about 25 frontend dev-days; each checkpoint ships behind capabilities)

**1a. Record types, generator, contract draft (2.5 days)**

Create:

- `src/content/records/types.ts`
- `src/scripts/apiContract/recordBodySchemas.ts` (generated) + `__tests__/recordBodySchemas.test.ts` (seeds validate; typos rejected)
- `vocabulary.generated.json` + its generator
- `src/scripts/apiContract/manifest.json` (`artifactsVersion`, hashes, level→file map)
- **`docs/console-content-api-contract.md` draft** (§3.7 items 1–6 and 8), plus the pointer line in `docs/phase-2-api-handoff.md`. **Sent to Ryan at the end of 1a.**

Modify:

- `generateSongSchema.ts` → `generateBodySchema`.
- `REF_PATHS`: record kinds.

**1b. Mock, capabilities, records relocation (4 days)**

Create:

- `content/mock/{contentMockServer,seed,persist,handleMockRequest,mswHandlers}.ts`, with the scope in §3.6 (existing endpoints, capabilities, lookup, export, `create:true`, mock CDN).
- `src/hooks/data/admin/useCapabilities.ts`

Modify:

- `useAdminContent.ts`:
  - mock branch at `:142`;
  - `ContentApiError` (bug 13);
  - widen `ContentKind` (`:15-21`);
  - `useInfiniteContentItems`, `useContentLookup`, `useContentExport`; `create` on save;
  - optional `ValidationProblem` fields and PUT `warnings`.
- `src/content/manifest.ts`: mock CDN branch.
- `useAdminAssetUpload.ts`: mock branch.
- `scripts/verifyProdBundle.mjs`: new markers.
- `src/constants/routes.ts:159-175`: `records`, `graph`, `integrity` and `links` routes.
- All 16 call sites in 8 files, including `src/scripts/repairWorklist.ts:133` and `Sidebar.tsx:40,66`.
- `src/features/admin/AdminPages.tsx:214-228`: replace the `:kind` routes with records routes, the mirror splat and a lazy graph.
- ~~`consoleRoles.ts`, `src/layouts/DashboardLayout/Sidebar.tsx`: Content → mirror; add the Vocabulary link.~~ Done differently in 1b.0 (Amendment 4).
- `AdminContentListPage.tsx`: served-kind tabs, pagination; it becomes the Table mode.
- `kinds.ts`: `identity`, `entityKind` and `segment` fields; `KIND_ORDER` derived from served kinds.

Reuses: the `fetchWithAuth`/SuperJSON path, the `devBypass.ts` guard pattern, `startMockApi`, `resetManifestCache`/`resetSongContent`/`resetAtlasContent`.

**1c. MirrorRouter, shell for all five segments, inspector (5 days)**

Create in `content/mirror/`:

- `MirrorRouter.tsx`, `mirrorPaths.ts`, `MirrorRoutes.tsx` (including the `LearnMirror` tab normalizer)
- `ConsoleMirrorShell.tsx` (dashboard.css import, fixed-height frame, TopRail placeholder, outer `useBlocker`), `MirrorBar.tsx`, `contextActions.ts` (capability-filtered), `MirrorGuardContext.ts`
- `coverage.ts`, `PageInspector.tsx`, `NotMirroredYet.tsx`
- `segments/{Home,Learn,Studio,Globe,Arcade,Teach}Mirror.tsx`

Also create:

- `src/content/preview/ContentPreviewContext.ts`
- `src/hooks/PremiumPreviewContext.ts`

Modify:

- `ProtectedPage.tsx:90-92`: the backstop.
- `useIsPremium.ts`: opt-in context read.
- `SongLibraryPage.tsx:156`: preview read, plus the adornment slot in the row title cell.

Reuses: `ClassroomSidebar`, dashboard sections, `LearnInlet`, `StudioTemplates`/`StudioDemos`, `GlobeInlet`, `atlas.tsx`, `ArcadeInlet`, and the Teach pure chain `seededDayFromStub` → `deckFromCells` → `interactionsForSlide` (`slides/deck.ts:79`) → `SlideRenderer`.

Audit task: list every fetch made by the mounted inlets, and placehold any that call user APIs. Known so far:

- `LearnHome`: never mounted.
- `LearnInlet.useProgressSummary`: accepted and documented.
- `TopRail`: a placeholder.

**1d. Read-only mind map, "Repo snapshot" (2 days)**

Create:

- `src/content/graph/deriveGraph.ts`
- the coverage, orphan, duplicate and legacy parts of `src/content/graph/integrity.ts`
- `content/graph/{useGraphSnapshot.ts (published/repo mode only),layoutEgo.ts,MindMap.tsx,ConnectionsTable.tsx,MindMapPage.tsx,IntegrityPage.tsx}`

Reuses: `EDGE_LABELS`/`EDGE_ENDPOINTS`, `allConnections()`/`findDanglingConnections` (`eventConnections.ts:23-32`), `fetchBundle` (`manifest.ts:115`), `HISTORICAL_MODULES`, `curriculumTemplate`.

This lets the owner see the headline graph and the coverage gaps (credits on 4/640) about two weeks earlier.

**1e. Song WYSIWYG (3 days)**

Create:

- `src/components/songLibrary/SongDetailView.tsx`
- `content/ContentItemEditor.tsx` (owns `--full-editor-bar-h`), `content/useContentItemEditor.ts` (identity-aware save)
- `songEditor/SongPageEditor.tsx` (raw-body patching)
- `mirror/SongMirrorPage.tsx` (lookup/exhaustive-scan resolution, create-only fallback), `mirror/WorkingSetPreviewProvider.tsx`

Modify:

- `SongDetailPage.tsx`: becomes the container.
- `SongCredits.tsx`: `onPillClick`/`pillState`.
- `AdminContentEditPage.tsx`: becomes the adapter.
- `kinds.ts`: `song.FullEditor = SongPageEditor`.
- `songChart/chartOps.ts`: `coerceSongDraft`.
- `AdvancedFields.tsx`: id lock + Rename (capability).

Delete `songEditor/SongEditor.tsx` once its chart block has moved.

Reuses: `ChordChart` `editable` (`ChordChart.tsx:70`), `useChartEditing`, `BarInspector`, `ChordEditorPopup`, `KeyPicker`, `ArtistImageUpload`, `YouTubeField`, `Editable.tsx`, `EditReviewBanner`/`ProposalDiff` (`review/EditReview.tsx`), `usePublishContent`.

**1f. Kind specs and record editors (2.5 days)**

Taken over by Amendment 5 (C2 and D, as built above): the editors are
`recordEditors/*Fields.tsx`, not the per-kind folders below.

Create:

- `content/{artistEditor/ArtistEditor,releaseEditor/ReleaseEditor,studioEditor/StudioEditor,labelEditor/LabelEditor,placeEditor/PlaceEditor}.tsx` (`SidePanel`/`PanelRow` frame)

Modify:

- `src/curriculum/types/songLibrary.ts`: the §3.3 fields.
- Regenerate `songBodySchema.ts` as v2 (`WRITE_SONG_SCHEMA=1`). v1 stays in the frozen file. Update `manifest.json`.
- `kinds.ts`: specs for artist, release, studio, label, and `globe_city` v2, each with `identity`.

**1g. Pickers and legacy linking (3 days)**

Create:

- `content/entities/{EntityPicker,EntityMultiPicker,EntityChip,CreateEntityDialog,RefRow}.tsx`
- `content/entities/{useEntityIndex,rankEntities}.ts`
- `src/content/graph/resolveLegacy.ts`
- `content/graph/LegacyLinkPage.tsx`

Modify:

- `songEditor/CreditsEditor.tsx` → `ConnectionsPanel.tsx`: lead act, primary credits, session ids, releases, unverified/source where the schema holds them.
- The `SongPageEditor` genre slot: `genreTags` limited to the 12 keys; a separate `subgenreIds` picker.

Reuses: `components/ui/{command,popover}.tsx`, `normalizeArtistName`, `scoreKeywords`, `SESSION_INSTRUMENTS`, the `songImportPlan.ts` pattern, and `diffBodies`.

**1h. Working graph, full integrity, worklists (2 days)**

Taken over by Amendment 5: the working graph is B's `useWorkingGraph`, and
the draft overlay D's `panel/draftEdges.ts`. `worklists.ts` and
`WorklistBar` are not built; the Table's filters (a `missing-*` field, has
suggestions, accepted in bulk and not reviewed) and Integrity do that work.

Create:

- `useGraphSnapshot` `working` mode and the live draft overlay
- the remaining integrity rows (dangling, cycles, conflicting owners, draft refs, unverified)
- `content/graph/{worklists.ts,WorklistBar.tsx}`
- `ConnectionsPanel` live derivation

**1i. Contract finalization (1 day)**

- Finalize `docs/console-content-api-contract.md`: items 7 and 9–14.
- `src/scripts/apiContract/contract/*.test.ts`

**Done means:** fully offline against the mock, as admin and as editor, an admin can:

1. see drafts and status in the real Songs table;
2. open Africa in Preview and Edit;
3. link Toto (lead act) and every credit to registry artists, create "Sunset Sound" inline, and mark a credit unverified with a source;
4. save it (a proposal for editors);
5. **publish Africa as admin, then see the change in Preview: the Songs list, `/songs/africa` and `/atlas/globe`. The graph's `published` mode includes the new edges;**
6. see the new edges at `graph?focus=song:africa`, with unlinked and inferred counts dropping in Integrity;
7. batch-link `song.artist` → `origin.artistGlobeId` across every bundled song (638), and have it survive a reload as editor;
8. browse all five segments;
9. hand Ryan the contract (draft at 1a, final at 1i).

Stated plainly for the owner:

- Artist, release, studio and label metadata appear **only in the console graph and editors** until the app cross-links phase.
- Teach in slice 1 is a read-only canonical browser, not a mirror of the teacher UI.
- In production against today's API, slice 1 gives the mirror, previews, read-only pickers and the published-snapshot graph. Lead-act and credit linking go live as soon as the server adopts v1.

### Later phases (outlined)

- **Phase 2, Globe (~9–11 days):**
  - export `EventList` (`DetailsCard.tsx:61`) and `EventDetailsView`, replacing `GlobeEventVisualEditor`;
  - event id fields with the `about` and `took_place_in` edges, with suggestions seeded from `artists.ts` inference (done in Amendment 5: C1, C2 and E);
  - the `artist_location` mapping report, `pin:false` hometowns, and retirement at 100% mapping (E plans the song-pin Cities and their `pin: false` places; the mapping table and retirement remain);
  - `globe_city` client consumer replacing static `CITIES`;
  - countries vocabulary;
  - `SongCredits` id links (owner OK);
  - atlas "Copy link" mapping via an opt-in `shareUrl` context;
  - mock rename, merge, DELETE 409 and cycle rejection, plus the Rename UI;
  - Table-mode bulk edit (`bulk/applyBulkPatch.ts` over `contentRequest`, per-item report). Amendment 5 built bulk accept of suggestions instead (`table/bulk/`); a free bulk edit is not built.
- **Phase 3, Teach (~11–13 days):**
  - `teach_*` kinds and `src/features/classroom/content/teachStore.ts` (flowStore pattern, bundled fallback), with the importers of `curriculumTemplate`, themes, activities and seeds switched to the store;
  - Teach mirror becomes editable: unit and day-stub editors with song/event/artist pickers; theme `artistIds`; seed `songIds`; slide-template copy editor previewed through `SlideRenderer`;
  - `activityRefBridge.ts`, tested against the contract table;
  - mock Teach endpoints and synthetic published days (about 20 stubs via `seededDayFromStub` → `publishDay`, `publish/publishDay.ts:455`, across 3 fake classrooms);
  - "Classroom usage" tab and published-deck browser (read-only `SlideRenderer` of `snapshot.deck`), with graph `usage` annotations.
- **Phase 4, Learn (~8 days):**
  - register `chord_progression` (its spec and editor came with Amendment
    5's D; it shows once the API serves the kind);
  - `activity_flow` fields `songIds`, `artistIds` (Style DNA), `progressionIds`, `techniqueIds`;
  - `GenreLessonContainerV2` preview;
  - genre profile `primaryArtists` → ids;
  - `catalog_meta` for theory topics and techniques;
  - `learn:<mode>:<key>` mapping;
  - lesson editor bug 10.
- **Phase 5, Studio and Arcade (~6 days):** export `GAMES` from a shared module; `catalog_meta` for templates, demos and games (13 ids); a `StudioTemplates` data prop; derived `teaches`/`practices` edges.
- **Phase 6 (optional):**
  - mind-map overview mode (`d3-force` in the console chunk only if still wanted);
  - true device widths via a same-origin iframe of a chrome-less mirror route;
  - app cross-links from the same data (student-facing; a separate decision);

---

## 6. Verification

- **New tests** (`npx vitest run`):
  - the characterization suite;
  - `mirror/__tests__/{mirrorPaths,segments}.test.ts`, including the disjointness test;
  - `MirrorRouter.test.tsx` (jsdom, outer `createMemoryRouter`). It asserts:
    - an absolute `Link` from a nested route lands on `/console/content/...`;
    - `useNavigate` outside the inner `Routes` works;
    - `/songs/africa` matches the song route, not `/`;
    - `setSearchParams` keeps the prefix;
    - `location.key` changes on each navigation;
    - the dirty guard blocks push, `go(-1)` and replace;
    - unmirrored paths render `NotMirroredYet`;
    - **clicking the Learn heading or the sidebar Learn item never mounts `LearnHome`**;
  - **`mirror/__tests__/parity.test.tsx`.** For learn?tab=Songs, songs/africa, studio, arcade, atlas and home, it renders each route under the app tree (`MemoryRouter` at the app path, student persona, same premium state) and under `MirrorRouter` at `/console/content/…` in Preview mode. It asserts that the content-region `innerHTML` is equal, except for the declared placeholder regions from `coverage.ts`;
  - `ProtectedPage.test.tsx` (backstop);
  - `src/content/graph/__tests__/{deriveGraph,integrity,resolveLegacy}.test.ts`, including:
    - `via` on every edge, merged `via[]`, and `missing` nodes;
    - post-canonicalization endpoint validation (`references_event` to a `song-*` event);
    - conflicting-owner detection;
    - inferred flags;
    - zero unexpected dangling refs in bundled seeds;
    - flagged junk entries;
  - `layoutEgo.test.ts`;
  - `mock/__tests__/contentMockServer.test.ts`:
    - proposals, approve, publish → mock CDN manifest and bundles rebuilt;
    - export pagination;
    - `create:true` → 409;
    - batch-link every song as editor, reload persistence, state intact, serialized overlay under 1 MB;
  - `chartOps.test.ts`: `coerceSongDraft` render-only; patching the title adds no keys;
  - `useCapabilities.test.tsx` (msw: `ContentApiError` 404 → overview → legacy; authoritative union rule);
  - `EntityPicker.test.tsx` (alias; create disabled when unserved; exact-slug create blocked);
  - `RefRow.test.tsx` (unverified round-trip);
  - `recordBodySchemas.test.ts`; `refPaths.test.ts` (schema walk); `songBodySchema.v1` hash test;
  - the contract suite against the mock.
- **Extended tests:** `types.test.ts`, `deriveEdges.test.ts`, `songBodySchema.test.ts`. The known local failure `_generated_index.ts:648` is not a regression.
- **Static checks:**
  - `npx tsc -b`;
  - `npx eslint <changed> --max-warnings 0` (no TODO comments);
  - `npx prettier --check`;
  - `npm run build && npm run verify:prod:scan` (mock absent). `verifyProdBundle.mjs` is extended to assert that the entry and student chunks contain no mind-map, mock or `mock://cdn` markers, replacing the visual `ANALYZE=1` check.
- **Driving it:** a committed script `scripts/consoleMirrorSmoke.mjs` (`playwright-core`, `--enable-unsafe-swiftshader`) against `VITE_DEV_AUTH_BYPASS=1 VITE_DEV_AUTH_BYPASS_ROLE=admin VITE_CONTENT_MOCK=1 ./node_modules/.bin/vite --port 5199 --strictPort`. It uses full URLs and DOM assertions, and screenshots are artifacts only:

  - `http://localhost:5199/console/content/learn?tab=Songs` in Preview and Edit (badge count > 0 in Edit);
  - `/console/content/songs/africa` in Preview and Edit, with the picker open (options listed);
  - `/console/content/atlas/globe?artist=Toto` → Edit artist action present;
  - `/console/content/graph?focus=artist:toto&hops=2` (node count > 1);
  - `/console/content/graph/integrity` and `/console/content/graph/links`;
  - `/console/content/studio`, `/console/content/arcade`, `/console/content/teach`, `/console/content/learn` (redirected to `tab=Songs`);
  - the publish-then-see flow from Done means item 5.

  Repeat with `ROLE=editor` (Submit for review) and `VITE_CONTENT_MOCK_KINDS=legacy` (no new kinds in the nav; read-only pickers). Compare the student `/songs/africa` DOM before and after as **`ROLE=student`**.

---

## 7. Risks and open questions

1. **Font and yellow inside the mirror.** "Glacial everywhere" (`console.css:51-59`, 29 Sep) is deliberate: it covers embedded student components. It conflicts with "exactly reflect the app".
   - **Resolved (Amendment 1):** the app adopts the console look; no exemption.
   - Recommendation: exempt `.console-mirror` with the selector flip plus `--ui-*: initial` (so `themed()`'s `var(--ui-x, fallback)` at `theme.ts:78-80` falls back to app colours), and allow app yellow inside the canvas only.
   - It is a separate one-line PR **after the owner answers**. Until then the mirror is WYSIWYG in structure and content but console-skinned.
   - Radix portals opened from mirrored pages stay console-skinned either way.
2. **Router internals.** The design relies on the `UNSAFE_*` contexts of react-router 6.30.3 and on the outer `useBlocker`. It is pinned and covered by `MirrorRouter.test.tsx`; a v7 upgrade must revisit it.
3. **Persona.** Mirrored pages run with the admin token.
   - Known user-API regions are placeholdered. `LearnInlet`'s `useProgressSummary` GET is accepted: is that OK?
   - Should premium preview default to on, with a free/premium switch?
4. **Production before backend.**
   - Lead-act and credit linking need song schema v1 (`songBodySchema.v1.ts`).
   - Releases, session ids and `subgenreIds` need v2.
   - Creating artists, releases, studios and labels works only in the mock until those kinds are served.
   - The contract draft goes out at 1a so this runs in parallel.
5. **Confirmations needed:**
   - `release` (UI "Records");
   - promoting studio and label (reverses the handoff deferral);
   - `globe_city` as the single place registry, with `pin:false` hometowns, a body change and later client consumption;
   - retiring `artist_location` only at 100% mapping;
   - `catalog_meta`;
   - artist body stays `slug`;
   - `origin.artistGlobeId` as the lead-act link. Batch-linking it is **student-visible**, because it adds "X on the Globe" content refs via `contentRefResolver.ts:197-203`;
   - `subgenreIds` as a separate field;
   - **artist-level `influencedBy`**: deferred, because influence stays code-owned per the handoff (`phase-2-api-handoff.md:209-211`). If wanted, it becomes a derived artist-level influence with duplicates flagged against the event arcs.
6. **Drafts and publishing.** Can editors inline-create artists and releases as proposals? The server must order publishes, or block ones that would dangle.
7. **Semantics.** Keys are spelled (E♭ ≠ D♯); `collaboration` → `features`.
8. **Teacher decks.** Admin-only (editors excluded)? Snapshot content only, no student data? Retention? Mock data is synthetic.
9. **Slide templates.** Only the copy becomes editable; builders and presets stay in code.
10. **Delivery (asked in Phase 0).** Is `VITE_CONTENT_CDN_URL` set in production? If not, publishes never reach the app and "published" mode shows the repo snapshot. Does `/overview` list zero-item kinds? The capability fallback relies on it.
11. **Renames.** Song and event renames stay blocked, because code-owned `eventConnections.ts` and `curriculumTemplate.ts` reference them.
12. **Scale.** About 640 songs, 1,723 events and 912 artists fit the working set. At larger sizes `/export` becomes mandatory.
13. **Junk data.** The contract excludes the 5 junk film/TV registry artists from the import. Should they be deleted from `artistRegistry.ts` in the same change? Until then they are flagged, not removed.
14. **Viewport-bound layout.** ~~The mirror frame is narrower than the app at the same viewport by the console sidebar's width.~~ Resolved by Amendment 4 (verified pixel-identical at 1440×900). Device widths are still not simulated in slice 1.
15. **Copy link.** Atlas "Copy link" inside the mirror yields a console URL until Phase 2.
16. **Artifact drift.** Vocabulary and catalog changes in the webapp need a server artifact refresh. They degrade to warnings through `artifactsVersion`, not failures.

### Critical Files for Implementation

- /Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/features/admin/content/AdminContentEditPage.tsx
- /Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/components/songLibrary/SongDetailPage.tsx
- /Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/content/graph/types.ts
- /Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/content/graph/deriveEdges.ts
- /Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/hooks/data/admin/useAdminContent.ts

---

## Review disposition

1. **LearnHome reachable despite `initialTab`: accepted.** Confirmed at `LearnInlet.tsx:1553-1558`. `LearnMirror` now normalizes a missing `tab`, and a test was added.
2. **dashboard.css not loaded: accepted.** Only `ClassroomDashboard`/`LandingShell` import it. `ConsoleMirrorShell` now imports it.
3. **REF_PATHS misses `origin`/`contentRefs`/`progression.artist`; wrong `:213` cite: accepted.** Confirmed `:213` is `GlobeOrigin` and `:275` is `Credit`. All paths added (non-derived marked `derive:false`), citation fixed.
4. **Regeneration overwrites v1: accepted.** `songBodySchema.v1.ts` is frozen in Phase 0 with a hash test, and levels map to named files.
5. **`--full-editor-bar-h` only set by the edit page: accepted.** Confirmed at `:203/:373`. `ContentItemEditor` now owns the measurement.
6. **`coerceSongDraft` defaults could be saved: accepted.** Confirmed the `id:'draft'` default and raw-body patching at `SongEditor.tsx:70-71`. Now render-only, with a test.
7. **Router key, `go`/replace bypassing the guard, Copy link: accepted.** `toAppLocation` copies key and state, the guard moved to the outer `useBlocker`, and Copy link is noted with a Phase 2 fix.
8. **Counts and names off: accepted.** Confirmed 16 call sites in 8 files, `GAMES` not exported, `diffBodies`, `useContentItems` at `:207`, 638 bundled songs, and 362 location entries.
9. **Slug taken from `body.id` vs new kinds keyed on `slug`: accepted.** Confirmed `AdminContentEditPage.tsx:236-240`. Added `KindSpec.identity` and a per-kind identity list in the contract.
10. **Upsert overwrite via create paths: accepted.** Confirmed the PUT has no id. Added `create:true` → 409 `SLUG_TAKEN`, a confirmed-absence rule, and a blocking exact-slug check.
11. **Facts restated in multiple owners: accepted (with a different billing choice).** `Song.artistIds` is dropped in favour of the existing `origin.artistGlobeId` + primary credits (v1 only). Release and recording facts are split, `ArtistRecord.imageRef` is dropped, and a "conflicting owners" integrity row is added.
12. **`artist_location` migration loses data: accepted.** Verified 134/362 unmapped across 86 cities. The kind is kept until 100% mapped, with a mapping report and `pin:false` places.
13. **Genre multi-select writes underived values: accepted.** Confirmed the 12-key `SONG_TAG_TO_GENRE`. `genreTags` is restricted, and a separate `subgenreIds` field has its own deriver and REF_PATHS entry.
14. **Teach usage contract not implementable: accepted.** Confirmed there is no artist ref in the grammar. Added the mapping table and scanned fields, dropped `artistIds`, and specified `<kind>:<slug>` ids.
15. **REF_PATHS incomplete; sync test only against derivers: accepted.** Merged with 3. The sync test now walks the generated Zod schemas.
16. **No artifact delivery/versioning: accepted.** Added `manifest.json` with `artifactsVersion`, a `/capabilities` report, and warning downgrade.
17. **Junk-artist exclusion misattached: accepted.** Moved to the artist import (907). Deletion from the registry is tied to Q13.
18. **Served-but-empty kinds dangle: accepted.** Confirmed that the `globe_city` list is empty. Added an `authoritative` flag and the union rule.
19. **Context actions and deep links not capability-gated: accepted.** They are filtered, and code-origin nodes link to the owner explanation.
20. **`catalog_meta` underscores; technique slugified: accepted.** Confirmed snake technique ids in data. Kebab prefixes added, and technique joins the pass-through set with a snake pattern.
21. **Inferred edges indistinguishable: accepted.** Dotted style, a filter chip, a coverage count, and excluded from hop expansion by default.
22. **Unverified toggle has no storage on bare-id arrays: accepted.** The toggle shows only where `RefMeta` exists, with a round-trip test.
23. **`influencedBy` reopens a settled decision: accepted.** Removed from `ArtistRecord` and added to the confirmations.
24. **Fields without edges; canonicalization breaks endpoints: accepted.** `about` gains `song`, `took_place_in` is added, endpoints are widened, and validation runs after canonicalization, with a test.
25. **Contract scheduled last: accepted.** A draft goes to Ryan at 1a (about day 4–5), and Q10 moved to Phase 0.
26. **LearnHome reachable (duplicate of 1): accepted.** Merged with 1. `LearnInlet`'s own `useProgressSummary` is documented as an accepted GET (Q3).
27. **Offline publish has no visible effect: accepted.** Confirmed the CDN URL is unset and `fetchBundle` uses plain fetch. Added a mock CDN, a reset/rehydrate step on activate, and a Done-means item.
28. **localStorage overflow on batch-link: accepted.** Persistence switched to per-item structural patches, with a quota banner and a batch-link persistence test.
29. **WYSIWYG verification not executable: accepted.** Added `parity.test.tsx`, a committed Playwright script with full URLs and assertions, a `verifyProdBundle` marker check, and `ROLE=student`.
30. **v1 overwritten (duplicate of 4): accepted.** Merged with 4.
31. **1a scope too large: accepted.** Rename, merge, DELETE 409 and cycles moved to Phase 2; Teach mock endpoints to Phase 3. Checkpoints re-estimated to about 25 days.
32. **`fetchWithAuth` drops status and body: accepted.** Confirmed at `:156-163`. Added `ContentApiError` and specified the shape of PUT warnings.
33. **Mind map arrives last: accepted.** A read-only Repo-snapshot map and coverage ship at 1d, right after the mirror.
34. **Frame geometry under-specified: accepted.** Specified a fixed-height frame that escapes the layout padding, plus a TopRail placeholder. 834/390 are dropped from slice 1 (iframe option in Phase 6), and the width gap is noted.
35. **Glacial flip ships before Q1: accepted.** Removed from Phase 0. It is a separate PR after the owner answers, and today's rule stays the default.
36. **ArtistPanelView shows no edited fields; Teach isn't a mirror: accepted.** The split and its characterization test are dropped, editors use `SidePanel`/`PanelRow`, and Done means now states both limitations plainly.
