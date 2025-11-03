import { useQuery } from '@tanstack/react-query';
import {
  GetPrismModesByModeData,
  useMusicAtlas,
} from '@/contexts/MusicAtlasContext';
import { PrismModeSlug } from './types';

export type PrismModeSteps = GetPrismModesByModeData['steps'];

export const usePrismMode = (mode?: PrismModeSlug) => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['prism', 'modes', mode],
    queryFn: async () => {
      if (!mode) {
        throw new Error('Mode is required');
      }

      return musicAtlas.music.getPrismModesByMode(mode);
    },
    enabled: !!mode,
  });
};
