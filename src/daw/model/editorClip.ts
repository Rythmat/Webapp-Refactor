// ── The clip a note editor edits ───────────────────────────────────────────
// Every note editor on a track (the dock's piano roll, the keyboard's roll,
// the drum grid) edits one clip, found the same way:
//
//   1. the selected clip, when it is on that track;
//   2. else the clip under the playhead (where it is parked, so the editor
//      doesn't jump from clip to clip while the song plays);
//   3. else the track's first clip.
//
// The drum grid and the keyboard's roll used to edit the first clip always,
// and the dock's roll opened empty unless a clip was selected, so a student
// editing a groove or a chord track saw the wrong notes, or none, and a note
// drawn into the empty roll made a second clip over the first
// (dock-instruments-03, dock-instruments-10). A track with no clips is the
// only blank roll: its first note makes a clip at the playhead's bar.
//
// Lesson checks count the first clip's notes; on a track with one clip, or
// with the playhead at the start, rule 3 or 2 picks that clip.

import type { MidiClip, Track } from '@/daw/store/tracksSlice';
import { midiClipLength } from '@/daw/time/timeModel';

export interface EditorClipState {
  tracks: readonly Pick<Track, 'id' | 'midiClips'>[];
  selectedClipId: string | null;
  selectedClipTrackId: string | null;
  /** The parked playhead (the store's `position`). */
  position: number;
}

/** The clip on `clips` under song tick `tick`: the latest-starting one. */
export function clipAt(
  clips: readonly MidiClip[],
  tick: number,
): MidiClip | null {
  let found: MidiClip | null = null;
  for (const clip of clips) {
    const end = clip.startTick + Math.max(1, midiClipLength(clip));
    if (tick < clip.startTick || tick >= end) continue;
    if (!found || clip.startTick >= found.startTick) found = clip;
  }
  return found;
}

/** The MIDI clip a note editor on `trackId` edits, or null for none. */
export function resolveEditorClip(
  state: EditorClipState,
  trackId: string | null | undefined,
): MidiClip | null {
  if (!trackId) return null;
  const track = state.tracks.find((t) => t.id === trackId);
  if (!track || track.midiClips.length === 0) return null;
  if (state.selectedClipTrackId === trackId && state.selectedClipId) {
    const selected = track.midiClips.find((c) => c.id === state.selectedClipId);
    if (selected) return selected;
  }
  return clipAt(track.midiClips, state.position) ?? track.midiClips[0];
}

/**
 * The track the dock's note editor works on: the selected clip's when a
 * MIDI clip is selected (a click on the timeline selects a clip, not its
 * track), else the selected track.
 */
export function editorTrackId(
  state: EditorClipState & { selectedTrackId: string | null },
): string | null {
  const { selectedClipId, selectedClipTrackId } = state;
  if (selectedClipId && selectedClipTrackId) {
    const track = state.tracks.find((t) => t.id === selectedClipTrackId);
    if (track?.midiClips.some((c) => c.id === selectedClipId)) {
      return selectedClipTrackId;
    }
  }
  return state.selectedTrackId;
}
