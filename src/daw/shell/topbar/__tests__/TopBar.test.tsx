// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── The top bar (milestones 2.5, 2.7, B4a) ─────────────────────────────────
// Three zones (project, views, share), the lesson anchors kept, '⋯', and
// the fold: in a window too narrow for the zones, the bar takes every fold
// step. The transport and the song are the bottom rail's, the Inspector's
// toggle the side rail's (B4a).
//
// Run: npx vitest run src/daw/shell/topbar/__tests__/TopBar.test.tsx

vi.mock('@/contexts/AuthContext/hooks/useAuthToken', () => ({
  useAuthToken: () => 'tok',
}));
vi.mock('@/components/ClassroomLayout/useTopRailStats', () => ({
  useTopRailStats: () => ({
    totalXp: 1250,
    level: 4,
    streakDays: 3,
    unlockedCount: 2,
    notificationCount: 0,
    userName: 'Ana Lee',
    avatarConfig: undefined,
  }),
}));
vi.mock('@/components/ui/UserAvatarPattern', () => ({
  UserAvatarPattern: () => null,
}));
vi.mock('@/daw/components/Prism/CircleOfFifths', () => ({
  CircleOfFifths: () => null,
}));
vi.mock('@/daw/hooks/useTransport', () => ({ seekTo: vi.fn() }));

import { useMusicalTypingStore } from '@/daw/commands/musicalTypingStore';
import { useStore } from '@/daw/store';
import { TopBar } from '../TopBar';

function renderBar() {
  return render(
    <MemoryRouter>
      <TopBar />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  useMusicalTypingStore.setState({ enabled: false });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('the top bar', () => {
  it('has the project, views and share zones, with the lesson anchors', () => {
    renderBar();
    for (const name of ['Project', 'Views', 'Share and account']) {
      expect(screen.getByRole('group', { name })).toBeInTheDocument();
    }
    for (const id of [
      'file-menu',
      'view-switch-arrange',
      'view-switch-studio',
      'view-switch-score',
    ]) {
      expect(
        document.querySelector(`[data-tutorial-id="${id}"]`),
      ).not.toBeNull();
    }
    expect(screen.getByRole('tab', { name: 'Mix' })).toBeInTheDocument();
    // One Score tab for both layouts (2026-10-16): the Lead sheet's anchor
    // is on the Score page's own switch.
    expect(screen.queryByRole('tab', { name: 'Lead sheet' })).toBeNull();
    // Trimmed (2.7): no Back, Forward or Stop; Help, Settings and the
    // computer keyboard's switch are in '⋯'; Share is an icon; the typing
    // chip shows only while typing is on.
    for (const id of [
      'transport-back',
      'transport-forward',
      'transport-stop',
      'settings-button',
      'help-menu',
      'musical-typing-chip',
      // B4a: in the rails now.
      'transport-play',
      'song-chip',
      'inspector-toggle',
    ]) {
      expect(screen.queryByTestId(id)).toBeNull();
    }
    expect(screen.getByTestId('share-pill')).not.toHaveTextContent('Share');
    expect(screen.getByTestId('top-bar')).toHaveAttribute('data-fold', '0');
  });

  it('keeps Help, Settings and the computer keyboard in ⋯', () => {
    renderBar();
    fireEvent.keyDown(screen.getByTestId('top-bar-overflow'), {
      key: 'Enter',
    });
    for (const name of [
      /Keyboard shortcuts/,
      /Lessons/,
      /Audio & MIDI settings/,
    ]) {
      expect(screen.getByRole('menuitem', { name })).toBeInTheDocument();
    }
    fireEvent.click(
      screen.getByRole('menuitemcheckbox', {
        name: /Play notes from the computer keyboard/,
      }),
    );
    expect(screen.getByTestId('musical-typing-chip')).toHaveTextContent(
      'Typing',
    );
  });

  it('adds Practice first while a practice session exists', () => {
    act(() =>
      useStore.setState({ practiceSession: { kind: 'theory' } as never }),
    );
    renderBar();
    const tabs = screen.getAllByRole('tab').map((t) => t.textContent);
    expect(tabs[0]).toBe('Practice');
  });

  it('folds when the window is too narrow', () => {
    // A 600 px bar with zones that need 400 px each: every fold step.
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.dataset.testid === 'top-bar' ? 600 : 0;
      },
    );
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.dataset.zone ? 400 : 0;
      },
    );
    renderBar();
    expect(screen.getByTestId('top-bar')).toHaveAttribute('data-fold', '2');
  });

  it('shows the student in the account menu', () => {
    renderBar();
    fireEvent.keyDown(screen.getByTestId('avatar-menu'), { key: 'Enter' });
    expect(screen.getByTestId('avatar-menu-stats')).toHaveTextContent(
      'Level 4 · 1,250 XP',
    );
    expect(
      screen.getByRole('menuitem', { name: /Back to Studio/ }),
    ).toBeInTheDocument();
  });
});
