# Getting 640 chord charts right

Written after auditing the whole corpus (640 songs, 5,033 sections, 37,279 bars)
and mapping both chart editors. The headline is that the 30-minutes-a-song
estimate is right for about **101 songs**, not 640 — and that most of the rest
is scriptable.

---

## 1. Why I am not going to scrape chord charts

The sites that carry charts for 640 pop songs are user-generated — Ultimate
Guitar and its relatives. That is the same pool these charts came from, so
importing them swaps one set of unverified chords for another. Published sheet
music is accurate and is copyrighted and paywalled. And nothing can be
_verified_ without hearing the recording.

The bottleneck is not finding charts. It is verifying them, and that needs ears.

So the plan is: make the errors **findable**, make the ones that don't need ears
**automatic**, and make the editor fast enough that the ones that do need ears
take ten minutes instead of thirty.

---

## 2. What is actually wrong with the corpus

Three of the seven things I expected to find returned nearly nothing, and that
is the finding:

| Check                             | Result                                                 |
| --------------------------------- | ------------------------------------------------------ |
| Bars that don't fill the metre    | **13 bars, 7 songs** — and all 13 are data-entry slips |
| Songs over 200 bars               | **zero**                                               |
| Bare letter/number section labels | **zero** (already enforced by a test)                  |

**The corpus is not corrupted at the bar level. It is under-notated at the form
level.**

| Finding                                          | Scale                                           |
| ------------------------------------------------ | ----------------------------------------------- |
| Bars that duplicate an earlier section verbatim  | **10,973 — 29.4% of the library**, in 482 songs |
| Charts with _any_ roadmap mark                   | **30 of 640 (4.7%)**. 610 are flat              |
| Songs with a label family repeating 5+ times     | **219** (worst: Maneater has "Verse 24")        |
| Sections whose length isn't a multiple of 2      | 953 (18.9%) — half are exactly 4k+1             |
| Wholly empty sections (real content loss)        | 17 sections in 10 songs                         |
| Single-section stubs — never charted, not broken | 46 songs                                        |

Only **19 songs are clean on every detector**.

### The one thing no research can fix

**Odd meter has nowhere to live.** `ChordBar` has eleven roadmap fields and no
time signature; `timeSignature` exists only on `Song`. Contusion proves it: the
chart says 4/4 and all 62 bars span exactly 4 beats. Its two 5/4 bars were
flattened on the way in, and the damage surfaces as bar-count drift instead
(Verse 1 = 15 bars, Chorus = 5, Verse 3 = 18).

So per-bar meter is a **prerequisite**, not a later task. Until `ChordBar` can
hold `[5, 4]`, no amount of listening can be written down.

---

## 3. The order that pays

1. **Add `ChordBar.timeSignature`.** Read as a running value, the way
   `writtenBarKeys` already reads `keyChange`. The one hard part is
   `exportToStudio.ts` — `barIndex * ticksPerBar` has to become an accumulated
   cursor, because bar index stops predicting tick position.
2. **Script the 92 T2 songs.** Verbatim-duplicate sections collapse into repeat
   signs mechanically; the existing `collapse.ts` already proves `performedBars`
   output is unchanged before writing. No ear needed, only review.
3. **Script the 215 delete candidates** — 4k+1 sections whose extra bar
   provably duplicates its neighbour. 151 songs. Needs confirmation, not
   listening.
4. **Then the ears.** T1's 55 structurally broken songs and T0's 46 stubs.
   ~101 songs, and the only ones that genuinely cost half an hour each.

| Tier | Songs | Bars   | What it is                                          |
| ---- | ----- | ------ | --------------------------------------------------- |
| T0   | 46    | 372    | Stub — one section. Needs authoring, not correcting |
| T1   | 55    | 4,799  | Structurally broken — holes, odd sections           |
| T2   | 92    | 8,692  | Sound structure, no roadmap. **Scriptable**         |
| T3   | 321   | 17,440 | Small cleanup                                       |
| T4   | 126   | 5,976  | No defect detected                                  |

