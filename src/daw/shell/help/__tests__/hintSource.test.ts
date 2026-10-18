// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { chordAria, chordLabel, parseKeys } from '@/daw/commands/keys';
import {
  getHint,
  hintText,
  keysLabel,
  listenForHints,
  resolveHint,
  setHint,
  subscribeHint,
} from '../hintSource';

// ── What the hint line says (milestone 2.11) ───────────────────────────────

function mount(html: string): HTMLElement {
  document.body.innerHTML = `<div id="shell">${html}</div>`;
  return document.getElementById('shell')!;
}

const $ = (selector: string) => document.querySelector(selector)!;

afterEach(() => {
  document.body.innerHTML = '';
  setHint('');
});

describe('resolveHint', () => {
  it('prefers data-hint over aria-label on the same element', () => {
    mount(
      `<button id="b" data-hint="Loop · Play it over and over · L" aria-label="Loop"></button>`,
    );
    expect(resolveHint($('#b'))).toBe('Loop · Play it over and over · L');
  });

  it('falls back to aria-label, with aria-keyshortcuts as a key label', () => {
    mount(`<button id="b" aria-label="Undo" aria-keyshortcuts="Meta+Z"></button>
           <button id="c" aria-label="Mute"></button>`);
    expect(resolveHint($('#b'))).toMatch(/^Undo · (⌘Z|Ctrl\+Z)$/);
    expect(resolveHint($('#c'))).toBe('Mute');
  });

  it('walks up from an icon inside a control to the control', () => {
    mount(
      `<button aria-label="Play" data-hint="Play · Space"><svg><path id="p"/></svg><span id="s">x</span></button>`,
    );
    expect(resolveHint($('#p'))).toBe('Play · Space');
    expect(resolveHint($('#s'))).toBe('Play · Space');
  });

  it('takes the nearest hint walking up through plain ancestors', () => {
    mount(
      `<div data-hint="Outer"><div data-hint="Inner"><span><i id="i"></i></span></div></div>`,
    );
    expect(resolveHint($('#i'))).toBe('Inner');
  });

  it('stops at the first interactive element without words', () => {
    mount(`<div data-hint="The panel"><button id="b"><span id="s">Share</span></button>
           <div role="slider" id="r"></div><a href="#" id="a">x</a></div>`);
    expect(resolveHint($('#s'))).toBe('');
    expect(resolveHint($('#b'))).toBe('');
    expect(resolveHint($('#r'))).toBe('');
    expect(resolveHint($('#a'))).toBe('');
  });

  it('treats menu items, tabs, switches, checkboxes and options as interactive', () => {
    for (const role of [
      'menuitem',
      'menuitemcheckbox',
      'menuitemradio',
      'tab',
      'switch',
      'checkbox',
      'option',
      'button',
    ]) {
      mount(
        `<div data-hint="Around"><div role="${role}"><span id="s"></span></div><button></button></div>`,
      );
      expect(resolveHint($('#s'))).toBe('');
    }
  });

  it("reads a wrapper's data-hint when it holds no other control", () => {
    // A Fader or a Meter puts its extra props on its root, not its control.
    mount(`<div data-hint="Volume · How loud it is">
             <div role="slider" aria-label="Volume"><i id="thumb"></i></div>
             <span>-6 dB</span>
           </div>
           <div data-hint="Level · How loud it plays"><div title="x">
             <canvas id="meter" role="img" aria-label="Level peak meter"></canvas>
           </div></div>
           <div data-hint="Both"><button id="one" aria-label="One"></button>
             <button aria-label="Two"></button></div>
           <div data-hint="Far"><div><div><div>
             <button id="deep" aria-label="Deep"></button></div></div></div></div>`);
    expect(resolveHint($('#thumb'))).toBe('Volume · How loud it is');
    expect(resolveHint($('#meter'))).toBe('Level · How loud it plays');
    // Two controls in it: each keeps its own name.
    expect(resolveHint($('#one'))).toBe('One');
    // Further up than three levels: not its wrapper.
    expect(resolveHint($('#deep'))).toBe('Deep');
  });

  it('says nothing for a text field, even with a label or a hinted ancestor', () => {
    mount(`<div data-hint="Around"><input id="t" aria-label="Project name" />
           <textarea id="ta" aria-label="Notes"></textarea>
           <div contenteditable="true"><span id="ce">typing</span></div>
           <input id="r" type="range" aria-label="Volume" /></div>`);
    expect(resolveHint($('#t'))).toBe('');
    expect(resolveHint($('#ta'))).toBe('');
    expect(resolveHint($('#ce'))).toBe('');
    // A range input is not a text field.
    expect(resolveHint($('#r'))).toBe('Volume');
  });

  it("doesn't read a region's name as a hint, but does read its data-hint", () => {
    mount(`<div role="group" aria-label="Master"><span id="g"></span></div>
           <div role="toolbar" aria-label="Tools" data-hint="The tools"><span id="t"></span></div>
           <div aria-label="Track Bass"><span id="n"></span></div>`);
    expect(resolveHint($('#g'))).toBe('');
    expect(resolveHint($('#t'))).toBe('The tools');
    expect(resolveHint($('#n'))).toBe('Track Bass');
  });

  it('reads a landmark tag as a region too, unless a role says otherwise', () => {
    mount(`<section aria-label="Create"><span id="c"></span></section>
           <nav aria-label="Views"><span id="v"></span></nav>
           <section role="button" aria-label="Open"><span id="o"></span></section>`);
    expect(resolveHint($('#c'))).toBe('');
    expect(resolveHint($('#v'))).toBe('');
    expect(resolveHint($('#o'))).toBe('Open');
  });

  it("reads a list item or a row as a region: a track row's background says nothing", () => {
    mount(`<ul><li aria-label="Bass"><span id="li"></span>
             <button id="m" aria-label="Mute Bass"></button></li></ul>
           <div role="listitem" aria-label="Keys"><span id="item"></span></div>
           <div role="row" aria-label="Drums"><span id="row"></span></div>
           <li data-hint="A track: click to select it"><span id="hinted"></span></li>`);
    expect(resolveHint($('#li'))).toBe('');
    expect(resolveHint($('#item'))).toBe('');
    expect(resolveHint($('#row'))).toBe('');
    expect(resolveHint($('#m'))).toBe('Mute Bass');
    expect(resolveHint($('#hinted'))).toBe('A track: click to select it');
  });

  it('says nothing for plain page, body or a non-element target', () => {
    mount(`<p id="p">text</p>`);
    expect(resolveHint($('#p'))).toBe('');
    expect(resolveHint(document.body)).toBe('');
    expect(resolveHint(null)).toBe('');
    expect(resolveHint(window)).toBe('');
  });
});

