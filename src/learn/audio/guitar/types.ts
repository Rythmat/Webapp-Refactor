// ── Guitar input and sound — shared types ─────────────────────────────────
// Contracts between the guitar input engine (mic / audio interface via the
// Studio guitar rig, or a MIDI guitar), the Learn input hook, the guitar
// voice and the lesson container. Implementations live beside this file.

/** Where the student's guitar comes in. */
export type GuitarInputSource = 'audio' | 'midi';

/**
 * A strummed chord as heard, from either source. Chords are judged by the
 * pitch classes heard (`pcs`), never by the name alone: the Studio detector
 * can name a correct 7th by its triad, and some chords share their notes
 * with another name (Am7 = C6).
 */
export interface GuitarChordEvent {
  phase: 'on' | 'change' | 'off';
  /** One per strum; a 'change' revises the strum with the same id. */
  strumId: number;
  rootPc: number;
  /**
   * A DETECTABLE_CHORD_QUALITIES key. A set that no chord names exactly takes
   * the nearest chord; with none near, rootPc is the bass and quality is ''.
   */
  quality: string;
  /** What was actually heard or held — score with these, not the name. */
  pcs: number[];
  confidence: number;
  /** performance.now() time of the strum's attack. */
  onsetPerfMs: number;
  /** 'off' only: when the chord stopped sounding. */
  offsetPerfMs?: number;
  source: GuitarInputSource;
  /** MIDI only: the held notes, ascending. */
  midis?: number[];
  /** Audio only: the normalised chroma the identity came from. */
  chroma?: Float64Array | null;
  /** Audio only: an attack was heard but no chord could be named. */
  unclear?: boolean;
}

/** Which detector a step listens with; 'off' outside practice/performance. */
export type GuitarEvaluationMode = 'off' | 'notes' | 'chords';

/** How lesson guitar sounds: the Studio amp rig, or a dry acoustic guitar. */
export type GuitarTone = 'amp' | 'acoustic';

export interface GuitarTonePrefs {
  tone: GuitarTone;
  /** A Studio NAM model id (NamModelStore BUNDLED_MODELS, guitar). */
  ampModelId: string;
}

export interface GuitarInputPrefs {
  source: GuitarInputSource;
  /** Audio input device; null = the default input. */
  deviceId: string | null;
  /** Input channel on a multi-channel interface (0-based). */
  channel: number;
  trimDb: number;
  /** RMS below which the input counts as silence (from calibration). */
  gateRms: number;
  /** Measured input delay subtracted from audio onsets. */
  inputLatencyMs: number;
  /** The setup check heard the app's own sound through the mic. */
  bleedDetected: boolean;
  /** Play the student's guitar back through the amp (headphones!). */
  monitorThroughAmp: boolean;
  setupCompletedAt?: number;
}

/**
 * The Studio guitar rig as Learn uses it: live input with browser processing
 * off, channel select, the Studio pedal chain and NAM amps, the chord
 * analyser AudioChordDetector reads, and the clean pre-amp tap Studio's
 * Guitar-to-MIDI uses. Implemented over GuitarFxAdapter by GuitarAmpRig.
 */
export interface GuitarInputRig {
  readonly context: AudioContext;
  /** Open an input device (needs a user gesture the first time). */
  setDevice(deviceId: string | null, channelCount?: number): Promise<void>;
  setChannel(channel: number): void;
  /** Input trim in dB, before everything that listens (setup's level step). */
  setInputTrim(db: number): void;
  /** Hear the live guitar through the amp. */
  setMonitoring(enabled: boolean): void;
  /** 16384-point analyser on the clean input (AudioChordDetector). */
  getChordAnalyserNode(): AnalyserNode | null;
  /** Clean pre-amp signal for pitch detection (NodeTapCapture). */
  getPitchDetectSourceNode(): AudioNode | null;
  /** RMS level of the live input, 0-1. */
  getInputLevel(): number;
  /** Where lesson playback enters the amp (the string voice connects here). */
  getPlaybackInputNode(): AudioNode | null;
  /** Switch the amp model; null bypasses the amp. */
  setAmpModel(modelId: string | null): Promise<void>;
  dispose(): void;
}

export type GuitarInputStatus =
  | 'idle'
  | 'needs-setup'
  | 'requesting-permission'
  | 'listening'
  | 'denied'
  | 'no-device'
  | 'error';

/** The guitar side of the Learn input hook (null for piano). */
export interface GuitarInputHandle {
  status: GuitarInputStatus;
  prefs: GuitarInputPrefs;
  /** Live input level 0-1 for meters (~15 Hz). */
  level: number;
  error: string | null;
  /**
   * Start listening. Call only from a user gesture (setup, first Practice or
   * Play): it may ask for the microphone. Never called on mount.
   */
  enable(): Promise<void>;
  /** Apply new prefs, restarting the input if needed, and save them. */
  restart(prefs: Partial<GuitarInputPrefs>): Promise<void>;
  setEvaluationMode(mode: GuitarEvaluationMode): void;
  /** Ignore input while the app itself is sounding (demo, guide bleed). */
  setSuppressed(suppressed: boolean): void;
  setExpectedNotes(midis: number[] | null): void;
  setKeyContext(rootPc: number, modeIntervals: number[]): void;
  /** Measure the room for `ms` and set the gate; resolves to the new gate. */
  calibrateGate(ms?: number): Promise<number>;
  getTunerAnalyser(): AnalyserNode | null;
  getLastChroma(): Float64Array | null;
  getRig(): GuitarInputRig | null;
}
