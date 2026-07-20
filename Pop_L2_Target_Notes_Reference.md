# Pop L2 — Target Notes Reference

**Key: G major (minor activities: E minor)**  
**Tempo: 80–130 BPM | Swing: 0 | Timing unit: 480 ticks = 1 quarter note**

---

## MIDI Map — G Major

```
Bass register (LH bass notes):
  G2  = 43  |  A2  = 45  |  B2 = 47  |  C3 = 48
  D3  = 50  |  E3  = 52  |  F#3 = 54 |  G3 = 55

Mid register (LH chords, lower octave):
  B2  = 47  |  C3  = 48  |  D3 = 50  |  E3 = 52
  F#3 = 54  |  G3  = 55  |  A3 = 57  |  B3 = 59

Treble register (RH melody & chords):
  C4  = 60  |  D4  = 62  |  E4 = 64  |  F#4 = 66
  G4  = 67  |  A4  = 69  |  B4 = 71  |  C5  = 72
  D5  = 74  |  E5  = 76  |  F#5 = 78 |  G5  = 79
```

---

## Chord Voicing Reference

> LH bass note = chord ROOT in all cases (even for 1st inversion chord exercises).  
> 1st inversion = 3rd on the bottom of the RH voicing.

### Root Position (RH)

| Chord | Degree | RH notes  | MIDI     | LH bass | MIDI |
| ----- | ------ | --------- | -------- | ------- | ---- |
| G maj | 1 maj  | G4–B4–D5  | 67–71–74 | G2      | 43   |
| A min | 2 min  | A4–C5–E5  | 69–72–76 | A2      | 45   |
| B min | 3 min  | B4–D5–F#5 | 71–74–78 | B2      | 47   |
| C maj | 4 maj  | C4–E4–G4  | 60–64–67 | C3      | 48   |
| D maj | 5 maj  | D4–F#4–A4 | 62–66–69 | D3      | 50   |
| E min | 6 min  | E4–G4–B4  | 64–67–71 | E3      | 52   |

### 1st Inversion (RH) — new at L2

| Chord | Symbol      | RH notes  | MIDI     | LH bass | MIDI |
| ----- | ----------- | --------- | -------- | ------- | ---- |
| G/B   | 1 maj/3     | B3–D4–G4  | 59–62–67 | G2      | 43   |
| Am/C  | 2 min/b3    | C4–E4–A4  | 60–64–69 | A2      | 45   |
| Bm/D  | 3 min/b3    | D4–F#4–B4 | 62–66–71 | B2      | 47   |
| C/E   | 4 maj/3     | E4–G4–C5  | 64–67–72 | C3      | 48   |
| D/F#  | 5 maj/3     | F#4–A4–D5 | 66–69–74 | D3      | 50   |
| Em/G  | 6 min/b3    | G4–B4–E5  | 67–71–76 | E3      | 52   |

> **Octave note:** The 1st inversion voicings (B3–D4–G4 range) are one octave below the root-position voicings (G4–B4–D5 range). This keeps the 1st inversions in a comfortable mid-register and makes the voice leading visually clear.

---

## Voice Leading — The Three Core Transitions

### Transition 1 — 1 maj 1st inv → 4 maj root pos

```
1 maj/3 (G/B)    →    4 maj (C)
RH: B3–D4–G4    →   C4–E4–G4    G4 stays, B→C (+1), D→E (+2)
LH: G2 (43)     →   C3 (48)
MIDI: [59,62,67] →  [60,64,67]
```

### Transition 2 — 5 maj 1st inv → 1 maj root pos

```
5 maj/3 (D/F#)   →    1 maj (G)
RH: F#4–A4–D5   →   G4–B4–D5    D5 stays, F#→G (+1), A→B (+2)
LH: D3 (50)     →   G2 (43)
MIDI: [66,69,74] →  [67,71,74]
```

### Transition 3 — 1 maj root pos → 6 min 1st inv

```
1 maj (G)        →   6 min/b3 (Em/G)
RH: G4–B4–D5    →   G4–B4–E5    G4 stays, B4 stays, D→E (+2)
LH: G2 (43)     →   E3 (52)
MIDI: [67,71,74] →  [67,71,76]   ← only ONE note changes
```

---

---

# SECTION A: Melody

## A1: Scale (Ionian) — G major, treble register

**Notes:** G4(67) A4(69) B4(71) C5(72) D5(74) E5(76) F#5(78) G5(79)  
**Timing:** quarter notes, 480 ticks each, duration 460 (OOT) / 480 (IT)

