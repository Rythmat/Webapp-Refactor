/** MIDI note number 0-127 */
export type MidiNote = number;

/** Tick position within a MIDI sequence (480 ticks per quarter note) */
export type Tick = number;

/** A single rhythm hit: [startTick, durationTicks] */
export type RhythmHit = [start: Tick, duration: Tick];

/** A rhythm pattern is an array of hits */
export type RhythmPattern = RhythmHit[];

/** RGB color tuple */
export type RGB = [r: number, g: number, b: number];

/** Color index in Prism's color system (1-12 = circle-of-fifths keys, 13-16 = scale families, 0 = white/unknown) */
export type ColorIndex = number;

/**
 * Degree-qualified chord name as used in graph keys.
 * Format: "{degree} {quality}" e.g. "1 major", "b3 dominant7", "#4 diminished"
 */
export type DegreeChordName = string;

/**
 * A graph key is either a single DegreeChordName or pipe-separated history.
 * e.g. "1 major" or "1 major|2 minor|3 minor"
 */
export type GraphKey = string;

/** Mode name */
export type ModeName =
  | 'ionian'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'aeolian'
  | 'locrian'
  | 'melodicMinor'
  | 'harmonicMinor'
  | 'harmonicMajor'
  | 'doubleHarmonicMajor';

/** Strum mode */
export enum StrumMode {
  Synchronized = 1,
  Down = 2,
  Up = 3,
  Human = 4,
}

/** Velocity tilt mode */
export enum VelocityTilt {
  Balanced = 1,
  BassLeading = 2,
  HighsLeading = 3,
  Human = 4,
}

/** A single MIDI event (note-level) */
export interface MidiNoteEvent {
  note: MidiNote;
  velocity: number;
  startTick: Tick;
  durationTicks: Tick;
  channel: number;
}

/** A single MIDI CC event (e.g. sustain pedal CC64) */
export interface MidiCCEvent {
  tick: Tick;
  controller: number;
  value: number;
  channel: number;
}

/** A complete MIDI sequence (list of note events) */
export interface MidiSequence {
  ticksPerQuarterNote: number;
  trackName: string;
  events: MidiNoteEvent[];
  ccEvents?: MidiCCEvent[];
}

/** Parsed degree + modifier from graph chord names */
export interface ChordDegree {
  degree: number;
  modifier: -1 | 0 | 1;
}

/** The full shared state for a Prism session */
export interface PrismSessionState {
  root: MidiNote;
  octave: number;
  activeColorIndex: ColorIndex;
  activeColor: RGB;

  chordSeq: MidiNote[][];
  stringSeq: DegreeChordName[];
  sequenceString: GraphKey;

  chosenChord: DegreeChordName;
  chordChoice: MidiNote[];

  rhythmChoice: string;
  swing: number;
  strum: StrumMode;
  strumAmount: number;
  tilt: VelocityTilt;
  tiltAmount: number;

  filterPercent: number;
}

/** Options for generating a chord MIDI track */
export interface ChordMidiOptions {
  chordSeq: MidiNote[][];
  stringSeq: DegreeChordName[];
  rhythmPattern: RhythmPattern;
  swing: number;
  strum: StrumMode;
  strumAmount: number;
  tilt: VelocityTilt;
  tiltAmount: number;
  channel: number;
}

/** Options for generating a melody MIDI track */
export interface MelodyMidiOptions {
  chordSeq: MidiNote[][];
  stringSeq: DegreeChordName[];
  root: MidiNote;
  rhythmPattern: RhythmPattern;
  swing: number;
  contourFilter?: string;
  channel: number;
}

// ── Phase 2: Expanded Instrument Dictionary ──

/** Instrument channel assignments for multi-track generation */
export enum InstrumentChannel {
  Chords = 1,
  Bass = 2,
  Pad = 3,
  Melody = 4,
  Drums = 10,
}

/** General MIDI drum note numbers */
export enum DrumNote {
  Kick = 36,
  SideStick = 37,
  Snare = 38,
  Clap = 39,
  HiHatClosed = 42,
  HiHatPedal = 44,
  HiHatOpen = 46,
  TomLow = 45,
  TomMid = 47,
  TomHigh = 50,
  RideCymbal = 51,
  Crash = 49,
  RideBell = 53,
  Cowbell = 56,
  Shaker = 70,
  Clave = 75,
}

/** A drum pattern with separate percussion element tracks (2-bar = 3840 ticks) */
export interface DrumPattern {
  kick: RhythmPattern;
  snare: RhythmPattern;
  hihat: RhythmPattern;
  ride?: RhythmPattern;
  crash?: RhythmPattern;
  tomHigh?: RhythmPattern;
  tomLow?: RhythmPattern;
}

/** A single bass hit: [startTick, durationTicks, scaleDegree (0-6 index into mode scale)] */
export type BassHit = [start: Tick, duration: Tick, scaleDegree: number];

/** A bass pattern is an array of bass hits with scale-degree info */
export type BassPattern = BassHit[];

/** Genre name for drum/bass groove lookup */
export type GenreName =
  | 'Pop'
  | 'Rock'
  | 'Hip Hop'
  | 'Jam Band'
  | 'Funk'
  | 'Neo Soul'
  | 'Jazz'
  | 'R&B'
  | 'Salsa'
  | 'Merengue'
  | 'Bossa'
  | 'Samba'
  | 'Ballad';

/** Configuration for multi-track orchestration */
export interface OrchestrateConfig {
  chordSeq: MidiNote[][];
  stringSeq: DegreeChordName[];
  root: MidiNote;
  rhythmName: string;
  swing: number;
  strum: StrumMode;
  strumAmount: number;
  tilt: VelocityTilt;
  tiltAmount: number;
  enableDrums: boolean;
  enableBass: boolean;
  enablePad: boolean;
  enableChords: boolean;
  enableMelody: boolean;
  contourFilter?: string;
}
