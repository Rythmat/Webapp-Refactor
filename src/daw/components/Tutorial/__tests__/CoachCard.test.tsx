// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  alphaOf,
  installDawCss,
  resolvedBackground,
} from '@/daw/__tests__/dawTokens';
import { CoachCard } from '../CoachCard';

// ── The lesson coach card (design-system-02, ia-flows-32) ───────────────────
// Next is the step's main action, so it is the app's white pill: #101012 on
// white, where white on the old teal fill was about 1.8:1. The card reads its
// tokens from body.daw-active, which TutorialLayer holds around it rather
// than copying them onto its portal (practice-tutorial-24). Rendered alone
// here, the tests that need the tokens set the class the way the layer does.

let removeCss: () => void;
beforeAll(() => {
  removeCss = installDawCss();
});
afterAll(() => removeCss());
afterEach(() => {
  cleanup();
  document.body.classList.remove('daw-active');
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
    document.body.classList.add('daw-active');
    renderCard({ isValidated: true, status: 'waiting' });
    const next = screen.getByRole('button', { name: 'Next' });
    expect(next).toBeDisabled();
    expect(resolvedBackground(next)).toBe('#1e1e1e');
  });

  it('paints an opaque card from the tokens on body.daw-active', () => {
    document.body.classList.add('daw-active');
    renderCard();
    // The card is the fixed element that holds the Quit button (the lesson
    // walkthrough finds it the same way).
    const card = screen
      .getByRole('button', { name: 'Quit tutorial' })
      .closest<HTMLElement>('div[style*="position: fixed"]')!;
    expect(card.closest('.daw-root')).toBeNull();
    expect(resolvedBackground(card)).toBe('#1a1a1a');
    expect(alphaOf(resolvedBackground(card))).toBe(1);
  });
});
