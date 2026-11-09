import { setAudioBuffer, setOriginalAudio } from '@/daw/audio/AudioBufferStore';
import { saveLibraryAudio } from '@/daw/library/audioLibrary';
import { importMidiFileOrSay } from '@/daw/midi/importMidiToTracks';
import { notice } from '@/daw/shell/notice';
import { useStore } from '@/daw/store';
import { withTransaction } from '@/daw/store/history';
import { PPQ } from '@/daw/time/timeModel';
import { getDecodeContext } from '@/lib/studio-assets/load-audio';
import { choiceOf } from './trackTemplates';

// ── + Add track › Upload ───────────────────────────────────────────────────
//
// One file from the browser's picker. A .mid file becomes a Synth track per
// track of the file, as Import MIDI file… did. An audio file (WAV, MP3, M4A,
// FLAC, OGG) becomes a new Audio Track with the file as one clip at bar 1,
// named after the file, in one undo step. Its bytes stay in memory as a
// pending clip (no assetId), as a take does before it uploads: the draft
// keeps a copy (pendingMedia) and Save uploads it (upload-pending).
//
// The caps are this build's until the owner sets S6's (where uploads are
// stored, and for how long). Each audio file uploaded is also kept in the
// Studio Library's Uploads (daw/library/audioLibrary), apart from the song.

/** The largest audio file Upload takes. */
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
/** The longest audio file Upload takes, in seconds. */
export const MAX_UPLOAD_SECONDS = 15 * 60;

/** What the picker offers: the audio files a browser decodes, and MIDI. */
export const UPLOAD_ACCEPT =
  'audio/*,.wav,.mp3,.m4a,.aac,.flac,.ogg,.oga,.opus,.webm,.mid,.midi';

const isMidi = (file: File) =>
  /\.midi?$/i.test(file.name) ||
  file.type === 'audio/midi' ||
  file.type === 'audio/x-midi';

/** The file's name without its extension: the new track's and clip's name. */
const baseName = (file: File) =>
  file.name.replace(/\.[^.]+$/, '').trim() || 'Upload';

function refuse(title: string, description: string): string {
  notice({ title, description, variant: 'destructive' });
  return '';
}

/**
 * Adds `file` to the song: a MIDI file's tracks, or a new Audio Track
 * holding an audio file. Resolves to the new audio track's id, '' for a
 * MIDI file or one that could not be added (having said why).
 */
export async function uploadFileToNewTrack(file: File): Promise<string> {
  if (isMidi(file)) {
    await importMidiFileOrSay(file);
    return '';
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return refuse(
      'That file is too big',
      `Upload audio up to ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`,
    );
  }

  const bytes = await file.arrayBuffer();
  let buffer: AudioBuffer;
  try {
    // decodeAudioData detaches its input: keep the bytes for the upload.
    buffer = await getDecodeContext().decodeAudioData(bytes.slice(0));
  } catch (err) {
    console.warn('[upload] audio file could not be decoded', err);
    return refuse('That file couldn’t be read', file.name);
  }
  if (buffer.duration > MAX_UPLOAD_SECONDS) {
    return refuse(
      'That file is too long',
      `Upload audio up to ${MAX_UPLOAD_SECONDS / 60} minutes long.`,
    );
  }

  const name = baseName(file);
  const trackId = addAudioTrack({
    name,
    bytes,
    contentType: file.type || 'application/octet-stream',
    buffer,
    startTick: 0,
    undoLabel: 'Upload audio',
  });
  if (trackId) {
    const s = useStore.getState();
    void saveLibraryAudio({
      kind: 'upload',
      name,
      tag: fileTypeLabel(file),
      project: s.projectName,
      color: s.tracks.find((t) => t.id === trackId)?.color ?? '',
      contentType: file.type || 'application/octet-stream',
      size: file.size,
      durationSec: buffer.duration,
      blob: file,
    });
  }
  return trackId;
}

/** An upload's file type for its Library row: 'WAV', 'MP3'. */
const fileTypeLabel = (file: File) =>
  file.name.match(/\.([^.]+)$/)?.[1]?.toUpperCase() ?? 'Audio';

export interface NewAudioTrack {
  /** The track's name. */
  name: string;
  /** The audio's original bytes (kept for the draft and Save). */
  bytes: ArrayBuffer;
  contentType: string;
  buffer: AudioBuffer;
  /** Where the clip starts. */
  startTick: number;
  undoLabel: string;
}

/**
 * A new Audio Track holding `buffer` as one clip at `startTick`, in one undo
 * step, selected, with its dock on its effects: what an upload and a Library
 * stem or upload become. Resolves to its id, '' when it could not be added
 * (having said why).
 */
export function addAudioTrack(audioIn: NewAudioTrack): string {
  const state = useStore.getState();
  if (state.isRecording) {
    return refuse('Not while recording', 'Stop recording to add audio');
  }
  const audio = choiceOf('audio');
  const clipId = `clip-audio-${crypto.randomUUID().slice(0, 8)}`;
  const duration = Math.max(
    1,
    Math.round((audioIn.buffer.duration / 60) * state.bpm * PPQ),
  );

  const trackId = withTransaction(audioIn.undoLabel, () => {
    const s = useStore.getState();
    // A plain audio track: the file plays through its effects, with no live
    // input (an Add Audio track's tuner and input aren't an upload's;
    // owner, 2026-10-22). Its dock is its effects.
    const id = s.addTrack(audio.trackType, 'none', audioIn.name);
    if (!id) return '';
    // The clip's audio is in the store before the clip, so it plays (and
    // the draft captures it) from the moment it appears.
    setAudioBuffer(clipId, audioIn.buffer);
    setOriginalAudio(clipId, audioIn.bytes, audioIn.contentType);
    s.addAudioClip(id, {
      id: clipId,
      startTick: audioIn.startTick,
      duration,
      fadeInTicks: 0,
      fadeOutTicks: 0,
      assetId: null,
    });
    return id;
  });
  if (!trackId) return '';
  const s = useStore.getState();
  s.setSelectedTrackId(trackId);
  if (s.activeTutorialId === null) s.setChannelStripTab(audio.dockTab);
  return trackId;
}

/**
 * Asks for one audio or MIDI file with the browser's file picker and adds
 * it. Call it from the click that asks, so the browser lets the picker open.
 */
export function pickAndUploadTrack(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = UPLOAD_ACCEPT;
  input.addEventListener(
    'change',
    () => {
      const file = input.files?.[0];
      if (file) void uploadFileToNewTrack(file);
    },
    { once: true },
  );
  input.click();
}
