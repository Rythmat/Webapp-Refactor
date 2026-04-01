/**
 * Phase 14 — Activity Flow Data Tests.
 *
 * Validates all 42 activity flows (14 genres × 3 levels):
 * - All flows load successfully
 * - Structure: each has 4 sections (A/B/C/D)
 * - Steps have valid assessment types
 * - Technical params are populated
 * - Content generation parser works
 */

import { describe, it, expect } from 'vitest';
import { getActivityFlow } from '../data/activityFlows';
import { parseContentGeneration } from '../engine/contentGenerationParser';
import type { AssessmentType } from '../types/activity';

const GENRES = [
  'african',
  'blues',
  'electronic',
  'folk',
  'funk',
  'hipHop',
  'jamBand',
  'jazz',
  'latin',
  'neoSoul',
  'pop',
  'reggae',
  'rnb',
  'rock',
];
const LEVELS = [1, 2, 3];
const VALID_ASSESSMENTS: (AssessmentType | null)[] = [
  'pitch_only',
  'pitch_order',
  'pitch_order_timing',
  'pitch_order_timing_duration',
  null,
];

describe('Activity Flow Data', () => {
  it('loads all 42 flows', async () => {
    let count = 0;
    for (const genre of GENRES) {
      for (const level of LEVELS) {
        const flow = await getActivityFlow(genre, level);
        expect(flow).not.toBeNull();
        count++;
      }
    }
    expect(count).toBe(42);
  });

  it('each flow has 4 sections (A/B/C/D)', async () => {
    for (const genre of GENRES) {
      for (const level of LEVELS) {
        const flow = await getActivityFlow(genre, level);
        if (!flow) continue;
        const sectionIds = flow.sections.map((s) => s.id);
        expect(sectionIds).toContain('A');
        expect(sectionIds).toContain('B');
        expect(sectionIds).toContain('C');
        expect(sectionIds).toContain('D');
      }
    }
  });

  it('all steps have valid assessment types', async () => {
    for (const genre of GENRES) {
      for (const level of LEVELS) {
        const flow = await getActivityFlow(genre, level);
        if (!flow) continue;
        for (const section of flow.sections) {
          for (const step of section.steps) {
            expect(VALID_ASSESSMENTS).toContain(step.assessment);
          }
        }
      }
    }
  });

  it('all flows have populated technical params', async () => {
    for (const genre of GENRES) {
      for (const level of LEVELS) {
        const flow = await getActivityFlow(genre, level);
        if (!flow) continue;
        expect(flow.title).toBeTruthy();
        expect(flow.params.tempoRange).toHaveLength(2);
        expect(flow.params.tempoRange[0]).toBeLessThan(
          flow.params.tempoRange[1],
        );
        expect(flow.params.defaultKey).toBeTruthy();
        expect(typeof flow.params.swing).toBe('number');
      }
    }
  });

  it('step counts are reasonable (10-80 per flow)', async () => {
    for (const genre of GENRES) {
      for (const level of LEVELS) {
        const flow = await getActivityFlow(genre, level);
        if (!flow) continue;
        const totalSteps = flow.sections.reduce(
          (s, sec) => s + sec.steps.length,
          0,
        );
        expect(totalSteps).toBeGreaterThanOrEqual(10);
        expect(totalSteps).toBeLessThanOrEqual(80);
      }
    }
  });
});

describe('Content Generation Parser', () => {
  it('parses chord quality query', () => {
    const result = parseContentGeneration(
      'Query Chord_Quality_Library.csv for "maj" → get root_position array → arpeggiate in key',
    );
    expect(result).not.toBeNull();
    expect(result!.queries).toContainEqual(
      expect.objectContaining({
        library: 'chordQuality',
        params: { qualityId: 'maj' },
      }),
    );
  });

  it('parses rh_override voicing', () => {
    const result = parseContentGeneration(
      'Genre_Voicing_Taxonomy → rh_override=[4, -2, 15]. LH=root_bass. Resolve in key.',
    );
    expect(result).not.toBeNull();
    const voicingQuery = result!.queries.find(
      (q) => q.library === 'voicingTaxonomy',
    );
    expect(voicingQuery).toBeDefined();
    expect(voicingQuery!.params.rhOverride).toEqual([4, -2, 15]);
  });

  it('parses quality × algorithm cross-reference', () => {
    const result = parseContentGeneration(
      'Genre_Voicing_Taxonomy → Chord_Quality_Library("maj") × Voicing_Algorithm_Library("va_3n_root_pos"). LH=root_bass.',
    );
    expect(result).not.toBeNull();
    const q = result!.queries.find((q) => q.library === 'voicingTaxonomy');
    expect(q).toBeDefined();
    expect(q!.params.qualityId).toBe('maj');
    expect(q!.params.algorithmId).toBe('va_3n_root_pos');
  });

  it('parses quality=xxx × algo=yyy shorthand', () => {
    const result = parseContentGeneration(
      'quality=dom7b9 × algo=va_5n_root_pos. LH=root_bass.',
    );
    expect(result).not.toBeNull();
    const q = result!.queries.find((q) => q.library === 'voicingTaxonomy');
    expect(q!.params.qualityId).toBe('dom7b9');
    expect(q!.params.algorithmId).toBe('va_5n_root_pos');
  });

  it('parses bass pattern references', () => {
    const result = parseContentGeneration(
      'Select from Bass_Contour_Patterns.csv (bass_c_r_01, bass_c_r5_01) + Bass_Rhythm_Patterns.csv (bass_r_pop_01, bass_r_pop_02). Resolve through Major Pentatonic.',
    );
    expect(result).not.toBeNull();
    const bassContour = result!.queries.find(
      (q) => q.library === 'bassContour',
    );
    expect(bassContour).toBeDefined();
    expect(bassContour!.params.patternIds).toContain('bass_c_r_01');
    const bassRhythm = result!.queries.find((q) => q.library === 'bassRhythm');
    expect(bassRhythm).toBeDefined();
  });

  it('parses groove references', () => {
    const result = parseContentGeneration(
      'Full progression with LH bass + RH voicings + backing track (groove_pop_01).',
    );
    expect(result).not.toBeNull();
    const groove = result!.queries.find((q) => q.library === 'drumGroove');
    expect(groove).toBeDefined();
    expect(groove!.params.grooveIds).toContain('groove_pop_01');
  });

  it('returns null for empty string', () => {
    expect(parseContentGeneration('')).toBeNull();
    expect(parseContentGeneration('  ')).toBeNull();
  });
});
