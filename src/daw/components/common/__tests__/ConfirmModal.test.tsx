// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  alphaOf,
  installDawCss,
  resolvedBackground,
} from '@/daw/__tests__/dawTokens';
import { ConfirmModal } from '../ConfirmModal';

// ── ConfirmModal outside .daw-root (design-system-01, shell-11) ─────────────
// Radix portals the dialog to <body>, where the DAW tokens used to be
// undefined: the recording-limit notice's only button, 'OK', was black text
// on nothing. The modal now holds body.daw-active itself, which carries the
// --color-* tokens (daw.css); the card is an opaque surface and the
// non-destructive confirm is the white pill. Nothing in these tests sets the
// class for it.

let removeCss: () => void;
beforeAll(() => {
  removeCss = installDawCss();
});
afterAll(() => removeCss());
afterEach(() => {
  cleanup();
  // Unmounted, the modal lets go of the class again.
  expect(document.body).not.toHaveClass('daw-active');
});

function renderModal(props: { destructive?: boolean; cancel?: boolean } = {}) {
  return render(
    <ConfirmModal
      open
      onOpenChange={() => {}}
      title="Maximum recording length reached"
      description="Recording has stopped."
      confirmLabel="OK"
      cancelLabel={props.cancel ? 'Cancel' : undefined}
      destructive={props.destructive}
    />,
  );
}

/** The dialog card, checked to render outside any .daw-root (portaled). */
function dialogCard(): HTMLElement {
  const card = screen.getByRole('dialog');
  expect(card.closest('.daw-root')).toBeNull();
  return card;
}

describe('ConfirmModal portaled to <body>', () => {
  it('paints an opaque card from the tokens it holds on <body>', () => {
    renderModal();
    expect(document.body).toHaveClass('daw-active');
    const card = dialogCard();
    expect(resolvedBackground(card)).toBe('#1a1a1a');
    expect(alphaOf(resolvedBackground(card))).toBe(1);
  });

  it('owes that opacity to the class: without it the card is see-through', () => {
    // The bug it fixes. The modal never drops the class while mounted, so
    // take it off by hand to show what the card would paint.
    renderModal();
    document.body.classList.remove('daw-active');
    expect(alphaOf(resolvedBackground(dialogCard()))).toBe(0);
  });

  it('holds the class while closed too, for as long as it is mounted', () => {
    // RecordGuard and RecordingLimitModal keep theirs mounted, closed, for
    // the editor's lifetime, so the editor's other overlays have it as well.
    const { unmount } = render(
      <ConfirmModal
        open={false}
        onOpenChange={() => {}}
        title="Overwrite existing recording?"
        description="This track already has a recording."
        confirmLabel="Continue"
      />,
    );
    expect(document.body).toHaveClass('daw-active');
    unmount();
    expect(document.body).not.toHaveClass('daw-active');
  });

  it('makes the non-destructive confirm the white pill', () => {
    renderModal({ cancel: true });
    const ok = screen.getByRole('button', { name: 'OK' });
    const style = getComputedStyle(ok);
    expect(style.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(style.color).toBe('rgb(16, 16, 18)');
    expect(ok).toHaveClass('rounded-full');
    // Cancel is a quiet white/10 pill beside it, never a second primary. Its
    // fill is the class alone: an inline one would also beat the hover step.
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    expect(cancel).toHaveClass('rounded-full', 'bg-white/10');
    expect(cancel.style.backgroundColor).toBe('');
  });

  it('keeps the red fill for a destructive confirm', () => {
    renderModal({ destructive: true, cancel: true });
    const ok = screen.getByRole('button', { name: 'OK' });
    expect(resolvedBackground(ok)).toBe('#ef4444');
    expect(getComputedStyle(ok).color).toBe('rgb(255, 255, 255)');
  });
});
