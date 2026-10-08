// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Button } from '../Button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from '../Menu';
import { Popover, PopoverContent, PopoverTrigger } from '../Popover';
import { Segmented } from '../Segmented';
import { Select } from '../Select';
import { Tab, TabList, TabPanel, Tabs } from '../Tabs';
import { installDomShims } from './dom';

// ── Navigation and choice: Tabs, Segmented, Select, Menu, Popover ───────────

beforeAll(installDomShims);
afterEach(cleanup);

describe('Tabs', () => {
  function Dock({ onChange }: { onChange?: (v: string) => void }) {
    const [tab, setTab] = useState('controls');
    return (
      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v);
          onChange?.(v);
        }}
      >
        <TabList aria-label="Editor dock">
          <Tab value="controls">Instrument</Tab>
          <Tab value="fx">Effects</Tab>
          <Tab value="piano-roll" disabledReason="Notes needs a MIDI clip">
            Notes
          </Tab>
        </TabList>
        <TabPanel value="controls">Instrument panel</TabPanel>
        <TabPanel value="fx">Effects panel</TabPanel>
        <TabPanel value="piano-roll">Notes panel</TabPanel>
      </Tabs>
    );
  }

  const tab = (name: string) => screen.getByRole('tab', { name });

  it('is a named tablist of tabs that control their panels', () => {
    render(<Dock />);
    expect(
      screen.getByRole('tablist', { name: 'Editor dock' }),
    ).toBeInTheDocument();
    expect(tab('Instrument')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Effects')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Instrument panel');
  });

  it('moves along with the arrow keys and activates the tab it reaches', async () => {
    render(<Dock />);
    act(() => tab('Instrument').focus());
    fireEvent.keyDown(tab('Instrument'), { key: 'ArrowRight' });
    await waitFor(() => expect(tab('Effects')).toHaveFocus());
    expect(tab('Effects')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Effects panel');
  });

  it('marks the active tab with white/10 and an underline, not colour alone', () => {
    render(<Dock />);
    expect(tab('Instrument')).toHaveClass(
      'data-[state=active]:bg-daw-selected',
      'data-[state=active]:after:bg-daw-text',
      'h-7',
    );
  });

  it('keeps a tab that does not apply visible and focusable, and says why', async () => {
    const onChange = vi.fn();
    render(<Dock onChange={onChange} />);
    const notes = tab('Notes');
    expect(notes).not.toBeDisabled();
    expect(notes).toHaveAttribute('aria-disabled', 'true');
    expect(notes).toHaveAccessibleDescription('Notes needs a MIDI clip');

    // No way in: click, Enter, Space, or arrowing onto it.
    fireEvent.mouseDown(notes, { button: 0 });
    fireEvent.keyDown(notes, { key: 'Enter' });
    fireEvent.keyDown(notes, { key: ' ' });
    act(() => tab('Effects').focus());
    fireEvent.keyDown(tab('Effects'), { key: 'ArrowRight' });
    await waitFor(() => expect(notes).toHaveFocus());
    expect(onChange).not.toHaveBeenCalledWith('piano-roll');
    expect(notes).toHaveAttribute('aria-selected', 'false');
  });
});

describe('Tabs, uncontrolled', () => {
  it('keeps its own choice and still turns a disabled tab away', () => {
    render(
      <Tabs defaultValue="a">
        <TabList aria-label="Views">
          <Tab value="a">Create</Tab>
          <Tab value="b">Mix</Tab>
          <Tab value="c" disabledReason="Not in this lesson">
            Score
          </Tab>
        </TabList>
      </Tabs>,
    );
    const tab = (name: string) => screen.getByRole('tab', { name });
    fireEvent.mouseDown(tab('Mix'), { button: 0 });
    expect(tab('Mix')).toHaveAttribute('aria-selected', 'true');
    fireEvent.mouseDown(tab('Score'), { button: 0 });
    expect(tab('Score')).toHaveAttribute('aria-selected', 'false');
    expect(tab('Mix')).toHaveAttribute('aria-selected', 'true');
  });
});

