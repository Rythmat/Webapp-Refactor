/**
 * What an editor actually changed.
 *
 * Approving used to be a button beside the editor's own one-line note, with no
 * way to see the body being applied — which made the review step unenforceable:
 * a proposal claiming "fixed a typo" could replace the entire chart. This
 * produces a path-level diff of the two bodies so the reviewer sees the change
 * rather than a description of it.
 *
 * Kind-agnostic on purpose. A song, a lesson and a globe event have nothing
 * structural in common, and a per-kind diff view would be five components that
 * drift; a path diff is honest for all of them and degrades gracefully on the
 * parts (a chart's bars) where no summary would be readable anyway.
 */

export type DiffEntry = {
  /** Dot/bracket path into the body, e.g. `sections[1].bars[3].chords[0].degree`. */
  path: string;
  kind: 'added' | 'removed' | 'changed';
  before?: unknown;
  after?: unknown;
};

/** Beyond this the list stops being reviewable and becomes a wall of text. */
const MAX_ENTRIES = 80;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const join = (base: string, key: string) => (base ? `${base}.${key}` : key);

export const diffBodies = (
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): { entries: DiffEntry[]; truncated: boolean } => {
  const entries: DiffEntry[] = [];
  let truncated = false;

  const walk = (a: unknown, b: unknown, path: string) => {
    if (entries.length >= MAX_ENTRIES) {
      truncated = true;
      return;
    }
    if (same(a, b)) return;

    if (isPlainObject(a) && isPlainObject(b)) {
      for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
        walk(a[key], b[key], join(path, key));
      }
      return;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      // Positional rather than a real LCS: an inserted bar reports every later
      // index as changed. That over-reports, which for a review is the right
      // direction to be wrong in — nothing that changed goes unlisted.
      if (a.length !== b.length) {
        entries.push({
          path: `${path} (${a.length} → ${b.length} items)`,
          kind: 'changed',
        });
      }
      const longest = Math.max(a.length, b.length);
      for (let index = 0; index < longest; index += 1) {
        walk(a[index], b[index], `${path}[${index}]`);
      }
      return;
    }

    if (a === undefined) entries.push({ path, kind: 'added', after: b });
    else if (b === undefined)
      entries.push({ path, kind: 'removed', before: a });
    else entries.push({ path, kind: 'changed', before: a, after: b });
  };

  walk(before ?? {}, after ?? {}, '');
  return { entries: entries.slice(0, MAX_ENTRIES), truncated };
};

/** Compact one-line rendering of a diffed value. */
export const formatDiffValue = (value: unknown): string => {
  if (value === undefined) return '—';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (text === undefined) return '—';
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
};
