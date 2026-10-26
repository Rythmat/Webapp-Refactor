// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GENRE_GROOVES } from '@/lib/learn/genreGrooves';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { GENRE_COURSES } from '../../genreCourses';
import { WheelStar } from '../WheelStar';
import { fifthsIndex, shortestAngle } from '../sigilGeometry';
import { lissajousPath, sigilFor } from '../sigilSpec';
import { ScaleSigil } from '../sigils';

describe('genre grooves', () => {
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

describe('sigilFor', () => {
  it("draws a mode on C in its key's colour, its altered notes named", () => {
    const spec = sigilFor({ mode: 'lydian' });
    expect(spec).toMatchObject({
      kind: 'scale',
      tonic: 0,
      accent: colorForKeyMode('C', 'lydian'),
      stats: '7 notes · ♯4',
      character: 'Major with a dreamy raised 4th',
    });
  });

  it("draws a Relative tile as its key's scale, a Parallel tile as seven", () => {
    const relative = sigilFor({ expandId: 'relative:fsharp' });
    expect(relative).toMatchObject({ kind: 'scale', tonic: 6 });
    const parallel = sigilFor({ expandId: 'parallel:d' });
    expect(parallel?.kind === 'scale' && parallel.layers).toHaveLength(7);
  });

  it('draws a genre as its groove and a technique as its interval', () => {
    expect(sigilFor({ expandId: 'course:latin' })).toMatchObject({
      kind: 'groove',
      character: 'Son clave 3-2',
    });
    expect(sigilFor({ ratio: [2, 3] })).toMatchObject({
      kind: 'interval',
      stats: '2:3 · fifth',
    });
    expect(sigilFor({})).toBeNull();
  });
});

describe('lissajousPath', () => {
  it('closes: the figure ends where it began', () => {
    const d = lissajousPath([2, 3], 0, 10);
    const coords = d.match(/-?\d+\.\d+,-?\d+\.\d+/g)!;
    expect(coords[coords.length - 1]).toBe(coords[0]);
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
