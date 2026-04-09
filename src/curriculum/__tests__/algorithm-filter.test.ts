/**
 * Phase 12 — Vibe & Style Algorithm tests.
 */

import { describe, it, expect } from 'vitest';
import CHORD_PROGRESSION_LIBRARY from '../data/chordProgressionLibrary';
import {
  filterByVibeAndStyle,
  getScalesForContext,
} from '../engine/algorithmFilter';
import { getGenresForMode, getVibesForMode } from '../engine/modeAssociations';
import {
  STYLE_ALGORITHMS,
  filterProgressionsByStyle,
  getModesForStyle,
} from '../engine/styleAlgorithms';
import {
  VIBE_ALGORITHMS,
  filterProgressionsByVibe,
  getModesForVibe,
} from '../engine/vibeAlgorithms';

// ---------------------------------------------------------------------------
// Vibe Algorithms
// ---------------------------------------------------------------------------
describe('vibeAlgorithms', () => {
  it('defines all 16 vibes', () => {
    expect(Object.keys(VIBE_ALGORITHMS)).toHaveLength(16);
  });

  it('every vibe has valid tempo range', () => {
    for (const vibe of Object.values(VIBE_ALGORITHMS)) {
      expect(vibe.tempoRange[0]).toBeLessThan(vibe.tempoRange[1]);
      expect(vibe.tempoRange[0]).toBeGreaterThan(0);
    }
  });

  it('every vibe has at least one applicable mode', () => {
    for (const vibe of Object.values(VIBE_ALGORITHMS)) {
      expect(vibe.applicableModes.length).toBeGreaterThan(0);
    }
  });

  it('filterProgressionsByVibe returns results for common vibes', () => {
    const cool = filterProgressionsByVibe(CHORD_PROGRESSION_LIBRARY, 'cool');
    expect(cool.length).toBeGreaterThan(0);

    const dark = filterProgressionsByVibe(CHORD_PROGRESSION_LIBRARY, 'dark');
    expect(dark.length).toBeGreaterThan(0);
  });

  it('getModesForVibe returns modes', () => {
    const modes = getModesForVibe('sophisticated');
    expect(modes).toContain('lydian');
    expect(modes).toContain('dorian');
  });
});

// ---------------------------------------------------------------------------
// Style Algorithms
// ---------------------------------------------------------------------------
describe('styleAlgorithms', () => {
  it('defines all 14 styles (including folk and blues)', () => {
    expect(Object.keys(STYLE_ALGORITHMS)).toHaveLength(14);
  });

  it('every style has primary modes', () => {
    for (const style of Object.values(STYLE_ALGORITHMS)) {
      expect(style.primaryModes.length).toBeGreaterThan(0);
    }
  });

  it('filterProgressionsByStyle returns results for jazz', () => {
    const jazz = filterProgressionsByStyle(CHORD_PROGRESSION_LIBRARY, 'jazz');
    expect(jazz.length).toBeGreaterThan(0);
  });

  it('getModesForStyle returns primary + secondary', () => {
    const modes = getModesForStyle('jazz');
    expect(modes).toContain('dorian');
    expect(modes).toContain('alteredDominant');
  });
});

// ---------------------------------------------------------------------------
// Combined filtering
// ---------------------------------------------------------------------------
describe('algorithmFilter', () => {
  it('filterByVibeAndStyle narrows results', () => {
    const styleOnly = filterByVibeAndStyle(
      CHORD_PROGRESSION_LIBRARY,
      undefined,
      'jazz',
    );
    const both = filterByVibeAndStyle(
      CHORD_PROGRESSION_LIBRARY,
      'cool',
      'jazz',
    );
    // Combined filter should return equal or fewer results
    expect(both.length).toBeLessThanOrEqual(styleOnly.length);
  });

  it('getScalesForContext returns modes for genre+vibe intersection', () => {
    const modes = getScalesForContext('jazz', 'sophisticated');
    expect(modes.length).toBeGreaterThan(0);
    // Dorian should be in both jazz and sophisticated
    expect(modes).toContain('dorian');
  });

  it('getScalesForContext returns defaults when no context', () => {
    const modes = getScalesForContext();
    expect(modes.length).toBeGreaterThan(0);
    expect(modes).toContain('ionian');
  });
});

// ---------------------------------------------------------------------------
// Mode associations
// ---------------------------------------------------------------------------
describe('modeAssociations', () => {
  it('getGenresForMode finds dorian across many genres', () => {
    const genres = getGenresForMode('dorian');
    expect(genres.length).toBeGreaterThan(3);
    expect(genres).toContain('jazz');
    expect(genres).toContain('funk');
  });

  it('getVibesForMode finds vibes for ionian', () => {
    const vibes = getVibesForMode('ionian');
    expect(vibes.length).toBeGreaterThan(0);
    expect(vibes).toContain('happy');
  });

  it('getGenresForMode returns empty for nonexistent mode', () => {
    const genres = getGenresForMode('superLocrian99');
    expect(genres).toHaveLength(0);
  });
});
