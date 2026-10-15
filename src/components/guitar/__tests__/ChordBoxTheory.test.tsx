// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hybridLabel } from '@/curriculum/data/guitar/bookOne';
import {
  chordName,
  chordRootPc,
  getGuitarCenter,
} from '@/curriculum/data/guitar/centers';
import type {
  GuitarChordShape,
  GuitarKeyName,
} from '@/curriculum/data/guitar/types';
import { formatAccidentalsForDisplay } from '@/curriculum/utils/formatAccidentals';
import { useGuitarDisplaySettings } from '@/features/learn/useGuitarDisplaySettings';
import type { GuitarShapeDiagram } from '@/lib/guitar/types';
import { ChordBox } from '../ChordBox';

// The theory layer on a chord box (beato-knowledge-spec V1-01/02/04/07/08/
// 13/22): formula and family lines, chord-tone labels, hollow inlays up the
// neck, the (i) popover and the aria.chordbox description.

const RED = '#D2404A';

/** Book One shapes by id, with the name and label the lesson gives them. */
function book(key: GuitarKeyName, kind: 'triads' | 'sevenths', n: number) {
  const shape: GuitarChordShape = getGuitarCenter(key)[kind][n - 1];
  return {
    shape,
    name: formatAccidentalsForDisplay(
      chordName(getGuitarCenter(key), shape.degree, shape.quality),
    ).replace('(b5)', '(♭5)'),
    hybridLabel: hybridLabel(shape.degree, shape.quality),
    rootPc: chordRootPc(getGuitarCenter(key), shape.degree),
  };
}

const C = book('C', 'triads', 1); // X-3-2-0-1-0
const CMAJ7 = book('C', 'sevenths', 1); // X-3-5-4-5-X
const G7 = book('C', 'sevenths', 5); // X-10-12-10-12-X
const BM7B5 = book('C', 'sevenths', 7); // X-14-15-14-15-X
const GMAJ7 = book('G', 'sevenths', 1); // 3-X-4-4-3-X
const FMAJ7 = book('F', 'sevenths', 1); // 1-0-2-2-1-0
const DM7 = book('C', 'sevenths', 2); // X-5-7-5-6-X
const FSM7B5 = book('G', 'sevenths', 7); // X-9-10-9-10-X

function renderBox(
  chord: ReturnType<typeof book>,
  props: Partial<Parameters<typeof ChordBox>[0]> = {},
) {
  return render(<ChordBox {...chord} keyColor={RED} {...props} />).container;
}

const text = (host: Element, selector: string) =>
  host.querySelector(selector)?.textContent ?? null;

/** Each dot's (or labelled O marker's) text by string, string 6 first. */
function labelsByString(host: Element): Record<number, string> {
  const out: Record<number, string> = {};
  for (const el of host.querySelectorAll('[data-dot], [data-marker="open"]')) {
    const label = el.querySelector('text')?.textContent;
    if (label) out[Number(el.getAttribute('data-string'))] = label;
  }
  return out;
}

