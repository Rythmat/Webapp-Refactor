/**
 * Latin v2 — Activity Flows.
 *
 * L1 "Reggaeton, Cumbia & Mariachi" (E minor / G major, D-078): authored from
 * docs/genre-activities/latin-L1-outline.md. Three styles, a third of the
 * level each (D-070, D-079), in that order (D-081): styleRef l1a Reggaeton,
 * l1b Cumbia, l1c Mariachi. Their drums, bass and comping come from the back
 * office's lesson pairings (D-084, D-087); Mariachi steps are in 3/4 (D-085).
 * Melodies, voicings and bass parts are the outline's drafts until Aaron
 * signs them off.
 *
 * L2 "Merengue, Bachata, Cha-cha-chá & Bolero" (l2a–l2d) and L3 "Bossa,
 * Tango & Afro-Cuban" (l3a–l3c) are built from Latin Band 1's variations: every
 * style is E minor over Em–Am–B7–Em, as the band's takes are, one chord a bar,
 * so the recorded parts line up under each step. Chords, bass and performance
 * steps teach those takes (simplified where the level needs it); the tango
 * melody is the guitarist's line. Melodies are Claude's drafts, like L1's,
 * until Aaron signs them off (latin-L2-outline.md, latin-L3-outline.md). The
 * Afro-Cuban 3-2 steps play the band's 3-2 variation (lessonPairings).
 */

import type {
  ActivityFlowV2,
  ActivitySectionV2,
} from '../../types/activity.v2';

const latinL1SectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    {
      stepNumber: 1,
      module: 'latin_l1',
      section: 'A',
      subsection: 'A1: Scale (E Minor Pentatonic)',
      activity: 'A1.1: E Minor Pentatonic Ascending (Out of Time)',
      direction:
        'Play the E Minor Pentatonic scale up, one note at a time: E–G–A–B–D–E.',
      assessment: 'pitch_order',
      tag: 'latin:l1_pent_asc_oot | latin',
      styleRef: 'l1a',
      successFeedback: 'Five notes — the sound of the reggaeton melody.',
      scaleIntervals: [0, 3, 5, 7, 10],
      scaleId: 'minor_pentatonic',
      targetNotes: [
        { midi: 64, onset: 0, duration: 460 }, // E4
        { midi: 67, onset: 480, duration: 460 }, // G4
        { midi: 69, onset: 960, duration: 460 }, // A4
        { midi: 71, onset: 1440, duration: 460 }, // B4
        { midi: 74, onset: 1920, duration: 460 }, // D5
        { midi: 76, onset: 2400, duration: 460 }, // E5
      ],
    },
    {
      stepNumber: 2,
      module: 'latin_l1',
      section: 'A',
      subsection: 'A1: Scale (E Minor Pentatonic)',
      activity: 'A1.2: E Minor Pentatonic Descending (Out of Time)',
      direction: 'Now play it back down from the top E.',
      assessment: 'pitch_order',
      tag: 'latin:l1_pent_desc_oot | latin',
      styleRef: 'l1a',
      successFeedback: 'Same five notes, back down.',
      scaleIntervals: [0, 3, 5, 7, 10],
      scaleId: 'minor_pentatonic',
      targetNotes: [
        { midi: 76, onset: 0, duration: 460 }, // E5
        { midi: 74, onset: 480, duration: 460 }, // D5
        { midi: 71, onset: 960, duration: 460 }, // B4
        { midi: 69, onset: 1440, duration: 460 }, // A4
        { midi: 67, onset: 1920, duration: 460 }, // G4
        { midi: 64, onset: 2400, duration: 460 }, // E4
      ],
    },
    {
      stepNumber: 3,
      module: 'latin_l1',
      section: 'A',
      subsection: 'A1: Scale (E Minor Pentatonic)',
      activity: 'A1.3: E Minor Pentatonic — Up & Down (In Time)',
      direction: 'Up and back down, one note per beat.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l1_pent_updown_it | latin',
      styleRef: 'l1a',
      successFeedback: 'The pentatonic, in time.',
      scaleIntervals: [0, 3, 5, 7, 10],
      scaleId: 'minor_pentatonic',
      targetNotes: [
        { midi: 64, onset: 0, duration: 460 }, // E4
        { midi: 67, onset: 480, duration: 460 }, // G4
        { midi: 69, onset: 960, duration: 460 }, // A4
        { midi: 71, onset: 1440, duration: 460 }, // B4
        { midi: 74, onset: 1920, duration: 460 }, // D5
        { midi: 76, onset: 2400, duration: 460 }, // E5
        { midi: 74, onset: 2880, duration: 460 }, // D5
        { midi: 71, onset: 3360, duration: 460 }, // B4
        { midi: 69, onset: 3840, duration: 460 }, // A4
        { midi: 67, onset: 4320, duration: 460 }, // G4
        { midi: 64, onset: 4800, duration: 460 }, // E4
      ],
    },
    {
      stepNumber: 4,
      module: 'latin_l1',
      section: 'A',
      subsection: 'A2: Reggaeton Melodies',
      activity: 'A2.1: 3-Note Reggaeton Melody',
      direction:
        'B, D, then E — on the tresillo: beat 1, the "and" of 2, beat 4.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l1_reggaeton_melody_3note | latin',
      styleRef: 'l1a',
      successFeedback:
        'Three notes on the 3+3+2 — that is the reggaeton bounce.',
      scaleIntervals: [0, 3, 5, 7, 10],
      scaleId: 'minor_pentatonic',
      chordSymbols: ['Em', 'C', 'G', 'D'],
      tempo: 92,
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 71, onset: 0, duration: 700 }, // B4
        { midi: 74, onset: 720, duration: 700 }, // D5
        { midi: 76, onset: 1440, duration: 1380 }, // E5
      ],
    },
    {
      stepNumber: 5,
      module: 'latin_l1',
      section: 'A',
      subsection: 'A2: Reggaeton Melodies',
      activity: 'A2.2: 5-Note Reggaeton Melody',
      direction: 'Two bars on the tresillo: E, D, B — then A, G.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l1_reggaeton_melody_5note | latin',
      styleRef: 'l1a',
      successFeedback: 'Two bars of melody over the loop.',
      scaleIntervals: [0, 3, 5, 7, 10],
      scaleId: 'minor_pentatonic',
      chordSymbols: ['Em', 'C', 'G', 'D'],
      tempo: 92,
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 76, onset: 0, duration: 700 }, // E5
        { midi: 74, onset: 720, duration: 700 }, // D5
        { midi: 71, onset: 1440, duration: 440 }, // B4
        { midi: 69, onset: 1920, duration: 700 }, // A4
        { midi: 67, onset: 2640, duration: 1180 }, // G4
      ],
    },
    {
      stepNumber: 6,
      module: 'latin_l1',
      section: 'A',
      subsection: 'A3: Scale (E Harmonic Minor)',
      activity: 'A3.1: E Harmonic Minor Ascending (Out of Time)',
      direction:
        'Play the E Harmonic Minor scale up, one note at a time: E–F♯–G–A–B–C–D♯–E.',
      assessment: 'pitch_order',
      tag: 'latin:l1_harm_asc_oot | latin',
      styleRef: 'l1b',
      successFeedback: 'D♯ — the raised 7th, the note that pulls home to E.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 11],
      scaleId: 'harmonic_minor',
      targetNotes: [
        { midi: 64, onset: 0, duration: 460 }, // E4
        { midi: 66, onset: 480, duration: 460 }, // F♯4
        { midi: 67, onset: 960, duration: 460 }, // G4
        { midi: 69, onset: 1440, duration: 460 }, // A4
        { midi: 71, onset: 1920, duration: 460 }, // B4
        { midi: 72, onset: 2400, duration: 460 }, // C5
        { midi: 75, onset: 2880, duration: 460 }, // D♯5
        { midi: 76, onset: 3360, duration: 460 }, // E5
      ],
    },
    {
      stepNumber: 7,
      module: 'latin_l1',
      section: 'A',
      subsection: 'A3: Scale (E Harmonic Minor)',
      activity: 'A3.2: E Harmonic Minor Descending (Out of Time)',
      direction: 'Now play it back down from the top E.',
      assessment: 'pitch_order',
      tag: 'latin:l1_harm_desc_oot | latin',
      styleRef: 'l1b',
      successFeedback: 'Down through D♯ — hear how it leans on E.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 11],
      scaleId: 'harmonic_minor',
      targetNotes: [
        { midi: 76, onset: 0, duration: 460 }, // E5
        { midi: 75, onset: 480, duration: 460 }, // D♯5
        { midi: 72, onset: 960, duration: 460 }, // C5
        { midi: 71, onset: 1440, duration: 460 }, // B4
        { midi: 69, onset: 1920, duration: 460 }, // A4
        { midi: 67, onset: 2400, duration: 460 }, // G4
        { midi: 66, onset: 2880, duration: 460 }, // F♯4
        { midi: 64, onset: 3360, duration: 460 }, // E4
      ],
    },
    {
      stepNumber: 8,
      module: 'latin_l1',
      section: 'A',
      subsection: 'A3: Scale (E Harmonic Minor)',
      activity: 'A3.3: E Harmonic Minor — Up & Down (In Time)',
      direction: 'Up and back down, one note per beat.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l1_harm_updown_it | latin',
      styleRef: 'l1b',
      successFeedback: 'The harmonic minor, in time.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 11],
      scaleId: 'harmonic_minor',
      targetNotes: [
        { midi: 64, onset: 0, duration: 460 }, // E4
        { midi: 66, onset: 480, duration: 460 }, // F♯4
        { midi: 67, onset: 960, duration: 460 }, // G4
        { midi: 69, onset: 1440, duration: 460 }, // A4
        { midi: 71, onset: 1920, duration: 460 }, // B4
        { midi: 72, onset: 2400, duration: 460 }, // C5
        { midi: 75, onset: 2880, duration: 460 }, // D♯5
        { midi: 76, onset: 3360, duration: 460 }, // E5
        { midi: 75, onset: 3840, duration: 460 }, // D♯5
        { midi: 72, onset: 4320, duration: 460 }, // C5
        { midi: 71, onset: 4800, duration: 460 }, // B4
        { midi: 69, onset: 5280, duration: 460 }, // A4
        { midi: 67, onset: 5760, duration: 460 }, // G4
        { midi: 66, onset: 6240, duration: 460 }, // F♯4
        { midi: 64, onset: 6720, duration: 460 }, // E4
      ],
    },
    {
      stepNumber: 9,
      module: 'latin_l1',
      section: 'A',
      subsection: 'A4: Cumbia Melodies',
      activity: 'A4.1: 3-Note Cumbia Melody',
      direction:
        'Over B7: B, then D♯ — and up to E as the chord resolves to E minor.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l1_cumbia_melody_3note | latin',
      styleRef: 'l1b',
      successFeedback: 'D♯ to E — the leading tone, home.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 11],
      scaleId: 'harmonic_minor',
      chordSymbols: ['B7', 'Em'],
      tempo: 96,
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 71, onset: 0, duration: 940 }, // B4
        { midi: 75, onset: 960, duration: 940 }, // D♯5
        { midi: 76, onset: 1920, duration: 1860 }, // E5
      ],
    },
    {
      stepNumber: 10,
      module: 'latin_l1',
      section: 'A',
      subsection: 'A4: Cumbia Melodies',
      activity: 'A4.2: 6-Note Cumbia Melody',
      direction: 'E, D♯, E, B — then C and B over A minor.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l1_cumbia_melody_6note | latin',
      styleRef: 'l1b',
      successFeedback: 'A cumbia turn around the leading tone.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 11],
      scaleId: 'harmonic_minor',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 96,
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 76, onset: 0, duration: 220 }, // E5
        { midi: 75, onset: 240, duration: 220 }, // D♯5
        { midi: 76, onset: 480, duration: 460 }, // E5
        { midi: 71, onset: 960, duration: 940 }, // B4
        { midi: 72, onset: 1920, duration: 940 }, // C5
        { midi: 71, onset: 2880, duration: 900 }, // B4
      ],
    },
    {
      stepNumber: 11,
      module: 'latin_l1',
      section: 'A',
      subsection: 'A5: Scale (G Major)',
      activity: 'A5.1: G Major Ascending (Out of Time)',
      direction:
        'Play the G Major scale up, one note at a time: G–A–B–C–D–E–F♯–G.',
      assessment: 'pitch_order',
      tag: 'latin:l1_gmaj_asc_oot | latin',
      styleRef: 'l1c',
      successFeedback: 'G major — the same notes as E minor, starting on G.',
      key: 'G major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      targetNotes: [
        { midi: 67, onset: 0, duration: 460 }, // G4
        { midi: 69, onset: 480, duration: 460 }, // A4
        { midi: 71, onset: 960, duration: 460 }, // B4
        { midi: 72, onset: 1440, duration: 460 }, // C5
        { midi: 74, onset: 1920, duration: 460 }, // D5
        { midi: 76, onset: 2400, duration: 460 }, // E5
        { midi: 78, onset: 2880, duration: 460 }, // F♯5
        { midi: 79, onset: 3360, duration: 460 }, // G5
      ],
    },
    {
      stepNumber: 12,
      module: 'latin_l1',
      section: 'A',
      subsection: 'A5: Scale (G Major)',
      activity: 'A5.2: G Major Descending (Out of Time)',
      direction: 'Now play it back down from the top G.',
      assessment: 'pitch_order',
      tag: 'latin:l1_gmaj_desc_oot | latin',
      styleRef: 'l1c',
      successFeedback: 'Back down from the high G.',
      key: 'G major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      targetNotes: [
        { midi: 79, onset: 0, duration: 460 }, // G5
        { midi: 78, onset: 480, duration: 460 }, // F♯5
        { midi: 76, onset: 960, duration: 460 }, // E5
        { midi: 74, onset: 1440, duration: 460 }, // D5
        { midi: 72, onset: 1920, duration: 460 }, // C5
        { midi: 71, onset: 2400, duration: 460 }, // B4
        { midi: 69, onset: 2880, duration: 460 }, // A4
        { midi: 67, onset: 3360, duration: 460 }, // G4
      ],
    },
    {
      stepNumber: 13,
      module: 'latin_l1',
      section: 'A',
      subsection: 'A5: Scale (G Major)',
      activity: 'A5.3: G Major — Up & Down (In Time)',
      direction: 'Up and back down, one note per beat.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l1_gmaj_updown_it | latin',
      styleRef: 'l1c',
      successFeedback: 'G major, in time.',
      key: 'G major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      targetNotes: [
        { midi: 67, onset: 0, duration: 460 }, // G4
        { midi: 69, onset: 480, duration: 460 }, // A4
        { midi: 71, onset: 960, duration: 460 }, // B4
        { midi: 72, onset: 1440, duration: 460 }, // C5
        { midi: 74, onset: 1920, duration: 460 }, // D5
        { midi: 76, onset: 2400, duration: 460 }, // E5
        { midi: 78, onset: 2880, duration: 460 }, // F♯5
        { midi: 79, onset: 3360, duration: 460 }, // G5
        { midi: 78, onset: 3840, duration: 460 }, // F♯5
        { midi: 76, onset: 4320, duration: 460 }, // E5
        { midi: 74, onset: 4800, duration: 460 }, // D5
        { midi: 72, onset: 5280, duration: 460 }, // C5
        { midi: 71, onset: 5760, duration: 460 }, // B4
        { midi: 69, onset: 6240, duration: 460 }, // A4
        { midi: 67, onset: 6720, duration: 460 }, // G4
      ],
    },
    {
      stepNumber: 14,
      module: 'latin_l1',
      section: 'A',
      subsection: 'A6: Mariachi Melodies',
      activity: 'A6.1: 3-Note Mariachi Melody',
      direction:
        'In 3/4: D held for two beats, B on beat 3 — then G for the whole bar.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l1_mariachi_melody_3note | latin',
      styleRef: 'l1c',
      successFeedback: 'One, two, three — that is the vals.',
      key: 'G major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['G', 'C', 'D7', 'G'],
      timeSignature: [3, 4],
      tempo: 126,
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 74, onset: 0, duration: 940 }, // D5
        { midi: 71, onset: 960, duration: 460 }, // B4
        { midi: 67, onset: 1440, duration: 1380 }, // G4
      ],
    },
    {
      stepNumber: 15,
      module: 'latin_l1',
      section: 'A',
      subsection: 'A6: Mariachi Melodies',
      activity: 'A6.2: 6-Note Mariachi Melody',
      direction: 'B, C, D up the bar; E held, then D; and B to finish.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l1_mariachi_melody_6note | latin',
      styleRef: 'l1c',
      successFeedback: 'A ranchera line, in three.',
      key: 'G major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['G', 'C', 'G', 'D7'],
      timeSignature: [3, 4],
      tempo: 126,
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 71, onset: 0, duration: 460 }, // B4
        { midi: 72, onset: 480, duration: 460 }, // C5
        { midi: 74, onset: 960, duration: 460 }, // D5
        { midi: 76, onset: 1440, duration: 940 }, // E5
        { midi: 74, onset: 2400, duration: 460 }, // D5
        { midi: 71, onset: 2880, duration: 1380 }, // B4
      ],
    },
  ],
};

const latinL1SectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    {
      stepNumber: 16,
      module: 'latin_l1',
      section: 'B',
      subsection: 'B1: Reggaeton Chords',
      activity: 'B1.1: 1 min — Em (Out of Time)',
      direction: 'Arpeggiate E minor up — E–G–B — then play it as a chord.',
      assessment: 'pitch_only',
      tag: 'latin:l1_em | latin',
      styleRef: 'l1a',
      successFeedback: 'E minor — home for the reggaeton loop.',
      chordSymbols: ['Em'],
      targetNotes: [
        { midi: 64, onset: 0, duration: 460 }, // E4
        { midi: 67, onset: 480, duration: 460 }, // G4
        { midi: 71, onset: 960, duration: 460 }, // B4
        { midi: 64, onset: 1440, duration: 900 }, // E4
        { midi: 67, onset: 1440, duration: 900 }, // G4
        { midi: 71, onset: 1440, duration: 900 }, // B4
      ],
    },
    {
      stepNumber: 17,
      module: 'latin_l1',
      section: 'B',
      subsection: 'B1: Reggaeton Chords',
      activity: 'B1.2: 6 maj — C (Out of Time)',
      direction: 'Arpeggiate C major up — C–E–G — then play it as a chord.',
      assessment: 'pitch_only',
      tag: 'latin:l1_c | latin',
      styleRef: 'l1a',
      successFeedback: 'C major — the 6 in E minor.',
      chordSymbols: ['C'],
      targetNotes: [
        { midi: 60, onset: 0, duration: 460 }, // C4
        { midi: 64, onset: 480, duration: 460 }, // E4
        { midi: 67, onset: 960, duration: 460 }, // G4
        { midi: 60, onset: 1440, duration: 900 }, // C4
        { midi: 64, onset: 1440, duration: 900 }, // E4
        { midi: 67, onset: 1440, duration: 900 }, // G4
      ],
    },
    {
      stepNumber: 18,
      module: 'latin_l1',
      section: 'B',
      subsection: 'B1: Reggaeton Chords',
      activity: 'B1.3: 3 maj — G (Out of Time)',
      direction: 'Arpeggiate G major up — G–B–D — then play it as a chord.',
      assessment: 'pitch_only',
      tag: 'latin:l1_g | latin',
      styleRef: 'l1a',
      successFeedback: 'G major — the 3.',
      chordSymbols: ['G'],
      targetNotes: [
        { midi: 55, onset: 0, duration: 460 }, // G3
        { midi: 59, onset: 480, duration: 460 }, // B3
        { midi: 62, onset: 960, duration: 460 }, // D4
        { midi: 55, onset: 1440, duration: 900 }, // G3
        { midi: 59, onset: 1440, duration: 900 }, // B3
        { midi: 62, onset: 1440, duration: 900 }, // D4
      ],
    },
    {
      stepNumber: 19,
      module: 'latin_l1',
      section: 'B',
      subsection: 'B1: Reggaeton Chords',
      activity: 'B1.4: 7 maj — D (Out of Time)',
      direction: 'Arpeggiate D major up — D–F♯–A — then play it as a chord.',
      assessment: 'pitch_only',
      tag: 'latin:l1_d | latin',
      styleRef: 'l1a',
      successFeedback: 'D major — the 7, and back to E minor.',
      chordSymbols: ['D'],
      targetNotes: [
        { midi: 62, onset: 0, duration: 460 }, // D4
        { midi: 66, onset: 480, duration: 460 }, // F♯4
        { midi: 69, onset: 960, duration: 460 }, // A4
        { midi: 62, onset: 1440, duration: 900 }, // D4
        { midi: 66, onset: 1440, duration: 900 }, // F♯4
        { midi: 69, onset: 1440, duration: 900 }, // A4
      ],
    },
    {
      stepNumber: 20,
      module: 'latin_l1',
      section: 'B',
      subsection: 'B1: Reggaeton Chords',
      activity: 'B1.5: Reggaeton Loop, Voice-Led (Out of Time)',
      direction:
        'Em – C – G – D, keeping the shared notes still: only one or two fingers move each time.',
      assessment: 'pitch_order',
      tag: 'latin:l1_reggaeton_loop_vl | latin',
      styleRef: 'l1a',
      successFeedback: 'Four chords, barely moving — that is voice leading.',
      chordSymbols: ['Em', 'C', 'G', 'D'],
      targetNotes: [
        { midi: 64, onset: 0, duration: 1800 }, // E4
        { midi: 67, onset: 0, duration: 1800 }, // G4
        { midi: 71, onset: 0, duration: 1800 }, // B4
        { midi: 64, onset: 1920, duration: 1800 }, // E4
        { midi: 67, onset: 1920, duration: 1800 }, // G4
        { midi: 72, onset: 1920, duration: 1800 }, // C5
        { midi: 62, onset: 3840, duration: 1800 }, // D4
        { midi: 67, onset: 3840, duration: 1800 }, // G4
        { midi: 71, onset: 3840, duration: 1800 }, // B4
        { midi: 62, onset: 5760, duration: 1800 }, // D4
        { midi: 66, onset: 5760, duration: 1800 }, // F♯4
        { midi: 69, onset: 5760, duration: 1800 }, // A4
      ],
    },
    {
      stepNumber: 21,
      module: 'latin_l1',
      section: 'B',
      subsection: 'B1: Reggaeton Chords',
      activity: 'B1.6: Play-Along — Reggaeton Loop',
      direction:
        'The loop on the tresillo: beat 1, the "and" of 2, beat 4 — every bar.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l1_reggaeton_loop_play | latin',
      styleRef: 'l1a',
      successFeedback: 'The loop, in the pocket.',
      chordSymbols: ['Em', 'C', 'G', 'D'],
      tempo: 92,
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 64, onset: 0, duration: 600 }, // E4
        { midi: 67, onset: 0, duration: 600 }, // G4
        { midi: 71, onset: 0, duration: 600 }, // B4
        { midi: 64, onset: 720, duration: 600 }, // E4
        { midi: 67, onset: 720, duration: 600 }, // G4
        { midi: 71, onset: 720, duration: 600 }, // B4
        { midi: 64, onset: 1440, duration: 400 }, // E4
        { midi: 67, onset: 1440, duration: 400 }, // G4
        { midi: 71, onset: 1440, duration: 400 }, // B4
        { midi: 64, onset: 1920, duration: 600 }, // E4
        { midi: 67, onset: 1920, duration: 600 }, // G4
        { midi: 72, onset: 1920, duration: 600 }, // C5
        { midi: 64, onset: 2640, duration: 600 }, // E4
        { midi: 67, onset: 2640, duration: 600 }, // G4
        { midi: 72, onset: 2640, duration: 600 }, // C5
        { midi: 64, onset: 3360, duration: 400 }, // E4
        { midi: 67, onset: 3360, duration: 400 }, // G4
        { midi: 72, onset: 3360, duration: 400 }, // C5
        { midi: 62, onset: 3840, duration: 600 }, // D4
        { midi: 67, onset: 3840, duration: 600 }, // G4
        { midi: 71, onset: 3840, duration: 600 }, // B4
        { midi: 62, onset: 4560, duration: 600 }, // D4
        { midi: 67, onset: 4560, duration: 600 }, // G4
        { midi: 71, onset: 4560, duration: 600 }, // B4
        { midi: 62, onset: 5280, duration: 400 }, // D4
        { midi: 67, onset: 5280, duration: 400 }, // G4
        { midi: 71, onset: 5280, duration: 400 }, // B4
        { midi: 62, onset: 5760, duration: 600 }, // D4
        { midi: 66, onset: 5760, duration: 600 }, // F♯4
        { midi: 69, onset: 5760, duration: 600 }, // A4
        { midi: 62, onset: 6480, duration: 600 }, // D4
        { midi: 66, onset: 6480, duration: 600 }, // F♯4
        { midi: 69, onset: 6480, duration: 600 }, // A4
        { midi: 62, onset: 7200, duration: 400 }, // D4
        { midi: 66, onset: 7200, duration: 400 }, // F♯4
        { midi: 69, onset: 7200, duration: 400 }, // A4
      ],
    },
    {
      stepNumber: 22,
      module: 'latin_l1',
      section: 'B',
      subsection: 'B2: Cumbia Chords',
      activity: 'B2.1: 4 min — Am (Out of Time)',
      direction: 'Arpeggiate A minor up — A–C–E — then play it as a chord.',
      assessment: 'pitch_only',
      tag: 'latin:l1_am | latin',
      styleRef: 'l1b',
      successFeedback: 'A minor — the 4 min.',
      chordSymbols: ['Am'],
      targetNotes: [
        { midi: 57, onset: 0, duration: 460 }, // A3
        { midi: 60, onset: 480, duration: 460 }, // C4
        { midi: 64, onset: 960, duration: 460 }, // E4
        { midi: 57, onset: 1440, duration: 900 }, // A3
        { midi: 60, onset: 1440, duration: 900 }, // C4
        { midi: 64, onset: 1440, duration: 900 }, // E4
      ],
    },
    {
      stepNumber: 23,
      module: 'latin_l1',
      section: 'B',
      subsection: 'B2: Cumbia Chords',
      activity: 'B2.2: 5 dom7 — B7 (Out of Time)',
      direction:
        'Your first 7th chord: B–D♯–F♯–A, up one at a time, then all four together.',
      assessment: 'pitch_only',
      tag: 'latin:l1_b7 | latin',
      styleRef: 'l1b',
      successFeedback: 'B7 — four notes, and the D♯ wants to go home.',
      chordSymbols: ['B7'],
      targetNotes: [
        { midi: 59, onset: 0, duration: 460 }, // B3
        { midi: 63, onset: 480, duration: 460 }, // D♯4
        { midi: 66, onset: 960, duration: 460 }, // F♯4
        { midi: 69, onset: 1440, duration: 460 }, // A4
        { midi: 59, onset: 1920, duration: 900 }, // B3
        { midi: 63, onset: 1920, duration: 900 }, // D♯4
        { midi: 66, onset: 1920, duration: 900 }, // F♯4
        { midi: 69, onset: 1920, duration: 900 }, // A4
      ],
    },
    {
      stepNumber: 24,
      module: 'latin_l1',
      section: 'B',
      subsection: 'B2: Cumbia Chords',
      activity: 'B2.3: Cumbia Progression, Voice-Led (Out of Time)',
      direction: 'Em – Am – B7 – Em, moving as little as you can.',
      assessment: 'pitch_order',
      tag: 'latin:l1_cumbia_prog_vl | latin',
      styleRef: 'l1b',
      successFeedback: 'D♯ up to E — the progression lands home.',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      targetNotes: [
        { midi: 64, onset: 0, duration: 1800 }, // E4
        { midi: 67, onset: 0, duration: 1800 }, // G4
        { midi: 71, onset: 0, duration: 1800 }, // B4
        { midi: 64, onset: 1920, duration: 1800 }, // E4
        { midi: 69, onset: 1920, duration: 1800 }, // A4
        { midi: 72, onset: 1920, duration: 1800 }, // C5
        { midi: 63, onset: 3840, duration: 1800 }, // D♯4
        { midi: 66, onset: 3840, duration: 1800 }, // F♯4
        { midi: 69, onset: 3840, duration: 1800 }, // A4
        { midi: 71, onset: 3840, duration: 1800 }, // B4
        { midi: 64, onset: 5760, duration: 1800 }, // E4
        { midi: 67, onset: 5760, duration: 1800 }, // G4
        { midi: 71, onset: 5760, duration: 1800 }, // B4
      ],
    },
    {
      stepNumber: 25,
      module: 'latin_l1',
      section: 'B',
      subsection: 'B2: Cumbia Chords',
      activity: 'B2.4: Play-Along — Cumbia',
      direction:
        'Short chords on every "and" — the offbeats, like the accordion.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l1_cumbia_prog_play | latin',
      styleRef: 'l1b',
      successFeedback: 'Offbeats all the way — that is cumbia.',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 96,
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 64, onset: 240, duration: 200 }, // E4
        { midi: 67, onset: 240, duration: 200 }, // G4
        { midi: 71, onset: 240, duration: 200 }, // B4
        { midi: 64, onset: 720, duration: 200 }, // E4
        { midi: 67, onset: 720, duration: 200 }, // G4
        { midi: 71, onset: 720, duration: 200 }, // B4
        { midi: 64, onset: 1200, duration: 200 }, // E4
        { midi: 67, onset: 1200, duration: 200 }, // G4
        { midi: 71, onset: 1200, duration: 200 }, // B4
        { midi: 64, onset: 1680, duration: 200 }, // E4
        { midi: 67, onset: 1680, duration: 200 }, // G4
        { midi: 71, onset: 1680, duration: 200 }, // B4
        { midi: 64, onset: 2160, duration: 200 }, // E4
        { midi: 69, onset: 2160, duration: 200 }, // A4
        { midi: 72, onset: 2160, duration: 200 }, // C5
        { midi: 64, onset: 2640, duration: 200 }, // E4
        { midi: 69, onset: 2640, duration: 200 }, // A4
        { midi: 72, onset: 2640, duration: 200 }, // C5
        { midi: 64, onset: 3120, duration: 200 }, // E4
        { midi: 69, onset: 3120, duration: 200 }, // A4
        { midi: 72, onset: 3120, duration: 200 }, // C5
        { midi: 64, onset: 3600, duration: 200 }, // E4
        { midi: 69, onset: 3600, duration: 200 }, // A4
        { midi: 72, onset: 3600, duration: 200 }, // C5
        { midi: 63, onset: 4080, duration: 200 }, // D♯4
        { midi: 66, onset: 4080, duration: 200 }, // F♯4
        { midi: 69, onset: 4080, duration: 200 }, // A4
        { midi: 71, onset: 4080, duration: 200 }, // B4
        { midi: 63, onset: 4560, duration: 200 }, // D♯4
        { midi: 66, onset: 4560, duration: 200 }, // F♯4
        { midi: 69, onset: 4560, duration: 200 }, // A4
        { midi: 71, onset: 4560, duration: 200 }, // B4
        { midi: 63, onset: 5040, duration: 200 }, // D♯4
        { midi: 66, onset: 5040, duration: 200 }, // F♯4
        { midi: 69, onset: 5040, duration: 200 }, // A4
        { midi: 71, onset: 5040, duration: 200 }, // B4
        { midi: 63, onset: 5520, duration: 200 }, // D♯4
        { midi: 66, onset: 5520, duration: 200 }, // F♯4
        { midi: 69, onset: 5520, duration: 200 }, // A4
        { midi: 71, onset: 5520, duration: 200 }, // B4
        { midi: 64, onset: 6000, duration: 200 }, // E4
        { midi: 67, onset: 6000, duration: 200 }, // G4
        { midi: 71, onset: 6000, duration: 200 }, // B4
        { midi: 64, onset: 6480, duration: 200 }, // E4
        { midi: 67, onset: 6480, duration: 200 }, // G4
        { midi: 71, onset: 6480, duration: 200 }, // B4
        { midi: 64, onset: 6960, duration: 200 }, // E4
        { midi: 67, onset: 6960, duration: 200 }, // G4
        { midi: 71, onset: 6960, duration: 200 }, // B4
        { midi: 64, onset: 7440, duration: 200 }, // E4
        { midi: 67, onset: 7440, duration: 200 }, // G4
        { midi: 71, onset: 7440, duration: 200 }, // B4
      ],
    },
    {
      stepNumber: 26,
      module: 'latin_l1',
      section: 'B',
      subsection: 'B3: Mariachi Chords',
      activity: 'B3.1: 5 dom7 — D7 (Out of Time)',
      direction:
        'In G major the 5 is D7: D–F♯–A–C, up one at a time, then together.',
      assessment: 'pitch_only',
      tag: 'latin:l1_d7 | latin',
      styleRef: 'l1c',
      successFeedback: 'D7 — the chord that sends you back to G.',
      key: 'G major',
      chordSymbols: ['D7'],
      targetNotes: [
        { midi: 62, onset: 0, duration: 460 }, // D4
        { midi: 66, onset: 480, duration: 460 }, // F♯4
        { midi: 69, onset: 960, duration: 460 }, // A4
        { midi: 72, onset: 1440, duration: 460 }, // C5
        { midi: 62, onset: 1920, duration: 900 }, // D4
        { midi: 66, onset: 1920, duration: 900 }, // F♯4
        { midi: 69, onset: 1920, duration: 900 }, // A4
        { midi: 72, onset: 1920, duration: 900 }, // C5
      ],
    },
    {
      stepNumber: 27,
      module: 'latin_l1',
      section: 'B',
      subsection: 'B3: Mariachi Chords',
      activity: 'B3.2: Mariachi Progression, Voice-Led (Out of Time)',
      direction: 'G – C – D7 – G, keeping the shared notes still.',
      assessment: 'pitch_order',
      tag: 'latin:l1_mariachi_prog_vl | latin',
      styleRef: 'l1c',
      successFeedback: '1, 4, 5, 1 — the ranchera progression.',
      key: 'G major',
      chordSymbols: ['G', 'C', 'D7', 'G'],
      targetNotes: [
        { midi: 62, onset: 0, duration: 1800 }, // D4
        { midi: 67, onset: 0, duration: 1800 }, // G4
        { midi: 71, onset: 0, duration: 1800 }, // B4
        { midi: 64, onset: 1920, duration: 1800 }, // E4
        { midi: 67, onset: 1920, duration: 1800 }, // G4
        { midi: 72, onset: 1920, duration: 1800 }, // C5
        { midi: 62, onset: 3840, duration: 1800 }, // D4
        { midi: 66, onset: 3840, duration: 1800 }, // F♯4
        { midi: 69, onset: 3840, duration: 1800 }, // A4
        { midi: 72, onset: 3840, duration: 1800 }, // C5
        { midi: 62, onset: 5760, duration: 1800 }, // D4
        { midi: 67, onset: 5760, duration: 1800 }, // G4
        { midi: 71, onset: 5760, duration: 1800 }, // B4
      ],
    },
    {
      stepNumber: 28,
      module: 'latin_l1',
      section: 'B',
      subsection: 'B3: Mariachi Chords',
      activity: 'B3.3: Play-Along — Mariachi Vals',
      direction:
        'In 3/4: chords on beats 2 and 3 — the "chord, chord" of the vals. The bass takes beat 1.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l1_mariachi_vals_play | latin',
      styleRef: 'l1c',
      successFeedback: 'Oom-pah-pah — you are the pah-pah.',
      key: 'G major',
      chordSymbols: ['G', 'C', 'D7', 'G'],
      timeSignature: [3, 4],
      tempo: 126,
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 62, onset: 480, duration: 400 }, // D4
        { midi: 67, onset: 480, duration: 400 }, // G4
        { midi: 71, onset: 480, duration: 400 }, // B4
        { midi: 62, onset: 960, duration: 400 }, // D4
        { midi: 67, onset: 960, duration: 400 }, // G4
        { midi: 71, onset: 960, duration: 400 }, // B4
        { midi: 64, onset: 1920, duration: 400 }, // E4
        { midi: 67, onset: 1920, duration: 400 }, // G4
        { midi: 72, onset: 1920, duration: 400 }, // C5
        { midi: 64, onset: 2400, duration: 400 }, // E4
        { midi: 67, onset: 2400, duration: 400 }, // G4
        { midi: 72, onset: 2400, duration: 400 }, // C5
        { midi: 62, onset: 3360, duration: 400 }, // D4
        { midi: 66, onset: 3360, duration: 400 }, // F♯4
        { midi: 69, onset: 3360, duration: 400 }, // A4
        { midi: 72, onset: 3360, duration: 400 }, // C5
        { midi: 62, onset: 3840, duration: 400 }, // D4
        { midi: 66, onset: 3840, duration: 400 }, // F♯4
        { midi: 69, onset: 3840, duration: 400 }, // A4
        { midi: 72, onset: 3840, duration: 400 }, // C5
        { midi: 62, onset: 4800, duration: 400 }, // D4
        { midi: 67, onset: 4800, duration: 400 }, // G4
        { midi: 71, onset: 4800, duration: 400 }, // B4
        { midi: 62, onset: 5280, duration: 400 }, // D4
        { midi: 67, onset: 5280, duration: 400 }, // G4
        { midi: 71, onset: 5280, duration: 400 }, // B4
      ],
    },
  ],
};

