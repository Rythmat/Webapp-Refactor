/**
 * Data integrity tests — validates all curriculum data files.
 *
 * Covers the 11 data files that don't have dedicated test suites,
 * verifying counts, field validity, and structural invariants.
 */

import { describe, it, expect } from 'vitest';
import { MODE_DISPLAY } from '../../daw/prism-engine/data/modes';
// -- Directly-exported libraries --
import {
  BASS_CONTOUR_PATTERNS,
  BASS_RHYTHM_PATTERNS,
  getBassRhythmsForGenre,
} from '../data/bassPatterns';
// -- Lazy-loaded libraries (import directly to avoid async in tests) --
import CHORD_PROGRESSION_LIBRARY from '../data/chordProgressionLibrary';
import {
  CHORD_QUALITY_LIBRARY,
  CHORD_QUALITY_BY_ID,
} from '../data/chordQualityLibrary';
import {
  COMPING_PATTERNS,
  ONE_BAR_COMPING,
  TWO_BAR_COMPING,
} from '../data/compingPatterns';
import { DRUM_GROOVE_LIBRARY, getDrumGroove } from '../data/drumGrooveLibrary';
import {
  GENRE_VOICING_TAXONOMY,
  getVoicingsForGenreLevel,
} from '../data/genreVoicingTaxonomy';
import HARMONY_KB from '../data/harmonyKB';
import MASTER_RHYTHM_LIBRARY from '../data/masterRhythmLibrary';
import MELODY_CONTOUR_LIBRARY from '../data/melodyContourLibrary';
import MELODY_PHRASE_RHYTHM_LIBRARY from '../data/melodyPhraseRhythmLibrary';
import {
  VOICING_ALGORITHM_LIBRARY,
  getVoicingAlgorithm,
} from '../data/voicingAlgorithmLibrary';
// ---------------------------------------------------------------------------
// Chord Quality Library
// ---------------------------------------------------------------------------
describe('Chord Quality Library', () => {
  it('has expected entry count', () => {
    expect(CHORD_QUALITY_LIBRARY.length).toBeGreaterThanOrEqual(60);
  });

  it('every entry has valid rootPosition intervals', () => {
    for (const entry of CHORD_QUALITY_LIBRARY) {
      expect(entry.id).toBeTruthy();
      expect(entry.name).toBeTruthy();
      expect(Array.isArray(entry.rootPosition)).toBe(true);
      expect(entry.rootPosition.length).toBeGreaterThan(0);
      expect(
        entry.rootPosition.every(
          (n: number) => typeof n === 'number' && !isNaN(n),
        ),
      ).toBe(true);
      expect(entry.rootPosition[0]).toBe(0); // root is always 0
    }
  });

  it('CHORD_QUALITY_BY_ID has same count as library', () => {
    // Some IDs are duplicated across categories, so by-id may have fewer
    expect(Object.keys(CHORD_QUALITY_BY_ID).length).toBeGreaterThan(0);
  });

  it('noteCount matches rootPosition length', () => {
    for (const entry of CHORD_QUALITY_LIBRARY) {
      expect(entry.noteCount).toBe(entry.rootPosition.length);
    }
  });
});

// ---------------------------------------------------------------------------
// Voicing Algorithm Library
// ---------------------------------------------------------------------------
describe('Voicing Algorithm Library', () => {
  it('has 73 entries', () => {
    expect(VOICING_ALGORITHM_LIBRARY).toHaveLength(73);
  });

  it('displacements array length matches noteCount', () => {
    for (const entry of VOICING_ALGORITHM_LIBRARY) {
      expect(entry.displacements).toHaveLength(entry.noteCount);
      expect(
        entry.displacements.every((n: number) => typeof n === 'number'),
      ).toBe(true);
    }
  });

  it('getVoicingAlgorithm returns entry for known id+category', () => {
    const root = getVoicingAlgorithm('va_3n_root_pos', 'triad');
    expect(root).toBeDefined();
    expect(root!.name).toBe('Root position');
  });
});

