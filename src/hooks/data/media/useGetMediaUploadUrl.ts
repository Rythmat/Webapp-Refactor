import { useMutation } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import { PostMediaGetUploadUrlParams } from '@/contexts/MusicAtlasContext/musicAtlas.generated';

export const useGetMediaUploadUrl = () => {
  const musicAtlas = useMusicAtlas();

  return useMutation({
    mutationFn: (data: PostMediaGetUploadUrlParams) =>
      musicAtlas.media.postMediaGetUploadUrl(data),
  });
};
