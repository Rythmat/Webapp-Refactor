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

vi.mock('@/contexts/AuthContext/hooks/useAuthToken', () => ({
  useAuthToken: () => 'tok',
}));
// Leaving opens a new project through openSession; not under test here.
vi.mock('@/daw/session/openSession', () => ({
  openSession: vi.fn(async () => ({ status: 'cancelled' })),
}));

import { alphaOf, installDawCss, resolveVars } from '@/daw/__tests__/dawTokens';
import { useStore } from '@/daw/store';
import { LeaveSavePrompt } from '../ui/LeaveSavePrompt';

// ── The leave prompt renders as a real dialog (collab-10) ───────────────────
// It portals to <body>, where its surface, hairline and teal primary used to
// resolve to nothing: a borderless see-through card whose most important
// choice, Save & Leave, had no fill. The tokens are on :root now (plan 2.1),
// so the card is opaque, and Save & Leave is the app's white pill.

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
});

describe('LeaveSavePrompt', () => {
  it('is a dialog outside .daw-root, on the opaque popover surface', () => {
    render(<LeaveSavePrompt />);
    const dialog = screen.getByRole('dialog', {
      name: 'Save project before leaving?',
    });
    expect(dialog.closest('.daw-root')).toBeNull();
    expect(dialog).toHaveClass('bg-daw-popover');
    expect(resolveVars(dialog, 'var(--daw-popover)')).toBe('#141416');
    expect(alphaOf(resolveVars(dialog, 'var(--daw-popover)'))).toBe(1);
  });

  it('makes Save & Leave the one white pill', () => {
    render(<LeaveSavePrompt />);
    const save = screen.getByRole('button', { name: 'Save & Leave' });
    expect(save).toHaveAttribute('data-variant', 'primary');
    for (const name of ["Discard this session's changes", 'Cancel']) {
      const other = screen.getByRole('button', { name });
      expect(other.getAttribute('data-variant'), name).not.toBe('primary');
    }
  });

  it('can be closed while the session runs, never once the host has left', () => {
    render(<LeaveSavePrompt />);
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
    cleanup();

    useStore.getState()._setConnectionStatus('disconnected');
    render(<LeaveSavePrompt />);
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
  });
});
