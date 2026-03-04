import { useState, useEffect, useRef } from 'react';
import { getTrackAudioState } from './usePlaybackEngine';
import { VocalFxAdapter } from '@/daw/instruments/VocalFxAdapter';
import type { PitchInfo } from '@/daw/audio/pitch-correction/PitchCorrectionNode';

const POLL_MS = 50; // 20Hz refresh

export function usePitchInfo(trackId: string): PitchInfo {
  const [info, setInfo] = useState<PitchInfo>({ detected: 0, corrected: 0 });
  const intervalRef = useRef<number>(0);

  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      const state = getTrackAudioState(trackId);
      if (state?.instrument instanceof VocalFxAdapter) {
        const pitch = state.instrument.getPitchInfo();
        if (pitch) {
          setInfo(pitch);
        }
      }
    }, POLL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [trackId]);

  return info;
}
