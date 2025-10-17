import { useMutation } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import { PostPlayAlongByIdUploadUrlPayload } from '@/contexts/MusicAtlasContext/musicAtlas.generated';

export const useGetPlayAlongUploadUrl = ({ id }: { id: string }) => {
  const musicAtlas = useMusicAtlas();

  return useMutation({
    mutationFn: (data: PostPlayAlongByIdUploadUrlPayload) =>
      musicAtlas.playAlong.postPlayAlongByIdUploadUrl(id, data),
  });
};
