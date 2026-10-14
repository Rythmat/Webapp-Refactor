# Music Maps vs the existing charts: what differs

Seven of the Music Maps are songs that already have a chart. These charts were
not changed. This report lists where each map and chart disagree, with a
recommendation, for the product owner to decide. Written 13 October 2026.

Degrees below are in the chart's own key.

## 1. Can't Stop the Feeling! (Justin Timberlake)

The map and the chart disagree on which section is which.

|            | Map (pages 21–22)                                                                                                   | Chart (`cant_stop_the_feeling.ts`)                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Tempo      | 113 (page 2 says 118, a typo)                                                                                       | 112                                                                                                             |
| Verse      | C – Am7 – **Fmaj7** – Am7                                                                                           | C – Am7 – **F** – Am7                                                                                           |
| Chorus     | C – Am7 – Fmaj7 – Am7 (same loop as the verse)                                                                      | C7sus4 – C7sus4 – C – C                                                                                         |
| Pre-chorus | B♭/C (`1 dom9sus4`) – C – B♭maj7/C (`1 dom13sus4`) – C, then A♭/B♭ (`♭7 dom13sus4`) – B♭ – Fm9 (`4 min9`) – B♭9sus4 | none; the same material is labelled "Chorus" (C7sus4 – C – C) and "Verse 2"/"Verse 5" (B♭7sus4 – B♭ – Fm7 – B♭) |

**Recommendation:** relabel the chart as the map has it. The chart's "Chorus"
and "Verse 2" become one 8-bar **Pre-Chorus**, and the C–Am7–Fmaj7–Am7 loop
after it becomes the **Chorus**. Take the map's voicings (B♭/C, B♭maj7/C,
A♭/B♭, Fm9, B♭9sus4) and Fmaj7.

## 2. Hey Ya! (Outkast)

|      | Map (page 24)                             | Chart (`hey_ya.ts`)                    |
| ---- | ----------------------------------------- | -------------------------------------- |
| Loop | G – C – C – **D (a 2/4 bar)** – **E** – E | G – C – C – D – **Em7** – Em7, all 4/4 |

The map's E is **E major** (keyboard and label; its summary's "6 min" is a
slip). The song's famous loop is G–C–D–E with a major E, and the short D bar
gives it its lopsided length.

**Recommendation:** take the map. The E bars become `E` (`6 maj`), and the D
bar becomes 2/4 (`timeSignature: [2, 4]` on that bar). The chart is also only
6 bars, with no form, so it is worth writing out in full.

## 3. Creep (Radiohead)

|        | Map (page 27)                        | Chart (`creep.ts`)                                     |
| ------ | ------------------------------------ | ------------------------------------------------------ |
| Tempo  | 94                                   | 97                                                     |
| Chords | G – **B** – C – **Cm**, one bar each | G G – **B7** B7 – C C – **Cm7** Cm7 – G, two bars each |
| Form   | Verse and Chorus (same loop)         | one 9-bar "Verse"                                      |

The chart's two bars per chord matches the recording (about 92 BPM, two bars
of each chord). The map compresses it to one bar each.

**Recommendation:** keep the chart's two-bar rhythm and write out Verse and
Chorus sections. You choose between the map's plain B and Cm and the chart's
B7 and Cm7.

## 4. Get Lucky (Daft Punk featuring Pharrell Williams)

|        | Map (page 33)    | Chart (`get_lucky.ts`)     |
| ------ | ---------------- | -------------------------- |
| Key    | A (parent major) | **B dorian**               |
| Chords | Bm – D – F♯m – E | **Bm7** – D – **F♯m7** – E |
| Form   | Verse and Chorus | full form, 8 sections      |

Same progression. The chart has the sevenths and the whole form, and its key
already follows the real-tonic rule.

**Recommendation:** no change.

## 5. Into the Mystic (Van Morrison)

|                       | Map (pages 44–45)  | Chart (`into_the_mystic.ts`)          |
| --------------------- | ------------------ | ------------------------------------- |
| Verse and Chorus      | E♭ ×4, B♭ B♭ E♭ E♭ | the same, split into Verse and Chorus |
| Bridge, last two bars | **B♭7 – B♭7**      | **B♭ – B♭**                           |

**Recommendation:** take the map's B♭7 (`5 dom7`) in the bridge's last two
bars. Nothing else differs.

## 6. Havana (Camila Cabello featuring Young Thug)

|        | Map (page 49)                                                          | Chart (`havana.ts`)                                        |
| ------ | ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| Loop   | 2 bars: **Gm (2 beats) – E♭ (to the "and" of 3) – D7** tied into bar 2 | 3 bars: **Gm7 – E♭ – D7**, one bar each, plus an empty bar |
| Chords | Gm, E♭, D7                                                             | Gm7, E♭, D7                                                |

The map's two-bar riff, with D7 anticipated and accented, is the song's piano
figure. The chart's one chord per bar plays it at half speed against the
recording.

**Recommendation:** take the map's two-bar rhythm (Gm beats 1–2, E♭ 3–4, D7
the whole second bar), and fix the chart's empty bars.

## 7. Juice (Lizzo)

|       | Map (page 53)                                                                 | Chart (`juice.ts`)                          |
| ----- | ----------------------------------------------------------------------------- | ------------------------------------------- |
| Tempo | **100**                                                                       | **120**                                     |
| Loop  | Dm7 – **E♭/F** (`1 dom7sus4`) **→ F7** – **B♭maj7** – B♭maj7 **→ C7**, 4 bars | Dm7 Dm7 – F7 F7 – **B♭** B♭ – C7 C7, 8 bars |

The chart's 120 BPM with two bars per chord and the map's 100 BPM with one
bar per chord cover the loop in different time. The recording is about 120.
The map adds the E♭/F before F7 and the major 7 on B♭.

**Recommendation:** keep the chart's tempo and two-bar rhythm. Add the map's
E♭/F (in the bar before F7) and B♭maj7.

## Summary

| Song                    | Recommendation                                                                 |
| ----------------------- | ------------------------------------------------------------------------------ |
| Can't Stop the Feeling! | Relabel the sections as the map has them; take its slash chords and extensions |
| Hey Ya!                 | E major and a 2/4 bar, from the map; write out the form                        |
| Creep                   | Keep the chart's rhythm; Verse and Chorus sections; choose B/B7 and Cm/Cm7     |
| Get Lucky               | No change                                                                      |
| Into the Mystic         | B♭7 in the bridge                                                              |
| Havana                  | The map's two-bar riff                                                         |
| Juice                   | Keep the tempo; add E♭/F and B♭maj7                                            |
