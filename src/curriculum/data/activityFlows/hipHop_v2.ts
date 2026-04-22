/**
 * Hip Hop v2 — Activity Flow Stubs.
 * Musical content is TODO — authored in a dedicated Style SOP session.
 */

import type {
  ActivityFlowV2,
  ActivitySectionV2,
} from '../../types/activity.v2';

const hipHopSectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    {
      stepNumber: 1,
      module: 'hiphop_l1',
      section: 'A',
      subsection: 'A1: Melody — Coming Soon',
      activity: 'A1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'hiphop:melody_stub | hiphop',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const hipHopSectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    {
      stepNumber: 2,
      module: 'hiphop_l1',
      section: 'B',
      subsection: 'B1: Chords — Coming Soon',
      activity: 'B1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'hiphop:chords_stub | hiphop',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const hipHopSectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 3,
      module: 'hiphop_l1',
      section: 'C',
      subsection: 'C1: Bass — Coming Soon',
      activity: 'C1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'hiphop:bass_stub | hiphop',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const hipHopSectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 4,
      module: 'hiphop_l1',
      section: 'D',
      subsection: 'D1: Performance — Coming Soon',
      activity: 'D1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'hiphop:performance_stub | hiphop',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};

const stubSections = [
  hipHopSectionA,
  hipHopSectionB,
  hipHopSectionC,
  hipHopSectionD,
];
const stubParams = {
  defaultKey: 'C minor',
  defaultScale: [0, 2, 3, 5, 7, 8, 10],
  defaultScaleId: 'minor',
  tempoRange: [70, 100] as [number, number],
  swing: 0,
  grooves: [] as string[],
};

export const hipHopL1: ActivityFlowV2 = {
  genre: 'hip hop',
  level: 1,
  version: 'v2',
  title: 'Hip Hop Level 1',
  params: stubParams,
  sections: stubSections,
};
export const hipHopL2: ActivityFlowV2 = {
  genre: 'hip hop',
  level: 2,
  version: 'v2',
  title: 'Hip Hop Level 2',
  params: stubParams,
  sections: stubSections,
};
export const hipHopL3: ActivityFlowV2 = {
  genre: 'hip hop',
  level: 3,
  version: 'v2',
  title: 'Hip Hop Level 3',
  params: stubParams,
  sections: stubSections,
};
export const hipHopFlows = [hipHopL1, hipHopL2, hipHopL3] as const;
