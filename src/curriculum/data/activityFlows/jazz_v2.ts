/**
 * Jazz v2 — Activity Flows.
 *
 * Built from Peter's ICP Studio jazz material (JAZZ-LEVELS-FOR-MUSIC-ATLAS):
 * his melodies, bass templates and voicing systems, note for note, in their
 * written keys, plus a few steps in other keys. One style per level (lesson
 * styles jazz-l1-blues, jazz-l2-transfer, jazz-l3-ii-v-i):
 *
 * - L1 "Blues" (C): Blues Language phrases over C7, one phrase a step; C minor
 *   blues lines; 1-7 and 1-3-7 shells, 7-3-5 rootless; roots, root–5, two-feel.
 * - L2 "Color & Transfer" (C): Melodies to Transfer over the six chords of C
 *   major; 7-9-3-5, the area codes, rootless B, C Jam Blues shells; Peter's
 *   blues bass line, roots with approaches.
 * - L3 "The ii–V–I" (F, C, D minor): ii–V Fundamental lines, V–I cadences,
 *   minor tension and release; 3-5-7-9, rootless A, quartals; walking bass;
 *   two-hand systems.
 *
 * Eighths are written straight and swing as ICP plays lines (swingUnit '8n',
 * swing 64, easing above 130 bpm). Two chords in a bar are `chordsPerBar: 2`.
 * Jazz Band 1 plays under them; a step's chart picks its variation
 * (lessonPairings). Steps built from Peter's rules where ICP has no material
 * (root–5, roots with approaches, power chords over rootless) are drafts for
 * his review: jazz-L1/L2/L3-outline.md.
 */

import type {
  ActivityFlowV2,
  ActivitySectionV2,
} from '../../types/activity.v2';

// ── L1: Blues ──

const jazzL1SectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    {
      stepNumber: 1,
      module: 'jazz_l1',
      section: 'A',
      subsection: 'A1: Scale (C Major Blues)',
      activity: 'A1.1: C Major  Blues Scale (Out of Time)',
      direction: 'Bluesy Language 101: C–D–Eb-E-G-A-C',
      assessment: 'pitch_order',
      tag: 'jazz:l1_majblues_asc_oot | jazz',
      styleRef: 'l1a',
      successFeedback: 'Pentatonic with the bluesy flat 3',
      scaleIntervals: [0, 2, 3, 4, 7, 9],
      scaleId: 'major_blues',
      targetNotes: [
        { midi: 60, onset: 0, duration: 480, hand: 'rh' }, // C4
        { midi: 62, onset: 480, duration: 480, hand: 'rh' }, // D4
        { midi: 63, onset: 960, duration: 480, hand: 'rh' }, // E♭4
        { midi: 64, onset: 1440, duration: 480, hand: 'rh' }, // E4
        { midi: 67, onset: 1920, duration: 480, hand: 'rh' }, // G4
        { midi: 69, onset: 2400, duration: 480, hand: 'rh' }, // A4
        { midi: 72, onset: 2880, duration: 960, hand: 'rh' }, // C5
      ],
    },
    {
      stepNumber: 2,
      module: 'jazz_l1',
      section: 'A',
      subsection: 'A1: Scale (C Major Blues)',
      activity: 'A1.2: C Major Blues Descending (Out of Time)',
      direction: 'Now back down from the top C.',
      assessment: 'pitch_order',
      tag: 'jazz:l1_majblues_desc_oot | jazz',
      styleRef: 'l1a',
      successFeedback: 'Down the Major Blues - Notice the flat bluesy 3!',
      scaleIntervals: [0, 2, 3, 4, 7, 9],
      scaleId: 'major_blues',
      targetNotes: [
        { midi: 72, onset: 0, duration: 460, hand: 'rh' }, // C5
        { midi: 69, onset: 480, duration: 460, hand: 'rh' }, // A4
        { midi: 67, onset: 960, duration: 460, hand: 'rh' }, // G4
        { midi: 64, onset: 1440, duration: 460, hand: 'rh' }, // E4
        { midi: 63, onset: 1920, duration: 460, hand: 'rh' }, // E♭4
        { midi: 62, onset: 2400, duration: 460, hand: 'rh' }, // D4
        { midi: 60, onset: 2880, duration: 960, hand: 'rh' }, // C4
      ],
    },
    {
      stepNumber: 3,
      module: 'jazz_l1',
      section: 'A',
      subsection: 'A1: Scale (C Major Blues)',
      activity: 'A1.3: C Major Blues - Up and Down in Time (In Time)',
      direction: 'Up and down in eighths, swung',
      assessment: 'pitch_order_timing',
      tag: 'jazz:l1_majblues_updown_it | jazz',
      styleRef: 'l1a',
      successFeedback: 'Swing it!',
      scaleIntervals: [0, 2, 3, 4, 7, 9],
      scaleId: 'major_blues',
      tempo: 90,
      swing: 64,
      swingUnit: '8n',
      targetNotes: [
        { midi: 60, onset: 0, duration: 480, hand: 'rh' }, // C4
        { midi: 62, onset: 480, duration: 220, hand: 'rh' }, // D4
        { midi: 63, onset: 720, duration: 220, hand: 'rh' }, // E♭4
        { midi: 64, onset: 960, duration: 220, hand: 'rh' }, // E4
        { midi: 67, onset: 1200, duration: 220, hand: 'rh' }, // G4
        { midi: 69, onset: 1440, duration: 220, hand: 'rh' }, // A4
        { midi: 72, onset: 1680, duration: 720, hand: 'rh' }, // C5
        { midi: 69, onset: 2400, duration: 220, hand: 'rh' }, // A4
        { midi: 67, onset: 2640, duration: 220, hand: 'rh' }, // G4
        { midi: 64, onset: 2880, duration: 220, hand: 'rh' }, // E4
        { midi: 63, onset: 3120, duration: 220, hand: 'rh' }, // E♭4
        { midi: 62, onset: 3360, duration: 220, hand: 'rh' }, // D4
        { midi: 60, onset: 3600, duration: 1200, hand: 'rh' }, // C4
      ],
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['melody'],
      },
      chordSymbols: ['Cmaj6'],
    },
    {
      stepNumber: 4,
      module: 'jazz_l1',
      section: 'A',
      subsection: 'A2: Blues Phrases over C7',
      activity: 'A2.1: Blues Phrase 1',
      direction: 'D♯, E, D♯, E — minor 3 against the major 3 — then down to C.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l1_blues_phrase_1 | jazz',
      styleRef: 'l1a',
      successFeedback: 'The ♯9 and the 3: the sound of the blues over C7.',
      scaleIntervals: [0, 2, 3, 4, 7, 9],
      scaleId: 'major_blues',
      chordSymbols: ['C7'],
      tempo: 100,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 75, onset: 0, duration: 220 }, // E♭5
        { midi: 76, onset: 240, duration: 220 }, // E5
        { midi: 75, onset: 480, duration: 220 }, // E♭5
        { midi: 76, onset: 720, duration: 220 }, // E5
        { midi: 72, onset: 960, duration: 940 }, // C5
      ],
    },
    {
      stepNumber: 5,
      module: 'jazz_l1',
      section: 'A',
      subsection: 'A2: Blues Phrases over C7',
      activity: 'A2.2: Blues Phrase 2',
      direction: 'F, G, then D♯ up to E and down to C.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l1_blues_phrase_2 | jazz',
      styleRef: 'l1a',
      successFeedback: 'Up to the 5, down through the blue note home.',
      scaleIntervals: [0, 2, 3, 4, 7, 9],
      scaleId: 'major_blues',
      chordSymbols: ['C7'],
      tempo: 100,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 77, onset: 0, duration: 220, hand: 'rh' }, // F5
        { midi: 79, onset: 240, duration: 220, hand: 'rh' }, // G5
        { midi: 75, onset: 480, duration: 220, hand: 'rh' }, // E♭5
        { midi: 76, onset: 720, duration: 220, hand: 'rh' }, // E5
        { midi: 72, onset: 960, duration: 940, hand: 'rh' }, // C5
      ],
    },
    {
      stepNumber: 6,
      module: 'jazz_l1',
      section: 'A',
      subsection: 'A2: Blues Phrases over C7',
      activity: 'A2.3: Blues Phrase 3',
      direction:
        'B♭, A, G, F down the scale, then a quick D♯ grace note into E.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l1_blues_phrase_3 | jazz',
      styleRef: 'l1a',
      successFeedback: 'The ♭7 walking down to the 3.',
      scaleIntervals: [0, 2, 3, 4, 7, 9],
      scaleId: 'major_blues',
      chordSymbols: ['C7'],
      tempo: 100,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 70, onset: 0, duration: 220, hand: 'rh' }, // B♭4
        { midi: 69, onset: 240, duration: 220, hand: 'rh' }, // A4
        { midi: 67, onset: 480, duration: 220, hand: 'rh' }, // G4
        { midi: 65, onset: 720, duration: 220, hand: 'rh' }, // F4
        { midi: 63, onset: 960, duration: 120, hand: 'rh' }, // E♭4
        { midi: 64, onset: 1080, duration: 840, hand: 'rh' }, // E4
      ],
    },
    {
      stepNumber: 7,
      module: 'jazz_l1',
      section: 'A',
      subsection: 'A2: Blues Phrases over C7',
      activity: 'A2.4: Blues Phrase 4',
      direction: 'A quick triplet E♭–D–C, then D, A and C.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l1_blues_phrase_4 | jazz',
      styleRef: 'l1a',
      successFeedback: 'Triplet, then the 6: a jazzy turn.',
      scaleIntervals: [0, 2, 3, 4, 7, 9],
      scaleId: 'major_blues',
      chordSymbols: ['C7'],
      tempo: 100,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 75, onset: 0, duration: 140 }, // E♭5
        { midi: 74, onset: 160, duration: 140 }, // D5
        { midi: 72, onset: 320, duration: 140 }, // C5
        { midi: 74, onset: 480, duration: 220 }, // D5
        { midi: 69, onset: 720, duration: 220 }, // A4
        { midi: 72, onset: 960, duration: 940 }, // C5
      ],
    },
    {
      stepNumber: 12,
      module: 'jazz_l1',
      section: 'A',
      subsection: 'A3: Blues Phrases in F and B♭',
      activity: 'A3.1: Blues Phrase 1 in F',
      direction: 'Phrase 1 over F7: G♯, A, G♯, A, then F.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l1_blues_phrase_1_f | jazz',
      styleRef: 'l1a',
      successFeedback: 'The same phrase, a 4th higher: F blues.',
      key: 'F major',
      scaleIntervals: [0, 2, 3, 4, 7, 9],
      scaleId: 'major_blues',
      chordSymbols: ['F7'],
      tempo: 100,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 68, onset: 0, duration: 220, hand: 'rh' }, // A♭4
        { midi: 69, onset: 240, duration: 220, hand: 'rh' }, // A4
        { midi: 68, onset: 480, duration: 220, hand: 'rh' }, // A♭4
        { midi: 69, onset: 720, duration: 220, hand: 'rh' }, // A4
        { midi: 65, onset: 960, duration: 940, hand: 'rh' }, // F4
      ],
    },
    {
      stepNumber: 13,
      module: 'jazz_l1',
      section: 'A',
      subsection: 'A3: Blues Phrases in F and B♭',
      activity: 'A3.2: Blues Phrase 1 in B♭',
      direction: 'Phrase 3 over B♭7: A♭, G, F, E♭, then a grace note into D.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l1_blues_phrase_3_bb | jazz',
      styleRef: 'l1a',
      successFeedback: 'B♭ blues — the key of most blues heads.',
      key: 'Bb major',
      scaleIntervals: [0, 2, 3, 4, 7, 9],
      scaleId: 'major_blues',
      chordSymbols: ['Bb7'],
      tempo: 100,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 73, onset: 0, duration: 220, hand: 'rh' }, // D♭5
        { midi: 74, onset: 240, duration: 240, hand: 'rh' }, // D5
        { midi: 73, onset: 480, duration: 220, hand: 'rh' }, // D♭5
        { midi: 74, onset: 720, duration: 220, hand: 'rh' }, // D5
        { midi: 70, onset: 960, duration: 960, hand: 'rh' }, // B♭4
      ],
    },
    {
      stepNumber: 14,
      module: 'jazz_l1',
      section: 'A',
      subsection: 'A4: Scale (C Minor Blues)',
      activity: 'A4.1: C Minor Blues Scale Ascending (Out of Time)',
      direction: 'C–E♭–F–G♭–G–B♭–C: the minor pentatonic with the ♭5 added.',
      assessment: 'pitch_order',
      tag: 'jazz:l1_minor_blues_asc_oot | jazz',
      styleRef: 'l1a',
      successFeedback: 'G♭ — the blue note between F and G.',
      key: 'C minor',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      targetNotes: [
        { midi: 60, onset: 0, duration: 460 }, // C4
        { midi: 63, onset: 480, duration: 460 }, // E♭4
        { midi: 65, onset: 960, duration: 460 }, // F4
        { midi: 66, onset: 1440, duration: 460 }, // G♭4
        { midi: 67, onset: 1920, duration: 460 }, // G4
        { midi: 70, onset: 2400, duration: 460 }, // B♭4
        { midi: 72, onset: 2880, duration: 960 }, // C5
      ],
    },
    {
      stepNumber: 15,
      module: 'jazz_l1',
      section: 'A',
      subsection: 'A4: Scale (C Minor Blues)',
      activity: 'A4.2: C Minor Blues Scale Descending (Out of Time)',
      direction: 'Back down from the top C.',
      assessment: 'pitch_order',
      tag: 'jazz:l1_minor_blues_desc_oot | jazz',
      styleRef: 'l1a',
      successFeedback: 'Down through the ♭5.',
      key: 'C minor',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      targetNotes: [
        { midi: 72, onset: 0, duration: 460 }, // C5
        { midi: 70, onset: 480, duration: 460 }, // B♭4
        { midi: 67, onset: 960, duration: 460 }, // G4
        { midi: 66, onset: 1440, duration: 460 }, // G♭4
        { midi: 65, onset: 1920, duration: 460 }, // F4
        { midi: 63, onset: 2400, duration: 460 }, // E♭4
        { midi: 60, onset: 2880, duration: 960 }, // C4
      ],
    },
    {
      stepNumber: 16,
      module: 'jazz_l1',
      section: 'A',
      subsection: 'A4: Scale (C Minor Blues)',
      activity: 'A4.3: C Minor Blues — Up & Down in Swung Eighths (In Time)',
      direction: 'Up and down in swung eighths.',
      assessment: 'pitch_order_timing',
      tag: 'jazz:l1_minor_blues_updown_it | jazz',
      styleRef: 'l1a',
      successFeedback: 'The minor blues scale, swinging.',
      key: 'C minor',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      tempo: 90,
      swing: 64,
      swingUnit: '8n',
      targetNotes: [
        { midi: 60, onset: 0, duration: 220 }, // C4
        { midi: 63, onset: 240, duration: 220 }, // E♭4
        { midi: 65, onset: 480, duration: 220 }, // F4
        { midi: 66, onset: 720, duration: 220 }, // G♭4
        { midi: 67, onset: 960, duration: 220 }, // G4
        { midi: 70, onset: 1200, duration: 220 }, // B♭4
        { midi: 72, onset: 1440, duration: 220 }, // C5
        { midi: 70, onset: 1680, duration: 220 }, // B♭4
        { midi: 67, onset: 1920, duration: 220 }, // G4
        { midi: 66, onset: 2160, duration: 220 }, // G♭4
        { midi: 65, onset: 2400, duration: 220 }, // F4
        { midi: 63, onset: 2640, duration: 220 }, // E♭4
        { midi: 60, onset: 2880, duration: 480 }, // C4
      ],
    },
    {
      stepNumber: 17,
      module: 'jazz_l1',
      section: 'A',
      subsection: 'A5: C Minor Blues Lines',
      activity: 'A5.1: Minor Blues Line 1',
      direction:
        'Up C, E♭, F, G♭, then back down F, E♭ to C, held over the bar line.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l1_minor_line_1 | jazz',
      styleRef: 'l1a',
      successFeedback: 'Up to the ♭5 and home.',
      key: 'C minor',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      chordSymbols: ['Cmin6'],
      tempo: 100,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 72, onset: 0, duration: 220 }, // C5
        { midi: 75, onset: 240, duration: 220 }, // E♭5
        { midi: 77, onset: 480, duration: 220 }, // F5
        { midi: 78, onset: 720, duration: 220 }, // G♭5
        { midi: 77, onset: 960, duration: 460 }, // F5
        { midi: 75, onset: 1440, duration: 220 }, // E♭5
        { midi: 72, onset: 1680, duration: 700 }, // C5
      ],
    },
    {
      stepNumber: 18,
      module: 'jazz_l1',
      section: 'A',
      subsection: 'A5: C Minor Blues Lines',
      activity: 'A5.2: Minor Blues Line 2',
      direction: 'G♭ down to F and E♭, then F held, and E♭.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l1_minor_line_2 | jazz',
      styleRef: 'l1a',
      successFeedback: 'The ♭5 sliding into the 4.',
      key: 'C minor',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      chordSymbols: ['Cmin6'],
      tempo: 100,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 66, onset: 0, duration: 220 }, // G♭4
        { midi: 65, onset: 240, duration: 220 }, // F4
        { midi: 63, onset: 480, duration: 220 }, // E♭4
        { midi: 65, onset: 720, duration: 700 }, // F4
        { midi: 63, onset: 1440, duration: 460 }, // E♭4
        { midi: 60, onset: 1920, duration: 960 }, // C4
      ],
    },
    {
      stepNumber: 19,
      module: 'jazz_l1',
      section: 'A',
      subsection: 'A5: C Minor Blues Lines',
      activity: 'A5.3: Minor Blues Line 3',
      direction: 'B♭, G, G♭, F — then E♭ and C.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l1_minor_line_3 | jazz',
      styleRef: 'l1a',
      successFeedback: 'Down the minor blues scale.',
      key: 'C minor',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      chordSymbols: ['Cmin6'],
      tempo: 100,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 70, onset: 0, duration: 220 }, // B♭4
        { midi: 67, onset: 240, duration: 220 }, // G4
        { midi: 66, onset: 480, duration: 220 }, // G♭4
        { midi: 65, onset: 720, duration: 460 }, // F4
        { midi: 63, onset: 1200, duration: 220 }, // E♭4
        { midi: 60, onset: 1440, duration: 460 }, // C4
      ],
    },
    {
      stepNumber: 20,
      module: 'jazz_l1',
      section: 'A',
      subsection: 'A5: C Minor Blues Lines',
      activity: 'A5.4: Minor Blues Line 4',
      direction: 'F♯, G, B♭, then C, held.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l1_minor_line_4 | jazz',
      styleRef: 'l1a',
      successFeedback: 'A ♯4 pickup into the 5.',
      key: 'C minor',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      chordSymbols: ['Cmin7'],
      tempo: 100,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 66, onset: 0, duration: 220 }, // G♭4
        { midi: 67, onset: 240, duration: 220 }, // G4
        { midi: 70, onset: 480, duration: 220 }, // B♭4
        { midi: 72, onset: 720, duration: 700 }, // C5
      ],
    },
  ],
};

const jazzL1SectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    {
      stepNumber: 40,
      module: 'jazz_l1',
      section: 'B',
      subsection: 'B1: Shells (1-7 and 1-3-7)',
      activity: 'Major 7 1-3-7 Shell Voicing',
      assessment: 'pitch_order',
      tag: 'jazz:l1_shell_137_new',
      styleRef: 'l1a',
      successFeedback: '',
      chordSymbols: ['Cmaj7'],
      targetNotes: [
        { midi: 48, onset: 0, duration: 1920 }, // C3
        { midi: 52, onset: 0, duration: 1920 }, // E3
        { midi: 59, onset: 0, duration: 1920 }, // B3
      ],
    },
    {
      stepNumber: 21,
      module: 'jazz_l1',
      section: 'B',
      subsection: 'B1: Shells (1-7 and 1-3-7)',
      activity: 'B1.1: C major 7 LH Shell',
      direction: 'Just the 1, 3 and 7. The left hand’s first jazz voicing.',
      assessment: 'pitch_order_timing',
      tag: 'jazz:l1_shell_137 | jazz',
      styleRef: 'l1a',
      successFeedback: 'Two notes, and it already sounds like jazz.',
      chordSymbols: ['Cmaj7'],
      targetNotes: [
        { midi: 48, onset: 0, duration: 720, hand: 'lh' }, // C3
        { midi: 52, onset: 0, duration: 720, hand: 'lh' }, // E3
        { midi: 59, onset: 0, duration: 720, hand: 'lh' }, // B3
        { midi: 48, onset: 720, duration: 240, hand: 'lh' }, // C3
        { midi: 52, onset: 720, duration: 240, hand: 'lh' }, // E3
        { midi: 59, onset: 720, duration: 240, hand: 'lh' }, // B3
        { midi: 48, onset: 1920, duration: 720, hand: 'lh' }, // C3
        { midi: 52, onset: 1920, duration: 720, hand: 'lh' }, // E3
        { midi: 59, onset: 1920, duration: 720, hand: 'lh' }, // B3
        { midi: 48, onset: 2640, duration: 240, hand: 'lh' }, // C3
        { midi: 52, onset: 2640, duration: 240, hand: 'lh' }, // E3
        { midi: 59, onset: 2640, duration: 240, hand: 'lh' }, // B3
        { midi: 48, onset: 3840, duration: 960, hand: 'lh' }, // C3
        { midi: 52, onset: 3840, duration: 960, hand: 'lh' }, // E3
        { midi: 59, onset: 3840, duration: 960, hand: 'lh' }, // B3
      ],
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
    },
    {
      stepNumber: 22,
      module: 'jazz_l1',
      section: 'B',
      subsection: 'B1: Shells (1-7 and 1-3-7)',
      activity: 'B1.2: Cmaj6 1-3-6 Shell',
      direction: 'Root, 3rd, 7th on Cmaj6',
      assessment: 'pitch_order_timing',
      tag: 'jazz:l1_shell_136_types | jazz',
      styleRef: 'l1a',
      successFeedback: "Major 6 is a swingin' major chord",
      chordSymbols: ['C6'],
      targetNotes: [
        { midi: 48, onset: 0, duration: 720 }, // C3
        { midi: 52, onset: 0, duration: 720 }, // E3
        { midi: 57, onset: 0, duration: 720 }, // A3
        { midi: 48, onset: 720, duration: 240 }, // C3
        { midi: 52, onset: 720, duration: 240 }, // E3
        { midi: 57, onset: 720, duration: 240 }, // A3
        { midi: 48, onset: 1920, duration: 720 }, // C3
        { midi: 52, onset: 1920, duration: 720 }, // E3
        { midi: 57, onset: 1920, duration: 720 }, // A3
        { midi: 48, onset: 2640, duration: 240 }, // C3
        { midi: 52, onset: 2640, duration: 240 }, // E3
        { midi: 57, onset: 2640, duration: 240 }, // A3
        { midi: 48, onset: 3840, duration: 720 }, // C3
        { midi: 52, onset: 3840, duration: 720 }, // E3
        { midi: 57, onset: 3840, duration: 720 }, // A3
        { midi: 48, onset: 4560, duration: 240 }, // C3
        { midi: 52, onset: 4560, duration: 240 }, // E3
        { midi: 57, onset: 4560, duration: 240 }, // A3
        { midi: 48, onset: 5760, duration: 720 }, // C3
        { midi: 52, onset: 5760, duration: 720 }, // E3
        { midi: 57, onset: 5760, duration: 720 }, // A3
        { midi: 48, onset: 6480, duration: 240 }, // C3
        { midi: 52, onset: 6480, duration: 240 }, // E3
        { midi: 57, onset: 6480, duration: 240 }, // A3
      ],
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
    },
    {
      stepNumber: 23,
      module: 'jazz_l1',
      section: 'B',
      subsection: 'B1: Shells (1-7 and 1-3-7)',
      activity: 'B1.3: 1-3-7 Shells Diatonic Chords (Out of Time)',
      direction: 'D–F–C, G–B–F, C–E–B.',
      assessment: 'pitch_order',
      tag: 'jazz:l1_shell_137_diatonic | jazz',
      styleRef: 'l1a',
      successFeedback: 'Next we get to 2-5-1 progression!',
      chordSymbols: ['Dm7', 'Dm7', 'Cmaj7', 'Cmaj7'],
      targetNotes: [
        { midi: 50, onset: 0, duration: 1920 }, // D3
        { midi: 53, onset: 0, duration: 1920 }, // F3
        { midi: 60, onset: 0, duration: 1920 }, // C4
        { midi: 50, onset: 1920, duration: 1920 }, // D3
        { midi: 53, onset: 1920, duration: 1920 }, // F3
        { midi: 60, onset: 1920, duration: 1920 }, // C4
        { midi: 48, onset: 3840, duration: 1920 }, // C3
        { midi: 52, onset: 3840, duration: 1920 }, // E3
        { midi: 59, onset: 3840, duration: 1920 }, // B3
        { midi: 48, onset: 5760, duration: 1920 }, // C3
        { midi: 52, onset: 5760, duration: 1920 }, // E3
        { midi: 59, onset: 5760, duration: 1920 }, // B3
      ],
    },
    {
      stepNumber: 24,
      module: 'jazz_l1',
      section: 'B',
      subsection: 'B1: Shells (1-7 and 1-3-7)',
      activity: 'B1.4: 2-5-1 with Secret Formula',
      direction:
        'Whole notes over the drums. Your left hand has the roots, so the bass lays out.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l1_shell_137_251 | jazz',
      styleRef: 'l1a',
      successFeedback: 'Solo-piano shells, in time.',
      chordSymbols: ['Dm7', 'G7', 'Cmaj7', 'Cmaj6'],
      tempo: 100,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 50, onset: 0, duration: 1860, hand: 'lh' }, // D3
        { midi: 53, onset: 0, duration: 1860, hand: 'lh' }, // F3
        { midi: 60, onset: 0, duration: 1860, hand: 'lh' }, // C4
        { midi: 50, onset: 1920, duration: 1860, hand: 'lh' }, // D3
        { midi: 53, onset: 1920, duration: 1860, hand: 'lh' }, // F3
        { midi: 59, onset: 1920, duration: 1860, hand: 'lh' }, // B3
        { midi: 48, onset: 3840, duration: 1860, hand: 'lh' }, // C3
        { midi: 52, onset: 3840, duration: 1860, hand: 'lh' }, // E3
        { midi: 59, onset: 3840, duration: 1860, hand: 'lh' }, // B3
        { midi: 48, onset: 5760, duration: 1860, hand: 'lh' }, // C3
        { midi: 52, onset: 5760, duration: 1860, hand: 'lh' }, // E3
        { midi: 57, onset: 5760, duration: 1860, hand: 'lh' }, // A3
      ],
    },
    {
      stepNumber: 39,
      module: 'jazz_l1',
      section: 'B',
      subsection: 'B1: Shells (1-7 and 1-3-7)',
      activity: '1-3-7 Major 7 - Dominant 7 - Minor 7',
      assessment: 'pitch_order',
      tag: 'jazz:l1_shell_137',
      styleRef: 'l1a',
      successFeedback: '',
      chordSymbols: ['Cmaj7', 'Cdom7', 'Cmin7'],
      tempo: 100,
      swing: 64,
      swingUnit: '8n',
      targetNotes: [
        { midi: 48, onset: 0, duration: 1920 }, // C3
        { midi: 52, onset: 0, duration: 1920 }, // E3
        { midi: 59, onset: 0, duration: 1920 }, // B3
        { midi: 48, onset: 1920, duration: 1920 }, // C3
        { midi: 52, onset: 1920, duration: 1920 }, // E3
        { midi: 58, onset: 1920, duration: 1920 }, // B♭3
        { midi: 48, onset: 3840, duration: 1920 }, // C3
        { midi: 51, onset: 3840, duration: 1920 }, // E♭3
        { midi: 58, onset: 3840, duration: 1920 }, // B♭3
      ],
      direction: 'Play a Major, Minor, and Dominant 7th chord in C',
    },
    {
      stepNumber: 25,
      module: 'jazz_l1',
      section: 'B',
      subsection: 'B2: Rootless 7-3-5',
      activity: 'B2.1: 7-3-5 Chord Voicings (Out of Time)',
      direction:
        'No root — the bass has it. 7th on the bottom, then the 3rd and 5th',
      assessment: 'pitch_order',
      tag: 'jazz:l1_735_types | jazz',
      styleRef: 'l1a',
      successFeedback: 'Rootless: the sound of a jazz pianist in a band.',
      chordSymbols: ['Cmaj7', 'C7', 'Cm7'],
      targetNotes: [
        { midi: 59, onset: 0, duration: 1920 }, // B3
        { midi: 64, onset: 0, duration: 1920 }, // E4
        { midi: 67, onset: 0, duration: 1920 }, // G4
        { midi: 58, onset: 1920, duration: 1920 }, // B♭3
        { midi: 64, onset: 1920, duration: 1920 }, // E4
        { midi: 67, onset: 1920, duration: 1920 }, // G4
        { midi: 58, onset: 3840, duration: 1920 }, // B♭3
        { midi: 63, onset: 3840, duration: 1920 }, // E♭4
        { midi: 67, onset: 3840, duration: 1920 }, // G4
      ],
    },
    {
      stepNumber: 26,
      module: 'jazz_l1',
      section: 'B',
      subsection: 'B2: Rootless 7-3-5',
      activity: 'B2.2: 7-3-5 Voicings on a 2-5-1',
      direction: 'C–F–A, F–B–D, B–E–G.',
      assessment: 'pitch_order_timing',
      tag: 'jazz:l1_735_iivi | jazz',
      styleRef: 'l1a',
      successFeedback: '7-3-5 on every chord.',
      chordSymbols: ['Dm7', 'G7', 'Cmaj7'],
      targetNotes: [
        { midi: 60, onset: 0, duration: 1920 }, // C4
        { midi: 65, onset: 0, duration: 1920 }, // F4
        { midi: 69, onset: 0, duration: 1920 }, // A4
        { midi: 59, onset: 1920, duration: 1920 }, // B3
        { midi: 65, onset: 1920, duration: 1920 }, // F4
        { midi: 69, onset: 1920, duration: 1920 }, // A4
        { midi: 59, onset: 3840, duration: 1920 }, // B3
        { midi: 64, onset: 3840, duration: 1920 }, // E4
        { midi: 67, onset: 3840, duration: 1920 }, // G4
      ],
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
    },
    {
      stepNumber: 27,
      module: 'jazz_l1',
      section: 'B',
      subsection: 'B2: Rootless 7-3-5',
      activity: 'B2.3: Play-Along 2-5-1 with Charleston rhythm',
      direction:
        '7-3-5 on the 2min7, the the secret formula: drop the 7 down a half step ',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l1_735_iivi_play | jazz',
      styleRef: 'l1a',
      successFeedback: 'Rootless voicings with a bass player.',
      chordSymbols: ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'],
      tempo: 100,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 60, onset: 0, duration: 480 }, // C4
        { midi: 65, onset: 0, duration: 480 }, // F4
        { midi: 69, onset: 0, duration: 480 }, // A4
        { midi: 60, onset: 720, duration: 240 }, // C4
        { midi: 65, onset: 720, duration: 240 }, // F4
        { midi: 69, onset: 720, duration: 240 }, // A4
        { midi: 59, onset: 1920, duration: 480 }, // B3
        { midi: 65, onset: 1920, duration: 480 }, // F4
        { midi: 69, onset: 1920, duration: 480 }, // A4
        { midi: 59, onset: 2640, duration: 240 }, // B3
        { midi: 65, onset: 2640, duration: 240 }, // F4
        { midi: 69, onset: 2640, duration: 240 }, // A4
        { midi: 59, onset: 3840, duration: 480 }, // B3
        { midi: 64, onset: 3840, duration: 480 }, // E4
        { midi: 67, onset: 3840, duration: 480 }, // G4
        { midi: 59, onset: 4560, duration: 240 }, // B3
        { midi: 64, onset: 4560, duration: 240 }, // E4
        { midi: 67, onset: 4560, duration: 240 }, // G4
        { midi: 59, onset: 5760, duration: 480 }, // B3
        { midi: 64, onset: 5760, duration: 480 }, // E4
        { midi: 67, onset: 5760, duration: 480 }, // G4
        { midi: 59, onset: 6480, duration: 240 }, // B3
        { midi: 64, onset: 6480, duration: 240 }, // E4
        { midi: 67, onset: 6480, duration: 240 }, // G4
      ],
    },
    {
      stepNumber: 28,
      module: 'jazz_l1',
      section: 'B',
      subsection: 'B2: Play Along Blues',
      activity: 'B2.4: Play-Along — 1-3-7 voicings on C Blues',
      direction: 'Twelve bar blues with 1-3-7 Shells',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l1_137_blues_play | jazz',
      styleRef: 'l1a',
      successFeedback: 'The whole blues form!',
      chordSymbols: [
        'C7',
        'F7',
        'C7',
        'C7',
        'F7',
        'F7',
        'C7',
        'C7',
        'G7',
        'F7',
        'C7',
        'C7',
      ],
      tempo: 100,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 48, onset: 0, duration: 1440 }, // C3
        { midi: 52, onset: 0, duration: 1440 }, // E3
        { midi: 58, onset: 0, duration: 1440 }, // B♭3
        { midi: 53, onset: 1920, duration: 1440 }, // F3
        { midi: 53, onset: 1920, duration: 1440 }, // F3
        { midi: 57, onset: 1920, duration: 1440 }, // A3
        { midi: 57, onset: 1920, duration: 1440 }, // A3
        { midi: 63, onset: 1920, duration: 1440 }, // E♭4
        { midi: 63, onset: 1920, duration: 1440 }, // E♭4
        { midi: 48, onset: 3840, duration: 1440 }, // C3
        { midi: 52, onset: 3840, duration: 1440 }, // E3
        { midi: 58, onset: 3840, duration: 1440 }, // B♭3
        { midi: 48, onset: 5760, duration: 1440 }, // C3
        { midi: 52, onset: 5760, duration: 1440 }, // E3
        { midi: 58, onset: 5760, duration: 1440 }, // B♭3
        { midi: 53, onset: 7680, duration: 1440 }, // F3
        { midi: 57, onset: 7680, duration: 1440 }, // A3
        { midi: 63, onset: 7680, duration: 1440 }, // E♭4
        { midi: 53, onset: 9600, duration: 1440 }, // F3
        { midi: 57, onset: 9600, duration: 1440 }, // A3
        { midi: 63, onset: 9600, duration: 1440 }, // E♭4
        { midi: 48, onset: 11520, duration: 1440 }, // C3
        { midi: 52, onset: 11520, duration: 1440 }, // E3
        { midi: 58, onset: 11520, duration: 1440 }, // B♭3
        { midi: 48, onset: 13440, duration: 1440 }, // C3
        { midi: 52, onset: 13440, duration: 1440 }, // E3
        { midi: 58, onset: 13440, duration: 1440 }, // B♭3
        { midi: 55, onset: 15360, duration: 1440 }, // G3
        { midi: 59, onset: 15360, duration: 1440 }, // B3
        { midi: 65, onset: 15360, duration: 1440 }, // F4
        { midi: 53, onset: 17280, duration: 1440 }, // F3
        { midi: 57, onset: 17280, duration: 1440 }, // A3
        { midi: 63, onset: 17280, duration: 1440 }, // E♭4
        { midi: 48, onset: 19200, duration: 1440 }, // C3
        { midi: 52, onset: 19200, duration: 1440 }, // E3
        { midi: 58, onset: 19200, duration: 1440 }, // B♭3
        { midi: 48, onset: 21120, duration: 1440 }, // C3
        { midi: 52, onset: 21120, duration: 1440 }, // E3
        { midi: 58, onset: 21120, duration: 1440 }, // B♭3
      ],
    },
  ],
};

