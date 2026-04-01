import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const usePrismRhythmicPhrases = () => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['prism', 'rhythms', 'phrases'],
    queryFn: async () => {
      return musicAtlas.http.request<{
        phrases: Record<string, [number, number][][]>;
      }>({
        path: `/prism/rhythms/phrases`,
        method: 'GET',
        format: 'json',
      });
    },
  });
};
