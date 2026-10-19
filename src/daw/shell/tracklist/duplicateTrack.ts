import {
  getAudioBuffer,
  getOriginalAudio,
  setAudioBuffer,
  setOriginalAudio,
  shareClipAudio,
} from '@/daw/audio/AudioBufferStore';
import { mintSamplerSampleId } from '@/daw/instruments/samplerChops';
import { mintNoteId } from '@/daw/model/noteIds';
import {
  getTrackSynthState,
  setTrackSynthState,
} from '@/daw/oracle-synth/synthTrackState';
import { notice } from '@/daw/shell/notice';
import { useStore } from '@/daw/store';
import { withTransaction } from '@/daw/store/history';
import { getTrackLimitMessage } from '@/daw/store/tracksSlice';
import { duplicateTrackEdit, type TrackMint } from '@/daw/time/trackEdits';

// ── Duplicate track (milestone 2.15) ───────────────────────────────────────
//
// What the track menu's Duplicate track, ⌘D on a track's row and the
// palette's command do: the copy (trackEdits.ts) goes in right after the
// track as one undo step, through the store's action, so a shared session
// gets it too. Its audio clips then play the source's audio, its Chops
// sample its own copy of it, and it gets its own copy of the source's Oracle
// synth patch. A collaborator holding
// the source doesn't stop it: the copy changes nothing of theirs.

/** Every new id a copy needs, in the shapes the store's own use. */
const mint: TrackMint = (kind) => {
  switch (kind) {
    case 'track':
      return crypto.randomUUID();
    case 'clip':
      return `clip-${crypto.randomUUID().slice(0, 8)}`;
    case 'note':
      return mintNoteId();
    case 'sample':
      return mintSamplerSampleId();
  }
};

/** A copy of `buffer` with its own samples, or null without Web Audio. */
function cloneBuffer(buffer: AudioBuffer): AudioBuffer | null {
  if (typeof AudioBuffer === 'undefined') return null;
  const copy = new AudioBuffer({
    length: buffer.length,
    numberOfChannels: buffer.numberOfChannels,
    sampleRate: buffer.sampleRate,
  });
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    copy.copyToChannel(buffer.getChannelData(c), c);
  }
  return copy;
}

/**
 * Gives the copy's Chops sample (key `to`) the audio of the source's (key
 * `from`). A sample in the cloud or bundled with the app plays the source's
 * asset, as a clip's copy does: it is saved by its assetId or URL already.
 * One not uploaded yet gets audio of its own (decoded and original bytes),
 * so Save uploads it for the copy and stamps the copy alone: on a shared
 * asset, the copy's stamp would move the source's asset to the copy's
 * upload (adoptAssetId). With no audio here yet, it shares what there is.
 */
function copySampleAudio(
  from: string,
  to: string,
  sample: { assetId: string | null; sourceUrl?: string },
): void {
  const buffer =
    sample.assetId || sample.sourceUrl ? undefined : getAudioBuffer(from);
  const own = buffer && cloneBuffer(buffer);
  if (!own) {
    shareClipAudio(from, to);
    return;
  }
  setAudioBuffer(to, own);
  const original = getOriginalAudio(from);
  if (original) {
    setOriginalAudio(to, original.bytes.slice(0), original.contentType);
  }
}

/**
 * Copies track `trackId` in right after it and selects the copy; the copy's
 * id, or '' when there is no such track or it can't be copied now (a take is
 * recording, or the project holds as many tracks of its kind as it may),
 * having said why. Focus is the caller's to move.
 */
export function duplicateTrack(trackId: string): string {
  const state = useStore.getState();
  const source = state.tracks.find((t) => t.id === trackId);
  if (!source) return '';
  if (state.isRecording) {
    notice({
      title: 'Not while recording',
      description: 'Stop recording to duplicate a track',
      variant: 'destructive',
    });
    return '';
  }
  const limit = getTrackLimitMessage(state.tracks, source.type);
  if (limit !== null) {
    notice({
      title: 'Track limit reached',
      description: limit,
      variant: 'destructive',
    });
    return '';
  }
  const made = duplicateTrackEdit(state, trackId, mint);
  if (!made) return '';
  const { edit, newTrackId, sampleAudio } = made;
  withTransaction('Duplicate track', () =>
    useStore.getState().applyArrangementPatch(edit.patch),
  );
  for (const { from, to } of edit.sharedAudio) shareClipAudio(from, to);
  if (sampleAudio && source.samplerSample) {
    copySampleAudio(sampleAudio.from, sampleAudio.to, source.samplerSample);
  }
  // The engine reads a track's patch when its instrument has loaded
  // (trackReconciler.ts), which is always after this: the load is
  // asynchronous. The copy is its own, so a change to one track's sound
  // never reaches the other. Like every patch edit, it isn't undone or
  // shared (milestone 1.13b): undo takes the track away and the entry is
  // left unused.
  const patch = getTrackSynthState(trackId);
  if (patch) setTrackSynthState(newTrackId, structuredClone(patch));
  useStore.getState().setSelectedTrackId(newTrackId);
  return newTrackId;
}
