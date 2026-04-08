/**
 * Funk v2 — Activity Flows.
 * Source of truth: Funk_v2_Activity_Flow_Spec.md + Funk_Genre_Parameter_Profile.md
 * // pending backend migration
 */

import type { ActivityFlowV2, ActivitySectionV2 } from '../../types/activity.v2';

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
      contentGeneration:
        'GCM v8: FUNK L1 melody scale=minor_pentatonic [0,3,5,7,10]. Key: D minor. Contour: ascending stepwise. Register: C4-C5.',
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
      contentGeneration:
        'GCM v8: FUNK L1 melody scale=minor_pentatonic [0,3,5,7,10]. Key: D minor. Contour: descending stepwise. Register: C5-C4.',
    },
    {
      stepNumber: 3,
      module: 'funk_l1',
      section: 'A',
      subsection: 'A1: Scale (D Minor Pentatonic / Blues)',
      activity: 'A1.3: D Minor Pentatonic Ascending (In Time)',
      direction: 'In a steady tempo, play the D minor pentatonic scale going up.',
      assessment: 'pitch_order_timing',
      tag: 'funk:minor_pentatonic_ascending_it | funk',
      styleRef: 'l1a',
      successFeedback: 'Good timing — keep that pulse steady.',
      contentGeneration:
        'GCM v8: FUNK L1 melody scale=minor_pentatonic [0,3,5,7,10]. Key: D minor. Contour: ascending stepwise. Register: C4-C5. Tempo: 88-96 BPM quarter-note pulse.',
    },
    {
      stepNumber: 4,
      module: 'funk_l1',
      section: 'A',
      subsection: 'A1: Scale (D Minor Pentatonic / Blues)',
      activity: 'A1.4: D Minor Pentatonic Descending (In Time)',
      direction: 'In a steady tempo, play the D minor pentatonic scale going down.',
      assessment: 'pitch_order_timing',
      tag: 'funk:minor_pentatonic_descending_it | funk',
      styleRef: 'l1a',
      successFeedback: 'Locked in — descending with confidence.',
      contentGeneration:
        'GCM v8: FUNK L1 melody scale=minor_pentatonic [0,3,5,7,10]. Key: D minor. Contour: descending stepwise. Register: C5-C4. Tempo: 88-96 BPM quarter-note pulse.',
    },
    {
      stepNumber: 5,
      module: 'funk_l1',
      section: 'A',
      subsection: 'A1: Scale (D Minor Pentatonic / Blues)',
      activity: 'A1.5: D Minor Blues Scale Ascending (Out of Time)',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      direction: 'Play the D minor blues scale going up. Listen for the blue note (Ab).',
      assessment: 'pitch_only',
      tag: 'funk:minor_blues_ascending_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'Nice — that blue note adds the grit.',
      contentGeneration:
        'GCM v8: FUNK L1 melody scale_alt=minor_blues [0,3,5,6,7,10]. Key: D minor. Contour: ascending stepwise. Register: C4-C5.',
    },
    {
      stepNumber: 6,
      module: 'funk_l1',
      section: 'A',
      subsection: 'A1: Scale (D Minor Pentatonic / Blues)',
      activity: 'A1.6: D Minor Blues Scale Ascending (In Time)',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      direction: 'In a steady tempo, play the D minor blues scale going up.',
      assessment: 'pitch_order_timing',
      tag: 'funk:minor_blues_ascending_it | funk',
      styleRef: 'l1a',
      successFeedback: 'Blues scale in the pocket — great feel.',
      contentGeneration:
        'GCM v8: FUNK L1 melody scale_alt=minor_blues [0,3,5,6,7,10]. Key: D minor. Contour: ascending stepwise. Register: C4-C5. Tempo: 88-96 BPM quarter-note pulse.',
    },

    // ── A2: Melodic Phrases (6 steps) ────────────────────────────────────
    {
      stepNumber: 7,
      module: 'funk_l1',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.1: 1-Bar Phrase — Shape A (Out of Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction: 'Learn this 1-bar funk phrase: anchor note, short cluster, back to anchor.',
      assessment: 'pitch_only',
      tag: 'funk:phrase_shape_a_1bar_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'That anchor-cluster-anchor shape is the foundation of funk melody.',
      contentGeneration:
        'GCM v8: FUNK L1 melody phrase → shape_a (anchor→cluster→anchor). Melody_Phrase_Rhythm_Library: genre=funk, bar_count=1, contour_notes=3, rhythm_tiers=[1,2], zero_point_options=[0]. Melody_Contour_Library: contour_tiers=[1,2], contour=anchor_cluster_anchor. Scale: minor_pentatonic [0,3,5,7,10]. Register: C4-C5.',
      targetNotes: [
        { midi: 69, onset: 0, duration: 480 },    // A4 anchor
        { midi: 72, onset: 480, duration: 240 },   // C5 cluster
        { midi: 74, onset: 720, duration: 240 },   // D5 cluster
        { midi: 69, onset: 960, duration: 960 },   // A4 anchor resolve (long)
      ],
    },
    {
      stepNumber: 8,
      module: 'funk_l1',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.2: 1-Bar Phrase — Shape A (In Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction: 'Play the same phrase in time with the click.',
      assessment: 'pitch_order_timing',
      tag: 'funk:phrase_shape_a_1bar_it | funk',
      styleRef: 'l1a',
      successFeedback: 'Shape A in the groove — that rhythm is yours now.',
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
      activity: 'A2.3: 1-Bar Phrase — Shape C (Out of Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction: 'Learn this phrase: stepwise walk, ornament, then resolve to an anchor.',
      assessment: 'pitch_only',
      tag: 'funk:phrase_shape_c_1bar_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'Walk-ornament-anchor — a different color from Shape A.',
      contentGeneration:
        'GCM v8: FUNK L1 melody phrase → shape_c (walk→ornament→anchor). Melody_Phrase_Rhythm_Library: genre=funk, bar_count=1, contour_notes=3, rhythm_tiers=[1,2], zero_point_options=[0]. Melody_Contour_Library: contour_tiers=[1,2], contour=walk_ornament_anchor. Scale: minor_pentatonic [0,3,5,7,10]. Register: C4-C5.',
      targetNotes: [
        { midi: 62, onset: 0, duration: 480 },    // D4 walk start
        { midi: 65, onset: 480, duration: 240 },   // F4 step up
        { midi: 67, onset: 720, duration: 240 },   // G4 ornament
        { midi: 69, onset: 960, duration: 960 },   // A4 anchor resolve (long)
      ],
    },
    {
      stepNumber: 10,
      module: 'funk_l1',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.4: 1-Bar Phrase — Shape C (In Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction: 'Play the Shape C phrase in time with the click.',
      assessment: 'pitch_order_timing',
      tag: 'funk:phrase_shape_c_1bar_it | funk',
      styleRef: 'l1a',
      successFeedback: 'Shape C locked in — two phrase shapes in your toolkit.',
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
      direction: 'Learn a 2-bar phrase: the first bar calls, the second bar answers.',
      assessment: 'pitch_only',
      tag: 'funk:phrase_call_answer_2bar_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'Call and answer — the conversational heart of funk melody.',
      contentGeneration:
        'GCM v8: FUNK L1 melody phrase → call_answer. Melody_Phrase_Rhythm_Library: genre=funk, bar_count=2, contour_notes=3, rhythm_tiers=[1,2], zero_point_options=[0], contour_concat=1→2. Melody_Contour_Library: contour_tiers=[1,2], contour=call_answer (bar1=shape_a, bar2=shape_a_varied_tail). Scale: minor_pentatonic [0,3,5,7,10]. Register: C4-C5.',
      targetNotes: [
        // Bar 1: call
        { midi: 69, onset: 0, duration: 480 },    // A4
        { midi: 72, onset: 480, duration: 240 },   // C5
        { midi: 74, onset: 720, duration: 240 },   // D5
        { midi: 72, onset: 960, duration: 960 },   // C5 long (call ends)
        // Bar 2: answer (same rhythm, resolves lower)
        { midi: 69, onset: 1920, duration: 480 },  // A4
        { midi: 72, onset: 2400, duration: 240 },   // C5
        { midi: 74, onset: 2640, duration: 240 },   // D5
        { midi: 69, onset: 2880, duration: 960 },   // A4 long resolve
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
      successFeedback: 'Two bars of funk conversation — you are speaking the language.',
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
      direction: 'Play your melody over a full funk groove. Drums, bass, and chords are provided — you bring the melody.',
      assessment: 'pitch_order_timing',
      tag: 'funk:melody_playalong_l1 | funk',
      styleRef: 'l1a',
      successFeedback: 'You just played a funk melody over a live groove — that is the real thing.',
      contentGeneration:
        'GCM v8: FUNK L1 melody play-along. Generate 4-bar melody: Melody_Phrase_Rhythm_Library (genre=funk, phrase_rhythm_bars=1, contour_notes=3, rhythm_tiers=[1,2], contour_concat=1→2). Melody_Contour_Library: contour_tiers=[1,2], motivic structure A-B-A-B. Scale: minor_pentatonic [0,3,5,7,10]. Register: C4-C5. Backing: drums (groove_funk_01) + bass (bass_c_r8_01 or bass_c_funk_01; bass_r_funk_01) + chords (1 min7 - 4 dom7 Dm7→G7; voicing=shell_1_b3_b7 [0,3,10]; comp_funk_s1 [[0,120],[360,120],[960,120],[1200,120]]). Tempo: 88-96 BPM. Style: l1a.',
      targetNotes: [
        // Bar 1: call phrase
        { midi: 69, onset: 0, duration: 480 },    // A4
        { midi: 72, onset: 480, duration: 240 },   // C5
        { midi: 74, onset: 720, duration: 240 },   // D5
        { midi: 72, onset: 960, duration: 960 },   // C5 long
        // Bar 2: answer phrase
        { midi: 69, onset: 1920, duration: 480 },  // A4
        { midi: 72, onset: 2400, duration: 240 },   // C5
        { midi: 74, onset: 2640, duration: 240 },   // D5
        { midi: 69, onset: 2880, duration: 960 },   // A4 long resolve
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
      activity: 'A3.2: Melody Play-Along — New Key (In Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction: 'Same type of melody, brand new key. Prove your ears work in any key.',
      assessment: 'pitch_order_timing',
      tag: 'funk:melody_playalong_newkey_l1 | funk',
      styleRef: 'l1a',
      successFeedback: 'New key, same pocket. Your melody skills transfer.',
      contentGeneration:
        'GCM v8: FUNK L1 melody play-along — transposed key. key_center: runtime (exclude D minor, key_unlock_order: D→G→A→C→E→Bb). Generate 4-bar melody: Melody_Phrase_Rhythm_Library (genre=funk, phrase_rhythm_bars=1, contour_notes=3, rhythm_tiers=[1,2], contour_concat=1→2). Melody_Contour_Library: contour_tiers=[1,2], motivic structure A-B-A-B. Scale: minor_pentatonic [0,3,5,7,10] in new key. Register: C4-C5. Backing: drums (groove_funk_01) + bass (bass_c_r8_01; bass_r_funk_01) + chords (1 min7 - 4 dom7; voicing=shell_1_b3_b7 [0,3,10]; comp_funk_s1). Tempo: 88-96 BPM. Style: l1a.',
      targetNotes: [
        // Bar 1: call (slight variation from A3.1)
        { midi: 69, onset: 0, duration: 480 },    // A4
        { midi: 67, onset: 480, duration: 240 },   // G4
        { midi: 69, onset: 720, duration: 240 },   // A4
        { midi: 72, onset: 960, duration: 960 },   // C5 long
        // Bar 2: answer
        { midi: 74, onset: 1920, duration: 480 },  // D5
        { midi: 72, onset: 2400, duration: 240 },   // C5
        { midi: 69, onset: 2640, duration: 240 },   // A4
        { midi: 67, onset: 2880, duration: 960 },   // G4 long resolve
      ],
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
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
      direction: 'Play the notes of a Dm7 chord one at a time going up: D-F-A-C.',
      assessment: 'pitch_only',
      tag: 'funk:arpeggiate_dm7_ascending_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'Dm7 shape locked — root, minor 3rd, 5th, flat 7th.',
      contentGeneration:
        'GCM v8: chord_types min7 [0,3,7,10]. Chord_Quality_Library: quality=min7, root=D. Contour: ascending root position (1-b3-5-b7). Register: C3-C5.',
      targetNotes: [
        { midi: 62, onset: 0, duration: 480 },    // D4 — root
        { midi: 65, onset: 480, duration: 480 },   // F4 — b3
        { midi: 69, onset: 960, duration: 480 },   // A4 — 5th
        { midi: 72, onset: 1440, duration: 480 },  // C5 — b7
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
      successFeedback: 'Descending just as clean — you know this chord inside out.',
      contentGeneration:
        'GCM v8: chord_types min7 [0,3,7,10]. Chord_Quality_Library: quality=min7, root=D. Contour: descending root position (b7-5-b3-1). Register: C5-C3.',
      targetNotes: [
        { midi: 72, onset: 0, duration: 480 },    // C5 — b7
        { midi: 69, onset: 480, duration: 480 },   // A4 — 5th
        { midi: 65, onset: 960, duration: 480 },   // F4 — b3
        { midi: 62, onset: 1440, duration: 480 },  // D4 — root
      ],
    },
    {
      stepNumber: 17,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B1: Arpeggiate Chords',
      activity: 'B1.3: Dm7 Arpeggio Ascending (In Time)',
      scaleIntervals: [0, 3, 7, 10],
      direction: 'In a steady tempo, arpeggiate Dm7 going up.',
      assessment: 'pitch_order_timing',
      tag: 'funk:arpeggiate_dm7_ascending_it | funk',
      styleRef: 'l1a',
      successFeedback: 'Dm7 in time — smooth and even.',
      contentGeneration:
        'GCM v8: chord_types min7 [0,3,7,10]. Chord_Quality_Library: quality=min7, root=D. Contour: ascending root position (1-b3-5-b7). Register: C3-C5. Tempo: 88-96 BPM quarter-note pulse.',
      targetNotes: [
        { midi: 62, onset: 0, duration: 480 },    // D4
        { midi: 65, onset: 480, duration: 480 },   // F4
        { midi: 69, onset: 960, duration: 480 },   // A4
        { midi: 72, onset: 1440, duration: 480 },  // C5
      ],
    },
    {
      stepNumber: 18,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B1: Arpeggiate Chords',
      activity: 'B1.4: Gm7 Arpeggio (Out of Time)',
      direction: 'Play the notes of a Gm7 chord one at a time: G-Bb-D-F.',
      assessment: 'pitch_only',
      tag: 'funk:arpeggiate_gm7_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'Gm7 — the 4 min7 chord in D minor. You are building your harmonic vocabulary.',
      contentGeneration:
        'GCM v8: chord_types min7 [0,3,7,10]. Chord_Quality_Library: quality=min7, root=G. Contour: ascending root position (1-b3-5-b7). Register: C3-C5.',
      targetNotes: [
        { midi: 55, onset: 0, duration: 460 },    // G3
        { midi: 58, onset: 480, duration: 460 },   // Bb3
        { midi: 62, onset: 960, duration: 460 },   // D4
        { midi: 65, onset: 1440, duration: 460 },  // F4
      ],
    },
    {
      stepNumber: 19,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B1: Arpeggiate Chords',
      activity: 'B1.5: Gm7 Arpeggio (In Time)',
      direction: 'In a steady tempo, arpeggiate Gm7.',
      assessment: 'pitch_order_timing',
      tag: 'funk:arpeggiate_gm7_it | funk',
      styleRef: 'l1a',
      successFeedback: 'Gm7 in the pocket.',
      contentGeneration:
        'GCM v8: chord_types min7 [0,3,7,10]. Chord_Quality_Library: quality=min7, root=G. Contour: ascending root position (1-b3-5-b7). Register: C3-C5. Tempo: 88-96 BPM quarter-note pulse.',
      targetNotes: [
        { midi: 55, onset: 0, duration: 460 },    // G3
        { midi: 58, onset: 480, duration: 460 },   // Bb3
        { midi: 62, onset: 960, duration: 460 },   // D4
        { midi: 65, onset: 1440, duration: 460 },  // F4
      ],
    },
    {
      stepNumber: 20,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B1: Arpeggiate Chords',
      activity: 'B1.6: Am7 Arpeggio (Out of Time)',
      direction: 'Play the notes of an Am7 chord one at a time: A-C-E-G.',
      assessment: 'pitch_only',
      tag: 'funk:arpeggiate_am7_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'Am7 — the v chord. Three chord shapes down.',
      contentGeneration:
        'GCM v8: chord_types min7 [0,3,7,10]. Chord_Quality_Library: quality=min7, root=A. Contour: ascending root position (1-b3-5-b7). Register: C3-C5.',
      targetNotes: [
        { midi: 57, onset: 0, duration: 460 },    // A3
        { midi: 60, onset: 480, duration: 460 },   // C4
        { midi: 64, onset: 960, duration: 460 },   // E4
        { midi: 67, onset: 1440, duration: 460 },  // G4
      ],
    },
    {
      stepNumber: 21,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B1: Arpeggiate Chords',
      activity: 'B1.7: Am7 Arpeggio (In Time)',
      direction: 'In a steady tempo, arpeggiate Am7.',
      assessment: 'pitch_order_timing',
      tag: 'funk:arpeggiate_am7_it | funk',
      styleRef: 'l1a',
      successFeedback: 'Three chords, all smooth in time. Ready for voicings.',
      contentGeneration:
        'GCM v8: chord_types min7 [0,3,7,10]. Chord_Quality_Library: quality=min7, root=A. Contour: ascending root position (1-b3-5-b7). Register: C3-C5. Tempo: 88-96 BPM quarter-note pulse.',
      targetNotes: [
        { midi: 57, onset: 0, duration: 460 },    // A3
        { midi: 60, onset: 480, duration: 460 },   // C4
        { midi: 64, onset: 960, duration: 460 },   // E4
        { midi: 67, onset: 1440, duration: 460 },  // G4
      ],
    },

    // ── B2: Voicings (6 steps) ───────────────────────────────────────────
    {
      stepNumber: 22,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.1: Dm7 Shell Voicing (1-b3-b7) (Out of Time)',
      direction: 'Play the Dm7 shell voicing: D, F, C. Root, minor 3rd, flat 7th — the essential skeleton.',
      assessment: 'pitch_only',
      tag: 'funk:dm7_shell_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'Shell voicing — three notes, all the harmonic information you need.',
      contentGeneration:
        'GCM v8: min7 [0,3,7,10]. Genre_Voicing_Taxonomy: quality=min7, voicing=shell_1_b3_b7. RH: [0,3,10]. Root=D. Register: C3-C5.',
      targetNotes: [
        { midi: 62, onset: 0, duration: 1920 },   // D4 — root
        { midi: 65, onset: 0, duration: 1920 },   // F4 — b3
        { midi: 72, onset: 0, duration: 1920 },   // C5 — b7
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
        { midi: 62, onset: 0,    duration: 120 },  // D4
        { midi: 65, onset: 0,    duration: 120 },  // F4
        { midi: 72, onset: 0,    duration: 120 },  // C5
        { midi: 62, onset: 360,  duration: 120 },
        { midi: 65, onset: 360,  duration: 120 },
        { midi: 72, onset: 360,  duration: 120 },
        { midi: 62, onset: 960,  duration: 120 },
        { midi: 65, onset: 960,  duration: 120 },
        { midi: 72, onset: 960,  duration: 120 },
        { midi: 62, onset: 1200, duration: 120 },
        { midi: 65, onset: 1200, duration: 120 },
        { midi: 72, onset: 1200, duration: 120 },
      ],
    },
    // TODO: Genre_Voicing_Taxonomy_v2 — add entry: quality=dom7, voicing=sizzle_from_1min7, rh_override=[7,10,16] relative to G root
    {
      stepNumber: 24,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.3: G7 Drop the Sizzle Voicing (Out of Time)',
      direction: 'Now play G7: D, F, B — same hand position, just the C slides down a half step to B. That\'s Drop the Sizzle.',
      assessment: 'pitch_only',
      tag: 'funk:g7_sizzle_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'Drop the Sizzle — one note moves, the whole harmony shifts.',
      contentGeneration:
        'GCM v8: dom7 [0,4,7,10]. Genre_Voicing_Taxonomy: quality=dom7, voicing=sizzle_from_1min7. RH: [7,10,16] relative to G root (D-F-B, same register as Dm7 shell). Sizzle rule: Dm7 b7 (C) drops half step → G7 3rd (B). Register: C3-C5.',
      targetNotes: [
        { midi: 62, onset: 0, duration: 1920 },  // D4 — 5th of G
        { midi: 65, onset: 0, duration: 1920 },  // F4 — b7 of G
        { midi: 71, onset: 0, duration: 1920 },  // B4 — 3rd of G (sizzle)
      ],
    },
    // TODO: Genre_Voicing_Taxonomy_v2 — add entry: quality=dom7, voicing=sizzle_from_1min7, rh_override=[7,10,16] relative to G root
    {
      stepNumber: 25,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.4: Dm7→G7 Voicing Sequence (Out of Time)',
      direction: 'Play Dm7 shell then G7 Sizzle voicing back to back. Only the C moves — down a half step to B.',
      assessment: 'pitch_order_timing',
      tag: 'funk:dm7_g7_sizzle_sequence_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'Voice leading through changes — one note moves, the whole harmony shifts.',
      contentGeneration:
        'Genre_Voicing_Taxonomy: progression 1 min7 - 4 dom7 (Dm7→G7). Dm7: shell_1_b3_b7 [0,3,10] relative to D (D-F-C). G7: sizzle [7,10,16] relative to G (D-F-B). Sizzle rule: C→B half-step drop. Register: C3-C5.',
      chordSymbols: ['Dm7', 'G7'],
      targetNotes: [
        // Dm7 shell (held)
        { midi: 62, onset: 0,    duration: 1800 },  // D4
        { midi: 65, onset: 0,    duration: 1800 },  // F4
        { midi: 72, onset: 0,    duration: 1800 },  // C5
        // G7 sizzle (held) — C→B is the only voice that moves
        { midi: 62, onset: 1920, duration: 1800 },  // D4 (stays)
        { midi: 65, onset: 1920, duration: 1800 },  // F4 (stays)
        { midi: 71, onset: 1920, duration: 1800 },  // B4 (sizzle drop)
      ],
    },
    {
      stepNumber: 26,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.5: Dm7→G7 Voicing Sequence (In Time)',
      direction: 'Play the Dm7→G7 Sizzle sequence in time. Funk Stab 1 rhythm, one chord per bar.',
      assessment: 'pitch_order_timing',
      tag: 'funk:dm7_g7_sizzle_sequence_it | funk',
      styleRef: 'l1a',
      successFeedback: 'Sizzle in the pocket — that voice leading is automatic now.',
      contentGeneration:
        'Genre_Voicing_Taxonomy: progression 1 min7 - 4 dom7 (Dm7→G7). Dm7: shell_1_b3_b7 [0,3,10] relative to D (D-F-C). G7: sizzle [7,10,16] relative to G (D-F-B). Sizzle rule: C→B half-step drop. Register: C3-C5. Tempo: 88-96 BPM, one chord per bar.',
      chordSymbols: ['Dm7', 'G7'],
      targetNotes: [
        // Bar 1: Dm7 — Funk Stab 1 [0, 360, 960, 1200]
        { midi: 62, onset: 0,    duration: 120 },
        { midi: 65, onset: 0,    duration: 120 },
        { midi: 72, onset: 0,    duration: 120 },
        { midi: 62, onset: 360,  duration: 120 },
        { midi: 65, onset: 360,  duration: 120 },
        { midi: 72, onset: 360,  duration: 120 },
        { midi: 62, onset: 960,  duration: 120 },
        { midi: 65, onset: 960,  duration: 120 },
        { midi: 72, onset: 960,  duration: 120 },
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
      ],
    },
    {
      stepNumber: 27,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.6: Funk9 Voicing (b7-9-5) (Out of Time)',
      direction: 'Play the signature funk voicing: b7-9-5. On a D chord: C-E-A. Open, ambiguous, funky.',
      assessment: 'pitch_only',
      tag: 'funk:funk9_voicing_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'The funk9 voicing — omit root and 3rd, pure funk ambiguity.',
      contentGeneration:
        'GCM v8: funk9 voicing [-2,2,7] (b7-9-5, omit 3). Genre_Voicing_Taxonomy: quality=dom9, voicing=funk9. RH: rh_override=[-2,2,7]. Root=D. LH=root_bass. Register: C3-C5.',
      targetNotes: [
        { midi: 60, onset: 0, duration: 1920 },  // C4 — b7
        { midi: 64, onset: 0, duration: 1920 },  // E4 — 9
        { midi: 69, onset: 0, duration: 1920 },  // A4 — 5
      ],
    },

    // ── B3: Progressions (3 steps) ───────────────────────────────────────
    {
      stepNumber: 28,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B3: Funk Progressions',
      activity: 'B3.1: 1 min7 - 4 dom7 - 1 min7 Vamp (Dm7 - G7 - Dm7) (Out of Time)',
      direction: 'Play the 1 min7 - 4 dom7 - 1 min7 funk vamp: Dm7 → G7 → Dm7. Use shell voicings.',
      assessment: 'pitch_only',
      tag: 'funk:progression_i_IV_i_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'The two-chord funk vamp — this is the engine room of funk.',
      contentGeneration:
        'GCM v8: FUNK L1 progressions: 1 min7 - 4 dom7 (two-chord vamp). HKB v2: Dm7→G7→Dm7. Dm7: shell_1_b3_b7 [0,3,10] relative to D (D-F-C). G7: sizzle [7,10,16] relative to G (D-F-B). Sizzle rule: C→B half-step drop. Register: C3-C5.',
      chordSymbols: ['Dm7', 'G7', 'Dm7'],
      targetNotes: [
        // Bar 1: Dm7 shell (held)
        { midi: 62, onset: 0,    duration: 1800 },  // D4
        { midi: 65, onset: 0,    duration: 1800 },  // F4
        { midi: 72, onset: 0,    duration: 1800 },  // C5
        // Bar 2: G7 sizzle (held)
        { midi: 62, onset: 1920, duration: 1800 },  // D4
        { midi: 65, onset: 1920, duration: 1800 },  // F4
        { midi: 71, onset: 1920, duration: 1800 },  // B4
        // Bar 3: Dm7 shell (held)
        { midi: 62, onset: 3840, duration: 1800 },  // D4
        { midi: 65, onset: 3840, duration: 1800 },  // F4
        { midi: 72, onset: 3840, duration: 1800 },  // C5
      ],
    },
    {
      stepNumber: 29,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B3: Funk Progressions',
      activity: 'B3.2: 1 min7 - 4 dom7 - 1 min7 Vamp (In Time)',
      direction: 'Play the 1 min7 - 4 dom7 - 1 min7 vamp in time. Funk Stab 1 rhythm, one chord per bar.',
      assessment: 'pitch_order_timing',
      tag: 'funk:progression_i_IV_i_it | funk',
      styleRef: 'l1a',
      successFeedback: 'Vamp in the groove — this is what funk keyboard players live on.',
      contentGeneration:
        'GCM v8: FUNK L1 progressions: 1 min7 - 4 dom7 (two-chord vamp). HKB v2: Dm7→G7→Dm7. Dm7: shell_1_b3_b7 [0,3,10] relative to D (D-F-C). G7: sizzle [7,10,16] relative to G (D-F-B). Sizzle rule: C→B half-step drop. Register: C3-C5. Tempo: 88-96 BPM, one chord per bar.',
      chordSymbols: ['Dm7', 'G7', 'Dm7'],
      targetNotes: [
        // Bar 1: Dm7 — Funk Stab 1
        { midi: 62, onset: 0,    duration: 120 },
        { midi: 65, onset: 0,    duration: 120 },
        { midi: 72, onset: 0,    duration: 120 },
        { midi: 62, onset: 360,  duration: 120 },
        { midi: 65, onset: 360,  duration: 120 },
        { midi: 72, onset: 360,  duration: 120 },
        { midi: 62, onset: 960,  duration: 120 },
        { midi: 65, onset: 960,  duration: 120 },
        { midi: 72, onset: 960,  duration: 120 },
        { midi: 62, onset: 1200, duration: 120 },
        { midi: 65, onset: 1200, duration: 120 },
        { midi: 72, onset: 1200, duration: 120 },
        // Bar 2: G7 — Funk Stab 1 (sizzle)
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
        // Bar 3: Dm7 — Funk Stab 1
        { midi: 62, onset: 3840, duration: 120 },
        { midi: 65, onset: 3840, duration: 120 },
        { midi: 72, onset: 3840, duration: 120 },
        { midi: 62, onset: 4200, duration: 120 },
        { midi: 65, onset: 4200, duration: 120 },
        { midi: 72, onset: 4200, duration: 120 },
        { midi: 62, onset: 4800, duration: 120 },
        { midi: 65, onset: 4800, duration: 120 },
        { midi: 72, onset: 4800, duration: 120 },
        { midi: 62, onset: 5040, duration: 120 },
        { midi: 65, onset: 5040, duration: 120 },
        { midi: 72, onset: 5040, duration: 120 },
      ],
    },
    // ── B4: Chord Play-Along (1 step) ────────────────────────────────────
    {
      stepNumber: 31,
      module: 'funk_l1',
      section: 'B',
      subsection: 'B4: Chord Play-Along',
      activity: 'B4.1: Chord Comping over Funk L1 Backing (In Time)',
      direction: 'Comp chords over a full funk groove. Drums and bass are provided — you bring the chords with a Funk Stab pattern.',
      assessment: 'pitch_order_timing',
      tag: 'funk:chords_playalong_l1 | funk',
      styleRef: 'l1a',
      successFeedback: 'Comping over a live groove — you are the rhythm section now.',
      chordSymbols: ['Dm7', 'G7'],
      contentGeneration:
        'GCM v8: FUNK L1 chord play-along. Progression: 1 min7 - 4 dom7 (Dm7→G7). Voicings: min7 7-3-5 [-2,3,7], dom7 7-3-5 [-2,4,7]. Comping: comp_funk_s1 [[0,120],[360,120],[960,120],[1200,120]] (primary) or comp_funk_s2 [[0,120],[360,120],[720,120],[960,120],[1200,120],[1320,120]] (secondary). Stab note duration: 120t (hard rule). Stab rhythm: 16th grid (240t per subdivision). Backing: drums (groove_funk_01) + bass (bass_c_r8_01 or bass_c_funk_01; bass_r_funk_01). Tempo: 88-96 BPM. Style: l1a.',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
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
      direction: 'Play the D minor pentatonic scale in the bass register (octave 3) going up.',
      assessment: 'pitch_only',
      tag: 'funk:bass_minor_pentatonic_ascending_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'Pentatonic in the bass range — this is where funk bass lives.',
      contentGeneration:
        'GCM v8: FUNK L1 bass scale=minor_pentatonic [0,3,5,7,10]. Key: D minor. Contour: ascending stepwise. Register: octave 3 (D3=50 to D4=62).',
      targetNotes: [
        { midi: 50, onset: 0,    duration: 240 },  // D3
        { midi: 53, onset: 240,  duration: 240 },  // F3
        { midi: 55, onset: 480,  duration: 240 },  // G3
        { midi: 57, onset: 720,  duration: 240 },  // A3
        { midi: 60, onset: 960,  duration: 240 },  // C4
        { midi: 62, onset: 1200, duration: 480 },  // D4 (held)
      ],
    },
    {
      stepNumber: 33,
      module: 'funk_l1',
      section: 'C',
      subsection: 'C1: Bass Scale (D Minor Pentatonic)',
      activity: 'C1.2: D Minor Pentatonic Bass Descending (Out of Time)',
      direction: 'Play the D minor pentatonic scale in the bass register going down.',
      assessment: 'pitch_only',
      tag: 'funk:bass_minor_pentatonic_descending_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'Clean descent in the low end.',
      contentGeneration:
        'GCM v8: FUNK L1 bass scale=minor_pentatonic [0,3,5,7,10]. Key: D minor. Contour: descending stepwise. Register: octave 3 (D4=62 to D3=50).',
      targetNotes: [
        { midi: 62, onset: 0,    duration: 240 },  // D4
        { midi: 60, onset: 240,  duration: 240 },  // C4
        { midi: 57, onset: 480,  duration: 240 },  // A3
        { midi: 55, onset: 720,  duration: 240 },  // G3
        { midi: 53, onset: 960,  duration: 240 },  // F3
        { midi: 50, onset: 1200, duration: 480 },  // D3 (held)
      ],
    },
    {
      stepNumber: 34,
      module: 'funk_l1',
      section: 'C',
      subsection: 'C1: Bass Scale (D Minor Pentatonic)',
      activity: 'C1.3: D Minor Pentatonic Bass Ascending (In Time)',
      direction: 'In a steady tempo, play the D minor pentatonic bass scale going up.',
      assessment: 'pitch_order_timing',
      tag: 'funk:bass_minor_pentatonic_ascending_it | funk',
      styleRef: 'l1a',
      successFeedback: 'Bass scale in time — steady and grounded.',
      contentGeneration:
        'GCM v8: FUNK L1 bass scale=minor_pentatonic [0,3,5,7,10]. Key: D minor. Contour: ascending stepwise. Register: octave 3 (D3=50 to D4=62). Tempo: 88-96 BPM quarter-note pulse.',
      targetNotes: [
        { midi: 50, onset: 0,    duration: 240 },  // D3
        { midi: 53, onset: 240,  duration: 240 },  // F3
        { midi: 55, onset: 480,  duration: 240 },  // G3
        { midi: 57, onset: 720,  duration: 240 },  // A3
        { midi: 60, onset: 960,  duration: 240 },  // C4
        { midi: 62, onset: 1200, duration: 480 },  // D4 (held)
      ],
    },
    {
      stepNumber: 35,
      module: 'funk_l1',
      section: 'C',
      subsection: 'C1: Bass Scale (D Minor Pentatonic)',
      activity: 'C1.4: Root Notes on Beat 1 — Dm7→G7 (Out of Time)',
      scaleId: 'dorian',
      direction: 'Play just the root note of each chord on beat 1: D3 (Dm7), G3 (G7), D3 (Dm7).',
      assessment: 'pitch_only',
      tag: 'funk:bass_roots_beat1_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'Root on the one — the most fundamental bass job in funk.',
      contentGeneration:
        'GCM v8: FUNK L1 bass roots. Progression: 1 min7 - 4 dom7 (Dm7→G7). Bass note: root of each chord on beat 1. D3=50, G3=55. Register: octave 3.',
      chordSymbols: ['Dm7', 'G7'],
      targetNotes: [
        // Bar 1: Dm7
        { midi: 50, onset: 0,    duration: 1800 },  // D3 whole note
        // Bar 2: G7
        { midi: 55, onset: 1920, duration: 1800 },  // G3 whole note
        // Bar 3: Dm7
        { midi: 50, onset: 3840, duration: 1800 },  // D3 whole note
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
      successFeedback: 'Roots on the one, in the pocket. That is a bass player.',
      contentGeneration:
        'GCM v8: FUNK L1 bass roots. Progression: 1 min7 - 4 dom7 (Dm7→G7). Bass note: root of each chord on beat 1. D3=50, G3=55. Register: octave 3. Tempo: 88-96 BPM, one chord per bar.',
      chordSymbols: ['Dm7', 'G7'],
      targetNotes: [
        { midi: 50, onset: 0,    duration: 1800 },  // D3
        { midi: 55, onset: 1920, duration: 1800 },  // G3
        { midi: 50, onset: 3840, duration: 1800 },  // D3
      ],
    },
    {
      stepNumber: 37,
      module: 'funk_l1',
      section: 'C',
      subsection: 'C1: Bass Scale (D Minor Pentatonic)',
      activity: 'C1.6: Root + 5th Pattern (Out of Time)',
      scaleId: 'dorian',
      direction: 'Play root then 5th for each chord: D-A (Dm7), G-D (G7). Two notes per chord.',
      assessment: 'pitch_only',
      tag: 'funk:bass_root_5th_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'Root + 5th — you just doubled your bass vocabulary.',
      contentGeneration:
        'GCM v8: FUNK L1 bass contours=bass_c_r8_01. Pattern: root-fifth. Progression: 1 min7 - 4 dom7 (Dm7→G7). D3=50→A3=57, G3=55→D4=62. Register: octave 3.',
      chordSymbols: ['Dm7', 'G7'],
      targetNotes: [
        // Bar 1: Dm7 root + 5th
        { midi: 50, onset: 0,    duration: 460 },  // D3 root
        { midi: 57, onset: 480,  duration: 460 },  // A3 5th
        // Bar 2: G7 root + 5th
        { midi: 55, onset: 1920, duration: 460 },  // G3 root
        { midi: 62, onset: 2400, duration: 460 },  // D4 5th
      ],
    },

    // ── C2: Bass Techniques (4 steps) ────────────────────────────────────
    {
      stepNumber: 38,
      module: 'funk_l1',
      section: 'C',
      subsection: 'C2: Funk Bass Techniques',
      activity: 'C2.1: Root + Octave Pop — Larry Graham Pattern (Out of Time)',
      direction: 'Play root D3, then pop the octave D4. Low D, high D — the Larry Graham bounce.',
      assessment: 'pitch_only',
      tag: 'funk:bass_octave_pop_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'The octave pop — Larry Graham invented this sound.',
      contentGeneration:
        'GCM v8: FUNK L1 bass contours=bass_c_funk_01 (root-octave pop). Root=D3 (50), pop=D4 (62). Bass_Rhythm_Patterns: bass_r_funk_01 (beat1 root, and-of-2 octave pop). Register: octave 3.',
      targetNotes: [
        { midi: 50, onset: 0,    duration: 460 },  // D3 root
        { midi: 62, onset: 480,  duration: 460 },  // D4 octave pop
        { midi: 50, onset: 960,  duration: 460 },  // D3 root
        { midi: 62, onset: 1440, duration: 460 },  // D4 octave pop
      ],
    },
    {
      stepNumber: 39,
      module: 'funk_l1',
      section: 'C',
      subsection: 'C2: Funk Bass Techniques',
      activity: 'C2.2: Root + Octave Pop (In Time)',
      direction: 'In time, play the root-octave pop pattern. Root on beat 1, pop on the and of 2.',
      assessment: 'pitch_order_timing',
      tag: 'funk:bass_octave_pop_it | funk',
      styleRef: 'l1a',
      successFeedback: 'Octave pop in time — that bounce is the funk bass signature.',
      contentGeneration:
        'GCM v8: FUNK L1 bass contours=bass_c_funk_01 (root-octave pop). Root=D3 (50), pop=D4 (62). Bass_Rhythm_Patterns: bass_r_funk_01. Register: octave 3. Tempo: 88-96 BPM.',
      targetNotes: [
        { midi: 50, onset: 0,    duration: 460 },  // D3 root
        { midi: 62, onset: 480,  duration: 460 },  // D4 pop
        { midi: 50, onset: 960,  duration: 460 },  // D3 root
        { midi: 62, onset: 1440, duration: 460 },  // D4 pop
      ],
    },
    {
      stepNumber: 40,
      module: 'funk_l1',
      section: 'C',
      subsection: 'C2: Funk Bass Techniques',
      activity: 'C2.3: Chromatic Approach to Chord Root (Out of Time)',
      direction: 'Approach each chord root from one semitone below: C#3→D3, F#3→G3. The approach note leads into the target.',
      assessment: 'pitch_only',
      tag: 'funk:bass_chromatic_approach_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'Chromatic approach — one semitone of tension, then resolution.',
      contentGeneration:
        'GCM v8: FUNK L1 bass contours=bass_c_funk_02 (chromatic approach from below). Progression: 1 min7 - 4 dom7 (Dm7→G7). Approach: -1 semitone from each root (C#3=49→D3=50, F#3=54→G3=55). Register: octave 3.',
      chordSymbols: ['Dm7', 'G7'],
      targetNotes: [
        // Approach → Dm7
        { midi: 49, onset: 0,    duration: 240 },  // C#3 approach
        { midi: 50, onset: 240,  duration: 460 },  // D3  goal ↑
        // Approach → G7
        { midi: 54, onset: 960,  duration: 240 },  // F#3 approach
        { midi: 55, onset: 1200, duration: 460 },  // G3  goal ↑
      ],
    },
    {
      stepNumber: 41,
      module: 'funk_l1',
      section: 'C',
      subsection: 'C2: Funk Bass Techniques',
      activity: 'C2.4: Chromatic Approach (In Time)',
      direction: 'In time, play chromatic approaches into each chord root. Approach on a-of-3, root on beat 1 next bar.',
      assessment: 'pitch_order_timing',
      tag: 'funk:bass_chromatic_approach_it | funk',
      styleRef: 'l1a',
      successFeedback: 'Chromatic approach in time — smooth bass player move.',
      contentGeneration:
        'GCM v8: FUNK L1 bass contours=bass_c_funk_02 (chromatic approach from below). Progression: 1 min7 - 4 dom7 (Dm7→G7). Approach: -1 semitone on a-of-3, root on beat 1. Register: octave 3. Tempo: 88-96 BPM.',
      chordSymbols: ['Dm7', 'G7'],
      targetNotes: [
        // Bar 1: Dm7 root + approach to G
        { midi: 50, onset: 0,    duration: 360 },  // D3 root beat 1
        { midi: 50, onset: 840,  duration: 120 },  // D3 ba (16th pickup)
        { midi: 50, onset: 960,  duration: 360 },  // D3 doom beat 3
        { midi: 54, onset: 1560, duration: 120 },  // F#3 approach → G3 ↑
        // Bar 2: G7 root + approach to D
        { midi: 55, onset: 1920, duration: 360 },  // G3 root beat 1
        { midi: 55, onset: 2760, duration: 120 },  // G3 ba
        { midi: 55, onset: 2880, duration: 360 },  // G3 doom beat 3
        { midi: 49, onset: 3480, duration: 120 },  // C#3 approach → D3 ↑
      ],
    },

    // ── C3: Bass Play-Along (1 step) ─────────────────────────────────────
    {
      stepNumber: 42,
      module: 'funk_l1',
      section: 'C',
      subsection: 'C3: Bass Play-Along',
      activity: 'C3.1: Bass Line over Funk L1 Backing (In Time)',
      direction: 'Play your bass line over a full funk groove. Drums and chords are provided — you bring the bass.',
      assessment: 'pitch_order_timing_duration',
      tag: 'funk:bass_playalong_l1 | funk',
      styleRef: 'l1a',
      successFeedback: 'You just held down the low end over a live funk groove. That is the gig.',
      contentGeneration:
        'GCM v8: FUNK L1 bass play-along. Progression: 1 min7 - 4 dom7 (Dm7→G7). Bass_Contour_Patterns: bass_c_r8_01 (root-octave) or bass_c_funk_01. Bass_Rhythm_Patterns: bass_r_funk_01. Register: octave 3 (D3=50, G3=55). Backing: drums (groove_funk_01) + chords (Dm7 shell_1_b3_b7 [0,3,10], G7 sizzle [7,10,16]; comp_funk_s1 [[0,120],[360,120],[960,120],[1200,120]]). Tempo: 88-96 BPM. Style: l1a.',
      chordSymbols: ['Dm7', 'G7'],
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
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
    // TODO: ActivityStepV2 instrument_config — pending type merge by Ryan
    {
      stepNumber: 43,
      module: 'funk_l1',
      section: 'D',
      subsection: 'D1: LH Bass + RH Chords',
      activity: 'D1.1: LH Root Pattern + RH Funk Stab 1 (Out of Time)',
      direction: 'Both hands together: left hand plays root bass pattern (D2), right hand plays Dm7 rootless stabs. No tempo — just get both hands coordinated.',
      assessment: 'pitch_order_timing',
      tag: 'funk:performance_lh_bass_rh_chords_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'Two hands, two parts — you are becoming a one-person funk band.',
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
        { midi: 38, onset:    0, duration: 460 },  // D2 beat1 bar1
        { midi: 38, onset:  960, duration: 460 },  // D2 beat3 bar1
        { midi: 38, onset: 1920, duration: 460 },  // D2 beat1 bar2
        { midi: 38, onset: 2880, duration: 460 },  // D2 beat3 bar2
        // RH — Dm7 [b7-3-5] stabs on comp_funk_s1
        { midi: 60, onset:    0, duration: 120 },
        { midi: 65, onset:    0, duration: 120 },
        { midi: 69, onset:    0, duration: 120 },
        { midi: 60, onset:  360, duration: 120 },
        { midi: 65, onset:  360, duration: 120 },
        { midi: 69, onset:  360, duration: 120 },
        { midi: 60, onset:  960, duration: 120 },
        { midi: 65, onset:  960, duration: 120 },
        { midi: 69, onset:  960, duration: 120 },
        { midi: 60, onset: 1200, duration: 120 },
        { midi: 65, onset: 1200, duration: 120 },
        { midi: 69, onset: 1200, duration: 120 },
        // bar 2
        { midi: 60, onset: 1920, duration: 120 },
        { midi: 65, onset: 1920, duration: 120 },
        { midi: 69, onset: 1920, duration: 120 },
        { midi: 60, onset: 2280, duration: 120 },
        { midi: 65, onset: 2280, duration: 120 },
        { midi: 69, onset: 2280, duration: 120 },
        { midi: 60, onset: 2880, duration: 120 },
        { midi: 65, onset: 2880, duration: 120 },
        { midi: 69, onset: 2880, duration: 120 },
        { midi: 60, onset: 3120, duration: 120 },
        { midi: 65, onset: 3120, duration: 120 },
        { midi: 69, onset: 3120, duration: 120 },
      ],
    },
    // TODO: ActivityStepV2 instrument_config — pending type merge by Ryan
    {
      stepNumber: 44,
      module: 'funk_l1',
      section: 'D',
      subsection: 'D1: LH Bass + RH Chords',
      activity: 'D1.2: LH Root Pattern + RH Funk Stab 1 (In Time)',
      direction: 'Now in time: left hand locks root bass with the kick drum, right hand plays Dm7 rootless stabs on the grid.',
      assessment: 'pitch_order_timing_duration',
      tag: 'funk:performance_lh_bass_rh_chords_it | funk',
      styleRef: 'l1a',
      successFeedback: 'Bass and chords in the pocket together — this is the foundational funk keyboard feel.',
      contentGeneration:
        'GCM v8: FUNK L1 Performance IT. LH: bass root D2=38, beats 1+3. RH: Dm7 rootless [b7-3-5]; comp_funk_s1. Tempo: 88-96 BPM. Style: l1a.',
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
        { midi: 38, onset:    0, duration: 460 },
        { midi: 38, onset:  960, duration: 460 },
        { midi: 38, onset: 1920, duration: 460 },
        { midi: 38, onset: 2880, duration: 460 },
        { midi: 60, onset:    0, duration: 120 },
        { midi: 65, onset:    0, duration: 120 },
        { midi: 69, onset:    0, duration: 120 },
        { midi: 60, onset:  360, duration: 120 },
        { midi: 65, onset:  360, duration: 120 },
        { midi: 69, onset:  360, duration: 120 },
        { midi: 60, onset:  960, duration: 120 },
        { midi: 65, onset:  960, duration: 120 },
        { midi: 69, onset:  960, duration: 120 },
        { midi: 60, onset: 1200, duration: 120 },
        { midi: 65, onset: 1200, duration: 120 },
        { midi: 69, onset: 1200, duration: 120 },
        { midi: 60, onset: 1920, duration: 120 },
        { midi: 65, onset: 1920, duration: 120 },
        { midi: 69, onset: 1920, duration: 120 },
        { midi: 60, onset: 2280, duration: 120 },
        { midi: 65, onset: 2280, duration: 120 },
        { midi: 69, onset: 2280, duration: 120 },
        { midi: 60, onset: 2880, duration: 120 },
        { midi: 65, onset: 2880, duration: 120 },
        { midi: 69, onset: 2880, duration: 120 },
        { midi: 60, onset: 3120, duration: 120 },
        { midi: 65, onset: 3120, duration: 120 },
        { midi: 69, onset: 3120, duration: 120 },
      ],
    },

    // ── D2: LH Bass + RH Melody (2 steps) ───────────────────────────────
    // TODO: ActivityStepV2 instrument_config — pending type merge by Ryan
    {
      stepNumber: 45,
      module: 'funk_l1',
      section: 'D',
      subsection: 'D2: LH Bass + RH Melody',
      activity: 'D2.1: LH Root Groove + RH Pentatonic Phrase (Out of Time)',
      direction: 'Left hand plays root bass groove (D2 on beats 1+3 with pickups), right hand plays a D minor pentatonic melody phrase. No tempo — coordinate both hands.',
      assessment: 'pitch_order_timing',
      tag: 'funk:performance_lh_bass_rh_melody_oot | funk',
      styleRef: 'l1a',
      successFeedback: 'Bass and melody from one player — you are telling the whole story.',
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
        { midi: 38, onset:    0, duration: 460 },  // D2 beat1
        { midi: 38, onset:  400, duration: 120 },  // D2 a-of-1
        { midi: 38, onset:  960, duration: 460 },  // D2 beat3
        { midi: 38, onset: 1360, duration: 120 },  // D2 a-of-3
        { midi: 38, onset: 1920, duration: 460 },  // D2 beat1 bar2
        { midi: 38, onset: 2320, duration: 120 },  // D2 a-of-1
        { midi: 38, onset: 2880, duration: 460 },  // D2 beat3
        { midi: 38, onset: 3280, duration: 120 },  // D2 a-of-3
        // RH bar1 — call phrase
        { midi: 69, onset:    0, duration: 480 },  // A4 beat1
        { midi: 65, onset:  600, duration: 240 },  // F4 e-of-2
        { midi: 69, onset:  840, duration: 120 },  // A4 a-of-2 pickup
        { midi: 69, onset:  960, duration: 960 },  // A4 beat3 held
        // RH bar2 — answer phrase
        { midi: 69, onset: 1920, duration: 480 },  // A4 beat1
        { midi: 65, onset: 2520, duration: 240 },  // F4 beat2.2
        { midi: 67, onset: 2760, duration: 120 },  // G4 pickup (Dorian color)
        { midi: 65, onset: 2880, duration: 960 },  // F4 beat3 held
      ],
    },
    // TODO: ActivityStepV2 instrument_config — pending type merge by Ryan
    {
      stepNumber: 46,
      module: 'funk_l1',
      section: 'D',
      subsection: 'D2: LH Bass + RH Melody',
      activity: 'D2.2: LH Root Groove + RH Pentatonic Phrase (In Time)',
      direction: 'In time: left hand locks bass with the kick, right hand plays melody over the groove. Drums and chord stabs are provided.',
      assessment: 'pitch_order_timing_duration',
      tag: 'funk:performance_lh_bass_rh_melody_it | funk',
      styleRef: 'l1a',
      successFeedback: 'Bass and melody in the pocket — you just played a full funk performance.',
      contentGeneration:
        'GCM v8: FUNK L1 Performance IT. LH: D2=38 root groove. RH: D minor pentatonic call+answer. Backing: drums + chords. Tempo: 88-96 BPM. Style: l1a.',
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
        { midi: 38, onset:    0, duration: 460 },
        { midi: 38, onset:  400, duration: 120 },
        { midi: 38, onset:  960, duration: 460 },
        { midi: 38, onset: 1360, duration: 120 },
        { midi: 38, onset: 1920, duration: 460 },
        { midi: 38, onset: 2320, duration: 120 },
        { midi: 38, onset: 2880, duration: 460 },
        { midi: 38, onset: 3280, duration: 120 },
        { midi: 69, onset:    0, duration: 480 },
        { midi: 65, onset:  600, duration: 240 },
        { midi: 69, onset:  840, duration: 120 },
        { midi: 69, onset:  960, duration: 960 },
        { midi: 69, onset: 1920, duration: 480 },
        { midi: 65, onset: 2520, duration: 240 },
        { midi: 67, onset: 2760, duration: 120 },
        { midi: 65, onset: 2880, duration: 960 },
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
      stepNumber: 47,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A1: Dorian Scale + Blues',
      activity: 'A1.1: C Dorian Scale Ascending (Out of Time)',
      direction: 'Play the C Dorian scale going up. Listen for the natural 6 (A natural) — that is the Dorian fingerprint.',
      assessment: 'pitch_only',
      tag: 'funk:dorian_ascending_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'C Dorian — the A natural is what makes this sound different from natural minor.',
      contentGeneration:
        'GCM v8: FUNK L2 melody scale=dorian [0,2,3,5,7,9,10]. Key: C minor. Contour: ascending stepwise. Register: C4-C5. Natural 6 = A4 (MIDI 69).',
    },
    {
      stepNumber: 48,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A1: Dorian Scale + Blues',
      activity: 'A1.2: C Dorian Scale Descending (Out of Time)',
      direction: 'Play the C Dorian scale going down. Feel how the natural 6 (A) pulls you through the descent.',
      assessment: 'pitch_only',
      tag: 'funk:dorian_descending_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'Descending Dorian — that A natural passing through is the sweet spot.',
      contentGeneration:
        'GCM v8: FUNK L2 melody scale=dorian [0,2,3,5,7,9,10]. Key: C minor. Contour: descending stepwise. Register: C5-C4. Natural 6 = A4 (MIDI 69).',
    },
    {
      stepNumber: 49,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A1: Dorian Scale + Blues',
      activity: 'A1.3: C Dorian Scale Ascending (In Time)',
      direction: 'In a steady tempo, play the C Dorian scale going up.',
      assessment: 'pitch_order_timing',
      tag: 'funk:dorian_ascending_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Dorian in time — steady and confident.',
      contentGeneration:
        'GCM v8: FUNK L2 melody scale=dorian [0,2,3,5,7,9,10]. Key: C minor. Contour: ascending stepwise. Register: C4-C5. Tempo: 95-108 BPM quarter-note pulse.',
    },
    {
      stepNumber: 50,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A1: Dorian Scale + Blues',
      activity: 'A1.4: C Minor Blues Scale (Out of Time)',
      direction: 'Play the C minor blues scale. The b5 (Gb) is the blue note — it adds grit between the 4th and 5th.',
      assessment: 'pitch_only',
      tag: 'funk:minor_blues_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'Blues scale locked — that Gb gives you the edge Dorian alone does not have.',
      contentGeneration:
        'GCM v8: FUNK L2 melody scale_alt=minor_blues [0,3,5,6,7,10]. Key: C minor. Contour: ascending stepwise. Register: C4-C5. Blue note = Gb4 (MIDI 66).',
    },
    {
      stepNumber: 51,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A1: Dorian Scale + Blues',
      activity: 'A1.5: C Minor Blues Scale (In Time)',
      direction: 'In a steady tempo, play the C minor blues scale.',
      assessment: 'pitch_order_timing',
      tag: 'funk:minor_blues_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Blues scale in the pocket.',
      contentGeneration:
        'GCM v8: FUNK L2 melody scale_alt=minor_blues [0,3,5,6,7,10]. Key: C minor. Contour: ascending stepwise. Register: C4-C5. Tempo: 95-108 BPM quarter-note pulse.',
    },
    {
      stepNumber: 52,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A1: Dorian Scale + Blues',
      activity: 'A1.6: Natural 6 (A Natural) Emphasis Exercise (Out of Time)',
      direction: 'Play this ornamental descent: Bb→A→G (b7→nat6→5). The A natural is the Dorian character note — it is what separates Dorian from natural minor. This three-note phrase is the L2 melodic signature.',
      assessment: 'pitch_only',
      tag: 'funk:dorian_nat6_emphasis_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'The Dorian descent — Bb to A to G. Three notes that define the mode.',
      contentGeneration:
        'GCM v8: FUNK L2 melody Dorian character note exercise. Phrase: b7-6-5 descending (Bb4-A4-G4 = MIDI 70-69-67). Natural 6 = A4 (MIDI 69) is the Dorian fingerprint. Scale: dorian [0,2,3,5,7,9,10]. Key: C minor. Register: C4-C5.',
    },

    // ── A2: Melodic Phrases (6 steps) ────────────────────────────────────
    {
      stepNumber: 53,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.1: 2-Bar Phrase — Motivic Repetition (A-A\') (Out of Time)',
      direction: 'Learn a 2-bar phrase where bar 2 repeats bar 1 with a small variation. Same rhythm, one note changed.',
      assessment: 'pitch_only',
      tag: 'funk:phrase_motivic_repetition_2bar_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'Motivic repetition — repeat the idea, change one thing. That is how funk melodies are built.',
      contentGeneration:
        'GCM v8: FUNK L2 melody phrase → motivic_repetition (A-A\'). Melody_Phrase_Rhythm_Library: genre=funk, phrase_rhythm_bars=2, contour_notes=[4,5], rhythm_tiers=[2,3], zero_point_options=[0,2,4]. Melody_Contour_Library: contour_tiers=[2,3], contour=motivic_aa_prime (bar1=phrase, bar2=same_rhythm_varied_tail). Scale: dorian [0,2,3,5,7,9,10]. Key: C minor. Register: C4-C5.',
      targetNotes: [
        // Bar 1: A phrase — Dorian descent Bb-A-G
        { midi: 70, onset: 0, duration: 480 },    // Bb4 (b7)
        { midi: 69, onset: 480, duration: 480 },   // A4 (nat.6)
        { midi: 67, onset: 960, duration: 960 },   // G4 long resolve
        // Bar 2: A' phrase — same rhythm, one step lower
        { midi: 70, onset: 1920, duration: 480 },  // Bb4
        { midi: 69, onset: 2400, duration: 240 },   // A4
        { midi: 67, onset: 2640, duration: 240 },   // G4
        { midi: 65, onset: 2880, duration: 960 },   // F4 long (variation)
      ],
    },
    {
      stepNumber: 54,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.2: 2-Bar Phrase — Motivic Repetition (In Time)',
      direction: 'Play the motivic repetition phrase in time.',
      assessment: 'pitch_order_timing',
      tag: 'funk:phrase_motivic_repetition_2bar_it | funk',
      styleRef: 'l2a',
      successFeedback: 'A-A\' in the groove — the repetition locks the listener in.',
      contentGeneration:
        'GCM v8: FUNK L2 melody phrase → motivic_repetition (A-A\'). Melody_Phrase_Rhythm_Library: genre=funk, phrase_rhythm_bars=2, contour_notes=[4,5], rhythm_tiers=[2,3], zero_point_options=[0,2,4]. Melody_Contour_Library: contour_tiers=[2,3], contour=motivic_aa_prime. Scale: dorian [0,2,3,5,7,9,10]. Key: C minor. Register: C4-C5. Tempo: 95-108 BPM.',
      targetNotes: [
        { midi: 70, onset: 0, duration: 480 },
        { midi: 69, onset: 480, duration: 480 },
        { midi: 67, onset: 960, duration: 960 },
        { midi: 70, onset: 1920, duration: 480 },
        { midi: 69, onset: 2400, duration: 240 },
        { midi: 67, onset: 2640, duration: 240 },
        { midi: 65, onset: 2880, duration: 960 },
      ],
    },
    {
      stepNumber: 55,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.3: 2-Bar Phrase — Call + Varied Answer (Out of Time)',
      direction: 'Learn a 2-bar call-and-answer: bar 1 calls, bar 2 answers with a different rhythm but lands on the same target note. The answer should include the b7→nat6 descent (Bb→A) — the Dorian signature.',
      assessment: 'pitch_only',
      tag: 'funk:phrase_call_varied_answer_2bar_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'Call and varied answer with the Dorian descent — this is Stevie Wonder territory.',
      contentGeneration:
        'GCM v8: FUNK L2 melody phrase → call_varied_answer. Melody_Phrase_Rhythm_Library: genre=funk, phrase_rhythm_bars=2, contour_notes=[4,5], rhythm_tiers=[2,3], zero_point_options=[0,2,4]. Melody_Contour_Library: contour_tiers=[2,3], contour=call_varied_answer (bar1=call, bar2=varied_rhythm_same_target). Chromatic_passing=true. Must include b7-6 descent (Bb4-A4 = MIDI 70-69) in answer phrase. Scale: dorian [0,2,3,5,7,9,10]. Key: C minor. Register: C4-C5.',
      targetNotes: [
        // Bar 1: call
        { midi: 72, onset: 0, duration: 480 },    // C5
        { midi: 70, onset: 480, duration: 240 },   // Bb4
        { midi: 67, onset: 720, duration: 240 },   // G4
        { midi: 65, onset: 960, duration: 960 },   // F4 long
        // Bar 2: varied answer — includes Bb→A descent
        { midi: 72, onset: 1920, duration: 240 },  // C5
        { midi: 70, onset: 2160, duration: 240 },   // Bb4 (b7)
        { midi: 69, onset: 2400, duration: 480 },   // A4 (nat.6 — Dorian!)
        { midi: 67, onset: 2880, duration: 960 },   // G4 long resolve
      ],
    },
    {
      stepNumber: 56,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.4: 2-Bar Phrase — Call + Varied Answer (In Time)',
      direction: 'Play the call-and-varied-answer phrase in time. Feel the Bb→A pull in the answer bar.',
      assessment: 'pitch_order_timing',
      tag: 'funk:phrase_call_varied_answer_2bar_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Call and answer in the pocket — the Dorian descent lands every time.',
      contentGeneration:
        'GCM v8: FUNK L2 melody phrase → call_varied_answer. Melody_Phrase_Rhythm_Library: genre=funk, phrase_rhythm_bars=2, contour_notes=[4,5], rhythm_tiers=[2,3], zero_point_options=[0,2,4]. Melody_Contour_Library: contour_tiers=[2,3], contour=call_varied_answer. Chromatic_passing=true. Must include b7-6 descent (Bb4-A4). Scale: dorian [0,2,3,5,7,9,10]. Key: C minor. Register: C4-C5. Tempo: 95-108 BPM.',
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
      stepNumber: 57,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.5: 4-Bar Phrase — Density Arc (Out of Time)',
      direction: 'Learn a 4-bar phrase that builds in density: bars 1-2 are sparse, bar 3 picks up, bar 4 is the densest run resolving to a long held note.',
      assessment: 'pitch_only',
      tag: 'funk:phrase_density_arc_4bar_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'The density arc — sparse to dense to resolution. That is how funk melodies breathe.',
      contentGeneration:
        'GCM v8: FUNK L2 melody phrase → density_arc. Melody_Phrase_Rhythm_Library: genre=funk, phrase_rhythm_bars=2, contour_notes=[4,5], rhythm_tiers=[2,3], zero_point_options=[0,2,4], contour_concat=2→4. Melody_Contour_Library: contour_tiers=[2,3], contour=density_arc (bars1-2=sparse, bar3=medium, bar4=dense_run→long_hold). Cluster→resolve rule: long note closes phrase. Chromatic_passing=true. Scale: dorian [0,2,3,5,7,9,10]. Key: C minor. Register: C4-C5.',
      targetNotes: [
        // Bar 1: sparse — 2 notes
        { midi: 72, onset: 0, duration: 480 },     // C5
        { midi: 67, onset: 960, duration: 960 },    // G4
        // Bar 2: sparse — 2 notes
        { midi: 70, onset: 1920, duration: 480 },   // Bb4
        { midi: 69, onset: 2880, duration: 960 },    // A4 (nat.6)
        // Bar 3: medium — 3 notes
        { midi: 72, onset: 3840, duration: 240 },   // C5
        { midi: 70, onset: 4080, duration: 240 },    // Bb4
        { midi: 69, onset: 4320, duration: 240 },    // A4
        // Bar 4: dense run → long hold
        { midi: 72, onset: 5760, duration: 120 },   // C5
        { midi: 70, onset: 5880, duration: 120 },    // Bb4
        { midi: 69, onset: 6000, duration: 120 },    // A4
        { midi: 67, onset: 6120, duration: 120 },    // G4
        { midi: 65, onset: 6240, duration: 1440 },   // F4 long resolve
      ],
    },
    {
      stepNumber: 58,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.6: 4-Bar Phrase — Density Arc (In Time)',
      direction: 'Play the 4-bar density arc in time. Feel how the tension builds to bar 4.',
      assessment: 'pitch_order_timing',
      tag: 'funk:phrase_density_arc_4bar_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Four bars of controlled intensity — you are shaping the phrase like a story.',
      contentGeneration:
        'GCM v8: FUNK L2 melody phrase → density_arc. Melody_Phrase_Rhythm_Library: genre=funk, phrase_rhythm_bars=2, contour_notes=[4,5], rhythm_tiers=[2,3], zero_point_options=[0,2,4], contour_concat=2→4. Melody_Contour_Library: contour_tiers=[2,3], contour=density_arc. Cluster→resolve rule: long note closes phrase. Chromatic_passing=true. Scale: dorian [0,2,3,5,7,9,10]. Key: C minor. Register: C4-C5. Tempo: 95-108 BPM.',
      targetNotes: [
        { midi: 72, onset: 0, duration: 480 },
        { midi: 67, onset: 960, duration: 960 },
        { midi: 70, onset: 1920, duration: 480 },
        { midi: 69, onset: 2880, duration: 960 },
        { midi: 72, onset: 3840, duration: 240 },
        { midi: 70, onset: 4080, duration: 240 },
        { midi: 69, onset: 4320, duration: 240 },
        { midi: 72, onset: 5760, duration: 120 },
        { midi: 70, onset: 5880, duration: 120 },
        { midi: 69, onset: 6000, duration: 120 },
        { midi: 67, onset: 6120, duration: 120 },
        { midi: 65, onset: 6240, duration: 1440 },
      ],
    },

    // ── A3: Melody Play-Along (2 steps) ──────────────────────────────────
    {
      stepNumber: 59,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A3: Melody Play-Along',
      activity: 'A3.1: Melody over Funk L2 Backing (In Time)',
      direction: 'Play your melody over a full L2 funk groove. Drums, slap bass, and chords are provided — you bring the melody. Use the Dorian descent.',
      assessment: 'pitch_order_timing',
      tag: 'funk:melody_playalong_l2 | funk',
      styleRef: 'l2a',
      successFeedback: 'Melody over a Stevie-style groove — you are playing real funk now.',
      contentGeneration:
        'GCM v8: FUNK L2 melody play-along. Generate 4-bar melody: Melody_Phrase_Rhythm_Library (genre=funk, phrase_rhythm_bars=2, contour_notes=[4,5], rhythm_tiers=[2,3], contour_concat=2→4). Melody_Contour_Library: contour_tiers=[2,3], motivic structure A-B-A-B\'. Chromatic_passing=true. Scale: dorian [0,2,3,5,7,9,10]. Key: C minor. Register: C4-C5. Backing: drums (groove_funk_02) + bass (Slap Bass 1, bass_c_funk_04 octave pops; bass_r_funk_05) + chords (Cm7 shell_1_b3_b7 [0,3,10], F dom9 funk9 [-2,2,7]; comp_funk_s1). Progression: 1 min7 - 4 dom9 (Cm7→F9). Tempo: 95-108 BPM. Style: l2a.',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
    },
    {
      stepNumber: 60,
      module: 'funk_l2',
      section: 'A',
      subsection: 'A3: Melody Play-Along',
      activity: 'A3.2: Melody Play-Along — New Key (In Time)',
      direction: 'Same groove, new key. Your Dorian ears need to work in any key.',
      assessment: 'pitch_order_timing',
      tag: 'funk:melody_playalong_newkey_l2 | funk',
      styleRef: 'l2a',
      successFeedback: 'New key, same Dorian feel. The natural 6 is your compass in any key.',
      contentGeneration:
        'GCM v8: FUNK L2 melody play-along — transposed key. key_center: runtime (exclude C minor, key_unlock_order per GCM v8). Generate 4-bar melody: Melody_Phrase_Rhythm_Library (genre=funk, phrase_rhythm_bars=2, contour_notes=[4,5], rhythm_tiers=[2,3], contour_concat=2→4). Melody_Contour_Library: contour_tiers=[2,3], motivic structure A-B-A-B\'. Chromatic_passing=true. Scale: dorian [0,2,3,5,7,9,10] in new key. Register: C4-C5. Backing: drums (groove_funk_02) + bass (Slap Bass 1; bass_r_funk_05) + chords (1 min7 - 4 dom9; comp_funk_s1). Tempo: 95-108 BPM. Style: l2a.',
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
      stepNumber: 61,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B1: Arpeggiate Chords',
      activity: 'B1.1: Cm9 Arpeggio (1-b3-5-b7-9) (Out of Time)',
      direction: 'Play the notes of a Cm9 chord one at a time going up: C-Eb-G-Bb-D.',
      assessment: 'pitch_only',
      tag: 'funk:arpeggiate_cm9_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'Cm9 — five notes, rich and warm. The 9th (D) opens the chord up.',
      contentGeneration:
        'GCM v8: chord_types min9 [0,3,7,10,14]. Chord_Quality_Library: quality=min9, root=C. Contour: ascending root position (1-b3-5-b7-9). Register: C3-C5.',
    },
    {
      stepNumber: 62,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B1: Arpeggiate Chords',
      activity: 'B1.2: Cm9 Arpeggio (In Time)',
      direction: 'In a steady tempo, arpeggiate Cm9.',
      assessment: 'pitch_order_timing',
      tag: 'funk:arpeggiate_cm9_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Cm9 in time — smooth five-note arc.',
      contentGeneration:
        'GCM v8: chord_types min9 [0,3,7,10,14]. Chord_Quality_Library: quality=min9, root=C. Contour: ascending root position (1-b3-5-b7-9). Register: C3-C5. Tempo: 95-108 BPM quarter-note pulse.',
    },
    {
      stepNumber: 63,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B1: Arpeggiate Chords',
      activity: 'B1.3: F Dom13 Arpeggio — Key Notes (Out of Time)',
      direction: 'Play the key chord tones of F dom13: F-A-C-Eb-D. Root, 3rd, 5th, b7th, 13th.',
      assessment: 'pitch_only',
      tag: 'funk:arpeggiate_fdom13_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'F dom13 — the 13th (D) is the color that makes this chord sing.',
      contentGeneration:
        'GCM v8: chord_types dom13. Chord_Quality_Library: quality=dom13, root=F. Key tones: 1-3-5-b7-13 (F-A-C-Eb-D). Register: C3-C5.',
    },
    {
      stepNumber: 64,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B1: Arpeggiate Chords',
      activity: 'B1.4: Cm9→F13 Arpeggio Sequence (Out of Time)',
      direction: 'Arpeggiate Cm9 then F13 back to back. Hear how the chords connect.',
      assessment: 'pitch_only',
      tag: 'funk:arpeggiate_cm9_f13_sequence_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'Two chords arpeggiated — you can hear the Sizzle voice leading in the chord tones.',
      contentGeneration:
        'GCM v8: FUNK L2 arpeggio sequence. Cm9 [0,3,7,10,14] root=C, then F dom13 root=F. Progression: 1 min9 - 4 dom13 (Cm9→F13). Register: C3-C5.',
    },
    {
      stepNumber: 65,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B1: Arpeggiate Chords',
      activity: 'B1.5: Cm9→F13 Arpeggio Sequence (In Time)',
      direction: 'Arpeggiate the Cm9→F13 sequence in time.',
      assessment: 'pitch_order_timing',
      tag: 'funk:arpeggiate_cm9_f13_sequence_it | funk',
      styleRef: 'l2a',
      successFeedback: '2 min7 - 5 dom7 arpeggio sequence in the pocket.',
      contentGeneration:
        'GCM v8: FUNK L2 arpeggio sequence. Cm9→F dom13. Progression: 1 min9 - 4 dom13 (Cm9→F13). Register: C3-C5. Tempo: 95-108 BPM, one chord per bar.',
    },
    {
      stepNumber: 66,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B1: Arpeggiate Chords',
      activity: 'B1.6: Drop the Sizzle Exercise — Bb→A Voice Leading (Out of Time)',
      direction: 'Play Cm9 then F13 and listen for ONE note: the Bb (7th of Cm9) drops a half step to A (3rd of F13). That is Drop the Sizzle.',
      assessment: 'pitch_only',
      tag: 'funk:sizzle_exercise_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'Drop the Sizzle — Bb→A. The smallest move with the biggest harmonic impact.',
      contentGeneration:
        'GCM v8: FUNK L2 Sizzle rule exercise. Cm9: 7-3-5 voicing Bb-Eb-G. F dom13: 3-7-9 voicing A-Eb-G. Sizzle: Bb→A half-step drop, Eb+G common tones held. Progression: 1 min7 - 4 dom9 (Cm9→F13). Register: C3-C5.',
    },

    // ── B2: Voicings (8 steps) ───────────────────────────────────────────
    {
      stepNumber: 67,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.1: Cm9 Rootless Voicing (b3-b7-9) (Out of Time)',
      direction: 'Play Cm9 rootless: Eb, Bb, D. No root — the bass provides it. Three notes, full color.',
      assessment: 'pitch_only',
      tag: 'funk:cm9_rootless_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'Rootless voicing — let the bass handle the root. You play the color.',
      contentGeneration:
        'GCM v8: min9 [0,3,7,10,14]. Genre_Voicing_Taxonomy: quality=min9, voicing=rootless_b3_b7_9. RH: [3,10,14] relative to C root (Eb-Bb-D). LH=root_bass. Register: C3-C5.',
    },
    {
      stepNumber: 68,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.2: Cm9 Rootless Voicing (In Time)',
      direction: 'Play the Cm9 rootless voicing in time.',
      assessment: 'pitch_order_timing',
      tag: 'funk:cm9_rootless_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Cm9 rootless in the pocket.',
      contentGeneration:
        'GCM v8: min9 [0,3,7,10,14]. Genre_Voicing_Taxonomy: quality=min9, voicing=rootless_b3_b7_9. RH: [3,10,14] relative to C root (Eb-Bb-D). LH=root_bass. Register: C3-C5. Tempo: 95-108 BPM.',
    },
    // F dom13 rootless [-2,4,9] relative to F root (Eb-A-D)
    // Voice leading from Cm9 [3,10,14]: Eb stays, Bb→A (-1), D stays
    // Total movement: 1 semitone ✅
    // TODO: Genre_Voicing_Taxonomy_v2 — F dom13 rootless: rh_override=[-2,4,9] relative to root
    {
      stepNumber: 69,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.3: F Dom13 Rootless (b7-3-13) (Out of Time)',
      direction: 'Play F dom13 rootless: Eb, A, D. The Sizzle landing — Bb became A, and now you voice it.',
      assessment: 'pitch_only',
      tag: 'funk:fdom13_rootless_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'F dom13 rootless — three notes, the whole dominant color.',
      contentGeneration:
        'GCM v8: dom13. Genre_Voicing_Taxonomy: quality=dom13, voicing=rootless_b7_3_13. RH: [-2,4,9] relative to F root (Eb-A-D). Sizzle result: A is the 3rd that Bb dropped to. LH=root_bass. Register: C3-C5.',
    },
    {
      stepNumber: 70,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.4: F Dom13 Rootless (In Time)',
      direction: 'Play the F dom13 rootless voicing in time.',
      assessment: 'pitch_order_timing',
      tag: 'funk:fdom13_rootless_it | funk',
      styleRef: 'l2a',
      successFeedback: 'F dom13 in time — dominant funk color on demand.',
      contentGeneration:
        'GCM v8: dom13. Genre_Voicing_Taxonomy: quality=dom13, voicing=rootless_b7_3_13. RH: [-2,4,9] relative to F root (Eb-A-D). LH=root_bass. Register: C3-C5. Tempo: 95-108 BPM.',
    },
    {
      stepNumber: 71,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.5: Funk9 Voicing (b7-9-5) (Out of Time)',
      direction: 'Play the signature funk voicing on C: Bb-D-G. Omit root and 3rd — open, ambiguous, funky.',
      assessment: 'pitch_only',
      tag: 'funk:funk9_voicing_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'The funk9 voicing — this is the sound of funk keyboards.',
      contentGeneration:
        'GCM v8: funk9 voicing [-2,2,7] (b7-9-5, omit 3). Genre_Voicing_Taxonomy: quality=dom9, voicing=funk9. RH: rh_override=[-2,2,7]. Root=C. LH=root_bass. Register: C3-C5.',
      chordSymbols: ['Cdom9'],
      targetNotes: [
        { midi: 58, onset:    0, duration: 1800 },  // Bb3 (b7)
        { midi: 62, onset:    0, duration: 1800 },  // D4  (9)
        { midi: 67, onset:    0, duration: 1800 },  // G4  (5)
        { midi: 58, onset: 1920, duration: 1800 },  // Bb3 bar 2
        { midi: 62, onset: 1920, duration: 1800 },  // D4  bar 2
        { midi: 67, onset: 1920, duration: 1800 },  // G4  bar 2
      ],
    },
    {
      stepNumber: 72,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.6: Funk9 Voicing (In Time)',
      direction: 'Play the funk9 voicing in time — stab it.',
      assessment: 'pitch_order_timing',
      tag: 'funk:funk9_voicing_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Dom9 funk stab in the pocket.',
      contentGeneration:
        'GCM v8: funk9 voicing [-2,2,7]. Genre_Voicing_Taxonomy: quality=dom9, voicing=funk9. RH: rh_override=[-2,2,7]. Root=C. LH=root_bass. Register: C3-C5. Tempo: 95-108 BPM.',
      chordSymbols: ['Cdom9'],
      targetNotes: [
        // bar 1
        { midi: 58, onset:    0, duration: 120 },
        { midi: 62, onset:    0, duration: 120 },
        { midi: 67, onset:    0, duration: 120 },
        { midi: 58, onset:  360, duration: 120 },  // a-of-1
        { midi: 62, onset:  360, duration: 120 },
        { midi: 67, onset:  360, duration: 120 },
        { midi: 58, onset:  960, duration: 120 },  // beat 3
        { midi: 62, onset:  960, duration: 120 },
        { midi: 67, onset:  960, duration: 120 },
        { midi: 58, onset: 1200, duration: 120 },  // and-of-3
        { midi: 62, onset: 1200, duration: 120 },
        { midi: 67, onset: 1200, duration: 120 },
        // bar 2
        { midi: 58, onset: 1920, duration: 120 },
        { midi: 62, onset: 1920, duration: 120 },
        { midi: 67, onset: 1920, duration: 120 },
        { midi: 58, onset: 2280, duration: 120 },
        { midi: 62, onset: 2280, duration: 120 },
        { midi: 67, onset: 2280, duration: 120 },
        { midi: 58, onset: 2880, duration: 120 },
        { midi: 62, onset: 2880, duration: 120 },
        { midi: 67, onset: 2880, duration: 120 },
        { midi: 58, onset: 3120, duration: 120 },
        { midi: 62, onset: 3120, duration: 120 },
        { midi: 67, onset: 3120, duration: 120 },
      ],
    },
    {
      stepNumber: 73,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.7: Chromatic Approach Stab (Out of Time)',
      direction: 'Play the Cm9 voicing one half step below, then land on the real Cm9. '
        + 'Every voice slides up one semitone into the target chord.',
      assessment: 'pitch_only',
      tag: 'funk:chords_chromatic_approach_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'That chromatic slide into the chord — that\'s the Funk comping secret weapon.',
      contentGeneration:
        'GCM v8: FUNK L2 chromatic approach. Voicing: target chord -1 semitone → target chord. Example: Cm9 rootless [3,10,14] approach = [2,9,13] (all voices -1 semitone) → [3,10,14]. Stab note duration: 120t each (hard rule). Register: C3-C5.',
      targetNotes: [
        // Approach chord (Cm9 -1 semitone)
        { midi: 50, onset: 0,   duration: 120 },  // D3  (Eb3-1)
        { midi: 54, onset: 0,   duration: 120 },  // Gb3 (G3-1)
        { midi: 57, onset: 0,   duration: 120 },  // A3  (Bb3-1)
        { midi: 61, onset: 0,   duration: 120 },  // Db4 (D4-1)
        // Goal — real Cm9
        { midi: 51, onset: 240, duration: 120 },  // Eb3
        { midi: 55, onset: 240, duration: 120 },  // G3
        { midi: 58, onset: 240, duration: 120 },  // Bb3
        { midi: 62, onset: 240, duration: 120 },  // D4
      ],
    },
    {
      stepNumber: 74,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B2: Chord Voicings',
      activity: 'B2.8: Chromatic Approach Stab (In Time)',
      assessment: 'pitch_order_timing',
      tag: 'funk:chords_chromatic_approach_it | funk',
      styleRef: 'l2a',
      successFeedback: 'In time and in the pocket — chromatic approach is now part of your comping vocabulary.',
      contentGeneration:
        'GCM v8: FUNK L2 chromatic approach IT. Voicing: target chord -1 semitone → target chord. Approach stab on preceding 16th, target on downbeat. Stab note duration: 120t each (hard rule). Register: C3-C5. Tempo: 95-108 BPM.',
      targetNotes: [
        { midi: 50, onset: 0,   duration: 120 },
        { midi: 54, onset: 0,   duration: 120 },
        { midi: 57, onset: 0,   duration: 120 },
        { midi: 61, onset: 0,   duration: 120 },
        { midi: 51, onset: 240, duration: 120 },
        { midi: 55, onset: 240, duration: 120 },
        { midi: 58, onset: 240, duration: 120 },
        { midi: 62, onset: 240, duration: 120 },
      ],
    },

    // ── B3: Progressions (3 steps) ───────────────────────────────────────
    {
      stepNumber: 75,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B3: Funk Progressions',
      activity: 'B3.1: Cm9-F13 Vamp (Out of Time)',
      direction: 'Comp the Cm9-F13 vamp. Watch how only one note changes between the chords — '
        + 'Bb drops to A. That\'s Drop the Sizzle keeping the voice leading smooth.',
      assessment: 'pitch_only',
      tag: 'funk:chords_vamp_cm9_f13_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'Cm9 to F13 with one voice moving — silky smooth.',
      contentGeneration:
        'GCM v8: FUNK L2 progressions: 1 min9 - 4 dom13. HKB v2: Cm9→F13. Voice leading: Cm9 [3,10,14] → F13 [-2,4,9]. Eb common tone (stays), Bb→A (-1 semitone = Sizzle), D common tone (stays). Total movement: 1 semitone. Register: C3-C5.',
      chordSymbols: ['Cm9', 'F13'],
      targetNotes: [
        // Bar 1 — Cm9: Eb3+G3+Bb3+D4
        { midi: 51, onset: 0,    duration: 120 },
        { midi: 55, onset: 0,    duration: 120 },
        { midi: 58, onset: 0,    duration: 120 },
        { midi: 62, onset: 0,    duration: 120 },
        { midi: 51, onset: 360,  duration: 120 },
        { midi: 55, onset: 360,  duration: 120 },
        { midi: 58, onset: 360,  duration: 120 },
        { midi: 62, onset: 360,  duration: 120 },
        { midi: 51, onset: 960,  duration: 120 },
        { midi: 55, onset: 960,  duration: 120 },
        { midi: 58, onset: 960,  duration: 120 },
        { midi: 62, onset: 960,  duration: 120 },
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
      stepNumber: 76,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B3: Funk Progressions',
      activity: 'B3.2: Cm9-F13 Vamp (In Time)',
      assessment: 'pitch_order_timing',
      tag: 'funk:chords_vamp_cm9_f13_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Locking the vamp in time — this is the foundation of Funk keyboard comping.',
      contentGeneration:
        'GCM v8: FUNK L2 progressions: 1 min9 - 4 dom13. HKB v2: Cm9→F13. Voice leading: Cm9 [3,10,14] → F13 [-2,4,9]. Eb stays, Bb→A Sizzle drop, D stays. Total movement: 1 semitone. Register: C3-C5. Tempo: 95-108 BPM, one chord per bar.',
      chordSymbols: ['Cm9', 'F13'],
      targetNotes: [
        // same as B3.1
        { midi: 51, onset: 0,    duration: 120 },
        { midi: 55, onset: 0,    duration: 120 },
        { midi: 58, onset: 0,    duration: 120 },
        { midi: 62, onset: 0,    duration: 120 },
        { midi: 51, onset: 360,  duration: 120 },
        { midi: 55, onset: 360,  duration: 120 },
        { midi: 58, onset: 360,  duration: 120 },
        { midi: 62, onset: 360,  duration: 120 },
        { midi: 51, onset: 960,  duration: 120 },
        { midi: 55, onset: 960,  duration: 120 },
        { midi: 58, onset: 960,  duration: 120 },
        { midi: 62, onset: 960,  duration: 120 },
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
      stepNumber: 77,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B3: Funk Progressions',
      activity: 'B3.3: Ab13-G7alt-Cm9-F13 Full Progression (In Time)',
      direction: 'Four chords, four bars. Ab13 — G7alt — Cm9 — F13. '
        + 'Each chord was chosen by voice leading proximity to the next. '
        + 'Feel how every voice moves by a half step or whole step.',
      assessment: 'pitch_order_timing',
      tag: 'funk:chords_progression_l2_full_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Ab13 to G7alt to Cm9 to F13 — that is sophisticated Funk harmony.',
      contentGeneration:
        'GCM v8: FUNK L2 full progression. HKB v2: Ab13→G7alt→Cm9→F13. Ab13: rootless voicing. G7alt: rootless voicing. Cm9: rootless_b3_b7_9 [3,10,14] (Eb-Bb-D). F13: rootless_b7_3_13 [-2,4,9] (Eb-A-D). Voice leading: chromatic descent through the top voices. Register: C3-C5. Tempo: 95-108 BPM, one chord per bar.',
      chordSymbols: ['Ab13', 'G7', 'Cm9', 'F13'],
      targetNotes: [
        // Bar 1 — Ab13: Gb3+Bb3+C4+F4  [b7-9-3-13]
        { midi: 54, onset: 0,    duration: 120 },  // Gb3
        { midi: 58, onset: 0,    duration: 120 },  // Bb3
        { midi: 60, onset: 0,    duration: 120 },  // C4
        { midi: 65, onset: 0,    duration: 120 },  // F4
        { midi: 54, onset: 360,  duration: 120 },
        { midi: 58, onset: 360,  duration: 120 },
        { midi: 60, onset: 360,  duration: 120 },
        { midi: 65, onset: 360,  duration: 120 },
        { midi: 54, onset: 960,  duration: 120 },
        { midi: 58, onset: 960,  duration: 120 },
        { midi: 60, onset: 960,  duration: 120 },
        { midi: 65, onset: 960,  duration: 120 },
        { midi: 54, onset: 1200, duration: 120 },
        { midi: 58, onset: 1200, duration: 120 },
        { midi: 60, onset: 1200, duration: 120 },
        { midi: 65, onset: 1200, duration: 120 },
        // Bar 2 — G7alt: F3+Ab3+B3+Eb4  [b7-b9-3-#5]
        { midi: 53, onset: 1920, duration: 120 },  // F3
        { midi: 56, onset: 1920, duration: 120 },  // Ab3
        { midi: 59, onset: 1920, duration: 120 },  // B3
        { midi: 63, onset: 1920, duration: 120 },  // Eb4
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
        { midi: 51, onset: 3840, duration: 120 },  // Eb3
        { midi: 55, onset: 3840, duration: 120 },  // G3
        { midi: 58, onset: 3840, duration: 120 },  // Bb3
        { midi: 62, onset: 3840, duration: 120 },  // D4
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
        { midi: 51, onset: 5760, duration: 120 },  // Eb3
        { midi: 55, onset: 5760, duration: 120 },  // G3
        { midi: 57, onset: 5760, duration: 120 },  // A3
        { midi: 62, onset: 5760, duration: 120 },  // D4
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
      stepNumber: 78,
      module: 'funk_l2',
      section: 'B',
      subsection: 'B4: Chord Play-Along',
      activity: 'B4.1: Chord Comping over Funk L2 Backing (In Time)',
      direction: 'Comp chords over a full L2 funk groove using Funk Stab 2 pattern with chromatic approaches. Drums and slap bass are provided — you bring the chords.',
      assessment: 'pitch_order_timing',
      tag: 'funk:chords_playalong_l2 | funk',
      styleRef: 'l2a',
      successFeedback: 'Comping with chromatic approaches over a live groove — L2 funk keyboard.',
      chordSymbols: ['Dm7', 'G7'],
      contentGeneration:
        'GCM v8: FUNK L2 chord play-along. Progression: 1 min9 - 4 dom13 (Cm9→F13). Voice leading from Cm9 [3,10,14]: Eb stays, Bb→A Sizzle drop, D stays. F13: [-2,4,9]. Comping: comp_funk_s2 [[0,120],[360,120],[720,120],[960,120],[1200,120],[1320,120]] with chromatic approach stabs (-1 semitone on preceding 16th). Stab note duration: 120t (hard rule). Stab rhythm: 16th grid (240t per subdivision). Backing: drums (groove_funk_02) + bass (Slap Bass 1, bass_c_funk_04 octave pops; bass_r_funk_05). Tempo: 95-108 BPM. Style: l2a.',
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// L2 Section C — Bass (11 steps, steps 79-89)
// L2 introduces octave 2 bass (Larry Graham octave pop). C2=36, G2=43.
// ---------------------------------------------------------------------------

const funkL2SectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    // ── C1: Bass Scale (4 steps) ─────────────────────────────────────────
    {
      stepNumber: 79,
      module: 'funk_l2',
      section: 'C',
      subsection: 'C1: Bass Scale (C Minor Dorian)',
      activity: 'C1.1: C Minor Dorian Bass Pattern (Out of Time)',
      scaleId: 'dorian',
      direction: 'Play the C Dorian scale in the bass register (octave 2). C2-D2-Eb2-F2-G2-A2-Bb2-C3.',
      assessment: 'pitch_only',
      tag: 'funk:bass_dorian_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'C Dorian in the bass — the natural 6 (A) is your Dorian fingerprint down here too.',
      contentGeneration:
        'GCM v8: FUNK L2 bass scale=dorian [0,2,3,5,7,9,10]. Key: C minor. Contour: ascending stepwise. Register: octave 2 (C2=36 to C3=48).',
      targetNotes: [
        { midi: 36, onset: 0,    duration: 240 },  // C2
        { midi: 38, onset: 240,  duration: 240 },  // D2
        { midi: 39, onset: 480,  duration: 240 },  // Eb2
        { midi: 41, onset: 720,  duration: 240 },  // F2
        { midi: 43, onset: 960,  duration: 240 },  // G2
        { midi: 45, onset: 1200, duration: 240 },  // A2
        { midi: 46, onset: 1440, duration: 240 },  // Bb2
        { midi: 48, onset: 1680, duration: 480 },  // C3 (held)
      ],
    },
    {
      stepNumber: 80,
      module: 'funk_l2',
      section: 'C',
      subsection: 'C1: Bass Scale (C Minor Dorian)',
      activity: 'C1.2: C Minor Dorian Bass Pattern (In Time)',
      scaleId: 'dorian',
      direction: 'In a steady tempo, play the C Dorian bass scale in the bass register.',
      assessment: 'pitch_order_timing',
      tag: 'funk:bass_dorian_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Dorian bass in time — grounded and confident.',
      contentGeneration:
        'GCM v8: FUNK L2 bass scale=dorian [0,2,3,5,7,9,10]. Key: C minor. Contour: ascending stepwise. Register: octave 2 (C2=36 to C3=48). Tempo: 95-108 BPM.',
      targetNotes: [
        { midi: 36, onset: 0,    duration: 240 },  // C2
        { midi: 38, onset: 240,  duration: 240 },  // D2
        { midi: 39, onset: 480,  duration: 240 },  // Eb2
        { midi: 41, onset: 720,  duration: 240 },  // F2
        { midi: 43, onset: 960,  duration: 240 },  // G2
        { midi: 45, onset: 1200, duration: 240 },  // A2
        { midi: 46, onset: 1440, duration: 240 },  // Bb2
        { midi: 48, onset: 1680, duration: 480 },  // C3 (held)
      ],
    },
    {
      stepNumber: 81,
      module: 'funk_l2',
      section: 'C',
      subsection: 'C1: Bass Scale (C Minor Dorian)',
      activity: 'C1.3: Octave 2 Root + Octave 3 Pop — Larry Graham (Out of Time)',
      direction: 'Play root C2, then pop the octave C3. Low C, high C — the Larry Graham bounce. L2 introduces octave 2.',
      assessment: 'pitch_only',
      tag: 'funk:bass_octave_pop_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'The octave pop from the deep register — Larry Graham invented this sound.',
      contentGeneration:
        'GCM v8: FUNK L2 bass contours=bass_c_funk_04 (octave pop). Root=C2(36), pop=C3(48). Bass_Rhythm_Patterns: bass_r_funk_05 (beat1 root, and-of-2 octave pop). Register: octave 2-3.',
      targetNotes: [
        { midi: 36, onset: 0, duration: 460 },    // C2 — root
        { midi: 48, onset: 480, duration: 460 },   // C3 — octave pop
        { midi: 36, onset: 960, duration: 460 },   // C2 — root
        { midi: 48, onset: 1440, duration: 460 },  // C3 — octave pop
      ],
    },
    {
      stepNumber: 82,
      module: 'funk_l2',
      section: 'C',
      subsection: 'C1: Bass Scale (C Minor Dorian)',
      activity: 'C1.4: Octave 2 Root + Octave 3 Pop (In Time)',
      direction: 'In time, play the octave pop pattern. Root on beat 1, pop on the and of 2.',
      assessment: 'pitch_order_timing',
      tag: 'funk:bass_octave_pop_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Octave pop in time — that bounce is the L2 bass signature.',
      contentGeneration:
        'GCM v8: FUNK L2 bass contours=bass_c_funk_04 (octave pop). Root=C2(36), pop=C3(48). Bass_Rhythm_Patterns: bass_r_funk_05. Register: octave 2-3. Tempo: 95-108 BPM.',
      targetNotes: [
        { midi: 36, onset: 0, duration: 460 },
        { midi: 48, onset: 480, duration: 460 },
        { midi: 36, onset: 960, duration: 460 },
        { midi: 48, onset: 1440, duration: 460 },
      ],
    },

    // ── C2: Bass Techniques (6 steps) ────────────────────────────────────
    {
      stepNumber: 83,
      module: 'funk_l2',
      section: 'C',
      subsection: 'C2: Funk Bass Techniques',
      activity: 'C2.1: Chromatic Approach from Below (Out of Time)',
      direction: 'Approach each chord root from one semitone below: B2→C3, E2→F3. The approach note creates tension before resolution.',
      assessment: 'pitch_only',
      tag: 'funk:bass_chromatic_below_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'Chromatic approach from below — one semitone of tension, then resolution.',
      contentGeneration:
        'GCM v8: FUNK L2 bass contours=bass_c_funk_05 (chromatic approach from below). Progression: 1 min9 - 4 dom13 (Cm9→F13). Approach: -1 semitone from each root (B2=47→C3=48, E2=40→F3=53). Register: octave 2-3.',
      targetNotes: [
        { midi: 47, onset: 0, duration: 460 },    // B2 — approach
        { midi: 48, onset: 480, duration: 460 },   // C3 — root of Cm
        { midi: 40, onset: 960, duration: 460 },   // E2 — approach
        { midi: 41, onset: 1440, duration: 460 },  // F2 — root of F
      ],
    },
    {
      stepNumber: 84,
      module: 'funk_l2',
      section: 'C',
      subsection: 'C2: Funk Bass Techniques',
      activity: 'C2.2: Chromatic Approach from Above (Out of Time)',
      direction: 'Approach from above: Db3→C3, Gb2→F2. The half step down resolves into the root.',
      assessment: 'pitch_only',
      tag: 'funk:bass_chromatic_above_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'Approach from above — the descending half step pulls you into the root.',
      contentGeneration:
        'GCM v8: FUNK L2 bass contours=bass_c_funk_05 (chromatic approach from above). Approach: +1 semitone from each root (Db3=49→C3=48, Gb2=42→F2=41). Register: octave 2-3.',
      targetNotes: [
        { midi: 49, onset: 0, duration: 460 },    // Db3 — approach
        { midi: 48, onset: 480, duration: 460 },   // C3 — root of Cm
        { midi: 42, onset: 960, duration: 460 },   // Gb2 — approach
        { midi: 41, onset: 1440, duration: 460 },  // F2 — root of F
      ],
    },
    {
      stepNumber: 85,
      module: 'funk_l2',
      section: 'C',
      subsection: 'C2: Funk Bass Techniques',
      activity: 'C2.3: Chromatic Approach (In Time)',
      direction: 'In time, play chromatic approaches into each chord root. Approach on beat 4, root on beat 1.',
      assessment: 'pitch_order_timing',
      tag: 'funk:bass_chromatic_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Chromatic approach in time — smooth bass player move.',
      contentGeneration:
        'GCM v8: FUNK L2 bass chromatic approach IT. Approach: -1 semitone on beat 4, root on beat 1. Register: octave 2-3. Tempo: 95-108 BPM.',
      targetNotes: [
        { midi: 47, onset: 0, duration: 460 },    // B2 — approach to C
        { midi: 48, onset: 480, duration: 460 },   // C3 — root
        { midi: 40, onset: 960, duration: 460 },   // E2 — approach to F
        { midi: 41, onset: 1440, duration: 460 },  // F2 — root
      ],
    },
    {
      stepNumber: 86,
      module: 'funk_l2',
      section: 'C',
      subsection: 'C2: Funk Bass Techniques',
      activity: 'C2.4: 5th Color Note Pattern (Out of Time)',
      direction: 'Play root then 5th as a color note: C3-G3 (Cm), F2-C3 (F). The 5th adds harmonic depth.',
      assessment: 'pitch_only',
      tag: 'funk:bass_5th_color_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'Root + 5th color — you are painting the harmony from the bass.',
      contentGeneration:
        'GCM v8: FUNK L2 bass contours=bass_c_funk_05. Pattern: root-5th color. Cm: C3(48)-G3(55), F: F2(41)-C3(48). Register: octave 2-3.',
      targetNotes: [
        { midi: 48, onset: 0, duration: 460 },    // C3 — root of Cm
        { midi: 55, onset: 480, duration: 460 },   // G3 — 5th of Cm
        { midi: 41, onset: 960, duration: 460 },   // F2 — root of F
        { midi: 48, onset: 1440, duration: 460 },  // C3 — 5th of F
      ],
    },
    {
      stepNumber: 87,
      module: 'funk_l2',
      section: 'C',
      subsection: 'C2: Funk Bass Techniques',
      activity: 'C2.5: 2-Bar Bass Line (Root + Approach + Color) (Out of Time)',
      direction: 'Combine everything: root on 1, octave pop on and-of-2, chromatic approach on beat 4, resolve to next root. Two bars of funk bass.',
      assessment: 'pitch_only',
      tag: 'funk:bass_2bar_combined_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'A complete 2-bar funk bass line — root, pop, approach, resolve.',
      contentGeneration:
        'GCM v8: FUNK L2 bass 2-bar combined. Bar 1: Cm root(C3)+pop(C4)+5th(G3)+approach(B2). Bar 2: F root(F2)+pop(F3)+5th(C3)+approach(E2). Register: octave 2-3.',
      targetNotes: [
        // Bar 1: Cm
        { midi: 48, onset: 0, duration: 460 },     // C3 root beat 1
        { midi: 60, onset: 480, duration: 240 },    // C4 octave pop
        { midi: 55, onset: 960, duration: 460 },    // G3 5th beat 3
        { midi: 47, onset: 1440, duration: 460 },   // B2 approach beat 4
        // Bar 2: F
        { midi: 41, onset: 1920, duration: 460 },   // F2 root beat 1
        { midi: 53, onset: 2400, duration: 240 },   // F3 octave pop
        { midi: 48, onset: 2880, duration: 460 },   // C3 5th beat 3
        { midi: 40, onset: 3360, duration: 460 },   // E2 approach beat 4
      ],
    },
    {
      stepNumber: 88,
      module: 'funk_l2',
      section: 'C',
      subsection: 'C2: Funk Bass Techniques',
      activity: 'C2.6: 2-Bar Bass Line (In Time)',
      direction: 'Play the 2-bar bass line in time. Root-pop-5th-approach over the Cm→F vamp.',
      assessment: 'pitch_order_timing',
      tag: 'funk:bass_2bar_combined_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Two bars of complete funk bass in the pocket.',
      contentGeneration:
        'GCM v8: FUNK L2 bass 2-bar combined IT. Same pattern as C2.5. Register: octave 2-3. Tempo: 95-108 BPM.',
      targetNotes: [
        { midi: 48, onset: 0, duration: 460 },
        { midi: 60, onset: 480, duration: 240 },
        { midi: 55, onset: 960, duration: 460 },
        { midi: 47, onset: 1440, duration: 460 },
        { midi: 41, onset: 1920, duration: 460 },
        { midi: 53, onset: 2400, duration: 240 },
        { midi: 48, onset: 2880, duration: 460 },
        { midi: 40, onset: 3360, duration: 460 },
      ],
    },

    // ── C3: Bass Play-Along (1 step) ─────────────────────────────────────
    {
      stepNumber: 89,
      module: 'funk_l2',
      section: 'C',
      subsection: 'C3: Bass Play-Along',
      activity: 'C3.1: Bass Line over Funk L2 Backing (In Time)',
      direction: 'Play your bass line over a full L2 funk groove. Drums and chords are provided — you bring the bass with octave pops and chromatic approaches.',
      assessment: 'pitch_order_timing_duration',
      tag: 'funk:bass_playalong_l2 | funk',
      styleRef: 'l2a',
      successFeedback: 'Slap bass over a Stevie-style groove — you are holding down the low end.',
      chordSymbols: ['Cm9', 'F13'],
      contentGeneration:
        'GCM v8: FUNK L2 bass play-along. Progression: 1 min9 - 4 dom13 (Cm9→F13). Bass_Contour_Patterns: bass_c_funk_04 (octave pop) + bass_c_funk_05 (chromatic approach). Bass_Rhythm_Patterns: bass_r_funk_05. Register: octave 2-3 (C2=36, C3=48). Backing: drums (groove_funk_02) + chords (Cm9 rootless [3,10,14], F13 rootless [-2,4,9]; comp_funk_s2). Tempo: 95-108 BPM. Style: l2a.',
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
    // TODO: ActivityStepV2 instrument_config — pending type merge by Ryan
    {
      stepNumber: 90,
      module: 'funk_l2',
      section: 'D',
      subsection: 'D1: LH Bass + RH Chords',
      activity: 'D1.1: LH Octave-Pop Groove + RH Funk Stab 2 Comping (Out of Time)',
      direction: 'Left hand plays the Larry Graham octave-pop pattern. '
        + 'Right hand comps the Cm9 and F13 voicings. '
        + 'Listen for the Drop the Sizzle — Bb drops to A as the chord changes.',
      assessment: 'pitch_only',
      tag: 'funk:performance_lh_bass_rh_chords_l2_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'Both hands working together — bass and chords locking up.',
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
      variants: [
        {
          variantId: 'D1-A',
          description: 'LH octave-pop | RH downbeats only (beats 1+3)',
          targetNotes: [
            // Bar 1 — Cm9
            { midi: 36, onset: 0,    duration: 380 },  // C2 beat1 (LH root)
            { midi: 51, onset: 0,    duration: 120 },  // Eb3 (RH)
            { midi: 55, onset: 0,    duration: 120 },  // G3  (RH)
            { midi: 58, onset: 0,    duration: 120 },  // Bb3 (RH)
            { midi: 62, onset: 0,    duration: 120 },  // D4  (RH)
            { midi: 48, onset: 240,  duration: 120 },  // C3 octave pop (LH)
            { midi: 36, onset: 960,  duration: 380 },  // C2 beat3 (LH)
            { midi: 51, onset: 960,  duration: 120 },  // Eb3 (RH)
            { midi: 55, onset: 960,  duration: 120 },  // G3  (RH)
            { midi: 58, onset: 960,  duration: 120 },  // Bb3 (RH)
            { midi: 62, onset: 960,  duration: 120 },  // D4  (RH)
            { midi: 40, onset: 1360, duration: 120 },  // E2 — approach to F2 ↑
            // Bar 2 — F13
            { midi: 41, onset: 1920, duration: 380 },  // F2 beat1 = GOAL of E2 ↑
            { midi: 51, onset: 1920, duration: 120 },  // Eb3 (RH)
            { midi: 55, onset: 1920, duration: 120 },  // G3  (RH)
            { midi: 57, onset: 1920, duration: 120 },  // A3  (RH) — Sizzle drop
            { midi: 62, onset: 1920, duration: 120 },  // D4  (RH)
            { midi: 29, onset: 2160, duration: 120 },  // F1 octave pop down (LH)
            { midi: 41, onset: 2880, duration: 380 },  // F2 beat3 (LH)
            { midi: 51, onset: 2880, duration: 120 },  // Eb3 (RH)
            { midi: 55, onset: 2880, duration: 120 },  // G3  (RH)
            { midi: 57, onset: 2880, duration: 120 },  // A3  (RH)
            { midi: 62, onset: 2880, duration: 120 },  // D4  (RH)
            { midi: 35, onset: 3280, duration: 120 },  // B1 — approach to C2 ↑
          ],
        },
        {
          variantId: 'D1-B',
          description: 'LH octave-pop | RH full unison with LH',
          targetNotes: [
            // Bar 1 — Cm9
            { midi: 36, onset: 0,    duration: 380 },
            { midi: 51, onset: 0,    duration: 120 },
            { midi: 55, onset: 0,    duration: 120 },
            { midi: 58, onset: 0,    duration: 120 },
            { midi: 62, onset: 0,    duration: 120 },
            { midi: 48, onset: 240,  duration: 120 },  // C3 pop (LH)
            { midi: 51, onset: 240,  duration: 120 },  // RH unison
            { midi: 55, onset: 240,  duration: 120 },
            { midi: 58, onset: 240,  duration: 120 },
            { midi: 62, onset: 240,  duration: 120 },
            { midi: 36, onset: 960,  duration: 380 },
            { midi: 51, onset: 960,  duration: 120 },
            { midi: 55, onset: 960,  duration: 120 },
            { midi: 58, onset: 960,  duration: 120 },
            { midi: 62, onset: 960,  duration: 120 },
            { midi: 40, onset: 1360, duration: 120 },  // E2 approach→F2 (LH) ↑
            { midi: 51, onset: 1360, duration: 120 },  // RH unison
            { midi: 55, onset: 1360, duration: 120 },
            { midi: 58, onset: 1360, duration: 120 },
            { midi: 62, onset: 1360, duration: 120 },
            // Bar 2 — F13
            { midi: 41, onset: 1920, duration: 380 },  // F2 = GOAL ↑
            { midi: 51, onset: 1920, duration: 120 },
            { midi: 55, onset: 1920, duration: 120 },
            { midi: 57, onset: 1920, duration: 120 },
            { midi: 62, onset: 1920, duration: 120 },
            { midi: 29, onset: 2160, duration: 120 },  // F1 pop down (LH)
            { midi: 51, onset: 2160, duration: 120 },
            { midi: 55, onset: 2160, duration: 120 },
            { midi: 57, onset: 2160, duration: 120 },
            { midi: 62, onset: 2160, duration: 120 },
            { midi: 41, onset: 2880, duration: 380 },
            { midi: 51, onset: 2880, duration: 120 },
            { midi: 55, onset: 2880, duration: 120 },
            { midi: 57, onset: 2880, duration: 120 },
            { midi: 62, onset: 2880, duration: 120 },
            { midi: 35, onset: 3280, duration: 120 },  // B1 approach→C2 (LH) ↑
            { midi: 51, onset: 3280, duration: 120 },
            { midi: 55, onset: 3280, duration: 120 },
            { midi: 57, onset: 3280, duration: 120 },
            { midi: 62, onset: 3280, duration: 120 },
          ],
        },
        {
          variantId: 'D1-C',
          description: 'LH sustained whole notes | RH octave-pop stab pattern',
          direction: 'Right hand plays the Larry Graham pattern this time. '
            + 'Left hand holds the root as a whole note. Feel how the technique '
            + 'sounds from the other hand.',
          targetNotes: [
            // Bar 1 — Cm9 | LH: whole note | RH: octave-pop pattern
            { midi: 36, onset: 0,    duration: 1800 }, // C2 whole note (LH)
            { midi: 51, onset: 0,    duration: 120 },
            { midi: 55, onset: 0,    duration: 120 },
            { midi: 58, onset: 0,    duration: 120 },
            { midi: 62, onset: 0,    duration: 120 },
            { midi: 51, onset: 240,  duration: 120 },
            { midi: 55, onset: 240,  duration: 120 },
            { midi: 58, onset: 240,  duration: 120 },
            { midi: 62, onset: 240,  duration: 120 },
            { midi: 51, onset: 960,  duration: 120 },
            { midi: 55, onset: 960,  duration: 120 },
            { midi: 58, onset: 960,  duration: 120 },
            { midi: 62, onset: 960,  duration: 120 },
            { midi: 51, onset: 1360, duration: 120 },
            { midi: 55, onset: 1360, duration: 120 },
            { midi: 58, onset: 1360, duration: 120 },
            { midi: 62, onset: 1360, duration: 120 },
            // Bar 2 — F13 | LH: whole note | RH: octave-pop pattern
            { midi: 41, onset: 1920, duration: 1800 }, // F2 whole note (LH)
            { midi: 51, onset: 1920, duration: 120 },
            { midi: 55, onset: 1920, duration: 120 },
            { midi: 57, onset: 1920, duration: 120 },
            { midi: 62, onset: 1920, duration: 120 },
            { midi: 51, onset: 2160, duration: 120 },
            { midi: 55, onset: 2160, duration: 120 },
            { midi: 57, onset: 2160, duration: 120 },
            { midi: 62, onset: 2160, duration: 120 },
            { midi: 51, onset: 2880, duration: 120 },
            { midi: 55, onset: 2880, duration: 120 },
            { midi: 57, onset: 2880, duration: 120 },
            { midi: 62, onset: 2880, duration: 120 },
            { midi: 51, onset: 3280, duration: 120 },
            { midi: 55, onset: 3280, duration: 120 },
            { midi: 57, onset: 3280, duration: 120 },
            { midi: 62, onset: 3280, duration: 120 },
          ],
        },
      ],
      targetNotes: [],
    },
    {
      stepNumber: 91,
      module: 'funk_l2',
      section: 'D',
      subsection: 'D1: LH Bass + RH Chords',
      activity: 'D1.2: LH Octave-Pop Groove + RH Funk Stab 2 Comping (In Time)',
      assessment: 'pitch_order_timing',
      tag: 'funk:performance_lh_bass_rh_chords_l2_it | funk',
      styleRef: 'l2a',
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
            { midi: 36, onset: 0,    duration: 380 },
            { midi: 51, onset: 0,    duration: 120 },
            { midi: 55, onset: 0,    duration: 120 },
            { midi: 58, onset: 0,    duration: 120 },
            { midi: 62, onset: 0,    duration: 120 },
            { midi: 48, onset: 240,  duration: 120 },
            { midi: 36, onset: 960,  duration: 380 },
            { midi: 51, onset: 960,  duration: 120 },
            { midi: 55, onset: 960,  duration: 120 },
            { midi: 58, onset: 960,  duration: 120 },
            { midi: 62, onset: 960,  duration: 120 },
            { midi: 40, onset: 1360, duration: 120 },
            { midi: 41, onset: 1920, duration: 380 },
            { midi: 51, onset: 1920, duration: 120 },
            { midi: 55, onset: 1920, duration: 120 },
            { midi: 57, onset: 1920, duration: 120 },
            { midi: 62, onset: 1920, duration: 120 },
            { midi: 29, onset: 2160, duration: 120 },  // F1 pop down (LH)
            { midi: 41, onset: 2880, duration: 380 },
            { midi: 51, onset: 2880, duration: 120 },
            { midi: 55, onset: 2880, duration: 120 },
            { midi: 57, onset: 2880, duration: 120 },
            { midi: 62, onset: 2880, duration: 120 },
            { midi: 35, onset: 3280, duration: 120 },
          ],
        },
        {
          variantId: 'D1-B',
          description: 'LH octave-pop | RH full unison with LH',
          targetNotes: [
            { midi: 36, onset: 0,    duration: 380 },
            { midi: 51, onset: 0,    duration: 120 },
            { midi: 55, onset: 0,    duration: 120 },
            { midi: 58, onset: 0,    duration: 120 },
            { midi: 62, onset: 0,    duration: 120 },
            { midi: 48, onset: 240,  duration: 120 },
            { midi: 51, onset: 240,  duration: 120 },
            { midi: 55, onset: 240,  duration: 120 },
            { midi: 58, onset: 240,  duration: 120 },
            { midi: 62, onset: 240,  duration: 120 },
            { midi: 36, onset: 960,  duration: 380 },
            { midi: 51, onset: 960,  duration: 120 },
            { midi: 55, onset: 960,  duration: 120 },
            { midi: 58, onset: 960,  duration: 120 },
            { midi: 62, onset: 960,  duration: 120 },
            { midi: 40, onset: 1360, duration: 120 },
            { midi: 51, onset: 1360, duration: 120 },
            { midi: 55, onset: 1360, duration: 120 },
            { midi: 58, onset: 1360, duration: 120 },
            { midi: 62, onset: 1360, duration: 120 },
            { midi: 41, onset: 1920, duration: 380 },
            { midi: 51, onset: 1920, duration: 120 },
            { midi: 55, onset: 1920, duration: 120 },
            { midi: 57, onset: 1920, duration: 120 },
            { midi: 62, onset: 1920, duration: 120 },
            { midi: 29, onset: 2160, duration: 120 },  // F1 pop down (LH)
            { midi: 51, onset: 2160, duration: 120 },
            { midi: 55, onset: 2160, duration: 120 },
            { midi: 57, onset: 2160, duration: 120 },
            { midi: 62, onset: 2160, duration: 120 },
            { midi: 41, onset: 2880, duration: 380 },
            { midi: 51, onset: 2880, duration: 120 },
            { midi: 55, onset: 2880, duration: 120 },
            { midi: 57, onset: 2880, duration: 120 },
            { midi: 62, onset: 2880, duration: 120 },
            { midi: 35, onset: 3280, duration: 120 },
            { midi: 51, onset: 3280, duration: 120 },
            { midi: 55, onset: 3280, duration: 120 },
            { midi: 57, onset: 3280, duration: 120 },
            { midi: 62, onset: 3280, duration: 120 },
          ],
        },
        {
          variantId: 'D1-C',
          description: 'LH sustained whole notes | RH octave-pop stab pattern',
          direction: 'Right hand plays the Larry Graham pattern this time. '
            + 'Left hand holds the root as a whole note.',
          targetNotes: [
            { midi: 36, onset: 0,    duration: 1800 },
            { midi: 51, onset: 0,    duration: 120 },
            { midi: 55, onset: 0,    duration: 120 },
            { midi: 58, onset: 0,    duration: 120 },
            { midi: 62, onset: 0,    duration: 120 },
            { midi: 51, onset: 240,  duration: 120 },
            { midi: 55, onset: 240,  duration: 120 },
            { midi: 58, onset: 240,  duration: 120 },
            { midi: 62, onset: 240,  duration: 120 },
            { midi: 51, onset: 960,  duration: 120 },
            { midi: 55, onset: 960,  duration: 120 },
            { midi: 58, onset: 960,  duration: 120 },
            { midi: 62, onset: 960,  duration: 120 },
            { midi: 51, onset: 1360, duration: 120 },
            { midi: 55, onset: 1360, duration: 120 },
            { midi: 58, onset: 1360, duration: 120 },
            { midi: 62, onset: 1360, duration: 120 },
            { midi: 41, onset: 1920, duration: 1800 },
            { midi: 51, onset: 1920, duration: 120 },
            { midi: 55, onset: 1920, duration: 120 },
            { midi: 57, onset: 1920, duration: 120 },
            { midi: 62, onset: 1920, duration: 120 },
            { midi: 51, onset: 2160, duration: 120 },
            { midi: 55, onset: 2160, duration: 120 },
            { midi: 57, onset: 2160, duration: 120 },
            { midi: 62, onset: 2160, duration: 120 },
            { midi: 51, onset: 2880, duration: 120 },
            { midi: 55, onset: 2880, duration: 120 },
            { midi: 57, onset: 2880, duration: 120 },
            { midi: 62, onset: 2880, duration: 120 },
            { midi: 51, onset: 3280, duration: 120 },
            { midi: 55, onset: 3280, duration: 120 },
            { midi: 57, onset: 3280, duration: 120 },
            { midi: 62, onset: 3280, duration: 120 },
          ],
        },
      ],
      targetNotes: [],
    },

    // ── D2: LH Chords + RH Melody (2 steps) ─────────────────────────────
    {
      stepNumber: 92,
      module: 'funk_l2',
      section: 'D',
      subsection: 'D2: LH Chords + RH Melody',
      activity: 'D2.1: LH Rootless Voicings + RH Motivic Phrase (Out of Time)',
      direction: 'Left hand plays the Cm9 and F13 rootless voicings. Right hand plays the call-and-answer melody phrase from the A section. Listen for the Drop the Sizzle — Bb drops to A as the chord changes.',
      assessment: 'pitch_only',
      tag: 'funk:performance_lh_chords_rh_melody_l2_oot | funk',
      styleRef: 'l2a',
      successFeedback: 'Both hands together — voicings in the left, melody in the right.',
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
        // LH bar 1 — Cm9 [3-5-b7-9]: Eb3+G3+Bb3+D4
        { midi: 51, onset:    0, duration: 120 },  // Eb3
        { midi: 55, onset:    0, duration: 120 },  // G3
        { midi: 58, onset:    0, duration: 120 },  // Bb3
        { midi: 62, onset:    0, duration: 120 },  // D4
        { midi: 51, onset:  360, duration: 120 },
        { midi: 55, onset:  360, duration: 120 },
        { midi: 58, onset:  360, duration: 120 },
        { midi: 62, onset:  360, duration: 120 },
        { midi: 51, onset:  960, duration: 120 },
        { midi: 55, onset:  960, duration: 120 },
        { midi: 58, onset:  960, duration: 120 },
        { midi: 62, onset:  960, duration: 120 },
        { midi: 51, onset: 1200, duration: 120 },
        { midi: 55, onset: 1200, duration: 120 },
        { midi: 58, onset: 1200, duration: 120 },
        { midi: 62, onset: 1200, duration: 120 },
        // LH bar 2 — F13 [b7-9-3-13]: Eb3+G3+A3+D4 (only Bb→A)
        { midi: 51, onset: 1920, duration: 120 },
        { midi: 55, onset: 1920, duration: 120 },
        { midi: 57, onset: 1920, duration: 120 },  // A3 — Drop the Sizzle
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
        // RH bar 1 — call phrase
        { midi: 67, onset:    0, duration:  480 },  // G4  bar1 beat1
        { midi: 70, onset:  600, duration:  240 },  // Bb4 bar1 beat2.2
        { midi: 69, onset:  840, duration:  120 },  // A4  bar1 beat2.4
        { midi: 67, onset:  960, duration:  960 },  // G4  bar1 beat3
        // RH bar 2 — answer phrase
        { midi: 67, onset: 1920, duration:  480 },  // G4  bar2 beat1
        { midi: 65, onset: 2520, duration:  240 },  // F4  bar2 beat2.2
        { midi: 67, onset: 2760, duration:  120 },  // G4  bar2 beat2.4
        { midi: 65, onset: 2880, duration:  960 },  // F4  bar2 beat3
      ],
    },
    {
      stepNumber: 93,
      module: 'funk_l2',
      section: 'D',
      subsection: 'D2: LH Chords + RH Melody',
      activity: 'D2.2: LH Rootless Voicings + RH Motivic Phrase (In Time)',
      direction: 'Same two-hand pattern, now in time with drums and bass backing.',
      assessment: 'pitch_order_timing',
      tag: 'funk:performance_lh_chords_rh_melody_l2_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Both hands in time — voicings and melody locked together.',
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
        { midi: 51, onset:    0, duration: 120 },
        { midi: 55, onset:    0, duration: 120 },
        { midi: 58, onset:    0, duration: 120 },
        { midi: 62, onset:    0, duration: 120 },
        { midi: 51, onset:  360, duration: 120 },
        { midi: 55, onset:  360, duration: 120 },
        { midi: 58, onset:  360, duration: 120 },
        { midi: 62, onset:  360, duration: 120 },
        { midi: 51, onset:  960, duration: 120 },
        { midi: 55, onset:  960, duration: 120 },
        { midi: 58, onset:  960, duration: 120 },
        { midi: 62, onset:  960, duration: 120 },
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
        { midi: 67, onset:    0, duration:  480 },  // G4  bar1 beat1
        { midi: 70, onset:  600, duration:  240 },  // Bb4 bar1 beat2.2
        { midi: 69, onset:  840, duration:  120 },  // A4  bar1 beat2.4
        { midi: 67, onset:  960, duration:  960 },  // G4  bar1 beat3
        { midi: 67, onset: 1920, duration:  480 },  // G4  bar2 beat1
        { midi: 65, onset: 2520, duration:  240 },  // F4  bar2 beat2.2
        { midi: 67, onset: 2760, duration:  120 },  // G4  bar2 beat2.4
        { midi: 65, onset: 2880, duration:  960 },  // F4  bar2 beat3
      ],
    },

    // ── D3: Full Groove (2 steps) ────────────────────────────────────────
    {
      stepNumber: 94,
      module: 'funk_l2',
      section: 'D',
      subsection: 'D3: Full Groove',
      activity: 'D3.1: Full Groove — Melody (In Time)',
      direction: 'The full band is playing. Your job is the melody. You already know this phrase — now play it with the whole groove behind you.',
      assessment: 'pitch_order_timing',
      tag: 'funk:performance_full_groove_l2_it | funk',
      styleRef: 'l2a',
      successFeedback: 'Melody over the full funk groove — you are in the band.',
      chordSymbols: ['Cm9', 'F13'],
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 67, onset:    0, duration:  480 },  // G4  bar1 beat1
        { midi: 70, onset:  600, duration:  240 },  // Bb4 bar1 beat2.2
        { midi: 69, onset:  840, duration:  120 },  // A4  bar1 beat2.4
        { midi: 67, onset:  960, duration:  960 },  // G4  bar1 beat3
        { midi: 67, onset: 1920, duration:  480 },  // G4  bar2 beat1
        { midi: 65, onset: 2520, duration:  240 },  // F4  bar2 beat2.2
        { midi: 67, onset: 2760, duration:  120 },  // G4  bar2 beat2.4
        { midi: 65, onset: 2880, duration:  960 },  // F4  bar2 beat3
      ],
    },
    {
      stepNumber: 95,
      module: 'funk_l2',
      section: 'D',
      subsection: 'D3: Full Groove',
      activity: 'D3.2: Full Groove — Prince Style (In Time)',
      direction: 'Same melody, same groove — but now with the Prince early-80s feel. Tighter swing, heavier 16th. Same notes, different pocket.',
      assessment: 'pitch_order_timing',
      tag: 'funk:performance_full_groove_l2b_it | funk',
      styleRef: 'l2b',
      successFeedback: 'L2 Funk complete. Both styles, both hands. See you at Level 3.',
      chordSymbols: ['Cm9', 'F13'],
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 67, onset:    0, duration:  480 },  // G4  bar1 beat1
        { midi: 70, onset:  600, duration:  240 },  // Bb4 bar1 beat2.2
        { midi: 69, onset:  840, duration:  120 },  // A4  bar1 beat2.4
        { midi: 67, onset:  960, duration:  960 },  // G4  bar1 beat3
        { midi: 67, onset: 1920, duration:  480 },  // G4  bar2 beat1
        { midi: 65, onset: 2520, duration:  240 },  // F4  bar2 beat2.2
        { midi: 67, onset: 2760, duration:  120 },  // G4  bar2 beat2.4
        { midi: 65, onset: 2880, duration:  960 },  // F4  bar2 beat3
      ],
    },
  ],
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
    defaultKey: 'C minor (Dorian)',
    defaultScale: [0, 2, 3, 5, 7, 9, 10], // C Dorian
    defaultScaleId: 'dorian',
    tempoRange: [95, 108],
    swing: 0, // v2 note: swing not used at ActivityFlow level — defined per sub-profile in styleDna/funk.v2.ts
    grooves: ['groove_funk_01', 'groove_funk_02', 'groove_funk_03'],
  },
  sections: [
    funkL2SectionA,
    funkL2SectionB,
    funkL2SectionC,
    funkL2SectionD,
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
    // ── A1: Advanced Scales (6 steps) ────────────────────────────────────
    {
      stepNumber: 96,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A1: Advanced Scales',
      activity: 'A1.1: A Dorian Full Scale with Nat.6 Emphasis (Out of Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction: 'Play the full A Dorian scale. Emphasize the F# (nat.6) — it is the Dorian fingerprint. A-B-C-D-E-F#-G-A.',
      assessment: 'pitch_only',
      tag: 'funk:dorian_full_nat6_oot | funk',
      styleRef: 'l3a',
      successFeedback: 'A Dorian with the F# — you know this mode inside and out now.',
      contentGeneration:
        'GCM v8: FUNK L3 melody scale=dorian [0,2,3,5,7,9,10]. Key: A minor. Contour: ascending stepwise. Natural 6 = F#4 (MIDI 66). Register: C4-C5.',
    },
    {
      stepNumber: 97,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A1: Advanced Scales',
      activity: 'A1.2: A Minor Blues with Chromatic Approaches (Out of Time)',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      direction: 'Play the A minor blues scale with chromatic approach notes. The Eb (b5) is the blue note — use it as a passing tone between D and E.',
      assessment: 'pitch_only',
      tag: 'funk:minor_blues_chromatic_oot | funk',
      styleRef: 'l3a',
      successFeedback: 'Blues scale with chromatic color — L3 melodic vocabulary.',
      contentGeneration:
        'GCM v8: FUNK L3 melody scale_alt=minor_blues [0,3,5,6,7,10]. Key: A minor. Chromatic_passing=true. Blue note = Eb4 (MIDI 63). Register: C4-C5.',
    },
    {
      stepNumber: 98,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A1: Advanced Scales',
      activity: 'A1.3: A Dorian Ascending (In Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction: 'In a steady tempo, play the A Dorian scale going up.',
      assessment: 'pitch_order_timing',
      tag: 'funk:dorian_ascending_it | funk',
      styleRef: 'l3a',
      successFeedback: 'Dorian in time — steady and confident at L3 tempo.',
      contentGeneration:
        'GCM v8: FUNK L3 melody scale=dorian [0,2,3,5,7,9,10]. Key: A minor. Contour: ascending stepwise. Register: C4-C5. Tempo: 85-110 BPM.',
    },
    {
      stepNumber: 99,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A1: Advanced Scales',
      activity: 'A1.4: Dorian Nat.6 Ornament — G→F#→E→D (Out of Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction: 'Play the ornamental descent: G4→F#4→E4→D4 (b7→nat6→5→4). The F# is the Dorian character note — this four-note phrase is a staple of L3 funk melody.',
      assessment: 'pitch_only',
      tag: 'funk:dorian_nat6_ornament_oot | funk',
      styleRef: 'l3a',
      successFeedback: 'The Dorian ornament — G to F# is the moment the mode reveals itself.',
      contentGeneration:
        'GCM v8: FUNK L3 Dorian nat.6 ornament. Phrase: b7-nat6-5-4 descending (G4=67, F#4=66, E4=64, D4=62). Scale: dorian [0,2,3,5,7,9,10]. Key: A minor. Register: C4-C5.',
      targetNotes: [
        { midi: 67, onset: 0, duration: 460 },    // G4 — b7
        { midi: 66, onset: 480, duration: 460 },   // F#4 — nat6 (character note)
        { midi: 64, onset: 960, duration: 460 },   // E4 — 5
        { midi: 62, onset: 1440, duration: 460 },  // D4 — 4
      ],
    },
    {
      stepNumber: 100,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A1: Advanced Scales',
      activity: 'A1.5: Dorian Nat.6 Ornament (In Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction: 'Play the G→F#→E→D ornament in time.',
      assessment: 'pitch_order_timing',
      tag: 'funk:dorian_nat6_ornament_it | funk',
      styleRef: 'l3a',
      successFeedback: 'Dorian ornament in the groove — automatic now.',
      contentGeneration:
        'GCM v8: FUNK L3 Dorian nat.6 ornament IT. Same phrase. Tempo: 85-110 BPM.',
      targetNotes: [
        { midi: 67, onset: 0, duration: 460 },
        { midi: 66, onset: 480, duration: 460 },
        { midi: 64, onset: 960, duration: 460 },
        { midi: 62, onset: 1440, duration: 460 },
      ],
    },
    {
      stepNumber: 101,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A1: Advanced Scales',
      activity: 'A1.6: Blue Note (Eb) Chromatic Color Exercise (Out of Time)',
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleId: 'minor_blues',
      direction: 'Play D4→Eb4→E4 — the blue note (Eb) as a chromatic passing tone between the 4th and 5th. Then resolve to A4. The b5 adds grit without changing the mode.',
      assessment: 'pitch_only',
      tag: 'funk:blue_note_chromatic_oot | funk',
      styleRef: 'l3a',
      successFeedback: 'The blue note as chromatic color — D to Eb to E, pure funk tension.',
      contentGeneration:
        'GCM v8: FUNK L3 blue note exercise. Phrase: 4-b5-5-root (D4=62, Eb4=63, E4=64, A4=69). Blue note Eb4 (MIDI 63) as approach/passing note. Scale: minor_blues [0,3,5,6,7,10]. Key: A minor.',
      targetNotes: [
        { midi: 62, onset: 0, duration: 460 },    // D4 — 4th
        { midi: 63, onset: 480, duration: 240 },   // Eb4 — blue note (short, passing)
        { midi: 64, onset: 720, duration: 460 },   // E4 — 5th (resolves)
        { midi: 69, onset: 1440, duration: 960 },  // A4 — root (long hold)
      ],
    },

    // ── A2: Melodic Phrases (6 steps) ────────────────────────────────────
    {
      stepNumber: 102,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.1: 8-Bar Motivic Structure — ABABAB\'B\'\' (Out of Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction: 'Learn the 8-bar motivic structure: Call phrase (A) repeats on odd bars. Answer phrase (B) repeats on even bars. B\' is extended in bar 4. B\'\' is the most complex in bar 8.',
      assessment: 'pitch_only',
      tag: 'funk:phrase_motivic_8bar_oot | funk',
      styleRef: 'l3a',
      successFeedback: 'The 8-bar motivic structure — call and answer with variations. This is how funk melodies are built at the highest level.',
      contentGeneration:
        'GCM v8: FUNK L3 melody phrase → motivic_8bar (ABABAB\'B\'\'). Melody_Phrase_Rhythm_Library: genre=funk, phrase_rhythm_bars=2, contour_notes=[4,5], rhythm_tiers=[3,4], zero_point_options=[0,2,4,6], contour_concat=2→8. Scale: dorian [0,2,3,5,7,9,10]. Key: A minor. Register: C4-C5. Chromatic_passing=true.',
      targetNotes: [
        // A phrase (bars 1-2) — F#4 nat.6 identity
        { midi: 69, onset:     0, duration:  960 },  // A4  bar1 beat1
        { midi: 66, onset:   960, duration:  480 },  // F#4 bar1 beat3
        { midi: 64, onset:  1440, duration:  480 },  // E4  bar1 beat4
        { midi: 66, onset:  1920, duration: 1920 },  // F#4 bar2 whole
        // B phrase (bars 3-4) — answer, descend to D4
        { midi: 64, onset:  3840, duration:  480 },  // E4  bar3 beat1
        { midi: 62, onset:  4320, duration:  480 },  // D4  bar3 beat2
        { midi: 64, onset:  4800, duration:  960 },  // E4  bar3 beat3-4
        { midi: 69, onset:  5760, duration: 1920 },  // A4  bar4 whole
        // A repeat (bars 5-6) — exact repeat
        { midi: 69, onset:  7680, duration:  960 },  // A4  bar5 beat1
        { midi: 66, onset:  8640, duration:  480 },  // F#4 bar5 beat3
        { midi: 64, onset:  9120, duration:  480 },  // E4  bar5 beat4
        { midi: 66, onset:  9600, duration: 1920 },  // F#4 bar6 whole
        // B' phrase (bars 7-8) — varied answer, longest hold on bar 8
        { midi: 67, onset: 11520, duration:  480 },  // G4  bar7 beat1
        { midi: 64, onset: 12000, duration:  480 },  // E4  bar7 beat2
        { midi: 62, onset: 12480, duration:  480 },  // D4  bar7 beat3
        { midi: 64, onset: 12960, duration:  480 },  // E4  bar7 beat4
        { midi: 66, onset: 13440, duration: 1920 },  // F#4 bar8 whole
      ],
    },
    {
      stepNumber: 103,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.2: 8-Bar Motivic Structure (In Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction: 'Play the 8-bar motivic structure in time.',
      assessment: 'pitch_order_timing',
      tag: 'funk:phrase_motivic_8bar_it | funk',
      styleRef: 'l3a',
      successFeedback: '8 bars of motivic funk melody in the pocket.',
      contentGeneration:
        'GCM v8: FUNK L3 melody phrase → motivic_8bar IT. Same structure. Tempo: 85-110 BPM.',
      targetNotes: [
        { midi: 69, onset:     0, duration:  960 },
        { midi: 66, onset:   960, duration:  480 },
        { midi: 64, onset:  1440, duration:  480 },
        { midi: 66, onset:  1920, duration: 1920 },
        { midi: 64, onset:  3840, duration:  480 },
        { midi: 62, onset:  4320, duration:  480 },
        { midi: 64, onset:  4800, duration:  960 },
        { midi: 69, onset:  5760, duration: 1920 },
        { midi: 69, onset:  7680, duration:  960 },
        { midi: 66, onset:  8640, duration:  480 },
        { midi: 64, onset:  9120, duration:  480 },
        { midi: 66, onset:  9600, duration: 1920 },
        { midi: 67, onset: 11520, duration:  480 },
        { midi: 64, onset: 12000, duration:  480 },
        { midi: 62, onset: 12480, duration:  480 },
        { midi: 64, onset: 12960, duration:  480 },
        { midi: 66, onset: 13440, duration: 1920 },
      ],
    },
    {
      stepNumber: 104,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.3: Dual Functionality — Same Phrase over Chord Changes (Out of Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction: 'Play the SAME melodic phrase while the chords change underneath (Am9→Ddom13→Am9→Edom7#9). The parent mode (A Dorian) stays constant. Chord tones that happen to align are coincidental — you are NOT tracking the chords.',
      assessment: 'pitch_only',
      tag: 'funk:dual_functionality_oot | funk',
      styleRef: 'l3a',
      successFeedback: 'Dual functionality — the melody stays in the parent mode while harmony moves around it. This is advanced funk.',
      contentGeneration:
        'GCM v8: FUNK L3 dual functionality exercise. Melody: A Dorian phrase (fixed). Progression: Am9→Ddom13→Am9→Edom7#9 (moves underneath). Parent mode = A Dorian throughout. P3 weight = 0.05 (parent mode primary). Register: C4-C5.',
      targetNotes: [
        { midi: 69, onset:     0, duration:  960 },
        { midi: 66, onset:   960, duration:  480 },
        { midi: 64, onset:  1440, duration:  480 },
        { midi: 66, onset:  1920, duration: 1920 },
        { midi: 64, onset:  3840, duration:  480 },
        { midi: 62, onset:  4320, duration:  480 },
        { midi: 64, onset:  4800, duration:  960 },
        { midi: 69, onset:  5760, duration: 1920 },
        { midi: 69, onset:  7680, duration:  960 },
        { midi: 66, onset:  8640, duration:  480 },
        { midi: 64, onset:  9120, duration:  480 },
        { midi: 66, onset:  9600, duration: 1920 },
        { midi: 67, onset: 11520, duration:  480 },
        { midi: 64, onset: 12000, duration:  480 },
        { midi: 62, onset: 12480, duration:  480 },
        { midi: 64, onset: 12960, duration:  480 },
        { midi: 66, onset: 13440, duration: 1920 },
      ],
    },
    {
      stepNumber: 105,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.4: Dual Functionality (In Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction: 'Play the dual functionality exercise in time. Keep the melody steady — the chords move, you don\'t.',
      assessment: 'pitch_order_timing',
      tag: 'funk:dual_functionality_it | funk',
      styleRef: 'l3a',
      successFeedback: 'Dual functionality in the groove — the melody floats above the harmony.',
      contentGeneration:
        'GCM v8: FUNK L3 dual functionality IT. Same phrase over changing chords. Tempo: 85-110 BPM.',
      targetNotes: [
        { midi: 69, onset:     0, duration:  960 },
        { midi: 66, onset:   960, duration:  480 },
        { midi: 64, onset:  1440, duration:  480 },
        { midi: 66, onset:  1920, duration: 1920 },
        { midi: 64, onset:  3840, duration:  480 },
        { midi: 62, onset:  4320, duration:  480 },
        { midi: 64, onset:  4800, duration:  960 },
        { midi: 69, onset:  5760, duration: 1920 },
        { midi: 69, onset:  7680, duration:  960 },
        { midi: 66, onset:  8640, duration:  480 },
        { midi: 64, onset:  9120, duration:  480 },
        { midi: 66, onset:  9600, duration: 1920 },
        { midi: 67, onset: 11520, duration:  480 },
        { midi: 64, onset: 12000, duration:  480 },
        { midi: 62, onset: 12480, duration:  480 },
        { midi: 64, onset: 12960, duration:  480 },
        { midi: 66, onset: 13440, duration: 1920 },
      ],
    },
    {
      stepNumber: 106,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.5: Final Answer Phrase — Dense Run → Long Hold (Out of Time)',
      scaleId: 'dorian',
      direction: 'The B\'\' phrase — the final answer. Build density: four quick notes, then one long held note that resolves everything. The silence after the hold is part of the phrase.',
      assessment: 'pitch_only',
      tag: 'funk:phrase_final_answer_oot | funk',
      styleRef: 'l3a',
      successFeedback: 'Dense run to long hold — that is the phrase shape that makes listeners lean in.',
      targetNotes: [
        { midi: 72, onset: 0,    duration: 120 },  // C5 (cluster start)
        { midi: 71, onset: 120,  duration: 120 },  // B4
        { midi: 69, onset: 240,  duration: 120 },  // A4
        { midi: 66, onset: 360,  duration: 120 },  // F#4 (nat.6 — Dorian finish)
        { midi: 64, onset: 480,  duration: 1440 }, // E4 long resolve
      ],
    },
    {
      stepNumber: 107,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A2: Melodic Phrases',
      activity: 'A2.6: Final Answer Phrase (In Time)',
      scaleId: 'dorian',
      direction: 'Play the final answer phrase in time. Feel the tension build to the resolution.',
      assessment: 'pitch_order_timing',
      tag: 'funk:phrase_final_answer_it | funk',
      styleRef: 'l3a',
      successFeedback: 'The final answer in the pocket — maximum tension, perfect resolution.',
      targetNotes: [
        { midi: 72, onset: 0,    duration: 120 },
        { midi: 71, onset: 120,  duration: 120 },
        { midi: 69, onset: 240,  duration: 120 },
        { midi: 66, onset: 360,  duration: 120 },
        { midi: 64, onset: 480,  duration: 1440 },
      ],
    },

    // ── A3: Melody Play-Along (2 steps) ──────────────────────────────────
    {
      stepNumber: 108,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A3: Melody Play-Along',
      activity: 'A3.1: Melody over Funk L3 Backing (In Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction: 'Play your melody over a full L3 funk groove. Headhunters or Tower of Power style. Drums, synth bass, and sparse EP chords are provided — you bring the melody with dual functionality.',
      assessment: 'pitch_order_timing',
      tag: 'funk:melody_playalong_l3 | funk',
      styleRef: 'l3a',
      successFeedback: 'Melody over a Deep Groove — L3 funk mastery.',
      contentGeneration:
        'GCM v8: FUNK L3 melody play-along. Generate 8-bar melody: Melody_Phrase_Rhythm_Library (genre=funk, phrase_rhythm_bars=2, contour_notes=[4,5], rhythm_tiers=[3,4], contour_concat=2→8). Motivic structure ABABAB\'B\'\'. Chromatic_passing=true. Scale: dorian [0,2,3,5,7,9,10]. Key: A minor. Register: C4-C5. Backing: drums (groove_funk_03) + bass (Synth Bass 1, bass_c_funk_06) + chords (Am9 rootless, sparse EP1). Progression: Am9→Ddom13→Am9→Edom7#9. Tempo: 85-110 BPM. Style: l3a.',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 69, onset:    0, duration:  480 },  // A4  beat1
        { midi: 66, onset:  480, duration:  480 },  // F#4 beat2
        { midi: 64, onset:  960, duration:  480 },  // E4  beat3
        { midi: 66, onset: 1440, duration:  480 },  // F#4 beat4
        { midi: 69, onset: 1920, duration: 1920 },  // A4  bar2 whole
      ],
    },
    {
      stepNumber: 109,
      module: 'funk_l3',
      section: 'A',
      subsection: 'A3: Melody Play-Along',
      activity: 'A3.2: Melody Play-Along — New Key + New Style (In Time)',
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleId: 'dorian',
      direction: 'New key, new style sub-profile. Your Dorian melody skills in any key, any L3 arrangement.',
      assessment: 'pitch_order_timing',
      tag: 'funk:melody_playalong_newkey_l3 | funk',
      styleRef: 'l3b',
      successFeedback: 'New key, new style, same mastery. Your funk melody vocabulary is complete.',
      contentGeneration:
        'GCM v8: FUNK L3 melody play-along — transposed key + l3b style. key_center: runtime (exclude A minor). Scale: dorian in new key. Backing: l3b arrangement (Prince/Silk Sonic — Slap Bass, Synth Lead, Synth Brass). Tempo: 85-110 BPM. Style: l3b.',
      backing_parts: {
        engine_generates: ['drums', 'bass', 'chords'],
        student_plays: ['melody'],
      },
      targetNotes: [
        { midi: 69, onset:    0, duration:  480 },  // A4  beat1
        { midi: 66, onset:  480, duration:  480 },  // F#4 beat2
        { midi: 64, onset:  960, duration:  480 },  // E4  beat3
        { midi: 66, onset: 1440, duration:  480 },  // F#4 beat4
        { midi: 69, onset: 1920, duration: 1920 },  // A4  bar2 whole
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
    // ── B1: Extended Chord Arpeggios (6 steps) ───────────────────────────
    {
      stepNumber: 110,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B1: Extended Chord Arpeggios',
      activity: 'B1.1: Am9 Extended Arpeggio (Out of Time)',
      direction: 'Play Am9 chord tones one at a time: A-C-E-G-B. Five notes — root, b3, 5, b7, 9.',
      assessment: 'pitch_only',
      tag: 'funk:arpeggiate_am9_oot | funk',
      styleRef: 'l3a',
      successFeedback: 'Am9 — five chord tones, the lush minor 9th sound.',
      contentGeneration:
        'GCM v8: chord_types min9 [0,3,7,10,14]. Root=A. Contour: ascending. Register: C3-C5.',
      targetNotes: [
        { midi: 57, onset: 0, duration: 460 },    // A3
        { midi: 60, onset: 480, duration: 460 },   // C4
        { midi: 64, onset: 960, duration: 460 },   // E4
        { midi: 67, onset: 1440, duration: 460 },  // G4
        { midi: 71, onset: 1920, duration: 460 },  // B4
      ],
    },
    {
      stepNumber: 111,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B1: Extended Chord Arpeggios',
      activity: 'B1.2: Eb Dom9 (Tritone Sub) Arpeggio (Out of Time)',
      direction: 'Play Eb dom9 chord tones: Eb-G-Bb-Db-F. This is the tritone substitution of A dom7 — same tritone (G-Db), different root.',
      assessment: 'pitch_only',
      tag: 'funk:arpeggiate_ebdom9_oot | funk',
      styleRef: 'l3a',
      successFeedback: 'Eb dom9 tritone sub — same tritone, different perspective.',
      contentGeneration:
        'GCM v8: Eb dom9 tritone sub of A dom7. Root=Eb. Register: C3-C5.',
      targetNotes: [
        { midi: 51, onset: 0, duration: 460 },    // Eb3
        { midi: 55, onset: 480, duration: 460 },   // G3
        { midi: 58, onset: 960, duration: 460 },   // Bb3
        { midi: 61, onset: 1440, duration: 460 },  // Db4
        { midi: 65, onset: 1920, duration: 460 },  // F4
      ],
    },
    {
      stepNumber: 112,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B1: Extended Chord Arpeggios',
      activity: 'B1.3: Chromatic Planing Sequence (Out of Time)',
      direction: 'Play Am6 → Eb dom9 → D dom9 — each chord voiced identically, shifted down one semitone. This is chromatic planing: parallel chord movement.',
      assessment: 'pitch_only',
      tag: 'funk:chromatic_planing_sequence_oot | funk',
      styleRef: 'l3b',
      successFeedback: 'Chromatic planing — parallel motion, each voice moves the same distance. Prince territory.',
      contentGeneration:
        'GCM v8: FUNK L3 chromatic planing. Am6 [0,3,9] → Eb dom9 funk9 [-2,2,7] → D dom9 funk9 [-2,2,7]. Parallel voicing shifted -1 semitone each step.',
      targetNotes: [
        // Am6: A3-C4-F#4
        { midi: 57, onset: 0, duration: 460 },    // A3
        { midi: 60, onset: 0, duration: 460 },    // C4
        { midi: 66, onset: 0, duration: 460 },    // F#4
        // Eb dom9 funk9: Db3-F3-Bb3
        { midi: 49, onset: 480, duration: 460 },   // Db3
        { midi: 53, onset: 480, duration: 460 },   // F3
        { midi: 58, onset: 480, duration: 460 },   // Bb3
        // D dom9 funk9: C3-E3-A3
        { midi: 48, onset: 960, duration: 460 },   // C3
        { midi: 52, onset: 960, duration: 460 },   // E3
        { midi: 57, onset: 960, duration: 460 },   // A3
      ],
    },
    {
      stepNumber: 113,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B1: Extended Chord Arpeggios',
      activity: 'B1.4: Chromatic Planing Sequence (In Time)',
      direction: 'Play the chromatic planing sequence in time. One chord per beat.',
      assessment: 'pitch_order_timing',
      tag: 'funk:chromatic_planing_sequence_it | funk',
      styleRef: 'l3b',
      successFeedback: 'Chromatic planing in the groove.',
      contentGeneration:
        'GCM v8: FUNK L3 chromatic planing IT. Same sequence. Tempo: 85-110 BPM.',
      targetNotes: [
        { midi: 57, onset: 0, duration: 460 },
        { midi: 60, onset: 0, duration: 460 },
        { midi: 66, onset: 0, duration: 460 },
        { midi: 49, onset: 480, duration: 460 },
        { midi: 53, onset: 480, duration: 460 },
        { midi: 58, onset: 480, duration: 460 },
        { midi: 48, onset: 960, duration: 460 },
        { midi: 52, onset: 960, duration: 460 },
        { midi: 57, onset: 960, duration: 460 },
      ],
    },
    {
      stepNumber: 114,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B1: Extended Chord Arpeggios',
      activity: 'B1.5: Funk9 Voicing with Chromatic Approach (Out of Time)',
      direction: 'Play the funk9 voicing on A: G3-B3-E4. Then approach from -1 semitone (Gb3-Bb3-Eb4) and resolve back. The approach chord slides up into the real chord.',
      assessment: 'pitch_only',
      tag: 'funk:funk9_approach_oot | funk',
      styleRef: 'l3a',
      successFeedback: 'Funk9 with chromatic approach — slide into the voicing.',
      contentGeneration:
        'GCM v8: FUNK L3 funk9 voicing with approach. A funk9: [-2,2,7] from A3(57) = G3(55)-B3(59)-E4(64). Approach: -1 semitone = Gb3(54)-Bb3(58)-Eb4(63). Stab note duration: 120t.',
      targetNotes: [
        // Approach chord (-1 semitone)
        { midi: 54, onset: 0, duration: 120 },    // Gb3
        { midi: 58, onset: 0, duration: 120 },    // Bb3
        { midi: 63, onset: 0, duration: 120 },    // Eb4
        // Target chord
        { midi: 55, onset: 240, duration: 460 },   // G3
        { midi: 59, onset: 240, duration: 460 },   // B3
        { midi: 64, onset: 240, duration: 460 },   // E4
      ],
    },
    {
      stepNumber: 115,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B1: Extended Chord Arpeggios',
      activity: 'B1.6: Funk9 Voicing with Approach (In Time)',
      direction: 'Play the approach-resolve funk9 in time. Approach on the preceding 16th, target on the downbeat.',
      assessment: 'pitch_order_timing',
      tag: 'funk:funk9_approach_it | funk',
      styleRef: 'l3a',
      successFeedback: 'Chromatic approach funk9 in time — classic funk keyboard move.',
      contentGeneration:
        'GCM v8: FUNK L3 funk9 approach IT. Tempo: 85-110 BPM.',
      targetNotes: [
        { midi: 54, onset: 0, duration: 120 },
        { midi: 58, onset: 0, duration: 120 },
        { midi: 63, onset: 0, duration: 120 },
        { midi: 55, onset: 240, duration: 460 },
        { midi: 59, onset: 240, duration: 460 },
        { midi: 64, onset: 240, duration: 460 },
      ],
    },

    // ── B2: Advanced Voicings (8 steps) ──────────────────────────────────
    {
      stepNumber: 116,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B2: Advanced Voicings',
      activity: 'B2.1: Am9 Rootless (7-9-3-5) (Out of Time)',
      direction: 'Play Am9 rootless: G3-B3-C4-E4. No root — bass provides it. Four notes, maximum color.',
      assessment: 'pitch_only',
      tag: 'funk:am9_rootless_oot | funk',
      styleRef: 'l3a',
      successFeedback: 'Am9 rootless — open, lush, pianistic voicing.',
      contentGeneration:
        'GCM v8: min9 rootless 7-9-3-5. From A3(57): G3(55)-B3(59)-C4(60)-E4(64). All within C3-C5.',
      targetNotes: [
        { midi: 55, onset: 0, duration: 1920 },   // G3 — b7
        { midi: 59, onset: 0, duration: 1920 },   // B3 — 9
        { midi: 60, onset: 0, duration: 1920 },   // C4 — b3
        { midi: 64, onset: 0, duration: 1920 },   // E4 — 5
      ],
    },
    // TODO: Genre_Voicing_Taxonomy_v2 — E dom7#9 Hendrix: rh_override=[56,62,67] (G#3-D4-G4)
    {
      stepNumber: 117,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B2: Advanced Voicings',
      activity: 'B2.2: Dom7#9 Hendrix Voicing (3-b7-#9) (Out of Time)',
      direction: 'The Hendrix voicing over E dominant: G#3-D4-G4. Major 3rd on the bottom, flat 7th in the middle, sharp 9th on top. The #9 (G natural) against the 3rd (G#) — that tension IS the Hendrix sound.',
      assessment: 'pitch_only',
      tag: 'funk:dom7s9_hendrix_oot | funk',
      styleRef: 'l3a',
      successFeedback: 'The Hendrix chord — G# on the bottom, G natural on top. Essential deep funk.',
      contentGeneration:
        'Genre_Voicing_Taxonomy_v2: E dom7#9 Hendrix. G#3(56)-D4(62)-G4(67). 3+b7+#9. Left to right: G#-D-G. Register: C3-C5.',
      targetNotes: [
        { midi: 56, onset: 0, duration: 1920 },   // G#3 — 3rd of E
        { midi: 62, onset: 0, duration: 1920 },   // D4 — b7 of E
        { midi: 67, onset: 0, duration: 1920 },   // G4 — #9 of E
      ],
    },
    // TODO: Genre_Voicing_Taxonomy_v2 — A dom13 rootless: rh_override=[55,61,66] (G3-C#4-F#4)
    {
      stepNumber: 118,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B2: Advanced Voicings',
      activity: 'B2.3: A Dom13 Rootless (b7-3-13) (Out of Time)',
      direction: 'Play A dom13 rootless: G3-C#4-F#4. The Sizzle landing from Am9 — G stays, B drops to C# (wait, no — this is a different voicing). b7, major 3rd, 13th.',
      assessment: 'pitch_only',
      tag: 'funk:adom13_rootless_oot | funk',
      styleRef: 'l3a',
      successFeedback: 'A dom13 rootless — three notes of dominant color.',
      contentGeneration:
        'Genre_Voicing_Taxonomy_v2: A dom13 rootless [-2,4,9] from A3(57). G3(55)+C#4(61)+F#4(66). b7+3+13. All within C3-C5 register.',
      targetNotes: [
        { midi: 55, onset: 0, duration: 1920 },   // G3 — b7
        { midi: 61, onset: 0, duration: 1920 },   // C#4 — 3rd
        { midi: 66, onset: 0, duration: 1920 },   // F#4 — 13th
      ],
    },
    {
      stepNumber: 119,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B2: Advanced Voicings',
      activity: 'B2.4: Upper Structure Approach — Chord -1 Semitone → Resolution (Out of Time)',
      direction: 'Play Am9 rootless approached from -1 semitone. The approach voicing (Gb3-Bb3-B3-Eb4) slides up to the real Am9 (G3-B3-C4-E4). Every voice moves up one semitone.',
      assessment: 'pitch_only',
      tag: 'funk:upper_structure_approach_oot | funk',
      styleRef: 'l3a',
      successFeedback: 'Upper structure approach — the slide-up creates maximum tension before resolution.',
      contentGeneration:
        'GCM v8: FUNK L3 upper structure approach. Approach: Am9 rootless -1 semitone [54,58,59,63] → target [55,59,60,64]. Register: C3-C5.',
      targetNotes: [
        // Approach (-1 semitone)
        { midi: 54, onset: 0, duration: 120 },    // Gb3
        { midi: 58, onset: 0, duration: 120 },    // Bb3
        { midi: 59, onset: 0, duration: 120 },    // B3
        { midi: 63, onset: 0, duration: 120 },    // Eb4
        // Target Am9 rootless
        { midi: 55, onset: 240, duration: 960 },   // G3
        { midi: 59, onset: 240, duration: 960 },   // B3
        { midi: 60, onset: 240, duration: 960 },   // C4
        { midi: 64, onset: 240, duration: 960 },   // E4
      ],
    },
    {
      stepNumber: 120,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B2: Advanced Voicings',
      activity: 'B2.5: Upper Structure Approach (In Time)',
      direction: 'Play the upper structure approach-resolve in time. Approach on the preceding 16th.',
      assessment: 'pitch_order_timing',
      tag: 'funk:upper_structure_approach_it | funk',
      styleRef: 'l3a',
      successFeedback: 'Upper structure approach in time — maximum L3 voicing sophistication.',
      contentGeneration:
        'GCM v8: FUNK L3 upper structure approach IT. Tempo: 85-110 BPM.',
      targetNotes: [
        { midi: 54, onset: 0, duration: 120 },
        { midi: 58, onset: 0, duration: 120 },
        { midi: 59, onset: 0, duration: 120 },
        { midi: 63, onset: 0, duration: 120 },
        { midi: 55, onset: 240, duration: 960 },
        { midi: 59, onset: 240, duration: 960 },
        { midi: 60, onset: 240, duration: 960 },
        { midi: 64, onset: 240, duration: 960 },
      ],
    },
    {
      stepNumber: 121,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B2: Advanced Voicings',
      activity: 'B2.6: Funk Stab 2 Full Pattern with Chromatic Approaches (Out of Time)',
      direction: 'Play the full Funk Stab 2 comping pattern using Am9 rootless voicing. Every chord hit is preceded by the same chord one semitone below.',
      assessment: 'pitch_only',
      tag: 'funk:stab2_chromatic_full_oot | funk',
      styleRef: 'l3a',
      successFeedback: 'Chromatic approaches on every stab — L3 chord vocabulary.',
      targetNotes: [
        // Stab 1 beat 1: approach then chord (Am9 rootless = C4+G4+B4)
        { midi: 59, onset: 0,    duration: 60  }, { midi: 66, onset: 0,    duration: 60  }, { midi: 70, onset: 0,    duration: 60  },
        { midi: 60, onset: 60,   duration: 120 }, { midi: 67, onset: 60,   duration: 120 }, { midi: 71, onset: 60,   duration: 120 },
        // Stab 2 a-of-1
        { midi: 59, onset: 300,  duration: 60  }, { midi: 66, onset: 300,  duration: 60  }, { midi: 70, onset: 300,  duration: 60  },
        { midi: 60, onset: 360,  duration: 120 }, { midi: 67, onset: 360,  duration: 120 }, { midi: 71, onset: 360,  duration: 120 },
        // Stab 3 and-of-2
        { midi: 60, onset: 720,  duration: 120 }, { midi: 67, onset: 720,  duration: 120 }, { midi: 71, onset: 720,  duration: 120 },
        // Stab 4 beat 3
        { midi: 60, onset: 960,  duration: 120 }, { midi: 67, onset: 960,  duration: 120 }, { midi: 71, onset: 960,  duration: 120 },
        // Stab 5 a-of-3
        { midi: 60, onset: 1200, duration: 120 }, { midi: 67, onset: 1200, duration: 120 }, { midi: 71, onset: 1200, duration: 120 },
        // Stab 6 e-of-3
        { midi: 60, onset: 1320, duration: 120 }, { midi: 67, onset: 1320, duration: 120 }, { midi: 71, onset: 1320, duration: 120 },
      ],
    },
    {
      stepNumber: 122,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B2: Advanced Voicings',
      activity: 'B2.7: Funk Stab 2 Full Pattern (In Time)',
      direction: 'Play the Stab 2 pattern in time with the metronome.',
      assessment: 'pitch_order_timing',
      tag: 'funk:stab2_chromatic_full_it | funk',
      styleRef: 'l3a',
      successFeedback: 'Stab 2 in time — locked to the grid.',
      targetNotes: [
        { midi: 59, onset: 0,    duration: 60  }, { midi: 66, onset: 0,    duration: 60  }, { midi: 70, onset: 0,    duration: 60  },
        { midi: 60, onset: 60,   duration: 120 }, { midi: 67, onset: 60,   duration: 120 }, { midi: 71, onset: 60,   duration: 120 },
        { midi: 59, onset: 300,  duration: 60  }, { midi: 66, onset: 300,  duration: 60  }, { midi: 70, onset: 300,  duration: 60  },
        { midi: 60, onset: 360,  duration: 120 }, { midi: 67, onset: 360,  duration: 120 }, { midi: 71, onset: 360,  duration: 120 },
        { midi: 60, onset: 720,  duration: 120 }, { midi: 67, onset: 720,  duration: 120 }, { midi: 71, onset: 720,  duration: 120 },
        { midi: 60, onset: 960,  duration: 120 }, { midi: 67, onset: 960,  duration: 120 }, { midi: 71, onset: 960,  duration: 120 },
        { midi: 60, onset: 1200, duration: 120 }, { midi: 67, onset: 1200, duration: 120 }, { midi: 71, onset: 1200, duration: 120 },
        { midi: 60, onset: 1320, duration: 120 }, { midi: 67, onset: 1320, duration: 120 }, { midi: 71, onset: 1320, duration: 120 },
      ],
    },
    {
      stepNumber: 123,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B2: Advanced Voicings',
      activity: 'B2.8: Stab Density Arc — Sparse→Medium→Dense (Out of Time)',
      direction: 'Play 4 bars: bar 1 = 2 stabs (sparse), bar 2 = 4 stabs, bar 3 = 4 stabs, bar 4 = 6 stabs (dense). The density builds — this creates tension and momentum.',
      assessment: 'pitch_only',
      tag: 'funk:stab_density_arc_oot | funk',
      styleRef: 'l3a',
      successFeedback: 'Density arc — sparse to dense across 4 bars is the Tightness Architecture T2 rule.',
      contentGeneration:
        'Stab density arc: bar1=2 stabs, bar2=4, bar3=4, bar4=6. Uses Am9 rootless [60,67,71]. Follows Funk Tightness Architecture T2 (phrase lock escalation). Stab duration: 120t hard rule.',
      targetNotes: [
        // Bar 1: sparse (2 stabs) — beat 1 + beat 3
        { midi: 60, onset: 0,    duration: 120 }, { midi: 67, onset: 0,    duration: 120 }, { midi: 71, onset: 0,    duration: 120 },
        { midi: 60, onset: 960,  duration: 120 }, { midi: 67, onset: 960,  duration: 120 }, { midi: 71, onset: 960,  duration: 120 },
        // Bar 2: medium (4 stabs) — beat1, a-of-1, beat3, a-of-3
        { midi: 60, onset: 1920, duration: 120 }, { midi: 67, onset: 1920, duration: 120 }, { midi: 71, onset: 1920, duration: 120 },
        { midi: 60, onset: 2280, duration: 120 }, { midi: 67, onset: 2280, duration: 120 }, { midi: 71, onset: 2280, duration: 120 },
        { midi: 60, onset: 2880, duration: 120 }, { midi: 67, onset: 2880, duration: 120 }, { midi: 71, onset: 2880, duration: 120 },
        { midi: 60, onset: 3120, duration: 120 }, { midi: 67, onset: 3120, duration: 120 }, { midi: 71, onset: 3120, duration: 120 },
        // Bar 3: medium (4 stabs)
        { midi: 60, onset: 3840, duration: 120 }, { midi: 67, onset: 3840, duration: 120 }, { midi: 71, onset: 3840, duration: 120 },
        { midi: 60, onset: 4200, duration: 120 }, { midi: 67, onset: 4200, duration: 120 }, { midi: 71, onset: 4200, duration: 120 },
        { midi: 60, onset: 4800, duration: 120 }, { midi: 67, onset: 4800, duration: 120 }, { midi: 71, onset: 4800, duration: 120 },
        { midi: 60, onset: 5040, duration: 120 }, { midi: 67, onset: 5040, duration: 120 }, { midi: 71, onset: 5040, duration: 120 },
        // Bar 4: dense (6 stabs) — full Stab 2 pattern
        { midi: 60, onset: 5760, duration: 120 }, { midi: 67, onset: 5760, duration: 120 }, { midi: 71, onset: 5760, duration: 120 },
        { midi: 60, onset: 6120, duration: 120 }, { midi: 67, onset: 6120, duration: 120 }, { midi: 71, onset: 6120, duration: 120 },
        { midi: 60, onset: 6480, duration: 120 }, { midi: 67, onset: 6480, duration: 120 }, { midi: 71, onset: 6480, duration: 120 },
        { midi: 60, onset: 6720, duration: 120 }, { midi: 67, onset: 6720, duration: 120 }, { midi: 71, onset: 6720, duration: 120 },
        { midi: 60, onset: 6960, duration: 120 }, { midi: 67, onset: 6960, duration: 120 }, { midi: 71, onset: 6960, duration: 120 },
        { midi: 60, onset: 7080, duration: 120 }, { midi: 67, onset: 7080, duration: 120 }, { midi: 71, onset: 7080, duration: 120 },
      ],
    },

    // ── B3: Progressions (5 steps) ───────────────────────────────────────
    {
      stepNumber: 124,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B3: Funk Progressions',
      activity: 'B3.1: Am9→Ddom13→Am9→Edom7#9 — Headhunters Style (Out of Time)',
      direction: 'Play the Headhunters progression using rootless voicings. Am9 (G-B-C-E) → D dom13 (C-F#-B → Sizzle from Am9) → Am9 → E dom7#9 (D-G-G#).',
      assessment: 'pitch_only',
      tag: 'funk:progression_headhunters_oot | funk',
      styleRef: 'l3a',
      successFeedback: 'The Headhunters progression — Chameleon territory.',
      contentGeneration:
        'GCM v8: FUNK L3 Headhunters progression. Am9 rootless [55,59,60,64] → Ddom13 rootless [-2,4,9] from D → Am9 → Edom7#9 [56,62,67]. Voice leading: Sizzle on Am9→Ddom13.',
      targetNotes: [
        // Am9 rootless
        { midi: 55, onset: 0, duration: 460 },
        { midi: 59, onset: 0, duration: 460 },
        { midi: 60, onset: 0, duration: 460 },
        { midi: 64, onset: 0, duration: 460 },
        // D dom13 rootless: C3(48)-F#3(54)-B3(59) = [-2,4,9] from D3(50)
        { midi: 48, onset: 480, duration: 460 },
        { midi: 54, onset: 480, duration: 460 },
        { midi: 59, onset: 480, duration: 460 },
        // Am9 return
        { midi: 55, onset: 960, duration: 460 },
        { midi: 59, onset: 960, duration: 460 },
        { midi: 60, onset: 960, duration: 460 },
        { midi: 64, onset: 960, duration: 460 },
        // E dom7#9 Hendrix: G#3-D4-G4
        { midi: 56, onset: 1440, duration: 460 },
        { midi: 62, onset: 1440, duration: 460 },
        { midi: 67, onset: 1440, duration: 460 },
      ],
    },
    {
      stepNumber: 125,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B3: Funk Progressions',
      activity: 'B3.2: Headhunters Progression (In Time)',
      direction: 'Play the Headhunters progression in time. One chord per bar.',
      assessment: 'pitch_order_timing',
      tag: 'funk:progression_headhunters_it | funk',
      styleRef: 'l3a',
      successFeedback: 'Headhunters in the pocket — Chameleon lives.',
      contentGeneration:
        'GCM v8: FUNK L3 Headhunters IT. Tempo: 85-110 BPM, one chord per bar.',
      targetNotes: [
        { midi: 55, onset: 0, duration: 460 },
        { midi: 59, onset: 0, duration: 460 },
        { midi: 60, onset: 0, duration: 460 },
        { midi: 64, onset: 0, duration: 460 },
        { midi: 48, onset: 480, duration: 460 },
        { midi: 54, onset: 480, duration: 460 },
        { midi: 59, onset: 480, duration: 460 },
        { midi: 55, onset: 960, duration: 460 },
        { midi: 59, onset: 960, duration: 460 },
        { midi: 60, onset: 960, duration: 460 },
        { midi: 64, onset: 960, duration: 460 },
        { midi: 56, onset: 1440, duration: 460 },  // G#3
        { midi: 62, onset: 1440, duration: 460 },  // D4
        { midi: 67, onset: 1440, duration: 460 },  // G4
      ],
    },
    {
      stepNumber: 126,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B3: Funk Progressions',
      activity: 'B3.3: Am6→Ebdom9→Ddom9→Edom9 — Chromatic Planing, Prince Style (Out of Time)',
      direction: 'Play the chromatic planing progression: Am6 (A-C-F#) → Eb dom9 funk9 (Db-F-Bb) → D dom9 funk9 (C-E-A) → E dom9 funk9 (D-F#-B). Each funk9 voicing shifts chromatically.',
      assessment: 'pitch_only',
      tag: 'funk:progression_chromatic_planing_oot | funk',
      styleRef: 'l3b',
      successFeedback: 'Chromatic planing progression — Prince style parallel movement.',
      contentGeneration:
        'GCM v8: FUNK L3 chromatic planing progression. Am6→Ebdom9→Ddom9→Edom9. Prince/Tower of Power style.',
      targetNotes: [
        // Am6: A3-C4-F#4
        { midi: 57, onset: 0, duration: 460 },
        { midi: 60, onset: 0, duration: 460 },
        { midi: 66, onset: 0, duration: 460 },
        // Eb dom9 funk9: Db3-F3-Bb3
        { midi: 49, onset: 480, duration: 460 },
        { midi: 53, onset: 480, duration: 460 },
        { midi: 58, onset: 480, duration: 460 },
        // D dom9 funk9: C3-E3-A3
        { midi: 48, onset: 960, duration: 460 },
        { midi: 52, onset: 960, duration: 460 },
        { midi: 57, onset: 960, duration: 460 },
        // E dom9 funk9: D3-F#3-B3
        { midi: 50, onset: 1440, duration: 460 },
        { midi: 54, onset: 1440, duration: 460 },
        { midi: 59, onset: 1440, duration: 460 },
      ],
    },
    {
      stepNumber: 127,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B3: Funk Progressions',
      activity: 'B3.4: Chromatic Planing Progression (In Time)',
      direction: 'Play the chromatic planing progression in time.',
      assessment: 'pitch_order_timing',
      tag: 'funk:progression_chromatic_planing_it | funk',
      styleRef: 'l3b',
      successFeedback: 'Chromatic planing in the groove — Prince-level harmonic sophistication.',
      contentGeneration:
        'GCM v8: FUNK L3 chromatic planing IT. Tempo: 85-110 BPM.',
      targetNotes: [
        { midi: 57, onset: 0, duration: 460 },
        { midi: 60, onset: 0, duration: 460 },
        { midi: 66, onset: 0, duration: 460 },
        { midi: 49, onset: 480, duration: 460 },
        { midi: 53, onset: 480, duration: 460 },
        { midi: 58, onset: 480, duration: 460 },
        { midi: 48, onset: 960, duration: 460 },
        { midi: 52, onset: 960, duration: 460 },
        { midi: 57, onset: 960, duration: 460 },
        { midi: 50, onset: 1440, duration: 460 },
        { midi: 54, onset: 1440, duration: 460 },
        { midi: 59, onset: 1440, duration: 460 },
      ],
    },
    {
      stepNumber: 128,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B3: Funk Progressions',
      activity: 'B3.5: Modal Vamp — Student Chooses Comping Density (In Time)',
      direction: 'The A minor vamp is running. Play the Am9 rootless voicing — but choose your own density. Sparse (2 stabs/bar)? Medium (4)? Dense (6)? Your musical choice.',
      assessment: 'pitch_order_timing',
      tag: 'funk:modal_vamp_density_choice_l3_it | funk',
      styleRef: 'l3a',
      successFeedback: 'Density is a musical choice — you just made one.',
      chordSymbols: ['Am9'],
      backing_parts: { engine_generates: ['drums', 'bass'], student_plays: ['chords'] },
    },

    // ── B4: Chord Play-Along (1 step) ────────────────────────────────────
    {
      stepNumber: 129,
      module: 'funk_l3',
      section: 'B',
      subsection: 'B4: Chord Play-Along',
      activity: 'B4.1: Chord Comping over Funk L3 Backing (In Time)',
      direction: 'Comp chords over the full L3 groove. Use chromatic approaches and the Headhunters or Prince progression — your choice of style.',
      assessment: 'pitch_order_timing',
      tag: 'funk:chords_playalong_l3 | funk',
      styleRef: 'l3a',
      successFeedback: 'L3 chord vocabulary over a live groove. That is the full toolkit.',
      chordSymbols: ['Am9', 'D13', 'Am9', 'E7'],
      backing_parts: {
        engine_generates: ['drums', 'bass'],
        student_plays: ['chords'],
      },
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
    // ── C1: Advanced Bass Patterns (5 steps, 130-134) ────────────────────
    {
      stepNumber: 130,
      module: 'funk_l3',
      section: 'C',
      subsection: 'C1: Advanced Bass Patterns',
      activity: 'C1.1: Melodic Bass Line — Octave 2 Root + Chromatic Fills (Out of Time)',
      direction: 'Play a 2-bar melodic bass line: root A2, then fill chromatically downward. This is what Joe Dart calls "lyrical embellishment."',
      assessment: 'pitch_only',
      tag: 'funk:bass_melodic_l3_oot | funk',
      styleRef: 'l3a',
      successFeedback: 'Melodic bass — the line sings. That is Tier 4 on the Dart ladder.',
      targetNotes: [
        { midi: 45, onset: 0,    duration: 480 },  // A2 root
        { midi: 44, onset: 480,  duration: 240 },  // G#2 chromatic fill
        { midi: 43, onset: 720,  duration: 240 },  // G2
        { midi: 42, onset: 960,  duration: 240 },  // F#2
        { midi: 40, onset: 1200, duration: 720 },  // E2 rest on 5th
        { midi: 45, onset: 1920, duration: 480 },  // A2 bar 2 start
        { midi: 47, onset: 2400, duration: 240 },  // B2
        { midi: 48, onset: 2640, duration: 240 },  // C3
        { midi: 50, onset: 2880, duration: 960 },  // D3 long resolve
      ],
    },
    {
      stepNumber: 131,
      module: 'funk_l3',
      section: 'C',
      subsection: 'C1: Advanced Bass Patterns',
      activity: 'C1.2: Melodic Bass Line (In Time)',
      assessment: 'pitch_order_timing',
      tag: 'funk:bass_melodic_l3_it | funk',
      styleRef: 'l3a',
      successFeedback: 'Melodic bass in time — the line breathes with the groove.',
      targetNotes: [
        { midi: 45, onset: 0,    duration: 480 },
        { midi: 44, onset: 480,  duration: 240 },
        { midi: 43, onset: 720,  duration: 240 },
        { midi: 42, onset: 960,  duration: 240 },
        { midi: 40, onset: 1200, duration: 720 },
        { midi: 45, onset: 1920, duration: 480 },
        { midi: 47, onset: 2400, duration: 240 },
        { midi: 48, onset: 2640, duration: 240 },
        { midi: 50, onset: 2880, duration: 960 },
      ],
    },
    {
      stepNumber: 132,
      module: 'funk_l3',
      section: 'C',
      subsection: 'C1: Advanced Bass Patterns',
      activity: 'C1.3: Behind-the-Beat Float Pattern (Out of Time)',
      direction: 'Play root A2 but deliberately late — 30-50ms after the beat. The note floats. This is the "pulled-back feel" that Nate Smith described — same tempo, different energy.',
      assessment: 'pitch_only',
      tag: 'funk:bass_behind_beat_l3_oot | funk',
      styleRef: 'l3a',
      successFeedback: 'Behind the beat — the groove leans back. That is section feel.',
      targetNotes: [
        { midi: 45, onset: 30,   duration: 460 },  // A2 late (+30t)
        { midi: 45, onset: 960,  duration: 460 },  // A2 beat 3 on time
        { midi: 40, onset: 1470, duration: 460 },  // E2 late (+30t)
        { midi: 45, onset: 1920, duration: 460 },  // A2 bar 2
      ],
    },
    {
      stepNumber: 133,
      module: 'funk_l3',
      section: 'C',
      subsection: 'C1: Advanced Bass Patterns',
      activity: 'C1.4: Double Stop — Octave Intervals (Out of Time)',
      direction: 'Play root + octave simultaneously in the bass: A2 and A3 together. Then D2+D3. Octave double stops are structural — they anchor the harmony with maximum weight.',
      assessment: 'pitch_only',
      tag: 'funk:bass_double_stop_octave_l3_oot | funk',
      styleRef: 'l3a',
      successFeedback: 'Octave double stops — the bass becomes the foundation of everything.',
      targetNotes: [
        { midi: 45, onset: 0,    duration: 960 },  // A2
        { midi: 57, onset: 0,    duration: 960 },  // A3 (octave)
        { midi: 38, onset: 960,  duration: 960 },  // D2
        { midi: 50, onset: 960,  duration: 960 },  // D3 (octave)
      ],
    },
    {
      stepNumber: 134,
      module: 'funk_l3',
      section: 'C',
      subsection: 'C1: Advanced Bass Patterns',
      activity: 'C1.5: Double Stop Octaves (In Time)',
      assessment: 'pitch_order_timing',
      tag: 'funk:bass_double_stop_octave_l3_it | funk',
      styleRef: 'l3a',
      successFeedback: 'Octave double stops in time — maximum weight, maximum groove.',
      targetNotes: [
        { midi: 45, onset: 0,    duration: 960 },
        { midi: 57, onset: 0,    duration: 960 },
        { midi: 38, onset: 960,  duration: 960 },
        { midi: 50, onset: 960,  duration: 960 },
      ],
    },

    // ── C2: Bass Techniques (6 steps, 135-140) ──────────────────────────
    {
      stepNumber: 135,
      module: 'funk_l3',
      section: 'C',
      subsection: 'C2: Bass Techniques',
      activity: 'C2.1: Selective Lock — Bass Locks Kick on Beat 1 + Beat 3 (Out of Time)',
      direction: 'Play bass on exactly beat 1 and beat 3 — locking with the kick drum. Everything else is your own choice. This is Tightness Config A: bass+kick locked.',
      assessment: 'pitch_only',
      tag: 'funk:bass_selective_lock_l3_oot | funk',
      styleRef: 'l3a',
      successFeedback: 'Selective lock — two beats anchored, two beats free. That is the groove.',
      targetNotes: [
        { midi: 45, onset: 0,    duration: 460 },  // A2 beat 1
        { midi: 45, onset: 960,  duration: 460 },  // A2 beat 3
        { midi: 45, onset: 1920, duration: 460 },  // bar 2 beat 1
        { midi: 45, onset: 2880, duration: 460 },  // bar 2 beat 3
      ],
    },
    {
      stepNumber: 136,
      module: 'funk_l3',
      section: 'C',
      subsection: 'C2: Bass Techniques',
      activity: 'C2.2: Selective Lock (In Time)',
      assessment: 'pitch_order_timing',
      tag: 'funk:bass_selective_lock_l3_it | funk',
      styleRef: 'l3a',
      successFeedback: 'Selective lock in time — the pocket inside the pocket.',
      targetNotes: [
        { midi: 45, onset: 0,    duration: 460 },
        { midi: 45, onset: 960,  duration: 460 },
        { midi: 45, onset: 1920, duration: 460 },
        { midi: 45, onset: 2880, duration: 460 },
      ],
    },
    {
      stepNumber: 137,
      module: 'funk_l3',
      section: 'C',
      subsection: 'C2: Bass Techniques',
      activity: 'C2.3: 5th Color Note + Chromatic Approach Combined (Out of Time)',
      direction: 'Root A2, chromatic approach from below (G#2), then 5th E2. The approach leads into the color note. Full L3 bass vocabulary in one pattern.',
      assessment: 'pitch_only',
      tag: 'funk:bass_fifth_chromatic_combined_l3_oot | funk',
      styleRef: 'l3a',
      successFeedback: 'Root + approach + color — the complete L3 bass phrase.',
      targetNotes: [
        { midi: 45, onset: 0,    duration: 480 },  // A2 root
        { midi: 44, onset: 480,  duration: 240 },  // G#2 chromatic approach
        { midi: 40, onset: 720,  duration: 480 },  // E2 5th color note
        { midi: 45, onset: 1200, duration: 720 },  // A2 return (long)
      ],
    },
    {
      stepNumber: 138,
      module: 'funk_l3',
      section: 'C',
      subsection: 'C2: Bass Techniques',
      activity: 'C2.4: Paul Jackson Style — 2-Bar Melodic Bass (Out of Time)',
      direction: 'Paul Jackson (Headhunters) played bass like a melody. Learn this 2-bar line: descends through the A pentatonic, then climbs back chromatically. The bass tells a story.',
      assessment: 'pitch_only',
      tag: 'funk:bass_paul_jackson_l3_oot | funk',
      styleRef: 'l3a',
      successFeedback: 'Paul Jackson style — the bass is the most melodic instrument in the band.',
      targetNotes: [
        // Bar 1: A pentatonic descent
        { midi: 45, onset: 0,    duration: 480 },  // A2
        { midi: 40, onset: 480,  duration: 240 },  // E2
        { midi: 38, onset: 720,  duration: 240 },  // D2
        { midi: 40, onset: 960,  duration: 480 },  // E2
        { midi: 43, onset: 1440, duration: 480 },  // G2
        // Bar 2: Chromatic climb
        { midi: 45, onset: 1920, duration: 480 },  // A2
        { midi: 44, onset: 2400, duration: 240 },  // G#2
        { midi: 43, onset: 2640, duration: 240 },  // G2
        { midi: 42, onset: 2880, duration: 480 },  // F#2
        { midi: 45, onset: 3360, duration: 480 },  // A2 return
      ],
    },
    {
      stepNumber: 139,
      module: 'funk_l3',
      section: 'C',
      subsection: 'C2: Bass Techniques',
      activity: 'C2.5: Paul Jackson Melodic Bass (In Time)',
      assessment: 'pitch_order_timing',
      tag: 'funk:bass_paul_jackson_l3_it | funk',
      styleRef: 'l3a',
      successFeedback: 'Paul Jackson melodic bass in time — the Headhunters pocket.',
      targetNotes: [
        { midi: 45, onset: 0,    duration: 480 },
        { midi: 40, onset: 480,  duration: 240 },
        { midi: 38, onset: 720,  duration: 240 },
        { midi: 40, onset: 960,  duration: 480 },
        { midi: 43, onset: 1440, duration: 480 },
        { midi: 45, onset: 1920, duration: 480 },
        { midi: 44, onset: 2400, duration: 240 },
        { midi: 43, onset: 2640, duration: 240 },
        { midi: 42, onset: 2880, duration: 480 },
        { midi: 45, onset: 3360, duration: 480 },
      ],
    },
    {
      stepNumber: 140,
      module: 'funk_l3',
      section: 'C',
      subsection: 'C2: Bass Techniques',
      activity: 'C2.6: Bass over Chromatic Planing Progression (Out of Time)',
      direction: 'Play bass roots under the chromatic planing chords: A2 — Eb2 — D2 — E2. The bass root moves with the chord roots as the top voices slide down.',
      assessment: 'pitch_only',
      tag: 'funk:bass_chromatic_planing_l3_oot | funk',
      styleRef: 'l3b',
      successFeedback: 'Bass roots under chromatic planing — vertical tightness rule V2 in action.',
      chordSymbols: ['Am6', 'Eb9', 'D9', 'E9'],
      targetNotes: [
        { midi: 45, onset: 0,    duration: 460 },  // A2 (under Am6)
        { midi: 39, onset: 480,  duration: 460 },  // Eb2 (under Eb9)
        { midi: 38, onset: 960,  duration: 460 },  // D2 (under D9)
        { midi: 40, onset: 1440, duration: 480 },  // E2 (under E9)
      ],
    },

    // ── C3: Bass Play-Along (1 step, 141) ────────────────────────────────
    {
      stepNumber: 141,
      module: 'funk_l3',
      section: 'C',
      subsection: 'C3: Bass Play-Along',
      activity: 'C3.1: Bass Line over Funk L3 Backing (In Time)',
      direction: 'Full L3 groove — bring everything: octave pops, chromatic approaches, melodic fills, double stops. Joe Dart Tier 4+5.',
      assessment: 'pitch_order_timing_duration',
      tag: 'funk:bass_playalong_l3 | funk',
      styleRef: 'l3a',
      successFeedback: 'L3 bass over a live groove — you are playing at the level of the Headhunters.',
      chordSymbols: ['Am9', 'D13', 'Am9', 'E7'],
      backing_parts: {
        engine_generates: ['drums', 'chords'],
        student_plays: ['bass'],
      },
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
      stepNumber: 142,
      module: 'funk_l3',
      section: 'D',
      subsection: 'D1: LH Bass + RH Chords (Headhunters)',
      activity: 'D1.1: LH Synth Bass + RH Sparse EP1 Voicings (Out of Time)',
      direction: 'Left hand: locked bass on A2, beat 1 and 3 only. Right hand: sparse Am9 rootless stabs. Headhunters feel — maximum space, maximum groove.',
      assessment: 'pitch_order_timing',
      tag: 'funk:performance_headhunters_l3_oot | funk',
      styleRef: 'l3a',
      successFeedback: 'Headhunters feel — sparse, deep, every note matters.',
      instrument_config: { instrument: 'piano', hand_config: 'lh_bass_rh_chords', lh_role: 'bass', rh_role: 'chords', style_ref: 'l3a' },
      targetNotes: [
        // LH: selective lock beat 1+3
        { midi: 45, onset: 0,    duration: 460 },  // A2
        { midi: 45, onset: 960,  duration: 460 },  // A2 beat 3
        // RH: sparse Am9 stabs (comp_funk_s1: beat1, a-of-1, beat3, a-of-3)
        { midi: 60, onset: 0,    duration: 120 }, { midi: 67, onset: 0,    duration: 120 }, { midi: 71, onset: 0,    duration: 120 },
        { midi: 60, onset: 360,  duration: 120 }, { midi: 67, onset: 360,  duration: 120 }, { midi: 71, onset: 360,  duration: 120 },
        { midi: 60, onset: 960,  duration: 120 }, { midi: 67, onset: 960,  duration: 120 }, { midi: 71, onset: 960,  duration: 120 },
        { midi: 60, onset: 1200, duration: 120 }, { midi: 67, onset: 1200, duration: 120 }, { midi: 71, onset: 1200, duration: 120 },
      ],
      backing_parts: { engine_generates: ['drums'], student_plays: ['bass', 'chords'] },
    },
    {
      stepNumber: 143,
      module: 'funk_l3',
      section: 'D',
      subsection: 'D1: LH Bass + RH Chords (Headhunters)',
      activity: 'D1.2: LH Synth Bass + RH Funk Stabs — Full Headhunters Feel (In Time)',
      assessment: 'pitch_order_timing_duration',
      tag: 'funk:performance_headhunters_l3_it | funk',
      styleRef: 'l3a',
      successFeedback: 'Headhunters in time — sparse, locked, deep groove.',
      instrument_config: { instrument: 'piano', hand_config: 'lh_bass_rh_chords', lh_role: 'bass', rh_role: 'chords', style_ref: 'l3a' },
      targetNotes: [
        { midi: 45, onset: 0,    duration: 460 },
        { midi: 45, onset: 960,  duration: 460 },
        { midi: 60, onset: 0,    duration: 120 }, { midi: 67, onset: 0,    duration: 120 }, { midi: 71, onset: 0,    duration: 120 },
        { midi: 60, onset: 360,  duration: 120 }, { midi: 67, onset: 360,  duration: 120 }, { midi: 71, onset: 360,  duration: 120 },
        { midi: 60, onset: 960,  duration: 120 }, { midi: 67, onset: 960,  duration: 120 }, { midi: 71, onset: 960,  duration: 120 },
        { midi: 60, onset: 1200, duration: 120 }, { midi: 67, onset: 1200, duration: 120 }, { midi: 71, onset: 1200, duration: 120 },
      ],
      backing_parts: { engine_generates: ['drums'], student_plays: ['bass', 'chords'] },
    },

    // ── D2: LH Chords + RH Melody — Prince Style (2 steps, 144-145) ─────
    {
      stepNumber: 144,
      module: 'funk_l3',
      section: 'D',
      subsection: 'D2: LH Chords + RH Melody (Prince Style)',
      activity: 'D2.1: LH Chromatic Planing + RH Motivic Melody (Out of Time)',
      direction: 'Left hand plays the chromatic planing chords (Am6→Eb9→D9). Right hand plays the Dorian descent melody (G→F#→E→D). Two independent parts, one keyboard.',
      assessment: 'pitch_order_timing',
      tag: 'funk:performance_prince_l3_oot | funk',
      styleRef: 'l3b',
      successFeedback: 'Prince-style two-hand independence — chromatic planing under Dorian melody.',
      instrument_config: { instrument: 'piano', hand_config: 'lh_chords_rh_melody', lh_role: 'chords', rh_role: 'melody', style_ref: 'l3b' },
      targetNotes: [
        // LH — chromatic funk9 approach from below (Option A)
        // Approach: Dbdom9 funk9 [b7-9-5], stab duration 120
        { midi: 59, onset:   0, duration: 120 },  // B3  (b7 of Db)
        { midi: 63, onset:   0, duration: 120 },  // Eb4 (9  of Db)
        { midi: 68, onset:   0, duration: 120 },  // Ab4 (5  of Db)
        // Goal: Ddom9 funk9 [b7-9-5], held
        { midi: 60, onset: 240, duration: 1560 }, // C4  (b7 of D)
        { midi: 64, onset: 240, duration: 1560 }, // E4  (9  of D)
        { midi: 69, onset: 240, duration: 1560 }, // A4  (5  of D)
        // RH — Dorian descent G5→F#5→E5→D5 (shifted up 8va; clears Rule 2)
        { midi: 79, onset:    0, duration: 480 },  // G5  beat 1
        { midi: 78, onset:  480, duration: 480 },  // F#5 beat 2 (nat.6)
        { midi: 76, onset:  960, duration: 480 },  // E5  beat 3
        { midi: 74, onset: 1440, duration: 480 },  // D5  beat 4
      ],
      backing_parts: { engine_generates: ['drums', 'bass'], student_plays: ['chords', 'melody'] },
    },
    {
      stepNumber: 145,
      module: 'funk_l3',
      section: 'D',
      subsection: 'D2: LH Chords + RH Melody (Prince Style)',
      activity: 'D2.2: LH Chromatic Planing + RH Melody — Full Prince Feel (In Time)',
      assessment: 'pitch_order_timing_duration',
      tag: 'funk:performance_prince_l3_it | funk',
      styleRef: 'l3b',
      successFeedback: 'Prince-style in time — chromatic planing and Dorian melody locked together.',
      instrument_config: { instrument: 'piano', hand_config: 'lh_chords_rh_melody', lh_role: 'chords', rh_role: 'melody', style_ref: 'l3b' },
      targetNotes: [
        { midi: 48, onset: 0,    duration: 460 }, { midi: 52, onset: 0,    duration: 460 }, { midi: 54, onset: 0,    duration: 460 },
        { midi: 47, onset: 480,  duration: 460 }, { midi: 51, onset: 480,  duration: 460 }, { midi: 53, onset: 480,  duration: 460 },
        { midi: 46, onset: 960,  duration: 460 }, { midi: 50, onset: 960,  duration: 460 }, { midi: 52, onset: 960,  duration: 460 },
        { midi: 67, onset: 0,    duration: 480 },
        { midi: 66, onset: 480,  duration: 480 },
        { midi: 64, onset: 960,  duration: 480 },
        { midi: 62, onset: 1440, duration: 480 },
      ],
      backing_parts: { engine_generates: ['drums', 'bass'], student_plays: ['chords', 'melody'] },
    },

    // ── D3: Integrated Performance — Capstone (2 steps, 146-147) ─────────
    {
      stepNumber: 146,
      module: 'funk_l3',
      section: 'D',
      subsection: 'D3: Integrated Performance',
      activity: 'D3.1: Integrated Performance — Choose Style + Role (In Time)',
      direction: 'Select your style: Headhunters (l3a) or Prince (l3b). Select your role: melody, chords, or bass. The engine fills the remaining parts. This is the capstone — demonstrate your full L3 Funk vocabulary.',
      assessment: 'pitch_order_timing_duration',
      tag: 'funk:performance_capstone_l3_it | funk',
      styleRef: 'l3a',
      successFeedback: 'L3 Funk complete. You have the deep groove vocabulary of the Headhunters and the harmonic sophistication of Prince.',
      instrument_config: { instrument: 'piano', hand_config: 'open', lh_role: 'open', rh_role: 'open', style_ref: 'l3a' },
      chordSymbols: ['Am9', 'D13', 'Am9', 'E7'],
      backing_parts: { engine_generates: ['drums', 'bass', 'chords'], student_plays: ['melody'] },
    },
    {
      stepNumber: 147,
      module: 'funk_l3',
      section: 'D',
      subsection: 'D3: Integrated Performance',
      activity: 'D3.2: Integrated Performance — Prince Style (In Time)',
      direction: 'Same capstone but fully in the l3b Prince/Silk Sonic style. Heavy 16th, chromatic planing, synth brass. Make it your own.',
      assessment: 'pitch_order_timing_duration',
      tag: 'funk:performance_capstone_l3b_it | funk',
      styleRef: 'l3b',
      successFeedback: 'Funk L3 mastered — both styles, full vocabulary. See you in Jazz.',
      instrument_config: { instrument: 'piano', hand_config: 'open', lh_role: 'open', rh_role: 'open', style_ref: 'l3b' },
      chordSymbols: ['Am9', 'D13', 'Am9', 'E7'],
      backing_parts: { engine_generates: ['drums', 'bass', 'chords'], student_plays: ['melody'] },
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
    defaultKey: 'A minor (Dorian)',
    defaultScale: [0, 2, 3, 5, 7, 9, 10],
    defaultScaleId: 'dorian',
    tempoRange: [85, 110],
    swing: 0,
    grooves: ['groove_funk_03', 'groove_funk_04'],
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
    defaultScale: [0, 3, 5, 7, 10],   // minor pentatonic
    defaultScaleId: 'minor_pentatonic',
    tempoRange: [88, 96],
    swing: 0, // v2 note: swing not used at ActivityFlow level — defined per sub-profile in styleDna/funk.v2.ts
    grooves: ['groove_funk_01', 'groove_funk_02'],
  },
  sections: [
    funkL1SectionA,
    funkL1SectionB,
    funkL1SectionC,
    funkL1SectionD,
  ],
};

export const funkFlows = [funkL1, funkL2, funkL3] as const;
