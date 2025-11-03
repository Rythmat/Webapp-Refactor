import { useQuery } from '@tanstack/react-query';
import {
  GetPrismModesFamilyByFamilyData,
  useMusicAtlas,
} from '@/contexts/MusicAtlasContext';
import { PrismModeFamily } from './types';

export type PrismModeFamilyDetail = GetPrismModesFamilyByFamilyData['modes'];

export const usePrismModeFamily = (family?: PrismModeFamily) => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['prism', 'modeFamilies', family],
    queryFn: async () => {
      if (!family) {
        throw new Error('Mode family is required');
      }

      return musicAtlas.music.getPrismModesFamilyByFamily(family);
    },
    enabled: !!family,
  });
};
