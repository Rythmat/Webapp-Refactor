import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  clearAudioBuffers,
  getAudioBuffer,
  getOriginalAudio,
  removeAudioBuffer,
  setAudioBuffer,
  setOriginalAudio,
  shareClipAudio,
} from '@/daw/audio/AudioBufferStore';
import { samplerBufferKey } from '@/daw/instruments/samplerChops';
import {
  bumpSessionGeneration,
  getSessionGeneration,
} from '@/daw/session/sessionGeneration';
import { useStore } from '@/daw/store';
import type { AudioClip } from '@/daw/store/tracksSlice';
import {
  audioBufferToOpusWebm,
  isOpusEncodingSupported,
} from '@/lib/studio-assets/encode-opus';
import { audioBufferToWav } from '@/lib/studio-assets/encode-wav';
import {
  createDraftStore,
  type DraftStore,
} from '@/lib/studio-projects/drafts/draftStore';
import {
  DraftStorageError,
  type DraftMediaRecord,
  type DraftMediaRef,
  type DraftMeta,
} from '@/lib/studio-projects/drafts/types';
import { MemoryStorage } from '@/lib/studio-projects/drafts/__tests__/draftTestUtils';
import { useDraftStatusStore } from '../draftStatusStore';
import {
  draftMediaRestoring,
  flushPendingMediaCapture,
  forgetStoredMedia,
  MEDIA_BUDGET,
  onManifestChange,
  pendingMediaManifest,
  registerDraftMedia,
  resetPendingMediaForTests,
  restoreDraftMedia,
  retryMissingMedia,
  startPendingMediaCapture,
  whenMediaWritesSettled,
  type PendingMediaEnv,
} from '../pendingMedia';

// ── Pending audio in drafts (milestone 1.4, E8) ────────────────────────────
// Run: npx vitest run src/daw/persistence/drafts/__tests__/pendingMedia.test.ts
//
// The real draft store over fake-indexeddb, the real editor store and
// AudioBufferStore; the encoders and the decode context are fakes (no Web
// Audio in node). A fake AudioBuffer carries an `id` the fake encoders put
// in their bytes, so different buffers encode to different media.

vi.mock('@/lib/studio-assets/encode-opus', () => ({
  isOpusEncodingSupported: vi.fn(() => true),
  audioBufferToOpusWebm: vi.fn(async (buffer: { id: string }) =>
    bytesOf(`opus:${buffer.id}`),
  ),
}));
vi.mock('@/lib/studio-assets/encode-wav', () => ({
  audioBufferToWav: vi.fn((buffer: { id: string }) =>
    bytesOf(`wav:${buffer.id}`),
  ),
}));
const decodeAudioData = vi.fn(async (bytes: ArrayBuffer) =>
  fakeBuffer(`decoded:${bytes.byteLength}`),
);
vi.mock('@/lib/studio-assets/load-audio', () => ({
  getDecodeContext: vi.fn(() => ({ decodeAudioData })),
}));

const USER = 'u1';

function bytesOf(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer;
}

function fakeBuffer(id: string): AudioBuffer {
  return {
    id,
    duration: 2,
    sampleRate: 48_000,
    numberOfChannels: 1,
    length: 96_000,
    getChannelData: () => new Float32Array(1),
  } as unknown as AudioBuffer;
}

