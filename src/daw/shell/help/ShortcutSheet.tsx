import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { chordLabel, isCharacterKey } from '@/daw/commands/keys';
import { useMusicalTypingStore } from '@/daw/commands/musicalTypingStore';
import {
  commandsOf,
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

/** The keys of one row: 'Delete', 'Backspace'; a long run as one label. */
function rowKeys(command: DeclaredCommand): string[] {
  if (command.keysLabel) return [command.keysLabel];
  return [...new Set(command.chords.map((chord) => chordLabel(chord)))];
}

function isSingleKey(command: DeclaredCommand): boolean {
  return command.chords.some(isCharacterKey);
}

/** Lower case, spaces and '+' gone: how a typed key is compared. */
function foldKey(text: string): string {
  return text.toLowerCase().replace(/[\s+]+/g, '');
}

/** Whether `query` is one of the command's keys as the sheet shows it. */
function matchesKey(command: DeclaredCommand, query: string): boolean {
  const typed = foldKey(query);
  if (typed === '') return false;
  return rowKeys(command).some((keys) => foldKey(keys) === typed);
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
 * ('L', 'space'); a scope left with none is left out.
 */
export function sheetSections(query = ''): SheetSection[] {
  return sortedScopes()
    .map((scope) => ({
      scope,
      // A command without keys (Export…) is the palette's, not the sheet's.
      commands: commandsOf(scope.id).filter(
        (c) =>
          !c.hidden &&
          c.keys.length > 0 &&
          (matchScore(c, query) > 0 || matchesKey(c, query)),
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

  // The sheet goes first, so focus is back on the page when the palette
  // (or the report) takes it; the palette then lists what works there.
  const openPalette = () => {
    useShortcutSheetStore.getState().close();
    usePaletteStore.getState().open();
  };
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
