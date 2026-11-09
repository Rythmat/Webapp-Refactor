import { memo } from 'react';
import type { AllSlices } from '@/daw/store';
import { barStartTick, timeSignatureOf } from '@/daw/time/timeModel';
import { trackRole } from '@/daw/utils/chordAnalysis';
import { CHORD_LANE_PX } from '../tracklist/rowLayout';

// ── The chord lane's header (milestone 2.7) ────────────────────────────────
//
// The left end of the chord lane, sticky with it: an empty corner since
// 2026-10-21 (the song's key is set from the top bar's Song pill), and
// where + Suggest would put chords (suggestTarget), kept for the prompt
// bar's chord suggestions.

/**
 * Where + Suggest suggests chords, and for which track: after the last
 * chord (or at the playhead's bar when there are none), for the selected
 * track if it can hold chords, else the first one that can. Null when no
 * track can (no MIDI track that isn't drums).
 */
export function suggestTarget(
  s: Pick<
    AllSlices,
    | 'tracks'
    | 'selectedTrackId'
    | 'chordRegions'
    | 'timeSignatureNumerator'
    | 'timeSignatureDenominator'
  >,
  playheadTick: number,
): { tick: number; trackId: string } | null {
  const holdsChords = (t: AllSlices['tracks'][number]) =>
    t.type === 'midi' &&
    t.instrument !== 'drum-machine' &&
    trackRole(t) !== 'drums';
  const selected = s.tracks.find((t) => t.id === s.selectedTrackId);
  const track =
    selected && holdsChords(selected) ? selected : s.tracks.find(holdsChords);
  if (!track) return null;
  const lastEnd = s.chordRegions.reduce(
    (end, r) => Math.max(end, r.endTick),
    0,
  );
  const tick =
    s.chordRegions.length > 0
      ? lastEnd
      : barStartTick(Math.max(0, playheadTick), timeSignatureOf(s));
  return { tick, trackId: track.id };
}

/**
 * The chord lane's corner over the track list: empty, so the track column
 * keeps the lane's row and the tracks stay level with their lanes. The
 * label, the key chip and + (Suggest chords) went on 2026-10-21 (owner:
 * "Key selection already happens in the top rail"); Prism's suggestions
 * stay on the clip menu.
 */
export const ChordLaneHeader = memo(function ChordLaneHeader() {
  return (
    <div
      aria-hidden
      data-testid="chord-lane-header"
      className="border-b border-daw-hairline"
      style={{ height: CHORD_LANE_PX }}
    />
  );
});
