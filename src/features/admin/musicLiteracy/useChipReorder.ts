import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import { dropIndex } from './literacyChips';

/**
 * Dragging a row of chips into a new order, left and right across a row
 * that wraps, with a mouse, a finger or a pen, and Alt+← / Alt+→ from the
 * keyboard.
 *
 * Pointer events rather than native drag and drop (and Set Lists' touch
 * shim for it): one path serves the mouse and an iPad alike, and the chip's
 * handle is a drag control and nothing else, so a finger on it drags at
 * once, as iOS's own reorder grips do, while a finger anywhere else on the
 * page scrolls it. Nothing changes until the drop, which moves the item
 * once (`onMove`), so a drag is one step to undo. Escape puts it back.
 *
 * The row marks its items `data-reorder-item` (`item(i)`); a drag starts on
 * an item's handle (`handle(i)`) and its grip button takes the keys
 * (`grip(i)`).
 */

/** How far a pointer travels before a press is a drag. */
const DRAG_PX = 4;

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * The gap a point falls in among a wrapping row of boxes, in order: 0
 * before the first, the count after the last. The row of boxes under the
 * point (or the nearest), then the first box in it whose middle is past the
 * point, or the gap after that row's last box.
 */
export function slotAt(boxes: readonly Box[], x: number, y: number): number {
  if (!boxes.length) return 0;
  const rows: number[][] = [];
  boxes.forEach((box, i) => {
    const row = rows.at(-1);
    // A box left of the one before it has wrapped onto a new row.
    if (row && box.left >= boxes[row.at(-1)!].left) row.push(i);
    else rows.push([i]);
  });
  const away = (row: number[]) => {
    const top = Math.min(...row.map((i) => boxes[i].top));
    const bottom = Math.max(...row.map((i) => boxes[i].bottom));
    return y < top ? top - y : y > bottom ? y - bottom : 0;
  };
  const row = rows.reduce((best, r) => (away(r) < away(best) ? r : best));
  const past = row.find((i) => (boxes[i].left + boxes[i].right) / 2 > x);
  return past ?? row.at(-1)! + 1;
}

/** The page's background colour, the console's dark where none is set. */
function pageColour(): string {
  const colour = getComputedStyle(document.body).backgroundColor;
  return !colour || colour === 'transparent' || colour.endsWith(', 0)')
    ? '#101012'
    : colour;
}

/** A copy of the item to carry under the pointer. */
function ghostOf(item: HTMLElement, box: DOMRect): HTMLElement {
  const ghost = item.cloneNode(true) as HTMLElement;
  // A select's value is a property, not markup: copy what it shows.
  const from = item.querySelectorAll('select');
  ghost.querySelectorAll('select').forEach((select, i) => {
    select.value = from[i]?.value ?? select.value;
  });
  ghost.removeAttribute('data-reorder-item');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.setAttribute('inert', '');
  Object.assign(ghost.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: `${box.width}px`,
    height: `${box.height}px`,
    margin: '0',
    zIndex: '9999',
    pointerEvents: 'none',
    boxShadow: '0 12px 32px rgba(0,0,0,0.55)',
    // The chips are see-through; the page's own colour behind the copy.
    background: pageColour(),
    borderRadius: '0.5rem',
  });
  document.body.appendChild(ghost);
  return ghost;
}

export interface ChipReorder {
  /** On the element that holds the items. */
  listRef: RefObject<HTMLDivElement>;
  /** The item being dragged. */
  dragging: number | null;
  /**
   * The gap a drop would land in (before item `slot`; the count: after the
   * last), or null while it would stay where it is.
   */
  slot: number | null;
  /** Where the drop mark goes on an item: on its left, its right, or none. */
  mark: (index: number) => 'before' | 'after' | null;
  item: (index: number) => { 'data-reorder-item': number };
  handle: (index: number) => {
    onPointerDown: (e: PointerEvent<HTMLElement>) => void;
  };
  grip: (index: number) => {
    'data-reorder-grip': number;
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  };
  /** What the last move did, for a screen reader. */
  said: string;
}

