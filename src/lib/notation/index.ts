export { buildScore } from './buildScore';
export {
  inferKeyFifths,
  keyFifthsForTonic,
  keySignatureAlterations,
} from './keySignature';
export { drumStaffPosition, isFootDrum } from './drumMap';
export type { DrumNotehead, DrumStaffPosition, DrumVoice } from './drumMap';
export { getChordClef, setChordClef, useChordClef } from './clefPreference';
export { isHandSplit, resolveStaves, type NotationStaves } from './handSplit';
export type { ChordClef } from './clefPreference';
export { getRollView, setRollView, useRollView } from './viewPreference';
export type { RollView, RollViewScope } from './viewPreference';
export type * from './types';
