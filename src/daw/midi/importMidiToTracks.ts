import type { MidiCCEvent, MidiNoteEvent } from '@prism/engine';
import { notice } from '@/daw/shell/notice';
import { useStore } from '@/daw/store';
import { withTransaction } from '@/daw/store/history';
import { getTrackLimitMessage } from '@/daw/store/tracksSlice';

// ── Import a MIDI file as tracks ───────────────────────────────────────────
//
// One import for the Project menu's Import MIDI…, the Add-track sheet's
// Import MIDI file… and a file dropped on the timeline: each part of the file
// becomes a track holding its notes (and its sustain pedal), in one undo
// step, and the chord lane offers to read chords from them. A drum part
// (channel 10) becomes a drum-machine track, which plays General MIDI drum
// notes; the other parts are Synth tracks. The sheet's old Import card made
// an empty track with no instrument and opened no file (fx-mixer-24).
//
// Tempo and metre (engine-hooks-30): into a project with no clips yet, the
// file's tempo and metre become the project's; into a song already begun,
// the project keeps its own and the notice says what the file's were.
// The track limit (shell-26) is checked before each part, so a file with
// more parts than fit imports the first ones and one notice says how many
// were left out.

const OUR_PPQ = 480;

/** Ticks of a file at `sourcePpq` in the editor's 480 per quarter. */
export function rescaleTick(tick: number, sourcePpq: number): number {
  if (sourcePpq === OUR_PPQ) return tick;
  return Math.round((tick * OUR_PPQ) / sourcePpq);
}

/** A tempo as the project shows it: whole, or to a hundredth. */
const roundBpm = (bpm: number) => Math.round(bpm * 100) / 100;

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * Adds a track per part of the MIDI file in `data`, each with one clip of
 * its notes, and says in one notice what it did with the file's tempo and
 * any parts the track limit left out. Returns how many tracks it added.
 * Throws when `data` isn't a MIDI file (importMidiFileOrSay catches it).
 */
export async function importMidiToTracks(data: ArrayBuffer): Promise<number> {
  // The MIDI reader loads with the first import, not with the editor.
  const { readMidiFile } = await import('@/daw/midi/MidiFileIO');
  const file = readMidiFile(data);
  if (file.parts.length === 0) {
    notice({ title: 'That MIDI file has no notes to import' });
    return 0;
  }

  const before = useStore.getState();
  // A project with no clip anywhere hasn't been begun: it takes the file's
  // tempo and metre. Empty tracks don't count as a beginning.
  // Sections count as a beginning too: they were laid out in the metre.
  const fresh =
    before.sections.length === 0 &&
    before.tracks.every(
      (t) => t.midiClips.length === 0 && t.audioClips.length === 0,
    );
  const fileBpm = file.bpm === null ? null : roundBpm(file.bpm);
  const fileMetre = file.timeSignature;

  let added = 0;
  // Set in the transaction when the limit stops the import.
  const limit: { message: string | null } = { message: null };
  withTransaction('Import MIDI', () => {
    const state = useStore.getState();
    for (const part of file.parts) {
      // Checked here rather than left to addTrack, which would say it
      // once and leave the rest unsaid.
      limit.message = getTrackLimitMessage(useStore.getState().tracks, 'midi');
      if (limit.message) break;
      const seq = part.sequence;
      const ppq = seq.ticksPerQuarterNote;
      const trackId = state.addTrack(
        'midi',
        part.percussion ? 'drum-machine' : 'oracle-synth',
        seq.trackName,
      );
      if (!trackId) break;
      const events: MidiNoteEvent[] = seq.events.map((ev: MidiNoteEvent) => ({
        ...ev,
        startTick: rescaleTick(ev.startTick, ppq),
        durationTicks: rescaleTick(ev.durationTicks, ppq),
      }));
      const ccEvents: MidiCCEvent[] | undefined = seq.ccEvents?.map((cc) => ({
        ...cc,
        tick: rescaleTick(cc.tick, ppq),
      }));
      state.addMidiClip(trackId, {
        id: `clip-import-${crypto.randomUUID().slice(0, 8)}`,
        name: seq.trackName,
        startTick: 0,
        events,
        ...(ccEvents ? { ccEvents } : {}),
      });
      added++;
    }
    // Only when something came in: a full project keeps its tempo.
    if (fresh && added > 0) {
      if (fileBpm !== null) state.setBpm(fileBpm);
      if (fileMetre) state.setTimeSignature(fileMetre[0], fileMetre[1]);
    }
  });

  // One notice for what the student may not expect.
  const lines: string[] = [];
  const after = useStore.getState();
  if (fresh && added > 0 && (fileBpm !== null || fileMetre)) {
    lines.push(
      `The project now uses the file's ${after.bpm} BPM in ${after.timeSignatureNumerator}/${after.timeSignatureDenominator}.`,
    );
  } else if (!fresh) {
    const differs =
      (fileBpm !== null && fileBpm !== before.bpm) ||
      (fileMetre !== null &&
        (fileMetre[0] !== before.timeSignatureNumerator ||
          fileMetre[1] !== before.timeSignatureDenominator));
    if (differs) {
      const was = [
        fileBpm !== null ? `${fileBpm} BPM` : null,
        fileMetre ? `${fileMetre[0]}/${fileMetre[1]}` : null,
      ]
        .filter(Boolean)
        .join(' in ');
      lines.push(
        `The project keeps its ${before.bpm} BPM in ${before.timeSignatureNumerator}/${before.timeSignatureDenominator}; the file was in ${was}.`,
      );
    }
  }
  const skipped = file.parts.length - added;
  if (skipped > 0) {
    lines.push(
      `${plural(skipped, 'part')} of ${file.parts.length} weren't imported. ${limit.message ?? ''}`.trim(),
    );
  }
  if (lines.length > 0) {
    notice({
      title: `Imported ${plural(added, 'track')} from the MIDI file`,
      description: lines.join(' '),
      ...(skipped > 0 ? { variant: 'destructive' as const } : {}),
    });
  }

  // Imported notes come without chord symbols: offer to analyze them.
  if (added > 0) useStore.getState().offerChordAnalysis();
  return added;
}

/**
 * importMidiToTracks for a file the student chose, saying so in a notice
 * when the file can't be read (shell-26) instead of failing unheard.
 * Resolves to how many tracks were added (0 for a bad file).
 */
export async function importMidiFileOrSay(file: File): Promise<number> {
  try {
    return await importMidiToTracks(await file.arrayBuffer());
  } catch (err) {
    console.warn('[import] MIDI file could not be read', err);
    notice({
      title: 'That MIDI file couldn’t be read',
      description: file.name,
      variant: 'destructive',
    });
    return 0;
  }
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
      if (file) void importMidiFileOrSay(file);
    },
    { once: true },
  );
  input.click();
}
