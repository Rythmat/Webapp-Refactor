import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const usePrismRhythmStyling = () => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['prism', 'rhythms', 'styling'],
    queryFn: async () => {
      return musicAtlas.http.request<{
        styling: Record<string, string[]>;
      }>({
        path: `/prism/rhythms/styling`,
        method: 'GET',
        format: 'json',
      });
    },
  });
};
