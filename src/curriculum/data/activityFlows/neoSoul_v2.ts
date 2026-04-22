/**
 * Neo Soul v2 — Activity Flow Stubs.
 * Musical content is TODO — authored in a dedicated Style SOP session.
 */

import type {
  ActivityFlowV2,
  ActivitySectionV2,
} from '../../types/activity.v2';

const neoSoulSectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    {
      stepNumber: 1,
      module: 'neosoul_l1',
      section: 'A',
      subsection: 'A1: Melody — Coming Soon',
      activity: 'A1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'neosoul:melody_stub | neosoul',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const neoSoulSectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    {
      stepNumber: 2,
      module: 'neosoul_l1',
      section: 'B',
      subsection: 'B1: Chords — Coming Soon',
      activity: 'B1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'neosoul:chords_stub | neosoul',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const neoSoulSectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 3,
      module: 'neosoul_l1',
      section: 'C',
      subsection: 'C1: Bass — Coming Soon',
      activity: 'C1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'neosoul:bass_stub | neosoul',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const neoSoulSectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 4,
      module: 'neosoul_l1',
      section: 'D',
      subsection: 'D1: Performance — Coming Soon',
      activity: 'D1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'neosoul:performance_stub | neosoul',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};

const stubSections = [
  neoSoulSectionA,
  neoSoulSectionB,
  neoSoulSectionC,
  neoSoulSectionD,
];
const stubParams = {
  defaultKey: 'C major',
  defaultScale: [0, 2, 4, 5, 7, 9, 11],
  defaultScaleId: 'major',
  tempoRange: [65, 95] as [number, number],
  swing: 0,
  grooves: [] as string[],
};

export const neoSoulL1: ActivityFlowV2 = {
  genre: 'neo-soul',
  level: 1,
  version: 'v2',
  title: 'Neo Soul Level 1',
  params: stubParams,
  sections: stubSections,
};
export const neoSoulL2: ActivityFlowV2 = {
  genre: 'neo-soul',
  level: 2,
  version: 'v2',
  title: 'Neo Soul Level 2',
  params: stubParams,
  sections: stubSections,
};
export const neoSoulL3: ActivityFlowV2 = {
  genre: 'neo-soul',
  level: 3,
  version: 'v2',
  title: 'Neo Soul Level 3',
  params: stubParams,
  sections: stubSections,
};
export const neoSoulFlows = [neoSoulL1, neoSoulL2, neoSoulL3] as const;
