/**
 * Applied Theory Fundamentals — Technique tab (free), key-parameterized.
 *
 * Unlike genre flows (fixed to one authored key), this flow is built fresh
 * per request from the key center the user picked on the key-picker screen.
 * Deliberately NOT registered in the shared genre registry (getActivityFlow /
 * getGenreProfile / genreIdMap) — those are tied to the audio engine's
 * closed genre taxonomy and this isn't a musical genre. See
 * src/curriculum/routes.tsx for how the flow this builds gets rendered.
 *
 * Section A (Scale) steps carry scaleIntervals + a tag containing
 * "ascending"/"descending", which resolveStepContent.ts's generateScale()
 * transposes at render time from the flow's keyRoot — one flow definition
 * serves all 12 keys with no hardcoded targetNotes.
 *
 * Section A (Melody) and Section B (Chords) steps instead compute
 * targetNotes directly, right here, using the keyRoot this builder already
 * has in hand (it's called once per key selection) — resolveStepContent.ts's
 * Priority 1 rule ("explicit targetNotes always win") picks them up as-is.
 * This avoids growing resolveStepContent.ts's generator surface (which every
 * genre flow depends on) for content shapes — melodic contours, chords —
 * that only this flow currently needs.
 *
 * Arpeggio steps are the one exception: they reuse the existing
 * generateArpeggio() generator via scaleIntervals, same pattern as Scale.
 */

import { midiToPitchName } from '../../engine/genreGeneration/resolveStepContent';
import type {
  ActivityFlowV2,
  ActivitySectionV2,
  ActivityStepV2,
  TargetNote,
} from '../../types/activity.v2';

const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const TICKS_PER_BEAT = 480;

// ASCII key name -> MIDI root, matching GenreLessonContainerV2's own KEY_MAP
// (that component derives keyRoot from flow.params.defaultKey using this
// same table — kept in sync deliberately, not imported, since that map is
// a private local const there, not an exported utility).
const KEY_TO_MIDI: Record<string, number> = {
  C: 60,
  'C#': 61,
  Db: 61,
  D: 62,
  'D#': 63,
  Eb: 63,
  E: 64,
  F: 65,
  'F#': 66,
  Gb: 66,
  G: 67,
  'G#': 68,
  Ab: 68,
  A: 69,
  'A#': 70,
  Bb: 70,
  B: 71,
};

function keyRootFor(keyName: string): number {
  return KEY_TO_MIDI[keyName] ?? 60;
}

// ── Section A1: Scale ───────────────────────────────────────────────────────

function scaleStep(
  stepNumber: number,
  activity: string,
  direction: string,
  tagSuffix: string,
  assessment: 'pitch_only' | 'pitch_order_timing',
  successFeedback: string,
): ActivityStepV2 {
  return {
    stepNumber,
    module: 'applied_theory_l1',
    section: 'A',
    subsection: 'A1: Major Scale',
    activity,
    direction,
    assessment,
    tag: `theory_fund:major_scale_${tagSuffix} | applied_theory`,
    styleRef: 'l1a',
    successFeedback,
    scaleIntervals: MAJOR_SCALE_INTERVALS,
    scaleId: 'major',
  };
}

function buildScaleSteps(): ActivityStepV2[] {
  return [
    scaleStep(
      1,
      'A1.1: Major Scale Ascending (Out of Time)',
      'Play the notes of the scale going up (to the right), at your own pace.',
      'ascending_oot',
      'pitch_only',
      'Solid — you nailed the scale shape.',
    ),
    scaleStep(
      2,
      'A1.2: Major Scale Ascending (In Time)',
      'In a steady tempo, play the notes of the scale going up.',
      'ascending_it',
      'pitch_order_timing',
      'Right in the pocket — that scale is locked in.',
    ),
    scaleStep(
      3,
      'A1.3: Major Scale Descending (Out of Time)',
      'Play the notes of the scale going down (to the left), at your own pace.',
      'descending_oot',
      'pitch_only',
      'Solid — you nailed the scale shape coming down.',
    ),
    scaleStep(
      4,
      'A1.4: Major Scale Descending (In Time)',
      'In a steady tempo, play the notes of the scale going down.',
      'descending_it',
      'pitch_order_timing',
      'Right in the pocket — coming down clean.',
    ),
    scaleStep(
      5,
      'A1.5: Major Scale Ascending & Descending (Out of Time)',
      'Play the notes of the scale going up and then back down, at your own pace.',
      'ascending_descending_oot',
      'pitch_only',
      'You played the full scale up and down — nice work.',
    ),
    scaleStep(
      6,
      'A1.6: Major Scale Ascending & Descending (In Time)',
      'In a steady tempo, play the notes of the scale going up and then back down.',
      'ascending_descending_it',
      'pitch_order_timing',
      'Full scale, up and down, right in time — great work.',
    ),
  ];
}

