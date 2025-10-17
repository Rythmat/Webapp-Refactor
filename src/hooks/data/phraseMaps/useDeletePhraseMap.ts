import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const useDeletePhraseMap = (id: string) => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => musicAtlas.phraseMaps.deletePhraseMapsById(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phraseMaps'] });
    },
  });
};
