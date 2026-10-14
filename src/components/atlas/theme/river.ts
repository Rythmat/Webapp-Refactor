/**
 * The Time River's measurements and timings (components/River/). Colours
 * come from the tokens (./tokens.ts) and the eras (data/musicalEras.ts).
 */
export const RIVER = {
  /** Above the lanes: the year bookends. */
  top: 112,
  /** Below the lanes: the era rail and the cursor's year. */
  bottom: 64,
  /** The right-hand strip that holds the lane names; narrower on phones. */
  labelGutter: 168,
  labelGutterNarrow: 104,
  /** Between grown lanes. */
  gap: 6,
  /** A newborn lane grows to full thickness over about this many pixels. */
  rampPx: 140,
  minRampYears: 2,
  maxRampYears: 60,
  /** Bands' fill over the era colours, alternating lane by lane. */
  bandAlpha: [0.34, 0.24] as const,
  /** A lane's strand (its centre line). */
  strandAlpha: 0.4,
  /** The thin curves of lanes flowing into others. */
  inflowAlpha: 0.32,
  /** No two markers on a lane closer than this. */
  clusterGapPx: 44,
  /** Markers' sizes: a poster, a count's smallest and largest. */
  posterPx: 32,
  countMinPx: 24,
  countMaxPx: 36,
  /** Posters loaded at once, at most; the rest of the markers are dots. */
  maxPosters: 48,
  /** How long a gesture must rest before new posters load. */
  posterRestMs: 150,
  /** How long the view must rest before the page's store hears of it. */
  commitMs: 150,
  /** How far past the view markers are drawn, as a share of its span. */
  overscan: 0.3,
  /** Eased moves: a cluster opening, an era picked. */
  tweenMs: 500,
} as const;
