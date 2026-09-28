# The Guitar Atlas: Book One — errata

Found while turning the 1st-edition PDF into lesson data for Music Atlas (checked page by page, September 2026). Page numbers are PDF pages; the printed page number is one lower from the D♭ section on.

**Status** — _Corrected in app_: the app shows the correction instead of what is printed. _Logged_: the app follows the book; the item is here for the next edition.

The same list lives in code as `src/curriculum/data/guitar/bookOneErrata.ts`; a test keeps the two in step.

## Whole book

| ID                                | PDF page | Where                                                                                                                         | As printed                                                                                               | Correction                                                                                              | Status           |
| --------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------- |
| `ALL-map-5-label`                 | —        | Music Maps after the 7th-chord page, in every key: both maps are labelled "Example 4"                                         | Example 4: Four Bars (second map)                                                                        | Example 5: Four Bars                                                                                    | Corrected in app |
| `ALL-guitar-fundamentals-missing` | 4        | Contents: Guitar Fundamentals (Layout of the Guitar p.9, Hand Positions p.11, Finger Placement for Chords p.12)               | listed in the contents, but the PDF goes from the Guidebook (p.7) straight to Book One (p.13)            | add the Guitar Fundamentals pages; the app has no guitar version of Piano Fundamentals until they exist | Logged           |
| `ALL-preface-guit-atlas`          | 6        | Preface heading                                                                                                               | HOW TO USE THE GUIT ATLAS                                                                                | HOW TO USE THE GUITAR ATLAS                                                                             | Logged           |
| `ALL-acknowledgments-piano-atlas` | 3        | Acknowledgments                                                                                                               | thanks students, teaching artists and partners for shaping "the Piano Atlas"                             | refer to the Guitar Atlas (or to the Music Atlas series)                                                | Logged           |
| `ALL-flat-five-spacing`           | —        | Every "7. … minor 7(♭5)" heading, and the B♭ map label "A minor 7 ( b5)"                                                      | stray spaces around the flat: "7( ♭5)"                                                                   | "7(♭5)"                                                                                                 | Logged           |
| `ALL-triad-bars-in-7th-maps`      | —        | The 7th-chord Music Maps of D, A, E, B, A♭, E♭ and F include triad bars (e.g. "5 maj")                                        | triads mixed into the maps that follow the 7th-chord page                                                | confirm this is intended; the app plays them as printed (C, G, F♯, D♭ and B♭ use only 7th chords there) | Logged           |
| `ALL-map-voicings-differ`         | —        | Music Maps in most keys                                                                                                       | map boxes often use a voicing that is not on the chord pages (e.g. C Example 5 draws Am7 as 5-X-5-5-5-X) | confirm this is intended; the app shows each map voicing as drawn                                       | Logged           |
| `ALL-fingering-varies-by-page`    | —        | The same shape fingered differently on different pages (F♯ minor on the A and E pages; C7 on the F page vs F7 on the B♭ page) | barre on one page, separate fingers on another                                                           | pick one fingering per shape; the app shows each page as printed                                        | Logged           |

## C Major

| ID                      | PDF page | Where                                              | As printed                                                | Correction                                                                                    | Status           |
| ----------------------- | -------- | -------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------- |
| `C-triad-5-g-fingering` | 16       | Root Position Triads, box 5 (G major) hand graphic | 3 2 3 (index on fret 3 of string 6, so the fingers cross) | 2 3 3: middle on string 6, index on string 5, ring on string 1, as the G and D pages print it | Corrected in app |
| `C-7th-page-number`     | 18       | Root Position 7th Chords page number               | 15                                                        | 17                                                                                            | Logged           |

## G Major

| ID                       | PDF page | Where                                                | As printed                                       | Correction                                                              | Status           |
| ------------------------ | -------- | ---------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- | ---------------- |
| `G-7th-8-caption`        | 24       | Root Position 7th Chords, closing box "1. G major 7" | X-10-12-11-10-X (would sound G D F♯ A, no third) | X-10-12-11-12-X, as the diagram and the hand graphic (10 11 12 12) show | Corrected in app |
| `G-triad-2-am-fingering` | 22       | Root Position Triads, box 2 (A minor) hand graphic   | 2 2 1 (ring finger behind the index and middle)  | 1 2 2, as the C and F pages print it                                    | Corrected in app |

## A Major

