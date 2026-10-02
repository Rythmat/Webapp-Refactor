// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GUITAR_ATLAS_BOOK_ONE } from '@/curriculum/data/guitar/bookOne';
import { useGuitarDisplaySettings } from '@/features/learn/useGuitarDisplaySettings';
import { midiAt } from '@/lib/guitar/fretboard';
import type { GuitarStringNumber } from '@/lib/guitar/types';
import { ChordBox } from '../ChordBox';
import { FretDiagram, LESSON_PX_PER_UNIT } from '../FretDiagram';
import {
  FRETBOARD_HEIGHT_UNITS,
  Fretboard,
  fretboardWidthUnits,
} from '../Fretboard';
import { ScaleBox } from '../ScaleBox';
import type { FretMarker, FretMarkerRole } from '../types';

// The guitar lesson's look for the diagrams: two short lines over a quiet
// box, the rest in an (i), the key colour only on what is played now, and
// 12px type at any size — or, on a large neck, type that grows with it.

const C = GUITAR_ATLAS_BOOK_ONE.C;
const KEY = '#D2404A';

beforeEach(() => {
  useGuitarDisplaySettings.setState({ chordBoxLabels: 'fingers' });
});
afterEach(cleanup);

/** The x a diagram's geometry puts an element at. */
function xOf(el: Element | null): number {
  const match = /translate\(([-\d.]+)/.exec(
    el?.getAttribute('transform') ?? '',
  );
  if (!match) throw new Error('element has no translate');
  return Number(match[1]);
}

/** A font size in drawing units, as px on screen. */
const px = (el: Element | null, perUnit: number) =>
  Number(el?.getAttribute('font-size')) * perUnit;

describe('ChordBox, lesson', () => {
  const lessonBox = (props: Partial<Parameters<typeof ChordBox>[0]> = {}) =>
    render(
      <ChordBox
        shape={C.triads[0]}
        name="C major"
        hybridLabel="1 maj"
        rootPc={0}
        keyColor={KEY}
        size="md"
        variant="lesson"
        {...props}
      />,
    ).container;

  it('says two things over the box: the name with its (i), then the Hybrid label', () => {
    const host = lessonBox();
    const box = host.querySelector('[data-chord-box]')!;
    expect(box.getAttribute('data-variant')).toBe('lesson');
    const title = box.querySelector('[data-title]')!;
    expect(title.textContent).toBe('C major');
    expect(title.className).toContain('font-bold');
    expect(
      title.parentElement!.querySelector('[data-theory-info]'),
    ).toBeTruthy();
    const subtitle = box.querySelector('[data-subtitle]')!;
    expect(subtitle.textContent).toBe('1 maj');
    expect(subtitle.parentElement!.className).toContain('text-xs');
    expect(subtitle.parentElement!.className).toContain('text-white/55');
    // Nothing else is written outside the (i).
    for (const hidden of ['[data-formula]', '[data-family]', '[data-caption]'])
      expect(host.querySelector(hidden)).toBeNull();
    expect(screen.queryByText('X-3-2-0-1-0')).toBeNull();
  });

  it('keeps the formula, family, badge, shape and other names in the (i)', () => {
    lessonBox();
    fireEvent.click(screen.getByRole('button', { name: 'About C major' }));
    const popover = screen.getByRole('dialog', { name: 'About C major' });
    expect(within(popover).getByText('R 3 5')).toBeTruthy();
    expect(popover.querySelector('[data-family]')?.textContent).toMatch(
      /^Open chord · Uses open strings$/,
    );
    expect(popover.querySelector('[data-caption]')?.textContent).toBe(
      'Shape X-3-2-0-1-0',
    );
    expect(popover.textContent).toMatch(/Also written as/);
    // The landing popover, fade only.
    expect(popover.className).toContain('bg-[#141416]');
    expect(popover.style.getPropertyValue('--tw-enter-scale')).toBe('1');
    expect(popover.innerHTML).not.toMatch(/font-(semibold|medium)/);
  });

  it('plays the chord from the box itself', () => {
    const onHear = vi.fn();
    const host = lessonBox({ onHear });
    const hear = screen.getByRole('button', { name: 'Hear C major' });
    // The diagram is inside the button; no separate "Hear it".
    expect(hear.querySelector('[data-diagram-state]')).toBeTruthy();
    expect(screen.queryByText('Hear it')).toBeNull();
    fireEvent.click(hear);
    expect(onHear).toHaveBeenCalledOnce();
    // The box's own description still reaches a screen reader.
    const described = host.querySelector(
      `#${CSS.escape(hear.getAttribute('aria-describedby')!)}`,
    );
    expect(described?.textContent).toMatch(/^C major/);
    expect(described?.className).toContain('sr-only');
  });

  it('is only a picture without a way to play it', () => {
    lessonBox();
    expect(screen.queryByRole('button', { name: /^Hear/ })).toBeNull();
    expect(screen.getByRole('img', { name: /^C major/ })).toBeTruthy();
  });

  it('frames the box white/30, and the chord to play 2px in the key colour', () => {
    const perUnit = LESSON_PX_PER_UNIT.md;
    const frame = (host: Element) => host.querySelector('[data-frame]')!;
    const idle = frame(lessonBox({ state: 'idle' }));
    expect(idle.getAttribute('stroke')).toBe('rgba(255, 255, 255, 0.3)');
    expect(idle.getAttribute('fill')).toBe('none');
    cleanup();
    const current = frame(lessonBox({ state: 'current' }));
    expect(current.getAttribute('stroke')).toBe(KEY);
    expect(Number(current.getAttribute('stroke-width')) * perUnit).toBeCloseTo(
      2,
    );
    expect(current.getAttribute('fill')).toBe('none');
  });

  it('rings a heard chord without pulsing, and fades a done one to 40%', () => {
    const heard = lessonBox({ state: 'heard' });
    expect(heard.querySelector('[data-heard-ring]')).toBeTruthy();
    expect(heard.querySelector('[data-glow]')).toBeNull();
    expect(heard.innerHTML).not.toMatch(/animate-pulse/);
    cleanup();
    const done = lessonBox({ state: 'done' });
    expect(done.querySelector('[data-chord-box]')!.className).toContain(
      'opacity-40',
    );
    // Faded once, as a whole: the diagram adds no fade of its own.
    expect(
      done.querySelector('[data-diagram-state]')!.getAttribute('class'),
    ).not.toMatch(/opacity/);
  });

  it('writes fret and finger digits at 12px, at either size', () => {
    for (const size of ['sm', 'md'] as const) {
      const perUnit = LESSON_PX_PER_UNIT[size];
      const host = lessonBox({ size, shape: C.sevenths[1], name: 'D minor 7' });
      for (const label of host.querySelectorAll('[data-fret-label]')) {
        expect(px(label, perUnit)).toBeCloseTo(12);
      }
      for (const digit of host.querySelectorAll('[data-dot] text')) {
        expect(px(digit, perUnit)).toBeCloseTo(12);
      }
      cleanup();
    }
  });

  it('writes an open string’s label at 12px too, at either size', () => {
    useGuitarDisplaySettings.setState({ chordBoxLabels: 'chordTones' });
    for (const size of ['sm', 'md'] as const) {
      const perUnit = LESSON_PX_PER_UNIT[size];
      const host = lessonBox({ size });
      const labels = [
        ...host.querySelectorAll('[data-marker="open"] text'),
      ].filter((text) => text.textContent!.length === 1);
      // C major's open G and high e: its 5th and 3rd.
      expect(labels.map((text) => text.textContent)).toEqual(['5', '3']);
      for (const text of labels) expect(px(text, perUnit)).toBeCloseTo(12);
      cleanup();
    }
  });

  it('puts the extra tones after a missed strum on the label line', () => {
    const host = lessonBox({
      diagnostics: { missingPcs: [], extraPcs: [2] },
    });
    const extra = host.querySelector('[data-extra-badge]')!;
    expect(extra.textContent).toBe('extra: D');
    expect(extra.parentElement).toBe(
      host.querySelector('[data-subtitle]')!.parentElement,
    );
  });

  it('mirrors its geometry for a left-hander, never its text', () => {
    const dot = (host: Element) =>
      host.querySelector('[data-dot][data-string="5"][data-fret="3"]');
    const right = xOf(dot(lessonBox()));
    cleanup();
    const host = lessonBox({ mirrored: true });
    expect(xOf(dot(host))).not.toBe(right);
    expect(host.querySelector('[data-title]')?.textContent).toBe('C major');
  });
});

describe('FretDiagram, lesson', () => {
  it('draws a neutral nut and barre, and no octave text too small to read', () => {
    const host = render(
      <FretDiagram
        variant="lesson"
        startFret={1}
        muted={[6, 5]}
        open={[]}
        dots={[
          { string: 2, fret: 1, label: '1' },
          { string: 1, fret: 1, label: '1' },
          { string: 4, fret: 3, label: '3' },
        ]}
        barres={[{ fret: 1, fromString: 2, toString: 1, finger: 1 }]}
        connectors={[
          {
            from: { string: 4, fret: 3 },
            to: { string: 1, fret: 1 },
            label: 'octave',
          },
        ]}
        keyColor={KEY}
        ariaLabel="F major"
        state="current"
      />,
    ).container;
    expect(host.querySelector('[data-nut]')!.getAttribute('stroke')).not.toBe(
      KEY,
    );
    const barre = host.querySelector('[data-barre]')!;
    expect(barre.getAttribute('fill')).not.toBe(KEY);
    expect(barre.getAttribute('stroke')).not.toBe(KEY);
    // The key colour is on the frame alone.
    expect(
      [...host.querySelectorAll(`[stroke="${KEY}"], [fill="${KEY}"]`)].map(
        (el) => el.getAttribute('data-frame'),
      ),
    ).toEqual(['true']);
    const connector = host.querySelector('[data-connector="octave"]')!;
    expect(connector.querySelector('line')).toBeTruthy();
    expect(connector.querySelector('text')).toBeNull();
  });
});

describe('ScaleBox, lesson', () => {
  const pos = C.majorScale;
  const lessonScale = (props: Partial<Parameters<typeof ScaleBox>[0]> = {}) =>
    render(
      <ScaleBox
        playOrder={pos.playOrder}
        fretStart={pos.fretStart}
        fretEnd={pos.fretEnd}
        unusedStrings={pos.unusedStrings}
        name="C Major Scale"
        tonicPc={0}
        keyColor={KEY}
        size="md"
        labelMode="fingers"
        showOctave
        about={[
          { id: 'a1', title: 'What is Ionian?', body: 'The major scale.' },
        ]}
        variant="lesson"
        {...props}
      />,
    ).container;

  it('reads "C major scale (i)" over the box and its position under it', () => {
    const host = lessonScale();
    const title = host.querySelector('[data-title]')!;
    expect(title.textContent).toBe('C major scale');
    expect(title.className).toContain('font-bold');
    expect(host.querySelector('[data-position]')?.textContent).toBe(
      'Position 7 · finger 1 on fret 7',
    );
    // The box sits between the two lines.
    const order = [
      ...host.querySelectorAll('[data-title], [role="img"], [data-position]'),
    ].map((el) =>
      el.hasAttribute('data-title')
        ? 'title'
        : el.hasAttribute('data-position')
          ? 'position'
          : 'box',
    );
    expect(order).toEqual(['title', 'box', 'position']);
    // The finger caption isn't repeated inside the diagram.
    expect(host.querySelector('[data-caption]')).toBeNull();
  });

  it('keeps its notes and the octave legend in the (i)', () => {
    lessonScale();
    fireEvent.click(
      screen.getByRole('button', { name: 'About the C Major Scale' }),
    );
    const popover = screen.getByRole('dialog', {
      name: 'About the C Major Scale',
    });
    expect(popover.textContent).toContain('What is Ionian?');
    expect(popover.querySelector('[data-legend]')?.textContent).toBe('octave');
  });

  it('moves the pentatonic legend into the (i) too', () => {
    const host = lessonScale({
      name: 'C Major Pentatonic Scale',
      playOrder: C.pentatonic.playOrder,
      fretStart: C.pentatonic.fretStart,
      fretEnd: C.pentatonic.fretEnd,
      unusedStrings: C.pentatonic.unusedStrings,
      ghosts: [{ string: 5, fret: 8 }],
      showOctave: false,
      about: [],
    });
    expect(host.querySelector('[data-ghost-legend]')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'About the C Major Pentatonic Scale',
      }),
    );
    expect(
      screen.getByRole('dialog').querySelector('[data-ghost-legend]')
        ?.textContent,
    ).toBe('not in the pentatonic');
  });

  it('has no (i) when there is nothing to add', () => {
    lessonScale({ showOctave: false, about: [] });
    expect(screen.queryByRole('button', { name: /^About/ })).toBeNull();
  });
});

