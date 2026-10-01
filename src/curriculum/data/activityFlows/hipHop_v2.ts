/**
 * Hip Hop v2 — Activity Flows.
 *
 * L1 "Trap" (C minor): authored from the signed-off outline,
 * docs/genre-activities/hiphop-L1-outline.md (ledger D-054). Play-along
 * patterns are named per step (grooveId + backing_style) from
 * engine/genreGeneration/hipHop/hipHopPatterns.ts.
 *
 * L2 "Boom Bap" (A minor) and L3 "Conscious" (E minor): from
 * hiphop-L2-outline.md and hiphop-L3-outline.md, signed off 2026-09-30.
 */

import type {
  ActivityFlowV2,
  ActivitySectionV2,
} from '../../types/activity.v2';

// ── L1 Section A: Melody ──────────────────────────────────────────────────

const hipHopL1SectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    {
      stepNumber: 1,
      module: 'hiphop_l1',
      section: 'A',
      subsection: 'A1: Scale (C Minor Pentatonic)',
      activity: 'A1.1: C Minor Pentatonic Ascending (Out of Time)',
      direction:
        'Play the C minor pentatonic scale up, one note at a time: C–E♭–F–G–B♭–C.',
      assessment: 'pitch_order',
      tag: 'hiphop:l1_pent_asc_oot | hiphop',
      styleRef: 'l1a',
      successFeedback:
        'Five notes, no wrong ones — the sound of the trap melody.',
      scaleIntervals: [0, 3, 5, 7, 10],
      scaleId: 'minor_pentatonic',
      targetNotes: [
        { midi: 60, onset: 0, duration: 460 }, // C4
        { midi: 63, onset: 480, duration: 460 }, // E♭4
        { midi: 65, onset: 960, duration: 460 }, // F4
        { midi: 67, onset: 1440, duration: 460 }, // G4
        { midi: 70, onset: 1920, duration: 460 }, // B♭4
        { midi: 72, onset: 2400, duration: 460 }, // C5
      ],
    },
    {
      stepNumber: 2,
      module: 'hiphop_l1',
      section: 'A',
      subsection: 'A1: Scale (C Minor Pentatonic)',
      activity: 'A1.2: C Minor Pentatonic Descending (Out of Time)',
      direction: 'Now play it back down from the high C.',
      assessment: 'pitch_order',
      tag: 'hiphop:l1_pent_desc_oot | hiphop',
      styleRef: 'l1a',
      successFeedback: 'Down the scale — same five notes, new direction.',
      scaleIntervals: [0, 3, 5, 7, 10],
      scaleId: 'minor_pentatonic',
      targetNotes: [
        { midi: 72, onset: 0, duration: 460 }, // C5
        { midi: 70, onset: 480, duration: 460 }, // B♭4
        { midi: 67, onset: 960, duration: 460 }, // G4
        { midi: 65, onset: 1440, duration: 460 }, // F4
        { midi: 63, onset: 1920, duration: 460 }, // E♭4
        { midi: 60, onset: 2400, duration: 460 }, // C4
      ],
    },
    {
      stepNumber: 3,
      module: 'hiphop_l1',
      section: 'A',
      subsection: 'A1: Scale (C Minor Pentatonic)',
      activity: 'A1.3: C Minor Pentatonic — Up & Down (In Time)',
      direction: 'Up and back down, one note per beat. Stay with the click.',
      assessment: 'pitch_order_timing',
      tag: 'hiphop:l1_pent_updown_it | hiphop',
      styleRef: 'l1a',
      successFeedback: 'Up and down in time — the scale is yours.',
      scaleIntervals: [0, 3, 5, 7, 10],
      scaleId: 'minor_pentatonic',
      targetNotes: [
        { midi: 60, onset: 0, duration: 460 }, // C4
        { midi: 63, onset: 480, duration: 460 }, // E♭4
        { midi: 65, onset: 960, duration: 460 }, // F4
        { midi: 67, onset: 1440, duration: 460 }, // G4
        { midi: 70, onset: 1920, duration: 460 }, // B♭4
        { midi: 72, onset: 2400, duration: 460 }, // C5
        { midi: 70, onset: 2880, duration: 460 }, // B♭4
        { midi: 67, onset: 3360, duration: 460 }, // G4
        { midi: 65, onset: 3840, duration: 460 }, // F4
        { midi: 63, onset: 4320, duration: 460 }, // E♭4
        { midi: 60, onset: 4800, duration: 460 }, // C4
      ],
    },
    {
      stepNumber: 4,
      module: 'hiphop_l1',
      section: 'A',
      subsection: 'A2: Pentatonic Trap Melodies',
      activity: 'A2.1: 3-Note Trap Melody',
      direction:
        'Play this three-note melody over the trap beat: G, B♭, then land on C.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l1_pent_melody_3note | hiphop',
      styleRef: 'l1a',
      successFeedback: 'G, B♭, home to C — that rise sits right on the 808.',
      scaleIntervals: [0, 3, 5, 7, 10],
      scaleId: 'minor_pentatonic',
      chordSymbols: ['Cm'],
      grooveId: 'trap_a',
      backing_style: {
        kit: '808',
        bassVoice: '808',
        bassPattern: 'trap_foundation',
        comping: 'held',
        chordRegister: 60,
      },
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 67, onset: 0, duration: 700 }, // G4
        { midi: 70, onset: 720, duration: 700 }, // B♭4
        { midi: 72, onset: 1440, duration: 1380 }, // C5
      ],
    },
    {
      stepNumber: 5,
      module: 'hiphop_l1',
      section: 'A',
      subsection: 'A2: Pentatonic Trap Melodies',
      activity: 'A2.2: 5-Note Trap Melody',
      direction:
        'A longer phrase: C, E♭, F, back to E♭, and resolve on C. Let bar 2 breathe.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l1_pent_melody_5note | hiphop',
      styleRef: 'l1a',
      successFeedback: 'Up and back home — a real trap hook.',
      scaleIntervals: [0, 3, 5, 7, 10],
      scaleId: 'minor_pentatonic',
      chordSymbols: ['Cm'],
      grooveId: 'trap_a',
      backing_style: {
        kit: '808',
        bassVoice: '808',
        bassPattern: 'trap_foundation',
        comping: 'held',
        chordRegister: 60,
      },
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 72, onset: 0, duration: 440 }, // C5
        { midi: 75, onset: 720, duration: 220 }, // E♭5
        { midi: 77, onset: 960, duration: 220 }, // F5
        { midi: 75, onset: 1200, duration: 440 }, // E♭5
        { midi: 72, onset: 1680, duration: 1300 }, // C5
      ],
    },
    {
      stepNumber: 6,
      module: 'hiphop_l1',
      section: 'A',
      subsection: 'A3: Scale (C Aeolian)',
      activity: 'A3.1: C Aeolian Ascending (Out of Time)',
      direction:
        'Play the C natural minor (Aeolian) scale up: C–D–E♭–F–G–A♭–B♭–C.',
      assessment: 'pitch_order',
      tag: 'hiphop:l1_aeolian_asc_oot | hiphop',
      styleRef: 'l1a',
      successFeedback: 'Seven notes — A♭ is the dark one.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
      scaleId: 'aeolian',
      targetNotes: [
        { midi: 60, onset: 0, duration: 460 }, // C4
        { midi: 62, onset: 480, duration: 460 }, // D4
        { midi: 63, onset: 960, duration: 460 }, // E♭4
        { midi: 65, onset: 1440, duration: 460 }, // F4
        { midi: 67, onset: 1920, duration: 460 }, // G4
        { midi: 68, onset: 2400, duration: 460 }, // A♭4
        { midi: 70, onset: 2880, duration: 460 }, // B♭4
        { midi: 72, onset: 3360, duration: 460 }, // C5
      ],
    },
    {
      stepNumber: 7,
      module: 'hiphop_l1',
      section: 'A',
      subsection: 'A3: Scale (C Aeolian)',
      activity: 'A3.2: C Aeolian Descending (Out of Time)',
      direction: 'Now back down from the high C.',
      assessment: 'pitch_order',
      tag: 'hiphop:l1_aeolian_desc_oot | hiphop',
      styleRef: 'l1a',
      successFeedback: 'Down through A♭ to G — hear that pull?',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
      scaleId: 'aeolian',
      targetNotes: [
        { midi: 72, onset: 0, duration: 460 }, // C5
        { midi: 70, onset: 480, duration: 460 }, // B♭4
        { midi: 68, onset: 960, duration: 460 }, // A♭4
        { midi: 67, onset: 1440, duration: 460 }, // G4
        { midi: 65, onset: 1920, duration: 460 }, // F4
        { midi: 63, onset: 2400, duration: 460 }, // E♭4
        { midi: 62, onset: 2880, duration: 460 }, // D4
        { midi: 60, onset: 3360, duration: 460 }, // C4
      ],
    },
    {
      stepNumber: 8,
      module: 'hiphop_l1',
      section: 'A',
      subsection: 'A3: Scale (C Aeolian)',
      activity: 'A3.3: C Aeolian — Up & Down (In Time)',
      direction: 'Up and back down, one note per beat.',
      assessment: 'pitch_order_timing',
      tag: 'hiphop:l1_aeolian_updown_it | hiphop',
      styleRef: 'l1a',
      successFeedback: 'The full minor scale, in time.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
      scaleId: 'aeolian',
      targetNotes: [
        { midi: 60, onset: 0, duration: 460 }, // C4
        { midi: 62, onset: 480, duration: 460 }, // D4
        { midi: 63, onset: 960, duration: 460 }, // E♭4
        { midi: 65, onset: 1440, duration: 460 }, // F4
        { midi: 67, onset: 1920, duration: 460 }, // G4
        { midi: 68, onset: 2400, duration: 460 }, // A♭4
        { midi: 70, onset: 2880, duration: 460 }, // B♭4
        { midi: 72, onset: 3360, duration: 460 }, // C5
        { midi: 70, onset: 3840, duration: 460 }, // B♭4
        { midi: 68, onset: 4320, duration: 460 }, // A♭4
        { midi: 67, onset: 4800, duration: 460 }, // G4
        { midi: 65, onset: 5280, duration: 460 }, // F4
        { midi: 63, onset: 5760, duration: 460 }, // E♭4
        { midi: 62, onset: 6240, duration: 460 }, // D4
        { midi: 60, onset: 6720, duration: 460 }, // C4
      ],
    },
    {
      stepNumber: 9,
      module: 'hiphop_l1',
      section: 'A',
      subsection: 'A4: Aeolian Trap Melodies',
      activity: 'A4.1: ♭6 → 5 Trap Melody',
      direction:
        'C, then A♭ falling to G — the same ♭6 to 5 move the bass makes.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l1_aeolian_melody_b6_5 | hiphop',
      styleRef: 'l1a',
      successFeedback: 'A♭ down to G — the darkest move in trap.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
      scaleId: 'aeolian',
      chordSymbols: ['Cm'],
      grooveId: 'trap_a',
      backing_style: {
        kit: '808',
        bassVoice: '808',
        bassPattern: 'trap_foundation',
        comping: 'held',
        chordRegister: 60,
      },
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 72, onset: 0, duration: 700 }, // C5
        { midi: 68, onset: 720, duration: 700 }, // A♭4
        { midi: 67, onset: 1440, duration: 1380 }, // G4
      ],
    },
    {
      stepNumber: 10,
      module: 'hiphop_l1',
      section: 'A',
      subsection: 'A4: Aeolian Trap Melodies',
      activity: 'A4.2: 6-Note Aeolian Melody',
      direction: 'Two bars: E♭, D, C — then A♭, G, and home to C.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l1_aeolian_melody_6note | hiphop',
      styleRef: 'l1a',
      successFeedback: 'Two bars of minor melody, right in the pocket.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
      scaleId: 'aeolian',
      chordSymbols: ['Cm'],
      grooveId: 'trap_a',
      backing_style: {
        kit: '808',
        bassVoice: '808',
        bassPattern: 'trap_foundation',
        comping: 'held',
        chordRegister: 60,
      },
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 75, onset: 0, duration: 700 }, // E♭5
        { midi: 74, onset: 720, duration: 700 }, // D5
        { midi: 72, onset: 1440, duration: 440 }, // C5
        { midi: 68, onset: 1920, duration: 700 }, // A♭4
        { midi: 67, onset: 2640, duration: 700 }, // G4
        { midi: 72, onset: 3360, duration: 460 }, // C5
      ],
    },
  ],
};

// ── L1 Section B: Chords ──────────────────────────────────────────────────