| Step | Activity       | Notes (ascending)                            |
| ---- | -------------- | -------------------------------------------- |
| A1.1 | Ascending OOT  | 67 69 71 72 74 76 78 79                      |
| A1.2 | Ascending IT   | same, timed                                  |
| A1.3 | Descending OOT | 79 78 76 74 72 71 69 67                      |
| A1.4 | Descending IT  | same, timed                                  |
| A1.5 | Asc+Desc OOT   | 67 69 71 72 74 76 78 79 78 76 74 72 71 69 67 |
| A1.6 | Asc+Desc IT    | same, timed                                  |

**Sample targetNotes (A1.1):**

```
{ midi: 67, onset: 0,    duration: 460 }, // G4
{ midi: 69, onset: 480,  duration: 460 }, // A4
{ midi: 71, onset: 960,  duration: 460 }, // B4
{ midi: 72, onset: 1440, duration: 460 }, // C5
{ midi: 74, onset: 1920, duration: 460 }, // D5
{ midi: 76, onset: 2400, duration: 460 }, // E5
{ midi: 78, onset: 2880, duration: 460 }, // F#5
{ midi: 79, onset: 3360, duration: 460 }, // G5
```

## A2: Scale (Aeolian) — E minor, treble register

**Notes:** E4(64) F#4(66) G4(67) A4(69) B4(71) C5(72) D5(74) E5(76)  
**Timing:** same pattern as A1 (quarter notes, 460/480 duration)

| Step | Activity       |
| ---- | -------------- |
| A2.1 | Ascending OOT  |
| A2.2 | Ascending IT   |
| A2.3 | Descending OOT |
| A2.4 | Descending IT  |
| A2.5 | Asc+Desc OOT   |
| A2.6 | Asc+Desc IT    |

## A3: POP Melody with Play-Along

**Groove:** groove_pop_01 | **Engine generates:** drums, bass, chords | **Student plays:** melody

### A3.1 — 3-Note Melody

Simple 3-note melodic phrase in Ionian. Example over 1 bar:

```
{ midi: 74, onset: 0,   duration: 480 }, // D5 — beat 1
{ midi: 76, onset: 480, duration: 480 }, // E5 — beat 2
{ midi: 74, onset: 960, duration: 960 }, // D5 — beats 3-4 (half, resolve)
```

### A3.2 — 6-Note Melody

6-note phrase over 2 bars. Example:

```
// Bar 1
{ midi: 79, onset: 0,    duration: 480 }, // G5 — beat 1
{ midi: 76, onset: 480,  duration: 480 }, // E5 — beat 2
{ midi: 74, onset: 960,  duration: 960 }, // D5 — beats 3-4
// Bar 2
{ midi: 72, onset: 1920, duration: 480 }, // C5 — beat 1
{ midi: 71, onset: 2400, duration: 480 }, // B4 — beat 2
{ midi: 67, onset: 2880, duration: 960 }, // G4 — beats 3-4 (resolve)
```

---

---

# SECTION B: Chords

## B1: Arpeggiate Chords

### B1.1/2 — maj arpeggio (G major, 1-3-5)

**OOT ascending:** G4(67) B4(71) D5(74)  
**IT up+down:** G4 B4 D5 B4 G4

```
// B1.1 OOT ascending
{ midi: 67, onset: 0,   duration: 480 }, // G4 — root
{ midi: 71, onset: 480, duration: 480 }, // B4 — 3rd
{ midi: 74, onset: 960, duration: 480 }, // D5 — 5th
// B1.2 IT up+down
{ midi: 67, onset: 0,    duration: 480 }, // G4
{ midi: 71, onset: 480,  duration: 480 }, // B4
{ midi: 74, onset: 960,  duration: 480 }, // D5 — top
{ midi: 71, onset: 1440, duration: 480 }, // B4
{ midi: 67, onset: 1920, duration: 480 }, // G4 — resolve
```

### B1.3/4 — min arpeggio (E minor, 1-b3-5)

**OOT ascending:** E4(64) G4(67) B4(71)  
**IT up+down:** E4 G4 B4 G4 E4

```
// B1.3 OOT ascending
{ midi: 64, onset: 0,   duration: 480 }, // E4 — root
{ midi: 67, onset: 480, duration: 480 }, // G4 — b3
{ midi: 71, onset: 960, duration: 480 }, // B4 — 5th
```

### B1.5/6 — sus2 arpeggio (Gsus2 = G-A-D)

**OOT ascending:** G4(67) A4(69) D5(74)  
**IT up+down:** G4 A4 D5 A4 G4

