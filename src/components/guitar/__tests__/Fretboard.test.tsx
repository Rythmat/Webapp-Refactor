// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { WRONG_NOTE_KEY_COLOR } from '@/components/Games/PianoRollPlay';
import { midiAt } from '@/lib/guitar/fretboard';
import type { GuitarStringNumber } from '@/lib/guitar/types';
import { Fretboard } from '../Fretboard';
import type { FretboardProps, FretMarker, FretMarkerRole } from '../types';

const RED = '#D2404A';

function marker(
  string: GuitarStringNumber,
  fret: number,
  role: FretMarkerRole,
  extra: Partial<FretMarker> = {},
): FretMarker {
  return {
    string,
    fret,
    midi: midiAt(string, fret),
    label: 'C',
    role,
    ...extra,
  };
}

function renderBoard(props: Partial<FretboardProps> = {}) {
  return render(
    <Fretboard
      window={{ min: 0, max: 5 }}
      markers={[]}
      keyColor={RED}
      {...props}
    />,
  ).container;
}

function translate(el: Element | null): [number, number] {
  const match = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(
    el?.getAttribute('transform') ?? '',
  );
  if (!match) throw new Error('element has no translate');
  return [Number(match[1]), Number(match[2])];
}

const markerAt = (host: Element, string: number, fret: number) =>
  host.querySelector(
    `[data-marker][data-string="${string}"][data-fret="${fret}"]`,
  );

const fretLabels = (host: Element) =>
  [...host.querySelectorAll('[data-fret-label]')].map((t) => t.textContent);

