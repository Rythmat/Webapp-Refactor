// ── noteEditorOrigin.ts ─────────────────────────────────────────────────────
// Where a note editor (piano roll, drum grid) starts drawing a MIDI clip.
//
// Clip events are clip-relative: playback schedules each one at
// clip.startTick + event.startTick (MidiScheduler, via usePlaybackEngine), and
// every clip source stores them that way (recordedClip.ts, trims, imports). So
// an editor's x = 0 is the clip's own tick 0, never its song position. The
// song position only places song-time overlays (playhead, loop, notation bar
// numbers): it is PianoRoll's `timelineStartTick`, and the value below is its
// `clipStartTick`. Passing clip.startTick as the origin draws a clip that
// starts after bar 1 off the left edge and stores new notes that many ticks
// late.

/**
 * The clip-relative tick at a note editor's left edge: 0, the clip's start.
 * Only notes stored before the clip start pull it back (no edit path makes
 * them, but older or imported data might), to the bar line before the
 * earliest one, so they stay reachable and the grid's bar lines stay on the
 * clip's bars. `ticksPerBar` is the editor's own bar length.
 */
export function noteEditorOriginTick(
  events: ReadonlyArray<{ startTick: number }>,
  ticksPerBar: number,
): number {
  let earliest = 0;
  for (const e of events) if (e.startTick < earliest) earliest = e.startTick;
  if (earliest >= 0) return 0;
  const bar = Math.max(1, ticksPerBar);
  return Math.floor(earliest / bar) * bar;
}