function xOf(el: Element | null): number {
  const match = /translate\(([-\d.]+)/.exec(
    el?.getAttribute('transform') ?? '',
  );
  if (!match) throw new Error('element has no translate');
  return Number(match[1]);
}

beforeEach(() => {
  useGuitarDisplaySettings.setState({ chordBoxLabels: 'fingers' });
});
afterEach(cleanup);

describe('ChordBox theory lines', () => {
  it.each([
    ['C major (open)', C, 'R 3 5', 'Open chord', 'Uses open strings'],
    [
      'C major 7 X-3-5-4-5-X',
      CMAJ7,
      'R 3 5 7',
      'Root on string 5 · drop 2',
      'Movable',
    ],
    [
      'G major 7 3-X-4-4-3-X',
      GMAJ7,
      'R 3 5 7',
      'Root on string 6 · drop 3',
      'Movable',
    ],
    [
      'F major 7 1-0-2-2-1-0',
      FMAJ7,
      'R 3 5 7',
      'Open-string voicing',
      'Uses open strings',
    ],
    [
      'B minor 7(♭5)',
      BM7B5,
      'R ♭3 ♭5 ♭7 · half-diminished (ø)',
      'Root on string 5 · drop 2',
      'Movable',
    ],
  ])('%s: formula, family and badge', (_, chord, formula, family, badge) => {
    const host = renderBox(chord);
    expect(text(host, '[data-formula]')).toBe(formula);
    const familyLine = host.querySelector('[data-family]')!;
    expect(familyLine.textContent).toBe(`${family}${badge}`);
    expect(text(familyLine, '[data-badge]')).toBe(badge);
    // Chord name and Hybrid label stay the header.
    expect(text(host, '[data-title]')).toBe(chord.name);
    expect(screen.getByText(chord.hybridLabel)).toBeInTheDocument();
  });

  it('draws no theory layer for a shape without a quality', () => {
    const plain: GuitarShapeDiagram = {
      frets: '0-2-2-0-0-0',
      diagramStartFret: 1,
      fingering: [],
    };
    const host = renderBox({ ...C, shape: plain as GuitarChordShape });
    expect(host.querySelector('[data-chord-theory]')).toBeNull();
    expect(screen.queryByRole('button', { name: /^About/ })).toBeNull();
  });

  it('can be told to leave the theory layer off', () => {
    const host = renderBox(CMAJ7, { theory: false });
    expect(host.querySelector('[data-chord-theory]')).toBeNull();
    expect(host.querySelector('[data-inlay]')).toBeNull();
  });
});

describe('ChordBox aria', () => {
  it('reads aria.chordbox: name, shape, tones low to high, family', () => {
    renderBox(CMAJ7);
    expect(
      screen.getByRole('img', {
        name: 'C major 7: x 3 5 4 5 x. Low to high: root, 5, 7, 3. Root on string 5, drop 2. Fingers 1 3 2 4',
      }),
    ).toBeInTheDocument();
    cleanup();
    renderBox(GMAJ7);
    expect(
      screen.getByRole('img', {
        name: /^G major 7: 3 x 4 4 3 x\. Low to high: root, 7, 3, 5\. Root on string 6, drop 3\./,
      }),
    ).toBeInTheDocument();
    cleanup();
    renderBox(BM7B5);
    expect(
      screen.getByRole('img', {
        name: /^B minor 7\(♭5\): x 14 15 14 15 x\. Low to high: root, flat 5, flat 7, flat 3\./,
      }),
    ).toBeInTheDocument();
  });
});

describe('ChordBox chord-tone labels', () => {
  it('shows fingers by default, and R/3/5/7 from the device setting', () => {
    const fingers = renderBox(G7);
    expect(labelsByString(fingers)).toEqual({ 5: '1', 4: '3', 3: '1', 2: '4' });
    cleanup();
    useGuitarDisplaySettings.setState({ chordBoxLabels: 'chordTones' });
    const tones = renderBox(G7);
    expect(labelsByString(tones)).toEqual({
      5: 'R',
      4: '5',
      3: '♭7',
      2: '3',
    });
  });

  it('never labels the root 1, and rings only the quality tones', () => {
    const host = renderBox(G7, { labelMode: 'chordTones' });
    const ringed = [...host.querySelectorAll('[data-dot]')]
      .filter((d) => d.querySelector('[data-quality-ring]'))
      .map((d) => d.querySelector('text')?.textContent)
      .sort();
    expect(ringed).toEqual(['3', '♭7']);
    expect(Object.values(labelsByString(host))).not.toContain('1');
    // The root keeps its diamond in chord-tone mode.
    const root = host.querySelector('[data-dot][data-root]');
    expect(root?.querySelector('polygon')).not.toBeNull();
    expect(root?.textContent).toBe('R');
  });

  it('labels open strings too, so the whole chord reads', () => {
    const host = renderBox(C, { labelMode: 'chordTones' });
    // X-3-2-0-1-0: C E G C E.
    expect(labelsByString(host)).toEqual({
      5: 'R',
      4: '3',
      3: '5',
      2: 'R',
      1: '3',
    });
    const openE = host.querySelector('[data-marker="open"][data-string="1"]');
    expect(openE?.querySelector('[data-quality-ring]')).not.toBeNull();
    // A labelled O grows to near a dot's size, so '3' stays legible when
    // the box is small, and stays clear of the nut below it.
    // The marker's own body: its first circle, not the quality ring's.
    const body = [...openE!.children].find((c) => c.tagName === 'circle')!;
    const r = Number(body.getAttribute('r'));
    expect(r).toBeGreaterThanOrEqual(6);
    expect(
      Number(openE!.querySelector('text')?.getAttribute('font-size')),
    ).toBeGreaterThanOrEqual(8);
    const nut = host.querySelector('[data-nut]')!;
    const nutTop =
      Number(nut.getAttribute('y1')) -
      Number(nut.getAttribute('stroke-width')) / 2;
    const markerY = Number(
      /translate\([-\d.]+ ([-\d.]+)\)/.exec(
        openE!.getAttribute('transform')!,
      )![1],
    );
    expect(
      markerY + r + Number(body.getAttribute('stroke-width')) / 2,
    ).toBeLessThanOrEqual(nutTop);
  });

  it('prop wins over the device setting; showFingers false still empties the dots', () => {
    useGuitarDisplaySettings.setState({ chordBoxLabels: 'chordTones' });
    expect(labelsByString(renderBox(G7, { labelMode: 'fingers' }))).toEqual({
      5: '1',
      4: '3',
      3: '1',
      2: '4',
    });
    cleanup();
    expect(labelsByString(renderBox(G7, { showFingers: false }))).toEqual({});
  });

  it('mirrors geometry for left-handers, never the chord-tone text', () => {
    const right = renderBox(G7, { labelMode: 'chordTones' });
    const rightRoot = xOf(right.querySelector('[data-dot][data-string="5"]'));
    const rightLabels = labelsByString(right);
    const left = renderBox(G7, { labelMode: 'chordTones', mirrored: true });
    const leftRoot = xOf(left.querySelector('[data-dot][data-string="5"]'));
    expect(leftRoot).not.toBe(rightRoot);
    expect(labelsByString(left)).toEqual(rightLabels);
    for (const el of left.querySelectorAll('[transform]')) {
      expect(el.getAttribute('transform')).toMatch(/^translate\([^)]*\)$/);
    }
  });
});

