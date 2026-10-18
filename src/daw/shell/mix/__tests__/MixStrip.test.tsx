// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { Profiler } from 'react';
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

// ── A Mix strip (milestone 2.10) ───────────────────────────────────────────
// Each drag (a send, the pan, the fader) plays as it moves and makes one
// store write and one undo step on release; M and S are neutral toggles;
// the fader's value is the editor's dB; and an edit to one track never
// re-renders another track's strip.

const previewTrack = vi.hoisted(() => vi.fn());
vi.mock('@/daw/engine/trackReconciler', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/daw/engine/trackReconciler')>()),
  previewTrack,
}));

import { useStore } from '@/daw/store';
import { historyLabels, resetHistory, startHistory } from '@/daw/store/history';
import { MINUS } from '@/daw/ui/format';
import { MixStrip } from '../MixStrip';

const s = () => useStore.getState();
let ids: string[];
let stopHistory: () => void;

const getContext = HTMLCanvasElement.prototype.getContext;
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = (() =>
    null) as unknown as typeof getContext;
  // jsdom has no PointerEvent; without one a drag loses its clientY.
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
afterAll(() => {
  HTMLCanvasElement.prototype.getContext = getContext;
});

beforeEach(() => {
  vi.useFakeTimers();
  previewTrack.mockClear();
  useStore.setState({
    tracks: [],
    selectedTrackId: null,
    remoteUsers: new Map(),
  });
  ids = [
    s().addTrack('midi', 'piano-sampler', 'Keys'),
    s().addTrack('midi', 'drum-machine', 'Drums'),
  ];
  resetHistory();
  stopHistory = startHistory();
});

afterEach(() => {
  cleanup();
  stopHistory();
  resetHistory();
  vi.useRealTimers();
});

const frame = () => act(() => void vi.advanceTimersByTime(17));

/** Drags a slider up by `px`, frame by frame, and lets go. */
function drag(slider: HTMLElement, px: number) {
  fireEvent.pointerDown(slider, { pointerId: 1, clientY: 300, button: 0 });
  for (let i = 1; i <= px; i++) {
    fireEvent.pointerMove(slider, { pointerId: 1, clientY: 300 - i });
    if (i % 4 === 0) frame();
  }
  fireEvent.pointerUp(slider, { pointerId: 1, clientY: 300 - px });
}

/** Counts the store's writes to the tracks while `fn` runs. */
function trackWrites(fn: () => void): number {
  let writes = 0;
  const stop = useStore.subscribe((state, prev) => {
    if (state.tracks !== prev.tracks) writes += 1;
  });
  fn();
  stop();
  return writes;
}

describe('a Mix strip’s drags', () => {
  it.each([
    ['Send to A · Reverb', 'Change send', () => s().tracks[0].sends?.A ?? 0],
    ['Pan of Keys', 'Change pan', () => s().tracks[0].pan],
    ['Volume of Keys', 'Change volume', () => s().tracks[0].volume],
  ])(
    '%s: one store write and one undo step per gesture',
    (name, label, read) => {
      render(<MixStrip trackId={ids[0]} />);
      const before = read();
      const slider = screen.getByRole('slider', { name });
      const writes = trackWrites(() => drag(slider, 40));
      expect(writes).toBe(1);
      expect(historyLabels()).toEqual([label]);
      expect(read()).not.toBe(before);
      expect(previewTrack).toHaveBeenCalled();
    },
  );

  it('a key press on the fader is one step too', () => {
    render(<MixStrip trackId={ids[0]} />);
    const fader = screen.getByRole('slider', { name: 'Volume of Keys' });
    const writes = trackWrites(() =>
      fireEvent.keyDown(fader, { key: 'ArrowUp' }),
    );
    expect(writes).toBe(1);
    expect(historyLabels()).toEqual(['Change volume']);
  });

  it('reads the fader in dB: unity is 0.0 dB, the default −1.9 dB', () => {
    render(<MixStrip trackId={ids[0]} />);
    const fader = screen.getByRole('slider', { name: 'Volume of Keys' });
    expect(fader).toHaveAttribute('aria-valuetext', `${MINUS}1.9 dB`);
    expect(screen.getByTestId('mix-strip-volume')).toHaveTextContent(
      `${MINUS}1.9 dB`,
    );
    act(() => s().updateTrack(ids[0], { volume: 1 }));
    expect(fader).toHaveAttribute('aria-valuetext', '0.0 dB');
  });
});

describe('a Mix strip’s toggles', () => {
  it('M and S mute and solo the track, pressed while on', () => {
    render(<MixStrip trackId={ids[0]} />);
    const mute = screen.getByRole('button', { name: 'Mute Keys' });
    const solo = screen.getByRole('button', { name: 'Solo Keys' });
    expect(mute).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(mute);
    expect(s().tracks[0].mute).toBe(true);
    expect(mute).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(solo);
    expect(s().tracks[0].solo).toBe(true);
    expect(solo).toHaveAttribute('aria-pressed', 'true');
    // Neutral: white/10 when on, not a colour.
    expect(mute.className).toContain('data-[state=on]:bg-daw-selected');
  });

  it('every control is at least 24 px', () => {
    render(<MixStrip trackId={ids[0]} />);
    const strip = screen.getByTestId('mix-strip');
    for (const toggle of within(strip).getAllByRole('button', {
      name: /^(Mute|Solo) /,
    })) {
      expect(toggle.className).toMatch(/\bh-6\b/);
      expect(toggle.className).toMatch(/\bmin-w-6\b/);
    }
    for (const knob of within(strip).getAllByRole('slider')) {
      const size = parseFloat(knob.style.width || knob.style.height || '0');
      // Knobs are 28 px across; the fader's track is 24 px wide (w-6).
      expect(size >= 24 || knob.className.includes('w-6')).toBe(true);
    }
  });
});

describe('re-renders', () => {
  it('an edit to one track doesn’t re-render another track’s strip', () => {
    const renders: Record<string, number> = {};
    const count = (id: string) => () => {
      renders[id] = (renders[id] ?? 0) + 1;
    };
    render(
      <>
        <Profiler id="a" onRender={count('a')}>
          <MixStrip trackId={ids[0]} />
        </Profiler>
        <Profiler id="b" onRender={count('b')}>
          <MixStrip trackId={ids[1]} />
        </Profiler>
      </>,
    );
    const before = { ...renders };
    act(() => s().toggleMute(ids[0]));
    act(() => s().updateTrack(ids[0], { volume: 0.5, pan: 0.2 }));
    act(() => s().setSend(ids[0], 'A', 0.4));
    expect(renders.a).toBeGreaterThan(before.a);
    expect(renders.b).toBe(before.b);
  });
});
