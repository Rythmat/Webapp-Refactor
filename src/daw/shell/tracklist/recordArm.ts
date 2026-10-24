import { useStore, type Track } from '@/daw/store';
import { isApplePlatform } from '@/daw/shell/topbar/platformKeys';

// ── The record-arm button's three states (owner, 2026-10-21) ────────────────
//
// One button in the track header steps through three states, a click each:
//   off → armed, hearing its input → armed, input quiet → off
// The first click arms the track and turns input monitoring on (you hear
// what you play as you record); the second turns monitoring off and keeps
// the arm; the third disarms. A track that is monitoring but not armed (from
// the ⋯ menu's Monitor) counts as off: a click arms it and keeps it heard.
//
// Record arm exclusive (a per-user setting, on by default; owner,
// 2026-10-23): arming a track disarms every other, so a MIDI keyboard plays
// one track. ⌘-click (Ctrl-click off a Mac) arms a track alongside the
// others. A new MIDI track starts armed and monitoring, taking the arm the
// same way.

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
export function armHint(state: ArmState, exclusive = false): string {
  switch (state) {
    case 'off':
      return exclusive
        ? `Record onto this track and hear its input as you play; ${ADD_ARM_KEY}-click to arm it with the others`
        : 'Record onto this track and hear its input as you play';
    case 'monitoring':
      return 'Armed and hearing its input: click to stop hearing it';
    case 'armed':
      return 'Armed, input quiet: click to disarm';
  }
}

/**
 * One click on `track`'s record button. `additive` (⌘/Ctrl-click) arms it
 * alongside the others even while Record arm exclusive is on.
 */
export function stepArm(track: Track, additive = false): void {
  const s = useStore.getState();
  s.setRecordArm(track.id, nextArm(track), s.recordArmExclusive && !additive);
}

/** A new MIDI track: armed and hearing its input, ready to play into. */
export function armNewTrack(id: string): void {
  const s = useStore.getState();
  s.setRecordArm(
    id,
    { recordArmed: true, monitoring: true },
    s.recordArmExclusive,
  );
}

/** The modifier that arms one more track: '⌘' on a Mac, else 'Ctrl'. */
export const ADD_ARM_KEY = isApplePlatform() ? '⌘' : 'Ctrl';