// ── Section A2/A3: Melody & Melody Articulation ─────────────────────────────

const STACCATO_DURATION = 120; // short, clearly detached
const LEGATO_DURATION = 440; // near-full beat, connected
const NORMAL_DURATION = TICKS_PER_BEAT - 20; // same fill convention as generateScale

/** Scale-degree (1-indexed, wraps/octaves past 7) -> semitone offset from root. */
function degreeInterval(degree: number): number {
  const idx = (((degree - 1) % 7) + 7) % 7;
  const octaveShift = Math.floor((degree - 1) / 7);
  return MAJOR_SCALE_INTERVALS[idx] + octaveShift * 12;
}

function contourNotes(
  keyRoot: number,
  degrees: number[],
  durations: number[],
): TargetNote[] {
  return degrees.map((degree, i) => ({
    midi: keyRoot + degreeInterval(degree),
    onset: i * TICKS_PER_BEAT,
    duration: durations[i] ?? NORMAL_DURATION,
  }));
}

// The two melodic shapes reused across Section A2 (plain) and A3
// (articulation variants) — a simple stepwise 3-note contour, and two of
// them joined into a 6-note "connect two" phrase.
const CONTOUR_A_DEGREES = [1, 2, 3];
const CONTOUR_CONNECTED_DEGREES = [1, 2, 3, 3, 2, 1];

function melodyStep(
  stepNumber: number,
  subsection: string,
  activity: string,
  direction: string,
  tagSuffix: string,
  assessment:
    | 'pitch_only'
    | 'pitch_order_timing'
    | 'pitch_order_timing_duration',
  successFeedback: string,
  targetNotes: TargetNote[],
): ActivityStepV2 {
  return {
    stepNumber,
    module: 'applied_theory_l1',
    section: 'A',
    subsection,
    activity,
    direction,
    assessment,
    tag: `theory_fund:${tagSuffix} | applied_theory`,
    styleRef: 'l1a',
    successFeedback,
    targetNotes,
  };
}

