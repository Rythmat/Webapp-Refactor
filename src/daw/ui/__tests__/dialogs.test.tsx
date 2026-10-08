// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { useRef, useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Button } from '../Button';
import { ConfirmDialog } from '../ConfirmDialog';
import { DawDialog, Sheet, type DawDialogProps } from '../DawDialog';
import { confirmDialog, DialogHost, promptDialog } from '../DialogHost';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../Menu';
import { PromptDialog } from '../PromptDialog';
import { Select } from '../Select';
import { installDomShims } from './dom';

// ── Overlays: opaque, portaled, keyboard and focus correct ──────────────────
// The editor's dialogs used to render see-through outside .daw-root and to
// fall back to window.confirm/prompt. These portal to <body> on the --daw-*
// tokens (installed on :root), trap focus, close on Escape and give focus
// back; ConfirmDialog and PromptDialog replace the native pair, as
// components or as promises through a DialogHost.

beforeAll(installDomShims);
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Lets Radix's deferred listeners (outside clicks) attach. */
const tick = () => act(() => new Promise((r) => setTimeout(r, 0)));

describe('DawDialog', () => {
  function Export(props: Partial<DawDialogProps>) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open export</Button>
        <DawDialog
          open={open}
          onOpenChange={setOpen}
          title="Export audio"
          description="Choose a format."
          footer={<Button variant="primary">Export</Button>}
          {...props}
        >
          <input aria-label="File name" />
        </DawDialog>
      </>
    );
  }

  // A browser focuses a button as it is clicked; jsdom does not.
  const openIt = () => {
    const button = screen.getByRole('button', { name: 'Open export' });
    act(() => button.focus());
    fireEvent.click(button);
  };

  it('is a dialog named by its title and described by its text', () => {
    render(<Export />);
    openIt();
    const dialog = screen.getByRole('dialog', { name: 'Export audio' });
    expect(dialog).toHaveAccessibleDescription('Choose a format.');
  });

  it('is opaque, portaled to <body>, in the modal layer, over a scrim', () => {
    const { container } = render(<Export />);
    openIt();
    const dialog = screen.getByRole('dialog');
    expect(container.contains(dialog)).toBe(false);
    expect(dialog).toHaveClass('bg-daw-popover', 'z-[var(--daw-z-modal)]');
    const scrim = dialog.previousElementSibling;
    expect(scrim).toHaveClass('bg-daw-scrim', 'z-[var(--daw-z-modal)]');
    // Plain black/60: the kit's backdrop blur is switched off.
    expect(scrim).toHaveClass('backdrop-blur-none');
    expect(scrim).not.toHaveClass('backdrop-blur-sm');
  });

  it('hides the editor behind it from assistive technology while open', () => {
    render(<Export />);
    openIt();
    expect(screen.queryByRole('button', { name: 'Open export' })).toBeNull();
  });

  it('moves focus in, to the first field, and the close button comes last', () => {
    render(<Export />);
    openIt();
    expect(screen.getByRole('textbox', { name: 'File name' })).toHaveFocus();
    const buttons = screen.getAllByRole('button');
    const close = screen.getByRole('button', { name: 'Close' });
    expect(buttons[buttons.length - 1]).toBe(close);
    expect(close).toHaveClass('size-7');
  });

  it('closes on Escape and gives focus back to what opened it', async () => {
    render(<Export />);
    openIt();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('button', { name: 'Open export' })).toHaveFocus();
  });

  it('gives focus back to its own trigger, however it was opened', async () => {
    render(
      <DawDialog title="Settings" trigger={<Button>Settings</Button>}>
        <input aria-label="Name" />
      </DawDialog>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus();
  });

  it('closes from its labelled close button', async () => {
    render(<Export />);
    openIt();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('focuses what it is told to on open', () => {
    function Focused() {
      const target = useRef<HTMLButtonElement>(null);
      return (
        <DawDialog
          open
          title="Settings"
          initialFocus={target}
          footer={<Button ref={target}>Done</Button>}
        >
          <input aria-label="Name" />
        </DawDialog>
      );
    }
    render(<Focused />);
    expect(screen.getByRole('button', { name: 'Done' })).toHaveFocus();
  });

  it('describes nothing, without a warning, when it has no description', () => {
    const warn = vi.spyOn(console, 'warn');
    render(<DawDialog open title="Plain" />);
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-describedby');
    expect(warn).not.toHaveBeenCalled();
  });

  it('closes on a click outside unless told not to', async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <DawDialog open onOpenChange={onOpenChange} title="Outside" />,
    );
    await tick();
    fireEvent.pointerDown(document.body);
    expect(onOpenChange).toHaveBeenCalledWith(false);

    onOpenChange.mockClear();
    rerender(
      <DawDialog
        open
        onOpenChange={onOpenChange}
        title="Outside"
        dismissible={false}
      />,
    );
    await tick();
    fireEvent.pointerDown(document.body);
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

describe('Sheet', () => {
  it('is the same modal frame along an edge', async () => {
    const onOpenChange = vi.fn();
    render(
      <Sheet open onOpenChange={onOpenChange} side="bottom" title="Add a track">
        <Button>Drums</Button>
      </Sheet>,
    );
    const sheet = screen.getByRole('dialog', { name: 'Add a track' });
    expect(sheet).toHaveClass('bottom-0', 'bg-daw-popover');
    expect(screen.getByRole('button', { name: 'Drums' })).toHaveFocus();
    fireEvent.keyDown(sheet, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('a Select or a Menu inside a dialog', () => {
  // Radix keeps its open layers, focus traps and scroll locks in stacks that
  // live in their modules. With two copies of those modules (the pinned
  // Radix packages nest their own), the dialog's focus trap pulled focus
  // back out of a Select's list and one Escape closed both; vite.config.ts
  // gives every package the one copy.

  /**
   * Fails at once if two focus traps bounce focus between them, which would
   * otherwise recurse until the stack overflows and then hang the run.
   */
  function failOnBouncingFocus() {
    const focus = HTMLElement.prototype.focus;
    let calls = 0;
    vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (
      this: HTMLElement,
      options?: FocusOptions,
    ) {
      calls += 1;
      if (calls > 200) throw new Error('two focus traps are fighting');
      focus.call(this, options);
    });
  }

  it('lets a Select take focus into its list, and Escape closes only the list', async () => {
    failOnBouncingFocus();
    const onOpenChange = vi.fn();
    render(
      <DawDialog open onOpenChange={onOpenChange} title="Export audio">
        <Select
          label="Format"
          defaultValue="wav"
          options={[
            { value: 'wav', label: 'WAV' },
            { value: 'mp3', label: 'MP3' },
          ]}
        />
      </DawDialog>,
    );
    const field = screen.getByRole('combobox', { name: 'Format' });
    act(() => field.focus());
    fireEvent.keyDown(field, { key: 'ArrowDown' });
    const list = await screen.findByRole('listbox');
    await waitFor(() =>
      expect(list).toContainElement(document.activeElement as HTMLElement),
    );

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await waitFor(() => expect(field).toHaveFocus());
  });

  it('gives the page its pointer back when a dialog opened from a menu closes', async () => {
    // A modal menu and a modal dialog each turn off pointer events outside
    // them; on one stack, the page gets them back when the last one goes.
    function ProjectMenu() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Menu>
            <MenuTrigger asChild>
              <Button>Project</Button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem onSelect={() => setOpen(true)}>Export audio…</MenuItem>
            </MenuContent>
          </Menu>
          <DawDialog open={open} onOpenChange={setOpen} title="Export audio" />
        </>
      );
    }
    failOnBouncingFocus();
    render(<ProjectMenu />);
    const trigger = screen.getByRole('button', { name: 'Project' });
    act(() => trigger.focus());
    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.keyDown(
      await screen.findByRole('menuitem', { name: 'Export audio…' }),
      { key: 'Enter' },
    );
    const dialog = await screen.findByRole('dialog', { name: 'Export audio' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(document.body.style.pointerEvents).toBe('none');

    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.body.style.pointerEvents).toBe('');
  });

  it('lets a Menu take focus, and Escape closes only the menu', async () => {
    failOnBouncingFocus();
    const onOpenChange = vi.fn();
    render(
      <DawDialog open onOpenChange={onOpenChange} title="Track">
        <Menu>
          <MenuTrigger asChild>
            <Button>More</Button>
          </MenuTrigger>
          <MenuContent>
            <MenuItem>Rename</MenuItem>
            <MenuItem>Duplicate</MenuItem>
          </MenuContent>
        </Menu>
      </DawDialog>,
    );
    const trigger = screen.getByRole('button', { name: 'More' });
    act(() => trigger.focus());
    fireEvent.keyDown(trigger, { key: 'Enter' });
    const menu = await screen.findByRole('menu');
    await waitFor(() =>
      expect(menu).toContainElement(document.activeElement as HTMLElement),
    );

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('ConfirmDialog', () => {
  function Ask({
    danger = false,
    onConfirm = () => {},
    onCancel = () => {},
  }: {
    danger?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
  }) {
    const [open, setOpen] = useState(true);
    return (
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this track?"
        description="Its clips go too."
        confirmLabel="Delete"
        danger={danger}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
  }

  it('is an alert dialog named by its question and described by its consequence', () => {
    render(<Ask />);
    const dialog = screen.getByRole('alertdialog', {
      name: 'Delete this track?',
    });
    expect(dialog).toHaveAccessibleDescription('Its clips go too.');
    expect(dialog).toHaveClass('bg-daw-popover');
    // Over a plain scrim, with no backdrop blur.
    const scrim = dialog.previousElementSibling!;
    expect(scrim).toHaveClass('bg-daw-scrim');
    expect(scrim.className).not.toMatch(/backdrop-blur/);
  });

  it('starts on Cancel when the action destroys work, with a red button', () => {
    render(<Ask danger />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveAttribute(
      'data-variant',
      'danger',
    );
  });

  it('starts on the action when it is harmless, a white pill', () => {
    render(<Ask />);
    const action = screen.getByRole('button', { name: 'Delete' });
    expect(action).toHaveFocus();
    expect(action).toHaveAttribute('data-variant', 'primary');
  });

  it('confirms once, without also reporting a cancel', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<Ask onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  });

  it('cancels on Escape and on Cancel', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<Ask onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
    cleanup();
    render(<Ask onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('gives focus back to the button that asked', async () => {
    function Asker() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button onClick={() => setOpen(true)}>Delete…</Button>
          <ConfirmDialog
            open={open}
            onOpenChange={setOpen}
            title="Delete?"
            description="It goes."
            danger
            onConfirm={() => {}}
          />
        </>
      );
    }
    render(<Asker />);
    const button = screen.getByRole('button', { name: 'Delete…' });
    act(() => button.focus());
    fireEvent.click(button);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(button).toHaveFocus();
  });

  it('ignores a click outside: the choice is deliberate', async () => {
    const onCancel = vi.fn();
    render(<Ask onCancel={onCancel} />);
    await tick();
    fireEvent.pointerDown(document.body);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
  });
});

describe('PromptDialog', () => {
  function Rename({
    onSubmit = () => {},
    onCancel = () => {},
  }: {
    onSubmit?: (value: string) => void;
    onCancel?: () => void;
  }) {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Rename</Button>
        <PromptDialog
          open={open}
          onOpenChange={setOpen}
          title="Rename marker"
          label="Marker name"
          defaultValue="Chorus"
          confirmLabel="Rename"
          validate={(v) => (v.trim() ? null : 'Give the marker a name.')}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      </>
    );
  }

  const field = () => screen.getByRole('textbox', { name: 'Marker name' });
  const submit = () =>
    fireEvent.click(
      screen.getByRole('button', { name: 'Rename', hidden: false }),
    );

  it('opens on its labelled field, focused with the text selected', () => {
    render(<Rename />);
    expect(
      screen.getByRole('dialog', { name: 'Rename marker' }),
    ).toBeInTheDocument();
    const input = field() as HTMLInputElement;
    expect(input).toHaveFocus();
    expect(input.value).toBe('Chorus');
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('Chorus'.length);
  });

  it('submits the text and closes', async () => {
    const onSubmit = vi.fn();
    render(<Rename onSubmit={onSubmit} />);
    fireEvent.change(field(), { target: { value: 'Bridge' } });
    submit();
    expect(onSubmit).toHaveBeenCalledWith('Bridge');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('keeps a value validate turns down, and says why under the field', () => {
    const onSubmit = vi.fn();
    render(<Rename onSubmit={onSubmit} />);
    fireEvent.change(field(), { target: { value: '  ' } });
    submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Give the marker a name.',
    );
    expect(field()).toHaveAttribute('aria-invalid', 'true');
    expect(field()).toHaveAccessibleDescription('Give the marker a name.');
    expect(field()).toHaveFocus();
    // Typing clears the complaint.
    fireEvent.change(field(), { target: { value: 'Outro' } });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('cancels from Cancel and from Escape, and reopens from its default', async () => {
    const onCancel = vi.fn();
    render(<Rename onCancel={onCancel} />);
    fireEvent.change(field(), { target: { value: 'Edited' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
    expect((field() as HTMLInputElement).value).toBe('Chorus');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});

describe('confirmDialog and promptDialog (promises through DialogHost)', () => {
  it('resolves true when the action is chosen and false on cancel', async () => {
    render(<DialogHost />);
    let answer: Promise<boolean>;
    act(() => {
      answer = confirmDialog({
        title: 'Replace the take?',
        description: 'The old take is replaced.',
        confirmLabel: 'Replace',
      });
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Replace' }));
    await expect(answer!).resolves.toBe(true);

    act(() => {
      answer = confirmDialog({ title: 'Again?', description: 'Sure?' });
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await expect(answer!).resolves.toBe(false);
  });

  it('resolves the text, or null when cancelled', async () => {
    render(<DialogHost />);
    let answer: Promise<string | null>;
    act(() => {
      answer = promptDialog({
        title: 'Name',
        label: 'Name',
        defaultValue: 'A',
      });
    });
    const input = await screen.findByRole('textbox', { name: 'Name' });
    fireEvent.change(input, { target: { value: 'Verse' } });
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    await expect(answer!).resolves.toBe('Verse');

    act(() => {
      answer = promptDialog({ title: 'Name', label: 'Name' });
    });
    fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' });
    await expect(answer!).resolves.toBeNull();
  });

  it('asks one at a time, in order', async () => {
    render(<DialogHost />);
    let first: Promise<boolean>;
    let second: Promise<boolean>;
    act(() => {
      first = confirmDialog({ title: 'First?', description: '1' });
      second = confirmDialog({ title: 'Second?', description: '2' });
    });
    expect(screen.getAllByRole('alertdialog')).toHaveLength(1);
    expect(screen.getByRole('alertdialog')).toHaveAccessibleName('First?');
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    await expect(first!).resolves.toBe(true);
    expect(
      await screen.findByRole('alertdialog', { name: 'Second?' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await expect(second!).resolves.toBe(false);
  });

  it('gives focus back to where it was once answered', async () => {
    render(
      <>
        <Button>Rename…</Button>
        <DialogHost />
      </>,
    );
    const button = screen.getByRole('button', { name: 'Rename…' });
    act(() => button.focus());
    let answer: Promise<boolean>;
    act(() => {
      answer = confirmDialog({ title: 'Sure?', description: 'Really.' });
    });
    fireEvent.click(await screen.findByRole('button', { name: 'OK' }));
    await answer!;
    await waitFor(() => expect(button).toHaveFocus());
  });

  it('answers as cancelled, at once, when no host is mounted', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      confirmDialog({ title: 'Delete?', description: 'Gone.' }),
    ).resolves.toBe(false);
    await expect(promptDialog({ title: 'Name', label: 'Name' })).resolves.toBe(
      null,
    );
    expect(error).toHaveBeenCalledTimes(2);
  });

  it('cancels what is still waiting when the last host goes', async () => {
    const { unmount } = render(<DialogHost />);
    let answer: Promise<boolean>;
    act(() => {
      answer = confirmDialog({ title: 'Leave?', description: 'Bye.' });
    });
    await screen.findByRole('alertdialog');
    unmount();
    await expect(answer!).resolves.toBe(false);
  });

  it('shows each request on one host only, however many are mounted', async () => {
    render(
      <>
        <DialogHost />
        <DialogHost />
      </>,
    );
    act(() => {
      void confirmDialog({ title: 'Once?', description: 'Only once.' });
    });
    expect(await screen.findAllByRole('alertdialog')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
  });
});
