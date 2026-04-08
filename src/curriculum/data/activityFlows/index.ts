/**
 * Auto-generated barrel for activity flow data.
 * Lazy-loaded per genre to minimize initial bundle.
 */

import type { ActivityFlow } from '../../types/activity';
import type { FundamentalsFlow } from '../../types/fundamentals';

const USE_V2_FUNK = true;

// ---------------------------------------------------------------------------
// Lazy loaders
// ---------------------------------------------------------------------------

const cache = new Map<string, ActivityFlow[]>();

export async function loadAfricanFlows(): Promise<ActivityFlow[]> {
  const key = 'african';
  if (cache.has(key)) return cache.get(key)!;
  const mod = await import('./african');
  const flows = [...mod.africanFlows];
  cache.set(key, flows);
  return flows;
}

export async function loadBluesFlows(): Promise<ActivityFlow[]> {
  const key = 'blues';
  if (cache.has(key)) return cache.get(key)!;
  const mod = await import('./blues');
  const flows = [...mod.bluesFlows];
  cache.set(key, flows);
  return flows;
}

export async function loadElectronicFlows(): Promise<ActivityFlow[]> {
  const key = 'electronic';
  if (cache.has(key)) return cache.get(key)!;
  const mod = await import('./electronic');
  const flows = [...mod.electronicFlows];
  cache.set(key, flows);
  return flows;
}

export async function loadFolkFlows(): Promise<ActivityFlow[]> {
  const key = 'folk';
  if (cache.has(key)) return cache.get(key)!;
  const mod = await import('./folk');
  const flows = [...mod.folkFlows];
  cache.set(key, flows);
  return flows;
}

export async function loadFunkFlows(): Promise<ActivityFlow[]> {
  const key = 'funk';
  if (cache.has(key)) return cache.get(key)!;
  const mod = USE_V2_FUNK
    ? await import('./funk_v2')
    : await import('./funk');
  const flows = [...mod.funkFlows];
  cache.set(key, flows);
  return flows;
}

export async function loadHipHopFlows(): Promise<ActivityFlow[]> {
  const key = 'hipHop';
  if (cache.has(key)) return cache.get(key)!;
  const mod = await import('./hipHop');
  const flows = [...mod.hipHopFlows];
  cache.set(key, flows);
  return flows;
}

export async function loadJamBandFlows(): Promise<ActivityFlow[]> {
  const key = 'jamBand';
  if (cache.has(key)) return cache.get(key)!;
  const mod = await import('./jamBand');
  const flows = [...mod.jamBandFlows];
  cache.set(key, flows);
  return flows;
}

export async function loadJazzFlows(): Promise<ActivityFlow[]> {
  const key = 'jazz';
  if (cache.has(key)) return cache.get(key)!;
  const mod = await import('./jazz');
  const flows = [...mod.jazzFlows];
  cache.set(key, flows);
  return flows;
}

export async function loadLatinFlows(): Promise<ActivityFlow[]> {
  const key = 'latin';
  if (cache.has(key)) return cache.get(key)!;
  const mod = await import('./latin');
  const flows = [...mod.latinFlows];
  cache.set(key, flows);
  return flows;
}

export async function loadNeoSoulFlows(): Promise<ActivityFlow[]> {
  const key = 'neoSoul';
  if (cache.has(key)) return cache.get(key)!;
  const mod = await import('./neoSoul');
  const flows = [...mod.neoSoulFlows];
  cache.set(key, flows);
  return flows;
}

export async function loadPopFlows(): Promise<ActivityFlow[]> {
  const key = 'pop';
  if (cache.has(key)) return cache.get(key)!;
  const mod = await import('./pop');
  const flows = [...mod.popFlows];
  cache.set(key, flows);
  return flows;
}

export async function loadReggaeFlows(): Promise<ActivityFlow[]> {
  const key = 'reggae';
  if (cache.has(key)) return cache.get(key)!;
  const mod = await import('./reggae');
  const flows = [...mod.reggaeFlows];
  cache.set(key, flows);
  return flows;
}

export async function loadRnbFlows(): Promise<ActivityFlow[]> {
  const key = 'rnb';
  if (cache.has(key)) return cache.get(key)!;
  const mod = await import('./rnb');
  const flows = [...mod.rnbFlows];
  cache.set(key, flows);
  return flows;
}

export async function loadRockFlows(): Promise<ActivityFlow[]> {
  const key = 'rock';
  if (cache.has(key)) return cache.get(key)!;
  const mod = await import('./rock');
  const flows = [...mod.rockFlows];
  cache.set(key, flows);
  return flows;
}

let fundamentalsCache: FundamentalsFlow | null = null;

export async function loadPianoFundamentals(): Promise<FundamentalsFlow> {
  if (fundamentalsCache) return fundamentalsCache;
  const mod = await import('./pianoFundamentals');
  fundamentalsCache = mod.pianoFundamentalsFlow;
  return fundamentalsCache;
}

export async function loadAllFlows(): Promise<Map<string, ActivityFlow[]>> {
  const all = new Map<string, ActivityFlow[]>();
  const loaders = [
    ['african', loadAfricanFlows] as const,
    ['blues', loadBluesFlows] as const,
    ['electronic', loadElectronicFlows] as const,
    ['folk', loadFolkFlows] as const,
    ['funk', loadFunkFlows] as const,
    ['hipHop', loadHipHopFlows] as const,
    ['jamBand', loadJamBandFlows] as const,
    ['jazz', loadJazzFlows] as const,
    ['latin', loadLatinFlows] as const,
    ['neoSoul', loadNeoSoulFlows] as const,
    ['pop', loadPopFlows] as const,
    ['reggae', loadReggaeFlows] as const,
    ['rnb', loadRnbFlows] as const,
    ['rock', loadRockFlows] as const,
  ];
  await Promise.all(
    loaders.map(async ([id, loader]) => {
      all.set(id, await loader());
    }),
  );
  return all;
}

/** Normalize URL slugs (hip hop, neo-soul, jam band) to loader keys */
const SLUG_TO_FLOW_KEY: Record<string, string> = {
  'hip hop': 'hipHop',
  'neo-soul': 'neoSoul',
  'jam band': 'jamBand',
};

export async function getActivityFlow(
  genreId: string,
  level: number,
): Promise<ActivityFlow | null> {
  const loaderMap: Record<string, () => Promise<ActivityFlow[]>> = {
    african: loadAfricanFlows,
    blues: loadBluesFlows,
    electronic: loadElectronicFlows,
    folk: loadFolkFlows,
    funk: loadFunkFlows,
    hipHop: loadHipHopFlows,
    jamBand: loadJamBandFlows,
    jazz: loadJazzFlows,
    latin: loadLatinFlows,
    neoSoul: loadNeoSoulFlows,
    pop: loadPopFlows,
    reggae: loadReggaeFlows,
    rnb: loadRnbFlows,
    rock: loadRockFlows,
  };
  const normalizedId = SLUG_TO_FLOW_KEY[genreId] ?? genreId;
  const loader = loaderMap[normalizedId];
  if (!loader) return null;
  const flows = await loader();
  return flows.find((f) => f.level === level) ?? null;
}
