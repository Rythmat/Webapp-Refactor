/**
 * Electronic v2 — Activity Flow Stubs.
 * Musical content is TODO — authored in a dedicated Style SOP session.
 */

import type {
  ActivityFlowV2,
  ActivitySectionV2,
} from '../../types/activity.v2';

const electronicSectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    {
      stepNumber: 1,
      module: 'electronic_l1',
      section: 'A',
      subsection: 'A1: Melody — Coming Soon',
      activity: 'A1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'electronic:melody_stub | electronic',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const electronicSectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    {
      stepNumber: 2,
      module: 'electronic_l1',
      section: 'B',
      subsection: 'B1: Chords — Coming Soon',
      activity: 'B1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'electronic:chords_stub | electronic',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const electronicSectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 3,
      module: 'electronic_l1',
      section: 'C',
      subsection: 'C1: Bass — Coming Soon',
      activity: 'C1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'electronic:bass_stub | electronic',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const electronicSectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 4,
      module: 'electronic_l1',
      section: 'D',
      subsection: 'D1: Performance — Coming Soon',
      activity: 'D1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'electronic:performance_stub | electronic',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};

const stubSections = [
  electronicSectionA,
  electronicSectionB,
  electronicSectionC,
  electronicSectionD,
];
const stubParams = {
  defaultKey: 'C minor',
  defaultScale: [0, 2, 3, 5, 7, 8, 10],
  defaultScaleId: 'minor',
  tempoRange: [110, 145] as [number, number],
  swing: 0,
  grooves: [] as string[],
};

export const electronicL1: ActivityFlowV2 = {
  genre: 'electronic',
  level: 1,
  version: 'v2',
  title: 'Electronic Level 1',
  params: stubParams,
  sections: stubSections,
};
export const electronicL2: ActivityFlowV2 = {
  genre: 'electronic',
  level: 2,
  version: 'v2',
  title: 'Electronic Level 2',
  params: stubParams,
  sections: stubSections,
};
export const electronicL3: ActivityFlowV2 = {
  genre: 'electronic',
  level: 3,
  version: 'v2',
  title: 'Electronic Level 3',
  params: stubParams,
  sections: stubSections,
};
export const electronicFlows = [
  electronicL1,
  electronicL2,
  electronicL3,
] as const;
