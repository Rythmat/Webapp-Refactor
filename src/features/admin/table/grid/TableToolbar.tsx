import { Plus, Search } from 'lucide-react';
import {
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/components/utilities';
import type { EntityId } from '@/content/graph/types';
import { GraphModeBadge } from '../../content/graph/GraphModeBadge';
import type { WorkingGraphStatus } from '../../content/graph/workingGraphStatus';
import { ConsoleBadge } from '../../ui/ConsoleBadge';
import { consoleTabClass } from '../../ui/styles';
import { makesNewRows } from '../fullEditor';
import { STATUS_FILTERS } from '../model/categories';
import type { StatusFilter, TableDef } from '../model/types';
import { categoryOf, tableHref } from '../tablePaths';
import { ColumnsMenu } from './ColumnsMenu';
import { FiltersMenu } from './FiltersMenu';
import { KeyboardHelp } from './KeyboardHelp';
import { SEARCH_URL_DELAY, type TableUrlState } from './useTableUrlState';
import type { VisibleColumns } from './useVisibleColumns';

/**
 * Above the grid: which table this is and how many rows it lists, where the
 * rows came from (the working copy, or the repo's read-only snapshot), and
 * the controls — search, status, the table's views and toggles, filters and
 * columns. Everything here writes the URL (useTableUrlState), so a view can
 * be linked; the Columns choice alone is kept in this browser. Beside the
 * count, the rows edited here that are held where they were while the
 * sort would put them elsewhere, with Re-sort; beside Columns, every key
 * the grid answers (Keyboard).
 */

/** A value a table can be narrowed to (Key: a mode), with how many it has. */
export interface NarrowChoice {
  node: EntityId;
  label: string;
  count: number;
}

/** The counts in the title line. */
export interface ToolbarCounts {
  /** Rows listed now. */
  shown: number;
  /** Rows the status and view list before search and filters narrow them. */
  of: number;
  /**
   * Of each, the missing rows: named by something, defined by nothing (a
   * song a globe event was derived from, since deleted). Listed, so they
   * can be found, but no item of the kind: not counted as one.
   */
  missing?: { shown: number; of: number };
  drafts: number;
  pending: number;
  suggestions: number;
}

const ALL = '__all__';

const plural = (n: number, one: string, many: string) =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`;

/** "907 artists · 1 missing · 12 drafts · 3 pending · 219 suggestions". */
export function countLine(def: TableDef, counts: ToolbarCounts): string {
  const noun = def.title.toLowerCase();
  const missing = counts.missing ?? { shown: 0, of: 0 };
  const shown = counts.shown - missing.shown;
  const of = counts.of - missing.of;
  const rows =
    counts.shown === counts.of
      ? plural(shown, def.singular, noun)
      : `${shown.toLocaleString()} of ${plural(of, def.singular, noun)}`;
  return [
    rows,
    missing.shown > 0 && `${missing.shown.toLocaleString()} missing`,
    counts.drafts > 0 && plural(counts.drafts, 'draft', 'drafts'),
    counts.pending > 0 && `${counts.pending.toLocaleString()} pending`,
    counts.suggestions > 0 &&
      plural(counts.suggestions, 'suggestion', 'suggestions'),
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * The count line for a screen reader: said once the rows have settled, after
 * typing pauses (as the URL is written), not on every key the rows follow —
 * and not on arrival, which the page's own heading announces.
 */
function useSettledAnnouncement(text: string): string {
  const [said, setSaid] = useState('');
  const previous = useRef(text);
  useEffect(() => {
    if (text === previous.current) return undefined;
    previous.current = text;
    const timer = window.setTimeout(() => setSaid(text), SEARCH_URL_DELAY);
    return () => window.clearTimeout(timer);
  }, [text]);
  return said;
}

/** Records | Studios | Labels, Years | Decades: links to the category's tables. */
const CategoryViews = ({ def, q }: { def: TableDef; q: string }) => {
  const category = categoryOf(def.id);
  if (!category.views) return null;
  // The search carries over; filters and sort belong to the table they were set on.
  const search = q.trim() ? `?q=${encodeURIComponent(q)}` : '';
  return (
    <nav aria-label={`${category.label} views`} className="flex gap-1">
      {category.views.map((view) =>
        view.table === def.id ? (
          <span
            key={view.table}
            aria-current="page"
            className={consoleTabClass(true, 'sm')}
          >
            {view.label}
          </span>
        ) : (
          <Link
            key={view.table}
            to={`${tableHref(view.table)}${search}`}
            className={consoleTabClass(false, 'sm')}
          >
            {view.label}
          </Link>
        ),
      )}
    </nav>
  );
};

export const TableToolbar = ({
  def,
  url,
  visible,
  counts,
  filterCounts,
  narrowChoices,
  narrow,
  mode,
  graphStatus,
  refreshing,
  searchRef,
  actions,
  onNew,
  editable = false,
  held,
}: {
  def: TableDef;
  url: TableUrlState;
  visible: VisibleColumns;
  counts: ToolbarCounts;
  filterCounts: Readonly<Record<string, number>>;
  narrowChoices?: readonly NarrowChoice[];
  /**
   * The narrowing the counts were built with: the URL's, when it names one
   * of `narrowChoices`. A link to one the graph lacks shows every value
   * rather than a blank picker over unnarrowed counts.
   */
  narrow?: EntityId;
  mode: 'working' | 'repo';
  /**
   * Which copy shows and why: the badge the mind map and Integrity show too
   * (`GraphModeBadge`), whose tooltip says it.
   */
  graphStatus: WorkingGraphStatus;
  refreshing?: boolean;
  searchRef: RefObject<HTMLInputElement>;
  /** The table's own actions, before "New" (the bulk accept). */
  actions?: ReactNode;
  /**
   * "New …": the panel on a new item. Absent where nothing is made here —
   * a code table, or the repo's read-only rows.
   */
  onNew?(): void;
  /** The grid edits its cells here: what Keyboard says Enter does. */
  editable?: boolean;
  /**
   * Edited rows held where they were though the sort would put them
   * elsewhere, and the way to let the sort have them.
   */
  held?: { count: number; onResort(): void };
}) => {
  const { state } = url;
  const category = categoryOf(def.id);
  const views = def.views;
  const view = views?.find((v) => v.id === state.view) ?? views?.[0];
  const noun = def.title.toLowerCase();
  const line = countLine(def, counts);
  const announced = useSettledAnnouncement(line);
  const canMake = !!onNew && makesNewRows(def.contentKind);

  return (
    <div className="flex shrink-0 flex-col gap-3 border-b border-white/[0.06] px-6 pb-3 pt-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="text-2xl leading-tight tracking-[-0.01em] text-white">
          {category.label}
        </h1>
        <CategoryViews def={def} q={url.q} />
        <p className="text-sm text-white/55">{line}</p>
        {held && held.count > 0 && (
          <button
            type="button"
            onClick={held.onResort}
            title="Edited rows stay where they were until you re-sort, so the next row is where you left it."
            className={consoleTabClass(false, 'sm')}
          >
            {held.count} edited {held.count === 1 ? 'row' : 'rows'} held ·
            Re-sort
          </button>
        )}
        <p className="sr-only" aria-live="polite">
          {announced}
        </p>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {def.code && (
            <ConsoleBadge
              tone="muted"
              title={[def.code.note, ...def.code.files].join('\n')}
            >
              In code
            </ConsoleBadge>
          )}
          <GraphModeBadge
            mode={mode}
            status={graphStatus}
            refreshing={refreshing}
          />
          {actions}
          {canMake && (
            <button
              type="button"
              onClick={onNew}
              className="inline-flex h-7 items-center gap-1 rounded-full bg-white px-3 text-xs text-[#101012] transition-colors hover:bg-white/90"
            >
              <Plus aria-hidden className="size-3.5" />
              New {def.singular}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/40"
          />
          <input
            ref={searchRef}
            type="search"
            aria-label={`Search ${noun}`}
            placeholder={`Search ${noun}…`}
            value={url.q}
            onChange={(event) => url.setQ(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && url.q) {
                event.preventDefault();
                url.setQ('');
              }
            }}
            className="h-8 w-full rounded-full border border-white/[0.12] bg-transparent pl-8 pr-8 text-sm text-white placeholder:text-white/35 focus-visible:border-white/30 focus-visible:outline-none"
          />
          {/* The shortcut's hint, out of the way once there is text (and
              the browser's own clear button) in the box. */}
          {!url.q && (
            <kbd
              aria-hidden
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/30"
            >
              /
            </kbd>
          )}
        </div>

        <Select
          value={state.status}
          onValueChange={(value) => url.setStatus(value as StatusFilter)}
        >
          <SelectTrigger
            aria-label="Status"
            className="h-8 w-40 rounded-full border-white/[0.12] text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.value === 'all' ? 'All statuses' : status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {views && views.length > 1 && (
          <div role="group" aria-label="View" className="flex gap-1">
            {views.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={v === view}
                onClick={() => url.setView(v.id)}
                className={consoleTabClass(v === view, 'sm')}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}

        {def.rows.more && (
          <button
            type="button"
            aria-pressed={Boolean(state.more)}
            onClick={() => url.setMore(!state.more)}
            className={consoleTabClass(Boolean(state.more), 'sm')}
          >
            {def.rows.more.label}
          </button>
        )}

        {def.narrow && narrowChoices && (
          <Select
            value={narrow ?? ALL}
            onValueChange={(value) =>
              url.setNarrow(value === ALL ? undefined : (value as EntityId))
            }
          >
            <SelectTrigger
              aria-label={def.narrow.label}
              className={cn(
                'h-8 w-44 rounded-full border-white/[0.12] text-xs',
                narrow && 'border-white/25 text-white',
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>
                Every {def.narrow.label.toLowerCase()}
              </SelectItem>
              {narrowChoices.map((choice) => (
                <SelectItem key={choice.node} value={choice.node}>
                  {choice.label}{' '}
                  <span className="text-white/40">{choice.count}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <FiltersMenu
          def={def}
          active={state.filters}
          counts={filterCounts}
          onToggle={url.toggleFilter}
          onClear={url.clearFilters}
        />

        <div className="ml-auto flex items-center gap-2">
          <KeyboardHelp editable={editable} />
          <ColumnsMenu def={def} visible={visible} />
        </div>
      </div>
    </div>
  );
};
