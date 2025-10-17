import { useQuery } from '@tanstack/react-query';
import { PlayAlong, useMusicAtlas } from '@/contexts/MusicAtlasContext';

/**
 * Hook to fetch a play along by id
 */
export const usePlayAlong = ({ id }: { id: string }) => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['play-along', id],
    queryFn: async () => {
      try {
        return await musicAtlas.playAlong.getPlayAlongById(id);
      } catch (error) {
        console.error('Error fetching play along:', error);
        throw error;
      }
    },
  });
};

export type PlayAlong = PlayAlong.GetPlayAlongById.ResponseBody;
