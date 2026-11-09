// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  alphaOf,
  installDawCss,
  resolvedBackground,
} from '@/daw/__tests__/dawTokens';
import { frameTaskNames } from '@/daw/engine/engineClock';
import { CoachCard, computeCardPos } from '../CoachCard';
import {
  anchorEl,
  flushFrame,
  setBox,
  stubFrames,
  stubReducedMotion,
} from './anchorTestUtils';

// ── The lesson coach card (design-system-02, ia-flows-32) ───────────────────
// Next is the step's main action, so it is the app's white pill: #101012 on
// white, where white on the old teal fill was about 1.8:1. The card reads its
// tokens from :root, as every overlay portaled to <body> does, rather than
// copying them onto its portal (practice-tutorial-24).

let removeCss: () => void;
beforeAll(() => {
  removeCss = installDawCss();
});
afterAll(() => removeCss());
afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

const noop = () => {};

function renderCard(props: Partial<ComponentProps<typeof CoachCard>> = {}) {
  render(
    <CoachCard
      title="Make your first track"
      stage="Step 1"
      instruction="Press **Play** to hear the beat."
      stepIndex={0}
      total={5}
      status="waiting"
      isValidated={false}
      isLast={false}
      onBack={noop}
      onNext={noop}
      onQuit={noop}
      {...props}
    />,
  );
}

describe('CoachCard', () => {
  it('makes Next the white pill', () => {
    renderCard();
    const next = screen.getByRole('button', { name: 'Next' });
    const style = getComputedStyle(next);
    expect(next).toBeEnabled();
    expect(style.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(style.color).toBe('rgb(16, 16, 18)');
    expect(style.borderRadius).toBe('9999px');
  });

  it('gives Finish on the last step the same pill', () => {
    renderCard({ stepIndex: 4, isLast: true });
    const finish = screen.getByRole('button', { name: 'Finish' });
    expect(getComputedStyle(finish).backgroundColor).toBe('rgb(255, 255, 255)');
  });

  it('keeps a validated step’s Next quiet until the move is made', () => {
    renderCard({ isValidated: true, status: 'waiting' });
    const next = screen.getByRole('button', { name: 'Next' });
    expect(next).toBeDisabled();
    expect(resolvedBackground(next)).toBe('rgba(255, 255, 255, 0.04)');
  });

  it('paints an opaque card from the tokens on :root', () => {
    renderCard();
    // The card is the fixed element that holds the Quit button (the lesson
    // walkthrough finds it the same way).
    const card = screen
      .getByRole('button', { name: 'Quit tutorial' })
      .closest<HTMLElement>('div[style*="position: fixed"]')!;
    expect(card.closest('.daw-root')).toBeNull();
    expect(resolvedBackground(card)).toBe('#151518');
    expect(alphaOf(resolvedBackground(card))).toBe(1);
  });
});

// ── Where the card sits (practice-tutorial-16) ──────────────────────────────
// The card keeps clear of the spotlighted target, placed from the anchor
// registry's measurements instead of a 150 ms layout poll. jsdom's window is
// 1024×768, and the card measures as its default 380×220 there.

describe('CoachCard position', () => {
  const card = () => screen.getByTestId('tutorial-coach-card');

  it('moves clear of the target each time the registry reports it', () => {
    stubFrames();
    Element.prototype.scrollIntoView = vi.fn();
    const el = anchorEl('target', {
      top: 100,
      left: 500,
      width: 100,
      height: 40,
    });
    renderCard({ target: 'target' });
    // Before the first measurement: low and centred.
    expect(card().style.top).toBe('461px');
    expect(card().style.left).toBe('322px');

    act(() => flushFrame());
    // Below the target, centred on it.
    expect(card().style.top).toBe('156px');
    expect(card().style.left).toBe('360px');

    // The target scrolls down the page: the card goes above it.
    setBox(el, { top: 500, left: 500, width: 100, height: 40 });
    act(() => {
      document.dispatchEvent(new Event('scroll'));
    });
    act(() => flushFrame());
    expect(card().style.top).toBe('264px');

    // And nothing polls once it is still.
    act(() => flushFrame());
    expect(frameTaskNames()).toEqual([]);
  });

  it('glides and fades in, except under reduced motion', () => {
    stubReducedMotion(false);
    renderCard({ isValidated: true });
    expect(card().style.transition).toContain('top 0.3s');
    expect(
      card().querySelector<HTMLElement>('[style*="tutorialDot"]'),
    ).not.toBeNull();
    cleanup();

    stubReducedMotion(true);
    renderCard({ isValidated: true });
    expect(card().style.transition).toBe('none');
    expect(card().style.opacity).not.toBe('0');
    expect(card().querySelector('[style*="tutorialDot"]')).toBeNull();
  });
});

// ── Keeping clear of where the student clicks ───────────────────────────────
// The card avoids the target and any open menu, popover or dialog; when no
// place avoids the target, it covers as little of it as it can.

describe('computeCardPos', () => {
  const VW = 1233;
  const VH = 781;
  const W = 380;
  const H = 240;
  const overlap = (
    a: { top: number; left: number },
    b: { top: number; left: number; width: number; height: number },
  ) =>
    Math.max(
      0,
      Math.min(a.left + W, b.left + b.width) - Math.max(a.left, b.left),
    ) *
    Math.max(0, Math.min(a.top + H, b.top + b.height) - Math.max(a.top, b.top));

  it('sits in the larger gap, centred on the target', () => {
    const target = { top: 100, left: 500, width: 100, height: 40 };
    expect(computeCardPos(target, W, H, VW, VH)).toEqual({
      top: 156,
      left: 360,
    });
  });

  it('moves off an open menu that would sit under it', () => {
    // The Add track menu's Add MIDI row, with its submenu open below-right.
    const row = { top: 288, left: 28, width: 220, height: 40 };
    const submenu = { top: 288, left: 250, width: 208, height: 120 };
    const menu = { top: 240, left: 20, width: 230, height: 130 };
    const pos = computeCardPos(row, W, H, VW, VH, [menu, submenu]);
    expect(overlap(pos, row)).toBe(0);
    expect(overlap(pos, submenu)).toBe(0);
    expect(overlap(pos, menu)).toBe(0);
  });

  it('covers as little as it can of a target nearly the window', () => {
    const mixer = { top: 44, left: 8, width: 880, height: 661 };
    const pos = computeCardPos(mixer, W, H, VW, VH);
    // The right edge: only the last 51 px of the mixer's width.
    expect(pos.left).toBe(VW - W - 16);
    expect(overlap(pos, mixer)).toBeLessThanOrEqual(
      (mixer.left + mixer.width + 12 - pos.left) * H,
    );
  });

  it('never leaves the window', () => {
    const target = { top: 0, left: 0, width: VW, height: VH };
    const pos = computeCardPos(target, W, H, VW, VH);
    expect(pos.left).toBeGreaterThanOrEqual(16);
    expect(pos.top).toBeGreaterThanOrEqual(16);
    expect(pos.left + W).toBeLessThanOrEqual(VW - 16);
    expect(pos.top + H).toBeLessThanOrEqual(VH - 16);
  });
});
