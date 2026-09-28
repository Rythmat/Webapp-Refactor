/**
 * Touch support for the Set Lists drags.
 *
 * The page drags with native HTML5 DnD, which does not exist on touch: an
 * iPad fires touch events and no drag events at all, so every drop target on
 * the page is dead to a finger. Set Lists is a tablet feature first — see the
 * stand — so a workflow built out of dragging cannot be mouse-only.
 *
 * Rather than rewrite every handler against a second drag system, this one
 * translates. A long press on anything `draggable` starts a drag, and the
 * finger's position is turned back into the dragstart / dragover / dragleave
 * / drop / dragend those handlers already expect, carrying one payload the
 * whole way. The handlers cannot tell which input they are serving, so touch
 * and mouse cannot drift apart as the page grows.
 *
 * A long press rather than a plain drag, because all three columns scroll: a
 * finger that travels before the timer fires is scrolling, and we get out of
 * its way. This is the gesture iOS uses to reorder a home screen, so it is
 * the one a player's thumb already knows.
 */

/** How long a finger must rest before it is dragging rather than scrolling. */
export const LONG_PRESS_MS = 300;

/** Travel that far first and it was a scroll, not a press. */
export const SCROLL_SLOP_PX = 8;

/** The drag events a drop target sees, in the order they arrive. */
type DragType = 'dragstart' | 'dragover' | 'dragleave' | 'drop' | 'dragend';

/**
 * Everything the page's handlers touch on a DataTransfer.
 *
 * Deliberately our own rather than the platform's: `new DataTransfer()` is
 * uneven across engines — some expose the constructor and then refuse
 * `setData` outside a real drag — and the handlers only ever read `types`,
 * `getData` and the two effect fields. A plain object behaves the same way
 * everywhere, including under the test runner, which has no DataTransfer.
 */
export function dataTransferShim(): DataTransfer {
  const data = new Map<string, string>();
  const shim = {
    effectAllowed: 'uninitialized',
    dropEffect: 'none',
    get types(): readonly string[] {
      return [...data.keys()];
    },
    setData(type: string, value: string) {
      data.set(type, String(value));
    },
    getData(type: string) {
      return data.get(type) ?? '';
    },
    clearData(type?: string) {
      if (type) data.delete(type);
      else data.clear();
    },
    setDragImage() {},
    files: [],
    items: [],
  };
  return shim as unknown as DataTransfer;
}

/**
 * A drag event the page's handlers accept.
 *
 * `DragEvent` takes its dataTransfer from the constructor where that is
 * supported; where it is not — an older engine, or the test runner — a plain
 * Event carrying the same fields does just as well, because React reads them
 * off the native event by name and never type-checks it.
 */
export function makeDragEvent(
  type: DragType,
  dataTransfer: DataTransfer,
  clientX: number,
  clientY: number,
): Event {
  try {
    const ev = new DragEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX,
      clientY,
      dataTransfer,
    });
    if (ev.dataTransfer) return ev;
  } catch {
    // No DragEvent constructor here; fall through to the plain Event.
  }
  const ev = new Event(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
  });
  Object.defineProperties(ev, {
    dataTransfer: { value: dataTransfer, enumerable: true },
    clientX: { value: clientX, enumerable: true },
    clientY: { value: clientY, enumerable: true },
    // Drop targets close themselves on dragleave unless the pointer moved to
    // something inside them. A touch never has a related target, so `null`
    // is both true and the answer that clears the highlight.
    relatedTarget: { value: null, enumerable: true },
  });
  return ev;
}

/** Whether the finger has travelled far enough to be scrolling, not pressing. */
export const isScrollGesture = (
  dx: number,
  dy: number,
  slop = SCROLL_SLOP_PX,
): boolean => Math.abs(dx) > slop || Math.abs(dy) > slop;

export interface TouchDragOptions {
  longPressMs?: number;
  slopPx?: number;
  /** Test seam; defaults to the real hit test. */
  elementAt?: (x: number, y: number) => Element | null;
}

/**
 * Wire touch dragging into `root`, returning the teardown.
 *
 * Attaching is harmless on a device with no touchscreen: nothing here runs
 * until a touch arrives, and a mouse goes on using the native drags.
 */
