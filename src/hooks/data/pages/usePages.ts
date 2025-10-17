import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

/**
 * Hook to fetch all pages for dropdown or list
 */
export const usePages = (params?: { chapterId?: string }) => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['pages', params?.chapterId || 'all'],
    queryFn: async () => {
      return musicAtlas.pages.getPages({
        ...(params?.chapterId && { chapterId: params.chapterId }),
      });
    },
  });
};

export type Page = NonNullable<ReturnType<typeof usePages>['data']>[number];
