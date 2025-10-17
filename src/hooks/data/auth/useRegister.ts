import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PostAuthRegisterPayload } from '@/contexts/MusicAtlasContext';
import { useGlobalMusicAtlas } from '@/contexts/MusicAtlasContext/api';

export const useRegister = () => {
  const musicAtlas = useGlobalMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PostAuthRegisterPayload) => {
      return await musicAtlas.auth.postAuthRegister(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
};
