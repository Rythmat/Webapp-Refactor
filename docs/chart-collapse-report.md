# The T2 collapses, run

`docs/chart-work-plan.md` §7.4 asked for the verbatim-duplicate sections to be
collapsed into repeat signs by script, with `performedBars` proving the chart
plays the same before anything is written. The script is now in the repo at
`src/scripts/collapseRepeatedSections.ts`, with its runner and its tests beside
it, and it has been run over the whole corpus.

|                                     | Before    | After           |
| ----------------------------------- | --------- | --------------- |
| Written bars                        | 37,243    | **34,257**      |
| Sections                            | 5,034     | **4,536**       |
| Charts carrying any roadmap mark    | 30 (4.7%) | **176 (27.5%)** |
| Bars duplicating an earlier section | 10,674    | 6,698           |

149 songs changed, 155 repeats written in, 2,986 bars and 498 sections removed.
The safety gate rejected nothing. Thirty candidate runs were refused before the
gate, for reasons listed below.

---

## The finding: the unit is a span, not a section

The plan describes the job as sections that "duplicate an earlier section
verbatim" collapsing "into repeat signs mechanically". Written that way — one
section immediately followed by the same section again — **the script finds
nothing. Not one song in 640.**

Of the 155 collapses actually made, **zero are a single section written twice.**
Every one is a run of two or more differently-named sections coming back in the
same order.

The reason is that the library's sections are not sections. The parser cut each
chart into four- and eight-bar blocks and dealt the names out in turn, so Get
Lucky has the same eight bars under Verse 1, Pre-Chorus 1, Chorus 1, Verse 2,
Pre-Chorus 2, Chorus 2, Bridge and Chorus 3 — eight adjacent byte-identical
sections. Collapsing them section by section would keep one name and throw seven
away. Collapsing the _span_ Verse · Pre-Chorus · Chorus, which comes back whole,
keeps all three and deletes the copy.

So the unit the script works in is a span of adjacent sections. Its shape across
the corpus:

| Sections in the span | 2   | 3   | 4   | 5   | 6   | 8   | 11  |
| -------------------- | --- | --- | --- | --- | --- | --- | --- |
| Runs                 | 95  | 36  | 8   | 10  | 4   | 1   | 1   |

| Times the span is played | 2   | 3   | 5   | 10  |
| ------------------------ | --- | --- | --- | --- |
| Runs                     | 132 | 20  | 2   | 1   |

## What gets written

Repeat barlines on the bars: `repeatStart` on the span's first bar, `repeatEnd`
on its last, and `repeatTimes` when the span is played more than twice.
`SongSection.repeatCount` is not used — it is the legacy spelling, it cannot
span two sections, and Close To You, the library's one worked chart, is barlines
throughout.

Section numbers are redrawn afterwards, because they count written sections and
there are now fewer of them: `Verse 1 · Pre-Chorus 1 · Chorus 1` with a repeat
over it and no siblings left becomes `Verse · Pre-Chorus · Chorus`. A family
that carried no numbers before carries none after — four bare "Verse" labels are
a style, and it is the one Close To You uses.

Nothing else in the file moves. Only 316 of the 642 files in the songs directory
are prettier-clean as committed — the parser left a great many bar lines one
character over the print width — so the script prints its edits the way prettier
would rather than running prettier over the file. The first run did use prettier,
and reformatting the 70 affected files added 19,074 lines of churn on top of the
collapse, which buries the one thing a reviewer needs to check. The count of
prettier-clean song files is 316 both before and after this change.

## The safety gate

Before a file is touched, the song is collapsed in memory and both versions are
walked with `performedBars`. The performed sequence — every bar's chords, its
rest and fermata and cue, and the key it is in from `writtenBarKeys` — has to
match exactly. The gate also re-checks that the roadmap terminates, that every
written bar is still played, that every label is still a section name, and that
no section was invented.

**It rejected nothing: 149 of 149 passed.** That is worth saying plainly rather
than claiming the gate earned its keep. The hazard it exists for is real — a new
start repeat changes where an unrelated end repeat further down the chart
returns to, because `repeatStartFor` walks backwards and stops at the first one
it meets — but only 4 of the 149 songs carried any roadmap mark at all, so the
hazard was live in four charts and bit in none. It is tested directly in
`collapseRepeatedSections.test.ts`, on a chart built to trip it.

What did earn its keep is the second, end-to-end check. `apply` records every
song's performance signature before editing; `verify` re-globs the corpus in a
fresh process, so it reads the rewritten files, and compares. All 640 matched.
Re-planning the rewritten corpus finds nothing left to do, so the script is
idempotent on the real data and not only on the fixtures.

