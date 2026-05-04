import type { Song, ContentRef, ContentRefType } from '@/curriculum/types/songLibrary';

/* ── Helpers ─────────────────────────────────────────────────────────── */

const capitalize = (s: string) =>
  s.replace(/(^|[\s_-])(\w)/g, (_, sep, c) => (sep === '_' ? ' ' : sep) + c.toUpperCase()).trim();

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');

function hasRefOfType(refs: ContentRef[], type: ContentRefType): boolean {
  return refs.some((r) => r.refType === type);
}

function formatScene(scene: string): string {
  return capitalize(scene.replace(/_/g, ' '));
}

function formatEra(era: string): string {
  return capitalize(era.replace(/_/g, ' '));
}

/* ── Derivation functions ────────────────────────────────────────────── */

function deriveKeyRef(key: string, _mode: string): ContentRef {
  const topicId = `key_signatures_${slugify(key)}`;
  return {
    module: 'theory',
    topicId,
    displayLabel: `Learn ${key}`,
    refType: 'key',
  };
}

function deriveModeRef(mode: string): ContentRef {
  return {
    module: 'theory',
    topicId: `modes_${mode}`,
    displayLabel: `Explore ${capitalize(mode)} mode`,
    refType: 'mode',
  };
}

function deriveTechniqueRef(technique: string, genre: string): ContentRef | null {
  return {
    module: 'genre',
    genre,
    displayLabel: capitalize(technique),
    refType: 'technique',
  };
}

function deriveGenreOverviewRef(genre: string): ContentRef {
  return {
    module: 'genre',
    genre,
    displayLabel: `Explore ${capitalize(genre)} curriculum`,
    refType: 'genre_overview',
  };
}

/**
 * Extract common chord progression patterns from a song's sections.
 * Returns degree-based patterns like '1-5-6-4'.
 */
function extractProgressionPatterns(song: Song): string[] {
  const patterns = new Set<string>();
  for (const section of song.sections) {
    if (section.bars.length >= 4) {
      // Take the first 4 bars' first chords as a pattern
      const first4 = section.bars.slice(0, 4).map((bar) => {
        const first = bar.chords[0];
        if (!first) return '';
        // Extract just the degree number: '1 maj' → '1', '6 min' → '6'
        return first.degree.split(' ')[0];
      });
      if (first4.every(Boolean)) {
        patterns.add(first4.join('-'));
      }
    }
  }
  return Array.from(patterns);
}

function deriveProgressionRef(pattern: string, genre: string): ContentRef {
  return {
    module: 'genre',
    genre,
    displayLabel: `${pattern} Progression`,
    refType: 'progression',
  };
}

/* ── Reference ordering ──────────────────────────────────────────────── */

const REF_ORDER: ContentRefType[] = [
  'key', 'mode',
  'technique', 'progression',
  'globe_artist', 'globe_scene', 'globe_region', 'globe_era',
  'genre_overview', 'studio_jam',
];

function dedupeAndOrder(refs: ContentRef[]): ContentRef[] {
  // Dedupe by refType + displayLabel
  const seen = new Set<string>();
  const deduped: ContentRef[] = [];
  for (const ref of refs) {
    const key = `${ref.refType}:${ref.displayLabel}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(ref);
    }
  }
  // Sort by priority order
  return deduped.sort((a, b) => {
    const ai = REF_ORDER.indexOf(a.refType);
    const bi = REF_ORDER.indexOf(b.refType);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

/* ── Main resolver ───────────────────────────────────────────────────── */

/**
 * Auto-derive content references from a song's musical metadata and Globe origin.
 * Explicit overrides in `song.contentRefs` always take precedence.
 */
export function resolveContentRefs(song: Song): ContentRef[] {
  const refs: ContentRef[] = [];

  // ── Explicit overrides come first ──
  if (song.contentRefs) {
    refs.push(...song.contentRefs);
  }

  // ── 1. Theory: key signature ──
  if (!hasRefOfType(refs, 'key')) {
    refs.push(deriveKeyRef(song.key, song.mode));
  }

  // ── 2. Theory: mode (only if non-standard major/minor) ──
  if (!hasRefOfType(refs, 'mode') && !['major', 'minor', 'ionian', 'aeolian'].includes(song.mode)) {
    refs.push(deriveModeRef(song.mode));
  }

  // ── 3. Genre lessons: each technique tag ──
  for (const tech of song.techniques) {
    if (!hasRefOfType(refs, 'technique') || !refs.some((r) => r.displayLabel === capitalize(tech))) {
      const ref = deriveTechniqueRef(tech, song.genreTags[0] ?? 'pop');
      if (ref) refs.push(ref);
    }
  }

  // ── 4. Genre lessons: chord progression patterns ──
  const patterns = extractProgressionPatterns(song);
  for (const pattern of patterns) {
    refs.push(deriveProgressionRef(pattern, song.genreTags[0] ?? 'pop'));
  }

  // ── 5. Genre overview ──
  for (const genre of song.genreTags) {
    if (!refs.some((r) => r.refType === 'genre_overview' && r.genre === genre)) {
      refs.push(deriveGenreOverviewRef(genre));
    }
  }

  // ── 6. Globe: artist deep dive ──
  if (song.origin?.artistGlobeId && !hasRefOfType(refs, 'globe_artist')) {
    refs.push({
      module: 'globe',
      globeArtistId: song.origin.artistGlobeId,
      displayLabel: `${song.artist} on the Globe`,
      refType: 'globe_artist',
    });
  }

  // ── 7. Globe: scene/movement ──
  if (song.origin?.scene && !hasRefOfType(refs, 'globe_scene')) {
    refs.push({
      module: 'globe',
      globeSceneId: song.origin.scene,
      displayLabel: `Visit ${formatScene(song.origin.scene)}`,
      refType: 'globe_scene',
    });
  }

  // ── 8. Globe: geographic region ──
  if (song.origin?.region && !hasRefOfType(refs, 'globe_region')) {
    refs.push({
      module: 'globe',
      globeRegion: slugify(song.origin.region),
      displayLabel: `Explore ${song.origin.region}`,
      refType: 'globe_region',
    });
  }

  // ── 9. Globe: era ──
  if (song.origin?.era && !hasRefOfType(refs, 'globe_era')) {
    refs.push({
      module: 'globe',
      globeEra: song.origin.era,
      displayLabel: `${formatEra(song.origin.era)} on the Globe`,
      refType: 'globe_era',
    });
  }

  return dedupeAndOrder(refs);
}

/**
 * Split resolved refs into Learn rail and Globe rail for display.
 */
export function splitContentRefs(refs: ContentRef[]): {
  learnRefs: ContentRef[];
  globeRefs: ContentRef[];
} {
  const learnTypes: ContentRefType[] = ['key', 'mode', 'progression', 'technique', 'genre_overview', 'studio_jam'];
  const globeTypes: ContentRefType[] = ['globe_region', 'globe_era', 'globe_artist', 'globe_scene'];

  return {
    learnRefs: refs.filter((r) => learnTypes.includes(r.refType)),
    globeRefs: refs.filter((r) => globeTypes.includes(r.refType)),
  };
}
