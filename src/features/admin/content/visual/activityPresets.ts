import type { AssessmentType } from '@/curriculum/types/activity';
import type {
  ActivityStepV2,
  BackingParts,
  InstrumentConfig,
} from '@/curriculum/types/activity.v2';

/**
 * The activity kinds an author picks from, and the fields each one writes.
 *
 * A step's runtime behaviour is not stored in one place: `assessment` decides
 * whether the lesson runs out of time (hold each note until it fills) or in
 * time (a playhead the student plays against), `backing_parts` decides whether
 * the engine generates a band underneath, and `instrument_config` switches the
 * renderer to a two-hand grand staff. `activity` itself is just the display
 * name.
 *
 * Exposing those three separately would let an author save combinations the
 * player cannot render — an in-time step with a two-hand config but no roles,
 * say. So the editor offers whole activities, and each one writes the matching
 * set together. Refinements (which parts the band plays, which hand does what)
 * stay editable underneath for the cases the presets do not cover.
 */

export type ActivityPresetId =
  | 'listen'
  | 'note_hold'
  | 'note_hold_sequence'
  | 'play_along'
  | 'play_along_strict'
  | 'play_along_band'
  | 'performance_two_hand';

export interface ActivityPreset {
  id: ActivityPresetId;
  label: string;
  /** One line on what the student actually does. Shown under the picker. */
  blurb: string;
  assessment: AssessmentType | null;
  backingParts?: BackingParts;
  instrumentConfig?: InstrumentConfig;
}

export const ACTIVITY_PRESETS: ActivityPreset[] = [
  {
    id: 'listen',
    label: 'Listen only',
    blurb:
      'No assessment. The student watches the demo and moves on — use for an introduction step.',
    assessment: null,
  },
  {
    id: 'note_hold',
    label: 'Note Hold',
    blurb:
      'Out of time. The student holds each target note until it fills; order is not enforced beyond the current onset group.',
    assessment: 'pitch_only',
  },
  {
    id: 'note_hold_sequence',
    label: 'Note Hold — in order',
    blurb:
      'Out of time, but the notes must be played in the written order before the step passes.',
    assessment: 'pitch_order',
  },
  {
    id: 'play_along',
    label: 'Play Along',
    blurb:
      'In time. A count-in bar, then a moving playhead and a metronome — pitch and timing are both graded.',
    assessment: 'pitch_order_timing',
  },
  {
    id: 'play_along_strict',
    label: 'Play Along — strict',
    blurb:
      'In time, and note lengths are graded too. The hardest variant; use it at the end of a section.',
    assessment: 'pitch_order_timing_duration',
  },
  {
    id: 'play_along_band',
    label: 'Play Along with band',
    blurb:
      'In time over an engine-generated groove. The drums carry the pulse, so the metronome stays silent.',
    assessment: 'pitch_order_timing',
    backingParts: {
      engine_generates: ['drums', 'bass', 'chords'],
      student_plays: ['melody'],
    },
  },
  {
    id: 'performance_two_hand',
    label: 'Two-hand performance',
    blurb:
      'In time on a grand staff, left and right hand each with a role. Section D material.',
    assessment: 'pitch_order_timing',
    backingParts: {
      engine_generates: ['drums', 'bass'],
      student_plays: ['chords', 'melody'],
    },
    instrumentConfig: {
      instrument: 'piano',
      hand_config: 'lh_bass_rh_melody',
      lh_role: 'bass',
      rh_role: 'melody',
      style_ref: 'l1a',
    },
  },
];

export const PRESET_BY_ID = Object.fromEntries(
  ACTIVITY_PRESETS.map((preset) => [preset.id, preset]),
) as Record<ActivityPresetId, ActivityPreset>;

/**
 * Which preset a stored step corresponds to.
 *
 * Read in the same order the presets add capability — a two-hand config is a
 * two-hand performance whatever its assessment says, and a band is a band —
 * so a step that was hand-edited into an odd combination still lands on the
 * closest activity rather than falling through to "Listen only".
 */
export const presetForStep = (step: ActivityStepV2): ActivityPresetId => {
  if (step.instrument_config && step.instrument_config.hand_config !== 'open')
    return 'performance_two_hand';
  if ((step.backing_parts?.engine_generates?.length ?? 0) > 0)
    return 'play_along_band';
  switch (step.assessment) {
    case 'pitch_only':
      return 'note_hold';
    case 'pitch_order':
      return 'note_hold_sequence';
    case 'pitch_order_timing':
      return 'play_along';
    case 'pitch_order_timing_duration':
      return 'play_along_strict';
    default:
      return 'listen';
  }
};

/**
 * Apply a preset to a step, clearing the fields the new activity does not use.
 * Everything the author wrote that is not behavioural — name, direction, target
 * notes, scale — survives the switch.
 */
export const applyPreset = (
  step: ActivityStepV2,
  presetId: ActivityPresetId,
): ActivityStepV2 => {
  const preset = PRESET_BY_ID[presetId];
  const next: ActivityStepV2 = { ...step, assessment: preset.assessment };

  if (preset.backingParts) next.backing_parts = { ...preset.backingParts };
  else delete next.backing_parts;

  if (preset.instrumentConfig)
    next.instrument_config = { ...preset.instrumentConfig };
  else delete next.instrument_config;

  return next;
};
