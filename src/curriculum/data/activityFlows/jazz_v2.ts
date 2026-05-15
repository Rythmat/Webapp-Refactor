/**
 * Jazz v2 — Activity Flow Stubs.
 * Musical content is NOTE — authored in a dedicated Style SOP session.
 */

import type {
  ActivityFlowV2,
  ActivitySectionV2,
} from '../../types/activity.v2';

const jazzSectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    {
      stepNumber: 1,
      module: 'jazz_l1',
      section: 'A',
      subsection: 'A1: Melody — Coming Soon',
      activity: 'A1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'jazz:melody_stub | jazz',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};

const jazzSectionB: ActivitySectionV2 = {
  id: 'B',
  name: 'Chords',
  steps: [
    {
      stepNumber: 2,
      module: 'jazz_l1',
      section: 'B',
      subsection: 'B1: Chords — Coming Soon',
      activity: 'B1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'jazz:chords_stub | jazz',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};

const jazzSectionC: ActivitySectionV2 = {
  id: 'C',
  name: 'Bass',
  steps: [
    {
      stepNumber: 3,
      module: 'jazz_l1',
      section: 'C',
      subsection: 'C1: Bass — Coming Soon',
      activity: 'C1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'jazz:bass_stub | jazz',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};

const jazzSectionD: ActivitySectionV2 = {
  id: 'D',
  name: 'Performance',
  steps: [
    {
      stepNumber: 4,
      module: 'jazz_l1',
      section: 'D',
      subsection: 'D1: Performance — Coming Soon',
      activity: 'D1.1: Coming Soon',
      direction: 'This section is under development. Check back soon.',
      assessment: 'pitch_only',
      tag: 'jazz:performance_stub | jazz',
      styleRef: 'l1a',
      successFeedback: 'Coming soon.',
      targetNotes: [],
    },
  ],
};

const stubSections = [jazzSectionA, jazzSectionB, jazzSectionC, jazzSectionD];

const stubParams = {
  defaultKey: 'C major', // NOTE
  defaultScale: [0, 2, 4, 5, 7, 9, 11], // NOTE
  defaultScaleId: 'major', // NOTE
  tempoRange: [80, 120] as [number, number], // NOTE
  swing: 0,
  grooves: [] as string[], // NOTE
};

export const jazzL1: ActivityFlowV2 = {
  genre: 'jazz',
  level: 1,
  version: 'v2',
  title: 'Jazz Level 1', // NOTE
  params: stubParams,
  sections: stubSections,
};

export const jazzL2: ActivityFlowV2 = {
  genre: 'jazz',
  level: 2,
  version: 'v2',
  title: 'Jazz Level 2', // NOTE
  params: stubParams,
  sections: stubSections,
};

export const jazzL3: ActivityFlowV2 = {
  genre: 'jazz',
  level: 3,
  version: 'v2',
  title: 'Jazz Level 3', // NOTE
  params: stubParams,
  sections: stubSections,
};

export const jazzFlows = [jazzL1, jazzL2, jazzL3] as const;
