import {
  defaultRangeExtractor,
  useVirtualizer,
  type Range,
} from '@tanstack/react-virtual';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react';

/** Lists longer than this render only the rows near the viewport. */
export const VIRTUALIZE_OVER = 50;

export interface VirtualRow {
  index: number;
  /** Where the row sits inside the list, in px; 0 when not virtual. */
  top: number;
}

/**
 * A list that renders only what is on screen once it grows past
 * VIRTUALIZE_OVER rows, and every row below that.
 *
 * The rows stay ordinary elements in an ordinary list (each one carries
 * `data-index`), so the same markup serves both modes: a virtual row just gets
 * absolute positioning and the measuring ref. That matters because switching
 * modes must not remount a row — an event card with a playing video in it
 * would reload the video.
 *
 * Rows named in `keep` are rendered wherever they are, and so is the row that
 * has focus: scrolling away from a playing video or the focused row must not
 * unmount it. Arrow keys, Home and End move focus between rows, scrolling the
 * target in first when it is not rendered yet, so the keyboard reaches every
 * row however few are in the page. Tab reaches them too, since focusing a row
 * scrolls it into view and the next rows render behind it.
 *
 * The list may sit below other content in its scroller (a heading, earlier
 * groups); its offset is measured and fed to the virtualizer as scrollMargin.
 */
export function useVirtualRows({
  count,
  enabled,
  scrollRef,
  listRef,
  estimateSize,
  getItemKey,
  gap = 0,
  keep = [],
}: {
  count: number;
  /** Virtualize at all; usually `count > VIRTUALIZE_OVER`. */
  enabled: boolean;
  scrollRef: RefObject<HTMLElement>;
  listRef: RefObject<HTMLElement>;
  estimateSize: number;
  getItemKey?: (index: number) => string | number;
  gap?: number;
  keep?: readonly number[];
}) {
  const [scrollMargin, setScrollMargin] = useState(0);
  const [focused, setFocused] = useState<number | null>(null);
  const pendingFocus = useRef<number | null>(null);

  const keepKey = keep.join(',');
  const rangeExtractor = useCallback(
    (range: Range) => {
      const rows = defaultRangeExtractor(range);
      const extra = keepKey ? keepKey.split(',').map(Number) : [];
      if (focused !== null) extra.push(focused);
      const wanted = extra.filter(
        (i) => i >= 0 && i < range.count && !rows.includes(i),
      );
      if (wanted.length === 0) return rows;
      return [...new Set([...rows, ...wanted])].sort((a, b) => a - b);
    },
    [keepKey, focused],
  );

  const virtualizer = useVirtualizer({
    count: enabled ? count : 0,
    enabled,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    getItemKey,
    gap,
    overscan: 6,
    scrollMargin,
    rangeExtractor,
  });

  // Where the list starts inside the scroller. Content above it (a heading,
  // other groups opening and closing) moves it, so watch that too.
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const list = listRef.current;
    if (!enabled || !scroller || !list) return;
    const measure = () => {
      const offset =
        list.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top +
        scroller.scrollTop;
      setScrollMargin((prev) =>
        Math.abs(prev - offset) < 0.5 ? prev : offset,
      );
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    for (const child of Array.from(scroller.children)) ro.observe(child);
    return () => ro.disconnect();
  });

  const rows: VirtualRow[] = enabled
    ? virtualizer.getVirtualItems().map((item) => ({
        index: item.index,
        top: item.start - scrollMargin,
      }))
    : Array.from({ length: count }, (_, index) => ({ index, top: 0 }));

  const rowElement = (index: number) =>
    listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`) ??
    null;

  // Focus a row's own control: the row itself when it takes focus, the
  // control it marks `data-row-control`, or else the first button inside it.
  const focusTarget = (row: HTMLElement): HTMLElement | null =>
    row.tabIndex >= 0
      ? row
      : (row.querySelector<HTMLElement>('[data-row-control]') ??
        row.querySelector<HTMLElement>('button, [href], [tabindex="0"]'));

  const focusRow = (index: number) => {
    const row = rowElement(index);
    if (row) {
      focusTarget(row)?.focus();
      return;
    }
    // Not rendered yet: render it (the range keeps the focused row), bring it
    // into view, and focus it once it is in the page.
    pendingFocus.current = index;
    setFocused(index);
    virtualizer.scrollToIndex(index, { align: 'auto' });
  };

  useEffect(() => {
    const index = pendingFocus.current;
    if (index === null) return;
    const row = rowElement(index);
    if (row) {
      pendingFocus.current = null;
      focusTarget(row)?.focus();
    }
  });

  const rowOf = (target: EventTarget | null) =>
    target instanceof HTMLElement
      ? target.closest<HTMLElement>('[data-index]')
      : null;

  const listProps = {
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      const row = rowOf(e.target);
      // Only from the row's own control, never from the links and buttons
      // inside an expanded card.
      if (!row || focusTarget(row) !== e.target) return;
      const index = Number(row.dataset.index);
      const next =
        e.key === 'ArrowDown'
          ? index + 1
          : e.key === 'ArrowUp'
            ? index - 1
            : e.key === 'Home'
              ? 0
              : e.key === 'End'
                ? count - 1
                : null;
      if (next === null || next < 0 || next >= count || next === index) return;
      e.preventDefault();
      focusRow(next);
    },
    onFocus: (e: FocusEvent<HTMLElement>) => {
      const row = rowOf(e.target);
      if (row) setFocused(Number(row.dataset.index));
    },
    onBlur: (e: FocusEvent<HTMLElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
        setFocused(null);
      }
    },
  };

  return {
    virtual: enabled,
    rows,
    totalSize: virtualizer.getTotalSize(),
    measureElement: enabled ? virtualizer.measureElement : undefined,
    scrollToIndex: (index: number) =>
      virtualizer.scrollToIndex(index, { align: 'auto' }),
    listProps,
  };
}