const jazzL1SectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 29,
      module: 'jazz_l1',
      section: 'C',
      subsection: 'C1: Just Roots',
      activity: 'C1.1: Just Roots — the C Blues',
      direction: 'One held root note per bar.',
      assessment: 'pitch_order_timing',
      tag: 'jazz:l1_bass_roots_blues | jazz',
      styleRef: 'l1a',
      successFeedback: 'The simplest bass line that works.',
      chordSymbols: [
        'C7',
        'F7',
        'C7',
        'C7',
        'F7',
        'F7',
        'C7',
        'C7',
        'G7',
        'F7',
        'C7',
        'C7',
      ],
      tempo: 90,
      swing: 64,
      swingUnit: '8n',
      targetNotes: [
        { midi: 36, onset: 0, duration: 1860 }, // C2
        { midi: 41, onset: 1920, duration: 1860 }, // F2
        { midi: 36, onset: 3840, duration: 1860 }, // C2
        { midi: 36, onset: 5760, duration: 1860 }, // C2
        { midi: 41, onset: 7680, duration: 1860 }, // F2
        { midi: 41, onset: 9600, duration: 1860 }, // F2
        { midi: 36, onset: 11520, duration: 1860 }, // C2
        { midi: 36, onset: 13440, duration: 1860 }, // C2
        { midi: 43, onset: 15360, duration: 1860 }, // G2
        { midi: 41, onset: 17280, duration: 1860 }, // F2
        { midi: 36, onset: 19200, duration: 1860 }, // C2
        { midi: 36, onset: 21120, duration: 1860 }, // C2
      ],
    },
    {
      stepNumber: 30,
      module: 'jazz_l1',
      section: 'C',
      subsection: 'C2: Root and 5',
      activity: 'C2.1: Root and 5, One Chord',
      direction: 'Half notes: C on 1, G on 3.',
      assessment: 'pitch_order_timing',
      tag: 'jazz:l1_bass_r5_one | jazz',
      styleRef: 'l1a',
      successFeedback: 'Root and 5 — the bass player’s home base.',
      chordSymbols: ['C7'],
      tempo: 90,
      swing: 64,
      swingUnit: '8n',
      targetNotes: [
        { midi: 36, onset: 0, duration: 940 }, // C2
        { midi: 43, onset: 960, duration: 940 }, // G2
        { midi: 36, onset: 1920, duration: 940 }, // C2
        { midi: 43, onset: 2880, duration: 940 }, // G2
      ],
    },
    {
      stepNumber: 31,
      module: 'jazz_l1',
      section: 'C',
      subsection: 'C2: Root and 5',
      activity: 'C2.2: Root and 5 — the C Blues',
      direction: 'Root on 1, the 5 on 3, through all twelve bars.',
      assessment: 'pitch_order_timing',
      tag: 'jazz:l1_bass_r5_blues | jazz',
      styleRef: 'l1a',
      successFeedback: 'Root and 5 through the blues.',
      chordSymbols: [
        'C7',
        'F7',
        'C7',
        'C7',
        'F7',
        'F7',
        'C7',
        'C7',
        'G7',
        'F7',
        'C7',
        'C7',
      ],
      tempo: 90,
      swing: 64,
      swingUnit: '8n',
      targetNotes: [
        { midi: 36, onset: 0, duration: 940 }, // C2
        { midi: 43, onset: 960, duration: 940 }, // G2
        { midi: 41, onset: 1920, duration: 940 }, // F2
        { midi: 48, onset: 2880, duration: 940 }, // C3
        { midi: 36, onset: 3840, duration: 940 }, // C2
        { midi: 43, onset: 4800, duration: 940 }, // G2
        { midi: 36, onset: 5760, duration: 940 }, // C2
        { midi: 43, onset: 6720, duration: 940 }, // G2
        { midi: 41, onset: 7680, duration: 940 }, // F2
        { midi: 48, onset: 8640, duration: 940 }, // C3
        { midi: 41, onset: 9600, duration: 940 }, // F2
        { midi: 48, onset: 10560, duration: 940 }, // C3
        { midi: 36, onset: 11520, duration: 940 }, // C2
        { midi: 43, onset: 12480, duration: 940 }, // G2
        { midi: 36, onset: 13440, duration: 940 }, // C2
        { midi: 43, onset: 14400, duration: 940 }, // G2
        { midi: 31, onset: 15360, duration: 940 }, // G1
        { midi: 38, onset: 16320, duration: 940 }, // D2
        { midi: 29, onset: 17280, duration: 940 }, // F1
        { midi: 36, onset: 18240, duration: 940 }, // C2
        { midi: 36, onset: 19200, duration: 940 }, // C2
        { midi: 43, onset: 20160, duration: 940 }, // G2
        { midi: 36, onset: 21120, duration: 940 }, // C2
        { midi: 43, onset: 22080, duration: 940 }, // G2
      ],
    },
    {
      stepNumber: 32,
      module: 'jazz_l1',
      section: 'C',
      subsection: 'C3: Two-Feel',
      activity: 'C3.1: Two-Feel — ii–V–I',
      direction: 'Roots and Fives with a half-note based rhythm',
      assessment: 'pitch_order_timing',
      tag: 'jazz:l1_bass_twofeel_iivi | jazz',
      styleRef: 'l1a',
      successFeedback: 'After this we start a "walking bass line"!',
      chordSymbols: ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'],
      tempo: 90,
      swing: 64,
      swingUnit: '8n',
      targetNotes: [
        { midi: 38, onset: 0, duration: 720 }, // D2
        { midi: 38, onset: 720, duration: 240 }, // D2
        { midi: 45, onset: 960, duration: 960 }, // A2
        { midi: 43, onset: 1920, duration: 940 }, // G2
        { midi: 43, onset: 2880, duration: 460 }, // G2
        { midi: 38, onset: 3360, duration: 460 }, // D2
        { midi: 36, onset: 3840, duration: 720 }, // C2
        { midi: 36, onset: 4560, duration: 220 }, // C2
        { midi: 43, onset: 4800, duration: 720 }, // G2
        { midi: 43, onset: 5520, duration: 240 }, // G2
        { midi: 36, onset: 5760, duration: 720 }, // C2
        { midi: 36, onset: 6480, duration: 240 }, // C2
        { midi: 43, onset: 6720, duration: 960 }, // G2
      ],
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
    },
    {
      stepNumber: 33,
      module: 'jazz_l1',
      section: 'C',
      subsection: 'C3: Two-Feel',
      activity: 'C3.2: Two-Feel — the C Blues',
      direction:
        'The two-feel through the blues: root, 5, and a half-step approach.',
      assessment: 'pitch_order_timing',
      tag: 'jazz:l1_bass_twofeel_blues | jazz',
      styleRef: 'l1a',
      successFeedback: 'A two-feel blues line.',
      chordSymbols: [
        'C7',
        'F7',
        'C7',
        'C7',
        'F7',
        'F7',
        'C7',
        'C7',
        'G7',
        'F7',
        'C7',
        'C7',
      ],
      tempo: 90,
      swing: 64,
      swingUnit: '8n',
      targetNotes: [
        { midi: 36, onset: 0, duration: 720 }, // C2
        { midi: 36, onset: 720, duration: 240 }, // C2
        { midi: 43, onset: 960, duration: 480 }, // G2
        { midi: 36, onset: 1440, duration: 480 }, // C2
        { midi: 41, onset: 1920, duration: 940 }, // F2
        { midi: 41, onset: 2880, duration: 460 }, // F2
        { midi: 43, onset: 3360, duration: 460 }, // G2
        { midi: 36, onset: 3840, duration: 940 }, // C2
        { midi: 43, onset: 4800, duration: 960 }, // G2
        { midi: 36, onset: 5760, duration: 720 }, // C2
        { midi: 36, onset: 6480, duration: 240 }, // C2
        { midi: 43, onset: 6720, duration: 460 }, // G2
        { midi: 42, onset: 7200, duration: 480 }, // G♭2
        { midi: 41, onset: 7680, duration: 720 }, // F2
        { midi: 41, onset: 8400, duration: 240 }, // F2
        { midi: 48, onset: 8640, duration: 960 }, // C3
        { midi: 41, onset: 9600, duration: 940 }, // F2
        { midi: 41, onset: 10560, duration: 460 }, // F2
        { midi: 43, onset: 11040, duration: 460 }, // G2
        { midi: 36, onset: 11520, duration: 720 }, // C2
        { midi: 36, onset: 12240, duration: 220 }, // C2
        { midi: 43, onset: 12480, duration: 960 }, // G2
        { midi: 36, onset: 13440, duration: 940 }, // C2
        { midi: 36, onset: 14400, duration: 460 }, // C2
        { midi: 40, onset: 14880, duration: 460 }, // E2
        { midi: 43, onset: 15360, duration: 960 }, // G2
        { midi: 38, onset: 16320, duration: 480 }, // D2
        { midi: 43, onset: 16800, duration: 480 }, // G2
        { midi: 41, onset: 17280, duration: 940 }, // F2
        { midi: 36, onset: 18240, duration: 460 }, // C2
        { midi: 41, onset: 18720, duration: 460 }, // F2
        { midi: 36, onset: 19200, duration: 940 }, // C2
        { midi: 43, onset: 20160, duration: 960 }, // G2
        { midi: 36, onset: 21120, duration: 720 }, // C2
        { midi: 36, onset: 21840, duration: 240 }, // C2
        { midi: 43, onset: 22080, duration: 960 }, // G2
      ],
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
    },
  ],
};

const jazzL1SectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 35,
      module: 'jazz_l1',
      section: 'D',
      subsection: 'D1: RH Shells, LH Bass',
      activity: 'D1.1: LH Roots + RH Chords 2-5-1 (Out of Time)',
      direction:
        'Left hand the roots. Right hand two notes: C–F, then B–F, then B–E. The C drops a half step to B.',
      assessment: 'pitch_order',
      tag: 'jazz:l1_perf_shells_oot | jazz',
      styleRef: 'l1a',
      successFeedback:
        'Over a bass note, two notes in the right hand are enough.',
      chordSymbols: ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'],
      targetNotes: [
        { midi: 38, onset: 0, duration: 1920, hand: 'lh' }, // D2
        { midi: 60, onset: 0, duration: 1920, hand: 'rh' }, // C4
        { midi: 65, onset: 0, duration: 1920, hand: 'rh' }, // F4
        { midi: 69, onset: 0, duration: 1920, hand: 'rh' }, // A4
        { midi: 43, onset: 1920, duration: 1920, hand: 'lh' }, // G2
        { midi: 59, onset: 1920, duration: 1920, hand: 'rh' }, // B3
        { midi: 65, onset: 1920, duration: 1920, hand: 'rh' }, // F4
        { midi: 69, onset: 1920, duration: 1920, hand: 'rh' }, // A4
        { midi: 36, onset: 3840, duration: 1920, hand: 'lh' }, // C2
        { midi: 59, onset: 3840, duration: 1920, hand: 'rh' }, // B3
        { midi: 64, onset: 3840, duration: 1920, hand: 'rh' }, // E4
        { midi: 67, onset: 3840, duration: 1920, hand: 'rh' }, // G4
      ],
    },
    {
      stepNumber: 41,
      module: 'jazz_l1',
      section: 'D',
      subsection: 'D1: RH Shells, LH Bass',
      activity: '2-5-1 Swinging Comping',
      assessment: 'pitch_order_timing',
      tag: 'jazz:l1_perf_shells_oot_new',
      styleRef: 'l1a',
      successFeedback: '',
      chordSymbols: ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'],
      targetNotes: [
        { midi: 38, onset: 0, duration: 1920, hand: 'lh' }, // D2
        { midi: 60, onset: 0, duration: 720, hand: 'rh' }, // C4
        { midi: 65, onset: 0, duration: 720, hand: 'rh' }, // F4
        { midi: 69, onset: 0, duration: 720, hand: 'rh' }, // A4
        { midi: 60, onset: 720, duration: 240, hand: 'rh' }, // C4
        { midi: 65, onset: 720, duration: 240, hand: 'rh' }, // F4
        { midi: 69, onset: 720, duration: 240, hand: 'rh' }, // A4
        { midi: 43, onset: 1920, duration: 1920, hand: 'lh' }, // G2
        { midi: 59, onset: 1920, duration: 720, hand: 'rh' }, // B3
        { midi: 65, onset: 1920, duration: 720, hand: 'rh' }, // F4
        { midi: 69, onset: 1920, duration: 720, hand: 'rh' }, // A4
        { midi: 59, onset: 2640, duration: 240, hand: 'rh' }, // B3
        { midi: 65, onset: 2640, duration: 240, hand: 'rh' }, // F4
        { midi: 69, onset: 2640, duration: 240, hand: 'rh' }, // A4
        { midi: 36, onset: 3840, duration: 1920, hand: 'lh' }, // C2
        { midi: 59, onset: 3840, duration: 720, hand: 'rh' }, // B3
        { midi: 64, onset: 3840, duration: 720, hand: 'rh' }, // E4
        { midi: 67, onset: 3840, duration: 720, hand: 'rh' }, // G4
        { midi: 59, onset: 4560, duration: 240, hand: 'rh' }, // B3
        { midi: 64, onset: 4560, duration: 240, hand: 'rh' }, // E4
        { midi: 67, onset: 4560, duration: 240, hand: 'rh' }, // G4
        { midi: 36, onset: 5760, duration: 1920, hand: 'lh' }, // C2
        { midi: 59, onset: 5760, duration: 720, hand: 'rh' }, // B3
        { midi: 64, onset: 5760, duration: 720, hand: 'rh' }, // E4
        { midi: 67, onset: 5760, duration: 720, hand: 'rh' }, // G4
        { midi: 59, onset: 6480, duration: 240, hand: 'rh' }, // B3
        { midi: 64, onset: 6480, duration: 240, hand: 'rh' }, // E4
        { midi: 67, onset: 6480, duration: 240, hand: 'rh' }, // G4
      ],
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords', 'bass'],
      },
    },
    {
      stepNumber: 36,
      module: 'jazz_l1',
      section: 'D',
      subsection: 'D1: RH Shells, LH Bass',
      activity: 'D1.2: Play-Along — LH Bass, RH Chord on the Blues',
      direction:
        'Left hand one root a bar; right hand B♭–E for C7, A–E♭ for F7, B–F for G7.',
      assessment: 'pitch_order_timing',
      tag: 'jazz:l1_perf_shells_blues | jazz',
      styleRef: 'l1a',
      successFeedback: 'Both hands through the blues.',
      chordSymbols: [
        'C7',
        'F7',
        'C7',
        'C7',
        'F7',
        'F7',
        'C7',
        'C7',
        'G7',
        'F7',
        'C7',
        'C7',
      ],
      tempo: 100,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords', 'bass'],
      },
      targetNotes: [
        { midi: 36, onset: 0, duration: 1860, hand: 'lh' }, // C2
        { midi: 58, onset: 0, duration: 1920, hand: 'rh' }, // B♭3
        { midi: 64, onset: 0, duration: 1920, hand: 'rh' }, // E4
        { midi: 67, onset: 0, duration: 1920, hand: 'rh' }, // G4
        { midi: 41, onset: 1920, duration: 1860, hand: 'lh' }, // F2
        { midi: 57, onset: 1920, duration: 1920, hand: 'rh' }, // A3
        { midi: 63, onset: 1920, duration: 1920, hand: 'rh' }, // E♭4
        { midi: 67, onset: 1920, duration: 1920, hand: 'rh' }, // G4
        { midi: 36, onset: 3840, duration: 1860, hand: 'lh' }, // C2
        { midi: 58, onset: 3840, duration: 1920, hand: 'rh' }, // B♭3
        { midi: 64, onset: 3840, duration: 1920, hand: 'rh' }, // E4
        { midi: 67, onset: 3840, duration: 1920, hand: 'rh' }, // G4
        { midi: 36, onset: 5760, duration: 1860, hand: 'lh' }, // C2
        { midi: 58, onset: 5760, duration: 1920, hand: 'rh' }, // B♭3
        { midi: 64, onset: 5760, duration: 1920, hand: 'rh' }, // E4
        { midi: 67, onset: 5760, duration: 1920, hand: 'rh' }, // G4
        { midi: 41, onset: 7680, duration: 1860, hand: 'lh' }, // F2
        { midi: 57, onset: 7680, duration: 1920, hand: 'rh' }, // A3
        { midi: 63, onset: 7680, duration: 1920, hand: 'rh' }, // E♭4
        { midi: 67, onset: 7680, duration: 1920, hand: 'rh' }, // G4
        { midi: 41, onset: 9600, duration: 1860, hand: 'lh' }, // F2
        { midi: 57, onset: 9600, duration: 1920, hand: 'rh' }, // A3
        { midi: 63, onset: 9600, duration: 1920, hand: 'rh' }, // E♭4
        { midi: 67, onset: 9600, duration: 1920, hand: 'rh' }, // G4
        { midi: 36, onset: 11520, duration: 1860, hand: 'lh' }, // C2
        { midi: 58, onset: 11520, duration: 1920, hand: 'rh' }, // B♭3
        { midi: 64, onset: 11520, duration: 1920, hand: 'rh' }, // E4
        { midi: 67, onset: 11520, duration: 1920, hand: 'rh' }, // G4
        { midi: 36, onset: 13440, duration: 1860, hand: 'lh' }, // C2
        { midi: 58, onset: 13440, duration: 1920, hand: 'rh' }, // B♭3
        { midi: 64, onset: 13440, duration: 1920, hand: 'rh' }, // E4
        { midi: 67, onset: 13440, duration: 1920, hand: 'rh' }, // G4
        { midi: 31, onset: 15360, duration: 1860, hand: 'lh' }, // G1
        { midi: 59, onset: 15360, duration: 1920, hand: 'rh' }, // B3
        { midi: 65, onset: 15360, duration: 1920, hand: 'rh' }, // F4
        { midi: 69, onset: 15360, duration: 1920, hand: 'rh' }, // A4
        { midi: 29, onset: 17280, duration: 1860, hand: 'lh' }, // F1
        { midi: 57, onset: 17280, duration: 1920, hand: 'rh' }, // A3
        { midi: 63, onset: 17280, duration: 1920, hand: 'rh' }, // E♭4
        { midi: 67, onset: 17280, duration: 1920, hand: 'rh' }, // G4
        { midi: 36, onset: 19200, duration: 1860, hand: 'lh' }, // C2
        { midi: 58, onset: 19200, duration: 1920, hand: 'rh' }, // B♭3
        { midi: 64, onset: 19200, duration: 1920, hand: 'rh' }, // E4
        { midi: 67, onset: 19200, duration: 1920, hand: 'rh' }, // G4
        { midi: 36, onset: 21120, duration: 1860, hand: 'lh' }, // C2
        { midi: 58, onset: 21120, duration: 1920, hand: 'rh' }, // B♭3
        { midi: 64, onset: 21120, duration: 1920, hand: 'rh' }, // E4
        { midi: 67, onset: 21120, duration: 1920, hand: 'rh' }, // G4
      ],
    },
    {
      stepNumber: 37,
      module: 'jazz_l1',
      section: 'D',
      subsection: 'D2: LH Voicings, RH Phrases',
      activity: 'D2.1: LH 7-3-5 + RH Blues Phrase 1',
      direction: 'Left hand holds B♭–E–G; right hand plays Phrase 1 over it.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l1_perf_phrase_1 | jazz',
      styleRef: 'l1a',
      successFeedback: 'A pianist’s blues: chord below, phrase above.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_chords_rh_melody',
        lh_role: 'chords',
        rh_role: 'melody',
        style_ref: 'l1a',
      },
      chordSymbols: ['C7'],
      tempo: 100,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords', 'melody'],
      },
      targetNotes: [
        { midi: 58, onset: 0, duration: 1860, hand: 'lh' }, // B♭3
        { midi: 64, onset: 0, duration: 1860, hand: 'lh' }, // E4
        { midi: 67, onset: 0, duration: 1860, hand: 'lh' }, // G4
        { midi: 75, onset: 0, duration: 220, hand: 'rh' }, // E♭5
        { midi: 76, onset: 240, duration: 220, hand: 'rh' }, // E5
        { midi: 75, onset: 480, duration: 220, hand: 'rh' }, // E♭5
        { midi: 76, onset: 720, duration: 220, hand: 'rh' }, // E5
        { midi: 72, onset: 960, duration: 940, hand: 'rh' }, // C5
      ],
    },
    {
      stepNumber: 38,
      module: 'jazz_l1',
      section: 'D',
      subsection: 'D2: LH Voicings, RH Phrases',
      activity: 'D2.2: LH 7-3-5 + RH Minor Blues Line 1',
      direction: 'Left hand B♭–E♭–G; right hand the first minor line.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l1_perf_minor_1 | jazz',
      styleRef: 'l1a',
      successFeedback: 'Minor blues, both hands.',
      key: 'C minor',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_chords_rh_melody',
        lh_role: 'chords',
        rh_role: 'melody',
        style_ref: 'l1a',
      },
      chordSymbols: ['Cm7', 'Cm7'],
      tempo: 100,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords', 'melody'],
      },
      targetNotes: [
        { midi: 58, onset: 0, duration: 1440, hand: 'lh' }, // B♭3
        { midi: 63, onset: 0, duration: 1440, hand: 'lh' }, // E♭4
        { midi: 67, onset: 0, duration: 1440, hand: 'lh' }, // G4
        { midi: 72, onset: 0, duration: 220, hand: 'rh' }, // C5
        { midi: 75, onset: 240, duration: 220, hand: 'rh' }, // E♭5
        { midi: 77, onset: 480, duration: 220, hand: 'rh' }, // F5
        { midi: 78, onset: 720, duration: 220, hand: 'rh' }, // G♭5
        { midi: 77, onset: 960, duration: 460, hand: 'rh' }, // F5
        { midi: 75, onset: 1440, duration: 220, hand: 'rh' }, // E♭5
        { midi: 58, onset: 1680, duration: 1860, hand: 'lh' }, // B♭3
        { midi: 63, onset: 1680, duration: 1860, hand: 'lh' }, // E♭4
        { midi: 67, onset: 1680, duration: 1860, hand: 'lh' }, // G4
        { midi: 72, onset: 1680, duration: 700, hand: 'rh' }, // C5
      ],
    },
    {
      stepNumber: 42,
      module: 'jazz_l1',
      section: 'D',
      subsection: 'D2: LH Voicings, RH Phrases',
      activity: '12 Bar Blues Performance -- LH Chords, RH Melody',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l1_perf_blues_new',
      styleRef: 'l1a',
      successFeedback: '',
      key: 'C major',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_chords_rh_melody',
        lh_role: 'chords',
        rh_role: 'melody',
        style_ref: 'l1a',
      },
      tempo: 100,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords', 'melody'],
      },
      targetNotes: [
        { midi: 48, onset: 0, duration: 1920, hand: 'lh' }, // C3
        { midi: 52, onset: 0, duration: 1920, hand: 'lh' }, // E3
        { midi: 58, onset: 0, duration: 1920, hand: 'lh' }, // B♭3
        { midi: 75, onset: 0, duration: 240, hand: 'rh' }, // E♭5
        { midi: 72, onset: 240, duration: 240, hand: 'rh' }, // C5
        { midi: 74, onset: 480, duration: 240, hand: 'rh' }, // D5
        { midi: 72, onset: 720, duration: 720, hand: 'rh' }, // C5
        { midi: 53, onset: 1920, duration: 1920, hand: 'lh' }, // F3
        { midi: 57, onset: 1920, duration: 1920, hand: 'lh' }, // A3
        { midi: 63, onset: 1920, duration: 1920, hand: 'lh' }, // E♭4
        { midi: 75, onset: 1920, duration: 240, hand: 'rh' }, // E♭5
        { midi: 72, onset: 2160, duration: 240, hand: 'rh' }, // C5
        { midi: 74, onset: 2400, duration: 240, hand: 'rh' }, // D5
        { midi: 72, onset: 2640, duration: 720, hand: 'rh' }, // C5
        { midi: 48, onset: 3840, duration: 1920, hand: 'lh' }, // C3
        { midi: 52, onset: 3840, duration: 1920, hand: 'lh' }, // E3
        { midi: 58, onset: 3840, duration: 1920, hand: 'lh' }, // B♭3
        { midi: 75, onset: 3840, duration: 240, hand: 'rh' }, // E♭5
        { midi: 72, onset: 4080, duration: 240, hand: 'rh' }, // C5
        { midi: 74, onset: 4320, duration: 240, hand: 'rh' }, // D5
        { midi: 72, onset: 4560, duration: 720, hand: 'rh' }, // C5
        { midi: 69, onset: 5280, duration: 480, hand: 'rh' }, // A4
        { midi: 48, onset: 5760, duration: 1920, hand: 'lh' }, // C3
        { midi: 52, onset: 5760, duration: 1920, hand: 'lh' }, // E3
        { midi: 58, onset: 5760, duration: 1920, hand: 'lh' }, // B♭3
        { midi: 72, onset: 5760, duration: 960, hand: 'rh' }, // C5
        { midi: 53, onset: 7680, duration: 1920, hand: 'lh' }, // F3
        { midi: 57, onset: 7680, duration: 1920, hand: 'lh' }, // A3
        { midi: 63, onset: 7680, duration: 1920, hand: 'lh' }, // E♭4
        { midi: 75, onset: 7680, duration: 240, hand: 'rh' }, // E♭5
        { midi: 72, onset: 7920, duration: 240, hand: 'rh' }, // C5
        { midi: 74, onset: 8160, duration: 240, hand: 'rh' }, // D5
        { midi: 72, onset: 8400, duration: 720, hand: 'rh' }, // C5
        { midi: 53, onset: 9600, duration: 1920, hand: 'lh' }, // F3
        { midi: 57, onset: 9600, duration: 1920, hand: 'lh' }, // A3
        { midi: 63, onset: 9600, duration: 1920, hand: 'lh' }, // E♭4
        { midi: 75, onset: 9600, duration: 240, hand: 'rh' }, // E♭5
        { midi: 72, onset: 9840, duration: 240, hand: 'rh' }, // C5
        { midi: 74, onset: 10080, duration: 240, hand: 'rh' }, // D5
        { midi: 72, onset: 10320, duration: 720, hand: 'rh' }, // C5
        { midi: 48, onset: 11520, duration: 1920, hand: 'lh' }, // C3
        { midi: 52, onset: 11520, duration: 1920, hand: 'lh' }, // E3
        { midi: 58, onset: 11520, duration: 1920, hand: 'lh' }, // B♭3
        { midi: 75, onset: 11520, duration: 240, hand: 'rh' }, // E♭5
        { midi: 72, onset: 11760, duration: 240, hand: 'rh' }, // C5
        { midi: 74, onset: 12000, duration: 240, hand: 'rh' }, // D5
        { midi: 72, onset: 12240, duration: 720, hand: 'rh' }, // C5
        { midi: 69, onset: 12960, duration: 480, hand: 'rh' }, // A4
        { midi: 48, onset: 13440, duration: 1920, hand: 'lh' }, // C3
        { midi: 52, onset: 13440, duration: 1920, hand: 'lh' }, // E3
        { midi: 58, onset: 13440, duration: 1920, hand: 'lh' }, // B♭3
        { midi: 72, onset: 13440, duration: 960, hand: 'rh' }, // C5
        { midi: 55, onset: 15360, duration: 1920, hand: 'lh' }, // G3
        { midi: 59, onset: 15360, duration: 1920, hand: 'lh' }, // B3
        { midi: 65, onset: 15360, duration: 1920, hand: 'lh' }, // F4
        { midi: 75, onset: 15360, duration: 240, hand: 'rh' }, // E♭5
        { midi: 72, onset: 15600, duration: 240, hand: 'rh' }, // C5
        { midi: 74, onset: 15840, duration: 240, hand: 'rh' }, // D5
        { midi: 72, onset: 16080, duration: 720, hand: 'rh' }, // C5
        { midi: 53, onset: 17280, duration: 1920, hand: 'lh' }, // F3
        { midi: 57, onset: 17280, duration: 1920, hand: 'lh' }, // A3
        { midi: 63, onset: 17280, duration: 1920, hand: 'lh' }, // E♭4
        { midi: 75, onset: 17280, duration: 240, hand: 'rh' }, // E♭5
        { midi: 72, onset: 17520, duration: 240, hand: 'rh' }, // C5
        { midi: 74, onset: 17760, duration: 240, hand: 'rh' }, // D5
        { midi: 72, onset: 18000, duration: 720, hand: 'rh' }, // C5
        { midi: 48, onset: 19200, duration: 1920, hand: 'lh' }, // C3
        { midi: 52, onset: 19200, duration: 1920, hand: 'lh' }, // E3
        { midi: 58, onset: 19200, duration: 1920, hand: 'lh' }, // B♭3
        { midi: 75, onset: 19200, duration: 240, hand: 'rh' }, // E♭5
        { midi: 72, onset: 19440, duration: 240, hand: 'rh' }, // C5
        { midi: 74, onset: 19680, duration: 240, hand: 'rh' }, // D5
        { midi: 72, onset: 19920, duration: 720, hand: 'rh' }, // C5
        { midi: 69, onset: 20640, duration: 480, hand: 'rh' }, // A4
        { midi: 48, onset: 21120, duration: 1920, hand: 'lh' }, // C3
        { midi: 52, onset: 21120, duration: 1920, hand: 'lh' }, // E3
        { midi: 58, onset: 21120, duration: 1920, hand: 'lh' }, // B♭3
        { midi: 72, onset: 21120, duration: 960, hand: 'rh' }, // C5
      ],
      direction: 'LH 1-3-7 Chords and RH Melody on a 12 Bar Blues',
      chordSymbols: [
        'C7',
        'F7',
        'C7',
        'C7',
        'F7',
        'F7',
        'C7',
        'C7',
        'G7',
        'F7',
        'C7',
        'C7',
      ],
    },
  ],
};

