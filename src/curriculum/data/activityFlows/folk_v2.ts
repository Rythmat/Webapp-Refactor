/**
 * Folk v2 — Activity Flow Stubs.
 * Musical content is TODO — authored in a dedicated Style SOP session.
 */

import type {
  ActivityFlowV2,
  ActivitySectionV2,
} from '../../types/activity.v2';

const folkSectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    {
      stepNumber: 1,
      module: 'folk_l1',
      section: 'A',
      subsection: 'A1: Melody — Coming Soon',
      activity: 'A1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'folk:melody_stub | folk',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const folkSectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    {
      stepNumber: 2,
      module: 'folk_l1',
      section: 'B',
      subsection: 'B1: Chords — Coming Soon',
      activity: 'B1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'folk:chords_stub | folk',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const folkSectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 3,
      module: 'folk_l1',
      section: 'C',
      subsection: 'C1: Bass — Coming Soon',
      activity: 'C1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'folk:bass_stub | folk',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const folkSectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 4,
      module: 'folk_l1',
      section: 'D',
      subsection: 'D1: Performance — Coming Soon',
      activity: 'D1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'folk:performance_stub | folk',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};

const stubSections = [folkSectionA, folkSectionB, folkSectionC, folkSectionD];
const stubParams = {
  defaultKey: 'G major',
  defaultScale: [0, 2, 4, 5, 7, 9, 11],
  defaultScaleId: 'major',
  tempoRange: [70, 110] as [number, number],
  swing: 0,
  grooves: [] as string[],
};

export const folkL1: ActivityFlowV2 = {
  genre: 'folk',
  level: 1,
  version: 'v2',
  title: 'Folk Level 1',
  params: stubParams,
  sections: stubSections,
};
export const folkL2: ActivityFlowV2 = {
  genre: 'folk',
  level: 2,
  version: 'v2',
  title: 'Folk Level 2',
  params: stubParams,
  sections: stubSections,
};
export const folkL3: ActivityFlowV2 = {
  genre: 'folk',
  level: 3,
  version: 'v2',
  title: 'Folk Level 3',
  params: stubParams,
  sections: stubSections,
};
export const folkFlows = [folkL1, folkL2, folkL3] as const;
