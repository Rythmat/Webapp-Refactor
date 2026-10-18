import { chordLabel, isCharacterKey } from '@/daw/commands/keys';
import { useMusicalTypingStore } from '@/daw/commands/musicalTypingStore';
import {
  commandsOf,
  type DeclaredCommand,
  type ScopeDef,
} from '@/daw/commands/registry';
import { sortedScopes } from '@/daw/commands/scopeOrder';
import { useStore } from '@/daw/store';
import { DawDialog } from '@/daw/ui/DawDialog';
import { Kbd } from '@/daw/ui/Kbd';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { Toggle } from '@/daw/ui/Toggle';
import { cn } from '@/components/utilities';
import '@/daw/commands/keymaps';

// ── The '?' sheet (milestone 1.6, Stage A) ─────────────────────────────────
//
// Every shortcut, read from the command registry and grouped by where it
// works, so the sheet can never list a key the editor doesn't have. It also
// holds the two switches that change what keys do: single-key shortcuts
// (WCAG 2.1.4) and the computer keyboard as a piano. Stage B (2.11) restyles
// it in place and links it from the help menu; 3.14 adds remapping.

/** The keys of one row: 'Delete', 'Backspace'; a long run as one label. */
function rowKeys(command: DeclaredCommand): string[] {
  if (command.keysLabel) return [command.keysLabel];
  return [...new Set(command.chords.map((chord) => chordLabel(chord)))];
}

function isSingleKey(command: DeclaredCommand): boolean {
  return command.chords.some(isCharacterKey);
}

function ScopeSection({
  scope,
  singleKeysOff,
}: {
  scope: ScopeDef;
  singleKeysOff: boolean;
}) {
  // A command without keys (Export…) is the palette's, not the sheet's.
  const rows = commandsOf(scope.id).filter(
    (c) => !c.hidden && c.keys.length > 0,
  );
  if (rows.length === 0) return null;
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
        {rows.map((command) => {
          // The typing scope's letters are the student's own switch.
          const off =
            singleKeysOff && scope.level !== 'typing' && isSingleKey(command);
          return (
            <li
              key={command.id}
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
  return (
    <DawDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Keyboard shortcuts"
      description="Keys work in the area you’re working in: Delete in the Score deletes notes, in Create it deletes the selected clip."
    >
      <div
        className="flex flex-col gap-2 border-b border-daw-hairline pb-3"
        data-testid="shortcut-switches"
      >
        <div className="flex items-center justify-between gap-3">
          <span className={cn(TYPE_CLASS.body, 'text-daw-text')}>
            Single-key shortcuts
            <span className="block text-daw-text-3">
              Letter, number and symbol keys on their own (R, M, 1, ?). Turn off
              if you press them by accident.
            </span>
          </span>
          <Toggle
            label="Single-key shortcuts"
            pressed={singleKeys}
            onPressedChange={setSingleKeys}
          >
            {singleKeys ? 'On' : 'Off'}
          </Toggle>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className={cn(TYPE_CLASS.body, 'text-daw-text')}>
            Play notes from the computer keyboard
            <span className="block text-daw-text-3">
              While it’s on, the letter keys play notes, not shortcuts.
            </span>
          </span>
          <Toggle
            label="Play notes from the computer keyboard"
            pressed={typing}
            onPressedChange={setTyping}
          >
            {typing ? 'On' : 'Off'}
          </Toggle>
        </div>
      </div>
      <div className="columns-1 gap-8 pt-3 md:columns-2">
        {sortedScopes().map((scope) => (
          <ScopeSection
            key={scope.id}
            scope={scope}
            singleKeysOff={!singleKeys}
          />
        ))}
      </div>
    </DawDialog>
  );
}
