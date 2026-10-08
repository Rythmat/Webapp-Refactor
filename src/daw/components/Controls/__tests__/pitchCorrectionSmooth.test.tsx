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
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import {
  MAX_RETUNE_MS,
  retuneMs,
  smoothFromSpeed,
  speedFromSmooth,
} from '../pitchCorrectionSmooth';

// ── Pitch Correction's Smooth control means smooth (live-input-10) ─────────
// The worklet's `speed` is 100 = instant, 0 = a 400 ms glide. The control is
// labelled Smooth but was bound to speed directly, so turning it up made the
// correction faster and more robotic. It now shows the scale reversed.

vi.mock('@/daw/hooks/usePlaybackEngine', () => ({
  getTrackAudioState: () => undefined,
  subscribeEngineReady: () => () => {},
}));
vi.mock('@/daw/midi/AudioInputEnumerator', () => ({
  getAudioInputs: () => Promise.resolve([]),
  probeDeviceChannelCount: () => Promise.resolve(2),
}));
vi.mock('../TunerDisplay', () => ({ TunerDisplay: () => null }));
vi.mock('../PitchMeter', () => ({ PitchMeter: () => null }));
vi.mock('@/daw/hooks/usePitchInfo', () => ({
  usePitchInfo: () => ({ detected: 0, corrected: 0 }),
}));

import { useStore } from '@/daw/store';
import { VocalView } from '../VocalView';

beforeAll(() => {
  // jsdom has no media devices; the view listens for device changes.
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { addEventListener() {}, removeEventListener() {} },
  });
  // jsdom has no PointerEvent; without one a knob drag loses its clientY.
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
  useStore.setState({ tracks: [], selectedTrackId: null, rootNote: null });
});

afterEach(cleanup);

/** A vocal track whose chain is one Pitch Correction at this saved speed. */
function vocalWithPitchCorrection(speed: number) {
  const id = useStore.getState().addTrack('audio', 'vocal-fx', 'Vocals');
  useStore.getState().updateTrack(id, {
    vocalChain: [
      {
        type: 'pitch-correction',
        enabled: true,
        params: { rootNote: -1, scaleType: 2, correction: 80, speed },
      },
    ],
  });
  const { container } = render(<VocalView trackId={id} />);
  // Select the pedal so its controls show.
  fireEvent.click(container.querySelector('[draggable="true"]')!);
  return id;
}

const savedSpeed = (id: string) =>
  useStore.getState().tracks.find((t) => t.id === id)!.vocalChain![0].params
    .speed;

/** The Smooth knob's readout, under its label. */
const smoothKnobReadout = () =>
  screen.getByText('SMOOTH').nextElementSibling?.textContent;

describe('Smooth mapping', () => {
  it('is the worklet speed reversed, and round-trips', () => {
    expect(smoothFromSpeed(100)).toBe(0);
    expect(smoothFromSpeed(0)).toBe(100);
    for (const speed of [0, 25, 50, 80, 100]) {
      expect(speedFromSmooth(smoothFromSpeed(speed))).toBe(speed);
    }
  });

  it('gives a longer retune as Smooth goes up', () => {
    expect(retuneMs(0)).toBe(0);
    expect(retuneMs(50)).toBe(MAX_RETUNE_MS / 2);
    expect(retuneMs(100)).toBe(MAX_RETUNE_MS);
    // The worklet: (1 - speed / 100) × 400 ms.
    for (const speed of [0, 30, 100]) {
      expect(retuneMs(smoothFromSpeed(speed))).toBeCloseTo(
        (1 - speed / 100) * 400,
      );
    }
  });
});

describe('VocalView Pitch Correction', () => {
  it('reads a saved speed as the same retune time as before', () => {
    vocalWithPitchCorrection(80);
    // Speed 80 retunes in 80 ms, as it always did; only the knob's
    // direction changed.
    expect(smoothKnobReadout()).toBe('80 ms');
  });

  it('turning the Smooth knob up slows the retune', () => {
    const id = vocalWithPitchCorrection(80);
    const knob = screen.getByText('SMOOTH').previousElementSibling!;

    fireEvent.pointerDown(knob, { clientY: 300, pointerId: 1 });
    fireEvent.pointerMove(knob, { clientY: 270, pointerId: 1 });
    fireEvent.pointerUp(knob, { pointerId: 1 });

    // Up 30 px is a fifth of the knob's travel: Smooth 20 → 40.
    expect(savedSpeed(id)).toBe(60);
    expect(smoothKnobReadout()).toBe('160 ms');
  });

  it('shows Smooth on the expanded slider, raising the retune as it rises', () => {
    const id = vocalWithPitchCorrection(80);
    fireEvent.click(
      screen.getByRole('button', { name: 'Expand pitch correction' }),
    );
    const dialog = screen.getByRole('dialog');
    const slider = within(dialog).getByRole('slider', { name: 'Smooth' });
    expect(slider).toHaveValue('20');
    expect(within(dialog).getByText('80.0 ms')).toBeInTheDocument();

    fireEvent.change(slider, { target: { value: '90' } });

    expect(savedSpeed(id)).toBe(10);
    expect(slider).toHaveValue('90');
    expect(within(dialog).getByText('360.0 ms')).toBeInTheDocument();
  });
});