const hipHopL1SectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    {
      stepNumber: 11,
      module: 'hiphop_l1',
      section: 'B',
      subsection: 'B1: Root Position',
      activity: 'B1.1: Arpeggiate 1 min — Cm Root Position (Out of Time)',
      direction: 'Play the notes of C minor one at a time, up: C–E♭–G.',
      assessment: 'pitch_order',
      tag: 'hiphop:l1_cm_root_arp | hiphop',
      styleRef: 'l1a',
      successFeedback: 'Root, third, fifth — C minor from the bottom.',
      chordSymbols: ['Cm'],
      scaleIntervals: [0, 3, 7],
      targetNotes: [
        { midi: 72, onset: 0, duration: 460 }, // C5
        { midi: 75, onset: 480, duration: 460 }, // E♭5
        { midi: 79, onset: 960, duration: 460 }, // G5
      ],
    },
    {
      stepNumber: 12,
      module: 'hiphop_l1',
      section: 'B',
      subsection: 'B1: Root Position',
      activity: 'B1.2: Cm Root Position — Quarter-Note Chunking (In Time)',
      direction: 'Play the C minor chord on every beat, four times.',
      assessment: 'pitch_order_timing',
      tag: 'hiphop:l1_cm_root_chunk_q | hiphop',
      styleRef: 'l1a',
      successFeedback: 'Four in a row, right on the beat.',
      chordSymbols: ['Cm'],
      targetNotes: [
        { midi: 72, onset: 0, duration: 440 }, // C5
        { midi: 75, onset: 0, duration: 440 }, // E♭5
        { midi: 79, onset: 0, duration: 440 }, // G5
        { midi: 72, onset: 480, duration: 440 }, // C5
        { midi: 75, onset: 480, duration: 440 }, // E♭5
        { midi: 79, onset: 480, duration: 440 }, // G5
        { midi: 72, onset: 960, duration: 440 }, // C5
        { midi: 75, onset: 960, duration: 440 }, // E♭5
        { midi: 79, onset: 960, duration: 440 }, // G5
        { midi: 72, onset: 1440, duration: 440 }, // C5
        { midi: 75, onset: 1440, duration: 440 }, // E♭5
        { midi: 79, onset: 1440, duration: 440 }, // G5
      ],
    },
    {
      stepNumber: 13,
      module: 'hiphop_l1',
      section: 'B',
      subsection: 'B1: Root Position',
      activity: 'B1.3: 4 min — Fm Root Position (Out of Time)',
      direction: 'Arpeggiate F minor up — F–A♭–C — then play it as a chord.',
      assessment: 'pitch_only',
      tag: 'hiphop:l1_fm_root | hiphop',
      styleRef: 'l1a',
      successFeedback: 'F minor — the 4 min chord in C minor.',
      chordSymbols: ['Fm'],
      targetNotes: [
        { midi: 77, onset: 0, duration: 460 }, // F5
        { midi: 80, onset: 480, duration: 460 }, // A♭5
        { midi: 84, onset: 960, duration: 460 }, // C6
        { midi: 77, onset: 1440, duration: 900 }, // F5
        { midi: 80, onset: 1440, duration: 900 }, // A♭5
        { midi: 84, onset: 1440, duration: 900 }, // C6
      ],
    },
    {
      stepNumber: 14,
      module: 'hiphop_l1',
      section: 'B',
      subsection: 'B1: Root Position',
      activity: 'B1.4: 5 maj — G Root Position (Out of Time)',
      direction: 'Arpeggiate G major up — G–B–D — then play it as a chord.',
      assessment: 'pitch_only',
      tag: 'hiphop:l1_g_root | hiphop',
      styleRef: 'l1a',
      successFeedback: 'G major — B is the note that pulls back to C.',
      chordSymbols: ['G'],
      targetNotes: [
        { midi: 67, onset: 0, duration: 460 }, // G4
        { midi: 71, onset: 480, duration: 460 }, // B4
        { midi: 74, onset: 960, duration: 460 }, // D5
        { midi: 67, onset: 1440, duration: 900 }, // G4
        { midi: 71, onset: 1440, duration: 900 }, // B4
        { midi: 74, onset: 1440, duration: 900 }, // D5
      ],
    },
    {
      stepNumber: 15,
      module: 'hiphop_l1',
      section: 'B',
      subsection: 'B1: Root Position',
      activity: 'B1.5: Play-Along — Cm – Fm (Root Position)',
      direction: 'Hold each chord for the whole bar: Cm, Cm, Fm, Fm.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l1_playalong_cm_fm_root | hiphop',
      styleRef: 'l1a',
      successFeedback: 'Whole notes over the 808 — that is the trap pad sound.',
      chordSymbols: ['Cm', 'Cm', 'Fm', 'Fm'],
      grooveId: 'trap_b',
      backing_style: { kit: '808', bassVoice: '808', bassPattern: '808_slide' },
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 72, onset: 0, duration: 1860 }, // C5
        { midi: 75, onset: 0, duration: 1860 }, // E♭5
        { midi: 79, onset: 0, duration: 1860 }, // G5
        { midi: 72, onset: 1920, duration: 1860 }, // C5
        { midi: 75, onset: 1920, duration: 1860 }, // E♭5
        { midi: 79, onset: 1920, duration: 1860 }, // G5
        { midi: 77, onset: 3840, duration: 1860 }, // F5
        { midi: 80, onset: 3840, duration: 1860 }, // A♭5
        { midi: 84, onset: 3840, duration: 1860 }, // C6
        { midi: 77, onset: 5760, duration: 1860 }, // F5
        { midi: 80, onset: 5760, duration: 1860 }, // A♭5
        { midi: 84, onset: 5760, duration: 1860 }, // C6
      ],
    },
    {
      stepNumber: 16,
      module: 'hiphop_l1',
      section: 'B',
      subsection: 'B1: Root Position',
      activity: 'B1.6: Play-Along — Cm – G (Root Position)',
      direction:
        'Bar 1 holds the chord; bar 2 hits it on 1, the "a" of 1, 3 and the "a" of 3.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l1_playalong_cm_g_root | hiphop',
      styleRef: 'l1a',
      successFeedback: 'Long, then syncopated — the trap two-bar comp.',
      chordSymbols: ['Cm', 'Cm', 'G', 'G'],
      grooveId: 'trap_b',
      backing_style: {
        kit: '808',
        bassVoice: '808',
        bassPattern: '808_staccato',
      },
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 72, onset: 0, duration: 1860 }, // C5
        { midi: 75, onset: 0, duration: 1860 }, // E♭5
        { midi: 79, onset: 0, duration: 1860 }, // G5
        { midi: 72, onset: 1920, duration: 200 }, // C5
        { midi: 75, onset: 1920, duration: 200 }, // E♭5
        { midi: 79, onset: 1920, duration: 200 }, // G5
        { midi: 72, onset: 2280, duration: 200 }, // C5
        { midi: 75, onset: 2280, duration: 200 }, // E♭5
        { midi: 79, onset: 2280, duration: 200 }, // G5
        { midi: 72, onset: 2880, duration: 200 }, // C5
        { midi: 75, onset: 2880, duration: 200 }, // E♭5
        { midi: 79, onset: 2880, duration: 200 }, // G5
        { midi: 72, onset: 3240, duration: 200 }, // C5
        { midi: 75, onset: 3240, duration: 200 }, // E♭5
        { midi: 79, onset: 3240, duration: 200 }, // G5
        { midi: 67, onset: 3840, duration: 1860 }, // G4
        { midi: 71, onset: 3840, duration: 1860 }, // B4
        { midi: 74, onset: 3840, duration: 1860 }, // D5
        { midi: 67, onset: 5760, duration: 200 }, // G4
        { midi: 71, onset: 5760, duration: 200 }, // B4
        { midi: 74, onset: 5760, duration: 200 }, // D5
        { midi: 67, onset: 6120, duration: 200 }, // G4
        { midi: 71, onset: 6120, duration: 200 }, // B4
        { midi: 74, onset: 6120, duration: 200 }, // D5
        { midi: 67, onset: 6720, duration: 200 }, // G4
        { midi: 71, onset: 6720, duration: 200 }, // B4
        { midi: 74, onset: 6720, duration: 200 }, // D5
        { midi: 67, onset: 7080, duration: 200 }, // G4
        { midi: 71, onset: 7080, duration: 200 }, // B4
        { midi: 74, onset: 7080, duration: 200 }, // D5
      ],
    },
    {
      stepNumber: 17,
      module: 'hiphop_l1',
      section: 'B',
      subsection: 'B2: 1st Inversion',
      activity: 'B2.1: Cm 1st Inversion (Out of Time)',
      direction:
        'Move the C to the top: E♭–G–C. Arpeggiate it, then play the chord.',
      assessment: 'pitch_only',
      tag: 'hiphop:l1_cm_inv1 | hiphop',
      styleRef: 'l1a',
      successFeedback: 'C minor, 1st inversion — same notes, new shape.',
      chordSymbols: ['Cm'],
      targetNotes: [
        { midi: 75, onset: 0, duration: 460 }, // E♭5
        { midi: 79, onset: 480, duration: 460 }, // G5
        { midi: 84, onset: 960, duration: 460 }, // C6
        { midi: 75, onset: 1440, duration: 900 }, // E♭5
        { midi: 79, onset: 1440, duration: 900 }, // G5
        { midi: 84, onset: 1440, duration: 900 }, // C6
      ],
    },
    {
      stepNumber: 18,
      module: 'hiphop_l1',
      section: 'B',
      subsection: 'B2: 1st Inversion',
      activity: 'B2.2: Cm 1st Inversion ↔ Fm Root (Out of Time)',
      direction:
        'Go back and forth: E♭–G–C to F–A♭–C. Keep C on top — only two fingers move.',
      assessment: 'pitch_only',
      tag: 'hiphop:l1_pair_cm1_fm | hiphop',
      styleRef: 'l1a',
      successFeedback: 'The C never moved — that is voice leading.',
      chordSymbols: ['Cm', 'Fm', 'Cm', 'Fm'],
      targetNotes: [
        { midi: 75, onset: 0, duration: 1860 }, // E♭5
        { midi: 79, onset: 0, duration: 1860 }, // G5
        { midi: 84, onset: 0, duration: 1860 }, // C6
        { midi: 77, onset: 1920, duration: 1860 }, // F5
        { midi: 80, onset: 1920, duration: 1860 }, // A♭5
        { midi: 84, onset: 1920, duration: 1860 }, // C6
        { midi: 75, onset: 3840, duration: 1860 }, // E♭5
        { midi: 79, onset: 3840, duration: 1860 }, // G5
        { midi: 84, onset: 3840, duration: 1860 }, // C6
        { midi: 77, onset: 5760, duration: 1860 }, // F5
        { midi: 80, onset: 5760, duration: 1860 }, // A♭5
        { midi: 84, onset: 5760, duration: 1860 }, // C6
      ],
    },
    {
      stepNumber: 19,
      module: 'hiphop_l1',
      section: 'B',
      subsection: 'B2: 1st Inversion',
      activity: 'B2.3: G 1st Inversion (Out of Time)',
      direction:
        'Move the G to the top: B–D–G. Arpeggiate it, then play the chord.',
      assessment: 'pitch_only',
      tag: 'hiphop:l1_g_inv1 | hiphop',
      styleRef: 'l1a',
      successFeedback: 'G major, 1st inversion — B on the bottom.',
      chordSymbols: ['G'],
      targetNotes: [
        { midi: 71, onset: 0, duration: 460 }, // B4
        { midi: 74, onset: 480, duration: 460 }, // D5
        { midi: 79, onset: 960, duration: 460 }, // G5
        { midi: 71, onset: 1440, duration: 900 }, // B4
        { midi: 74, onset: 1440, duration: 900 }, // D5
        { midi: 79, onset: 1440, duration: 900 }, // G5
      ],
    },
    {
      stepNumber: 20,
      module: 'hiphop_l1',
      section: 'B',
      subsection: 'B2: 1st Inversion',
      activity: 'B2.4: Cm Root ↔ G 1st Inversion (Out of Time)',
      direction: 'Go back and forth: C–E♭–G to B–D–G. Keep G on top.',
      assessment: 'pitch_only',
      tag: 'hiphop:l1_pair_cm_g1 | hiphop',
      styleRef: 'l1a',
      successFeedback: 'G stays put while C and E♭ step down — smooth.',
      chordSymbols: ['Cm', 'G', 'Cm', 'G'],
      targetNotes: [
        { midi: 72, onset: 0, duration: 1860 }, // C5
        { midi: 75, onset: 0, duration: 1860 }, // E♭5
        { midi: 79, onset: 0, duration: 1860 }, // G5
        { midi: 71, onset: 1920, duration: 1860 }, // B4
        { midi: 74, onset: 1920, duration: 1860 }, // D5
        { midi: 79, onset: 1920, duration: 1860 }, // G5
        { midi: 72, onset: 3840, duration: 1860 }, // C5
        { midi: 75, onset: 3840, duration: 1860 }, // E♭5
        { midi: 79, onset: 3840, duration: 1860 }, // G5
        { midi: 71, onset: 5760, duration: 1860 }, // B4
        { midi: 74, onset: 5760, duration: 1860 }, // D5
        { midi: 79, onset: 5760, duration: 1860 }, // G5
      ],
    },
    {
      stepNumber: 21,
      module: 'hiphop_l1',
      section: 'B',
      subsection: 'B3: Two-Chord Jams',
      activity: 'B3.1: Jam — Cm 1st Inversion ↔ Fm',
      direction: 'One bar each, held. Let the 808 do the moving.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l1_jam_cm1_fm | hiphop',
      styleRef: 'l1a',
      successFeedback: 'Two chords, one common tone, all groove.',
      chordSymbols: ['Cm', 'Fm', 'Cm', 'Fm'],
      grooveId: 'trap_a',
      backing_style: {
        kit: '808',
        bassVoice: '808',
        bassPattern: 'follow_kick',
      },
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 75, onset: 0, duration: 1860 }, // E♭5
        { midi: 79, onset: 0, duration: 1860 }, // G5
        { midi: 84, onset: 0, duration: 1860 }, // C6
        { midi: 77, onset: 1920, duration: 1860 }, // F5
        { midi: 80, onset: 1920, duration: 1860 }, // A♭5
        { midi: 84, onset: 1920, duration: 1860 }, // C6
        { midi: 75, onset: 3840, duration: 1860 }, // E♭5
        { midi: 79, onset: 3840, duration: 1860 }, // G5
        { midi: 84, onset: 3840, duration: 1860 }, // C6
        { midi: 77, onset: 5760, duration: 1860 }, // F5
        { midi: 80, onset: 5760, duration: 1860 }, // A♭5
        { midi: 84, onset: 5760, duration: 1860 }, // C6
      ],
    },
    {
      stepNumber: 22,
      module: 'hiphop_l1',
      section: 'B',
      subsection: 'B3: Two-Chord Jams',
      activity: 'B3.2: Jam — Cm ↔ G 1st Inversion',
      direction: 'One bar each, 8th notes, short and detached (staccato).',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l1_jam_cm_g1 | hiphop',
      styleRef: 'l1a',
      successFeedback: 'Staccato 8ths over trap — tight.',
      chordSymbols: ['Cm', 'G', 'Cm', 'G'],
      grooveId: 'trap_a',
      backing_style: { kit: '808', bassVoice: '808', bassPattern: '808_slide' },
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 72, onset: 0, duration: 90 }, // C5
        { midi: 75, onset: 0, duration: 90 }, // E♭5
        { midi: 79, onset: 0, duration: 90 }, // G5
        { midi: 72, onset: 240, duration: 90 }, // C5
        { midi: 75, onset: 240, duration: 90 }, // E♭5
        { midi: 79, onset: 240, duration: 90 }, // G5
        { midi: 72, onset: 480, duration: 90 }, // C5
        { midi: 75, onset: 480, duration: 90 }, // E♭5
        { midi: 79, onset: 480, duration: 90 }, // G5
        { midi: 72, onset: 720, duration: 90 }, // C5
        { midi: 75, onset: 720, duration: 90 }, // E♭5
        { midi: 79, onset: 720, duration: 90 }, // G5
        { midi: 72, onset: 960, duration: 90 }, // C5
        { midi: 75, onset: 960, duration: 90 }, // E♭5
        { midi: 79, onset: 960, duration: 90 }, // G5
        { midi: 72, onset: 1200, duration: 90 }, // C5
        { midi: 75, onset: 1200, duration: 90 }, // E♭5
        { midi: 79, onset: 1200, duration: 90 }, // G5
        { midi: 72, onset: 1440, duration: 90 }, // C5
        { midi: 75, onset: 1440, duration: 90 }, // E♭5
        { midi: 79, onset: 1440, duration: 90 }, // G5
        { midi: 72, onset: 1680, duration: 90 }, // C5
        { midi: 75, onset: 1680, duration: 90 }, // E♭5
        { midi: 79, onset: 1680, duration: 90 }, // G5
        { midi: 71, onset: 1920, duration: 90 }, // B4
        { midi: 74, onset: 1920, duration: 90 }, // D5
        { midi: 79, onset: 1920, duration: 90 }, // G5
        { midi: 71, onset: 2160, duration: 90 }, // B4
        { midi: 74, onset: 2160, duration: 90 }, // D5
        { midi: 79, onset: 2160, duration: 90 }, // G5
        { midi: 71, onset: 2400, duration: 90 }, // B4
        { midi: 74, onset: 2400, duration: 90 }, // D5
        { midi: 79, onset: 2400, duration: 90 }, // G5
        { midi: 71, onset: 2640, duration: 90 }, // B4
        { midi: 74, onset: 2640, duration: 90 }, // D5
        { midi: 79, onset: 2640, duration: 90 }, // G5
        { midi: 71, onset: 2880, duration: 90 }, // B4
        { midi: 74, onset: 2880, duration: 90 }, // D5
        { midi: 79, onset: 2880, duration: 90 }, // G5
        { midi: 71, onset: 3120, duration: 90 }, // B4
        { midi: 74, onset: 3120, duration: 90 }, // D5
        { midi: 79, onset: 3120, duration: 90 }, // G5
        { midi: 71, onset: 3360, duration: 90 }, // B4
        { midi: 74, onset: 3360, duration: 90 }, // D5
        { midi: 79, onset: 3360, duration: 90 }, // G5
        { midi: 71, onset: 3600, duration: 90 }, // B4
        { midi: 74, onset: 3600, duration: 90 }, // D5
        { midi: 79, onset: 3600, duration: 90 }, // G5
        { midi: 72, onset: 3840, duration: 90 }, // C5
        { midi: 75, onset: 3840, duration: 90 }, // E♭5
        { midi: 79, onset: 3840, duration: 90 }, // G5
        { midi: 72, onset: 4080, duration: 90 }, // C5
        { midi: 75, onset: 4080, duration: 90 }, // E♭5
        { midi: 79, onset: 4080, duration: 90 }, // G5
        { midi: 72, onset: 4320, duration: 90 }, // C5
        { midi: 75, onset: 4320, duration: 90 }, // E♭5
        { midi: 79, onset: 4320, duration: 90 }, // G5
        { midi: 72, onset: 4560, duration: 90 }, // C5
        { midi: 75, onset: 4560, duration: 90 }, // E♭5
        { midi: 79, onset: 4560, duration: 90 }, // G5
        { midi: 72, onset: 4800, duration: 90 }, // C5
        { midi: 75, onset: 4800, duration: 90 }, // E♭5
        { midi: 79, onset: 4800, duration: 90 }, // G5
        { midi: 72, onset: 5040, duration: 90 }, // C5
        { midi: 75, onset: 5040, duration: 90 }, // E♭5
        { midi: 79, onset: 5040, duration: 90 }, // G5
        { midi: 72, onset: 5280, duration: 90 }, // C5
        { midi: 75, onset: 5280, duration: 90 }, // E♭5
        { midi: 79, onset: 5280, duration: 90 }, // G5
        { midi: 72, onset: 5520, duration: 90 }, // C5
        { midi: 75, onset: 5520, duration: 90 }, // E♭5
        { midi: 79, onset: 5520, duration: 90 }, // G5
        { midi: 71, onset: 5760, duration: 90 }, // B4
        { midi: 74, onset: 5760, duration: 90 }, // D5
        { midi: 79, onset: 5760, duration: 90 }, // G5
        { midi: 71, onset: 6000, duration: 90 }, // B4
        { midi: 74, onset: 6000, duration: 90 }, // D5
        { midi: 79, onset: 6000, duration: 90 }, // G5
        { midi: 71, onset: 6240, duration: 90 }, // B4
        { midi: 74, onset: 6240, duration: 90 }, // D5
        { midi: 79, onset: 6240, duration: 90 }, // G5
        { midi: 71, onset: 6480, duration: 90 }, // B4
        { midi: 74, onset: 6480, duration: 90 }, // D5
        { midi: 79, onset: 6480, duration: 90 }, // G5
        { midi: 71, onset: 6720, duration: 90 }, // B4
        { midi: 74, onset: 6720, duration: 90 }, // D5
        { midi: 79, onset: 6720, duration: 90 }, // G5
        { midi: 71, onset: 6960, duration: 90 }, // B4
        { midi: 74, onset: 6960, duration: 90 }, // D5
        { midi: 79, onset: 6960, duration: 90 }, // G5
        { midi: 71, onset: 7200, duration: 90 }, // B4
        { midi: 74, onset: 7200, duration: 90 }, // D5
        { midi: 79, onset: 7200, duration: 90 }, // G5
        { midi: 71, onset: 7440, duration: 90 }, // B4
        { midi: 74, onset: 7440, duration: 90 }, // D5
        { midi: 79, onset: 7440, duration: 90 }, // G5
      ],
    },
  ],
};

// ── L1 Section C: Bass ──────────────────────────────────────────────────

const hipHopL1SectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 23,
      module: 'hiphop_l1',
      section: 'C',
      subsection: 'C1: The Trap Bass Pattern',
      activity: 'C1.1: Trap Rhythm — One Note',
      direction:
        'Play C on beat 1 and again on the "and" of 3. Just the rhythm first.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l1_bass_rhythm_one_note | hiphop',
      styleRef: 'l1a',
      successFeedback: 'That is the trap bass rhythm.',
      chordSymbols: ['Cm'],
      grooveId: 'trap_a',
      backing_style: {
        kit: '808',
        bassVoice: '808',
        comping: 'held',
        chordRegister: 72,
      },
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 36, onset: 0, duration: 1150 }, // C2
        { midi: 36, onset: 1200, duration: 700 }, // C2
        { midi: 36, onset: 1920, duration: 1150 }, // C2
        { midi: 36, onset: 3120, duration: 700 }, // C2
      ],
    },
    {
      stepNumber: 24,
      module: 'hiphop_l1',
      section: 'C',
      subsection: 'C1: The Trap Bass Pattern',
      activity: 'C1.2: Trap Foundation — Root and 5',
      direction: 'Same rhythm, but the second note moves up to G, the 5.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l1_bass_foundation | hiphop',
      styleRef: 'l1a',
      successFeedback: 'Root on 1, the 5 on the "and" of 3 — the foundation.',
      chordSymbols: ['Cm'],
      grooveId: 'trap_a',
      backing_style: {
        kit: '808',
        bassVoice: '808',
        comping: 'held',
        chordRegister: 72,
      },
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 36, onset: 0, duration: 1150 }, // C2
        { midi: 43, onset: 1200, duration: 700 }, // G2
        { midi: 36, onset: 1920, duration: 1150 }, // C2
        { midi: 43, onset: 3120, duration: 700 }, // G2
      ],
    },
    {
      stepNumber: 25,
      module: 'hiphop_l1',
      section: 'C',
      subsection: 'C1: The Trap Bass Pattern',
      activity: 'C1.3: Expansion in Bar 2 — 5 to ♭7',
      direction: 'Bar 2 splits the G into two dotted 8ths: G, then B♭.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l1_bass_expand_b7 | hiphop',
      styleRef: 'l1a',
      successFeedback:
        'One bar plain, one bar moving — that is how trap breathes.',
      chordSymbols: ['Cm'],
      grooveId: 'trap_a',
      backing_style: {
        kit: '808',
        bassVoice: '808',
        comping: 'held',
        chordRegister: 72,
      },
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 36, onset: 0, duration: 1150 }, // C2
        { midi: 43, onset: 1200, duration: 700 }, // G2
        { midi: 36, onset: 1920, duration: 1150 }, // C2
        { midi: 43, onset: 3120, duration: 340 }, // G2
        { midi: 46, onset: 3480, duration: 340 }, // B♭2
      ],
    },
    {
      stepNumber: 26,
      module: 'hiphop_l1',
      section: 'C',
      subsection: 'C1: The Trap Bass Pattern',
      activity: 'C1.4: Expansion in Bar 1 — 5 to ♭3',
      direction:
        'Now the move comes first: bar 1 goes G, then E♭. Bar 2 is the foundation.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l1_bass_expand_b3 | hiphop',
      styleRef: 'l1a',
      successFeedback: 'The expansion up front — never both bars.',
      chordSymbols: ['Cm'],
      grooveId: 'trap_a',
      backing_style: {
        kit: '808',
        bassVoice: '808',
        comping: 'held',
        chordRegister: 72,
      },
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 36, onset: 0, duration: 1150 }, // C2
        { midi: 43, onset: 1200, duration: 340 }, // G2
        { midi: 39, onset: 1560, duration: 340 }, // E♭2
        { midi: 36, onset: 1920, duration: 1150 }, // C2
        { midi: 43, onset: 3120, duration: 700 }, // G2
      ],
    },
    {
      stepNumber: 27,
      module: 'hiphop_l1',
      section: 'C',
      subsection: 'C1: The Trap Bass Pattern',
      activity: 'C1.5: Aeolian Expansion — ♭6 to 5',
      direction: 'The Aeolian version: bar 2 goes A♭, then G.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l1_bass_expand_aeolian | hiphop',
      styleRef: 'l1a',
      successFeedback: 'A♭ to G — the dark trap move.',
      chordSymbols: ['Cm'],
      scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
      scaleId: 'aeolian',
      grooveId: 'trap_a',
      backing_style: {
        kit: '808',
        bassVoice: '808',
        comping: 'held',
        chordRegister: 72,
      },
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 36, onset: 0, duration: 1150 }, // C2
        { midi: 43, onset: 1200, duration: 700 }, // G2
        { midi: 36, onset: 1920, duration: 1150 }, // C2
        { midi: 44, onset: 3120, duration: 340 }, // A♭2
        { midi: 43, onset: 3480, duration: 340 }, // G2
      ],
    },
    {
      stepNumber: 28,
      module: 'hiphop_l1',
      section: 'C',
      subsection: 'C2: Bass Play-Along',
      activity: 'C2.1: Bass Play-Along — Cm – Fm',
      direction:
        'The foundation under each chord: C and G for Cm, F and C for Fm.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l1_bass_playalong_cm_fm | hiphop',
      styleRef: 'l1a',
      successFeedback: 'Following the chords — real bass playing.',
      chordSymbols: ['Cm', 'Cm', 'Fm', 'Fm'],
      grooveId: 'trap_b',
      backing_style: {
        kit: '808',
        bassVoice: '808',
        comping: 'held',
        chordRegister: 72,
      },
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 36, onset: 0, duration: 1150 }, // C2
        { midi: 43, onset: 1200, duration: 700 }, // G2
        { midi: 36, onset: 1920, duration: 1150 }, // C2
        { midi: 43, onset: 3120, duration: 700 }, // G2
        { midi: 41, onset: 3840, duration: 1150 }, // F2
        { midi: 48, onset: 5040, duration: 700 }, // C3
        { midi: 41, onset: 5760, duration: 1150 }, // F2
        { midi: 48, onset: 6960, duration: 700 }, // C3
      ],
    },
  ],
};

// ── L1 Section D: Performance ──────────────────────────────────────────────────

