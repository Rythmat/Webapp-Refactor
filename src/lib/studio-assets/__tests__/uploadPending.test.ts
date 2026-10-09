import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setAudioBuffer, setOriginalAudio } from '@/daw/audio/AudioBufferStore';
import { samplerBufferKey } from '@/daw/instruments/samplerChops';
import {
  INITIAL_DRAFT_STATUS,
  INITIAL_PENDING_MEDIA_STATUS,
  useDraftStatusStore,
} from '@/daw/persistence/drafts/draftStatusStore';
import {
  bumpSessionGeneration,
  getSessionGeneration,
} from '@/daw/session/sessionGeneration';
import { useStore } from '@/daw/store';
import type { AudioClip } from '@/daw/store/tracksSlice';
import {
  studioAssetsApi,
  uploadAndFinalizeAsset,
} from '@/lib/studio-assets/api';
import { ensureProjectId } from '@/lib/studio-projects/api';
import {
  draftCanHoldMedia,
  reconcileMissingAssets,
  revertAssetStamps,
  uploadPendingAudioClips,
  uploadRecordedClip,
  uploadSamplerSample,
  type AssetStamp,
} from '../upload-pending';

// ── Immediate uploads in milestone 1.4 ─────────────────────────────────────
// A take or a Chops drop no longer creates a cloud project by itself: in a
// never-saved project the bytes stay in memory and in the device draft, and
// go up with the first Save. A project with a cloud copy still uploads at
// once, and so does a collab room's take (peers hear audio only through its
// asset), minting the session's draft project as before, and so does a take
// the device's draft can't hold (no IndexedDB, a media write failed or was
// left out). Every stamp lands only in the session the audio was recorded
// in, while it is still linked to the project the bytes went to.

vi.mock('@/lib/studio-assets/api', () => ({
  uploadAndFinalizeAsset: vi.fn(),
  studioAssetsApi: { checkStatus: vi.fn() },
}));
// Like the real one: the mint links the session it was made for.
vi.mock('@/lib/studio-projects/api', () => ({
  ensureProjectId: vi.fn(async () => {
    useStore.getState().setProjectId('minted-1');
    return 'minted-1';
  }),
}));

type Asset = Awaited<ReturnType<typeof uploadAndFinalizeAsset>>;
const upload = vi.mocked(uploadAndFinalizeAsset);

const take: AudioClip = {
  id: 'take',
  startTick: 0,
  duration: 1920,
  fadeInTicks: 0,
  fadeOutTicks: 0,
  assetId: null,
};

let trackId = '';
const clipAsset = () =>
  useStore.getState().tracks.find((t) => t.id === trackId)!.audioClips[0]
    .assetId;
const sample = () =>
  useStore.getState().tracks.find((t) => t.id === trackId)!.samplerSample;

/** Hold the next upload until the returned finish runs. */
function holdUpload(): (id: string) => void {
  let finish: (asset: Asset) => void = () => {};
  upload.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
  return (id) => finish({ id } as Asset);
}

/** Drafts on IndexedDB with room for media: a never-saved take waits. */
function draftsHoldMedia(): void {
  useDraftStatusStore.setState({
    ...INITIAL_DRAFT_STATUS,
    adapter: 'indexeddb',
    media: { ...INITIAL_PENDING_MEDIA_STATUS },
  });
}

beforeEach(() => {
  draftsHoldMedia();
  upload.mockReset();
  upload.mockResolvedValue({ id: 'asset-1' } as Asset);
  vi.mocked(ensureProjectId).mockClear();
  useStore.setState(useStore.getInitialState(), true);
  trackId = useStore.getState().addTrack('audio', 'vocal-fx', 'Vox');
  useStore.getState().addAudioClip(trackId, take);
  setAudioBuffer('take', {
    duration: 4,
    sampleRate: 48_000,
    numberOfChannels: 1,
  } as AudioBuffer);
  setOriginalAudio('take', new ArrayBuffer(8), 'audio/webm;codecs=opus');
});

