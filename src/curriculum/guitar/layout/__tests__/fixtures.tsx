import { createRef } from 'react';
import { vi } from 'vitest';
import type { AssessmentResult } from '@/curriculum/hooks/useGenreAssessment';
import type { LearnGuitarInput } from '@/hooks/music/useLearnInput';
import type { GuitarInputStatus } from '@/learn/audio/guitar/types';
import type {
  GuitarLessonLayoutProps,
  InputModel,
  NavStep,
  PracticeModel,
  ResultModel,
  RunModel,
  SectionCompleteModel,
  StepNavModel,
  TempoModel,
  TheoryModel,
} from '../types';

// Plain models for the layout's tests: every callback a vi.fn, every value
// the smallest that reads like a real A1 step.

export const KEY_COLOR = '#D2404A';

export function makeSteps(): NavStep[] {
  return [
    {
      code: 'A1.1',
      title: 'Major Scale Ascending (Out of Time)',
      subsection: 'A1: Major Scale',
      status: 'passed',
    },
    {
      code: 'A1.2',
      title: 'Major Scale Ascending (In Time)',
      subsection: 'A1: Major Scale',
      status: 'selfReported',
    },
    {
      code: 'A1.3',
      title: 'Major Scale Descending (Out of Time)',
      subsection: 'A1: Major Scale',
      status: 'attempted',
    },
    {
      code: 'A2.1',
      title: '3 Note Contour (Out of Time)',
      subsection: 'A2: Melody',
      status: 'todo',
    },
  ];
}

export function makeNav(overrides: Partial<StepNavModel> = {}): StepNavModel {
  return {
    sections: [
      { id: 'A', name: 'Melody', active: true, done: false },
      { id: 'B', name: 'Chords', active: false, done: true },
      { id: 'D', name: 'Play-Along', active: false, done: false },
    ],
    onSection: vi.fn(),
    steps: makeSteps(),
    index: 2,
    goToStep: vi.fn(),
    practiceTrack: { onOpen: vi.fn() },
    ...overrides,
  };
}

export function makeRun(overrides: Partial<RunModel> = {}): RunModel {
  return {
    state: 'preview',
    restartingPass: false,
    instruction:
      'Play the notes of the scale from lowest to highest, one at a time.',
    listen: { mode: 'waitForMe', passMarkPct: 75 },
    loading: false,
    demo: { playing: false, play: vi.fn(), stop: vi.fn() },
    practise: vi.fn(),
    playNow: vi.fn(),
    back: vi.fn(),
    stopTake: vi.fn(),
    hint: null,
    ...overrides,
  };
}

export function makeTempo(overrides: Partial<TempoModel> = {}): TempoModel {
  return {
    bpm: 60,
    onChange: vi.fn(),
    effectiveBpm: 60,
    trainer: {
      ladder: {
        enabled: false,
        currentPct: 70,
        cleanStreak: 0,
        nonCleanStreak: 0,
        lastStep: null,
      },
      text: 'Starts at 70%, +5% after 2 clean passes',
      onToggle: vi.fn(),
      onReset: vi.fn(),
    },
    ...overrides,
  };
}

export function makePractice(
  overrides: Partial<PracticeModel> = {},
): PracticeModel {
  return {
    loopStatus: {
      loop: { startBar: 0, endBar: 1 },
      padBars: 0,
      passCount: 2,
      onPadChange: vi.fn(),
      onClear: vi.fn(),
    },
    notes: { handCareMs: 0, guideMuted: false },
    presets: [],
    ...overrides,
  };
}

export function fakeHandle(
  status: GuitarInputStatus,
  {
    source = 'audio',
    level = 0,
    error = null,
  }: {
    source?: 'audio' | 'midi';
    level?: number;
    error?: string | null;
  } = {},
): LearnGuitarInput {
  return {
    status,
    prefs: {
      source,
      deviceId: null,
      channel: 0,
      trimDb: 0,
      gateRms: 0.01,
      inputLatencyMs: 0,
      bleedDetected: false,
      monitorThroughAmp: false,
    },
    level,
    error,
    enable: vi.fn(async () => {}),
    restart: vi.fn(async () => {}),
    setEvaluationMode: vi.fn(),
    setSuppressed: vi.fn(),
    setExpectedNotes: vi.fn(),
    setKeyContext: vi.fn(),
    setClickFilter: vi.fn(),
    calibrateGate: vi.fn(async () => 0.01),
    getTunerAnalyser: () => null,
    getLastChroma: () => null,
    getRig: () => null,
  } as unknown as LearnGuitarInput;
}

export function makeInput(overrides: Partial<InputModel> = {}): InputModel {
  return {
    handle: null,
    listening: false,
    openSetup: vi.fn(),
    silence: null,
    monitor: false,
    onMonitorChange: vi.fn(),
    onTonePreview: vi.fn(),
    outputLatencyMs: 0,
    openAudioTiming: vi.fn(),
    ...overrides,
  };
}

export function makeAssessment(
  overrides: Partial<AssessmentResult> = {},
): AssessmentResult {
  return {
    passed: true,
    pitchAccuracy: 1,
    timingAccuracy: 0.9,
    durationAccuracy: null,
    overallScore: 1,
    missedNotes: [],
    wrongNotes: [],
    xpEarned: 10,
    skillTagsEarned: [],
    feedbackText: 'Every note landed.',
    ...overrides,
  };
}

export function makeResult(overrides: Partial<ResultModel> = {}): ResultModel {
  const result = overrides.result ?? makeAssessment();
  return {
    result,
    stepKind: 'notes',
    headingOverride: null,
    feedback: result.feedbackText,
    suggestion: null,
    onSuggestion: vi.fn(),
    hasMistakes: false,
    canCountItMyself: false,
    onCountItMyself: vi.fn(),
    onOpenSetup: vi.fn(),
    retry: vi.fn(),
    next: vi.fn(),
    nextLabel: 'Next',
    ...overrides,
  };
}

export function makeOffer(
  overrides: Partial<SectionCompleteModel> = {},
): SectionCompleteModel {
  return {
    heading: 'Melody complete!',
    blurb:
      'Take the groove into a Practice Track and improvise your own melodies over it.',
    enterPracticeTrack: vi.fn(),
    continueLabel: 'Continue to Chords',
    onContinue: vi.fn(),
    ...overrides,
  };
}

/** The sheets are mocked in these tests; the theory model only passes through. */
export const THEORY = { sectionId: 'A' } as unknown as TheoryModel;

export function makeLayoutProps(
  overrides: Partial<GuitarLessonLayoutProps> = {},
): GuitarLessonLayoutProps {
  return {
    header: {
      crumbs: [
        { label: 'Theory', onClick: vi.fn() },
        { label: 'Guitar · Ionian (Major)', onClick: vi.fn() },
      ],
      keyLabel: 'C major',
      keyColor: KEY_COLOR,
      subsection: 'A1: Major Scale',
      activity: 'A1.3: Major Scale Descending (Out of Time)',
    },
    nav: makeNav(),
    run: makeRun(),
    tempo: null,
    practice: makePractice(),
    input: makeInput(),
    result: null,
    offer: null,
    theory: THEORY,
    slots: {
      tabViewportRef: createRef<HTMLDivElement>(),
      tab: <div data-testid="tab">TAB</div>,
      visuals: <div data-testid="visuals">Visuals</div>,
      setupModal: null,
    },
    ...overrides,
  };
}
