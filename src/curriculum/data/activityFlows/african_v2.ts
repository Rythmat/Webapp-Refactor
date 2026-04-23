/**
 * African v2 — Activity Flow Stubs.
 * Musical content is TODO — authored in a dedicated Style SOP session.
 */

import type {
  ActivityFlowV2,
  ActivitySectionV2,
} from '../../types/activity.v2';

const africanSectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    {
      stepNumber: 1,
      module: 'african_l1',
      section: 'A',
      subsection: 'A1: Melody — Coming Soon',
      activity: 'A1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'african:melody_stub | african',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const africanSectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    {
      stepNumber: 2,
      module: 'african_l1',
      section: 'B',
      subsection: 'B1: Chords — Coming Soon',
      activity: 'B1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'african:chords_stub | african',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const africanSectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 3,
      module: 'african_l1',
      section: 'C',
      subsection: 'C1: Bass — Coming Soon',
      activity: 'C1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'african:bass_stub | african',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const africanSectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 4,
      module: 'african_l1',
      section: 'D',
      subsection: 'D1: Performance — Coming Soon',
      activity: 'D1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'african:performance_stub | african',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};

const stubSections = [
  africanSectionA,
  africanSectionB,
  africanSectionC,
  africanSectionD,
];
const stubParams = {
  defaultKey: 'C major',
  defaultScale: [0, 2, 4, 5, 7, 9, 11],
  defaultScaleId: 'major',
  tempoRange: [100, 140] as [number, number],
  swing: 0,
  grooves: [] as string[],
};

export const africanL1: ActivityFlowV2 = {
  genre: 'african',
  level: 1,
  version: 'v2',
  title: 'African Level 1',
  params: stubParams,
  sections: stubSections,
};
export const africanL2: ActivityFlowV2 = {
  genre: 'african',
  level: 2,
  version: 'v2',
  title: 'African Level 2',
  params: stubParams,
  sections: stubSections,
};
export const africanL3: ActivityFlowV2 = {
  genre: 'african',
  level: 3,
  version: 'v2',
  title: 'African Level 3',
  params: stubParams,
  sections: stubSections,
};
export const africanFlows = [africanL1, africanL2, africanL3] as const;
