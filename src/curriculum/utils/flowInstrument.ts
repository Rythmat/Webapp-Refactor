import type {
  ActivityFlowV2,
  LessonInstrument,
} from '@/curriculum/types/activity.v2';

/** The instrument a flow is played on. Flows without one are piano. */
export function flowInstrument(flow: ActivityFlowV2): LessonInstrument {
  return flow.params.instrument ?? 'piano';
}
