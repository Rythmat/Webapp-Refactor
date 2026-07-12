/**
 * Module Session Protocol capabilities. Learn ships embeddable in Sprint 4;
 * other modules degrade to new-tab launchers until their MSP wiring lands.
 */
import { Env } from '@/constants/env';

export type AtlasModule = 'globe' | 'learn' | 'studio' | 'arcade';
export type AtlasExpects = 'completion' | 'score' | 'artifact';

export const MODULE_CAPABILITIES = {
  learn: { embeddable: true, expects: ['completion', 'score', 'artifact'] },
  studio: { embeddable: false, expects: ['artifact'] },
  arcade: { embeddable: false, expects: ['completion', 'score'] },
  globe: { embeddable: false, expects: ['completion'] },
} satisfies Record<
  AtlasModule,
  { embeddable: boolean; expects: readonly AtlasExpects[] }
>;

export const resolveMspModuleBaseUrl = (module: AtlasModule): string => {
  if (module === 'learn') {
    const learn = Env.get('VITE_MUSIC_ATLAS_LEARN_URL', { nullable: true });
    if (learn) return learn;
  }
  const api = Env.get('VITE_MUSIC_ATLAS_API_URL', { nullable: true });
  if (api) return `${api}/${module}`;
  return `/${module}`;
};

const safeOrigin = (url: string): string | null => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

export const isAllowedMspOrigin = (
  module: AtlasModule,
  candidate: string | null | undefined,
): boolean => {
  if (!candidate) return false;
  const base = safeOrigin(resolveMspModuleBaseUrl(module));
  if (!base) return false;
  return base === candidate;
};
