// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  chordAria,
  chordLabel,
  isCharacterKey,
  matchesChord,
  parseKeys,
} from '../keys';
import '../keymaps';
import { allScopes, commandsOf, type ScopeDef } from '../registry';
import { SCOPE_ORDER, scopeRank, sortedScopes } from '../scopeOrder';

/** A binding as one comparable string, modifiers and all. */
function bindingKey(binding: string): string {
  const chord = parseKeys(binding);
  const key = chord.char ?? chord.code;
  return `${chord.mod ? 'Mod+' : ''}${chord.alt ? 'Alt+' : ''}${chord.shift ? 'Shift+' : ''}${key}`;
}

/** Scopes that can answer the same key press (the same level and view). */
function overlap(a: ScopeDef, b: ScopeDef): boolean {
  if (a.level !== b.level) return false;
  if (a.level !== 'view') return a.id === b.id || a.level === 'global';
  return !!a.views?.some((view) => b.views?.includes(view));
}

describe('the command registry', () => {
  it('binds no key twice where one key press could reach both', () => {
    const clashes: string[] = [];
    const scopes = allScopes();
    for (const a of scopes) {
      for (const b of scopes) {
        if (a.id > b.id || !overlap(a, b)) continue;
        const seen = new Map<string, string>();
        for (const command of [...commandsOf(a.id), ...commandsOf(b.id)]) {
          for (const binding of command.keys) {
            const key = bindingKey(binding);
            const other = seen.get(key);
            if (other && other !== command.id) {
              clashes.push(`${key}: ${other} and ${command.id}`);
            }
            seen.set(key, command.id);
          }
        }
      }
    }
    // The Score and the lead sheet chart are never on screen together
    // (LeadSheetView shows one or the other), so their keys may repeat.
    expect(
      clashes.filter(
        (c) => !/(score|leadsheet)\.\w+ and (score|leadsheet)\./.test(c),
      ),
    ).toEqual([]);
  });

  it('binds nothing to the browser’s page zoom, new window or tab keys', () => {
    const reserved = new Set([
      'Mod+Equal',
      'Mod+Minus',
      'Mod+Digit0',
      'Mod+KeyN',
      'Mod+KeyT',
      'Mod+KeyW',
      'Mod+KeyR',
      'Mod+KeyL',
    ]);
    const bound = allScopes().flatMap((scope) =>
      commandsOf(scope.id).flatMap((c) => c.keys.map(bindingKey)),
    );
    expect(bound.filter((key) => reserved.has(key))).toEqual([]);
  });

  it('puts nothing on an F key only, and pairs Delete with Backspace', () => {
    for (const scope of allScopes()) {
      for (const command of commandsOf(scope.id)) {
        const keys = command.keys.map(bindingKey);
        // A command without keys (the palette's, 2.15) has no F key either.
        if (keys.length > 0) {
          expect(keys.every((key) => /\bF\d+$/.test(key))).toBe(false);
        }
        if (keys.includes('Delete')) expect(keys).toContain('Backspace');
      }
    }
  });

  it('lets only Save run in a text field', () => {
    const editable = allScopes().flatMap((scope) =>
      commandsOf(scope.id)
        .filter((c) => c.allowInEditable)
        .map((c) => c.id),
    );
    // And the palette's keys, which open it from the project's name too.
    expect(editable).toEqual(['project.save', 'help.palette']);
  });

  it('names every pass-through it allows', () => {
    const ids = new Set(
      allScopes().flatMap((scope) => [
        scope.id,
        ...commandsOf(scope.id).map((c) => c.id),
      ]),
    );
    for (const scope of allScopes()) {
      for (const id of scope.passThrough ?? []) expect(ids).toContain(id);
    }
  });
});

