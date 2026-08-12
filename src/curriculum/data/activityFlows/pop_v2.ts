/**
 * Pop v2 — Level 1 Activity Flow.
 * 47 steps: A (7) · B (24) · C (11) · D (5)
 * Default key: C major · Tempo: 70–110 BPM · Swing: 0
 */

import type {
  ActivityFlowV2,
  ActivitySectionV2,
} from '../../types/activity.v2';

// ─── helpers ───────────────────────────────────────────────────────────────

function chordHits(
  midis: number[],
  onsets: number[],
  duration: number,
  hand?: 'lh' | 'rh',
) {
  return onsets.flatMap((onset) =>
    midis.map((midi) => ({ midi, onset, duration, ...(hand ? { hand } : {}) })),
  );
}

const Q = 480; // quarter note ticks
const H = 960; // half note ticks
const W = 1920; // whole note ticks

// ─── SECTION A: MELODY ─────────────────────────────────────────────────────

const popSectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    // A1: Major Pentatonic Scale — C D E G A (60 62 64 67 69 72)
    {
      stepNumber: 1,
      module: 'pop_l1',
      section: 'A',
      subsection: 'A1: Scale (Major Pentatonic)',
      activity: 'A1.1: Major Pentatonic Ascending (Out of Time)',
      direction: 'Play the C major pentatonic scale going up.',
      assessment: 'pitch_only',
      tag: 'pop:major_pentatonic_ascending_oot | pop',
      styleRef: 'l1a',
      scaleIntervals: [0, 2, 4, 7, 9],
      scaleId: 'major_pentatonic',
      successFeedback: 'Great — you nailed the pentatonic shape.',
      targetNotes: [
        { midi: 60, onset: 0, duration: 460 },
        { midi: 62, onset: Q, duration: 460 },
        { midi: 64, onset: Q * 2, duration: 460 },
        { midi: 67, onset: Q * 3, duration: 460 },
        { midi: 69, onset: Q * 4, duration: 460 },
        { midi: 72, onset: Q * 5, duration: 460 },
      ],
    },
    {
      stepNumber: 2,
      module: 'pop_l1',
      section: 'A',
      subsection: 'A1: Scale (Major Pentatonic)',
      activity: 'A1.2: Major Pentatonic Ascending (In Time)',
      direction:
        'In a steady tempo, play the C major pentatonic scale going up.',
      assessment: 'pitch_order_timing',
      tag: 'pop:major_pentatonic_ascending_it | pop',
      styleRef: 'l1a',
      scaleIntervals: [0, 2, 4, 7, 9],
      scaleId: 'major_pentatonic',
      successFeedback: 'Locked in — nice even timing.',
      targetNotes: [
        { midi: 60, onset: 0, duration: 460 },
        { midi: 62, onset: Q, duration: 460 },
        { midi: 64, onset: Q * 2, duration: 460 },
        { midi: 67, onset: Q * 3, duration: 460 },
        { midi: 69, onset: Q * 4, duration: 460 },
        { midi: 72, onset: Q * 5, duration: 460 },
      ],
    },
    {
      stepNumber: 3,
      module: 'pop_l1',
      section: 'A',
      subsection: 'A1: Scale (Major Pentatonic)',
      activity: 'A1.3: Major Pentatonic Descending (Out of Time)',
      direction: 'Play the C major pentatonic scale going down.',
      assessment: 'pitch_only',
      tag: 'pop:major_pentatonic_descending_oot | pop',
      styleRef: 'l1a',
      scaleIntervals: [0, 2, 4, 7, 9],
      scaleId: 'major_pentatonic',
      successFeedback: 'Smooth descent.',
      targetNotes: [
        { midi: 72, onset: 0, duration: 460 },
        { midi: 69, onset: Q, duration: 460 },
        { midi: 67, onset: Q * 2, duration: 460 },
        { midi: 64, onset: Q * 3, duration: 460 },
        { midi: 62, onset: Q * 4, duration: 460 },
        { midi: 60, onset: Q * 5, duration: 460 },
      ],
    },
    {
      stepNumber: 4,
      module: 'pop_l1',
      section: 'A',
      subsection: 'A1: Scale (Major Pentatonic)',
      activity: 'A1.4: Major Pentatonic Descending (In Time)',
      direction:
        'In a steady tempo, play the C major pentatonic scale going down.',
      assessment: 'pitch_order_timing',
      tag: 'pop:major_pentatonic_descending_it | pop',
      styleRef: 'l1a',
      scaleIntervals: [0, 2, 4, 7, 9],
      scaleId: 'major_pentatonic',
      successFeedback: 'Steady and smooth.',
      targetNotes: [
        { midi: 72, onset: 0, duration: 460 },
        { midi: 69, onset: Q, duration: 460 },
        { midi: 67, onset: Q * 2, duration: 460 },
        { midi: 64, onset: Q * 3, duration: 460 },
        { midi: 62, onset: Q * 4, duration: 460 },
        { midi: 60, onset: Q * 5, duration: 460 },
      ],
    },
    {
      stepNumber: 5,
      module: 'pop_l1',
      section: 'A',
      subsection: 'A1: Scale (Major Pentatonic)',
      activity: 'A1.5: Major Pentatonic Ascending & Descending (In Time)',
      direction:
        'In a steady tempo, play the C major pentatonic scale going up and then down.',
      assessment: 'pitch_order_timing',
      tag: 'pop:major_pentatonic_asc_desc_it | pop',
      styleRef: 'l1a',
      scaleIntervals: [0, 2, 4, 7, 9],
      scaleId: 'major_pentatonic',
      successFeedback: 'Up and down — the full arc.',
      targetNotes: [
        { midi: 60, onset: 0, duration: 460 },
        { midi: 62, onset: Q, duration: 460 },
        { midi: 64, onset: Q * 2, duration: 460 },
        { midi: 67, onset: Q * 3, duration: 460 },
        { midi: 69, onset: Q * 4, duration: 460 },
        { midi: 72, onset: Q * 5, duration: 460 },
        { midi: 69, onset: Q * 6, duration: 460 },
        { midi: 67, onset: Q * 7, duration: 460 },
        { midi: 64, onset: Q * 8, duration: 460 },
        { midi: 62, onset: Q * 9, duration: 460 },
        { midi: 60, onset: Q * 10, duration: 460 },
      ],
    },

    // A2: Melody with Play-Along
    {
      stepNumber: 6,
      module: 'pop_l1',
      section: 'A',
      subsection: 'A2: POP Melody with Play-Along',
      activity: 'A2.1: 3-Note POP Melody',
      direction: 'Play this pop melody along with the track!',
      assessment: 'pitch_order_timing',
      tag: 'pop:melody_3note_playalong | pop',
      styleRef: 'l1b',
      grooveId: 'groove_pop_01',
      successFeedback: 'That melody is singing.',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['melody'],
      },
      chordSymbols: ['C'],
      // E5 – C5 – D5  (quarter · quarter · half)
      targetNotes: [
        { midi: 76, onset: 0, duration: 460 },
        { midi: 72, onset: Q, duration: 460 },
        { midi: 74, onset: Q * 2, duration: 940 },
      ],
    },
    {
      stepNumber: 7,
      module: 'pop_l1',
      section: 'A',
      subsection: 'A2: POP Melody with Play-Along',
      activity: 'A2.2: 6-Note POP Melody',
      direction: 'Play this 6-note pop melody along with the track!',
      assessment: 'pitch_order_timing',
      tag: 'pop:melody_6note_playalong | pop',
      styleRef: 'l1b',
      grooveId: 'groove_pop_01',
      successFeedback: 'Two bars, one melody — nice flow.',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['melody'],
      },
      chordSymbols: ['C', 'C'],
      // Bar 1: G5 – A5 – G5  (quarter · quarter · half)
      // Bar 2: E5 – C5 – D5  (quarter · quarter · half)
      targetNotes: [
        { midi: 79, onset: 0, duration: 460 },
        { midi: 81, onset: Q, duration: 460 },
        { midi: 79, onset: Q * 2, duration: 940 },
        { midi: 76, onset: W, duration: 460 },
        { midi: 72, onset: W + Q, duration: 460 },
        { midi: 74, onset: W + Q * 2, duration: 940 },
      ],
    },
  ],
};

