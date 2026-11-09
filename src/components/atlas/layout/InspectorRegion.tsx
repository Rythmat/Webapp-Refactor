import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import { ATLAS_CARD } from '@/components/atlas/components/UI/primitives';
import { useAtlasDispatch } from '@/components/atlas/state/atlasStore';
import { ATLAS_Z } from '@/components/atlas/theme/layers';
import { cn } from '@/lib/utils';
import { CORNER_INSET_SHARE, INSPECTOR_REM, MINDMAP_PX } from './frameGeometry';
import { cornerBox, insetsFrom, useReportInsets } from './mapInsets';
import { useInspectorState, type InspectorSlot } from './useInspector';
import { usePanelZone } from './usePanelZone';
import { AtlasZoneContext, type AtlasZone } from './zoneContext';

/**
 * The Inspector, as the Studio's (owner, 2026-10-29: the Globe in the
 * Studio's frame): a floating card of a fixed size in the stage's bottom-left
 * corner (owner, 2026-10-30), the panel
 * the rail or the stop asks for (layout/useInspector.tsx). Always mounted, so
 * its focus survives one panel giving way to another.
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

  // The map area it lies over.
  const areaRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    areaRef.current = ref.current?.parentElement ?? null;
  }, [ref]);

  // What it covers of the map, for the map's padding and framing; nothing
  // once it is gone. A lesson's mind map is a tall board and counts in full.
  const board = slot?.panel === 'mindmap';
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
    (area) => {
      const box = slot ? ref.current?.getBoundingClientRect() : null;
      return insetsFrom(area.getBoundingClientRect(), {
        left: box && !board ? cornerBox(box, 'left', CORNER_INSET_SHARE) : box,
      });
    },
    onInsets,
    `${slot !== null} ${board}`,
  );

  const zone = useMemo<AtlasZone>(() => ({ kind: 'inspector' }), []);

  return (
    <aside
      ref={ref}
      aria-label={slot?.title}
      className={cn(
        // A floating card in the stage's corner, opaque for reading (owner,
        // 2026-10-30). Its foot clears the event timeline's open height
        // (UI/EraRail), whose era names rise over the map's bottom edge.
        ATLAS_CARD,
        'bg-atlas-panel',
        'absolute bottom-10 left-2 min-h-0 max-w-[calc(100%-1rem)] flex-col overflow-hidden',
        ATLAS_Z.panels,
        slot ? 'flex' : 'hidden',
      )}
      data-atlas-zone-item="inspector"
      id="atlas-inspector"
      style={
        board
          ? { top: '0.5rem', width: `${MINDMAP_PX}px` }
          : {
              width: `${INSPECTOR_REM.width}rem`,
              height: `min(${INSPECTOR_REM.height}rem, calc(100% - 3rem))`,
            }
      }
    >
      {slot && (
        <AtlasZoneContext.Provider value={zone}>
          {slot.node}
        </AtlasZoneContext.Provider>
      )}
    </aside>
  );
}
