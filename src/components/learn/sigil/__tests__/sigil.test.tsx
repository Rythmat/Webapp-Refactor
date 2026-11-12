// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  allCourses,
  buildLearnCatalog,
} from '@/features/learn/catalog/learnCatalog';
import { genreReadinessFrom } from '@/features/learn/genreReadiness';
import { genreSpectrumIndex, genreTruchetCover } from '@/lib/cover';
import { hueOf, truchetPair } from '@/lib/cover/color';
import { GENRE_GROOVES } from '@/lib/learn/genreGrooves';
import { GENRE_INTERVALS } from '@/lib/learn/genreIntervals';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { GENRE_COURSES } from '../../genreCourses';
import { SigilCard } from '../SigilCard';
import { WheelStar } from '../WheelStar';
import { fifthsIndex, shortestAngle } from '../sigilGeometry';
import {
  lissajousPath,
  rotaryPath,
  sigilColors,
  sigilFor,
  type SigilSpec,
} from '../sigilSpec';
import { ScaleSigil } from '../sigils';

describe('genre grooves (kept for the Drum lessons)', () => {
  it('has a groove for every genre course, its hits inside the bar', () => {
    for (const course of GENRE_COURSES) {
      const groove = GENRE_GROOVES[course.slug];
      expect(groove, course.slug).toBeDefined();
      for (const hit of groove.hits) {
        expect(hit).toBeGreaterThanOrEqual(0);
        expect(hit).toBeLessThan(groove.steps);
      }
    }
  });
});

describe('genre intervals', () => {
  it('has an interval for every genre course, no two the same', () => {
    const seen = new Set<string>();
    for (const course of GENRE_COURSES) {
      const interval = GENRE_INTERVALS[course.slug];
      expect(interval, course.slug).toBeDefined();
      const [a, b] = interval.ratio;
      // Whole, the higher voice first, in lowest terms: the figure closes.
      expect(Number.isInteger(a) && Number.isInteger(b)).toBe(true);
      expect(a).toBeGreaterThan(b);
      const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);
      expect(gcd(a, b), course.slug).toBe(1);
      expect(seen.has(`${a}:${b}`), course.slug).toBe(false);
      seen.add(`${a}:${b}`);
    }
  });
});

describe('sigilFor', () => {
  it("draws a mode on C in its key's colour, its altered notes named", () => {
    const spec = sigilFor({ mode: 'lydian' });
    expect(spec).toMatchObject({
      kind: 'scale',
      tonic: 0,
      accent: colorForKeyMode('C', 'lydian'),
      stats: '7 notes · ♯4',
      degrees: expect.arrayContaining([
        { pc: 6, label: '♯4' },
        { pc: 0, label: '1' },
      ]),
      character: 'Major with a dreamy raised 4th',
    });
  });

  it("draws a Relative tile as its key's scale, a Parallel tile as seven", () => {
    const relative = sigilFor({ expandId: 'relative:fsharp' });
    expect(relative).toMatchObject({ kind: 'scale', tonic: 6 });
    const parallel = sigilFor({ expandId: 'parallel:d' });
    expect(parallel?.kind === 'scale' && parallel.layers).toHaveLength(7);
  });

  it('draws a genre as its signature interval turning and a technique as its interval swinging', () => {
    expect(sigilFor({ expandId: 'course:rock' })).toMatchObject({
      kind: 'rotary',
      ratio: [3, 2],
      stats: '3:2 · fifth',
      character: 'The fifth of a power chord',
    });
    expect(sigilFor({ ratio: [2, 3] })).toMatchObject({
      kind: 'interval',
      stats: '2:3 · fifth',
    });
    expect(sigilFor({})).toBeNull();
  });
});

describe("sigilColors: the Truchet covers' two colours, from the music", () => {
  it("gives an interval its upper note's pair above C: a fifth G's", () => {
    expect(sigilColors(sigilFor({ ratio: [2, 3] })!)).toEqual(truchetPair('G'));
    expect(sigilColors(sigilFor({ ratio: [3, 4] })!)).toEqual(truchetPair('F'));
  });

  it("gives a genre's course its Best Of tile's colours, by its place in the row", () => {
    const row = ['pop', 'rock', 'funk', 'latin', 'reggae'];
    for (const course of GENRE_COURSES) {
      const spec = sigilFor({ expandId: course.expandId });
      if (!spec) continue;
      const tile = genreTruchetCover(
        'x',
        course.slug,
        genreSpectrumIndex(course.slug, row),
      );
      expect(sigilColors(spec, row), course.slug).toEqual(tile.colors);
    }
    const latin = sigilFor({ expandId: 'course:latin' })!;
    expect(sigilColors(latin, row)).toEqual(
      genreTruchetCover('x', 'latin', 3).colors,
    );
  });

  it('keeps a mode its own colour, and never paints the brand yellow', () => {
    const lydian = sigilFor({ mode: 'lydian' })!;
    expect(sigilColors(lydian)[0]).toBe(colorForKeyMode('C', 'lydian'));
    const catalog = buildLearnCatalog({
      enabled: () => true,
      isPremium: true,
      lessons: [],
      completedAt: {},
      genreReady: genreReadinessFrom(new Set()),
    });
    const specs = allCourses(catalog)
      .map((c) => c.sigil)
      .filter((s): s is SigilSpec => Boolean(s));
    expect(specs.length).toBeGreaterThan(20);
    for (const spec of specs) {
      for (const color of sigilColors(spec)) {
        const hue = hueOf(color);
        expect(hue < 40 || hue > 65, `${spec.kind} ${color}`).toBe(true);
      }
    }
  });
});