const hipHopL1SectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 29,
      module: 'hiphop_l1',
      section: 'D',
      subsection: 'D1: Cm Vamp',
      activity: 'D1.1: Cm Vamp — Whole Notes',
      direction:
        'Left hand plays the trap foundation (C and G); right hand holds C minor.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l1_perf_vamp_whole | hiphop',
      styleRef: 'l1a',
      successFeedback: 'Both hands, one groove.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1a',
      },
      chordSymbols: ['Cm'],
      grooveId: 'trap_a',
      backing_style: { kit: '808', bassVoice: '808' },
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 48, onset: 0, duration: 1150, hand: 'lh' }, // C3
        { midi: 55, onset: 1200, duration: 700, hand: 'lh' }, // G3
        { midi: 48, onset: 1920, duration: 1150, hand: 'lh' }, // C3
        { midi: 55, onset: 3120, duration: 700, hand: 'lh' }, // G3
        { midi: 72, onset: 0, duration: 1860, hand: 'rh' }, // C5
        { midi: 75, onset: 0, duration: 1860, hand: 'rh' }, // E♭5
        { midi: 79, onset: 0, duration: 1860, hand: 'rh' }, // G5
        { midi: 72, onset: 1920, duration: 1860, hand: 'rh' }, // C5
        { midi: 75, onset: 1920, duration: 1860, hand: 'rh' }, // E♭5
        { midi: 79, onset: 1920, duration: 1860, hand: 'rh' }, // G5
      ],
    },
    {
      stepNumber: 30,
      module: 'hiphop_l1',
      section: 'D',
      subsection: 'D1: Cm Vamp',
      activity: 'D1.2: Cm Vamp — 8th-Note Chunking',
      direction:
        'Same left hand. Right hand plays C minor an octave up, in short 8th notes.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l1_perf_vamp_eighths | hiphop',
      styleRef: 'l1a',
      successFeedback: 'High, short and tight — the trap keys sound.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1a',
      },
      chordSymbols: ['Cm'],
      grooveId: 'trap_a',
      backing_style: { kit: '808', bassVoice: '808' },
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 48, onset: 0, duration: 1150, hand: 'lh' }, // C3
        { midi: 55, onset: 1200, duration: 700, hand: 'lh' }, // G3
        { midi: 48, onset: 1920, duration: 1150, hand: 'lh' }, // C3
        { midi: 55, onset: 3120, duration: 700, hand: 'lh' }, // G3
        { midi: 84, onset: 0, duration: 90, hand: 'rh' }, // C6
        { midi: 87, onset: 0, duration: 90, hand: 'rh' }, // E♭6
        { midi: 91, onset: 0, duration: 90, hand: 'rh' }, // G6
        { midi: 84, onset: 240, duration: 90, hand: 'rh' }, // C6
        { midi: 87, onset: 240, duration: 90, hand: 'rh' }, // E♭6
        { midi: 91, onset: 240, duration: 90, hand: 'rh' }, // G6
        { midi: 84, onset: 480, duration: 90, hand: 'rh' }, // C6
        { midi: 87, onset: 480, duration: 90, hand: 'rh' }, // E♭6
        { midi: 91, onset: 480, duration: 90, hand: 'rh' }, // G6
        { midi: 84, onset: 720, duration: 90, hand: 'rh' }, // C6
        { midi: 87, onset: 720, duration: 90, hand: 'rh' }, // E♭6
        { midi: 91, onset: 720, duration: 90, hand: 'rh' }, // G6
        { midi: 84, onset: 960, duration: 90, hand: 'rh' }, // C6
        { midi: 87, onset: 960, duration: 90, hand: 'rh' }, // E♭6
        { midi: 91, onset: 960, duration: 90, hand: 'rh' }, // G6
        { midi: 84, onset: 1200, duration: 90, hand: 'rh' }, // C6
        { midi: 87, onset: 1200, duration: 90, hand: 'rh' }, // E♭6
        { midi: 91, onset: 1200, duration: 90, hand: 'rh' }, // G6
        { midi: 84, onset: 1440, duration: 90, hand: 'rh' }, // C6
        { midi: 87, onset: 1440, duration: 90, hand: 'rh' }, // E♭6
        { midi: 91, onset: 1440, duration: 90, hand: 'rh' }, // G6
        { midi: 84, onset: 1680, duration: 90, hand: 'rh' }, // C6
        { midi: 87, onset: 1680, duration: 90, hand: 'rh' }, // E♭6
        { midi: 91, onset: 1680, duration: 90, hand: 'rh' }, // G6
        { midi: 84, onset: 1920, duration: 90, hand: 'rh' }, // C6
        { midi: 87, onset: 1920, duration: 90, hand: 'rh' }, // E♭6
        { midi: 91, onset: 1920, duration: 90, hand: 'rh' }, // G6
        { midi: 84, onset: 2160, duration: 90, hand: 'rh' }, // C6
        { midi: 87, onset: 2160, duration: 90, hand: 'rh' }, // E♭6
        { midi: 91, onset: 2160, duration: 90, hand: 'rh' }, // G6
        { midi: 84, onset: 2400, duration: 90, hand: 'rh' }, // C6
        { midi: 87, onset: 2400, duration: 90, hand: 'rh' }, // E♭6
        { midi: 91, onset: 2400, duration: 90, hand: 'rh' }, // G6
        { midi: 84, onset: 2640, duration: 90, hand: 'rh' }, // C6
        { midi: 87, onset: 2640, duration: 90, hand: 'rh' }, // E♭6
        { midi: 91, onset: 2640, duration: 90, hand: 'rh' }, // G6
        { midi: 84, onset: 2880, duration: 90, hand: 'rh' }, // C6
        { midi: 87, onset: 2880, duration: 90, hand: 'rh' }, // E♭6
        { midi: 91, onset: 2880, duration: 90, hand: 'rh' }, // G6
        { midi: 84, onset: 3120, duration: 90, hand: 'rh' }, // C6
        { midi: 87, onset: 3120, duration: 90, hand: 'rh' }, // E♭6
        { midi: 91, onset: 3120, duration: 90, hand: 'rh' }, // G6
        { midi: 84, onset: 3360, duration: 90, hand: 'rh' }, // C6
        { midi: 87, onset: 3360, duration: 90, hand: 'rh' }, // E♭6
        { midi: 91, onset: 3360, duration: 90, hand: 'rh' }, // G6
        { midi: 84, onset: 3600, duration: 90, hand: 'rh' }, // C6
        { midi: 87, onset: 3600, duration: 90, hand: 'rh' }, // E♭6
        { midi: 91, onset: 3600, duration: 90, hand: 'rh' }, // G6
      ],
    },
    {
      stepNumber: 31,
      module: 'hiphop_l1',
      section: 'D',
      subsection: 'D2: Inversion Jams',
      activity: 'D2.1: Jam — Cm 1st Inversion ↔ Fm',
      direction:
        'Left hand plays the roots, C and F. Right hand holds the inversion pair.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l1_perf_jam_cm1_fm | hiphop',
      styleRef: 'l1a',
      successFeedback: 'Bass and voice leading together.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1a',
      },
      chordSymbols: ['Cm', 'Fm', 'Cm', 'Fm'],
      grooveId: 'trap_a',
      backing_style: { kit: '808', bassVoice: '808' },
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 48, onset: 0, duration: 1860, hand: 'lh' }, // C3
        { midi: 41, onset: 1920, duration: 1860, hand: 'lh' }, // F2
        { midi: 48, onset: 3840, duration: 1860, hand: 'lh' }, // C3
        { midi: 41, onset: 5760, duration: 1860, hand: 'lh' }, // F2
        { midi: 75, onset: 0, duration: 1860, hand: 'rh' }, // E♭5
        { midi: 79, onset: 0, duration: 1860, hand: 'rh' }, // G5
        { midi: 84, onset: 0, duration: 1860, hand: 'rh' }, // C6
        { midi: 77, onset: 1920, duration: 1860, hand: 'rh' }, // F5
        { midi: 80, onset: 1920, duration: 1860, hand: 'rh' }, // A♭5
        { midi: 84, onset: 1920, duration: 1860, hand: 'rh' }, // C6
        { midi: 75, onset: 3840, duration: 1860, hand: 'rh' }, // E♭5
        { midi: 79, onset: 3840, duration: 1860, hand: 'rh' }, // G5
        { midi: 84, onset: 3840, duration: 1860, hand: 'rh' }, // C6
        { midi: 77, onset: 5760, duration: 1860, hand: 'rh' }, // F5
        { midi: 80, onset: 5760, duration: 1860, hand: 'rh' }, // A♭5
        { midi: 84, onset: 5760, duration: 1860, hand: 'rh' }, // C6
      ],
    },
    {
      stepNumber: 32,
      module: 'hiphop_l1',
      section: 'D',
      subsection: 'D2: Inversion Jams',
      activity: 'D2.2: Jam — Cm ↔ G 1st Inversion',
      direction: 'Left hand plays C and G. Right hand plays staccato 8ths.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l1_perf_jam_cm_g1 | hiphop',
      styleRef: 'l1a',
      successFeedback: 'That is a full trap keys part.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1a',
      },
      chordSymbols: ['Cm', 'G', 'Cm', 'G'],
      grooveId: 'trap_a',
      backing_style: { kit: '808', bassVoice: '808' },
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 48, onset: 0, duration: 1860, hand: 'lh' }, // C3
        { midi: 43, onset: 1920, duration: 1860, hand: 'lh' }, // G2
        { midi: 48, onset: 3840, duration: 1860, hand: 'lh' }, // C3
        { midi: 43, onset: 5760, duration: 1860, hand: 'lh' }, // G2
        { midi: 72, onset: 0, duration: 90, hand: 'rh' }, // C5
        { midi: 75, onset: 0, duration: 90, hand: 'rh' }, // E♭5
        { midi: 79, onset: 0, duration: 90, hand: 'rh' }, // G5
        { midi: 72, onset: 240, duration: 90, hand: 'rh' }, // C5
        { midi: 75, onset: 240, duration: 90, hand: 'rh' }, // E♭5
        { midi: 79, onset: 240, duration: 90, hand: 'rh' }, // G5
        { midi: 72, onset: 480, duration: 90, hand: 'rh' }, // C5
        { midi: 75, onset: 480, duration: 90, hand: 'rh' }, // E♭5
        { midi: 79, onset: 480, duration: 90, hand: 'rh' }, // G5
        { midi: 72, onset: 720, duration: 90, hand: 'rh' }, // C5
        { midi: 75, onset: 720, duration: 90, hand: 'rh' }, // E♭5
        { midi: 79, onset: 720, duration: 90, hand: 'rh' }, // G5
        { midi: 72, onset: 960, duration: 90, hand: 'rh' }, // C5
        { midi: 75, onset: 960, duration: 90, hand: 'rh' }, // E♭5
        { midi: 79, onset: 960, duration: 90, hand: 'rh' }, // G5
        { midi: 72, onset: 1200, duration: 90, hand: 'rh' }, // C5
        { midi: 75, onset: 1200, duration: 90, hand: 'rh' }, // E♭5
        { midi: 79, onset: 1200, duration: 90, hand: 'rh' }, // G5
        { midi: 72, onset: 1440, duration: 90, hand: 'rh' }, // C5
        { midi: 75, onset: 1440, duration: 90, hand: 'rh' }, // E♭5
        { midi: 79, onset: 1440, duration: 90, hand: 'rh' }, // G5
        { midi: 72, onset: 1680, duration: 90, hand: 'rh' }, // C5
        { midi: 75, onset: 1680, duration: 90, hand: 'rh' }, // E♭5
        { midi: 79, onset: 1680, duration: 90, hand: 'rh' }, // G5
        { midi: 71, onset: 1920, duration: 90, hand: 'rh' }, // B4
        { midi: 74, onset: 1920, duration: 90, hand: 'rh' }, // D5
        { midi: 79, onset: 1920, duration: 90, hand: 'rh' }, // G5
        { midi: 71, onset: 2160, duration: 90, hand: 'rh' }, // B4
        { midi: 74, onset: 2160, duration: 90, hand: 'rh' }, // D5
        { midi: 79, onset: 2160, duration: 90, hand: 'rh' }, // G5
        { midi: 71, onset: 2400, duration: 90, hand: 'rh' }, // B4
        { midi: 74, onset: 2400, duration: 90, hand: 'rh' }, // D5
        { midi: 79, onset: 2400, duration: 90, hand: 'rh' }, // G5
        { midi: 71, onset: 2640, duration: 90, hand: 'rh' }, // B4
        { midi: 74, onset: 2640, duration: 90, hand: 'rh' }, // D5
        { midi: 79, onset: 2640, duration: 90, hand: 'rh' }, // G5
        { midi: 71, onset: 2880, duration: 90, hand: 'rh' }, // B4
        { midi: 74, onset: 2880, duration: 90, hand: 'rh' }, // D5
        { midi: 79, onset: 2880, duration: 90, hand: 'rh' }, // G5
        { midi: 71, onset: 3120, duration: 90, hand: 'rh' }, // B4
        { midi: 74, onset: 3120, duration: 90, hand: 'rh' }, // D5
        { midi: 79, onset: 3120, duration: 90, hand: 'rh' }, // G5
        { midi: 71, onset: 3360, duration: 90, hand: 'rh' }, // B4
        { midi: 74, onset: 3360, duration: 90, hand: 'rh' }, // D5
        { midi: 79, onset: 3360, duration: 90, hand: 'rh' }, // G5
        { midi: 71, onset: 3600, duration: 90, hand: 'rh' }, // B4
        { midi: 74, onset: 3600, duration: 90, hand: 'rh' }, // D5
        { midi: 79, onset: 3600, duration: 90, hand: 'rh' }, // G5
        { midi: 72, onset: 3840, duration: 90, hand: 'rh' }, // C5
        { midi: 75, onset: 3840, duration: 90, hand: 'rh' }, // E♭5
        { midi: 79, onset: 3840, duration: 90, hand: 'rh' }, // G5
        { midi: 72, onset: 4080, duration: 90, hand: 'rh' }, // C5
        { midi: 75, onset: 4080, duration: 90, hand: 'rh' }, // E♭5
        { midi: 79, onset: 4080, duration: 90, hand: 'rh' }, // G5
        { midi: 72, onset: 4320, duration: 90, hand: 'rh' }, // C5
        { midi: 75, onset: 4320, duration: 90, hand: 'rh' }, // E♭5
        { midi: 79, onset: 4320, duration: 90, hand: 'rh' }, // G5
        { midi: 72, onset: 4560, duration: 90, hand: 'rh' }, // C5
        { midi: 75, onset: 4560, duration: 90, hand: 'rh' }, // E♭5
        { midi: 79, onset: 4560, duration: 90, hand: 'rh' }, // G5
        { midi: 72, onset: 4800, duration: 90, hand: 'rh' }, // C5
        { midi: 75, onset: 4800, duration: 90, hand: 'rh' }, // E♭5
        { midi: 79, onset: 4800, duration: 90, hand: 'rh' }, // G5
        { midi: 72, onset: 5040, duration: 90, hand: 'rh' }, // C5
        { midi: 75, onset: 5040, duration: 90, hand: 'rh' }, // E♭5
        { midi: 79, onset: 5040, duration: 90, hand: 'rh' }, // G5
        { midi: 72, onset: 5280, duration: 90, hand: 'rh' }, // C5
        { midi: 75, onset: 5280, duration: 90, hand: 'rh' }, // E♭5
        { midi: 79, onset: 5280, duration: 90, hand: 'rh' }, // G5
        { midi: 72, onset: 5520, duration: 90, hand: 'rh' }, // C5
        { midi: 75, onset: 5520, duration: 90, hand: 'rh' }, // E♭5
        { midi: 79, onset: 5520, duration: 90, hand: 'rh' }, // G5
        { midi: 71, onset: 5760, duration: 90, hand: 'rh' }, // B4
        { midi: 74, onset: 5760, duration: 90, hand: 'rh' }, // D5
        { midi: 79, onset: 5760, duration: 90, hand: 'rh' }, // G5
        { midi: 71, onset: 6000, duration: 90, hand: 'rh' }, // B4
        { midi: 74, onset: 6000, duration: 90, hand: 'rh' }, // D5
        { midi: 79, onset: 6000, duration: 90, hand: 'rh' }, // G5
        { midi: 71, onset: 6240, duration: 90, hand: 'rh' }, // B4
        { midi: 74, onset: 6240, duration: 90, hand: 'rh' }, // D5
        { midi: 79, onset: 6240, duration: 90, hand: 'rh' }, // G5
        { midi: 71, onset: 6480, duration: 90, hand: 'rh' }, // B4
        { midi: 74, onset: 6480, duration: 90, hand: 'rh' }, // D5
        { midi: 79, onset: 6480, duration: 90, hand: 'rh' }, // G5
        { midi: 71, onset: 6720, duration: 90, hand: 'rh' }, // B4
        { midi: 74, onset: 6720, duration: 90, hand: 'rh' }, // D5
        { midi: 79, onset: 6720, duration: 90, hand: 'rh' }, // G5
        { midi: 71, onset: 6960, duration: 90, hand: 'rh' }, // B4
        { midi: 74, onset: 6960, duration: 90, hand: 'rh' }, // D5
        { midi: 79, onset: 6960, duration: 90, hand: 'rh' }, // G5
        { midi: 71, onset: 7200, duration: 90, hand: 'rh' }, // B4
        { midi: 74, onset: 7200, duration: 90, hand: 'rh' }, // D5
        { midi: 79, onset: 7200, duration: 90, hand: 'rh' }, // G5
        { midi: 71, onset: 7440, duration: 90, hand: 'rh' }, // B4
        { midi: 74, onset: 7440, duration: 90, hand: 'rh' }, // D5
        { midi: 79, onset: 7440, duration: 90, hand: 'rh' }, // G5
      ],
    },
  ],
};

// ── L2 Section A: Melody ──────────────────────────────────────────────────

const hipHopL2SectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    {
      stepNumber: 1,
      module: 'hiphop_l2',
      section: 'A',
      subsection: 'A1: Scale (A Minor Blues)',
      activity: 'A1.1: A Minor Blues Ascending (Out of Time)',
      direction: 'Play the A minor blues scale up: A–C–D–E♭–E–G–A.',
      assessment: 'pitch_order',
      tag: 'hiphop:l2_blues_asc_oot | hiphop',
      styleRef: 'l2a',
      successFeedback: 'E♭ is the blue note — the ♭5.',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      targetNotes: [
        { midi: 69, onset: 0, duration: 460 }, // A4
        { midi: 72, onset: 480, duration: 460 }, // C5
        { midi: 74, onset: 960, duration: 460 }, // D5
        { midi: 75, onset: 1440, duration: 460 }, // D♯5
        { midi: 76, onset: 1920, duration: 460 }, // E5
        { midi: 79, onset: 2400, duration: 460 }, // G5
        { midi: 81, onset: 2880, duration: 460 }, // A5
      ],
    },
    {
      stepNumber: 2,
      module: 'hiphop_l2',
      section: 'A',
      subsection: 'A1: Scale (A Minor Blues)',
      activity: 'A1.2: A Minor Blues Descending (Out of Time)',
      direction: 'Now back down from the high A.',
      assessment: 'pitch_order',
      tag: 'hiphop:l2_blues_desc_oot | hiphop',
      styleRef: 'l2a',
      successFeedback: 'Down through the blue note — hear it slide.',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      targetNotes: [
        { midi: 81, onset: 0, duration: 460 }, // A5
        { midi: 79, onset: 480, duration: 460 }, // G5
        { midi: 76, onset: 960, duration: 460 }, // E5
        { midi: 75, onset: 1440, duration: 460 }, // D♯5
        { midi: 74, onset: 1920, duration: 460 }, // D5
        { midi: 72, onset: 2400, duration: 460 }, // C5
        { midi: 69, onset: 2880, duration: 460 }, // A4
      ],
    },
    {
      stepNumber: 3,
      module: 'hiphop_l2',
      section: 'A',
      subsection: 'A1: Scale (A Minor Blues)',
      activity: 'A1.3: A Minor Blues — Up & Down (In Time)',
      direction: 'Up and back down, one note per beat.',
      assessment: 'pitch_order_timing',
      tag: 'hiphop:l2_blues_updown_it | hiphop',
      styleRef: 'l2a',
      successFeedback: 'The blues scale, in time.',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      targetNotes: [
        { midi: 69, onset: 0, duration: 460 }, // A4
        { midi: 72, onset: 480, duration: 460 }, // C5
        { midi: 74, onset: 960, duration: 460 }, // D5
        { midi: 75, onset: 1440, duration: 460 }, // D♯5
        { midi: 76, onset: 1920, duration: 460 }, // E5
        { midi: 79, onset: 2400, duration: 460 }, // G5
        { midi: 81, onset: 2880, duration: 460 }, // A5
        { midi: 79, onset: 3360, duration: 460 }, // G5
        { midi: 76, onset: 3840, duration: 460 }, // E5
        { midi: 75, onset: 4320, duration: 460 }, // D♯5
        { midi: 74, onset: 4800, duration: 460 }, // D5
        { midi: 72, onset: 5280, duration: 460 }, // C5
        { midi: 69, onset: 5760, duration: 460 }, // A4
      ],
    },
    {
      stepNumber: 4,
      module: 'hiphop_l2',
      section: 'A',
      subsection: 'A2: Blues Phrases',
      activity: 'A2.1: Blues Phrase — Sliding Down',
      direction: 'E, E♭, D, C — the ♭5 sliding down — and land on A in bar 2.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l2_blues_phrase_slide | hiphop',
      styleRef: 'l2a',
      successFeedback: 'That E♭ is pure boom bap soul.',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      chordSymbols: ['Am'],
      tempo: 90,
      grooveId: 'boombap_a',
      backing_style: {
        kit: 'house',
        bassVoice: 'finger',
        bassPattern: 'follow_kick',
        comping: 'held',
        chordRegister: 84,
      },
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 76, onset: 0, duration: 700 }, // E5
        { midi: 75, onset: 720, duration: 220 }, // D♯5
        { midi: 74, onset: 960, duration: 460 }, // D5
        { midi: 72, onset: 1440, duration: 460 }, // C5
        { midi: 69, onset: 1920, duration: 1380 }, // A4
      ],
    },
    {
      stepNumber: 5,
      module: 'hiphop_l2',
      section: 'A',
      subsection: 'A2: Blues Phrases',
      activity: 'A2.2: Call & Answer',
      direction:
        'Bar 1 calls: A, C, D. Bar 2 answers up the blues scale and settles on E.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l2_blues_call_answer | hiphop',
      styleRef: 'l2a',
      successFeedback: 'Call, answer — a conversation in two bars.',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      chordSymbols: ['Am'],
      tempo: 90,
      grooveId: 'boombap_a',
      backing_style: {
        kit: 'house',
        bassVoice: 'finger',
        bassPattern: 'follow_kick',
        comping: 'held',
        chordRegister: 84,
      },
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 69, onset: 0, duration: 220 }, // A4
        { midi: 72, onset: 240, duration: 700 }, // C5
        { midi: 74, onset: 960, duration: 900 }, // D5
        { midi: 75, onset: 1920, duration: 220 }, // D♯5
        { midi: 76, onset: 2160, duration: 220 }, // E5
        { midi: 79, onset: 2400, duration: 220 }, // G5
        { midi: 81, onset: 2640, duration: 220 }, // A5
        { midi: 76, onset: 2880, duration: 900 }, // E5
      ],
    },
    {
      stepNumber: 6,
      module: 'hiphop_l2',
      section: 'A',
      subsection: 'A3: Scale (A Dorian)',
      activity: 'A3.1: A Dorian Ascending (Out of Time)',
      direction: 'Play A Dorian up: A–B–C–D–E–F♯–G–A.',
      assessment: 'pitch_order',
      tag: 'hiphop:l2_dorian_asc_oot | hiphop',
      styleRef: 'l2a',
      successFeedback: 'F♯ — the bright 6 inside a minor key.',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      targetNotes: [
        { midi: 69, onset: 0, duration: 460 }, // A4
        { midi: 71, onset: 480, duration: 460 }, // B4
        { midi: 72, onset: 960, duration: 460 }, // C5
        { midi: 74, onset: 1440, duration: 460 }, // D5
        { midi: 76, onset: 1920, duration: 460 }, // E5
        { midi: 78, onset: 2400, duration: 460 }, // F♯5
        { midi: 79, onset: 2880, duration: 460 }, // G5
        { midi: 81, onset: 3360, duration: 460 }, // A5
      ],
    },
    {
      stepNumber: 7,
      module: 'hiphop_l2',
      section: 'A',
      subsection: 'A3: Scale (A Dorian)',
      activity: 'A3.2: A Dorian Descending (Out of Time)',
      direction: 'Now back down.',
      assessment: 'pitch_order',
      tag: 'hiphop:l2_dorian_desc_oot | hiphop',
      styleRef: 'l2a',
      successFeedback: 'Down through F♯ — that is the Dorian colour.',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      targetNotes: [
        { midi: 81, onset: 0, duration: 460 }, // A5
        { midi: 79, onset: 480, duration: 460 }, // G5
        { midi: 78, onset: 960, duration: 460 }, // F♯5
        { midi: 76, onset: 1440, duration: 460 }, // E5
        { midi: 74, onset: 1920, duration: 460 }, // D5
        { midi: 72, onset: 2400, duration: 460 }, // C5
        { midi: 71, onset: 2880, duration: 460 }, // B4
        { midi: 69, onset: 3360, duration: 460 }, // A4
      ],
    },
    {
      stepNumber: 8,
      module: 'hiphop_l2',
      section: 'A',
      subsection: 'A3: Scale (A Dorian)',
      activity: 'A3.3: A Dorian — Up & Down (In Time)',
      direction: 'Up and back down, one note per beat.',
      assessment: 'pitch_order_timing',
      tag: 'hiphop:l2_dorian_updown_it | hiphop',
      styleRef: 'l2a',
      successFeedback: 'Dorian, in time.',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      targetNotes: [
        { midi: 69, onset: 0, duration: 460 }, // A4
        { midi: 71, onset: 480, duration: 460 }, // B4
        { midi: 72, onset: 960, duration: 460 }, // C5
        { midi: 74, onset: 1440, duration: 460 }, // D5
        { midi: 76, onset: 1920, duration: 460 }, // E5
        { midi: 78, onset: 2400, duration: 460 }, // F♯5
        { midi: 79, onset: 2880, duration: 460 }, // G5
        { midi: 81, onset: 3360, duration: 460 }, // A5
        { midi: 79, onset: 3840, duration: 460 }, // G5
        { midi: 78, onset: 4320, duration: 460 }, // F♯5
        { midi: 76, onset: 4800, duration: 460 }, // E5
        { midi: 74, onset: 5280, duration: 460 }, // D5
        { midi: 72, onset: 5760, duration: 460 }, // C5
        { midi: 71, onset: 6240, duration: 460 }, // B4
        { midi: 69, onset: 6720, duration: 460 }, // A4
      ],
    },
    {
      stepNumber: 9,
      module: 'hiphop_l2',
      section: 'A',
      subsection: 'A4: Dorian Phrases',
      activity: 'A4.1: Dorian Phrase — Up to the 6',
      direction: 'C, D, E, F♯ in 8th notes, then land on E.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l2_dorian_phrase_6 | hiphop',
      styleRef: 'l2a',
      successFeedback: 'F♯ over A minor — warm, jazzy boom bap.',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      chordSymbols: ['Am'],
      tempo: 90,
      grooveId: 'boombap_a',
      backing_style: {
        kit: 'house',
        bassVoice: 'finger',
        bassPattern: 'follow_kick',
        comping: 'held',
        chordRegister: 84,
      },
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 72, onset: 0, duration: 220 }, // C5
        { midi: 74, onset: 240, duration: 220 }, // D5
        { midi: 76, onset: 480, duration: 220 }, // E5
        { midi: 78, onset: 720, duration: 220 }, // F♯5
        { midi: 76, onset: 960, duration: 900 }, // E5
      ],
    },
    {
      stepNumber: 10,
      module: 'hiphop_l2',
      section: 'A',
      subsection: 'A4: Dorian Phrases',
      activity: 'A4.2: 2-Bar Dorian Melody',
      direction: 'Bar 1: A, C, E. Bar 2: F♯, E, D, C, home to A.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l2_dorian_melody_2bar | hiphop',
      styleRef: 'l2a',
      successFeedback: 'Two bars of Dorian melody over the boom bap.',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      chordSymbols: ['Am'],
      tempo: 90,
      grooveId: 'boombap_a',
      backing_style: {
        kit: 'house',
        bassVoice: 'finger',
        bassPattern: 'follow_kick',
        comping: 'held',
        chordRegister: 84,
      },
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 69, onset: 0, duration: 700 }, // A4
        { midi: 72, onset: 720, duration: 700 }, // C5
        { midi: 76, onset: 1440, duration: 460 }, // E5
        { midi: 78, onset: 1920, duration: 220 }, // F♯5
        { midi: 76, onset: 2160, duration: 220 }, // E5
        { midi: 74, onset: 2400, duration: 220 }, // D5
        { midi: 72, onset: 2640, duration: 220 }, // C5
        { midi: 69, onset: 2880, duration: 900 }, // A4
      ],
    },
  ],
};

