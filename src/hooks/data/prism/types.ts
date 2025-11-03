import { Api } from '@/contexts/MusicAtlasContext';

export type PrismChordName = Parameters<Api['music']['getPrismChordsByName']>[0];
export type PrismModeSlug = Parameters<Api['music']['getPrismModesByMode']>[0];
export type PrismModeFamily =
  Parameters<Api['music']['getPrismModesFamilyByFamily']>[0];