const latinL1SectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 29,
      module: 'latin_l1',
      section: 'C',
      subsection: 'C1: Reggaeton Bass',
      activity: 'C1.1: Reggaeton Rhythm, One Note',
      direction:
        'E on the tresillo — beat 1, the "and" of 2, beat 4. Just the rhythm first.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l1_bass_reggaeton_rhythm | latin',
      styleRef: 'l1a',
      successFeedback: '3+3+2 — the reggaeton bass rhythm.',
      chordSymbols: ['Em'],
      targetNotes: [
        { midi: 40, onset: 0, duration: 680 }, // E2
        { midi: 40, onset: 720, duration: 680 }, // E2
        { midi: 40, onset: 1440, duration: 440 }, // E2
        { midi: 40, onset: 1920, duration: 680 }, // E2
        { midi: 40, onset: 2640, duration: 680 }, // E2
        { midi: 40, onset: 3360, duration: 440 }, // E2
      ],
    },
    {
      stepNumber: 30,
      module: 'latin_l1',
      section: 'C',
      subsection: 'C1: Reggaeton Bass',
      activity: 'C1.2: Reggaeton Bass — the Loop',
      direction: 'Same rhythm, following the roots: E – C – G – D.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l1_bass_reggaeton_loop | latin',
      styleRef: 'l1a',
      successFeedback: 'Roots on the tresillo, all four chords.',
      chordSymbols: ['Em', 'C', 'G', 'D'],
      targetNotes: [
        { midi: 40, onset: 0, duration: 680 }, // E2
        { midi: 40, onset: 720, duration: 680 }, // E2
        { midi: 40, onset: 1440, duration: 440 }, // E2
        { midi: 36, onset: 1920, duration: 680 }, // C2
        { midi: 36, onset: 2640, duration: 680 }, // C2
        { midi: 36, onset: 3360, duration: 440 }, // C2
        { midi: 43, onset: 3840, duration: 680 }, // G2
        { midi: 43, onset: 4560, duration: 680 }, // G2
        { midi: 43, onset: 5280, duration: 440 }, // G2
        { midi: 38, onset: 5760, duration: 680 }, // D2
        { midi: 38, onset: 6480, duration: 680 }, // D2
        { midi: 38, onset: 7200, duration: 440 }, // D2
      ],
    },
    {
      stepNumber: 31,
      module: 'latin_l1',
      section: 'C',
      subsection: 'C1: Reggaeton Bass',
      activity: 'C1.3: Bass Play-Along — Reggaeton',
      direction: 'The loop bass over the dembow beat.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l1_bass_reggaeton_play | latin',
      styleRef: 'l1a',
      successFeedback: 'You and the dembow, locked.',
      chordSymbols: ['Em', 'C', 'G', 'D'],
      tempo: 92,
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 40, onset: 0, duration: 680 }, // E2
        { midi: 40, onset: 720, duration: 680 }, // E2
        { midi: 40, onset: 1440, duration: 440 }, // E2
        { midi: 36, onset: 1920, duration: 680 }, // C2
        { midi: 36, onset: 2640, duration: 680 }, // C2
        { midi: 36, onset: 3360, duration: 440 }, // C2
        { midi: 43, onset: 3840, duration: 680 }, // G2
        { midi: 43, onset: 4560, duration: 680 }, // G2
        { midi: 43, onset: 5280, duration: 440 }, // G2
        { midi: 38, onset: 5760, duration: 680 }, // D2
        { midi: 38, onset: 6480, duration: 680 }, // D2
        { midi: 38, onset: 7200, duration: 440 }, // D2
      ],
    },
    {
      stepNumber: 32,
      module: 'latin_l1',
      section: 'C',
      subsection: 'C2: Cumbia Bass',
      activity: 'C2.1: Cumbia Bass, One Chord',
      direction:
        'Root on 1, then the 3 and 5 quickly — root again on 3, then 3 and 5. Over E minor: E, G-B, E, G-B.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l1_bass_cumbia_one | latin',
      styleRef: 'l1b',
      successFeedback: 'Root, 3, 5 — the cumbia bounce.',
      chordSymbols: ['Em'],
      targetNotes: [
        { midi: 40, onset: 0, duration: 460 }, // E2
        { midi: 43, onset: 480, duration: 110 }, // G2
        { midi: 47, onset: 720, duration: 110 }, // B2
        { midi: 40, onset: 960, duration: 460 }, // E2
        { midi: 43, onset: 1440, duration: 110 }, // G2
        { midi: 47, onset: 1680, duration: 110 }, // B2
        { midi: 40, onset: 1920, duration: 460 }, // E2
        { midi: 43, onset: 2400, duration: 110 }, // G2
        { midi: 47, onset: 2640, duration: 110 }, // B2
        { midi: 40, onset: 2880, duration: 460 }, // E2
        { midi: 43, onset: 3360, duration: 110 }, // G2
        { midi: 47, onset: 3600, duration: 110 }, // B2
      ],
    },
    {
      stepNumber: 33,
      module: 'latin_l1',
      section: 'C',
      subsection: 'C2: Cumbia Bass',
      activity: 'C2.2: Cumbia Bass — the Progression',
      direction:
        'The same shape on every chord: Em – Am – B7 – Em. Over B7 the 3 is D♯.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l1_bass_cumbia_prog | latin',
      styleRef: 'l1b',
      successFeedback: 'Root, 3, 5 through the whole progression.',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      targetNotes: [
        { midi: 40, onset: 0, duration: 460 }, // E2
        { midi: 43, onset: 480, duration: 110 }, // G2
        { midi: 47, onset: 720, duration: 110 }, // B2
        { midi: 40, onset: 960, duration: 460 }, // E2
        { midi: 43, onset: 1440, duration: 110 }, // G2
        { midi: 47, onset: 1680, duration: 110 }, // B2
        { midi: 45, onset: 1920, duration: 460 }, // A2
        { midi: 48, onset: 2400, duration: 110 }, // C3
        { midi: 52, onset: 2640, duration: 110 }, // E3
        { midi: 45, onset: 2880, duration: 460 }, // A2
        { midi: 48, onset: 3360, duration: 110 }, // C3
        { midi: 52, onset: 3600, duration: 110 }, // E3
        { midi: 47, onset: 3840, duration: 460 }, // B2
        { midi: 51, onset: 4320, duration: 110 }, // D♯3
        { midi: 54, onset: 4560, duration: 110 }, // F♯3
        { midi: 47, onset: 4800, duration: 460 }, // B2
        { midi: 51, onset: 5280, duration: 110 }, // D♯3
        { midi: 54, onset: 5520, duration: 110 }, // F♯3
        { midi: 40, onset: 5760, duration: 460 }, // E2
        { midi: 43, onset: 6240, duration: 110 }, // G2
        { midi: 47, onset: 6480, duration: 110 }, // B2
        { midi: 40, onset: 6720, duration: 460 }, // E2
        { midi: 43, onset: 7200, duration: 110 }, // G2
        { midi: 47, onset: 7440, duration: 110 }, // B2
      ],
    },
    {
      stepNumber: 34,
      module: 'latin_l1',
      section: 'C',
      subsection: 'C2: Cumbia Bass',
      activity: 'C2.3: Bass Play-Along — Cumbia',
      direction: 'The cumbia line over the groove.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l1_bass_cumbia_play | latin',
      styleRef: 'l1b',
      successFeedback: 'That is the cumbia engine room.',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 96,
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 40, onset: 0, duration: 460 }, // E2
        { midi: 43, onset: 480, duration: 110 }, // G2
        { midi: 47, onset: 720, duration: 110 }, // B2
        { midi: 40, onset: 960, duration: 460 }, // E2
        { midi: 43, onset: 1440, duration: 110 }, // G2
        { midi: 47, onset: 1680, duration: 110 }, // B2
        { midi: 45, onset: 1920, duration: 460 }, // A2
        { midi: 48, onset: 2400, duration: 110 }, // C3
        { midi: 52, onset: 2640, duration: 110 }, // E3
        { midi: 45, onset: 2880, duration: 460 }, // A2
        { midi: 48, onset: 3360, duration: 110 }, // C3
        { midi: 52, onset: 3600, duration: 110 }, // E3
        { midi: 47, onset: 3840, duration: 460 }, // B2
        { midi: 51, onset: 4320, duration: 110 }, // D♯3
        { midi: 54, onset: 4560, duration: 110 }, // F♯3
        { midi: 47, onset: 4800, duration: 460 }, // B2
        { midi: 51, onset: 5280, duration: 110 }, // D♯3
        { midi: 54, onset: 5520, duration: 110 }, // F♯3
        { midi: 40, onset: 5760, duration: 460 }, // E2
        { midi: 43, onset: 6240, duration: 110 }, // G2
        { midi: 47, onset: 6480, duration: 110 }, // B2
        { midi: 40, onset: 6720, duration: 460 }, // E2
        { midi: 43, onset: 7200, duration: 110 }, // G2
        { midi: 47, onset: 7440, duration: 110 }, // B2
      ],
    },
    {
      stepNumber: 35,
      module: 'latin_l1',
      section: 'C',
      subsection: 'C3: Mariachi Bass',
      activity: 'C3.1: Mariachi Bass, One Chord',
      direction:
        'In 3/4: G on beat 1, then the D below on beat 1 of the next bar — root, then 5, like the guitarrón.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l1_bass_mariachi_one | latin',
      styleRef: 'l1c',
      successFeedback: 'Root, then 5 — the guitarrón walk.',
      key: 'G major',
      chordSymbols: ['G'],
      timeSignature: [3, 4],
      tempo: 126,
      targetNotes: [
        { midi: 43, onset: 0, duration: 940 }, // G2
        { midi: 38, onset: 1440, duration: 940 }, // D2
      ],
    },
    {
      stepNumber: 36,
      module: 'latin_l1',
      section: 'C',
      subsection: 'C3: Mariachi Bass',
      activity: 'C3.2: Mariachi Bass — the Progression',
      direction: 'Two bars a chord, root then the 5 below: G – C – D7 – G.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l1_bass_mariachi_prog | latin',
      styleRef: 'l1c',
      successFeedback: 'Root and 5 under every chord.',
      key: 'G major',
      chordSymbols: ['G', 'G', 'C', 'C', 'D7', 'D7', 'G', 'G'],
      timeSignature: [3, 4],
      tempo: 126,
      targetNotes: [
        { midi: 43, onset: 0, duration: 940 }, // G2
        { midi: 38, onset: 1440, duration: 940 }, // D2
        { midi: 48, onset: 2880, duration: 940 }, // C3
        { midi: 43, onset: 4320, duration: 940 }, // G2
        { midi: 50, onset: 5760, duration: 940 }, // D3
        { midi: 45, onset: 7200, duration: 940 }, // A2
        { midi: 43, onset: 8640, duration: 940 }, // G2
        { midi: 38, onset: 10080, duration: 940 }, // D2
      ],
    },
    {
      stepNumber: 37,
      module: 'latin_l1',
      section: 'C',
      subsection: 'C3: Mariachi Bass',
      activity: 'C3.3: Bass Play-Along — Mariachi Vals',
      direction: 'The guitarrón line over the vals.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l1_bass_mariachi_play | latin',
      styleRef: 'l1c',
      successFeedback: 'The bottom of the mariachi.',
      key: 'G major',
      chordSymbols: ['G', 'G', 'C', 'C', 'D7', 'D7', 'G', 'G'],
      timeSignature: [3, 4],
      tempo: 126,
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 43, onset: 0, duration: 940 }, // G2
        { midi: 38, onset: 1440, duration: 940 }, // D2
        { midi: 48, onset: 2880, duration: 940 }, // C3
        { midi: 43, onset: 4320, duration: 940 }, // G2
        { midi: 50, onset: 5760, duration: 940 }, // D3
        { midi: 45, onset: 7200, duration: 940 }, // A2
        { midi: 43, onset: 8640, duration: 940 }, // G2
        { midi: 38, onset: 10080, duration: 940 }, // D2
      ],
    },
  ],
};

const latinL1SectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 38,
      module: 'latin_l1',
      section: 'D',
      subsection: 'D1: Reggaeton Performance',
      activity: 'D1.1: Reggaeton — LH Bass + RH Chords (Out of Time)',
      direction:
        'Left hand plays the roots, right hand the voice-led loop: Em – C – G – D.',
      assessment: 'pitch_order',
      tag: 'latin:l1_perf_reggaeton_oot | latin',
      styleRef: 'l1a',
      successFeedback: 'Both hands, one loop.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1a',
      },
      chordSymbols: ['Em', 'C', 'G', 'D'],
      targetNotes: [
        { midi: 52, onset: 0, duration: 1800, hand: 'lh' }, // E3
        { midi: 48, onset: 1920, duration: 1800, hand: 'lh' }, // C3
        { midi: 43, onset: 3840, duration: 1800, hand: 'lh' }, // G2
        { midi: 50, onset: 5760, duration: 1800, hand: 'lh' }, // D3
        { midi: 64, onset: 0, duration: 1800, hand: 'rh' }, // E4
        { midi: 67, onset: 0, duration: 1800, hand: 'rh' }, // G4
        { midi: 71, onset: 0, duration: 1800, hand: 'rh' }, // B4
        { midi: 64, onset: 1920, duration: 1800, hand: 'rh' }, // E4
        { midi: 67, onset: 1920, duration: 1800, hand: 'rh' }, // G4
        { midi: 72, onset: 1920, duration: 1800, hand: 'rh' }, // C5
        { midi: 62, onset: 3840, duration: 1800, hand: 'rh' }, // D4
        { midi: 67, onset: 3840, duration: 1800, hand: 'rh' }, // G4
        { midi: 71, onset: 3840, duration: 1800, hand: 'rh' }, // B4
        { midi: 62, onset: 5760, duration: 1800, hand: 'rh' }, // D4
        { midi: 66, onset: 5760, duration: 1800, hand: 'rh' }, // F♯4
        { midi: 69, onset: 5760, duration: 1800, hand: 'rh' }, // A4
      ],
    },
    {
      stepNumber: 39,
      module: 'latin_l1',
      section: 'D',
      subsection: 'D1: Reggaeton Performance',
      activity: 'D1.2: Reggaeton — Full Groove (Play-Along)',
      direction:
        'Both hands on the tresillo — roots in the left, the loop in the right.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l1_perf_reggaeton_play | latin',
      styleRef: 'l1a',
      successFeedback: 'The full reggaeton groove, two hands.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1a',
      },
      chordSymbols: ['Em', 'C', 'G', 'D'],
      tempo: 92,
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 52, onset: 0, duration: 680, hand: 'lh' }, // E3
        { midi: 52, onset: 720, duration: 680, hand: 'lh' }, // E3
        { midi: 52, onset: 1440, duration: 440, hand: 'lh' }, // E3
        { midi: 48, onset: 1920, duration: 680, hand: 'lh' }, // C3
        { midi: 48, onset: 2640, duration: 680, hand: 'lh' }, // C3
        { midi: 48, onset: 3360, duration: 440, hand: 'lh' }, // C3
        { midi: 43, onset: 3840, duration: 680, hand: 'lh' }, // G2
        { midi: 43, onset: 4560, duration: 680, hand: 'lh' }, // G2
        { midi: 43, onset: 5280, duration: 440, hand: 'lh' }, // G2
        { midi: 50, onset: 5760, duration: 680, hand: 'lh' }, // D3
        { midi: 50, onset: 6480, duration: 680, hand: 'lh' }, // D3
        { midi: 50, onset: 7200, duration: 440, hand: 'lh' }, // D3
        { midi: 64, onset: 0, duration: 600, hand: 'rh' }, // E4
        { midi: 67, onset: 0, duration: 600, hand: 'rh' }, // G4
        { midi: 71, onset: 0, duration: 600, hand: 'rh' }, // B4
        { midi: 64, onset: 720, duration: 600, hand: 'rh' }, // E4
        { midi: 67, onset: 720, duration: 600, hand: 'rh' }, // G4
        { midi: 71, onset: 720, duration: 600, hand: 'rh' }, // B4
        { midi: 64, onset: 1440, duration: 400, hand: 'rh' }, // E4
        { midi: 67, onset: 1440, duration: 400, hand: 'rh' }, // G4
        { midi: 71, onset: 1440, duration: 400, hand: 'rh' }, // B4
        { midi: 64, onset: 1920, duration: 600, hand: 'rh' }, // E4
        { midi: 67, onset: 1920, duration: 600, hand: 'rh' }, // G4
        { midi: 72, onset: 1920, duration: 600, hand: 'rh' }, // C5
        { midi: 64, onset: 2640, duration: 600, hand: 'rh' }, // E4
        { midi: 67, onset: 2640, duration: 600, hand: 'rh' }, // G4
        { midi: 72, onset: 2640, duration: 600, hand: 'rh' }, // C5
        { midi: 64, onset: 3360, duration: 400, hand: 'rh' }, // E4
        { midi: 67, onset: 3360, duration: 400, hand: 'rh' }, // G4
        { midi: 72, onset: 3360, duration: 400, hand: 'rh' }, // C5
        { midi: 62, onset: 3840, duration: 600, hand: 'rh' }, // D4
        { midi: 67, onset: 3840, duration: 600, hand: 'rh' }, // G4
        { midi: 71, onset: 3840, duration: 600, hand: 'rh' }, // B4
        { midi: 62, onset: 4560, duration: 600, hand: 'rh' }, // D4
        { midi: 67, onset: 4560, duration: 600, hand: 'rh' }, // G4
        { midi: 71, onset: 4560, duration: 600, hand: 'rh' }, // B4
        { midi: 62, onset: 5280, duration: 400, hand: 'rh' }, // D4
        { midi: 67, onset: 5280, duration: 400, hand: 'rh' }, // G4
        { midi: 71, onset: 5280, duration: 400, hand: 'rh' }, // B4
        { midi: 62, onset: 5760, duration: 600, hand: 'rh' }, // D4
        { midi: 66, onset: 5760, duration: 600, hand: 'rh' }, // F♯4
        { midi: 69, onset: 5760, duration: 600, hand: 'rh' }, // A4
        { midi: 62, onset: 6480, duration: 600, hand: 'rh' }, // D4
        { midi: 66, onset: 6480, duration: 600, hand: 'rh' }, // F♯4
        { midi: 69, onset: 6480, duration: 600, hand: 'rh' }, // A4
        { midi: 62, onset: 7200, duration: 400, hand: 'rh' }, // D4
        { midi: 66, onset: 7200, duration: 400, hand: 'rh' }, // F♯4
        { midi: 69, onset: 7200, duration: 400, hand: 'rh' }, // A4
      ],
    },
    {
      stepNumber: 40,
      module: 'latin_l1',
      section: 'D',
      subsection: 'D2: Cumbia Performance',
      activity: 'D2.1: Cumbia — LH Bass + RH Chords (Out of Time)',
      direction: 'Left hand root then 5, right hand the voice-led progression.',
      assessment: 'pitch_order',
      tag: 'latin:l1_perf_cumbia_oot | latin',
      styleRef: 'l1b',
      successFeedback: 'Root and 5 under the chords.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1b',
      },
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      targetNotes: [
        { midi: 52, onset: 0, duration: 900, hand: 'lh' }, // E3
        { midi: 47, onset: 960, duration: 900, hand: 'lh' }, // B2
        { midi: 45, onset: 1920, duration: 900, hand: 'lh' }, // A2
        { midi: 52, onset: 2880, duration: 900, hand: 'lh' }, // E3
        { midi: 47, onset: 3840, duration: 900, hand: 'lh' }, // B2
        { midi: 54, onset: 4800, duration: 900, hand: 'lh' }, // F♯3
        { midi: 52, onset: 5760, duration: 900, hand: 'lh' }, // E3
        { midi: 47, onset: 6720, duration: 900, hand: 'lh' }, // B2
        { midi: 64, onset: 0, duration: 1800, hand: 'rh' }, // E4
        { midi: 67, onset: 0, duration: 1800, hand: 'rh' }, // G4
        { midi: 71, onset: 0, duration: 1800, hand: 'rh' }, // B4
        { midi: 64, onset: 1920, duration: 1800, hand: 'rh' }, // E4
        { midi: 69, onset: 1920, duration: 1800, hand: 'rh' }, // A4
        { midi: 72, onset: 1920, duration: 1800, hand: 'rh' }, // C5
        { midi: 63, onset: 3840, duration: 1800, hand: 'rh' }, // D♯4
        { midi: 66, onset: 3840, duration: 1800, hand: 'rh' }, // F♯4
        { midi: 69, onset: 3840, duration: 1800, hand: 'rh' }, // A4
        { midi: 71, onset: 3840, duration: 1800, hand: 'rh' }, // B4
        { midi: 64, onset: 5760, duration: 1800, hand: 'rh' }, // E4
        { midi: 67, onset: 5760, duration: 1800, hand: 'rh' }, // G4
        { midi: 71, onset: 5760, duration: 1800, hand: 'rh' }, // B4
      ],
    },
    {
      stepNumber: 41,
      module: 'latin_l1',
      section: 'D',
      subsection: 'D2: Cumbia Performance',
      activity: 'D2.2: Cumbia — Full Groove (Play-Along)',
      direction: 'Left hand on 1 and 3 (root, 5); right hand on every "and".',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l1_perf_cumbia_play | latin',
      styleRef: 'l1b',
      successFeedback: 'On the beat and off it — both hands at once.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1b',
      },
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 96,
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 52, onset: 0, duration: 900, hand: 'lh' }, // E3
        { midi: 47, onset: 960, duration: 900, hand: 'lh' }, // B2
        { midi: 45, onset: 1920, duration: 900, hand: 'lh' }, // A2
        { midi: 52, onset: 2880, duration: 900, hand: 'lh' }, // E3
        { midi: 47, onset: 3840, duration: 900, hand: 'lh' }, // B2
        { midi: 54, onset: 4800, duration: 900, hand: 'lh' }, // F♯3
        { midi: 52, onset: 5760, duration: 900, hand: 'lh' }, // E3
        { midi: 47, onset: 6720, duration: 900, hand: 'lh' }, // B2
        { midi: 64, onset: 240, duration: 200, hand: 'rh' }, // E4
        { midi: 67, onset: 240, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 240, duration: 200, hand: 'rh' }, // B4
        { midi: 64, onset: 720, duration: 200, hand: 'rh' }, // E4
        { midi: 67, onset: 720, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 720, duration: 200, hand: 'rh' }, // B4
        { midi: 64, onset: 1200, duration: 200, hand: 'rh' }, // E4
        { midi: 67, onset: 1200, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 1200, duration: 200, hand: 'rh' }, // B4
        { midi: 64, onset: 1680, duration: 200, hand: 'rh' }, // E4
        { midi: 67, onset: 1680, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 1680, duration: 200, hand: 'rh' }, // B4
        { midi: 64, onset: 2160, duration: 200, hand: 'rh' }, // E4
        { midi: 69, onset: 2160, duration: 200, hand: 'rh' }, // A4
        { midi: 72, onset: 2160, duration: 200, hand: 'rh' }, // C5
        { midi: 64, onset: 2640, duration: 200, hand: 'rh' }, // E4
        { midi: 69, onset: 2640, duration: 200, hand: 'rh' }, // A4
        { midi: 72, onset: 2640, duration: 200, hand: 'rh' }, // C5
        { midi: 64, onset: 3120, duration: 200, hand: 'rh' }, // E4
        { midi: 69, onset: 3120, duration: 200, hand: 'rh' }, // A4
        { midi: 72, onset: 3120, duration: 200, hand: 'rh' }, // C5
        { midi: 64, onset: 3600, duration: 200, hand: 'rh' }, // E4
        { midi: 69, onset: 3600, duration: 200, hand: 'rh' }, // A4
        { midi: 72, onset: 3600, duration: 200, hand: 'rh' }, // C5
        { midi: 63, onset: 4080, duration: 200, hand: 'rh' }, // D♯4
        { midi: 66, onset: 4080, duration: 200, hand: 'rh' }, // F♯4
        { midi: 69, onset: 4080, duration: 200, hand: 'rh' }, // A4
        { midi: 71, onset: 4080, duration: 200, hand: 'rh' }, // B4
        { midi: 63, onset: 4560, duration: 200, hand: 'rh' }, // D♯4
        { midi: 66, onset: 4560, duration: 200, hand: 'rh' }, // F♯4
        { midi: 69, onset: 4560, duration: 200, hand: 'rh' }, // A4
        { midi: 71, onset: 4560, duration: 200, hand: 'rh' }, // B4
        { midi: 63, onset: 5040, duration: 200, hand: 'rh' }, // D♯4
        { midi: 66, onset: 5040, duration: 200, hand: 'rh' }, // F♯4
        { midi: 69, onset: 5040, duration: 200, hand: 'rh' }, // A4
        { midi: 71, onset: 5040, duration: 200, hand: 'rh' }, // B4
        { midi: 63, onset: 5520, duration: 200, hand: 'rh' }, // D♯4
        { midi: 66, onset: 5520, duration: 200, hand: 'rh' }, // F♯4
        { midi: 69, onset: 5520, duration: 200, hand: 'rh' }, // A4
        { midi: 71, onset: 5520, duration: 200, hand: 'rh' }, // B4
        { midi: 64, onset: 6000, duration: 200, hand: 'rh' }, // E4
        { midi: 67, onset: 6000, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 6000, duration: 200, hand: 'rh' }, // B4
        { midi: 64, onset: 6480, duration: 200, hand: 'rh' }, // E4
        { midi: 67, onset: 6480, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 6480, duration: 200, hand: 'rh' }, // B4
        { midi: 64, onset: 6960, duration: 200, hand: 'rh' }, // E4
        { midi: 67, onset: 6960, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 6960, duration: 200, hand: 'rh' }, // B4
        { midi: 64, onset: 7440, duration: 200, hand: 'rh' }, // E4
        { midi: 67, onset: 7440, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 7440, duration: 200, hand: 'rh' }, // B4
      ],
    },
    {
      stepNumber: 42,
      module: 'latin_l1',
      section: 'D',
      subsection: 'D3: Mariachi Performance',
      activity: 'D3.1: Mariachi — Bass, Chord, Chord (LH Alone)',
      direction:
        'Left hand alone, in 3/4: G on beat 1, then B-D-G on beats 2 and 3. Next bar, D on 1.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l1_perf_mariachi_lh | latin',
      styleRef: 'l1c',
      successFeedback: 'Oom-pah-pah — the whole vals in one hand.',
      key: 'G major',
      chordSymbols: ['G'],
      timeSignature: [3, 4],
      tempo: 120,
      targetNotes: [
        { midi: 43, onset: 0, duration: 440 }, // G2
        { midi: 47, onset: 480, duration: 400 }, // B2
        { midi: 50, onset: 480, duration: 400 }, // D3
        { midi: 55, onset: 480, duration: 400 }, // G3
        { midi: 47, onset: 960, duration: 400 }, // B2
        { midi: 50, onset: 960, duration: 400 }, // D3
        { midi: 55, onset: 960, duration: 400 }, // G3
        { midi: 38, onset: 1440, duration: 440 }, // D2
        { midi: 47, onset: 1920, duration: 400 }, // B2
        { midi: 50, onset: 1920, duration: 400 }, // D3
        { midi: 55, onset: 1920, duration: 400 }, // G3
        { midi: 47, onset: 2400, duration: 400 }, // B2
        { midi: 50, onset: 2400, duration: 400 }, // D3
        { midi: 55, onset: 2400, duration: 400 }, // G3
      ],
    },
    {
      stepNumber: 43,
      module: 'latin_l1',
      section: 'D',
      subsection: 'D3: Mariachi Performance',
      activity: 'D3.2: Mariachi — LH Vals Through the Progression',
      direction: 'Bass, chord, chord on every bar: G – C – D7 – G.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l1_perf_mariachi_lh_prog | latin',
      styleRef: 'l1c',
      successFeedback: 'The vals, all the way round.',
      key: 'G major',
      chordSymbols: ['G', 'C', 'D7', 'G'],
      timeSignature: [3, 4],
      tempo: 120,
      targetNotes: [
        { midi: 43, onset: 0, duration: 440 }, // G2
        { midi: 47, onset: 480, duration: 400 }, // B2
        { midi: 50, onset: 480, duration: 400 }, // D3
        { midi: 55, onset: 480, duration: 400 }, // G3
        { midi: 47, onset: 960, duration: 400 }, // B2
        { midi: 50, onset: 960, duration: 400 }, // D3
        { midi: 55, onset: 960, duration: 400 }, // G3
        { midi: 48, onset: 1440, duration: 440 }, // C3
        { midi: 48, onset: 1920, duration: 400 }, // C3
        { midi: 52, onset: 1920, duration: 400 }, // E3
        { midi: 55, onset: 1920, duration: 400 }, // G3
        { midi: 48, onset: 2400, duration: 400 }, // C3
        { midi: 52, onset: 2400, duration: 400 }, // E3
        { midi: 55, onset: 2400, duration: 400 }, // G3
        { midi: 50, onset: 2880, duration: 440 }, // D3
        { midi: 54, onset: 3360, duration: 400 }, // F♯3
        { midi: 57, onset: 3360, duration: 400 }, // A3
        { midi: 60, onset: 3360, duration: 400 }, // C4
        { midi: 54, onset: 3840, duration: 400 }, // F♯3
        { midi: 57, onset: 3840, duration: 400 }, // A3
        { midi: 60, onset: 3840, duration: 400 }, // C4
        { midi: 43, onset: 4320, duration: 440 }, // G2
        { midi: 47, onset: 4800, duration: 400 }, // B2
        { midi: 50, onset: 4800, duration: 400 }, // D3
        { midi: 55, onset: 4800, duration: 400 }, // G3
        { midi: 47, onset: 5280, duration: 400 }, // B2
        { midi: 50, onset: 5280, duration: 400 }, // D3
        { midi: 55, onset: 5280, duration: 400 }, // G3
      ],
    },
    {
      stepNumber: 44,
      module: 'latin_l1',
      section: 'D',
      subsection: 'D3: Mariachi Performance',
      activity: 'D3.3: Mariachi — LH Vals + RH Melody (Play-Along)',
      direction:
        'Left hand keeps the vals; right hand plays the melody from A6.2.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l1_perf_mariachi_play | latin',
      styleRef: 'l1c',
      successFeedback: 'A whole mariachi band in two hands.',
      key: 'G major',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_chords_rh_melody',
        lh_role: 'chords',
        rh_role: 'melody',
        style_ref: 'l1c',
      },
      chordSymbols: ['G', 'C', 'G', 'D7'],
      timeSignature: [3, 4],
      tempo: 126,
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['chords', 'melody'],
      },
      targetNotes: [
        { midi: 43, onset: 0, duration: 440, hand: 'lh' }, // G2
        { midi: 47, onset: 480, duration: 400, hand: 'lh' }, // B2
        { midi: 50, onset: 480, duration: 400, hand: 'lh' }, // D3
        { midi: 55, onset: 480, duration: 400, hand: 'lh' }, // G3
        { midi: 47, onset: 960, duration: 400, hand: 'lh' }, // B2
        { midi: 50, onset: 960, duration: 400, hand: 'lh' }, // D3
        { midi: 55, onset: 960, duration: 400, hand: 'lh' }, // G3
        { midi: 48, onset: 1440, duration: 440, hand: 'lh' }, // C3
        { midi: 48, onset: 1920, duration: 400, hand: 'lh' }, // C3
        { midi: 52, onset: 1920, duration: 400, hand: 'lh' }, // E3
        { midi: 55, onset: 1920, duration: 400, hand: 'lh' }, // G3
        { midi: 48, onset: 2400, duration: 400, hand: 'lh' }, // C3
        { midi: 52, onset: 2400, duration: 400, hand: 'lh' }, // E3
        { midi: 55, onset: 2400, duration: 400, hand: 'lh' }, // G3
        { midi: 43, onset: 2880, duration: 440, hand: 'lh' }, // G2
        { midi: 47, onset: 3360, duration: 400, hand: 'lh' }, // B2
        { midi: 50, onset: 3360, duration: 400, hand: 'lh' }, // D3
        { midi: 55, onset: 3360, duration: 400, hand: 'lh' }, // G3
        { midi: 47, onset: 3840, duration: 400, hand: 'lh' }, // B2
        { midi: 50, onset: 3840, duration: 400, hand: 'lh' }, // D3
        { midi: 55, onset: 3840, duration: 400, hand: 'lh' }, // G3
        { midi: 50, onset: 4320, duration: 440, hand: 'lh' }, // D3
        { midi: 54, onset: 4800, duration: 400, hand: 'lh' }, // F♯3
        { midi: 57, onset: 4800, duration: 400, hand: 'lh' }, // A3
        { midi: 60, onset: 4800, duration: 400, hand: 'lh' }, // C4
        { midi: 54, onset: 5280, duration: 400, hand: 'lh' }, // F♯3
        { midi: 57, onset: 5280, duration: 400, hand: 'lh' }, // A3
        { midi: 60, onset: 5280, duration: 400, hand: 'lh' }, // C4
        { midi: 71, onset: 0, duration: 460, hand: 'rh' }, // B4
        { midi: 72, onset: 480, duration: 460, hand: 'rh' }, // C5
        { midi: 74, onset: 960, duration: 460, hand: 'rh' }, // D5
        { midi: 76, onset: 1440, duration: 940, hand: 'rh' }, // E5
        { midi: 74, onset: 2400, duration: 460, hand: 'rh' }, // D5
        { midi: 71, onset: 2880, duration: 1380, hand: 'rh' }, // B4
        { midi: 69, onset: 4320, duration: 1380, hand: 'rh' }, // A4
      ],
    },
  ],
};

