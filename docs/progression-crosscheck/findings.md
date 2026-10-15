# Progression crosscheck: findings and decisions

Written 2026-10-14, after the first run; updated 2026-10-15 after a re-run on
the latest charts. The numbers come from
[README.md](README.md), which is regenerated. This page is not.

## What was built

1. **A harmony matcher** (`src/content/harmony/`). It finds each of the
   library's 695 progressions, by its chords, in every song chart, every
   genre activity step and the genre curriculum map. For each match it records
   the section and bars, how closely the chords agree, and whether the section
   is built on the progression or only passes through it. It reads songs as
   they are played, so repeats and D.S. jumps count. It reads a minor-key song
   both from its own tonic and from its relative major. It takes under a second
   for the whole library, so it runs live: nothing is stored, and a chart
   corrected tomorrow is matched correctly tomorrow.
2. **This report.** To rerun it:
   `HARMONY_REPORT=1 npx vitest run src/content/harmony/__tests__/crosscheckReport.test.ts`
3. **The console.**
   - A progression's row in `/console/table/progressions` now has a **Heard
     in** section. It lists the songs that play the progression, strongest
     first; the songs the progression already links are marked "linked". The
     section also lists the genre lessons that play it, each linked to its
     level and section.
   - A song's row has the reverse, **Progressions heard**.
   - Passing and loose matches are one click away.
4. **A Studio link that opens a progression as a new project**:
   `/studio/editor?progression=<id>`. It can also carry the key and section
   the progression was heard in, and the song: the project then takes that
   song's tempo and credits it ("as heard in I Will Survive").
   - Heard in a minor song from its relative major, the progression opens in
     the song's own key, labelled from its own tonic. For example, A minor
     gets `1 min7 – 4 min7 – ♭7 dom7(♯5) – ♭3 maj7`, not C major's
     `6 – 2 – 5 – 1`.
   - All 695 progressions open with every chord voiced as written.
   - The console offers it as **Copy Studio link**, not as an open link.
     The console shows admins a mirror of the Studio, not its editor, so an
     open link would land on "not shown in the console". Pasted into a
     teacher's or student's session, the link opens.

## What it found

**1. The library is written entirely from major tonics.** There is no
`1 minor …` progression in it. A minor song's `1 min – ♭6 – ♭3 – ♭7` is the
library's `6 – 4 – 1 – 5`. 201 of the 666 charts are in minor or modal keys,
so without reading them from the relative major they could almost never
match. That reading is now built in, and its matches are labelled "read from
the relative major". The library's own `songIds` links, made from song
names, are confirmed by the charts' chords in 37 of 47 cases. Before the
relative-major reading, only 27 were.

**2. The library is missing the most common loops.** It has only 7
two-chord entries, and no 1–4, 1–2, 1–5 or 2–5. The commonest loops songs
are built on that the library does not have:

| Songs | Loop                                  | Library has      |
| ----- | ------------------------------------- | ---------------- |
| 52    | 1 maj – 4 maj                         | only 4 – 1       |
| 20    | 1 maj – 2 min                         | —                |
| 17    | 1 min – 4 dom7 (the Dorian funk vamp) | —                |
| 14    | 1 maj – 5 maj                         | only 5 – 5/7 – 1 |
| 12    | 1 maj – 5 maj – 4 maj                 | —                |
| 10    | 1 maj – 6 min                         | —                |
| 8     | 1 maj – ♭7 maj                        | —                |
| 8     | 5 maj – 4 maj – 1 maj                 | —                |

There are 41 such loops that at least three songs are built on
([missing-loops.md](missing-loops.md)). The genre lessons show the same gap.
Of the 62 distinct multi-chord loops the Funk, Pop, Hip Hop and Latin
activities play, 41 match no library progression. These include Pop's
C–F–G–C and C–F–C, Funk's Dm7–G7, and Latin L1's Cumbia Em–Am–B7–Em and
Mariachi G–C–D7–G — both a plain 1–4–5–1, which the library does not have
([genre-activities.md](genre-activities.md)).

**3. Ten song links made from names are not in the songs' chords.** The
sheet named the song, but the chart nowhere plays the progression. Some were
chart errors: Hey Ya! had `6 min7` where the song (and the library) has E
major, and the Music Maps corrections have since fixed it, so its link now
holds. Others are loose paraphrases on the sheet: Dreams' entry is not the
chart's 4–5 loop. The list is in [data-issues.md](data-issues.md).

**4. Small data fixes.**

- Two charts have unreadable chord labels: Look What I Found (`4 c♯min7`,
  chord name `F♯C♯min7`) and Cigarettes and Chocolate Milk.
- Eight library entries write a slash bass counted from the chord's root
  (`4 minor6/b3` for F–6/A♭) where the charts count from the key.

None of these were changed: chart edits go to the back office as well as the
repo, and the library's content is the content team's.

**5. Coverage today.**

- 193 of 695 progressions are heard squarely in at least one song.
- 479 of 666 songs squarely play at least one library progression.
- 1,245 song–progression pairs are found that the library does not link.

## Decisions for you

1. **Should strong matches become stored links?** The chords give 1,245 pairs
   that the library's `songIds` do not have. 4–1 (#383) alone is heard
   squarely in 202 songs.
   - _Recommended: keep them derived._ Show them live ("Heard in"), and keep
     `songIds` for the songs a person picks as the progression's examples.
     Stored, the pairs go stale every time a chart is corrected, and a
     progression with 200 linked songs says less than one with five chosen
     ones.
   - The alternative is to bulk-accept the strong matches. If you want
     that, the matcher can feed the existing suggestion review (ghost cells,
     bulk accept). That needs the API to plan the suggestions as well, which
     is Ryan's side.
2. **Add the missing loops to the library?** The top of
   [missing-loops.md](missing-loops.md) is a ready shortlist, with songs to
   cite for each. Note that the library keeps rotations apart (1–5–6–4 and
   6–4–1–5 are two entries), so 1–4 would be a new entry beside 4–1.
3. **Minor-key spellings.** Keep the library major-framed and read songs from
   the relative major (as built), or add minor-tonic spellings of the minor
   progressions, so a student sees `1 min – ♭6 – ♭3 – ♭7` in the library
   itself? The first needs nothing from content.
4. **Where students and teachers meet it.** The data and the Studio link are
   ready. Each surface below is a design decision, so none was built:
   - **Song page:** a "Progressions in this song" strip under the chart, each
     opening the progression in the Studio in the song's key.
   - **Genre lesson steps:** "Heard in these songs" under a step's chords.
     This is the teacher hook: Pop L1's C–Am–F–G step is Earth Angel, The
     Sign and Perfect.
   - **Studio Library:** a Progressions tab. The Studio has no browsable
     progression list today; nothing in the Studio reads the library except
     UNISON's analysis.
   - **Globe:** a song event's card links its song page already, so the Song
     page strip reaches the Globe too. A progression could also be a filter
     on the globe ("where 1–5–6–4 was played"), since every song has a place
     and a year.

## Notes for whoever builds on it

- The matcher is pure and takes its data in, like the linking planners:
  the console hands it the working snapshot, and the report hands it the
  repo.
- `isStrongMatch` is the line between "uses it" and "passes through it":
  the match is looped or a phrase, and its chords are the same or the same
  family. Every count above uses it.
- The relative-major reading applies to minor and modal passes (a key change
  mid-song is read in its own key). A match found only that way carries
  `relative: true`.
- The Studio link resolves retired progression ids (`resolveProgressionId`),
  so an old link opens the entry that replaced it.
