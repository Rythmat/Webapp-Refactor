import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import type { Song } from '@/curriculum/types/songLibrary';
import {
  CONTENT_KEY,
  contentRequest,
  type ContentItemDetail,
  type ContentListItem,
} from '@/hooks/data/admin/useAdminContent';
import { ConsoleCallout } from '../../ui/ConsoleCallout';
import { CONSOLE_LABEL, CONSOLE_TABLE_HEAD } from '../../ui/styles';
import { RunSummary } from '../publishing/PublishKindsSection';
import { usePublishActions, usePublishRun } from '../publishing/publishRun';
import { rememberImport } from './importMemory';
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
 * Publishing is still a separate act: this fills the authoring store, and
 * Publishing is what moves the CDN bundle — offered inline once a write lands.
 *
 * It is Publishing's temporary "Import from repo" tab, and remembers what
 * each compare found (importMemory) so the tab can hide once nothing is left.
 *
 * Its writes go straight through `contentRequest`, not the save hook, so it
 * invalidates the content queries itself once the run ends — as a bulk
 * write does — and the Table, the mind map, Integrity and the queues show
 * the imported songs.
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
  const queryClient = useQueryClient();
  const run = usePublishRun();
  const { publish } = usePublishActions();

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
      const next = planImport(Object.values(BUNDLED_SONGS), stored);
      setPlan(next);
      // A stopped read compared part of the store; it proves nothing.
      if (!stop.current) {
        rememberImport({ toWrite: toWrite(next).length, failures: 0 });
      }
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
    // What is still unwritten: the failures, and anything a stop skipped.
    rememberImport({
      toWrite: bad.length + (work.length - done),
      failures: bad.length,
    });
    setPhase('done');
    // Once, after the run: every export and list reads what was written.
    if (done > bad.length) {
      void queryClient.invalidateQueries({ queryKey: CONTENT_KEY });
    }
  }, [plan, token, queryClient]);

  const counts = plan ? tally(plan) : null;
  const work = plan ? toWrite(plan) : [];
  const busy = phase === 'reading' || phase === 'writing';

  return (
    <div className="flex max-w-5xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className={CONSOLE_LABEL}>Import songs from the repo</h2>
        <p className="max-w-3xl text-sm text-white/55">
          Compares every chart in the repo against the one the store holds and
          writes the differences. It never deletes: a song only the store has is
          left alone and listed. Publishing is separate — this fills the
          authoring store, and publishing moves the CDN bundle.
        </p>
      </div>

      {error && <ConsoleCallout tone="danger">{error}</ConsoleCallout>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void compare()}
          disabled={busy}
          className="rounded-full border border-white/20 px-3 py-1.5 text-sm hover:border-white/40 disabled:opacity-40"
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
              className="rounded-full border border-white/20 px-2.5 py-1 text-xs hover:border-white/40"
            >
              Stop
            </button>
          </>
        )}
      </div>

      {counts && (
        <ConsoleCallout tone="neutral">
          <div className="flex flex-wrap gap-4 tabular-nums">
            <span className="text-emerald-400">{counts.missing} to create</span>
            <span className="text-amber-400">{counts.differs} to replace</span>
            <span className="text-sky-400">
              {counts.extra} only in the store
            </span>
            <span className="text-white/45">
              {counts.same} already identical
            </span>
          </div>
        </ConsoleCallout>
      )}

      {phase === 'ready' && work.length > 0 && (
        <ConsoleCallout tone="warning">
          <div className="flex items-center gap-3">
            <p className="flex-1">
              This will overwrite <strong>{counts?.differs}</strong> songs in
              the store and create <strong>{counts?.missing}</strong>. The
              store&apos;s own copies of those are replaced, not merged.
            </p>
            <button
              type="button"
              onClick={() => void push()}
              className="shrink-0 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-white/90"
            >
              Write {work.length} songs
            </button>
          </div>
        </ConsoleCallout>
      )}

      {phase === 'done' && (
        <ConsoleCallout tone="neutral">
          Wrote {progress.done} of {work.length}.
          {failures.length > 0
            ? ` ${failures.length} failed.`
            : ' Nothing failed.'}{' '}
          Students see none of it until songs are published.{' '}
          <button
            type="button"
            disabled={run.status === 'running'}
            onClick={() => void publish(['song'])}
            className="underline underline-offset-2 disabled:opacity-40"
          >
            Publish Songs
          </button>
        </ConsoleCallout>
      )}

      {phase === 'done' && run.status !== 'idle' && <RunSummary />}

      {failures.length > 0 && (
        <ConsoleCallout tone="danger" className="text-xs">
          <ul>
            {failures.slice(0, 20).map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </ConsoleCallout>
      )}

      {plan && (
        <table className="w-full text-left text-sm">
          <thead className={CONSOLE_TABLE_HEAD}>
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
                <tr key={row.slug} className="border-t border-white/[0.08]">
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
