import { describe, expect, it } from 'vitest';
import {
  cameraRadii,
  cameraToCenterPx,
  facing,
  globeDisc,
  globeRadiusPx,
  rimOpacity,
} from './globeGeometry';

/** MapLibre's default vertical field of view. */
const FOV = 36.8699;

describe('the globe on screen', () => {
  it('sizes the globe as MapLibre does', () => {
    // 512 px world at zoom 0: radius 512 / 2π at the equator.
    expect(globeRadiusPx(0, 0)).toBeCloseTo(81.487, 2);
    expect(globeRadiusPx(2, 0)).toBeCloseTo(325.95, 1);
    expect(globeRadiusPx(2, 60)).toBeCloseTo(325.95 * 2, 1);
    // The camera at an 800 px tall view.
    expect(cameraToCenterPx(800, FOV)).toBeCloseTo(1200, 0);
  });

  it('finds the disc it fills, in the middle of the padded view', () => {
    const disc = globeDisc({
      width: 1200,
      height: 800,
      padding: { top: 0, right: 400, bottom: 0, left: 0 },
      zoom: 2,
      centerLat: 0,
      fovDeg: FOV,
    });
    expect(disc.cx).toBe(400);
    expect(disc.cy).toBe(400);
    expect(disc.r).toBeCloseTo(262.4, 0);
  });

  it('faces the viewer at the centre, and hides the far side', () => {
    const D = cameraRadii(2, 0, 800, FOV);
    const center = { lat: 0, lng: 0 };
    expect(facing(center, center, D)).toBeCloseTo(1);
    expect(facing(center, { lat: 0, lng: 180 }, D)).toBeLessThan(0);
    // Just inside the limb, still seen; just past it, not.
    const limbDeg = (Math.acos(1 / D) * 180) / Math.PI;
    expect(facing(center, { lat: 0, lng: limbDeg - 1 }, D)).toBeGreaterThan(0);
    expect(facing(center, { lat: 0, lng: limbDeg + 1 }, D)).toBeLessThan(0);
  });
});

describe('the rainbow rim', () => {
  it('shows whole round a globe that fits, and fades as it fills the view', () => {
    expect(rimOpacity(300, 1200, 800)).toBe(1);
    expect(rimOpacity(800, 1200, 800)).toBe(0);
    const mid = rimOpacity(600, 1200, 800);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
});
