import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import { PatchPhraseMapsByIdPayload } from '@/contexts/MusicAtlasContext/musicAtlas.generated';

export const useUpdatePhraseMap = (id: string) => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PatchPhraseMapsByIdPayload) =>
      musicAtlas.phraseMaps.patchPhraseMapsById(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phraseMaps'] });
    },
  });
};
