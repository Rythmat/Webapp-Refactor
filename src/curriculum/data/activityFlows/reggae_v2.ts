/**
 * Reggae v2 — Activity Flow Stubs.
 * Musical content is TODO — authored in a dedicated Style SOP session.
 */

import type {
  ActivityFlowV2,
  ActivitySectionV2,
} from '../../types/activity.v2';

const reggaeSectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    {
      stepNumber: 1,
      module: 'reggae_l1',
      section: 'A',
      subsection: 'A1: Melody — Coming Soon',
      activity: 'A1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'reggae:melody_stub | reggae',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const reggaeSectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    {
      stepNumber: 2,
      module: 'reggae_l1',
      section: 'B',
      subsection: 'B1: Chords — Coming Soon',
      activity: 'B1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'reggae:chords_stub | reggae',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const reggaeSectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 3,
      module: 'reggae_l1',
      section: 'C',
      subsection: 'C1: Bass — Coming Soon',
      activity: 'C1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'reggae:bass_stub | reggae',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const reggaeSectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 4,
      module: 'reggae_l1',
      section: 'D',
      subsection: 'D1: Performance — Coming Soon',
      activity: 'D1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'reggae:performance_stub | reggae',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};

const stubSections = [
  reggaeSectionA,
  reggaeSectionB,
  reggaeSectionC,
  reggaeSectionD,
];
const stubParams = {
  defaultKey: 'A minor',
  defaultScale: [0, 2, 3, 5, 7, 8, 10],
  defaultScaleId: 'minor',
  tempoRange: [70, 100] as [number, number],
  swing: 0,
  grooves: [] as string[],
};

export const reggaeL1: ActivityFlowV2 = {
  genre: 'reggae',
  level: 1,
  version: 'v2',
  title: 'Reggae Level 1',
  params: stubParams,
  sections: stubSections,
};
export const reggaeL2: ActivityFlowV2 = {
  genre: 'reggae',
  level: 2,
  version: 'v2',
  title: 'Reggae Level 2',
  params: stubParams,
  sections: stubSections,
};
export const reggaeL3: ActivityFlowV2 = {
  genre: 'reggae',
  level: 3,
  version: 'v2',
  title: 'Reggae Level 3',
  params: stubParams,
  sections: stubSections,
};
export const reggaeFlows = [reggaeL1, reggaeL2, reggaeL3] as const;
