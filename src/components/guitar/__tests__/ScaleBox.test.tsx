// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { getGuitarCenter } from '@/curriculum/data/guitar/centers';
import { pentatonicGhosts } from '@/lib/guitar/theory/scaleTheory';
import { ScaleBox } from '../ScaleBox';

const RED = '#D2404A';
const C_MAJOR = getGuitarCenter('C').majorScale;
const G_PENTATONIC = getGuitarCenter('G').pentatonic;
const C_PENTATONIC = getGuitarCenter('C').pentatonic;
const F_MAJOR = getGuitarCenter('F').majorScale;

const dotTexts = (host: Element) =>
  [...host.querySelectorAll('[data-dot]')].map((d) => d.textContent);

describe('ScaleBox', () => {
  afterEach(cleanup);

  it('labels each note with its scale degree and outlines the tonic', () => {
    const { container } = render(
      <ScaleBox
        {...C_MAJOR}
        name="C Major Scale"
        tonicPc={0}
        keyColor={RED}
        activeIndex={2}
      />,
    );
    const dots = [...container.querySelectorAll('[data-dot]')];
    expect(dots.map((d) => d.textContent)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '1',
    ]);
    expect(
      dots.filter((d) => d.hasAttribute('data-root')).map((d) => d.textContent),
    ).toEqual(['1', '1']);
    expect(
      [...container.querySelectorAll('[data-fret-label]')].map(
        (t) => t.textContent,
      ),
    ).toEqual(['7', '8', '9', '10', '11']);
    expect(
      [...container.querySelectorAll('[data-marker="muted"]')].map((m) =>
        m.getAttribute('data-string'),
      ),
    ).toEqual(['3', '2', '1']);
    expect(
      screen.getByRole('img', {
        name: 'C Major Scale: 8 notes, frets 7 to 11, next: string 5 fret 7',
      }),
    ).toBeInTheDocument();
  });

  it('marks only the active note as next', () => {
    const { container } = render(
      <ScaleBox
        {...C_MAJOR}
        name="C Major Scale"
        tonicPc={0}
        keyColor={RED}
        activeIndex={2}
      />,
    );
    const next = container.querySelectorAll('[data-dot][data-state="next"]');
    expect(next).toHaveLength(1);
    expect(next[0].getAttribute('data-string')).toBe('5');
    expect(next[0].getAttribute('data-fret')).toBe('7');
  });

  it('shows open strings as O markers, with an open tonic as a root', () => {
    const { container } = render(
      <ScaleBox
        {...G_PENTATONIC}
        name="G Pentatonic Scale"
        tonicPc={7}
        keyColor={RED}
      />,
    );
    const open = [...container.querySelectorAll('[data-marker="open"]')];
    expect(open.map((m) => m.getAttribute('data-string'))).toEqual([
      '3',
      '2',
      '1',
    ]);
    expect(open[0].getAttribute('data-root')).toBe('true');
    expect(container.querySelector('[data-nut]')).not.toBeNull();
    expect(
      [...container.querySelectorAll('[data-dot]')].map((d) => d.textContent),
    ).toEqual(['2', '5', '1']);
  });
});

