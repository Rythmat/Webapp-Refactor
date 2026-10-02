import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { StaffLayout } from '@/components/notation/StaffView';
import { loopLabel, type LoopRange } from './sliceStepForLoop';
import { drawingHeight, stepBarBoxes, type BarBox } from './staffLayoutBars';

// ── Loop selection over the TAB / notation ─────────────────────────────────
// Drag across bars to pick a loop; it snaps to barlines because every bar is
// its own target. A tap or click loops one bar. Keyboard: arrows move between
// bars, Shift+Arrow extends the loop, Enter or Space loops the focused bar,
// Escape clears.
//
// Neutral, so the key colour keeps meaning "now / played": looped bars take a
// faint white wash between white/40 edges, the handles are white, and the
// chip (loop · pad · clear) is the panel's own grey. A host that shows the
// loop's controls elsewhere hides the chip (`showChip={false}`).

const CHIP_HEIGHT = 20;
const HANDLE_WIDTH = 6;
const EDGE = '1px solid rgba(255, 255, 255, 0.4)';
const INK = '#e8e8f0';
const DIM = 'rgba(255, 255, 255, 0.55)';

export interface LoopSelectionOverlayProps {
  layout: StaffLayout | null;
  /** Bars in the step (the drawing may pad a short step with an empty one). */
  bars: number;
  loop: LoopRange | null;
  onChange: (loop: LoopRange | null) => void;
  /** Unused: the loop is drawn in neutral white. Kept so callers need not change. */
  keyColor?: string;
  padBars?: 0 | 1;
  /** Shows the pad as a switch on the chip; without it the pad is only read. */
  onPadChange?: (padBars: 0 | 1) => void;
  /** Ticks before the step's bar 1 on the drawing: the count-in bar in time. */
  countInOffset?: number;
  ticksPerBar?: number;
  /** The chip under the loop (default); off when the host shows the loop's controls itself. */
  showChip?: boolean;
}

const span = (a: number, b: number): LoopRange => ({
  startBar: Math.min(a, b),
  endBar: Math.max(a, b),
});

const contains = (loop: LoopRange | null, bar: number) =>
  !!loop && bar >= loop.startBar && bar <= loop.endBar;

