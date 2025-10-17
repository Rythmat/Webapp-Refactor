import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PostAuthResetPasswordPayload } from '@/contexts/MusicAtlasContext';
import { useGlobalMusicAtlas } from '@/contexts/MusicAtlasContext/api';

export const useResetPassword = () => {
  const musicAtlas = useGlobalMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PostAuthResetPasswordPayload) => {
      return await musicAtlas.auth.postAuthResetPassword(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
};
