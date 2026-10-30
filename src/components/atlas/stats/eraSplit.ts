import {
  MUSICAL_ERAS,
  eraOfYear,
  type EraId,
} from '@/components/atlas/data/musicalEras';

/** Years, counted by era, in the eras' order; eras with none left out. */
export function eraSplit(
  years: readonly number[],
): { id: EraId; count: number }[] {
  const counts = new Map<EraId, number>();
  for (const y of years) {
    const id = eraOfYear(y).id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return MUSICAL_ERAS.filter((e) => counts.has(e.id)).map((e) => ({
    id: e.id,
    count: counts.get(e.id)!,
  }));
}
