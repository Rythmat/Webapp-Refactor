/**
 * R&B v2 — Activity Flow Stubs.
 * Musical content is TODO — authored in a dedicated Style SOP session.
 */

import type {
  ActivityFlowV2,
  ActivitySectionV2,
} from '../../types/activity.v2';

const rnbSectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    {
      stepNumber: 1,
      module: 'rnb_l1',
      section: 'A',
      subsection: 'A1: Melody — Coming Soon',
      activity: 'A1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'rnb:melody_stub | rnb',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const rnbSectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    {
      stepNumber: 2,
      module: 'rnb_l1',
      section: 'B',
      subsection: 'B1: Chords — Coming Soon',
      activity: 'B1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'rnb:chords_stub | rnb',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const rnbSectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 3,
      module: 'rnb_l1',
      section: 'C',
      subsection: 'C1: Bass — Coming Soon',
      activity: 'C1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'rnb:bass_stub | rnb',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const rnbSectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 4,
      module: 'rnb_l1',
      section: 'D',
      subsection: 'D1: Performance — Coming Soon',
      activity: 'D1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'rnb:performance_stub | rnb',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};

const stubSections = [rnbSectionA, rnbSectionB, rnbSectionC, rnbSectionD];
const stubParams = {
  defaultKey: 'C major',
  defaultScale: [0, 2, 4, 5, 7, 9, 11],
  defaultScaleId: 'major',
  tempoRange: [70, 100] as [number, number],
  swing: 0,
  grooves: [] as string[],
};

export const rnbL1: ActivityFlowV2 = {
  genre: 'rnb',
  level: 1,
  version: 'v2',
  title: 'R&B Level 1',
  params: stubParams,
  sections: stubSections,
};
export const rnbL2: ActivityFlowV2 = {
  genre: 'rnb',
  level: 2,
  version: 'v2',
  title: 'R&B Level 2',
  params: stubParams,
  sections: stubSections,
};
export const rnbL3: ActivityFlowV2 = {
  genre: 'rnb',
  level: 3,
  version: 'v2',
  title: 'R&B Level 3',
  params: stubParams,
  sections: stubSections,
};
export const rnbFlows = [rnbL1, rnbL2, rnbL3] as const;
