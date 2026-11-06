// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { sigilColors } from '@/components/learn/sigil/sigilSpec';
import {
  allCourses,
  buildLearnCatalog,
} from '@/features/learn/catalog/learnCatalog';
import { genreReadinessFrom } from '@/features/learn/genreReadiness';
import { hueOf, keyColor, keyPair } from '../color';
import { buildCover, clearCoverCache } from '../scene';
import {
  genreSpectrumIndex,
  genreTruchetCover,
  stackedInterval,
} from '../specs';
import {
  MARGIN,
  motifBands,
  planTruchet,
  truchetGroup,
  truchetMoved,
  WING,
  type Motif,
} from '../truchet';
import { coverSignature, type CoverScene, type CoverSpec } from '../types';

const topics = buildLearnCatalog({
  enabled: () => true,
  isPremium: true,
  lessons: [],
  completedAt: {},
  genreReady: genreReadinessFrom(new Set(['pop:1:A', 'funk:1:A'])),
});
const courses = allCourses(topics);

const colorsIn = (scene: CoverScene): string[] =>
  scene.kind === 'mesh'
    ? [
        scene.base,
        ...scene.layers.flatMap((l) => l.match(/#[0-9a-f]{6}/gi) ?? []),
      ]
    : [
        scene.background,
        ...scene.gradients.flatMap((g) => g.stops.map(([, c]) => c)),
        ...scene.shapes.flatMap((s) => [s.fill, s.stroke]),
      ].filter((c): c is string => Boolean(c) && c!.startsWith('#'));

const GENRE_SLUGS = [
  'pop',
  'rock',
  'hip-hop',
  'rnb',
  'jazz',
  'blues',
  'folk',
  'funk',
  'neo-soul',
  'electronic',
  'latin',
  'reggae',
  'jam-band',
  'african',
];

describe('course covers', () => {
  it('gives every course in the catalog a cover', () => {
    expect(courses.length).toBeGreaterThan(40);
    for (const course of courses) expect(course.cover.seed).toBeTruthy();
  });

  it('builds every cover deterministically, finite and small', () => {
    for (const detail of ['card', 'hero'] as const) {
      for (const course of courses) {
        clearCoverCache();
        const first = buildCover(course.cover, detail);
        clearCoverCache();
        const again = buildCover(course.cover, detail);
        expect(again).toEqual(first);
        const text = JSON.stringify(first);
        expect(text, course.id).not.toMatch(/NaN|Infinity|undefined/);
        // A cover is a handful of merged paths, never a heavy drawing.
        // The one Continue hero on a page may carry more than a card.
        expect(first.bytes, course.id).toBeLessThanOrEqual(
          detail === 'hero' ? 24_000 : 12_000,
        );
        if (first.kind === 'svg') {
          expect(first.shapes.length, course.id).toBeLessThanOrEqual(10);
        }
      }
    }
  });

  it('never paints with the brand yellow (40–65°)', () => {
    for (const course of courses) {
      for (const color of colorsIn(buildCover(course.cover))) {
        if (color === '#ffffff' || color === '#141418') continue;
        const hue = hueOf(color);
        expect(hue < 40 || hue > 65, `${course.id} ${color} ${hue}`).toBe(true);
      }
    }
  });

  it('pairs a key with a neighbour, skipping A’s amber', () => {
    const [c, g] = keyPair('C');
    expect(c).not.toBe(g);
    const [e, down] = keyPair('E', true);
    expect(e).not.toBe(down);
    // From D the way up is A: it goes down instead.
    expect(keyPair('D')).toEqual(keyPair('D', true));
  });

  it('draws no two covers on a page alike', () => {
    for (const topic of topics) {
      const signatures = topic.sections.flatMap((s) =>
        s.courses.map((c) => coverSignature(c.cover)),
      );
      expect(new Set(signatures).size, topic.id).toBe(signatures.length);
    }
  });

  it("draws every course as Truchet tiles, in its sigil's colours (owner, 2026-11-05)", () => {
    expect(courses.every((c) => c.cover.family === 'truchet')).toBe(true);
    for (const course of courses) {
      if (!course.sigil || course.kind === 'genre') continue;
      // Technique's are white (owner, 2026-11-05).
      expect(course.cover.colors, course.id).toEqual(
        course.kind === 'technique'
          ? ['#ffffff', '#ffffff']
          : sigilColors(course.sigil),
      );
    }
  });

  it("gives a genre's course its Best Of pattern with ink and paper swapped", () => {
    const pop = courses.find((c) => c.id === 'piano/genre/pop')!.cover;
    const tile = genreTruchetCover('x', 'pop', genreSpectrumIndex('pop'));
    expect(pop.colors).toEqual(tile.colors);
    expect(pop.family === 'truchet' && pop.invert).toBe(
      !(tile.family === 'truchet' && tile.invert),
    );
  });

  it('stacks an interval into a seven-note scale', () => {
    expect(stackedInterval([2, 3])).toEqual([0, 2, 4, 6, 7, 9, 11]);
    expect(stackedInterval([4, 5])).toHaveLength(7);
    expect(stackedInterval([1, 2])).toHaveLength(7);
  });
});

describe('the Best Of genre tapestries', () => {
  const GENRES = GENRE_SLUGS;
  const covers = GENRES.map((slug, position) =>
    genreTruchetCover(`learn/best-of/${slug}`, slug, position),
  );

  it('draws every genre as Truchet tiles, small, without the brand yellow', () => {
    covers.forEach((cover, i) => {
      expect(cover.family, GENRES[i]).toBe('truchet');
      const scene = buildCover(cover);
      expect(scene.bytes, GENRES[i]).toBeLessThanOrEqual(12_000);
      for (const color of colorsIn(scene)) {
        if (color === '#ffffff' || color === '#141418') continue;
        const hue = hueOf(color);
        expect(hue < 40 || hue > 65, `${GENRES[i]} ${color} ${hue}`).toBe(true);
      }
    });
  });

  it('paints every Truchet pattern as a clear two-colour gradient', () => {
    const truchets = [
      ...covers.map((cover, i) => ({ id: GENRES[i], cover })),
      ...courses
        // Technique's are white (owner, 2026-11-05).
        .filter((c) => c.cover.family === 'truchet' && c.kind !== 'technique')
        .map((c) => ({ id: c.id, cover: c.cover })),
    ];
    expect(truchets.length).toBeGreaterThan(GENRES.length);
    const rgb = (hex: string) =>
      [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    for (const { id, cover } of truchets) {
      const [a, b] = cover.colors;
      // Two hues a good way apart, as Best of Reggae's red and green…
      const gap = Math.abs(hueOf(a) - hueOf(b)) % 360;
      expect(Math.min(gap, 360 - gap), `${id} ${a} ${b}`).toBeGreaterThan(45);
      // …and the gradient's middle (SVG mixes in sRGB) clear of the yellow.
      const mid = rgb(a).map((v, i) => Math.round((v + rgb(b)[i]) / 2));
      const hex = `#${mid.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
      const hue = hueOf(hex);
      expect(hue < 40 || hue > 65, `${id} middle ${hex} ${hue}`).toBe(true);
    }
  });

  it("places a genre by the page's Best Of row, else the library's order", () => {
    expect(GENRES.map((slug) => genreSpectrumIndex(slug))).toEqual(
      GENRES.map((_, i) => i),
    );
    expect(genreSpectrumIndex('latin', ['pop', 'latin'])).toBe(1);
    expect(genreSpectrumIndex('reggae', ['pop'])).toBe(11);
    expect(genreSpectrumIndex('polka')).toBe(0);
  });

  it('runs the row round the spectrum: Pop red, Rock vermillion, and on', () => {
    const leads = covers.map((c) => c.colors[0]);
    expect(leads[0]).toBe(keyColor('C'));
    expect(leads[1]).toBe(keyColor('G'));
    // One step round the spectrum a tile, eleven colours before it wraps.
    const hues = leads.slice(0, 11).map(hueOf);
    expect(new Set(leads.slice(0, 11)).size).toBe(11);
    const unwrapped = hues.map((h) => (h < hues[0] - 1 ? h + 360 : h));
    for (let i = 1; i < 11; i += 1) {
      expect(unwrapped[i], GENRES[i]).toBeGreaterThan(unwrapped[i - 1]);
    }
    expect(leads[11]).toBe(leads[0]);
  });

  it('draws no two genre patterns alike, colour aside (owner, 2026-11-05)', () => {
    const plans = covers.map((cover) => {
      const spec = cover as Extract<CoverSpec, { family: 'truchet' }>;
      const { cells, grid } = planTruchet(spec, 'card');
      return JSON.stringify([
        grid,
        spec.invert ?? false,
        cells.map((c) => `${c.level}${c.motif}`),
      ]);
    });
    expect(new Set(plans).size).toBe(GENRES.length);
  });

  it('gives no two neighbouring genres the same tapestry', () => {
    for (let i = 1; i < covers.length; i += 1) {
      expect(coverSignature(covers[i]), GENRES[i]).not.toBe(
        coverSignature(covers[i - 1]),
      );
    }
  });
});

describe('Carlson winged tiles', () => {
  const EDGE = 1e-9;
  const onEdge = ([u, v]: readonly [number, number]) =>
    [u, v].some((x) => Math.abs(x) < EDGE || Math.abs(x - 1) < EDGE);
  const along = ([u, v]: readonly [number, number]) =>
    Math.abs(u) < EDGE || Math.abs(u - 1) < EDGE ? v : u;

  it('lands every band on an edge between its thirds', () => {
    const motifs: Motif[] = ['\\', '/', '-', '|'];
    for (const motif of motifs) {
      for (const cmd of motifBands(motif)) {
        const point =
          'm' in cmd ? cmd.m : 'l' in cmd ? cmd.l : 'a' in cmd ? cmd.a : null;
        if (!point || !onEdge(point)) continue;
        const t = along(point);
        const ok = [0, 1, 1 / 3, 2 / 3].some((x) => Math.abs(t - x) < 1e-6);
        expect(ok, `${motif} at ${point.join(',')}`).toBe(true);
      }
    }
  });

  it('sizes the wings so corner and edge discs only touch', () => {
    expect(WING.corner).toBeCloseTo(1 / 3);
    expect(WING.edge).toBeCloseTo(1 / 6);
    // From a corner to the edge's middle: one wing, then the other.
    expect(WING.corner + WING.edge).toBeCloseTo(1 / 2);
  });

  const theory = courses.filter((c) => c.cover.family === 'truchet');

  const allTruchets = () => [
    ...theory.map((c) => ({
      id: c.id,
      spec: c.cover as Extract<typeof c.cover, { family: 'truchet' }>,
    })),
    ...GENRE_SLUGS.map((slug, i) => ({
      id: `best-of/${slug}`,
      spec: genreTruchetCover(`learn/best-of/${slug}`, slug, i) as Extract<
        CoverSpec,
        { family: 'truchet' }
      >,
    })),
  ];

  it('splits only interior cells, into half-size tiles a level up', () => {
    for (const detail of ['card', 'hero'] as const) {
      for (const { id, spec } of allTruchets()) {
        const { cells, grid, s } = planTruchet(spec, detail);
        const margin = s * MARGIN;
        for (const cell of cells.filter((c) => c.level > 0)) {
          expect(cell.s).toBeCloseTo(s / 2 ** cell.level);
          const i = Math.floor((cell.x - margin + 1e-6) / s);
          const j = Math.floor((cell.y - margin + 1e-6) / s);
          expect(i > 0 && j > 0 && i < grid - 1 && j < grid - 1, id).toBe(true);
        }
      }
    }
  });

  it('keeps every pattern symmetric, at every scale (owner, 2026-11-05)', () => {
    for (const detail of ['card', 'hero'] as const) {
      for (const { id, spec } of allTruchets()) {
        const { cells, grid, s } = planTruchet(spec, detail);
        const lo = s * MARGIN;
        // Each cell, by its corner and size, in the 100-unit box.
        const at = new Map(
          cells.map((c) => [
            `${c.x.toFixed(3)},${c.y.toFixed(3)},${c.s.toFixed(3)}`,
            c.motif,
          ]),
        );
        for (const m of truchetGroup(spec.layout)) {
          for (const cell of cells) {
            // The group's move on the cell's own grid, in box units.
            const n = grid * 2 ** cell.level;
            const i = Math.round((cell.x - lo) / cell.s);
            const j = Math.round((cell.y - lo) / cell.s);
            const [p, q] = m.at(i, j, n);
            const key = `${(lo + p * cell.s).toFixed(3)},${(lo + q * cell.s).toFixed(3)},${cell.s.toFixed(3)}`;
            expect(at.get(key), `${id} ${detail} ${key}`).toBe(
              truchetMoved(cell.motif, m),
            );
          }
        }
      }
    }
  });

  it('keeps a Theory card simple: three or four tiles across', () => {
    for (const course of theory.filter((c) => c.kind === 'theory')) {
      const spec = course.cover as Extract<
        typeof course.cover,
        { family: 'truchet' }
      >;
      expect([3, 4]).toContain(planTruchet(spec, 'card').grid);
    }
  });
});
