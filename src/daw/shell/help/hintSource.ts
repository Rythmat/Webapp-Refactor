import { chordLabel, isTextField, type KeyChord } from '@/daw/commands/keys';

// ── What the hint line says (milestone 2.11) ───────────────────────────────
//
// The bottom rail says what the control under the pointer (or the keyboard
// focus) does, as Soundation's status bar does. One rule finds the words,
// nearest first, walking up from the element the event landed on:
//   1. its `data-hint` (the Tooltip primitive puts its tip there, with the
//      shortcut after a ' · ', so a tip is never written twice);
//   2. its `aria-label`, with its `aria-keyshortcuts` as the student's
//      keyboard names them ('Play · Space', 'Undo · ⌘Z');
//   3. nothing: the walk goes on through plain ancestors only, and stops at
//      the first interactive element, so a button never borrows the name of
//      the panel around it. A text field says nothing (the student is
//      typing), and a region's name (a group, a toolbar, a dialog) is where
//      the pointer is, not what a control does, so only a `data-hint` there
//      counts.
// One exception to 'nearest': a component that puts its extra props on a
// wrapper (Fader, Knob, Meter) can't put a `data-hint` on its control, so a
// `data-hint` on a near ancestor (WRAPPER_DEPTH levels) that holds no other
// control beats the control's own `aria-label`.
// Overlays (menus, popovers, dialogs) follow the same rule.
//
// It costs nothing during playback: one delegated listener on the document,
// and a tiny store that tells its one reader (HintLine) only when the words
// change. Nothing here writes to the editor's store, and nothing runs on
// pointermove.

const INTERACTIVE_TAGS = new Set([
  'BUTTON',
  'A',
  'INPUT',
  'SELECT',
  'TEXTAREA',
]);

const INTERACTIVE_ROLES = new Set([
  'button',
  'checkbox',
  'combobox',
  'link',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'slider',
  'spinbutton',
  'switch',
  'tab',
  'textbox',
]);

/** Roles whose aria-label names a place, not what a control does. */
const REGION_ROLES = new Set([
  'alertdialog',
  'application',
  'banner',
  'complementary',
  'contentinfo',
  'dialog',
  'form',
  'grid',
  'group',
  'list',
  'listbox',
  'main',
  'menu',
  'menubar',
  'navigation',
  'none',
  'presentation',
  'radiogroup',
  'region',
  'tablist',
  'tabpanel',
  'toolbar',
  'tree',
]);

/** Elements that are a region by their tag ('Create' is the main section). */
const REGION_TAGS = new Set([
  'ASIDE',
  'DIALOG',
  'FIELDSET',
  'FOOTER',
  'FORM',
  'HEADER',
  'MAIN',
  'NAV',
  'OL',
  'SECTION',
  'TABLE',
  'UL',
]);

/** Whether the element's name is a place: by its role, or else its tag. */
function isRegion(el: Element): boolean {
  const role = el.getAttribute('role');
  return role !== null ? REGION_ROLES.has(role) : REGION_TAGS.has(el.tagName);
}

/** A button, a link, a form control, or anything with a control's role. */
export function isInteractive(el: Element): boolean {
  if (INTERACTIVE_TAGS.has(el.tagName)) return true;
  const role = el.getAttribute('role');
  return role !== null && INTERACTIVE_ROLES.has(role);
}

/** The words for one element, or '' when it has none of its own. */
function ownHint(el: Element): string {
  const hint = el.getAttribute('data-hint')?.trim();
  if (hint) return hint;
  if (isRegion(el)) return '';
  const label = el.getAttribute('aria-label')?.trim();
  if (!label) return '';
  const keys = keysLabel(el.getAttribute('aria-keyshortcuts'));
  return keys ? `${label} · ${keys}` : label;
}

/** Any control, by tag or role (isInteractive as a selector). */
const CONTROL_SELECTOR = [
  ...[...INTERACTIVE_TAGS].map((tag) => tag.toLowerCase()),
  ...[...INTERACTIVE_ROLES].map((role) => `[role="${role}"]`),
].join(', ');

/** How far up a wrapper's `data-hint` may be from its control. */
const WRAPPER_DEPTH = 3;