describe('uploadRecordedClip', () => {
  it('creates nothing for a never-saved project: the draft keeps the take', async () => {
    await expect(uploadRecordedClip('tok', trackId, 'take')).resolves.toBe(
      'deferred',
    );
    expect(ensureProjectId).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
    expect(clipAsset()).toBeNull();
    expect(useStore.getState().projectId).toBeNull();
  });

  it('uploads at once into a project with a cloud copy', async () => {
    useStore.getState().setProjectId('p1');
    await expect(uploadRecordedClip('tok', trackId, 'take')).resolves.toBe(
      'uploaded',
    );
    expect(ensureProjectId).not.toHaveBeenCalled();
    expect(upload.mock.calls[0][1]).toMatchObject({ projectId: 'p1' });
    expect(clipAsset()).toBe('asset-1');
  });

  it('mints and uploads when the device draft cannot hold the take', async () => {
    useDraftStatusStore.setState({ adapter: 'localstorage' });
    expect(draftCanHoldMedia()).toBe(false);
    await expect(uploadRecordedClip('tok', trackId, 'take')).resolves.toBe(
      'uploaded',
    );
    expect(ensureProjectId).toHaveBeenCalledWith('tok');
    expect(upload.mock.calls[0][1]).toMatchObject({ projectId: 'minted-1' });

    // A media write that failed (quota) or was left out counts the same.
    draftsHoldMedia();
    expect(draftCanHoldMedia()).toBe(true);
    useDraftStatusStore.setState({
      media: { ...INITIAL_PENDING_MEDIA_STATUS, lastError: 'quota' },
    });
    expect(draftCanHoldMedia()).toBe(false);
    useDraftStatusStore.setState({
      media: { ...INITIAL_PENDING_MEDIA_STATUS, missing: 1 },
    });
    expect(draftCanHoldMedia()).toBe(false);
  });

  it('stamps nothing when the project was deleted while it uploaded', async () => {
    useStore.getState().setProjectId('p1');
    const finish = holdUpload();
    const uploading = uploadRecordedClip('tok', trackId, 'take');
    await vi.waitFor(() => expect(upload).toHaveBeenCalledTimes(1));

    useStore.getState().setProjectId(null); // File ▸ Delete
    finish('asset-of-deleted');

    await expect(uploading).resolves.toBe('superseded');
    expect(clipAsset()).toBeNull();
  });

  it('in a collab room, mints the session draft and uploads, so peers hear it', async () => {
    useStore.getState()._setRoomInfo('room-a', 'editor');
    await expect(uploadRecordedClip('tok', trackId, 'take')).resolves.toBe(
      'uploaded',
    );
    expect(ensureProjectId).toHaveBeenCalledWith('tok');
    expect(upload.mock.calls[0][1]).toMatchObject({ projectId: 'minted-1' });
    expect(clipAsset()).toBe('asset-1');
  });

  it('stamps nothing once another project has opened', async () => {
    useStore.getState().setProjectId('p1');
    const finish = holdUpload();
    const uploading = uploadRecordedClip('tok', trackId, 'take');
    await vi.waitFor(() => expect(upload).toHaveBeenCalledTimes(1));

    bumpSessionGeneration('test');
    finish('asset-late');

    await expect(uploading).resolves.toBe('superseded');
    expect(clipAsset()).toBeNull();
  });
});

describe('uploadSamplerSample', () => {
  beforeEach(() => {
    useStore.getState().setSamplerSample(trackId, {
      sampleId: 's1',
      assetId: null,
      rootNote: 'C4',
      attack: 0,
      release: 0.1,
      name: 'kick.wav',
    });
    setAudioBuffer(samplerBufferKey('s1'), {
      duration: 1,
      sampleRate: 48_000,
      numberOfChannels: 1,
    } as AudioBuffer);
    setOriginalAudio(samplerBufferKey('s1'), new ArrayBuffer(8), 'audio/mpeg');
  });

  it('creates nothing for a never-saved project', async () => {
    await expect(uploadSamplerSample('tok', trackId)).resolves.toBe('deferred');
    expect(ensureProjectId).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
    expect(sample()?.assetId).toBeNull();
  });

  it('uploads at once into a saved project, and stamps only in its session', async () => {
    useStore.getState().setProjectId('p1');
    await uploadSamplerSample('tok', trackId);
    expect(sample()?.assetId).toBe('asset-1');

    useStore.getState().setSamplerSample(trackId, {
      ...sample()!,
      sampleId: 's2',
      assetId: null,
    });
    setAudioBuffer(samplerBufferKey('s2'), {
      duration: 1,
      sampleRate: 48_000,
      numberOfChannels: 1,
    } as AudioBuffer);
    setOriginalAudio(samplerBufferKey('s2'), new ArrayBuffer(8), 'audio/mpeg');
    const finish = holdUpload();
    const uploading = uploadSamplerSample('tok', trackId);
    await vi.waitFor(() => expect(upload).toHaveBeenCalledTimes(2));
    bumpSessionGeneration('test');
    finish('asset-late');

    await expect(uploading).resolves.toBe('superseded');
    expect(sample()?.assetId).toBeNull();
  });
});