describe('Fretboard', () => {
  afterEach(cleanup);

  it('numbers the frets of its window', () => {
    expect(fretLabels(renderBoard())).toEqual(['1', '2', '3', '4', '5']);
    expect(fretLabels(renderBoard({ window: { min: 3, max: 8 } }))).toEqual([
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
    ]);
  });

  it('draws a nut only at the head of the neck', () => {
    expect(renderBoard().querySelector('[data-nut]')).not.toBeNull();
    expect(
      renderBoard({ window: { min: 3, max: 8 } }).querySelector('[data-nut]'),
    ).toBeNull();
  });

  it('puts string 1 on top', () => {
    const host = renderBoard({
      markers: [marker(1, 3, 'target'), marker(6, 3, 'target')],
    });
    expect(translate(markerAt(host, 1, 3))[1]).toBeLessThan(
      translate(markerAt(host, 6, 3))[1],
    );
  });

  it('carries the marker data on each marker', () => {
    const host = renderBoard({
      markers: [marker(5, 3, 'target', { isRoot: true })],
    });
    const el = markerAt(host, 5, 3)!;
    expect(el.getAttribute('data-midi')).toBe('48');
    expect(el.getAttribute('data-role')).toBe('target');
    expect(el.getAttribute('data-root')).toBe('true');
    expect(el.textContent).toBe('C');
  });

  it('gives every role its own shape', () => {
    const roles: FretMarkerRole[] = [
      'context',
      'hint',
      'next',
      'target',
      'done',
      'played',
      'wrong',
      'missed',
    ];
    const host = renderBoard({
      window: { min: 1, max: 8 },
      markers: roles.map((role, i) => marker(3, i + 1, role)),
    });
    const at = (fret: number) => markerAt(host, 3, fret)!;

    // context: a small faint dot, no label.
    expect(
      Number(at(1).querySelector('circle')?.getAttribute('r')),
    ).toBeLessThan(5);
    expect(at(1).querySelector('text')).toBeNull();
    // hint: a dotted outline.
    expect(
      at(2).querySelector('circle')?.getAttribute('stroke-dasharray'),
    ).toBe('1.5 2');
    // next: a solid ring in the key colour.
    const nextRing = at(3).querySelector('circle')!;
    expect(nextRing.getAttribute('stroke')).toBe(RED);
    expect(nextRing.hasAttribute('stroke-dasharray')).toBe(false);
    // target: filled with the key colour.
    expect(at(4).querySelector('circle')?.getAttribute('fill')).toBe(RED);
    // done: filled, with a check.
    expect(at(5).querySelector('[data-check]')).not.toBeNull();
    // played: a double ring.
    expect(at(6).querySelectorAll('circle')).toHaveLength(2);
    // wrong: a solid grey cross; missed: a dashed cross in the key colour.
    const wrong = at(7).querySelector('path')!;
    expect(wrong.getAttribute('stroke')).toBe(WRONG_NOTE_KEY_COLOR);
    expect(wrong.hasAttribute('stroke-dasharray')).toBe(false);
    const missed = at(8).querySelector('path')!;
    expect(missed.getAttribute('stroke')).toBe(RED);
    expect(missed.hasAttribute('stroke-dasharray')).toBe(true);
    expect(at(7).querySelector('circle')).toBeNull();
  });

  it('uses the wrong colour it is given', () => {
    const host = renderBoard({
      markers: [marker(2, 1, 'wrong')],
      wrongColor: '#123456',
    });
    expect(
      markerAt(host, 2, 1)?.querySelector('path')?.getAttribute('stroke'),
    ).toBe('#123456');
  });

  it('draws a root as a diamond', () => {
    const host = renderBoard({
      markers: [
        marker(5, 3, 'target', { isRoot: true }),
        marker(4, 2, 'target'),
      ],
    });
    expect(markerAt(host, 5, 3)?.querySelector('polygon')).not.toBeNull();
    expect(markerAt(host, 4, 2)?.querySelector('polygon')).toBeNull();
  });

  it('keeps the strongest role when markers share a spot', () => {
    const host = renderBoard({
      markers: [
        marker(3, 2, 'context'),
        marker(3, 2, 'played'),
        marker(3, 2, 'target'),
        marker(2, 1, 'missed'),
        marker(2, 1, 'hint'),
      ],
    });
    expect(host.querySelectorAll('[data-marker]')).toHaveLength(2);
    expect(markerAt(host, 3, 2)?.getAttribute('data-role')).toBe('played');
    expect(markerAt(host, 2, 1)?.getAttribute('data-role')).toBe('missed');
  });

  it('puts open strings left of the nut and drops markers off the window', () => {
    const host = renderBoard({
      markers: [marker(6, 0, 'target'), marker(1, 9, 'target')],
    });
    const nutX = Number(host.querySelector('[data-nut]')?.getAttribute('x1'));
    expect(translate(markerAt(host, 6, 0))[0]).toBeLessThan(nutX);
    expect(markerAt(host, 1, 9)).toBeNull();

    const up = renderBoard({
      window: { min: 3, max: 8 },
      markers: [marker(6, 0, 'target')],
    });
    expect(up.querySelectorAll('[data-marker]')).toHaveLength(0);
  });

  it('draws inlays, doubled at the twelfth fret', () => {
    const host = renderBoard({ window: { min: 1, max: 12 } });
    const inlays = [...host.querySelectorAll('[data-inlay]')].map((c) =>
      c.getAttribute('data-inlay'),
    );
    expect(inlays).toEqual(['3', '5', '7', '9', '12', '12']);
  });

  it('hides note names when asked', () => {
    const host = renderBoard({
      markers: [marker(5, 3, 'target')],
      showNoteNames: false,
    });
    expect(markerAt(host, 5, 3)?.querySelector('text')).toBeNull();
  });

  it('announces what to play', () => {
    renderBoard({ markers: [marker(5, 3, 'target'), marker(4, 2, 'context')] });
    expect(
      screen.getByRole('img', {
        name: 'Fretboard, frets 0 to 5; play C on string 5 fret 3',
      }),
    ).toBeInTheDocument();
  });

  it('mirrors for left-handers: nut on the right, text unmirrored', () => {
    const markers = [marker(5, 3, 'target'), marker(6, 0, 'target')];
    const right = renderBoard({ markers });
    const left = renderBoard({ markers, mirrored: true });
    const nutX = (host: Element) =>
      Number(host.querySelector('[data-nut]')?.getAttribute('x1'));

    expect(nutX(left)).toBeGreaterThan(nutX(right));
    expect(translate(markerAt(left, 6, 0))[0]).toBeGreaterThan(nutX(left));
    expect(translate(markerAt(left, 5, 3))[0]).toBeLessThan(nutX(left));
    // Frets now count leftwards, and their numbers still read normally.
    const labelX = (host: Element, fret: number) =>
      Number(
        host.querySelector(`[data-fret-label="${fret}"]`)?.getAttribute('x'),
      );
    expect(labelX(left, 1)).toBeGreaterThan(labelX(left, 5));
    expect(fretLabels(left)).toEqual(['1', '2', '3', '4', '5']);
    expect(markerAt(left, 5, 3)?.textContent).toBe('C');
    for (const el of left.querySelectorAll('[transform]')) {
      expect(el.getAttribute('transform')).toMatch(/^translate\([^)]*\)$/);
    }
  });
});

