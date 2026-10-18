import { midiClipLength } from '@/daw/components/Timeline/midiClipCuts';
import type { SongSection } from '@/daw/model/sections';
import { useStore } from '@/daw/store';
import type { Track } from '@/daw/store/tracksSlice';
import { ticksPerBar, timeSignatureOf } from '@/daw/time/timeModel';
import { pauseFollow } from './follow';
import { ZOOM_OUT_STEP, ZOOM_STEP } from './zoom';

// ── The timeline's viewport (milestone 2.7) ────────────────────────────────
//
// How wide the timeline is on screen, as its canvas measures it, and the
// zoom commands that need that width: the toolbar's −, + and Fit, ⌥− / ⌥=,
// ⌘⇧F. The Timeline publishes its width here whenever it changes, so every
// caller zooms around the same middle and fits the same width (shell-32: Fit
// used to assume 800 px).

let width = 0;

/** The timeline canvas's width in px; 0 while no timeline is on screen. */
export function timelineWidth(): number {
  return width;
}

/** The Timeline reports its canvas's width (0 when it unmounts). */
export function publishTimelineWidth(px: number): void {
  width = Math.max(0, px);
}

/** How much of the song the timeline shows at least: 8 bars. */
const SONG_MIN_BARS = 8;
/** The room the timeline leaves after the last clip: 4 bars. */
const SONG_PAD_BARS = 4;

/**
 * The timeline's length in ticks for these tracks and the song's sections:
 * to the end of the last clip or section (8 bars at least), plus four bars
 * of room. What the scrollbar scrolls over and what Fit fits, so a form laid
 * out before anything is recorded fits too (milestone 2.13).
 */
export function songLengthOf(
  tracks: readonly Pick<Track, 'midiClips' | 'audioClips'>[],
  barTicks: number,
  sections: readonly Pick<SongSection, 'endTick'>[] = [],
): number {
  let maxTick = barTicks * SONG_MIN_BARS;
  for (const section of sections) {
    maxTick = Math.max(maxTick, section.endTick);
  }
  for (const track of tracks) {
    for (const clip of track.midiClips) {
      maxTick = Math.max(maxTick, clip.startTick + midiClipLength(clip));
    }
    for (const clip of track.audioClips) {
      maxTick = Math.max(maxTick, clip.startTick + clip.duration);
    }
  }
  return maxTick + barTicks * SONG_PAD_BARS;
}

/** The song's length in ticks, from the store (songLengthOf). */
export function songLengthTicks(barTicks: number): number {
  const s = useStore.getState();
  return songLengthOf(s.tracks, barTicks, s.sections);
}

/**
 * Zooms by `delta` around the middle of what's on screen. The student has
 * taken the view, so Follow waits for Play or Stop.
 */
export function zoomTimelineBy(delta: number): void {
  pauseFollow();
  const s = useStore.getState();
  s.zoomAtPoint(delta, s.timelineScrollLeft + timelineWidth() / 2);
}

export const zoomTimelineIn = () => zoomTimelineBy(ZOOM_STEP);
export const zoomTimelineOut = () => zoomTimelineBy(ZOOM_OUT_STEP);

/** Fits the whole song in the timeline's width, from its start. */
export function fitTimeline(): void {
  const s = useStore.getState();
  const w = timelineWidth();
  if (w <= 0) return;
  pauseFollow();
  s.zoomToFit(w, songLengthTicks(ticksPerBar(timeSignatureOf(s))));
}