// ── L2: Merengue, Bachata, Cha-cha-chá & Bolero ──

const latinL2SectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    {
      stepNumber: 1,
      module: 'latin_l2',
      section: 'A',
      subsection: 'A1: Scale (E Natural Minor)',
      activity: 'A1.1: E Natural Minor Ascending (Out of Time)',
      direction:
        'Play the E Natural Minor scale up: E–F♯–G–A–B–C–D–E. The notes of G major, starting on E.',
      assessment: 'pitch_order',
      tag: 'latin:l2_nat_minor_asc_oot | latin',
      styleRef: 'l2a',
      successFeedback: 'Seven notes — the whole minor scale, with D natural.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
      scaleId: 'aeolian',
      targetNotes: [
        { midi: 64, onset: 0, duration: 460 }, // E4
        { midi: 66, onset: 480, duration: 460 }, // F♯4
        { midi: 67, onset: 960, duration: 460 }, // G4
        { midi: 69, onset: 1440, duration: 460 }, // A4
        { midi: 71, onset: 1920, duration: 460 }, // B4
        { midi: 72, onset: 2400, duration: 460 }, // C5
        { midi: 74, onset: 2880, duration: 460 }, // D5
        { midi: 76, onset: 3360, duration: 460 }, // E5
      ],
    },
    {
      stepNumber: 2,
      module: 'latin_l2',
      section: 'A',
      subsection: 'A1: Scale (E Natural Minor)',
      activity: 'A1.2: E Natural Minor Descending (Out of Time)',
      direction: 'Now back down from the top E.',
      assessment: 'pitch_order',
      tag: 'latin:l2_nat_minor_desc_oot | latin',
      styleRef: 'l2a',
      successFeedback: 'Down through D and C — the minor sound.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
      scaleId: 'aeolian',
      targetNotes: [
        { midi: 76, onset: 0, duration: 460 }, // E5
        { midi: 74, onset: 480, duration: 460 }, // D5
        { midi: 72, onset: 960, duration: 460 }, // C5
        { midi: 71, onset: 1440, duration: 460 }, // B4
        { midi: 69, onset: 1920, duration: 460 }, // A4
        { midi: 67, onset: 2400, duration: 460 }, // G4
        { midi: 66, onset: 2880, duration: 460 }, // F♯4
        { midi: 64, onset: 3360, duration: 460 }, // E4
      ],
    },
    {
      stepNumber: 3,
      module: 'latin_l2',
      section: 'A',
      subsection: 'A1: Scale (E Natural Minor)',
      activity: 'A1.3: E Natural Minor — Up & Down in Eighths (In Time)',
      direction:
        'Up and back down, two notes per beat. Merengue never stops moving.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l2_nat_minor_updown_it | latin',
      styleRef: 'l2a',
      successFeedback: 'Eighth notes, in time — ready for merengue.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
      scaleId: 'aeolian',
      tempo: 90,
      targetNotes: [
        { midi: 64, onset: 0, duration: 220 }, // E4
        { midi: 66, onset: 240, duration: 220 }, // F♯4
        { midi: 67, onset: 480, duration: 220 }, // G4
        { midi: 69, onset: 720, duration: 220 }, // A4
        { midi: 71, onset: 960, duration: 220 }, // B4
        { midi: 72, onset: 1200, duration: 220 }, // C5
        { midi: 74, onset: 1440, duration: 220 }, // D5
        { midi: 76, onset: 1680, duration: 220 }, // E5
        { midi: 74, onset: 1920, duration: 220 }, // D5
        { midi: 72, onset: 2160, duration: 220 }, // C5
        { midi: 71, onset: 2400, duration: 220 }, // B4
        { midi: 69, onset: 2640, duration: 220 }, // A4
        { midi: 67, onset: 2880, duration: 220 }, // G4
        { midi: 66, onset: 3120, duration: 220 }, // F♯4
        { midi: 64, onset: 3360, duration: 220 }, // E4
      ],
    },
    {
      stepNumber: 4,
      module: 'latin_l2',
      section: 'A',
      subsection: 'A2: Merengue Melodies',
      activity: 'A2.1: 4-Note Merengue Riff',
      direction:
        'E, D, E — the second E on the "and" of 2 — then down to B on beat 4. Hold it.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l2_merengue_melody_4note | latin',
      styleRef: 'l2a',
      successFeedback:
        'Short, short, then a push on the "and" — a merengue riff.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
      scaleId: 'aeolian',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 120,
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 76, onset: 0, duration: 220 }, // E5
        { midi: 74, onset: 240, duration: 220 }, // D5
        { midi: 76, onset: 720, duration: 700 }, // E5
        { midi: 71, onset: 1440, duration: 1380 }, // B4
      ],
    },
    {
      stepNumber: 5,
      module: 'latin_l2',
      section: 'A',
      subsection: 'A2: Merengue Melodies',
      activity: 'A2.2: 13-Note Merengue Melody',
      direction:
        'The riff on every chord — E minor, A minor, B7, where D becomes D♯ — then home to E.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l2_merengue_melody_13note | latin',
      styleRef: 'l2a',
      successFeedback: 'Same rhythm, new notes each bar: call and answer.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
      scaleId: 'aeolian',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 120,
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 76, onset: 0, duration: 220 }, // E5
        { midi: 74, onset: 240, duration: 220 }, // D5
        { midi: 76, onset: 720, duration: 700 }, // E5
        { midi: 71, onset: 1440, duration: 460 }, // B4
        { midi: 72, onset: 1920, duration: 220 }, // C5
        { midi: 71, onset: 2160, duration: 220 }, // B4
        { midi: 72, onset: 2640, duration: 700 }, // C5
        { midi: 69, onset: 3360, duration: 460 }, // A4
        { midi: 78, onset: 3840, duration: 220 }, // F♯5
        { midi: 76, onset: 4080, duration: 220 }, // E5
        { midi: 75, onset: 4560, duration: 700 }, // D♯5
        { midi: 71, onset: 5280, duration: 460 }, // B4
        { midi: 76, onset: 5760, duration: 1860 }, // E5
      ],
    },
    {
      stepNumber: 6,
      module: 'latin_l2',
      section: 'A',
      subsection: 'A3: Bachata Melodies',
      activity: 'A3.1: 4-Note Bachata Melody',
      direction:
        'E, D, E on beats 1, 2 and 3. Leave beat 4 empty — the bachata tap — then C on the next 1.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l2_bachata_melody_4note | latin',
      styleRef: 'l2b',
      successFeedback: 'Three steps and a tap: that is bachata.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
      scaleId: 'aeolian',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 148,
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 76, onset: 0, duration: 460 }, // E5
        { midi: 74, onset: 480, duration: 460 }, // D5
        { midi: 76, onset: 960, duration: 460 }, // E5
        { midi: 72, onset: 1920, duration: 1380 }, // C5
      ],
    },
    {
      stepNumber: 7,
      module: 'latin_l2',
      section: 'A',
      subsection: 'A3: Bachata Melodies',
      activity: 'A3.2: 6-Note Bachata Melody',
      direction:
        'This time C comes early, on the "and" of 4, and holds over the bar line. Then B and A.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l2_bachata_melody_6note | latin',
      styleRef: 'l2b',
      successFeedback: 'An anticipation — the note arrives before its chord.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
      scaleId: 'aeolian',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 148,
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 76, onset: 0, duration: 460 }, // E5
        { midi: 74, onset: 480, duration: 460 }, // D5
        { midi: 76, onset: 960, duration: 460 }, // E5
        { midi: 72, onset: 1680, duration: 700 }, // C5
        { midi: 71, onset: 2400, duration: 460 }, // B4
        { midi: 69, onset: 2880, duration: 940 }, // A4
      ],
    },
    {
      stepNumber: 8,
      module: 'latin_l2',
      section: 'A',
      subsection: 'A3: Bachata Melodies',
      activity: 'A3.3: 11-Note Bachata Melody',
      direction:
        'Every bar ends early: C before A minor, B before B7, E before E minor — each on the "and" of 4.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l2_bachata_melody_11note | latin',
      styleRef: 'l2b',
      successFeedback: 'Four bars of bachata, always arriving a little early.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
      scaleId: 'aeolian',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 148,
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 76, onset: 0, duration: 460 }, // E5
        { midi: 74, onset: 480, duration: 460 }, // D5
        { midi: 76, onset: 960, duration: 460 }, // E5
        { midi: 72, onset: 1680, duration: 700 }, // C5
        { midi: 71, onset: 2400, duration: 460 }, // B4
        { midi: 69, onset: 2880, duration: 460 }, // A4
        { midi: 71, onset: 3600, duration: 700 }, // B4
        { midi: 69, onset: 4320, duration: 460 }, // A4
        { midi: 71, onset: 4800, duration: 460 }, // B4
        { midi: 75, onset: 5280, duration: 220 }, // D♯5
        { midi: 76, onset: 5520, duration: 2100 }, // E5
      ],
    },
    {
      stepNumber: 9,
      module: 'latin_l2',
      section: 'A',
      subsection: 'A4: Cha-Cha-Chá Melodies',
      activity: 'A4.1: 4-Note Cha-Cha-Chá',
      direction:
        'E on 1. Then "cha-cha-chá": D on 4, D on its "and", and C on the next 1.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l2_chacha_melody_4note | latin',
      styleRef: 'l2c',
      successFeedback: 'Cha-cha-chá — the dance is named after that rhythm.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
      scaleId: 'aeolian',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 130,
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 76, onset: 0, duration: 940 }, // E5
        { midi: 74, onset: 1440, duration: 220 }, // D5
        { midi: 74, onset: 1680, duration: 220 }, // D5
        { midi: 72, onset: 1920, duration: 940 }, // C5
      ],
    },
    {
      stepNumber: 10,
      module: 'latin_l2',
      section: 'A',
      subsection: 'A4: Cha-Cha-Chá Melodies',
      activity: 'A4.2: 10-Note Cha-Cha Melody',
      direction:
        'A cha-cha-chá into every chord: D-D into A minor, C-C into B7, D♯-D♯ home to E minor.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l2_chacha_melody_10note | latin',
      styleRef: 'l2c',
      successFeedback: 'Every bar lands on its chá.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
      scaleId: 'aeolian',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 130,
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 76, onset: 0, duration: 940 }, // E5
        { midi: 74, onset: 1440, duration: 220 }, // D5
        { midi: 74, onset: 1680, duration: 220 }, // D5
        { midi: 72, onset: 1920, duration: 940 }, // C5
        { midi: 72, onset: 3360, duration: 220 }, // C5
        { midi: 72, onset: 3600, duration: 220 }, // C5
        { midi: 71, onset: 3840, duration: 940 }, // B4
        { midi: 75, onset: 5280, duration: 220 }, // D♯5
        { midi: 75, onset: 5520, duration: 220 }, // D♯5
        { midi: 76, onset: 5760, duration: 1860 }, // E5
      ],
    },
    {
      stepNumber: 11,
      module: 'latin_l2',
      section: 'A',
      subsection: 'A5: Scale (E Melodic Minor)',
      activity: 'A5.1: E Melodic Minor Ascending (Out of Time)',
      direction:
        'E Melodic Minor, up: E–F♯–G–A–B–C♯–D♯–E. Two notes raised, C♯ and D♯, on the way to the top.',
      assessment: 'pitch_order',
      tag: 'latin:l2_mel_minor_asc_oot | latin',
      styleRef: 'l2d',
      successFeedback: 'C♯ and D♯ lift you into E.',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 11],
      scaleId: 'melodic_minor',
      targetNotes: [
        { midi: 64, onset: 0, duration: 460 }, // E4
        { midi: 66, onset: 480, duration: 460 }, // F♯4
        { midi: 67, onset: 960, duration: 460 }, // G4
        { midi: 69, onset: 1440, duration: 460 }, // A4
        { midi: 71, onset: 1920, duration: 460 }, // B4
        { midi: 73, onset: 2400, duration: 460 }, // C♯5
        { midi: 75, onset: 2880, duration: 460 }, // D♯5
        { midi: 76, onset: 3360, duration: 460 }, // E5
      ],
    },
    {
      stepNumber: 12,
      module: 'latin_l2',
      section: 'A',
      subsection: 'A5: Scale (E Melodic Minor)',
      activity: 'A5.2: E Melodic Minor Descending (Out of Time)',
      direction: 'Now down from the top, the same notes.',
      assessment: 'pitch_order',
      tag: 'latin:l2_mel_minor_desc_oot | latin',
      styleRef: 'l2d',
      successFeedback: 'Natural, harmonic, melodic — all three minor scales.',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 11],
      scaleId: 'melodic_minor',
      targetNotes: [
        { midi: 76, onset: 0, duration: 460 }, // E5
        { midi: 75, onset: 480, duration: 460 }, // D♯5
        { midi: 73, onset: 960, duration: 460 }, // C♯5
        { midi: 71, onset: 1440, duration: 460 }, // B4
        { midi: 69, onset: 1920, duration: 460 }, // A4
        { midi: 67, onset: 2400, duration: 460 }, // G4
        { midi: 66, onset: 2880, duration: 460 }, // F♯4
        { midi: 64, onset: 3360, duration: 460 }, // E4
      ],
    },
    {
      stepNumber: 13,
      module: 'latin_l2',
      section: 'A',
      subsection: 'A5: Scale (E Melodic Minor)',
      activity: 'A5.3: E Melodic Minor — Up & Down in Eighths (In Time)',
      direction: 'Up and back down, two notes per beat.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l2_mel_minor_updown_it | latin',
      styleRef: 'l2d',
      successFeedback: 'The melodic minor, in time.',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 11],
      scaleId: 'melodic_minor',
      tempo: 80,
      targetNotes: [
        { midi: 64, onset: 0, duration: 220 }, // E4
        { midi: 66, onset: 240, duration: 220 }, // F♯4
        { midi: 67, onset: 480, duration: 220 }, // G4
        { midi: 69, onset: 720, duration: 220 }, // A4
        { midi: 71, onset: 960, duration: 220 }, // B4
        { midi: 73, onset: 1200, duration: 220 }, // C♯5
        { midi: 75, onset: 1440, duration: 220 }, // D♯5
        { midi: 76, onset: 1680, duration: 220 }, // E5
        { midi: 75, onset: 1920, duration: 220 }, // D♯5
        { midi: 73, onset: 2160, duration: 220 }, // C♯5
        { midi: 71, onset: 2400, duration: 220 }, // B4
        { midi: 69, onset: 2640, duration: 220 }, // A4
        { midi: 67, onset: 2880, duration: 220 }, // G4
        { midi: 66, onset: 3120, duration: 220 }, // F♯4
        { midi: 64, onset: 3360, duration: 220 }, // E4
      ],
    },
    {
      stepNumber: 14,
      module: 'latin_l2',
      section: 'A',
      subsection: 'A6: Bolero Melodies',
      activity: 'A6.1: 4-Note Bolero Melody',
      direction:
        'B, then leap up a sixth to G and hold it. Step down to F♯, then E as the chord changes.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l2_bolero_melody_4note | latin',
      styleRef: 'l2d',
      successFeedback: 'The leap and the sigh — a bolero opening.',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 11],
      scaleId: 'melodic_minor',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 90,
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 71, onset: 0, duration: 460 }, // B4
        { midi: 79, onset: 480, duration: 940 }, // G5
        { midi: 78, onset: 1440, duration: 460 }, // F♯5
        { midi: 76, onset: 1920, duration: 1860 }, // E5
      ],
    },
    {
      stepNumber: 15,
      module: 'latin_l2',
      section: 'A',
      subsection: 'A6: Bolero Melodies',
      activity: 'A6.2: 10-Note Bolero Melody',
      direction:
        'Leap up to G, fall through A minor, then climb the melodic minor — B, C♯, D♯ — over B7 into E.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l2_bolero_melody_10note | latin',
      styleRef: 'l2d',
      successFeedback: 'That climb is what the melodic minor is for.',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 11],
      scaleId: 'melodic_minor',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 90,
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 71, onset: 0, duration: 460 }, // B4
        { midi: 79, onset: 480, duration: 940 }, // G5
        { midi: 78, onset: 1440, duration: 460 }, // F♯5
        { midi: 76, onset: 1920, duration: 940 }, // E5
        { midi: 72, onset: 2880, duration: 460 }, // C5
        { midi: 69, onset: 3360, duration: 460 }, // A4
        { midi: 71, onset: 3840, duration: 460 }, // B4
        { midi: 73, onset: 4320, duration: 460 }, // C♯5
        { midi: 75, onset: 4800, duration: 940 }, // D♯5
        { midi: 76, onset: 5760, duration: 1860 }, // E5
      ],
    },
  ],
};