export function LoopSelectionOverlay({
  layout,
  bars,
  loop,
  onChange,
  padBars = 0,
  onPadChange,
  countInOffset = 0,
  ticksPerBar = 1920,
  showChip = true,
}: LoopSelectionOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef(new Map<number, HTMLButtonElement>());
  /** The fixed end of the loop while it is dragged or extended. */
  const anchorRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  /** The drag has reached another bar, so it is choosing a span. */
  const spanningRef = useRef(false);
  const [focusBar, setFocusBar] = useState<number | null>(null);

  if (!layout) return null;
  const boxes = stepBarBoxes(layout, bars, countInOffset, ticksPerBar);
  if (boxes.length === 0) return null;

  const change = (next: LoopRange | null) => {
    if (next?.startBar !== loop?.startBar || next?.endBar !== loop?.endBar) {
      onChange(next);
    }
  };

  /** The bar under a point, or the nearest one when it's between them. */
  const barAt = (event: PointerEvent) => {
    const rect = rootRef.current?.getBoundingClientRect();
    const x = event.clientX - (rect?.left ?? 0);
    const y = event.clientY - (rect?.top ?? 0);
    const distance = ({ box }: BarBox) => {
      const dx = Math.max(box.x - x, 0, x - (box.x + box.width));
      const dy = Math.max(box.y - y, 0, y - (box.y + box.height));
      return dx * dx + dy * dy;
    };
    return boxes.reduce((a, b) => (distance(b) < distance(a) ? b : a)).bar;
  };

  /** Primary button only. A handle's drag is a span from the start. */
  const startDrag = (
    anchor: number,
    spanning: boolean,
    event: PointerEvent<HTMLElement>,
  ) => {
    if (event.button !== 0) return;
    anchorRef.current = anchor;
    draggingRef.current = true;
    spanningRef.current = spanning;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const dragHandlers = {
    onPointerMove: (event: PointerEvent) => {
      const anchor = anchorRef.current;
      if (!draggingRef.current || anchor === null) return;
      const bar = barAt(event);
      // Inside its first bar a press is still a tap or, on a touch screen,
      // the start of a scroll (which cancels it): only a span sets the loop.
      if (bar === anchor && !spanningRef.current) return;
      spanningRef.current = true;
      change(span(anchor, bar));
    },
    onPointerUp: () => {
      draggingRef.current = false;
    },
    onPointerCancel: () => {
      draggingRef.current = false;
    },
  };

  const focusOn = (bar: number) => {
    setFocusBar(bar);
    buttonsRef.current.get(bar)?.focus();
  };

  const onKeyDown = (bar: number, index: number) => (event: KeyboardEvent) => {
    const step =
      event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step !== 0) {
      event.preventDefault();
      const next = boxes[index + step]?.bar ?? bar;
      if (event.shiftKey) {
        const anchor =
          anchorRef.current !== null && contains(loop, anchorRef.current)
            ? anchorRef.current
            : loop && contains(loop, bar)
              ? bar === loop.startBar
                ? loop.endBar
                : loop.startBar
              : bar;
        anchorRef.current = anchor;
        change(span(anchor, next));
      }
      focusOn(next);
      return;
    }
    switch (event.key) {
      case 'Home':
      case 'End':
        event.preventDefault();
        focusOn(
          event.key === 'Home' ? boxes[0].bar : boxes[boxes.length - 1].bar,
        );
        break;
      case 'Escape':
        if (loop) {
          event.preventDefault();
          change(null);
        }
        break;
    }
  };

  // One tab stop: the bar last focused, else the loop's first bar, else the
  // first — whichever is still drawn once the step or its layout changes.
  const tabStop =
    [focusBar, loop?.startBar].find(
      (bar): bar is number => bar != null && boxes.some((b) => b.bar === bar),
    ) ?? boxes[0].bar;
  const selected = boxes.filter(({ bar }) => contains(loop, bar));
  const first = selected[0]?.box;
  const last = selected[selected.length - 1]?.box;

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label="Choose bars to loop"
      className="pointer-events-none absolute inset-0 select-none"
    >
      {selected.map(({ bar, box }) => (
        <div
          key={`shade-${bar}`}
          aria-hidden="true"
          data-loop-shade={bar}
          className="absolute bg-white/[0.06] motion-safe:animate-in motion-safe:fade-in-0"
          style={{
            left: box.x,
            top: box.y,
            width: box.width,
            height: box.height,
            borderTop: EDGE,
            borderBottom: EDGE,
          }}
        />
      ))}

      {boxes.map(({ bar, box }, index) => (
        <button
          key={bar}
          ref={(el) => {
            if (el) buttonsRef.current.set(bar, el);
            else buttonsRef.current.delete(bar);
          }}
          type="button"
          data-loop-bar={bar}
          aria-label={`Bar ${bar + 1}`}
          aria-pressed={contains(loop, bar)}
          tabIndex={bar === tabStop ? 0 : -1}
          className="pointer-events-auto absolute cursor-pointer rounded-sm bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60"
          style={{
            left: box.x,
            top: box.y,
            width: box.width,
            height: box.height,
            border: 'none',
            // Vertical swipes still scroll the TAB on touch screens.
            touchAction: 'pan-y',
          }}
          onFocus={() => setFocusBar(bar)}
          onPointerDown={(event) => startDrag(bar, false, event)}
          // A tap, a click, Enter or Space, or a screen reader's press loops
          // this bar. After a drag across bars the pointer's click is spent.
          onClick={(event) => {
            if (spanningRef.current && event.detail !== 0) return;
            anchorRef.current = bar;
            change(span(bar, bar));
          }}
          onKeyDown={onKeyDown(bar, index)}
          {...dragHandlers}
        />
      ))}

      {loop && first && last && (
        <>
          {[
            { edge: 'start', x: first.x, box: first, anchor: loop.endBar },
            {
              edge: 'end',
              x: last.x + last.width,
              box: last,
              anchor: loop.startBar,
            },
          ].map(({ edge, x, box, anchor }) => (
            <div
              key={edge}
              aria-hidden="true"
              data-loop-handle={edge}
              className="pointer-events-auto absolute cursor-ew-resize rounded-full bg-white"
              style={{
                left: x - HANDLE_WIDTH / 2,
                top: box.y - 4,
                width: HANDLE_WIDTH,
                height: box.height + 8,
                touchAction: 'none',
              }}
              onPointerDown={(event) => startDrag(anchor, true, event)}
              {...dragHandlers}
            />
          ))}
          {showChip && (
            <LoopChip
              loop={loop}
              padBars={padBars}
              onPadChange={onPadChange}
              onClear={() => change(null)}
              // Under the loop's last bar, inside the drawing.
              top={Math.min(
                last.y + last.height,
                drawingHeight(layout) - CHIP_HEIGHT,
              )}
              right={last.x + last.width}
            />
          )}
        </>
      )}
    </div>
  );
}

interface LoopChipProps {
  loop: LoopRange;
  padBars: 0 | 1;
  onPadChange?: (padBars: 0 | 1) => void;
  onClear: () => void;
  top: number;
  /** x of the chip's right edge. */
  right: number;
}

/** "Loop bars 3–4 · pad 1 bar · ✕" */
function LoopChip({
  loop,
  padBars,
  onPadChange,
  onClear,
  top,
  right,
}: LoopChipProps) {
  const dot = (
    <span aria-hidden="true" style={{ color: DIM }}>
      ·
    </span>
  );
  return (
    <div
      data-loop-chip
      className="pointer-events-auto absolute flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/15 bg-[#141416] px-2 text-xs motion-safe:animate-in motion-safe:fade-in-0"
      style={{
        top,
        // Not a transform: the fade-in animates transform.
        right: `calc(100% - ${right}px)`,
        height: CHIP_HEIGHT,
        color: INK,
      }}
    >
      <span>{loopLabel(loop)}</span>
      {onPadChange ? (
        <>
          {dot}
          <button
            type="button"
            aria-pressed={padBars === 1}
            onClick={() => onPadChange(padBars === 1 ? 0 : 1)}
            title="Add a bar before and after the loop"
            className="rounded-full px-1 transition-colors hover:bg-white/10"
            style={{ color: padBars === 1 ? INK : DIM }}
          >
            pad 1 bar
          </button>
        </>
      ) : (
        padBars === 1 && (
          <>
            {dot}
            <span>pad 1 bar</span>
          </>
        )
      )}
      {dot}
      <button
        type="button"
        aria-label="Clear loop"
        onClick={onClear}
        className="rounded-full px-1 transition-colors hover:bg-white/10"
      >
        ✕
      </button>
    </div>
  );
}