// ── L2 Section B: Chords ──────────────────────────────────────────────────

const hipHopL2SectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    {
      stepNumber: 1,
      module: 'hiphop_l2',
      section: 'B',
      subsection: 'B1: Triads & Inversions',
      activity: 'B1.1: Triad Review — Am Root Position (Out of Time)',
      direction:
        'Arpeggiate A minor up — A–C–E — then play it as a chord. High: this is boom bap.',
      assessment: 'pitch_only',
      tag: 'hiphop:l2_am_root | hiphop',
      styleRef: 'l2a',
      successFeedback: 'A minor, up where boom bap keys live.',
      chordSymbols: ['Am'],
      targetNotes: [
        { midi: 81, onset: 0, duration: 460 }, // A5
        { midi: 84, onset: 480, duration: 460 }, // C6
        { midi: 88, onset: 960, duration: 460 }, // E6
        { midi: 81, onset: 1440, duration: 900 }, // A5
        { midi: 84, onset: 1440, duration: 900 }, // C6
        { midi: 88, onset: 1440, duration: 900 }, // E6
      ],
    },
    {
      stepNumber: 2,
      module: 'hiphop_l2',
      section: 'B',
      subsection: 'B1: Triads & Inversions',
      activity: 'B1.2: Em 1st Inversion (Out of Time)',
      direction:
        'G–B–E: E minor with the E on top. Arpeggiate it, then play the chord.',
      assessment: 'pitch_only',
      tag: 'hiphop:l2_em_inv1 | hiphop',
      styleRef: 'l2a',
      successFeedback: 'E minor, 1st inversion.',
      chordSymbols: ['Em'],
      targetNotes: [
        { midi: 79, onset: 0, duration: 460 }, // G5
        { midi: 83, onset: 480, duration: 460 }, // B5
        { midi: 88, onset: 960, duration: 460 }, // E6
        { midi: 79, onset: 1440, duration: 900 }, // G5
        { midi: 83, onset: 1440, duration: 900 }, // B5
        { midi: 88, onset: 1440, duration: 900 }, // E6
      ],
    },
    {
      stepNumber: 3,
      module: 'hiphop_l2',
      section: 'B',
      subsection: 'B1: Triads & Inversions',
      activity: 'B1.3: Dm 1st Inversion (Out of Time)',
      direction: 'F–A–D: D minor with the D on top. Same shape, one step down.',
      assessment: 'pitch_only',
      tag: 'hiphop:l2_dm_inv1 | hiphop',
      styleRef: 'l2a',
      successFeedback: 'Same shape as Em — that is a parallel move.',
      chordSymbols: ['Dm'],
      targetNotes: [
        { midi: 77, onset: 0, duration: 460 }, // F5
        { midi: 81, onset: 480, duration: 460 }, // A5
        { midi: 86, onset: 960, duration: 460 }, // D6
        { midi: 77, onset: 1440, duration: 900 }, // F5
        { midi: 81, onset: 1440, duration: 900 }, // A5
        { midi: 86, onset: 1440, duration: 900 }, // D6
      ],
    },
    {
      stepNumber: 4,
      module: 'hiphop_l2',
      section: 'B',
      subsection: 'B1: Triads & Inversions',
      activity: 'B1.4: Play-Along — Em → Dm, Parallel',
      direction:
        'One bar each, 8th notes, staccato. The whole shape slides down a step.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l2_playalong_em1_dm1 | hiphop',
      styleRef: 'l2a',
      successFeedback: 'Parallel 1st inversions — classic boom bap.',
      chordSymbols: ['Em', 'Dm', 'Em', 'Dm'],
      tempo: 90,
      grooveId: 'boombap_a',
      backing_style: {
        kit: 'house',
        bassVoice: 'finger',
        bassPattern: 'follow_kick',
      },
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 79, onset: 0, duration: 90 }, // G5
        { midi: 83, onset: 0, duration: 90 }, // B5
        { midi: 88, onset: 0, duration: 90 }, // E6
        { midi: 79, onset: 240, duration: 90 }, // G5
        { midi: 83, onset: 240, duration: 90 }, // B5
        { midi: 88, onset: 240, duration: 90 }, // E6
        { midi: 79, onset: 480, duration: 90 }, // G5
        { midi: 83, onset: 480, duration: 90 }, // B5
        { midi: 88, onset: 480, duration: 90 }, // E6
        { midi: 79, onset: 720, duration: 90 }, // G5
        { midi: 83, onset: 720, duration: 90 }, // B5
        { midi: 88, onset: 720, duration: 90 }, // E6
        { midi: 79, onset: 960, duration: 90 }, // G5
        { midi: 83, onset: 960, duration: 90 }, // B5
        { midi: 88, onset: 960, duration: 90 }, // E6
        { midi: 79, onset: 1200, duration: 90 }, // G5
        { midi: 83, onset: 1200, duration: 90 }, // B5
        { midi: 88, onset: 1200, duration: 90 }, // E6
        { midi: 79, onset: 1440, duration: 90 }, // G5
        { midi: 83, onset: 1440, duration: 90 }, // B5
        { midi: 88, onset: 1440, duration: 90 }, // E6
        { midi: 79, onset: 1680, duration: 90 }, // G5
        { midi: 83, onset: 1680, duration: 90 }, // B5
        { midi: 88, onset: 1680, duration: 90 }, // E6
        { midi: 77, onset: 1920, duration: 90 }, // F5
        { midi: 81, onset: 1920, duration: 90 }, // A5
        { midi: 86, onset: 1920, duration: 90 }, // D6
        { midi: 77, onset: 2160, duration: 90 }, // F5
        { midi: 81, onset: 2160, duration: 90 }, // A5
        { midi: 86, onset: 2160, duration: 90 }, // D6
        { midi: 77, onset: 2400, duration: 90 }, // F5
        { midi: 81, onset: 2400, duration: 90 }, // A5
        { midi: 86, onset: 2400, duration: 90 }, // D6
        { midi: 77, onset: 2640, duration: 90 }, // F5
        { midi: 81, onset: 2640, duration: 90 }, // A5
        { midi: 86, onset: 2640, duration: 90 }, // D6
        { midi: 77, onset: 2880, duration: 90 }, // F5
        { midi: 81, onset: 2880, duration: 90 }, // A5
        { midi: 86, onset: 2880, duration: 90 }, // D6
        { midi: 77, onset: 3120, duration: 90 }, // F5
        { midi: 81, onset: 3120, duration: 90 }, // A5
        { midi: 86, onset: 3120, duration: 90 }, // D6
        { midi: 77, onset: 3360, duration: 90 }, // F5
        { midi: 81, onset: 3360, duration: 90 }, // A5
        { midi: 86, onset: 3360, duration: 90 }, // D6
        { midi: 77, onset: 3600, duration: 90 }, // F5
        { midi: 81, onset: 3600, duration: 90 }, // A5
        { midi: 86, onset: 3600, duration: 90 }, // D6
        { midi: 79, onset: 3840, duration: 90 }, // G5
        { midi: 83, onset: 3840, duration: 90 }, // B5
        { midi: 88, onset: 3840, duration: 90 }, // E6
        { midi: 79, onset: 4080, duration: 90 }, // G5
        { midi: 83, onset: 4080, duration: 90 }, // B5
        { midi: 88, onset: 4080, duration: 90 }, // E6
        { midi: 79, onset: 4320, duration: 90 }, // G5
        { midi: 83, onset: 4320, duration: 90 }, // B5
        { midi: 88, onset: 4320, duration: 90 }, // E6
        { midi: 79, onset: 4560, duration: 90 }, // G5
        { midi: 83, onset: 4560, duration: 90 }, // B5
        { midi: 88, onset: 4560, duration: 90 }, // E6
        { midi: 79, onset: 4800, duration: 90 }, // G5
        { midi: 83, onset: 4800, duration: 90 }, // B5
        { midi: 88, onset: 4800, duration: 90 }, // E6
        { midi: 79, onset: 5040, duration: 90 }, // G5
        { midi: 83, onset: 5040, duration: 90 }, // B5
        { midi: 88, onset: 5040, duration: 90 }, // E6
        { midi: 79, onset: 5280, duration: 90 }, // G5
        { midi: 83, onset: 5280, duration: 90 }, // B5
        { midi: 88, onset: 5280, duration: 90 }, // E6
        { midi: 79, onset: 5520, duration: 90 }, // G5
        { midi: 83, onset: 5520, duration: 90 }, // B5
        { midi: 88, onset: 5520, duration: 90 }, // E6
        { midi: 77, onset: 5760, duration: 90 }, // F5
        { midi: 81, onset: 5760, duration: 90 }, // A5
        { midi: 86, onset: 5760, duration: 90 }, // D6
        { midi: 77, onset: 6000, duration: 90 }, // F5
        { midi: 81, onset: 6000, duration: 90 }, // A5
        { midi: 86, onset: 6000, duration: 90 }, // D6
        { midi: 77, onset: 6240, duration: 90 }, // F5
        { midi: 81, onset: 6240, duration: 90 }, // A5
        { midi: 86, onset: 6240, duration: 90 }, // D6
        { midi: 77, onset: 6480, duration: 90 }, // F5
        { midi: 81, onset: 6480, duration: 90 }, // A5
        { midi: 86, onset: 6480, duration: 90 }, // D6
        { midi: 77, onset: 6720, duration: 90 }, // F5
        { midi: 81, onset: 6720, duration: 90 }, // A5
        { midi: 86, onset: 6720, duration: 90 }, // D6
        { midi: 77, onset: 6960, duration: 90 }, // F5
        { midi: 81, onset: 6960, duration: 90 }, // A5
        { midi: 86, onset: 6960, duration: 90 }, // D6
        { midi: 77, onset: 7200, duration: 90 }, // F5
        { midi: 81, onset: 7200, duration: 90 }, // A5
        { midi: 86, onset: 7200, duration: 90 }, // D6
        { midi: 77, onset: 7440, duration: 90 }, // F5
        { midi: 81, onset: 7440, duration: 90 }, // A5
        { midi: 86, onset: 7440, duration: 90 }, // D6
      ],
    },
    {
      stepNumber: 5,
      module: 'hiphop_l2',
      section: 'B',
      subsection: 'B2: sus4',
      activity: 'B2.1: Dm Root Position (Out of Time)',
      direction: 'Arpeggiate D minor up — D–F–A — then play the chord.',
      assessment: 'pitch_only',
      tag: 'hiphop:l2_dm_root | hiphop',
      styleRef: 'l2a',
      successFeedback: 'D minor, root position.',
      chordSymbols: ['Dm'],
      targetNotes: [
        { midi: 74, onset: 0, duration: 460 }, // D5
        { midi: 77, onset: 480, duration: 460 }, // F5
        { midi: 81, onset: 960, duration: 460 }, // A5
        { midi: 74, onset: 1440, duration: 900 }, // D5
        { midi: 77, onset: 1440, duration: 900 }, // F5
        { midi: 81, onset: 1440, duration: 900 }, // A5
      ],
    },
    {
      stepNumber: 6,
      module: 'hiphop_l2',
      section: 'B',
      subsection: 'B2: sus4',
      activity: 'B2.2: Am sus4 → Am (Out of Time)',
      direction:
        'D–E–A, then let the D fall to C: C–E–A. That is a sus4 resolving.',
      assessment: 'pitch_only',
      tag: 'hiphop:l2_asus4_resolve | hiphop',
      styleRef: 'l2a',
      successFeedback: 'Suspended, then home — tension and release.',
      chordSymbols: ['Asus4', 'Am', 'Asus4', 'Am'],
      targetNotes: [
        { midi: 74, onset: 0, duration: 1860 }, // D5
        { midi: 76, onset: 0, duration: 1860 }, // E5
        { midi: 81, onset: 0, duration: 1860 }, // A5
        { midi: 72, onset: 1920, duration: 1860 }, // C5
        { midi: 76, onset: 1920, duration: 1860 }, // E5
        { midi: 81, onset: 1920, duration: 1860 }, // A5
        { midi: 74, onset: 3840, duration: 1860 }, // D5
        { midi: 76, onset: 3840, duration: 1860 }, // E5
        { midi: 81, onset: 3840, duration: 1860 }, // A5
        { midi: 72, onset: 5760, duration: 1860 }, // C5
        { midi: 76, onset: 5760, duration: 1860 }, // E5
        { midi: 81, onset: 5760, duration: 1860 }, // A5
      ],
    },
    {
      stepNumber: 7,
      module: 'hiphop_l2',
      section: 'B',
      subsection: 'B2: sus4',
      activity: 'B2.3: Play-Along — Dm | Dm | Am sus4 | Am',
      direction:
        'Two bars of D minor, then the sus4 resolving to A minor. 8th notes, staccato.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l2_playalong_dm_asus4 | hiphop',
      styleRef: 'l2a',
      successFeedback: 'The sus4 makes the A minor land.',
      chordSymbols: ['Dm', 'Dm', 'Asus4', 'Am'],
      tempo: 87,
      grooveId: 'boombap_a',
      backing_style: {
        kit: 'house',
        bassVoice: 'finger',
        bassPattern: 'follow_kick',
      },
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 74, onset: 0, duration: 90 }, // D5
        { midi: 77, onset: 0, duration: 90 }, // F5
        { midi: 81, onset: 0, duration: 90 }, // A5
        { midi: 74, onset: 240, duration: 90 }, // D5
        { midi: 77, onset: 240, duration: 90 }, // F5
        { midi: 81, onset: 240, duration: 90 }, // A5
        { midi: 74, onset: 480, duration: 90 }, // D5
        { midi: 77, onset: 480, duration: 90 }, // F5
        { midi: 81, onset: 480, duration: 90 }, // A5
        { midi: 74, onset: 720, duration: 90 }, // D5
        { midi: 77, onset: 720, duration: 90 }, // F5
        { midi: 81, onset: 720, duration: 90 }, // A5
        { midi: 74, onset: 960, duration: 90 }, // D5
        { midi: 77, onset: 960, duration: 90 }, // F5
        { midi: 81, onset: 960, duration: 90 }, // A5
        { midi: 74, onset: 1200, duration: 90 }, // D5
        { midi: 77, onset: 1200, duration: 90 }, // F5
        { midi: 81, onset: 1200, duration: 90 }, // A5
        { midi: 74, onset: 1440, duration: 90 }, // D5
        { midi: 77, onset: 1440, duration: 90 }, // F5
        { midi: 81, onset: 1440, duration: 90 }, // A5
        { midi: 74, onset: 1680, duration: 90 }, // D5
        { midi: 77, onset: 1680, duration: 90 }, // F5
        { midi: 81, onset: 1680, duration: 90 }, // A5
        { midi: 74, onset: 1920, duration: 90 }, // D5
        { midi: 77, onset: 1920, duration: 90 }, // F5
        { midi: 81, onset: 1920, duration: 90 }, // A5
        { midi: 74, onset: 2160, duration: 90 }, // D5
        { midi: 77, onset: 2160, duration: 90 }, // F5
        { midi: 81, onset: 2160, duration: 90 }, // A5
        { midi: 74, onset: 2400, duration: 90 }, // D5
        { midi: 77, onset: 2400, duration: 90 }, // F5
        { midi: 81, onset: 2400, duration: 90 }, // A5
        { midi: 74, onset: 2640, duration: 90 }, // D5
        { midi: 77, onset: 2640, duration: 90 }, // F5
        { midi: 81, onset: 2640, duration: 90 }, // A5
        { midi: 74, onset: 2880, duration: 90 }, // D5
        { midi: 77, onset: 2880, duration: 90 }, // F5
        { midi: 81, onset: 2880, duration: 90 }, // A5
        { midi: 74, onset: 3120, duration: 90 }, // D5
        { midi: 77, onset: 3120, duration: 90 }, // F5
        { midi: 81, onset: 3120, duration: 90 }, // A5
        { midi: 74, onset: 3360, duration: 90 }, // D5
        { midi: 77, onset: 3360, duration: 90 }, // F5
        { midi: 81, onset: 3360, duration: 90 }, // A5
        { midi: 74, onset: 3600, duration: 90 }, // D5
        { midi: 77, onset: 3600, duration: 90 }, // F5
        { midi: 81, onset: 3600, duration: 90 }, // A5
        { midi: 74, onset: 3840, duration: 90 }, // D5
        { midi: 76, onset: 3840, duration: 90 }, // E5
        { midi: 81, onset: 3840, duration: 90 }, // A5
        { midi: 74, onset: 4080, duration: 90 }, // D5
        { midi: 76, onset: 4080, duration: 90 }, // E5
        { midi: 81, onset: 4080, duration: 90 }, // A5
        { midi: 74, onset: 4320, duration: 90 }, // D5
        { midi: 76, onset: 4320, duration: 90 }, // E5
        { midi: 81, onset: 4320, duration: 90 }, // A5
        { midi: 74, onset: 4560, duration: 90 }, // D5
        { midi: 76, onset: 4560, duration: 90 }, // E5
        { midi: 81, onset: 4560, duration: 90 }, // A5
        { midi: 74, onset: 4800, duration: 90 }, // D5
        { midi: 76, onset: 4800, duration: 90 }, // E5
        { midi: 81, onset: 4800, duration: 90 }, // A5
        { midi: 74, onset: 5040, duration: 90 }, // D5
        { midi: 76, onset: 5040, duration: 90 }, // E5
        { midi: 81, onset: 5040, duration: 90 }, // A5
        { midi: 74, onset: 5280, duration: 90 }, // D5
        { midi: 76, onset: 5280, duration: 90 }, // E5
        { midi: 81, onset: 5280, duration: 90 }, // A5
        { midi: 74, onset: 5520, duration: 90 }, // D5
        { midi: 76, onset: 5520, duration: 90 }, // E5
        { midi: 81, onset: 5520, duration: 90 }, // A5
        { midi: 72, onset: 5760, duration: 90 }, // C5
        { midi: 76, onset: 5760, duration: 90 }, // E5
        { midi: 81, onset: 5760, duration: 90 }, // A5
        { midi: 72, onset: 6000, duration: 90 }, // C5
        { midi: 76, onset: 6000, duration: 90 }, // E5
        { midi: 81, onset: 6000, duration: 90 }, // A5
        { midi: 72, onset: 6240, duration: 90 }, // C5
        { midi: 76, onset: 6240, duration: 90 }, // E5
        { midi: 81, onset: 6240, duration: 90 }, // A5
        { midi: 72, onset: 6480, duration: 90 }, // C5
        { midi: 76, onset: 6480, duration: 90 }, // E5
        { midi: 81, onset: 6480, duration: 90 }, // A5
        { midi: 72, onset: 6720, duration: 90 }, // C5
        { midi: 76, onset: 6720, duration: 90 }, // E5
        { midi: 81, onset: 6720, duration: 90 }, // A5
        { midi: 72, onset: 6960, duration: 90 }, // C5
        { midi: 76, onset: 6960, duration: 90 }, // E5
        { midi: 81, onset: 6960, duration: 90 }, // A5
        { midi: 72, onset: 7200, duration: 90 }, // C5
        { midi: 76, onset: 7200, duration: 90 }, // E5
        { midi: 81, onset: 7200, duration: 90 }, // A5
        { midi: 72, onset: 7440, duration: 90 }, // C5
        { midi: 76, onset: 7440, duration: 90 }, // E5
        { midi: 81, onset: 7440, duration: 90 }, // A5
      ],
    },
    {
      stepNumber: 8,
      module: 'hiphop_l2',
      section: 'B',
      subsection: 'B3: sus2',
      activity: 'B3.1: Am sus2 → Am (Out of Time)',
      direction: 'A–B–E, then let the B rise to C: A–C–E.',
      assessment: 'pitch_only',
      tag: 'hiphop:l2_asus2_resolve | hiphop',
      styleRef: 'l2a',
      successFeedback: 'The 2 rises to the ♭3 — sus2 resolving.',
      chordSymbols: ['Asus2', 'Am', 'Asus2', 'Am'],
      targetNotes: [
        { midi: 81, onset: 0, duration: 1860 }, // A5
        { midi: 83, onset: 0, duration: 1860 }, // B5
        { midi: 88, onset: 0, duration: 1860 }, // E6
        { midi: 81, onset: 1920, duration: 1860 }, // A5
        { midi: 84, onset: 1920, duration: 1860 }, // C6
        { midi: 88, onset: 1920, duration: 1860 }, // E6
        { midi: 81, onset: 3840, duration: 1860 }, // A5
        { midi: 83, onset: 3840, duration: 1860 }, // B5
        { midi: 88, onset: 3840, duration: 1860 }, // E6
        { midi: 81, onset: 5760, duration: 1860 }, // A5
        { midi: 84, onset: 5760, duration: 1860 }, // C6
        { midi: 88, onset: 5760, duration: 1860 }, // E6
      ],
    },
    {
      stepNumber: 9,
      module: 'hiphop_l2',
      section: 'B',
      subsection: 'B3: sus2',
      activity: 'B3.2: Dm sus2 → Dm (Out of Time)',
      direction: 'D–E–A, then let the E rise to F: D–F–A.',
      assessment: 'pitch_only',
      tag: 'hiphop:l2_dsus2_resolve | hiphop',
      styleRef: 'l2a',
      successFeedback: 'Same move on D.',
      chordSymbols: ['Dsus2', 'Dm', 'Dsus2', 'Dm'],
      targetNotes: [
        { midi: 74, onset: 0, duration: 1860 }, // D5
        { midi: 76, onset: 0, duration: 1860 }, // E5
        { midi: 81, onset: 0, duration: 1860 }, // A5
        { midi: 74, onset: 1920, duration: 1860 }, // D5
        { midi: 77, onset: 1920, duration: 1860 }, // F5
        { midi: 81, onset: 1920, duration: 1860 }, // A5
        { midi: 74, onset: 3840, duration: 1860 }, // D5
        { midi: 76, onset: 3840, duration: 1860 }, // E5
        { midi: 81, onset: 3840, duration: 1860 }, // A5
        { midi: 74, onset: 5760, duration: 1860 }, // D5
        { midi: 77, onset: 5760, duration: 1860 }, // F5
        { midi: 81, onset: 5760, duration: 1860 }, // A5
      ],
    },
    {
      stepNumber: 10,
      module: 'hiphop_l2',
      section: 'B',
      subsection: 'B3: sus2',
      activity: 'B3.3: Play-Along — the sus2 Groove',
      direction:
        'Two chords a bar: sus2 for beats 1–2, the minor chord for beats 3–4. 8th notes, staccato.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l2_playalong_sus2 | hiphop',
      styleRef: 'l2a',
      successFeedback: 'Every bar breathes — sus2, then home.',
      chordSymbols: ['Asus2', 'Am', 'Dsus2', 'Dm'],
      tempo: 90,
      grooveId: 'boombap_a',
      backing_style: {
        kit: 'house',
        bassVoice: '808',
        bassPattern: 'sus2_bass',
      },
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 81, onset: 0, duration: 90 }, // A5
        { midi: 83, onset: 0, duration: 90 }, // B5
        { midi: 88, onset: 0, duration: 90 }, // E6
        { midi: 81, onset: 240, duration: 90 }, // A5
        { midi: 83, onset: 240, duration: 90 }, // B5
        { midi: 88, onset: 240, duration: 90 }, // E6
        { midi: 81, onset: 480, duration: 90 }, // A5
        { midi: 83, onset: 480, duration: 90 }, // B5
        { midi: 88, onset: 480, duration: 90 }, // E6
        { midi: 81, onset: 720, duration: 90 }, // A5
        { midi: 83, onset: 720, duration: 90 }, // B5
        { midi: 88, onset: 720, duration: 90 }, // E6
        { midi: 81, onset: 960, duration: 90 }, // A5
        { midi: 84, onset: 960, duration: 90 }, // C6
        { midi: 88, onset: 960, duration: 90 }, // E6
        { midi: 81, onset: 1200, duration: 90 }, // A5
        { midi: 84, onset: 1200, duration: 90 }, // C6
        { midi: 88, onset: 1200, duration: 90 }, // E6
        { midi: 81, onset: 1440, duration: 90 }, // A5
        { midi: 84, onset: 1440, duration: 90 }, // C6
        { midi: 88, onset: 1440, duration: 90 }, // E6
        { midi: 81, onset: 1680, duration: 90 }, // A5
        { midi: 84, onset: 1680, duration: 90 }, // C6
        { midi: 88, onset: 1680, duration: 90 }, // E6
        { midi: 81, onset: 1920, duration: 90 }, // A5
        { midi: 83, onset: 1920, duration: 90 }, // B5
        { midi: 88, onset: 1920, duration: 90 }, // E6
        { midi: 81, onset: 2160, duration: 90 }, // A5
        { midi: 83, onset: 2160, duration: 90 }, // B5
        { midi: 88, onset: 2160, duration: 90 }, // E6
        { midi: 81, onset: 2400, duration: 90 }, // A5
        { midi: 83, onset: 2400, duration: 90 }, // B5
        { midi: 88, onset: 2400, duration: 90 }, // E6
        { midi: 81, onset: 2640, duration: 90 }, // A5
        { midi: 83, onset: 2640, duration: 90 }, // B5
        { midi: 88, onset: 2640, duration: 90 }, // E6
        { midi: 81, onset: 2880, duration: 90 }, // A5
        { midi: 84, onset: 2880, duration: 90 }, // C6
        { midi: 88, onset: 2880, duration: 90 }, // E6
        { midi: 81, onset: 3120, duration: 90 }, // A5
        { midi: 84, onset: 3120, duration: 90 }, // C6
        { midi: 88, onset: 3120, duration: 90 }, // E6
        { midi: 81, onset: 3360, duration: 90 }, // A5
        { midi: 84, onset: 3360, duration: 90 }, // C6
        { midi: 88, onset: 3360, duration: 90 }, // E6
        { midi: 81, onset: 3600, duration: 90 }, // A5
        { midi: 84, onset: 3600, duration: 90 }, // C6
        { midi: 88, onset: 3600, duration: 90 }, // E6
        { midi: 74, onset: 3840, duration: 90 }, // D5
        { midi: 76, onset: 3840, duration: 90 }, // E5
        { midi: 81, onset: 3840, duration: 90 }, // A5
        { midi: 74, onset: 4080, duration: 90 }, // D5
        { midi: 76, onset: 4080, duration: 90 }, // E5
        { midi: 81, onset: 4080, duration: 90 }, // A5
        { midi: 74, onset: 4320, duration: 90 }, // D5
        { midi: 76, onset: 4320, duration: 90 }, // E5
        { midi: 81, onset: 4320, duration: 90 }, // A5
        { midi: 74, onset: 4560, duration: 90 }, // D5
        { midi: 76, onset: 4560, duration: 90 }, // E5
        { midi: 81, onset: 4560, duration: 90 }, // A5
        { midi: 74, onset: 4800, duration: 90 }, // D5
        { midi: 77, onset: 4800, duration: 90 }, // F5
        { midi: 81, onset: 4800, duration: 90 }, // A5
        { midi: 74, onset: 5040, duration: 90 }, // D5
        { midi: 77, onset: 5040, duration: 90 }, // F5
        { midi: 81, onset: 5040, duration: 90 }, // A5
        { midi: 74, onset: 5280, duration: 90 }, // D5
        { midi: 77, onset: 5280, duration: 90 }, // F5
        { midi: 81, onset: 5280, duration: 90 }, // A5
        { midi: 74, onset: 5520, duration: 90 }, // D5
        { midi: 77, onset: 5520, duration: 90 }, // F5
        { midi: 81, onset: 5520, duration: 90 }, // A5
        { midi: 74, onset: 5760, duration: 90 }, // D5
        { midi: 76, onset: 5760, duration: 90 }, // E5
        { midi: 81, onset: 5760, duration: 90 }, // A5
        { midi: 74, onset: 6000, duration: 90 }, // D5
        { midi: 76, onset: 6000, duration: 90 }, // E5
        { midi: 81, onset: 6000, duration: 90 }, // A5
        { midi: 74, onset: 6240, duration: 90 }, // D5
        { midi: 76, onset: 6240, duration: 90 }, // E5
        { midi: 81, onset: 6240, duration: 90 }, // A5
        { midi: 74, onset: 6480, duration: 90 }, // D5
        { midi: 76, onset: 6480, duration: 90 }, // E5
        { midi: 81, onset: 6480, duration: 90 }, // A5
        { midi: 74, onset: 6720, duration: 90 }, // D5
        { midi: 77, onset: 6720, duration: 90 }, // F5
        { midi: 81, onset: 6720, duration: 90 }, // A5
        { midi: 74, onset: 6960, duration: 90 }, // D5
        { midi: 77, onset: 6960, duration: 90 }, // F5
        { midi: 81, onset: 6960, duration: 90 }, // A5
        { midi: 74, onset: 7200, duration: 90 }, // D5
        { midi: 77, onset: 7200, duration: 90 }, // F5
        { midi: 81, onset: 7200, duration: 90 }, // A5
        { midi: 74, onset: 7440, duration: 90 }, // D5
        { midi: 77, onset: 7440, duration: 90 }, // F5
        { midi: 81, onset: 7440, duration: 90 }, // A5
      ],
    },
  ],
};

