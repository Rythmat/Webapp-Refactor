import { useEffect } from 'react';
import { isOpening } from '@/daw/session/sessionStore';
import { useStore } from '@/daw/store';
import {
  isCharacterKey,
  isFormControl,
  isTextField,
  matchesChord,
  overlayAround,
} from './keys';
import { useMusicalTypingStore } from './musicalTypingStore';
import {
  boundScopes,
  commandsOf,
  type BoundScope,
  type DeclaredCommand,
} from './registry';
import './keymaps';

// ── The one keyboard listener (milestone 1.6) ──────────────────────────────
//
// Every key press in the editor comes through here, on the window in the
// capture phase, before any element sees it. It finds the scopes that may
// answer it, in the plan's precedence (dialog > musical typing > focused
// region > view > global; registry.ts), and runs the first command bound to
// the key that takes it. That command's key is then kept from the browser
// (preventDefault). Nothing is stopped: a focused button, a field or a
// Radix menu still gets every key, and only knows it was handled.
//
// A key is left alone when:
// - something already took it (e.defaultPrevented) or an IME is composing;
// - focus is in a text field, except for Save, which commits the field and
//   saves; any other form control keeps its plain keys;
// - it is pressed in a dialog, menu or list box: only that overlay's own
//   scopes, if it bound any, and Save answer there;
// - a project is opening: nothing runs, though ⌘S is kept from the browser;
// - it is a character key (a letter, digit or symbol with no ⌘ or ⌥) and
//   the student has turned single-key shortcuts off (WCAG 2.1.4), or the
//   computer keyboard is playing notes, which suspends them.
// A held key acts once unless its command repeats (nudge, undo, zoom); the
// repeats are still kept from the browser, so a held Space never scrolls.

interface Candidate {
  bound: BoundScope;
  /** Below a modal scope: the commands (or scopes) still allowed. */
  allowed: ReadonlySet<string> | null;
}

/** The overlay's default: only Save gets through a dialog it doesn't know. */
const OVERLAY_PASS_THROUGH: ReadonlySet<string> = new Set(['project.save']);

function depthOrder(a: BoundScope, b: BoundScope): number {
  const ea = a.element?.();
  const eb = b.element?.();
  if (ea && eb && ea !== eb) {
    if (ea.contains(eb)) return 1;
    if (eb.contains(ea)) return -1;
  }
  return b.order - a.order;
}

function containsTarget(bound: BoundScope, target: Node | null): boolean {
  const el = bound.element?.();
  return !!el && !!target && el.contains(target);
}

/** The scopes a key press tries, in order, each with what it may run. */
export function candidateScopes(e: KeyboardEvent): Candidate[] {
  const target = e.target instanceof Node ? e.target : null;
  const all = boundScopes().filter((b) => b.isActive());
  const out: Candidate[] = [];
  let allowed: ReadonlySet<string> | null = null;
  const push = (bound: BoundScope) => {
    out.push({ bound, allowed });
    const pass = bound.scope.passThrough;
    if (pass) {
      const next = new Set(pass);
      // A second modal can only narrow what the first let through.
      allowed = allowed
        ? new Set([...next].filter((id) => allowed!.has(id)))
        : next;
    }
  };

  // A dialog, menu or list box with focus (a Radix dialog, a menu, a list
  // inside the pop-out): only its own scopes answer, then what it lets
  // through. The floating overlays below wait, so Escape closes the
  // innermost thing first.
  const overlay = overlayAround(e.target);
  if (overlay) {
    const inside = all
      .filter((b) => {
        const el = b.element?.();
        return !!el && overlay.contains(el) && containsTarget(b, target);
      })
      .sort(depthOrder);
    for (const bound of inside) push(bound);
    const owned = inside.some((b) => b.element?.() === overlay);
    if (!owned) {
      allowed = allowed
        ? new Set([...OVERLAY_PASS_THROUGH].filter((id) => allowed!.has(id)))
        : OVERLAY_PASS_THROUGH;
    }
    // Then what it lets through: Save, and for the modal piano roll the
    // transport, undo and the computer keyboard.
    for (const level of ['typing', 'global'] as const) {
      for (const bound of all.filter((b) => b.scope.level === level)) {
        push(bound);
      }
    }
    return out;
  }

  // Overlays that float over the editor without holding focus (the Prism
  // suggestions, a pop-out): the newest first.
  const floating = all
    .filter((b) => b.scope.level === 'dialog' && !b.element)
    .sort((a, b) => b.order - a.order);
  for (const bound of floating) push(bound);

  for (const bound of all.filter((b) => b.scope.level === 'typing')) {
    push(bound);
  }
  const regions = all
    .filter((b) => b.scope.level === 'region' && containsTarget(b, target))
    .sort(depthOrder);
  for (const bound of regions) push(bound);
  const view = useStore.getState().currentView;
  const views = all
    .filter((b) => b.scope.level === 'view' && !!b.scope.views?.includes(view))
    .sort((a, b) => b.order - a.order);
  for (const bound of views) push(bound);
  for (const bound of all.filter((b) => b.scope.level === 'global')) {
    push(bound);
  }
  return out;
}

