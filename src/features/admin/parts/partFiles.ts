/**
 * The Parts Library's exports (JSON, MIDI) and this session's saves and
 * deletes laid over the registry, which only sees a new file once Vite
 * reloads it. Saving itself is instrumentStore.ts's.
 */

import { useSyncExternalStore } from 'react';
import { toMidiEvents } from '@/curriculum/engine/parts/convert';
import type { InstrumentPart } from '@/curriculum/engine/parts/part';
import { listParts } from '@/curriculum/engine/parts/registry';
import { downloadMidiBlob, exportMidiFile } from '@/daw/midi/MidiFileIO';
import { CAN_WRITE_FILES } from '../drumGrooves/devFiles';

export { CAN_WRITE_FILES };

export function downloadPartJson(part: InstrumentPart) {
  const blob = new Blob([`${JSON.stringify(part, null, 2)}\n`], {
    type: 'application/json',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${part.id}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function downloadPartMidi(part: InstrumentPart) {
  const channel = part.instrument === 'drums' ? 9 : 0;
  const blob = exportMidiFile(
    new Map([
      [
        channel,
        {
          ticksPerQuarterNote: 480,
          trackName: part.name,
          events: toMidiEvents(part.notes).map((e) => ({ ...e, channel })),
        },
      ],
    ]),
    part.tempo,
  );
  downloadMidiBlob(blob, `${part.id}.mid`);
}

// ── Session overlay ────────────────────────────────────────────────────────

const saved = new Map<string, InstrumentPart>();
const deleted = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;
let cache = { version: -1, list: [] as InstrumentPart[] };

const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

/** This session's save, ahead of the files' reload (instrumentStore.ts). */
export function rememberPartSaved(part: InstrumentPart) {
  saved.set(part.id, part);
  deleted.delete(part.id);
  emit();
}

export function rememberPartDeleted(id: string) {
  saved.delete(id);
  deleted.add(id);
  emit();
}

/** Every part, this session's saves and deletes applied. */
export function usePartList(): InstrumentPart[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => {
      if (cache.version !== version) {
        const byId = new Map(listParts().map((p) => [p.id, p]));
        saved.forEach((p, id) => byId.set(id, p));
        deleted.forEach((id) => byId.delete(id));
        cache = {
          version,
          list: [...byId.values()].sort((a, b) => a.name.localeCompare(b.name)),
        };
      }
      return cache.list;
    },
  );
}
