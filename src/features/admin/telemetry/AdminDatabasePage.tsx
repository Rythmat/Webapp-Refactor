import { format } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  useAdminQueryDelta,
  useAdminQueryStats,
  useCaptureQuerySnapshot,
  type QueryStatement,
} from '@/hooks/data/admin/useAdminDatabase';
import { ConsoleBadge } from '../ui/ConsoleBadge';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import { ConsoleSectionTitle } from '../ui/ConsolePageHeader';
import {
  CONSOLE_LABEL,
  CONSOLE_PANEL,
  CONSOLE_TABLE_HEAD,
  consoleTabClass,
} from '../ui/styles';
import { StatCard } from './components/StatCard';

type View = 'live' | 'delta';

const ROW_LIMIT = 50;

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

function formatTimestamp(value: Date | null): string {
  if (!value) return 'unknown';
  try {
    return format(new Date(value), 'MMM d HH:mm');
  } catch {
    return 'unknown';
  }
}

/** Cache hit rate is only a concern when it is low and the query is busy. */
function cacheHitColor(pct: number | null): string {
  if (pct === null) return 'text-muted-foreground';
  if (pct >= 95) return 'text-emerald-400';
  if (pct >= 80) return 'text-amber-400';
  return 'text-red-400';
}

const QueryCell = ({ query }: { query: string }) => (
  <TableCell className="max-w-lg text-xs">
    <span className="line-clamp-2 break-all" title={query}>
      {query}
    </span>
  </TableCell>
);

const NotInstalled = () => (
  <ConsoleCallout
    tone="warning"
    title={<h3>Query attribution is not installed on this database</h3>}
  >
    <p>
      The <code>diagnostics</code> schema is missing. This is expected on a
      fresh Neon branch. Apply{' '}
      <code>src/scripts/sql/setup-query-attribution.sql</code> from the API repo
      — or run <code>bun src/scripts/queryStats.ts setup</code> — to enable it.
    </p>
  </ConsoleCallout>
);

const LiveTable = ({ statements }: { statements: QueryStatement[] }) => {
  if (statements.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No statements recorded yet. Counters are wiped when the Neon compute
        suspends, so this fills in as traffic arrives.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader className={CONSOLE_TABLE_HEAD}>
        <TableRow>
          <TableHead>Query</TableHead>
          <TableHead className="text-right">Calls</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">Mean</TableHead>
          <TableHead className="text-right">Rows</TableHead>
          <TableHead className="text-right">Cache hit</TableHead>
          <TableHead className="text-right">Spilled</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {statements.map((row) => (
          <TableRow key={row.queryid}>
            <QueryCell query={row.query} />
            <TableCell className="text-right">
              {row.calls.toLocaleString()}
            </TableCell>
            <TableCell className="text-right">
              {row.totalSeconds.toFixed(2)} s
            </TableCell>
            <TableCell className="text-right">
              {row.meanMs.toFixed(1)} ms
            </TableCell>
            <TableCell className="text-right">
              {row.rows.toLocaleString()}
            </TableCell>
            <TableCell
              className={`text-right ${cacheHitColor(row.cacheHitPct)}`}
            >
              {row.cacheHitPct === null ? '—' : `${row.cacheHitPct}%`}
            </TableCell>
            <TableCell className="text-right">
              {formatBytes(row.tempSpilledBytes)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export const AdminDatabasePage = () => {
  const [view, setView] = useState<View>('live');

  const stats = useAdminQueryStats({ limit: ROW_LIMIT });
  const delta = useAdminQueryDelta({ limit: ROW_LIMIT });
  const capture = useCaptureQuerySnapshot();

  const isLoading = view === 'live' ? stats.isLoading : delta.isLoading;
  const installed =
    view === 'live' ? stats.data?.installed : delta.data?.installed;

  const onCapture = () => {
    capture.mutate(undefined, {
      onSuccess: ({ captured }) => {
        toast.success('Snapshot captured', {
          description: `${captured} statement${captured === 1 ? '' : 's'} persisted. Capture another after a period of traffic to compare.`,
        });
      },
      onError: (err) => {
        toast.error('Could not capture snapshot', {
          description: err.message,
        });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <ConsoleSectionTitle>Database</ConsoleSectionTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Query attribution from pg_stat_statements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {(['live', 'delta'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                className={consoleTabClass(view === option)}
              >
                {option === 'live' ? 'Live' : 'Since snapshot'}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onCapture}
            disabled={capture.isPending}
          >
            {capture.isPending ? 'Capturing…' : 'Capture snapshot'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
      ) : installed === false ? (
        <NotInstalled />
      ) : view === 'live' ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Statements tracked"
              value={stats.data?.statementCount ?? 0}
              sublabel="Distinct normalised queries"
            />
            <StatCard
              label="Collecting since"
              value={formatTimestamp(stats.data?.collectingSince ?? null)}
              sublabel="Resets when the Neon compute suspends"
            />
          </div>

          <Card className={cn(CONSOLE_PANEL, 'p-4')}>
            <h3 className={cn(CONSOLE_LABEL, 'mb-4')}>
              Hottest queries by total execution time
            </h3>
            <LiveTable statements={stats.data?.statements ?? []} />
          </Card>
        </>
      ) : (
        <Card className={cn(CONSOLE_PANEL, 'p-4')}>
          <div className="mb-4">
            <h3 className={CONSOLE_LABEL}>
              Change between the two most recent snapshots
            </h3>
            {delta.data?.windowStart && delta.data?.windowEnd && (
              <p className="mt-1 text-xs text-muted-foreground">
                {formatTimestamp(delta.data.windowStart)} →{' '}
                {formatTimestamp(delta.data.windowEnd)}
              </p>
            )}
          </div>

          {!delta.data || delta.data.rows.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Needs two snapshots to compare. Capture one, wait for traffic,
              then capture another.
            </p>
          ) : (
            <Table>
              <TableHeader className={CONSOLE_TABLE_HEAD}>
                <TableRow>
                  <TableHead>Query</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                  <TableHead>Baseline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delta.data.rows.map((row) => (
                  <TableRow key={row.queryid}>
                    <QueryCell query={row.query} />
                    <TableCell className="text-right">
                      {row.calls.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.totalSeconds.toFixed(2)} s
                    </TableCell>
                    <TableCell className="text-right">
                      {row.rows.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {row.countersWereReset ? (
                        <ConsoleBadge
                          tone="warning"
                          title="No comparable baseline in the previous snapshot — the compute restarted, counters were reset, or this statement was first seen in this window. Treat the numbers as a lower bound."
                        >
                          partial
                        </ConsoleBadge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          complete
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
};
