import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clipAudioStatus } from '@/daw/audio/assets/assetStatus';
import { bufferOf, clearAssets } from '@/daw/audio/assets/assetStore';
import { useStore } from '@/daw/store';
import { loadPendingAudio, retryAudio, RETRY_DELAYS_MS } from '../load-audio';

const decoded = vi.hoisted(() => ({ count: 0 }));
vi.mock('@/daw/audio/AudioEngine', () => ({
  audioEngine: {
    getIsInitialized: () => true,
    getContext: () => ({
      decodeAudioData: async () => {
        decoded.count += 1;
        return {
          length: 48000,
          numberOfChannels: 2,
          sampleRate: 48000,
        } as AudioBuffer;
      },
    }),
  },
}));
const api = vi.hoisted(() => ({
  getUrl: vi.fn(async (_token: string, assetId: string) => ({
    url: `https://cdn.test/${assetId}`,
  })),
}));
vi.mock('../api', () => ({ studioAssetsApi: api }));

// ── Loading a project's audio ──────────────────────────────────────────────
// Once per asset, however many clips play it; a failure is retried after
// 1 s, 4 s and 16 s, then waits for Retry, and an edit never fetches it
// again (engine-hooks-16, timeline-25).

const s = () => useStore.getState();
const fetchMock = vi.fn();

let vox = '';
const clip = (id: string, assetId: string) => ({
  id,
  startTick: 0,
  duration: 1920,
  fadeInTicks: 0,
  fadeOutTicks: 0,
  assetId,
});

/** Lets the loader's awaits (fetch, bytes, decode) run. */
const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

beforeEach(() => {
  vi.useFakeTimers();
  decoded.count = 0;
  api.getUrl.mockClear();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(8),
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  clearAssets();
  useStore.setState(useStore.getInitialState(), true);
  vox = s().addTrack('audio', 'vocal-fx', 'Vox');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('loading', () => {
  it('fetches the two halves of a split take once', async () => {
    s().addAudioClip(vox, clip('left', 'asset-1'));
    s().addAudioClip(vox, clip('right', 'asset-1'));
    await loadPendingAudio('token');
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(decoded.count).toBe(1);
    expect(bufferOf('left')).toBe(bufferOf('right'));
    expect(clipAudioStatus('right', 'asset-1')).toBe('ready');
  });

  it('fetches nothing again for a project reopened in this tab', async () => {
    s().addAudioClip(vox, clip('take', 'asset-1'));
    await loadPendingAudio('token');
    // Opened again: new clip ids, the same asset.
    s().updateTrack(vox, { audioClips: [clip('take-2', 'asset-1')] });
    await loadPendingAudio('token');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(bufferOf('take-2')).toBeDefined();
  });
});

describe('a failed load', () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 });
    s().addAudioClip(vox, clip('take', 'asset-1'));
  });

  it('says so, and an edit does not fetch it again', async () => {
    await loadPendingAudio('token');
    expect(clipAudioStatus('take', 'asset-1')).toBe('failed');
    s().updateAudioClip(vox, 'take', { gain: 0.5 });
    await loadPendingAudio('token');
    await loadPendingAudio('token');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('is retried after 1 s, 4 s and 16 s, then only by Retry', async () => {
    await loadPendingAudio('token');
    for (const delay of RETRY_DELAYS_MS) {
      await vi.advanceTimersByTimeAsync(delay);
      await settle();
    }
    expect(fetchMock).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(fetchMock).toHaveBeenCalledTimes(4);

    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    });
    retryAudio('take');
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(clipAudioStatus('take', 'asset-1')).toBe('ready');
  });
});

describe('a clip without its audio', () => {
  it('is missing when it was never uploaded and is not on this device', () => {
    s().addAudioClip(vox, { ...clip('lost', 'x'), assetId: null });
    expect(clipAudioStatus('lost', null)).toBe('missing');
  });
});