```
// B1.5 OOT ascending
{ midi: 67, onset: 0,   duration: 480 }, // G4
{ midi: 69, onset: 480, duration: 480 }, // A4
{ midi: 74, onset: 960, duration: 480 }, // D5
```

### B1.7/8 — sus4 arpeggio (Gsus4 = G-C-D)

**OOT ascending:** G4(67) C5(72) D5(74)  
**IT up+down:** G4 C5 D5 C5 G4

```
// B1.7 OOT ascending
{ midi: 67, onset: 0,   duration: 480 }, // G4
{ midi: 72, onset: 480, duration: 480 }, // C5
{ midi: 74, onset: 960, duration: 480 }, // D5
```

---

## B2: Chord Voicings — 1st inversion only

> All block chords: 4 quarter-note repetitions + final short downbeat (duration 120)  
> Pattern: onset 0, 480, 960, 1440, 1920 (short)

### B2.1/2 — Major 1st inversion (G/B)

**Voicing:** RH B3(59)–D4(62)–G4(67), LH G2(43)  
**`instrument_config`:** `lh_bass_rh_chords`

```
// B2.1 OOT — 4 repetitions
{ midi: 43, onset: 0,    duration: 480, hand: 'lh' },
{ midi: 59, onset: 0,    duration: 480, hand: 'rh' }, { midi: 62, onset: 0,    duration: 480, hand: 'rh' }, { midi: 67, onset: 0,    duration: 480, hand: 'rh' },
{ midi: 43, onset: 480,  duration: 480, hand: 'lh' },
{ midi: 59, onset: 480,  duration: 480, hand: 'rh' }, { midi: 62, onset: 480,  duration: 480, hand: 'rh' }, { midi: 67, onset: 480,  duration: 480, hand: 'rh' },
{ midi: 43, onset: 960,  duration: 480, hand: 'lh' },
{ midi: 59, onset: 960,  duration: 480, hand: 'rh' }, { midi: 62, onset: 960,  duration: 480, hand: 'rh' }, { midi: 67, onset: 960,  duration: 480, hand: 'rh' },
{ midi: 43, onset: 1440, duration: 480, hand: 'lh' },
{ midi: 59, onset: 1440, duration: 480, hand: 'rh' }, { midi: 62, onset: 1440, duration: 480, hand: 'rh' }, { midi: 67, onset: 1440, duration: 480, hand: 'rh' },
{ midi: 43, onset: 1920, duration: 120, hand: 'lh' },
{ midi: 59, onset: 1920, duration: 120, hand: 'rh' }, { midi: 62, onset: 1920, duration: 120, hand: 'rh' }, { midi: 67, onset: 1920, duration: 120, hand: 'rh' },
```

### B2.3/4 — Minor 1st inversion (Em/G)

**Voicing:** RH G4(67)–B4(71)–E5(76), LH E3(52)  
Same block-chord pattern as above (substitute MIDI values):

```
LH: 52 | RH: 67 + 71 + 76
```

> **Review note:** Em/G puts G4 on the bottom of the RH. For Am/C (if preferred instead), the voicing would be C4(60)–E4(64)–A4(69), LH A2(45). Flag if you'd like to use Am/C for minor 1st inv exercises instead of Em/G.

---

## B3: Two-Hand Chords — NEW

> Both hands play the **same 1st inversion voicing, one octave apart**.  
> No separate bass note — the LH IS the chord, one octave lower.  
> `instrument_config` hand_config: `two_hand_comping` (or new type needed — see note below)

> **Review note:** The existing `hand_config` options in `ActivityFlowV2` are:  
> `lh_bass_rh_chords | lh_bass_rh_melody | lh_chords_rh_melody | two_hand_comping | lh_rootless_rh_melody | open`  
> `two_hand_comping` seems closest. Confirm which to use, or if a new type is needed.

### B3.1/2 — Two-hand Major 1st inversion (G/B)

**LH (lower octave):** B2(47)–D3(50)–G3(55)  
**RH (upper octave):** B3(59)–D4(62)–G4(67)

