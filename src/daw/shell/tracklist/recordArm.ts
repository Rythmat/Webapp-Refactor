import type { Track } from '@/daw/store';

// ── The record-arm button's three states (owner, 2026-10-21) ────────────────
//
// One button in the track header steps through three states, a click each:
//   off → armed, hearing its input → armed, input quiet → off
// The first click arms the track and turns input monitoring on (you hear
// what you play as you record); the second turns monitoring off and keeps
// the arm; the third disarms. A track that is monitoring but not armed (from
// the ⋯ menu's Monitor) counts as off: a click arms it and keeps it heard.

export type ArmState = 'off' | 'monitoring' | 'armed';

export function armStateOf(
  track: Pick<Track, 'recordArmed' | 'monitoring'>,
): ArmState {
  if (!track.recordArmed) return 'off';
  return track.monitoring ? 'monitoring' : 'armed';
}

/** What one click on the button sets. */
export function nextArm(
  track: Pick<Track, 'recordArmed' | 'monitoring'>,
): Pick<Track, 'recordArmed' | 'monitoring'> {
  switch (armStateOf(track)) {
    case 'off':
      return { recordArmed: true, monitoring: true };
    case 'monitoring':
      return { recordArmed: true, monitoring: false };
    case 'armed':
      return { recordArmed: false, monitoring: false };
  }
}

/** The button's name for a track in `state`: what a click will do. */
export function armLabel(name: string, state: ArmState): string {
  switch (state) {
    case 'off':
      return `Arm ${name} to record`;
    case 'monitoring':
      return `Stop hearing ${name}’s input`;
    case 'armed':
      return `Disarm ${name}`;
  }
}

/** The hint line's second part: what the button does now. */
export function armHint(state: ArmState): string {
  switch (state) {
    case 'off':
      return 'Record onto this track and hear its input as you play';
    case 'monitoring':
      return 'Armed and hearing its input: click to stop hearing it';
    case 'armed':
      return 'Armed, input quiet: click to disarm';
  }
}
