import { useQuery } from '@tanstack/react-query';
import { GetPrismModesData, useMusicAtlas } from '@/contexts/MusicAtlasContext';

export type PrismModesMap = GetPrismModesData['modes'];

export const usePrismModes = () => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['prism', 'modes'],
    queryFn: async () => {
      return musicAtlas.music.getPrismModes();
    },
  });
};
