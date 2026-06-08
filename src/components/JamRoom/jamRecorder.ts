// ── Jam Recorder ─────────────────────────────────────────────────────────
// A module-level singleton that buffers every note the local client hears
// during a jam — its own (via JamRoomProvider.sendNote) and remote players'
// (via the incoming jam:note handler) — keyed by user, with timing relative to
// the first note. `finalize()` snapshots it into a serializable JamSession.
//
// It is a plain module (not a React store) so it survives the provider
// lifecycle and is callable from non-React code paths.

import type {
  JamSession,
  JamSessionNote,
  JamSessionParticipant,
} from '@/daw/jam-import/jamSession';

/** Fixed duration for one-shot drum hits (they have no note-off). */
const DRUM_DURATION_MS = 120;

interface OpenNote {
  userId: string;
  color: string;
  gmProgram: number;
  midi: number;
  velocity: number;
  startMs: number;
}

export interface RecordableNote {
  action: 'on' | 'off';
  userId: string;
  color: string;
  instrument: 'piano' | 'drums';
  gmProgram?: number;
  midi: number;
  velocity?: number;
}

let armed = false;
let t0: number | null = null;
const openNotes = new Map<string, OpenNote>();
let notes: JamSessionNote[] = [];

/** Elapsed ms since the first recorded note (anchors the timeline at 0). */
function elapsed(): number {
  const now = performance.now();
  if (t0 === null) t0 = now;
  return now - t0;
}

export const jamRecorder = {
  /** Arm a fresh recording (called when joining a room). */
  start(): void {
    armed = true;
    t0 = null;
    openNotes.clear();
    notes = [];
  },

  /** Disarm and discard the buffer (called on leave/teardown). */
  reset(): void {
    armed = false;
    t0 = null;
    openNotes.clear();
    notes = [];
  },

  hasRecording(): boolean {
    return notes.length > 0 || openNotes.size > 0;
  },

  record(ev: RecordableNote): void {
    if (!armed) return;
    const t = elapsed();

    // Drums are one-shot: there is no note-off, so record the hit immediately
    // with a fixed short duration.
    if (ev.instrument === 'drums') {
      if (ev.action !== 'on') return;
      notes.push({
        userId: ev.userId,
        color: ev.color,
        instrument: 'drums',
        gmProgram: ev.gmProgram ?? 0,
        midi: ev.midi,
        velocity: ev.velocity ?? 100,
        startMs: t,
        endMs: t + DRUM_DURATION_MS,
      });
      return;
    }

    const key = `${ev.userId}:${ev.midi}`;
    if (ev.action === 'on') {
      openNotes.set(key, {
        userId: ev.userId,
        color: ev.color,
        gmProgram: ev.gmProgram ?? 0,
        midi: ev.midi,
        velocity: ev.velocity ?? 100,
        startMs: t,
      });
    } else {
      const open = openNotes.get(key);
      if (open) {
        notes.push({ ...open, instrument: 'piano', endMs: t });
        openNotes.delete(key);
      }
    }
  },

  /** Snapshot the recording into a serializable session. */
  finalize(meta: {
    roomId: string | null;
    bpm: number;
    localUserId: string;
    participants: JamSessionParticipant[];
  }): JamSession {
    // Close any still-held notes at the current time.
    const t = t0 === null ? 0 : performance.now() - t0;
    for (const open of openNotes.values()) {
      notes.push({ ...open, instrument: 'piano', endMs: t });
    }
    openNotes.clear();

    return {
      version: 1,
      roomId: meta.roomId,
      recordedAt: Date.now(),
      bpm: meta.bpm,
      localUserId: meta.localUserId,
      participants: meta.participants,
      notes: [...notes],
    };
  },
};
