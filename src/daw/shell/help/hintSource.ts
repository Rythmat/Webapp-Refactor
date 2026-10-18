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
  'listitem',
  'main',
  'menu',
  'menubar',
  'navigation',
  'none',
  'presentation',
  'radiogroup',
  'region',
  'row',
  'tablist',
  'tabpanel',
  'toolbar',
  'tree',
]);

/**
 * Elements that are a region by their tag ('Create' is the main section). A
 * list item or a row is one too: a track row's background is the row, not
 * something it does.
 */
const REGION_TAGS = new Set([
  'ASIDE',
  'DIALOG',
  'FIELDSET',
  'FOOTER',
  'FORM',
  'HEADER',
  'LI',
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
 * A wrapper around `el` with a `data-hint` that holds no control but `el`
 * (a Fader's or a Meter's root, given the hint through its props), or null.
 */
function hintWrapper(el: Element): Element | null {
  let wrapper = el.parentElement;
  for (let depth = 0; depth < WRAPPER_DEPTH && wrapper; depth += 1) {
    if (wrapper === wrapper.ownerDocument.body || isInteractive(wrapper)) {
      return null;
    }
    const controls = wrapper.querySelectorAll(CONTROL_SELECTOR);
    if (controls.length > 1 || (controls.length === 1 && controls[0] !== el)) {
      return null;
    }
    if (wrapper.getAttribute('data-hint')?.trim()) return wrapper;
    wrapper = wrapper.parentElement;
  }
  return null;
}

interface ResolvedHint {
  text: string;
  /** The element the words came from (null when there are none). */
  source: Element | null;
}

const NO_HINT: ResolvedHint = { text: '', source: null };

/** The words for an event on `target`, and the element they came from. */
function resolveHintSource(target: EventTarget | null): ResolvedHint {
  let el = target instanceof Element ? target : null;
  if (el && isTextField(el)) return NO_HINT;
  while (el && el !== el.ownerDocument.body) {
    if (el.getAttribute('data-hint')?.trim()) {
      return { text: ownHint(el), source: el };
    }
    const label = ownHint(el);
    const wrapper = label || isInteractive(el) ? hintWrapper(el) : null;
    if (wrapper) return { text: ownHint(wrapper), source: wrapper };
    if (label) return { text: label, source: el };
    if (isInteractive(el)) return NO_HINT;
    el = el.parentElement;
  }
  return NO_HINT;
}

/** What the hint line says for an event that landed on `target`. */
export function resolveHint(target: EventTarget | null): string {
  return resolveHintSource(target).text;
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

/** The attributes the words are read from. */
const HINT_ATTRIBUTES = ['data-hint', 'aria-label', 'aria-keyshortcuts'];

/**
 * Starts the one delegated listener: a pointer coming over an element, or
 * the focus moving to one, sets the words; the pointer leaving the window
 * clears them. Returns the stop, which clears them too.
 *
 * A control that changes its own words under the pointer (Play becomes
 * Pause) is read again: one MutationObserver watches the element the words
 * came from, for those attributes only, so a meter or the playhead moving
 * elsewhere never wakes it.
 */
export function listenForHints(doc: Document = document): () => void {
  let lastTarget: EventTarget | null = null;
  const observer =
    typeof MutationObserver === 'undefined'
      ? null
      : new MutationObserver(() => setHint(resolveHint(lastTarget)));
  const show = (target: EventTarget | null) => {
    lastTarget = target;
    const { text, source } = resolveHintSource(target);
    observer?.disconnect();
    if (source) {
      observer?.observe(source, {
        attributes: true,
        attributeFilter: HINT_ATTRIBUTES,
      });
    }
    setHint(text);
  };
  const onEnter = (e: Event) => show(e.target);
  const onLeave = () => show(null);
  const root = doc.documentElement;
  // Capture, so a handler that stops propagation can't hide a control.
  doc.addEventListener('pointerover', onEnter, true);
  doc.addEventListener('focusin', onEnter, true);
  root.addEventListener('pointerleave', onLeave);
  return () => {
    doc.removeEventListener('pointerover', onEnter, true);
    doc.removeEventListener('focusin', onEnter, true);
    root.removeEventListener('pointerleave', onLeave);
    observer?.disconnect();
    lastTarget = null;
    setHint('');
  };
}
