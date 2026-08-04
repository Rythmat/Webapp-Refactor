import { describe, expect, it } from 'vitest';
import { PHASES, type PhaseKey } from '../phases';
import { newBlankDay } from '../plan/newBlankDay';
import {
  applySeedToDay,
  insertActivityIntoCell,
  isCellPopulated,
  type ApplySeedOptions,
} from './applySeed';
import { ACTIVITIES, LESSON_SEEDS } from './canonical';
import type { ActivityLessonSeed, DayLessonSeed, DaySeedPhase } from './types';

const byId = (id: string) => ACTIVITIES.find((a) => a.id === id);
const opts = (mode: 'merge' | 'replace'): ApplySeedOptions => ({
  mode,
  resolveActivityId: byId,
});

const aDaySeed = LESSON_SEEDS.find((s): s is DayLessonSeed => s.kind === 'day')!;
const anActivitySeed = LESSON_SEEDS.find(
  (s): s is ActivityLessonSeed => s.kind === 'activity',
)!;

const FORBIDDEN = [
  'assessment',
  'rationale',
  'clo',
  'impact',
  'scaffold',
  'standard',
  'initiation',
  'createdby',
  'notes',
  'localcontext',
];

describe('applySeedToDay — day seed', () => {
  it('populates cells + stamps provenance, student prompts land on presentation', () => {
    const result = applySeedToDay(aDaySeed, newBlankDay(), opts('merge'));
    expect(result.sourceSeedId).toBe(aDaySeed.id);
    for (const phase of PHASES) {
      const tmpl = aDaySeed.template[phase];
      if (tmpl.presentation.prompt) {
        expect(result.cells[phase].presentation.prompt.en).toBe(
          tmpl.presentation.prompt.en,
        );
      }
      // resolved-activity + seed-phase CLOs land on rationale, not presentation.
      expect(Array.isArray(result.cells[phase].rationale.cloRefs)).toBe(true);
    }
  });

  it('merge fills only empty cells; replace overwrites but preserves interactions', () => {
    const day = newBlankDay();
    day.cells.connectRegulate.presentation.title = { en: 'My own opener' };
    day.cells.connectRegulate.presentation.interactions = [
      {
        id: 'ix-keep',
        type: 'text',
        question: { en: 'q' },
        shareable: true,
      },
    ];

    const merged = applySeedToDay(aDaySeed, day, opts('merge'));
    expect(merged.cells.connectRegulate.presentation.title.en).toBe(
      'My own opener',
    );

    const replaced = applySeedToDay(aDaySeed, day, opts('replace'));
    // Overwritten…
    expect(replaced.cells.connectRegulate.presentation.title.en).not.toBe(
      'My own opener',
    );
    // …but the live-session interaction survives.
    expect(
      replaced.cells.connectRegulate.presentation.interactions?.[0].id,
    ).toBe('ix-keep');
  });
});

describe('applySeedToDay — activity seed', () => {
  it('inserts the anchor into its one phase, leaves the rest untouched', () => {
    const result = applySeedToDay(anActivitySeed, newBlankDay(), opts('merge'));
    const phase = anActivitySeed.anchor.phase;
    expect(result.cells[phase].rationale.activityRefs).toContain(
      anActivitySeed.anchor.activity.id,
    );
    const others = PHASES.filter((p) => p !== phase);
    for (const p of others) expect(isCellPopulated(result.cells[p])).toBe(false);
  });
});

describe('insertActivityIntoCell', () => {
  it('puts description on the prompt and pedagogy on rationale', () => {
    const activity = ACTIVITIES[0];
    const cell = insertActivityIntoCell(activity, newBlankDay().cells[activity.phase]);
    expect(cell.presentation.prompt.en).toContain(activity.description);
    expect(cell.rationale.activityRefs).toContain(activity.id);
    for (const cid of activity.cloIds) {
      expect(cell.rationale.cloRefs).toContain(cid);
    }
  });
});

describe('applySeedToDay firewall (routing, not prose scan)', () => {
  it('keeps pedagogy markers OUT of presentation and IN rationale', () => {
    // A marker seed: forbidden words live only in rationale-bound fields;
    // presentation copy is neutral. Proves routing.
    const phase = (): DaySeedPhase => ({
      presentation: { title: { en: 'Warm up together' }, prompt: { en: 'Play a groove' } },
      activitySuggestions: ['nonexistent-suggestion'],
      atlasResources: [],
      cloText: { awarenessOfFeeling: 'ASSESSMENT CLO IMPACT marker text' },
      rationaleHints: {
        standards: ['STANDARD-MARK'],
        assessment: { en: 'ASSESSMENT marker' },
        notes: 'NOTES marker',
      },
    });
    const markerSeed: DayLessonSeed = {
      id: 'seed-marker',
      kind: 'day',
      title: { en: 'Marker' },
      themeId: 'theme-january',
      monthHint: 1,
      tags: [],
      standards: [],
      description: 'desc',
      template: Object.fromEntries(
        PHASES.map((p) => [p, phase()]),
      ) as Record<PhaseKey, DaySeedPhase>,
      songs: ['SONG-STANDARD-MARK'],
      localContext: { en: 'LOCALCONTEXT INITIATION marker' },
      source: 'canonical',
      createdBy: null,
      createdAt: '',
    };

    const result = applySeedToDay(markerSeed, newBlankDay(), opts('replace'));
    const presentation = JSON.stringify(
      PHASES.map((p) => result.cells[p].presentation),
    ).toLowerCase();
    for (const forbidden of FORBIDDEN) {
      expect(
        presentation.includes(forbidden),
        `presentation leaked "${forbidden}"`,
      ).toBe(false);
    }
    // Positive: the markers actually landed on rationale.
    const connect = result.cells.connectRegulate.rationale;
    expect(connect.localContext).toContain('LOCALCONTEXT');
    expect(connect.notes.toLowerCase()).toContain('song');
    expect(connect.assessment?.en).toContain('ASSESSMENT');
    // rationaleHints.notes is carried through (not dropped).
    expect(connect.notes).toContain('NOTES marker');
  });

  it('re-applying the same seed (Replace) does not accumulate duplicate note lines', () => {
    const seed = aDaySeed;
    const once = applySeedToDay(seed, newBlankDay(), opts('replace'));
    const twice = applySeedToDay(seed, once, opts('replace'));
    for (const phase of PHASES) {
      const lines = twice.cells[phase].rationale.notes
        .split('\n')
        .filter(Boolean);
      expect(lines.length).toBe(new Set(lines).size);
      // idempotent: a second Replace yields the same notes as the first.
      expect(twice.cells[phase].rationale.notes).toBe(
        once.cells[phase].rationale.notes,
      );
    }
  });
});