function matches(e: KeyboardEvent, command: DeclaredCommand): boolean {
  return command.chords.some((chord) => matchesChord(e, chord));
}

/** Whether the switch or musical typing has this command's key off. */
function suspended(
  e: KeyboardEvent,
  command: DeclaredCommand,
  bound: BoundScope,
): boolean {
  const chord = command.chords.find((c) => matchesChord(e, c));
  if (!chord || !isCharacterKey(chord)) return false;
  // Musical typing is the student's own switch, so it answers either way.
  if (bound.scope.level === 'typing') return false;
  if (!useStore.getState().singleKeyShortcuts) return true;
  // While the keys play notes, the letter shortcuts below them rest, so a
  // key the piano doesn't use (M, digits) changes nothing either.
  return (
    bound.scope.level !== 'dialog' && useMusicalTypingStore.getState().enabled
  );
}

/** Handles one keydown; returns the id of the command that took it. */
export function dispatchKey(e: KeyboardEvent): string | null {
  if (e.defaultPrevented || e.isComposing || e.key === 'Process') return null;

  if (isOpening()) {
    // The project is about to change under the keys. ⌘S still never opens
    // the browser's Save Page dialog.
    if (e.code === 'KeyS' && (e.metaKey || e.ctrlKey)) e.preventDefault();
    return null;
  }

  const target = e.target;
  const textField = isTextField(target);
  const plain = !(e.metaKey || e.ctrlKey || e.altKey);
  const formControl = plain && isFormControl(target);

  for (const { bound, allowed } of candidateScopes(e)) {
    for (const command of commandsOf(bound.scope.id)) {
      if (!matches(e, command)) continue;
      if (allowed && !allowed.has(command.id) && !allowed.has(command.scope)) {
        continue;
      }
      if (textField && !command.allowInEditable) continue;
      if (formControl && !command.allowInEditable) continue;
      if (suspended(e, command, bound)) continue;
      const handler = bound.handlers.current[command.id];
      if (!handler) continue;
      if (e.repeat && !command.repeat) {
        e.preventDefault();
        return command.id;
      }
      if (handler(e) === false) continue;
      e.preventDefault();
      return command.id;
    }
  }
  return null;
}

let installs = 0;
const onKeyDown = (e: KeyboardEvent) => {
  dispatchKey(e);
};

/** Adds the window listener; returns its removal. Safe to call twice. */
export function installKeyDispatcher(): () => void {
  if (installs++ === 0) {
    window.addEventListener('keydown', onKeyDown, { capture: true });
  }
  return () => {
    if (--installs === 0) {
      window.removeEventListener('keydown', onKeyDown, { capture: true });
    }
  };
}

/** The editor's keyboard, for as long as it is mounted. */
export function useKeyDispatcher(): void {
  useEffect(() => installKeyDispatcher(), []);
}