describe('Fretboard, lesson', () => {
  const marker = (
    string: GuitarStringNumber,
    fret: number,
    role: FretMarkerRole,
    text?: string,
  ): FretMarker => ({
    string,
    fret,
    midi: midiAt(string, fret),
    label: 'C',
    role,
    text,
  });
  const markers = [
    marker(6, 3, 'target', '2'),
    marker(5, 2, 'next'),
    marker(4, 2, 'done'),
    marker(3, 2, 'missed'),
    marker(2, 1, 'context'),
  ];
  const board = (height: number, variant?: 'lesson') =>
    render(
      <Fretboard
        window={{ min: 0, max: 5 }}
        markers={markers}
        keyColor={KEY}
        height={height}
        variant={variant}
        brackets={[
          {
            string: 2,
            fromFret: 0,
            toFret: 1,
            label: 'H',
            spoken: 'half step',
          },
        ]}
      />,
    ).container;
  const role = (host: Element, r: FretMarkerRole) =>
    host.querySelector(`[data-role="${r}"]`)!;

  it('has no board fill and quiet frets, strings and fret numbers', () => {
    const host = board(208, 'lesson');
    const svg = host.querySelector('svg')!;
    expect(svg.getAttribute('data-variant')).toBe('lesson');
    expect(
      host.querySelector('rect[fill="rgba(255,255,255,0.025)"]'),
    ).toBeNull();
    const lines = [...svg.children].filter((el) => el.tagName === 'line');
    const strokes = new Set(lines.map((l) => l.getAttribute('stroke')));
    expect(strokes).toContain('rgba(255, 255, 255, 0.15)');
    expect(strokes).toContain('rgba(255, 255, 255, 0.3)');
    expect(host.querySelector('[data-fret-label]')!.getAttribute('fill')).toBe(
      'rgba(255, 255, 255, 0.45)',
    );
    // The book's look is untouched without the variant.
    cleanup();
    expect(
      board(208).querySelector('rect[fill="rgba(255,255,255,0.025)"]'),
    ).toBeTruthy();
  });

  it('keeps the key colour for the note to play now', () => {
    const host = board(208, 'lesson');
    const painted = [
      ...host.querySelectorAll(`[fill="${KEY}"], [stroke="${KEY}"]`),
    ];
    expect(painted).toHaveLength(1);
    expect(role(host, 'target').contains(painted[0])).toBe(true);
    // Look-ahead, done and missed keep their shapes, in neutral ink.
    expect(
      role(host, 'next').querySelector('circle, polygon, rect'),
    ).toBeTruthy();
    expect(role(host, 'done').querySelector('[data-check]')).toBeTruthy();
    expect(
      role(host, 'missed')
        .querySelector('path')!
        .getAttribute('stroke-dasharray'),
    ).toBe('1.8 1.8');
  });

  it('scrolls sideways without a bar in a lesson, as the book draws it otherwise', () => {
    const scroller = (variant?: 'lesson') =>
      render(
        <Fretboard
          window={{ min: 0, max: 12 }}
          markers={markers}
          keyColor={KEY}
          height={150}
          scrollable
          variant={variant}
        />,
      ).container.querySelector('[data-fretboard-scroller]')!.className;
    expect(scroller('lesson')).toContain('[scrollbar-width:none]');
    cleanup();
    expect(scroller()).toBe(
      'w-full overflow-x-auto overflow-y-hidden [scrollbar-width:thin]',
    );
  });

  it('writes 12px labels up to the old 208px band', () => {
    for (const height of [150, 168, 208]) {
      const host = board(height, 'lesson');
      const perUnit = height / 151;
      for (const label of host.querySelectorAll('[data-fret-label]')) {
        expect(px(label, perUnit)).toBeCloseTo(12);
      }
      expect(
        px(role(host, 'target').querySelector('text'), perUnit),
      ).toBeCloseTo(12);
      expect(
        px(host.querySelector('[data-bracket] text'), perUnit),
      ).toBeCloseTo(12);
      cleanup();
    }
  });

  it('grows its labels with a large neck, so they don’t sit tiny in large dots', () => {
    const height = 377;
    const perUnit = height / FRETBOARD_HEIGHT_UNITS;
    const host = board(height, 'lesson');
    // 8.5 units: 12px on the old 208px band, about 21px here.
    for (const label of host.querySelectorAll('[data-fret-label]')) {
      expect(px(label, perUnit)).toBeCloseTo(21.2, 1);
    }
    expect(px(role(host, 'target').querySelector('text'), perUnit)).toBeCloseTo(
      21.2,
      1,
    );
    expect(px(host.querySelector('[data-bracket] text'), perUnit)).toBeCloseTo(
      21.2,
      1,
    );
    // In drawing units: the share of the 8.5-unit dot a 12px label has on
    // a 208px neck, so the dots and their labels grow together.
    expect(
      role(host, 'target').querySelector('text')!.getAttribute('font-size'),
    ).toBe('8.5');
  });

  it('keeps a two-character label a little smaller than one, as it grows', () => {
    const pair = (height: number) => {
      const host = render(
        <Fretboard
          window={{ min: 0, max: 5 }}
          markers={[marker(6, 3, 'target', '♭3')]}
          keyColor={KEY}
          height={height}
          variant="lesson"
        />,
      ).container;
      const size = px(
        role(host, 'target').querySelector('text'),
        height / FRETBOARD_HEIGHT_UNITS,
      );
      cleanup();
      return size;
    };
    expect(pair(208)).toBeCloseTo(10);
    expect(pair(377)).toBeCloseTo((21.2 * 10) / 12, 0);
  });

  it('leaves the book’s look alone: its labels stay in drawing units', () => {
    for (const height of [150, 377]) {
      const host = board(height);
      for (const label of host.querySelectorAll('[data-fret-label]')) {
        expect(label.getAttribute('font-size')).toBe('9');
      }
      expect(
        role(host, 'target').querySelector('text')!.getAttribute('font-size'),
      ).toBe('8');
      expect(
        host.querySelector('[data-bracket] text')!.getAttribute('font-size'),
      ).toBe('8');
      cleanup();
    }
  });
});

