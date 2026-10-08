// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
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

vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ token: 'tok', userId: 'u1' }),
}));
vi.mock('@/daw/collab/CollabProvider', () => ({
  useCollab: () => ({ leaveRoom: () => {} }),
}));
vi.mock('@/lib/studio-projects/newProject', () => ({
  resetToNewProject: () => {},
}));

import {
  alphaOf,
  installDawCss,
  resolveVars,
  resolvedBackground,
} from '@/daw/__tests__/dawTokens';
import { useStore } from '@/daw/store';
import { LeaveSavePrompt } from '../ui/LeaveSavePrompt';

// ── The leave prompt renders as a real dialog (collab-10) ───────────────────
// It portals to <body>, where its surface, hairline and teal primary used to
// resolve to nothing: a borderless see-through card whose most important
// choice, Save & Leave, had no fill. It now holds body.daw-active itself, so
// the card is opaque, and Save & Leave is the app's white pill. Nothing in
// these tests sets the class for it.

let removeCss: () => void;
beforeAll(() => {
  removeCss = installDawCss();
});
afterAll(() => removeCss());
beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  useStore.getState()._setConnectionStatus('connected');
  useStore.getState()._setLeavePrompt(true);
});
afterEach(() => {
  cleanup();
  expect(document.body).not.toHaveClass('daw-active');
});

describe('LeaveSavePrompt', () => {
  it('paints an opaque card outside .daw-root', () => {
    render(<LeaveSavePrompt />);
    expect(document.body).toHaveClass('daw-active');
    const card = screen
      .getByText('Save project before leaving?')
      .closest<HTMLElement>('.rounded-xl')!;
    expect(card.closest('.daw-root')).toBeNull();
    expect(resolvedBackground(card)).toBe('#1e1e1e');
    expect(alphaOf(resolvedBackground(card))).toBe(1);
  });

  it('makes Save & Leave the one white pill', () => {
    render(<LeaveSavePrompt />);
    const save = screen.getByRole('button', { name: 'Save & Leave' });
    const style = getComputedStyle(save);
    expect(style.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(style.color).toBe('rgb(16, 16, 18)');
    expect(save).toHaveClass('rounded-full');

    for (const name of ["Discard this session's changes", 'Cancel']) {
      const other = screen.getByRole('button', { name });
      expect(getComputedStyle(other).backgroundColor, name).not.toBe(
        'rgb(255, 255, 255)',
      );
      // Quiet: no fill of their own, and none inline, which would beat the
      // hover class.
      expect(other.style.background, name).toBe('');
      expect(other.style.backgroundColor, name).toBe('');
      // The 12 px label floor (text-xs), Cancel included.
      expect(other, name).toHaveClass('text-xs');
    }
  });

  it('keeps teal out of its chrome now that the tokens resolve', () => {
    render(<LeaveSavePrompt />);
    const card = screen
      .getByText('Save project before leaving?')
      .closest<HTMLElement>('.rounded-xl')!;
    const icon = card.querySelector('svg')!;
    expect(resolveVars(icon, getComputedStyle(icon).color)).toBe('#e8e8f0');
  });
});