function buildMelodySteps(keyRoot: number): ActivityStepV2[] {
  const contourA = (durations: number[]) =>
    contourNotes(keyRoot, CONTOUR_A_DEGREES, durations);
  const contourConnected = (durations: number[]) =>
    contourNotes(keyRoot, CONTOUR_CONNECTED_DEGREES, durations);
  const normal3 = [NORMAL_DURATION, NORMAL_DURATION, NORMAL_DURATION];
  const normal6 = Array(6).fill(NORMAL_DURATION) as number[];
  const staccato3 = Array(3).fill(STACCATO_DURATION) as number[];
  const legato3 = Array(3).fill(LEGATO_DURATION) as number[];
  const mixed3 = [STACCATO_DURATION, LEGATO_DURATION, STACCATO_DURATION];
  const mixed6 = [
    STACCATO_DURATION,
    LEGATO_DURATION,
    STACCATO_DURATION,
    LEGATO_DURATION,
    STACCATO_DURATION,
    LEGATO_DURATION,
  ];

  return [
    // A2: Melody
    melodyStep(
      7,
      'A2: Melody',
      'A2.1: 3 Note Contour (Out of Time)',
      'Play this short melodic phrase, at your own pace.',
      'contour_a_oot',
      'pitch_only',
      'Nice shape — that melodic phrase is yours now.',
      contourA(normal3),
    ),
    melodyStep(
      8,
      'A2: Melody',
      'A2.2: 3 Note Contour (In Time)',
      'In a steady tempo, play this short melodic phrase.',
      'contour_a_it',
      'pitch_order_timing',
      'Right in time — that phrase locked in nicely.',
      contourA(normal3),
    ),
    melodyStep(
      9,
      'A2: Melody',
      'A2.3: Connect Two 3 Note Contours (Out of Time)',
      'Play this longer melodic phrase, at your own pace.',
      'contour_connected_oot',
      'pitch_only',
      'You connected both phrases smoothly — nice work.',
      contourConnected(normal6),
    ),
    melodyStep(
      10,
      'A2: Melody',
      'A2.4: Connect Two 3 Note Contours (In Time)',
      'In a steady tempo, play this longer melodic phrase.',
      'contour_connected_it',
      'pitch_order_timing',
      'Both phrases, locked in time — great work.',
      contourConnected(normal6),
    ),
    // A3: Melody Articulation — same shapes, varied note duration, graded
    // with pitch_order_timing_duration (the first content in this app to
    // actually exercise real duration scoring).
    melodyStep(
      11,
      'A3: Melody Articulation',
      'A3.1: 3 Note Contour (Staccato)',
      'In a steady tempo, play this short melodic phrase with short, detached articulations ("staccato").',
      'contour_a_staccato',
      'pitch_order_timing_duration',
      'Crisp and detached — that’s staccato.',
      contourA(staccato3),
    ),
    melodyStep(
      12,
      'A3: Melody Articulation',
      'A3.2: 3 Note Contour (Legato)',
      'In a steady tempo, play this short melodic phrase with long, connected articulations ("legato").',
      'contour_a_legato',
      'pitch_order_timing_duration',
      'Smooth and connected — that’s legato.',
      contourA(legato3),
    ),
    melodyStep(
      13,
      'A3: Melody Articulation',
      'A3.3: 3 Note Contour (Mixed Articulation)',
      'In a steady tempo, play this short melodic phrase with mixed articulations (staccato and legato).',
      'contour_a_mixed',
      'pitch_order_timing_duration',
      'Nice control mixing short and long notes.',
      contourA(mixed3),
    ),
    melodyStep(
      14,
      'A3: Melody Articulation',
      'A3.4: Connect Two 3 Note Contours (Mixed Articulation)',
      'In a steady tempo, play this longer melodic phrase with mixed articulations.',
      'contour_connected_mixed',
      'pitch_order_timing_duration',
      'Great control over the full phrase, short and long notes alike.',
      contourConnected(mixed6),
    ),
  ];
}

// ── Section B1: Arpeggiate Chords (Triads) ──────────────────────────────────

// Diatonic triads built on scale degrees 1-4 of the major scale (I, ii, iii,
// IV) — intervals from the key root, so generateArpeggio() transposes them
// exactly like it already does for genre content.
const DIATONIC_TRIADS: Record<
  number,
  { intervals: number[]; quality: 'maj' | 'min' }
> = {
  1: { intervals: [0, 4, 7], quality: 'maj' },
  2: { intervals: [2, 5, 9], quality: 'min' },
  3: { intervals: [4, 7, 11], quality: 'min' },
  4: { intervals: [5, 9, 12], quality: 'maj' },
};

function chordSymbolForDegree(keyRoot: number, degree: number): string {
  const triad = DIATONIC_TRIADS[degree];
  const rootMidi = keyRoot + triad.intervals[0];
  const rootName = midiToPitchName(rootMidi, keyRoot).replace(/-?\d+$/, '');
  return triad.quality === 'min' ? `${rootName}m` : rootName;
}

function arpeggioStep(
  stepNumber: number,
  subNumber: number,
  degree: number,
  chordSymbol: string,
  assessment: 'pitch_only' | 'pitch_order_timing',
  timed: boolean,
): ActivityStepV2 {
  const label = timed ? 'In Time' : 'Out of Time';
  const direction = timed
    ? `In a steady tempo, play an arpeggio of ${chordSymbol} going up and down.`
    : `Play the notes of ${chordSymbol} one at a time going up (to the right).`;
  return {
    stepNumber,
    module: 'applied_theory_l1',
    section: 'B',
    subsection: 'B1: Arpeggiate Chords (Triads)',
    activity: `B1.${subNumber}: Arpeggiate The ${degree} Chord (${label})`,
    direction,
    assessment,
    tag: `theory_fund:arpeggio_degree${degree}_${timed ? 'it' : 'oot'} | applied_theory`,
    styleRef: 'l1a',
    successFeedback: timed
      ? `Well done — you arpeggiated ${chordSymbol} right in time.`
      : `Well done. You arpeggiated ${chordSymbol}!`,
    chordSymbols: [chordSymbol],
    scaleIntervals: DIATONIC_TRIADS[degree].intervals,
  };
}

