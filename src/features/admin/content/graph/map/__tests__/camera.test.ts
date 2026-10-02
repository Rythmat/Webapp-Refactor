import { describe, expect, it } from 'vitest';
import {
  boundsOf,
  type Camera,
  clampZoom,
  fitToBounds,
  flingVelocity,
  FRAME_MS,
  HOME_CAMERA,
  KEY_PAN_PX,
  keyPan,
  momentumStep,
  panBy,
  type PanVelocity,
  screenToWorld,
  type Viewport,
  wheelPixels,
  wheelZoom,
  wheelZoomFactor,
  worldToScreen,
  ZOOM_MAX,
  ZOOM_MIN,
  zoomAround,
  zoomAt,
  zoomBy,
} from '../model/camera';

/**
 * The camera follows Obsidian: zoom 1/128 to 8, 1.5 per wheel click, in
 * about the cursor and out about the middle, arrow keys 40 pixels (120 with
 * Shift), a fling that coasts, and Fit.
 */

const VIEW: Viewport = { width: 800, height: 600 };
const CAMERA: Camera = { x: 100, y: -50, zoom: 2 };

const close = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  expect(a.x).toBeCloseTo(b.x, 9);
  expect(a.y).toBeCloseTo(b.y, 9);
};

describe('screen and world', () => {
  it('puts the camera point at the middle of the canvas', () => {
    expect(worldToScreen(CAMERA, VIEW, { x: 100, y: -50 })).toEqual({
      x: 400,
      y: 300,
    });
    expect(worldToScreen(CAMERA, VIEW, { x: 110, y: -50 })).toEqual({
      x: 420,
      y: 300,
    });
  });

  it('goes there and back', () => {
    for (const point of [
      { x: 0, y: 0 },
      { x: 13.5, y: 799 },
      { x: -250, y: 41 },
    ]) {
      close(
        worldToScreen(CAMERA, VIEW, screenToWorld(CAMERA, VIEW, point)),
        point,
      );
    }
  });
});

