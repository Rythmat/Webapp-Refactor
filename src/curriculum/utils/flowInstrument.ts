import type {
  ActivityFlowV2,
  LessonInstrument,
} from '@/curriculum/types/activity.v2';

/** The instrument a flow is played on. Flows without one are piano. */
export function flowInstrument(flow: ActivityFlowV2): LessonInstrument {
  return flow.params.instrument ?? 'piano';
}

/** Whether a flow is played on a fretted instrument (guitar or bass). */
export function isFrettedInstrument(
  instrument: LessonInstrument,
): instrument is 'guitar' | 'bass' {
  return instrument === 'guitar' || instrument === 'bass';
}
