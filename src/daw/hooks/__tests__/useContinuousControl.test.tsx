// @vitest-environment jsdom
import { act, fireEvent, render, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { RotaryKnob } from '@/daw/components/Controls/RotaryKnob';
import { useStore } from '@/daw/store';
import { historyLabels, resetHistory, startHistory } from '@/daw/store/history';
import { useContinuousControl } from '../useContinuousControl';
import { useTrackVolumeControl } from '../useMixControls';

// ── Continuous controls (milestone 1.9) ────────────────────────────────────
// A drag previews through the engine at most once a frame and writes the
// store once, on release, as one labelled undo step.

const previewTrack = vi.hoisted(() => vi.fn());
vi.mock('@/daw/engine/trackReconciler', () => ({
  previewTrack,
  endTrackPreview: vi.fn(),
}));

beforeAll(() => {
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

let release: () => void = () => {};

beforeEach(() => {
  vi.useFakeTimers();
  previewTrack.mockClear();
  useStore.setState(useStore.getInitialState(), true);
  resetHistory();
  release = startHistory();
});

afterEach(() => {
  release();
  resetHistory();
  vi.useRealTimers();
});

/** One frame, so a gesture's coalesced preview runs. */
const frame = () => act(() => void vi.advanceTimersByTime(17));

function setup(value = 0) {
  const preview = vi.fn();
  const commit = vi.fn();
  const hook = renderHook(
    ({ v }) =>
      useContinuousControl({ value: v, preview, commit, label: 'Change it' }),
    { initialProps: { v: value } },
  );
  return { preview, commit, hook };
}

describe('useContinuousControl', () => {
  it('commits once per gesture, with the last value and where it began', () => {
    const { preview, commit, hook } = setup(0);
    act(() => hook.result.current.begin());
    for (let i = 1; i <= 20; i++) {
      act(() => hook.result.current.change(i));
    }
    expect(hook.result.current.value).toBe(20);
    expect(hook.result.current.dragging).toBe(true);
    expect(commit).not.toHaveBeenCalled();

    act(() => hook.result.current.end());
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith(20, 0);
    expect(hook.result.current.dragging).toBe(false);
    // Moves within one frame were previewed at most once.
    expect(preview.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it('previews at most once a frame, with the latest value', () => {
    const { preview, hook } = setup(0);
    act(() => hook.result.current.begin());
    act(() => hook.result.current.change(1));
    act(() => hook.result.current.change(2));
    frame();
    act(() => hook.result.current.change(3));
    frame();
    expect(preview.mock.calls).toEqual([[2], [3]]);
  });

  it('a gesture that ends where it began writes nothing and puts the sound back', () => {
    const { preview, commit, hook } = setup(5);
    act(() => hook.result.current.begin());
    act(() => hook.result.current.change(9));
    frame();
    act(() => hook.result.current.change(5));
    act(() => hook.result.current.end());
    expect(commit).not.toHaveBeenCalled();
    expect(preview).toHaveBeenLastCalledWith(5);
  });

  it('a change outside a gesture (a key press, a toggle) commits at once', () => {
    const { preview, commit, hook } = setup(0);
    act(() => hook.result.current.change(3));
    expect(commit).toHaveBeenCalledWith(3, 0);
    expect(preview).not.toHaveBeenCalled();
    act(() => hook.result.current.change(0));
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('a release anywhere ends the gesture', () => {
    const { commit, hook } = setup(0);
    act(() => hook.result.current.begin());
    act(() => hook.result.current.change(4));
    act(() => {
      window.dispatchEvent(new Event('pointerup'));
    });
    expect(commit).toHaveBeenCalledWith(4, 0);
  });

  it('keeps a drag the control unmounts in the middle of', () => {
    const { commit, hook } = setup(0);
    act(() => hook.result.current.begin());
    act(() => hook.result.current.change(7));
    hook.unmount();
    expect(commit).toHaveBeenCalledWith(7, 0);
  });

  it('cancel writes nothing and puts the sound back', () => {
    const { preview, commit, hook } = setup(2);
    act(() => hook.result.current.begin());
    act(() => hook.result.current.change(8));
    frame();
    act(() => hook.result.current.cancel());
    expect(commit).not.toHaveBeenCalled();
    expect(preview).toHaveBeenLastCalledWith(2);
  });
});

function VolumeKnob({ trackId }: { trackId: string }) {
  const track = useStore((s) => s.tracks.find((t) => t.id === trackId));
  if (!track) return null;
  return <Knob track={track} />;
}

function Knob({
  track,
}: {
  track: Parameters<typeof useTrackVolumeControl>[0];
}) {
  const volume = useTrackVolumeControl(track);
  return (
    <RotaryKnob
      label="Volume"
      value={volume.value}
      min={0}
      max={1}
      onChange={volume.change}
      onChangeStart={volume.begin}
      onChangeEnd={volume.end}
    />
  );
}

describe('a knob drag on a track', () => {
  it('makes one store write and one undo step, and is heard as it moves', () => {
    const id = useStore.getState().addTrack('midi', 'piano-sampler', 'Keys');
    resetHistory();
    let trackWrites = 0;
    const stop = useStore.subscribe((state, prev) => {
      if (state.tracks !== prev.tracks) trackWrites += 1;
    });

    const { container } = render(<VolumeKnob trackId={id} />);
    const knob = container.querySelector('svg')!;
    fireEvent.pointerDown(knob, { pointerId: 1, clientY: 300, button: 0 });
    for (let i = 1; i <= 40; i++) {
      fireEvent.pointerMove(knob, { pointerId: 1, clientY: 300 - i });
      if (i % 4 === 0) frame();
    }
    expect(trackWrites).toBe(0);
    expect(previewTrack).toHaveBeenCalled();
    expect(previewTrack.mock.calls.length).toBeLessThanOrEqual(10);

    fireEvent.pointerUp(knob, { pointerId: 1, clientY: 260 });
    stop();

    expect(trackWrites).toBe(1);
    expect(historyLabels()).toEqual(['Change volume']);
    expect(useStore.getState().tracks[0].volume).not.toBe(0.8);
  });
});