// ─── SECTION B: CHORDS ─────────────────────────────────────────────────────

// quarter-note onsets across 4 bars
const QUARTER_ONSETS_4BARS = Array.from({ length: 16 }, (_, i) => i * Q);
// whole-note onsets × 4
const WHOLE_ONSETS_4 = [0, W, W * 2, W * 3];

// returns the 4 quarter-note onset ticks for bar b (0-indexed)
function bqo(b: number): number[] {
  const base = b * W;
  return [base, base + Q, base + Q * 2, base + Q * 3];
}

// returns the 3+3+2 onset ticks for bar b (0-indexed, 8th-note grid)
function b32o(b: number): number[] {
  const base = b * W;
  return [base, base + 720, base + 1440];
}

// B5.1: C–F–C–F  (1-4-1-4)
const b5_1Notes = [
  { midi: 48, onset: 0, duration: 1900, hand: 'lh' as const },
  { midi: 53, onset: W, duration: 1900, hand: 'lh' as const },
  { midi: 48, onset: W * 2, duration: 1900, hand: 'lh' as const },
  { midi: 53, onset: W * 3, duration: 1900, hand: 'lh' as const },
  ...chordHits([60, 64, 67], bqo(0), 460, 'rh'),
  ...chordHits([65, 69, 72], bqo(1), 460, 'rh'),
  ...chordHits([60, 64, 67], bqo(2), 460, 'rh'),
  ...chordHits([65, 69, 72], bqo(3), 460, 'rh'),
];

// B5.2: C–G–F–G  (1-5-4-5)
const b5_2Notes = [
  { midi: 48, onset: 0, duration: 1900, hand: 'lh' as const },
  { midi: 55, onset: W, duration: 1900, hand: 'lh' as const },
  { midi: 53, onset: W * 2, duration: 1900, hand: 'lh' as const },
  { midi: 55, onset: W * 3, duration: 1900, hand: 'lh' as const },
  ...chordHits([60, 64, 67], bqo(0), 460, 'rh'),
  ...chordHits([67, 71, 74], bqo(1), 460, 'rh'),
  ...chordHits([65, 69, 72], bqo(2), 460, 'rh'),
  ...chordHits([67, 71, 74], bqo(3), 460, 'rh'),
];

// B5.3: C–Am–F–G  (1-6m-4-5)
// RH roots descend stepwise: C4→A3→F3→G3 (each within a P5 of the previous)
const b5_3Notes = [
  { midi: 48, onset: 0, duration: 1900, hand: 'lh' as const },
  { midi: 57, onset: W, duration: 1900, hand: 'lh' as const }, // A3
  { midi: 53, onset: W * 2, duration: 1900, hand: 'lh' as const },
  { midi: 55, onset: W * 3, duration: 1900, hand: 'lh' as const },
  ...chordHits([60, 64, 67], bqo(0), 460, 'rh'), // Cmaj: C4 E4 G4
  ...chordHits([57, 60, 64], bqo(1), 460, 'rh'), // Amin: A3 C4 E4
  ...chordHits([53, 57, 60], bqo(2), 460, 'rh'), // Fmaj: F3 A3 C4
  ...chordHits([55, 59, 62], bqo(3), 460, 'rh'), // Gmaj: G3 B3 D4
];

// B5.4: C–G–Am–F  (1-5-6m-4)
const b5_4Notes = [
  { midi: 48, onset: 0, duration: 1900, hand: 'lh' as const },
  { midi: 55, onset: W, duration: 1900, hand: 'lh' as const },
  { midi: 57, onset: W * 2, duration: 1900, hand: 'lh' as const }, // A3
  { midi: 53, onset: W * 3, duration: 1900, hand: 'lh' as const },
  ...chordHits([60, 64, 67], bqo(0), 460, 'rh'),
  ...chordHits([67, 71, 74], bqo(1), 460, 'rh'),
  ...chordHits([57, 60, 64], bqo(2), 460, 'rh'),
  ...chordHits([65, 69, 72], bqo(3), 460, 'rh'),
];

// B5.5: Am–F–C–G  (6m-4-1-5)
const b5_5Notes = [
  { midi: 57, onset: 0, duration: 1900, hand: 'lh' as const }, // A3
  { midi: 53, onset: W, duration: 1900, hand: 'lh' as const },
  { midi: 48, onset: W * 2, duration: 1900, hand: 'lh' as const },
  { midi: 55, onset: W * 3, duration: 1900, hand: 'lh' as const },
  ...chordHits([57, 60, 64], bqo(0), 460, 'rh'),
  ...chordHits([65, 69, 72], bqo(1), 460, 'rh'),
  ...chordHits([60, 64, 67], bqo(2), 460, 'rh'),
  ...chordHits([67, 71, 74], bqo(3), 460, 'rh'),
];

// B6.1: C–F–G–C power, quarter chunks  (1-4-5-1)
const b6_1Notes = [
  { midi: 48, onset: 0, duration: 1900, hand: 'lh' as const },
  { midi: 53, onset: W, duration: 1900, hand: 'lh' as const },
  { midi: 55, onset: W * 2, duration: 1900, hand: 'lh' as const },
  { midi: 48, onset: W * 3, duration: 1900, hand: 'lh' as const },
  ...chordHits([60, 67], bqo(0), 460, 'rh'),
  ...chordHits([60, 67], bqo(1), 460, 'rh'),
  ...chordHits([60, 67], bqo(2), 460, 'rh'),
  ...chordHits([60, 67], bqo(3), 460, 'rh'),
];

// B6.2: C–F–Am–G power, 3+3+2 chunks  (1-4-6m-5)
const b6_2Notes = [
  { midi: 48, onset: 0, duration: 1900, hand: 'lh' as const },
  { midi: 53, onset: W, duration: 1900, hand: 'lh' as const },
  { midi: 57, onset: W * 2, duration: 1900, hand: 'lh' as const }, // A3
  { midi: 55, onset: W * 3, duration: 1900, hand: 'lh' as const },
  ...chordHits([60, 67], b32o(0), 460, 'rh'),
  ...chordHits([60, 67], b32o(1), 460, 'rh'),
  ...chordHits([60, 67], b32o(2), 460, 'rh'),
  ...chordHits([60, 67], b32o(3), 460, 'rh'),
];

const popSectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    // B1: Arpeggiate Chords
    // OOT = 3-note ascending (1-3-5). IT = 5-note up-and-down (1-3-5-3-1).
    {
      stepNumber: 8,
      module: 'pop_l1',
      section: 'B',
      subsection: 'B1: Arpeggiate Chords',
      activity: 'B1.1: Arpeggiate 1 Major (Out of Time)',
      direction: 'Play the notes of the 1 major chord one at a time going up.',
      assessment: 'pitch_only',
      tag: 'pop:arpeggiate_maj_oot | pop',
      styleRef: 'l1a',
      successFeedback: 'Clean arpeggio.',
      targetNotes: [
        { midi: 60, onset: 0, duration: 460 },
        { midi: 64, onset: Q, duration: 460 },
        { midi: 67, onset: Q * 2, duration: 460 },
      ],
    },
    {
      stepNumber: 9,
      module: 'pop_l1',
      section: 'B',
      subsection: 'B1: Arpeggiate Chords',
      activity: 'B1.2: Arpeggiate 1 Major (In Time)',
      direction: 'In a steady tempo, arpeggiate the 1 major chord up and down.',
      assessment: 'pitch_order_timing',
      tag: 'pop:arpeggiate_maj_it | pop',
      styleRef: 'l1a',
      successFeedback: 'Nice arc — up and back.',
      targetNotes: [
        { midi: 60, onset: 0, duration: 460 },
        { midi: 64, onset: Q, duration: 460 },
        { midi: 67, onset: Q * 2, duration: 460 },
        { midi: 64, onset: Q * 3, duration: 460 },
        { midi: 60, onset: Q * 4, duration: 460 },
      ],
    },
    {
      stepNumber: 10,
      module: 'pop_l1',
      section: 'B',
      subsection: 'B1: Arpeggiate Chords',
      activity: 'B1.3: Arpeggiate 6 Minor (Out of Time)',
      direction: 'Play the notes of the 6 minor chord one at a time going up.',
      assessment: 'pitch_only',
      tag: 'pop:arpeggiate_min_oot | pop',
      styleRef: 'l1a',
      successFeedback: 'Good — you found the minor color.',
      targetNotes: [
        { midi: 57, onset: 0, duration: 460 },
        { midi: 60, onset: Q, duration: 460 },
        { midi: 64, onset: Q * 2, duration: 460 },
      ],
    },
    {
      stepNumber: 11,
      module: 'pop_l1',
      section: 'B',
      subsection: 'B1: Arpeggiate Chords',
      activity: 'B1.4: Arpeggiate 6 Minor (In Time)',
      direction: 'In a steady tempo, arpeggiate the 6 minor chord up and down.',
      assessment: 'pitch_order_timing',
      tag: 'pop:arpeggiate_min_it | pop',
      styleRef: 'l1a',
      successFeedback: 'Smooth minor arc.',
      targetNotes: [
        { midi: 57, onset: 0, duration: 460 },
        { midi: 60, onset: Q, duration: 460 },
        { midi: 64, onset: Q * 2, duration: 460 },
        { midi: 60, onset: Q * 3, duration: 460 },
        { midi: 57, onset: Q * 4, duration: 460 },
      ],
    },

    // B2: Chord Voicings
    {
      stepNumber: 12,
      module: 'pop_l1',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.1: 1 Major Triad ×4 (Out of Time)',
      direction:
        'Play a C major triad chord four times. RH plays the chord, LH plays the bass note.',
      assessment: 'pitch_only',
      tag: 'pop:maj_oot | pop',
      styleRef: 'l1a',
      successFeedback: 'Solid C major — the foundation of pop.',
      targetNotes: chordHits([60, 64, 67], WHOLE_ONSETS_4, 1900),
    },
    {
      stepNumber: 13,
      module: 'pop_l1',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.2: 1 Major Triad Quarter-Note Chunking (In Time)',
      direction:
        'In a steady tempo, chunk the C major triad in quarter notes for 4 bars.',
      assessment: 'pitch_order_timing',
      tag: 'pop:maj_it | pop',
      styleRef: 'l1a',
      successFeedback: "Locked in — that's the pop piano feel.",
      targetNotes: chordHits([60, 64, 67], QUARTER_ONSETS_4BARS, 460),
    },
    {
      stepNumber: 14,
      module: 'pop_l1',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.3: 6 Minor Triad ×4 (Out of Time)',
      direction:
        'Play an A minor triad chord four times. RH plays the chord, LH plays the bass note.',
      assessment: 'pitch_only',
      tag: 'pop:min_oot | pop',
      styleRef: 'l1a',
      successFeedback: 'Good — that minor color is everything in pop.',
      targetNotes: chordHits([57, 60, 64], WHOLE_ONSETS_4, 1900),
    },
    {
      stepNumber: 15,
      module: 'pop_l1',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.4: 6 Minor Triad Quarter-Note Chunking (In Time)',
      direction:
        'In a steady tempo, chunk the A minor triad in quarter notes for 4 bars.',
      assessment: 'pitch_order_timing',
      tag: 'pop:min_it | pop',
      styleRef: 'l1a',
      successFeedback: 'Minor and grooving.',
      targetNotes: chordHits([57, 60, 64], QUARTER_ONSETS_4BARS, 460),
    },

    // B3: More POP Chords (4 maj and 5 maj)
    {
      stepNumber: 16,
      module: 'pop_l1',
      section: 'B',
      subsection: 'B3: More POP Chords',
      activity: 'B3.1: Arpeggiate 4 Major (Out of Time)',
      direction: 'Play the notes of the 4 major chord one at a time going up.',
      assessment: 'pitch_only',
      tag: 'pop:arpeggiate_4maj_oot | pop',
      styleRef: 'l1a',
      successFeedback: "F major — you've got the 4 chord.",
      targetNotes: [
        { midi: 65, onset: 0, duration: 460 },
        { midi: 69, onset: Q, duration: 460 },
        { midi: 72, onset: Q * 2, duration: 460 },
      ],
    },
    {
      stepNumber: 17,
      module: 'pop_l1',
      section: 'B',
      subsection: 'B3: More POP Chords',
      activity: 'B3.2: Arpeggiate 4 Major (In Time)',
      direction: 'In a steady tempo, arpeggiate the 4 major chord up and down.',
      assessment: 'pitch_order_timing',
      tag: 'pop:arpeggiate_4maj_it | pop',
      styleRef: 'l1a',
      successFeedback: 'F major arc — smooth.',
      targetNotes: [
        { midi: 65, onset: 0, duration: 460 },
        { midi: 69, onset: Q, duration: 460 },
        { midi: 72, onset: Q * 2, duration: 460 },
        { midi: 69, onset: Q * 3, duration: 460 },
        { midi: 65, onset: Q * 4, duration: 460 },
      ],
    },
    {
      stepNumber: 18,
      module: 'pop_l1',
      section: 'B',
      subsection: 'B3: More POP Chords',
      activity: 'B3.3: 4 Major Triad Quarter-Note Chunking (In Time)',
      direction:
        'In a steady tempo, chunk the F major triad in quarter notes for 4 bars.',
      assessment: 'pitch_order_timing',
      tag: 'pop:4maj_it | pop',
      styleRef: 'l1a',
      successFeedback: 'F major locked in.',
      targetNotes: chordHits([65, 69, 72], QUARTER_ONSETS_4BARS, 460),
    },
    {
      stepNumber: 19,
      module: 'pop_l1',
      section: 'B',
      subsection: 'B3: More POP Chords',
      activity: 'B3.4: Arpeggiate 5 Major (Out of Time)',
      direction: 'Play the notes of the 5 major chord one at a time going up.',
      assessment: 'pitch_only',
      tag: 'pop:arpeggiate_5maj_oot | pop',
      styleRef: 'l1a',
      successFeedback: 'G major — the tension chord.',
      targetNotes: [
        { midi: 67, onset: 0, duration: 460 },
        { midi: 71, onset: Q, duration: 460 },
        { midi: 74, onset: Q * 2, duration: 460 },
      ],
    },
    {
      stepNumber: 20,
      module: 'pop_l1',
      section: 'B',
      subsection: 'B3: More POP Chords',
      activity: 'B3.5: Arpeggiate 5 Major (In Time)',
      direction: 'In a steady tempo, arpeggiate the 5 major chord up and down.',
      assessment: 'pitch_order_timing',
      tag: 'pop:arpeggiate_5maj_it | pop',
      styleRef: 'l1a',
      successFeedback: 'G major arc — clean.',
      targetNotes: [
        { midi: 67, onset: 0, duration: 460 },
        { midi: 71, onset: Q, duration: 460 },
        { midi: 74, onset: Q * 2, duration: 460 },
        { midi: 71, onset: Q * 3, duration: 460 },
        { midi: 67, onset: Q * 4, duration: 460 },
      ],
    },
    {
      stepNumber: 21,
      module: 'pop_l1',
      section: 'B',
      subsection: 'B3: More POP Chords',
      activity: 'B3.6: 5 Major Triad Quarter-Note Chunking (In Time)',
      direction:
        'In a steady tempo, chunk the G major triad in quarter notes for 4 bars.',
      assessment: 'pitch_order_timing',
      tag: 'pop:5maj_it | pop',
      styleRef: 'l1a',
      successFeedback: "G major — you've got all four pillar chords now.",
      targetNotes: chordHits([67, 71, 74], QUARTER_ONSETS_4BARS, 460),
    },

    // B4: Power Chords
    {
      stepNumber: 22,
      module: 'pop_l1',
      section: 'B',
      subsection: 'B4: POP Power Chords',
      activity: 'B4.1: 1 Power Chord (Out of Time)',
      direction:
        'A power chord is simply the root and 5th of a chord. Without a major or minor 3rd, the power chord is a strong and versatile sound.',
      assessment: 'pitch_only',
      tag: 'pop:1power_oot | pop',
      styleRef: 'l1a',
      successFeedback: 'Root and fifth — open and powerful.',
      targetNotes: [
        { midi: 60, onset: 0, duration: 1900 },
        { midi: 67, onset: 0, duration: 1900 },
      ],
    },
    {
      stepNumber: 23,
      module: 'pop_l1',
      section: 'B',
      subsection: 'B4: POP Power Chords',
      activity: 'B4.2: 1 Power Chord Quarter-Note Chunking (In Time)',
      direction: 'In a steady tempo, chunk the 1 power chord in quarter notes.',
      assessment: 'pitch_order_timing',
      tag: 'pop:chunk_1power_it | pop',
      styleRef: 'l1a',
      successFeedback: "Power chord pulse — that's the rock foundation.",
      targetNotes: [
        { midi: 60, onset: 0, duration: 460 },
        { midi: 67, onset: 0, duration: 460 },
        { midi: 60, onset: Q, duration: 460 },
        { midi: 67, onset: Q, duration: 460 },
        { midi: 60, onset: Q * 2, duration: 460 },
        { midi: 67, onset: Q * 2, duration: 460 },
        { midi: 60, onset: Q * 3, duration: 460 },
        { midi: 67, onset: Q * 3, duration: 460 },
        // final downbeat
        { midi: 60, onset: W, duration: 460 },
        { midi: 67, onset: W, duration: 460 },
      ],
    },
    {
      stepNumber: 24,
      module: 'pop_l1',
      section: 'B',
      subsection: 'B4: POP Power Chords',
      activity:
        'B4.3: 2-Bar Power Chord Jam: Quarter-Note Chunking + Moving Bass (In Time)',
      direction:
        'In a steady tempo, RH chunk the 1 power chord in quarter notes while holding bass notes in the LH. Notice the LH changes notes while the RH remains.',
      assessment: 'pitch_order_timing',
      tag: 'pop:chunk_1power_bass_4chords_it | pop',
      styleRef: 'l1a',
      grooveId: 'groove_pop_01',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1a',
      },
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['bass', 'chords'],
      },
      chordSymbols: ['C', 'F', 'G', 'C'],
      successFeedback:
        "Right hand stays, left hand moves — that's the technique.",
      targetNotes: [
        // RH: C power chord quarter-note chunks × 2 bars (8 hits)
        { midi: 60, onset: 0, duration: 460, hand: 'rh' },
        { midi: 67, onset: 0, duration: 460, hand: 'rh' },
        { midi: 60, onset: Q, duration: 460, hand: 'rh' },
        { midi: 67, onset: Q, duration: 460, hand: 'rh' },
        { midi: 60, onset: Q * 2, duration: 460, hand: 'rh' },
        { midi: 67, onset: Q * 2, duration: 460, hand: 'rh' },
        { midi: 60, onset: Q * 3, duration: 460, hand: 'rh' },
        { midi: 67, onset: Q * 3, duration: 460, hand: 'rh' },
        { midi: 60, onset: W, duration: 460, hand: 'rh' },
        { midi: 67, onset: W, duration: 460, hand: 'rh' },
        { midi: 60, onset: W + Q, duration: 460, hand: 'rh' },
        { midi: 67, onset: W + Q, duration: 460, hand: 'rh' },
        { midi: 60, onset: W + Q * 2, duration: 460, hand: 'rh' },
        { midi: 67, onset: W + Q * 2, duration: 460, hand: 'rh' },
        { midi: 60, onset: W + Q * 3, duration: 460, hand: 'rh' },
        { midi: 67, onset: W + Q * 3, duration: 460, hand: 'rh' },
        // LH: C2(48) beat 1-2, F2(53) beat 3-4, G2(55) beat 5-6, C2(48) beat 7-8
        { midi: 48, onset: 0, duration: 940, hand: 'lh' },
        { midi: 53, onset: H, duration: 940, hand: 'lh' },
        { midi: 55, onset: W, duration: 940, hand: 'lh' },
        { midi: 48, onset: W + H, duration: 940, hand: 'lh' },
        // final downbeat
        { midi: 48, onset: W * 2, duration: 460, hand: 'lh' },
      ],
    },

    // B5: POP Chords with Play-Along (5 individual progressions)
    {
      stepNumber: 25,
      module: 'pop_l1',
      section: 'B',
      subsection: 'B5: POP Chords with Play-Along',
      activity: 'B5.1: Progression 1-4-1-4 in C',
      direction:
        'Play the C–F–C–F chord progression along with the track. RH plays the chord; LH holds the bass.',
      assessment: 'pitch_order_timing',
      tag: 'pop:chords_playalong_1-4-1-4 | pop',
      styleRef: 'l1b',
      grooveId: 'groove_pop_01',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1b',
      },
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['bass', 'chords'],
      },
      chordSymbols: ['C', 'F', 'C', 'F'],
      successFeedback: 'Back and forth — the 1-4 is the backbone of pop.',
      targetNotes: b5_1Notes,
    },
    {
      stepNumber: 26,
      module: 'pop_l1',
      section: 'B',
      subsection: 'B5: POP Chords with Play-Along',
      activity: 'B5.2: Progression 1-5-4-5-1 in C',
      direction:
        'Play the C–G–F–G–C chord progression along with the track. RH plays the chord; LH holds the bass.',
      assessment: 'pitch_order_timing',
      tag: 'pop:chords_playalong_1-5-4-5-1 | pop',
      styleRef: 'l1b',
      grooveId: 'groove_pop_01',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1b',
      },
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['bass', 'chords'],
      },
      chordSymbols: ['C', 'G', 'F', 'G'],
      successFeedback: 'All three major chords in one progression — well done.',
      targetNotes: b5_2Notes,
    },
    {
      stepNumber: 27,
      module: 'pop_l1',
      section: 'B',
      subsection: 'B5: POP Chords with Play-Along',
      activity: 'B5.3: Progression 1-6m-4-5-1 in C',
      direction:
        'Play the C–Am–F–G–C chord progression along with the track. RH plays the chord; LH holds the bass.',
      assessment: 'pitch_order_timing',
      tag: 'pop:chords_playalong_1-6m-4-5-1 | pop',
      styleRef: 'l1b',
      grooveId: 'groove_pop_01',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1b',
      },
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['bass', 'chords'],
      },
      chordSymbols: ['C', 'Am', 'F', 'G'],
      successFeedback:
        "Your first progression with a minor chord — that's the emotional depth of pop.",
      targetNotes: b5_3Notes,
    },
    {
      stepNumber: 28,
      module: 'pop_l1',
      section: 'B',
      subsection: 'B5: POP Chords with Play-Along',
      activity: 'B5.4: Progression 1-5-6m-4 in C',
      direction:
        'Play the C–G–Am–F chord progression along with the track. RH plays the chord; LH holds the bass.',
      assessment: 'pitch_order_timing',
      tag: 'pop:chords_playalong_1-5-6m-4 | pop',
      styleRef: 'l1b',
      grooveId: 'groove_pop_01',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1b',
      },
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['bass', 'chords'],
      },
      chordSymbols: ['C', 'G', 'Am', 'F'],
      successFeedback: 'That progression is behind hundreds of hit songs.',
      targetNotes: b5_4Notes,
    },
    {
      stepNumber: 29,
      module: 'pop_l1',
      section: 'B',
      subsection: 'B5: POP Chords with Play-Along',
      activity: 'B5.5: Progression 6m-4-1-5 in C',
      direction:
        'Play the Am–F–C–G chord progression along with the track. RH plays the chord; LH holds the bass.',
      assessment: 'pitch_order_timing',
      tag: 'pop:chords_playalong_6m-4-1-5 | pop',
      styleRef: 'l1b',
      grooveId: 'groove_pop_01',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1b',
      },
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['bass', 'chords'],
      },
      chordSymbols: ['Am', 'F', 'C', 'G'],
      successFeedback:
        'Same chords, starts on the minor — totally different feeling.',
      targetNotes: b5_5Notes,
    },

    // B6: Power Chord Play-Alongs
    {
      stepNumber: 30,
      module: 'pop_l1',
      section: 'B',
      subsection: 'B6: Power Chord Play-Alongs',
      activity:
        'B6.1: 4-Bar Power Chord Jam: Quarter-Note Chunking + Moving Bass',
      direction:
        'RH chunks the 1 power chord in quarter notes while the LH tracks the bass movement. Listen for the bass line and lock in.',
      assessment: 'pitch_order_timing',
      tag: 'pop:chunk_1power_bass_1-4-5-1_playalong | pop',
      styleRef: 'l1b',
      grooveId: 'groove_pop_02',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1b',
      },
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['bass', 'chords'],
      },
      chordSymbols: ['C', 'F', 'G', 'C'],
      successFeedback:
        "Right hand stays on the power chord, left hand walks the bass — you've got it.",
      targetNotes: b6_1Notes,
    },
    {
      stepNumber: 31,
      module: 'pop_l1',
      section: 'B',
      subsection: 'B6: Power Chord Play-Alongs',
      activity: 'B6.2: 4-Bar Power Chord Jam: 3+3+2 Chunking + Moving Bass',
      direction:
        'RH uses a 3+3+2 chunk pattern (dotted quarter – dotted quarter – quarter) while the LH tracks the bass. Feel the syncopation.',
      assessment: 'pitch_order_timing',
      tag: 'pop:chunk_1power_bass_1-4-6m-5_playalong | pop',
      styleRef: 'l1b',
      grooveId: 'groove_pop_02',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1b',
      },
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['bass', 'chords'],
      },
      chordSymbols: ['C', 'F', 'Am', 'G'],
      successFeedback:
        "The 3+3+2 groove — that's the pop syncopation signature.",
      targetNotes: b6_2Notes,
    },
  ],
};

