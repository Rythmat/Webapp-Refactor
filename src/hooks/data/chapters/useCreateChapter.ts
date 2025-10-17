import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

/**
 * Hook to create a new chapter
 */
export const useCreateChapter = () => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      color,
      initialPage,
    }: {
      name: string;
      description?: string;
      color?: string;
      initialPage?: { content: string };
    }) => {
      return musicAtlas.chapters.postChapters({
        name,
        description,
        color,
        initialPage,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['chapters'],
      });
    },
  });
};
