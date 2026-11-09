import { createContext, useContext } from 'react';
import type { SheetSnap } from './sheetSnap';

/**
 * Where a panel is drawn:
 * - `inspector`: the Inspector, a fixed card in the stage's corner (desktop),
 *   which is the surface;
 * - `sheet`: the phone's bottom sheet, which is the surface and gives the
 *   panel its full width and height;
 * - `dock`: the stage's dock under the map (a place's timeline, a tour's or
 *   pathway's progress), the stage card being the surface;
 * - `column`: on its own, its own floating surface (tests, the default).
 */
export type AtlasZone =
  | { kind: 'column' }
  | {
      kind: 'sheet';
      snap: SheetSnap;
      setSnap: (snap: SheetSnap) => void;
    }
  | { kind: 'inspector' }
  | { kind: 'dock' };

const COLUMN: AtlasZone = { kind: 'column' };

export const AtlasZoneContext = createContext<AtlasZone>(COLUMN);

export const useAtlasZone = (): AtlasZone => useContext(AtlasZoneContext);

/** Whether the zone is the panel's surface (it drops its own). */
export const zoneIsSurface = (zone: AtlasZone): boolean =>
  zone.kind === 'sheet' || zone.kind === 'inspector' || zone.kind === 'dock';
