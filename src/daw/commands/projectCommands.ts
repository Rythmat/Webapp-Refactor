import { useStore } from '@/daw/store';
import { timeSignatureOf, toSongTick } from '@/daw/time/timeModel';
import type { MidiSequence } from '@prism/engine';

// ── File ▸ Export MIDI and File ▸ Analyze, from the menu and the keys ──────
//
// One command each, so ⌘E and ⇧⌘U do exactly what the menu items do (the key
// used to skip Analyze's chord step and number the tracks differently). The
// lead sheet's MusicXML and the sheets' printing are here too, so the Project
// menu and the views' own buttons share them and their done moments
// (doneMomentsSlice.ts).

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
    // Notes are clip time; the file is song time.
    const events = track.midiClips.flatMap((clip) =>
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
    ({ downloadMidiBlob, exportMidiFile }) => {
      downloadMidiBlob(
        exportMidiFile(sequences, state.bpm, metre),
        'prism-session.mid',
      );
      useStore.getState().markDone('exportMidi');
    },
  );
}

/**
 * Downloads the lead sheet's chords as MusicXML, from the Project menu and
 * the Lead Sheet's own button alike, in the project's metre with the bars
 * the sheet adds past its last chord. Nothing happens while the sheet has no
 * chords. The writer loads with the first export.
 */
export async function exportLeadSheetMusicXml(): Promise<void> {
  const state = useStore.getState();
  if (state.chordRegions.length === 0) return;
  const { downloadLeadSheet } = await import('@/daw/midi/MusicXmlExport');
  downloadLeadSheet(
    state.chordRegions,
    {
      title: state.projectName,
      bpm: state.bpm,
      rootNote: state.rootNote,
      mode: state.mode,
      // Written in the project's metre, not 4/4 (ia-flows-34).
      timeSignature: timeSignatureOf(state),
      extraBars: state.leadSheetBars,
    },
    `${state.projectName}.musicxml`,
  );
  useStore.getState().markDone('exportMusicXml');
}

/**
 * Opens the browser's print dialog for the Score or the Lead Sheet, whichever
 * is showing (each prints through leadsheet-print.css), and counts it as the
 * done moment a lesson's Print step watches for.
 */
export function printSheet(moment: 'printScore' | 'printLeadSheet'): void {
  useStore.getState().markDone(moment);
  window.print();
}

/** Analyzes the song and its chords, and opens the panel that shows them. */
export function analyzeProject(): void {
  const state = useStore.getState();
  state.analyzeSession();
  state.analyzeChords(state.chordAnalysis?.trackIds ?? null);
  state.setLibraryOpen(true);
}
