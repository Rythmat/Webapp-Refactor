import { ArrowRight, ArrowUpRight, Loader2, Sparkles } from 'lucide-react';
import {
  type FC,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import type { Graph } from '@/content/graph/deriveGraph';
import { checkSuggestion } from '@/content/suggestions/apply';
import {
  isExternalIdPath,
  isSongPinCity,
  type SuggestionDependency,
} from '@/content/suggestions/status';
import type { DecisionOp, Suggestion } from '@/content/suggestions/types';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import {
  type DecisionInput,
  type DecisionResult,
  OPEN_STATUSES,
  reopenable,
  type SuggestionQuery,
  type SuggestionRow,
  useDecideSuggestions,
  useSuggestions,
} from '@/hooks/data/admin/useSuggestions';
import { ConsoleBadge } from '../../ui/ConsoleBadge';
import { ConsoleCallout } from '../../ui/ConsoleCallout';
import {
  type BulkContext,
  bulkBlocker,
  recordsToMake,
  standingIds,
} from '../bulk/bulkAccept';
import {
  PROVIDER_NAME,
  providersOf,
  requiresLine,
  tierLine,
} from '../data/suggestionText';
import { columnForPath, valueText } from '../model/ghosts';
import type { TableDef } from '../model/types';
import { tableHrefForItem } from '../tablePaths';
import { PanelSection } from './PanelSection';
import { PinMovesNote, usePinMoves } from './PinMoves';

/**
 * The row panel's Suggestions (design §3.3, Table design §8): what MusicBrainz,
 * Wikidata and the app's own data offer for this item, each with its value,
 * why it is believed, where to check it, and how sure it is — and what to do
 * with it.
 *
 *  - **Accept** writes it where the field is empty; **Replace**, where the
 *    field says something else, shows the two side by side first and writes
 *    over only what was shown. Either is the server's ordinary save — the
 *    item for an admin, the editor's proposal for an editor — made after it
 *    has re-read the item, with any record the value needs made first
 *    ("Creates the place Gary first"). A City says first which song pins it
 *    moves (the pin-move report), and is accepted only once that is known.
 *  - **Reject** (an admin's) says it is wrong: it is remembered, and not
 *    offered again until the value changes. **Drop** says a song-pin City is
 *    not wrong but not to be carried over. Each asks once, and each can be
 *    taken back from the Rejected list ("Undo reject", "Undo drop": a
 *    `reopen` decision), which offers the suggestion again as before; the
 *    reject stays in the log beneath it.
 *  - **Mark reviewed** clears a bulk accept from "Accepted in bulk, not
 *    reviewed" (C29); the section's own button marks every one on the row.
 *  - **Accept the sure ones** takes the row's sure, open suggestions in one
 *    request, the identity they rest on first — a person's accept, looked
 *    at here, not a bulk one; a City still goes one at a time, with its
 *    report.
 *
 * The identity (who MusicBrainz and Wikidata think the act is) comes first:
 * the rest rest on it. A card resting on another item's suggestion — a
 * song's rows on the act's identity, a Label row on a song's Album row —
 * says how that one stands, as the server reports it beside the row, and
 * links to its row. A sure suggestion that a bulk accept would still leave
 * out says why. For an editor, an accept that is only in their own
 * proposal says so.
 *
 * Accepting saves the item, so it waits while the Details have unsaved
 * changes, and for an admin while a proposal waits on the item: the save
 * would slide under it. Everything decided is kept below, collapsed: what
 * was accepted, and what was rejected. After a decision the keyboard moves
 * to the next suggestion, or to the section's heading.
 */

/** Statuses a person can still act on, in the order they are listed. */
const ACTIONABLE = new Set([
  'open',
  'conflict',
  'removed',
  'unreachable',
  'accepted',
]);

const formatDate = (at: string) =>
  new Date(at).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const BUTTON =
  'inline-flex h-7 items-center gap-1 rounded-full px-3 text-xs transition-colors disabled:pointer-events-none disabled:opacity-40';
const PRIMARY = `${BUTTON} bg-white text-[#101012] hover:bg-white/90`;
const SECONDARY = `${BUTTON} border border-white/[0.12] text-white/75 hover:border-white/25 hover:text-white`;
const DANGER = `${BUTTON} border border-red-400/40 text-red-200 hover:border-red-300/70 hover:text-red-100`;

/** Where a City lives: the one path whose accept moves song pins. */
const CITY_PATH = 'basedInPlaceId';

export interface SuggestionsSectionProps {
  kind: ContentKind;
  /** The item's slug: the row's key. */
  slug: string;
  /** The row's name: "the songs Marvin Gaye leads". */
  label: string;
  def: TableDef;
  graph: Graph;
  /**
   * The body an accept builds on — the session's, with no unsaved changes:
   * an editor's own proposal, else the live body. What a conflict shows as
   * "now", and what a Replace says it saw.
   */
  base: Record<string, unknown> | null;
  /**
   * An editor's own proposal is `base`: the live body beside it, so an
   * accept that is only in the proposal says so.
   */
  live?: Record<string, unknown> | null;
  isEditor: boolean;
  /**
   * Why an accept cannot be made now (unsaved changes, a proposal to review
   * first, a read-only row), or null. Empty: not yet, nothing to say.
   */
  blocked: string | null;
  /** The item as a bulk accept sees it: in the API, a proposal on it. */
  item: { itemId?: string; pending: boolean };
  /** The next row in the grid with suggestions to look at. */
  next?: { label: string; go(): void } | null;
}

/**
 * The field a suggestion is for, as its column names it: a credit by its
 * role (a songwriter's is Composers, an engineer's Engineer), since a column
 * per role shares `credits[]`.
 */
const fieldOf = (
  def: TableDef,
  suggestion: Pick<Suggestion, 'path' | 'value'>,
): string =>
  columnForPath(def, suggestion.path, suggestion.value)?.label ??
  suggestion.path;

/** Suggestions another rests on: the identity, listed first. */
const restedOn = (rows: readonly SuggestionRow[]): Set<string> =>
  new Set(
    rows.flatMap((row) =>
      row.suggestion.dependsOn ? [row.suggestion.dependsOn] : [],
    ),
  );

export const SuggestionsSection: FC<SuggestionsSectionProps> = ({
  kind,
  slug,
  label,
  def,
  graph,
  base,
  live,
  isEditor,
  blocked,
  item,
  next,
}) => {
  const request = useMemo<SuggestionQuery>(
    () => ({ kind, slugs: [slug] }),
    [kind, slug],
  );
  const query = useSuggestions(request);
  // One decision at a time on a row: each is a save of the same item.
  const decide = useDecideSuggestions({ waitFor: request });
  const rows = useMemo(() => query.data?.rows ?? [], [query.data]);
  // What the last decision did, said here: its card moves on (to Accepted,
  // to Rejected) as soon as the rows refetch.
  const [notice, setNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const listRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Where the keyboard goes once a decision's card has moved on.
  // `back`: the decision brings its suggestion back among the cards (an
  // Undo), and the keyboard waits for that card.
  const refocus = useRef<{
    order: string[];
    from: string;
    back?: boolean;
  } | null>(null);

  const { actionable, reviewing, accepted, rejected, proposed } =
    useMemo(() => {
      const first = restedOn(rows);
      const order = (row: SuggestionRow) => {
        if (first.has(row.suggestion.id)) return -1;
        const column = columnForPath(
          def,
          row.suggestion.path,
          row.suggestion.value,
        );
        return column ? def.columns.indexOf(column) : def.columns.length;
      };
      const sorted = [...rows].sort((a, b) => order(a) - order(b));
      // An editor's accept that their proposal holds and the live body not.
      const inProposal = new Set(
        live && isEditor
          ? rows
              .filter(
                (row) =>
                  row.status === 'applied' &&
                  checkSuggestion(live, row.suggestion).state !== 'applied',
              )
              .map((row) => row.suggestion.id)
          : [],
      );
      return {
        actionable: sorted.filter((row) => ACTIONABLE.has(row.status)),
        reviewing: sorted.filter(
          (row) => row.unreviewed && !ACTIONABLE.has(row.status),
        ),
        accepted: sorted.filter(
          (row) => row.status === 'applied' && !row.unreviewed,
        ),
        rejected: sorted.filter(
          (row) => row.status === 'rejected' || row.status === 'dropped',
        ),
        proposed: inProposal,
      };
    }, [rows, def, live, isEditor]);

  // Once the rows have moved on, the keyboard goes to the next suggestion
  // still offered, else to the heading — never to the page's top.
  useEffect(() => {
    const wanted = refocus.current;
    const list = listRef.current;
    if (!wanted || !list || decide.isPending) return;
    const cards = new Map(
      [...list.querySelectorAll<HTMLElement>('[data-suggestion]')].map(
        (card) => [card.dataset.suggestion, card],
      ),
    );
    if (wanted.back) {
      // Onto the card it is back as, once it is.
      const button = cards
        .get(wanted.from)
        ?.querySelector<HTMLButtonElement>('button:not(:disabled)');
      if (!button) return;
      refocus.current = null;
      button.focus();
      return;
    }
    if (list.contains(document.activeElement)) {
      refocus.current = null;
      return;
    }
    refocus.current = null;
    const start = wanted.order.indexOf(wanted.from);
    const candidates = [
      ...wanted.order.slice(start),
      ...wanted.order.slice(0, Math.max(0, start)),
    ];
    for (const id of candidates) {
      const button = cards
        .get(id)
        ?.querySelector<HTMLButtonElement>('button:not(:disabled)');
      if (button) {
        button.focus();
        return;
      }
    }
    headingRef.current?.focus();
  }, [rows, decide.isPending]);

  if (!query.served) return null;
  const open = rows.filter((row) => OPEN_STATUSES.includes(row.status)).length;
  const byId = new Map(rows.map((row) => [row.suggestion.id, row]));
  const busy = decide.isPending;
  const admin = !isEditor;

  // For "not in bulk because…": the row as a bulk accept would see it.
  const bulkContext: BulkContext = {
    itemOf: () => ({ ...item, label, body: base ?? undefined }),
    batches: query.data?.batches ?? [],
    standing: standingIds(rows),
  };
  /**
   * Whether what a row rests on is in the body this viewer's saves build
   * on: as the server reports it (often another item's — the act's identity
   * a song's rows rest on), for an editor their own proposal too; else the
   * row's own list, and what this same request accepts first.
   */
  const restsOnStanding = (
    row: SuggestionRow,
    accepting: ReadonlySet<string>,
  ) => {
    const rests = row.suggestion.dependsOn;
    if (!rests) return true;
    if (row.dependency)
      return (
        row.dependency.stands ||
        (isEditor && row.dependency.status === 'applied') ||
        accepting.has(rests)
      );
    return bulkContext.standing.has(rests) || accepting.has(rests);
  };

  /** Send decisions, say what came of them, and move the keyboard on. */
  const run = async (
    decisions: DecisionInput[],
    from: string,
    say: (done: DecisionResult[]) => string,
  ) => {
    const ids = decisions.map((d) => d.suggestionId);
    setErrors((before) => {
      const next = { ...before };
      for (const id of ids) delete next[id];
      return next;
    });
    setNotice(null);
    const order = [...actionable, ...reviewing].map((row) => row.suggestion.id);
    // Not among the cards: it is coming back to them (an Undo).
    refocus.current = { order, from, back: !order.includes(from) };
    try {
      const { results } = await decide.mutateAsync(decisions);
      const refused = results.flatMap((result) =>
        result.outcome === 'refused' ? [result] : [],
      );
      if (refused.length)
        setErrors((before) => ({
          ...before,
          ...Object.fromEntries(refused.map((r) => [r.suggestionId, r.error])),
        }));
      const done = results.filter((result) => result.outcome !== 'refused');
      if (done.length) setNotice(say(done));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setErrors((before) => ({
        ...before,
        ...Object.fromEntries(ids.map((id) => [id, message])),
      }));
    }
  };

  const act = (
    row: SuggestionRow,
    op: DecisionOp,
    extra: Partial<DecisionInput> = {},
  ) =>
    run(
      [{ suggestionId: row.suggestion.id, op, method: 'single', ...extra }],
      row.suggestion.id,
      ([result]) =>
        doneLine(
          op,
          result.outcome === 'refused' ? 'saved' : result.outcome,
          row.suggestion.display,
        ),
    );

  // The row's sure, open suggestions, the identity first; a City is
  // accepted on its own, with its report, and a song-pin City never here.
  const accepting = new Set<string>();
  const sure = actionable.filter((row) => {
    const { suggestion } = row;
    if (
      row.status !== 'open' ||
      suggestion.tier !== 'sure' ||
      suggestion.path === CITY_PATH ||
      isSongPinCity(suggestion)
    )
      return false;
    if (!restsOnStanding(row, accepting)) return false;
    accepting.add(suggestion.id);
    return true;
  });
  const unreviewed = [...actionable, ...reviewing].filter(
    (row) => row.unreviewed,
  );

  const actions =
    rows.length > 0 ? (
      <div className="flex flex-wrap gap-1.5">
        {sure.length > 1 && (
          <button
            type="button"
            className={SECONDARY}
            disabled={busy || blocked !== null}
            title={
              blocked ||
              'Each is accepted by you, as if one at a time: logged, not "in bulk". A City is accepted on its own, with the pins it moves.'
            }
            onClick={() =>
              void run(
                sure.map((row) => ({
                  suggestionId: row.suggestion.id,
                  op: 'accept',
                  method: 'single',
                })),
                sure[0].suggestion.id,
                ({ length: done }) =>
                  `${isEditor ? 'Put' : 'Accepted'} ${done} sure ${done === 1 ? 'suggestion' : 'suggestions'}${isEditor ? ' in your proposal, for review' : ''}.`,
              )
            }
          >
            Accept the {sure.length} sure ones
          </button>
        )}
        {admin && unreviewed.length > 1 && (
          <button
            type="button"
            className={SECONDARY}
            disabled={busy}
            onClick={() =>
              void run(
                unreviewed.map((row) => ({
                  suggestionId: row.suggestion.id,
                  op: 'review',
                  method: 'single',
                })),
                unreviewed[0].suggestion.id,
                ({ length: done }) =>
                  `Marked ${done} bulk ${done === 1 ? 'accept' : 'accepts'} reviewed.`,
              )
            }
          >
            Mark all {unreviewed.length} reviewed
          </button>
        )}
      </div>
    ) : undefined;

  const card = (row: SuggestionRow) => (
    <SuggestionCard
      key={row.suggestion.id}
      kind={kind}
      slug={slug}
      label={label}
      row={row}
      rest={byId}
      def={def}
      graph={graph}
      base={base}
      isEditor={isEditor}
      blocked={blocked}
      busy={busy}
      error={errors[row.suggestion.id] ?? null}
      notInBulk={
        admin &&
        row.suggestion.tier === 'sure' &&
        (row.status === 'open' || row.status === 'removed')
          ? bulkBlocker(row, bulkContext)
          : null
      }
      proposed={proposed}
      onAct={(op, extra) => void act(row, op, extra)}
    />
  );

  return (
    <PanelSection
      title="Suggestions"
      count={open}
      actions={actions}
      headingRef={headingRef}
    >
      {query.isLoading ? (
        <p className="text-sm text-white/50">Loading suggestions…</p>
      ) : query.error ? (
        <ConsoleCallout tone="danger" title="Suggestions could not be loaded">
          {query.error.message}
        </ConsoleCallout>
      ) : rows.length === 0 ? (
        <p className="text-sm text-white/50">
          Nothing is suggested for this {def.singular}.
        </p>
      ) : (
        <div ref={listRef} className="flex flex-col gap-3">
          <p role="status" className="text-xs text-white/60 empty:hidden">
            {notice}
          </p>
          {/* Why nothing can be accepted now: said once, for every card. */}
          {blocked && actionable.length > 0 && (
            <p className="text-xs text-white/60">{blocked}</p>
          )}
          {actionable.length === 0 && reviewing.length === 0 && (
            <p className="text-sm text-white/50">
              Nothing waits for a decision.
            </p>
          )}
          {actionable.map(card)}
          {reviewing.map(card)}
          <Decided
            title="Accepted"
            rows={accepted}
            def={def}
            proposed={proposed}
          />
          <Decided
            title="Rejected"
            rows={rejected}
            def={def}
            rejected
            onReopen={admin ? (row) => void act(row, 'reopen') : undefined}
            busy={busy}
            errors={errors}
          />
        </div>
      )}
      {next && (
        <button
          type="button"
          onClick={next.go}
          className="inline-flex items-center gap-1 self-start text-xs text-white/60 underline-offset-2 hover:text-white hover:underline"
        >
          Next with suggestions: {next.label}
          <ArrowRight aria-hidden className="size-3" />
        </button>
      )}
    </PanelSection>
  );
};

/** What a decision did, in a line. */
function doneLine(
  op: DecisionOp,
  outcome: 'saved' | 'proposed' | 'already' | 'recorded',
  display: string,
): string {
  const what = `“${display}”`;
  if (outcome === 'proposed') return `${what} is in your proposal, for review.`;
  if (outcome === 'already')
    return `The item says ${what} already: logged as accepted.`;
  switch (op) {
    case 'reject':
      return `Rejected ${what}: not offered again.`;
    case 'drop':
      return `Dropped ${what}: it stays off this item.`;
    case 'review':
      return `Marked ${what} reviewed.`;
    case 'reopen':
      return `Reopened ${what}: offered again.`;
    case 'replace':
      return `Replaced with ${what}.`;
    default:
      return `Accepted ${what}.`;
  }
}

/** Decided suggestions, collapsed: remembered, not offered again. */
const Decided = ({
  title,
  rows,
  def,
  rejected,
  onReopen,
  busy,
  errors,
  proposed,
}: {
  title: string;
  rows: readonly SuggestionRow[];
  def: TableDef;
  rejected?: boolean;
  /** Take a reject or a drop back (an admin's, as rejecting is). */
  onReopen?(row: SuggestionRow): void;
  /** A decision on the row is on its way. */
  busy?: boolean;
  /** What the server said when it refused one, by suggestion. */
  errors?: Readonly<Record<string, string>>;
  /** An editor's accepts that are only in their proposal. */
  proposed?: ReadonlySet<string>;
}) =>
  rows.length ? (
    <details className="group rounded-lg border border-white/[0.06] px-3 py-2">
      <summary className="cursor-pointer text-xs text-white/60 hover:text-white">
        {title} · {rows.length}
      </summary>
      <ul className="mt-2 flex flex-col gap-1.5 text-xs">
        {rows.map((row) => (
          <li key={row.suggestion.id} className="flex flex-col">
            <span className="text-white/75">
              <span className="text-white/50">
                {fieldOf(def, row.suggestion)}:{' '}
              </span>
              {row.suggestion.display}
            </span>
            {proposed?.has(row.suggestion.id) ? (
              <span className="text-white/50">
                In your proposal, waiting for review
              </span>
            ) : (
              row.decision && (
                <span className="text-white/50">
                  {rejected
                    ? row.status === 'dropped'
                      ? 'Dropped'
                      : 'Rejected — not offered again'
                    : row.decision.method === 'bulk'
                      ? 'Accepted in bulk, reviewed'
                      : 'Accepted'}{' '}
                  · {formatDate(row.decision.at)}
                </span>
              )
            )}
            {onReopen && reopenable(row) && (
              <button
                type="button"
                className={`${SECONDARY} mt-1 self-start`}
                disabled={busy}
                title="Offer it again, as before; the log keeps the reject beneath the undo"
                aria-label={`Undo ${row.status === 'dropped' ? 'drop' : 'reject'}: ${fieldOf(
                  def,
                  row.suggestion,
                )} ${row.suggestion.display}`}
                onClick={() => onReopen(row)}
              >
                Undo {row.status === 'dropped' ? 'drop' : 'reject'}
              </button>
            )}
            {errors?.[row.suggestion.id] && (
              <p role="alert" className="mt-1 text-red-300">
                {errors[row.suggestion.id]}
              </p>
            )}
          </li>
        ))}
      </ul>
    </details>
  ) : null;

/** One suggestion, with what can be done with it. */
const SuggestionCard = ({
  kind,
  slug,
  label,
  row,
  rest,
  def,
  graph,
  base,
  isEditor,
  blocked,
  busy,
  error,
  notInBulk,
  proposed,
  onAct,
}: {
  kind: ContentKind;
  slug: string;
  label: string;
  row: SuggestionRow;
  /** Every suggestion of the item, by id: the identity one rests on. */
  rest: ReadonlyMap<string, SuggestionRow>;
  def: TableDef;
  graph: Graph;
  base: Record<string, unknown> | null;
  isEditor: boolean;
  blocked: string | null;
  /** A decision on the row is on its way. */
  busy: boolean;
  /** What the server said when it refused this one. */
  error: string | null;
  /** Sure, yet a bulk accept would leave it out: why. */
  notInBulk: string | null;
  proposed: ReadonlySet<string>;
  onAct(op: DecisionOp, extra?: Partial<DecisionInput>): void;
}) => {
  const { suggestion, status } = row;
  const [confirming, setConfirming] = useState<'reject' | 'drop' | null>(null);
  // The question takes the keyboard where its button was, and gives it
  // back to the card when it is answered "keep it".
  const cardRef = useRef<HTMLElement>(null);
  const asked = useRef(false);
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    if (confirming) {
      asked.current = true;
      card.querySelector<HTMLButtonElement>('[data-confirm]')?.focus();
    } else if (asked.current) {
      asked.current = false;
      card.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    }
  }, [confirming]);
  const field = fieldOf(def, suggestion);
  const check = base ? checkSuggestion(base, suggestion) : null;
  const identity = suggestion.dependsOn
    ? rest.get(suggestion.dependsOn)
    : undefined;
  // A City moves song pins: known before it can be accepted.
  const city =
    kind === 'artist' &&
    suggestion.path === CITY_PATH &&
    typeof suggestion.value === 'string';
  const made = city
    ? (suggestion.requires ?? []).find(
        (record) =>
          record.kind === 'globe_city' && record.slug === suggestion.value,
      )?.body
    : undefined;
  const pins = usePinMoves(
    slug,
    city ? (suggestion.value as string) : null,
    made as Record<string, unknown> | undefined,
  );
  const writable = status === 'open' || status === 'removed';
  const canWrite =
    blocked === null && !busy && (!pins || pins.state !== 'loading');
  const admin = !isEditor;
  const named = `${field} ${suggestion.display}`;

  let state: ReactNode = null;
  if (status === 'accepted')
    state = 'Accepted: waiting in a proposal for review.';
  else if (status === 'removed')
    state = 'Accepted once, and taken out by hand since.';
  else if (status === 'unreachable')
    state = `Cannot be written here: ${check?.state === 'unreachable' ? check.reason : 'what it points at is gone'}.`;
  else if (row.unreviewed && row.decision)
    state = `Accepted in bulk on ${formatDate(row.decision.at)}; not reviewed yet.`;

  return (
    <article
      ref={cardRef}
      data-suggestion={suggestion.id}
      data-status={status}
      aria-label={`${field}: ${suggestion.display}`}
      className="flex flex-col gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5"
    >
      <header className="flex flex-wrap items-center gap-1.5 text-xs">
        <Sparkles aria-hidden className="size-3 text-sky-300" />
        <span className="text-white/60">{field}</span>
        <ConsoleBadge
          tone={suggestion.tier === 'sure' ? 'info' : 'muted'}
          className="px-1.5 py-0 text-[10px]"
          title="How sure the source is. Only a sure one can go in a bulk accept, and only when nothing else holds it back."
        >
          {tierLine(suggestion)}
        </ConsoleBadge>
        <span className="ml-auto text-white/50">{providersOf(suggestion)}</span>
      </header>

      {status === 'conflict' && check ? (
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div className="min-w-0">
            <dt className="text-[11px] text-white/50">Now</dt>
            <dd className="break-words text-white/75">
              {valueText(graph, def, suggestion.path, check.current)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] text-white/50">Suggested</dt>
            <dd className="break-words text-white">{suggestion.display}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-white">{suggestion.display}</p>
      )}

      {state && <p className="text-xs text-white/60">{state}</p>}

      <SuggestionFacts
        suggestion={suggestion}
        dependency={row.dependency ?? dependencyFrom(identity)}
        isEditor={isEditor}
        proposed={proposed}
      />

      {pins && (writable || status === 'conflict') && (
        <PinMovesNote result={pins} act={label} />
      )}

      {notInBulk && (
        <p className="text-xs text-white/55">Not in bulk: {notInBulk}.</p>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      )}

      {confirming ? (
        <div
          role="group"
          aria-label={`${confirming === 'reject' ? 'Reject' : 'Drop'} ${named}?`}
          className="flex flex-wrap items-center gap-2"
        >
          <p className="min-w-0 flex-1 text-xs text-white/70">
            {confirming === 'reject'
              ? 'Reject it? It is not offered again until its value changes, or until you undo it under Rejected.'
              : 'Drop it? It stays off this item until you undo it under Rejected.'}
          </p>
          <button
            type="button"
            data-confirm
            className={DANGER}
            disabled={busy}
            onClick={() => {
              setConfirming(null);
              onAct(confirming);
            }}
          >
            {confirming === 'reject' ? 'Reject' : 'Drop'}
          </button>
          <button
            type="button"
            className={SECONDARY}
            onClick={() => setConfirming(null)}
          >
            Keep it
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {writable && (
            <button
              type="button"
              className={PRIMARY}
              disabled={!canWrite}
              title={blocked || undefined}
              aria-label={`Accept ${named}`}
              onClick={() => onAct('accept')}
            >
              {busy && <Loader2 aria-hidden className="size-3 animate-spin" />}
              Accept
            </button>
          )}
          {status === 'conflict' && check && (
            <button
              type="button"
              className={PRIMARY}
              disabled={!canWrite}
              title={
                blocked ||
                `Write over “${valueText(graph, def, suggestion.path, check.current)}”`
              }
              aria-label={`Replace ${field} with ${suggestion.display}`}
              onClick={() => onAct('replace', { seen: check.current })}
            >
              {busy && <Loader2 aria-hidden className="size-3 animate-spin" />}
              Replace
            </button>
          )}
          {admin &&
            (writable || status === 'conflict' || status === 'unreachable') && (
              <button
                type="button"
                className={SECONDARY}
                disabled={busy}
                aria-label={`Reject ${named}`}
                onClick={() => setConfirming('reject')}
              >
                Reject
              </button>
            )}
          {admin &&
            isSongPinCity(suggestion) &&
            (writable || status === 'conflict') && (
              <button
                type="button"
                className={SECONDARY}
                disabled={busy}
                title="Not wrong, but not this act’s City: leave the song pins where they are"
                aria-label={`Drop ${named}`}
                onClick={() => setConfirming('drop')}
              >
                Drop
              </button>
            )}
          {admin && row.unreviewed && (
            <button
              type="button"
              className={SECONDARY}
              disabled={busy}
              aria-label={`Mark ${named} reviewed`}
              onClick={() => onAct('review')}
            >
              Mark reviewed
            </button>
          )}
          {!blocked && isEditor && (writable || status === 'conflict') && (
            <p className="min-w-0 flex-1 text-xs text-white/55">
              Goes into your proposal, for review.
            </p>
          )}
        </div>
      )}
    </article>
  );
};

