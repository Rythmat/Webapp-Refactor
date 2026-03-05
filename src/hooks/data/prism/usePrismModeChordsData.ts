import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import { PrismModeSlug } from './types';

export type PrismModeChordDataMap = {
  triads?: number[][];
  tetrads?: number[][];
  pentads?: number[][];
  [key: string]: number[][] | undefined;
};

export const usePrismModeChordsData = (mode?: PrismModeSlug) => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['prism', 'modes', mode, 'chords-data'],
    queryFn: async (): Promise<{ chords: PrismModeChordDataMap }> => {
      if (!mode) {
        throw new Error('Mode is required');
      }

      const client = musicAtlas.music as unknown as {
        getPrismModesByModeChordsData?: (
          mode: PrismModeSlug,
        ) => Promise<{ chords: PrismModeChordDataMap }>;
      };

      if (client.getPrismModesByModeChordsData) {
        return client.getPrismModesByModeChordsData(mode);
      }

      // Fallback for when the generated client hasn't been updated yet.
      return musicAtlas.http.request<
        { chords: PrismModeChordDataMap },
        unknown
      >({
        path: `/prism/modes/${mode}/chords/data`,
        method: 'GET',
        format: 'json',
      });
    },
    enabled: !!mode,
  });
};
