/**
 * lessonVolumeStore.ts — Module-level store for the lesson volume dial.
 *
 * Centralises the 0..1 volume value used by every lesson surface so the dial
 * stays in sync across the genre container, fundamentals container, and the
 * activity components used by the theory lessons. The value itself, and its
 * persistence, are in lessonVolumeValue.ts.
 *
 * Side-effect: applies the current value to the global piano sampler whenever
 * it changes, which covers note playback in every lesson surface.
 */

import { setPianoSamplerVolume } from '@/audio/pianoSampler';
import { getLessonVolumeDb, subscribeLessonVolume } from './lessonVolumeValue';

export {
  getLessonVolume,
  getLessonVolumeDb,
  lessonVolumeToDb,
  setLessonVolume,
  subscribeLessonVolume,
} from './lessonVolumeValue';

// Apply the persisted level to the sampler at module load so the very first
// note in any lesson respects the saved volume even before the dial mounts.
setPianoSamplerVolume(getLessonVolumeDb());
subscribeLessonVolume(() => setPianoSamplerVolume(getLessonVolumeDb()));
