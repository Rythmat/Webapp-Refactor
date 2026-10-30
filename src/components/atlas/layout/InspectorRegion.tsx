import { GripVertical } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import {
  ATLAS_FOCUS_INSET,
  ATLAS_CARD,
  ATLAS_TRANSITION,
} from '@/components/atlas/components/UI/primitives';
import { useAtlasDispatch } from '@/components/atlas/state/atlasStore';
import { ATLAS_Z } from '@/components/atlas/theme/layers';
import { cn } from '@/lib/utils';
import {
  INSPECTOR_ENLARGED,
  INSPECTOR_PX,
  clampInspectorPx,
  inspectorMaxPx,
} from './frameGeometry';
import { readInspectorWidth, writeInspectorWidth } from './inspectorWidth';
import { insetsFrom, useReportInsets } from './mapInsets';
import { useInspectorState, type InspectorSlot } from './useInspector';
import { usePanelZone } from './usePanelZone';
import { AtlasZoneContext, type AtlasZone } from './zoneContext';

/** One Arrow-key step of the resize handle; Shift takes four. */
const RESIZE_STEP = 16;

/**
 * The Inspector's right edge: drag it right to widen the panel, or focus it
 * and use the Arrow keys (Right widens); Home and End go to the narrowest and
 * widest, and a double-click back to the default.
 *
 * While dragging, the width is written straight to the panel's style and
 * React hears about it once, on release, so the panel's list never re-renders
 * on every move. Listened for on the window, not with setPointerCapture on the
 * handle, which made the drag stutter (measureGlobe, 4x CPU).
 */
function InspectorResizer({
  asideRef,
  width,
  areaPx,
  onCommit,
}: {
  asideRef: RefObject<HTMLElement>;
  width: number;
  areaPx: number;
  onCommit: (px: number) => void;
}) {
  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.button > 0) return;
      e.preventDefault();
      const aside = asideRef.current;
      if (!aside) return;
      const startX = e.clientX;
      const startWidth = aside.getBoundingClientRect().width;
      let next = startWidth;
      const onMove = (mv: globalThis.PointerEvent) => {
        next = clampInspectorPx(startWidth + (mv.clientX - startX), areaPx);
        aside.style.width = `${next}px`;
      };
      const onUp = () => {
        onCommit(Math.round(next));
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [asideRef, areaPx, onCommit],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? RESIZE_STEP * 4 : RESIZE_STEP;
    const next =
      e.key === 'ArrowRight'
        ? width + step
        : e.key === 'ArrowLeft'
          ? width - step
          : e.key === 'Home'
            ? INSPECTOR_PX.min
            : e.key === 'End'
              ? inspectorMaxPx(areaPx)
              : null;
    if (next === null) return;
    e.preventDefault();
    onCommit(clampInspectorPx(next, areaPx));
  };

  return (
    <div
      aria-label="Resize the side panel"
      aria-orientation="vertical"
      aria-valuemax={inspectorMaxPx(areaPx)}
      aria-valuemin={INSPECTOR_PX.min}
      aria-valuenow={width}
      className={cn(
        'absolute right-0 top-0 z-10 flex h-full w-3 cursor-ew-resize touch-none items-center justify-center rounded-r-xl opacity-0 hover:opacity-100 focus-visible:opacity-100 active:opacity-100',
        ATLAS_TRANSITION,
        ATLAS_FOCUS_INSET,
      )}
      data-atlas-inspector-resizer
      role="separator"
      tabIndex={0}
      onDoubleClick={() => onCommit(INSPECTOR_PX.default)}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
    >
      <GripVertical aria-hidden className="size-3 text-atlas-text-2" />
    </div>
  );
}

/**
 * The Inspector, as the Studio's (owner, 2026-10-29: the Globe in the
 * Studio's frame): a floating card in the map's top-left corner (owner,
 * 2026-10-30), as tall as what it holds and no taller than the stage, the panel
 * the rail or the stop asks for (layout/useInspector.tsx). Always mounted, so
 * its width and its focus survive one panel giving way to another.
 *
 * The map makes room for it through its padding (SET_ZONE_INSETS, MapLibre's
 * `padding`), so the canvas never resizes while it is dragged.
 */
export function InspectorRegion() {
  return <InspectorView slot={useInspectorState().slot} />;
}

/** The Inspector showing `slot` (exported for tests). */
export function InspectorView({ slot }: { slot: InspectorSlot | null }) {
  const dispatch = useAtlasDispatch();
  const ref = usePanelZone<HTMLElement>(slot);
  const [width, setWidth] = useState(readInspectorWidth);
  const [enlarged, setEnlarged] = useState(false);
  const [areaPx, setAreaPx] = useState(0);

  // New content opens at the panel's own width.
  const key = slot?.key ?? null;
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setEnlarged(false);
  }

  // The map area it lies over: its width caps the Inspector's.
  const areaRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const area = ref.current?.parentElement ?? null;
    areaRef.current = area;
    if (!area) return;
    const measure = () => setAreaPx(area.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(area);
    return () => ro.disconnect();
  }, [ref]);

  // What it covers of the map, for the map's padding and framing; nothing
  // once it is gone.
  const onInsets = useCallback(
    (insets: { top: number; right: number; bottom: number; left: number }) =>
      dispatch({
        type: 'SET_ZONE_INSETS',
        payload: { zone: 'inspector', insets },
      }),
    [dispatch],
  );
  useEffect(
    () => () =>
      dispatch({
        type: 'SET_ZONE_INSETS',
        payload: { zone: 'inspector', insets: null },
      }),
    [dispatch],
  );
  useReportInsets(
    areaRef,
    () => [ref.current],
    (area) =>
      insetsFrom(area.getBoundingClientRect(), {
        left: slot ? ref.current?.getBoundingClientRect() : null,
      }),
    onInsets,
    `${slot !== null} ${enlarged}`,
  );

  const commit = useCallback((px: number) => {
    setWidth(px);
    writeInspectorWidth(px === INSPECTOR_PX.default ? null : px);
  }, []);

  const zone = useMemo<AtlasZone>(
    () => ({ kind: 'inspector', enlarged, setEnlarged }),
    [enlarged],
  );
  const shown = areaPx ? clampInspectorPx(width, areaPx) : width;

  return (
    <aside
      ref={ref}
      aria-label={slot?.title}
      className={cn(
        // A floating card like the column's at the stage's left, opaque for
        // reading (owner, 2026-10-30).
        ATLAS_CARD,
        'bg-atlas-panel',
        // Its foot clears the event timeline's open height (UI/EraRail),
        // whose era names rise over the map's bottom edge.
        'absolute left-2 top-2 max-h-[calc(100%-3rem)] min-h-0 max-w-[calc(100%-1rem)] flex-col overflow-hidden',
        ATLAS_Z.panels,
        slot ? 'flex' : 'hidden',
      )}
      data-atlas-zone-item="inspector"
      id="atlas-inspector"
      style={{ width: enlarged ? INSPECTOR_ENLARGED : `${shown}px` }}
    >
      {slot && !enlarged && (
        <InspectorResizer
          areaPx={areaPx || window.innerWidth}
          asideRef={ref}
          width={shown}
          onCommit={commit}
        />
      )}
      {slot && (
        <AtlasZoneContext.Provider value={zone}>
          {slot.node}
        </AtlasZoneContext.Provider>
      )}
    </aside>
  );
}
