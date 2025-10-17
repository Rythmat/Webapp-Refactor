import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

/**
 * Hook to update a page
 */
export const useUpdatePage = () => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      content,
      color,
    }: {
      id: string;
      content?: string;
      color?: string | null;
      name?: string;
    }) => {
      return musicAtlas.pages.patchPagesById(id, {
        content,
        color,
        name,
      });
    },
    onSuccess: (_, variables) => {
      toast.success('Page updated');
      queryClient.invalidateQueries({
        queryKey: ['pages'],
      });
      queryClient.invalidateQueries({
        queryKey: ['page', variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['chapter'],
      });
    },
  });
};
