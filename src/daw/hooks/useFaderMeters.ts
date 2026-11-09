import { useMemo } from 'react';
import { isTrackAudible } from '@/daw/audio/trackAudibility';
import { meterSource } from '@/daw/engine/meterBus';
import { monitorsInput } from '@/daw/model/monitoring';
import { useStore, type Track } from '@/daw/store';
import type { MeterSource } from '@/daw/ui/Meter';

// ── What a track's volume pill shows (owner, 2026-10-23) ──────────────────
// The level you hear, in the track's colour; and, in grey under it, the
// signal it has that you don't: all of it while the track is muted or
// silenced by another's solo (its stereo meter is taken ahead of that gate,
// TrackEngine), and an audio track's live input while it isn't monitoring
// it (model/monitoring). The Master's pill does the same while the Master is
// muted (its meter is taken ahead of its mute, AudioEngine).

export interface FaderMeters {
  /** The level heard, or null while the track is silenced. */
  meter: MeterSource | null;
  /** What it has but doesn't play, grey. */
  ghosts: readonly MeterSource[];
  /** Whether the track is heard (not muted, not silenced by a solo). */
  audible: boolean;
}

export function useFaderMeters(track: Track): FaderMeters {
  const audible = useStore((s) => isTrackAudible(track, s.tracks));
  const quietInput = track.type === 'audio' && !monitorsInput(track);
  return useMemo(() => {
    const level = meterSource(`track-lr:${track.id}`);
    const ghosts: MeterSource[] = [];
    if (!audible) ghosts.push(level);
    if (quietInput) ghosts.push(meterSource(`input:${track.id}`));
    return { meter: audible ? level : null, ghosts, audible };
  }, [track.id, audible, quietInput]);
}

const NONE: readonly MeterSource[] = [];

/** The Master's pill: the mix in its colour, or grey while it is muted. */
export function useMasterFaderMeters(): FaderMeters {
  const muted = useStore((s) => s.masterMuted);
  return useMemo(() => {
    const level = meterSource('master');
    return muted
      ? { meter: null, ghosts: [level], audible: false }
      : { meter: level, ghosts: NONE, audible: true };
  }, [muted]);
}
