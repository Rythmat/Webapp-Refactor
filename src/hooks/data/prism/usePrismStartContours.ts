import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const usePrismStartContours = () => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['prism', 'contours'],
    queryFn: async () => {
      return musicAtlas.music.getPrismContoursStart();
    },
  });
};
