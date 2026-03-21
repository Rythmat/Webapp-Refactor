/**
 * Windowed Key Detection — Tonal Region Segmentation.
 *
 * Slides a window across the timeline, runs key detection per window,
 * and segments the piece into tonal regions where the key center changes.
 *
 * Algorithm:
 *   1. Slide window across events (configurable size and hop)
 *   2. Run detectKey on events within each window
 *   3. When detected key differs from primary with sufficient confidence → new region
 *   4. Merge short adjacent same-key regions
 *   5. Classify: "modulation" (≥4 bars, high confidence) or "tonicization" (shorter)
 */

import type { MidiNoteEvent } from '@/daw/prism-engine/types';
import type {
  KeyDetection,
  TonalRegion,
  UnisonChordRegion,
} from '../types/schema';
import { detectKey } from './keyDetector';

// ── Config ───────────────────────────────────────────────────────────────────

export interface TonalRegionConfig {
  /** Window size in ticks. Default: 7680 (4 bars at 480 PPQ). */
  windowSizeTicks: number;
  /** Hop size in ticks. Default: 1920 (1 bar). */
  hopSizeTicks: number;
  /** Minimum region length in ticks. Default: 3840 (2 bars). */
  minRegionLengthTicks: number;
  /** Minimum confidence for a window detection to be considered. Default: 0.6. */
  confidenceThreshold: number;
  /** Minimum confidence difference to declare a key change. Default: 0.15. */
  changeThreshold: number;
}

const DEFAULT_CONFIG: TonalRegionConfig = {
  windowSizeTicks: 7680,
  hopSizeTicks: 1920,
  minRegionLengthTicks: 3840,
  confidenceThreshold: 0.6,
  changeThreshold: 0.15,
};

// ── Core ─────────────────────────────────────────────────────────────────────

/**
 * Detect tonal regions by running windowed key detection.
 *
 * @param events - All MIDI note events in the piece
 * @param chordTimeline - Enriched chord regions (used for chord index mapping)
 * @param primaryKey - The primary key detected for the whole piece
 * @param config - Optional configuration overrides
 */
export function detectTonalRegions(
  events: MidiNoteEvent[],
  chordTimeline: UnisonChordRegion[],
  primaryKey: KeyDetection,
  config?: Partial<TonalRegionConfig>,
): TonalRegion[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (events.length === 0) return [];

  // Sort events by start tick
  const sorted = [...events].sort((a, b) => a.startTick - b.startTick);
  const firstTick = sorted[0].startTick;
  const lastTick =
    sorted[sorted.length - 1].startTick +
    sorted[sorted.length - 1].durationTicks;
  const totalDuration = lastTick - firstTick;

  // If piece is shorter than one window, return single primary region
  if (totalDuration <= cfg.windowSizeTicks) {
    return [buildPrimaryRegion(firstTick, lastTick, chordTimeline, primaryKey)];
  }

  // Step 1: Run windowed key detection
  const windowResults = runWindows(sorted, firstTick, lastTick, cfg);

  // Step 2: Segment into raw regions based on key changes
  const rawRegions = segmentRegions(windowResults, primaryKey, cfg);

  // Step 3: Merge short adjacent same-key regions
  const merged = mergeRegions(rawRegions, cfg);

  // Step 4: Map to TonalRegion with chord indices and classification
  return merged.map((r) => classifyRegion(r, chordTimeline, primaryKey, cfg));
}

// ── Window Detection ─────────────────────────────────────────────────────────

interface WindowResult {
  startTick: number;
  endTick: number;
  key: KeyDetection;
}

function runWindows(
  sorted: MidiNoteEvent[],
  firstTick: number,
  lastTick: number,
  cfg: TonalRegionConfig,
): WindowResult[] {
  const results: WindowResult[] = [];

  for (let start = firstTick; start < lastTick; start += cfg.hopSizeTicks) {
    const end = start + cfg.windowSizeTicks;
    const windowEvents = sorted.filter(
      (ev) => ev.startTick >= start && ev.startTick < end,
    );

    if (windowEvents.length < 3) continue; // Need minimum events for meaningful detection

    const key = detectKey(windowEvents);
    if (key.confidence >= cfg.confidenceThreshold) {
      results.push({ startTick: start, endTick: Math.min(end, lastTick), key });
    }
  }

  return results;
}

// ── Segmentation ─────────────────────────────────────────────────────────────

interface RawRegion {
  startTick: number;
  endTick: number;
  rootPc: number;
  mode: string;
  confidence: number;
  key: KeyDetection;
}

