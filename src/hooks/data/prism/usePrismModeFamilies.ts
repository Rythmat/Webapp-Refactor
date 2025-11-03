import { useQuery } from '@tanstack/react-query';
import {
  GetPrismModesFamilyData,
  useMusicAtlas,
} from '@/contexts/MusicAtlasContext';

export type PrismModeFamilyList = GetPrismModesFamilyData['families'];
export type PrismModeFamilyOption =
  GetPrismModesFamilyData['families'][number];

export const usePrismModeFamilies = () => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['prism', 'modeFamilies'],
    queryFn: async () => {
      return musicAtlas.music.getPrismModesFamily();
    },
  });
};