export function useChipReorder(
  count: number,
  onMove: (from: number, to: number) => void,
): ChipReorder {
  const listRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ from: number; slot: number } | null>(null);
  const [said, setSaid] = useState('');
  // The drop calls the newest onMove, made from the newest chips.
  const latest = useRef({ count, onMove });
  latest.current = { count, onMove };
  const stop = useRef<(() => void) | null>(null);
  useEffect(() => () => stop.current?.(), []);

  // After a move from the keys, the grip keeps the focus at its new place.
  const refocus = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (refocus.current === null) return;
    const at = refocus.current;
    refocus.current = null;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-reorder-grip="${at}"]`)
      ?.focus();
  });

  const items = () => [
    ...(listRef.current?.querySelectorAll<HTMLElement>('[data-reorder-item]') ??
      []),
  ];

  const move = (from: number, to: number) => {
    const { count: n, onMove: apply } = latest.current;
    if (to === from || to < 0 || to >= n) return;
    apply(from, to);
    setSaid(`Moved to place ${to + 1} of ${n}.`);
  };

  const onPointerDown = (from: number) => (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    stop.current?.();
    // A line being typed is taken first, as a press anywhere else would.
    (document.activeElement as HTMLElement | null)?.blur?.();
    // No text selection behind a mouse drag.
    if (e.pointerType === 'mouse') e.preventDefault();
    const handle = e.currentTarget;
    const { pointerId } = e;
    try {
      handle.setPointerCapture?.(pointerId);
    } catch {
      // The pointer has gone already; the window still hears the rest.
    }
    const origin = { x: e.clientX, y: e.clientY };
    let ghost: HTMLElement | null = null;
    let offset = { x: 0, y: 0 };
    let started = false;
    let slot = from;
    const root = document.documentElement;
    const cursor = root.style.cursor;
    const select = root.style.userSelect;

    const begin = () => {
      started = true;
      const item = items()[from];
      if (item) {
        const box = item.getBoundingClientRect();
        offset = { x: origin.x - box.left, y: origin.y - box.top };
        ghost = ghostOf(item, box);
      }
      root.style.cursor = 'grabbing';
      root.style.userSelect = 'none';
      setDrag({ from, slot: from });
    };
    const onMovePointer = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      if (!started) {
        if (Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y) < DRAG_PX)
          return;
        begin();
      }
      if (ev.cancelable) ev.preventDefault();
      if (ghost)
        ghost.style.transform = `translate(${ev.clientX - offset.x}px, ${ev.clientY - offset.y}px) rotate(1deg)`;
      slot = slotAt(
        items().map((item) => item.getBoundingClientRect()),
        ev.clientX,
        ev.clientY,
      );
      setDrag((d) => (d && d.slot !== slot ? { ...d, slot } : d));
    };
    const finish = () => {
      window.removeEventListener('pointermove', onMovePointer);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey, true);
      ghost?.remove();
      ghost = null;
      root.style.cursor = cursor;
      root.style.userSelect = select;
      stop.current = null;
      setDrag(null);
    };
    const onUp = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      finish();
      if (started) move(from, dropIndex(from, slot));
    };
    const onCancel = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId === pointerId) finish();
    };
    const onKey = (ev: globalThis.KeyboardEvent) => {
      if (ev.key !== 'Escape') return;
      ev.preventDefault();
      ev.stopPropagation();
      finish();
    };
    window.addEventListener('pointermove', onMovePointer, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey, true);
    stop.current = finish;
  };

  const onGripKey = (from: number) => (e: KeyboardEvent<HTMLElement>) => {
    if (!e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault();
    const to = from + (e.key === 'ArrowLeft' ? -1 : 1);
    if (to < 0 || to >= latest.current.count) return;
    refocus.current = to;
    move(from, to);
  };

  // A drop where the item already is moves nothing, so shows no mark.
  const slot =
    drag && dropIndex(drag.from, drag.slot) !== drag.from ? drag.slot : null;

  return {
    listRef,
    dragging: drag?.from ?? null,
    slot,
    mark: (index) =>
      slot === index
        ? 'before'
        : slot === count && index === count - 1
          ? 'after'
          : null,
    item: (index) => ({ 'data-reorder-item': index }),
    handle: (index) => ({ onPointerDown: onPointerDown(index) }),
    grip: (index) => ({
      'data-reorder-grip': index,
      onKeyDown: onGripKey(index),
    }),
    said,
  };
}