describe('SigilCard', () => {
  it("draws its figure in the covers' gradient, in bold lines", () => {
    const { container } = render(
      <SigilCard spec={sigilFor({ mode: 'dorian' })!} label="Dorian" />,
    );
    const svg = container.querySelector('svg.sigil')!;
    expect(svg.classList.contains('sigil--lines')).toBe(true);
    const stops = [...svg.querySelectorAll('linearGradient stop')];
    expect(stops.map((s) => s.getAttribute('stop-color'))).toEqual(
      sigilColors(sigilFor({ mode: 'dorian' })!),
    );
  });
});

describe('lissajousPath', () => {
  it('closes: the figure ends where it began', () => {
    const d = lissajousPath([2, 3], 0, 10);
    const coords = d.match(/-?\d+\.\d+,-?\d+\.\d+/g)!;
    expect(coords[coords.length - 1]).toBe(coords[0]);
  });
});

describe('rotaryPath', () => {
  it('closes, starts at the top, and stays inside its reach', () => {
    const d = rotaryPath([7, 4], 20);
    const coords = d.match(/-?\d+(\.\d+)?,-?\d+(\.\d+)?/g)!;
    expect(coords[0]).toBe('0.00,-20.00');
    expect(coords[coords.length - 1]).toBe(coords[0]);
    for (const c of coords) {
      const [x, y] = c.split(',').map(Number);
      expect(Math.hypot(x, y)).toBeLessThanOrEqual(20.01);
    }
  });
});

describe('ScaleSigil', () => {
  it('marks twelve positions, a node per note, the accent on what is altered', () => {
    const { container } = render(
      <ScaleSigil
        pcs={[0, 2, 4, 6, 7, 9, 11]}
        tonic={0}
        stars={[[0, 4, 7, 11, 2, 6, 9]]}
        altered={[{ pc: 6, label: '♯4' }]}
        accent="#ff0000"
        label="Lydian"
      />,
    );
    expect(container.querySelectorAll('.sigil-tick')).toHaveLength(12);
    expect(container.querySelectorAll('.sigil-node')).toHaveLength(7);
    expect(container.querySelectorAll('.sigil-node--accent')).toHaveLength(1);
    expect(container.textContent).toContain('♯4');
  });

  it('names every degree round the star when given them, the altered in the accent', () => {
    const { container } = render(
      <ScaleSigil
        pcs={[0, 2, 4, 6, 7, 9, 11]}
        tonic={0}
        stars={[[0, 4, 7, 11, 2, 6, 9]]}
        altered={[{ pc: 6, label: '♯4' }]}
        degrees={[0, 2, 4, 6, 7, 9, 11].map((pc, i) => ({
          pc,
          label: ['1', '2', '3', '♯4', '5', '6', '7'][i],
        }))}
        accent="#ff0000"
        label="Lydian"
      />,
    );
    const names = [...container.querySelectorAll('.sigil-label')];
    expect(names.map((n) => n.textContent)).toEqual([
      '1',
      '2',
      '3',
      '♯4',
      '5',
      '6',
      '7',
    ]);
    expect(
      names.filter((n) => !n.classList.contains('sigil-label--plain')),
    ).toHaveLength(1);
  });
});

describe('the two circles', () => {
  it('places a note round the fifths a fifth a step', () => {
    // C, G, D, F, F♯.
    expect([0, 7, 2, 5, 6].map(fifthsIndex)).toEqual([0, 1, 2, 11, 6]);
  });

  it('turns the short way round, never more than half', () => {
    expect(shortestAngle(330, 30)).toBe(60);
    expect(shortestAngle(30, 330)).toBe(-60);
    for (let from = 0; from < 360; from += 45) {
      for (let to = 0; to < 360; to += 45) {
        expect(Math.abs(shortestAngle(from, to))).toBeLessThanOrEqual(180);
      }
    }
  });
});

describe('WheelStar', () => {
  const major = [0, 2, 4, 5, 7, 9, 11];
  const angles = (container: HTMLElement) =>
    [...container.querySelectorAll('[data-degree]')].map((n) =>
      Number(n.getAttribute('data-angle')),
    );
  const star = (order: 'fifths' | 'chromatic', tonic = 0) => (
    <WheelStar
      pcs={major}
      tonic={tonic}
      stars={[[0, 4, 7, 11, 2, 5, 9]]}
      marked={[0]}
      order={order}
      accent="#ff0000"
      label="Ionian"
    />
  );

  it('puts each note under its wedge in fifths: a run of seven', () => {
    const { container } = render(star('fifths'));
    // C D E F G A B → 0, 60, 120, 330, 30, 90, 150: F through B, together.
    expect(angles(container)).toEqual([0, 60, 120, 330, 30, 90, 150]);
  });

  it('puts them a semitone a step in chromatic order', () => {
    const { container } = render(star('chromatic'));
    expect(angles(container)).toEqual([0, 60, 120, 150, 210, 270, 330]);
  });

  it('keeps the anchor on its fifths spot in chromatic order', () => {
    const { container } = render(
      <WheelStar
        pcs={major}
        tonic={2}
        stars={[[0, 4, 7, 11, 2, 5, 9]]}
        marked={[0]}
        order="chromatic"
        anchor={2}
        accent="#ff0000"
        label="D Ionian"
      />,
    );
    // D at 60°, as in fifths; E two semitones on, at 120°.
    expect(angles(container).slice(0, 2)).toEqual([60, 120]);
  });

  it('moves the tonic to the key chosen', () => {
    const { container } = render(star('fifths', 7));
    expect(angles(container)[0]).toBe(30);
  });
});