// ─── SECTION C: BASS ───────────────────────────────────────────────────────

// C major pentatonic bass: C2=48, D2=50, E2=52, G2=55, A2=57, C3=60
// C ionian bass: C2=48, D2=50, E2=52, F2=53, G2=55, A2=57, B2=59, C3=60

const popSectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 32,
      module: 'pop_l1',
      section: 'C',
      subsection: 'C1: Bass Scale (Major Pentatonic)',
      activity: 'C1.1: Major Pentatonic Bass Ascending (Out of Time)',
      direction:
        'Play the C major pentatonic scale in the bass register going up.',
      assessment: 'pitch_only',
      tag: 'pop:bass_major_pentatonic_ascending_oot | pop',
      styleRef: 'l1a',
      scaleIntervals: [0, 2, 4, 7, 9],
      scaleId: 'major_pentatonic',
      successFeedback: 'Clean bass ascent.',
      targetNotes: [
        { midi: 48, onset: 0, duration: 460 },
        { midi: 50, onset: Q, duration: 460 },
        { midi: 52, onset: Q * 2, duration: 460 },
        { midi: 55, onset: Q * 3, duration: 460 },
        { midi: 57, onset: Q * 4, duration: 460 },
        { midi: 60, onset: Q * 5, duration: 460 },
      ],
    },
    {
      stepNumber: 33,
      module: 'pop_l1',
      section: 'C',
      subsection: 'C1: Bass Scale (Major Pentatonic)',
      activity: 'C1.2: Major Pentatonic Bass Descending (Out of Time)',
      direction:
        'Play the C major pentatonic scale in the bass register going down.',
      assessment: 'pitch_only',
      tag: 'pop:bass_major_pentatonic_descending_oot | pop',
      styleRef: 'l1a',
      scaleIntervals: [0, 2, 4, 7, 9],
      scaleId: 'major_pentatonic',
      successFeedback: 'Smooth descent.',
      targetNotes: [
        { midi: 60, onset: 0, duration: 460 },
        { midi: 57, onset: Q, duration: 460 },
        { midi: 55, onset: Q * 2, duration: 460 },
        { midi: 52, onset: Q * 3, duration: 460 },
        { midi: 50, onset: Q * 4, duration: 460 },
        { midi: 48, onset: Q * 5, duration: 460 },
      ],
    },
    {
      stepNumber: 34,
      module: 'pop_l1',
      section: 'C',
      subsection: 'C1: Bass Scale (Major Pentatonic)',
      activity: 'C1.3: Major Pentatonic Bass Ascending & Descending (In Time)',
      direction:
        'In a steady tempo, play the C major pentatonic bass scale going up and then down.',
      assessment: 'pitch_order_timing',
      tag: 'pop:bass_major_pentatonic_asc_desc_it | pop',
      styleRef: 'l1a',
      scaleIntervals: [0, 2, 4, 7, 9],
      scaleId: 'major_pentatonic',
      successFeedback: 'Up and down — the bass range is yours.',
      targetNotes: [
        { midi: 48, onset: 0, duration: 460 },
        { midi: 50, onset: Q, duration: 460 },
        { midi: 52, onset: Q * 2, duration: 460 },
        { midi: 55, onset: Q * 3, duration: 460 },
        { midi: 57, onset: Q * 4, duration: 460 },
        { midi: 60, onset: Q * 5, duration: 460 },
        { midi: 57, onset: Q * 6, duration: 460 },
        { midi: 55, onset: Q * 7, duration: 460 },
        { midi: 52, onset: Q * 8, duration: 460 },
        { midi: 50, onset: Q * 9, duration: 460 },
        { midi: 48, onset: Q * 10, duration: 460 },
      ],
    },
    {
      stepNumber: 35,
      module: 'pop_l1',
      section: 'C',
      subsection: 'C1: Bass Scale (Major Scale / Ionian) — L2 Preview',
      activity: 'C1.4: Major Scale Bass Ascending (Out of Time)',
      direction:
        'Play the C major scale in the bass register going up. This is a preview of L2 vocabulary — the major scale adds the 4th and 7th to your pentatonic foundation.',
      assessment: 'pitch_only',
      tag: 'pop:bass_ionian_major_scale_ascending_oot | pop',
      styleRef: 'l1a',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'major_scale',
      successFeedback: 'All 7 notes — the full major scale in the bass.',
      targetNotes: [
        { midi: 48, onset: 0, duration: 460 },
        { midi: 50, onset: Q, duration: 460 },
        { midi: 52, onset: Q * 2, duration: 460 },
        { midi: 53, onset: Q * 3, duration: 460 },
        { midi: 55, onset: Q * 4, duration: 460 },
        { midi: 57, onset: Q * 5, duration: 460 },
        { midi: 59, onset: Q * 6, duration: 460 },
        { midi: 60, onset: Q * 7, duration: 460 },
      ],
    },
    {
      stepNumber: 36,
      module: 'pop_l1',
      section: 'C',
      subsection: 'C1: Bass Scale (Major Scale / Ionian) — L2 Preview',
      activity: 'C1.5: Major Scale Bass Descending (Out of Time)',
      direction: 'Play the C major scale in the bass register going down.',
      assessment: 'pitch_only',
      tag: 'pop:bass_ionian_major_scale_descending_oot | pop',
      styleRef: 'l1a',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'major_scale',
      successFeedback: 'Full scale descent — nice.',
      targetNotes: [
        { midi: 60, onset: 0, duration: 460 },
        { midi: 59, onset: Q, duration: 460 },
        { midi: 57, onset: Q * 2, duration: 460 },
        { midi: 55, onset: Q * 3, duration: 460 },
        { midi: 53, onset: Q * 4, duration: 460 },
        { midi: 52, onset: Q * 5, duration: 460 },
        { midi: 50, onset: Q * 6, duration: 460 },
        { midi: 48, onset: Q * 7, duration: 460 },
      ],
    },
    {
      stepNumber: 37,
      module: 'pop_l1',
      section: 'C',
      subsection: 'C1: Bass Scale (Major Scale / Ionian) — L2 Preview',
      activity: 'C1.6: Major Scale Bass Ascending & Descending (In Time)',
      direction:
        'In a steady tempo, play the C major scale in the bass register going up and then down.',
      assessment: 'pitch_order_timing',
      tag: 'pop:bass_ionian_major_scale_asc_desc_it | pop',
      styleRef: 'l1a',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'major_scale',
      successFeedback:
        "All 7 notes, up and down, in time — that's real command of the bass range.",
      targetNotes: [
        { midi: 48, onset: 0, duration: 460 },
        { midi: 50, onset: Q, duration: 460 },
        { midi: 52, onset: Q * 2, duration: 460 },
        { midi: 53, onset: Q * 3, duration: 460 },
        { midi: 55, onset: Q * 4, duration: 460 },
        { midi: 57, onset: Q * 5, duration: 460 },
        { midi: 59, onset: Q * 6, duration: 460 },
        { midi: 60, onset: Q * 7, duration: 460 },
        { midi: 59, onset: Q * 8, duration: 460 },
        { midi: 57, onset: Q * 9, duration: 460 },
        { midi: 55, onset: Q * 10, duration: 460 },
        { midi: 53, onset: Q * 11, duration: 460 },
        { midi: 52, onset: Q * 12, duration: 460 },
        { midi: 50, onset: Q * 13, duration: 460 },
        { midi: 48, onset: Q * 14, duration: 460 },
      ],
    },

    // C2: POP Bass Techniques
    {
      stepNumber: 38,
      module: 'pop_l1',
      section: 'C',
      subsection: 'C2: POP Bass Techniques',
      activity: 'C2.1: Root-Based Bass Pattern (Out of Time)',
      direction:
        'Play the root of each chord as a half note: C for bar 1, F for bar 2.',
      assessment: 'pitch_only',
      tag: 'pop:bass_root_pattern_oot | pop',
      styleRef: 'l1a',
      chordSymbols: ['C', 'F'],
      successFeedback: 'Root-locked bass — the foundation.',
      targetNotes: [
        { midi: 48, onset: 0, duration: 940 }, // C, half note bar 1
        { midi: 53, onset: W, duration: 940 }, // F, half note bar 2
      ],
    },
    {
      stepNumber: 39,
      module: 'pop_l1',
      section: 'C',
      subsection: 'C2: POP Bass Techniques',
      activity: 'C2.2: Root-Based Bass Pattern (In Time)',
      direction:
        'In a steady tempo, play root notes with a long–short–hold feel: dotted quarter, eighth, half.',
      assessment: 'pitch_order_timing',
      tag: 'pop:bass_root_pattern_it | pop',
      styleRef: 'l1a',
      chordSymbols: ['C', 'F'],
      successFeedback: 'Root bass in time — solid.',
      targetNotes: [
        // Bar 1: C — dotted quarter (720t) · eighth (240t) · half (960t)
        { midi: 48, onset: 0, duration: 700 },
        { midi: 48, onset: 720, duration: 220 },
        { midi: 48, onset: H, duration: 940 },
        // Bar 2: F — same rhythm
        { midi: 53, onset: W, duration: 700 },
        { midi: 53, onset: W + 720, duration: 220 },
        { midi: 53, onset: W + H, duration: 940 },
      ],
    },
    {
      stepNumber: 40,
      module: 'pop_l1',
      section: 'C',
      subsection: 'C2: POP Bass Techniques',
      activity: 'C2.3: POP Bass Pattern (Out of Time)',
      direction:
        'Play C for 3 beats, then the 5th (G) for 1 beat, then return to C for a full bar.',
      assessment: 'pitch_only',
      tag: 'pop:bass_genre_pattern_oot | pop',
      styleRef: 'l1a',
      chordSymbols: ['C', 'C'],
      successFeedback: 'Root and fifth — your bass is moving.',
      targetNotes: [
        { midi: 48, onset: 0, duration: 1400 }, // C, 3 beats
        { midi: 55, onset: Q * 3, duration: 460 }, // G (5th), 1 beat
        { midi: 48, onset: W, duration: 1900 }, // C, whole note bar 2
      ],
    },
    {
      stepNumber: 41,
      module: 'pop_l1',
      section: 'C',
      subsection: 'C2: POP Bass Techniques',
      activity: 'C2.4: POP Bass Pattern (In Time)',
      direction:
        'In a steady tempo, play root then 5th for C, then root then 5th for F, and resolve back to C.',
      assessment: 'pitch_order_timing',
      tag: 'pop:bass_genre_pattern_it | pop',
      styleRef: 'l1a',
      chordSymbols: ['C', 'F', 'C'],
      successFeedback: "Bass with movement — that's the pop groove.",
      targetNotes: [
        // Bar 1: C — root 3 beats, 5th 1 beat
        { midi: 48, onset: 0, duration: 1400 }, // C
        { midi: 55, onset: Q * 3, duration: 460 }, // G (5th of C)
        // Bar 2: F — root 3 beats, 5th 1 beat
        { midi: 53, onset: W, duration: 1400 }, // F
        { midi: 48, onset: W + Q * 3, duration: 460 }, // C (5th of F, descends to tonic)
        // Bar 3: C — whole note resolution
        { midi: 48, onset: W * 2, duration: 1900 }, // C
      ],
    },

    // C3: Bass with Play-Along
    {
      stepNumber: 42,
      module: 'pop_l1',
      section: 'C',
      subsection: 'C3: Bass with Play-Along',
      activity: 'C3.1: POP Bass over Play-Along',
      direction:
        'Play this bass line over the chord progression — two notes per bar, landing on C.',
      assessment: 'pitch_order_timing',
      tag: 'pop:bass_playalong_l1 | pop',
      styleRef: 'l1b',
      grooveId: 'groove_pop_01',
      successFeedback: "Bass locked to the groove — that's the feel.",
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['bass'],
      },
      chordSymbols: ['C', 'F', 'G', 'C'],
      targetNotes: [
        // Bar 1 (C): root → 3rd
        { midi: 48, onset: 0, duration: 940, hand: 'lh' as const }, // C
        { midi: 52, onset: H, duration: 940, hand: 'lh' as const }, // E (3rd)
        // Bar 2 (F): root → 3rd
        { midi: 53, onset: W, duration: 940, hand: 'lh' as const }, // F
        { midi: 57, onset: W + H, duration: 940, hand: 'lh' as const }, // A (3rd)
        // Bar 3 (G): root → 5th
        { midi: 55, onset: W * 2, duration: 940, hand: 'lh' as const }, // G
        { midi: 50, onset: W * 2 + H, duration: 940, hand: 'lh' as const }, // D (5th, descending)
        // Bar 4 (C): whole note landing
        { midi: 48, onset: W * 3, duration: 1900, hand: 'lh' as const }, // C
      ],
    },
  ],
};

