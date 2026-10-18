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
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/daw/shell/notice', () => ({ notice: vi.fn() }));

import { GLOBAL_SCOPE, TRACKS_SCOPE } from '@/daw/commands/keymaps';
import { bindKeymap, type KeymapHandlers } from '@/daw/commands/registry';
import { useStore } from '@/daw/store';
import { notice } from '@/daw/shell/notice';
import { CommandPalette } from '../CommandPalette';
import { usePaletteStore } from '../usePaletteStore';

// ── The command palette (milestone 2.15) ───────────────────────────────────

const unbinds: (() => void)[] = [];

function bind(scope: string, handlers: KeymapHandlers, element?: Element) {
  unbinds.push(
    bindKeymap(
      scope,
      { current: handlers },
      element ? { element: () => element } : {},
    ),
  );
}

const loop = vi.fn();
const addTrack = vi.fn();
const metronome = vi.fn(() => false);
const duplicate = vi.fn();

/** A track row with focus, inside the bound track list. */
function trackRow(): HTMLElement {
  const list = document.createElement('div');
  list.innerHTML = '<button data-testid="row">Keys</button>';
  document.body.appendChild(list);
  bind(TRACKS_SCOPE.id, { 'tracks.duplicate': duplicate }, list);
  const row = list.querySelector<HTMLElement>('button')!;
  row.focus();
  return row;
}

/** The palette as CommandPaletteHost keeps it: open until it says close. */
function Harness({
  opener,
  onOpenChange,
}: {
  opener: Element | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <CommandPalette
      open={open}
      opener={opener}
      onOpenChange={(next) => {
        onOpenChange(next);
        setOpen(next);
      }}
    />
  );
}

function renderPalette(opener: Element | null = trackRow()) {
  const onOpenChange = vi.fn();
  render(<Harness opener={opener} onOpenChange={onOpenChange} />);
  const input = screen.getByTestId('command-palette-input');
  return { onOpenChange, input, opener };
}

const rowIds = () =>
  screen
    .queryAllByTestId('command-palette-item')
    .map((el) => el.getAttribute('data-command-id'));

const selectedId = () =>
  document
    .querySelector('[cmdk-item][data-selected="true"]')
    ?.getAttribute('data-command-id');

beforeEach(() => {
  // cmdk scrolls the active option into view; jsdom has no layout.
  Element.prototype.scrollIntoView = () => {};
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
    window.setTimeout(() => cb(performance.now()), 16),
  );
  useStore.setState({ currentView: 'arrange' });
  for (const fn of [loop, addTrack, duplicate]) fn.mockClear();
  metronome.mockClear();
  vi.mocked(notice).mockClear();
  bind(GLOBAL_SCOPE.id, {
    'transport.loop': loop,
    'transport.metronome': metronome,
    'track.add': addTrack,
  });
});

afterEach(() => {
  while (unbinds.length) unbinds.pop()!();
  cleanup();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  usePaletteStore.setState({ isOpen: false, opener: null });
});

