import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminRoutes } from '@/constants/routes';
import type { Graph } from '@/content/graph/deriveGraph';
import {
  checkIntegrity,
  type CoverageRow,
  INTEGRITY_CHECKS,
  type IntegrityCheck,
  type IntegrityRow,
  type IntegritySeverity,
} from '@/content/graph/integrity';
import type { GraphNode } from '@/content/graph/types';
import { ConsoleBadge, type ConsoleBadgeTone } from '../../ui/ConsoleBadge';
import { ConsoleCallout } from '../../ui/ConsoleCallout';
import {
  CONSOLE_LABEL,
  CONSOLE_PANEL,
  CONSOLE_TABLE_HEAD,
  consoleTabClass,
} from '../../ui/styles';
import { GraphModeBadge } from './GraphModeBadge';
import { type SongPin, SongPinLink, songPinOf } from './SongPinLink';
import { TryAgain, WorkingGraphNotice } from './WorkingGraphNotice';
import { editorFor, isEditedHere, kindLabel } from './graphVocabulary';
import { useWorkingGraph } from './useWorkingGraph';
import { useWorkingGraphStatus } from './workingGraphStatus';

/**
 * What is wrong with the Atlas's metadata, and how much of it is linked
 * (design §3.5): the worklist behind Cortex, the graph.
 *
 * Coverage first, because it is the headline today — most reference fields
 * are text a guess reads, not ids — then every problem row, filterable by
 * check and severity. Each row links to the node on the map and to the item
 * at fault: its row in the Table, saying so where nothing edits that kind
 * yet, or the song pin that states it.
 *
 * It checks the working graph (`useWorkingGraph`), the one the map and the
 * Table draw: a fix saved anywhere in the console is checked again here once
 * the graph has rebuilt. Where that is the repo's copy for want of a working
 * one, or the working copy is behind, the notice the Table and the map show
 * says so (`WorkingGraphNotice`).
 */

const CHECK_LABEL: Record<IntegrityCheck, string> = {
  dangling: 'Names nothing',
  'wrong-kind': 'Wrong kind',
  malformed: 'Malformed id',
  endpoints: 'Invalid connection',
  unresolved: 'Unlinked text',
  orphan: 'Unconnected',
  duplicate: 'Possible duplicate',
  cycle: 'Loop',
  'conflicting-owners': 'Fields disagree',
  'impossible-years': "Years don't add up",
  'restated-influence': 'Influence stated twice',
  'draft-reference': 'Points at a draft',
  unverified: 'Unconfirmed',
};

const SEVERITY_TONE: Record<IntegritySeverity, ConsoleBadgeTone> = {
  error: 'danger',
  warning: 'warning',
  info: 'muted',
};

const SEVERITIES: IntegritySeverity[] = ['error', 'warning', 'info'];

const PAGE = 100;

const focusLink = (id: string) => AdminRoutes.cortex(undefined, { focus: id });

