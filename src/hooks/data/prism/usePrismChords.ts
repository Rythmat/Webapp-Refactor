import { useQuery } from '@tanstack/react-query';
import { GetPrismChordsData, useMusicAtlas } from '@/contexts/MusicAtlasContext';

export type PrismChordList = GetPrismChordsData['chords'];
export type PrismChordListItem = GetPrismChordsData['chords'][number];

export const usePrismChords = () => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['prism', 'chords'],
    queryFn: async () => {
      return musicAtlas.music.getPrismChords();
    },
  });
};