describe('ScaleBox label modes and layers', () => {
  afterEach(cleanup);

  it('shows one finger per fret, with the position label', () => {
    const { container } = render(
      <ScaleBox
        {...C_MAJOR}
        name="C Major Scale"
        tonicPc={0}
        keyColor={RED}
        labelMode="fingers"
      />,
    );
    // Frets 8 10 | 7 8 10 | 7 9 10, finger 1 on fret 7.
    expect(dotTexts(container)).toEqual([
      '2',
      '4',
      '1',
      '2',
      '4',
      '1',
      '3',
      '4',
    ]);
    expect(container.querySelector('[data-caption]')?.textContent).toBe(
      'Position 7: finger 1 on fret 7',
    );
    expect(
      screen.getByRole('img', {
        name: 'C Major Scale: 8 notes, frets 7 to 11, fingers 2 4 1 2 4 1 3 4',
      }),
    ).toBeInTheDocument();
  });

  it('gives open strings no finger and anchors finger 1 on fret 1', () => {
    const { container } = render(
      <ScaleBox
        {...G_PENTATONIC}
        name="G Pentatonic Scale"
        tonicPc={7}
        keyColor={RED}
        labelMode="fingers"
      />,
    );
    // G pentatonic: frets 2 and 3 take fingers 2 and 3.
    expect(dotTexts(container)).toEqual(['2', '3', '3']);
    for (const open of container.querySelectorAll('[data-marker="open"]')) {
      expect(open.querySelector('text')).toBeNull();
    }
    expect(container.querySelector('[data-caption]')?.textContent).toBe(
      'Position 1: finger 1 on fret 1',
    );
  });

  it('shows note names spelled in the key', () => {
    const { container } = render(
      <ScaleBox
        {...F_MAJOR}
        name="F Major Scale"
        tonicPc={5}
        keyColor={RED}
        labelMode="notes"
      />,
    );
    const texts = dotTexts(container);
    expect(texts).toContain('B♭');
    expect(texts).not.toContain('A♯');
    expect(container.querySelector('[data-caption]')).toBeNull();
  });

  it('draws key numbers as chips, the tonic still a diamond', () => {
    const { container } = render(
      <ScaleBox
        {...C_MAJOR}
        name="C Major Scale"
        tonicPc={0}
        keyColor={RED}
        labelMode="keyNumbers"
      />,
    );
    expect(dotTexts(container)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '1',
    ]);
    const dots = [...container.querySelectorAll('[data-dot]')];
    for (const dot of dots) {
      const root = dot.hasAttribute('data-root');
      expect(dot.querySelector(root ? 'polygon' : 'rect')).not.toBeNull();
      expect(dot.querySelector('circle')).toBeNull();
    }
  });

  it('joins the two tonics with a hairline labelled octave', () => {
    const { container } = render(
      <ScaleBox
        {...C_MAJOR}
        name="C Major Scale"
        tonicPc={0}
        keyColor={RED}
        showOctave
      />,
    );
    const octave = container.querySelector('[data-connector="octave"]');
    expect(octave?.textContent).toBe('octave');
    const line = octave!.querySelector('line')!;
    const at = (string: number, fret: number) =>
      container
        .querySelector(
          `[data-dot][data-string="${string}"][data-fret="${fret}"]`,
        )!
        .getAttribute('transform');
    // String 6 fret 8 to string 4 fret 10.
    expect(at(6, 8)).toBe(
      `translate(${line.getAttribute('x1')} ${line.getAttribute('y1')})`,
    );
    expect(at(4, 10)).toBe(
      `translate(${line.getAttribute('x2')} ${line.getAttribute('y2')})`,
    );
    expect(
      screen.getByRole('img', {
        name: /octave from string 6 fret 8 to string 4 fret 10$/,
      }),
    ).toBeInTheDocument();
  });

  it('outlines the notes the pentatonic leaves out, with a legend', () => {
    const ghosts = pentatonicGhosts(getGuitarCenter('C'), C_PENTATONIC);
    const { container } = render(
      <ScaleBox
        {...C_PENTATONIC}
        name="C Major Pentatonic Scale"
        tonicPc={0}
        keyColor={RED}
        showOctave
        ghosts={ghosts}
      />,
    );
    const drawn = [...container.querySelectorAll('[data-ghost]')];
    expect(
      drawn.map(
        (g) =>
          `${g.getAttribute('data-string')}:${g.getAttribute('data-fret')}`,
      ),
    ).toEqual(['2:6', '1:7']);
    for (const ghost of drawn) {
      expect(ghost.getAttribute('fill')).toBe('none');
      expect(ghost.getAttribute('stroke-dasharray')).toBeTruthy();
      expect(ghost.closest('[data-dot]')).toBeNull();
    }
    expect(container.querySelector('[data-ghost-legend]')?.textContent).toBe(
      'not in the pentatonic',
    );
    expect(
      screen.getByRole('img', {
        name: /2 outlines not in the pentatonic$/,
      }),
    ).toBeInTheDocument();
    // String 3 fret 5 to string 1 fret 8.
    const line = container.querySelector('[data-connector="octave"] line')!;
    expect(Number(line.getAttribute('y2'))).toBeGreaterThan(
      Number(line.getAttribute('y1')),
    );
  });

  it('opens its (i) popover', () => {
    render(
      <ScaleBox
        {...C_MAJOR}
        name="C Major Scale"
        tonicPc={0}
        keyColor={RED}
        about={[{ id: 'a1.ionian', title: 'What is Ionian?', body: 'Body.' }]}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'About the C Major Scale' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'About the C Major Scale' })
        .textContent,
    ).toContain('What is Ionian?');
  });

  it('mirrors the layers with the box, text upright', () => {
    const draw = (mirrored: boolean) =>
      render(
        <ScaleBox
          {...C_MAJOR}
          name="C Major Scale"
          tonicPc={0}
          keyColor={RED}
          labelMode="fingers"
          showOctave
          mirrored={mirrored}
        />,
      ).container;
    const right = draw(false);
    const left = draw(true);
    const x1 = (host: Element) =>
      Number(host.querySelector('[data-connector] line')?.getAttribute('x1'));
    expect(x1(left)).not.toBe(x1(right));
    expect(dotTexts(left)).toEqual(dotTexts(right));
    expect(left.querySelector('[data-connector] text')?.textContent).toBe(
      'octave',
    );
  });
});
