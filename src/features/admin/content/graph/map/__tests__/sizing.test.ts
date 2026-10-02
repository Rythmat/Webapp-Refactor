import { describe, expect, it } from 'vitest';
import {
  arrowAlpha,
  arrowDeviceLength,
  baseNodeRadius,
  CONFIDENCE_MIN_SCREEN_PX,
  deviceScale,
  HOVER_LABEL_SHIFT_PX,
  LABEL_WRAP_PX,
  labelAlpha,
  labelFontSize,
  labelScreenOffset,
  labelScale,
  labelScreenSize,
  lineWorldWidth,
  LOCAL_FOCUS_WEIGHT,
  LOCAL_NODE_WEIGHT,
  NODE_RADIUS_MAX,
  NODE_RADIUS_MIN,
  nodeRadii,
  nodeRadius,
  nodeScale,
  pixelRatio,
  ringDeviceWidth,
  screenRadius,
  showsConfidence,
} from '../model/sizing';

/**
 * Obsidian's sizes: 3·√(weight + 1) held to 8–30 with the node size slider
 * outside the clamp, √zoom on screen, labels 14 + r/4 fading with
 * log2(zoom), arrows between zoom 0.3 and 0.8.
 */

describe('node radius', () => {
  it('is 3·√(weight + 1), held between 8 and 30', () => {
    expect([NODE_RADIUS_MIN, NODE_RADIUS_MAX]).toEqual([8, 30]);
    expect(baseNodeRadius(0)).toBe(8);
    // 3·√7 ≈ 7.94 is still under the floor; 3·√8 ≈ 8.49 is not.
    expect(baseNodeRadius(6)).toBe(8);
    expect(baseNodeRadius(7)).toBeCloseTo(3 * Math.sqrt(8), 10);
    expect(baseNodeRadius(24)).toBe(15);
    expect(baseNodeRadius(99)).toBe(30);
    expect(baseNodeRadius(5000)).toBe(30);
  });

  it('treats a weight that is not a count as none', () => {
    expect(baseNodeRadius(Number.NaN)).toBe(8);
    expect(baseNodeRadius(-4)).toBe(8);
  });

  it('applies the node size slider after the clamp, as Obsidian does', () => {
    expect(nodeRadius(24)).toBe(15);
    expect(nodeRadius(24, 2)).toBe(30);
    expect(nodeRadius(5000, 2)).toBe(60);
    expect(nodeRadius(0, 0.5)).toBe(4);
  });

  it('sizes a global graph by weight', () => {
    const radii = nodeRadii({
      count: 3,
      weights: new Uint32Array([0, 24, 400]),
      focus: -1,
    });
    expect([...radii]).toEqual([8, 15, 30]);
  });

  it('sizes a local graph by place: the focus at the cap, the rest at the floor', () => {
    expect(baseNodeRadius(LOCAL_FOCUS_WEIGHT)).toBe(NODE_RADIUS_MAX);
    expect(baseNodeRadius(LOCAL_NODE_WEIGHT)).toBe(NODE_RADIUS_MIN);
    const radii = nodeRadii({
      count: 4,
      weights: new Uint32Array([3, 200, 0, 50]),
      focus: 2,
    });
    expect([...radii]).toEqual([8, 8, 30, 8]);
  });
});

describe('zoom scaling', () => {
  it('draws a dot at its radius times √zoom', () => {
    expect(screenRadius(10, 4)).toBe(20);
    expect(screenRadius(10, 0.25)).toBe(5);
    expect(screenRadius(10, 1)).toBe(10);
    // In world units the dot shrinks by 1/√zoom, so on screen it is r·√zoom.
    expect(10 * nodeScale(4) * 4).toBeCloseTo(screenRadius(10, 4), 12);
  });

  it('keeps lines one width on screen', () => {
    for (const zoom of [1 / 128, 0.5, 1, 3, 8]) {
      expect(lineWorldWidth(1.5, zoom) * zoom).toBeCloseTo(1.5, 12);
    }
  });
});

describe('labels', () => {
  it('sets type at 14 + radius/4, wrapped at 300', () => {
    expect(labelFontSize(8)).toBe(16);
    expect(labelFontSize(30)).toBe(21.5);
    expect(LABEL_WRAP_PX).toBe(300);
  });

  it('scales with √zoom, except a hovered label zoomed out', () => {
    expect(labelScreenSize(8, 4)).toBe(32);
    expect(labelScreenSize(8, 0.25)).toBe(8);
    expect(labelScreenSize(8, 0.25, true)).toBe(16);
    expect(labelScreenSize(8, 4, true)).toBe(32);
  });

  it('sits under its dot, the hovered one 15 pixels lower', () => {
    expect(labelScreenOffset(10, 1)).toBe(15);
    expect(labelScreenOffset(10, 4)).toBe(30);
    expect(labelScreenOffset(10, 1, true)).toBe(15 + HOVER_LABEL_SHIFT_PX);
  });

  it('fades with the zoom: clamp(log2 zoom + 1 − text fade, 0, 1)', () => {
    expect(labelAlpha(1)).toBe(1);
    expect(labelAlpha(0.5)).toBe(0);
    expect(labelAlpha(Math.SQRT1_2)).toBeCloseTo(0.5, 12);
    expect(labelAlpha(8)).toBe(1);
    expect(labelAlpha(1 / 128)).toBe(0);
    // The text fade slider moves the curve: higher hides labels for longer.
    expect(labelAlpha(2, 2)).toBe(0);
    expect(labelAlpha(4, 2)).toBe(1);
    expect(labelAlpha(0.5, -1)).toBe(1);
    expect(labelAlpha(0.25, -1)).toBe(0);
    expect(labelAlpha(0)).toBe(0);
    expect(labelAlpha(Number.NaN)).toBe(0);
  });
});