async function sha256(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const clip = (id: string, assetId: string | null = null): AudioClip => ({
  id,
  startTick: 0,
  duration: 1920,
  fadeInTicks: 0,
  fadeOutTicks: 0,
  assetId,
});

/** The draft store's clock (and the capture's, when a test passes it). */
let clock = 1_000;
let store: DraftStore;
let trackId = '';
let stop: (() => void) | null = null;

function start(extra: Partial<PendingMediaEnv> = {}): void {
  stop = startPendingMediaCapture({
    store: () => store,
    userKey: () => USER,
    estimate: async () => null,
    ...extra,
  });
}

async function settle(): Promise<void> {
  expect(await whenMediaWritesSettled(5000)).toBe(true);
  // Status updates are queued in a microtask.
  await Promise.resolve();
}

const media = () => useDraftStatusStore.getState().media;

function addClip(id: string, assetId: string | null = null): void {
  useStore.getState().addAudioClip(trackId, clip(id, assetId));
}

function metaWith(refs: DraftMediaRef[]): DraftMeta {
  return {
    v: 1,
    draftId: 'd1',
    userKey: USER,
    origin: 'session',
    createdAt: 0,
    updatedAt: 0,
    writeSeq: 1,
    writer: { build: 'b', doc: 'doc' },
    schema: 3,
    name: 'Draft',
    trackCount: 1,
    chars: 0,
    contentHash: 'h1:0',
    docFingerprint: null,
    hasContent: true,
    baseline: { source: 'new', reopenable: true, fingerprint: null },
    media: refs,
    mediaMissing: 0,
  };
}

async function storeMedia(text: string): Promise<DraftMediaRecord> {
  const bytes = bytesOf(text);
  const mediaId = await sha256(bytes);
  const record: DraftMediaRecord = {
    key: `${USER}:${mediaId}`,
    mediaId,
    userKey: USER,
    blob: new Blob([bytes], { type: 'audio/webm;codecs=opus' }),
    contentType: 'audio/webm;codecs=opus',
    size: bytes.byteLength,
    createdAt: 0,
  };
  await store.putMedia(record);
  return record;
}

beforeAll(() => {
  (globalThis as { IDBKeyRange?: unknown }).IDBKeyRange = IDBKeyRange;
});

beforeEach(() => {
  clock = 1_000;
  resetPendingMediaForTests();
  clearAudioBuffers();
  vi.clearAllMocks();
  vi.mocked(isOpusEncodingSupported).mockReturnValue(true);
  useDraftStatusStore.setState(useDraftStatusStore.getInitialState(), true);
  useStore.setState(useStore.getInitialState(), true);
  trackId = useStore.getState().addTrack('audio', 'vocal-fx', 'Vox');
  store = createDraftStore({
    indexedDB: new IDBFactory(),
    storage: new MemoryStorage(),
    now: () => clock,
    build: 'b-test',
    writerDoc: 'doc-test',
  });
});

afterEach(async () => {
  stop?.();
  stop = null;
  // A scan scheduled at stop still runs: let it end before the next test.
  await whenMediaWritesSettled(5000);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('capture', () => {
  it('stores a take from its original bytes, keyed by their SHA-256', async () => {
    const original = bytesOf('take-bytes');
    setAudioBuffer('take', fakeBuffer('take'));
    setOriginalAudio('take', original, 'audio/webm;codecs=opus');
    addClip('take');
    start();
    await settle();

    const mediaId = await sha256(original);
    const record = await store.getMedia(USER, mediaId);
    expect(record).toMatchObject({
      key: `${USER}:${mediaId}`,
      contentType: 'audio/webm;codecs=opus',
      size: original.byteLength,
      sampleRate: 48_000,
      channels: 1,
      durationSeconds: 2,
    });
    expect(new Uint8Array(await record!.blob.arrayBuffer())).toEqual(
      new Uint8Array(original),
    );
    expect(audioBufferToOpusWebm).not.toHaveBeenCalled();
    expect(pendingMediaManifest()).toEqual({
      refs: [
        {
          mediaId,
          contentType: 'audio/webm;codecs=opus',
          size: original.byteLength,
          clipIds: ['take'],
          samplerSampleIds: [],
        },
      ],
      missing: 0,
    });
    expect(media()).toMatchObject({
      stored: 1,
      missing: 0,
      pendingInMemory: 0,
      writing: 0,
      lastError: null,
    });
  });

  it('maps split halves (shareClipAudio) to one media', async () => {
    setAudioBuffer('take', fakeBuffer('take'));
    setOriginalAudio('take', bytesOf('take-bytes'), 'audio/webm;codecs=opus');
    addClip('take');
    shareClipAudio('take', 'half');
    addClip('half');
    const put = vi.spyOn(store, 'putMedia');
    start();
    await settle();

    expect(put).toHaveBeenCalledTimes(1);
    const { refs, missing } = pendingMediaManifest();
    expect(missing).toBe(0);
    expect(refs).toHaveLength(1);
    expect(refs[0].clipIds).toEqual(['take', 'half']);
  });

  it('resolves a pasted clip with only a buffer through the buffer it plays', async () => {
    const buffer = fakeBuffer('take');
    setAudioBuffer('take', buffer);
    setOriginalAudio('take', bytesOf('take-bytes'), 'audio/webm;codecs=opus');
    addClip('take');
    start();
    await settle();
    const [{ mediaId }] = pendingMediaManifest().refs;

    // The source goes (its entry and original with it); the paste has only
    // the decoded buffer.
    useStore.getState().removeAudioClip(trackId, 'take');
    removeAudioBuffer('take');
    setAudioBuffer('paste', buffer);
    addClip('paste');
    const put = vi.spyOn(store, 'putMedia');
    await settle();

    expect(audioBufferToOpusWebm).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    expect(pendingMediaManifest().refs).toEqual([
      expect.objectContaining({ mediaId, clipIds: ['paste'] }),
    ]);
  });

  it('uses another clip’s original for an identical buffer', async () => {
    const buffer = fakeBuffer('take');
    setAudioBuffer('take', buffer);
    setOriginalAudio('take', bytesOf('take-bytes'), 'audio/wav');
    addClip('take', 'asset-1'); // in the cloud: not pending itself
    setAudioBuffer('dup', buffer);
    addClip('dup');
    start();
    await settle();

    expect(audioBufferToOpusWebm).not.toHaveBeenCalled();
    expect(pendingMediaManifest().refs).toEqual([
      expect.objectContaining({
        mediaId: await sha256(bytesOf('take-bytes')),
        contentType: 'audio/wav',
        clipIds: ['dup'],
      }),
    ]);
  });

  it('encodes a buffer with no original anywhere once (Opus)', async () => {
    const buffer = fakeBuffer('gen');
    setAudioBuffer('a', buffer);
    setAudioBuffer('b', buffer);
    addClip('a');
    addClip('b');
    const put = vi.spyOn(store, 'putMedia');
    start();
    await settle();

    expect(audioBufferToOpusWebm).toHaveBeenCalledTimes(1);
    expect(put).toHaveBeenCalledTimes(1);
    expect(pendingMediaManifest().refs).toEqual([
      expect.objectContaining({
        mediaId: await sha256(bytesOf('opus:gen')),
        contentType: 'audio/webm;codecs=opus',
        clipIds: ['a', 'b'],
      }),
    ]);
  });

  it('falls back to WAV without Opus', async () => {
    vi.mocked(isOpusEncodingSupported).mockReturnValue(false);
    setAudioBuffer('a', fakeBuffer('gen'));
    addClip('a');
    start();
    await settle();

    expect(audioBufferToOpusWebm).not.toHaveBeenCalled();
    expect(audioBufferToWav).toHaveBeenCalledTimes(1);
    expect(pendingMediaManifest().refs[0]).toMatchObject({
      mediaId: await sha256(bytesOf('wav:gen')),
      contentType: 'audio/wav',
    });
  });

  it('captures a pending sampler sample and skips bundled and uploaded audio', async () => {
    const chops = useStore.getState().addTrack('audio', 'vocal-fx', 'Chops');
    useStore.getState().setSamplerSample(chops, {
      sampleId: 's1',
      assetId: null,
      rootNote: 'C4',
      attack: 0,
      release: 0.1,
    });
    setAudioBuffer(samplerBufferKey('s1'), fakeBuffer('s1'));
    setOriginalAudio(samplerBufferKey('s1'), bytesOf('kick'), 'audio/mpeg');

    const bundled = useStore.getState().addTrack('audio', 'vocal-fx', 'Demo');
    useStore.getState().setSamplerSample(bundled, {
      sampleId: 's2',
      assetId: null,
      sourceUrl: '/daw-assets/samples/chops/demo-vox-c4.wav',
      rootNote: 'C4',
      attack: 0,
      release: 0.1,
    });
    setAudioBuffer(samplerBufferKey('s2'), fakeBuffer('s2'));
    setAudioBuffer('cloud', fakeBuffer('cloud'));
    addClip('cloud', 'asset-9');

    const put = vi.spyOn(store, 'putMedia');
    start();
    await settle();

    expect(put).toHaveBeenCalledTimes(1);
    expect(audioBufferToOpusWebm).not.toHaveBeenCalled();
    expect(pendingMediaManifest()).toEqual({
      refs: [
        expect.objectContaining({
          mediaId: await sha256(bytesOf('kick')),
          contentType: 'audio/mpeg',
          clipIds: [],
          samplerSampleIds: ['s1'],
        }),
      ],
      missing: 0,
    });
  });

  it('marks audio over the per-user budget missing, with lastError quota', async () => {
    setAudioBuffer('take', fakeBuffer('take'));
    setOriginalAudio('take', bytesOf('take-bytes'), 'audio/webm');
    addClip('take');
    const put = vi.spyOn(store, 'putMedia');
    start({ budget: { perUserBytes: 4 } });
    await settle();

    expect(put).not.toHaveBeenCalled();
    expect(pendingMediaManifest()).toEqual({ refs: [], missing: 1 });
    expect(media()).toMatchObject({
      missing: 1,
      stored: 0,
      pendingInMemory: 0,
      lastError: 'quota',
    });
  });

  it('counts media already stored for the user and the device quota share', async () => {
    await storeMedia('x'.repeat(64));
    setAudioBuffer('take', fakeBuffer('take'));
    setOriginalAudio('take', bytesOf('take-bytes'), 'audio/webm');
    addClip('take');
    // 64 stored + 10 new > 0.2 × 300 = 60.
    start({ estimate: async () => ({ usage: 64, quota: 300 }) });
    await settle();
    expect(media()).toMatchObject({ missing: 1, lastError: 'quota' });
    expect(MEDIA_BUDGET).toEqual({
      perUserBytes: 256 * 1024 * 1024,
      deviceMaxBytes: 1024 * 1024 * 1024,
      deviceQuotaShare: 0.2,
    });
  });

  it('marks a put that fails for quota missing, and Retry tries again', async () => {
    setAudioBuffer('take', fakeBuffer('take'));
    setOriginalAudio('take', bytesOf('take-bytes'), 'audio/webm');
    addClip('take');
    const put = vi
      .spyOn(store, 'putMedia')
      .mockRejectedValueOnce(new DraftStorageError('quota', 'full'));
    start();
    await settle();
    expect(media()).toMatchObject({ missing: 1, lastError: 'quota' });

    retryMissingMedia();
    await settle();
    expect(put).toHaveBeenCalledTimes(2);
    expect(media()).toMatchObject({ missing: 0, stored: 1, lastError: null });
  });

  it('lists stored media only; items without bytes count as missing', async () => {
    setAudioBuffer('take', fakeBuffer('take'));
    setOriginalAudio('take', bytesOf('take-bytes'), 'audio/webm');
    addClip('take');
    addClip('silent'); // an imported draft's clip: no bytes anywhere
    setAudioBuffer('later', fakeBuffer('later'));
    addClip('later');
    vi.spyOn(store, 'putMedia').mockImplementation(async (record) => {
      if (record.contentType !== 'audio/webm') {
        throw new DraftStorageError('unavailable', 'gone');
      }
    });
    start();
    await settle();

    const { refs, missing } = pendingMediaManifest();
    expect(refs.map((r) => r.clipIds)).toEqual([['take']]);
    expect(missing).toBe(2);
    expect(media()).toMatchObject({
      stored: 1,
      missing: 2,
      lastError: 'unavailable',
    });
  });

  it('counts unstored audio as pending in memory until the capture runs', async () => {
    start();
    setAudioBuffer('take', fakeBuffer('take'));
    addClip('take');
    await Promise.resolve();
    expect(media().pendingInMemory).toBe(1);
    await settle();
    expect(media()).toMatchObject({ pendingInMemory: 0, stored: 1 });
  });

  it('tells manifest listeners when a write lands', async () => {
    const listener = vi.fn();
    onManifestChange(listener);
    start();
    await settle();
    listener.mockClear();

    setAudioBuffer('take', fakeBuffer('take'));
    setOriginalAudio('take', bytesOf('take-bytes'), 'audio/webm');
    addClip('take');
    await settle();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('stores nothing on the localStorage adapter', async () => {
    store = createDraftStore({
      indexedDB: null,
      storage: new MemoryStorage(),
      now: () => 1_000,
    });
    setAudioBuffer('take', fakeBuffer('take'));
    addClip('take');
    start();
    await settle();
    expect(audioBufferToOpusWebm).not.toHaveBeenCalled();
    expect(media()).toMatchObject({ missing: 1, lastError: 'unavailable' });
  });
});

describe('restore', () => {
  it('shares one decoded AudioBuffer across clips and samples and restores the originals', async () => {
    const record = await storeMedia('take-bytes');
    addClip('a');
    addClip('b');
    const chops = useStore.getState().addTrack('audio', 'vocal-fx', 'Chops');
    useStore.getState().setSamplerSample(chops, {
      sampleId: 's1',
      assetId: null,
      rootNote: 'C4',
      attack: 0,
      release: 0.1,
    });
    const ref: DraftMediaRef = {
      mediaId: record.mediaId,
      contentType: record.contentType,
      size: record.size,
      clipIds: ['a', 'b'],
      samplerSampleIds: ['s1'],
    };
    start();

    const result = await restoreDraftMedia(metaWith([ref]), {
      generation: getSessionGeneration(),
      store,
    });

    expect(result).toEqual({ restored: 3, missing: 0 });
    expect(decodeAudioData).toHaveBeenCalledTimes(1);
    const buffer = getAudioBuffer('a');
    expect(buffer).toBeDefined();
    expect(getAudioBuffer('b')).toBe(buffer);
    expect(getAudioBuffer(samplerBufferKey('s1'))).toBe(buffer);
    for (const key of ['a', 'b', samplerBufferKey('s1')]) {
      const original = getOriginalAudio(key);
      expect(original?.contentType).toBe('audio/webm;codecs=opus');
      expect(new TextDecoder().decode(original!.bytes)).toBe('take-bytes');
    }
    expect(draftMediaRestoring()).toBe(false);

    // Restored items count as stored and are not put again.
    const put = vi.spyOn(store, 'putMedia');
    await settle();
    expect(put).not.toHaveBeenCalled();
    expect(pendingMediaManifest()).toEqual({ refs: [ref], missing: 0 });
    expect(media()).toMatchObject({ stored: 3, missing: 0, restoring: 0 });
  });

  it('skips keys that already have a buffer', async () => {
    const record = await storeMedia('take-bytes');
    const live = fakeBuffer('live');
    setAudioBuffer('a', live);
    addClip('a');
    const result = await restoreDraftMedia(
      metaWith([
        {
          mediaId: record.mediaId,
          contentType: record.contentType,
          size: record.size,
          clipIds: ['a'],
          samplerSampleIds: [],
        },
      ]),
      { generation: getSessionGeneration(), store },
    );
    expect(result).toEqual({ restored: 0, missing: 0 });
    expect(decodeAudioData).not.toHaveBeenCalled();
    expect(getAudioBuffer('a')).toBe(live);
  });

  it('ignores a restore whose session generation has moved on', async () => {
    const record = await storeMedia('take-bytes');
    addClip('a');
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const getMedia = store.getMedia.bind(store);
    vi.spyOn(store, 'getMedia').mockImplementation(async (...args) => {
      await gate;
      return getMedia(...args);
    });

    const restoring = restoreDraftMedia(
      metaWith([
        {
          mediaId: record.mediaId,
          contentType: record.contentType,
          size: record.size,
          clipIds: ['a'],
          samplerSampleIds: [],
        },
      ]),
      { generation: getSessionGeneration(), store },
    );
    expect(draftMediaRestoring()).toBe(true);
    bumpSessionGeneration('test');
    release();

    await expect(restoring).resolves.toEqual({ restored: 0, missing: 0 });
    expect(getAudioBuffer('a')).toBeUndefined();
    expect(decodeAudioData).not.toHaveBeenCalled();
    expect(draftMediaRestoring()).toBe(false);
  });

  it('keeps a restoring item in the manifest while the restore is stalled', async () => {
    const record = await storeMedia('take-bytes');
    addClip('a');
    const ref: DraftMediaRef = {
      mediaId: record.mediaId,
      contentType: record.contentType,
      size: record.size,
      clipIds: ['a'],
      samplerSampleIds: [],
    };
    // DraftSessionPort.apply/begin seed it before writes resume.
    registerDraftMedia([ref], USER);
    start();

    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const getMedia = store.getMedia.bind(store);
    vi.spyOn(store, 'getMedia').mockImplementation(async (...args) => {
      await gate;
      return getMedia(...args);
    });
    const restoring = restoreDraftMedia(metaWith([ref]), {
      generation: getSessionGeneration(),
      store,
    });

    // An edit while the restore decodes: the draft write still lists the ref.
    useStore.getState().addAudioClip(trackId, { ...clip('b'), startTick: 960 });
    useStore.getState().updateAudioClip(trackId, 'b', { assetId: 'asset-b' });
    await Promise.resolve();
    expect(pendingMediaManifest()).toEqual({ refs: [ref], missing: 0 });
    expect(media()).toMatchObject({
      stored: 1,
      restoring: 1,
      missing: 0,
      pendingInMemory: 0,
    });

    release();
    await expect(restoring).resolves.toEqual({ restored: 1, missing: 0 });
    await Promise.resolve();
    expect(media()).toMatchObject({ stored: 1, restoring: 0, missing: 0 });
  });

  it('marks items missing when their media is gone', async () => {
    addClip('a');
    const result = await restoreDraftMedia(
      metaWith([
        {
          mediaId: 'f'.repeat(64),
          contentType: 'audio/wav',
          size: 4,
          clipIds: ['a'],
          samplerSampleIds: [],
        },
      ]),
      { generation: getSessionGeneration(), store },
    );
    expect(result).toEqual({ restored: 0, missing: 1 });
    expect(pendingMediaManifest()).toEqual({ refs: [], missing: 1 });
    await Promise.resolve();
    expect(media()).toMatchObject({ missing: 1, stored: 0 });
  });
});

describe('data safety', () => {
  const refOf = (record: DraftMediaRecord): DraftMediaRef => ({
    mediaId: record.mediaId,
    contentType: record.contentType,
    size: record.size,
    clipIds: ['a'],
    samplerSampleIds: [],
  });

  it('keeps the ref when reading the media fails for a passing reason, and Retry restores it', async () => {
    const record = await storeMedia('take-bytes');
    addClip('a');
    const ref = refOf(record);
    registerDraftMedia([ref], USER);
    start();
    vi.spyOn(store, 'getMedia').mockRejectedValueOnce(
      new DraftStorageError('unavailable', 'busy'),
    );
    const result = await restoreDraftMedia(metaWith([ref]), {
      generation: getSessionGeneration(),
      store,
    });

    expect(result).toEqual({ restored: 0, missing: 1 });
    // The bytes are still stored: the draft keeps referencing them.
    expect(pendingMediaManifest()).toEqual({ refs: [ref], missing: 0 });
    await Promise.resolve();
    expect(media()).toMatchObject({ missing: 1, stored: 0 });

    retryMissingMedia();
    expect(draftMediaRestoring()).toBe(true);
    await vi.waitFor(() => expect(getAudioBuffer('a')).toBeDefined());
    await settle();
    expect(pendingMediaManifest()).toEqual({ refs: [ref], missing: 0 });
    expect(media()).toMatchObject({ missing: 0, stored: 1 });
  });

  it('keeps the ref when decoding fails; the chip counts it missing', async () => {
    const record = await storeMedia('take-bytes');
    addClip('a');
    const ref = refOf(record);
    registerDraftMedia([ref], USER);
    start();
    decodeAudioData.mockRejectedValueOnce(new Error('EncodingError'));
    const result = await restoreDraftMedia(metaWith([ref]), {
      generation: getSessionGeneration(),
      store,
    });

    expect(result).toEqual({ restored: 0, missing: 1 });
    expect(pendingMediaManifest()).toEqual({ refs: [ref], missing: 0 });
    await settle();
    expect(media()).toMatchObject({ missing: 1, stored: 0 });
    // A prune keeps the bytes: the draft that lists them is the live one.
    expect(await store.getMedia(USER, record.mediaId)).not.toBeNull();
  });

  it('stores the bytes again when an undone clip’s media was collected', async () => {
    const original = bytesOf('take-bytes');
    setAudioBuffer('take', fakeBuffer('take'));
    setOriginalAudio('take', original, 'audio/webm;codecs=opus');
    addClip('take');
    start({ now: () => clock });
    await settle();
    const mediaId = await sha256(original);
    expect(await store.getMedia(USER, mediaId)).not.toBeNull();

    // Delete the clip (its buffer stays for undo); no draft lists the media,
    // and a prune 20 minutes later collects it.
    useStore.getState().removeAudioClip(trackId, 'take');
    await settle();
    clock += 20 * 60_000;
    expect(await store.gcMedia(USER)).toBe(1);

    // Undo.
    addClip('take');
    await flushPendingMediaCapture();
    await settle();
    expect(pendingMediaManifest().refs.map((r) => r.mediaId)).toEqual([
      mediaId,
    ]);
    expect(await store.getMedia(USER, mediaId)).not.toBeNull();
  });

  it('re-checks an undone clip even when its bytes were touched moments ago', async () => {
    const original = bytesOf('take-bytes');
    setAudioBuffer('take', fakeBuffer('take'));
    setOriginalAudio('take', original, 'audio/webm;codecs=opus');
    addClip('take');
    start({ now: () => clock });
    await settle();
    const mediaId = await sha256(original);

    // A cleanup without grace (sign-out, Projects delete) right away.
    useStore.getState().removeAudioClip(trackId, 'take');
    await settle();
    expect(await store.gcMedia(USER, { graceMs: 0 })).toBe(1);

    addClip('take');
    await flushPendingMediaCapture();
    await settle();
    expect(await store.getMedia(USER, mediaId)).not.toBeNull();
  });

  it('stores a paste again when its buffer’s media was collected', async () => {
    const buffer = fakeBuffer('take');
    setAudioBuffer('take', buffer);
    setOriginalAudio('take', bytesOf('take-bytes'), 'audio/webm;codecs=opus');
    addClip('take');
    start({ now: () => clock });
    await settle();

    useStore.getState().removeAudioClip(trackId, 'take');
    removeAudioBuffer('take');
    await settle();
    clock += 20 * 60_000;
    expect(await store.gcMedia(USER)).toBe(1);

    setAudioBuffer('paste', buffer);
    addClip('paste');
    await flushPendingMediaCapture();
    await settle();
    const [ref] = pendingMediaManifest().refs;
    expect(ref.clipIds).toEqual(['paste']);
    expect(await store.getMedia(USER, ref.mediaId)).not.toBeNull();
  });

  it('restarts the grace of stored bytes a new clip reuses', async () => {
    const old = await storeMedia('take-bytes'); // createdAt 0
    clock = 20 * 60_000;
    setAudioBuffer('take', fakeBuffer('take'));
    setOriginalAudio('take', bytesOf('take-bytes'), 'audio/webm;codecs=opus');
    addClip('take');
    start();
    await settle();
    expect(pendingMediaManifest().refs.map((r) => r.mediaId)).toEqual([
      old.mediaId,
    ]);
    // Another tab's prune before this tab's draft write commits.
    expect(await store.gcMedia(USER)).toBe(0);
  });

  it('forgetStoredMedia makes the next capture re-check stored items', async () => {
    const original = bytesOf('take-bytes');
    setAudioBuffer('take', fakeBuffer('take'));
    setOriginalAudio('take', original, 'audio/webm;codecs=opus');
    addClip('take');
    start({ now: () => clock });
    await settle();
    const mediaId = await sha256(original);
    // A sign-out cleanup elsewhere removed it, then said so.
    expect(await store.gcMedia(USER, { graceMs: 0 })).toBe(1);
    forgetStoredMedia();
    await flushPendingMediaCapture();
    await settle();
    expect(await store.getMedia(USER, mediaId)).not.toBeNull();
  });

  it('measures the budget again before refusing', async () => {
    setAudioBuffer('one', fakeBuffer('one'));
    setOriginalAudio('one', bytesOf('take-bytes'), 'audio/webm'); // 10 bytes
    addClip('one');
    start({ budget: { perUserBytes: 20 }, now: () => clock });
    await settle();
    expect(media()).toMatchObject({ stored: 1, missing: 0 });

    useStore.getState().removeAudioClip(trackId, 'one');
    removeAudioBuffer('one');
    expect(await store.gcMedia(USER, { graceMs: 0 })).toBe(1);

    setAudioBuffer('two', fakeBuffer('two'));
    setOriginalAudio('two', bytesOf('other-bytes!'), 'audio/webm'); // 12
    addClip('two');
    await flushPendingMediaCapture();
    await settle();
    expect(media()).toMatchObject({ stored: 1, missing: 0, lastError: null });
  });

  it('stops a scan when the session switches mid-way', async () => {
    setAudioBuffer('a', fakeBuffer('a'));
    setOriginalAudio('a', bytesOf('a-bytes'), 'audio/webm');
    addClip('a');
    setAudioBuffer('b', fakeBuffer('b'));
    setOriginalAudio('b', bytesOf('b-bytes'), 'audio/webm');
    addClip('b');
    const putMedia = store.putMedia.bind(store);
    const put = vi.spyOn(store, 'putMedia').mockImplementation(async (r) => {
      // The open resets the project while the first item is written.
      bumpSessionGeneration('test');
      useStore.getState().removeAudioClip(trackId, 'b');
      return putMedia(r);
    });
    start();
    await settle();
    expect(put).toHaveBeenCalledTimes(1);
    expect(pendingMediaManifest().refs.map((r) => r.clipIds)).toEqual([['a']]);
  });

  it('captures within the max wait while the tracks keep changing', async () => {
    start();
    await settle();
    const put = vi.spyOn(store, 'putMedia');
    setAudioBuffer('take', fakeBuffer('take'));
    setOriginalAudio('take', bytesOf('take-bytes'), 'audio/webm');
    addClip('take');
    let tick = 0;
    const churn = setInterval(() => {
      tick += 1;
      useStore.getState().updateAudioClip(trackId, 'take', { startTick: tick });
    }, 100);
    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      expect(put).toHaveBeenCalledTimes(1);
    } finally {
      clearInterval(churn);
    }
  });

  it('runs a capture that was scheduled when the capture stops', async () => {
    start();
    await settle();
    const original = bytesOf('take-bytes');
    setAudioBuffer('take', fakeBuffer('take'));
    setOriginalAudio('take', original, 'audio/webm');
    addClip('take');
    stop?.();
    stop = null;
    expect(await whenMediaWritesSettled(1000)).toBe(true);
    expect(await store.getMedia(USER, await sha256(original))).not.toBeNull();
  });

  it('doesn’t count a collab peer’s audio this tab never had as missing', async () => {
    useStore.getState()._setRoomInfo('room-1', 'editor');
    addClip('peer'); // reached us over Yjs before its upload stamped it
    start();
    await settle();
    expect(pendingMediaManifest()).toEqual({ refs: [], missing: 0 });
    expect(media()).toMatchObject({ missing: 0, pendingInMemory: 0 });
  });

  it('doesn’t tell manifest listeners about a draft’s own refs', async () => {
    const record = await storeMedia('take-bytes');
    addClip('a');
    start();
    await settle();
    const listener = vi.fn();
    onManifestChange(listener);
    registerDraftMedia([refOf(record)], USER);
    expect(listener).not.toHaveBeenCalled();
    expect(pendingMediaManifest().refs).toEqual([refOf(record)]);
  });

  it('stores nothing on an insecure page (no crypto.subtle)', async () => {
    setAudioBuffer('take', fakeBuffer('take'));
    addClip('take');
    vi.stubGlobal('crypto', {});
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    start();
    await settle();
    expect(audioBufferToOpusWebm).not.toHaveBeenCalled();
    expect(media()).toMatchObject({ missing: 1, lastError: 'unavailable' });
    expect(info).toHaveBeenCalledTimes(1);
  });
});
