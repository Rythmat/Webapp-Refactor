import { useMutation } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const useDeletePlayAlong = () => {
  const musicAtlas = useMusicAtlas();

  return useMutation({
    mutationFn: (id: string) => musicAtlas.playAlong.deletePlayAlongById(id),
  });
};
