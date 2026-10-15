import type { RegionId } from '@/components/atlas/types';

/**
 * Guided-tour ids, apart from the tours themselves so a tile can link to a
 * tour without bundling every tour's text.
 */
export const regionTourId = (regionId: RegionId | string) =>
  `region-${regionId}`;
export const cityTourId = (cityId: string) => `city-${cityId}`;
