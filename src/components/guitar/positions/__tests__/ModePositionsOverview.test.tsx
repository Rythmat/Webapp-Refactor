// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  keyPitchClass,
  keyScaleSpelling,
} from '@/curriculum/data/guitar/bookOne';
import { ModePositionsOverview, positionTabs } from '../ModePositionsOverview';
import { positionLanes } from '../PositionsNeck';

afterEach(cleanup);

const bFlat = {
  tonicPc: keyPitchClass('Bb'),
  mode: 'ionian' as const,
  spelling: keyScaleSpelling('Bb'),
};

describe('positionTabs', () => {
  it('numbers the positions, or names them by mode', () => {
    const select = vi.fn();
    const args = { index: 0, onSelect: select, narrow: false };
    expect(
      positionTabs({ ...args, mode: 'ionian', labels: 'position' }).map(
        (t) => t.label,
      ),
    ).toEqual([1, 2, 3, 4, 5, 6, 7].map((n) => `Position ${n}`));
    expect(
      positionTabs({ ...args, mode: 'ionian', labels: 'mode' }).map(
        (t) => t.label,
      ),
    ).toEqual([
      'Ionian',
      'Dorian',
      'Phrygian',
      'Lydian',
      'Mixolydian',
      'Aeolian',
      'Locrian',
    ]);
    // A Dorian lesson's Position 1 is the Dorian shape.
    const dorian = positionTabs({ ...args, mode: 'dorian', labels: 'mode' });
    expect(dorian[0].label).toBe('Dorian');
    expect(dorian[6].label).toBe('Ionian');
    dorian[3].onSelect();
    expect(select).toHaveBeenCalledWith(3);
  });

  it('shows the number on a phone, the full name for assistive tech', () => {
    const [first] = positionTabs({
      mode: 'ionian',
      labels: 'position',
      index: 0,
      onSelect: () => {},
      narrow: true,
    });
    expect(first.label).toBe('1');
    expect(first.name).toBe('Position 1');
  });
});

describe('ModePositionsOverview', () => {
  it('names a relative mode, rings its root and opens its lesson', () => {
    const open = vi.fn();
    render(
      <ModePositionsOverview
        scale={bFlat}
        index={1}
        labels="mode"
        keyColor="#3366ff"
        mirrored={false}
        onOpenMode={open}
        onIndexChange={() => {}}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Dorian' })).toBeInTheDocument();
    expect(screen.getByText(/^C Dorian · Frets/)).toBeInTheDocument();
    // The hollow dots are the mode's root, C, with their names on the neck.
    const roots = document.querySelectorAll(
      '[data-position-notes] [data-root]',
    );
    expect(roots.length).toBeGreaterThan(0);
    roots.forEach((root) => expect(root).toHaveTextContent('C'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Open the C Dorian lesson' }),
    );
    expect(open.mock.calls[0][0]).toMatchObject({
      shapeMode: 'dorian',
      rootName: 'C',
    });
  });

  it('numbers a key’s positions and rings its tonic, spelled in the key', () => {
    render(
      <ModePositionsOverview
        scale={bFlat}
        index={2}
        labels="position"
        keyColor="#3366ff"
        mirrored={false}
        onIndexChange={() => {}}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Position 3' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^The D Phrygian shape/)).toBeInTheDocument();
    document
      .querySelectorAll('[data-position-notes] [data-root]')
      .forEach((root) => expect(root).toHaveTextContent('B♭'));
    expect(screen.queryByRole('button', { name: /lesson/ })).toBeNull();
  });
});

describe('the positions along the neck', () => {
  const lit = () =>
    document
      .querySelector('[data-position-notes]')
      ?.getAttribute('data-position-notes');
  const card = () =>
    document
      .querySelector('[data-position-card]')
      ?.getAttribute('data-position-card');

  it('lights a position on hover, and makes it the box’s when chosen', () => {
    const choose = vi.fn();
    const { rerender } = render(
      <ModePositionsOverview
        scale={bFlat}
        index={0}
        labels="position"
        keyColor="#3366ff"
        mirrored={false}
        onIndexChange={choose}
      />,
    );
    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.getAttribute('aria-label'))).toEqual(
      [1, 2, 3, 4, 5, 6, 7].map((n) => `Position ${n}`),
    );
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');

    // Hover: the neck shows Position 5; the box stays on Position 1.
    fireEvent.pointerEnter(radios[4]);
    expect(lit()).toBe('5');
    expect(card()).toBe('1');
    fireEvent.pointerLeave(
      document.querySelector('[data-position-labels]') as Element,
    );
    expect(lit()).toBe('1');

    // Chosen (click or keyboard): the page's index moves.
    fireEvent.click(radios[4]);
    expect(choose).toHaveBeenLastCalledWith(4);
    fireEvent.keyDown(radios[2], { key: 'Enter' });
    expect(choose).toHaveBeenLastCalledWith(2);
    rerender(
      <ModePositionsOverview
        scale={bFlat}
        index={4}
        labels="position"
        keyColor="#3366ff"
        mirrored={false}
        onIndexChange={choose}
      />,
    );
    expect(card()).toBe('5');
    expect(lit()).toBe('5');
  });

  it('names them by mode on the Relative Modes page', () => {
    render(
      <ModePositionsOverview
        scale={bFlat}
        index={0}
        labels="mode"
        keyColor="#3366ff"
        mirrored={false}
        onIndexChange={() => {}}
      />,
    );
    expect(
      screen.getAllByRole('radio').map((r) => r.getAttribute('aria-label')),
    ).toEqual([
      'Ionian',
      'Dorian',
      'Phrygian',
      'Lydian',
      'Mixolydian',
      'Aeolian',
      'Locrian',
    ]);
  });

  it('puts overlapping positions in separate lanes', () => {
    // C: 7-10, 9-13, 12-15, 12-15, 2-6, 4-8, 7-10.
    const spans = [
      [7, 10],
      [9, 13],
      [12, 15],
      [12, 15],
      [2, 6],
      [4, 8],
      [7, 10],
    ].map(([firstFret, lastFret]) => ({ firstFret, lastFret }));
    const lanes = positionLanes(spans);
    spans.forEach((a, i) =>
      spans.forEach((b, j) => {
        const overlap = a.firstFret <= b.lastFret && b.firstFret <= a.lastFret;
        if (i !== j && overlap) expect(lanes[i]).not.toBe(lanes[j]);
      }),
    );
    expect(Math.max(...lanes)).toBeLessThan(3);
  });
});
