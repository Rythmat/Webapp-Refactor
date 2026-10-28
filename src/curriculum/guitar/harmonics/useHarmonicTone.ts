import { useCallback, useEffect, useRef } from 'react';
import { audioEngine } from '@/audio/AudioEngine';
import {
  HarmonicTone,
  type HarmonicTimbre,
} from '@/audio/harmonics/HarmonicTone';
import {
  getLessonVolume,
  subscribeLessonVolume,
} from '@/learn/audio/lessonVolumeStore';

/**
 * The activity's sound: harmonics as chimes, pressed notes as plucks, on the
 * instruments bus at the lesson volume. Made on the first sound (a gesture),
 * released on unmount.
 */
export function useHarmonicTone() {
  const toneRef = useRef<HarmonicTone | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeLessonVolume(() =>
      toneRef.current?.setVolume(getLessonVolume()),
    );
    return () => {
      unsubscribe();
      toneRef.current?.close();
      toneRef.current = null;
    };
  }, []);

  const play = useCallback((hz: number, timbre: HarmonicTimbre) => {
    toneRef.current ??= new HarmonicTone({
      output: audioEngine.channel('instruments', getLessonVolume()),
      resume: () => audioEngine.resume(),
    });
    toneRef.current.play(hz, timbre);
  }, []);

  const stop = useCallback(() => toneRef.current?.stop(), []);

  return { play, stop };
}
