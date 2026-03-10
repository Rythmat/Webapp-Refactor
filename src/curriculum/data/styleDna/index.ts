/**
 * Auto-generated barrel for Style DNA data.
 */

import type { StyleDnaLevel } from './types';
export type { ArtistReference, VocabularyEntry, StyleDnaLevel } from './types';

const cache = new Map<string, StyleDnaLevel[]>();

export async function loadAfricanStyleDna(): Promise<StyleDnaLevel[]> {
  if (cache.has('african')) return cache.get('african')!;
  const mod = await import('./african');
  cache.set('african', mod.africanStyleDna);
  return mod.africanStyleDna;
}

export async function loadBluesStyleDna(): Promise<StyleDnaLevel[]> {
  if (cache.has('blues')) return cache.get('blues')!;
  const mod = await import('./blues');
  cache.set('blues', mod.bluesStyleDna);
  return mod.bluesStyleDna;
}

export async function loadElectronicStyleDna(): Promise<StyleDnaLevel[]> {
  if (cache.has('electronic')) return cache.get('electronic')!;
  const mod = await import('./electronic');
  cache.set('electronic', mod.electronicStyleDna);
  return mod.electronicStyleDna;
}

export async function loadFolkStyleDna(): Promise<StyleDnaLevel[]> {
  if (cache.has('folk')) return cache.get('folk')!;
  const mod = await import('./folk');
  cache.set('folk', mod.folkStyleDna);
  return mod.folkStyleDna;
}

export async function loadFunkStyleDna(): Promise<StyleDnaLevel[]> {
  if (cache.has('funk')) return cache.get('funk')!;
  const mod = await import('./funk');
  cache.set('funk', mod.funkStyleDna);
  return mod.funkStyleDna;
}

export async function loadHipHopStyleDna(): Promise<StyleDnaLevel[]> {
  if (cache.has('hipHop')) return cache.get('hipHop')!;
  const mod = await import('./hipHop');
  cache.set('hipHop', mod.hipHopStyleDna);
  return mod.hipHopStyleDna;
}

export async function loadJamBandStyleDna(): Promise<StyleDnaLevel[]> {
  if (cache.has('jamBand')) return cache.get('jamBand')!;
  const mod = await import('./jamBand');
  cache.set('jamBand', mod.jamBandStyleDna);
  return mod.jamBandStyleDna;
}

export async function loadJazzStyleDna(): Promise<StyleDnaLevel[]> {
  if (cache.has('jazz')) return cache.get('jazz')!;
  const mod = await import('./jazz');
  cache.set('jazz', mod.jazzStyleDna);
  return mod.jazzStyleDna;
}

export async function loadLatinStyleDna(): Promise<StyleDnaLevel[]> {
  if (cache.has('latin')) return cache.get('latin')!;
  const mod = await import('./latin');
  cache.set('latin', mod.latinStyleDna);
  return mod.latinStyleDna;
}

export async function loadNeoSoulStyleDna(): Promise<StyleDnaLevel[]> {
  if (cache.has('neoSoul')) return cache.get('neoSoul')!;
  const mod = await import('./neoSoul');
  cache.set('neoSoul', mod.neoSoulStyleDna);
  return mod.neoSoulStyleDna;
}

export async function loadPopStyleDna(): Promise<StyleDnaLevel[]> {
  if (cache.has('pop')) return cache.get('pop')!;
  const mod = await import('./pop');
  cache.set('pop', mod.popStyleDna);
  return mod.popStyleDna;
}

export async function loadReggaeStyleDna(): Promise<StyleDnaLevel[]> {
  if (cache.has('reggae')) return cache.get('reggae')!;
  const mod = await import('./reggae');
  cache.set('reggae', mod.reggaeStyleDna);
  return mod.reggaeStyleDna;
}

export async function loadRnbStyleDna(): Promise<StyleDnaLevel[]> {
  if (cache.has('rnb')) return cache.get('rnb')!;
  const mod = await import('./rnb');
  cache.set('rnb', mod.rnbStyleDna);
  return mod.rnbStyleDna;
}

export async function loadRockStyleDna(): Promise<StyleDnaLevel[]> {
  if (cache.has('rock')) return cache.get('rock')!;
  const mod = await import('./rock');
  cache.set('rock', mod.rockStyleDna);
  return mod.rockStyleDna;
}

export async function getStyleDna(
  genreId: string,
): Promise<StyleDnaLevel[] | null> {
  const loaderMap: Record<string, () => Promise<StyleDnaLevel[]>> = {
    african: loadAfricanStyleDna,
    blues: loadBluesStyleDna,
    electronic: loadElectronicStyleDna,
    folk: loadFolkStyleDna,
    funk: loadFunkStyleDna,
    hipHop: loadHipHopStyleDna,
    jamBand: loadJamBandStyleDna,
    jazz: loadJazzStyleDna,
    latin: loadLatinStyleDna,
    neoSoul: loadNeoSoulStyleDna,
    pop: loadPopStyleDna,
    reggae: loadReggaeStyleDna,
    rnb: loadRnbStyleDna,
    rock: loadRockStyleDna,
  };
  const loader = loaderMap[genreId];
  if (!loader) return null;
  return loader();
}
