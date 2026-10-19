import { memo, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cn } from '@/components/utilities';
import { useDevCommitCount } from '@/daw/dev/DevProfiler';
import { useStore } from '@/daw/store';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { getHint, listenForHints, subscribeHint } from './hintSource';

// ── The hover hint line (milestone 2.11) ───────────────────────────────────
//
// In the bottom rail's Master zone, after Master: what the control under
// the pointer (or the keyboard focus) does, and its key (hintSource.ts finds
// the words). There is no row of its own for it; it takes the zone's free
// width and shows only when that is at least MIN_HINT_PX, so at 1366 it has
// about 170 px and on a smaller window it simply isn't there. The student
// turns it off in '⋯' (Hover hints). It is aria-hidden: the words are each
// control's own name, which a screen reader already reads.
//
// It never commits while nothing changes: the listener runs only while the
// line shows, and the line re-renders only when the words change.

/** Below this much free width the line shows nothing. */
export const MIN_HINT_PX = 160;

export const HintLine = memo(function HintLine() {
  const on = useStore((s) => s.hoverHints);
  return on ? <HintBox /> : null;
});

/** The free width; the words (and their listener) only when it is enough. */
function HintBox() {
  const ref = useRef<HTMLDivElement>(null);
  const roomy = useRoomy(ref, MIN_HINT_PX);
  return (
    <div
      ref={ref}
      data-testid="hint-line"
      data-roomy={roomy || undefined}
      aria-hidden
      className="flex min-w-0 flex-1 items-center"
    >
      {roomy ? <HintText /> : null}
    </div>
  );
}

function HintText() {
  useDevCommitCount('HintLine');
  useEffect(() => listenForHints(), []);
  const text = useSyncExternalStore(subscribeHint, getHint, getHint);
  return (
    <span
      data-testid="hint-line-text"
      className={cn(TYPE_CLASS.label, 'min-w-0 truncate text-daw-text-3')}
    >
      {text}
    </span>
  );
}

/** Whether the element is at least `px` wide, as it resizes. */
function useRoomy(ref: React.RefObject<HTMLElement>, px: number): boolean {
  // Without a ResizeObserver (an old browser) the line just shows.
  const [roomy, setRoomy] = useState(
    () => typeof ResizeObserver === 'undefined',
  );
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) =>
      setRoomy(entry.contentRect.width >= px),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, px]);
  return roomy;
}
