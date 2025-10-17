import { useMutation } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import { PostPlayAlongPayload } from '@/contexts/MusicAtlasContext/musicAtlas.generated';

export const useCreatePlayAlong = () => {
  const musicAtlas = useMusicAtlas();

  return useMutation({
    mutationFn: (data: PostPlayAlongPayload) =>
      musicAtlas.playAlong.postPlayAlong(data),
  });
};
