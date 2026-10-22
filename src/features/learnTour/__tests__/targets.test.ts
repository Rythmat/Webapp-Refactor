// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clickElement, findTargets, unionRect } from '../targets';

// jsdom lays nothing out: an element is as big as its data-box says.
const box = (el: Element) => {
  const [left, top, width, height] = (el.getAttribute('data-box') ?? '0,0,0,0')
    .split(',')
    .map(Number);
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
};

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      return box(this);
    },
  );
  document.body.innerHTML = `
    <div data-guitar-bar="preview">
      <button data-box="10,500,80,40">Demo</button>
      <button data-box="100,500,90,40">Practice</button>
      <button data-box="200,500,0,0">Hidden</button>
    </div>
    <div hidden><button data-box="0,0,20,20" class="gone">Demo</button></div>
    <svg role="radiogroup" aria-label="Choose a key" data-box="300,100,200,200"></svg>
    <div data-learn-tour-layer><button data-box="0,0,50,50">Demo</button></div>
  `;
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('finding what a step points at', () => {
  it('finds a control by its words', () => {
    const [demo] = findTargets({
      css: '[data-guitar-bar] button',
      text: /^Demo$/,
    });
    expect(demo.textContent).toBe('Demo');
    expect(demo.getAttribute('data-box')).toBe('10,500,80,40');
  });

  it('passes by what is hidden, unlaid out, or the tour’s own', () => {
    const all = findTargets({ css: 'button', all: true });
    expect(all.map((b) => b.textContent)).toEqual(['Demo', 'Practice']);
  });

  it('finds a drawing (the key wheel is SVG)', () => {
    expect(
      findTargets({ css: '[role="radiogroup"][aria-label="Choose a key"]' }),
    ).toHaveLength(1);
  });

  it('lights several together in one box', () => {
    const both = findTargets([
      { css: 'button', text: /^Demo$/ },
      { css: 'button', text: /^Practice$/ },
    ]);
    expect(unionRect(both)).toEqual({
      top: 500,
      left: 10,
      width: 180,
      height: 40,
    });
    expect(unionRect([])).toBeNull();
  });

  it('a bad selector finds nothing rather than throwing', () => {
    expect(findTargets({ css: '[[nope' })).toEqual([]);
  });

  it('clicks an SVG part as well as a button', () => {
    const svg = document.querySelector('svg')!;
    const onClick = vi.fn();
    svg.addEventListener('click', onClick);
    expect(clickElement(svg)).toBe(true);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(clickElement(undefined)).toBe(false);
  });
});
