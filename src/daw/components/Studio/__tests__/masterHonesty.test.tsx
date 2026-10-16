// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useStore } from '@/daw/store';
import { MINUS } from '@/daw/ui/format';
import { MasterRow } from '@/daw/shell/tracklist/MasterRow';
import { StudioView } from '../StudioView';

// ── The MASTER view says what the audio does (fx-mixer-02/03, ia-flows-35) ─
// Bypass is a real pressed/unpressed toggle (playback follows it), Gain
// Match had no handler and is hidden, and the meter that read "LUFS" was a
// rescaled peak, so it now says Peak and reads dBFS. Its source is the meter
// bus's master peak (linear, float), painted through a ref. Every level here
// reads in the editor's one dB format (formatDb), the master fader included:
// it used to call its default 80 % "0 dB" while Create's header said −1.9
// (fx-mixer-13, design-system-15).

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

/** The master Peak meter's readout. */
const peakReadout = () =>
  screen.getByText('Peak').previousElementSibling?.textContent;

/** The MASTER view's master fader readout, just above its name. */
const masterFaderReadout = () =>
  screen
    .getAllByText('Master')
    .map((label) => label.previousElementSibling?.textContent)
    .find((text) => text?.endsWith('dB'));

beforeEach(() => {
  meter.level = 0;
  useStore.setState({ masteringBypass: false, masterVolume: 0.8, tracks: [] });
});

afterEach(cleanup);

describe('MASTER view', () => {
  it('Bypass is a toggle button that reports its state', () => {
    render(<StudioView isReady={false} />);
    const bypass = screen.getByRole('button', { name: 'Bypass' });
    expect(bypass).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(bypass);
    expect(useStore.getState().masteringBypass).toBe(true);
    expect(bypass).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(bypass);
    expect(useStore.getState().masteringBypass).toBe(false);
    expect(bypass).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks Bypass on with white/10, not a colour', () => {
    useStore.setState({ masteringBypass: true });
    render(<StudioView isReady={false} />);
    const bypass = screen.getByRole('button', { name: 'Bypass' });
    expect(bypass.style.backgroundColor).toBe('rgba(255, 255, 255, 0.1)');
    expect(bypass.style.color).not.toContain('239, 68, 68');
  });

  it('hides Gain Match, which did nothing', () => {
    render(<StudioView isReady={false} />);
    expect(screen.queryByText('Gain Match')).toBeNull();
  });

  it('labels the master meter Peak, not LUFS', () => {
    render(<StudioView isReady={false} />);
    expect(screen.getByText('Peak')).toBeInTheDocument();
    expect(screen.queryByText('LUFS')).toBeNull();
  });

  it('says Bypass is for listening: exports keep the mastering', () => {
    render(<StudioView isReady={false} />);
    const bypass = screen.getByRole('button', { name: 'Bypass' });
    expect(bypass).toHaveAttribute('title', expect.stringMatching(/export/i));
  });

  it.each([
    [50, `${MINUS}6.0 dBFS`],
    [99, `${MINUS}0.1 dBFS`],
    [100, '0.0 dBFS'],
    [1, `${MINUS}40 dBFS`],
    [0, `${MINUS}∞ dBFS`],
  ])('reads a level of %i as %s', (level, text) => {
    meter.level = level;
    render(<StudioView isReady={false} />);
    expect(peakReadout()).toBe(text);
  });

  it.each([
    [0.8, `${MINUS}1.9`],
    [1, '0.0'],
    [0, `${MINUS}∞`],
  ])(
    'reads a master fader at %f as %s dB, as the Create Master row does',
    (gain, db) => {
      useStore.setState({ masterVolume: gain });
      // The mixer, and its master strip, show once there is a track.
      useStore.getState().addTrack('midi', 'piano-sampler', 'Keys');
      render(<StudioView isReady={false} />);
      expect(masterFaderReadout()).toBe(`${db} dB`);
      cleanup();

      // The Master row's fader says it in its value text.
      render(<MasterRow />);
      expect(
        screen.getByRole('slider', { name: 'Master volume' }),
      ).toHaveAttribute('aria-valuetext', `${db} dB`);
    },
  );
});
