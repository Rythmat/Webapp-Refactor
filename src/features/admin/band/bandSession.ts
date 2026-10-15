/**
 * Bands and pairings saved or deleted this session, laid over the registries.
 * The registries are build-time globs of the JSON files, so a file the editor
 * just wrote only appears there after Vite reloads the module — this keeps
 * the list, the editor and the assignments current in between.
 */

import { useSyncExternalStore } from 'react';
import type { Band } from '@/curriculum/engine/band/band';
import {
  byOrder,
  listBands,
  rememberBand,
} from '@/curriculum/engine/band/registry';
import {
  type LessonPairing,
  listPairings,
  rememberPairing,
} from '@/curriculum/engine/lessonPairings/registry';

const listeners = new Set<() => void>();
let version = 0;

const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

export function rememberSavedBand(band: Band) {
  rememberBand(band.id, band);
  emit();
}

export function rememberDeletedBand(id: string) {
  rememberBand(id, null);
  emit();
}

export function rememberSavedPairing(pairing: LessonPairing) {
  rememberPairing(pairing);
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

let bands = { version: -1, list: [] as Band[] };

/** Every band, this session's saves and deletes applied. */
export function useBandList(): Band[] {
  return useSyncExternalStore(subscribe, () => {
    if (bands.version !== version)
      bands = { version, list: listBands().sort(byOrder) };
    return bands.list;
  });
}

let pairings = { version: -1, list: [] as readonly LessonPairing[] };

/** Every lesson pairing, this session's saves applied. */
export function usePairingList(): readonly LessonPairing[] {
  return useSyncExternalStore(subscribe, () => {
    if (pairings.version !== version)
      pairings = { version, list: [...listPairings()] };
    return pairings.list;
  });
}
