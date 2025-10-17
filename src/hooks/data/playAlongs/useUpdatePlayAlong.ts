import { useMutation } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import { PatchPlayAlongByIdPayload } from '@/contexts/MusicAtlasContext/musicAtlas.generated';

export const useUpdatePlayAlong = ({ id }: { id: string }) => {
  const musicAtlas = useMusicAtlas();

  return useMutation({
    mutationFn: (data: PatchPlayAlongByIdPayload) =>
      musicAtlas.playAlong.patchPlayAlongById(id, data),
  });
};
