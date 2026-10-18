// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

// ── Every setting explains itself (milestone 2.11, guard) ───────────────────
// Each settings surface in the editor, opened: the Audio & MIDI dialog, the
// Click menu, the Grid menu, the '⋯' menu, the avatar menu's chord notation
// and the '?' sheet's switches. Every SettingRow and every setting in a menu
// (a check or radio item) has a non-empty line, and the line is wired to it
// with aria-describedby (a radio item may take its group's). A setting added
// without its line fails here.
//
// Run: npx vitest run src/daw/ui/__tests__/settingRows.test.tsx

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

import { audioEngine } from '@/daw/audio/AudioEngine';
import { SettingsModal } from '@/daw/components/Transport/SettingsModal';
import { useMusicalTypingStore } from '@/daw/commands/musicalTypingStore';
import { ClickToggle } from '@/daw/shell/bottombar/ClickToggle';
import { GridMenu } from '@/daw/shell/canvas/GridMenu';
import { ShortcutSheet } from '@/daw/shell/help/ShortcutSheet';
import { AvatarMenu } from '@/daw/shell/topbar/AvatarMenu';
import { TopBar } from '@/daw/shell/topbar/TopBar';
import { useStore } from '@/daw/store';
import {
  setChordNotation,
  setChordNotationSwitcherEnabled,
} from '@/lib/chordNotation';
import { installDomShims } from './dom';

/** The text of the elements an element's aria-describedby names. */
function describedBy(el: Element | null | undefined): string {
  return (el?.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
    .join(' ')
    .trim();
}

/**
 * Checks every setting row and setting menu item on the page; returns how
 * many it checked, so a surface that rendered nothing fails too.
 */
function expectEverySettingExplained() {
  const rows = [...document.querySelectorAll('[data-setting-row]')];
  for (const row of rows) {
    const line = row.querySelector('[data-setting-description]');
    const name = row.querySelector('span')?.textContent;
    expect(line?.textContent?.trim(), `${name}: its line`).toBeTruthy();
    // The row describes itself (a group), or its control names the line.
    const wired =
      row.getAttribute('aria-describedby') === line!.id ||
      !!row.querySelector(`[aria-describedby~="${line!.id}"]`);
    expect(wired, `${name}: aria-describedby`).toBe(true);
  }
  const items = [
    ...document.querySelectorAll(
      '[role=menuitemcheckbox], [role=menuitemradio]',
    ),
  ];
  for (const item of items) {
    const own = describedBy(item);
    const group = describedBy(item.closest('[role=group]'));
    expect(own || group, `${item.textContent}: its line`).toBeTruthy();
  }
  return { rows: rows.length, items: items.length };
}

/** A copy line is one plain line: short, and no trailing full stop. */
function expectShort(lines: string[]) {
  for (const line of lines) {
    expect(line.length, line).toBeLessThanOrEqual(60);
    expect(line, line).not.toMatch(/\.$/);
  }
}

const openMenu = (trigger: HTMLElement) =>
  fireEvent.keyDown(trigger, { key: 'Enter' });

beforeAll(installDomShims);
beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  useMusicalTypingStore.setState({ enabled: false });
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn(),
      enumerateDevices: vi.fn(async () => [
        { deviceId: 'mic', kind: 'audioinput', label: 'USB mic', groupId: '' },
        {
          deviceId: 'out',
          kind: 'audiooutput',
          label: 'Headphones',
          groupId: '',
        },
      ]),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  });
  Object.defineProperty(navigator, 'permissions', {
    configurable: true,
    value: { query: vi.fn(async () => ({ state: 'granted' })) },
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setChordNotation('hybrid');
  setChordNotationSwitcherEnabled(false);
});

