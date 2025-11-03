import { useQuery } from '@tanstack/react-query';
import {
  GetPrismChordsProgressionsData,
  useMusicAtlas,
} from '@/contexts/MusicAtlasContext';

export type PrismChordProgressionKey =
  GetPrismChordsProgressionsData['keys'][number];

export const usePrismChordsProgressions = () => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['prism', 'chords', 'progressions'],
    queryFn: async () => {
      return musicAtlas.music.getPrismChordsProgressions();
    },
  });
};