describe('Fretboard (scrollable)', () => {
  afterEach(() => cleanup());

  it('keeps frets at their natural size inside a scroller when asked', () => {
    const { container } = render(
      <Fretboard
        window={{ min: 2, max: 17 }}
        markers={[]}
        keyColor="#d2404a"
        height={151}
        scrollable
      />,
    );
    const scroller = container.querySelector('[data-fretboard-scroller]');
    expect(scroller).not.toBeNull();
    const svg = scroller!.querySelector('svg')!;
    // 16 frets x 40 + padding, at 1 px per unit (height 151 = viewBox height).
    expect(parseInt(svg.style.minWidth, 10)).toBeGreaterThanOrEqual(16 * 40);
  });

  it('renders the bare neck, filling its space, by default', () => {
    const { container } = render(
      <Fretboard window={{ min: 0, max: 5 }} markers={[]} keyColor="#d2404a" />,
    );
    expect(container.querySelector('[data-fretboard-scroller]')).toBeNull();
    expect(container.querySelector('svg')!.style.minWidth).toBe('');
  });
});

describe('Fretboard label modes and brackets', () => {
  afterEach(() => cleanup());

  it('draws a marker’s text in place of its label, and reads both', () => {
    const host = renderBoard({
      markers: [
        marker(5, 3, 'target', {
          label: 'C',
          text: 'R',
          spokenText: 'root',
          isRoot: true,
        }),
        marker(4, 2, 'next', { label: 'E', text: '3', spokenText: 'finger 3' }),
      ],
    });
    expect(markerAt(host, 5, 3)?.textContent).toBe('R');
    expect(markerAt(host, 4, 2)?.textContent).toBe('3');
    expect(
      screen.getByRole('img', {
        name: 'Fretboard, frets 0 to 5; play C, root on string 5 fret 3; next E, finger 3 on string 4 fret 2',
      }),
    ).toBeInTheDocument();
  });

  it('draws nothing inside a marker whose text is empty (an open string’s finger)', () => {
    const host = renderBoard({
      markers: [marker(3, 0, 'target', { label: 'G', text: '' })],
    });
    expect(markerAt(host, 3, 0)?.querySelector('text')).toBeNull();
  });

  it('draws key-number chips as rounded squares, the root as a diamond', () => {
    const host = renderBoard({
      labelShape: 'chip',
      markers: [
        marker(5, 3, 'target', { text: '1', isRoot: true }),
        marker(5, 5, 'next', { text: '2' }),
        marker(4, 2, 'done', { text: '3' }),
      ],
    });
    expect(markerAt(host, 5, 3)?.querySelector('polygon')).not.toBeNull();
    expect(markerAt(host, 5, 5)?.querySelector('rect')).not.toBeNull();
    expect(markerAt(host, 4, 2)?.querySelector('rect')).not.toBeNull();
    // The default stays round.
    cleanup();
    const round = renderBoard({ markers: [marker(5, 5, 'next')] });
    expect(markerAt(round, 5, 5)?.querySelector('rect')).toBeNull();
    expect(markerAt(round, 5, 5)?.querySelector('circle')).not.toBeNull();
  });

  it('brackets a half step over its string, labelled and read aloud', () => {
    const host = renderBoard({
      window: { min: 6, max: 11 },
      brackets: [
        {
          string: 5,
          fromFret: 7,
          toFret: 8,
          label: 'H',
          spoken: 'half step',
        },
      ],
    });
    const bracket = host.querySelector('[data-bracket="H"]');
    expect(bracket?.textContent).toBe('H');
    expect(bracket?.getAttribute('data-string')).toBe('5');
    expect(
      screen.getByRole('img', {
        name: 'Fretboard, frets 6 to 11; half step: string 5 fret 7 to 8',
      }),
    ).toBeInTheDocument();
    // A bracket outside the window is left out.
    cleanup();
    const off = renderBoard({
      window: { min: 0, max: 5 },
      brackets: [
        { string: 5, fromFret: 7, toFret: 8, label: 'H', spoken: 'half step' },
      ],
    });
    expect(off.querySelector('[data-bracket]')).toBeNull();
  });

  it('mirrors a bracket’s ends but keeps its label upright', () => {
    const bracketPath = (mirrored: boolean) => {
      const host = renderBoard({
        window: { min: 6, max: 11 },
        mirrored,
        brackets: [
          {
            string: 4,
            fromFret: 9,
            toFret: 10,
            label: 'H',
            spoken: 'half step',
          },
        ],
      });
      const g = host.querySelector('[data-bracket]')!;
      return {
        d: g.querySelector('path')!.getAttribute('d')!,
        text: g.querySelector('text')!,
      };
    };
    const right = bracketPath(false);
    const left = bracketPath(true);
    expect(left.d).not.toBe(right.d);
    expect(left.text.textContent).toBe('H');
    expect(left.text.getAttribute('transform')).toBeNull();
  });
});