```
// B3.1 OOT — both hands, 4 repetitions
{ midi: 47, onset: 0,    duration: 480, hand: 'lh' }, { midi: 50, onset: 0,    duration: 480, hand: 'lh' }, { midi: 55, onset: 0,    duration: 480, hand: 'lh' },
{ midi: 59, onset: 0,    duration: 480, hand: 'rh' }, { midi: 62, onset: 0,    duration: 480, hand: 'rh' }, { midi: 67, onset: 0,    duration: 480, hand: 'rh' },
{ midi: 47, onset: 480,  duration: 480, hand: 'lh' }, { midi: 50, onset: 480,  duration: 480, hand: 'lh' }, { midi: 55, onset: 480,  duration: 480, hand: 'lh' },
{ midi: 59, onset: 480,  duration: 480, hand: 'rh' }, { midi: 62, onset: 480,  duration: 480, hand: 'rh' }, { midi: 67, onset: 480,  duration: 480, hand: 'rh' },
// ... (× 4 repetitions, then onset: 1920 duration: 120 for final downbeat)
```

### B3.3/4 — Two-hand Minor 1st inversion (Em/G)

**LH (lower octave):** G3(55)–B3(59)–E4(64)  
**RH (upper octave):** G4(67)–B4(71)–E5(76)

---

## B4: Voice Leading Transitions — NEW

> Each activity: two chords in sequence. One bar each (whole note hold). OOT uses duration 1860; IT uses 1920.

### B4.1/2 — 1 maj 1st inv → 4 maj root pos

**Direction (B4.1):** "Move from a 1st inversion G chord to a root position C chord."  
**Smooth move:** G4 stays, B3→C4, D4→E4

```
// Chord 1: G/B — LH G2(43), RH B3(59)+D4(62)+G4(67)
{ midi: 43, onset: 0,    duration: 1860, hand: 'lh' },
{ midi: 59, onset: 0,    duration: 1860, hand: 'rh' },
{ midi: 62, onset: 0,    duration: 1860, hand: 'rh' },
{ midi: 67, onset: 0,    duration: 1860, hand: 'rh' },
// Chord 2: C root — LH C3(48), RH C4(60)+E4(64)+G4(67)
{ midi: 48, onset: 1920, duration: 1860, hand: 'lh' },
{ midi: 60, onset: 1920, duration: 1860, hand: 'rh' },
{ midi: 64, onset: 1920, duration: 1860, hand: 'rh' },
{ midi: 67, onset: 1920, duration: 1860, hand: 'rh' },
// Final short downbeat back to G/B
{ midi: 43, onset: 3840, duration: 120, hand: 'lh' },
{ midi: 59, onset: 3840, duration: 120, hand: 'rh' },
{ midi: 62, onset: 3840, duration: 120, hand: 'rh' },
{ midi: 67, onset: 3840, duration: 120, hand: 'rh' },
```

> **Voice leading visualized:**
>
> ```
> B3(59) → C4(60)   +1 semitone
> D4(62) → E4(64)   +2 semitones (whole step)
> G4(67) → G4(67)   stays
> ```

### B4.3/4 — 5 maj 1st inv → 1 maj root pos

**Direction (B4.3):** "Resolve from a 1st inversion D chord to a root position G chord."  
**Smooth move:** D5 stays, F#4→G4, A4→B4

```
// Chord 1: D/F# — LH D3(50), RH F#4(66)+A4(69)+D5(74)
{ midi: 50, onset: 0,    duration: 1860, hand: 'lh' },
{ midi: 66, onset: 0,    duration: 1860, hand: 'rh' },
{ midi: 69, onset: 0,    duration: 1860, hand: 'rh' },
{ midi: 74, onset: 0,    duration: 1860, hand: 'rh' },
// Chord 2: G root — LH G2(43), RH G4(67)+B4(71)+D5(74)
{ midi: 43, onset: 1920, duration: 1860, hand: 'lh' },
{ midi: 67, onset: 1920, duration: 1860, hand: 'rh' },
{ midi: 71, onset: 1920, duration: 1860, hand: 'rh' },
{ midi: 74, onset: 1920, duration: 1860, hand: 'rh' },
// Final short downbeat
{ midi: 50, onset: 3840, duration: 120, hand: 'lh' },
{ midi: 66, onset: 3840, duration: 120, hand: 'rh' },
{ midi: 69, onset: 3840, duration: 120, hand: 'rh' },
{ midi: 74, onset: 3840, duration: 120, hand: 'rh' },
```

> **Voice leading visualized:**
>
> ```
> F#4(66) → G4(67)   +1 semitone
> A4(69)  → B4(71)   +2 semitones
> D5(74)  → D5(74)   stays
> ```

### B4.5/6 — 1 maj root pos → 6 min 1st inv

**Direction (B4.5):** "Move from a root position G chord to a 1st inversion E minor chord — only one note changes."  
**Smooth move:** G4 stays, B4 stays, D5→E5 (+2)

