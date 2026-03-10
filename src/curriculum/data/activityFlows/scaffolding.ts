/**
 * Standard 6-Activity Bass Scale Scaffolding.
 *
 * Every genre × level CSV contains a placeholder row:
 *   "C1.1-C1.6: Standard 6-Activity Bass Scale Scaffolding"
 *
 * This expands to 6 steps mirroring the Section A1 scale pattern
 * but applied to bass: ascending/descending/combined × out-of-time/in-time.
 */

import type { ActivityStep } from '../../types/activity';

/**
 * Generate the 6 standard C1 bass scale steps.
 *
 * @param module - Flow module id (e.g. 'pop_l1')
 * @param scaleName - Scale display name from CSV (e.g. 'Major Pentatonic', 'Dorian')
 * @param genre - Genre tag prefix (e.g. 'pop', 'jazz')
 * @param startStepNumber - Step number for C1.1 (subsequent steps increment)
 */
export function expandBassScaleScaffolding(
  module: string,
  scaleName: string,
  genre: string,
  startStepNumber: number,
): ActivityStep[] {
  const sub = `C1: Bass Scale (${scaleName})`;
  const tag = (suffix: string) => `${genre}:bass_scale_${suffix} | ${genre}`;

  return [
    {
      stepNumber: startStepNumber,
      module,
      section: 'C',
      subsection: sub,
      activity: 'C1.1: Ascending (Out of Time)',
      direction: `Play the ${scaleName} bass scale going up.`,
      assessment: 'pitch_order',
      tag: tag('ascending_oot'),
      styleRef: '',
      successFeedback: '',
      contentGeneration: '',
    },
    {
      stepNumber: startStepNumber + 1,
      module,
      section: 'C',
      subsection: sub,
      activity: 'C1.2: Ascending (In Time)',
      direction: `In a steady tempo, play the ${scaleName} bass scale going up.`,
      assessment: 'pitch_order_timing',
      tag: tag('ascending_it'),
      styleRef: '',
      successFeedback: '',
      contentGeneration: '',
    },
    {
      stepNumber: startStepNumber + 2,
      module,
      section: 'C',
      subsection: sub,
      activity: 'C1.3: Descending (Out of Time)',
      direction: `Play the ${scaleName} bass scale going down.`,
      assessment: 'pitch_order',
      tag: tag('descending_oot'),
      styleRef: '',
      successFeedback: '',
      contentGeneration: '',
    },
    {
      stepNumber: startStepNumber + 3,
      module,
      section: 'C',
      subsection: sub,
      activity: 'C1.4: Descending (In Time)',
      direction: `In a steady tempo, play the ${scaleName} bass scale going down.`,
      assessment: 'pitch_order_timing',
      tag: tag('descending_it'),
      styleRef: '',
      successFeedback: '',
      contentGeneration: '',
    },
    {
      stepNumber: startStepNumber + 4,
      module,
      section: 'C',
      subsection: sub,
      activity: 'C1.5: Ascending & Descending (Out of Time)',
      direction: `Play the ${scaleName} bass scale going up and down.`,
      assessment: 'pitch_order',
      tag: tag('asc_desc_oot'),
      styleRef: '',
      successFeedback: '',
      contentGeneration: '',
    },
    {
      stepNumber: startStepNumber + 5,
      module,
      section: 'C',
      subsection: sub,
      activity: 'C1.6: Ascending & Descending (In Time)',
      direction: `In a steady tempo, play the ${scaleName} bass scale going up and down.`,
      assessment: 'pitch_order_timing',
      tag: tag('asc_desc_it'),
      styleRef: '',
      successFeedback: '',
      contentGeneration: '',
    },
  ];
}
