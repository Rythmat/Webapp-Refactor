import { ListFilter, X } from 'lucide-react';
import { Fragment } from 'react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { consoleTabClass } from '../../ui/styles';
import type { FilterDef, TableDef } from '../model/types';

/**
 * The table's filters: a menu of all of them, grouped (gaps to fill, kinds
 * of row, review work), each with how many listed rows it would leave; and
 * the ones on, as chips beside it that take one off. A row must pass every
 * filter on.
 */

const GROUPS: readonly { id: FilterDef['group']; label: string }[] = [
  { id: 'gaps', label: 'Gaps to fill' },
  { id: 'kind', label: 'Kinds of row' },
  { id: 'review', label: 'Review' },
];

export const FiltersMenu = ({
  def,
  active,
  counts,
  onToggle,
  onClear,
}: {
  def: TableDef;
  /** The filter ids on. */
  active: readonly string[];
  /** Rows each filter would leave (query.ts, `filterCounts`). */
  counts: Readonly<Record<string, number>>;
  onToggle(id: string): void;
  onClear(): void;
}) => {
  const byId = new Map(def.filters.map((f) => [f.id, f]));
  const groups = GROUPS.map((group) => ({
    ...group,
    filters: def.filters.filter((f) => f.group === group.id),
  })).filter((group) => group.filters.length > 0);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={consoleTabClass(active.length > 0, 'sm')}
        >
          <ListFilter aria-hidden className="size-3.5" />
          Filters
          {active.length > 0 && (
            <span className="tabular-nums text-white/60">{active.length}</span>
          )}
        </DropdownMenuTrigger>
        {/* Opaque (the landing's dropdown surface): a busy grid of chips
            must not show through a long list. */}
        <DropdownMenuContent
          align="start"
          className="max-h-[70vh] w-72 overflow-y-auto bg-[#141416]"
        >
          {groups.map((group, i) => (
            <Fragment key={group.id}>
              {i > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="text-xs text-white/45">
                {group.label}
              </DropdownMenuLabel>
              {group.filters.map((filter) => (
                <DropdownMenuCheckboxItem
                  key={filter.id}
                  checked={active.includes(filter.id)}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={() => onToggle(filter.id)}
                  title={filter.help}
                >
                  <span className="truncate">{filter.label}</span>
                  <span className="ml-auto pl-3 text-xs tabular-nums text-white/40">
                    {counts[filter.id] ?? 0}
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
            </Fragment>
          ))}
          {active.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onClear}>
                Clear filters
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {active.map((id) => {
        const filter = byId.get(id);
        if (!filter) return null;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onToggle(id)}
            title={`Remove the filter “${filter.label}”`}
            className={consoleTabClass(true, 'sm')}
          >
            {filter.label}
            <X aria-hidden className="size-3 text-white/60" />
            <span className="sr-only">(remove)</span>
          </button>
        );
      })}
    </>
  );
};
