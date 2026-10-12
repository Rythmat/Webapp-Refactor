import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  ATLAS_FOCUS,
  AtlasIconButton,
} from '@/components/atlas/components/UI/primitives';
import { ATLAS_Z } from '@/components/atlas/theme/layers';
import { cn } from '@/lib/utils';
import {
  sheetHeights,
  snapSheet,
  stepSheet,
  type SheetSnap,
} from './sheetSnap';

export interface SheetTab {
  id: string;
  label: string;
}

/**
 * The phone's bottom sheet: the left panel (and the mind map, when both are
 * open) at one of three heights, peek, half and full.
 *
 * Non-modal: the map above it stays live, nothing is trapped, and the page
 * behind is never dimmed. The handle drags it (mouse, touch or pen) and a
 * flick carries it to the next height; the two buttons beside the handle do
 * the same one step at a time, for the keyboard and screen readers.
 */
export const BottomSheet = forwardRef<
  HTMLDivElement,
  {
    snap: SheetSnap;
    onSnap: (snap: SheetSnap) => void;
    /** Names the sheet for assistive technology. */
    label: string;
    /** Two panels share the sheet: a switch in the strip picks the one shown. */
    tabs?: readonly SheetTab[];
    activeTab?: string;
    onTab?: (id: string) => void;
    /** The height it settles at, after each snap and resize. */
    onHeight?: (px: number) => void;
    children: ReactNode;
  }
>(function BottomSheet(
  { snap, onSnap, label, tabs, activeTab, onTab, onHeight, children },
  ref,
) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [containerPx, setContainerPx] = useState(0);

  // The sheet's heights follow the globe area it sits in.
  useLayoutEffect(() => {
    const parent = sheetRef.current?.offsetParent as HTMLElement | null;
    if (!parent) return;
    const measure = () => setContainerPx(parent.clientHeight);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  const heights = sheetHeights(containerPx);
  const height = heights[snap];

  useEffect(() => {
    if (containerPx) onHeight?.(height);
  }, [height, containerPx, snap]);

  // A drag writes the height straight to the element, and React hears once,
  // on release, which height it landed on.
  const drag = useRef<{
    startY: number;
    startHeight: number;
    lastY: number;
    lastT: number;
    velocity: number;
  } | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // The buttons and tabs in the strip are not handles.
    if ((e.target as HTMLElement).closest('button')) return;
    const el = sheetRef.current;
    if (!el || e.button > 0) return;
    drag.current = {
      startY: e.clientY,
      startHeight: el.getBoundingClientRect().height,
      lastY: e.clientY,
      lastT: e.timeStamp,
      velocity: 0,
    };
    el.style.transition = 'none';
    // On the window rather than captured to the strip, as the details card's
    // resize handle does: pointer capture slowed the globe's frames.
    const end = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
    const onPointerUp = () => {
      end();
      release();
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    const el = sheetRef.current;
    if (!d || !el) return;
    const next = Math.min(
      heights.full,
      Math.max(heights.peek / 2, d.startHeight + (d.startY - e.clientY)),
    );
    el.style.height = `${next}px`;
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.velocity = (d.lastY - e.clientY) / dt;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
  };

  const release = () => {
    const d = drag.current;
    const el = sheetRef.current;
    drag.current = null;
    if (!d || !el) return;
    // A press with no movement is not a fling.
    const moved = Math.abs(d.lastY - d.startY) > 4;
    const landed = snapSheet(
      heights,
      el.getBoundingClientRect().height,
      moved ? d.velocity : 0,
    );
    el.style.transition = '';
    // React will not touch the height if the snap is unchanged; set it here.
    el.style.height = `${heights[landed]}px`;
    if (landed !== snap) onSnap(landed);
  };

  return (
    <div
      ref={(el) => {
        sheetRef.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) ref.current = el;
      }}
      aria-label={label}
      className={cn(
        'pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-2xl border border-b-0 border-atlas-panel-border bg-atlas-panel text-atlas-text shadow-2xl transition-[height] duration-200 ease-out',
        ATLAS_Z.panels,
      )}
      data-atlas-zone-item="sheet"
      data-snap={snap}
      role="region"
      style={{ height: containerPx ? height : heights.peek }}
    >
      <div
        className="flex shrink-0 cursor-grab touch-none select-none items-center gap-2 px-2 pt-1.5 active:cursor-grabbing"
        onPointerDown={onPointerDown}
      >
        <AtlasIconButton
          aria-label="Collapse sheet"
          disabled={snap === 'peek'}
          size="sm"
          onClick={() => onSnap(stepSheet(snap, -1))}
        >
          <ChevronDown aria-hidden className="size-4" />
        </AtlasIconButton>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <span aria-hidden className="h-1 w-10 rounded-full bg-white/30" />
          {tabs && tabs.length > 1 && (
            <div
              aria-label="Show in the sheet"
              className="flex gap-1 rounded-full border border-atlas-panel-border p-0.5"
              role="group"
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  aria-pressed={tab.id === activeTab}
                  className={cn(
                    'rounded-full px-3 py-0.5 text-xs font-bold transition-colors',
                    ATLAS_FOCUS,
                    tab.id === activeTab
                      ? 'bg-white text-atlas-page'
                      : 'text-atlas-text-2 hover:text-atlas-text',
                  )}
                  type="button"
                  onClick={() => onTab?.(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <AtlasIconButton
          aria-label="Expand sheet"
          disabled={snap === 'full'}
          size="sm"
          onClick={() => onSnap(stepSheet(snap, 1))}
        >
          <ChevronUp aria-hidden className="size-4" />
        </AtlasIconButton>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
});