const latinL2SectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    {
      stepNumber: 16,
      module: 'latin_l2',
      section: 'B',
      subsection: 'B1: Merengue Chords',
      activity: 'B1.1: Merengue RH Shapes (Out of Time)',
      direction:
        'Two shapes per chord: the top of the chord, then an octave with thumb and little finger. The octave stays on E — except under B7, where it drops to D♯.',
      assessment: 'pitch_order',
      tag: 'latin:l2_merengue_shapes | latin',
      styleRef: 'l2a',
      successFeedback: 'E, E, D♯, E — the octave leans and comes home.',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      targetNotes: [
        { midi: 67, onset: 0, duration: 900 }, // G4
        { midi: 71, onset: 0, duration: 900 }, // B4
        { midi: 64, onset: 960, duration: 900 }, // E4
        { midi: 76, onset: 960, duration: 900 }, // E5
        { midi: 69, onset: 1920, duration: 900 }, // A4
        { midi: 72, onset: 1920, duration: 900 }, // C5
        { midi: 64, onset: 2880, duration: 900 }, // E4
        { midi: 76, onset: 2880, duration: 900 }, // E5
        { midi: 69, onset: 3840, duration: 900 }, // A4
        { midi: 71, onset: 3840, duration: 900 }, // B4
        { midi: 63, onset: 4800, duration: 900 }, // D♯4
        { midi: 75, onset: 4800, duration: 900 }, // D♯5
        { midi: 67, onset: 5760, duration: 900 }, // G4
        { midi: 71, onset: 5760, duration: 900 }, // B4
        { midi: 64, onset: 6720, duration: 900 }, // E4
        { midi: 76, onset: 6720, duration: 900 }, // E5
      ],
    },
    {
      stepNumber: 17,
      module: 'latin_l2',
      section: 'B',
      subsection: 'B1: Merengue Chords',
      activity: 'B1.2: Play-Along — Merengue Piano',
      direction: 'Shape on 1 and 3, octave on 2 and 4 — short and bright.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l2_merengue_play | latin',
      styleRef: 'l2a',
      successFeedback: 'On every beat, never stopping — merengue.',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 120,
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 67, onset: 0, duration: 200 }, // G4
        { midi: 71, onset: 0, duration: 200 }, // B4
        { midi: 64, onset: 480, duration: 200 }, // E4
        { midi: 76, onset: 480, duration: 200 }, // E5
        { midi: 67, onset: 960, duration: 200 }, // G4
        { midi: 71, onset: 960, duration: 200 }, // B4
        { midi: 64, onset: 1440, duration: 200 }, // E4
        { midi: 76, onset: 1440, duration: 200 }, // E5
        { midi: 69, onset: 1920, duration: 200 }, // A4
        { midi: 72, onset: 1920, duration: 200 }, // C5
        { midi: 64, onset: 2400, duration: 200 }, // E4
        { midi: 76, onset: 2400, duration: 200 }, // E5
        { midi: 69, onset: 2880, duration: 200 }, // A4
        { midi: 72, onset: 2880, duration: 200 }, // C5
        { midi: 64, onset: 3360, duration: 200 }, // E4
        { midi: 76, onset: 3360, duration: 200 }, // E5
        { midi: 69, onset: 3840, duration: 200 }, // A4
        { midi: 71, onset: 3840, duration: 200 }, // B4
        { midi: 63, onset: 4320, duration: 200 }, // D♯4
        { midi: 75, onset: 4320, duration: 200 }, // D♯5
        { midi: 69, onset: 4800, duration: 200 }, // A4
        { midi: 71, onset: 4800, duration: 200 }, // B4
        { midi: 63, onset: 5280, duration: 200 }, // D♯4
        { midi: 75, onset: 5280, duration: 200 }, // D♯5
        { midi: 67, onset: 5760, duration: 200 }, // G4
        { midi: 71, onset: 5760, duration: 200 }, // B4
        { midi: 64, onset: 6240, duration: 200 }, // E4
        { midi: 76, onset: 6240, duration: 200 }, // E5
        { midi: 67, onset: 6720, duration: 200 }, // G4
        { midi: 71, onset: 6720, duration: 200 }, // B4
        { midi: 64, onset: 7200, duration: 200 }, // E4
        { midi: 76, onset: 7200, duration: 200 }, // E5
      ],
    },
    {
      stepNumber: 18,
      module: 'latin_l2',
      section: 'B',
      subsection: 'B2: Bachata Chords',
      activity: 'B2.1: Bachata Arpeggio Shapes (Out of Time)',
      direction:
        'Spell each chord up, one note at a time: G–B–E, A–C–E, F♯–B–D♯ for B7, then G–B–E.',
      assessment: 'pitch_order',
      tag: 'latin:l2_bachata_shapes | latin',
      styleRef: 'l2b',
      successFeedback:
        'Three notes per chord — the bachata picks them one by one.',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      targetNotes: [
        { midi: 67, onset: 0, duration: 460 }, // G4
        { midi: 71, onset: 480, duration: 460 }, // B4
        { midi: 76, onset: 960, duration: 460 }, // E5
        { midi: 69, onset: 1920, duration: 460 }, // A4
        { midi: 72, onset: 2400, duration: 460 }, // C5
        { midi: 76, onset: 2880, duration: 460 }, // E5
        { midi: 66, onset: 3840, duration: 460 }, // F♯4
        { midi: 71, onset: 4320, duration: 460 }, // B4
        { midi: 75, onset: 4800, duration: 460 }, // D♯5
        { midi: 67, onset: 5760, duration: 460 }, // G4
        { midi: 71, onset: 6240, duration: 460 }, // B4
        { midi: 76, onset: 6720, duration: 460 }, // E5
      ],
    },
    {
      stepNumber: 19,
      module: 'latin_l2',
      section: 'B',
      subsection: 'B2: Bachata Chords',
      activity: 'B2.2: Bachata Arpeggio, One Chord (In Time)',
      direction:
        'G–B–E over and over in eighths. Three notes into eight: start again on G at every bar line.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l2_bachata_roll_one | latin',
      styleRef: 'l2b',
      successFeedback:
        'The pattern rolls across the beat — and lands back on G.',
      chordSymbols: ['Em'],
      tempo: 120,
      targetNotes: [
        { midi: 67, onset: 0, duration: 220 }, // G4
        { midi: 71, onset: 240, duration: 220 }, // B4
        { midi: 76, onset: 480, duration: 220 }, // E5
        { midi: 67, onset: 720, duration: 220 }, // G4
        { midi: 71, onset: 960, duration: 220 }, // B4
        { midi: 76, onset: 1200, duration: 220 }, // E5
        { midi: 67, onset: 1440, duration: 220 }, // G4
        { midi: 71, onset: 1680, duration: 220 }, // B4
        { midi: 67, onset: 1920, duration: 220 }, // G4
        { midi: 71, onset: 2160, duration: 220 }, // B4
        { midi: 76, onset: 2400, duration: 220 }, // E5
        { midi: 67, onset: 2640, duration: 220 }, // G4
        { midi: 71, onset: 2880, duration: 220 }, // B4
        { midi: 76, onset: 3120, duration: 220 }, // E5
        { midi: 67, onset: 3360, duration: 220 }, // G4
        { midi: 71, onset: 3600, duration: 220 }, // B4
      ],
    },
    {
      stepNumber: 20,
      module: 'latin_l2',
      section: 'B',
      subsection: 'B2: Bachata Chords',
      activity: 'B2.3: Play-Along — Bachata Arpeggios',
      direction:
        'The same roll through the chords: G–B–E, A–C–E, F♯–B–D♯, G–B–E.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l2_bachata_play | latin',
      styleRef: 'l2b',
      successFeedback:
        "That is the band's bachata keyboard part, note for note.",
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 148,
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 67, onset: 0, duration: 220 }, // G4
        { midi: 71, onset: 240, duration: 220 }, // B4
        { midi: 76, onset: 480, duration: 220 }, // E5
        { midi: 67, onset: 720, duration: 220 }, // G4
        { midi: 71, onset: 960, duration: 220 }, // B4
        { midi: 76, onset: 1200, duration: 220 }, // E5
        { midi: 67, onset: 1440, duration: 220 }, // G4
        { midi: 71, onset: 1680, duration: 220 }, // B4
        { midi: 69, onset: 1920, duration: 220 }, // A4
        { midi: 72, onset: 2160, duration: 220 }, // C5
        { midi: 76, onset: 2400, duration: 220 }, // E5
        { midi: 69, onset: 2640, duration: 220 }, // A4
        { midi: 72, onset: 2880, duration: 220 }, // C5
        { midi: 76, onset: 3120, duration: 220 }, // E5
        { midi: 69, onset: 3360, duration: 220 }, // A4
        { midi: 72, onset: 3600, duration: 220 }, // C5
        { midi: 66, onset: 3840, duration: 220 }, // F♯4
        { midi: 71, onset: 4080, duration: 220 }, // B4
        { midi: 75, onset: 4320, duration: 220 }, // D♯5
        { midi: 66, onset: 4560, duration: 220 }, // F♯4
        { midi: 71, onset: 4800, duration: 220 }, // B4
        { midi: 75, onset: 5040, duration: 220 }, // D♯5
        { midi: 66, onset: 5280, duration: 220 }, // F♯4
        { midi: 71, onset: 5520, duration: 220 }, // B4
        { midi: 67, onset: 5760, duration: 220 }, // G4
        { midi: 71, onset: 6000, duration: 220 }, // B4
        { midi: 76, onset: 6240, duration: 220 }, // E5
        { midi: 67, onset: 6480, duration: 220 }, // G4
        { midi: 71, onset: 6720, duration: 220 }, // B4
        { midi: 76, onset: 6960, duration: 220 }, // E5
        { midi: 67, onset: 7200, duration: 220 }, // G4
        { midi: 71, onset: 7440, duration: 220 }, // B4
      ],
    },
    {
      stepNumber: 21,
      module: 'latin_l2',
      section: 'B',
      subsection: 'B3: Cha-Cha-Chá Chords',
      activity: 'B3.1: Cha-Cha Voicings, Voice-Led (Out of Time)',
      direction:
        'E–G–B, then C–E–A, D♯–F♯–B for B7, and back to E–G–B. Each note moves a step or less.',
      assessment: 'pitch_order',
      tag: 'latin:l2_chacha_voicings | latin',
      styleRef: 'l2c',
      successFeedback: 'Close voicings, smooth as the dance.',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      targetNotes: [
        { midi: 64, onset: 0, duration: 1800 }, // E4
        { midi: 67, onset: 0, duration: 1800 }, // G4
        { midi: 71, onset: 0, duration: 1800 }, // B4
        { midi: 60, onset: 1920, duration: 1800 }, // C4
        { midi: 64, onset: 1920, duration: 1800 }, // E4
        { midi: 69, onset: 1920, duration: 1800 }, // A4
        { midi: 63, onset: 3840, duration: 1800 }, // D♯4
        { midi: 66, onset: 3840, duration: 1800 }, // F♯4
        { midi: 71, onset: 3840, duration: 1800 }, // B4
        { midi: 64, onset: 5760, duration: 1800 }, // E4
        { midi: 67, onset: 5760, duration: 1800 }, // G4
        { midi: 71, onset: 5760, duration: 1800 }, // B4
      ],
    },
    {
      stepNumber: 22,
      module: 'latin_l2',
      section: 'B',
      subsection: 'B3: Cha-Cha-Chá Chords',
      activity: 'B3.2: Play-Along — Cha-Cha Comping',
      direction: 'On 1, off on the "and" of 2, on 3, off on the "and" of 4.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l2_chacha_play | latin',
      styleRef: 'l2c',
      successFeedback: 'On, off, on, off — the cha-cha piano.',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 130,
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 64, onset: 0, duration: 200 }, // E4
        { midi: 67, onset: 0, duration: 200 }, // G4
        { midi: 71, onset: 0, duration: 200 }, // B4
        { midi: 64, onset: 720, duration: 200 }, // E4
        { midi: 67, onset: 720, duration: 200 }, // G4
        { midi: 71, onset: 720, duration: 200 }, // B4
        { midi: 64, onset: 960, duration: 200 }, // E4
        { midi: 67, onset: 960, duration: 200 }, // G4
        { midi: 71, onset: 960, duration: 200 }, // B4
        { midi: 64, onset: 1680, duration: 200 }, // E4
        { midi: 67, onset: 1680, duration: 200 }, // G4
        { midi: 71, onset: 1680, duration: 200 }, // B4
        { midi: 60, onset: 1920, duration: 200 }, // C4
        { midi: 64, onset: 1920, duration: 200 }, // E4
        { midi: 69, onset: 1920, duration: 200 }, // A4
        { midi: 60, onset: 2640, duration: 200 }, // C4
        { midi: 64, onset: 2640, duration: 200 }, // E4
        { midi: 69, onset: 2640, duration: 200 }, // A4
        { midi: 60, onset: 2880, duration: 200 }, // C4
        { midi: 64, onset: 2880, duration: 200 }, // E4
        { midi: 69, onset: 2880, duration: 200 }, // A4
        { midi: 60, onset: 3600, duration: 200 }, // C4
        { midi: 64, onset: 3600, duration: 200 }, // E4
        { midi: 69, onset: 3600, duration: 200 }, // A4
        { midi: 63, onset: 3840, duration: 200 }, // D♯4
        { midi: 66, onset: 3840, duration: 200 }, // F♯4
        { midi: 71, onset: 3840, duration: 200 }, // B4
        { midi: 63, onset: 4560, duration: 200 }, // D♯4
        { midi: 66, onset: 4560, duration: 200 }, // F♯4
        { midi: 71, onset: 4560, duration: 200 }, // B4
        { midi: 63, onset: 4800, duration: 200 }, // D♯4
        { midi: 66, onset: 4800, duration: 200 }, // F♯4
        { midi: 71, onset: 4800, duration: 200 }, // B4
        { midi: 63, onset: 5520, duration: 200 }, // D♯4
        { midi: 66, onset: 5520, duration: 200 }, // F♯4
        { midi: 71, onset: 5520, duration: 200 }, // B4
        { midi: 64, onset: 5760, duration: 200 }, // E4
        { midi: 67, onset: 5760, duration: 200 }, // G4
        { midi: 71, onset: 5760, duration: 200 }, // B4
        { midi: 64, onset: 6480, duration: 200 }, // E4
        { midi: 67, onset: 6480, duration: 200 }, // G4
        { midi: 71, onset: 6480, duration: 200 }, // B4
        { midi: 64, onset: 6720, duration: 200 }, // E4
        { midi: 67, onset: 6720, duration: 200 }, // G4
        { midi: 71, onset: 6720, duration: 200 }, // B4
        { midi: 64, onset: 7440, duration: 200 }, // E4
        { midi: 67, onset: 7440, duration: 200 }, // G4
        { midi: 71, onset: 7440, duration: 200 }, // B4
      ],
    },
    {
      stepNumber: 23,
      module: 'latin_l2',
      section: 'B',
      subsection: 'B4: Bolero Chords',
      activity: 'B4.1: Bolero Voicings, Voice-Led (Out of Time)',
      direction:
        'E stays on top for E minor and A minor. For B7, put its 7th — A — on the bottom: A–B–D♯. Then A falls to G and D♯ rises to E.',
      assessment: 'pitch_order',
      tag: 'latin:l2_bolero_voicings | latin',
      styleRef: 'l2d',
      successFeedback:
        'The 7th falls, the leading tone rises — the bolero cadence.',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      targetNotes: [
        { midi: 55, onset: 0, duration: 1800 }, // G3
        { midi: 59, onset: 0, duration: 1800 }, // B3
        { midi: 64, onset: 0, duration: 1800 }, // E4
        { midi: 57, onset: 1920, duration: 1800 }, // A3
        { midi: 60, onset: 1920, duration: 1800 }, // C4
        { midi: 64, onset: 1920, duration: 1800 }, // E4
        { midi: 57, onset: 3840, duration: 1800 }, // A3
        { midi: 59, onset: 3840, duration: 1800 }, // B3
        { midi: 63, onset: 3840, duration: 1800 }, // D♯4
        { midi: 55, onset: 5760, duration: 1800 }, // G3
        { midi: 59, onset: 5760, duration: 1800 }, // B3
        { midi: 64, onset: 5760, duration: 1800 }, // E4
      ],
    },
    {
      stepNumber: 24,
      module: 'latin_l2',
      section: 'B',
      subsection: 'B4: Bolero Chords',
      activity: 'B4.2: Play-Along — Bolero',
      direction:
        'Every chord off the beat: hold the first, on the "and" of 1, then short on the "and"s of 2, 3 and 4.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l2_bolero_play | latin',
      styleRef: 'l2d',
      successFeedback: 'Always between the beats — the bolero sways.',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 90,
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 55, onset: 240, duration: 460 }, // G3
        { midi: 59, onset: 240, duration: 460 }, // B3
        { midi: 64, onset: 240, duration: 460 }, // E4
        { midi: 55, onset: 720, duration: 200 }, // G3
        { midi: 59, onset: 720, duration: 200 }, // B3
        { midi: 64, onset: 720, duration: 200 }, // E4
        { midi: 55, onset: 1200, duration: 200 }, // G3
        { midi: 59, onset: 1200, duration: 200 }, // B3
        { midi: 64, onset: 1200, duration: 200 }, // E4
        { midi: 55, onset: 1680, duration: 200 }, // G3
        { midi: 59, onset: 1680, duration: 200 }, // B3
        { midi: 64, onset: 1680, duration: 200 }, // E4
        { midi: 57, onset: 2160, duration: 460 }, // A3
        { midi: 60, onset: 2160, duration: 460 }, // C4
        { midi: 64, onset: 2160, duration: 460 }, // E4
        { midi: 57, onset: 2640, duration: 200 }, // A3
        { midi: 60, onset: 2640, duration: 200 }, // C4
        { midi: 64, onset: 2640, duration: 200 }, // E4
        { midi: 57, onset: 3120, duration: 200 }, // A3
        { midi: 60, onset: 3120, duration: 200 }, // C4
        { midi: 64, onset: 3120, duration: 200 }, // E4
        { midi: 57, onset: 3600, duration: 200 }, // A3
        { midi: 60, onset: 3600, duration: 200 }, // C4
        { midi: 64, onset: 3600, duration: 200 }, // E4
        { midi: 57, onset: 4080, duration: 460 }, // A3
        { midi: 59, onset: 4080, duration: 460 }, // B3
        { midi: 63, onset: 4080, duration: 460 }, // D♯4
        { midi: 57, onset: 4560, duration: 200 }, // A3
        { midi: 59, onset: 4560, duration: 200 }, // B3
        { midi: 63, onset: 4560, duration: 200 }, // D♯4
        { midi: 57, onset: 5040, duration: 200 }, // A3
        { midi: 59, onset: 5040, duration: 200 }, // B3
        { midi: 63, onset: 5040, duration: 200 }, // D♯4
        { midi: 57, onset: 5520, duration: 200 }, // A3
        { midi: 59, onset: 5520, duration: 200 }, // B3
        { midi: 63, onset: 5520, duration: 200 }, // D♯4
        { midi: 55, onset: 6000, duration: 460 }, // G3
        { midi: 59, onset: 6000, duration: 460 }, // B3
        { midi: 64, onset: 6000, duration: 460 }, // E4
        { midi: 55, onset: 6480, duration: 200 }, // G3
        { midi: 59, onset: 6480, duration: 200 }, // B3
        { midi: 64, onset: 6480, duration: 200 }, // E4
        { midi: 55, onset: 6960, duration: 200 }, // G3
        { midi: 59, onset: 6960, duration: 200 }, // B3
        { midi: 64, onset: 6960, duration: 200 }, // E4
        { midi: 55, onset: 7440, duration: 200 }, // G3
        { midi: 59, onset: 7440, duration: 200 }, // B3
        { midi: 64, onset: 7440, duration: 200 }, // E4
      ],
    },
  ],
};

const latinL2SectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 25,
      module: 'latin_l2',
      section: 'C',
      subsection: 'C1: Merengue Bass',
      activity: 'C1.1: Merengue Bass, One Chord',
      direction:
        'Root and 5 on every beat: E, B, E, B — the B below. Keep the notes short.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l2_bass_merengue_one | latin',
      styleRef: 'l2a',
      successFeedback: 'Root, 5, root, 5 — the merengue bass bounces.',
      chordSymbols: ['Em'],
      tempo: 100,
      targetNotes: [
        { midi: 40, onset: 0, duration: 220 }, // E2
        { midi: 35, onset: 480, duration: 220 }, // B1
        { midi: 40, onset: 960, duration: 220 }, // E2
        { midi: 35, onset: 1440, duration: 220 }, // B1
        { midi: 40, onset: 1920, duration: 220 }, // E2
        { midi: 35, onset: 2400, duration: 220 }, // B1
        { midi: 40, onset: 2880, duration: 220 }, // E2
        { midi: 35, onset: 3360, duration: 220 }, // B1
      ],
    },
    {
      stepNumber: 26,
      module: 'latin_l2',
      section: 'C',
      subsection: 'C1: Merengue Bass',
      activity: 'C1.2: Merengue Bass — the Progression',
      direction:
        'Root and 5 on every chord. The 5 is below E but above A and B, so your hand hardly moves.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l2_bass_merengue_prog | latin',
      styleRef: 'l2a',
      successFeedback: 'The whole progression without a stop.',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 100,
      targetNotes: [
        { midi: 40, onset: 0, duration: 220 }, // E2
        { midi: 35, onset: 480, duration: 220 }, // B1
        { midi: 40, onset: 960, duration: 220 }, // E2
        { midi: 35, onset: 1440, duration: 220 }, // B1
        { midi: 33, onset: 1920, duration: 220 }, // A1
        { midi: 40, onset: 2400, duration: 220 }, // E2
        { midi: 33, onset: 2880, duration: 220 }, // A1
        { midi: 40, onset: 3360, duration: 220 }, // E2
        { midi: 35, onset: 3840, duration: 220 }, // B1
        { midi: 42, onset: 4320, duration: 220 }, // F♯2
        { midi: 35, onset: 4800, duration: 220 }, // B1
        { midi: 42, onset: 5280, duration: 220 }, // F♯2
        { midi: 40, onset: 5760, duration: 220 }, // E2
        { midi: 35, onset: 6240, duration: 220 }, // B1
        { midi: 40, onset: 6720, duration: 220 }, // E2
        { midi: 35, onset: 7200, duration: 220 }, // B1
      ],
    },
    {
      stepNumber: 27,
      module: 'latin_l2',
      section: 'C',
      subsection: 'C1: Merengue Bass',
      activity: 'C1.3: Bass Play-Along — Merengue',
      direction: 'The merengue bass under the band.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l2_bass_merengue_play | latin',
      styleRef: 'l2a',
      successFeedback: 'You are holding down the merengue.',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 120,
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 40, onset: 0, duration: 220 }, // E2
        { midi: 35, onset: 480, duration: 220 }, // B1
        { midi: 40, onset: 960, duration: 220 }, // E2
        { midi: 35, onset: 1440, duration: 220 }, // B1
        { midi: 33, onset: 1920, duration: 220 }, // A1
        { midi: 40, onset: 2400, duration: 220 }, // E2
        { midi: 33, onset: 2880, duration: 220 }, // A1
        { midi: 40, onset: 3360, duration: 220 }, // E2
        { midi: 35, onset: 3840, duration: 220 }, // B1
        { midi: 42, onset: 4320, duration: 220 }, // F♯2
        { midi: 35, onset: 4800, duration: 220 }, // B1
        { midi: 42, onset: 5280, duration: 220 }, // F♯2
        { midi: 40, onset: 5760, duration: 220 }, // E2
        { midi: 35, onset: 6240, duration: 220 }, // B1
        { midi: 40, onset: 6720, duration: 220 }, // E2
        { midi: 35, onset: 7200, duration: 220 }, // B1
      ],
    },
    {
      stepNumber: 28,
      module: 'latin_l2',
      section: 'C',
      subsection: 'C2: Bachata Bass',
      activity: 'C2.1: Bachata Bass, One Chord',
      direction:
        'Root on 1, again on the "and" of 2, the 5 on 3, root on 4: E, E, B, E.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l2_bass_bachata_one | latin',
      styleRef: 'l2b',
      successFeedback: 'Root, root, 5, root — the bachata bass.',
      chordSymbols: ['Em'],
      tempo: 120,
      targetNotes: [
        { midi: 40, onset: 0, duration: 220 }, // E2
        { midi: 40, onset: 720, duration: 110 }, // E2
        { midi: 47, onset: 960, duration: 220 }, // B2
        { midi: 40, onset: 1440, duration: 220 }, // E2
        { midi: 40, onset: 1920, duration: 220 }, // E2
        { midi: 40, onset: 2640, duration: 110 }, // E2
        { midi: 47, onset: 2880, duration: 220 }, // B2
        { midi: 40, onset: 3360, duration: 220 }, // E2
      ],
    },
    {
      stepNumber: 29,
      module: 'latin_l2',
      section: 'C',
      subsection: 'C2: Bachata Bass',
      activity: 'C2.2: Bachata Bass — the Progression',
      direction: 'The same shape on every chord. Under B7 it is B, B, F♯, B.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l2_bass_bachata_prog | latin',
      styleRef: 'l2b',
      successFeedback: 'The bachata bass through the progression.',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 120,
      targetNotes: [
        { midi: 40, onset: 0, duration: 220 }, // E2
        { midi: 40, onset: 720, duration: 110 }, // E2
        { midi: 47, onset: 960, duration: 220 }, // B2
        { midi: 40, onset: 1440, duration: 220 }, // E2
        { midi: 33, onset: 1920, duration: 220 }, // A1
        { midi: 33, onset: 2640, duration: 110 }, // A1
        { midi: 40, onset: 2880, duration: 220 }, // E2
        { midi: 33, onset: 3360, duration: 220 }, // A1
        { midi: 35, onset: 3840, duration: 220 }, // B1
        { midi: 35, onset: 4560, duration: 110 }, // B1
        { midi: 42, onset: 4800, duration: 220 }, // F♯2
        { midi: 35, onset: 5280, duration: 220 }, // B1
        { midi: 40, onset: 5760, duration: 220 }, // E2
        { midi: 40, onset: 6480, duration: 110 }, // E2
        { midi: 47, onset: 6720, duration: 220 }, // B2
        { midi: 40, onset: 7200, duration: 220 }, // E2
      ],
    },
    {
      stepNumber: 30,
      module: 'latin_l2',
      section: 'C',
      subsection: 'C2: Bachata Bass',
      activity: 'C2.3: Bass Play-Along — Bachata',
      direction: 'The bachata bass under the band.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l2_bass_bachata_play | latin',
      styleRef: 'l2b',
      successFeedback: "Steady as the dancers' steps.",
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 148,
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 40, onset: 0, duration: 220 }, // E2
        { midi: 40, onset: 720, duration: 110 }, // E2
        { midi: 47, onset: 960, duration: 220 }, // B2
        { midi: 40, onset: 1440, duration: 220 }, // E2
        { midi: 33, onset: 1920, duration: 220 }, // A1
        { midi: 33, onset: 2640, duration: 110 }, // A1
        { midi: 40, onset: 2880, duration: 220 }, // E2
        { midi: 33, onset: 3360, duration: 220 }, // A1
        { midi: 35, onset: 3840, duration: 220 }, // B1
        { midi: 35, onset: 4560, duration: 110 }, // B1
        { midi: 42, onset: 4800, duration: 220 }, // F♯2
        { midi: 35, onset: 5280, duration: 220 }, // B1
        { midi: 40, onset: 5760, duration: 220 }, // E2
        { midi: 40, onset: 6480, duration: 110 }, // E2
        { midi: 47, onset: 6720, duration: 220 }, // B2
        { midi: 40, onset: 7200, duration: 220 }, // E2
      ],
    },
    {
      stepNumber: 31,
      module: 'latin_l2',
      section: 'C',
      subsection: 'C3: Cha-Cha Bass',
      activity: 'C3.1: Cha-Cha Bass, One Chord',
      direction:
        'E on 1, B above on 2, B below on 3 — then "cha-cha" on 4 and its "and", and the next E is the chá.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l2_bass_chacha_one | latin',
      styleRef: 'l2c',
      successFeedback: 'The bass dances the cha-cha-chá too.',
      chordSymbols: ['Em'],
      tempo: 110,
      targetNotes: [
        { midi: 40, onset: 0, duration: 460 }, // E2
        { midi: 47, onset: 480, duration: 460 }, // B2
        { midi: 35, onset: 960, duration: 460 }, // B1
        { midi: 47, onset: 1440, duration: 220 }, // B2
        { midi: 47, onset: 1680, duration: 220 }, // B2
        { midi: 40, onset: 1920, duration: 460 }, // E2
        { midi: 47, onset: 2400, duration: 460 }, // B2
        { midi: 35, onset: 2880, duration: 460 }, // B1
        { midi: 47, onset: 3360, duration: 220 }, // B2
        { midi: 47, onset: 3600, duration: 220 }, // B2
      ],
    },
    {
      stepNumber: 32,
      module: 'latin_l2',
      section: 'C',
      subsection: 'C3: Cha-Cha Bass',
      activity: 'C3.2: Cha-Cha Bass — the Progression',
      direction:
        'The same figure on every chord: root, 5, the 5 an octave down, then cha-cha into the next root.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l2_bass_chacha_prog | latin',
      styleRef: 'l2c',
      successFeedback: 'Cha-cha-chá into every chord.',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 110,
      targetNotes: [
        { midi: 40, onset: 0, duration: 460 }, // E2
        { midi: 47, onset: 480, duration: 460 }, // B2
        { midi: 35, onset: 960, duration: 460 }, // B1
        { midi: 47, onset: 1440, duration: 220 }, // B2
        { midi: 47, onset: 1680, duration: 220 }, // B2
        { midi: 45, onset: 1920, duration: 460 }, // A2
        { midi: 52, onset: 2400, duration: 460 }, // E3
        { midi: 40, onset: 2880, duration: 460 }, // E2
        { midi: 52, onset: 3360, duration: 220 }, // E3
        { midi: 52, onset: 3600, duration: 220 }, // E3
        { midi: 47, onset: 3840, duration: 460 }, // B2
        { midi: 54, onset: 4320, duration: 460 }, // F♯3
        { midi: 42, onset: 4800, duration: 460 }, // F♯2
        { midi: 54, onset: 5280, duration: 220 }, // F♯3
        { midi: 54, onset: 5520, duration: 220 }, // F♯3
        { midi: 40, onset: 5760, duration: 460 }, // E2
        { midi: 47, onset: 6240, duration: 460 }, // B2
        { midi: 35, onset: 6720, duration: 460 }, // B1
        { midi: 47, onset: 7200, duration: 220 }, // B2
        { midi: 47, onset: 7440, duration: 220 }, // B2
      ],
    },
    {
      stepNumber: 33,
      module: 'latin_l2',
      section: 'C',
      subsection: 'C3: Cha-Cha Bass',
      activity: 'C3.3: Bass Play-Along — Cha-Cha',
      direction: 'The cha-cha bass under the band.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l2_bass_chacha_play | latin',
      styleRef: 'l2c',
      successFeedback: 'Bass and dancers on the same steps.',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 130,
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 40, onset: 0, duration: 460 }, // E2
        { midi: 47, onset: 480, duration: 460 }, // B2
        { midi: 35, onset: 960, duration: 460 }, // B1
        { midi: 47, onset: 1440, duration: 220 }, // B2
        { midi: 47, onset: 1680, duration: 220 }, // B2
        { midi: 45, onset: 1920, duration: 460 }, // A2
        { midi: 52, onset: 2400, duration: 460 }, // E3
        { midi: 40, onset: 2880, duration: 460 }, // E2
        { midi: 52, onset: 3360, duration: 220 }, // E3
        { midi: 52, onset: 3600, duration: 220 }, // E3
        { midi: 47, onset: 3840, duration: 460 }, // B2
        { midi: 54, onset: 4320, duration: 460 }, // F♯3
        { midi: 42, onset: 4800, duration: 460 }, // F♯2
        { midi: 54, onset: 5280, duration: 220 }, // F♯3
        { midi: 54, onset: 5520, duration: 220 }, // F♯3
        { midi: 40, onset: 5760, duration: 460 }, // E2
        { midi: 47, onset: 6240, duration: 460 }, // B2
        { midi: 35, onset: 6720, duration: 460 }, // B1
        { midi: 47, onset: 7200, duration: 220 }, // B2
        { midi: 47, onset: 7440, duration: 220 }, // B2
      ],
    },
    {
      stepNumber: 34,
      module: 'latin_l2',
      section: 'C',
      subsection: 'C4: Bolero Bass',
      activity: 'C4.1: Bolero Bass, One Chord',
      direction:
        'Root on 1, the 5 on the "and" of 2, root again on 4 — long, long, short.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l2_bass_bolero_one | latin',
      styleRef: 'l2d',
      successFeedback: '3+3+2 again, slowed down: the bolero bass.',
      chordSymbols: ['Em'],
      tempo: 90,
      targetNotes: [
        { midi: 40, onset: 0, duration: 700 }, // E2
        { midi: 47, onset: 720, duration: 700 }, // B2
        { midi: 40, onset: 1440, duration: 460 }, // E2
        { midi: 40, onset: 1920, duration: 700 }, // E2
        { midi: 47, onset: 2640, duration: 700 }, // B2
        { midi: 40, onset: 3360, duration: 460 }, // E2
      ],
    },
    {
      stepNumber: 35,
      module: 'latin_l2',
      section: 'C',
      subsection: 'C4: Bolero Bass',
      activity: 'C4.2: Bolero Bass — the Progression',
      direction:
        'The same on every chord: A, E, A under A minor; B, F♯, B under B7.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l2_bass_bolero_prog | latin',
      styleRef: 'l2d',
      successFeedback: 'The bolero bass through the progression.',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 90,
      targetNotes: [
        { midi: 40, onset: 0, duration: 700 }, // E2
        { midi: 47, onset: 720, duration: 700 }, // B2
        { midi: 40, onset: 1440, duration: 460 }, // E2
        { midi: 33, onset: 1920, duration: 700 }, // A1
        { midi: 40, onset: 2640, duration: 700 }, // E2
        { midi: 33, onset: 3360, duration: 460 }, // A1
        { midi: 35, onset: 3840, duration: 700 }, // B1
        { midi: 42, onset: 4560, duration: 700 }, // F♯2
        { midi: 35, onset: 5280, duration: 460 }, // B1
        { midi: 40, onset: 5760, duration: 700 }, // E2
        { midi: 47, onset: 6480, duration: 700 }, // B2
        { midi: 40, onset: 7200, duration: 460 }, // E2
      ],
    },
    {
      stepNumber: 36,
      module: 'latin_l2',
      section: 'C',
      subsection: 'C4: Bolero Bass',
      activity: 'C4.3: Bass Play-Along — Bolero',
      direction: 'The bolero bass under the band.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l2_bass_bolero_play | latin',
      styleRef: 'l2d',
      successFeedback: 'Slow and sure — the bolero rests on you.',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 90,
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 40, onset: 0, duration: 700 }, // E2
        { midi: 47, onset: 720, duration: 700 }, // B2
        { midi: 40, onset: 1440, duration: 460 }, // E2
        { midi: 33, onset: 1920, duration: 700 }, // A1
        { midi: 40, onset: 2640, duration: 700 }, // E2
        { midi: 33, onset: 3360, duration: 460 }, // A1
        { midi: 35, onset: 3840, duration: 700 }, // B1
        { midi: 42, onset: 4560, duration: 700 }, // F♯2
        { midi: 35, onset: 5280, duration: 460 }, // B1
        { midi: 40, onset: 5760, duration: 700 }, // E2
        { midi: 47, onset: 6480, duration: 700 }, // B2
        { midi: 40, onset: 7200, duration: 460 }, // E2
      ],
    },
  ],
};

