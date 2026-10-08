# Music Maps → Song charts: reading guide

Music Maps are the iconic-notation song charts made by Music Bridge (Canva,
11 × 8.5 in). This guide records how to read one and turn it into a Song chart
in `src/curriculum/data/songs/`. It grows with every correction the product
owner makes during training. Source PDF: `~/Downloads/Music Maps (11 x 8.5 in).pdf`.
More maps exist under `~/Desktop/Music Bridge Master Folder/CMB/Music Atlas/The Piano Atlas/`.

## Reading a map

| Map element                          | Meaning                                                            | Chart field                                      |
| ------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------ |
| Colour wheel + letter beside it      | Key, always written as the **parent major**                        | `key`, `keyRoot`, `mode` (see Tonic below)       |
| Side stripe colour                   | Home key colour                                                    | —                                                |
| Chord block colour                   | The major key the chord is diatonic to (borrowed chords stand out) | — (cross-check only)                             |
| Degree summary, top right            | One cell per bar; the **functional** reading                       | `degree`                                         |
| Chord name above each keyboard       | The hand-shape name the player reads                               | `chordName`                                      |
| Highlighted keys                     | The voicing                                                        | `voicingHint`                                    |
| Coloured blocks / step grid / rhythm | When each chord is struck and how long it lasts                    | `beat`, `duration`                               |
| Repeat signs, "Repeat 4x"            | Repeats                                                            | `repeatStart` / `repeatEnd` / `repeatTimes`      |
| "Back to verse after chorus 1", etc. | Form                                                               | Full form written out + repeat signs + text cues |
| Odd-metre bar (Hey Ya 2/4)           | Metre change                                                       | per-bar `timeSignature`                          |
| QR code                              | YouTube link (also a clickable link annotation in the PDF)         | `audioSources`                                   |

## Rules (decided by the product owner, 2026-10-07)

1. **degree = function, chordName = hand shape.** A slash chord stays a slash
   chord in `chordName` (`B♭/C`, `E♭/F`, `Gm/C`); its functional reading from
   the summary goes in `degree` (`1 dom9sus4`, `1 dom7sus4`, `2 dom9sus4`).
2. **Respell enharmonics to fit the key and degree.** G♯m9 in F → A♭m9
   (`♭3 min9`); F♯maj7 in E♭ → G♭maj7 (`♭3 maj7`).
3. **Write out the full song form.** A map's combined label ("VERSE/CHORUS",
   "INTRO/VERSE/CHORUS/OUTRO") is expanded into the real sections of the
   recording, each with a legal single section name.
4. **Use repeat signs and voltas, plus text navigation cues where they help.**
   A repeat may span sections (see `down_under.ts`).
5. **Rhythm: as specific as practical, never a blocker.** Falling back to
   one chord per bar or beat-level slashes is acceptable.
6. **Voicings go in `voicingHint`** (bottom-to-top), read from the keyboards.
7. **12/8 counts as 4 dotted-quarter beats** (`timeSignature: [12, 8]`, a
   whole bar has `duration: 4`).
8. **Draft year, `historicalDescription` and Globe fields** (`credits` with
   `artistGlobeId`, `releases`, `session`) in the house style, for review.
9. **Charts that already exist in the repo are not overwritten.** Report the
   differences; the product owner decides.
10. **Melody-led maps (Halloween)** wait for parts-in-charts, which belongs to
    the Song chart editor renovation after the maps are done.

## Implementation notes (learned on We Shall Overcome)

- **Voicings.** Each keyboard snippet starts on the chord's lowest note.
  `voicingHint` is a bottom-to-top chord-tone order (`3-5-1`) that must match a
  `resultingOrder` in `src/curriculum/data/voicingAlgorithmLibrary.ts` exactly,
  or it is ignored. It records the inversion only, not the octave or doubled
  notes. Leave it unset for root position, and for slash chords (the bass is
  already in the name).