// ── L2: Color & Transfer ──

const jazzL2SectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    {
      stepNumber: 1,
      module: 'jazz_l2',
      section: 'A',
      subsection: 'A1: Scale (C Major)',
      activity: 'A1.1: C Major Ascending (Out of Time)',
      direction:
        'The white keys from C to C. Every line in this level uses only these notes.',
      assessment: 'pitch_order',
      tag: 'jazz:l2_major_asc_oot | jazz',
      styleRef: 'l2a',
      successFeedback: 'Seven notes — six chords to come.',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      targetNotes: [
        { midi: 60, onset: 0, duration: 460 }, // C4
        { midi: 62, onset: 480, duration: 460 }, // D4
        { midi: 64, onset: 960, duration: 460 }, // E4
        { midi: 65, onset: 1440, duration: 460 }, // F4
        { midi: 67, onset: 1920, duration: 460 }, // G4
        { midi: 69, onset: 2400, duration: 460 }, // A4
        { midi: 71, onset: 2880, duration: 460 }, // B4
        { midi: 72, onset: 3360, duration: 460 }, // C5
      ],
    },
    {
      stepNumber: 2,
      module: 'jazz_l2',
      section: 'A',
      subsection: 'A1: Scale (C Major)',
      activity: 'A1.2: C Major Descending (Out of Time)',
      direction: 'Back down from the top C.',
      assessment: 'pitch_order',
      tag: 'jazz:l2_major_desc_oot | jazz',
      styleRef: 'l2a',
      successFeedback: 'C major, down.',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      targetNotes: [
        { midi: 72, onset: 0, duration: 460 }, // C5
        { midi: 71, onset: 480, duration: 460 }, // B4
        { midi: 69, onset: 960, duration: 460 }, // A4
        { midi: 67, onset: 1440, duration: 460 }, // G4
        { midi: 65, onset: 1920, duration: 460 }, // F4
        { midi: 64, onset: 2400, duration: 460 }, // E4
        { midi: 62, onset: 2880, duration: 460 }, // D4
        { midi: 60, onset: 3360, duration: 460 }, // C4
      ],
    },
    {
      stepNumber: 3,
      module: 'jazz_l2',
      section: 'A',
      subsection: 'A1: Scale (C Major)',
      activity: 'A1.3: C Major — Up & Down in Swung Eighths (In Time)',
      direction: 'Up and down in swung eighths.',
      assessment: 'pitch_order_timing',
      tag: 'jazz:l2_major_updown_it | jazz',
      styleRef: 'l2a',
      successFeedback: 'The scale every line in this level comes from.',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      tempo: 100,
      swing: 64,
      swingUnit: '8n',
      targetNotes: [
        { midi: 60, onset: 0, duration: 220 }, // C4
        { midi: 62, onset: 240, duration: 220 }, // D4
        { midi: 64, onset: 480, duration: 220 }, // E4
        { midi: 65, onset: 720, duration: 220 }, // F4
        { midi: 67, onset: 960, duration: 220 }, // G4
        { midi: 69, onset: 1200, duration: 220 }, // A4
        { midi: 71, onset: 1440, duration: 220 }, // B4
        { midi: 72, onset: 1680, duration: 220 }, // C5
        { midi: 71, onset: 1920, duration: 220 }, // B4
        { midi: 69, onset: 2160, duration: 220 }, // A4
        { midi: 67, onset: 2400, duration: 220 }, // G4
        { midi: 65, onset: 2640, duration: 220 }, // F4
        { midi: 64, onset: 2880, duration: 220 }, // E4
        { midi: 62, onset: 3120, duration: 220 }, // D4
        { midi: 60, onset: 3360, duration: 220 }, // C4
      ],
    },
    {
      stepNumber: 4,
      module: 'jazz_l2',
      section: 'A',
      subsection: 'A2: Lines over Cmaj9',
      activity: 'A2.1: One-Bar Line 1',
      direction: 'C, D, E, C, then D, held — the 9.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l2_line1_cmaj9 | jazz',
      styleRef: 'l2a',
      successFeedback: 'Landing on the 9: the color of Cmaj9.',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Cmaj9'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 60, onset: 0, duration: 220 }, // C4
        { midi: 62, onset: 240, duration: 220 }, // D4
        { midi: 64, onset: 480, duration: 220 }, // E4
        { midi: 60, onset: 720, duration: 220 }, // C4
        { midi: 62, onset: 960, duration: 940 }, // D4
      ],
    },
    {
      stepNumber: 5,
      module: 'jazz_l2',
      section: 'A',
      subsection: 'A2: Lines over Cmaj9',
      activity: 'A2.2: One-Bar Line 7',
      direction: 'Down the scale from B: B, A, G, F — and E, held.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l2_line7_cmaj9 | jazz',
      styleRef: 'l2a',
      successFeedback: 'From the 7 down to the 3.',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Cmaj9'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 71, onset: 0, duration: 220 }, // B4
        { midi: 69, onset: 240, duration: 220 }, // A4
        { midi: 67, onset: 480, duration: 220 }, // G4
        { midi: 65, onset: 720, duration: 220 }, // F4
        { midi: 64, onset: 960, duration: 940 }, // E4
      ],
    },
    {
      stepNumber: 6,
      module: 'jazz_l2',
      section: 'A',
      subsection: 'A2: Lines over Cmaj9',
      activity: 'A2.3: One-Bar Line 10',
      direction: 'E, down to G, up to C and E, then D, held.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l2_line10_cmaj9 | jazz',
      styleRef: 'l2a',
      successFeedback: 'A leap and a landing on the 9.',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Cmaj9'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 76, onset: 0, duration: 220 }, // E5
        { midi: 67, onset: 240, duration: 220 }, // G4
        { midi: 72, onset: 480, duration: 220 }, // C5
        { midi: 76, onset: 720, duration: 220 }, // E5
        { midi: 74, onset: 960, duration: 940 }, // D5
      ],
    },
    {
      stepNumber: 7,
      module: 'jazz_l2',
      section: 'A',
      subsection: 'A2: Lines over Cmaj9',
      activity: 'A2.4: One-Bar Line 14',
      direction: 'High B, G, D, E — then C.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l2_line14_cmaj9 | jazz',
      styleRef: 'l2a',
      successFeedback: 'From the 7 home to the root.',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Cmaj9'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 83, onset: 0, duration: 220 }, // B5
        { midi: 79, onset: 240, duration: 220 }, // G5
        { midi: 74, onset: 480, duration: 220 }, // D5
        { midi: 76, onset: 720, duration: 220 }, // E5
        { midi: 72, onset: 960, duration: 940 }, // C5
      ],
    },
    {
      stepNumber: 8,
      module: 'jazz_l2',
      section: 'A',
      subsection: 'A3: One Scale, Six Colors',
      activity: 'A3.1: Line 2 over Dmin9',
      direction: 'D, E, F, G, then E, held — over D minor 9.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l2_line2_dmin9 | jazz',
      styleRef: 'l2a',
      successFeedback: 'The same white keys sound like D Dorian.',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Dm9'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 62, onset: 0, duration: 220 }, // D4
        { midi: 64, onset: 240, duration: 220 }, // E4
        { midi: 65, onset: 480, duration: 220 }, // F4
        { midi: 67, onset: 720, duration: 220 }, // G4
        { midi: 64, onset: 960, duration: 940 }, // E4
      ],
    },
    {
      stepNumber: 9,
      module: 'jazz_l2',
      section: 'A',
      subsection: 'A3: One Scale, Six Colors',
      activity: 'A3.2: Line 4 over Esus4♭9',
      direction: 'F, E, C, A, then D — over E sus4 ♭9.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l2_line4_esus4b9 | jazz',
      styleRef: 'l2a',
      successFeedback: 'F against E: the dark Phrygian color.',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Esus4b9'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 65, onset: 0, duration: 220 }, // F4
        { midi: 64, onset: 240, duration: 220 }, // E4
        { midi: 60, onset: 480, duration: 220 }, // C4
        { midi: 57, onset: 720, duration: 220 }, // A3
        { midi: 62, onset: 960, duration: 940 }, // D4
      ],
    },
    {
      stepNumber: 10,
      module: 'jazz_l2',
      section: 'A',
      subsection: 'A3: One Scale, Six Colors',
      activity: 'A3.3: Line 3 over Fmaj7♯11',
      direction: 'E, G, D, C, then B, held — over F major 7 ♯11.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l2_line3_fmaj7s11 | jazz',
      styleRef: 'l2a',
      successFeedback: 'B over F: the bright Lydian ♯11.',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Fmaj7#11'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 64, onset: 0, duration: 220 }, // E4
        { midi: 67, onset: 240, duration: 220 }, // G4
        { midi: 62, onset: 480, duration: 220 }, // D4
        { midi: 60, onset: 720, duration: 220 }, // C4
        { midi: 59, onset: 960, duration: 940 }, // B3
      ],
    },
    {
      stepNumber: 11,
      module: 'jazz_l2',
      section: 'A',
      subsection: 'A3: One Scale, Six Colors',
      activity: 'A3.4: Line 5 over G13sus4',
      direction: 'G, E, D, C, then D — over G13 sus4.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l2_line5_g13sus4 | jazz',
      styleRef: 'l2a',
      successFeedback: 'Mixolydian, floating on the sus4.',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['G13sus4'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 67, onset: 0, duration: 220 }, // G4
        { midi: 64, onset: 240, duration: 220 }, // E4
        { midi: 62, onset: 480, duration: 220 }, // D4
        { midi: 60, onset: 720, duration: 220 }, // C4
        { midi: 62, onset: 960, duration: 940 }, // D4
      ],
    },
    {
      stepNumber: 12,
      module: 'jazz_l2',
      section: 'A',
      subsection: 'A3: One Scale, Six Colors',
      activity: 'A3.5: Line 8 over Amin7♭6',
      direction: 'C, A, F, A, then G — over A minor 7 ♭6.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l2_line8_amin7b6 | jazz',
      styleRef: 'l2a',
      successFeedback: 'F over A minor: the Aeolian ♭6.',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Amin7b6'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 72, onset: 0, duration: 220 }, // C5
        { midi: 69, onset: 240, duration: 220 }, // A4
        { midi: 65, onset: 480, duration: 220 }, // F4
        { midi: 69, onset: 720, duration: 220 }, // A4
        { midi: 67, onset: 960, duration: 940 }, // G4
      ],
    },
    {
      stepNumber: 13,
      module: 'jazz_l2',
      section: 'A',
      subsection: 'A4: Two-Bar Lines',
      activity: 'A4.1: Two-Bar Line 1 over Cmaj9',
      direction: 'Up C–D–E–G–B–C, then A, F, and E, held.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l2_2bar1_cmaj9 | jazz',
      styleRef: 'l2a',
      successFeedback: 'A whole Cmaj9 in one line.',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Cmaj9', 'Cmaj9'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 60, onset: 0, duration: 220 }, // C4
        { midi: 62, onset: 240, duration: 220 }, // D4
        { midi: 64, onset: 480, duration: 220 }, // E4
        { midi: 67, onset: 720, duration: 220 }, // G4
        { midi: 71, onset: 960, duration: 220 }, // B4
        { midi: 72, onset: 1200, duration: 220 }, // C5
        { midi: 69, onset: 1440, duration: 220 }, // A4
        { midi: 65, onset: 1680, duration: 220 }, // F4
        { midi: 64, onset: 1920, duration: 1860 }, // E4
      ],
    },
    {
      stepNumber: 14,
      module: 'jazz_l2',
      section: 'A',
      subsection: 'A4: Two-Bar Lines',
      activity: 'A4.2: Two-Bar Line 7 over Dmin9',
      direction: 'A rest, then G–C–E–D–G–B–C, up to D, held.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l2_2bar7_dmin9 | jazz',
      styleRef: 'l2a',
      successFeedback: 'Climbing to D minor’s root.',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Dm9', 'Dm9'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 55, onset: 240, duration: 220 }, // G3
        { midi: 60, onset: 480, duration: 220 }, // C4
        { midi: 64, onset: 720, duration: 220 }, // E4
        { midi: 62, onset: 960, duration: 220 }, // D4
        { midi: 67, onset: 1200, duration: 220 }, // G4
        { midi: 71, onset: 1440, duration: 220 }, // B4
        { midi: 72, onset: 1680, duration: 220 }, // C5
        { midi: 74, onset: 1920, duration: 1860 }, // D5
      ],
    },
    {
      stepNumber: 15,
      module: 'jazz_l2',
      section: 'A',
      subsection: 'A4: Two-Bar Lines',
      activity: 'A4.3: Two-Bar Line 2 over G13sus4',
      direction: 'A rest, then down from C: B, G, A, F, E, D — and G, held.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l2_2bar2_g13sus4 | jazz',
      styleRef: 'l2a',
      successFeedback: 'Home to G under the sus4.',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['G13sus4', 'G13sus4'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 72, onset: 240, duration: 220 }, // C5
        { midi: 71, onset: 480, duration: 220 }, // B4
        { midi: 67, onset: 720, duration: 220 }, // G4
        { midi: 69, onset: 960, duration: 220 }, // A4
        { midi: 65, onset: 1200, duration: 220 }, // F4
        { midi: 64, onset: 1440, duration: 220 }, // E4
        { midi: 62, onset: 1680, duration: 220 }, // D4
        { midi: 67, onset: 1920, duration: 1860 }, // G4
      ],
    },
    {
      stepNumber: 16,
      module: 'jazz_l2',
      section: 'A',
      subsection: 'A4: Two-Bar Lines',
      activity: 'A4.4: Two-Bar Line 8 over Amin7♭6',
      direction: 'A, D, B, G, D, G, E, C — and A, held, low.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l2_2bar8_amin7b6 | jazz',
      styleRef: 'l2a',
      successFeedback: 'Down to A minor’s root.',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Amin7b6', 'Amin7b6'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 69, onset: 0, duration: 220 }, // A4
        { midi: 74, onset: 240, duration: 220 }, // D5
        { midi: 71, onset: 480, duration: 220 }, // B4
        { midi: 67, onset: 720, duration: 220 }, // G4
        { midi: 62, onset: 960, duration: 220 }, // D4
        { midi: 67, onset: 1200, duration: 220 }, // G4
        { midi: 64, onset: 1440, duration: 220 }, // E4
        { midi: 60, onset: 1680, duration: 220 }, // C4
        { midi: 57, onset: 1920, duration: 1860 }, // A3
      ],
    },
    {
      stepNumber: 17,
      module: 'jazz_l2',
      section: 'A',
      subsection: 'A5: Transfer to F and B♭',
      activity: 'A5.1: Two-Bar Line 1 over Fmaj9',
      direction: 'Line 1 a 4th higher: F–G–A–C–E–F, then D, B♭, and A.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l2_2bar1_f | jazz',
      styleRef: 'l2a',
      successFeedback: 'The same line in F.',
      key: 'F major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Fmaj9', 'Fmaj9'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 65, onset: 0, duration: 220 }, // F4
        { midi: 67, onset: 240, duration: 220 }, // G4
        { midi: 69, onset: 480, duration: 220 }, // A4
        { midi: 72, onset: 720, duration: 220 }, // C5
        { midi: 76, onset: 960, duration: 220 }, // E5
        { midi: 77, onset: 1200, duration: 220 }, // F5
        { midi: 74, onset: 1440, duration: 220 }, // D5
        { midi: 70, onset: 1680, duration: 220 }, // B♭4
        { midi: 69, onset: 1920, duration: 1860 }, // A4
      ],
    },
    {
      stepNumber: 18,
      module: 'jazz_l2',
      section: 'A',
      subsection: 'A5: Transfer to F and B♭',
      activity: 'A5.2: Two-Bar Line 1 over B♭maj9',
      direction: 'Line 1 a whole step lower: B♭–C–D–F–A–B♭, then G, E♭, and D.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l2_2bar1_bb | jazz',
      styleRef: 'l2a',
      successFeedback: 'Hear it in the new key before you play it.',
      key: 'Bb major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Bbmaj9', 'Bbmaj9'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 58, onset: 0, duration: 220 }, // B♭3
        { midi: 60, onset: 240, duration: 220 }, // C4
        { midi: 62, onset: 480, duration: 220 }, // D4
        { midi: 65, onset: 720, duration: 220 }, // F4
        { midi: 69, onset: 960, duration: 220 }, // A4
        { midi: 70, onset: 1200, duration: 220 }, // B♭4
        { midi: 67, onset: 1440, duration: 220 }, // G4
        { midi: 63, onset: 1680, duration: 220 }, // E♭4
        { midi: 62, onset: 1920, duration: 1860 }, // D4
      ],
    },
  ],
};

