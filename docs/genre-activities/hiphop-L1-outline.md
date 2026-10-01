# Hip Hop L1 "Trap" — activity outline (for Aaron's sign-off)

Key **C minor** · tempo **72** (range 65–80, half-time Trap) · triads only · the
challenge is inversions. Play-along settings come from the ledger's "Hip-hop
play-along specs". **agreed** = follows a ledger decision; **draft** = Claude's
proposal, needs Aaron's OK.

Chord activities sit high (D-032): voicings start in C5–C6.

## Rules the flow must meet (T-011 checklist)

- Structure as Pop/Funk: sections A Melody, B Chords, C Bass, D Performance;
  steps grouped by subsection (A1, A2 …); every step has a unique `tag`
  (progress is keyed by tag).
- Melody: each scale gets up out of time → down out of time → up & down in time,
  then contours/phrases, then the next scale (D-043).
- Assessments: out of time `pitch_order`; in time `pitch_order_timing`;
  play-alongs `pitch_order_timing_duration`.
- Chord symbols and labels through `lib/chordNotation` (hybrid numbering:
  "1 min", "4 min", "5 maj"); "intervals" only for distances, numbered scale
  notes are "scale degrees".
- ≤ 4-note chords sit in one clef; only two-hand parts split.
- Register: Hip Hop chords start ≤ C6 and reach ≤ C7; bass ≤ C4; a figure
  moves as one unit. Bass 5th always from the chord root.
- 8th-note chunking is always staccato (D-046).
- Bass moves by step between neighbouring roots, never the 7th leap (D-033).
- Practice Tracks are offered at the end of each section (D-021).

## A — Melody

| Step | Activity                                    | Assessment         | Content                                                                                                             | Status |
| ---- | ------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------- | ------ |
| A1.1 | C Minor Pentatonic Ascending (Out of Time)  | pitch_order        | C4 E♭4 F4 G4 B♭4 C5                                                                                                 | agreed |
| A1.2 | C Minor Pentatonic Descending (Out of Time) | pitch_order        | C5 → C4                                                                                                             | agreed |
| A1.3 | C Minor Pentatonic — Up & Down (In Time)    | pitch_order_timing | up and back, quarters                                                                                               | agreed |
| A2.1 | 3-Note Trap Melody (play-along)             | …\_duration        | G4 (1) · B♭4 ("and" of 2) · C5 (4, held) — rhythm mp_hiphop_3b; over the Cm vamp                                    | draft  |
| A2.2 | 5-Note Trap Melody (play-along)             | …\_duration        | C5 (1) · E♭5 ("and" of 2) · F5 (3) · E♭5 ("and" of 3) · C5 ("and" of 4) — rhythm mp_hiphop_4a + pickup; bar 2 rests | draft  |
| A3.1 | C Aeolian Ascending (Out of Time)           | pitch_order        | C4 D4 E♭4 F4 G4 A♭4 B♭4 C5                                                                                          | agreed |
| A3.2 | C Aeolian Descending (Out of Time)          | pitch_order        | C5 → C4                                                                                                             | agreed |
| A3.3 | C Aeolian — Up & Down (In Time)             | pitch_order_timing | up and back, quarters                                                                                               | agreed |
| A4.1 | ♭6 → 5 Trap Melody (play-along)             | …\_duration        | C5 (1) · A♭4 ("and" of 2) · G4 (4, held) — the bass's ♭6→5 move in the melody                                       | draft  |
| A4.2 | 6-Note Aeolian Melody (play-along)          | …\_duration        | bar 1: E♭5 D5 C5 (1, "and" of 2, 4) · bar 2: A♭4 G4 C5 (1, "and" of 2, 4)                                           | draft  |

Play-alongs: Trap A drums, 808 kit, 808 bass on the Trap foundation, Cm vamp
chords held (whole notes). Engine plays drums, bass, chords; student plays melody.

## B — Chords (triads, inversions)

