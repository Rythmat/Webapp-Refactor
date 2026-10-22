// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── The top bar (milestones 2.5, 2.7, B4a) ─────────────────────────────────
// Three zones (project, views, share), the lesson anchors kept, '⋯', and
// the fold: in a window too narrow for the zones, the bar takes every fold
// step. The transport and the song are the bottom rail's, the Inspector's
// toggle the side rail's (B4a). The white Export pill (2.15) sits between
// '⋯' and the avatar, the bar's one primary button, and folds to its icon
// last; '⋯' has Find a command, the palette.
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
import {
  DEFAULT_EXPORT_CHOICES,
  useExportDialogStore,
} from '@/daw/shell/export/exportDialogStore';
import { usePaletteStore } from '@/daw/shell/help/usePaletteStore';
import { useStore } from '@/daw/store';
import { TopBar } from '../TopBar';
import { MAX_FOLD } from '../useToolbarOverflow';

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
  useExportDialogStore.setState({
    isOpen: false,
    tab: 'audio',
    choices: DEFAULT_EXPORT_CHOICES,
  });
  usePaletteStore.setState({ isOpen: false, opener: null });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('the top bar', () => {
  it('has the project, transport and song-and-share zones, with the lesson anchors', () => {
    renderBar();
    for (const name of ['Project', 'Transport', 'Song and account']) {
      expect(screen.getByRole('group', { name })).toBeInTheDocument();
    }
    // The floating frame (S0): each zone's controls sit in pills.
    for (const name of [
      'Project name and menu',
      'Undo and redo',
      'Transport controls',
      'Position',
      'Song',
      'More',
    ]) {
      expect(screen.getByRole('group', { name })).toHaveClass('bg-daw-pill');
    }
    for (const id of ['file-menu', 'transport-bpm']) {
      expect(
        document.querySelector(`[data-tutorial-id="${id}"]`),
      ).not.toBeNull();
    }
    expect(screen.getByTestId('transport-play')).toBeInTheDocument();
    // The view tabs are the bottom rail's (2026-10-21).
    expect(screen.queryByRole('tab', { name: 'Mix' })).toBeNull();
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
      // B4a: the Song chip and the Inspector's toggle left the bar.
      'song-chip',
      'inspector-toggle',
    ]) {
      expect(screen.queryByTestId(id)).toBeNull();
    }
    // 2026-10-21: sessions are the side rail's People panel's alone, and the
    // save chip shows only when work is at risk.
    expect(screen.queryByTestId('share-pill')).toBeNull();
    // The chip keeps its state on a hidden marker; nothing of it shows.
    expect(screen.getByTestId('save-chip')).not.toBeVisible();
    // Metronome, Back to start, Record, Play, Loop: no bar skips.
    const transport = screen.getByRole('group', { name: 'Transport controls' });
    expect(
      within(transport)
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label')),
    ).toEqual(['Metronome', 'Back to start', 'Record', 'Play', 'Loop']);
    expect(screen.getByTestId('top-bar')).toHaveAttribute('data-fold', '0');
  });

  it('opens the metronome settings from ⋯, under the metronome', async () => {
    renderBar();
    fireEvent.keyDown(screen.getByTestId('top-bar-overflow'), {
      key: 'Enter',
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('metronome-settings-menu-item'));
    });
    await waitFor(() =>
      expect(screen.getByTestId('click-menu')).toBeInTheDocument(),
    );
  });

  it('holds Snap to grid and Timeline display in ⋯', () => {
    renderBar();
    fireEvent.keyDown(screen.getByTestId('top-bar-overflow'), {
      key: 'Enter',
    });
    expect(screen.getByTestId('grid-menu')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-display-menu')).toBeInTheDocument();
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

  it('folds when the window is too narrow, Export to its icon last', () => {
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
    // Three steps since 2.15: the name, the tabs, then Export's label.
    expect(MAX_FOLD).toBe(3);
    expect(screen.getByTestId('top-bar')).toHaveAttribute(
      'data-fold',
      String(MAX_FOLD),
    );
    const pill = screen.getByTestId('export-pill');
    expect(pill).toHaveAccessibleName('Export');
    expect(pill).not.toHaveTextContent('Export');
    fireEvent.click(pill);
    expect(useExportDialogStore.getState().isOpen).toBe(true);
  });

  it('has the white Export pill between ⋯ and the avatar', () => {
    renderBar();
    const share = screen.getByRole('group', { name: 'Song and account' });
    const pill = within(share).getByTestId('export-pill');
    expect(pill).toHaveTextContent('Export');
    expect(pill).toHaveAttribute('data-tutorial-id', 'export-pill');
    const after = (a: Element, b: Element) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(after(screen.getByTestId('top-bar-overflow'), pill)).toBe(true);
    expect(after(pill, screen.getByTestId('avatar-menu'))).toBe(true);
  });

  it('has Export as its only primary button', () => {
    renderBar();
    const primaries = screen
      .getByTestId('top-bar')
      .querySelectorAll('[data-variant="primary"]');
    expect(primaries).toHaveLength(1);
    expect(primaries[0]).toBe(screen.getByTestId('export-pill'));
  });

  it('opens the Export dialog on Audio from the pill', () => {
    useExportDialogStore.setState({ tab: 'notation' });
    renderBar();
    fireEvent.click(screen.getByTestId('export-pill'));
    expect(useExportDialogStore.getState()).toMatchObject({
      isOpen: true,
      tab: 'audio',
    });
  });

  it('opens the command palette from ⋯ ▸ Find a command', () => {
    renderBar();
    fireEvent.keyDown(screen.getByTestId('top-bar-overflow'), {
      key: 'Enter',
    });
    const item = screen.getByTestId('palette-menu-item');
    expect(item).toHaveTextContent('Find a command');
    expect(usePaletteStore.getState().isOpen).toBe(false);
    fireEvent.click(item);
    expect(usePaletteStore.getState().isOpen).toBe(true);
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
