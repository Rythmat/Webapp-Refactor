# Data issues the crosscheck turned up

Generated 2026-10-15. None of these were changed: charts are edited in the back office as well as the repo, and the library's content is the owner's.

## Songs linked by name whose chords do not have the progression

The source sheets named these songs, and the library links them, but the chart nowhere plays the progression, at any closeness. Either the chart, the progression or the link is wrong.

| Progression                                                               | Linked song                                |
| ------------------------------------------------------------------------- | ------------------------------------------ |
| #198 1 major7 - b5 dominant7b5 - 4 major7 - b6 major7 - 5 dominant7sus4   | Love On Top (Beyonce)                      |
| #199 1 major7 - b5 dominant7b5 - 4 major7 - 5 dominant7sus4               | Love On Top (Beyonce)                      |
| #305 1 dominant7 - 6 dominant7 - 2 dominant7 - 4 dominant7 - b7 dominant7 | Boogie On Reggae Woman (Stevie Wonder)     |
| #409 4 major7 - 5 major - 4 major7 - 6 minor7 - 5 major - 4 major7        | Dreams (Fleetwood Mac)                     |
| #452 6 minor7 - 2 dominant7 - 5 dominant7sus4 - 1 major                   | Blackbird (The Beatles)                    |
| #551 3 major/#5 - 6 minor - 4 minor7 - #5 diminished7                     | This Love (Maroon 5)                       |
| #616 1 major - 2 minor - 6 minor - 5 major - 6 minor - 5 major            | Stay (Rihanna featuring Mikky Ekko)        |
| #680 1 major - 1 major/6 - 1 major/4 - 1 major                            | Can’t Stop The Feeling (Justin Timberlake) |
| #681 1 major - b7 major - 6 minor7                                        | Tell Me Something Good (Chaka Khan)        |
| #688 3 dominant7#5 - 6 minor7 - 3 dominant7#5 - 6 minor7                  | On & On (Erykah Badu)                      |

## Chart labels no chord could be read from

| Label      | Where                                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| `4 g♯min7` | cigarettes_and_chocolate_milk Verse 4                                                                       |
| `4 c♯min7` | look_what_i_found Verse 1; look_what_i_found Chorus 1; look_what_i_found Chorus 2; look_what_i_found Bridge |

## Library slash chords counted from the chord, not the key

The charts count a slash bass from the key ('F/C' in F is `1 maj/5`). Most library slash chords agree, but these read as counted from the chord's root (`4 minor6/b3` for F–6/A♭, where the key's ♭3 would be E♭). The matcher only asks for a bass at the stricter tiers, so they still match at the loosest; respelling them would let them match fully.

- #24 1 major7 - 1 dominant7 - 6 minor7 - 4 minor6/b3 - 1 major/5
- #120 1 major7 - 2 minor7b5 - 4 major7 - 4 minor6/5
- #171 1 major7 - 3 dominant7#5 - 6 minor7 - 4 minor6/b3 - 1 major/5
- #217 1 major7 - 4 major7 - 3 dominant7#5 - 6 minor7 - 4 minor6/b3 - 1 major/5
- #229 1 major7 - 4 major7 - 6 minor7 - 4 minor6/b3 - 1 major/5
- #242 1 major7 - 5 dominant7 - 6 minor7 - 4 minor6/b3 - 1 major7/5
- #277 1 major7 - 6 minor7 - 4 minor6/b3 - 1 major/5
- #465 6 minor7 - 4 minor6/b3 - 5 dominant7sus4 - 1 major7