describe('the command palette’s keys and commands (2.15)', () => {
  const PALETTE_KEYS = ['Mod+KeyK', 'Mod+Shift+KeyP'];

  it('opens the palette on ⌘K and ⇧⌘P, which aren’t the browser’s', () => {
    const palette = commandsOf('global').find((c) => c.id === 'help.palette');
    expect(palette?.keys.map(bindingKey)).toEqual(PALETTE_KEYS);
    const reserved = new Set([
      'Mod+Equal',
      'Mod+Minus',
      'Mod+Digit0',
      'Mod+KeyN',
      'Mod+KeyT',
      'Mod+KeyW',
      'Mod+KeyR',
      'Mod+KeyL',
    ]);
    for (const key of PALETTE_KEYS) expect(reserved.has(key)).toBe(false);
  });

  it('leaves ⌘K and ⇧⌘P to the palette in every view, but the lead sheet’s chord', () => {
    // leadsheet.chord answers ⌘K only with something selected, and returns
    // false otherwise, so ⌘K falls through to the palette.
    const others = allScopes()
      .filter((scope) => scope.level === 'global' || scope.level === 'view')
      .flatMap((scope) =>
        commandsOf(scope.id).filter(
          (c) =>
            c.id !== 'help.palette' &&
            c.keys.some((k) => PALETTE_KEYS.includes(bindingKey(k))),
        ),
      )
      .map((c) => c.id);
    expect(others).toEqual(['leadsheet.chord']);
  });

  it('gives every command the palette leaves out a key', () => {
    const left = allScopes().flatMap((scope) =>
      commandsOf(scope.id).filter((c) => c.palette === false),
    );
    expect(left.map((c) => c.id)).toEqual(
      expect.arrayContaining([
        'prism.pick',
        'score.duration',
        'score.articulation',
      ]),
    );
    for (const command of left) expect(command.keys.length).toBeGreaterThan(0);
  });

  it('declares commands without keys only where the palette can reach them', () => {
    const keyless = allScopes().flatMap((scope) =>
      commandsOf(scope.id)
        .filter((c) => c.keys.length === 0)
        .map((c) => ({ command: c, scope })),
    );
    expect(keyless.map(({ command }) => command.id)).toEqual(
      expect.arrayContaining([
        'track.add',
        'view.create',
        'view.mix',
        'view.score',
        'view.library',
        'view.effects',
        'view.settings',
      ]),
    );
    for (const { command, scope } of keyless) {
      expect(['global', 'arrange']).toContain(scope.id);
      expect(command.hidden).toBeFalsy();
      expect(command.palette).not.toBe(false);
    }
  });

  it('puts the track list’s Duplicate on ⌘D', () => {
    const duplicate = commandsOf('tracks').find(
      (c) => c.id === 'tracks.duplicate',
    );
    expect(duplicate?.keys.map(bindingKey)).toEqual(['Mod+KeyD']);
  });

  it('lists every declared scope in SCOPE_ORDER, once', () => {
    const declared = allScopes().map((scope) => scope.id);
    for (const id of declared) expect(SCOPE_ORDER).toContain(id);
    expect(new Set(SCOPE_ORDER).size).toBe(SCOPE_ORDER.length);
    expect(sortedScopes().map((scope) => scope.id)).toEqual(
      SCOPE_ORDER.filter((id) => declared.includes(id)),
    );
    expect(scopeRank('global')).toBe(0);
    expect(scopeRank('not-a-scope')).toBe(SCOPE_ORDER.length);
  });
});

describe('key bindings', () => {
  const event = (init: KeyboardEventInit) =>
    new KeyboardEvent('keydown', { bubbles: true, ...init });

  it('matches modifiers exactly, and either ⌘ or Ctrl as Mod', () => {
    const save = parseKeys('Mod+KeyS');
    expect(matchesChord(event({ code: 'KeyS', metaKey: true }), save)).toBe(
      true,
    );
    expect(matchesChord(event({ code: 'KeyS', ctrlKey: true }), save)).toBe(
      true,
    );
    expect(matchesChord(event({ code: 'KeyS' }), save)).toBe(false);
    const record = parseKeys('KeyR');
    expect(matchesChord(event({ code: 'KeyR', altKey: true }), record)).toBe(
      false,
    );
    expect(
      matchesChord(event({ code: 'KeyR', key: '®', altKey: true }), {
        ...parseKeys('Alt+KeyR'),
      }),
    ).toBe(true);
  });

  it('matches a character by what it types, Shift and all', () => {
    const help = parseKeys('?');
    expect(
      matchesChord(event({ code: 'Slash', key: '?', shiftKey: true }), help),
    ).toBe(true);
    expect(matchesChord(event({ code: 'Slash', key: '/' }), help)).toBe(false);
  });

  it('knows which keys are character keys (WCAG 2.1.4)', () => {
    expect(isCharacterKey(parseKeys('KeyM'))).toBe(true);
    expect(isCharacterKey(parseKeys('Digit1'))).toBe(true);
    expect(isCharacterKey(parseKeys('?'))).toBe(true);
    expect(isCharacterKey(parseKeys('Backquote'))).toBe(true);
    expect(isCharacterKey(parseKeys('Space'))).toBe(false);
    expect(isCharacterKey(parseKeys('Delete'))).toBe(false);
    expect(isCharacterKey(parseKeys('ArrowLeft'))).toBe(false);
    expect(isCharacterKey(parseKeys('Mod+KeyS'))).toBe(false);
    expect(isCharacterKey(parseKeys('Alt+KeyR'))).toBe(false);
  });

  it('labels shortcuts for the keyboard the student has', () => {
    const redo = parseKeys('Mod+Shift+KeyZ');
    expect(chordLabel(redo, true)).toBe('⇧⌘Z');
    expect(chordAria(redo, true)).toBe('Meta+Shift+Z');
    expect(chordLabel(redo, false)).toBe('Ctrl+Shift+Z');
    expect(chordAria(redo, false)).toBe('Control+Shift+Z');
    expect(chordLabel(parseKeys('Mod+KeyS'), false)).toBe('Ctrl+S');
    expect(chordLabel(parseKeys('Alt+Equal'), true)).toBe('⌥=');
    expect(chordLabel(parseKeys('Alt+KeyR'), false)).toBe('Alt+R');
    expect(chordLabel(parseKeys('Escape'), true)).toBe('Esc');
  });
});
