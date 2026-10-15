// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { frameTaskNames } from '@/daw/engine/engineClock';
import { Spotlight } from '../Spotlight';
import {
  anchorEl,
  flushFrame,
  setBox,
  stubFrames,
  stubReducedMotion,
} from './anchorTestUtils';

// ── The lesson spotlight (ia-flows-29, practice-tutorial-17) ────────────────
// The dim is a static SVG with a mask hole at the target, at the same 40%
// darkness as the old 9999 px box-shadow; the ring keeps its 2 px accent and
// 16 px glow 6 px outside the target, and pulses with opacity only. Under
// prefers-reduced-motion nothing animates.

const BOX = { top: 100, left: 200, width: 80, height: 30 };
const PAD = 6;

beforeEach(() => {
  stubFrames();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

const frame = () => act(() => flushFrame());

describe('Spotlight', () => {
  it('cuts the dim’s hole at the padded target and rings it', () => {
    stubReducedMotion(false);
    anchorEl('target', BOX);
    render(<Spotlight target="target" />);
    // Nothing until the target is measured, on the next frame.
    expect(screen.queryByTestId('tutorial-spotlight-dim')).toBeNull();
    frame();

    const hole = screen.getByTestId('tutorial-spotlight-hole');
    expect(hole.getAttribute('x')).toBe(String(BOX.left - PAD));
    expect(hole.getAttribute('y')).toBe(String(BOX.top - PAD));
    expect(hole.getAttribute('width')).toBe(String(BOX.width + PAD * 2));
    expect(hole.getAttribute('height')).toBe(String(BOX.height + PAD * 2));
    expect(hole.getAttribute('rx')).toBe('8');

    const dim = screen.getByTestId('tutorial-spotlight-dim');
    const fill = dim.querySelector('rect[mask]')!;
    expect(fill.getAttribute('fill')).toBe('rgba(6, 8, 12, 0.4)');
    expect(fill.getAttribute('mask')).toMatch(/^url\(#tutorial-spotlight-/);
    // The dim never animates.
    expect(dim.getAttribute('style') ?? '').not.toMatch(/animation|transition/);

    const ring = screen.getByTestId('tutorial-spotlight-ring');
    expect(ring).toHaveAttribute('aria-hidden', 'true');
    expect(ring).toHaveAttribute('data-tutorial-anchor', 'target');
    expect(ring.style.transform).toBe(
      `translate(${BOX.left - PAD}px, ${BOX.top - PAD}px)`,
    );
    expect(ring.style.width).toBe(`${BOX.width + PAD * 2}px`);
    expect(ring.style.boxShadow).toContain('0 0 0 2px');
    expect(ring.style.boxShadow).toContain('0 0 16px 4px');
    expect(ring.style.boxShadow).not.toContain('9999px');
    expect(ring.style.animation).toBe('');
    expect(ring.style.transition).toContain('transform 120ms');

    // The pulse animates opacity only, on its own glow layer.
    const pulse = screen.getByTestId('tutorial-spotlight-pulse');
    expect(pulse.style.animation).toContain('tutorialPulse');
    expect(pulse.style.willChange).toBe('opacity');
  });

  it('follows the target and stops measuring once it is still', () => {
    stubReducedMotion(false);
    const el = anchorEl('target', BOX);
    render(<Spotlight target="target" />);
    frame();
    frame();
    expect(frameTaskNames()).toEqual([]);

    setBox(el, { ...BOX, top: 300 });
    act(() => window.dispatchEvent(new Event('resize')));
    frame();
    expect(
      screen.getByTestId('tutorial-spotlight-hole').getAttribute('y'),
    ).toBe(String(300 - PAD));
    frame();
    expect(frameTaskNames()).toEqual([]);
  });

  it('neither pulses nor glides under reduced motion', () => {
    stubReducedMotion(true);
    anchorEl('target', BOX);
    render(<Spotlight target="target" />);
    frame();
    const ring = screen.getByTestId('tutorial-spotlight-ring');
    expect(ring.style.transition).toBe('none');
    expect(screen.queryByTestId('tutorial-spotlight-pulse')).toBeNull();
    expect(document.querySelector('[style*="tutorialPulse"]')).toBeNull();
    // The look is otherwise the same.
    expect(ring.style.boxShadow).toContain('0 0 16px 4px');
    expect(screen.getByTestId('tutorial-spotlight-hole')).toBeInTheDocument();
  });

  it('renders nothing when no target resolves', () => {
    stubReducedMotion(false);
    render(<Spotlight target="missing" />);
    frame();
    expect(screen.queryByTestId('tutorial-spotlight-dim')).toBeNull();
    expect(screen.queryByTestId('tutorial-spotlight-ring')).toBeNull();
  });

  it('rings the step’s rack for an fx-add-* target', () => {
    stubReducedMotion(false);
    anchorEl('fx-add-compressor', BOX, { rack: 'track' });
    anchorEl('fx-add-compressor', { ...BOX, top: 500 }, { rack: 'master' });
    render(<Spotlight target="fx-add-compressor" rack="master" />);
    frame();
    expect(
      screen.getByTestId('tutorial-spotlight-hole').getAttribute('y'),
    ).toBe(String(500 - PAD));
  });
});
