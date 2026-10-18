// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useMusicalTypingStore } from '@/daw/commands/musicalTypingStore';
import { commandsOf } from '@/daw/commands/registry';
import { sortedScopes } from '@/daw/commands/scopeOrder';
import { useStore } from '@/daw/store';
import { ShortcutSheet, sheetSections } from '../ShortcutSheet';
import { usePaletteStore } from '../usePaletteStore';
import { useReportProblemStore } from '../useReportProblemStore';
import { useShortcutSheetStore } from '../useShortcutSheetStore';

// ── The '?' sheet (milestones 1.6 and 2.11) ────────────────────────────────
// Every command with keys, once, under its scope in the shared order; the
// search; the two switches as setting rows; the footer's way to the palette
// and to Report a problem.
//
// Run: npx vitest run src/daw/shell/help/__tests__/ShortcutSheet.test.tsx

/** Every command the sheet should list: declared with keys, not hidden. */
function keyedCommandIds(): string[] {
  return sortedScopes().flatMap((scope) =>
    commandsOf(scope.id)
      .filter((c) => !c.hidden && c.keys.length > 0)
      .map((c) => c.id),
  );
}

const rowIds = () =>
  [...document.querySelectorAll('li[data-command-id]')].map((li) =>
    li.getAttribute('data-command-id'),
  );

function renderSheet() {
  render(<ShortcutSheet open onOpenChange={() => {}} />);
  return screen.getByRole('dialog', { name: 'Keyboard shortcuts' });
}

beforeEach(() => {
  useStore.setState({ singleKeyShortcuts: true });
  useMusicalTypingStore.setState({ enabled: false });
  useShortcutSheetStore.setState({ isOpen: true });
  usePaletteStore.setState({ isOpen: false, opener: null });
  useReportProblemStore.setState({ isOpen: false });
});

afterEach(() => {
  cleanup();
});

describe('ShortcutSheet', () => {
  it('lists every command with keys exactly once, by scope in the shared order', () => {
    const dialog = renderSheet();
    const expected = keyedCommandIds();
    expect(expected.length).toBeGreaterThanOrEqual(40);
    expect(rowIds()).toEqual(expected);
    expect(new Set(rowIds()).size).toBe(rowIds().length);
    // Rows are list items (the harness counts li).
    expect(within(dialog).getAllByRole('listitem').length).toBe(
      expected.length,
    );
    const headings = within(dialog)
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(headings).toEqual(sheetSections().map((s) => s.scope.label));
    for (const text of [
      'Play / Pause',
      'Delete the selected clip',
      'Write rests',
      'Add a chord symbol',
      'Octave up',
      'Single-key shortcuts',
    ]) {
      expect(dialog).toHaveTextContent(text);
    }
  });

  it('lists none of the palette’s key-less commands', () => {
    renderSheet();
    const keyless = sortedScopes().flatMap((scope) =>
      commandsOf(scope.id)
        .filter((c) => c.keys.length === 0)
        .map((c) => c.id),
    );
    expect(keyless.length).toBeGreaterThan(0);
    for (const id of keyless) expect(rowIds()).not.toContain(id);
  });

  it('filters rows by label, scope and key as the student types', () => {
    const dialog = renderSheet();
    const search = screen.getByRole('textbox', { name: 'Search shortcuts' });

    fireEvent.change(search, { target: { value: 'octave' } });
    expect(rowIds()).toEqual(
      expect.arrayContaining(['typing.octaveDown', 'typing.octaveUp']),
    );
    expect(rowIds()).not.toContain('transport.playPause');

    // A scope's heading finds its commands.
    fireEvent.change(search, { target: { value: 'computer keyboard' } });
    expect(rowIds()).toEqual(expect.arrayContaining(['typing.softer']));

    // A key, as the sheet writes it.
    fireEvent.change(search, { target: { value: 'space' } });
    expect(rowIds()).toContain('transport.playPause');

    fireEvent.change(search, { target: { value: 'zzzz nothing' } });
    expect(rowIds()).toEqual([]);
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'No shortcut matches',
    );

    fireEvent.change(search, { target: { value: '' } });
    expect(rowIds()).toEqual(keyedCommandIds());
  });

  it('shows the two switches as setting rows with their lines', () => {
    renderSheet();
    const rows = document.querySelectorAll('[data-setting-row]');
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      const line = row.querySelector('[data-setting-description]');
      expect(line?.textContent?.trim()).toBeTruthy();
      const toggle = within(row as HTMLElement).getByRole('button');
      expect(toggle.getAttribute('aria-describedby')).toContain(line!.id);
    }

    const single = screen.getByRole('button', { name: 'Single-key shortcuts' });
    expect(single).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(single);
    expect(useStore.getState().singleKeyShortcuts).toBe(false);
    // Off, the single keys are shown as off.
    expect(
      document.querySelector('li[data-command-id="transport.loop"]'),
    ).toHaveTextContent('(off)');

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Play notes from the computer keyboard',
      }),
    );
    expect(useMusicalTypingStore.getState().enabled).toBe(true);
  });

  it('opens the palette and Report a problem from its footer', () => {
    renderSheet();
    fireEvent.click(screen.getByTestId('shortcut-sheet-palette'));
    expect(useShortcutSheetStore.getState().isOpen).toBe(false);
    expect(usePaletteStore.getState().isOpen).toBe(true);
    expect(screen.getByTestId('shortcut-sheet-palette')).toHaveAccessibleName(
      /Search every command/,
    );

    useShortcutSheetStore.setState({ isOpen: true });
    fireEvent.click(screen.getByRole('button', { name: 'Report a problem' }));
    expect(useShortcutSheetStore.getState().isOpen).toBe(false);
    expect(useReportProblemStore.getState().isOpen).toBe(true);
  });
});
