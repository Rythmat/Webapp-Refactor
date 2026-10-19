import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  chordLabel,
  isCharacterKey,
  matchesChord,
  overlayAround,
} from '@/daw/commands/keys';
import { useMusicalTypingStore } from '@/daw/commands/musicalTypingStore';
import {
  commandsOf,
  getCommand,
  type DeclaredCommand,
  type ScopeDef,
} from '@/daw/commands/registry';
import { sortedScopes } from '@/daw/commands/scopeOrder';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { useStore } from '@/daw/store';
import { Button } from '@/daw/ui/Button';
import { DawDialog } from '@/daw/ui/DawDialog';
import { Kbd } from '@/daw/ui/Kbd';
import { SettingRow } from '@/daw/ui/SettingRow';
import { TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { Toggle } from '@/daw/ui/Toggle';
import { menuOpener } from '@/daw/ui/useReturnFocus';
import { cn } from '@/components/utilities';
import { matchScore } from './paletteModel';
import { usePaletteStore } from './usePaletteStore';
import { useReportProblemStore } from './useReportProblemStore';
import { useShortcutSheetStore } from './useShortcutSheetStore';
import '@/daw/commands/keymaps';

// ── The '?' sheet (milestones 1.6 and 2.11) ────────────────────────────────
//
// Every shortcut, read from the command registry and grouped by where it
// works, so the sheet can never list a key the editor doesn't have. It also
// holds the two switches that change what keys do: single-key shortcuts
// (WCAG 2.1.4) and the computer keyboard as a piano, each with its line of
// explanation (SettingRow). 2.11 restyled it: a search field at the top
// (the palette's matcher, and a key typed as the sheet shows it), two
// columns in a wide window, and a footer with the command palette (every
// command, key or not) and Report a problem. 3.14 adds remapping.

const PALETTE_KEYS = shortcutKeys('help.palette');

/**
 * Where the student was when the sheet opened: the palette it opens lists
 * what works there and gives focus back there. From a menu, its trigger.
 */
function sheetOpener(): Element | null {
  const active = document.activeElement;
  if (!active || active === document.body) return null;
  return menuOpener(active) ?? (overlayAround(active) ? null : active);
}

/** The keys of one row: 'Delete', 'Backspace'; a long run as one label. */
function rowKeys(command: DeclaredCommand): string[] {
  if (command.keysLabel) return [command.keysLabel];
  return [...new Set(command.chords.map((chord) => chordLabel(chord)))];
}

function isSingleKey(command: DeclaredCommand): boolean {
  return command.chords.some(isCharacterKey);
}

/**
 * What the student may call a key, in the sheet's own words: '⌘', 'cmd' and
 * 'ctrl' are the one modifier (either works on either keyboard), 'return'
 * is Enter, 'left' is ←, and a typed '-' is the label's '−'.
 */
const KEY_ALIASES: Readonly<Record<string, string>> = {
  '⌘': 'mod',
  cmd: 'mod',
  command: 'mod',
  meta: 'mod',
  ctrl: 'mod',
  control: 'mod',
  '⌥': 'alt',
  option: 'alt',
  opt: 'alt',
  '⇧': 'shift',
  esc: 'escape',
  return: 'enter',
  '↵': 'enter',
  '←': 'left',
  '→': 'right',
  '↑': 'up',
  '↓': 'down',
  spacebar: 'space',
  del: 'delete',
  contextmenu: 'menu',
  '-': '−',
};

/** Words that only say what kind of key it is ('arrow left', 'the M key'). */
const KEY_FILLER = new Set(['arrow', 'key']);

/**
 * A key label or a typed query as its keys: lower case, split at spaces and
 * '+', a Mac's glued modifiers peeled off ('⇧⌘Z' → shift, mod, z), each
 * named as KEY_ALIASES says; a run of digits ('1–9') is each digit.
 */
function keyTokens(text: string): string[] {
  const tokens: string[] = [];
  for (const chunk of text.toLowerCase().split(/[\s+]+/)) {
    let rest = chunk;
    while (rest.length > 1 && '⌘⌥⇧'.includes(rest[0]!)) {
      tokens.push(KEY_ALIASES[rest[0]!]!);
      rest = rest.slice(1);
    }
    if (!rest || KEY_FILLER.has(rest)) continue;
    const range = /^(\d)[–-](\d)$/.exec(rest);
    if (range) {
      for (let d = Number(range[1]); d <= Number(range[2]); d += 1) {
        tokens.push(String(d));
      }
      continue;
    }
    tokens.push(KEY_ALIASES[rest] ?? rest);
  }
  return tokens;
}

/**
 * Whether `query` names one of the command's keys: every key the student
 * typed is in it ('space', 'shift enter', '⌘Z', '?').
 */
function matchesKey(command: DeclaredCommand, query: string): boolean {
  const typed = keyTokens(query);
  if (typed.length === 0) return false;
  return rowKeys(command).some((keys) => {
    const have = keyTokens(keys);
    return typed.every((token) => have.includes(token));
  });
}

/** Whether a query has any words to match (the palette's fold). */
function hasWords(query: string): boolean {
  return /[a-z0-9]/.test(
    query
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, ''),
  );
}