| Step | Activity                                            | Assessment         | Content                                                     | Status              |
| ---- | --------------------------------------------------- | ------------------ | ----------------------------------------------------------- | ------------------- |
| B1.1 | Cm — Root Position Arpeggio                         | pitch_order        | C5 E♭5 G5                                                   | agreed (root first) |
| B1.2 | Cm — Root Position, Quarter-Note Chunking (In Time) | pitch_order_timing | C5-E♭5-G5 ×4                                                | draft               |
| B1.3 | Fm — Root Position Arpeggio + Chord                 | pitch_order        | F5 A♭5 C6                                                   | agreed              |
| B1.4 | G — Root Position Arpeggio + Chord                  | pitch_order        | G4 B4 D5 (nearest to Cm; G5 B5 D6 if you want all in C5–C6) | draft               |
| B1.5 | Play-Along: Cm – Fm (root position)                 | …\_duration        | Cm Cm Fm Fm, whole notes · Trap B, 808 slide bass           | agreed (spec)       |
| B1.6 | Play-Along: Cm – G (root position)                  | …\_duration        | Cm Cm G G, Trap 2-bar comping · Trap B, 808 staccato bass   | agreed (spec)       |
| B2.1 | Cm 1st Inversion                                    | pitch_order        | E♭5 G5 C6                                                   | agreed              |
| B2.2 | Cm 1st Inversion ↔ Fm Root (Out of Time)           | pitch_order        | E♭5-G5-C6 → F5-A♭5-C6 (C stays on top)                      | agreed              |
| B2.3 | G 1st Inversion                                     | pitch_order        | B4 D5 G5                                                    | agreed              |
| B2.4 | Cm Root ↔ G 1st Inversion (Out of Time)            | pitch_order        | C5-E♭5-G5 → B4-D5-G5 (G stays on top)                       | agreed              |
| B3.1 | Two-Chord Jam: Cm 1st inv. ↔ Fm                    | …\_duration        | one bar each, held · Trap A, 808 locks to kick              | agreed (spec)       |
| B3.2 | Two-Chord Jam: Cm ↔ G 1st inv.                     | …\_duration        | one bar each, 8th chunking staccato · Trap A, 808 slide     | agreed (spec)       |

## C — Bass (awaiting Q-019)

808 register around C2; the Trap pattern (D-039–D-042). Over the Cm vamp.

| Step | Activity                   | Content                                      | Status        |
| ---- | -------------------------- | -------------------------------------------- | ------------- |
| C1.1 | Trap Rhythm, One Note      | C on 1 and on the "and" of 3                 | draft (Q-019) |
| C1.2 | Trap Foundation            | C on 1, G on the "and" of 3 (dotted quarter) | agreed        |
| C1.3 | Expansion in Bar 2: 5 → ♭7 | bar 2: G, B♭ as dotted 8ths                  | agreed        |
| C1.4 | Expansion in Bar 1: 5 → ♭3 | bar 1: G, E♭ as dotted 8ths                  | agreed        |
| C1.5 | Aeolian Expansion: ♭6 → 5  | bar 2: A♭, G as dotted 8ths                  | agreed        |
| C2.1 | Bass Play-Along: Cm – Fm   | foundation under each chord's root           | draft (Q-020) |

## D — Performance (LH bass + RH chords)

| Step | Activity               | Content                                                          | Status         |
| ---- | ---------------------- | ---------------------------------------------------------------- | -------------- |
| D1.1 | Cm Vamp — Whole Notes  | LH Trap foundation (C3, G3) · RH Cm whole notes C5-E♭5-G5        | agreed (D-048) |
| D1.2 | Cm Vamp — 8th Chunking | LH foundation · RH 8th chunking staccato, up an octave C6-E♭6-G6 | agreed (D-048) |
| D2.1 | Jam: Cm 1st inv. ↔ Fm | LH roots C3 / F2 · RH inversion pair, held                       | draft          |
| D2.2 | Jam: Cm ↔ G 1st inv.  | LH roots C3 / G2 · RH 8th chunking staccato                      | draft          |

About 34 steps (Pop L1 has 44).
