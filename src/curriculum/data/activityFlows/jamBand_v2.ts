/**
 * Jam Band v2 — Activity Flow Stubs.
 * Musical content is TODO — authored in a dedicated Style SOP session.
 */

import type {
  ActivityFlowV2,
  ActivitySectionV2,
} from '../../types/activity.v2';

const jamBandSectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    {
      stepNumber: 1,
      module: 'jamband_l1',
      section: 'A',
      subsection: 'A1: Melody — Coming Soon',
      activity: 'A1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'jamband:melody_stub | jamband',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const jamBandSectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    {
      stepNumber: 2,
      module: 'jamband_l1',
      section: 'B',
      subsection: 'B1: Chords — Coming Soon',
      activity: 'B1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'jamband:chords_stub | jamband',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const jamBandSectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 3,
      module: 'jamband_l1',
      section: 'C',
      subsection: 'C1: Bass — Coming Soon',
      activity: 'C1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'jamband:bass_stub | jamband',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const jamBandSectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 4,
      module: 'jamband_l1',
      section: 'D',
      subsection: 'D1: Performance — Coming Soon',
      activity: 'D1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'jamband:performance_stub | jamband',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};

const stubSections = [
  jamBandSectionA,
  jamBandSectionB,
  jamBandSectionC,
  jamBandSectionD,
];
const stubParams = {
  defaultKey: 'G major',
  defaultScale: [0, 2, 4, 5, 7, 9, 11],
  defaultScaleId: 'major',
  tempoRange: [90, 130] as [number, number],
  swing: 0,
  grooves: [] as string[],
};

export const jamBandL1: ActivityFlowV2 = {
  genre: 'jam band',
  level: 1,
  version: 'v2',
  title: 'Jam Band Level 1',
  params: stubParams,
  sections: stubSections,
};
export const jamBandL2: ActivityFlowV2 = {
  genre: 'jam band',
  level: 2,
  version: 'v2',
  title: 'Jam Band Level 2',
  params: stubParams,
  sections: stubSections,
};
export const jamBandL3: ActivityFlowV2 = {
  genre: 'jam band',
  level: 3,
  version: 'v2',
  title: 'Jam Band Level 3',
  params: stubParams,
  sections: stubSections,
};
export const jamBandFlows = [jamBandL1, jamBandL2, jamBandL3] as const;
