import { vi } from 'vitest';
import { activityId } from '@/curriculum/components/guitar/theory/theoryUi';
import { buildGuitarAppliedTheoryFundamentalsFlow } from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import type { GuitarKeyName } from '@/curriculum/data/guitar/types';
import type {
  ActivityFlowV2,
  ActivityStepV2,
} from '@/curriculum/types/activity.v2';
import type { LearnGuitarInput } from '@/hooks/music/useLearnInput';
import type { GuitarInputPrefs } from '@/learn/audio/guitar/types';
import type { InputModel, TheoryModel } from '../types';

// Test fixtures for the guitar lesson sheets: a real flow's step as the
// theory model, and an input model of spies.

const FLOWS = new Map<GuitarKeyName, ActivityFlowV2>();

export function flowOf(key: GuitarKeyName): ActivityFlowV2 {
  let flow = FLOWS.get(key);
  if (!flow) {
    flow = buildGuitarAppliedTheoryFundamentalsFlow(key);
    FLOWS.set(key, flow);
  }
  return flow;
}

export function stepOf(key: GuitarKeyName, id: string): ActivityStepV2 {
  const step = flowOf(key)
    .sections.flatMap((s) => s.steps)
    .find((s) => activityId(s) === id);
  if (!step) throw new Error(`no step ${id} in ${key}`);
  return step;
}

export function theoryFor(
  key: GuitarKeyName,
  id: string,
  over: Partial<TheoryModel> = {},
): TheoryModel {
  const step = stepOf(key, id);
  return {
    flow: flowOf(key),
    step,
    displayStep: step,
    keyCenter: key,
    keyColor: '#D2404A',
    sectionId: step.section,
    onHearShape: vi.fn(),
    canShowRoman: false,
    practising: false,
    ...over,
  };
}

const PREFS: GuitarInputPrefs = {
  source: 'audio',
  deviceId: null,
  channel: 0,
  trimDb: 0,
  gateRms: 0.01,
  inputLatencyMs: 0,
  bleedDetected: false,
  monitorThroughAmp: false,
};

export function handleFor(
  over: Partial<LearnGuitarInput> = {},
): LearnGuitarInput {
  return {
    status: 'idle',
    prefs: PREFS,
    level: 0,
    error: null,
    enable: vi.fn(async () => {}),
    restart: vi.fn(async () => {}),
    setEvaluationMode: vi.fn(),
    setSuppressed: vi.fn(),
    setExpectedNotes: vi.fn(),
    setKeyContext: vi.fn(),
    calibrateGate: vi.fn(async () => 0.01),
    getTunerAnalyser: vi.fn(() => null),
    getLastChroma: vi.fn(() => null),
    getRig: vi.fn(() => null),
    setClickFilter: vi.fn(),
    ...over,
  };
}

export function inputFor(over: Partial<InputModel> = {}): InputModel {
  return {
    handle: handleFor(),
    listening: false,
    openSetup: vi.fn(),
    silence: null,
    monitor: false,
    onMonitorChange: vi.fn(),
    onTonePreview: vi.fn(),
    outputLatencyMs: 0,
    openAudioTiming: vi.fn(),
    ...over,
  };
}
