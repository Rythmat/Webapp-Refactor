import { useState, useEffect } from 'react';
import { useStore } from '@/daw/store';
import { getTrackAudioState } from './usePlaybackEngine';
import { VocalFxAdapter } from '@/daw/instruments/VocalFxAdapter';
import type { PitchInfo } from '@/daw/audio/pitch-correction/PitchCorrectionNode';

const POLL_MS = 50; // 20Hz refresh

const NO_PITCH: PitchInfo = { detected: 0, corrected: 0 };

/**
 * What PitchMeter shows for `info`: the detected pitch to 0.1 Hz and the
 * corrected note. The worklet re-posts a new object about 24 times a second,
 * in silence too, so the view takes a new value only when this changes.
 */
export function pitchDisplayKey(info: PitchInfo): string {
  if (!(info.detected > 0)) return '';
  const correctedNote = Math.round(69 + 12 * Math.log2(info.corrected / 440));
  return `${Math.round(info.detected * 10)}:${correctedNote}`;
}

/** Whether `trackId`'s vocal chain has a Pitch Correction block switched on. */
function hasPitchCorrection(
  s: ReturnType<typeof useStore.getState>,
  trackId: string,
): boolean {
  const track = s.tracks.find((t) => t.id === trackId);
  return !!track?.vocalChain?.some(
    (b) => b.type === 'pitch-correction' && b.enabled,
  );
}

export function usePitchInfo(trackId: string): PitchInfo {
  const [info, setInfo] = useState<PitchInfo>(NO_PITCH);
  // The worklet reports only while its block is on: no block, no polling.
  const active = useStore((s) => hasPitchCorrection(s, trackId));

  useEffect(() => {
    if (!active) {
      setInfo(NO_PITCH);
      return;
    }
    let shownKey = '';
    const interval = window.setInterval(() => {
      const state = getTrackAudioState(trackId);
      if (!(state?.instrument instanceof VocalFxAdapter)) return;
      const pitch = state.instrument.getPitchInfo();
      if (!pitch) return;
      const key = pitchDisplayKey(pitch);
      if (key === shownKey) return;
      shownKey = key;
      setInfo(pitch);
    }, POLL_MS);

    return () => window.clearInterval(interval);
  }, [trackId, active]);

  return info;
}
