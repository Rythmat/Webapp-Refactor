import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * A cell's menu, from Shift+F10, the Menu key or a right-click: what the
 * keys do on the active cell, in words, for the author who does not know
 * them yet — Edit, Clear, Open row, Link…, Undo, and Retry or Use mine on
 * a cell whose edit did not go through.
 *
 * It opens at the cell, from a point the grid places (`at`, in the grid
 * box's own coordinates) rather than from the cell itself, which keeps the
 * grid's rows and cells free of anything but cells. Closing it hands the
 * keyboard back to the grid (`onClose`).
 */

export interface CellMenuItem {
  label: string;
  /** The key that does the same, shown beside it: "⌘↵". */
  keys?: string;
  run(): void;
}

export const CellMenu = ({
  label,
  at,
  items,
  onClose,
}: {
  /** The menu's name: "Year, Africa". */
  label: string;
  /** Where it opens: under the cell, in the grid box's coordinates. */
  at: { left: number; top: number };
  items: readonly CellMenuItem[];
  onClose(): void;
}) => (
  <DropdownMenu
    open
    onOpenChange={(open) => {
      if (!open) onClose();
    }}
  >
    <DropdownMenuTrigger asChild>
      {/* The point it opens from; the grid's cell is what the keys act on. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute size-px opacity-0"
        style={{ left: at.left, top: at.top }}
      />
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="start"
      // Named for its cell, not for the point it opens from.
      aria-labelledby={undefined}
      aria-label={label}
      className="w-56 bg-[#141416]"
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {items.map((item) => (
        <DropdownMenuItem key={item.label} onSelect={() => item.run()}>
          {item.label}
          {item.keys && (
            <DropdownMenuShortcut className="text-white/40">
              {item.keys}
            </DropdownMenuShortcut>
          )}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);
