import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GuitarFxAdapter } from '@/daw/instruments/GuitarFxAdapter';
import { VocalFxAdapter } from '@/daw/instruments/VocalFxAdapter';

/** Just enough of an AudioContext for an adapter's init and its input stage. */
function fakeAudioContext() {
  const node = () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    getFloatTimeDomainData: vi.fn(),
    gain: { value: 1 },
    offset: { value: 0 },
    channelCount: 2,
    channelCountMode: 'max',
    channelInterpretation: 'speakers',
    fftSize: 2048,
    smoothingTimeConstant: 0.8,
  });
  return {
    state: 'running',
    createGain: node,
    createAnalyser: node,
    createConstantSource: node,
    createMediaStreamSource: node,
    createChannelMerger: node,
    createChannelSplitter: node,
    createMediaStreamDestination: () => ({ ...node(), stream: {} }),
  };
}

/** A stream whose track can be ended the way an unplug ends it. */
function fakeStream() {
  const listeners: (() => void)[] = [];
  const track = {
    addEventListener: (_type: string, cb: () => void) => listeners.push(cb),
    stop: vi.fn(),
  };
  const stream = {
    getAudioTracks: () => [track],
    getTracks: () => [track],
  } as unknown as MediaStream;
  return { stream, unplug: () => listeners.forEach((cb) => cb()) };
}

/** Whether a stream is wired into the adapter's input stage. */
function hasInput(adapter: GuitarFxAdapter | VocalFxAdapter) {
  return adapter instanceof GuitarFxAdapter
    ? adapter.getPitchDetectSourceNode() !== null
    : adapter.startRecordingStream() !== null;
}

const getUserMedia = vi.fn();

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
  getUserMedia.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe.each([
  ['GuitarFxAdapter', () => new GuitarFxAdapter()],
  ['VocalFxAdapter', () => new VocalFxAdapter()],
] as const)('%s', (_name, make) => {
  async function ready() {
    const ctx = fakeAudioContext();
    const adapter = make();
    await adapter.init(
      ctx as unknown as AudioContext,
      ctx.createGain() as unknown as AudioNode,
    );
    return adapter;
  }

  it('opens a device again after an open of it failed', async () => {
    const adapter = await ready();
    getUserMedia
      .mockRejectedValueOnce(new DOMException('Dismissed', 'NotAllowedError'))
      .mockResolvedValue(fakeStream().stream);

    await adapter.setDevice('iface-1');
    expect(adapter.getDeviceId()).toBeNull();

    await adapter.setDevice('iface-1');
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(adapter.getDeviceId()).toBe('iface-1');
  });

  it('opens a device again after its stream ended', async () => {
    const adapter = await ready();
    const first = fakeStream();
    getUserMedia
      .mockResolvedValueOnce(first.stream)
      .mockResolvedValue(fakeStream().stream);
    await adapter.setDevice('iface-1');

    first.unplug();
    await adapter.setDevice('iface-1');

    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it('keeps a newer pick when an older open fails late', async () => {
    const adapter = await ready();
    let fail = (_err: unknown) => {};
    getUserMedia
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            fail = reject;
          }),
      )
      .mockResolvedValue(fakeStream().stream);

    const older = adapter.setDevice('iface-1');
    await adapter.setDevice('iface-2');
    fail(new DOMException('Busy', 'NotReadableError'));
    await older;

    expect(adapter.getDeviceId()).toBe('iface-2');
  });

  it('ignores the end of a stream it has already replaced', async () => {
    const adapter = await ready();
    const first = fakeStream();
    getUserMedia
      .mockResolvedValueOnce(first.stream)
      .mockResolvedValue(fakeStream().stream);
    await adapter.setDevice('iface-1');
    await adapter.setDevice('iface-2');

    first.unplug();

    expect(adapter.getDeviceId()).toBe('iface-2');
    expect(hasInput(adapter)).toBe(true);
  });
});