describe('hintText', () => {
  it('joins the name, the purpose and the key, dropping empty parts', () => {
    expect(hintText('Loop', 'Play the loop range over and over', 'L')).toBe(
      'Loop · Play the loop range over and over · L',
    );
    expect(hintText('Mute', 'Silence this track', undefined)).toBe(
      'Mute · Silence this track',
    );
    expect(hintText('A', '', false, null, ' ')).toBe('A');
  });
});

describe('keysLabel', () => {
  it("names keys as the student's keyboard does", () => {
    expect(keysLabel('Meta+Shift+Z', true)).toBe('⇧⌘Z');
    expect(keysLabel('Control+Shift+Z', false)).toBe('Ctrl+Shift+Z');
    expect(keysLabel('Space', false)).toBe('Space');
    expect(keysLabel('Escape', true)).toBe('Esc');
    expect(keysLabel('r', true)).toBe('R');
    expect(keysLabel('Shift++', false)).toBe('Shift++');
  });

  it('says Return on a Mac and Enter elsewhere, and Menu for the menu key', () => {
    expect(chordLabel(parseKeys('Enter'), true)).toBe('Return');
    expect(chordLabel(parseKeys('Enter'), false)).toBe('Enter');
    expect(chordLabel(parseKeys('Alt+Enter'), false)).toBe('Alt+Enter');
    expect(chordLabel(parseKeys('Alt+Enter'), true)).toBe('⌥Return');
    expect(chordLabel(parseKeys('ContextMenu'), false)).toBe('Menu');
    expect(chordLabel(parseKeys('ContextMenu'), true)).toBe('Menu');
    // aria-keyshortcuts takes the keys' own names on every platform.
    expect(chordAria(parseKeys('Enter'), true)).toBe('Enter');
    expect(chordAria(parseKeys('Escape'), false)).toBe('Escape');
    expect(chordAria(parseKeys('ContextMenu'), false)).toBe('ContextMenu');
    expect(keysLabel('Enter', false)).toBe('Enter');
    expect(keysLabel('Enter', true)).toBe('Return');
  });

  it('takes the first of several, and drops what it cannot read', () => {
    expect(keysLabel('Alt+R Meta+R', false)).toBe('Alt+R');
    expect(keysLabel('Hyper+R', false)).toBe('');
    expect(keysLabel('', false)).toBe('');
    expect(keysLabel(null)).toBe('');
  });
});

