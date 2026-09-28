import { useCallback, useRef, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import type { Song } from '@/curriculum/types/songLibrary';
import {
  contentRequest,
  type ContentItemDetail,
  type ContentListItem,
} from '@/hooks/data/admin/useAdminContent';
import { planImport, tally, toWrite, type SongDiff } from './songImportPlan';

/**
 * Bringing the repo's chord charts into the content store, once.
 *
 * The two copies drifted: the store predates the section renaming, so it
 * predates the key corrections, the repeat-sign collapse, per-bar metre and
 * everything else the library has had done to it. This walks the repo corpus
 * against the store, says exactly what it would change, and writes only when
 * told to.
 *
 * It is deliberately a page and not a script, because a script needs an admin
 * token and this needs nothing but the session the admin already has.
 *
 * Three rules it keeps:
 *  - it never deletes. A song only the store has is someone's work.
 *  - it compares before it writes, and shows the comparison.
 *  - writing can be stopped, and says what it managed.
 *
 * Publishing is still a separate act: this fills the authoring store, and the
 * release page is what moves the CDN bundle.
 */

/** Requests in flight while reading. Politeness, not throughput. */
const READ_CONCURRENCY = 6;

type Phase = 'idle' | 'reading' | 'ready' | 'writing' | 'done';

interface Progress {
  done: number;
  total: number;
  note: string;
}

const STATE_LABEL: Record<SongDiff['state'], string> = {
  missing: 'create',
  differs: 'replace',
  extra: 'store only — left alone',
  same: 'identical',
};

const STATE_COLOR: Record<SongDiff['state'], string> = {
  missing: 'text-emerald-400',
  differs: 'text-amber-400',
  extra: 'text-sky-400',
  same: 'text-white/30',
};

export const AdminSongImportPage = () => {
  const { token } = useAuthContext();
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<Progress>({
    done: 0,
    total: 0,
    note: '',
  });
  const [plan, setPlan] = useState<SongDiff[] | null>(null);
  const [failures, setFailures] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const stop = useRef(false);

  /** Every song the store holds, by slug, bodies and all. */
  const readStore = useCallback(async (): Promise<Map<string, Song>> => {
    const list: ContentListItem[] = [];
    let cursor: string | null = null;
    do {
      const page: { items: ContentListItem[]; nextCursor: string | null } =
        await contentRequest(
          `/items?kind=song&limit=200${cursor ? `&cursor=${cursor}` : ''}`,
          token!,
        );
      list.push(...page.items);
      cursor = page.nextCursor;
      setProgress({ done: 0, total: 0, note: `${list.length} songs listed…` });
    } while (cursor);

    const out = new Map<string, Song>();
    let done = 0;
    const queue = [...list];
    const worker = async () => {
      for (;;) {
        const item = queue.shift();
        if (!item || stop.current) return;
        const detail: ContentItemDetail = await contentRequest(
          `/items/${item.id}`,
          token!,
        );
        if (detail.body) out.set(item.slug, detail.body as unknown as Song);
        setProgress({
          done: ++done,
          total: list.length,
          note: 'reading the store',
        });
      }
    };
    await Promise.all(Array.from({ length: READ_CONCURRENCY }, () => worker()));
    return out;
  }, [token]);

  const compare = useCallback(async () => {
    stop.current = false;
    setError(null);
    setFailures([]);
    setPhase('reading');
    try {
      // Dynamic, and it has to stay that way: a static import puts 3.3MB of
      // song data on the eager bundle for every reader of the app.
      const { BUNDLED_SONGS } = await import('@/curriculum/data/songs/bundled');
      const stored = await readStore();
      setPlan(planImport(Object.values(BUNDLED_SONGS), stored));
      setPhase('ready');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setPhase('idle');
    }
  }, [readStore]);

  const push = useCallback(async () => {
    if (!plan) return;
    const work = toWrite(plan);
    stop.current = false;
    setPhase('writing');
    setFailures([]);
    const { BUNDLED_SONGS } = await import('@/curriculum/data/songs/bundled');
    const bad: string[] = [];
    let done = 0;

    // One at a time. A bulk endpoint would be faster and this runs once.
    for (const row of work) {
      if (stop.current) break;
      const body = (BUNDLED_SONGS as Record<string, Song>)[row.slug];
      try {
        await contentRequest('/items', token!, {
          method: 'PUT',
          body: JSON.stringify({
            kind: 'song',
            slug: row.slug,
            body,
            note: 'Imported from the repo corpus',
          }),
        });
      } catch (caught) {
        bad.push(
          `${row.slug}: ${caught instanceof Error ? caught.message : String(caught)}`,
        );
      }
      setProgress({
        done: ++done,
        total: work.length,
        note: `writing ${row.slug}`,
      });
    }
    setFailures(bad);
    setPhase('done');
  }, [plan, token]);

  const counts = plan ? tally(plan) : null;
  const work = plan ? toWrite(plan) : [];
  const busy = phase === 'reading' || phase === 'writing';

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Import songs from the repo</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Compares every chart in the repo against the one the store holds and
          writes the differences. It never deletes: a song only the store has is
          left alone and listed. Publishing is separate — this fills the
          authoring store, and the Releases page moves the CDN bundle.
        </p>
      </header>

      {error && (
        <p className="rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void compare()}
          disabled={busy}
          className="rounded border border-white/20 px-3 py-1.5 text-sm hover:border-white/40 disabled:opacity-40"
        >
          {plan ? 'Compare again' : 'Compare'}
        </button>
        {busy && (
          <>
            <span className="text-sm text-muted-foreground">
              {progress.note}
              {progress.total > 0 && ` — ${progress.done}/${progress.total}`}
            </span>
            <button
              type="button"
              onClick={() => {
                stop.current = true;
              }}
              className="rounded border border-white/20 px-2 py-1 text-xs hover:border-white/40"
            >
              Stop
            </button>
          </>
        )}
      </div>

      {counts && (
        <div className="flex flex-wrap gap-4 rounded border border-white/10 bg-white/[0.02] p-3 text-sm">
          <span className="text-emerald-400">{counts.missing} to create</span>
          <span className="text-amber-400">{counts.differs} to replace</span>
          <span className="text-sky-400">{counts.extra} only in the store</span>
          <span className="text-white/40">{counts.same} already identical</span>
        </div>
      )}

      {phase === 'ready' && work.length > 0 && (
        <div className="flex items-center gap-3 rounded border border-amber-500/40 bg-amber-500/5 p-3">
          <p className="flex-1 text-sm">
            This will overwrite <strong>{counts?.differs}</strong> songs in the
            store and create <strong>{counts?.missing}</strong>. The
            store&apos;s own copies of those are replaced, not merged.
          </p>
          <button
            type="button"
            onClick={() => void push()}
            className="rounded bg-amber-500/90 px-3 py-1.5 text-sm font-medium text-black hover:bg-amber-400"
          >
            Write {work.length} songs
          </button>
        </div>
      )}

      {phase === 'done' && (
        <p className="rounded border border-white/10 bg-white/[0.02] p-3 text-sm">
          Wrote {progress.done} of {work.length}.
          {failures.length > 0
            ? ` ${failures.length} failed.`
            : ' Nothing failed.'}{' '}
          Publish from the Releases page to move the CDN bundle.
        </p>
      )}

      {failures.length > 0 && (
        <ul className="rounded border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">
          {failures.slice(0, 20).map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}

      {plan && (
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-white/40">
            <tr>
              <th className="py-2">Song</th>
              <th className="py-2">What happens</th>
              <th className="py-2">What differs</th>
            </tr>
          </thead>
          <tbody>
            {plan
              .filter((row) => row.state !== 'same')
              .map((row) => (
                <tr key={row.slug} className="border-t border-white/5">
                  <td className="py-1.5 pr-3">
                    {row.title}
                    <span className="ml-2 text-xs text-white/25">
                      {row.slug}
                    </span>
                  </td>
                  <td className={`py-1.5 pr-3 ${STATE_COLOR[row.state]}`}>
                    {STATE_LABEL[row.state]}
                  </td>
                  <td className="py-1.5 text-xs text-white/50">
                    {row.changes.join(' · ')}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