const jazzL2SectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    {
      stepNumber: 19,
      module: 'jazz_l2',
      section: 'B',
      subsection: 'B1: Add the 9 (7-9-3-5)',
      activity: 'B1.1: 7-9-3-5 on Every Chord Type (Out of Time)',
      direction:
        'Rootless, with the 9: B–D–E–G, B♭–D–E–G, B♭–D–E♭–G, B♭–D–E♭–G♭.',
      assessment: 'pitch_order',
      tag: 'jazz:l2_7935_types | jazz',
      styleRef: 'l2a',
      successFeedback: 'The 9 fills in the 7-3-5.',
      chordSymbols: ['Cmaj9', 'C9', 'Cm9', 'Cm9b5'],
      targetNotes: [
        { midi: 59, onset: 0, duration: 1800 }, // B3
        { midi: 62, onset: 0, duration: 1800 }, // D4
        { midi: 64, onset: 0, duration: 1800 }, // E4
        { midi: 67, onset: 0, duration: 1800 }, // G4
        { midi: 58, onset: 1920, duration: 1800 }, // B♭3
        { midi: 62, onset: 1920, duration: 1800 }, // D4
        { midi: 64, onset: 1920, duration: 1800 }, // E4
        { midi: 67, onset: 1920, duration: 1800 }, // G4
        { midi: 58, onset: 3840, duration: 1800 }, // B♭3
        { midi: 62, onset: 3840, duration: 1800 }, // D4
        { midi: 63, onset: 3840, duration: 1800 }, // E♭4
        { midi: 67, onset: 3840, duration: 1800 }, // G4
        { midi: 58, onset: 5760, duration: 1800 }, // B♭3
        { midi: 62, onset: 5760, duration: 1800 }, // D4
        { midi: 63, onset: 5760, duration: 1800 }, // E♭4
        { midi: 66, onset: 5760, duration: 1800 }, // G♭4
      ],
    },
    {
      stepNumber: 20,
      module: 'jazz_l2',
      section: 'B',
      subsection: 'B2: The Area Codes',
      activity: 'B2.1: 7-3-5 Area Code — ii–V–I (Out of Time)',
      direction:
        'D minor 7 as C–F–A. The C drops a half step to B — G7’s 3rd — then E and G.',
      assessment: 'pitch_order',
      tag: 'jazz:l2_area_735 | jazz',
      styleRef: 'l2a',
      successFeedback:
        'Drop the 7 of the ii a half step: it becomes the 3 of the V.',
      chordSymbols: ['Dm7', 'G9', 'Cmaj7'],
      targetNotes: [
        { midi: 60, onset: 0, duration: 1800 }, // C4
        { midi: 65, onset: 0, duration: 1800 }, // F4
        { midi: 69, onset: 0, duration: 1800 }, // A4
        { midi: 59, onset: 1920, duration: 1800 }, // B3
        { midi: 65, onset: 1920, duration: 1800 }, // F4
        { midi: 69, onset: 1920, duration: 1800 }, // A4
        { midi: 59, onset: 3840, duration: 1800 }, // B3
        { midi: 64, onset: 3840, duration: 1800 }, // E4
        { midi: 67, onset: 3840, duration: 1800 }, // G4
      ],
    },
    {
      stepNumber: 21,
      module: 'jazz_l2',
      section: 'B',
      subsection: 'B2: The Area Codes',
      activity: 'B2.2: 3-7-9 Area Code — ii–V–I (Out of Time)',
      direction: 'F–C–E, then F–B–E, then E–B–D. Again the C drops to B.',
      assessment: 'pitch_order',
      tag: 'jazz:l2_area_379 | jazz',
      styleRef: 'l2a',
      successFeedback: 'Same move, different area code.',
      chordSymbols: ['Dm9', 'G13', 'Cmaj9'],
      targetNotes: [
        { midi: 53, onset: 0, duration: 1800 }, // F3
        { midi: 60, onset: 0, duration: 1800 }, // C4
        { midi: 64, onset: 0, duration: 1800 }, // E4
        { midi: 53, onset: 1920, duration: 1800 }, // F3
        { midi: 59, onset: 1920, duration: 1800 }, // B3
        { midi: 64, onset: 1920, duration: 1800 }, // E4
        { midi: 52, onset: 3840, duration: 1800 }, // E3
        { midi: 59, onset: 3840, duration: 1800 }, // B3
        { midi: 62, onset: 3840, duration: 1800 }, // D4
      ],
    },
    {
      stepNumber: 22,
      module: 'jazz_l2',
      section: 'B',
      subsection: 'B2: The Area Codes',
      activity: 'B2.3: Play-Along — 3-7-9 Area Code',
      direction: 'Whole notes over bass and drums.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l2_area_379_play | jazz',
      styleRef: 'l2a',
      successFeedback: 'Three notes, smooth as glass.',
      chordSymbols: ['Dm9', 'G13', 'Cmaj9', 'Cmaj9'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 53, onset: 0, duration: 1860 }, // F3
        { midi: 60, onset: 0, duration: 1860 }, // C4
        { midi: 64, onset: 0, duration: 1860 }, // E4
        { midi: 53, onset: 1920, duration: 1860 }, // F3
        { midi: 59, onset: 1920, duration: 1860 }, // B3
        { midi: 64, onset: 1920, duration: 1860 }, // E4
        { midi: 52, onset: 3840, duration: 1860 }, // E3
        { midi: 59, onset: 3840, duration: 1860 }, // B3
        { midi: 62, onset: 3840, duration: 1860 }, // D4
        { midi: 52, onset: 5760, duration: 1860 }, // E3
        { midi: 59, onset: 5760, duration: 1860 }, // B3
        { midi: 62, onset: 5760, duration: 1860 }, // D4
      ],
    },
    {
      stepNumber: 23,
      module: 'jazz_l2',
      section: 'B',
      subsection: 'B2: The Area Codes',
      activity: 'B2.4: 7-3-5 Area Code, Minor (Out of Time)',
      direction:
        'D minor 7♭5 as C–F–A♭, G7♭9♭13 as B–F–A♭, C minor 6/9 as A–E♭–G.',
      assessment: 'pitch_order',
      tag: 'jazz:l2_area_735_minor | jazz',
      styleRef: 'l2a',
      successFeedback: 'The minor ii–V–i: same drop, darker colors.',
      key: 'C minor',
      chordSymbols: ['Dm7b5', 'G7b9b13', 'Cm6/9'],
      targetNotes: [
        { midi: 60, onset: 0, duration: 1800 }, // C4
        { midi: 65, onset: 0, duration: 1800 }, // F4
        { midi: 68, onset: 0, duration: 1800 }, // A♭4
        { midi: 59, onset: 1920, duration: 1800 }, // B3
        { midi: 65, onset: 1920, duration: 1800 }, // F4
        { midi: 68, onset: 1920, duration: 1800 }, // A♭4
        { midi: 57, onset: 3840, duration: 1800 }, // A3
        { midi: 63, onset: 3840, duration: 1800 }, // E♭4
        { midi: 67, onset: 3840, duration: 1800 }, // G4
      ],
    },
    {
      stepNumber: 24,
      module: 'jazz_l2',
      section: 'B',
      subsection: 'B2: The Area Codes',
      activity: 'B2.5: 3-7-9 Area Code, Minor (Out of Time)',
      direction: 'F–C–E, F–B–E♭, E♭–A–D.',
      assessment: 'pitch_order',
      tag: 'jazz:l2_area_379_minor | jazz',
      styleRef: 'l2a',
      successFeedback: 'Minor, with the 9.',
      key: 'C minor',
      chordSymbols: ['Dm9b5', 'G7b9b13', 'Cm6/9'],
      targetNotes: [
        { midi: 53, onset: 0, duration: 1800 }, // F3
        { midi: 60, onset: 0, duration: 1800 }, // C4
        { midi: 64, onset: 0, duration: 1800 }, // E4
        { midi: 53, onset: 1920, duration: 1800 }, // F3
        { midi: 59, onset: 1920, duration: 1800 }, // B3
        { midi: 63, onset: 1920, duration: 1800 }, // E♭4
        { midi: 51, onset: 3840, duration: 1800 }, // E♭3
        { midi: 57, onset: 3840, duration: 1800 }, // A3
        { midi: 62, onset: 3840, duration: 1800 }, // D4
      ],
    },
    {
      stepNumber: 25,
      module: 'jazz_l2',
      section: 'B',
      subsection: 'B3: Rootless B',
      activity: 'B3.1: Rootless B — ii–V–I (Out of Time)',
      direction:
        'Four notes: C–E–F–A, B–E–F–A, B–D–E–G. The 7 still drops to the 3.',
      assessment: 'pitch_order',
      tag: 'jazz:l2_rootless_b | jazz',
      styleRef: 'l2a',
      successFeedback:
        'Rootless B: 7-9-3-5 on the ii and I, 3-13-7-9 on the V.',
      chordSymbols: ['Dm9', 'G13', 'Cmaj9'],
      targetNotes: [
        { midi: 60, onset: 0, duration: 1800 }, // C4
        { midi: 64, onset: 0, duration: 1800 }, // E4
        { midi: 65, onset: 0, duration: 1800 }, // F4
        { midi: 69, onset: 0, duration: 1800 }, // A4
        { midi: 59, onset: 1920, duration: 1800 }, // B3
        { midi: 64, onset: 1920, duration: 1800 }, // E4
        { midi: 65, onset: 1920, duration: 1800 }, // F4
        { midi: 69, onset: 1920, duration: 1800 }, // A4
        { midi: 59, onset: 3840, duration: 1800 }, // B3
        { midi: 62, onset: 3840, duration: 1800 }, // D4
        { midi: 64, onset: 3840, duration: 1800 }, // E4
        { midi: 67, onset: 3840, duration: 1800 }, // G4
      ],
    },
    {
      stepNumber: 26,
      module: 'jazz_l2',
      section: 'B',
      subsection: 'B3: Rootless B',
      activity: 'B3.2: Rootless B, Minor (Out of Time)',
      direction: 'C–E–F–A♭, B–E♭–F–A♭, A–D–E♭–G.',
      assessment: 'pitch_order',
      tag: 'jazz:l2_rootless_b_minor | jazz',
      styleRef: 'l2a',
      successFeedback: 'Rootless B in minor.',
      key: 'C minor',
      chordSymbols: ['Dm9b5', 'G7b9b13', 'Cm6/9'],
      targetNotes: [
        { midi: 60, onset: 0, duration: 1800 }, // C4
        { midi: 64, onset: 0, duration: 1800 }, // E4
        { midi: 65, onset: 0, duration: 1800 }, // F4
        { midi: 68, onset: 0, duration: 1800 }, // A♭4
        { midi: 59, onset: 1920, duration: 1800 }, // B3
        { midi: 63, onset: 1920, duration: 1800 }, // E♭4
        { midi: 65, onset: 1920, duration: 1800 }, // F4
        { midi: 68, onset: 1920, duration: 1800 }, // A♭4
        { midi: 57, onset: 3840, duration: 1800 }, // A3
        { midi: 62, onset: 3840, duration: 1800 }, // D4
        { midi: 63, onset: 3840, duration: 1800 }, // E♭4
        { midi: 67, onset: 3840, duration: 1800 }, // G4
      ],
    },
    {
      stepNumber: 27,
      module: 'jazz_l2',
      section: 'B',
      subsection: 'B3: Rootless B',
      activity: 'B3.3: Play-Along — Rootless B, ii–V–I',
      direction: 'Whole notes over bass and drums.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l2_rootless_b_play | jazz',
      styleRef: 'l2a',
      successFeedback: 'Four-note rootless voicings, in time.',
      chordSymbols: ['Dm9', 'G13', 'Cmaj9', 'Cmaj9'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 60, onset: 0, duration: 1860 }, // C4
        { midi: 64, onset: 0, duration: 1860 }, // E4
        { midi: 65, onset: 0, duration: 1860 }, // F4
        { midi: 69, onset: 0, duration: 1860 }, // A4
        { midi: 59, onset: 1920, duration: 1860 }, // B3
        { midi: 64, onset: 1920, duration: 1860 }, // E4
        { midi: 65, onset: 1920, duration: 1860 }, // F4
        { midi: 69, onset: 1920, duration: 1860 }, // A4
        { midi: 59, onset: 3840, duration: 1860 }, // B3
        { midi: 62, onset: 3840, duration: 1860 }, // D4
        { midi: 64, onset: 3840, duration: 1860 }, // E4
        { midi: 67, onset: 3840, duration: 1860 }, // G4
        { midi: 59, onset: 5760, duration: 1860 }, // B3
        { midi: 62, onset: 5760, duration: 1860 }, // D4
        { midi: 64, onset: 5760, duration: 1860 }, // E4
        { midi: 67, onset: 5760, duration: 1860 }, // G4
      ],
    },
    {
      stepNumber: 28,
      module: 'jazz_l2',
      section: 'B',
      subsection: 'B4: 7-3-5 and 3-7-9 on the Blues',
      activity: 'B4.1: 7-3-5 and 3-7-9 on the C Blues (Out of Time)',
      direction:
        'C7 as 3-7-9 (E–B♭–D), F7 as 7-3-5 (E♭–A–C): the E falls to E♭, the B♭ to A, the D to C. G7 is F–B–D.',
      assessment: 'pitch_order',
      tag: 'jazz:l2_735_379_blues | jazz',
      styleRef: 'l2a',
      successFeedback:
        'Two shapes, and your hand barely moves through the blues.',
      chordSymbols: [
        'C9',
        'F7',
        'C9',
        'C9',
        'F7',
        'F7',
        'C9',
        'C9',
        'G7',
        'F7',
        'C9',
        'C9',
      ],
      targetNotes: [
        { midi: 52, onset: 0, duration: 1800 }, // E3
        { midi: 58, onset: 0, duration: 1800 }, // B♭3
        { midi: 62, onset: 0, duration: 1800 }, // D4
        { midi: 51, onset: 1920, duration: 1800 }, // E♭3
        { midi: 57, onset: 1920, duration: 1800 }, // A3
        { midi: 60, onset: 1920, duration: 1800 }, // C4
        { midi: 52, onset: 3840, duration: 1800 }, // E3
        { midi: 58, onset: 3840, duration: 1800 }, // B♭3
        { midi: 62, onset: 3840, duration: 1800 }, // D4
        { midi: 52, onset: 5760, duration: 1800 }, // E3
        { midi: 58, onset: 5760, duration: 1800 }, // B♭3
        { midi: 62, onset: 5760, duration: 1800 }, // D4
        { midi: 51, onset: 7680, duration: 1800 }, // E♭3
        { midi: 57, onset: 7680, duration: 1800 }, // A3
        { midi: 60, onset: 7680, duration: 1800 }, // C4
        { midi: 51, onset: 9600, duration: 1800 }, // E♭3
        { midi: 57, onset: 9600, duration: 1800 }, // A3
        { midi: 60, onset: 9600, duration: 1800 }, // C4
        { midi: 52, onset: 11520, duration: 1800 }, // E3
        { midi: 58, onset: 11520, duration: 1800 }, // B♭3
        { midi: 62, onset: 11520, duration: 1800 }, // D4
        { midi: 52, onset: 13440, duration: 1800 }, // E3
        { midi: 58, onset: 13440, duration: 1800 }, // B♭3
        { midi: 62, onset: 13440, duration: 1800 }, // D4
        { midi: 53, onset: 15360, duration: 1800 }, // F3
        { midi: 59, onset: 15360, duration: 1800 }, // B3
        { midi: 62, onset: 15360, duration: 1800 }, // D4
        { midi: 51, onset: 17280, duration: 1800 }, // E♭3
        { midi: 57, onset: 17280, duration: 1800 }, // A3
        { midi: 60, onset: 17280, duration: 1800 }, // C4
        { midi: 52, onset: 19200, duration: 1800 }, // E3
        { midi: 58, onset: 19200, duration: 1800 }, // B♭3
        { midi: 62, onset: 19200, duration: 1800 }, // D4
        { midi: 52, onset: 21120, duration: 1800 }, // E3
        { midi: 58, onset: 21120, duration: 1800 }, // B♭3
        { midi: 62, onset: 21120, duration: 1800 }, // D4
      ],
    },
    {
      stepNumber: 29,
      module: 'jazz_l2',
      section: 'B',
      subsection: 'B4: 7-3-5 and 3-7-9 on the Blues',
      activity: 'B4.2: Play-Along — 7-3-5 and 3-7-9 on the C Blues',
      direction:
        'Whole notes through the blues, each voicing to the nearest notes of the next.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l2_735_379_blues_play | jazz',
      styleRef: 'l2a',
      successFeedback: 'The Level 1 blues, now voice-led.',
      chordSymbols: [
        'C9',
        'F7',
        'C9',
        'C9',
        'F7',
        'F7',
        'C9',
        'C9',
        'G7',
        'F7',
        'C9',
        'C9',
      ],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 52, onset: 0, duration: 1860 }, // E3
        { midi: 58, onset: 0, duration: 1860 }, // B♭3
        { midi: 62, onset: 0, duration: 1860 }, // D4
        { midi: 51, onset: 1920, duration: 1860 }, // E♭3
        { midi: 57, onset: 1920, duration: 1860 }, // A3
        { midi: 60, onset: 1920, duration: 1860 }, // C4
        { midi: 52, onset: 3840, duration: 1860 }, // E3
        { midi: 58, onset: 3840, duration: 1860 }, // B♭3
        { midi: 62, onset: 3840, duration: 1860 }, // D4
        { midi: 52, onset: 5760, duration: 1860 }, // E3
        { midi: 58, onset: 5760, duration: 1860 }, // B♭3
        { midi: 62, onset: 5760, duration: 1860 }, // D4
        { midi: 51, onset: 7680, duration: 1860 }, // E♭3
        { midi: 57, onset: 7680, duration: 1860 }, // A3
        { midi: 60, onset: 7680, duration: 1860 }, // C4
        { midi: 51, onset: 9600, duration: 1860 }, // E♭3
        { midi: 57, onset: 9600, duration: 1860 }, // A3
        { midi: 60, onset: 9600, duration: 1860 }, // C4
        { midi: 52, onset: 11520, duration: 1860 }, // E3
        { midi: 58, onset: 11520, duration: 1860 }, // B♭3
        { midi: 62, onset: 11520, duration: 1860 }, // D4
        { midi: 52, onset: 13440, duration: 1860 }, // E3
        { midi: 58, onset: 13440, duration: 1860 }, // B♭3
        { midi: 62, onset: 13440, duration: 1860 }, // D4
        { midi: 53, onset: 15360, duration: 1860 }, // F3
        { midi: 59, onset: 15360, duration: 1860 }, // B3
        { midi: 62, onset: 15360, duration: 1860 }, // D4
        { midi: 51, onset: 17280, duration: 1860 }, // E♭3
        { midi: 57, onset: 17280, duration: 1860 }, // A3
        { midi: 60, onset: 17280, duration: 1860 }, // C4
        { midi: 52, onset: 19200, duration: 1860 }, // E3
        { midi: 58, onset: 19200, duration: 1860 }, // B♭3
        { midi: 62, onset: 19200, duration: 1860 }, // D4
        { midi: 52, onset: 21120, duration: 1860 }, // E3
        { midi: 58, onset: 21120, duration: 1860 }, // B♭3
        { midi: 62, onset: 21120, duration: 1860 }, // D4
      ],
    },
    {
      stepNumber: 30,
      module: 'jazz_l2',
      section: 'B',
      subsection: 'B5: C Jam Blues Shells',
      activity: 'B5.1: C Jam Blues Shells (Out of Time)',
      direction:
        'C7 as 3-7-9 (E–B♭–D), F7 and G7 as 7-3-5 (E♭–A–C, F–B–D). Each moves to the nearest notes of the next.',
      assessment: 'pitch_order',
      tag: 'jazz:l2_cjam_shells | jazz',
      styleRef: 'l2a',
      successFeedback: 'Three shapes for a whole blues.',
      chordSymbols: ['C9', 'F7', 'G7'],
      targetNotes: [
        { midi: 52, onset: 0, duration: 1800 }, // E3
        { midi: 58, onset: 0, duration: 1800 }, // B♭3
        { midi: 62, onset: 0, duration: 1800 }, // D4
        { midi: 51, onset: 1920, duration: 1800 }, // E♭3
        { midi: 57, onset: 1920, duration: 1800 }, // A3
        { midi: 60, onset: 1920, duration: 1800 }, // C4
        { midi: 53, onset: 3840, duration: 1800 }, // F3
        { midi: 59, onset: 3840, duration: 1800 }, // B3
        { midi: 62, onset: 3840, duration: 1800 }, // D4
      ],
    },
    {
      stepNumber: 31,
      module: 'jazz_l2',
      section: 'B',
      subsection: 'B5: C Jam Blues Shells',
      activity: 'B5.2: Play-Along — C Jam Blues Comping',
      direction:
        'The shells in the rhythm as written: short stabs, then the long one on the “and”.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l2_cjam_play | jazz',
      styleRef: 'l2a',
      successFeedback: 'Comping the C Jam Blues, as written.',
      chordSymbols: [
        'C9',
        'C9',
        'C9',
        'C9',
        'F7',
        'F7',
        'C9',
        'C9',
        'G7',
        'G7',
        'C9',
        'C9',
      ],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 52, onset: 0, duration: 220 }, // E3
        { midi: 58, onset: 0, duration: 220 }, // B♭3
        { midi: 62, onset: 0, duration: 220 }, // D4
        { midi: 52, onset: 240, duration: 220 }, // E3
        { midi: 58, onset: 240, duration: 220 }, // B♭3
        { midi: 62, onset: 240, duration: 220 }, // D4
        { midi: 52, onset: 1920, duration: 220 }, // E3
        { midi: 58, onset: 1920, duration: 220 }, // B♭3
        { midi: 62, onset: 1920, duration: 220 }, // D4
        { midi: 52, onset: 2160, duration: 220 }, // E3
        { midi: 58, onset: 2160, duration: 220 }, // B♭3
        { midi: 62, onset: 2160, duration: 220 }, // D4
        { midi: 52, onset: 2880, duration: 220 }, // E3
        { midi: 58, onset: 2880, duration: 220 }, // B♭3
        { midi: 62, onset: 2880, duration: 220 }, // D4
        { midi: 52, onset: 3120, duration: 220 }, // E3
        { midi: 58, onset: 3120, duration: 220 }, // B♭3
        { midi: 62, onset: 3120, duration: 220 }, // D4
        { midi: 52, onset: 3840, duration: 700 }, // E3
        { midi: 58, onset: 3840, duration: 700 }, // B♭3
        { midi: 62, onset: 3840, duration: 700 }, // D4
        { midi: 52, onset: 4560, duration: 220 }, // E3
        { midi: 58, onset: 4560, duration: 220 }, // B♭3
        { midi: 62, onset: 4560, duration: 220 }, // D4
        { midi: 51, onset: 7680, duration: 220 }, // E♭3
        { midi: 57, onset: 7680, duration: 220 }, // A3
        { midi: 60, onset: 7680, duration: 220 }, // C4
        { midi: 51, onset: 7920, duration: 220 }, // E♭3
        { midi: 57, onset: 7920, duration: 220 }, // A3
        { midi: 60, onset: 7920, duration: 220 }, // C4
        { midi: 51, onset: 9600, duration: 220 }, // E♭3
        { midi: 57, onset: 9600, duration: 220 }, // A3
        { midi: 60, onset: 9600, duration: 220 }, // C4
        { midi: 51, onset: 9840, duration: 220 }, // E♭3
        { midi: 57, onset: 9840, duration: 220 }, // A3
        { midi: 60, onset: 9840, duration: 220 }, // C4
        { midi: 51, onset: 10560, duration: 220 }, // E♭3
        { midi: 57, onset: 10560, duration: 220 }, // A3
        { midi: 60, onset: 10560, duration: 220 }, // C4
        { midi: 51, onset: 10800, duration: 220 }, // E♭3
        { midi: 57, onset: 10800, duration: 220 }, // A3
        { midi: 60, onset: 10800, duration: 220 }, // C4
        { midi: 52, onset: 11520, duration: 700 }, // E3
        { midi: 58, onset: 11520, duration: 700 }, // B♭3
        { midi: 62, onset: 11520, duration: 700 }, // D4
        { midi: 52, onset: 12240, duration: 220 }, // E3
        { midi: 58, onset: 12240, duration: 220 }, // B♭3
        { midi: 62, onset: 12240, duration: 220 }, // D4
        { midi: 53, onset: 15360, duration: 220 }, // F3
        { midi: 59, onset: 15360, duration: 220 }, // B3
        { midi: 62, onset: 15360, duration: 220 }, // D4
        { midi: 53, onset: 15600, duration: 220 }, // F3
        { midi: 59, onset: 15600, duration: 220 }, // B3
        { midi: 62, onset: 15600, duration: 220 }, // D4
        { midi: 53, onset: 17280, duration: 220 }, // F3
        { midi: 59, onset: 17280, duration: 220 }, // B3
        { midi: 62, onset: 17280, duration: 220 }, // D4
        { midi: 53, onset: 17520, duration: 220 }, // F3
        { midi: 59, onset: 17520, duration: 220 }, // B3
        { midi: 62, onset: 17520, duration: 220 }, // D4
        { midi: 53, onset: 18240, duration: 220 }, // F3
        { midi: 59, onset: 18240, duration: 220 }, // B3
        { midi: 62, onset: 18240, duration: 220 }, // D4
        { midi: 53, onset: 18480, duration: 220 }, // F3
        { midi: 59, onset: 18480, duration: 220 }, // B3
        { midi: 62, onset: 18480, duration: 220 }, // D4
        { midi: 52, onset: 19200, duration: 700 }, // E3
        { midi: 58, onset: 19200, duration: 700 }, // B♭3
        { midi: 62, onset: 19200, duration: 700 }, // D4
        { midi: 52, onset: 19920, duration: 220 }, // E3
        { midi: 58, onset: 19920, duration: 220 }, // B♭3
        { midi: 62, onset: 19920, duration: 220 }, // D4
      ],
    },
  ],
};

