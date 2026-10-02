import { GripVertical, X } from 'lucide-react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { cn } from '@/components/utilities';
import {
  newGroupColor,
  parseHexColor,
  type ColorGroup,
} from '../model/colorGroups';
import type { QueryProblem } from '../model/graphQuery';
import { MAX_GROUPS } from '../model/graphSettings';
import {
  PANEL_FIELD,
  PANEL_FOCUS_RING,
  PanelCtaButton,
  PanelIconButton,
  QUERY_MAX_LENGTH,
} from './SettingControls';

/**
 * The Groups section: Obsidian's colour groups editor, which here is also
 * the graph's legend.
 *
 * Each row is a group, read as a legend: its name on top (a preset's name,
 * such as "Songs" or "Artists"; a group the owner added is called by its
 * query, or "Group 4" while that is empty), with the number of items it
 * colours, a round colour swatch and a delete button beside it, and its
 * query ("Enter query…") under the name in smaller, quieter type, where it
 * can be edited as in Obsidian. A node takes the colour of the first group
 * it matches, so order matters: the grip at the start of a row drags it to
 * a new place (the drop point is shown as a white line, the graph's
 * highlight), and Alt with the up or down arrow moves it one place from the
 * keyboard. "New group" adds a row at the end with Obsidian's next
 * suggested colour, which never lands on yellow, up to the settings model's
 * limit of 64 groups.
 *
 * Pointing at a row (or moving focus into it) lights only that group's
 * nodes on the graph. A query the parser cannot read shows its message
 * under the row, and the field is marked invalid and described by it.
 *
 * The section is controlled: every change hands the parent a whole new list
 * of groups. Rows are numbered from 1 in their names ("Group 2 query"), so
 * a screen reader hears where a group stands as well as what it says; a
 * named group's query field is described by its name and its count.
 */

/** A group's query error, as the parser reports it or as plain words. */
export type GroupQueryError = QueryProblem | string | null | undefined;

export interface GroupsSectionProps {
  groups: readonly ColorGroup[];
  /** How many drawn items each group colours, by index. */
  counts?: readonly (number | null | undefined)[];
  /** Each group's query error, by index. */
  errors?: readonly GroupQueryError[];
  onGroupsChange: (groups: ColorGroup[]) => void;
  /** The group being pointed at, or null when none is. */
  onGroupHover: (index: number | null) => void;
}

/** How far a press must move before it becomes a drag (Obsidian's 5 px). */
const DRAG_THRESHOLD_PX = 5;

/** The list with the group at `from` moved so that it ends up at `to`. */
export function moveGroup<T>(
  list: readonly T[],
  from: number,
  to: number,
): T[] {
  const rest = list.filter((_, i) => i !== from);
  rest.splice(Math.max(0, Math.min(to, rest.length)), 0, list[from]);
  return rest;
}

/**
 * Where a dragged row lands, as Obsidian works it out: the first other row
 * whose middle is below the pointer, or the end of the list.
 */
export function dropIndexFor(
  pointerY: number,
  rects: readonly (Pick<DOMRect, 'top' | 'height'> | undefined)[],
  from: number,
): number {
  const others = rects.filter((_, i) => i !== from);
  for (let i = 0; i < others.length; i++) {
    const rect = others[i];
    if (rect && pointerY < rect.top + rect.height / 2) return i;
  }
  return others.length;
}

