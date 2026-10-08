// ── Import Jam Session ───────────────────────────────────────────────────
// Converts a finalized jam recording (from localStorage) into a new studio
// project: one MIDI (SoundFont) track per participant who played piano, plus a
// single drum-machine track from the importing user's own drum hits. Note
// timing is mapped ms → ticks at the jam's drum-machine BPM, with note starts
// quantized to a 1/16 grid, and the project takes that tempo.

import type { MidiNoteEvent } from '@prism/engine';
import { resetProjectState } from '@/daw/persistence/projectDocument/initialState';
import { markDocumentBaseline } from '@/daw/persistence/saveStatusStore';
import { useStore } from '@/daw/store';
import type { MidiClip } from '@/daw/store/tracksSlice';
import { resetUndoHistory } from '@/daw/store/undoMiddleware';
import { GM_PROGRAMS } from '@/daw/instruments/gmPrograms';
import {
  loadJamSession,
  clearJamSession,
  type JamSessionNote,
} from './jamSession';

const PPQ = 480;
const GRID_TICKS = PPQ / 4; // 1/16 note
const MIN_DURATION_TICKS = PPQ / 8; // 1/32 note floor

/**
 * Open the pending jam session (if any) as a new studio project, at the jam's
 * tempo, with per-participant MIDI tracks. Consumes the saved session once it
 * is in the project. Returns the number of tracks created; with no jam
 * waiting, the project is left as it is and this returns 0.
 */
export function importPendingJamSession(): number {
  const session = loadJamSession();
  if (!session || session.notes.length === 0) {
    // Nothing to open: an empty or unreadable hand-off is dropped.
    clearJamSession();
    return 0;
  }

  const bpm = session.bpm > 0 ? session.bpm : 120;
  const ticksPerMs = (PPQ * bpm) / 60000;
  const quantize = (tick: number) =>
    Math.max(0, Math.round(tick / GRID_TICKS) * GRID_TICKS);

  const nameFor = (userId: string): { userName: string; color: string } => {
    const p = session.participants.find((x) => x.userId === userId);
    return {
      userName: p?.userName || 'Player',
      color: p?.color || '#8b5cf6',
    };
  };

  const buildEvents = (
    groupNotes: JamSessionNote[],
  ): { events: MidiNoteEvent[]; lengthTicks: number } => {
    let lengthTicks = 0;
    const events = groupNotes.map((n) => {
      const startTick = quantize(n.startMs * ticksPerMs);
      const durationTicks = Math.max(
        MIN_DURATION_TICKS,
        Math.round((n.endMs - n.startMs) * ticksPerMs),
      );
      lengthTicks = Math.max(lengthTicks, startTick + durationTicks);
      return {
        note: n.midi,
        velocity: n.velocity,
        startTick,
        durationTicks,
        channel: 0,
      } as MidiNoteEvent;
    });
    return { events, lengthTicks };
  };

  // A new project at the jam's tempo, never the one before with the jam
  // added. The ticks above count that tempo, so the notes play back as they
  // were played and sit on the project's grid.
  resetProjectState('jam');
  const store = useStore.getState();
  store.setBpm(bpm);
  let created = 0;

  // ── Melodic: one SoundFont track per (participant × GM instrument) ──
  // Grouping by the sound, not just the player, preserves every distinct
  // instrument each user played — including when they switched sounds mid-jam,
  // which a single per-player track (carrying only the first note's program)
  // would silently collapse to one voice. Map keeps first-seen order.
  const byUserInstrument = new Map<string, JamSessionNote[]>();
  for (const n of session.notes) {
    if (n.instrument !== 'piano') continue;
    const key = `${n.userId}::${n.gmProgram}`;
    const list = byUserInstrument.get(key);
    if (list) list.push(n);
    else byUserInstrument.set(key, [n]);
  }

  for (const groupNotes of byUserInstrument.values()) {
    const { userId, gmProgram } = groupNotes[0];
    const { userName, color } = nameFor(userId);
    const soundName = GM_PROGRAMS.find((p) => p.number === gmProgram)?.name;
    const trackName = soundName
      ? `${userName} — ${soundName} (Jam)`
      : `${userName} (Jam)`;
    const trackId = store.addTrack('midi', 'soundfont', trackName, color);
    if (!trackId) continue; // track cap reached (addTrack toasts)
    // Carry the player's GM sound across so the studio track sounds like the jam.
    store.updateTrack(trackId, { gmProgram });
    const { events, lengthTicks } = buildEvents(groupNotes);
    const clip: MidiClip = {
      id: crypto.randomUUID(),
      name: 'Jam',
      startTick: 0,
      durationTicks: lengthTicks,
      events,
    };
    store.addMidiClip(trackId, clip);
    created += 1;
  }

  // ── Drums: the rack is now shared room-wide (one sequencer everyone hears),
  // so import every player's hits into a single drum-machine track. The old
  // local-only filter dropped the whole beat whenever someone else drove the
  // shared sequencer (the hits are attributed to whoever pressed play). Hits
  // are deduped by (step, sound) so a beat driven — or network-echoed — by more
  // than one player at the same instant isn't doubled.
  const drumNotes = session.notes.filter((n) => n.instrument === 'drums');
  if (drumNotes.length > 0) {
    const { color } = nameFor(session.localUserId);
    const trackId = store.addTrack('midi', 'drum-machine', 'Jam Drums', color);
    if (trackId) {
      const { events } = buildEvents(drumNotes);
      const seen = new Set<string>();
      const deduped: MidiNoteEvent[] = [];
      let lengthTicks = 0;
      for (const ev of events) {
        const key = `${ev.startTick}:${ev.note}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(ev);
        lengthTicks = Math.max(lengthTicks, ev.startTick + ev.durationTicks);
      }
      const clip: MidiClip = {
        id: crypto.randomUUID(),
        name: 'Jam Drums',
        startTick: 0,
        durationTicks: lengthTicks,
        events: deduped,
      };
      store.addMidiClip(trackId, clip);
      created += 1;
    }
  }

  // The recording is in the project now. Consumed only here, so an import
  // that fails leaves the jam to open again.
  clearJamSession();
  // The import is no edit to undo. The jam room is gone, so the project is
  // the only copy of the jam: it stays work to keep, even untouched, until
  // it is saved (savedComplete false).
  resetUndoHistory();
  markDocumentBaseline({ savedComplete: false });
  return created;
}
