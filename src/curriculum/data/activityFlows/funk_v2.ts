/**
 * Funk v2 — Activity Flows.
 * Source of truth: Funk_v2_Activity_Flow_Spec.md + Funk_Genre_Parameter_Profile.md
 * // pending backend migration
 */

import type {
  ActivityFlowV2,
  ActivitySectionV2,
} from '../../types/activity.v2';

// ---------------------------------------------------------------------------
// L1 — "The Pocket"
// Style ref: l1a (JB/Parliament) or l1b (AWB/early Kool & the Gang)
// Key: D minor (Dorian) | Tempo: 88-96 BPM | Heavy 16th swing
// ---------------------------------------------------------------------------

const funkL1SectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    // ── A1: Scale (6 steps) ──────────────────────────────────────────────
    {
      stepNumber: 1,
      module: 'funk_l1',
      section: 'A',
      subsection: 'A1: Scale (D Minor Pentatonic / Blues)',
      activity: 'A1.1: D Minor Pentatonic Ascending (Out of Time)',
      direction: 'Play the D minor pentatonic scale going up.',
      assessment: 'pitch_only',
      tag: 'funk:minor_pentatonic_ascending_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'Solid — you nailed the pentatonic shape.',
      targetNotes: [
        { midi: 62, onset: 0, duration: 460 },
        { midi: 65, onset: 480, duration: 460 },
        { midi: 67, onset: 960, duration: 460 },
        { midi: 69, onset: 1440, duration: 460 },
        { midi: 72, onset: 1920, duration: 460 },
        { midi: 74, onset: 2400, duration: 460 },
      ],
    },
    {
      stepNumber: 2,
      module: 'funk_l1',
      section: 'A',
      subsection: 'A1: Scale (D Minor Pentatonic / Blues)',
      activity: 'A1.2: D Minor Pentatonic Descending (Out of Time)',
      direction: 'Play the D minor pentatonic scale going down.',
      assessment: 'pitch_only',
      tag: 'funk:minor_pentatonic_descending_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'Clean descent — those intervals are locked in.',
      targetNotes: [
        { midi: 74, onset: 0, duration: 460 },
        { midi: 72, onset: 480, duration: 460 },
        { midi: 69, onset: 960, duration: 460 },
        { midi: 67, onset: 1440, duration: 460 },
        { midi: 65, onset: 1920, duration: 460 },
        { midi: 62, onset: 2400, duration: 460 },
      ],
    },
    {
      stepNumber: 3,
      module: 'funk_l1',
      section: 'A',
      subsection: 'A1: Scale (D Minor Pentatonic / Blues)',
      activity: 'A1.3: D Minor Pentatonic — Up & Down (In Time)',
      direction:
        'In a steady tempo, play the D minor pentatonic scale going up and then back down.',
      assessment: 'pitch_order_timing',
      tag: 'funk:minor_pentatonic_up_down_it | funk',
      styleRef: 'l1a',
      successFeedback:
        'Up and down in time — the full scale under your fingers.',
      targetNotes: [
        { midi: 62, onset: 0, duration: 480 }, // D4 — up
        { midi: 65, onset: 480, duration: 480 }, // F4
        { midi: 67, onset: 960, duration: 480 }, // G4
        { midi: 69, onset: 1440, duration: 480 }, // A4
        { midi: 72, onset: 1920, duration: 480 }, // C5
        { midi: 74, onset: 2400, duration: 480 }, // D5 — top
        { midi: 72, onset: 2880, duration: 480 }, // C5 — down
        { midi: 69, onset: 3360, duration: 480 }, // A4
        { midi: 67, onset: 3840, duration: 480 }, // G4
        { midi: 65, onset: 4320, duration: 480 }, // F4
        { midi: 62, onset: 4800, duration: 480 }, // D4
      ],
    },
    {
      stepNumber: 4,
      module: 'funk_l1',
      section: 'A',
      subsection: 'A1: Scale (D Minor Pentatonic / Blues)',
      activity: 'A1.4: D Minor Blues Scale Ascending (Out of Time)',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      direction:
        'Play the D minor blues scale going up. Listen for the blue note (Ab).',
      assessment: 'pitch_only',
      tag: 'funk:minor_blues_ascending_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'Nice — that blue note adds the grit.',
      targetNotes: [
        { midi: 62, onset: 0, duration: 460 },
        { midi: 65, onset: 480, duration: 460 },
        { midi: 67, onset: 960, duration: 460 },
        { midi: 68, onset: 1440, duration: 460 },
        { midi: 69, onset: 1920, duration: 460 },
        { midi: 72, onset: 2400, duration: 460 },
        { midi: 74, onset: 2880, duration: 460 },
      ],
    },
    {
      stepNumber: 5,
      module: 'funk_l1',
      section: 'A',
      subsection: 'A1: Scale (D Minor Pentatonic / Blues)',
      activity: 'A1.5: D Minor Blues Scale Descending (Out of Time)',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      direction:
        'Play the D minor blues scale going down. Listen for the blue note (Ab) on the way.',
      assessment: 'pitch_only',
      tag: 'funk:minor_blues_descending_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'Down the blues scale — every note intentional.',
      targetNotes: [
        { midi: 74, onset: 0, duration: 460 },
        { midi: 72, onset: 480, duration: 460 },
        { midi: 69, onset: 960, duration: 460 },
        { midi: 68, onset: 1440, duration: 460 },
        { midi: 67, onset: 1920, duration: 460 },
        { midi: 65, onset: 2400, duration: 460 },
        { midi: 62, onset: 2880, duration: 460 },
      ],
    },
    {
      stepNumber: 6,
      module: 'funk_l1',
      section: 'A',
      subsection: 'A1: Scale (D Minor Pentatonic / Blues)',
      activity: 'A1.6: D Minor Blues Scale — Up & Down (In Time)',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      direction:
        'In a steady tempo, play the D minor blues scale going up and then back down.',
      assessment: 'pitch_order_timing',
      tag: 'funk:minor_blues_up_down_it | funk',
      styleRef: 'l1a',
      successFeedback:
        'Blues scale up and down in time — that blue note groove is locked in.',
      contentGeneration:
        'GCM v8: FUNK L1 melody scale_alt=minor_blues [0,3,5,6,7,10]. Key: D minor. Contour: ascending then descending stepwise. Register: C4-C5. Tempo: 88-96 BPM quarter-note pulse.',
      targetNotes: [
        { midi: 62, onset: 0, duration: 480 }, // D4 — up
        { midi: 65, onset: 480, duration: 480 }, // F4
        { midi: 67, onset: 960, duration: 480 }, // G4
        { midi: 68, onset: 1440, duration: 480 }, // G#4 — blue note
        { midi: 69, onset: 1920, duration: 480 }, // A4
        { midi: 72, onset: 2400, duration: 480 }, // C5
        { midi: 74, onset: 2880, duration: 480 }, // D5 — top
        { midi: 72, onset: 3360, duration: 480 }, // C5 — down
        { midi: 69, onset: 3840, duration: 480 }, // A4
        { midi: 68, onset: 4320, duration: 480 }, // G#4 — blue note
        { midi: 67, onset: 4800, duration: 480 }, // G4
        { midi: 65, onset: 5280, duration: 480 }, // F4
        { midi: 62, onset: 5760, duration: 480 }, // D4 — home
      ],
    },

    // ── A2: Melodic Phrases (6 steps) ────────────────────────────────────
    {
      stepNumber: 7,
      module: 'funk_l1',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.1: 1-Bar Phrase — Anchor & Return (Out of Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction:
        'Learn this 1-bar funk phrase: anchor note, short cluster, back to anchor.',
      assessment: 'pitch_only',
      tag: 'funk:phrase_shape_a_1bar_oot | funk',
      styleRef: 'l1a',
      successFeedback:
        'That anchor-cluster-anchor shape is the foundation of funk melody.',
      contentGeneration:
        'GCM v8: FUNK L1 melody phrase → shape_a (anchor→cluster→anchor). Melody_Phrase_Rhythm_Library: genre=funk, bar_count=1, contour_notes=3, rhythm_tiers=[1,2], zero_point_options=[0]. Melody_Contour_Library: contour_tiers=[1,2], contour=anchor_cluster_anchor. Scale: minor_pentatonic [0,3,5,7,10]. Register: C4-C5.',
      targetNotes: [
        { midi: 69, onset: 0, duration: 480 }, // A4 anchor
        { midi: 72, onset: 480, duration: 240 }, // C5 cluster
        { midi: 74, onset: 720, duration: 240 }, // D5 cluster
        { midi: 69, onset: 960, duration: 960 }, // A4 anchor resolve (long)
      ],
    },
    {
      stepNumber: 8,
      module: 'funk_l1',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.2: 1-Bar Phrase — Anchor & Return (In Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction: 'Play the same phrase in time with the click.',
      assessment: 'pitch_order_timing',
      tag: 'funk:phrase_shape_a_1bar_it | funk',
      styleRef: 'l1a',
      successFeedback:
        'Anchor and return in the groove — that rhythm is yours now.',
      contentGeneration:
        'GCM v8: FUNK L1 melody phrase → shape_a (anchor→cluster→anchor). Melody_Phrase_Rhythm_Library: genre=funk, bar_count=1, contour_notes=3, rhythm_tiers=[1,2], zero_point_options=[0]. Melody_Contour_Library: contour_tiers=[1,2], contour=anchor_cluster_anchor. Scale: minor_pentatonic [0,3,5,7,10]. Register: C4-C5. Tempo: 88-96 BPM.',
      targetNotes: [
        { midi: 69, onset: 0, duration: 480 },
        { midi: 72, onset: 480, duration: 240 },
        { midi: 74, onset: 720, duration: 240 },
        { midi: 69, onset: 960, duration: 960 },
      ],
    },
    {
      stepNumber: 9,
      module: 'funk_l1',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.3: 1-Bar Phrase — Walk & Resolve (Out of Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction:
        'Learn this phrase: stepwise walk, ornament, then resolve to an anchor.',
      assessment: 'pitch_only',
      tag: 'funk:phrase_shape_c_1bar_oot | funk',
      styleRef: 'l1a',
      successFeedback:
        'Walk and resolve — a different color from the first phrase.',
      contentGeneration:
        'GCM v8: FUNK L1 melody phrase → shape_c (walk→ornament→anchor). Melody_Phrase_Rhythm_Library: genre=funk, bar_count=1, contour_notes=3, rhythm_tiers=[1,2], zero_point_options=[0]. Melody_Contour_Library: contour_tiers=[1,2], contour=walk_ornament_anchor. Scale: minor_pentatonic [0,3,5,7,10]. Register: C4-C5.',
      targetNotes: [
        { midi: 62, onset: 0, duration: 480 }, // D4 walk start
        { midi: 65, onset: 480, duration: 240 }, // F4 step up
        { midi: 67, onset: 720, duration: 240 }, // G4 ornament
        { midi: 69, onset: 960, duration: 960 }, // A4 anchor resolve (long)
      ],
    },
    {
      stepNumber: 10,
      module: 'funk_l1',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.4: 1-Bar Phrase — Walk & Resolve (In Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction: 'Play the same phrase in time with the click.',
      assessment: 'pitch_order_timing',
      tag: 'funk:phrase_shape_c_1bar_it | funk',
      styleRef: 'l1a',
      successFeedback:
        'Walk and resolve locked in — two phrase shapes in your toolkit.',
      contentGeneration:
        'GCM v8: FUNK L1 melody phrase → shape_c (walk→ornament→anchor). Melody_Phrase_Rhythm_Library: genre=funk, bar_count=1, contour_notes=3, rhythm_tiers=[1,2], zero_point_options=[0]. Melody_Contour_Library: contour_tiers=[1,2], contour=walk_ornament_anchor. Scale: minor_pentatonic [0,3,5,7,10]. Register: C4-C5. Tempo: 88-96 BPM.',
      targetNotes: [
        { midi: 62, onset: 0, duration: 480 },
        { midi: 65, onset: 480, duration: 240 },
        { midi: 67, onset: 720, duration: 240 },
        { midi: 69, onset: 960, duration: 960 },
      ],
    },
    {
      stepNumber: 11,
      module: 'funk_l1',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.5: 2-Bar Phrase — Call + Answer (Out of Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction:
        'Learn a 2-bar phrase: the first bar calls, the second bar answers.',
      assessment: 'pitch_only',
      tag: 'funk:phrase_call_answer_2bar_oot | funk',
      styleRef: 'l1a',
      successFeedback:
        'Call and answer — the conversational heart of funk melody.',
      contentGeneration:
        'GCM v8: FUNK L1 melody phrase → call_answer. Melody_Phrase_Rhythm_Library: genre=funk, bar_count=2, contour_notes=3, rhythm_tiers=[1,2], zero_point_options=[0], contour_concat=1→2. Melody_Contour_Library: contour_tiers=[1,2], contour=call_answer (bar1=shape_a, bar2=shape_a_varied_tail). Scale: minor_pentatonic [0,3,5,7,10]. Register: C4-C5.',
      targetNotes: [
        // Bar 1: call
        { midi: 69, onset: 0, duration: 480 }, // A4
        { midi: 72, onset: 480, duration: 240 }, // C5
        { midi: 74, onset: 720, duration: 240 }, // D5
        { midi: 72, onset: 960, duration: 960 }, // C5 long (call ends)
        // Bar 2: answer (same rhythm, resolves lower)
        { midi: 69, onset: 1920, duration: 480 }, // A4
        { midi: 72, onset: 2400, duration: 240 }, // C5
        { midi: 74, onset: 2640, duration: 240 }, // D5
        { midi: 69, onset: 2880, duration: 960 }, // A4 long resolve
      ],
    },
    {
      stepNumber: 12,
      module: 'funk_l1',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.6: 2-Bar Phrase — Call + Answer (In Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction: 'Play the call-and-answer phrase in time.',
      assessment: 'pitch_order_timing',
      tag: 'funk:phrase_call_answer_2bar_it | funk',
      styleRef: 'l1a',
      successFeedback:
        'Two bars of funk conversation — you are speaking the language.',
      contentGeneration:
        'GCM v8: FUNK L1 melody phrase → call_answer. Melody_Phrase_Rhythm_Library: genre=funk, bar_count=2, contour_notes=3, rhythm_tiers=[1,2], zero_point_options=[0], contour_concat=1→2. Melody_Contour_Library: contour_tiers=[1,2], contour=call_answer (bar1=shape_a, bar2=shape_a_varied_tail). Scale: minor_pentatonic [0,3,5,7,10]. Register: C4-C5. Tempo: 88-96 BPM.',
      targetNotes: [
        { midi: 69, onset: 0, duration: 480 },
        { midi: 72, onset: 480, duration: 240 },
        { midi: 74, onset: 720, duration: 240 },
        { midi: 72, onset: 960, duration: 960 },
        { midi: 69, onset: 1920, duration: 480 },
        { midi: 72, onset: 2400, duration: 240 },
        { midi: 74, onset: 2640, duration: 240 },
        { midi: 69, onset: 2880, duration: 960 },
      ],
    },

    // ── A3: Melody Play-Along (2 steps) ──────────────────────────────────
    {
      stepNumber: 13,
      module: 'funk_l1',
      section: 'A',
      subsection: 'A3: Melody Play-Along',
      activity: 'A3.1: Melody over Funk L1 Backing (In Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction:
        'Play your melody over a full funk groove. Drums, bass, and chords are provided — you bring the melody.',
      assessment: 'pitch_order_timing',
      tag: 'funk:melody_playalong_l1 | funk',
      styleRef: 'l1a',
      successFeedback:
        'You just played a funk melody over a live groove — that is the real thing.',
      contentGeneration:
        'GCM v8: FUNK L1 melody play-along. Generate 4-bar melody: Melody_Phrase_Rhythm_Library (genre=funk, phrase_rhythm_bars=1, contour_notes=3, rhythm_tiers=[1,2], contour_concat=1→2). Melody_Contour_Library: contour_tiers=[1,2], motivic structure A-B-A-B. Scale: minor_pentatonic [0,3,5,7,10]. Register: C4-C5. Backing: drums (groove_funk_01) + bass (bass_c_r8_01 or bass_c_funk_01; bass_r_funk_01) + chords (1 min7 - 4 dom7 Dm7→G7; voicing=shell_1_b3_b7 [0,3,10]; comp_funk_s1 [[0,120],[360,120],[960,120],[1200,120]]). Tempo: 88-96 BPM. Style: l1a.',
      targetNotes: [
        // Bar 1: call phrase
        { midi: 69, onset: 0, duration: 480 }, // A4
        { midi: 72, onset: 480, duration: 240 }, // C5
        { midi: 74, onset: 720, duration: 240 }, // D5
        { midi: 72, onset: 960, duration: 960 }, // C5 long
        // Bar 2: answer phrase
        { midi: 69, onset: 1920, duration: 480 }, // A4
        { midi: 72, onset: 2400, duration: 240 }, // C5
        { midi: 74, onset: 2640, duration: 240 }, // D5
        { midi: 69, onset: 2880, duration: 960 }, // A4 long resolve
      ],
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
    },
    {
      stepNumber: 14,
      module: 'funk_l1',
      section: 'A',
      subsection: 'A3: Melody Play-Along',
      activity: 'A3.2: Melody Play-Along — New Melody Phrase (In Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction:
        'Same type of melody, brand new key. Prove your ears work in any key.',
      assessment: 'pitch_order_timing',
      tag: 'funk:melody_playalong_newkey_l1 | funk',
      styleRef: 'l1a',
      successFeedback: 'New key, same pocket. Your melody skills transfer.',
      contentGeneration:
        'GCM v8: FUNK L1 melody play-along — transposed key. key_center: runtime (exclude D minor, key_unlock_order: D→G→A→C→E→Bb). Generate 4-bar melody: Melody_Phrase_Rhythm_Library (genre=funk, phrase_rhythm_bars=1, contour_notes=3, rhythm_tiers=[1,2], contour_concat=1→2). Melody_Contour_Library: contour_tiers=[1,2], motivic structure A-B-A-B. Scale: minor_pentatonic [0,3,5,7,10] in new key. Register: C4-C5. Backing: drums (groove_funk_01) + bass (bass_c_r8_01; bass_r_funk_01) + chords (1 min7 - 4 dom7; voicing=shell_1_b3_b7 [0,3,10]; comp_funk_s1). Tempo: 88-96 BPM. Style: l1a.',
      targetNotes: [
        // Bar 1: call (slight variation from A3.1)
        { midi: 69, onset: 0, duration: 480 }, // A4
        { midi: 67, onset: 480, duration: 240 }, // G4
        { midi: 69, onset: 720, duration: 240 }, // A4
        { midi: 72, onset: 960, duration: 960 }, // C5 long
        // Bar 2: answer
        { midi: 74, onset: 1920, duration: 480 }, // D5
        { midi: 72, onset: 2400, duration: 240 }, // C5
        { midi: 69, onset: 2640, duration: 240 }, // A4
        { midi: 67, onset: 2880, duration: 960 }, // G4 long resolve
      ],
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
    },
    {
      stepNumber: 14,
      module: 'funk_l1',
      section: 'A',
      subsection: 'A3: Melody Play-Along',
      activity: 'A3.3: Blues Melody Play-Along (In Time)',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      direction:
        'Play this D minor blues melody over the funk groove. The Ab (blue note) creates tension — resolve it down through G→F→D.',
      assessment: 'pitch_order_timing',
      tag: 'funk:melody_playalong_blues_l1 | funk',
      styleRef: 'l1a',
      successFeedback:
        'Blues melody in the pocket — that blue note grit is yours now.',
      chordSymbols: ['Ddom9'],
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        // Bar 1
        { midi: 56, onset: 0, duration: 240 }, // Ab3 — blue note approach
        { midi: 57, onset: 240, duration: 240 }, // A3
        { midi: 60, onset: 480, duration: 240 }, // C4
        // quarter rest (720-960)
        { midi: 56, onset: 960, duration: 240 }, // Ab3 — blue note return
        { midi: 55, onset: 1200, duration: 240 }, // G3
        { midi: 53, onset: 1440, duration: 240 }, // F3
        { midi: 50, onset: 1680, duration: 720 }, // D3 — dotted quarter
        // Bar 2
        { midi: 56, onset: 3120, duration: 240 }, // G#3 — blue note
        { midi: 57, onset: 3360, duration: 240 }, // A3
        { midi: 60, onset: 3600, duration: 240 }, // C4
        // Final downbeat (bar 3)
        { midi: 62, onset: 3840, duration: 480 }, // D4 — root resolve
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// L1 Section B — Chords (17 steps, steps 15-31)
// ---------------------------------------------------------------------------

const funkL1SectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    // ── B1: Arpeggiate (7 steps) ─────────────────────────────────────────
    {
      stepNumber: 15,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B1: Arpeggiate Chords',
      activity: 'B1.1: Dm7 Arpeggio Ascending (Out of Time)',
      scaleIntervals: [0, 3, 7, 10],
      direction:
        'Play the notes of a Dm7 chord one at a time going up: D-F-A-C.',
      assessment: 'pitch_only',
      tag: 'funk:arpeggiate_dm7_ascending_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'Dm7 shape locked — root, minor 3rd, 5th, flat 7th.',
      contentGeneration:
        'GCM v8: chord_types min7 [0,3,7,10]. Chord_Quality_Library: quality=min7, root=D. Contour: ascending root position (1-b3-5-b7). Register: C3-C5.',
      targetNotes: [
        { midi: 62, onset: 0, duration: 480 }, // D4 — root
        { midi: 65, onset: 480, duration: 480 }, // F4 — b3
        { midi: 69, onset: 960, duration: 480 }, // A4 — 5th
        { midi: 72, onset: 1440, duration: 480 }, // C5 — b7
      ],
    },
    {
      stepNumber: 16,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B1: Arpeggiate Chords',
      activity: 'B1.2: Dm7 Arpeggio Descending (Out of Time)',
      scaleIntervals: [0, 3, 7, 10],
      direction: 'Play the Dm7 chord tones going down: C-A-F-D.',
      assessment: 'pitch_only',
      tag: 'funk:arpeggiate_dm7_descending_oot | funk',
      styleRef: 'l1a',
      successFeedback:
        'Descending just as clean — you know this chord inside out.',
      contentGeneration:
        'GCM v8: chord_types min7 [0,3,7,10]. Chord_Quality_Library: quality=min7, root=D. Contour: descending root position (b7-5-b3-1). Register: C5-C3.',
      targetNotes: [
        { midi: 72, onset: 0, duration: 480 }, // C5 — b7
        { midi: 69, onset: 480, duration: 480 }, // A4 — 5th
        { midi: 65, onset: 960, duration: 480 }, // F4 — b3
        { midi: 62, onset: 1440, duration: 480 }, // D4 — root
      ],
    },
    {
      stepNumber: 17,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B1: Arpeggiate Chords',
      activity: 'B1.3: Dm7 Arpeggio Up-Down (In Time)',
      scaleIntervals: [0, 3, 7, 10],
      direction:
        'In a steady tempo, arpeggiate Dm7 up then back down: D-F-A-C-C-A-F-D.',
      assessment: 'pitch_order_timing',
      tag: 'funk:arpeggiate_dm7_up_down_it | funk',
      styleRef: 'l1a',
      successFeedback:
        'Up-down arpeggio — Dm7 in both directions, smooth and even.',
      contentGeneration:
        'GCM v8: chord_types min7 [0,3,7,10]. Chord_Quality_Library: quality=min7, root=D. Contour: ascending then descending (1-b3-5-b7-b7-5-b3-1). Register: C3-C5. Tempo: 88-96 BPM quarter-note pulse.',
      targetNotes: [
        { midi: 62, onset: 0, duration: 480 }, // D4 — root up
        { midi: 65, onset: 480, duration: 480 }, // F4 — b3
        { midi: 69, onset: 960, duration: 480 }, // A4 — 5th
        { midi: 72, onset: 1440, duration: 480 }, // C5 — b7 top
        { midi: 72, onset: 1920, duration: 480 }, // C5 — b7 down
        { midi: 69, onset: 2400, duration: 480 }, // A4
        { midi: 65, onset: 2880, duration: 480 }, // F4
        { midi: 62, onset: 3360, duration: 480 }, // D4 — root resolve
      ],
    },
    // ── B2: Voicings (6 steps) ───────────────────────────────────────────
    {
      stepNumber: 22,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.1: Dm7 Shell Voicing (1-b3-b7) (Out of Time)',
      direction:
        'Play the Dm7 shell voicing: D, F, C. Root, minor 3rd, flat 7th — the essential skeleton.',
      assessment: 'pitch_only',
      tag: 'funk:dm7_shell_oot | funk',
      styleRef: 'l1a',
      successFeedback:
        'Shell voicing — three notes, all the harmonic information you need.',
      contentGeneration:
        'GCM v8: min7 [0,3,7,10]. Genre_Voicing_Taxonomy: quality=min7, voicing=shell_1_b3_b7. RH: [0,3,10]. Root=D. Register: C3-C5.',
      targetNotes: [
        { midi: 62, onset: 0, duration: 1920 }, // D4 — root
        { midi: 65, onset: 0, duration: 1920 }, // F4 — b3
        { midi: 72, onset: 0, duration: 1920 }, // C5 — b7
      ],
    },
    {
      stepNumber: 23,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.2: Dm7 Shell Voicing (In Time)',
      direction: 'Play the Dm7 shell voicing in time — Funk Stab 1 rhythm.',
      assessment: 'pitch_order_timing',
      tag: 'funk:dm7_shell_it | funk',
      styleRef: 'l1a',
      successFeedback: 'Shell voicing in time — that is a funk keyboard sound.',
      contentGeneration:
        'GCM v8: min7 [0,3,7,10]. Genre_Voicing_Taxonomy: quality=min7, voicing=shell_1_b3_b7. RH: [0,3,10]. Root=D. Register: C3-C5. Tempo: 88-96 BPM quarter-note pulse.',
      targetNotes: [
        // Funk Stab 1 pattern: [0, 360, 960, 1200]
        { midi: 62, onset: 0, duration: 120 }, // D4
        { midi: 65, onset: 0, duration: 120 }, // F4
        { midi: 72, onset: 0, duration: 120 }, // C5
        { midi: 62, onset: 360, duration: 120 },
        { midi: 65, onset: 360, duration: 120 },
        { midi: 72, onset: 360, duration: 120 },
        { midi: 62, onset: 960, duration: 120 },
        { midi: 65, onset: 960, duration: 120 },
        { midi: 72, onset: 960, duration: 120 },
        { midi: 62, onset: 1200, duration: 120 },
        { midi: 65, onset: 1200, duration: 120 },
        { midi: 72, onset: 1200, duration: 120 },
      ],
    },
    // NOTE: Genre_Voicing_Taxonomy_v2 — add entry: quality=dom7, voicing=sizzle_from_1min7, rh_override=[7,10,16] relative to G root
    {
      stepNumber: 24,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.3: G7 Drop the Sizzle Voicing (Out of Time)',
      direction:
        "Now play G7: D, F, B — same hand position, just the C slides down a half step to B. That's Drop the Sizzle.",
      assessment: 'pitch_only',
      tag: 'funk:g7_sizzle_oot | funk',
      styleRef: 'l1a',
      successFeedback:
        'Drop the Sizzle — one note moves, the whole harmony shifts.',
      contentGeneration:
        'GCM v8: dom7 [0,4,7,10]. Genre_Voicing_Taxonomy: quality=dom7, voicing=sizzle_from_1min7. RH: [7,10,16] relative to G root (D-F-B, same register as Dm7 shell). Sizzle rule: Dm7 b7 (C) drops half step → G7 3rd (B). Register: C3-C5.',
      targetNotes: [
        { midi: 62, onset: 0, duration: 1920 }, // D4 — 5th of G
        { midi: 65, onset: 0, duration: 1920 }, // F4 — b7 of G
        { midi: 71, onset: 0, duration: 1920 }, // B4 — 3rd of G (sizzle)
      ],
    },
    // NOTE: Genre_Voicing_Taxonomy_v2 — add entry: quality=dom7, voicing=sizzle_from_1min7, rh_override=[7,10,16] relative to G root
    {
      stepNumber: 25,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.4: Dm7→G7 Voicing Sequence (Out of Time)',
      direction:
        'Play Dm7 shell then G7 Sizzle voicing back to back. Only the C moves — down a half step to B.',
      assessment: 'pitch_only',
      tag: 'funk:dm7_g7_sizzle_sequence_oot | funk',
      styleRef: 'l1a',
      successFeedback:
        'Voice leading through changes — one note moves, the whole harmony shifts.',
      contentGeneration:
        'Genre_Voicing_Taxonomy: progression 1 min7 - 4 dom7 (Dm7→G7). Dm7: shell_1_b3_b7 [0,3,10] relative to D (D-F-C). G7: sizzle [7,10,16] relative to G (D-F-B). Sizzle rule: C→B half-step drop. Register: C3-C5.',
      chordSymbols: ['Dm7', 'G7'],
      targetNotes: [
        // Dm7 shell — half-note block so piano roll shows two distinct chords
        { midi: 62, onset: 0, duration: 960 }, // D4
        { midi: 65, onset: 0, duration: 960 }, // F4
        { midi: 72, onset: 0, duration: 960 }, // C5
        // G7 sizzle — C→B is the only voice that moves
        { midi: 62, onset: 1920, duration: 960 }, // D4 (stays)
        { midi: 65, onset: 1920, duration: 960 }, // F4 (stays)
        { midi: 71, onset: 1920, duration: 960 }, // B4 (sizzle drop)
      ],
    },
    {
      stepNumber: 26,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.5: Dm7→G7 Voicing Sequence (In Time)',
      direction:
        'Play the Dm7→G7 Sizzle sequence in time. Funk Stab 1 rhythm, one chord per bar.',
      assessment: 'pitch_order_timing',
      tag: 'funk:dm7_g7_sizzle_sequence_it | funk',
      styleRef: 'l1a',
      successFeedback:
        'Sizzle in the pocket — that voice leading is automatic now.',
      contentGeneration:
        'Genre_Voicing_Taxonomy: progression 1 min7 - 4 dom7 (Dm7→G7). Dm7: shell_1_b3_b7 [0,3,10] relative to D (D-F-C). G7: sizzle [7,10,16] relative to G (D-F-B). Sizzle rule: C→B half-step drop. Register: C3-C5. Tempo: 88-96 BPM, one chord per bar.',
      chordSymbols: ['Dm7', 'G7'],
      targetNotes: [
        // Bar 1: Dm7 — Funk Stab 1 [0, 360, 960, 1200]
        { midi: 62, onset: 0, duration: 120 },
        { midi: 65, onset: 0, duration: 120 },
        { midi: 72, onset: 0, duration: 120 },
        { midi: 62, onset: 360, duration: 120 },
        { midi: 65, onset: 360, duration: 120 },
        { midi: 72, onset: 360, duration: 120 },
        { midi: 62, onset: 960, duration: 120 },
        { midi: 65, onset: 960, duration: 120 },
        { midi: 72, onset: 960, duration: 120 },
        { midi: 62, onset: 1200, duration: 120 },
        { midi: 65, onset: 1200, duration: 120 },
        { midi: 72, onset: 1200, duration: 120 },
        // Bar 2: G7 — Funk Stab 1 (C→B sizzle drop)
        { midi: 62, onset: 1920, duration: 120 },
        { midi: 65, onset: 1920, duration: 120 },
        { midi: 71, onset: 1920, duration: 120 },
        { midi: 62, onset: 2280, duration: 120 },
        { midi: 65, onset: 2280, duration: 120 },
        { midi: 71, onset: 2280, duration: 120 },
        { midi: 62, onset: 2880, duration: 120 },
        { midi: 65, onset: 2880, duration: 120 },
        { midi: 71, onset: 2880, duration: 120 },
        { midi: 62, onset: 3120, duration: 120 },
        { midi: 65, onset: 3120, duration: 120 },
        { midi: 71, onset: 3120, duration: 120 },
        // Bar 3: Dm7 — final downbeat hit
        { midi: 62, onset: 3840, duration: 120 },
        { midi: 65, onset: 3840, duration: 120 },
        { midi: 72, onset: 3840, duration: 120 },
      ],
    },
    {
      stepNumber: 27,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.6: Dm7 7-3-5 Voicing — C-F-A (Out of Time)',
      direction:
        'Play Dm7 in the 7-3-5 area code: C4-F4-A4. The b7 on the bottom, minor 3rd in the middle, 5th on top. Warm and full.',
      assessment: 'pitch_only',
      tag: 'funk:dm7_735_voicing_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'Dm7 7-3-5 — full and centered in the register.',
      chordSymbols: ['Dm7'],
      targetNotes: [
        { midi: 60, onset: 0, duration: 1920 }, // C4 — b7
        { midi: 65, onset: 0, duration: 1920 }, // F4 — b3
        { midi: 69, onset: 0, duration: 1920 }, // A4 — 5
      ],
    },
    {
      stepNumber: 28,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.7: Dm7 7-3-5 Voicing (In Time)',
      direction:
        'Play Dm7 (C4-F4-A4) in time: half note on beat 1, then a 16th-note stab after the e-of-3, final downbeat.',
      assessment: 'pitch_order_timing',
      tag: 'funk:dm7_735_voicing_it | funk',
      styleRef: 'l1a',
      successFeedback: 'Dm7 7-3-5 in the pocket.',
      chordSymbols: ['Dm7'],
      targetNotes: [
        // Half note [0, 960]
        { midi: 60, onset: 0, duration: 960 },
        { midi: 65, onset: 0, duration: 960 },
        { midi: 69, onset: 0, duration: 960 },
        // 16th note [960, 120]
        { midi: 60, onset: 960, duration: 120 },
        { midi: 65, onset: 960, duration: 120 },
        { midi: 69, onset: 960, duration: 120 },
        // 2 sixteenth rests → 16th note [1320, 120]
        { midi: 60, onset: 1320, duration: 120 },
        { midi: 65, onset: 1320, duration: 120 },
        { midi: 69, onset: 1320, duration: 120 },
        // quarter rest → final downbeat quarter [1920, 480]
        { midi: 60, onset: 1920, duration: 480 },
        { midi: 65, onset: 1920, duration: 480 },
        { midi: 69, onset: 1920, duration: 480 },
      ],
    },
    {
      stepNumber: 29,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.8: Dm7→Gdom9 — Drop the Sizzle, 7-3-5 Voicing (In Time)',
      direction:
        'Two bars: Dm7 (C4-F4-A4) then Gdom9 (B3-F4-A4). Only the C moves — down a half step to B. Same rhythm as before.',
      assessment: 'pitch_order_timing',
      tag: 'funk:dm7_gdom9_sizzle_735_it | funk',
      styleRef: 'l1a',
      successFeedback:
        'Drop the Sizzle in the 7-3-5 voicing — one note, two chords.',
      chordSymbols: ['Dm7', 'Gdom9'],
      targetNotes: [
        // Bar 1 — Dm7: half [0,960], 16th [960,120], rest×2, 16th [1320,120], quarter rest
        { midi: 60, onset: 0, duration: 960 },
        { midi: 65, onset: 0, duration: 960 },
        { midi: 69, onset: 0, duration: 960 },
        { midi: 60, onset: 960, duration: 120 },
        { midi: 65, onset: 960, duration: 120 },
        { midi: 69, onset: 960, duration: 120 },
        { midi: 60, onset: 1320, duration: 120 },
        { midi: 65, onset: 1320, duration: 120 },
        { midi: 69, onset: 1320, duration: 120 },
        // Bar 2 — Gdom9 (B3-F4-A4): half [1920,960], 16th [2880,120], rest×2, 16th [3240,120], quarter rest
        { midi: 59, onset: 1920, duration: 960 }, // B3
        { midi: 65, onset: 1920, duration: 960 }, // F4 (stays)
        { midi: 69, onset: 1920, duration: 960 }, // A4 (stays)
        { midi: 59, onset: 2880, duration: 120 },
        { midi: 65, onset: 2880, duration: 120 },
        { midi: 69, onset: 2880, duration: 120 },
        { midi: 59, onset: 3240, duration: 120 },
        { midi: 65, onset: 3240, duration: 120 },
        { midi: 69, onset: 3240, duration: 120 },
        // Final downbeat — Dm7 quarter [3840, 480]
        { midi: 60, onset: 3840, duration: 480 },
        { midi: 65, onset: 3840, duration: 480 },
        { midi: 69, onset: 3840, duration: 480 },
      ],
    },

    // ── B3: Progressions (3 steps) ───────────────────────────────────────
    {
      stepNumber: 30,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B3: Funk Progressions',
      activity: 'B3.1: Dm7→Gdom9→Dm7→Gdom9 Vamp (In Time)',
      direction:
        'Play the four-bar funk vamp in time: Dm7 → Gdom9 → Dm7 → Gdom9. Use shell voicings — hear the Drop the Sizzle on every chord change.',
      assessment: 'pitch_order_timing',
      tag: 'funk:progression_dm7_gdom9_4bar_it | funk',
      styleRef: 'l1a',
      successFeedback: 'Four-bar vamp — the two-chord engine running.',
      chordSymbols: ['Dm7', 'Gdom9', 'Dm7', 'Gdom9'],
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        // Bar 1: Dm7 shell
        { midi: 62, onset: 0, duration: 960 }, // D4
        { midi: 65, onset: 0, duration: 960 }, // F4
        { midi: 72, onset: 0, duration: 960 }, // C5
        // Bar 2: Gdom9 sizzle
        { midi: 62, onset: 1920, duration: 960 }, // D4
        { midi: 65, onset: 1920, duration: 960 }, // F4
        { midi: 71, onset: 1920, duration: 960 }, // B4
        // Bar 3: Dm7 shell
        { midi: 62, onset: 3840, duration: 960 }, // D4
        { midi: 65, onset: 3840, duration: 960 }, // F4
        { midi: 72, onset: 3840, duration: 960 }, // C5
        // Bar 4: Gdom9 sizzle
        { midi: 62, onset: 5760, duration: 960 }, // D4
        { midi: 65, onset: 5760, duration: 960 }, // F4
        { midi: 71, onset: 5760, duration: 960 }, // B4
        // Bar 5 final downbeat — Dm7 quarter
        { midi: 62, onset: 7680, duration: 480 },
        { midi: 65, onset: 7680, duration: 480 },
        { midi: 72, onset: 7680, duration: 480 },
      ],
    },
    {
      stepNumber: 31,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B3: Funk Progressions',
      activity: 'B3.2: Dm7→Gdom9 7-3-5 Vamp — Drop the Sizzle (In Time)',
      direction:
        'Four bars of the Drop the Sizzle pattern using 7-3-5 voicings. Dm7 (C4-F4-A4) and Gdom9 (B3-F4-A4) alternate — only the bottom note moves.',
      assessment: 'pitch_order_timing',
      tag: 'funk:progression_dm7_gdom9_735_4bar_it | funk',
      styleRef: 'l1a',
      successFeedback: 'Four bars, two chords, one note moving. That is funk.',
      chordSymbols: ['Dm7', 'Gdom9', 'Dm7', 'Gdom9'],
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        // Bar 1 — Dm7: half [0,960], 16th [960,120], rest×2, 16th [1320,120], quarter rest
        { midi: 60, onset: 0, duration: 960 },
        { midi: 65, onset: 0, duration: 960 },
        { midi: 69, onset: 0, duration: 960 },
        { midi: 60, onset: 960, duration: 120 },
        { midi: 65, onset: 960, duration: 120 },
        { midi: 69, onset: 960, duration: 120 },
        { midi: 60, onset: 1320, duration: 120 },
        { midi: 65, onset: 1320, duration: 120 },
        { midi: 69, onset: 1320, duration: 120 },
        // Bar 2 — Gdom9: half [1920,960], 16th [2880,120], rest×2, 16th [3240,120], quarter rest
        { midi: 59, onset: 1920, duration: 960 },
        { midi: 65, onset: 1920, duration: 960 },
        { midi: 69, onset: 1920, duration: 960 },
        { midi: 59, onset: 2880, duration: 120 },
        { midi: 65, onset: 2880, duration: 120 },
        { midi: 69, onset: 2880, duration: 120 },
        { midi: 59, onset: 3240, duration: 120 },
        { midi: 65, onset: 3240, duration: 120 },
        { midi: 69, onset: 3240, duration: 120 },
        // Bar 3 — Dm7: half [3840,960], 16th [4800,120], rest×2, 16th [5160,120], quarter rest
        { midi: 60, onset: 3840, duration: 960 },
        { midi: 65, onset: 3840, duration: 960 },
        { midi: 69, onset: 3840, duration: 960 },
        { midi: 60, onset: 4800, duration: 120 },
        { midi: 65, onset: 4800, duration: 120 },
        { midi: 69, onset: 4800, duration: 120 },
        { midi: 60, onset: 5160, duration: 120 },
        { midi: 65, onset: 5160, duration: 120 },
        { midi: 69, onset: 5160, duration: 120 },
        // Bar 4 — Gdom9: half [5760,960], 16th [6720,120], rest×2, 16th [7080,120], quarter rest
        { midi: 59, onset: 5760, duration: 960 },
        { midi: 65, onset: 5760, duration: 960 },
        { midi: 69, onset: 5760, duration: 960 },
        { midi: 59, onset: 6720, duration: 120 },
        { midi: 65, onset: 6720, duration: 120 },
        { midi: 69, onset: 6720, duration: 120 },
        { midi: 59, onset: 7080, duration: 120 },
        { midi: 65, onset: 7080, duration: 120 },
        { midi: 69, onset: 7080, duration: 120 },
        // Final downbeat — Dm7 quarter [7680, 480]
        { midi: 60, onset: 7680, duration: 480 },
        { midi: 65, onset: 7680, duration: 480 },
        { midi: 69, onset: 7680, duration: 480 },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// L1 Section C — Bass (11 steps, steps 32-42)
// ---------------------------------------------------------------------------

const funkL1SectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    // ── C1: Bass Scale (6 steps) ─────────────────────────────────────────
    {
      stepNumber: 32,
      module: 'funk_l1',
      section: 'C',
      subsection: 'C1: Bass Scale (D Minor Pentatonic)',
      activity: 'C1.1: D Minor Pentatonic Bass Ascending (Out of Time)',
      direction:
        'Play the D minor pentatonic scale in the bass register (octave 2) going up.',
      assessment: 'pitch_only',
      tag: 'funk:bass_minor_pentatonic_ascending_oot | funk',
      styleRef: 'l1a',
      successFeedback:
        'Pentatonic in the bass range — this is where funk bass lives.',
      contentGeneration:
        'GCM v8: FUNK L1 bass scale=minor_pentatonic [0,3,5,7,10]. Key: D minor. Contour: ascending stepwise. Register: octave 2 (D2=38 to D3=50).',
      targetNotes: [
        { midi: 38, onset: 0, duration: 480 }, // D2
        { midi: 41, onset: 480, duration: 480 }, // F2
        { midi: 43, onset: 960, duration: 480 }, // G2
        { midi: 45, onset: 1440, duration: 480 }, // A2
        { midi: 48, onset: 1920, duration: 480 }, // C3
        { midi: 50, onset: 2400, duration: 480 }, // D3 (held)
      ],
    },
    {
      stepNumber: 33,
      module: 'funk_l1',
      section: 'C',
      subsection: 'C1: Bass Scale (D Minor Pentatonic)',
      activity: 'C1.2: D Minor Pentatonic Bass Descending (Out of Time)',
      direction:
        'Play the D minor pentatonic scale in the bass register going down.',
      assessment: 'pitch_only',
      tag: 'funk:bass_minor_pentatonic_descending_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'Clean descent in the low end.',
      contentGeneration:
        'GCM v8: FUNK L1 bass scale=minor_pentatonic [0,3,5,7,10]. Key: D minor. Contour: descending stepwise. Register: octave 2 (D3=50 to D2=38).',
      targetNotes: [
        { midi: 50, onset: 0, duration: 240 }, // D3
        { midi: 48, onset: 240, duration: 240 }, // C3
        { midi: 45, onset: 480, duration: 240 }, // A2
        { midi: 43, onset: 720, duration: 240 }, // G2
        { midi: 41, onset: 960, duration: 240 }, // F2
        { midi: 38, onset: 1200, duration: 480 }, // D2 (held)
      ],
    },
    {
      stepNumber: 34,
      module: 'funk_l1',
      section: 'C',
      subsection: 'C1: Bass Scale (D Minor Pentatonic)',
      activity: 'C1.3: D Minor Pentatonic Bass — Up & Down (In Time)',
      direction:
        'In a steady tempo, play the D minor pentatonic bass scale going up and then back down.',
      assessment: 'pitch_order_timing',
      tag: 'funk:bass_minor_pentatonic_up_down_it | funk',
      styleRef: 'l1a',
      successFeedback: 'Up and down — the full scale under your fingers.',
      contentGeneration:
        'GCM v8: FUNK L1 bass scale=minor_pentatonic [0,3,5,7,10]. Key: D minor. Contour: ascending then descending. Register: octave 2 (D2=38 to D3=50). Tempo: 88-96 BPM quarter-note pulse.',
      targetNotes: [
        { midi: 38, onset: 0, duration: 480 }, // D2 — up
        { midi: 41, onset: 480, duration: 480 }, // F2
        { midi: 43, onset: 960, duration: 480 }, // G2
        { midi: 45, onset: 1440, duration: 480 }, // A2
        { midi: 48, onset: 1920, duration: 480 }, // C3
        { midi: 50, onset: 2400, duration: 480 }, // D3 — top
        { midi: 48, onset: 2880, duration: 480 }, // C3 — down
        { midi: 45, onset: 3360, duration: 480 }, // A2
        { midi: 43, onset: 3840, duration: 480 }, // G2
        { midi: 41, onset: 4320, duration: 480 }, // F2
        { midi: 38, onset: 4800, duration: 480 }, // D2
      ],
    },
    {
      stepNumber: 35,
      module: 'funk_l1',
      section: 'C',
      subsection: 'C1: Bass Scale (D Minor Pentatonic)',
      activity: 'C1.4: Root Notes — D-G-D (Out of Time)',
      scaleId: 'dorian',
      direction:
        'Play D2, then G2, then land back on D2. Half note, half note, quarter note — feel the momentum into the final D.',
      assessment: 'pitch_only',
      tag: 'funk:bass_roots_dgd_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'D-G-D — root motion, two chords, one phrase.',
      contentGeneration:
        'GCM v8: FUNK L1 bass roots D-G-D. D2=38 (half), G2=43 (half), D2=38 (quarter). Register: octave 2.',
      chordSymbols: ['Dm7', 'G7'],
      targetNotes: [
        { midi: 38, onset: 0, duration: 960 }, // D2 — half note
        { midi: 43, onset: 960, duration: 960 }, // G2 — half note
        { midi: 38, onset: 1920, duration: 480 }, // D2 — quarter (final downbeat)
      ],
    },
    {
      stepNumber: 36,
      module: 'funk_l1',
      section: 'C',
      subsection: 'C1: Bass Scale (D Minor Pentatonic)',
      activity: 'C1.5: Root Notes on Beat 1 — Dm7→G7 (In Time)',
      scaleId: 'dorian',
      direction: 'In time, play the root of each chord on beat 1.',
      assessment: 'pitch_order_timing',
      tag: 'funk:bass_roots_beat1_it | funk',
      styleRef: 'l1a',
      successFeedback:
        'Roots on the one, in the pocket. That is a bass player.',
      contentGeneration:
        'GCM v8: FUNK L1 bass roots. Progression: 1 min7 - 4 dom7 (Dm7→G7). Bass note: root of each chord on beat 1. D2=38, G2=43. Register: octave 2. Tempo: 88-96 BPM, one chord per bar.',
      chordSymbols: ['Dm7', 'G7'],
      targetNotes: [
        { midi: 38, onset: 0, duration: 1800 }, // D2
        { midi: 43, onset: 1920, duration: 1800 }, // G2
        { midi: 38, onset: 3840, duration: 1800 }, // D2
      ],
    },
    {
      stepNumber: 37,
      module: 'funk_l1',
      section: 'C',
      subsection: 'C1: Bass Scale (D Minor Pentatonic)',
      activity: 'C1.6: Root + 5th Pattern (Out of Time)',
      scaleId: 'dorian',
      direction:
        'Play root then 5th for each chord: D-A (Dm7), G-D (G7). Two notes per chord.',
      assessment: 'pitch_only',
      tag: 'funk:bass_root_5th_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'Root + 5th — you just doubled your bass vocabulary.',
      contentGeneration:
        'GCM v8: FUNK L1 bass contours=bass_c_r8_01. Pattern: root-fifth. Progression: 1 min7 - 4 dom7 (Dm7→G7). D2=38→A2=45, G2=43→D3=50. Register: octave 2.',
      chordSymbols: ['Dm7', 'G7'],
      targetNotes: [
        // Bar 1: Dm7 root + 5th
        { midi: 38, onset: 0, duration: 460 }, // D2 root
        { midi: 45, onset: 480, duration: 460 }, // A2 5th
        // Bar 2: G7 root + 5th
        { midi: 43, onset: 1920, duration: 460 }, // G2 root
        { midi: 50, onset: 2400, duration: 460 }, // D3 5th
      ],
    },

    // ── C2: Bass Techniques (4 steps) ────────────────────────────────────
    {
      stepNumber: 38,
      module: 'funk_l1',
      section: 'C',
      subsection: 'C2: Funk Bass Techniques',
      activity: 'C2.1: Root + Octave Pop (Out of Time)',
      direction:
        'Play root D2, then pop the octave D3. Low D, high D — feel the bounce.',
      assessment: 'pitch_only',
      tag: 'funk:bass_octave_pop_oot | funk',
      styleRef: 'l1a',
      successFeedback:
        'The octave pop — that bounce is the foundation of funk bass.',
      contentGeneration:
        'GCM v8: FUNK L1 bass contours=bass_c_funk_01 (root-octave pop). Root=D2 (38), pop=D3 (50). Bass_Rhythm_Patterns: bass_r_funk_01 (beat1 root, and-of-2 octave pop). Register: octave 2.',
      targetNotes: [
        { midi: 38, onset: 0, duration: 460 }, // D2 root
        { midi: 50, onset: 480, duration: 120 }, // D3 octave pop
        { midi: 38, onset: 960, duration: 460 }, // D2 root
        { midi: 50, onset: 1440, duration: 120 }, // D3 octave pop
      ],
    },
    {
      stepNumber: 39,
      module: 'funk_l1',
      section: 'C',
      subsection: 'C2: Funk Bass Techniques',
      activity: 'C2.2: Root + Octave Pop (In Time)',
      direction:
        'In time, play the root-octave pop pattern. Root on beat 1, pop on the and of 2.',
      assessment: 'pitch_order_timing',
      tag: 'funk:bass_octave_pop_it | funk',
      styleRef: 'l1a',
      successFeedback:
        'Octave pop in time — that bounce is the funk bass signature.',
      contentGeneration:
        'GCM v8: FUNK L1 bass contours=bass_c_funk_01 (root-octave pop). Root=D2 (38), pop=D3 (50). Bass_Rhythm_Patterns: bass_r_funk_01. Register: octave 2. Tempo: 88-96 BPM.',
      targetNotes: [
        { midi: 38, onset: 0, duration: 460 }, // D2 root
        { midi: 50, onset: 480, duration: 120 }, // D3 pop
        { midi: 38, onset: 960, duration: 460 }, // D2 root
        { midi: 50, onset: 1440, duration: 120 }, // D3 pop
      ],
    },
    {
      stepNumber: 40,
      module: 'funk_l1',
      section: 'C',
      subsection: 'C2: Funk Bass Techniques',
      activity: 'C2.3: Chromatic Approach to Chord Root (Out of Time)',
      direction:
        'Approach each chord root from one semitone below: C#2→D2, F#2→G2. The approach note leads into the target.',
      assessment: 'pitch_only',
      tag: 'funk:bass_chromatic_approach_oot | funk',
      styleRef: 'l1a',
      successFeedback:
        'Chromatic approach — one semitone of tension, then resolution.',
      contentGeneration:
        'GCM v8: FUNK L1 bass contours=bass_c_funk_02 (chromatic approach from below). Progression: 1 min7 - 4 dom7 (Dm7→G7). Approach: -1 semitone from each root (C#2=37→D2=38, F#2=42→G2=43). Register: octave 2.',
      chordSymbols: ['Dm7', 'G7'],
      targetNotes: [
        // Approach → Dm7
        { midi: 37, onset: 0, duration: 240 }, // C#2 approach
        { midi: 38, onset: 240, duration: 460 }, // D2 goal ↑
        // Approach → G7
        { midi: 42, onset: 960, duration: 240 }, // F#2 approach
        { midi: 43, onset: 1200, duration: 460 }, // G2 goal ↑
      ],
    },
    {
      stepNumber: 41,
      module: 'funk_l1',
      section: 'C',
      subsection: 'C2: Funk Bass Techniques',
      activity: 'C2.4: Chromatic Approach (In Time)',
      direction:
        'In time, play chromatic approaches into each chord root. Approach on a-of-3, root on beat 1 next bar. Resolve to D2 on the final downbeat.',
      assessment: 'pitch_order_timing',
      tag: 'funk:bass_chromatic_approach_it | funk',
      styleRef: 'l1a',
      successFeedback: 'Chromatic approach in time — smooth bass player move.',
      contentGeneration:
        'GCM v8: FUNK L1 bass contours=bass_c_funk_02 (chromatic approach from below). Progression: 1 min7 - 4 dom7 (Dm7→G7). Approach: -1 semitone on a-of-3, root on beat 1. Register: octave 2. Tempo: 88-96 BPM.',
      chordSymbols: ['Dm7', 'G7'],
      targetNotes: [
        // Bar 1: Dm7 root + approach to G
        { midi: 38, onset: 0, duration: 360 }, // D2 root beat 1
        { midi: 38, onset: 840, duration: 120 }, // D2 ba (16th pickup)
        { midi: 38, onset: 960, duration: 360 }, // D2 doom beat 3
        { midi: 42, onset: 1560, duration: 120 }, // F#2 approach → G2 ↑
        // Bar 2: G7 root + approach to D
        { midi: 43, onset: 1920, duration: 360 }, // G2 root beat 1
        { midi: 43, onset: 2760, duration: 120 }, // G2 ba
        { midi: 43, onset: 2880, duration: 360 }, // G2 doom beat 3
        { midi: 37, onset: 3480, duration: 120 }, // C#2 approach → D2 ↑
        // Final downbeat: resolve to D2
        { midi: 38, onset: 3840, duration: 480 }, // D2 final resolve
      ],
    },

    // ── C3: Bass Play-Along (4 steps) ─────────────────────────────────────
    {
      stepNumber: 42,
      module: 'funk_l1',
      section: 'C',
      subsection: 'C3: Bass Play-Along',
      activity: 'C3.1: Bass Line over Funk L1 Backing (In Time)',
      direction:
        'Play your bass line over a full funk groove. Bar 1: Dmin7. Bar 2: Gdom9. Drums and chords enter with the bass.',
      assessment: 'pitch_order_timing_duration',
      tag: 'funk:bass_playalong_l1 | funk',
      styleRef: 'l1a',
      successFeedback:
        'You just held down the low end over a live funk groove. That is the gig.',
      contentGeneration:
        'GCM v8: FUNK L1 bass play-along. Progression: Dm7→Gdom9 (1 bar each). Bass_Contour_Patterns: bass_c_r8_01 (root-octave) or bass_c_funk_01. Bass_Rhythm_Patterns: bass_r_funk_01. Register: octave 2 (D2=38, G2=43). Backing: drums (groove_funk_01) + chords (Dm7 bar 1, Gdom9 bar 2; comp_funk_s1). Tempo: 88-96 BPM. Style: l1a.',
      chordSymbols: ['Dm7', 'Gdom9'],
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        // 2-bar D2 root groove with octave pop
        { midi: 38, onset: 0, duration: 460 }, // D2 root beat1
        { midi: 50, onset: 480, duration: 120 }, // D3 pop
        { midi: 38, onset: 960, duration: 460 }, // D2 root beat3
        { midi: 50, onset: 1440, duration: 120 }, // D3 pop
        { midi: 43, onset: 1920, duration: 460 }, // G2 root beat1
        { midi: 50, onset: 2400, duration: 120 }, // D3 pop
        { midi: 43, onset: 2880, duration: 460 }, // G2 root beat3
        { midi: 50, onset: 3360, duration: 120 }, // D3 pop
      ],
    },
    {
      stepNumber: 43,
      module: 'funk_l1',
      section: 'C',
      subsection: 'C3: Bass Play-Along',
      activity: 'C3.2: Root-Fifth Bass Pattern (In Time)',
      direction:
        'Play root-fifth pattern over the groove: D2-A2 on Dm7, G2-D3 on G7. Drums and chords are provided.',
      assessment: 'pitch_order_timing_duration',
      tag: 'funk:bass_root_fifth_playalong_l1 | funk',
      styleRef: 'l1a',
      successFeedback:
        'Root-fifth groove locked in — two-note bass line, big sound.',
      chordSymbols: ['Dm7', 'G7'],
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 38, onset: 0, duration: 460 }, // D2 root
        { midi: 45, onset: 480, duration: 460 }, // A2 fifth
        { midi: 38, onset: 960, duration: 460 }, // D2 root
        { midi: 45, onset: 1440, duration: 460 }, // A2 fifth
        { midi: 43, onset: 1920, duration: 460 }, // G2 root
        { midi: 50, onset: 2400, duration: 460 }, // D3 fifth
        { midi: 43, onset: 2880, duration: 460 }, // G2 root
        { midi: 50, onset: 3360, duration: 460 }, // D3 fifth
      ],
    },
    {
      stepNumber: 44,
      module: 'funk_l1',
      section: 'C',
      subsection: 'C3: Bass Play-Along',
      activity: 'C3.3: Octave Pop Bass Pattern (In Time)',
      direction:
        'Play the octave pop pattern over the groove: D2-D3 on Dm7, G2-G3 on G7. Drums and chords are provided.',
      assessment: 'pitch_order_timing_duration',
      tag: 'funk:bass_octave_pop_playalong_l1 | funk',
      styleRef: 'l1a',
      successFeedback:
        'Octave pop over a live groove — that bounce is locked in.',
      chordSymbols: ['Dm7', 'G7'],
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 38, onset: 0, duration: 460 }, // D2 root
        { midi: 50, onset: 480, duration: 120 }, // D3 octave pop
        { midi: 38, onset: 960, duration: 460 }, // D2 root
        { midi: 50, onset: 1440, duration: 120 }, // D3 octave pop
        { midi: 43, onset: 1920, duration: 460 }, // G2 root
        { midi: 55, onset: 2400, duration: 120 }, // G3 octave pop
        { midi: 43, onset: 2880, duration: 460 }, // G2 root
        { midi: 55, onset: 3360, duration: 120 }, // G3 octave pop
      ],
    },
    {
      stepNumber: 45,
      module: 'funk_l1',
      section: 'C',
      subsection: 'C3: Bass Play-Along',
      activity: 'C3.4: Chromatic Approach Bass Pattern (In Time)',
      direction:
        'Play chromatic approaches over the groove: C#2→D2, F#2→G2. Drums and chords are provided.',
      assessment: 'pitch_order_timing_duration',
      tag: 'funk:bass_chromatic_approach_playalong_l1 | funk',
      styleRef: 'l1a',
      successFeedback: 'Chromatic approach in the groove — silky smooth.',
      chordSymbols: ['Dm7', 'G7'],
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        // Bar 1: Dm7 approach
        { midi: 38, onset: 0, duration: 360 }, // D2 beat1
        { midi: 38, onset: 840, duration: 120 }, // D2 pickup
        { midi: 38, onset: 960, duration: 360 }, // D2 beat3
        { midi: 42, onset: 1560, duration: 120 }, // F#2 approach → G2
        // Bar 2: G7 approach
        { midi: 43, onset: 1920, duration: 360 }, // G2 beat1
        { midi: 43, onset: 2760, duration: 120 }, // G2 pickup
        { midi: 43, onset: 2880, duration: 360 }, // G2 beat3
        { midi: 37, onset: 3480, duration: 120 }, // C#2 approach → D2
        // Final D2
        { midi: 38, onset: 3840, duration: 480 }, // D2 final
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// L1 Section D — Performance (4 steps, steps 43-46)
// Piano: both hands | instrument_config tagged
// ---------------------------------------------------------------------------

const funkL1SectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    // ── D1: LH Bass + RH Chords (2 steps) ───────────────────────────────
    // NOTE: ActivityStepV2 instrument_config — pending type merge by Ryan
    {
      stepNumber: 43,
      module: 'funk_l1',
      section: 'D',
      subsection: 'D1: LH Bass + RH Chords',
      activity: 'D1.1: LH Root Pattern + RH Funk Stab 1 (In Time)',
      direction:
        'Both hands together: left hand plays root bass pattern (D2), right hand plays Dm7 rootless stabs on the Funk Stab 1 rhythm.',
      assessment: 'pitch_order_timing',
      tag: 'funk:performance_lh_bass_rh_chords_it | funk',
      styleRef: 'l1a',
      successFeedback:
        'Two hands, two parts — you are becoming a one-person funk band.',
      contentGeneration:
        'GCM v8: FUNK L1 Performance. LH: bass root D2=38, beats 1+3. RH: Dm7 rootless [b7-3-5] C4(60)+F4(65)+A4(69); comp_funk_s1. Stab duration: 120t. Style: l1a.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1a',
      },
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      chordSymbols: ['Dm7'],
      targetNotes: [
        // LH — D2 root locked to beats 1 and 3
        { midi: 38, onset: 0, duration: 460, hand: 'lh' }, // D2 beat1 bar1
        { midi: 38, onset: 960, duration: 460, hand: 'lh' }, // D2 beat3 bar1
        { midi: 38, onset: 1920, duration: 460, hand: 'lh' }, // D2 beat1 bar2
        { midi: 38, onset: 2880, duration: 460, hand: 'lh' }, // D2 beat3 bar2
        // RH — Dm7 [b7-3-5] stabs on comp_funk_s1 (bar 1)
        { midi: 60, onset: 0, duration: 120, hand: 'rh' },
        { midi: 65, onset: 0, duration: 120, hand: 'rh' },
        { midi: 69, onset: 0, duration: 120, hand: 'rh' },
        { midi: 60, onset: 360, duration: 120, hand: 'rh' },
        { midi: 65, onset: 360, duration: 120, hand: 'rh' },
        { midi: 69, onset: 360, duration: 120, hand: 'rh' },
        { midi: 60, onset: 960, duration: 120, hand: 'rh' },
        { midi: 65, onset: 960, duration: 120, hand: 'rh' },
        { midi: 69, onset: 960, duration: 120, hand: 'rh' },
        { midi: 60, onset: 1200, duration: 120, hand: 'rh' },
        { midi: 65, onset: 1200, duration: 120, hand: 'rh' },
        { midi: 69, onset: 1200, duration: 120, hand: 'rh' },
        // bar 2
        { midi: 60, onset: 1920, duration: 120, hand: 'rh' },
        { midi: 65, onset: 1920, duration: 120, hand: 'rh' },
        { midi: 69, onset: 1920, duration: 120, hand: 'rh' },
        { midi: 60, onset: 2280, duration: 120, hand: 'rh' },
        { midi: 65, onset: 2280, duration: 120, hand: 'rh' },
        { midi: 69, onset: 2280, duration: 120, hand: 'rh' },
        { midi: 60, onset: 2880, duration: 120, hand: 'rh' },
        { midi: 65, onset: 2880, duration: 120, hand: 'rh' },
        { midi: 69, onset: 2880, duration: 120, hand: 'rh' },
        { midi: 60, onset: 3120, duration: 120, hand: 'rh' },
        { midi: 65, onset: 3120, duration: 120, hand: 'rh' },
        { midi: 69, onset: 3120, duration: 120, hand: 'rh' },
        // bar 3: final downbeat — LH root + RH chord
        { midi: 38, onset: 3840, duration: 120, hand: 'lh' },
        { midi: 60, onset: 3840, duration: 120, hand: 'rh' },
        { midi: 65, onset: 3840, duration: 120, hand: 'rh' },
        { midi: 69, onset: 3840, duration: 120, hand: 'rh' },
      ],
    },
    // NOTE: ActivityStepV2 instrument_config — pending type merge by Ryan
    {
      stepNumber: 44,
      module: 'funk_l1',
      section: 'D',
      subsection: 'D1: LH Bass + RH Chords',
      activity: 'D1.2: LH Root Pattern + RH Funk9 (In Time)',
      direction:
        'Left hand locks root bass (D2) with the kick drum, right hand plays Funk9 stabs [C4-E4-A4] on the grid.',
      assessment: 'pitch_order_timing_duration',
      tag: 'funk:performance_lh_bass_rh_funk9_it | funk',
      styleRef: 'l1a',
      successFeedback:
        'Funk9 and bass in the pocket — that open voicing over a locked groove is the signature sound.',
      contentGeneration:
        'GCM v8: FUNK L1 Performance IT. LH: bass root D2=38, beats 1+3. RH: Funk9 [b7-9-5] C4(60)+E4(64)+A4(69); comp_funk_s1. Tempo: 88-96 BPM. Style: l1a.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1a',
      },
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      chordSymbols: ['Dm7'],
      targetNotes: [
        // LH — D2 root beats 1+3
        { midi: 38, onset: 0, duration: 460, hand: 'lh' },
        { midi: 38, onset: 960, duration: 460, hand: 'lh' },
        { midi: 38, onset: 1920, duration: 460, hand: 'lh' },
        { midi: 38, onset: 2880, duration: 460, hand: 'lh' },
        // RH — Funk9 [b7-9-5] stabs on comp_funk_s1 (bar 1)
        { midi: 60, onset: 0, duration: 120, hand: 'rh' },
        { midi: 64, onset: 0, duration: 120, hand: 'rh' },
        { midi: 69, onset: 0, duration: 120, hand: 'rh' },
        { midi: 60, onset: 360, duration: 120, hand: 'rh' },
        { midi: 64, onset: 360, duration: 120, hand: 'rh' },
        { midi: 69, onset: 360, duration: 120, hand: 'rh' },
        { midi: 60, onset: 960, duration: 120, hand: 'rh' },
        { midi: 64, onset: 960, duration: 120, hand: 'rh' },
        { midi: 69, onset: 960, duration: 120, hand: 'rh' },
        { midi: 60, onset: 1200, duration: 120, hand: 'rh' },
        { midi: 64, onset: 1200, duration: 120, hand: 'rh' },
        { midi: 69, onset: 1200, duration: 120, hand: 'rh' },
        // bar 2
        { midi: 60, onset: 1920, duration: 120, hand: 'rh' },
        { midi: 64, onset: 1920, duration: 120, hand: 'rh' },
        { midi: 69, onset: 1920, duration: 120, hand: 'rh' },
        { midi: 60, onset: 2280, duration: 120, hand: 'rh' },
        { midi: 64, onset: 2280, duration: 120, hand: 'rh' },
        { midi: 69, onset: 2280, duration: 120, hand: 'rh' },
        { midi: 60, onset: 2880, duration: 120, hand: 'rh' },
        { midi: 64, onset: 2880, duration: 120, hand: 'rh' },
        { midi: 69, onset: 2880, duration: 120, hand: 'rh' },
        { midi: 60, onset: 3120, duration: 120, hand: 'rh' },
        { midi: 64, onset: 3120, duration: 120, hand: 'rh' },
        { midi: 69, onset: 3120, duration: 120, hand: 'rh' },
        // bar 3: final downbeat — LH root + RH Funk9
        { midi: 38, onset: 3840, duration: 120, hand: 'lh' },
        { midi: 60, onset: 3840, duration: 120, hand: 'rh' },
        { midi: 64, onset: 3840, duration: 120, hand: 'rh' },
        { midi: 69, onset: 3840, duration: 120, hand: 'rh' },
      ],
    },
    // ── D1.3: Dm7 → Gdom9 "Drop the Sizzle" ──────────────────────────────
    {
      stepNumber: 46,
      module: 'funk_l1',
      section: 'D',
      subsection: 'D1: LH Bass + RH Chords',
      activity: 'D1.3: LH Root + RH Drop the Sizzle — Dm7→Gdom9 (In Time)',
      direction:
        'LH holds D2 (Dm7 bars) then G2 (Gdom9 bars). RH: Dm7 [C4-F4-A4], then Drop the Sizzle to Gdom9 [B3-F4-A4] — the C slides down a half step to B. Two bars each.',
      assessment: 'pitch_order_timing',
      tag: 'funk:performance_drop_sizzle_dm7_gdom9_it | funk',
      styleRef: 'l1a',
      successFeedback:
        'Drop the Sizzle with both hands — chord change, one note moves.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1a',
      },
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      chordSymbols: ['Dm7', 'Gdom9'],
      targetNotes: [
        // Bars 1-2: LH D2, RH Dm7 [C4-F4-A4] Stab 1
        { midi: 38, onset: 0, duration: 460, hand: 'lh' },
        { midi: 38, onset: 960, duration: 460, hand: 'lh' },
        { midi: 38, onset: 1920, duration: 460, hand: 'lh' },
        { midi: 38, onset: 2880, duration: 460, hand: 'lh' },
        { midi: 60, onset: 0, duration: 120, hand: 'rh' },
        { midi: 65, onset: 0, duration: 120, hand: 'rh' },
        { midi: 69, onset: 0, duration: 120, hand: 'rh' },
        { midi: 60, onset: 360, duration: 120, hand: 'rh' },
        { midi: 65, onset: 360, duration: 120, hand: 'rh' },
        { midi: 69, onset: 360, duration: 120, hand: 'rh' },
        { midi: 60, onset: 960, duration: 120, hand: 'rh' },
        { midi: 65, onset: 960, duration: 120, hand: 'rh' },
        { midi: 69, onset: 960, duration: 120, hand: 'rh' },
        { midi: 60, onset: 1200, duration: 120, hand: 'rh' },
        { midi: 65, onset: 1200, duration: 120, hand: 'rh' },
        { midi: 69, onset: 1200, duration: 120, hand: 'rh' },
        { midi: 60, onset: 1920, duration: 120, hand: 'rh' },
        { midi: 65, onset: 1920, duration: 120, hand: 'rh' },
        { midi: 69, onset: 1920, duration: 120, hand: 'rh' },
        { midi: 60, onset: 2280, duration: 120, hand: 'rh' },
        { midi: 65, onset: 2280, duration: 120, hand: 'rh' },
        { midi: 69, onset: 2280, duration: 120, hand: 'rh' },
        { midi: 60, onset: 2880, duration: 120, hand: 'rh' },
        { midi: 65, onset: 2880, duration: 120, hand: 'rh' },
        { midi: 69, onset: 2880, duration: 120, hand: 'rh' },
        { midi: 60, onset: 3120, duration: 120, hand: 'rh' },
        { midi: 65, onset: 3120, duration: 120, hand: 'rh' },
        { midi: 69, onset: 3120, duration: 120, hand: 'rh' },
        // Bars 3-4: LH G2, RH Gdom9 [B3-F4-A4] Drop the Sizzle
        { midi: 43, onset: 3840, duration: 460, hand: 'lh' },
        { midi: 43, onset: 4800, duration: 460, hand: 'lh' },
        { midi: 43, onset: 5760, duration: 460, hand: 'lh' },
        { midi: 43, onset: 6720, duration: 460, hand: 'lh' },
        { midi: 59, onset: 3840, duration: 120, hand: 'rh' },
        { midi: 65, onset: 3840, duration: 120, hand: 'rh' },
        { midi: 69, onset: 3840, duration: 120, hand: 'rh' },
        { midi: 59, onset: 4200, duration: 120, hand: 'rh' },
        { midi: 65, onset: 4200, duration: 120, hand: 'rh' },
        { midi: 69, onset: 4200, duration: 120, hand: 'rh' },
        { midi: 59, onset: 4800, duration: 120, hand: 'rh' },
        { midi: 65, onset: 4800, duration: 120, hand: 'rh' },
        { midi: 69, onset: 4800, duration: 120, hand: 'rh' },
        { midi: 59, onset: 5040, duration: 120, hand: 'rh' },
        { midi: 65, onset: 5040, duration: 120, hand: 'rh' },
        { midi: 69, onset: 5040, duration: 120, hand: 'rh' },
        { midi: 59, onset: 5760, duration: 120, hand: 'rh' },
        { midi: 65, onset: 5760, duration: 120, hand: 'rh' },
        { midi: 69, onset: 5760, duration: 120, hand: 'rh' },
        { midi: 59, onset: 6120, duration: 120, hand: 'rh' },
        { midi: 65, onset: 6120, duration: 120, hand: 'rh' },
        { midi: 69, onset: 6120, duration: 120, hand: 'rh' },
        { midi: 59, onset: 6720, duration: 120, hand: 'rh' },
        { midi: 65, onset: 6720, duration: 120, hand: 'rh' },
        { midi: 69, onset: 6720, duration: 120, hand: 'rh' },
        { midi: 59, onset: 6960, duration: 120, hand: 'rh' },
        { midi: 65, onset: 6960, duration: 120, hand: 'rh' },
        { midi: 69, onset: 6960, duration: 120, hand: 'rh' },
        // Bar 5: final downbeat — LH D2 + RH Dm7 (back to first chord)
        { midi: 38, onset: 7680, duration: 120, hand: 'lh' },
        { midi: 60, onset: 7680, duration: 120, hand: 'rh' },
        { midi: 65, onset: 7680, duration: 120, hand: 'rh' },
        { midi: 69, onset: 7680, duration: 120, hand: 'rh' },
      ],
    },
    // ── D1.4: LH Octave-Pop + RH Funk9 ──────────────────────────────────
    {
      stepNumber: 47,
      module: 'funk_l1',
      section: 'D',
      subsection: 'D1: LH Bass + RH Chords',
      activity: 'D1.4: LH Octave-Pop + RH Funk9 (In Time)',
      direction:
        'Left hand plays the octave-pop pattern (D2→D3), right hand plays Funk9 stabs [C4-E4-A4]. Keep that bounce going.',
      assessment: 'pitch_order_timing',
      tag: 'funk:performance_lh_octave_pop_rh_funk9_it | funk',
      styleRef: 'l1a',
      successFeedback:
        'Octave-pop bass and Funk9 chords — full groove from one player.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l1a',
      },
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
      chordSymbols: ['Dm7'],
      targetNotes: [
        // LH — D2-D3 octave pop (beats 1 and and-of-2)
        { midi: 38, onset: 0, duration: 460, hand: 'lh' },
        { midi: 50, onset: 480, duration: 120, hand: 'lh' },
        { midi: 38, onset: 960, duration: 460, hand: 'lh' },
        { midi: 50, onset: 1440, duration: 120, hand: 'lh' },
        { midi: 38, onset: 1920, duration: 460, hand: 'lh' },
        { midi: 50, onset: 2400, duration: 120, hand: 'lh' },
        { midi: 38, onset: 2880, duration: 460, hand: 'lh' },
        { midi: 50, onset: 3360, duration: 120, hand: 'lh' },
        // RH — Funk9 stabs on comp_funk_s1 (bar 1)
        { midi: 60, onset: 0, duration: 120, hand: 'rh' },
        { midi: 64, onset: 0, duration: 120, hand: 'rh' },
        { midi: 69, onset: 0, duration: 120, hand: 'rh' },
        { midi: 60, onset: 360, duration: 120, hand: 'rh' },
        { midi: 64, onset: 360, duration: 120, hand: 'rh' },
        { midi: 69, onset: 360, duration: 120, hand: 'rh' },
        { midi: 60, onset: 960, duration: 120, hand: 'rh' },
        { midi: 64, onset: 960, duration: 120, hand: 'rh' },
        { midi: 69, onset: 960, duration: 120, hand: 'rh' },
        { midi: 60, onset: 1200, duration: 120, hand: 'rh' },
        { midi: 64, onset: 1200, duration: 120, hand: 'rh' },
        { midi: 69, onset: 1200, duration: 120, hand: 'rh' },
        // bar 2
        { midi: 60, onset: 1920, duration: 120, hand: 'rh' },
        { midi: 64, onset: 1920, duration: 120, hand: 'rh' },
        { midi: 69, onset: 1920, duration: 120, hand: 'rh' },
        { midi: 60, onset: 2280, duration: 120, hand: 'rh' },
        { midi: 64, onset: 2280, duration: 120, hand: 'rh' },
        { midi: 69, onset: 2280, duration: 120, hand: 'rh' },
        { midi: 60, onset: 2880, duration: 120, hand: 'rh' },
        { midi: 64, onset: 2880, duration: 120, hand: 'rh' },
        { midi: 69, onset: 2880, duration: 120, hand: 'rh' },
        { midi: 60, onset: 3120, duration: 120, hand: 'rh' },
        { midi: 64, onset: 3120, duration: 120, hand: 'rh' },
        { midi: 69, onset: 3120, duration: 120, hand: 'rh' },
        // bar 3: final downbeat — LH D2 + RH Funk9
        { midi: 38, onset: 3840, duration: 120, hand: 'lh' },
        { midi: 60, onset: 3840, duration: 120, hand: 'rh' },
        { midi: 64, onset: 3840, duration: 120, hand: 'rh' },
        { midi: 69, onset: 3840, duration: 120, hand: 'rh' },
      ],
    },

    // ── D2: LH Bass + RH Melody (2 steps) ───────────────────────────────
    // NOTE: ActivityStepV2 instrument_config — pending type merge by Ryan
    {
      stepNumber: 45,
      module: 'funk_l1',
      section: 'D',
      subsection: 'D2: LH Bass + RH Melody',
      activity: 'D2.1: LH Root Groove + RH Pentatonic Phrase (In Time)',
      direction:
        'Left hand plays root bass groove (D2 on beats 1+3 with pickups), right hand plays a D minor pentatonic melody phrase. Drums and chords are provided.',
      assessment: 'pitch_order_timing',
      tag: 'funk:performance_lh_bass_rh_melody_oot | funk',
      styleRef: 'l1a',
      successFeedback:
        'Bass and melody from one player — you are telling the whole story.',
      contentGeneration:
        'GCM v8: FUNK L1 Performance. LH: D2=38 root groove beats 1+3 with a-of pickups. RH: D minor pentatonic call+answer. Register: LH octave 2, RH C4-C5. Style: l1a.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_melody',
        lh_role: 'bass',
        rh_role: 'melody',
        style_ref: 'l1a',
      },
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass', 'melody'],
      },
      chordSymbols: ['Dm7'],
      targetNotes: [
        // LH — D2 root groove
        { midi: 38, onset: 0, duration: 460, hand: 'lh' }, // D2 beat1
        { midi: 38, onset: 400, duration: 120, hand: 'lh' }, // D2 a-of-1
        { midi: 38, onset: 960, duration: 460, hand: 'lh' }, // D2 beat3
        { midi: 38, onset: 1360, duration: 120, hand: 'lh' }, // D2 a-of-3
        { midi: 38, onset: 1920, duration: 460, hand: 'lh' }, // D2 beat1 bar2
        { midi: 38, onset: 2320, duration: 120, hand: 'lh' }, // D2 a-of-1
        { midi: 38, onset: 2880, duration: 460, hand: 'lh' }, // D2 beat3
        { midi: 38, onset: 3280, duration: 120, hand: 'lh' }, // D2 a-of-3
        // RH bar1 — call phrase
        { midi: 69, onset: 0, duration: 480, hand: 'rh' }, // A4 beat1
        { midi: 65, onset: 600, duration: 240, hand: 'rh' }, // F4 e-of-2
        { midi: 67, onset: 840, duration: 120, hand: 'rh' }, // G4 a-of-2 pickup (was A4)
        { midi: 69, onset: 960, duration: 960, hand: 'rh' }, // A4 beat3 held
        // RH bar2 — answer phrase
        { midi: 69, onset: 1920, duration: 480, hand: 'rh' }, // A4 beat1
        { midi: 65, onset: 2520, duration: 240, hand: 'rh' }, // F4 beat2.2
        { midi: 67, onset: 2760, duration: 120, hand: 'rh' }, // G4 pickup (Dorian color)
        { midi: 65, onset: 2880, duration: 960, hand: 'rh' }, // F4 beat3 held
        // bar 3: final downbeat — LH D2 + RH A4 resolve
        { midi: 38, onset: 3840, duration: 120, hand: 'lh' },
        { midi: 69, onset: 3840, duration: 120, hand: 'rh' },
      ],
    },
    // NOTE: ActivityStepV2 instrument_config — pending type merge by Ryan
    {
      stepNumber: 46,
      module: 'funk_l1',
      section: 'D',
      subsection: 'D2: LH Chords + RH Melody',
      activity: 'D2.2: LH Dm7→G7 Shell + RH Pentatonic Melody (In Time)',
      direction:
        'Left hand: Dm7 1-3-7 shell (D3-F3-C4) in bar 1. Bar 2: Drop the Sizzle — only C4 drops to B3, giving you G7 (D3-F3-B3). D and F stay put. Right hand plays D blues melody. Drums provided.',
      assessment: 'pitch_order_timing_duration',
      tag: 'funk:performance_lh_chords_rh_melody_it | funk',
      styleRef: 'l1a',
      successFeedback:
        'Dm7 to G7 with one note moving — Drop the Sizzle in the pocket.',
      contentGeneration:
        'GCM v8: FUNK L1 Performance IT. LH: Dm7 1-3-7 [D3=50, F3=53, C4=60] bar 1; G7 shell [D3=50, F3=53, B3=59] bar 2 (Drop the Sizzle — C4→B3). comp_funk_s1. RH: D blues melody call+answer. Backing: drums. Tempo: 88-96 BPM. Style: l1a.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_chords_rh_melody',
        lh_role: 'chords',
        rh_role: 'melody',
        style_ref: 'l1a',
      },
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['chords', 'melody'],
      },
      chordSymbols: ['Dm7', 'G7'],
      targetNotes: [
        // LH bar 1 — Dm7 1-3-7 = D3-F3-C4, Funk Stab 1 rhythm
        { midi: 50, onset: 0, duration: 120, hand: 'lh' }, // D3
        { midi: 53, onset: 0, duration: 120, hand: 'lh' }, // F3
        { midi: 60, onset: 0, duration: 120, hand: 'lh' }, // C4
        { midi: 50, onset: 360, duration: 120, hand: 'lh' },
        { midi: 53, onset: 360, duration: 120, hand: 'lh' },
        { midi: 60, onset: 360, duration: 120, hand: 'lh' },
        { midi: 50, onset: 960, duration: 120, hand: 'lh' },
        { midi: 53, onset: 960, duration: 120, hand: 'lh' },
        { midi: 60, onset: 960, duration: 120, hand: 'lh' },
        { midi: 50, onset: 1200, duration: 120, hand: 'lh' },
        { midi: 53, onset: 1200, duration: 120, hand: 'lh' },
        { midi: 60, onset: 1200, duration: 120, hand: 'lh' },
        // LH bar 2 — G7 Drop the Sizzle = D3-F3-B3 (C4 drops to B3)
        { midi: 50, onset: 1920, duration: 120, hand: 'lh' }, // D3
        { midi: 53, onset: 1920, duration: 120, hand: 'lh' }, // F3
        { midi: 59, onset: 1920, duration: 120, hand: 'lh' }, // B3 — the sizzle
        { midi: 50, onset: 2280, duration: 120, hand: 'lh' },
        { midi: 53, onset: 2280, duration: 120, hand: 'lh' },
        { midi: 59, onset: 2280, duration: 120, hand: 'lh' },
        { midi: 50, onset: 2880, duration: 120, hand: 'lh' },
        { midi: 53, onset: 2880, duration: 120, hand: 'lh' },
        { midi: 59, onset: 2880, duration: 120, hand: 'lh' },
        { midi: 50, onset: 3120, duration: 120, hand: 'lh' },
        { midi: 53, onset: 3120, duration: 120, hand: 'lh' },
        { midi: 59, onset: 3120, duration: 120, hand: 'lh' },
        // RH — D blues melody call+answer
        { midi: 69, onset: 0, duration: 480, hand: 'rh' }, // A4 beat1
        { midi: 65, onset: 600, duration: 240, hand: 'rh' }, // F4
        { midi: 67, onset: 840, duration: 120, hand: 'rh' }, // G4 pickup
        { midi: 69, onset: 960, duration: 960, hand: 'rh' }, // A4 held
        { midi: 69, onset: 1920, duration: 480, hand: 'rh' }, // A4 beat1
        { midi: 65, onset: 2520, duration: 240, hand: 'rh' }, // F4
        { midi: 67, onset: 2760, duration: 120, hand: 'rh' }, // G4 pickup
        { midi: 65, onset: 2880, duration: 960, hand: 'rh' }, // F4 resolve held
        // bar 3: final downbeat — LH Dm7 resolve + RH A4
        { midi: 50, onset: 3840, duration: 120, hand: 'lh' }, // D3
        { midi: 53, onset: 3840, duration: 120, hand: 'lh' }, // F3
        { midi: 60, onset: 3840, duration: 120, hand: 'lh' }, // C4
        { midi: 69, onset: 3840, duration: 120, hand: 'rh' }, // A4
      ],
    },
    {
      stepNumber: 46,
      module: 'funk_l1',
      section: 'D',
      subsection: 'D2: LH Chords + RH Melody',
      activity: 'D2.3: LH Dm7→G7 Shell + RH Blues Melody (In Time)',
      direction:
        'Left hand: Dm7 shell (D3-F3-C4) stabs for bar 1. Right hand plays the D blues melody — Ab→G→F→D twice, one on beat 1 and one on beat 3. Drop the Sizzle lands on beat 1 of bar 2: LH switches to G7 (D3-F3-B3) as RH hits D5. Drums provided.',
      assessment: 'pitch_order_timing_duration',
      tag: 'funk:performance_lh_chords_rh_blues_melody_it | funk',
      styleRef: 'l1a',
      successFeedback:
        'Blues melody with Drop the Sizzle — chords and the blue note together.',
      contentGeneration:
        'GCM v8: FUNK L1 Performance IT. LH: Dm7 1-3-7 [D3=50, F3=53, C4=60] bar 1 stabs; G7 Drop the Sizzle [D3=50, F3=53, B3=59] on final downbeat. RH: D blues lick Ab4→G4→F4→D4 ×2 (beat 1 + beat 3), resolve D5 on bar 2. Backing: drums. Style: l1a.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_chords_rh_melody',
        lh_role: 'chords',
        rh_role: 'melody',
        style_ref: 'l1a',
      },
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['chords', 'melody'],
      },
      chordSymbols: ['Dm7', 'G7'],
      targetNotes: [
        // LH bar 1 — Dm7 1-3-7 = D3-F3-C4, Funk Stab 1 rhythm
        { midi: 50, onset: 0, duration: 120, hand: 'lh' }, // D3
        { midi: 53, onset: 0, duration: 120, hand: 'lh' }, // F3
        { midi: 60, onset: 0, duration: 120, hand: 'lh' }, // C4
        { midi: 50, onset: 360, duration: 120, hand: 'lh' },
        { midi: 53, onset: 360, duration: 120, hand: 'lh' },
        { midi: 60, onset: 360, duration: 120, hand: 'lh' },
        { midi: 50, onset: 960, duration: 120, hand: 'lh' },
        { midi: 53, onset: 960, duration: 120, hand: 'lh' },
        { midi: 60, onset: 960, duration: 120, hand: 'lh' },
        { midi: 50, onset: 1200, duration: 120, hand: 'lh' },
        { midi: 53, onset: 1200, duration: 120, hand: 'lh' },
        { midi: 60, onset: 1200, duration: 120, hand: 'lh' },
        // RH bar 1 — D blues lick ×2 (beat 1 + beat 3)
        { midi: 68, onset: 0, duration: 120, hand: 'rh' }, // Ab4 — blue note
        { midi: 67, onset: 120, duration: 120, hand: 'rh' }, // G4
        { midi: 65, onset: 240, duration: 120, hand: 'rh' }, // F4
        { midi: 62, onset: 360, duration: 360, hand: 'rh' }, // D4 — dotted quarter
        { midi: 68, onset: 960, duration: 120, hand: 'rh' }, // Ab4 — blue note
        { midi: 67, onset: 1080, duration: 120, hand: 'rh' }, // G4
        { midi: 65, onset: 1200, duration: 120, hand: 'rh' }, // F4
        { midi: 62, onset: 1320, duration: 360, hand: 'rh' }, // D4 — dotted quarter
        // Final downbeat — LH Dm7 resolve + RH D5
        { midi: 50, onset: 1920, duration: 120, hand: 'lh' }, // D3
        { midi: 53, onset: 1920, duration: 120, hand: 'lh' }, // F3
        { midi: 60, onset: 1920, duration: 120, hand: 'lh' }, // C4
        { midi: 74, onset: 1920, duration: 120, hand: 'rh' }, // D5 — resolve
      ],
    },
  ],
};

