import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const useDeletePlayAlongFile = ({
  playAlongId,
}: {
  playAlongId: string;
}) => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { type: 'audio' | 'midi' }) =>
      musicAtlas.playAlong.deletePlayAlongByIdFiles({
        id: playAlongId,
        type: data.type,
      }),
    onSuccess: () => {
      // Invalidate the query for the specific play along to refresh its data
      queryClient.invalidateQueries({ queryKey: ['play-along', playAlongId] });
    },
  });
};
