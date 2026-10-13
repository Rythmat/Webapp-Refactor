import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ATLAS_FOCUS,
  ATLAS_SURFACE,
  AtlasIconButton,
} from '@/components/atlas/components/UI/primitives';
import { useEscapeLayer } from '@/components/atlas/hooks/useEscapeLayer';
import { ATLAS_Z } from '@/components/atlas/theme/layers';
import { cn } from '@/lib/utils';
import { BottomSheet } from './BottomSheet';
import { SHEET_PEEK_PX, type SheetSnap } from './sheetSnap';
import { usePanelFocus } from './usePanelFocus';
import { AtlasZoneContext, type AtlasZone } from './zoneContext';

/** The panel in the left zone (or the phone sheet): place, event, artist, search. */
export interface LeftPanelSlot {
  /** Identity of what it shows; a change is new content, not a re-open. */
  key: string;
  node: ReactNode;
  /** Escape and the close button both close it this way. */
  onClose: () => void;
}

/** The bar in the bottom zone: the timeline, or a tour or pathway. */
export interface BottomBarSlot {
  /** What the collapsed handle says: "timeline", "tour". */
  label: string;
  /** The bar's width at most; it is always narrower than the page. */
  maxWidth: number;
  node: ReactNode;
}

export interface AtlasZonesProps {
  left: LeftPanelSlot | null;
  /** The mind map, when open. */
  right: ReactNode | null;
  /** The map-control cluster: the legend, Layers and Spin. */
  controls: ReactNode;
  bottom: BottomBarSlot | null;
  /**
   * The map's data credit (MapCredit), when the map draws OpenStreetMap's
   * data. It gets a place of its own that nothing else covers: the foot of
   * the right column on desktop, above the bottom bar or the sheet on phones.
   */
  credit?: ReactNode | null;
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
 * The left panel's zone, which owns its focus and its Escape: opening moves
 * focus to the panel's heading, closing returns it, and Escape closes it.
 */
function useLeftPanelZone(left: LeftPanelSlot | null) {
  const ref = useRef<HTMLDivElement>(null);
  usePanelFocus(ref, left !== null, left?.key ?? null);
  useEscapeLayer(left !== null, () => left?.onClose());
  return ref;
}

/**
 * Desktop and tablet (sm and up): a grid over the globe, so the zones cannot
 * overlap.
 *
 *   ┌──────────┬─────────────┬──────────┐
 *   │ left     │             │ controls │
 *   │ panel    │   (globe)   │ mind map │
 *   ├──────────┴─────────────┴──────────┤
 *   │            bottom bar             │
 *   └───────────────────────────────────┘
 *
 * The left column is as wide as its panel, up to what the right column
 * leaves; the bottom row is as tall as its bar. The grid itself takes no
 * pointer events, so the globe is draggable everywhere a panel is not.
 */
export function DesktopZones({
  left,
  right,
  controls,
  bottom,
  credit,
}: AtlasZonesProps) {
  const leftRef = useLeftPanelZone(left);
  return (
    <div className="pointer-events-none absolute inset-0 grid grid-cols-[minmax(0,max-content)_minmax(0,1fr)_auto] grid-rows-[minmax(0,1fr)_auto] gap-4 p-4">
      <div
        ref={leftRef}
        {...zoneItem('left-panel')}
        className={cn(
          'relative col-start-1 row-start-1 flex max-h-full min-w-0 flex-col self-start *:pointer-events-auto',
          ATLAS_Z.panels,
          !left && 'hidden',
        )}
      >
        {left?.node}
      </div>
      <div className="col-start-3 row-start-1 flex min-h-0 flex-col items-end gap-3">
        <div
          {...zoneItem('map-controls')}
          className={cn(
            'relative flex shrink-0 items-start gap-2 *:pointer-events-auto',
            ATLAS_Z.mapControls,
          )}
        >
          {controls}
        </div>
        {right && (
          <div
            {...zoneItem('mind-map')}
            className={cn(
              'relative flex min-h-0 flex-col *:pointer-events-auto',
              ATLAS_Z.panels,
            )}
          >
            {right}
          </div>
        )}
        {credit && (
          <div
            {...zoneItem('map-credit')}
            className={cn(
              'relative mt-auto shrink-0 *:pointer-events-auto',
              ATLAS_Z.mapControls,
            )}
          >
            {credit}
          </div>
        )}
      </div>
      {bottom && (
        <div
          className={cn(
            'relative col-span-3 row-start-2 flex justify-center',
            ATLAS_Z.bars,
          )}
        >
          <BottomBarFrame bar={bottom} />
        </div>
      )}
    </div>
  );
}

/**
 * Phones (below sm): the controls in the top-right corner, the left panel
 * and the mind map in one bottom sheet (a switch picks between them, so they
 * never stack), and the bottom bar resting on the sheet at peek. Once the
 * sheet is raised past peek the bar steps aside, and it comes back when the
 * sheet drops or closes.
 */
export function PhoneZones({
  left,
  right,
  controls,
  bottom,
  credit,
  onSheetOcclusion,
}: AtlasZonesProps & {
  /**
   * How much of the globe the sheet covers (px), so the globe can rise clear
   * of it: its height at peek and half, nothing at full or closed.
   */
  onSheetOcclusion?: (px: number | null) => void;
}) {
  const sheetRef = useLeftPanelZone(left);
  const [snap, setSnap] = useState<SheetSnap>('half');
  const [tab, setTab] = useState<'left' | 'right'>('left');

  const items = useMemo(
    () => [
      ...(left ? [{ id: 'left', label: 'Details' }] : []),
      ...(right ? [{ id: 'right', label: 'Mind map' }] : []),
    ],
    [left !== null, right !== null],
  );
  const open = items.length > 0;
  const shown: 'left' | 'right' = !left ? 'right' : !right ? 'left' : tab;

  // A newly opened sheet starts at half; new left-panel content brings the
  // sheet to it.
  const wasOpen = useRef(open);
  useEffect(() => {
    if (open && !wasOpen.current) setSnap('half');
    wasOpen.current = open;
  }, [open]);
  useEffect(() => {
    if (left) setTab('left');
  }, [left?.key]);

  const zone = useMemo<AtlasZone>(
    () => ({ kind: 'sheet', snap, setSnap }),
    [snap],
  );
  const barHidden = open && snap !== 'peek';
  // The sheet's height, for the credit to sit on when the bar steps aside.
  const [sheetPx, setSheetPx] = useState(SHEET_PEEK_PX);
  const bar = bottom && !barHidden ? bottom : null;
  // A full sheet covers the map, and the credit with it.
  const showCredit = !!credit && !(open && snap === 'full');
  const stackBottom = !open ? 8 : bar ? SHEET_PEEK_PX + 16 : sheetPx + 8;

  // Closed, the sheet covers nothing.
  useEffect(() => {
    if (!open) onSheetOcclusion?.(null);
  }, [open]);
  useEffect(() => () => onSheetOcclusion?.(null), []);

  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        {...zoneItem('map-controls')}
        className={cn(
          'absolute right-2 top-2 flex items-start gap-2 *:pointer-events-auto',
          ATLAS_Z.mapControls,
        )}
      >
        {controls}
      </div>
      {(bar || showCredit) && (
        <div
          className={cn(
            // gap-4: the bar's hide button stands 12 px above it.
            'absolute inset-x-2 flex flex-col items-center gap-4',
            ATLAS_Z.bars,
          )}
          style={{ bottom: stackBottom }}
        >
          {showCredit && (
            <div
              {...zoneItem('map-credit')}
              className="self-end *:pointer-events-auto"
            >
              {credit}
            </div>
          )}
          {bar && <BottomBarFrame bar={bar} />}
        </div>
      )}
      {open && (
        <AtlasZoneContext.Provider value={zone}>
          <BottomSheet
            ref={sheetRef}
            activeTab={shown}
            label={shown === 'right' ? 'Mind map' : 'Details'}
            snap={snap}
            tabs={items}
            onHeight={(px) => {
              onSheetOcclusion?.(snap === 'full' ? null : px);
              if (credit) setSheetPx(px);
            }}
            onSnap={setSnap}
            onTab={(id) => setTab(id as 'left' | 'right')}
          >
            {left && (
              <div
                className={cn(
                  'flex min-h-0 flex-1 flex-col',
                  shown !== 'left' && 'hidden',
                )}
              >
                {left.node}
              </div>
            )}
            {right && (
              <div
                className={cn(
                  'flex min-h-0 flex-1 flex-col',
                  shown !== 'right' && 'hidden',
                )}
              >
                {right}
              </div>
            )}
          </BottomSheet>
        </AtlasZoneContext.Provider>
      )}
    </div>
  );
}
