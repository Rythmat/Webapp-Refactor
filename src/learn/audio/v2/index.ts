// ── V2 Barrel Export ──────────────────────────────────────────────────────
// Public API for the probabilistic streaming pitch detection system.

// Types
export type {
  PitchDistribution,
  OnsetEvent,
  TrackedNote,
  NMFActivation,
  ContinuousNoteScore,
  ContinuousPerformanceScore,
  ContinuousNoteFeedback,
  DetectionMode,
} from './types';

export {
  NUM_STATES,
  SILENCE_STATE,
  MIDI_OFFSET,
  A4_FREQ,
  freqToMidi,
  freqToMidiContinuous,
  midiToFreq,
  stateToMidi,
  midiToState,
  normalizeDistribution,
  createUniformDistribution,
  createSilenceDistribution,
} from './types';

// Layer 1: Multi-Resolution Input
export { StreamingAudioCapture } from './StreamingAudioCapture';
export type { StreamingCaptureState } from './StreamingAudioCapture';
export { OnsetStream } from './OnsetStream';
export { FastPitchStream } from './FastPitchStream';
export { HiResPitchStream } from './HiResPitchStream';

// Layer 2: Bayesian Note Tracker
export { TransitionMatrix } from './TransitionMatrix';
export { ObservationModel } from './ObservationModel';
export { NoteHMM } from './NoteHMM';

// Layer 3: NMF Polyphonic Detection
export { PianoTemplates } from './PianoTemplates';
export { NMFDetector } from './NMFDetector';

// Layer 4: ML Peer
export { BasicPitchPeer } from './BasicPitchPeer';

// Layer 6: Adaptive
export { AdaptiveNoiseFloor } from './AdaptiveNoiseFloor';
export { InstrumentProfiler } from './InstrumentProfiler';

// Integration
export { ProbabilisticOrchestrator } from './ProbabilisticOrchestrator';
export type { OrchestratorCallbacks } from './ProbabilisticOrchestrator';
export { PianoCalibrationV2Runner } from './PianoCalibrationV2';
export type {
  CalibrationV2Profile,
  CalibrationV2Step,
  CalibrationV2Progress,
} from './PianoCalibrationV2';
export {
  loadCalibrationV2Profile,
  saveCalibrationV2Profile,
  clearCalibrationV2Profile,
} from './PianoCalibrationV2';