describe('CommandPalette', () => {
  it('lists what works where it was opened, with focus in the field', async () => {
    const { input } = renderPalette();
    await waitFor(() => expect(document.activeElement).toBe(input));
    expect(rowIds()).toEqual([
      'transport.loop',
      'transport.metronome',
      'track.add',
      'tracks.duplicate',
    ]);
    const groups = screen.getAllByTestId('command-palette-group');
    expect(groups.map((g) => g.getAttribute('data-scope'))).toEqual([
      'global',
      'tracks',
    ]);
    expect(groups[1]).toHaveTextContent('Track list');
  });

  it('leaves out the track list’s commands when opened elsewhere', () => {
    trackRow();
    const elsewhere = document.createElement('button');
    document.body.appendChild(elsewhere);
    renderPalette(elsewhere);
    expect(rowIds()).toEqual([
      'transport.loop',
      'transport.metronome',
      'track.add',
    ]);
  });

  it('shows each row’s shortcut, and none for a command without', () => {
    renderPalette();
    const row = (id: string) =>
      document.querySelector<HTMLElement>(`[data-command-id="${id}"]`)!;
    expect(
      within(row('transport.loop')).getByTestId('command-palette-keys'),
    ).toHaveTextContent('L');
    expect(
      within(row('transport.metronome')).getByTestId('command-palette-keys'),
    ).toHaveTextContent('M');
    expect(
      within(row('track.add')).queryByTestId('command-palette-keys'),
    ).toBeNull();
  });

  it('filters as the student types', () => {
    const { input } = renderPalette();
    fireEvent.change(input, { target: { value: 'dupl' } });
    expect(rowIds()).toEqual(['tracks.duplicate']);

    fireEvent.change(input, { target: { value: 'zebra' } });
    expect(rowIds()).toEqual([]);
    expect(screen.getByText('No command here matches “zebra”.')).toBeVisible();

    fireEvent.change(input, { target: { value: '' } });
    expect(rowIds()).toHaveLength(4);
  });

  it('moves the highlight with the arrows, and the field names it', async () => {
    const { input } = renderPalette();
    await waitFor(() => expect(selectedId()).toBe('transport.loop'));
    const active = () => input.getAttribute('aria-activedescendant');
    await waitFor(() =>
      expect(active()).toBe(
        document.querySelector('[data-command-id="transport.loop"]')!.id,
      ),
    );
    expect(input).toHaveAttribute(
      'aria-controls',
      document.querySelector('[cmdk-list]')!.id,
    );

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await waitFor(() => expect(selectedId()).toBe('transport.metronome'));
    await waitFor(() =>
      expect(active()).toBe(
        document.querySelector('[data-command-id="transport.metronome"]')!.id,
      ),
    );
  });

  it('highlights the first match again as the list changes', async () => {
    const { input } = renderPalette();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await waitFor(() => expect(selectedId()).toBe('transport.metronome'));
    fireEvent.change(input, { target: { value: 'track' } });
    await waitFor(() => expect(selectedId()).toBe(rowIds()[0]));
  });

  it('closes on Return, then runs the command where it was opened', async () => {
    const { input, onOpenChange, opener } = renderPalette();
    fireEvent.change(input, { target: { value: 'duplicate' } });
    await waitFor(() => expect(selectedId()).toBe('tracks.duplicate'));
    // The command waits for the close: nothing has run as it closes.
    let ranBeforeClose: number | undefined;
    onOpenChange.mockImplementation(() => {
      ranBeforeClose = duplicate.mock.calls.length;
    });

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(ranBeforeClose).toBe(0);
    expect(duplicate).not.toHaveBeenCalled();

    await waitFor(() => expect(duplicate).toHaveBeenCalledTimes(1));
    const e = duplicate.mock.calls[0][0] as KeyboardEvent;
    expect(e.target).toBe(opener);
    expect(e.code).toBe('KeyD');
    // Focus is back where it was.
    expect(document.activeElement).toBe(opener);
    expect(screen.queryByTestId('command-palette')).toBeNull();
    expect(notice).not.toHaveBeenCalled();
  });

  it('runs the command a click picks', async () => {
    renderPalette();
    fireEvent.click(
      document.querySelector('[data-command-id="track.add"]') as HTMLElement,
    );
    await waitFor(() => expect(addTrack).toHaveBeenCalledTimes(1));
  });

  it('closes on Escape and runs nothing', async () => {
    const { input, onOpenChange, opener } = renderPalette();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() =>
      expect(screen.queryByTestId('command-palette')).toBeNull(),
    );
    await act(() => new Promise((r) => setTimeout(r, 50)));
    expect(loop).not.toHaveBeenCalled();
    expect(duplicate).not.toHaveBeenCalled();
    expect(notice).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(opener);
  });

  it('says so when the command finds nothing to do', async () => {
    const { input } = renderPalette();
    fireEvent.change(input, { target: { value: 'metronome' } });
    await waitFor(() => expect(selectedId()).toBe('transport.metronome'));
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(notice).toHaveBeenCalledTimes(1));
    expect(metronome).toHaveBeenCalledTimes(1);
    expect(vi.mocked(notice).mock.calls[0][0]).toMatchObject({
      title: 'Metronome on / off',
    });
  });

  it('closes on its own keys in the field', () => {
    for (const init of [
      { code: 'KeyK', metaKey: true },
      { code: 'KeyK', ctrlKey: true },
      { code: 'KeyP', metaKey: true, shiftKey: true },
    ]) {
      const { input, onOpenChange } = renderPalette();
      const event = fireEvent.keyDown(input, init);
      expect(onOpenChange).toHaveBeenCalledWith(false);
      // Kept from the browser.
      expect(event).toBe(false);
      cleanup();
      while (unbinds.length > 1) unbinds.pop()!();
    }
  });

  it('stays open on K typed into the field', () => {
    const { input, onOpenChange } = renderPalette();
    fireEvent.keyDown(input, { code: 'KeyK', key: 'k' });
    fireEvent.keyDown(input, { code: 'KeyP', key: 'p', metaKey: true });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('opens the shortcut sheet from its footer, after it closes', async () => {
    const sheet = vi.fn();
    bind(GLOBAL_SCOPE.id, { 'help.shortcuts': sheet });
    const { onOpenChange } = renderPalette();
    fireEvent.click(screen.getByRole('button', { name: 'All shortcuts' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(sheet).toHaveBeenCalledTimes(1));
  });
});

describe('usePaletteStore', () => {
  it('remembers the focused element as the opener', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();
    usePaletteStore.getState().open();
    expect(usePaletteStore.getState()).toMatchObject({
      isOpen: true,
      opener: button,
    });
    usePaletteStore.getState().close();
    expect(usePaletteStore.getState().isOpen).toBe(false);
  });

  it('opens for the page when focus is in a menu, or nowhere', () => {
    const menu = document.createElement('div');
    menu.innerHTML =
      '<div role="menu"><div role="menuitem" tabindex="-1">Find a command</div></div>';
    document.body.appendChild(menu);
    menu.querySelector<HTMLElement>('[role="menuitem"]')!.focus();
    usePaletteStore.getState().open();
    expect(usePaletteStore.getState()).toMatchObject({
      isOpen: true,
      opener: null,
    });

    (document.activeElement as HTMLElement).blur();
    usePaletteStore.setState({ isOpen: false, opener: menu });
    usePaletteStore.getState().open();
    expect(usePaletteStore.getState().opener).toBeNull();
  });
});
