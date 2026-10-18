import type { MidiChannelSequence } from '@/daw/midi/MidiFileIO';
import { isDrumTrack } from '@/daw/shell/canvas/clipMenu/clipActions';
import { useStore, type AllSlices } from '@/daw/store';
import { toSongTick } from '@/daw/time/timeModel';
import { downloadFile, fileSlug, songSlug } from '@/daw/utils/exportFiles';

// ── File ▸ Export MIDI and File ▸ Analyze, from the menu and the keys ──────
//
// One command each, so ⇧⌘E and ⇧⌘U do exactly what the menu items do (the key
// used to skip Analyze's chord step and number the tracks differently).

const OUR_PPQ = 480;

/** General MIDI's drum channel (1-based, as the MIDI writer numbers them). */
export const MIDI_DRUM_CHANNEL = 10;

/** The channels the other tracks take in turn: 1–16 without the drums'. */
const MELODIC_CHANNELS = Array.from({ length: 16 }, (_, i) => i + 1).filter(
  (channel) => channel !== MIDI_DRUM_CHANNEL,
);

export type ProjectMidiState = Pick<
  AllSlices,
  | 'tracks'
  | 'projectName'
  | 'bpm'
  | 'timeSignatureNumerator'
  | 'timeSignatureDenominator'
>;

export interface ProjectMidiOptions {
  /** Only these tracks (in the project's order); every track without it. */
  trackIds?: readonly string[];
}

/** What a MIDI export writes, before the writer is loaded. */
export interface ProjectMidiPlan {
  tracks: MidiChannelSequence[];
  filename: string;
  bpm: number;
  timeSignature: [number, number];
}

/**
 * The MIDI file's content, worked out from `state` alone: one MIDI track per
 * editor track that has notes (in `trackIds` when given), in song time (each
 * clip's notes at its place) and in the project's metre. Null when no track
 * would be written, so a caller can tell "nothing to export" without loading
 * the writer.
 *
 * Channels: a drum track (a drum machine, or a track whose role is drums:
 * clipActions' isDrumTrack, the rule the Score uses for a percussion staff)
 * plays on channel 10, where every General MIDI player has its kit. The
 * other tracks take 1, 2, … 16 in turn, skipping 10, and wrap after 16: with
 * more than fifteen of them two tracks share a channel (each keeps its own
 * MIDI track; they would only share a program in a GM player). Tracks that
 * write nothing don't use up a channel.
 *
 * Name: the song's slug ('my-song.mid'); one track's export adds the
 * track's ('my-song-bass.mid').
 */
export function planProjectMidi(
  state: ProjectMidiState,
  opts: ProjectMidiOptions = {},
): ProjectMidiPlan | null {
  const only = opts.trackIds ? new Set(opts.trackIds) : null;
  const tracks: MidiChannelSequence[] = [];
  let melodic = 0;
  for (const track of state.tracks) {
    if (only && !only.has(track.id)) continue;
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
    const channel = isDrumTrack(track)
      ? MIDI_DRUM_CHANNEL
      : MELODIC_CHANNELS[melodic++ % MELODIC_CHANNELS.length];
    tracks.push({
      channel,
      sequence: {
        ticksPerQuarterNote: OUR_PPQ,
        trackName: track.name,
        events,
      },
    });
  }
  if (tracks.length === 0) return null;

  const song = songSlug(state.projectName);
  const one =
    opts.trackIds?.length === 1
      ? state.tracks.find((t) => t.id === opts.trackIds![0])
      : undefined;
  return {
    tracks,
    filename: one
      ? `${song}-${fileSlug(one.name, 'track')}.mid`
      : `${song}.mid`,
    bpm: state.bpm,
    timeSignature: [
      state.timeSignatureNumerator,
      state.timeSignatureDenominator,
    ],
  };
}

/**
 * The MIDI file for `state` (see planProjectMidi), or null when nothing
 * would be written. Async because the MIDI writer loads with the first
 * export, not with the editor (1.12a); the state is read at once, before
 * the import, so a later edit doesn't reach the file.
 */
export async function buildProjectMidi(
  state: ProjectMidiState,
  opts: ProjectMidiOptions = {},
): Promise<{ blob: Blob; filename: string } | null> {
  const plan = planProjectMidi(state, opts);
  if (!plan) return null;
  const { exportMidiFile } = await import('@/daw/midi/MidiFileIO');
  return {
    blob: exportMidiFile(plan.tracks, plan.bpm, plan.timeSignature),
    filename: plan.filename,
  };
}

/**
 * Downloads the project's MIDI tracks as one file (⇧⌘E, Project ▾ MIDI, the
 * Export dialog's Notation tab). Resolves to whether a file was written:
 * false when no track (of `trackIds`) has a note that plays.
 */
export async function exportProjectMidi(
  opts: ProjectMidiOptions = {},
): Promise<boolean> {
  const file = await buildProjectMidi(useStore.getState(), opts);
  if (!file) return false;
  downloadFile(file.blob, file.filename);
  return true;
}

/** Analyzes the song and its chords, and opens the panel that shows them. */
export function analyzeProject(): void {
  const state = useStore.getState();
  state.analyzeSession();
  state.analyzeChords(state.chordAnalysis?.trackIds ?? null);
  state.setLibraryOpen(true);
}
