/**
 * Firewall acceptance test for `buildStudentView`.
 *
 * Constructs a Day with EVERY teacher-only rationale field populated with a
 * unique forbidden marker word, runs it through `buildStudentView`, and
 * asserts that the JSON-stringified output contains none of the forbidden
 * substrings. This is the load-bearing invariant of the Classroom feature:
 * anything a student can see must be a function of the presentation block
 * only, not the rationale block.
 *
 * Extending `buildStudentView` to emit a new field? Add coverage here.
 */
import { describe, expect, it } from 'vitest';
import { buildStudentView } from './buildStudentView';
import type { Slide } from './slides/types';
import type { Cell, Day, StudentViewConfig } from './types';

const FORBIDDEN_SUBSTRINGS = [
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

const makeCell = (phaseLabel: string): Cell => ({
  presentation: {
    title: {
      en: `${phaseLabel} title (student-safe)`,
      es: `${phaseLabel} título`,
    },
    prompt: {
      en: `${phaseLabel} prompt to the class`,
      es: `${phaseLabel} pregunta a la clase`,
    },
    launchTiles: [
      {
        id: `${phaseLabel}-tile-1`,
        module: 'learn',
        activityRef: `curriculum:${phaseLabel.toLowerCase()}:demo`,
      },
    ],
  },
  rationale: {
    assessment: {
      en: 'ASSESSMENT: rubric points about accuracy',
      es: 'evaluación',
    },
    standards: ['STANDARDS: MU:Cr1.1'],
    commonAnchors: ['ANCHOR: Anchor Standard 1'],
    selCompetencies: ['SEL: Self-Awareness'],
    impactTags: ['IMPACT: Community'],
    cloRefs: ['CLO: I can identify tonal center'],
    notes: 'NOTES: private teacher note about pacing',
    initiationStyle: 'learn-to-apply',
    scaffoldLaneIds: ['SCAFFOLD: lane-advanced'],
    createdBy: 'CREATEDBY: teacher-abc-123',
    localContext:
      'LOCALCONTEXT: Denver Five Points jazz history, teacher-facing only',
  },
});

const makeDay = (): Day => ({
  id: 'day-firewall-test',
  label: 'Firewall Fixture Day',
  cells: {
    connectRegulate: makeCell('Connect'),
    groupPractice: makeCell('Practice'),
    creativeProjects: makeCell('Create'),
    presentPerform: makeCell('Share'),
    respondReflectReset: {
      ...makeCell('Reflect'),
      presentation: {
        ...makeCell('Reflect').presentation,
        resetChecklist: [
          { en: 'Chairs pushed in', es: 'Sillas en su lugar' },
          { en: 'Instruments returned', es: 'Instrumentos guardados' },
        ],
      },
    },
  },
});

const config: StudentViewConfig = { language: 'en', agePreset: 'high' };

describe('buildStudentView firewall', () => {
  it('emits none of the forbidden rationale substrings', () => {
    const view = buildStudentView(makeDay(), config);
    const serialized = JSON.stringify(view).toLowerCase();

    for (const forbidden of FORBIDDEN_SUBSTRINGS) {
      expect(
        serialized.includes(forbidden),
        `student view contains forbidden substring "${forbidden}"`,
      ).toBe(false);
    }
  });

  it('emits all five phases in canonical order', () => {
    const view = buildStudentView(makeDay(), config);
    expect(view.phases.map((p) => p.phaseKey)).toEqual([
      'connectRegulate',
      'groupPractice',
      'creativeProjects',
      'presentPerform',
      'respondReflectReset',
    ]);
  });

  it('emits presentation title and prompt for each phase', () => {
    const view = buildStudentView(makeDay(), config);
    for (const phase of view.phases) {
      expect(phase.title.en).toBeTruthy();
      expect(phase.prompt.en).toBeTruthy();
    }
  });

  it('emits student-facing phase labels (Connect / Practice / Create / Share / Reflect)', () => {
    const view = buildStudentView(makeDay(), config);
    expect(view.phases.map((p) => p.label.en)).toEqual([
      'Connect',
      'Practice',
      'Create',
      'Share',
      'Reflect',
    ]);
  });

  it('emits resetChecklist ONLY on the Reflect phase', () => {
    const view = buildStudentView(makeDay(), config);
    const reflect = view.phases.find(
      (p) => p.phaseKey === 'respondReflectReset',
    );
    const nonReflect = view.phases.filter(
      (p) => p.phaseKey !== 'respondReflectReset',
    );

    expect(reflect?.resetChecklist?.length).toBe(2);
    for (const phase of nonReflect) {
      expect(phase.resetChecklist).toBeUndefined();
    }
  });

  it('emits launchTiles with only id / module / activityRef / optional label', () => {
    const view = buildStudentView(makeDay(), config);
    for (const phase of view.phases) {
      for (const tile of phase.launchTiles) {
        const keys = Object.keys(tile).sort();
        // 'label' is optional; the fixture doesn't set it, so keys should be
        // exactly the mandatory three.
        expect(keys).toEqual(['activityRef', 'id', 'module']);
      }
    }
  });
});

describe('buildStudentView deck', () => {
  const config: StudentViewConfig = { language: 'both', agePreset: 'middle' };

  it('projects the deck into the student view, whitelist-copied', () => {
    const day = makeDay();
    day.deck = {
      id: 'deck-sv',
      title: { en: 'Session deck' },
      slides: [
        {
          id: 'sl-1',
          kind: 'content',
          phase: 'connectRegulate',
          variant: 'welcome',
          title: { en: 'Welcome' },
        },
      ],
    };
    (day.deck.slides[0] as unknown as Record<string, unknown>).teacherGuide =
      'SECRET: pacing';
    const view = buildStudentView(day, config);
    expect(view.deck?.slides).toHaveLength(1);
    expect(view.deck?.slides[0].id).toBe('sl-1');
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain('SECRET');
    for (const forbidden of FORBIDDEN_SUBSTRINGS) {
      expect(serialized.toLowerCase().includes(forbidden)).toBe(false);
    }
  });

  it('carries content-slide launchTiles + resetChecklist through, whitelist-copied', () => {
    const day = makeDay();
    const dirtySlide = {
      id: 'sl-reset',
      kind: 'content',
      phase: 'respondReflectReset',
      title: { en: 'Reset' },
      launchTiles: [
        {
          id: 'lt-1',
          module: 'globe',
          activityRef: 'event-9',
          scaffoldNote: 'SECRET: teacher pacing',
        },
      ],
      resetChecklist: [{ en: 'Chairs in', es: 'Sillas' }],
      teacherGuide: 'SECRET: pacing',
    } as unknown as Slide;
    day.deck = {
      id: 'deck-sv2',
      title: { en: 'Session deck' },
      slides: [dirtySlide],
    };
    const view = buildStudentView(day, config);
    const projected = view.deck?.slides.find((s) => s.id === 'sl-reset') as
      | Extract<Slide, { kind: 'content' }>
      | undefined;
    expect(projected?.launchTiles).toEqual([
      { id: 'lt-1', module: 'globe', activityRef: 'event-9' },
    ]);
    expect(projected?.resetChecklist).toEqual([{ en: 'Chairs in', es: 'Sillas' }]);
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain('SECRET');
    expect(serialized).not.toContain('scaffoldNote');
    expect(serialized).not.toContain('teacherGuide');
    for (const forbidden of FORBIDDEN_SUBSTRINGS) {
      expect(serialized.toLowerCase().includes(forbidden)).toBe(false);
    }
  });

  it('omits deck for legacy Days', () => {
    const view = buildStudentView(makeDay(), config);
    expect('deck' in view).toBe(false);
  });
});

describe('buildStudentView song reference', () => {
  it('carries a structured presentation.song onto the phase view', () => {
    const day = makeDay();
    day.cells.connectRegulate.presentation.song = { id: 'lovely_day' };
    const view = buildStudentView(day, config);
    const connect = view.phases[0];
    expect(connect.song).toEqual({ id: 'lovely_day' });
    // Phases without a song reference stay clean.
    expect(view.phases[1].song).toBeUndefined();
  });

  it('migrates a legacy "/songs/<id>" slug out of the prompt and back-fills song', () => {
    const day = makeDay();
    // Simulate a Day materialized before the structured field existed.
    day.cells.connectRegulate.presentation.prompt = {
      en: 'Class Playlist Shuffle.\n\nSong of the day: /songs/lovely_day',
      es: 'Mezcla de la lista.\n\nCanción del día: /songs/lovely_day',
    };
    const view = buildStudentView(day, config);
    const connect = view.phases[0];
    // Slug stripped from the display prompt…
    expect(connect.prompt.en).toBe('Class Playlist Shuffle.');
    expect(connect.prompt.en).not.toContain('/songs/');
    expect(connect.prompt.es).not.toContain('/songs/');
    // …and recovered into the structured reference.
    expect(connect.song).toEqual({ id: 'lovely_day' });
  });

  it('prefers the structured song over a legacy slug when both are present', () => {
    const day = makeDay();
    day.cells.connectRegulate.presentation.song = { id: 'new_id' };
    day.cells.connectRegulate.presentation.prompt = {
      en: 'Intro.\n\nSong of the day: /songs/old_id',
    };
    const view = buildStudentView(day, config);
    expect(view.phases[0].song).toEqual({ id: 'new_id' });
    expect(view.phases[0].prompt.en).toBe('Intro.');
  });
});

describe('buildStudentView firewall — applied seed', () => {
  it('a Day populated by applySeedToDay leaks no forbidden substrings', async () => {
    const { applySeedToDay } = await import('./content/applySeed');
    const { newBlankDay } = await import('./plan/newBlankDay');
    const { PHASES } = await import('./phases');
    type PhaseKey = (typeof PHASES)[number];

    // Marker seed: forbidden words live ONLY in rationale-bound fields;
    // presentation copy is neutral. Proves apply-seed routing keeps the board
    // clean even when a seed carries heavy pedagogy.
    const markerPhase = () => ({
      presentation: { title: { en: 'Warm up' }, prompt: { en: 'Play a groove' } },
      activitySuggestions: ['unresolved-suggestion'],
      atlasResources: [],
      cloText: { awarenessOfFeeling: 'ASSESSMENT CLO IMPACT marker' },
      rationaleHints: {
        standards: ['STANDARD-MARK'],
        assessment: { en: 'ASSESSMENT marker' },
        notes: 'NOTES marker',
      },
    });
    const markerSeed = {
      id: 'seed-marker',
      kind: 'day' as const,
      title: { en: 'Marker' },
      themeId: 'theme-january',
      monthHint: 1,
      tags: [],
      standards: [],
      description: 'desc',
      template: Object.fromEntries(
        PHASES.map((p) => [p, markerPhase()]),
      ) as Record<PhaseKey, ReturnType<typeof markerPhase>>,
      songs: ['SONG-STANDARD'],
      localContext: { en: 'LOCALCONTEXT INITIATION marker' },
      source: 'canonical' as const,
      createdBy: null,
      createdAt: '',
    };

    const applied = applySeedToDay(markerSeed, newBlankDay(), {
      mode: 'replace',
      resolveActivityId: () => undefined,
    });
    const view = buildStudentView(applied, config);
    const serialized = JSON.stringify(view).toLowerCase();
    for (const forbidden of FORBIDDEN_SUBSTRINGS) {
      expect(
        serialized.includes(forbidden),
        `applied-seed student view contains "${forbidden}"`,
      ).toBe(false);
    }
  });
});
