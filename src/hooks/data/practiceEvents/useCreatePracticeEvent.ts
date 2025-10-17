import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const useCreatePracticeEvent = () => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pageId: string) =>
      musicAtlas.practiceEvents.postPracticeEvents({ pageId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practice-events'] });
    },
  });
};
