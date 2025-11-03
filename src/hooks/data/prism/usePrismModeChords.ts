import { useQuery } from '@tanstack/react-query';
import {
  GetPrismModesByModeChordsData,
  useMusicAtlas,
} from '@/contexts/MusicAtlasContext';
import { PrismModeSlug } from './types';

export type PrismModeChordMap = GetPrismModesByModeChordsData['chords'];

export const usePrismModeChords = (mode?: PrismModeSlug) => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['prism', 'modes', mode, 'chords'],
    queryFn: async () => {
      if (!mode) {
        throw new Error('Mode is required');
      }

      return musicAtlas.music.getPrismModesByModeChords(mode);
    },
    enabled: !!mode,
  });
};
