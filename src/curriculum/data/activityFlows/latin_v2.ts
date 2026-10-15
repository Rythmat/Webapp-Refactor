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
 * L2 and L3 are still stubs; musical content is authored per level.
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

// ── L2, L3: stubs ──

const latinSectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    {
      stepNumber: 1,
      module: 'latin_l1',
      section: 'A',
      subsection: 'A1: Melody — Coming Soon',
      activity: 'A1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'latin:melody_stub | latin',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const latinSectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    {
      stepNumber: 2,
      module: 'latin_l1',
      section: 'B',
      subsection: 'B1: Chords — Coming Soon',
      activity: 'B1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'latin:chords_stub | latin',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const latinSectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 3,
      module: 'latin_l1',
      section: 'C',
      subsection: 'C1: Bass — Coming Soon',
      activity: 'C1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'latin:bass_stub | latin',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const latinSectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 4,
      module: 'latin_l1',
      section: 'D',
      subsection: 'D1: Performance — Coming Soon',
      activity: 'D1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'latin:performance_stub | latin',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};

const stubSections = [
  latinSectionA,
  latinSectionB,
  latinSectionC,
  latinSectionD,
];
const stubParams = {
  defaultKey: 'C major',
  defaultScale: [0, 2, 4, 5, 7, 9, 11],
  defaultScaleId: 'major',
  tempoRange: [90, 130] as [number, number],
  swing: 0,
  grooves: [] as string[],
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
  title: 'Latin Level 2',
  params: stubParams,
  sections: stubSections,
};
export const latinL3: ActivityFlowV2 = {
  genre: 'latin',
  level: 3,
  version: 'v2',
  title: 'Latin Level 3',
  params: stubParams,
  sections: stubSections,
};
export const latinFlows = [latinL1, latinL2, latinL3] as const;
