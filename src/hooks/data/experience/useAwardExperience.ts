import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { experienceApi } from '@/lib/experience/api';

export const useAwardLessonActivityExperience = () => {
  const token = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activityId: string) => {
      if (!token) throw new Error('Not authenticated');
      return experienceApi.awardLessonActivity(token, activityId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experienceSummary'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experienceSummary'] });
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