// ─── SECTION D: TWO-HAND + STUDIO ─────────────────────────────────────────

// D1.1/D1.2: 1-4-5-1 progression, each chord 1 bar (whole note)
// LH: C2(48), F2(53), G2(55), C2(48)
// RH: C(60,64,67), F(65,69,72), G(67,71,74), C(60,64,67)
const d1TargetNotes = [
  // LH roots
  { midi: 48, onset: 0, duration: 1900, hand: 'lh' as const },
  { midi: 53, onset: W, duration: 1900, hand: 'lh' as const },
  { midi: 55, onset: W * 2, duration: 1900, hand: 'lh' as const },
  { midi: 48, onset: W * 3, duration: 1900, hand: 'lh' as const },
  // RH chords
  { midi: 60, onset: 0, duration: 1900, hand: 'rh' as const },
  { midi: 64, onset: 0, duration: 1900, hand: 'rh' as const },
  { midi: 67, onset: 0, duration: 1900, hand: 'rh' as const },
  { midi: 65, onset: W, duration: 1900, hand: 'rh' as const },
  { midi: 69, onset: W, duration: 1900, hand: 'rh' as const },
  { midi: 72, onset: W, duration: 1900, hand: 'rh' as const },
  { midi: 67, onset: W * 2, duration: 1900, hand: 'rh' as const },
  { midi: 71, onset: W * 2, duration: 1900, hand: 'rh' as const },
  { midi: 74, onset: W * 2, duration: 1900, hand: 'rh' as const },
  { midi: 60, onset: W * 3, duration: 1900, hand: 'rh' as const },
  { midi: 64, onset: W * 3, duration: 1900, hand: 'rh' as const },
  { midi: 67, onset: W * 3, duration: 1900, hand: 'rh' as const },
];