describe('ChordBox inlays', () => {
  it('draws hollow inlays inside a box up the neck, never as dots', () => {
    // F♯ minor 7(♭5), X-9-10-9-10-X: rows 8-12, fret 12 free.
    const host = renderBox(FSM7B5);
    const inlays = [...host.querySelectorAll('[data-inlay]')];
    expect(inlays.map((i) => i.getAttribute('data-inlay'))).toEqual([
      '12',
      '12',
    ]);
    for (const inlay of inlays) {
      expect(inlay.getAttribute('fill')).toBe('none');
      expect(inlay.closest('[data-dot]')).toBeNull();
      expect(Number(inlay.getAttribute('r'))).toBeLessThan(6.5);
    }
    // Dots stay what they were: filled bodies with a finger.
    expect(host.querySelectorAll('[data-dot]')).toHaveLength(4);
  });

  it('leaves out an inlay a dot would cover, and draws none at the nut', () => {
    // X-10-12-10-12-X: rows 9-13; fret 12's dots sit beside both its inlays.
    const g7 = renderBox(G7);
    expect(
      [...g7.querySelectorAll('[data-inlay]')].map((i) =>
        i.getAttribute('data-inlay'),
      ),
    ).toEqual(['9']);
    cleanup();
    // X-5-7-5-6-X: frets 5 and 7 both have a dot beside the centre.
    expect(renderBox(DM7).querySelector('[data-inlay]')).toBeNull();
    cleanup();
    expect(renderBox(C).querySelector('[data-inlay]')).toBeNull();
  });

  it('mirrors the inlays with the box', () => {
    const cx = (host: Element) =>
      [...host.querySelectorAll('[data-inlay="12"]')].map((i) =>
        Number(i.getAttribute('cx')),
      );
    const right = cx(renderBox(FSM7B5));
    const left = cx(renderBox(FSM7B5, { mirrored: true }));
    // The two fret-12 inlays swap sides about the neck's centre line.
    expect(right).toHaveLength(2);
    expect(left).toEqual([...right].reverse());
  });
});

