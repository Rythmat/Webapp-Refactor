import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import type { LiteracySection } from '@/curriculum/engine/musicLiteracy/literacy';
import { ghostOf } from './useChipReorder';

/**
 * Dragging a step up or down the steps list by its grip, within its section
 * or into another, with a mouse, a finger or a pen; Alt+↑ / Alt+↓ on the
 * grip moves it a place (as the row's arrows do). The same pointer path as
 * the chips' (useChipReorder): nothing changes until the drop, which moves
 * the step once, so a drag is one step to undo, and Escape puts it back.
 *
 * The list marks each section's group `data-step-group={g}` and each step's
 * row `data-step-row={index}`. A drop lands in the group under the pointer
 * (a collapsed one too, at its end), before the first of its steps whose
 * middle is below the pointer, or after its last.
 */

const DRAG_PX = 4;

interface Span {
  top: number;
  bottom: number;
}

/** Where a drop lands: in group `group`, before step `before` (null: at its end). */
export interface StepDropAt {
  group: number;
  before: number | null;
}

/**
 * The drop a pointer at `y` makes, given each group's span and its shown
 * steps' spans: the group under it (or the nearest), then the gap in it.
 */
export function stepDropAt(
  groups: readonly (Span & { steps: readonly (Span & { index: number })[] })[],
  y: number,
): StepDropAt | null {
  if (!groups.length) return null;
  const away = (span: Span) =>
    y < span.top ? span.top - y : y > span.bottom ? y - span.bottom : 0;
  let group = 0;
  groups.forEach((g, i) => {
    if (away(g) < away(groups[group])) group = i;
  });
  const past = groups[group].steps.find(
    (step) => (step.top + step.bottom) / 2 > y,
  );
  return { group, before: past?.index ?? null };
}

/** The list index a drop puts a step in front of (the count: the end). */
export function dropSlot(
  sections: readonly LiteracySection[],
  drop: StepDropAt,
): number {
  if (drop.before !== null) return drop.before;
  return (sections[drop.group]?.steps.at(-1) ?? -1) + 1;
}

export interface StepDrag {
  listRef: RefObject<HTMLDivElement>;
  dragging: number | null;
  /** Where the dragged step would land; null while it would stay put. */
  mark: StepDropAt | null;
  handle: (index: number) => {
    onPointerDown: (e: PointerEvent<HTMLElement>) => void;
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  };
  said: string;
}

export function useStepDrag(
  sections: readonly LiteracySection[],
  /** A drop: step `from` to land in front of `slot` in group `group`. */
  onDrop: (from: number, slot: number, group: number) => void,
  /** Alt+↑ / Alt+↓: a place up or down. */
  onStep: (index: number, delta: number) => void,
): StepDrag {
  const listRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{
    from: number;
    at: StepDropAt | null;
  } | null>(null);
  const [said, setSaid] = useState('');
  const latest = useRef({ sections, onDrop, onStep });
  latest.current = { sections, onDrop, onStep };
  const stop = useRef<(() => void) | null>(null);
  useEffect(() => () => stop.current?.(), []);

  const measure = () => {
    const root = listRef.current;
    if (!root) return [];
    return [...root.querySelectorAll<HTMLElement>('[data-step-group]')].map(
      (group) => {
        const box = group.getBoundingClientRect();
        return {
          top: box.top,
          bottom: box.bottom,
          steps: [
            ...group.querySelectorAll<HTMLElement>('[data-step-row]'),
          ].map((row) => {
            const r = row.getBoundingClientRect();
            return {
              top: r.top,
              bottom: r.bottom,
              index: Number(row.dataset.stepRow),
            };
          }),
        };
      },
    );
  };

  /** Whether a drop there leaves the step where it is, in its section. */
  const stays = (from: number, at: StepDropAt) => {
    const { sections: groups } = latest.current;
    const own = groups.findIndex((g) => g.steps.includes(from));
    const slot = dropSlot(groups, at);
    return own === at.group && (slot === from || slot === from + 1);
  };

  const onPointerDown = (from: number) => (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    stop.current?.();
    (document.activeElement as HTMLElement | null)?.blur?.();
    if (e.pointerType === 'mouse') e.preventDefault();
    const handle = e.currentTarget;
    const { pointerId } = e;
    try {
      handle.setPointerCapture?.(pointerId);
    } catch {
      // Gone already; the window still hears the rest.
    }
    const origin = { x: e.clientX, y: e.clientY };
    let ghost: HTMLElement | null = null;
    let offset = { x: 0, y: 0 };
    let started = false;
    let at: StepDropAt | null = null;
    const root = document.documentElement;
    const cursor = root.style.cursor;
    const select = root.style.userSelect;

    const begin = () => {
      started = true;
      const row = listRef.current?.querySelector<HTMLElement>(
        `[data-step-row="${from}"]`,
      );
      if (row) {
        const box = row.getBoundingClientRect();
        offset = { x: origin.x - box.left, y: origin.y - box.top };
        ghost = ghostOf(row, box);
      }
      root.style.cursor = 'grabbing';
      root.style.userSelect = 'none';
      setDrag({ from, at: null });
    };
    const onMove = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      if (!started) {
        if (Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y) < DRAG_PX)
          return;
        begin();
      }
      if (ev.cancelable) ev.preventDefault();
      if (ghost)
        ghost.style.transform = `translate(${ev.clientX - offset.x}px, ${ev.clientY - offset.y}px)`;
      const next = stepDropAt(measure(), ev.clientY);
      at = next && !stays(from, next) ? next : null;
      setDrag((d) =>
        d && (d.at?.group !== at?.group || d.at?.before !== at?.before)
          ? { ...d, at }
          : d,
      );
    };
    const finish = () => {
      window.removeEventListener('pointermove', onMove);
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
      if (!started || !at) return;
      const { sections: groups, onDrop: drop } = latest.current;
      drop(from, dropSlot(groups, at), at.group);
      setSaid(`Moved step ${from + 1}.`);
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
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey, true);
    stop.current = finish;
  };

  const onKeyDown = (index: number) => (e: KeyboardEvent<HTMLElement>) => {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    latest.current.onStep(index, e.key === 'ArrowUp' ? -1 : 1);
  };

  return {
    listRef,
    dragging: drag?.from ?? null,
    mark: drag?.at ?? null,
    handle: (index) => ({
      onPointerDown: onPointerDown(index),
      onKeyDown: onKeyDown(index),
    }),
    said,
  };
}