```
// Chord 1: G root — LH G2(43), RH G4(67)+B4(71)+D5(74)
{ midi: 43, onset: 0,    duration: 1860, hand: 'lh' },
{ midi: 67, onset: 0,    duration: 1860, hand: 'rh' },
{ midi: 71, onset: 0,    duration: 1860, hand: 'rh' },
{ midi: 74, onset: 0,    duration: 1860, hand: 'rh' },
// Chord 2: Em/G — LH E3(52), RH G4(67)+B4(71)+E5(76)
{ midi: 52, onset: 1920, duration: 1860, hand: 'lh' },
{ midi: 67, onset: 1920, duration: 1860, hand: 'rh' },
{ midi: 71, onset: 1920, duration: 1860, hand: 'rh' },
{ midi: 76, onset: 1920, duration: 1860, hand: 'rh' },
// Final short downbeat
{ midi: 43, onset: 3840, duration: 120, hand: 'lh' },
{ midi: 67, onset: 3840, duration: 120, hand: 'rh' },
{ midi: 71, onset: 3840, duration: 120, hand: 'rh' },
{ midi: 74, onset: 3840, duration: 120, hand: 'rh' },
```

> **Voice leading visualized:**
>
> ```
> G4(67)  → G4(67)   stays
> B4(71)  → B4(71)   stays
> D5(74)  → E5(76)   +2 semitones ← the ONE note that moves
> ```

---

## B5: POP Progressions

> **Primary progression: 1 maj - 2 min - 3 min - 4 maj (G–Am–Bm–C), "Lean on Me"**  
> 1 bar per chord. Using 1st inversion voicings throughout.

### 1st Inversion Voicings for Lean on Me

```
Bar 1 — G/B (1 maj/3):    LH G2(43), RH B3(59)–D4(62)–G4(67)
Bar 2 — Am/C (2 min/b3):  LH A2(45), RH C4(60)–E4(64)–A4(69)
Bar 3 — Bm/D (3 min/b3):  LH B2(47), RH D4(62)–F#4(66)–B4(71)
Bar 4 — C/E (4 maj/3):    LH C3(48), RH E4(64)–G4(67)–C5(72)
```

> **Voice leading across the progression (each RH voice moves stepwise up):**
>
> ```
> B3(59) → C4(60) → D4(62) → E4(64)   bottom voice ascends
> D4(62) → E4(64) → F#4(66)→ G4(67)   middle voice ascends
> G4(67) → A4(69) → B4(71) → C5(72)   top voice ascends
> ```
>
> This is exactly the "Lean on Me" feel — a staircase effect.

### B5.1 (OOT) — whole notes, one bar each

```
// Bar 1 — G/B
{ midi: 43, onset: 0,    duration: 1860, hand: 'lh' },
{ midi: 59, onset: 0,    duration: 1860, hand: 'rh' }, { midi: 62, onset: 0, duration: 1860, hand: 'rh' }, { midi: 67, onset: 0, duration: 1860, hand: 'rh' },
// Bar 2 — Am/C
{ midi: 45, onset: 1920, duration: 1860, hand: 'lh' },
{ midi: 60, onset: 1920, duration: 1860, hand: 'rh' }, { midi: 64, onset: 1920, duration: 1860, hand: 'rh' }, { midi: 69, onset: 1920, duration: 1860, hand: 'rh' },
// Bar 3 — Bm/D
{ midi: 47, onset: 3840, duration: 1860, hand: 'lh' },
{ midi: 62, onset: 3840, duration: 1860, hand: 'rh' }, { midi: 66, onset: 3840, duration: 1860, hand: 'rh' }, { midi: 71, onset: 3840, duration: 1860, hand: 'rh' },
// Bar 4 — C/E
{ midi: 48, onset: 5760, duration: 1860, hand: 'lh' },
{ midi: 64, onset: 5760, duration: 1860, hand: 'rh' }, { midi: 67, onset: 5760, duration: 1860, hand: 'rh' }, { midi: 72, onset: 5760, duration: 1860, hand: 'rh' },
// Final downbeat — resolve to G/B
{ midi: 43, onset: 7680, duration: 120, hand: 'lh' },
{ midi: 59, onset: 7680, duration: 120, hand: 'rh' }, { midi: 62, onset: 7680, duration: 120, hand: 'rh' }, { midi: 67, onset: 7680, duration: 120, hand: 'rh' },
```

### B5.3 (Stylistic Rhythm)

Same chord notes; comping pattern applied from Chord_Comping library. Engine provides groove_pop_01 drums. Student plays bass + chords.

---

