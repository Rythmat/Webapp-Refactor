// ── Each genre's signature interval (owner, 2026-10-27) ───────────────────
// Learn's Genre tiles draw a genre as the harmonograph chart's "rotary
// concurrent" figure of the interval that says it most: the fifth of a
// power chord, the blues' flat seventh. Two equal voices turning the same
// way at the interval's ratio (as a rotary harmonograph's two pendulums),
// the figure the Technique tiles' Lissajous' sister. One per course in
// genreCourses (by slug), no two the same. The grooves in genreGrooves are
// kept for the Drum lessons.

export interface GenreInterval {
  /** The ratio, the higher voice first (just intonation, lowest terms). */
  ratio: readonly [number, number];
  /** The interval's name. */
  name: string;
  /** Where the genre lives on it, under the tile's title. */
  why: string;
}

export const GENRE_INTERVALS: Readonly<Record<string, GenreInterval>> = {
  pop: { ratio: [5, 4], name: 'major third', why: 'The bright major third' },
  rock: { ratio: [3, 2], name: 'fifth', why: 'The fifth of a power chord' },
  'hip-hop': {
    ratio: [6, 5],
    name: 'minor third',
    why: 'The minor third of its loops',
  },
  rnb: { ratio: [15, 8], name: 'major seventh', why: 'The lush major seventh' },
  jazz: { ratio: [7, 5], name: 'tritone', why: 'The tritone of guide tones' },
  // The harmonic seventh, a little flatter than the piano's: the blue one.
  blues: { ratio: [7, 4], name: 'blue seventh', why: 'The flat, blue seventh' },
  folk: { ratio: [9, 8], name: 'whole tone', why: 'The whole tone of a sus2' },
  funk: { ratio: [12, 5], name: 'sharp nine', why: 'The bite of a sharp nine' },
  'neo-soul': {
    ratio: [8, 3],
    name: 'eleventh',
    why: 'The float of an eleventh',
  },
  electronic: { ratio: [2, 1], name: 'octave', why: 'The octave of the bass' },
  latin: {
    ratio: [5, 3],
    name: 'major sixth',
    why: 'The sixth of son and bossa',
  },
  reggae: { ratio: [4, 3], name: 'fourth', why: 'The fourth of I to IV' },
  'jam-band': {
    ratio: [9, 5],
    name: 'minor seventh',
    why: 'The Mixolydian flat seven',
  },
  african: { ratio: [5, 2], name: 'major tenth', why: 'The ringing tenth' },
};
