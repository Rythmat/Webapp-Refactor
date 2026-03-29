import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export type IntervalInfo = {
  n: string;
  s?: string;
  f?: string;
};

export const usePrismIntervals = () => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['prism', 'intervals'],
    queryFn: async () => {
      return musicAtlas.http.request<{
        intervals: Record<string, IntervalInfo>;
      }>({
        path: `/prism/intervals`,
        method: 'GET',
        format: 'json',
      });
    },
  });
};