- **Variable verse counts** (hymns, folk songs): an open repeat around the
  Verse→Chorus pair, with no `repeatTimes`, plus a cue such as `'Repeat for each
verse'` on the last bar.
- **Chord names** follow the corpus: `C`, `Amin`, `Amin7`, `G7`, `G/B`.
  Slash degrees read `5 maj/7`.
- **Map summary vs body.** When they disagree, the keyboard (voicing) wins: We
  Shall Overcome's summary says `5 maj` where the keyboard shows G7, so the
  chart has `5 dom7`.
- **Registration.** Each new chart is imported in
  `src/curriculum/data/songs/bundled.ts` (import plus map entry, alphabetical).
- **Globe records.** Every credited name must be a record in
  `src/content/data/artists.json` (name-only records are fine). New albums
  go in `releases.json`, new labels in `labels.json`. Keep each file sorted by
  slug, one record per line.
- **Globe event.** Every chart needs a `song-<id>` event in
  `src/components/atlas/data/events/songLibrary.ts`, added by hand in id
  order: its generator (`src/scripts/buildGlobeData.mjs`) is retired. Year,
  city/lat/lng of the recording, genre, title "Song — Artist", the bio as
  `description`, tags, and the YouTube `videoId`.
- **Registration order.** `bundled.ts` imports follow eslint-plugin-import's
  alphabetize (`compareSpecifiers` in `src/scripts/repoContent/sources/songs.ts`);
  `repoSources.test.ts` checks it.
- **Hard-coded corpus totals** move with every new chart, artist, label,
  release or event: `deriveGraph.test.ts` (`from_year`), `integrity.test.ts`
  (credit coverage), `slugPatterns.test.ts` (songs, globe events),
  `recordBodySchemas.test.ts` (events), `artistIndex.characterization.test.ts`
  (digests), `vocabulary/__tests__/golden.test.ts` (graph/tables digests),
  `buildTableModel.repo.test.ts`, and the mock content server tests
  (`contentMockServer`, `mockWiring`, `persist`, `suggestionEndpoints`). Run
  the full suite; each failure names the number it now sees.
- **Checks:** `npx vitest run src/curriculum/data/songs/__tests__/ src/content/graph/__tests__/`
  under Node 24, and Prettier on the touched files.

## Open

- Nothing open.