const jazzL2SectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 32,
      module: 'jazz_l2',
      section: 'C',
      subsection: 'C1: The Blues Line',
      activity: 'C1.1: The Blues Line, One Chord',
      direction: 'Up the chord and back: 1–3–5–6, then ♭7–6–5–3.',
      assessment: 'pitch_order_timing',
      tag: 'jazz:l2_bass_line_one | jazz',
      styleRef: 'l2a',
      successFeedback: 'Up the chord and back — the blues bass line.',
      chordSymbols: ['C7', 'C7'],
      tempo: 100,
      swing: 64,
      swingUnit: '8n',
      targetNotes: [
        { midi: 48, onset: 0, duration: 460 }, // C3
        { midi: 52, onset: 480, duration: 460 }, // E3
        { midi: 55, onset: 960, duration: 460 }, // G3
        { midi: 57, onset: 1440, duration: 460 }, // A3
        { midi: 58, onset: 1920, duration: 460 }, // B♭3
        { midi: 57, onset: 2400, duration: 460 }, // A3
        { midi: 55, onset: 2880, duration: 460 }, // G3
        { midi: 52, onset: 3360, duration: 460 }, // E3
      ],
    },
    {
      stepNumber: 33,
      module: 'jazz_l2',
      section: 'C',
      subsection: 'C1: The Blues Line',
      activity: 'C1.2: The Blues Line — C Jam Blues',
      direction:
        'The same shape on every chord of the form; the last 3 leads back to the top.',
      assessment: 'pitch_order_timing',
      tag: 'jazz:l2_bass_line_form | jazz',
      styleRef: 'l2a',
      successFeedback: 'One shape, twelve bars.',
      chordSymbols: [
        'C7',
        'C7',
        'C7',
        'C7',
        'F7',
        'F7',
        'C7',
        'C7',
        'G7',
        'G7',
        'C7',
        'C7',
      ],
      tempo: 100,
      swing: 64,
      swingUnit: '8n',
      targetNotes: [
        { midi: 48, onset: 0, duration: 460 }, // C3
        { midi: 52, onset: 480, duration: 460 }, // E3
        { midi: 55, onset: 960, duration: 460 }, // G3
        { midi: 57, onset: 1440, duration: 460 }, // A3
        { midi: 58, onset: 1920, duration: 460 }, // B♭3
        { midi: 57, onset: 2400, duration: 460 }, // A3
        { midi: 55, onset: 2880, duration: 460 }, // G3
        { midi: 52, onset: 3360, duration: 460 }, // E3
        { midi: 48, onset: 3840, duration: 460 }, // C3
        { midi: 52, onset: 4320, duration: 460 }, // E3
        { midi: 55, onset: 4800, duration: 460 }, // G3
        { midi: 57, onset: 5280, duration: 460 }, // A3
        { midi: 58, onset: 5760, duration: 460 }, // B♭3
        { midi: 57, onset: 6240, duration: 460 }, // A3
        { midi: 55, onset: 6720, duration: 460 }, // G3
        { midi: 52, onset: 7200, duration: 460 }, // E3
        { midi: 41, onset: 7680, duration: 460 }, // F2
        { midi: 45, onset: 8160, duration: 460 }, // A2
        { midi: 48, onset: 8640, duration: 460 }, // C3
        { midi: 50, onset: 9120, duration: 460 }, // D3
        { midi: 51, onset: 9600, duration: 460 }, // E♭3
        { midi: 50, onset: 10080, duration: 460 }, // D3
        { midi: 48, onset: 10560, duration: 460 }, // C3
        { midi: 45, onset: 11040, duration: 460 }, // A2
        { midi: 48, onset: 11520, duration: 460 }, // C3
        { midi: 52, onset: 12000, duration: 460 }, // E3
        { midi: 55, onset: 12480, duration: 460 }, // G3
        { midi: 57, onset: 12960, duration: 460 }, // A3
        { midi: 58, onset: 13440, duration: 460 }, // B♭3
        { midi: 57, onset: 13920, duration: 460 }, // A3
        { midi: 55, onset: 14400, duration: 460 }, // G3
        { midi: 52, onset: 14880, duration: 460 }, // E3
        { midi: 43, onset: 15360, duration: 460 }, // G2
        { midi: 47, onset: 15840, duration: 460 }, // B2
        { midi: 50, onset: 16320, duration: 460 }, // D3
        { midi: 52, onset: 16800, duration: 460 }, // E3
        { midi: 53, onset: 17280, duration: 460 }, // F3
        { midi: 52, onset: 17760, duration: 460 }, // E3
        { midi: 50, onset: 18240, duration: 460 }, // D3
        { midi: 47, onset: 18720, duration: 460 }, // B2
        { midi: 48, onset: 19200, duration: 460 }, // C3
        { midi: 52, onset: 19680, duration: 460 }, // E3
        { midi: 55, onset: 20160, duration: 460 }, // G3
        { midi: 57, onset: 20640, duration: 460 }, // A3
        { midi: 58, onset: 21120, duration: 460 }, // B♭3
        { midi: 57, onset: 21600, duration: 460 }, // A3
        { midi: 55, onset: 22080, duration: 460 }, // G3
        { midi: 52, onset: 22560, duration: 460 }, // E3
      ],
    },
    {
      stepNumber: 34,
      module: 'jazz_l2',
      section: 'C',
      subsection: 'C1: The Blues Line',
      activity: 'C1.3: Bass Play-Along — C Jam Blues',
      direction: 'The blues line under the band.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l2_bass_line_play | jazz',
      styleRef: 'l2a',
      successFeedback: 'The C Jam Blues, from the bottom up.',
      chordSymbols: [
        'C9',
        'C9',
        'C9',
        'C9',
        'F7',
        'F7',
        'C9',
        'C9',
        'G7',
        'G7',
        'C9',
        'C9',
      ],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 48, onset: 0, duration: 460 }, // C3
        { midi: 52, onset: 480, duration: 460 }, // E3
        { midi: 55, onset: 960, duration: 460 }, // G3
        { midi: 57, onset: 1440, duration: 460 }, // A3
        { midi: 58, onset: 1920, duration: 460 }, // B♭3
        { midi: 57, onset: 2400, duration: 460 }, // A3
        { midi: 55, onset: 2880, duration: 460 }, // G3
        { midi: 52, onset: 3360, duration: 460 }, // E3
        { midi: 48, onset: 3840, duration: 460 }, // C3
        { midi: 52, onset: 4320, duration: 460 }, // E3
        { midi: 55, onset: 4800, duration: 460 }, // G3
        { midi: 57, onset: 5280, duration: 460 }, // A3
        { midi: 58, onset: 5760, duration: 460 }, // B♭3
        { midi: 57, onset: 6240, duration: 460 }, // A3
        { midi: 55, onset: 6720, duration: 460 }, // G3
        { midi: 52, onset: 7200, duration: 460 }, // E3
        { midi: 41, onset: 7680, duration: 460 }, // F2
        { midi: 45, onset: 8160, duration: 460 }, // A2
        { midi: 48, onset: 8640, duration: 460 }, // C3
        { midi: 50, onset: 9120, duration: 460 }, // D3
        { midi: 51, onset: 9600, duration: 460 }, // E♭3
        { midi: 50, onset: 10080, duration: 460 }, // D3
        { midi: 48, onset: 10560, duration: 460 }, // C3
        { midi: 45, onset: 11040, duration: 460 }, // A2
        { midi: 48, onset: 11520, duration: 460 }, // C3
        { midi: 52, onset: 12000, duration: 460 }, // E3
        { midi: 55, onset: 12480, duration: 460 }, // G3
        { midi: 57, onset: 12960, duration: 460 }, // A3
        { midi: 58, onset: 13440, duration: 460 }, // B♭3
        { midi: 57, onset: 13920, duration: 460 }, // A3
        { midi: 55, onset: 14400, duration: 460 }, // G3
        { midi: 52, onset: 14880, duration: 460 }, // E3
        { midi: 43, onset: 15360, duration: 460 }, // G2
        { midi: 47, onset: 15840, duration: 460 }, // B2
        { midi: 50, onset: 16320, duration: 460 }, // D3
        { midi: 52, onset: 16800, duration: 460 }, // E3
        { midi: 53, onset: 17280, duration: 460 }, // F3
        { midi: 52, onset: 17760, duration: 460 }, // E3
        { midi: 50, onset: 18240, duration: 460 }, // D3
        { midi: 47, onset: 18720, duration: 460 }, // B2
        { midi: 48, onset: 19200, duration: 460 }, // C3
        { midi: 52, onset: 19680, duration: 460 }, // E3
        { midi: 55, onset: 20160, duration: 460 }, // G3
        { midi: 57, onset: 20640, duration: 460 }, // A3
        { midi: 58, onset: 21120, duration: 460 }, // B♭3
        { midi: 57, onset: 21600, duration: 460 }, // A3
        { midi: 55, onset: 22080, duration: 460 }, // G3
        { midi: 52, onset: 22560, duration: 460 }, // E3
      ],
    },
    {
      stepNumber: 35,
      module: 'jazz_l2',
      section: 'C',
      subsection: 'C2: Roots with Approaches',
      activity: 'C2.1: Roots with Approaches — ii–V–I',
      direction:
        'Three roots, then a half step above or below the next one: D D D A♭, G G G D♭, C C C B, C C C E♭.',
      assessment: 'pitch_order_timing',
      tag: 'jazz:l2_bass_approach | jazz',
      styleRef: 'l2a',
      successFeedback: 'The approach note points at the next chord.',
      chordSymbols: ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'],
      tempo: 100,
      swing: 64,
      swingUnit: '8n',
      targetNotes: [
        { midi: 38, onset: 0, duration: 460 }, // D2
        { midi: 38, onset: 480, duration: 460 }, // D2
        { midi: 38, onset: 960, duration: 460 }, // D2
        { midi: 44, onset: 1440, duration: 460 }, // A♭2
        { midi: 43, onset: 1920, duration: 460 }, // G2
        { midi: 43, onset: 2400, duration: 460 }, // G2
        { midi: 43, onset: 2880, duration: 460 }, // G2
        { midi: 37, onset: 3360, duration: 460 }, // D♭2
        { midi: 36, onset: 3840, duration: 460 }, // C2
        { midi: 36, onset: 4320, duration: 460 }, // C2
        { midi: 36, onset: 4800, duration: 460 }, // C2
        { midi: 35, onset: 5280, duration: 460 }, // B1
        { midi: 36, onset: 5760, duration: 460 }, // C2
        { midi: 36, onset: 6240, duration: 460 }, // C2
        { midi: 36, onset: 6720, duration: 460 }, // C2
        { midi: 39, onset: 7200, duration: 460 }, // E♭2
      ],
    },
    {
      stepNumber: 36,
      module: 'jazz_l2',
      section: 'C',
      subsection: 'C2: Roots with Approaches',
      activity: 'C2.2: Bass Play-Along — Roots with Approaches',
      direction: 'Roots and approaches under the band.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l2_bass_approach_play | jazz',
      styleRef: 'l2a',
      successFeedback: 'Every approach lands.',
      chordSymbols: ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 38, onset: 0, duration: 460 }, // D2
        { midi: 38, onset: 480, duration: 460 }, // D2
        { midi: 38, onset: 960, duration: 460 }, // D2
        { midi: 44, onset: 1440, duration: 460 }, // A♭2
        { midi: 43, onset: 1920, duration: 460 }, // G2
        { midi: 43, onset: 2400, duration: 460 }, // G2
        { midi: 43, onset: 2880, duration: 460 }, // G2
        { midi: 37, onset: 3360, duration: 460 }, // D♭2
        { midi: 36, onset: 3840, duration: 460 }, // C2
        { midi: 36, onset: 4320, duration: 460 }, // C2
        { midi: 36, onset: 4800, duration: 460 }, // C2
        { midi: 35, onset: 5280, duration: 460 }, // B1
        { midi: 36, onset: 5760, duration: 460 }, // C2
        { midi: 36, onset: 6240, duration: 460 }, // C2
        { midi: 36, onset: 6720, duration: 460 }, // C2
        { midi: 39, onset: 7200, duration: 460 }, // E♭2
      ],
    },
  ],
};

const jazzL2SectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 37,
      module: 'jazz_l2',
      section: 'D',
      subsection: 'D1: RH Voicings, LH Bass',
      activity: 'D1.1: LH Roots + RH 3-7-9 Area Code (Play-Along)',
      direction: 'Left hand D, G, C; right hand F–C–E, F–B–E, E–B–D.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l2_perf_379_roots | jazz',
      styleRef: 'l2a',
      successFeedback: 'Roots below, the area code above.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l2a',
      },
      chordSymbols: ['Dm9', 'G13', 'Cmaj9', 'Cmaj9'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 38, onset: 0, duration: 1860, hand: 'lh' }, // D2
        { midi: 43, onset: 1920, duration: 1860, hand: 'lh' }, // G2
        { midi: 36, onset: 3840, duration: 1860, hand: 'lh' }, // C2
        { midi: 36, onset: 5760, duration: 1860, hand: 'lh' }, // C2
        { midi: 53, onset: 0, duration: 1860, hand: 'rh' }, // F3
        { midi: 60, onset: 0, duration: 1860, hand: 'rh' }, // C4
        { midi: 64, onset: 0, duration: 1860, hand: 'rh' }, // E4
        { midi: 53, onset: 1920, duration: 1860, hand: 'rh' }, // F3
        { midi: 59, onset: 1920, duration: 1860, hand: 'rh' }, // B3
        { midi: 64, onset: 1920, duration: 1860, hand: 'rh' }, // E4
        { midi: 52, onset: 3840, duration: 1860, hand: 'rh' }, // E3
        { midi: 59, onset: 3840, duration: 1860, hand: 'rh' }, // B3
        { midi: 62, onset: 3840, duration: 1860, hand: 'rh' }, // D4
        { midi: 52, onset: 5760, duration: 1860, hand: 'rh' }, // E3
        { midi: 59, onset: 5760, duration: 1860, hand: 'rh' }, // B3
        { midi: 62, onset: 5760, duration: 1860, hand: 'rh' }, // D4
      ],
    },
    {
      stepNumber: 38,
      module: 'jazz_l2',
      section: 'D',
      subsection: 'D1: RH Voicings, LH Bass',
      activity: 'D1.2: LH Blues Line + RH C Jam Shells (Play-Along)',
      direction:
        'Left hand the blues line an octave down; right hand the C Jam Blues shells in their rhythm.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l2_perf_cjam | jazz',
      styleRef: 'l2a',
      successFeedback: 'Bass and comping at once — the whole rhythm section.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l2a',
      },
      chordSymbols: [
        'C9',
        'C9',
        'C9',
        'C9',
        'F7',
        'F7',
        'C9',
        'C9',
        'G7',
        'G7',
        'C9',
        'C9',
      ],
      tempo: 100,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 36, onset: 0, duration: 460, hand: 'lh' }, // C2
        { midi: 40, onset: 480, duration: 460, hand: 'lh' }, // E2
        { midi: 43, onset: 960, duration: 460, hand: 'lh' }, // G2
        { midi: 45, onset: 1440, duration: 460, hand: 'lh' }, // A2
        { midi: 46, onset: 1920, duration: 460, hand: 'lh' }, // B♭2
        { midi: 45, onset: 2400, duration: 460, hand: 'lh' }, // A2
        { midi: 43, onset: 2880, duration: 460, hand: 'lh' }, // G2
        { midi: 40, onset: 3360, duration: 460, hand: 'lh' }, // E2
        { midi: 36, onset: 3840, duration: 460, hand: 'lh' }, // C2
        { midi: 40, onset: 4320, duration: 460, hand: 'lh' }, // E2
        { midi: 43, onset: 4800, duration: 460, hand: 'lh' }, // G2
        { midi: 45, onset: 5280, duration: 460, hand: 'lh' }, // A2
        { midi: 46, onset: 5760, duration: 460, hand: 'lh' }, // B♭2
        { midi: 45, onset: 6240, duration: 460, hand: 'lh' }, // A2
        { midi: 43, onset: 6720, duration: 460, hand: 'lh' }, // G2
        { midi: 40, onset: 7200, duration: 460, hand: 'lh' }, // E2
        { midi: 29, onset: 7680, duration: 460, hand: 'lh' }, // F1
        { midi: 33, onset: 8160, duration: 460, hand: 'lh' }, // A1
        { midi: 36, onset: 8640, duration: 460, hand: 'lh' }, // C2
        { midi: 38, onset: 9120, duration: 460, hand: 'lh' }, // D2
        { midi: 39, onset: 9600, duration: 460, hand: 'lh' }, // E♭2
        { midi: 38, onset: 10080, duration: 460, hand: 'lh' }, // D2
        { midi: 36, onset: 10560, duration: 460, hand: 'lh' }, // C2
        { midi: 33, onset: 11040, duration: 460, hand: 'lh' }, // A1
        { midi: 36, onset: 11520, duration: 460, hand: 'lh' }, // C2
        { midi: 40, onset: 12000, duration: 460, hand: 'lh' }, // E2
        { midi: 43, onset: 12480, duration: 460, hand: 'lh' }, // G2
        { midi: 45, onset: 12960, duration: 460, hand: 'lh' }, // A2
        { midi: 46, onset: 13440, duration: 460, hand: 'lh' }, // B♭2
        { midi: 45, onset: 13920, duration: 460, hand: 'lh' }, // A2
        { midi: 43, onset: 14400, duration: 460, hand: 'lh' }, // G2
        { midi: 40, onset: 14880, duration: 460, hand: 'lh' }, // E2
        { midi: 31, onset: 15360, duration: 460, hand: 'lh' }, // G1
        { midi: 35, onset: 15840, duration: 460, hand: 'lh' }, // B1
        { midi: 38, onset: 16320, duration: 460, hand: 'lh' }, // D2
        { midi: 40, onset: 16800, duration: 460, hand: 'lh' }, // E2
        { midi: 41, onset: 17280, duration: 460, hand: 'lh' }, // F2
        { midi: 40, onset: 17760, duration: 460, hand: 'lh' }, // E2
        { midi: 38, onset: 18240, duration: 460, hand: 'lh' }, // D2
        { midi: 35, onset: 18720, duration: 460, hand: 'lh' }, // B1
        { midi: 36, onset: 19200, duration: 460, hand: 'lh' }, // C2
        { midi: 40, onset: 19680, duration: 460, hand: 'lh' }, // E2
        { midi: 43, onset: 20160, duration: 460, hand: 'lh' }, // G2
        { midi: 45, onset: 20640, duration: 460, hand: 'lh' }, // A2
        { midi: 46, onset: 21120, duration: 460, hand: 'lh' }, // B♭2
        { midi: 45, onset: 21600, duration: 460, hand: 'lh' }, // A2
        { midi: 43, onset: 22080, duration: 460, hand: 'lh' }, // G2
        { midi: 40, onset: 22560, duration: 460, hand: 'lh' }, // E2
        { midi: 52, onset: 0, duration: 220, hand: 'rh' }, // E3
        { midi: 58, onset: 0, duration: 220, hand: 'rh' }, // B♭3
        { midi: 62, onset: 0, duration: 220, hand: 'rh' }, // D4
        { midi: 52, onset: 240, duration: 220, hand: 'rh' }, // E3
        { midi: 58, onset: 240, duration: 220, hand: 'rh' }, // B♭3
        { midi: 62, onset: 240, duration: 220, hand: 'rh' }, // D4
        { midi: 52, onset: 1920, duration: 220, hand: 'rh' }, // E3
        { midi: 58, onset: 1920, duration: 220, hand: 'rh' }, // B♭3
        { midi: 62, onset: 1920, duration: 220, hand: 'rh' }, // D4
        { midi: 52, onset: 2160, duration: 220, hand: 'rh' }, // E3
        { midi: 58, onset: 2160, duration: 220, hand: 'rh' }, // B♭3
        { midi: 62, onset: 2160, duration: 220, hand: 'rh' }, // D4
        { midi: 52, onset: 2880, duration: 220, hand: 'rh' }, // E3
        { midi: 58, onset: 2880, duration: 220, hand: 'rh' }, // B♭3
        { midi: 62, onset: 2880, duration: 220, hand: 'rh' }, // D4
        { midi: 52, onset: 3120, duration: 220, hand: 'rh' }, // E3
        { midi: 58, onset: 3120, duration: 220, hand: 'rh' }, // B♭3
        { midi: 62, onset: 3120, duration: 220, hand: 'rh' }, // D4
        { midi: 52, onset: 3840, duration: 700, hand: 'rh' }, // E3
        { midi: 58, onset: 3840, duration: 700, hand: 'rh' }, // B♭3
        { midi: 62, onset: 3840, duration: 700, hand: 'rh' }, // D4
        { midi: 52, onset: 4560, duration: 220, hand: 'rh' }, // E3
        { midi: 58, onset: 4560, duration: 220, hand: 'rh' }, // B♭3
        { midi: 62, onset: 4560, duration: 220, hand: 'rh' }, // D4
        { midi: 51, onset: 7680, duration: 220, hand: 'rh' }, // E♭3
        { midi: 57, onset: 7680, duration: 220, hand: 'rh' }, // A3
        { midi: 60, onset: 7680, duration: 220, hand: 'rh' }, // C4
        { midi: 51, onset: 7920, duration: 220, hand: 'rh' }, // E♭3
        { midi: 57, onset: 7920, duration: 220, hand: 'rh' }, // A3
        { midi: 60, onset: 7920, duration: 220, hand: 'rh' }, // C4
        { midi: 51, onset: 9600, duration: 220, hand: 'rh' }, // E♭3
        { midi: 57, onset: 9600, duration: 220, hand: 'rh' }, // A3
        { midi: 60, onset: 9600, duration: 220, hand: 'rh' }, // C4
        { midi: 51, onset: 9840, duration: 220, hand: 'rh' }, // E♭3
        { midi: 57, onset: 9840, duration: 220, hand: 'rh' }, // A3
        { midi: 60, onset: 9840, duration: 220, hand: 'rh' }, // C4
        { midi: 51, onset: 10560, duration: 220, hand: 'rh' }, // E♭3
        { midi: 57, onset: 10560, duration: 220, hand: 'rh' }, // A3
        { midi: 60, onset: 10560, duration: 220, hand: 'rh' }, // C4
        { midi: 51, onset: 10800, duration: 220, hand: 'rh' }, // E♭3
        { midi: 57, onset: 10800, duration: 220, hand: 'rh' }, // A3
        { midi: 60, onset: 10800, duration: 220, hand: 'rh' }, // C4
        { midi: 52, onset: 11520, duration: 700, hand: 'rh' }, // E3
        { midi: 58, onset: 11520, duration: 700, hand: 'rh' }, // B♭3
        { midi: 62, onset: 11520, duration: 700, hand: 'rh' }, // D4
        { midi: 52, onset: 12240, duration: 220, hand: 'rh' }, // E3
        { midi: 58, onset: 12240, duration: 220, hand: 'rh' }, // B♭3
        { midi: 62, onset: 12240, duration: 220, hand: 'rh' }, // D4
        { midi: 53, onset: 15360, duration: 220, hand: 'rh' }, // F3
        { midi: 59, onset: 15360, duration: 220, hand: 'rh' }, // B3
        { midi: 62, onset: 15360, duration: 220, hand: 'rh' }, // D4
        { midi: 53, onset: 15600, duration: 220, hand: 'rh' }, // F3
        { midi: 59, onset: 15600, duration: 220, hand: 'rh' }, // B3
        { midi: 62, onset: 15600, duration: 220, hand: 'rh' }, // D4
        { midi: 53, onset: 17280, duration: 220, hand: 'rh' }, // F3
        { midi: 59, onset: 17280, duration: 220, hand: 'rh' }, // B3
        { midi: 62, onset: 17280, duration: 220, hand: 'rh' }, // D4
        { midi: 53, onset: 17520, duration: 220, hand: 'rh' }, // F3
        { midi: 59, onset: 17520, duration: 220, hand: 'rh' }, // B3
        { midi: 62, onset: 17520, duration: 220, hand: 'rh' }, // D4
        { midi: 53, onset: 18240, duration: 220, hand: 'rh' }, // F3
        { midi: 59, onset: 18240, duration: 220, hand: 'rh' }, // B3
        { midi: 62, onset: 18240, duration: 220, hand: 'rh' }, // D4
        { midi: 53, onset: 18480, duration: 220, hand: 'rh' }, // F3
        { midi: 59, onset: 18480, duration: 220, hand: 'rh' }, // B3
        { midi: 62, onset: 18480, duration: 220, hand: 'rh' }, // D4
        { midi: 52, onset: 19200, duration: 700, hand: 'rh' }, // E3
        { midi: 58, onset: 19200, duration: 700, hand: 'rh' }, // B♭3
        { midi: 62, onset: 19200, duration: 700, hand: 'rh' }, // D4
        { midi: 52, onset: 19920, duration: 220, hand: 'rh' }, // E3
        { midi: 58, onset: 19920, duration: 220, hand: 'rh' }, // B♭3
        { midi: 62, onset: 19920, duration: 220, hand: 'rh' }, // D4
      ],
    },
    {
      stepNumber: 39,
      module: 'jazz_l2',
      section: 'D',
      subsection: 'D2: LH Voicings, RH Lines',
      activity: 'D2.1: LH Cmaj9 + RH One-Bar Line 13',
      direction: 'Left hand B–D–E–G; right hand A, G, D, C, then E, held.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l2_perf_line13 | jazz',
      styleRef: 'l2a',
      successFeedback: 'Voicing below, line above — the hands never cross.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_chords_rh_melody',
        lh_role: 'chords',
        rh_role: 'melody',
        style_ref: 'l2a',
      },
      chordSymbols: ['Cmaj9'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords', 'melody'],
      },
      targetNotes: [
        { midi: 59, onset: 0, duration: 1860, hand: 'lh' }, // B3
        { midi: 62, onset: 0, duration: 1860, hand: 'lh' }, // D4
        { midi: 64, onset: 0, duration: 1860, hand: 'lh' }, // E4
        { midi: 67, onset: 0, duration: 1860, hand: 'lh' }, // G4
        { midi: 81, onset: 0, duration: 220, hand: 'rh' }, // A5
        { midi: 79, onset: 240, duration: 220, hand: 'rh' }, // G5
        { midi: 74, onset: 480, duration: 220, hand: 'rh' }, // D5
        { midi: 72, onset: 720, duration: 220, hand: 'rh' }, // C5
        { midi: 76, onset: 960, duration: 940, hand: 'rh' }, // E5
      ],
    },
    {
      stepNumber: 40,
      module: 'jazz_l2',
      section: 'D',
      subsection: 'D2: LH Voicings, RH Lines',
      activity: 'D2.2: LH Dmin9 + RH One-Bar Line 15',
      direction: 'Left hand C–E–F–A; right hand high C, B, G, D, then C.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l2_perf_line15 | jazz',
      styleRef: 'l2a',
      successFeedback: 'D Dorian from the white keys, in two hands.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_chords_rh_melody',
        lh_role: 'chords',
        rh_role: 'melody',
        style_ref: 'l2a',
      },
      chordSymbols: ['Dm9'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords', 'melody'],
      },
      targetNotes: [
        { midi: 60, onset: 0, duration: 1860, hand: 'lh' }, // C4
        { midi: 64, onset: 0, duration: 1860, hand: 'lh' }, // E4
        { midi: 65, onset: 0, duration: 1860, hand: 'lh' }, // F4
        { midi: 69, onset: 0, duration: 1860, hand: 'lh' }, // A4
        { midi: 84, onset: 0, duration: 220, hand: 'rh' }, // C6
        { midi: 83, onset: 240, duration: 220, hand: 'rh' }, // B5
        { midi: 79, onset: 480, duration: 220, hand: 'rh' }, // G5
        { midi: 74, onset: 720, duration: 220, hand: 'rh' }, // D5
        { midi: 72, onset: 960, duration: 940, hand: 'rh' }, // C5
      ],
    },
  ],
};

// ── L3: The ii–V–I ──