// ===========================================================================
// L2 — "Syncopation & Sauce"
// Style ref: l2a (Stevie/Superstition) or l2b (Prince/early 80s)
// Key: C minor (Dorian) | Tempo: 95-108 BPM | Subtle-heavy 16th swing
//
// VOICE LEADING DEFAULT: proximity algorithm — minimize total semitone movement across all voices.
// Common tones stay. Other voices move to nearest chord tone.
// Funk stabs are short so voice leading is less critical than Jazz,
// but register consistency is mandatory — no jumps of more than a 5th between chord changes.
// Exception: parallel chords (Neo Soul style override) and wide two-hand voicings (Jazz L3).
// ===========================================================================

// ---------------------------------------------------------------------------
// L2 Section A — Melody (14 steps, steps 47-60)
// ---------------------------------------------------------------------------

const funkL2SectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    // ── A1: Dorian Scale + Blues (6 steps) ───────────────────────────────
    {
      stepNumber: 99,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A1: Dorian Scale + Blues',
      activity: 'A1.1: C Dorian Scale Ascending (Out of Time)',
      direction:
        'Play the C Dorian scale going up. Listen for the natural 6 (A natural) — that is the Dorian fingerprint.',
      assessment: 'pitch_only',
      tag: 'funk:dorian_ascending_oot | funk',
      styleRef: 'l3a',
      successFeedback:
        'C Dorian — the A natural is what makes this sound different from natural minor.',
      targetNotes: [
        { midi: 60, onset: 0, duration: 460 },
        { midi: 62, onset: 480, duration: 460 },
        { midi: 63, onset: 960, duration: 460 },
        { midi: 65, onset: 1440, duration: 460 },
        { midi: 67, onset: 1920, duration: 460 },
        { midi: 69, onset: 2400, duration: 460 },
        { midi: 70, onset: 2880, duration: 460 },
        { midi: 72, onset: 3360, duration: 460 },
      ],
    },
    {
      stepNumber: 100,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A1: Dorian Scale + Blues',
      activity: 'A1.2: C Dorian Scale Descending (Out of Time)',
      direction:
        'Play the C Dorian scale going down. Feel how the natural 6 (A) pulls you through the descent.',
      assessment: 'pitch_only',
      tag: 'funk:dorian_descending_oot | funk',
      styleRef: 'l3a',
      successFeedback:
        'Descending Dorian — that A natural passing through is the sweet spot.',
      targetNotes: [
        { midi: 72, onset: 0, duration: 460 },
        { midi: 70, onset: 480, duration: 460 },
        { midi: 69, onset: 960, duration: 460 },
        { midi: 67, onset: 1440, duration: 460 },
        { midi: 65, onset: 1920, duration: 460 },
        { midi: 63, onset: 2400, duration: 460 },
        { midi: 62, onset: 2880, duration: 460 },
        { midi: 60, onset: 3360, duration: 460 },
      ],
    },
    {
      stepNumber: 101,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A1: Dorian Scale + Blues',
      activity: 'A1.3: C Dorian Scale — Up & Down (In Time)',
      direction:
        'In a steady tempo, play the C Dorian scale going up to C5 and back down. Listen for the natural 6 (A) both ways.',
      assessment: 'pitch_order_timing',
      tag: 'funk:dorian_up_down_it | funk',
      styleRef: 'l3a',
      successFeedback:
        'Dorian up and down in time — that natural 6 is the key to the sound.',
      targetNotes: [
        { midi: 60, onset: 0, duration: 480 }, // C4  — up
        { midi: 62, onset: 480, duration: 480 }, // D4
        { midi: 63, onset: 960, duration: 480 }, // Eb4
        { midi: 65, onset: 1440, duration: 480 }, // F4
        { midi: 67, onset: 1920, duration: 480 }, // G4
        { midi: 69, onset: 2400, duration: 480 }, // A4  — nat. 6
        { midi: 70, onset: 2880, duration: 480 }, // Bb4
        { midi: 72, onset: 3360, duration: 480 }, // C5  — top
        { midi: 70, onset: 3840, duration: 480 }, // Bb4 — down
        { midi: 69, onset: 4320, duration: 480 }, // A4  — nat. 6
        { midi: 67, onset: 4800, duration: 480 }, // G4
        { midi: 65, onset: 5280, duration: 480 }, // F4
        { midi: 63, onset: 5760, duration: 480 }, // Eb4
        { midi: 62, onset: 6240, duration: 480 }, // D4
        { midi: 60, onset: 6720, duration: 480 }, // C4
      ],
    },
    {
      stepNumber: 102,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A1: Dorian Scale + Blues',
      activity: 'A1.4: C Minor Blues Scale Ascending (Out of Time)',
      direction:
        'Play the C minor blues scale going up. The b5 (Gb) is the blue note — feel how it adds grit between the 4th and 5th.',
      assessment: 'pitch_only',
      tag: 'funk:minor_blues_ascending_oot_l3 | funk',
      styleRef: 'l3a',
      scaleId: 'minor_blues',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      successFeedback:
        'Blues scale up — that Gb gives you the edge Dorian alone does not have.',
      targetNotes: [
        { midi: 60, onset: 0, duration: 480 }, // C4
        { midi: 63, onset: 480, duration: 480 }, // Eb4
        { midi: 65, onset: 960, duration: 480 }, // F4
        { midi: 66, onset: 1440, duration: 480 }, // Gb4 — blue note
        { midi: 67, onset: 1920, duration: 480 }, // G4
        { midi: 70, onset: 2400, duration: 480 }, // Bb4
        { midi: 72, onset: 2880, duration: 480 }, // C5
      ],
    },
    {
      stepNumber: 103,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A1: Dorian Scale + Blues',
      activity: 'A1.5: C Minor Blues Scale Descending (Out of Time)',
      direction:
        'Play the C minor blues scale going down. Feel the Gb on the way back.',
      assessment: 'pitch_only',
      tag: 'funk:minor_blues_descending_oot_l3 | funk',
      styleRef: 'l3a',
      scaleId: 'minor_blues',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      successFeedback: 'Blues scale down — smooth and intentional.',
      targetNotes: [
        { midi: 72, onset: 0, duration: 480 }, // C5
        { midi: 70, onset: 480, duration: 480 }, // Bb4
        { midi: 67, onset: 960, duration: 480 }, // G4
        { midi: 66, onset: 1440, duration: 480 }, // Gb4 — blue note
        { midi: 65, onset: 1920, duration: 480 }, // F4
        { midi: 63, onset: 2400, duration: 480 }, // Eb4
        { midi: 60, onset: 2880, duration: 480 }, // C4
      ],
    },
    {
      stepNumber: 104,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A1: Dorian Scale + Blues',
      activity: 'A1.6: C Minor Blues Scale — Up & Down (In Time)',
      direction:
        'In a steady tempo, play the C minor blues scale going up to C5 and back down. Listen for the Gb both ways.',
      assessment: 'pitch_order_timing',
      tag: 'funk:minor_blues_up_down_it_l3 | funk',
      styleRef: 'l3a',
      scaleId: 'minor_blues',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      successFeedback:
        'Blues scale up and down in time — that blue note groove is locked in.',
      targetNotes: [
        { midi: 60, onset: 0, duration: 480 }, // C4  — up
        { midi: 63, onset: 480, duration: 480 }, // Eb4
        { midi: 65, onset: 960, duration: 480 }, // F4
        { midi: 66, onset: 1440, duration: 480 }, // Gb4 — blue note
        { midi: 67, onset: 1920, duration: 480 }, // G4
        { midi: 70, onset: 2400, duration: 480 }, // Bb4
        { midi: 72, onset: 2880, duration: 480 }, // C5  — top
        { midi: 70, onset: 3360, duration: 480 }, // Bb4 — down
        { midi: 67, onset: 3840, duration: 480 }, // G4
        { midi: 66, onset: 4320, duration: 480 }, // Gb4 — blue note
        { midi: 65, onset: 4800, duration: 480 }, // F4
        { midi: 63, onset: 5280, duration: 480 }, // Eb4
        { midi: 60, onset: 5760, duration: 480 }, // C4
      ],
    },
    {
      stepNumber: 105,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A1: Dorian Scale + Blues',
      activity: 'A1.7: Natural 6 (A♮) Emphasis Exercise (Out of Time)',
      direction:
        'Play this ornamental descent: B♭→A→G (b7→♮6→5). The A natural is the Dorian character note — it is what separates Dorian from natural minor. This three-note phrase is the L3 melodic signature.',
      assessment: 'pitch_only',
      tag: 'funk:dorian_nat6_emphasis_oot | funk',
      styleRef: 'l3a',
      successFeedback:
        'The Dorian descent — Bb to A to G. Three notes that define the mode.',
      contentGeneration:
        'GCM v8: FUNK L3 melody Dorian character note exercise. Phrase: b7-6-5 descending (Bb4-A4-G4 = MIDI 70-69-67). Natural 6 = A4 (MIDI 69) is the Dorian fingerprint. Scale: dorian [0,2,3,5,7,9,10]. Key: C minor. Register: C4-C5.',
      targetNotes: [
        { midi: 70, onset: 0, duration: 480 }, // Bb4 — b7
        { midi: 69, onset: 480, duration: 480 }, // A4 — ♮6 (Dorian character note)
        { midi: 67, onset: 960, duration: 960 }, // G4 — 5th (long resolve)
      ],
    },

    // ── A2: Melodic Phrases (6 steps) ────────────────────────────────────
    {
      stepNumber: 106,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: "A2.1: 2-Bar Phrase — Motivic Repetition (A-A') (Out of Time)",
      direction:
        'Learn a 2-bar phrase where bar 2 repeats bar 1 with a small variation. Same rhythm, one note changed.',
      assessment: 'pitch_only',
      tag: 'funk:phrase_motivic_repetition_2bar_oot | funk',
      styleRef: 'l3a',
      successFeedback:
        'Motivic repetition — repeat the idea, change one thing. That is how funk melodies are built.',
      contentGeneration:
        "GCM v8: FUNK L3 melody phrase → motivic_repetition (A-A'). Melody_Phrase_Rhythm_Library: genre=funk, phrase_rhythm_bars=2, contour_notes=[4,5], rhythm_tiers=[2,3], zero_point_options=[0,2,4]. Melody_Contour_Library: contour_tiers=[2,3], contour=motivic_aa_prime (bar1=phrase, bar2=same_rhythm_varied_tail). Scale: dorian [0,2,3,5,7,9,10]. Key: C minor. Register: C4-C5.",
      targetNotes: [
        // Bar 1: A phrase — Dorian descent Bb-A-G
        { midi: 70, onset: 0, duration: 480 }, // Bb4 (b7)
        { midi: 69, onset: 480, duration: 480 }, // A4 (nat.6)
        { midi: 67, onset: 960, duration: 960 }, // G4 long resolve
        // Bar 2: A' phrase — same rhythm, one step lower
        { midi: 70, onset: 1920, duration: 480 }, // Bb4
        { midi: 69, onset: 2400, duration: 240 }, // A4
        { midi: 65, onset: 2640, duration: 240 }, // F4
        { midi: 67, onset: 2880, duration: 960 }, // G4 long resolve (variation)
      ],
    },
    {
      stepNumber: 107,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.2: 2-Bar Phrase — Motivic Repetition (In Time)',
      direction: 'Play the motivic repetition phrase in time.',
      assessment: 'pitch_order_timing',
      tag: 'funk:phrase_motivic_repetition_2bar_it | funk',
      styleRef: 'l3a',
      successFeedback:
        "A-A' in the groove — the repetition locks the listener in.",
      contentGeneration:
        "GCM v8: FUNK L3 melody phrase → motivic_repetition (A-A'). Melody_Phrase_Rhythm_Library: genre=funk, phrase_rhythm_bars=2, contour_notes=[4,5], rhythm_tiers=[2,3], zero_point_options=[0,2,4]. Melody_Contour_Library: contour_tiers=[2,3], contour=motivic_aa_prime. Scale: dorian [0,2,3,5,7,9,10]. Key: C minor. Register: C4-C5. Tempo: 95-108 BPM.",
      targetNotes: [
        { midi: 70, onset: 0, duration: 480 },
        { midi: 69, onset: 480, duration: 480 },
        { midi: 67, onset: 960, duration: 960 },
        { midi: 70, onset: 1920, duration: 480 },
        { midi: 69, onset: 2400, duration: 240 },
        { midi: 65, onset: 2640, duration: 240 },
        { midi: 67, onset: 2880, duration: 960 },
      ],
    },
    {
      stepNumber: 108,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.3: 2-Bar Phrase — Call + Varied Answer (Out of Time)',
      direction:
        'Learn a 2-bar call-and-answer: bar 1 calls, bar 2 answers with a different rhythm but lands on the same target note. The answer should include the b7→♮6 descent (B♭→A) — the Dorian signature.',
      assessment: 'pitch_only',
      tag: 'funk:phrase_call_varied_answer_2bar_oot | funk',
      styleRef: 'l3a',
      successFeedback:
        'Call and varied answer with the Dorian descent — this is Stevie Wonder territory.',
      contentGeneration:
        'GCM v8: FUNK L3 melody phrase → call_varied_answer. Melody_Phrase_Rhythm_Library: genre=funk, phrase_rhythm_bars=2, contour_notes=[4,5], rhythm_tiers=[2,3], zero_point_options=[0,2,4]. Melody_Contour_Library: contour_tiers=[2,3], contour=call_varied_answer (bar1=call, bar2=varied_rhythm_same_target). Chromatic_passing=true. Must include b7-6 descent (Bb4-A4 = MIDI 70-69) in answer phrase. Scale: dorian [0,2,3,5,7,9,10]. Key: C minor. Register: C4-C5.',
      targetNotes: [
        // Bar 1: call
        { midi: 72, onset: 0, duration: 480 }, // C5
        { midi: 70, onset: 480, duration: 240 }, // Bb4
        { midi: 67, onset: 720, duration: 240 }, // G4
        { midi: 65, onset: 960, duration: 960 }, // F4 long
        // Bar 2: varied answer — includes Bb→A descent
        { midi: 72, onset: 1920, duration: 240 }, // C5
        { midi: 70, onset: 2160, duration: 240 }, // Bb4 (b7)
        { midi: 69, onset: 2400, duration: 480 }, // A4 (nat.6 — Dorian!)
        { midi: 67, onset: 2880, duration: 960 }, // G4 long resolve
      ],
    },
    {
      stepNumber: 109,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.4: 2-Bar Phrase — Call + Varied Answer (In Time)',
      direction:
        'Play the call-and-varied-answer phrase in time. Feel the Bb→A pull in the answer bar.',
      assessment: 'pitch_order_timing',
      tag: 'funk:phrase_call_varied_answer_2bar_it | funk',
      styleRef: 'l3a',
      successFeedback:
        'Call and answer in the pocket — the Dorian descent lands every time.',
      contentGeneration:
        'GCM v8: FUNK L3 melody phrase → call_varied_answer. Melody_Phrase_Rhythm_Library: genre=funk, phrase_rhythm_bars=2, contour_notes=[4,5], rhythm_tiers=[2,3], zero_point_options=[0,2,4]. Melody_Contour_Library: contour_tiers=[2,3], contour=call_varied_answer. Chromatic_passing=true. Must include b7-6 descent (Bb4-A4). Scale: dorian [0,2,3,5,7,9,10]. Key: C minor. Register: C4-C5. Tempo: 95-108 BPM.',
      targetNotes: [
        { midi: 72, onset: 0, duration: 480 },
        { midi: 70, onset: 480, duration: 240 },
        { midi: 67, onset: 720, duration: 240 },
        { midi: 65, onset: 960, duration: 960 },
        { midi: 72, onset: 1920, duration: 240 },
        { midi: 70, onset: 2160, duration: 240 },
        { midi: 69, onset: 2400, duration: 480 },
        { midi: 67, onset: 2880, duration: 960 },
      ],
    },
    {
      stepNumber: 110,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.5: 4-Bar Phrase — Density Arc (Out of Time)',
      direction:
        'Learn a 4-bar phrase that builds in density: bars 1-2 are sparse, bar 3 picks up, bar 4 is the densest run resolving to a long held note.',
      assessment: 'pitch_only',
      tag: 'funk:phrase_density_arc_4bar_oot | funk',
      styleRef: 'l3a',
      successFeedback:
        'The density arc — sparse to dense to resolution. That is how funk melodies breathe.',
      contentGeneration:
        'GCM v8: FUNK L3 melody phrase → density_arc. Melody_Phrase_Rhythm_Library: genre=funk, phrase_rhythm_bars=2, contour_notes=[4,5], rhythm_tiers=[2,3], zero_point_options=[0,2,4], contour_concat=2→4. Melody_Contour_Library: contour_tiers=[2,3], contour=density_arc (bars1-2=sparse, bar3=medium, bar4=dense_run→long_hold). Cluster→resolve rule: long note closes phrase. Chromatic_passing=true. Scale: dorian [0,2,3,5,7,9,10]. Key: C minor. Register: C4-C5.',
      targetNotes: [
        // Bar 1: sparse — 2 notes
        { midi: 72, onset: 0, duration: 480 }, // C5
        { midi: 67, onset: 960, duration: 960 }, // G4
        // Bar 2: sparse — 2 notes
        { midi: 70, onset: 1920, duration: 480 }, // Bb4
        { midi: 69, onset: 2880, duration: 960 }, // A4 (nat.6)
        // Bar 3: medium — 3 notes (C5 = quarter beat 1; Bb = beat 2; A = beat 2+)
        { midi: 72, onset: 3840, duration: 480 }, // C5  beat 1 (quarter)
        { midi: 70, onset: 4320, duration: 240 }, // Bb4 beat 2 (eighth)
        { midi: 69, onset: 4560, duration: 240 }, // A4  beat 2+ (eighth)
        // Bar 4: dense run → long hold
        { midi: 72, onset: 5760, duration: 120 }, // C5
        { midi: 70, onset: 5880, duration: 120 }, // Bb4
        { midi: 69, onset: 6000, duration: 120 }, // A4
        { midi: 65, onset: 6120, duration: 120 }, // F4
        { midi: 67, onset: 6240, duration: 1440 }, // G4 long resolve
      ],
    },
    {
      stepNumber: 111,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.6: 4-Bar Phrase — Density Arc (In Time)',
      direction:
        'Play the 4-bar density arc in time. Feel how the tension builds to bar 4.',
      assessment: 'pitch_order_timing',
      tag: 'funk:phrase_density_arc_4bar_it | funk',
      styleRef: 'l3a',
      successFeedback:
        'Four bars of controlled intensity — you are shaping the phrase like a story.',
      contentGeneration:
        'GCM v8: FUNK L3 melody phrase → density_arc. Melody_Phrase_Rhythm_Library: genre=funk, phrase_rhythm_bars=2, contour_notes=[4,5], rhythm_tiers=[2,3], zero_point_options=[0,2,4], contour_concat=2→4. Melody_Contour_Library: contour_tiers=[2,3], contour=density_arc. Cluster→resolve rule: long note closes phrase. Chromatic_passing=true. Scale: dorian [0,2,3,5,7,9,10]. Key: C minor. Register: C4-C5. Tempo: 95-108 BPM.',
      targetNotes: [
        { midi: 72, onset: 0, duration: 480 },
        { midi: 67, onset: 960, duration: 960 },
        { midi: 70, onset: 1920, duration: 480 },
        { midi: 69, onset: 2880, duration: 960 },
        { midi: 72, onset: 3840, duration: 480 },
        { midi: 70, onset: 4320, duration: 240 },
        { midi: 69, onset: 4560, duration: 240 },
        { midi: 72, onset: 5760, duration: 120 },
        { midi: 70, onset: 5880, duration: 120 },
        { midi: 69, onset: 6000, duration: 120 },
        { midi: 65, onset: 6120, duration: 120 },
        { midi: 67, onset: 6240, duration: 1440 },
      ],
    },

    // ── A3: Melody Play-Along (2 steps) ──────────────────────────────────
    {
      stepNumber: 113,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A3: Melody Play-Along',
      activity: 'A3.1: Melody over Funk L3 Backing (In Time)',
      direction:
        'Play your melody over a full L3 funk groove. Drums, slap bass, and chords are provided — you bring the melody. Use the Dorian descent (Bb→A→G) as your core phrase.',
      assessment: 'pitch_order_timing',
      tag: 'funk:melody_playalong_l2 | funk',
      styleRef: 'l3a',
      successFeedback:
        'Melody over a Stevie-style groove — you are playing real funk now.',
      contentGeneration:
        "GCM v8: FUNK L3 melody play-along. Generate 4-bar melody: Melody_Phrase_Rhythm_Library (genre=funk, phrase_rhythm_bars=2, contour_notes=[4,5], rhythm_tiers=[2,3], contour_concat=2→4). Melody_Contour_Library: contour_tiers=[2,3], motivic structure A-B-A-B'. Chromatic_passing=true. Scale: dorian [0,2,3,5,7,9,10]. Key: C minor. Register: C4-C5. Backing: drums (groove_funk_02) + bass (Slap Bass 1, bass_c_funk_04 octave pops; bass_r_funk_05) + chords (Cm7 shell_1_b3_b7 [0,3,10], F dom9 funk9 [-2,2,7]; comp_funk_s1). Progression: 1 min7 - 4 dom9 (Cm7→F9). Tempo: 95-108 BPM. Style: l3a.",
      targetNotes: [
        // 4-bar C minor Dorian melody using density arc (same as A2.5/A2.6)
        { midi: 72, onset: 0, duration: 480 }, // C5 bar 1 sparse
        { midi: 67, onset: 960, duration: 960 }, // G4
        { midi: 70, onset: 1920, duration: 480 }, // Bb4 bar 2
        { midi: 69, onset: 2880, duration: 960 }, // A4 (nat.6)
        { midi: 72, onset: 3840, duration: 480 }, // C5 bar 3 medium
        { midi: 70, onset: 4320, duration: 240 }, // Bb4
        { midi: 69, onset: 4560, duration: 240 }, // A4
        { midi: 72, onset: 5760, duration: 120 }, // C5 bar 4 dense run
        { midi: 70, onset: 5880, duration: 120 }, // Bb4
        { midi: 69, onset: 6000, duration: 120 }, // A4
        { midi: 65, onset: 6120, duration: 120 }, // F4
        { midi: 67, onset: 6240, duration: 1440 }, // G4 long resolve
      ],
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
    },
    {
      stepNumber: 114,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A3: Melody Play-Along',
      activity: 'A3.2: Melody Play-Along — New Key (In Time)',
      direction:
        'Same groove, new key. Your Dorian ears need to work in any key. Use the b7→♮6→5 descent as your anchor — it works in every key.',
      assessment: 'pitch_order_timing',
      tag: 'funk:melody_playalong_newkey_l2 | funk',
      styleRef: 'l3a',
      successFeedback:
        'New key, same Dorian feel. The natural 6 is your compass in any key.',
      contentGeneration:
        "GCM v8: FUNK L3 melody play-along — transposed key. key_center: runtime (exclude C minor, key_unlock_order per GCM v8). Generate 4-bar melody: Melody_Phrase_Rhythm_Library (genre=funk, phrase_rhythm_bars=2, contour_notes=[4,5], rhythm_tiers=[2,3], contour_concat=2→4). Melody_Contour_Library: contour_tiers=[2,3], motivic structure A-B-A-B'. Chromatic_passing=true. Scale: dorian [0,2,3,5,7,9,10] in new key. Register: C4-C5. Backing: drums (groove_funk_02) + bass (Slap Bass 1; bass_r_funk_05) + chords (1 min7 - 4 dom9; comp_funk_s1). Tempo: 95-108 BPM. Style: l3a.",
      targetNotes: [
        // 4-bar D minor Dorian melody (key = D, transpose +2)
        { midi: 74, onset: 0, duration: 480 }, // D5 bar 1
        { midi: 69, onset: 960, duration: 960 }, // A4
        { midi: 72, onset: 1920, duration: 480 }, // C5 bar 2 — b7 of D
        { midi: 71, onset: 2880, duration: 960 }, // B4 — ♮6 of D Dorian
        { midi: 74, onset: 3840, duration: 480 }, // D5 bar 3
        { midi: 72, onset: 4320, duration: 240 }, // C5 — b7
        { midi: 71, onset: 4560, duration: 240 }, // B4 — ♮6
        { midi: 74, onset: 5760, duration: 120 }, // D5 bar 4 run
        { midi: 72, onset: 5880, duration: 120 }, // C5
        { midi: 71, onset: 6000, duration: 120 }, // B4
        { midi: 67, onset: 6120, duration: 120 }, // G4
        { midi: 69, onset: 6240, duration: 1440 }, // A4 long resolve
      ],
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// L2 Section B — Chords (18 steps, steps 61-78)
// ---------------------------------------------------------------------------

const funkL2SectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    // ── B1: Arpeggiate (6 steps) ─────────────────────────────────────────
    {
      stepNumber: 113,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B1: Arpeggiate Chords',
      activity: 'B1.1: Cm9 Arpeggio (1-b3-5-b7-9) (Out of Time)',
      direction:
        'Play the notes of a Cm9 chord one at a time going up: C-Eb-G-Bb-D.',
      assessment: 'pitch_only',
      tag: 'funk:arpeggiate_cm9_oot | funk',
      styleRef: 'l3a',
      successFeedback:
        'Cm9 — five notes, rich and warm. The 9th (D) opens the chord up.',
      contentGeneration:
        'GCM v8: chord_types min9 [0,3,7,10,14]. Chord_Quality_Library: quality=min9, root=C. Contour: ascending root position (1-b3-5-b7-9). Register: C3-C5.',
      targetNotes: [
        { midi: 48, onset: 0, duration: 460 }, // C3  — 1
        { midi: 51, onset: 480, duration: 460 }, // Eb3 — b3
        { midi: 55, onset: 960, duration: 460 }, // G3  — 5
        { midi: 58, onset: 1440, duration: 460 }, // Bb3 — b7
        { midi: 62, onset: 1920, duration: 920 }, // D4  — 9 (long)
      ],
    },
    {
      stepNumber: 114,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B1: Arpeggiate Chords',
      activity: 'B1.2: Cm9 Arpeggio (In Time)',
      direction: 'In a steady tempo, arpeggiate Cm9.',
      assessment: 'pitch_order_timing',
      tag: 'funk:arpeggiate_cm9_it | funk',
      styleRef: 'l3a',
      successFeedback: 'Cm9 in time — smooth five-note arc.',
      contentGeneration:
        'GCM v8: chord_types min9 [0,3,7,10,14]. Chord_Quality_Library: quality=min9, root=C. Contour: ascending root position (1-b3-5-b7-9). Register: C3-C5. Tempo: 95-108 BPM quarter-note pulse.',
      targetNotes: [
        { midi: 48, onset: 0, duration: 460 },
        { midi: 51, onset: 480, duration: 460 },
        { midi: 55, onset: 960, duration: 460 },
        { midi: 58, onset: 1440, duration: 460 },
        { midi: 62, onset: 1920, duration: 920 },
      ],
    },
    {
      stepNumber: 115,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B1: Arpeggiate Chords',
      activity: 'B1.3: F Dom13 Arpeggio — Key Notes (Out of Time)',
      direction:
        'Play the key chord tones of F dom13: F-A-C-Eb-D. Root, 3rd, 5th, b7th, 13th.',
      assessment: 'pitch_only',
      tag: 'funk:arpeggiate_fdom13_oot | funk',
      styleRef: 'l3a',
      successFeedback:
        'F dom13 — the 13th (D) is the color that makes this chord sing.',
      contentGeneration:
        'GCM v8: chord_types dom13. Chord_Quality_Library: quality=dom13, root=F. Key tones: 1-3-5-b7-13 (F-A-C-Eb-D). Register: C3-C5.',
      targetNotes: [
        { midi: 53, onset: 0, duration: 460 }, // F3  — 1
        { midi: 57, onset: 480, duration: 460 }, // A3  — 3
        { midi: 60, onset: 960, duration: 460 }, // C4  — 5
        { midi: 63, onset: 1440, duration: 460 }, // Eb4 — b7
        { midi: 74, onset: 1920, duration: 920 }, // D5  — 13 (long)
      ],
    },
    {
      stepNumber: 116,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B1: Arpeggiate Chords',
      activity: 'B1.4: F Dom13 Arpeggio (In Time)',
      direction: 'In a steady tempo, arpeggiate F dom13: F-A-C-Eb-D.',
      assessment: 'pitch_order_timing',
      tag: 'funk:arpeggiate_fdom13_it | funk',
      styleRef: 'l3a',
      successFeedback: 'F dom13 in time — dominant color flowing.',
      contentGeneration:
        'GCM v8: chord_types dom13. Chord_Quality_Library: quality=dom13, root=F. Key tones: 1-3-5-b7-13. Register: C3-C5. Tempo: 95-108 BPM.',
      targetNotes: [
        { midi: 53, onset: 0, duration: 460 },
        { midi: 57, onset: 480, duration: 460 },
        { midi: 60, onset: 960, duration: 460 },
        { midi: 63, onset: 1440, duration: 460 },
        { midi: 74, onset: 1920, duration: 920 },
      ],
    },
    {
      stepNumber: 117,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B1: Arpeggiate Chords',
      activity: 'B1.5: Cm9→F13 Arpeggio Sequence (Out of Time)',
      direction:
        'Arpeggiate Cm9 then F13 back to back. Hear how the chords connect.',
      assessment: 'pitch_only',
      tag: 'funk:arpeggiate_cm9_f13_sequence_oot | funk',
      styleRef: 'l3a',
      successFeedback:
        'Two chords arpeggiated — you can hear the Sizzle voice leading in the chord tones.',
      targetNotes: [
        { midi: 60, onset: 0, duration: 460 },
        { midi: 63, onset: 480, duration: 460 },
        { midi: 67, onset: 960, duration: 460 },
        { midi: 70, onset: 1440, duration: 460 },
        { midi: 65, onset: 1920, duration: 460 },
        { midi: 69, onset: 2400, duration: 460 },
        { midi: 72, onset: 2880, duration: 460 },
        { midi: 75, onset: 3360, duration: 460 },
      ],
    },
    {
      stepNumber: 118,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B1: Arpeggiate Chords',
      activity: 'B1.6: Cm9→F13 Arpeggio Sequence (In Time)',
      direction: 'Arpeggiate the Cm9→F13 sequence in time.',
      assessment: 'pitch_order_timing',
      tag: 'funk:arpeggiate_cm9_f13_sequence_it | funk',
      styleRef: 'l3a',
      successFeedback: 'Cm9→F13 arpeggio sequence in the pocket.',
      contentGeneration:
        'GCM v8: FUNK L3 arpeggio sequence. Cm9→F dom13. Progression: 1 min9 - 4 dom13 (Cm9→F13). Register: C3-C5. Tempo: 95-108 BPM, one chord per bar.',
    },
    {
      stepNumber: 119,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B1: Arpeggiate Chords',
      activity:
        'B1.7: Drop the Sizzle Exercise — Bb→A Voice Leading (Out of Time)',
      direction:
        'Play Cm9 then F13 and listen for ONE note: the Bb (7th of Cm9) drops a half step to A (3rd of F13). That is Drop the Sizzle.',
      assessment: 'pitch_only',
      tag: 'funk:sizzle_exercise_oot | funk',
      styleRef: 'l3a',
      successFeedback:
        'Drop the Sizzle — Bb→A. The smallest move with the biggest harmonic impact.',
      contentGeneration:
        'GCM v8: FUNK L3 Sizzle rule exercise. Cm9: 7-3-5 voicing Bb-Eb-G. F dom13: 3-7-9 voicing A-Eb-G. Sizzle: Bb→A half-step drop, Eb+G common tones held. Progression: 1 min7 - 4 dom9 (Cm9→F13). Register: C3-C5.',
      targetNotes: [
        // Cm9: Eb3-G3-Bb3
        { midi: 51, onset: 0, duration: 920 }, // Eb3 — b3 (common tone)
        { midi: 55, onset: 0, duration: 920 }, // G3  — 5  (common tone)
        { midi: 58, onset: 0, duration: 920 }, // Bb3 — b7 (→ drops to A)
        // F dom13: Eb3-G3-A3 — Sizzle: Bb→A
        { midi: 51, onset: 960, duration: 920 }, // Eb3 — b7 of F (held)
        { midi: 55, onset: 960, duration: 920 }, // G3  — 9  of F (held)
        { midi: 57, onset: 960, duration: 920 }, // A3  — 3  of F (Sizzle landing)
      ],
    },

    // ── B2: Voicings (8 steps) ───────────────────────────────────────────
    {
      stepNumber: 120,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.1: Cm9 b3-b7-9 Voicing (Out of Time)',
      direction:
        'Play Cm9 with b3-b7-9: Eb3-Bb3-D4. No root — three notes of minor color.',
      assessment: 'pitch_only',
      tag: 'funk:cm9_rootless_oot | funk',
      styleRef: 'l3a',
      successFeedback:
        'Cm9 b3-b7-9 — Eb, Bb, D. The minor 9th sound in three notes.',
      contentGeneration:
        'GCM v8: min9 [0,3,7,10,14]. Genre_Voicing_Taxonomy: quality=min9, voicing=rootless_b3_b7_9. RH: Eb3(51)-Bb3(58)-D4(62). LH=root_bass. Register: C3-C5.',
      targetNotes: [
        { midi: 51, onset: 0, duration: 1920 }, // Eb3 — b3
        { midi: 58, onset: 0, duration: 1920 }, // Bb3 — b7
        { midi: 62, onset: 0, duration: 1920 }, // D4  — 9
      ],
    },
    {
      stepNumber: 121,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.2: Cm9 b3-b7-9 Voicing (In Time)',
      direction: 'Play the Cm9 b3-b7-9 voicing in time — stab it.',
      assessment: 'pitch_order_timing',
      tag: 'funk:cm9_rootless_it | funk',
      styleRef: 'l3a',
      successFeedback: 'Cm9 b3-b7-9 in the pocket.',
      contentGeneration:
        'GCM v8: min9 [0,3,7,10,14]. Genre_Voicing_Taxonomy: quality=min9, voicing=rootless_b3_b7_9. RH: Eb3(51)-Bb3(58)-D4(62). LH=root_bass. Register: C3-C5. Tempo: 95-108 BPM.',
      targetNotes: [
        { midi: 51, onset: 0, duration: 1920 },
        { midi: 58, onset: 0, duration: 1920 },
        { midi: 62, onset: 0, duration: 1920 },
      ],
    },
    // F dom13 rootless [-2,4,9] relative to F root (Eb-A-D)
    // Voice leading from Cm9 [3,10,14]: Eb stays, Bb→A (-1), D stays
    // Total movement: 1 semitone ✅
    // NOTE: Genre_Voicing_Taxonomy_v2 — F dom13 rootless: rh_override=[-2,4,9] relative to root
    {
      stepNumber: 122,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.3: F Dom13 7-3-13 Voicing (Out of Time)',
      direction:
        'Play F dom13 with b7-3-13: Eb3-A3-D4. Sizzle landing — the Bb became A (3rd of F dom13).',
      assessment: 'pitch_only',
      tag: 'funk:fdom13_rootless_oot | funk',
      styleRef: 'l3a',
      successFeedback:
        'F dom13 7-3-13 — Eb, A, D. Dominant color with the Sizzle.',
      contentGeneration:
        'GCM v8: dom13. Genre_Voicing_Taxonomy: quality=dom13, voicing=rootless_b7_3_13. RH: Eb3(51)-A3(57)-D4(62). Sizzle result: A is the 3rd that Bb dropped to. LH=root_bass. Register: C3-C5.',
      targetNotes: [
        { midi: 51, onset: 0, duration: 1920 }, // Eb3 — b7
        { midi: 57, onset: 0, duration: 1920 }, // A3  — 3
        { midi: 62, onset: 0, duration: 1920 }, // D4  — 13
      ],
    },
    {
      stepNumber: 123,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.4: F Dom13 7-3-13 Voicing (In Time)',
      direction: 'Play the F dom13 7-3-13 voicing in time — stab it.',
      assessment: 'pitch_order_timing',
      tag: 'funk:fdom13_rootless_it | funk',
      styleRef: 'l3a',
      successFeedback:
        'F dom13 7-3-13 in time — dominant funk color on demand.',
      contentGeneration:
        'GCM v8: dom13. Genre_Voicing_Taxonomy: quality=dom13, voicing=rootless_b7_3_13. RH: Eb3(51)-A3(57)-D4(62). LH=root_bass. Register: C3-C5. Tempo: 95-108 BPM.',
      targetNotes: [
        { midi: 51, onset: 0, duration: 1920 },
        { midi: 57, onset: 0, duration: 1920 },
        { midi: 62, onset: 0, duration: 1920 },
      ],
    },
    {
      stepNumber: 124,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.5: Funk9 Voicing (b7-9-5) (Out of Time)',
      direction:
        'Play the signature funk voicing on C: Bb-D-G. Omit root and 3rd — open, ambiguous, funky.',
      assessment: 'pitch_only',
      tag: 'funk:funk9_voicing_oot | funk',
      styleRef: 'l3a',
      successFeedback:
        'The funk9 voicing — this is the sound of funk keyboards.',
      contentGeneration:
        'GCM v8: funk9 voicing [-2,2,7] (b7-9-5, omit 3). Genre_Voicing_Taxonomy: quality=dom9, voicing=funk9. RH: rh_override=[-2,2,7]. Root=C. LH=root_bass. Register: C3-C5.',
      chordSymbols: ['Cdom9'],
      targetNotes: [
        { midi: 58, onset: 0, duration: 1800 }, // Bb3 (b7)
        { midi: 62, onset: 0, duration: 1800 }, // D4  (9)
        { midi: 67, onset: 0, duration: 1800 }, // G4  (5)
        { midi: 58, onset: 1920, duration: 1800 }, // Bb3 bar 2
        { midi: 62, onset: 1920, duration: 1800 }, // D4  bar 2
        { midi: 67, onset: 1920, duration: 1800 }, // G4  bar 2
      ],
    },
    {
      stepNumber: 125,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.6: Funk9 Voicing (In Time)',
      direction:
        'Play the funk9 voicing in time — stab it. Rhythm: beat 1, a-of-1, beat 3, e-of-3 (onsets: 0, 360, 960, 1320).',
      assessment: 'pitch_order_timing',
      tag: 'funk:funk9_voicing_it | funk',
      styleRef: 'l3a',
      successFeedback: 'Dom9 funk stab in the pocket with the new rhythm.',
      contentGeneration:
        'GCM v8: funk9 voicing [-2,2,7]. Genre_Voicing_Taxonomy: quality=dom9, voicing=funk9. RH: rh_override=[-2,2,7]. Root=C. LH=root_bass. Register: C3-C5. Tempo: 95-108 BPM.',
      chordSymbols: ['Cdom9'],
      targetNotes: [
        // bar 1 — rhythm: [0, 360, 960, 1320]
        { midi: 58, onset: 0, duration: 120 },
        { midi: 62, onset: 0, duration: 120 },
        { midi: 67, onset: 0, duration: 120 },
        { midi: 58, onset: 360, duration: 120 },
        { midi: 62, onset: 360, duration: 120 },
        { midi: 67, onset: 360, duration: 120 },
        { midi: 58, onset: 960, duration: 120 },
        { midi: 62, onset: 960, duration: 120 },
        { midi: 67, onset: 960, duration: 120 },
        { midi: 58, onset: 1320, duration: 120 }, // e-of-3 (shifted from 1200)
        { midi: 62, onset: 1320, duration: 120 },
        { midi: 67, onset: 1320, duration: 120 },
        // bar 2 — same rhythm
        { midi: 58, onset: 1920, duration: 120 },
        { midi: 62, onset: 1920, duration: 120 },
        { midi: 67, onset: 1920, duration: 120 },
        { midi: 58, onset: 2280, duration: 120 },
        { midi: 62, onset: 2280, duration: 120 },
        { midi: 67, onset: 2280, duration: 120 },
        { midi: 58, onset: 2880, duration: 120 },
        { midi: 62, onset: 2880, duration: 120 },
        { midi: 67, onset: 2880, duration: 120 },
        { midi: 58, onset: 3240, duration: 120 },
        { midi: 62, onset: 3240, duration: 120 },
        { midi: 67, onset: 3240, duration: 120 },
      ],
    },
    {
      stepNumber: 126,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.7: Funk9 Chromatic Approach Stab (Out of Time)',
      direction:
        'Play the C funk9 voicing one half step below (A3-Db4-F#4), then land on the real C funk9 (Bb3-D4-G4). Every voice slides up one semitone.',
      assessment: 'pitch_only',
      tag: 'funk:chords_chromatic_approach_oot | funk',
      styleRef: 'l3a',
      successFeedback:
        'Funk9 chromatic approach — three voices sliding into the groove.',
      contentGeneration:
        'GCM v8: FUNK L3 Funk9 chromatic approach. Approach: C funk9 -1 semitone [57,61,66] (A3-Db4-F#4) → target [58,62,67] (Bb3-D4-G4). Stab note duration: 120t each (hard rule). Register: C3-C5.',
      targetNotes: [
        // Approach chord (-1 semitone): A3-Db4-F#4
        { midi: 57, onset: 0, duration: 120 }, // A3
        { midi: 61, onset: 0, duration: 120 }, // Db4
        { midi: 66, onset: 0, duration: 120 }, // F#4
        // Target — C funk9: Bb3-D4-G4
        { midi: 58, onset: 240, duration: 460 }, // Bb3
        { midi: 62, onset: 240, duration: 460 }, // D4
        { midi: 67, onset: 240, duration: 460 }, // G4
      ],
    },
    {
      stepNumber: 127,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.8: Funk9 Chromatic Approach Stab (In Time)',
      direction:
        'Play the funk9 approach-resolve in time. Approach on the preceding 16th (A3-Db4-F#4), land on Bb3-D4-G4.',
      assessment: 'pitch_order_timing',
      tag: 'funk:chords_chromatic_approach_it | funk',
      styleRef: 'l3a',
      successFeedback:
        'Funk9 chromatic approach in time — the L3 comping secret weapon.',
      contentGeneration:
        'GCM v8: FUNK L3 Funk9 chromatic approach IT. Approach [57,61,66] → target [58,62,67]. Tempo: 95-108 BPM.',
      targetNotes: [
        { midi: 57, onset: 0, duration: 120 },
        { midi: 61, onset: 0, duration: 120 },
        { midi: 66, onset: 0, duration: 120 },
        { midi: 58, onset: 240, duration: 460 },
        { midi: 62, onset: 240, duration: 460 },
        { midi: 67, onset: 240, duration: 460 },
      ],
    },

    // ── B3: Progressions (3 steps) ───────────────────────────────────────
    {
      stepNumber: 127,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B3: Funk Progressions',
      activity: 'B3.1: Cm9-F13 Vamp (Out of Time)',
      direction:
        'Comp the Cm9-F13 vamp. Watch how only one note changes between the chords — ' +
        "Bb drops to A. That's Drop the Sizzle keeping the voice leading smooth.",
      assessment: 'pitch_only',
      tag: 'funk:chords_vamp_cm9_f13_oot | funk',
      styleRef: 'l3a',
      successFeedback: 'Cm9 to F13 with one voice moving — silky smooth.',
      contentGeneration:
        'GCM v8: FUNK L3 progressions: 1 min9 - 4 dom13. HKB v2: Cm9→F13. Voice leading: Cm9 [3,10,14] → F13 [-2,4,9]. Eb common tone (stays), Bb→A (-1 semitone = Sizzle), D common tone (stays). Total movement: 1 semitone. Register: C3-C5.',
      chordSymbols: ['Cm9', 'F13'],
      targetNotes: [
        // Bar 1 — Cm9: Eb3+G3+Bb3+D4
        { midi: 51, onset: 0, duration: 120 },
        { midi: 55, onset: 0, duration: 120 },
        { midi: 58, onset: 0, duration: 120 },
        { midi: 62, onset: 0, duration: 120 },
        { midi: 51, onset: 360, duration: 120 },
        { midi: 55, onset: 360, duration: 120 },
        { midi: 58, onset: 360, duration: 120 },
        { midi: 62, onset: 360, duration: 120 },
        { midi: 51, onset: 960, duration: 120 },
        { midi: 55, onset: 960, duration: 120 },
        { midi: 58, onset: 960, duration: 120 },
        { midi: 62, onset: 960, duration: 120 },
        { midi: 51, onset: 1200, duration: 120 },
        { midi: 55, onset: 1200, duration: 120 },
        { midi: 58, onset: 1200, duration: 120 },
        { midi: 62, onset: 1200, duration: 120 },
        // Bar 2 — F13: Eb3+G3+A3+D4 (only Bb→A changed)
        { midi: 51, onset: 1920, duration: 120 },
        { midi: 55, onset: 1920, duration: 120 },
        { midi: 57, onset: 1920, duration: 120 },
        { midi: 62, onset: 1920, duration: 120 },
        { midi: 51, onset: 2280, duration: 120 },
        { midi: 55, onset: 2280, duration: 120 },
        { midi: 57, onset: 2280, duration: 120 },
        { midi: 62, onset: 2280, duration: 120 },
        { midi: 51, onset: 2880, duration: 120 },
        { midi: 55, onset: 2880, duration: 120 },
        { midi: 57, onset: 2880, duration: 120 },
        { midi: 62, onset: 2880, duration: 120 },
        { midi: 51, onset: 3120, duration: 120 },
        { midi: 55, onset: 3120, duration: 120 },
        { midi: 57, onset: 3120, duration: 120 },
        { midi: 62, onset: 3120, duration: 120 },
      ],
    },
    {
      stepNumber: 128,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B3: Funk Progressions',
      activity: 'B3.2: Cm9-F13 Vamp (In Time)',
      assessment: 'pitch_order_timing',
      tag: 'funk:chords_vamp_cm9_f13_it | funk',
      styleRef: 'l3a',
      successFeedback:
        'Locking the vamp in time — this is the foundation of Funk keyboard comping.',
      contentGeneration:
        'GCM v8: FUNK L3 progressions: 1 min9 - 4 dom13. HKB v2: Cm9→F13. Voice leading: Cm9 [3,10,14] → F13 [-2,4,9]. Eb stays, Bb→A Sizzle drop, D stays. Total movement: 1 semitone. Register: C3-C5. Tempo: 95-108 BPM, one chord per bar.',
      chordSymbols: ['Cm9', 'F13'],
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        // same as B3.1
        { midi: 51, onset: 0, duration: 120 },
        { midi: 55, onset: 0, duration: 120 },
        { midi: 58, onset: 0, duration: 120 },
        { midi: 62, onset: 0, duration: 120 },
        { midi: 51, onset: 360, duration: 120 },
        { midi: 55, onset: 360, duration: 120 },
        { midi: 58, onset: 360, duration: 120 },
        { midi: 62, onset: 360, duration: 120 },
        { midi: 51, onset: 960, duration: 120 },
        { midi: 55, onset: 960, duration: 120 },
        { midi: 58, onset: 960, duration: 120 },
        { midi: 62, onset: 960, duration: 120 },
        { midi: 51, onset: 1200, duration: 120 },
        { midi: 55, onset: 1200, duration: 120 },
        { midi: 58, onset: 1200, duration: 120 },
        { midi: 62, onset: 1200, duration: 120 },
        { midi: 51, onset: 1920, duration: 120 },
        { midi: 55, onset: 1920, duration: 120 },
        { midi: 57, onset: 1920, duration: 120 },
        { midi: 62, onset: 1920, duration: 120 },
        { midi: 51, onset: 2280, duration: 120 },
        { midi: 55, onset: 2280, duration: 120 },
        { midi: 57, onset: 2280, duration: 120 },
        { midi: 62, onset: 2280, duration: 120 },
        { midi: 51, onset: 2880, duration: 120 },
        { midi: 55, onset: 2880, duration: 120 },
        { midi: 57, onset: 2880, duration: 120 },
        { midi: 62, onset: 2880, duration: 120 },
        { midi: 51, onset: 3120, duration: 120 },
        { midi: 55, onset: 3120, duration: 120 },
        { midi: 57, onset: 3120, duration: 120 },
        { midi: 62, onset: 3120, duration: 120 },
      ],
    },
    {
      stepNumber: 129,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B3: Funk Progressions',
      activity: 'B3.3: A♭13-G7alt-Cm9-F13 Full Progression (In Time)',
      direction:
        'Four chords, four bars. Ab13 — G7alt — Cm9 — F13. ' +
        'Each chord was chosen by voice leading proximity to the next. ' +
        'Feel how every voice moves by a half step or whole step.',
      assessment: 'pitch_order_timing',
      tag: 'funk:chords_progression_l2_full_it | funk',
      styleRef: 'l3a',
      successFeedback:
        'Ab13 to G7alt to Cm9 to F13 — that is sophisticated Funk harmony.',
      contentGeneration:
        'GCM v8: FUNK L3 full progression. HKB v2: Ab13→G7alt→Cm9→F13. Ab13: rootless voicing. G7alt: rootless voicing. Cm9: rootless_b3_b7_9 [3,10,14] (Eb-Bb-D). F13: rootless_b7_3_13 [-2,4,9] (Eb-A-D). Voice leading: chromatic descent through the top voices. Register: C3-C5. Tempo: 95-108 BPM, one chord per bar.',
      chordSymbols: ['A♭13', 'G7', 'Cm9', 'F13'],
      targetNotes: [
        // Bar 1 — Ab13: Gb3+Bb3+C4+F4  [b7-9-3-13]
        { midi: 54, onset: 0, duration: 120 }, // Gb3
        { midi: 58, onset: 0, duration: 120 }, // Bb3
        { midi: 60, onset: 0, duration: 120 }, // C4
        { midi: 65, onset: 0, duration: 120 }, // F4
        { midi: 54, onset: 360, duration: 120 },
        { midi: 58, onset: 360, duration: 120 },
        { midi: 60, onset: 360, duration: 120 },
        { midi: 65, onset: 360, duration: 120 },
        { midi: 54, onset: 960, duration: 120 },
        { midi: 58, onset: 960, duration: 120 },
        { midi: 60, onset: 960, duration: 120 },
        { midi: 65, onset: 960, duration: 120 },
        { midi: 54, onset: 1200, duration: 120 },
        { midi: 58, onset: 1200, duration: 120 },
        { midi: 60, onset: 1200, duration: 120 },
        { midi: 65, onset: 1200, duration: 120 },
        // Bar 2 — G7alt: F3+Ab3+B3+Eb4  [b7-b9-3-#5]
        { midi: 53, onset: 1920, duration: 120 }, // F3
        { midi: 56, onset: 1920, duration: 120 }, // Ab3
        { midi: 59, onset: 1920, duration: 120 }, // B3
        { midi: 63, onset: 1920, duration: 120 }, // Eb4
        { midi: 53, onset: 2280, duration: 120 },
        { midi: 56, onset: 2280, duration: 120 },
        { midi: 59, onset: 2280, duration: 120 },
        { midi: 63, onset: 2280, duration: 120 },
        { midi: 53, onset: 2880, duration: 120 },
        { midi: 56, onset: 2880, duration: 120 },
        { midi: 59, onset: 2880, duration: 120 },
        { midi: 63, onset: 2880, duration: 120 },
        { midi: 53, onset: 3120, duration: 120 },
        { midi: 56, onset: 3120, duration: 120 },
        { midi: 59, onset: 3120, duration: 120 },
        { midi: 63, onset: 3120, duration: 120 },
        // Bar 3 — Cm9: Eb3+G3+Bb3+D4  [b3-5-b7-9]
        { midi: 51, onset: 3840, duration: 120 }, // Eb3
        { midi: 55, onset: 3840, duration: 120 }, // G3
        { midi: 58, onset: 3840, duration: 120 }, // Bb3
        { midi: 62, onset: 3840, duration: 120 }, // D4
        { midi: 51, onset: 4200, duration: 120 },
        { midi: 55, onset: 4200, duration: 120 },
        { midi: 58, onset: 4200, duration: 120 },
        { midi: 62, onset: 4200, duration: 120 },
        { midi: 51, onset: 4800, duration: 120 },
        { midi: 55, onset: 4800, duration: 120 },
        { midi: 58, onset: 4800, duration: 120 },
        { midi: 62, onset: 4800, duration: 120 },
        { midi: 51, onset: 5040, duration: 120 },
        { midi: 55, onset: 5040, duration: 120 },
        { midi: 58, onset: 5040, duration: 120 },
        { midi: 62, onset: 5040, duration: 120 },
        // Bar 4 — F13: Eb3+G3+A3+D4  [b7-9-3-13]
        { midi: 51, onset: 5760, duration: 120 }, // Eb3
        { midi: 55, onset: 5760, duration: 120 }, // G3
        { midi: 57, onset: 5760, duration: 120 }, // A3
        { midi: 62, onset: 5760, duration: 120 }, // D4
        { midi: 51, onset: 6120, duration: 120 },
        { midi: 55, onset: 6120, duration: 120 },
        { midi: 57, onset: 6120, duration: 120 },
        { midi: 62, onset: 6120, duration: 120 },
        { midi: 51, onset: 6720, duration: 120 },
        { midi: 55, onset: 6720, duration: 120 },
        { midi: 57, onset: 6720, duration: 120 },
        { midi: 62, onset: 6720, duration: 120 },
        { midi: 51, onset: 6960, duration: 120 },
        { midi: 55, onset: 6960, duration: 120 },
        { midi: 57, onset: 6960, duration: 120 },
        { midi: 62, onset: 6960, duration: 120 },
      ],
    },

    // ── B4: Chord Play-Along (1 step) ────────────────────────────────────
    {
      stepNumber: 130,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B4: Chord Play-Along',
      activity: 'B4.1: Chord Comping — Cm9→F13 Vamp (In Time)',
      direction:
        'Comp the Cm9→F13 vamp over the full L3 groove. Use Funk9 chromatic approach before each chord. Drums and slap bass are provided — you bring the chords.',
      assessment: 'pitch_order_timing',
      tag: 'funk:chords_playalong_l2 | funk',
      styleRef: 'l3a',
      successFeedback:
        'Comping with Funk9 chromatic approaches over a live groove — L3 funk keyboard.',
      chordSymbols: ['Cm9', 'F13'],
      contentGeneration:
        'GCM v8: FUNK L3 chord play-along. Progression: 1 min9 - 4 dom13 (Cm9→F13). Voice leading from Cm9 b3-b7-9 [51,58,62]: Eb stays, Bb→A Sizzle drop, D stays. F13 7-3-13 [51,57,62]. Chromatic approach stabs (-1 semitone on preceding 16th). Stab note duration: 120t (hard rule). Backing: drums (groove_funk_02) + bass (Slap Bass 1). Tempo: 95-108 BPM. Style: l3a.',
      targetNotes: [
        // Bar 1 — Cm9 b3-b7-9: Eb3-Bb3-D4 at Stab 1 rhythm
        { midi: 51, onset: 0, duration: 120 },
        { midi: 58, onset: 0, duration: 120 },
        { midi: 62, onset: 0, duration: 120 },
        { midi: 51, onset: 360, duration: 120 },
        { midi: 58, onset: 360, duration: 120 },
        { midi: 62, onset: 360, duration: 120 },
        { midi: 51, onset: 960, duration: 120 },
        { midi: 58, onset: 960, duration: 120 },
        { midi: 62, onset: 960, duration: 120 },
        { midi: 51, onset: 1320, duration: 120 },
        { midi: 58, onset: 1320, duration: 120 },
        { midi: 62, onset: 1320, duration: 120 },
        // Bar 2 — F13 7-3-13: Eb3-A3-D4 at Stab 1 rhythm
        { midi: 51, onset: 1920, duration: 120 },
        { midi: 57, onset: 1920, duration: 120 },
        { midi: 62, onset: 1920, duration: 120 },
        { midi: 51, onset: 2280, duration: 120 },
        { midi: 57, onset: 2280, duration: 120 },
        { midi: 62, onset: 2280, duration: 120 },
        { midi: 51, onset: 2880, duration: 120 },
        { midi: 57, onset: 2880, duration: 120 },
        { midi: 62, onset: 2880, duration: 120 },
        { midi: 51, onset: 3240, duration: 120 },
        { midi: 57, onset: 3240, duration: 120 },
        { midi: 62, onset: 3240, duration: 120 },
      ],
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// L2 Section C — Bass (11 steps, steps 79-89)
// L2 introduces octave 2 bass (octave pop technique). C2=36, G2=43.
// ---------------------------------------------------------------------------

const funkL2SectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    // ── C1: Bass Scale (4 steps) ─────────────────────────────────────────
    {
      stepNumber: 131,
      module: 'funk_l3',
      section: 'C',
      subsection: 'C1: Bass Scale (C Minor Dorian)',
      activity: 'C1.1: C Minor Dorian Bass Pattern (Out of Time)',
      scaleId: 'dorian',
      direction:
        'Play the C Dorian scale in the bass register (octave 2). C2-D2-Eb2-F2-G2-A2-Bb2-C3. Play quarter notes — one note per beat.',
      assessment: 'pitch_only',
      tag: 'funk:bass_dorian_oot | funk',
      styleRef: 'l3a',
      successFeedback:
        'C Dorian in the bass — the natural 6 (A) is your Dorian fingerprint down here too.',
      contentGeneration:
        'GCM v8: FUNK L3 bass scale=dorian [0,2,3,5,7,9,10]. Key: C minor. Contour: ascending stepwise. Register: octave 2 (C2=36 to C3=48). Quarter notes.',
      targetNotes: [
        { midi: 36, onset: 0, duration: 480 }, // C2
        { midi: 38, onset: 480, duration: 480 }, // D2
        { midi: 39, onset: 960, duration: 480 }, // Eb2
        { midi: 41, onset: 1440, duration: 480 }, // F2
        { midi: 43, onset: 1920, duration: 480 }, // G2
        { midi: 45, onset: 2400, duration: 480 }, // A2
        { midi: 46, onset: 2880, duration: 480 }, // Bb2
        { midi: 48, onset: 3360, duration: 480 }, // C3
      ],
    },
    {
      stepNumber: 132,
      module: 'funk_l3',
      section: 'C',
      subsection: 'C1: Bass Scale (C Minor Dorian)',
      activity: 'C1.2: C Minor Dorian Bass Pattern (In Time)',
      scaleId: 'dorian',
      direction:
        'In a steady tempo, play the C Dorian bass scale. Quarter notes — one per beat.',
      assessment: 'pitch_order_timing',
      tag: 'funk:bass_dorian_it | funk',
      styleRef: 'l3a',
      successFeedback: 'Dorian bass in time — grounded and confident.',
      contentGeneration:
        'GCM v8: FUNK L3 bass scale=dorian [0,2,3,5,7,9,10]. Key: C minor. Contour: ascending stepwise. Register: octave 2 (C2=36 to C3=48). Quarter notes. Tempo: 95-108 BPM.',
      targetNotes: [
        { midi: 36, onset: 0, duration: 480 },
        { midi: 38, onset: 480, duration: 480 },
        { midi: 39, onset: 960, duration: 480 },
        { midi: 41, onset: 1440, duration: 480 },
        { midi: 43, onset: 1920, duration: 480 },
        { midi: 45, onset: 2400, duration: 480 },
        { midi: 46, onset: 2880, duration: 480 },
        { midi: 48, onset: 3360, duration: 480 },
      ],
    },
    {
      stepNumber: 133,
      module: 'funk_l3',
      section: 'C',
      subsection: 'C1: Bass Scale (C Minor Dorian)',
      activity: 'C1.3: Octave Pop (Out of Time)',
      direction:
        'Play root C2, then pop the octave C3. Low C, high C — the octave pop bounce.',
      assessment: 'pitch_only',
      tag: 'funk:bass_octave_pop_oot | funk',
      styleRef: 'l3a',
      successFeedback:
        'The octave pop from the deep register — that bounce locks in the groove.',
      contentGeneration:
        'GCM v8: FUNK L3 bass contours=bass_c_funk_04 (octave pop). Root=C2(36), pop=C3(48). Bass_Rhythm_Patterns: bass_r_funk_05 (beat1 root, and-of-2 octave pop). Register: octave 2-3.',
      targetNotes: [
        { midi: 36, onset: 0, duration: 460 }, // C2 — root
        { midi: 48, onset: 480, duration: 120 }, // C3 — octave pop
        { midi: 36, onset: 960, duration: 460 }, // C2 — root
        { midi: 48, onset: 1440, duration: 120 }, // C3 — octave pop
      ],
    },
    {
      stepNumber: 134,
      module: 'funk_l3',
      section: 'C',
      subsection: 'C1: Bass Scale (C Minor Dorian)',
      activity: 'C1.4: Octave 2 Root + Octave 3 Pop (In Time)',
      direction:
        'In time, play the octave pop pattern. Root on beat 1, pop on the and of 2.',
      assessment: 'pitch_order_timing',
      tag: 'funk:bass_octave_pop_it | funk',
      styleRef: 'l3a',
      successFeedback:
        'Octave pop in time — that bounce is the L3 bass signature.',
      contentGeneration:
        'GCM v8: FUNK L3 bass contours=bass_c_funk_04 (octave pop). Root=C2(36), pop=C3(48). Bass_Rhythm_Patterns: bass_r_funk_05. Register: octave 2-3. Tempo: 95-108 BPM.',
      targetNotes: [
        { midi: 36, onset: 0, duration: 460 },
        { midi: 48, onset: 480, duration: 120 },
        { midi: 36, onset: 960, duration: 460 },
        { midi: 48, onset: 1440, duration: 120 },
      ],
    },

    // ── C2: Bass Techniques (5 steps) ────────────────────────────────────
    {
      stepNumber: 135,
      module: 'funk_l3',
      section: 'C',
      subsection: 'C2: Funk Bass Techniques',
      activity: 'C2.1: Chromatic Approach Pattern — C-E-F-B-C (Out of Time)',
      direction:
        'Play this chromatic bass pattern: C2-E2-F2-B1-C2. Use E2 and B1 as approach tones leading to F2 and C2 respectively.',
      assessment: 'pitch_only',
      tag: 'funk:bass_chromatic_below_oot | funk',
      styleRef: 'l3a',
      successFeedback:
        'Chromatic approach from below — the approach tones create tension before resolution.',
      contentGeneration:
        'GCM v8: FUNK L3 bass chromatic approach pattern. Notes: C2(36)-E2(40)-F2(41)-B1(35)-C2(36). Register: octave 1-2.',
      targetNotes: [
        { midi: 36, onset: 0, duration: 480 }, // C2 — root
        { midi: 40, onset: 480, duration: 480 }, // E2 — approach to F
        { midi: 41, onset: 960, duration: 480 }, // F2 — 4th
        { midi: 35, onset: 1440, duration: 480 }, // B1 — leading tone to C
        { midi: 36, onset: 1920, duration: 960 }, // C2 — resolve
      ],
    },
    {
      stepNumber: 136,
      module: 'funk_l3',
      section: 'C',
      subsection: 'C2: Funk Bass Techniques',
      activity: 'C2.2: Double Chromatic Approach — C-Gb-F-Db-C (Out of Time)',
      direction:
        'Play: C2-Gb2-F2-Db2-C2. Gb2 approaches F2 from above, Db2 approaches C2 from above. Both are "above" approaches.',
      assessment: 'pitch_only',
      tag: 'funk:bass_chromatic_above_oot | funk',
      styleRef: 'l3a',
      successFeedback:
        'Approach from above — both approach tones descend into their targets.',
      contentGeneration:
        'GCM v8: FUNK L3 bass double chromatic approach above. Notes: C2(36)-Gb2(42)-F2(41)-Db2(37)-C2(36). Register: octave 2.',
      targetNotes: [
        { midi: 36, onset: 0, duration: 480 }, // C2 — root
        { midi: 42, onset: 480, duration: 480 }, // Gb2 — above-approach to F
        { midi: 41, onset: 960, duration: 480 }, // F2 — 4th
        { midi: 37, onset: 1440, duration: 480 }, // Db2 — above-approach to C
        { midi: 36, onset: 1920, duration: 960 }, // C2 — resolve
      ],
    },
    {
      stepNumber: 137,
      module: 'funk_l3',
      section: 'C',
      subsection: 'C2: Funk Bass Techniques',
      activity: 'C2.3: Mixed Chromatic Approach — C-E-F-Db-C (Out of Time)',
      direction:
        'Play: C2-E2-F2-Db2-C2. E2 approaches F2 from below, Db2 approaches C2 from above. Mixed approach directions.',
      assessment: 'pitch_only',
      tag: 'funk:bass_chromatic_it | funk',
      styleRef: 'l3a',
      successFeedback:
        'Mixed chromatic approach — below AND above. Maximum smoothness.',
      contentGeneration:
        'GCM v8: FUNK L3 bass mixed chromatic approach. Notes: C2(36)-E2(40)-F2(41)-Db2(37)-C2(36). Register: octave 2.',
      targetNotes: [
        { midi: 36, onset: 0, duration: 480 }, // C2 — root
        { midi: 40, onset: 480, duration: 480 }, // E2 — below-approach to F
        { midi: 41, onset: 960, duration: 480 }, // F2 — 4th
        { midi: 37, onset: 1440, duration: 480 }, // Db2 — above-approach to C
        { midi: 36, onset: 1920, duration: 960 }, // C2 — resolve
      ],
    },
    {
      stepNumber: 138,
      module: 'funk_l3',
      section: 'C',
      subsection: 'C2: Funk Bass Techniques',
      activity: 'C2.4: 1-5 Bass Patterns (Out of Time)',
      direction:
        'Play root-fifth bass patterns: C3 on beat 1, G2 on beat 3 (Cm), then F2 on beat 1. Root and fifth — the simplest harmonic statement.',
      assessment: 'pitch_only',
      tag: 'funk:bass_5th_color_oot | funk',
      styleRef: 'l3a',
      successFeedback:
        'Root and 5th — the minimal harmonic foundation. Powerful in its simplicity.',
      contentGeneration:
        'GCM v8: FUNK L3 bass 1-5 pattern. Cm: C3(48) beat1, G2(43) beat3. F: F2(41) beat1. Register: octave 2-3.',
      targetNotes: [
        { midi: 48, onset: 0, duration: 480 }, // C3 — root of Cm
        { midi: 43, onset: 960, duration: 480 }, // G2 — 5th of Cm
        { midi: 41, onset: 1920, duration: 960 }, // F2 — root of F (long)
      ],
    },
    {
      stepNumber: 139,
      module: 'funk_l3',
      section: 'C',
      subsection: 'C2: Funk Bass Techniques',
      activity: 'C2.5: 2-Bar Bass Line with 1-5-8 Patterns (Out of Time)',
      direction:
        'Play root-fifth-octave bass line: C2 on beat 1, G2 on beat 2, C3 on beat 3 (Cm). Then F2 on beat 1 of bar 2, C3 on beat 3. Octave pop adds the bounce.',
      assessment: 'pitch_only',
      tag: 'funk:bass_2bar_combined_oot | funk',
      styleRef: 'l3a',
      successFeedback:
        'Root-fifth-octave (1-5-8) — octave pop woven into a full bass line.',
      contentGeneration:
        'GCM v8: FUNK L3 bass 1-5-8 pattern 2-bar. Bar1 Cm: C2(36)-G2(43)-C3(48). Bar2 F: F2(41)-C3(48)-F3(53). Register: octave 2-3.',
      targetNotes: [
        // Bar 1 — Cm: 1-5-8
        { midi: 36, onset: 0, duration: 480 }, // C2 — root (1)
        { midi: 43, onset: 480, duration: 480 }, // G2 — 5th (5)
        { midi: 48, onset: 960, duration: 480 }, // C3 — octave (8)
        { midi: 43, onset: 1440, duration: 480 }, // G2 — 5th
        // Bar 2 — F: 1-5-8
        { midi: 41, onset: 1920, duration: 480 }, // F2 — root (1)
        { midi: 48, onset: 2400, duration: 480 }, // C3 — 5th of F (5)
        { midi: 53, onset: 2880, duration: 480 }, // F3 — octave (8)
        { midi: 48, onset: 3360, duration: 480 }, // C3 — 5th
      ],
    },

    // ── C3: Bass Play-Along (3 steps) ────────────────────────────────────
    {
      stepNumber: 141,
      module: 'funk_l3',
      section: 'C',
      subsection: 'C3: Bass Play-Along',
      activity: 'C3.1: Octave Pop Play-Along (In Time)',
      direction:
        'Play the octave pop bass pattern over the groove. C2→C3 on the Cm bars, F2→F3 on the F bars. Drums and chords are provided.',
      assessment: 'pitch_order_timing_duration',
      tag: 'funk:bass_playalong_octave_pop | funk',
      styleRef: 'l3a',
      successFeedback:
        'Octave pop over a live groove — the bounce that defines L3 bass.',
      chordSymbols: ['Cm9', 'F13'],
      targetNotes: [
        // Bar 1 — Cm: octave pop C2→C3
        { midi: 36, onset: 0, duration: 480 }, // C2 beat 1
        { midi: 48, onset: 480, duration: 120 }, // C3 pop
        { midi: 36, onset: 960, duration: 480 }, // C2 beat 3
        { midi: 48, onset: 1440, duration: 120 }, // C3 pop
        // Bar 2 — F: octave pop F2→F3
        { midi: 41, onset: 1920, duration: 480 }, // F2 beat 1
        { midi: 53, onset: 2400, duration: 120 }, // F3 pop
        { midi: 41, onset: 2880, duration: 480 }, // F2 beat 3
        { midi: 53, onset: 3360, duration: 120 }, // F3 pop
      ],
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
    },
    {
      stepNumber: 142,
      module: 'funk_l3',
      section: 'C',
      subsection: 'C3: Bass Play-Along',
      activity: 'C3.2: Chromatic Approach Play-Along (In Time)',
      direction:
        'Play chromatic approach bass over the groove. Use E2→F2 (approach to 4th) and B1→C2 (leading tone) patterns. Drums and chords are provided.',
      assessment: 'pitch_order_timing_duration',
      tag: 'funk:bass_playalong_chromatic | funk',
      styleRef: 'l3a',
      successFeedback:
        'Chromatic approach bass in the groove — smooth and intentional.',
      chordSymbols: ['Cm9', 'F13'],
      targetNotes: [
        // Bar 1 — C-E-F-B-C pattern
        { midi: 36, onset: 0, duration: 480 },
        { midi: 40, onset: 480, duration: 480 },
        { midi: 41, onset: 960, duration: 480 },
        { midi: 35, onset: 1440, duration: 480 },
        // Bar 2 — same pattern, can vary
        { midi: 36, onset: 1920, duration: 480 },
        { midi: 40, onset: 2400, duration: 480 },
        { midi: 41, onset: 2880, duration: 480 },
        { midi: 35, onset: 3360, duration: 480 },
      ],
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
    },
    {
      stepNumber: 143,
      module: 'funk_l3',
      section: 'C',
      subsection: 'C3: Bass Play-Along',
      activity: 'C3.3: 1-5-8 Play-Along (In Time)',
      direction:
        'Play the 1-5-8 (root-fifth-octave) bass pattern over the groove. Cm: C2-G2-C3. F: F2-C3-F3. Drums and chords are provided.',
      assessment: 'pitch_order_timing_duration',
      tag: 'funk:bass_playalong_158 | funk',
      styleRef: 'l3a',
      successFeedback:
        '1-5-8 bass in the pocket — three notes, maximum harmonic clarity.',
      chordSymbols: ['Cm9', 'F13'],
      targetNotes: [
        // Bar 1 — Cm: 1-5-8
        { midi: 36, onset: 0, duration: 480 },
        { midi: 43, onset: 480, duration: 480 },
        { midi: 48, onset: 960, duration: 480 },
        { midi: 43, onset: 1440, duration: 480 },
        // Bar 2 — F: 1-5-8
        { midi: 41, onset: 1920, duration: 480 },
        { midi: 48, onset: 2400, duration: 480 },
        { midi: 53, onset: 2880, duration: 480 },
        { midi: 48, onset: 3360, duration: 480 },
      ],
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// L2 Section D — Performance (6 steps, steps 90-95)
// Piano: both hands | instrument_config tagged
// ---------------------------------------------------------------------------

const funkL2SectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    // ── D1: LH Bass + RH Chords (2 steps) ───────────────────────────────
    // NOTE: ActivityStepV2 instrument_config — pending type merge by Ryan
    {
      stepNumber: 142,
      module: 'funk_l3',
      section: 'D',
      subsection: 'D1: LH Bass + RH Chords',
      activity: 'D1.1: LH Bass + RH Sparse Voicings (Out of Time)',
      direction:
        'Left hand plays the octave-pop pattern. ' +
        'Right hand comps the Cm9 and F13 voicings. ' +
        'Listen for the Drop the Sizzle — Bb drops to A as the chord changes.',
      assessment: 'pitch_only',
      tag: 'funk:performance_lh_bass_rh_chords_l2_oot | funk',
      styleRef: 'l3a',
      successFeedback:
        'Both hands working together — bass and chords locking up.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l2a',
      },
      backing_parts: {
        engine_generates: [],
        student_plays: ['bass', 'chords'],
      },
      chordSymbols: ['Cm9', 'F13'],
      variants: [
        {
          variantId: 'D1-A',
          description: 'LH octave-pop | RH downbeats only (beats 1+3)',
          targetNotes: [
            // Bar 1 — Cm9
            { midi: 36, onset: 0, duration: 380, hand: 'lh' }, // C2 beat1 (LH root)
            { midi: 51, onset: 0, duration: 120, hand: 'rh' }, // Eb3 (RH)
            { midi: 55, onset: 0, duration: 120, hand: 'rh' }, // G3  (RH)
            { midi: 58, onset: 0, duration: 120, hand: 'rh' }, // Bb3 (RH)
            { midi: 62, onset: 0, duration: 120, hand: 'rh' }, // D4  (RH)
            { midi: 48, onset: 240, duration: 120, hand: 'lh' }, // C3 octave pop (LH)
            { midi: 36, onset: 960, duration: 380, hand: 'lh' }, // C2 beat3 (LH)
            { midi: 51, onset: 960, duration: 120, hand: 'rh' }, // Eb3 (RH)
            { midi: 55, onset: 960, duration: 120, hand: 'rh' }, // G3  (RH)
            { midi: 58, onset: 960, duration: 120, hand: 'rh' }, // Bb3 (RH)
            { midi: 62, onset: 960, duration: 120, hand: 'rh' }, // D4  (RH)
            { midi: 40, onset: 1360, duration: 120, hand: 'lh' }, // E2 — approach to F2 ↑
            // Bar 2 — F13
            { midi: 41, onset: 1920, duration: 380, hand: 'lh' }, // F2 beat1 = GOAL of E2 ↑
            { midi: 51, onset: 1920, duration: 120, hand: 'rh' }, // Eb3 (RH)
            { midi: 55, onset: 1920, duration: 120, hand: 'rh' }, // G3  (RH)
            { midi: 57, onset: 1920, duration: 120, hand: 'rh' }, // A3  (RH) — Sizzle drop
            { midi: 62, onset: 1920, duration: 120, hand: 'rh' }, // D4  (RH)
            { midi: 29, onset: 2160, duration: 120, hand: 'lh' }, // F1 octave pop down (LH)
            { midi: 41, onset: 2880, duration: 380, hand: 'lh' }, // F2 beat3 (LH)
            { midi: 51, onset: 2880, duration: 120, hand: 'rh' }, // Eb3 (RH)
            { midi: 55, onset: 2880, duration: 120, hand: 'rh' }, // G3  (RH)
            { midi: 57, onset: 2880, duration: 120, hand: 'rh' }, // A3  (RH)
            { midi: 62, onset: 2880, duration: 120, hand: 'rh' }, // D4  (RH)
            { midi: 35, onset: 3280, duration: 120, hand: 'lh' }, // B1 — approach to C2 ↑
          ],
        },
        {
          variantId: 'D1-B',
          description: 'LH octave-pop | RH full unison with LH',
          targetNotes: [
            // Bar 1 — Cm9
            { midi: 36, onset: 0, duration: 380, hand: 'lh' },
            { midi: 51, onset: 0, duration: 120, hand: 'rh' },
            { midi: 55, onset: 0, duration: 120, hand: 'rh' },
            { midi: 58, onset: 0, duration: 120, hand: 'rh' },
            { midi: 62, onset: 0, duration: 120, hand: 'rh' },
            { midi: 48, onset: 240, duration: 120, hand: 'lh' }, // C3 pop (LH)
            { midi: 51, onset: 240, duration: 120, hand: 'rh' }, // RH unison
            { midi: 55, onset: 240, duration: 120, hand: 'rh' },
            { midi: 58, onset: 240, duration: 120, hand: 'rh' },
            { midi: 62, onset: 240, duration: 120, hand: 'rh' },
            { midi: 36, onset: 960, duration: 380, hand: 'lh' },
            { midi: 51, onset: 960, duration: 120, hand: 'rh' },
            { midi: 55, onset: 960, duration: 120, hand: 'rh' },
            { midi: 58, onset: 960, duration: 120, hand: 'rh' },
            { midi: 62, onset: 960, duration: 120, hand: 'rh' },
            { midi: 40, onset: 1360, duration: 120, hand: 'lh' }, // E2 approach→F2 (LH) ↑
            { midi: 51, onset: 1360, duration: 120, hand: 'rh' }, // RH unison
            { midi: 55, onset: 1360, duration: 120, hand: 'rh' },
            { midi: 58, onset: 1360, duration: 120, hand: 'rh' },
            { midi: 62, onset: 1360, duration: 120, hand: 'rh' },
            // Bar 2 — F13
            { midi: 41, onset: 1920, duration: 380, hand: 'lh' }, // F2 = GOAL ↑
            { midi: 51, onset: 1920, duration: 120, hand: 'rh' },
            { midi: 55, onset: 1920, duration: 120, hand: 'rh' },
            { midi: 57, onset: 1920, duration: 120, hand: 'rh' },
            { midi: 62, onset: 1920, duration: 120, hand: 'rh' },
            { midi: 29, onset: 2160, duration: 120, hand: 'lh' }, // F1 pop down (LH)
            { midi: 51, onset: 2160, duration: 120, hand: 'rh' },
            { midi: 55, onset: 2160, duration: 120, hand: 'rh' },
            { midi: 57, onset: 2160, duration: 120, hand: 'rh' },
            { midi: 62, onset: 2160, duration: 120, hand: 'rh' },
            { midi: 41, onset: 2880, duration: 380, hand: 'lh' },
            { midi: 51, onset: 2880, duration: 120, hand: 'rh' },
            { midi: 55, onset: 2880, duration: 120, hand: 'rh' },
            { midi: 57, onset: 2880, duration: 120, hand: 'rh' },
            { midi: 62, onset: 2880, duration: 120, hand: 'rh' },
            { midi: 35, onset: 3280, duration: 120, hand: 'lh' }, // B1 approach→C2 (LH) ↑
            { midi: 51, onset: 3280, duration: 120, hand: 'rh' },
            { midi: 55, onset: 3280, duration: 120, hand: 'rh' },
            { midi: 57, onset: 3280, duration: 120, hand: 'rh' },
            { midi: 62, onset: 3280, duration: 120, hand: 'rh' },
          ],
        },
        {
          variantId: 'D1-C',
          description: 'LH sustained whole notes | RH octave-pop stab pattern',
          direction:
            'Right hand plays the octave-pop pattern this time. ' +
            'Left hand holds the root as a whole note. Feel how the technique ' +
            'sounds from the other hand.',
          targetNotes: [
            // Bar 1 — Cm9 | LH: whole note | RH: octave-pop pattern
            { midi: 36, onset: 0, duration: 1800, hand: 'lh' }, // C2 whole note (LH)
            { midi: 51, onset: 0, duration: 120, hand: 'rh' },
            { midi: 55, onset: 0, duration: 120, hand: 'rh' },
            { midi: 58, onset: 0, duration: 120, hand: 'rh' },
            { midi: 62, onset: 0, duration: 120, hand: 'rh' },
            { midi: 51, onset: 240, duration: 120, hand: 'rh' },
            { midi: 55, onset: 240, duration: 120, hand: 'rh' },
            { midi: 58, onset: 240, duration: 120, hand: 'rh' },
            { midi: 62, onset: 240, duration: 120, hand: 'rh' },
            { midi: 51, onset: 960, duration: 120, hand: 'rh' },
            { midi: 55, onset: 960, duration: 120, hand: 'rh' },
            { midi: 58, onset: 960, duration: 120, hand: 'rh' },
            { midi: 62, onset: 960, duration: 120, hand: 'rh' },
            { midi: 51, onset: 1360, duration: 120, hand: 'rh' },
            { midi: 55, onset: 1360, duration: 120, hand: 'rh' },
            { midi: 58, onset: 1360, duration: 120, hand: 'rh' },
            { midi: 62, onset: 1360, duration: 120, hand: 'rh' },
            // Bar 2 — F13 | LH: whole note | RH: octave-pop pattern
            { midi: 41, onset: 1920, duration: 1800, hand: 'lh' }, // F2 whole note (LH)
            { midi: 51, onset: 1920, duration: 120, hand: 'rh' },
            { midi: 55, onset: 1920, duration: 120, hand: 'rh' },
            { midi: 57, onset: 1920, duration: 120, hand: 'rh' },
            { midi: 62, onset: 1920, duration: 120, hand: 'rh' },
            { midi: 51, onset: 2160, duration: 120, hand: 'rh' },
            { midi: 55, onset: 2160, duration: 120, hand: 'rh' },
            { midi: 57, onset: 2160, duration: 120, hand: 'rh' },
            { midi: 62, onset: 2160, duration: 120, hand: 'rh' },
            { midi: 51, onset: 2880, duration: 120, hand: 'rh' },
            { midi: 55, onset: 2880, duration: 120, hand: 'rh' },
            { midi: 57, onset: 2880, duration: 120, hand: 'rh' },
            { midi: 62, onset: 2880, duration: 120, hand: 'rh' },
            { midi: 51, onset: 3280, duration: 120, hand: 'rh' },
            { midi: 55, onset: 3280, duration: 120, hand: 'rh' },
            { midi: 57, onset: 3280, duration: 120, hand: 'rh' },
            { midi: 62, onset: 3280, duration: 120, hand: 'rh' },
          ],
        },
      ],
      targetNotes: [],
    },
    {
      stepNumber: 143,
      module: 'funk_l3',
      section: 'D',
      subsection: 'D1: LH Bass + RH Chords',
      activity: 'D1.2: LH Bass + RH Stabs (In Time)',
      assessment: 'pitch_order_timing',
      tag: 'funk:performance_lh_bass_rh_chords_l2_it | funk',
      styleRef: 'l3a',
      successFeedback: 'In time, both hands locked — that is funk keyboard.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l2a',
      },
      backing_parts: {
        engine_generates: ['drums', 'melody'],
        student_plays: ['bass', 'chords'],
      },
      chordSymbols: ['Cm9', 'F13'],
      // variants: same 3 variants as D1.1
      variants: [
        {
          variantId: 'D1-A',
          description: 'LH octave-pop | RH downbeats only (beats 1+3)',
          targetNotes: [
            { midi: 36, onset: 0, duration: 380, hand: 'lh' },
            { midi: 51, onset: 0, duration: 120, hand: 'rh' },
            { midi: 55, onset: 0, duration: 120, hand: 'rh' },
            { midi: 58, onset: 0, duration: 120, hand: 'rh' },
            { midi: 62, onset: 0, duration: 120, hand: 'rh' },
            { midi: 48, onset: 240, duration: 120, hand: 'lh' },
            { midi: 36, onset: 960, duration: 380, hand: 'lh' },
            { midi: 51, onset: 960, duration: 120, hand: 'rh' },
            { midi: 55, onset: 960, duration: 120, hand: 'rh' },
            { midi: 58, onset: 960, duration: 120, hand: 'rh' },
            { midi: 62, onset: 960, duration: 120, hand: 'rh' },
            { midi: 40, onset: 1360, duration: 120, hand: 'lh' },
            { midi: 41, onset: 1920, duration: 380, hand: 'lh' },
            { midi: 51, onset: 1920, duration: 120, hand: 'rh' },
            { midi: 55, onset: 1920, duration: 120, hand: 'rh' },
            { midi: 57, onset: 1920, duration: 120, hand: 'rh' },
            { midi: 62, onset: 1920, duration: 120, hand: 'rh' },
            { midi: 29, onset: 2160, duration: 120, hand: 'lh' }, // F1 pop down (LH)
            { midi: 41, onset: 2880, duration: 380, hand: 'lh' },
            { midi: 51, onset: 2880, duration: 120, hand: 'rh' },
            { midi: 55, onset: 2880, duration: 120, hand: 'rh' },
            { midi: 57, onset: 2880, duration: 120, hand: 'rh' },
            { midi: 62, onset: 2880, duration: 120, hand: 'rh' },
            { midi: 35, onset: 3280, duration: 120, hand: 'lh' },
            // bar 3: final downbeat — LH C2 + RH Cm9
            { midi: 36, onset: 3840, duration: 120, hand: 'lh' },
            { midi: 51, onset: 3840, duration: 120, hand: 'rh' },
            { midi: 55, onset: 3840, duration: 120, hand: 'rh' },
            { midi: 58, onset: 3840, duration: 120, hand: 'rh' },
            { midi: 62, onset: 3840, duration: 120, hand: 'rh' },
          ],
        },
        {
          variantId: 'D1-B',
          description: 'LH octave-pop | RH full unison with LH',
          targetNotes: [
            { midi: 36, onset: 0, duration: 380, hand: 'lh' },
            { midi: 51, onset: 0, duration: 120, hand: 'rh' },
            { midi: 55, onset: 0, duration: 120, hand: 'rh' },
            { midi: 58, onset: 0, duration: 120, hand: 'rh' },
            { midi: 62, onset: 0, duration: 120, hand: 'rh' },
            { midi: 48, onset: 240, duration: 120, hand: 'lh' },
            { midi: 51, onset: 240, duration: 120, hand: 'rh' },
            { midi: 55, onset: 240, duration: 120, hand: 'rh' },
            { midi: 58, onset: 240, duration: 120, hand: 'rh' },
            { midi: 62, onset: 240, duration: 120, hand: 'rh' },
            { midi: 36, onset: 960, duration: 380, hand: 'lh' },
            { midi: 51, onset: 960, duration: 120, hand: 'rh' },
            { midi: 55, onset: 960, duration: 120, hand: 'rh' },
            { midi: 58, onset: 960, duration: 120, hand: 'rh' },
            { midi: 62, onset: 960, duration: 120, hand: 'rh' },
            { midi: 40, onset: 1360, duration: 120, hand: 'lh' },
            { midi: 51, onset: 1360, duration: 120, hand: 'rh' },
            { midi: 55, onset: 1360, duration: 120, hand: 'rh' },
            { midi: 58, onset: 1360, duration: 120, hand: 'rh' },
            { midi: 62, onset: 1360, duration: 120, hand: 'rh' },
            { midi: 41, onset: 1920, duration: 380, hand: 'lh' },
            { midi: 51, onset: 1920, duration: 120, hand: 'rh' },
            { midi: 55, onset: 1920, duration: 120, hand: 'rh' },
            { midi: 57, onset: 1920, duration: 120, hand: 'rh' },
            { midi: 62, onset: 1920, duration: 120, hand: 'rh' },
            { midi: 29, onset: 2160, duration: 120, hand: 'lh' }, // F1 pop down (LH)
            { midi: 51, onset: 2160, duration: 120, hand: 'rh' },
            { midi: 55, onset: 2160, duration: 120, hand: 'rh' },
            { midi: 57, onset: 2160, duration: 120, hand: 'rh' },
            { midi: 62, onset: 2160, duration: 120, hand: 'rh' },
            { midi: 41, onset: 2880, duration: 380, hand: 'lh' },
            { midi: 51, onset: 2880, duration: 120, hand: 'rh' },
            { midi: 55, onset: 2880, duration: 120, hand: 'rh' },
            { midi: 57, onset: 2880, duration: 120, hand: 'rh' },
            { midi: 62, onset: 2880, duration: 120, hand: 'rh' },
            { midi: 35, onset: 3280, duration: 120, hand: 'lh' },
            { midi: 51, onset: 3280, duration: 120, hand: 'rh' },
            { midi: 55, onset: 3280, duration: 120, hand: 'rh' },
            { midi: 57, onset: 3280, duration: 120, hand: 'rh' },
            { midi: 62, onset: 3280, duration: 120, hand: 'rh' },
            // bar 3: final downbeat — LH C2 + RH Cm9
            { midi: 36, onset: 3840, duration: 120, hand: 'lh' },
            { midi: 51, onset: 3840, duration: 120, hand: 'rh' },
            { midi: 55, onset: 3840, duration: 120, hand: 'rh' },
            { midi: 58, onset: 3840, duration: 120, hand: 'rh' },
            { midi: 62, onset: 3840, duration: 120, hand: 'rh' },
          ],
        },
        {
          variantId: 'D1-C',
          description: 'LH sustained whole notes | RH octave-pop stab pattern',
          direction:
            'Right hand plays the octave-pop pattern this time. ' +
            'Left hand holds the root as a whole note.',
          targetNotes: [
            { midi: 36, onset: 0, duration: 1800, hand: 'lh' },
            { midi: 51, onset: 0, duration: 120, hand: 'rh' },
            { midi: 55, onset: 0, duration: 120, hand: 'rh' },
            { midi: 58, onset: 0, duration: 120, hand: 'rh' },
            { midi: 62, onset: 0, duration: 120, hand: 'rh' },
            { midi: 51, onset: 240, duration: 120, hand: 'rh' },
            { midi: 55, onset: 240, duration: 120, hand: 'rh' },
            { midi: 58, onset: 240, duration: 120, hand: 'rh' },
            { midi: 62, onset: 240, duration: 120, hand: 'rh' },
            { midi: 51, onset: 960, duration: 120, hand: 'rh' },
            { midi: 55, onset: 960, duration: 120, hand: 'rh' },
            { midi: 58, onset: 960, duration: 120, hand: 'rh' },
            { midi: 62, onset: 960, duration: 120, hand: 'rh' },
            { midi: 51, onset: 1360, duration: 120, hand: 'rh' },
            { midi: 55, onset: 1360, duration: 120, hand: 'rh' },
            { midi: 58, onset: 1360, duration: 120, hand: 'rh' },
            { midi: 62, onset: 1360, duration: 120, hand: 'rh' },
            { midi: 41, onset: 1920, duration: 1800, hand: 'lh' },
            { midi: 51, onset: 1920, duration: 120, hand: 'rh' },
            { midi: 55, onset: 1920, duration: 120, hand: 'rh' },
            { midi: 57, onset: 1920, duration: 120, hand: 'rh' },
            { midi: 62, onset: 1920, duration: 120, hand: 'rh' },
            { midi: 51, onset: 2160, duration: 120, hand: 'rh' },
            { midi: 55, onset: 2160, duration: 120, hand: 'rh' },
            { midi: 57, onset: 2160, duration: 120, hand: 'rh' },
            { midi: 62, onset: 2160, duration: 120, hand: 'rh' },
            { midi: 51, onset: 2880, duration: 120, hand: 'rh' },
            { midi: 55, onset: 2880, duration: 120, hand: 'rh' },
            { midi: 57, onset: 2880, duration: 120, hand: 'rh' },
            { midi: 62, onset: 2880, duration: 120, hand: 'rh' },
            { midi: 51, onset: 3280, duration: 120, hand: 'rh' },
            { midi: 55, onset: 3280, duration: 120, hand: 'rh' },
            { midi: 57, onset: 3280, duration: 120, hand: 'rh' },
            { midi: 62, onset: 3280, duration: 120, hand: 'rh' },
            // bar 3: final downbeat — LH C2 + RH Cm9
            { midi: 36, onset: 3840, duration: 120, hand: 'lh' },
            { midi: 51, onset: 3840, duration: 120, hand: 'rh' },
            { midi: 55, onset: 3840, duration: 120, hand: 'rh' },
            { midi: 58, onset: 3840, duration: 120, hand: 'rh' },
            { midi: 62, onset: 3840, duration: 120, hand: 'rh' },
          ],
        },
      ],
      targetNotes: [],
    },

    // ── D2: LH Chords + RH Melody (2 steps) ─────────────────────────────
    {
      stepNumber: 144,
      module: 'funk_l3',
      section: 'D',
      subsection: 'D2: LH Chords + RH Melody',
      activity: 'D2.1: LH Rootless Voicings + RH Motivic Phrase (Out of Time)',
      direction:
        'Left hand plays the Cm9 and F13 rootless voicings. Right hand plays the call-and-answer melody phrase from the A section. Listen for the Drop the Sizzle — Bb drops to A as the chord changes.',
      assessment: 'pitch_only',
      tag: 'funk:performance_lh_chords_rh_melody_l2_oot | funk',
      styleRef: 'l3a',
      successFeedback:
        'Both hands together — voicings in the left, melody in the right.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_chords_rh_melody',
        lh_role: 'chords',
        rh_role: 'melody',
        style_ref: 'l2a',
      },
      chordSymbols: ['Cm9', 'F13'],
      backing_parts: {
        engine_generates: [],
        student_plays: ['chords', 'melody'],
      },
      targetNotes: [
        // LH bar 1 — Cm9 [3-5-b7-9]: Eb3+G3+Bb3+D4
        { midi: 51, onset: 0, duration: 120, hand: 'lh' }, // Eb3
        { midi: 55, onset: 0, duration: 120, hand: 'lh' }, // G3
        { midi: 58, onset: 0, duration: 120, hand: 'lh' }, // Bb3
        { midi: 62, onset: 0, duration: 120, hand: 'lh' }, // D4
        { midi: 51, onset: 360, duration: 120, hand: 'lh' },
        { midi: 55, onset: 360, duration: 120, hand: 'lh' },
        { midi: 58, onset: 360, duration: 120, hand: 'lh' },
        { midi: 62, onset: 360, duration: 120, hand: 'lh' },
        { midi: 51, onset: 960, duration: 120, hand: 'lh' },
        { midi: 55, onset: 960, duration: 120, hand: 'lh' },
        { midi: 58, onset: 960, duration: 120, hand: 'lh' },
        { midi: 62, onset: 960, duration: 120, hand: 'lh' },
        { midi: 51, onset: 1200, duration: 120, hand: 'lh' },
        { midi: 55, onset: 1200, duration: 120, hand: 'lh' },
        { midi: 58, onset: 1200, duration: 120, hand: 'lh' },
        { midi: 62, onset: 1200, duration: 120, hand: 'lh' },
        // LH bar 2 — F13 [b7-9-3-13]: Eb3+G3+A3+D4 (only Bb→A)
        { midi: 51, onset: 1920, duration: 120, hand: 'lh' },
        { midi: 55, onset: 1920, duration: 120, hand: 'lh' },
        { midi: 57, onset: 1920, duration: 120, hand: 'lh' }, // A3 — Drop the Sizzle
        { midi: 62, onset: 1920, duration: 120, hand: 'lh' },
        { midi: 51, onset: 2280, duration: 120, hand: 'lh' },
        { midi: 55, onset: 2280, duration: 120, hand: 'lh' },
        { midi: 57, onset: 2280, duration: 120, hand: 'lh' },
        { midi: 62, onset: 2280, duration: 120, hand: 'lh' },
        { midi: 51, onset: 2880, duration: 120, hand: 'lh' },
        { midi: 55, onset: 2880, duration: 120, hand: 'lh' },
        { midi: 57, onset: 2880, duration: 120, hand: 'lh' },
        { midi: 62, onset: 2880, duration: 120, hand: 'lh' },
        { midi: 51, onset: 3120, duration: 120, hand: 'lh' },
        { midi: 55, onset: 3120, duration: 120, hand: 'lh' },
        { midi: 57, onset: 3120, duration: 120, hand: 'lh' },
        { midi: 62, onset: 3120, duration: 120, hand: 'lh' },
        // RH bar 1 — call phrase
        { midi: 67, onset: 0, duration: 480, hand: 'rh' }, // G4  bar1 beat1
        { midi: 70, onset: 600, duration: 240, hand: 'rh' }, // Bb4 bar1 beat2.2
        { midi: 69, onset: 840, duration: 120, hand: 'rh' }, // A4  bar1 beat2.4
        { midi: 67, onset: 960, duration: 960, hand: 'rh' }, // G4  bar1 beat3
        // RH bar 2 — answer phrase
        { midi: 67, onset: 1920, duration: 480, hand: 'rh' }, // G4  bar2 beat1
        { midi: 65, onset: 2520, duration: 240, hand: 'rh' }, // F4  bar2 beat2.2
        { midi: 67, onset: 2760, duration: 120, hand: 'rh' }, // G4  bar2 beat2.4
        { midi: 65, onset: 2880, duration: 960, hand: 'rh' }, // F4  bar2 beat3
      ],
    },
    {
      stepNumber: 145,
      module: 'funk_l3',
      section: 'D',
      subsection: 'D2: LH Chords + RH Melody',
      activity: 'D2.2: LH Rootless Voicings + RH Motivic Phrase (In Time)',
      direction:
        'Same two-hand pattern, now in time with drums and bass backing.',
      assessment: 'pitch_order_timing',
      tag: 'funk:performance_lh_chords_rh_melody_l2_it | funk',
      styleRef: 'l3a',
      successFeedback:
        'Both hands in time — voicings and melody locked together.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_chords_rh_melody',
        lh_role: 'chords',
        rh_role: 'melody',
        style_ref: 'l2a',
      },
      chordSymbols: ['Cm9', 'F13'],
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords', 'melody'],
      },
      targetNotes: [
        { midi: 51, onset: 0, duration: 120, hand: 'lh' },
        { midi: 55, onset: 0, duration: 120, hand: 'lh' },
        { midi: 58, onset: 0, duration: 120, hand: 'lh' },
        { midi: 62, onset: 0, duration: 120, hand: 'lh' },
        { midi: 51, onset: 360, duration: 120, hand: 'lh' },
        { midi: 55, onset: 360, duration: 120, hand: 'lh' },
        { midi: 58, onset: 360, duration: 120, hand: 'lh' },
        { midi: 62, onset: 360, duration: 120, hand: 'lh' },
        { midi: 51, onset: 960, duration: 120, hand: 'lh' },
        { midi: 55, onset: 960, duration: 120, hand: 'lh' },
        { midi: 58, onset: 960, duration: 120, hand: 'lh' },
        { midi: 62, onset: 960, duration: 120, hand: 'lh' },
        { midi: 51, onset: 1200, duration: 120, hand: 'lh' },
        { midi: 55, onset: 1200, duration: 120, hand: 'lh' },
        { midi: 58, onset: 1200, duration: 120, hand: 'lh' },
        { midi: 62, onset: 1200, duration: 120, hand: 'lh' },
        { midi: 51, onset: 1920, duration: 120, hand: 'lh' },
        { midi: 55, onset: 1920, duration: 120, hand: 'lh' },
        { midi: 57, onset: 1920, duration: 120, hand: 'lh' },
        { midi: 62, onset: 1920, duration: 120, hand: 'lh' },
        { midi: 51, onset: 2280, duration: 120, hand: 'lh' },
        { midi: 55, onset: 2280, duration: 120, hand: 'lh' },
        { midi: 57, onset: 2280, duration: 120, hand: 'lh' },
        { midi: 62, onset: 2280, duration: 120, hand: 'lh' },
        { midi: 51, onset: 2880, duration: 120, hand: 'lh' },
        { midi: 55, onset: 2880, duration: 120, hand: 'lh' },
        { midi: 57, onset: 2880, duration: 120, hand: 'lh' },
        { midi: 62, onset: 2880, duration: 120, hand: 'lh' },
        { midi: 51, onset: 3120, duration: 120, hand: 'lh' },
        { midi: 55, onset: 3120, duration: 120, hand: 'lh' },
        { midi: 57, onset: 3120, duration: 120, hand: 'lh' },
        { midi: 62, onset: 3120, duration: 120, hand: 'lh' },
        { midi: 67, onset: 0, duration: 480, hand: 'rh' }, // G4  bar1 beat1
        { midi: 70, onset: 600, duration: 240, hand: 'rh' }, // Bb4 bar1 beat2.2
        { midi: 69, onset: 840, duration: 120, hand: 'rh' }, // A4  bar1 beat2.4
        { midi: 67, onset: 960, duration: 960, hand: 'rh' }, // G4  bar1 beat3
        { midi: 67, onset: 1920, duration: 480, hand: 'rh' }, // G4  bar2 beat1
        { midi: 65, onset: 2520, duration: 240, hand: 'rh' }, // F4  bar2 beat2.2
        { midi: 67, onset: 2760, duration: 120, hand: 'rh' }, // G4  bar2 beat2.4
        { midi: 65, onset: 2880, duration: 960, hand: 'rh' }, // F4  bar2 beat3
        // bar 3: final downbeat — LH Cm9 + RH G4
        { midi: 51, onset: 3840, duration: 120, hand: 'lh' },
        { midi: 55, onset: 3840, duration: 120, hand: 'lh' },
        { midi: 58, onset: 3840, duration: 120, hand: 'lh' },
        { midi: 62, onset: 3840, duration: 120, hand: 'lh' },
        { midi: 67, onset: 3840, duration: 120, hand: 'rh' },
      ],
    },

    // ── D3: Full Groove Play-Alongs (3 steps) ───────────────────────────
    {
      stepNumber: 146,
      module: 'funk_l3',
      section: 'D',
      subsection: 'D3: Full Groove',
      activity:
        'D3.1: Cm9→F13 Play-Along — LH Octave Pop + RH Voicings (In Time)',
      direction:
        'Level 3 capstone part 1: LH plays octave pop on C and F. ' +
        'RH comps Cm9 (Eb-Bb-D) then F13 (Eb-A-D) — feel the Drop the Sizzle as Bb moves to A.',
      assessment: 'pitch_order_timing',
      tag: 'funk:performance_cm9_f13_playon_l3_it | funk',
      styleRef: 'l3a',
      successFeedback:
        'Cm9→F13 groove locked. Octave pop in the left, voicings in the right.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      chordSymbols: ['Cm9', 'F13'],
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        // Bar 1 — Cm9 | LH octave pop C | RH [Eb3-Bb3-D4] at [0,360,960,1320]
        { midi: 36, onset: 0, duration: 480, hand: 'lh' }, // C2 beat1
        { midi: 48, onset: 480, duration: 120, hand: 'lh' }, // C3 pop
        { midi: 36, onset: 960, duration: 480, hand: 'lh' }, // C2 beat3
        { midi: 48, onset: 1440, duration: 120, hand: 'lh' }, // C3 pop
        { midi: 51, onset: 0, duration: 120, hand: 'rh' }, // Eb3
        { midi: 58, onset: 0, duration: 120, hand: 'rh' }, // Bb3
        { midi: 62, onset: 0, duration: 120, hand: 'rh' }, // D4
        { midi: 51, onset: 360, duration: 120, hand: 'rh' },
        { midi: 58, onset: 360, duration: 120, hand: 'rh' },
        { midi: 62, onset: 360, duration: 120, hand: 'rh' },
        { midi: 51, onset: 960, duration: 120, hand: 'rh' },
        { midi: 58, onset: 960, duration: 120, hand: 'rh' },
        { midi: 62, onset: 960, duration: 120, hand: 'rh' },
        { midi: 51, onset: 1320, duration: 120, hand: 'rh' },
        { midi: 58, onset: 1320, duration: 120, hand: 'rh' },
        { midi: 62, onset: 1320, duration: 120, hand: 'rh' },
        // Bar 2 — F13 | LH octave pop F | RH [Eb3-A3-D4] at [1920,2280,2880,3240]
        { midi: 41, onset: 1920, duration: 480, hand: 'lh' }, // F2 beat1
        { midi: 53, onset: 2400, duration: 120, hand: 'lh' }, // F3 pop
        { midi: 41, onset: 2880, duration: 480, hand: 'lh' }, // F2 beat3
        { midi: 53, onset: 3360, duration: 120, hand: 'lh' }, // F3 pop
        { midi: 51, onset: 1920, duration: 120, hand: 'rh' }, // Eb3
        { midi: 57, onset: 1920, duration: 120, hand: 'rh' }, // A3 — Drop the Sizzle
        { midi: 62, onset: 1920, duration: 120, hand: 'rh' }, // D4
        { midi: 51, onset: 2280, duration: 120, hand: 'rh' },
        { midi: 57, onset: 2280, duration: 120, hand: 'rh' },
        { midi: 62, onset: 2280, duration: 120, hand: 'rh' },
        { midi: 51, onset: 2880, duration: 120, hand: 'rh' },
        { midi: 57, onset: 2880, duration: 120, hand: 'rh' },
        { midi: 62, onset: 2880, duration: 120, hand: 'rh' },
        { midi: 51, onset: 3240, duration: 120, hand: 'rh' },
        { midi: 57, onset: 3240, duration: 120, hand: 'rh' },
        { midi: 62, onset: 3240, duration: 120, hand: 'rh' },
        // bar 3: final downbeat — LH C2 + RH Cm9
        { midi: 36, onset: 3840, duration: 120, hand: 'lh' },
        { midi: 51, onset: 3840, duration: 120, hand: 'rh' },
        { midi: 58, onset: 3840, duration: 120, hand: 'rh' },
        { midi: 62, onset: 3840, duration: 120, hand: 'rh' },
      ],
    },
    {
      stepNumber: 147,
      module: 'funk_l3',
      section: 'D',
      subsection: 'D3: Full Groove',
      activity:
        'D3.2: Ab13→G7alt→Cm9 Play-Along — LH 1-5-8 + RH Voicings (In Time)',
      direction:
        'Level 3 capstone part 2: the turnaround. ' +
        'LH walks the 1-5-8 bass pattern. ' +
        'RH plays Ab13 (F#-C-F), G7alt (F-Ab-Eb), Cm9 (Eb-Bb-D). ' +
        'Three chords — each one a half-step closer to home.',
      assessment: 'pitch_order_timing',
      tag: 'funk:performance_ab13_g7alt_cm9_playon_l3_it | funk',
      styleRef: 'l3a',
      successFeedback: 'Turnaround nailed. The resolution to Cm9 feels earned.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      chordSymbols: ['Ab13', 'G7alt', 'Cm9'],
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        // Bar 1 — Ab13 | LH: Ab2-Eb3-Ab3 (1-5-8) | RH: F#3-C4-F4 (b7-3-13)
        { midi: 44, onset: 0, duration: 480, hand: 'lh' }, // Ab2
        { midi: 51, onset: 480, duration: 480, hand: 'lh' }, // Eb3
        { midi: 56, onset: 960, duration: 480, hand: 'lh' }, // Ab3
        { midi: 51, onset: 1440, duration: 480, hand: 'lh' }, // Eb3 step back
        { midi: 54, onset: 0, duration: 480, hand: 'rh' }, // F#3 (b7 of Ab)
        { midi: 60, onset: 0, duration: 480, hand: 'rh' }, // C4  (3rd of Ab)
        { midi: 65, onset: 0, duration: 480, hand: 'rh' }, // F4  (13th of Ab)
        // Bar 2 — G7alt | LH: G2-D3-G3 (1-5-8) | RH: F3-Ab3-Eb4 (b7-b9-b13)
        { midi: 43, onset: 1920, duration: 480, hand: 'lh' }, // G2
        { midi: 50, onset: 2400, duration: 480, hand: 'lh' }, // D3
        { midi: 55, onset: 2880, duration: 480, hand: 'lh' }, // G3
        { midi: 50, onset: 3360, duration: 480, hand: 'lh' }, // D3 step back
        { midi: 53, onset: 1920, duration: 480, hand: 'rh' }, // F3  (b7 of G)
        { midi: 56, onset: 1920, duration: 480, hand: 'rh' }, // Ab3 (b9 of G)
        { midi: 63, onset: 1920, duration: 480, hand: 'rh' }, // Eb4 (b13 of G)
        // Bar 3 — Cm9 | LH: C2-G2-C3 (1-5-8) | RH: Eb3-Bb3-D4 (b3-b7-9) hold
        { midi: 36, onset: 3840, duration: 480, hand: 'lh' }, // C2
        { midi: 43, onset: 4320, duration: 480, hand: 'lh' }, // G2
        { midi: 48, onset: 4800, duration: 480, hand: 'lh' }, // C3
        { midi: 43, onset: 5280, duration: 480, hand: 'lh' }, // G2 step back
        { midi: 51, onset: 3840, duration: 960, hand: 'rh' }, // Eb3
        { midi: 58, onset: 3840, duration: 960, hand: 'rh' }, // Bb3
        { midi: 62, onset: 3840, duration: 960, hand: 'rh' }, // D4
        // bar 4: final downbeat — LH C2 + RH Cm9
        { midi: 36, onset: 5760, duration: 120, hand: 'lh' },
        { midi: 51, onset: 5760, duration: 120, hand: 'rh' },
        { midi: 58, onset: 5760, duration: 120, hand: 'rh' },
        { midi: 62, onset: 5760, duration: 120, hand: 'rh' },
      ],
    },
    {
      stepNumber: 148,
      module: 'funk_l3',
      section: 'D',
      subsection: 'D3: Full Groove',
      activity: 'D3.3: Full Capstone — Cm9→F13→Ab13→G7alt→Cm9 (In Time)',
      direction:
        'Level 3 capstone: the full progression. ' +
        'LH alternates octave pop (Cm, F) and 1-5-8 (Ab, G). ' +
        'RH plays the voicings through all five chords. ' +
        'Five chords, full groove — this is the complete Funk L3 feel.',
      assessment: 'pitch_order_timing',
      tag: 'funk:performance_capstone_l3_it | funk',
      styleRef: 'l3a',
      successFeedback:
        'Level 3 complete. You have the full Funk keyboard vocabulary.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      chordSymbols: ['Cm9', 'F13', 'Ab13', 'G7alt', 'Cm9'],
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['bass', 'chords'],
      },
      targetNotes: [
        // Bar 1 — Cm9 | LH octave pop C | RH [Eb3-Bb3-D4] at [0,360,960,1320]
        { midi: 36, onset: 0, duration: 480, hand: 'lh' },
        { midi: 48, onset: 480, duration: 120, hand: 'lh' },
        { midi: 36, onset: 960, duration: 480, hand: 'lh' },
        { midi: 48, onset: 1440, duration: 120, hand: 'lh' },
        { midi: 51, onset: 0, duration: 120, hand: 'rh' },
        { midi: 58, onset: 0, duration: 120, hand: 'rh' },
        { midi: 62, onset: 0, duration: 120, hand: 'rh' },
        { midi: 51, onset: 360, duration: 120, hand: 'rh' },
        { midi: 58, onset: 360, duration: 120, hand: 'rh' },
        { midi: 62, onset: 360, duration: 120, hand: 'rh' },
        { midi: 51, onset: 960, duration: 120, hand: 'rh' },
        { midi: 58, onset: 960, duration: 120, hand: 'rh' },
        { midi: 62, onset: 960, duration: 120, hand: 'rh' },
        { midi: 51, onset: 1320, duration: 120, hand: 'rh' },
        { midi: 58, onset: 1320, duration: 120, hand: 'rh' },
        { midi: 62, onset: 1320, duration: 120, hand: 'rh' },
        // Bar 2 — F13 | LH octave pop F | RH [Eb3-A3-D4] at [1920,2280,2880,3240]
        { midi: 41, onset: 1920, duration: 480, hand: 'lh' },
        { midi: 53, onset: 2400, duration: 120, hand: 'lh' },
        { midi: 41, onset: 2880, duration: 480, hand: 'lh' },
        { midi: 53, onset: 3360, duration: 120, hand: 'lh' },
        { midi: 51, onset: 1920, duration: 120, hand: 'rh' },
        { midi: 57, onset: 1920, duration: 120, hand: 'rh' },
        { midi: 62, onset: 1920, duration: 120, hand: 'rh' },
        { midi: 51, onset: 2280, duration: 120, hand: 'rh' },
        { midi: 57, onset: 2280, duration: 120, hand: 'rh' },
        { midi: 62, onset: 2280, duration: 120, hand: 'rh' },
        { midi: 51, onset: 2880, duration: 120, hand: 'rh' },
        { midi: 57, onset: 2880, duration: 120, hand: 'rh' },
        { midi: 62, onset: 2880, duration: 120, hand: 'rh' },
        { midi: 51, onset: 3240, duration: 120, hand: 'rh' },
        { midi: 57, onset: 3240, duration: 120, hand: 'rh' },
        { midi: 62, onset: 3240, duration: 120, hand: 'rh' },
        // Bar 3 — Ab13 | LH 1-5-8 Ab | RH [F#3-C4-F4] (b7-3-13)
        { midi: 44, onset: 3840, duration: 480, hand: 'lh' },
        { midi: 51, onset: 4320, duration: 480, hand: 'lh' },
        { midi: 56, onset: 4800, duration: 480, hand: 'lh' },
        { midi: 51, onset: 5280, duration: 480, hand: 'lh' },
        { midi: 54, onset: 3840, duration: 480, hand: 'rh' }, // F#3
        { midi: 60, onset: 3840, duration: 480, hand: 'rh' }, // C4
        { midi: 65, onset: 3840, duration: 480, hand: 'rh' }, // F4
        // Bar 4 — G7alt | LH 1-5-8 G | RH [F3-Ab3-Eb4] (b7-b9-b13)
        { midi: 43, onset: 5760, duration: 480, hand: 'lh' },
        { midi: 50, onset: 6240, duration: 480, hand: 'lh' },
        { midi: 55, onset: 6720, duration: 480, hand: 'lh' },
        { midi: 50, onset: 7200, duration: 480, hand: 'lh' },
        { midi: 53, onset: 5760, duration: 480, hand: 'rh' }, // F3
        { midi: 56, onset: 5760, duration: 480, hand: 'rh' }, // Ab3
        { midi: 63, onset: 5760, duration: 480, hand: 'rh' }, // Eb4
        // Bar 5 — Cm9 resolution | LH octave pop C | RH Cm9 whole-note hold
        { midi: 36, onset: 7680, duration: 480, hand: 'lh' },
        { midi: 48, onset: 8160, duration: 480, hand: 'lh' },
        { midi: 36, onset: 8640, duration: 480, hand: 'lh' },
        { midi: 48, onset: 9120, duration: 480, hand: 'lh' },
        { midi: 51, onset: 7680, duration: 1920, hand: 'rh' },
        { midi: 58, onset: 7680, duration: 1920, hand: 'rh' },
        { midi: 62, onset: 7680, duration: 1920, hand: 'rh' },
        // bar 6: final downbeat — LH C2 + RH Cm9
        { midi: 36, onset: 9600, duration: 120, hand: 'lh' },
        { midi: 51, onset: 9600, duration: 120, hand: 'rh' },
        { midi: 58, onset: 9600, duration: 120, hand: 'rh' },
        { midi: 62, onset: 9600, duration: 120, hand: 'rh' },
      ],
    },
  ],
};

