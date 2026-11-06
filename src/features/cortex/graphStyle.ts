import { KEY_CENTRE_RAINBOW } from '@/daw/prism-engine/data/keyColour';

/**
 * The console Cortex's look, on the student's map (owner, 2026-11-04: "look
 * like the Cortex used in the admin console"): Obsidian's dark graph, with
 * hairline lines flowing through the key centres' rainbow, flat white dots
 * sized by their links (a key's colour where they have one), light grey
 * names under them, and white for whatever is lit.
 *
 * The values are the console's own, from
 * `features/admin/content/graph/map/render/graphTheme.ts` and its sizing rules
 * in `model/sizing.ts`. They are copied, not imported, so the console's chunk
 * never loads with a student's page: change them in both places.
 *
 * Obsidian works in device pixels, at a scale of device pixels per world unit
 * (the zoom times the pixel ratio). These helpers take the zoom and the ratio
 * and give CSS pixels, which is what the map draws in. Pure.
 */

export const GRAPH_LOOK = Object.freeze({
  /** The lines' colours, round the circle of fifths from C. */
  rainbow: KEY_CENTRE_RAINBOW,
  /** How strongly a line shows. */
  rainbowAlpha: 0.55,
  /** World units for the rainbow to go once round: smaller than the console's,
   *  as a student's web is. */
  rainbowPeriod: 700,
  /** Milliseconds for a line to go once round the twelve. */
  rainbowCycleMs: 12000,
  /** Names. */
  text: '#dadada',
  /** What's lit: the hovered dot's lines and the ring round it. */
  highlight: '#ffffff',
  /** Not yet a connection: the console's "missing" grey, at half strength. */
  missing: '#666666',
  missingAlpha: 0.5,
  /** How strong everything not next to the lit dot stays. */
  dimAlpha: 0.2,
  hoverFadeMs: 150,
  font: '"Glacial Indifference", system-ui, sans-serif',
});

const RADIUS_MIN = 8;
const RADIUS_MAX = 30;
const LABEL_BASE_PX = 14;
/** Under this a name can't be read, whatever the rule says. */
const LABEL_MIN_PX = 12;
const LABEL_MAX_PX = 18;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** The ratio the map is drawn at: the screen's, held between ½ and 2. */
export const pixelRatio = (): number => {
  const ratio = typeof window === 'undefined' ? 1 : window.devicePixelRatio;
  return ratio > 0 ? clamp(ratio, 0.5, 2) : 1;
};

/** Obsidian's scale: device pixels per world unit. */
const scaleOf = (k: number, dpr: number) => k * dpr;

/** A dot's radius in device pixels at scale 1: 3·√(links + 1), held to 8–30. */
const baseRadius = (degree: number) =>
  clamp(3 * Math.sqrt(degree + 1), RADIUS_MIN, RADIUS_MAX);

/** A dot's radius on screen, in CSS pixels: it grows with √scale. */
export const dotRadius = (degree: number, k: number, dpr: number): number =>
  (baseRadius(degree) * Math.sqrt(scaleOf(k, dpr))) / dpr;

/** A name's type, 14 + radius/4, scaled like its dot. */
export const labelPx = (degree: number, k: number, dpr: number): number =>
  clamp(
    ((LABEL_BASE_PX + baseRadius(degree) / 4) * Math.sqrt(scaleOf(k, dpr))) /
      dpr,
    LABEL_MIN_PX,
    LABEL_MAX_PX,
  );

/** Names fade out as the map zooms out: solid from scale 1, gone by ½. */
export const labelAlpha = (k: number, dpr: number): number =>
  clamp(Math.log2(scaleOf(k, dpr)) + 1, 0, 1);

/** A line: one device pixel at every zoom. */
export const linePx = (dpr: number): number => 1 / dpr;

/** The ring round a lit dot: √scale device pixels, held to 1–2 CSS pixels. */
export const ringPx = (k: number, dpr: number): number =>
  clamp(Math.max(1, Math.sqrt(scaleOf(k, dpr))) / dpr, 1, 2);