function isSameKey(
  a: { rootPc: number; mode: string },
  b: { rootPc: number; mode: string },
): boolean {
  return a.rootPc === b.rootPc && a.mode === b.mode;
}

function segmentRegions(
  windows: WindowResult[],
  _primaryKey: KeyDetection,
  _cfg: TonalRegionConfig,
): RawRegion[] {
  if (windows.length === 0) return [];

  const regions: RawRegion[] = [];
  let currentRoot = windows[0].key.rootPc;
  let currentMode = windows[0].key.mode;
  let regionStart = windows[0].startTick;
  let bestConfidence = windows[0].key.confidence;
  let bestKey = windows[0].key;

  for (let i = 1; i < windows.length; i++) {
    const w = windows[i];

    if (
      !isSameKey(
        { rootPc: currentRoot, mode: currentMode },
        { rootPc: w.key.rootPc, mode: w.key.mode },
      )
    ) {
      // Key changed — close current region
      regions.push({
        startTick: regionStart,
        endTick: w.startTick,
        rootPc: currentRoot,
        mode: currentMode,
        confidence: bestConfidence,
        key: bestKey,
      });
      currentRoot = w.key.rootPc;
      currentMode = w.key.mode;
      regionStart = w.startTick;
      bestConfidence = w.key.confidence;
      bestKey = w.key;
    } else {
      // Same key — update confidence if higher
      if (w.key.confidence > bestConfidence) {
        bestConfidence = w.key.confidence;
        bestKey = w.key;
      }
    }
  }

  // Close final region
  const lastWindow = windows[windows.length - 1];
  regions.push({
    startTick: regionStart,
    endTick: lastWindow.endTick,
    rootPc: currentRoot,
    mode: currentMode,
    confidence: bestConfidence,
    key: bestKey,
  });

  return regions;
}

// ── Merging ──────────────────────────────────────────────────────────────────

function mergeRegions(
  regions: RawRegion[],
  cfg: TonalRegionConfig,
): RawRegion[] {
  if (regions.length <= 1) return regions;

  const merged: RawRegion[] = [regions[0]];

  for (let i = 1; i < regions.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = regions[i];

    const prevDuration = prev.endTick - prev.startTick;
    const currDuration = curr.endTick - curr.startTick;

    // Merge if same key, or if current region is too short
    if (isSameKey(prev, curr) || currDuration < cfg.minRegionLengthTicks) {
      // Absorb into previous region
      prev.endTick = curr.endTick;
      if (curr.confidence > prev.confidence) {
        prev.confidence = curr.confidence;
        prev.key = curr.key;
        // Keep the higher-confidence key's root/mode if merging different keys
        if (!isSameKey(prev, curr) && curr.confidence > prev.confidence) {
          prev.rootPc = curr.rootPc;
          prev.mode = curr.mode;
        }
      }
    } else if (prevDuration < cfg.minRegionLengthTicks) {
      // Previous region too short — absorb into current
      curr.startTick = prev.startTick;
      merged[merged.length - 1] = curr;
    } else {
      merged.push(curr);
    }
  }

  return merged;
}

// ── Classification ───────────────────────────────────────────────────────────

function classifyRegion(
  raw: RawRegion,
  chordTimeline: UnisonChordRegion[],
  primaryKey: KeyDetection,
  cfg: TonalRegionConfig,
): TonalRegion {
  const isPrimary = isSameKey(
    { rootPc: raw.rootPc, mode: raw.mode },
    { rootPc: primaryKey.rootPc, mode: primaryKey.mode },
  );

  const duration = raw.endTick - raw.startTick;
  const isLong = duration >= cfg.windowSizeTicks;

  // Find chord indices that overlap this region
  const startIdx = chordTimeline.findIndex((c) => c.endTick > raw.startTick);
  const endIdx = chordTimeline.findIndex((c) => c.startTick >= raw.endTick);
  const effectiveEndIdx = endIdx < 0 ? chordTimeline.length : endIdx;

  return {
    startTick: raw.startTick,
    endTick: raw.endTick,
    startChordIndex: startIdx >= 0 ? startIdx : 0,
    endChordIndex: effectiveEndIdx,
    key: raw.key,
    type: isPrimary ? 'primary' : isLong ? 'modulation' : 'tonicization',
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildPrimaryRegion(
  startTick: number,
  endTick: number,
  chordTimeline: UnisonChordRegion[],
  primaryKey: KeyDetection,
): TonalRegion {
  return {
    startTick,
    endTick,
    startChordIndex: 0,
    endChordIndex: chordTimeline.length,
    key: primaryKey,
    type: 'primary',
  };
}
