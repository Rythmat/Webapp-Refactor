# Songs: what is wired, and what is not

An inventory of the song library, chart and Set Lists work, taken 24 September 2026
against commit `5597caa8`. "Wired" means a real consumer calls it outside its own
file and outside tests — not merely that it exists and passes review.

Verified by tracing consumers directly. `knip` was tried first and is not reliable
here: it reports `SongLibraryPage` as unused (it is routed) and flags plain getters
whose sibling hooks are the thing screens actually import.

---

## 1. Two favourite systems, on two views of the same song

This is the sharpest thing the inventory turned up.

|                        | Icon     | Backed by                                    | Signed out |
| ---------------------- | -------- | -------------------------------------------- | ---------- |
| Song list row and card | ❤️ Heart | `useSavedSongsStore` — device localStorage   | works      |
| Song detail page       | ⭐ Star  | `useSetListFavorite` → My Favorites set list | disabled   |

- The row heart goes through [`useSongActions`](../src/features/songs/useSongActions.ts#L71) → `useSavedSongsStore`, which persists to this browser only.
- The detail-page star is [`FavoriteStar`](../src/components/songLibrary/SongDetailPage.tsx#L361) → [`useSetListFavorite`](../src/features/setlists/useSetLists.ts#L266), which writes to the My Favorites set list and is disabled when signed out.

The bridge between them, [`migrateSavedSongs`](../src/features/setlists/setListsStore.ts#L794),
is written and **called by nothing**, so the two records never reconcile: a song
hearted on the list does not appear in My Favorites, and a song starred on the
detail page does not fill the heart on the list.

Joining them was scoped on 2026-09-24 and **deliberately deferred** — see
[Open decisions](#5-open-decisions).

---

## 2. Wired and reachable today

| Capability                    | Entry point                                                      | Notes                                                                                                      |
| ----------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Set Lists**                 | [`/setlists`](../src/features/classroom/ClassroomPages.tsx#L678) | Index, workspace and print view all routed; reachable from the "Open Set Lists" button on the song library |
| **Transposition**             | `transposeSong`, `semitonesToTonic`                              | Used by the set list entry chart, the Save Version dialog, the detail page and the key button              |
| **Chart-corrected alerts**    | `chartFingerprint`, `acceptChartUpdate`                          | A set list entry remembers the chart it was added from and says when the library has since corrected it    |
| **Letters ↔ numbers toggle** | `useChartNotation`                                               | Consumed by ChordChart, ChordGrid and the detail page; remembered per device                               |
| **Stand view preferences**    | `useSetViewMode`, `useStavesPerPage`, `useChartFormat`           | Consumed by the workspace and the print page                                                               |
| **Section loop playback**     | `getSectionTimeRange`, `getSectionTimeRangeFromBeats`            | Detail page loops a section against the YouTube player                                                     |
| **Studio export**             | `exportSongToChordRegions` → `chordRegionsToMidiClip`            | Via `seedStudioFromSong`; also feeds practice tracks                                                       |
| **Segno / coda placement**    | `ChordChart`                                                     | Drawn above the section marker when a labelled section opens on one; falls back to in-bar otherwise        |

---

## 3. Built, nothing calls it

| What                                                                                                                                                                                             | Where                                                                         | Consequence                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `migrateSavedSongs`                                                                                                                                                                              | [setListsStore.ts:794](../src/features/setlists/setListsStore.ts#L794)        | Device-saved songs never reach My Favorites                                                                                                           |
| **8 of 10 timing helpers** — `getActiveBarIndex`, `barAudioBeats`, `getBarProgressFromBeats`, `findBeatIndex`, `getBarStartTime`, `getActiveFromBeats`, `getBarStartFromBeats`, `barDurationSec` | [songLibrary/timing.ts](../src/curriculum/songLibrary/timing.ts)              | **No bar-level playhead.** Only the two section-range helpers are used, and there is no `activeBar` or playhead anywhere in `components/songLibrary/` |
| `transposeSongWithReport`                                                                                                                                                                        | [transpose.ts:238](../src/curriculum/songLibrary/transpose.ts#L238)           | The respelled/unparsed chord report is computed on every transpose and never shown                                                                    |
| `exportSongToStudio`                                                                                                                                                                             | [exportToStudio.ts:334](../src/curriculum/songLibrary/exportToStudio.ts#L334) | Higher-level wrapper; callers use the two inner functions instead                                                                                     |

The timing helpers are the largest gap. Everything needed to follow a chart bar by
bar during playback is finished and tested; nothing draws it.

### Globe Cities: a content kind wired at neither end

`globe_city` is registered in [kinds.ts](../src/features/admin/content/kinds.ts)
with a proper form — id, name, country, genres, description — is routed, and
renders. **Its list in the console is empty, and would do nothing if it were
not**, because the disconnect runs both ways:

- **Nothing to read.** The CDN serves exactly four bundles — `globe-events`,
  `songs`, `lessons`, `fundamentals`. Cities are not one of them, so no city
  records were ever created server-side.
- **Nothing would read it.** The 302 cities in
  [cities.ts](../src/components/atlas/data/cities.ts) are a plain static export,
  imported directly by the globe, the lesson thumbnails, the deck editor and the
  slide templates. Unlike `MUSIC_HISTORY`, they never pass through
  `contentStore`, so a record created in the console would be invisible.

The contrast that explains it: **artist locations went the other way.**
`src/scripts/artistLocations.json` is seeded into the API via
`music-atlas-api/src/scripts/importArtistLocations.ts` (recorded in the retired
`buildGlobeData.mjs` header). Someone wrote an importer for artist locations and
never wrote one for cities.

This matters for the graph work: `place` is one of the eight facets the Globe
will filter by, and clicking a city is how location filtering works. The repo
file is perfectly good data for that, so the facet lookup is unaffected — but
cities cannot be edited the way songs can, and that belongs on the list Ryan
gets.

---

## 4. Production does not read these files

[`songStore.ts`](../src/content/songStore.ts) hydrates the library from a **published
CDN bundle** whenever `VITE_CONTENT_CDN_URL` is set
([`isContentCdnEnabled`](../src/content/manifest.ts#L35)), falling back to
`bundled.ts` only when it is not. `bundled.ts` is a plain import index over the
per-song modules, so:

- **Local dev and tests see every fix immediately.**
- **Production sees whatever was last published** through the admin Releases page.
- The admin song editor (`SongEditor`) edits **server-held content**, not these `.ts`
  files — it receives a `Song` through `StructuredEditorProps`.

Everything below is therefore real in dev and invisible in production until the
server content is updated and republished:

- 208 corrected key labels
- 12 charts carrying mid-song `keyChange` marks
- 6,916 degree labels converted to the `dom7` convention
- the Close To You bridge corrections

**Unresolved:** whether a republish picks these up from the repo, or whether the
edits must be re-entered through the admin editor. That cannot be determined from
the client code.

---

### The vibe rules do not match how vibes were applied

Running `progressionMatchesVibe` against the 539 hand-tagged progressions
(2026-09-26) shows the coded rules and the curator disagree. Where a human
explicitly applied a vibe and the rules said no: **sophisticated 334**,
intriguing 117, cool 115, fun 77, dark 38, sexy 35. In the other direction the
rules fire very freely — 427 progressions match `romantic`, 367 `hypnotic`, 348
`happy`.

This matters because `filterProgressionsByVibe` falls back to the algorithm for
any progression without stored tags, so a vibe filter returns far more than a
curator would accept. **Deliberately not acted on** — the product owner ranked
vibes lowest priority (2026-09-26). The 539 labelled entries are the test set
for recalibrating the rules whenever that becomes worth doing.

---

## 5. Open decisions

1. **Does a republish carry repo song edits to production?** (§4.) Blocks the value
   of all chart data work.
2. **Should the heart and the star become one thing?** Scoped and deferred on
   2026-09-24. The obstacle is architectural, not musical: `useSetListsStorage`
   keeps its optimistic state **per component instance** — its own `useState`,
   debounce timer, BroadcastChannel and visibility listeners. The song list renders
   every matching row, so calling `useSetListFavorite` per row would create up to
   640 storage instances. Joining them needs one shared instance (a provider, or
   state lifted to the page), not a direct call in `useSongActions`.
3. **Should the bar-level playhead be finished?** (§3.) The helpers are done.

---

## 6. Chart data status

628 song files changed since commit `7c39e2c6` (both working sessions combined),
208 of them with a changed key label. Degree quality tokens are fully converted —
**0 bare-`7` labels remain**; every dominant reads `dom7`, `dom9`, `dom13`.

Progress on [`song-key-review.md`](song-key-review.md):

| Section                                        | Answered | Open |
| ---------------------------------------------- | -------- | ---- |
| 1. Probably wrong, not confirmed               | 19       | 62   |
| 2. Tonic or mode unclear                       | 29       | 17   |
| 3. Chart in a different key from the recording | 0        | 21   |
| 4. Key changes to mark on the chart            | 6        | 75   |
| 7. Unmarked modulations (♯-degree scan)        | 2        | 16   |
| 8. Label already names two keys                | 7        | 0    |

**Two sessions are editing that file.** Sections 2, 4 and 8 carry answers written by
more than one hand. Its sections 1–6 also predate a large batch of applied changes,
so the "Chart says now" and "Research suggests" columns there do not describe the
files; section 7 was generated from the files and does.

### The ♯-degree detector

A degree reading `♯1`, `♯2`, `♯5` or `♯6` means a chord is being numbered against the
wrong tonic — either the section has modulated and nothing marks it, or the chart is
spelled in the wrong enharmonic. `♯4` is excluded (a real Lydian/blues degree), and
so is any diminished chord (a passing `F♯dim7` between F and Gmin7 genuinely _is_
`♯1`). A `ii–V` reading `4 min7` → `♭7 dom7` is the tell for where a modulation
lands; the section after it usually confirms with `1 – 5 – ♭7 – 6`.

The scan found 46 charts, of which 14 were pure spelling slips fixable by respelling
one chord (B→C♭, E→F♭) and 18 are probable unmarked modulations. It is worth
re-running after any batch of key changes.
