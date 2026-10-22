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
import {
  followChords,
  followsChords,
  keyNotes,
  keyShift,
} from '../parts/followChords';
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
      : keyShift(part.key.tonic, tonic);
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
 * A part following the chart's chords (parts/followChords.ts) in its key,
 * looped across it as `partNotes` loops one, the voice leading carried on
 * from pass to pass. Null when the part names no chords to follow from, so
 * the layer drops out and the lesson's own backing plays that part.
 */
function followedNotes(
  part: InstrumentPart,
  ctx: RealizeContext,
  key: NonNullable<RealizeContext['followChords']>,
): BackingNote[] | null {
  const total = ctx.bars * barTicks(ctx.timeSignature);
  const notes = followChords(part, ctx.chordAt, total, key);
  if (!notes) return null;
  return notes
    .map((n) => {
      const onset = Math.max(0, playedTick(n));
      return {
        note: n.midi,
        onset,
        duration: Math.min(n.duration, total - onset),
        velocity: n.velocity,
        part: SOURCE_PART.part,
      };
    })
    .sort((a, b) => a.onset - b.onset);
}

/** How a band is realized beyond its chart. */
export interface RealizeOptions {
  /** The key's tonic parts move to when they play as written. */
  tonic?: number;
  /**
   * A part asked to follow the chords that names none plays as written,
   * moved to the chart's key, instead of dropping out: the console's
   * editors, where a silent layer would hide it. Lessons let their own
   * backing play that part.
   */
  keepUnfollowable?: boolean;
  /**
   * Whether a bass line over a followed chart takes the colors its chords
   * don't name from the chart's key (`keyedInterval`), as the parts beside
   * it do. Default yes; the console's editors say no, so a line walks there
   * as lessons walk it.
   */
  bassLinesInKey?: boolean;
}

/**
 * One layer's notes over the chart, unswung (the caller swings, as lessons
 * do), or null when its item cannot be found (a draft, a deleted file) or
 * cannot play over it: a part asked to follow the chords that names none
 * (unless `keepUnfollowable`).
 */
export function realizeLayer(
  layer: BandLayer,
  items: BandItems,
  ctx: RealizeContext,
  options: RealizeOptions = {},
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
      // Over a chart it wasn't written for, a line plays in the chart's key,
      // as the parts beside it do.
      return line
        ? pairedBassNotes(
            line,
            ctx.chordAt,
            ctx.bars,
            ctx.timeSignature,
            ctx.genre,
            ctx.followChords && options.bassLinesInKey !== false
              ? keyNotes(ctx.followChords)
              : undefined,
            ctx.approachKey ??
              (ctx.followChords ? keyNotes(ctx.followChords) : undefined),
          )
        : null;
    }
    case 'comping': {
      const pattern = items.comping(source.id);
      return pattern
        ? realizeComping(pattern, ctx.chordAt, ctx.bars, ctx.timeSignature, {
            approachKey:
              ctx.approachKey ??
              (ctx.followChords ? keyNotes(ctx.followChords) : undefined),
          })
        : null;
    }
    case 'part': {
      const part = items.part(source.id);
      if (!part) return null;
      // Over a chart it wasn't captured over, a part follows its chords; a
      // melody keeps its tune and drums their hits.
      if (ctx.followChords && followsChords(part)) {
        const followed = followedNotes(part, ctx, ctx.followChords);
        if (followed || !options.keepUnfollowable) return followed;
      }
      return partNotes(part, ctx, options.tonic ?? ctx.followChords?.tonic);
    }
  }
}

/** Every playing layer's notes, in the band's order. */
export function realizeBand(
  band: { layers: readonly BandLayer[] },
  items: BandItems,
  ctx: RealizeContext,
  options: RealizeOptions & { includeMuted?: boolean } = {},
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
