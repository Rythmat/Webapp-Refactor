# The song body schema has drifted — for Ryan

Written 27 September 2026, straight after running the repo → store import for
the first time. Companion to `phase-2-api-handoff.md`; this one is smaller and
more urgent, because it is blocking a migration that is already half done.

---

## What happened

The webapp now has an admin page at `/console/import-songs` that compares
every chord chart in the repo against the one the content store holds and
writes the differences. First run, against `api-refactor.vercel.app`:

|                                                |         |
| ---------------------------------------------- | ------- |
| Already identical                              | 13      |
| Written                                        | 625     |
| **Rejected by `PUT /api/admin/content/items`** | **341** |
| Landed                                         | 284     |
| In the store, not in the repo                  | 2       |

Every rejection is the same error, with different keys:

```
Invalid song body — sections.0: Unrecognized key(s) in object: 'instrumental';
sections.2.bars.0: Unrecognized key(s) in object: 'repeatStart';
sections.4.bars.15: Unrecognized key(s) in object: 'repeatEnd', 'fine'
```

So the API's song-body schema is strict, and it predates a good deal of the
`Song` type. The store's copy of the library turned out to predate the section
renaming too — it still had sections called `Section B` — which is what
prompted the migration.

**The half that failed is the half that matters.** The 284 that landed are the
charts carrying no roadmap and no instrumental section; the 341 that bounced
are the ones with the repeat barlines, the endings, the codas, the cues, the
key changes and the metre. The corpus in the store is now a mix, which is
safe — each song is internally consistent — and the importer compares before
it writes, so re-running it once the schema is fixed picks up exactly the
remainder.

---

## What the schema needs to accept

Source of truth is `src/curriculum/types/songLibrary.ts` in `Webapp-Refactor`.
Rather than list a diff that will be stale by the time you read it, here is
every key the 640-chart corpus actually uses today, with how many songs use
it. Making the schema accept exactly this set will clear all 341.

### Song (root)

| Key                                                                                                                                                                                                  | Songs |                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------- |
| `id` `title` `artist` `year` `historicalDescription` `key` `keyRoot` `mode` `tempo` `timeSignature` `difficulty` `genreTags` `techniques` `sections` `audioSources` `artistImageSource` `popularity` | 640   | accepted today                                              |
| `artistImageRef`                                                                                                                                                                                     | 638   | accepted today                                              |
| `composer`                                                                                                                                                                                           | 4     | **rejected** — the credits work in `phase-2-api-handoff.md` |
| `session`                                                                                                                                                                                            | 4     | **rejected** — same                                         |
| `credits`                                                                                                                                                                                            | 4     | **rejected** — same                                         |
| `relatedRecordings`                                                                                                                                                                                  | 3     | **rejected** — same                                         |
| `origin`                                                                                                                                                                                             | 1     | check                                                       |
| `contentRefs`                                                                                                                                                                                        | 1     | check                                                       |

### SongSection

| Key                 | Songs |                                                                     |
| ------------------- | ----- | ------------------------------------------------------------------- |
| `id` `label` `bars` | 640   | accepted today                                                      |
| `instrumental`      | 246   | **rejected** — `boolean \| 'first-time'`                            |
| `repeatCount`       | 4     | check — legacy, being replaced by repeat barlines                   |
| `measuresPerRow`    | 0     | not used in the repo, but in the type and in the store's own copies |
| `notes`             | 0     | in the type                                                         |

### ChordBar

| Key                     | Songs  |                                                                                                           |
| ----------------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| `chords`                | 640    | accepted today                                                                                            |
| `restBars`              | 242    | accepted today                                                                                            |
| `fermata`               | 207    | accepted today                                                                                            |
| `repeatStart`           | 164    | **rejected**                                                                                              |
| `repeatEnd`             | 164    | **rejected**                                                                                              |
| `repeatTimes`           | 24     | **rejected** — `number`                                                                                   |
| `keyChange`             | 12     | **rejected** — `string`, e.g. `'A♭ major'`                                                                |
| `cue`                   | 2      | **rejected** — `string`                                                                                   |
| `fine`                  | 1      | **rejected**                                                                                              |
| `ending`                | 1      | **rejected** — `number[]`, the volta passes                                                               |
| `segno` `coda` `toCoda` | 1 each | **rejected**                                                                                              |
| `jump`                  | 1      | **rejected** — `'D.C.' \| 'D.S.' \| 'D.C. al Coda' \| 'D.S. al Coda' \| 'D.C. al Fine' \| 'D.S. al Fine'` |
| `timeSignature`         | 0      | **new, and please add it** — `[number, number]`, a per-bar metre                                          |
| `systemBreak`           | 0      | **new** — `boolean`, this bar starts a system                                                             |
| `systemRun`             | 0      | **new** — `number`, these bars are one system                                                             |

The last three are at zero because they landed this week and the data using
them is the next job — 53 songs in the source prop book change metre mid-chart
and could not be written down until the field existed. They will go from zero
to dozens shortly, so it is worth adding them in the same pass.

### ChordHit

`degree` `chordName` `beat` `duration` on all 640, plus `voicingHint` in the
type and unused so far. No rejections here.

---

## The counts do not quite add up, and that is deliberate

Taking the rejected keys above and asking how many of the 640 charts carry at
least one gives 339, 343 or 345 depending on where the boundary is drawn —
against 341 actually rejected. I could not land it exactly, so I have not
guessed which two or four songs make the difference. The inventory above is
measured rather than inferred, and matching the schema to it is a safer
instruction than matching it to my arithmetic.

---

## Two other things worth knowing

**Two songs live in the store and not in the repo.** The importer will not
touch them, by design — anything the store has and the repo does not is
somebody's work. Worth someone looking at what they are.

**Strictness is right; the list is what is wrong.** A schema that silently
dropped `repeatStart` would have written 625 songs and quietly thrown away the
roadmap on 341 of them, and nobody would have noticed until a player on a
stand missed a repeat. The loud failure is the correct behaviour and it is why
we know.