// ===========================================================================
// L3 — "Deep Groove"
// Style ref: l3a (Headhunters/Tower of Power) or l3b (Prince 80s/Silk Sonic)
// Key: A minor (Dorian) | Tempo: 85-110 BPM | Variable swing
//
// VOICE LEADING DEFAULT: proximity algorithm — minimize total semitone movement.
// REGISTER RULE: All chord voicings within C3(48)-C5(72). Sweet spot E3(52)-G4(67).
// ===========================================================================

// ---------------------------------------------------------------------------
// L3 Section A — Melody (14 steps, steps 96-109)
// ---------------------------------------------------------------------------

const funkL3SectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    // ── A1: Blues Scale + Phrases, then Dorian ───────────────────────────
    {
      stepNumber: 47,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A1: Advanced Scales',
      activity: 'A1.1: A Minor Blues Scale (Out of Time)',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      direction:
        'The minor blues scale is just like a minor pentatonic, with one added note – the tritone (b5). This gives it that dark, gritty sound. Play it going up: A-C-D-Eb-E-G.',
      assessment: 'pitch_only',
      tag: 'funk:minor_blues_ascending_oot_l2 | funk',
      styleRef: 'l2a',
      successFeedback:
        'Blues scale in — that Eb is the note that gives funk its edge.',
      targetNotes: [
        { midi: 69, onset: 0, duration: 460 },
        { midi: 72, onset: 480, duration: 460 },
        { midi: 74, onset: 960, duration: 460 },
        { midi: 75, onset: 1440, duration: 460 },
        { midi: 76, onset: 1920, duration: 460 },
        { midi: 79, onset: 2400, duration: 460 },
        { midi: 81, onset: 2880, duration: 460 },
      ],
    },
    {
      stepNumber: 48,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A1: Advanced Scales',
      activity: 'A1.2: A Minor Blues Scale Descending (Out of Time)',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      direction:
        'Play the A minor blues scale going down. Listen for the blue note (Eb) on the way.',
      assessment: 'pitch_only',
      tag: 'funk:minor_blues_descending_oot_l2 | funk',
      styleRef: 'l2a',
      successFeedback: 'Down the blues scale — every note intentional.',
      targetNotes: [
        { midi: 81, onset: 0, duration: 460 },
        { midi: 79, onset: 480, duration: 460 },
        { midi: 76, onset: 960, duration: 460 },
        { midi: 75, onset: 1440, duration: 460 },
        { midi: 74, onset: 1920, duration: 460 },
        { midi: 72, onset: 2400, duration: 460 },
        { midi: 69, onset: 2880, duration: 460 },
      ],
    },
    {
      stepNumber: 49,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A1: Advanced Scales',
      activity: 'A1.3: A Minor Blues Scale — Up & Down (In Time)',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      direction:
        'In a steady tempo, play the A minor blues scale going up and then back down.',
      assessment: 'pitch_order_timing',
      tag: 'funk:minor_blues_up_down_it_l2 | funk',
      styleRef: 'l2a',
      successFeedback:
        'Blues scale up and down in time — that blue note groove is locked in.',
      targetNotes: [
        { midi: 57, onset: 0, duration: 480 }, // A3 — up
        { midi: 60, onset: 480, duration: 480 }, // C4
        { midi: 62, onset: 960, duration: 480 }, // D4
        { midi: 63, onset: 1440, duration: 480 }, // Eb4 — blue note
        { midi: 64, onset: 1920, duration: 480 }, // E4
        { midi: 67, onset: 2400, duration: 480 }, // G4
        { midi: 69, onset: 2880, duration: 480 }, // A4 — top
        { midi: 67, onset: 3360, duration: 480 }, // G4 — down
        { midi: 64, onset: 3840, duration: 480 }, // E4
        { midi: 63, onset: 4320, duration: 480 }, // Eb4 — blue note
        { midi: 62, onset: 4800, duration: 480 }, // D4
        { midi: 60, onset: 5280, duration: 480 }, // C4
        { midi: 57, onset: 5760, duration: 480 }, // A3
      ],
    },
    {
      stepNumber: 50,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A1: Advanced Scales',
      activity: 'A1.4: Blues Phrase — b5-5-b7 (Out of Time)',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      direction:
        'Play this blues phrase: Eb4→E4→G4 (b5→5→b7). The Eb is the blue note — it slides into the 5th and resolves up to the b7.',
      assessment: 'pitch_only',
      tag: 'funk:blues_phrase_b5_5_b7_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'Eb-E-G — blues tension and release in three notes.',
      targetNotes: [
        { midi: 63, onset: 0, duration: 480 }, // Eb4 — b5 (blue note)
        { midi: 64, onset: 480, duration: 480 }, // E4  — 5
        { midi: 67, onset: 960, duration: 960 }, // G4  — b7 resolve
      ],
    },
    {
      stepNumber: 51,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A1: Advanced Scales',
      activity: 'A1.5: Blues Phrase — b5-5-b7 (In Time)',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      direction: 'Play the Eb4→E4→G4 phrase in time.',
      assessment: 'pitch_order_timing',
      tag: 'funk:blues_phrase_b5_5_b7_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Blues phrase in the groove.',
      targetNotes: [
        { midi: 63, onset: 0, duration: 480 },
        { midi: 64, onset: 480, duration: 480 },
        { midi: 67, onset: 960, duration: 960 },
      ],
    },
    {
      stepNumber: 52,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A1: Advanced Scales',
      activity: 'A1.6: Blues Phrase — b5-4-b3-1 (Out of Time)',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      direction:
        'Play this descending blues phrase: Eb4→D4→C4→A3 (b5→4→b3→1). A classic blues lick — lands back on the root.',
      assessment: 'pitch_only',
      tag: 'funk:blues_phrase_descent_oot | funk',
      styleRef: 'l2a',
      successFeedback:
        'Descending blues lick — that Eb drop is the classic sound.',
      targetNotes: [
        { midi: 63, onset: 0, duration: 480 }, // Eb4 — b5
        { midi: 62, onset: 480, duration: 480 }, // D4  — 4
        { midi: 60, onset: 960, duration: 480 }, // C4  — b3
        { midi: 57, onset: 1440, duration: 960 }, // A3  — 1 (root)
      ],
    },
    {
      stepNumber: 53,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A1: Advanced Scales',
      activity: 'A1.7: Blues Phrase — b5-4-b3-1 (In Time)',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      direction: 'Play the Eb4→D4→C4→A3 phrase in time.',
      assessment: 'pitch_order_timing',
      tag: 'funk:blues_phrase_descent_it | funk',
      styleRef: 'l2a',
      successFeedback:
        'Descending blues lick locked in — classic funk vocabulary.',
      targetNotes: [
        { midi: 63, onset: 0, duration: 480 },
        { midi: 62, onset: 480, duration: 480 },
        { midi: 60, onset: 960, duration: 480 },
        { midi: 57, onset: 1440, duration: 960 },
      ],
    },
    // ── A1 continued: Dorian activities ──────────────────────────────────
    {
      stepNumber: 54,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A1: Advanced Scales',
      activity: 'A1.8: A Dorian Scale Ascending (Out of Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction:
        'Play the A Dorian scale going up. Notice the F♯ (♮6) — that note is what makes Dorian sound bright instead of dark.',
      assessment: 'pitch_only',
      tag: 'funk:dorian_full_nat6_oot | funk',
      styleRef: 'l2a',
      successFeedback:
        'A Dorian ascending — that F♯ is the Dorian fingerprint.',
      targetNotes: [
        { midi: 57, onset: 0, duration: 480 }, // A3
        { midi: 59, onset: 480, duration: 480 }, // B3
        { midi: 60, onset: 960, duration: 480 }, // C4
        { midi: 62, onset: 1440, duration: 480 }, // D4
        { midi: 64, onset: 1920, duration: 480 }, // E4
        { midi: 66, onset: 2400, duration: 480 }, // F#4 — ♮6
        { midi: 67, onset: 2880, duration: 480 }, // G4
        { midi: 69, onset: 3360, duration: 480 }, // A4
      ],
    },
    {
      stepNumber: 49,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A1: Advanced Scales',
      activity: 'A1.9: A Dorian Scale Descending (Out of Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction: 'Play the A Dorian scale going down.',
      assessment: 'pitch_only',
      tag: 'funk:dorian_descending_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'Dorian descending — every note deliberate.',
      targetNotes: [
        { midi: 69, onset: 0, duration: 480 }, // A4
        { midi: 67, onset: 480, duration: 480 }, // G4
        { midi: 66, onset: 960, duration: 480 }, // F#4 — ♮6
        { midi: 64, onset: 1440, duration: 480 }, // E4
        { midi: 62, onset: 1920, duration: 480 }, // D4
        { midi: 60, onset: 2400, duration: 480 }, // C4
        { midi: 59, onset: 2880, duration: 480 }, // B3
        { midi: 57, onset: 3360, duration: 480 }, // A3
      ],
    },
    {
      stepNumber: 50,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A1: Advanced Scales',
      activity: 'A1.10: A Dorian Scale — Up & Down (In Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction:
        'In a steady tempo, play the A Dorian scale going up and then back down.',
      assessment: 'pitch_order_timing',
      tag: 'funk:dorian_up_down_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Dorian up and down in time — that mode is yours.',
      targetNotes: [
        { midi: 57, onset: 0, duration: 480 }, // A3 — up
        { midi: 59, onset: 480, duration: 480 }, // B3
        { midi: 60, onset: 960, duration: 480 }, // C4
        { midi: 62, onset: 1440, duration: 480 }, // D4
        { midi: 64, onset: 1920, duration: 480 }, // E4
        { midi: 66, onset: 2400, duration: 480 }, // F#4 — ♮6
        { midi: 67, onset: 2880, duration: 480 }, // G4
        { midi: 69, onset: 3360, duration: 480 }, // A4 — top
        { midi: 67, onset: 3840, duration: 480 }, // G4 — down
        { midi: 66, onset: 4320, duration: 480 }, // F#4
        { midi: 64, onset: 4800, duration: 480 }, // E4
        { midi: 62, onset: 5280, duration: 480 }, // D4
        { midi: 60, onset: 5760, duration: 480 }, // C4
        { midi: 59, onset: 6240, duration: 480 }, // B3
        { midi: 57, onset: 6720, duration: 480 }, // A3
      ],
    },
    {
      stepNumber: 51,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A1: Advanced Scales',
      activity: 'A1.12: 4-Note Melodic Phrase in A Dorian (Out of Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction:
        'Play the descending phrase: G4→F♯4→E4→D4 (b7→♮6→5→4). The F♯ is the Dorian character note — this four-note phrase is a staple of funk melody.',
      assessment: 'pitch_only',
      tag: 'funk:dorian_nat6_ornament_oot | funk',
      styleRef: 'l2a',
      successFeedback:
        'The Dorian melodic phrase — G to F# is the moment the mode reveals itself.',
      contentGeneration:
        'GCM v8: FUNK L2 Dorian nat.6 melodic phrase. Phrase: b7-nat6-5-4 descending (G4=67, F#4=66, E4=64, D4=62). Scale: dorian [0,2,3,5,7,9,10]. Key: A minor. Register: C4-C5.',
      targetNotes: [
        { midi: 67, onset: 0, duration: 460 }, // G4 — b7
        { midi: 66, onset: 480, duration: 460 }, // F#4 — nat6 (character note)
        { midi: 64, onset: 960, duration: 460 }, // E4 — 5
        { midi: 62, onset: 1440, duration: 460 }, // D4 — 4
      ],
    },
    {
      stepNumber: 51,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A1: Advanced Scales',
      activity: 'A1.13: 4-Note Melodic Phrase in A Dorian (In Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction: 'Play the G→F♯→E→D melodic phrase in time.',
      assessment: 'pitch_order_timing',
      tag: 'funk:dorian_nat6_ornament_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Dorian melodic phrase in the groove — automatic now.',
      contentGeneration:
        'GCM v8: FUNK L2 Dorian nat.6 melodic phrase IT. Same phrase. Tempo: 85-110 BPM.',
      targetNotes: [
        { midi: 67, onset: 0, duration: 460 },
        { midi: 66, onset: 480, duration: 460 },
        { midi: 64, onset: 960, duration: 460 },
        { midi: 62, onset: 1440, duration: 460 },
      ],
    },
    {
      stepNumber: 52,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A1: Advanced Scales',
      activity: 'A1.14: 4-Note Melodic Phrase in A Minor Blues (Out of Time)',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      direction:
        'Play D4→Eb4→E4 — the blue note (Eb) as a chromatic passing tone between the 4th and 5th. Then resolve to A4. The b5 adds grit.',
      assessment: 'pitch_only',
      tag: 'funk:blue_note_chromatic_oot | funk',
      styleRef: 'l2a',
      successFeedback:
        'The blue note as chromatic color — D to Eb to E, pure funk tension.',
      contentGeneration:
        'GCM v8: FUNK L2 blue note exercise. Phrase: 4-b5-5-root (D4=62, Eb4=63, E4=64, A4=69). Blue note Eb4 (MIDI 63) as approach/passing note. Scale: minor_blues [0,3,5,6,7,10]. Key: A minor.',
      targetNotes: [
        { midi: 62, onset: 0, duration: 460 }, // D4 — 4th
        { midi: 63, onset: 480, duration: 240 }, // Eb4 — blue note (short, passing)
        { midi: 64, onset: 720, duration: 460 }, // E4 — 5th (resolves)
        { midi: 69, onset: 1440, duration: 960 }, // A4 — root (long hold)
      ],
    },
    {
      stepNumber: 52,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A1: Advanced Scales',
      activity: 'A1.15: 4-Note Melodic Phrase in A Minor Blues (In Time)',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      direction: 'Play the D4→Eb4→E4→A4 minor blues phrase in time.',
      assessment: 'pitch_order_timing',
      tag: 'funk:blue_note_chromatic_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Minor blues phrase in the pocket — gritty and in time.',
      contentGeneration:
        'GCM v8: FUNK L2 blue note exercise IT. Same phrase. Tempo: 85-110 BPM.',
      targetNotes: [
        { midi: 62, onset: 0, duration: 460 }, // D4 — 4th
        { midi: 63, onset: 480, duration: 240 }, // Eb4 — blue note (short, passing)
        { midi: 64, onset: 720, duration: 460 }, // E4 — 5th (resolves)
        { midi: 69, onset: 1440, duration: 960 }, // A4 — root (long hold)
      ],
    },

    // ── A2: Melodic Phrases (6 steps) ────────────────────────────────────
    {
      stepNumber: 53,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity:
        'A2.1: 8-Bar Melody in A Dorian — ABAB Phrase Structure (Out of Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction:
        'Learn the 8-bar ABAB phrase structure. Phrase A (bars 1-2): A4-G4-F#4-E4. Phrase B (bars 3-4): C4-D4-C4-A3. Repeat both phrases for bars 5-8.',
      assessment: 'pitch_only',
      tag: 'funk:phrase_motivic_8bar_oot | funk',
      styleRef: 'l2a',
      successFeedback:
        'The 8-bar ABAB structure — call and answer, repeated. This is how funk melodies are built.',
      contentGeneration:
        'GCM v8: FUNK L2 melody phrase → ABAB 8-bar. Phrase A: A4-G4-F#4-E4 (half notes, bars 1-2). Phrase B: C4-D4-C4-A3 (half notes, bars 3-4). Repeat ABAB for bars 5-8. Scale: dorian [0,2,3,5,7,9,10]. Key: A minor.',
      targetNotes: [
        // Phrase A (bars 1-2)
        { midi: 69, onset: 0, duration: 960 }, // A4
        { midi: 67, onset: 960, duration: 960 }, // G4
        { midi: 66, onset: 1920, duration: 960 }, // F#4
        { midi: 64, onset: 2880, duration: 960 }, // E4
        // Phrase B (bars 3-4)
        { midi: 60, onset: 3840, duration: 960 }, // C4
        { midi: 62, onset: 4800, duration: 960 }, // D4
        { midi: 60, onset: 5760, duration: 960 }, // C4
        { midi: 57, onset: 6720, duration: 960 }, // A3
        // Phrase A repeat (bars 5-6)
        { midi: 69, onset: 7680, duration: 960 }, // A4
        { midi: 67, onset: 8640, duration: 960 }, // G4
        { midi: 66, onset: 9600, duration: 960 }, // F#4
        { midi: 64, onset: 10560, duration: 960 }, // E4
        // Phrase B repeat (bars 7-8)
        { midi: 60, onset: 11520, duration: 960 }, // C4
        { midi: 62, onset: 12480, duration: 960 }, // D4
        { midi: 60, onset: 13440, duration: 960 }, // C4
        { midi: 57, onset: 14400, duration: 960 }, // A3
      ],
    },
    {
      stepNumber: 54,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity:
        'A2.2: 8-Bar Melody in A Dorian — ABAB Phrase Structure (In Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction: 'Play the 8-bar ABAB melody in time.',
      assessment: 'pitch_order_timing',
      tag: 'funk:phrase_motivic_8bar_it | funk',
      styleRef: 'l2a',
      successFeedback: '8 bars of ABAB funk melody in the pocket.',
      contentGeneration:
        'GCM v8: FUNK L2 melody phrase → ABAB 8-bar IT. Same structure. Tempo: 85-110 BPM.',
      targetNotes: [
        // Phrase A (bars 1-2)
        { midi: 69, onset: 0, duration: 960 }, // A4
        { midi: 67, onset: 960, duration: 960 }, // G4
        { midi: 66, onset: 1920, duration: 960 }, // F#4
        { midi: 64, onset: 2880, duration: 960 }, // E4
        // Phrase B (bars 3-4)
        { midi: 60, onset: 3840, duration: 960 }, // C4
        { midi: 62, onset: 4800, duration: 960 }, // D4
        { midi: 60, onset: 5760, duration: 960 }, // C4
        { midi: 57, onset: 6720, duration: 960 }, // A3
        // Phrase A repeat (bars 5-6)
        { midi: 69, onset: 7680, duration: 960 }, // A4
        { midi: 67, onset: 8640, duration: 960 }, // G4
        { midi: 66, onset: 9600, duration: 960 }, // F#4
        { midi: 64, onset: 10560, duration: 960 }, // E4
        // Phrase B repeat (bars 7-8)
        { midi: 60, onset: 11520, duration: 960 }, // C4
        { midi: 62, onset: 12480, duration: 960 }, // D4
        { midi: 60, onset: 13440, duration: 960 }, // C4
        { midi: 57, onset: 14400, duration: 960 }, // A3
      ],
    },
    {
      stepNumber: 55,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.3: 5-Note Phrase in A Dorian (Out of Time)',
      scaleId: 'dorian',
      direction:
        'Four quick notes descend, then one long held note resolves everything. The silence after the hold is part of the phrase.',
      assessment: 'pitch_only',
      tag: 'funk:phrase_final_answer_oot | funk',
      styleRef: 'l2a',
      successFeedback:
        'Dense run to long hold — that is the phrase shape that makes listeners lean in.',
      targetNotes: [
        { midi: 72, onset: 0, duration: 120 }, // C5
        { midi: 71, onset: 120, duration: 120 }, // B4
        { midi: 69, onset: 240, duration: 120 }, // A4
        { midi: 66, onset: 360, duration: 120 }, // F#4 (nat.6 — Dorian)
        { midi: 64, onset: 480, duration: 1440 }, // E4 long resolve
      ],
    },
    {
      stepNumber: 56,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.4: 5-Note Phrase in A Dorian (In Time)',
      scaleId: 'dorian',
      direction:
        'Play the 5-note phrase in time. Feel the tension build to the resolution.',
      assessment: 'pitch_order_timing',
      tag: 'funk:phrase_final_answer_it | funk',
      styleRef: 'l2a',
      successFeedback:
        'The phrase in the pocket — maximum tension, perfect resolution.',
      targetNotes: [
        { midi: 72, onset: 0, duration: 120 },
        { midi: 71, onset: 120, duration: 120 },
        { midi: 69, onset: 240, duration: 120 },
        { midi: 66, onset: 360, duration: 120 },
        { midi: 64, onset: 480, duration: 1440 },
      ],
    },
    {
      stepNumber: 57,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.5: 9-Note Phrase in A Dorian (Out of Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction:
        'Eight sixteenth notes followed by a half-note resolution. E3→F#3→A3→B3→C4→A3→B3→F#3→A3.',
      assessment: 'pitch_only',
      tag: 'funk:phrase_9note_dorian_oot | funk',
      styleRef: 'l2a',
      successFeedback: '9-note Dorian run — the phrase that opens up the neck.',
      contentGeneration:
        'GCM v8: FUNK L2 9-note Dorian phrase. Notes: E3(52)-F#3(54)-A3(57)-B3(59)-C4(60)-A3(57)-B3(59)-F#3(54)-A3(57 half). All sixteenth notes except last (half). Scale: dorian. Key: A minor.',
      targetNotes: [
        { midi: 52, onset: 0, duration: 120 }, // E3
        { midi: 54, onset: 120, duration: 120 }, // F#3
        { midi: 57, onset: 240, duration: 120 }, // A3
        { midi: 59, onset: 360, duration: 120 }, // B3
        { midi: 60, onset: 480, duration: 120 }, // C4
        { midi: 57, onset: 600, duration: 120 }, // A3
        { midi: 59, onset: 720, duration: 120 }, // B3
        { midi: 54, onset: 840, duration: 120 }, // F#3
        { midi: 57, onset: 960, duration: 960 }, // A3 — half note
      ],
    },
    {
      stepNumber: 57,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.6: 9-Note Phrase in A Dorian (In Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction:
        'Play the 9-note Dorian phrase in time. Eight sixteenths then land on the half note.',
      assessment: 'pitch_order_timing',
      tag: 'funk:phrase_9note_dorian_it | funk',
      styleRef: 'l2a',
      successFeedback: '9-note phrase in the pocket.',
      targetNotes: [
        { midi: 52, onset: 0, duration: 120 }, // E3
        { midi: 54, onset: 120, duration: 120 }, // F#3
        { midi: 57, onset: 240, duration: 120 }, // A3
        { midi: 59, onset: 360, duration: 120 }, // B3
        { midi: 60, onset: 480, duration: 120 }, // C4
        { midi: 57, onset: 600, duration: 120 }, // A3
        { midi: 59, onset: 720, duration: 120 }, // B3
        { midi: 54, onset: 840, duration: 120 }, // F#3
        { midi: 57, onset: 960, duration: 960 }, // A3 — half note
      ],
    },
    {
      stepNumber: 58,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.7: 7-Note Phrase in A Minor Blues (Out of Time)',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      direction:
        'Play D#4→E4→G4→D#4→D4→C4→A3. The blue note (D#/Eb) adds grit — use it as a passing tone.',
      assessment: 'pitch_only',
      tag: 'funk:phrase_7note_blues_oot | funk',
      styleRef: 'l2a',
      successFeedback: '7-note blues phrase — dark and greasy.',
      contentGeneration:
        'GCM v8: FUNK L2 7-note minor blues phrase. Notes: D#4(63)-E4(64)-G4(67)-D#4(63)-D4(62)-C4(60)-A3(57). Scale: minor_blues [0,3,5,6,7,10]. Key: A minor.',
      targetNotes: [
        { midi: 63, onset: 0, duration: 480 }, // D#4
        { midi: 64, onset: 480, duration: 480 }, // E4
        { midi: 67, onset: 960, duration: 480 }, // G4
        { midi: 63, onset: 1440, duration: 480 }, // D#4
        { midi: 62, onset: 1920, duration: 480 }, // D4
        { midi: 60, onset: 2400, duration: 480 }, // C4
        { midi: 57, onset: 2880, duration: 960 }, // A3 — half note
      ],
    },
    {
      stepNumber: 58,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.8: 7-Note Phrase in A Minor Blues (In Time)',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      direction: 'Play the 7-note minor blues phrase in time.',
      assessment: 'pitch_order_timing',
      tag: 'funk:phrase_7note_blues_it | funk',
      styleRef: 'l2a',
      successFeedback: '7-note blues phrase in the pocket.',
      targetNotes: [
        { midi: 63, onset: 0, duration: 480 }, // D#4
        { midi: 64, onset: 480, duration: 480 }, // E4
        { midi: 67, onset: 960, duration: 480 }, // G4
        { midi: 63, onset: 1440, duration: 480 }, // D#4
        { midi: 62, onset: 1920, duration: 480 }, // D4
        { midi: 60, onset: 2400, duration: 480 }, // C4
        { midi: 57, onset: 2880, duration: 960 }, // A3 — half note
      ],
    },

    // ── A3: Melody Play-Along (2 steps) ──────────────────────────────────
    {
      stepNumber: 59,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A3: Melody Play-Along',
      activity: 'A3.1: Melody over Amin9 Funk Backing (In Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction:
        'Play the melody over a full A minor funk groove. Drums, bass, and chords are provided — you bring the melody.',
      assessment: 'pitch_order_timing',
      tag: 'funk:melody_playalong_l3 | funk',
      styleRef: 'l2a',
      successFeedback: 'Melody over a deep groove — L2 funk mastery.',
      contentGeneration:
        'GCM v8: FUNK L2 melody play-along. Backing: drums + bass + chords (Am9). Progression: Amin9. Tempo: 85-110 BPM. Style: l2a.',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 60, onset: 0, duration: 120 }, // C4
        { midi: 57, onset: 240, duration: 120 }, // A3
        { midi: 59, onset: 480, duration: 120 }, // B3
        { midi: 54, onset: 720, duration: 120 }, // F#3
        { midi: 57, onset: 960, duration: 360 }, // A3 — dotted 8th
        { midi: 59, onset: 1320, duration: 120 }, // B3 — 16th
        { midi: 57, onset: 1920, duration: 480 }, // A3 — final downbeat
      ],
    },
    {
      stepNumber: 60,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A3: Melody Play-Along',
      activity:
        'A3.2: Dual Functionality — Blues Melody over Chord Progression (In Time)',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      direction:
        'The same A minor blues melody floats over Amin9 (bar 1) then Ddom13 (bar 2). You stay in the parent scale — the chords move under you.',
      assessment: 'pitch_order_timing',
      tag: 'funk:dual_functionality_blues_it | funk',
      styleRef: 'l2a',
      successFeedback:
        'One blues melody, two different chords — that is dual functionality.',
      contentGeneration:
        'GCM v8: FUNK L2 dual functionality play-along. Backing: new funk drum beat + EP stabs. Bar 1: Amin9 stab (C4-G4-B4 = b3-b7-9). Bar 2: Ddom13 stab (C4-F#4-B4 = b7-3-13). Progression: Am9→Ddom13. Scale: minor_blues [0,3,5,6,7,10]. Key: A minor. Register: C4-C5. Tempo: 85-110 BPM. Style: l2a.',
      chordSymbols: ['Am9', 'Ddom13'],
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 62, onset: 0, duration: 120 }, // D4
        // 16th rest (120-240)
        { midi: 63, onset: 240, duration: 120 }, // D#4
        // 16th rest (360-480)
        { midi: 64, onset: 480, duration: 120 }, // E4
        // 16th rest (600-720)
        { midi: 67, onset: 720, duration: 120 }, // G4
        // 16th rest (840-960)
        { midi: 69, onset: 960, duration: 120 }, // A4
        // 16th rest (1080-1200)
        { midi: 72, onset: 1200, duration: 120 }, // C5
        // 16th rest (1320-1440)
        { midi: 74, onset: 1440, duration: 120 }, // D5
        // 16th rest (1560-1680)
        { midi: 75, onset: 1680, duration: 120 }, // Eb5
        { midi: 74, onset: 1800, duration: 360 }, // D5 — dotted quarter
        { midi: 72, onset: 2160, duration: 120 }, // C5
        // 8th rest + 3 quarter rests (silence to bar 3)
        { midi: 69, onset: 3840, duration: 480 }, // A4 — final downbeat
      ],
    },
    {
      stepNumber: 60,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A3: Melody Play-Along',
      activity: 'A3.3: Melody Play-Along — New Key + New Style (In Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction:
        'New key, new style sub-profile. Your Dorian melody skills in any key, any L2 arrangement.',
      assessment: 'pitch_order_timing',
      tag: 'funk:melody_playalong_newkey_l3 | funk',
      styleRef: 'l2b',
      successFeedback:
        'New key, new style, same mastery. Your funk melody vocabulary is complete.',
      contentGeneration:
        'GCM v8: FUNK L2 melody play-along — transposed key + l2b style. key_center: runtime (exclude A minor). Scale: dorian in new key. Backing: l2b arrangement (Prince/Silk Sonic — Slap Bass, Synth Lead, Synth Brass). Tempo: 85-110 BPM. Style: l2b.',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 69, onset: 0, duration: 480 }, // A4  beat1
        { midi: 66, onset: 480, duration: 480 }, // F#4 beat2
        { midi: 64, onset: 960, duration: 480 }, // E4  beat3
        { midi: 66, onset: 1440, duration: 480 }, // F#4 beat4
        { midi: 69, onset: 1920, duration: 1920 }, // A4  bar2 whole
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// L3 Section B — Chords (20 steps, steps 110-129)
// REGISTER RULE: All chord voicings within C3(48)-C5(72). Sweet spot E3(52)-G4(67).
// Never go above C5(72) on any voice.
// ---------------------------------------------------------------------------