## The ten biggest

| Bars | Song                         | Chart                       | The repeat                                         |
| ---: | ---------------------------- | --------------------------- | -------------------------------------------------- |
|   96 | `takin_it_to_the_streets`    | 200 → 104 bars, −6 sections | Verse · Pre-Chorus · Chorus ×3                     |
|   72 | `vivir_mi_vida`              | 97 → 25 bars, −18 sections  | Verse · Chorus ×10                                 |
|   54 | `higher_ground`              | 116 → 62 bars, −5 sections  | Verse · Chorus · Verse · Verse · Verse ×2          |
|   54 | `i_should_have_known_better` | 124 → 70 bars, −8 sections  | Chorus + 7 Verses ×2                               |
|   52 | `the_seed_2_0`               | 163 → 111 bars, −5 sections | Verse · Chorus · Verse · Verse · Verse ×2          |
|   48 | `sex_on_fire`                | 110 → 62 bars, −10 sections | Verse · Chorus · Verse · Verse · Chorus ×3         |
|   47 | `sir_duke`                   | 125 → 78 bars, −4 sections  | Verse · Pre-Chorus · Chorus · Interlude ×2         |
|   44 | `late_in_the_evening`        | 117 → 73 bars, −11 sections | an 11-section span ×2                              |
|   40 | `sweet_dreams`               | 84 → 44 bars, −7 sections   | Verse · Chorus ×3, then Verse · Verse · Chorus ×2  |
|   38 | `cant_buy_me_love`           | 187 → 149 bars, −6 sections | Verse · Chorus · Verse · Verse · Verse · Chorus ×2 |

`takin_it_to_the_streets` is the clearest result: 200 bars of chart, which was
Verse · Pre-Chorus · Chorus written out three times, is now 104 bars with a `×3`
on the last barline. `vivir_mi_vida` loses eighteen of its twenty-three
sections. `sir_duke` is on the plan's T1 list for other reasons — 34 missing
bars, three wholly empty sections — and collapsing it fixes none of that; it
just stops the damage being written out twice.

## What was refused, and why

Thirty runs were identified as immediate repeats and then refused. Twenty-nine
of them repeat under a different set of names, which means a repeat barline
would erase a name the chart is currently making a claim about. One already
carries roadmap marks.

| Song                           | The run                                                                                              | Bars | Refused because                  |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- | ---: | -------------------------------- |
| `midnight_train_to_georgia`    | Chorus 1 + Verse 5 + Verse 6 + Pre-Chorus 1 + Chorus 2 + Verse 7 + Verse 8 + Verse 9                 |   32 | repeats under a different name   |
| `tears_of_a_clown`             | Intro + Verse 1 + Chorus 1 + Interlude 1 + Verse 2 + Chorus 2                                        |   28 | repeats under a different name   |
| `we_didnt_start_the_fire`      | Chorus 4 + Verse 5 + Pre-Chorus 3 + Chorus 5 + Verse 6 + Pre-Chorus 4 + Chorus 6 + Verse 7 + Verse 8 |   24 | repeats under a different name   |
| `aint_no_mountain_high_enough` | Intro + Verse 1 + Chorus 1 + Interlude 1 + Verse 2 + Chorus 2                                        |   22 | repeats under a different name   |
| `gone_country`                 | Intro + Verse 1 + Pre-Chorus 1 + Chorus 1 + Interlude + Verse 2 + Pre-Chorus 2 + Chorus 2            |   20 | repeats under a different name   |
| `cold_sweat`                   | Chorus 1 + Verse 2 + Verse 3 + Chorus 2 + Verse 4 + Verse 5                                          |   16 | bars already carry roadmap marks |
| `feeling_alright`              | Verse 3 + Chorus 3                                                                                   |   16 | repeats under a different name   |
| `she_loves_you`                | Verse 2 … Verse 6 + Pre-Chorus                                                                       |   16 | repeats under a different name   |
| `unforgettable`                | Intro + Verse 1 + Chorus 1 + Verse 2 … Chorus 2 + Verse 5                                            |   16 | repeats under a different name   |
| `loves_in_need_of_love_today`  | Chorus 1 + Pre-Chorus + Chorus 2 + Verse 1                                                           |   14 | repeats under a different name   |
| `aint_it_funky_now`            | Verse 1 + Interlude + Verse 2 + Outro                                                                |   13 | repeats under a different name   |
| `good_times`                   | Verse + Chorus                                                                                       |   12 | repeats under a different name   |
| `johnny_b_goode`               | Intro + Verse 1 + Chorus 1 + Verse 2                                                                 |   11 | repeats under a different name   |
| `counting_stars`               | Chorus 1 + Verse 2                                                                                   |   10 | repeats under a different name   |
| `crazy`                        | Verse + Chorus                                                                                       |    9 | repeats under a different name   |
| `after_midnight`               | Verse 2 + Outro                                                                                      |    8 | repeats under a different name   |
| `cruisin_dangelo`              | Chorus 1 + Pre-Chorus + Chorus 2 + Verse 2                                                           |    8 | repeats under a different name   |
| `get_lucky`                    | Bridge + Chorus 3                                                                                    |    8 | repeats under a different name   |
| `girl_crush`                   | Chorus + Bridge                                                                                      |    8 | repeats under a different name   |
| `suit_tie`                     | Verse 6 + Verse 7 + Verse 8 + Pre-Chorus                                                             |    8 | repeats under a different name   |
| `whiskey_in_a_jar`             | Verse + Chorus                                                                                       |    8 | repeats under a different name   |
| `ziggy_stardust`               | Chorus 1 + Pre-Chorus + Chorus 2 + Verse 2                                                           |    8 | repeats under a different name   |
| `paranoid_android`             | Chorus 2 + Verse 6                                                                                   |    6 | repeats under a different name   |
| `doo_wop_that_thing`           | Verse 3 + Outro                                                                                      |    5 | repeats under a different name   |
| `get_up_offa_that_thing`       | Verse + Chorus                                                                                       |    5 | repeats under a different name   |
| `mr_big_stuff`                 | Verse 2 + Outro                                                                                      |    5 | repeats under a different name   |
| `cant_feel_my_face`            | Verse + Chorus                                                                                       |    4 | repeats under a different name   |
| `love_goes_building_on_fire`   | Intro + Verse                                                                                        |    4 | repeats under a different name   |
| `ordinary_people`              | Intro + Verse                                                                                        |    4 | repeats under a different name   |
| `sugar`                        | Chorus + Bridge                                                                                      |    4 | repeats under a different name   |

