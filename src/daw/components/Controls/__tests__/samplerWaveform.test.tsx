// @vitest-environment jsdom
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';

// ── The sampler waveform reuses its canvas while a marker is dragged ───────
// Every pointer move of a trim drag redraws. It used to resize the canvas's
// backing store and recompute the element's styles each time, and its resize
// cursor covered the whole wave though only the markers respond
// (live-input-22).

vi.mock('@/daw/audio/AudioBufferStore', () => ({
  computePeaks: (_buffer: unknown, count: number) =>
    Array.from({ length: count }, () => 0.5),
}));

import { SamplerWaveform } from '../SamplerWaveform';

/** The waveform's laid-out size, as its ResizeObserver reports it. */
const WIDTH = 400;
const HEIGHT = 100;

class SizedObserver {
  constructor(private callback: ResizeObserverCallback) {}
  observe() {
    this.callback(
      [
        {
          contentRect: { width: WIDTH, height: HEIGHT },
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}

/** Just the 2D calls the waveform makes, counting its clears (one a draw). */
function fakeContext() {
  const ctx = {
    draws: 0,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    setTransform: vi.fn(),
    clearRect: vi.fn(() => {
      ctx.draws++;
    }),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  };
  return ctx;
}

let ctx: ReturnType<typeof fakeContext>;
let widthSets: ReturnType<typeof vi.spyOn>;
let styleReads: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  // jsdom has no PointerEvent; without one a drag loses its clientX.
  if (!window.PointerEvent) {
    class TestPointerEvent extends MouseEvent {
      pointerId: number;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 0;
      }
    }
    window.PointerEvent = TestPointerEvent as typeof PointerEvent;
  }
  Element.prototype.setPointerCapture = () => {};
});

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', SizedObserver);
  ctx = fakeContext();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    (() => ctx) as unknown as HTMLCanvasElement['getContext'],
  );
  vi.spyOn(
    HTMLCanvasElement.prototype,
    'getBoundingClientRect',
  ).mockReturnValue({
    left: 0,
    top: 0,
    width: WIDTH,
    height: HEIGHT,
  } as DOMRect);
  widthSets = vi.spyOn(HTMLCanvasElement.prototype, 'width', 'set');
  styleReads = vi.spyOn(window, 'getComputedStyle');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** A waveform trimmed to 25%–75%: markers at x 100 and x 300. */
function renderWaveform() {
  const onTrimCommit = vi.fn();
  const { container } = render(
    <div>
      <SamplerWaveform
        buffer={{} as AudioBuffer}
        startPct={25}
        lengthPct={50}
        onTrimCommit={onTrimCommit}
      />
    </div>,
  );
  const canvas = container.querySelector('canvas')!;
  return { canvas, onTrimCommit };
}

describe('SamplerWaveform', () => {
  it('sizes the canvas once and redraws without resizing it during a drag', () => {
    const { canvas, onTrimCommit } = renderWaveform();
    expect(widthSets).toHaveBeenCalledTimes(1);
    const drawsBefore = ctx.draws;
    const stylesBefore = styleReads.mock.calls.length;

    fireEvent.pointerDown(canvas, { clientX: 100, pointerId: 1 });
    for (const x of [110, 120, 130, 140, 150]) {
      fireEvent.pointerMove(canvas, { clientX: x, pointerId: 1 });
    }
    fireEvent.pointerUp(canvas, { pointerId: 1 });

    // Each move repainted the preview on the same backing store.
    expect(ctx.draws - drawsBefore).toBeGreaterThanOrEqual(5);
    expect(widthSets).toHaveBeenCalledTimes(1);
    expect(styleReads.mock.calls.length).toBe(stylesBefore);
    // The drag still commits once, on release: start moved to 37.5%.
    expect(onTrimCommit).toHaveBeenCalledTimes(1);
    expect(onTrimCommit).toHaveBeenCalledWith(37.5, 37.5);
  });

  it('shows the resize cursor only over a marker', () => {
    const { canvas } = renderWaveform();
    expect(canvas.style.cursor).toBe('default');

    fireEvent.pointerMove(canvas, { clientX: 200 });
    expect(canvas.style.cursor).toBe('default');

    fireEvent.pointerMove(canvas, { clientX: 296 });
    expect(canvas.style.cursor).toBe('ew-resize');

    fireEvent.pointerLeave(canvas);
    expect(canvas.style.cursor).toBe('default');
  });

  it('starts no drag away from the markers', () => {
    const { canvas, onTrimCommit } = renderWaveform();
    fireEvent.pointerDown(canvas, { clientX: 200, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 250, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    expect(onTrimCommit).not.toHaveBeenCalled();
  });
});
