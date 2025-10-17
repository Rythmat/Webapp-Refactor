import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import { PostPhraseMapsByIdBarsPayload } from '@/contexts/MusicAtlasContext/musicAtlas.generated';

export const useCreatePhraseBar = (id: string) => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PostPhraseMapsByIdBarsPayload) =>
      musicAtlas.phraseMaps.postPhraseMapsByIdBars(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phraseBars'] });
    },
  });
};
