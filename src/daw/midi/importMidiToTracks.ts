import type { MidiNoteEvent } from '@prism/engine';
import { useStore } from '@/daw/store';
import { withTransaction } from '@/daw/store/history';

// ── Import a MIDI file as tracks ───────────────────────────────────────────
//
// One import for the Project menu's Import MIDI… and the Add-track sheet's
// Import MIDI file…: each track of the file becomes a Synth track holding its
// notes, in one undo step, and the chord lane offers to read chords from
// them. The sheet's old Import card made an empty track with no instrument
// and opened no file (fx-mixer-24).

const OUR_PPQ = 480;

/** Ticks of a file at `sourcePpq` in the editor's 480 per quarter. */
export function rescaleTick(tick: number, sourcePpq: number): number {
  if (sourcePpq === OUR_PPQ) return tick;
  return Math.round((tick * OUR_PPQ) / sourcePpq);
}

/**
 * Adds a Synth track per track of the MIDI file in `data`, each with one
 * clip of its notes. Returns how many tracks it added (fewer than the file
 * has when the project's track limit stops it, which addTrack says).
 */
export async function importMidiToTracks(data: ArrayBuffer): Promise<number> {
  // The MIDI reader loads with the first import, not with the editor.
  const { importMidiFile } = await import('@/daw/midi/MidiFileIO');
  const sequences = importMidiFile(data);
  let added = 0;
  withTransaction('Import MIDI', () => {
    const state = useStore.getState();
    for (const seq of sequences) {
      const ppq = seq.ticksPerQuarterNote;
      // addTrack picks the colour from the track palette, and returns ''
      // (with a notice) at the project's track limit.
      const trackId = state.addTrack('midi', 'oracle-synth', seq.trackName);
      if (!trackId) break;
      const events: MidiNoteEvent[] = seq.events.map((ev: MidiNoteEvent) => ({
        ...ev,
        startTick: rescaleTick(ev.startTick, ppq),
        durationTicks: rescaleTick(ev.durationTicks, ppq),
      }));
      state.addMidiClip(trackId, {
        id: `clip-import-${crypto.randomUUID().slice(0, 8)}`,
        name: seq.trackName,
        startTick: 0,
        events,
      });
      added++;
    }
  });
  // Imported notes come without chord symbols: offer to analyze them.
  if (added > 0) useStore.getState().offerChordAnalysis();
  return added;
}

/**
 * Asks for a .mid file with the browser's file picker and imports it. Call
 * it from the click that asks, so the browser lets the picker open.
 */
export function pickAndImportMidi(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.mid,.midi';
  input.addEventListener(
    'change',
    () => {
      const file = input.files?.[0];
      if (file) void file.arrayBuffer().then(importMidiToTracks);
    },
    { once: true },
  );
  input.click();
}