const funkL3SectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    // ── B1: Amin9 Arpeggios + Voicings (6 steps) ─────────────────────────
    {
      stepNumber: 61,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B1: Amin9 Arpeggios + Voicings',
      activity: 'B1.1: Am9 Arpeggio (Out of Time)',
      direction:
        'Play Am9 chord tones one at a time: A-C-E-G-B. Five notes — root, b3, 5, b7, 9.',
      assessment: 'pitch_only',
      tag: 'funk:arpeggiate_am9_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'Am9 — five chord tones, the lush minor 9th sound.',
      targetNotes: [
        { midi: 57, onset: 0, duration: 460 }, // A3
        { midi: 60, onset: 480, duration: 460 }, // C4
        { midi: 64, onset: 960, duration: 460 }, // E4
        { midi: 67, onset: 1440, duration: 460 }, // G4
        { midi: 71, onset: 1920, duration: 460 }, // B4
      ],
    },
    {
      stepNumber: 62,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B1: Amin9 Arpeggios + Voicings',
      activity: 'B1.2: Am9 Arpeggio Up and Down (In Time)',
      direction:
        'Play the Am9 arpeggio up and back down: A-C-E-G-B-G-E-C-A. Nine notes in time — feel the full chord going up, then coming back home.',
      assessment: 'pitch_order_timing',
      tag: 'funk:arpeggiate_am9_ud_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Am9 up and down — the chord under your fingers.',
      contentGeneration:
        'Backing: cool funk beat with 16th-note hi-hat + electric bass on Am9. Tempo: 85-100 BPM.',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        { midi: 57, onset: 0, duration: 460 }, // A3
        { midi: 60, onset: 480, duration: 460 }, // C4
        { midi: 64, onset: 960, duration: 460 }, // E4
        { midi: 67, onset: 1440, duration: 460 }, // G4
        { midi: 71, onset: 1920, duration: 460 }, // B4
        { midi: 67, onset: 2400, duration: 460 }, // G4
        { midi: 64, onset: 2880, duration: 460 }, // E4
        { midi: 60, onset: 3360, duration: 460 }, // C4
        { midi: 57, onset: 3840, duration: 460 }, // A3
      ],
    },
    {
      stepNumber: 63,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B1: Amin9 Arpeggios + Voicings',
      activity: 'B1.3: Am9 3-7-9 Voicing — C-G-B (Out of Time)',
      direction:
        'Play Am9 as a three-note upper voicing: C4-G4-B4. You are playing the b3, b7, and 9 — no root, no 5th. Pure color.',
      assessment: 'pitch_only',
      tag: 'funk:am9_379_voicing_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'Am9 b3-b7-9 — three notes, all the feeling.',
      targetNotes: [
        { midi: 60, onset: 0, duration: 1920 }, // C4 — b3
        { midi: 67, onset: 0, duration: 1920 }, // G4 — b7
        { midi: 71, onset: 0, duration: 1920 }, // B4 — 9
      ],
    },
    {
      stepNumber: 64,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B1: Amin9 Arpeggios + Voicings',
      activity: 'B1.4: Am9 3-7-9 Voicing (In Time)',
      direction:
        'Play Am9 (C4-G4-B4) in time. Dotted quarter on beat 1, then a quick 16th note stab after the rest.',
      assessment: 'pitch_order_timing',
      tag: 'funk:am9_379_voicing_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Am9 stab in the pocket.',
      contentGeneration:
        'Backing: cool funk beat with 16th-note hi-hat + electric bass on Am9. Tempo: 85-100 BPM.',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        // Dotted quarter [0, 720], 16th rest, 16th note [840, 120]
        { midi: 60, onset: 0, duration: 720 }, // C4
        { midi: 67, onset: 0, duration: 720 }, // G4
        { midi: 71, onset: 0, duration: 720 }, // B4
        { midi: 60, onset: 840, duration: 120 }, // C4
        { midi: 67, onset: 840, duration: 120 }, // G4
        { midi: 71, onset: 840, duration: 120 }, // B4
      ],
    },
    {
      stepNumber: 65,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B1: Amin9 Arpeggios + Voicings',
      activity: 'B1.5: Am9 → Ddom13 Voice Leading (Out of Time)',
      direction:
        'Play Am9 (C4-G4-B4), then Ddom13 (C4-F#4-B4). Only the middle note moves — G drops to F#. That is the Drop the Sizzle: one voice slips down a half step as the chord changes.',
      assessment: 'pitch_only',
      tag: 'funk:am9_ddom13_voicelead_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'Am9 → Ddom13 — one note moves, everything changes.',
      chordSymbols: ['Am9', 'Ddom13'],
      targetNotes: [
        // Am9: C4-G4-B4
        { midi: 60, onset: 0, duration: 960 }, // C4
        { midi: 67, onset: 0, duration: 960 }, // G4 — moves to F#4
        { midi: 71, onset: 0, duration: 960 }, // B4
        // Ddom13: C4-F#4-B4
        { midi: 60, onset: 960, duration: 960 }, // C4 — common tone
        { midi: 66, onset: 960, duration: 960 }, // F#4 — G drops to F#
        { midi: 71, onset: 960, duration: 960 }, // B4 — common tone
      ],
    },
    {
      stepNumber: 66,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B1: Amin9 Arpeggios + Voicings',
      activity: 'B1.6: Am9 → Ddom13 Voice Leading (In Time)',
      direction:
        'Two bars: Am9 then Ddom13, each with the dotted-quarter + 16th stab pattern. Bar 3 lands back on Am9.',
      assessment: 'pitch_order_timing',
      tag: 'funk:am9_ddom13_voicelead_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Am9 to Ddom13 in time — the Drop the Sizzle groove.',
      contentGeneration:
        'Backing: cool funk beat with 16th-note hi-hat + electric bass on Am9→Ddom13. Tempo: 85-100 BPM.',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      chordSymbols: ['Am9', 'Ddom13'],
      targetNotes: [
        // Bar 1 — Am9: dotted quarter [0,720], 16th rest, 16th [840,120]
        { midi: 60, onset: 0, duration: 720 }, // C4
        { midi: 67, onset: 0, duration: 720 }, // G4
        { midi: 71, onset: 0, duration: 720 }, // B4
        { midi: 60, onset: 840, duration: 120 }, // C4
        { midi: 67, onset: 840, duration: 120 }, // G4
        { midi: 71, onset: 840, duration: 120 }, // B4
        // Bar 2 — Ddom13: dotted quarter [1920,720], 16th rest, 16th [2640,120]
        { midi: 60, onset: 1920, duration: 720 }, // C4
        { midi: 66, onset: 1920, duration: 720 }, // F#4
        { midi: 71, onset: 1920, duration: 720 }, // B4
        { midi: 60, onset: 2640, duration: 120 }, // C4
        { midi: 66, onset: 2640, duration: 120 }, // F#4
        { midi: 71, onset: 2640, duration: 120 }, // B4
        // Bar 3 final downbeat — Am9 quarter note
        { midi: 60, onset: 3840, duration: 480 }, // C4
        { midi: 67, onset: 3840, duration: 480 }, // G4
        { midi: 71, onset: 3840, duration: 480 }, // B4
      ],
    },

    // ── B2: Funk9 Voicings (5 steps) ─────────────────────────────────────
    // A funk9 = b7-9-5 from A: G3(55)-B3(59)-E4(64)
    // Ab funk9 (approach, -1 semitone): F#3(54)-Bb3(58)-Eb4(63)
    {
      stepNumber: 67,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B2: Funk9 Voicings',
      activity: 'B2.1: A Funk9 Voicing — G-B-E (Out of Time)',
      direction:
        'Play the A funk9 voicing: G3-B3-E4. You are playing the b7, 9, and 5 — no root, no 3rd. Open, floating, funky.',
      assessment: 'pitch_only',
      tag: 'funk:a_funk9_oot | funk',
      styleRef: 'l2a',
      successFeedback:
        'A funk9 — three notes that say everything without saying the root.',
      targetNotes: [
        { midi: 55, onset: 0, duration: 1920 }, // G3 — b7
        { midi: 59, onset: 0, duration: 1920 }, // B3 — 9
        { midi: 64, onset: 0, duration: 1920 }, // E4 — 5
      ],
    },
    {
      stepNumber: 68,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B2: Funk9 Voicings',
      activity: 'B2.2: A Funk9 Voicing (In Time)',
      direction:
        'Play A funk9 (G3-B3-E4) in time. Four stabs per bar: 16th on beat 1, 16th on the a-of-1, 16th on beat 3, 16th on the e-of-4.',
      assessment: 'pitch_order_timing',
      tag: 'funk:a_funk9_it | funk',
      styleRef: 'l2a',
      successFeedback: 'A funk9 stabs locked to the grid.',
      contentGeneration:
        'Backing: cool funk beat with 16th-note hi-hat + electric bass on A funk9. Tempo: 85-100 BPM.',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        // Rhythm: [0, 360, 960, 1320] — stab, rest×2, stab, rest×4, stab, rest×2, stab
        { midi: 55, onset: 0, duration: 120 },
        { midi: 59, onset: 0, duration: 120 },
        { midi: 64, onset: 0, duration: 120 },
        { midi: 55, onset: 360, duration: 120 },
        { midi: 59, onset: 360, duration: 120 },
        { midi: 64, onset: 360, duration: 120 },
        { midi: 55, onset: 960, duration: 120 },
        { midi: 59, onset: 960, duration: 120 },
        { midi: 64, onset: 960, duration: 120 },
        { midi: 55, onset: 1320, duration: 120 },
        { midi: 59, onset: 1320, duration: 120 },
        { midi: 64, onset: 1320, duration: 120 },
      ],
    },
    {
      stepNumber: 69,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B2: Funk9 Voicings',
      activity: 'B2.3: Funk9 Chromatic Approach — Ab→A→Ab→A (Out of Time)',
      direction:
        'Play A funk9 (G-B-E), then slide down to Ab funk9 (F#-Bb-Eb), then back to A funk9. The approach chord is one semitone below — every voice moves together.',
      assessment: 'pitch_only',
      tag: 'funk:funk9_chromatic_approach_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'Funk9 chromatic approach — the slip into the chord.',
      targetNotes: [
        // A funk9
        { midi: 55, onset: 0, duration: 460 },
        { midi: 59, onset: 0, duration: 460 },
        { midi: 64, onset: 0, duration: 460 },
        // Ab funk9
        { midi: 54, onset: 480, duration: 460 },
        { midi: 58, onset: 480, duration: 460 },
        { midi: 63, onset: 480, duration: 460 },
        // A funk9
        { midi: 55, onset: 960, duration: 460 },
        { midi: 59, onset: 960, duration: 460 },
        { midi: 64, onset: 960, duration: 460 },
      ],
    },
    {
      stepNumber: 70,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B2: Funk9 Voicings',
      activity: 'B2.4: Funk9 Chromatic Approach (In Time)',
      direction:
        'Bar 1: A funk9 stabs on beat 1 and a-of-1, then Ab funk9 eighth into A funk9 eighth. Bar 2: land on A funk9.',
      assessment: 'pitch_order_timing',
      tag: 'funk:funk9_chromatic_approach_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Chromatic approach into A funk9 — slippery and locked.',
      contentGeneration:
        'Backing: cool funk beat with 16th-note hi-hat + electric bass on A funk9. Tempo: 85-100 BPM.',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        // Bar 1: A [0,120], A [360,120], Ab [720,240], A [960,240], dotted-quarter rest
        { midi: 55, onset: 0, duration: 120 },
        { midi: 59, onset: 0, duration: 120 },
        { midi: 64, onset: 0, duration: 120 },
        { midi: 55, onset: 360, duration: 120 },
        { midi: 59, onset: 360, duration: 120 },
        { midi: 64, onset: 360, duration: 120 },
        { midi: 54, onset: 720, duration: 240 }, // Ab funk9
        { midi: 58, onset: 720, duration: 240 },
        { midi: 63, onset: 720, duration: 240 },
        { midi: 55, onset: 960, duration: 240 }, // A funk9
        { midi: 59, onset: 960, duration: 240 },
        { midi: 64, onset: 960, duration: 240 },
        // Bar 2 final downbeat — A funk9 quarter
        { midi: 55, onset: 1920, duration: 480 },
        { midi: 59, onset: 1920, duration: 480 },
        { midi: 64, onset: 1920, duration: 480 },
      ],
    },
    {
      stepNumber: 71,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B2: Funk9 Voicings',
      activity: 'B2.5: Funk9 Chromatic Approach — New Rhythm (In Time)',
      direction:
        'Bar 1: Ab funk9 16th, A funk9 16th, rest, A funk9 16th, rest, Ab funk9 eighth, A funk9 eighth, rest. Bar 2: final 2-note squeeze Ab→A.',
      assessment: 'pitch_order_timing',
      tag: 'funk:funk9_chromatic_approach_new_it | funk',
      styleRef: 'l2a',
      successFeedback:
        'The approach pattern shifting under the grid — advanced funk timing.',
      contentGeneration:
        'Backing: cool funk beat with 16th-note hi-hat + electric bass on A funk9. Tempo: 85-100 BPM.',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      targetNotes: [
        // Bar 1: Ab[0,120] A[120,120] rest A[360,120] rest Ab[720,240] A[960,240] dotted-quarter rest
        { midi: 54, onset: 0, duration: 120 }, // Ab funk9
        { midi: 58, onset: 0, duration: 120 },
        { midi: 63, onset: 0, duration: 120 },
        { midi: 55, onset: 120, duration: 120 }, // A funk9
        { midi: 59, onset: 120, duration: 120 },
        { midi: 64, onset: 120, duration: 120 },
        { midi: 55, onset: 360, duration: 120 }, // A funk9
        { midi: 59, onset: 360, duration: 120 },
        { midi: 64, onset: 360, duration: 120 },
        { midi: 54, onset: 720, duration: 240 }, // Ab funk9
        { midi: 58, onset: 720, duration: 240 },
        { midi: 63, onset: 720, duration: 240 },
        { midi: 55, onset: 960, duration: 240 }, // A funk9
        { midi: 59, onset: 960, duration: 240 },
        { midi: 64, onset: 960, duration: 240 },
        // Bar 2 final downbeat: Ab[1920,120] A[2040,120]
        { midi: 54, onset: 1920, duration: 120 }, // Ab funk9
        { midi: 58, onset: 1920, duration: 120 },
        { midi: 63, onset: 1920, duration: 120 },
        { midi: 55, onset: 2040, duration: 120 }, // A funk9
        { midi: 59, onset: 2040, duration: 120 },
        { midi: 64, onset: 2040, duration: 120 },
      ],
    },

    // ── B3: Funk9 Progressions (4 steps) ─────────────────────────────────
    // D funk9 = b7-9-5 from D: C4(60)-E4(64)-A4(69)
    // Db funk9 (approach, -1 semitone): B3(59)-Eb4(63)-Ab4(68)
    {
      stepNumber: 72,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B3: Funk9 Progressions',
      activity: 'B3.1: A Funk9 → D Funk9 (Out of Time)',
      direction:
        'Play A funk9 (G3-B3-E4), then D funk9 (C4-E4-A4). Two chords, one half step apart in feel — A minor into D dominant.',
      assessment: 'pitch_only',
      tag: 'funk:a_d_funk9_progression_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'A→D funk9 — the minor-to-dominant movement.',
      chordSymbols: ['Afunk9', 'Dfunk9'],
      targetNotes: [
        // A funk9: G3-B3-E4
        { midi: 55, onset: 0, duration: 960 },
        { midi: 59, onset: 0, duration: 960 },
        { midi: 64, onset: 0, duration: 960 },
        // D funk9: C4-E4-A4
        { midi: 60, onset: 960, duration: 960 },
        { midi: 64, onset: 960, duration: 960 },
        { midi: 69, onset: 960, duration: 960 },
      ],
    },
    {
      stepNumber: 73,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B3: Funk9 Progressions',
      activity: 'B3.2: A Funk9 → D Funk9 (In Time)',
      direction:
        'Two bars: A funk9 stabs on beat 1 and a-of-1, then D funk9 same pattern. Land on A funk9 at bar 3.',
      assessment: 'pitch_order_timing',
      tag: 'funk:a_d_funk9_progression_it | funk',
      styleRef: 'l2a',
      successFeedback: 'A→D funk9 in the groove.',
      contentGeneration:
        'Backing: cool funk beat with 16th-note hi-hat + electric bass on A funk9→D funk9. Tempo: 85-100 BPM.',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      chordSymbols: ['Afunk9', 'Dfunk9'],
      targetNotes: [
        // Bar 1 — A funk9: 16th[0,120], rest×2, 16th[360,120], quarter rest
        { midi: 55, onset: 0, duration: 120 },
        { midi: 59, onset: 0, duration: 120 },
        { midi: 64, onset: 0, duration: 120 },
        { midi: 55, onset: 360, duration: 120 },
        { midi: 59, onset: 360, duration: 120 },
        { midi: 64, onset: 360, duration: 120 },
        // Bar 2 — D funk9: 16th[1920,120], rest×2, 16th[2280,120], quarter rest
        { midi: 60, onset: 1920, duration: 120 },
        { midi: 64, onset: 1920, duration: 120 },
        { midi: 69, onset: 1920, duration: 120 },
        { midi: 60, onset: 2280, duration: 120 },
        { midi: 64, onset: 2280, duration: 120 },
        { midi: 69, onset: 2280, duration: 120 },
        // Bar 3 final downbeat — A funk9 quarter
        { midi: 55, onset: 3840, duration: 480 },
        { midi: 59, onset: 3840, duration: 480 },
        { midi: 64, onset: 3840, duration: 480 },
      ],
    },
    {
      stepNumber: 74,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B3: Funk9 Progressions',
      activity: 'B3.3: A Funk9 → D Funk9 with Chromatic Approaches (In Time)',
      direction:
        'Same two bars, now with chromatic approach into each chord. Beat 1 and a-of-1 stabs, then approach chord into target eighth notes. Land on A funk9 at bar 3.',
      assessment: 'pitch_order_timing',
      tag: 'funk:a_d_funk9_chromatic_it | funk',
      styleRef: 'l2a',
      successFeedback:
        'Chromatic approaches on both chords — that is the sauce.',
      contentGeneration:
        'Backing: cool funk beat with 16th-note hi-hat + electric bass on A funk9→D funk9. Tempo: 85-100 BPM.',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      chordSymbols: ['Afunk9', 'Dfunk9'],
      targetNotes: [
        // Bar 1 — A funk9 stabs + Ab→A approach
        { midi: 55, onset: 0, duration: 120 }, // A funk9
        { midi: 59, onset: 0, duration: 120 },
        { midi: 64, onset: 0, duration: 120 },
        { midi: 55, onset: 360, duration: 120 },
        { midi: 59, onset: 360, duration: 120 },
        { midi: 64, onset: 360, duration: 120 },
        { midi: 54, onset: 720, duration: 240 }, // Ab funk9 approach
        { midi: 58, onset: 720, duration: 240 },
        { midi: 63, onset: 720, duration: 240 },
        { midi: 55, onset: 960, duration: 240 }, // A funk9 resolve
        { midi: 59, onset: 960, duration: 240 },
        { midi: 64, onset: 960, duration: 240 },
        // Bar 2 — D funk9 stabs + Db→D approach
        { midi: 60, onset: 1920, duration: 120 }, // D funk9
        { midi: 64, onset: 1920, duration: 120 },
        { midi: 69, onset: 1920, duration: 120 },
        { midi: 60, onset: 2280, duration: 120 },
        { midi: 64, onset: 2280, duration: 120 },
        { midi: 69, onset: 2280, duration: 120 },
        { midi: 59, onset: 2640, duration: 240 }, // Db funk9 approach
        { midi: 63, onset: 2640, duration: 240 },
        { midi: 68, onset: 2640, duration: 240 },
        { midi: 60, onset: 2880, duration: 240 }, // D funk9 resolve
        { midi: 64, onset: 2880, duration: 240 },
        { midi: 69, onset: 2880, duration: 240 },
        // Bar 3 final downbeat — A funk9 quarter
        { midi: 55, onset: 3840, duration: 480 },
        { midi: 59, onset: 3840, duration: 480 },
        { midi: 64, onset: 3840, duration: 480 },
      ],
    },
    {
      stepNumber: 75,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B3: Funk9 Progressions',
      activity: 'B3.4: A Funk9 → D Funk9 — New Rhythm (In Time)',
      direction:
        'Same chords, new rhythm: 16th on beat 1, rest, approach 16th, target 16th, then three quarter rests. Bar 3 lands on A funk9.',
      assessment: 'pitch_order_timing',
      tag: 'funk:a_d_funk9_new_rhythm_it | funk',
      styleRef: 'l2a',
      successFeedback: 'New rhythm, same harmony — two feels from one idea.',
      contentGeneration:
        'Backing: cool funk beat with 16th-note hi-hat + electric bass on A funk9→D funk9. Tempo: 85-100 BPM.',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      chordSymbols: ['Afunk9', 'Dfunk9'],
      targetNotes: [
        // Bar 1 — A[0,120], rest, Ab[240,120], A[360,120], 3 quarter rests
        { midi: 55, onset: 0, duration: 120 }, // A funk9
        { midi: 59, onset: 0, duration: 120 },
        { midi: 64, onset: 0, duration: 120 },
        { midi: 54, onset: 240, duration: 120 }, // Ab funk9 approach
        { midi: 58, onset: 240, duration: 120 },
        { midi: 63, onset: 240, duration: 120 },
        { midi: 55, onset: 360, duration: 120 }, // A funk9
        { midi: 59, onset: 360, duration: 120 },
        { midi: 64, onset: 360, duration: 120 },
        // Bar 2 — D[1920,120], rest, Db[2160,120], D[2280,120], 3 quarter rests
        { midi: 60, onset: 1920, duration: 120 }, // D funk9
        { midi: 64, onset: 1920, duration: 120 },
        { midi: 69, onset: 1920, duration: 120 },
        { midi: 59, onset: 2160, duration: 120 }, // Db funk9 approach
        { midi: 63, onset: 2160, duration: 120 },
        { midi: 68, onset: 2160, duration: 120 },
        { midi: 60, onset: 2280, duration: 120 }, // D funk9
        { midi: 64, onset: 2280, duration: 120 },
        { midi: 69, onset: 2280, duration: 120 },
        // Bar 3 final downbeat — A funk9 quarter
        { midi: 55, onset: 3840, duration: 480 },
        { midi: 59, onset: 3840, duration: 480 },
        { midi: 64, onset: 3840, duration: 480 },
      ],
    },

    // ── B4: Full Progression with Edom7#5 (4 steps) ──────────────────────
    // Am9 = C4(60)-G4(67)-B4(71)   [b3-b7-9]
    // Ddom13 = C4(60)-F#4(66)-B4(71) [b7-#11-13... voice leading from Am9]
    // Edom7#5 = D4(62)-G#4(68)-C5(72) [b7-3-#5]
    {
      stepNumber: 76,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B4: Full Progression',
      activity: 'B4.1: Am9→Ddom13→Edom7#5→Am9 (Out of Time)',
      direction:
        'Play the full four-chord sequence: Am9 (C4-G4-B4), Ddom13 (C4-F#4-B4), Edom7#5 (D4-G#4-C5), Am9. Notice how two notes stay common between Am9 and Ddom13, then everything shifts for Edom7#5.',
      assessment: 'pitch_only',
      tag: 'funk:am9_ddom13_edom7s5_progression_oot | funk',
      styleRef: 'l2a',
      successFeedback:
        'The full L2 progression — Am9, Ddom13, Edom7#5 back home.',
      chordSymbols: ['Am9', 'Ddom13', 'Edom7#5', 'Am9'],
      targetNotes: [
        // Am9: C4-G4-B4
        { midi: 60, onset: 0, duration: 960 },
        { midi: 67, onset: 0, duration: 960 },
        { midi: 71, onset: 0, duration: 960 },
        // Ddom13: C4-F#4-B4
        { midi: 60, onset: 960, duration: 960 },
        { midi: 66, onset: 960, duration: 960 },
        { midi: 71, onset: 960, duration: 960 },
        // Edom7#5: D4-G#4-C5
        { midi: 62, onset: 1920, duration: 960 },
        { midi: 68, onset: 1920, duration: 960 },
        { midi: 72, onset: 1920, duration: 960 },
        // Am9 return: C4-G4-B4
        { midi: 60, onset: 2880, duration: 960 },
        { midi: 67, onset: 2880, duration: 960 },
        { midi: 71, onset: 2880, duration: 960 },
      ],
    },
    {
      stepNumber: 77,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B4: Full Progression',
      activity: 'B4.2: Am9→Ddom13→Edom7#5→Am9 — Whole Notes (In Time)',
      direction:
        'Four bars, one chord per bar as a whole note. Feel each chord clearly before moving to the next. Bar 5: final downbeat on Am9.',
      assessment: 'pitch_order_timing',
      tag: 'funk:am9_ddom13_edom7s5_whole_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Full progression in time — four chords, four bars.',
      contentGeneration:
        'Backing: cool funk beat with 16th-note hi-hat + electric bass on Am9→Ddom13→Edom7#5→Am9. Tempo: 85-100 BPM.',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      chordSymbols: ['Am9', 'Ddom13', 'Edom7#5', 'Am9'],
      targetNotes: [
        // Bar 1 — Am9 whole note
        { midi: 60, onset: 0, duration: 1920 },
        { midi: 67, onset: 0, duration: 1920 },
        { midi: 71, onset: 0, duration: 1920 },
        // Bar 2 — Ddom13 whole note
        { midi: 60, onset: 1920, duration: 1920 },
        { midi: 66, onset: 1920, duration: 1920 },
        { midi: 71, onset: 1920, duration: 1920 },
        // Bar 3 — Edom7#5 whole note
        { midi: 62, onset: 3840, duration: 1920 },
        { midi: 68, onset: 3840, duration: 1920 },
        { midi: 72, onset: 3840, duration: 1920 },
        // Bar 4 — Am9 whole note
        { midi: 60, onset: 5760, duration: 1920 },
        { midi: 67, onset: 5760, duration: 1920 },
        { midi: 71, onset: 5760, duration: 1920 },
        // Bar 5 final downbeat — Am9 quarter
        { midi: 60, onset: 7680, duration: 480 },
        { midi: 67, onset: 7680, duration: 480 },
        { midi: 71, onset: 7680, duration: 480 },
      ],
    },
    {
      stepNumber: 78,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B4: Full Progression',
      activity: 'B4.3: Am9→Ddom13→Am9→Edom7#5 — Whole Notes (In Time)',
      direction:
        'Same chords, new order: Am9→Ddom13→Am9→Edom7#5. Edom7#5 at bar 4 now acts as the turnaround that pushes back to Am9.',
      assessment: 'pitch_order_timing',
      tag: 'funk:am9_ddom13_am9_edom7s5_whole_it | funk',
      styleRef: 'l2a',
      successFeedback:
        'Progression with the turnaround — Edom7#5 pulling back home.',
      contentGeneration:
        'Backing: cool funk beat with 16th-note hi-hat + electric bass on Am9→Ddom13→Am9→Edom7#5. Tempo: 85-100 BPM.',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      chordSymbols: ['Am9', 'Ddom13', 'Am9', 'Edom7#5'],
      targetNotes: [
        // Bar 1 — Am9
        { midi: 60, onset: 0, duration: 1920 },
        { midi: 67, onset: 0, duration: 1920 },
        { midi: 71, onset: 0, duration: 1920 },
        // Bar 2 — Ddom13
        { midi: 60, onset: 1920, duration: 1920 },
        { midi: 66, onset: 1920, duration: 1920 },
        { midi: 71, onset: 1920, duration: 1920 },
        // Bar 3 — Am9
        { midi: 60, onset: 3840, duration: 1920 },
        { midi: 67, onset: 3840, duration: 1920 },
        { midi: 71, onset: 3840, duration: 1920 },
        // Bar 4 — Edom7#5
        { midi: 62, onset: 5760, duration: 1920 },
        { midi: 68, onset: 5760, duration: 1920 },
        { midi: 72, onset: 5760, duration: 1920 },
        // Bar 5 final downbeat — Am9 quarter
        { midi: 60, onset: 7680, duration: 480 },
        { midi: 67, onset: 7680, duration: 480 },
        { midi: 71, onset: 7680, duration: 480 },
      ],
    },
    {
      stepNumber: 79,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B4: Full Progression',
      activity: 'B4.4: Am9→Ddom13→Am9→Edom7#5 — Syncopated Rhythm (In Time)',
      direction:
        'Same four-chord progression, new rhythm: eighth + 16th + rest + rest + 16th + eighth rest + half note per bar. Bar 5 final downbeat on Am9.',
      assessment: 'pitch_order_timing',
      tag: 'funk:am9_ddom13_am9_edom7s5_syncopated_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Full progression with syncopation — L2 complete.',
      contentGeneration:
        'Backing: cool funk beat with 16th-note hi-hat + electric bass on Am9→Ddom13→Am9→Edom7#5. Tempo: 85-100 BPM.',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
      chordSymbols: ['Am9', 'Ddom13', 'Am9', 'Edom7#5'],
      targetNotes: [
        // Rhythm per bar: [0,240] [240,120] [600,120] [960,960]
        // Bar 1 — Am9
        { midi: 60, onset: 0, duration: 240 },
        { midi: 67, onset: 0, duration: 240 },
        { midi: 71, onset: 0, duration: 240 },
        { midi: 60, onset: 240, duration: 120 },
        { midi: 67, onset: 240, duration: 120 },
        { midi: 71, onset: 240, duration: 120 },
        { midi: 60, onset: 600, duration: 120 },
        { midi: 67, onset: 600, duration: 120 },
        { midi: 71, onset: 600, duration: 120 },
        { midi: 60, onset: 960, duration: 960 },
        { midi: 67, onset: 960, duration: 960 },
        { midi: 71, onset: 960, duration: 960 },
        // Bar 2 — Ddom13
        { midi: 60, onset: 1920, duration: 240 },
        { midi: 66, onset: 1920, duration: 240 },
        { midi: 71, onset: 1920, duration: 240 },
        { midi: 60, onset: 2160, duration: 120 },
        { midi: 66, onset: 2160, duration: 120 },
        { midi: 71, onset: 2160, duration: 120 },
        { midi: 60, onset: 2520, duration: 120 },
        { midi: 66, onset: 2520, duration: 120 },
        { midi: 71, onset: 2520, duration: 120 },
        { midi: 60, onset: 2880, duration: 960 },
        { midi: 66, onset: 2880, duration: 960 },
        { midi: 71, onset: 2880, duration: 960 },
        // Bar 3 — Am9
        { midi: 60, onset: 3840, duration: 240 },
        { midi: 67, onset: 3840, duration: 240 },
        { midi: 71, onset: 3840, duration: 240 },
        { midi: 60, onset: 4080, duration: 120 },
        { midi: 67, onset: 4080, duration: 120 },
        { midi: 71, onset: 4080, duration: 120 },
        { midi: 60, onset: 4440, duration: 120 },
        { midi: 67, onset: 4440, duration: 120 },
        { midi: 71, onset: 4440, duration: 120 },
        { midi: 60, onset: 4800, duration: 960 },
        { midi: 67, onset: 4800, duration: 960 },
        { midi: 71, onset: 4800, duration: 960 },
        // Bar 4 — Edom7#5
        { midi: 62, onset: 5760, duration: 240 },
        { midi: 68, onset: 5760, duration: 240 },
        { midi: 72, onset: 5760, duration: 240 },
        { midi: 62, onset: 6000, duration: 120 },
        { midi: 68, onset: 6000, duration: 120 },
        { midi: 72, onset: 6000, duration: 120 },
        { midi: 62, onset: 6360, duration: 120 },
        { midi: 68, onset: 6360, duration: 120 },
        { midi: 72, onset: 6360, duration: 120 },
        { midi: 62, onset: 6720, duration: 960 },
        { midi: 68, onset: 6720, duration: 960 },
        { midi: 72, onset: 6720, duration: 960 },
        // Bar 5 final downbeat — Am9 quarter
        { midi: 60, onset: 7680, duration: 480 },
        { midi: 67, onset: 7680, duration: 480 },
        { midi: 71, onset: 7680, duration: 480 },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// L3 Section C — Bass (12 steps, steps 130-141)
// Key: A minor Dorian | Bass registers: A2=45, D2=38, E2=40, F#2=42, G2=43
// ---------------------------------------------------------------------------

const funkL3SectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    // ── C2: Bass Techniques (6 steps) ───────────────────────────────────

    // C2.1 / C2.2 — 2-Bar Funk Bass Line with b7
    // Bar 1: A1[0,120], rest×2, A1[360,120], 8th rest, G1[720,240], A1[960,240], dotted-qtr rest
    // Bar 2: D2[1920,120], rest×2, D2[2280,120], 8th rest, C2[2640,240], D2[2880,240], dotted-qtr rest
    // Final downbeat: A1[3840]
    {
      stepNumber: 86,
      module: 'funk_l2',
      section: 'C',
      subsection: 'C2: Bass Techniques',
      activity: 'C2.1: 2-Bar Funk Bass Line with b7 (Out of Time)',
      direction:
        'A Dorian bass line using the b7 (G). Bar 1: A→A→G→A. Bar 2: D→D→C→D (same rhythm on D root). Syncopated 16th-note hits with space.',
      assessment: 'pitch_only',
      tag: 'funk:bass_2bar_b7_l2_oot | funk',
      styleRef: 'l2a',
      successFeedback: '2-bar b7 bass line — roots and b7, pure Dorian pocket.',
      targetNotes: [
        // Bar 1 (Amin9)
        { midi: 33, onset: 0, duration: 120 }, // A1 — 16th
        { midi: 33, onset: 360, duration: 120 }, // A1 — 16th (after 2×16th rest)
        { midi: 31, onset: 720, duration: 240 }, // G1 — 8th (b7)
        { midi: 33, onset: 960, duration: 240 }, // A1 — 8th
        // dotted-quarter rest (1200-1920)
        // Bar 2 (Ddom13)
        { midi: 38, onset: 1920, duration: 120 }, // D2 — 16th
        { midi: 38, onset: 2280, duration: 120 }, // D2 — 16th (after 2×16th rest)
        { midi: 36, onset: 2640, duration: 240 }, // C2 — 8th (b7 of D)
        { midi: 38, onset: 2880, duration: 240 }, // D2 — 8th
        // dotted-quarter rest (3120-3840)
        { midi: 33, onset: 3840, duration: 480 }, // A1 — final downbeat
      ],
    },
    {
      stepNumber: 87,
      module: 'funk_l2',
      section: 'C',
      subsection: 'C2: Bass Techniques',
      activity: 'C2.2: 2-Bar Funk Bass Line with b7 (In Time)',
      direction: 'Play the b7 bass line in time.',
      assessment: 'pitch_order_timing',
      tag: 'funk:bass_2bar_b7_l2_it | funk',
      styleRef: 'l2a',
      successFeedback: 'b7 bass line in the pocket.',
      targetNotes: [
        { midi: 33, onset: 0, duration: 120 },
        { midi: 33, onset: 360, duration: 120 },
        { midi: 31, onset: 720, duration: 240 },
        { midi: 33, onset: 960, duration: 240 },
        { midi: 38, onset: 1920, duration: 120 },
        { midi: 38, onset: 2280, duration: 120 },
        { midi: 36, onset: 2640, duration: 240 },
        { midi: 38, onset: 2880, duration: 240 },
        { midi: 33, onset: 3840, duration: 480 },
      ],
    },

    // C2.3 / C2.4 — 2-Bar Funk Bass Line with Double Chromatic Approach
    // Bar 1: A1[0,120], rest×2, A1[360,120], qtr rest, G1[960,240], G#1[1200,120], A1[1320,120], qtr rest
    // Bar 2: D2[1920,120], rest×2, D2[2280,120], qtr rest, C2[2880,240], C#2[3120,120], D2[3240,120], qtr rest
    // Final downbeat: A1[3840]
    {
      stepNumber: 88,
      module: 'funk_l2',
      section: 'C',
      subsection: 'C2: Bass Techniques',
      activity:
        'C2.3: 2-Bar Funk Bass Line with Double Chromatic (Out of Time)',
      direction:
        'Approach the root from below using G→G#→A (double chromatic). Bar 1 on A, bar 2 on D. The squeeze into the root from two semitones down.',
      assessment: 'pitch_only',
      tag: 'funk:bass_2bar_dbl_chrom_l2_oot | funk',
      styleRef: 'l2a',
      successFeedback:
        'Double chromatic approach — two-step squeeze into the root.',
      targetNotes: [
        // Bar 1 (Amin9)
        { midi: 33, onset: 0, duration: 120 }, // A1 — 16th
        { midi: 33, onset: 360, duration: 120 }, // A1 — 16th (after 2×16th rest)
        // quarter rest (480-960)
        { midi: 31, onset: 960, duration: 240 }, // G1 — 8th
        { midi: 32, onset: 1200, duration: 120 }, // G#1 — 16th
        { midi: 33, onset: 1320, duration: 120 }, // A1 — 16th
        // quarter rest (1440-1920)
        // Bar 2 (Ddom13)
        { midi: 38, onset: 1920, duration: 120 }, // D2 — 16th
        { midi: 38, onset: 2280, duration: 120 }, // D2 — 16th (after 2×16th rest)
        // quarter rest (2400-2880)
        { midi: 36, onset: 2880, duration: 240 }, // C2 — 8th
        { midi: 37, onset: 3120, duration: 120 }, // C#2 — 16th
        { midi: 38, onset: 3240, duration: 120 }, // D2 — 16th
        // quarter rest (3360-3840)
        { midi: 33, onset: 3840, duration: 480 }, // A1 — final downbeat
      ],
    },
    {
      stepNumber: 89,
      module: 'funk_l2',
      section: 'C',
      subsection: 'C2: Bass Techniques',
      activity: 'C2.4: 2-Bar Funk Bass Line with Double Chromatic (In Time)',
      direction: 'Play the double chromatic bass line in time.',
      assessment: 'pitch_order_timing',
      tag: 'funk:bass_2bar_dbl_chrom_l2_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Double chromatic squeeze in the pocket.',
      targetNotes: [
        { midi: 33, onset: 0, duration: 120 },
        { midi: 33, onset: 360, duration: 120 },
        { midi: 31, onset: 960, duration: 240 },
        { midi: 32, onset: 1200, duration: 120 },
        { midi: 33, onset: 1320, duration: 120 },
        { midi: 38, onset: 1920, duration: 120 },
        { midi: 38, onset: 2280, duration: 120 },
        { midi: 36, onset: 2880, duration: 240 },
        { midi: 37, onset: 3120, duration: 120 },
        { midi: 38, onset: 3240, duration: 120 },
        { midi: 33, onset: 3840, duration: 480 },
      ],
    },

    // C2.5 / C2.6 — 2-Bar Melodic Bass Line
    // Bar 1: A1[0,240], 8th rest, C2[480,120], 16th rest, E2[720,120], 16th rest,
    //        D2[960,360](dotted-8th), E2[1320,120], qtr rest
    // Bar 2: D2[1920,120], 16th rest, C2[2160,120], 16th rest, D2[2400,240],
    //        E2[2640,120], C2[2760,360](dotted-8th), D2[3120,120], 16th rest, qtr rest
    // Final downbeat: A1[3840]
    {
      stepNumber: 90,
      module: 'funk_l2',
      section: 'C',
      subsection: 'C2: Bass Techniques',
      activity: 'C2.5: 2-Bar Melodic Bass Line (Out of Time)',
      direction:
        'A melodic 2-bar bass line that weaves through A minor. Bar 1 ascends; bar 2 answers with a descending reply. The bass tells a story.',
      assessment: 'pitch_only',
      tag: 'funk:bass_2bar_melodic_l2_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'Melodic bass — the line has a voice.',
      targetNotes: [
        // Bar 1
        { midi: 33, onset: 0, duration: 240 }, // A1 — 8th
        // 8th rest (240-480)
        { midi: 36, onset: 480, duration: 120 }, // C2 — 16th
        // 16th rest (600-720)
        { midi: 40, onset: 720, duration: 120 }, // E2 — 16th
        // 16th rest (840-960)
        { midi: 38, onset: 960, duration: 360 }, // D2 — dotted 8th
        { midi: 40, onset: 1320, duration: 120 }, // E2 — 16th
        // quarter rest (1440-1920)
        // Bar 2
        { midi: 38, onset: 1920, duration: 120 }, // D2 — 16th
        // 16th rest (2040-2160)
        { midi: 36, onset: 2160, duration: 120 }, // C2 — 16th
        // 16th rest (2280-2400)
        { midi: 38, onset: 2400, duration: 240 }, // D2 — 8th
        { midi: 40, onset: 2640, duration: 120 }, // E2 — 16th
        { midi: 36, onset: 2760, duration: 360 }, // C2 — dotted 8th
        { midi: 38, onset: 3120, duration: 120 }, // D2 — 16th
        // 16th rest (3240-3360), quarter rest (3360-3840)
        { midi: 33, onset: 3840, duration: 480 }, // A1 — final downbeat
      ],
    },
    {
      stepNumber: 91,
      module: 'funk_l2',
      section: 'C',
      subsection: 'C2: Bass Techniques',
      activity: 'C2.6: 2-Bar Melodic Bass Line (In Time)',
      direction: 'Play the melodic bass line in time.',
      assessment: 'pitch_order_timing',
      tag: 'funk:bass_2bar_melodic_l2_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Melodic bass in the pocket.',
      targetNotes: [
        { midi: 33, onset: 0, duration: 240 },
        { midi: 36, onset: 480, duration: 120 },
        { midi: 40, onset: 720, duration: 120 },
        { midi: 38, onset: 960, duration: 360 },
        { midi: 40, onset: 1320, duration: 120 },
        { midi: 38, onset: 1920, duration: 120 },
        { midi: 36, onset: 2160, duration: 120 },
        { midi: 38, onset: 2400, duration: 240 },
        { midi: 40, onset: 2640, duration: 120 },
        { midi: 36, onset: 2760, duration: 360 },
        { midi: 38, onset: 3120, duration: 120 },
        { midi: 33, onset: 3840, duration: 480 },
      ],
    },

    // ── C3: Bass Play-Along (2 steps) ────────────────────────────────────

    // C3.1 / C3.2 — 4-Bar Bass Line: Amin9→Ddom13→Amin9→E7#5
    // Bar 1 (Amin9):  A1[0,120], rest×2, A1[360,120], 8th rest, G1[720,240], A1[960,240], C2[1200,240], C#2[1440,240]
    // Bar 2 (Ddom13): D2[1920,120], rest×2, D2[2280,120], 8th rest, C2[2640,240], D2[2880,240], C2[3120,240]
    // Bar 3 (Amin9):  A1[3840,120], rest×2, A1[4200,120], 8th rest, G1[4560,240], A1[4800,240], D2[5040,240], D#2[5280,240]
    // Bar 4 (E7#5):   E2[5760,120], rest×2, E2[6120,120], 8th rest, D2[6480,240], E2[6720,240], 8th rest, G1[7200,120], 16th rest, G#1[7440,120]
    // Final downbeat: A1[7680]
    // NOTE: Bar 2 ends at 3840 (C2 ends 3360, quarter rest to 3840).
    //       Bar 4 onset errors corrected: user wrote 5952/6312/6672/6912 (all +192); correct: 5760/6120/6480/6720.
    {
      stepNumber: 92,
      module: 'funk_l2',
      section: 'C',
      subsection: 'C3: Bass Play-Along',
      activity: 'C3.1: 4-Bar Bass Line — Amin9→Ddom13→Amin9→E7#5 (Out of Time)',
      direction:
        'Play the full 4-bar bass line over the chord progression: Amin9→Ddom13→Amin9→E7#5. Each bar has the same syncopated feel with chromatic approach notes.',
      assessment: 'pitch_only',
      tag: 'funk:bass_4bar_progression_l2_oot | funk',
      styleRef: 'l2a',
      successFeedback:
        '4-bar bass line — the full L2 progression under your fingers.',
      chordSymbols: ['Am9', 'Ddom13', 'Am9', 'E7#5'],
      targetNotes: [
        // Bar 1 — Amin9
        { midi: 33, onset: 0, duration: 120 }, // A1 — 16th
        { midi: 33, onset: 360, duration: 120 }, // A1 — 16th (after 2×16th rest)
        // 8th rest (480-720)
        { midi: 31, onset: 720, duration: 240 }, // G1 — 8th
        { midi: 33, onset: 960, duration: 240 }, // A1 — 8th
        { midi: 36, onset: 1440, duration: 240 }, // C2 — 8th
        { midi: 37, onset: 1680, duration: 240 }, // C#2 — 8th
        // Bar 2 — Ddom13
        { midi: 38, onset: 1920, duration: 120 }, // D2 — 16th
        { midi: 38, onset: 2280, duration: 120 }, // D2 — 16th (after 2×16th rest)
        // 8th rest (2400-2640)
        { midi: 36, onset: 2640, duration: 240 }, // C2 — 8th
        { midi: 38, onset: 2880, duration: 240 }, // D2 — 8th
        { midi: 36, onset: 3120, duration: 240 }, // C2 — 8th
        // quarter rest (3360-3840)
        // Bar 3 — Amin9
        { midi: 33, onset: 3840, duration: 120 }, // A1 — 16th
        { midi: 33, onset: 4200, duration: 120 }, // A1 — 16th (after 2×16th rest)
        // 8th rest (4320-4560)
        { midi: 31, onset: 4560, duration: 240 }, // G1 — 8th
        { midi: 33, onset: 4800, duration: 240 }, // A1 — 8th
        { midi: 38, onset: 5280, duration: 240 }, // D2 — 8th
        { midi: 39, onset: 5520, duration: 240 }, // D#2 — 8th
        // 8th rest (5520-5760)
        // Bar 4 — E7#5
        { midi: 40, onset: 5760, duration: 120 }, // E2 — 16th
        { midi: 40, onset: 6120, duration: 120 }, // E2 — 16th (after 2×16th rest)
        // 8th rest (6240-6480)
        { midi: 38, onset: 6480, duration: 240 }, // D2 — 8th
        { midi: 40, onset: 6720, duration: 240 }, // E2 — 8th
        // 8th rest (6960-7200)
        { midi: 31, onset: 7200, duration: 120 }, // G1 — 16th
        // 16th rest (7320-7440)
        { midi: 32, onset: 7440, duration: 120 }, // G#1 — 16th
        // 16th rest (7560-7680)
        { midi: 33, onset: 7680, duration: 480 }, // A1 — final downbeat
      ],
    },
    {
      stepNumber: 92,
      module: 'funk_l2',
      section: 'C',
      subsection: 'C3: Bass Play-Along',
      activity: 'C3.2: 4-Bar Bass Line — Amin9→Ddom13→Amin9→E7#5 (In Time)',
      direction: 'Play the 4-bar bass line over the backing track.',
      assessment: 'pitch_order_timing',
      tag: 'funk:bass_4bar_progression_l2_it | funk',
      styleRef: 'l2a',
      successFeedback: '4-bar bass line in the pocket — L2 bass mastery.',
      chordSymbols: ['Am9', 'Ddom13', 'Am9', 'E7#5'],
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
      targetNotes: [
        { midi: 33, onset: 0, duration: 120 },
        { midi: 33, onset: 360, duration: 120 },
        { midi: 31, onset: 720, duration: 240 },
        { midi: 33, onset: 960, duration: 240 },
        { midi: 36, onset: 1200, duration: 240 },
        { midi: 37, onset: 1440, duration: 240 },
        { midi: 38, onset: 1920, duration: 120 },
        { midi: 38, onset: 2280, duration: 120 },
        { midi: 36, onset: 2640, duration: 240 },
        { midi: 38, onset: 2880, duration: 240 },
        { midi: 36, onset: 3120, duration: 240 },
        { midi: 33, onset: 3840, duration: 120 },
        { midi: 33, onset: 4200, duration: 120 },
        { midi: 31, onset: 4560, duration: 240 },
        { midi: 33, onset: 4800, duration: 240 },
        { midi: 38, onset: 5040, duration: 240 },
        { midi: 39, onset: 5280, duration: 240 },
        { midi: 40, onset: 5760, duration: 120 },
        { midi: 40, onset: 6120, duration: 120 },
        { midi: 38, onset: 6480, duration: 240 },
        { midi: 40, onset: 6720, duration: 240 },
        { midi: 31, onset: 7200, duration: 120 },
        { midi: 32, onset: 7440, duration: 120 },
        { midi: 33, onset: 7680, duration: 480 },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// L3 Section D — Performance (6 steps, steps 142-147)
// ---------------------------------------------------------------------------

const funkL3SectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    // ── D1: LH Bass + RH Chords — Headhunters (2 steps, 142-143) ────────
    {
      stepNumber: 93,
      module: 'funk_l2',
      section: 'D',
      subsection: 'D1: LH Bass + RH Chords (Headhunters)',
      activity: 'D1.1: LH Bass + RH Sparse Voicings (Out of Time)',
      direction:
        'Left hand: locked bass on A2, beat 1 and 3 only. Right hand: sparse Am9 stabs. Maximum space, maximum groove.',
      assessment: 'pitch_only',
      tag: 'funk:performance_headhunters_l3_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'Headhunters feel — sparse, deep, every note matters.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      targetNotes: [
        // LH: selective lock beat 1+3
        { midi: 45, onset: 0, duration: 460, hand: 'lh' }, // A2
        { midi: 45, onset: 960, duration: 460, hand: 'lh' }, // A2 beat 3
        // RH: sparse Am9 stabs (comp_funk_s1: beat1, a-of-1, beat3, a-of-3)
        { midi: 60, onset: 0, duration: 120, hand: 'rh' },
        { midi: 67, onset: 0, duration: 120, hand: 'rh' },
        { midi: 71, onset: 0, duration: 120, hand: 'rh' },
        { midi: 60, onset: 360, duration: 120, hand: 'rh' },
        { midi: 67, onset: 360, duration: 120, hand: 'rh' },
        { midi: 71, onset: 360, duration: 120, hand: 'rh' },
        { midi: 60, onset: 960, duration: 120, hand: 'rh' },
        { midi: 67, onset: 960, duration: 120, hand: 'rh' },
        { midi: 71, onset: 960, duration: 120, hand: 'rh' },
        { midi: 60, onset: 1200, duration: 120, hand: 'rh' },
        { midi: 67, onset: 1200, duration: 120, hand: 'rh' },
        { midi: 71, onset: 1200, duration: 120, hand: 'rh' },
      ],
      backing_parts: {
        engine_generates: [],
        student_plays: ['bass', 'chords'],
      },
    },
    {
      stepNumber: 94,
      module: 'funk_l2',
      section: 'D',
      subsection: 'D1: LH Bass + RH Chords (Headhunters)',
      activity: 'D1.2: LH Bass + RH Funk Stabs (In Time)',
      assessment: 'pitch_order_timing_duration',
      tag: 'funk:performance_headhunters_l3_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Headhunters in time — sparse, locked, deep groove.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      targetNotes: [
        { midi: 45, onset: 0, duration: 460, hand: 'lh' },
        { midi: 45, onset: 960, duration: 460, hand: 'lh' },
        { midi: 60, onset: 0, duration: 120, hand: 'rh' },
        { midi: 67, onset: 0, duration: 120, hand: 'rh' },
        { midi: 71, onset: 0, duration: 120, hand: 'rh' },
        { midi: 60, onset: 360, duration: 120, hand: 'rh' },
        { midi: 67, onset: 360, duration: 120, hand: 'rh' },
        { midi: 71, onset: 360, duration: 120, hand: 'rh' },
        { midi: 60, onset: 960, duration: 120, hand: 'rh' },
        { midi: 67, onset: 960, duration: 120, hand: 'rh' },
        { midi: 71, onset: 960, duration: 120, hand: 'rh' },
        { midi: 60, onset: 1200, duration: 120, hand: 'rh' },
        { midi: 67, onset: 1200, duration: 120, hand: 'rh' },
        { midi: 71, onset: 1200, duration: 120, hand: 'rh' },
        // bar 2: final downbeat — LH A2 + RH Am9
        { midi: 45, onset: 1920, duration: 120, hand: 'lh' },
        { midi: 60, onset: 1920, duration: 120, hand: 'rh' },
        { midi: 67, onset: 1920, duration: 120, hand: 'rh' },
        { midi: 71, onset: 1920, duration: 120, hand: 'rh' },
      ],
      backing_parts: {
        engine_generates: ['drums'],
        student_plays: ['bass', 'chords'],
      },
    },

    // ── D2: LH Chords + RH Melody (2 steps, 144-145) ─────────────────────
    {
      stepNumber: 95,
      module: 'funk_l2',
      section: 'D',
      subsection: 'D2: LH Chords + RH Melody',
      activity: 'D2.1: LH Funk9 Approach + RH Motivic Melody (Out of Time)',
      direction:
        'Left hand plays the A funk9 chord with a half-step chromatic approach from Ab. Right hand plays a syncopated Dorian phrase (G5→F#5→E5→F#5→E5). Two independent parts, one keyboard.',
      assessment: 'pitch_only',
      tag: 'funk:performance_prince_l3_oot | funk',
      styleRef: 'l2b',
      successFeedback:
        'Two-hand independence — chromatic approach under Dorian melody.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_chords_rh_melody',
        lh_role: 'chords',
        rh_role: 'melody',
        style_ref: 'l3b',
      },
      targetNotes: [
        // LH — A funk9 [b7-9-5]: G4-B4-E5, with half-step Ab approach
        { midi: 66, onset: 0, duration: 240, hand: 'lh' }, // Gb4 (b7 of Ab)
        { midi: 70, onset: 0, duration: 240, hand: 'lh' }, // Bb4 (9  of Ab)
        { midi: 75, onset: 0, duration: 240, hand: 'lh' }, // Eb5 (5  of Ab)
        { midi: 67, onset: 240, duration: 120, hand: 'lh' }, // G4  (b7 of A) — approach stab
        { midi: 71, onset: 240, duration: 120, hand: 'lh' }, // B4  (9  of A)
        { midi: 76, onset: 240, duration: 120, hand: 'lh' }, // E5  (5  of A)
        { midi: 67, onset: 360, duration: 1080, hand: 'lh' }, // G4  held
        { midi: 71, onset: 360, duration: 1080, hand: 'lh' }, // B4  held
        { midi: 76, onset: 360, duration: 1080, hand: 'lh' }, // E5  held
        // RH — syncopated Dorian phrase (half rest, then G5 on beat 3)
        { midi: 79, onset: 960, duration: 240, hand: 'rh' }, // G5
        { midi: 78, onset: 1200, duration: 240, hand: 'rh' }, // F#5
        { midi: 76, onset: 1440, duration: 120, hand: 'rh' }, // E5
        { midi: 78, onset: 1560, duration: 120, hand: 'rh' }, // F#5
        { midi: 76, onset: 1800, duration: 120, hand: 'rh' }, // E5
      ],
      backing_parts: {
        engine_generates: [],
        student_plays: ['chords', 'melody'],
      },
    },
    {
      stepNumber: 96,
      module: 'funk_l2',
      section: 'D',
      subsection: 'D2: LH Chords + RH Melody',
      activity: 'D2.2: LH Funk9 Approach + RH Motivic Melody (In Time)',
      direction:
        'Same as D2.1 — LH chromatic approach into A funk9, RH syncopated Dorian phrase — both hands locked to the groove.',
      assessment: 'pitch_order_timing_duration',
      tag: 'funk:performance_prince_l3_it | funk',
      styleRef: 'l2b',
      successFeedback:
        'Two-hand independence in time — chromatic approach and Dorian melody locked together.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_chords_rh_melody',
        lh_role: 'chords',
        rh_role: 'melody',
        style_ref: 'l3b',
      },
      targetNotes: [
        // LH — A funk9 [b7-9-5]: G4-B4-E5, with half-step Ab approach
        { midi: 66, onset: 0, duration: 240, hand: 'lh' }, // Gb4 (b7 of Ab)
        { midi: 70, onset: 0, duration: 240, hand: 'lh' }, // Bb4 (9  of Ab)
        { midi: 75, onset: 0, duration: 240, hand: 'lh' }, // Eb5 (5  of Ab)
        { midi: 67, onset: 240, duration: 120, hand: 'lh' }, // G4  (b7 of A) — approach stab
        { midi: 71, onset: 240, duration: 120, hand: 'lh' }, // B4  (9  of A)
        { midi: 76, onset: 240, duration: 120, hand: 'lh' }, // E5  (5  of A)
        { midi: 67, onset: 360, duration: 1080, hand: 'lh' }, // G4  held
        { midi: 71, onset: 360, duration: 1080, hand: 'lh' }, // B4  held
        { midi: 76, onset: 360, duration: 1080, hand: 'lh' }, // E5  held
        // RH — syncopated Dorian phrase (half rest, then G5 on beat 3)
        { midi: 79, onset: 960, duration: 240, hand: 'rh' }, // G5
        { midi: 78, onset: 1200, duration: 240, hand: 'rh' }, // F#5
        { midi: 76, onset: 1440, duration: 120, hand: 'rh' }, // E5
        { midi: 78, onset: 1560, duration: 120, hand: 'rh' }, // F#5
        { midi: 76, onset: 1800, duration: 120, hand: 'rh' }, // E5
        // bar 2: final downbeat — LH A funk9 only
        { midi: 67, onset: 1920, duration: 120, hand: 'lh' }, // G4
        { midi: 71, onset: 1920, duration: 120, hand: 'lh' }, // B4
        { midi: 76, onset: 1920, duration: 120, hand: 'lh' }, // E5
      ],
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords', 'melody'],
      },
    },

    // ── D3: Integrated Performance — Capstone (2 steps, 146-147) ─────────
    {
      stepNumber: 97,
      module: 'funk_l2',
      section: 'D',
      subsection: 'D3: Integrated Performance',
      activity: 'D3.1: Integrated Performance — LH Bass + RH Chords (In Time)',
      direction:
        'Level 2 capstone: LH plays bass (A2 root-based line), RH plays Am9 stabs using Funk Stab 1 rhythm over the Am9→D13→Am9→E7#5 progression. Demonstrate your full Level 2 Funk vocabulary.',
      assessment: 'pitch_order_timing_duration',
      tag: 'funk:performance_capstone_l3_it | funk',
      styleRef: 'l2a',
      successFeedback:
        'Level 2 Funk complete. You have the groove vocabulary and chord sophistication of the pros.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_chords',
        lh_role: 'bass',
        rh_role: 'chords',
        style_ref: 'l3a',
      },
      chordSymbols: ['Am9', 'D13', 'Am9', 'E7#5'],
      targetNotes: [
        // Bar 1 — Am9: LH A2, RH Am9 b3-b7-9 at Stab 1
        { midi: 45, onset: 0, duration: 460, hand: 'lh' },
        { midi: 45, onset: 960, duration: 460, hand: 'lh' },
        { midi: 60, onset: 0, duration: 120, hand: 'rh' },
        { midi: 67, onset: 0, duration: 120, hand: 'rh' },
        { midi: 71, onset: 0, duration: 120, hand: 'rh' },
        { midi: 60, onset: 360, duration: 120, hand: 'rh' },
        { midi: 67, onset: 360, duration: 120, hand: 'rh' },
        { midi: 71, onset: 360, duration: 120, hand: 'rh' },
        { midi: 60, onset: 960, duration: 120, hand: 'rh' },
        { midi: 67, onset: 960, duration: 120, hand: 'rh' },
        { midi: 71, onset: 960, duration: 120, hand: 'rh' },
        { midi: 60, onset: 1200, duration: 120, hand: 'rh' },
        { midi: 67, onset: 1200, duration: 120, hand: 'rh' },
        { midi: 71, onset: 1200, duration: 120, hand: 'rh' },
        // Bar 2 — D dom13: LH D2, RH D dom13 rootless C4-F#4-B4
        { midi: 38, onset: 1920, duration: 460, hand: 'lh' },
        { midi: 38, onset: 2880, duration: 460, hand: 'lh' },
        { midi: 60, onset: 1920, duration: 120, hand: 'rh' },
        { midi: 66, onset: 1920, duration: 120, hand: 'rh' },
        { midi: 71, onset: 1920, duration: 120, hand: 'rh' },
        { midi: 60, onset: 2280, duration: 120, hand: 'rh' },
        { midi: 66, onset: 2280, duration: 120, hand: 'rh' },
        { midi: 71, onset: 2280, duration: 120, hand: 'rh' },
        { midi: 60, onset: 2880, duration: 120, hand: 'rh' },
        { midi: 66, onset: 2880, duration: 120, hand: 'rh' },
        { midi: 71, onset: 2880, duration: 120, hand: 'rh' },
        { midi: 60, onset: 3120, duration: 120, hand: 'rh' },
        { midi: 66, onset: 3120, duration: 120, hand: 'rh' },
        { midi: 71, onset: 3120, duration: 120, hand: 'rh' },
        // Bar 3 — Am9 return
        { midi: 45, onset: 3840, duration: 460, hand: 'lh' },
        { midi: 45, onset: 4800, duration: 460, hand: 'lh' },
        { midi: 60, onset: 3840, duration: 120, hand: 'rh' },
        { midi: 67, onset: 3840, duration: 120, hand: 'rh' },
        { midi: 71, onset: 3840, duration: 120, hand: 'rh' },
        { midi: 60, onset: 4200, duration: 120, hand: 'rh' },
        { midi: 67, onset: 4200, duration: 120, hand: 'rh' },
        { midi: 71, onset: 4200, duration: 120, hand: 'rh' },
        { midi: 60, onset: 4800, duration: 120, hand: 'rh' },
        { midi: 67, onset: 4800, duration: 120, hand: 'rh' },
        { midi: 71, onset: 4800, duration: 120, hand: 'rh' },
        { midi: 60, onset: 5040, duration: 120, hand: 'rh' },
        { midi: 67, onset: 5040, duration: 120, hand: 'rh' },
        { midi: 71, onset: 5040, duration: 120, hand: 'rh' },
        // Bar 4 — E7#5: LH E2, RH D4-G#4-C5
        { midi: 40, onset: 5760, duration: 460, hand: 'lh' },
        { midi: 40, onset: 6720, duration: 460, hand: 'lh' },
        { midi: 62, onset: 5760, duration: 120, hand: 'rh' }, // D4
        { midi: 68, onset: 5760, duration: 120, hand: 'rh' }, // G#4
        { midi: 72, onset: 5760, duration: 120, hand: 'rh' }, // C5
        { midi: 62, onset: 6120, duration: 120, hand: 'rh' },
        { midi: 68, onset: 6120, duration: 120, hand: 'rh' },
        { midi: 72, onset: 6120, duration: 120, hand: 'rh' },
        { midi: 62, onset: 6720, duration: 120, hand: 'rh' },
        { midi: 68, onset: 6720, duration: 120, hand: 'rh' },
        { midi: 72, onset: 6720, duration: 120, hand: 'rh' },
        { midi: 62, onset: 6960, duration: 120, hand: 'rh' },
        { midi: 68, onset: 6960, duration: 120, hand: 'rh' },
        { midi: 72, onset: 6960, duration: 120, hand: 'rh' },
        // bar 5: final downbeat — LH A2 + RH Am9
        { midi: 45, onset: 7680, duration: 120, hand: 'lh' },
        { midi: 60, onset: 7680, duration: 120, hand: 'rh' },
        { midi: 67, onset: 7680, duration: 120, hand: 'rh' },
        { midi: 71, onset: 7680, duration: 120, hand: 'rh' },
      ],
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
    },
    {
      stepNumber: 98,
      module: 'funk_l2',
      section: 'D',
      subsection: 'D3: Integrated Performance',
      activity:
        'D3.2: Integrated Performance — Two-Bar Call and Answer (In Time)',
      direction:
        'Level 2 capstone: LH holds Am9, slides through Eb funk9 and D funk9. RH plays a two-bar call-and-answer melody. Both hands locked to the groove.',
      assessment: 'pitch_order_timing_duration',
      tag: 'funk:performance_capstone_l3b_it | funk',
      styleRef: 'l2b',
      successFeedback:
        'Funk Level 2 mastered — full two-hand vocabulary, in time.',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_chords_rh_melody',
        lh_role: 'chords',
        rh_role: 'melody',
        style_ref: 'l3b',
      },
      chordSymbols: ['Am9', 'Eb9', 'D9'],
      targetNotes: [
        // LH — Am9 [b3-b7-9]: C4-G4-B4, held quarter note + dotted half
        { midi: 60, onset: 0, duration: 1200, hand: 'lh' },
        { midi: 67, onset: 0, duration: 1200, hand: 'lh' },
        { midi: 71, onset: 0, duration: 1200, hand: 'lh' },
        // LH — Eb funk9 [b7-9-5]: Db4-F4-Bb4, eighth
        { midi: 61, onset: 1440, duration: 240, hand: 'lh' },
        { midi: 65, onset: 1440, duration: 240, hand: 'lh' },
        { midi: 70, onset: 1440, duration: 240, hand: 'lh' },
        // LH — D funk9 [b7-9-5]: C4-E4-A4, held into bar 2
        { midi: 60, onset: 1800, duration: 1320, hand: 'lh' },
        { midi: 64, onset: 1800, duration: 1320, hand: 'lh' },
        { midi: 69, onset: 1800, duration: 1320, hand: 'lh' },
        // RH — bar 1: call phrase (eighth rest, then G5-A5-G5-A5-C6)
        { midi: 79, onset: 240, duration: 240, hand: 'rh' }, // G5
        { midi: 81, onset: 480, duration: 240, hand: 'rh' }, // A5
        { midi: 79, onset: 720, duration: 120, hand: 'rh' }, // G5 (16th)
        { midi: 81, onset: 840, duration: 360, hand: 'rh' }, // A5 (dotted 8th)
        { midi: 84, onset: 1200, duration: 240, hand: 'rh' }, // C6
        // RH — bar 2: answer phrase (eighth rest, then C6-D6-C6-D6-C6)
        { midi: 84, onset: 2160, duration: 240, hand: 'rh' }, // C6
        { midi: 86, onset: 2400, duration: 240, hand: 'rh' }, // D6
        { midi: 84, onset: 2640, duration: 120, hand: 'rh' }, // C6 (16th)
        { midi: 86, onset: 2760, duration: 360, hand: 'rh' }, // D6 (dotted 8th)
        { midi: 84, onset: 3120, duration: 240, hand: 'rh' }, // C6
        // bar 3: final downbeat — LH Am9 + RH A5
        { midi: 60, onset: 3840, duration: 240, hand: 'lh' },
        { midi: 67, onset: 3840, duration: 240, hand: 'lh' },
        { midi: 71, onset: 3840, duration: 240, hand: 'lh' },
        { midi: 81, onset: 3840, duration: 240, hand: 'rh' }, // A5
      ],
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords', 'melody'],
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// L3 Wrapper
// ---------------------------------------------------------------------------