// D1.3: 1-4-5-1 play-along — LH roots on beats 1+3, RH quarter-chunk triads
// Step up from D1.1/D1.2 whole notes: rhythmically active both hands
const d1_3TargetNotes = [
  // LH: root on beats 1 and 3 of each bar
  { midi: 48, onset: 0, duration: 460, hand: 'lh' as const }, // C bar 1 beat 1
  { midi: 48, onset: H, duration: 460, hand: 'lh' as const }, // C bar 1 beat 3
  { midi: 53, onset: W, duration: 460, hand: 'lh' as const }, // F bar 2 beat 1
  { midi: 53, onset: W + H, duration: 460, hand: 'lh' as const }, // F bar 2 beat 3
  { midi: 55, onset: W * 2, duration: 460, hand: 'lh' as const }, // G bar 3 beat 1
  { midi: 55, onset: W * 2 + H, duration: 460, hand: 'lh' as const }, // G bar 3 beat 3
  { midi: 48, onset: W * 3, duration: 460, hand: 'lh' as const }, // C bar 4 beat 1
  { midi: 48, onset: W * 3 + H, duration: 460, hand: 'lh' as const }, // C bar 4 beat 3
  // RH: quarter-chunk triads — C, F, G, C
  ...chordHits([60, 64, 67], bqo(0), 460, 'rh'),
  ...chordHits([65, 69, 72], bqo(1), 460, 'rh'),
  ...chordHits([67, 71, 74], bqo(2), 460, 'rh'),
  ...chordHits([60, 64, 67], bqo(3), 460, 'rh'),
];

