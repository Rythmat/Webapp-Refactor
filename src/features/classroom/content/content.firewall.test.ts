import { describe, expect, it } from 'vitest';
import { PHASES } from '../phases';
import { LESSON_SEEDS } from './canonical';

/**
 * Firewall guard for the canonical seed data: a `kind:'day'` seed's per-phase
 * `presentation` block is the ONLY part that flows to the board (via
 * buildStudentView). Everything else (activitySuggestions, atlasResources,
 * cloText, rationaleHints) is teacher-side. This asserts structurally that no
 * pedagogy leaked INTO the presentation block — a key-check, not a substring
 * scan, so it can't false-positive on ordinary musical prose ("play the notes").
 */
describe('canonical seed presentation firewall', () => {
  it('day-seed presentation blocks carry only student-safe title/prompt keys', () => {
    const allowed = new Set(['title', 'prompt']);
    for (const seed of LESSON_SEEDS) {
      if (seed.kind !== 'day') continue;
      for (const phase of PHASES) {
        const pres = seed.template[phase].presentation as Record<
          string,
          unknown
        >;
        for (const key of Object.keys(pres)) {
          expect(
            allowed.has(key),
            `${seed.id}/${phase}.presentation has stray key "${key}"`,
          ).toBe(true);
        }
      }
    }
  });

  it('presentation title/prompt are LocalizedText, never pedagogy objects', () => {
    for (const seed of LESSON_SEEDS) {
      if (seed.kind !== 'day') continue;
      for (const phase of PHASES) {
        const { title, prompt } = seed.template[phase].presentation;
        if (title) expect(typeof title.en).toBe('string');
        if (prompt) expect(typeof prompt.en).toBe('string');
      }
    }
  });
});
