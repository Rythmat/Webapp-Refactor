// ── Each genre's signature groove (owner, 2026-10-26) ─────────────────────
// Learn's Genre tiles draw a genre as its groove: one bar on a circle (a
// rhythm necklace), the hits a polygon. One pattern per course in
// genreCourses (by slug): the kick and snare together, as a drummer would
// count the feel, on sixteen steps, or twelve for a triplet feel.

export interface GenreGroove {
  /** Steps in the bar: 16 (straight sixteenths) or 12 (triplet feel). */
  steps: 12 | 16;
  /** The steps that are hit, from 0 (the downbeat). */
  hits: readonly number[];
  /** What a player would call it. */
  name: string;
}

export const GENRE_GROOVES: Readonly<Record<string, GenreGroove>> = {
  pop: { steps: 16, hits: [0, 3, 4, 8, 10, 12], name: 'Pop backbeat' },
  rock: { steps: 16, hits: [0, 4, 7, 8, 12], name: 'Rock beat' },
  'hip-hop': { steps: 16, hits: [0, 4, 6, 10, 12, 15], name: 'Boom bap' },
  rnb: { steps: 16, hits: [0, 3, 6, 8, 11], name: 'Half-time groove' },
  jazz: { steps: 12, hits: [0, 3, 5, 6, 9, 11], name: 'Swing ride' },
  blues: { steps: 12, hits: [0, 2, 3, 5, 6, 8, 9, 11], name: 'Shuffle' },
  folk: { steps: 16, hits: [0, 4, 6, 8, 12, 14], name: 'Boom-chick' },
  funk: { steps: 16, hits: [0, 3, 4, 6, 10, 12, 15], name: 'Funk sixteenths' },
  'neo-soul': {
    steps: 16,
    hits: [0, 3, 7, 9, 12, 14],
    name: 'Laid-back pocket',
  },
  electronic: {
    steps: 16,
    hits: [0, 2, 4, 6, 8, 10, 12, 14],
    name: 'Four on the floor',
  },
  latin: { steps: 16, hits: [0, 3, 6, 10, 12], name: 'Son clave 3-2' },
  // No beat one: the drop lands on three, the skank on the off-beats.
  reggae: { steps: 16, hits: [2, 6, 8, 10, 14], name: 'One drop' },
  'jam-band': { steps: 16, hits: [0, 3, 6, 8, 11, 14], name: 'Jam groove' },
  african: { steps: 12, hits: [0, 2, 4, 5, 7, 9, 11], name: 'Standard bell' },
};
