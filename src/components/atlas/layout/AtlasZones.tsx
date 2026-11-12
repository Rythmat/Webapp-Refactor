import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ATLAS_Z } from '@/components/atlas/theme/layers';
import type { MapInsets } from '@/components/atlas/types';
import { cn } from '@/lib/utils';
import { BottomSheet } from './BottomSheet';
import { insetsFrom, useReportInsets } from './mapInsets';
import { SHEET_PEEK_PX, type SheetSnap } from './sheetSnap';
import type { InspectorSlot } from './useInspector';
import { usePanelZone } from './usePanelZone';
import { AtlasZoneContext, type AtlasZone } from './zoneContext';

export interface PhoneZonesProps {
  /** The Inspector's panel, shown in the sheet (layout/useInspector.tsx). */
  inspector: InspectorSlot | null;
  /**
   * The floating cards as a strip (layout/PhoneStrip.tsx), above the bottom
   * rail while the sheet is down.
   */
  strip?: ReactNode;
  /** What the zones cover of the map, whenever it changes (MapInsets). */
  onInsets?: (insets: MapInsets) => void;
}

/**
 * Phones: the Inspector's panel in a bottom sheet (the panels' icons are in
 * the bottom rail), and the floating cards' strip resting on the sheet at
 * peek. Once the sheet is raised past peek the strip steps aside, and it
 * comes back when the sheet drops or closes.
 */
export function PhoneZones({ inspector, strip, onInsets }: PhoneZonesProps) {
  const sheetRef = usePanelZone<HTMLDivElement>(inspector);
  const [snap, setSnap] = useState<SheetSnap>('half');
  const open = inspector !== null;

  // A newly opened sheet starts at half.
  const wasOpen = useRef(open);
  useEffect(() => {
    if (open && !wasOpen.current) setSnap('half');
    wasOpen.current = open;
  }, [open]);

  const zone = useMemo<AtlasZone>(
    () => ({ kind: 'sheet', snap, setSnap }),
    [snap],
  );
  // The cards' strip: not over a raised sheet.
  const cards = !(open && snap !== 'peek') && strip ? strip : null;
  const stackBottom = !open ? 8 : SHEET_PEEK_PX + 16;

  // What covers the map: along the bottom the strip or the sheet, which at
  // full covers it all and leaves nothing to frame.
  const rootRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  useReportInsets(
    rootRef,
    () => [stackRef.current, sheetRef.current],
    (root) => {
      const box = (el: Element | null | undefined) =>
        el?.getBoundingClientRect() ?? null;
      return insetsFrom(root.getBoundingClientRect(), {
        bottom: [
          box(stackRef.current),
          open && snap !== 'full' ? box(sheetRef.current) : null,
        ],
      });
    },
    onInsets,
    `${open} ${snap} ${cards !== null}`,
  );

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0">
      {cards && (
        <div
          ref={stackRef}
          className={cn(
            'absolute inset-x-2 flex flex-col items-center',
            ATLAS_Z.bars,
          )}
          style={{ bottom: stackBottom }}
        >
          {cards}
        </div>
      )}
      {inspector && (
        <AtlasZoneContext.Provider value={zone}>
          <BottomSheet
            ref={sheetRef}
            label={inspector.title}
            snap={snap}
            onSnap={setSnap}
          >
            {inspector.node}
          </BottomSheet>
        </AtlasZoneContext.Provider>
      )}
    </div>
  );
}