**T1 head:** `sir_duke` (34 missing bars, 3 wholly empty sections),
`paranoid_android` (22 missing, 29 sections → 13 unique), `counting_stars`,
`midnight_train_to_georgia`, `subterranean_homesick_alien`, `off_the_wall`,
`the_ocean`, `hit_me_with_your_best_shot`, `new_york_new_york`,
`tears_of_a_clown`.

**T2 head** (pure roadmap, no ear): `dont_you_worry_bout_a_thing`,
`feeling_alright`, `late_in_the_evening` (one 4-bar verse written 11 times),
`get_lucky` (9 consecutive byte-identical sections), `vivir_mi_vida` (23
sections → 4), `takin_it_to_the_streets`, `maneater`, `sex_on_fire`.

The quality bar for all of it is **`they_long_to_be_close_to_you.ts`** — the one
complete worked example in the library, with repeat barlines, 1st/2nd endings,
a segno, a D.S. al Coda, a coda, a key change and a "Repeat and Fade".

---

## 4. One chart editor, not two

There are currently **three** chart-editing surfaces, and one of them is dead:

|                                                                             | Status                 |
| --------------------------------------------------------------------------- | ---------------------- |
| `songEditor/SongEditor.tsx` + the `editable` prop on `ChordChart`           | Live — the back office |
| `visual/SongVisualEditor.tsx` + `visual/EditableChordChart.tsx` (487 lines) | **Dead** — no importer |
| `daw/components/LeadSheet` + `daw/components/Score`                         | Live — the Studio      |

The dead one can edit things the live one cannot (fermata, `measuresPerRow`,
section notes, duplicate-bar). It survives only because two other files import
an `IconButton` helper from it.

### What the back office can edit today

Ten callbacks, and that is the whole vocabulary: add a chord at a beat, drag a
chord, insert/remove a bar, rename a section, set a legacy repeat count,
add/remove/move a section.

**Not editable, though every one is already in the schema:** `repeatStart`,
`repeatEnd`, `ending` (1st/2nd), `segno`, `coda`, `toCoda`, `jump` (D.S./D.C.),
`fine`, `cue` ("Break"), `keyChange`, `fermata`, `restBars`, `instrumental`,
`measuresPerRow`. No undo, no multi-select, no clipboard.

That is exactly why 95.3% of charts have no roadmap: **there has never been a
way to put one in.**

### What already exists and should not be rebuilt

- **`src/lib/notation/systemPlan.ts`** — `SystemMarks`, `planSystemsOver`,
  `withSystemBreak`, `withSystemRun` (this is "fit into system"), `withPageBreak`.
  Built, tested, already in the Studio's undo stack. The requested system-break
  and fit-to-system features are _this_, routed to `ChordChart`.
- **`src/daw/store/undoMiddleware.ts`** — 339 lines, snapshot-based, with a Yjs
  path for collab. Tied to the DAW store, so not directly reusable by the back
  office, but the collab behaviour is the reason not to try to unify the two
  undo systems.
- **`src/features/admin/content/songChart/chartOps.ts`** — pure immutable
  section/bar/chord ops, already tested.

### The shared core (started — see §6)

`src/lib/chartEditor/` holds the parts both editors need, as **pure values, not
components**, because the two editors agree about nothing except what a chart
is:

- `history.ts` — undo/redo with coalescing and a bound
- `selection.ts` — bars and chords, shift-range across sections, cmd-toggle
- `clipboard.ts` — copy/paste bars **with their roadmap**
- `roadmapOps.ts` — every mark the back office could never edit

The remaining work is UI: a bar inspector bound to `roadmapOps`, cmd-Z/cmd-C/
cmd-V wired to the core, and `ChordChart` growing a multi-bar selection layer.

### Which model wins

The library's `Song` model — sections of bars of chords, with marks on bars.
It is what prints, transposes, roadmaps and pages. The Studio's tick timeline
is a DAW artifact. `toSetListChart.ts` is already half the bridge
(Studio → `StoredChart`); the other half is writing a chart back to the store.

---

## 5. Bugs found while surveying

