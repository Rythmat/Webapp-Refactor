import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ATLAS_FOCUS,
  ATLAS_SURFACE,
  AtlasIconButton,
} from '@/components/atlas/components/UI/primitives';
import { ATLAS_Z } from '@/components/atlas/theme/layers';
import type { MapInsets } from '@/components/atlas/types';
import { cn } from '@/lib/utils';
import { BottomSheet } from './BottomSheet';
import { insetsFrom, useReportInsets } from './mapInsets';
import { SHEET_PEEK_PX, type SheetSnap } from './sheetSnap';
import type { InspectorSlot } from './useInspector';
import { usePanelZone } from './usePanelZone';
import { AtlasZoneContext, type AtlasZone } from './zoneContext';

/** The bar under the map: the timeline, or a tour or pathway. */
export interface BottomBarSlot {
  /** What the collapsed handle says: "timeline", "tour". */
  label: string;
  /** The bar's width at most; it is always narrower than the page. */
  maxWidth: number;
  node: ReactNode;
}

export interface PhoneZonesProps {
  /** The Inspector's panel, shown in the sheet (layout/useInspector.tsx). */
  inspector: InspectorSlot | null;
  bottom: BottomBarSlot | null;
  /**
   * The floating cards as a strip (layout/PhoneStrip.tsx), above the bottom
   * rail when nothing else is: no journey's bar, the sheet down.
   */
  strip?: ReactNode;
  /** What the zones cover of the map, whenever it changes (MapInsets). */
  onInsets?: (insets: MapInsets) => void;
}

/** What each zone tells a test or a screenshot script it is. */
const zoneItem = (name: string) => ({ 'data-atlas-zone-item': name });

/**
 * The bottom bar, collapsible to a slim handle so the map can have the
 * bottom of the screen back.
 */
function BottomBarFrame({ bar }: { bar: BottomBarSlot }) {
  const [collapsed, setCollapsed] = useState(false);
  if (collapsed) {
    return (
      <button
        {...zoneItem('bottom-bar')}
        aria-expanded={false}
        className={cn(
          ATLAS_SURFACE,
          ATLAS_FOCUS,
          'pointer-events-auto inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold text-atlas-text-2 transition-colors hover:text-atlas-text',
        )}
        type="button"
        onClick={() => setCollapsed(false)}
      >
        <ChevronUp aria-hidden className="size-3.5" />
        Show {bar.label}
      </button>
    );
  }
  return (
    <div
      {...zoneItem('bottom-bar')}
      className="pointer-events-auto relative w-full"
      style={{ maxWidth: bar.maxWidth }}
    >
      <AtlasIconButton
        aria-expanded
        aria-label={`Hide the ${bar.label}`}
        className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 bg-atlas-panel"
        size="xs"
        variant="outline"
        onClick={() => setCollapsed(true)}
      >
        <ChevronDown aria-hidden className="size-3.5" />
      </AtlasIconButton>
      {bar.node}
    </div>
  );
}

/**
 * Phones: the Inspector's panel in a bottom sheet, and the bar under the map
 * resting on the sheet at peek (the panels' icons are in the bottom
 * rail). Once the sheet is raised past peek the bar steps aside, and it comes
 * back when the sheet drops or closes. With no bar, the floating cards'
 * strip takes its place, under the same rule.
 */
export function PhoneZones({
  inspector,
  bottom,
  strip,
  onInsets,
}: PhoneZonesProps) {
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
  const barHidden = open && snap !== 'peek';
  const bar = bottom && !barHidden ? bottom : null;
  // The cards' strip: not over a journey's bar, nor a raised sheet.
  const cards = !bottom && !barHidden && strip ? strip : null;
  const stackBottom = !open ? 8 : SHEET_PEEK_PX + 16;

  // What covers the map: along the bottom the bar or the sheet, which at
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
    `${open} ${snap} ${bar !== null} ${cards !== null}`,
  );

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0">
      {(bar || cards) && (
        <div
          ref={stackRef}
          className={cn(
            // gap-4: the bar's hide button stands 12 px above it.
            'absolute inset-x-2 flex flex-col items-center gap-4',
            ATLAS_Z.bars,
          )}
          style={{ bottom: stackBottom }}
        >
          {bar && <BottomBarFrame bar={bar} />}
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