// ── L2 Section C: Bass ──────────────────────────────────────────────────

const hipHopL2SectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 1,
      module: 'hiphop_l2',
      section: 'C',
      subsection: 'C1: Boom Bap Bass',
      activity: 'C1.1: Locked to the Kick — One Note',
      direction:
        'Play A every time the kick hits. Bar 2 adds one on the "a" of 2.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l2_bass_kick_one_note | hiphop',
      styleRef: 'l2a',
      successFeedback: 'Bass and kick as one — the boom.',
      chordSymbols: ['Am'],
      tempo: 90,
      grooveId: 'boombap_a',
      backing_style: {
        kit: 'house',
        bassVoice: 'finger',
        comping: 'held',
        chordRegister: 84,
      },
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 45, onset: 0, duration: 1180 }, // A2
        { midi: 45, onset: 1200, duration: 700 }, // A2
        { midi: 45, onset: 1920, duration: 820 }, // A2
        { midi: 45, onset: 2760, duration: 340 }, // A2
        { midi: 45, onset: 3120, duration: 700 }, // A2
      ],
    },
    {
      stepNumber: 2,
      module: 'hiphop_l2',
      section: 'C',
      subsection: 'C1: Boom Bap Bass',
      activity: 'C1.2: Locked to the Kick — Em → Dm',
      direction:
        'E with the kick in bar 1, D in bar 2 — down a whole step, never up.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l2_bass_kick_em_dm | hiphop',
      styleRef: 'l2a',
      successFeedback: 'A whole step down — smooth.',
      chordSymbols: ['Em', 'Dm'],
      tempo: 90,
      grooveId: 'boombap_a',
      backing_style: {
        kit: 'house',
        bassVoice: 'finger',
        comping: 'held',
        chordRegister: 84,
      },
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 40, onset: 0, duration: 1180 }, // E2
        { midi: 40, onset: 1200, duration: 700 }, // E2
        { midi: 38, onset: 1920, duration: 820 }, // D2
        { midi: 38, onset: 2760, duration: 340 }, // D2
        { midi: 38, onset: 3120, duration: 700 }, // D2
      ],
    },
    {
      stepNumber: 3,
      module: 'hiphop_l2',
      section: 'C',
      subsection: 'C1: Boom Bap Bass',
      activity: 'C1.3: Root – 5 – ♭7',
      direction:
        'A (quarter), E (dotted 8th), G (dotted 8th). Then the root again next bar.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l2_bass_r5b7 | hiphop',
      styleRef: 'l2a',
      successFeedback: 'Root, 5, ♭7 — the boom bap bass hook.',
      chordSymbols: ['Am'],
      tempo: 90,
      grooveId: 'boombap_a',
      backing_style: {
        kit: 'house',
        bassVoice: 'finger',
        comping: 'held',
        chordRegister: 84,
      },
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 45, onset: 0, duration: 460 }, // A2
        { midi: 52, onset: 480, duration: 340 }, // E3
        { midi: 55, onset: 840, duration: 340 }, // G3
        { midi: 45, onset: 1920, duration: 460 }, // A2
        { midi: 52, onset: 2400, duration: 340 }, // E3
        { midi: 55, onset: 2760, duration: 340 }, // G3
      ],
    },
    {
      stepNumber: 4,
      module: 'hiphop_l2',
      section: 'C',
      subsection: 'C1: Boom Bap Bass',
      activity: 'C1.4: Root – 5 – ♭7 over Am → Dm',
      direction: 'A–E–G over A minor, then D–A–C over D minor.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l2_bass_r5b7_am_dm | hiphop',
      styleRef: 'l2a',
      successFeedback: 'Same shape, new root.',
      chordSymbols: ['Am', 'Dm'],
      tempo: 90,
      grooveId: 'boombap_a',
      backing_style: {
        kit: 'house',
        bassVoice: 'finger',
        comping: 'held',
        chordRegister: 84,
      },
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 45, onset: 0, duration: 460 }, // A2
        { midi: 52, onset: 480, duration: 340 }, // E3
        { midi: 55, onset: 840, duration: 340 }, // G3
        { midi: 50, onset: 1920, duration: 460 }, // D3
        { midi: 57, onset: 2400, duration: 340 }, // A3
        { midi: 60, onset: 2760, duration: 340 }, // C4
      ],
    },
    {
      stepNumber: 5,
      module: 'hiphop_l2',
      section: 'C',
      subsection: 'C2: Bass Play-Along',
      activity: 'C2.1: Bass Play-Along — the sus2 Groove',
      direction:
        'Root–5–♭7 under the sus2 progression: two bars on A, two on D.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l2_bass_playalong_sus2 | hiphop',
      styleRef: 'l2a',
      successFeedback: 'You are the low end of a boom bap track.',
      chordSymbols: ['Asus2', 'Am', 'Dsus2', 'Dm'],
      tempo: 90,
      grooveId: 'boombap_a',
      backing_style: {
        kit: 'house',
        bassVoice: '808',
        comping: 'chunk_eighths_staccato',
        chordRegister: 84,
      },
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 45, onset: 0, duration: 460 }, // A2
        { midi: 52, onset: 480, duration: 340 }, // E3
        { midi: 55, onset: 840, duration: 340 }, // G3
        { midi: 45, onset: 1920, duration: 460 }, // A2
        { midi: 52, onset: 2400, duration: 340 }, // E3
        { midi: 55, onset: 2760, duration: 340 }, // G3
        { midi: 50, onset: 3840, duration: 460 }, // D3
        { midi: 57, onset: 4320, duration: 340 }, // A3
        { midi: 60, onset: 4680, duration: 340 }, // C4
        { midi: 50, onset: 5760, duration: 460 }, // D3
        { midi: 57, onset: 6240, duration: 340 }, // A3
        { midi: 60, onset: 6600, duration: 340 }, // C4
      ],
    },
  ],
};

// ── L2 Section D: Performance ──────────────────────────────────────────────────

