# Latin L1 "Reggaeton · Cumbia · Mariachi" — activity outline (for Aaron's sign-off)

Keys **E minor** and **G major** (D-078). Three styles, each about a third of
the level (D-070), sharing one Practice Track with a groove toggle (D-080). **agreed** =
follows a ledger decision; **draft** = Claude's proposal, needs Aaron's OK.

| Style     | Key     | Progression       | Tempo     | Meter | Feel                                   |
| --------- | ------- | ----------------- | --------- | ----- | -------------------------------------- |
| Reggaeton | E minor | Em – C – G – D    | 92 draft  | 4/4   | dembow; tresillo (3+3+2) chords + bass |
| Cumbia    | E minor | Em – Am – B7 – Em | 96 draft  | 4/4   | 2-feel bass, offbeat chords            |
| Mariachi  | G major | G – C – D7 – G    | 126 draft | 3/4   | ranchera vals: bass, chord, chord      |

- Reggaeton: the "Despacito" loop shape (D-073) — 1 min, ♭6, ♭3, ♭7 — in E minor.
- Cumbia: D-074's Am–Dm–E7 moved into E minor; B7's D♯ is the harmonic minor
  leading tone.
- Mariachi: 3/4, no huapango (D-072, D-077).

**Layout (D-079):** sections A–D as Pop/Funk, with the three styles in
turn inside each section, Reggaeton → Cumbia → Mariachi (D-081). Reggaeton goes
first because its harmony is simplest and it teaches the G and C triads that
Mariachi reuses; Mariachi goes last as the first 3/4 style.

## Rules the flow must meet

- Structure as Pop/Funk: sections A Melody, B Chords, C Bass, D Performance;
  steps grouped by subsection; every step has a unique `tag`.
- Melody: each scale gets up out of time → down out of time → up & down in time,
  then contours/phrases, then the next scale (D-043).
- Assessments: out of time `pitch_order`; in time `pitch_order_timing`;
  play-alongs `pitch_order_timing_duration`.
- Chord symbols through `lib/chordNotation` (hybrid numbering); "scale degrees",
  not "intervals", for numbered scale notes.
- ≤ 4-note chords in one clef; only two-hand parts split.
- Register: chords ≤ C5, bass ≤ C4 (no Latin exception); a figure moves as one
  unit. Bass 5th always from the chord root.
- Practice Tracks offered at the end of each section (D-021); one per level,
  groove toggle per style (D-080).

## A — Melody

| Step | Activity                                    | Assessment         | Content                                                                             | Status |
| ---- | ------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------- | ------ |
| A1.1 | E Minor Pentatonic Ascending (Out of Time)  | pitch_order        | E4 G4 A4 B4 D5 E5                                                                   | draft  |
| A1.2 | E Minor Pentatonic Descending (Out of Time) | pitch_order        | E5 → E4                                                                             | draft  |
| A1.3 | E Minor Pentatonic — Up & Down (In Time)    | pitch_order_timing | up and back, quarters                                                               | draft  |
| A2.1 | 3-Note Reggaeton Melody (play-along)        | …\_duration        | B4 (1) · D5 ("and" of 2) · E5 (4, held) — tresillo rhythm                           | draft  |
| A2.2 | 5-Note Reggaeton Melody (play-along)        | …\_duration        | bar 1: E5 D5 B4 (1, "and" of 2, 4) · bar 2: A4 G4 (1, "and" of 2, held)             | draft  |
| A3.1 | E Harmonic Minor Ascending (Out of Time)    | pitch_order        | E4 F♯4 G4 A4 B4 C5 D♯5 E5                                                           | draft  |
| A3.2 | E Harmonic Minor Descending (Out of Time)   | pitch_order        | E5 → E4                                                                             | draft  |
| A3.3 | E Harmonic Minor — Up & Down (In Time)      | pitch_order_timing | up and back, quarters                                                               | draft  |
| A4.1 | 3-Note Cumbia Melody (play-along)           | …\_duration        | over B7 → Em: B4 (1) · D♯5 (3) · E5 (next bar 1, held) — the leading tone resolving | draft  |
| A4.2 | 6-Note Cumbia Melody (play-along)           | …\_duration        | bar 1: E5 D♯5 E5 (1, "and" of 1, 2) · B4 (3) · bar 2: C5 (1) · B4 (3, held)         | draft  |
| A5.1 | G Major Ascending (Out of Time)             | pitch_order        | G4 A4 B4 C5 D5 E5 F♯5 G5                                                            | draft  |
| A5.2 | G Major Descending (Out of Time)            | pitch_order        | G5 → G4                                                                             | draft  |
| A5.3 | G Major — Up & Down (In Time)               | pitch_order_timing | up and back, quarters (in 4/4; the 3/4 comes in the phrases)                        | draft  |
| A6.1 | 3-Note Mariachi Melody (3/4 play-along)     | …\_duration        | bar 1: D5 (1, half) · B4 (3) · bar 2: G4 (1, dotted half)                           | draft  |
| A6.2 | 6-Note Mariachi Melody (3/4 play-along)     | …\_duration        | over G – C – G: B4 C5 D5 (1, 2, 3) · E5 (1, half) D5 (3) · B4 (1, dotted half)      | draft  |

G major shares E minor's notes (E Aeolian), so no separate Aeolian scale; the
reggaeton loop is covered by the pentatonic and the G major scale.

## B — Chords

