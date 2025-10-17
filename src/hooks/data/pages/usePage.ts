import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

/**
 * Hook to fetch a single page by ID
 */
export const usePage = (pageId?: string) => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['page', pageId],
    queryFn: async () => {
      if (!pageId) throw new Error('Page ID is required');
      return musicAtlas.pages.getPagesById(pageId);
    },
    enabled: !!pageId,
  });
};
