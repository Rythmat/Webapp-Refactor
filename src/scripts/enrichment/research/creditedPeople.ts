/**
 * The people songs credit (writers, producers, players) who are not on the
 * globe roster: the second research round's queue.
 *
 *   npx tsx src/scripts/enrichment/research/creditedPeople.ts
 *
 * Writes `_work/credited.json` (every credited artist with their roles,
 * instruments and songs) and `_work/queue/batch-1NN.json` in batches of 20,
 * in the same shape as the roster queue so the same brief applies.
 */
import { join } from 'node:path';
import { ARTIST_REGISTRY } from '@/components/atlas/data/artistRegistry';
import { loadRepoStore } from '@/scripts/repoContent/repoStore';
import { coreOf, emptyPaths, WORK_DIR, writeJson } from './shared';

const store = await loadRepoStore();
const roster = new Set(ARTIST_REGISTRY.map((a) => a.slug));
const artists = new Map(
  store.items('artist').map((i) => [i.slug, i.body as Record<string, unknown>]),
);

interface Credited {
  slug: string;
  name: string;
  roles: Record<string, number>;
  instruments: Record<string, number>;
  songs: string[];
}
const people = new Map<string, Credited>();
for (const song of store.items('song')) {
  const body = song.body as {
    title?: string;
    artist?: string;
    credits?: {
      name: string;
      role: string;
      instrument?: string;
      artistGlobeId?: string;
      ensemble?: boolean;
    }[];
  };
  for (const c of body.credits ?? []) {
    if (!c.artistGlobeId || roster.has(c.artistGlobeId)) continue;
    const p = people.get(c.artistGlobeId) ?? {
      slug: c.artistGlobeId,
      name: c.name,
      roles: {},
      instruments: {},
      songs: [],
    };
    p.roles[c.role] = (p.roles[c.role] ?? 0) + 1;
    if (c.instrument)
      p.instruments[c.instrument] = (p.instruments[c.instrument] ?? 0) + 1;
    const label = `${body.title} — ${body.artist}`;
    if (!p.songs.includes(label)) p.songs.push(label);
    people.set(c.artistGlobeId, p);
  }
}

const queue = [...people.values()]
  .sort((a, b) => b.songs.length - a.songs.length)
  .map((p) => {
    const body = artists.get(p.slug) ?? { slug: p.slug };
    const current = coreOf(body);
    const group = current.group === true;
    return {
      slug: p.slug,
      name: String(body.name ?? p.name),
      group,
      article: null,
      known: current,
      todo: emptyPaths(current, group).filter((x) => x !== 'group'),
      hints: [
        `Credited on ${p.songs.length} song(s) as ${Object.entries(p.roles)
          .map(([r, n]) => `${r}×${n}`)
          .join(
            ', ',
          )}${Object.keys(p.instruments).length ? `; instruments on record: ${Object.keys(p.instruments).join(', ')}` : ''}. Songs: ${p.songs.slice(0, 4).join('; ')}`,
        'A session musician, songwriter or producer: confirm identity against these songs before using any source (common names!). Their instruments must include the ones credited on record.',
      ],
    };
  })
  .filter((q) => q.todo.length);

writeJson(join(WORK_DIR, 'credited.json'), [...people.values()]);
for (let i = 0; i < queue.length; i += 20)
  writeJson(
    join(WORK_DIR, 'queue', `batch-${100 + i / 20 + 1}.json`),
    queue.slice(i, i + 20),
  );
console.log(
  `${people.size} credited people off the roster; ${queue.length} with gaps → ${Math.ceil(queue.length / 20)} batches (batch-101…).`,
);
const bySongs = [1, 2, 3, 5].map(
  (n) =>
    `${n}+ songs: ${queue.filter((q) => people.get(q.slug)!.songs.length >= n).length}`,
);
console.log(bySongs.join(', '));