/** A colour as the native picker needs it: `#rrggbb`, black when unreadable. */
const swatchValue = (color: string): string => {
  const rgba = parseHexColor(color);
  if (!rgba) return '#000000';
  return `#${rgba
    .slice(0, 3)
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
};

const errorMessage = (error: GroupQueryError): string | null => {
  if (!error) return null;
  return typeof error === 'string' ? error : error.message;
};

const formatCount = (count: number): string => count.toLocaleString('en-US');

/**
 * What a group is called in the list: a preset's name, else its query, else
 * its place ("Group 4").
 */
export const groupTitle = (
  group: Pick<ColorGroup, 'name' | 'query'>,
  index: number,
): string => group.name?.trim() || group.query.trim() || `Group ${index + 1}`;

interface DragState {
  from: number;
  /** How far the pointer has moved since the press, in px. */
  dy: number;
  /** Where the row would land, as an index among the other rows. */
  drop: number;
}

type FocusTarget = { part: 'handle' | 'query'; index: number } | 'new';

export function GroupsSection({
  groups,
  counts,
  errors,
  onGroupsChange,
  onGroupHover,
}: GroupsSectionProps) {
  const id = useId();
  const hintId = `${id}-reorder-hint`;
  const [drag, setDrag] = useState<DragState | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const handleRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const queryRefs = useRef<(HTMLInputElement | null)[]>([]);
  const newButtonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const pendingFocus = useRef<FocusTarget | null>(null);
  const stopDrag = useRef<(() => void) | null>(null);
  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  // Focus follows the change that was just made, once the new list is drawn.
  useLayoutEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    if (target === 'new') {
      newButtonRef.current?.focus();
      return;
    }
    const refs = target.part === 'handle' ? handleRefs : queryRefs;
    refs.current[target.index]?.focus();
  }, [groups]);

  // When the section goes away (it collapses, or the panel closes) under
  // the pointer, no row hears the pointer leave, so the lit group is let go
  // here; and a drag still running is dropped.
  const onGroupHoverRef = useRef(onGroupHover);
  onGroupHoverRef.current = onGroupHover;
  useEffect(
    () => () => {
      stopDrag.current?.();
      onGroupHoverRef.current(null);
    },
    [],
  );

  const change = (next: ColorGroup[], focus: FocusTarget | null) => {
    pendingFocus.current = focus;
    onGroupsChange(next);
  };

  const update = (index: number, patch: Partial<ColorGroup>) =>
    change(
      groups.map((group, i) => (i === index ? { ...group, ...patch } : group)),
      null,
    );

  const move = (from: number, to: number) => {
    if (to === from || to < 0 || to >= groups.length) return;
    change(moveGroup(groups, from, to), { part: 'handle', index: to });
    setAnnouncement(`Group moved to position ${to + 1} of ${groups.length}.`);
  };

  const remove = (index: number) => {
    const next = groups.filter((_, i) => i !== index);
    onGroupHover(null);
    change(
      next,
      next.length === 0
        ? 'new'
        : { part: 'query', index: Math.min(index, next.length - 1) },
    );
    setAnnouncement(`Group ${index + 1} deleted.`);
  };

  const add = () => {
    change([...groups, { query: '', color: newGroupColor(groups) }], {
      part: 'query',
      index: groups.length,
    });
  };

  const onHandleKeyDown = (
    index: number,
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) => {
    if (!event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(index, index - 1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(index, index + 1);
    }
  };

  /**
   * A press on a row's grip. It becomes a drag once the pointer has moved
   * 5 px; the row then follows the pointer and the drop point is worked out
   * from where the rows were when the press began. Letting go moves the
   * group; Escape or a cancelled pointer puts it back.
   */
  const onHandlePointerDown = (
    index: number,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (event.button !== 0 || stopDrag.current) return;
    event.preventDefault();
    event.currentTarget.focus();
    const startX = event.clientX;
    const startY = event.clientY;
    const rects = rowRefs.current
      .slice(0, groups.length)
      .map((row) => row?.getBoundingClientRect());
    let active = false;
    let drop = index;

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!active) {
        if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
        active = true;
      }
      drop = dropIndexFor(e.clientY, rects, index);
      setDrag({ from: index, dy, drop });
    };
    const finish = (commit: boolean) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey, true);
      stopDrag.current = null;
      setDrag(null);
      if (commit && active && drop !== index) {
        const list = groupsRef.current;
        change(moveGroup(list, index, drop), { part: 'handle', index: drop });
        setAnnouncement(
          `Group moved to position ${drop + 1} of ${list.length}.`,
        );
      }
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      finish(false);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey, true);
    stopDrag.current = () => finish(false);
  };

  /** Where the drop line is drawn: above a row, or below the last one. */
  const dropMarker = (index: number): 'above' | 'below' | null => {
    if (!drag || index === drag.from) return null;
    const among = index < drag.from ? index : index - 1;
    if (drag.drop === among) return 'above';
    const lastOther =
      drag.from === groups.length - 1 ? groups.length - 2 : groups.length - 1;
    if (index === lastOther && drag.drop === groups.length - 1) return 'below';
    return null;
  };

  return (
    <div>
      {groups.length > 0 ? (
        <ul
          ref={listRef}
          aria-label="Colour groups"
          className="m-0 list-none p-0"
          onPointerLeave={() => {
            if (!drag) onGroupHover(null);
          }}
          onBlur={(event) => {
            const next = event.relatedTarget as Node | null;
            if (!next || !listRef.current?.contains(next)) onGroupHover(null);
          }}
        >
          {groups.map((group, index) => {
            const n = index + 1;
            const message = errorMessage(errors?.[index]);
            const count = counts?.[index];
            const named = !!group.name?.trim();
            const title = groupTitle(group, index);
            const titleId = `${id}-title-${index}`;
            const countId = `${id}-count-${index}`;
            const errorId = `${id}-error-${index}`;
            const describedBy =
              [
                named ? titleId : null,
                count != null ? countId : null,
                message ? errorId : null,
              ]
                .filter(Boolean)
                .join(' ') || undefined;
            const dragging = drag?.from === index;
            const marker = dropMarker(index);
            return (
              <li
                // Rows are keyed by place: a group has no id of its own, and
                // focus is moved to the right row after every reorder.
                key={index}
                ref={(row) => {
                  rowRefs.current[index] = row;
                }}
                data-group-row={index}
                data-dragging={dragging ? '' : undefined}
                data-drop={marker ?? undefined}
                onPointerEnter={() => {
                  if (!drag) onGroupHover(index);
                }}
                onFocus={() => onGroupHover(index)}
                style={
                  dragging
                    ? { transform: `translateY(${drag.dy}px)` }
                    : undefined
                }
                className={cn(
                  'relative flex gap-1 pb-2',
                  dragging &&
                    'z-10 rounded-[5px] bg-muted shadow-[0_6px_16px_rgba(0,0,0,0.45)]',
                  // The drop point, in the graph's white highlight.
                  marker === 'above' &&
                    'shadow-[inset_0_2px_0_0_rgba(255,255,255,0.85)]',
                  marker === 'below' &&
                    'shadow-[inset_0_-2px_0_0_rgba(255,255,255,0.85)]',
                )}
              >
                <button
                  ref={(el) => {
                    handleRefs.current[index] = el;
                  }}
                  type="button"
                  aria-label={`Move group ${n}`}
                  aria-describedby={hintId}
                  title="Drag to reorder"
                  onPointerDown={(event) => onHandlePointerDown(index, event)}
                  onKeyDown={(event) => onHandleKeyDown(index, event)}
                  className={cn(
                    '-ml-1 flex w-4 shrink-0 touch-none items-center justify-center self-stretch rounded-[4px] text-muted-foreground/60 hover:text-muted-foreground',
                    dragging ? 'cursor-grabbing' : 'cursor-grab',
                    PANEL_FOCUS_RING,
                  )}
                >
                  <GripVertical aria-hidden className="size-3.5" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex h-7 items-center gap-1">
                    <span
                      id={titleId}
                      title={title}
                      data-group-title=""
                      className={cn(
                        'min-w-0 flex-1 truncate text-[13px] text-foreground',
                        !named &&
                          !group.query.trim() &&
                          'text-muted-foreground',
                      )}
                    >
                      {title}
                    </span>
                    {count != null ? (
                      <span
                        id={countId}
                        className="min-w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground"
                      >
                        {formatCount(count)}
                        <span className="sr-only">
                          {count === 1 ? ' item' : ' items'}
                        </span>
                      </span>
                    ) : null}
                    <input
                      type="color"
                      aria-label={`Group ${n} colour`}
                      title="Change colour"
                      value={swatchValue(group.color)}
                      onChange={(event) =>
                        update(index, { color: event.target.value })
                      }
                      className={cn(
                        'ml-1 size-[18px] shrink-0 cursor-pointer appearance-none rounded-full border-0 bg-transparent p-0',
                        '[&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-white/15',
                        '[&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border [&::-moz-color-swatch]:border-white/15',
                        PANEL_FOCUS_RING,
                      )}
                    />
                    <PanelIconButton
                      aria-label={`Delete group ${n}`}
                      title="Delete group"
                      onClick={() => remove(index)}
                      className="[&>svg]:size-3.5"
                    >
                      <X aria-hidden />
                    </PanelIconButton>
                  </div>
                  <input
                    ref={(el) => {
                      queryRefs.current[index] = el;
                    }}
                    type="text"
                    aria-label={`Group ${n} query`}
                    aria-invalid={message ? true : undefined}
                    aria-describedby={describedBy}
                    placeholder="Enter query…"
                    maxLength={QUERY_MAX_LENGTH}
                    value={group.query}
                    spellCheck={false}
                    autoComplete="off"
                    onChange={(event) =>
                      update(index, { query: event.target.value })
                    }
                    className={cn(
                      PANEL_FIELD,
                      // The query is the row's second line: smaller and
                      // quieter than the name, full strength while edited.
                      'h-[26px] px-1.5 text-xs text-muted-foreground focus-visible:text-foreground',
                      message &&
                        'border-[#fb6b70]/70 hover:border-[#fb6b70] focus-visible:border-[#fb6b70]',
                    )}
                  />
                  {message ? (
                    <p
                      id={errorId}
                      className="m-0 mt-1 text-xs leading-4 text-[#fb6b70]"
                    >
                      {message}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      <span id={hintId} className="sr-only">
        Drag, or press Alt with the up or down arrow, to move the group. The
        first group an item matches gives its colour.
      </span>
      <div className="mb-2.5 mt-1">
        <PanelCtaButton
          ref={newButtonRef}
          onClick={add}
          disabled={groups.length >= MAX_GROUPS}
          title={
            groups.length >= MAX_GROUPS
              ? `${MAX_GROUPS} groups is the most the graph keeps`
              : undefined
          }
        >
          New group
        </PanelCtaButton>
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
