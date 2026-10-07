// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useStore } from '@/daw/store';
import { StudioView } from '../StudioView';

// ── The MASTER view says what the audio does (fx-mixer-02/03, ia-flows-35) ─
// Bypass is a real pressed/unpressed toggle (playback follows it), Gain
// Match had no handler and is hidden, and the meter that read "LUFS" was a
// rescaled peak, so it now says Peak and reads dBFS, in whole dB: its source
// is an 8-bit peak in whole percent.

const meter = vi.hoisted(() => ({ level: 0 }));
vi.mock('@/daw/hooks/useMeterLevel', () => ({
  useMeterLevel: () => meter.level,
}));

/** The master Peak meter's readout. */
const peakReadout = () =>
  screen.getByText('Peak').previousElementSibling?.textContent;

beforeEach(() => {
  meter.level = 0;
  useStore.setState({ masteringBypass: false });
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
    [50, '-6 dBFS'],
    [99, '0 dBFS'],
    [1, '-40 dBFS'],
    [0, '-inf'],
  ])('reads a level of %i as %s, no false decimals', (level, text) => {
    meter.level = level;
    render(<StudioView isReady={false} />);
    expect(peakReadout()).toBe(text);
  });
});
