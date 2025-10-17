import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const useDeletePhraseBar = (params: { mapId: string }) => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      musicAtlas.phraseMaps.deletePhraseMapsByIdBarsByBarId(params.mapId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phraseBars'] });
    },
  });
};
