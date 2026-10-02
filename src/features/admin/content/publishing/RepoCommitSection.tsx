import { Check, Copy, GitCommitHorizontal, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/components/utilities';
import {
  type RepoFileChange,
  type RepoStatusFile,
  useRepoStatus,
} from '@/hooks/data/admin/useRepoContent';
import { ConsoleBadge, type ConsoleBadgeTone } from '../../ui/ConsoleBadge';
import { ConsoleCallout } from '../../ui/ConsoleCallout';
import { CONSOLE_LABEL, CONSOLE_TABLE_HEAD } from '../../ui/styles';
import { kindLabel } from './kindLabels';

/**
 * Publishing in repo mode (design B): "Commit and deploy".
 *
 * In repo mode a save is already on disk, in the repo's data files on this
 * machine, so there is nothing to publish from here: git is the review,
 * and a commit plus a deploy is the publish. This lists what git has not
 * committed yet (`GET /repo/status`), grouped by what each file holds,
 * with the command that shows the changes. It refreshes after every save,
 * as every content query does.
 */

const CHANGE: Record<
  RepoFileChange,
  { label: string; tone: ConsoleBadgeTone }
> = {
  modified: { label: 'Changed', tone: 'warning' },
  added: { label: 'New', tone: 'success' },
  untracked: { label: 'New', tone: 'success' },
  deleted: { label: 'Deleted', tone: 'danger' },
  renamed: { label: 'Renamed', tone: 'info' },
  conflicted: { label: 'Conflict', tone: 'danger' },
};

/** What a file is listed under: its first kind, or the decisions log. */
const groupOf = (file: RepoStatusFile): string =>
  file.kinds.length ? kindLabel(file.kinds[0]) : 'Suggestion decisions';

/** Shell-quoted, for a command someone pastes into a terminal. */
const quoted = (path: string): string =>
  /^[\w./-]+$/.test(path) ? path : `'${path.replace(/'/g, `'\\''`)}'`;

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`;

export const RepoCommitSection = () => {
  const status = useRepoStatus(true);
  const [copied, setCopied] = useState(false);
  const data = status.data;

  const groups = new Map<string, RepoStatusFile[]>();
  for (const file of data?.files ?? []) {
    const group = groupOf(file);
    groups.set(group, [...(groups.get(group) ?? []), file]);
  }
  // Against HEAD, so a file already staged (`git add`) still shows: plain
  // `git diff` shows only what is not staged yet.
  const diff = data?.files.length
    ? `git diff HEAD -- ${data.files
        .filter((file) => file.change !== 'untracked')
        .map((file) => quoted(file.path))
        .join(' ')}`
    : '';
  const untracked = (data?.files ?? []).filter(
    (file) => file.change === 'untracked',
  ).length;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(diff);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={CONSOLE_LABEL}>Commit and deploy</h2>
        <Button
          size="sm"
          variant="secondary"
          disabled={status.isFetching}
          onClick={() => void status.refetch()}
        >
          <RefreshCw
            aria-hidden
            className={cn('size-3.5', status.isFetching && 'animate-spin')}
          />
          Check again
        </Button>
      </div>
      <p className="max-w-3xl text-sm text-white/70">
        In repo mode every save is already in the repo’s data files on this
        machine. A change goes out once it is committed and deployed (students
        see the ones to what they read): review the changes, commit them, and
        deploy.
      </p>

      {status.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : status.error ? (
        <ConsoleCallout tone="danger" title="Git’s changes did not load">
          {status.error.message}
        </ConsoleCallout>
      ) : !data ? null : !data.git ? (
        <ConsoleCallout tone="warning" title="Git did not answer">
          <p>
            Git could not list the changes in{' '}
            <code className="text-white/80">{data.root}</code>
            {data.error ? ` (${data.error})` : ''}. The saves are in the files
            all the same.
          </p>
        </ConsoleCallout>
      ) : data.files.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-white/60">
          <GitCommitHorizontal aria-hidden className="size-4" />
          Nothing to commit: the data files match the last commit
          {data.branch ? ` on ${data.branch}` : ''}.
        </p>
      ) : (
        <>
          <p className="text-sm text-white/70">
            {plural(data.files.length, 'data file')} changed and not committed
            {data.branch ? (
              <>
                {' '}
                on <code className="text-white/80">{data.branch}</code>
              </>
            ) : null}
            .
          </p>
          <Table>
            <TableHeader className={CONSOLE_TABLE_HEAD}>
              <TableRow>
                <TableHead className="w-44">Holds</TableHead>
                <TableHead>File</TableHead>
                <TableHead className="w-28">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...groups].flatMap(([group, files]) =>
                files.map((file, index) => (
                  <TableRow key={file.path}>
                    <TableCell className="align-top text-white/80">
                      {index === 0 ? (
                        <>
                          {group}
                          <span className="text-white/40">
                            {' '}
                            ({files.length})
                          </span>
                        </>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <code className="break-all text-xs text-white/75">
                        {file.path}
                      </code>
                    </TableCell>
                    <TableCell>
                      <ConsoleBadge tone={CHANGE[file.change].tone}>
                        {CHANGE[file.change].label}
                      </ConsoleBadge>
                    </TableCell>
                  </TableRow>
                )),
              )}
            </TableBody>
          </Table>
          {diff && data.files.length > untracked && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-white/55">
                To review the changes, run in the repo:
              </p>
              <div className="flex items-start gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-2">
                <code className="max-h-24 min-w-0 flex-1 overflow-auto whitespace-pre-wrap break-all text-xs text-white/75">
                  {diff}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Copy the command"
                  onClick={() => void copy()}
                >
                  {copied ? (
                    <Check aria-hidden className="size-3.5" />
                  ) : (
                    <Copy aria-hidden className="size-3.5" />
                  )}
                </Button>
              </div>
              {untracked > 0 && (
                <p className="text-xs text-white/45">
                  {plural(untracked, 'new file')} git does not track yet: add{' '}
                  {untracked === 1 ? 'it' : 'them'} with the commit.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
};