function buildArpeggioSteps(keyRoot: number): ActivityStepV2[] {
  const steps: ActivityStepV2[] = [];
  let stepNumber = 15;
  let subNumber = 1;
  for (const degree of [1, 2, 3, 4]) {
    const chordSymbol = chordSymbolForDegree(keyRoot, degree);
    steps.push(
      arpeggioStep(
        stepNumber++,
        subNumber++,
        degree,
        chordSymbol,
        'pitch_only',
        false,
      ),
      arpeggioStep(
        stepNumber++,
        subNumber++,
        degree,
        chordSymbol,
        'pitch_order_timing',
        true,
      ),
    );
  }
  return steps;
}

// ── Section B2/B3/B4: Play Chord, Chord Articulations, Chord Progressions ──

/**
 * A sequence of chords, each contributing simultaneous-onset notes (a block
 * chord, not an arpeggio). `durations` gives each chord's hold duration —
 * also its spacing, so chords play back-to-back.
 */
function chordBlockNotes(
  keyRoot: number,
  degrees: number[],
  durations: number[],
): TargetNote[] {
  const notes: TargetNote[] = [];
  let onset = 0;
  degrees.forEach((degree, i) => {
    const duration = durations[i] ?? durations[durations.length - 1];
    for (const interval of DIATONIC_TRIADS[degree].intervals) {
      notes.push({ midi: keyRoot + interval, onset, duration: duration - 20 });
    }
    onset += duration;
  });
  return notes;
}

function chordSymbolsFor(keyRoot: number, degrees: number[]): string[] {
  return degrees.map((d) => chordSymbolForDegree(keyRoot, d));
}

function chordProgressionStep(
  stepNumber: number,
  subsection: string,
  activity: string,
  direction: string,
  tagSuffix: string,
  assessment:
    | 'pitch_only'
    | 'pitch_order_timing'
    | 'pitch_order_timing_duration',
  successFeedback: string,
  chordSymbols: string[],
  targetNotes: TargetNote[],
): ActivityStepV2 {
  return {
    stepNumber,
    module: 'applied_theory_l1',
    section: 'B',
    subsection,
    activity,
    direction,
    assessment,
    tag: `theory_fund:${tagSuffix} | applied_theory`,
    styleRef: 'l1a',
    successFeedback,
    chordSymbols,
    targetNotes,
  };
}

// I-ii-iii-IV, the same four triads Section B1 arpeggiates — reused as block
// chords here rather than a fresh set, keeping the whole Chords section
// built from one consistent set of harmony.
const PROGRESSION_DEGREES = [1, 2, 3, 4];
// A non-sequential ordering for the "Random Order" progression drills
// (deterministic, per this flow's no-randomization convention — see Scale
// and Melody sections above).
const SHUFFLED_PROGRESSION_DEGREES = [4, 2, 1, 3];

const WHOLE_NOTE = TICKS_PER_BEAT * 4;
const HALF_NOTE = TICKS_PER_BEAT * 2;
const QUARTER_NOTE = TICKS_PER_BEAT;
const EIGHTH_NOTE = TICKS_PER_BEAT / 2;

function buildPlayChordSteps(keyRoot: number): ActivityStepV2[] {
  const symbols = chordSymbolsFor(keyRoot, PROGRESSION_DEGREES);
  const symbolList = symbols.join(', ');
  const subsection = 'B2: Play Chord (Triads)';

  return [
    chordProgressionStep(
      23,
      subsection,
      'B2.1: Play Chords 1,2,3,4 (Out of Time)',
      `Play ${symbolList}, holding down each chord one by one.`,
      'play_chords_oot',
      'pitch_only',
      'Well done. Now play those chords in time!',
      symbols,
      chordBlockNotes(keyRoot, PROGRESSION_DEGREES, [960, 960, 960, 960]),
    ),
    chordProgressionStep(
      24,
      subsection,
      'B2.2: Play Chords 1,2,3,4 (Whole Notes)',
      `In a steady tempo, play ${symbolList} in whole notes.`,
      'play_chords_whole',
      'pitch_order_timing_duration',
      'Locked in, whole notes and all — great work.',
      symbols,
      chordBlockNotes(keyRoot, PROGRESSION_DEGREES, [
        WHOLE_NOTE,
        WHOLE_NOTE,
        WHOLE_NOTE,
        WHOLE_NOTE,
      ]),
    ),
    chordProgressionStep(
      25,
      subsection,
      'B2.3: Play Chords 1,2,3,4 (Half Notes)',
      `In a steady tempo, play ${symbolList} in half notes.`,
      'play_chords_half',
      'pitch_order_timing_duration',
      'Nice — half notes, right in time.',
      symbols,
      chordBlockNotes(keyRoot, PROGRESSION_DEGREES, [
        HALF_NOTE,
        HALF_NOTE,
        HALF_NOTE,
        HALF_NOTE,
      ]),
    ),
    chordProgressionStep(
      26,
      subsection,
      'B2.4: Play Chords 1,2,3,4 (Quarter Notes)',
      `In a steady tempo, play ${symbolList} in quarter notes.`,
      'play_chords_quarter',
      'pitch_order_timing_duration',
      'Quarter notes, clean and in time — great work.',
      symbols,
      chordBlockNotes(keyRoot, PROGRESSION_DEGREES, [
        QUARTER_NOTE,
        QUARTER_NOTE,
        QUARTER_NOTE,
        QUARTER_NOTE,
      ]),
    ),
  ];
}

