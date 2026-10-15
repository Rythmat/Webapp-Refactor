import { createContext, useContext } from 'react';
import type { SheetSnap } from './sheetSnap';

/**
 * Where a panel is drawn: in a desktop column, where it is its own floating
 * surface, or inside the phone's bottom sheet, which is the surface and gives
 * the panel its full width and height.
 */
export type AtlasZone =
  | { kind: 'column' }
  | {
      kind: 'sheet';
      snap: SheetSnap;
      setSnap: (snap: SheetSnap) => void;
    };

const COLUMN: AtlasZone = { kind: 'column' };

export const AtlasZoneContext = createContext<AtlasZone>(COLUMN);

export const useAtlasZone = (): AtlasZone => useContext(AtlasZoneContext);
