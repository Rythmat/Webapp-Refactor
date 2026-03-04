export type ActivityProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface LessonProgressEntry {
  status: ActivityProgressStatus;
  attempts: number;
  score?: number | null;
  resumePayloadJson?: unknown;
  updatedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface LessonProgressResponse {
  currentActivityInstanceId: string | null;
  progressByActivityInstanceId: Record<string, LessonProgressEntry>;
}

export interface ProgressSummaryLesson {
  lessonId: string;
  lessonVersion: number;
  mode?: string | null;
  root?: string | null;
  currentActivityInstanceId: string | null;
  completedCount: number;
  totalCount: number | null;
  updatedAt: string;
}

export interface ProgressSummaryResponse {
  lessons: ProgressSummaryLesson[];
}

export interface ProgressActivityPatch {
  activityInstanceId: string;
  lessonId: string;
  lessonVersion: number;
  activityDefId: string;
  mode: string;
  root: string;
  status: ActivityProgressStatus;
  attemptsDelta?: number;
  score?: number | null;
  resumePayloadJson?: unknown;
}

export interface LessonStatePatch {
  lessonId: string;
  lessonVersion: number;
  currentActivityInstanceId: string | null;
}
