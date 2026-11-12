/**
 * useGoLive — "Go Live" on a lesson, the one way every Office surface does
 * it (the Plan list, Today, a class's Overview, the top rail's menu):
 * publish the Day if it isn't yet, start a session students can join, and
 * open the teacher's live dashboard.
 *
 * NO SILENT MOCKS: a session that fell back to this device is never passed
 * off as a real one — the teacher confirms it (`confirmPracticeSession`), and
 * a declined one is torn down so it doesn't linger looking live.
 */
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { usePublishedDays } from '../publish/usePublishedDays';
import type { Day } from '../types';
import { useLocalSessionStore } from './useLocalSessionStore';
import {
  confirmPracticeSession,
  useStartClassroomSession,
} from './useStartClassroomSession';

export const useGoLive = (classroomId: string) => {
  const navigate = useNavigate();
  const { publishedDays, publishDayToClassroom } =
    usePublishedDays(classroomId);
  const { endSession } = useLocalSessionStore();
  const startClassroomSession = useStartClassroomSession();

  return useCallback(
    async (day: Day) => {
      try {
        const existing = publishedDays.find((pd) => pd.sourceRef === day.id);
        const pd =
          existing ?? (await publishDayToClassroom({ classroomId, day }));
        const started = await startClassroomSession({
          classroomId,
          publishedDayId: pd.id,
        });
        if (started.transport === 'local') {
          if (!confirmPracticeSession(started.reason)) {
            endSession(started.sessionId);
            return;
          }
        }
        navigate(
          TeacherRoutes.session({ classroomId, sessionId: started.sessionId }),
        );
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : 'Start session failed',
        );
      }
    },
    [
      classroomId,
      endSession,
      navigate,
      publishDayToClassroom,
      publishedDays,
      startClassroomSession,
    ],
  );
};
