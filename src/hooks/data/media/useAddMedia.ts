import { useMutation } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import { PostMediaPayload } from '@/contexts/MusicAtlasContext/musicAtlas.generated';

export const useAddMedia = () => {
  const musicAtlas = useMusicAtlas();

  return useMutation({
    mutationFn: (data: PostMediaPayload) => musicAtlas.media.postMedia(data),
  });
};