function buildChordArticulationSteps(keyRoot: number): ActivityStepV2[] {
  const twoChordDegrees = [1, 4];
  const twoChordSymbols = chordSymbolsFor(keyRoot, twoChordDegrees);
  const twoChordList = twoChordSymbols.join(', ');
  const fourChordSymbols = chordSymbolsFor(keyRoot, PROGRESSION_DEGREES);
  const fourChordList = fourChordSymbols.join(', ');
  const subsection = 'B3: Chord Articulations';
  const staccato = 140;
  const legato = QUARTER_NOTE - 40;

  return [
    chordProgressionStep(
      27,
      subsection,
      'B3.1: Two Chords (Staccato)',
      `Play ${twoChordList} in a steady tempo, with short articulations ("staccato").`,
      'chord_articulation_staccato',
      'pitch_order_timing_duration',
      'Well done. Being able to control the length of chords is an important part of mastering musical articulation!',
      twoChordSymbols,
      chordBlockNotes(keyRoot, twoChordDegrees, [staccato, staccato]),
    ),
    chordProgressionStep(
      28,
      subsection,
      'B3.2: Two Chords (Legato)',
      `Play ${twoChordList} in a steady tempo, with long articulations ("legato").`,
      'chord_articulation_legato',
      'pitch_order_timing_duration',
      'Well done. Now mix and match short and long articulations.',
      twoChordSymbols,
      chordBlockNotes(keyRoot, twoChordDegrees, [legato, legato]),
    ),
    chordProgressionStep(
      29,
      subsection,
      'B3.3: Four Chords (Mixed Articulation)',
      `Play ${fourChordList} in a steady tempo, with mixed articulations.`,
      'chord_articulation_mixed',
      'pitch_order_timing_duration',
      'Well done! Ready to practice some more chord progressions?',
      fourChordSymbols,
      chordBlockNotes(keyRoot, PROGRESSION_DEGREES, [
        staccato,
        legato,
        staccato,
        legato,
      ]),
    ),
  ];
}