describe('uploadPendingAudioClips with a fence', () => {
  it('stamps while the session holds, and not after another opened', async () => {
    await uploadPendingAudioClips('tok', 'p1', {
      fence: { generation: getSessionGeneration() },
    });
    expect(clipAsset()).toBe('asset-1');

    useStore.getState().updateAudioClip(trackId, 'take', { assetId: null });
    const finish = holdUpload();
    const saving = uploadPendingAudioClips('tok', 'p1', {
      fence: { generation: getSessionGeneration() },
    });
    await vi.waitFor(() => expect(upload).toHaveBeenCalledTimes(2));
    bumpSessionGeneration('test');
    finish('asset-late');
    await saving;
    expect(clipAsset()).toBeNull();
  });
});

describe('uploadPendingAudioClips failures', () => {
  it('carry the asset API status, so a save can tell a deleted project', async () => {
    upload.mockRejectedValueOnce(
      new Error('POST /api/studio/assets failed (404): project not found'),
    );
    const error = await uploadPendingAudioClips('tok', 'p1').catch((e) => e);
    expect(error).toMatchObject({
      name: 'AudioUploadError',
      failures: [{ clipId: 'take', status: 404 }],
    });
  });

  it('report each stamp, and revertAssetStamps undoes them', async () => {
    const stamps: AssetStamp[] = [];
    await uploadPendingAudioClips('tok', 'copy-1', {
      fence: { generation: getSessionGeneration(), projectId: null },
      onStamp: (stamp) => stamps.push(stamp),
    });
    expect(clipAsset()).toBe('asset-1');
    expect(stamps).toEqual([
      { kind: 'clip', trackId, clipId: 'take', assetId: 'asset-1' },
    ]);

    revertAssetStamps(stamps, { generation: getSessionGeneration() });
    expect(clipAsset()).toBeNull();
  });

  it('a stamp undone only while the clip still holds it', () => {
    useStore.getState().updateAudioClip(trackId, 'take', { assetId: 'other' });
    revertAssetStamps(
      [{ kind: 'clip', trackId, clipId: 'take', assetId: 'asset-1' }],
      { generation: getSessionGeneration() },
    );
    expect(clipAsset()).toBe('other');
  });
});

describe('reconcileMissingAssets', () => {
  const checkStatus = vi.mocked(studioAssetsApi.checkStatus);

  it('puts a clip whose re-upload failed back to pending, not unrecoverable', async () => {
    useStore.getState().updateAudioClip(trackId, 'take', { assetId: 'gone' });
    checkStatus.mockResolvedValueOnce({ missing: ['gone'], notReady: [] });
    upload.mockRejectedValueOnce(new Error('POST failed (404)'));

    const result = await reconcileMissingAssets('tok', 'p1');
    expect(result).toEqual({
      reuploaded: 0,
      unrecoverable: 0,
      reuploadFailed: 1,
    });
    expect(clipAsset()).toBeNull();
  });

  it('counts a clip with no bytes left as unrecoverable', async () => {
    useStore.getState().addAudioClip(trackId, {
      ...take,
      id: 'no-bytes',
      assetId: 'gone-2',
    });
    checkStatus.mockResolvedValueOnce({ missing: ['gone-2'], notReady: [] });
    const result = await reconcileMissingAssets('tok', 'p1');
    expect(result).toEqual({
      reuploaded: 0,
      unrecoverable: 1,
      reuploadFailed: 0,
    });
  });
});
