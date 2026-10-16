// ── An effect rack's size (milestone 2.8) ──────────────────────────────────
//
// A rack holds at most this many effects: a track's chain, the master's and
// each return's. The store refuses a sixth (tracksSlice, masteringSlice,
// returnsSlice), and the lists that add effects say so at the cap. It was a
// constant in four places, and a track's own add didn't check it.

export const MAX_RACK_EFFECTS = 5;