## B6: POP Chords with Play-Along

Same as B5.1 notes but with backing track. Engine generates drums + bass. Student plays chords only (no LH bass note in targetNotes — bass is engine-generated).

---

---

# SECTION C: Bass

## C1: Bass Scale (Ionian) — G major, bass register

**Notes (ascending):** G2(43) A2(45) B2(47) C3(48) D3(50) E3(52) F#3(54) G3(55)

| Step | Activity       |
| ---- | -------------- |
| C1.1 | Ascending OOT  |
| C1.2 | Ascending IT   |
| C1.3 | Descending OOT |
| C1.4 | Descending IT  |
| C1.5 | Asc+Desc OOT   |
| C1.6 | Asc+Desc IT    |

> Generated by `expandBassScaleScaffolding('pop_l2', 'Ionian', 'pop', 36)` — same call as current code.

## C2.1 — Root-Based Bass Pattern (OOT)

Root notes for the Lean on Me progression, whole note per chord:

```
{ midi: 43, onset: 0,    duration: 1860 }, // G2 — bar 1
{ midi: 45, onset: 1920, duration: 1860 }, // A2 — bar 2
{ midi: 47, onset: 3840, duration: 1860 }, // B2 — bar 3
{ midi: 48, onset: 5760, duration: 1860 }, // C3 — bar 4
{ midi: 43, onset: 7680, duration: 120  }, // G2 — resolve
```

## C2.3/4 — POP Bass Pattern

Root-5th pattern (alternating root and 5th per chord, half notes):

```
// Bar 1 — G: root G2(43), 5th D3(50)
{ midi: 43, onset: 0,   duration: 920 }, // G2 — beat 1 (half)
{ midi: 50, onset: 960, duration: 920 }, // D3 — beat 3 (half)
// Bar 2 — Am: root A2(45), 5th E3(52)
{ midi: 45, onset: 1920, duration: 920 }, // A2
{ midi: 52, onset: 2880, duration: 920 }, // E3
// Bar 3 — Bm: root B2(47), 5th F#3(54)
{ midi: 47, onset: 3840, duration: 920 }, // B2
{ midi: 54, onset: 4800, duration: 920 }, // F#3
// Bar 4 — C: root C3(48), 5th G3(55)
{ midi: 48, onset: 5760, duration: 920 }, // C3
{ midi: 55, onset: 6720, duration: 920 }, // G3
{ midi: 43, onset: 7680, duration: 120 }, // G2 — resolve
```

---

---

# SECTION D: Performance

## D1: LH Bass + RH 1st Inversion Chords

**Progression:** G–Am–Bm–C (Lean on Me), 1 bar each  
**instrument_config:** `lh_bass_rh_chords`

### D1.1 (OOT) — whole note per chord, duration 1860

```
// Bar 1 — G/B: LH G2(43) bass, RH B3(59)–D4(62)–G4(67) 1st inv
{ midi: 43, onset: 0,    duration: 1860, hand: 'lh' },
{ midi: 59, onset: 0,    duration: 1860, hand: 'rh' }, { midi: 62, onset: 0, duration: 1860, hand: 'rh' }, { midi: 67, onset: 0, duration: 1860, hand: 'rh' },
// Bar 2 — Am/C: LH A2(45), RH C4(60)–E4(64)–A4(69)
{ midi: 45, onset: 1920, duration: 1860, hand: 'lh' },
{ midi: 60, onset: 1920, duration: 1860, hand: 'rh' }, { midi: 64, onset: 1920, duration: 1860, hand: 'rh' }, { midi: 69, onset: 1920, duration: 1860, hand: 'rh' },
// Bar 3 — Bm/D: LH B2(47), RH D4(62)–F#4(66)–B4(71)
{ midi: 47, onset: 3840, duration: 1860, hand: 'lh' },
{ midi: 62, onset: 3840, duration: 1860, hand: 'rh' }, { midi: 66, onset: 3840, duration: 1860, hand: 'rh' }, { midi: 71, onset: 3840, duration: 1860, hand: 'rh' },
// Bar 4 — C/E: LH C3(48), RH E4(64)–G4(67)–C5(72)
{ midi: 48, onset: 5760, duration: 1860, hand: 'lh' },
{ midi: 64, onset: 5760, duration: 1860, hand: 'rh' }, { midi: 67, onset: 5760, duration: 1860, hand: 'rh' }, { midi: 72, onset: 5760, duration: 1860, hand: 'rh' },
// Final downbeat — resolve to G/B
{ midi: 43, onset: 7680, duration: 120, hand: 'lh' },
{ midi: 59, onset: 7680, duration: 120, hand: 'rh' }, { midi: 62, onset: 7680, duration: 120, hand: 'rh' }, { midi: 67, onset: 7680, duration: 120, hand: 'rh' },
```

