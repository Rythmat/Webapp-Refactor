// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SpectrumFrame } from '@/daw/hooks/useSpectrumCanvas';

// ── The master's spectrum (milestone 2.10) ─────────────────────────────────
// It taps the master on the meter bus only once the engine is ready (no
// key, no analyser, nothing drawn before), and every colour it paints with
// comes from the DAW palette, since a canvas can't read the CSS tokens.

const hook = vi.hoisted(() => vi.fn());
vi.mock('@/daw/hooks/useSpectrumCanvas', () => ({
  useSpectrumCanvas: hook,
}));

import { getDawPalette } from '@/daw/ui/tokens';
import { Spectrum, SPECTRUM_PX } from '../master/Spectrum';

beforeEach(() => hook.mockClear());
afterEach(cleanup);

/** The key of the hook's last call. */
const lastKey = () => hook.mock.calls.at(-1)?.[0];

/** A 2D context that records the colours it is given. */
function recordingContext() {
  const colours = new Set<string>();
  const gradientStops: string[] = [];
  const ctx = {
    set strokeStyle(v: string) {
      colours.add(v);
    },
    set fillStyle(v: unknown) {
      if (typeof v === 'string') colours.add(v);
    },
    font: '',
    textAlign: '',
    textBaseline: '',
    lineWidth: 0,
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    createLinearGradient: () => ({
      addColorStop: (_at: number, c: string) => gradientStops.push(c),
    }),
  };
  return { ctx, colours, gradientStops };
}

describe('Spectrum', () => {
  it('taps the master only while the engine is ready', () => {
    const { rerender } = render(<Spectrum isReady={false} />);
    expect(hook).toHaveBeenCalled();
    expect(hook.mock.calls.every(([key]) => key === null)).toBe(true);

    rerender(<Spectrum isReady />);
    expect(lastKey()).toBe('master');

    rerender(<Spectrum isReady={false} />);
    expect(lastKey()).toBeNull();
  });

  it('is 96 px tall with a labelled canvas', () => {
    render(<Spectrum isReady />);
    const box = screen.getByTestId('master-spectrum');
    expect(box.style.height).toBe(`${SPECTRUM_PX}px`);
    expect(SPECTRUM_PX).toBe(96);
    expect(
      screen.getByRole('img', { name: 'Spectrum of the master output' }),
    ).toBeInTheDocument();
  });

  it('paints only in the DAW palette’s colours', () => {
    render(<Spectrum isReady />);
    const draw = hook.mock.calls.at(-1)![3] as (f: SpectrumFrame) => void;
    const { ctx, colours, gradientStops } = recordingContext();
    const data = new Uint8Array(1024).map((_, i) => (i * 7) % 256);
    draw({
      ctx: ctx as unknown as CanvasRenderingContext2D,
      width: 240,
      height: SPECTRUM_PX,
      data,
      sampleRate: 48000,
      resized: true,
    });
    const p = getDawPalette();
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalled();
    const allowed = new Set(Object.values(p));
    for (const c of colours) expect(allowed).toContain(c);
    expect(colours).toContain(p.grid);
    expect(colours).toContain(p.text2);
    expect(colours).toContain(p.text3);
    for (const stop of gradientStops) {
      expect(stop).toMatch(new RegExp(`^rgba\\(${p.lineRgb}, [\\d.]+\\)$`));
    }
    // The frequency labels are the 12 px label size or larger.
    expect(parseFloat(ctx.font)).toBeGreaterThanOrEqual(12);
  });
});
