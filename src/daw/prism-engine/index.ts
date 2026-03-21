// Types
export type {
  MidiNote,
  Tick,
  RhythmHit,
  RhythmPattern,
  RGB,
  ColorIndex,
  DegreeChordName,
  GraphKey,
  ModeName,
  MidiNoteEvent,
  MidiCCEvent,
  MidiSequence,
  ChordDegree,
  PrismSessionState,
  ChordMidiOptions,
  MelodyMidiOptions,
  DrumPattern,
  BassHit,
  BassPattern,
  GenreName,
  OrchestrateConfig,
} from './types';

export { StrumMode, VelocityTilt, InstrumentChannel, DrumNote } from './types';

// Data
export {
  NOTES,
  getMidi,
  noteName,
  noteNameLetter,
  noteNameInKey,
  getScaleSpellings,
  BEAT_VAL,
} from './data/notes';
export { CHORDS } from './data/chords';
export {
  MODES,
  MODE_NAMES,
  ALL_MODES,
  TRIADS,
  TETRADS,
  DEGREES,
  MODE_GROUPS,
  MODE_DISPLAY,
  FAMILY_COLOR_INDEX,
  FAMILY_DEGREE_ORDER,
  MODE_FAMILY_INFO,
} from './data/modes';
export {
  KEY_COLORS,
  KEYS,
  CHORD_COLORS,
  COLOR_TO_MODE,
} from './data/keyColors';
export { CHORD_RHYTHMS } from './data/chordRhythms';
export { MELODY_RHYTHMS } from './data/melodyRhythms';
export { MELODY_CONTOURS } from './data/melodyContours';
export { PROGRESSION_GRAPH } from './data/progressionGraph';
export { DRUM_PATTERNS } from './data/drumPatterns';
export { BASS_PATTERNS } from './data/bassPatterns';
export { PAD_PATTERNS } from './data/padPatterns';
export { GENRE_MAP, GENRE_SWING, GENRE_STRUM } from './data/genreMap';

// Engine — chord utilities
export {
  findTriadChords,
  findSeventhChords,
  generateChord,
  normalizeSequence,
  shiftOctave,
  findRoot,
} from './engine/chordUtils';

// Engine — naming
export {
  chordName,
  flatChordName,
  unpitchedChordName,
  steppedChord,
  chordDeg,
  degreeMidi,
  unstepChord,
  degreeChordName,
  abbreviateSequence,
  graphToken,
  detectChordWithInversion,
  getModeOffset,
  isDiatonicMode,
  ionianToModeLabel,
  modeToIonianLabel,
  resolveDegreeKey,
} from './engine/naming';
export type { ChordMatch } from './engine/naming';

// Engine — color system
export { getChordColor, getChordColorFromNotes } from './engine/colorSystem';

// Engine — progression graph
export { getOptions, getFirstChords, numOptions } from './engine/progression';

// Engine — melody
export { getChordMelody } from './engine/melodyGenerator';

// Engine — rhythm
export { swingRhythm, isSwingable, rhythmNames } from './engine/rhythmUtils';

// Engine — mode
export { modeChange } from './engine/modeUtils';

// Engine — MIDI export
export {
  generateChordMidi,
  generateMelodyMidi,
  distributeChords,
} from './engine/midiExport';

// Engine — drums
export { generateDrumMidi } from './engine/drumGenerator';

// Engine — bass
export { generateBassMidi } from './engine/bassGenerator';

// Engine — pad
export { generatePadMidi } from './engine/padGenerator';

// Engine — orchestrator
export { orchestrate } from './engine/orchestrator';

// Engine — suggestion
export {
  analyzeChordStyle,
  extractGraphSeed,
  generateSuggestions,
  filterByStyle,
} from './engine/suggestionEngine';
export type {
  ChordStyle,
  SuggestionChord,
  SuggestionSet,
} from './engine/suggestionEngine';