const latinL2SectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 37,
      module: 'latin_l2',
      section: 'D',
      subsection: 'D1: Merengue Performance',
      activity: 'D1.1: Merengue — LH Offbeat Chords (In Time)',
      direction:
        'Left hand alone: a short chord on every "and" — E–G–B, E–A–C, D♯–A–B for B7, E–G–B.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l2_perf_merengue_lh | latin',
      styleRef: 'l2a',
      successFeedback: 'The left hand fills every gap.',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 100,
      targetNotes: [
        { midi: 52, onset: 240, duration: 110 }, // E3
        { midi: 55, onset: 240, duration: 110 }, // G3
        { midi: 59, onset: 240, duration: 110 }, // B3
        { midi: 52, onset: 720, duration: 110 }, // E3
        { midi: 55, onset: 720, duration: 110 }, // G3
        { midi: 59, onset: 720, duration: 110 }, // B3
        { midi: 52, onset: 1200, duration: 110 }, // E3
        { midi: 55, onset: 1200, duration: 110 }, // G3
        { midi: 59, onset: 1200, duration: 110 }, // B3
        { midi: 52, onset: 1680, duration: 110 }, // E3
        { midi: 55, onset: 1680, duration: 110 }, // G3
        { midi: 59, onset: 1680, duration: 110 }, // B3
        { midi: 52, onset: 2160, duration: 110 }, // E3
        { midi: 57, onset: 2160, duration: 110 }, // A3
        { midi: 60, onset: 2160, duration: 110 }, // C4
        { midi: 52, onset: 2640, duration: 110 }, // E3
        { midi: 57, onset: 2640, duration: 110 }, // A3
        { midi: 60, onset: 2640, duration: 110 }, // C4
        { midi: 52, onset: 3120, duration: 110 }, // E3
        { midi: 57, onset: 3120, duration: 110 }, // A3
        { midi: 60, onset: 3120, duration: 110 }, // C4
        { midi: 52, onset: 3600, duration: 110 }, // E3
        { midi: 57, onset: 3600, duration: 110 }, // A3
        { midi: 60, onset: 3600, duration: 110 }, // C4
        { midi: 51, onset: 4080, duration: 110 }, // D♯3
        { midi: 57, onset: 4080, duration: 110 }, // A3
        { midi: 59, onset: 4080, duration: 110 }, // B3
        { midi: 51, onset: 4560, duration: 110 }, // D♯3
        { midi: 57, onset: 4560, duration: 110 }, // A3
        { midi: 59, onset: 4560, duration: 110 }, // B3
        { midi: 51, onset: 5040, duration: 110 }, // D♯3
        { midi: 57, onset: 5040, duration: 110 }, // A3
        { midi: 59, onset: 5040, duration: 110 }, // B3
        { midi: 51, onset: 5520, duration: 110 }, // D♯3
        { midi: 57, onset: 5520, duration: 110 }, // A3
        { midi: 59, onset: 5520, duration: 110 }, // B3
        { midi: 52, onset: 6000, duration: 110 }, // E3
        { midi: 55, onset: 6000, duration: 110 }, // G3
        { midi: 59, onset: 6000, duration: 110 }, // B3
        { midi: 52, onset: 6480, duration: 110 }, // E3
        { midi: 55, onset: 6480, duration: 110 }, // G3
        { midi: 59, onset: 6480, duration: 110 }, // B3
        { midi: 52, onset: 6960, duration: 110 }, // E3
        { midi: 55, onset: 6960, duration: 110 }, // G3
        { midi: 59, onset: 6960, duration: 110 }, // B3
        { midi: 52, onset: 7440, duration: 110 }, // E3
        { midi: 55, onset: 7440, duration: 110 }, // G3
        { midi: 59, onset: 7440, duration: 110 }, // B3
      ],
    },
    {
      stepNumber: 38,
      module: 'latin_l2',
      section: 'D',
      subsection: 'D1: Merengue Performance',
      activity: 'D1.2: Merengue — Both Hands (Play-Along)',
      direction:
        'Right hand on the beats, left hand on the "and"s — the hands take turns.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l2_perf_merengue_play | latin',
      styleRef: 'l2a',
      successFeedback: 'Never together, never stopping: merengue piano.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'two_hand_comping',
        lh_role: 'chords',
        rh_role: 'chords',
        style_ref: 'l2a',
      },
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 120,
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 52, onset: 240, duration: 110, hand: 'lh' }, // E3
        { midi: 55, onset: 240, duration: 110, hand: 'lh' }, // G3
        { midi: 59, onset: 240, duration: 110, hand: 'lh' }, // B3
        { midi: 52, onset: 720, duration: 110, hand: 'lh' }, // E3
        { midi: 55, onset: 720, duration: 110, hand: 'lh' }, // G3
        { midi: 59, onset: 720, duration: 110, hand: 'lh' }, // B3
        { midi: 52, onset: 1200, duration: 110, hand: 'lh' }, // E3
        { midi: 55, onset: 1200, duration: 110, hand: 'lh' }, // G3
        { midi: 59, onset: 1200, duration: 110, hand: 'lh' }, // B3
        { midi: 52, onset: 1680, duration: 110, hand: 'lh' }, // E3
        { midi: 55, onset: 1680, duration: 110, hand: 'lh' }, // G3
        { midi: 59, onset: 1680, duration: 110, hand: 'lh' }, // B3
        { midi: 52, onset: 2160, duration: 110, hand: 'lh' }, // E3
        { midi: 57, onset: 2160, duration: 110, hand: 'lh' }, // A3
        { midi: 60, onset: 2160, duration: 110, hand: 'lh' }, // C4
        { midi: 52, onset: 2640, duration: 110, hand: 'lh' }, // E3
        { midi: 57, onset: 2640, duration: 110, hand: 'lh' }, // A3
        { midi: 60, onset: 2640, duration: 110, hand: 'lh' }, // C4
        { midi: 52, onset: 3120, duration: 110, hand: 'lh' }, // E3
        { midi: 57, onset: 3120, duration: 110, hand: 'lh' }, // A3
        { midi: 60, onset: 3120, duration: 110, hand: 'lh' }, // C4
        { midi: 52, onset: 3600, duration: 110, hand: 'lh' }, // E3
        { midi: 57, onset: 3600, duration: 110, hand: 'lh' }, // A3
        { midi: 60, onset: 3600, duration: 110, hand: 'lh' }, // C4
        { midi: 51, onset: 4080, duration: 110, hand: 'lh' }, // D♯3
        { midi: 57, onset: 4080, duration: 110, hand: 'lh' }, // A3
        { midi: 59, onset: 4080, duration: 110, hand: 'lh' }, // B3
        { midi: 51, onset: 4560, duration: 110, hand: 'lh' }, // D♯3
        { midi: 57, onset: 4560, duration: 110, hand: 'lh' }, // A3
        { midi: 59, onset: 4560, duration: 110, hand: 'lh' }, // B3
        { midi: 51, onset: 5040, duration: 110, hand: 'lh' }, // D♯3
        { midi: 57, onset: 5040, duration: 110, hand: 'lh' }, // A3
        { midi: 59, onset: 5040, duration: 110, hand: 'lh' }, // B3
        { midi: 51, onset: 5520, duration: 110, hand: 'lh' }, // D♯3
        { midi: 57, onset: 5520, duration: 110, hand: 'lh' }, // A3
        { midi: 59, onset: 5520, duration: 110, hand: 'lh' }, // B3
        { midi: 52, onset: 6000, duration: 110, hand: 'lh' }, // E3
        { midi: 55, onset: 6000, duration: 110, hand: 'lh' }, // G3
        { midi: 59, onset: 6000, duration: 110, hand: 'lh' }, // B3
        { midi: 52, onset: 6480, duration: 110, hand: 'lh' }, // E3
        { midi: 55, onset: 6480, duration: 110, hand: 'lh' }, // G3
        { midi: 59, onset: 6480, duration: 110, hand: 'lh' }, // B3
        { midi: 52, onset: 6960, duration: 110, hand: 'lh' }, // E3
        { midi: 55, onset: 6960, duration: 110, hand: 'lh' }, // G3
        { midi: 59, onset: 6960, duration: 110, hand: 'lh' }, // B3
        { midi: 52, onset: 7440, duration: 110, hand: 'lh' }, // E3
        { midi: 55, onset: 7440, duration: 110, hand: 'lh' }, // G3
        { midi: 59, onset: 7440, duration: 110, hand: 'lh' }, // B3
        { midi: 67, onset: 0, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 0, duration: 200, hand: 'rh' }, // B4
        { midi: 64, onset: 480, duration: 200, hand: 'rh' }, // E4
        { midi: 76, onset: 480, duration: 200, hand: 'rh' }, // E5
        { midi: 67, onset: 960, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 960, duration: 200, hand: 'rh' }, // B4
        { midi: 64, onset: 1440, duration: 200, hand: 'rh' }, // E4
        { midi: 76, onset: 1440, duration: 200, hand: 'rh' }, // E5
        { midi: 69, onset: 1920, duration: 200, hand: 'rh' }, // A4
        { midi: 72, onset: 1920, duration: 200, hand: 'rh' }, // C5
        { midi: 64, onset: 2400, duration: 200, hand: 'rh' }, // E4
        { midi: 76, onset: 2400, duration: 200, hand: 'rh' }, // E5
        { midi: 69, onset: 2880, duration: 200, hand: 'rh' }, // A4
        { midi: 72, onset: 2880, duration: 200, hand: 'rh' }, // C5
        { midi: 64, onset: 3360, duration: 200, hand: 'rh' }, // E4
        { midi: 76, onset: 3360, duration: 200, hand: 'rh' }, // E5
        { midi: 69, onset: 3840, duration: 200, hand: 'rh' }, // A4
        { midi: 71, onset: 3840, duration: 200, hand: 'rh' }, // B4
        { midi: 63, onset: 4320, duration: 200, hand: 'rh' }, // D♯4
        { midi: 75, onset: 4320, duration: 200, hand: 'rh' }, // D♯5
        { midi: 69, onset: 4800, duration: 200, hand: 'rh' }, // A4
        { midi: 71, onset: 4800, duration: 200, hand: 'rh' }, // B4
        { midi: 63, onset: 5280, duration: 200, hand: 'rh' }, // D♯4
        { midi: 75, onset: 5280, duration: 200, hand: 'rh' }, // D♯5
        { midi: 67, onset: 5760, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 5760, duration: 200, hand: 'rh' }, // B4
        { midi: 64, onset: 6240, duration: 200, hand: 'rh' }, // E4
        { midi: 76, onset: 6240, duration: 200, hand: 'rh' }, // E5
        { midi: 67, onset: 6720, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 6720, duration: 200, hand: 'rh' }, // B4
        { midi: 64, onset: 7200, duration: 200, hand: 'rh' }, // E4
        { midi: 76, onset: 7200, duration: 200, hand: 'rh' }, // E5
      ],
    },
    {
      stepNumber: 39,
      module: 'latin_l2',
      section: 'D',
      subsection: 'D2: Bachata Performance',
      activity: 'D2.1: Bachata — LH Fifths + RH Shapes (Out of Time)',
      direction:
        'Left hand an open fifth — root and 5 together; right hand holds the chord the arpeggio comes from.',
      assessment: 'pitch_order',
      tag: 'latin:l2_perf_bachata_oot | latin',
      styleRef: 'l2b',
      successFeedback: 'Both hands know the shapes.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l2b',
      },
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      targetNotes: [
        { midi: 40, onset: 0, duration: 1800, hand: 'lh' }, // E2
        { midi: 47, onset: 0, duration: 1800, hand: 'lh' }, // B2
        { midi: 33, onset: 1920, duration: 1800, hand: 'lh' }, // A1
        { midi: 40, onset: 1920, duration: 1800, hand: 'lh' }, // E2
        { midi: 35, onset: 3840, duration: 1800, hand: 'lh' }, // B1
        { midi: 42, onset: 3840, duration: 1800, hand: 'lh' }, // F♯2
        { midi: 40, onset: 5760, duration: 1800, hand: 'lh' }, // E2
        { midi: 47, onset: 5760, duration: 1800, hand: 'lh' }, // B2
        { midi: 67, onset: 0, duration: 1800, hand: 'rh' }, // G4
        { midi: 71, onset: 0, duration: 1800, hand: 'rh' }, // B4
        { midi: 76, onset: 0, duration: 1800, hand: 'rh' }, // E5
        { midi: 69, onset: 1920, duration: 1800, hand: 'rh' }, // A4
        { midi: 72, onset: 1920, duration: 1800, hand: 'rh' }, // C5
        { midi: 76, onset: 1920, duration: 1800, hand: 'rh' }, // E5
        { midi: 66, onset: 3840, duration: 1800, hand: 'rh' }, // F♯4
        { midi: 71, onset: 3840, duration: 1800, hand: 'rh' }, // B4
        { midi: 75, onset: 3840, duration: 1800, hand: 'rh' }, // D♯5
        { midi: 67, onset: 5760, duration: 1800, hand: 'rh' }, // G4
        { midi: 71, onset: 5760, duration: 1800, hand: 'rh' }, // B4
        { midi: 76, onset: 5760, duration: 1800, hand: 'rh' }, // E5
      ],
    },
    {
      stepNumber: 40,
      module: 'latin_l2',
      section: 'D',
      subsection: 'D2: Bachata Performance',
      activity: 'D2.2: Bachata — Full Groove (Play-Along)',
      direction:
        'Left hand an open fifth on 1 and 3; right hand rolls the arpeggio in eighths.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l2_perf_bachata_play | latin',
      styleRef: 'l2b',
      successFeedback: 'A bachata band in two hands.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l2b',
      },
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 148,
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 40, onset: 0, duration: 940, hand: 'lh' }, // E2
        { midi: 47, onset: 0, duration: 940, hand: 'lh' }, // B2
        { midi: 40, onset: 960, duration: 940, hand: 'lh' }, // E2
        { midi: 47, onset: 960, duration: 940, hand: 'lh' }, // B2
        { midi: 33, onset: 1920, duration: 940, hand: 'lh' }, // A1
        { midi: 40, onset: 1920, duration: 940, hand: 'lh' }, // E2
        { midi: 33, onset: 2880, duration: 940, hand: 'lh' }, // A1
        { midi: 40, onset: 2880, duration: 940, hand: 'lh' }, // E2
        { midi: 35, onset: 3840, duration: 940, hand: 'lh' }, // B1
        { midi: 42, onset: 3840, duration: 940, hand: 'lh' }, // F♯2
        { midi: 35, onset: 4800, duration: 940, hand: 'lh' }, // B1
        { midi: 42, onset: 4800, duration: 940, hand: 'lh' }, // F♯2
        { midi: 40, onset: 5760, duration: 940, hand: 'lh' }, // E2
        { midi: 47, onset: 5760, duration: 940, hand: 'lh' }, // B2
        { midi: 40, onset: 6720, duration: 940, hand: 'lh' }, // E2
        { midi: 47, onset: 6720, duration: 940, hand: 'lh' }, // B2
        { midi: 67, onset: 0, duration: 220, hand: 'rh' }, // G4
        { midi: 71, onset: 240, duration: 220, hand: 'rh' }, // B4
        { midi: 76, onset: 480, duration: 220, hand: 'rh' }, // E5
        { midi: 67, onset: 720, duration: 220, hand: 'rh' }, // G4
        { midi: 71, onset: 960, duration: 220, hand: 'rh' }, // B4
        { midi: 76, onset: 1200, duration: 220, hand: 'rh' }, // E5
        { midi: 67, onset: 1440, duration: 220, hand: 'rh' }, // G4
        { midi: 71, onset: 1680, duration: 220, hand: 'rh' }, // B4
        { midi: 69, onset: 1920, duration: 220, hand: 'rh' }, // A4
        { midi: 72, onset: 2160, duration: 220, hand: 'rh' }, // C5
        { midi: 76, onset: 2400, duration: 220, hand: 'rh' }, // E5
        { midi: 69, onset: 2640, duration: 220, hand: 'rh' }, // A4
        { midi: 72, onset: 2880, duration: 220, hand: 'rh' }, // C5
        { midi: 76, onset: 3120, duration: 220, hand: 'rh' }, // E5
        { midi: 69, onset: 3360, duration: 220, hand: 'rh' }, // A4
        { midi: 72, onset: 3600, duration: 220, hand: 'rh' }, // C5
        { midi: 66, onset: 3840, duration: 220, hand: 'rh' }, // F♯4
        { midi: 71, onset: 4080, duration: 220, hand: 'rh' }, // B4
        { midi: 75, onset: 4320, duration: 220, hand: 'rh' }, // D♯5
        { midi: 66, onset: 4560, duration: 220, hand: 'rh' }, // F♯4
        { midi: 71, onset: 4800, duration: 220, hand: 'rh' }, // B4
        { midi: 75, onset: 5040, duration: 220, hand: 'rh' }, // D♯5
        { midi: 66, onset: 5280, duration: 220, hand: 'rh' }, // F♯4
        { midi: 71, onset: 5520, duration: 220, hand: 'rh' }, // B4
        { midi: 67, onset: 5760, duration: 220, hand: 'rh' }, // G4
        { midi: 71, onset: 6000, duration: 220, hand: 'rh' }, // B4
        { midi: 76, onset: 6240, duration: 220, hand: 'rh' }, // E5
        { midi: 67, onset: 6480, duration: 220, hand: 'rh' }, // G4
        { midi: 71, onset: 6720, duration: 220, hand: 'rh' }, // B4
        { midi: 76, onset: 6960, duration: 220, hand: 'rh' }, // E5
        { midi: 67, onset: 7200, duration: 220, hand: 'rh' }, // G4
        { midi: 71, onset: 7440, duration: 220, hand: 'rh' }, // B4
      ],
    },
    {
      stepNumber: 41,
      module: 'latin_l2',
      section: 'D',
      subsection: 'D3: Cha-Cha-Chá Performance',
      activity: 'D3.1: Cha-Cha — Hands Split, One Chord (In Time)',
      direction:
        'Right hand on 1 and 3; left hand, an octave lower, on every "and".',
      assessment: 'pitch_order_timing',
      tag: 'latin:l2_perf_chacha_one | latin',
      styleRef: 'l2c',
      successFeedback: 'The hands trade places every eighth note.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'two_hand_comping',
        lh_role: 'chords',
        rh_role: 'chords',
        style_ref: 'l2c',
      },
      chordSymbols: ['Em'],
      tempo: 110,
      targetNotes: [
        { midi: 52, onset: 240, duration: 110, hand: 'lh' }, // E3
        { midi: 55, onset: 240, duration: 110, hand: 'lh' }, // G3
        { midi: 59, onset: 240, duration: 110, hand: 'lh' }, // B3
        { midi: 52, onset: 720, duration: 110, hand: 'lh' }, // E3
        { midi: 55, onset: 720, duration: 110, hand: 'lh' }, // G3
        { midi: 59, onset: 720, duration: 110, hand: 'lh' }, // B3
        { midi: 52, onset: 1200, duration: 110, hand: 'lh' }, // E3
        { midi: 55, onset: 1200, duration: 110, hand: 'lh' }, // G3
        { midi: 59, onset: 1200, duration: 110, hand: 'lh' }, // B3
        { midi: 52, onset: 1680, duration: 110, hand: 'lh' }, // E3
        { midi: 55, onset: 1680, duration: 110, hand: 'lh' }, // G3
        { midi: 59, onset: 1680, duration: 110, hand: 'lh' }, // B3
        { midi: 52, onset: 2160, duration: 110, hand: 'lh' }, // E3
        { midi: 55, onset: 2160, duration: 110, hand: 'lh' }, // G3
        { midi: 59, onset: 2160, duration: 110, hand: 'lh' }, // B3
        { midi: 52, onset: 2640, duration: 110, hand: 'lh' }, // E3
        { midi: 55, onset: 2640, duration: 110, hand: 'lh' }, // G3
        { midi: 59, onset: 2640, duration: 110, hand: 'lh' }, // B3
        { midi: 52, onset: 3120, duration: 110, hand: 'lh' }, // E3
        { midi: 55, onset: 3120, duration: 110, hand: 'lh' }, // G3
        { midi: 59, onset: 3120, duration: 110, hand: 'lh' }, // B3
        { midi: 52, onset: 3600, duration: 110, hand: 'lh' }, // E3
        { midi: 55, onset: 3600, duration: 110, hand: 'lh' }, // G3
        { midi: 59, onset: 3600, duration: 110, hand: 'lh' }, // B3
        { midi: 64, onset: 0, duration: 200, hand: 'rh' }, // E4
        { midi: 67, onset: 0, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 0, duration: 200, hand: 'rh' }, // B4
        { midi: 64, onset: 960, duration: 200, hand: 'rh' }, // E4
        { midi: 67, onset: 960, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 960, duration: 200, hand: 'rh' }, // B4
        { midi: 64, onset: 1920, duration: 200, hand: 'rh' }, // E4
        { midi: 67, onset: 1920, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 1920, duration: 200, hand: 'rh' }, // B4
        { midi: 64, onset: 2880, duration: 200, hand: 'rh' }, // E4
        { midi: 67, onset: 2880, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 2880, duration: 200, hand: 'rh' }, // B4
      ],
    },
    {
      stepNumber: 42,
      module: 'latin_l2',
      section: 'D',
      subsection: 'D3: Cha-Cha-Chá Performance',
      activity: 'D3.2: Cha-Cha — Both Hands (Play-Along)',
      direction:
        'The split pattern through the chords: the same shapes in both hands, an octave apart.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l2_perf_chacha_play | latin',
      styleRef: 'l2c',
      successFeedback: "That is the band's cha-cha keyboard part.",
      instrument_config: {
        instrument: 'piano',
        hand_config: 'two_hand_comping',
        lh_role: 'chords',
        rh_role: 'chords',
        style_ref: 'l2c',
      },
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 130,
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 52, onset: 240, duration: 110, hand: 'lh' }, // E3
        { midi: 55, onset: 240, duration: 110, hand: 'lh' }, // G3
        { midi: 59, onset: 240, duration: 110, hand: 'lh' }, // B3
        { midi: 52, onset: 720, duration: 110, hand: 'lh' }, // E3
        { midi: 55, onset: 720, duration: 110, hand: 'lh' }, // G3
        { midi: 59, onset: 720, duration: 110, hand: 'lh' }, // B3
        { midi: 52, onset: 1200, duration: 110, hand: 'lh' }, // E3
        { midi: 55, onset: 1200, duration: 110, hand: 'lh' }, // G3
        { midi: 59, onset: 1200, duration: 110, hand: 'lh' }, // B3
        { midi: 52, onset: 1680, duration: 110, hand: 'lh' }, // E3
        { midi: 55, onset: 1680, duration: 110, hand: 'lh' }, // G3
        { midi: 59, onset: 1680, duration: 110, hand: 'lh' }, // B3
        { midi: 48, onset: 2160, duration: 110, hand: 'lh' }, // C3
        { midi: 52, onset: 2160, duration: 110, hand: 'lh' }, // E3
        { midi: 57, onset: 2160, duration: 110, hand: 'lh' }, // A3
        { midi: 48, onset: 2640, duration: 110, hand: 'lh' }, // C3
        { midi: 52, onset: 2640, duration: 110, hand: 'lh' }, // E3
        { midi: 57, onset: 2640, duration: 110, hand: 'lh' }, // A3
        { midi: 48, onset: 3120, duration: 110, hand: 'lh' }, // C3
        { midi: 52, onset: 3120, duration: 110, hand: 'lh' }, // E3
        { midi: 57, onset: 3120, duration: 110, hand: 'lh' }, // A3
        { midi: 48, onset: 3600, duration: 110, hand: 'lh' }, // C3
        { midi: 52, onset: 3600, duration: 110, hand: 'lh' }, // E3
        { midi: 57, onset: 3600, duration: 110, hand: 'lh' }, // A3
        { midi: 51, onset: 4080, duration: 110, hand: 'lh' }, // D♯3
        { midi: 54, onset: 4080, duration: 110, hand: 'lh' }, // F♯3
        { midi: 59, onset: 4080, duration: 110, hand: 'lh' }, // B3
        { midi: 51, onset: 4560, duration: 110, hand: 'lh' }, // D♯3
        { midi: 54, onset: 4560, duration: 110, hand: 'lh' }, // F♯3
        { midi: 59, onset: 4560, duration: 110, hand: 'lh' }, // B3
        { midi: 51, onset: 5040, duration: 110, hand: 'lh' }, // D♯3
        { midi: 54, onset: 5040, duration: 110, hand: 'lh' }, // F♯3
        { midi: 59, onset: 5040, duration: 110, hand: 'lh' }, // B3
        { midi: 51, onset: 5520, duration: 110, hand: 'lh' }, // D♯3
        { midi: 54, onset: 5520, duration: 110, hand: 'lh' }, // F♯3
        { midi: 59, onset: 5520, duration: 110, hand: 'lh' }, // B3
        { midi: 52, onset: 6000, duration: 110, hand: 'lh' }, // E3
        { midi: 55, onset: 6000, duration: 110, hand: 'lh' }, // G3
        { midi: 59, onset: 6000, duration: 110, hand: 'lh' }, // B3
        { midi: 52, onset: 6480, duration: 110, hand: 'lh' }, // E3
        { midi: 55, onset: 6480, duration: 110, hand: 'lh' }, // G3
        { midi: 59, onset: 6480, duration: 110, hand: 'lh' }, // B3
        { midi: 52, onset: 6960, duration: 110, hand: 'lh' }, // E3
        { midi: 55, onset: 6960, duration: 110, hand: 'lh' }, // G3
        { midi: 59, onset: 6960, duration: 110, hand: 'lh' }, // B3
        { midi: 52, onset: 7440, duration: 110, hand: 'lh' }, // E3
        { midi: 55, onset: 7440, duration: 110, hand: 'lh' }, // G3
        { midi: 59, onset: 7440, duration: 110, hand: 'lh' }, // B3
        { midi: 64, onset: 0, duration: 200, hand: 'rh' }, // E4
        { midi: 67, onset: 0, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 0, duration: 200, hand: 'rh' }, // B4
        { midi: 64, onset: 960, duration: 200, hand: 'rh' }, // E4
        { midi: 67, onset: 960, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 960, duration: 200, hand: 'rh' }, // B4
        { midi: 60, onset: 1920, duration: 200, hand: 'rh' }, // C4
        { midi: 64, onset: 1920, duration: 200, hand: 'rh' }, // E4
        { midi: 69, onset: 1920, duration: 200, hand: 'rh' }, // A4
        { midi: 60, onset: 2880, duration: 200, hand: 'rh' }, // C4
        { midi: 64, onset: 2880, duration: 200, hand: 'rh' }, // E4
        { midi: 69, onset: 2880, duration: 200, hand: 'rh' }, // A4
        { midi: 63, onset: 3840, duration: 200, hand: 'rh' }, // D♯4
        { midi: 66, onset: 3840, duration: 200, hand: 'rh' }, // F♯4
        { midi: 71, onset: 3840, duration: 200, hand: 'rh' }, // B4
        { midi: 63, onset: 4800, duration: 200, hand: 'rh' }, // D♯4
        { midi: 66, onset: 4800, duration: 200, hand: 'rh' }, // F♯4
        { midi: 71, onset: 4800, duration: 200, hand: 'rh' }, // B4
        { midi: 64, onset: 5760, duration: 200, hand: 'rh' }, // E4
        { midi: 67, onset: 5760, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 5760, duration: 200, hand: 'rh' }, // B4
        { midi: 64, onset: 6720, duration: 200, hand: 'rh' }, // E4
        { midi: 67, onset: 6720, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 6720, duration: 200, hand: 'rh' }, // B4
      ],
    },
    {
      stepNumber: 43,
      module: 'latin_l2',
      section: 'D',
      subsection: 'D4: Bolero Performance',
      activity: 'D4.1: Bolero — LH Bass + RH Chords (Play-Along)',
      direction:
        'Left hand on 1, the "and" of 2 and 4; right hand on every "and". On the "and" of 2 they play together.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l2_perf_bolero_chords | latin',
      styleRef: 'l2d',
      successFeedback: 'Bass and chords, swaying together.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l2d',
      },
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 90,
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 40, onset: 0, duration: 700, hand: 'lh' }, // E2
        { midi: 47, onset: 720, duration: 700, hand: 'lh' }, // B2
        { midi: 40, onset: 1440, duration: 460, hand: 'lh' }, // E2
        { midi: 33, onset: 1920, duration: 700, hand: 'lh' }, // A1
        { midi: 40, onset: 2640, duration: 700, hand: 'lh' }, // E2
        { midi: 33, onset: 3360, duration: 460, hand: 'lh' }, // A1
        { midi: 35, onset: 3840, duration: 700, hand: 'lh' }, // B1
        { midi: 42, onset: 4560, duration: 700, hand: 'lh' }, // F♯2
        { midi: 35, onset: 5280, duration: 460, hand: 'lh' }, // B1
        { midi: 40, onset: 5760, duration: 700, hand: 'lh' }, // E2
        { midi: 47, onset: 6480, duration: 700, hand: 'lh' }, // B2
        { midi: 40, onset: 7200, duration: 460, hand: 'lh' }, // E2
        { midi: 55, onset: 240, duration: 460, hand: 'rh' }, // G3
        { midi: 59, onset: 240, duration: 460, hand: 'rh' }, // B3
        { midi: 64, onset: 240, duration: 460, hand: 'rh' }, // E4
        { midi: 55, onset: 720, duration: 200, hand: 'rh' }, // G3
        { midi: 59, onset: 720, duration: 200, hand: 'rh' }, // B3
        { midi: 64, onset: 720, duration: 200, hand: 'rh' }, // E4
        { midi: 55, onset: 1200, duration: 200, hand: 'rh' }, // G3
        { midi: 59, onset: 1200, duration: 200, hand: 'rh' }, // B3
        { midi: 64, onset: 1200, duration: 200, hand: 'rh' }, // E4
        { midi: 55, onset: 1680, duration: 200, hand: 'rh' }, // G3
        { midi: 59, onset: 1680, duration: 200, hand: 'rh' }, // B3
        { midi: 64, onset: 1680, duration: 200, hand: 'rh' }, // E4
        { midi: 57, onset: 2160, duration: 460, hand: 'rh' }, // A3
        { midi: 60, onset: 2160, duration: 460, hand: 'rh' }, // C4
        { midi: 64, onset: 2160, duration: 460, hand: 'rh' }, // E4
        { midi: 57, onset: 2640, duration: 200, hand: 'rh' }, // A3
        { midi: 60, onset: 2640, duration: 200, hand: 'rh' }, // C4
        { midi: 64, onset: 2640, duration: 200, hand: 'rh' }, // E4
        { midi: 57, onset: 3120, duration: 200, hand: 'rh' }, // A3
        { midi: 60, onset: 3120, duration: 200, hand: 'rh' }, // C4
        { midi: 64, onset: 3120, duration: 200, hand: 'rh' }, // E4
        { midi: 57, onset: 3600, duration: 200, hand: 'rh' }, // A3
        { midi: 60, onset: 3600, duration: 200, hand: 'rh' }, // C4
        { midi: 64, onset: 3600, duration: 200, hand: 'rh' }, // E4
        { midi: 57, onset: 4080, duration: 460, hand: 'rh' }, // A3
        { midi: 59, onset: 4080, duration: 460, hand: 'rh' }, // B3
        { midi: 63, onset: 4080, duration: 460, hand: 'rh' }, // D♯4
        { midi: 57, onset: 4560, duration: 200, hand: 'rh' }, // A3
        { midi: 59, onset: 4560, duration: 200, hand: 'rh' }, // B3
        { midi: 63, onset: 4560, duration: 200, hand: 'rh' }, // D♯4
        { midi: 57, onset: 5040, duration: 200, hand: 'rh' }, // A3
        { midi: 59, onset: 5040, duration: 200, hand: 'rh' }, // B3
        { midi: 63, onset: 5040, duration: 200, hand: 'rh' }, // D♯4
        { midi: 57, onset: 5520, duration: 200, hand: 'rh' }, // A3
        { midi: 59, onset: 5520, duration: 200, hand: 'rh' }, // B3
        { midi: 63, onset: 5520, duration: 200, hand: 'rh' }, // D♯4
        { midi: 55, onset: 6000, duration: 460, hand: 'rh' }, // G3
        { midi: 59, onset: 6000, duration: 460, hand: 'rh' }, // B3
        { midi: 64, onset: 6000, duration: 460, hand: 'rh' }, // E4
        { midi: 55, onset: 6480, duration: 200, hand: 'rh' }, // G3
        { midi: 59, onset: 6480, duration: 200, hand: 'rh' }, // B3
        { midi: 64, onset: 6480, duration: 200, hand: 'rh' }, // E4
        { midi: 55, onset: 6960, duration: 200, hand: 'rh' }, // G3
        { midi: 59, onset: 6960, duration: 200, hand: 'rh' }, // B3
        { midi: 64, onset: 6960, duration: 200, hand: 'rh' }, // E4
        { midi: 55, onset: 7440, duration: 200, hand: 'rh' }, // G3
        { midi: 59, onset: 7440, duration: 200, hand: 'rh' }, // B3
        { midi: 64, onset: 7440, duration: 200, hand: 'rh' }, // E4
      ],
    },
    {
      stepNumber: 44,
      module: 'latin_l2',
      section: 'D',
      subsection: 'D4: Bolero Performance',
      activity: 'D4.2: Bolero — LH Chords + RH Melody (Play-Along)',
      direction:
        'Left hand plays the bolero chords on the "and"s; right hand sings the melody from A6.2.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l2_perf_bolero_melody | latin',
      styleRef: 'l2d',
      successFeedback: 'A bolero, start to finish, in two hands.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_chords_rh_melody',
        lh_role: 'chords',
        rh_role: 'melody',
        style_ref: 'l2d',
      },
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 90,
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords', 'melody'],
      },
      targetNotes: [
        { midi: 55, onset: 240, duration: 460, hand: 'lh' }, // G3
        { midi: 59, onset: 240, duration: 460, hand: 'lh' }, // B3
        { midi: 64, onset: 240, duration: 460, hand: 'lh' }, // E4
        { midi: 55, onset: 720, duration: 200, hand: 'lh' }, // G3
        { midi: 59, onset: 720, duration: 200, hand: 'lh' }, // B3
        { midi: 64, onset: 720, duration: 200, hand: 'lh' }, // E4
        { midi: 55, onset: 1200, duration: 200, hand: 'lh' }, // G3
        { midi: 59, onset: 1200, duration: 200, hand: 'lh' }, // B3
        { midi: 64, onset: 1200, duration: 200, hand: 'lh' }, // E4
        { midi: 55, onset: 1680, duration: 200, hand: 'lh' }, // G3
        { midi: 59, onset: 1680, duration: 200, hand: 'lh' }, // B3
        { midi: 64, onset: 1680, duration: 200, hand: 'lh' }, // E4
        { midi: 57, onset: 2160, duration: 460, hand: 'lh' }, // A3
        { midi: 60, onset: 2160, duration: 460, hand: 'lh' }, // C4
        { midi: 64, onset: 2160, duration: 460, hand: 'lh' }, // E4
        { midi: 57, onset: 2640, duration: 200, hand: 'lh' }, // A3
        { midi: 60, onset: 2640, duration: 200, hand: 'lh' }, // C4
        { midi: 64, onset: 2640, duration: 200, hand: 'lh' }, // E4
        { midi: 57, onset: 3120, duration: 200, hand: 'lh' }, // A3
        { midi: 60, onset: 3120, duration: 200, hand: 'lh' }, // C4
        { midi: 64, onset: 3120, duration: 200, hand: 'lh' }, // E4
        { midi: 57, onset: 3600, duration: 200, hand: 'lh' }, // A3
        { midi: 60, onset: 3600, duration: 200, hand: 'lh' }, // C4
        { midi: 64, onset: 3600, duration: 200, hand: 'lh' }, // E4
        { midi: 57, onset: 4080, duration: 460, hand: 'lh' }, // A3
        { midi: 59, onset: 4080, duration: 460, hand: 'lh' }, // B3
        { midi: 63, onset: 4080, duration: 460, hand: 'lh' }, // D♯4
        { midi: 57, onset: 4560, duration: 200, hand: 'lh' }, // A3
        { midi: 59, onset: 4560, duration: 200, hand: 'lh' }, // B3
        { midi: 63, onset: 4560, duration: 200, hand: 'lh' }, // D♯4
        { midi: 57, onset: 5040, duration: 200, hand: 'lh' }, // A3
        { midi: 59, onset: 5040, duration: 200, hand: 'lh' }, // B3
        { midi: 63, onset: 5040, duration: 200, hand: 'lh' }, // D♯4
        { midi: 57, onset: 5520, duration: 200, hand: 'lh' }, // A3
        { midi: 59, onset: 5520, duration: 200, hand: 'lh' }, // B3
        { midi: 63, onset: 5520, duration: 200, hand: 'lh' }, // D♯4
        { midi: 55, onset: 6000, duration: 460, hand: 'lh' }, // G3
        { midi: 59, onset: 6000, duration: 460, hand: 'lh' }, // B3
        { midi: 64, onset: 6000, duration: 460, hand: 'lh' }, // E4
        { midi: 55, onset: 6480, duration: 200, hand: 'lh' }, // G3
        { midi: 59, onset: 6480, duration: 200, hand: 'lh' }, // B3
        { midi: 64, onset: 6480, duration: 200, hand: 'lh' }, // E4
        { midi: 55, onset: 6960, duration: 200, hand: 'lh' }, // G3
        { midi: 59, onset: 6960, duration: 200, hand: 'lh' }, // B3
        { midi: 64, onset: 6960, duration: 200, hand: 'lh' }, // E4
        { midi: 55, onset: 7440, duration: 200, hand: 'lh' }, // G3
        { midi: 59, onset: 7440, duration: 200, hand: 'lh' }, // B3
        { midi: 64, onset: 7440, duration: 200, hand: 'lh' }, // E4
        { midi: 71, onset: 0, duration: 460, hand: 'rh' }, // B4
        { midi: 79, onset: 480, duration: 940, hand: 'rh' }, // G5
        { midi: 78, onset: 1440, duration: 460, hand: 'rh' }, // F♯5
        { midi: 76, onset: 1920, duration: 940, hand: 'rh' }, // E5
        { midi: 72, onset: 2880, duration: 460, hand: 'rh' }, // C5
        { midi: 69, onset: 3360, duration: 460, hand: 'rh' }, // A4
        { midi: 71, onset: 3840, duration: 460, hand: 'rh' }, // B4
        { midi: 73, onset: 4320, duration: 460, hand: 'rh' }, // C♯5
        { midi: 75, onset: 4800, duration: 940, hand: 'rh' }, // D♯5
        { midi: 76, onset: 5760, duration: 1860, hand: 'rh' }, // E5
      ],
    },
  ],
};

