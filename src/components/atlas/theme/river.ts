/**
 * The Time River's measurements and timings (components/River/). Colours
 * come from the places (data/placeTree.ts), the eras (data/musicalEras.ts)
 * and the tokens (./tokens.ts).
 */
export const RIVER = {
  /** Above the lanes: the year bookends and the genre chips. */
  top: 104,
  /** Below the lanes: the corner globe, the cursor's year and the era rail. */
  bottom: 100,
  /** The right-hand strip that holds the lane names; narrower on phones. */
  labelGutter: 196,
  labelGutterNarrow: 112,
  /** Between lanes. */
  gap: 12,
  /** A lane's thickness at most and at least: Dorot's are a fifth of the page. */
  maxLane: 200,
  minLane: 26,
  /** Where each split of the fan ends, from the source at the left edge. */
  fanStages: [150, 250, 340] as const,
  fanStagesNarrow: [56, 92, 124] as const,
  /** The fan's lanes at the source, as a share of their thickness. */
  sourceShare: 0.3,
  /** The bands' fill; lighter in the fan, where siblings overlap and add up. */
  bandOpacity: 0.68,
  fanOpacity: 0.42,
  /** The glow at the source, where every lane begins. */
  sourceGlow: 64,
  /** A lane's strand (its centre line). */
  strandAlpha: 0.55,
  /** The thin curves of lanes flowing into others (the family tree). */
  inflowAlpha: 0.32,
  /** The family tree's lanes (the Pathways lens): growth and band alpha. */
  rampPx: 140,
  minRampYears: 2,
  maxRampYears: 60,
  bandAlpha: [0.34, 0.24] as const,
  /**
   * Markers: 16:9 frames, the shape of the pictures (YouTube stills), so
   * nothing is cropped away. No two in a row of a lane closer than
   * `clusterGapFactor` frame widths; a band this thick or more carries two
   * rows of them.
   */
  frameAspect: 16 / 9,
  clusterGapFactor: 1.3,
  twoRowsAt: 96,
  /** A frame's height at most (on a phone, less) and least. */
  posterMaxPx: 64,
  posterMaxPxNarrow: 40,
  posterMinPx: 22,
  /** Pictures in a cluster's deck, at most, and how far each one behind
   *  the front sits up and to the right, as a share of the frame's height. */
  stackPosters: 3,
  deckStep: 0.09,
  /** Markers with pictures at once, at most; the rest show their count. */
  maxPosters: 80,
  /** How long the view must rest before the page's store hears of it. */
  commitMs: 150,
  /** How far past the view markers are drawn, as a share of its span. */
  overscan: 0.3,
  /** Eased moves: a cluster opening, an era picked. */
  tweenMs: 600,
  /** The bands growing in from the left, and drawing back for the globe. */
  growMs: 700,
  drawBackMs: 380,
  /** A lane splitting into its parts, or gathering them back. */
  splitMs: 450,
  /** The globe ⇄ timeline hand-over: the globe fading in or out. */
  morphMs: 420,
} as const;
