// The fretted instrument the diagrams, neck and TAB below this provider draw.
// Guitar unless a bass lesson says otherwise, so guitar views need no change.

import { createContext, useContext } from 'react';
import { GUITAR, type FrettedInstrument } from '@/lib/guitar/instrument';

export const FrettedInstrumentContext =
  createContext<FrettedInstrument>(GUITAR);

export function useFrettedInstrument(): FrettedInstrument {
  return useContext(FrettedInstrumentContext);
}