// ── L3: Bossa & Samba, Tango & Afro-Cuban ──

const latinL3SectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    {
      stepNumber: 1,
      module: 'latin_l3',
      section: 'A',
      subsection: 'A1: Arpeggios (Em9 & Am9)',
      activity: 'A1.1: Em9 Arpeggio, Up & Down (Out of Time)',
      direction:
        'E minor 9, one note at a time: E–G–B–D–F♯ and back down. The 7th (D) and the 9th (F♯) are the bossa colours.',
      assessment: 'pitch_order',
      tag: 'latin:l3_em9_arp_oot | latin',
      styleRef: 'l3a',
      successFeedback: 'Five notes — the whole bossa chord.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
      scaleId: 'aeolian',
      chordSymbols: ['Em9'],
      targetNotes: [
        { midi: 64, onset: 0, duration: 460 }, // E4
        { midi: 67, onset: 480, duration: 460 }, // G4
        { midi: 71, onset: 960, duration: 460 }, // B4
        { midi: 74, onset: 1440, duration: 460 }, // D5
        { midi: 78, onset: 1920, duration: 460 }, // F♯5
        { midi: 74, onset: 2400, duration: 460 }, // D5
        { midi: 71, onset: 2880, duration: 460 }, // B4
        { midi: 67, onset: 3360, duration: 460 }, // G4
        { midi: 64, onset: 3840, duration: 460 }, // E4
      ],
    },
    {
      stepNumber: 2,
      module: 'latin_l3',
      section: 'A',
      subsection: 'A1: Arpeggios (Em9 & Am9)',
      activity: 'A1.2: Am9 Arpeggio, Up & Down (Out of Time)',
      direction: 'A minor 9: A–C–E–G–B and back down.',
      assessment: 'pitch_order',
      tag: 'latin:l3_am9_arp_oot | latin',
      styleRef: 'l3a',
      successFeedback: 'B on top — the 9th of A minor.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
      scaleId: 'aeolian',
      chordSymbols: ['Am9'],
      targetNotes: [
        { midi: 69, onset: 0, duration: 460 }, // A4
        { midi: 72, onset: 480, duration: 460 }, // C5
        { midi: 76, onset: 960, duration: 460 }, // E5
        { midi: 79, onset: 1440, duration: 460 }, // G5
        { midi: 83, onset: 1920, duration: 460 }, // B5
        { midi: 79, onset: 2400, duration: 460 }, // G5
        { midi: 76, onset: 2880, duration: 460 }, // E5
        { midi: 72, onset: 3360, duration: 460 }, // C5
        { midi: 69, onset: 3840, duration: 460 }, // A4
      ],
    },
    {
      stepNumber: 3,
      module: 'latin_l3',
      section: 'A',
      subsection: 'A1: Arpeggios (Em9 & Am9)',
      activity: 'A1.3: Arpeggios Through the Changes (In Time)',
      direction:
        'Up and down each chord in eighths — E minor 9, A minor 9, B7 — then land on E. Each chord starts a step from where the last one ended.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l3_bossa_arps_it | latin',
      styleRef: 'l3a',
      successFeedback: 'Through the changes, chord tone by chord tone.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
      scaleId: 'aeolian',
      chordSymbols: ['Em9', 'Am9', 'B7', 'Em9'],
      tempo: 90,
      targetNotes: [
        { midi: 64, onset: 0, duration: 220 }, // E4
        { midi: 67, onset: 240, duration: 220 }, // G4
        { midi: 71, onset: 480, duration: 220 }, // B4
        { midi: 74, onset: 720, duration: 220 }, // D5
        { midi: 78, onset: 960, duration: 220 }, // F♯5
        { midi: 74, onset: 1200, duration: 220 }, // D5
        { midi: 71, onset: 1440, duration: 220 }, // B4
        { midi: 67, onset: 1680, duration: 220 }, // G4
        { midi: 69, onset: 1920, duration: 220 }, // A4
        { midi: 72, onset: 2160, duration: 220 }, // C5
        { midi: 76, onset: 2400, duration: 220 }, // E5
        { midi: 79, onset: 2640, duration: 220 }, // G5
        { midi: 83, onset: 2880, duration: 220 }, // B5
        { midi: 79, onset: 3120, duration: 220 }, // G5
        { midi: 76, onset: 3360, duration: 220 }, // E5
        { midi: 72, onset: 3600, duration: 220 }, // C5
        { midi: 71, onset: 3840, duration: 220 }, // B4
        { midi: 75, onset: 4080, duration: 220 }, // D♯5
        { midi: 78, onset: 4320, duration: 220 }, // F♯5
        { midi: 81, onset: 4560, duration: 220 }, // A5
        { midi: 78, onset: 4800, duration: 220 }, // F♯5
        { midi: 75, onset: 5040, duration: 220 }, // D♯5
        { midi: 71, onset: 5280, duration: 220 }, // B4
        { midi: 69, onset: 5520, duration: 220 }, // A4
        { midi: 67, onset: 5760, duration: 460 }, // G4
        { midi: 64, onset: 6240, duration: 1380 }, // E4
      ],
    },
    {
      stepNumber: 4,
      module: 'latin_l3',
      section: 'A',
      subsection: 'A2: Bossa Melodies',
      activity: 'A2.1: 4-Note Bossa Phrase',
      direction:
        'F♯ — the 9th — for two beats, then E, D, and B pushed onto the "and" of 4 and held right through A minor.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l3_bossa_melody_4note | latin',
      styleRef: 'l3a',
      successFeedback: 'Long notes and an early arrival: bossa.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
      scaleId: 'aeolian',
      chordSymbols: ['Em9', 'Am9', 'B7', 'Em9'],
      tempo: 110,
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 78, onset: 0, duration: 940 }, // F♯5
        { midi: 76, onset: 960, duration: 220 }, // E5
        { midi: 74, onset: 1200, duration: 460 }, // D5
        { midi: 71, onset: 1680, duration: 2100 }, // B4
      ],
    },
    {
      stepNumber: 5,
      module: 'latin_l3',
      section: 'A',
      subsection: 'A2: Bossa Melodies',
      activity: 'A2.2: 8-Note Bossa Melody',
      direction:
        'The phrase twice: D the first time, D♯ the second — because the second time the chord is B7.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l3_bossa_melody_8note | latin',
      styleRef: 'l3a',
      successFeedback: 'One note changes, and the melody heads home.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
      scaleId: 'aeolian',
      chordSymbols: ['Em9', 'Am9', 'B7', 'Em9'],
      tempo: 110,
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 78, onset: 0, duration: 940 }, // F♯5
        { midi: 76, onset: 960, duration: 220 }, // E5
        { midi: 74, onset: 1200, duration: 460 }, // D5
        { midi: 71, onset: 1680, duration: 2100 }, // B4
        { midi: 78, onset: 3840, duration: 940 }, // F♯5
        { midi: 76, onset: 4800, duration: 220 }, // E5
        { midi: 75, onset: 5040, duration: 460 }, // D♯5
        { midi: 71, onset: 5520, duration: 2100 }, // B4
      ],
    },
    {
      stepNumber: 6,
      module: 'latin_l3',
      section: 'A',
      subsection: 'A3: Scale (E Harmonic Minor, Two Octaves)',
      activity: 'A3.1: E Harmonic Minor, Two Octaves Ascending (Out of Time)',
      direction:
        'E Harmonic Minor across two octaves, from the E below middle C: E–F♯–G–A–B–C–D♯–E, twice.',
      assessment: 'pitch_order',
      tag: 'latin:l3_harm_2oct_asc_oot | latin',
      styleRef: 'l3b',
      successFeedback: 'Two octaves — room for a tango to sweep.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 11],
      scaleId: 'harmonic_minor',
      targetNotes: [
        { midi: 52, onset: 0, duration: 460 }, // E3
        { midi: 54, onset: 480, duration: 460 }, // F♯3
        { midi: 55, onset: 960, duration: 460 }, // G3
        { midi: 57, onset: 1440, duration: 460 }, // A3
        { midi: 59, onset: 1920, duration: 460 }, // B3
        { midi: 60, onset: 2400, duration: 460 }, // C4
        { midi: 63, onset: 2880, duration: 460 }, // D♯4
        { midi: 64, onset: 3360, duration: 460 }, // E4
        { midi: 66, onset: 3840, duration: 460 }, // F♯4
        { midi: 67, onset: 4320, duration: 460 }, // G4
        { midi: 69, onset: 4800, duration: 460 }, // A4
        { midi: 71, onset: 5280, duration: 460 }, // B4
        { midi: 72, onset: 5760, duration: 460 }, // C5
        { midi: 75, onset: 6240, duration: 460 }, // D♯5
        { midi: 76, onset: 6720, duration: 460 }, // E5
      ],
    },
    {
      stepNumber: 7,
      module: 'latin_l3',
      section: 'A',
      subsection: 'A3: Scale (E Harmonic Minor, Two Octaves)',
      activity: 'A3.2: E Harmonic Minor, Two Octaves Descending (Out of Time)',
      direction: 'Now all the way back down.',
      assessment: 'pitch_order',
      tag: 'latin:l3_harm_2oct_desc_oot | latin',
      styleRef: 'l3b',
      successFeedback: 'D♯ twice on the way down — it always leans on E.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 11],
      scaleId: 'harmonic_minor',
      targetNotes: [
        { midi: 76, onset: 0, duration: 460 }, // E5
        { midi: 75, onset: 480, duration: 460 }, // D♯5
        { midi: 72, onset: 960, duration: 460 }, // C5
        { midi: 71, onset: 1440, duration: 460 }, // B4
        { midi: 69, onset: 1920, duration: 460 }, // A4
        { midi: 67, onset: 2400, duration: 460 }, // G4
        { midi: 66, onset: 2880, duration: 460 }, // F♯4
        { midi: 64, onset: 3360, duration: 460 }, // E4
        { midi: 63, onset: 3840, duration: 460 }, // D♯4
        { midi: 60, onset: 4320, duration: 460 }, // C4
        { midi: 59, onset: 4800, duration: 460 }, // B3
        { midi: 57, onset: 5280, duration: 460 }, // A3
        { midi: 55, onset: 5760, duration: 460 }, // G3
        { midi: 54, onset: 6240, duration: 460 }, // F♯3
        { midi: 52, onset: 6720, duration: 460 }, // E3
      ],
    },
    {
      stepNumber: 8,
      module: 'latin_l3',
      section: 'A',
      subsection: 'A3: Scale (E Harmonic Minor, Two Octaves)',
      activity:
        'A3.3: E Harmonic Minor, Two Octaves — Up & Down in Eighths (In Time)',
      direction: 'Up two octaves and back, two notes per beat.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l3_harm_2oct_updown_it | latin',
      styleRef: 'l3b',
      successFeedback: 'Two octaves in time — tango-ready.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 11],
      scaleId: 'harmonic_minor',
      tempo: 90,
      targetNotes: [
        { midi: 52, onset: 0, duration: 220 }, // E3
        { midi: 54, onset: 240, duration: 220 }, // F♯3
        { midi: 55, onset: 480, duration: 220 }, // G3
        { midi: 57, onset: 720, duration: 220 }, // A3
        { midi: 59, onset: 960, duration: 220 }, // B3
        { midi: 60, onset: 1200, duration: 220 }, // C4
        { midi: 63, onset: 1440, duration: 220 }, // D♯4
        { midi: 64, onset: 1680, duration: 220 }, // E4
        { midi: 66, onset: 1920, duration: 220 }, // F♯4
        { midi: 67, onset: 2160, duration: 220 }, // G4
        { midi: 69, onset: 2400, duration: 220 }, // A4
        { midi: 71, onset: 2640, duration: 220 }, // B4
        { midi: 72, onset: 2880, duration: 220 }, // C5
        { midi: 75, onset: 3120, duration: 220 }, // D♯5
        { midi: 76, onset: 3360, duration: 220 }, // E5
        { midi: 75, onset: 3600, duration: 220 }, // D♯5
        { midi: 72, onset: 3840, duration: 220 }, // C5
        { midi: 71, onset: 4080, duration: 220 }, // B4
        { midi: 69, onset: 4320, duration: 220 }, // A4
        { midi: 67, onset: 4560, duration: 220 }, // G4
        { midi: 66, onset: 4800, duration: 220 }, // F♯4
        { midi: 64, onset: 5040, duration: 220 }, // E4
        { midi: 63, onset: 5280, duration: 220 }, // D♯4
        { midi: 60, onset: 5520, duration: 220 }, // C4
        { midi: 59, onset: 5760, duration: 220 }, // B3
        { midi: 57, onset: 6000, duration: 220 }, // A3
        { midi: 55, onset: 6240, duration: 220 }, // G3
        { midi: 54, onset: 6480, duration: 220 }, // F♯3
        { midi: 52, onset: 6720, duration: 220 }, // E3
      ],
    },
    {
      stepNumber: 9,
      module: 'latin_l3',
      section: 'A',
      subsection: 'A4: Tango Melodies',
      activity: 'A4.1: 5-Note Tango Motif',
      direction:
        'Start on the "and" of 1: C falls to B — the tango sigh — then G, F♯, and E, held.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l3_tango_melody_5note | latin',
      styleRef: 'l3b',
      successFeedback: 'C sighing onto B: the sound of tango.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 11],
      scaleId: 'harmonic_minor',
      chordSymbols: ['Emadd9', 'Am6', 'B7', 'Emadd9'],
      tempo: 100,
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 72, onset: 240, duration: 220 }, // C5
        { midi: 71, onset: 480, duration: 220 }, // B4
        { midi: 79, onset: 720, duration: 220 }, // G5
        { midi: 78, onset: 960, duration: 220 }, // F♯5
        { midi: 76, onset: 1200, duration: 700 }, // E5
      ],
    },
    {
      stepNumber: 10,
      module: 'latin_l3',
      section: 'A',
      subsection: 'A4: Tango Melodies',
      activity: 'A4.2: The Tango Line — E Minor and A Minor',
      direction:
        'The band guitarist\'s line, up an octave. Each bar starts on the "and" of 1, with two quick sixteenths on beat 3.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l3_tango_melody_2bar | latin',
      styleRef: 'l3b',
      successFeedback: "Two bars of tango, in the guitarist's own phrasing.",
      scaleIntervals: [0, 2, 3, 5, 7, 8, 11],
      scaleId: 'harmonic_minor',
      chordSymbols: ['Emadd9', 'Am6', 'B7', 'Emadd9'],
      tempo: 100,
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 72, onset: 240, duration: 220 }, // C5
        { midi: 71, onset: 480, duration: 220 }, // B4
        { midi: 79, onset: 720, duration: 220 }, // G5
        { midi: 78, onset: 960, duration: 110 }, // F♯5
        { midi: 76, onset: 1080, duration: 110 }, // E5
        { midi: 79, onset: 1200, duration: 220 }, // G5
        { midi: 72, onset: 1440, duration: 220 }, // C5
        { midi: 71, onset: 1680, duration: 220 }, // B4
        { midi: 72, onset: 2160, duration: 220 }, // C5
        { midi: 69, onset: 2400, duration: 220 }, // A4
        { midi: 78, onset: 2640, duration: 220 }, // F♯5
        { midi: 76, onset: 2880, duration: 110 }, // E5
        { midi: 72, onset: 3000, duration: 110 }, // C5
        { midi: 78, onset: 3120, duration: 220 }, // F♯5
        { midi: 71, onset: 3360, duration: 220 }, // B4
        { midi: 69, onset: 3600, duration: 220 }, // A4
      ],
    },
    {
      stepNumber: 11,
      module: 'latin_l3',
      section: 'A',
      subsection: 'A4: Tango Melodies',
      activity: 'A4.3: The Tango Line — Full Progression',
      direction: 'All four bars. Over B7 the quick pair is E–D♯.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l3_tango_melody_4bar | latin',
      styleRef: 'l3b',
      successFeedback: 'The whole line — the guitarist would nod.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 11],
      scaleId: 'harmonic_minor',
      chordSymbols: ['Emadd9', 'Am6', 'B7', 'Emadd9'],
      tempo: 100,
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 72, onset: 240, duration: 220 }, // C5
        { midi: 71, onset: 480, duration: 220 }, // B4
        { midi: 79, onset: 720, duration: 220 }, // G5
        { midi: 78, onset: 960, duration: 110 }, // F♯5
        { midi: 76, onset: 1080, duration: 110 }, // E5
        { midi: 79, onset: 1200, duration: 220 }, // G5
        { midi: 72, onset: 1440, duration: 220 }, // C5
        { midi: 71, onset: 1680, duration: 220 }, // B4
        { midi: 72, onset: 2160, duration: 220 }, // C5
        { midi: 69, onset: 2400, duration: 220 }, // A4
        { midi: 78, onset: 2640, duration: 220 }, // F♯5
        { midi: 76, onset: 2880, duration: 110 }, // E5
        { midi: 72, onset: 3000, duration: 110 }, // C5
        { midi: 78, onset: 3120, duration: 220 }, // F♯5
        { midi: 71, onset: 3360, duration: 220 }, // B4
        { midi: 69, onset: 3600, duration: 220 }, // A4
        { midi: 71, onset: 4080, duration: 220 }, // B4
        { midi: 69, onset: 4320, duration: 220 }, // A4
        { midi: 78, onset: 4560, duration: 220 }, // F♯5
        { midi: 76, onset: 4800, duration: 110 }, // E5
        { midi: 75, onset: 4920, duration: 110 }, // D♯5
        { midi: 78, onset: 5040, duration: 220 }, // F♯5
        { midi: 71, onset: 5280, duration: 220 }, // B4
        { midi: 69, onset: 5520, duration: 220 }, // A4
        { midi: 72, onset: 6000, duration: 220 }, // C5
        { midi: 71, onset: 6240, duration: 220 }, // B4
        { midi: 79, onset: 6480, duration: 220 }, // G5
        { midi: 78, onset: 6720, duration: 110 }, // F♯5
        { midi: 76, onset: 6840, duration: 110 }, // E5
        { midi: 79, onset: 6960, duration: 220 }, // G5
        { midi: 72, onset: 7200, duration: 220 }, // C5
        { midi: 71, onset: 7440, duration: 460 }, // B4
      ],
    },
    {
      stepNumber: 12,
      module: 'latin_l3',
      section: 'A',
      subsection: 'A5: The Clave',
      activity: 'A5.1: Rumba Clave 2-3, One Note (In Time)',
      direction:
        'The clave on E: two notes in the first bar (beats 2 and 3), three in the second (1, the "and" of 2, the "and" of 4). That is 2-3 rumba clave.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l3_clave_23 | latin',
      styleRef: 'l3c',
      successFeedback: 'Two, then three — salsa is built on that.',
      tempo: 120,
      targetNotes: [
        { midi: 64, onset: 480, duration: 220 }, // E4
        { midi: 64, onset: 960, duration: 220 }, // E4
        { midi: 64, onset: 1920, duration: 220 }, // E4
        { midi: 64, onset: 2640, duration: 220 }, // E4
        { midi: 64, onset: 3600, duration: 220 }, // E4
        { midi: 64, onset: 4320, duration: 220 }, // E4
        { midi: 64, onset: 4800, duration: 220 }, // E4
        { midi: 64, onset: 5760, duration: 220 }, // E4
        { midi: 64, onset: 6480, duration: 220 }, // E4
        { midi: 64, onset: 7440, duration: 220 }, // E4
      ],
    },
    {
      stepNumber: 13,
      module: 'latin_l3',
      section: 'A',
      subsection: 'A5: The Clave',
      activity: 'A5.2: Son Clave 3-2, One Note (In Time)',
      direction:
        'Now start with the three: 1, the "and" of 2, 4 — then 2 and 3. Son clave puts the last of the three on 4, not its "and".',
      assessment: 'pitch_order_timing',
      tag: 'latin:l3_clave_32 | latin',
      styleRef: 'l3c',
      successFeedback: '3-2 son clave — the other side first.',
      tempo: 120,
      targetNotes: [
        { midi: 64, onset: 0, duration: 220 }, // E4
        { midi: 64, onset: 720, duration: 220 }, // E4
        { midi: 64, onset: 1440, duration: 220 }, // E4
        { midi: 64, onset: 2400, duration: 220 }, // E4
        { midi: 64, onset: 2880, duration: 220 }, // E4
        { midi: 64, onset: 3840, duration: 220 }, // E4
        { midi: 64, onset: 4560, duration: 220 }, // E4
        { midi: 64, onset: 5280, duration: 220 }, // E4
        { midi: 64, onset: 6240, duration: 220 }, // E4
        { midi: 64, onset: 6720, duration: 220 }, // E4
      ],
    },
    {
      stepNumber: 14,
      module: 'latin_l3',
      section: 'A',
      subsection: 'A6: Salsa Coros',
      activity: 'A6.1: 5-Note Coro on the Clave (2-3)',
      direction:
        'Sing the clave: B and E on beats 2 and 3, then E, C, A on 1, the "and" of 2, and the "and" of 4.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l3_coro_23_5note | latin',
      styleRef: 'l3c',
      successFeedback: 'A coro that sits right on the clave.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 11],
      scaleId: 'harmonic_minor',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 160,
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 71, onset: 480, duration: 460 }, // B4
        { midi: 76, onset: 960, duration: 460 }, // E5
        { midi: 76, onset: 1920, duration: 460 }, // E5
        { midi: 72, onset: 2640, duration: 940 }, // C5
        { midi: 69, onset: 3600, duration: 940 }, // A4
      ],
    },
    {
      stepNumber: 15,
      module: 'latin_l3',
      section: 'A',
      subsection: 'A6: Salsa Coros',
      activity: 'A6.2: 10-Note Coro (2-3)',
      direction:
        'The coro and its answer: over B7, B and D♯, then home with E, B, G.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l3_coro_23_10note | latin',
      styleRef: 'l3c',
      successFeedback: 'Call and answer, locked to the clave.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 11],
      scaleId: 'harmonic_minor',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 160,
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 71, onset: 480, duration: 460 }, // B4
        { midi: 76, onset: 960, duration: 460 }, // E5
        { midi: 76, onset: 1920, duration: 460 }, // E5
        { midi: 72, onset: 2640, duration: 940 }, // C5
        { midi: 69, onset: 3600, duration: 940 }, // A4
        { midi: 71, onset: 4320, duration: 460 }, // B4
        { midi: 75, onset: 4800, duration: 460 }, // D♯5
        { midi: 76, onset: 5760, duration: 460 }, // E5
        { midi: 71, onset: 6480, duration: 940 }, // B4
        { midi: 67, onset: 7440, duration: 940 }, // G4
      ],
    },
    {
      stepNumber: 16,
      module: 'latin_l3',
      section: 'A',
      subsection: 'A6: Salsa Coros',
      activity: 'A6.3: 10-Note Coro (3-2)',
      direction:
        'In 3-2 the coro starts on the three side: E, B, G on 1, the "and" of 2, and 4 — then A and C on 2 and 3.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l3_coro_32_10note | latin',
      styleRef: 'l3c',
      successFeedback:
        'The clave turned around, and the melody turned with it.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 11],
      scaleId: 'harmonic_minor',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 160,
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 76, onset: 0, duration: 460 }, // E5
        { midi: 71, onset: 720, duration: 700 }, // B4
        { midi: 67, onset: 1440, duration: 460 }, // G4
        { midi: 69, onset: 2400, duration: 460 }, // A4
        { midi: 72, onset: 2880, duration: 940 }, // C5
        { midi: 75, onset: 3840, duration: 460 }, // D♯5
        { midi: 71, onset: 4560, duration: 700 }, // B4
        { midi: 66, onset: 5280, duration: 460 }, // F♯4
        { midi: 67, onset: 6240, duration: 460 }, // G4
        { midi: 64, onset: 6720, duration: 940 }, // E4
      ],
    },
  ],
};

