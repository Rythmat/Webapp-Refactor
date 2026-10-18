import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { CornerDownLeft, Search } from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/components/utilities';
import { availableCommands, runCommand } from '@/daw/commands/dispatcher';
import { getCommand } from '@/daw/commands/registry';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { notice } from '@/daw/shell/notice';
import { Kbd } from '@/daw/ui/Kbd';
import { FOCUS_RING, OVERLAY_MOTION, TYPE_CLASS } from '@/daw/ui/styles';
import { paletteGroups, paletteRows } from './paletteModel';
import '@/daw/commands/keymaps';

// ── The command palette (milestone 2.15; ST9, shell-33) ────────────────────
//
// ⌘K / Ctrl+K (or ⇧⌘P anywhere): every command that works where the student
// is, searchable, grouped by where it works and showing its shortcut, read
// from the command registry like the '?' sheet. Choosing one closes the
// palette, gives focus back to where it was, and runs the command there as
// its key would (dispatcher.ts runCommand), so the keyboard precedence holds:
// a track list command acts on the row that had focus, a clip command on the
// selected clip. A command that finds nothing to act on says so.
//
// The list is cmdk's (arrows, Home / End, Return); the field is our own,
// since cmdk 1.0 sets aria-activedescendant once and never updates it (the
// Atlas palette's fix). Loaded on first use, so cmdk isn't in the editor's
// first download.

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  /** Where focus was when it opened: what the list is for, and where it runs. */
  opener: Element | null;
}

const PALETTE_KEYS = shortcutKeys('help.palette');