Decided 2026-10-07: **number from the real tonic.** The maps number from the
parent major (Havana's Gm = "6 min"). Charts choose the tonic the way the
corpus does (Havana is `G minor`, Gm = `1 min`) and renumber; the map's
degrees are only a cross-check.

## Song inventory (PDF pages)

| Pages | Song                                   | Map key | YouTube                                     | In repo?                |
| ----- | -------------------------------------- | ------- | ------------------------------------------- | ----------------------- |
| 1–3   | Templates                              | —       | —                                           | —                       |
| 4–7   | Stay — Rihanna (pg.1 lost)             | C       | https://www.youtube.com/watch?v=JF8BRvqGCNs | no                      |
| 8–10  | Halloween — John Carpenter             | A       | https://www.youtube.com/watch?v=6vtsKGzGVK4 | no (deferred, rule 10)  |
| 11–12 | We Shall Overcome — Joan Baez          | C       | https://www.youtube.com/watch?v=7akuOFp-ET8 | no                      |
| 13–14 | Glory — Common & John Legend           | C       | https://www.youtube.com/watch?v=HUZOKvYcx_o | no                      |
| 15–17 | Happy Birthday — Stevie Wonder         | C       | https://www.youtube.com/watch?v=RcVZfJO01NI | no                      |
| 18–20 | Flowers — Miley Cyrus                  | C       | https://www.youtube.com/watch?v=G7KNmW9a75Y | no                      |
| 21–22 | Can't Stop the Feeling — J. Timberlake | C       | https://www.youtube.com/watch?v=ru0K8uYEZWw | `cant_stop_the_feeling` |
| 23    | Skin — Dijon                           | G       | https://www.youtube.com/watch?v=lFaj0arcZY8 | no                      |
| 24    | Hey Ya! — Outkast                      | G       | https://youtu.be/PWgvGjAhvIw?t=67           | `hey_ya`                |
| 25–26 | New Light — John Mayer                 | G       | https://www.youtube.com/watch?v=2PH7dK6SLC8 | no                      |
| 27    | Creep — Radiohead                      | G       | https://www.youtube.com/watch?v=XFkzRNyygfk | `creep`                 |
| 28    | The Feels — Labrinth                   | D       | https://www.youtube.com/watch?v=54Al9BpiYPw | no                      |
| 29    | Best Part — Daniel Caesar              | D       | https://www.youtube.com/watch?v=hKgl5-lkT8U | no                      |
| 30    | Evergreen — Omar Apollo                | A       | https://youtu.be/gk3G4SLo8k4                | no                      |
| 31    | Go Gina — SZA                          | A       | https://www.youtube.com/watch?v=UWktRW128UA | no                      |
| 32    | As It Was — Harry Styles               | A       | https://www.youtube.com/watch?v=H5v3kku4y6Q | no                      |
| 33    | Get Lucky — Daft Punk                  | A       | https://www.youtube.com/watch?v=5NV6Rdv1a3I | `get_lucky`             |
| 34    | Anti-Hero — Taylor Swift               | E       | https://www.youtube.com/watch?v=b1kbLwvqugk | no                      |
| 35    | EARFQUAKE — Tyler, The Creator         | E       | https://youtu.be/HmAsUQEFYGI?t=78           | no                      |
| 36    | Hustlin' — Rick Ross                   | B       | https://www.youtube.com/watch?v=JU9TouRnO84 | no                      |
| 37–38 | The Bird — Anderson .Paak              | D♭      | https://www.youtube.com/watch?v=KXdW0g6jAxE | no                      |
| 39    | Still D.R.E. — Dr. Dre (use this, D♭)  | D♭      | https://www.youtube.com/watch?v=_CL6n0FJZpk | no                      |
| 40    | Still D.R.E. (C version — ignore)      | C       | same                                        | —                       |
| 41    | I KNOW ? — Travis Scott                | A♭      | https://www.youtube.com/watch?v=fmdLsdmYzTo | no                      |
| 42    | Kill Bill — SZA                        | A♭      | https://www.youtube.com/watch?v=SQnc1QibapQ | no                      |
| 43    | Japanese Denim — Daniel Caesar         | E♭      | https://www.youtube.com/watch?v=FG2PgVl0Nlc | no                      |
| 44–45 | Into the Mystic — Van Morrison         | E♭      | https://www.youtube.com/watch?v=4Yvdx1lIAv8 | `into_the_mystic`       |
| 46    | Sweater Weather — The Neighbourhood    | B♭      | https://www.youtube.com/watch?v=GCdwKhTtNNw | no                      |
| 47–48 | Say It — Maggie Rogers                 | B♭      | https://www.youtube.com/watch?v=qwWL6GTK1RA | no                      |
| 49    | Havana — Camila Cabello                | B♭      | https://youtu.be/BQ0mxQXmLsk?t=148          | `havana`                |
| 50    | Goodie Bag — Still Woozy               | F       | https://www.youtube.com/watch?v=zL3wWykAKfs | no                      |
| 51    | Sober — Childish Gambino               | F       | https://www.youtube.com/watch?v=jx96Twg-Aew | no                      |
| 52    | Heather — Conan Gray                   | F       | https://www.youtube.com/watch?v=24u3NoPvgMw | no                      |
| 53    | Juice — Lizzo                          | F       | https://www.youtube.com/watch?v=XaCrQL_8eMY | `juice`                 |
| 54    | Alright — Kendrick Lamar               | F       | https://www.youtube.com/watch?v=Z-48u_uWMHY | no                      |

Stay's page 1 (Verse) is lost: rebuild it from the partial map plus research.
Glory's page 2 links to the Canva template instead of a video.
