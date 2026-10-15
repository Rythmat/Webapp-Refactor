import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { withTransaction } from '@/daw/store/history';

// ── Continuous controls: preview while moving, commit once ────────────────
//
// A knob, fader or drag used to write the store on every pointer move, and
// each write cost the whole project: an undo check, a Yjs update to every
// collaborator, an engine re-sync and an autosave restart (fx-mixer-07,
// design-system-03). Now a gesture previews and commits once:
// - begin() on pointer down starts a gesture;
// - change(value) during it draws the value here and plays it through
//   `preview` (the engine only), at most once per frame;
// - end() on release writes the store once with `commit`, as one undo step
//   named `label`, and so one Yjs update and one autosave. A gesture that
//   ended where it began writes nothing and puts the sound back.
// A change outside a gesture (a key press, a click on a toggle, a
// double-click reset) is a gesture of its own: it commits at once.
//
// A release the control never hears (the pointer let go outside the window,
// the control unmounted mid-drag) still ends the gesture: the hook listens
// for it on the window while one is under way, and an unmount commits it.

export interface ContinuousControlOptions<T> {
  /** The value in the store. */
  value: T;
  /** Plays `value` without writing the store: the engine only. */
  preview(value: T): void;
  /**
   * Writes `value` to the store: once per gesture. `start` is the value the
   * gesture started from, for a commit that writes only what changed.
   */
  commit(value: T, start: T): void;
  /** The undo step's name, such as 'Change volume'. */
  label: string;
  equals?(a: T, b: T): boolean;
}

export interface ContinuousControl<T> {
  /** What to draw: the gesture's value while one is under way. */
  value: T;
  dragging: boolean;
  /** A gesture starts (pointer down). */
  begin(): void;
  /** A new value: previewed during a gesture, committed at once outside one. */
  change(value: T): void;
  /** The gesture ends: one commit, if it changed anything. */
  end(): void;
  /** The gesture is dropped, and the sound goes back to the store's value. */
  cancel(): void;
}

interface Gesture<T> {
  start: T;
  latest: T;
  previewed: boolean;
}

/** One frame's wait, or a macrotask where frames don't run (tests, hidden). */
function nextFrame(fn: () => void): () => void {
  if (typeof requestAnimationFrame === 'function') {
    const id = requestAnimationFrame(fn);
    return () => cancelAnimationFrame(id);
  }
  const id = setTimeout(fn, 16);
  return () => clearTimeout(id);
}

export function useContinuousControl<T>(
  options: ContinuousControlOptions<T>,
): ContinuousControl<T> {
  // Read at event time, so a gesture never acts on a stale render.
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const gesture = useRef<Gesture<T> | null>(null);
  const cancelFrame = useRef<(() => void) | null>(null);
  const stopListening = useRef<(() => void) | null>(null);
  const [draft, setDraft] = useState<{ value: T } | null>(null);

  const same = useCallback((a: T, b: T) => {
    const equals = optionsRef.current.equals;
    return equals ? equals(a, b) : Object.is(a, b);
  }, []);

  const stopFrame = useCallback(() => {
    cancelFrame.current?.();
    cancelFrame.current = null;
  }, []);

  const finish = useCallback(
    (keep: boolean) => {
      const g = gesture.current;
      if (!g) return;
      gesture.current = null;
      stopFrame();
      stopListening.current?.();
      stopListening.current = null;
      setDraft(null);
      const o = optionsRef.current;
      if (keep && !same(g.latest, g.start)) {
        withTransaction(o.label, () => o.commit(g.latest, g.start));
      } else if (g.previewed) {
        o.preview(o.value);
      }
    },
    [same, stopFrame],
  );

  const end = useCallback(() => finish(true), [finish]);
  const cancel = useCallback(() => finish(false), [finish]);

  const begin = useCallback(() => {
    if (gesture.current) return;
    const start = optionsRef.current.value;
    gesture.current = { start, latest: start, previewed: false };
    setDraft({ value: start });
    // The safety net: a release anywhere ends the gesture, after the
    // control's own handlers have had it.
    const onRelease = () => finish(true);
    window.addEventListener('pointerup', onRelease);
    window.addEventListener('pointercancel', onRelease);
    window.addEventListener('blur', onRelease);
    stopListening.current = () => {
      window.removeEventListener('pointerup', onRelease);
      window.removeEventListener('pointercancel', onRelease);
      window.removeEventListener('blur', onRelease);
    };
  }, [finish]);

  const change = useCallback(
    (value: T) => {
      const g = gesture.current;
      if (!g) {
        const o = optionsRef.current;
        if (!same(value, o.value)) {
          withTransaction(o.label, () => o.commit(value, o.value));
        }
        return;
      }
      if (same(value, g.latest)) return;
      g.latest = value;
      setDraft({ value });
      if (cancelFrame.current) return;
      cancelFrame.current = nextFrame(() => {
        cancelFrame.current = null;
        const current = gesture.current;
        if (!current) return;
        current.previewed = true;
        optionsRef.current.preview(current.latest);
      });
    },
    [same],
  );

  // Unmounted mid-gesture (a panel closed under the pointer): keep the move.
  useEffect(() => () => finish(true), [finish]);

  const value = draft ? draft.value : options.value;
  const dragging = draft !== null;
  return useMemo(
    () => ({ value, dragging, begin, change, end, cancel }),
    [value, dragging, begin, change, end, cancel],
  );
}

