/**
 * The highest chord progression id ever issued.
 *
 * A progression's id is never reused or renumbered: UNISON stores the ids of
 * the progressions it matched (src/daw/unison/engine/progressionMatcher.ts),
 * so an id that came back on a different progression would quietly point
 * those records at the wrong chords. A new progression therefore takes the
 * next id above this mark, never one past the highest id the library holds
 * today, which would hand out an id again once the top progression was
 * deleted.
 *
 * The repo content server raises the mark in the same save that adds (or
 * deletes) a progression above it, so it only ever goes up. The ids below it
 * that the library does not hold (682, 683 and 692 in October 2026) stay
 * unused for good.
 */
export const PROGRESSION_ID_HIGH_WATER = 698;