// D2.1: 8-bar 1-5-6m-4 × 2 — RH C power chord quarter chunks, LH whole-note roots
// C3–G3–A3–F3–C3–G3–A3–F3  voice leading: +7, +2, -4, -5, +7, +2, -4
const d2_1TargetNotes = [
  // LH whole-note roots (8 bars)
  { midi: 48, onset: 0, duration: 1900, hand: 'lh' as const }, // C3
  { midi: 55, onset: W, duration: 1900, hand: 'lh' as const }, // G3  +7
  { midi: 57, onset: W * 2, duration: 1900, hand: 'lh' as const }, // A3  +2
  { midi: 53, onset: W * 3, duration: 1900, hand: 'lh' as const }, // F3  -4
  { midi: 48, onset: W * 4, duration: 1900, hand: 'lh' as const }, // C3  -5
  { midi: 55, onset: W * 5, duration: 1900, hand: 'lh' as const }, // G3  +7
  { midi: 57, onset: W * 6, duration: 1900, hand: 'lh' as const }, // A3  +2
  { midi: 53, onset: W * 7, duration: 1900, hand: 'lh' as const }, // F3  -4
  // RH: C power chord [60,67] quarter chunks across all 8 bars
  ...chordHits([60, 67], bqo(0), 460, 'rh'),
  ...chordHits([60, 67], bqo(1), 460, 'rh'),
  ...chordHits([60, 67], bqo(2), 460, 'rh'),
  ...chordHits([60, 67], bqo(3), 460, 'rh'),
  ...chordHits([60, 67], bqo(4), 460, 'rh'),
  ...chordHits([60, 67], bqo(5), 460, 'rh'),
  ...chordHits([60, 67], bqo(6), 460, 'rh'),
  ...chordHits([60, 67], bqo(7), 460, 'rh'),
];

