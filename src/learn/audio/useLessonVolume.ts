import { useSyncExternalStore } from 'react';
import {
  getLessonVolume,
  getLessonVolumeDb,
  setLessonVolume,
  subscribeLessonVolume,
} from './lessonVolumeStore';

/**
 * React binding for the lesson-wide volume store. Components that need to
 * react to the volume (e.g. to retune a metronome synth) call this hook;
 * presentational dials use it through <LessonVolumeDial>.
 */
export function useLessonVolume(): {
  volume: number;
  volumeDb: number;
  setVolume: (v: number) => void;
} {
  const volume = useSyncExternalStore(
    subscribeLessonVolume,
    getLessonVolume,
    getLessonVolume,
  );
  const volumeDb = useSyncExternalStore(
    subscribeLessonVolume,
    getLessonVolumeDb,
    getLessonVolumeDb,
  );
  return { volume, volumeDb, setVolume: setLessonVolume };
}
