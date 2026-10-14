import {
  createElement,
  lazy,
  Suspense,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { memoLoad } from '@/daw/preload';
import { chunkReloadPending } from '@/lib/chunkReload';
import { PartBoundary } from './errors/DawErrorBoundary';

// ── Parts of the editor in chunks of their own (milestone 1.12a) ───────────
//
// The editor's chunk holds what every session needs at once (the transport,
// the timeline, the track headers, the dock's frame, the session and draft
// machinery). The other views, the dock's tabs, the instrument views and the
// dialogs each load when first shown (bundle-load-08, shell-30, ia-flows-37,
// score-21): lazyPart wraps one, with its own boundary (a part that fails
// costs only its area) and a placeholder of its size while it loads.
// `preload()` fetches it ahead of time (a hover, a lesson's steps, idle).

export interface LazyPart<P extends object> {
  (props: P): ReactNode;
  displayName?: string;
  /** Fetch the part's chunk now; one fetch however often it is called. */
  preload(): Promise<unknown>;
}

/**
 * A part loaded on first render. `load` imports its module and picks the
 * component; `name` finishes "The {name} couldn't load".
 */
export function lazyPart<P extends object>(
  load: () => Promise<ComponentType<P>>,
  opts: { name: string; fallback?: ReactNode },
): LazyPart<P> {
  let loaded: ComponentType<P> | null = null;
  // One fetch, a failed one asked again (memoLoad, as the editor's own).
  const preload = memoLoad(() =>
    load()
      .then((component) => {
        // A failed import that a pending reload cancelled resolves to
        // nothing rather than throwing.
        if (!component) throw new Error(`The ${opts.name} didn't load`);
        loaded = component;
        return component;
      })
      .catch((error: unknown) => {
        // A reload onto a new build is under way (chunkReload): keep the
        // placeholder until it happens, rather than an error for a moment.
        if (chunkReloadPending()) {
          return new Promise<ComponentType<P>>(() => {});
        }
        throw error;
      }),
  );
  const Lazy = lazy(() =>
    preload().then((component) => ({ default: component })),
  ) as unknown as ComponentType<P>;
  const Part: LazyPart<P> = (props: P) => {
    // Already here (preloaded, or shown before): render it straight away,
    // with no placeholder for a frame. Decided once per mount, so a part
    // that mounted while loading is never swapped for another element
    // type, which would mount it again and lose its state.
    const [component] = useState(() => loaded ?? Lazy);
    return (
      <PartBoundary name={opts.name}>
        <Suspense fallback={opts.fallback ?? null}>
          {createElement(component, props)}
        </Suspense>
      </PartBoundary>
    );
  };
  Part.displayName = `LazyPart(${opts.name})`;
  Part.preload = preload;
  return Part;
}

/**
 * True from the first time `open` is true: a dialog's part mounts when it is
 * first opened and stays mounted, so it closes with its animation and keeps
 * its state, as when it was always mounted.
 */
export function useOpenedOnce(open: boolean): boolean {
  const [opened, setOpened] = useState(open);
  if (open && !opened) setOpened(true);
  return opened || open;
}

/** A placeholder the size of the area a part fills, while it loads. */
export function PartPlaceholder({ label }: { label: string }) {
  return (
    <div
      className="flex size-full min-h-[120px] flex-1 items-center justify-center"
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <span className="size-5 animate-spin rounded-full border-2 border-white/15 border-t-white/60 motion-reduce:animate-none" />
    </div>
  );
}