// D2.2: 8-bar 6m-4-5-1 × 2 — RH C power chord 3+3+2 chunks, LH whole-note roots
// A3–F3–G3–C4–A3–F3–G3–C4  voice leading: -4, +2, +5, -3, -4, +2, +5
// C4 (not C3) keeps the cycle resolution C4→A3 a smooth minor 3rd down
const d2_2TargetNotes = [
  // LH whole-note roots (8 bars)
  { midi: 57, onset: 0, duration: 1900, hand: 'lh' as const }, // A3
  { midi: 53, onset: W, duration: 1900, hand: 'lh' as const }, // F3  -4
  { midi: 55, onset: W * 2, duration: 1900, hand: 'lh' as const }, // G3  +2
  { midi: 60, onset: W * 3, duration: 1900, hand: 'lh' as const }, // C4  +5
  { midi: 57, onset: W * 4, duration: 1900, hand: 'lh' as const }, // A3  -3
  { midi: 53, onset: W * 5, duration: 1900, hand: 'lh' as const }, // F3  -4
  { midi: 55, onset: W * 6, duration: 1900, hand: 'lh' as const }, // G3  +2
  { midi: 60, onset: W * 7, duration: 1900, hand: 'lh' as const }, // C4  +5
  // RH: C power chord [60,67] in 3+3+2 pattern across all 8 bars
  ...chordHits([60, 67], b32o(0), 460, 'rh'),
  ...chordHits([60, 67], b32o(1), 460, 'rh'),
  ...chordHits([60, 67], b32o(2), 460, 'rh'),
  ...chordHits([60, 67], b32o(3), 460, 'rh'),
  ...chordHits([60, 67], b32o(4), 460, 'rh'),
  ...chordHits([60, 67], b32o(5), 460, 'rh'),
  ...chordHits([60, 67], b32o(6), 460, 'rh'),
  ...chordHits([60, 67], b32o(7), 460, 'rh'),
];

const popSectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 43,
      module: 'pop_l1',
      section: 'D',
      subsection: 'D1: Two-Hand POP Performance',
      activity: 'D1.1: LH Bass + RH Chords (Out of Time)',
      direction:
        'Combine your LH bass notes with RH chords. LH plays the root of each chord; RH plays the full triad.',
      assessment: 'pitch_only',
      tag: 'pop:two_hand_bass_chords_oot | pop',
      styleRef: 'l1a',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1a',
      },
      backing_parts: {
        engine_generates: [],
        student_plays: ['bass', 'chords'],
      },
      chordSymbols: ['C', 'F', 'G', 'C'],
      successFeedback: "Both hands together — that's a full pop piano sound.",
      targetNotes: d1TargetNotes,
    },
    {
      stepNumber: 44,
      module: 'pop_l1',
      section: 'D',
      subsection: 'D1: Two-Hand POP Performance',
      activity: 'D1.2: LH Bass + RH Chords (In Time)',
      direction:
        'In a steady tempo, play LH bass roots and RH chord triads together through the 1-4-5-1 progression.',
      assessment: 'pitch_order_timing',
      tag: 'pop:two_hand_bass_chords_it | pop',
      styleRef: 'l1a',
      grooveId: 'groove_pop_01',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1a',
      },
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['bass', 'chords'],
      },
      chordSymbols: ['C', 'F', 'G', 'C'],
      successFeedback: "Two-hand coordination in time — that's the milestone.",
      targetNotes: d1TargetNotes,
    },
    {
      stepNumber: 45,
      module: 'pop_l1',
      section: 'D',
      subsection: 'D1: Two-Hand POP Performance',
      activity: 'D1.3: Full POP Performance with Play-Along',
      direction:
        'Play the full chord progression with LH bass and RH chords along with the backing track.',
      assessment: 'pitch_order_timing',
      tag: 'pop:two_hand_full_playalong_l1 | pop',
      styleRef: 'l1b',
      grooveId: 'groove_pop_01',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1b',
      },
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['bass', 'chords'],
      },
      chordSymbols: ['C', 'F', 'G', 'C'],
      successFeedback:
        "Full pop piano performance — you're playing with the band.",
      targetNotes: d1_3TargetNotes,
    },

    // D2: Power Chord Two-Hand Jams
    {
      stepNumber: 46,
      module: 'pop_l1',
      section: 'D',
      subsection: 'D2: Power Chord Two-Hand Jams',
      activity:
        'D2.1: 8-Bar Power Chord Jam: Quarter-Note Chunking + Moving Bass',
      direction:
        'In a steady tempo, RH chunks the 1 power chord in quarter notes while the LH tracks the bass movement through the 1-5-6m-4 progression. Listen for the bass line and lock in.',
      assessment: 'pitch_order_timing',
      tag: 'pop:chunk_1power_bass_1-5-6m-4_8bar_playalong | pop',
      styleRef: 'l1b',
      grooveId: 'groove_pop_02',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1b',
      },
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['bass', 'chords'],
      },
      chordSymbols: ['C', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F'],
      successFeedback:
        "Eight bars, power chord, moving bass — that's the full technique.",
      targetNotes: d2_1TargetNotes,
    },
    {
      stepNumber: 47,
      module: 'pop_l1',
      section: 'D',
      subsection: 'D2: Power Chord Two-Hand Jams',
      activity: 'D2.2: 8-Bar Power Chord Jam: 3+3+2 Chunking + Moving Bass',
      direction:
        'In a steady tempo, RH uses the 3+3+2 chunk pattern while the LH tracks the bass through the 6m-4-5-1 progression. Feel the syncopation.',
      assessment: 'pitch_order_timing',
      tag: 'pop:chunk_1power_bass_6m-4-5-1_8bar_playalong | pop',
      styleRef: 'l1b',
      grooveId: 'groove_pop_02',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1b',
      },
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['bass', 'chords'],
      },
      chordSymbols: ['Am', 'F', 'G', 'C', 'Am', 'F', 'G', 'C'],
      successFeedback:
        "Syncopated power chords with a moving bass — that's the full cluster.",
      targetNotes: d2_2TargetNotes,
    },
  ],
};

// ─── LEVEL PARAMS ──────────────────────────────────────────────────────────

const popL1Params = {
  defaultKey: 'C major',
  defaultScale: [0, 2, 4, 7, 9],
  defaultScaleId: 'major_pentatonic',
  tempoRange: [70, 110] as [number, number],
  swing: 0,
  grooves: ['groove_pop_01', 'groove_pop_02', 'groove_ballad_01'],
};

const stubParams = {
  defaultKey: 'C major',
  defaultScale: [0, 2, 4, 5, 7, 9, 11],
  defaultScaleId: 'major',
  tempoRange: [80, 130] as [number, number],
  swing: 0,
  grooves: [] as string[],
};

const stubSections: ActivitySectionV2[] = [];

// ─── EXPORTS ───────────────────────────────────────────────────────────────

export const popL1: ActivityFlowV2 = {
  genre: 'pop',
  level: 1,
  version: 'v2',
  title: 'Pop Level 1',
  params: popL1Params,
  sections: [popSectionA, popSectionB, popSectionC, popSectionD],
};

export const popL2: ActivityFlowV2 = {
  genre: 'pop',
  level: 2,
  version: 'v2',
  title: 'Pop Level 2',
  params: stubParams,
  sections: stubSections,
};

export const popL3: ActivityFlowV2 = {
  genre: 'pop',
  level: 3,
  version: 'v2',
  title: 'Pop Level 3',
  params: stubParams,
  sections: stubSections,
};

export const popFlows = [popL1, popL2, popL3] as const;
