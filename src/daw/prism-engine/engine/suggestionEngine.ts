/**
 * Prism Suggestion Engine — Phases 1-4
 *
 * Analyzes existing chord regions to detect harmonic style (triads vs 7ths),
 * extracts graph seeds from prior chords, and generates multiple alternative
 * chord progression suggestions using the progression graph.
 */

import type { RGB } from '../types';
import { getOptions, getFirstChords, graphToken } from './progression';
import { degreeMidi, unstepChord } from './naming';
import { generateChord, normalizeSequence } from './chordUtils';
import { getChordColor } from './colorSystem';
import { noteNameInKey } from '../data/notes';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ChordStyle {
  triadRatio: number;
  seventhRatio: number;
  extendedRatio: number;
  preferredQualities: string[];
  avgChordsPerMeasure: number;
}

export interface SuggestionChord {
  degree: string; // e.g. "1 major", "5 dominant7"
  quality: string; // e.g. "major", "dominant7"
  noteName: string; // e.g. "C maj", "G dom7"
  midi: number[]; // pitched MIDI note array
  color: RGB;
}

export interface SuggestionSet {
  id: string;
  chords: SuggestionChord[];
  label: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const TRIAD_QUALITIES = new Set([
  'major',
  'minor',
  'augmented',
  'diminished',
  'sus2',
  'sus4',
  'quartal',
  '5',
  'major4',
  'minor4',
  'sus#4',
  'susb2',
  'susb2b5',
  'sus2b5',
  'majorb5',
]);

const SEVENTH_QUALITIES = new Set([
  'dominant7',
  'major7',
  'minor7',
  'diminished7',
  'minor7b5',
  'major7#5',
  'major7b5',
  'minor7#5',
  'minormajor7',
  'dominant7sus2',
  'dominant7sus4',
  'major7sus2',
  'major7sus4',
  'dominant7b5',
  'dominant7#5',
  'dominant7b9',
  'diminishedmajor7',
  'major6',
  'minor6',
]);

// Everything else (9ths, 11ths, 13ths) is extended

const QUALITY_ABBREVIATION: Record<string, string> = {
  major: 'maj',
  minor: 'min',
  augmented: 'aug',
  diminished: 'dim',
  dominant7: 'dom7',
  major7: 'maj7',
  minor7: 'min7',
  diminished7: 'dim7',
  minor7b5: 'min7b5',
  sus2: 'sus2',
  sus4: 'sus4',
  'major7#5': 'maj7#5',
  minormajor7: 'minmaj7',
  dominant9: 'dom9',
  major9: 'maj9',
  minor9: 'min9',
  dominant13: 'dom13',
  major13: 'maj13',
  minor13: 'min13',
};

// ── Phase 1: Style Analyzer ────────────────────────────────────────────────

interface ChordRegionLike {
  startTick: number;
  endTick: number;
  name: string;
  noteName: string;
}

function classifyQuality(quality: string): 'triad' | 'seventh' | 'extended' {
  if (TRIAD_QUALITIES.has(quality)) return 'triad';
  if (SEVENTH_QUALITIES.has(quality)) return 'seventh';
  return 'extended';
}

export function analyzeChordStyle(regions: ChordRegionLike[]): ChordStyle {
  if (regions.length === 0) {
    return {
      triadRatio: 1,
      seventhRatio: 0,
      extendedRatio: 0,
      preferredQualities: ['major', 'minor'],
      avgChordsPerMeasure: 1,
    };
  }

  let triads = 0;
  let sevenths = 0;
  let extended = 0;
  const qualityCounts = new Map<string, number>();

  for (const region of regions) {
    const quality = unstepChord(region.name);
    const category = classifyQuality(quality);
    if (category === 'triad') triads++;
    else if (category === 'seventh') sevenths++;
    else extended++;

    qualityCounts.set(quality, (qualityCounts.get(quality) ?? 0) + 1);
  }

  const total = regions.length;
  const tickSpan = regions[regions.length - 1].endTick - regions[0].startTick;
  const measures = Math.max(1, tickSpan / 1920);

  const sorted = [...qualityCounts.entries()].sort((a, b) => b[1] - a[1]);

  return {
    triadRatio: triads / total,
    seventhRatio: sevenths / total,
    extendedRatio: extended / total,
    preferredQualities: sorted.slice(0, 5).map(([q]) => q),
    avgChordsPerMeasure: Math.round((total / measures) * 10) / 10,
  };
}

// ── Phase 2: Chord Context Extractor ───────────────────────────────────────

export function extractGraphSeed(
  regions: ChordRegionLike[],
  beforeTick: number,
  _rootNote: number,
  _mode: string,
): string[] {
  // Filter regions that end before the insertion point
  const prior = regions.filter((r) => r.endTick <= beforeTick);
  if (prior.length === 0) return [];

  // Take last 3 chords max (graph supports up to ~3-deep keys)
  const recent = prior.slice(-3);

  // The region.name is already a degree-qualified string (e.g. "1 maj", "5 dom7")
  // But it may use abbreviated form — need to expand to full graph key format
  // The graph uses full names: "1 major", "2 minor", "5 dominant7"
  // The region.name uses abbreviated: "1 maj", "2 min", "5 dom7"
  // We need to use degreeKey if available, otherwise try to reconstruct

  const seed: string[] = [];
  for (const r of recent) {
    // If degreeKey is available, use it directly (it's in graph format)
    if ('degreeKey' in r && (r as { degreeKey?: string }).degreeKey) {
      seed.push((r as { degreeKey?: string }).degreeKey!);
      continue;
    }

    // Try to reconstruct: parse the note name and compute degree
    // The region.name may be like "1 maj" — expand abbreviations
    const expanded = r.name
      .replace(/\bmaj\b/, 'major')
      .replace(/\bmin\b/, 'minor')
      .replace(/\bdom\b/, 'dominant')
      .replace(/\bdim\b/, 'diminished')
      .replace(/\baug\b/, 'augmented');
    seed.push(expanded);
  }

  // Try the full sequence as a graph key; if not found, shorten
  for (let len = seed.length; len > 0; len--) {
    const attempt = seed.slice(seed.length - len);
    const token = graphToken(attempt);
    const options = getOptions(2, token); // percent > 1 = get all
    if (options.length > 0) return attempt;
  }

  return [];
}

// ── Phase 4: Style-Aware Filtering ─────────────────────────────────────────

export function filterByStyle(options: string[], style: ChordStyle): string[] {
  if (options.length === 0) return options;

  const scored = options.map((opt) => {
    const quality = unstepChord(opt);
    const category = classifyQuality(quality);
    let score = 0;

    if (category === 'triad') score = style.triadRatio;
    else if (category === 'seventh') score = style.seventhRatio;
    else score = style.extendedRatio;

    // Boost if it's a preferred quality
    if (style.preferredQualities.includes(quality)) score += 0.3;

    return { opt, score };
  });

  // Sort by score descending, preserving order for ties
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.opt);
}