const jazzL3SectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    {
      stepNumber: 1,
      module: 'jazz_l3',
      section: 'A',
      subsection: 'A1: The ii Arpeggio',
      activity: 'A1.1: Gm7 Arpeggio, 1-3-5-7 (Out of Time)',
      direction: 'The ii chord in F: G–B♭–D–F, and back down.',
      assessment: 'pitch_order',
      tag: 'jazz:l3_ii_arp_1357 | jazz',
      styleRef: 'l3a',
      successFeedback:
        'The ii arpeggio — the core of every line in this level.',
      key: 'F major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Gm7'],
      targetNotes: [
        { midi: 67, onset: 0, duration: 460 }, // G4
        { midi: 70, onset: 480, duration: 460 }, // B♭4
        { midi: 74, onset: 960, duration: 460 }, // D5
        { midi: 77, onset: 1440, duration: 460 }, // F5
        { midi: 74, onset: 1920, duration: 460 }, // D5
        { midi: 70, onset: 2400, duration: 460 }, // B♭4
        { midi: 67, onset: 2880, duration: 460 }, // G4
      ],
    },
    {
      stepNumber: 2,
      module: 'jazz_l3',
      section: 'A',
      subsection: 'A1: The ii Arpeggio',
      activity: 'A1.2: Gm9 from the 3rd, 3-5-7-9 (Out of Time)',
      direction: 'Start on the 3rd: B♭–D–F–A, and back down.',
      assessment: 'pitch_order',
      tag: 'jazz:l3_ii_arp_3579 | jazz',
      styleRef: 'l3a',
      successFeedback: 'From the 3rd, the arpeggio reaches the 9.',
      key: 'F major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Gm9'],
      targetNotes: [
        { midi: 70, onset: 0, duration: 460 }, // B♭4
        { midi: 74, onset: 480, duration: 460 }, // D5
        { midi: 77, onset: 960, duration: 460 }, // F5
        { midi: 81, onset: 1440, duration: 460 }, // A5
        { midi: 77, onset: 1920, duration: 460 }, // F5
        { midi: 74, onset: 2400, duration: 460 }, // D5
        { midi: 70, onset: 2880, duration: 460 }, // B♭4
      ],
    },
    {
      stepNumber: 3,
      module: 'jazz_l3',
      section: 'A',
      subsection: 'A1: The ii Arpeggio',
      activity: 'A1.3: The ii Arpeggio in Swung Eighths (In Time)',
      direction: 'Up 1-3-5-7-9, back down to the 3, and land on G.',
      assessment: 'pitch_order_timing',
      tag: 'jazz:l3_ii_arp_it | jazz',
      styleRef: 'l3a',
      successFeedback: 'The arpeggio, swinging.',
      key: 'F major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Gm9'],
      tempo: 100,
      swing: 64,
      swingUnit: '8n',
      targetNotes: [
        { midi: 67, onset: 0, duration: 220 }, // G4
        { midi: 70, onset: 240, duration: 220 }, // B♭4
        { midi: 74, onset: 480, duration: 220 }, // D5
        { midi: 77, onset: 720, duration: 220 }, // F5
        { midi: 81, onset: 960, duration: 220 }, // A5
        { midi: 77, onset: 1200, duration: 220 }, // F5
        { midi: 74, onset: 1440, duration: 220 }, // D5
        { midi: 70, onset: 1680, duration: 220 }, // B♭4
        { midi: 67, onset: 1920, duration: 940 }, // G4
      ],
    },
    {
      stepNumber: 4,
      module: 'jazz_l3',
      section: 'A',
      subsection: 'A2: ii–V–I Lines (ii and V in One Bar)',
      activity: 'A2.1: ii–V–I Line 1',
      direction:
        'Up the Gm7 arpeggio — G, B♭, D, F — then down E, D, C, B♭ over C7, landing on A.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_iivi_line_1 | jazz',
      styleRef: 'l3a',
      successFeedback: 'The ii arpeggio, then the V, into the 3 of F.',
      key: 'F major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Gm7', 'C7', 'Fmaj7', 'Fmaj7'],
      chordsPerBar: 2,
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 67, onset: 0, duration: 220 }, // G4
        { midi: 70, onset: 240, duration: 220 }, // B♭4
        { midi: 74, onset: 480, duration: 220 }, // D5
        { midi: 77, onset: 720, duration: 220 }, // F5
        { midi: 76, onset: 960, duration: 220 }, // E5
        { midi: 74, onset: 1200, duration: 220 }, // D5
        { midi: 72, onset: 1440, duration: 220 }, // C5
        { midi: 70, onset: 1680, duration: 220 }, // B♭4
        { midi: 69, onset: 1920, duration: 1860 }, // A4
      ],
    },
    {
      stepNumber: 5,
      module: 'jazz_l3',
      section: 'A',
      subsection: 'A2: ii–V–I Lines (ii and V in One Bar)',
      activity: 'A2.2: ii–V–I Line 2',
      direction: 'Up the arpeggio, then E, G, C, B♭ — and A.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_iivi_line_2 | jazz',
      styleRef: 'l3a',
      successFeedback: 'A leap in the V bar, the same landing.',
      key: 'F major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Gm7', 'C7', 'Fmaj7', 'Fmaj7'],
      chordsPerBar: 2,
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 67, onset: 0, duration: 220 }, // G4
        { midi: 70, onset: 240, duration: 220 }, // B♭4
        { midi: 74, onset: 480, duration: 220 }, // D5
        { midi: 77, onset: 720, duration: 220 }, // F5
        { midi: 76, onset: 960, duration: 220 }, // E5
        { midi: 79, onset: 1200, duration: 220 }, // G5
        { midi: 72, onset: 1440, duration: 220 }, // C5
        { midi: 70, onset: 1680, duration: 220 }, // B♭4
        { midi: 69, onset: 1920, duration: 1860 }, // A4
      ],
    },
    {
      stepNumber: 6,
      module: 'jazz_l3',
      section: 'A',
      subsection: 'A2: ii–V–I Lines (ii and V in One Bar)',
      activity: 'A2.3: ii–V–I Line 5',
      direction: 'From the 3rd: B♭, D, F, A, then G, F, E, D — and C.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_iivi_line_5 | jazz',
      styleRef: 'l3a',
      successFeedback: 'From the 3rd, landing on the 5.',
      key: 'F major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Gm7', 'C7', 'Fmaj7', 'Fmaj7'],
      chordsPerBar: 2,
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 70, onset: 0, duration: 220 }, // B♭4
        { midi: 74, onset: 240, duration: 220 }, // D5
        { midi: 77, onset: 480, duration: 220 }, // F5
        { midi: 81, onset: 720, duration: 220 }, // A5
        { midi: 79, onset: 960, duration: 220 }, // G5
        { midi: 77, onset: 1200, duration: 220 }, // F5
        { midi: 76, onset: 1440, duration: 220 }, // E5
        { midi: 74, onset: 1680, duration: 220 }, // D5
        { midi: 72, onset: 1920, duration: 1860 }, // C5
      ],
    },
    {
      stepNumber: 7,
      module: 'jazz_l3',
      section: 'A',
      subsection: 'A2: ii–V–I Lines (ii and V in One Bar)',
      activity: 'A2.4: ii–V–I Line 7',
      direction: 'B♭, D, F, A, then A♭, E, D♭, B — the altered V — into C.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_iivi_line_7 | jazz',
      styleRef: 'l3a',
      successFeedback: 'Tension on the V, released on the I.',
      key: 'F major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Gm7', 'C7', 'Fmaj7', 'Fmaj7'],
      chordsPerBar: 2,
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 70, onset: 0, duration: 220 }, // B♭4
        { midi: 74, onset: 240, duration: 220 }, // D5
        { midi: 77, onset: 480, duration: 220 }, // F5
        { midi: 81, onset: 720, duration: 220 }, // A5
        { midi: 80, onset: 960, duration: 220 }, // A♭5
        { midi: 76, onset: 1200, duration: 220 }, // E5
        { midi: 73, onset: 1440, duration: 220 }, // D♭5
        { midi: 71, onset: 1680, duration: 220 }, // B4
        { midi: 72, onset: 1920, duration: 1860 }, // C5
      ],
    },
    {
      stepNumber: 8,
      module: 'jazz_l3',
      section: 'A',
      subsection: 'A3: Four-Bar Lines',
      activity: 'A3.1: Four-Bar Line 1',
      direction:
        'Two pickup notes, A and A♭, then the ii arpeggio over C7, landing on A.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_4bar_1 | jazz',
      styleRef: 'l3a',
      successFeedback: 'An approach, the ii arpeggio, a V line, the I.',
      key: 'F major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Gm7', 'C7', 'Fmaj7', 'Fmaj7'],
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 69, onset: 1440, duration: 220 }, // A4
        { midi: 68, onset: 1680, duration: 220 }, // A♭4
        { midi: 67, onset: 1920, duration: 220 }, // G4
        { midi: 70, onset: 2160, duration: 220 }, // B♭4
        { midi: 74, onset: 2400, duration: 220 }, // D5
        { midi: 77, onset: 2640, duration: 220 }, // F5
        { midi: 76, onset: 2880, duration: 220 }, // E5
        { midi: 74, onset: 3120, duration: 220 }, // D5
        { midi: 72, onset: 3360, duration: 220 }, // C5
        { midi: 70, onset: 3600, duration: 220 }, // B♭4
        { midi: 69, onset: 3840, duration: 1860 }, // A4
      ],
    },
    {
      stepNumber: 9,
      module: 'jazz_l3',
      section: 'A',
      subsection: 'A3: Four-Bar Lines',
      activity: 'A3.2: Four-Bar Line 3',
      direction:
        'A♭ and F♯ around G, then the arpeggio and an altered V: E, C, G♯, E — into G.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_4bar_3 | jazz',
      styleRef: 'l3a',
      successFeedback: 'The ♯5 pulling into the 9.',
      key: 'F major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Gm7', 'C7', 'Fmaj7', 'Fmaj7'],
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 68, onset: 1440, duration: 220 }, // A♭4
        { midi: 66, onset: 1680, duration: 220 }, // F♯4
        { midi: 67, onset: 1920, duration: 220 }, // G4
        { midi: 70, onset: 2160, duration: 220 }, // B♭4
        { midi: 74, onset: 2400, duration: 220 }, // D5
        { midi: 77, onset: 2640, duration: 220 }, // F5
        { midi: 76, onset: 2880, duration: 220 }, // E5
        { midi: 72, onset: 3120, duration: 220 }, // C5
        { midi: 68, onset: 3360, duration: 220 }, // G♯4
        { midi: 64, onset: 3600, duration: 220 }, // E4
        { midi: 67, onset: 3840, duration: 1860 }, // G4
      ],
    },
    {
      stepNumber: 10,
      module: 'jazz_l3',
      section: 'A',
      subsection: 'A3: Four-Bar Lines',
      activity: 'A3.3: Four-Bar Line 5',
      direction:
        'F♯, A, A♭, F♯ — the enclosure — then the arpeggio, G, F, E, D, into C.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_4bar_5 | jazz',
      styleRef: 'l3a',
      successFeedback: 'Enclosing G before you land on it.',
      key: 'F major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Gm7', 'C7', 'Fmaj7', 'Fmaj7'],
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 66, onset: 960, duration: 220 }, // F♯4
        { midi: 69, onset: 1200, duration: 220 }, // A4
        { midi: 68, onset: 1440, duration: 220 }, // A♭4
        { midi: 66, onset: 1680, duration: 220 }, // F♯4
        { midi: 67, onset: 1920, duration: 220 }, // G4
        { midi: 70, onset: 2160, duration: 220 }, // B♭4
        { midi: 74, onset: 2400, duration: 220 }, // D5
        { midi: 77, onset: 2640, duration: 220 }, // F5
        { midi: 79, onset: 2880, duration: 220 }, // G5
        { midi: 77, onset: 3120, duration: 220 }, // F5
        { midi: 76, onset: 3360, duration: 220 }, // E5
        { midi: 74, onset: 3600, duration: 220 }, // D5
        { midi: 72, onset: 3840, duration: 1860 }, // C5
      ],
    },
    {
      stepNumber: 11,
      module: 'jazz_l3',
      section: 'A',
      subsection: 'A3: Four-Bar Lines',
      activity: 'A3.4: Four-Bar Line 9',
      direction:
        'B♭, A, G, F♯, A in the ii bar, then the arpeggio and down to A.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_4bar_9 | jazz',
      styleRef: 'l3a',
      successFeedback: 'A longer approach.',
      key: 'F major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Gm7', 'C7', 'Fmaj7', 'Fmaj7'],
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 70, onset: 720, duration: 220 }, // B♭4
        { midi: 69, onset: 960, duration: 220 }, // A4
        { midi: 67, onset: 1200, duration: 220 }, // G4
        { midi: 66, onset: 1440, duration: 220 }, // F♯4
        { midi: 69, onset: 1680, duration: 220 }, // A4
        { midi: 67, onset: 1920, duration: 220 }, // G4
        { midi: 70, onset: 2160, duration: 220 }, // B♭4
        { midi: 74, onset: 2400, duration: 220 }, // D5
        { midi: 77, onset: 2640, duration: 220 }, // F5
        { midi: 76, onset: 2880, duration: 220 }, // E5
        { midi: 74, onset: 3120, duration: 220 }, // D5
        { midi: 72, onset: 3360, duration: 220 }, // C5
        { midi: 70, onset: 3600, duration: 220 }, // B♭4
        { midi: 69, onset: 3840, duration: 1860 }, // A4
      ],
    },
    {
      stepNumber: 12,
      module: 'jazz_l3',
      section: 'A',
      subsection: 'A3: Four-Bar Lines',
      activity: 'A3.5: Four-Bar Line 13',
      direction:
        'G♯, A, C, B — approaching B♭ — then from the 3rd up to A, and down to C.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_4bar_13 | jazz',
      styleRef: 'l3a',
      successFeedback: 'Approaching the 3rd of the ii.',
      key: 'F major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Gm7', 'C7', 'Fmaj7', 'Fmaj7'],
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 68, onset: 960, duration: 220 }, // G♯4
        { midi: 69, onset: 1200, duration: 220 }, // A4
        { midi: 72, onset: 1440, duration: 220 }, // C5
        { midi: 71, onset: 1680, duration: 220 }, // B4
        { midi: 70, onset: 1920, duration: 220 }, // B♭4
        { midi: 74, onset: 2160, duration: 220 }, // D5
        { midi: 77, onset: 2400, duration: 220 }, // F5
        { midi: 81, onset: 2640, duration: 220 }, // A5
        { midi: 79, onset: 2880, duration: 220 }, // G5
        { midi: 77, onset: 3120, duration: 220 }, // F5
        { midi: 76, onset: 3360, duration: 220 }, // E5
        { midi: 74, onset: 3600, duration: 220 }, // D5
        { midi: 72, onset: 3840, duration: 1860 }, // C5
      ],
    },
    {
      stepNumber: 13,
      module: 'jazz_l3',
      section: 'A',
      subsection: 'A4: True ii | V Lines',
      activity: 'A4.1: Four-Bar Line 19',
      direction:
        'A full bar of Gm7 — E, F, D, B♭, G, B♭, D, F — then a full bar of C7, into C.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_4bar_19 | jazz',
      styleRef: 'l3a',
      successFeedback: 'A whole bar for each chord.',
      key: 'F major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Gm7', 'C7', 'Fmaj7', 'Fmaj7'],
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 76, onset: 0, duration: 220 }, // E5
        { midi: 77, onset: 240, duration: 220 }, // F5
        { midi: 74, onset: 480, duration: 220 }, // D5
        { midi: 70, onset: 720, duration: 220 }, // B♭4
        { midi: 67, onset: 960, duration: 220 }, // G4
        { midi: 70, onset: 1200, duration: 220 }, // B♭4
        { midi: 74, onset: 1440, duration: 220 }, // D5
        { midi: 77, onset: 1680, duration: 220 }, // F5
        { midi: 81, onset: 1920, duration: 220 }, // A5
        { midi: 84, onset: 2160, duration: 220 }, // C6
        { midi: 82, onset: 2400, duration: 220 }, // B♭5
        { midi: 81, onset: 2640, duration: 220 }, // A5
        { midi: 79, onset: 2880, duration: 220 }, // G5
        { midi: 77, onset: 3120, duration: 220 }, // F5
        { midi: 76, onset: 3360, duration: 220 }, // E5
        { midi: 74, onset: 3600, duration: 220 }, // D5
        { midi: 72, onset: 3840, duration: 1860 }, // C5
      ],
    },
    {
      stepNumber: 14,
      module: 'jazz_l3',
      section: 'A',
      subsection: 'A4: True ii | V Lines',
      activity: 'A4.2: Four-Bar Line 21',
      direction:
        'A quarter note A, then up through Gm7; over C7, down to B and B♭, into A.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_4bar_21 | jazz',
      styleRef: 'l3a',
      successFeedback: 'Chromatic B–B♭ leading home.',
      key: 'F major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Gm7', 'C7', 'Fmaj7', 'Fmaj7'],
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 69, onset: 0, duration: 460 }, // A4
        { midi: 72, onset: 480, duration: 220 }, // C5
        { midi: 69, onset: 720, duration: 220 }, // A4
        { midi: 70, onset: 960, duration: 220 }, // B♭4
        { midi: 74, onset: 1200, duration: 220 }, // D5
        { midi: 77, onset: 1440, duration: 220 }, // F5
        { midi: 81, onset: 1680, duration: 220 }, // A5
        { midi: 79, onset: 1920, duration: 220 }, // G5
        { midi: 77, onset: 2160, duration: 220 }, // F5
        { midi: 76, onset: 2400, duration: 220 }, // E5
        { midi: 74, onset: 2640, duration: 220 }, // D5
        { midi: 72, onset: 2880, duration: 220 }, // C5
        { midi: 71, onset: 3120, duration: 220 }, // B4
        { midi: 70, onset: 3360, duration: 220 }, // B♭4
        { midi: 72, onset: 3600, duration: 220 }, // C5
        { midi: 69, onset: 3840, duration: 1860 }, // A4
      ],
    },
    {
      stepNumber: 15,
      module: 'jazz_l3',
      section: 'A',
      subsection: 'A5: Into Other Keys',
      activity: 'A5.1: Four-Bar Line 1 in B♭',
      direction: 'Line 1 a 4th higher, over Cm7 – F7 – B♭maj7.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_4bar_1_bb | jazz',
      styleRef: 'l3a',
      successFeedback: 'Hear it in the new key first, then play it.',
      key: 'Bb major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Cm7', 'F7', 'Bbmaj7', 'Bbmaj7'],
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 74, onset: 1440, duration: 220 }, // D5
        { midi: 73, onset: 1680, duration: 220 }, // D♭5
        { midi: 72, onset: 1920, duration: 220 }, // C5
        { midi: 75, onset: 2160, duration: 220 }, // E♭5
        { midi: 79, onset: 2400, duration: 220 }, // G5
        { midi: 82, onset: 2640, duration: 220 }, // B♭5
        { midi: 81, onset: 2880, duration: 220 }, // A5
        { midi: 79, onset: 3120, duration: 220 }, // G5
        { midi: 77, onset: 3360, duration: 220 }, // F5
        { midi: 75, onset: 3600, duration: 220 }, // E♭5
        { midi: 74, onset: 3840, duration: 1860 }, // D5
      ],
    },
    {
      stepNumber: 16,
      module: 'jazz_l3',
      section: 'A',
      subsection: 'A5: Into Other Keys',
      activity: 'A5.2: Four-Bar Line 1 in E♭',
      direction: 'Line 1 a whole step lower, over Fm7 – B♭7 – E♭maj7.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_4bar_1_eb | jazz',
      styleRef: 'l3a',
      successFeedback: 'The degrees stay; the keys move.',
      key: 'Eb major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleId: 'ionian',
      chordSymbols: ['Fm7', 'Bb7', 'Ebmaj7', 'Ebmaj7'],
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 67, onset: 1440, duration: 220 }, // G4
        { midi: 66, onset: 1680, duration: 220 }, // G♭4
        { midi: 65, onset: 1920, duration: 220 }, // F4
        { midi: 68, onset: 2160, duration: 220 }, // A♭4
        { midi: 72, onset: 2400, duration: 220 }, // C5
        { midi: 75, onset: 2640, duration: 220 }, // E♭5
        { midi: 74, onset: 2880, duration: 220 }, // D5
        { midi: 72, onset: 3120, duration: 220 }, // C5
        { midi: 70, onset: 3360, duration: 220 }, // B♭4
        { midi: 68, onset: 3600, duration: 220 }, // A♭4
        { midi: 67, onset: 3840, duration: 1860 }, // G4
      ],
    },
    {
      stepNumber: 17,
      module: 'jazz_l3',
      section: 'A',
      subsection: 'A6: Minor Tension and Release',
      activity: 'A6.1: Tension and Release Line 2',
      direction:
        'Over A7♭9 for two beats, C♯, E, A, G; then over D minor 6, F, A, D.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_tension_2 | jazz',
      styleRef: 'l3a',
      successFeedback: 'Two beats of tension, two of release.',
      key: 'D minor',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 11],
      scaleId: 'harmonic_minor',
      chordSymbols: ['A7b9', 'Dm6'],
      chordsPerBar: 2,
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 61, onset: 0, duration: 220 }, // C♯4
        { midi: 64, onset: 240, duration: 220 }, // E4
        { midi: 69, onset: 480, duration: 220 }, // A4
        { midi: 67, onset: 720, duration: 220 }, // G4
        { midi: 65, onset: 960, duration: 220 }, // F4
        { midi: 69, onset: 1200, duration: 220 }, // A4
        { midi: 74, onset: 1440, duration: 220 }, // D5
      ],
    },
    {
      stepNumber: 18,
      module: 'jazz_l3',
      section: 'A',
      subsection: 'A6: Minor Tension and Release',
      activity: 'A6.2: Tension and Release Line 5',
      direction: 'C♯, E, B♭, G♯ around A, then E, G, F — into D.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_tension_5 | jazz',
      styleRef: 'l3a',
      successFeedback: 'B♭, the ♭9, on the way home.',
      key: 'D minor',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 11],
      scaleId: 'harmonic_minor',
      chordSymbols: ['A7b9', 'Dm6'],
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 73, onset: 0, duration: 220 }, // C♯5
        { midi: 76, onset: 240, duration: 220 }, // E5
        { midi: 70, onset: 480, duration: 220 }, // B♭4
        { midi: 68, onset: 720, duration: 220 }, // G♯4
        { midi: 69, onset: 960, duration: 220 }, // A4
        { midi: 64, onset: 1200, duration: 220 }, // E4
        { midi: 67, onset: 1440, duration: 220 }, // G4
        { midi: 65, onset: 1680, duration: 220 }, // F4
        { midi: 62, onset: 1920, duration: 940 }, // D4
      ],
    },
    {
      stepNumber: 19,
      module: 'jazz_l3',
      section: 'A',
      subsection: 'A6: Minor Tension and Release',
      activity: 'A6.3: Tension and Release Line 6',
      direction: 'D, B, C♯, E, A, A♭, G, A — into F.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_tension_6 | jazz',
      styleRef: 'l3a',
      successFeedback: 'Landing on D minor’s 3rd.',
      key: 'D minor',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 11],
      scaleId: 'harmonic_minor',
      chordSymbols: ['A7b9', 'Dm6'],
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 74, onset: 0, duration: 220 }, // D5
        { midi: 71, onset: 240, duration: 220 }, // B4
        { midi: 73, onset: 480, duration: 220 }, // C♯5
        { midi: 76, onset: 720, duration: 220 }, // E5
        { midi: 69, onset: 960, duration: 220 }, // A4
        { midi: 68, onset: 1200, duration: 220 }, // A♭4
        { midi: 67, onset: 1440, duration: 220 }, // G4
        { midi: 69, onset: 1680, duration: 220 }, // A4
        { midi: 65, onset: 1920, duration: 940 }, // F4
      ],
    },
    {
      stepNumber: 20,
      module: 'jazz_l3',
      section: 'A',
      subsection: 'A6: Minor Tension and Release',
      activity: 'A6.4: Tension and Release Line 9',
      direction: 'E, F, E, D, C♯, B♭, A, G — then F, D, E, C♯, D.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_tension_9 | jazz',
      styleRef: 'l3a',
      successFeedback: 'Down the harmonic minor and around D.',
      key: 'D minor',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 11],
      scaleId: 'harmonic_minor',
      chordSymbols: ['A7b9', 'Dm6'],
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 76, onset: 0, duration: 220 }, // E5
        { midi: 77, onset: 240, duration: 220 }, // F5
        { midi: 76, onset: 480, duration: 220 }, // E5
        { midi: 74, onset: 720, duration: 220 }, // D5
        { midi: 73, onset: 960, duration: 220 }, // C♯5
        { midi: 70, onset: 1200, duration: 220 }, // B♭4
        { midi: 69, onset: 1440, duration: 220 }, // A4
        { midi: 67, onset: 1680, duration: 220 }, // G4
        { midi: 65, onset: 1920, duration: 220 }, // F4
        { midi: 62, onset: 2160, duration: 220 }, // D4
        { midi: 64, onset: 2400, duration: 220 }, // E4
        { midi: 61, onset: 2640, duration: 220 }, // C♯4
        { midi: 62, onset: 2880, duration: 220 }, // D4
      ],
    },
    {
      stepNumber: 21,
      module: 'jazz_l3',
      section: 'A',
      subsection: 'A6: Minor Tension and Release',
      activity: 'A6.5: Tension and Release Line 10',
      direction: 'E, C♯, D, E, F, A, C♯, E, held — then C♯, A, B.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_tension_10 | jazz',
      styleRef: 'l3a',
      successFeedback: 'Ending on the 6 of D minor 6.',
      key: 'D minor',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 11],
      scaleId: 'harmonic_minor',
      chordSymbols: ['A7b9', 'Dm6'],
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 64, onset: 0, duration: 220 }, // E4
        { midi: 61, onset: 240, duration: 220 }, // C♯4
        { midi: 62, onset: 480, duration: 220 }, // D4
        { midi: 64, onset: 720, duration: 220 }, // E4
        { midi: 65, onset: 960, duration: 220 }, // F4
        { midi: 69, onset: 1200, duration: 220 }, // A4
        { midi: 73, onset: 1440, duration: 220 }, // C♯5
        { midi: 76, onset: 1680, duration: 700 }, // E5
        { midi: 73, onset: 2400, duration: 220 }, // C♯5
        { midi: 69, onset: 2640, duration: 220 }, // A4
        { midi: 71, onset: 2880, duration: 460 }, // B4
      ],
    },
  ],
};

