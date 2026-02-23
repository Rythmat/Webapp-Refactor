import type { LessonProgressResponse } from './types';

export interface ActivityResumeCandidate {
  activityInstanceId: string;
}

export function selectResumeActivityIndex(params: {
  activities: ActivityResumeCandidate[];
  progress: LessonProgressResponse | undefined;
}): number {
  const { activities, progress } = params;
  if (activities.length === 0) return -1;

  const progressMap = progress?.progressByActivityInstanceId ?? {};
  const currentId = progress?.currentActivityInstanceId;

  if (currentId) {
    const idx = activities.findIndex((a) => a.activityInstanceId === currentId);
    const status = idx >= 0 ? progressMap[currentId]?.status : undefined;
    if (idx >= 0 && status !== 'COMPLETED') {
      return idx;
    }
  }

  const firstNotStartedIdx = activities.findIndex((a) => {
    const status = progressMap[a.activityInstanceId]?.status;
    return status == null || status === 'NOT_STARTED';
  });

  if (firstNotStartedIdx >= 0) return firstNotStartedIdx;
  return -1;
}
