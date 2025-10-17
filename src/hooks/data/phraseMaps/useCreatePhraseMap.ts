import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import { PostPhraseMapsPayload } from '@/contexts/MusicAtlasContext/musicAtlas.generated';

export const useCreatePhraseMap = () => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PostPhraseMapsPayload) =>
      musicAtlas.phraseMaps.postPhraseMaps(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phraseMaps'] });
    },
  });
};