const jazzL3SectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    {
      stepNumber: 22,
      module: 'jazz_l3',
      section: 'B',
      subsection: 'B1: 3-5-7-9',
      activity: 'B1.1: 3-5-7-9 on Every Chord Type (Out of Time)',
      direction: 'From the 3rd up: E–G–B–D, E–G–B♭–D, E♭–G–B♭–D, E♭–G♭–B♭–D.',
      assessment: 'pitch_order',
      tag: 'jazz:l3_3579_types | jazz',
      styleRef: 'l3a',
      successFeedback:
        'The other rootless voicing — the whole chord and its 9.',
      chordSymbols: ['Cmaj9', 'C9', 'Cm9', 'Cm9b5'],
      targetNotes: [
        { midi: 52, onset: 0, duration: 1800 }, // E3
        { midi: 55, onset: 0, duration: 1800 }, // G3
        { midi: 59, onset: 0, duration: 1800 }, // B3
        { midi: 62, onset: 0, duration: 1800 }, // D4
        { midi: 52, onset: 1920, duration: 1800 }, // E3
        { midi: 55, onset: 1920, duration: 1800 }, // G3
        { midi: 58, onset: 1920, duration: 1800 }, // B♭3
        { midi: 62, onset: 1920, duration: 1800 }, // D4
        { midi: 51, onset: 3840, duration: 1800 }, // E♭3
        { midi: 55, onset: 3840, duration: 1800 }, // G3
        { midi: 58, onset: 3840, duration: 1800 }, // B♭3
        { midi: 62, onset: 3840, duration: 1800 }, // D4
        { midi: 51, onset: 5760, duration: 1800 }, // E♭3
        { midi: 54, onset: 5760, duration: 1800 }, // G♭3
        { midi: 58, onset: 5760, duration: 1800 }, // B♭3
        { midi: 62, onset: 5760, duration: 1800 }, // D4
      ],
    },
    {
      stepNumber: 23,
      module: 'jazz_l3',
      section: 'B',
      subsection: 'B2: Rootless A',
      activity: 'B2.1: Rootless A — ii–V–I (Out of Time)',
      direction:
        'F–A–C–E, F–A–B–E, E–G–B–D. The C drops to B; everything else holds or steps.',
      assessment: 'pitch_order',
      tag: 'jazz:l3_rootless_a | jazz',
      styleRef: 'l3a',
      successFeedback: 'Rootless A: the partner of rootless B.',
      chordSymbols: ['Dm9', 'G13', 'Cmaj9'],
      targetNotes: [
        { midi: 53, onset: 0, duration: 1800 }, // F3
        { midi: 57, onset: 0, duration: 1800 }, // A3
        { midi: 60, onset: 0, duration: 1800 }, // C4
        { midi: 64, onset: 0, duration: 1800 }, // E4
        { midi: 53, onset: 1920, duration: 1800 }, // F3
        { midi: 57, onset: 1920, duration: 1800 }, // A3
        { midi: 59, onset: 1920, duration: 1800 }, // B3
        { midi: 64, onset: 1920, duration: 1800 }, // E4
        { midi: 52, onset: 3840, duration: 1800 }, // E3
        { midi: 55, onset: 3840, duration: 1800 }, // G3
        { midi: 59, onset: 3840, duration: 1800 }, // B3
        { midi: 62, onset: 3840, duration: 1800 }, // D4
      ],
    },
    {
      stepNumber: 24,
      module: 'jazz_l3',
      section: 'B',
      subsection: 'B2: Rootless A',
      activity: 'B2.2: Rootless A, Minor (Out of Time)',
      direction: 'F–A♭–C–E, F–A♭–B–E♭, E♭–G–A–D.',
      assessment: 'pitch_order',
      tag: 'jazz:l3_rootless_a_minor | jazz',
      styleRef: 'l3a',
      successFeedback: 'The minor ii–V–i, rootless A.',
      key: 'C minor',
      chordSymbols: ['Dm9b5', 'G7b9b13', 'Cm6/9'],
      targetNotes: [
        { midi: 53, onset: 0, duration: 1800 }, // F3
        { midi: 56, onset: 0, duration: 1800 }, // A♭3
        { midi: 60, onset: 0, duration: 1800 }, // C4
        { midi: 64, onset: 0, duration: 1800 }, // E4
        { midi: 53, onset: 1920, duration: 1800 }, // F3
        { midi: 56, onset: 1920, duration: 1800 }, // A♭3
        { midi: 59, onset: 1920, duration: 1800 }, // B3
        { midi: 63, onset: 1920, duration: 1800 }, // E♭4
        { midi: 51, onset: 3840, duration: 1800 }, // E♭3
        { midi: 55, onset: 3840, duration: 1800 }, // G3
        { midi: 57, onset: 3840, duration: 1800 }, // A3
        { midi: 62, onset: 3840, duration: 1800 }, // D4
      ],
    },
    {
      stepNumber: 25,
      module: 'jazz_l3',
      section: 'B',
      subsection: 'B2: Rootless A',
      activity: 'B2.3: Play-Along — Rootless A, Charleston',
      direction:
        'The Charleston: a long chord on 1, a short one on the “and” of 2.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_rootless_a_play | jazz',
      styleRef: 'l3a',
      successFeedback: 'The first comping rhythm every jazz pianist learns.',
      chordSymbols: ['Dm9', 'G13', 'Cmaj9', 'Cmaj9'],
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 53, onset: 0, duration: 700 }, // F3
        { midi: 57, onset: 0, duration: 700 }, // A3
        { midi: 60, onset: 0, duration: 700 }, // C4
        { midi: 64, onset: 0, duration: 700 }, // E4
        { midi: 53, onset: 720, duration: 220 }, // F3
        { midi: 57, onset: 720, duration: 220 }, // A3
        { midi: 60, onset: 720, duration: 220 }, // C4
        { midi: 64, onset: 720, duration: 220 }, // E4
        { midi: 53, onset: 1920, duration: 700 }, // F3
        { midi: 57, onset: 1920, duration: 700 }, // A3
        { midi: 59, onset: 1920, duration: 700 }, // B3
        { midi: 64, onset: 1920, duration: 700 }, // E4
        { midi: 53, onset: 2640, duration: 220 }, // F3
        { midi: 57, onset: 2640, duration: 220 }, // A3
        { midi: 59, onset: 2640, duration: 220 }, // B3
        { midi: 64, onset: 2640, duration: 220 }, // E4
        { midi: 52, onset: 3840, duration: 700 }, // E3
        { midi: 55, onset: 3840, duration: 700 }, // G3
        { midi: 59, onset: 3840, duration: 700 }, // B3
        { midi: 62, onset: 3840, duration: 700 }, // D4
        { midi: 52, onset: 4560, duration: 220 }, // E3
        { midi: 55, onset: 4560, duration: 220 }, // G3
        { midi: 59, onset: 4560, duration: 220 }, // B3
        { midi: 62, onset: 4560, duration: 220 }, // D4
        { midi: 52, onset: 5760, duration: 700 }, // E3
        { midi: 55, onset: 5760, duration: 700 }, // G3
        { midi: 59, onset: 5760, duration: 700 }, // B3
        { midi: 62, onset: 5760, duration: 700 }, // D4
        { midi: 52, onset: 6480, duration: 220 }, // E3
        { midi: 55, onset: 6480, duration: 220 }, // G3
        { midi: 59, onset: 6480, duration: 220 }, // B3
        { midi: 62, onset: 6480, duration: 220 }, // D4
      ],
    },
    {
      stepNumber: 26,
      module: 'jazz_l3',
      section: 'B',
      subsection: 'B3: Quartal Voicings',
      activity: 'B3.1: Quartals Through C Dorian (Out of Time)',
      direction:
        'Stacked 4ths, conformed to C Dorian: C–F–B♭, D–G–C, E♭–A–D, F–B♭–E♭, G–C–F, A–D–G, B♭–E♭–A, C–F–B♭.',
      assessment: 'pitch_order',
      tag: 'jazz:l3_quartals_dorian | jazz',
      styleRef: 'l3a',
      successFeedback: 'Each voice steps to the next note of the mode.',
      key: 'C minor',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      chordSymbols: ['Cm7'],
      targetNotes: [
        { midi: 60, onset: 0, duration: 900 }, // C4
        { midi: 65, onset: 0, duration: 900 }, // F4
        { midi: 70, onset: 0, duration: 900 }, // B♭4
        { midi: 62, onset: 960, duration: 900 }, // D4
        { midi: 67, onset: 960, duration: 900 }, // G4
        { midi: 72, onset: 960, duration: 900 }, // C5
        { midi: 63, onset: 1920, duration: 900 }, // E♭4
        { midi: 69, onset: 1920, duration: 900 }, // A4
        { midi: 74, onset: 1920, duration: 900 }, // D5
        { midi: 65, onset: 2880, duration: 900 }, // F4
        { midi: 70, onset: 2880, duration: 900 }, // B♭4
        { midi: 75, onset: 2880, duration: 900 }, // E♭5
        { midi: 67, onset: 3840, duration: 900 }, // G4
        { midi: 72, onset: 3840, duration: 900 }, // C5
        { midi: 77, onset: 3840, duration: 900 }, // F5
        { midi: 69, onset: 4800, duration: 900 }, // A4
        { midi: 74, onset: 4800, duration: 900 }, // D5
        { midi: 79, onset: 4800, duration: 900 }, // G5
        { midi: 70, onset: 5760, duration: 900 }, // B♭4
        { midi: 75, onset: 5760, duration: 900 }, // E♭5
        { midi: 81, onset: 5760, duration: 900 }, // A5
        { midi: 72, onset: 6720, duration: 900 }, // C5
        { midi: 77, onset: 6720, duration: 900 }, // F5
        { midi: 82, onset: 6720, duration: 900 }, // B♭5
      ],
    },
    {
      stepNumber: 27,
      module: 'jazz_l3',
      section: 'B',
      subsection: 'B3: Quartal Voicings',
      activity: 'B3.2: Play-Along — Quartals over Cm7',
      direction:
        'The bass stays on C while your 4ths climb the mode and come back, a shape every half note.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_quartals_play | jazz',
      styleRef: 'l3a',
      successFeedback: 'The chords move over the top — tension and release.',
      key: 'C minor',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      chordSymbols: ['Cm7', 'Cm7', 'Cm7', 'Cm7'],
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 60, onset: 0, duration: 940 }, // C4
        { midi: 65, onset: 0, duration: 940 }, // F4
        { midi: 70, onset: 0, duration: 940 }, // B♭4
        { midi: 62, onset: 960, duration: 940 }, // D4
        { midi: 67, onset: 960, duration: 940 }, // G4
        { midi: 72, onset: 960, duration: 940 }, // C5
        { midi: 63, onset: 1920, duration: 940 }, // E♭4
        { midi: 69, onset: 1920, duration: 940 }, // A4
        { midi: 74, onset: 1920, duration: 940 }, // D5
        { midi: 65, onset: 2880, duration: 940 }, // F4
        { midi: 70, onset: 2880, duration: 940 }, // B♭4
        { midi: 75, onset: 2880, duration: 940 }, // E♭5
        { midi: 67, onset: 3840, duration: 940 }, // G4
        { midi: 72, onset: 3840, duration: 940 }, // C5
        { midi: 77, onset: 3840, duration: 940 }, // F5
        { midi: 65, onset: 4800, duration: 940 }, // F4
        { midi: 70, onset: 4800, duration: 940 }, // B♭4
        { midi: 75, onset: 4800, duration: 940 }, // E♭5
        { midi: 63, onset: 5760, duration: 940 }, // E♭4
        { midi: 69, onset: 5760, duration: 940 }, // A4
        { midi: 74, onset: 5760, duration: 940 }, // D5
        { midi: 62, onset: 6720, duration: 940 }, // D4
        { midi: 67, onset: 6720, duration: 940 }, // G4
        { midi: 72, onset: 6720, duration: 940 }, // C5
      ],
    },
  ],
};

const jazzL3SectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 28,
      module: 'jazz_l3',
      section: 'C',
      subsection: 'C1: Walking, One Chord a Bar',
      activity: 'C1.1: Walking — ii–V–I',
      direction:
        'Four to the bar: the root on 1, passing tones, an approach into the next chord.',
      assessment: 'pitch_order_timing',
      tag: 'jazz:l3_walk_iivi | jazz',
      styleRef: 'l3a',
      successFeedback: 'The walking bass — the heartbeat of swing.',
      chordSymbols: ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      targetNotes: [
        { midi: 38, onset: 0, duration: 460 }, // D2
        { midi: 43, onset: 480, duration: 460 }, // G2
        { midi: 41, onset: 960, duration: 460 }, // F2
        { midi: 45, onset: 1440, duration: 220 }, // A2
        { midi: 44, onset: 1680, duration: 220 }, // A♭2
        { midi: 43, onset: 1920, duration: 460 }, // G2
        { midi: 42, onset: 2400, duration: 460 }, // G♭2
        { midi: 41, onset: 2880, duration: 460 }, // F2
        { midi: 37, onset: 3360, duration: 460 }, // D♭2
        { midi: 36, onset: 3840, duration: 460 }, // C2
        { midi: 45, onset: 4320, duration: 460 }, // A2
        { midi: 43, onset: 4800, duration: 460 }, // G2
        { midi: 37, onset: 5280, duration: 220 }, // D♭2
        { midi: 35, onset: 5520, duration: 220 }, // B1
        { midi: 36, onset: 5760, duration: 460 }, // C2
        { midi: 38, onset: 6240, duration: 460 }, // D2
        { midi: 36, onset: 6720, duration: 460 }, // C2
        { midi: 37, onset: 7200, duration: 460 }, // D♭2
      ],
    },
    {
      stepNumber: 29,
      module: 'jazz_l3',
      section: 'C',
      subsection: 'C1: Walking, One Chord a Bar',
      activity: 'C1.2: Walking — Minor ii–V–i',
      direction: 'The same template over D minor 7♭5 – G7♭9♭13 – C minor 6/9.',
      assessment: 'pitch_order_timing',
      tag: 'jazz:l3_walk_minor | jazz',
      styleRef: 'l3a',
      successFeedback: 'Walking in minor.',
      key: 'C minor',
      chordSymbols: ['Dm7b5', 'G7b9b13', 'Cm6/9', 'Cm6/9'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      targetNotes: [
        { midi: 38, onset: 0, duration: 460 }, // D2
        { midi: 43, onset: 480, duration: 460 }, // G2
        { midi: 41, onset: 960, duration: 460 }, // F2
        { midi: 44, onset: 1440, duration: 220 }, // A♭2
        { midi: 42, onset: 1680, duration: 220 }, // G♭2
        { midi: 43, onset: 1920, duration: 460 }, // G2
        { midi: 42, onset: 2400, duration: 460 }, // G♭2
        { midi: 41, onset: 2880, duration: 460 }, // F2
        { midi: 37, onset: 3360, duration: 460 }, // D♭2
        { midi: 36, onset: 3840, duration: 460 }, // C2
        { midi: 45, onset: 4320, duration: 460 }, // A2
        { midi: 43, onset: 4800, duration: 460 }, // G2
        { midi: 37, onset: 5280, duration: 220 }, // D♭2
        { midi: 35, onset: 5520, duration: 220 }, // B1
        { midi: 36, onset: 5760, duration: 460 }, // C2
        { midi: 38, onset: 6240, duration: 460 }, // D2
        { midi: 36, onset: 6720, duration: 460 }, // C2
        { midi: 37, onset: 7200, duration: 460 }, // D♭2
      ],
    },
    {
      stepNumber: 30,
      module: 'jazz_l3',
      section: 'C',
      subsection: 'C1: Walking, One Chord a Bar',
      activity: 'C1.3: Walking — the Jazz Blues',
      direction:
        'Twelve bars, with two chords in bars 4 and 8: walk to the new root on beat 3.',
      assessment: 'pitch_order_timing',
      tag: 'jazz:l3_walk_blues | jazz',
      styleRef: 'l3a',
      successFeedback: 'A whole chorus of walking bass.',
      chordSymbols: [
        'C13',
        'C13',
        'C13',
        'C13',
        'C13',
        'C13',
        'Gm9',
        'C13',
        'F9',
        'F9',
        'F9',
        'F9',
        'C13',
        'C13',
        'C13',
        'A7b9',
        'Dm9',
        'Dm9',
        'G13',
        'G13',
        'C9',
        'C9',
        'C9',
        'C9',
      ],
      chordsPerBar: 2,
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      targetNotes: [
        { midi: 36, onset: 0, duration: 460 }, // C2
        { midi: 38, onset: 480, duration: 460 }, // D2
        { midi: 40, onset: 960, duration: 460 }, // E2
        { midi: 43, onset: 1440, duration: 220 }, // G2
        { midi: 37, onset: 1680, duration: 220 }, // D♭2
        { midi: 36, onset: 1920, duration: 460 }, // C2
        { midi: 38, onset: 2400, duration: 460 }, // D2
        { midi: 40, onset: 2880, duration: 460 }, // E2
        { midi: 37, onset: 3360, duration: 460 }, // D♭2
        { midi: 36, onset: 3840, duration: 460 }, // C2
        { midi: 45, onset: 4320, duration: 460 }, // A2
        { midi: 43, onset: 4800, duration: 460 }, // G2
        { midi: 38, onset: 5280, duration: 220 }, // D2
        { midi: 32, onset: 5520, duration: 220 }, // A♭1
        { midi: 31, onset: 5760, duration: 460 }, // G1
        { midi: 35, onset: 6240, duration: 460 }, // B1
        { midi: 36, onset: 6720, duration: 460 }, // C2
        { midi: 40, onset: 7200, duration: 460 }, // E2
        { midi: 41, onset: 7680, duration: 460 }, // F2
        { midi: 46, onset: 8160, duration: 460 }, // B♭2
        { midi: 45, onset: 8640, duration: 460 }, // A2
        { midi: 48, onset: 9120, duration: 220 }, // C3
        { midi: 40, onset: 9360, duration: 220 }, // E2
        { midi: 41, onset: 9600, duration: 460 }, // F2
        { midi: 40, onset: 10080, duration: 460 }, // E2
        { midi: 41, onset: 10560, duration: 460 }, // F2
        { midi: 37, onset: 11040, duration: 460 }, // D♭2
        { midi: 36, onset: 11520, duration: 460 }, // C2
        { midi: 45, onset: 12000, duration: 460 }, // A2
        { midi: 43, onset: 12480, duration: 460 }, // G2
        { midi: 37, onset: 12960, duration: 220 }, // D♭2
        { midi: 35, onset: 13200, duration: 220 }, // B1
        { midi: 36, onset: 13440, duration: 460 }, // C2
        { midi: 34, onset: 13920, duration: 460 }, // B♭1
        { midi: 33, onset: 14400, duration: 460 }, // A1
        { midi: 37, onset: 14880, duration: 460 }, // D♭2
        { midi: 38, onset: 15360, duration: 460 }, // D2
        { midi: 40, onset: 15840, duration: 460 }, // E2
        { midi: 41, onset: 16320, duration: 460 }, // F2
        { midi: 45, onset: 16800, duration: 220 }, // A2
        { midi: 44, onset: 17040, duration: 220 }, // A♭2
        { midi: 43, onset: 17280, duration: 460 }, // G2
        { midi: 45, onset: 17760, duration: 460 }, // A2
        { midi: 41, onset: 18240, duration: 460 }, // F2
        { midi: 37, onset: 18720, duration: 460 }, // D♭2
        { midi: 36, onset: 19200, duration: 460 }, // C2
        { midi: 45, onset: 19680, duration: 460 }, // A2
        { midi: 43, onset: 20160, duration: 460 }, // G2
        { midi: 37, onset: 20640, duration: 220 }, // D♭2
        { midi: 38, onset: 20880, duration: 220 }, // D2
        { midi: 36, onset: 21120, duration: 460 }, // C2
        { midi: 33, onset: 21600, duration: 460 }, // A1
        { midi: 36, onset: 22080, duration: 460 }, // C2
        { midi: 35, onset: 22560, duration: 460 }, // B1
      ],
    },
    {
      stepNumber: 31,
      module: 'jazz_l3',
      section: 'C',
      subsection: 'C1: Walking, One Chord a Bar',
      activity: 'C1.4: Bass Play-Along — Walking ii–V–I',
      direction: 'The walking line under the piano and drums.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_walk_play | jazz',
      styleRef: 'l3a',
      successFeedback: 'Walking with a band.',
      chordSymbols: ['Dm9', 'G13', 'Cmaj9', 'Cmaj9'],
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 38, onset: 0, duration: 460 }, // D2
        { midi: 43, onset: 480, duration: 460 }, // G2
        { midi: 41, onset: 960, duration: 460 }, // F2
        { midi: 45, onset: 1440, duration: 220 }, // A2
        { midi: 44, onset: 1680, duration: 220 }, // A♭2
        { midi: 43, onset: 1920, duration: 460 }, // G2
        { midi: 42, onset: 2400, duration: 460 }, // G♭2
        { midi: 41, onset: 2880, duration: 460 }, // F2
        { midi: 37, onset: 3360, duration: 460 }, // D♭2
        { midi: 36, onset: 3840, duration: 460 }, // C2
        { midi: 45, onset: 4320, duration: 460 }, // A2
        { midi: 43, onset: 4800, duration: 460 }, // G2
        { midi: 37, onset: 5280, duration: 220 }, // D♭2
        { midi: 35, onset: 5520, duration: 220 }, // B1
        { midi: 36, onset: 5760, duration: 460 }, // C2
        { midi: 38, onset: 6240, duration: 460 }, // D2
        { midi: 36, onset: 6720, duration: 460 }, // C2
        { midi: 37, onset: 7200, duration: 460 }, // D♭2
      ],
    },
    {
      stepNumber: 32,
      module: 'jazz_l3',
      section: 'C',
      subsection: 'C2: Walking, Two Chords a Bar',
      activity: 'C2.1: Walking — I–VI–ii–V',
      direction: 'Two chords a bar: a root on 1 and on 3, an approach between.',
      assessment: 'pitch_order_timing',
      tag: 'jazz:l3_walk_2 | jazz',
      styleRef: 'l3a',
      successFeedback: 'Two roots a bar — the turnaround.',
      chordSymbols: ['Cmaj7', 'A7', 'Dm7', 'G7', 'Cmaj7', 'A7', 'Dm7', 'G7'],
      chordsPerBar: 2,
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      targetNotes: [
        { midi: 36, onset: 0, duration: 460 }, // C2
        { midi: 34, onset: 480, duration: 460 }, // B♭1
        { midi: 33, onset: 960, duration: 460 }, // A1
        { midi: 40, onset: 1440, duration: 220 }, // E2
        { midi: 39, onset: 1680, duration: 220 }, // E♭2
        { midi: 38, onset: 1920, duration: 460 }, // D2
        { midi: 42, onset: 2400, duration: 460 }, // G♭2
        { midi: 43, onset: 2880, duration: 460 }, // G2
        { midi: 37, onset: 3360, duration: 460 }, // D♭2
        { midi: 36, onset: 3840, duration: 460 }, // C2
        { midi: 34, onset: 4320, duration: 460 }, // B♭1
        { midi: 33, onset: 4800, duration: 460 }, // A1
        { midi: 40, onset: 5280, duration: 460 }, // E2
        { midi: 38, onset: 5760, duration: 460 }, // D2
        { midi: 42, onset: 6240, duration: 460 }, // G♭2
        { midi: 43, onset: 6720, duration: 460 }, // G2
        { midi: 37, onset: 7200, duration: 460 }, // D♭2
      ],
    },
    {
      stepNumber: 33,
      module: 'jazz_l3',
      section: 'C',
      subsection: 'C2: Walking, Two Chords a Bar',
      activity: 'C2.2: Bass Play-Along — I–VI–ii–V',
      direction: 'The turnaround under the band.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_walk_2_play | jazz',
      styleRef: 'l3a',
      successFeedback: 'Turnarounds, walked.',
      chordSymbols: [
        'Cmaj9',
        'A7b9',
        'Dm9',
        'G13',
        'Cmaj9',
        'A7b9',
        'Dm9',
        'G13',
      ],
      chordsPerBar: 2,
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 36, onset: 0, duration: 460 }, // C2
        { midi: 34, onset: 480, duration: 460 }, // B♭1
        { midi: 33, onset: 960, duration: 460 }, // A1
        { midi: 40, onset: 1440, duration: 220 }, // E2
        { midi: 39, onset: 1680, duration: 220 }, // E♭2
        { midi: 38, onset: 1920, duration: 460 }, // D2
        { midi: 42, onset: 2400, duration: 460 }, // G♭2
        { midi: 43, onset: 2880, duration: 460 }, // G2
        { midi: 37, onset: 3360, duration: 460 }, // D♭2
        { midi: 36, onset: 3840, duration: 460 }, // C2
        { midi: 34, onset: 4320, duration: 460 }, // B♭1
        { midi: 33, onset: 4800, duration: 460 }, // A1
        { midi: 40, onset: 5280, duration: 460 }, // E2
        { midi: 38, onset: 5760, duration: 460 }, // D2
        { midi: 42, onset: 6240, duration: 460 }, // G♭2
        { midi: 43, onset: 6720, duration: 460 }, // G2
        { midi: 37, onset: 7200, duration: 460 }, // D♭2
      ],
    },
    {
      stepNumber: 34,
      module: 'jazz_l3',
      section: 'C',
      subsection: 'C3: Waltz Walk',
      activity: 'C3.1: Waltz Walk — ii–V–I',
      direction: 'Walking in three: root, passing tone, approach.',
      assessment: 'pitch_order_timing',
      tag: 'jazz:l3_walk_waltz | jazz',
      styleRef: 'l3a',
      successFeedback: 'Jazz waltz bass.',
      chordSymbols: ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'],
      timeSignature: [3, 4],
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      targetNotes: [
        { midi: 38, onset: 0, duration: 700 }, // D2
        { midi: 45, onset: 720, duration: 460 }, // A2
        { midi: 50, onset: 1200, duration: 220 }, // D3
        { midi: 43, onset: 1440, duration: 940 }, // G2
        { midi: 37, onset: 2400, duration: 460 }, // D♭2
        { midi: 36, onset: 2880, duration: 460 }, // C2
        { midi: 40, onset: 3360, duration: 460 }, // E2
        { midi: 43, onset: 3840, duration: 460 }, // G2
        { midi: 36, onset: 4320, duration: 460 }, // C2
        { midi: 31, onset: 4800, duration: 460 }, // G1
        { midi: 37, onset: 5280, duration: 460 }, // D♭2
      ],
    },
  ],
};