describe('wheel zoom', () => {
  it('turns lines and pages into pixels as Obsidian does', () => {
    expect(wheelPixels(100)).toBe(100);
    expect(wheelPixels(100, 0)).toBe(100);
    expect(wheelPixels(3, 1)).toBe(120);
    expect(wheelPixels(1, 2)).toBe(800);
    expect(wheelPixels(Number.NaN)).toBe(0);
  });

  it('zooms 1.5^(−Δ/120): one click is 1.5', () => {
    expect(wheelZoomFactor(-120)).toBeCloseTo(1.5, 12);
    expect(wheelZoomFactor(120)).toBeCloseTo(1 / 1.5, 12);
    expect(wheelZoomFactor(-360)).toBeCloseTo(1.5 ** 3, 12);
    expect(wheelZoomFactor(0)).toBe(1);
    expect(wheelZoomFactor(-60)).toBeCloseTo(Math.sqrt(1.5), 12);
  });

  it('keeps the point under the cursor when zooming in', () => {
    const cursor = { x: 610, y: 120 };
    const before = screenToWorld(CAMERA, VIEW, cursor);
    const after = wheelZoom(CAMERA, VIEW, { deltaY: -120, ...cursor });
    expect(after.zoom).toBeCloseTo(3, 12);
    close(screenToWorld(after, VIEW, cursor), before);
    // Lines mode reads the same click the same way.
    const lines = wheelZoom(CAMERA, VIEW, {
      deltaY: -3,
      deltaMode: 1,
      ...cursor,
    });
    expect(lines).toEqual(after);
  });

  it('zooms out about the middle of the view, as Obsidian does', () => {
    const after = wheelZoom(CAMERA, VIEW, { deltaY: 120, x: 610, y: 120 });
    expect(after.zoom).toBeCloseTo(2 / 1.5, 12);
    expect([after.x, after.y]).toEqual([CAMERA.x, CAMERA.y]);
    // Without a cursor, zooming in is about the middle too.
    expect(zoomAt(CAMERA, VIEW, 1.5)).toEqual({ ...CAMERA, zoom: 3 });
  });

  it('three clicks in zoom by 1.5³', () => {
    let camera: Camera = HOME_CAMERA;
    for (let i = 0; i < 3; i++) {
      camera = wheelZoom(camera, VIEW, { deltaY: -120, x: 200, y: 200 });
    }
    expect(camera.zoom).toBeCloseTo(3.375, 12);
  });

  it('stays between 1/128 and 8', () => {
    expect([ZOOM_MIN, ZOOM_MAX]).toEqual([1 / 128, 8]);
    const top = { x: 5, y: 5, zoom: ZOOM_MAX };
    expect(wheelZoom(top, VIEW, { deltaY: -1200, x: 10, y: 10 })).toBe(top);
    const bottom = { x: 5, y: 5, zoom: ZOOM_MIN };
    expect(wheelZoom(bottom, VIEW, { deltaY: 1200, x: 10, y: 10 })).toBe(
      bottom,
    );
    // A big step stops at the edge, still about the cursor.
    const cursor = { x: 700, y: 500 };
    const near = { x: 0, y: 0, zoom: 6 };
    const capped = wheelZoom(near, VIEW, { deltaY: -600, ...cursor });
    expect(capped.zoom).toBe(ZOOM_MAX);
    close(
      screenToWorld(capped, VIEW, cursor),
      screenToWorld(near, VIEW, cursor),
    );
    expect(zoomBy({ x: 0, y: 0, zoom: 0.01 }, 0.001).zoom).toBe(ZOOM_MIN);
  });

  it('pinches about the pinch, both ways', () => {
    const mid = { x: 300, y: 450 };
    for (const factor of [0.5, 2]) {
      const after = zoomAround(CAMERA, VIEW, factor, mid);
      close(screenToWorld(after, VIEW, mid), screenToWorld(CAMERA, VIEW, mid));
    }
  });

  it('clamps any zoom it is handed', () => {
    expect(clampZoom(100)).toBe(8);
    expect(clampZoom(0)).toBe(ZOOM_MIN);
    expect(clampZoom(-2)).toBe(ZOOM_MIN);
    expect(clampZoom(Infinity)).toBe(8);
    expect(clampZoom(Number.NaN)).toBe(1);
    expect(clampZoom(0.3)).toBe(0.3);
  });

  it("keeps Obsidian's device-pixel range on a Retina screen", () => {
    // Obsidian's scale is device pixels per world unit, so at a pixel
    // ratio of 2 the camera's CSS zoom stops at half of each end.
    expect(clampZoom(100, 2)).toBe(4);
    expect(clampZoom(0, 2)).toBe(1 / 256);
    // Ratios above 2 are drawn at 2.
    expect(clampZoom(100, 3)).toBe(4);
    const retina = { ...VIEW, dpr: 2 };
    const near = { x: 0, y: 0, zoom: 3 };
    const capped = wheelZoom(near, retina, { deltaY: -600, x: 10, y: 10 });
    expect(capped.zoom).toBe(4);
    expect(zoomBy({ x: 0, y: 0, zoom: 0.01 }, 0.001, 2).zoom).toBe(1 / 256);
    const small = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
    expect(fitToBounds(small, retina, { maxZoom: 50 }).zoom).toBe(4);
    const huge = { minX: -1e9, minY: -1e9, maxX: 1e9, maxY: 1e9 };
    expect(fitToBounds(huge, retina).zoom).toBe(1 / 256);
  });
});