/**
 * What a row rests on, from the row's own list, for a server that does not
 * send it beside the row: whether it stands is read as the live body, which
 * for an admin is the body the row's status was read against.
 */
const dependencyFrom = (
  row: SuggestionRow | undefined,
): SuggestionDependency | undefined =>
  row && {
    id: row.suggestion.id,
    target: row.suggestion.target,
    path: row.suggestion.path,
    display: row.suggestion.display,
    status: row.status,
    stands: row.status === 'applied',
  };

/** How what a suggestion rests on stands, in the owner's words. */
function restsOnLine(
  dependency: SuggestionDependency,
  isEditor: boolean,
  proposed: ReadonlySet<string>,
): string {
  if (
    isEditor &&
    (proposed.has(dependency.id) ||
      (dependency.status === 'applied' && !dependency.stands))
  )
    return ': in your proposal, not approved yet.';
  // An identity row is never shown: the match it makes is taken as given.
  if (dependency.stands && isExternalIdPath(dependency.path))
    return ', a match taken as given.';
  if (dependency.stands) return ', accepted.';
  switch (dependency.status) {
    case 'accepted':
      return ': accepted in a proposal, not approved yet.';
    case 'removed':
      return ': accepted once and taken out by hand since, so this is not accepted in bulk.';
    case 'rejected':
    case 'dropped':
      return `: ${dependency.status}, so this is not accepted in bulk.`;
    default:
      return ': not accepted yet, so this is not accepted in bulk.';
  }
}

