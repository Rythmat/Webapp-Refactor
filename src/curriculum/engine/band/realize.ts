/**
 * The one contract every band layer meets: a chart in, notes out. Each
 * source kind is played by the engine it was designed with, unchanged — so a
 * style that moves from its three pairings to a Band plays the same notes.
 */

import type { BassLine } from '../bassLines/bassLine';
import {
  realizeComping,
  type ChordComping,
} from '../chordComping/chordComping';
import type { DrumGroove } from '../drumGrooves/drumGroove';
import type { BackingNote } from '../genreGeneration/backingPatterns';
import {
  pairedBassNotes,
  pairedDrumNotes,
} from '../lessonPairings/pairedBacking';
import { barTicks } from '../meter';
import { partTicks, playedTick, type InstrumentPart } from '../parts/part';
import {
  type BandLayer,
  type RealizeContext,
  type RealizedLayer,
  SOURCE_PART,
} from './band';

/**
 * How a layer's item is found. Lessons look up published items only; the
 * console's editor previews drafts too.
 */
export interface BandItems {
  groove(id: string): DrumGroove | undefined;
  bassLine(id: string): BassLine | undefined;
  comping(id: string): ChordComping | undefined;
  part(id: string): InstrumentPart | undefined;
}

/** Semitones from one tonic to another, the shorter way (−5 … +6). */
const shiftBetween = (from: number, to: number) => {
  const up = (((to - from) % 12) + 12) % 12;
  return up > 6 ? up - 12 : up;
};

/**
 * A part's notes looped across the chart, moved to the chart's key when one
 * is given (its tonic as the first chord's root, otherwise as written).
 */
function partNotes(
  part: InstrumentPart,
  ctx: RealizeContext,
  tonic: number | undefined,
): BackingNote[] {
  const loop = partTicks(part);
  const total = ctx.bars * barTicks(ctx.timeSignature);
  const shift =
    tonic === undefined || part.instrument === 'drums'
      ? 0
      : shiftBetween(part.key.tonic, tonic);
  const out: BackingNote[] = [];
  if (loop <= 0) return out;
  for (let start = 0; start < total; start += loop) {
    for (const n of part.notes) {
      const onset = Math.max(0, start + playedTick(n));
      if (onset >= total) continue;
      out.push({
        note: n.midi + shift,
        onset,
        duration: Math.min(n.duration, total - onset),
        velocity: n.velocity,
        part: part.instrument === 'drums' ? 'drums' : SOURCE_PART.part,
      });
    }
  }
  return out.sort((a, b) => a.onset - b.onset);
}

/**
 * One layer's notes over the chart, unswung (the caller swings, as lessons
 * do), or null when its item cannot be found (a draft, a deleted file).
 */
export function realizeLayer(
  layer: BandLayer,
  items: BandItems,
  ctx: RealizeContext,
  options: { tonic?: number } = {},
): BackingNote[] | null {
  const { source } = layer;
  switch (source.kind) {
    case 'groove': {
      const groove = items.groove(source.id);
      return groove
        ? pairedDrumNotes(groove, ctx.bars, barTicks(ctx.timeSignature))
        : null;
    }
    case 'bassLine': {
      const line = items.bassLine(source.id);
      return line
        ? pairedBassNotes(
            line,
            ctx.chordAt,
            ctx.bars,
            ctx.timeSignature,
            ctx.genre,
          )
        : null;
    }
    case 'comping': {
      const pattern = items.comping(source.id);
      return pattern
        ? realizeComping(pattern, ctx.chordAt, ctx.bars, ctx.timeSignature)
        : null;
    }
    case 'part': {
      const part = items.part(source.id);
      return part ? partNotes(part, ctx, options.tonic) : null;
    }
  }
}

/** Every playing layer's notes, in the band's order. */
export function realizeBand(
  band: { layers: readonly BandLayer[] },
  items: BandItems,
  ctx: RealizeContext,
  options: { tonic?: number; includeMuted?: boolean } = {},
): RealizedLayer[] {
  const out: RealizedLayer[] = [];
  for (const layer of band.layers) {
    if (layer.muted && !options.includeMuted) continue;
    const notes = realizeLayer(layer, items, ctx, options);
    if (notes) out.push({ layer, notes });
  }
  return out;
}

/**
 * The sound a layer plays on when none is picked: what its item plays in
 * lessons today — the groove's kit, the bass voice lessons give the line's
 * instrument, the electric piano lessons comp on, a part's own sound.
 */
export function defaultSound(layer: BandLayer, items: BandItems): string {
  const { source } = layer;
  switch (source.kind) {
    case 'groove':
      return `drum-machine:${items.groove(source.id)?.kit ?? 'natural'}`;
    case 'bassLine':
      return items.bassLine(source.id)?.instrument === 'upright'
        ? 'bass-electric:upright'
        : 'bass-electric:finger';
    case 'comping':
      return 'electric-piano';
    case 'part':
      return items.part(source.id)?.sound ?? 'piano-sampler';
  }
}

/** The sound a layer plays on: its own, else its item's. */
export const layerSound = (layer: BandLayer, items: BandItems) =>
  layer.sound ?? defaultSound(layer, items);
