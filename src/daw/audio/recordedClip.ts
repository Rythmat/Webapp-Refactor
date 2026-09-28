import type { MidiNoteEvent, MidiCCEvent } from '@prism/engine';

export interface RecordedClipShape {
  startTick: number;
  events: MidiNoteEvent[];
  ccEvents?: MidiCCEvent[];
}

/**
 * Turn a finished take into clip-shaped data.
 *
 * The recorder timestamps events with ABSOLUTE transport ticks, while every
 * clip source stores clip-relative events and lets clip.startTick carry the
 * timeline position (playback re-adds it). Rebasing to the PUNCH-IN tick rather
 * than to the first note is what keeps a late entry late: the silence before
 * the first note survives as a rest at the front of the clip instead of being
 * trimmed, so the take stays on the beats it was played on.
 *
 * Latency compensation can place a note a hair ahead of punch-in, so the clip
 * front is the lower of the two — event ticks never go negative.
 */
export function buildRecordedClip(
  notes: MidiNoteEvent[],
  ccEvents: MidiCCEvent[],
  punchInTick: number,
): RecordedClipShape {
  const earliestTick = notes.reduce(
    (min, n) => Math.min(min, n.startTick),
    Infinity,
  );
  const startTick = Math.max(0, Math.min(punchInTick, earliestTick));

  const rebasedCC = ccEvents.map((c) => ({
    ...c,
    tick: Math.max(0, c.tick - startTick),
  }));

  return {
    startTick,
    events: notes.map((n) => ({ ...n, startTick: n.startTick - startTick })),
    ccEvents: rebasedCC.length > 0 ? rebasedCC : undefined,
  };
}
