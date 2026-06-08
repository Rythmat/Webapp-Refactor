// ── Jam Session (local hand-off) ─────────────────────────────────────────
// A finalized jam recording, persisted to localStorage so a user can carry a
// jam from the (ephemeral) jam room into the studio — even across a reload —
// where it is imported as one MIDI track per participant.

const STORAGE_KEY = 'musicatlas:pending-jam-import';

/** A single recorded note, timed relative to the start of the session (ms). */
export interface JamSessionNote {
  userId: string;
  color: string;
  instrument: 'piano' | 'drums';
  gmProgram: number;
  midi: number;
  velocity: number;
  startMs: number;
  endMs: number;
}

export interface JamSessionParticipant {
  userId: string;
  userName: string;
  color: string;
}

export interface JamSession {
  version: 1;
  roomId: string | null;
  recordedAt: number;
  /** Tempo used to map note ms → ticks on import (the jam drum-machine BPM). */
  bpm: number;
  /** The recording user — only their own drum hits are imported. */
  localUserId: string;
  participants: JamSessionParticipant[];
  notes: JamSessionNote[];
}

export function saveJamSession(session: JamSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage full / unavailable — the in-jam toast will report failure.
  }
}

export function loadJamSession(): JamSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as JamSession;
    if (parsed?.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearJamSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