export const IntegrityPage = () => {
  // No item lists: the checks read the graph, not the items' states.
  const working = useWorkingGraph({ items: false });
  const status = useWorkingGraphStatus(working);
  const { atlas } = working;
  const [params, setParams] = useSearchParams();
  const check = params.get('check') as IntegrityCheck | null;
  const severity = params.get('severity') as IntegritySeverity | null;
  const [shown, setShown] = useState(PAGE);

  const report = useMemo(
    () => (atlas ? checkIntegrity(atlas.snapshot, atlas.graph) : null),
    [atlas],
  );

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
    setShown(PAGE);
  };

  const rows = useMemo(
    () =>
      report?.rows.filter(
        (r) =>
          (!check || r.check === check) &&
          (!severity || r.severity === severity),
      ) ?? [],
    [report, check, severity],
  );

  const bySeverity = useMemo(() => {
    const out: Record<IntegritySeverity, number> = {
      error: 0,
      warning: 0,
      info: 0,
    };
    for (const r of report?.rows ?? []) out[r.severity]++;
    return out;
  }, [report]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-6 px-6 pb-10 pt-6 md:px-10">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl tracking-tight text-white">Cortex</h1>
          <GraphModeBadge
            mode={working.mode}
            status={status}
            refreshing={working.isRefreshing}
          />
          <nav aria-label="Graph views" className="flex gap-1">
            <Link
              to={AdminRoutes.cortex()}
              className={consoleTabClass(false, 'sm')}
            >
              Map
            </Link>
            <span aria-current="page" className={consoleTabClass(true, 'sm')}>
              Integrity
            </span>
            <Link
              to={AdminRoutes.cortexLinks()}
              className={consoleTabClass(false, 'sm')}
            >
              Links
            </Link>
          </nav>
        </div>

        {atlas && (
          <WorkingGraphNotice
            status={status}
            error={working.error}
            subject="integrity"
            className=""
          />
        )}

        {!atlas && !working.isLoading ? (
          <ConsoleCallout tone="danger">
            The graph could not be built: {String(working.error)}. <TryAgain />
          </ConsoleCallout>
        ) : !report || !atlas ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
            <p className="text-sm text-white/45">Checking the graph…</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {SEVERITIES.map((s) => (
                <Tile
                  key={s}
                  label={
                    s === 'error'
                      ? 'Errors'
                      : s === 'warning'
                        ? 'Warnings'
                        : 'Worth a look'
                  }
                  value={bySeverity[s]}
                  active={severity === s}
                  onClick={() => set('severity', severity === s ? null : s)}
                />
              ))}
              <Tile
                label="Unconfirmed"
                value={report.unverified.edges}
                note={`${report.unverified.nodes} records`}
              />
            </div>

            <section
              aria-labelledby="coverage-h"
              className="flex flex-col gap-3"
            >
              <h2 id="coverage-h" className={CONSOLE_LABEL}>
                How much is linked
              </h2>
              <Coverage rows={report.coverage} />
            </section>

            <section aria-labelledby="rows-h" className="flex flex-col gap-3">
              <h2 id="rows-h" className={CONSOLE_LABEL}>
                Problems
              </h2>
              <div
                role="group"
                aria-label="Check"
                className="flex flex-wrap gap-1"
              >
                <button
                  type="button"
                  aria-pressed={!check}
                  onClick={() => set('check', null)}
                  className={consoleTabClass(!check, 'sm')}
                >
                  All · {report.rows.length}
                </button>
                {INTEGRITY_CHECKS.filter((c) => report.counts[c] > 0).map(
                  (c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={check === c}
                      onClick={() => set('check', check === c ? null : c)}
                      className={consoleTabClass(check === c, 'sm')}
                    >
                      {CHECK_LABEL[c]} · {report.counts[c]}
                    </button>
                  ),
                )}
              </div>
              <ProblemRows
                rows={rows.slice(0, shown)}
                graph={atlas.graph}
                pins={working.pins}
              />
              {rows.length > shown && (
                <button
                  type="button"
                  onClick={() => setShown((n) => n + PAGE)}
                  className={`${consoleTabClass(false, 'sm')} self-start`}
                >
                  Show {Math.min(PAGE, rows.length - shown)} more of{' '}
                  {rows.length - shown}
                </button>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

const Tile = ({
  label,
  value,
  note,
  active,
  onClick,
}: {
  label: string;
  value: number;
  note?: string;
  active?: boolean;
  onClick?: () => void;
}) => {
  const body = (
    <>
      <span className={CONSOLE_LABEL}>{label}</span>
      <span className="text-2xl text-white">{value.toLocaleString()}</span>
      {note && <span className="text-xs text-white/45">{note}</span>}
    </>
  );
  const cls = `${CONSOLE_PANEL} flex flex-col items-start gap-1 p-4 text-left`;
  return onClick ? (
    <button
      type="button"
      aria-pressed={!!active}
      onClick={onClick}
      className={`${cls} transition-colors hover:border-white/20 ${
        active ? 'border-white/30' : ''
      }`}
    >
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
};

const Coverage = ({ rows }: { rows: CoverageRow[] }) => (
  <div className={`${CONSOLE_PANEL} overflow-x-auto`}>
    <Table>
      <TableHeader className={CONSOLE_TABLE_HEAD}>
        <TableRow>
          <TableHead>Field</TableHead>
          <TableHead>Points at</TableHead>
          <TableHead className="w-2/5">Linked by id</TableHead>
          <TableHead className="text-right">Text only</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const pct = r.items ? r.linked / r.items : 0;
          return (
            <TableRow key={`${r.kind}|${r.path}`}>
              <TableCell>
                <span className="text-white/45">{r.kind} · </span>
                <span className="text-white">{r.path}</span>
              </TableCell>
              <TableCell className="text-white/60">{r.target}</TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div
                    aria-hidden
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]"
                  >
                    <div
                      className="h-full rounded-full bg-white/70"
                      style={{ width: `${Math.round(pct * 100)}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-xs text-white/70">
                    {r.linked.toLocaleString()} of {r.items.toLocaleString()}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right text-white/60">
                {r.inferred ? r.inferred.toLocaleString() : '—'}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </div>
);

/**
 * The song pins behind a fix, when pins state it: a pin's edge is filed under
 * the artist it pins (`EdgeVia.statedBy`), so a row about one names the
 * artist and a field artists do not have (`city`), and the fix is the pin's.
 * Found by the edges the fix's item and field state, to what the row names.
 */
function pinsBehind(
  graph: Graph,
  { fix, related }: IntegrityRow,
): readonly SongPin[] {
  if (!fix) return [];
  const found = new Map<string, SongPin>();
  for (const edge of graph.adjacency.get(fix.id) ?? []) {
    if (
      related?.length &&
      !related.includes(edge.from === fix.id ? edge.to : edge.from)
    ) {
      continue;
    }
    for (const via of edge.via) {
      const pin =
        via.item === fix.id && via.path === fix.path ? songPinOf(via) : null;
      if (pin) found.set(pin.id, pin);
    }
  }
  return [...found.values()];
}

const ProblemRows = ({
  rows,
  graph,
  pins,
}: {
  rows: IntegrityRow[];
  graph: Graph;
  pins: ReadonlyMap<string, string> | undefined;
}) => {
  if (rows.length === 0) {
    return <p className="text-sm text-white/45">Nothing to show here.</p>;
  }
  const nodes: ReadonlyMap<string, GraphNode> = graph.nodes;
  const name = (id: string) => nodes.get(id)?.label ?? id;
  return (
    <div className={`${CONSOLE_PANEL} overflow-x-auto`}>
      <Table>
        <TableHeader className={CONSOLE_TABLE_HEAD}>
          <TableRow>
            <TableHead>Check</TableHead>
            <TableHead>About</TableHead>
            <TableHead>What</TableHead>
            <TableHead>Fix</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={`${r.check}|${r.id}|${r.path ?? ''}|${i}`}>
              <TableCell className="whitespace-nowrap">
                <ConsoleBadge tone={SEVERITY_TONE[r.severity]}>
                  {CHECK_LABEL[r.check]}
                </ConsoleBadge>
              </TableCell>
              <TableCell>
                <Link
                  to={focusLink(r.id)}
                  className="text-white hover:underline"
                >
                  {name(r.id)}
                </Link>
                <span className="block text-xs text-white/40">
                  {kindLabel(r.kind)}
                  {r.path ? ` · ${r.path}` : ''}
                </span>
              </TableCell>
              <TableCell className="max-w-xl text-sm text-white/70">
                {r.message}
                {r.related && r.related.length > 0 && (
                  <span className="mt-1 flex flex-wrap gap-x-2 text-xs">
                    {r.related.slice(0, 6).map((id) => (
                      <Link
                        key={id}
                        to={focusLink(id)}
                        className="text-white/55 hover:text-white hover:underline"
                      >
                        {name(id)}
                      </Link>
                    ))}
                    {r.related.length > 6 && (
                      <span className="text-white/40">
                        +{r.related.length - 6}
                      </span>
                    )}
                  </span>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs">
                <Fix row={r} graph={graph} pins={pins} name={name} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

/**
 * Where a row is fixed: the song pins that state it, or the item's row in
 * the Table — saying so where nothing in the console edits that kind yet
 * (the record kinds, until their editors), so "Open" never promises an edit.
 */
const Fix = ({
  row,
  graph,
  pins,
  name,
}: {
  row: IntegrityRow;
  graph: Graph;
  pins: ReadonlyMap<string, string> | undefined;
  name: (id: string) => string;
}) => {
  const { fix } = row;
  if (!fix) return <span className="text-white/30">—</span>;
  const songPins = pinsBehind(graph, row);
  if (songPins.length > 0) {
    return (
      <span className="flex flex-col">
        {songPins.map((pin) => (
          <SongPinLink key={pin.id} pin={pin} path={fix.path} pins={pins} />
        ))}
      </span>
    );
  }
  const editor = editorFor(fix.id);
  if (!editor) {
    return (
      <span className="text-white/45">
        {name(fix.id)}
        <span className="block">{fix.path}</span>
        <span className="block">not editable here yet</span>
      </span>
    );
  }
  const edited = isEditedHere(fix.id);
  return (
    <Link
      to={editor}
      className="text-white/75 hover:text-white hover:underline"
      title={
        edited
          ? 'Open its row in the Table, which edits it'
          : 'Open its row in the Table: nothing in the console edits it yet'
      }
    >
      Open {name(fix.id)}
      <span className="block text-white/40">{fix.path}</span>
      {!edited && (
        <span className="block text-white/40">not editable here yet</span>
      )}
    </Link>
  );
};
