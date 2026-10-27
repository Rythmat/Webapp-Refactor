import type {
  ActivityFlowV2,
  LessonInstrument,
} from '@/curriculum/types/activity.v2';

/** The instrument a flow is played on. Flows without one are piano. */
export function flowInstrument(flow: ActivityFlowV2): LessonInstrument {
  return flow.params.instrument ?? 'piano';
}

/** Whether a flow is played on a fretted instrument (guitar, bass, ukulele). */
export function isFrettedInstrument(
  instrument: LessonInstrument,
): instrument is 'guitar' | 'bass' | 'ukulele' {
  return (
    instrument === 'guitar' || instrument === 'bass' || instrument === 'ukulele'
  );
}

/**
 * Whether lessons on the instrument strum chord boxes (guitar, ukulele) —
 * bass plays its chords as arpeggios instead.
 */
export function hasChordShapes(
  instrument: LessonInstrument,
): instrument is 'guitar' | 'ukulele' {
  return instrument === 'guitar' || instrument === 'ukulele';
}
