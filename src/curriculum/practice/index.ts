// Practice tools for a lesson step: loop bars, the speed-trainer ladder,
// mistake markers and one next step after a take. Instrument-agnostic;
// guitar uses them in v1.

export {
  HandCareChip,
  useBarreLoopingMs,
  type HandCareChipProps,
} from './HandCareChip';
export {
  LoopSelectionOverlay,
  type LoopSelectionOverlayProps,
} from './LoopSelectionOverlay';
export {
  MISTAKE_MARKERS,
  MistakeMarkersOverlay,
  type MistakeMarkersOverlayProps,
} from './MistakeMarkersOverlay';
export {
  SpeedTrainerControl,
  type SpeedTrainerControlProps,
} from './SpeedTrainerControl';
export {
  EARLY_LATE_TOLERANCE_TICKS,
  nextStepSuggestion,
  outcomeMistake,
  type MistakeKind,
  type NextStepSuggestion,
} from './nextStepSuggestion';
export {
  CLEAN_PASS,
  HAND_CARE,
  LOOP_PRESETS,
  SPEED_LADDER_DEFAULTS,
  isCleanPass,
  stepPassMark,
  type LoopPresetId,
} from './practiceDefaults';
export {
  loopLabel,
  paddedLoopRange,
  sliceStepForLoop,
  stepBarCount,
  type LoopRange,
  type LoopableStepContent,
  type SliceOptions,
  type SlicedStep,
} from './sliceStepForLoop';
export {
  ladderAfterPass,
  loopPresets,
  speedLadderText,
  useLessonPracticeTools,
  type LessonPracticeTools,
  type LoopPreset,
  type PracticeToolsState,
  type SpeedLadderState,
  type UseLessonPracticeToolsOptions,
} from './useLessonPracticeTools';