function buildChordProgressionSteps(keyRoot: number): ActivityStepV2[] {
  const symbols = chordSymbolsFor(keyRoot, SHUFFLED_PROGRESSION_DEGREES);
  const symbolList = symbols.join(', ');
  const subsection = 'B4: Play Chord Progressions';

  return [
    chordProgressionStep(
      30,
      subsection,
      'B4.1: Four Chords Random Order of 1,2,3,4 (Out of Time)',
      `Play ${symbolList}, holding down each chord one by one.`,
      'progression_random_oot',
      'pitch_only',
      'Nice — you played the progression in the right order.',
      symbols,
      chordBlockNotes(
        keyRoot,
        SHUFFLED_PROGRESSION_DEGREES,
        [960, 960, 960, 960],
      ),
    ),
    chordProgressionStep(
      31,
      subsection,
      'B4.2: Four Chords Random Order of 1,2,3,4 (Half Notes)',
      `In a steady tempo, play ${symbolList}, each chord held for a half note.`,
      'progression_random_half',
      'pitch_order_timing_duration',
      'Great — that progression is locked in.',
      symbols,
      chordBlockNotes(keyRoot, SHUFFLED_PROGRESSION_DEGREES, [
        HALF_NOTE,
        HALF_NOTE,
        HALF_NOTE,
        HALF_NOTE,
      ]),
    ),
    chordProgressionStep(
      32,
      subsection,
      'B4.3: Four Chords Random Order of 1,2,3,4 (Quarter Notes)',
      `In a steady tempo, play ${symbolList}, each chord held for a quarter note.`,
      'progression_random_quarter',
      'pitch_order_timing_duration',
      'Great — that progression is locked in.',
      symbols,
      chordBlockNotes(keyRoot, SHUFFLED_PROGRESSION_DEGREES, [
        QUARTER_NOTE,
        QUARTER_NOTE,
        QUARTER_NOTE,
        QUARTER_NOTE,
      ]),
    ),
    chordProgressionStep(
      33,
      subsection,
      'B4.4: Four Chords Random Order of 1,2,3,4 (Eighth Notes)',
      `In a steady tempo, play ${symbolList}, each chord held for an eighth note.`,
      'progression_random_eighth',
      'pitch_order_timing_duration',
      'Great — that progression is locked in.',
      symbols,
      chordBlockNotes(keyRoot, SHUFFLED_PROGRESSION_DEGREES, [
        EIGHTH_NOTE,
        EIGHTH_NOTE,
        EIGHTH_NOTE,
        EIGHTH_NOTE,
      ]),
    ),
    chordProgressionStep(
      34,
      subsection,
      'B4.5: Four Chords Random Order, Random Rhythms',
      `In a steady tempo, play ${symbolList} — the rhythm changes chord to chord.`,
      'progression_random_rhythms',
      'pitch_order_timing_duration',
      'Great control across changing rhythms — nice work.',
      symbols,
      chordBlockNotes(keyRoot, SHUFFLED_PROGRESSION_DEGREES, [
        HALF_NOTE,
        QUARTER_NOTE,
        EIGHTH_NOTE,
        QUARTER_NOTE,
      ]),
    ),
  ];
}

function buildChordSteps(keyRoot: number): ActivityStepV2[] {
  return [
    ...buildArpeggioSteps(keyRoot),
    ...buildPlayChordSteps(keyRoot),
    ...buildChordArticulationSteps(keyRoot),
    ...buildChordProgressionSteps(keyRoot),
  ];
}

// ── Section D: Play-Along & Two-Hand ─────────────────────────────────────────
//
// The doc's Play-Along activities ("choose your musical style and speed,
// the app generates a play-along beat") and the Studio-only sections assume
// a real backing-track engine keyed by genre + styleRef (useBackingTrack.ts,
// drum/bass pattern libraries). That data doesn't exist for this flow — it
// isn't a musical genre — and building it would be disproportionate to a
// fundamentals/technique flow, whose actual pedagogical point (play the
// right notes, in time, with real duration) is already served by the
// metronome-driven pitch_order_timing_duration path used throughout
// Sections A and B. So Play-Along here means "the same melody/chord
// vocabulary, at tempo, no backing track" — consistent with the rest of
// this flow rather than a compromise bolted on just for this section.
//
// Two-Hand content, in contrast, needed no new infrastructure: TargetNote's
// `hand` field and ActivityStepV2's `instrument_config` already exist and
// GenreLessonContainerV2 already renders dual-staff layouts from them — so
// D3 uses them directly, doubling as the resolution for the doc's "14.x"
// lesson-sequence numbering (confirmed a typo for section 10, this section).

const BASS_REGISTER_OFFSET = -12; // LH one octave below RH/melody register

function twoHandStep(
  stepNumber: number,
  subNumber: number,
  activity: string,
  direction: string,
  tagSuffix: string,
  successFeedback: string,
  handConfig: 'lh_bass_rh_melody' | 'lh_bass_rh_chords' | 'lh_chords_rh_melody',
  lhNotes: { midi: number; onset: number; duration: number }[],
  rhNotes: { midi: number; onset: number; duration: number }[],
): ActivityStepV2 {
  const lhRole = handConfig === 'lh_chords_rh_melody' ? 'chords' : 'bass';
  const rhRole = handConfig === 'lh_bass_rh_chords' ? 'chords' : 'melody';
  return {
    stepNumber,
    module: 'applied_theory_l1',
    section: 'D',
    subsection: 'D3: Two-Hand Stylistic Applications',
    activity: `D3.${subNumber}: ${activity}`,
    direction,
    assessment: 'pitch_order_timing_duration',
    tag: `theory_fund:${tagSuffix} | applied_theory`,
    styleRef: 'l1a',
    successFeedback,
    instrument_config: {
      instrument: 'piano',
      hand_config: handConfig,
      lh_role: lhRole,
      rh_role: rhRole,
      style_ref: 'l1a',
    },
    targetNotes: [
      ...lhNotes.map((n) => ({ ...n, hand: 'lh' as const })),
      ...rhNotes.map((n) => ({ ...n, hand: 'rh' as const })),
    ],
  };
}

