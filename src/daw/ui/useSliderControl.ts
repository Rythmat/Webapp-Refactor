import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import {
  dragNorm,
  fromNorm,
  quantize,
  stepValue,
  toNorm,
  type SliderRange,
} from './sliderMath';

export interface SliderControlOptions extends SliderRange {
  value: number;
  /** Where Enter and a double-click put the value back to. */
  resetValue?: number;
  disabled?: boolean;
  /** The drag axis: up or right is toward max. */
  axis: 'vertical' | 'horizontal';
  /** Pixels of drag for the whole travel (a function is read on each move). */
  travelPx: number | (() => number);
  /** Every change, as it happens: a live preview, many per gesture. */
  onChange(value: number): void;
  /**
   * Once per gesture: on release after a drag, and once per key press. This
   * is the moment to write the store, record one undo step and send one
   * collab update (milestone 1.9's useContinuousControl). Not called when the
   * gesture changed nothing.
   */
  onCommit?(value: number): void;
}

interface Drag {
  pointerId: number;
  /** The pointer's last position on the axis. */
  last: number;
  /** Travel so far, unsnapped, so slow drags still add up. */
  t: number;
  start: number;
}

/** Keys the control handles itself; the editor's shortcuts never see them. */
const HANDLED = new Set([
  'ArrowUp',
  'ArrowRight',
  'ArrowDown',
  'ArrowLeft',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  'Enter',
]);

/**
 * Keyboard and pointer behaviour for a continuous control (Knob, Fader): see
 * sliderMath for the movement rules. Returns the handlers for the element
 * that carries role="slider", and whether a drag is under way.
 */
export function useSliderControl(options: SliderControlOptions) {
  // Read at event time, so the handlers never act on a stale render.
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const drag = useRef<Drag | null>(null);
  // The last value this control sent, which may be ahead of the `value`
  // prop while the store catches up.
  const latest = useRef(options.value);
  const [dragging, setDragging] = useState(false);

  const emit = (next: number) => {
    if (next === latest.current) return false;
    latest.current = next;
    optionsRef.current.onChange(next);
    return true;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const o = optionsRef.current;
    if (o.disabled || !HANDLED.has(event.key)) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const current = quantize(o.value, o);
    let next: number | null = null;
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        next = stepValue(current, o, 1, event.shiftKey ? 'fine' : 'step');
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        next = stepValue(current, o, -1, event.shiftKey ? 'fine' : 'step');
        break;
      case 'PageUp':
        next = stepValue(current, o, 1, 'page');
        break;
      case 'PageDown':
        next = stepValue(current, o, -1, 'page');
        break;
      case 'Home':
        next = o.min;
        break;
      case 'End':
        next = o.max;
        break;
      case 'Enter':
        if (o.resetValue === undefined) return;
        next = quantize(o.resetValue, o);
        break;
    }
    // Handled: no page scroll, and no editor shortcut on the same key.
    event.preventDefault();
    event.stopPropagation();
    if (next === null || next === current) return;
    latest.current = current;
    if (emit(next)) o.onCommit?.(next);
  };

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    const o = optionsRef.current;
    if (o.disabled || event.button !== 0 || drag.current) return;
    // No text selection or native drag while turning; focus by hand, since
    // preventing pointerdown also prevents the focus a click would give.
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const current = quantize(o.value, o);
    latest.current = current;
    drag.current = {
      pointerId: event.pointerId,
      last: o.axis === 'vertical' ? event.clientY : event.clientX,
      t: toNorm(current, o),
      start: current,
    };
    setDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || event.pointerId !== d.pointerId) return;
    const o = optionsRef.current;
    const position = o.axis === 'vertical' ? event.clientY : event.clientX;
    // Screen y grows downward; up is toward max.
    const delta = o.axis === 'vertical' ? d.last - position : position - d.last;
    d.last = position;
    const travel = typeof o.travelPx === 'function' ? o.travelPx() : o.travelPx;
    d.t = dragNorm(d.t, delta, travel, event.shiftKey);
    emit(quantize(fromNorm(d.t, o), o));
  };

  const endDrag = (event: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || event.pointerId !== d.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (latest.current !== d.start) {
      optionsRef.current.onCommit?.(latest.current);
    }
  };

  const onDoubleClick = () => {
    const o = optionsRef.current;
    if (o.disabled || o.resetValue === undefined) return;
    const current = quantize(o.value, o);
    const next = quantize(o.resetValue, o);
    if (next === current) return;
    latest.current = current;
    if (emit(next)) o.onCommit?.(next);
  };

  return {
    dragging,
    handlers: {
      onKeyDown,
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      // A cancelled or stolen pointer ends the gesture where it stands.
      onPointerCancel: endDrag,
      onLostPointerCapture: endDrag,
      onDoubleClick,
    },
  };
}