describe('Segmented', () => {
  function Snap() {
    const [snap, setSnap] = useState('1/16');
    return (
      <Segmented
        label="Snap"
        value={snap}
        onValueChange={setSnap}
        options={[
          { value: 'bar', label: 'Bar' },
          { value: '1/4', label: '1/4' },
          { value: '1/16', label: '1/16' },
        ]}
      />
    );
  }

  it('is a named radio group with the choice checked', () => {
    render(<Snap />);
    expect(
      screen.getByRole('radiogroup', { name: 'Snap' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '1/16' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('chooses on click, and arrow keys move the choice', async () => {
    render(<Snap />);
    fireEvent.click(screen.getByRole('radio', { name: 'Bar' }));
    const bar = screen.getByRole('radio', { name: 'Bar' });
    expect(bar).toHaveAttribute('aria-checked', 'true');
    act(() => bar.focus());
    fireEvent.keyDown(bar, { key: 'ArrowRight' });
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: '1/4' })).toHaveAttribute(
        'aria-checked',
        'true',
      ),
    );
    fireEvent.keyUp(document, { key: 'ArrowRight' });
  });

  it('names icon-only options by their label', () => {
    render(
      <Segmented
        label="Tool"
        iconOnly
        value="select"
        onValueChange={() => {}}
        options={[
          { value: 'select', label: 'Select', icon: <svg /> },
          { value: 'draw', label: 'Draw', icon: <svg /> },
        ]}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Draw' })).toBeInTheDocument();
  });
});

describe('Select', () => {
  function Grid({ onChange }: { onChange?: (v: string) => void }) {
    const [grid, setGrid] = useState('1/16');
    return (
      <Select
        label="Grid"
        value={grid}
        onValueChange={(v) => {
          setGrid(v);
          onChange?.(v);
        }}
        options={[
          { value: '1/4', label: '1/4 note' },
          { value: '1/16', label: '1/16 note' },
          {
            label: 'Triplets',
            options: [{ value: '1/8t', label: '1/8 triplet' }],
          },
        ]}
      />
    );
  }

  it('is a combobox named by its label, showing the value', () => {
    render(<Grid />);
    const field = screen.getByRole('combobox', { name: 'Grid' });
    expect(field).toHaveTextContent('1/16 note');
    expect(field).toHaveAttribute('aria-expanded', 'false');
    expect(field).toHaveClass('h-7');
  });

  it('opens from the keyboard and chooses with Enter', async () => {
    const onChange = vi.fn();
    render(<Grid onChange={onChange} />);
    const field = screen.getByRole('combobox', { name: 'Grid' });
    act(() => field.focus());
    fireEvent.keyDown(field, { key: 'Enter' });
    const list = await screen.findByRole('listbox');
    expect(list).toHaveClass('bg-daw-popover');
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByRole('group')).toHaveTextContent('Triplets');
    fireEvent.keyDown(screen.getByRole('option', { name: '1/4 note' }), {
      key: 'Enter',
    });
    expect(onChange).toHaveBeenCalledWith('1/4');
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(field).toHaveTextContent('1/4 note');
  });
});

describe('Menu', () => {
  function ProjectMenu({ onDelete }: { onDelete?: () => void }) {
    const [grid, setGrid] = useState(true);
    return (
      <Menu>
        <MenuTrigger asChild>
          <Button>Project</Button>
        </MenuTrigger>
        <MenuContent>
          <MenuLabel>Project</MenuLabel>
          <MenuItem shortcut="⌘S">Save</MenuItem>
          <MenuCheckboxItem
            checked={grid}
            onCheckedChange={(v) => setGrid(v === true)}
          >
            Show grid
          </MenuCheckboxItem>
          <MenuSeparator />
          <MenuItem danger onSelect={onDelete}>
            Delete project
          </MenuItem>
        </MenuContent>
      </Menu>
    );
  }

  const open = () => {
    const trigger = screen.getByRole('button', { name: 'Project' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    act(() => trigger.focus());
    fireEvent.keyDown(trigger, { key: 'Enter' });
    return trigger;
  };

  it('opens from its button with the keyboard, as a menu of named items', async () => {
    render(<ProjectMenu />);
    open();
    const menu = await screen.findByRole('menu');
    expect(menu).toHaveClass('bg-daw-popover');
    expect(screen.getByRole('menuitem', { name: /Save/ })).toHaveTextContent(
      '⌘S',
    );
    expect(
      screen.getByRole('menuitemcheckbox', { name: 'Show grid' }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('runs an item on Enter, closes, and gives focus back', async () => {
    const onDelete = vi.fn();
    render(<ProjectMenu onDelete={onDelete} />);
    const trigger = open();
    const item = await screen.findByRole('menuitem', {
      name: 'Delete project',
    });
    expect(item).toHaveAttribute('data-danger', 'true');
    fireEvent.keyDown(item, { key: 'Enter' });
    expect(onDelete).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('closes on Escape', async () => {
    render(<ProjectMenu />);
    open();
    const menu = await screen.findByRole('menu');
    fireEvent.keyDown(menu, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });

  it('opens its right-click twin from the area it belongs to', async () => {
    const onCopy = vi.fn();
    render(
      <ContextMenu>
        <ContextMenuTrigger>Clip</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem shortcut="⌘C" onSelect={onCopy}>
            Copy
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByText('Clip'));
    const copy = await screen.findByRole('menuitem', { name: /Copy/ });
    fireEvent.keyDown(copy, { key: 'Enter' });
    expect(onCopy).toHaveBeenCalledOnce();
  });
});

describe('Popover', () => {
  it('opens a dialog from its trigger and closes on Escape, returning focus', async () => {
    render(
      <Popover>
        <PopoverTrigger asChild>
          <Button>Song</Button>
        </PopoverTrigger>
        <PopoverContent aria-label="Song settings">
          Key and tempo
        </PopoverContent>
      </Popover>,
    );
    const trigger = screen.getByRole('button', { name: 'Song' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    const panel = await screen.findByRole('dialog', { name: 'Song settings' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(panel).toHaveClass(
      'bg-daw-popover',
      'z-[var(--daw-z-popover)]',
      'border-daw-hairline',
    );
    fireEvent.keyDown(panel, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(trigger).toHaveFocus();
  });
});