const hipHopL2SectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 1,
      module: 'hiphop_l2',
      section: 'D',
      subsection: 'D1: Two-Hand Grooves',
      activity: 'D1.1: Parallel Jam, Two Hands',
      direction:
        'Left hand: E, then D, with the kick. Right hand: the 1st inversions in staccato 8ths.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l2_perf_parallel | hiphop',
      styleRef: 'l2a',
      successFeedback: 'Both hands locked to the boom bap.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l2a',
      },
      chordSymbols: ['Em', 'Dm', 'Em', 'Dm'],
      tempo: 90,
      grooveId: 'boombap_a',
      backing_style: { kit: 'house', bassVoice: 'finger' },
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 40, onset: 0, duration: 1180, hand: 'lh' }, // E2
        { midi: 40, onset: 1200, duration: 700, hand: 'lh' }, // E2
        { midi: 38, onset: 1920, duration: 820, hand: 'lh' }, // D2
        { midi: 38, onset: 2760, duration: 340, hand: 'lh' }, // D2
        { midi: 38, onset: 3120, duration: 700, hand: 'lh' }, // D2
        { midi: 40, onset: 3840, duration: 1180, hand: 'lh' }, // E2
        { midi: 40, onset: 5040, duration: 700, hand: 'lh' }, // E2
        { midi: 38, onset: 5760, duration: 820, hand: 'lh' }, // D2
        { midi: 38, onset: 6600, duration: 340, hand: 'lh' }, // D2
        { midi: 38, onset: 6960, duration: 700, hand: 'lh' }, // D2
        { midi: 79, onset: 0, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 0, duration: 90, hand: 'rh' }, // B5
        { midi: 88, onset: 0, duration: 90, hand: 'rh' }, // E6
        { midi: 79, onset: 240, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 240, duration: 90, hand: 'rh' }, // B5
        { midi: 88, onset: 240, duration: 90, hand: 'rh' }, // E6
        { midi: 79, onset: 480, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 480, duration: 90, hand: 'rh' }, // B5
        { midi: 88, onset: 480, duration: 90, hand: 'rh' }, // E6
        { midi: 79, onset: 720, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 720, duration: 90, hand: 'rh' }, // B5
        { midi: 88, onset: 720, duration: 90, hand: 'rh' }, // E6
        { midi: 79, onset: 960, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 960, duration: 90, hand: 'rh' }, // B5
        { midi: 88, onset: 960, duration: 90, hand: 'rh' }, // E6
        { midi: 79, onset: 1200, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 1200, duration: 90, hand: 'rh' }, // B5
        { midi: 88, onset: 1200, duration: 90, hand: 'rh' }, // E6
        { midi: 79, onset: 1440, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 1440, duration: 90, hand: 'rh' }, // B5
        { midi: 88, onset: 1440, duration: 90, hand: 'rh' }, // E6
        { midi: 79, onset: 1680, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 1680, duration: 90, hand: 'rh' }, // B5
        { midi: 88, onset: 1680, duration: 90, hand: 'rh' }, // E6
        { midi: 77, onset: 1920, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 1920, duration: 90, hand: 'rh' }, // A5
        { midi: 86, onset: 1920, duration: 90, hand: 'rh' }, // D6
        { midi: 77, onset: 2160, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 2160, duration: 90, hand: 'rh' }, // A5
        { midi: 86, onset: 2160, duration: 90, hand: 'rh' }, // D6
        { midi: 77, onset: 2400, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 2400, duration: 90, hand: 'rh' }, // A5
        { midi: 86, onset: 2400, duration: 90, hand: 'rh' }, // D6
        { midi: 77, onset: 2640, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 2640, duration: 90, hand: 'rh' }, // A5
        { midi: 86, onset: 2640, duration: 90, hand: 'rh' }, // D6
        { midi: 77, onset: 2880, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 2880, duration: 90, hand: 'rh' }, // A5
        { midi: 86, onset: 2880, duration: 90, hand: 'rh' }, // D6
        { midi: 77, onset: 3120, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 3120, duration: 90, hand: 'rh' }, // A5
        { midi: 86, onset: 3120, duration: 90, hand: 'rh' }, // D6
        { midi: 77, onset: 3360, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 3360, duration: 90, hand: 'rh' }, // A5
        { midi: 86, onset: 3360, duration: 90, hand: 'rh' }, // D6
        { midi: 77, onset: 3600, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 3600, duration: 90, hand: 'rh' }, // A5
        { midi: 86, onset: 3600, duration: 90, hand: 'rh' }, // D6
        { midi: 79, onset: 3840, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 3840, duration: 90, hand: 'rh' }, // B5
        { midi: 88, onset: 3840, duration: 90, hand: 'rh' }, // E6
        { midi: 79, onset: 4080, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 4080, duration: 90, hand: 'rh' }, // B5
        { midi: 88, onset: 4080, duration: 90, hand: 'rh' }, // E6
        { midi: 79, onset: 4320, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 4320, duration: 90, hand: 'rh' }, // B5
        { midi: 88, onset: 4320, duration: 90, hand: 'rh' }, // E6
        { midi: 79, onset: 4560, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 4560, duration: 90, hand: 'rh' }, // B5
        { midi: 88, onset: 4560, duration: 90, hand: 'rh' }, // E6
        { midi: 79, onset: 4800, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 4800, duration: 90, hand: 'rh' }, // B5
        { midi: 88, onset: 4800, duration: 90, hand: 'rh' }, // E6
        { midi: 79, onset: 5040, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 5040, duration: 90, hand: 'rh' }, // B5
        { midi: 88, onset: 5040, duration: 90, hand: 'rh' }, // E6
        { midi: 79, onset: 5280, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 5280, duration: 90, hand: 'rh' }, // B5
        { midi: 88, onset: 5280, duration: 90, hand: 'rh' }, // E6
        { midi: 79, onset: 5520, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 5520, duration: 90, hand: 'rh' }, // B5
        { midi: 88, onset: 5520, duration: 90, hand: 'rh' }, // E6
        { midi: 77, onset: 5760, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 5760, duration: 90, hand: 'rh' }, // A5
        { midi: 86, onset: 5760, duration: 90, hand: 'rh' }, // D6
        { midi: 77, onset: 6000, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 6000, duration: 90, hand: 'rh' }, // A5
        { midi: 86, onset: 6000, duration: 90, hand: 'rh' }, // D6
        { midi: 77, onset: 6240, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 6240, duration: 90, hand: 'rh' }, // A5
        { midi: 86, onset: 6240, duration: 90, hand: 'rh' }, // D6
        { midi: 77, onset: 6480, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 6480, duration: 90, hand: 'rh' }, // A5
        { midi: 86, onset: 6480, duration: 90, hand: 'rh' }, // D6
        { midi: 77, onset: 6720, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 6720, duration: 90, hand: 'rh' }, // A5
        { midi: 86, onset: 6720, duration: 90, hand: 'rh' }, // D6
        { midi: 77, onset: 6960, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 6960, duration: 90, hand: 'rh' }, // A5
        { midi: 86, onset: 6960, duration: 90, hand: 'rh' }, // D6
        { midi: 77, onset: 7200, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 7200, duration: 90, hand: 'rh' }, // A5
        { midi: 86, onset: 7200, duration: 90, hand: 'rh' }, // D6
        { midi: 77, onset: 7440, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 7440, duration: 90, hand: 'rh' }, // A5
        { midi: 86, onset: 7440, duration: 90, hand: 'rh' }, // D6
      ],
    },
    {
      stepNumber: 2,
      module: 'hiphop_l2',
      section: 'D',
      subsection: 'D1: Two-Hand Grooves',
      activity: 'D1.2: sus4 Resolution, Two Hands',
      direction:
        'Left hand holds D, D, then A, A. Right hand: Dm, Dm, Am sus4, Am in staccato 8ths.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l2_perf_sus4 | hiphop',
      styleRef: 'l2a',
      successFeedback: 'Tension, release, both hands.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l2a',
      },
      chordSymbols: ['Dm', 'Dm', 'Asus4', 'Am'],
      tempo: 87,
      grooveId: 'boombap_a',
      backing_style: { kit: 'house', bassVoice: 'finger' },
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 38, onset: 0, duration: 1860, hand: 'lh' }, // D2
        { midi: 38, onset: 1920, duration: 1860, hand: 'lh' }, // D2
        { midi: 45, onset: 3840, duration: 1860, hand: 'lh' }, // A2
        { midi: 45, onset: 5760, duration: 1860, hand: 'lh' }, // A2
        { midi: 74, onset: 0, duration: 90, hand: 'rh' }, // D5
        { midi: 77, onset: 0, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 0, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 240, duration: 90, hand: 'rh' }, // D5
        { midi: 77, onset: 240, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 240, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 480, duration: 90, hand: 'rh' }, // D5
        { midi: 77, onset: 480, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 480, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 720, duration: 90, hand: 'rh' }, // D5
        { midi: 77, onset: 720, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 720, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 960, duration: 90, hand: 'rh' }, // D5
        { midi: 77, onset: 960, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 960, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 1200, duration: 90, hand: 'rh' }, // D5
        { midi: 77, onset: 1200, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 1200, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 1440, duration: 90, hand: 'rh' }, // D5
        { midi: 77, onset: 1440, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 1440, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 1680, duration: 90, hand: 'rh' }, // D5
        { midi: 77, onset: 1680, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 1680, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 1920, duration: 90, hand: 'rh' }, // D5
        { midi: 77, onset: 1920, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 1920, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 2160, duration: 90, hand: 'rh' }, // D5
        { midi: 77, onset: 2160, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 2160, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 2400, duration: 90, hand: 'rh' }, // D5
        { midi: 77, onset: 2400, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 2400, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 2640, duration: 90, hand: 'rh' }, // D5
        { midi: 77, onset: 2640, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 2640, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 2880, duration: 90, hand: 'rh' }, // D5
        { midi: 77, onset: 2880, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 2880, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 3120, duration: 90, hand: 'rh' }, // D5
        { midi: 77, onset: 3120, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 3120, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 3360, duration: 90, hand: 'rh' }, // D5
        { midi: 77, onset: 3360, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 3360, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 3600, duration: 90, hand: 'rh' }, // D5
        { midi: 77, onset: 3600, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 3600, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 3840, duration: 90, hand: 'rh' }, // D5
        { midi: 76, onset: 3840, duration: 90, hand: 'rh' }, // E5
        { midi: 81, onset: 3840, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 4080, duration: 90, hand: 'rh' }, // D5
        { midi: 76, onset: 4080, duration: 90, hand: 'rh' }, // E5
        { midi: 81, onset: 4080, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 4320, duration: 90, hand: 'rh' }, // D5
        { midi: 76, onset: 4320, duration: 90, hand: 'rh' }, // E5
        { midi: 81, onset: 4320, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 4560, duration: 90, hand: 'rh' }, // D5
        { midi: 76, onset: 4560, duration: 90, hand: 'rh' }, // E5
        { midi: 81, onset: 4560, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 4800, duration: 90, hand: 'rh' }, // D5
        { midi: 76, onset: 4800, duration: 90, hand: 'rh' }, // E5
        { midi: 81, onset: 4800, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 5040, duration: 90, hand: 'rh' }, // D5
        { midi: 76, onset: 5040, duration: 90, hand: 'rh' }, // E5
        { midi: 81, onset: 5040, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 5280, duration: 90, hand: 'rh' }, // D5
        { midi: 76, onset: 5280, duration: 90, hand: 'rh' }, // E5
        { midi: 81, onset: 5280, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 5520, duration: 90, hand: 'rh' }, // D5
        { midi: 76, onset: 5520, duration: 90, hand: 'rh' }, // E5
        { midi: 81, onset: 5520, duration: 90, hand: 'rh' }, // A5
        { midi: 72, onset: 5760, duration: 90, hand: 'rh' }, // C5
        { midi: 76, onset: 5760, duration: 90, hand: 'rh' }, // E5
        { midi: 81, onset: 5760, duration: 90, hand: 'rh' }, // A5
        { midi: 72, onset: 6000, duration: 90, hand: 'rh' }, // C5
        { midi: 76, onset: 6000, duration: 90, hand: 'rh' }, // E5
        { midi: 81, onset: 6000, duration: 90, hand: 'rh' }, // A5
        { midi: 72, onset: 6240, duration: 90, hand: 'rh' }, // C5
        { midi: 76, onset: 6240, duration: 90, hand: 'rh' }, // E5
        { midi: 81, onset: 6240, duration: 90, hand: 'rh' }, // A5
        { midi: 72, onset: 6480, duration: 90, hand: 'rh' }, // C5
        { midi: 76, onset: 6480, duration: 90, hand: 'rh' }, // E5
        { midi: 81, onset: 6480, duration: 90, hand: 'rh' }, // A5
        { midi: 72, onset: 6720, duration: 90, hand: 'rh' }, // C5
        { midi: 76, onset: 6720, duration: 90, hand: 'rh' }, // E5
        { midi: 81, onset: 6720, duration: 90, hand: 'rh' }, // A5
        { midi: 72, onset: 6960, duration: 90, hand: 'rh' }, // C5
        { midi: 76, onset: 6960, duration: 90, hand: 'rh' }, // E5
        { midi: 81, onset: 6960, duration: 90, hand: 'rh' }, // A5
        { midi: 72, onset: 7200, duration: 90, hand: 'rh' }, // C5
        { midi: 76, onset: 7200, duration: 90, hand: 'rh' }, // E5
        { midi: 81, onset: 7200, duration: 90, hand: 'rh' }, // A5
        { midi: 72, onset: 7440, duration: 90, hand: 'rh' }, // C5
        { midi: 76, onset: 7440, duration: 90, hand: 'rh' }, // E5
        { midi: 81, onset: 7440, duration: 90, hand: 'rh' }, // A5
      ],
    },
    {
      stepNumber: 3,
      module: 'hiphop_l2',
      section: 'D',
      subsection: 'D2: sus2 Groove',
      activity: 'D2.1: sus2 Groove, Two Hands',
      direction:
        'Left hand plays root–5–♭7. Right hand plays the sus2 progression, two chords a bar.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l2_perf_sus2 | hiphop',
      styleRef: 'l2a',
      successFeedback: 'That is a complete boom bap keys part.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l2a',
      },
      chordSymbols: ['Asus2', 'Am', 'Dsus2', 'Dm'],
      tempo: 90,
      grooveId: 'boombap_a',
      backing_style: { kit: 'house', bassVoice: '808' },
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 45, onset: 0, duration: 460, hand: 'lh' }, // A2
        { midi: 52, onset: 480, duration: 340, hand: 'lh' }, // E3
        { midi: 55, onset: 840, duration: 340, hand: 'lh' }, // G3
        { midi: 45, onset: 1920, duration: 460, hand: 'lh' }, // A2
        { midi: 52, onset: 2400, duration: 340, hand: 'lh' }, // E3
        { midi: 55, onset: 2760, duration: 340, hand: 'lh' }, // G3
        { midi: 50, onset: 3840, duration: 460, hand: 'lh' }, // D3
        { midi: 57, onset: 4320, duration: 340, hand: 'lh' }, // A3
        { midi: 60, onset: 4680, duration: 340, hand: 'lh' }, // C4
        { midi: 50, onset: 5760, duration: 460, hand: 'lh' }, // D3
        { midi: 57, onset: 6240, duration: 340, hand: 'lh' }, // A3
        { midi: 60, onset: 6600, duration: 340, hand: 'lh' }, // C4
        { midi: 81, onset: 0, duration: 90, hand: 'rh' }, // A5
        { midi: 83, onset: 0, duration: 90, hand: 'rh' }, // B5
        { midi: 88, onset: 0, duration: 90, hand: 'rh' }, // E6
        { midi: 81, onset: 240, duration: 90, hand: 'rh' }, // A5
        { midi: 83, onset: 240, duration: 90, hand: 'rh' }, // B5
        { midi: 88, onset: 240, duration: 90, hand: 'rh' }, // E6
        { midi: 81, onset: 480, duration: 90, hand: 'rh' }, // A5
        { midi: 83, onset: 480, duration: 90, hand: 'rh' }, // B5
        { midi: 88, onset: 480, duration: 90, hand: 'rh' }, // E6
        { midi: 81, onset: 720, duration: 90, hand: 'rh' }, // A5
        { midi: 83, onset: 720, duration: 90, hand: 'rh' }, // B5
        { midi: 88, onset: 720, duration: 90, hand: 'rh' }, // E6
        { midi: 81, onset: 960, duration: 90, hand: 'rh' }, // A5
        { midi: 84, onset: 960, duration: 90, hand: 'rh' }, // C6
        { midi: 88, onset: 960, duration: 90, hand: 'rh' }, // E6
        { midi: 81, onset: 1200, duration: 90, hand: 'rh' }, // A5
        { midi: 84, onset: 1200, duration: 90, hand: 'rh' }, // C6
        { midi: 88, onset: 1200, duration: 90, hand: 'rh' }, // E6
        { midi: 81, onset: 1440, duration: 90, hand: 'rh' }, // A5
        { midi: 84, onset: 1440, duration: 90, hand: 'rh' }, // C6
        { midi: 88, onset: 1440, duration: 90, hand: 'rh' }, // E6
        { midi: 81, onset: 1680, duration: 90, hand: 'rh' }, // A5
        { midi: 84, onset: 1680, duration: 90, hand: 'rh' }, // C6
        { midi: 88, onset: 1680, duration: 90, hand: 'rh' }, // E6
        { midi: 81, onset: 1920, duration: 90, hand: 'rh' }, // A5
        { midi: 83, onset: 1920, duration: 90, hand: 'rh' }, // B5
        { midi: 88, onset: 1920, duration: 90, hand: 'rh' }, // E6
        { midi: 81, onset: 2160, duration: 90, hand: 'rh' }, // A5
        { midi: 83, onset: 2160, duration: 90, hand: 'rh' }, // B5
        { midi: 88, onset: 2160, duration: 90, hand: 'rh' }, // E6
        { midi: 81, onset: 2400, duration: 90, hand: 'rh' }, // A5
        { midi: 83, onset: 2400, duration: 90, hand: 'rh' }, // B5
        { midi: 88, onset: 2400, duration: 90, hand: 'rh' }, // E6
        { midi: 81, onset: 2640, duration: 90, hand: 'rh' }, // A5
        { midi: 83, onset: 2640, duration: 90, hand: 'rh' }, // B5
        { midi: 88, onset: 2640, duration: 90, hand: 'rh' }, // E6
        { midi: 81, onset: 2880, duration: 90, hand: 'rh' }, // A5
        { midi: 84, onset: 2880, duration: 90, hand: 'rh' }, // C6
        { midi: 88, onset: 2880, duration: 90, hand: 'rh' }, // E6
        { midi: 81, onset: 3120, duration: 90, hand: 'rh' }, // A5
        { midi: 84, onset: 3120, duration: 90, hand: 'rh' }, // C6
        { midi: 88, onset: 3120, duration: 90, hand: 'rh' }, // E6
        { midi: 81, onset: 3360, duration: 90, hand: 'rh' }, // A5
        { midi: 84, onset: 3360, duration: 90, hand: 'rh' }, // C6
        { midi: 88, onset: 3360, duration: 90, hand: 'rh' }, // E6
        { midi: 81, onset: 3600, duration: 90, hand: 'rh' }, // A5
        { midi: 84, onset: 3600, duration: 90, hand: 'rh' }, // C6
        { midi: 88, onset: 3600, duration: 90, hand: 'rh' }, // E6
        { midi: 74, onset: 3840, duration: 90, hand: 'rh' }, // D5
        { midi: 76, onset: 3840, duration: 90, hand: 'rh' }, // E5
        { midi: 81, onset: 3840, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 4080, duration: 90, hand: 'rh' }, // D5
        { midi: 76, onset: 4080, duration: 90, hand: 'rh' }, // E5
        { midi: 81, onset: 4080, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 4320, duration: 90, hand: 'rh' }, // D5
        { midi: 76, onset: 4320, duration: 90, hand: 'rh' }, // E5
        { midi: 81, onset: 4320, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 4560, duration: 90, hand: 'rh' }, // D5
        { midi: 76, onset: 4560, duration: 90, hand: 'rh' }, // E5
        { midi: 81, onset: 4560, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 4800, duration: 90, hand: 'rh' }, // D5
        { midi: 77, onset: 4800, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 4800, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 5040, duration: 90, hand: 'rh' }, // D5
        { midi: 77, onset: 5040, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 5040, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 5280, duration: 90, hand: 'rh' }, // D5
        { midi: 77, onset: 5280, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 5280, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 5520, duration: 90, hand: 'rh' }, // D5
        { midi: 77, onset: 5520, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 5520, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 5760, duration: 90, hand: 'rh' }, // D5
        { midi: 76, onset: 5760, duration: 90, hand: 'rh' }, // E5
        { midi: 81, onset: 5760, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 6000, duration: 90, hand: 'rh' }, // D5
        { midi: 76, onset: 6000, duration: 90, hand: 'rh' }, // E5
        { midi: 81, onset: 6000, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 6240, duration: 90, hand: 'rh' }, // D5
        { midi: 76, onset: 6240, duration: 90, hand: 'rh' }, // E5
        { midi: 81, onset: 6240, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 6480, duration: 90, hand: 'rh' }, // D5
        { midi: 76, onset: 6480, duration: 90, hand: 'rh' }, // E5
        { midi: 81, onset: 6480, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 6720, duration: 90, hand: 'rh' }, // D5
        { midi: 77, onset: 6720, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 6720, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 6960, duration: 90, hand: 'rh' }, // D5
        { midi: 77, onset: 6960, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 6960, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 7200, duration: 90, hand: 'rh' }, // D5
        { midi: 77, onset: 7200, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 7200, duration: 90, hand: 'rh' }, // A5
        { midi: 74, onset: 7440, duration: 90, hand: 'rh' }, // D5
        { midi: 77, onset: 7440, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 7440, duration: 90, hand: 'rh' }, // A5
      ],
    },
  ],
};

// ── L3 Section A: Melody ──────────────────────────────────────────────────

const hipHopL3SectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    {
      stepNumber: 1,
      module: 'hiphop_l3',
      section: 'A',
      subsection: 'A1: Scale (E Phrygian)',
      activity: 'A1.1: E Phrygian Ascending (Out of Time)',
      direction: 'Play E Phrygian up: E–F–G–A–B–C–D–E. F is the ♭2.',
      assessment: 'pitch_order',
      tag: 'hiphop:l3_phrygian_asc_oot | hiphop',
      styleRef: 'l3a',
      successFeedback: 'That F right above E — the darkest colour in minor.',
      scaleIntervals: [0, 1, 3, 5, 7, 8, 10],
      scaleId: 'phrygian',
      targetNotes: [
        { midi: 64, onset: 0, duration: 460 }, // E4
        { midi: 65, onset: 480, duration: 460 }, // F4
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
      module: 'hiphop_l3',
      section: 'A',
      subsection: 'A1: Scale (E Phrygian)',
      activity: 'A1.2: E Phrygian Descending (Out of Time)',
      direction: 'Now back down.',
      assessment: 'pitch_order',
      tag: 'hiphop:l3_phrygian_desc_oot | hiphop',
      styleRef: 'l3a',
      successFeedback: 'Down to F, then E — hear the lean.',
      scaleIntervals: [0, 1, 3, 5, 7, 8, 10],
      scaleId: 'phrygian',
      targetNotes: [
        { midi: 76, onset: 0, duration: 460 }, // E5
        { midi: 74, onset: 480, duration: 460 }, // D5
        { midi: 72, onset: 960, duration: 460 }, // C5
        { midi: 71, onset: 1440, duration: 460 }, // B4
        { midi: 69, onset: 1920, duration: 460 }, // A4
        { midi: 67, onset: 2400, duration: 460 }, // G4
        { midi: 65, onset: 2880, duration: 460 }, // F4
        { midi: 64, onset: 3360, duration: 460 }, // E4
      ],
    },
    {
      stepNumber: 3,
      module: 'hiphop_l3',
      section: 'A',
      subsection: 'A1: Scale (E Phrygian)',
      activity: 'A1.3: E Phrygian — Up & Down (In Time)',
      direction: 'Up and back down, one note per beat.',
      assessment: 'pitch_order_timing',
      tag: 'hiphop:l3_phrygian_updown_it | hiphop',
      styleRef: 'l3a',
      successFeedback: 'Phrygian, in time.',
      scaleIntervals: [0, 1, 3, 5, 7, 8, 10],
      scaleId: 'phrygian',
      targetNotes: [
        { midi: 64, onset: 0, duration: 460 }, // E4
        { midi: 65, onset: 480, duration: 460 }, // F4
        { midi: 67, onset: 960, duration: 460 }, // G4
        { midi: 69, onset: 1440, duration: 460 }, // A4
        { midi: 71, onset: 1920, duration: 460 }, // B4
        { midi: 72, onset: 2400, duration: 460 }, // C5
        { midi: 74, onset: 2880, duration: 460 }, // D5
        { midi: 76, onset: 3360, duration: 460 }, // E5
        { midi: 74, onset: 3840, duration: 460 }, // D5
        { midi: 72, onset: 4320, duration: 460 }, // C5
        { midi: 71, onset: 4800, duration: 460 }, // B4
        { midi: 69, onset: 5280, duration: 460 }, // A4
        { midi: 67, onset: 5760, duration: 460 }, // G4
        { midi: 65, onset: 6240, duration: 460 }, // F4
        { midi: 64, onset: 6720, duration: 460 }, // E4
      ],
    },
    {
      stepNumber: 4,
      module: 'hiphop_l3',
      section: 'A',
      subsection: 'A2: Phrygian Phrase',
      activity: 'A2.1: Phrygian Phrase — the ♭2 Leaning Back',
      direction: 'E, F, back to E — over E minor and F.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l3_phrygian_phrase | hiphop',
      styleRef: 'l3a',
      successFeedback: 'The ♭2 leaning on the root — cinematic.',
      scaleIntervals: [0, 1, 3, 5, 7, 8, 10],
      scaleId: 'phrygian',
      chordSymbols: ['Em', 'F'],
      tempo: 84,
      grooveId: 'boombap_a',
      backing_style: {
        kit: '808',
        bassVoice: '808',
        bassPattern: 'follow_kick',
        comping: 'chunk_eighths_staccato',
        chordRegister: 60,
      },
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 76, onset: 0, duration: 700 }, // E5
        { midi: 77, onset: 720, duration: 700 }, // F5
        { midi: 76, onset: 1440, duration: 460 }, // E5
      ],
    },
    {
      stepNumber: 5,
      module: 'hiphop_l3',
      section: 'A',
      subsection: 'A3: Scale (E Dorian)',
      activity: 'A3.1: E Dorian Ascending (Out of Time)',
      direction: 'Play E Dorian up: E–F♯–G–A–B–C♯–D–E. C♯ is the 6.',
      assessment: 'pitch_order',
      tag: 'hiphop:l3_dorian_asc_oot | hiphop',
      styleRef: 'l3a',
      successFeedback: 'C♯ — the bright 6 that makes Dorian.',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      targetNotes: [
        { midi: 64, onset: 0, duration: 460 }, // E4
        { midi: 66, onset: 480, duration: 460 }, // F♯4
        { midi: 67, onset: 960, duration: 460 }, // G4
        { midi: 69, onset: 1440, duration: 460 }, // A4
        { midi: 71, onset: 1920, duration: 460 }, // B4
        { midi: 73, onset: 2400, duration: 460 }, // C♯5
        { midi: 74, onset: 2880, duration: 460 }, // D5
        { midi: 76, onset: 3360, duration: 460 }, // E5
      ],
    },
    {
      stepNumber: 6,
      module: 'hiphop_l3',
      section: 'A',
      subsection: 'A3: Scale (E Dorian)',
      activity: 'A3.2: E Dorian Descending (Out of Time)',
      direction: 'Now back down.',
      assessment: 'pitch_order',
      tag: 'hiphop:l3_dorian_desc_oot | hiphop',
      styleRef: 'l3a',
      successFeedback: 'Down through C♯.',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      targetNotes: [
        { midi: 76, onset: 0, duration: 460 }, // E5
        { midi: 74, onset: 480, duration: 460 }, // D5
        { midi: 73, onset: 960, duration: 460 }, // C♯5
        { midi: 71, onset: 1440, duration: 460 }, // B4
        { midi: 69, onset: 1920, duration: 460 }, // A4
        { midi: 67, onset: 2400, duration: 460 }, // G4
        { midi: 66, onset: 2880, duration: 460 }, // F♯4
        { midi: 64, onset: 3360, duration: 460 }, // E4
      ],
    },
    {
      stepNumber: 7,
      module: 'hiphop_l3',
      section: 'A',
      subsection: 'A3: Scale (E Dorian)',
      activity: 'A3.3: E Dorian — Up & Down (In Time)',
      direction: 'Up and back down, one note per beat.',
      assessment: 'pitch_order_timing',
      tag: 'hiphop:l3_dorian_updown_it | hiphop',
      styleRef: 'l3a',
      successFeedback: 'Dorian, in time.',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      targetNotes: [
        { midi: 64, onset: 0, duration: 460 }, // E4
        { midi: 66, onset: 480, duration: 460 }, // F♯4
        { midi: 67, onset: 960, duration: 460 }, // G4
        { midi: 69, onset: 1440, duration: 460 }, // A4
        { midi: 71, onset: 1920, duration: 460 }, // B4
        { midi: 73, onset: 2400, duration: 460 }, // C♯5
        { midi: 74, onset: 2880, duration: 460 }, // D5
        { midi: 76, onset: 3360, duration: 460 }, // E5
        { midi: 74, onset: 3840, duration: 460 }, // D5
        { midi: 73, onset: 4320, duration: 460 }, // C♯5
        { midi: 71, onset: 4800, duration: 460 }, // B4
        { midi: 69, onset: 5280, duration: 460 }, // A4
        { midi: 67, onset: 5760, duration: 460 }, // G4
        { midi: 66, onset: 6240, duration: 460 }, // F♯4
        { midi: 64, onset: 6720, duration: 460 }, // E4
      ],
    },
    {
      stepNumber: 8,
      module: 'hiphop_l3',
      section: 'A',
      subsection: 'A4: Dorian Phrase',
      activity: 'A4.1: Dorian Phrase — Swung',
      direction: 'B, C♯, D, E in 8th notes, then back to C♯. Feel the swing.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l3_dorian_phrase | hiphop',
      styleRef: 'l3a',
      successFeedback: 'Swung Dorian — that is the Tribe sound.',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      chordSymbols: ['Em9', 'A/B'],
      tempo: 81,
      swing: 66,
      grooveId: 'boombap_b',
      backing_style: {
        kit: 'house',
        bassVoice: 'upright',
        bassPattern: 'follow_kick',
        comping: 'held',
        chordRegister: 60,
      },
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 71, onset: 0, duration: 220 }, // B4
        { midi: 73, onset: 240, duration: 220 }, // C♯5
        { midi: 74, onset: 480, duration: 220 }, // D5
        { midi: 76, onset: 720, duration: 220 }, // E5
        { midi: 73, onset: 960, duration: 900 }, // C♯5
      ],
    },
    {
      stepNumber: 9,
      module: 'hiphop_l3',
      section: 'A',
      subsection: 'A5: Scale (E Harmonic Minor)',
      activity: 'A5.1: E Harmonic Minor Ascending (Out of Time)',
      direction: 'Play E harmonic minor up: E–F♯–G–A–B–C–D♯–E. D♯ leads home.',
      assessment: 'pitch_order',
      tag: 'hiphop:l3_harmonic_asc_oot | hiphop',
      styleRef: 'l3a',
      successFeedback: 'D♯ to E — the leading tone.',
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
      stepNumber: 10,
      module: 'hiphop_l3',
      section: 'A',
      subsection: 'A5: Scale (E Harmonic Minor)',
      activity: 'A5.2: E Harmonic Minor Descending (Out of Time)',
      direction: 'Now back down — hear the jump from D♯ to C.',
      assessment: 'pitch_order',
      tag: 'hiphop:l3_harmonic_desc_oot | hiphop',
      styleRef: 'l3a',
      successFeedback: 'That gap between C and D♯ — exotic.',
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
      stepNumber: 11,
      module: 'hiphop_l3',
      section: 'A',
      subsection: 'A5: Scale (E Harmonic Minor)',
      activity: 'A5.3: E Harmonic Minor — Up & Down (In Time)',
      direction: 'Up and back down, one note per beat.',
      assessment: 'pitch_order_timing',
      tag: 'hiphop:l3_harmonic_updown_it | hiphop',
      styleRef: 'l3a',
      successFeedback: 'Harmonic minor, in time.',
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
      stepNumber: 12,
      module: 'hiphop_l3',
      section: 'A',
      subsection: 'A6: Harmonic Minor Phrase',
      activity: 'A6.1: Harmonic Minor Phrase — Leading Home',
      direction: 'C, B, A, then down to D♯ — and up a half step to E.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l3_harmonic_phrase | hiphop',
      styleRef: 'l3a',
      successFeedback: 'D♯ to E — resolved.',
      scaleIntervals: [0, 2, 3, 5, 7, 8, 11],
      scaleId: 'harmonic_minor',
      chordSymbols: ['D#dim7', 'Emadd2'],
      tempo: 77,
      grooveId: 'laid_back',
      backing_style: {
        kit: 'house',
        bassVoice: '808',
        bassPattern: 'follow_kick',
        comping: 'held',
        chordRegister: 60,
        bassOffset: -12,
      },
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 72, onset: 0, duration: 460 }, // C5
        { midi: 71, onset: 480, duration: 460 }, // B4
        { midi: 69, onset: 960, duration: 460 }, // A4
        { midi: 63, onset: 1440, duration: 460 }, // D♯4
        { midi: 64, onset: 1920, duration: 1380 }, // E4
      ],
    },
  ],
};

