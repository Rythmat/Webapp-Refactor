import type { MeasureBox } from '@/components/notation/StaffView';
import { formatChordSymbol, type ChordFormat } from '@/daw/midi/leadSheetUtils';
import type { ChordRegion } from '@/daw/store/prismSlice';

// ── Chord symbols over a part ──────────────────────────────────────────────
// The chords are the lead sheet's own — one source of truth for the song's
// harmony. A part only chooses whether to show them, and which ones to leave
// off. Taking a chord off one instrument never changes the lead sheet or the
// other instruments.

/** How far above a part's top staff line the symbols sit, unscaled. */
const CHORD_OFFSET = 20;
/** The lead sheet writes chord symbols at this size, in bold serif. */
export const CHORD_FONT_SIZE = 16;
/** Air kept between the bottom of a symbol and the music under it. */
const MELODY_CLEARANCE = 6;

export interface ChordPlacement {
  /** `partIndex:regionId` — a chord shown over one part. */
  key: string;
  regionId: string;
  partIndex: number;
  text: string;
  x: number;
  y: number;
  tick: number;
}

export const chordKey = (partIndex: number, regionId: string): string =>
  `${partIndex}:${regionId}`;

/** `trackId:regionId` — how a hidden chord is remembered. */
export const hiddenKey = (trackId: string, regionId: string): string =>
  `${trackId}:${regionId}`;

/** Where a beat is drawn: the note, rest or slash standing at that tick. */
export interface BeatAnchor {
  partIndex: number;
  tick: number;
  x: number;
  /** Highest ink at this beat — stem tip, ledger line or articulation. */
  inkTop?: number;
}

export interface PlaceChordsOptions {
  regions: ChordRegion[];
  measures: MeasureBox[];
  /** Beats as drawn, so a symbol sits over its beat rather than beside it. */
  anchors?: readonly BeatAnchor[];
  /** Parts showing chord symbols, by part index. */
  visibleParts: ReadonlySet<number>;
  /** `trackId:regionId` entries the user removed from a part. */
  hidden: ReadonlySet<string>;
  trackIdByPart: ReadonlyMap<number, string>;
  format: ChordFormat;
  scale: number;
}

/** Where each chord symbol is drawn, for every part that shows them. */
export function placeChords({
  regions,
  measures,
  anchors,
  visibleParts,
  hidden,
  trackIdByPart,
  format,
  scale,
}: PlaceChordsOptions): ChordPlacement[] {
  const placements: ChordPlacement[] = [];
  const ordered = [...regions].sort((a, b) => a.startTick - b.startTick);
  for (const [index, region] of ordered.entries()) {
    const tick = region.startTick;
    // A symbol belongs to the music up to the next chord, so it is that
    // stretch — and only that stretch — it has to stay clear of.
    const until = ordered[index + 1]?.startTick ?? Number.POSITIVE_INFINITY;
    for (const partIndex of visibleParts) {
      const trackId = trackIdByPart.get(partIndex);
      if (!trackId || hidden.has(hiddenKey(trackId, region.id))) continue;
      const box = measures.find(
        (m) =>
          m.partIndex === partIndex && tick >= m.startTick && tick < m.endTick,
      );
      if (!box) continue;
      const span = box.endTick - box.startTick || 1;
      // A chord belongs to a beat, so it stands over whatever is written on
      // that beat; only without anything there does it fall back to the bar.
      const onBeat = anchors
        ?.filter((a) => a.partIndex === partIndex && a.tick === tick)
        .sort((a, b) => a.x - b.x)[0];
      // Nothing may come between the symbol and its beat: where the music
      // under it reaches up, the symbol rises to keep its few pixels of air.
      const reach = (anchors ?? []).filter(
        (a) =>
          a.partIndex === partIndex &&
          a.inkTop !== undefined &&
          a.tick >= tick &&
          a.tick < Math.min(until, box.endTick),
      );
      const inkTop = reach.length
        ? Math.min(...reach.map((a) => a.inkTop as number))
        : Number.POSITIVE_INFINITY;
      placements.push({
        key: chordKey(partIndex, region.id),
        regionId: region.id,
        partIndex,
        tick,
        text: formatChordSymbol(region.noteName, format, region.name),
        x: onBeat
          ? onBeat.x
          : box.x + ((tick - box.startTick) / span) * box.width,
        y: Math.min(
          box.y - CHORD_OFFSET * scale,
          inkTop - (CHORD_FONT_SIZE + MELODY_CLEARANCE) * scale,
        ),
      });
    }
  }
  return placements;
}

/**
 * The rectangle between two chord symbols — across parts, across time — so a
 * range behaves like it does for notes and measures.
 */
export function chordRange(
  placements: ChordPlacement[],
  anchorKey: string,
  targetKey: string,
): string[] {
  const anchor = placements.find((p) => p.key === anchorKey);
  const target = placements.find((p) => p.key === targetKey);
  if (!anchor || !target) return [targetKey];
  const partFrom = Math.min(anchor.partIndex, target.partIndex);
  const partTo = Math.max(anchor.partIndex, target.partIndex);
  const tickFrom = Math.min(anchor.tick, target.tick);
  const tickTo = Math.max(anchor.tick, target.tick);
  return placements
    .filter(
      (p) =>
        p.partIndex >= partFrom &&
        p.partIndex <= partTo &&
        p.tick >= tickFrom &&
        p.tick <= tickTo,
    )
    .map((p) => p.key);
}

/** Hide these chords from their own parts, leaving every other part alone. */
export function withChordsHidden(
  hidden: readonly string[],
  keys: Iterable<string>,
  trackIdByPart: ReadonlyMap<number, string>,
): string[] {
  const next = new Set(hidden);
  for (const key of keys) {
    const [partIndex, ...rest] = key.split(':');
    const trackId = trackIdByPart.get(Number(partIndex));
    if (trackId) next.add(hiddenKey(trackId, rest.join(':')));
  }
  return [...next];
}

/** Bring every chord back on one part. */
export function withPartChordsRestored(
  hidden: readonly string[],
  trackId: string,
): string[] {
  return hidden.filter((entry) => !entry.startsWith(`${trackId}:`));
}