describe('the hint store', () => {
  it('notifies only when the words change', () => {
    const listener = vi.fn();
    const stop = subscribeHint(listener);
    setHint('Play · Space');
    setHint('Play · Space');
    expect(listener).toHaveBeenCalledTimes(1);
    setHint('Loop · L');
    expect(listener).toHaveBeenCalledTimes(2);
    expect(getHint()).toBe('Loop · L');
    stop();
    setHint('Mute');
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('listenForHints', () => {
  const pointerOver = (el: Element) =>
    el.dispatchEvent(new Event('pointerover', { bubbles: true }));

  it('follows the pointer and the focus, and clears when the pointer leaves the window', () => {
    mount(
      `<button id="a" aria-label="Play"></button><button id="b" aria-label="Loop"></button>`,
    );
    const listener = vi.fn();
    const unsubscribe = subscribeHint(listener);
    const stop = listenForHints();

    pointerOver($('#a'));
    expect(getHint()).toBe('Play');
    // Moving within the same control (its icon, then back) changes nothing.
    pointerOver($('#a'));
    expect(listener).toHaveBeenCalledTimes(1);

    ($('#b') as HTMLElement).focus();
    expect(getHint()).toBe('Loop');

    document.documentElement.dispatchEvent(new Event('pointerleave'));
    expect(getHint()).toBe('');

    pointerOver($('#a'));
    stop();
    // The stop clears, and nothing listens afterwards.
    expect(getHint()).toBe('');
    pointerOver($('#b'));
    expect(getHint()).toBe('');
    unsubscribe();
  });

  it('adds one listener per event on the document and removes them', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    const stop = listenForHints();
    const types = add.mock.calls.map(([type]) => type);
    expect(types.sort()).toEqual(['focusin', 'pointerover']);
    expect(types).not.toContain('pointermove');
    stop();
    expect(remove.mock.calls.map(([type]) => type).sort()).toEqual([
      'focusin',
      'pointerover',
    ]);
    add.mockRestore();
    remove.mockRestore();
  });

  it('reads a control again when it changes its own words under the pointer', async () => {
    mount(
      `<button id="play" aria-label="Play" aria-keyshortcuts="Space"><i id="icon"></i></button>
       <div data-hint="Volume · How loud"><div role="slider" aria-label="Volume" id="fader"></div></div>`,
    );
    const stop = listenForHints();
    pointerOver($('#icon'));
    expect(getHint()).toBe('Play · Space');
    // Play becomes Pause while the pointer rests on it.
    $('#play').setAttribute('aria-label', 'Pause');
    await Promise.resolve();
    expect(getHint()).toBe('Pause · Space');
    // A wrapper's data-hint is watched where it is.
    pointerOver($('#fader'));
    expect(getHint()).toBe('Volume · How loud');
    $('#fader').parentElement!.setAttribute('data-hint', 'Volume · −6 dB');
    await Promise.resolve();
    expect(getHint()).toBe('Volume · −6 dB');
    // The control left behind isn't watched any more.
    $('#play').setAttribute('aria-label', 'Play');
    await Promise.resolve();
    expect(getHint()).toBe('Volume · −6 dB');
    stop();
  });

  it('watches only the one element, for its words only', () => {
    const observe = vi.spyOn(MutationObserver.prototype, 'observe');
    mount(`<button id="b" aria-label="Loop"></button><p id="p">x</p>`);
    const stop = listenForHints();
    pointerOver($('#b'));
    expect(observe).toHaveBeenCalledTimes(1);
    const [target, options] = observe.mock.calls[0]!;
    expect(target).toBe($('#b'));
    expect(options).toEqual({
      attributes: true,
      attributeFilter: ['data-hint', 'aria-label', 'aria-keyshortcuts'],
    });
    // Nothing to say: nothing watched.
    pointerOver($('#p'));
    expect(observe).toHaveBeenCalledTimes(1);
    stop();
    observe.mockRestore();
  });
});