### D1.3 (Play-Along) — Groove + 4-bar loop

Same notes as D1.2 (timed quarter notes), with `groove_pop_01`, engine generates drums + bass.

---

## D2: Two-Hand Chords — NEW

> Both hands play the SAME 1st inversion voicing one octave apart. No bass note.  
> LH is one octave below RH for each chord.  
> `instrument_config` hand_config: `two_hand_comping`

**Chord positions:**

```
G/B:   LH B2(47)–D3(50)–G3(55),  RH B3(59)–D4(62)–G4(67)
Am/C:  LH C3(48)–E3(52)–A3(57),  RH C4(60)–E4(64)–A4(69)
Bm/D:  LH D3(50)–F#3(54)–B3(59), RH D4(62)–F#4(66)–B4(71)
C/E:   LH E3(52)–G3(55)–C4(60),  RH E4(64)–G4(67)–C5(72)
```

### D2.1 (OOT) — whole note per chord

```
// Bar 1 — G/B both hands
{ midi: 47, onset: 0,    duration: 1860, hand: 'lh' }, { midi: 50, onset: 0, duration: 1860, hand: 'lh' }, { midi: 55, onset: 0, duration: 1860, hand: 'lh' },
{ midi: 59, onset: 0,    duration: 1860, hand: 'rh' }, { midi: 62, onset: 0, duration: 1860, hand: 'rh' }, { midi: 67, onset: 0, duration: 1860, hand: 'rh' },
// Bar 2 — Am/C both hands
{ midi: 48, onset: 1920, duration: 1860, hand: 'lh' }, { midi: 52, onset: 1920, duration: 1860, hand: 'lh' }, { midi: 57, onset: 1920, duration: 1860, hand: 'lh' },
{ midi: 60, onset: 1920, duration: 1860, hand: 'rh' }, { midi: 64, onset: 1920, duration: 1860, hand: 'rh' }, { midi: 69, onset: 1920, duration: 1860, hand: 'rh' },
// Bar 3 — Bm/D both hands
{ midi: 50, onset: 3840, duration: 1860, hand: 'lh' }, { midi: 54, onset: 3840, duration: 1860, hand: 'lh' }, { midi: 59, onset: 3840, duration: 1860, hand: 'lh' },
{ midi: 62, onset: 3840, duration: 1860, hand: 'rh' }, { midi: 66, onset: 3840, duration: 1860, hand: 'rh' }, { midi: 71, onset: 3840, duration: 1860, hand: 'rh' },
// Bar 4 — C/E both hands
{ midi: 52, onset: 5760, duration: 1860, hand: 'lh' }, { midi: 55, onset: 5760, duration: 1860, hand: 'lh' }, { midi: 60, onset: 5760, duration: 1860, hand: 'lh' },
{ midi: 64, onset: 5760, duration: 1860, hand: 'rh' }, { midi: 67, onset: 5760, duration: 1860, hand: 'rh' }, { midi: 72, onset: 5760, duration: 1860, hand: 'rh' },
// Final downbeat — G/B
{ midi: 47, onset: 7680, duration: 120, hand: 'lh' }, { midi: 50, onset: 7680, duration: 120, hand: 'lh' }, { midi: 55, onset: 7680, duration: 120, hand: 'lh' },
{ midi: 59, onset: 7680, duration: 120, hand: 'rh' }, { midi: 62, onset: 7680, duration: 120, hand: 'rh' }, { midi: 67, onset: 7680, duration: 120, hand: 'rh' },
```

---

## D3: LH Chords + RH Melody — NEW

> LH plays 1st inversion chord voicings (whole notes, mid-register).  
> RH plays a simple melody over the progression.  
> `instrument_config` hand_config: `lh_chords_rh_melody`

**LH chord positions (mid-register):**

```
G/B:   B2(47)–D3(50)–G3(55)
Am/C:  C3(48)–E3(52)–A3(57)
Bm/D:  D3(50)–F#3(54)–B3(59)
C/E:   E3(52)–G3(55)–C4(60)
```

**RH melody (simple, Ionian-based, singable):**

