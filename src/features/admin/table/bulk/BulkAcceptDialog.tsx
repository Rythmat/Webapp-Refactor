import { Loader2, Sparkles } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BULK_FLOOR, BULK_THRESHOLD } from '@/content/suggestions/status';
import {
  type SuggestionRow,
  useSuggestions,
} from '@/hooks/data/admin/useSuggestions';
import { ProposalDiff } from '../../content/review/EditReview';
import { ConsoleCallout } from '../../ui/ConsoleCallout';
import { CONSOLE_LABEL } from '../../ui/styles';
import { requiresLine } from '../data/suggestionText';
import { columnForPath } from '../model/ghosts';
import type { TableDef } from '../model/types';
import {
  type BulkContext,
  type BulkItem,
  planBulkAccept,
  recordsToMake,
  skippedByReason,
  standingIds,
  waitingForCalibration,
} from './bulkAccept';
import { useBulkAccept } from './useBulkAccept';

/**
 * Accept a table's sure suggestions many at a time (design §5.1; admins
 * only). In three steps, one dialog:
 *
 *  1. **Choose**: the fields to accept (an event's Place, its Artists), and
 *     how sure a suggestion must be (85% unless the owner chooses otherwise,
 *     never below 70%: the request carries it, and the server holds each
 *     accept to it). Only what may go in bulk is counted: open, sure,
 *     calibrated for the importer's, resting on what stands (an act's
 *     identity, a song's Album row — as the server reports it, since it is
 *     often another item's), not a song-pin City nor a song's year, its item
 *     with no proposal waiting (`bulkAccept.ts`).
 *  2. **Dry run**: how many items change and how many suggestions go, the
 *     records made first (places before artists), the first few items'
 *     changes, and everything left out with why — the importer's runs
 *     waiting for calibration said on their own.
 *  3. **Run**: the server takes the accepts a few items at a time, each
 *     item re-read and checked before its one save, each accept logged
 *     `method: 'bulk'`; progress, Stop, and at the end what went in, what
 *     was refused and why (never forced), and how long it took. The content
 *     refetches once.
 *
 * Each value stays "Accepted in bulk, not reviewed" until someone marks it
 * reviewed in its row (C29). Every name the dialog lists opens its row
 * (once nothing is running); closing gives the keyboard back to the button
 * that opened it.
 */

/** How many items' changes the dry run shows, and how many more at a time. */
const DIFFS_SHOWN = 3;
const DIFFS_MORE = 20;
/** How many names a skipped reason lists before "and N more". */
const NAMES_SHOWN = 12;

/**
 * What the owner may choose, strictest first: 85% unless they choose
 * otherwise, and never below the floor, which the server holds to whatever
 * it is sent.
 */
const THRESHOLDS = [1, 0.95, 0.9, BULK_THRESHOLD, 0.8, 0.75, BULK_FLOOR];

/** The statuses a bulk accept looks at: still to decide, or taken out since. */
const CONSIDERED = new Set(['open', 'conflict', 'removed']);

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`;

const seconds = (ms: number) =>
  ms < 10_000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms / 1000)} s`;