// ── L3 Section B: Chords ──────────────────────────────────────────────────

const hipHopL3SectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    {
      stepNumber: 1,
      module: 'hiphop_l3',
      section: 'B',
      subsection: 'B1: Phrygian Triads',
      activity: 'B1.1: Em → F (Out of Time)',
      direction:
        'E–G–B, then F–A–C. Every note moves up a little — the Phrygian lift.',
      assessment: 'pitch_only',
      tag: 'hiphop:l3_em_f | hiphop',
      styleRef: 'l3a',
      successFeedback: '1 min to ♭2 maj — dark and heavy.',
      chordSymbols: ['Em', 'F', 'Em', 'F'],
      targetNotes: [
        { midi: 76, onset: 0, duration: 1860 }, // E5
        { midi: 79, onset: 0, duration: 1860 }, // G5
        { midi: 83, onset: 0, duration: 1860 }, // B5
        { midi: 77, onset: 1920, duration: 1860 }, // F5
        { midi: 81, onset: 1920, duration: 1860 }, // A5
        { midi: 84, onset: 1920, duration: 1860 }, // C6
        { midi: 76, onset: 3840, duration: 1860 }, // E5
        { midi: 79, onset: 3840, duration: 1860 }, // G5
        { midi: 83, onset: 3840, duration: 1860 }, // B5
        { midi: 77, onset: 5760, duration: 1860 }, // F5
        { midi: 81, onset: 5760, duration: 1860 }, // A5
        { midi: 84, onset: 5760, duration: 1860 }, // C6
      ],
    },
    {
      stepNumber: 2,
      module: 'hiphop_l3',
      section: 'B',
      subsection: 'B1: Phrygian Triads',
      activity: 'B1.2: Play-Along — Em → F',
      direction: 'One bar each, 8th notes, staccato.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l3_playalong_em_f | hiphop',
      styleRef: 'l3a',
      successFeedback: 'Phrygian over the 808 — menacing.',
      chordSymbols: ['Em', 'F', 'Em', 'F'],
      tempo: 84,
      grooveId: 'boombap_a',
      backing_style: {
        kit: '808',
        bassVoice: '808',
        bassPattern: 'follow_kick',
      },
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 76, onset: 0, duration: 90 }, // E5
        { midi: 79, onset: 0, duration: 90 }, // G5
        { midi: 83, onset: 0, duration: 90 }, // B5
        { midi: 76, onset: 240, duration: 90 }, // E5
        { midi: 79, onset: 240, duration: 90 }, // G5
        { midi: 83, onset: 240, duration: 90 }, // B5
        { midi: 76, onset: 480, duration: 90 }, // E5
        { midi: 79, onset: 480, duration: 90 }, // G5
        { midi: 83, onset: 480, duration: 90 }, // B5
        { midi: 76, onset: 720, duration: 90 }, // E5
        { midi: 79, onset: 720, duration: 90 }, // G5
        { midi: 83, onset: 720, duration: 90 }, // B5
        { midi: 76, onset: 960, duration: 90 }, // E5
        { midi: 79, onset: 960, duration: 90 }, // G5
        { midi: 83, onset: 960, duration: 90 }, // B5
        { midi: 76, onset: 1200, duration: 90 }, // E5
        { midi: 79, onset: 1200, duration: 90 }, // G5
        { midi: 83, onset: 1200, duration: 90 }, // B5
        { midi: 76, onset: 1440, duration: 90 }, // E5
        { midi: 79, onset: 1440, duration: 90 }, // G5
        { midi: 83, onset: 1440, duration: 90 }, // B5
        { midi: 76, onset: 1680, duration: 90 }, // E5
        { midi: 79, onset: 1680, duration: 90 }, // G5
        { midi: 83, onset: 1680, duration: 90 }, // B5
        { midi: 77, onset: 1920, duration: 90 }, // F5
        { midi: 81, onset: 1920, duration: 90 }, // A5
        { midi: 84, onset: 1920, duration: 90 }, // C6
        { midi: 77, onset: 2160, duration: 90 }, // F5
        { midi: 81, onset: 2160, duration: 90 }, // A5
        { midi: 84, onset: 2160, duration: 90 }, // C6
        { midi: 77, onset: 2400, duration: 90 }, // F5
        { midi: 81, onset: 2400, duration: 90 }, // A5
        { midi: 84, onset: 2400, duration: 90 }, // C6
        { midi: 77, onset: 2640, duration: 90 }, // F5
        { midi: 81, onset: 2640, duration: 90 }, // A5
        { midi: 84, onset: 2640, duration: 90 }, // C6
        { midi: 77, onset: 2880, duration: 90 }, // F5
        { midi: 81, onset: 2880, duration: 90 }, // A5
        { midi: 84, onset: 2880, duration: 90 }, // C6
        { midi: 77, onset: 3120, duration: 90 }, // F5
        { midi: 81, onset: 3120, duration: 90 }, // A5
        { midi: 84, onset: 3120, duration: 90 }, // C6
        { midi: 77, onset: 3360, duration: 90 }, // F5
        { midi: 81, onset: 3360, duration: 90 }, // A5
        { midi: 84, onset: 3360, duration: 90 }, // C6
        { midi: 77, onset: 3600, duration: 90 }, // F5
        { midi: 81, onset: 3600, duration: 90 }, // A5
        { midi: 84, onset: 3600, duration: 90 }, // C6
        { midi: 76, onset: 3840, duration: 90 }, // E5
        { midi: 79, onset: 3840, duration: 90 }, // G5
        { midi: 83, onset: 3840, duration: 90 }, // B5
        { midi: 76, onset: 4080, duration: 90 }, // E5
        { midi: 79, onset: 4080, duration: 90 }, // G5
        { midi: 83, onset: 4080, duration: 90 }, // B5
        { midi: 76, onset: 4320, duration: 90 }, // E5
        { midi: 79, onset: 4320, duration: 90 }, // G5
        { midi: 83, onset: 4320, duration: 90 }, // B5
        { midi: 76, onset: 4560, duration: 90 }, // E5
        { midi: 79, onset: 4560, duration: 90 }, // G5
        { midi: 83, onset: 4560, duration: 90 }, // B5
        { midi: 76, onset: 4800, duration: 90 }, // E5
        { midi: 79, onset: 4800, duration: 90 }, // G5
        { midi: 83, onset: 4800, duration: 90 }, // B5
        { midi: 76, onset: 5040, duration: 90 }, // E5
        { midi: 79, onset: 5040, duration: 90 }, // G5
        { midi: 83, onset: 5040, duration: 90 }, // B5
        { midi: 76, onset: 5280, duration: 90 }, // E5
        { midi: 79, onset: 5280, duration: 90 }, // G5
        { midi: 83, onset: 5280, duration: 90 }, // B5
        { midi: 76, onset: 5520, duration: 90 }, // E5
        { midi: 79, onset: 5520, duration: 90 }, // G5
        { midi: 83, onset: 5520, duration: 90 }, // B5
        { midi: 77, onset: 5760, duration: 90 }, // F5
        { midi: 81, onset: 5760, duration: 90 }, // A5
        { midi: 84, onset: 5760, duration: 90 }, // C6
        { midi: 77, onset: 6000, duration: 90 }, // F5
        { midi: 81, onset: 6000, duration: 90 }, // A5
        { midi: 84, onset: 6000, duration: 90 }, // C6
        { midi: 77, onset: 6240, duration: 90 }, // F5
        { midi: 81, onset: 6240, duration: 90 }, // A5
        { midi: 84, onset: 6240, duration: 90 }, // C6
        { midi: 77, onset: 6480, duration: 90 }, // F5
        { midi: 81, onset: 6480, duration: 90 }, // A5
        { midi: 84, onset: 6480, duration: 90 }, // C6
        { midi: 77, onset: 6720, duration: 90 }, // F5
        { midi: 81, onset: 6720, duration: 90 }, // A5
        { midi: 84, onset: 6720, duration: 90 }, // C6
        { midi: 77, onset: 6960, duration: 90 }, // F5
        { midi: 81, onset: 6960, duration: 90 }, // A5
        { midi: 84, onset: 6960, duration: 90 }, // C6
        { midi: 77, onset: 7200, duration: 90 }, // F5
        { midi: 81, onset: 7200, duration: 90 }, // A5
        { midi: 84, onset: 7200, duration: 90 }, // C6
        { midi: 77, onset: 7440, duration: 90 }, // F5
        { midi: 81, onset: 7440, duration: 90 }, // A5
        { midi: 84, onset: 7440, duration: 90 }, // C6
      ],
    },
    {
      stepNumber: 3,
      module: 'hiphop_l3',
      section: 'B',
      subsection: 'B2: Dorian Colours',
      activity: 'B2.1: Em9 (Out of Time)',
      direction: 'Left hand on E. Right hand G–B–D–F♯: the 3, 5, 7 and 9.',
      assessment: 'pitch_only',
      tag: 'hiphop:l3_em9 | hiphop',
      styleRef: 'l3a',
      successFeedback: 'Em9 — that is the Rhodes sound of conscious hip hop.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      chordSymbols: ['Em9'],
      targetNotes: [
        { midi: 40, onset: 0, duration: 1860, hand: 'lh' }, // E2
        { midi: 40, onset: 1920, duration: 1860, hand: 'lh' }, // E2
        { midi: 79, onset: 0, duration: 1860, hand: 'rh' }, // G5
        { midi: 83, onset: 0, duration: 1860, hand: 'rh' }, // B5
        { midi: 86, onset: 0, duration: 1860, hand: 'rh' }, // D6
        { midi: 90, onset: 0, duration: 1860, hand: 'rh' }, // F♯6
        { midi: 79, onset: 1920, duration: 1860, hand: 'rh' }, // G5
        { midi: 83, onset: 1920, duration: 1860, hand: 'rh' }, // B5
        { midi: 86, onset: 1920, duration: 1860, hand: 'rh' }, // D6
        { midi: 90, onset: 1920, duration: 1860, hand: 'rh' }, // F♯6
      ],
    },
    {
      stepNumber: 4,
      module: 'hiphop_l3',
      section: 'B',
      subsection: 'B2: Dorian Colours',
      activity: 'B2.2: A/B (Out of Time)',
      direction: 'Left hand on B. Right hand plays an A major triad: A–C♯–E.',
      assessment: 'pitch_only',
      tag: 'hiphop:l3_a_over_b | hiphop',
      styleRef: 'l3a',
      successFeedback: 'A triad over B — a whole colour in one shape.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      chordSymbols: ['A/B'],
      targetNotes: [
        { midi: 35, onset: 0, duration: 1860, hand: 'lh' }, // B1
        { midi: 35, onset: 1920, duration: 1860, hand: 'lh' }, // B1
        { midi: 81, onset: 0, duration: 1860, hand: 'rh' }, // A5
        { midi: 85, onset: 0, duration: 1860, hand: 'rh' }, // C♯6
        { midi: 88, onset: 0, duration: 1860, hand: 'rh' }, // E6
        { midi: 81, onset: 1920, duration: 1860, hand: 'rh' }, // A5
        { midi: 85, onset: 1920, duration: 1860, hand: 'rh' }, // C♯6
        { midi: 88, onset: 1920, duration: 1860, hand: 'rh' }, // E6
      ],
    },
    {
      stepNumber: 5,
      module: 'hiphop_l3',
      section: 'B',
      subsection: 'B2: Dorian Colours',
      activity: 'B2.3: Play-Along — Em9 → A/B',
      direction: 'Hold each chord for the bar. The groove is swung.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l3_playalong_em9_ab | hiphop',
      styleRef: 'l3a',
      successFeedback: 'Swung, warm, upright bass — conscious hip hop.',
      chordSymbols: ['Em9', 'A/B', 'Em9', 'A/B'],
      tempo: 81,
      swing: 66,
      grooveId: 'boombap_b',
      backing_style: {
        kit: 'house',
        bassVoice: 'upright',
        bassPattern: 'follow_kick',
      },
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 79, onset: 0, duration: 1860 }, // G5
        { midi: 83, onset: 0, duration: 1860 }, // B5
        { midi: 86, onset: 0, duration: 1860 }, // D6
        { midi: 90, onset: 0, duration: 1860 }, // F♯6
        { midi: 81, onset: 1920, duration: 1860 }, // A5
        { midi: 85, onset: 1920, duration: 1860 }, // C♯6
        { midi: 88, onset: 1920, duration: 1860 }, // E6
        { midi: 79, onset: 3840, duration: 1860 }, // G5
        { midi: 83, onset: 3840, duration: 1860 }, // B5
        { midi: 86, onset: 3840, duration: 1860 }, // D6
        { midi: 90, onset: 3840, duration: 1860 }, // F♯6
        { midi: 81, onset: 5760, duration: 1860 }, // A5
        { midi: 85, onset: 5760, duration: 1860 }, // C♯6
        { midi: 88, onset: 5760, duration: 1860 }, // E6
      ],
    },
    {
      stepNumber: 6,
      module: 'hiphop_l3',
      section: 'B',
      subsection: 'B3: Harmonic Minor',
      activity: 'B3.1: D♯dim7 → Em add2 Arpeggios (Out of Time)',
      direction: 'Up through D♯–F♯–A–C, then E–F♯–G–B.',
      assessment: 'pitch_order',
      tag: 'hiphop:l3_arp_ds7_emadd2 | hiphop',
      styleRef: 'l3a',
      successFeedback: 'Diminished tension, then home.',
      chordSymbols: ['D#dim7', 'Emadd2'],
      targetNotes: [
        { midi: 75, onset: 0, duration: 460 }, // D♯5
        { midi: 78, onset: 480, duration: 460 }, // F♯5
        { midi: 81, onset: 960, duration: 460 }, // A5
        { midi: 84, onset: 1440, duration: 460 }, // C6
        { midi: 76, onset: 1920, duration: 460 }, // E5
        { midi: 78, onset: 2400, duration: 460 }, // F♯5
        { midi: 79, onset: 2880, duration: 460 }, // G5
        { midi: 83, onset: 3360, duration: 460 }, // B5
      ],
    },
    {
      stepNumber: 7,
      module: 'hiphop_l3',
      section: 'B',
      subsection: 'B3: Harmonic Minor',
      activity: 'B3.2: Play-Along — D♯dim7 → Em add2',
      direction:
        'Ascending 8th-note arpeggios, twice a bar: D♯–F♯–A–C ×2, then E–F♯–G–B ×2.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l3_playalong_ds7_emadd2 | hiphop',
      styleRef: 'l3a',
      successFeedback: 'The bass steps up D♯ to E with you.',
      chordSymbols: ['D#dim7', 'Emadd2', 'D#dim7', 'Emadd2'],
      tempo: 77,
      grooveId: 'laid_back',
      backing_style: {
        kit: 'house',
        bassVoice: '808',
        bassPattern: 'follow_kick',
        bassOffset: -12,
      },
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 75, onset: 0, duration: 220 }, // D♯5
        { midi: 78, onset: 240, duration: 220 }, // F♯5
        { midi: 81, onset: 480, duration: 220 }, // A5
        { midi: 84, onset: 720, duration: 220 }, // C6
        { midi: 75, onset: 960, duration: 220 }, // D♯5
        { midi: 78, onset: 1200, duration: 220 }, // F♯5
        { midi: 81, onset: 1440, duration: 220 }, // A5
        { midi: 84, onset: 1680, duration: 220 }, // C6
        { midi: 76, onset: 1920, duration: 220 }, // E5
        { midi: 78, onset: 2160, duration: 220 }, // F♯5
        { midi: 79, onset: 2400, duration: 220 }, // G5
        { midi: 83, onset: 2640, duration: 220 }, // B5
        { midi: 76, onset: 2880, duration: 220 }, // E5
        { midi: 78, onset: 3120, duration: 220 }, // F♯5
        { midi: 79, onset: 3360, duration: 220 }, // G5
        { midi: 83, onset: 3600, duration: 220 }, // B5
        { midi: 75, onset: 3840, duration: 220 }, // D♯5
        { midi: 78, onset: 4080, duration: 220 }, // F♯5
        { midi: 81, onset: 4320, duration: 220 }, // A5
        { midi: 84, onset: 4560, duration: 220 }, // C6
        { midi: 75, onset: 4800, duration: 220 }, // D♯5
        { midi: 78, onset: 5040, duration: 220 }, // F♯5
        { midi: 81, onset: 5280, duration: 220 }, // A5
        { midi: 84, onset: 5520, duration: 220 }, // C6
        { midi: 76, onset: 5760, duration: 220 }, // E5
        { midi: 78, onset: 6000, duration: 220 }, // F♯5
        { midi: 79, onset: 6240, duration: 220 }, // G5
        { midi: 83, onset: 6480, duration: 220 }, // B5
        { midi: 76, onset: 6720, duration: 220 }, // E5
        { midi: 78, onset: 6960, duration: 220 }, // F♯5
        { midi: 79, onset: 7200, duration: 220 }, // G5
        { midi: 83, onset: 7440, duration: 220 }, // B5
      ],
    },
    {
      stepNumber: 8,
      module: 'hiphop_l3',
      section: 'B',
      subsection: 'B4: Jazzy Progression',
      activity: 'B4.1: Am7 → B7♭9 → Em9 (Out of Time)',
      direction: 'A–C–E–G, then A–C–D♯–F♯ (A and C stay), then G–B–D–F♯.',
      assessment: 'pitch_only',
      tag: 'hiphop:l3_am7_b7b9_em9 | hiphop',
      styleRef: 'l3a',
      successFeedback: 'Two notes held, two moving — jazz voice leading.',
      chordSymbols: ['Am7', 'B7b9', 'Em9', 'Em9'],
      targetNotes: [
        { midi: 81, onset: 0, duration: 1860 }, // A5
        { midi: 84, onset: 0, duration: 1860 }, // C6
        { midi: 88, onset: 0, duration: 1860 }, // E6
        { midi: 91, onset: 0, duration: 1860 }, // G6
        { midi: 81, onset: 1920, duration: 1860 }, // A5
        { midi: 84, onset: 1920, duration: 1860 }, // C6
        { midi: 87, onset: 1920, duration: 1860 }, // D♯6
        { midi: 90, onset: 1920, duration: 1860 }, // F♯6
        { midi: 79, onset: 3840, duration: 1860 }, // G5
        { midi: 83, onset: 3840, duration: 1860 }, // B5
        { midi: 86, onset: 3840, duration: 1860 }, // D6
        { midi: 90, onset: 3840, duration: 1860 }, // F♯6
        { midi: 79, onset: 5760, duration: 1860 }, // G5
        { midi: 83, onset: 5760, duration: 1860 }, // B5
        { midi: 86, onset: 5760, duration: 1860 }, // D6
        { midi: 90, onset: 5760, duration: 1860 }, // F♯6
      ],
    },
    {
      stepNumber: 9,
      module: 'hiphop_l3',
      section: 'B',
      subsection: 'B4: Jazzy Progression',
      activity: 'B4.2: Play-Along — Am7 → B7♭9 → Em9',
      direction: 'Hold each chord for the bar. Swung.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l3_playalong_am7_b7b9_em9 | hiphop',
      styleRef: 'l3a',
      successFeedback: 'Jazz harmony over boom bap — Glasper would nod.',
      chordSymbols: ['Am7', 'B7b9', 'Em9', 'Em9'],
      tempo: 81,
      swing: 66,
      grooveId: 'boombap_b',
      backing_style: {
        kit: 'house',
        bassVoice: 'upright',
        bassPattern: 'follow_kick',
      },
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 81, onset: 0, duration: 1860 }, // A5
        { midi: 84, onset: 0, duration: 1860 }, // C6
        { midi: 88, onset: 0, duration: 1860 }, // E6
        { midi: 91, onset: 0, duration: 1860 }, // G6
        { midi: 81, onset: 1920, duration: 1860 }, // A5
        { midi: 84, onset: 1920, duration: 1860 }, // C6
        { midi: 87, onset: 1920, duration: 1860 }, // D♯6
        { midi: 90, onset: 1920, duration: 1860 }, // F♯6
        { midi: 79, onset: 3840, duration: 1860 }, // G5
        { midi: 83, onset: 3840, duration: 1860 }, // B5
        { midi: 86, onset: 3840, duration: 1860 }, // D6
        { midi: 90, onset: 3840, duration: 1860 }, // F♯6
        { midi: 79, onset: 5760, duration: 1860 }, // G5
        { midi: 83, onset: 5760, duration: 1860 }, // B5
        { midi: 86, onset: 5760, duration: 1860 }, // D6
        { midi: 90, onset: 5760, duration: 1860 }, // F♯6
      ],
    },
  ],
};

