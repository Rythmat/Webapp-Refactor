// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { PeaksRequest } from '@/daw/audio/peaks';
import { buildPeakLevels } from '@/daw/audio/peakLevels';

// ── Timeline waveforms (timeline-07, audio-core-09) ─────────────────────────
// A redraw used to scan every sample of each visible audio clip and draw a
// curve through every point of the whole clip, most of them off screen. It
// now reads the clip's peak pyramid for the points on the canvas only, and a
// long take draws a flat line until the peaks worker has summarised it.

vi.mock('@/daw/dev/DevProfiler', () => ({ useDevCommitCount: () => {} }));
vi.mock('@/hooks/useIsPremium', () => ({
  useIsPremium: () => ({ isPremium: true, isLoading: false }),
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => () => {} }));

import { setAudioBuffer } from '@/daw/audio/AudioBufferStore';
import { useStore } from '@/daw/store';
import { Timeline } from '../Timeline';

const s = () => useStore.getState();
const VIEWPORT = 1200;
const RATE = 48000;

/** Every canvas call, by method name. */
let calls: { name: string; args: unknown[] }[] = [];
/** The calls of the latest redraw, which opens with setTransform. */
const lastDraw = () =>
  calls.slice(calls.map((c) => c.name).lastIndexOf('setTransform'));
const count = (name: string) =>
  lastDraw().filter((c) => c.name === name).length;

/** A 2D context that records what is drawn and ignores the rest. */
function recordingContext() {
  const state: Record<string | symbol, unknown> = {};
  return new Proxy(state, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'measureText') {
        return (text: string) => ({ width: text.length * 6 });
      }
      return (...args: unknown[]) => {
        calls.push({ name: String(prop), args });
        return { addColorStop() {} };
      };
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
}

const clientWidth = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'clientWidth',
);
const getContext = HTMLCanvasElement.prototype.getContext;
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => VIEWPORT,
  });
  HTMLCanvasElement.prototype.getContext = (() =>
    recordingContext()) as unknown as typeof getContext;
});
afterAll(() => {
  if (clientWidth) {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', clientWidth);
  }
  HTMLCanvasElement.prototype.getContext = getContext;
});

function noise(length: number): Float32Array {
  const data = new Float32Array(length);
  for (let i = 0; i < length; i++) data[i] = Math.sin(i * 0.37) * 0.8;
  return data;
}

/** A clip on an audio track at bar 1, `seconds` long, with no audio yet. */
function addClip(id: string, seconds: number, assetId: string | null = null) {
  const trackId = s().addTrack('audio', 'vocal-fx', 'Vocals');
  const ticksPerSecond = (s().bpm * 480) / 60;
  s().addAudioClip(trackId, {
    id,
    startTick: 0,
    duration: Math.round(seconds * ticksPerSecond),
    fadeInTicks: 0,
    fadeOutTicks: 0,
    assetId,
    offsetSeconds: 0,
  });
}

/** A take on an audio track at bar 1, `seconds` long, with its buffer loaded. */
function addTake(id: string, seconds: number) {
  addClip(id, seconds);
  const left = noise(seconds * RATE);
  const buffer = {
    length: left.length,
    sampleRate: RATE,
    duration: seconds,
    numberOfChannels: 2,
    // Both channels play the same audio.
    getChannelData: () => left,
  };
  setAudioBuffer(id, buffer as unknown as AudioBuffer);
}

const loadingLabels = () =>
  lastDraw().filter((c) => c.name === 'fillText' && c.args[0] === 'Loading…')
    .length;

/**
 * Flat lines across a clip: a level stroke longer than the view. Grid lines
 * and separators span the view at most; a clip at the closest zoom runs far
 * past it.
 */
const flatLines = () => {
  const draw = lastDraw();
  return draw.filter((c, i) => {
    const prev = draw[i - 1];
    return (
      c.name === 'lineTo' &&
      prev?.name === 'moveTo' &&
      prev.args[1] === c.args[1] &&
      (c.args[0] as number) - (prev.args[0] as number) > VIEWPORT
    );
  }).length;
};

/** Stands in for the peaks worker, answering when a test says so. */
class StandInWorker {
  static made: StandInWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror = null;
  onmessageerror = null;
  requests: PeaksRequest[] = [];
  constructor() {
    StandInWorker.made.push(this);
  }
  postMessage(request: PeaksRequest) {
    this.requests.push(request);
  }
  terminate() {}
  reply() {
    const request = this.requests.shift()!;
    const levels = buildPeakLevels(request.channels, request.length);
    this.onmessage?.({ data: { id: request.id, levels } } as MessageEvent);
  }
}

beforeEach(() => {
  calls = [];
  useStore.setState({
    tracks: [],
    bpm: 120,
    position: 0,
    timelineZoom: 10, // the closest zoom: a clip runs far past the view
    timelineScrollLeft: 0,
    remoteUsers: new Map(),
    isCollabActive: false,
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('audio clip waveforms', () => {
  it('draws only the points that land on the canvas', () => {
    // 25 s at the closest zoom is 20 000 px of clip: 10 000 points, of
    // which the 1200 px view shows about 600.
    vi.stubGlobal('Worker', undefined);
    addTake('take', 25);
    render(<Timeline />);

    const curves = count('quadraticCurveTo');
    expect(curves).toBeGreaterThan(2 * 500);
    expect(curves).toBeLessThan(2 * (VIEWPORT / 2 + 8));
    expect(loadingLabels()).toBe(0);
    expect(flatLines()).toBe(0);
  });

  it('draws a flat line, not Loading…, until the worker delivers a long take’s peaks', () => {
    StandInWorker.made = [];
    vi.stubGlobal('Worker', StandInWorker);
    addTake('long-take', 40);
    render(<Timeline />);

    // The take is decoded and plays: it is not loading, only not drawn yet.
    expect(loadingLabels()).toBe(0);
    expect(flatLines()).toBe(1);
    expect(count('quadraticCurveTo')).toBe(0);

    const [worker] = StandInWorker.made;
    expect(worker.requests).toHaveLength(1);
    act(() => worker.reply());
    // The arrival redraws the timeline, now with the waveform.
    expect(count('quadraticCurveTo')).toBeGreaterThan(2 * 500);
    expect(flatLines()).toBe(0);
    expect(loadingLabels()).toBe(0);
  });

  it('shows Loading… for a cloud clip whose audio has not arrived', () => {
    vi.stubGlobal('Worker', undefined);
    addClip('cloud-take', 40, 'asset-1');
    render(<Timeline />);

    expect(loadingLabels()).toBeGreaterThan(0);
    expect(flatLines()).toBe(0);
    expect(count('quadraticCurveTo')).toBe(0);
  });
});
