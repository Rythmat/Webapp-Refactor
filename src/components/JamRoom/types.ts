// ── Jam Room Types ────────────────────────────────────────────────────────
// Shared type definitions for the real-time Jam Room feature.

export type JamInstrument = 'piano' | 'drums';

export type DrumSound = 'kick' | 'snare' | 'hihat' | 'rim';

// --- Ephemeral messages sent over PartyKit WebSocket ---

export interface JamNoteOnMessage {
  type: 'jam:note';
  action: 'on';
  instrument: JamInstrument;
  /** Piano: MIDI note number (60 = C4). Drums: GM drum map number. */
  midi: number;
  /** 0-127 */
  velocity: number;
  /** GM program number (0-127) for SoundFont instrument selection. */
  gmProgram?: number;
  userId: string;
  color: string;
}

export interface JamNoteOffMessage {
  type: 'jam:note';
  action: 'off';
  instrument: JamInstrument;
  midi: number;
  velocity?: number;
  gmProgram?: number;
  userId: string;
  color: string;
}

export type JamNoteMessage = JamNoteOnMessage | JamNoteOffMessage;

export interface JamChatMessage {
  type: 'jam:chat';
  id: string;
  userId: string;
  userName: string;
  text: string;
  /** Unix ms timestamp. */
  timestamp: number;
}

export type JamMessage = JamNoteMessage | JamChatMessage;

/** Awareness state broadcast to all clients in the jam room. */
export interface JamPresence {
  userId: string;
  userName: string;
  avatarUrl: string;
  color: string;
  instrument: JamInstrument;
  /** GM program number for the player's current SoundFont instrument. */
  gmProgram: number;
  /** Currently held note MIDI numbers (for remote visualization). */
  activeNotes: number[];
  joinedAt: number;
}

// --- Piano range for Jam Room visualization ---

/** Lowest visible MIDI note (C2). */
export const JAM_PIANO_START = 36;
/** Highest visible MIDI note (B5). */
export const JAM_PIANO_END = 83;

// --- Drum MIDI mapping (General MIDI drum map subset) ---

export const DRUM_MIDI_MAP: Record<DrumSound, number> = {
  kick: 36,
  snare: 38,
  hihat: 42,
  rim: 37,
} as const;

export const MIDI_TO_DRUM: Partial<Record<number, DrumSound>> = {
  36: 'kick',
  38: 'snare',
  42: 'hihat',
  37: 'rim',
} as const;
