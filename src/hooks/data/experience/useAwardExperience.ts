import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { cortexIdForLesson } from '@/features/cortex/ids';
import { markCurrentDone, recordDone } from '@/features/cortex/ledger';
import { reportChallengeEvent } from '@/lib/challenges/eventBus';
import { experienceApi } from '@/lib/experience/api';

export const useAwardLessonActivityExperience = () => {
  const token = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activityId: string) => {
      if (!token) throw new Error('Not authenticated');
      return experienceApi.awardLessonActivity(token, activityId);
    },
    onSuccess: (_data, activityId) => {
      queryClient.invalidateQueries({ queryKey: ['experienceSummary'] });
      reportChallengeEvent({ kind: 'activity_completed', activityId });
    },
  });
};

export const useAwardLessonCompletionExperience = () => {
  const token = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lessonId: string) => {
      if (!token) throw new Error('Not authenticated');
      return experienceApi.awardLessonCompletion(token, lessonId);
    },
    // They finished it whether or not the XP request gets through.
    onMutate: (lessonId) => {
      const cortexId = cortexIdForLesson(lessonId);
      if (cortexId) recordDone(cortexId);
      else markCurrentDone();
    },
    onSuccess: (_data, lessonId) => {
      queryClient.invalidateQueries({ queryKey: ['experienceSummary'] });
      reportChallengeEvent({ kind: 'lesson_completed', lessonId });
    },
  });
};

export const useAwardArcadeExperience = () => {
  const token = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('Not authenticated');
      return experienceApi.awardArcade(token);
    },
    onMutate: () => markCurrentDone(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experienceSummary'] });
    },
  });
};

// Helper to award activity XP by activity id
export const awardActivityXP = async (token: string, activityId: string) =>
  experienceApi.awardLessonActivity(token, activityId);

// Helper to award lesson completion XP by lesson id
export const awardLessonXP = async (token: string, lessonId: string) =>
  experienceApi.awardLessonCompletion(token, lessonId);
