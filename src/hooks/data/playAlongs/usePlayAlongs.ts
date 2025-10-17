import { useInfiniteQuery } from '@tanstack/react-query';
import { PlayAlong, useMusicAtlas } from '@/contexts/MusicAtlasContext';

/**
 * Hook to fetch all play along-s
 */
export const usePlayAlongs = (params?: { pageSize?: number }) => {
  const musicAtlas = useMusicAtlas();
  const pageSize = params?.pageSize || 20;

  return useInfiniteQuery({
    queryKey: ['play-alongs', params],
    queryFn: async ({ pageParam = 1 }) => {
      try {
        return await musicAtlas.playAlong.getPlayAlong({
          page: pageParam,
          pageSize,
        });
      } catch (error) {
        console.error('Error fetching play alongs:', error);
        throw error;
      }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination?.page < lastPage.pagination?.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
  });
};

export type PlayAlongListItem =
  PlayAlong.GetPlayAlong.ResponseBody['data'][number];