describe('every setting explains itself', () => {
  it('in the Audio & MIDI dialog, every row and fact', async () => {
    vi.spyOn(audioEngine, 'supportsOutputSelection').mockReturnValue(true);
    useStore.setState({
      settingsOpen: true,
      inputDeviceId: 'mic',
      midiStatus: 'no-device',
    });
    await act(async () => {
      render(<SettingsModal />);
    });
    const { rows } = expectEverySettingExplained();
    // Input device and channels, output device, three facts, MIDI.
    expect(rows).toBe(7);
    for (const name of [
      'Input device',
      'Input channels',
      'Output device',
      'Sample rate',
      'Latency',
      'MIDI devices',
    ]) {
      expect(screen.getByText(name, { selector: 'span' })).toBeInTheDocument();
    }
  });

  it('in the Audio & MIDI dialog without an output picker', async () => {
    vi.spyOn(audioEngine, 'supportsOutputSelection').mockReturnValue(false);
    useStore.setState({ settingsOpen: true, inputDeviceId: null });
    await act(async () => {
      render(<SettingsModal />);
    });
    const { rows } = expectEverySettingExplained();
    // No channels row until an input is chosen; output says why it can't.
    expect(rows).toBe(6);
    expect(screen.getByText(/Choosing an output needs Chrome/)).toBeTruthy();
  });

  it('in the Click menu: sound, volume and count-in', async () => {
    render(<ClickToggle />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('count-in-menu'));
    });
    expect(screen.getByTestId('click-menu')).toBeInTheDocument();
    expect(expectEverySettingExplained().rows).toBe(3);
  });

  it('in the Grid menu: grid, triplets, snap, chord labels, colour', () => {
    render(<GridMenu />);
    openMenu(screen.getByTestId('grid-menu'));
    const { items } = expectEverySettingExplained();
    // Bar to sixteenth (five in 4/4), triplets, snap, two and two.
    expect(items).toBe(5 + 2 + 2 + 2);
    expect(screen.getByRole('group', { name: 'Grid' })).toBeTruthy();
  });

  it('in the Grid menu under a fixed notation, the lock is the line', () => {
    setChordNotationSwitcherEnabled(true);
    setChordNotation('jazz');
    render(<GridMenu />);
    openMenu(screen.getByTestId('grid-menu'));
    expectEverySettingExplained();
    expect(
      describedBy(screen.getByRole('group', { name: 'Chord lane labels' })),
    ).toMatch(/Chord notation: Jazz/);
  });

  it("in '⋯': the computer keyboard and hover hints", () => {
    render(
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>,
    );
    openMenu(screen.getByTestId('top-bar-overflow'));
    const { items } = expectEverySettingExplained();
    expect(items).toBe(2);
    const hints = screen.getByTestId('hover-hints-menu-item');
    expect(hints).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(hints);
    expect(useStore.getState().hoverHints).toBe(false);
  });

  it("in the avatar menu's chord notation", () => {
    setChordNotationSwitcherEnabled(true);
    render(
      <MemoryRouter>
        <AvatarMenu />
      </MemoryRouter>,
    );
    openMenu(screen.getByTestId('avatar-menu'));
    const sub = screen.getByRole('menuitem', { name: 'Chord notation' });
    sub.focus();
    fireEvent.keyDown(sub, { key: 'ArrowRight' });
    const { items } = expectEverySettingExplained();
    expect(items).toBe(3);
  });

  it("in the '?' sheet's two switches", () => {
    render(<ShortcutSheet open onOpenChange={() => {}} />);
    expect(expectEverySettingExplained().rows).toBeGreaterThanOrEqual(2);
  });
});

describe('the copy', () => {
  it('is one short line each', async () => {
    const { AUDIO_MIDI_COPY } = await import(
      '@/daw/components/Transport/SettingsModal'
    );
    const { CLICK_COPY } = await import('@/daw/shell/bottombar/ClickToggle');
    const { GRID_COPY } = await import('@/daw/shell/canvas/GridMenu');
    const { MORE_COPY } = await import('@/daw/shell/topbar/TopBar');
    const { NOTATION_COPY } = await import('@/daw/shell/topbar/AvatarMenu');
    expectShort([
      ...Object.values(AUDIO_MIDI_COPY),
      ...Object.values(CLICK_COPY),
      ...Object.values(GRID_COPY),
      ...Object.values(MORE_COPY),
      ...Object.values(NOTATION_COPY),
    ]);
  });
});
