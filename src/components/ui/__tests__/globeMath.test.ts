import { describe, expect, it } from 'vitest';
import { locationToAngles, shortestTurn } from '../globeMath';

/** cobe's marker position (`U` in src/lib/cobe/index.js). */
const toVec = ([lat, lng]: [number, number]) => {
  const r = (lat * Math.PI) / 180;
  const a = (lng * Math.PI) / 180 - Math.PI;
  const o = Math.cos(r);
  return [-o * Math.cos(a), Math.sin(r), o * Math.sin(a)] as const;
};

/** cobe's view rotation (its marker vertex shader), phi then theta. */
const project = (p: readonly number[], phi: number, theta: number) => {
  const c = Math.cos(theta);
  const d = Math.sin(theta);
  const e = Math.cos(phi);
  const f = Math.sin(phi);
  return [
    e * p[0] + f * p[2],
    f * d * p[0] + c * p[1] - e * d * p[2],
    -f * c * p[0] + d * p[1] + e * c * p[2],
  ];
};

describe('locationToAngles', () => {
  it('turns a place to the center of the globe, facing the viewer', () => {
    const places: [number, number][] = [
      [42.33, -83.05], // Detroit
      [51.5074, -0.1278], // London
      [-33.87, 151.21], // Sydney
      [10, 179.9], // near the date line
    ];
    for (const place of places) {
      const [phi, theta] = locationToAngles(...place);
      const [x, y, z] = project(toVec(place), phi, theta);
      expect(x).toBeCloseTo(0, 6);
      expect(y).toBeCloseTo(0, 6);
      expect(z).toBeCloseTo(1, 6);
    }
  });

  it('gives Detroit its angles', () => {
    const [phi, theta] = locationToAngles(42.33, -83.05);
    expect(phi).toBeCloseTo(6.1619, 3);
    expect(theta).toBeCloseTo(0.7388, 3);
  });
});

describe('shortestTurn', () => {
  it('turns the short way round, in (−π, π]', () => {
    expect(shortestTurn(0, (3 * Math.PI) / 2)).toBeCloseTo(-Math.PI / 2);
    expect(shortestTurn(0, Math.PI)).toBeCloseTo(Math.PI);
    expect(shortestTurn(10 * Math.PI + 0.1, 0)).toBeCloseTo(-0.1);
    expect(shortestTurn(-0.2, 0.2)).toBeCloseTo(0.4);
  });
});
