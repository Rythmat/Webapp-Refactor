import {
  useCallback,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { cn } from '@/components/utilities';
import { FOCUS_RING } from './styles';

export interface ResizerProps {
  /** What it resizes, in words ('Resize the dock'): its accessible name. */
  label: string;
  /**
   * 'horizontal' is a row edge (it changes a height), 'vertical' a column
   * edge (a width), as role=separator's aria-orientation says.
   */
  orientation: 'horizontal' | 'vertical';
  /** The size now, and its limits, in px. */
  value: number;
  min: number;
  max: number;
  /**
   * Which way the size grows with the pointer: 1 when moving right or down
   * grows it, -1 when moving left or up does (an edge above or left of the
   * panel it sizes).
   */
  direction: 1 | -1;
  /** Where a size lands (limits, snapping); the identity by default. */
  constrain?(px: number): number;
  /**
   * Each size while dragging, for the caller to show without a React
   * render (a CSS variable on the shell).
   */
  onPreview(px: number): void;
  /** The size it ends at: once, on release, or on each key press. */
  onCommit(px: number): void;
  /** Double-click: back to the default, or wherever the caller toggles. */
  onDoubleClick?(): void;
  /** Enter: the caller's toggle (the dock minimises). */
  onToggle?(): void;
  /** One arrow-key step in px. */
  step?: number;
  className?: string;
  'data-testid'?: string;
}

/**
 * A panel edge the student drags or moves with the keyboard: role=separator
 * with its value and limits, arrows ±`step` px, Home and End to the limits,
 * Enter for the caller's toggle and a double-click for its reset. A drag
 * holds the pointer (pointer capture) and reports every size to
 * `onPreview`, so the caller can move the panel without a React render,
 * then commits once on release (plan 2.4). The hit area is 8 px across the
 * edge and the whole edge long; a 1 px line shows on hover and focus.
 */
export function Resizer({
  label,
  orientation,
  value,
  min,
  max,
  direction,
  constrain = (px) => px,
  onPreview,
  onCommit,
  onDoubleClick,
  onToggle,
  step = 16,
  className,
  'data-testid': testId,
}: ResizerProps) {
  const drag = useRef<{ start: number; from: number; last: number } | null>(
    null,
  );
  const horizontal = orientation === 'horizontal';
  const coordOf = useCallback(
    (e: PointerEvent) => (horizontal ? e.clientY : e.clientX),
    [horizontal],
  );
  const fit = useCallback(
    (px: number) => constrain(Math.min(max, Math.max(min, px))),
    [constrain, max, min],
  );

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { start: coordOf(e), from: value, last: value };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const px = fit(d.from + direction * (coordOf(e) - d.start));
    if (px === d.last) return;
    d.last = px;
    onPreview(px);
  };
  const end = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (d.last !== d.from) onCommit(d.last);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const grow = horizontal
      ? { ArrowUp: direction === -1, ArrowDown: direction === 1 }
      : { ArrowLeft: direction === -1, ArrowRight: direction === 1 };
    let next: number | null = null;
    if (e.key in grow) {
      next = value + (grow[e.key as keyof typeof grow] ? step : -step);
    } else if (e.key === 'Home') {
      next = min;
    } else if (e.key === 'End') {
      next = max;
    } else if (e.key === 'Enter' && onToggle) {
      e.preventDefault();
      onToggle();
      return;
    }
    if (next === null) return;
    // The editor's own keys (the arrows nudge clips) stay out of it.
    e.preventDefault();
    e.stopPropagation();
    const px = fit(next);
    onPreview(px);
    onCommit(px);
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={orientation}
      aria-valuenow={Math.round(value)}
      aria-valuemin={Math.round(min)}
      aria-valuemax={Math.round(max)}
      data-testid={testId}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      className={cn(
        'group absolute touch-none select-none',
        horizontal
          ? 'inset-x-0 h-2 -translate-y-1/2 cursor-row-resize'
          : 'inset-y-0 w-2 -translate-x-1/2 cursor-col-resize',
        FOCUS_RING,
        'focus-visible:outline-offset-0',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute bg-transparent transition-colors duration-daw-fast group-hover:bg-daw-outline group-focus-visible:bg-daw-focus',
          horizontal ? 'inset-x-0 top-1/2 h-px' : 'inset-y-0 left-1/2 w-px',
        )}
      />
    </div>
  );
}
