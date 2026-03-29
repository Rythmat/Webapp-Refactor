import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const usePrismBassRhythms = () => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['prism', 'rhythms', 'bass'],
    queryFn: async () => {
      const res = await musicAtlas.http.request<{ bassRhythms: Record<string, [number, number][]> }>({
        path: `/prism/rhythms/bass`,
        method: 'GET',
        format: 'json',
      });
      return res.data;
    },
  });
};
