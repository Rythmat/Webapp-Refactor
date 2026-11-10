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
// A ring around the target and nothing else: the Studio isn't dimmed (owner,
// 2026-11-10). The ring keeps its 2 px accent and 16 px glow 6 px outside
// the target, and pulses with opacity only. Under prefers-reduced-motion
// nothing animates.

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
/** The ring's top edge, from its transform. */
const ringTop = () =>
  /translate\([^,]+, ([-\d.]+)px\)/.exec(
    screen.getByTestId('tutorial-spotlight-ring').style.transform,
  )?.[1];

describe('Spotlight', () => {
  it('rings the padded target and dims nothing', () => {
    stubReducedMotion(false);
    anchorEl('target', BOX);
    render(<Spotlight target="target" />);
    // Nothing until the target is measured, on the next frame.
    expect(screen.queryByTestId('tutorial-spotlight-ring')).toBeNull();
    frame();

    // No full-screen layer over the Studio.
    expect(screen.queryByTestId('tutorial-spotlight-dim')).toBeNull();
    expect(document.querySelector('svg')).toBeNull();

    const ring = screen.getByTestId('tutorial-spotlight-ring');
    expect(ring).toHaveAttribute('aria-hidden', 'true');
    expect(ring).toHaveAttribute('data-tutorial-anchor', 'target');
    expect(ring.style.transform).toBe(
      `translate(${BOX.left - PAD}px, ${BOX.top - PAD}px)`,
    );
    expect(ring.style.width).toBe(`${BOX.width + PAD * 2}px`);
    expect(ring.style.height).toBe(`${BOX.height + PAD * 2}px`);
    expect(ring.style.borderRadius).toBe('8px');
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
    expect(ringTop()).toBe(String(300 - PAD));
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
  });

  it('renders nothing when no target resolves', () => {
    stubReducedMotion(false);
    render(<Spotlight target="missing" />);
    frame();
    expect(screen.queryByTestId('tutorial-spotlight-ring')).toBeNull();
  });

  it('rings the step’s rack for an fx-add-* target', () => {
    stubReducedMotion(false);
    anchorEl('fx-add-compressor', BOX, { rack: 'track' });
    anchorEl('fx-add-compressor', { ...BOX, top: 500 }, { rack: 'master' });
    render(<Spotlight target="fx-add-compressor" rack="master" />);
    frame();
    expect(ringTop()).toBe(String(500 - PAD));
  });
});