const latinL3SectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    {
      stepNumber: 17,
      module: 'latin_l3',
      section: 'B',
      subsection: 'B1: Bossa Chords',
      activity: 'B1.1: Rootless Voicings, Voice-Led (Out of Time)',
      direction:
        'Four notes, no root — the bass has it: G–B–D–F♯, G–B–C–E, F♯–A–B–D♯, F♯–G–B–D. From A minor 9 to B7 every finger slides down a step.',
      assessment: 'pitch_order',
      tag: 'latin:l3_bossa_voicings | latin',
      styleRef: 'l3a',
      successFeedback: 'Rootless voicings: the sound of bossa piano.',
      chordSymbols: ['Em9', 'Am9', 'B7', 'Em9'],
      targetNotes: [
        { midi: 55, onset: 0, duration: 1800 }, // G3
        { midi: 59, onset: 0, duration: 1800 }, // B3
        { midi: 62, onset: 0, duration: 1800 }, // D4
        { midi: 66, onset: 0, duration: 1800 }, // F♯4
        { midi: 55, onset: 1920, duration: 1800 }, // G3
        { midi: 59, onset: 1920, duration: 1800 }, // B3
        { midi: 60, onset: 1920, duration: 1800 }, // C4
        { midi: 64, onset: 1920, duration: 1800 }, // E4
        { midi: 54, onset: 3840, duration: 1800 }, // F♯3
        { midi: 57, onset: 3840, duration: 1800 }, // A3
        { midi: 59, onset: 3840, duration: 1800 }, // B3
        { midi: 63, onset: 3840, duration: 1800 }, // D♯4
        { midi: 54, onset: 5760, duration: 1800 }, // F♯3
        { midi: 55, onset: 5760, duration: 1800 }, // G3
        { midi: 59, onset: 5760, duration: 1800 }, // B3
        { midi: 62, onset: 5760, duration: 1800 }, // D4
      ],
    },
    {
      stepNumber: 18,
      module: 'latin_l3',
      section: 'B',
      subsection: 'B1: Bossa Chords',
      activity: 'B1.2: Bossa Comping, One Chord (In Time)',
      direction: 'Short on 1, held on 2, then the "and" of 3 — the bossa push.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l3_bossa_comp_one | latin',
      styleRef: 'l3a',
      successFeedback: 'The push on the "and" of 3 is the whole feel.',
      chordSymbols: ['Em9'],
      tempo: 100,
      targetNotes: [
        { midi: 55, onset: 0, duration: 220 }, // G3
        { midi: 59, onset: 0, duration: 220 }, // B3
        { midi: 62, onset: 0, duration: 220 }, // D4
        { midi: 66, onset: 0, duration: 220 }, // F♯4
        { midi: 55, onset: 480, duration: 460 }, // G3
        { midi: 59, onset: 480, duration: 460 }, // B3
        { midi: 62, onset: 480, duration: 460 }, // D4
        { midi: 66, onset: 480, duration: 460 }, // F♯4
        { midi: 55, onset: 1200, duration: 460 }, // G3
        { midi: 59, onset: 1200, duration: 460 }, // B3
        { midi: 62, onset: 1200, duration: 460 }, // D4
        { midi: 66, onset: 1200, duration: 460 }, // F♯4
        { midi: 55, onset: 1920, duration: 220 }, // G3
        { midi: 59, onset: 1920, duration: 220 }, // B3
        { midi: 62, onset: 1920, duration: 220 }, // D4
        { midi: 66, onset: 1920, duration: 220 }, // F♯4
        { midi: 55, onset: 2400, duration: 460 }, // G3
        { midi: 59, onset: 2400, duration: 460 }, // B3
        { midi: 62, onset: 2400, duration: 460 }, // D4
        { midi: 66, onset: 2400, duration: 460 }, // F♯4
        { midi: 55, onset: 3120, duration: 460 }, // G3
        { midi: 59, onset: 3120, duration: 460 }, // B3
        { midi: 62, onset: 3120, duration: 460 }, // D4
        { midi: 66, onset: 3120, duration: 460 }, // F♯4
      ],
    },
    {
      stepNumber: 19,
      module: 'latin_l3',
      section: 'B',
      subsection: 'B1: Bossa Chords',
      activity: 'B1.3: Play-Along — Bossa',
      direction: 'The same rhythm through the changes.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l3_bossa_play | latin',
      styleRef: 'l3a',
      successFeedback: 'Soft, steady, a little early — bossa nova.',
      chordSymbols: ['Em9', 'Am9', 'B7', 'Em9'],
      tempo: 110,
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 55, onset: 0, duration: 220 }, // G3
        { midi: 59, onset: 0, duration: 220 }, // B3
        { midi: 62, onset: 0, duration: 220 }, // D4
        { midi: 66, onset: 0, duration: 220 }, // F♯4
        { midi: 55, onset: 480, duration: 460 }, // G3
        { midi: 59, onset: 480, duration: 460 }, // B3
        { midi: 62, onset: 480, duration: 460 }, // D4
        { midi: 66, onset: 480, duration: 460 }, // F♯4
        { midi: 55, onset: 1200, duration: 460 }, // G3
        { midi: 59, onset: 1200, duration: 460 }, // B3
        { midi: 62, onset: 1200, duration: 460 }, // D4
        { midi: 66, onset: 1200, duration: 460 }, // F♯4
        { midi: 55, onset: 1920, duration: 220 }, // G3
        { midi: 59, onset: 1920, duration: 220 }, // B3
        { midi: 60, onset: 1920, duration: 220 }, // C4
        { midi: 64, onset: 1920, duration: 220 }, // E4
        { midi: 55, onset: 2400, duration: 460 }, // G3
        { midi: 59, onset: 2400, duration: 460 }, // B3
        { midi: 60, onset: 2400, duration: 460 }, // C4
        { midi: 64, onset: 2400, duration: 460 }, // E4
        { midi: 55, onset: 3120, duration: 460 }, // G3
        { midi: 59, onset: 3120, duration: 460 }, // B3
        { midi: 60, onset: 3120, duration: 460 }, // C4
        { midi: 64, onset: 3120, duration: 460 }, // E4
        { midi: 54, onset: 3840, duration: 220 }, // F♯3
        { midi: 57, onset: 3840, duration: 220 }, // A3
        { midi: 59, onset: 3840, duration: 220 }, // B3
        { midi: 63, onset: 3840, duration: 220 }, // D♯4
        { midi: 54, onset: 4320, duration: 460 }, // F♯3
        { midi: 57, onset: 4320, duration: 460 }, // A3
        { midi: 59, onset: 4320, duration: 460 }, // B3
        { midi: 63, onset: 4320, duration: 460 }, // D♯4
        { midi: 54, onset: 5040, duration: 460 }, // F♯3
        { midi: 57, onset: 5040, duration: 460 }, // A3
        { midi: 59, onset: 5040, duration: 460 }, // B3
        { midi: 63, onset: 5040, duration: 460 }, // D♯4
        { midi: 54, onset: 5760, duration: 220 }, // F♯3
        { midi: 55, onset: 5760, duration: 220 }, // G3
        { midi: 59, onset: 5760, duration: 220 }, // B3
        { midi: 62, onset: 5760, duration: 220 }, // D4
        { midi: 54, onset: 6240, duration: 460 }, // F♯3
        { midi: 55, onset: 6240, duration: 460 }, // G3
        { midi: 59, onset: 6240, duration: 460 }, // B3
        { midi: 62, onset: 6240, duration: 460 }, // D4
        { midi: 54, onset: 6960, duration: 460 }, // F♯3
        { midi: 55, onset: 6960, duration: 460 }, // G3
        { midi: 59, onset: 6960, duration: 460 }, // B3
        { midi: 62, onset: 6960, duration: 460 }, // D4
      ],
    },
    {
      stepNumber: 20,
      module: 'latin_l3',
      section: 'B',
      subsection: 'B2: Tango Chords',
      activity: 'B2.1: Tango Voicings, Voice-Led (Out of Time)',
      direction:
        'F♯ is in every chord: F♯–G–B (E minor, added 9), F♯–A–C (A minor 6), D♯–F♯–B (B7), F♯–G–B.',
      assessment: 'pitch_order',
      tag: 'latin:l3_tango_voicings | latin',
      styleRef: 'l3b',
      successFeedback: 'One note held through the whole progression.',
      chordSymbols: ['Emadd9', 'Am6', 'B7', 'Emadd9'],
      targetNotes: [
        { midi: 66, onset: 0, duration: 1800 }, // F♯4
        { midi: 67, onset: 0, duration: 1800 }, // G4
        { midi: 71, onset: 0, duration: 1800 }, // B4
        { midi: 66, onset: 1920, duration: 1800 }, // F♯4
        { midi: 69, onset: 1920, duration: 1800 }, // A4
        { midi: 72, onset: 1920, duration: 1800 }, // C5
        { midi: 63, onset: 3840, duration: 1800 }, // D♯4
        { midi: 66, onset: 3840, duration: 1800 }, // F♯4
        { midi: 71, onset: 3840, duration: 1800 }, // B4
        { midi: 66, onset: 5760, duration: 1800 }, // F♯4
        { midi: 67, onset: 5760, duration: 1800 }, // G4
        { midi: 71, onset: 5760, duration: 1800 }, // B4
      ],
    },
    {
      stepNumber: 21,
      module: 'latin_l3',
      section: 'B',
      subsection: 'B2: Tango Chords',
      activity: 'B2.2: Tango Síncopa, One Chord (In Time)',
      direction:
        'Chords on 1, the "and" of 2, and 4 — the 3+3+2 you know from reggaeton, played heavy.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l3_tango_sincopa_one | latin',
      styleRef: 'l3b',
      successFeedback: 'The same rhythm, a different world.',
      chordSymbols: ['Emadd9'],
      tempo: 90,
      targetNotes: [
        { midi: 66, onset: 0, duration: 700 }, // F♯4
        { midi: 67, onset: 0, duration: 700 }, // G4
        { midi: 71, onset: 0, duration: 700 }, // B4
        { midi: 66, onset: 720, duration: 700 }, // F♯4
        { midi: 67, onset: 720, duration: 700 }, // G4
        { midi: 71, onset: 720, duration: 700 }, // B4
        { midi: 66, onset: 1440, duration: 460 }, // F♯4
        { midi: 67, onset: 1440, duration: 460 }, // G4
        { midi: 71, onset: 1440, duration: 460 }, // B4
        { midi: 66, onset: 1920, duration: 700 }, // F♯4
        { midi: 67, onset: 1920, duration: 700 }, // G4
        { midi: 71, onset: 1920, duration: 700 }, // B4
        { midi: 66, onset: 2640, duration: 700 }, // F♯4
        { midi: 67, onset: 2640, duration: 700 }, // G4
        { midi: 71, onset: 2640, duration: 700 }, // B4
        { midi: 66, onset: 3360, duration: 460 }, // F♯4
        { midi: 67, onset: 3360, duration: 460 }, // G4
        { midi: 71, onset: 3360, duration: 460 }, // B4
      ],
    },
    {
      stepNumber: 22,
      module: 'latin_l3',
      section: 'B',
      subsection: 'B2: Tango Chords',
      activity: 'B2.3: Play-Along — Tango Marcato',
      direction:
        'Accents on 1, the "and" of 2 and 4; light chords on 2 and the "and" of 3 in between.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l3_tango_play | latin',
      styleRef: 'l3b',
      successFeedback: 'Marcato — the bandoneón pulse.',
      chordSymbols: ['Emadd9', 'Am6', 'B7', 'Emadd9'],
      tempo: 100,
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 66, onset: 0, duration: 460 }, // F♯4
        { midi: 67, onset: 0, duration: 460 }, // G4
        { midi: 71, onset: 0, duration: 460 }, // B4
        { midi: 66, onset: 480, duration: 110 }, // F♯4
        { midi: 67, onset: 480, duration: 110 }, // G4
        { midi: 71, onset: 480, duration: 110 }, // B4
        { midi: 66, onset: 720, duration: 460 }, // F♯4
        { midi: 67, onset: 720, duration: 460 }, // G4
        { midi: 71, onset: 720, duration: 460 }, // B4
        { midi: 66, onset: 1200, duration: 110 }, // F♯4
        { midi: 67, onset: 1200, duration: 110 }, // G4
        { midi: 71, onset: 1200, duration: 110 }, // B4
        { midi: 66, onset: 1440, duration: 220 }, // F♯4
        { midi: 67, onset: 1440, duration: 220 }, // G4
        { midi: 71, onset: 1440, duration: 220 }, // B4
        { midi: 66, onset: 1920, duration: 460 }, // F♯4
        { midi: 69, onset: 1920, duration: 460 }, // A4
        { midi: 72, onset: 1920, duration: 460 }, // C5
        { midi: 66, onset: 2400, duration: 110 }, // F♯4
        { midi: 69, onset: 2400, duration: 110 }, // A4
        { midi: 72, onset: 2400, duration: 110 }, // C5
        { midi: 66, onset: 2640, duration: 460 }, // F♯4
        { midi: 69, onset: 2640, duration: 460 }, // A4
        { midi: 72, onset: 2640, duration: 460 }, // C5
        { midi: 66, onset: 3120, duration: 110 }, // F♯4
        { midi: 69, onset: 3120, duration: 110 }, // A4
        { midi: 72, onset: 3120, duration: 110 }, // C5
        { midi: 66, onset: 3360, duration: 220 }, // F♯4
        { midi: 69, onset: 3360, duration: 220 }, // A4
        { midi: 72, onset: 3360, duration: 220 }, // C5
        { midi: 63, onset: 3840, duration: 460 }, // D♯4
        { midi: 66, onset: 3840, duration: 460 }, // F♯4
        { midi: 71, onset: 3840, duration: 460 }, // B4
        { midi: 63, onset: 4320, duration: 110 }, // D♯4
        { midi: 66, onset: 4320, duration: 110 }, // F♯4
        { midi: 71, onset: 4320, duration: 110 }, // B4
        { midi: 63, onset: 4560, duration: 460 }, // D♯4
        { midi: 66, onset: 4560, duration: 460 }, // F♯4
        { midi: 71, onset: 4560, duration: 460 }, // B4
        { midi: 63, onset: 5040, duration: 110 }, // D♯4
        { midi: 66, onset: 5040, duration: 110 }, // F♯4
        { midi: 71, onset: 5040, duration: 110 }, // B4
        { midi: 63, onset: 5280, duration: 220 }, // D♯4
        { midi: 66, onset: 5280, duration: 220 }, // F♯4
        { midi: 71, onset: 5280, duration: 220 }, // B4
        { midi: 66, onset: 5760, duration: 460 }, // F♯4
        { midi: 67, onset: 5760, duration: 460 }, // G4
        { midi: 71, onset: 5760, duration: 460 }, // B4
        { midi: 66, onset: 6240, duration: 110 }, // F♯4
        { midi: 67, onset: 6240, duration: 110 }, // G4
        { midi: 71, onset: 6240, duration: 110 }, // B4
        { midi: 66, onset: 6480, duration: 460 }, // F♯4
        { midi: 67, onset: 6480, duration: 460 }, // G4
        { midi: 71, onset: 6480, duration: 460 }, // B4
        { midi: 66, onset: 6960, duration: 110 }, // F♯4
        { midi: 67, onset: 6960, duration: 110 }, // G4
        { midi: 71, onset: 6960, duration: 110 }, // B4
        { midi: 66, onset: 7200, duration: 220 }, // F♯4
        { midi: 67, onset: 7200, duration: 220 }, // G4
        { midi: 71, onset: 7200, duration: 220 }, // B4
      ],
    },
    {
      stepNumber: 23,
      module: 'latin_l3',
      section: 'B',
      subsection: 'B3: Afro-Cuban Montuno',
      activity: 'B3.1: Montuno 2-3, One Line (In Time)',
      direction:
        'The 2-3 montuno in one line. The E minor bar moves on and off the beat; the A minor bar is all "and"s, ending on D♯ to lead into B7.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l3_montuno_23_line | latin',
      styleRef: 'l3c',
      successFeedback: 'The montuno — the piano part that drives salsa.',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 120,
      targetNotes: [
        { midi: 64, onset: 0, duration: 200 }, // E4
        { midi: 67, onset: 480, duration: 200 }, // G4
        { midi: 71, onset: 720, duration: 200 }, // B4
        { midi: 64, onset: 960, duration: 200 }, // E4
        { midi: 67, onset: 1200, duration: 200 }, // G4
        { midi: 71, onset: 1200, duration: 200 }, // B4
        { midi: 64, onset: 1680, duration: 200 }, // E4
        { midi: 69, onset: 2160, duration: 200 }, // A4
        { midi: 72, onset: 2160, duration: 200 }, // C5
        { midi: 64, onset: 2640, duration: 200 }, // E4
        { midi: 69, onset: 3120, duration: 200 }, // A4
        { midi: 72, onset: 3120, duration: 200 }, // C5
        { midi: 63, onset: 3600, duration: 200 }, // D♯4
        { midi: 63, onset: 3840, duration: 200 }, // D♯4
        { midi: 66, onset: 4320, duration: 200 }, // F♯4
        { midi: 71, onset: 4560, duration: 200 }, // B4
        { midi: 63, onset: 4800, duration: 200 }, // D♯4
        { midi: 66, onset: 5040, duration: 200 }, // F♯4
        { midi: 71, onset: 5040, duration: 200 }, // B4
        { midi: 64, onset: 5520, duration: 200 }, // E4
        { midi: 67, onset: 6000, duration: 200 }, // G4
        { midi: 71, onset: 6000, duration: 200 }, // B4
        { midi: 64, onset: 6480, duration: 200 }, // E4
        { midi: 67, onset: 6960, duration: 200 }, // G4
        { midi: 71, onset: 6960, duration: 200 }, // B4
      ],
    },
    {
      stepNumber: 24,
      module: 'latin_l3',
      section: 'B',
      subsection: 'B3: Afro-Cuban Montuno',
      activity: 'B3.2: Montuno 2-3 in Octaves (Play-Along)',
      direction:
        'The same line in octaves — thumb and little finger, with the third in between where there is one — over the 2-3 band.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l3_montuno_23_play | latin',
      styleRef: 'l3c',
      successFeedback: 'Octaves at salsa speed: the montuno rings out.',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 160,
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 64, onset: 0, duration: 200 }, // E4
        { midi: 76, onset: 0, duration: 200 }, // E5
        { midi: 67, onset: 480, duration: 200 }, // G4
        { midi: 79, onset: 480, duration: 200 }, // G5
        { midi: 71, onset: 720, duration: 200 }, // B4
        { midi: 83, onset: 720, duration: 200 }, // B5
        { midi: 64, onset: 960, duration: 200 }, // E4
        { midi: 76, onset: 960, duration: 200 }, // E5
        { midi: 67, onset: 1200, duration: 200 }, // G4
        { midi: 71, onset: 1200, duration: 200 }, // B4
        { midi: 79, onset: 1200, duration: 200 }, // G5
        { midi: 64, onset: 1680, duration: 200 }, // E4
        { midi: 76, onset: 1680, duration: 200 }, // E5
        { midi: 69, onset: 2160, duration: 200 }, // A4
        { midi: 72, onset: 2160, duration: 200 }, // C5
        { midi: 81, onset: 2160, duration: 200 }, // A5
        { midi: 64, onset: 2640, duration: 200 }, // E4
        { midi: 76, onset: 2640, duration: 200 }, // E5
        { midi: 69, onset: 3120, duration: 200 }, // A4
        { midi: 72, onset: 3120, duration: 200 }, // C5
        { midi: 81, onset: 3120, duration: 200 }, // A5
        { midi: 63, onset: 3600, duration: 200 }, // D♯4
        { midi: 75, onset: 3600, duration: 200 }, // D♯5
        { midi: 63, onset: 3840, duration: 200 }, // D♯4
        { midi: 75, onset: 3840, duration: 200 }, // D♯5
        { midi: 66, onset: 4320, duration: 200 }, // F♯4
        { midi: 78, onset: 4320, duration: 200 }, // F♯5
        { midi: 71, onset: 4560, duration: 200 }, // B4
        { midi: 83, onset: 4560, duration: 200 }, // B5
        { midi: 63, onset: 4800, duration: 200 }, // D♯4
        { midi: 75, onset: 4800, duration: 200 }, // D♯5
        { midi: 66, onset: 5040, duration: 200 }, // F♯4
        { midi: 71, onset: 5040, duration: 200 }, // B4
        { midi: 78, onset: 5040, duration: 200 }, // F♯5
        { midi: 64, onset: 5520, duration: 200 }, // E4
        { midi: 76, onset: 5520, duration: 200 }, // E5
        { midi: 67, onset: 6000, duration: 200 }, // G4
        { midi: 71, onset: 6000, duration: 200 }, // B4
        { midi: 79, onset: 6000, duration: 200 }, // G5
        { midi: 64, onset: 6480, duration: 200 }, // E4
        { midi: 76, onset: 6480, duration: 200 }, // E5
        { midi: 67, onset: 6960, duration: 200 }, // G4
        { midi: 71, onset: 6960, duration: 200 }, // B4
        { midi: 79, onset: 6960, duration: 200 }, // G5
      ],
    },
    {
      stepNumber: 25,
      module: 'latin_l3',
      section: 'B',
      subsection: 'B3: Afro-Cuban Montuno',
      activity: 'B3.3: Montuno 3-2 in Octaves (Play-Along)',
      direction:
        'The 3-2 montuno: in the E minor and B7 bars the second note comes on the "and" of 1, not on 2.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l3_montuno_32_play | latin',
      styleRef: 'l3c',
      successFeedback: 'Both sides of the clave, in your right hand.',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 160,
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 64, onset: 0, duration: 200 }, // E4
        { midi: 76, onset: 0, duration: 200 }, // E5
        { midi: 67, onset: 240, duration: 200 }, // G4
        { midi: 79, onset: 240, duration: 200 }, // G5
        { midi: 71, onset: 480, duration: 200 }, // B4
        { midi: 83, onset: 480, duration: 200 }, // B5
        { midi: 64, onset: 720, duration: 200 }, // E4
        { midi: 76, onset: 720, duration: 200 }, // E5
        { midi: 67, onset: 1200, duration: 200 }, // G4
        { midi: 71, onset: 1200, duration: 200 }, // B4
        { midi: 79, onset: 1200, duration: 200 }, // G5
        { midi: 64, onset: 1680, duration: 200 }, // E4
        { midi: 76, onset: 1680, duration: 200 }, // E5
        { midi: 69, onset: 2160, duration: 200 }, // A4
        { midi: 72, onset: 2160, duration: 200 }, // C5
        { midi: 81, onset: 2160, duration: 200 }, // A5
        { midi: 64, onset: 2640, duration: 200 }, // E4
        { midi: 76, onset: 2640, duration: 200 }, // E5
        { midi: 69, onset: 3120, duration: 200 }, // A4
        { midi: 72, onset: 3120, duration: 200 }, // C5
        { midi: 81, onset: 3120, duration: 200 }, // A5
        { midi: 63, onset: 3600, duration: 200 }, // D♯4
        { midi: 75, onset: 3600, duration: 200 }, // D♯5
        { midi: 63, onset: 3840, duration: 200 }, // D♯4
        { midi: 75, onset: 3840, duration: 200 }, // D♯5
        { midi: 66, onset: 4080, duration: 200 }, // F♯4
        { midi: 78, onset: 4080, duration: 200 }, // F♯5
        { midi: 71, onset: 4320, duration: 200 }, // B4
        { midi: 83, onset: 4320, duration: 200 }, // B5
        { midi: 63, onset: 4560, duration: 200 }, // D♯4
        { midi: 75, onset: 4560, duration: 200 }, // D♯5
        { midi: 66, onset: 5040, duration: 200 }, // F♯4
        { midi: 71, onset: 5040, duration: 200 }, // B4
        { midi: 78, onset: 5040, duration: 200 }, // F♯5
        { midi: 64, onset: 5520, duration: 200 }, // E4
        { midi: 76, onset: 5520, duration: 200 }, // E5
        { midi: 67, onset: 6000, duration: 200 }, // G4
        { midi: 71, onset: 6000, duration: 200 }, // B4
        { midi: 79, onset: 6000, duration: 200 }, // G5
        { midi: 64, onset: 6480, duration: 200 }, // E4
        { midi: 76, onset: 6480, duration: 200 }, // E5
        { midi: 67, onset: 6960, duration: 200 }, // G4
        { midi: 71, onset: 6960, duration: 200 }, // B4
        { midi: 79, onset: 6960, duration: 200 }, // G5
        { midi: 64, onset: 7440, duration: 200 }, // E4
        { midi: 76, onset: 7440, duration: 200 }, // E5
      ],
    },
  ],
};

const latinL3SectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 26,
      module: 'latin_l3',
      section: 'C',
      subsection: 'C1: Bossa Bass',
      activity: 'C1.1: Bossa Bass, One Chord',
      direction:
        'Root on 1, the 5 below on the "and" of 2 and again on 3, root on the "and" of 4: E, B, B, E.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l3_bass_bossa_one | latin',
      styleRef: 'l3a',
      successFeedback: 'Root and 5 in the bossa rhythm, like the surdo drum.',
      chordSymbols: ['Em9'],
      tempo: 100,
      targetNotes: [
        { midi: 40, onset: 0, duration: 700 }, // E2
        { midi: 35, onset: 720, duration: 220 }, // B1
        { midi: 35, onset: 960, duration: 700 }, // B1
        { midi: 40, onset: 1680, duration: 220 }, // E2
        { midi: 40, onset: 1920, duration: 700 }, // E2
        { midi: 35, onset: 2640, duration: 220 }, // B1
        { midi: 35, onset: 2880, duration: 700 }, // B1
        { midi: 40, onset: 3600, duration: 220 }, // E2
      ],
    },
    {
      stepNumber: 27,
      module: 'latin_l3',
      section: 'C',
      subsection: 'C1: Bossa Bass',
      activity: 'C1.2: Bossa Bass — the Progression',
      direction:
        'The same on every chord, always the 5 below the root: A–E, B–F♯.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l3_bass_bossa_prog | latin',
      styleRef: 'l3a',
      successFeedback: 'The bossa bass through the changes.',
      chordSymbols: ['Em9', 'Am9', 'B7', 'Em9'],
      tempo: 100,
      targetNotes: [
        { midi: 40, onset: 0, duration: 700 }, // E2
        { midi: 35, onset: 720, duration: 220 }, // B1
        { midi: 35, onset: 960, duration: 700 }, // B1
        { midi: 40, onset: 1680, duration: 220 }, // E2
        { midi: 45, onset: 1920, duration: 700 }, // A2
        { midi: 40, onset: 2640, duration: 220 }, // E2
        { midi: 40, onset: 2880, duration: 700 }, // E2
        { midi: 45, onset: 3600, duration: 220 }, // A2
        { midi: 47, onset: 3840, duration: 700 }, // B2
        { midi: 42, onset: 4560, duration: 220 }, // F♯2
        { midi: 42, onset: 4800, duration: 700 }, // F♯2
        { midi: 47, onset: 5520, duration: 220 }, // B2
        { midi: 40, onset: 5760, duration: 700 }, // E2
        { midi: 35, onset: 6480, duration: 220 }, // B1
        { midi: 35, onset: 6720, duration: 700 }, // B1
        { midi: 40, onset: 7440, duration: 220 }, // E2
      ],
    },
    {
      stepNumber: 28,
      module: 'latin_l3',
      section: 'C',
      subsection: 'C1: Bossa Bass',
      activity: 'C1.3: Bass Play-Along — Bossa',
      direction: 'The bossa bass under the band.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l3_bass_bossa_play | latin',
      styleRef: 'l3a',
      successFeedback: 'Light and steady — bossa bass.',
      chordSymbols: ['Em9', 'Am9', 'B7', 'Em9'],
      tempo: 110,
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 40, onset: 0, duration: 700 }, // E2
        { midi: 35, onset: 720, duration: 220 }, // B1
        { midi: 35, onset: 960, duration: 700 }, // B1
        { midi: 40, onset: 1680, duration: 220 }, // E2
        { midi: 45, onset: 1920, duration: 700 }, // A2
        { midi: 40, onset: 2640, duration: 220 }, // E2
        { midi: 40, onset: 2880, duration: 700 }, // E2
        { midi: 45, onset: 3600, duration: 220 }, // A2
        { midi: 47, onset: 3840, duration: 700 }, // B2
        { midi: 42, onset: 4560, duration: 220 }, // F♯2
        { midi: 42, onset: 4800, duration: 700 }, // F♯2
        { midi: 47, onset: 5520, duration: 220 }, // B2
        { midi: 40, onset: 5760, duration: 700 }, // E2
        { midi: 35, onset: 6480, duration: 220 }, // B1
        { midi: 35, onset: 6720, duration: 700 }, // B1
        { midi: 40, onset: 7440, duration: 220 }, // E2
      ],
    },
    {
      stepNumber: 29,
      module: 'latin_l3',
      section: 'C',
      subsection: 'C2: Tango Bass',
      activity: 'C2.1: Tango Bass, One Chord',
      direction:
        'On the 3+3+2 — 1, the "and" of 2, 4 — play E, C, B: the root, the note a step above the 5, and the 5.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l3_bass_tango_one | latin',
      styleRef: 'l3b',
      successFeedback: 'C leaning on B: tango in the bass.',
      chordSymbols: ['Emadd9'],
      tempo: 90,
      targetNotes: [
        { midi: 40, onset: 0, duration: 700 }, // E2
        { midi: 48, onset: 720, duration: 700 }, // C3
        { midi: 47, onset: 1440, duration: 460 }, // B2
        { midi: 40, onset: 1920, duration: 700 }, // E2
        { midi: 48, onset: 2640, duration: 700 }, // C3
        { midi: 47, onset: 3360, duration: 460 }, // B2
      ],
    },
    {
      stepNumber: 30,
      module: 'latin_l3',
      section: 'C',
      subsection: 'C2: Tango Bass',
      activity: 'C2.2: Tango Bass — the Progression',
      direction:
        'Each chord walks the same way: A, F♯, E under A minor 6; B, G, F♯ under B7.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l3_bass_tango_prog | latin',
      styleRef: 'l3b',
      successFeedback: 'Root, lean, 5 — through every chord.',
      chordSymbols: ['Emadd9', 'Am6', 'B7', 'Emadd9'],
      tempo: 90,
      targetNotes: [
        { midi: 40, onset: 0, duration: 700 }, // E2
        { midi: 48, onset: 720, duration: 700 }, // C3
        { midi: 47, onset: 1440, duration: 460 }, // B2
        { midi: 45, onset: 1920, duration: 700 }, // A2
        { midi: 54, onset: 2640, duration: 700 }, // F♯3
        { midi: 52, onset: 3360, duration: 460 }, // E3
        { midi: 47, onset: 3840, duration: 700 }, // B2
        { midi: 55, onset: 4560, duration: 700 }, // G3
        { midi: 54, onset: 5280, duration: 460 }, // F♯3
        { midi: 40, onset: 5760, duration: 700 }, // E2
        { midi: 48, onset: 6480, duration: 700 }, // C3
        { midi: 47, onset: 7200, duration: 460 }, // B2
      ],
    },
    {
      stepNumber: 31,
      module: 'latin_l3',
      section: 'C',
      subsection: 'C2: Tango Bass',
      activity: 'C2.3: Bass Play-Along — Tango',
      direction: 'The tango bass under the band.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l3_bass_tango_play | latin',
      styleRef: 'l3b',
      successFeedback: 'Heavy and dramatic: tango bass.',
      chordSymbols: ['Emadd9', 'Am6', 'B7', 'Emadd9'],
      tempo: 100,
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 40, onset: 0, duration: 700 }, // E2
        { midi: 48, onset: 720, duration: 700 }, // C3
        { midi: 47, onset: 1440, duration: 460 }, // B2
        { midi: 45, onset: 1920, duration: 700 }, // A2
        { midi: 54, onset: 2640, duration: 700 }, // F♯3
        { midi: 52, onset: 3360, duration: 460 }, // E3
        { midi: 47, onset: 3840, duration: 700 }, // B2
        { midi: 55, onset: 4560, duration: 700 }, // G3
        { midi: 54, onset: 5280, duration: 460 }, // F♯3
        { midi: 40, onset: 5760, duration: 700 }, // E2
        { midi: 48, onset: 6480, duration: 700 }, // C3
        { midi: 47, onset: 7200, duration: 460 }, // B2
      ],
    },
    {
      stepNumber: 32,
      module: 'latin_l3',
      section: 'C',
      subsection: 'C3: Tumbao',
      activity: 'C3.1: Tumbao, One Chord',
      direction:
        'After the first E, the tumbao leaves beat 1 empty: the 5 on the "and" of 2, the root on 4, held over the bar line.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l3_bass_tumbao_one | latin',
      styleRef: 'l3c',
      successFeedback: 'Beat 1 left empty — the bass floats over the bar line.',
      chordSymbols: ['Em'],
      tempo: 120,
      targetNotes: [
        { midi: 40, onset: 0, duration: 700 }, // E2
        { midi: 47, onset: 720, duration: 700 }, // B2
        { midi: 40, onset: 1440, duration: 1140 }, // E2
        { midi: 47, onset: 2640, duration: 700 }, // B2
        { midi: 40, onset: 3360, duration: 940 }, // E2
      ],
    },
    {
      stepNumber: 33,
      module: 'latin_l3',
      section: 'C',
      subsection: 'C3: Tumbao',
      activity: 'C3.2: Tumbao — the Progression',
      direction:
        'On 4, play the next chord\'s root early and hold it over: A before A minor, B before B7, E before E minor. On the "and" of 2, the 5 of the chord you are in.',
      assessment: 'pitch_order_timing',
      tag: 'latin:l3_bass_tumbao_prog | latin',
      styleRef: 'l3c',
      successFeedback: 'The tumbao: always one step ahead of the chords.',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 120,
      targetNotes: [
        { midi: 40, onset: 0, duration: 700 }, // E2
        { midi: 47, onset: 720, duration: 700 }, // B2
        { midi: 45, onset: 1440, duration: 1140 }, // A2
        { midi: 52, onset: 2640, duration: 700 }, // E3
        { midi: 47, onset: 3360, duration: 1140 }, // B2
        { midi: 42, onset: 4560, duration: 700 }, // F♯2
        { midi: 40, onset: 5280, duration: 1140 }, // E2
        { midi: 47, onset: 6480, duration: 700 }, // B2
        { midi: 40, onset: 7200, duration: 940 }, // E2
      ],
    },
    {
      stepNumber: 34,
      module: 'latin_l3',
      section: 'C',
      subsection: 'C3: Tumbao',
      activity: 'C3.3: Bass Play-Along — Tumbao',
      direction: 'The tumbao under the montuno and the 2-3 clave.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l3_bass_tumbao_play | latin',
      styleRef: 'l3c',
      successFeedback: 'Salsa bass — ahead of the beat, never late.',
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 160,
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 40, onset: 0, duration: 700 }, // E2
        { midi: 47, onset: 720, duration: 700 }, // B2
        { midi: 45, onset: 1440, duration: 1140 }, // A2
        { midi: 52, onset: 2640, duration: 700 }, // E3
        { midi: 47, onset: 3360, duration: 1140 }, // B2
        { midi: 42, onset: 4560, duration: 700 }, // F♯2
        { midi: 40, onset: 5280, duration: 1140 }, // E2
        { midi: 47, onset: 6480, duration: 700 }, // B2
        { midi: 40, onset: 7200, duration: 940 }, // E2
      ],
    },
  ],
};

