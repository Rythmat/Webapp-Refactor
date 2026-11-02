// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrbitalStage, type OrbitalNode } from '../OrbitalStage';
import type { OrbitGeometry, OrbitRing } from '../orbitSlots';

const Icon = () => <svg />;

const node = (id: string, ring: OrbitRing, slot: number): OrbitalNode => ({
  id,
  label: id,
  color: '#ee9b00',
  icon: Icon,
  emphasis: 'solid',
  ring,
  slot,
});

const geometry: OrbitGeometry = {
  cx: 500,
  cy: 200,
  outerRadius: 200,
  innerRadius: 110,
  flatten: 0.8,
  capacity: { inner: 2, outer: 3 },
};

const nodes = [
  node('hub', 'inner', 0),
  node('hub2', 'inner', 1),
  node('a', 'outer', 0),
  node('b', 'outer', 1),
  node('c', 'outer', 2),
];
const links = [
  { id: 'a>hub', source: 'a', target: 'hub' },
  { id: 'b>hub', source: 'b', target: 'hub' },
];

const Stage = ({
  initial = null,
  list = nodes,
}: {
  initial?: string | null;
  list?: OrbitalNode[];
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(initial);
  return (
    <>
      <OrbitalStage
        geometry={geometry}
        nodes={list}
        links={links}
        selectedId={selectedId}
        onSelect={setSelectedId}
        ariaLabel="Map"
      />
      <output data-testid="selected">{selectedId ?? 'none'}</output>
    </>
  );
};

const button = (id: string) =>
  document.querySelector<HTMLElement>(`[data-node="${id}"]`)!;
const stage = () => screen.getByTestId('orbital-stage');
const selectedNow = () => screen.getByTestId('selected').textContent;

/** jsdom's pointer events carry no `pointerType`, which is what this is about. */
const point = (element: Element, type: string, pointerType: string) => {
  const event = new MouseEvent(type, { bubbles: true });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  fireEvent(element, event);
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('the stage', () => {
  it('draws every node as a real button with one tab stop', () => {
    render(<Stage />);
    const tabbable = nodes.filter((n) => button(n.id).tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    expect(button('a').tagName).toBe('BUTTON');
    expect(button('a').getAttribute('aria-pressed')).toBe('false');
  });

  it('never makes the core something you can reach, or a line end at it', () => {
    render(<Stage />);
    const core = document.querySelector('[data-orbital-core]')!;
    expect(core.getAttribute('aria-hidden')).toBe('true');
    expect(core.closest('button')).toBeNull();
    expect(screen.queryByRole('button', { name: /core/i })).toBeNull();
  });

  it('selects on a click, clears on a second, and on the background', () => {
    render(<Stage />);
    fireEvent.click(button('a'));
    expect(selectedNow()).toBe('a');
    expect(button('a').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(button('a'));
    expect(selectedNow()).toBe('none');
    fireEvent.click(button('b'));
    fireEvent.click(stage());
    expect(selectedNow()).toBe('none');
  });

  it('fades what isn’t connected to what’s selected', () => {
    render(<Stage initial="hub" />);
    expect(button('a').style.opacity).toBe('1');
    expect(button('hub').style.opacity).toBe('1');
    expect(button('c').style.opacity).toBe('0.2');
  });

  it('walks round a ring, and wraps', () => {
    render(<Stage />);
    button('a').focus();
    fireEvent.keyDown(button('a'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(button('b'));
    fireEvent.keyDown(button('b'), { key: 'ArrowLeft' });
    fireEvent.keyDown(button('a'), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(button('c'));
  });

  it('moves between rings: down is in, up is out', () => {
    render(<Stage />);
    button('a').focus();
    fireEvent.keyDown(button('a'), { key: 'ArrowDown' });
    expect(document.activeElement?.getAttribute('data-node')).toMatch(/^hub/);
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
    expect(document.activeElement?.getAttribute('data-node')).toMatch(
      /^[abc]$/,
    );
  });

  it('clears the selection on Escape, keeping focus on the node', () => {
    render(<Stage initial="a" />);
    button('a').focus();
    fireEvent.keyDown(button('a'), { key: 'Escape' });
    expect(selectedNow()).toBe('none');
    expect(document.activeElement).toBe(button('a'));
  });

  it('gives focus back when a selection closes from elsewhere', () => {
    const { rerender } = render(
      <OrbitalStage
        geometry={geometry}
        nodes={nodes}
        links={links}
        selectedId="b"
        onSelect={vi.fn()}
        ariaLabel="Map"
      />,
    );
    (document.activeElement as HTMLElement | null)?.blur();
    rerender(
      <OrbitalStage
        geometry={geometry}
        nodes={nodes}
        links={links}
        selectedId={null}
        onSelect={vi.fn()}
        ariaLabel="Map"
      />,
    );
    expect(document.activeElement).toBe(button('b'));
  });

  it('turns until a node is pointed at or selected, then turns again', () => {
    render(<Stage />);
    expect(stage().dataset.paused).toBe('false');
    point(button('a'), 'pointerover', 'mouse');
    expect(stage().dataset.paused).toBe('true');
    point(button('a'), 'pointerout', 'mouse');
    expect(stage().dataset.paused).toBe('false');
    // A click selects and holds it. It leaves focus behind, but not keyboard
    // focus, so closing lets it go. jsdom calls all focus keyboard focus.
    const matches = Element.prototype.matches;
    vi.spyOn(Element.prototype, 'matches').mockImplementation(function (
      this: Element,
      selector: string,
    ) {
      return selector === ':focus-visible'
        ? false
        : matches.call(this, selector);
    });
    fireEvent.click(button('b'));
    expect(stage().dataset.paused).toBe('true');
    fireEvent.click(button('b'));
    expect(stage().dataset.paused).toBe('false');
  });

  it('holds still while the keyboard is on a node', () => {
    render(<Stage />);
    act(() => button('a').focus());
    expect(stage().dataset.paused).toBe('true');
    act(() => button('a').blur());
    expect(stage().dataset.paused).toBe('false');
  });

  it('doesn’t hold still for a finger passing over', () => {
    render(<Stage />);
    point(button('a'), 'pointerover', 'touch');
    expect(stage().dataset.paused).toBe('false');
  });

  it('can be told to hold still, and to go again', () => {
    render(<Stage />);
    fireEvent.click(screen.getByRole('button', { name: 'Hold still' }));
    expect(stage().dataset.paused).toBe('true');
    expect(selectedNow()).toBe('none');
    fireEvent.click(screen.getByRole('button', { name: 'Keep turning' }));
    expect(stage().dataset.paused).toBe('false');
  });

  it('keeps a slot’s element when another node takes it', () => {
    const { rerender } = render(<Stage />);
    const slot = document.querySelector('[data-slot="outer:1"]');
    const next = nodes.map((n) => (n.id === 'b' ? node('z', 'outer', 1) : n));
    rerender(<Stage list={next} />);
    expect(document.querySelector('[data-slot="outer:1"]')).toBe(slot);
    expect(button('z')).not.toBeNull();
    expect(button('b')).toBeNull();
  });

  it('mounts empty slots too, so a late node starts in step', () => {
    render(<Stage list={[node('a', 'outer', 0)]} />);
    expect(document.querySelectorAll('[data-slot]')).toHaveLength(5);
  });

  it('stands a node back upright against the flattening', () => {
    render(<Stage />);
    const upright = button('a').parentElement!;
    expect(upright.style.transform).toBe(`scaleY(${1 / 0.8})`);
  });

  it('stops all of its motion for someone who asked for less', () => {
    const css = readFileSync(resolve(__dirname, '../orbital.css'), 'utf8');
    const rule = css.slice(css.indexOf('prefers-reduced-motion'));
    for (const name of ['orbital-rotator', 'orbital-upright']) {
      expect(rule).toContain(`.${name}`);
    }
    expect(rule).toContain('animation: none');
    expect(screen.queryByText('motion')).toBeNull();
  });
});
