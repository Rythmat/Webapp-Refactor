// ── jsdom gaps the primitives' tests fill ───────────────────────────────────
// jsdom has no PointerEvent (React reads pointerId, clientX/Y and shiftKey
// off it), no pointer capture, no scrollIntoView (Radix Select calls it) and
// no 2D canvas. These shims are enough for behaviour tests; what things look
// like is the gallery's job, in a browser.

class PointerEventShim extends MouseEvent {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly isPrimary: boolean;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.pointerType = init.pointerType ?? 'mouse';
    this.isPrimary = init.isPrimary ?? true;
  }
}

export function installDomShims(): void {
  if (typeof window.PointerEvent !== 'function') {
    window.PointerEvent = PointerEventShim as unknown as typeof PointerEvent;
  }
  const proto = Element.prototype as Element & Record<string, unknown>;
  proto.setPointerCapture ??= () => {};
  proto.releasePointerCapture ??= () => {};
  proto.hasPointerCapture ??= () => false;
  proto.scrollIntoView ??= () => {};
}

/** A 2D context that records what was painted, by method name. */
export function fakeCanvasContext() {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const record =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
    };
  const context = {
    fillStyle: '' as string,
    fillRect: record('fillRect'),
    clearRect: record('clearRect'),
    setTransform: record('setTransform'),
  };
  // Remember the fill colour each rectangle was painted with.
  const fillRect = context.fillRect;
  context.fillRect = (...args: unknown[]) => {
    fillRect(...args, context.fillStyle);
  };
  return { context, calls };
}