// ── Gestures across a panel ─────────────────────────────────────────────
// A panel of knobs that share one value (an effect rack's state) holds one
// control; each knob tells it when a drag starts and ends through this
// context, so a toggle or a list in the same panel still commits at once.

export interface ControlGesture {
  begin(): void;
  end(): void;
}

export const ControlGestureContext = createContext<ControlGesture | null>(null);

/** The gesture of the panel a control sits in, if any. */
export function useControlGesture(): ControlGesture | null {
  return useContext(ControlGestureContext);
}

/**
 * Props for a Radix Slider root: a press starts the gesture, its release
 * ends it. Radix calls onValueCommit only when the value changed, so the
 * release has to be heard here too.
 */
export function sliderGestureProps<T>(control: ContinuousControl<T>) {
  return {
    onPointerDown: control.begin,
    onPointerUp: control.end,
    onPointerCancel: control.end,
    onValueCommit: control.end,
  };
}

// ── Saving a view's own state on release ────────────────────────────────
// Some views keep the state they edit themselves and save it to the store
// in an effect (the guitar and vocal pedal chains: the engine follows the
// view's chain directly). This holds that save while a drag is under way and
// makes it once on release, as one undo step; any other change saves at
// once. A save that would write what the store already holds is skipped.

export interface SaveOnReleaseOptions<T> {
  /** The view's state, saved when it changes. */
  value: T;
  /** Whether the store already holds `value`. */
  isSaved(value: T): boolean;
  /** Writes `value` to the store. */
  save(value: T): void;
  /** The undo step's name. */
  label: string;
}

/** Returns the gesture a view's controls report their drags to. */
export function useSaveOnRelease<T>(
  options: SaveOnReleaseOptions<T>,
): ControlGesture {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const dragging = useRef(false);
  const stopListening = useRef<(() => void) | null>(null);
  const [released, setReleased] = useState(0);

  useEffect(() => {
    if (dragging.current) return;
    const o = optionsRef.current;
    if (o.isSaved(options.value)) return;
    withTransaction(o.label, () => o.save(options.value));
  }, [options.value, released]);

  const gesture = useMemo<ControlGesture>(() => {
    const end = () => {
      if (!dragging.current) return;
      dragging.current = false;
      stopListening.current?.();
      stopListening.current = null;
      setReleased((n) => n + 1);
    };
    return {
      begin() {
        if (dragging.current) return;
        dragging.current = true;
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
        window.addEventListener('blur', end);
        stopListening.current = () => {
          window.removeEventListener('pointerup', end);
          window.removeEventListener('pointercancel', end);
          window.removeEventListener('blur', end);
        };
      },
      end,
    };
  }, []);

  // Unmounted mid-drag: save what the drag reached.
  useEffect(
    () => () => {
      stopListening.current?.();
      if (!dragging.current) return;
      dragging.current = false;
      const o = optionsRef.current;
      if (!o.isSaved(o.value)) withTransaction(o.label, () => o.save(o.value));
    },
    [],
  );

  return gesture;
}
