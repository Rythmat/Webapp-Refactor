// ── audioClipCuts.ts ────────────────────────────────────────────────────────
// Cutting audio clips without touching their audio.
//
// An audio clip plays a window of a recording: from `offsetSeconds` into it,
// for `duration` ticks. Playback, export and the waveform all honour that
// window (AudioClipScheduler, renderProject, Timeline), so a cut only moves
// windows. Every piece keeps the clip's asset, gain and decoded audio, and
// the recording itself is never sliced, re-encoded or dropped: undo, a reload
// and a collaborator all find the same take.
//
// Pure math, used by the timeline's scissors and Split at Playhead
// (splitAudioClipAt) and by record-over (overwriteAudioRegion).

import type { AudioClip } from '@/daw/store/tracksSlice';
import { ticksToSeconds } from './recordingLimit';

/**
 * The part of `clip` that plays over song ticks [fromTick, toTick), or null
 * when the range misses the clip. It is the same clip (id, asset, gain) with
 * a narrower window: offsetSeconds moves on by whatever was cut off the front
 * (at `bpm`, the tempo playback maps the clip's ticks with). A fade stays only
 * on an edge the piece shares with the clip, at its full length, so the kept
 * audio sounds as it did; a cut edge gets none.
 */
export function audioClipSection(
  clip: AudioClip,
  fromTick: number,
  toTick: number,
  bpm: number,
): AudioClip | null {
  const clipEnd = clip.startTick + clip.duration;
  const start = Math.max(fromTick, clip.startTick);
  const end = Math.min(toTick, clipEnd);
  if (end <= start) return null;
  const cutFront = start - clip.startTick;
  return {
    ...clip,
    startTick: start,
    duration: end - start,
    offsetSeconds:
      cutFront > 0
        ? (clip.offsetSeconds ?? 0) + ticksToSeconds(cutFront, bpm)
        : clip.offsetSeconds,
    fadeInTicks: start === clip.startTick ? clip.fadeInTicks : 0,
    fadeOutTicks: end === clipEnd ? clip.fadeOutTicks : 0,
  };
}

/**
 * Cut `clip` in two at song tick `splitTick`. Both halves play the clip's
 * recording: the left keeps the clip's id (and with it the audio already
 * loaded for that id), the right takes `rightId` and reads on from the cut.
 * Null unless the tick falls strictly inside the clip.
 */
export function splitAudioClip(
  clip: AudioClip,
  splitTick: number,
  bpm: number,
  rightId: string,
): [AudioClip, AudioClip] | null {
  const clipEnd = clip.startTick + clip.duration;
  if (splitTick <= clip.startTick || splitTick >= clipEnd) return null;
  const left = audioClipSection(clip, clip.startTick, splitTick, bpm);
  const right = audioClipSection(clip, splitTick, clipEnd, bpm);
  if (!left || !right) return null;
  return [left, { ...right, id: rightId }];
}

export interface ClearedAudioRange {
  /** The track's clips afterwards, in their original order. */
  clips: AudioClip[];
  /** New clip ids, each paired with the clip whose audio it plays. */
  shared: Array<{ from: string; to: string }>;
  /** False when the range touched no clip (`clips` is then a copy). */
  changed: boolean;
}

/**
 * A track's clips with song ticks [fromTick, toTick) cleared for a new take.
 * A clip inside the range goes; a clip the range overlaps keeps the parts
 * outside it (see audioClipSection): the first under its own id and, when the
 * take lands inside the clip, the second under `newId()`. Clips the range
 * misses, and `keepId` (the take itself), stay exactly as they were.
 */
export function clearAudioRange(
  clips: readonly AudioClip[],
  fromTick: number,
  toTick: number,
  bpm: number,
  newId: () => string,
  keepId?: string,
): ClearedAudioRange {
  const next: AudioClip[] = [];
  const shared: Array<{ from: string; to: string }> = [];
  let changed = false;
  for (const clip of clips) {
    const clipEnd = clip.startTick + clip.duration;
    if (
      toTick <= fromTick ||
      clip.id === keepId ||
      clip.startTick >= toTick ||
      clipEnd <= fromTick
    ) {
      next.push(clip);
      continue;
    }
    changed = true;
    const before = audioClipSection(clip, clip.startTick, fromTick, bpm);
    const after = audioClipSection(clip, toTick, clipEnd, bpm);
    if (before) next.push(before);
    if (after && before) {
      const id = newId();
      shared.push({ from: clip.id, to: id });
      next.push({ ...after, id });
    } else if (after) {
      next.push(after);
    }
  }
  return { clips: next, shared, changed };
}
