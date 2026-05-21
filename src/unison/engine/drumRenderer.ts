/**
 * Phase 4 — Drum renderer.
 *
 * The Music Atlas Studio already ships a complete drum subsystem
 * (DrumMachineEngine, DRUM_PATTERNS, generateDrumMidi) that turns a genre
 * name + swing into playable MIDI events on the GM percussion channel.
 * Rather than re-author the same patterns in the UNISON tree, this renderer
 * is a thin adapter: it calls `generateDrumMidi` and wraps the result in
 * a `UnisonTrack` shaped for `UnisonDocument`.
 *
 * Bar count defaults to the document's total duration rounded up to the
 * next 4/4 bar (drum patterns are authored in 4/4 at PPQ 480 — 1920 ticks
 * per bar). Documents in non-4/4 still get drums of the right total length;
 * the downbeats may not align with the doc's bar lines.
 */

import { DRUM_PATTERNS } from '@/daw/prism-engine/data/drumPatterns';
import { generateDrumMidi } from '@/daw/prism-engine/engine/drumGenerator';
import { InstrumentChannel, type GenreName } from '@/daw/prism-engine/types';
import type {
  UnisonDocument,
  UnisonNoteEvent,
  UnisonTrack,
} from '../types/schema';

// ── Public API ────────────────────────────────────────────────────────────────

export interface RenderDrumsOptions {
  /** Genre name (e.g. 'Pop', 'Rock', 'Jazz'). Must be a key of DRUM_PATTERNS. */
  genreName: GenreName;
  /** Swing amount 0..1. Applied to hat / ride only. Defaults to 0. */
  swing?: number;
  /** Number of 4/4 bars to render. Defaults to 4 in the low-level API. */
  bars?: number;
  /** MIDI channel for emitted notes. Defaults to GM drum channel (10). */
  channel?: number;
}

/**
 * Render a drum track of note events. The low-level renderer requires an
 * explicit bar count; use `applyDrums` to have it derived from the doc.
 *
 * Returns an empty array when the genre name is not a key of DRUM_PATTERNS,
 * rather than silently falling back to Pop the way generateDrumMidi does.
 */
export function renderDrums(opts: RenderDrumsOptions): UnisonNoteEvent[] {
  if (!isKnownGenre(opts.genreName)) return [];

  const channel = opts.channel ?? InstrumentChannel.Drums;
  const seq = generateDrumMidi({
    rhythmName: opts.genreName,
    swing: opts.swing ?? 0,
    bars: opts.bars ?? 4,
  });

  return seq.events.map((e) => ({
    pitch: e.note,
    velocity: e.velocity,
    startTick: e.startTick,
    durationTicks: e.durationTicks,
    channel,
  }));
}

/**
 * Append a drum track to a UnisonDocument. When `opts.bars` is omitted,
 * the bar count is derived from `doc.metadata.durationTicks` rounded up
 * to the next 4/4 bar (1920 ticks).
 *
 * Returns a new document — input is not mutated.
 */
export function applyDrums(
  doc: UnisonDocument,
  opts: RenderDrumsOptions,
): UnisonDocument {
  const bars = opts.bars ?? computeBars(doc);
  const events = renderDrums({ ...opts, bars });

  const track: UnisonTrack = {
    id: `unison-drums-${opts.genreName}`,
    name: `Drums (${opts.genreName})`,
    channel: opts.channel ?? InstrumentChannel.Drums,
    role: 'drums',
    events,
    ccEvents: [],
  };

  return {
    ...doc,
    tracks: [...doc.tracks, track],
  };
}

/** All genre names with drum patterns defined in DRUM_PATTERNS. */
export function listDrumGenres(): GenreName[] {
  return Object.keys(DRUM_PATTERNS) as GenreName[];
}

// ── Internals ────────────────────────────────────────────────────────────────

const BAR_TICKS_4_4 = 1920;

function isKnownGenre(name: string): name is GenreName {
  return name in DRUM_PATTERNS;
}

function computeBars(doc: UnisonDocument): number {
  if (doc.metadata.durationTicks <= 0) return 1;
  return Math.max(1, Math.ceil(doc.metadata.durationTicks / BAR_TICKS_4_4));
}
