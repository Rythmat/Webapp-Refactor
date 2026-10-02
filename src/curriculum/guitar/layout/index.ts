// The guitar lesson screen: GenreLessonContainerV2 renders GuitarLessonLayout
// on guitar and hands it the models in ./types.

export { GuitarLessonLayout } from './GuitarLessonLayout';
export {
  GuitarLessonHeader,
  eyebrowSubsection,
  lessonTitle,
  type GuitarLessonHeaderProps,
} from './GuitarLessonHeader';
export { GuitarStepNav, type GuitarStepNavProps } from './GuitarStepNav';
export {
  GuitarStepList,
  stepAccessibleName,
  type GuitarStepListProps,
} from './GuitarStepList';
export {
  GuitarActionBar,
  meterFraction,
  type GuitarActionBarProps,
} from './GuitarActionBar';
export { deriveBarState, type BarStateInput } from './deriveBarState';
export {
  TEMPO_MAX,
  TEMPO_MIN,
  TempoStepper,
  clampTempo,
  type TempoStepperProps,
} from './TempoStepper';
export {
  GuitarResultPanel,
  resultSummary,
  type GuitarResultPanelProps,
} from './GuitarResultPanel';
export {
  GuitarSectionCompletePanel,
  type GuitarSectionCompletePanelProps,
} from './GuitarSectionCompletePanel';
export {
  GuitarInputIndicator,
  guitarInputAttention,
  type GuitarInputAttention,
  type GuitarInputIndicatorProps,
} from './GuitarInputIndicator';
export {
  STEP_KEYS_IGNORE_SELECTOR,
  useGuitarStepKeys,
  type GuitarStepKeysOptions,
} from './useGuitarStepKeys';
export type {
  BarState,
  Crumb,
  GuitarLessonLayoutProps,
  GuitarStepStatus,
  HeaderModel,
  InputModel,
  LayoutSlots,
  NavSection,
  NavStep,
  PracticeModel,
  PracticePreset,
  ResultModel,
  RunModel,
  RunState,
  SectionCompleteModel,
  StepNavModel,
  TempoModel,
  TheoryModel,
} from './types';