Every one of those is a judgement, not a bug. `ordinary_people`'s Intro and
Verse 1 are the same four bars; whether the chart should say "Intro, repeat" or
keep both names is a question about the song. So is Get Lucky's Bridge, which is
the chorus again under a different word. These are the same kind of decision as
the non-adjacent duplicates below, and they want the same treatment.

## What is left

6,698 bars still duplicate an earlier section verbatim. Apart from the thirty
runs in the table above, which are immediate repeats refused on purpose, **none
of them is an immediate repeat** — the script finds nothing new on a second pass,
and `verify` asserts it. They are all the other kind: a verse that comes back
after the chorus, which on paper is a D.S., a D.C., or a repeat with first and
second endings. Which of the three it is depends on what the record does, and the
script has no way to know. That is §7 step 4 — the part the work plan already
said needs ears — and it needs the bar inspector from §7.2 before anyone can
write the answer down.

The other thing this exposes is that nothing here fixed the naming. A chart with
"Verse 24" on it still has "Verse 24" on it unless a collapse happened to remove
some of its siblings; `maneater` is untouched, because its twenty-four verses are
all different four-bar blocks. The plan counts 219 songs with a label family
repeating five or more times, and that is a separate job from this one.

## Running it again

The engine is `src/scripts/collapseRepeatedSections.ts`, unit-tested in
`src/scripts/__tests__/collapseRepeatedSections.test.ts`. It is driven by
`src/scripts/__tests__/collapseRepeatedSections.run.test.ts`, which is inert
unless `COLLAPSE_MODE` is set — `getSong()` is empty outside the app, so the
corpus has to be reached by `import.meta.glob`, and that means vitest.

```
COLLAPSE_MODE=report COLLAPSE_OUT=/tmp/plan.json \
  npx vitest run src/scripts/__tests__/collapseRepeatedSections.run.test.ts

COLLAPSE_MODE=apply  COLLAPSE_OUT=/tmp/plan.json COLLAPSE_SIGS=/tmp/sigs.json \
  npx vitest run src/scripts/__tests__/collapseRepeatedSections.run.test.ts

COLLAPSE_MODE=verify COLLAPSE_SIGS=/tmp/sigs.json \
  npx vitest run src/scripts/__tests__/collapseRepeatedSections.run.test.ts
```

`apply` writes every song's pre-edit performance signature to `COLLAPSE_SIGS`
before it touches a file. `verify` must be a separate run: it needs a fresh
module graph to read the rewritten charts back.
