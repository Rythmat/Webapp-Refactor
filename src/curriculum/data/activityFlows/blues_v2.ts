/**
 * Blues v2 — Activity Flows.
 *
 * Built from Peter's ICP Studio blues material (BLUES-LEVELS-FOR-MUSIC-ATLAS):
 * his phrases, bass templates and voicing systems, note for note, moved to
 * the Blues keys he chose (C, E and G, with F and B♭ shared with Jazz).
 *
 * - L1 "Shuffle Blues" (C, G) — lesson style blues-l1-shuffle, the triplet
 *   Blues Shuffle: Blues Language phrases over C7, one phrase a step;
 *   B.B. King–style phrases in G (drafts: ICP has no B.B. King material); the
 *   G minor blues lines; the I–IV triad pair; 1-7 and 1-3-7 shells; roots and
 *   the boogie line; both 8-bar blues forms (drafts for Peter to confirm).
 * - L2 "The 12-Bar Blues" (E, G; C Jam Blues in C) — two styles: phrases,
 *   triad pairs and the boogie on the 4/4 Blues Shuffle (l2a,
 *   blues-l2-shuffle); the half-time shuffle bass, 7-3-5 / 3-7-9 and rootless A
 *   over the Purdie Shuffle in 12/8 (l2b, blues-l2-half-time).
 * - L3 "Jazz Blues" (F, B♭; tunes in C, F, B♭) — lesson style
 *   blues-l3-jazz-blues, Jazz Swing: blues phrases in F, ii–V lines into the
 *   IV and four-bar lines home, a whole chorus; shells, rootless A and B;
 *   two-feel and walking; Peter's two-hand system, and comping seven blues
 *   heads over their changes (the heads themselves are not included).
 *
 * The shuffle swings eighths at ICP's full 2:1 (swing 67, swingUnit '8n');
 * Jazz Swing eases as ICP plays lines (swing 64 at 120); 12/8 plays straight
 * (meter.ts) at 100 dotted quarters a minute (tempo 150). Two chords in a bar
 * are `chordsPerBar: 2`. Blues Band 1 plays under them; a step's chart picks
 * its variation (lessonPairings). Drafts, adaptations and moved keys are
 * listed for Peter's review in blues-L1/L2/L3-outline.md.
 */

import type {
  ActivityFlowV2,
  ActivitySectionV2,
} from '../../types/activity.v2';

// ── L1: Shuffle Blues ──

const bluesL1SectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    {
      stepNumber: 1,
      module: 'blues_l1',
      section: 'A',
      subsection: 'A1: Scale (C Major Blues)',
      activity: 'A1.1: C Major Blues Ascending (Out of Time)',
      direction: 'C–D–E♭–E–G–A–C: the major pentatonic with the ♭3 added.',
      assessment: 'pitch_order',
      tag: 'blues:l1_major_blues_asc_oot | blues',
      styleRef: 'l1a',
      successFeedback: 'E♭ to E: the bend at the heart of B.B. King’s sound.',
      key: 'C major',
      scaleIntervals: [0, 2, 3, 4, 7, 9],
      scaleId: 'major_blues',
      targetNotes: [
        { midi: 60, onset: 0, duration: 460 }, // C4
        { midi: 62, onset: 480, duration: 460 }, // D4
        { midi: 63, onset: 960, duration: 460 }, // E♭4
        { midi: 64, onset: 1440, duration: 460 }, // E4
        { midi: 67, onset: 1920, duration: 460 }, // G4
        { midi: 69, onset: 2400, duration: 460 }, // A4
        { midi: 72, onset: 2880, duration: 460 }, // C5
      ],
    },
    {
      stepNumber: 2,
      module: 'blues_l1',
      section: 'A',
      subsection: 'A1: Scale (C Major Blues)',
      activity: 'A1.2: C Major Blues Descending (Out of Time)',
      direction: 'Now back down from the top C, through E and E♭.',
      assessment: 'pitch_order',
      tag: 'blues:l1_major_blues_desc_oot | blues',
      styleRef: 'l1a',
      successFeedback: 'Down through the blue note.',
      key: 'C major',
      scaleIntervals: [0, 2, 3, 4, 7, 9],
      scaleId: 'major_blues',
      targetNotes: [
        { midi: 72, onset: 0, duration: 460 }, // C5
        { midi: 69, onset: 480, duration: 460 }, // A4
        { midi: 67, onset: 960, duration: 460 }, // G4
        { midi: 64, onset: 1440, duration: 460 }, // E4
        { midi: 63, onset: 1920, duration: 460 }, // E♭4
        { midi: 62, onset: 2400, duration: 460 }, // D4
        { midi: 60, onset: 2880, duration: 460 }, // C4
      ],
    },
    {
      stepNumber: 3,
      module: 'blues_l1',
      section: 'A',
      subsection: 'A1: Scale (C Major Blues)',
      activity: 'A1.3: C Major Blues — Up & Down in Shuffled Eighths (In Time)',
      direction: 'Up and down in shuffled eighths: long, short, long, short.',
      assessment: 'pitch_order_timing',
      tag: 'blues:l1_major_blues_updown_it | blues',
      styleRef: 'l1a',
      successFeedback: 'The major blues scale, with a shuffle.',
      key: 'C major',
      scaleIntervals: [0, 2, 3, 4, 7, 9],
      scaleId: 'major_blues',
      tempo: 90,
      swing: 67,
      swingUnit: '8n',
      targetNotes: [
        { midi: 60, onset: 0, duration: 220 }, // C4
        { midi: 62, onset: 240, duration: 220 }, // D4
        { midi: 63, onset: 480, duration: 220 }, // E♭4
        { midi: 64, onset: 720, duration: 220 }, // E4
        { midi: 67, onset: 960, duration: 220 }, // G4
        { midi: 69, onset: 1200, duration: 220 }, // A4
        { midi: 72, onset: 1440, duration: 220 }, // C5
        { midi: 69, onset: 1680, duration: 220 }, // A4
        { midi: 67, onset: 1920, duration: 220 }, // G4
        { midi: 64, onset: 2160, duration: 220 }, // E4
        { midi: 63, onset: 2400, duration: 220 }, // E♭4
        { midi: 62, onset: 2640, duration: 220 }, // D4
        { midi: 60, onset: 2880, duration: 220 }, // C4
      ],
    },
    {
      stepNumber: 4,
      module: 'blues_l1',
      section: 'A',
      subsection: 'A2: Blues Phrases over C7',
      activity: 'A2.1: Blues Phrase 1',
      direction:
        'D♯, E, D♯, E — the blue note rubbing against the 3 — then down to C.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_phrase_1 | blues',
      styleRef: 'l1a',
      successFeedback: 'The ♯9 and the 3: the sound of the blues over C7.',
      key: 'C major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 10],
      scaleId: 'mixolydian',
      chordSymbols: ['C7'],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 75, onset: 0, duration: 220 }, // D♯5
        { midi: 76, onset: 240, duration: 220 }, // E5
        { midi: 75, onset: 480, duration: 220 }, // D♯5
        { midi: 76, onset: 720, duration: 220 }, // E5
        { midi: 72, onset: 960, duration: 940 }, // C5
      ],
    },
    {
      stepNumber: 5,
      module: 'blues_l1',
      section: 'A',
      subsection: 'A2: Blues Phrases over C7',
      activity: 'A2.2: Blues Phrase 2',
      direction: 'F, G, then D♯ up to E and down to C.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_phrase_2 | blues',
      styleRef: 'l1a',
      successFeedback: 'Up to the 5, down through the blue note home.',
      key: 'C major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 10],
      scaleId: 'mixolydian',
      chordSymbols: ['C7'],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 65, onset: 0, duration: 220 }, // F4
        { midi: 67, onset: 240, duration: 220 }, // G4
        { midi: 63, onset: 480, duration: 220 }, // D♯4
        { midi: 64, onset: 720, duration: 220 }, // E4
        { midi: 60, onset: 960, duration: 940 }, // C4
      ],
    },
    {
      stepNumber: 6,
      module: 'blues_l1',
      section: 'A',
      subsection: 'A2: Blues Phrases over C7',
      activity: 'A2.3: Blues Phrase 3',
      direction:
        'B♭, A, G, F down the scale, then a quick D♯ grace note into E.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_phrase_3 | blues',
      styleRef: 'l1a',
      successFeedback: 'The ♭7 walking down to the 3.',
      key: 'C major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 10],
      scaleId: 'mixolydian',
      chordSymbols: ['C7'],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 70, onset: 0, duration: 220 }, // B♭4
        { midi: 69, onset: 240, duration: 220 }, // A4
        { midi: 67, onset: 480, duration: 220 }, // G4
        { midi: 65, onset: 720, duration: 220 }, // F4
        { midi: 63, onset: 960, duration: 50 }, // D♯4
        { midi: 64, onset: 1020, duration: 880 }, // E4
      ],
    },
    {
      stepNumber: 7,
      module: 'blues_l1',
      section: 'A',
      subsection: 'A2: Blues Phrases over C7',
      activity: 'A2.4: Blues Phrase 4',
      direction: 'A quick triplet E♭–D–C, then D, A and C.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_phrase_4 | blues',
      styleRef: 'l1a',
      successFeedback: 'Triplet, then the 6: a jazzy turn.',
      key: 'C major',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      chordSymbols: ['C7'],
      tempo: 100,
      swing: 67,
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
      stepNumber: 8,
      module: 'blues_l1',
      section: 'A',
      subsection: 'A2: Blues Phrases over C7',
      activity: 'A2.5: Blues Phrase 5',
      direction: 'B♭ below middle C, then up: C, E♭, F, G.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_phrase_5 | blues',
      styleRef: 'l1a',
      successFeedback: 'Minor pentatonic over C7 — the blues sound.',
      key: 'C major',
      scaleIntervals: [0, 3, 5, 7, 10],
      scaleId: 'minor_pentatonic',
      chordSymbols: ['C7'],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 58, onset: 0, duration: 220 }, // B♭3
        { midi: 60, onset: 240, duration: 220 }, // C4
        { midi: 63, onset: 480, duration: 220 }, // E♭4
        { midi: 65, onset: 720, duration: 220 }, // F4
        { midi: 67, onset: 960, duration: 940 }, // G4
      ],
    },
    {
      stepNumber: 9,
      module: 'blues_l1',
      section: 'A',
      subsection: 'A2: Blues Phrases over C7',
      activity: 'A2.6: Blues Phrase 6',
      direction: 'Four quick sixteenths down G–F–E♭–C, then B♭ up to C, held.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_phrase_6 | blues',
      styleRef: 'l1a',
      successFeedback: 'A fast fall and a long C.',
      key: 'C major',
      scaleIntervals: [0, 3, 5, 7, 10],
      scaleId: 'minor_pentatonic',
      chordSymbols: ['C7'],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 67, onset: 0, duration: 110 }, // G4
        { midi: 65, onset: 120, duration: 110 }, // F4
        { midi: 63, onset: 240, duration: 110 }, // E♭4
        { midi: 60, onset: 360, duration: 110 }, // C4
        { midi: 58, onset: 480, duration: 220 }, // B♭3
        { midi: 60, onset: 720, duration: 1140 }, // C4
      ],
    },
    {
      stepNumber: 10,
      module: 'blues_l1',
      section: 'A',
      subsection: 'A2: Blues Phrases over C7',
      activity: 'A2.7: Blues Phrase 7',
      direction:
        'Two notes at a time: G with C above, then F with C, a low C, then E with C — each with a grace note below.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_phrase_7 | blues',
      styleRef: 'l1a',
      successFeedback: 'Double stops, like a blues guitarist.',
      key: 'C major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 10],
      scaleId: 'mixolydian',
      chordSymbols: ['C7'],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 66, onset: 0, duration: 50 }, // F♯4
        { midi: 72, onset: 0, duration: 460 }, // C5
        { midi: 67, onset: 60, duration: 400 }, // G4
        { midi: 66, onset: 480, duration: 50 }, // F♯4
        { midi: 72, onset: 480, duration: 220 }, // C5
        { midi: 65, onset: 540, duration: 160 }, // F4
        { midi: 60, onset: 720, duration: 220 }, // C4
        { midi: 63, onset: 960, duration: 50 }, // D♯4
        { midi: 72, onset: 960, duration: 940 }, // C5
        { midi: 64, onset: 1020, duration: 880 }, // E4
      ],
    },
    {
      stepNumber: 11,
      module: 'blues_l1',
      section: 'A',
      subsection: 'A2: Blues Phrases over C7',
      activity: 'A2.8: Blues Phrase 8',
      direction: 'G and B♭ together, low C, F and A, low C, then E♭ and G.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_phrase_8 | blues',
      styleRef: 'l1a',
      successFeedback: 'Pairs answering a low C.',
      key: 'C major',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      chordSymbols: ['C7'],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 66, onset: 0, duration: 50 }, // F♯4
        { midi: 70, onset: 0, duration: 220 }, // B♭4
        { midi: 67, onset: 60, duration: 160 }, // G4
        { midi: 60, onset: 240, duration: 220 }, // C4
        { midi: 65, onset: 480, duration: 220 }, // F4
        { midi: 69, onset: 480, duration: 220 }, // A4
        { midi: 60, onset: 720, duration: 220 }, // C4
        { midi: 63, onset: 960, duration: 940 }, // E♭4
        { midi: 67, onset: 960, duration: 940 }, // G4
      ],
    },
    {
      stepNumber: 12,
      module: 'blues_l1',
      section: 'A',
      subsection: 'A3: B.B. King–Style Phrases over G7',
      activity: 'A3.1: B.B. King–Style Phrase 1',
      direction:
        'A breath, then D, E and a long G — and a bend into B. Then the same start, ending on E.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_bb_phrase_1 | blues',
      styleRef: 'l1a',
      successFeedback:
        'Say it, then say it again with a new ending: B.B. King’s way.',
      key: 'G major',
      scaleIntervals: [0, 2, 3, 4, 7, 9],
      scaleId: 'major_blues',
      chordSymbols: ['G7', 'G7'],
      tempo: 90,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 74, onset: 240, duration: 220 }, // D5
        { midi: 76, onset: 480, duration: 220 }, // E5
        { midi: 79, onset: 720, duration: 700 }, // G5
        { midi: 70, onset: 1440, duration: 50 }, // A♯4
        { midi: 71, onset: 1500, duration: 400 }, // B4
        { midi: 74, onset: 2160, duration: 220 }, // D5
        { midi: 76, onset: 2400, duration: 220 }, // E5
        { midi: 79, onset: 2640, duration: 700 }, // G5
        { midi: 76, onset: 3360, duration: 460 }, // E5
      ],
    },
    {
      stepNumber: 13,
      module: 'blues_l1',
      section: 'A',
      subsection: 'A3: B.B. King–Style Phrases over G7',
      activity: 'A3.2: B.B. King–Style Phrase 2',
      direction:
        'B, A, G, then a bend into B, held. Then again, ending low on E.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_bb_phrase_2 | blues',
      styleRef: 'l1a',
      successFeedback: 'The 3, the 2 and the 1: the major blues, sung.',
      key: 'G major',
      scaleIntervals: [0, 2, 3, 4, 7, 9],
      scaleId: 'major_blues',
      chordSymbols: ['G7', 'G7'],
      tempo: 90,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 71, onset: 0, duration: 220 }, // B4
        { midi: 69, onset: 240, duration: 220 }, // A4
        { midi: 67, onset: 480, duration: 460 }, // G4
        { midi: 70, onset: 960, duration: 50 }, // A♯4
        { midi: 71, onset: 1020, duration: 640 }, // B4
        { midi: 67, onset: 1680, duration: 220 }, // G4
        { midi: 71, onset: 1920, duration: 220 }, // B4
        { midi: 69, onset: 2160, duration: 220 }, // A4
        { midi: 67, onset: 2400, duration: 460 }, // G4
        { midi: 64, onset: 2880, duration: 940 }, // E4
      ],
    },
    {
      stepNumber: 14,
      module: 'blues_l1',
      section: 'A',
      subsection: 'A3: B.B. King–Style Phrases over G7',
      activity: 'A3.3: B.B. King–Style Phrase 3',
      direction:
        'From the ♭7: F, E, D, B. Then the same four notes, turning back up to E.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_bb_phrase_3 | blues',
      styleRef: 'l1a',
      successFeedback: 'The ♭7 passes through; the 6 is home.',
      key: 'G major',
      scaleIntervals: [0, 2, 3, 4, 7, 9],
      scaleId: 'major_blues',
      chordSymbols: ['G7', 'G7'],
      tempo: 90,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 77, onset: 480, duration: 220 }, // F5
        { midi: 76, onset: 720, duration: 220 }, // E5
        { midi: 74, onset: 960, duration: 220 }, // D5
        { midi: 71, onset: 1200, duration: 700 }, // B4
        { midi: 77, onset: 2400, duration: 220 }, // F5
        { midi: 76, onset: 2640, duration: 220 }, // E5
        { midi: 74, onset: 2880, duration: 220 }, // D5
        { midi: 76, onset: 3120, duration: 700 }, // E5
      ],
    },
    {
      stepNumber: 15,
      module: 'blues_l1',
      section: 'A',
      subsection: 'A3: B.B. King–Style Phrases over G7',
      activity: 'A3.4: B.B. King–Style Phrase 4',
      direction: 'One long G — let it sing — then E, D, a bend into B, and G.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_bb_phrase_4 | blues',
      styleRef: 'l1a',
      successFeedback: 'Few notes, held long: the space is part of the phrase.',
      key: 'G major',
      scaleIntervals: [0, 2, 3, 4, 7, 9],
      scaleId: 'major_blues',
      chordSymbols: ['G7', 'G7'],
      tempo: 90,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 79, onset: 0, duration: 1380 }, // G5
        { midi: 76, onset: 1440, duration: 220 }, // E5
        { midi: 74, onset: 1680, duration: 220 }, // D5
        { midi: 70, onset: 1920, duration: 50 }, // A♯4
        { midi: 71, onset: 1980, duration: 400 }, // B4
        { midi: 67, onset: 2400, duration: 460 }, // G4
      ],
    },
    {
      stepNumber: 16,
      module: 'blues_l1',
      section: 'A',
      subsection: 'A4: Blues Phrases in G',
      activity: 'A4.1: Blues Phrase 2 in G',
      direction: 'C, D, then A♯ up to B and down to G.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_phrase_2_g | blues',
      styleRef: 'l1a',
      successFeedback: 'Phrase 2, a 5th higher: G blues.',
      key: 'G major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 10],
      scaleId: 'mixolydian',
      chordSymbols: ['G7'],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 72, onset: 0, duration: 220 }, // C5
        { midi: 74, onset: 240, duration: 220 }, // D5
        { midi: 70, onset: 480, duration: 220 }, // A♯4
        { midi: 71, onset: 720, duration: 220 }, // B4
        { midi: 67, onset: 960, duration: 940 }, // G4
      ],
    },
    {
      stepNumber: 17,
      module: 'blues_l1',
      section: 'A',
      subsection: 'A4: Blues Phrases in G',
      activity: 'A4.2: Blues Phrase 7 in G',
      direction:
        'Double stops in G: D with G above, C with G, a low G, then B with G — each with a grace note.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_phrase_7_g | blues',
      styleRef: 'l1a',
      successFeedback:
        'Phrase 7 in G: two notes at a time, like a blues guitarist.',
      key: 'G major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 10],
      scaleId: 'mixolydian',
      chordSymbols: ['G7'],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 73, onset: 0, duration: 50 }, // C♯5
        { midi: 79, onset: 0, duration: 460 }, // G5
        { midi: 74, onset: 60, duration: 400 }, // D5
        { midi: 73, onset: 480, duration: 50 }, // C♯5
        { midi: 79, onset: 480, duration: 220 }, // G5
        { midi: 72, onset: 540, duration: 160 }, // C5
        { midi: 67, onset: 720, duration: 220 }, // G4
        { midi: 70, onset: 960, duration: 50 }, // A♯4
        { midi: 79, onset: 960, duration: 940 }, // G5
        { midi: 71, onset: 1020, duration: 880 }, // B4
      ],
    },
    {
      stepNumber: 18,
      module: 'blues_l1',
      section: 'A',
      subsection: 'A5: G Minor Blues',
      activity: 'A5.1: G Minor Blues — Up & Down in Shuffled Eighths (In Time)',
      direction: 'G–B♭–C–D♭–D–F–G and back: the minor pentatonic with the ♭5.',
      assessment: 'pitch_order_timing',
      tag: 'blues:l1_minor_blues_updown_it | blues',
      styleRef: 'l1a',
      successFeedback: 'The minor blues scale in G.',
      key: 'G minor',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      tempo: 90,
      swing: 67,
      swingUnit: '8n',
      targetNotes: [
        { midi: 67, onset: 0, duration: 220 }, // G4
        { midi: 70, onset: 240, duration: 220 }, // B♭4
        { midi: 72, onset: 480, duration: 220 }, // C5
        { midi: 73, onset: 720, duration: 220 }, // D♭5
        { midi: 74, onset: 960, duration: 220 }, // D5
        { midi: 77, onset: 1200, duration: 220 }, // F5
        { midi: 79, onset: 1440, duration: 220 }, // G5
        { midi: 77, onset: 1680, duration: 220 }, // F5
        { midi: 74, onset: 1920, duration: 220 }, // D5
        { midi: 73, onset: 2160, duration: 220 }, // D♭5
        { midi: 72, onset: 2400, duration: 220 }, // C5
        { midi: 70, onset: 2640, duration: 220 }, // B♭4
        { midi: 67, onset: 2880, duration: 220 }, // G4
      ],
    },
    {
      stepNumber: 19,
      module: 'blues_l1',
      section: 'A',
      subsection: 'A5: G Minor Blues',
      activity: 'A5.2: Minor Blues Line 1 in G',
      direction:
        'Up G, B♭, C, D♭, then back down C, B♭ to G, held over the bar line.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_minor_line_1 | blues',
      styleRef: 'l1a',
      successFeedback: 'Up to the ♭5 and home.',
      key: 'G minor',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      chordSymbols: ['Gm7', 'Gm7'],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 67, onset: 0, duration: 220 }, // G4
        { midi: 70, onset: 240, duration: 220 }, // B♭4
        { midi: 72, onset: 480, duration: 220 }, // C5
        { midi: 73, onset: 720, duration: 220 }, // D♭5
        { midi: 72, onset: 960, duration: 460 }, // C5
        { midi: 70, onset: 1440, duration: 220 }, // B♭4
        { midi: 67, onset: 1680, duration: 700 }, // G4
      ],
    },
    {
      stepNumber: 20,
      module: 'blues_l1',
      section: 'A',
      subsection: 'A5: G Minor Blues',
      activity: 'A5.3: Minor Blues Line 2 in G',
      direction: 'D♭ down to C and B♭, then C held, and B♭.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_minor_line_2 | blues',
      styleRef: 'l1a',
      successFeedback: 'The ♭5 sliding into the 4.',
      key: 'G minor',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      chordSymbols: ['Gm7', 'Gm7'],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 73, onset: 0, duration: 220 }, // D♭5
        { midi: 72, onset: 240, duration: 220 }, // C5
        { midi: 70, onset: 480, duration: 220 }, // B♭4
        { midi: 72, onset: 720, duration: 700 }, // C5
        { midi: 70, onset: 1440, duration: 460 }, // B♭4
      ],
    },
    {
      stepNumber: 21,
      module: 'blues_l1',
      section: 'A',
      subsection: 'A5: G Minor Blues',
      activity: 'A5.4: Minor Blues Line 3 in G',
      direction: 'F, D, D♭, C — then B♭ and G.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_minor_line_3 | blues',
      styleRef: 'l1a',
      successFeedback: 'Down the minor blues scale.',
      key: 'G minor',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      chordSymbols: ['Gm7', 'Gm7'],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 77, onset: 0, duration: 220 }, // F5
        { midi: 74, onset: 240, duration: 220 }, // D5
        { midi: 73, onset: 480, duration: 220 }, // D♭5
        { midi: 72, onset: 720, duration: 460 }, // C5
        { midi: 70, onset: 1200, duration: 220 }, // B♭4
        { midi: 67, onset: 1440, duration: 460 }, // G4
      ],
    },
    {
      stepNumber: 22,
      module: 'blues_l1',
      section: 'A',
      subsection: 'A5: G Minor Blues',
      activity: 'A5.5: Minor Blues Line 4 in G',
      direction: 'C♯, D, F, then G, held.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_minor_line_4 | blues',
      styleRef: 'l1a',
      successFeedback: 'A ♯4 pickup into the 5.',
      key: 'G minor',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      chordSymbols: ['Gm7', 'Gm7'],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 73, onset: 0, duration: 220 }, // C♯5
        { midi: 74, onset: 240, duration: 220 }, // D5
        { midi: 77, onset: 480, duration: 220 }, // F5
        { midi: 79, onset: 720, duration: 700 }, // G5
      ],
    },
  ],
};

const bluesL1SectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    {
      stepNumber: 23,
      module: 'blues_l1',
      section: 'B',
      subsection: 'B1: The I–IV Triad Pair',
      activity: 'B1.1: I–IV Triad Pair — Up and Down',
      direction:
        'Two triads over one C: C and F/C, climbing through their inversions and back.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_triads_up_down | blues',
      styleRef: 'l1a',
      successFeedback: 'C to F/C and back: the gospel and blues right hand.',
      key: 'C major',
      chordSymbols: ['C7', 'C7', 'C7', 'C7'],
      tempo: 90,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 60, onset: 0, duration: 460 }, // C4
        { midi: 64, onset: 0, duration: 460 }, // E4
        { midi: 67, onset: 0, duration: 460 }, // G4
        { midi: 60, onset: 480, duration: 460 }, // C4
        { midi: 65, onset: 480, duration: 460 }, // F4
        { midi: 69, onset: 480, duration: 460 }, // A4
        { midi: 64, onset: 960, duration: 460 }, // E4
        { midi: 67, onset: 960, duration: 460 }, // G4
        { midi: 72, onset: 960, duration: 460 }, // C5
        { midi: 65, onset: 1440, duration: 460 }, // F4
        { midi: 69, onset: 1440, duration: 460 }, // A4
        { midi: 72, onset: 1440, duration: 460 }, // C5
        { midi: 67, onset: 1920, duration: 460 }, // G4
        { midi: 72, onset: 1920, duration: 460 }, // C5
        { midi: 76, onset: 1920, duration: 460 }, // E5
        { midi: 69, onset: 2400, duration: 460 }, // A4
        { midi: 72, onset: 2400, duration: 460 }, // C5
        { midi: 77, onset: 2400, duration: 460 }, // F5
        { midi: 72, onset: 2880, duration: 940 }, // C5
        { midi: 76, onset: 2880, duration: 940 }, // E5
        { midi: 79, onset: 2880, duration: 940 }, // G5
        { midi: 72, onset: 3840, duration: 460 }, // C5
        { midi: 76, onset: 3840, duration: 460 }, // E5
        { midi: 79, onset: 3840, duration: 460 }, // G5
        { midi: 69, onset: 4320, duration: 460 }, // A4
        { midi: 72, onset: 4320, duration: 460 }, // C5
        { midi: 77, onset: 4320, duration: 460 }, // F5
        { midi: 67, onset: 4800, duration: 460 }, // G4
        { midi: 72, onset: 4800, duration: 460 }, // C5
        { midi: 76, onset: 4800, duration: 460 }, // E5
        { midi: 65, onset: 5280, duration: 460 }, // F4
        { midi: 69, onset: 5280, duration: 460 }, // A4
        { midi: 72, onset: 5280, duration: 460 }, // C5
        { midi: 64, onset: 5760, duration: 460 }, // E4
        { midi: 67, onset: 5760, duration: 460 }, // G4
        { midi: 72, onset: 5760, duration: 460 }, // C5
        { midi: 60, onset: 6240, duration: 460 }, // C4
        { midi: 65, onset: 6240, duration: 460 }, // F4
        { midi: 69, onset: 6240, duration: 460 }, // A4
        { midi: 60, onset: 6720, duration: 940 }, // C4
        { midi: 64, onset: 6720, duration: 940 }, // E4
        { midi: 67, onset: 6720, duration: 940 }, // G4
      ],
    },
    {
      stepNumber: 24,
      module: 'blues_l1',
      section: 'B',
      subsection: 'B1: The I–IV Triad Pair',
      activity: 'B1.2: I–IV Triad Pair — Back and Forth',
      direction:
        'Eighth notes rocking between C and F/C, up the keyboard and back.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_triads_back_forth | blues',
      styleRef: 'l1a',
      successFeedback: 'I to IV and back, in shuffled eighths.',
      key: 'C major',
      chordSymbols: ['C7', 'C7', 'C7', 'C7'],
      tempo: 90,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 60, onset: 0, duration: 220 }, // C4
        { midi: 64, onset: 0, duration: 220 }, // E4
        { midi: 67, onset: 0, duration: 220 }, // G4
        { midi: 60, onset: 240, duration: 220 }, // C4
        { midi: 65, onset: 240, duration: 220 }, // F4
        { midi: 69, onset: 240, duration: 220 }, // A4
        { midi: 60, onset: 480, duration: 220 }, // C4
        { midi: 64, onset: 480, duration: 220 }, // E4
        { midi: 67, onset: 480, duration: 220 }, // G4
        { midi: 60, onset: 720, duration: 220 }, // C4
        { midi: 65, onset: 720, duration: 220 }, // F4
        { midi: 69, onset: 720, duration: 220 }, // A4
        { midi: 64, onset: 960, duration: 220 }, // E4
        { midi: 67, onset: 960, duration: 220 }, // G4
        { midi: 72, onset: 960, duration: 220 }, // C5
        { midi: 65, onset: 1200, duration: 220 }, // F4
        { midi: 69, onset: 1200, duration: 220 }, // A4
        { midi: 72, onset: 1200, duration: 220 }, // C5
        { midi: 64, onset: 1440, duration: 220 }, // E4
        { midi: 67, onset: 1440, duration: 220 }, // G4
        { midi: 72, onset: 1440, duration: 220 }, // C5
        { midi: 65, onset: 1680, duration: 220 }, // F4
        { midi: 69, onset: 1680, duration: 220 }, // A4
        { midi: 72, onset: 1680, duration: 220 }, // C5
        { midi: 67, onset: 1920, duration: 220 }, // G4
        { midi: 72, onset: 1920, duration: 220 }, // C5
        { midi: 76, onset: 1920, duration: 220 }, // E5
        { midi: 69, onset: 2160, duration: 220 }, // A4
        { midi: 72, onset: 2160, duration: 220 }, // C5
        { midi: 77, onset: 2160, duration: 220 }, // F5
        { midi: 67, onset: 2400, duration: 220 }, // G4
        { midi: 72, onset: 2400, duration: 220 }, // C5
        { midi: 76, onset: 2400, duration: 220 }, // E5
        { midi: 69, onset: 2640, duration: 220 }, // A4
        { midi: 72, onset: 2640, duration: 220 }, // C5
        { midi: 77, onset: 2640, duration: 220 }, // F5
        { midi: 72, onset: 2880, duration: 220 }, // C5
        { midi: 76, onset: 2880, duration: 220 }, // E5
        { midi: 79, onset: 2880, duration: 220 }, // G5
        { midi: 72, onset: 3120, duration: 220 }, // C5
        { midi: 77, onset: 3120, duration: 220 }, // F5
        { midi: 81, onset: 3120, duration: 220 }, // A5
        { midi: 72, onset: 3360, duration: 460 }, // C5
        { midi: 76, onset: 3360, duration: 460 }, // E5
        { midi: 79, onset: 3360, duration: 460 }, // G5
        { midi: 72, onset: 3840, duration: 220 }, // C5
        { midi: 77, onset: 3840, duration: 220 }, // F5
        { midi: 81, onset: 3840, duration: 220 }, // A5
        { midi: 72, onset: 4080, duration: 220 }, // C5
        { midi: 76, onset: 4080, duration: 220 }, // E5
        { midi: 79, onset: 4080, duration: 220 }, // G5
        { midi: 72, onset: 4320, duration: 220 }, // C5
        { midi: 77, onset: 4320, duration: 220 }, // F5
        { midi: 81, onset: 4320, duration: 220 }, // A5
        { midi: 72, onset: 4560, duration: 220 }, // C5
        { midi: 76, onset: 4560, duration: 220 }, // E5
        { midi: 79, onset: 4560, duration: 220 }, // G5
        { midi: 69, onset: 4800, duration: 220 }, // A4
        { midi: 72, onset: 4800, duration: 220 }, // C5
        { midi: 77, onset: 4800, duration: 220 }, // F5
        { midi: 67, onset: 5040, duration: 220 }, // G4
        { midi: 72, onset: 5040, duration: 220 }, // C5
        { midi: 76, onset: 5040, duration: 220 }, // E5
        { midi: 69, onset: 5280, duration: 220 }, // A4
        { midi: 72, onset: 5280, duration: 220 }, // C5
        { midi: 77, onset: 5280, duration: 220 }, // F5
        { midi: 67, onset: 5520, duration: 220 }, // G4
        { midi: 72, onset: 5520, duration: 220 }, // C5
        { midi: 76, onset: 5520, duration: 220 }, // E5
        { midi: 65, onset: 5760, duration: 220 }, // F4
        { midi: 69, onset: 5760, duration: 220 }, // A4
        { midi: 72, onset: 5760, duration: 220 }, // C5
        { midi: 64, onset: 6000, duration: 220 }, // E4
        { midi: 67, onset: 6000, duration: 220 }, // G4
        { midi: 72, onset: 6000, duration: 220 }, // C5
        { midi: 65, onset: 6240, duration: 220 }, // F4
        { midi: 69, onset: 6240, duration: 220 }, // A4
        { midi: 72, onset: 6240, duration: 220 }, // C5
        { midi: 64, onset: 6480, duration: 220 }, // E4
        { midi: 67, onset: 6480, duration: 220 }, // G4
        { midi: 72, onset: 6480, duration: 220 }, // C5
        { midi: 60, onset: 6720, duration: 220 }, // C4
        { midi: 65, onset: 6720, duration: 220 }, // F4
        { midi: 69, onset: 6720, duration: 220 }, // A4
        { midi: 60, onset: 6960, duration: 220 }, // C4
        { midi: 64, onset: 6960, duration: 220 }, // E4
        { midi: 67, onset: 6960, duration: 220 }, // G4
        { midi: 60, onset: 7200, duration: 220 }, // C4
        { midi: 65, onset: 7200, duration: 220 }, // F4
        { midi: 69, onset: 7200, duration: 220 }, // A4
        { midi: 60, onset: 7440, duration: 220 }, // C4
        { midi: 64, onset: 7440, duration: 220 }, // E4
        { midi: 67, onset: 7440, duration: 220 }, // G4
      ],
    },
    {
      stepNumber: 25,
      module: 'blues_l1',
      section: 'B',
      subsection: 'B1: The I–IV Triad Pair',
      activity: 'B1.3: I–IV Triad Pair — Groove',
      direction: 'E–G–C and F–A–C, back and forth, with a push into beat 3.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_triads_groove | blues',
      styleRef: 'l1a',
      successFeedback:
        'A groove from two triads: the shuffle in your right hand.',
      key: 'C major',
      chordSymbols: ['C7', 'C7', 'C7', 'C7'],
      tempo: 90,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 64, onset: 0, duration: 460 }, // E4
        { midi: 67, onset: 0, duration: 460 }, // G4
        { midi: 72, onset: 0, duration: 460 }, // C5
        { midi: 65, onset: 480, duration: 460 }, // F4
        { midi: 69, onset: 480, duration: 460 }, // A4
        { midi: 72, onset: 480, duration: 460 }, // C5
        { midi: 64, onset: 960, duration: 460 }, // E4
        { midi: 67, onset: 960, duration: 460 }, // G4
        { midi: 72, onset: 960, duration: 460 }, // C5
        { midi: 65, onset: 1440, duration: 460 }, // F4
        { midi: 69, onset: 1440, duration: 460 }, // A4
        { midi: 72, onset: 1440, duration: 460 }, // C5
        { midi: 64, onset: 1920, duration: 460 }, // E4
        { midi: 67, onset: 1920, duration: 460 }, // G4
        { midi: 72, onset: 1920, duration: 460 }, // C5
        { midi: 65, onset: 2400, duration: 220 }, // F4
        { midi: 69, onset: 2400, duration: 220 }, // A4
        { midi: 72, onset: 2400, duration: 220 }, // C5
        { midi: 64, onset: 2640, duration: 1140 }, // E4
        { midi: 67, onset: 2640, duration: 1140 }, // G4
        { midi: 72, onset: 2640, duration: 1140 }, // C5
        { midi: 65, onset: 3840, duration: 220 }, // F4
        { midi: 69, onset: 3840, duration: 220 }, // A4
        { midi: 72, onset: 3840, duration: 220 }, // C5
        { midi: 64, onset: 4080, duration: 220 }, // E4
        { midi: 67, onset: 4080, duration: 220 }, // G4
        { midi: 72, onset: 4080, duration: 220 }, // C5
        { midi: 65, onset: 4320, duration: 220 }, // F4
        { midi: 69, onset: 4320, duration: 220 }, // A4
        { midi: 72, onset: 4320, duration: 220 }, // C5
        { midi: 64, onset: 4560, duration: 700 }, // E4
        { midi: 67, onset: 4560, duration: 700 }, // G4
        { midi: 72, onset: 4560, duration: 700 }, // C5
        { midi: 65, onset: 5280, duration: 460 }, // F4
        { midi: 69, onset: 5280, duration: 460 }, // A4
        { midi: 72, onset: 5280, duration: 460 }, // C5
        { midi: 64, onset: 5760, duration: 1860 }, // E4
        { midi: 67, onset: 5760, duration: 1860 }, // G4
        { midi: 72, onset: 5760, duration: 1860 }, // C5
      ],
    },
    {
      stepNumber: 26,
      module: 'blues_l1',
      section: 'B',
      subsection: 'B1: The I–IV Triad Pair',
      activity: 'B1.4: I–IV Triad Pair — Stylistic Melody',
      direction:
        'The pair as a melody: the top note sings E, E, F, E, then G and down to C.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_triads_melody | blues',
      styleRef: 'l1a',
      successFeedback: 'Triads that sing a tune.',
      key: 'C major',
      chordSymbols: ['C7', 'C7', 'C7', 'C7'],
      tempo: 90,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 67, onset: 0, duration: 220 }, // G4
        { midi: 72, onset: 0, duration: 220 }, // C5
        { midi: 76, onset: 0, duration: 220 }, // E5
        { midi: 67, onset: 240, duration: 220 }, // G4
        { midi: 72, onset: 240, duration: 220 }, // C5
        { midi: 76, onset: 240, duration: 220 }, // E5
        { midi: 69, onset: 480, duration: 220 }, // A4
        { midi: 72, onset: 480, duration: 220 }, // C5
        { midi: 77, onset: 480, duration: 220 }, // F5
        { midi: 67, onset: 720, duration: 700 }, // G4
        { midi: 72, onset: 720, duration: 700 }, // C5
        { midi: 76, onset: 720, duration: 700 }, // E5
        { midi: 67, onset: 1440, duration: 220 }, // G4
        { midi: 72, onset: 1440, duration: 220 }, // C5
        { midi: 76, onset: 1440, duration: 220 }, // E5
        { midi: 69, onset: 1680, duration: 220 }, // A4
        { midi: 72, onset: 1680, duration: 220 }, // C5
        { midi: 77, onset: 1680, duration: 220 }, // F5
        { midi: 72, onset: 1920, duration: 460 }, // C5
        { midi: 76, onset: 1920, duration: 460 }, // E5
        { midi: 79, onset: 1920, duration: 460 }, // G5
        { midi: 67, onset: 2400, duration: 460 }, // G4
        { midi: 72, onset: 2400, duration: 460 }, // C5
        { midi: 76, onset: 2400, duration: 460 }, // E5
        { midi: 64, onset: 2880, duration: 460 }, // E4
        { midi: 67, onset: 2880, duration: 460 }, // G4
        { midi: 72, onset: 2880, duration: 460 }, // C5
        { midi: 60, onset: 3360, duration: 220 }, // C4
        { midi: 65, onset: 3360, duration: 220 }, // F4
        { midi: 69, onset: 3360, duration: 220 }, // A4
        { midi: 60, onset: 3600, duration: 700 }, // C4
        { midi: 64, onset: 3600, duration: 700 }, // E4
        { midi: 67, onset: 3600, duration: 700 }, // G4
        { midi: 60, onset: 4320, duration: 220 }, // C4
        { midi: 65, onset: 4320, duration: 220 }, // F4
        { midi: 69, onset: 4320, duration: 220 }, // A4
        { midi: 60, onset: 4560, duration: 220 }, // C4
        { midi: 64, onset: 4560, duration: 220 }, // E4
        { midi: 67, onset: 4560, duration: 220 }, // G4
        { midi: 64, onset: 4800, duration: 460 }, // E4
        { midi: 67, onset: 4800, duration: 460 }, // G4
        { midi: 72, onset: 4800, duration: 460 }, // C5
        { midi: 60, onset: 5280, duration: 220 }, // C4
        { midi: 65, onset: 5280, duration: 220 }, // F4
        { midi: 69, onset: 5280, duration: 220 }, // A4
        { midi: 60, onset: 5520, duration: 2100 }, // C4
        { midi: 64, onset: 5520, duration: 2100 }, // E4
        { midi: 67, onset: 5520, duration: 2100 }, // G4
      ],
    },
    {
      stepNumber: 27,
      module: 'blues_l1',
      section: 'B',
      subsection: 'B1: The I–IV Triad Pair',
      activity: 'B1.5: I–IV Triad Pair — Groove in G',
      direction: 'The groove in G: B–D–G and C–E–G over G7.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_triads_groove_g | blues',
      styleRef: 'l1a',
      successFeedback: 'The same groove a 5th higher: G and C/G.',
      key: 'G major',
      chordSymbols: ['G7', 'G7', 'G7', 'G7'],
      tempo: 90,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 59, onset: 0, duration: 460 }, // B3
        { midi: 62, onset: 0, duration: 460 }, // D4
        { midi: 67, onset: 0, duration: 460 }, // G4
        { midi: 60, onset: 480, duration: 460 }, // C4
        { midi: 64, onset: 480, duration: 460 }, // E4
        { midi: 67, onset: 480, duration: 460 }, // G4
        { midi: 59, onset: 960, duration: 460 }, // B3
        { midi: 62, onset: 960, duration: 460 }, // D4
        { midi: 67, onset: 960, duration: 460 }, // G4
        { midi: 60, onset: 1440, duration: 460 }, // C4
        { midi: 64, onset: 1440, duration: 460 }, // E4
        { midi: 67, onset: 1440, duration: 460 }, // G4
        { midi: 59, onset: 1920, duration: 460 }, // B3
        { midi: 62, onset: 1920, duration: 460 }, // D4
        { midi: 67, onset: 1920, duration: 460 }, // G4
        { midi: 60, onset: 2400, duration: 220 }, // C4
        { midi: 64, onset: 2400, duration: 220 }, // E4
        { midi: 67, onset: 2400, duration: 220 }, // G4
        { midi: 59, onset: 2640, duration: 1140 }, // B3
        { midi: 62, onset: 2640, duration: 1140 }, // D4
        { midi: 67, onset: 2640, duration: 1140 }, // G4
        { midi: 60, onset: 3840, duration: 220 }, // C4
        { midi: 64, onset: 3840, duration: 220 }, // E4
        { midi: 67, onset: 3840, duration: 220 }, // G4
        { midi: 59, onset: 4080, duration: 220 }, // B3
        { midi: 62, onset: 4080, duration: 220 }, // D4
        { midi: 67, onset: 4080, duration: 220 }, // G4
        { midi: 60, onset: 4320, duration: 220 }, // C4
        { midi: 64, onset: 4320, duration: 220 }, // E4
        { midi: 67, onset: 4320, duration: 220 }, // G4
        { midi: 59, onset: 4560, duration: 700 }, // B3
        { midi: 62, onset: 4560, duration: 700 }, // D4
        { midi: 67, onset: 4560, duration: 700 }, // G4
        { midi: 60, onset: 5280, duration: 460 }, // C4
        { midi: 64, onset: 5280, duration: 460 }, // E4
        { midi: 67, onset: 5280, duration: 460 }, // G4
        { midi: 59, onset: 5760, duration: 1860 }, // B3
        { midi: 62, onset: 5760, duration: 1860 }, // D4
        { midi: 67, onset: 5760, duration: 1860 }, // G4
      ],
    },
    {
      stepNumber: 28,
      module: 'blues_l1',
      section: 'B',
      subsection: 'B2: Shells (1-7 and 1-3-7)',
      activity: 'B2.1: 1-7 Shells — C7, F7, G7 (Out of Time)',
      direction: 'Root and ♭7 only: C–B♭, F–E♭, G–F.',
      assessment: 'pitch_order',
      tag: 'blues:l1_shell_17 | blues',
      styleRef: 'l1a',
      successFeedback: 'Two notes, and the blues is already there.',
      key: 'C major',
      chordSymbols: ['C7', 'F7', 'G7'],
      targetNotes: [
        { midi: 48, onset: 0, duration: 1800 }, // C3
        { midi: 58, onset: 0, duration: 1800 }, // B♭3
        { midi: 53, onset: 1920, duration: 1800 }, // F3
        { midi: 63, onset: 1920, duration: 1800 }, // E♭4
        { midi: 55, onset: 3840, duration: 1800 }, // G3
        { midi: 65, onset: 3840, duration: 1800 }, // F4
      ],
    },
    {
      stepNumber: 29,
      module: 'blues_l1',
      section: 'B',
      subsection: 'B2: Shells (1-7 and 1-3-7)',
      activity: 'B2.2: 1-3-7 Shells — C7, F7, G7 (Out of Time)',
      direction: 'Add the 3rd: C–E–B♭, F–A–E♭, G–B–F.',
      assessment: 'pitch_order',
      tag: 'blues:l1_shell_137 | blues',
      styleRef: 'l1a',
      successFeedback: 'The 3rd and ♭7 make each chord a dominant 7th.',
      key: 'C major',
      chordSymbols: ['C7', 'F7', 'G7'],
      targetNotes: [
        { midi: 48, onset: 0, duration: 1800 }, // C3
        { midi: 52, onset: 0, duration: 1800 }, // E3
        { midi: 58, onset: 0, duration: 1800 }, // B♭3
        { midi: 53, onset: 1920, duration: 1800 }, // F3
        { midi: 57, onset: 1920, duration: 1800 }, // A3
        { midi: 63, onset: 1920, duration: 1800 }, // E♭4
        { midi: 55, onset: 3840, duration: 1800 }, // G3
        { midi: 59, onset: 3840, duration: 1800 }, // B3
        { midi: 65, onset: 3840, duration: 1800 }, // F4
      ],
    },
    {
      stepNumber: 30,
      module: 'blues_l1',
      section: 'B',
      subsection: 'B2: Shells (1-7 and 1-3-7)',
      activity: 'B2.3: Play-Along — 1-3-7 Shells, the 8-Bar Blues A',
      direction:
        'The “Key to the Highway” form: C7, G7, F7 for two bars, then C7, G7, C7, G7. Your left hand has the roots, so the bass lays out.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_shell_137_8bar_a | blues',
      styleRef: 'l1a',
      successFeedback: 'Your first 8-bar blues.',
      key: 'C major',
      chordSymbols: ['C7', 'G7', 'F7', 'F7', 'C7', 'G7', 'C7', 'G7'],
      tempo: 90,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 48, onset: 0, duration: 1860 }, // C3
        { midi: 52, onset: 0, duration: 1860 }, // E3
        { midi: 58, onset: 0, duration: 1860 }, // B♭3
        { midi: 55, onset: 1920, duration: 1860 }, // G3
        { midi: 59, onset: 1920, duration: 1860 }, // B3
        { midi: 65, onset: 1920, duration: 1860 }, // F4
        { midi: 53, onset: 3840, duration: 1860 }, // F3
        { midi: 57, onset: 3840, duration: 1860 }, // A3
        { midi: 63, onset: 3840, duration: 1860 }, // E♭4
        { midi: 53, onset: 5760, duration: 1860 }, // F3
        { midi: 57, onset: 5760, duration: 1860 }, // A3
        { midi: 63, onset: 5760, duration: 1860 }, // E♭4
        { midi: 48, onset: 7680, duration: 1860 }, // C3
        { midi: 52, onset: 7680, duration: 1860 }, // E3
        { midi: 58, onset: 7680, duration: 1860 }, // B♭3
        { midi: 55, onset: 9600, duration: 1860 }, // G3
        { midi: 59, onset: 9600, duration: 1860 }, // B3
        { midi: 65, onset: 9600, duration: 1860 }, // F4
        { midi: 48, onset: 11520, duration: 1860 }, // C3
        { midi: 52, onset: 11520, duration: 1860 }, // E3
        { midi: 58, onset: 11520, duration: 1860 }, // B♭3
        { midi: 55, onset: 13440, duration: 1860 }, // G3
        { midi: 59, onset: 13440, duration: 1860 }, // B3
        { midi: 65, onset: 13440, duration: 1860 }, // F4
      ],
    },
    {
      stepNumber: 31,
      module: 'blues_l1',
      section: 'B',
      subsection: 'B2: Shells (1-7 and 1-3-7)',
      activity: 'B2.4: Play-Along — 1-3-7 Shells, the 8-Bar Blues B in G',
      direction:
        'G7 for two bars, C7 for two, then G7, D7, G7, D7: G–B–F, C–E–B♭, D–F♯–C.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_shell_137_8bar_b | blues',
      styleRef: 'l1a',
      successFeedback: 'The other 8-bar blues, in G.',
      key: 'G major',
      chordSymbols: ['G7', 'G7', 'C7', 'C7', 'G7', 'D7', 'G7', 'D7'],
      tempo: 90,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 55, onset: 0, duration: 1860 }, // G3
        { midi: 59, onset: 0, duration: 1860 }, // B3
        { midi: 65, onset: 0, duration: 1860 }, // F4
        { midi: 55, onset: 1920, duration: 1860 }, // G3
        { midi: 59, onset: 1920, duration: 1860 }, // B3
        { midi: 65, onset: 1920, duration: 1860 }, // F4
        { midi: 48, onset: 3840, duration: 1860 }, // C3
        { midi: 52, onset: 3840, duration: 1860 }, // E3
        { midi: 58, onset: 3840, duration: 1860 }, // B♭3
        { midi: 48, onset: 5760, duration: 1860 }, // C3
        { midi: 52, onset: 5760, duration: 1860 }, // E3
        { midi: 58, onset: 5760, duration: 1860 }, // B♭3
        { midi: 55, onset: 7680, duration: 1860 }, // G3
        { midi: 59, onset: 7680, duration: 1860 }, // B3
        { midi: 65, onset: 7680, duration: 1860 }, // F4
        { midi: 50, onset: 9600, duration: 1860 }, // D3
        { midi: 54, onset: 9600, duration: 1860 }, // F♯3
        { midi: 60, onset: 9600, duration: 1860 }, // C4
        { midi: 55, onset: 11520, duration: 1860 }, // G3
        { midi: 59, onset: 11520, duration: 1860 }, // B3
        { midi: 65, onset: 11520, duration: 1860 }, // F4
        { midi: 50, onset: 13440, duration: 1860 }, // D3
        { midi: 54, onset: 13440, duration: 1860 }, // F♯3
        { midi: 60, onset: 13440, duration: 1860 }, // C4
      ],
    },
  ],
};

const bluesL1SectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 32,
      module: 'blues_l1',
      section: 'C',
      subsection: 'C1: Just Roots',
      activity: 'C1.1: Just Roots — the 8-Bar Blues A',
      direction: 'One long root a bar: C, G, F, F, C, G, C, G.',
      assessment: 'pitch_order_timing',
      tag: 'blues:l1_bass_roots_8bar_a | blues',
      styleRef: 'l1a',
      successFeedback: 'The 8-bar blues from the bottom up.',
      key: 'C major',
      chordSymbols: ['C7', 'G7', 'F7', 'F7', 'C7', 'G7', 'C7', 'G7'],
      tempo: 90,
      swing: 67,
      swingUnit: '8n',
      targetNotes: [
        { midi: 36, onset: 0, duration: 1860 }, // C2
        { midi: 31, onset: 1920, duration: 1860 }, // G1
        { midi: 29, onset: 3840, duration: 1860 }, // F1
        { midi: 29, onset: 5760, duration: 1860 }, // F1
        { midi: 36, onset: 7680, duration: 1860 }, // C2
        { midi: 31, onset: 9600, duration: 1860 }, // G1
        { midi: 36, onset: 11520, duration: 1860 }, // C2
        { midi: 31, onset: 13440, duration: 1860 }, // G1
      ],
    },
    {
      stepNumber: 33,
      module: 'blues_l1',
      section: 'C',
      subsection: 'C1: Just Roots',
      activity: 'C1.2: Just Roots — the 8-Bar Blues B in G',
      direction: 'G, G, C, C, G, D, G, D.',
      assessment: 'pitch_order_timing',
      tag: 'blues:l1_bass_roots_8bar_b | blues',
      styleRef: 'l1a',
      successFeedback: 'The other form, in G.',
      key: 'G major',
      chordSymbols: ['G7', 'G7', 'C7', 'C7', 'G7', 'D7', 'G7', 'D7'],
      tempo: 90,
      swing: 67,
      swingUnit: '8n',
      targetNotes: [
        { midi: 31, onset: 0, duration: 1860 }, // G1
        { midi: 31, onset: 1920, duration: 1860 }, // G1
        { midi: 36, onset: 3840, duration: 1860 }, // C2
        { midi: 36, onset: 5760, duration: 1860 }, // C2
        { midi: 31, onset: 7680, duration: 1860 }, // G1
        { midi: 38, onset: 9600, duration: 1860 }, // D2
        { midi: 31, onset: 11520, duration: 1860 }, // G1
        { midi: 38, onset: 13440, duration: 1860 }, // D2
      ],
    },
    {
      stepNumber: 34,
      module: 'blues_l1',
      section: 'C',
      subsection: 'C2: The Boogie Bass Line',
      activity: 'C2.1: Peter’s Blues Bass Line',
      direction: 'Up the chord and back: C, E, G, A, then B♭, A, G, E.',
      assessment: 'pitch_order_timing',
      tag: 'blues:l1_bass_peter_line | blues',
      styleRef: 'l1a',
      successFeedback: 'The boogie line: the engine of the shuffle.',
      key: 'C major',
      chordSymbols: ['C7', 'C7'],
      tempo: 90,
      swing: 67,
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
      stepNumber: 35,
      module: 'blues_l1',
      section: 'C',
      subsection: 'C2: The Boogie Bass Line',
      activity: 'C2.2: Boogie — the 8-Bar Blues A',
      direction:
        'The boogie through the form. On a new chord, start on its root: over the one-bar G7 the line turns down — G, E, D, B.',
      assessment: 'pitch_order_timing',
      tag: 'blues:l1_bass_boogie_8bar_a | blues',
      styleRef: 'l1a',
      successFeedback: 'The line keeps its place and lands on every root.',
      key: 'C major',
      chordSymbols: ['C7', 'G7', 'F7', 'F7', 'C7', 'G7', 'C7', 'G7'],
      tempo: 90,
      swing: 67,
      swingUnit: '8n',
      targetNotes: [
        { midi: 36, onset: 0, duration: 460 }, // C2
        { midi: 40, onset: 480, duration: 460 }, // E2
        { midi: 43, onset: 960, duration: 460 }, // G2
        { midi: 45, onset: 1440, duration: 460 }, // A2
        { midi: 31, onset: 1920, duration: 460 }, // G1
        { midi: 40, onset: 2400, duration: 460 }, // E2
        { midi: 38, onset: 2880, duration: 460 }, // D2
        { midi: 35, onset: 3360, duration: 460 }, // B1
        { midi: 29, onset: 3840, duration: 460 }, // F1
        { midi: 33, onset: 4320, duration: 460 }, // A1
        { midi: 36, onset: 4800, duration: 460 }, // C2
        { midi: 38, onset: 5280, duration: 460 }, // D2
        { midi: 39, onset: 5760, duration: 460 }, // E♭2
        { midi: 38, onset: 6240, duration: 460 }, // D2
        { midi: 36, onset: 6720, duration: 460 }, // C2
        { midi: 33, onset: 7200, duration: 460 }, // A1
        { midi: 36, onset: 7680, duration: 460 }, // C2
        { midi: 40, onset: 8160, duration: 460 }, // E2
        { midi: 43, onset: 8640, duration: 460 }, // G2
        { midi: 45, onset: 9120, duration: 460 }, // A2
        { midi: 31, onset: 9600, duration: 460 }, // G1
        { midi: 40, onset: 10080, duration: 460 }, // E2
        { midi: 38, onset: 10560, duration: 460 }, // D2
        { midi: 35, onset: 11040, duration: 460 }, // B1
        { midi: 36, onset: 11520, duration: 460 }, // C2
        { midi: 40, onset: 12000, duration: 460 }, // E2
        { midi: 43, onset: 12480, duration: 460 }, // G2
        { midi: 45, onset: 12960, duration: 460 }, // A2
        { midi: 31, onset: 13440, duration: 460 }, // G1
        { midi: 40, onset: 13920, duration: 460 }, // E2
        { midi: 38, onset: 14400, duration: 460 }, // D2
        { midi: 35, onset: 14880, duration: 460 }, // B1
      ],
    },
    {
      stepNumber: 36,
      module: 'blues_l1',
      section: 'C',
      subsection: 'C2: The Boogie Bass Line',
      activity: 'C2.3: Boogie — the 8-Bar Blues B in G',
      direction: 'G, B, D, E and back down; then C7 and D7 the same way.',
      assessment: 'pitch_order_timing',
      tag: 'blues:l1_bass_boogie_8bar_b | blues',
      styleRef: 'l1a',
      successFeedback: 'The boogie in G.',
      key: 'G major',
      chordSymbols: ['G7', 'G7', 'C7', 'C7', 'G7', 'D7', 'G7', 'D7'],
      tempo: 90,
      swing: 67,
      swingUnit: '8n',
      targetNotes: [
        { midi: 43, onset: 0, duration: 460 }, // G2
        { midi: 47, onset: 480, duration: 460 }, // B2
        { midi: 50, onset: 960, duration: 460 }, // D3
        { midi: 52, onset: 1440, duration: 460 }, // E3
        { midi: 53, onset: 1920, duration: 460 }, // F3
        { midi: 52, onset: 2400, duration: 460 }, // E3
        { midi: 50, onset: 2880, duration: 460 }, // D3
        { midi: 47, onset: 3360, duration: 460 }, // B2
        { midi: 48, onset: 3840, duration: 460 }, // C3
        { midi: 52, onset: 4320, duration: 460 }, // E3
        { midi: 55, onset: 4800, duration: 460 }, // G3
        { midi: 57, onset: 5280, duration: 460 }, // A3
        { midi: 58, onset: 5760, duration: 460 }, // B♭3
        { midi: 57, onset: 6240, duration: 460 }, // A3
        { midi: 55, onset: 6720, duration: 460 }, // G3
        { midi: 52, onset: 7200, duration: 460 }, // E3
        { midi: 43, onset: 7680, duration: 460 }, // G2
        { midi: 47, onset: 8160, duration: 460 }, // B2
        { midi: 50, onset: 8640, duration: 460 }, // D3
        { midi: 52, onset: 9120, duration: 460 }, // E3
        { midi: 50, onset: 9600, duration: 460 }, // D3
        { midi: 59, onset: 10080, duration: 460 }, // B3
        { midi: 57, onset: 10560, duration: 460 }, // A3
        { midi: 54, onset: 11040, duration: 460 }, // G♭3
        { midi: 43, onset: 11520, duration: 460 }, // G2
        { midi: 47, onset: 12000, duration: 460 }, // B2
        { midi: 50, onset: 12480, duration: 460 }, // D3
        { midi: 52, onset: 12960, duration: 460 }, // E3
        { midi: 50, onset: 13440, duration: 460 }, // D3
        { midi: 59, onset: 13920, duration: 460 }, // B3
        { midi: 57, onset: 14400, duration: 460 }, // A3
        { midi: 54, onset: 14880, duration: 460 }, // G♭3
      ],
    },
    {
      stepNumber: 37,
      module: 'blues_l1',
      section: 'C',
      subsection: 'C2: The Boogie Bass Line',
      activity: 'C2.4: Boogie in Minor — G Minor Jam',
      direction: 'Over Gm7 the 3rd is B♭: G, B♭, D, E, then F, E, D, B♭.',
      assessment: 'pitch_order_timing',
      tag: 'blues:l1_bass_boogie_minor | blues',
      styleRef: 'l1a',
      successFeedback: 'The same line, minor.',
      key: 'G minor',
      chordSymbols: ['Gm7', 'Gm7', 'Gm7', 'Gm7'],
      tempo: 90,
      swing: 67,
      swingUnit: '8n',
      targetNotes: [
        { midi: 43, onset: 0, duration: 460 }, // G2
        { midi: 46, onset: 480, duration: 460 }, // B♭2
        { midi: 50, onset: 960, duration: 460 }, // D3
        { midi: 52, onset: 1440, duration: 460 }, // E3
        { midi: 53, onset: 1920, duration: 460 }, // F3
        { midi: 52, onset: 2400, duration: 460 }, // E3
        { midi: 50, onset: 2880, duration: 460 }, // D3
        { midi: 46, onset: 3360, duration: 460 }, // B♭2
        { midi: 43, onset: 3840, duration: 460 }, // G2
        { midi: 46, onset: 4320, duration: 460 }, // B♭2
        { midi: 50, onset: 4800, duration: 460 }, // D3
        { midi: 52, onset: 5280, duration: 460 }, // E3
        { midi: 53, onset: 5760, duration: 460 }, // F3
        { midi: 52, onset: 6240, duration: 460 }, // E3
        { midi: 50, onset: 6720, duration: 460 }, // D3
        { midi: 46, onset: 7200, duration: 460 }, // B♭2
      ],
    },
    {
      stepNumber: 38,
      module: 'blues_l1',
      section: 'C',
      subsection: 'C2: The Boogie Bass Line',
      activity: 'C2.5: Bass Play-Along — Boogie, the 8-Bar Blues A',
      direction: 'The boogie under the band.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_bass_boogie_play | blues',
      styleRef: 'l1a',
      successFeedback: 'You are the bass player.',
      key: 'C major',
      chordSymbols: ['C7', 'G7', 'F7', 'F7', 'C7', 'G7', 'C7', 'G7'],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 36, onset: 0, duration: 460 }, // C2
        { midi: 40, onset: 480, duration: 460 }, // E2
        { midi: 43, onset: 960, duration: 460 }, // G2
        { midi: 45, onset: 1440, duration: 460 }, // A2
        { midi: 31, onset: 1920, duration: 460 }, // G1
        { midi: 40, onset: 2400, duration: 460 }, // E2
        { midi: 38, onset: 2880, duration: 460 }, // D2
        { midi: 35, onset: 3360, duration: 460 }, // B1
        { midi: 29, onset: 3840, duration: 460 }, // F1
        { midi: 33, onset: 4320, duration: 460 }, // A1
        { midi: 36, onset: 4800, duration: 460 }, // C2
        { midi: 38, onset: 5280, duration: 460 }, // D2
        { midi: 39, onset: 5760, duration: 460 }, // E♭2
        { midi: 38, onset: 6240, duration: 460 }, // D2
        { midi: 36, onset: 6720, duration: 460 }, // C2
        { midi: 33, onset: 7200, duration: 460 }, // A1
        { midi: 36, onset: 7680, duration: 460 }, // C2
        { midi: 40, onset: 8160, duration: 460 }, // E2
        { midi: 43, onset: 8640, duration: 460 }, // G2
        { midi: 45, onset: 9120, duration: 460 }, // A2
        { midi: 31, onset: 9600, duration: 460 }, // G1
        { midi: 40, onset: 10080, duration: 460 }, // E2
        { midi: 38, onset: 10560, duration: 460 }, // D2
        { midi: 35, onset: 11040, duration: 460 }, // B1
        { midi: 36, onset: 11520, duration: 460 }, // C2
        { midi: 40, onset: 12000, duration: 460 }, // E2
        { midi: 43, onset: 12480, duration: 460 }, // G2
        { midi: 45, onset: 12960, duration: 460 }, // A2
        { midi: 31, onset: 13440, duration: 460 }, // G1
        { midi: 40, onset: 13920, duration: 460 }, // E2
        { midi: 38, onset: 14400, duration: 460 }, // D2
        { midi: 35, onset: 14880, duration: 460 }, // B1
      ],
    },
  ],
};

const bluesL1SectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 39,
      module: 'blues_l1',
      section: 'D',
      subsection: 'D1: LH Shells, RH Phrases',
      activity: 'D1.1: LH 1-3-7 + RH Blues Phrase 4',
      direction: 'Left hand holds C–E–B♭; right hand plays Phrase 4 over it.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_perf_phrase_4 | blues',
      styleRef: 'l1a',
      successFeedback: 'Chord below, phrase above: a pianist’s blues.',
      key: 'C major',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_chords_rh_melody',
        lh_role: 'chords',
        rh_role: 'melody',
        style_ref: 'l1a',
      },
      chordSymbols: ['C7'],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['chords', 'melody'],
      },
      targetNotes: [
        { midi: 48, onset: 0, duration: 1860, hand: 'lh' }, // C3
        { midi: 52, onset: 0, duration: 1860, hand: 'lh' }, // E3
        { midi: 58, onset: 0, duration: 1860, hand: 'lh' }, // B♭3
        { midi: 75, onset: 0, duration: 140, hand: 'rh' }, // E♭5
        { midi: 74, onset: 160, duration: 140, hand: 'rh' }, // D5
        { midi: 72, onset: 320, duration: 140, hand: 'rh' }, // C5
        { midi: 74, onset: 480, duration: 220, hand: 'rh' }, // D5
        { midi: 69, onset: 720, duration: 220, hand: 'rh' }, // A4
        { midi: 72, onset: 960, duration: 940, hand: 'rh' }, // C5
      ],
    },
    {
      stepNumber: 40,
      module: 'blues_l1',
      section: 'D',
      subsection: 'D1: LH Shells, RH Phrases',
      activity: 'D1.2: LH 1-3-7 + RH B.B. King–Style Phrase 1',
      direction:
        'Left hand holds G–B–F; right hand the first B.B. King–style phrase.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_perf_bb_1 | blues',
      styleRef: 'l1a',
      successFeedback: 'The bend over a steady chord.',
      key: 'G major',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_chords_rh_melody',
        lh_role: 'chords',
        rh_role: 'melody',
        style_ref: 'l1a',
      },
      chordSymbols: ['G7', 'G7'],
      tempo: 90,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['chords', 'melody'],
      },
      targetNotes: [
        { midi: 55, onset: 0, duration: 1860, hand: 'lh' }, // G3
        { midi: 59, onset: 0, duration: 1860, hand: 'lh' }, // B3
        { midi: 65, onset: 0, duration: 1860, hand: 'lh' }, // F4
        { midi: 55, onset: 1920, duration: 1860, hand: 'lh' }, // G3
        { midi: 59, onset: 1920, duration: 1860, hand: 'lh' }, // B3
        { midi: 65, onset: 1920, duration: 1860, hand: 'lh' }, // F4
        { midi: 74, onset: 240, duration: 220, hand: 'rh' }, // D5
        { midi: 76, onset: 480, duration: 220, hand: 'rh' }, // E5
        { midi: 79, onset: 720, duration: 700, hand: 'rh' }, // G5
        { midi: 70, onset: 1440, duration: 50, hand: 'rh' }, // A♯4
        { midi: 71, onset: 1500, duration: 400, hand: 'rh' }, // B4
        { midi: 74, onset: 2160, duration: 220, hand: 'rh' }, // D5
        { midi: 76, onset: 2400, duration: 220, hand: 'rh' }, // E5
        { midi: 79, onset: 2640, duration: 700, hand: 'rh' }, // G5
        { midi: 76, onset: 3360, duration: 460, hand: 'rh' }, // E5
      ],
    },
    {
      stepNumber: 41,
      module: 'blues_l1',
      section: 'D',
      subsection: 'D2: LH Boogie, RH Triads',
      activity: 'D2.1: LH Boogie + RH I–IV Groove',
      direction:
        'Left hand Peter’s bass line; right hand the I–IV groove. The whole shuffle in two hands.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_perf_boogie_triads | blues',
      styleRef: 'l1a',
      successFeedback: 'Bass and comping at once.',
      key: 'C major',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1a',
      },
      chordSymbols: ['C7', 'C7', 'C7', 'C7'],
      tempo: 90,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 48, onset: 0, duration: 460, hand: 'lh' }, // C3
        { midi: 52, onset: 480, duration: 460, hand: 'lh' }, // E3
        { midi: 55, onset: 960, duration: 460, hand: 'lh' }, // G3
        { midi: 57, onset: 1440, duration: 460, hand: 'lh' }, // A3
        { midi: 58, onset: 1920, duration: 460, hand: 'lh' }, // B♭3
        { midi: 57, onset: 2400, duration: 460, hand: 'lh' }, // A3
        { midi: 55, onset: 2880, duration: 460, hand: 'lh' }, // G3
        { midi: 52, onset: 3360, duration: 460, hand: 'lh' }, // E3
        { midi: 48, onset: 3840, duration: 460, hand: 'lh' }, // C3
        { midi: 52, onset: 4320, duration: 460, hand: 'lh' }, // E3
        { midi: 55, onset: 4800, duration: 460, hand: 'lh' }, // G3
        { midi: 57, onset: 5280, duration: 460, hand: 'lh' }, // A3
        { midi: 58, onset: 5760, duration: 460, hand: 'lh' }, // B♭3
        { midi: 57, onset: 6240, duration: 460, hand: 'lh' }, // A3
        { midi: 55, onset: 6720, duration: 460, hand: 'lh' }, // G3
        { midi: 52, onset: 7200, duration: 460, hand: 'lh' }, // E3
        { midi: 64, onset: 0, duration: 460, hand: 'rh' }, // E4
        { midi: 67, onset: 0, duration: 460, hand: 'rh' }, // G4
        { midi: 72, onset: 0, duration: 460, hand: 'rh' }, // C5
        { midi: 65, onset: 480, duration: 460, hand: 'rh' }, // F4
        { midi: 69, onset: 480, duration: 460, hand: 'rh' }, // A4
        { midi: 72, onset: 480, duration: 460, hand: 'rh' }, // C5
        { midi: 64, onset: 960, duration: 460, hand: 'rh' }, // E4
        { midi: 67, onset: 960, duration: 460, hand: 'rh' }, // G4
        { midi: 72, onset: 960, duration: 460, hand: 'rh' }, // C5
        { midi: 65, onset: 1440, duration: 460, hand: 'rh' }, // F4
        { midi: 69, onset: 1440, duration: 460, hand: 'rh' }, // A4
        { midi: 72, onset: 1440, duration: 460, hand: 'rh' }, // C5
        { midi: 64, onset: 1920, duration: 460, hand: 'rh' }, // E4
        { midi: 67, onset: 1920, duration: 460, hand: 'rh' }, // G4
        { midi: 72, onset: 1920, duration: 460, hand: 'rh' }, // C5
        { midi: 65, onset: 2400, duration: 220, hand: 'rh' }, // F4
        { midi: 69, onset: 2400, duration: 220, hand: 'rh' }, // A4
        { midi: 72, onset: 2400, duration: 220, hand: 'rh' }, // C5
        { midi: 64, onset: 2640, duration: 1140, hand: 'rh' }, // E4
        { midi: 67, onset: 2640, duration: 1140, hand: 'rh' }, // G4
        { midi: 72, onset: 2640, duration: 1140, hand: 'rh' }, // C5
        { midi: 65, onset: 3840, duration: 220, hand: 'rh' }, // F4
        { midi: 69, onset: 3840, duration: 220, hand: 'rh' }, // A4
        { midi: 72, onset: 3840, duration: 220, hand: 'rh' }, // C5
        { midi: 64, onset: 4080, duration: 220, hand: 'rh' }, // E4
        { midi: 67, onset: 4080, duration: 220, hand: 'rh' }, // G4
        { midi: 72, onset: 4080, duration: 220, hand: 'rh' }, // C5
        { midi: 65, onset: 4320, duration: 220, hand: 'rh' }, // F4
        { midi: 69, onset: 4320, duration: 220, hand: 'rh' }, // A4
        { midi: 72, onset: 4320, duration: 220, hand: 'rh' }, // C5
        { midi: 64, onset: 4560, duration: 700, hand: 'rh' }, // E4
        { midi: 67, onset: 4560, duration: 700, hand: 'rh' }, // G4
        { midi: 72, onset: 4560, duration: 700, hand: 'rh' }, // C5
        { midi: 65, onset: 5280, duration: 460, hand: 'rh' }, // F4
        { midi: 69, onset: 5280, duration: 460, hand: 'rh' }, // A4
        { midi: 72, onset: 5280, duration: 460, hand: 'rh' }, // C5
        { midi: 64, onset: 5760, duration: 1860, hand: 'rh' }, // E4
        { midi: 67, onset: 5760, duration: 1860, hand: 'rh' }, // G4
        { midi: 72, onset: 5760, duration: 1860, hand: 'rh' }, // C5
      ],
    },
    {
      stepNumber: 42,
      module: 'blues_l1',
      section: 'D',
      subsection: 'D2: LH Boogie, RH Triads',
      activity: 'D2.2: LH Boogie + RH I–IV Groove in G',
      direction: 'Left hand G, B, D, E and back; right hand B–D–G and C–E–G.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_perf_boogie_triads_g | blues',
      styleRef: 'l1a',
      successFeedback: 'The two-hand shuffle in G.',
      key: 'G major',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1a',
      },
      chordSymbols: ['G7', 'G7', 'G7', 'G7'],
      tempo: 90,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 43, onset: 0, duration: 460, hand: 'lh' }, // G2
        { midi: 47, onset: 480, duration: 460, hand: 'lh' }, // B2
        { midi: 50, onset: 960, duration: 460, hand: 'lh' }, // D3
        { midi: 52, onset: 1440, duration: 460, hand: 'lh' }, // E3
        { midi: 53, onset: 1920, duration: 460, hand: 'lh' }, // F3
        { midi: 52, onset: 2400, duration: 460, hand: 'lh' }, // E3
        { midi: 50, onset: 2880, duration: 460, hand: 'lh' }, // D3
        { midi: 47, onset: 3360, duration: 460, hand: 'lh' }, // B2
        { midi: 43, onset: 3840, duration: 460, hand: 'lh' }, // G2
        { midi: 47, onset: 4320, duration: 460, hand: 'lh' }, // B2
        { midi: 50, onset: 4800, duration: 460, hand: 'lh' }, // D3
        { midi: 52, onset: 5280, duration: 460, hand: 'lh' }, // E3
        { midi: 53, onset: 5760, duration: 460, hand: 'lh' }, // F3
        { midi: 52, onset: 6240, duration: 460, hand: 'lh' }, // E3
        { midi: 50, onset: 6720, duration: 460, hand: 'lh' }, // D3
        { midi: 47, onset: 7200, duration: 460, hand: 'lh' }, // B2
        { midi: 59, onset: 0, duration: 460, hand: 'rh' }, // B3
        { midi: 62, onset: 0, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 0, duration: 460, hand: 'rh' }, // G4
        { midi: 60, onset: 480, duration: 460, hand: 'rh' }, // C4
        { midi: 64, onset: 480, duration: 460, hand: 'rh' }, // E4
        { midi: 67, onset: 480, duration: 460, hand: 'rh' }, // G4
        { midi: 59, onset: 960, duration: 460, hand: 'rh' }, // B3
        { midi: 62, onset: 960, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 960, duration: 460, hand: 'rh' }, // G4
        { midi: 60, onset: 1440, duration: 460, hand: 'rh' }, // C4
        { midi: 64, onset: 1440, duration: 460, hand: 'rh' }, // E4
        { midi: 67, onset: 1440, duration: 460, hand: 'rh' }, // G4
        { midi: 59, onset: 1920, duration: 460, hand: 'rh' }, // B3
        { midi: 62, onset: 1920, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 1920, duration: 460, hand: 'rh' }, // G4
        { midi: 60, onset: 2400, duration: 220, hand: 'rh' }, // C4
        { midi: 64, onset: 2400, duration: 220, hand: 'rh' }, // E4
        { midi: 67, onset: 2400, duration: 220, hand: 'rh' }, // G4
        { midi: 59, onset: 2640, duration: 1140, hand: 'rh' }, // B3
        { midi: 62, onset: 2640, duration: 1140, hand: 'rh' }, // D4
        { midi: 67, onset: 2640, duration: 1140, hand: 'rh' }, // G4
        { midi: 60, onset: 3840, duration: 220, hand: 'rh' }, // C4
        { midi: 64, onset: 3840, duration: 220, hand: 'rh' }, // E4
        { midi: 67, onset: 3840, duration: 220, hand: 'rh' }, // G4
        { midi: 59, onset: 4080, duration: 220, hand: 'rh' }, // B3
        { midi: 62, onset: 4080, duration: 220, hand: 'rh' }, // D4
        { midi: 67, onset: 4080, duration: 220, hand: 'rh' }, // G4
        { midi: 60, onset: 4320, duration: 220, hand: 'rh' }, // C4
        { midi: 64, onset: 4320, duration: 220, hand: 'rh' }, // E4
        { midi: 67, onset: 4320, duration: 220, hand: 'rh' }, // G4
        { midi: 59, onset: 4560, duration: 700, hand: 'rh' }, // B3
        { midi: 62, onset: 4560, duration: 700, hand: 'rh' }, // D4
        { midi: 67, onset: 4560, duration: 700, hand: 'rh' }, // G4
        { midi: 60, onset: 5280, duration: 460, hand: 'rh' }, // C4
        { midi: 64, onset: 5280, duration: 460, hand: 'rh' }, // E4
        { midi: 67, onset: 5280, duration: 460, hand: 'rh' }, // G4
        { midi: 59, onset: 5760, duration: 1860, hand: 'rh' }, // B3
        { midi: 62, onset: 5760, duration: 1860, hand: 'rh' }, // D4
        { midi: 67, onset: 5760, duration: 1860, hand: 'rh' }, // G4
      ],
    },
    {
      stepNumber: 43,
      module: 'blues_l1',
      section: 'D',
      subsection: 'D3: The 8-Bar Blues, Both Hands',
      activity: 'D3.1: The 8-Bar Blues A — LH Boogie + RH 3-7 Shells',
      direction:
        'Left hand the boogie; right hand two notes a chord: B♭–E for C7, B–F for G7, A–E♭ for F7.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_perf_8bar_a | blues',
      styleRef: 'l1a',
      successFeedback: 'The whole 8-bar blues in two hands.',
      key: 'C major',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1a',
      },
      chordSymbols: ['C7', 'G7', 'F7', 'F7', 'C7', 'G7', 'C7', 'G7'],
      tempo: 90,
      swing: 67,
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
        { midi: 31, onset: 1920, duration: 460, hand: 'lh' }, // G1
        { midi: 40, onset: 2400, duration: 460, hand: 'lh' }, // E2
        { midi: 38, onset: 2880, duration: 460, hand: 'lh' }, // D2
        { midi: 35, onset: 3360, duration: 460, hand: 'lh' }, // B1
        { midi: 29, onset: 3840, duration: 460, hand: 'lh' }, // F1
        { midi: 33, onset: 4320, duration: 460, hand: 'lh' }, // A1
        { midi: 36, onset: 4800, duration: 460, hand: 'lh' }, // C2
        { midi: 38, onset: 5280, duration: 460, hand: 'lh' }, // D2
        { midi: 39, onset: 5760, duration: 460, hand: 'lh' }, // E♭2
        { midi: 38, onset: 6240, duration: 460, hand: 'lh' }, // D2
        { midi: 36, onset: 6720, duration: 460, hand: 'lh' }, // C2
        { midi: 33, onset: 7200, duration: 460, hand: 'lh' }, // A1
        { midi: 36, onset: 7680, duration: 460, hand: 'lh' }, // C2
        { midi: 40, onset: 8160, duration: 460, hand: 'lh' }, // E2
        { midi: 43, onset: 8640, duration: 460, hand: 'lh' }, // G2
        { midi: 45, onset: 9120, duration: 460, hand: 'lh' }, // A2
        { midi: 31, onset: 9600, duration: 460, hand: 'lh' }, // G1
        { midi: 40, onset: 10080, duration: 460, hand: 'lh' }, // E2
        { midi: 38, onset: 10560, duration: 460, hand: 'lh' }, // D2
        { midi: 35, onset: 11040, duration: 460, hand: 'lh' }, // B1
        { midi: 36, onset: 11520, duration: 460, hand: 'lh' }, // C2
        { midi: 40, onset: 12000, duration: 460, hand: 'lh' }, // E2
        { midi: 43, onset: 12480, duration: 460, hand: 'lh' }, // G2
        { midi: 45, onset: 12960, duration: 460, hand: 'lh' }, // A2
        { midi: 31, onset: 13440, duration: 460, hand: 'lh' }, // G1
        { midi: 40, onset: 13920, duration: 460, hand: 'lh' }, // E2
        { midi: 38, onset: 14400, duration: 460, hand: 'lh' }, // D2
        { midi: 35, onset: 14880, duration: 460, hand: 'lh' }, // B1
        { midi: 58, onset: 0, duration: 1860, hand: 'rh' }, // B♭3
        { midi: 64, onset: 0, duration: 1860, hand: 'rh' }, // E4
        { midi: 59, onset: 1920, duration: 1860, hand: 'rh' }, // B3
        { midi: 65, onset: 1920, duration: 1860, hand: 'rh' }, // F4
        { midi: 57, onset: 3840, duration: 1860, hand: 'rh' }, // A3
        { midi: 63, onset: 3840, duration: 1860, hand: 'rh' }, // E♭4
        { midi: 57, onset: 5760, duration: 1860, hand: 'rh' }, // A3
        { midi: 63, onset: 5760, duration: 1860, hand: 'rh' }, // E♭4
        { midi: 58, onset: 7680, duration: 1860, hand: 'rh' }, // B♭3
        { midi: 64, onset: 7680, duration: 1860, hand: 'rh' }, // E4
        { midi: 59, onset: 9600, duration: 1860, hand: 'rh' }, // B3
        { midi: 65, onset: 9600, duration: 1860, hand: 'rh' }, // F4
        { midi: 58, onset: 11520, duration: 1860, hand: 'rh' }, // B♭3
        { midi: 64, onset: 11520, duration: 1860, hand: 'rh' }, // E4
        { midi: 59, onset: 13440, duration: 1860, hand: 'rh' }, // B3
        { midi: 65, onset: 13440, duration: 1860, hand: 'rh' }, // F4
      ],
    },
    {
      stepNumber: 44,
      module: 'blues_l1',
      section: 'D',
      subsection: 'D3: The 8-Bar Blues, Both Hands',
      activity:
        'D3.2: The 8-Bar Blues B in G — LH 1-7 Shells + RH B.B. King–Style Chorus',
      direction:
        'Left hand root and ♭7; right hand a whole chorus in B.B. King’s style. Over C7 the B becomes B♭.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l1_perf_8bar_b_chorus | blues',
      styleRef: 'l1a',
      successFeedback: 'Eight bars of your own blues, both hands.',
      key: 'G major',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_chords_rh_melody',
        lh_role: 'chords',
        rh_role: 'melody',
        style_ref: 'l1a',
      },
      chordSymbols: ['G7', 'G7', 'C7', 'C7', 'G7', 'D7', 'G7', 'D7'],
      tempo: 90,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['chords', 'melody'],
      },
      targetNotes: [
        { midi: 43, onset: 0, duration: 1860, hand: 'lh' }, // G2
        { midi: 53, onset: 0, duration: 1860, hand: 'lh' }, // F3
        { midi: 43, onset: 1920, duration: 1860, hand: 'lh' }, // G2
        { midi: 53, onset: 1920, duration: 1860, hand: 'lh' }, // F3
        { midi: 48, onset: 3840, duration: 1860, hand: 'lh' }, // C3
        { midi: 58, onset: 3840, duration: 1860, hand: 'lh' }, // B♭3
        { midi: 48, onset: 5760, duration: 1860, hand: 'lh' }, // C3
        { midi: 58, onset: 5760, duration: 1860, hand: 'lh' }, // B♭3
        { midi: 43, onset: 7680, duration: 1860, hand: 'lh' }, // G2
        { midi: 53, onset: 7680, duration: 1860, hand: 'lh' }, // F3
        { midi: 50, onset: 9600, duration: 1860, hand: 'lh' }, // D3
        { midi: 60, onset: 9600, duration: 1860, hand: 'lh' }, // C4
        { midi: 43, onset: 11520, duration: 1860, hand: 'lh' }, // G2
        { midi: 53, onset: 11520, duration: 1860, hand: 'lh' }, // F3
        { midi: 50, onset: 13440, duration: 1860, hand: 'lh' }, // D3
        { midi: 60, onset: 13440, duration: 1860, hand: 'lh' }, // C4
        { midi: 74, onset: 240, duration: 220, hand: 'rh' }, // D5
        { midi: 76, onset: 480, duration: 220, hand: 'rh' }, // E5
        { midi: 79, onset: 720, duration: 700, hand: 'rh' }, // G5
        { midi: 70, onset: 1440, duration: 50, hand: 'rh' }, // A♯4
        { midi: 71, onset: 1500, duration: 400, hand: 'rh' }, // B4
        { midi: 74, onset: 1920, duration: 220, hand: 'rh' }, // D5
        { midi: 76, onset: 2160, duration: 220, hand: 'rh' }, // E5
        { midi: 79, onset: 2400, duration: 220, hand: 'rh' }, // G5
        { midi: 76, onset: 2640, duration: 1140, hand: 'rh' }, // E5
        { midi: 79, onset: 4080, duration: 220, hand: 'rh' }, // G5
        { midi: 76, onset: 4320, duration: 220, hand: 'rh' }, // E5
        { midi: 72, onset: 4560, duration: 700, hand: 'rh' }, // C5
        { midi: 70, onset: 5280, duration: 460, hand: 'rh' }, // B♭4
        { midi: 69, onset: 5760, duration: 220, hand: 'rh' }, // A4
        { midi: 67, onset: 6000, duration: 220, hand: 'rh' }, // G4
        { midi: 64, onset: 6240, duration: 220, hand: 'rh' }, // E4
        { midi: 67, onset: 6480, duration: 1140, hand: 'rh' }, // G4
        { midi: 74, onset: 7920, duration: 220, hand: 'rh' }, // D5
        { midi: 76, onset: 8160, duration: 220, hand: 'rh' }, // E5
        { midi: 79, onset: 8400, duration: 700, hand: 'rh' }, // G5
        { midi: 70, onset: 9120, duration: 50, hand: 'rh' }, // A♯4
        { midi: 71, onset: 9180, duration: 400, hand: 'rh' }, // B4
        { midi: 69, onset: 9600, duration: 220, hand: 'rh' }, // A4
        { midi: 72, onset: 9840, duration: 220, hand: 'rh' }, // C5
        { midi: 74, onset: 10080, duration: 220, hand: 'rh' }, // D5
        { midi: 78, onset: 10320, duration: 1140, hand: 'rh' }, // F♯5
        { midi: 76, onset: 11520, duration: 220, hand: 'rh' }, // E5
        { midi: 74, onset: 11760, duration: 220, hand: 'rh' }, // D5
        { midi: 71, onset: 12000, duration: 220, hand: 'rh' }, // B4
        { midi: 67, onset: 12240, duration: 1140, hand: 'rh' }, // G4
        { midi: 66, onset: 13920, duration: 220, hand: 'rh' }, // F♯4
        { midi: 69, onset: 14160, duration: 220, hand: 'rh' }, // A4
        { midi: 72, onset: 14400, duration: 460, hand: 'rh' }, // C5
        { midi: 69, onset: 14880, duration: 460, hand: 'rh' }, // A4
      ],
    },
  ],
};

// ── L2: The 12-Bar Blues ──

const bluesL2SectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    {
      stepNumber: 1,
      module: 'blues_l2',
      section: 'A',
      subsection: 'A1: Scale (E Blues)',
      activity: 'A1.1: E Blues Ascending (Out of Time)',
      direction:
        'E–G–A–B♭–B–D–E: the minor pentatonic with the ♭5 added. It fits all three chords of a blues.',
      assessment: 'pitch_order',
      tag: 'blues:l2_e_blues_asc_oot | blues',
      styleRef: 'l2a',
      successFeedback: 'B♭: the blue note between A and B.',
      key: 'E major',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      targetNotes: [
        { midi: 64, onset: 0, duration: 460 }, // E4
        { midi: 67, onset: 480, duration: 460 }, // G4
        { midi: 69, onset: 960, duration: 460 }, // A4
        { midi: 70, onset: 1440, duration: 460 }, // B♭4
        { midi: 71, onset: 1920, duration: 460 }, // B4
        { midi: 74, onset: 2400, duration: 460 }, // D5
        { midi: 76, onset: 2880, duration: 460 }, // E5
      ],
    },
    {
      stepNumber: 2,
      module: 'blues_l2',
      section: 'A',
      subsection: 'A1: Scale (E Blues)',
      activity: 'A1.2: E Blues Descending (Out of Time)',
      direction: 'Back down from the top E.',
      assessment: 'pitch_order',
      tag: 'blues:l2_e_blues_desc_oot | blues',
      styleRef: 'l2a',
      successFeedback: 'Down through the ♭5.',
      key: 'E major',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      targetNotes: [
        { midi: 76, onset: 0, duration: 460 }, // E5
        { midi: 74, onset: 480, duration: 460 }, // D5
        { midi: 71, onset: 960, duration: 460 }, // B4
        { midi: 70, onset: 1440, duration: 460 }, // B♭4
        { midi: 69, onset: 1920, duration: 460 }, // A4
        { midi: 67, onset: 2400, duration: 460 }, // G4
        { midi: 64, onset: 2880, duration: 460 }, // E4
      ],
    },
    {
      stepNumber: 3,
      module: 'blues_l2',
      section: 'A',
      subsection: 'A1: Scale (E Blues)',
      activity: 'A1.3: E Blues — Up & Down in Shuffled Eighths (In Time)',
      direction: 'Up and down in shuffled eighths.',
      assessment: 'pitch_order_timing',
      tag: 'blues:l2_e_blues_updown_it | blues',
      styleRef: 'l2a',
      successFeedback: 'The blues scale in E, shuffling.',
      key: 'E major',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      targetNotes: [
        { midi: 64, onset: 0, duration: 220 }, // E4
        { midi: 67, onset: 240, duration: 220 }, // G4
        { midi: 69, onset: 480, duration: 220 }, // A4
        { midi: 70, onset: 720, duration: 220 }, // B♭4
        { midi: 71, onset: 960, duration: 220 }, // B4
        { midi: 74, onset: 1200, duration: 220 }, // D5
        { midi: 76, onset: 1440, duration: 220 }, // E5
        { midi: 74, onset: 1680, duration: 220 }, // D5
        { midi: 71, onset: 1920, duration: 220 }, // B4
        { midi: 70, onset: 2160, duration: 220 }, // B♭4
        { midi: 69, onset: 2400, duration: 220 }, // A4
        { midi: 67, onset: 2640, duration: 220 }, // G4
        { midi: 64, onset: 2880, duration: 220 }, // E4
      ],
    },
    {
      stepNumber: 4,
      module: 'blues_l2',
      section: 'A',
      subsection: 'A2: Blues Phrases in E',
      activity: 'A2.1: Blues Phrase 1 in E',
      direction:
        'G, G♯, G, G♯ — the blue note rubbing against the 3 — then down to E.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_phrase_1_e | blues',
      styleRef: 'l2a',
      successFeedback: 'Phrase 1 in E.',
      key: 'E major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 10],
      scaleId: 'mixolydian',
      chordSymbols: ['E7'],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 79, onset: 0, duration: 220 }, // G5
        { midi: 80, onset: 240, duration: 220 }, // G♯5
        { midi: 79, onset: 480, duration: 220 }, // G5
        { midi: 80, onset: 720, duration: 220 }, // G♯5
        { midi: 76, onset: 960, duration: 940 }, // E5
      ],
    },
    {
      stepNumber: 5,
      module: 'blues_l2',
      section: 'A',
      subsection: 'A2: Blues Phrases in E',
      activity: 'A2.2: Blues Phrase 2 in E',
      direction: 'A, B, then G up to G♯ and down to E.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_phrase_2_e | blues',
      styleRef: 'l2a',
      successFeedback: 'Phrase 2 in E.',
      key: 'E major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 10],
      scaleId: 'mixolydian',
      chordSymbols: ['E7'],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 69, onset: 0, duration: 220 }, // A4
        { midi: 71, onset: 240, duration: 220 }, // B4
        { midi: 67, onset: 480, duration: 220 }, // G4
        { midi: 68, onset: 720, duration: 220 }, // G♯4
        { midi: 64, onset: 960, duration: 940 }, // E4
      ],
    },
    {
      stepNumber: 6,
      module: 'blues_l2',
      section: 'A',
      subsection: 'A2: Blues Phrases in E',
      activity: 'A2.3: Blues Phrase 3 in E',
      direction: 'D, C♯, B, A down the scale, then a quick G into G♯.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_phrase_3_e | blues',
      styleRef: 'l2a',
      successFeedback: 'Phrase 3 in E.',
      key: 'E major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 10],
      scaleId: 'mixolydian',
      chordSymbols: ['E7'],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 74, onset: 0, duration: 220 }, // D5
        { midi: 73, onset: 240, duration: 220 }, // C♯5
        { midi: 71, onset: 480, duration: 220 }, // B4
        { midi: 69, onset: 720, duration: 220 }, // A4
        { midi: 67, onset: 960, duration: 50 }, // G4
        { midi: 68, onset: 1020, duration: 880 }, // G♯4
      ],
    },
    {
      stepNumber: 7,
      module: 'blues_l2',
      section: 'A',
      subsection: 'A2: Blues Phrases in E',
      activity: 'A2.4: Blues Phrase 5 in E',
      direction: 'D, E, G, A, then B, held.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_phrase_5_e | blues',
      styleRef: 'l2a',
      successFeedback: 'Phrase 5 in E: the minor pentatonic over E7.',
      key: 'E major',
      scaleIntervals: [0, 3, 5, 7, 10],
      scaleId: 'minor_pentatonic',
      chordSymbols: ['E7'],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 62, onset: 0, duration: 220 }, // D4
        { midi: 64, onset: 240, duration: 220 }, // E4
        { midi: 67, onset: 480, duration: 220 }, // G4
        { midi: 69, onset: 720, duration: 220 }, // A4
        { midi: 71, onset: 960, duration: 940 }, // B4
      ],
    },
    {
      stepNumber: 8,
      module: 'blues_l2',
      section: 'A',
      subsection: 'A2: Blues Phrases in E',
      activity: 'A2.5: Blues Phrase 6 in E',
      direction: 'Four quick sixteenths down B–A–G–E, then D up to E, held.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_phrase_6_e | blues',
      styleRef: 'l2a',
      successFeedback: 'Phrase 6 in E.',
      key: 'E major',
      scaleIntervals: [0, 3, 5, 7, 10],
      scaleId: 'minor_pentatonic',
      chordSymbols: ['E7'],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 71, onset: 0, duration: 110 }, // B4
        { midi: 69, onset: 120, duration: 110 }, // A4
        { midi: 67, onset: 240, duration: 110 }, // G4
        { midi: 64, onset: 360, duration: 110 }, // E4
        { midi: 62, onset: 480, duration: 220 }, // D4
        { midi: 64, onset: 720, duration: 1140 }, // E4
      ],
    },
    {
      stepNumber: 9,
      module: 'blues_l2',
      section: 'A',
      subsection: 'A2: Blues Phrases in E',
      activity: 'A2.6: Blues Phrase 8 in E',
      direction: 'B and D together, low E, A and C♯, low E, then G and B.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_phrase_8_e | blues',
      styleRef: 'l2a',
      successFeedback: 'Phrase 8 in E.',
      key: 'E major',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      chordSymbols: ['E7'],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 70, onset: 0, duration: 50 }, // A♯4
        { midi: 74, onset: 0, duration: 220 }, // D5
        { midi: 71, onset: 60, duration: 160 }, // B4
        { midi: 64, onset: 240, duration: 220 }, // E4
        { midi: 69, onset: 480, duration: 220 }, // A4
        { midi: 73, onset: 480, duration: 220 }, // C♯5
        { midi: 64, onset: 720, duration: 220 }, // E4
        { midi: 67, onset: 960, duration: 940 }, // G4
        { midi: 71, onset: 960, duration: 940 }, // B4
      ],
    },
    {
      stepNumber: 10,
      module: 'blues_l2',
      section: 'A',
      subsection: 'A3: Phrases over the IV and the V',
      activity: 'A3.1: Phrase 5 over A7 — As Written',
      direction:
        'Phrase 5 in E, now over A7, the IV: D, E, G, A, B. Every note fits.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_phrase_5_iv | blues',
      styleRef: 'l2a',
      successFeedback: 'The same notes, a new chord under them.',
      key: 'E major',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      chordSymbols: ['A7'],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 62, onset: 0, duration: 220 }, // D4
        { midi: 64, onset: 240, duration: 220 }, // E4
        { midi: 67, onset: 480, duration: 220 }, // G4
        { midi: 69, onset: 720, duration: 220 }, // A4
        { midi: 71, onset: 960, duration: 940 }, // B4
      ],
    },
    {
      stepNumber: 11,
      module: 'blues_l2',
      section: 'A',
      subsection: 'A3: Phrases over the IV and the V',
      activity: 'A3.2: Phrase 3 over A7 — Bend the G♯ Down',
      direction:
        'Over A7, G♯ is the chord’s major 7th and clashes. Play G instead: D, C♯, B, A, then F♯ into G.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_phrase_3_iv | blues',
      styleRef: 'l2a',
      successFeedback: 'G over A7: the ♭7 of the IV and the blue note of E.',
      key: 'E major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 10],
      scaleId: 'mixolydian',
      chordSymbols: ['A7'],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 74, onset: 0, duration: 220 }, // D5
        { midi: 73, onset: 240, duration: 220 }, // C♯5
        { midi: 71, onset: 480, duration: 220 }, // B4
        { midi: 69, onset: 720, duration: 220 }, // A4
        { midi: 66, onset: 960, duration: 50 }, // F♯4
        { midi: 67, onset: 1020, duration: 880 }, // G4
      ],
    },
    {
      stepNumber: 12,
      module: 'blues_l2',
      section: 'A',
      subsection: 'A3: Phrases over the IV and the V',
      activity: 'A3.3: Phrase 7 over A7 — Bend the G♯ Down',
      direction:
        'Double stops over A7, ending on G with E above instead of G♯.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_phrase_7_iv | blues',
      styleRef: 'l2a',
      successFeedback: 'The IV changes one note.',
      key: 'E major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 10],
      scaleId: 'mixolydian',
      chordSymbols: ['A7'],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 70, onset: 0, duration: 50 }, // A♯4
        { midi: 76, onset: 0, duration: 460 }, // E5
        { midi: 71, onset: 60, duration: 400 }, // B4
        { midi: 70, onset: 480, duration: 50 }, // A♯4
        { midi: 76, onset: 480, duration: 220 }, // E5
        { midi: 69, onset: 540, duration: 160 }, // A4
        { midi: 64, onset: 720, duration: 220 }, // E4
        { midi: 66, onset: 960, duration: 50 }, // F♯4
        { midi: 76, onset: 960, duration: 940 }, // E5
        { midi: 67, onset: 1020, duration: 880 }, // G4
      ],
    },
    {
      stepNumber: 13,
      module: 'blues_l2',
      section: 'A',
      subsection: 'A3: Phrases over the IV and the V',
      activity: 'A3.4: Phrase 4 over B7 — As Written',
      direction:
        'Over B7, the V, the E blues notes all work: a triplet G–F♯–E, then F♯, C♯ and E.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_phrase_4_v | blues',
      styleRef: 'l2a',
      successFeedback: 'Over the V the blues notes become color.',
      key: 'E major',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      chordSymbols: ['B7'],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 79, onset: 0, duration: 140 }, // G5
        { midi: 78, onset: 160, duration: 140 }, // F♯5
        { midi: 76, onset: 320, duration: 140 }, // E5
        { midi: 78, onset: 480, duration: 220 }, // F♯5
        { midi: 73, onset: 720, duration: 220 }, // C♯5
        { midi: 76, onset: 960, duration: 940 }, // E5
      ],
    },
    {
      stepNumber: 14,
      module: 'blues_l2',
      section: 'A',
      subsection: 'A4: Phrases Through the 12-Bar',
      activity: 'A4.1: Phrase 5 Through the 12-Bar (E)',
      direction:
        'One riff in every bar of the I–IV–V blues: D, E, G, A, B. The notes stay; the chords change under them.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_riff_5_e | blues',
      styleRef: 'l2a',
      successFeedback: 'A riff blues: one phrase, three colors.',
      key: 'E major',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      chordSymbols: [
        'E7',
        'E7',
        'E7',
        'E7',
        'A7',
        'A7',
        'E7',
        'E7',
        'B7',
        'A7',
        'E7',
        'E7',
      ],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 62, onset: 0, duration: 220 }, // D4
        { midi: 64, onset: 240, duration: 220 }, // E4
        { midi: 67, onset: 480, duration: 220 }, // G4
        { midi: 69, onset: 720, duration: 220 }, // A4
        { midi: 71, onset: 960, duration: 940 }, // B4
        { midi: 62, onset: 1920, duration: 220 }, // D4
        { midi: 64, onset: 2160, duration: 220 }, // E4
        { midi: 67, onset: 2400, duration: 220 }, // G4
        { midi: 69, onset: 2640, duration: 220 }, // A4
        { midi: 71, onset: 2880, duration: 940 }, // B4
        { midi: 62, onset: 3840, duration: 220 }, // D4
        { midi: 64, onset: 4080, duration: 220 }, // E4
        { midi: 67, onset: 4320, duration: 220 }, // G4
        { midi: 69, onset: 4560, duration: 220 }, // A4
        { midi: 71, onset: 4800, duration: 940 }, // B4
        { midi: 62, onset: 5760, duration: 220 }, // D4
        { midi: 64, onset: 6000, duration: 220 }, // E4
        { midi: 67, onset: 6240, duration: 220 }, // G4
        { midi: 69, onset: 6480, duration: 220 }, // A4
        { midi: 71, onset: 6720, duration: 940 }, // B4
        { midi: 62, onset: 7680, duration: 220 }, // D4
        { midi: 64, onset: 7920, duration: 220 }, // E4
        { midi: 67, onset: 8160, duration: 220 }, // G4
        { midi: 69, onset: 8400, duration: 220 }, // A4
        { midi: 71, onset: 8640, duration: 940 }, // B4
        { midi: 62, onset: 9600, duration: 220 }, // D4
        { midi: 64, onset: 9840, duration: 220 }, // E4
        { midi: 67, onset: 10080, duration: 220 }, // G4
        { midi: 69, onset: 10320, duration: 220 }, // A4
        { midi: 71, onset: 10560, duration: 940 }, // B4
        { midi: 62, onset: 11520, duration: 220 }, // D4
        { midi: 64, onset: 11760, duration: 220 }, // E4
        { midi: 67, onset: 12000, duration: 220 }, // G4
        { midi: 69, onset: 12240, duration: 220 }, // A4
        { midi: 71, onset: 12480, duration: 940 }, // B4
        { midi: 62, onset: 13440, duration: 220 }, // D4
        { midi: 64, onset: 13680, duration: 220 }, // E4
        { midi: 67, onset: 13920, duration: 220 }, // G4
        { midi: 69, onset: 14160, duration: 220 }, // A4
        { midi: 71, onset: 14400, duration: 940 }, // B4
        { midi: 62, onset: 15360, duration: 220 }, // D4
        { midi: 64, onset: 15600, duration: 220 }, // E4
        { midi: 67, onset: 15840, duration: 220 }, // G4
        { midi: 69, onset: 16080, duration: 220 }, // A4
        { midi: 71, onset: 16320, duration: 940 }, // B4
        { midi: 62, onset: 17280, duration: 220 }, // D4
        { midi: 64, onset: 17520, duration: 220 }, // E4
        { midi: 67, onset: 17760, duration: 220 }, // G4
        { midi: 69, onset: 18000, duration: 220 }, // A4
        { midi: 71, onset: 18240, duration: 940 }, // B4
        { midi: 62, onset: 19200, duration: 220 }, // D4
        { midi: 64, onset: 19440, duration: 220 }, // E4
        { midi: 67, onset: 19680, duration: 220 }, // G4
        { midi: 69, onset: 19920, duration: 220 }, // A4
        { midi: 71, onset: 20160, duration: 940 }, // B4
        { midi: 62, onset: 21120, duration: 220 }, // D4
        { midi: 64, onset: 21360, duration: 220 }, // E4
        { midi: 67, onset: 21600, duration: 220 }, // G4
        { midi: 69, onset: 21840, duration: 220 }, // A4
        { midi: 71, onset: 22080, duration: 940 }, // B4
      ],
    },
    {
      stepNumber: 15,
      module: 'blues_l2',
      section: 'A',
      subsection: 'A4: Phrases Through the 12-Bar',
      activity: 'A4.2: Phrase 3 Through the 12-Bar, with the Bend (G)',
      direction:
        'Phrase 3 in G through the quick-change blues. Over C7 — bars 2, 5, 6 and 10 — the B bends down to B♭.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_riff_3_g | blues',
      styleRef: 'l2a',
      successFeedback: 'You let the IV change the phrase.',
      key: 'G major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 10],
      scaleId: 'mixolydian',
      chordSymbols: [
        'G7',
        'C7',
        'G7',
        'G7',
        'C7',
        'C7',
        'G7',
        'G7',
        'D7',
        'C7',
        'G7',
        'D7',
      ],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 77, onset: 0, duration: 220 }, // F5
        { midi: 76, onset: 240, duration: 220 }, // E5
        { midi: 74, onset: 480, duration: 220 }, // D5
        { midi: 72, onset: 720, duration: 220 }, // C5
        { midi: 70, onset: 960, duration: 50 }, // A♯4
        { midi: 71, onset: 1020, duration: 880 }, // B4
        { midi: 77, onset: 1920, duration: 220 }, // F5
        { midi: 76, onset: 2160, duration: 220 }, // E5
        { midi: 74, onset: 2400, duration: 220 }, // D5
        { midi: 72, onset: 2640, duration: 220 }, // C5
        { midi: 69, onset: 2880, duration: 50 }, // A4
        { midi: 70, onset: 2940, duration: 880 }, // B♭4
        { midi: 77, onset: 3840, duration: 220 }, // F5
        { midi: 76, onset: 4080, duration: 220 }, // E5
        { midi: 74, onset: 4320, duration: 220 }, // D5
        { midi: 72, onset: 4560, duration: 220 }, // C5
        { midi: 70, onset: 4800, duration: 50 }, // A♯4
        { midi: 71, onset: 4860, duration: 880 }, // B4
        { midi: 77, onset: 5760, duration: 220 }, // F5
        { midi: 76, onset: 6000, duration: 220 }, // E5
        { midi: 74, onset: 6240, duration: 220 }, // D5
        { midi: 72, onset: 6480, duration: 220 }, // C5
        { midi: 70, onset: 6720, duration: 50 }, // A♯4
        { midi: 71, onset: 6780, duration: 880 }, // B4
        { midi: 77, onset: 7680, duration: 220 }, // F5
        { midi: 76, onset: 7920, duration: 220 }, // E5
        { midi: 74, onset: 8160, duration: 220 }, // D5
        { midi: 72, onset: 8400, duration: 220 }, // C5
        { midi: 69, onset: 8640, duration: 50 }, // A4
        { midi: 70, onset: 8700, duration: 880 }, // B♭4
        { midi: 77, onset: 9600, duration: 220 }, // F5
        { midi: 76, onset: 9840, duration: 220 }, // E5
        { midi: 74, onset: 10080, duration: 220 }, // D5
        { midi: 72, onset: 10320, duration: 220 }, // C5
        { midi: 69, onset: 10560, duration: 50 }, // A4
        { midi: 70, onset: 10620, duration: 880 }, // B♭4
        { midi: 77, onset: 11520, duration: 220 }, // F5
        { midi: 76, onset: 11760, duration: 220 }, // E5
        { midi: 74, onset: 12000, duration: 220 }, // D5
        { midi: 72, onset: 12240, duration: 220 }, // C5
        { midi: 70, onset: 12480, duration: 50 }, // A♯4
        { midi: 71, onset: 12540, duration: 880 }, // B4
        { midi: 77, onset: 13440, duration: 220 }, // F5
        { midi: 76, onset: 13680, duration: 220 }, // E5
        { midi: 74, onset: 13920, duration: 220 }, // D5
        { midi: 72, onset: 14160, duration: 220 }, // C5
        { midi: 70, onset: 14400, duration: 50 }, // A♯4
        { midi: 71, onset: 14460, duration: 880 }, // B4
        { midi: 77, onset: 15360, duration: 220 }, // F5
        { midi: 76, onset: 15600, duration: 220 }, // E5
        { midi: 74, onset: 15840, duration: 220 }, // D5
        { midi: 72, onset: 16080, duration: 220 }, // C5
        { midi: 70, onset: 16320, duration: 50 }, // A♯4
        { midi: 71, onset: 16380, duration: 880 }, // B4
        { midi: 77, onset: 17280, duration: 220 }, // F5
        { midi: 76, onset: 17520, duration: 220 }, // E5
        { midi: 74, onset: 17760, duration: 220 }, // D5
        { midi: 72, onset: 18000, duration: 220 }, // C5
        { midi: 69, onset: 18240, duration: 50 }, // A4
        { midi: 70, onset: 18300, duration: 880 }, // B♭4
        { midi: 77, onset: 19200, duration: 220 }, // F5
        { midi: 76, onset: 19440, duration: 220 }, // E5
        { midi: 74, onset: 19680, duration: 220 }, // D5
        { midi: 72, onset: 19920, duration: 220 }, // C5
        { midi: 70, onset: 20160, duration: 50 }, // A♯4
        { midi: 71, onset: 20220, duration: 880 }, // B4
        { midi: 77, onset: 21120, duration: 220 }, // F5
        { midi: 76, onset: 21360, duration: 220 }, // E5
        { midi: 74, onset: 21600, duration: 220 }, // D5
        { midi: 72, onset: 21840, duration: 220 }, // C5
        { midi: 70, onset: 22080, duration: 50 }, // A♯4
        { midi: 71, onset: 22140, duration: 880 }, // B4
      ],
    },
    {
      stepNumber: 16,
      module: 'blues_l2',
      section: 'A',
      subsection: 'A4: Phrases Through the 12-Bar',
      activity: 'A4.3: Phrase 1 Through the 12-Bar, Moving with the Chords (E)',
      direction:
        'Phrase 1 on each chord’s own root: in E over E7, in A over A7, in B over B7.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_riff_1_moving | blues',
      styleRef: 'l2a',
      successFeedback: 'The phrase follows the changes.',
      key: 'E major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 10],
      scaleId: 'mixolydian',
      chordSymbols: [
        'E7',
        'E7',
        'E7',
        'E7',
        'A7',
        'A7',
        'E7',
        'E7',
        'B7',
        'A7',
        'E7',
        'E7',
      ],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 79, onset: 0, duration: 220 }, // G5
        { midi: 80, onset: 240, duration: 220 }, // G♯5
        { midi: 79, onset: 480, duration: 220 }, // G5
        { midi: 80, onset: 720, duration: 220 }, // G♯5
        { midi: 76, onset: 960, duration: 940 }, // E5
        { midi: 79, onset: 1920, duration: 220 }, // G5
        { midi: 80, onset: 2160, duration: 220 }, // G♯5
        { midi: 79, onset: 2400, duration: 220 }, // G5
        { midi: 80, onset: 2640, duration: 220 }, // G♯5
        { midi: 76, onset: 2880, duration: 940 }, // E5
        { midi: 79, onset: 3840, duration: 220 }, // G5
        { midi: 80, onset: 4080, duration: 220 }, // G♯5
        { midi: 79, onset: 4320, duration: 220 }, // G5
        { midi: 80, onset: 4560, duration: 220 }, // G♯5
        { midi: 76, onset: 4800, duration: 940 }, // E5
        { midi: 79, onset: 5760, duration: 220 }, // G5
        { midi: 80, onset: 6000, duration: 220 }, // G♯5
        { midi: 79, onset: 6240, duration: 220 }, // G5
        { midi: 80, onset: 6480, duration: 220 }, // G♯5
        { midi: 76, onset: 6720, duration: 940 }, // E5
        { midi: 72, onset: 7680, duration: 220 }, // C5
        { midi: 73, onset: 7920, duration: 220 }, // C♯5
        { midi: 72, onset: 8160, duration: 220 }, // C5
        { midi: 73, onset: 8400, duration: 220 }, // C♯5
        { midi: 69, onset: 8640, duration: 940 }, // A4
        { midi: 72, onset: 9600, duration: 220 }, // C5
        { midi: 73, onset: 9840, duration: 220 }, // C♯5
        { midi: 72, onset: 10080, duration: 220 }, // C5
        { midi: 73, onset: 10320, duration: 220 }, // C♯5
        { midi: 69, onset: 10560, duration: 940 }, // A4
        { midi: 79, onset: 11520, duration: 220 }, // G5
        { midi: 80, onset: 11760, duration: 220 }, // G♯5
        { midi: 79, onset: 12000, duration: 220 }, // G5
        { midi: 80, onset: 12240, duration: 220 }, // G♯5
        { midi: 76, onset: 12480, duration: 940 }, // E5
        { midi: 79, onset: 13440, duration: 220 }, // G5
        { midi: 80, onset: 13680, duration: 220 }, // G♯5
        { midi: 79, onset: 13920, duration: 220 }, // G5
        { midi: 80, onset: 14160, duration: 220 }, // G♯5
        { midi: 76, onset: 14400, duration: 940 }, // E5
        { midi: 74, onset: 15360, duration: 220 }, // D5
        { midi: 75, onset: 15600, duration: 220 }, // D♯5
        { midi: 74, onset: 15840, duration: 220 }, // D5
        { midi: 75, onset: 16080, duration: 220 }, // D♯5
        { midi: 71, onset: 16320, duration: 940 }, // B4
        { midi: 72, onset: 17280, duration: 220 }, // C5
        { midi: 73, onset: 17520, duration: 220 }, // C♯5
        { midi: 72, onset: 17760, duration: 220 }, // C5
        { midi: 73, onset: 18000, duration: 220 }, // C♯5
        { midi: 69, onset: 18240, duration: 940 }, // A4
        { midi: 79, onset: 19200, duration: 220 }, // G5
        { midi: 80, onset: 19440, duration: 220 }, // G♯5
        { midi: 79, onset: 19680, duration: 220 }, // G5
        { midi: 80, onset: 19920, duration: 220 }, // G♯5
        { midi: 76, onset: 20160, duration: 940 }, // E5
        { midi: 79, onset: 21120, duration: 220 }, // G5
        { midi: 80, onset: 21360, duration: 220 }, // G♯5
        { midi: 79, onset: 21600, duration: 220 }, // G5
        { midi: 80, onset: 21840, duration: 220 }, // G♯5
        { midi: 76, onset: 22080, duration: 940 }, // E5
      ],
    },
  ],
};

const bluesL2SectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    {
      stepNumber: 17,
      module: 'blues_l2',
      section: 'B',
      subsection: 'B1: Shells in Rhythm (Shuffle)',
      activity: 'B1.1: Play-Along — Peter’s C Jam Blues Left Hand',
      direction:
        'E–B♭–D for C7, E♭–A–C for F7, F–B–D for G7, each to the nearest notes of the next — in Peter’s rhythm.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_cjam_lh | blues',
      styleRef: 'l2a',
      successFeedback: 'Three voicings that barely move through a whole blues.',
      key: 'C major',
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
      swing: 67,
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
    {
      stepNumber: 18,
      module: 'blues_l2',
      section: 'B',
      subsection: 'B1: Shells in Rhythm (Shuffle)',
      activity: 'B1.2: Play-Along — The C Jam Rhythm Through the 12-Bar in G',
      direction:
        'The same rhythm through the quick-change blues in G: 7-3-5 and 3-7-9, each chord to the nearest notes of the next.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_cjam_rhythm_g | blues',
      styleRef: 'l2a',
      successFeedback: 'Peter’s comping rhythm in a new key and form.',
      key: 'G major',
      chordSymbols: [
        'G7',
        'C9',
        'G7',
        'G7',
        'C9',
        'C9',
        'G7',
        'G7',
        'D9',
        'C9',
        'G7',
        'D9',
      ],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 53, onset: 0, duration: 220 }, // F3
        { midi: 59, onset: 0, duration: 220 }, // B3
        { midi: 62, onset: 0, duration: 220 }, // D4
        { midi: 53, onset: 240, duration: 220 }, // F3
        { midi: 59, onset: 240, duration: 220 }, // B3
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
        { midi: 53, onset: 3840, duration: 700 }, // F3
        { midi: 59, onset: 3840, duration: 700 }, // B3
        { midi: 62, onset: 3840, duration: 700 }, // D4
        { midi: 53, onset: 4560, duration: 220 }, // F3
        { midi: 59, onset: 4560, duration: 220 }, // B3
        { midi: 62, onset: 4560, duration: 220 }, // D4
        { midi: 52, onset: 7680, duration: 220 }, // E3
        { midi: 58, onset: 7680, duration: 220 }, // B♭3
        { midi: 62, onset: 7680, duration: 220 }, // D4
        { midi: 52, onset: 7920, duration: 220 }, // E3
        { midi: 58, onset: 7920, duration: 220 }, // B♭3
        { midi: 62, onset: 7920, duration: 220 }, // D4
        { midi: 52, onset: 9600, duration: 220 }, // E3
        { midi: 58, onset: 9600, duration: 220 }, // B♭3
        { midi: 62, onset: 9600, duration: 220 }, // D4
        { midi: 52, onset: 9840, duration: 220 }, // E3
        { midi: 58, onset: 9840, duration: 220 }, // B♭3
        { midi: 62, onset: 9840, duration: 220 }, // D4
        { midi: 52, onset: 10560, duration: 220 }, // E3
        { midi: 58, onset: 10560, duration: 220 }, // B♭3
        { midi: 62, onset: 10560, duration: 220 }, // D4
        { midi: 52, onset: 10800, duration: 220 }, // E3
        { midi: 58, onset: 10800, duration: 220 }, // B♭3
        { midi: 62, onset: 10800, duration: 220 }, // D4
        { midi: 53, onset: 11520, duration: 700 }, // F3
        { midi: 59, onset: 11520, duration: 700 }, // B3
        { midi: 62, onset: 11520, duration: 700 }, // D4
        { midi: 53, onset: 12240, duration: 220 }, // F3
        { midi: 59, onset: 12240, duration: 220 }, // B3
        { midi: 62, onset: 12240, duration: 220 }, // D4
        { midi: 54, onset: 15360, duration: 220 }, // G♭3
        { midi: 60, onset: 15360, duration: 220 }, // C4
        { midi: 64, onset: 15360, duration: 220 }, // E4
        { midi: 54, onset: 15600, duration: 220 }, // G♭3
        { midi: 60, onset: 15600, duration: 220 }, // C4
        { midi: 64, onset: 15600, duration: 220 }, // E4
        { midi: 52, onset: 17280, duration: 220 }, // E3
        { midi: 58, onset: 17280, duration: 220 }, // B♭3
        { midi: 62, onset: 17280, duration: 220 }, // D4
        { midi: 52, onset: 17520, duration: 220 }, // E3
        { midi: 58, onset: 17520, duration: 220 }, // B♭3
        { midi: 62, onset: 17520, duration: 220 }, // D4
        { midi: 52, onset: 18240, duration: 220 }, // E3
        { midi: 58, onset: 18240, duration: 220 }, // B♭3
        { midi: 62, onset: 18240, duration: 220 }, // D4
        { midi: 52, onset: 18480, duration: 220 }, // E3
        { midi: 58, onset: 18480, duration: 220 }, // B♭3
        { midi: 62, onset: 18480, duration: 220 }, // D4
        { midi: 53, onset: 19200, duration: 700 }, // F3
        { midi: 59, onset: 19200, duration: 700 }, // B3
        { midi: 62, onset: 19200, duration: 700 }, // D4
        { midi: 53, onset: 19920, duration: 220 }, // F3
        { midi: 59, onset: 19920, duration: 220 }, // B3
        { midi: 62, onset: 19920, duration: 220 }, // D4
      ],
    },
    {
      stepNumber: 19,
      module: 'blues_l2',
      section: 'B',
      subsection: 'B2: 7-3-5 and 3-7-9 (Half-Time Shuffle)',
      activity: 'B2.1: 7-3-5 and 3-7-9 on E7, A7 and B7 (Out of Time)',
      direction:
        'One voicing for each chord of the blues in E, each as close as it can be to the one before.',
      assessment: 'pitch_order',
      tag: 'blues:l2_735_e_chords | blues',
      styleRef: 'l2b',
      successFeedback: 'Three chords, small moves.',
      key: 'E major',
      chordSymbols: ['E7', 'A9', 'B9'],
      targetNotes: [
        { midi: 50, onset: 0, duration: 1800 }, // D3
        { midi: 56, onset: 0, duration: 1800 }, // G♯3
        { midi: 59, onset: 0, duration: 1800 }, // B3
        { midi: 49, onset: 1920, duration: 1800 }, // C♯3
        { midi: 55, onset: 1920, duration: 1800 }, // G3
        { midi: 59, onset: 1920, duration: 1800 }, // B3
        { midi: 51, onset: 3840, duration: 1800 }, // D♯3
        { midi: 57, onset: 3840, duration: 1800 }, // A3
        { midi: 61, onset: 3840, duration: 1800 }, // C♯4
      ],
    },
    {
      stepNumber: 20,
      module: 'blues_l2',
      section: 'B',
      subsection: 'B2: 7-3-5 and 3-7-9 (Half-Time Shuffle)',
      activity: 'B2.2: 7-3-5 and 3-7-9 — the 12-Bar in E (Out of Time)',
      direction:
        'Through the quick-change blues: E7, A7, E7, E7, A7, A7, E7, E7, B7, A7, E7, B7.',
      assessment: 'pitch_order',
      tag: 'blues:l2_735_e_form | blues',
      styleRef: 'l2b',
      successFeedback: 'Your left hand barely moves through the form.',
      key: 'E major',
      chordSymbols: [
        'E7',
        'A9',
        'E7',
        'E7',
        'A9',
        'A9',
        'E7',
        'E7',
        'B9',
        'A9',
        'E7',
        'B9',
      ],
      targetNotes: [
        { midi: 50, onset: 0, duration: 1800 }, // D3
        { midi: 56, onset: 0, duration: 1800 }, // G♯3
        { midi: 59, onset: 0, duration: 1800 }, // B3
        { midi: 49, onset: 1920, duration: 1800 }, // C♯3
        { midi: 55, onset: 1920, duration: 1800 }, // G3
        { midi: 59, onset: 1920, duration: 1800 }, // B3
        { midi: 50, onset: 3840, duration: 1800 }, // D3
        { midi: 56, onset: 3840, duration: 1800 }, // G♯3
        { midi: 59, onset: 3840, duration: 1800 }, // B3
        { midi: 50, onset: 5760, duration: 1800 }, // D3
        { midi: 56, onset: 5760, duration: 1800 }, // G♯3
        { midi: 59, onset: 5760, duration: 1800 }, // B3
        { midi: 49, onset: 7680, duration: 1800 }, // C♯3
        { midi: 55, onset: 7680, duration: 1800 }, // G3
        { midi: 59, onset: 7680, duration: 1800 }, // B3
        { midi: 49, onset: 9600, duration: 1800 }, // C♯3
        { midi: 55, onset: 9600, duration: 1800 }, // G3
        { midi: 59, onset: 9600, duration: 1800 }, // B3
        { midi: 50, onset: 11520, duration: 1800 }, // D3
        { midi: 56, onset: 11520, duration: 1800 }, // G♯3
        { midi: 59, onset: 11520, duration: 1800 }, // B3
        { midi: 50, onset: 13440, duration: 1800 }, // D3
        { midi: 56, onset: 13440, duration: 1800 }, // G♯3
        { midi: 59, onset: 13440, duration: 1800 }, // B3
        { midi: 51, onset: 15360, duration: 1800 }, // D♯3
        { midi: 57, onset: 15360, duration: 1800 }, // A3
        { midi: 61, onset: 15360, duration: 1800 }, // C♯4
        { midi: 49, onset: 17280, duration: 1800 }, // C♯3
        { midi: 55, onset: 17280, duration: 1800 }, // G3
        { midi: 59, onset: 17280, duration: 1800 }, // B3
        { midi: 50, onset: 19200, duration: 1800 }, // D3
        { midi: 56, onset: 19200, duration: 1800 }, // G♯3
        { midi: 59, onset: 19200, duration: 1800 }, // B3
        { midi: 51, onset: 21120, duration: 1800 }, // D♯3
        { midi: 57, onset: 21120, duration: 1800 }, // A3
        { midi: 61, onset: 21120, duration: 1800 }, // C♯4
      ],
    },
    {
      stepNumber: 21,
      module: 'blues_l2',
      section: 'B',
      subsection: 'B2: 7-3-5 and 3-7-9 (Half-Time Shuffle)',
      activity: 'B2.3: Play-Along — 7-3-5 and 3-7-9, Half-Time Shuffle in E',
      direction:
        'One chord a bar over the Purdie Shuffle, counted in four big beats.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_735_e_play | blues',
      styleRef: 'l2b',
      successFeedback: 'The half-time shuffle under your chords.',
      key: 'E major',
      chordSymbols: [
        'E7',
        'A9',
        'E7',
        'E7',
        'A9',
        'A9',
        'E7',
        'E7',
        'B9',
        'A9',
        'E7',
        'B9',
      ],
      timeSignature: [12, 8],
      tempo: 150,
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 50, onset: 0, duration: 2820 }, // D3
        { midi: 56, onset: 0, duration: 2820 }, // G♯3
        { midi: 59, onset: 0, duration: 2820 }, // B3
        { midi: 49, onset: 2880, duration: 2820 }, // C♯3
        { midi: 55, onset: 2880, duration: 2820 }, // G3
        { midi: 59, onset: 2880, duration: 2820 }, // B3
        { midi: 50, onset: 5760, duration: 2820 }, // D3
        { midi: 56, onset: 5760, duration: 2820 }, // G♯3
        { midi: 59, onset: 5760, duration: 2820 }, // B3
        { midi: 50, onset: 8640, duration: 2820 }, // D3
        { midi: 56, onset: 8640, duration: 2820 }, // G♯3
        { midi: 59, onset: 8640, duration: 2820 }, // B3
        { midi: 49, onset: 11520, duration: 2820 }, // C♯3
        { midi: 55, onset: 11520, duration: 2820 }, // G3
        { midi: 59, onset: 11520, duration: 2820 }, // B3
        { midi: 49, onset: 14400, duration: 2820 }, // C♯3
        { midi: 55, onset: 14400, duration: 2820 }, // G3
        { midi: 59, onset: 14400, duration: 2820 }, // B3
        { midi: 50, onset: 17280, duration: 2820 }, // D3
        { midi: 56, onset: 17280, duration: 2820 }, // G♯3
        { midi: 59, onset: 17280, duration: 2820 }, // B3
        { midi: 50, onset: 20160, duration: 2820 }, // D3
        { midi: 56, onset: 20160, duration: 2820 }, // G♯3
        { midi: 59, onset: 20160, duration: 2820 }, // B3
        { midi: 51, onset: 23040, duration: 2820 }, // D♯3
        { midi: 57, onset: 23040, duration: 2820 }, // A3
        { midi: 61, onset: 23040, duration: 2820 }, // C♯4
        { midi: 49, onset: 25920, duration: 2820 }, // C♯3
        { midi: 55, onset: 25920, duration: 2820 }, // G3
        { midi: 59, onset: 25920, duration: 2820 }, // B3
        { midi: 50, onset: 28800, duration: 2820 }, // D3
        { midi: 56, onset: 28800, duration: 2820 }, // G♯3
        { midi: 59, onset: 28800, duration: 2820 }, // B3
        { midi: 51, onset: 31680, duration: 2820 }, // D♯3
        { midi: 57, onset: 31680, duration: 2820 }, // A3
        { midi: 61, onset: 31680, duration: 2820 }, // C♯4
      ],
    },
    {
      stepNumber: 22,
      module: 'blues_l2',
      section: 'B',
      subsection: 'B2: 7-3-5 and 3-7-9 (Half-Time Shuffle)',
      activity: 'B2.4: Play-Along — Long Short, Half-Time Shuffle in E',
      direction:
        'Each chord long on beat 1, then short just before beat 3 — the snare’s backbeat.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_735_e_long_short | blues',
      styleRef: 'l2b',
      successFeedback:
        'Long, short: comping that leaves room for the backbeat.',
      key: 'E major',
      chordSymbols: [
        'E7',
        'A9',
        'E7',
        'E7',
        'A9',
        'A9',
        'E7',
        'E7',
        'B9',
        'A9',
        'E7',
        'B9',
      ],
      timeSignature: [12, 8],
      tempo: 150,
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 50, onset: 0, duration: 1140 }, // D3
        { midi: 56, onset: 0, duration: 1140 }, // G♯3
        { midi: 59, onset: 0, duration: 1140 }, // B3
        { midi: 50, onset: 1200, duration: 220 }, // D3
        { midi: 56, onset: 1200, duration: 220 }, // G♯3
        { midi: 59, onset: 1200, duration: 220 }, // B3
        { midi: 49, onset: 2880, duration: 1140 }, // C♯3
        { midi: 55, onset: 2880, duration: 1140 }, // G3
        { midi: 59, onset: 2880, duration: 1140 }, // B3
        { midi: 49, onset: 4080, duration: 220 }, // C♯3
        { midi: 55, onset: 4080, duration: 220 }, // G3
        { midi: 59, onset: 4080, duration: 220 }, // B3
        { midi: 50, onset: 5760, duration: 1140 }, // D3
        { midi: 56, onset: 5760, duration: 1140 }, // G♯3
        { midi: 59, onset: 5760, duration: 1140 }, // B3
        { midi: 50, onset: 6960, duration: 220 }, // D3
        { midi: 56, onset: 6960, duration: 220 }, // G♯3
        { midi: 59, onset: 6960, duration: 220 }, // B3
        { midi: 50, onset: 8640, duration: 1140 }, // D3
        { midi: 56, onset: 8640, duration: 1140 }, // G♯3
        { midi: 59, onset: 8640, duration: 1140 }, // B3
        { midi: 50, onset: 9840, duration: 220 }, // D3
        { midi: 56, onset: 9840, duration: 220 }, // G♯3
        { midi: 59, onset: 9840, duration: 220 }, // B3
        { midi: 49, onset: 11520, duration: 1140 }, // C♯3
        { midi: 55, onset: 11520, duration: 1140 }, // G3
        { midi: 59, onset: 11520, duration: 1140 }, // B3
        { midi: 49, onset: 12720, duration: 220 }, // C♯3
        { midi: 55, onset: 12720, duration: 220 }, // G3
        { midi: 59, onset: 12720, duration: 220 }, // B3
        { midi: 49, onset: 14400, duration: 1140 }, // C♯3
        { midi: 55, onset: 14400, duration: 1140 }, // G3
        { midi: 59, onset: 14400, duration: 1140 }, // B3
        { midi: 49, onset: 15600, duration: 220 }, // C♯3
        { midi: 55, onset: 15600, duration: 220 }, // G3
        { midi: 59, onset: 15600, duration: 220 }, // B3
        { midi: 50, onset: 17280, duration: 1140 }, // D3
        { midi: 56, onset: 17280, duration: 1140 }, // G♯3
        { midi: 59, onset: 17280, duration: 1140 }, // B3
        { midi: 50, onset: 18480, duration: 220 }, // D3
        { midi: 56, onset: 18480, duration: 220 }, // G♯3
        { midi: 59, onset: 18480, duration: 220 }, // B3
        { midi: 50, onset: 20160, duration: 1140 }, // D3
        { midi: 56, onset: 20160, duration: 1140 }, // G♯3
        { midi: 59, onset: 20160, duration: 1140 }, // B3
        { midi: 50, onset: 21360, duration: 220 }, // D3
        { midi: 56, onset: 21360, duration: 220 }, // G♯3
        { midi: 59, onset: 21360, duration: 220 }, // B3
        { midi: 51, onset: 23040, duration: 1140 }, // D♯3
        { midi: 57, onset: 23040, duration: 1140 }, // A3
        { midi: 61, onset: 23040, duration: 1140 }, // C♯4
        { midi: 51, onset: 24240, duration: 220 }, // D♯3
        { midi: 57, onset: 24240, duration: 220 }, // A3
        { midi: 61, onset: 24240, duration: 220 }, // C♯4
        { midi: 49, onset: 25920, duration: 1140 }, // C♯3
        { midi: 55, onset: 25920, duration: 1140 }, // G3
        { midi: 59, onset: 25920, duration: 1140 }, // B3
        { midi: 49, onset: 27120, duration: 220 }, // C♯3
        { midi: 55, onset: 27120, duration: 220 }, // G3
        { midi: 59, onset: 27120, duration: 220 }, // B3
        { midi: 50, onset: 28800, duration: 1140 }, // D3
        { midi: 56, onset: 28800, duration: 1140 }, // G♯3
        { midi: 59, onset: 28800, duration: 1140 }, // B3
        { midi: 50, onset: 30000, duration: 220 }, // D3
        { midi: 56, onset: 30000, duration: 220 }, // G♯3
        { midi: 59, onset: 30000, duration: 220 }, // B3
        { midi: 51, onset: 31680, duration: 1140 }, // D♯3
        { midi: 57, onset: 31680, duration: 1140 }, // A3
        { midi: 61, onset: 31680, duration: 1140 }, // C♯4
        { midi: 51, onset: 32880, duration: 220 }, // D♯3
        { midi: 57, onset: 32880, duration: 220 }, // A3
        { midi: 61, onset: 32880, duration: 220 }, // C♯4
      ],
    },
    {
      stepNumber: 23,
      module: 'blues_l2',
      section: 'B',
      subsection: 'B2: 7-3-5 and 3-7-9 (Half-Time Shuffle)',
      activity: 'B2.5: Play-Along — 7-3-5 and 3-7-9, Half-Time Shuffle in G',
      direction: 'The same system through the blues in G.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_735_g_play | blues',
      styleRef: 'l2b',
      successFeedback: 'The system works in any key.',
      key: 'G major',
      chordSymbols: [
        'G7',
        'C9',
        'G7',
        'G7',
        'C9',
        'C9',
        'G7',
        'G7',
        'D9',
        'C9',
        'G7',
        'D9',
      ],
      timeSignature: [12, 8],
      tempo: 150,
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 53, onset: 0, duration: 2820 }, // F3
        { midi: 59, onset: 0, duration: 2820 }, // B3
        { midi: 62, onset: 0, duration: 2820 }, // D4
        { midi: 52, onset: 2880, duration: 2820 }, // E3
        { midi: 58, onset: 2880, duration: 2820 }, // B♭3
        { midi: 62, onset: 2880, duration: 2820 }, // D4
        { midi: 53, onset: 5760, duration: 2820 }, // F3
        { midi: 59, onset: 5760, duration: 2820 }, // B3
        { midi: 62, onset: 5760, duration: 2820 }, // D4
        { midi: 53, onset: 8640, duration: 2820 }, // F3
        { midi: 59, onset: 8640, duration: 2820 }, // B3
        { midi: 62, onset: 8640, duration: 2820 }, // D4
        { midi: 52, onset: 11520, duration: 2820 }, // E3
        { midi: 58, onset: 11520, duration: 2820 }, // B♭3
        { midi: 62, onset: 11520, duration: 2820 }, // D4
        { midi: 52, onset: 14400, duration: 2820 }, // E3
        { midi: 58, onset: 14400, duration: 2820 }, // B♭3
        { midi: 62, onset: 14400, duration: 2820 }, // D4
        { midi: 53, onset: 17280, duration: 2820 }, // F3
        { midi: 59, onset: 17280, duration: 2820 }, // B3
        { midi: 62, onset: 17280, duration: 2820 }, // D4
        { midi: 53, onset: 20160, duration: 2820 }, // F3
        { midi: 59, onset: 20160, duration: 2820 }, // B3
        { midi: 62, onset: 20160, duration: 2820 }, // D4
        { midi: 54, onset: 23040, duration: 2820 }, // G♭3
        { midi: 60, onset: 23040, duration: 2820 }, // C4
        { midi: 64, onset: 23040, duration: 2820 }, // E4
        { midi: 52, onset: 25920, duration: 2820 }, // E3
        { midi: 58, onset: 25920, duration: 2820 }, // B♭3
        { midi: 62, onset: 25920, duration: 2820 }, // D4
        { midi: 53, onset: 28800, duration: 2820 }, // F3
        { midi: 59, onset: 28800, duration: 2820 }, // B3
        { midi: 62, onset: 28800, duration: 2820 }, // D4
        { midi: 54, onset: 31680, duration: 2820 }, // G♭3
        { midi: 60, onset: 31680, duration: 2820 }, // C4
        { midi: 64, onset: 31680, duration: 2820 }, // E4
      ],
    },
    {
      stepNumber: 24,
      module: 'blues_l2',
      section: 'B',
      subsection: 'B3: Rootless A (Half-Time Shuffle)',
      activity: 'B3.1: Rootless A on E7, A7 and B7 (Out of Time)',
      direction:
        'Four notes, no root: 3-5-7-9 or 7-9-3-13, whichever is closer.',
      assessment: 'pitch_order',
      tag: 'blues:l2_rootless_a_chords | blues',
      styleRef: 'l2b',
      successFeedback: 'A fuller sound for the half-time shuffle.',
      key: 'E major',
      chordSymbols: ['E9', 'A13', 'B13'],
      targetNotes: [
        { midi: 56, onset: 0, duration: 1800 }, // G♯3
        { midi: 59, onset: 0, duration: 1800 }, // B3
        { midi: 62, onset: 0, duration: 1800 }, // D4
        { midi: 66, onset: 0, duration: 1800 }, // F♯4
        { midi: 55, onset: 1920, duration: 1800 }, // G3
        { midi: 59, onset: 1920, duration: 1800 }, // B3
        { midi: 61, onset: 1920, duration: 1800 }, // C♯4
        { midi: 66, onset: 1920, duration: 1800 }, // F♯4
        { midi: 57, onset: 3840, duration: 1800 }, // A3
        { midi: 61, onset: 3840, duration: 1800 }, // C♯4
        { midi: 63, onset: 3840, duration: 1800 }, // D♯4
        { midi: 68, onset: 3840, duration: 1800 }, // G♯4
      ],
    },
    {
      stepNumber: 25,
      module: 'blues_l2',
      section: 'B',
      subsection: 'B3: Rootless A (Half-Time Shuffle)',
      activity: 'B3.2: Play-Along — Rootless A, Half-Time Shuffle in E',
      direction: 'Rootless A through the 12-bar, one chord a bar.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_rootless_a_play | blues',
      styleRef: 'l2b',
      successFeedback: 'Four-note voicings through the form.',
      key: 'E major',
      chordSymbols: [
        'E9',
        'A13',
        'E9',
        'E9',
        'A13',
        'A13',
        'E9',
        'E9',
        'B13',
        'A13',
        'E9',
        'B13',
      ],
      timeSignature: [12, 8],
      tempo: 150,
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 56, onset: 0, duration: 2820 }, // G♯3
        { midi: 59, onset: 0, duration: 2820 }, // B3
        { midi: 62, onset: 0, duration: 2820 }, // D4
        { midi: 66, onset: 0, duration: 2820 }, // F♯4
        { midi: 55, onset: 2880, duration: 2820 }, // G3
        { midi: 59, onset: 2880, duration: 2820 }, // B3
        { midi: 61, onset: 2880, duration: 2820 }, // C♯4
        { midi: 66, onset: 2880, duration: 2820 }, // F♯4
        { midi: 56, onset: 5760, duration: 2820 }, // G♯3
        { midi: 59, onset: 5760, duration: 2820 }, // B3
        { midi: 62, onset: 5760, duration: 2820 }, // D4
        { midi: 66, onset: 5760, duration: 2820 }, // F♯4
        { midi: 56, onset: 8640, duration: 2820 }, // G♯3
        { midi: 59, onset: 8640, duration: 2820 }, // B3
        { midi: 62, onset: 8640, duration: 2820 }, // D4
        { midi: 66, onset: 8640, duration: 2820 }, // F♯4
        { midi: 55, onset: 11520, duration: 2820 }, // G3
        { midi: 59, onset: 11520, duration: 2820 }, // B3
        { midi: 61, onset: 11520, duration: 2820 }, // C♯4
        { midi: 66, onset: 11520, duration: 2820 }, // F♯4
        { midi: 55, onset: 14400, duration: 2820 }, // G3
        { midi: 59, onset: 14400, duration: 2820 }, // B3
        { midi: 61, onset: 14400, duration: 2820 }, // C♯4
        { midi: 66, onset: 14400, duration: 2820 }, // F♯4
        { midi: 56, onset: 17280, duration: 2820 }, // G♯3
        { midi: 59, onset: 17280, duration: 2820 }, // B3
        { midi: 62, onset: 17280, duration: 2820 }, // D4
        { midi: 66, onset: 17280, duration: 2820 }, // F♯4
        { midi: 56, onset: 20160, duration: 2820 }, // G♯3
        { midi: 59, onset: 20160, duration: 2820 }, // B3
        { midi: 62, onset: 20160, duration: 2820 }, // D4
        { midi: 66, onset: 20160, duration: 2820 }, // F♯4
        { midi: 57, onset: 23040, duration: 2820 }, // A3
        { midi: 61, onset: 23040, duration: 2820 }, // C♯4
        { midi: 63, onset: 23040, duration: 2820 }, // D♯4
        { midi: 68, onset: 23040, duration: 2820 }, // G♯4
        { midi: 55, onset: 25920, duration: 2820 }, // G3
        { midi: 59, onset: 25920, duration: 2820 }, // B3
        { midi: 61, onset: 25920, duration: 2820 }, // C♯4
        { midi: 66, onset: 25920, duration: 2820 }, // F♯4
        { midi: 56, onset: 28800, duration: 2820 }, // G♯3
        { midi: 59, onset: 28800, duration: 2820 }, // B3
        { midi: 62, onset: 28800, duration: 2820 }, // D4
        { midi: 66, onset: 28800, duration: 2820 }, // F♯4
        { midi: 57, onset: 31680, duration: 2820 }, // A3
        { midi: 61, onset: 31680, duration: 2820 }, // C♯4
        { midi: 63, onset: 31680, duration: 2820 }, // D♯4
        { midi: 68, onset: 31680, duration: 2820 }, // G♯4
      ],
    },
    {
      stepNumber: 26,
      module: 'blues_l2',
      section: 'B',
      subsection: 'B4: The Triad Pair on Every Chord (Shuffle)',
      activity: 'B4.1: The Triad Pair on E7, A7 and B7 (Out of Time)',
      direction:
        'Each chord gets its own pair, sharing its root on top: E with A, A with D, B with E.',
      assessment: 'pitch_order',
      tag: 'blues:l2_pairs_chords | blues',
      styleRef: 'l2a',
      successFeedback: 'Level 1’s right hand, on every chord of the blues.',
      key: 'E major',
      chordSymbols: ['E', 'A', 'A', 'D', 'B', 'E'],
      targetNotes: [
        { midi: 56, onset: 0, duration: 1800 }, // G♯3
        { midi: 59, onset: 0, duration: 1800 }, // B3
        { midi: 64, onset: 0, duration: 1800 }, // E4
        { midi: 57, onset: 1920, duration: 1800 }, // A3
        { midi: 61, onset: 1920, duration: 1800 }, // C♯4
        { midi: 64, onset: 1920, duration: 1800 }, // E4
        { midi: 61, onset: 3840, duration: 1800 }, // C♯4
        { midi: 64, onset: 3840, duration: 1800 }, // E4
        { midi: 69, onset: 3840, duration: 1800 }, // A4
        { midi: 62, onset: 5760, duration: 1800 }, // D4
        { midi: 66, onset: 5760, duration: 1800 }, // F♯4
        { midi: 69, onset: 5760, duration: 1800 }, // A4
        { midi: 63, onset: 7680, duration: 1800 }, // D♯4
        { midi: 66, onset: 7680, duration: 1800 }, // F♯4
        { midi: 71, onset: 7680, duration: 1800 }, // B4
        { midi: 64, onset: 9600, duration: 1800 }, // E4
        { midi: 68, onset: 9600, duration: 1800 }, // G♯4
        { midi: 71, onset: 9600, duration: 1800 }, // B4
      ],
    },
    {
      stepNumber: 27,
      module: 'blues_l2',
      section: 'B',
      subsection: 'B4: The Triad Pair on Every Chord (Shuffle)',
      activity: 'B4.2: Play-Along — The Pair Through the 12-Bar in E',
      direction: 'The I–IV groove bar by bar, each chord with its own pair.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_pairs_play | blues',
      styleRef: 'l2a',
      successFeedback: 'A shuffle right hand through the whole form.',
      key: 'E major',
      chordSymbols: [
        'E7',
        'E7',
        'E7',
        'E7',
        'E7',
        'E7',
        'E7',
        'E7',
        'A7',
        'A7',
        'A7',
        'A7',
        'E7',
        'E7',
        'E7',
        'E7',
        'B7',
        'B7',
        'A7',
        'A7',
        'E7',
        'E7',
        'E7',
        'E7',
      ],
      chordsPerBar: 2,
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 56, onset: 0, duration: 460 }, // G♯3
        { midi: 59, onset: 0, duration: 460 }, // B3
        { midi: 64, onset: 0, duration: 460 }, // E4
        { midi: 57, onset: 480, duration: 460 }, // A3
        { midi: 61, onset: 480, duration: 460 }, // C♯4
        { midi: 64, onset: 480, duration: 460 }, // E4
        { midi: 56, onset: 960, duration: 460 }, // G♯3
        { midi: 59, onset: 960, duration: 460 }, // B3
        { midi: 64, onset: 960, duration: 460 }, // E4
        { midi: 57, onset: 1440, duration: 460 }, // A3
        { midi: 61, onset: 1440, duration: 460 }, // C♯4
        { midi: 64, onset: 1440, duration: 460 }, // E4
        { midi: 56, onset: 1920, duration: 460 }, // G♯3
        { midi: 59, onset: 1920, duration: 460 }, // B3
        { midi: 64, onset: 1920, duration: 460 }, // E4
        { midi: 57, onset: 2400, duration: 220 }, // A3
        { midi: 61, onset: 2400, duration: 220 }, // C♯4
        { midi: 64, onset: 2400, duration: 220 }, // E4
        { midi: 56, onset: 2640, duration: 1140 }, // G♯3
        { midi: 59, onset: 2640, duration: 1140 }, // B3
        { midi: 64, onset: 2640, duration: 1140 }, // E4
        { midi: 57, onset: 3840, duration: 220 }, // A3
        { midi: 61, onset: 3840, duration: 220 }, // C♯4
        { midi: 64, onset: 3840, duration: 220 }, // E4
        { midi: 56, onset: 4080, duration: 220 }, // G♯3
        { midi: 59, onset: 4080, duration: 220 }, // B3
        { midi: 64, onset: 4080, duration: 220 }, // E4
        { midi: 57, onset: 4320, duration: 220 }, // A3
        { midi: 61, onset: 4320, duration: 220 }, // C♯4
        { midi: 64, onset: 4320, duration: 220 }, // E4
        { midi: 56, onset: 4560, duration: 700 }, // G♯3
        { midi: 59, onset: 4560, duration: 700 }, // B3
        { midi: 64, onset: 4560, duration: 700 }, // E4
        { midi: 57, onset: 5280, duration: 460 }, // A3
        { midi: 61, onset: 5280, duration: 460 }, // C♯4
        { midi: 64, onset: 5280, duration: 460 }, // E4
        { midi: 56, onset: 5760, duration: 1860 }, // G♯3
        { midi: 59, onset: 5760, duration: 1860 }, // B3
        { midi: 64, onset: 5760, duration: 1860 }, // E4
        { midi: 61, onset: 7680, duration: 460 }, // C♯4
        { midi: 64, onset: 7680, duration: 460 }, // E4
        { midi: 69, onset: 7680, duration: 460 }, // A4
        { midi: 62, onset: 8160, duration: 460 }, // D4
        { midi: 66, onset: 8160, duration: 460 }, // F♯4
        { midi: 69, onset: 8160, duration: 460 }, // A4
        { midi: 61, onset: 8640, duration: 460 }, // C♯4
        { midi: 64, onset: 8640, duration: 460 }, // E4
        { midi: 69, onset: 8640, duration: 460 }, // A4
        { midi: 62, onset: 9120, duration: 460 }, // D4
        { midi: 66, onset: 9120, duration: 460 }, // F♯4
        { midi: 69, onset: 9120, duration: 460 }, // A4
        { midi: 61, onset: 9600, duration: 460 }, // C♯4
        { midi: 64, onset: 9600, duration: 460 }, // E4
        { midi: 69, onset: 9600, duration: 460 }, // A4
        { midi: 62, onset: 10080, duration: 220 }, // D4
        { midi: 66, onset: 10080, duration: 220 }, // F♯4
        { midi: 69, onset: 10080, duration: 220 }, // A4
        { midi: 61, onset: 10320, duration: 1140 }, // C♯4
        { midi: 64, onset: 10320, duration: 1140 }, // E4
        { midi: 69, onset: 10320, duration: 1140 }, // A4
        { midi: 57, onset: 11520, duration: 220 }, // A3
        { midi: 61, onset: 11520, duration: 220 }, // C♯4
        { midi: 64, onset: 11520, duration: 220 }, // E4
        { midi: 56, onset: 11760, duration: 220 }, // G♯3
        { midi: 59, onset: 11760, duration: 220 }, // B3
        { midi: 64, onset: 11760, duration: 220 }, // E4
        { midi: 57, onset: 12000, duration: 220 }, // A3
        { midi: 61, onset: 12000, duration: 220 }, // C♯4
        { midi: 64, onset: 12000, duration: 220 }, // E4
        { midi: 56, onset: 12240, duration: 700 }, // G♯3
        { midi: 59, onset: 12240, duration: 700 }, // B3
        { midi: 64, onset: 12240, duration: 700 }, // E4
        { midi: 57, onset: 12960, duration: 460 }, // A3
        { midi: 61, onset: 12960, duration: 460 }, // C♯4
        { midi: 64, onset: 12960, duration: 460 }, // E4
        { midi: 56, onset: 13440, duration: 1860 }, // G♯3
        { midi: 59, onset: 13440, duration: 1860 }, // B3
        { midi: 64, onset: 13440, duration: 1860 }, // E4
        { midi: 63, onset: 15360, duration: 460 }, // D♯4
        { midi: 66, onset: 15360, duration: 460 }, // F♯4
        { midi: 71, onset: 15360, duration: 460 }, // B4
        { midi: 64, onset: 15840, duration: 460 }, // E4
        { midi: 68, onset: 15840, duration: 460 }, // G♯4
        { midi: 71, onset: 15840, duration: 460 }, // B4
        { midi: 63, onset: 16320, duration: 460 }, // D♯4
        { midi: 66, onset: 16320, duration: 460 }, // F♯4
        { midi: 71, onset: 16320, duration: 460 }, // B4
        { midi: 64, onset: 16800, duration: 460 }, // E4
        { midi: 68, onset: 16800, duration: 460 }, // G♯4
        { midi: 71, onset: 16800, duration: 460 }, // B4
        { midi: 61, onset: 17280, duration: 460 }, // C♯4
        { midi: 64, onset: 17280, duration: 460 }, // E4
        { midi: 69, onset: 17280, duration: 460 }, // A4
        { midi: 62, onset: 17760, duration: 220 }, // D4
        { midi: 66, onset: 17760, duration: 220 }, // F♯4
        { midi: 69, onset: 17760, duration: 220 }, // A4
        { midi: 61, onset: 18000, duration: 1140 }, // C♯4
        { midi: 64, onset: 18000, duration: 1140 }, // E4
        { midi: 69, onset: 18000, duration: 1140 }, // A4
        { midi: 57, onset: 19200, duration: 220 }, // A3
        { midi: 61, onset: 19200, duration: 220 }, // C♯4
        { midi: 64, onset: 19200, duration: 220 }, // E4
        { midi: 56, onset: 19440, duration: 220 }, // G♯3
        { midi: 59, onset: 19440, duration: 220 }, // B3
        { midi: 64, onset: 19440, duration: 220 }, // E4
        { midi: 57, onset: 19680, duration: 220 }, // A3
        { midi: 61, onset: 19680, duration: 220 }, // C♯4
        { midi: 64, onset: 19680, duration: 220 }, // E4
        { midi: 56, onset: 19920, duration: 700 }, // G♯3
        { midi: 59, onset: 19920, duration: 700 }, // B3
        { midi: 64, onset: 19920, duration: 700 }, // E4
        { midi: 57, onset: 20640, duration: 460 }, // A3
        { midi: 61, onset: 20640, duration: 460 }, // C♯4
        { midi: 64, onset: 20640, duration: 460 }, // E4
        { midi: 56, onset: 21120, duration: 1860 }, // G♯3
        { midi: 59, onset: 21120, duration: 1860 }, // B3
        { midi: 64, onset: 21120, duration: 1860 }, // E4
      ],
    },
  ],
};

const bluesL2SectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 28,
      module: 'blues_l2',
      section: 'C',
      subsection: 'C1: The Half-Time Shuffle (12/8)',
      activity: 'C1.1: Half-Time Shuffle on E7',
      direction:
        'Each big beat with a triplet pickup: E, E, B, B, E, E, B — then F, a half step above E, back into the root.',
      assessment: 'pitch_order_timing',
      tag: 'blues:l2_bass_ht_one | blues',
      styleRef: 'l2b',
      successFeedback: 'Purdie’s half-time shuffle, on the bass.',
      key: 'E major',
      chordSymbols: ['E7', 'E7'],
      timeSignature: [12, 8],
      tempo: 150,
      targetNotes: [
        { midi: 40, onset: 0, duration: 440 }, // E2
        { midi: 40, onset: 480, duration: 200 }, // E2
        { midi: 47, onset: 720, duration: 440 }, // B2
        { midi: 47, onset: 1200, duration: 200 }, // B2
        { midi: 52, onset: 1440, duration: 440 }, // E3
        { midi: 52, onset: 1920, duration: 200 }, // E3
        { midi: 47, onset: 2160, duration: 440 }, // B2
        { midi: 41, onset: 2640, duration: 200 }, // F2
        { midi: 40, onset: 2880, duration: 440 }, // E2
        { midi: 40, onset: 3360, duration: 200 }, // E2
        { midi: 47, onset: 3600, duration: 440 }, // B2
        { midi: 47, onset: 4080, duration: 200 }, // B2
        { midi: 52, onset: 4320, duration: 440 }, // E3
        { midi: 52, onset: 4800, duration: 200 }, // E3
        { midi: 47, onset: 5040, duration: 440 }, // B2
        { midi: 41, onset: 5520, duration: 200 }, // F2
      ],
    },
    {
      stepNumber: 29,
      module: 'blues_l2',
      section: 'C',
      subsection: 'C1: The Half-Time Shuffle (12/8)',
      activity: 'C1.2: Half-Time Shuffle — the 12-Bar in E',
      direction:
        'The same pattern on every chord, with an approach a half step from the next root.',
      assessment: 'pitch_order_timing',
      tag: 'blues:l2_bass_ht_e | blues',
      styleRef: 'l2b',
      successFeedback: 'The half-time shuffle through the form.',
      key: 'E major',
      chordSymbols: [
        'E7',
        'A7',
        'E7',
        'E7',
        'A7',
        'A7',
        'E7',
        'E7',
        'B7',
        'A7',
        'E7',
        'B7',
      ],
      timeSignature: [12, 8],
      tempo: 150,
      targetNotes: [
        { midi: 40, onset: 0, duration: 440 }, // E2
        { midi: 40, onset: 480, duration: 200 }, // E2
        { midi: 47, onset: 720, duration: 440 }, // B2
        { midi: 47, onset: 1200, duration: 200 }, // B2
        { midi: 52, onset: 1440, duration: 440 }, // E3
        { midi: 52, onset: 1920, duration: 200 }, // E3
        { midi: 47, onset: 2160, duration: 440 }, // B2
        { midi: 34, onset: 2640, duration: 200 }, // A♯1
        { midi: 33, onset: 2880, duration: 440 }, // A1
        { midi: 33, onset: 3360, duration: 200 }, // A1
        { midi: 40, onset: 3600, duration: 440 }, // E2
        { midi: 40, onset: 4080, duration: 200 }, // E2
        { midi: 45, onset: 4320, duration: 440 }, // A2
        { midi: 45, onset: 4800, duration: 200 }, // A2
        { midi: 40, onset: 5040, duration: 440 }, // E2
        { midi: 41, onset: 5520, duration: 200 }, // F2
        { midi: 40, onset: 5760, duration: 440 }, // E2
        { midi: 40, onset: 6240, duration: 200 }, // E2
        { midi: 47, onset: 6480, duration: 440 }, // B2
        { midi: 47, onset: 6960, duration: 200 }, // B2
        { midi: 52, onset: 7200, duration: 440 }, // E3
        { midi: 52, onset: 7680, duration: 200 }, // E3
        { midi: 47, onset: 7920, duration: 440 }, // B2
        { midi: 41, onset: 8400, duration: 200 }, // F2
        { midi: 40, onset: 8640, duration: 440 }, // E2
        { midi: 40, onset: 9120, duration: 200 }, // E2
        { midi: 47, onset: 9360, duration: 440 }, // B2
        { midi: 47, onset: 9840, duration: 200 }, // B2
        { midi: 52, onset: 10080, duration: 440 }, // E3
        { midi: 52, onset: 10560, duration: 200 }, // E3
        { midi: 47, onset: 10800, duration: 440 }, // B2
        { midi: 34, onset: 11280, duration: 200 }, // A♯1
        { midi: 33, onset: 11520, duration: 440 }, // A1
        { midi: 33, onset: 12000, duration: 200 }, // A1
        { midi: 40, onset: 12240, duration: 440 }, // E2
        { midi: 40, onset: 12720, duration: 200 }, // E2
        { midi: 45, onset: 12960, duration: 440 }, // A2
        { midi: 45, onset: 13440, duration: 200 }, // A2
        { midi: 40, onset: 13680, duration: 440 }, // E2
        { midi: 34, onset: 14160, duration: 200 }, // A♯1
        { midi: 33, onset: 14400, duration: 440 }, // A1
        { midi: 33, onset: 14880, duration: 200 }, // A1
        { midi: 40, onset: 15120, duration: 440 }, // E2
        { midi: 40, onset: 15600, duration: 200 }, // E2
        { midi: 45, onset: 15840, duration: 440 }, // A2
        { midi: 45, onset: 16320, duration: 200 }, // A2
        { midi: 40, onset: 16560, duration: 440 }, // E2
        { midi: 41, onset: 17040, duration: 200 }, // F2
        { midi: 40, onset: 17280, duration: 440 }, // E2
        { midi: 40, onset: 17760, duration: 200 }, // E2
        { midi: 47, onset: 18000, duration: 440 }, // B2
        { midi: 47, onset: 18480, duration: 200 }, // B2
        { midi: 52, onset: 18720, duration: 440 }, // E3
        { midi: 52, onset: 19200, duration: 200 }, // E3
        { midi: 47, onset: 19440, duration: 440 }, // B2
        { midi: 41, onset: 19920, duration: 200 }, // F2
        { midi: 40, onset: 20160, duration: 440 }, // E2
        { midi: 40, onset: 20640, duration: 200 }, // E2
        { midi: 47, onset: 20880, duration: 440 }, // B2
        { midi: 47, onset: 21360, duration: 200 }, // B2
        { midi: 52, onset: 21600, duration: 440 }, // E3
        { midi: 52, onset: 22080, duration: 200 }, // E3
        { midi: 47, onset: 22320, duration: 440 }, // B2
        { midi: 36, onset: 22800, duration: 200 }, // C2
        { midi: 35, onset: 23040, duration: 440 }, // B1
        { midi: 35, onset: 23520, duration: 200 }, // B1
        { midi: 42, onset: 23760, duration: 440 }, // F♯2
        { midi: 42, onset: 24240, duration: 200 }, // F♯2
        { midi: 47, onset: 24480, duration: 440 }, // B2
        { midi: 47, onset: 24960, duration: 200 }, // B2
        { midi: 42, onset: 25200, duration: 440 }, // F♯2
        { midi: 34, onset: 25680, duration: 200 }, // A♯1
        { midi: 33, onset: 25920, duration: 440 }, // A1
        { midi: 33, onset: 26400, duration: 200 }, // A1
        { midi: 40, onset: 26640, duration: 440 }, // E2
        { midi: 40, onset: 27120, duration: 200 }, // E2
        { midi: 45, onset: 27360, duration: 440 }, // A2
        { midi: 45, onset: 27840, duration: 200 }, // A2
        { midi: 40, onset: 28080, duration: 440 }, // E2
        { midi: 41, onset: 28560, duration: 200 }, // F2
        { midi: 40, onset: 28800, duration: 440 }, // E2
        { midi: 40, onset: 29280, duration: 200 }, // E2
        { midi: 47, onset: 29520, duration: 440 }, // B2
        { midi: 47, onset: 30000, duration: 200 }, // B2
        { midi: 52, onset: 30240, duration: 440 }, // E3
        { midi: 52, onset: 30720, duration: 200 }, // E3
        { midi: 47, onset: 30960, duration: 440 }, // B2
        { midi: 36, onset: 31440, duration: 200 }, // C2
        { midi: 35, onset: 31680, duration: 440 }, // B1
        { midi: 35, onset: 32160, duration: 200 }, // B1
        { midi: 42, onset: 32400, duration: 440 }, // F♯2
        { midi: 42, onset: 32880, duration: 200 }, // F♯2
        { midi: 47, onset: 33120, duration: 440 }, // B2
        { midi: 47, onset: 33600, duration: 200 }, // B2
        { midi: 42, onset: 33840, duration: 440 }, // F♯2
        { midi: 41, onset: 34320, duration: 200 }, // F2
      ],
    },
    {
      stepNumber: 30,
      module: 'blues_l2',
      section: 'C',
      subsection: 'C1: The Half-Time Shuffle (12/8)',
      activity: 'C1.3: Bass Play-Along — Half-Time Shuffle in E',
      direction: 'The half-time shuffle under the band.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_bass_ht_play | blues',
      styleRef: 'l2b',
      successFeedback: 'You and the drummer, locked in.',
      key: 'E major',
      chordSymbols: [
        'E7',
        'A7',
        'E7',
        'E7',
        'A7',
        'A7',
        'E7',
        'E7',
        'B7',
        'A7',
        'E7',
        'B7',
      ],
      timeSignature: [12, 8],
      tempo: 150,
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 40, onset: 0, duration: 440 }, // E2
        { midi: 40, onset: 480, duration: 200 }, // E2
        { midi: 47, onset: 720, duration: 440 }, // B2
        { midi: 47, onset: 1200, duration: 200 }, // B2
        { midi: 52, onset: 1440, duration: 440 }, // E3
        { midi: 52, onset: 1920, duration: 200 }, // E3
        { midi: 47, onset: 2160, duration: 440 }, // B2
        { midi: 34, onset: 2640, duration: 200 }, // A♯1
        { midi: 33, onset: 2880, duration: 440 }, // A1
        { midi: 33, onset: 3360, duration: 200 }, // A1
        { midi: 40, onset: 3600, duration: 440 }, // E2
        { midi: 40, onset: 4080, duration: 200 }, // E2
        { midi: 45, onset: 4320, duration: 440 }, // A2
        { midi: 45, onset: 4800, duration: 200 }, // A2
        { midi: 40, onset: 5040, duration: 440 }, // E2
        { midi: 41, onset: 5520, duration: 200 }, // F2
        { midi: 40, onset: 5760, duration: 440 }, // E2
        { midi: 40, onset: 6240, duration: 200 }, // E2
        { midi: 47, onset: 6480, duration: 440 }, // B2
        { midi: 47, onset: 6960, duration: 200 }, // B2
        { midi: 52, onset: 7200, duration: 440 }, // E3
        { midi: 52, onset: 7680, duration: 200 }, // E3
        { midi: 47, onset: 7920, duration: 440 }, // B2
        { midi: 41, onset: 8400, duration: 200 }, // F2
        { midi: 40, onset: 8640, duration: 440 }, // E2
        { midi: 40, onset: 9120, duration: 200 }, // E2
        { midi: 47, onset: 9360, duration: 440 }, // B2
        { midi: 47, onset: 9840, duration: 200 }, // B2
        { midi: 52, onset: 10080, duration: 440 }, // E3
        { midi: 52, onset: 10560, duration: 200 }, // E3
        { midi: 47, onset: 10800, duration: 440 }, // B2
        { midi: 34, onset: 11280, duration: 200 }, // A♯1
        { midi: 33, onset: 11520, duration: 440 }, // A1
        { midi: 33, onset: 12000, duration: 200 }, // A1
        { midi: 40, onset: 12240, duration: 440 }, // E2
        { midi: 40, onset: 12720, duration: 200 }, // E2
        { midi: 45, onset: 12960, duration: 440 }, // A2
        { midi: 45, onset: 13440, duration: 200 }, // A2
        { midi: 40, onset: 13680, duration: 440 }, // E2
        { midi: 34, onset: 14160, duration: 200 }, // A♯1
        { midi: 33, onset: 14400, duration: 440 }, // A1
        { midi: 33, onset: 14880, duration: 200 }, // A1
        { midi: 40, onset: 15120, duration: 440 }, // E2
        { midi: 40, onset: 15600, duration: 200 }, // E2
        { midi: 45, onset: 15840, duration: 440 }, // A2
        { midi: 45, onset: 16320, duration: 200 }, // A2
        { midi: 40, onset: 16560, duration: 440 }, // E2
        { midi: 41, onset: 17040, duration: 200 }, // F2
        { midi: 40, onset: 17280, duration: 440 }, // E2
        { midi: 40, onset: 17760, duration: 200 }, // E2
        { midi: 47, onset: 18000, duration: 440 }, // B2
        { midi: 47, onset: 18480, duration: 200 }, // B2
        { midi: 52, onset: 18720, duration: 440 }, // E3
        { midi: 52, onset: 19200, duration: 200 }, // E3
        { midi: 47, onset: 19440, duration: 440 }, // B2
        { midi: 41, onset: 19920, duration: 200 }, // F2
        { midi: 40, onset: 20160, duration: 440 }, // E2
        { midi: 40, onset: 20640, duration: 200 }, // E2
        { midi: 47, onset: 20880, duration: 440 }, // B2
        { midi: 47, onset: 21360, duration: 200 }, // B2
        { midi: 52, onset: 21600, duration: 440 }, // E3
        { midi: 52, onset: 22080, duration: 200 }, // E3
        { midi: 47, onset: 22320, duration: 440 }, // B2
        { midi: 36, onset: 22800, duration: 200 }, // C2
        { midi: 35, onset: 23040, duration: 440 }, // B1
        { midi: 35, onset: 23520, duration: 200 }, // B1
        { midi: 42, onset: 23760, duration: 440 }, // F♯2
        { midi: 42, onset: 24240, duration: 200 }, // F♯2
        { midi: 47, onset: 24480, duration: 440 }, // B2
        { midi: 47, onset: 24960, duration: 200 }, // B2
        { midi: 42, onset: 25200, duration: 440 }, // F♯2
        { midi: 34, onset: 25680, duration: 200 }, // A♯1
        { midi: 33, onset: 25920, duration: 440 }, // A1
        { midi: 33, onset: 26400, duration: 200 }, // A1
        { midi: 40, onset: 26640, duration: 440 }, // E2
        { midi: 40, onset: 27120, duration: 200 }, // E2
        { midi: 45, onset: 27360, duration: 440 }, // A2
        { midi: 45, onset: 27840, duration: 200 }, // A2
        { midi: 40, onset: 28080, duration: 440 }, // E2
        { midi: 41, onset: 28560, duration: 200 }, // F2
        { midi: 40, onset: 28800, duration: 440 }, // E2
        { midi: 40, onset: 29280, duration: 200 }, // E2
        { midi: 47, onset: 29520, duration: 440 }, // B2
        { midi: 47, onset: 30000, duration: 200 }, // B2
        { midi: 52, onset: 30240, duration: 440 }, // E3
        { midi: 52, onset: 30720, duration: 200 }, // E3
        { midi: 47, onset: 30960, duration: 440 }, // B2
        { midi: 36, onset: 31440, duration: 200 }, // C2
        { midi: 35, onset: 31680, duration: 440 }, // B1
        { midi: 35, onset: 32160, duration: 200 }, // B1
        { midi: 42, onset: 32400, duration: 440 }, // F♯2
        { midi: 42, onset: 32880, duration: 200 }, // F♯2
        { midi: 47, onset: 33120, duration: 440 }, // B2
        { midi: 47, onset: 33600, duration: 200 }, // B2
        { midi: 42, onset: 33840, duration: 440 }, // F♯2
        { midi: 41, onset: 34320, duration: 200 }, // F2
      ],
    },
    {
      stepNumber: 31,
      module: 'blues_l2',
      section: 'C',
      subsection: 'C1: The Half-Time Shuffle (12/8)',
      activity: 'C1.4: Half-Time Shuffle — the 12-Bar in G',
      direction: 'The pattern in G: G, C and D.',
      assessment: 'pitch_order_timing',
      tag: 'blues:l2_bass_ht_g | blues',
      styleRef: 'l2b',
      successFeedback: 'The half-time shuffle in a second key.',
      key: 'G major',
      chordSymbols: [
        'G7',
        'C7',
        'G7',
        'G7',
        'C7',
        'C7',
        'G7',
        'G7',
        'D7',
        'C7',
        'G7',
        'D7',
      ],
      timeSignature: [12, 8],
      tempo: 150,
      targetNotes: [
        { midi: 31, onset: 0, duration: 440 }, // G1
        { midi: 31, onset: 480, duration: 200 }, // G1
        { midi: 38, onset: 720, duration: 440 }, // D2
        { midi: 38, onset: 1200, duration: 200 }, // D2
        { midi: 43, onset: 1440, duration: 440 }, // G2
        { midi: 43, onset: 1920, duration: 200 }, // G2
        { midi: 38, onset: 2160, duration: 440 }, // D2
        { midi: 37, onset: 2640, duration: 200 }, // D♭2
        { midi: 36, onset: 2880, duration: 440 }, // C2
        { midi: 36, onset: 3360, duration: 200 }, // C2
        { midi: 43, onset: 3600, duration: 440 }, // G2
        { midi: 43, onset: 4080, duration: 200 }, // G2
        { midi: 48, onset: 4320, duration: 440 }, // C3
        { midi: 48, onset: 4800, duration: 200 }, // C3
        { midi: 43, onset: 5040, duration: 440 }, // G2
        { midi: 32, onset: 5520, duration: 200 }, // A♭1
        { midi: 31, onset: 5760, duration: 440 }, // G1
        { midi: 31, onset: 6240, duration: 200 }, // G1
        { midi: 38, onset: 6480, duration: 440 }, // D2
        { midi: 38, onset: 6960, duration: 200 }, // D2
        { midi: 43, onset: 7200, duration: 440 }, // G2
        { midi: 43, onset: 7680, duration: 200 }, // G2
        { midi: 38, onset: 7920, duration: 440 }, // D2
        { midi: 32, onset: 8400, duration: 200 }, // A♭1
        { midi: 31, onset: 8640, duration: 440 }, // G1
        { midi: 31, onset: 9120, duration: 200 }, // G1
        { midi: 38, onset: 9360, duration: 440 }, // D2
        { midi: 38, onset: 9840, duration: 200 }, // D2
        { midi: 43, onset: 10080, duration: 440 }, // G2
        { midi: 43, onset: 10560, duration: 200 }, // G2
        { midi: 38, onset: 10800, duration: 440 }, // D2
        { midi: 37, onset: 11280, duration: 200 }, // D♭2
        { midi: 36, onset: 11520, duration: 440 }, // C2
        { midi: 36, onset: 12000, duration: 200 }, // C2
        { midi: 43, onset: 12240, duration: 440 }, // G2
        { midi: 43, onset: 12720, duration: 200 }, // G2
        { midi: 48, onset: 12960, duration: 440 }, // C3
        { midi: 48, onset: 13440, duration: 200 }, // C3
        { midi: 43, onset: 13680, duration: 440 }, // G2
        { midi: 37, onset: 14160, duration: 200 }, // D♭2
        { midi: 36, onset: 14400, duration: 440 }, // C2
        { midi: 36, onset: 14880, duration: 200 }, // C2
        { midi: 43, onset: 15120, duration: 440 }, // G2
        { midi: 43, onset: 15600, duration: 200 }, // G2
        { midi: 48, onset: 15840, duration: 440 }, // C3
        { midi: 48, onset: 16320, duration: 200 }, // C3
        { midi: 43, onset: 16560, duration: 440 }, // G2
        { midi: 32, onset: 17040, duration: 200 }, // A♭1
        { midi: 31, onset: 17280, duration: 440 }, // G1
        { midi: 31, onset: 17760, duration: 200 }, // G1
        { midi: 38, onset: 18000, duration: 440 }, // D2
        { midi: 38, onset: 18480, duration: 200 }, // D2
        { midi: 43, onset: 18720, duration: 440 }, // G2
        { midi: 43, onset: 19200, duration: 200 }, // G2
        { midi: 38, onset: 19440, duration: 440 }, // D2
        { midi: 32, onset: 19920, duration: 200 }, // A♭1
        { midi: 31, onset: 20160, duration: 440 }, // G1
        { midi: 31, onset: 20640, duration: 200 }, // G1
        { midi: 38, onset: 20880, duration: 440 }, // D2
        { midi: 38, onset: 21360, duration: 200 }, // D2
        { midi: 43, onset: 21600, duration: 440 }, // G2
        { midi: 43, onset: 22080, duration: 200 }, // G2
        { midi: 38, onset: 22320, duration: 440 }, // D2
        { midi: 39, onset: 22800, duration: 200 }, // E♭2
        { midi: 38, onset: 23040, duration: 440 }, // D2
        { midi: 38, onset: 23520, duration: 200 }, // D2
        { midi: 45, onset: 23760, duration: 440 }, // A2
        { midi: 45, onset: 24240, duration: 200 }, // A2
        { midi: 50, onset: 24480, duration: 440 }, // D3
        { midi: 50, onset: 24960, duration: 200 }, // D3
        { midi: 45, onset: 25200, duration: 440 }, // A2
        { midi: 37, onset: 25680, duration: 200 }, // D♭2
        { midi: 36, onset: 25920, duration: 440 }, // C2
        { midi: 36, onset: 26400, duration: 200 }, // C2
        { midi: 43, onset: 26640, duration: 440 }, // G2
        { midi: 43, onset: 27120, duration: 200 }, // G2
        { midi: 48, onset: 27360, duration: 440 }, // C3
        { midi: 48, onset: 27840, duration: 200 }, // C3
        { midi: 43, onset: 28080, duration: 440 }, // G2
        { midi: 32, onset: 28560, duration: 200 }, // A♭1
        { midi: 31, onset: 28800, duration: 440 }, // G1
        { midi: 31, onset: 29280, duration: 200 }, // G1
        { midi: 38, onset: 29520, duration: 440 }, // D2
        { midi: 38, onset: 30000, duration: 200 }, // D2
        { midi: 43, onset: 30240, duration: 440 }, // G2
        { midi: 43, onset: 30720, duration: 200 }, // G2
        { midi: 38, onset: 30960, duration: 440 }, // D2
        { midi: 39, onset: 31440, duration: 200 }, // E♭2
        { midi: 38, onset: 31680, duration: 440 }, // D2
        { midi: 38, onset: 32160, duration: 200 }, // D2
        { midi: 45, onset: 32400, duration: 440 }, // A2
        { midi: 45, onset: 32880, duration: 200 }, // A2
        { midi: 50, onset: 33120, duration: 440 }, // D3
        { midi: 50, onset: 33600, duration: 200 }, // D3
        { midi: 45, onset: 33840, duration: 440 }, // A2
        { midi: 32, onset: 34320, duration: 200 }, // A♭1
      ],
    },
    {
      stepNumber: 32,
      module: 'blues_l2',
      section: 'C',
      subsection: 'C2: Peter’s Bass Line Through the Form (12/8)',
      activity: 'C2.1: Peter’s Blues Bass Line Through the 12-Bar (C)',
      direction:
        'Peter’s line on every chord of C Jam Blues, one note to each big beat: 1-3-5-6, then ♭7-6-5-3.',
      assessment: 'pitch_order_timing',
      tag: 'blues:l2_bass_peter_form | blues',
      styleRef: 'l2b',
      successFeedback: 'The boogie line, half-time.',
      key: 'C major',
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
      timeSignature: [12, 8],
      tempo: 150,
      targetNotes: [
        { midi: 48, onset: 0, duration: 700 }, // C3
        { midi: 52, onset: 720, duration: 700 }, // E3
        { midi: 55, onset: 1440, duration: 700 }, // G3
        { midi: 57, onset: 2160, duration: 700 }, // A3
        { midi: 58, onset: 2880, duration: 700 }, // B♭3
        { midi: 57, onset: 3600, duration: 700 }, // A3
        { midi: 55, onset: 4320, duration: 700 }, // G3
        { midi: 52, onset: 5040, duration: 700 }, // E3
        { midi: 48, onset: 5760, duration: 700 }, // C3
        { midi: 52, onset: 6480, duration: 700 }, // E3
        { midi: 55, onset: 7200, duration: 700 }, // G3
        { midi: 57, onset: 7920, duration: 700 }, // A3
        { midi: 58, onset: 8640, duration: 700 }, // B♭3
        { midi: 57, onset: 9360, duration: 700 }, // A3
        { midi: 55, onset: 10080, duration: 700 }, // G3
        { midi: 52, onset: 10800, duration: 700 }, // E3
        { midi: 41, onset: 11520, duration: 700 }, // F2
        { midi: 45, onset: 12240, duration: 700 }, // A2
        { midi: 48, onset: 12960, duration: 700 }, // C3
        { midi: 50, onset: 13680, duration: 700 }, // D3
        { midi: 51, onset: 14400, duration: 700 }, // E♭3
        { midi: 50, onset: 15120, duration: 700 }, // D3
        { midi: 48, onset: 15840, duration: 700 }, // C3
        { midi: 45, onset: 16560, duration: 700 }, // A2
        { midi: 48, onset: 17280, duration: 700 }, // C3
        { midi: 52, onset: 18000, duration: 700 }, // E3
        { midi: 55, onset: 18720, duration: 700 }, // G3
        { midi: 57, onset: 19440, duration: 700 }, // A3
        { midi: 58, onset: 20160, duration: 700 }, // B♭3
        { midi: 57, onset: 20880, duration: 700 }, // A3
        { midi: 55, onset: 21600, duration: 700 }, // G3
        { midi: 52, onset: 22320, duration: 700 }, // E3
        { midi: 43, onset: 23040, duration: 700 }, // G2
        { midi: 47, onset: 23760, duration: 700 }, // B2
        { midi: 50, onset: 24480, duration: 700 }, // D3
        { midi: 52, onset: 25200, duration: 700 }, // E3
        { midi: 53, onset: 25920, duration: 700 }, // F3
        { midi: 52, onset: 26640, duration: 700 }, // E3
        { midi: 50, onset: 27360, duration: 700 }, // D3
        { midi: 47, onset: 28080, duration: 700 }, // B2
        { midi: 48, onset: 28800, duration: 700 }, // C3
        { midi: 52, onset: 29520, duration: 700 }, // E3
        { midi: 55, onset: 30240, duration: 700 }, // G3
        { midi: 57, onset: 30960, duration: 700 }, // A3
        { midi: 58, onset: 31680, duration: 700 }, // B♭3
        { midi: 57, onset: 32400, duration: 700 }, // A3
        { midi: 55, onset: 33120, duration: 700 }, // G3
        { midi: 52, onset: 33840, duration: 700 }, // E3
      ],
    },
    {
      stepNumber: 33,
      module: 'blues_l2',
      section: 'C',
      subsection: 'C2: Peter’s Bass Line Through the Form (12/8)',
      activity: 'C2.2: Bass Play-Along — Peter’s Line in G',
      direction: 'The same line through the blues in G, under the band.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_bass_peter_g_play | blues',
      styleRef: 'l2b',
      successFeedback: 'The line in a new key, with the band.',
      key: 'G major',
      chordSymbols: [
        'G7',
        'G7',
        'G7',
        'G7',
        'C7',
        'C7',
        'G7',
        'G7',
        'D7',
        'D7',
        'G7',
        'G7',
      ],
      timeSignature: [12, 8],
      tempo: 150,
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 43, onset: 0, duration: 700 }, // G2
        { midi: 47, onset: 720, duration: 700 }, // B2
        { midi: 50, onset: 1440, duration: 700 }, // D3
        { midi: 52, onset: 2160, duration: 700 }, // E3
        { midi: 53, onset: 2880, duration: 700 }, // F3
        { midi: 52, onset: 3600, duration: 700 }, // E3
        { midi: 50, onset: 4320, duration: 700 }, // D3
        { midi: 47, onset: 5040, duration: 700 }, // B2
        { midi: 43, onset: 5760, duration: 700 }, // G2
        { midi: 47, onset: 6480, duration: 700 }, // B2
        { midi: 50, onset: 7200, duration: 700 }, // D3
        { midi: 52, onset: 7920, duration: 700 }, // E3
        { midi: 53, onset: 8640, duration: 700 }, // F3
        { midi: 52, onset: 9360, duration: 700 }, // E3
        { midi: 50, onset: 10080, duration: 700 }, // D3
        { midi: 47, onset: 10800, duration: 700 }, // B2
        { midi: 48, onset: 11520, duration: 700 }, // C3
        { midi: 52, onset: 12240, duration: 700 }, // E3
        { midi: 55, onset: 12960, duration: 700 }, // G3
        { midi: 57, onset: 13680, duration: 700 }, // A3
        { midi: 58, onset: 14400, duration: 700 }, // B♭3
        { midi: 57, onset: 15120, duration: 700 }, // A3
        { midi: 55, onset: 15840, duration: 700 }, // G3
        { midi: 52, onset: 16560, duration: 700 }, // E3
        { midi: 43, onset: 17280, duration: 700 }, // G2
        { midi: 47, onset: 18000, duration: 700 }, // B2
        { midi: 50, onset: 18720, duration: 700 }, // D3
        { midi: 52, onset: 19440, duration: 700 }, // E3
        { midi: 53, onset: 20160, duration: 700 }, // F3
        { midi: 52, onset: 20880, duration: 700 }, // E3
        { midi: 50, onset: 21600, duration: 700 }, // D3
        { midi: 47, onset: 22320, duration: 700 }, // B2
        { midi: 50, onset: 23040, duration: 700 }, // D3
        { midi: 54, onset: 23760, duration: 700 }, // G♭3
        { midi: 57, onset: 24480, duration: 700 }, // A3
        { midi: 59, onset: 25200, duration: 700 }, // B3
        { midi: 60, onset: 25920, duration: 700 }, // C4
        { midi: 59, onset: 26640, duration: 700 }, // B3
        { midi: 57, onset: 27360, duration: 700 }, // A3
        { midi: 54, onset: 28080, duration: 700 }, // G♭3
        { midi: 43, onset: 28800, duration: 700 }, // G2
        { midi: 47, onset: 29520, duration: 700 }, // B2
        { midi: 50, onset: 30240, duration: 700 }, // D3
        { midi: 52, onset: 30960, duration: 700 }, // E3
        { midi: 53, onset: 31680, duration: 700 }, // F3
        { midi: 52, onset: 32400, duration: 700 }, // E3
        { midi: 50, onset: 33120, duration: 700 }, // D3
        { midi: 47, onset: 33840, duration: 700 }, // B2
      ],
    },
    {
      stepNumber: 34,
      module: 'blues_l2',
      section: 'C',
      subsection: 'C3: The Boogie Through the 12-Bar (Shuffle)',
      activity: 'C3.1: Boogie — the 12-Bar in E',
      direction:
        'The boogie through the I–IV–V blues: on a new chord, start on its root.',
      assessment: 'pitch_order_timing',
      tag: 'blues:l2_bass_boogie_e | blues',
      styleRef: 'l2a',
      successFeedback: 'The boogie through all twelve bars.',
      key: 'E major',
      chordSymbols: [
        'E7',
        'E7',
        'E7',
        'E7',
        'A7',
        'A7',
        'E7',
        'E7',
        'B7',
        'A7',
        'E7',
        'E7',
      ],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      targetNotes: [
        { midi: 40, onset: 0, duration: 460 }, // E2
        { midi: 44, onset: 480, duration: 460 }, // A♭2
        { midi: 47, onset: 960, duration: 460 }, // B2
        { midi: 49, onset: 1440, duration: 460 }, // D♭3
        { midi: 50, onset: 1920, duration: 460 }, // D3
        { midi: 49, onset: 2400, duration: 460 }, // D♭3
        { midi: 47, onset: 2880, duration: 460 }, // B2
        { midi: 44, onset: 3360, duration: 460 }, // A♭2
        { midi: 40, onset: 3840, duration: 460 }, // E2
        { midi: 44, onset: 4320, duration: 460 }, // A♭2
        { midi: 47, onset: 4800, duration: 460 }, // B2
        { midi: 49, onset: 5280, duration: 460 }, // D♭3
        { midi: 50, onset: 5760, duration: 460 }, // D3
        { midi: 49, onset: 6240, duration: 460 }, // D♭3
        { midi: 47, onset: 6720, duration: 460 }, // B2
        { midi: 44, onset: 7200, duration: 460 }, // A♭2
        { midi: 33, onset: 7680, duration: 460 }, // A1
        { midi: 37, onset: 8160, duration: 460 }, // D♭2
        { midi: 40, onset: 8640, duration: 460 }, // E2
        { midi: 42, onset: 9120, duration: 460 }, // G♭2
        { midi: 43, onset: 9600, duration: 460 }, // G2
        { midi: 42, onset: 10080, duration: 460 }, // G♭2
        { midi: 40, onset: 10560, duration: 460 }, // E2
        { midi: 37, onset: 11040, duration: 460 }, // D♭2
        { midi: 40, onset: 11520, duration: 460 }, // E2
        { midi: 44, onset: 12000, duration: 460 }, // A♭2
        { midi: 47, onset: 12480, duration: 460 }, // B2
        { midi: 49, onset: 12960, duration: 460 }, // D♭3
        { midi: 50, onset: 13440, duration: 460 }, // D3
        { midi: 49, onset: 13920, duration: 460 }, // D♭3
        { midi: 47, onset: 14400, duration: 460 }, // B2
        { midi: 44, onset: 14880, duration: 460 }, // A♭2
        { midi: 35, onset: 15360, duration: 460 }, // B1
        { midi: 39, onset: 15840, duration: 460 }, // E♭2
        { midi: 42, onset: 16320, duration: 460 }, // G♭2
        { midi: 44, onset: 16800, duration: 460 }, // A♭2
        { midi: 33, onset: 17280, duration: 460 }, // A1
        { midi: 42, onset: 17760, duration: 460 }, // G♭2
        { midi: 40, onset: 18240, duration: 460 }, // E2
        { midi: 37, onset: 18720, duration: 460 }, // D♭2
        { midi: 40, onset: 19200, duration: 460 }, // E2
        { midi: 44, onset: 19680, duration: 460 }, // A♭2
        { midi: 47, onset: 20160, duration: 460 }, // B2
        { midi: 49, onset: 20640, duration: 460 }, // D♭3
        { midi: 50, onset: 21120, duration: 460 }, // D3
        { midi: 49, onset: 21600, duration: 460 }, // D♭3
        { midi: 47, onset: 22080, duration: 460 }, // B2
        { midi: 44, onset: 22560, duration: 460 }, // A♭2
      ],
    },
    {
      stepNumber: 35,
      module: 'blues_l2',
      section: 'C',
      subsection: 'C3: The Boogie Through the 12-Bar (Shuffle)',
      activity: 'C3.2: Bass Play-Along — Boogie, the Quick-Change Blues in G',
      direction:
        'The boogie with the quick change: C7 in bar 2, D7 to turn around in bar 12.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_bass_boogie_g_play | blues',
      styleRef: 'l2a',
      successFeedback: 'The quick change, from the bottom.',
      key: 'G major',
      chordSymbols: [
        'G7',
        'C7',
        'G7',
        'G7',
        'C7',
        'C7',
        'G7',
        'G7',
        'D7',
        'C7',
        'G7',
        'D7',
      ],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 31, onset: 0, duration: 460 }, // G1
        { midi: 35, onset: 480, duration: 460 }, // B1
        { midi: 38, onset: 960, duration: 460 }, // D2
        { midi: 40, onset: 1440, duration: 460 }, // E2
        { midi: 36, onset: 1920, duration: 460 }, // C2
        { midi: 45, onset: 2400, duration: 460 }, // A2
        { midi: 43, onset: 2880, duration: 460 }, // G2
        { midi: 40, onset: 3360, duration: 460 }, // E2
        { midi: 31, onset: 3840, duration: 460 }, // G1
        { midi: 35, onset: 4320, duration: 460 }, // B1
        { midi: 38, onset: 4800, duration: 460 }, // D2
        { midi: 40, onset: 5280, duration: 460 }, // E2
        { midi: 41, onset: 5760, duration: 460 }, // F2
        { midi: 40, onset: 6240, duration: 460 }, // E2
        { midi: 38, onset: 6720, duration: 460 }, // D2
        { midi: 35, onset: 7200, duration: 460 }, // B1
        { midi: 36, onset: 7680, duration: 460 }, // C2
        { midi: 40, onset: 8160, duration: 460 }, // E2
        { midi: 43, onset: 8640, duration: 460 }, // G2
        { midi: 45, onset: 9120, duration: 460 }, // A2
        { midi: 46, onset: 9600, duration: 460 }, // B♭2
        { midi: 45, onset: 10080, duration: 460 }, // A2
        { midi: 43, onset: 10560, duration: 460 }, // G2
        { midi: 40, onset: 11040, duration: 460 }, // E2
        { midi: 31, onset: 11520, duration: 460 }, // G1
        { midi: 35, onset: 12000, duration: 460 }, // B1
        { midi: 38, onset: 12480, duration: 460 }, // D2
        { midi: 40, onset: 12960, duration: 460 }, // E2
        { midi: 41, onset: 13440, duration: 460 }, // F2
        { midi: 40, onset: 13920, duration: 460 }, // E2
        { midi: 38, onset: 14400, duration: 460 }, // D2
        { midi: 35, onset: 14880, duration: 460 }, // B1
        { midi: 38, onset: 15360, duration: 460 }, // D2
        { midi: 42, onset: 15840, duration: 460 }, // G♭2
        { midi: 45, onset: 16320, duration: 460 }, // A2
        { midi: 47, onset: 16800, duration: 460 }, // B2
        { midi: 36, onset: 17280, duration: 460 }, // C2
        { midi: 45, onset: 17760, duration: 460 }, // A2
        { midi: 43, onset: 18240, duration: 460 }, // G2
        { midi: 40, onset: 18720, duration: 460 }, // E2
        { midi: 31, onset: 19200, duration: 460 }, // G1
        { midi: 35, onset: 19680, duration: 460 }, // B1
        { midi: 38, onset: 20160, duration: 460 }, // D2
        { midi: 40, onset: 20640, duration: 460 }, // E2
        { midi: 38, onset: 21120, duration: 460 }, // D2
        { midi: 47, onset: 21600, duration: 460 }, // B2
        { midi: 45, onset: 22080, duration: 460 }, // A2
        { midi: 42, onset: 22560, duration: 460 }, // G♭2
      ],
    },
  ],
};

const bluesL2SectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 36,
      module: 'blues_l2',
      section: 'D',
      subsection: 'D1: LH Bass, RH Shells (Half-Time Shuffle)',
      activity: 'D1.1: LH Peter’s Line + RH 3-7 Shells — the 12-Bar in C',
      direction:
        'Left hand Peter’s line, one note a beat; right hand two notes a chord: E–B♭, E♭–A, F–B.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_perf_line_shells | blues',
      styleRef: 'l2b',
      successFeedback: 'Bass and comping, half-time.',
      key: 'C major',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l2b',
      },
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
      timeSignature: [12, 8],
      tempo: 150,
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 48, onset: 0, duration: 700, hand: 'lh' }, // C3
        { midi: 52, onset: 720, duration: 700, hand: 'lh' }, // E3
        { midi: 55, onset: 1440, duration: 700, hand: 'lh' }, // G3
        { midi: 57, onset: 2160, duration: 700, hand: 'lh' }, // A3
        { midi: 58, onset: 2880, duration: 700, hand: 'lh' }, // B♭3
        { midi: 57, onset: 3600, duration: 700, hand: 'lh' }, // A3
        { midi: 55, onset: 4320, duration: 700, hand: 'lh' }, // G3
        { midi: 52, onset: 5040, duration: 700, hand: 'lh' }, // E3
        { midi: 48, onset: 5760, duration: 700, hand: 'lh' }, // C3
        { midi: 52, onset: 6480, duration: 700, hand: 'lh' }, // E3
        { midi: 55, onset: 7200, duration: 700, hand: 'lh' }, // G3
        { midi: 57, onset: 7920, duration: 700, hand: 'lh' }, // A3
        { midi: 58, onset: 8640, duration: 700, hand: 'lh' }, // B♭3
        { midi: 57, onset: 9360, duration: 700, hand: 'lh' }, // A3
        { midi: 55, onset: 10080, duration: 700, hand: 'lh' }, // G3
        { midi: 52, onset: 10800, duration: 700, hand: 'lh' }, // E3
        { midi: 41, onset: 11520, duration: 700, hand: 'lh' }, // F2
        { midi: 45, onset: 12240, duration: 700, hand: 'lh' }, // A2
        { midi: 48, onset: 12960, duration: 700, hand: 'lh' }, // C3
        { midi: 50, onset: 13680, duration: 700, hand: 'lh' }, // D3
        { midi: 51, onset: 14400, duration: 700, hand: 'lh' }, // E♭3
        { midi: 50, onset: 15120, duration: 700, hand: 'lh' }, // D3
        { midi: 48, onset: 15840, duration: 700, hand: 'lh' }, // C3
        { midi: 45, onset: 16560, duration: 700, hand: 'lh' }, // A2
        { midi: 48, onset: 17280, duration: 700, hand: 'lh' }, // C3
        { midi: 52, onset: 18000, duration: 700, hand: 'lh' }, // E3
        { midi: 55, onset: 18720, duration: 700, hand: 'lh' }, // G3
        { midi: 57, onset: 19440, duration: 700, hand: 'lh' }, // A3
        { midi: 58, onset: 20160, duration: 700, hand: 'lh' }, // B♭3
        { midi: 57, onset: 20880, duration: 700, hand: 'lh' }, // A3
        { midi: 55, onset: 21600, duration: 700, hand: 'lh' }, // G3
        { midi: 52, onset: 22320, duration: 700, hand: 'lh' }, // E3
        { midi: 43, onset: 23040, duration: 700, hand: 'lh' }, // G2
        { midi: 47, onset: 23760, duration: 700, hand: 'lh' }, // B2
        { midi: 50, onset: 24480, duration: 700, hand: 'lh' }, // D3
        { midi: 52, onset: 25200, duration: 700, hand: 'lh' }, // E3
        { midi: 53, onset: 25920, duration: 700, hand: 'lh' }, // F3
        { midi: 52, onset: 26640, duration: 700, hand: 'lh' }, // E3
        { midi: 50, onset: 27360, duration: 700, hand: 'lh' }, // D3
        { midi: 47, onset: 28080, duration: 700, hand: 'lh' }, // B2
        { midi: 48, onset: 28800, duration: 700, hand: 'lh' }, // C3
        { midi: 52, onset: 29520, duration: 700, hand: 'lh' }, // E3
        { midi: 55, onset: 30240, duration: 700, hand: 'lh' }, // G3
        { midi: 57, onset: 30960, duration: 700, hand: 'lh' }, // A3
        { midi: 58, onset: 31680, duration: 700, hand: 'lh' }, // B♭3
        { midi: 57, onset: 32400, duration: 700, hand: 'lh' }, // A3
        { midi: 55, onset: 33120, duration: 700, hand: 'lh' }, // G3
        { midi: 52, onset: 33840, duration: 700, hand: 'lh' }, // E3
        { midi: 64, onset: 0, duration: 2820, hand: 'rh' }, // E4
        { midi: 70, onset: 0, duration: 2820, hand: 'rh' }, // B♭4
        { midi: 64, onset: 2880, duration: 2820, hand: 'rh' }, // E4
        { midi: 70, onset: 2880, duration: 2820, hand: 'rh' }, // B♭4
        { midi: 64, onset: 5760, duration: 2820, hand: 'rh' }, // E4
        { midi: 70, onset: 5760, duration: 2820, hand: 'rh' }, // B♭4
        { midi: 64, onset: 8640, duration: 2820, hand: 'rh' }, // E4
        { midi: 70, onset: 8640, duration: 2820, hand: 'rh' }, // B♭4
        { midi: 63, onset: 11520, duration: 2820, hand: 'rh' }, // E♭4
        { midi: 69, onset: 11520, duration: 2820, hand: 'rh' }, // A4
        { midi: 63, onset: 14400, duration: 2820, hand: 'rh' }, // E♭4
        { midi: 69, onset: 14400, duration: 2820, hand: 'rh' }, // A4
        { midi: 64, onset: 17280, duration: 2820, hand: 'rh' }, // E4
        { midi: 70, onset: 17280, duration: 2820, hand: 'rh' }, // B♭4
        { midi: 64, onset: 20160, duration: 2820, hand: 'rh' }, // E4
        { midi: 70, onset: 20160, duration: 2820, hand: 'rh' }, // B♭4
        { midi: 65, onset: 23040, duration: 2820, hand: 'rh' }, // F4
        { midi: 71, onset: 23040, duration: 2820, hand: 'rh' }, // B4
        { midi: 65, onset: 25920, duration: 2820, hand: 'rh' }, // F4
        { midi: 71, onset: 25920, duration: 2820, hand: 'rh' }, // B4
        { midi: 64, onset: 28800, duration: 2820, hand: 'rh' }, // E4
        { midi: 70, onset: 28800, duration: 2820, hand: 'rh' }, // B♭4
        { midi: 64, onset: 31680, duration: 2820, hand: 'rh' }, // E4
        { midi: 70, onset: 31680, duration: 2820, hand: 'rh' }, // B♭4
      ],
    },
    {
      stepNumber: 37,
      module: 'blues_l2',
      section: 'D',
      subsection: 'D1: LH Bass, RH Shells (Half-Time Shuffle)',
      activity:
        'D1.2: LH Half-Time Shuffle + RH 7-3-5 and 3-7-9 — the 12-Bar in E',
      direction:
        'Left hand the half-time shuffle; right hand the voicings from B2, an octave up.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_perf_ht_735 | blues',
      styleRef: 'l2b',
      successFeedback: 'The whole half-time shuffle in two hands.',
      key: 'E major',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l2b',
      },
      chordSymbols: [
        'E9',
        'A7',
        'E9',
        'E9',
        'A7',
        'A7',
        'E9',
        'E9',
        'B7',
        'A7',
        'E9',
        'B7',
      ],
      timeSignature: [12, 8],
      tempo: 150,
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 40, onset: 0, duration: 440, hand: 'lh' }, // E2
        { midi: 40, onset: 480, duration: 200, hand: 'lh' }, // E2
        { midi: 47, onset: 720, duration: 440, hand: 'lh' }, // B2
        { midi: 47, onset: 1200, duration: 200, hand: 'lh' }, // B2
        { midi: 52, onset: 1440, duration: 440, hand: 'lh' }, // E3
        { midi: 52, onset: 1920, duration: 200, hand: 'lh' }, // E3
        { midi: 47, onset: 2160, duration: 440, hand: 'lh' }, // B2
        { midi: 34, onset: 2640, duration: 200, hand: 'lh' }, // A♯1
        { midi: 33, onset: 2880, duration: 440, hand: 'lh' }, // A1
        { midi: 33, onset: 3360, duration: 200, hand: 'lh' }, // A1
        { midi: 40, onset: 3600, duration: 440, hand: 'lh' }, // E2
        { midi: 40, onset: 4080, duration: 200, hand: 'lh' }, // E2
        { midi: 45, onset: 4320, duration: 440, hand: 'lh' }, // A2
        { midi: 45, onset: 4800, duration: 200, hand: 'lh' }, // A2
        { midi: 40, onset: 5040, duration: 440, hand: 'lh' }, // E2
        { midi: 41, onset: 5520, duration: 200, hand: 'lh' }, // F2
        { midi: 40, onset: 5760, duration: 440, hand: 'lh' }, // E2
        { midi: 40, onset: 6240, duration: 200, hand: 'lh' }, // E2
        { midi: 47, onset: 6480, duration: 440, hand: 'lh' }, // B2
        { midi: 47, onset: 6960, duration: 200, hand: 'lh' }, // B2
        { midi: 52, onset: 7200, duration: 440, hand: 'lh' }, // E3
        { midi: 52, onset: 7680, duration: 200, hand: 'lh' }, // E3
        { midi: 47, onset: 7920, duration: 440, hand: 'lh' }, // B2
        { midi: 41, onset: 8400, duration: 200, hand: 'lh' }, // F2
        { midi: 40, onset: 8640, duration: 440, hand: 'lh' }, // E2
        { midi: 40, onset: 9120, duration: 200, hand: 'lh' }, // E2
        { midi: 47, onset: 9360, duration: 440, hand: 'lh' }, // B2
        { midi: 47, onset: 9840, duration: 200, hand: 'lh' }, // B2
        { midi: 52, onset: 10080, duration: 440, hand: 'lh' }, // E3
        { midi: 52, onset: 10560, duration: 200, hand: 'lh' }, // E3
        { midi: 47, onset: 10800, duration: 440, hand: 'lh' }, // B2
        { midi: 34, onset: 11280, duration: 200, hand: 'lh' }, // A♯1
        { midi: 33, onset: 11520, duration: 440, hand: 'lh' }, // A1
        { midi: 33, onset: 12000, duration: 200, hand: 'lh' }, // A1
        { midi: 40, onset: 12240, duration: 440, hand: 'lh' }, // E2
        { midi: 40, onset: 12720, duration: 200, hand: 'lh' }, // E2
        { midi: 45, onset: 12960, duration: 440, hand: 'lh' }, // A2
        { midi: 45, onset: 13440, duration: 200, hand: 'lh' }, // A2
        { midi: 40, onset: 13680, duration: 440, hand: 'lh' }, // E2
        { midi: 34, onset: 14160, duration: 200, hand: 'lh' }, // A♯1
        { midi: 33, onset: 14400, duration: 440, hand: 'lh' }, // A1
        { midi: 33, onset: 14880, duration: 200, hand: 'lh' }, // A1
        { midi: 40, onset: 15120, duration: 440, hand: 'lh' }, // E2
        { midi: 40, onset: 15600, duration: 200, hand: 'lh' }, // E2
        { midi: 45, onset: 15840, duration: 440, hand: 'lh' }, // A2
        { midi: 45, onset: 16320, duration: 200, hand: 'lh' }, // A2
        { midi: 40, onset: 16560, duration: 440, hand: 'lh' }, // E2
        { midi: 41, onset: 17040, duration: 200, hand: 'lh' }, // F2
        { midi: 40, onset: 17280, duration: 440, hand: 'lh' }, // E2
        { midi: 40, onset: 17760, duration: 200, hand: 'lh' }, // E2
        { midi: 47, onset: 18000, duration: 440, hand: 'lh' }, // B2
        { midi: 47, onset: 18480, duration: 200, hand: 'lh' }, // B2
        { midi: 52, onset: 18720, duration: 440, hand: 'lh' }, // E3
        { midi: 52, onset: 19200, duration: 200, hand: 'lh' }, // E3
        { midi: 47, onset: 19440, duration: 440, hand: 'lh' }, // B2
        { midi: 41, onset: 19920, duration: 200, hand: 'lh' }, // F2
        { midi: 40, onset: 20160, duration: 440, hand: 'lh' }, // E2
        { midi: 40, onset: 20640, duration: 200, hand: 'lh' }, // E2
        { midi: 47, onset: 20880, duration: 440, hand: 'lh' }, // B2
        { midi: 47, onset: 21360, duration: 200, hand: 'lh' }, // B2
        { midi: 52, onset: 21600, duration: 440, hand: 'lh' }, // E3
        { midi: 52, onset: 22080, duration: 200, hand: 'lh' }, // E3
        { midi: 47, onset: 22320, duration: 440, hand: 'lh' }, // B2
        { midi: 36, onset: 22800, duration: 200, hand: 'lh' }, // C2
        { midi: 35, onset: 23040, duration: 440, hand: 'lh' }, // B1
        { midi: 35, onset: 23520, duration: 200, hand: 'lh' }, // B1
        { midi: 42, onset: 23760, duration: 440, hand: 'lh' }, // F♯2
        { midi: 42, onset: 24240, duration: 200, hand: 'lh' }, // F♯2
        { midi: 47, onset: 24480, duration: 440, hand: 'lh' }, // B2
        { midi: 47, onset: 24960, duration: 200, hand: 'lh' }, // B2
        { midi: 42, onset: 25200, duration: 440, hand: 'lh' }, // F♯2
        { midi: 34, onset: 25680, duration: 200, hand: 'lh' }, // A♯1
        { midi: 33, onset: 25920, duration: 440, hand: 'lh' }, // A1
        { midi: 33, onset: 26400, duration: 200, hand: 'lh' }, // A1
        { midi: 40, onset: 26640, duration: 440, hand: 'lh' }, // E2
        { midi: 40, onset: 27120, duration: 200, hand: 'lh' }, // E2
        { midi: 45, onset: 27360, duration: 440, hand: 'lh' }, // A2
        { midi: 45, onset: 27840, duration: 200, hand: 'lh' }, // A2
        { midi: 40, onset: 28080, duration: 440, hand: 'lh' }, // E2
        { midi: 41, onset: 28560, duration: 200, hand: 'lh' }, // F2
        { midi: 40, onset: 28800, duration: 440, hand: 'lh' }, // E2
        { midi: 40, onset: 29280, duration: 200, hand: 'lh' }, // E2
        { midi: 47, onset: 29520, duration: 440, hand: 'lh' }, // B2
        { midi: 47, onset: 30000, duration: 200, hand: 'lh' }, // B2
        { midi: 52, onset: 30240, duration: 440, hand: 'lh' }, // E3
        { midi: 52, onset: 30720, duration: 200, hand: 'lh' }, // E3
        { midi: 47, onset: 30960, duration: 440, hand: 'lh' }, // B2
        { midi: 36, onset: 31440, duration: 200, hand: 'lh' }, // C2
        { midi: 35, onset: 31680, duration: 440, hand: 'lh' }, // B1
        { midi: 35, onset: 32160, duration: 200, hand: 'lh' }, // B1
        { midi: 42, onset: 32400, duration: 440, hand: 'lh' }, // F♯2
        { midi: 42, onset: 32880, duration: 200, hand: 'lh' }, // F♯2
        { midi: 47, onset: 33120, duration: 440, hand: 'lh' }, // B2
        { midi: 47, onset: 33600, duration: 200, hand: 'lh' }, // B2
        { midi: 42, onset: 33840, duration: 440, hand: 'lh' }, // F♯2
        { midi: 41, onset: 34320, duration: 200, hand: 'lh' }, // F2
        { midi: 56, onset: 0, duration: 2820, hand: 'rh' }, // G♯3
        { midi: 62, onset: 0, duration: 2820, hand: 'rh' }, // D4
        { midi: 66, onset: 0, duration: 2820, hand: 'rh' }, // F♯4
        { midi: 55, onset: 2880, duration: 2820, hand: 'rh' }, // G3
        { midi: 61, onset: 2880, duration: 2820, hand: 'rh' }, // C♯4
        { midi: 64, onset: 2880, duration: 2820, hand: 'rh' }, // E4
        { midi: 56, onset: 5760, duration: 2820, hand: 'rh' }, // G♯3
        { midi: 62, onset: 5760, duration: 2820, hand: 'rh' }, // D4
        { midi: 66, onset: 5760, duration: 2820, hand: 'rh' }, // F♯4
        { midi: 56, onset: 8640, duration: 2820, hand: 'rh' }, // G♯3
        { midi: 62, onset: 8640, duration: 2820, hand: 'rh' }, // D4
        { midi: 66, onset: 8640, duration: 2820, hand: 'rh' }, // F♯4
        { midi: 55, onset: 11520, duration: 2820, hand: 'rh' }, // G3
        { midi: 61, onset: 11520, duration: 2820, hand: 'rh' }, // C♯4
        { midi: 64, onset: 11520, duration: 2820, hand: 'rh' }, // E4
        { midi: 55, onset: 14400, duration: 2820, hand: 'rh' }, // G3
        { midi: 61, onset: 14400, duration: 2820, hand: 'rh' }, // C♯4
        { midi: 64, onset: 14400, duration: 2820, hand: 'rh' }, // E4
        { midi: 56, onset: 17280, duration: 2820, hand: 'rh' }, // G♯3
        { midi: 62, onset: 17280, duration: 2820, hand: 'rh' }, // D4
        { midi: 66, onset: 17280, duration: 2820, hand: 'rh' }, // F♯4
        { midi: 56, onset: 20160, duration: 2820, hand: 'rh' }, // G♯3
        { midi: 62, onset: 20160, duration: 2820, hand: 'rh' }, // D4
        { midi: 66, onset: 20160, duration: 2820, hand: 'rh' }, // F♯4
        { midi: 57, onset: 23040, duration: 2820, hand: 'rh' }, // A3
        { midi: 63, onset: 23040, duration: 2820, hand: 'rh' }, // D♯4
        { midi: 66, onset: 23040, duration: 2820, hand: 'rh' }, // F♯4
        { midi: 55, onset: 25920, duration: 2820, hand: 'rh' }, // G3
        { midi: 61, onset: 25920, duration: 2820, hand: 'rh' }, // C♯4
        { midi: 64, onset: 25920, duration: 2820, hand: 'rh' }, // E4
        { midi: 56, onset: 28800, duration: 2820, hand: 'rh' }, // G♯3
        { midi: 62, onset: 28800, duration: 2820, hand: 'rh' }, // D4
        { midi: 66, onset: 28800, duration: 2820, hand: 'rh' }, // F♯4
        { midi: 57, onset: 31680, duration: 2820, hand: 'rh' }, // A3
        { midi: 63, onset: 31680, duration: 2820, hand: 'rh' }, // D♯4
        { midi: 66, onset: 31680, duration: 2820, hand: 'rh' }, // F♯4
      ],
    },
    {
      stepNumber: 38,
      module: 'blues_l2',
      section: 'D',
      subsection: 'D2: Both Hands Through the 12-Bar (Shuffle)',
      activity:
        'D2.1: LH Boogie + RH Triad Pairs — the Quick-Change Blues in G',
      direction:
        'Left hand the boogie; right hand the pair on each chord: G and C/G, C and F/C, D and G/D.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_perf_boogie_pairs | blues',
      styleRef: 'l2a',
      successFeedback: 'A full shuffle band in two hands.',
      key: 'G major',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l2a',
      },
      chordSymbols: [
        'G7',
        'G7',
        'C7',
        'C7',
        'G7',
        'G7',
        'G7',
        'G7',
        'C7',
        'C7',
        'C7',
        'C7',
        'G7',
        'G7',
        'G7',
        'G7',
        'D7',
        'D7',
        'C7',
        'C7',
        'G7',
        'G7',
        'D7',
        'D7',
      ],
      chordsPerBar: 2,
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 43, onset: 0, duration: 460, hand: 'lh' }, // G2
        { midi: 47, onset: 480, duration: 460, hand: 'lh' }, // B2
        { midi: 50, onset: 960, duration: 460, hand: 'lh' }, // D3
        { midi: 52, onset: 1440, duration: 460, hand: 'lh' }, // E3
        { midi: 48, onset: 1920, duration: 460, hand: 'lh' }, // C3
        { midi: 57, onset: 2400, duration: 460, hand: 'lh' }, // A3
        { midi: 55, onset: 2880, duration: 460, hand: 'lh' }, // G3
        { midi: 52, onset: 3360, duration: 460, hand: 'lh' }, // E3
        { midi: 43, onset: 3840, duration: 460, hand: 'lh' }, // G2
        { midi: 47, onset: 4320, duration: 460, hand: 'lh' }, // B2
        { midi: 50, onset: 4800, duration: 460, hand: 'lh' }, // D3
        { midi: 52, onset: 5280, duration: 460, hand: 'lh' }, // E3
        { midi: 53, onset: 5760, duration: 460, hand: 'lh' }, // F3
        { midi: 52, onset: 6240, duration: 460, hand: 'lh' }, // E3
        { midi: 50, onset: 6720, duration: 460, hand: 'lh' }, // D3
        { midi: 47, onset: 7200, duration: 460, hand: 'lh' }, // B2
        { midi: 48, onset: 7680, duration: 460, hand: 'lh' }, // C3
        { midi: 52, onset: 8160, duration: 460, hand: 'lh' }, // E3
        { midi: 55, onset: 8640, duration: 460, hand: 'lh' }, // G3
        { midi: 57, onset: 9120, duration: 460, hand: 'lh' }, // A3
        { midi: 58, onset: 9600, duration: 460, hand: 'lh' }, // B♭3
        { midi: 57, onset: 10080, duration: 460, hand: 'lh' }, // A3
        { midi: 55, onset: 10560, duration: 460, hand: 'lh' }, // G3
        { midi: 52, onset: 11040, duration: 460, hand: 'lh' }, // E3
        { midi: 43, onset: 11520, duration: 460, hand: 'lh' }, // G2
        { midi: 47, onset: 12000, duration: 460, hand: 'lh' }, // B2
        { midi: 50, onset: 12480, duration: 460, hand: 'lh' }, // D3
        { midi: 52, onset: 12960, duration: 460, hand: 'lh' }, // E3
        { midi: 53, onset: 13440, duration: 460, hand: 'lh' }, // F3
        { midi: 52, onset: 13920, duration: 460, hand: 'lh' }, // E3
        { midi: 50, onset: 14400, duration: 460, hand: 'lh' }, // D3
        { midi: 47, onset: 14880, duration: 460, hand: 'lh' }, // B2
        { midi: 50, onset: 15360, duration: 460, hand: 'lh' }, // D3
        { midi: 54, onset: 15840, duration: 460, hand: 'lh' }, // G♭3
        { midi: 57, onset: 16320, duration: 460, hand: 'lh' }, // A3
        { midi: 59, onset: 16800, duration: 460, hand: 'lh' }, // B3
        { midi: 48, onset: 17280, duration: 460, hand: 'lh' }, // C3
        { midi: 57, onset: 17760, duration: 460, hand: 'lh' }, // A3
        { midi: 55, onset: 18240, duration: 460, hand: 'lh' }, // G3
        { midi: 52, onset: 18720, duration: 460, hand: 'lh' }, // E3
        { midi: 43, onset: 19200, duration: 460, hand: 'lh' }, // G2
        { midi: 47, onset: 19680, duration: 460, hand: 'lh' }, // B2
        { midi: 50, onset: 20160, duration: 460, hand: 'lh' }, // D3
        { midi: 52, onset: 20640, duration: 460, hand: 'lh' }, // E3
        { midi: 50, onset: 21120, duration: 460, hand: 'lh' }, // D3
        { midi: 59, onset: 21600, duration: 460, hand: 'lh' }, // B3
        { midi: 57, onset: 22080, duration: 460, hand: 'lh' }, // A3
        { midi: 54, onset: 22560, duration: 460, hand: 'lh' }, // G♭3
        { midi: 59, onset: 0, duration: 460, hand: 'rh' }, // B3
        { midi: 62, onset: 0, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 0, duration: 460, hand: 'rh' }, // G4
        { midi: 60, onset: 480, duration: 460, hand: 'rh' }, // C4
        { midi: 64, onset: 480, duration: 460, hand: 'rh' }, // E4
        { midi: 67, onset: 480, duration: 460, hand: 'rh' }, // G4
        { midi: 59, onset: 960, duration: 460, hand: 'rh' }, // B3
        { midi: 62, onset: 960, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 960, duration: 460, hand: 'rh' }, // G4
        { midi: 60, onset: 1440, duration: 460, hand: 'rh' }, // C4
        { midi: 64, onset: 1440, duration: 460, hand: 'rh' }, // E4
        { midi: 67, onset: 1440, duration: 460, hand: 'rh' }, // G4
        { midi: 64, onset: 1920, duration: 460, hand: 'rh' }, // E4
        { midi: 67, onset: 1920, duration: 460, hand: 'rh' }, // G4
        { midi: 72, onset: 1920, duration: 460, hand: 'rh' }, // C5
        { midi: 65, onset: 2400, duration: 220, hand: 'rh' }, // F4
        { midi: 69, onset: 2400, duration: 220, hand: 'rh' }, // A4
        { midi: 72, onset: 2400, duration: 220, hand: 'rh' }, // C5
        { midi: 64, onset: 2640, duration: 1140, hand: 'rh' }, // E4
        { midi: 67, onset: 2640, duration: 1140, hand: 'rh' }, // G4
        { midi: 72, onset: 2640, duration: 1140, hand: 'rh' }, // C5
        { midi: 60, onset: 3840, duration: 220, hand: 'rh' }, // C4
        { midi: 64, onset: 3840, duration: 220, hand: 'rh' }, // E4
        { midi: 67, onset: 3840, duration: 220, hand: 'rh' }, // G4
        { midi: 59, onset: 4080, duration: 220, hand: 'rh' }, // B3
        { midi: 62, onset: 4080, duration: 220, hand: 'rh' }, // D4
        { midi: 67, onset: 4080, duration: 220, hand: 'rh' }, // G4
        { midi: 60, onset: 4320, duration: 220, hand: 'rh' }, // C4
        { midi: 64, onset: 4320, duration: 220, hand: 'rh' }, // E4
        { midi: 67, onset: 4320, duration: 220, hand: 'rh' }, // G4
        { midi: 59, onset: 4560, duration: 700, hand: 'rh' }, // B3
        { midi: 62, onset: 4560, duration: 700, hand: 'rh' }, // D4
        { midi: 67, onset: 4560, duration: 700, hand: 'rh' }, // G4
        { midi: 60, onset: 5280, duration: 460, hand: 'rh' }, // C4
        { midi: 64, onset: 5280, duration: 460, hand: 'rh' }, // E4
        { midi: 67, onset: 5280, duration: 460, hand: 'rh' }, // G4
        { midi: 59, onset: 5760, duration: 1860, hand: 'rh' }, // B3
        { midi: 62, onset: 5760, duration: 1860, hand: 'rh' }, // D4
        { midi: 67, onset: 5760, duration: 1860, hand: 'rh' }, // G4
        { midi: 64, onset: 7680, duration: 460, hand: 'rh' }, // E4
        { midi: 67, onset: 7680, duration: 460, hand: 'rh' }, // G4
        { midi: 72, onset: 7680, duration: 460, hand: 'rh' }, // C5
        { midi: 65, onset: 8160, duration: 460, hand: 'rh' }, // F4
        { midi: 69, onset: 8160, duration: 460, hand: 'rh' }, // A4
        { midi: 72, onset: 8160, duration: 460, hand: 'rh' }, // C5
        { midi: 64, onset: 8640, duration: 460, hand: 'rh' }, // E4
        { midi: 67, onset: 8640, duration: 460, hand: 'rh' }, // G4
        { midi: 72, onset: 8640, duration: 460, hand: 'rh' }, // C5
        { midi: 65, onset: 9120, duration: 460, hand: 'rh' }, // F4
        { midi: 69, onset: 9120, duration: 460, hand: 'rh' }, // A4
        { midi: 72, onset: 9120, duration: 460, hand: 'rh' }, // C5
        { midi: 64, onset: 9600, duration: 460, hand: 'rh' }, // E4
        { midi: 67, onset: 9600, duration: 460, hand: 'rh' }, // G4
        { midi: 72, onset: 9600, duration: 460, hand: 'rh' }, // C5
        { midi: 65, onset: 10080, duration: 220, hand: 'rh' }, // F4
        { midi: 69, onset: 10080, duration: 220, hand: 'rh' }, // A4
        { midi: 72, onset: 10080, duration: 220, hand: 'rh' }, // C5
        { midi: 64, onset: 10320, duration: 1140, hand: 'rh' }, // E4
        { midi: 67, onset: 10320, duration: 1140, hand: 'rh' }, // G4
        { midi: 72, onset: 10320, duration: 1140, hand: 'rh' }, // C5
        { midi: 60, onset: 11520, duration: 220, hand: 'rh' }, // C4
        { midi: 64, onset: 11520, duration: 220, hand: 'rh' }, // E4
        { midi: 67, onset: 11520, duration: 220, hand: 'rh' }, // G4
        { midi: 59, onset: 11760, duration: 220, hand: 'rh' }, // B3
        { midi: 62, onset: 11760, duration: 220, hand: 'rh' }, // D4
        { midi: 67, onset: 11760, duration: 220, hand: 'rh' }, // G4
        { midi: 60, onset: 12000, duration: 220, hand: 'rh' }, // C4
        { midi: 64, onset: 12000, duration: 220, hand: 'rh' }, // E4
        { midi: 67, onset: 12000, duration: 220, hand: 'rh' }, // G4
        { midi: 59, onset: 12240, duration: 700, hand: 'rh' }, // B3
        { midi: 62, onset: 12240, duration: 700, hand: 'rh' }, // D4
        { midi: 67, onset: 12240, duration: 700, hand: 'rh' }, // G4
        { midi: 60, onset: 12960, duration: 460, hand: 'rh' }, // C4
        { midi: 64, onset: 12960, duration: 460, hand: 'rh' }, // E4
        { midi: 67, onset: 12960, duration: 460, hand: 'rh' }, // G4
        { midi: 59, onset: 13440, duration: 1860, hand: 'rh' }, // B3
        { midi: 62, onset: 13440, duration: 1860, hand: 'rh' }, // D4
        { midi: 67, onset: 13440, duration: 1860, hand: 'rh' }, // G4
        { midi: 66, onset: 15360, duration: 460, hand: 'rh' }, // F♯4
        { midi: 69, onset: 15360, duration: 460, hand: 'rh' }, // A4
        { midi: 74, onset: 15360, duration: 460, hand: 'rh' }, // D5
        { midi: 67, onset: 15840, duration: 460, hand: 'rh' }, // G4
        { midi: 71, onset: 15840, duration: 460, hand: 'rh' }, // B4
        { midi: 74, onset: 15840, duration: 460, hand: 'rh' }, // D5
        { midi: 66, onset: 16320, duration: 460, hand: 'rh' }, // F♯4
        { midi: 69, onset: 16320, duration: 460, hand: 'rh' }, // A4
        { midi: 74, onset: 16320, duration: 460, hand: 'rh' }, // D5
        { midi: 67, onset: 16800, duration: 460, hand: 'rh' }, // G4
        { midi: 71, onset: 16800, duration: 460, hand: 'rh' }, // B4
        { midi: 74, onset: 16800, duration: 460, hand: 'rh' }, // D5
        { midi: 64, onset: 17280, duration: 460, hand: 'rh' }, // E4
        { midi: 67, onset: 17280, duration: 460, hand: 'rh' }, // G4
        { midi: 72, onset: 17280, duration: 460, hand: 'rh' }, // C5
        { midi: 65, onset: 17760, duration: 220, hand: 'rh' }, // F4
        { midi: 69, onset: 17760, duration: 220, hand: 'rh' }, // A4
        { midi: 72, onset: 17760, duration: 220, hand: 'rh' }, // C5
        { midi: 64, onset: 18000, duration: 1140, hand: 'rh' }, // E4
        { midi: 67, onset: 18000, duration: 1140, hand: 'rh' }, // G4
        { midi: 72, onset: 18000, duration: 1140, hand: 'rh' }, // C5
        { midi: 60, onset: 19200, duration: 220, hand: 'rh' }, // C4
        { midi: 64, onset: 19200, duration: 220, hand: 'rh' }, // E4
        { midi: 67, onset: 19200, duration: 220, hand: 'rh' }, // G4
        { midi: 59, onset: 19440, duration: 220, hand: 'rh' }, // B3
        { midi: 62, onset: 19440, duration: 220, hand: 'rh' }, // D4
        { midi: 67, onset: 19440, duration: 220, hand: 'rh' }, // G4
        { midi: 60, onset: 19680, duration: 220, hand: 'rh' }, // C4
        { midi: 64, onset: 19680, duration: 220, hand: 'rh' }, // E4
        { midi: 67, onset: 19680, duration: 220, hand: 'rh' }, // G4
        { midi: 59, onset: 19920, duration: 700, hand: 'rh' }, // B3
        { midi: 62, onset: 19920, duration: 700, hand: 'rh' }, // D4
        { midi: 67, onset: 19920, duration: 700, hand: 'rh' }, // G4
        { midi: 60, onset: 20640, duration: 460, hand: 'rh' }, // C4
        { midi: 64, onset: 20640, duration: 460, hand: 'rh' }, // E4
        { midi: 67, onset: 20640, duration: 460, hand: 'rh' }, // G4
        { midi: 66, onset: 21120, duration: 1860, hand: 'rh' }, // F♯4
        { midi: 69, onset: 21120, duration: 1860, hand: 'rh' }, // A4
        { midi: 74, onset: 21120, duration: 1860, hand: 'rh' }, // D5
      ],
    },
    {
      stepNumber: 39,
      module: 'blues_l2',
      section: 'D',
      subsection: 'D2: Both Hands Through the 12-Bar (Shuffle)',
      activity: 'D2.2: LH 7-3-5 and 3-7-9 + RH Phrase 5 Riff — the 12-Bar in E',
      direction:
        'Left hand one voicing a bar; right hand the Phrase 5 riff in every bar.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_perf_riff | blues',
      styleRef: 'l2a',
      successFeedback: 'Comping and a riff together.',
      key: 'E major',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_chords_rh_melody',
        lh_role: 'chords',
        rh_role: 'melody',
        style_ref: 'l2a',
      },
      chordSymbols: [
        'E7',
        'E7',
        'E7',
        'E7',
        'A9',
        'A9',
        'E7',
        'E7',
        'B9',
        'A9',
        'E7',
        'E7',
      ],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords', 'melody'],
      },
      targetNotes: [
        { midi: 50, onset: 0, duration: 1860, hand: 'lh' }, // D3
        { midi: 56, onset: 0, duration: 1860, hand: 'lh' }, // G♯3
        { midi: 59, onset: 0, duration: 1860, hand: 'lh' }, // B3
        { midi: 50, onset: 1920, duration: 1860, hand: 'lh' }, // D3
        { midi: 56, onset: 1920, duration: 1860, hand: 'lh' }, // G♯3
        { midi: 59, onset: 1920, duration: 1860, hand: 'lh' }, // B3
        { midi: 50, onset: 3840, duration: 1860, hand: 'lh' }, // D3
        { midi: 56, onset: 3840, duration: 1860, hand: 'lh' }, // G♯3
        { midi: 59, onset: 3840, duration: 1860, hand: 'lh' }, // B3
        { midi: 50, onset: 5760, duration: 1860, hand: 'lh' }, // D3
        { midi: 56, onset: 5760, duration: 1860, hand: 'lh' }, // G♯3
        { midi: 59, onset: 5760, duration: 1860, hand: 'lh' }, // B3
        { midi: 49, onset: 7680, duration: 1860, hand: 'lh' }, // C♯3
        { midi: 55, onset: 7680, duration: 1860, hand: 'lh' }, // G3
        { midi: 59, onset: 7680, duration: 1860, hand: 'lh' }, // B3
        { midi: 49, onset: 9600, duration: 1860, hand: 'lh' }, // C♯3
        { midi: 55, onset: 9600, duration: 1860, hand: 'lh' }, // G3
        { midi: 59, onset: 9600, duration: 1860, hand: 'lh' }, // B3
        { midi: 50, onset: 11520, duration: 1860, hand: 'lh' }, // D3
        { midi: 56, onset: 11520, duration: 1860, hand: 'lh' }, // G♯3
        { midi: 59, onset: 11520, duration: 1860, hand: 'lh' }, // B3
        { midi: 50, onset: 13440, duration: 1860, hand: 'lh' }, // D3
        { midi: 56, onset: 13440, duration: 1860, hand: 'lh' }, // G♯3
        { midi: 59, onset: 13440, duration: 1860, hand: 'lh' }, // B3
        { midi: 51, onset: 15360, duration: 1860, hand: 'lh' }, // D♯3
        { midi: 57, onset: 15360, duration: 1860, hand: 'lh' }, // A3
        { midi: 61, onset: 15360, duration: 1860, hand: 'lh' }, // C♯4
        { midi: 49, onset: 17280, duration: 1860, hand: 'lh' }, // C♯3
        { midi: 55, onset: 17280, duration: 1860, hand: 'lh' }, // G3
        { midi: 59, onset: 17280, duration: 1860, hand: 'lh' }, // B3
        { midi: 50, onset: 19200, duration: 1860, hand: 'lh' }, // D3
        { midi: 56, onset: 19200, duration: 1860, hand: 'lh' }, // G♯3
        { midi: 59, onset: 19200, duration: 1860, hand: 'lh' }, // B3
        { midi: 50, onset: 21120, duration: 1860, hand: 'lh' }, // D3
        { midi: 56, onset: 21120, duration: 1860, hand: 'lh' }, // G♯3
        { midi: 59, onset: 21120, duration: 1860, hand: 'lh' }, // B3
        { midi: 62, onset: 0, duration: 220, hand: 'rh' }, // D4
        { midi: 64, onset: 240, duration: 220, hand: 'rh' }, // E4
        { midi: 67, onset: 480, duration: 220, hand: 'rh' }, // G4
        { midi: 69, onset: 720, duration: 220, hand: 'rh' }, // A4
        { midi: 71, onset: 960, duration: 940, hand: 'rh' }, // B4
        { midi: 62, onset: 1920, duration: 220, hand: 'rh' }, // D4
        { midi: 64, onset: 2160, duration: 220, hand: 'rh' }, // E4
        { midi: 67, onset: 2400, duration: 220, hand: 'rh' }, // G4
        { midi: 69, onset: 2640, duration: 220, hand: 'rh' }, // A4
        { midi: 71, onset: 2880, duration: 940, hand: 'rh' }, // B4
        { midi: 62, onset: 3840, duration: 220, hand: 'rh' }, // D4
        { midi: 64, onset: 4080, duration: 220, hand: 'rh' }, // E4
        { midi: 67, onset: 4320, duration: 220, hand: 'rh' }, // G4
        { midi: 69, onset: 4560, duration: 220, hand: 'rh' }, // A4
        { midi: 71, onset: 4800, duration: 940, hand: 'rh' }, // B4
        { midi: 62, onset: 5760, duration: 220, hand: 'rh' }, // D4
        { midi: 64, onset: 6000, duration: 220, hand: 'rh' }, // E4
        { midi: 67, onset: 6240, duration: 220, hand: 'rh' }, // G4
        { midi: 69, onset: 6480, duration: 220, hand: 'rh' }, // A4
        { midi: 71, onset: 6720, duration: 940, hand: 'rh' }, // B4
        { midi: 62, onset: 7680, duration: 220, hand: 'rh' }, // D4
        { midi: 64, onset: 7920, duration: 220, hand: 'rh' }, // E4
        { midi: 67, onset: 8160, duration: 220, hand: 'rh' }, // G4
        { midi: 69, onset: 8400, duration: 220, hand: 'rh' }, // A4
        { midi: 71, onset: 8640, duration: 940, hand: 'rh' }, // B4
        { midi: 62, onset: 9600, duration: 220, hand: 'rh' }, // D4
        { midi: 64, onset: 9840, duration: 220, hand: 'rh' }, // E4
        { midi: 67, onset: 10080, duration: 220, hand: 'rh' }, // G4
        { midi: 69, onset: 10320, duration: 220, hand: 'rh' }, // A4
        { midi: 71, onset: 10560, duration: 940, hand: 'rh' }, // B4
        { midi: 62, onset: 11520, duration: 220, hand: 'rh' }, // D4
        { midi: 64, onset: 11760, duration: 220, hand: 'rh' }, // E4
        { midi: 67, onset: 12000, duration: 220, hand: 'rh' }, // G4
        { midi: 69, onset: 12240, duration: 220, hand: 'rh' }, // A4
        { midi: 71, onset: 12480, duration: 940, hand: 'rh' }, // B4
        { midi: 62, onset: 13440, duration: 220, hand: 'rh' }, // D4
        { midi: 64, onset: 13680, duration: 220, hand: 'rh' }, // E4
        { midi: 67, onset: 13920, duration: 220, hand: 'rh' }, // G4
        { midi: 69, onset: 14160, duration: 220, hand: 'rh' }, // A4
        { midi: 71, onset: 14400, duration: 940, hand: 'rh' }, // B4
        { midi: 62, onset: 15360, duration: 220, hand: 'rh' }, // D4
        { midi: 64, onset: 15600, duration: 220, hand: 'rh' }, // E4
        { midi: 67, onset: 15840, duration: 220, hand: 'rh' }, // G4
        { midi: 69, onset: 16080, duration: 220, hand: 'rh' }, // A4
        { midi: 71, onset: 16320, duration: 940, hand: 'rh' }, // B4
        { midi: 62, onset: 17280, duration: 220, hand: 'rh' }, // D4
        { midi: 64, onset: 17520, duration: 220, hand: 'rh' }, // E4
        { midi: 67, onset: 17760, duration: 220, hand: 'rh' }, // G4
        { midi: 69, onset: 18000, duration: 220, hand: 'rh' }, // A4
        { midi: 71, onset: 18240, duration: 940, hand: 'rh' }, // B4
        { midi: 62, onset: 19200, duration: 220, hand: 'rh' }, // D4
        { midi: 64, onset: 19440, duration: 220, hand: 'rh' }, // E4
        { midi: 67, onset: 19680, duration: 220, hand: 'rh' }, // G4
        { midi: 69, onset: 19920, duration: 220, hand: 'rh' }, // A4
        { midi: 71, onset: 20160, duration: 940, hand: 'rh' }, // B4
        { midi: 62, onset: 21120, duration: 220, hand: 'rh' }, // D4
        { midi: 64, onset: 21360, duration: 220, hand: 'rh' }, // E4
        { midi: 67, onset: 21600, duration: 220, hand: 'rh' }, // G4
        { midi: 69, onset: 21840, duration: 220, hand: 'rh' }, // A4
        { midi: 71, onset: 22080, duration: 940, hand: 'rh' }, // B4
      ],
    },
    {
      stepNumber: 40,
      module: 'blues_l2',
      section: 'D',
      subsection: 'D2: Both Hands Through the 12-Bar (Shuffle)',
      activity:
        'D2.3: LH 1-7 Shells + RH Phrase 3 with the Bend — the 12-Bar in G',
      direction:
        'Left hand root and ♭7; right hand Phrase 3, with B♭ over every C7.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l2_perf_bend | blues',
      styleRef: 'l2a',
      successFeedback: 'The bend, with your own chords under it.',
      key: 'G major',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_chords_rh_melody',
        lh_role: 'chords',
        rh_role: 'melody',
        style_ref: 'l2a',
      },
      chordSymbols: [
        'G7',
        'C7',
        'G7',
        'G7',
        'C7',
        'C7',
        'G7',
        'G7',
        'D7',
        'C7',
        'G7',
        'D7',
      ],
      tempo: 100,
      swing: 67,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['chords', 'melody'],
      },
      targetNotes: [
        { midi: 43, onset: 0, duration: 1860, hand: 'lh' }, // G2
        { midi: 53, onset: 0, duration: 1860, hand: 'lh' }, // F3
        { midi: 48, onset: 1920, duration: 1860, hand: 'lh' }, // C3
        { midi: 58, onset: 1920, duration: 1860, hand: 'lh' }, // B♭3
        { midi: 43, onset: 3840, duration: 1860, hand: 'lh' }, // G2
        { midi: 53, onset: 3840, duration: 1860, hand: 'lh' }, // F3
        { midi: 43, onset: 5760, duration: 1860, hand: 'lh' }, // G2
        { midi: 53, onset: 5760, duration: 1860, hand: 'lh' }, // F3
        { midi: 48, onset: 7680, duration: 1860, hand: 'lh' }, // C3
        { midi: 58, onset: 7680, duration: 1860, hand: 'lh' }, // B♭3
        { midi: 48, onset: 9600, duration: 1860, hand: 'lh' }, // C3
        { midi: 58, onset: 9600, duration: 1860, hand: 'lh' }, // B♭3
        { midi: 43, onset: 11520, duration: 1860, hand: 'lh' }, // G2
        { midi: 53, onset: 11520, duration: 1860, hand: 'lh' }, // F3
        { midi: 43, onset: 13440, duration: 1860, hand: 'lh' }, // G2
        { midi: 53, onset: 13440, duration: 1860, hand: 'lh' }, // F3
        { midi: 50, onset: 15360, duration: 1860, hand: 'lh' }, // D3
        { midi: 60, onset: 15360, duration: 1860, hand: 'lh' }, // C4
        { midi: 48, onset: 17280, duration: 1860, hand: 'lh' }, // C3
        { midi: 58, onset: 17280, duration: 1860, hand: 'lh' }, // B♭3
        { midi: 43, onset: 19200, duration: 1860, hand: 'lh' }, // G2
        { midi: 53, onset: 19200, duration: 1860, hand: 'lh' }, // F3
        { midi: 50, onset: 21120, duration: 1860, hand: 'lh' }, // D3
        { midi: 60, onset: 21120, duration: 1860, hand: 'lh' }, // C4
        { midi: 77, onset: 0, duration: 220, hand: 'rh' }, // F5
        { midi: 76, onset: 240, duration: 220, hand: 'rh' }, // E5
        { midi: 74, onset: 480, duration: 220, hand: 'rh' }, // D5
        { midi: 72, onset: 720, duration: 220, hand: 'rh' }, // C5
        { midi: 70, onset: 960, duration: 50, hand: 'rh' }, // A♯4
        { midi: 71, onset: 1020, duration: 880, hand: 'rh' }, // B4
        { midi: 77, onset: 1920, duration: 220, hand: 'rh' }, // F5
        { midi: 76, onset: 2160, duration: 220, hand: 'rh' }, // E5
        { midi: 74, onset: 2400, duration: 220, hand: 'rh' }, // D5
        { midi: 72, onset: 2640, duration: 220, hand: 'rh' }, // C5
        { midi: 69, onset: 2880, duration: 50, hand: 'rh' }, // A4
        { midi: 70, onset: 2940, duration: 880, hand: 'rh' }, // B♭4
        { midi: 77, onset: 3840, duration: 220, hand: 'rh' }, // F5
        { midi: 76, onset: 4080, duration: 220, hand: 'rh' }, // E5
        { midi: 74, onset: 4320, duration: 220, hand: 'rh' }, // D5
        { midi: 72, onset: 4560, duration: 220, hand: 'rh' }, // C5
        { midi: 70, onset: 4800, duration: 50, hand: 'rh' }, // A♯4
        { midi: 71, onset: 4860, duration: 880, hand: 'rh' }, // B4
        { midi: 77, onset: 5760, duration: 220, hand: 'rh' }, // F5
        { midi: 76, onset: 6000, duration: 220, hand: 'rh' }, // E5
        { midi: 74, onset: 6240, duration: 220, hand: 'rh' }, // D5
        { midi: 72, onset: 6480, duration: 220, hand: 'rh' }, // C5
        { midi: 70, onset: 6720, duration: 50, hand: 'rh' }, // A♯4
        { midi: 71, onset: 6780, duration: 880, hand: 'rh' }, // B4
        { midi: 77, onset: 7680, duration: 220, hand: 'rh' }, // F5
        { midi: 76, onset: 7920, duration: 220, hand: 'rh' }, // E5
        { midi: 74, onset: 8160, duration: 220, hand: 'rh' }, // D5
        { midi: 72, onset: 8400, duration: 220, hand: 'rh' }, // C5
        { midi: 69, onset: 8640, duration: 50, hand: 'rh' }, // A4
        { midi: 70, onset: 8700, duration: 880, hand: 'rh' }, // B♭4
        { midi: 77, onset: 9600, duration: 220, hand: 'rh' }, // F5
        { midi: 76, onset: 9840, duration: 220, hand: 'rh' }, // E5
        { midi: 74, onset: 10080, duration: 220, hand: 'rh' }, // D5
        { midi: 72, onset: 10320, duration: 220, hand: 'rh' }, // C5
        { midi: 69, onset: 10560, duration: 50, hand: 'rh' }, // A4
        { midi: 70, onset: 10620, duration: 880, hand: 'rh' }, // B♭4
        { midi: 77, onset: 11520, duration: 220, hand: 'rh' }, // F5
        { midi: 76, onset: 11760, duration: 220, hand: 'rh' }, // E5
        { midi: 74, onset: 12000, duration: 220, hand: 'rh' }, // D5
        { midi: 72, onset: 12240, duration: 220, hand: 'rh' }, // C5
        { midi: 70, onset: 12480, duration: 50, hand: 'rh' }, // A♯4
        { midi: 71, onset: 12540, duration: 880, hand: 'rh' }, // B4
        { midi: 77, onset: 13440, duration: 220, hand: 'rh' }, // F5
        { midi: 76, onset: 13680, duration: 220, hand: 'rh' }, // E5
        { midi: 74, onset: 13920, duration: 220, hand: 'rh' }, // D5
        { midi: 72, onset: 14160, duration: 220, hand: 'rh' }, // C5
        { midi: 70, onset: 14400, duration: 50, hand: 'rh' }, // A♯4
        { midi: 71, onset: 14460, duration: 880, hand: 'rh' }, // B4
        { midi: 77, onset: 15360, duration: 220, hand: 'rh' }, // F5
        { midi: 76, onset: 15600, duration: 220, hand: 'rh' }, // E5
        { midi: 74, onset: 15840, duration: 220, hand: 'rh' }, // D5
        { midi: 72, onset: 16080, duration: 220, hand: 'rh' }, // C5
        { midi: 70, onset: 16320, duration: 50, hand: 'rh' }, // A♯4
        { midi: 71, onset: 16380, duration: 880, hand: 'rh' }, // B4
        { midi: 77, onset: 17280, duration: 220, hand: 'rh' }, // F5
        { midi: 76, onset: 17520, duration: 220, hand: 'rh' }, // E5
        { midi: 74, onset: 17760, duration: 220, hand: 'rh' }, // D5
        { midi: 72, onset: 18000, duration: 220, hand: 'rh' }, // C5
        { midi: 69, onset: 18240, duration: 50, hand: 'rh' }, // A4
        { midi: 70, onset: 18300, duration: 880, hand: 'rh' }, // B♭4
        { midi: 77, onset: 19200, duration: 220, hand: 'rh' }, // F5
        { midi: 76, onset: 19440, duration: 220, hand: 'rh' }, // E5
        { midi: 74, onset: 19680, duration: 220, hand: 'rh' }, // D5
        { midi: 72, onset: 19920, duration: 220, hand: 'rh' }, // C5
        { midi: 70, onset: 20160, duration: 50, hand: 'rh' }, // A♯4
        { midi: 71, onset: 20220, duration: 880, hand: 'rh' }, // B4
        { midi: 77, onset: 21120, duration: 220, hand: 'rh' }, // F5
        { midi: 76, onset: 21360, duration: 220, hand: 'rh' }, // E5
        { midi: 74, onset: 21600, duration: 220, hand: 'rh' }, // D5
        { midi: 72, onset: 21840, duration: 220, hand: 'rh' }, // C5
        { midi: 70, onset: 22080, duration: 50, hand: 'rh' }, // A♯4
        { midi: 71, onset: 22140, duration: 880, hand: 'rh' }, // B4
      ],
    },
  ],
};

// ── L3: Jazz Blues ──

const bluesL3SectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    {
      stepNumber: 1,
      module: 'blues_l3',
      section: 'A',
      subsection: 'A1: Scale (F Blues)',
      activity: 'A1.1: F Blues Ascending (Out of Time)',
      direction: 'F–A♭–B♭–B–C–E♭–F: the blues scale in the jazz blues key.',
      assessment: 'pitch_order',
      tag: 'blues:l3_f_blues_asc_oot | blues',
      styleRef: 'l3a',
      successFeedback: 'B natural: the ♭5 of F.',
      key: 'F major',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      targetNotes: [
        { midi: 65, onset: 0, duration: 460 }, // F4
        { midi: 68, onset: 480, duration: 460 }, // A♭4
        { midi: 70, onset: 960, duration: 460 }, // B♭4
        { midi: 71, onset: 1440, duration: 460 }, // B4
        { midi: 72, onset: 1920, duration: 460 }, // C5
        { midi: 75, onset: 2400, duration: 460 }, // E♭5
        { midi: 77, onset: 2880, duration: 460 }, // F5
      ],
    },
    {
      stepNumber: 2,
      module: 'blues_l3',
      section: 'A',
      subsection: 'A1: Scale (F Blues)',
      activity: 'A1.2: F Blues Descending (Out of Time)',
      direction: 'Back down from the top F.',
      assessment: 'pitch_order',
      tag: 'blues:l3_f_blues_desc_oot | blues',
      styleRef: 'l3a',
      successFeedback: 'Down through the blue note.',
      key: 'F major',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      targetNotes: [
        { midi: 77, onset: 0, duration: 460 }, // F5
        { midi: 75, onset: 480, duration: 460 }, // E♭5
        { midi: 72, onset: 960, duration: 460 }, // C5
        { midi: 71, onset: 1440, duration: 460 }, // B4
        { midi: 70, onset: 1920, duration: 460 }, // B♭4
        { midi: 68, onset: 2400, duration: 460 }, // A♭4
        { midi: 65, onset: 2880, duration: 460 }, // F4
      ],
    },
    {
      stepNumber: 3,
      module: 'blues_l3',
      section: 'A',
      subsection: 'A1: Scale (F Blues)',
      activity: 'A1.3: F Blues — Up & Down in Swung Eighths (In Time)',
      direction: 'Up and down in swung eighths.',
      assessment: 'pitch_order_timing',
      tag: 'blues:l3_f_blues_updown_it | blues',
      styleRef: 'l3a',
      successFeedback: 'The blues scale, swinging.',
      key: 'F major',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      targetNotes: [
        { midi: 65, onset: 0, duration: 220 }, // F4
        { midi: 68, onset: 240, duration: 220 }, // A♭4
        { midi: 70, onset: 480, duration: 220 }, // B♭4
        { midi: 71, onset: 720, duration: 220 }, // B4
        { midi: 72, onset: 960, duration: 220 }, // C5
        { midi: 75, onset: 1200, duration: 220 }, // E♭5
        { midi: 77, onset: 1440, duration: 220 }, // F5
        { midi: 75, onset: 1680, duration: 220 }, // E♭5
        { midi: 72, onset: 1920, duration: 220 }, // C5
        { midi: 71, onset: 2160, duration: 220 }, // B4
        { midi: 70, onset: 2400, duration: 220 }, // B♭4
        { midi: 68, onset: 2640, duration: 220 }, // A♭4
        { midi: 65, onset: 2880, duration: 220 }, // F4
      ],
    },
    {
      stepNumber: 4,
      module: 'blues_l3',
      section: 'A',
      subsection: 'A2: Blues Phrases in F',
      activity: 'A2.1: Blues Phrase 2 in F',
      direction: 'B♭, C, then G♯ up to A and down to F.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_phrase_2_f | blues',
      styleRef: 'l3a',
      successFeedback: 'Phrase 2 in F, the jazz blues key.',
      key: 'F major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 10],
      scaleId: 'mixolydian',
      chordSymbols: ['F7'],
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 70, onset: 0, duration: 220 }, // B♭4
        { midi: 72, onset: 240, duration: 220 }, // C5
        { midi: 68, onset: 480, duration: 220 }, // G♯4
        { midi: 69, onset: 720, duration: 220 }, // A4
        { midi: 65, onset: 960, duration: 940 }, // F4
      ],
    },
    {
      stepNumber: 5,
      module: 'blues_l3',
      section: 'A',
      subsection: 'A2: Blues Phrases in F',
      activity: 'A2.2: Blues Phrase 4 in F',
      direction: 'A quick triplet A♭–G–F, then G, D and F.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_phrase_4_f | blues',
      styleRef: 'l3a',
      successFeedback: 'Phrase 4 in F, the jazz blues key.',
      key: 'F major',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      chordSymbols: ['F7'],
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 80, onset: 0, duration: 140 }, // A♭5
        { midi: 79, onset: 160, duration: 140 }, // G5
        { midi: 77, onset: 320, duration: 140 }, // F5
        { midi: 79, onset: 480, duration: 220 }, // G5
        { midi: 74, onset: 720, duration: 220 }, // D5
        { midi: 77, onset: 960, duration: 940 }, // F5
      ],
    },
    {
      stepNumber: 6,
      module: 'blues_l3',
      section: 'A',
      subsection: 'A2: Blues Phrases in F',
      activity: 'A2.3: Blues Phrase 5 in F',
      direction: 'E♭, F, A♭, B♭, then C, held.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_phrase_5_f | blues',
      styleRef: 'l3a',
      successFeedback: 'Phrase 5 in F, the jazz blues key.',
      key: 'F major',
      scaleIntervals: [0, 3, 5, 7, 10],
      scaleId: 'minor_pentatonic',
      chordSymbols: ['F7'],
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 63, onset: 0, duration: 220 }, // E♭4
        { midi: 65, onset: 240, duration: 220 }, // F4
        { midi: 68, onset: 480, duration: 220 }, // A♭4
        { midi: 70, onset: 720, duration: 220 }, // B♭4
        { midi: 72, onset: 960, duration: 940 }, // C5
      ],
    },
    {
      stepNumber: 7,
      module: 'blues_l3',
      section: 'A',
      subsection: 'A2: Blues Phrases in F',
      activity: 'A2.4: Blues Phrase 8 in F',
      direction: 'C and E♭ together, low F, B♭ and D, low F, then A♭ and C.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_phrase_8_f | blues',
      styleRef: 'l3a',
      successFeedback: 'Phrase 8 in F, the jazz blues key.',
      key: 'F major',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      chordSymbols: ['F7'],
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 71, onset: 0, duration: 50 }, // B4
        { midi: 75, onset: 0, duration: 220 }, // E♭5
        { midi: 72, onset: 60, duration: 160 }, // C5
        { midi: 65, onset: 240, duration: 220 }, // F4
        { midi: 70, onset: 480, duration: 220 }, // B♭4
        { midi: 74, onset: 480, duration: 220 }, // D5
        { midi: 65, onset: 720, duration: 220 }, // F4
        { midi: 68, onset: 960, duration: 940 }, // A♭4
        { midi: 72, onset: 960, duration: 940 }, // C5
      ],
    },
    {
      stepNumber: 8,
      module: 'blues_l3',
      section: 'A',
      subsection: 'A3: ii–V Lines into the IV (B♭)',
      activity: 'A3.1: ii–V Line 1 into B♭7',
      direction:
        'Up the Cm7 arpeggio C–E♭–G–B♭, then down A, G, F, E♭ to D: the 3 of B♭7.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_iiv_line_1 | blues',
      styleRef: 'l3a',
      successFeedback: 'A ii–V into the IV, landing on its 3rd.',
      key: 'Bb major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 10],
      scaleId: 'mixolydian',
      chordSymbols: ['Cm7', 'F7', 'Bb7', 'Bb7'],
      chordsPerBar: 2,
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 72, onset: 0, duration: 220 }, // C5
        { midi: 75, onset: 240, duration: 220 }, // E♭5
        { midi: 79, onset: 480, duration: 220 }, // G5
        { midi: 82, onset: 720, duration: 220 }, // B♭5
        { midi: 81, onset: 960, duration: 220 }, // A5
        { midi: 79, onset: 1200, duration: 220 }, // G5
        { midi: 77, onset: 1440, duration: 220 }, // F5
        { midi: 75, onset: 1680, duration: 220 }, // E♭5
        { midi: 74, onset: 1920, duration: 1860 }, // D5
      ],
    },
    {
      stepNumber: 9,
      module: 'blues_l3',
      section: 'A',
      subsection: 'A3: ii–V Lines into the IV (B♭)',
      activity: 'A3.2: ii–V Line 3 into B♭7',
      direction: 'Up C–E♭–G–B♭, then A, F, C♯, A — and C.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_iiv_line_3 | blues',
      styleRef: 'l3a',
      successFeedback: 'The ♯5 of F7 leading to the 9 of B♭7.',
      key: 'Bb major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 10],
      scaleId: 'mixolydian',
      chordSymbols: ['Cm7', 'F7', 'Bb7', 'Bb7'],
      chordsPerBar: 2,
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 72, onset: 0, duration: 220 }, // C5
        { midi: 75, onset: 240, duration: 220 }, // E♭5
        { midi: 79, onset: 480, duration: 220 }, // G5
        { midi: 82, onset: 720, duration: 220 }, // B♭5
        { midi: 81, onset: 960, duration: 220 }, // A5
        { midi: 77, onset: 1200, duration: 220 }, // F5
        { midi: 73, onset: 1440, duration: 220 }, // C♯5
        { midi: 69, onset: 1680, duration: 220 }, // A4
        { midi: 72, onset: 1920, duration: 1860 }, // C5
      ],
    },
    {
      stepNumber: 10,
      module: 'blues_l3',
      section: 'A',
      subsection: 'A3: ii–V Lines into the IV (B♭)',
      activity: 'A3.3: ii–V Line 5 into B♭7',
      direction: 'From E♭: E♭–G–B♭–D, then down C, B♭, A, G to F.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_iiv_line_5 | blues',
      styleRef: 'l3a',
      successFeedback: 'Down the scale into the 5 of B♭7.',
      key: 'Bb major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 10],
      scaleId: 'mixolydian',
      chordSymbols: ['Cm7', 'F7', 'Bb7', 'Bb7'],
      chordsPerBar: 2,
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 75, onset: 0, duration: 220 }, // E♭5
        { midi: 79, onset: 240, duration: 220 }, // G5
        { midi: 82, onset: 480, duration: 220 }, // B♭5
        { midi: 86, onset: 720, duration: 220 }, // D6
        { midi: 84, onset: 960, duration: 220 }, // C6
        { midi: 82, onset: 1200, duration: 220 }, // B♭5
        { midi: 81, onset: 1440, duration: 220 }, // A5
        { midi: 79, onset: 1680, duration: 220 }, // G5
        { midi: 77, onset: 1920, duration: 1860 }, // F5
      ],
    },
    {
      stepNumber: 11,
      module: 'blues_l3',
      section: 'A',
      subsection: 'A3: ii–V Lines into the IV (B♭)',
      activity: 'A3.4: ii–V Line 7 into B♭7',
      direction: 'E♭–G–B♭–D up the Cm7, then D♭, A, G♭, E over F7 — and F.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_iiv_line_7 | blues',
      styleRef: 'l3a',
      successFeedback: 'The ♭13 and ♭9 of F7 resolving into B♭7.',
      key: 'Bb major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 10],
      scaleId: 'mixolydian',
      chordSymbols: ['Cm7', 'F7', 'Bb7', 'Bb7'],
      chordsPerBar: 2,
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 75, onset: 0, duration: 220 }, // E♭5
        { midi: 79, onset: 240, duration: 220 }, // G5
        { midi: 82, onset: 480, duration: 220 }, // B♭5
        { midi: 86, onset: 720, duration: 220 }, // D6
        { midi: 85, onset: 960, duration: 220 }, // D♭6
        { midi: 81, onset: 1200, duration: 220 }, // A5
        { midi: 78, onset: 1440, duration: 220 }, // G♭5
        { midi: 76, onset: 1680, duration: 220 }, // E5
        { midi: 77, onset: 1920, duration: 1860 }, // F5
      ],
    },
    {
      stepNumber: 12,
      module: 'blues_l3',
      section: 'A',
      subsection: 'A3: ii–V Lines into the IV (B♭)',
      activity: 'A3.5: ii–V Line 8 into B♭7',
      direction: 'E♭–G–B♭–D, then C, D♭, A, G♭ — and F.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_iiv_line_8 | blues',
      styleRef: 'l3a',
      successFeedback: 'Another altered path into the IV.',
      key: 'Bb major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 10],
      scaleId: 'mixolydian',
      chordSymbols: ['Cm7', 'F7', 'Bb7', 'Bb7'],
      chordsPerBar: 2,
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 75, onset: 0, duration: 220 }, // E♭5
        { midi: 79, onset: 240, duration: 220 }, // G5
        { midi: 82, onset: 480, duration: 220 }, // B♭5
        { midi: 86, onset: 720, duration: 220 }, // D6
        { midi: 84, onset: 960, duration: 220 }, // C6
        { midi: 85, onset: 1200, duration: 220 }, // D♭6
        { midi: 81, onset: 1440, duration: 220 }, // A5
        { midi: 78, onset: 1680, duration: 220 }, // G♭5
        { midi: 77, onset: 1920, duration: 1860 }, // F5
      ],
    },
    {
      stepNumber: 13,
      module: 'blues_l3',
      section: 'A',
      subsection: 'A4: Four-Bar Lines Home (F)',
      activity: 'A4.1: Four-Bar Line 20',
      direction:
        'Down from A over Gm7; over C7, B and B♭ pass through on the way to C, the 5 of F7.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_four_bar_20 | blues',
      styleRef: 'l3a',
      successFeedback: 'Four bars: ii, V and a long I.',
      key: 'F major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 10],
      scaleId: 'mixolydian',
      chordSymbols: ['Gm7', 'C7', 'F7', 'F7'],
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 81, onset: 0, duration: 220 }, // A5
        { midi: 84, onset: 240, duration: 220 }, // C6
        { midi: 82, onset: 480, duration: 220 }, // B♭5
        { midi: 81, onset: 720, duration: 220 }, // A5
        { midi: 79, onset: 960, duration: 220 }, // G5
        { midi: 77, onset: 1200, duration: 220 }, // F5
        { midi: 76, onset: 1440, duration: 220 }, // E5
        { midi: 74, onset: 1680, duration: 220 }, // D5
        { midi: 72, onset: 1920, duration: 220 }, // C5
        { midi: 71, onset: 2160, duration: 220 }, // B4
        { midi: 70, onset: 2400, duration: 220 }, // B♭4
        { midi: 74, onset: 2640, duration: 220 }, // D5
        { midi: 77, onset: 2880, duration: 220 }, // F5
        { midi: 81, onset: 3120, duration: 220 }, // A5
        { midi: 79, onset: 3360, duration: 220 }, // G5
        { midi: 76, onset: 3600, duration: 220 }, // E5
        { midi: 72, onset: 3840, duration: 1860 }, // C5
      ],
    },
    {
      stepNumber: 14,
      module: 'blues_l3',
      section: 'A',
      subsection: 'A4: Four-Bar Lines Home (F)',
      activity: 'A4.2: Four-Bar Line 23',
      direction:
        'Down the Gm7 to F♯, then up and down the C7 through A♭ — landing on G, the 9 of F7.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_four_bar_23 | blues',
      styleRef: 'l3a',
      successFeedback: 'The ♭13 of C7 leading to the 9.',
      key: 'F major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 10],
      scaleId: 'mixolydian',
      chordSymbols: ['Gm7', 'C7', 'F7', 'F7'],
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
        { midi: 69, onset: 960, duration: 220 }, // A4
        { midi: 67, onset: 1200, duration: 220 }, // G4
        { midi: 66, onset: 1440, duration: 220 }, // F♯4
        { midi: 69, onset: 1680, duration: 220 }, // A4
        { midi: 67, onset: 1920, duration: 220 }, // G4
        { midi: 70, onset: 2160, duration: 220 }, // B♭4
        { midi: 69, onset: 2400, duration: 220 }, // A4
        { midi: 67, onset: 2640, duration: 220 }, // G4
        { midi: 72, onset: 2880, duration: 220 }, // C5
        { midi: 68, onset: 3120, duration: 220 }, // A♭4
        { midi: 64, onset: 3360, duration: 220 }, // E4
        { midi: 60, onset: 3600, duration: 220 }, // C4
        { midi: 67, onset: 3840, duration: 1860 }, // G4
      ],
    },
    {
      stepNumber: 15,
      module: 'blues_l3',
      section: 'A',
      subsection: 'A4: Four-Bar Lines Home (F)',
      activity: 'A4.3: Four-Bar Line 24',
      direction:
        'Down to F♯ and D, then up the C7 from F to D — and down to A, the 3 of F7.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_four_bar_24 | blues',
      styleRef: 'l3a',
      successFeedback: 'A line that lands on the 3rd.',
      key: 'F major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 10],
      scaleId: 'mixolydian',
      chordSymbols: ['Gm7', 'C7', 'F7', 'F7'],
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
        { midi: 69, onset: 960, duration: 220 }, // A4
        { midi: 67, onset: 1200, duration: 220 }, // G4
        { midi: 66, onset: 1440, duration: 220 }, // F♯4
        { midi: 62, onset: 1680, duration: 220 }, // D4
        { midi: 65, onset: 1920, duration: 220 }, // F4
        { midi: 62, onset: 2160, duration: 220 }, // D4
        { midi: 64, onset: 2400, duration: 220 }, // E4
        { midi: 67, onset: 2640, duration: 220 }, // G4
        { midi: 70, onset: 2880, duration: 220 }, // B♭4
        { midi: 74, onset: 3120, duration: 220 }, // D5
        { midi: 72, onset: 3360, duration: 220 }, // C5
        { midi: 70, onset: 3600, duration: 220 }, // B♭4
        { midi: 69, onset: 3840, duration: 1860 }, // A4
      ],
    },
    {
      stepNumber: 16,
      module: 'blues_l3',
      section: 'A',
      subsection: 'A4: Four-Bar Lines Home (F)',
      activity: 'A4.4: Four-Bar Line 26',
      direction:
        'F, F♯, A, A♭ — chromatic over Gm7 — then down the C7 through D♭ and E♭ to A.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_four_bar_26 | blues',
      styleRef: 'l3a',
      successFeedback: 'Chromatic color, a clean landing.',
      key: 'F major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 10],
      scaleId: 'mixolydian',
      chordSymbols: ['Gm7', 'C7', 'F7', 'F7'],
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 77, onset: 0, duration: 220 }, // F5
        { midi: 78, onset: 240, duration: 220 }, // F♯5
        { midi: 81, onset: 480, duration: 220 }, // A5
        { midi: 80, onset: 720, duration: 220 }, // A♭5
        { midi: 79, onset: 960, duration: 220 }, // G5
        { midi: 77, onset: 1200, duration: 220 }, // F5
        { midi: 76, onset: 1440, duration: 220 }, // E5
        { midi: 74, onset: 1680, duration: 220 }, // D5
        { midi: 72, onset: 1920, duration: 220 }, // C5
        { midi: 71, onset: 2160, duration: 220 }, // B4
        { midi: 70, onset: 2400, duration: 220 }, // B♭4
        { midi: 72, onset: 2640, duration: 220 }, // C5
        { midi: 73, onset: 2880, duration: 220 }, // D♭5
        { midi: 75, onset: 3120, duration: 220 }, // E♭5
        { midi: 72, onset: 3360, duration: 220 }, // C5
        { midi: 70, onset: 3600, duration: 220 }, // B♭4
        { midi: 69, onset: 3840, duration: 1860 }, // A4
      ],
    },
    {
      stepNumber: 17,
      module: 'blues_l3',
      section: 'A',
      subsection: 'A5: A Jazz Blues Chorus',
      activity: 'A5.1: A Jazz Blues Chorus in F',
      direction:
        'A whole chorus from Peter’s material: blues phrases on the F7, a ii–V line into the B♭7, a phrase over the IV, then a four-bar line home.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_chorus_f | blues',
      styleRef: 'l3a',
      successFeedback:
        'Blues phrases and ii–V lines together: how a jazz blues solo is built.',
      key: 'F major',
      scaleIntervals: [0, 2, 4, 5, 7, 9, 10],
      scaleId: 'mixolydian',
      chordSymbols: [
        'F7',
        'F7',
        'F7',
        'F7',
        'F7',
        'F7',
        'Cm7',
        'F7',
        'Bb7',
        'Bb7',
        'Bb7',
        'Bb7',
        'F7',
        'F7',
        'F7',
        'D7b9',
        'Gm7',
        'Gm7',
        'C7',
        'C7',
        'F7',
        'D7b9',
        'Gm7',
        'C7',
      ],
      chordsPerBar: 2,
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 63, onset: 0, duration: 220 }, // E♭4
        { midi: 65, onset: 240, duration: 220 }, // F4
        { midi: 68, onset: 480, duration: 220 }, // A♭4
        { midi: 70, onset: 720, duration: 220 }, // B♭4
        { midi: 72, onset: 960, duration: 940 }, // C5
        { midi: 70, onset: 1920, duration: 220 }, // B♭4
        { midi: 72, onset: 2160, duration: 220 }, // C5
        { midi: 68, onset: 2400, duration: 220 }, // G♯4
        { midi: 69, onset: 2640, duration: 220 }, // A4
        { midi: 65, onset: 2880, duration: 940 }, // F4
        { midi: 72, onset: 3840, duration: 110 }, // C5
        { midi: 70, onset: 3960, duration: 110 }, // B♭4
        { midi: 68, onset: 4080, duration: 110 }, // A♭4
        { midi: 65, onset: 4200, duration: 110 }, // F4
        { midi: 63, onset: 4320, duration: 220 }, // E♭4
        { midi: 65, onset: 4560, duration: 1140 }, // F4
        { midi: 72, onset: 5760, duration: 220 }, // C5
        { midi: 75, onset: 6000, duration: 220 }, // E♭5
        { midi: 79, onset: 6240, duration: 220 }, // G5
        { midi: 82, onset: 6480, duration: 220 }, // B♭5
        { midi: 81, onset: 6720, duration: 220 }, // A5
        { midi: 79, onset: 6960, duration: 220 }, // G5
        { midi: 77, onset: 7200, duration: 220 }, // F5
        { midi: 75, onset: 7440, duration: 220 }, // E♭5
        { midi: 74, onset: 7680, duration: 1860 }, // D5
        { midi: 73, onset: 9600, duration: 140 }, // D♭5
        { midi: 72, onset: 9760, duration: 140 }, // C5
        { midi: 70, onset: 9920, duration: 140 }, // B♭4
        { midi: 72, onset: 10080, duration: 220 }, // C5
        { midi: 67, onset: 10320, duration: 220 }, // G4
        { midi: 70, onset: 10560, duration: 940 }, // B♭4
        { midi: 75, onset: 11520, duration: 220 }, // E♭5
        { midi: 74, onset: 11760, duration: 220 }, // D5
        { midi: 72, onset: 12000, duration: 220 }, // C5
        { midi: 70, onset: 12240, duration: 220 }, // B♭4
        { midi: 68, onset: 12480, duration: 50 }, // G♯4
        { midi: 69, onset: 12540, duration: 880 }, // A4
        { midi: 66, onset: 14400, duration: 220 }, // F♯4
        { midi: 69, onset: 14640, duration: 220 }, // A4
        { midi: 72, onset: 14880, duration: 220 }, // C5
        { midi: 75, onset: 15120, duration: 220 }, // E♭5
        { midi: 76, onset: 15360, duration: 220 }, // E5
        { midi: 77, onset: 15600, duration: 220 }, // F5
        { midi: 74, onset: 15840, duration: 220 }, // D5
        { midi: 70, onset: 16080, duration: 220 }, // B♭4
        { midi: 69, onset: 16320, duration: 220 }, // A4
        { midi: 67, onset: 16560, duration: 220 }, // G4
        { midi: 66, onset: 16800, duration: 220 }, // F♯4
        { midi: 62, onset: 17040, duration: 220 }, // D4
        { midi: 65, onset: 17280, duration: 220 }, // F4
        { midi: 63, onset: 17520, duration: 220 }, // D♯4
        { midi: 64, onset: 17760, duration: 220 }, // E4
        { midi: 67, onset: 18000, duration: 220 }, // G4
        { midi: 70, onset: 18240, duration: 220 }, // B♭4
        { midi: 73, onset: 18480, duration: 220 }, // D♭5
        { midi: 72, onset: 18720, duration: 220 }, // C5
        { midi: 70, onset: 18960, duration: 220 }, // B♭4
        { midi: 69, onset: 19200, duration: 1860 }, // A4
      ],
    },
  ],
};

const bluesL3SectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    {
      stepNumber: 18,
      module: 'blues_l3',
      section: 'B',
      subsection: 'B1: Shells',
      activity: 'B1.1: Shells 1-7 and 1-3 — the Jazz Blues in F (Out of Time)',
      direction:
        'Root and 7th, or root and 3rd: whichever is closer to the chord before. Two chords in bars 4, 8, 11 and 12.',
      assessment: 'pitch_order',
      tag: 'blues:l3_shells_oot | blues',
      styleRef: 'l3a',
      successFeedback: 'The left hand under a head or a solo.',
      key: 'F major',
      chordSymbols: [
        'F7',
        'F7',
        'F7',
        'Cm7',
        'F7',
        'Bb7',
        'Bb7',
        'F7',
        'F7',
        'D7',
        'Gm7',
        'C7',
        'F7',
        'D7',
        'Gm7',
        'C7',
      ],
      targetNotes: [
        { midi: 53, onset: 0, duration: 900 }, // F3
        { midi: 63, onset: 0, duration: 900 }, // E♭4
        { midi: 53, onset: 960, duration: 900 }, // F3
        { midi: 63, onset: 960, duration: 900 }, // E♭4
        { midi: 53, onset: 1920, duration: 900 }, // F3
        { midi: 63, onset: 1920, duration: 900 }, // E♭4
        { midi: 48, onset: 2880, duration: 900 }, // C3
        { midi: 58, onset: 2880, duration: 900 }, // B♭3
        { midi: 53, onset: 3840, duration: 900 }, // F3
        { midi: 57, onset: 3840, duration: 900 }, // A3
        { midi: 46, onset: 4800, duration: 900 }, // B♭2
        { midi: 56, onset: 4800, duration: 900 }, // A♭3
        { midi: 46, onset: 5760, duration: 900 }, // B♭2
        { midi: 56, onset: 5760, duration: 900 }, // A♭3
        { midi: 53, onset: 6720, duration: 900 }, // F3
        { midi: 57, onset: 6720, duration: 900 }, // A3
        { midi: 53, onset: 7680, duration: 900 }, // F3
        { midi: 57, onset: 7680, duration: 900 }, // A3
        { midi: 50, onset: 8640, duration: 900 }, // D3
        { midi: 60, onset: 8640, duration: 900 }, // C4
        { midi: 55, onset: 9600, duration: 900 }, // G3
        { midi: 65, onset: 9600, duration: 900 }, // F4
        { midi: 48, onset: 10560, duration: 900 }, // C3
        { midi: 58, onset: 10560, duration: 900 }, // B♭3
        { midi: 53, onset: 11520, duration: 900 }, // F3
        { midi: 57, onset: 11520, duration: 900 }, // A3
        { midi: 50, onset: 12480, duration: 900 }, // D3
        { midi: 60, onset: 12480, duration: 900 }, // C4
        { midi: 55, onset: 13440, duration: 900 }, // G3
        { midi: 65, onset: 13440, duration: 900 }, // F4
        { midi: 48, onset: 14400, duration: 900 }, // C3
        { midi: 58, onset: 14400, duration: 900 }, // B♭3
      ],
    },
    {
      stepNumber: 19,
      module: 'blues_l3',
      section: 'B',
      subsection: 'B1: Shells',
      activity: 'B1.2: Play-Along — Shells, the Jazz Blues in F',
      direction:
        'The shells in time. Your left hand has the roots, so the bass lays out.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_shells_play | blues',
      styleRef: 'l3a',
      successFeedback: 'A whole jazz blues in two-note shells.',
      key: 'F major',
      chordSymbols: [
        'F7',
        'F7',
        'F7',
        'F7',
        'F7',
        'F7',
        'Cm7',
        'F7',
        'Bb7',
        'Bb7',
        'Bb7',
        'Bb7',
        'F7',
        'F7',
        'F7',
        'D7',
        'Gm7',
        'Gm7',
        'C7',
        'C7',
        'F7',
        'D7',
        'Gm7',
        'C7',
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
        { midi: 53, onset: 0, duration: 1860 }, // F3
        { midi: 63, onset: 0, duration: 1860 }, // E♭4
        { midi: 53, onset: 1920, duration: 1860 }, // F3
        { midi: 63, onset: 1920, duration: 1860 }, // E♭4
        { midi: 53, onset: 3840, duration: 1860 }, // F3
        { midi: 63, onset: 3840, duration: 1860 }, // E♭4
        { midi: 48, onset: 5760, duration: 940 }, // C3
        { midi: 58, onset: 5760, duration: 940 }, // B♭3
        { midi: 53, onset: 6720, duration: 940 }, // F3
        { midi: 57, onset: 6720, duration: 940 }, // A3
        { midi: 46, onset: 7680, duration: 1860 }, // B♭2
        { midi: 56, onset: 7680, duration: 1860 }, // A♭3
        { midi: 46, onset: 9600, duration: 1860 }, // B♭2
        { midi: 56, onset: 9600, duration: 1860 }, // A♭3
        { midi: 53, onset: 11520, duration: 1860 }, // F3
        { midi: 57, onset: 11520, duration: 1860 }, // A3
        { midi: 53, onset: 13440, duration: 940 }, // F3
        { midi: 57, onset: 13440, duration: 940 }, // A3
        { midi: 50, onset: 14400, duration: 940 }, // D3
        { midi: 60, onset: 14400, duration: 940 }, // C4
        { midi: 55, onset: 15360, duration: 1860 }, // G3
        { midi: 65, onset: 15360, duration: 1860 }, // F4
        { midi: 48, onset: 17280, duration: 1860 }, // C3
        { midi: 58, onset: 17280, duration: 1860 }, // B♭3
        { midi: 53, onset: 19200, duration: 940 }, // F3
        { midi: 57, onset: 19200, duration: 940 }, // A3
        { midi: 50, onset: 20160, duration: 940 }, // D3
        { midi: 60, onset: 20160, duration: 940 }, // C4
        { midi: 55, onset: 21120, duration: 940 }, // G3
        { midi: 65, onset: 21120, duration: 940 }, // F4
        { midi: 48, onset: 22080, duration: 940 }, // C3
        { midi: 58, onset: 22080, duration: 940 }, // B♭3
      ],
    },
    {
      stepNumber: 20,
      module: 'blues_l3',
      section: 'B',
      subsection: 'B2: Rootless A and B',
      activity: 'B2.1: Rootless A — the Jazz Blues in F (Out of Time)',
      direction:
        '3-5-7-9 or 7-9-3-13 on every chord, each close to the one before.',
      assessment: 'pitch_order',
      tag: 'blues:l3_rootless_a_oot | blues',
      styleRef: 'l3a',
      successFeedback: 'Rootless through the jazz blues.',
      key: 'F major',
      chordSymbols: [
        'F9',
        'F9',
        'F9',
        'Cm9',
        'F13',
        'Bb9',
        'Bb9',
        'F13',
        'F13',
        'D7b9',
        'Gm9',
        'C13',
        'F9',
        'D7b9',
        'Gm9',
        'C13',
      ],
      targetNotes: [
        { midi: 57, onset: 0, duration: 900 }, // A3
        { midi: 60, onset: 0, duration: 900 }, // C4
        { midi: 63, onset: 0, duration: 900 }, // E♭4
        { midi: 67, onset: 0, duration: 900 }, // G4
        { midi: 57, onset: 960, duration: 900 }, // A3
        { midi: 60, onset: 960, duration: 900 }, // C4
        { midi: 63, onset: 960, duration: 900 }, // E♭4
        { midi: 67, onset: 960, duration: 900 }, // G4
        { midi: 57, onset: 1920, duration: 900 }, // A3
        { midi: 60, onset: 1920, duration: 900 }, // C4
        { midi: 63, onset: 1920, duration: 900 }, // E♭4
        { midi: 67, onset: 1920, duration: 900 }, // G4
        { midi: 51, onset: 2880, duration: 900 }, // E♭3
        { midi: 55, onset: 2880, duration: 900 }, // G3
        { midi: 58, onset: 2880, duration: 900 }, // B♭3
        { midi: 62, onset: 2880, duration: 900 }, // D4
        { midi: 51, onset: 3840, duration: 900 }, // E♭3
        { midi: 55, onset: 3840, duration: 900 }, // G3
        { midi: 57, onset: 3840, duration: 900 }, // A3
        { midi: 62, onset: 3840, duration: 900 }, // D4
        { midi: 50, onset: 4800, duration: 900 }, // D3
        { midi: 53, onset: 4800, duration: 900 }, // F3
        { midi: 56, onset: 4800, duration: 900 }, // A♭3
        { midi: 60, onset: 4800, duration: 900 }, // C4
        { midi: 50, onset: 5760, duration: 900 }, // D3
        { midi: 53, onset: 5760, duration: 900 }, // F3
        { midi: 56, onset: 5760, duration: 900 }, // A♭3
        { midi: 60, onset: 5760, duration: 900 }, // C4
        { midi: 51, onset: 6720, duration: 900 }, // E♭3
        { midi: 55, onset: 6720, duration: 900 }, // G3
        { midi: 57, onset: 6720, duration: 900 }, // A3
        { midi: 62, onset: 6720, duration: 900 }, // D4
        { midi: 51, onset: 7680, duration: 900 }, // E♭3
        { midi: 55, onset: 7680, duration: 900 }, // G3
        { midi: 57, onset: 7680, duration: 900 }, // A3
        { midi: 62, onset: 7680, duration: 900 }, // D4
        { midi: 60, onset: 8640, duration: 900 }, // C4
        { midi: 63, onset: 8640, duration: 900 }, // E♭4
        { midi: 66, onset: 8640, duration: 900 }, // F♯4
        { midi: 69, onset: 8640, duration: 900 }, // A4
        { midi: 58, onset: 9600, duration: 900 }, // B♭3
        { midi: 62, onset: 9600, duration: 900 }, // D4
        { midi: 65, onset: 9600, duration: 900 }, // F4
        { midi: 69, onset: 9600, duration: 900 }, // A4
        { midi: 58, onset: 10560, duration: 900 }, // B♭3
        { midi: 62, onset: 10560, duration: 900 }, // D4
        { midi: 64, onset: 10560, duration: 900 }, // E4
        { midi: 69, onset: 10560, duration: 900 }, // A4
        { midi: 57, onset: 11520, duration: 900 }, // A3
        { midi: 60, onset: 11520, duration: 900 }, // C4
        { midi: 63, onset: 11520, duration: 900 }, // E♭4
        { midi: 67, onset: 11520, duration: 900 }, // G4
        { midi: 60, onset: 12480, duration: 900 }, // C4
        { midi: 63, onset: 12480, duration: 900 }, // E♭4
        { midi: 66, onset: 12480, duration: 900 }, // F♯4
        { midi: 69, onset: 12480, duration: 900 }, // A4
        { midi: 58, onset: 13440, duration: 900 }, // B♭3
        { midi: 62, onset: 13440, duration: 900 }, // D4
        { midi: 65, onset: 13440, duration: 900 }, // F4
        { midi: 69, onset: 13440, duration: 900 }, // A4
        { midi: 58, onset: 14400, duration: 900 }, // B♭3
        { midi: 62, onset: 14400, duration: 900 }, // D4
        { midi: 64, onset: 14400, duration: 900 }, // E4
        { midi: 69, onset: 14400, duration: 900 }, // A4
      ],
    },
    {
      stepNumber: 21,
      module: 'blues_l3',
      section: 'B',
      subsection: 'B2: Rootless A and B',
      activity: 'B2.2: Play-Along — Rootless A, the Jazz Blues in F',
      direction: 'Rootless A in time, with the bass on the roots.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_rootless_a_play | blues',
      styleRef: 'l3a',
      successFeedback: 'The sound of a jazz pianist in a band.',
      key: 'F major',
      chordSymbols: [
        'F9',
        'F9',
        'F9',
        'F9',
        'F9',
        'F9',
        'Cm9',
        'F13',
        'Bb9',
        'Bb9',
        'Bb9',
        'Bb9',
        'F13',
        'F13',
        'F13',
        'D7b9',
        'Gm9',
        'Gm9',
        'C13',
        'C13',
        'F9',
        'D7b9',
        'Gm9',
        'C13',
      ],
      chordsPerBar: 2,
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 57, onset: 0, duration: 1860 }, // A3
        { midi: 60, onset: 0, duration: 1860 }, // C4
        { midi: 63, onset: 0, duration: 1860 }, // E♭4
        { midi: 67, onset: 0, duration: 1860 }, // G4
        { midi: 57, onset: 1920, duration: 1860 }, // A3
        { midi: 60, onset: 1920, duration: 1860 }, // C4
        { midi: 63, onset: 1920, duration: 1860 }, // E♭4
        { midi: 67, onset: 1920, duration: 1860 }, // G4
        { midi: 57, onset: 3840, duration: 1860 }, // A3
        { midi: 60, onset: 3840, duration: 1860 }, // C4
        { midi: 63, onset: 3840, duration: 1860 }, // E♭4
        { midi: 67, onset: 3840, duration: 1860 }, // G4
        { midi: 51, onset: 5760, duration: 940 }, // E♭3
        { midi: 55, onset: 5760, duration: 940 }, // G3
        { midi: 58, onset: 5760, duration: 940 }, // B♭3
        { midi: 62, onset: 5760, duration: 940 }, // D4
        { midi: 51, onset: 6720, duration: 940 }, // E♭3
        { midi: 55, onset: 6720, duration: 940 }, // G3
        { midi: 57, onset: 6720, duration: 940 }, // A3
        { midi: 62, onset: 6720, duration: 940 }, // D4
        { midi: 50, onset: 7680, duration: 1860 }, // D3
        { midi: 53, onset: 7680, duration: 1860 }, // F3
        { midi: 56, onset: 7680, duration: 1860 }, // A♭3
        { midi: 60, onset: 7680, duration: 1860 }, // C4
        { midi: 50, onset: 9600, duration: 1860 }, // D3
        { midi: 53, onset: 9600, duration: 1860 }, // F3
        { midi: 56, onset: 9600, duration: 1860 }, // A♭3
        { midi: 60, onset: 9600, duration: 1860 }, // C4
        { midi: 51, onset: 11520, duration: 1860 }, // E♭3
        { midi: 55, onset: 11520, duration: 1860 }, // G3
        { midi: 57, onset: 11520, duration: 1860 }, // A3
        { midi: 62, onset: 11520, duration: 1860 }, // D4
        { midi: 51, onset: 13440, duration: 940 }, // E♭3
        { midi: 55, onset: 13440, duration: 940 }, // G3
        { midi: 57, onset: 13440, duration: 940 }, // A3
        { midi: 62, onset: 13440, duration: 940 }, // D4
        { midi: 60, onset: 14400, duration: 940 }, // C4
        { midi: 63, onset: 14400, duration: 940 }, // E♭4
        { midi: 66, onset: 14400, duration: 940 }, // F♯4
        { midi: 69, onset: 14400, duration: 940 }, // A4
        { midi: 58, onset: 15360, duration: 1860 }, // B♭3
        { midi: 62, onset: 15360, duration: 1860 }, // D4
        { midi: 65, onset: 15360, duration: 1860 }, // F4
        { midi: 69, onset: 15360, duration: 1860 }, // A4
        { midi: 58, onset: 17280, duration: 1860 }, // B♭3
        { midi: 62, onset: 17280, duration: 1860 }, // D4
        { midi: 64, onset: 17280, duration: 1860 }, // E4
        { midi: 69, onset: 17280, duration: 1860 }, // A4
        { midi: 57, onset: 19200, duration: 940 }, // A3
        { midi: 60, onset: 19200, duration: 940 }, // C4
        { midi: 63, onset: 19200, duration: 940 }, // E♭4
        { midi: 67, onset: 19200, duration: 940 }, // G4
        { midi: 60, onset: 20160, duration: 940 }, // C4
        { midi: 63, onset: 20160, duration: 940 }, // E♭4
        { midi: 66, onset: 20160, duration: 940 }, // F♯4
        { midi: 69, onset: 20160, duration: 940 }, // A4
        { midi: 58, onset: 21120, duration: 940 }, // B♭3
        { midi: 62, onset: 21120, duration: 940 }, // D4
        { midi: 65, onset: 21120, duration: 940 }, // F4
        { midi: 69, onset: 21120, duration: 940 }, // A4
        { midi: 58, onset: 22080, duration: 940 }, // B♭3
        { midi: 62, onset: 22080, duration: 940 }, // D4
        { midi: 64, onset: 22080, duration: 940 }, // E4
        { midi: 69, onset: 22080, duration: 940 }, // A4
      ],
    },
    {
      stepNumber: 22,
      module: 'blues_l3',
      section: 'B',
      subsection: 'B2: Rootless A and B',
      activity: 'B2.3: Play-Along — Rootless B, the Jazz Blues in F',
      direction:
        'The other shape: 7-9-3-5 or 3-13-7-9. Same chords, the notes in a new order.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_rootless_b_play | blues',
      styleRef: 'l3a',
      successFeedback: 'Rootless B: the same colors, inverted.',
      key: 'F major',
      chordSymbols: [
        'F9',
        'F9',
        'F9',
        'F9',
        'F9',
        'F9',
        'Cm9',
        'F13',
        'Bb9',
        'Bb9',
        'Bb9',
        'Bb9',
        'F13',
        'F13',
        'F13',
        'D7b9',
        'Gm9',
        'Gm9',
        'C13',
        'C13',
        'F9',
        'D7b9',
        'Gm9',
        'C13',
      ],
      chordsPerBar: 2,
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 51, onset: 0, duration: 1860 }, // E♭3
        { midi: 55, onset: 0, duration: 1860 }, // G3
        { midi: 57, onset: 0, duration: 1860 }, // A3
        { midi: 60, onset: 0, duration: 1860 }, // C4
        { midi: 51, onset: 1920, duration: 1860 }, // E♭3
        { midi: 55, onset: 1920, duration: 1860 }, // G3
        { midi: 57, onset: 1920, duration: 1860 }, // A3
        { midi: 60, onset: 1920, duration: 1860 }, // C4
        { midi: 51, onset: 3840, duration: 1860 }, // E♭3
        { midi: 55, onset: 3840, duration: 1860 }, // G3
        { midi: 57, onset: 3840, duration: 1860 }, // A3
        { midi: 60, onset: 3840, duration: 1860 }, // C4
        { midi: 58, onset: 5760, duration: 940 }, // B♭3
        { midi: 62, onset: 5760, duration: 940 }, // D4
        { midi: 63, onset: 5760, duration: 940 }, // E♭4
        { midi: 67, onset: 5760, duration: 940 }, // G4
        { midi: 57, onset: 6720, duration: 940 }, // A3
        { midi: 62, onset: 6720, duration: 940 }, // D4
        { midi: 63, onset: 6720, duration: 940 }, // E♭4
        { midi: 67, onset: 6720, duration: 940 }, // G4
        { midi: 56, onset: 7680, duration: 1860 }, // A♭3
        { midi: 60, onset: 7680, duration: 1860 }, // C4
        { midi: 62, onset: 7680, duration: 1860 }, // D4
        { midi: 65, onset: 7680, duration: 1860 }, // F4
        { midi: 56, onset: 9600, duration: 1860 }, // A♭3
        { midi: 60, onset: 9600, duration: 1860 }, // C4
        { midi: 62, onset: 9600, duration: 1860 }, // D4
        { midi: 65, onset: 9600, duration: 1860 }, // F4
        { midi: 57, onset: 11520, duration: 1860 }, // A3
        { midi: 62, onset: 11520, duration: 1860 }, // D4
        { midi: 63, onset: 11520, duration: 1860 }, // E♭4
        { midi: 67, onset: 11520, duration: 1860 }, // G4
        { midi: 57, onset: 13440, duration: 940 }, // A3
        { midi: 62, onset: 13440, duration: 940 }, // D4
        { midi: 63, onset: 13440, duration: 940 }, // E♭4
        { midi: 67, onset: 13440, duration: 940 }, // G4
        { midi: 54, onset: 14400, duration: 940 }, // F♯3
        { midi: 57, onset: 14400, duration: 940 }, // A3
        { midi: 60, onset: 14400, duration: 940 }, // C4
        { midi: 63, onset: 14400, duration: 940 }, // E♭4
        { midi: 53, onset: 15360, duration: 1860 }, // F3
        { midi: 57, onset: 15360, duration: 1860 }, // A3
        { midi: 58, onset: 15360, duration: 1860 }, // B♭3
        { midi: 62, onset: 15360, duration: 1860 }, // D4
        { midi: 52, onset: 17280, duration: 1860 }, // E3
        { midi: 57, onset: 17280, duration: 1860 }, // A3
        { midi: 58, onset: 17280, duration: 1860 }, // B♭3
        { midi: 62, onset: 17280, duration: 1860 }, // D4
        { midi: 51, onset: 19200, duration: 940 }, // E♭3
        { midi: 55, onset: 19200, duration: 940 }, // G3
        { midi: 57, onset: 19200, duration: 940 }, // A3
        { midi: 60, onset: 19200, duration: 940 }, // C4
        { midi: 54, onset: 20160, duration: 940 }, // F♯3
        { midi: 57, onset: 20160, duration: 940 }, // A3
        { midi: 60, onset: 20160, duration: 940 }, // C4
        { midi: 63, onset: 20160, duration: 940 }, // E♭4
        { midi: 53, onset: 21120, duration: 940 }, // F3
        { midi: 57, onset: 21120, duration: 940 }, // A3
        { midi: 58, onset: 21120, duration: 940 }, // B♭3
        { midi: 62, onset: 21120, duration: 940 }, // D4
        { midi: 52, onset: 22080, duration: 940 }, // E3
        { midi: 57, onset: 22080, duration: 940 }, // A3
        { midi: 58, onset: 22080, duration: 940 }, // B♭3
        { midi: 62, onset: 22080, duration: 940 }, // D4
      ],
    },
    {
      stepNumber: 23,
      module: 'blues_l3',
      section: 'B',
      subsection: 'B2: Rootless A and B',
      activity: 'B2.4: Play-Along — Rootless A, the Jazz Blues in B♭',
      direction:
        'Rootless A moved up a 4th: the jazz blues in B♭, the key of most blues heads.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_rootless_a_bb | blues',
      styleRef: 'l3a',
      successFeedback: 'The same voicings in B♭.',
      key: 'Bb major',
      chordSymbols: [
        'Bb9',
        'Bb9',
        'Bb9',
        'Bb9',
        'Bb9',
        'Bb9',
        'Fm9',
        'Bb13',
        'Eb9',
        'Eb9',
        'Eb9',
        'Eb9',
        'Bb13',
        'Bb13',
        'Bb13',
        'G7b9',
        'Cm9',
        'Cm9',
        'F13',
        'F13',
        'Bb9',
        'G7b9',
        'Cm9',
        'F13',
      ],
      chordsPerBar: 2,
      tempo: 120,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 62, onset: 0, duration: 1860 }, // D4
        { midi: 65, onset: 0, duration: 1860 }, // F4
        { midi: 68, onset: 0, duration: 1860 }, // A♭4
        { midi: 72, onset: 0, duration: 1860 }, // C5
        { midi: 62, onset: 1920, duration: 1860 }, // D4
        { midi: 65, onset: 1920, duration: 1860 }, // F4
        { midi: 68, onset: 1920, duration: 1860 }, // A♭4
        { midi: 72, onset: 1920, duration: 1860 }, // C5
        { midi: 62, onset: 3840, duration: 1860 }, // D4
        { midi: 65, onset: 3840, duration: 1860 }, // F4
        { midi: 68, onset: 3840, duration: 1860 }, // A♭4
        { midi: 72, onset: 3840, duration: 1860 }, // C5
        { midi: 56, onset: 5760, duration: 940 }, // A♭3
        { midi: 60, onset: 5760, duration: 940 }, // C4
        { midi: 63, onset: 5760, duration: 940 }, // E♭4
        { midi: 67, onset: 5760, duration: 940 }, // G4
        { midi: 56, onset: 6720, duration: 940 }, // A♭3
        { midi: 60, onset: 6720, duration: 940 }, // C4
        { midi: 62, onset: 6720, duration: 940 }, // D4
        { midi: 67, onset: 6720, duration: 940 }, // G4
        { midi: 55, onset: 7680, duration: 1860 }, // G3
        { midi: 58, onset: 7680, duration: 1860 }, // B♭3
        { midi: 61, onset: 7680, duration: 1860 }, // D♭4
        { midi: 65, onset: 7680, duration: 1860 }, // F4
        { midi: 55, onset: 9600, duration: 1860 }, // G3
        { midi: 58, onset: 9600, duration: 1860 }, // B♭3
        { midi: 61, onset: 9600, duration: 1860 }, // D♭4
        { midi: 65, onset: 9600, duration: 1860 }, // F4
        { midi: 56, onset: 11520, duration: 1860 }, // A♭3
        { midi: 60, onset: 11520, duration: 1860 }, // C4
        { midi: 62, onset: 11520, duration: 1860 }, // D4
        { midi: 67, onset: 11520, duration: 1860 }, // G4
        { midi: 56, onset: 13440, duration: 940 }, // A♭3
        { midi: 60, onset: 13440, duration: 940 }, // C4
        { midi: 62, onset: 13440, duration: 940 }, // D4
        { midi: 67, onset: 13440, duration: 940 }, // G4
        { midi: 65, onset: 14400, duration: 940 }, // F4
        { midi: 68, onset: 14400, duration: 940 }, // A♭4
        { midi: 71, onset: 14400, duration: 940 }, // B4
        { midi: 74, onset: 14400, duration: 940 }, // D5
        { midi: 63, onset: 15360, duration: 1860 }, // E♭4
        { midi: 67, onset: 15360, duration: 1860 }, // G4
        { midi: 70, onset: 15360, duration: 1860 }, // B♭4
        { midi: 74, onset: 15360, duration: 1860 }, // D5
        { midi: 63, onset: 17280, duration: 1860 }, // E♭4
        { midi: 67, onset: 17280, duration: 1860 }, // G4
        { midi: 69, onset: 17280, duration: 1860 }, // A4
        { midi: 74, onset: 17280, duration: 1860 }, // D5
        { midi: 62, onset: 19200, duration: 940 }, // D4
        { midi: 65, onset: 19200, duration: 940 }, // F4
        { midi: 68, onset: 19200, duration: 940 }, // A♭4
        { midi: 72, onset: 19200, duration: 940 }, // C5
        { midi: 65, onset: 20160, duration: 940 }, // F4
        { midi: 68, onset: 20160, duration: 940 }, // A♭4
        { midi: 71, onset: 20160, duration: 940 }, // B4
        { midi: 74, onset: 20160, duration: 940 }, // D5
        { midi: 63, onset: 21120, duration: 940 }, // E♭4
        { midi: 67, onset: 21120, duration: 940 }, // G4
        { midi: 70, onset: 21120, duration: 940 }, // B♭4
        { midi: 74, onset: 21120, duration: 940 }, // D5
        { midi: 63, onset: 22080, duration: 940 }, // E♭4
        { midi: 67, onset: 22080, duration: 940 }, // G4
        { midi: 69, onset: 22080, duration: 940 }, // A4
        { midi: 74, onset: 22080, duration: 940 }, // D5
      ],
    },
  ],
};

const bluesL3SectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 24,
      module: 'blues_l3',
      section: 'C',
      subsection: 'C1: Two-Feel',
      activity: 'C1.1: Two-Feel — the Jazz Blues in F',
      direction:
        'Half notes on the root and 5, with an approach into each new chord.',
      assessment: 'pitch_order_timing',
      tag: 'blues:l3_bass_twofeel | blues',
      styleRef: 'l3a',
      successFeedback: 'The head-in bass of many blues tunes.',
      key: 'F major',
      chordSymbols: [
        'F7',
        'F7',
        'F7',
        'F7',
        'F7',
        'F7',
        'Cm7',
        'F7',
        'Bb7',
        'Bb7',
        'Bb7',
        'Bb7',
        'F7',
        'F7',
        'F7',
        'D7',
        'Gm7',
        'Gm7',
        'C7',
        'C7',
        'F7',
        'D7',
        'Gm7',
        'C7',
      ],
      chordsPerBar: 2,
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      targetNotes: [
        { midi: 41, onset: 0, duration: 940 }, // F2
        { midi: 48, onset: 960, duration: 700 }, // C3
        { midi: 42, onset: 1680, duration: 220 }, // G♭2
        { midi: 41, onset: 1920, duration: 940 }, // F2
        { midi: 41, onset: 2880, duration: 460 }, // F2
        { midi: 39, onset: 3360, duration: 460 }, // E♭2
        { midi: 41, onset: 3840, duration: 940 }, // F2
        { midi: 48, onset: 4800, duration: 700 }, // C3
        { midi: 38, onset: 5520, duration: 220 }, // D2
        { midi: 36, onset: 5760, duration: 940 }, // C2
        { midi: 41, onset: 6720, duration: 460 }, // F2
        { midi: 36, onset: 7200, duration: 460 }, // C2
        { midi: 34, onset: 7680, duration: 940 }, // B♭1
        { midi: 41, onset: 8640, duration: 700 }, // F2
        { midi: 33, onset: 9360, duration: 220 }, // A1
        { midi: 34, onset: 9600, duration: 940 }, // B♭1
        { midi: 34, onset: 10560, duration: 460 }, // B♭1
        { midi: 32, onset: 11040, duration: 460 }, // A♭1
        { midi: 29, onset: 11520, duration: 940 }, // F1
        { midi: 36, onset: 12480, duration: 700 }, // C2
        { midi: 30, onset: 13200, duration: 220 }, // G♭1
        { midi: 29, onset: 13440, duration: 940 }, // F1
        { midi: 38, onset: 14400, duration: 460 }, // D2
        { midi: 39, onset: 14880, duration: 460 }, // E♭2
        { midi: 43, onset: 15360, duration: 940 }, // G2
        { midi: 50, onset: 16320, duration: 700 }, // D3
        { midi: 37, onset: 17040, duration: 220 }, // D♭2
        { midi: 36, onset: 17280, duration: 940 }, // C2
        { midi: 36, onset: 18240, duration: 460 }, // C2
        { midi: 38, onset: 18720, duration: 460 }, // D2
        { midi: 41, onset: 19200, duration: 940 }, // F2
        { midi: 38, onset: 20160, duration: 700 }, // D2
        { midi: 42, onset: 20880, duration: 220 }, // G♭2
        { midi: 43, onset: 21120, duration: 940 }, // G2
        { midi: 36, onset: 22080, duration: 460 }, // C2
        { midi: 38, onset: 22560, duration: 460 }, // D2
      ],
    },
    {
      stepNumber: 25,
      module: 'blues_l3',
      section: 'C',
      subsection: 'C1: Two-Feel',
      activity: 'C1.2: Bass Play-Along — Two-Feel, the Jazz Blues in F',
      direction: 'The two-feel under the band.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_bass_twofeel_play | blues',
      styleRef: 'l3a',
      successFeedback: 'Two beats a bar, and the band swings.',
      key: 'F major',
      chordSymbols: [
        'F7',
        'F7',
        'F7',
        'F7',
        'F7',
        'F7',
        'Cm7',
        'F7',
        'Bb7',
        'Bb7',
        'Bb7',
        'Bb7',
        'F7',
        'F7',
        'F7',
        'D7',
        'Gm7',
        'Gm7',
        'C7',
        'C7',
        'F7',
        'D7',
        'Gm7',
        'C7',
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
        { midi: 41, onset: 0, duration: 940 }, // F2
        { midi: 48, onset: 960, duration: 700 }, // C3
        { midi: 42, onset: 1680, duration: 220 }, // G♭2
        { midi: 41, onset: 1920, duration: 940 }, // F2
        { midi: 41, onset: 2880, duration: 460 }, // F2
        { midi: 39, onset: 3360, duration: 460 }, // E♭2
        { midi: 41, onset: 3840, duration: 940 }, // F2
        { midi: 48, onset: 4800, duration: 700 }, // C3
        { midi: 38, onset: 5520, duration: 220 }, // D2
        { midi: 36, onset: 5760, duration: 940 }, // C2
        { midi: 41, onset: 6720, duration: 460 }, // F2
        { midi: 36, onset: 7200, duration: 460 }, // C2
        { midi: 34, onset: 7680, duration: 940 }, // B♭1
        { midi: 41, onset: 8640, duration: 700 }, // F2
        { midi: 33, onset: 9360, duration: 220 }, // A1
        { midi: 34, onset: 9600, duration: 940 }, // B♭1
        { midi: 34, onset: 10560, duration: 460 }, // B♭1
        { midi: 32, onset: 11040, duration: 460 }, // A♭1
        { midi: 29, onset: 11520, duration: 940 }, // F1
        { midi: 36, onset: 12480, duration: 700 }, // C2
        { midi: 30, onset: 13200, duration: 220 }, // G♭1
        { midi: 29, onset: 13440, duration: 940 }, // F1
        { midi: 38, onset: 14400, duration: 460 }, // D2
        { midi: 39, onset: 14880, duration: 460 }, // E♭2
        { midi: 43, onset: 15360, duration: 940 }, // G2
        { midi: 50, onset: 16320, duration: 700 }, // D3
        { midi: 37, onset: 17040, duration: 220 }, // D♭2
        { midi: 36, onset: 17280, duration: 940 }, // C2
        { midi: 36, onset: 18240, duration: 460 }, // C2
        { midi: 38, onset: 18720, duration: 460 }, // D2
        { midi: 41, onset: 19200, duration: 940 }, // F2
        { midi: 38, onset: 20160, duration: 700 }, // D2
        { midi: 42, onset: 20880, duration: 220 }, // G♭2
        { midi: 43, onset: 21120, duration: 940 }, // G2
        { midi: 36, onset: 22080, duration: 460 }, // C2
        { midi: 38, onset: 22560, duration: 460 }, // D2
      ],
    },
    {
      stepNumber: 26,
      module: 'blues_l3',
      section: 'C',
      subsection: 'C2: Walking, One Chord a Bar',
      activity: 'C2.1: Walking — the Jazz Blues in F',
      direction:
        'Four to the bar: the root on 1, passing tones, an approach into the next chord. In bars 4, 8, 11 and 12 the new root comes on beat 3.',
      assessment: 'pitch_order_timing',
      tag: 'blues:l3_bass_walk | blues',
      styleRef: 'l3a',
      successFeedback: 'A whole chorus of walking bass.',
      key: 'F major',
      chordSymbols: [
        'F7',
        'F7',
        'F7',
        'F7',
        'F7',
        'F7',
        'Cm7',
        'F7',
        'Bb7',
        'Bb7',
        'Bb7',
        'Bb7',
        'F7',
        'F7',
        'F7',
        'D7',
        'Gm7',
        'Gm7',
        'C7',
        'C7',
        'F7',
        'D7',
        'Gm7',
        'C7',
      ],
      chordsPerBar: 2,
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      targetNotes: [
        { midi: 41, onset: 0, duration: 460 }, // F2
        { midi: 43, onset: 480, duration: 460 }, // G2
        { midi: 45, onset: 960, duration: 460 }, // A2
        { midi: 48, onset: 1440, duration: 220 }, // C3
        { midi: 43, onset: 1680, duration: 220 }, // G2
        { midi: 41, onset: 1920, duration: 460 }, // F2
        { midi: 40, onset: 2400, duration: 460 }, // E2
        { midi: 41, onset: 2880, duration: 460 }, // F2
        { midi: 36, onset: 3360, duration: 460 }, // C2
        { midi: 41, onset: 3840, duration: 460 }, // F2
        { midi: 50, onset: 4320, duration: 460 }, // D3
        { midi: 48, onset: 4800, duration: 460 }, // C3
        { midi: 37, onset: 5280, duration: 220 }, // D♭2
        { midi: 31, onset: 5520, duration: 220 }, // G1
        { midi: 36, onset: 5760, duration: 460 }, // C2
        { midi: 39, onset: 6240, duration: 460 }, // E♭2
        { midi: 41, onset: 6720, duration: 460 }, // F2
        { midi: 33, onset: 7200, duration: 460 }, // A1
        { midi: 34, onset: 7680, duration: 460 }, // B♭1
        { midi: 36, onset: 8160, duration: 460 }, // C2
        { midi: 38, onset: 8640, duration: 460 }, // D2
        { midi: 41, onset: 9120, duration: 220 }, // F2
        { midi: 35, onset: 9360, duration: 220 }, // B1
        { midi: 34, onset: 9600, duration: 460 }, // B♭1
        { midi: 33, onset: 10080, duration: 460 }, // A1
        { midi: 34, onset: 10560, duration: 460 }, // B♭1
        { midi: 30, onset: 11040, duration: 460 }, // G♭1
        { midi: 29, onset: 11520, duration: 460 }, // F1
        { midi: 38, onset: 12000, duration: 460 }, // D2
        { midi: 36, onset: 12480, duration: 460 }, // C2
        { midi: 30, onset: 12960, duration: 220 }, // G♭1
        { midi: 28, onset: 13200, duration: 220 }, // E1
        { midi: 29, onset: 13440, duration: 460 }, // F1
        { midi: 37, onset: 13920, duration: 460 }, // D♭2
        { midi: 38, onset: 14400, duration: 460 }, // D2
        { midi: 42, onset: 14880, duration: 460 }, // G♭2
        { midi: 43, onset: 15360, duration: 460 }, // G2
        { midi: 45, onset: 15840, duration: 460 }, // A2
        { midi: 46, onset: 16320, duration: 460 }, // B♭2
        { midi: 50, onset: 16800, duration: 220 }, // D3
        { midi: 34, onset: 17040, duration: 220 }, // B♭1
        { midi: 36, onset: 17280, duration: 460 }, // C2
        { midi: 38, onset: 17760, duration: 460 }, // D2
        { midi: 40, onset: 18240, duration: 460 }, // E2
        { midi: 42, onset: 18720, duration: 460 }, // G♭2
        { midi: 41, onset: 19200, duration: 460 }, // F2
        { midi: 45, onset: 19680, duration: 460 }, // A2
        { midi: 38, onset: 20160, duration: 460 }, // D2
        { midi: 42, onset: 20640, duration: 220 }, // G♭2
        { midi: 44, onset: 20880, duration: 220 }, // A♭2
        { midi: 43, onset: 21120, duration: 460 }, // G2
        { midi: 37, onset: 21600, duration: 460 }, // D♭2
        { midi: 36, onset: 22080, duration: 460 }, // C2
        { midi: 40, onset: 22560, duration: 460 }, // E2
      ],
    },
    {
      stepNumber: 27,
      module: 'blues_l3',
      section: 'C',
      subsection: 'C2: Walking, One Chord a Bar',
      activity: 'C2.2: Walking — the Jazz Blues with the ♯iv°7',
      direction:
        'The other jazz blues: B♭7 in bar 2, B diminished in bar 6, D7 in bar 8.',
      assessment: 'pitch_order_timing',
      tag: 'blues:l3_bass_walk_dim | blues',
      styleRef: 'l3a',
      successFeedback: 'A diminished chord, walked through.',
      key: 'F major',
      chordSymbols: [
        'F7',
        'F7',
        'Bb7',
        'Bb7',
        'F7',
        'F7',
        'Cm7',
        'F7',
        'Bb7',
        'Bb7',
        'Bdim7',
        'Bdim7',
        'F7',
        'F7',
        'D7',
        'D7',
        'Gm7',
        'Gm7',
        'C7',
        'C7',
        'F7',
        'D7',
        'Gm7',
        'C7',
      ],
      chordsPerBar: 2,
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      targetNotes: [
        { midi: 41, onset: 0, duration: 460 }, // F2
        { midi: 43, onset: 480, duration: 460 }, // G2
        { midi: 45, onset: 960, duration: 460 }, // A2
        { midi: 48, onset: 1440, duration: 220 }, // C3
        { midi: 35, onset: 1680, duration: 220 }, // B1
        { midi: 34, onset: 1920, duration: 460 }, // B♭1
        { midi: 33, onset: 2400, duration: 460 }, // A1
        { midi: 34, onset: 2880, duration: 460 }, // B♭1
        { midi: 36, onset: 3360, duration: 460 }, // C2
        { midi: 29, onset: 3840, duration: 460 }, // F1
        { midi: 38, onset: 4320, duration: 460 }, // D2
        { midi: 36, onset: 4800, duration: 460 }, // C2
        { midi: 35, onset: 5280, duration: 220 }, // B1
        { midi: 31, onset: 5520, duration: 220 }, // G1
        { midi: 36, onset: 5760, duration: 460 }, // C2
        { midi: 39, onset: 6240, duration: 460 }, // E♭2
        { midi: 41, onset: 6720, duration: 460 }, // F2
        { midi: 33, onset: 7200, duration: 460 }, // A1
        { midi: 34, onset: 7680, duration: 460 }, // B♭1
        { midi: 36, onset: 8160, duration: 460 }, // C2
        { midi: 38, onset: 8640, duration: 460 }, // D2
        { midi: 41, onset: 9120, duration: 220 }, // F2
        { midi: 36, onset: 9360, duration: 220 }, // C2
        { midi: 35, onset: 9600, duration: 460 }, // B1
        { midi: 34, onset: 10080, duration: 460 }, // B♭1
        { midi: 38, onset: 10560, duration: 460 }, // D2
        { midi: 40, onset: 11040, duration: 460 }, // E2
        { midi: 41, onset: 11520, duration: 460 }, // F2
        { midi: 50, onset: 12000, duration: 460 }, // D3
        { midi: 48, onset: 12480, duration: 460 }, // C3
        { midi: 39, onset: 12960, duration: 220 }, // E♭2
        { midi: 40, onset: 13200, duration: 220 }, // E2
        { midi: 38, onset: 13440, duration: 460 }, // D2
        { midi: 39, onset: 13920, duration: 460 }, // E♭2
        { midi: 38, onset: 14400, duration: 460 }, // D2
        { midi: 41, onset: 14880, duration: 460 }, // F2
        { midi: 43, onset: 15360, duration: 460 }, // G2
        { midi: 45, onset: 15840, duration: 460 }, // A2
        { midi: 46, onset: 16320, duration: 460 }, // B♭2
        { midi: 50, onset: 16800, duration: 220 }, // D3
        { midi: 43, onset: 17040, duration: 220 }, // G2
        { midi: 36, onset: 17280, duration: 460 }, // C2
        { midi: 35, onset: 17760, duration: 460 }, // B1
        { midi: 36, onset: 18240, duration: 460 }, // C2
        { midi: 40, onset: 18720, duration: 460 }, // E2
        { midi: 41, onset: 19200, duration: 460 }, // F2
        { midi: 39, onset: 19680, duration: 460 }, // E♭2
        { midi: 38, onset: 20160, duration: 460 }, // D2
        { midi: 42, onset: 20640, duration: 220 }, // G♭2
        { midi: 44, onset: 20880, duration: 220 }, // A♭2
        { midi: 43, onset: 21120, duration: 460 }, // G2
        { midi: 38, onset: 21600, duration: 460 }, // D2
        { midi: 36, onset: 22080, duration: 460 }, // C2
        { midi: 40, onset: 22560, duration: 460 }, // E2
      ],
    },
    {
      stepNumber: 28,
      module: 'blues_l3',
      section: 'C',
      subsection: 'C2: Walking, One Chord a Bar',
      activity: 'C2.3: Bass Play-Along — Walking, the Jazz Blues in F',
      direction: 'The walking line under the band.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_bass_walk_play | blues',
      styleRef: 'l3a',
      successFeedback: 'The heartbeat of swing.',
      key: 'F major',
      chordSymbols: [
        'F7',
        'F7',
        'F7',
        'F7',
        'F7',
        'F7',
        'Cm7',
        'F7',
        'Bb7',
        'Bb7',
        'Bb7',
        'Bb7',
        'F7',
        'F7',
        'F7',
        'D7',
        'Gm7',
        'Gm7',
        'C7',
        'C7',
        'F7',
        'D7',
        'Gm7',
        'C7',
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
        { midi: 41, onset: 0, duration: 460 }, // F2
        { midi: 43, onset: 480, duration: 460 }, // G2
        { midi: 45, onset: 960, duration: 460 }, // A2
        { midi: 48, onset: 1440, duration: 220 }, // C3
        { midi: 43, onset: 1680, duration: 220 }, // G2
        { midi: 41, onset: 1920, duration: 460 }, // F2
        { midi: 40, onset: 2400, duration: 460 }, // E2
        { midi: 41, onset: 2880, duration: 460 }, // F2
        { midi: 36, onset: 3360, duration: 460 }, // C2
        { midi: 41, onset: 3840, duration: 460 }, // F2
        { midi: 50, onset: 4320, duration: 460 }, // D3
        { midi: 48, onset: 4800, duration: 460 }, // C3
        { midi: 37, onset: 5280, duration: 220 }, // D♭2
        { midi: 31, onset: 5520, duration: 220 }, // G1
        { midi: 36, onset: 5760, duration: 460 }, // C2
        { midi: 39, onset: 6240, duration: 460 }, // E♭2
        { midi: 41, onset: 6720, duration: 460 }, // F2
        { midi: 33, onset: 7200, duration: 460 }, // A1
        { midi: 34, onset: 7680, duration: 460 }, // B♭1
        { midi: 36, onset: 8160, duration: 460 }, // C2
        { midi: 38, onset: 8640, duration: 460 }, // D2
        { midi: 41, onset: 9120, duration: 220 }, // F2
        { midi: 35, onset: 9360, duration: 220 }, // B1
        { midi: 34, onset: 9600, duration: 460 }, // B♭1
        { midi: 33, onset: 10080, duration: 460 }, // A1
        { midi: 34, onset: 10560, duration: 460 }, // B♭1
        { midi: 30, onset: 11040, duration: 460 }, // G♭1
        { midi: 29, onset: 11520, duration: 460 }, // F1
        { midi: 38, onset: 12000, duration: 460 }, // D2
        { midi: 36, onset: 12480, duration: 460 }, // C2
        { midi: 30, onset: 12960, duration: 220 }, // G♭1
        { midi: 28, onset: 13200, duration: 220 }, // E1
        { midi: 29, onset: 13440, duration: 460 }, // F1
        { midi: 37, onset: 13920, duration: 460 }, // D♭2
        { midi: 38, onset: 14400, duration: 460 }, // D2
        { midi: 42, onset: 14880, duration: 460 }, // G♭2
        { midi: 43, onset: 15360, duration: 460 }, // G2
        { midi: 45, onset: 15840, duration: 460 }, // A2
        { midi: 46, onset: 16320, duration: 460 }, // B♭2
        { midi: 50, onset: 16800, duration: 220 }, // D3
        { midi: 34, onset: 17040, duration: 220 }, // B♭1
        { midi: 36, onset: 17280, duration: 460 }, // C2
        { midi: 38, onset: 17760, duration: 460 }, // D2
        { midi: 40, onset: 18240, duration: 460 }, // E2
        { midi: 42, onset: 18720, duration: 460 }, // G♭2
        { midi: 41, onset: 19200, duration: 460 }, // F2
        { midi: 45, onset: 19680, duration: 460 }, // A2
        { midi: 38, onset: 20160, duration: 460 }, // D2
        { midi: 42, onset: 20640, duration: 220 }, // G♭2
        { midi: 44, onset: 20880, duration: 220 }, // A♭2
        { midi: 43, onset: 21120, duration: 460 }, // G2
        { midi: 37, onset: 21600, duration: 460 }, // D♭2
        { midi: 36, onset: 22080, duration: 460 }, // C2
        { midi: 40, onset: 22560, duration: 460 }, // E2
      ],
    },
    {
      stepNumber: 29,
      module: 'blues_l3',
      section: 'C',
      subsection: 'C3: Walking, Two Chords a Bar',
      activity: 'C3.1: Walking Two Chords a Bar — the Jazz Blues in F',
      direction:
        'A root on 1 and on 3 of most bars, an approach between: the walk for busy changes.',
      assessment: 'pitch_order_timing',
      tag: 'blues:l3_bass_walk_2 | blues',
      styleRef: 'l3a',
      successFeedback: 'Twice the roots, the same swing.',
      key: 'F major',
      chordSymbols: [
        'F7',
        'F7',
        'F7',
        'F7',
        'F7',
        'F7',
        'Cm7',
        'F7',
        'Bb7',
        'Bb7',
        'Bb7',
        'Bb7',
        'F7',
        'F7',
        'F7',
        'D7',
        'Gm7',
        'Gm7',
        'C7',
        'C7',
        'F7',
        'D7',
        'Gm7',
        'C7',
      ],
      chordsPerBar: 2,
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      targetNotes: [
        { midi: 41, onset: 0, duration: 460 }, // F2
        { midi: 40, onset: 480, duration: 460 }, // E2
        { midi: 41, onset: 960, duration: 460 }, // F2
        { midi: 48, onset: 1440, duration: 220 }, // C3
        { midi: 43, onset: 1680, duration: 220 }, // G2
        { midi: 41, onset: 1920, duration: 460 }, // F2
        { midi: 40, onset: 2400, duration: 460 }, // E2
        { midi: 41, onset: 2880, duration: 460 }, // F2
        { midi: 40, onset: 3360, duration: 460 }, // E2
        { midi: 41, onset: 3840, duration: 460 }, // F2
        { midi: 40, onset: 4320, duration: 460 }, // E2
        { midi: 41, onset: 4800, duration: 460 }, // F2
        { midi: 48, onset: 5280, duration: 460 }, // C3
        { midi: 36, onset: 5760, duration: 460 }, // C2
        { midi: 40, onset: 6240, duration: 460 }, // E2
        { midi: 41, onset: 6720, duration: 460 }, // F2
        { midi: 35, onset: 7200, duration: 460 }, // B1
        { midi: 34, onset: 7680, duration: 460 }, // B♭1
        { midi: 36, onset: 8160, duration: 460 }, // C2
        { midi: 34, onset: 8640, duration: 460 }, // B♭1
        { midi: 41, onset: 9120, duration: 220 }, // F2
        { midi: 35, onset: 9360, duration: 220 }, // B1
        { midi: 34, onset: 9600, duration: 460 }, // B♭1
        { midi: 33, onset: 10080, duration: 460 }, // A1
        { midi: 34, onset: 10560, duration: 460 }, // B♭1
        { midi: 30, onset: 11040, duration: 460 }, // G♭1
        { midi: 29, onset: 11520, duration: 460 }, // F1
        { midi: 28, onset: 12000, duration: 460 }, // E1
        { midi: 29, onset: 12480, duration: 460 }, // F1
        { midi: 36, onset: 12960, duration: 460 }, // C2
        { midi: 29, onset: 13440, duration: 460 }, // F1
        { midi: 36, onset: 13920, duration: 460 }, // C2
        { midi: 38, onset: 14400, duration: 460 }, // D2
        { midi: 42, onset: 14880, duration: 460 }, // G♭2
        { midi: 43, onset: 15360, duration: 460 }, // G2
        { midi: 45, onset: 15840, duration: 460 }, // A2
        { midi: 43, onset: 16320, duration: 460 }, // G2
        { midi: 50, onset: 16800, duration: 220 }, // D3
        { midi: 37, onset: 17040, duration: 220 }, // D♭2
        { midi: 36, onset: 17280, duration: 460 }, // C2
        { midi: 38, onset: 17760, duration: 460 }, // D2
        { midi: 36, onset: 18240, duration: 460 }, // C2
        { midi: 40, onset: 18720, duration: 460 }, // E2
        { midi: 41, onset: 19200, duration: 460 }, // F2
        { midi: 39, onset: 19680, duration: 460 }, // E♭2
        { midi: 38, onset: 20160, duration: 460 }, // D2
        { midi: 45, onset: 20640, duration: 460 }, // A2
        { midi: 43, onset: 21120, duration: 460 }, // G2
        { midi: 38, onset: 21600, duration: 460 }, // D2
        { midi: 36, onset: 22080, duration: 460 }, // C2
        { midi: 40, onset: 22560, duration: 460 }, // E2
      ],
    },
    {
      stepNumber: 30,
      module: 'blues_l3',
      section: 'C',
      subsection: 'C3: Walking, Two Chords a Bar',
      activity: 'C3.2: Bass Play-Along — Walking in B♭',
      direction: 'The walking line from C2.1, up a 4th: the jazz blues in B♭.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_bass_walk_bb | blues',
      styleRef: 'l3a',
      successFeedback: 'Walking in the key of the blues heads.',
      key: 'Bb major',
      chordSymbols: [
        'Bb7',
        'Bb7',
        'Bb7',
        'Bb7',
        'Bb7',
        'Bb7',
        'Fm7',
        'Bb7',
        'Eb7',
        'Eb7',
        'Eb7',
        'Eb7',
        'Bb7',
        'Bb7',
        'Bb7',
        'G7',
        'Cm7',
        'Cm7',
        'F7',
        'F7',
        'Bb7',
        'G7',
        'Cm7',
        'F7',
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
        { midi: 46, onset: 0, duration: 460 }, // B♭2
        { midi: 48, onset: 480, duration: 460 }, // C3
        { midi: 50, onset: 960, duration: 460 }, // D3
        { midi: 53, onset: 1440, duration: 220 }, // F3
        { midi: 48, onset: 1680, duration: 220 }, // C3
        { midi: 46, onset: 1920, duration: 460 }, // B♭2
        { midi: 45, onset: 2400, duration: 460 }, // A2
        { midi: 46, onset: 2880, duration: 460 }, // B♭2
        { midi: 41, onset: 3360, duration: 460 }, // F2
        { midi: 46, onset: 3840, duration: 460 }, // B♭2
        { midi: 55, onset: 4320, duration: 460 }, // G3
        { midi: 53, onset: 4800, duration: 460 }, // F3
        { midi: 42, onset: 5280, duration: 220 }, // G♭2
        { midi: 36, onset: 5520, duration: 220 }, // C2
        { midi: 41, onset: 5760, duration: 460 }, // F2
        { midi: 44, onset: 6240, duration: 460 }, // A♭2
        { midi: 46, onset: 6720, duration: 460 }, // B♭2
        { midi: 38, onset: 7200, duration: 460 }, // D2
        { midi: 39, onset: 7680, duration: 460 }, // E♭2
        { midi: 41, onset: 8160, duration: 460 }, // F2
        { midi: 43, onset: 8640, duration: 460 }, // G2
        { midi: 46, onset: 9120, duration: 220 }, // B♭2
        { midi: 40, onset: 9360, duration: 220 }, // E2
        { midi: 39, onset: 9600, duration: 460 }, // E♭2
        { midi: 38, onset: 10080, duration: 460 }, // D2
        { midi: 39, onset: 10560, duration: 460 }, // E♭2
        { midi: 35, onset: 11040, duration: 460 }, // B1
        { midi: 34, onset: 11520, duration: 460 }, // B♭1
        { midi: 43, onset: 12000, duration: 460 }, // G2
        { midi: 41, onset: 12480, duration: 460 }, // F2
        { midi: 35, onset: 12960, duration: 220 }, // B1
        { midi: 33, onset: 13200, duration: 220 }, // A1
        { midi: 34, onset: 13440, duration: 460 }, // B♭1
        { midi: 42, onset: 13920, duration: 460 }, // G♭2
        { midi: 43, onset: 14400, duration: 460 }, // G2
        { midi: 47, onset: 14880, duration: 460 }, // B2
        { midi: 48, onset: 15360, duration: 460 }, // C3
        { midi: 50, onset: 15840, duration: 460 }, // D3
        { midi: 51, onset: 16320, duration: 460 }, // E♭3
        { midi: 55, onset: 16800, duration: 220 }, // G3
        { midi: 39, onset: 17040, duration: 220 }, // E♭2
        { midi: 41, onset: 17280, duration: 460 }, // F2
        { midi: 43, onset: 17760, duration: 460 }, // G2
        { midi: 45, onset: 18240, duration: 460 }, // A2
        { midi: 47, onset: 18720, duration: 460 }, // B2
        { midi: 46, onset: 19200, duration: 460 }, // B♭2
        { midi: 50, onset: 19680, duration: 460 }, // D3
        { midi: 43, onset: 20160, duration: 460 }, // G2
        { midi: 47, onset: 20640, duration: 220 }, // B2
        { midi: 49, onset: 20880, duration: 220 }, // D♭3
        { midi: 48, onset: 21120, duration: 460 }, // C3
        { midi: 42, onset: 21600, duration: 460 }, // G♭2
        { midi: 41, onset: 22080, duration: 460 }, // F2
        { midi: 45, onset: 22560, duration: 460 }, // A2
      ],
    },
  ],
};

const bluesL3SectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 31,
      module: 'blues_l3',
      section: 'D',
      subsection: 'D1: LH Walking, RH Guide Tones',
      activity: 'D1.1: LH Walking + RH 3-7 Shells — the Jazz Blues in F',
      direction:
        'Left hand walks; right hand the 3rd and 7th of each chord, the closer way up.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_perf_walk_guide | blues',
      styleRef: 'l3a',
      successFeedback: 'Bass and comping at once: a whole band in two hands.',
      key: 'F major',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      chordSymbols: [
        'F7',
        'F7',
        'F7',
        'F7',
        'F7',
        'F7',
        'Cm7',
        'F7',
        'Bb7',
        'Bb7',
        'Bb7',
        'Bb7',
        'F7',
        'F7',
        'F7',
        'D7',
        'Gm7',
        'Gm7',
        'C7',
        'C7',
        'F7',
        'D7',
        'Gm7',
        'C7',
      ],
      chordsPerBar: 2,
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 41, onset: 0, duration: 460, hand: 'lh' }, // F2
        { midi: 43, onset: 480, duration: 460, hand: 'lh' }, // G2
        { midi: 45, onset: 960, duration: 460, hand: 'lh' }, // A2
        { midi: 48, onset: 1440, duration: 220, hand: 'lh' }, // C3
        { midi: 43, onset: 1680, duration: 220, hand: 'lh' }, // G2
        { midi: 41, onset: 1920, duration: 460, hand: 'lh' }, // F2
        { midi: 40, onset: 2400, duration: 460, hand: 'lh' }, // E2
        { midi: 41, onset: 2880, duration: 460, hand: 'lh' }, // F2
        { midi: 36, onset: 3360, duration: 460, hand: 'lh' }, // C2
        { midi: 41, onset: 3840, duration: 460, hand: 'lh' }, // F2
        { midi: 50, onset: 4320, duration: 460, hand: 'lh' }, // D3
        { midi: 48, onset: 4800, duration: 460, hand: 'lh' }, // C3
        { midi: 37, onset: 5280, duration: 220, hand: 'lh' }, // D♭2
        { midi: 31, onset: 5520, duration: 220, hand: 'lh' }, // G1
        { midi: 36, onset: 5760, duration: 460, hand: 'lh' }, // C2
        { midi: 39, onset: 6240, duration: 460, hand: 'lh' }, // E♭2
        { midi: 41, onset: 6720, duration: 460, hand: 'lh' }, // F2
        { midi: 33, onset: 7200, duration: 460, hand: 'lh' }, // A1
        { midi: 34, onset: 7680, duration: 460, hand: 'lh' }, // B♭1
        { midi: 36, onset: 8160, duration: 460, hand: 'lh' }, // C2
        { midi: 38, onset: 8640, duration: 460, hand: 'lh' }, // D2
        { midi: 41, onset: 9120, duration: 220, hand: 'lh' }, // F2
        { midi: 35, onset: 9360, duration: 220, hand: 'lh' }, // B1
        { midi: 34, onset: 9600, duration: 460, hand: 'lh' }, // B♭1
        { midi: 33, onset: 10080, duration: 460, hand: 'lh' }, // A1
        { midi: 34, onset: 10560, duration: 460, hand: 'lh' }, // B♭1
        { midi: 30, onset: 11040, duration: 460, hand: 'lh' }, // G♭1
        { midi: 29, onset: 11520, duration: 460, hand: 'lh' }, // F1
        { midi: 38, onset: 12000, duration: 460, hand: 'lh' }, // D2
        { midi: 36, onset: 12480, duration: 460, hand: 'lh' }, // C2
        { midi: 30, onset: 12960, duration: 220, hand: 'lh' }, // G♭1
        { midi: 28, onset: 13200, duration: 220, hand: 'lh' }, // E1
        { midi: 29, onset: 13440, duration: 460, hand: 'lh' }, // F1
        { midi: 37, onset: 13920, duration: 460, hand: 'lh' }, // D♭2
        { midi: 38, onset: 14400, duration: 460, hand: 'lh' }, // D2
        { midi: 42, onset: 14880, duration: 460, hand: 'lh' }, // G♭2
        { midi: 43, onset: 15360, duration: 460, hand: 'lh' }, // G2
        { midi: 45, onset: 15840, duration: 460, hand: 'lh' }, // A2
        { midi: 46, onset: 16320, duration: 460, hand: 'lh' }, // B♭2
        { midi: 50, onset: 16800, duration: 220, hand: 'lh' }, // D3
        { midi: 34, onset: 17040, duration: 220, hand: 'lh' }, // B♭1
        { midi: 36, onset: 17280, duration: 460, hand: 'lh' }, // C2
        { midi: 38, onset: 17760, duration: 460, hand: 'lh' }, // D2
        { midi: 40, onset: 18240, duration: 460, hand: 'lh' }, // E2
        { midi: 42, onset: 18720, duration: 460, hand: 'lh' }, // G♭2
        { midi: 41, onset: 19200, duration: 460, hand: 'lh' }, // F2
        { midi: 45, onset: 19680, duration: 460, hand: 'lh' }, // A2
        { midi: 38, onset: 20160, duration: 460, hand: 'lh' }, // D2
        { midi: 42, onset: 20640, duration: 220, hand: 'lh' }, // G♭2
        { midi: 44, onset: 20880, duration: 220, hand: 'lh' }, // A♭2
        { midi: 43, onset: 21120, duration: 460, hand: 'lh' }, // G2
        { midi: 37, onset: 21600, duration: 460, hand: 'lh' }, // D♭2
        { midi: 36, onset: 22080, duration: 460, hand: 'lh' }, // C2
        { midi: 40, onset: 22560, duration: 460, hand: 'lh' }, // E2
        { midi: 57, onset: 0, duration: 1860, hand: 'rh' }, // A3
        { midi: 63, onset: 0, duration: 1860, hand: 'rh' }, // E♭4
        { midi: 57, onset: 1920, duration: 1860, hand: 'rh' }, // A3
        { midi: 63, onset: 1920, duration: 1860, hand: 'rh' }, // E♭4
        { midi: 57, onset: 3840, duration: 1860, hand: 'rh' }, // A3
        { midi: 63, onset: 3840, duration: 1860, hand: 'rh' }, // E♭4
        { midi: 58, onset: 5760, duration: 940, hand: 'rh' }, // B♭3
        { midi: 63, onset: 5760, duration: 940, hand: 'rh' }, // E♭4
        { midi: 57, onset: 6720, duration: 940, hand: 'rh' }, // A3
        { midi: 63, onset: 6720, duration: 940, hand: 'rh' }, // E♭4
        { midi: 56, onset: 7680, duration: 1860, hand: 'rh' }, // A♭3
        { midi: 62, onset: 7680, duration: 1860, hand: 'rh' }, // D4
        { midi: 56, onset: 9600, duration: 1860, hand: 'rh' }, // A♭3
        { midi: 62, onset: 9600, duration: 1860, hand: 'rh' }, // D4
        { midi: 57, onset: 11520, duration: 1860, hand: 'rh' }, // A3
        { midi: 63, onset: 11520, duration: 1860, hand: 'rh' }, // E♭4
        { midi: 57, onset: 13440, duration: 940, hand: 'rh' }, // A3
        { midi: 63, onset: 13440, duration: 940, hand: 'rh' }, // E♭4
        { midi: 60, onset: 14400, duration: 940, hand: 'rh' }, // C4
        { midi: 66, onset: 14400, duration: 940, hand: 'rh' }, // G♭4
        { midi: 58, onset: 15360, duration: 1860, hand: 'rh' }, // B♭3
        { midi: 65, onset: 15360, duration: 1860, hand: 'rh' }, // F4
        { midi: 58, onset: 17280, duration: 1860, hand: 'rh' }, // B♭3
        { midi: 64, onset: 17280, duration: 1860, hand: 'rh' }, // E4
        { midi: 57, onset: 19200, duration: 940, hand: 'rh' }, // A3
        { midi: 63, onset: 19200, duration: 940, hand: 'rh' }, // E♭4
        { midi: 60, onset: 20160, duration: 940, hand: 'rh' }, // C4
        { midi: 66, onset: 20160, duration: 940, hand: 'rh' }, // G♭4
        { midi: 58, onset: 21120, duration: 940, hand: 'rh' }, // B♭3
        { midi: 65, onset: 21120, duration: 940, hand: 'rh' }, // F4
        { midi: 58, onset: 22080, duration: 940, hand: 'rh' }, // B♭3
        { midi: 64, onset: 22080, duration: 940, hand: 'rh' }, // E4
      ],
    },
    {
      stepNumber: 32,
      module: 'blues_l3',
      section: 'D',
      subsection: 'D1: LH Walking, RH Guide Tones',
      activity: 'D1.2: LH Walking + RH 3-7 Shells — the Jazz Blues in B♭',
      direction:
        'The same, a 4th higher, the right hand kept above the walking line.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_perf_walk_guide_bb | blues',
      styleRef: 'l3a',
      successFeedback: 'Walking and guide tones in B♭.',
      key: 'Bb major',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      chordSymbols: [
        'Bb7',
        'Bb7',
        'Bb7',
        'Bb7',
        'Bb7',
        'Bb7',
        'Fm7',
        'Bb7',
        'Eb7',
        'Eb7',
        'Eb7',
        'Eb7',
        'Bb7',
        'Bb7',
        'Bb7',
        'G7',
        'Cm7',
        'Cm7',
        'F7',
        'F7',
        'Bb7',
        'G7',
        'Cm7',
        'F7',
      ],
      chordsPerBar: 2,
      tempo: 110,
      swing: 64,
      swingUnit: '8n',
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 46, onset: 0, duration: 460, hand: 'lh' }, // B♭2
        { midi: 48, onset: 480, duration: 460, hand: 'lh' }, // C3
        { midi: 50, onset: 960, duration: 460, hand: 'lh' }, // D3
        { midi: 53, onset: 1440, duration: 220, hand: 'lh' }, // F3
        { midi: 48, onset: 1680, duration: 220, hand: 'lh' }, // C3
        { midi: 46, onset: 1920, duration: 460, hand: 'lh' }, // B♭2
        { midi: 45, onset: 2400, duration: 460, hand: 'lh' }, // A2
        { midi: 46, onset: 2880, duration: 460, hand: 'lh' }, // B♭2
        { midi: 41, onset: 3360, duration: 460, hand: 'lh' }, // F2
        { midi: 46, onset: 3840, duration: 460, hand: 'lh' }, // B♭2
        { midi: 55, onset: 4320, duration: 460, hand: 'lh' }, // G3
        { midi: 53, onset: 4800, duration: 460, hand: 'lh' }, // F3
        { midi: 42, onset: 5280, duration: 220, hand: 'lh' }, // G♭2
        { midi: 36, onset: 5520, duration: 220, hand: 'lh' }, // C2
        { midi: 41, onset: 5760, duration: 460, hand: 'lh' }, // F2
        { midi: 44, onset: 6240, duration: 460, hand: 'lh' }, // A♭2
        { midi: 46, onset: 6720, duration: 460, hand: 'lh' }, // B♭2
        { midi: 38, onset: 7200, duration: 460, hand: 'lh' }, // D2
        { midi: 39, onset: 7680, duration: 460, hand: 'lh' }, // E♭2
        { midi: 41, onset: 8160, duration: 460, hand: 'lh' }, // F2
        { midi: 43, onset: 8640, duration: 460, hand: 'lh' }, // G2
        { midi: 46, onset: 9120, duration: 220, hand: 'lh' }, // B♭2
        { midi: 40, onset: 9360, duration: 220, hand: 'lh' }, // E2
        { midi: 39, onset: 9600, duration: 460, hand: 'lh' }, // E♭2
        { midi: 38, onset: 10080, duration: 460, hand: 'lh' }, // D2
        { midi: 39, onset: 10560, duration: 460, hand: 'lh' }, // E♭2
        { midi: 35, onset: 11040, duration: 460, hand: 'lh' }, // B1
        { midi: 34, onset: 11520, duration: 460, hand: 'lh' }, // B♭1
        { midi: 43, onset: 12000, duration: 460, hand: 'lh' }, // G2
        { midi: 41, onset: 12480, duration: 460, hand: 'lh' }, // F2
        { midi: 35, onset: 12960, duration: 220, hand: 'lh' }, // B1
        { midi: 33, onset: 13200, duration: 220, hand: 'lh' }, // A1
        { midi: 34, onset: 13440, duration: 460, hand: 'lh' }, // B♭1
        { midi: 42, onset: 13920, duration: 460, hand: 'lh' }, // G♭2
        { midi: 43, onset: 14400, duration: 460, hand: 'lh' }, // G2
        { midi: 47, onset: 14880, duration: 460, hand: 'lh' }, // B2
        { midi: 48, onset: 15360, duration: 460, hand: 'lh' }, // C3
        { midi: 50, onset: 15840, duration: 460, hand: 'lh' }, // D3
        { midi: 51, onset: 16320, duration: 460, hand: 'lh' }, // E♭3
        { midi: 55, onset: 16800, duration: 220, hand: 'lh' }, // G3
        { midi: 39, onset: 17040, duration: 220, hand: 'lh' }, // E♭2
        { midi: 41, onset: 17280, duration: 460, hand: 'lh' }, // F2
        { midi: 43, onset: 17760, duration: 460, hand: 'lh' }, // G2
        { midi: 45, onset: 18240, duration: 460, hand: 'lh' }, // A2
        { midi: 47, onset: 18720, duration: 460, hand: 'lh' }, // B2
        { midi: 46, onset: 19200, duration: 460, hand: 'lh' }, // B♭2
        { midi: 50, onset: 19680, duration: 460, hand: 'lh' }, // D3
        { midi: 43, onset: 20160, duration: 460, hand: 'lh' }, // G2
        { midi: 47, onset: 20640, duration: 220, hand: 'lh' }, // B2
        { midi: 49, onset: 20880, duration: 220, hand: 'lh' }, // D♭3
        { midi: 48, onset: 21120, duration: 460, hand: 'lh' }, // C3
        { midi: 42, onset: 21600, duration: 460, hand: 'lh' }, // G♭2
        { midi: 41, onset: 22080, duration: 460, hand: 'lh' }, // F2
        { midi: 45, onset: 22560, duration: 460, hand: 'lh' }, // A2
        { midi: 62, onset: 0, duration: 1860, hand: 'rh' }, // D4
        { midi: 68, onset: 0, duration: 1860, hand: 'rh' }, // A♭4
        { midi: 62, onset: 1920, duration: 1860, hand: 'rh' }, // D4
        { midi: 68, onset: 1920, duration: 1860, hand: 'rh' }, // A♭4
        { midi: 62, onset: 3840, duration: 1860, hand: 'rh' }, // D4
        { midi: 68, onset: 3840, duration: 1860, hand: 'rh' }, // A♭4
        { midi: 63, onset: 5760, duration: 940, hand: 'rh' }, // E♭4
        { midi: 68, onset: 5760, duration: 940, hand: 'rh' }, // A♭4
        { midi: 62, onset: 6720, duration: 940, hand: 'rh' }, // D4
        { midi: 68, onset: 6720, duration: 940, hand: 'rh' }, // A♭4
        { midi: 61, onset: 7680, duration: 1860, hand: 'rh' }, // D♭4
        { midi: 67, onset: 7680, duration: 1860, hand: 'rh' }, // G4
        { midi: 61, onset: 9600, duration: 1860, hand: 'rh' }, // D♭4
        { midi: 67, onset: 9600, duration: 1860, hand: 'rh' }, // G4
        { midi: 62, onset: 11520, duration: 1860, hand: 'rh' }, // D4
        { midi: 68, onset: 11520, duration: 1860, hand: 'rh' }, // A♭4
        { midi: 62, onset: 13440, duration: 940, hand: 'rh' }, // D4
        { midi: 68, onset: 13440, duration: 940, hand: 'rh' }, // A♭4
        { midi: 59, onset: 14400, duration: 940, hand: 'rh' }, // B3
        { midi: 65, onset: 14400, duration: 940, hand: 'rh' }, // F4
        { midi: 58, onset: 15360, duration: 1860, hand: 'rh' }, // B♭3
        { midi: 63, onset: 15360, duration: 1860, hand: 'rh' }, // E♭4
        { midi: 63, onset: 17280, duration: 1860, hand: 'rh' }, // E♭4
        { midi: 69, onset: 17280, duration: 1860, hand: 'rh' }, // A4
        { midi: 62, onset: 19200, duration: 940, hand: 'rh' }, // D4
        { midi: 68, onset: 19200, duration: 940, hand: 'rh' }, // A♭4
        { midi: 59, onset: 20160, duration: 940, hand: 'rh' }, // B3
        { midi: 65, onset: 20160, duration: 940, hand: 'rh' }, // F4
        { midi: 58, onset: 21120, duration: 940, hand: 'rh' }, // B♭3
        { midi: 63, onset: 21120, duration: 940, hand: 'rh' }, // E♭4
        { midi: 57, onset: 22080, duration: 940, hand: 'rh' }, // A3
        { midi: 63, onset: 22080, duration: 940, hand: 'rh' }, // E♭4
      ],
    },
    {
      stepNumber: 33,
      module: 'blues_l3',
      section: 'D',
      subsection: 'D2: Peter’s Two-Hand Voicings',
      activity: 'D2.1: Peter’s Jazz Blues Two-Hand Voicings (F)',
      direction:
        'Left hand 1-♭7 and right hand 3-13-1 on F7 and B♭7; shells and upper structures through each ii–V; 7-♭9-5 over the D7♭9.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_perf_two_hand_f | blues',
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
      stepNumber: 34,
      module: 'blues_l3',
      section: 'D',
      subsection: 'D2: Peter’s Two-Hand Voicings',
      activity: 'D2.2: Two Hands — the Jazz Blues in B♭',
      direction:
        'Peter’s system in B♭, held: the right hand from D4 to D5, the E♭7’s left hand down to E♭2–D♭3 so the hands stay apart.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_perf_two_hand_bb | blues',
      styleRef: 'l3a',
      successFeedback: 'The system in the key of the blues heads.',
      key: 'Bb major',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'two_hand_comping',
        lh_role: 'chords',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      chordSymbols: [
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Fm9',
        'Bb13',
        'Eb13',
        'Eb13',
        'Eb13',
        'Eb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'G7b9',
        'Cm9',
        'Cm9',
        'F13',
        'F13',
        'Bb13',
        'G7b9',
        'Cm9',
        'F13',
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
        { midi: 46, onset: 0, duration: 1860, hand: 'lh' }, // B♭2
        { midi: 56, onset: 0, duration: 1860, hand: 'lh' }, // A♭3
        { midi: 46, onset: 1920, duration: 1860, hand: 'lh' }, // B♭2
        { midi: 56, onset: 1920, duration: 1860, hand: 'lh' }, // A♭3
        { midi: 46, onset: 3840, duration: 1860, hand: 'lh' }, // B♭2
        { midi: 56, onset: 3840, duration: 1860, hand: 'lh' }, // A♭3
        { midi: 41, onset: 5760, duration: 940, hand: 'lh' }, // F2
        { midi: 51, onset: 5760, duration: 940, hand: 'lh' }, // E♭3
        { midi: 46, onset: 6720, duration: 940, hand: 'lh' }, // B♭2
        { midi: 50, onset: 6720, duration: 940, hand: 'lh' }, // D3
        { midi: 39, onset: 7680, duration: 1860, hand: 'lh' }, // E♭2
        { midi: 49, onset: 7680, duration: 1860, hand: 'lh' }, // D♭3
        { midi: 39, onset: 9600, duration: 1860, hand: 'lh' }, // E♭2
        { midi: 49, onset: 9600, duration: 1860, hand: 'lh' }, // D♭3
        { midi: 46, onset: 11520, duration: 1860, hand: 'lh' }, // B♭2
        { midi: 56, onset: 11520, duration: 1860, hand: 'lh' }, // A♭3
        { midi: 46, onset: 13440, duration: 940, hand: 'lh' }, // B♭2
        { midi: 56, onset: 13440, duration: 940, hand: 'lh' }, // A♭3
        { midi: 55, onset: 14400, duration: 940, hand: 'lh' }, // G3
        { midi: 59, onset: 14400, duration: 940, hand: 'lh' }, // B3
        { midi: 48, onset: 15360, duration: 1860, hand: 'lh' }, // C3
        { midi: 58, onset: 15360, duration: 1860, hand: 'lh' }, // B♭3
        { midi: 53, onset: 17280, duration: 1860, hand: 'lh' }, // F3
        { midi: 57, onset: 17280, duration: 1860, hand: 'lh' }, // A3
        { midi: 46, onset: 19200, duration: 940, hand: 'lh' }, // B♭2
        { midi: 56, onset: 19200, duration: 940, hand: 'lh' }, // A♭3
        { midi: 55, onset: 20160, duration: 940, hand: 'lh' }, // G3
        { midi: 59, onset: 20160, duration: 940, hand: 'lh' }, // B3
        { midi: 48, onset: 21120, duration: 940, hand: 'lh' }, // C3
        { midi: 58, onset: 21120, duration: 940, hand: 'lh' }, // B♭3
        { midi: 53, onset: 22080, duration: 940, hand: 'lh' }, // F3
        { midi: 57, onset: 22080, duration: 940, hand: 'lh' }, // A3
        { midi: 62, onset: 0, duration: 1860, hand: 'rh' }, // D4
        { midi: 67, onset: 0, duration: 1860, hand: 'rh' }, // G4
        { midi: 70, onset: 0, duration: 1860, hand: 'rh' }, // B♭4
        { midi: 62, onset: 1920, duration: 1860, hand: 'rh' }, // D4
        { midi: 67, onset: 1920, duration: 1860, hand: 'rh' }, // G4
        { midi: 70, onset: 1920, duration: 1860, hand: 'rh' }, // B♭4
        { midi: 62, onset: 3840, duration: 1860, hand: 'rh' }, // D4
        { midi: 67, onset: 3840, duration: 1860, hand: 'rh' }, // G4
        { midi: 70, onset: 3840, duration: 1860, hand: 'rh' }, // B♭4
        { midi: 56, onset: 5760, duration: 940, hand: 'rh' }, // A♭3
        { midi: 60, onset: 5760, duration: 940, hand: 'rh' }, // C4
        { midi: 67, onset: 5760, duration: 940, hand: 'rh' }, // G4
        { midi: 56, onset: 6720, duration: 940, hand: 'rh' }, // A♭3
        { midi: 60, onset: 6720, duration: 940, hand: 'rh' }, // C4
        { midi: 67, onset: 6720, duration: 940, hand: 'rh' }, // G4
        { midi: 55, onset: 7680, duration: 1860, hand: 'rh' }, // G3
        { midi: 60, onset: 7680, duration: 1860, hand: 'rh' }, // C4
        { midi: 63, onset: 7680, duration: 1860, hand: 'rh' }, // E♭4
        { midi: 55, onset: 9600, duration: 1860, hand: 'rh' }, // G3
        { midi: 60, onset: 9600, duration: 1860, hand: 'rh' }, // C4
        { midi: 63, onset: 9600, duration: 1860, hand: 'rh' }, // E♭4
        { midi: 62, onset: 11520, duration: 1860, hand: 'rh' }, // D4
        { midi: 67, onset: 11520, duration: 1860, hand: 'rh' }, // G4
        { midi: 70, onset: 11520, duration: 1860, hand: 'rh' }, // B♭4
        { midi: 62, onset: 13440, duration: 940, hand: 'rh' }, // D4
        { midi: 67, onset: 13440, duration: 940, hand: 'rh' }, // G4
        { midi: 70, onset: 13440, duration: 940, hand: 'rh' }, // B♭4
        { midi: 65, onset: 14400, duration: 940, hand: 'rh' }, // F4
        { midi: 68, onset: 14400, duration: 940, hand: 'rh' }, // A♭4
        { midi: 74, onset: 14400, duration: 940, hand: 'rh' }, // D5
        { midi: 63, onset: 15360, duration: 1860, hand: 'rh' }, // E♭4
        { midi: 67, onset: 15360, duration: 1860, hand: 'rh' }, // G4
        { midi: 74, onset: 15360, duration: 1860, hand: 'rh' }, // D5
        { midi: 63, onset: 17280, duration: 1860, hand: 'rh' }, // E♭4
        { midi: 67, onset: 17280, duration: 1860, hand: 'rh' }, // G4
        { midi: 74, onset: 17280, duration: 1860, hand: 'rh' }, // D5
        { midi: 62, onset: 19200, duration: 940, hand: 'rh' }, // D4
        { midi: 67, onset: 19200, duration: 940, hand: 'rh' }, // G4
        { midi: 70, onset: 19200, duration: 940, hand: 'rh' }, // B♭4
        { midi: 65, onset: 20160, duration: 940, hand: 'rh' }, // F4
        { midi: 68, onset: 20160, duration: 940, hand: 'rh' }, // A♭4
        { midi: 74, onset: 20160, duration: 940, hand: 'rh' }, // D5
        { midi: 63, onset: 21120, duration: 940, hand: 'rh' }, // E♭4
        { midi: 67, onset: 21120, duration: 940, hand: 'rh' }, // G4
        { midi: 74, onset: 21120, duration: 940, hand: 'rh' }, // D5
        { midi: 63, onset: 22080, duration: 940, hand: 'rh' }, // E♭4
        { midi: 67, onset: 22080, duration: 940, hand: 'rh' }, // G4
        { midi: 74, onset: 22080, duration: 940, hand: 'rh' }, // D5
      ],
    },
    {
      stepNumber: 35,
      module: 'blues_l3',
      section: 'D',
      subsection: 'D3: Comping the Blues Heads',
      activity: 'D3.1: Comp C Jam Blues (Duke Ellington)',
      direction:
        'Duke Ellington’s blues in C: every chord a dominant, so every chord gets the home voicing — left hand 1-♭7, right hand 3-13-1. Read the head from your own book; here you comp the changes.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_tune_c-jam | blues',
      styleRef: 'l3a',
      successFeedback: 'C Jam Blues, comped two-handed.',
      key: 'C major',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'two_hand_comping',
        lh_role: 'chords',
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
        'C13',
        'C13',
        'F13',
        'F13',
        'F13',
        'F13',
        'C13',
        'C13',
        'C13',
        'C13',
        'G13',
        'G13',
        'G13',
        'G13',
        'C13',
        'C13',
        'C13',
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
        { midi: 36, onset: 0, duration: 460, hand: 'lh' }, // C2
        { midi: 46, onset: 0, duration: 460, hand: 'lh' }, // B♭2
        { midi: 36, onset: 1920, duration: 460, hand: 'lh' }, // C2
        { midi: 46, onset: 1920, duration: 460, hand: 'lh' }, // B♭2
        { midi: 36, onset: 3840, duration: 460, hand: 'lh' }, // C2
        { midi: 46, onset: 3840, duration: 460, hand: 'lh' }, // B♭2
        { midi: 36, onset: 5760, duration: 460, hand: 'lh' }, // C2
        { midi: 46, onset: 5760, duration: 460, hand: 'lh' }, // B♭2
        { midi: 41, onset: 7680, duration: 460, hand: 'lh' }, // F2
        { midi: 51, onset: 7680, duration: 460, hand: 'lh' }, // E♭3
        { midi: 41, onset: 9600, duration: 460, hand: 'lh' }, // F2
        { midi: 51, onset: 9600, duration: 460, hand: 'lh' }, // E♭3
        { midi: 36, onset: 11520, duration: 460, hand: 'lh' }, // C2
        { midi: 46, onset: 11520, duration: 460, hand: 'lh' }, // B♭2
        { midi: 36, onset: 13440, duration: 460, hand: 'lh' }, // C2
        { midi: 46, onset: 13440, duration: 460, hand: 'lh' }, // B♭2
        { midi: 43, onset: 15360, duration: 460, hand: 'lh' }, // G2
        { midi: 53, onset: 15360, duration: 460, hand: 'lh' }, // F3
        { midi: 43, onset: 17280, duration: 460, hand: 'lh' }, // G2
        { midi: 53, onset: 17280, duration: 460, hand: 'lh' }, // F3
        { midi: 36, onset: 19200, duration: 460, hand: 'lh' }, // C2
        { midi: 46, onset: 19200, duration: 460, hand: 'lh' }, // B♭2
        { midi: 36, onset: 21120, duration: 460, hand: 'lh' }, // C2
        { midi: 46, onset: 21120, duration: 460, hand: 'lh' }, // B♭2
        { midi: 57, onset: 0, duration: 460, hand: 'rh' }, // A3
        { midi: 60, onset: 0, duration: 460, hand: 'rh' }, // C4
        { midi: 64, onset: 0, duration: 460, hand: 'rh' }, // E4
        { midi: 57, onset: 1920, duration: 460, hand: 'rh' }, // A3
        { midi: 60, onset: 1920, duration: 460, hand: 'rh' }, // C4
        { midi: 64, onset: 1920, duration: 460, hand: 'rh' }, // E4
        { midi: 57, onset: 3840, duration: 460, hand: 'rh' }, // A3
        { midi: 60, onset: 3840, duration: 460, hand: 'rh' }, // C4
        { midi: 64, onset: 3840, duration: 460, hand: 'rh' }, // E4
        { midi: 57, onset: 5760, duration: 460, hand: 'rh' }, // A3
        { midi: 60, onset: 5760, duration: 460, hand: 'rh' }, // C4
        { midi: 64, onset: 5760, duration: 460, hand: 'rh' }, // E4
        { midi: 57, onset: 7680, duration: 460, hand: 'rh' }, // A3
        { midi: 62, onset: 7680, duration: 460, hand: 'rh' }, // D4
        { midi: 65, onset: 7680, duration: 460, hand: 'rh' }, // F4
        { midi: 57, onset: 9600, duration: 460, hand: 'rh' }, // A3
        { midi: 62, onset: 9600, duration: 460, hand: 'rh' }, // D4
        { midi: 65, onset: 9600, duration: 460, hand: 'rh' }, // F4
        { midi: 52, onset: 11520, duration: 460, hand: 'rh' }, // E3
        { midi: 57, onset: 11520, duration: 460, hand: 'rh' }, // A3
        { midi: 60, onset: 11520, duration: 460, hand: 'rh' }, // C4
        { midi: 52, onset: 13440, duration: 460, hand: 'rh' }, // E3
        { midi: 57, onset: 13440, duration: 460, hand: 'rh' }, // A3
        { midi: 60, onset: 13440, duration: 460, hand: 'rh' }, // C4
        { midi: 55, onset: 15360, duration: 460, hand: 'rh' }, // G3
        { midi: 59, onset: 15360, duration: 460, hand: 'rh' }, // B3
        { midi: 64, onset: 15360, duration: 460, hand: 'rh' }, // E4
        { midi: 55, onset: 17280, duration: 460, hand: 'rh' }, // G3
        { midi: 59, onset: 17280, duration: 460, hand: 'rh' }, // B3
        { midi: 64, onset: 17280, duration: 460, hand: 'rh' }, // E4
        { midi: 52, onset: 19200, duration: 460, hand: 'rh' }, // E3
        { midi: 57, onset: 19200, duration: 460, hand: 'rh' }, // A3
        { midi: 60, onset: 19200, duration: 460, hand: 'rh' }, // C4
        { midi: 52, onset: 21120, duration: 460, hand: 'rh' }, // E3
        { midi: 57, onset: 21120, duration: 460, hand: 'rh' }, // A3
        { midi: 60, onset: 21120, duration: 460, hand: 'rh' }, // C4
      ],
    },
    {
      stepNumber: 36,
      module: 'blues_l3',
      section: 'D',
      subsection: 'D3: Comping the Blues Heads',
      activity: 'D3.2: Comp Bags’ Groove (Milt Jackson)',
      direction:
        'Milt Jackson’s blues in F (Blues in the Closet has the same changes): the home voicing on F7 and B♭7, shells and upper structures for Gm7–C7. Read the head from your own book; here you comp the changes.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_tune_bags | blues',
      styleRef: 'l3a',
      successFeedback: 'Bags’ Groove, comped two-handed.',
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
        'Bb13',
        'Bb13',
        'F13',
        'F13',
        'F13',
        'F13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'F13',
        'F13',
        'F13',
        'F13',
        'Gm9',
        'Gm9',
        'C13',
        'C13',
        'F13',
        'F13',
        'C13',
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
        { midi: 46, onset: 1920, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 1920, duration: 460, hand: 'lh' }, // A♭3
        { midi: 41, onset: 3840, duration: 460, hand: 'lh' }, // F2
        { midi: 51, onset: 3840, duration: 460, hand: 'lh' }, // E♭3
        { midi: 41, onset: 5760, duration: 460, hand: 'lh' }, // F2
        { midi: 51, onset: 5760, duration: 460, hand: 'lh' }, // E♭3
        { midi: 46, onset: 7680, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 7680, duration: 460, hand: 'lh' }, // A♭3
        { midi: 46, onset: 9600, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 9600, duration: 460, hand: 'lh' }, // A♭3
        { midi: 41, onset: 11520, duration: 460, hand: 'lh' }, // F2
        { midi: 51, onset: 11520, duration: 460, hand: 'lh' }, // E♭3
        { midi: 41, onset: 13440, duration: 460, hand: 'lh' }, // F2
        { midi: 51, onset: 13440, duration: 460, hand: 'lh' }, // E♭3
        { midi: 43, onset: 15360, duration: 460, hand: 'lh' }, // G2
        { midi: 53, onset: 15360, duration: 460, hand: 'lh' }, // F3
        { midi: 48, onset: 17280, duration: 460, hand: 'lh' }, // C3
        { midi: 52, onset: 17280, duration: 460, hand: 'lh' }, // E3
        { midi: 41, onset: 19200, duration: 460, hand: 'lh' }, // F2
        { midi: 51, onset: 19200, duration: 460, hand: 'lh' }, // E♭3
        { midi: 48, onset: 21120, duration: 460, hand: 'lh' }, // C3
        { midi: 52, onset: 21120, duration: 460, hand: 'lh' }, // E3
        { midi: 62, onset: 0, duration: 460, hand: 'rh' }, // D4
        { midi: 65, onset: 0, duration: 460, hand: 'rh' }, // F4
        { midi: 69, onset: 0, duration: 460, hand: 'rh' }, // A4
        { midi: 62, onset: 1920, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 1920, duration: 460, hand: 'rh' }, // G4
        { midi: 70, onset: 1920, duration: 460, hand: 'rh' }, // B♭4
        { midi: 62, onset: 3840, duration: 460, hand: 'rh' }, // D4
        { midi: 65, onset: 3840, duration: 460, hand: 'rh' }, // F4
        { midi: 69, onset: 3840, duration: 460, hand: 'rh' }, // A4
        { midi: 62, onset: 5760, duration: 460, hand: 'rh' }, // D4
        { midi: 65, onset: 5760, duration: 460, hand: 'rh' }, // F4
        { midi: 69, onset: 5760, duration: 460, hand: 'rh' }, // A4
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
        { midi: 58, onset: 15360, duration: 460, hand: 'rh' }, // B♭3
        { midi: 62, onset: 15360, duration: 460, hand: 'rh' }, // D4
        { midi: 69, onset: 15360, duration: 460, hand: 'rh' }, // A4
        { midi: 58, onset: 17280, duration: 460, hand: 'rh' }, // B♭3
        { midi: 62, onset: 17280, duration: 460, hand: 'rh' }, // D4
        { midi: 69, onset: 17280, duration: 460, hand: 'rh' }, // A4
        { midi: 57, onset: 19200, duration: 460, hand: 'rh' }, // A3
        { midi: 62, onset: 19200, duration: 460, hand: 'rh' }, // D4
        { midi: 65, onset: 19200, duration: 460, hand: 'rh' }, // F4
        { midi: 58, onset: 21120, duration: 460, hand: 'rh' }, // B♭3
        { midi: 62, onset: 21120, duration: 460, hand: 'rh' }, // D4
        { midi: 69, onset: 21120, duration: 460, hand: 'rh' }, // A4
      ],
    },
    {
      stepNumber: 37,
      module: 'blues_l3',
      section: 'D',
      subsection: 'D3: Comping the Blues Heads',
      activity: 'D3.3: Comp Freddie Freeloader (Miles Davis)',
      direction:
        'Miles Davis’s blues in B♭, with A♭7 in its last two bars. Every chord a dominant: the home voicing throughout. Read the head from your own book; here you comp the changes.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_tune_freddie | blues',
      styleRef: 'l3a',
      successFeedback: 'Freddie Freeloader, comped two-handed.',
      key: 'Bb major',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'two_hand_comping',
        lh_role: 'chords',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      chordSymbols: [
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Eb13',
        'Eb13',
        'Eb13',
        'Eb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'F13',
        'F13',
        'Eb13',
        'Eb13',
        'Ab13',
        'Ab13',
        'Ab13',
        'Ab13',
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
        { midi: 46, onset: 0, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 0, duration: 460, hand: 'lh' }, // A♭3
        { midi: 46, onset: 1920, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 1920, duration: 460, hand: 'lh' }, // A♭3
        { midi: 46, onset: 3840, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 3840, duration: 460, hand: 'lh' }, // A♭3
        { midi: 46, onset: 5760, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 5760, duration: 460, hand: 'lh' }, // A♭3
        { midi: 39, onset: 7680, duration: 460, hand: 'lh' }, // E♭2
        { midi: 49, onset: 7680, duration: 460, hand: 'lh' }, // D♭3
        { midi: 39, onset: 9600, duration: 460, hand: 'lh' }, // E♭2
        { midi: 49, onset: 9600, duration: 460, hand: 'lh' }, // D♭3
        { midi: 46, onset: 11520, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 11520, duration: 460, hand: 'lh' }, // A♭3
        { midi: 46, onset: 13440, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 13440, duration: 460, hand: 'lh' }, // A♭3
        { midi: 41, onset: 15360, duration: 460, hand: 'lh' }, // F2
        { midi: 51, onset: 15360, duration: 460, hand: 'lh' }, // E♭3
        { midi: 39, onset: 17280, duration: 460, hand: 'lh' }, // E♭2
        { midi: 49, onset: 17280, duration: 460, hand: 'lh' }, // D♭3
        { midi: 44, onset: 19200, duration: 460, hand: 'lh' }, // A♭2
        { midi: 54, onset: 19200, duration: 460, hand: 'lh' }, // G♭3
        { midi: 44, onset: 21120, duration: 460, hand: 'lh' }, // A♭2
        { midi: 54, onset: 21120, duration: 460, hand: 'lh' }, // G♭3
        { midi: 58, onset: 0, duration: 460, hand: 'rh' }, // B♭3
        { midi: 62, onset: 0, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 0, duration: 460, hand: 'rh' }, // G4
        { midi: 58, onset: 1920, duration: 460, hand: 'rh' }, // B♭3
        { midi: 62, onset: 1920, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 1920, duration: 460, hand: 'rh' }, // G4
        { midi: 58, onset: 3840, duration: 460, hand: 'rh' }, // B♭3
        { midi: 62, onset: 3840, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 3840, duration: 460, hand: 'rh' }, // G4
        { midi: 58, onset: 5760, duration: 460, hand: 'rh' }, // B♭3
        { midi: 62, onset: 5760, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 5760, duration: 460, hand: 'rh' }, // G4
        { midi: 55, onset: 7680, duration: 460, hand: 'rh' }, // G3
        { midi: 60, onset: 7680, duration: 460, hand: 'rh' }, // C4
        { midi: 63, onset: 7680, duration: 460, hand: 'rh' }, // E♭4
        { midi: 55, onset: 9600, duration: 460, hand: 'rh' }, // G3
        { midi: 60, onset: 9600, duration: 460, hand: 'rh' }, // C4
        { midi: 63, onset: 9600, duration: 460, hand: 'rh' }, // E♭4
        { midi: 62, onset: 11520, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 11520, duration: 460, hand: 'rh' }, // G4
        { midi: 70, onset: 11520, duration: 460, hand: 'rh' }, // B♭4
        { midi: 62, onset: 13440, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 13440, duration: 460, hand: 'rh' }, // G4
        { midi: 70, onset: 13440, duration: 460, hand: 'rh' }, // B♭4
        { midi: 57, onset: 15360, duration: 460, hand: 'rh' }, // A3
        { midi: 62, onset: 15360, duration: 460, hand: 'rh' }, // D4
        { midi: 65, onset: 15360, duration: 460, hand: 'rh' }, // F4
        { midi: 60, onset: 17280, duration: 460, hand: 'rh' }, // C4
        { midi: 63, onset: 17280, duration: 460, hand: 'rh' }, // E♭4
        { midi: 67, onset: 17280, duration: 460, hand: 'rh' }, // G4
        { midi: 60, onset: 19200, duration: 460, hand: 'rh' }, // C4
        { midi: 65, onset: 19200, duration: 460, hand: 'rh' }, // F4
        { midi: 68, onset: 19200, duration: 460, hand: 'rh' }, // A♭4
        { midi: 60, onset: 21120, duration: 460, hand: 'rh' }, // C4
        { midi: 65, onset: 21120, duration: 460, hand: 'rh' }, // F4
        { midi: 68, onset: 21120, duration: 460, hand: 'rh' }, // A♭4
      ],
    },
    {
      stepNumber: 38,
      module: 'blues_l3',
      section: 'D',
      subsection: 'D3: Comping the Blues Heads',
      activity: 'D3.4: Comp Blues Five Spot (Thelonious Monk)',
      direction:
        'Monk’s blues in B♭: the quick change, and A♭7 in bar 6. Read the head from your own book; here you comp the changes.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_tune_five-spot | blues',
      styleRef: 'l3a',
      successFeedback: 'Blues Five Spot, comped two-handed.',
      key: 'Bb major',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'two_hand_comping',
        lh_role: 'chords',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      chordSymbols: [
        'Bb13',
        'Bb13',
        'Eb13',
        'Eb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Eb13',
        'Eb13',
        'Ab13',
        'Ab13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'F13',
        'F13',
        'F13',
        'F13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
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
        { midi: 46, onset: 0, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 0, duration: 460, hand: 'lh' }, // A♭3
        { midi: 39, onset: 1920, duration: 460, hand: 'lh' }, // E♭2
        { midi: 49, onset: 1920, duration: 460, hand: 'lh' }, // D♭3
        { midi: 46, onset: 3840, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 3840, duration: 460, hand: 'lh' }, // A♭3
        { midi: 46, onset: 5760, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 5760, duration: 460, hand: 'lh' }, // A♭3
        { midi: 39, onset: 7680, duration: 460, hand: 'lh' }, // E♭2
        { midi: 49, onset: 7680, duration: 460, hand: 'lh' }, // D♭3
        { midi: 44, onset: 9600, duration: 460, hand: 'lh' }, // A♭2
        { midi: 54, onset: 9600, duration: 460, hand: 'lh' }, // G♭3
        { midi: 46, onset: 11520, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 11520, duration: 460, hand: 'lh' }, // A♭3
        { midi: 46, onset: 13440, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 13440, duration: 460, hand: 'lh' }, // A♭3
        { midi: 41, onset: 15360, duration: 460, hand: 'lh' }, // F2
        { midi: 51, onset: 15360, duration: 460, hand: 'lh' }, // E♭3
        { midi: 41, onset: 17280, duration: 460, hand: 'lh' }, // F2
        { midi: 51, onset: 17280, duration: 460, hand: 'lh' }, // E♭3
        { midi: 46, onset: 19200, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 19200, duration: 460, hand: 'lh' }, // A♭3
        { midi: 46, onset: 21120, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 21120, duration: 460, hand: 'lh' }, // A♭3
        { midi: 58, onset: 0, duration: 460, hand: 'rh' }, // B♭3
        { midi: 62, onset: 0, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 0, duration: 460, hand: 'rh' }, // G4
        { midi: 55, onset: 1920, duration: 460, hand: 'rh' }, // G3
        { midi: 60, onset: 1920, duration: 460, hand: 'rh' }, // C4
        { midi: 63, onset: 1920, duration: 460, hand: 'rh' }, // E♭4
        { midi: 58, onset: 3840, duration: 460, hand: 'rh' }, // B♭3
        { midi: 62, onset: 3840, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 3840, duration: 460, hand: 'rh' }, // G4
        { midi: 58, onset: 5760, duration: 460, hand: 'rh' }, // B♭3
        { midi: 62, onset: 5760, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 5760, duration: 460, hand: 'rh' }, // G4
        { midi: 60, onset: 7680, duration: 460, hand: 'rh' }, // C4
        { midi: 63, onset: 7680, duration: 460, hand: 'rh' }, // E♭4
        { midi: 67, onset: 7680, duration: 460, hand: 'rh' }, // G4
        { midi: 60, onset: 9600, duration: 460, hand: 'rh' }, // C4
        { midi: 65, onset: 9600, duration: 460, hand: 'rh' }, // F4
        { midi: 68, onset: 9600, duration: 460, hand: 'rh' }, // A♭4
        { midi: 62, onset: 11520, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 11520, duration: 460, hand: 'rh' }, // G4
        { midi: 70, onset: 11520, duration: 460, hand: 'rh' }, // B♭4
        { midi: 62, onset: 13440, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 13440, duration: 460, hand: 'rh' }, // G4
        { midi: 70, onset: 13440, duration: 460, hand: 'rh' }, // B♭4
        { midi: 62, onset: 15360, duration: 460, hand: 'rh' }, // D4
        { midi: 65, onset: 15360, duration: 460, hand: 'rh' }, // F4
        { midi: 69, onset: 15360, duration: 460, hand: 'rh' }, // A4
        { midi: 62, onset: 17280, duration: 460, hand: 'rh' }, // D4
        { midi: 65, onset: 17280, duration: 460, hand: 'rh' }, // F4
        { midi: 69, onset: 17280, duration: 460, hand: 'rh' }, // A4
        { midi: 62, onset: 19200, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 19200, duration: 460, hand: 'rh' }, // G4
        { midi: 70, onset: 19200, duration: 460, hand: 'rh' }, // B♭4
        { midi: 62, onset: 21120, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 21120, duration: 460, hand: 'rh' }, // G4
        { midi: 70, onset: 21120, duration: 460, hand: 'rh' }, // B♭4
      ],
    },
    {
      stepNumber: 39,
      module: 'blues_l3',
      section: 'D',
      subsection: 'D3: Comping the Blues Heads',
      activity: 'D3.5: Comp Blues by Five (Red Garland)',
      direction:
        'Red Garland’s blues in B♭, with a turnaround: B♭7–G7♭9, Cm7–F7♭9, two chords a bar. Read the head from your own book; here you comp the changes.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_tune_blues-by-five | blues',
      styleRef: 'l3a',
      successFeedback: 'Blues by Five, comped two-handed.',
      key: 'Bb major',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'two_hand_comping',
        lh_role: 'chords',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      chordSymbols: [
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Eb13',
        'Eb13',
        'Eb13',
        'Eb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'F13',
        'F13',
        'F13',
        'F13',
        'Bb13',
        'G7b9',
        'Cm9',
        'F13b9',
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
        { midi: 46, onset: 0, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 0, duration: 460, hand: 'lh' }, // A♭3
        { midi: 46, onset: 1920, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 1920, duration: 460, hand: 'lh' }, // A♭3
        { midi: 46, onset: 3840, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 3840, duration: 460, hand: 'lh' }, // A♭3
        { midi: 46, onset: 5760, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 5760, duration: 460, hand: 'lh' }, // A♭3
        { midi: 39, onset: 7680, duration: 460, hand: 'lh' }, // E♭2
        { midi: 49, onset: 7680, duration: 460, hand: 'lh' }, // D♭3
        { midi: 39, onset: 9600, duration: 460, hand: 'lh' }, // E♭2
        { midi: 49, onset: 9600, duration: 460, hand: 'lh' }, // D♭3
        { midi: 46, onset: 11520, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 11520, duration: 460, hand: 'lh' }, // A♭3
        { midi: 46, onset: 13440, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 13440, duration: 460, hand: 'lh' }, // A♭3
        { midi: 41, onset: 15360, duration: 460, hand: 'lh' }, // F2
        { midi: 51, onset: 15360, duration: 460, hand: 'lh' }, // E♭3
        { midi: 41, onset: 17280, duration: 460, hand: 'lh' }, // F2
        { midi: 51, onset: 17280, duration: 460, hand: 'lh' }, // E♭3
        { midi: 46, onset: 19200, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 19200, duration: 460, hand: 'lh' }, // A♭3
        { midi: 55, onset: 20160, duration: 460, hand: 'lh' }, // G3
        { midi: 59, onset: 20160, duration: 460, hand: 'lh' }, // B3
        { midi: 48, onset: 21120, duration: 460, hand: 'lh' }, // C3
        { midi: 58, onset: 21120, duration: 460, hand: 'lh' }, // B♭3
        { midi: 53, onset: 22080, duration: 460, hand: 'lh' }, // F3
        { midi: 57, onset: 22080, duration: 460, hand: 'lh' }, // A3
        { midi: 58, onset: 0, duration: 460, hand: 'rh' }, // B♭3
        { midi: 62, onset: 0, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 0, duration: 460, hand: 'rh' }, // G4
        { midi: 58, onset: 1920, duration: 460, hand: 'rh' }, // B♭3
        { midi: 62, onset: 1920, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 1920, duration: 460, hand: 'rh' }, // G4
        { midi: 58, onset: 3840, duration: 460, hand: 'rh' }, // B♭3
        { midi: 62, onset: 3840, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 3840, duration: 460, hand: 'rh' }, // G4
        { midi: 58, onset: 5760, duration: 460, hand: 'rh' }, // B♭3
        { midi: 62, onset: 5760, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 5760, duration: 460, hand: 'rh' }, // G4
        { midi: 55, onset: 7680, duration: 460, hand: 'rh' }, // G3
        { midi: 60, onset: 7680, duration: 460, hand: 'rh' }, // C4
        { midi: 63, onset: 7680, duration: 460, hand: 'rh' }, // E♭4
        { midi: 55, onset: 9600, duration: 460, hand: 'rh' }, // G3
        { midi: 60, onset: 9600, duration: 460, hand: 'rh' }, // C4
        { midi: 63, onset: 9600, duration: 460, hand: 'rh' }, // E♭4
        { midi: 62, onset: 11520, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 11520, duration: 460, hand: 'rh' }, // G4
        { midi: 70, onset: 11520, duration: 460, hand: 'rh' }, // B♭4
        { midi: 62, onset: 13440, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 13440, duration: 460, hand: 'rh' }, // G4
        { midi: 70, onset: 13440, duration: 460, hand: 'rh' }, // B♭4
        { midi: 62, onset: 15360, duration: 460, hand: 'rh' }, // D4
        { midi: 65, onset: 15360, duration: 460, hand: 'rh' }, // F4
        { midi: 69, onset: 15360, duration: 460, hand: 'rh' }, // A4
        { midi: 62, onset: 17280, duration: 460, hand: 'rh' }, // D4
        { midi: 65, onset: 17280, duration: 460, hand: 'rh' }, // F4
        { midi: 69, onset: 17280, duration: 460, hand: 'rh' }, // A4
        { midi: 62, onset: 19200, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 19200, duration: 460, hand: 'rh' }, // G4
        { midi: 70, onset: 19200, duration: 460, hand: 'rh' }, // B♭4
        { midi: 65, onset: 20160, duration: 460, hand: 'rh' }, // F4
        { midi: 68, onset: 20160, duration: 460, hand: 'rh' }, // A♭4
        { midi: 74, onset: 20160, duration: 460, hand: 'rh' }, // D5
        { midi: 63, onset: 21120, duration: 460, hand: 'rh' }, // E♭4
        { midi: 67, onset: 21120, duration: 460, hand: 'rh' }, // G4
        { midi: 74, onset: 21120, duration: 460, hand: 'rh' }, // D5
        { midi: 63, onset: 22080, duration: 460, hand: 'rh' }, // E♭4
        { midi: 66, onset: 22080, duration: 460, hand: 'rh' }, // G♭4
        { midi: 74, onset: 22080, duration: 460, hand: 'rh' }, // D5
      ],
    },
    {
      stepNumber: 40,
      module: 'blues_l3',
      section: 'D',
      subsection: 'D3: Comping the Blues Heads',
      activity: 'D3.6: Comp Blue Seven (Sonny Rollins)',
      direction:
        'Sonny Rollins’s blues in B♭: V, IV, then home. Read the head from your own book; here you comp the changes.',
      assessment: 'pitch_order_timing_duration',
      tag: 'blues:l3_tune_blue-seven | blues',
      styleRef: 'l3a',
      successFeedback: 'Blue Seven, comped two-handed.',
      key: 'Bb major',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'two_hand_comping',
        lh_role: 'chords',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      chordSymbols: [
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Eb13',
        'Eb13',
        'Eb13',
        'Eb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'F13',
        'F13',
        'Eb13',
        'Eb13',
        'Bb13',
        'Bb13',
        'Bb13',
        'Bb13',
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
        { midi: 46, onset: 0, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 0, duration: 460, hand: 'lh' }, // A♭3
        { midi: 46, onset: 1920, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 1920, duration: 460, hand: 'lh' }, // A♭3
        { midi: 46, onset: 3840, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 3840, duration: 460, hand: 'lh' }, // A♭3
        { midi: 46, onset: 5760, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 5760, duration: 460, hand: 'lh' }, // A♭3
        { midi: 39, onset: 7680, duration: 460, hand: 'lh' }, // E♭2
        { midi: 49, onset: 7680, duration: 460, hand: 'lh' }, // D♭3
        { midi: 39, onset: 9600, duration: 460, hand: 'lh' }, // E♭2
        { midi: 49, onset: 9600, duration: 460, hand: 'lh' }, // D♭3
        { midi: 46, onset: 11520, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 11520, duration: 460, hand: 'lh' }, // A♭3
        { midi: 46, onset: 13440, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 13440, duration: 460, hand: 'lh' }, // A♭3
        { midi: 41, onset: 15360, duration: 460, hand: 'lh' }, // F2
        { midi: 51, onset: 15360, duration: 460, hand: 'lh' }, // E♭3
        { midi: 39, onset: 17280, duration: 460, hand: 'lh' }, // E♭2
        { midi: 49, onset: 17280, duration: 460, hand: 'lh' }, // D♭3
        { midi: 46, onset: 19200, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 19200, duration: 460, hand: 'lh' }, // A♭3
        { midi: 46, onset: 21120, duration: 460, hand: 'lh' }, // B♭2
        { midi: 56, onset: 21120, duration: 460, hand: 'lh' }, // A♭3
        { midi: 58, onset: 0, duration: 460, hand: 'rh' }, // B♭3
        { midi: 62, onset: 0, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 0, duration: 460, hand: 'rh' }, // G4
        { midi: 58, onset: 1920, duration: 460, hand: 'rh' }, // B♭3
        { midi: 62, onset: 1920, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 1920, duration: 460, hand: 'rh' }, // G4
        { midi: 58, onset: 3840, duration: 460, hand: 'rh' }, // B♭3
        { midi: 62, onset: 3840, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 3840, duration: 460, hand: 'rh' }, // G4
        { midi: 58, onset: 5760, duration: 460, hand: 'rh' }, // B♭3
        { midi: 62, onset: 5760, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 5760, duration: 460, hand: 'rh' }, // G4
        { midi: 55, onset: 7680, duration: 460, hand: 'rh' }, // G3
        { midi: 60, onset: 7680, duration: 460, hand: 'rh' }, // C4
        { midi: 63, onset: 7680, duration: 460, hand: 'rh' }, // E♭4
        { midi: 55, onset: 9600, duration: 460, hand: 'rh' }, // G3
        { midi: 60, onset: 9600, duration: 460, hand: 'rh' }, // C4
        { midi: 63, onset: 9600, duration: 460, hand: 'rh' }, // E♭4
        { midi: 62, onset: 11520, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 11520, duration: 460, hand: 'rh' }, // G4
        { midi: 70, onset: 11520, duration: 460, hand: 'rh' }, // B♭4
        { midi: 62, onset: 13440, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 13440, duration: 460, hand: 'rh' }, // G4
        { midi: 70, onset: 13440, duration: 460, hand: 'rh' }, // B♭4
        { midi: 57, onset: 15360, duration: 460, hand: 'rh' }, // A3
        { midi: 62, onset: 15360, duration: 460, hand: 'rh' }, // D4
        { midi: 65, onset: 15360, duration: 460, hand: 'rh' }, // F4
        { midi: 55, onset: 17280, duration: 460, hand: 'rh' }, // G3
        { midi: 60, onset: 17280, duration: 460, hand: 'rh' }, // C4
        { midi: 63, onset: 17280, duration: 460, hand: 'rh' }, // E♭4
        { midi: 62, onset: 19200, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 19200, duration: 460, hand: 'rh' }, // G4
        { midi: 70, onset: 19200, duration: 460, hand: 'rh' }, // B♭4
        { midi: 62, onset: 21120, duration: 460, hand: 'rh' }, // D4
        { midi: 67, onset: 21120, duration: 460, hand: 'rh' }, // G4
        { midi: 70, onset: 21120, duration: 460, hand: 'rh' }, // B♭4
      ],
    },
  ],
};

export const bluesL1: ActivityFlowV2 = {
  genre: 'blues',
  level: 1,
  version: 'v2',
  title: 'Shuffle Blues',
  params: {
    defaultKey: 'C major',
    defaultScale: [0, 2, 3, 4, 7, 9],
    defaultScaleId: 'major_blues',
    // Steps name their own tempo, swing and meter.
    tempoRange: [90, 100] as [number, number],
    swing: 0,
    grooves: [],
  },
  sections: [
    bluesL1SectionA,
    bluesL1SectionB,
    bluesL1SectionC,
    bluesL1SectionD,
  ],
};

export const bluesL2: ActivityFlowV2 = {
  genre: 'blues',
  level: 2,
  version: 'v2',
  title: 'The 12-Bar Blues',
  params: {
    defaultKey: 'E major',
    defaultScale: [0, 3, 5, 6, 7, 10],
    defaultScaleId: 'minor_blues',
    // Steps name their own tempo, swing and meter.
    tempoRange: [100, 150] as [number, number],
    swing: 0,
    grooves: [],
  },
  sections: [
    bluesL2SectionA,
    bluesL2SectionB,
    bluesL2SectionC,
    bluesL2SectionD,
  ],
};

export const bluesL3: ActivityFlowV2 = {
  genre: 'blues',
  level: 3,
  version: 'v2',
  title: 'Jazz Blues',
  params: {
    defaultKey: 'F major',
    defaultScale: [0, 2, 4, 5, 7, 9, 10],
    defaultScaleId: 'mixolydian',
    // Steps name their own tempo, swing and meter.
    tempoRange: [110, 120] as [number, number],
    swing: 0,
    grooves: [],
  },
  sections: [
    bluesL3SectionA,
    bluesL3SectionB,
    bluesL3SectionC,
    bluesL3SectionD,
  ],
};

export const bluesFlows = [bluesL1, bluesL2, bluesL3] as const;