describe('fretboardWidthUnits', () => {
  it('adds the padding, the open-string column with the nut, and 40 a fret', () => {
    // 12 + 28 + 5 × 40 + 12: frets 1-5 after the open strings.
    expect(fretboardWidthUnits({ min: 0, max: 5 })).toBe(252);
    // 12 + 6 × 40 + 12: frets 6-11, no nut.
    expect(fretboardWidthUnits({ min: 6, max: 11 })).toBe(264);
    // The sevenths climbing the neck, frets 2-17.
    expect(fretboardWidthUnits({ min: 2, max: 17 })).toBe(664);
  });

  it('can leave the open-string column out, or put it in', () => {
    expect(fretboardWidthUnits({ min: 0, max: 5 }, false)).toBe(224);
    expect(fretboardWidthUnits({ min: 1, max: 6 }, true)).toBe(292);
  });

  it('is the width the fretboard draws', () => {
    for (const window of [
      { min: 0, max: 5 },
      { min: 6, max: 11 },
      { min: 2, max: 17 },
    ]) {
      const svg = render(
        <Fretboard window={window} markers={[]} keyColor={KEY} height={151} />,
      ).container.querySelector('svg')!;
      expect(svg.getAttribute('viewBox')).toBe(
        `0 0 ${fretboardWidthUnits(window)} ${FRETBOARD_HEIGHT_UNITS}`,
      );
      cleanup();
    }
  });
});