export interface SheetSection {
  scope: ScopeDef;
  commands: DeclaredCommand[];
}

/**
 * The sheet's sections for `query`: every scope in the shared listing order
 * (scopeOrder.ts, as the palette), each with its commands that have keys, in
 * the order they were declared. A query keeps the commands whose label,
 * scope or keywords match it (the palette's matchScore) or whose key it is
 * ('L', 'space', 'cmd z'); a scope left with none is left out. A query of
 * symbols only ('?', '.', '-') has no words, so only its keys match.
 */
export function sheetSections(query = ''): SheetSection[] {
  const keysOnly = query.trim() !== '' && !hasWords(query);
  return sortedScopes()
    .map((scope) => ({
      scope,
      // A command without keys (Export…) is the palette's, not the sheet's.
      commands: commandsOf(scope.id).filter(
        (c) =>
          !c.hidden &&
          c.keys.length > 0 &&
          (keysOnly
            ? matchesKey(c, query)
            : matchScore(c, query) > 0 || matchesKey(c, query)),
      ),
    }))
    .filter((section) => section.commands.length > 0);
}

function ScopeSection({
  section,
  singleKeysOff,
}: {
  section: SheetSection;
  singleKeysOff: boolean;
}) {
  const { scope, commands } = section;
  const headingId = `shortcut-scope-${scope.id}`;
  return (
    <section aria-labelledby={headingId} className="break-inside-avoid pb-4">
      <h3
        id={headingId}
        className={cn(TYPE_CLASS.micro, 'pb-1.5 text-daw-text-3')}
      >
        {scope.label}
      </h3>
      <ul className="flex flex-col">
        {commands.map((command) => {
          // The typing scope's letters are the student's own switch.
          const off =
            singleKeysOff && scope.level !== 'typing' && isSingleKey(command);
          return (
            <li
              key={command.id}
              data-command-id={command.id}
              className={cn(
                'flex min-h-7 items-center justify-between gap-3 border-b border-daw-hairline py-1',
                off && 'opacity-50',
              )}
            >
              <span className={cn(TYPE_CLASS.body, 'text-daw-text-2')}>
                {command.label}
                {off && <span className="sr-only"> (off)</span>}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {rowKeys(command).map((keys, i) => (
                  <Kbd key={i}>{keys}</Kbd>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export interface ShortcutSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutSheet({ open, onOpenChange }: ShortcutSheetProps) {
  const singleKeys = useStore((s) => s.singleKeyShortcuts);
  const setSingleKeys = useStore((s) => s.setSingleKeyShortcuts);
  const typing = useMusicalTypingStore((s) => s.enabled);
  const setTyping = useMusicalTypingStore((s) => s.setEnabled);
  const [query, setQuery] = useState('');
  const sections = useMemo(() => sheetSections(query), [query]);
  // Read as it first renders, before the dialog takes focus.
  const [opener] = useState(sheetOpener);
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);

  // The palette is given where the sheet was opened from: focus is still in
  // the sheet when it opens, which would list only what works everywhere.
  const openPalette = () => {
    useShortcutSheetStore.getState().close();
    usePaletteStore.getState().open(opener);
  };

  // ⌘K (and ⇧⌘P), as the footer says: a dialog keeps the editor's keys
  // from the page, so the sheet answers them itself.
  useEffect(() => {
    if (!panel) return;
    const chords = getCommand('help.palette')?.chords ?? [];
    const onKeyDown = (e: KeyboardEvent) => {
      if (!chords.some((chord) => matchesChord(e, chord))) return;
      e.preventDefault();
      e.stopPropagation();
      useShortcutSheetStore.getState().close();
      usePaletteStore.getState().open(opener);
    };
    panel.addEventListener('keydown', onKeyDown);
    return () => panel.removeEventListener('keydown', onKeyDown);
  }, [panel, opener]);
  const openReport = () => {
    useShortcutSheetStore.getState().close();
    useReportProblemStore.getState().open();
  };

  return (
    <DawDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      // A fixed height (up to the window's): the search field stays put
      // while the list under it shrinks as the student types.
      className="h-[760px]"
      title="Keyboard shortcuts"
      description="Keys work in the area you’re working in: Delete in the Score deletes notes, in Create it deletes the selected clip."
      data={{ 'data-testid': 'shortcut-sheet' }}
      contentRef={setPanel}
      footer={
        <>
          <Button
            variant="ghost"
            className="mr-auto"
            onClick={openReport}
            data-testid="shortcut-sheet-report"
          >
            Report a problem
          </Button>
          <Button
            variant="secondary"
            onClick={openPalette}
            aria-keyshortcuts={PALETTE_KEYS.aria}
            data-testid="shortcut-sheet-palette"
          >
            Search every command
            <Kbd aria-hidden>{PALETTE_KEYS.label}</Kbd>
          </Button>
        </>
      }
    >
      <label
        className={cn(
          'flex h-8 items-center gap-2 rounded-[var(--daw-radius-sm)] border border-daw-outline px-2 text-daw-text-3 focus-within:border-daw-text-2 [&_svg]:size-4',
          TRANSITION,
        )}
      >
        <Search aria-hidden />
        <input
          data-testid="shortcut-sheet-search"
          type="text"
          aria-label="Search shortcuts"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search shortcuts: a word or a key"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={cn(
            TYPE_CLASS.body,
            'h-7 min-w-0 flex-1 bg-transparent text-daw-text outline-none placeholder:text-daw-text-3',
          )}
        />
      </label>
      <div
        className="flex flex-col gap-3 border-b border-daw-hairline py-3"
        data-testid="shortcut-switches"
      >
        <SettingRow
          label="Single-key shortcuts"
          description="Letter, number and symbol keys on their own (R, M, 1, ?). Turn off if you press them by accident."
        >
          {({ descriptionId }) => (
            <Toggle
              label="Single-key shortcuts"
              pressed={singleKeys}
              onPressedChange={setSingleKeys}
              aria-describedby={descriptionId}
            >
              {singleKeys ? 'On' : 'Off'}
            </Toggle>
          )}
        </SettingRow>
        <SettingRow
          label="Play notes from the computer keyboard"
          description="While it’s on, the letter keys play notes, not shortcuts."
        >
          {({ descriptionId }) => (
            <Toggle
              label="Play notes from the computer keyboard"
              pressed={typing}
              onPressedChange={setTyping}
              aria-describedby={descriptionId}
            >
              {typing ? 'On' : 'Off'}
            </Toggle>
          )}
        </SettingRow>
      </div>
      {sections.length === 0 ? (
        <p
          role="status"
          className={cn(TYPE_CLASS.body, 'py-6 text-center text-daw-text-3')}
        >
          No shortcut matches “{query.trim()}”. Search every command to find the
          ones without a key.
        </p>
      ) : (
        <div
          className="columns-1 gap-8 pt-3 min-[1280px]:columns-2"
          data-testid="shortcut-sections"
        >
          {sections.map((section) => (
            <ScopeSection
              key={section.scope.id}
              section={section}
              singleKeysOff={!singleKeys}
            />
          ))}
        </div>
      )}
    </DawDialog>
  );
}