function buildMelodyPlayAlongSteps(keyRoot: number): ActivityStepV2[] {
  const subsection = 'D1: Melody with Play Along';
  const contourA3 = contourNotes(keyRoot, CONTOUR_A_DEGREES, [
    NORMAL_DURATION,
    NORMAL_DURATION,
    NORMAL_DURATION,
  ]);
  const contourConnected6 = contourNotes(
    keyRoot,
    CONTOUR_CONNECTED_DEGREES,
    Array(6).fill(NORMAL_DURATION) as number[],
  );

  return [
    melodyStep(
      35,
      subsection,
      'D1.1: Three Note Contour — Play Along',
      'In a steady tempo, play this melody along with the track!',
      'melody_playalong_3note',
      'pitch_order_timing_duration',
      'Nice — right in the pocket with the track.',
      contourA3,
    ),
    melodyStep(
      36,
      subsection,
      'D1.2: Connect Two 3 Note Contours — Play Along',
      'In a steady tempo, play this longer melody along with the track!',
      'melody_playalong_connected',
      'pitch_order_timing_duration',
      'Great — the full phrase, right in time with the track.',
      contourConnected6,
    ),
  ];
}

function buildChordPlayAlongSteps(keyRoot: number): ActivityStepV2[] {
  const subsection = 'D2: Chords with Play Along';
  const twoChordDegrees = [1, 4];
  const twoChordSymbols = chordSymbolsFor(keyRoot, twoChordDegrees);
  const fourChordSymbols = chordSymbolsFor(keyRoot, PROGRESSION_DEGREES);

  return [
    chordProgressionStep(
      37,
      subsection,
      'D2.1: Two Chords — Play Along',
      `Now play this chord progression, ${twoChordSymbols.join(', ')}, along with the track!`,
      'chords_playalong_two',
      'pitch_order_timing_duration',
      'Locked in with the track — nice work.',
      twoChordSymbols,
      chordBlockNotes(keyRoot, twoChordDegrees, [HALF_NOTE, HALF_NOTE]),
    ),
    chordProgressionStep(
      38,
      subsection,
      'D2.2: Four Chords — Play Along',
      `Now play this chord progression, ${fourChordSymbols.join(', ')}, along with the track!`,
      'chords_playalong_four',
      'pitch_order_timing_duration',
      'Full progression, right in time with the track.',
      fourChordSymbols,
      chordBlockNotes(keyRoot, PROGRESSION_DEGREES, [
        QUARTER_NOTE,
        QUARTER_NOTE,
        QUARTER_NOTE,
        QUARTER_NOTE,
      ]),
    ),
  ];
}