describe('panning', () => {
  it('moves the graph with the pointer', () => {
    const point = { x: 30, y: 40 };
    const before = worldToScreen(CAMERA, VIEW, point);
    const after = worldToScreen(panBy(CAMERA, 10, -6), VIEW, point);
    close(after, { x: before.x + 10, y: before.y - 6 });
  });

  it('moves the view 40 pixels per arrow key, 120 with Shift', () => {
    expect(KEY_PAN_PX).toBe(40);
    const shift = (camera: Camera) => {
      const s = worldToScreen(CAMERA, VIEW, { x: camera.x, y: camera.y });
      return { x: s.x - VIEW.width / 2, y: s.y - VIEW.height / 2 };
    };
    // Right shows more of the right: the view's middle moves right.
    close(shift(keyPan(CAMERA, 'ArrowRight') as Camera), { x: 40, y: 0 });
    close(shift(keyPan(CAMERA, 'ArrowLeft') as Camera), { x: -40, y: 0 });
    close(shift(keyPan(CAMERA, 'ArrowUp') as Camera), { x: 0, y: -40 });
    close(shift(keyPan(CAMERA, 'ArrowDown', true) as Camera), { x: 0, y: 120 });
    expect(keyPan(CAMERA, 'a')).toBeNull();
    expect(keyPan(CAMERA, 'ArrowRight')?.zoom).toBe(CAMERA.zoom);
  });

  it('measures a fling over the last 100 milliseconds', () => {
    expect(flingVelocity([])).toBeNull();
    expect(flingVelocity([{ x: 0, y: 0, t: 5 }])).toBeNull();
    expect(
      flingVelocity([
        { x: 0, y: 0, t: 0 },
        { x: 500, y: 0, t: 10 },
        { x: 600, y: 50, t: 150 },
        { x: 700, y: 100, t: 200 },
      ]),
    ).toEqual({ vx: 2, vy: 1 });
    // Points held still at the same moment carry no speed.
    expect(
      flingVelocity([
        { x: 1, y: 1, t: 50 },
        { x: 9, y: 9, t: 50 },
      ]),
    ).toBeNull();
  });

  it('coasts, losing a tenth of its speed a frame, then stops', () => {
    const v: PanVelocity = { vx: 1, vy: -0.5 };
    const step = momentumStep(CAMERA, v);
    expect(step.camera.x).toBeCloseTo(
      CAMERA.x - (1 * FRAME_MS) / CAMERA.zoom,
      9,
    );
    expect(step.camera.y).toBeCloseTo(
      CAMERA.y + (0.5 * FRAME_MS) / CAMERA.zoom,
      9,
    );
    expect(step.velocity?.vx).toBeCloseTo(0.9, 12);
    expect(step.velocity?.vy).toBeCloseTo(-0.45, 12);
    // Two frames' time loses two frames' speed.
    expect(momentumStep(CAMERA, v, 2 * FRAME_MS).velocity?.vx).toBeCloseTo(
      0.81,
      12,
    );
    let state: { camera: Camera; velocity: PanVelocity | null } = {
      camera: CAMERA,
      velocity: v,
    };
    let frames = 0;
    while (state.velocity && frames < 1000) {
      state = momentumStep(state.camera, state.velocity);
      frames++;
    }
    expect(state.velocity).toBeNull();
    // Speed 1.12 → under 0.01 takes about 45 frames at 0.9 a frame.
    expect(frames).toBeGreaterThan(30);
    expect(frames).toBeLessThan(60);
  });
});

describe('fit', () => {
  it('finds the box round the placed points', () => {
    expect(
      boundsOf(new Float32Array([0, 0, 10, -5, Number.NaN, 99, -20, 40])),
    ).toEqual({ minX: -20, minY: -5, maxX: 10, maxY: 40 });
    expect(boundsOf([Number.NaN, Number.NaN])).toBeNull();
    expect(boundsOf([])).toBeNull();
    // Only the first `count` points.
    expect(boundsOf([0, 0, 50, 50, 900, 900], 2)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 50,
      maxY: 50,
    });
  });

  it('frames the box with a 40 pixel margin', () => {
    const camera = fitToBounds(
      { minX: -1000, minY: -500, maxX: 3000, maxY: 1500 },
      VIEW,
    );
    expect([camera.x, camera.y]).toEqual([1000, 500]);
    // (800 − 80) / 4000 = 0.18 across; (600 − 80) / 2000 = 0.26 down.
    expect(camera.zoom).toBeCloseTo(0.18, 12);
    const corner = worldToScreen(camera, VIEW, { x: -1000, y: 500 });
    expect(corner.x).toBeCloseTo(40, 9);
  });

  it('never zooms in past 1, or past what it is asked', () => {
    const small = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
    expect(fitToBounds(small, VIEW).zoom).toBe(1);
    expect(fitToBounds(small, VIEW, { maxZoom: 4 }).zoom).toBe(4);
    expect(fitToBounds(small, VIEW, { maxZoom: 50 }).zoom).toBe(ZOOM_MAX);
    // A single point is shown at the cap.
    const point = { minX: 7, minY: 7, maxX: 7, maxY: 7 };
    expect(fitToBounds(point, VIEW)).toEqual({ x: 7, y: 7, zoom: 1 });
  });

  it('never zooms out past 1/128', () => {
    const huge = { minX: -1e9, minY: -1e9, maxX: 1e9, maxY: 1e9 };
    expect(fitToBounds(huge, VIEW).zoom).toBe(ZOOM_MIN);
  });
});
