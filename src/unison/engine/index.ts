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
export {
  renderVoicing,
  applyVoicingsToTimeline,
  listAvailableGenreLevels,
} from './voicingRenderer';
export type {
  VoicingRenderResult,
  RenderVoicingOptions,
  ApplyVoicingsOptions,
} from './voicingRenderer';
export {
  renderComping,
  applyComping,
  listCompingPatternsForGenre,
} from './compingRenderer';
export type { RenderCompingOptions } from './compingRenderer';
export {
  renderBass,
  applyBass,
  listBassContours,
  listBassRhythmsForGenre,
} from './bassRenderer';
export type { RenderBassOptions } from './bassRenderer';
export { renderDrums, applyDrums, listDrumGenres } from './drumRenderer';
export type { RenderDrumsOptions } from './drumRenderer';
export { renderMelody, applyMelody } from './melodyRenderer';
export type { MelodyConfig, RenderMelodyOptions } from './melodyRenderer';
export { parseStyle } from './styleParser';
export type { ParsedStyle } from './styleParser';
export { arrangeForStyle } from './arrangeForStyle';
export type { ArrangeForStyleOptions, ArrangeResult } from './arrangeForStyle';