function buildTwoHandSteps(keyRoot: number): ActivityStepV2[] {
  const bass = keyRoot + BASS_REGISTER_OFFSET;
  const anchorLh = (duration: number) => [{ midi: bass, onset: 0, duration }];

  // D3.1 — RH plays the 3-note contour, LH anchors the root underneath.
  const shortMelodyRh = contourNotes(keyRoot, CONTOUR_A_DEGREES, [
    NORMAL_DURATION,
    NORMAL_DURATION,
    NORMAL_DURATION,
  ]);
  // D3.2 — RH plays the connected 6-note phrase, LH holds one long anchor.
  const longMelodyRh = contourNotes(
    keyRoot,
    CONTOUR_CONNECTED_DEGREES,
    Array(6).fill(NORMAL_DURATION) as number[],
  );

  // D3.3/D3.4 — LH plays chord roots in the bass register, RH plays the
  // matching block chords, same rhythm both hands.
  const shortProgDegrees = [1, 4];
  const longProgDegrees = PROGRESSION_DEGREES;
  const chordRootsLh = (degrees: number[], duration: number) => {
    let onset = 0;
    return degrees.map((degree) => {
      const note = {
        midi: bass + DIATONIC_TRIADS[degree].intervals[0],
        onset,
        duration: duration - 20,
      };
      onset += duration;
      return note;
    });
  };

  // D3.5 — LH plays block chords, RH plays a simple stepwise melody on top,
  // one melody note per chord change.
  const fiveChordMelodyDegrees = [1, 2, 3, 4];

  return [
    twoHandStep(
      39,
      1,
      'Short Two Hand Melodies',
      'With BOTH HANDS, play this melody along with the track — right hand plays the melody, left hand anchors the root.',
      'twohand_short_melody',
      'Nice coordination between the hands.',
      'lh_bass_rh_melody',
      anchorLh(TICKS_PER_BEAT * 3 - 20),
      shortMelodyRh,
    ),
    twoHandStep(
      40,
      2,
      'Longer Two Hand Melodies',
      'With BOTH HANDS, play this longer melody along with the track.',
      'twohand_long_melody',
      'Great control holding the anchor while the melody moves.',
      'lh_bass_rh_melody',
      anchorLh(TICKS_PER_BEAT * 6 - 20),
      longMelodyRh,
    ),
    twoHandStep(
      41,
      3,
      'Short Two Hand Chord Progressions',
      'With BOTH HANDS, play this chord progression — left hand plays the roots, right hand plays the chords.',
      'twohand_short_chords',
      'Great — both hands moving together.',
      'lh_bass_rh_chords',
      chordRootsLh(shortProgDegrees, HALF_NOTE),
      chordBlockNotes(keyRoot, shortProgDegrees, [HALF_NOTE, HALF_NOTE]),
    ),
    twoHandStep(
      42,
      4,
      'Longer Two Hand Chord Progressions',
      'With BOTH HANDS, play this longer chord progression — left hand plays the roots, right hand plays the chords.',
      'twohand_long_chords',
      'Full progression, both hands together — great work.',
      'lh_bass_rh_chords',
      chordRootsLh(longProgDegrees, HALF_NOTE),
      chordBlockNotes(keyRoot, longProgDegrees, [
        HALF_NOTE,
        HALF_NOTE,
        HALF_NOTE,
        HALF_NOTE,
      ]),
    ),
    twoHandStep(
      43,
      5,
      'Chord Progressions with LH and Melodies with RH',
      'With BOTH HANDS, play the chord progression in your left hand and the melody in your right hand at the same time.',
      'twohand_chords_lh_melody_rh',
      'That’s real two-hand piano playing — well done.',
      'lh_chords_rh_melody',
      chordBlockNotes(keyRoot, longProgDegrees, [
        QUARTER_NOTE,
        QUARTER_NOTE,
        QUARTER_NOTE,
        QUARTER_NOTE,
      ]).map((n) => ({ ...n, midi: n.midi + BASS_REGISTER_OFFSET })),
      contourNotes(
        keyRoot,
        fiveChordMelodyDegrees,
        Array(4).fill(QUARTER_NOTE - 20) as number[],
      ),
    ),
  ];
}

function buildPlayAlongSteps(keyRoot: number): ActivityStepV2[] {
  return [
    ...buildMelodyPlayAlongSteps(keyRoot),
    ...buildChordPlayAlongSteps(keyRoot),
    ...buildTwoHandSteps(keyRoot),
  ];
}

/**
 * Builds the Applied Theory Fundamentals flow for a given key center.
 * @param keyName - ASCII key name matching GenreLessonContainerV2's KEY_MAP,
 *   e.g. 'C', 'F#', 'Db' (not the unicode ♯/♭ glyphs used for display).
 */
export function buildAppliedTheoryFundamentalsFlow(
  keyName: string,
): ActivityFlowV2 {
  const keyRoot = keyRootFor(keyName);

  const sectionA: ActivitySectionV2 = {
    id: 'A',
    name: 'Melody',
    steps: [...buildScaleSteps(), ...buildMelodySteps(keyRoot)],
  };

  const sectionB: ActivitySectionV2 = {
    id: 'B',
    name: 'Chords',
    steps: buildChordSteps(keyRoot),
  };

  const sectionD: ActivitySectionV2 = {
    id: 'D',
    name: 'Play-Along',
    steps: buildPlayAlongSteps(keyRoot),
  };

  return {
    genre: 'applied-theory-fundamentals',
    level: 1,
    version: 'v2',
    title: 'Applied Theory Fundamentals',
    params: {
      defaultKey: `${keyName} Major (Ionian)`,
      defaultScale: MAJOR_SCALE_INTERVALS,
      defaultScaleId: 'major',
      tempoRange: [80, 100],
      swing: 0,
      grooves: [],
    },
    sections: [sectionA, sectionB, sectionD],
  };
}