export const BulkAcceptDialog = ({
  def,
  itemOf,
  onClose,
  onOpenRow,
  returnFocus,
}: {
  def: TableDef;
  /** The table's item for a target slug (its row): id, name, body, proposal. */
  itemOf(slug: string): BulkItem | undefined;
  onClose(): void;
  /** Close, and open this row in the panel. */
  onOpenRow?(slug: string): void;
  /** Where the keyboard goes when it closes: the button that opened it. */
  returnFocus?(): void;
}) => {
  const kind = def.contentKind!;
  // Every suggestion of the kind: the open ones to accept, each with how
  // the one it rests on stands (the server says so beside the row).
  const query = useSuggestions({ kind });
  const bulk = useBulkAccept();
  const { progress } = bulk;
  const [threshold, setThreshold] = useState(BULK_THRESHOLD);
  const [unticked, setUnticked] = useState<ReadonlySet<string>>(new Set());
  const [diffsShown, setDiffsShown] = useState(DIFFS_SHOWN);

  const rows = useMemo(() => query.data?.rows ?? [], [query.data]);
  const context = useMemo<BulkContext>(
    () => ({
      itemOf,
      batches: query.data?.batches ?? [],
      threshold,
      standing: standingIds(rows),
    }),
    [itemOf, query.data, threshold, rows],
  );
  const considered = useMemo(
    () => rows.filter((row) => CONSIDERED.has(row.status)),
    [rows],
  );

  // Every field's count, ticked or not, and the plan for the ticked ones.
  const everything = useMemo(
    () => planBulkAccept(considered, context),
    [considered, context],
  );
  const fields = useMemo(
    () => fieldsOf(def, considered, everything),
    [def, considered, everything],
  );
  const plan = useMemo(
    () =>
      planBulkAccept(
        considered,
        context,
        (suggestion) => !unticked.has(suggestion.path),
      ),
    [considered, context, unticked],
  );
  const waiting = waitingForCalibration(plan.skipped);
  const reasons = skippedByReason(plan.skipped);
  const madeFirst = recordCounts(plan.records);

  const running = bulk.running;
  const finished = progress !== null && !running;
  const ofRows = (n: number) => plural(n, def.singular);
  // A name, as a way to its row: not while a run is sending.
  const rowLink = (slug: string, text: string) =>
    onOpenRow && !running ? (
      <button
        type="button"
        onClick={() => onOpenRow(slug)}
        className="text-left underline-offset-2 hover:text-white hover:underline"
      >
        {text}
      </button>
    ) : (
      text
    );

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        // A run in flight finishes its request first: Stop, then close.
        if (!open && !running) onClose();
      }}
    >
      <DialogContent
        className="flex max-h-[88vh] max-w-2xl flex-col gap-4 overflow-hidden"
        onCloseAutoFocus={(event) => {
          if (!returnFocus) return;
          event.preventDefault();
          returnFocus();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles aria-hidden className="size-4 text-sky-300" />
            Accept sure suggestions in bulk
          </DialogTitle>
          <DialogDescription>
            Each {def.singular} is re-read and saved once, only while every
            accept still fits what it says; anything else is listed, never
            forced. Every accept is logged as a bulk decision and stays
            “Accepted in bulk, not reviewed” until someone marks it reviewed.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-6 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6">
          {query.isLoading ? (
            <p className="flex items-center gap-2 text-sm text-white/55">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Reading the suggestions…
            </p>
          ) : query.error ? (
            <ConsoleCallout
              tone="danger"
              title="The suggestions could not be read"
            >
              {query.error.message}
            </ConsoleCallout>
          ) : progress ? (
            <RunReport
              progress={progress}
              running={running}
              noun={def.singular}
              rowLink={rowLink}
            />
          ) : (
            <>
              <section className="flex flex-col gap-2">
                <h3 className={CONSOLE_LABEL}>Fields</h3>
                {fields.length === 0 ? (
                  <p className="text-sm text-white/55">
                    Nothing here can be accepted in bulk.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {fields.map((field) => (
                      <li key={field.path}>
                        <label className="flex items-baseline gap-2 text-sm text-white/85">
                          <input
                            type="checkbox"
                            checked={!unticked.has(field.path)}
                            disabled={field.eligible === 0}
                            onChange={(event) =>
                              setUnticked((before) => {
                                const next = new Set(before);
                                if (event.target.checked)
                                  next.delete(field.path);
                                else next.add(field.path);
                                return next;
                              })
                            }
                            className="accent-white"
                          />
                          <span>{field.label}</span>
                          {field.label !== field.path && (
                            <code className="text-xs text-white/35">
                              {field.path}
                            </code>
                          )}
                          <span className="tabular-nums text-white/55">
                            {plural(field.eligible, 'sure suggestion')}
                          </span>
                          {field.left > 0 && (
                            <span className="text-xs tabular-nums text-white/35">
                              · {field.left.toLocaleString()} left out
                            </span>
                          )}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
                <label className="mt-1 flex items-center gap-2 text-sm text-white/70">
                  At least
                  <select
                    value={threshold}
                    onChange={(event) =>
                      setThreshold(Number(event.target.value))
                    }
                    className="h-7 rounded-md border border-white/[0.12] bg-transparent px-1.5 text-sm text-white"
                  >
                    {THRESHOLDS.map((value) => (
                      <option key={value} value={value}>
                        {Math.round(value * 100)}%
                      </option>
                    ))}
                  </select>
                  sure
                  <span className="text-xs text-white/55">
                    (the server holds each accept to it, and never goes below{' '}
                    {Math.round(BULK_FLOOR * 100)}%)
                  </span>
                </label>
              </section>

              {waiting.count > 0 && (
                <ConsoleCallout
                  tone="warning"
                  title="Imported suggestions wait for calibration"
                >
                  {plural(waiting.count, 'suggestion')} from the importer (
                  {waiting.batches.join(', ')}) are accepted one at a time until
                  the owner’s hand-checked sample has measured their sure tier:
                  the importer’s manifest.json says{' '}
                  <code className="text-white/80">calibrated: false</code>.
                </ConsoleCallout>
              )}

              <section className="flex flex-col gap-2">
                <h3 className={CONSOLE_LABEL}>Dry run</h3>
                {plan.items.length === 0 ? (
                  <p className="text-sm text-white/55">Nothing would change.</p>
                ) : (
                  <>
                    <p className="text-sm text-white/80">
                      {ofRows(plan.items.length)} change:{' '}
                      {plural(plan.count, 'suggestion')} accepted.
                      {madeFirst && ` ${madeFirst} made first.`}
                    </p>
                    {plan.records.length > 0 && (
                      <p className="text-xs text-white/45">
                        Made create-only: a record already there is used only
                        when it is the same one (a place of the same name within
                        25 km); anything else stops that {def.singular} for a
                        person.
                      </p>
                    )}
                    <ul className="flex flex-col gap-2">
                      {plan.items.slice(0, diffsShown).map((item) => (
                        <li key={item.slug} className="text-sm">
                          <span className="text-white">
                            {rowLink(item.slug, item.label)}
                          </span>
                          <span className="text-white/45">
                            {' '}
                            ·{' '}
                            {item.suggestions.map((s) => s.display).join('; ')}
                          </span>
                          {item.suggestions
                            .flatMap(recordsToMake)
                            .map((record) => (
                              <p
                                key={`${record.kind}:${record.slug}`}
                                className="text-xs text-white/50"
                              >
                                {requiresLine(record)}
                              </p>
                            ))}
                          <ProposalDiff
                            before={item.before}
                            after={item.after}
                            defaultOpen={diffsShown === DIFFS_SHOWN}
                          />
                        </li>
                      ))}
                    </ul>
                    {plan.items.length > diffsShown && (
                      <p className="flex flex-wrap items-center gap-2 text-xs text-white/55">
                        Showing {diffsShown.toLocaleString()} of{' '}
                        {ofRows(plan.items.length)}.
                        <button
                          type="button"
                          onClick={() =>
                            setDiffsShown((shown) => shown + DIFFS_MORE)
                          }
                          className="underline underline-offset-2 hover:text-white"
                        >
                          Show{' '}
                          {Math.min(
                            DIFFS_MORE,
                            plan.items.length - diffsShown,
                          ).toLocaleString()}{' '}
                          more
                        </button>
                      </p>
                    )}
                  </>
                )}
              </section>

              {reasons.length > 0 && (
                <section className="flex flex-col gap-2">
                  <h3 className={CONSOLE_LABEL}>
                    Left out · {plan.skipped.length.toLocaleString()}
                  </h3>
                  <ul className="flex flex-col gap-1.5">
                    {reasons.map(({ reason, entries }) => (
                      <li key={reason}>
                        <details>
                          <summary className="cursor-pointer text-sm text-white/70 hover:text-white">
                            <span className="tabular-nums">
                              {entries.length.toLocaleString()}
                            </span>{' '}
                            — {reason}
                          </summary>
                          <p className="mt-1 text-xs text-white/55">
                            {entries.slice(0, NAMES_SHOWN).map((entry, n) => (
                              <span key={`${entry.suggestion.id}:${n}`}>
                                {n > 0 && ', '}
                                {rowLink(
                                  entry.suggestion.target.slug,
                                  entry.label,
                                )}{' '}
                                ({entry.suggestion.display})
                              </span>
                            ))}
                            {entries.length > NAMES_SHOWN &&
                              `, and ${(entries.length - NAMES_SHOWN).toLocaleString()} more`}
                          </p>
                        </details>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          {running ? (
            <Button variant="ghost" onClick={bulk.stop} disabled={!bulk.busy}>
              {bulk.busy ? 'Stop' : 'Stopping…'}
            </Button>
          ) : finished ? (
            <Button onClick={onClose}>Close</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                disabled={plan.items.length === 0 || !query.data}
                onClick={() => void bulk.run(plan, { threshold })}
              >
                Accept {plural(plan.count, 'suggestion')} on{' '}
                {ofRows(plan.items.length)}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/** One field of the table the dialog can accept, and how many of its suggestions go. */
interface FieldChoice {
  path: string;
  label: string;
  /** Suggestions a bulk accept takes, at the threshold. */
  eligible: number;
  /** Left out: not sure enough, waiting, conflicting, a proposal in the way. */
  left: number;
}

function fieldsOf(
  def: TableDef,
  rows: readonly SuggestionRow[],
  plan: ReturnType<typeof planBulkAccept>,
): FieldChoice[] {
  const eligible = new Map<string, number>();
  for (const item of plan.items)
    for (const suggestion of item.suggestions)
      eligible.set(suggestion.path, (eligible.get(suggestion.path) ?? 0) + 1);
  const all = new Map<string, number>();
  for (const row of rows)
    all.set(row.suggestion.path, (all.get(row.suggestion.path) ?? 0) + 1);
  return [...all]
    .map(([path, total]) => ({
      path,
      label: columnForPath(def, path)?.label ?? path,
      eligible: eligible.get(path) ?? 0,
      left: total - (eligible.get(path) ?? 0),
    }))
    .sort((a, b) => b.eligible - a.eligible || a.label.localeCompare(b.label));
}

/** "12 places and 3 artists". */
function recordCounts(records: readonly { kind: string }[]): string | null {
  if (!records.length) return null;
  const words: Record<string, [string, string]> = {
    globe_city: ['place', 'places'],
    artist: ['artist', 'artists'],
    release: ['record', 'records'],
    studio: ['studio', 'studios'],
    label: ['label', 'labels'],
  };
  const counts = new Map<string, number>();
  for (const record of records)
    counts.set(record.kind, (counts.get(record.kind) ?? 0) + 1);
  const parts = [...counts].map(([kind, n]) => {
    const [one, many] = words[kind] ?? [kind, `${kind}s`];
    return plural(n, one, many);
  });
  const text =
    parts.length < 2
      ? parts[0]
      : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The run as it goes, and what it came to. */
const RunReport = ({
  progress,
  running,
  noun,
  rowLink,
}: {
  progress: NonNullable<ReturnType<typeof useBulkAccept>['progress']>;
  running: boolean;
  /** What the table's rows are: "event". */
  noun: string;
  rowLink(slug: string, text: string): ReactNode;
}) => {
  const share = progress.total ? progress.done / progress.total : 1;
  const took = (progress.finishedAt ?? Date.now()) - progress.startedAt;
  const lists: [string, readonly string[], readonly string[]][] = [
    ['Refused, and why', progress.conflicts, progress.slugs.conflicts],
    ['Skipped: a proposal is on it', progress.skipped, progress.slugs.skipped],
    ['Failed', progress.failed, progress.slugs.failed],
  ];
  return (
    <section className="flex flex-col gap-3">
      {/* Always there, so a screen reader hears the run start and end. */}
      <p role="status" className="text-sm text-white/80">
        {running
          ? `Accepting… ${progress.done.toLocaleString()} of ${plural(progress.total, noun)}`
          : `Accepted ${plural(progress.accepted, 'suggestion')} on ${plural(progress.written, noun)} in ${seconds(took)}${
              progress.done < progress.total
                ? `; stopped with ${(progress.total - progress.done).toLocaleString()} not sent`
                : ''
            }.`}
      </p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.done}
        aria-label="Items sent"
        className="h-1 w-full overflow-hidden rounded-full bg-white/10"
      >
        <div
          className="h-full bg-white/70 transition-[width]"
          style={{ width: `${Math.round(share * 100)}%` }}
        />
      </div>
      {lists.map(([title, entries, slugs]) =>
        entries.length ? (
          <details key={title} open={!running && entries.length <= 10}>
            <summary className="cursor-pointer text-sm text-white/70">
              {title} · {entries.length.toLocaleString()}
            </summary>
            <ul className="mt-1 flex max-h-48 flex-col gap-0.5 overflow-y-auto text-xs text-white/60">
              {entries.map((entry, index) => (
                <li key={`${index}:${entry}`}>
                  {slugs[index] ? rowLink(slugs[index], entry) : entry}
                </li>
              ))}
            </ul>
          </details>
        ) : null,
      )}
    </section>
  );
};
