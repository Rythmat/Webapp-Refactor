import { useCallback } from 'react';
import type { HistoricalEvent } from '@/components/atlas/types';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export interface ParsedQuery {
  year?: number;
  decade?: number;
  city?: { name: string; lat: number; lng: number };
  genres: string[];
}

export interface SearchResult {
  results: HistoricalEvent[];
  parsed: ParsedQuery;
}

export function useMusicSearch() {
  const musicAtlas = useMusicAtlas();

  return useCallback(
    async (query: string): Promise<SearchResult> => {
      if (!query.trim()) {
        return { results: [], parsed: { genres: [] } };
      }

      const response = (await musicAtlas.atlas.getAtlasSearch({
        q: query,
      })) as {
        data?: HistoricalEvent[];
        parsed?: ParsedQuery;
      };

      return {
        results: response.data ?? [],
        parsed: response.parsed ?? { genres: [] },
      };
    },
    [musicAtlas],
  );
}
