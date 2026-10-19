import { useEffect, useRef, type RefObject } from 'react';
import type { ViewType } from '@/daw/store/uiSlice';
import { parseKeys, type KeyChord } from './keys';

// ── The command registry (milestone 1.6) ───────────────────────────────────
//
// Every keyboard shortcut in the editor is declared here once, by the scope
// it belongs to: its label, its keys, and when it may run. The one window
// listener (dispatcher.ts) reads the declarations to decide which command a
// key press is, and the '?' sheet lists them, so a shortcut that isn't
// declared doesn't exist. What a command does is bound separately, by the
// component that owns the scope (useKeymap): the Score's Delete needs the
// Score's selection. A scope whose component isn't mounted is listed in the
// sheet but answers no keys, so nothing acts on a view nobody can see.
//
// The levels, in the order a key press tries them (the plan's keyboard
// precedence): dialog > musical typing > focused region > view > global.
// - dialog: an overlay over the editor (the Prism suggestions, the pop-out
//   synth, the modal piano roll). A modal one lets nothing below it run but
//   the commands it passes through (Save, Undo).
// - typing: the computer keyboard as a piano, while it is on.
// - region: a focusable area with keys of its own (the docked piano roll,
//   the drum grid). It answers only while focus is inside it.
// - view: the keys of the view on screen (Create's timeline, the Score).
// - global: transport, save, undo, export, the sheet.
// The declarations live in keymaps.ts. A command with no keys is declared
// too (Export…, Add a track…): the command palette (⌘K, 2.15) runs every
// command by name through the same handlers (dispatcher.ts runCommand), and
// the '?' sheet lists only the ones with keys.

export type ScopeLevel = 'dialog' | 'typing' | 'region' | 'view' | 'global';

export interface ScopeDef {
  id: string;
  /** The sheet's heading for it. */
  label: string;
  level: ScopeLevel;
  /** A view scope: the views it answers in. */
  views?: readonly ViewType[];
  /**
   * A modal scope: once it has had its turn, only these commands (by id, or
   * every command of a scope by its id) run below it.
   */
  passThrough?: readonly string[];
}

export interface CommandDef {
  id: string;
  /** The id of its scope. */
  scope: string;
  /** What it does, as the sheet says it. */
  label: string;
  /** Its keys (keys.ts says how they are written); the first is the label. */
  keys: readonly string[];
  /** What the sheet shows for a long row of keys ('A–;'). */
  keysLabel?: string;
  /** Runs in a text field too. Only Save does. */
  allowInEditable?: boolean;
  /** Runs again while the key is held. Without it, a held key acts once. */
  repeat?: boolean;
  /** Left out of the sheet (a browser key the editor only keeps away). */
  hidden?: boolean;
  /**
   * False for a command that means nothing without its key (a note length
   * typed as a digit), which the command palette (2.15) leaves out.
   */
  palette?: false;
  /** Other words the palette finds it by ('bounce' for Export). */
  keywords?: readonly string[];
}

export interface DeclaredCommand extends CommandDef {
  chords: readonly KeyChord[];
}

/**
 * A bound command: true or nothing when it handled the key (the dispatcher
 * then prevents the browser's default), false to let the next scope try.
 */
export type CommandHandler = (e: KeyboardEvent) => boolean | void;
export type KeymapHandlers = Readonly<Record<string, CommandHandler>>;

const scopes = new Map<string, ScopeDef>();
const commands = new Map<string, DeclaredCommand>();
const byScope = new Map<string, DeclaredCommand[]>();

export function defineScope(def: ScopeDef): ScopeDef {
  if (scopes.has(def.id)) throw new Error(`Scope "${def.id}" twice`);
  scopes.set(def.id, def);
  byScope.set(def.id, []);
  return def;
}

export function defineCommand(def: CommandDef): DeclaredCommand {
  if (commands.has(def.id)) throw new Error(`Command "${def.id}" twice`);
  const list = byScope.get(def.scope);
  if (!list) throw new Error(`Command "${def.id}": no scope "${def.scope}"`);
  const declared = { ...def, chords: def.keys.map(parseKeys) };
  commands.set(def.id, declared);
  list.push(declared);
  return declared;
}

export function getScope(id: string): ScopeDef | undefined {
  return scopes.get(id);
}

/** Every scope, in the order they were declared (the sheet's order). */
export function allScopes(): ScopeDef[] {
  return [...scopes.values()];
}

export function commandsOf(scopeId: string): readonly DeclaredCommand[] {
  return byScope.get(scopeId) ?? [];
}

export function getCommand(id: string): DeclaredCommand | undefined {
  return commands.get(id);
}

// ── Bound scopes ───────────────────────────────────────────────────────────

export interface BoundScope {
  scope: ScopeDef;
  handlers: { readonly current: KeymapHandlers };
  /** A region, or a dialog with an element: answers when focus is inside. */
  element?: () => Element | null;
  /** Off while false (a closed overlay, a view not ready). */
  isActive: () => boolean;
  /** Bind order: a later one of the same level goes first. */
  order: number;
}

const bound = new Set<BoundScope>();
let nextOrder = 0;

/** The scopes bound right now. */
export function boundScopes(): readonly BoundScope[] {
  return [...bound];
}

export interface BindOptions {
  element?: () => Element | null;
  isActive?: () => boolean;
}

/** Binds handlers to a declared scope; returns the unbind. */
export function bindKeymap(
  scopeId: string,
  handlers: { readonly current: KeymapHandlers },
  opts: BindOptions = {},
): () => void {
  const scope = scopes.get(scopeId);
  if (!scope) throw new Error(`No scope "${scopeId}"`);
  const entry: BoundScope = {
    scope,
    handlers,
    element: opts.element,
    isActive: opts.isActive ?? (() => true),
    order: nextOrder++,
  };
  bound.add(entry);
  return () => {
    bound.delete(entry);
  };
}

export interface UseKeymapOptions {
  /** The element a region or dialog answers inside. */
  element?: RefObject<Element | null>;
  /** False turns the scope off without unbinding it. Default true. */
  active?: boolean;
}

/**
 * Binds a component's handlers to its scope for as long as it is mounted.
 * The handlers are read at each key press, so they can close over this
 * render's state; nothing re-binds when they change.
 */
export function useKeymap(
  scopeId: string,
  handlers: KeymapHandlers,
  opts: UseKeymapOptions = {},
): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const activeRef = useRef(opts.active ?? true);
  activeRef.current = opts.active ?? true;
  const elementRef = opts.element;
  useEffect(
    () =>
      bindKeymap(scopeId, handlersRef, {
        element: elementRef ? () => elementRef.current : undefined,
        isActive: () => activeRef.current,
      }),
    [scopeId, elementRef],
  );
}