export function attachTouchDrag(
  root: HTMLElement,
  options: TouchDragOptions = {},
): () => void {
  const longPressMs = options.longPressMs ?? LONG_PRESS_MS;
  const slopPx = options.slopPx ?? SCROLL_SLOP_PX;
  const elementAt =
    options.elementAt ??
    ((x: number, y: number) => document.elementFromPoint(x, y));

  let source: HTMLElement | null = null;
  let payload: DataTransfer | null = null;
  let ghost: HTMLElement | null = null;
  let over: Element | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let originX = 0;
  let originY = 0;
  let dragging = false;

  const send = (el: Element, type: DragType, x: number, y: number) => {
    if (!payload) return;
    el.dispatchEvent(makeDragEvent(type, payload, x, y));
  };

  const clearTimer = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const showGhost = (x: number, y: number) => {
    if (!source) return;
    const box = source.getBoundingClientRect();
    const node = source.cloneNode(true) as HTMLElement;
    node.style.position = 'fixed';
    node.style.left = '0';
    node.style.top = '0';
    node.style.width = `${box.width}px`;
    node.style.margin = '0';
    node.style.zIndex = '9999';
    node.style.opacity = '0.9';
    node.style.pointerEvents = 'none';
    node.style.userSelect = 'none';
    node.style.boxShadow = '0 12px 32px rgba(0,0,0,0.55)';
    node.setAttribute('aria-hidden', 'true');
    document.body.appendChild(node);
    ghost = node;
    ghost.dataset.dragOffsetX = String(x - box.left);
    ghost.dataset.dragOffsetY = String(y - box.top);
    moveGhost(x, y);
  };

  const moveGhost = (x: number, y: number) => {
    if (!ghost) return;
    const dx = Number(ghost.dataset.dragOffsetX ?? 0);
    const dy = Number(ghost.dataset.dragOffsetY ?? 0);
    ghost.style.transform = `translate(${x - dx}px, ${y - dy}px)`;
  };

  const removeGhost = () => {
    ghost?.remove();
    ghost = null;
  };

  /**
   * A drag ends on the same finger-lift that would otherwise be a tap, and
   * these cards open on click. Swallow exactly one.
   */
  const swallowNextClick = () => {
    const swallow = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener('click', swallow, {
      capture: true,
      once: true,
    });
    // Nothing to swallow if no click follows — do not leave it armed.
    setTimeout(
      () => document.removeEventListener('click', swallow, { capture: true }),
      400,
    );
  };

  const reset = () => {
    clearTimer();
    removeGhost();
    dragging = false;
    source = null;
    payload = null;
    over = null;
  };

  const begin = (x: number, y: number) => {
    timer = null;
    if (!source) return;
    payload = dataTransferShim();
    send(source, 'dragstart', x, y);
    // Nothing written means nobody claimed it — a row whose handler bailed,
    // or an element that is draggable for some other reason. Not our drag.
    if (payload.types.length === 0) {
      payload = null;
      source = null;
      return;
    }
    dragging = true;
    showGhost(x, y);
  };

  const onTouchStart = (e: TouchEvent) => {
    reset();
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const target = e.target as Element | null;
    const el = target?.closest?.('[draggable="true"]') as HTMLElement | null;
    if (!el || !root.contains(el)) return;
    source = el;
    originX = touch.clientX;
    originY = touch.clientY;
    timer = setTimeout(() => begin(touch.clientX, touch.clientY), longPressMs);
  };

  const onTouchMove = (e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    if (!dragging) {
      if (!source) return;
      if (
        isScrollGesture(
          touch.clientX - originX,
          touch.clientY - originY,
          slopPx,
        )
      ) {
        reset();
      }
      return;
    }

    // The gesture is ours now: stop the column scrolling under the finger.
    if (e.cancelable) e.preventDefault();
    moveGhost(touch.clientX, touch.clientY);

    const el = elementAt(touch.clientX, touch.clientY);
    if (el !== over) {
      if (over) send(over, 'dragleave', touch.clientX, touch.clientY);
      over = el;
    }
    if (over) send(over, 'dragover', touch.clientX, touch.clientY);
  };

  const onTouchEnd = (e: TouchEvent) => {
    clearTimer();
    if (!dragging) {
      source = null;
      return;
    }
    const touch = e.changedTouches[0];
    const x = touch?.clientX ?? originX;
    const y = touch?.clientY ?? originY;
    // Off the ghost before the hit test, or it answers every question.
    removeGhost();
    const el = elementAt(x, y) ?? over;
    if (el) send(el, 'drop', x, y);
    if (source) send(source, 'dragend', x, y);
    swallowNextClick();
    reset();
  };

  const onTouchCancel = () => {
    if (dragging) {
      if (over) send(over, 'dragleave', originX, originY);
      if (source) send(source, 'dragend', originX, originY);
    }
    reset();
  };

  root.addEventListener('touchstart', onTouchStart, { passive: true });
  // Not passive: a drag in progress has to be able to stop the page scrolling.
  root.addEventListener('touchmove', onTouchMove, { passive: false });
  root.addEventListener('touchend', onTouchEnd);
  root.addEventListener('touchcancel', onTouchCancel);

  return () => {
    reset();
    root.removeEventListener('touchstart', onTouchStart);
    root.removeEventListener('touchmove', onTouchMove);
    root.removeEventListener('touchend', onTouchEnd);
    root.removeEventListener('touchcancel', onTouchCancel);
  };
}