// ── Phase 3: Multi-Progression Generator ───────────────────────────────────

function abbreviateQuality(quality: string): string {
  return QUALITY_ABBREVIATION[quality] ?? quality;
}

function degreeToNoteName(
  degreeName: string,
  rootMidi: number,
  _mode: string,
): string {
  const quality = unstepChord(degreeName);
  const midi = degreeMidi(rootMidi, degreeName);
  const pc = ((midi % 12) + 12) % 12;
  const noteLetter = noteNameInKey(pc, rootMidi % 12);
  return `${noteLetter} ${abbreviateQuality(quality)}`;
}

function degreeNameToChord(
  degreeName: string,
  rootMidi: number,
  _mode: string,
): number[] {
  const quality = unstepChord(degreeName);
  const midi = degreeMidi(rootMidi, degreeName);
  // For non-ionian diatonic modes, the degreeMidi is relative to the mode root
  return generateChord(midi, quality);
}

function walkGraph(
  seed: string[],
  numChords: number,
  style: ChordStyle,
  pickStrategy: (options: string[], step: number) => string | null,
): string[] {
  const result: string[] = [];
  let history = [...seed];

  for (let i = 0; i < numChords; i++) {
    const token = graphToken(history);
    let options = getOptions(2, token); // get all options

    // If no options with full history, try shorter history
    if (options.length === 0) {
      for (let len = history.length - 1; len > 0; len--) {
        const shorter = history.slice(history.length - len);
        options = getOptions(2, graphToken(shorter));
        if (options.length > 0) break;
      }
    }

    // Still no options — try first chords
    if (options.length === 0) {
      options = getFirstChords();
    }

    // Apply style filtering
    const filtered = filterByStyle(options, style);
    const pick = pickStrategy(filtered, i);
    if (!pick) break;

    result.push(pick);
    history = [...history, pick];
    // Keep history to max 3 for graph lookups
    if (history.length > 3) history = history.slice(-3);
  }

  return result;
}

export function generateSuggestions(
  seed: string[],
  rootNote: number,
  mode: string,
  style: ChordStyle,
  measuresToFill: number,
  count: number = 5,
): SuggestionSet[] {
  const chordsPerMeasure = Math.max(1, Math.round(style.avgChordsPerMeasure));
  const numChords = measuresToFill * chordsPerMeasure;
  const rootMidi = (rootNote ?? 0) + 48; // Middle octave

  const results: SuggestionSet[] = [];
  const labels = [
    'Most Common',
    'Variation A',
    'Variation B',
    'Adventurous',
    'Wild Card',
  ];

  // Strategy 2-N: Pick nth option, or weighted random
  const strategies: ((opts: string[], step: number) => string | null)[] = [
    // Strategy 1: top
    (opts) => opts[0] ?? null,
    // Strategy 2: 2nd option
    (opts) => opts[Math.min(1, opts.length - 1)] ?? null,
    // Strategy 3: 3rd option
    (opts) => opts[Math.min(2, opts.length - 1)] ?? null,
    // Strategy 4: weighted random from top half
    (opts) => {
      const pool = opts.slice(0, Math.max(1, Math.ceil(opts.length / 2)));
      return pool[Math.floor(Math.random() * pool.length)] ?? null;
    },
    // Strategy 5: full random
    (opts) => opts[Math.floor(Math.random() * opts.length)] ?? null,
  ];

  for (let i = 0; i < count; i++) {
    const strategy = strategies[Math.min(i, strategies.length - 1)];
    const degrees = walkGraph(seed, numChords, style, strategy);

    // Convert degrees to full chord data
    const midiArrays = degrees.map((d) => degreeNameToChord(d, rootMidi, mode));
    const normalized = normalizeSequence(midiArrays);

    const chords: SuggestionChord[] = degrees.map((degree, j) => ({
      degree,
      quality: unstepChord(degree),
      noteName: degreeToNoteName(degree, rootMidi, mode),
      midi: normalized[j],
      color: getChordColor(degree, rootMidi, mode) as RGB,
    }));

    results.push({
      id: `suggestion-${i}-${Date.now()}`,
      chords,
      label: labels[i] ?? `Variation ${i + 1}`,
    });
  }

  // Deduplicate — remove sets identical to the first
  const seen = new Set<string>();
  const deduped: SuggestionSet[] = [];
  for (const set of results) {
    const key = set.chords.map((c) => c.degree).join('|');
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(set);
    }
  }

  return deduped;
}