// ── L3 Section C: Bass ──────────────────────────────────────────────────

const hipHopL3SectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 1,
      module: 'hiphop_l3',
      section: 'C',
      subsection: 'C1: Roots',
      activity: 'C1.1: Phrygian Roots — E → F',
      direction: 'E with the kick, then F — up a half step.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l3_bass_e_f | hiphop',
      styleRef: 'l3a',
      successFeedback: 'The ♭2 in the bass — heavy.',
      chordSymbols: ['Em', 'F'],
      tempo: 84,
      grooveId: 'boombap_a',
      backing_style: {
        kit: '808',
        bassVoice: '808',
        bassPattern: 'follow_kick',
        comping: 'held',
        chordRegister: 72,
      },
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 40, onset: 0, duration: 1180 }, // E2
        { midi: 40, onset: 1200, duration: 700 }, // E2
        { midi: 41, onset: 1920, duration: 820 }, // F2
        { midi: 41, onset: 2760, duration: 340 }, // F2
        { midi: 41, onset: 3120, duration: 700 }, // F2
      ],
    },
    {
      stepNumber: 2,
      module: 'hiphop_l3',
      section: 'C',
      subsection: 'C1: Roots',
      activity: 'C1.2: Dorian Roots — E → B',
      direction: 'E under Em9, then B under A/B.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l3_bass_e_b | hiphop',
      styleRef: 'l3a',
      successFeedback: 'B in the bass turns an A triad into A/B.',
      chordSymbols: ['Em9', 'A/B'],
      tempo: 81,
      swing: 66,
      grooveId: 'boombap_b',
      backing_style: {
        kit: 'house',
        bassVoice: 'upright',
        bassPattern: 'follow_kick',
        comping: 'held',
        chordRegister: 72,
      },
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 40, onset: 0, duration: 220 }, // E2
        { midi: 40, onset: 240, duration: 940 }, // E2
        { midi: 40, onset: 1200, duration: 700 }, // E2
        { midi: 35, onset: 1920, duration: 220 }, // B1
        { midi: 35, onset: 2160, duration: 940 }, // B1
        { midi: 35, onset: 3120, duration: 340 }, // B1
        { midi: 35, onset: 3480, duration: 340 }, // B1
      ],
    },
    {
      stepNumber: 3,
      module: 'hiphop_l3',
      section: 'C',
      subsection: 'C1: Roots',
      activity: 'C1.3: Harmonic Minor — D♯ → E',
      direction:
        'D♯ with the kick, then E — up a half step, never down the 7th.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l3_bass_ds_e | hiphop',
      styleRef: 'l3a',
      successFeedback: 'Leading tone in the bass.',
      chordSymbols: ['D#dim7', 'Emadd2'],
      tempo: 77,
      grooveId: 'laid_back',
      backing_style: {
        kit: 'house',
        bassVoice: '808',
        bassPattern: 'follow_kick',
        comping: 'held',
        chordRegister: 72,
        bassOffset: -12,
      },
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 39, onset: 0, duration: 820 }, // D♯2
        { midi: 39, onset: 840, duration: 340 }, // D♯2
        { midi: 39, onset: 1200, duration: 700 }, // D♯2
        { midi: 40, onset: 1920, duration: 220 }, // E2
        { midi: 40, onset: 2160, duration: 940 }, // E2
        { midi: 40, onset: 3120, duration: 340 }, // E2
        { midi: 40, onset: 3480, duration: 340 }, // E2
      ],
    },
    {
      stepNumber: 4,
      module: 'hiphop_l3',
      section: 'C',
      subsection: 'C1: Roots',
      activity: 'C1.4: A → B → E (Out of Time)',
      direction: 'The roots of Am7, B7♭9 and Em9, one per bar.',
      assessment: 'pitch_order',
      tag: 'hiphop:l3_bass_a_b_e | hiphop',
      styleRef: 'l3a',
      successFeedback: 'A, B, E — the bones of the progression.',
      chordSymbols: ['Am7', 'B7b9', 'Em9'],
      targetNotes: [
        { midi: 45, onset: 0, duration: 1860 }, // A2
        { midi: 47, onset: 1920, duration: 1860 }, // B2
        { midi: 40, onset: 3840, duration: 1860 }, // E2
      ],
    },
    {
      stepNumber: 5,
      module: 'hiphop_l3',
      section: 'C',
      subsection: 'C2: Bass Play-Along',
      activity: 'C2.1: Bass Play-Along — Am7 → B7♭9 → Em9',
      direction: 'A, B, E locked to the kick. Swung.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l3_bass_playalong_jazz | hiphop',
      styleRef: 'l3a',
      successFeedback: 'Upright feel, swung — real conscious hip hop bass.',
      chordSymbols: ['Am7', 'B7b9', 'Em9', 'Em9'],
      tempo: 81,
      swing: 66,
      grooveId: 'boombap_b',
      backing_style: {
        kit: 'house',
        bassVoice: 'upright',
        bassPattern: 'follow_kick',
        comping: 'held',
        chordRegister: 72,
      },
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 45, onset: 0, duration: 220 }, // A2
        { midi: 45, onset: 240, duration: 940 }, // A2
        { midi: 45, onset: 1200, duration: 700 }, // A2
        { midi: 47, onset: 1920, duration: 220 }, // B2
        { midi: 47, onset: 2160, duration: 940 }, // B2
        { midi: 47, onset: 3120, duration: 340 }, // B2
        { midi: 47, onset: 3480, duration: 340 }, // B2
        { midi: 40, onset: 3840, duration: 220 }, // E2
        { midi: 40, onset: 4080, duration: 940 }, // E2
        { midi: 40, onset: 5040, duration: 700 }, // E2
        { midi: 40, onset: 5760, duration: 220 }, // E2
        { midi: 40, onset: 6000, duration: 940 }, // E2
        { midi: 40, onset: 6960, duration: 340 }, // E2
        { midi: 40, onset: 7320, duration: 340 }, // E2
      ],
    },
  ],
};

// ── L3 Section D: Performance ──────────────────────────────────────────────────

const hipHopL3SectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 1,
      module: 'hiphop_l3',
      section: 'D',
      subsection: 'D1: Two-Hand Colours',
      activity: 'D1.1: Em9 → A/B, Two Hands',
      direction: 'Left hand E, then B. Right hand as you learned it. Swung.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l3_perf_em9_ab | hiphop',
      styleRef: 'l3a',
      successFeedback: 'Both hands, swung — that is the record.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      chordSymbols: ['Em9', 'A/B', 'Em9', 'A/B'],
      tempo: 81,
      swing: 66,
      grooveId: 'boombap_b',
      backing_style: { kit: 'house', bassVoice: 'upright' },
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 40, onset: 0, duration: 1860, hand: 'lh' }, // E2
        { midi: 35, onset: 1920, duration: 1860, hand: 'lh' }, // B1
        { midi: 40, onset: 3840, duration: 1860, hand: 'lh' }, // E2
        { midi: 35, onset: 5760, duration: 1860, hand: 'lh' }, // B1
        { midi: 79, onset: 0, duration: 1860, hand: 'rh' }, // G5
        { midi: 83, onset: 0, duration: 1860, hand: 'rh' }, // B5
        { midi: 86, onset: 0, duration: 1860, hand: 'rh' }, // D6
        { midi: 90, onset: 0, duration: 1860, hand: 'rh' }, // F♯6
        { midi: 81, onset: 1920, duration: 1860, hand: 'rh' }, // A5
        { midi: 85, onset: 1920, duration: 1860, hand: 'rh' }, // C♯6
        { midi: 88, onset: 1920, duration: 1860, hand: 'rh' }, // E6
        { midi: 79, onset: 3840, duration: 1860, hand: 'rh' }, // G5
        { midi: 83, onset: 3840, duration: 1860, hand: 'rh' }, // B5
        { midi: 86, onset: 3840, duration: 1860, hand: 'rh' }, // D6
        { midi: 90, onset: 3840, duration: 1860, hand: 'rh' }, // F♯6
        { midi: 81, onset: 5760, duration: 1860, hand: 'rh' }, // A5
        { midi: 85, onset: 5760, duration: 1860, hand: 'rh' }, // C♯6
        { midi: 88, onset: 5760, duration: 1860, hand: 'rh' }, // E6
      ],
    },
    {
      stepNumber: 2,
      module: 'hiphop_l3',
      section: 'D',
      subsection: 'D1: Two-Hand Colours',
      activity: 'D1.2: Am7 → B7♭9 → Em9, Two Hands',
      direction: 'Left hand A, B, E. Right hand the jazz voicings.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l3_perf_jazz | hiphop',
      styleRef: 'l3a',
      successFeedback: 'A full conscious hip hop progression.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      chordSymbols: ['Am7', 'B7b9', 'Em9', 'Em9'],
      tempo: 81,
      swing: 66,
      grooveId: 'boombap_b',
      backing_style: { kit: 'house', bassVoice: 'upright' },
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 45, onset: 0, duration: 1860, hand: 'lh' }, // A2
        { midi: 47, onset: 1920, duration: 1860, hand: 'lh' }, // B2
        { midi: 40, onset: 3840, duration: 1860, hand: 'lh' }, // E2
        { midi: 40, onset: 5760, duration: 1860, hand: 'lh' }, // E2
        { midi: 81, onset: 0, duration: 1860, hand: 'rh' }, // A5
        { midi: 84, onset: 0, duration: 1860, hand: 'rh' }, // C6
        { midi: 88, onset: 0, duration: 1860, hand: 'rh' }, // E6
        { midi: 91, onset: 0, duration: 1860, hand: 'rh' }, // G6
        { midi: 81, onset: 1920, duration: 1860, hand: 'rh' }, // A5
        { midi: 84, onset: 1920, duration: 1860, hand: 'rh' }, // C6
        { midi: 87, onset: 1920, duration: 1860, hand: 'rh' }, // D♯6
        { midi: 90, onset: 1920, duration: 1860, hand: 'rh' }, // F♯6
        { midi: 79, onset: 3840, duration: 1860, hand: 'rh' }, // G5
        { midi: 83, onset: 3840, duration: 1860, hand: 'rh' }, // B5
        { midi: 86, onset: 3840, duration: 1860, hand: 'rh' }, // D6
        { midi: 90, onset: 3840, duration: 1860, hand: 'rh' }, // F♯6
        { midi: 79, onset: 5760, duration: 1860, hand: 'rh' }, // G5
        { midi: 83, onset: 5760, duration: 1860, hand: 'rh' }, // B5
        { midi: 86, onset: 5760, duration: 1860, hand: 'rh' }, // D6
        { midi: 90, onset: 5760, duration: 1860, hand: 'rh' }, // F♯6
      ],
    },
    {
      stepNumber: 3,
      module: 'hiphop_l3',
      section: 'D',
      subsection: 'D2: Phrygian Jam',
      activity: 'D2.1: Phrygian Jam, Two Hands',
      direction: 'Left hand E, then F. Right hand Em → F in staccato 8ths.',
      assessment: 'pitch_order_timing_duration',
      tag: 'hiphop:l3_perf_phrygian | hiphop',
      styleRef: 'l3a',
      successFeedback: 'Dark, heavy and in the pocket.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      chordSymbols: ['Em', 'F', 'Em', 'F'],
      tempo: 84,
      grooveId: 'boombap_a',
      backing_style: { kit: '808', bassVoice: '808' },
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        { midi: 40, onset: 0, duration: 1860, hand: 'lh' }, // E2
        { midi: 41, onset: 1920, duration: 1860, hand: 'lh' }, // F2
        { midi: 40, onset: 3840, duration: 1860, hand: 'lh' }, // E2
        { midi: 41, onset: 5760, duration: 1860, hand: 'lh' }, // F2
        { midi: 76, onset: 0, duration: 90, hand: 'rh' }, // E5
        { midi: 79, onset: 0, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 0, duration: 90, hand: 'rh' }, // B5
        { midi: 76, onset: 240, duration: 90, hand: 'rh' }, // E5
        { midi: 79, onset: 240, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 240, duration: 90, hand: 'rh' }, // B5
        { midi: 76, onset: 480, duration: 90, hand: 'rh' }, // E5
        { midi: 79, onset: 480, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 480, duration: 90, hand: 'rh' }, // B5
        { midi: 76, onset: 720, duration: 90, hand: 'rh' }, // E5
        { midi: 79, onset: 720, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 720, duration: 90, hand: 'rh' }, // B5
        { midi: 76, onset: 960, duration: 90, hand: 'rh' }, // E5
        { midi: 79, onset: 960, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 960, duration: 90, hand: 'rh' }, // B5
        { midi: 76, onset: 1200, duration: 90, hand: 'rh' }, // E5
        { midi: 79, onset: 1200, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 1200, duration: 90, hand: 'rh' }, // B5
        { midi: 76, onset: 1440, duration: 90, hand: 'rh' }, // E5
        { midi: 79, onset: 1440, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 1440, duration: 90, hand: 'rh' }, // B5
        { midi: 76, onset: 1680, duration: 90, hand: 'rh' }, // E5
        { midi: 79, onset: 1680, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 1680, duration: 90, hand: 'rh' }, // B5
        { midi: 77, onset: 1920, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 1920, duration: 90, hand: 'rh' }, // A5
        { midi: 84, onset: 1920, duration: 90, hand: 'rh' }, // C6
        { midi: 77, onset: 2160, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 2160, duration: 90, hand: 'rh' }, // A5
        { midi: 84, onset: 2160, duration: 90, hand: 'rh' }, // C6
        { midi: 77, onset: 2400, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 2400, duration: 90, hand: 'rh' }, // A5
        { midi: 84, onset: 2400, duration: 90, hand: 'rh' }, // C6
        { midi: 77, onset: 2640, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 2640, duration: 90, hand: 'rh' }, // A5
        { midi: 84, onset: 2640, duration: 90, hand: 'rh' }, // C6
        { midi: 77, onset: 2880, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 2880, duration: 90, hand: 'rh' }, // A5
        { midi: 84, onset: 2880, duration: 90, hand: 'rh' }, // C6
        { midi: 77, onset: 3120, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 3120, duration: 90, hand: 'rh' }, // A5
        { midi: 84, onset: 3120, duration: 90, hand: 'rh' }, // C6
        { midi: 77, onset: 3360, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 3360, duration: 90, hand: 'rh' }, // A5
        { midi: 84, onset: 3360, duration: 90, hand: 'rh' }, // C6
        { midi: 77, onset: 3600, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 3600, duration: 90, hand: 'rh' }, // A5
        { midi: 84, onset: 3600, duration: 90, hand: 'rh' }, // C6
        { midi: 76, onset: 3840, duration: 90, hand: 'rh' }, // E5
        { midi: 79, onset: 3840, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 3840, duration: 90, hand: 'rh' }, // B5
        { midi: 76, onset: 4080, duration: 90, hand: 'rh' }, // E5
        { midi: 79, onset: 4080, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 4080, duration: 90, hand: 'rh' }, // B5
        { midi: 76, onset: 4320, duration: 90, hand: 'rh' }, // E5
        { midi: 79, onset: 4320, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 4320, duration: 90, hand: 'rh' }, // B5
        { midi: 76, onset: 4560, duration: 90, hand: 'rh' }, // E5
        { midi: 79, onset: 4560, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 4560, duration: 90, hand: 'rh' }, // B5
        { midi: 76, onset: 4800, duration: 90, hand: 'rh' }, // E5
        { midi: 79, onset: 4800, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 4800, duration: 90, hand: 'rh' }, // B5
        { midi: 76, onset: 5040, duration: 90, hand: 'rh' }, // E5
        { midi: 79, onset: 5040, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 5040, duration: 90, hand: 'rh' }, // B5
        { midi: 76, onset: 5280, duration: 90, hand: 'rh' }, // E5
        { midi: 79, onset: 5280, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 5280, duration: 90, hand: 'rh' }, // B5
        { midi: 76, onset: 5520, duration: 90, hand: 'rh' }, // E5
        { midi: 79, onset: 5520, duration: 90, hand: 'rh' }, // G5
        { midi: 83, onset: 5520, duration: 90, hand: 'rh' }, // B5
        { midi: 77, onset: 5760, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 5760, duration: 90, hand: 'rh' }, // A5
        { midi: 84, onset: 5760, duration: 90, hand: 'rh' }, // C6
        { midi: 77, onset: 6000, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 6000, duration: 90, hand: 'rh' }, // A5
        { midi: 84, onset: 6000, duration: 90, hand: 'rh' }, // C6
        { midi: 77, onset: 6240, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 6240, duration: 90, hand: 'rh' }, // A5
        { midi: 84, onset: 6240, duration: 90, hand: 'rh' }, // C6
        { midi: 77, onset: 6480, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 6480, duration: 90, hand: 'rh' }, // A5
        { midi: 84, onset: 6480, duration: 90, hand: 'rh' }, // C6
        { midi: 77, onset: 6720, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 6720, duration: 90, hand: 'rh' }, // A5
        { midi: 84, onset: 6720, duration: 90, hand: 'rh' }, // C6
        { midi: 77, onset: 6960, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 6960, duration: 90, hand: 'rh' }, // A5
        { midi: 84, onset: 6960, duration: 90, hand: 'rh' }, // C6
        { midi: 77, onset: 7200, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 7200, duration: 90, hand: 'rh' }, // A5
        { midi: 84, onset: 7200, duration: 90, hand: 'rh' }, // C6
        { midi: 77, onset: 7440, duration: 90, hand: 'rh' }, // F5
        { midi: 81, onset: 7440, duration: 90, hand: 'rh' }, // A5
        { midi: 84, onset: 7440, duration: 90, hand: 'rh' }, // C6
      ],
    },
  ],
};

export const hipHopL1: ActivityFlowV2 = {
  genre: 'hip-hop',
  level: 1,
  version: 'v2',
  title: 'Trap',
  params: {
    defaultKey: 'C minor',
    defaultScale: [0, 3, 5, 7, 10],
    defaultScaleId: 'minor_pentatonic',
    // Lessons open at the bottom of the range; every L1 play-along is at 72.
    tempoRange: [72, 80],
    swing: 0,
    grooves: ['trap_a', 'trap_b'],
    practiceTrack: { bpm: 72 },
  },
  sections: [
    hipHopL1SectionA,
    hipHopL1SectionB,
    hipHopL1SectionC,
    hipHopL1SectionD,
  ],
};
export const hipHopL2: ActivityFlowV2 = {
  genre: 'hip-hop',
  level: 2,
  version: 'v2',
  title: 'Boom Bap',
  params: {
    defaultKey: 'A minor',
    defaultScale: [0, 3, 5, 6, 7, 10],
    defaultScaleId: 'minor_blues',
    // Each play-along step sets its own tempo (ActivityStepV2.tempo).
    tempoRange: [87, 95],
    swing: 0,
    grooves: ['boombap_a', 'boombap_b'],
  },
  sections: [
    hipHopL2SectionA,
    hipHopL2SectionB,
    hipHopL2SectionC,
    hipHopL2SectionD,
  ],
};
export const hipHopL3: ActivityFlowV2 = {
  genre: 'hip-hop',
  level: 3,
  version: 'v2',
  title: 'Conscious',
  params: {
    defaultKey: 'E minor',
    defaultScale: [0, 1, 3, 5, 7, 8, 10],
    defaultScaleId: 'phrygian',
    // Each play-along step sets its own tempo (ActivityStepV2.tempo).
    tempoRange: [77, 84],
    swing: 0,
    grooves: ['boombap_a', 'boombap_b', 'laid_back'],
  },
  sections: [
    hipHopL3SectionA,
    hipHopL3SectionB,
    hipHopL3SectionC,
    hipHopL3SectionD,
  ],
};
export const hipHopFlows = [hipHopL1, hipHopL2, hipHopL3] as const;
