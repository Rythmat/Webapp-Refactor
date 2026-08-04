import type { ActivityFlow } from '@/curriculum/types/activity';
import type { FundamentalsFlow } from '@/curriculum/types/fundamentals';
import { fetchBundle, isContentCdnEnabled } from './manifest';

/**
 * Lesson content — genre activity flows and Piano Fundamentals.
 *
 * The easiest of the three stores to migrate: every consumer already went
 * through the async `getActivityFlow(genre, level)` / `loadPianoFundamentals()`
 * accessors, because flows were lazily code-split per genre. So unlike the
 * globe events and the song library, this needed no stable-identity trick and
 * no <ContentGate> — the accessors simply await hydration internally.
 *
 * Flows carry no id of their own upstream (they were addressed by the
 * (genre, level) tuple), so the published body adds `id: "<genre>-l<level>"`
 * and the tuple index is rebuilt from it here.
 */

export type ContentSource = 'cdn' | 'bundled';

const FLOWS = new Map<string, ActivityFlow>();
let fundamentals: FundamentalsFlow | null = null;

export let flowGeneration = 0;

let source: ContentSource | null = null;
export const flowContentSource = (): ContentSource | null => source;

/**
 * Collapse the several spellings of a genre to one lookup token.
 *
 * The data is inconsistent by history: a flow's own `genre` field carries the
 * display form ('hip hop', 'neo-soul', 'jam band'), the previous loaders used
 * camelCase keys ('hipHop', 'neoSoul', 'jamBand'), and URLs use the display
 * form again. Normalising on both write and read is what lets all three keep
 * working — the API's activityFlowSlug applies the identical rule, so the
 * published `body.id` and this key are always the same string.
 */
export const canonicalGenre = (genre: string) =>
  genre.toLowerCase().replace(/[\s_-]/g, '');

export const flowKey = (genre: string, level: number) =>
  `${canonicalGenre(genre)}-l${level}`;

type PublishedFlow = ActivityFlow & { id: string };

const loadBundled = async () => {
  const module = await import('@/curriculum/data/activityFlows/bundled');
  const [all, piano] = await Promise.all([
    module.loadAllFlows(),
    module.loadPianoFundamentals(),
  ]);

  // Key off the flow's OWN genre, not the loader map key, so the bundled path
  // produces exactly the ids the published bundle carries.
  const flows: PublishedFlow[] = [];
  for (const list of all.values()) {
    for (const flow of list) {
      flows.push({ ...flow, id: flowKey(flow.genre, flow.level) });
    }
  }
  return { flows, piano };
};

const loadContent = async (): Promise<{
  flows: PublishedFlow[];
  piano: FundamentalsFlow | null;
  from: ContentSource;
}> => {
  if (!isContentCdnEnabled()) {
    const bundled = await loadBundled();
    return { ...bundled, from: 'bundled' };
  }

  try {
    const [flows, fundamentalsBundle] = await Promise.all([
      fetchBundle<PublishedFlow>('lessons'),
      fetchBundle<FundamentalsFlow>('fundamentals').catch(() => []),
    ]);
    if (flows.length === 0)
      throw new Error('published lesson bundle was empty');
    return { flows, piano: fundamentalsBundle[0] ?? null, from: 'cdn' };
  } catch (caught) {
    console.error(
      '[content] lessons failed to load from CDN, falling back to bundled data:',
      caught,
    );
    const bundled = await loadBundled();
    return { ...bundled, from: 'bundled' };
  }
};

let hydration: Promise<void> | null = null;

export const ensureFlowContent = (): Promise<void> => {
  hydration ??= loadContent().then(({ flows, piano, from }) => {
    FLOWS.clear();
    for (const flow of flows) {
      // Prefer the published id, but tolerate a row whose id was hand-edited
      // out of shape by rebuilding the key from genre + level.
      FLOWS.set(flow.id ?? flowKey(flow.genre, flow.level), flow);
    }
    fundamentals = piano;
    source = from;
    flowGeneration += 1;
  });

  return hydration;
};

export const isFlowContentReady = (): boolean => flowGeneration > 0;

/** Test seam — resets to the pre-hydration state. */
export const resetFlowContent = () => {
  FLOWS.clear();
  fundamentals = null;
  hydration = null;
  source = null;
  flowGeneration = 0;
};

// ── Accessors ───────────────────────────────────────────────────────────────
// Same async signatures as before, so no consumer changed.

export async function getActivityFlow(
  genreId: string,
  level: number,
): Promise<ActivityFlow | null> {
  await ensureFlowContent();
  return FLOWS.get(flowKey(genreId, level)) ?? null;
}

export async function getFlowsForGenre(
  genreId: string,
): Promise<ActivityFlow[]> {
  await ensureFlowContent();
  const genre = canonicalGenre(genreId);
  return [...FLOWS.values()]
    .filter((flow) => canonicalGenre(flow.genre) === genre)
    .sort((a, b) => a.level - b.level);
}

export async function loadAllFlows(): Promise<Map<string, ActivityFlow[]>> {
  await ensureFlowContent();
  const byGenre = new Map<string, ActivityFlow[]>();
  for (const flow of FLOWS.values()) {
    const list = byGenre.get(flow.genre);
    if (list) list.push(flow);
    else byGenre.set(flow.genre, [flow]);
  }
  for (const list of byGenre.values()) list.sort((a, b) => a.level - b.level);
  return byGenre;
}

export async function loadPianoFundamentals(): Promise<FundamentalsFlow> {
  await ensureFlowContent();
  if (!fundamentals) {
    throw new Error('Piano Fundamentals content is unavailable.');
  }
  return fundamentals;
}