export function CommandPalette({
  open,
  onOpenChange,
  opener,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  // What works here, read as it opens (a view switch closes it anyway).
  const commands = useMemo(
    () => (open ? availableCommands(opener) : []),
    [open, opener],
  );
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);
  const groups = useMemo(
    () => paletteGroups(commands, query),
    [commands, query],
  );

  // The highlighted row: the first one whenever the list changes.
  const [selected, setSelected] = useState('');
  useLayoutEffect(() => {
    setSelected(paletteRows(groups)[0]?.id ?? '');
  }, [groups]);

  // The field names the highlighted row to a screen reader.
  const listRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string>();
  const [listId, setListId] = useState<string>();
  useEffect(() => {
    const list = listRef.current;
    setListId(list?.id);
    const row = Array.from(
      list?.querySelectorAll<HTMLElement>('[cmdk-item]') ?? [],
    ).find((el) => el.getAttribute('data-value') === selected);
    setActiveId(row?.id);
  }, [selected, groups]);

  // The command chosen, run once the palette has closed and focus is back.
  const pending = useRef<string | null>(null);
  const choose = (id: string) => {
    pending.current = id;
    onOpenChange(false);
  };

  const onFieldKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Its own keys close it again.
    const mod = e.metaKey || e.ctrlKey;
    if (mod && (e.code === 'KeyK' || (e.shiftKey && e.code === 'KeyP'))) {
      e.preventDefault();
      onOpenChange(false);
    }
  };

  const typed = query.trim();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay
          className={cn(
            'z-[var(--daw-z-modal)] bg-daw-scrim backdrop-blur-none',
            OVERLAY_MOTION.fast,
          )}
        />
        <DialogPrimitive.Content
          data-ds="v2"
          data-testid="command-palette"
          className={cn(
            'fixed left-1/2 top-[14vh] z-[var(--daw-z-modal)] flex max-h-[min(64vh,460px)] w-[min(560px,calc(100vw-32px))] -translate-x-1/2 flex-col overflow-hidden rounded-[var(--daw-radius-lg)] border border-daw-hairline bg-daw-popover text-daw-text shadow-2xl shadow-black/60 outline-none',
            'data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            OVERLAY_MOTION.fast,
            TYPE_CLASS.body,
          )}
          onCloseAutoFocus={(event) => {
            const id = pending.current;
            pending.current = null;
            const back = opener instanceof HTMLElement ? opener : null;
            if (back?.isConnected) {
              event.preventDefault();
              back.focus({ preventScroll: true });
            }
            if (!id) return;
            // After the close has settled, as if its key were pressed there.
            requestAnimationFrame(() => {
              if (runCommand(id, back?.isConnected ? back : null)) return;
              notice({
                title: getCommand(id)?.label ?? 'That command',
                description: 'There’s nothing for it to do here right now.',
              });
            });
          }}
        >
          <DialogTitle className="sr-only">Find a command</DialogTitle>
          <DialogDescription className="sr-only">
            Type to find a command that works here. Arrow keys move through the
            list, Return runs one, Escape closes.
          </DialogDescription>
          <Command
            className="flex min-h-0 flex-1 flex-col"
            loop
            shouldFilter={false}
            value={selected}
            vimBindings={false}
            onValueChange={setSelected}
          >
            <div className="flex h-11 shrink-0 items-center gap-2 border-b border-daw-hairline px-3">
              <Search aria-hidden className="size-4 shrink-0 text-daw-text-3" />
              <input
                data-testid="command-palette-input"
                aria-activedescendant={activeId}
                aria-autocomplete="list"
                aria-controls={listId}
                aria-expanded
                aria-label="Find a command"
                autoComplete="off"
                className={cn(
                  'h-8 min-w-0 flex-1 bg-transparent text-daw-text outline-none placeholder:text-daw-text-3',
                  TYPE_CLASS.body,
                )}
                placeholder="Find a command…"
                role="combobox"
                spellCheck={false}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onFieldKeyDown}
              />
              <Kbd aria-hidden>Esc</Kbd>
            </div>
            <Command.List
              ref={listRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1"
              label="Commands"
            >
              <Command.Empty
                className={cn(
                  'px-3 py-6 text-center text-daw-text-2',
                  TYPE_CLASS.body,
                )}
              >
                {typed
                  ? `No command here matches “${typed}”.`
                  : 'No commands work here.'}
              </Command.Empty>
              {groups.map((group) => (
                <Command.Group
                  key={group.scope}
                  data-testid="command-palette-group"
                  data-scope={group.scope}
                  className="py-0.5"
                  heading={
                    <span
                      className={cn(
                        'block px-2 pb-1 pt-2 text-daw-text-3',
                        TYPE_CLASS.micro,
                      )}
                    >
                      {group.label}
                    </span>
                  }
                >
                  {group.rows.map((row) => (
                    <Command.Item
                      key={row.id}
                      value={row.id}
                      data-testid="command-palette-item"
                      data-command-id={row.id}
                      onSelect={() => choose(row.id)}
                      className="group flex h-8 cursor-default items-center gap-2 rounded-[var(--daw-radius-sm)] px-2 text-daw-text data-[selected=true]:bg-daw-hover"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {row.label}
                      </span>
                      {row.keys ? (
                        <Kbd data-testid="command-palette-keys">{row.keys}</Kbd>
                      ) : null}
                      <CornerDownLeft
                        aria-hidden
                        className="size-3.5 shrink-0 text-daw-text-3 opacity-0 group-data-[selected=true]:opacity-100"
                      />
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
            </Command.List>
            <div
              className={cn(
                'flex h-9 shrink-0 items-center gap-4 border-t border-daw-hairline px-3 text-daw-text-3',
                TYPE_CLASS.label,
              )}
            >
              <span>Shows what works here</span>
              <span className="ml-auto">{PALETTE_KEYS.label} to close</span>
              <button
                type="button"
                className={cn(
                  'h-6 rounded-[var(--daw-radius-sm)] px-1 text-daw-text-2 hover:text-daw-text',
                  FOCUS_RING,
                )}
                // Opened once the palette has gone, as its command.
                onClick={() => choose('help.shortcuts')}
              >
                All shortcuts
              </button>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
