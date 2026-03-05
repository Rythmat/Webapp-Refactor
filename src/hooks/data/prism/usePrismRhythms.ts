import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const usePrismRhythms = () => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['prism', 'rhythms', 'rhythm'],
    queryFn: async () => {
      return musicAtlas.music.getPrismRhythms();
    },
  });
};
