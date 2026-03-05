import type { LessonProgressResponse, ProgressSummaryResponse } from './types';

const SUMMARY_KEY = 'progressSummary:v1';
const lessonKey = (lessonId: string, lessonVersion: number) =>
  `lessonProgress:${lessonId}:${lessonVersion}:v1`;

function readJson<T>(key: string): T | undefined {
  if (typeof window === 'undefined') return undefined;
  const raw = window.localStorage.getItem(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota/storage failures
  }
}

export const progressLocalCache = {
  getSummary: () => readJson<ProgressSummaryResponse>(SUMMARY_KEY),
  setSummary: (value: ProgressSummaryResponse) => writeJson(SUMMARY_KEY, value),
  getLesson: (lessonId: string, lessonVersion: number) =>
    readJson<LessonProgressResponse>(lessonKey(lessonId, lessonVersion)),
  setLesson: (
    lessonId: string,
    lessonVersion: number,
    value: LessonProgressResponse,
  ) => writeJson(lessonKey(lessonId, lessonVersion), value),
};
