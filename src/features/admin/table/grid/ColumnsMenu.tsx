import { Columns3 } from 'lucide-react';
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
import type { TableDef } from '../model/types';
import type { VisibleColumns } from './useVisibleColumns';

/**
 * The Columns menu: every column a table can show, the owner's first as the
 * registry orders them, ticked when showing. The title is the row itself
 * and is always shown, so it is not listed. The menu stays open while
 * ticking, to choose several at once.
 */
export const ColumnsMenu = ({
  def,
  visible,
}: {
  def: TableDef;
  visible: VisibleColumns;
}) => {
  const choices = def.columns.filter((c) => c.source.type !== 'title');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={consoleTabClass(!visible.isDefault, 'sm')}
      >
        <Columns3 aria-hidden className="size-3.5" />
        Columns
      </DropdownMenuTrigger>
      {/* Opaque (the landing's dropdown surface): a busy grid of chips must
          not show through a long list. */}
      <DropdownMenuContent
        align="end"
        className="max-h-[70vh] w-64 overflow-y-auto bg-[#141416]"
      >
        <DropdownMenuLabel className="text-xs text-white/45">
          Show columns
        </DropdownMenuLabel>
        {choices.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={visible.shown.has(column.id)}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={() => visible.toggle(column.id)}
            title={column.help}
          >
            <span className="truncate">{column.label}</span>
            {column.owner && (
              <span className="ml-auto pl-2 text-[10px] text-white/35">
                Owner’s list
              </span>
            )}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={visible.isDefault}
          onSelect={() => visible.reset()}
        >
          Reset to default
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
