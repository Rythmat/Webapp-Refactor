// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HarmonicNeck, nodeId, type NodeMark } from '../HarmonicNeck';

afterEach(cleanup);

const nodeX = (el: Element) =>
  Number(el.querySelector('circle')!.getAttribute('cx'));

describe('HarmonicNeck', () => {
  it('draws a row per partial with its nodes in lowest terms', () => {
    const { container } = render(
      <HarmonicNeck string={5} partials={[2, 3, 4]} keyColor="#f00" />,
    );
    const ids = [...container.querySelectorAll('[data-node]')].map((el) =>
      el.getAttribute('data-node'),
    );
    expect(ids).toEqual(['2/1', '3/1', '3/2', '4/1', '4/3']);
    // Partial n: n arcs over the neck.
    expect(container.querySelectorAll('[data-arc="3"]')).toHaveLength(3);
  });

  it('leaves out the nodes over the body when asked', () => {
    const { container } = render(
      <HarmonicNeck
        string={5}
        partials={[5]}
        keyColor="#f00"
        showBody={false}
      />,
    );
    expect(container.querySelectorAll('[data-node]')).toHaveLength(3);
  });

  it('marks nodes and presses them, by click and by keyboard', () => {
    const onNodePress = vi.fn();
    const marks = new Map<string, NodeMark>([
      [nodeId({ partial: 3, k: 1 }), 'selected'],
      [nodeId({ partial: 3, k: 2 }), 'related'],
    ]);
    const { container } = render(
      <HarmonicNeck
        string={5}
        partials={[2, 3]}
        marks={marks}
        keyColor="#f00"
        onNodePress={onNodePress}
      />,
    );
    const seventh = container.querySelector('[data-node="3/1"]')!;
    expect(seventh.getAttribute('data-mark')).toBe('selected');
    expect(seventh.getAttribute('tabindex')).toBe('0');
    fireEvent.click(container.querySelector('[data-node="2/1"]')!);
    expect(onNodePress).toHaveBeenLastCalledWith(
      expect.objectContaining({ partial: 2, k: 1 }),
    );
    fireEvent.keyDown(seventh, { key: 'ArrowRight' });
    expect(onNodePress).toHaveBeenLastCalledWith(
      expect.objectContaining({ partial: 3, k: 2 }),
    );
    fireEvent.keyDown(seventh, { key: 'ArrowUp' });
    expect(onNodePress).toHaveBeenLastCalledWith(
      expect.objectContaining({ partial: 2, k: 1 }),
    );
  });

  it('mirrors for a left-handed player', () => {
    const right = render(
      <HarmonicNeck string={5} partials={[3]} keyColor="#f00" />,
    );
    const r = nodeX(right.container.querySelector('[data-node="3/1"]')!);
    cleanup();
    const left = render(
      <HarmonicNeck string={5} partials={[3]} keyColor="#f00" mirrored />,
    );
    const l = nodeX(left.container.querySelector('[data-node="3/1"]')!);
    // The 7th-fret node is a third of the way from the nut: near the left
    // end right-handed, near the right end mirrored.
    expect(r).toBeLessThan(380);
    expect(l).toBeGreaterThan(380);
    // The same place on the string: PAD_L + xL and W − PAD_R − xL.
    expect(r + l).toBeCloseTo(760 + 34 - 22, 6);
  });
});
