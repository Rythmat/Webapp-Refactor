import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const usePrismScaleDegrees = () => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['prism', 'scale-degrees'],
    queryFn: async () => {
      return musicAtlas.http.request<{ scaleDegrees: string[] }>({
        path: `/prism/scale-degrees`,
        method: 'GET',
        format: 'json',
      });
    },
  });
};