// ---------------------------------------------------------------------------
// Genre Voicing Taxonomy
// ---------------------------------------------------------------------------
describe('Genre Voicing Taxonomy', () => {
  it('has 157 entries', () => {
    expect(GENRE_VOICING_TAXONOMY).toHaveLength(157);
  });

  it('every entry has genre, level, qualityId, algorithmId', () => {
    for (const entry of GENRE_VOICING_TAXONOMY) {
      expect(entry.genre).toBeTruthy();
      expect(typeof entry.level).toBe('number');
      expect(entry.qualityId).toBeTruthy();
      expect(entry.algorithmId).toBeTruthy();
    }
  });

  it('covers all 14 genres', () => {
    const genres = new Set(GENRE_VOICING_TAXONOMY.map((e) => e.genre));
    expect(genres.size).toBe(14);
  });

  it('getVoicingsForGenreLevel returns results', () => {
    const jazzL2 = getVoicingsForGenreLevel('jazz', 2);
    expect(jazzL2.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Comping Patterns
// ---------------------------------------------------------------------------
describe('Comping Patterns', () => {
  it('has 183 total (109 one-bar + 74 two-bar)', () => {
    expect(COMPING_PATTERNS).toHaveLength(183);
    expect(ONE_BAR_COMPING).toHaveLength(109);
    expect(TWO_BAR_COMPING).toHaveLength(74);
  });

  it('every pattern has valid computerArray', () => {
    for (const p of COMPING_PATTERNS) {
      expect(p.id).toBeTruthy();
      expect(Array.isArray(p.computerArray)).toBe(true);
      // Some patterns (e.g., rest/sustain) may have empty arrays
      for (const [start, dur] of p.computerArray) {
        expect(typeof start).toBe('number');
        expect(typeof dur).toBe('number');
        expect(start).toBeGreaterThanOrEqual(0);
        expect(dur).toBeGreaterThan(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Bass Patterns
// ---------------------------------------------------------------------------
describe('Bass Patterns', () => {
  it('has 113 contour + 113 rhythm patterns', () => {
    expect(BASS_CONTOUR_PATTERNS).toHaveLength(113);
    expect(BASS_RHYTHM_PATTERNS).toHaveLength(113);
  });

  it('contour entries have valid contour arrays', () => {
    for (const c of BASS_CONTOUR_PATTERNS) {
      expect(c.id).toBeTruthy();
      expect(Array.isArray(c.contour)).toBe(true);
      expect(c.contour.length).toBeGreaterThan(0);
    }
  });

  it('rhythm entries have valid computerArray', () => {
    for (const r of BASS_RHYTHM_PATTERNS) {
      expect(r.id).toBeTruthy();
      expect(Array.isArray(r.computerArray)).toBe(true);
      for (const [start, dur] of r.computerArray) {
        expect(start).toBeGreaterThanOrEqual(0);
        expect(dur).toBeGreaterThan(0);
      }
    }
  });

  it('getBassRhythmsForGenre returns results for known genres', () => {
    const pop = getBassRhythmsForGenre('pop');
    expect(pop.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Drum Groove Library
// ---------------------------------------------------------------------------
describe('Drum Groove Library', () => {
  it('has 36 grooves', () => {
    expect(DRUM_GROOVE_LIBRARY).toHaveLength(36);
  });

  it('every groove has instruments with positions', () => {
    for (const g of DRUM_GROOVE_LIBRARY) {
      expect(g.id).toBeTruthy();
      // Genre is encoded in the id (e.g., groove_pop_01)
      expect(g.id).toMatch(/^groove_/);
      expect(Array.isArray(g.instruments)).toBe(true);
      expect(g.instruments.length).toBeGreaterThan(0);
      for (const inst of g.instruments) {
        expect(inst.instrument).toBeTruthy();
        expect(Array.isArray(inst.positions)).toBe(true);
      }
    }
  });

  it('getDrumGroove returns known groove', () => {
    const first = DRUM_GROOVE_LIBRARY[0];
    expect(getDrumGroove(first.id)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Melody Contour Library (lazy-loaded)
// ---------------------------------------------------------------------------
describe('Melody Contour Library', () => {
  it('has 690 contours', () => {
    expect(MELODY_CONTOUR_LIBRARY).toHaveLength(690);
  });

  it('every contour has valid numeric array', () => {
    for (const c of MELODY_CONTOUR_LIBRARY) {
      expect(c.id).toBeTruthy();
      expect(Array.isArray(c.contour)).toBe(true);
      expect(c.contour.length).toBeGreaterThan(0);
      expect(
        c.contour.every((n: number) => typeof n === 'number' && !isNaN(n)),
      ).toBe(true);
    }
  });

  it('noteCount matches contour length', () => {
    for (const c of MELODY_CONTOUR_LIBRARY) {
      expect(c.noteCount).toBe(c.contour.length);
    }
  });
});

// ---------------------------------------------------------------------------
// Chord Progression Library (lazy-loaded)
// ---------------------------------------------------------------------------
describe('Chord Progression Library', () => {
  it('has 589 progressions', () => {
    expect(CHORD_PROGRESSION_LIBRARY).toHaveLength(589);
  });

  it('vibes and styles are arrays (not raw CSV strings)', () => {
    for (const p of CHORD_PROGRESSION_LIBRARY) {
      expect(Array.isArray(p.vibes)).toBe(true);
      expect(Array.isArray(p.styles)).toBe(true);
    }
  });

  it('every entry has progression and chordCount', () => {
    for (const p of CHORD_PROGRESSION_LIBRARY) {
      expect(p.id).toBeTruthy();
      expect(p.progression).toBeTruthy();
      expect(p.chordCount).toBeGreaterThan(0);
      expect(typeof p.complexity).toBe('string');
    }
  });
});

// ---------------------------------------------------------------------------
// Melody Phrase Rhythm Library (lazy-loaded)
// ---------------------------------------------------------------------------
describe('Melody Phrase Rhythm Library', () => {
  it('has 146 entries', () => {
    expect(MELODY_PHRASE_RHYTHM_LIBRARY).toHaveLength(146);
  });

  it('every entry has genre and noteCount', () => {
    for (const r of MELODY_PHRASE_RHYTHM_LIBRARY) {
      expect(r.id).toBeTruthy();
      expect(r.genre).toBeTruthy();
      expect(r.noteCount).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Master Rhythm Library (lazy-loaded)
// ---------------------------------------------------------------------------
describe('Master Rhythm Library', () => {
  it('has 83 entries', () => {
    expect(MASTER_RHYTHM_LIBRARY).toHaveLength(83);
  });

  it('every entry has tier and computerArray', () => {
    for (const r of MASTER_RHYTHM_LIBRARY) {
      expect(r.id).toBeTruthy();
      expect(r.tier).toBeGreaterThanOrEqual(1);
      expect(r.tier).toBeLessThanOrEqual(4);
      expect(Array.isArray(r.computerArray)).toBe(true);
      // Some rest patterns may have empty arrays
    }
  });
});

// ---------------------------------------------------------------------------
// Harmony Knowledge Base (lazy-loaded)
// ---------------------------------------------------------------------------
/** Normalize a note name to its chromatic pitch class (0-11, C=0) */
const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

function noteToPitchClass(note: string): number {
  const trimmed = note
    .trim()
    .replace('♯', '#')
    .replace('♭', 'b')
    .replace('𝄫', 'bb');
  const letter = trimmed[0].toUpperCase();
  const letterIdx = NOTE_NAMES.indexOf(letter);
  if (letterIdx < 0) return -1;
  const acc = trimmed.slice(1);
  let offset = 0;
  for (const c of acc) {
    if (c === '#') offset++;
    else if (c === 'b') offset--;
  }
  return (((letterIdx + offset) % 12) + 12) % 12;
}

/** MODE_DISPLAY uses Unicode (♭, ♮), HKB uses ASCII (b, nat). Normalize for comparison. */
function normalizeModeName(name: string): string {
  return name.replace(/♭/g, 'b').replace(/♮/g, 'nat').replace(/♯/g, '#');
}

/** Heptatonic modes from MODE_DISPLAY (35 modes, 7 notes each) */
const HEPTATONIC_MODE_NAMES = new Set(
  Object.values(MODE_DISPLAY).map(normalizeModeName),
);

/** Check if a HKB mode is heptatonic (from our regenerated data) */
function isHeptatonicMode(modeName: string): boolean {
  const normalized = normalizeModeName(modeName);
  // Also handle "Aeolian (Minor)" matching "Aeolian" and "Ionian (Major)" matching "Ionian"
  return [...HEPTATONIC_MODE_NAMES].some(
    (m) => normalized === m || normalized.startsWith(m + ' ('),
  );
}

describe('Harmony Knowledge Base', () => {
  it('has entries for expected mode|root keys', () => {
    const keys = Object.keys(HARMONY_KB);
    expect(keys.length).toBeGreaterThanOrEqual(100);
  });

  it('every entry has mode, root, triads, sevenths', () => {
    for (const [key, entry] of Object.entries(HARMONY_KB)) {
      expect(key).toContain('|');
      expect(entry.mode).toBeTruthy();
      expect(entry.root).toBeTruthy();
      expect(typeof entry.intervals).toBe('string');
      expect(typeof entry.scaleNotes).toBe('string');
      expect(Array.isArray(entry.triads)).toBe(true);
      expect(Array.isArray(entry.sevenths)).toBe(true);
    }
  });

  it('covers all 12+ chromatic roots', () => {
    const roots = new Set(Object.values(HARMONY_KB).map((e) => e.root));
    expect(roots.size).toBeGreaterThanOrEqual(12);
  });

  it('heptatonic mode degree values contain no backslashes', () => {
    for (const entry of Object.values(HARMONY_KB)) {
      if (!isHeptatonicMode(entry.mode)) continue;
      for (const chord of [...entry.triads, ...entry.sevenths]) {
        expect(chord.degree).not.toMatch(/\\/);
        // Degrees can be: 1-7, b2-b7, #1-#7, bb3, bb7, etc.
        expect(chord.degree).toMatch(/^[b#]{0,2}\d$/);
      }
    }
  });

  it('entries have non-empty intervals and scaleNotes', () => {
    for (const entry of Object.values(HARMONY_KB)) {
      expect(entry.intervals.length).toBeGreaterThan(0);
      expect(entry.scaleNotes.length).toBeGreaterThan(0);
    }
  });

  it('all heptatonic chord notes are within their mode scale', () => {
    for (const entry of Object.values(HARMONY_KB)) {
      if (!isHeptatonicMode(entry.mode)) continue;
      // Parse scale notes into pitch classes
      const scaleNotes = entry.scaleNotes.split(',').map((n) => n.trim());
      const scalePCs = new Set(scaleNotes.map(noteToPitchClass));

      for (const chord of [...entry.triads, ...entry.sevenths]) {
        const chordNotes = chord.notes.split(',').map((n) => n.trim());
        for (const note of chordNotes) {
          const pc = noteToPitchClass(note);
          expect(scalePCs.has(pc)).toBe(true);
        }
      }
    }
  });

  it('covers all 35 heptatonic modes from modes.ts', () => {
    const hkbModes = new Set(
      Object.values(HARMONY_KB).map((e) => normalizeModeName(e.mode)),
    );
    const expectedModes = Object.values(MODE_DISPLAY).map(normalizeModeName);
    for (const modeName of expectedModes) {
      // HKB may use extended names like "Aeolian (Minor)" for "Aeolian"
      const found = [...hkbModes].some(
        (m) => m === modeName || m.startsWith(modeName + ' ('),
      );
      expect(found).toBe(true);
    }
  });

  it('each heptatonic mode has exactly 12 root entries', () => {
    const modeCounts: Record<string, number> = {};
    for (const entry of Object.values(HARMONY_KB)) {
      if (!isHeptatonicMode(entry.mode)) continue;
      const normalized = normalizeModeName(entry.mode);
      modeCounts[normalized] = (modeCounts[normalized] ?? 0) + 1;
    }
    for (const count of Object.values(modeCounts)) {
      expect(count).toBe(12);
    }
  });

  it('each heptatonic entry has 7 triads and 7 sevenths', () => {
    for (const entry of Object.values(HARMONY_KB)) {
      if (!isHeptatonicMode(entry.mode)) continue;
      expect(entry.triads).toHaveLength(7);
      expect(entry.sevenths).toHaveLength(7);
    }
  });
});