| Step | Activity                                      | Assessment  | Content                                                                 | Status |
| ---- | --------------------------------------------- | ----------- | ----------------------------------------------------------------------- | ------ |
| B1.1 | Em — Arpeggio + Chord                         | pitch_order | E4 G4 B4                                                                | draft  |
| B1.2 | C — Arpeggio + Chord                          | pitch_order | C4 E4 G4                                                                | draft  |
| B1.3 | G — Arpeggio + Chord                          | pitch_order | G3 B3 D4                                                                | draft  |
| B1.4 | D — Arpeggio + Chord                          | pitch_order | D4 F♯4 A4                                                               | draft  |
| B1.5 | Reggaeton Loop, Voice-Led (Out of Time)       | pitch_order | Em E4-G4-B4 → C E4-G4-C5 → G D4-G4-B4 → D D4-F♯4-A4 (common tones held) | draft  |
| B1.6 | Play-Along: Reggaeton Loop                    | …\_duration | voice-led loop, tresillo comping (1, "and" of 2, 4), one bar each       | draft  |
| B2.1 | Am — Arpeggio + Chord                         | pitch_order | A3 C4 E4                                                                | draft  |
| B2.2 | B7 — Arpeggio + Chord (first 7th chord)       | pitch_order | B3 D♯4 F♯4 A4                                                           | draft  |
| B2.3 | Cumbia Progression, Voice-Led (Out of Time)   | pitch_order | Em E4-G4-B4 → Am E4-A4-C5 → B7 D♯4-F♯4-A4-B4 → Em E4-G4-B4              | draft  |
| B2.4 | Play-Along: Cumbia                            | …\_duration | voice-led, offbeat comping (staccato on every "and"), one bar each      | draft  |
| B3.1 | D7 — Arpeggio + Chord                         | pitch_order | D4 F♯4 A4 C5                                                            | draft  |
| B3.2 | Mariachi Progression, Voice-Led (Out of Time) | pitch_order | G D4-G4-B4 → C E4-G4-C5 → D7 D4-F♯4-A4-C5 → G D4-G4-B4                  | draft  |
| B3.3 | Play-Along: Mariachi Vals                     | …\_duration | RH chords on 2 and 3 (the "chord, chord" of D-072), one bar each, 3/4   | draft  |

## C — Bass

| Step | Activity                       | Content                                                                 | Status |
| ---- | ------------------------------ | ----------------------------------------------------------------------- | ------ |
| C1.1 | Reggaeton Rhythm, One Note     | E2 on the tresillo (1, "and" of 2, 4)                                   | draft  |
| C1.2 | Reggaeton Bass: the Loop       | roots E2 – C2 – G2 – D2 on the tresillo, one bar each                   | draft  |
| C1.3 | Bass Play-Along: Reggaeton     | C1.2 over the dembow groove                                             | draft  |
| C2.1 | Cumbia Bass, One Chord         | E2 on 1, B2 on 3 (root, 5) — half notes                                 | draft  |
| C2.2 | Cumbia Bass: the Progression   | root on 1, 5 on 3 under Em – Am – B7 – Em (E/B, A/E, B/F♯, E/B)         | draft  |
| C2.3 | Bass Play-Along: Cumbia        | C2.2 over the cumbia groove                                             | draft  |
| C3.1 | Mariachi Bass, One Chord       | G2 on 1 (dotted half), then D2 on 1 next bar — root, then 5 (guitarrón) | draft  |
| C3.2 | Mariachi Bass: the Progression | root/5 per bar under G – C – D7 – G                                     | draft  |
| C3.3 | Bass Play-Along: Mariachi Vals | C3.2 over the vals                                                      | draft  |

## D — Performance

| Step | Activity                                     | Content                                                                           | Status         |
| ---- | -------------------------------------------- | --------------------------------------------------------------------------------- | -------------- |
| D1.1 | Reggaeton: LH Bass + RH Chords (Out of Time) | LH loop roots · RH voice-led loop                                                 | draft          |
| D1.2 | Reggaeton: Full Groove (play-along)          | LH + RH both on the tresillo → **Practice Track (Reggaeton groove)**              | draft          |
| D2.1 | Cumbia: LH Bass + RH Chords (Out of Time)    | LH root/5 · RH voice-led progression                                              | draft          |
| D2.2 | Cumbia: Full Groove (play-along)             | LH half notes on 1 and 3 · RH offbeat chords → **Practice Track (Cumbia groove)** | draft          |
| D3.1 | Mariachi: Bass, Chord, Chord (LH alone)      | LH G2, then B2-D3-G3 on 2 and 3 (5 on alternate bars), 3/4                        | agreed (D-072) |
| D3.2 | Mariachi: LH Vals Through the Progression    | G – C – D7 – G, bass, chord, chord                                                | draft          |
| D3.3 | Mariachi: LH Vals + RH Melody (play-along)   | LH vals · RH the A6.2 melody → **Practice Track (Mariachi groove)**               | draft          |

## Play-along sounds (to choose by ear on the audition page, T-038)

| Style     | Drums                                                                             | Bass                           | Chords                            |
| --------- | --------------------------------------------------------------------------------- | ------------------------------ | --------------------------------- |
| Reggaeton | dembow (kick on every beat, snare on the "a" of 1 and the "and" of 2, and of 3–4) | 808 (shared voice)             | synth pad or piano                |
| Cumbia    | güiro/guacharaca 8ths, conga, timbale (GM kit Latin percussion)                   | Finger electric (FluidR3)      | accordion (FluidR3)               |
| Mariachi  | none, or light shaker                                                             | Upright (FluidR3) as guitarrón | nylon guitar (FluidR3) as vihuela |

About 44 steps (Pop L1 44, Hip Hop L1 34).
