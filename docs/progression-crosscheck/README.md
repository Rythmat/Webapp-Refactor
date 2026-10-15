# Progression crosscheck

Generated 2026-10-15 by `src/content/harmony/__tests__/crosscheckReport.test.ts`.
Every chord progression in the library (695)
was looked for, by its chords, in every song chart (666),
every genre activity step (42 genre levels) and every
progression in the genre curriculum map.

The matching itself lives in `src/content/harmony/` and runs live wherever
it is used, so a chart corrected tomorrow is matched correctly tomorrow.
Nothing here was written into the library: a progression's linked songs are
still only the ones a person linked.

## Headline numbers

|                                                                    |                                    |
| ------------------------------------------------------------------ | ---------------------------------- |
| Progressions heard in at least one song (strong match)             | 193 of 695 (28%)                   |
| Songs that use at least one library progression (strong match)     | 479 of 666 (72%)                   |
| Song–progression pairs found that the library does not link yet    | 1245                               |
| Progressions heard in a genre activity step                        | 17                                 |
| Progressions heard in the genre curriculum map                     | 19                                 |
| Songs the source sheets linked by name                             | 47, of which the chords confirm 37 |
| Loops at least 3 songs are built on that the library does not have | 41                                 |

## How a match is graded

How closely the chords agree:

- **same chords** — every chord as the library writes it (`1 major7` and a
  chart's `1 maj7`), with the same slash bass where one is written.
- **same chord families** — the chart's chord does the same job: a chart's
  `1 maj` for the library's `1 major7` (the charts rarely spell a major
  seventh), `6 min7` for `6 minor`, `5 dom9` for `5 dominant7`.
- **same roots, other colours** — only the major or minor third agrees: a
  chart's `5 dom7` for the library's triad `5 major`.

Where it sits in the song:

- **looped** — the section goes round it, from its own start, at least twice.
- **as a phrase** — it starts where a phrase of its length would: the top of a
  section, or a whole number of its own lengths in.
- **passing through** — it is heard inside a longer line, or across the seam
  of a loop that starts elsewhere. A 6-4-1-5 song "contains" 1-5-6-4 only
  this way.

A **strong** match is looped or a phrase, with the same chords or the same
families. The counts above use strong matches only.

Two more rules, both found by checking the results against songs:

- **Minor keys are read from the relative major as well.** The library
  writes every progression from a major tonic (`6 minor - 4 major - 1 major - 5 major`,
  never `1 minor - ♭6 major - …`), while 201
  charts are written from a minor or modal tonic. Without this, Flowers (A
  minor) could never match the progression its own sheet names. Such matches
  say "from the relative major".
- **A held or restruck chord counts once,** and a walking bass under one chord
  does not split it (`1 maj | 1 maj/3 | 4 maj` is 1-4).

Songs are read as they are played: a chorus written once under repeat signs is
heard twice, and a D.S. back into a verse is a second pass of it.

## All matches by kind

| Placement / closeness | Song matches |
| --------------------- | ------------ |
| inside/exact          | 672          |
| inside/family         | 3500         |
| inside/loose          | 5912         |
| loop/exact            | 158          |
| loop/family           | 371          |
| loop/loose            | 1122         |
| phrase/exact          | 398          |
| phrase/family         | 2452         |
| phrase/loose          | 5096         |

## The other files

- [findings.md](findings.md) — what the first run found, and the decisions it
  raises. Written by hand; not regenerated.
- [progressions.md](progressions.md) — every progression heard anywhere, with
  the songs, activities and curriculum levels it is heard in.
- [genre-activities.md](genre-activities.md) — each genre activity loop and the
  library progressions it plays.
- [missing-loops.md](missing-loops.md) — loops songs are built on that the
  library does not have, the content team's shortlist for new entries.
- [data-issues.md](data-issues.md) — song links the chords disagree with,
  chart labels no chord could be read from, and library spellings to check.