const jazzL3SectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 35,
      module: 'jazz_l3',
      section: 'D',
      subsection: 'D1: RH Voicings, LH Bass',
      activity: 'D1.1: LH Roots + RH Rootless A — the Jazz Blues (Play-Along)',
      direction:
        'Left hand the roots; right hand rootless A through the jazz blues, two chords in bars 4 and 8.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_perf_rootless_blues | jazz',
      styleRef: 'l3a',
      successFeedback: 'A jazz blues, rootless, over your own bass.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      chordSymbols: [
        'C13',
        'C13',
        'C13',
        'C13',
        'C13',
        'C13',
        'Gm9',
        'C13',
        'F9',
        'F9',
        'F9',
        'F9',
        'C13',
        'C13',
        'C13',
        'A7b9',
        'Dm9',
        'Dm9',
        'G13',
        'G13',
        'C9',
        'C9',
        'C9',
        'C9',
      ],
      chordsPerBar: 2,
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 36, onset: 0, duration: 1860, hand: 'lh' }, // C2
        { midi: 36, onset: 1920, duration: 1860, hand: 'lh' }, // C2
        { midi: 36, onset: 3840, duration: 1860, hand: 'lh' }, // C2
        { midi: 43, onset: 5760, duration: 940, hand: 'lh' }, // G2
        { midi: 36, onset: 6720, duration: 940, hand: 'lh' }, // C2
        { midi: 41, onset: 7680, duration: 1860, hand: 'lh' }, // F2
        { midi: 41, onset: 9600, duration: 1860, hand: 'lh' }, // F2
        { midi: 36, onset: 11520, duration: 1860, hand: 'lh' }, // C2
        { midi: 36, onset: 13440, duration: 940, hand: 'lh' }, // C2
        { midi: 45, onset: 14400, duration: 940, hand: 'lh' }, // A2
        { midi: 38, onset: 15360, duration: 1860, hand: 'lh' }, // D2
        { midi: 43, onset: 17280, duration: 1860, hand: 'lh' }, // G2
        { midi: 36, onset: 19200, duration: 1860, hand: 'lh' }, // C2
        { midi: 36, onset: 21120, duration: 1860, hand: 'lh' }, // C2
        { midi: 58, onset: 0, duration: 1860, hand: 'rh' }, // B♭3
        { midi: 62, onset: 0, duration: 1860, hand: 'rh' }, // D4
        { midi: 64, onset: 0, duration: 1860, hand: 'rh' }, // E4
        { midi: 69, onset: 0, duration: 1860, hand: 'rh' }, // A4
        { midi: 58, onset: 1920, duration: 1860, hand: 'rh' }, // B♭3
        { midi: 62, onset: 1920, duration: 1860, hand: 'rh' }, // D4
        { midi: 64, onset: 1920, duration: 1860, hand: 'rh' }, // E4
        { midi: 69, onset: 1920, duration: 1860, hand: 'rh' }, // A4
        { midi: 58, onset: 3840, duration: 1860, hand: 'rh' }, // B♭3
        { midi: 62, onset: 3840, duration: 1860, hand: 'rh' }, // D4
        { midi: 64, onset: 3840, duration: 1860, hand: 'rh' }, // E4
        { midi: 69, onset: 3840, duration: 1860, hand: 'rh' }, // A4
        { midi: 58, onset: 5760, duration: 940, hand: 'rh' }, // B♭3
        { midi: 62, onset: 5760, duration: 940, hand: 'rh' }, // D4
        { midi: 65, onset: 5760, duration: 940, hand: 'rh' }, // F4
        { midi: 69, onset: 5760, duration: 940, hand: 'rh' }, // A4
        { midi: 58, onset: 6720, duration: 940, hand: 'rh' }, // B♭3
        { midi: 62, onset: 6720, duration: 940, hand: 'rh' }, // D4
        { midi: 64, onset: 6720, duration: 940, hand: 'rh' }, // E4
        { midi: 69, onset: 6720, duration: 940, hand: 'rh' }, // A4
        { midi: 57, onset: 7680, duration: 1860, hand: 'rh' }, // A3
        { midi: 60, onset: 7680, duration: 1860, hand: 'rh' }, // C4
        { midi: 63, onset: 7680, duration: 1860, hand: 'rh' }, // E♭4
        { midi: 67, onset: 7680, duration: 1860, hand: 'rh' }, // G4
        { midi: 57, onset: 9600, duration: 1860, hand: 'rh' }, // A3
        { midi: 60, onset: 9600, duration: 1860, hand: 'rh' }, // C4
        { midi: 63, onset: 9600, duration: 1860, hand: 'rh' }, // E♭4
        { midi: 67, onset: 9600, duration: 1860, hand: 'rh' }, // G4
        { midi: 58, onset: 11520, duration: 1860, hand: 'rh' }, // B♭3
        { midi: 62, onset: 11520, duration: 1860, hand: 'rh' }, // D4
        { midi: 64, onset: 11520, duration: 1860, hand: 'rh' }, // E4
        { midi: 69, onset: 11520, duration: 1860, hand: 'rh' }, // A4
        { midi: 58, onset: 13440, duration: 940, hand: 'rh' }, // B♭3
        { midi: 62, onset: 13440, duration: 940, hand: 'rh' }, // D4
        { midi: 64, onset: 13440, duration: 940, hand: 'rh' }, // E4
        { midi: 69, onset: 13440, duration: 940, hand: 'rh' }, // A4
        { midi: 55, onset: 14400, duration: 940, hand: 'rh' }, // G3
        { midi: 58, onset: 14400, duration: 940, hand: 'rh' }, // B♭3
        { midi: 61, onset: 14400, duration: 940, hand: 'rh' }, // C♯4
        { midi: 64, onset: 14400, duration: 940, hand: 'rh' }, // E4
        { midi: 53, onset: 15360, duration: 1860, hand: 'rh' }, // F3
        { midi: 57, onset: 15360, duration: 1860, hand: 'rh' }, // A3
        { midi: 60, onset: 15360, duration: 1860, hand: 'rh' }, // C4
        { midi: 64, onset: 15360, duration: 1860, hand: 'rh' }, // E4
        { midi: 53, onset: 17280, duration: 1860, hand: 'rh' }, // F3
        { midi: 57, onset: 17280, duration: 1860, hand: 'rh' }, // A3
        { midi: 59, onset: 17280, duration: 1860, hand: 'rh' }, // B3
        { midi: 64, onset: 17280, duration: 1860, hand: 'rh' }, // E4
        { midi: 52, onset: 19200, duration: 1860, hand: 'rh' }, // E3
        { midi: 55, onset: 19200, duration: 1860, hand: 'rh' }, // G3
        { midi: 58, onset: 19200, duration: 1860, hand: 'rh' }, // B♭3
        { midi: 62, onset: 19200, duration: 1860, hand: 'rh' }, // D4
        { midi: 52, onset: 21120, duration: 1860, hand: 'rh' }, // E3
        { midi: 55, onset: 21120, duration: 1860, hand: 'rh' }, // G3
        { midi: 58, onset: 21120, duration: 1860, hand: 'rh' }, // B♭3
        { midi: 62, onset: 21120, duration: 1860, hand: 'rh' }, // D4
      ],
    },
    {
      stepNumber: 36,
      module: 'jazz_l3',
      section: 'D',
      subsection: 'D1: RH Voicings, LH Bass',
      activity: 'D1.2: LH Walking + RH 3-7-9 — ii–V–I (Play-Along)',
      direction:
        'Left hand walks; right hand the 3-7-9 area code an octave up, so the hands stay apart.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_perf_walk_379 | jazz',
      styleRef: 'l3a',
      successFeedback: 'Walking and comping at once.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      chordSymbols: ['Dm9', 'G13', 'Cmaj9', 'Cmaj9'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 38, onset: 0, duration: 460, hand: 'lh' }, // D2
        { midi: 43, onset: 480, duration: 460, hand: 'lh' }, // G2
        { midi: 41, onset: 960, duration: 460, hand: 'lh' }, // F2
        { midi: 45, onset: 1440, duration: 220, hand: 'lh' }, // A2
        { midi: 44, onset: 1680, duration: 220, hand: 'lh' }, // A♭2
        { midi: 43, onset: 1920, duration: 460, hand: 'lh' }, // G2
        { midi: 42, onset: 2400, duration: 460, hand: 'lh' }, // G♭2
        { midi: 41, onset: 2880, duration: 460, hand: 'lh' }, // F2
        { midi: 37, onset: 3360, duration: 460, hand: 'lh' }, // D♭2
        { midi: 36, onset: 3840, duration: 460, hand: 'lh' }, // C2
        { midi: 45, onset: 4320, duration: 460, hand: 'lh' }, // A2
        { midi: 43, onset: 4800, duration: 460, hand: 'lh' }, // G2
        { midi: 37, onset: 5280, duration: 220, hand: 'lh' }, // D♭2
        { midi: 35, onset: 5520, duration: 220, hand: 'lh' }, // B1
        { midi: 36, onset: 5760, duration: 460, hand: 'lh' }, // C2
        { midi: 38, onset: 6240, duration: 460, hand: 'lh' }, // D2
        { midi: 36, onset: 6720, duration: 460, hand: 'lh' }, // C2
        { midi: 37, onset: 7200, duration: 460, hand: 'lh' }, // D♭2
        { midi: 65, onset: 0, duration: 1860, hand: 'rh' }, // F4
        { midi: 72, onset: 0, duration: 1860, hand: 'rh' }, // C5
        { midi: 76, onset: 0, duration: 1860, hand: 'rh' }, // E5
        { midi: 65, onset: 1920, duration: 1860, hand: 'rh' }, // F4
        { midi: 71, onset: 1920, duration: 1860, hand: 'rh' }, // B4
        { midi: 76, onset: 1920, duration: 1860, hand: 'rh' }, // E5
        { midi: 64, onset: 3840, duration: 1860, hand: 'rh' }, // E4
        { midi: 71, onset: 3840, duration: 1860, hand: 'rh' }, // B4
        { midi: 74, onset: 3840, duration: 1860, hand: 'rh' }, // D5
        { midi: 64, onset: 5760, duration: 1860, hand: 'rh' }, // E4
        { midi: 71, onset: 5760, duration: 1860, hand: 'rh' }, // B4
        { midi: 74, onset: 5760, duration: 1860, hand: 'rh' }, // D5
      ],
    },
    {
      stepNumber: 37,
      module: 'jazz_l3',
      section: 'D',
      subsection: 'D2: LH Voicings, RH Lines',
      activity: 'D2.1: LH Rootless A + RH Four-Bar Line 1',
      direction:
        'Left hand rootless A in F; right hand Four-Bar Line 1, an octave up so the hands never cross.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_perf_line_1 | jazz',
      styleRef: 'l3a',
      successFeedback: 'Comping and soloing at once.',
      key: 'F major',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_chords_rh_melody',
        lh_role: 'chords',
        rh_role: 'melody',
        style_ref: 'l3a',
      },
      chordSymbols: ['Gm9', 'C13', 'Fmaj9', 'Fmaj9'],
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords', 'melody'],
      },
      targetNotes: [
        { midi: 58, onset: 0, duration: 1860, hand: 'lh' }, // B♭3
        { midi: 62, onset: 0, duration: 1860, hand: 'lh' }, // D4
        { midi: 65, onset: 0, duration: 1860, hand: 'lh' }, // F4
        { midi: 69, onset: 0, duration: 1860, hand: 'lh' }, // A4
        { midi: 58, onset: 1920, duration: 1860, hand: 'lh' }, // B♭3
        { midi: 62, onset: 1920, duration: 1860, hand: 'lh' }, // D4
        { midi: 64, onset: 1920, duration: 1860, hand: 'lh' }, // E4
        { midi: 69, onset: 1920, duration: 1860, hand: 'lh' }, // A4
        { midi: 57, onset: 3840, duration: 1860, hand: 'lh' }, // A3
        { midi: 60, onset: 3840, duration: 1860, hand: 'lh' }, // C4
        { midi: 64, onset: 3840, duration: 1860, hand: 'lh' }, // E4
        { midi: 67, onset: 3840, duration: 1860, hand: 'lh' }, // G4
        { midi: 57, onset: 5760, duration: 1860, hand: 'lh' }, // A3
        { midi: 60, onset: 5760, duration: 1860, hand: 'lh' }, // C4
        { midi: 64, onset: 5760, duration: 1860, hand: 'lh' }, // E4
        { midi: 67, onset: 5760, duration: 1860, hand: 'lh' }, // G4
        { midi: 81, onset: 1440, duration: 220, hand: 'rh' }, // A5
        { midi: 80, onset: 1680, duration: 220, hand: 'rh' }, // A♭5
        { midi: 79, onset: 1920, duration: 220, hand: 'rh' }, // G5
        { midi: 82, onset: 2160, duration: 220, hand: 'rh' }, // B♭5
        { midi: 86, onset: 2400, duration: 220, hand: 'rh' }, // D6
        { midi: 89, onset: 2640, duration: 220, hand: 'rh' }, // F6
        { midi: 88, onset: 2880, duration: 220, hand: 'rh' }, // E6
        { midi: 86, onset: 3120, duration: 220, hand: 'rh' }, // D6
        { midi: 84, onset: 3360, duration: 220, hand: 'rh' }, // C6
        { midi: 82, onset: 3600, duration: 220, hand: 'rh' }, // B♭5
        { midi: 81, onset: 3840, duration: 1860, hand: 'rh' }, // A5
      ],
    },
    {
      stepNumber: 38,
      module: 'jazz_l3',
      section: 'D',
      subsection: 'D2: LH Voicings, RH Lines',
      activity: 'D2.2: LH Rootless A + RH Four-Bar Line 9',
      direction:
        'The same left hand; right hand Four-Bar Line 9, an octave up.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_perf_line_9 | jazz',
      styleRef: 'l3a',
      successFeedback: 'Another line over the same hands.',
      key: 'F major',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_chords_rh_melody',
        lh_role: 'chords',
        rh_role: 'melody',
        style_ref: 'l3a',
      },
      chordSymbols: ['Gm9', 'C13', 'Fmaj9', 'Fmaj9'],
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords', 'melody'],
      },
      targetNotes: [
        { midi: 58, onset: 0, duration: 1860, hand: 'lh' }, // B♭3
        { midi: 62, onset: 0, duration: 1860, hand: 'lh' }, // D4
        { midi: 65, onset: 0, duration: 1860, hand: 'lh' }, // F4
        { midi: 69, onset: 0, duration: 1860, hand: 'lh' }, // A4
        { midi: 58, onset: 1920, duration: 1860, hand: 'lh' }, // B♭3
        { midi: 62, onset: 1920, duration: 1860, hand: 'lh' }, // D4
        { midi: 64, onset: 1920, duration: 1860, hand: 'lh' }, // E4
        { midi: 69, onset: 1920, duration: 1860, hand: 'lh' }, // A4
        { midi: 57, onset: 3840, duration: 1860, hand: 'lh' }, // A3
        { midi: 60, onset: 3840, duration: 1860, hand: 'lh' }, // C4
        { midi: 64, onset: 3840, duration: 1860, hand: 'lh' }, // E4
        { midi: 67, onset: 3840, duration: 1860, hand: 'lh' }, // G4
        { midi: 57, onset: 5760, duration: 1860, hand: 'lh' }, // A3
        { midi: 60, onset: 5760, duration: 1860, hand: 'lh' }, // C4
        { midi: 64, onset: 5760, duration: 1860, hand: 'lh' }, // E4
        { midi: 67, onset: 5760, duration: 1860, hand: 'lh' }, // G4
        { midi: 82, onset: 720, duration: 220, hand: 'rh' }, // B♭5
        { midi: 81, onset: 960, duration: 220, hand: 'rh' }, // A5
        { midi: 79, onset: 1200, duration: 220, hand: 'rh' }, // G5
        { midi: 78, onset: 1440, duration: 220, hand: 'rh' }, // G♭5
        { midi: 81, onset: 1680, duration: 220, hand: 'rh' }, // A5
        { midi: 79, onset: 1920, duration: 220, hand: 'rh' }, // G5
        { midi: 82, onset: 2160, duration: 220, hand: 'rh' }, // B♭5
        { midi: 86, onset: 2400, duration: 220, hand: 'rh' }, // D6
        { midi: 89, onset: 2640, duration: 220, hand: 'rh' }, // F6
        { midi: 88, onset: 2880, duration: 220, hand: 'rh' }, // E6
        { midi: 86, onset: 3120, duration: 220, hand: 'rh' }, // D6
        { midi: 84, onset: 3360, duration: 220, hand: 'rh' }, // C6
        { midi: 82, onset: 3600, duration: 220, hand: 'rh' }, // B♭5
        { midi: 81, onset: 3840, duration: 1860, hand: 'rh' }, // A5
      ],
    },
    {
      stepNumber: 39,
      module: 'jazz_l3',
      section: 'D',
      subsection: 'D3: Two-Hand Voicings',
      activity: 'D3.1: LH Shells + RH Upper Structures — ii–V–I (Play-Along)',
      direction:
        'Left hand 1-7, 1-3, 1-7; right hand 3-5-9, 7-9-13, 3-5-9: F–A–E, F–A–E, E–G–D.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_perf_two_hand | jazz',
      styleRef: 'l3a',
      successFeedback: 'The full piano sound: shells below, colors above.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'two_hand_comping',
        lh_role: 'chords',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      chordSymbols: ['Dm9', 'G13', 'Cmaj9', 'Cmaj9'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 50, onset: 0, duration: 1860, hand: 'lh' }, // D3
        { midi: 60, onset: 0, duration: 1860, hand: 'lh' }, // C4
        { midi: 55, onset: 1920, duration: 1860, hand: 'lh' }, // G3
        { midi: 59, onset: 1920, duration: 1860, hand: 'lh' }, // B3
        { midi: 48, onset: 3840, duration: 1860, hand: 'lh' }, // C3
        { midi: 59, onset: 3840, duration: 1860, hand: 'lh' }, // B3
        { midi: 48, onset: 5760, duration: 1860, hand: 'lh' }, // C3
        { midi: 59, onset: 5760, duration: 1860, hand: 'lh' }, // B3
        { midi: 65, onset: 0, duration: 1860, hand: 'rh' }, // F4
        { midi: 69, onset: 0, duration: 1860, hand: 'rh' }, // A4
        { midi: 76, onset: 0, duration: 1860, hand: 'rh' }, // E5
        { midi: 65, onset: 1920, duration: 1860, hand: 'rh' }, // F4
        { midi: 69, onset: 1920, duration: 1860, hand: 'rh' }, // A4
        { midi: 76, onset: 1920, duration: 1860, hand: 'rh' }, // E5
        { midi: 64, onset: 3840, duration: 1860, hand: 'rh' }, // E4
        { midi: 67, onset: 3840, duration: 1860, hand: 'rh' }, // G4
        { midi: 74, onset: 3840, duration: 1860, hand: 'rh' }, // D5
        { midi: 64, onset: 5760, duration: 1860, hand: 'rh' }, // E4
        { midi: 67, onset: 5760, duration: 1860, hand: 'rh' }, // G4
        { midi: 74, onset: 5760, duration: 1860, hand: 'rh' }, // D5
      ],
    },
    {
      stepNumber: 40,
      module: 'jazz_l3',
      section: 'D',
      subsection: 'D3: Two-Hand Voicings',
      activity: 'D3.2: Peter’s Quartal ii–V–I #1 (Out of Time)',
      direction:
        'In B♭: right-hand 4ths over left-hand 4ths — Cm7, F7, B♭maj7.',
      assessment: 'pitch_order',
      tag: 'jazz:l3_perf_quartal_iivi | jazz',
      styleRef: 'l3a',
      successFeedback: 'Five-note quartal voicings: the modern sound.',
      key: 'Bb major',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'two_hand_comping',
        lh_role: 'chords',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      chordSymbols: ['Cm11', 'F13', 'Bb6/9'],
      targetNotes: [
        { midi: 48, onset: 0, duration: 1800, hand: 'lh' }, // C3
        { midi: 53, onset: 0, duration: 1800, hand: 'lh' }, // F3
        { midi: 51, onset: 1920, duration: 1800, hand: 'lh' }, // E♭3
        { midi: 57, onset: 1920, duration: 1800, hand: 'lh' }, // A3
        { midi: 50, onset: 3840, duration: 1800, hand: 'lh' }, // D3
        { midi: 55, onset: 3840, duration: 1800, hand: 'lh' }, // G3
        { midi: 58, onset: 0, duration: 1800, hand: 'rh' }, // B♭3
        { midi: 63, onset: 0, duration: 1800, hand: 'rh' }, // E♭4
        { midi: 67, onset: 0, duration: 1800, hand: 'rh' }, // G4
        { midi: 62, onset: 1920, duration: 1800, hand: 'rh' }, // D4
        { midi: 67, onset: 1920, duration: 1800, hand: 'rh' }, // G4
        { midi: 72, onset: 1920, duration: 1800, hand: 'rh' }, // C5
        { midi: 60, onset: 3840, duration: 1800, hand: 'rh' }, // C4
        { midi: 65, onset: 3840, duration: 1800, hand: 'rh' }, // F4
      ],
    },
    {
      stepNumber: 41,
      module: 'jazz_l3',
      section: 'D',
      subsection: 'D3: Two-Hand Voicings',
      activity: 'D3.3: Peter’s Jazz Blues Two-Hand Voicings (Play-Along)',
      direction:
        'In F: left hand 1-♭7, right hand 3-13-1 on the home chords, shells and upper structures through each ii–V.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_perf_f_blues | jazz',
      styleRef: 'l3a',
      successFeedback: 'A whole jazz blues, two hands, as Peter plays it.',
      key: 'F major',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'two_hand_comping',
        lh_role: 'chords',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      chordSymbols: [
        'F13',
        'F13',
        'F13',
        'F13',
        'F13',
        'F13',
        'Cm9',
        'F13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'F13',
        'F13',
        'F13',
        'D7b9',
        'Gm9',
        'Gm9',
        'C13',
        'C13',
        'F13',
        'D7b9',
        'Gm9',
        'C13',
      ],
      chordsPerBar: 2,
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 41, onset: 0, duration: 460, hand: 'lh' }, // F2
        { midi: 51, onset: 0, duration: 460, hand: 'lh' }, // E♭3
        { midi: 41, onset: 1920, duration: 460, hand: 'lh' }, // F2
        { midi: 51, onset: 1920, duration: 460, hand: 'lh' }, // E♭3
        { midi: 41, onset: 3840, duration: 460, hand: 'lh' }, // F2
        { midi: 51, onset: 3840, duration: 460, hand: 'lh' }, // E♭3
        { midi: 48, onset: 5760, duration: 460, hand: 'lh' }, // C3
        { midi: 58, onset: 5760, duration: 460, hand: 'lh' }, // B♭3
        { midi: 53, onset: 6720, duration: 940, hand: 'lh' }, // F3
        { midi: 57, onset: 6720, duration: 940, hand: 'lh' }, // A3
        { midi: 46, onset: 7680, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 7680, duration: 460, hand: 'lh' }, // A♭3
        { midi: 46, onset: 9600, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 9600, duration: 460, hand: 'lh' }, // A♭3
        { midi: 41, onset: 11520, duration: 460, hand: 'lh' }, // F2
        { midi: 51, onset: 11520, duration: 460, hand: 'lh' }, // E♭3
        { midi: 41, onset: 13440, duration: 460, hand: 'lh' }, // F2
        { midi: 51, onset: 13440, duration: 460, hand: 'lh' }, // E♭3
        { midi: 50, onset: 14400, duration: 940, hand: 'lh' }, // D3
        { midi: 54, onset: 14400, duration: 940, hand: 'lh' }, // F♯3
        { midi: 43, onset: 15360, duration: 460, hand: 'lh' }, // G2
        { midi: 53, onset: 15360, duration: 460, hand: 'lh' }, // F3
        { midi: 48, onset: 17280, duration: 460, hand: 'lh' }, // C3
        { midi: 52, onset: 17280, duration: 460, hand: 'lh' }, // E3
        { midi: 41, onset: 19200, duration: 460, hand: 'lh' }, // F2
        { midi: 51, onset: 19200, duration: 460, hand: 'lh' }, // E♭3
        { midi: 50, onset: 20160, duration: 460, hand: 'lh' }, // D3
        { midi: 54, onset: 20160, duration: 460, hand: 'lh' }, // F♯3
        { midi: 43, onset: 21120, duration: 460, hand: 'lh' }, // G2
        { midi: 53, onset: 21120, duration: 460, hand: 'lh' }, // F3
        { midi: 48, onset: 22080, duration: 460, hand: 'lh' }, // C3
        { midi: 52, onset: 22080, duration: 460, hand: 'lh' }, // E3
        { midi: 57, onset: 0, duration: 460, hand: 'rh' }, // A3
        { midi: 62, onset: 0, duration: 460, hand: 'rh' }, // D4
        { midi: 65, onset: 0, duration: 460, hand: 'rh' }, // F4
        { midi: 57, onset: 1920, duration: 460, hand: 'rh' }, // A3
        { midi: 62, onset: 1920, duration: 460, hand: 'rh' }, // D4
        { midi: 65, onset: 1920, duration: 460, hand: 'rh' }, // F4
        { midi: 57, onset: 3840, duration: 460, hand: 'rh' }, // A3
        { midi: 62, onset: 3840, duration: 460, hand: 'rh' }, // D4
        { midi: 65, onset: 3840, duration: 460, hand: 'rh' }, // F4
        { midi: 63, onset: 5760, duration: 460, hand: 'rh' }, // E♭4
        { midi: 67, onset: 5760, duration: 460, hand: 'rh' }, // G4
        { midi: 74, onset: 5760, duration: 460, hand: 'rh' }, // D5
        { midi: 63, onset: 6720, duration: 940, hand: 'rh' }, // E♭4
        { midi: 67, onset: 6720, duration: 940, hand: 'rh' }, // G4
        { midi: 74, onset: 6720, duration: 940, hand: 'rh' }, // D5
        { midi: 62, onset: 7680, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 7680, duration: 460, hand: 'rh' }, // G4
        { midi: 70, onset: 7680, duration: 460, hand: 'rh' }, // B♭4
        { midi: 62, onset: 9600, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 9600, duration: 460, hand: 'rh' }, // G4
        { midi: 70, onset: 9600, duration: 460, hand: 'rh' }, // B♭4
        { midi: 57, onset: 11520, duration: 460, hand: 'rh' }, // A3
        { midi: 62, onset: 11520, duration: 460, hand: 'rh' }, // D4
        { midi: 65, onset: 11520, duration: 460, hand: 'rh' }, // F4
        { midi: 57, onset: 13440, duration: 460, hand: 'rh' }, // A3
        { midi: 62, onset: 13440, duration: 460, hand: 'rh' }, // D4
        { midi: 65, onset: 13440, duration: 460, hand: 'rh' }, // F4
        { midi: 60, onset: 14400, duration: 940, hand: 'rh' }, // C4
        { midi: 63, onset: 14400, duration: 940, hand: 'rh' }, // E♭4
        { midi: 69, onset: 14400, duration: 940, hand: 'rh' }, // A4
        { midi: 58, onset: 15360, duration: 460, hand: 'rh' }, // B♭3
        { midi: 62, onset: 15360, duration: 460, hand: 'rh' }, // D4
        { midi: 69, onset: 15360, duration: 460, hand: 'rh' }, // A4
        { midi: 58, onset: 17280, duration: 460, hand: 'rh' }, // B♭3
        { midi: 62, onset: 17280, duration: 460, hand: 'rh' }, // D4
        { midi: 69, onset: 17280, duration: 460, hand: 'rh' }, // A4
        { midi: 57, onset: 19200, duration: 460, hand: 'rh' }, // A3
        { midi: 62, onset: 19200, duration: 460, hand: 'rh' }, // D4
        { midi: 65, onset: 19200, duration: 460, hand: 'rh' }, // F4
        { midi: 60, onset: 20160, duration: 460, hand: 'rh' }, // C4
        { midi: 63, onset: 20160, duration: 460, hand: 'rh' }, // E♭4
        { midi: 69, onset: 20160, duration: 460, hand: 'rh' }, // A4
        { midi: 58, onset: 21120, duration: 460, hand: 'rh' }, // B♭3
        { midi: 62, onset: 21120, duration: 460, hand: 'rh' }, // D4
        { midi: 69, onset: 21120, duration: 460, hand: 'rh' }, // A4
        { midi: 58, onset: 22080, duration: 460, hand: 'rh' }, // B♭3
        { midi: 62, onset: 22080, duration: 460, hand: 'rh' }, // D4
        { midi: 69, onset: 22080, duration: 460, hand: 'rh' }, // A4
      ],
    },
    {
      stepNumber: 42,
      module: 'jazz_l3',
      section: 'D',
      subsection: 'D3: Two-Hand Voicings',
      activity: 'D3.4: RH Power Chords over LH Rootless — ii–V–I (Play-Along)',
      direction:
        'Left hand the 3-7-9 area code; right hand power chords from each chord’s 5 and 9: A–E–A, A–D–A, G–D–G.',
      assessment: 'pitch_order_timing_duration',
      tag: 'jazz:l3_perf_power | jazz',
      styleRef: 'l3a',
      successFeedback: 'Big and bright: power chords over rootless voicings.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'two_hand_comping',
        lh_role: 'chords',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      chordSymbols: ['Dm9', 'G13', 'Cmaj9', 'Cmaj9'],
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 53, onset: 0, duration: 1860, hand: 'lh' }, // F3
        { midi: 60, onset: 0, duration: 1860, hand: 'lh' }, // C4
        { midi: 64, onset: 0, duration: 1860, hand: 'lh' }, // E4
        { midi: 53, onset: 1920, duration: 1860, hand: 'lh' }, // F3
        { midi: 59, onset: 1920, duration: 1860, hand: 'lh' }, // B3
        { midi: 64, onset: 1920, duration: 1860, hand: 'lh' }, // E4
        { midi: 52, onset: 3840, duration: 1860, hand: 'lh' }, // E3
        { midi: 59, onset: 3840, duration: 1860, hand: 'lh' }, // B3
        { midi: 62, onset: 3840, duration: 1860, hand: 'lh' }, // D4
        { midi: 52, onset: 5760, duration: 1860, hand: 'lh' }, // E3
        { midi: 59, onset: 5760, duration: 1860, hand: 'lh' }, // B3
        { midi: 62, onset: 5760, duration: 1860, hand: 'lh' }, // D4
        { midi: 69, onset: 0, duration: 1860, hand: 'rh' }, // A4
        { midi: 76, onset: 0, duration: 1860, hand: 'rh' }, // E5
        { midi: 81, onset: 0, duration: 1860, hand: 'rh' }, // A5
        { midi: 69, onset: 1920, duration: 1860, hand: 'rh' }, // A4
        { midi: 74, onset: 1920, duration: 1860, hand: 'rh' }, // D5
        { midi: 81, onset: 1920, duration: 1860, hand: 'rh' }, // A5
        { midi: 67, onset: 3840, duration: 1860, hand: 'rh' }, // G4
        { midi: 74, onset: 3840, duration: 1860, hand: 'rh' }, // D5
        { midi: 79, onset: 3840, duration: 1860, hand: 'rh' }, // G5
        { midi: 67, onset: 5760, duration: 1860, hand: 'rh' }, // G4
        { midi: 74, onset: 5760, duration: 1860, hand: 'rh' }, // D5
        { midi: 79, onset: 5760, duration: 1860, hand: 'rh' }, // G5
      ],
    },
  ],
};

export const jazzL1: ActivityFlowV2 = {
  genre: 'jazz',
  level: 1,
  version: 'v2',
  title: 'Jazz Foundations',
  params: {
    defaultKey: 'C major',
    defaultScale: [0, 2, 4, 5, 7, 9, 11],
    defaultScaleId: 'ionian',
    // Steps name their own tempo and swing (8th notes, swing.ts).
    tempoRange: [90, 100] as [number, number],
    swing: 0,
    grooves: [],
  },
  sections: [jazzL1SectionA, jazzL1SectionB, jazzL1SectionC, jazzL1SectionD],
};
export const jazzL2: ActivityFlowV2 = {
  genre: 'jazz',
  level: 2,
  version: 'v2',
  title: 'Color & Transfer',
  params: {
    defaultKey: 'C major',
    defaultScale: [0, 2, 4, 5, 7, 9, 11],
    defaultScaleId: 'ionian',
    // Steps name their own tempo and swing (8th notes, swing.ts).
    tempoRange: [100, 110] as [number, number],
    swing: 0,
    grooves: [],
  },
  sections: [jazzL2SectionA, jazzL2SectionB, jazzL2SectionC, jazzL2SectionD],
};
export const jazzL3: ActivityFlowV2 = {
  genre: 'jazz',
  level: 3,
  version: 'v2',
  title: 'The ii–V–I',
  params: {
    defaultKey: 'C major',
    defaultScale: [0, 2, 4, 5, 7, 9, 11],
    defaultScaleId: 'ionian',
    // Steps name their own tempo and swing (8th notes, swing.ts).
    tempoRange: [100, 120] as [number, number],
    swing: 0,
    grooves: [],
  },
  sections: [jazzL3SectionA, jazzL3SectionB, jazzL3SectionC, jazzL3SectionD],
};
export const jazzFlows = [jazzL1, jazzL2, jazzL3] as const;