const latinL3SectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 35,
      module: 'latin_l3',
      section: 'D',
      subsection: 'D1: Bossa Performance',
      activity: 'D1.1: Bossa — LH Bass + RH Voicings (Out of Time)',
      direction:
        'Left hand root, then the 5 below; right hand the rootless voicing above it.',
      assessment: 'pitch_order',
      tag: 'latin:l3_perf_bossa_oot | latin',
      styleRef: 'l3a',
      successFeedback: 'Root below, colours above.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      chordSymbols: ['Em9', 'Am9', 'B7', 'Em9'],
      targetNotes: [
        { midi: 40, onset: 0, duration: 900, hand: 'lh' }, // E2
        { midi: 35, onset: 960, duration: 900, hand: 'lh' }, // B1
        { midi: 45, onset: 1920, duration: 900, hand: 'lh' }, // A2
        { midi: 40, onset: 2880, duration: 900, hand: 'lh' }, // E2
        { midi: 47, onset: 3840, duration: 900, hand: 'lh' }, // B2
        { midi: 42, onset: 4800, duration: 900, hand: 'lh' }, // F♯2
        { midi: 40, onset: 5760, duration: 900, hand: 'lh' }, // E2
        { midi: 35, onset: 6720, duration: 900, hand: 'lh' }, // B1
        { midi: 55, onset: 0, duration: 1800, hand: 'rh' }, // G3
        { midi: 59, onset: 0, duration: 1800, hand: 'rh' }, // B3
        { midi: 62, onset: 0, duration: 1800, hand: 'rh' }, // D4
        { midi: 66, onset: 0, duration: 1800, hand: 'rh' }, // F♯4
        { midi: 55, onset: 1920, duration: 1800, hand: 'rh' }, // G3
        { midi: 59, onset: 1920, duration: 1800, hand: 'rh' }, // B3
        { midi: 60, onset: 1920, duration: 1800, hand: 'rh' }, // C4
        { midi: 64, onset: 1920, duration: 1800, hand: 'rh' }, // E4
        { midi: 54, onset: 3840, duration: 1800, hand: 'rh' }, // F♯3
        { midi: 57, onset: 3840, duration: 1800, hand: 'rh' }, // A3
        { midi: 59, onset: 3840, duration: 1800, hand: 'rh' }, // B3
        { midi: 63, onset: 3840, duration: 1800, hand: 'rh' }, // D♯4
        { midi: 54, onset: 5760, duration: 1800, hand: 'rh' }, // F♯3
        { midi: 55, onset: 5760, duration: 1800, hand: 'rh' }, // G3
        { midi: 59, onset: 5760, duration: 1800, hand: 'rh' }, // B3
        { midi: 62, onset: 5760, duration: 1800, hand: 'rh' }, // D4
      ],
    },
    {
      stepNumber: 36,
      module: 'latin_l3',
      section: 'D',
      subsection: 'D1: Bossa Performance',
      activity: 'D1.2: Bossa — Full Groove (Play-Along)',
      direction:
        'Left hand the bossa bass; right hand the comping on 1, 2 and the "and" of 3. On 1 they start together.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l3_perf_bossa_play | latin',
      styleRef: 'l3a',
      successFeedback: 'Bossa nova, in two hands.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      chordSymbols: ['Em9', 'Am9', 'B7', 'Em9'],
      tempo: 110,
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 40, onset: 0, duration: 700, hand: 'lh' }, // E2
        { midi: 35, onset: 720, duration: 220, hand: 'lh' }, // B1
        { midi: 35, onset: 960, duration: 700, hand: 'lh' }, // B1
        { midi: 40, onset: 1680, duration: 220, hand: 'lh' }, // E2
        { midi: 45, onset: 1920, duration: 700, hand: 'lh' }, // A2
        { midi: 40, onset: 2640, duration: 220, hand: 'lh' }, // E2
        { midi: 40, onset: 2880, duration: 700, hand: 'lh' }, // E2
        { midi: 45, onset: 3600, duration: 220, hand: 'lh' }, // A2
        { midi: 47, onset: 3840, duration: 700, hand: 'lh' }, // B2
        { midi: 42, onset: 4560, duration: 220, hand: 'lh' }, // F♯2
        { midi: 42, onset: 4800, duration: 700, hand: 'lh' }, // F♯2
        { midi: 47, onset: 5520, duration: 220, hand: 'lh' }, // B2
        { midi: 40, onset: 5760, duration: 700, hand: 'lh' }, // E2
        { midi: 35, onset: 6480, duration: 220, hand: 'lh' }, // B1
        { midi: 35, onset: 6720, duration: 700, hand: 'lh' }, // B1
        { midi: 40, onset: 7440, duration: 220, hand: 'lh' }, // E2
        { midi: 55, onset: 0, duration: 220, hand: 'rh' }, // G3
        { midi: 59, onset: 0, duration: 220, hand: 'rh' }, // B3
        { midi: 62, onset: 0, duration: 220, hand: 'rh' }, // D4
        { midi: 66, onset: 0, duration: 220, hand: 'rh' }, // F♯4
        { midi: 55, onset: 480, duration: 460, hand: 'rh' }, // G3
        { midi: 59, onset: 480, duration: 460, hand: 'rh' }, // B3
        { midi: 62, onset: 480, duration: 460, hand: 'rh' }, // D4
        { midi: 66, onset: 480, duration: 460, hand: 'rh' }, // F♯4
        { midi: 55, onset: 1200, duration: 460, hand: 'rh' }, // G3
        { midi: 59, onset: 1200, duration: 460, hand: 'rh' }, // B3
        { midi: 62, onset: 1200, duration: 460, hand: 'rh' }, // D4
        { midi: 66, onset: 1200, duration: 460, hand: 'rh' }, // F♯4
        { midi: 55, onset: 1920, duration: 220, hand: 'rh' }, // G3
        { midi: 59, onset: 1920, duration: 220, hand: 'rh' }, // B3
        { midi: 60, onset: 1920, duration: 220, hand: 'rh' }, // C4
        { midi: 64, onset: 1920, duration: 220, hand: 'rh' }, // E4
        { midi: 55, onset: 2400, duration: 460, hand: 'rh' }, // G3
        { midi: 59, onset: 2400, duration: 460, hand: 'rh' }, // B3
        { midi: 60, onset: 2400, duration: 460, hand: 'rh' }, // C4
        { midi: 64, onset: 2400, duration: 460, hand: 'rh' }, // E4
        { midi: 55, onset: 3120, duration: 460, hand: 'rh' }, // G3
        { midi: 59, onset: 3120, duration: 460, hand: 'rh' }, // B3
        { midi: 60, onset: 3120, duration: 460, hand: 'rh' }, // C4
        { midi: 64, onset: 3120, duration: 460, hand: 'rh' }, // E4
        { midi: 54, onset: 3840, duration: 220, hand: 'rh' }, // F♯3
        { midi: 57, onset: 3840, duration: 220, hand: 'rh' }, // A3
        { midi: 59, onset: 3840, duration: 220, hand: 'rh' }, // B3
        { midi: 63, onset: 3840, duration: 220, hand: 'rh' }, // D♯4
        { midi: 54, onset: 4320, duration: 460, hand: 'rh' }, // F♯3
        { midi: 57, onset: 4320, duration: 460, hand: 'rh' }, // A3
        { midi: 59, onset: 4320, duration: 460, hand: 'rh' }, // B3
        { midi: 63, onset: 4320, duration: 460, hand: 'rh' }, // D♯4
        { midi: 54, onset: 5040, duration: 460, hand: 'rh' }, // F♯3
        { midi: 57, onset: 5040, duration: 460, hand: 'rh' }, // A3
        { midi: 59, onset: 5040, duration: 460, hand: 'rh' }, // B3
        { midi: 63, onset: 5040, duration: 460, hand: 'rh' }, // D♯4
        { midi: 54, onset: 5760, duration: 220, hand: 'rh' }, // F♯3
        { midi: 55, onset: 5760, duration: 220, hand: 'rh' }, // G3
        { midi: 59, onset: 5760, duration: 220, hand: 'rh' }, // B3
        { midi: 62, onset: 5760, duration: 220, hand: 'rh' }, // D4
        { midi: 54, onset: 6240, duration: 460, hand: 'rh' }, // F♯3
        { midi: 55, onset: 6240, duration: 460, hand: 'rh' }, // G3
        { midi: 59, onset: 6240, duration: 460, hand: 'rh' }, // B3
        { midi: 62, onset: 6240, duration: 460, hand: 'rh' }, // D4
        { midi: 54, onset: 6960, duration: 460, hand: 'rh' }, // F♯3
        { midi: 55, onset: 6960, duration: 460, hand: 'rh' }, // G3
        { midi: 59, onset: 6960, duration: 460, hand: 'rh' }, // B3
        { midi: 62, onset: 6960, duration: 460, hand: 'rh' }, // D4
      ],
    },
    {
      stepNumber: 37,
      module: 'latin_l3',
      section: 'D',
      subsection: 'D2: Tango Performance',
      activity: 'D2.1: Tango — LH Bass + RH Chords (Play-Along)',
      direction:
        'Left hand on the 3+3+2; right hand the marcato. On 1, the "and" of 2 and 4 both hands strike together.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l3_perf_tango_chords | latin',
      styleRef: 'l3b',
      successFeedback: 'The whole tango orchestra, in two hands.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l3b',
      },
      chordSymbols: ['Emadd9', 'Am6', 'B7', 'Emadd9'],
      tempo: 100,
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 40, onset: 0, duration: 700, hand: 'lh' }, // E2
        { midi: 48, onset: 720, duration: 700, hand: 'lh' }, // C3
        { midi: 47, onset: 1440, duration: 460, hand: 'lh' }, // B2
        { midi: 45, onset: 1920, duration: 700, hand: 'lh' }, // A2
        { midi: 54, onset: 2640, duration: 700, hand: 'lh' }, // F♯3
        { midi: 52, onset: 3360, duration: 460, hand: 'lh' }, // E3
        { midi: 47, onset: 3840, duration: 700, hand: 'lh' }, // B2
        { midi: 55, onset: 4560, duration: 700, hand: 'lh' }, // G3
        { midi: 54, onset: 5280, duration: 460, hand: 'lh' }, // F♯3
        { midi: 40, onset: 5760, duration: 700, hand: 'lh' }, // E2
        { midi: 48, onset: 6480, duration: 700, hand: 'lh' }, // C3
        { midi: 47, onset: 7200, duration: 460, hand: 'lh' }, // B2
        { midi: 66, onset: 0, duration: 460, hand: 'rh' }, // F♯4
        { midi: 67, onset: 0, duration: 460, hand: 'rh' }, // G4
        { midi: 71, onset: 0, duration: 460, hand: 'rh' }, // B4
        { midi: 66, onset: 480, duration: 110, hand: 'rh' }, // F♯4
        { midi: 67, onset: 480, duration: 110, hand: 'rh' }, // G4
        { midi: 71, onset: 480, duration: 110, hand: 'rh' }, // B4
        { midi: 66, onset: 720, duration: 460, hand: 'rh' }, // F♯4
        { midi: 67, onset: 720, duration: 460, hand: 'rh' }, // G4
        { midi: 71, onset: 720, duration: 460, hand: 'rh' }, // B4
        { midi: 66, onset: 1200, duration: 110, hand: 'rh' }, // F♯4
        { midi: 67, onset: 1200, duration: 110, hand: 'rh' }, // G4
        { midi: 71, onset: 1200, duration: 110, hand: 'rh' }, // B4
        { midi: 66, onset: 1440, duration: 220, hand: 'rh' }, // F♯4
        { midi: 67, onset: 1440, duration: 220, hand: 'rh' }, // G4
        { midi: 71, onset: 1440, duration: 220, hand: 'rh' }, // B4
        { midi: 66, onset: 1920, duration: 460, hand: 'rh' }, // F♯4
        { midi: 69, onset: 1920, duration: 460, hand: 'rh' }, // A4
        { midi: 72, onset: 1920, duration: 460, hand: 'rh' }, // C5
        { midi: 66, onset: 2400, duration: 110, hand: 'rh' }, // F♯4
        { midi: 69, onset: 2400, duration: 110, hand: 'rh' }, // A4
        { midi: 72, onset: 2400, duration: 110, hand: 'rh' }, // C5
        { midi: 66, onset: 2640, duration: 460, hand: 'rh' }, // F♯4
        { midi: 69, onset: 2640, duration: 460, hand: 'rh' }, // A4
        { midi: 72, onset: 2640, duration: 460, hand: 'rh' }, // C5
        { midi: 66, onset: 3120, duration: 110, hand: 'rh' }, // F♯4
        { midi: 69, onset: 3120, duration: 110, hand: 'rh' }, // A4
        { midi: 72, onset: 3120, duration: 110, hand: 'rh' }, // C5
        { midi: 66, onset: 3360, duration: 220, hand: 'rh' }, // F♯4
        { midi: 69, onset: 3360, duration: 220, hand: 'rh' }, // A4
        { midi: 72, onset: 3360, duration: 220, hand: 'rh' }, // C5
        { midi: 63, onset: 3840, duration: 460, hand: 'rh' }, // D♯4
        { midi: 66, onset: 3840, duration: 460, hand: 'rh' }, // F♯4
        { midi: 71, onset: 3840, duration: 460, hand: 'rh' }, // B4
        { midi: 63, onset: 4320, duration: 110, hand: 'rh' }, // D♯4
        { midi: 66, onset: 4320, duration: 110, hand: 'rh' }, // F♯4
        { midi: 71, onset: 4320, duration: 110, hand: 'rh' }, // B4
        { midi: 63, onset: 4560, duration: 460, hand: 'rh' }, // D♯4
        { midi: 66, onset: 4560, duration: 460, hand: 'rh' }, // F♯4
        { midi: 71, onset: 4560, duration: 460, hand: 'rh' }, // B4
        { midi: 63, onset: 5040, duration: 110, hand: 'rh' }, // D♯4
        { midi: 66, onset: 5040, duration: 110, hand: 'rh' }, // F♯4
        { midi: 71, onset: 5040, duration: 110, hand: 'rh' }, // B4
        { midi: 63, onset: 5280, duration: 220, hand: 'rh' }, // D♯4
        { midi: 66, onset: 5280, duration: 220, hand: 'rh' }, // F♯4
        { midi: 71, onset: 5280, duration: 220, hand: 'rh' }, // B4
        { midi: 66, onset: 5760, duration: 460, hand: 'rh' }, // F♯4
        { midi: 67, onset: 5760, duration: 460, hand: 'rh' }, // G4
        { midi: 71, onset: 5760, duration: 460, hand: 'rh' }, // B4
        { midi: 66, onset: 6240, duration: 110, hand: 'rh' }, // F♯4
        { midi: 67, onset: 6240, duration: 110, hand: 'rh' }, // G4
        { midi: 71, onset: 6240, duration: 110, hand: 'rh' }, // B4
        { midi: 66, onset: 6480, duration: 460, hand: 'rh' }, // F♯4
        { midi: 67, onset: 6480, duration: 460, hand: 'rh' }, // G4
        { midi: 71, onset: 6480, duration: 460, hand: 'rh' }, // B4
        { midi: 66, onset: 6960, duration: 110, hand: 'rh' }, // F♯4
        { midi: 67, onset: 6960, duration: 110, hand: 'rh' }, // G4
        { midi: 71, onset: 6960, duration: 110, hand: 'rh' }, // B4
        { midi: 66, onset: 7200, duration: 220, hand: 'rh' }, // F♯4
        { midi: 67, onset: 7200, duration: 220, hand: 'rh' }, // G4
        { midi: 71, onset: 7200, duration: 220, hand: 'rh' }, // B4
      ],
    },
    {
      stepNumber: 38,
      module: 'latin_l3',
      section: 'D',
      subsection: 'D2: Tango Performance',
      activity: 'D2.2: Tango — LH Chords + RH Melody (Play-Along)',
      direction:
        'Left hand the tango chords, where the pianist plays them, on 1, the "and" of 2 and 4; right hand the guitarist\'s line from A4.3.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l3_perf_tango_melody | latin',
      styleRef: 'l3b',
      successFeedback: "Chords and melody over the band's bass — tango piano.",
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_chords_rh_melody',
        lh_role: 'chords',
        rh_role: 'melody',
        style_ref: 'l3b',
      },
      chordSymbols: ['Emadd9', 'Am6', 'B7', 'Emadd9'],
      tempo: 100,
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords', 'melody'],
      },
      targetNotes: [
        { midi: 54, onset: 0, duration: 700, hand: 'lh' }, // F♯3
        { midi: 55, onset: 0, duration: 700, hand: 'lh' }, // G3
        { midi: 59, onset: 0, duration: 700, hand: 'lh' }, // B3
        { midi: 54, onset: 720, duration: 700, hand: 'lh' }, // F♯3
        { midi: 55, onset: 720, duration: 700, hand: 'lh' }, // G3
        { midi: 59, onset: 720, duration: 700, hand: 'lh' }, // B3
        { midi: 54, onset: 1440, duration: 460, hand: 'lh' }, // F♯3
        { midi: 55, onset: 1440, duration: 460, hand: 'lh' }, // G3
        { midi: 59, onset: 1440, duration: 460, hand: 'lh' }, // B3
        { midi: 48, onset: 1920, duration: 700, hand: 'lh' }, // C3
        { midi: 54, onset: 1920, duration: 700, hand: 'lh' }, // F♯3
        { midi: 57, onset: 1920, duration: 700, hand: 'lh' }, // A3
        { midi: 48, onset: 2640, duration: 700, hand: 'lh' }, // C3
        { midi: 54, onset: 2640, duration: 700, hand: 'lh' }, // F♯3
        { midi: 57, onset: 2640, duration: 700, hand: 'lh' }, // A3
        { midi: 48, onset: 3360, duration: 460, hand: 'lh' }, // C3
        { midi: 54, onset: 3360, duration: 460, hand: 'lh' }, // F♯3
        { midi: 57, onset: 3360, duration: 460, hand: 'lh' }, // A3
        { midi: 51, onset: 3840, duration: 700, hand: 'lh' }, // D♯3
        { midi: 54, onset: 3840, duration: 700, hand: 'lh' }, // F♯3
        { midi: 59, onset: 3840, duration: 700, hand: 'lh' }, // B3
        { midi: 51, onset: 4560, duration: 700, hand: 'lh' }, // D♯3
        { midi: 54, onset: 4560, duration: 700, hand: 'lh' }, // F♯3
        { midi: 59, onset: 4560, duration: 700, hand: 'lh' }, // B3
        { midi: 51, onset: 5280, duration: 460, hand: 'lh' }, // D♯3
        { midi: 54, onset: 5280, duration: 460, hand: 'lh' }, // F♯3
        { midi: 59, onset: 5280, duration: 460, hand: 'lh' }, // B3
        { midi: 54, onset: 5760, duration: 700, hand: 'lh' }, // F♯3
        { midi: 55, onset: 5760, duration: 700, hand: 'lh' }, // G3
        { midi: 59, onset: 5760, duration: 700, hand: 'lh' }, // B3
        { midi: 54, onset: 6480, duration: 700, hand: 'lh' }, // F♯3
        { midi: 55, onset: 6480, duration: 700, hand: 'lh' }, // G3
        { midi: 59, onset: 6480, duration: 700, hand: 'lh' }, // B3
        { midi: 54, onset: 7200, duration: 460, hand: 'lh' }, // F♯3
        { midi: 55, onset: 7200, duration: 460, hand: 'lh' }, // G3
        { midi: 59, onset: 7200, duration: 460, hand: 'lh' }, // B3
        { midi: 72, onset: 240, duration: 220, hand: 'rh' }, // C5
        { midi: 71, onset: 480, duration: 220, hand: 'rh' }, // B4
        { midi: 79, onset: 720, duration: 220, hand: 'rh' }, // G5
        { midi: 78, onset: 960, duration: 110, hand: 'rh' }, // F♯5
        { midi: 76, onset: 1080, duration: 110, hand: 'rh' }, // E5
        { midi: 79, onset: 1200, duration: 220, hand: 'rh' }, // G5
        { midi: 72, onset: 1440, duration: 220, hand: 'rh' }, // C5
        { midi: 71, onset: 1680, duration: 220, hand: 'rh' }, // B4
        { midi: 72, onset: 2160, duration: 220, hand: 'rh' }, // C5
        { midi: 69, onset: 2400, duration: 220, hand: 'rh' }, // A4
        { midi: 78, onset: 2640, duration: 220, hand: 'rh' }, // F♯5
        { midi: 76, onset: 2880, duration: 110, hand: 'rh' }, // E5
        { midi: 72, onset: 3000, duration: 110, hand: 'rh' }, // C5
        { midi: 78, onset: 3120, duration: 220, hand: 'rh' }, // F♯5
        { midi: 71, onset: 3360, duration: 220, hand: 'rh' }, // B4
        { midi: 69, onset: 3600, duration: 220, hand: 'rh' }, // A4
        { midi: 71, onset: 4080, duration: 220, hand: 'rh' }, // B4
        { midi: 69, onset: 4320, duration: 220, hand: 'rh' }, // A4
        { midi: 78, onset: 4560, duration: 220, hand: 'rh' }, // F♯5
        { midi: 76, onset: 4800, duration: 110, hand: 'rh' }, // E5
        { midi: 75, onset: 4920, duration: 110, hand: 'rh' }, // D♯5
        { midi: 78, onset: 5040, duration: 220, hand: 'rh' }, // F♯5
        { midi: 71, onset: 5280, duration: 220, hand: 'rh' }, // B4
        { midi: 69, onset: 5520, duration: 220, hand: 'rh' }, // A4
        { midi: 72, onset: 6000, duration: 220, hand: 'rh' }, // C5
        { midi: 71, onset: 6240, duration: 220, hand: 'rh' }, // B4
        { midi: 79, onset: 6480, duration: 220, hand: 'rh' }, // G5
        { midi: 78, onset: 6720, duration: 110, hand: 'rh' }, // F♯5
        { midi: 76, onset: 6840, duration: 110, hand: 'rh' }, // E5
        { midi: 79, onset: 6960, duration: 220, hand: 'rh' }, // G5
        { midi: 72, onset: 7200, duration: 220, hand: 'rh' }, // C5
        { midi: 71, onset: 7440, duration: 460, hand: 'rh' }, // B4
      ],
    },
    {
      stepNumber: 39,
      module: 'latin_l3',
      section: 'D',
      subsection: 'D3: Afro-Cuban Performance',
      activity: 'D3.1: Montuno 2-3, Both Hands (Play-Along)',
      direction:
        "Left hand plays the line an octave down; right hand keeps its octaves. Three E's at once — the full salsa piano.",
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l3_perf_montuno_23 | latin',
      styleRef: 'l3c',
      successFeedback: 'You are the piano in a salsa band.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'two_hand_comping',
        lh_role: 'chords',
        rh_role: 'chords',
        style_ref: 'l3c',
      },
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 160,
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 52, onset: 0, duration: 200, hand: 'lh' }, // E3
        { midi: 55, onset: 480, duration: 200, hand: 'lh' }, // G3
        { midi: 59, onset: 720, duration: 200, hand: 'lh' }, // B3
        { midi: 52, onset: 960, duration: 200, hand: 'lh' }, // E3
        { midi: 55, onset: 1200, duration: 200, hand: 'lh' }, // G3
        { midi: 59, onset: 1200, duration: 200, hand: 'lh' }, // B3
        { midi: 52, onset: 1680, duration: 200, hand: 'lh' }, // E3
        { midi: 57, onset: 2160, duration: 200, hand: 'lh' }, // A3
        { midi: 60, onset: 2160, duration: 200, hand: 'lh' }, // C4
        { midi: 52, onset: 2640, duration: 200, hand: 'lh' }, // E3
        { midi: 57, onset: 3120, duration: 200, hand: 'lh' }, // A3
        { midi: 60, onset: 3120, duration: 200, hand: 'lh' }, // C4
        { midi: 51, onset: 3600, duration: 200, hand: 'lh' }, // D♯3
        { midi: 51, onset: 3840, duration: 200, hand: 'lh' }, // D♯3
        { midi: 54, onset: 4320, duration: 200, hand: 'lh' }, // F♯3
        { midi: 59, onset: 4560, duration: 200, hand: 'lh' }, // B3
        { midi: 51, onset: 4800, duration: 200, hand: 'lh' }, // D♯3
        { midi: 54, onset: 5040, duration: 200, hand: 'lh' }, // F♯3
        { midi: 59, onset: 5040, duration: 200, hand: 'lh' }, // B3
        { midi: 52, onset: 5520, duration: 200, hand: 'lh' }, // E3
        { midi: 55, onset: 6000, duration: 200, hand: 'lh' }, // G3
        { midi: 59, onset: 6000, duration: 200, hand: 'lh' }, // B3
        { midi: 52, onset: 6480, duration: 200, hand: 'lh' }, // E3
        { midi: 55, onset: 6960, duration: 200, hand: 'lh' }, // G3
        { midi: 59, onset: 6960, duration: 200, hand: 'lh' }, // B3
        { midi: 64, onset: 0, duration: 200, hand: 'rh' }, // E4
        { midi: 76, onset: 0, duration: 200, hand: 'rh' }, // E5
        { midi: 67, onset: 480, duration: 200, hand: 'rh' }, // G4
        { midi: 79, onset: 480, duration: 200, hand: 'rh' }, // G5
        { midi: 71, onset: 720, duration: 200, hand: 'rh' }, // B4
        { midi: 83, onset: 720, duration: 200, hand: 'rh' }, // B5
        { midi: 64, onset: 960, duration: 200, hand: 'rh' }, // E4
        { midi: 76, onset: 960, duration: 200, hand: 'rh' }, // E5
        { midi: 67, onset: 1200, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 1200, duration: 200, hand: 'rh' }, // B4
        { midi: 79, onset: 1200, duration: 200, hand: 'rh' }, // G5
        { midi: 64, onset: 1680, duration: 200, hand: 'rh' }, // E4
        { midi: 76, onset: 1680, duration: 200, hand: 'rh' }, // E5
        { midi: 69, onset: 2160, duration: 200, hand: 'rh' }, // A4
        { midi: 72, onset: 2160, duration: 200, hand: 'rh' }, // C5
        { midi: 81, onset: 2160, duration: 200, hand: 'rh' }, // A5
        { midi: 64, onset: 2640, duration: 200, hand: 'rh' }, // E4
        { midi: 76, onset: 2640, duration: 200, hand: 'rh' }, // E5
        { midi: 69, onset: 3120, duration: 200, hand: 'rh' }, // A4
        { midi: 72, onset: 3120, duration: 200, hand: 'rh' }, // C5
        { midi: 81, onset: 3120, duration: 200, hand: 'rh' }, // A5
        { midi: 63, onset: 3600, duration: 200, hand: 'rh' }, // D♯4
        { midi: 75, onset: 3600, duration: 200, hand: 'rh' }, // D♯5
        { midi: 63, onset: 3840, duration: 200, hand: 'rh' }, // D♯4
        { midi: 75, onset: 3840, duration: 200, hand: 'rh' }, // D♯5
        { midi: 66, onset: 4320, duration: 200, hand: 'rh' }, // F♯4
        { midi: 78, onset: 4320, duration: 200, hand: 'rh' }, // F♯5
        { midi: 71, onset: 4560, duration: 200, hand: 'rh' }, // B4
        { midi: 83, onset: 4560, duration: 200, hand: 'rh' }, // B5
        { midi: 63, onset: 4800, duration: 200, hand: 'rh' }, // D♯4
        { midi: 75, onset: 4800, duration: 200, hand: 'rh' }, // D♯5
        { midi: 66, onset: 5040, duration: 200, hand: 'rh' }, // F♯4
        { midi: 71, onset: 5040, duration: 200, hand: 'rh' }, // B4
        { midi: 78, onset: 5040, duration: 200, hand: 'rh' }, // F♯5
        { midi: 64, onset: 5520, duration: 200, hand: 'rh' }, // E4
        { midi: 76, onset: 5520, duration: 200, hand: 'rh' }, // E5
        { midi: 67, onset: 6000, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 6000, duration: 200, hand: 'rh' }, // B4
        { midi: 79, onset: 6000, duration: 200, hand: 'rh' }, // G5
        { midi: 64, onset: 6480, duration: 200, hand: 'rh' }, // E4
        { midi: 76, onset: 6480, duration: 200, hand: 'rh' }, // E5
        { midi: 67, onset: 6960, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 6960, duration: 200, hand: 'rh' }, // B4
        { midi: 79, onset: 6960, duration: 200, hand: 'rh' }, // G5
      ],
    },
    {
      stepNumber: 40,
      module: 'latin_l3',
      section: 'D',
      subsection: 'D3: Afro-Cuban Performance',
      activity: 'D3.2: Montuno 3-2, Both Hands (Play-Along)',
      direction: 'The 3-2 montuno in both hands, over the 3-2 band.',
      assessment: 'pitch_order_timing_duration',
      tag: 'latin:l3_perf_montuno_32 | latin',
      styleRef: 'l3c',
      successFeedback: 'Both claves, both hands — Afro-Cuban piano.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'two_hand_comping',
        lh_role: 'chords',
        rh_role: 'chords',
        style_ref: 'l3c',
      },
      chordSymbols: ['Em', 'Am', 'B7', 'Em'],
      tempo: 160,
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 52, onset: 0, duration: 200, hand: 'lh' }, // E3
        { midi: 55, onset: 240, duration: 200, hand: 'lh' }, // G3
        { midi: 59, onset: 480, duration: 200, hand: 'lh' }, // B3
        { midi: 52, onset: 720, duration: 200, hand: 'lh' }, // E3
        { midi: 55, onset: 1200, duration: 200, hand: 'lh' }, // G3
        { midi: 59, onset: 1200, duration: 200, hand: 'lh' }, // B3
        { midi: 52, onset: 1680, duration: 200, hand: 'lh' }, // E3
        { midi: 57, onset: 2160, duration: 200, hand: 'lh' }, // A3
        { midi: 60, onset: 2160, duration: 200, hand: 'lh' }, // C4
        { midi: 52, onset: 2640, duration: 200, hand: 'lh' }, // E3
        { midi: 57, onset: 3120, duration: 200, hand: 'lh' }, // A3
        { midi: 60, onset: 3120, duration: 200, hand: 'lh' }, // C4
        { midi: 51, onset: 3600, duration: 200, hand: 'lh' }, // D♯3
        { midi: 51, onset: 3840, duration: 200, hand: 'lh' }, // D♯3
        { midi: 54, onset: 4080, duration: 200, hand: 'lh' }, // F♯3
        { midi: 59, onset: 4320, duration: 200, hand: 'lh' }, // B3
        { midi: 51, onset: 4560, duration: 200, hand: 'lh' }, // D♯3
        { midi: 54, onset: 5040, duration: 200, hand: 'lh' }, // F♯3
        { midi: 59, onset: 5040, duration: 200, hand: 'lh' }, // B3
        { midi: 52, onset: 5520, duration: 200, hand: 'lh' }, // E3
        { midi: 55, onset: 6000, duration: 200, hand: 'lh' }, // G3
        { midi: 59, onset: 6000, duration: 200, hand: 'lh' }, // B3
        { midi: 52, onset: 6480, duration: 200, hand: 'lh' }, // E3
        { midi: 55, onset: 6960, duration: 200, hand: 'lh' }, // G3
        { midi: 59, onset: 6960, duration: 200, hand: 'lh' }, // B3
        { midi: 52, onset: 7440, duration: 200, hand: 'lh' }, // E3
        { midi: 64, onset: 0, duration: 200, hand: 'rh' }, // E4
        { midi: 76, onset: 0, duration: 200, hand: 'rh' }, // E5
        { midi: 67, onset: 240, duration: 200, hand: 'rh' }, // G4
        { midi: 79, onset: 240, duration: 200, hand: 'rh' }, // G5
        { midi: 71, onset: 480, duration: 200, hand: 'rh' }, // B4
        { midi: 83, onset: 480, duration: 200, hand: 'rh' }, // B5
        { midi: 64, onset: 720, duration: 200, hand: 'rh' }, // E4
        { midi: 76, onset: 720, duration: 200, hand: 'rh' }, // E5
        { midi: 67, onset: 1200, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 1200, duration: 200, hand: 'rh' }, // B4
        { midi: 79, onset: 1200, duration: 200, hand: 'rh' }, // G5
        { midi: 64, onset: 1680, duration: 200, hand: 'rh' }, // E4
        { midi: 76, onset: 1680, duration: 200, hand: 'rh' }, // E5
        { midi: 69, onset: 2160, duration: 200, hand: 'rh' }, // A4
        { midi: 72, onset: 2160, duration: 200, hand: 'rh' }, // C5
        { midi: 81, onset: 2160, duration: 200, hand: 'rh' }, // A5
        { midi: 64, onset: 2640, duration: 200, hand: 'rh' }, // E4
        { midi: 76, onset: 2640, duration: 200, hand: 'rh' }, // E5
        { midi: 69, onset: 3120, duration: 200, hand: 'rh' }, // A4
        { midi: 72, onset: 3120, duration: 200, hand: 'rh' }, // C5
        { midi: 81, onset: 3120, duration: 200, hand: 'rh' }, // A5
        { midi: 63, onset: 3600, duration: 200, hand: 'rh' }, // D♯4
        { midi: 75, onset: 3600, duration: 200, hand: 'rh' }, // D♯5
        { midi: 63, onset: 3840, duration: 200, hand: 'rh' }, // D♯4
        { midi: 75, onset: 3840, duration: 200, hand: 'rh' }, // D♯5
        { midi: 66, onset: 4080, duration: 200, hand: 'rh' }, // F♯4
        { midi: 78, onset: 4080, duration: 200, hand: 'rh' }, // F♯5
        { midi: 71, onset: 4320, duration: 200, hand: 'rh' }, // B4
        { midi: 83, onset: 4320, duration: 200, hand: 'rh' }, // B5
        { midi: 63, onset: 4560, duration: 200, hand: 'rh' }, // D♯4
        { midi: 75, onset: 4560, duration: 200, hand: 'rh' }, // D♯5
        { midi: 66, onset: 5040, duration: 200, hand: 'rh' }, // F♯4
        { midi: 71, onset: 5040, duration: 200, hand: 'rh' }, // B4
        { midi: 78, onset: 5040, duration: 200, hand: 'rh' }, // F♯5
        { midi: 64, onset: 5520, duration: 200, hand: 'rh' }, // E4
        { midi: 76, onset: 5520, duration: 200, hand: 'rh' }, // E5
        { midi: 67, onset: 6000, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 6000, duration: 200, hand: 'rh' }, // B4
        { midi: 79, onset: 6000, duration: 200, hand: 'rh' }, // G5
        { midi: 64, onset: 6480, duration: 200, hand: 'rh' }, // E4
        { midi: 76, onset: 6480, duration: 200, hand: 'rh' }, // E5
        { midi: 67, onset: 6960, duration: 200, hand: 'rh' }, // G4
        { midi: 71, onset: 6960, duration: 200, hand: 'rh' }, // B4
        { midi: 79, onset: 6960, duration: 200, hand: 'rh' }, // G5
        { midi: 64, onset: 7440, duration: 200, hand: 'rh' }, // E4
        { midi: 76, onset: 7440, duration: 200, hand: 'rh' }, // E5
      ],
    },
  ],
};

export const latinL1: ActivityFlowV2 = {
  genre: 'latin',
  level: 1,
  version: 'v2',
  title: 'Reggaeton, Cumbia & Mariachi',
  params: {
    defaultKey: 'E minor',
    defaultScale: [0, 3, 5, 7, 10],
    defaultScaleId: 'minor_pentatonic',
    // Each style's steps name their own tempo: Reggaeton 92, Cumbia 96,
    // Mariachi 126.
    tempoRange: [92, 126],
    swing: 0,
    grooves: [],
  },
  sections: [
    latinL1SectionA,
    latinL1SectionB,
    latinL1SectionC,
    latinL1SectionD,
  ],
};
export const latinL2: ActivityFlowV2 = {
  genre: 'latin',
  level: 2,
  version: 'v2',
  title: 'Merengue, Bachata, Cha-cha-chá & Bolero',
  params: {
    defaultKey: 'E minor',
    defaultScale: [0, 2, 3, 5, 7, 8, 10],
    defaultScaleId: 'aeolian',
    // Each style's play-alongs name their own tempo: Merengue 120, Bachata
    // 148, Cha-cha-chá 130, Bolero 90.
    tempoRange: [90, 148],
    swing: 0,
    grooves: [],
  },
  sections: [
    latinL2SectionA,
    latinL2SectionB,
    latinL2SectionC,
    latinL2SectionD,
  ],
};
export const latinL3: ActivityFlowV2 = {
  genre: 'latin',
  level: 3,
  version: 'v2',
  title: 'Bossa, Tango & Afro-Cuban',
  params: {
    defaultKey: 'E minor',
    defaultScale: [0, 2, 3, 5, 7, 8, 10],
    defaultScaleId: 'aeolian',
    // Bossa 110, Tango 100, Afro-Cuban 160.
    tempoRange: [100, 160],
    swing: 0,
    grooves: [],
  },
  sections: [
    latinL3SectionA,
    latinL3SectionB,
    latinL3SectionC,
    latinL3SectionD,
  ],
};
export const latinFlows = [latinL1, latinL2, latinL3] as const;