/** Why it is believed, where to check it, what it needs, what it rests on. */
const SuggestionFacts = ({
  suggestion,
  dependency,
  isEditor,
  proposed,
}: {
  suggestion: Suggestion;
  /** What it rests on, and how that stands. */
  dependency?: SuggestionDependency;
  isEditor: boolean;
  proposed: ReadonlySet<string>;
}) => {
  // Another item's (a song's rows rest on the act's identity): its row.
  const elsewhere =
    dependency &&
    (dependency.target.kind !== suggestion.target.kind ||
      dependency.target.slug !== suggestion.target.slug)
      ? tableHrefForItem(
          dependency.target.kind as ContentKind,
          dependency.target.slug,
        )
      : null;
  return (
    <div className="flex flex-col gap-1.5 text-xs text-white/65">
      {suggestion.evidence.length > 0 && (
        <ul className="flex list-disc flex-col gap-0.5 pl-4">
          {suggestion.evidence.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      <ul aria-label="Sources" className="flex flex-wrap gap-x-3 gap-y-0.5">
        {suggestion.sources.map((source) => {
          const text = `${PROVIDER_NAME[source.provider]}${source.label ? ` · ${source.label}` : ''}`;
          return (
            <li
              key={`${source.provider}|${source.url ?? ''}|${source.label ?? ''}`}
            >
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 text-white/70 underline-offset-2 hover:text-white hover:underline"
                >
                  {text}
                  <ArrowUpRight aria-hidden className="size-3" />
                </a>
              ) : (
                <span className="text-white/55">{text}</span>
              )}
            </li>
          );
        })}
      </ul>
      {recordsToMake(suggestion).map((record) => (
        <p key={`${record.kind}:${record.slug}`} className="text-white/60">
          {requiresLine(record)}
        </p>
      ))}
      {suggestion.dependsOn && (
        <p className="text-white/55">
          Rests on{' '}
          {elsewhere ? (
            <Link
              to={elsewhere}
              className="text-white/75 underline-offset-2 hover:text-white hover:underline"
            >
              “{dependency!.display}”
            </Link>
          ) : (
            `“${dependency?.display ?? 'a suggestion not served here'}”`
          )}
          {dependency
            ? restsOnLine(dependency, isEditor, proposed)
            : ', so it is not accepted in bulk.'}
        </p>
      )}
    </div>
  );
};
