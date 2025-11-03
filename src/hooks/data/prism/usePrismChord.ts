import { useQuery } from '@tanstack/react-query';
import {
  GetPrismChordsByNameData,
  useMusicAtlas,
} from '@/contexts/MusicAtlasContext';
import { PrismChordName } from './types';

export type PrismChordIntervals = GetPrismChordsByNameData['chord'];

export const usePrismChord = (name?: PrismChordName) => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['prism', 'chords', name],
    queryFn: async () => {
      if (!name) {
        throw new Error('Chord name is required');
      }

      return musicAtlas.music.getPrismChordsByName(name);
    },
    enabled: !!name,
  });
};
