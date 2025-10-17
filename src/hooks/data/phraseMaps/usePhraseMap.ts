import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas, PhraseMaps } from '@/contexts/MusicAtlasContext';

export const usePhraseMap = (id: string) => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['phraseMaps', id],
    queryFn: () => musicAtlas.phraseMaps.getPhraseMapsById(id),
  });
};

export type PhraseMap = PhraseMaps.GetPhraseMapsById.ResponseBody;
export type PhraseBar = PhraseMap['PhraseBars'][number];
export type PhraseBarNote = PhraseBar['PhraseBarNotes'][number];
