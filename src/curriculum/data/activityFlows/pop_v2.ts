/**
 * Pop v2 — Activity Flow Stubs.
 * Musical content is TODO — authored in a dedicated Style SOP session.
 */

import type {
  ActivityFlowV2,
  ActivitySectionV2,
} from '../../types/activity.v2';

const popSectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    {
      stepNumber: 1,
      module: 'pop_l1',
      section: 'A',
      subsection: 'A1: Melody — Coming Soon',
      activity: 'A1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'pop:melody_stub | pop',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const popSectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    {
      stepNumber: 2,
      module: 'pop_l1',
      section: 'B',
      subsection: 'B1: Chords — Coming Soon',
      activity: 'B1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'pop:chords_stub | pop',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const popSectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 3,
      module: 'pop_l1',
      section: 'C',
      subsection: 'C1: Bass — Coming Soon',
      activity: 'C1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'pop:bass_stub | pop',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const popSectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 4,
      module: 'pop_l1',
      section: 'D',
      subsection: 'D1: Performance — Coming Soon',
      activity: 'D1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'pop:performance_stub | pop',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};

const stubSections = [popSectionA, popSectionB, popSectionC, popSectionD];
const stubParams = {
  defaultKey: 'C major',
  defaultScale: [0, 2, 4, 5, 7, 9, 11],
  defaultScaleId: 'major',
  tempoRange: [80, 130] as [number, number],
  swing: 0,
  grooves: [] as string[],
};

export const popL1: ActivityFlowV2 = {
  genre: 'pop',
  level: 1,
  version: 'v2',
  title: 'Pop Level 1',
  params: stubParams,
  sections: stubSections,
};
export const popL2: ActivityFlowV2 = {
  genre: 'pop',
  level: 2,
  version: 'v2',
  title: 'Pop Level 2',
  params: stubParams,
  sections: stubSections,
};
export const popL3: ActivityFlowV2 = {
  genre: 'pop',
  level: 3,
  version: 'v2',
  title: 'Pop Level 3',
  params: stubParams,
  sections: stubSections,
};
export const popFlows = [popL1, popL2, popL3] as const;
