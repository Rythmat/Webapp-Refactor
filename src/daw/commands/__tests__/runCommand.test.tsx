// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { useRef, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { availableCommands, dispatchKey, runCommand } from '../dispatcher';
import {
  DOCK_SCOPE,
  GLOBAL_SCOPE,
  PRACTICE_SCOPE,
  PRISM_SCOPE,
  SCORE_SCOPE,
  ARRANGE_SCOPE,
  TRACKS_SCOPE,
  TYPING_SCOPE,
} from '../keymaps';
import { useMusicalTypingStore } from '../musicalTypingStore';
import {
  bindKeymap,
  useKeymap,
  type CommandHandler,
  type KeymapHandlers,
} from '../registry';
import {
  INITIAL_SESSION_STATE,
  useSessionStore,
} from '@/daw/session/sessionStore';
import { useStore } from '@/daw/store';
import type { ViewType } from '@/daw/store/uiSlice';

// ── Commands by name (milestone 2.15) ──────────────────────────────────────
//
// runCommand and availableCommands walk the same scopes as a key press, in
// the same order, apart from the key: what the command palette runs and
// lists.

const unbinds: (() => void)[] = [];

/** Binds `handlers` to a scope (answering inside `element`, if given). */
function bind(
  scope: string,
  handlers: KeymapHandlers,
  element?: Element | null,
): void {
  unbinds.push(
    bindKeymap(
      scope,
      { current: handlers },
      element === undefined ? {} : { element: () => element },
    ),
  );
}

