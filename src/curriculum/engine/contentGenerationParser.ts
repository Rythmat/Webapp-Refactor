/**
 * Phase 14 — Content Generation Parser.
 *
 * Translates human-readable `content_generation` field from activity flows
 * into structured query objects that map to pipeline functions.
 *
 * Examples of input strings:
 * - 'Query Chord_Quality_Library.csv for "maj" → get root_position array → arpeggiate in key'
 * - 'Genre_Voicing_Taxonomy → rh_override=[4, -2, 15]. LH=root_bass. Resolve in key.'
 * - 'Genre_Voicing_Taxonomy → Chord_Quality_Library("maj") × Voicing_Algorithm_Library("va_3n_root_pos"). LH=root_bass.'
 * - 'Select from Bass_Contour_Patterns.csv (bass_c_r_01...) + Bass_Rhythm_Patterns.csv (...). Resolve through Major Pentatonic.'
 * - 'For each chord in progression → query Genre_Voicing_Taxonomy for voicing → resolve in key.'
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContentQueryLibrary =
  | 'chordQuality'
  | 'voicingTaxonomy'
  | 'voicingAlgorithm'
  | 'bassContour'
  | 'bassRhythm'
  | 'phraseRhythm'
  | 'melodyContour'
  | 'compingPattern'
  | 'drumGroove'
  | 'progression';

export interface ContentQuery {
  library: ContentQueryLibrary;
  params: Record<string, string | number | string[] | number[]>;
}

export interface ParsedContentGeneration {
  queries: ContentQuery[];
  /** Raw instruction text */
  raw: string;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parse a content_generation string into structured queries.
 * Returns null if the string is empty or unparseable.
 */
export function parseContentGeneration(
  raw: string,
): ParsedContentGeneration | null {
  if (!raw || raw.trim() === '') return null;

  const queries: ContentQuery[] = [];
  const lower = raw.toLowerCase();

  // Pattern: Query Chord_Quality_Library for "xxx"
  const chordQualityMatch = raw.match(/Chord_Quality_Library[^"]*"([^"]+)"/i);
  if (chordQualityMatch) {
    queries.push({
      library: 'chordQuality',
      params: { qualityId: chordQualityMatch[1] },
    });
  }

  // Pattern: Genre_Voicing_Taxonomy → rh_override=[...]
  const rhOverrideMatch = raw.match(/rh_override\s*=\s*\[([^\]]+)\]/i);
  if (rhOverrideMatch) {
    const values = rhOverrideMatch[1].split(',').map((v) => parseInt(v.trim()));
    queries.push({
      library: 'voicingTaxonomy',
      params: { rhOverride: values },
    });
  }

  // Pattern: Genre_Voicing_Taxonomy → Chord_Quality_Library("xxx") × Voicing_Algorithm_Library("yyy")
  const taxonomyMatch = raw.match(
    /Genre_Voicing_Taxonomy.*?Chord_Quality_Library\("([^"]+)"\).*?Voicing_Algorithm_Library\("([^"]+)"\)/i,
  );
  if (taxonomyMatch) {
    queries.push({
      library: 'voicingTaxonomy',
      params: {
        qualityId: taxonomyMatch[1],
        algorithmId: taxonomyMatch[2],
      },
    });
  }

  // Pattern: quality=xxx × algo=yyy
  const qualityAlgoMatch = raw.match(/quality=(\w+)\s*×\s*algo=(\w+)/i);
  if (qualityAlgoMatch) {
    queries.push({
      library: 'voicingTaxonomy',
      params: {
        qualityId: qualityAlgoMatch[1],
        algorithmId: qualityAlgoMatch[2],
      },
    });
  }

  // Pattern: Bass_Contour_Patterns.csv (ids...)
  const bassContourMatch = raw.match(/Bass_Contour_Patterns[^(]*\(([^)]+)\)/i);
  if (bassContourMatch) {
    const ids = extractIds(bassContourMatch[1]);
    if (ids.length > 0) {
      queries.push({
        library: 'bassContour',
        params: { patternIds: ids },
      });
    }
  }

  // Pattern: Bass_Rhythm_Patterns.csv (ids...)
  const bassRhythmMatch = raw.match(/Bass_Rhythm_Patterns[^(]*\(([^)]+)\)/i);
  if (bassRhythmMatch) {
    const ids = extractIds(bassRhythmMatch[1]);
    if (ids.length > 0) {
      queries.push({
        library: 'bassRhythm',
        params: { patternIds: ids },
      });
    }
  }

  // Pattern: Query Melody_Phrase_Rhythm_Library (genre='xxx', note_count=N)
  const phraseRhythmMatch = raw.match(
    /Melody_Phrase_Rhythm_Library[^(]*\(([^)]+)\)/i,
  );
  if (phraseRhythmMatch) {
    const paramsStr = phraseRhythmMatch[1];
    const genreMatch = paramsStr.match(/genre\s*=\s*['"]?(\w+)['"]?/i);
    const noteCountMatch = paramsStr.match(/note_count\s*=\s*(\d+)/i);
    queries.push({
      library: 'phraseRhythm',
      params: {
        ...(genreMatch ? { genre: genreMatch[1] } : {}),
        ...(noteCountMatch ? { noteCount: parseInt(noteCountMatch[1]) } : {}),
      },
    });
  }

  // Pattern: Melody_Contour_Library
  if (lower.includes('melody_contour_library') || lower.includes('contour')) {
    const noteCountMatch = raw.match(/note_count\s*(?:=|in)\s*\[?(\d+)/i);
    const tierMatch = raw.match(/tier\s*(?:=|in)\s*\[?([^\]]+)\]?/i);
    if (noteCountMatch || tierMatch) {
      queries.push({
        library: 'melodyContour',
        params: {
          ...(noteCountMatch ? { noteCount: parseInt(noteCountMatch[1]) } : {}),
          ...(tierMatch
            ? {
                tiers: tierMatch[1]
                  .split(',')
                  .map((t) => parseInt(t.trim()))
                  .filter(Boolean),
              }
            : {}),
        },
      });
    }
  }

  // Pattern: Chord_Comping
  if (lower.includes('comping') || lower.includes('comp_')) {
    const compIds = extractIds(raw);
    if (compIds.length > 0) {
      queries.push({
        library: 'compingPattern',
        params: { patternIds: compIds },
      });
    }
  }

  // Pattern: groove_xxx
  const grooveMatches = raw.match(/groove_\w+/g);
  if (grooveMatches) {
    queries.push({
      library: 'drumGroove',
      params: { grooveIds: grooveMatches },
    });
  }

  // Pattern: "For each chord in progression"
  if (lower.includes('progression') || lower.includes('for each chord')) {
    queries.push({
      library: 'progression',
      params: {},
    });
  }

  return { queries, raw };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract pattern IDs (e.g., bass_c_r_01, comp_pop_01) from a string.
 */
function extractIds(text: string): string[] {
  const matches = text.match(/[a-z][a-z0-9_]+_\d+/gi);
  if (!matches) return [];

  // Expand ranges like bass_c_r_01-03
  const expanded: string[] = [];
  for (const id of matches) {
    expanded.push(id);
  }
  return [...new Set(expanded)];
}
