import { GripVertical, Plus, X } from 'lucide-react';
import {
  type DragEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '@/components/utilities';
import {
  isKnownChord,
  MAX_CHORDS,
} from '@/curriculum/engine/progressionValidation';
import { useChordNotation } from '@/lib/chordNotation';
import {
  allChords,
  chordNamer,
  insertChords,
  moveChord,
  removeChord,
  replaceChord,
  searchChords,
} from './chordPicker';

/**
 * A progression's chords as an ordered row of chips, edited in place: the
 * row panel's Details, the New panel and the Table's Chords cell all use it.
 *
 * - **Add.** "Add chord" opens the picker under the chips: the library's
 *   most used chords first, and a search over every degree and every one of
 *   Prism's chord types ("b7 dom", "min7", "sus"). Picking adds the chord
 *   and keeps the picker open for the next, so a whole progression is typed
 *   in one go; a pasted line ("1 major7 - 4 major7") adds every chord in it.
 * - **Replace.** A click on a chip (or Enter or Space on it) opens the
 *   picker for that chip; picking replaces it.
 * - **Remove.** The chip's × or Delete / Backspace on it.
 * - **Reorder.** Drag a chip onto another's place, or Alt+← / Alt+→ on it.
 *   ← and → move between chips, Home and End to the ends.
 *
 * Chips are named in the app's chord notation ("1 maj7" in Hybrid), or by
 * the caller's `name` (Tesseract's key). The stored spelling is the chip's
 * tooltip and the picker's second line. A chord Prism does not know keeps
 * its spelling, marked, so it can be found and replaced.
 *
 * Every edit hands the whole new list to `onChange`; the caller writes the
 * fields that follow from it. Esc in the picker closes it; Esc elsewhere,
 * and Ctrl or ⌘ with Enter, are the caller's (`onEscape`, `onSubmit`), which
 * is how the Table's cell cancels and saves.
 */

export interface ChordChipEditorProps {
  chords: readonly string[];
  onChange(next: string[]): void;
  /** The list's accessible name. */
  label?: string;
  readOnly?: boolean;
  /** Steps of the library's progressions per chord: the picker's order. */
  frequency?: ReadonlyMap<string, number>;
  /** How a chip names a chord; the app's notation, keyless, by default. */
  name?: (chord: string) => string;
  /** Open with the picker showing this search (a key typed on a cell). */
  initialSearch?: string;
  /** Take the focus when it mounts: the picker's box, or the last chip. */
  autoFocus?: boolean;
  /** Esc with the picker closed. */
  onEscape?(): void;
  /** Ctrl+Enter or ⌘+Enter anywhere in the editor. */
  onSubmit?(): void;
  /** What describes the chips: the Field's warning and hint. */
  describedBy?: string;
  invalid?: boolean;
}

type Picker = { at: number; replace: boolean } | null;
type Focus =
  | { to: 'chip'; index: number }
  | { to: 'add' }
  | { to: 'search' }
  | null;

const EMPTY_FREQUENCY: ReadonlyMap<string, number> = new Map();

export const ChordChipEditor = ({
  chords,
  onChange,
  label = 'Chords',
  readOnly = false,
  frequency = EMPTY_FREQUENCY,
  name: nameProp,
  initialSearch,
  autoFocus = false,
  onEscape,
  onSubmit,
  describedBy,
  invalid,
}: ChordChipEditorProps) => {
  const notation = useChordNotation();
  const name = useMemo(
    () => nameProp ?? chordNamer(notation),
    [nameProp, notation],
  );
  const everyChord = useMemo(() => allChords(frequency), [frequency]);

  const [picker, setPicker] = useState<Picker>(() =>
    initialSearch !== undefined && !readOnly
      ? { at: chords.length, replace: false }
      : null,
  );
  const [search, setSearch] = useState(initialSearch ?? '');
  const [highlight, setHighlight] = useState(0);
  const [said, setSaid] = useState('');
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);

  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const addRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const pendingFocus = useRef<Focus>(
    !autoFocus || readOnly
      ? null
      : initialSearch !== undefined
        ? { to: 'search' }
        : chords.length
          ? { to: 'chip', index: chords.length - 1 }
          : { to: 'add' },
  );
  const listId = useId();
  const hintId = useId();
  const optionId = (index: number) => `${listId}-option-${index}`;

  const found = useMemo(
    () =>
      picker
        ? searchChords(search, { frequency, name, chords: everyChord })
        : null,
    [picker, search, frequency, name, everyChord],
  );
  const rows = useMemo(
    () => [
      ...(found?.line ? [{ line: found.line }] : []),
      ...(found?.options ?? []).map((option) => ({ option })),
    ],
    [found],
  );

  // Focus where the last edit asked for it, once it is drawn.
  useLayoutEffect(() => {
    const focus = pendingFocus.current;
    if (!focus) return;
    pendingFocus.current = null;
    const target =
      focus.to === 'search'
        ? searchRef.current
        : focus.to === 'add'
          ? addRef.current
          : (chipRefs.current[focus.index] ?? addRef.current);
    target?.focus({ preventScroll: false });
  });

  // The highlighted option stays in view as ↑ and ↓ move it.
  useEffect(() => {
    if (!picker) return;
    document
      .getElementById(`${listId}-option-${highlight}`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [highlight, picker, listId]);

  const full = chords.length >= MAX_CHORDS;
  const position = (index: number, of = chords.length) =>
    `chord ${index + 1} of ${of}`;

  const openPicker = (next: NonNullable<Picker>) => {
    if (readOnly) return;
    setPicker(next);
    setSearch('');
    setHighlight(0);
    pendingFocus.current = { to: 'search' };
  };

  const closePicker = (focus: Focus) => {
    const was = picker;
    setPicker(null);
    setSearch('');
    pendingFocus.current =
      focus ??
      (was?.replace
        ? { to: 'chip', index: was.at }
        : chords.length < MAX_CHORDS
          ? { to: 'add' }
          : { to: 'chip', index: chords.length - 1 });
  };

  const pick = (picked: readonly string[]) => {
    if (!picker || picked.length === 0) return;
    if (picker.replace) {
      const next = replaceChord(chords, picker.at, picked, MAX_CHORDS);
      onChange(next);
      setSaid(
        `Replaced ${name(chords[picker.at])} with ${picked.map(name).join(', ')}.`,
      );
      setPicker(null);
      setSearch('');
      pendingFocus.current = { to: 'chip', index: picker.at };
      return;
    }
    const next = insertChords(chords, picker.at, picked, MAX_CHORDS);
    const added = next.length - chords.length;
    onChange(next);
    setSaid(
      added === 0
        ? `A progression has at most ${MAX_CHORDS} chords.`
        : `Added ${picked.slice(0, added).map(name).join(', ')}, ${position(
            picker.at + added - 1,
            next.length,
          )}.`,
    );
    setSearch('');
    setHighlight(0);
    if (next.length >= MAX_CHORDS) {
      setPicker(null);
      pendingFocus.current = { to: 'chip', index: next.length - 1 };
    } else {
      // Open still, for the next chord.
      setPicker({ at: picker.at + added, replace: false });
      pendingFocus.current = { to: 'search' };
    }
  };

  const remove = (index: number) => {
    if (readOnly) return;
    const next = removeChord(chords, index);
    onChange(next);
    setSaid(`Removed ${name(chords[index])}.`);
    if (picker) setPicker(null);
    pendingFocus.current = next.length
      ? { to: 'chip', index: Math.min(index, next.length - 1) }
      : { to: 'add' };
  };

  const move = (from: number, to: number) => {
    if (readOnly || to < 0 || to >= chords.length || from === to) return;
    onChange(moveChord(chords, from, to));
    setSaid(`Moved ${name(chords[from])} to ${position(to)}.`);
    pendingFocus.current = { to: 'chip', index: to };
  };

  const submitKey = (event: KeyboardEvent) =>
    event.key === 'Enter' && (event.metaKey || event.ctrlKey);

  const onChipKey = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    // ⌘/Ctrl+Enter is the editor's (below), not the chip's.
    if (submitKey(event)) return;
    const focusChip = (at: number) => {
      event.preventDefault();
      if (at >= chords.length) addRef.current?.focus();
      else chipRefs.current[Math.max(0, at)]?.focus();
    };
    switch (event.key) {
      case 'ArrowLeft':
        if (event.altKey) {
          event.preventDefault();
          move(index, index - 1);
        } else focusChip(index - 1);
        return;
      case 'ArrowRight':
        if (event.altKey) {
          event.preventDefault();
          move(index, index + 1);
        } else focusChip(index + 1);
        return;
      case 'Home':
        focusChip(0);
        return;
      case 'End':
        focusChip(chords.length - 1);
        return;
      case 'Delete':
      case 'Backspace':
        event.preventDefault();
        remove(index);
        return;
      case 'Escape':
        if (onEscape) {
          event.preventDefault();
          event.stopPropagation();
          onEscape();
        }
        return;
      default:
        return;
    }
  };

  const onSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (submitKey(event)) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlight((at) => Math.min(Math.max(0, rows.length - 1), at + 1));
        return;
      case 'ArrowUp':
        event.preventDefault();
        setHighlight((at) => Math.max(0, at - 1));
        return;
      case 'Enter': {
        event.preventDefault();
        event.stopPropagation();
        const row = rows[highlight];
        if (row) pick('line' in row ? row.line : [row.option.chord]);
        else if (!search.trim()) closePicker(null);
        else setSaid(`No chord matches “${search.trim()}”.`);
        return;
      }
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        closePicker(null);
        return;
      default:
        return;
    }
  };

  /* ── Dragging ───────────────────────────────────────────────────── */

  const onDragStart = (event: DragEvent, index: number) => {
    setDragFrom(index);
    event.dataTransfer?.setData('text/plain', chords[index]);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (event: DragEvent, index: number) => {
    if (dragFrom === null) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    if (dropAt !== index) setDropAt(index);
  };
  const onDrop = (event: DragEvent, index: number) => {
    if (dragFrom === null) return;
    event.preventDefault();
    move(dragFrom, index);
    setDragFrom(null);
    setDropAt(null);
  };
  const onDragEnd = () => {
    setDragFrom(null);
    setDropAt(null);
  };

  const replacing = picker?.replace ? picker.at : null;
  const active = rows[highlight];

  return (
    <div
      className="flex min-w-0 flex-col gap-2"
      onKeyDown={(event) => {
        // ⌘/Ctrl+Enter from anywhere inside saves, as the caller says.
        if (submitKey(event) && onSubmit) {
          event.preventDefault();
          onSubmit();
        }
      }}
    >
      <ol
        aria-label={label}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className="flex min-w-0 flex-wrap items-center gap-1.5"
      >
        {chords.map((chord, index) => {
          const known = isKnownChord(chord);
          const shown = name(chord);
          return (
            <li
              // Chords repeat ("1 major - 4 major - 1 major"): by place.
              key={index}
              draggable={!readOnly}
              onDragStart={(event) => onDragStart(event, index)}
              onDragOver={(event) => onDragOver(event, index)}
              onDrop={(event) => onDrop(event, index)}
              onDragEnd={onDragEnd}
              data-chord={chord}
              className={cn(
                'group flex items-center rounded-md border transition-colors',
                known
                  ? 'border-white/[0.14] bg-white/[0.05]'
                  : 'border-amber-300/50 bg-amber-300/[0.06]',
                replacing === index && 'ring-2 ring-white/60',
                dragFrom === index && 'opacity-40',
                dropAt === index &&
                  dragFrom !== null &&
                  dragFrom !== index &&
                  'border-white/70',
              )}
            >
              {readOnly ? (
                <span title={chord} className="px-2 py-1 text-sm text-white/85">
                  {shown}
                </span>
              ) : (
                <>
                  <GripVertical
                    aria-hidden
                    className="ml-1 size-3 shrink-0 cursor-grab text-white/25 group-hover:text-white/50"
                  />
                  <button
                    ref={(node) => {
                      chipRefs.current[index] = node;
                    }}
                    type="button"
                    title={known ? chord : `${chord}: not a chord Prism knows`}
                    aria-label={`${shown}, ${position(index)}${known ? '' : ', not a chord Prism knows'}`}
                    aria-describedby={hintId}
                    aria-pressed={replacing === index}
                    onClick={() =>
                      replacing === index
                        ? closePicker({ to: 'chip', index })
                        : openPicker({ at: index, replace: true })
                    }
                    onKeyDown={(event) => onChipKey(event, index)}
                    className="rounded-sm px-1.5 py-1 text-sm text-white/90 outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  >
                    {shown}
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={`Remove ${shown}`}
                    title={`Remove ${shown}`}
                    onClick={() => remove(index)}
                    className="mr-0.5 rounded p-0.5 text-white/35 hover:bg-white/10 hover:text-white/80"
                  >
                    <X className="size-3" />
                  </button>
                </>
              )}
            </li>
          );
        })}
        {!readOnly && (
          <li>
            <button
              ref={addRef}
              type="button"
              disabled={full}
              title={
                full
                  ? `A progression has at most ${MAX_CHORDS} chords.`
                  : undefined
              }
              aria-expanded={!!picker && !picker.replace}
              onClick={() =>
                picker && !picker.replace
                  ? closePicker({ to: 'add' })
                  : openPicker({ at: chords.length, replace: false })
              }
              onKeyDown={(event) => {
                if (event.key === 'ArrowLeft' && chords.length) {
                  event.preventDefault();
                  chipRefs.current[chords.length - 1]?.focus();
                } else if (event.key === 'Escape' && onEscape) {
                  event.preventDefault();
                  event.stopPropagation();
                  onEscape();
                }
              }}
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-white/20 px-2 py-1 text-sm text-white/60 outline-none hover:border-white/40 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="size-3.5" aria-hidden />
              Add chord
            </button>
          </li>
        )}
        {chords.length === 0 && readOnly && (
          <li className="text-sm text-white/40">No chords</li>
        )}
      </ol>
      <p id={hintId} className="sr-only">
        Enter replaces the chord, Delete removes it, Alt with the arrow keys
        moves it.
      </p>

      {picker && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-white/[0.1] bg-[#141416] p-2">
          <div className="flex items-center gap-2">
            <input
              ref={searchRef}
              type="text"
              role="combobox"
              aria-label={
                picker.replace
                  ? `Replace ${name(chords[picker.at] ?? '')}`
                  : 'Add a chord'
              }
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={active ? optionId(highlight) : undefined}
              autoComplete="off"
              spellCheck={false}
              placeholder="Find a chord: b7 dom, 2 min7, sus4…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setHighlight(0);
              }}
              onKeyDown={onSearchKey}
              className="h-8 min-w-0 flex-1 rounded-md border border-white/20 bg-[#0b0b0d] px-2 text-sm text-white outline-none placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-white/40"
            />
            <button
              type="button"
              aria-label="Close the chord picker"
              onClick={() => closePicker(null)}
              className="rounded p-1 text-white/45 hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="px-1 text-xs text-white/40">
            {found?.frequentOnly
              ? 'Most used in the library. Type a degree (b7) or a chord type (minor7) for the rest.'
              : picker.replace
                ? 'Pick the chord to put in its place.'
                : 'Enter adds the chord and keeps this open for the next.'}
          </p>
          <ul
            id={listId}
            role="listbox"
            aria-label={picker.replace ? 'Chords to replace it with' : 'Chords'}
            className="max-h-56 overflow-y-auto"
          >
            {rows.map((row, index) => {
              const selected = index === highlight;
              const chordsOf = 'line' in row ? row.line : [row.option.chord];
              return (
                <li
                  key={
                    'line' in row
                      ? `line:${row.line.join('|')}`
                      : row.option.chord
                  }
                  id={optionId(index)}
                  role="option"
                  aria-selected={selected}
                  // The box keeps the focus: a click picks, the keys stay.
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseMove={() => setHighlight(index)}
                  onClick={() => pick(chordsOf)}
                  className={cn(
                    'flex cursor-pointer items-baseline gap-2 rounded px-2 py-1.5 text-sm',
                    selected ? 'bg-white/10 text-white' : 'text-white/75',
                  )}
                >
                  {'line' in row ? (
                    <span className="min-w-0 flex-1 truncate">
                      Add all {row.line.length}:{' '}
                      {row.line.map(name).join(' → ')}
                    </span>
                  ) : (
                    <>
                      <span className="min-w-0 shrink-0">
                        {row.option.name}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs text-white/40">
                        {row.option.chord}
                      </span>
                      {row.option.count > 0 && (
                        <span className="text-xs tabular-nums text-white/35">
                          {row.option.count}
                          <span className="sr-only"> uses</span>
                        </span>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          {rows.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-white/50">
              No chord matches. Write a degree (1, b3, #4) and a chord type.
            </p>
          )}
        </div>
      )}
      <p role="status" className="sr-only">
        {said}
      </p>
    </div>
  );
};
