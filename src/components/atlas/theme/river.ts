/**
 * The Time River's measurements and timings (components/River/). Colours
 * come from the places (data/placeTree.ts), the eras (data/musicalEras.ts)
 * and the tokens (./tokens.ts).
 */
export const RIVER = {
  /** Above the lanes: the year bookends and the genre chips. */
  top: 148,
  /** Below the lanes: the corner globe, the cursor's year and the era rail. */
  bottom: 100,
  /** The right-hand strip that holds the lane names; narrower on phones. */
  labelGutter: 196,
  labelGutterNarrow: 112,
  /** Between lanes. */
  gap: 12,
  /** A lane's thickness at most and at least: Dorot's are a fifth of the page. */
  maxLane: 150,
  minLane: 26,
  /** Where each split of the fan ends, from the source at the left edge. */
  fanStages: [150, 250, 340] as const,
  fanStagesNarrow: [56, 92, 124] as const,
  /** The fan's lanes at the source, as a share of their thickness. */
  sourceShare: 0.3,
  /** The bands' fill. */
  bandOpacity: 0.8,
  /** How strongly the eras tint the bands along the years. */
  eraTint: 0.32,
  /** A lane's strand (its centre line). */
  strandAlpha: 0.55,
  /** The thin curves of lanes flowing into others (the family tree). */
  inflowAlpha: 0.32,
  /** The family tree's lanes (the Pathways lens): growth and band alpha. */
  rampPx: 140,
  minRampYears: 2,
  maxRampYears: 60,
  bandAlpha: [0.34, 0.24] as const,
  /** No two markers on a lane closer than this. */
  clusterGapPx: 48,
  /** Markers' sizes: a poster at most and least, a count's least and most. */
  posterMaxPx: 44,
  posterMinPx: 24,
  countMinPx: 26,
  countMaxPx: 40,
  /** Posters loaded at once, at most; the rest of the markers are counts or dots. */
  maxPosters: 56,
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
