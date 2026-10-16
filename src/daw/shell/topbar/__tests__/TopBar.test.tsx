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

// ── The top bar (milestone 2.5) ────────────────────────────────────────────
// Three zones, the lesson anchors kept, the Inspector toggle, and the fold:
// in a window too narrow for the zones, the bar takes every fold step and
// the '⋯' menu holds what it folded (Help, Settings, the count-in).
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

import { useStore } from '@/daw/store';
import { TopBar } from '../TopBar';

const s = () => useStore.getState();

function renderBar() {
  return render(
    <MemoryRouter>
      <TopBar isReady onInit={() => {}} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('the top bar', () => {
  it('has the project, transport and views zones, with the lesson anchors', () => {
    renderBar();
    for (const name of ['Project', 'Transport', 'Song and views']) {
      expect(screen.getByRole('group', { name })).toBeInTheDocument();
    }
    for (const id of [
      'file-menu',
      'song-chip',
      'view-switch-arrange',
      'view-switch-studio',
      'view-switch-score',
      'view-switch-leadsheet',
    ]) {
      expect(
        document.querySelector(`[data-tutorial-id="${id}"]`),
      ).not.toBeNull();
    }
    expect(screen.getByRole('tab', { name: 'Mix' })).toBeInTheDocument();
    // Wide enough (jsdom measures nothing): nothing folded.
    expect(screen.queryByTestId('top-bar-overflow')).toBeNull();
    expect(screen.getByTestId('settings-button')).toBeInTheDocument();
  });

  it('opens and closes the Inspector, kept for the view', () => {
    renderBar();
    const toggle = screen.getByTestId('inspector-toggle');
    const before = s().libraryOpen;
    fireEvent.click(toggle);
    expect(s().libraryOpen).toBe(!before);
    expect(s().inspectorOpenByView.arrange).toBe(!before);
  });

  it('adds Practice first while a practice session exists', () => {
    act(() =>
      useStore.setState({ practiceSession: { kind: 'theory' } as never }),
    );
    renderBar();
    const tabs = screen.getAllByRole('tab').map((t) => t.textContent);
    expect(tabs[0]).toBe('Practice');
  });

  it('folds into the ⋯ menu when the window is too narrow', () => {
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
    expect(screen.getByTestId('top-bar')).toHaveAttribute('data-fold', '7');
    expect(screen.queryByTestId('settings-button')).toBeNull();
    expect(screen.queryByTestId('help-menu')).toBeNull();
    expect(screen.queryByTestId('count-in-menu')).toBeNull();
    expect(screen.getByTestId('share-pill')).not.toHaveTextContent('Share');
    const more = screen.getByTestId('top-bar-overflow');
    fireEvent.keyDown(more, { key: 'Enter' });
    for (const name of [
      /Keyboard shortcuts/,
      /Lessons/,
      /Audio & MIDI settings/,
    ]) {
      expect(screen.getByRole('menuitem', { name })).toBeInTheDocument();
    }
    expect(
      screen.getByRole('menuitemradio', { name: 'Count in 1 bar' }),
    ).toBeInTheDocument();
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
