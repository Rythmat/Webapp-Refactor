import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@/daw/store';
import type { AudioClip } from '@/daw/store/tracksSlice';
import { setAudioBuffer, setOriginalAudio } from '@/daw/audio/AudioBufferStore';
import { uploadAndFinalizeAsset } from '@/lib/studio-assets/api';
import {
  uploadPendingAudioClips,
  uploadRecordedClip,
} from '@/lib/studio-assets/upload-pending';
import { splitAudioClipAt } from '../splitAudioClipAt';

// ── Splitting a take whose audio isn't uploaded yet ────────────────────────
// Split halves (and record-over remainders) play their recording through the
// same decoded buffer, under their own clip ids. The upload code stamps the
// asset on every clip playing the uploaded buffer, and uploads a shared
// buffer once (src/lib/studio-assets/upload-pending.ts):
//   - a take split while its upload (started when recording stops) is in
//     flight gets the asset on both halves, so neither is lost on a refresh
//     before the next Save;
//   - Save uploads the recording once, not once per half.

vi.mock('@/lib/studio-assets/api', () => ({
  uploadAndFinalizeAsset: vi.fn(),
  studioAssetsApi: {},
}));
vi.mock('@/lib/studio-projects/api', () => ({
  ensureProjectId: async () => 'project-1',
}));

type Asset = Awaited<ReturnType<typeof uploadAndFinalizeAsset>>;

const SEC = 960; // ticks per second at 120 bpm
const upload = vi.mocked(uploadAndFinalizeAsset);

const take: AudioClip = {
  id: 'take',
  startTick: 2 * SEC,
  duration: 6 * SEC,
  fadeInTicks: 0,
  fadeOutTicks: 0,
  assetId: null,
};

let trackId = '';
const assetIds = () =>
  useStore
    .getState()
    .tracks.find((t) => t.id === trackId)!
    .audioClips.map((c) => c.assetId);

/** Record-stop's upload of the take, split at 5 s before it finishes. */
async function splitDuringUpload(): Promise<void> {
  let finish: (asset: Asset) => void = () => {};
  upload.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
  const done = uploadRecordedClip('token', trackId, 'take');
  expect(splitAudioClipAt(trackId, 'take', 5 * SEC)).toBeTruthy();
  finish({ id: 'asset-1' } as Asset);
  await done;
}

beforeEach(() => {
  upload.mockReset();
  // A project with a cloud copy: its takes upload the moment they stop (a
  // never-saved one keeps them in its draft until the first Save).
  useStore.setState({
    tracks: [],
    bpm: 120,
    remoteUsers: new Map(),
    projectId: 'project-1',
    roomId: null,
  });
  trackId = useStore.getState().addTrack('audio', 'vocal-fx', 'Vox');
  useStore.getState().addAudioClip(trackId, take);
  setAudioBuffer('take', {
    duration: 10,
    sampleRate: 48_000,
    numberOfChannels: 1,
  } as AudioBuffer);
  // Compressed bytes upload as they are: nothing to encode here.
  setOriginalAudio('take', new ArrayBuffer(8), 'audio/webm;codecs=opus');
});

describe('a take split before its audio is uploaded', () => {
  it('the left half (the take id) gets the asset of the upload in flight', async () => {
    await splitDuringUpload();
    expect(assetIds()[0]).toBe('asset-1');
  });

  it('so does the right half', async () => {
    await splitDuringUpload();
    expect(assetIds()).toEqual(['asset-1', 'asset-1']);
  });

  it('Save gives both halves an asset', async () => {
    splitAudioClipAt(trackId, 'take', 5 * SEC);
    upload.mockResolvedValue({ id: 'asset-1' } as Asset);

    await uploadPendingAudioClips('token', 'project-1');

    expect(assetIds()).toEqual(['asset-1', 'asset-1']);
  });

  it('uploading their recording once', async () => {
    splitAudioClipAt(trackId, 'take', 5 * SEC);
    upload.mockResolvedValue({ id: 'asset-1' } as Asset);

    await uploadPendingAudioClips('token', 'project-1');

    expect(upload).toHaveBeenCalledTimes(1);
  });
});
