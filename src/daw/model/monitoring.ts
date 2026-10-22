// ── Whether a track's input is heard (owner, 2026-10-22) ───────────────────
//
// Input monitoring is the record button's middle state: a track's input (a
// MIDI device, a mic or an instrument) is heard only while the track is
// armed AND monitoring (TrackRow's record button: off → armed and heard →
// armed, quiet → off). A `monitoring` flag left on a track that isn't armed
// (an old save, the old ⋯ menu's Monitor input, a template) is never heard,
// so what the button shows is what plays.

export function monitorsInput(track: {
  recordArmed: boolean;
  monitoring: boolean;
}): boolean {
  return track.recordArmed && track.monitoring;
}
