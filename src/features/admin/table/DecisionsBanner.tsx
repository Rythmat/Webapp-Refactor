import { Download, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { hashText } from '@/content/suggestions/keys';
import type { SuggestionDecision } from '@/content/suggestions/types';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import {
  DECISIONS_PATH,
  type DecisionCounts,
  decisionsFileText,
  loadDecisionsFile,
  type ReplaySummary,
  useDecisionsFile,
} from '@/hooks/data/admin/useSuggestions';
import { useRepoMode } from '../content/repo/useRepoMode';
import { ConsoleCallout } from '../ui/ConsoleCallout';

/**
 * "12 decisions not yet downloaded" (design §5.3): what the owner accepted,
 * replaced, rejected, dropped and reviewed lives in the store — today the
 * offline mock, in this browser — until `decisions.json` is committed. The
 * mock replays that file on every load, so a seed change or a reset loses
 * nothing in it, and it is the backend's import payload. Download gives the
 * file in its committed shape, for the owner to put at
 * `src/scripts/enrichment/suggestions/decisions.json` and commit.
 *
 * What was downloaded is remembered in this browser, decision by decision
 * (a short hash of each), so the count is of the decisions not in any
 * download — by what they are, not by when they were made: an editor's
 * accept approved after a download keeps the time it was made, and a count
 * by time would call it downloaded. The server's own count — decisions not
 * in the committed file — caps it, and once the file is committed and the
 * store reloaded, both are nothing.
 *
 * Also says when replaying the committed file could not write some of it
 * again: those are for a person, never forced.
 *
 * In repo mode there is no download: the dev server writes
 * `decisions.json` into the repo with each decision, so it is already
 * where it belongs, and Publishing's "Commit and deploy" lists it.
 */

const STORAGE_KEY = 'ma-console-decisions-downloaded-v2';
/** Before v2: when the newest decision downloaded was made. */
const OLD_STORAGE_KEY = 'ma-console-decisions-downloaded-v1';

/** One decision, told apart from every other: what, about what, by whom, when. */
const decisionKey = (d: SuggestionDecision): string =>
  hashText([d.suggestionId, d.op, d.method, d.valueHash, d.by, d.at].join('|'));

/** What this browser has downloaded: each decision's key, or (v1) a time. */
type Downloaded = { keys: ReadonlySet<string> } | { at: string } | null;

const readDownloaded = (): Downloaded => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (Array.isArray((parsed as { keys?: unknown } | null)?.keys))
      return { keys: new Set((parsed as { keys: string[] }).keys) };
    const old: unknown = JSON.parse(
      window.localStorage.getItem(OLD_STORAGE_KEY) ?? 'null',
    );
    return old &&
      typeof old === 'object' &&
      typeof (old as { at?: unknown }).at === 'string'
      ? { at: (old as { at: string }).at }
      : null;
  } catch {
    return null;
  }
};

const writeDownloaded = (keys: readonly string[]) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ keys }));
    window.localStorage.removeItem(OLD_STORAGE_KEY);
  } catch {
    // Remembering is a convenience: the file downloaded all the same.
  }
};

const isDownloaded = (downloaded: Downloaded, d: SuggestionDecision) =>
  !!downloaded &&
  ('keys' in downloaded
    ? downloaded.keys.has(decisionKey(d))
    : d.at <= downloaded.at);

/** Hand the browser the file to save. */
function saveFile(text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'decisions.json';
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`;

export const DecisionsBanner = ({
  counts,
  replay,
}: {
  counts?: DecisionCounts;
  replay?: ReplaySummary | null;
}) => {
  const { token } = useAuthContext();
  // Repo mode writes decisions.json itself with every decision, so there is
  // nothing to download: the file is in the repo, waiting for a commit.
  const repo = useRepoMode();
  const notInRepo = counts?.notDownloaded ?? 0;
  const file = useDecisionsFile({ enabled: notInRepo > 0 && !repo });
  const [downloaded, setDownloaded] = useState(readDownloaded);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // After a download the button it was is gone: the keyboard goes to the
  // line that replaces it.
  const again = useRef<HTMLButtonElement>(null);
  const [refocus, setRefocus] = useState(false);
  useEffect(() => {
    if (!refocus || !again.current) return;
    again.current.focus();
    setRefocus(false);
  });

  // Not in any download, as far as this browser knows; never more than the
  // server says are missing from the committed file.
  const since = file.data
    ? file.data.decisions.filter((d) => !isDownloaded(downloaded, d)).length
    : notInRepo;
  const waiting = Math.min(notInRepo, since);
  const conflicts = replay?.conflicts ?? [];

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      const latest = await loadDecisionsFile(token!);
      saveFile(decisionsFileText(latest));
      const keys = latest.decisions.map(decisionKey);
      writeDownloaded(keys);
      setDownloaded({ keys: new Set(keys) });
      setRefocus(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  };

  if (notInRepo === 0 && conflicts.length === 0) return null;

  return (
    <>
      {repo ? (
        notInRepo > 0 && (
          <p className="text-xs text-white/60">
            {plural(notInRepo, 'decision')} not written to decisions.json yet:
            the next save writes {notInRepo === 1 ? 'it' : 'them'}.
          </p>
        )
      ) : waiting > 0 ? (
        <ConsoleCallout
          tone="info"
          title={`${plural(waiting, 'decision')} not yet downloaded`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <p className="min-w-0 flex-1">
              Accepts, rejects and reviews are kept in this store until{' '}
              <code className="text-white/80">decisions.json</code> is
              committed: save it as{' '}
              <code className="text-white/80">{DECISIONS_PATH}</code>.
            </p>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy || !token}
              onClick={() => void download()}
            >
              {busy ? (
                <Loader2 aria-hidden className="size-3.5 animate-spin" />
              ) : (
                <Download aria-hidden className="size-3.5" />
              )}
              Download decisions.json
            </Button>
          </div>
          {error && (
            <p role="alert" className="mt-1 text-red-300">
              {error}
            </p>
          )}
        </ConsoleCallout>
      ) : notInRepo > 0 ? (
        <p className="text-xs text-white/60">
          decisions.json downloaded ({plural(notInRepo, 'decision')} not in the
          repo yet): commit it as {DECISIONS_PATH} to keep them.{' '}
          <button
            ref={again}
            type="button"
            className="underline underline-offset-2 hover:text-white"
            disabled={busy}
            onClick={() => void download()}
          >
            Download again
          </button>
        </p>
      ) : null}
      {conflicts.length > 0 && (
        <ConsoleCallout
          tone="warning"
          title={`${plural(conflicts.length, 'committed decision')} could not be written again`}
        >
          <p>
            Replaying decisions.json left these for a person; nothing was
            forced.
          </p>
          <ul className="mt-1 flex flex-col gap-0.5 text-xs">
            {conflicts.slice(0, 10).map((conflict) => (
              <li key={`${conflict.suggestionId}:${conflict.path}`}>
                {conflict.target.slug} · {conflict.path}: {conflict.reason}
              </li>
            ))}
            {conflicts.length > 10 && (
              <li>and {(conflicts.length - 10).toLocaleString()} more</li>
            )}
          </ul>
        </ConsoleCallout>
      )}
    </>
  );
};
