import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const usePrismDrumGrooves = () => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['prism', 'drums', 'grooves'],
    queryFn: async () => {
      const res = await musicAtlas.http.request<{ grooves: Record<string, Record<string, string[]>> }>({
        path: `/prism/drums/grooves`,
        method: 'GET',
        format: 'json',
      });
      return res.data;
    },
  });
};