All five were found by reading, not by anyone hitting them. All five are now
fixed.

- **Seventeen non-4/4 songs rendered wrong.** `ChordChart` hard-coded four
  beats a bar. **Fixed.**
- **`seedStudioFromSong` never set the Studio's metre.** **Fixed.**
- **`exportToStudio` doubled the length of every 6/8 song.** A tick is a 480th
  of a quarter, so a 6/8 bar is 1440 ticks and not the 2880 that six times a
  quarter gives. The Studio's own timeline had it right all along, so the
  export now asks it (`ticksPerBar` in `daw/utils/timelineScale`) instead of
  keeping a second copy. **Fixed** — and two more metre-bound call sites the
  original survey missed went with it: `timing.ts`, which drives the video
  playhead on the song page, and `unison/converters/songToUnison.ts`.
- **`chartFingerprint` could not see metre or layout.** It could not see any
  roadmap mark either, so the whole programme below would have been invisible
  to the stand's "this chart was corrected" offer. **Fixed**, and widened
  carefully: a plain 4/4 chart whose bars divide evenly hashes to exactly the
  text it always did, so the change does not announce a correction to every
  set list at once. 472 of 640 charts do get a new fingerprint, because they
  genuinely carry marks the hash was blind to.
- **`systemRowSizes` overrode an author's explicit `measuresPerRow`.**
  **Fixed.** The fold that tidies a stub row belongs to widths we chose, not
  to one the author wrote down.

---

## 6. What has been done

**The model.**

- `ChordBar.timeSignature` — a running per-bar metre, read by
  `writtenBarMeters` the way `writtenBarKeys` reads the key. 53 songs in the
  prop book need it.
- `ChordBar.systemBreak` and `ChordBar.systemRun` — where a line ends, and
  which bars are one line. Planned by `lib/notation/systemPlan`, the same code
  the Studio's score uses, rather than a second copy of it.
- `src/lib/chartEditor/` — history, selection, clipboard, roadmap ops, as pure
  values. Now with a host.

**The editor.** An inspector bound to `roadmapOps`, a bar selection that runs
across section boundaries, undo/redo, and copy/paste that carries a bar's
roadmap with it. This is what unlocks roadmapping the flat charts: there had
never been a way to enter a mark.

**The corpus.**

- The T2 collapses are run: 2,986 written bars and 498 sections gone from 149
  songs, charts carrying a roadmap mark up from 30 to 176, and every chart
  proved to play identically before and after.
- The extra-bar candidates are counted and written up for review in
  `docs/chart-extra-bar-review.md` — 256 across 155 songs, where this plan
  guessed 215 across 151. Nothing changed, because deleting a bar changes what
  is played.

### What the collapse taught us

This plan described the job as sections that duplicate an earlier section.
Written that way it finds **nothing — not one song in 640**. The parser cut
each chart into four- and eight-bar blocks and dealt the section names out in
turn, so Get Lucky has the same eight bars under eight different names. The
unit that actually repeats is a **span of adjacent differently-named
sections**, and collapsing section by section would have kept one name and
thrown seven away.

---

## 7. What is left

1. **The review.** `docs/chart-source-review.md` (283 of 284 rows unanswered)
   and `docs/chart-extra-bar-review.md`. Both need an ear, not a script.
2. **T1 and T0** — 55 structurally broken songs and 46 stubs. ~101 songs, and
   the only ones that genuinely cost half an hour each.
3. **Modulation marks** — 94 modulations recorded in `docs/song-key-review.md`
   with no mark on any bar.
4. **`song.tempo` is ambiguous for 6/8.** The ten 6/8 songs run from 83 to
   220, which cannot all mean the same unit: 220 is plainly eighth-notes and
   83 plainly is not. The tick arithmetic is fixed either way, but the tempo
   itself wants checking against the recordings.
5. **Where the data actually ships.** Production reads the CDN bundle
   compiled from the admin console's Postgres store; the repo's song files are
   the fallback when the CDN is off. No script in this repo pushes one into
   the other. Everything above lands in repo files — worth settling before the
   next thirty hours of chart work.
