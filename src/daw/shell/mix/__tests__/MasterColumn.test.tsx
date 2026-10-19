// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
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

// ── The master column says what the audio does (fx-mixer-02/03, ia-flows-35)
// Ported from the old Studio view's masterHonesty test (milestone 2.10).
// Bypass is a real pressed/unpressed toggle (playback follows it), Gain
// Match had no handler and stays hidden, and the meter that read "LUFS" was
// a rescaled peak, so it says Peak and reads the bus's master peak in the
// editor's one dB format (formatDb). The master fader reads in dB too, as
// the bottom rail's Master row does (fx-mixer-13, design-system-15). Mute
// All is a real toggle that gives back exactly what it took.

const meter = vi.hoisted(() => ({ level: 0 }));
vi.mock('@/daw/engine/meterBus', async (importOriginal) => {
  const bus = await importOriginal<typeof import('@/daw/engine/meterBus')>();
  // Every source reads `meter.level` percent of full scale on each channel.
  return {
    ...bus,
    meterSource: () => ({
      subscribe(cb: (levels: unknown) => void) {
        const gain = meter.level / 100;
        cb({
          peak: new Float32Array([gain, gain]),
          hold: new Float32Array([gain, gain]),
          rms: null,
          clipped: false,
        });
        return () => {};
      },
    }),
  };
});

import { useStore } from '@/daw/store';
import { MINUS } from '@/daw/ui/format';
import { MasterRow } from '@/daw/shell/bottombar/MasterRow';
import { MasterColumn } from '../MasterColumn';

const s = () => useStore.getState();

// A 2D context that draws nothing, so the Meter paints its peak readout.
const getContext = HTMLCanvasElement.prototype.getContext;
beforeAll(() => {
  const noop = () => {};
  const ctx = new Proxy(
    {},
    { get: (_, key) => (key === 'canvas' ? undefined : noop), set: () => true },
  );
  HTMLCanvasElement.prototype.getContext = (() =>
    ctx) as unknown as typeof getContext;
});
afterAll(() => {
  HTMLCanvasElement.prototype.getContext = getContext;
});

beforeEach(() => {
  meter.level = 0;
  useStore.setState({
    masteringBypass: false,
    masterVolume: 0.8,
    tracks: [],
    muteAllSet: null,
    remoteUsers: new Map(),
  });
});

afterEach(cleanup);

/** The master Peak meter's readout, just above its caption. */
const peakReadout = () =>
  screen.getByText('Peak').previousElementSibling?.textContent;

const bypass = () => screen.getByRole('button', { name: /^Bypass mastering/ });

describe('the master column', () => {
  it('Bypass is a toggle button that reports its state', () => {
    render(<MasterColumn isReady={false} />);
    expect(bypass()).toHaveAttribute('aria-pressed', 'false');
    expect(bypass()).toHaveAttribute('data-testid', 'master-bypass');

    fireEvent.click(bypass());
    expect(s().masteringBypass).toBe(true);
    expect(bypass()).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(bypass());
    expect(s().masteringBypass).toBe(false);
    expect(bypass()).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks Bypass on with white/10, not a colour', () => {
    useStore.setState({ masteringBypass: true });
    render(<MasterColumn isReady={false} />);
    expect(bypass()).toHaveAttribute('data-state', 'on');
    expect(bypass()).toHaveAttribute('data-tone', 'neutral');
    expect(bypass().className).toContain('data-[state=on]:bg-daw-selected');
  });

  it('says Bypass is for listening: exports keep the mastering', () => {
    render(<MasterColumn isReady={false} />);
    expect(bypass()).toHaveAccessibleName(/export/i);
  });

  it('hides Gain Match, which did nothing', () => {
    render(<MasterColumn isReady={false} />);
    expect(screen.queryByText('Gain Match')).toBeNull();
  });

  it('labels the master meter Peak, not LUFS', () => {
    render(<MasterColumn isReady={false} />);
    expect(screen.getByText('Peak')).toBeInTheDocument();
    expect(screen.queryByText('LUFS')).toBeNull();
  });

  it.each([
    [50, `${MINUS}6.0`],
    [99, `${MINUS}0.1`],
    [100, '0.0'],
    [1, `${MINUS}40`],
    [0, `${MINUS}∞`],
  ])('reads a level of %i as %s dBFS', (level, text) => {
    meter.level = level;
    render(<MasterColumn isReady={false} />);
    expect(peakReadout()).toBe(text);
  });

  it.each([
    [0.8, `${MINUS}1.9`],
    [1, '0.0'],
    [0, `${MINUS}∞`],
  ])(
    'reads a master fader at %f as %s dB, as the Master row does',
    (gain, db) => {
      useStore.setState({ masterVolume: gain });
      render(<MasterColumn isReady={false} />);
      expect(
        screen.getByRole('slider', { name: 'Master gain' }),
      ).toHaveAttribute('aria-valuetext', `${db} dB`);
      cleanup();

      render(<MasterRow />);
      expect(
        screen.getByRole('slider', { name: 'Master volume' }),
      ).toHaveAttribute('aria-valuetext', `${db} dB`);
    },
  );

  it('keeps the lessons’ anchors and the spectrum', () => {
    const { container } = render(<MasterColumn isReady={false} />);
    const strip = container.querySelector('[data-tutorial-id="master-strip"]');
    expect(strip).toContainElement(
      screen.getByRole('slider', { name: 'Master gain' }),
    );
    const mastering = container.querySelector(
      '[data-tutorial-id="mastering-section"]',
    );
    expect(mastering).toHaveTextContent('Mastering');
    expect(mastering).toContainElement(screen.getByTestId('master-spectrum'));
  });
});

describe('Mute All', () => {
  const muteAll = () => screen.getByRole('button', { name: 'Mute all tracks' });

  it('is off with nothing to mute', () => {
    render(<MasterColumn isReady={false} />);
    expect(muteAll()).toBeDisabled();
  });

  it('mutes every track, and gives back exactly the ones it muted', () => {
    const ids = [
      s().addTrack('midi', 'piano-sampler', 'Keys'),
      s().addTrack('midi', 'drum-machine', 'Drums'),
      s().addTrack('audio', 'vocal-fx', 'Vox'),
    ];
    s().toggleMute(ids[1]);
    render(<MasterColumn isReady={false} />);
    expect(muteAll()).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(muteAll());
    expect(s().tracks.map((t) => t.mute)).toEqual([true, true, true]);
    expect(muteAll()).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(muteAll());
    expect(s().tracks.map((t) => t.mute)).toEqual([false, true, false]);
    expect(muteAll()).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows pressed when every track is muted by hand', () => {
    const id = s().addTrack('midi', 'piano-sampler', 'Keys');
    render(<MasterColumn isReady={false} />);
    act(() => s().toggleMute(id));
    expect(muteAll()).toHaveAttribute('aria-pressed', 'true');
  });
});
