import { useMutation } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import { PostPlayAlongByIdFilesPayload } from '@/contexts/MusicAtlasContext/musicAtlas.generated';

export const useAddFileToPlayAlong = ({ id }: { id: string }) => {
  const musicAtlas = useMusicAtlas();

  return useMutation({
    mutationFn: (data: PostPlayAlongByIdFilesPayload) =>
      musicAtlas.playAlong.postPlayAlongByIdFiles(id, data),
  });
};
