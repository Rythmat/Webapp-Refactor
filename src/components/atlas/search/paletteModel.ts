import { GUIDED_TOURS } from '@/components/atlas/data/guidedTours';
import { HISTORICAL_MODULES } from '@/components/atlas/data/historicalModules';
import { stopKey } from '@/components/atlas/navigation/atlasStop';
import { describeStop } from '@/components/atlas/navigation/describeStop';
import type { TrailEntry } from '@/components/atlas/navigation/useAtlasTrail';
import {
  matchScore,
  searchGlobe,
  type GlobeResult,
} from '@/components/atlas/search/globeSearch';

/**
 * What the command palette lists for a query, as plain data (the palette
 * draws it; tests read it).
 *
 * With nothing typed: where you have just been, the actions, and every
 * pathway and guided tour. Typing searches the globe exactly as the old
 * search field did (searchGlobe, the same ranking), and narrows the rest by
 * the same matching rule.
 */

/** Results per search group; the full results panel has the rest. */
export const PALETTE_PER_GROUP = 5;
/** Recent stops listed. */
export const RECENT_COUNT = 5;

/** A command the palette can run, described for matching and display. */
export interface PaletteCommand {
  id: string;
  title: string;
  subtitle?: string;
  /** Other words it answers to: "rotate" finds Spin. */
  keywords: string[];
}

export type PaletteItem =
  | { type: 'result'; id: string; result: GlobeResult }
  | { type: 'see-all'; id: string; query: string; total: number }
  | { type: 'recent'; id: string; entry: TrailEntry }
  | { type: 'action'; id: string; command: PaletteCommand }
  | {
      type: 'pathway';
      id: string;
      pathwayId: string;
      title: string;
      subtitle: string;
    }
  | {
      type: 'tour';
      id: string;
      tourId: string;
      title: string;
      subtitle: string;
    };

export interface PaletteGroup {
  id: string;
  /** Its heading; none for the "See all results" row. */
  label?: string;
  /** A search group's entity kind, for its coloured dot. */
  kind?: GlobeResult['kind'];
  items: PaletteItem[];
}

/**
 * The steps before the current one, newest first, each place once. Where
 * you are now and the bare globe are left out: neither is somewhere to go.
 */
export function recentStops(
  entries: TrailEntry[],
  cursorPos: number,
  count = RECENT_COUNT,
): TrailEntry[] {
  const current = entries[cursorPos]?.key;
  const seen = new Set<string>(current ? [current] : []);
  const out: TrailEntry[] = [];
  for (let i = cursorPos - 1; i >= 0 && out.length < count; i -= 1) {
    const entry = entries[i];
    if (entry.stop.kind === 'home' || seen.has(entry.key)) continue;
    seen.add(entry.key);
    out.push(entry);
  }
  return out;
}

/** The items whose words match `query`, best first; all of them, in order, with no query. */
function narrow<T>(
  items: T[],
  query: string,
  words: (item: T) => string[],
): T[] {
  if (!query.trim()) return items;
  return items
    .map((item, i) => ({ item, i, score: matchScore(words(item), query) }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((x) => x.item);
}

const PATHWAYS = HISTORICAL_MODULES.map((m) => ({
  words: [m.title, m.description, 'pathway'],
  item: {
    type: 'pathway',
    id: `pathway:${m.id}`,
    pathwayId: m.id,
    title: m.title,
    subtitle: `Pathway · ${m.eventIds.length} stops`,
  } satisfies PaletteItem,
}));

const TOURS = GUIDED_TOURS.map((t) => ({
  words: [t.title, t.subtitle, 'tour', 'guided tour'],
  item: {
    type: 'tour',
    id: `tour:${t.id}`,
    tourId: t.id,
    title: t.title,
    subtitle: t.subtitle,
  } satisfies PaletteItem,
}));

export function buildPalette(
  query: string,
  {
    recent,
    actions,
  }: {
    recent: TrailEntry[];
    actions: PaletteCommand[];
  },
): PaletteGroup[] {
  const q = query.trim();
  const groups: PaletteGroup[] = [];

  // The globe's own search, ranked as before.
  const found = searchGlobe(q, PALETTE_PER_GROUP);
  for (const group of found) {
    groups.push({
      id: group.kind,
      label:
        group.total > group.results.length
          ? `${group.label} · ${group.total}`
          : group.label,
      kind: group.kind,
      items: group.results.map((result) => ({
        type: 'result',
        id: result.id,
        result,
      })),
    });
  }
  const total = found.reduce((sum, g) => sum + g.total, 0);
  if (total > 0) {
    groups.push({
      id: 'see-all',
      items: [{ type: 'see-all', id: 'see-all', query: q, total }],
    });
  }

  const recentItems = narrow(recent, q, (e) => [
    describeStop(e.stop).title,
  ]).map(
    (entry): PaletteItem => ({
      type: 'recent',
      id: `recent:${stopKey(entry.stop)}`,
      entry,
    }),
  );
  if (recentItems.length) {
    groups.push({ id: 'recent', label: 'Recent', items: recentItems });
  }

  const actionItems = narrow(actions, q, (c) => [c.title, ...c.keywords]).map(
    (command): PaletteItem => ({
      type: 'action',
      id: `action:${command.id}`,
      command,
    }),
  );
  if (actionItems.length) {
    groups.push({ id: 'actions', label: 'Actions', items: actionItems });
  }

  const pathways = narrow(PATHWAYS, q, (p) => p.words).map((p) => p.item);
  if (pathways.length) {
    groups.push({ id: 'pathways', label: 'Pathways', items: pathways });
  }

  const tours = narrow(TOURS, q, (t) => t.words).map((t) => t.item);
  if (tours.length) {
    groups.push({ id: 'tours', label: 'Guided tours', items: tours });
  }

  return groups;
}

/** Every item in order: what the arrow keys walk. */
export const paletteItems = (groups: PaletteGroup[]): PaletteItem[] =>
  groups.flatMap((g) => g.items);