| ID                    | PDF page | Where                                | As printed | Correction                                                 | Status           |
| --------------------- | -------- | ------------------------------------ | ---------- | ---------------------------------------------------------- | ---------------- |
| `A-map-3-bar-2-name`  | 35       | Music Maps, Example 3, bar 2         | F# major   | F# minor (the progression says 6 min; the box is F♯ minor) | Corrected in app |
| `A-map-4-bar-4-name`  | 37       | Music Maps, first 4-bar map, bar 4   | D minor 7  | D major 7 (the progression says 4 maj7; the box is Dmaj7)  | Corrected in app |
| `A-scale-page-number` | 33       | Major & Pentatonic Scale page number | 26         | 32                                                         | Logged           |

## E Major

| ID                      | PDF page | Where                                              | As printed                                                                            | Correction                                                                 | Status           |
| ----------------------- | -------- | -------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------- |
| `E-map-5-bar-2-name`    | 43       | Music Maps, second 4-bar map, bar 2                | G# minor                                                                              | G# minor 7 (the progression says 3 min7; the box is G♯m7)                  | Corrected in app |
| `E-triad-1-e-fingering` | 40       | Root Position Triads, box 1 (E major) hand graphic | 2 2 1                                                                                 | 1 2 2, as the A and B pages print it                                       | Corrected in app |
| `E-triad-3-gsm-barre`   | 40       | Root Position Triads, box 3 (G♯ minor)             | separate dots at fret 4 on strings 6 and 3; the hand shows only index, ring and pinky | an index barre at fret 4 across strings 6-3, as the F♯ page draws G♯ minor | Corrected in app |

## B Major

| ID                          | PDF page | Where                                  | As printed                                                                            | Correction                                                                 | Status           |
| --------------------------- | -------- | -------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------- |
| `B-triad-6-gsm-barre`       | 46       | Root Position Triads, box 6 (G♯ minor) | separate dots at fret 4 on strings 6 and 3; the hand shows only index, ring and pinky | an index barre at fret 4 across strings 6-3, as the F♯ page draws G♯ minor | Corrected in app |
| `B-pentatonic-caption-case` | 45       | Pentatonic caption                     | The B Major Pentatonic Scale has 5 notes (also on the F♯ page)                        | The B major pentatonic scale has 5 notes, as the other keys print it       | Logged           |

## D♭ Major

| ID                     | PDF page | Where                                                 | As printed                                                                                | Correction                                                                                  | Status           |
| ---------------------- | -------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------- |
| `Db-map-1-fret-labels` | 59       | Music Maps, Example 1 (D♭ major)                      | 2-4-4-3-X-X at frets 1-5 (the F♯ major box from the F♯ page; sounds F♯ major)             | X-4-6-6-6-X, the D♭ major shape from the D♭ triad page                                      | Corrected in app |
| `Db-map-2-fret-labels` | 59       | Music Maps, Example 2 (D♭ major, G♭ major)            | 2-4-4-3-X-X \| X-2-4-4-4-X at frets 1-5 (the F♯ page boxes; sound F♯ major and B major)   | X-4-6-6-6-X \| 2-4-4-3-X-X, the D♭ and G♭ shapes from the D♭ triad page                     | Corrected in app |
| `Db-map-3-fret-labels` | 59       | Music Maps, Example 3 (E♭ minor, D♭ major)            | X-2-4-4-3-X \| X-2-4-4-4-X with fret labels 1-5 (sound B minor and B major)               | X-6-8-8-7-X \| X-4-6-6-6-X, the E♭ minor and D♭ major shapes from the D♭ triad page         | Corrected in app |
| `Db-triad-4-caption`   | 58       | Root Position Triads, box 4 (G♭ major)                | X-2-4-4-3-X (would sound B minor)                                                         | 2-4-4-3-X-X, as the diagram and the hand graphic (2 3 4 4) show                             | Corrected in app |
| `Db-map-2-bar-2-dot`   | 59       | Music Maps, Example 2, bar 2, fourth note             | a plain quarter note (the bar adds up to 7/8; its duration bar spans 6 sixteenths)        | a dotted quarter, as bar 1 prints it                                                        | Corrected in app |
| `Db-7th-8-octave`      | 60       | Root Position 7th Chords, closing box "1. D♭ major 7" | X-4-6-5-6-X, the same voicing as box 1 (every other key places this box an octave higher) | suggested: X-16-18-17-18-X. The app keeps the drawn voicing and does not call it an octave. | Logged           |

