/**
 * Rock v2 — Activity Flow Stubs.
 * Musical content is TODO — authored in a dedicated Style SOP session.
 */

import type {
  ActivityFlowV2,
  ActivitySectionV2,
} from '../../types/activity.v2';

const rockSectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    {
      stepNumber: 1,
      module: 'rock_l1',
      section: 'A',
      subsection: 'A1: Melody — Coming Soon',
      activity: 'A1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'rock:melody_stub | rock',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const rockSectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    {
      stepNumber: 2,
      module: 'rock_l1',
      section: 'B',
      subsection: 'B1: Chords — Coming Soon',
      activity: 'B1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'rock:chords_stub | rock',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const rockSectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 3,
      module: 'rock_l1',
      section: 'C',
      subsection: 'C1: Bass — Coming Soon',
      activity: 'C1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'rock:bass_stub | rock',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};
const rockSectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 4,
      module: 'rock_l1',
      section: 'D',
      subsection: 'D1: Performance — Coming Soon',
      activity: 'D1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'rock:performance_stub | rock',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};

const stubSections = [rockSectionA, rockSectionB, rockSectionC, rockSectionD];
const stubParams = {
  defaultKey: 'A minor',
  defaultScale: [0, 2, 3, 5, 7, 8, 10],
  defaultScaleId: 'minor',
  tempoRange: [90, 140] as [number, number],
  swing: 0,
  grooves: [] as string[],
};

export const rockL1: ActivityFlowV2 = {
  genre: 'rock',
  level: 1,
  version: 'v2',
  title: 'Rock Level 1',
  params: stubParams,
  sections: stubSections,
};
export const rockL2: ActivityFlowV2 = {
  genre: 'rock',
  level: 2,
  version: 'v2',
  title: 'Rock Level 2',
  params: stubParams,
  sections: stubSections,
};
export const rockL3: ActivityFlowV2 = {
  genre: 'rock',
  level: 3,
  version: 'v2',
  title: 'Rock Level 3',
  params: stubParams,
  sections: stubSections,
};
export const rockFlows = [rockL1, rockL2, rockL3] as const;
