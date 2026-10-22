import { grooveIdFrom } from '@/curriculum/engine/drumGrooves/drumGroove';
import type { CustomDrumKitFile } from '@/daw/instruments/drumKits';

/**
 * The name and id a kit takes when it is saved as a new kit (the Kit panel's
 * Save as new kit): the name typed in the panel when it was changed from the
 * saved kit's, else the saved kit's name with "copy" after it. A name some
 * kit already has (a stock kit, a saved one, an earlier copy) gets a number:
 * "Latin Percussion copy 2". So two versions of a kit can live side by side,
 * and the kit it came from is never written over.
 */
export function kitCopyName(
  kit: CustomDrumKitFile,
  saved: readonly CustomDrumKitFile[],
  stockIds: readonly string[],
): { id: string; label: string } {
  const original = saved.find((k) => k.id === kit.id);
  const typed = kit.label.trim();
  const base =
    typed && original && typed !== original.label.trim()
      ? typed
      : `${(original?.label ?? typed).trim() || 'Custom kit'} copy`;
  const used = new Set([...stockIds, ...saved.map((k) => k.id)]);
  for (let n = 1; ; n += 1) {
    const label = n === 1 ? base : `${base} ${n}`;
    const id = grooveIdFrom(label);
    if (!used.has(id)) return { id, label };
  }
}
