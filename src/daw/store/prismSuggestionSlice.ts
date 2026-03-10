/**
 * Prism Suggestion Slice — Phases 5-6, 16, 19
 *
 * Zustand state for the Prism chord suggestion workflow:
 * open/close modal, generate suggestions, cycle alternatives, commit to timeline.
 */

import type { StateCreator } from 'zustand';
import type { AllSlices } from './index';
import {
  analyzeChordStyle,
  extractGraphSeed,
  generateSuggestions,
  type ChordStyle,
  type SuggestionSet,
} from '@/daw/prism-engine/engine/suggestionEngine';

// ── Types ──────────────────────────────────────────────────────────────────

export interface PrismSuggestionSlice {
  // State
  prismSuggestOpen: boolean;
  prismSuggestInsertTick: number;
  prismSuggestTrackId: string | null;
  prismSuggestMeasures: number;
  prismSuggestSets: SuggestionSet[];
  prismSuggestActiveIdx: number;
  prismSuggestPreviewPlaying: boolean;
  prismSuggestStyle: ChordStyle | null;

  // Actions
  openPrismSuggestion: (tick: number, trackId: string) => void;
  closePrismSuggestion: () => void;
  nextPrismSuggestion: () => void;
  prevPrismSuggestion: () => void;
  setPrismSuggestMeasures: (n: number) => void;
  commitPrismSuggestion: () => void;
  regeneratePrismSuggestions: () => void;
  setPrismSuggestPreviewPlaying: (playing: boolean) => void;
}

// ── Slice ──────────────────────────────────────────────────────────────────

export const createPrismSuggestionSlice: StateCreator<
  AllSlices,
  [],
  [],
  PrismSuggestionSlice
> = (set, get) => ({
  // Initial state
  prismSuggestOpen: false,
  prismSuggestInsertTick: 0,
  prismSuggestTrackId: null,
  prismSuggestMeasures: 4,
  prismSuggestSets: [],
  prismSuggestActiveIdx: 0,
  prismSuggestPreviewPlaying: false,
  prismSuggestStyle: null,

  openPrismSuggestion: (tick, trackId) => {
    const state = get();
    const rootNote = state.rootNote;
    const mode = state.mode;
    const regions = state.chordRegions;

    // Analyze existing chord style
    const style = analyzeChordStyle(regions);

    // Extract seed from chords before insertion point
    const seed = extractGraphSeed(regions, tick, rootNote ?? 0, mode);

    // Generate suggestion sets
    const suggestions = generateSuggestions(
      seed,
      rootNote ?? 0,
      mode,
      style,
      4, // default 4 measures
    );

    set({
      prismSuggestOpen: true,
      prismSuggestInsertTick: tick,
      prismSuggestTrackId: trackId,
      prismSuggestMeasures: 4,
      prismSuggestSets: suggestions,
      prismSuggestActiveIdx: 0,
      prismSuggestPreviewPlaying: false,
      prismSuggestStyle: style,
    });
  },

  closePrismSuggestion: () => {
    set({
      prismSuggestOpen: false,
      prismSuggestSets: [],
      prismSuggestActiveIdx: 0,
      prismSuggestPreviewPlaying: false,
      prismSuggestStyle: null,
    });
  },

  nextPrismSuggestion: () => {
    const { prismSuggestSets, prismSuggestActiveIdx } = get();
    if (prismSuggestSets.length === 0) return;
    set({
      prismSuggestActiveIdx:
        (prismSuggestActiveIdx + 1) % prismSuggestSets.length,
      prismSuggestPreviewPlaying: false,
    });
  },

  prevPrismSuggestion: () => {
    const { prismSuggestSets, prismSuggestActiveIdx } = get();
    if (prismSuggestSets.length === 0) return;
    set({
      prismSuggestActiveIdx:
        (prismSuggestActiveIdx - 1 + prismSuggestSets.length) %
        prismSuggestSets.length,
      prismSuggestPreviewPlaying: false,
    });
  },

  setPrismSuggestMeasures: (n) => {
    const state = get();
    const seed = extractGraphSeed(
      state.chordRegions,
      state.prismSuggestInsertTick,
      state.rootNote ?? 0,
      state.mode,
    );
    const style =
      state.prismSuggestStyle ?? analyzeChordStyle(state.chordRegions);
    const suggestions = generateSuggestions(
      seed,
      state.rootNote ?? 0,
      state.mode,
      style,
      n,
    );
    set({
      prismSuggestMeasures: n,
      prismSuggestSets: suggestions,
      prismSuggestActiveIdx: 0,
      prismSuggestPreviewPlaying: false,
    });
  },

  commitPrismSuggestion: () => {
    const {
      prismSuggestSets,
      prismSuggestActiveIdx,
      prismSuggestInsertTick,
      prismSuggestMeasures,
      chordRegions,
    } = get();

    const suggestion = prismSuggestSets[prismSuggestActiveIdx];
    if (!suggestion || suggestion.chords.length === 0) return;

    const ticksPerMeasure = 1920;
    const totalTicks = prismSuggestMeasures * ticksPerMeasure;
    const ticksPerChord = totalTicks / suggestion.chords.length;
    const insertEnd = prismSuggestInsertTick + totalTicks;

    const newRegions = suggestion.chords.map((chord, i) => ({
      id: crypto.randomUUID(),
      startTick: prismSuggestInsertTick + i * ticksPerChord,
      endTick: prismSuggestInsertTick + (i + 1) * ticksPerChord,
      name: chord.noteName,
      noteName: chord.noteName,
      color: chord.color as [number, number, number],
      degreeKey: chord.degree,
    }));

    // Merge: keep regions outside the insertion range
    const kept = chordRegions.filter(
      (r) => r.endTick <= prismSuggestInsertTick || r.startTick >= insertEnd,
    );

    const merged = [...kept, ...newRegions].sort(
      (a, b) => a.startTick - b.startTick,
    );

    set({ chordRegions: merged });
    get().closePrismSuggestion();
  },

  regeneratePrismSuggestions: () => {
    const state = get();
    const seed = extractGraphSeed(
      state.chordRegions,
      state.prismSuggestInsertTick,
      state.rootNote ?? 0,
      state.mode,
    );
    const style =
      state.prismSuggestStyle ?? analyzeChordStyle(state.chordRegions);
    const suggestions = generateSuggestions(
      seed,
      state.rootNote ?? 0,
      state.mode,
      style,
      state.prismSuggestMeasures,
    );
    set({
      prismSuggestSets: suggestions,
      prismSuggestActiveIdx: 0,
      prismSuggestPreviewPlaying: false,
    });
  },

  setPrismSuggestPreviewPlaying: (playing) => {
    set({ prismSuggestPreviewPlaying: playing });
  },
});