export const funkL3: ActivityFlowV2 = {
  genre: 'funk',
  level: 3,
  version: 'v2',
  title: 'Deep Groove',
  params: {
    defaultKey: 'C minor (Dorian)',
    defaultScale: [0, 2, 3, 5, 7, 9, 10], // C Dorian
    defaultScaleId: 'dorian',
    tempoRange: [85, 110],
    swing: 0,
    grooves: ['groove_funk_03', 'groove_funk_04'],
  },
  sections: [funkL2SectionA, funkL2SectionB, funkL2SectionC, funkL2SectionD],
};

// ---------------------------------------------------------------------------
// L2 Wrapper
// ---------------------------------------------------------------------------

export const funkL2: ActivityFlowV2 = {
  genre: 'funk',
  level: 2,
  version: 'v2',
  title: 'Syncopation & Sauce',
  params: {
    defaultKey: 'A minor (Dorian)',
    defaultScale: [0, 2, 3, 5, 7, 9, 10], // A Dorian
    defaultScaleId: 'dorian',
    tempoRange: [95, 108],
    swing: 0, // v2 note: swing not used at ActivityFlow level — defined per sub-profile in styleDna/funk.v2.ts
    grooves: ['groove_funk_01', 'groove_funk_02', 'groove_funk_03'],
  },
  sections: [funkL3SectionA, funkL3SectionB, funkL3SectionC, funkL3SectionD],
};

export const funkL1: ActivityFlowV2 = {
  genre: 'funk',
  level: 1,
  version: 'v2',
  title: 'The Pocket',
  params: {
    defaultKey: 'D minor (Dorian)',
    defaultScale: [0, 3, 5, 7, 10], // minor pentatonic
    defaultScaleId: 'minor_pentatonic',
    tempoRange: [88, 96],
    swing: 0, // v2 note: swing not used at ActivityFlow level — defined per sub-profile in styleDna/funk.v2.ts
    grooves: ['groove_funk_01', 'groove_funk_02'],
  },
  sections: [funkL1SectionA, funkL1SectionB, funkL1SectionC, funkL1SectionD],
};

export const funkFlows = [funkL1, funkL2, funkL3] as const;
