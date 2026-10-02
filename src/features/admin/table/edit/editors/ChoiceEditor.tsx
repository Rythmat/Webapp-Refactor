import { Check } from 'lucide-react';
import {
  type KeyboardEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
import { cn } from '@/components/utilities';
import type { ChoiceOption } from '../../model/types';
import type { ScalarEditor } from '../cellValues';
import {
  composing,
  EDITOR_INPUT,
  EDITOR_POPOVER,
  moveFor,
} from './EditorParts';
import type { CellEditorProps } from './types';

/**
 * One of a closed list — a record's format, a place's region, a
 * progression's complexity — picked in the cell: a search box (ARIA's
 * combobox) with the list under it, floating outside the grid.
 *
 * The list opens on the current value (on nothing, when the cell holds
 * none of the list); a typed key that opened the editor starts the search
 * instead. ↑ and ↓ move through the list, and Enter, Shift+Enter, Tab and
 * Shift+Tab write the highlighted choice and move, as any cell's edit
 * does — with nothing highlighted and nothing searched, they only move; a
 * click on one writes it and stays. The grid writes nothing when the
 * choice is the value the list opened on. Esc leaves the cell as it was,
 * and so does focus moving elsewhere: a choice is written when it is
 * picked, so there is no draft to keep. While an input method is
 * composing a search, its keys are its own.
 */

type ChoiceDef = Extract<ScalarEditor, { type: 'choice' }>;

/** The options a search keeps, those starting with it first. */
function matching(
  options: readonly ChoiceOption[],
  search: string,
): ChoiceOption[] {
  const q = search.trim().toLowerCase();
  if (!q) return [...options];
  const hits = options.filter(
    (option) =>
      option.label.toLowerCase().includes(q) ||
      option.value.toLowerCase().includes(q),
  );
  const starts = (option: ChoiceOption) =>
    option.label.toLowerCase().startsWith(q) ? 0 : 1;
  return hits.sort((a, b) => starts(a) - starts(b));
}

export const ChoiceEditor = ({
  editor,
  name,
  label,
  values,
  seed,
  handle,
  onCommit,
  onCancel,
  onLeave,
}: Omit<CellEditorProps, 'editor'> & { editor: ChoiceDef }) => {
  const current = values[editor.path];
  const [search, setSearch] = useState(seed ?? '');
  const shown = useMemo(
    () => matching(editor.options, search),
    [editor.options, search],
  );
  // -1: nothing highlighted (the cell holds none of the list).
  const [highlight, setHighlight] = useState(() =>
    seed === undefined
      ? editor.options.findIndex((option) => option.value === current)
      : 0,
  );
  const [problem, setProblem] = useState<string | null>(null);
  const box = useRef<HTMLInputElement>(null);
  const listId = useId();
  const problemId = useId();
  const optionId = (index: number) => `${listId}-option-${index}`;
  const currentLabel = editor.options.find(
    (option) => option.value === current,
  )?.label;

  // Nothing to keep: a choice is written when it is picked.
  useLayoutEffect(() => {
    handle.current = { read: () => ({ type: 'cancel' }) };
  }, [handle]);

  // Into the box before the next key is read (see InlineEditor).
  useLayoutEffect(() => {
    box.current?.focus({ preventScroll: true });
  }, []);

  // The highlighted option stays in view as ↑ and ↓ move it.
  useEffect(() => {
    document
      .getElementById(optionId(highlight))
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [highlight]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (composing(event)) return;
    const move = moveFor(event);
    if (move) {
      event.preventDefault();
      event.stopPropagation();
      const option = shown[highlight];
      if (option) onCommit({ [editor.path]: option.value }, move);
      // Nothing picked, nothing searched: the cell as it was, and on.
      else if (!search.trim()) onCommit({ [editor.path]: current }, move);
      else setProblem(`No ${name.toLowerCase()} matches “${search.trim()}”.`);
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlight((at) => Math.min(Math.max(0, shown.length - 1), at + 1));
        return;
      case 'ArrowUp':
        event.preventDefault();
        setHighlight((at) => Math.max(0, at - 1));
        return;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        onCancel();
        return;
      default:
        return;
    }
  };

  return (
    <Popover open>
      <PopoverAnchor asChild>
        <input
          ref={box}
          type="text"
          role="combobox"
          aria-label={label}
          aria-expanded
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            shown[highlight] ? optionId(highlight) : undefined
          }
          aria-invalid={problem ? true : undefined}
          aria-describedby={problem ? problemId : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder={currentLabel ?? `Pick a ${name.toLowerCase()}`}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setHighlight(0);
            setProblem(null);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (document.hasFocus()) onLeave();
          }}
          className={cn(
            EDITOR_INPUT,
            problem ? 'border-red-400/70' : 'border-white/30',
          )}
        />
      </PopoverAnchor>
      <PopoverContent
        // The list is the combobox's, named from the box: not a dialog.
        role="presentation"
        side="bottom"
        align="start"
        sideOffset={4}
        hideWhenDetached
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className={cn(EDITOR_POPOVER, 'w-56 p-1')}
      >
        {problem && (
          <p
            id={problemId}
            role="alert"
            className="px-2 py-1.5 text-xs text-red-200"
          >
            {problem}
          </p>
        )}
        <ul
          id={listId}
          role="listbox"
          aria-label={name}
          className="max-h-60 overflow-y-auto"
        >
          {shown.map((option, index) => (
            <li
              key={option.value}
              id={optionId(index)}
              role="option"
              aria-selected={index === highlight}
              // The box keeps the focus: a click picks, the keys stay.
              onMouseDown={(event) => event.preventDefault()}
              onMouseMove={() => setHighlight(index)}
              onClick={() => onCommit({ [editor.path]: option.value }, 'none')}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm',
                index === highlight
                  ? 'bg-white/10 text-white'
                  : 'text-white/75',
              )}
            >
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {option.value === current && (
                <>
                  <Check aria-hidden className="size-3.5 text-white/60" />
                  <span className="sr-only">, current</span>
                </>
              )}
            </li>
          ))}
        </ul>
        {shown.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-white/50">Nothing matches.</p>
        )}
      </PopoverContent>
    </Popover>
  );
};