```
Bar 1 (G):   D5(74) q — E5(76) q — D5(74) h       "question" phrase
Bar 2 (Am):  C5(72) q — B4(71) q — A4(69) h       descend to tonic of 2 min
Bar 3 (Bm):  B4(71) q — D5(74) q — B4(71) h       outline 3 min chord
Bar 4 (C):   A4(69) q — G4(67) q — G4(67) h       resolve to G
```

### D3.1 (OOT) — whole note LH, quarter-quarter-half RH

```
// Bar 1 — G/B LH chord + RH melody
{ midi: 47, onset: 0,    duration: 1860, hand: 'lh' }, { midi: 50, onset: 0, duration: 1860, hand: 'lh' }, { midi: 55, onset: 0, duration: 1860, hand: 'lh' },
{ midi: 74, onset: 0,    duration: 480,  hand: 'rh' }, // D5
{ midi: 76, onset: 480,  duration: 480,  hand: 'rh' }, // E5
{ midi: 74, onset: 960,  duration: 960,  hand: 'rh' }, // D5 (half)

// Bar 2 — Am/C LH chord + RH melody
{ midi: 48, onset: 1920, duration: 1860, hand: 'lh' }, { midi: 52, onset: 1920, duration: 1860, hand: 'lh' }, { midi: 57, onset: 1920, duration: 1860, hand: 'lh' },
{ midi: 72, onset: 1920, duration: 480,  hand: 'rh' }, // C5
{ midi: 71, onset: 2400, duration: 480,  hand: 'rh' }, // B4
{ midi: 69, onset: 2880, duration: 960,  hand: 'rh' }, // A4 (half)

// Bar 3 — Bm/D LH chord + RH melody
{ midi: 50, onset: 3840, duration: 1860, hand: 'lh' }, { midi: 54, onset: 3840, duration: 1860, hand: 'lh' }, { midi: 59, onset: 3840, duration: 1860, hand: 'lh' },
{ midi: 71, onset: 3840, duration: 480,  hand: 'rh' }, // B4
{ midi: 74, onset: 4320, duration: 480,  hand: 'rh' }, // D5
{ midi: 71, onset: 4800, duration: 960,  hand: 'rh' }, // B4 (half)

// Bar 4 — C/E LH chord + RH melody
{ midi: 52, onset: 5760, duration: 1860, hand: 'lh' }, { midi: 55, onset: 5760, duration: 1860, hand: 'lh' }, { midi: 60, onset: 5760, duration: 1860, hand: 'lh' },
{ midi: 69, onset: 5760, duration: 480,  hand: 'rh' }, // A4
{ midi: 67, onset: 6240, duration: 480,  hand: 'rh' }, // G4
{ midi: 67, onset: 6720, duration: 960,  hand: 'rh' }, // G4 (half, resolve)

// Final downbeat — G/B
{ midi: 47, onset: 7680, duration: 120, hand: 'lh' }, { midi: 50, onset: 7680, duration: 120, hand: 'lh' }, { midi: 55, onset: 7680, duration: 120, hand: 'lh' },
{ midi: 67, onset: 7680, duration: 120, hand: 'rh' }, // G4
```

---

---

# Open Questions / Review Notes

1. **Register for isolated chord exercises (B2):** Currently using B3–D4–G4 for Major 1st inv and G4–B4–E5 for Minor 1st inv. These are in different registers (B3 range vs G4 range). Should they be brought into a consistent register? Alternatively, use G major and A minor as the two isolated chord exercises (so both are "home" chords in the key).

2. **Minor 1st inv chord (B2.3/4):** Using Em/G. If you'd prefer Am/C (C4–E4–A4, LH A2) as the isolated minor exercise instead, that's a quick swap.

3. **`hand_config` for two-hand chord activities (B3, D2):** `two_hand_comping` is the closest existing type. Confirm whether this maps correctly in the app, or if a new `hand_config` value is needed.

4. **D3 melody:** The RH melody above is a placeholder (functional but simple). Do you want a specific melody, or is a generated one (per the content generation spec) fine? If generated, the `targetNotes` array can be left empty like `C3.1` in L1 and filled by the engine.

5. **Progression variety in B5:** Currently showing only Lean on Me (1 maj - 2 min - 3 min - 4 maj). Should B5 include additional progressions (e.g., 1 maj - 5 maj - 6 min - 4 maj in 1st inversions, or 6 min - 4 maj - 1 maj - 5 maj)? Or keep B5 focused on a single progression at this level?

6. **F#3 in bass:** B2 = 47, but in some chords we need F#3 = 54 for the 5th of Bm bass pattern in C2. Confirm this is expected (it differs from L1 which used the chromatic bass note F2=41 for the 4 maj chord, which was just below G2).
