/**
 * Blues v2 — Activity Flow Stubs.
 * Musical content is TODO — authored in a dedicated Style SOP session.
 */

import type {
  ActivityFlowV2,
  ActivitySectionV2,
} from '../../types/activity.v2';

const bluesSectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    {
      stepNumber: 1,
      module: 'blues_l1',
      section: 'A',
      subsection: 'A1: Melody — Coming Soon',
      activity: 'A1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'blues:melody_stub | blues',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const bluesSectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    {
      stepNumber: 2,
      module: 'blues_l1',
      section: 'B',
      subsection: 'B1: Chords — Coming Soon',
      activity: 'B1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'blues:chords_stub | blues',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const bluesSectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 3,
      module: 'blues_l1',
      section: 'C',
      subsection: 'C1: Bass — Coming Soon',
      activity: 'C1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'blues:bass_stub | blues',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const bluesSectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 4,
      module: 'blues_l1',
      section: 'D',
      subsection: 'D1: Performance — Coming Soon',
      activity: 'D1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'blues:performance_stub | blues',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};

const stubSections = [
  bluesSectionA,
  bluesSectionB,
  bluesSectionC,
  bluesSectionD,
];
const stubParams = {
  defaultKey: 'A minor',
  defaultScale: [0, 3, 5, 6, 7, 10],
  defaultScaleId: 'minor_blues',
  tempoRange: [70, 110] as [number, number],
  swing: 0,
  grooves: [] as string[],
};

export const bluesL1: ActivityFlowV2 = {
  genre: 'blues',
  level: 1,
  version: 'v2',
  title: 'Blues Level 1',
  params: stubParams,
  sections: stubSections,
};
export const bluesL2: ActivityFlowV2 = {
  genre: 'blues',
  level: 2,
  version: 'v2',
  title: 'Blues Level 2',
  params: stubParams,
  sections: stubSections,
};
export const bluesL3: ActivityFlowV2 = {
  genre: 'blues',
  level: 3,
  version: 'v2',
  title: 'Blues Level 3',
  params: stubParams,
  sections: stubSections,
};
export const bluesFlows = [bluesL1, bluesL2, bluesL3] as const;
