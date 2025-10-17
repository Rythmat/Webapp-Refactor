import { useInfiniteQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import { PhraseMaps as PhraseMapsType } from '@/contexts/MusicAtlasContext/musicAtlas.generated';

export const usePhraseMaps = (params?: { pageSize?: number }) => {
  const musicAtlas = useMusicAtlas();
  const pageSize = params?.pageSize || 10;

  return useInfiniteQuery({
    queryKey: ['phraseMaps', params],
    queryFn: ({ pageParam = 1 }) =>
      musicAtlas.phraseMaps.getPhraseMaps({
        page: pageParam,
        pageSize,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
  });
};

export type PhraseMaps = PhraseMapsType.GetPhraseMaps.ResponseBody['data'];