describe('ChordBox (i) popover', () => {
  function openPopover(name: string) {
    fireEvent.click(screen.getByRole('button', { name: `About ${name}` }));
    return screen.getByRole('dialog', { name: `About ${name}` });
  }
  const noteIds = (dialog: HTMLElement) =>
    [...dialog.querySelectorAll('[data-note-id]')].map((n) =>
      n.getAttribute('data-note-id'),
    );

  it('explains a drop-2 7th: aliases, family, movable, hidden triad, order', () => {
    renderBox(CMAJ7);
    const dialog = openPopover('C major 7');
    expect(
      within(dialog).getByText(
        'Also written as CM7, CΔ7 or CΔ. They all mean the same chord.',
      ),
    ).toBeInTheDocument();
    expect(noteIds(dialog)).toEqual([
      'b7.drop2',
      'b7.movable',
      'b7.hidden',
      'b7.order',
    ]);
    expect(dialog.textContent).toContain(
      'Root on string 5, then one note on each string. Guitarists call this a drop 2 shape.',
    );
    expect(dialog.textContent).toContain(
      'Take away the root of C major 7 and E minor is left. You already know it as chord 3.',
    );
    expect(dialog.textContent).toContain(
      'Low to high, this shape plays R, 5, 7, 3.',
    );
    // Under prefers-reduced-motion the open animation must actually stop:
    // the popover's data-[state=open]:animate-in outranks a plain
    // motion-reduce:animate-none, so the override needs `!`.
    expect(dialog.className).toContain('motion-reduce:!animate-none');
  });

  it('names a dominant 7 by its symbol and has no hidden triad on 5', () => {
    renderBox(G7);
    const dialog = openPopover('G dominant 7');
    expect(dialog.textContent).toContain(
      'Charts write this chord as G7. A plain 7 means dominant 7.',
    );
    expect(noteIds(dialog)).not.toContain('b7.hidden');
  });

  it('gives drop 3, the open-string voicing and chord 7 their own notes', () => {
    renderBox(GMAJ7);
    expect(noteIds(openPopover('G major 7'))).toContain('b7.drop3');
    cleanup();
    renderBox(FMAJ7);
    const fmaj7 = openPopover('F major 7');
    expect(noteIds(fmaj7)).toContain('b7.open');
    expect(noteIds(fmaj7)).not.toContain('b7.movable');
    // Open A is the 3 and open high E the 7 in F major 7.
    expect(fmaj7.textContent).toContain(
      'Open A is the 3. Open high E is the 7.',
    );
    cleanup();
    renderBox(BM7B5);
    const half = openPopover('B minor 7(♭5)');
    expect(noteIds(half)[0]).toBe('b7.halfDim');
    expect(half.textContent).toContain('Bø7, Bø, B−7♭5 or Bmin7(♭5)');
  });

  it('keeps a triad to its aliases and tone order', () => {
    renderBox(C);
    const dialog = openPopover('C major');
    expect(dialog.textContent).toContain(
      'Also written as Cmaj or CM. They all mean the same chord.',
    );
    expect(noteIds(dialog)).toEqual(['b1.order']);
    expect(dialog.textContent).toContain(
      'Low to high, this shape plays R, 3, 5, R, 3. R is the root.',
    );
  });
});

describe('chord-tone labels given by the caller', () => {
  afterEach(cleanup);

  // A song's E7sus4, open: 0-2-0-2-0-0 (no Book One quality).
  const E7SUS4: GuitarShapeDiagram = {
    frets: '0-2-0-2-0-0',
    diagramStartFret: 1,
    fingering: [
      { finger: 2, string: 5, fret: 2 },
      { finger: 3, string: 3, fret: 2 },
    ],
  };
  const tones = new Map([
    [6, 'R'],
    [5, '5'],
    [4, '♭7'],
    [3, '4'],
    [2, '5'],
    [1, 'R'],
  ] as const);

  it('labels a chord with no theory layer from toneLabels', () => {
    const host = render(
      <ChordBox
        shape={E7SUS4}
        name="E7sus4"
        rootPc={4}
        keyColor={RED}
        labelMode="chordTones"
        toneLabels={tones}
      />,
    ).container;
    expect(labelsByString(host)).toEqual({
      6: 'R',
      5: '5',
      4: '♭7',
      3: '4',
      2: '5',
      1: 'R',
    });
  });

  it('keeps fingers without them, or in finger mode', () => {
    const fingers = render(
      <ChordBox
        shape={E7SUS4}
        name="E7sus4"
        rootPc={4}
        keyColor={RED}
        labelMode="fingers"
        toneLabels={tones}
      />,
    ).container;
    expect(labelsByString(fingers)).toMatchObject({ 5: '2', 3: '3' });
  });
});
