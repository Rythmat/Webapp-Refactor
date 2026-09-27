import type { Song, SongSection } from '@/curriculum/types/songLibrary';

/**
 * Comparing the repo's chord charts against the ones the content store holds.
 *
 * The two copies have drifted a long way apart. The back office showed Natural
 * Woman as five sections named Verse, Section B, Chorus, Section D and Bridge;
 * the repo holds eight, named properly, and a test forbids a letter label — so
 * the store's copy predates the renaming, and everything since.
 *
 * Pure on purpose. Deciding what to write to a content database is exactly the
 * thing to be able to test without a content database.
 */

export type SongState =
  /** Byte-identical once key order is ignored. Nothing to do. */
  | 'same'
  /** In both, and different. The repo copy would replace the stored one. */
  | 'differs'
  /** In the repo and not in the store. Would be created. */
  | 'missing'
  /** In the store and not in the repo. Left alone, and reported. */
  | 'extra';

export interface SongDiff {
  slug: string;
  title: string;
  state: SongState;
  /** What differs, in words a person can check. Empty unless `differs`. */
  changes: string[];
}

/**
 * Key order in a hand-authored file is incidental, and an absent field and an
 * explicitly-undefined one are the same field. Compare what the values say,
 * not how they were typed.
 */
export function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)]),
    );
  return value;
}

const same = (a: unknown, b: unknown) =>
  JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

const ROADMAP = [
  'repeatStart',
  'repeatEnd',
  'repeatTimes',
  'ending',
  'segno',
  'coda',
  'toCoda',
  'jump',
  'fine',
  'cue',
  'keyChange',
  'timeSignature',
  'fermata',
  'restBars',
] as const;

const bars = (sections: readonly SongSection[]) =>
  sections.reduce((n, s) => n + s.bars.length, 0);

const marks = (sections: readonly SongSection[]) =>
  sections.reduce(
    (n, s) =>
      n +
      s.bars.filter((b) =>
        ROADMAP.some(
          (k) => (b as unknown as Record<string, unknown>)[k] !== undefined,
        ),
      ).length,
    0,
  );

const countLine = (what: string, a: number, b: number) =>
  a === b ? null : `${what} ${b} → ${a}`;

/**
 * What changed, for someone deciding whether to allow it.
 *
 * Written repo-last — "5 sections → 8" reads as what the store has now and
 * what it would have after, which is the direction the reader cares about.
 */
export function describeChanges(repo: Song, stored: Song): string[] {
  const out: (string | null)[] = [];

  out.push(countLine('sections', repo.sections.length, stored.sections.length));
  out.push(countLine('bars', bars(repo.sections), bars(stored.sections)));
  out.push(
    countLine('roadmap marks', marks(repo.sections), marks(stored.sections)),
  );

  const repoLabels = repo.sections.map((s) => s.label);
  const storedLabels = stored.sections.map((s) => s.label);
  if (repoLabels.join('|') !== storedLabels.join('|')) {
    const gone = storedLabels.filter((l) => !repoLabels.includes(l));
    out.push(
      gone.length
        ? `section names, dropping ${gone.slice(0, 4).join(', ')}${gone.length > 4 ? '…' : ''}`
        : 'section names',
    );
  }

  if (repo.key !== stored.key) out.push(`key ${stored.key} → ${repo.key}`);
  if (repo.keyRoot !== stored.keyRoot) out.push('key root');
  if (repo.mode !== stored.mode) out.push(`mode ${stored.mode} → ${repo.mode}`);
  if (repo.tempo !== stored.tempo)
    out.push(`tempo ${stored.tempo} → ${repo.tempo}`);
  if (!same(repo.timeSignature, stored.timeSignature))
    out.push(
      `metre ${stored.timeSignature?.join('/')} → ${repo.timeSignature?.join('/')}`,
    );

  const layout = (s: Song) =>
    s.sections.filter((x) => x.measuresPerRow !== undefined).length;
  out.push(
    countLine('sections with a row width', layout(repo), layout(stored)),
  );

  if (!same(repo.audioSources, stored.audioSources))
    out.push('recording links');
  if (repo.title !== stored.title)
    out.push(`title "${stored.title}" → "${repo.title}"`);
  if (repo.artist !== stored.artist) out.push('artist');

  const found = out.filter((x): x is string => !!x);
  // Something differs that none of the above names — say so rather than
  // report "no changes" on a song the importer is about to overwrite.
  return found.length > 0 ? found : ['other fields'];
}

/** One row per song, repo and store lined up by slug. */
export function planImport(
  repoSongs: readonly Song[],
  stored: ReadonlyMap<string, Song>,
): SongDiff[] {
  const rows: SongDiff[] = repoSongs.map((repo) => {
    const other = stored.get(repo.id);
    if (!other)
      return {
        slug: repo.id,
        title: repo.title,
        state: 'missing' as const,
        changes: [],
      };
    if (same(repo, other))
      return {
        slug: repo.id,
        title: repo.title,
        state: 'same' as const,
        changes: [],
      };
    return {
      slug: repo.id,
      title: repo.title,
      state: 'differs' as const,
      changes: describeChanges(repo, other),
    };
  });

  const inRepo = new Set(repoSongs.map((s) => s.id));
  for (const [slug, song] of stored)
    if (!inRepo.has(slug))
      rows.push({
        slug,
        title: song.title ?? slug,
        state: 'extra',
        changes: [],
      });

  // Worst first: what would be created, then what would change, then the
  // store's own songs that the repo has never heard of.
  const order: Record<SongState, number> = {
    missing: 0,
    differs: 1,
    extra: 2,
    same: 3,
  };
  return rows.sort(
    (a, b) => order[a.state] - order[b.state] || a.slug.localeCompare(b.slug),
  );
}

/** The songs an import would actually write. */
export const toWrite = (plan: readonly SongDiff[]): SongDiff[] =>
  plan.filter((row) => row.state === 'missing' || row.state === 'differs');

export const tally = (plan: readonly SongDiff[]) => ({
  same: plan.filter((r) => r.state === 'same').length,
  differs: plan.filter((r) => r.state === 'differs').length,
  missing: plan.filter((r) => r.state === 'missing').length,
  extra: plan.filter((r) => r.state === 'extra').length,
});
