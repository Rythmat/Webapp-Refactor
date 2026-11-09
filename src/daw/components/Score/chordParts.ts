// ── Which Score parts show the chord ruler's chords (owner, 2026-10-21) ────
//
// The chord ruler is the song's chords, and the Score shows them as the
// ruler changes. Until the student picks parts (scoreChordTracks), they sit
// over the top part, as an exported score already put them. Turning that
// part's chords off writes NO_CHORD_PARTS, so an empty pick never brings
// them back on their own.

/** The scoreChordTracks entry for 'no part shows chords'. */
export const NO_CHORD_PARTS = '-';

/** The parts that show chords, from the pick and the parts top first. */
export function chordPartIds(
  picked: readonly string[],
  partIds: readonly string[],
): Set<string> {
  if (picked.length === 0) return new Set(partIds.slice(0, 1));
  return new Set(picked.filter((id) => id !== NO_CHORD_PARTS));
}

/** The pick with `trackId`'s chords turned on or off. */
export function toggledChordParts(
  picked: readonly string[],
  partIds: readonly string[],
  trackId: string,
): string[] {
  const shown = chordPartIds(picked, partIds);
  if (shown.has(trackId)) shown.delete(trackId);
  else shown.add(trackId);
  return shown.size === 0 ? [NO_CHORD_PARTS] : [...shown];
}
