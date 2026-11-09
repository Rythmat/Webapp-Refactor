// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from '../Menu';
import { SettingRow } from '../SettingRow';
import { Toggle } from '../Toggle';
import { installDomShims } from './dom';

// ── Setting rows and menu descriptions (milestone 2.11) ─────────────────────
// Every setting in the editor says what it does in one line under its name
// (after Mozart AI's settings popover). SettingRow is that row; menus take a
// `description` on their items and a labelled radio group. The line is the
// control's accessible description, and a described menu item still finds
// itself by its label when the student types.
//
// Run: npx vitest run src/daw/ui/__tests__/settingRow.test.tsx

beforeAll(installDomShims);
afterEach(cleanup);

const describedText = (el: Element) =>
  (el.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ');

describe('SettingRow', () => {
  it('shows the label and the line, and groups a plain control under them', () => {
    render(
      <SettingRow label="Count-in" description="Bars of clicks first">
        <button type="button">2 bars</button>
      </SettingRow>,
    );
    const group = screen.getByRole('group', { name: 'Count-in' });
    expect(group).toHaveAttribute('data-setting-row');
    expect(describedText(group)).toBe('Bars of clicks first');
    const line = group.querySelector('[data-setting-description]');
    expect(line?.tagName).toBe('P');
    expect(line).toHaveTextContent('Bars of clicks first');
    expect(group).toContainElement(screen.getByRole('button'));
  });

  it('hands its ids to a control that wires itself, and is then no group', () => {
    render(
      <SettingRow label="Hover hints" description="Say what each control does">
        {({ descriptionId }) => (
          <Toggle label="Hover hints" aria-describedby={descriptionId}>
            On
          </Toggle>
        )}
      </SettingRow>,
    );
    expect(screen.queryByRole('group')).toBeNull();
    const toggle = screen.getByRole('button', { name: 'Hover hints' });
    expect(describedText(toggle)).toBe('Say what each control does');
  });

  it('puts the control at the right inline and under the words stacked', () => {
    const { container, rerender } = render(
      <SettingRow label="Volume" description="How loud the click is">
        <span>control</span>
      </SettingRow>,
    );
    const row = () => container.querySelector('[data-setting-row]')!;
    expect(row().className).toMatch(/justify-between/);
    expect(row().className).not.toMatch(/flex-col/);
    rerender(
      <SettingRow
        layout="stacked"
        label="Volume"
        description="How loud the click is"
      >
        <span>control</span>
      </SettingRow>,
    );
    expect(row().className).toMatch(/flex-col/);
  });

  it('never truncates the line', () => {
    const { container } = render(
      <SettingRow label="Latency" description="The delay you hear">
        <span>4 ms</span>
      </SettingRow>,
    );
    const line = container.querySelector('[data-setting-description]')!;
    expect(line.className).not.toMatch(/truncate|line-clamp/);
  });
});

function SettingsMenu({ onPick }: { onPick?: (v: string) => void }) {
  return (
    <Menu>
      <MenuTrigger>Open</MenuTrigger>
      <MenuContent>
        <MenuCheckboxItem
          checked
          description="Clips jump to the grid lines"
          shortcut="⌘G"
        >
          Snap to grid
        </MenuCheckboxItem>
        <MenuItem onSelect={() => onPick?.('plain')}>Plain item</MenuItem>
        {/* For typeahead: "Bar"'s line must not make it "Barlines". */}
        <MenuItem description="Lines up on every bar">Bar</MenuItem>
        <MenuItem>Barlines</MenuItem>
        <MenuItem
          description="Opens the settings"
          onSelect={() => onPick?.('settings')}
        >
          Settings
        </MenuItem>
        <MenuRadioGroup label="Grid" description="Where clips land" value="a">
          <MenuRadioItem value="a">Bar</MenuRadioItem>
          <MenuRadioItem value="b" description="Every beat">
            Beat
          </MenuRadioItem>
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  );
}

const open = () =>
  fireEvent.keyDown(screen.getByRole('button', { name: 'Open' }), {
    key: 'Enter',
  });

describe('menu descriptions', () => {
  it('give a described item its second line, as its description', () => {
    render(<SettingsMenu />);
    open();
    // The line is the item's description, not part of its name.
    const snap = screen.getByRole('menuitemcheckbox', {
      name: /^Snap to grid/,
    });
    expect(snap).not.toHaveAccessibleName(/Clips jump/);
    expect(snap).toHaveAccessibleDescription('Clips jump to the grid lines');
    expect(describedText(snap)).toBe('Clips jump to the grid lines');
    expect(snap.querySelector('[data-menu-description]')).toHaveTextContent(
      'Clips jump to the grid lines',
    );
    // The item grows to two lines, never under 24 px (40 px).
    expect(snap.className).toMatch(/min-h-12/);
    expect(snap.className).not.toMatch(/\bh-10\b/);
    // The shortcut stays.
    expect(snap).toHaveTextContent('⌘G');
    const settings = screen.getByRole('menuitem', { name: 'Settings' });
    expect(describedText(settings)).toBe('Opens the settings');
    const beat = screen.getByRole('menuitemradio', { name: 'Beat' });
    expect(describedText(beat)).toBe('Every beat');
  });

  it('leave an item without one as it was', () => {
    render(<SettingsMenu />);
    open();
    const plain = screen.getByRole('menuitem', { name: 'Plain item' });
    expect(plain).not.toHaveAttribute('aria-describedby');
    expect(plain.className).toMatch(/\bh-10\b/);
    expect(plain.querySelector('[data-menu-description]')).toBeNull();
  });

  it('head a labelled radio group and describe the group', () => {
    render(<SettingsMenu />);
    open();
    const group = screen.getByRole('group', { name: 'Grid' });
    expect(describedText(group)).toBe('Where clips land');
    expect(group).toContainElement(
      screen.getByRole('menuitemradio', { name: 'Bar' }),
    );
  });

  it('keep typeahead on the label', async () => {
    render(<SettingsMenu />);
    open();
    const menu = screen.getByRole('menu');
    // Radix moves the focus to a match a task later.
    const type = async (key: string) => {
      fireEvent.keyDown(document.activeElement ?? menu, { key });
      await act(() => new Promise((r) => setTimeout(r, 0)));
    };
    // Opened from the keyboard, focus starts on Snap; "s" goes on to the
    // next item named with an S, and "sn" back to Snap, by their names.
    await type('s');
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Settings' }),
    );
    await type('n');
    expect(document.activeElement).toBe(
      screen.getByRole('menuitemcheckbox', { name: /^Snap to grid/ }),
    );
  });

  it("keep a described item's line out of typeahead", async () => {
    render(<SettingsMenu />);
    open();
    const menu = screen.getByRole('menu');
    const type = async (key: string) => {
      fireEvent.keyDown(document.activeElement ?? menu, { key });
      await act(() => new Promise((r) => setTimeout(r, 0)));
    };
    await type('b');
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Bar' }),
    );
    // "barl" is the start of Bar's label and line run together, but only
    // of Barlines' label: the line isn't part of what typing finds.
    for (const key of ['a', 'r', 'l']) await type(key);
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Barlines' }),
    );
  });

  it('keep Enter choosing a described item', () => {
    const picked: string[] = [];
    render(<SettingsMenu onPick={(v) => picked.push(v)} />);
    open();
    const settings = screen.getByRole('menuitem', { name: 'Settings' });
    settings.focus();
    fireEvent.keyDown(settings, { key: 'Enter' });
    expect(picked).toEqual(['settings']);
  });
});

describe('context menu descriptions', () => {
  it('give a described context-menu item its line, as MenuItem does', () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>
          <div data-testid="area">Clip</div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem description="Makes a copy after it" shortcut="⌘D">
            Duplicate
          </ContextMenuItem>
          <ContextMenuItem>Delete</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByTestId('area'));
    const duplicate = screen.getByRole('menuitem', { name: /^Duplicate/ });
    expect(duplicate).toHaveAccessibleDescription('Makes a copy after it');
    expect(
      duplicate.querySelector('[data-menu-description]'),
    ).toHaveTextContent('Makes a copy after it');
    expect(duplicate.className).toMatch(/min-h-12/);
    expect(duplicate).toHaveTextContent('⌘D');
    const plain = screen.getByRole('menuitem', { name: 'Delete' });
    expect(plain).not.toHaveAttribute('aria-describedby');
  });
});