describe("Obsidian's device pixels, on a Retina screen", () => {
  /*
   * Obsidian sizes everything in device pixels from its scale (device pixels
   * per world unit). The camera's zoom is CSS pixels per world unit, so at
   * a pixel ratio of 2 Obsidian's scale is twice the zoom. These pin what
   * the owner's Retina Mac shows at the spike's fit zoom of 0.054, which is
   * Obsidian's scale 0.108.
   */
  const ZOOM = 0.054;

  it('works out the scale from the zoom and the pixel ratio', () => {
    expect(deviceScale(ZOOM, 2)).toBeCloseTo(0.108, 12);
    expect(deviceScale(ZOOM)).toBe(ZOOM);
    // Ratios are held to ½…2, and a missing one is 1.
    expect([pixelRatio(3), pixelRatio(0), pixelRatio(Number.NaN)]).toEqual([
      2, 1, 1,
    ]);
    expect(pixelRatio(0.25)).toBe(0.5);
  });

  it('draws a weight-0 dot 5.3 device pixels across, as Obsidian does', () => {
    const cssRadius = screenRadius(8, ZOOM, 2);
    expect(2 * cssRadius * 2).toBeCloseTo(2 * 8 * Math.sqrt(0.108), 9);
    expect(2 * cssRadius * 2).toBeCloseTo(5.26, 2);
    // World units: the radius times nodeScale, shown at the zoom.
    expect(8 * nodeScale(ZOOM, 2) * ZOOM).toBeCloseTo(cssRadius, 12);
  });

  it('keeps a line one device pixel wide: half a CSS pixel', () => {
    for (const zoom of [1 / 256, 0.054, 1, 4]) {
      const world = lineWorldWidth(1, zoom, 2);
      expect(world * zoom * 2).toBeCloseTo(1, 12);
    }
  });

  it('fades labels and arrows in at the same scale as Obsidian', () => {
    // Labels are solid from Obsidian's scale 1: a CSS zoom of ½ on Retina.
    expect(labelAlpha(0.5, 0, 2)).toBe(1);
    expect(labelAlpha(0.25, 0, 2)).toBe(0);
    // Arrows run from scale 0.3 to 0.8: CSS zoom 0.15 to 0.4 on Retina.
    expect(arrowAlpha(0.15, 2)).toBeCloseTo(0, 12);
    expect(arrowAlpha(0.275, 2)).toBeCloseTo(0.5, 12);
    expect(arrowAlpha(0.4, 2)).toBeCloseTo(1, 12);
  });

  it('sets label type in device pixels too', () => {
    // At scale 4 (CSS zoom 2), type of 16 is 32 device pixels: 16 CSS.
    expect(labelScale(2, 2)).toBeCloseTo(1, 12);
    expect(labelScreenSize(8, 2, false, 2)).toBeCloseTo(16, 12);
    // The hovered label zoomed out keeps its scale-1 size: 16 device pixels.
    expect(labelScreenSize(8, ZOOM, true, 2)).toBe(8);
    // Its offset: (radius + 5)·√scale device pixels, and 15 more when hovered.
    expect(labelScreenOffset(10, 2, false, 2)).toBeCloseTo(15, 12);
    expect(labelScreenOffset(10, 2, true, 2)).toBeCloseTo(22.5, 12);
  });

  it("draws arrows as Obsidian's dart, 8 device pixels long", () => {
    expect(arrowDeviceLength(1)).toBe(8);
    expect(arrowDeviceLength(4)).toBe(16);
  });
});

describe('arrows and line styles', () => {
  it('fades arrows in between zoom 0.3 and 0.8', () => {
    expect(arrowAlpha(0.1)).toBe(0);
    expect(arrowAlpha(0.3)).toBe(0);
    expect(arrowAlpha(0.55)).toBeCloseTo(0.5, 12);
    expect(arrowAlpha(0.8)).toBeCloseTo(1, 12);
    expect(arrowAlpha(2)).toBe(1);
  });

  it('draws dots and dashes only on lines at least 16 pixels long', () => {
    expect(CONFIDENCE_MIN_SCREEN_PX).toBe(16);
    expect(showsConfidence(15.9)).toBe(false);
    expect(showsConfidence(16)).toBe(true);
  });
});

describe('the highlight ring', () => {
  it('is Obsidian’s √scale hairline, held between one and two CSS pixels', () => {
    // Retina: one CSS pixel is two device pixels.
    expect(ringDeviceWidth(0.05, 2)).toBe(2);
    expect(ringDeviceWidth(1, 2)).toBe(2);
    // Scale 8 (the closest zoom): √8 ≈ 2.83 device pixels.
    expect(ringDeviceWidth(4, 2)).toBeCloseTo(Math.sqrt(8), 10);
    // A screen with a ratio of 1: between 1 and 2 pixels.
    expect(ringDeviceWidth(0.5, 1)).toBe(1);
    expect(ringDeviceWidth(2.25, 1)).toBe(1.5);
    expect(ringDeviceWidth(8, 1)).toBe(2);
    expect(ringDeviceWidth(Number.NaN, 1)).toBe(1);
  });
});
