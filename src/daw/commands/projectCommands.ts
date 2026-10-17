import { useStore } from '@/daw/store';
import { toSongTick } from '@/daw/time/timeModel';
import type { MidiSequence } from '@prism/engine';

// ── File ▸ Export MIDI and File ▸ Analyze, from the menu and the keys ──────
//
// One command each, so ⇧⌘E and ⇧⌘U do exactly what the menu items do (the key
// used to skip Analyze's chord step and number the tracks differently).

const OUR_PPQ = 480;

/**
 * Downloads the project's MIDI tracks as one file, one MIDI track per
 * editor track that has notes, in song time (each clip's notes at its
 * place) and in the project's metre. Milestone 1.11 fills in the rest of
 * the content (tempo map, controllers). The project is read at once; the
 * MIDI writer loads with the first export, not with the editor (1.12a).
 */
export function exportProjectMidi(): Promise<void> {
  const state = useStore.getState();
  const sequences = new Map<number, MidiSequence>();
  for (let i = 0; i < state.tracks.length; i++) {
    const track = state.tracks[i];
    if (track.midiClips.length === 0) continue;
    // Notes are clip time; the file is song time. A muted clip (2.12) is
    // left out, as the audio export leaves it out: the file holds what plays.
    const events = track.midiClips
      .filter((clip) => !clip.muted)
      .flatMap((clip) =>
        clip.events.map((e) => ({
          ...e,
          startTick: toSongTick(clip, e.startTick),
        })),
      );
    if (events.length === 0) continue;
    sequences.set(i + 1, {
      ticksPerQuarterNote: OUR_PPQ,
      trackName: track.name,
      events,
    });
  }
  if (sequences.size === 0) return Promise.resolve();
  const metre: [number, number] = [
    state.timeSignatureNumerator,
    state.timeSignatureDenominator,
  ];
  return import('@/daw/midi/MidiFileIO').then(
    ({ downloadMidiBlob, exportMidiFile }) =>
      downloadMidiBlob(
        exportMidiFile(sequences, state.bpm, metre),
        'prism-session.mid',
      ),
  );
}

/** Analyzes the song and its chords, and opens the panel that shows them. */
export function analyzeProject(): void {
  const state = useStore.getState();
  state.analyzeSession();
  state.analyzeChords(state.chordAnalysis?.trackIds ?? null);
  state.setLibraryOpen(true);
}
