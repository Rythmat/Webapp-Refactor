import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

/**
 * Hook to create a new page
 */
export const useCreatePage = () => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      chapterId,
      content,
      color,
      name,
    }: {
      chapterId: string;
      content: string;
      color?: string;
      name?: string;
    }) => {
      return musicAtlas.pages.postPages({
        chapterId,
        content,
        color,
        name,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['pages'],
      });
      queryClient.invalidateQueries({
        queryKey: ['chapters'],
      });
      queryClient.invalidateQueries({
        queryKey: ['chapter', variables.chapterId],
      });
      queryClient.invalidateQueries({
        queryKey: ['chapter', variables.chapterId, 'pages'],
      });
    },
  });
};