/**
 * The `data-hint` of a wrapper around `el` that holds no control but `el`
 * (a Fader's or a Meter's root, given the hint through its props), or ''.
 */
function wrapperHint(el: Element): string {
  let wrapper = el.parentElement;
  for (let depth = 0; depth < WRAPPER_DEPTH && wrapper; depth += 1) {
    if (wrapper === wrapper.ownerDocument.body || isInteractive(wrapper)) {
      return '';
    }
    const controls = wrapper.querySelectorAll(CONTROL_SELECTOR);
    if (controls.length > 1 || (controls.length === 1 && controls[0] !== el)) {
      return '';
    }
    const hint = wrapper.getAttribute('data-hint')?.trim();
    if (hint) return hint;
    wrapper = wrapper.parentElement;
  }
  return '';
}

/** What the hint line says for an event that landed on `target`. */
export function resolveHint(target: EventTarget | null): string {
  let el = target instanceof Element ? target : null;
  if (el && isTextField(el)) return '';
  while (el && el !== el.ownerDocument.body) {
    if (el.getAttribute('data-hint')?.trim()) return ownHint(el);
    const label = ownHint(el);
    if (label) return wrapperHint(el) || label;
    if (isInteractive(el)) return wrapperHint(el);
    el = el.parentElement;
  }
  return '';
}

/**
 * A control's own `data-hint`: its name, what it does in plain words, and its
 * key, joined by ' · ' ('Loop · Play the loop range over and over · L').
 * Empty parts drop out, so a control without a key just leaves it off.
 */
export function hintText(
  ...parts: (string | false | null | undefined)[]
): string {
  return parts
    .filter((part): part is string => !!part && !!part.trim())
    .join(' · ');
}

// ── aria-keyshortcuts as a key label ───────────────────────────────────────

const ARIA_MODIFIERS = new Set(['Meta', 'Control', 'Alt', 'Shift']);

/**
 * The first shortcut of an aria-keyshortcuts value in the label the rest of
 * the editor shows ('Meta+Shift+Z' → '⇧⌘Z' on a Mac, 'Control+Shift+Z' →
 * 'Ctrl+Shift+Z' elsewhere), or '' when there is none.
 */
export function keysLabel(
  aria: string | null | undefined,
  apple?: boolean,
): string {
  const first = aria?.trim().split(/\s+/)[0];
  if (!first) return '';
  const parts = first.split('+');
  // 'Shift++' would end in two empty parts: the key is '+'.
  const key = parts.pop() || (parts.pop() === '' ? '+' : '');
  if (!key || parts.some((p) => !ARIA_MODIFIERS.has(p))) return '';
  const isChar = [...key].length === 1;
  const chord: KeyChord = {
    mod: parts.includes('Meta') || parts.includes('Control'),
    shift: parts.includes('Shift'),
    alt: parts.includes('Alt'),
    code: isChar ? null : key,
    char: isChar ? key : null,
  };
  return apple === undefined ? chordLabel(chord) : chordLabel(chord, apple);
}

// ── The store HintLine reads ───────────────────────────────────────────────

let current = '';
const listeners = new Set<() => void>();

/** What the hint line says now. */
export function getHint(): string {
  return current;
}

/** Calls `listener` whenever the words change (for useSyncExternalStore). */
export function subscribeHint(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Sets the words; tells the readers only when they changed. */
export function setHint(text: string): void {
  if (text === current) return;
  current = text;
  for (const listener of listeners) listener();
}

/**
 * Starts the one delegated listener: a pointer coming over an element, or
 * the focus moving to one, sets the words; the pointer leaving the window
 * clears them. Returns the stop, which clears them too.
 */
export function listenForHints(doc: Document = document): () => void {
  const onEnter = (e: Event) => setHint(resolveHint(e.target));
  const onLeave = () => setHint('');
  const root = doc.documentElement;
  // Capture, so a handler that stops propagation can't hide a control.
  doc.addEventListener('pointerover', onEnter, true);
  doc.addEventListener('focusin', onEnter, true);
  root.addEventListener('pointerleave', onLeave);
  return () => {
    doc.removeEventListener('pointerover', onEnter, true);
    doc.removeEventListener('focusin', onEnter, true);
    root.removeEventListener('pointerleave', onLeave);
    setHint('');
  };
}