/** A region or view scope bound to stub handlers, as a component binds it. */
function Bound({
  scope,
  handlers,
  children,
}: {
  scope: string;
  handlers: KeymapHandlers;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useKeymap(scope, handlers, { element: ref });
  return (
    <div ref={ref} data-testid={`scope-${scope}`}>
      {children}
    </div>
  );
}

/** A fresh element in the page. */
function element(html = '<button>here</button>', selector = 'button') {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.querySelector<HTMLElement>(selector)!;
}

function view(currentView: ViewType) {
  useStore.setState({ currentView });
}

const ids = (target: Node | null) => availableCommands(target).map((c) => c.id);

let platform: PropertyDescriptor | undefined;

beforeEach(() => {
  useStore.setState({ currentView: 'arrange', singleKeyShortcuts: true });
  useMusicalTypingStore.setState({ enabled: false, octave: 4, velocity: 100 });
  platform = Object.getOwnPropertyDescriptor(navigator, 'platform');
});

afterEach(() => {
  while (unbinds.length) unbinds.pop()!();
  useSessionStore.setState({ ...INITIAL_SESSION_STATE });
  cleanup();
  document.body.innerHTML = '';
  if (platform) Object.defineProperty(navigator, 'platform', platform);
  else delete (navigator as unknown as { platform?: string }).platform;
});

function onPlatform(name: string) {
  Object.defineProperty(navigator, 'platform', {
    value: name,
    configurable: true,
  });
}

describe('runCommand: the precedence walk by target', () => {
  it('runs a region command only when the target is inside its element', () => {
    const duplicate = vi.fn();
    render(
      <Bound
        scope={TRACKS_SCOPE.id}
        handlers={{ 'tracks.duplicate': duplicate }}
      >
        <button data-testid="row">Keys</button>
      </Bound>,
    );
    const outside = element();

    expect(runCommand('tracks.duplicate', outside)).toBe(false);
    expect(runCommand('tracks.duplicate', null)).toBe(false);
    expect(duplicate).not.toHaveBeenCalled();

    expect(runCommand('tracks.duplicate', screen.getByTestId('row'))).toBe(
      true,
    );
    expect(duplicate).toHaveBeenCalledTimes(1);
  });

  it('runs a view command only in its views', () => {
    const slur = vi.fn();
    bind(SCORE_SCOPE.id, { 'score.slur': slur });

    view('arrange');
    expect(runCommand('score.slur', null)).toBe(false);
    view('studio');
    expect(runCommand('score.slur', null)).toBe(false);
    expect(slur).not.toHaveBeenCalled();

    view('score');
    expect(runCommand('score.slur', null)).toBe(true);
    view('leadsheet');
    expect(runCommand('score.slur', null)).toBe(true);
    expect(slur).toHaveBeenCalledTimes(2);
  });

  it('lets a modal scope narrow what runs below it', () => {
    const metronome = vi.fn();
    const undo = vi.fn();
    bind(GLOBAL_SCOPE.id, {
      'transport.metronome': metronome,
      'edit.undo': undo,
      'project.save': vi.fn(),
    });
    // The Prism suggestions float over the editor: only Save and undo pass.
    bind(PRISM_SCOPE.id, {});

    expect(runCommand('transport.metronome', null)).toBe(false);
    expect(metronome).not.toHaveBeenCalled();
    expect(runCommand('edit.undo', null)).toBe(true);
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it('lets a second modal only narrow what the first let through', () => {
    const undo = vi.fn();
    const save = vi.fn();
    bind(GLOBAL_SCOPE.id, { 'edit.undo': undo, 'project.save': save });
    bind(PRISM_SCOPE.id, {});
    bind(PRACTICE_SCOPE.id, {});
    view('practice');

    // Prism lets undo through, Practice doesn't: it stays put.
    expect(runCommand('edit.undo', null)).toBe(false);
    expect(undo).not.toHaveBeenCalled();
    // Both let Save through.
    expect(runCommand('project.save', null)).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('passes a whole scope through by its id (the dock lets global run)', () => {
    const metronome = vi.fn();
    bind(GLOBAL_SCOPE.id, { 'transport.metronome': metronome });
    render(
      <Bound scope={DOCK_SCOPE.id} handlers={{}}>
        <button data-testid="in-dock">Note</button>
      </Bound>,
    );
    expect(
      runCommand('transport.metronome', screen.getByTestId('in-dock')),
    ).toBe(true);
    expect(metronome).toHaveBeenCalledTimes(1);
  });

  it('lets help.palette through Practice but not the metronome', () => {
    view('practice');
    const palette = vi.fn();
    const metronome = vi.fn();
    const play = vi.fn();
    bind(GLOBAL_SCOPE.id, {
      'help.palette': palette,
      'transport.metronome': metronome,
    });
    bind(PRACTICE_SCOPE.id, { 'practice.playPause': play });

    expect(runCommand('help.palette', null)).toBe(true);
    expect(palette).toHaveBeenCalledTimes(1);
    expect(runCommand('transport.metronome', null)).toBe(false);
    expect(metronome).not.toHaveBeenCalled();
    expect(runCommand('practice.playPause', null)).toBe(true);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('tries the next scope when a handler returns false', () => {
    view('score');
    const earlier = vi.fn(() => true);
    const later = vi.fn(() => false);
    // The later binding of a view goes first.
    bind(SCORE_SCOPE.id, { 'score.tie': earlier });
    bind(SCORE_SCOPE.id, { 'score.tie': later });

    expect(runCommand('score.tie', null)).toBe(true);
    expect(later).toHaveBeenCalledTimes(1);
    expect(earlier).toHaveBeenCalledTimes(1);
  });

  it('tries the outer region when the inner one declines', () => {
    const inner = vi.fn(() => false);
    const outer = vi.fn();
    render(
      <Bound scope={TRACKS_SCOPE.id} handlers={{ 'tracks.mute': outer }}>
        <Bound scope={TRACKS_SCOPE.id} handlers={{ 'tracks.mute': inner }}>
          <button data-testid="row">Keys</button>
        </Bound>
      </Bound>,
    );
    expect(runCommand('tracks.mute', screen.getByTestId('row'))).toBe(true);
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).toHaveBeenCalledTimes(1);
    expect(inner.mock.invocationCallOrder[0]).toBeLessThan(
      outer.mock.invocationCallOrder[0],
    );
  });

  it('returns false when every handler declines, or none is bound', () => {
    const declines = vi.fn(() => false);
    bind(GLOBAL_SCOPE.id, { 'transport.loop': declines });
    expect(runCommand('transport.loop', null)).toBe(false);
    expect(declines).toHaveBeenCalledTimes(1);
    expect(runCommand('transport.metronome', null)).toBe(false);
    expect(runCommand('no.such.command', null)).toBe(false);
  });
});

describe('runCommand: a command picked by name', () => {
  it('runs a single-key command with single-key shortcuts off', () => {
    useStore.setState({ singleKeyShortcuts: false });
    const metronome = vi.fn();
    bind(GLOBAL_SCOPE.id, { 'transport.metronome': metronome });

    // Its key is off…
    const key = new KeyboardEvent('keydown', {
      code: 'KeyM',
      key: 'm',
      cancelable: true,
    });
    expect(dispatchKey(key)).toBeNull();
    expect(metronome).not.toHaveBeenCalled();

    // …but by name it runs.
    expect(runCommand('transport.metronome', null)).toBe(true);
    expect(metronome).toHaveBeenCalledTimes(1);
  });

  it('runs a letter command while the computer keyboard plays notes', () => {
    useMusicalTypingStore.setState({ enabled: true });
    const note = vi.fn();
    const metronome = vi.fn();
    bind(TYPING_SCOPE.id, { 'typing.note': note });
    bind(GLOBAL_SCOPE.id, { 'transport.metronome': metronome });

    expect(runCommand('transport.metronome', null)).toBe(true);
    expect(metronome).toHaveBeenCalledTimes(1);
    expect(note).not.toHaveBeenCalled();
  });

  it('runs a command without keys', () => {
    const add = vi.fn();
    bind(GLOBAL_SCOPE.id, { 'track.add': add });
    expect(runCommand('track.add', null)).toBe(true);
    expect(add).toHaveBeenCalledTimes(1);
    const e = add.mock.calls[0][0] as KeyboardEvent;
    expect(e).toBeInstanceOf(KeyboardEvent);
    expect(e.code).toBe('');
    expect(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey).toBe(false);
  });

  it('runs nothing while a project opens', () => {
    const metronome = vi.fn();
    bind(GLOBAL_SCOPE.id, { 'transport.metronome': metronome });
    useSessionStore.setState({ phase: 'preparing' });
    expect(runCommand('transport.metronome', null)).toBe(false);
    expect(metronome).not.toHaveBeenCalled();

    useSessionStore.setState({ phase: 'ready' });
    expect(runCommand('transport.metronome', null)).toBe(true);
  });
});

describe('runCommand: the event a handler reads', () => {
  function captured(
    id: string,
    scope: string,
    target: HTMLElement | null,
  ): KeyboardEvent {
    let event: KeyboardEvent | undefined;
    const handler: CommandHandler = (e) => {
      event = e;
    };
    bind(scope, { [id]: handler }, target?.parentElement);
    expect(runCommand(id, target)).toBe(true);
    return event!;
  }

  it('is targeted at the given element', () => {
    const row = element();
    const e = captured('tracks.duplicate', TRACKS_SCOPE.id, row);
    expect(e.target).toBe(row);
    expect(e.type).toBe('keydown');
    expect(e.cancelable).toBe(true);
    expect(e.bubbles).toBe(true);
  });

  it('carries the first chord’s key, code and modifiers, ⌘ on a Mac', () => {
    onPlatform('MacIntel');
    const row = element();
    const e = captured('tracks.duplicate', TRACKS_SCOPE.id, row);
    expect(e.code).toBe('KeyD');
    expect(e.key).toBe('d');
    expect(e.metaKey).toBe(true);
    expect(e.ctrlKey).toBe(false);
    expect(e.shiftKey).toBe(false);
    expect(e.altKey).toBe(false);
  });

  it('presses Ctrl for Mod on other keyboards', () => {
    onPlatform('Win32');
    const e = captured('project.exportMidi', GLOBAL_SCOPE.id, null);
    expect(e.code).toBe('KeyE');
    expect(e.key).toBe('e');
    expect(e.ctrlKey).toBe(true);
    expect(e.metaKey).toBe(false);
    expect(e.shiftKey).toBe(true);
  });

  it('carries ⌥, a character and Space as the key would', () => {
    view('score');
    const rests = captured('score.layerRests', SCORE_SCOPE.id, null);
    expect(rests.code).toBe('KeyR');
    expect(rests.altKey).toBe(true);
    expect(rests.metaKey || rests.ctrlKey).toBe(false);

    const help = captured('help.shortcuts', GLOBAL_SCOPE.id, null);
    expect(help.key).toBe('?');

    const play = captured('transport.playPause', GLOBAL_SCOPE.id, null);
    expect(play.code).toBe('Space');
    expect(play.key).toBe(' ');
  });
});

describe('availableCommands', () => {
  it('lists what has a handler where focus is, in precedence order', () => {
    view('score');
    const row = element();
    bind(GLOBAL_SCOPE.id, {
      'transport.metronome': vi.fn(),
      'track.add': vi.fn(),
    });
    bind(SCORE_SCOPE.id, { 'score.slur': vi.fn() });
    bind(TRACKS_SCOPE.id, { 'tracks.mute': vi.fn() }, row.parentElement);

    expect(ids(row)).toEqual([
      'tracks.mute',
      'score.slur',
      'transport.metronome',
      'track.add',
    ]);
    // Outside the track list its keys don't answer, so it isn't listed.
    expect(ids(null)).toEqual([
      'score.slur',
      'transport.metronome',
      'track.add',
    ]);
  });

  it('lists each command once', () => {
    bind(GLOBAL_SCOPE.id, { 'transport.loop': vi.fn() });
    bind(GLOBAL_SCOPE.id, { 'transport.loop': vi.fn() });
    expect(ids(null)).toEqual(['transport.loop']);
  });

  it('skips hidden and palette:false commands', () => {
    view('score');
    bind(GLOBAL_SCOPE.id, {
      'browser.selectAll': () => true,
      'browser.bookmark': () => true,
      'transport.loop': vi.fn(),
    });
    bind(SCORE_SCOPE.id, {
      'score.duration': vi.fn(),
      'score.articulation': vi.fn(),
      'score.tie': vi.fn(),
    });
    expect(ids(null)).toEqual(['score.tie', 'transport.loop']);
  });

  it('skips the dialog level and the piano keys, but keeps their narrowing', () => {
    useMusicalTypingStore.setState({ enabled: true });
    bind(TYPING_SCOPE.id, { 'typing.note': vi.fn(), 'typing.off': vi.fn() });
    bind(GLOBAL_SCOPE.id, {
      'transport.loop': vi.fn(),
      'edit.undo': vi.fn(),
      'typing.on': vi.fn(),
    });
    // While the keyboard plays notes: its Off, not On; never the notes.
    expect(ids(null)).toEqual(['typing.off', 'transport.loop', 'edit.undo']);

    bind(PRISM_SCOPE.id, { 'prism.reroll': vi.fn(), 'prism.pick': vi.fn() });
    expect(ids(null)).toEqual(['edit.undo']);
  });

  it('runs a view or global command from a row as if from the page', () => {
    // Opened from a track's row, a clip command still acts on the clip: its
    // handler sees the page, not the row it would refuse (onTimeline).
    view('arrange');
    const row = document.createElement('div');
    document.body.appendChild(row);
    const seen: (EventTarget | null)[] = [];
    bind(ARRANGE_SCOPE.id, {
      'clip.duplicate': (e) => {
        seen.push(e.target);
      },
    });
    bind(
      TRACKS_SCOPE.id,
      { 'tracks.mute': (e) => void seen.push(e.target) },
      row,
    );
    expect(runCommand('clip.duplicate', row)).toBe(true);
    expect(runCommand('tracks.mute', row)).toBe(true);
    expect(seen).toEqual([document.body, row]);
    row.remove();
  });

  it('leaves out the selected track’s Duplicate while the focused row’s is listed', () => {
    const row = document.createElement('div');
    document.body.appendChild(row);
    bind(TRACKS_SCOPE.id, { 'tracks.duplicate': vi.fn() }, row);
    bind(GLOBAL_SCOPE.id, { 'track.duplicate': vi.fn() });
    expect(ids(row)).toEqual(['tracks.duplicate']);
    expect(ids(null)).toEqual(['track.duplicate']);
    row.remove();
  });

  it('skips a scope bound without handlers', () => {
    view('score');
    bind(SCORE_SCOPE.id, {});
    bind(GLOBAL_SCOPE.id, { 'view.mix': vi.fn() });
    expect(ids(null)).toEqual(['view.mix']);
  });

  it('lists only what Practice lets through', () => {
    view('practice');
    bind(PRACTICE_SCOPE.id, { 'practice.playPause': vi.fn() });
    bind(GLOBAL_SCOPE.id, {
      'help.palette': vi.fn(),
      'transport.metronome': vi.fn(),
      'transport.loop': vi.fn(),
    });
    // The palette itself is never in its own list.
    expect(ids(null)).toEqual(['practice.playPause', 'transport.loop']);
  });
});
