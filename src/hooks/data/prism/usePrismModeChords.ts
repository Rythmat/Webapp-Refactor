import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import { PrismModeSlug } from './types';

export type PrismModeChordMap = {
  triads?: string[];
  tetrads?: string[];
  pentads?: string[];
  triadVariants?: string[];
  tetradVariants?: string[];
  pentadVariants?: string[];
  [key: string]: string[] | undefined;
};

export const usePrismModeChords = (mode?: PrismModeSlug) => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['prism', 'modes', mode, 'chords'],
    queryFn: async (): Promise<{ chords: PrismModeChordMap }> => {
      if (!mode) {
        throw new Error('Mode is required');
      }

      return musicAtlas.music.getPrismModesByModeChords(
        mode as Parameters<typeof musicAtlas.music.getPrismModesByModeChords>[0],
      ) as unknown as {
        chords: PrismModeChordMap;
      };
    },
    enabled: !!mode,
  });
};