## A♭ Major

| ID                    | PDF page | Where                                       | As printed                                                                | Correction                                                                                    | Status           |
| --------------------- | -------- | ------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------- |
| `Ab-7th-6-fm7-shape`  | 66       | Root Position 7th Chords, box 6 (F minor 7) | X-7-9-7-8-X (diagram, caption and hand all sound E3 B3 D4 G4 = E minor 7) | X-8-10-8-9-X, index barre at fret 8 (the A♭ Example 5 Music Map already draws this F minor 7) | Corrected in app |
| `Ab-map-5-bar-3-name` | 67       | Music Maps, second 4-bar map, bar 3         | Ab major                                                                  | Ab major 7 (the progression says 1 maj7; the box is A♭maj7)                                   | Corrected in app |

## E♭ Major

| ID                     | PDF page | Where                                                 | As printed                                                                                          | Correction                                                                                  | Status           |
| ---------------------- | -------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------- |
| `Eb-triad-6-cm-shape`  | 70       | Root Position Triads, box 6 (C minor)                 | X-3-5-3-4-X with a barre (sounds C minor 7); the hand graphic prints 3 4 5 5, which fits the triad  | X-3-5-5-4-X, fingers 1 3 4 2, as the A♭ triad page draws C minor                            | Corrected in app |
| `Eb-map-3-fret-labels` | 71       | Music Maps, Example 3 (F minor, C minor)              | fret labels 8-12 put the shapes one fret high: X-9-11-11-10-X \| 9-11-11-9-X-X (F♯ minor, C♯ minor) | fret labels 7-11: X-8-10-10-9-X \| 8-10-10-8-X-X                                            | Corrected in app |
| `Eb-7th-8-octave`      | 72       | Root Position 7th Chords, closing box "1. E♭ major 7" | 11-X-12-12-11-X, root E♭3 — the same register as box 1, in a different voicing                      | suggested: X-18-20-19-20-X. The app keeps the drawn voicing and does not call it an octave. | Logged           |

## B♭ Major

| ID                    | PDF page | Where                                 | As printed                                     | Correction                                                       | Status           |
| --------------------- | -------- | ------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------- | ---------------- |
| `Bb-triad-2-cm-shape` | 76       | Root Position Triads, box 2 (C minor) | X-3-5-3-4-X (sounds C3 G3 B♭3 E♭4 = C minor 7) | X-3-5-5-4-X, fingers 1 3 4 2, as the A♭ triad page draws C minor | Corrected in app |

## Questions for the author

- **Root Position 7th Chords, closing box "1. D♭ major 7"** (`Db-7th-8-octave`): suggested: X-16-18-17-18-X. The app keeps the drawn voicing and does not call it an octave.
- **Root Position 7th Chords, closing box "1. E♭ major 7"** (`Eb-7th-8-octave`): suggested: X-18-20-19-20-X. The app keeps the drawn voicing and does not call it an octave.
- **Contents: Guitar Fundamentals (Layout of the Guitar p.9, Hand Positions p.11, Finger Placement for Chords p.12)** (`ALL-guitar-fundamentals-missing`): add the Guitar Fundamentals pages; the app has no guitar version of Piano Fundamentals until they exist
- **The 7th-chord Music Maps of D, A, E, B, A♭, E♭ and F include triad bars (e.g. "5 maj")** (`ALL-triad-bars-in-7th-maps`): confirm this is intended; the app plays them as printed (C, G, F♯, D♭ and B♭ use only 7th chords there)
- **Music Maps in most keys** (`ALL-map-voicings-differ`): confirm this is intended; the app shows each map voicing as drawn
- **The same shape fingered differently on different pages (F♯ minor on the A and E pages; C7 on the F page vs F7 on the B♭ page)** (`ALL-fingering-varies-by-page`): pick one fingering per shape; the app shows each page as printed

## Source asset notes

The chordpic.com diagram exports the book was built from (`2. The Guitar Atlas/1 Book One - Key Centers`) have no fret numbers, draw barres as separate dots, and contain material the PDF does not use (pentatonic positions 2-3, full Ionian patterns, relative-minor pentatonics, empty inversion folders). Two source files carry the wrong shape into the book: `Bb Root Position/Cm.png` and `Eb Root Position/Cm.png` are the C minor 7 shape (`C-7.png`). `F Pentatonic/major octave 0.png` is the F major scale, misfiled under Pentatonic.
