import type { Bin } from '@/components/atlas/stats/placeStats';

/** A bin as words: "the 1950s", "1950–1954", "the 1900s" (a century's bin). */
export function binLabel(bin: Bin): string {
  if (bin.size === 10 && bin.start % 10 === 0) return `the ${bin.start}s`;
  return `${bin.start}–${bin.start + bin.size - 1}`;
}

/** A bin's count as words. */
export const eventsWord = (n: number) =>
  n === 1 ? '1 event' : `${n.toLocaleString('en')} events`;

/** The sentence a screen reader hears for a series of bins. */
export function describeSeries(label: string, bins: readonly Bin[]): string {
  const lit = bins.filter((b) => b.count > 0);
  if (lit.length === 0) return `${label}: no events.`;
  const busiest = lit.reduce((a, b) => (b.count > a.count ? b : a));
  const first = bins[0];
  const last = bins[bins.length - 1];
  return `${label}, ${first.start}–${last.start + last.size - 1}: busiest ${binLabel(busiest)} (${eventsWord(busiest.count)}).`;
}
