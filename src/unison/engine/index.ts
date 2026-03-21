export { detectKey } from './keyDetector';
export { analyzeHarmony } from './harmonicAnalyzer';
export { matchProgressions } from './progressionMatcher';
export { analyzeRhythm } from './rhythmAnalyzer';
export { analyzeMelody } from './melodyAnalyzer';
export {
  isDiatonic,
  getScaleDegree,
  getExpectedQualities,
} from './diatonicChecker';
export { findBorrowedSources, getBestBorrowedSource } from './modalInterchange';
export type { BorrowedChordInfo } from './modalInterchange';
export {
  detectSecondaryDominant,
  detectSecondaryDominants,
} from './secondaryDominant';
export type { SecondaryDominantInfo } from './secondaryDominant';
export { detectTonalRegions } from './tonalRegionDetector';
export type { TonalRegionConfig } from './tonalRegionDetector';
export { detectMixturePatterns } from './modeMixture';
export type { MixturePattern, MixturePatternType } from './modeMixture';
export { analyzeVoiceLeading } from './voiceLeadingAnalyzer';
export { estimateBpm } from './bpmEstimator';
export type { BpmEstimate } from './bpmEstimator';
export { analyzeTimbre } from './timbreAnalyzer';
export { analyzeMix } from './mixAnalyzer';
