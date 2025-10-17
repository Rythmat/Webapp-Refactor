import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PostAuthRecoverPasswordPayload } from '@/contexts/MusicAtlasContext';
import { useGlobalMusicAtlas } from '@/contexts/MusicAtlasContext/api';

export const useRecoverPassword = () => {
  const musicAtlas = useGlobalMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PostAuthRecoverPasswordPayload) => {
      return await musicAtlas.auth.postAuthRecoverPassword(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
};
