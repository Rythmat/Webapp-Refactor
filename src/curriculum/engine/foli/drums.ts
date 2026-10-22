/**
 * Foli's drums: two bongos, and on four drums a side stick and a timbale
 * too, the owner's uploaded one-shots (Peter, 2026-10-20). Each has the
 * General MIDI note it's written as on the percussion staff (lib/notation/
 * drumMap.ts places it), a color and the key that plays it by default.
 *
 * Pure, no React.
 */

import type { FoliMode } from './levels';

export type FoliDrum = 'timbale' | 'bongoHigh' | 'bongoLow' | 'sidestick';

export interface FoliDrumInfo {
  label: string;
  /** The one-shot it plays. */
  url: string;
  /** Its General MIDI percussion note, for the staff. */
  gm: number;
  color: string;
  /** KeyboardEvent.code. */
  defaultKey: string;
}

const UPLOADS = '/daw-assets/samples/drums/uploads';

export const DRUMS: Readonly<Record<FoliDrum, FoliDrumInfo>> = {
  timbale: {
    label: 'Timbale',
    url: `${UPLOADS}/MA_timbale_hit.mp3`,
    gm: 65,
    color: '#fbbf24',
    defaultKey: 'KeyD',
  },
  bongoHigh: {
    label: 'High bongo',
    url: `${UPLOADS}/MA_bongo_high.mp3`,
    gm: 60,
    color: '#a78bfa',
    defaultKey: 'KeyF',
  },
  bongoLow: {
    label: 'Low bongo',
    url: `${UPLOADS}/MA_bongo_low.mp3`,
    gm: 61,
    color: '#38bdf8',
    defaultKey: 'KeyJ',
  },
  sidestick: {
    label: 'Side stick',
    url: `${UPLOADS}/MA_snare_crossstick_4.mp3`,
    gm: 37,
    color: '#f472b6',
    defaultKey: 'KeyK',
  },
};

/** A mode's drums, left to right as they're laid out and played. */
export const MODE_DRUMS: Readonly<Record<FoliMode, readonly FoliDrum[]>> = {
  two: ['bongoHigh', 'bongoLow'],
  four: ['timbale', 'bongoHigh', 'bongoLow', 'sidestick'],
};

/** Each drum's key, as a mode plays them by default. Two drums keep Foli's A and D. */
export function defaultKeys(mode: FoliMode): Record<FoliDrum, string> {
  const keys = Object.fromEntries(
    (Object.keys(DRUMS) as FoliDrum[]).map((d) => [d, DRUMS[d].defaultKey]),
  ) as Record<FoliDrum, string>;
  if (mode === 'two') {
    keys.bongoHigh = 'KeyA';
    keys.bongoLow = 'KeyD';
  }
  return keys;
}
