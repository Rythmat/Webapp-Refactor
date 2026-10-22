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
// Match had no handler and stays hidden, and the meter that read "LUFS" is
// gone: since 2026-10-21 the Master is a strip like the tracks', its level
// drawn in its volume pill and no spectrum. The master fader reads in dB,
// as the Main pill does (fx-mixer-13, design-system-15). Mute All is a real
// toggle that gives back exactly what it took.

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

const bypass = () => screen.getByRole('button', { name: /^Bypass mastering/ });

describe('the master column', () => {
  it('Bypass is a toggle button that reports its state', () => {
    render(<MasterColumn />);
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
    render(<MasterColumn />);
    expect(bypass()).toHaveAttribute('data-state', 'on');
    expect(bypass()).toHaveAttribute('data-tone', 'neutral');
    expect(bypass().className).toContain('aria-pressed:bg-daw-selected');
  });

  it('says Bypass is for listening: exports keep the mastering', () => {
    render(<MasterColumn />);
    expect(bypass()).toHaveAccessibleName(/export/i);
  });

  it('hides Gain Match, which did nothing', () => {
    render(<MasterColumn />);
    expect(screen.queryByText('Gain Match')).toBeNull();
  });

  it('is a strip like the tracks’: no spectrum and no separate peak meter', () => {
    render(<MasterColumn />);
    expect(screen.getByTestId('master-column').style.width).toBe('96px');
    expect(screen.queryByTestId('master-spectrum')).toBeNull();
    expect(screen.queryByText('Peak')).toBeNull();
    expect(screen.queryByText('LUFS')).toBeNull();
    expect(screen.getByRole('slider', { name: 'Master gain' })).toHaveAttribute(
      'data-volume-pill',
    );
  });

  it('draws the mix’s level in its pill, as a track’s does', () => {
    meter.level = 50;
    render(<MasterColumn />);
    const channels = screen
      .getByTestId('master-column')
      .querySelectorAll<HTMLElement>('[data-meter-channel]');
    expect(channels).toHaveLength(2);
    expect(parseFloat(channels[0].style.height)).toBeGreaterThan(0);
  });

  it.each([
    [0.8, `${MINUS}1.9`, `${MINUS}1.94dB`],
    [1, '0.0', '+0.00dB'],
    [0, `${MINUS}∞`, `${MINUS}∞dB`],
  ])(
    'reads a master fader at %f in dB: the column’s pill as the Main pill does, the Master row %s dB',
    (gain, db, pill) => {
      useStore.setState({ masterVolume: gain });
      render(<MasterColumn />);
      expect(
        screen.getByRole('slider', { name: 'Master gain' }),
      ).toHaveAttribute('aria-valuetext', pill);
      cleanup();

      render(<MasterRow />);
      expect(
        screen.getByRole('slider', { name: 'Master volume' }),
      ).toHaveAttribute('aria-valuetext', `${db} dB`);
    },
  );

  it('keeps the lessons’ anchors', () => {
    const { container } = render(<MasterColumn />);
    const strip = container.querySelector('[data-tutorial-id="master-strip"]');
    expect(strip).toContainElement(
      screen.getByRole('slider', { name: 'Master gain' }),
    );
    const mastering = container.querySelector(
      '[data-tutorial-id="mastering-section"]',
    );
    expect(mastering).toContainElement(
      container.querySelector('[data-tutorial-id="mastering-chain"]'),
    );
  });
});

describe('Mute All', () => {
  const muteAll = () => screen.getByRole('button', { name: 'Mute all tracks' });

  it('is off with nothing to mute', () => {
    render(<MasterColumn />);
    expect(muteAll()).toBeDisabled();
  });

  it('mutes every track, and gives back exactly the ones it muted', () => {
    const ids = [
      s().addTrack('midi', 'soundfont', 'Keys'),
      s().addTrack('midi', 'drum-machine', 'Drums'),
      s().addTrack('audio', 'audio-input', 'Vox'),
    ];
    s().toggleMute(ids[1]);
    render(<MasterColumn />);
    expect(muteAll()).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(muteAll());
    expect(s().tracks.map((t) => t.mute)).toEqual([true, true, true]);
    expect(muteAll()).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(muteAll());
    expect(s().tracks.map((t) => t.mute)).toEqual([false, true, false]);
    expect(muteAll()).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows pressed when every track is muted by hand', () => {
    const id = s().addTrack('midi', 'soundfont', 'Keys');
    render(<MasterColumn />);
    act(() => s().toggleMute(id));
    expect(muteAll()).toHaveAttribute('aria-pressed', 'true');
  });
});
