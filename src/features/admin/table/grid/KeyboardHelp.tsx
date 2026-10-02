import { Keyboard } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { consoleTabClass } from '../../ui/styles';

/**
 * "Keyboard", in the toolbar: every key the grid answers, in two lists —
 * moving and opening, then editing a cell — since Enter now edits a cell
 * where it used to open the row. Where nothing is written (repo mode, a
 * grid without the page's writes) the second list is what the cell keys
 * do there instead: open the row at the field. ⌘ is Ctrl away from a Mac.
 */

const MOVING: readonly [string, string][] = [
  ['↑ ↓ ← →', 'Move between cells'],
  ['Page Up, Page Down', 'A screen up or down'],
  ['Home, End', 'First or last cell of the row'],
  ['⌘Home, ⌘End', 'First or last row'],
  ['⌘↵', 'Open the row'],
  ['⇧↵', 'Link… on a connection another row states'],
  ['⇧Space', 'Select the row, or not'],
  ['⇧F10, Menu', 'The cell’s menu'],
  ['/', 'Search'],
  ['Esc', 'Clear the selection, else close the row'],
];

const EDITING: readonly [string, string][] = [
  ['↵, F2', 'Edit the cell (on a header: sort)'],
  ['Any character but / and Space', 'Edit the cell, starting from that key'],
  ['Delete, ⌫', 'Clear the cell'],
  ['↵, ⇧↵', 'Save, and move down or up'],
  ['Tab, ⇧Tab', 'Save, and move right or left'],
  ['Esc', 'Leave the cell as it was'],
  ['⌘Z, ⇧⌘Z (Ctrl+Y)', 'Undo, redo a cell’s edit'],
];

/** Where nothing is written: the cell keys open the row at the field. */
const READ_ONLY: readonly [string, string][] = [
  ['↵, F2', 'Open the row at the cell’s field (on a header: sort)'],
];

const Keys = ({
  title,
  keys,
}: {
  title: string;
  keys: readonly [string, string][];
}) => (
  <section aria-label={title}>
    <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
      {title}
    </h2>
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      {keys.map(([key, what]) => (
        <div key={key} className="contents">
          <dt className="whitespace-nowrap text-white/85">{key}</dt>
          <dd className="text-white/60">{what}</dd>
        </div>
      ))}
    </dl>
  </section>
);

export const KeyboardHelp = ({ editable }: { editable: boolean }) => (
  <Popover>
    <PopoverTrigger className={consoleTabClass(false, 'sm')}>
      <Keyboard aria-hidden className="size-3.5" />
      Keyboard
    </PopoverTrigger>
    <PopoverContent
      align="end"
      aria-label="Keyboard"
      className="flex w-80 flex-col gap-3 border-white/[0.12] bg-[#141416] p-4 text-white/85"
    >
      <Keys title="Moving and opening" keys={MOVING} />
      {editable ? (
        <Keys title="Editing a cell" keys={EDITING} />
      ) : (
        <Keys title="A cell" keys={READ_ONLY} />
      )}
      <p className="text-[11px] leading-snug text-white/50">
        {editable
          ? 'A click selects a cell, and a second click or a double-click edits it. A cell that cannot be edited here opens its row at the field instead.'
          : 'Nothing here is saved, so Enter opens the row at the cell’s field.'}{' '}
        ⌘ is Ctrl away from a Mac.
      </p>
    </PopoverContent>
  </Popover>
);
