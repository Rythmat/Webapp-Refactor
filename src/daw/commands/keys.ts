import { isApplePlatform } from '@/daw/shell/topbar/platformKeys';

// ── Key bindings (milestone 1.6) ───────────────────────────────────────────
//
// A command names its keys as strings: modifiers, then one key, joined by
// '+'. 'Mod' is ⌘ on a Mac and Ctrl elsewhere (either works on either, as
// the editor always took both). The key is one of two kinds:
// - an `e.code` name ('KeyS', 'Digit1', 'Space', 'ArrowLeft', 'Equal'): the
//   key where it sits on the keyboard. Letters and Alt combos are matched
//   this way, since Option rewrites the letter on a Mac ('⌥R' sends '®').
// - one character ('?', '.', '>'): what the key types, so Shift is part of
//   it and is not checked. The Score's marks are typed this way.
// Modifiers must match exactly: R records, but ⌥R and ⌘R are not R.

export interface KeyChord {
  mod: boolean;
  shift: boolean;
  alt: boolean;
  /** An e.code name, or null when `char` is set. */
  code: string | null;
  /** One character, compared with e.key; Shift is not checked. */
  char: string | null;
}

const MODIFIERS = new Set(['Mod', 'Shift', 'Alt']);

/** 'Mod+Shift+KeyZ' as a chord. Throws on a binding that can't be one. */
export function parseKeys(binding: string): KeyChord {
  // '+' itself is a key ('Shift++' never comes up; Equal is used instead).
  const parts = binding.split('+');
  const key = parts.pop() ?? '';
  for (const part of parts) {
    if (!MODIFIERS.has(part)) {
      throw new Error(`Unknown modifier "${part}" in "${binding}"`);
    }
  }
  if (!key) throw new Error(`No key in "${binding}"`);
  const isChar = [...key].length === 1;
  return {
    mod: parts.includes('Mod'),
    shift: parts.includes('Shift'),
    alt: parts.includes('Alt'),
    code: isChar ? null : key,
    char: isChar ? key : null,
  };
}

/** Whether `e` is this chord, modifiers and all. */
export function matchesChord(e: KeyboardEvent, chord: KeyChord): boolean {
  const mod = e.metaKey || e.ctrlKey;
  if (mod !== chord.mod || e.altKey !== chord.alt) return false;
  if (chord.char !== null) {
    return e.key.toLowerCase() === chord.char.toLowerCase();
  }
  return e.code === chord.code && e.shiftKey === chord.shift;
}

/**
 * A character-key shortcut in WCAG 2.1.4's sense: a letter, digit,
 * punctuation or symbol with no ⌘, Ctrl or ⌥. These are the ones the
 * single-key switch turns off. Space, Escape, Return, Delete, Backspace,
 * Tab and the arrows are not character keys.
 */
export function isCharacterKey(chord: KeyChord): boolean {
  if (chord.mod || chord.alt) return false;
  if (chord.char !== null) return chord.char !== ' ';
  return /^(Key[A-Z]|Digit\d|Numpad\d|Backquote|Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Comma|Period|Slash)$/.test(
    chord.code ?? '',
  );
}

// ── Labels ─────────────────────────────────────────────────────────────────

const CODE_LABEL: Record<string, string> = {
  Space: 'Space',
  Escape: 'Esc',
  // Return on a Mac's key; elsewhere the key says Enter (keyLabel).
  Enter: 'Return',
  ContextMenu: 'Menu',
  Delete: 'Delete',
  Backspace: 'Backspace',
  Tab: 'Tab',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Backquote: '`',
  Minus: '−',
  Equal: '=',
  Semicolon: ';',
  Slash: '/',
  Period: '.',
  Comma: ',',
};

function keyLabel(chord: KeyChord, apple: boolean): string {
  if (chord.char !== null) return chord.char.toUpperCase();
  const code = chord.code ?? '';
  if (code === 'Enter' && !apple) return 'Enter';
  if (CODE_LABEL[code]) return CODE_LABEL[code];
  const letter = /^Key([A-Z])$/.exec(code);
  if (letter) return letter[1];
  const digit = /^Digit(\d)$/.exec(code);
  if (digit) return digit[1];
  return code;
}

/**
 * What the student presses, in their keyboard's words: '⇧⌘Z' on a Mac,
 * 'Ctrl+Shift+Z' on a Chromebook or Windows laptop.
 */
export function chordLabel(
  chord: KeyChord,
  apple: boolean = isApplePlatform(),
): string {
  const key = keyLabel(chord, apple);
  if (apple) {
    return `${chord.alt ? '⌥' : ''}${chord.shift ? '⇧' : ''}${chord.mod ? '⌘' : ''}${key}`;
  }
  const parts: string[] = [];
  if (chord.mod) parts.push('Ctrl');
  if (chord.alt) parts.push('Alt');
  if (chord.shift) parts.push('Shift');
  parts.push(key);
  return parts.join('+');
}

/** Keys aria-keyshortcuts names by their KeyboardEvent.key. */
const ARIA_KEY_NAMES = new Set(['Escape', 'Enter', 'ContextMenu']);

/** The aria-keyshortcuts value of a chord: 'Meta+Shift+Z', 'Alt+R'. */
export function chordAria(
  chord: KeyChord,
  apple: boolean = isApplePlatform(),
): string {
  const parts: string[] = [];
  if (chord.mod) parts.push(apple ? 'Meta' : 'Control');
  if (chord.alt) parts.push('Alt');
  if (chord.shift) parts.push('Shift');
  // The key's own name where the label is a nickname (Esc, Return, Menu).
  const code = chord.code ?? '';
  parts.push(ARIA_KEY_NAMES.has(code) ? code : keyLabel(chord, apple));
  return parts.join('+');
}

// ── Where a key press lands ────────────────────────────────────────────────

// Inputs nobody types into. Their plain keys are still theirs (Space ticks a
// checkbox, the arrows move a range slider), but undo works while they have
// focus.
const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

const EDITABLE = '[contenteditable]:not([contenteditable="false"])';

/** A field the student types into: every key but ⌘S belongs to its text. */
export function isTextField(target: EventTarget | null): boolean {
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLInputElement) {
    return !NON_TEXT_INPUT_TYPES.has(target.type);
  }
  return target instanceof Element && target.closest(EDITABLE) !== null;
}

/** Any form control (text fields and selects too), which keeps its plain keys. */
export function isFormControl(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(`input, textarea, select, ${EDITABLE}`) !== null
  );
}

/**
 * Inside a focusable widget that answers keys itself: a knob, a slider, the
 * docked piano roll or drum grid. Its arrows and Delete are not the
 * timeline's.
 */
export function isInKeyWidget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('[tabindex]:not([tabindex="-1"])') !== null
  );
}

/** The open dialog, menu or list box the key was pressed in, if any. */
export function overlayAround(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;
  return target.closest(
    '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]',
  );
}
