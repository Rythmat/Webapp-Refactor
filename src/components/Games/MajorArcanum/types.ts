// --- Global Type Extensions ---
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

// --- TypeScript Definitions for Web MIDI API ---
export interface MIDIOptions {
  sysex?: boolean;
  software?: boolean;
}

export interface MIDIInputMap extends Map<string, MIDIInput> {}

export interface MIDIAccess extends EventTarget {
  readonly inputs: MIDIInputMap;
  onstatechange: ((e: Event) => void) | null;
}

export interface MIDIPort extends EventTarget {
  id: string;
  manufacturer?: string;
  name?: string;
  type: 'input' | 'output';
  version?: string;
  state: 'connected' | 'disconnected';
  connection: 'open' | 'closed' | 'pending';
}

export interface MIDIInput extends MIDIPort {
  onmidimessage: ((event: MIDIMessageEvent) => void) | null;
}

export interface MIDIMessageEvent extends Event {
  data: Uint8Array;
}

export interface NavigatorWithMIDI {
  requestMIDIAccess?: (options?: MIDIOptions) => Promise<MIDIAccess>;
}

// --- Game Interfaces ---

export interface Note {
  time: number;
  midi: number;
  hit: boolean;
  missed: boolean;
  lost: boolean;
  completed: boolean;
  isChord: boolean;
  duration: number;
  isHolding: boolean;
  lastHoldScoreTime: number;
  lastParticleTime: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export interface KeyRoot {
  name: string;
  val: number;
}

export interface KeyGeometry {
  x: number;
  width: number;
  isBlack: boolean;
}

export interface GameState {
  isPlaying: boolean;
  isCountingIn: boolean;
  countInNumber: number;
  startTime: number;
  score: number;
  streak: number;
  maxStreak: number;
  multiplier: number;
  songDuration: number;
  currentScaleNotes: number[];
  currentKeyColor: string;
  keyRootVal: number;
  keyboardMapping: Record<string, number>;
  canvasWidth: number;
  canvasHeight: number;
  lastBeatScheduled: number;
  metronomeEnabled: boolean;
  gameMode: 'Melody' | 'Harmony';
  bpm: number;
  totalNotes: number;
  hits: number;
  misses: number;
  holdCompletions: number;
  holdAttempts: number;
  uiDirty: boolean;
  missFlashTime: number;
  isPaused: boolean;
  pauseStartTime: number;
  totalPausedDuration: number;
  difficulty: number;
}

export interface OscillatorEntry {
  osc: OscillatorNode;
  osc2: OscillatorNode;
  gain: GainNode;
}
