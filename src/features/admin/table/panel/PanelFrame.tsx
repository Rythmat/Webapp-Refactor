import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useId,
  useRef,
  useState,
} from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/useMediaQuery';

/**
 * Where the row panel sits: beside the grid from xl up (440 px), a sheet
 * over it below — for a row, and for a new item being made. The content
 * draws its own header; the frame hands it the heading (the aside's `h2`,
 * or the sheet's title, so a reader names the panel either way) and a close
 * button's handler where the frame has none of its own (the sheet brings
 * its close, and Esc).
 *
 * Beside the Atlas graph the panel can be made wider or narrower: given
 * `onWidthChange`, its left edge is a handle (a vertical separator, 360 to
 * 720 px) to drag, or to move with the arrow keys once it has the keyboard.
 * The width belongs to whoever shows the panel (`usePanelWidth` keeps it,
 * per screen, in the browser); the Table's panel passes none and stays
 * 440 px. Below xl the sheet keeps its own width, as before.
 */

/** From xl up the panel sits beside the grid; below, it is a sheet over it. */
export const BESIDE = '(min-width: 1280px)';

export const PANEL_TITLE_CLASS =
  'text-xl font-normal leading-tight tracking-[-0.01em] text-white';

/** The panel's width beside the grid or the graph, in CSS pixels. */
export const PANEL_WIDTH = { min: 360, max: 720, initial: 440 } as const;

/** One arrow key moves the edge this far; with Shift, four times as far. */
const KEY_STEP = 16;

/** A width the panel can have: whole pixels, inside the range. */
export const clampPanelWidth = (width: number): number =>
  Math.round(
    Math.min(PANEL_WIDTH.max, Math.max(PANEL_WIDTH.min, Number(width))),
  );

/**
 * Where the graph's row panel keeps its width, so it opens as wide as it
 * was left (the Table's panel does not resize).
 */
export const GRAPH_DRAWER_WIDTH_KEY = 'ma-console-graph-drawer-v1';

/**
 * A panel width the browser remembers under `storageKey`. Anything stored
 * that is not a number falls back to 440 px, and a number outside the range
 * is brought inside it. The browser may refuse storage (a private window,
 * blocked site data): the width then lasts as long as the page.
 */
export function usePanelWidth(
  storageKey: string,
): readonly [number, (width: number) => void] {
  const [width, setWidth] = useState(() => readWidth(storageKey));
  const change = useCallback(
    (next: number) => {
      const clamped = clampPanelWidth(next);
      setWidth(clamped);
      try {
        window.localStorage.setItem(storageKey, String(clamped));
      } catch {
        // Not remembered; the panel still resizes.
      }
    },
    [storageKey],
  );
  return [width, change] as const;
}

function readWidth(storageKey: string): number {
  try {
    const stored = window.localStorage.getItem(storageKey);
    const value = stored === null || stored.trim() === '' ? NaN : +stored;
    return Number.isFinite(value)
      ? clampPanelWidth(value)
      : PANEL_WIDTH.initial;
  } catch {
    return PANEL_WIDTH.initial;
  }
}

export interface PanelFrameProps {
  onClose(): void;
  /** Beside the grid or the graph, the panel's width in px; 440 by default. */
  width?: number;
  /**
   * Given, the panel's left edge resizes it (beside only): each new width,
   * already within 360 to 720 px, is handed here.
   */
  onWidthChange?(width: number): void;
  children(
    heading: (text: string) => ReactNode,
    close: (() => void) | null,
  ): ReactNode;
}

export const PanelFrame = ({
  onClose,
  width,
  onWidthChange,
  children,
}: PanelFrameProps) => {
  const beside = useMediaQuery(BESIDE);
  const headingId = useId();

  if (beside) {
    return (
      <aside
        aria-labelledby={headingId}
        className={
          width === undefined
            ? 'flex h-full min-h-0 w-[440px] shrink-0 flex-col border-l border-white/[0.08] bg-[#101012]'
            : 'relative flex h-full min-h-0 shrink-0 flex-col border-l border-white/[0.08] bg-[#101012]'
        }
        style={width === undefined ? undefined : { width }}
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || event.defaultPrevented) return;
          event.preventDefault();
          onClose();
        }}
      >
        {width !== undefined && onWidthChange && (
          <ResizeHandle width={width} onWidthChange={onWidthChange} />
        )}
        {children(
          (text) => (
            <h2 id={headingId} className={PANEL_TITLE_CLASS}>
              {text}
            </h2>
          ),
          onClose,
        )}
      </aside>
    );
  }
  return (
    // Below xl the sheet brings its own close (and Esc); it only ever closes.
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        aria-describedby={undefined}
        className="flex w-[440px] max-w-[92vw] flex-col gap-0 border-white/10 bg-[#101012] p-0 text-white sm:max-w-[440px]"
      >
        {children(
          (text) => (
            <SheetTitle className={PANEL_TITLE_CLASS}>{text}</SheetTitle>
          ),
          null,
        )}
      </SheetContent>
    </Sheet>
  );
};

/**
 * The panel's left edge, as a window splitter: drag it, or give it the
 * keyboard and use ← to widen the panel and → to narrow it (Shift for four
 * steps), Home for the narrowest and End for the widest. A reader hears the
 * width in pixels.
 */
const ResizeHandle = ({
  width,
  onWidthChange,
}: {
  width: number;
  onWidthChange(width: number): void;
}) => {
  // Where a drag started: the pointer's x and the width then.
  const drag = useRef<{ x: number; width: number } | null>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? KEY_STEP * 4 : KEY_STEP;
    const next =
      event.key === 'ArrowLeft'
        ? width + step
        : event.key === 'ArrowRight'
          ? width - step
          : event.key === 'Home'
            ? PANEL_WIDTH.min
            : event.key === 'End'
              ? PANEL_WIDTH.max
              : null;
    if (next === null) return;
    event.preventDefault();
    onWidthChange(clampPanelWidth(next));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { x: event.clientX, width };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const from = drag.current;
    if (!from) return;
    // The panel is on the right: the edge dragged left widens it.
    const next = clampPanelWidth(from.width + from.x - event.clientX);
    if (next !== width) onWidthChange(next);
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the panel"
      aria-valuemin={PANEL_WIDTH.min}
      aria-valuemax={PANEL_WIDTH.max}
      aria-valuenow={width}
      aria-valuetext={`${width} pixels wide`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize touch-none outline-none transition-colors hover:bg-white/10 focus-visible:bg-white/20"
    />
  );
};
