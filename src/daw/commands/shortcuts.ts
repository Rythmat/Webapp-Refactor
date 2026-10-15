import { chordAria, chordLabel } from './keys';
import { getCommand } from './registry';
import type { ShortcutKeys } from '@/daw/shell/topbar/platformKeys';
import './keymaps';

/**
 * A command's first key as the student's keyboard names it, for tooltips,
 * menus and aria-keyshortcuts: '⇧⌘Z' on a Mac, 'Ctrl+Shift+Z' elsewhere.
 * The registry is the one place a shortcut is written down.
 */
export function shortcutKeys(commandId: string): ShortcutKeys {
  const command = getCommand(commandId);
  const chord = command?.chords[0];
  if (!chord) throw new Error(`No shortcut for "${commandId}"`);
  return { label: chordLabel(chord), aria: chordAria(chord) };
}
