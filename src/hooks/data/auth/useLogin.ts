import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PostAuthLoginPayload } from '@/contexts/MusicAtlasContext';
import { useGlobalMusicAtlas } from '@/contexts/MusicAtlasContext/api';

export const useLogin = () => {
  const musicAtlas = useGlobalMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PostAuthLoginPayload) => {
      return await musicAtlas.auth.postAuthLogin(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
};
