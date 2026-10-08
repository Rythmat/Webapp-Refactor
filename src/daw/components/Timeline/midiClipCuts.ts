// ── midiClipCuts.ts ─────────────────────────────────────────────────────────
// Cutting MIDI clips at a song tick.
//
// A MIDI clip's events are clip-relative: playback schedules each one at
// clip.startTick + its own tick (usePlaybackEngine → MidiScheduler). So a cut
// at song tick T falls at clip tick T - clip.startTick, and whatever ends up
// in the right half moves onto that half's own tick 0. Comparing event ticks
// with the song tick instead made the scissors do nothing on most clips after
// bar 1, and left the right half's notes playing late (timeline-04).
//
// Pure, used by the timeline's scissors (splitMidiClipAt).

import type { MidiCCEvent } from '@prism/engine';
import type { MidiClip } from '@/daw/store/tracksSlice';

/**
 * A MIDI clip's length in ticks, the box the timeline draws: its
 * durationTicks when it has one, else the end of its last note, measured from
 * the clip's own tick 0 (a rest at the front counts).
 */
export function midiClipLength(
  clip: Pick<MidiClip, 'durationTicks' | 'events'>,
): number {
  if (clip.durationTicks) return clip.durationTicks;
  let end = 0;
  for (const e of clip.events) {
    end = Math.max(end, e.startTick + e.durationTicks);
  }
  return end;
}

/**
 * The controller values in force at clip tick `cut` (the last one set before
 * it, per channel and controller), as events at the right half's tick 0. A
 * value the right half already sets right at the cut is left to it.
 */
function controllersAt(
  ccEvents: readonly MidiCCEvent[],
  cut: number,
): MidiCCEvent[] {
  const key = (c: MidiCCEvent) => `${c.channel}:${c.controller}`;
  const last = new Map<string, MidiCCEvent>();
  const setAtCut = new Set<string>();
  for (const c of ccEvents) {
    if (c.tick === cut) setAtCut.add(key(c));
    if (c.tick >= cut) continue;
    const previous = last.get(key(c));
    if (!previous || c.tick >= previous.tick) last.set(key(c), c);
  }
  return [...last.values()]
    .filter((c) => !setAtCut.has(key(c)))
    .map((c) => ({ ...c, tick: 0 }));
}

/**
 * Cut `clip` in two at song tick `splitTick`, the way its edges trim: the
 * left half keeps the clip's id and the notes that start before the cut, a
 * note still sounding at the cut ending there; the right half takes `rightId`
 * and the notes from the cut on, moved onto its own tick 0. Controller events
 * split the same way, and the right half opens with the values in force at
 * the cut (a held sustain pedal stays held), so it sounds the same played on
 * its own. Null unless the tick falls strictly inside the clip.
 *
 * Like a trimmed clip, a half with notes is left unsized, so its box follows
 * its notes (as every clip's does after a reload: the length isn't saved
 * yet). Only a half left without notes keeps the span it was cut to, as
 * durationTicks: nothing else could show it.
 */
export function splitMidiClip(
  clip: MidiClip,
  splitTick: number,
  rightId: string,
): [MidiClip, MidiClip] | null {
  const length = midiClipLength(clip);
  const cut = splitTick - clip.startTick;
  if (cut <= 0 || cut >= length) return null;

  const leftEvents = clip.events
    .filter((e) => e.startTick < cut)
    .map((e) =>
      e.startTick + e.durationTicks > cut
        ? { ...e, durationTicks: cut - e.startTick }
        : e,
    );
  const rightEvents = clip.events
    .filter((e) => e.startTick >= cut)
    .map((e) => ({ ...e, startTick: e.startTick - cut }));
  const left: MidiClip = {
    ...clip,
    durationTicks: leftEvents.length ? undefined : cut,
    events: leftEvents,
  };
  const right: MidiClip = {
    ...clip,
    id: rightId,
    startTick: splitTick,
    durationTicks: rightEvents.length ? undefined : length - cut,
    events: rightEvents,
  };
  if (clip.ccEvents) {
    const leftCc = clip.ccEvents.filter((c) => c.tick < cut);
    const rightCc = [
      ...controllersAt(clip.ccEvents, cut),
      ...clip.ccEvents
        .filter((c) => c.tick >= cut)
        .map((c) => ({ ...c, tick: c.tick - cut })),
    ];
    // Like a trim, a half with no controller events carries none.
    left.ccEvents = leftCc.length ? leftCc : undefined;
    right.ccEvents = rightCc.length ? rightCc : undefined;
  }
  return [left, right];
}
