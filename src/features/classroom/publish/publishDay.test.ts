/**
 * Rule 1 — Publish-time firewall test.
 *
 * `publishDay(day)` MUST return a snapshot whose stringified output contains
 * none of the forbidden substrings — even when the source Day's rationale is
 * populated with every one of those substrings verbatim. This is the
 * load-bearing structural invariant behind SPEC v2 §4 "the firewall moves
 * to publish time."
 */
import { describe, expect, it } from 'vitest';
import type { Cell, Day, Interaction } from '../types';
import {
  FORBIDDEN_SUBSTRINGS,
  findForbiddenSubstring,
  publishDay,
} from './publishDay';

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

const withInteractions = (cell: Cell, interactions: Interaction[]): Cell => ({
  ...cell,
  presentation: {
    ...cell.presentation,
    interactions,
  },
});

const makeDay = (): Day => ({
  id: 'day-firewall-publish-test',
  label: 'Firewall Publish Fixture',
  cells: {
    connectRegulate: makeCell('Connect'),
    groupPractice: withInteractions(makeCell('Practice'), [
      {
        id: 'ix-practice-1',
        type: 'choice',
        question: { en: 'Which instrument do you hear?' },
        shareable: true,
        choice: {
          options: [{ en: 'Guitar' }, { en: 'Piano' }, { en: 'Drums' }],
          multi: false,
        },
      },
    ]),
    creativeProjects: makeCell('Create'),
    presentPerform: makeCell('Share'),
    respondReflectReset: {
      ...makeCell('Reflect'),
      presentation: {
        ...makeCell('Reflect').presentation,
        interactions: [
          {
            id: 'ix-reflect-checkin',
            type: 'check-in',
            question: { en: 'How are you feeling?' },
            shareable: true, // Deliberately set true — projector must still refuse.
            checkIn: { style: 'emoji' },
          },
        ],
        resetChecklist: [
          { en: 'Chairs pushed in', es: 'Sillas en su lugar' },
          { en: 'Instruments returned', es: 'Instrumentos guardados' },
        ],
      },
    },
  },
});

describe('publishDay firewall (Rule 1)', () => {
  it('emits none of the forbidden rationale substrings in the persisted snapshot', () => {
    const snapshot = publishDay(makeDay());
    const match = findForbiddenSubstring(snapshot);
    expect(
      match,
      match === null
        ? undefined
        : `snapshot contains forbidden substring "${match}"`,
    ).toBeNull();
  });

  it('is exhaustive: every FORBIDDEN_SUBSTRING is checked against the same source', () => {
    const snapshot = publishDay(makeDay());
    const serialized = JSON.stringify(snapshot).toLowerCase();
    for (const forbidden of FORBIDDEN_SUBSTRINGS) {
      expect(
        serialized.includes(forbidden),
        `snapshot contains forbidden substring "${forbidden}"`,
      ).toBe(false);
    }
  });

  it('preserves the presentation title/prompt for every phase', () => {
    const snapshot = publishDay(makeDay());
    for (const phase of Object.values(snapshot.cells)) {
      expect(phase.presentation.title.en).toBeTruthy();
      expect(phase.presentation.prompt.en).toBeTruthy();
    }
  });

  it('carries launch tiles through with exactly the whitelisted keys', () => {
    const snapshot = publishDay(makeDay());
    for (const phase of Object.values(snapshot.cells)) {
      for (const tile of phase.presentation.launchTiles) {
        const keys = Object.keys(tile).sort();
        expect(keys).toEqual(['activityRef', 'id', 'module']);
      }
    }
  });

  it('carries interactions through with exactly the shape we emitted (choice)', () => {
    const snapshot = publishDay(makeDay());
    const practice = snapshot.cells.groupPractice;
    expect(practice.presentation.interactions).toHaveLength(1);
    const ix = practice.presentation.interactions![0];
    expect(ix.type).toBe('choice');
    expect(ix.choice?.options.length).toBe(3);
    expect(ix.shareable).toBe(true);
  });

  it('force-overrides shareable=false on any check-in interaction', () => {
    const snapshot = publishDay(makeDay());
    const reflect = snapshot.cells.respondReflectReset;
    const checkIn = reflect.presentation.interactions?.find(
      (i) => i.type === 'check-in',
    );
    expect(checkIn?.shareable).toBe(false);
  });

  it('carries resetChecklist through only on the Reflect phase', () => {
    const snapshot = publishDay(makeDay());
    const reflect = snapshot.cells.respondReflectReset;
    expect(reflect.presentation.resetChecklist?.length).toBe(2);
    for (const phaseKey of [
      'connectRegulate',
      'groupPractice',
      'creativeProjects',
      'presentPerform',
    ] as const) {
      expect(
        snapshot.cells[phaseKey].presentation.resetChecklist,
      ).toBeUndefined();
    }
  });
});

// ─── Interactive-slides deck ────────────────────────────────────────────────

const makeDeckDay = (): Day => {
  const day = makeDay();
  day.deck = {
    id: 'deck-1',
    title: { en: 'Song Session', es: 'Sesión de canción' },
    slides: [
      {
        id: 'sl-welcome',
        kind: 'content',
        phase: 'connectRegulate',
        variant: 'welcome',
        title: { en: 'Welcome', es: 'Bienvenidos' },
      },
      {
        id: 'sl-checkin',
        kind: 'interaction',
        phase: 'respondReflectReset',
        title: { en: 'How are you feeling?' },
        interactionIds: ['ix-reflect-checkin'],
      },
      {
        id: 'sl-media',
        kind: 'media',
        phase: 'groupPractice',
        title: { en: 'Listen' },
        prompt: { en: 'Which instrument do you hear?' },
        media: { type: 'youtube', videoId: 'dQw4w9WgXcQ', startSec: 12 },
        sideMedia: { type: 'artistImage', songId: 'test_song' },
      },
      {
        id: 'sl-question',
        kind: 'interaction',
        phase: 'groupPractice',
        title: { en: 'Your answer' },
        interactionIds: ['ix-practice-1'],
        reveal: 'bars',
      },
    ],
    templateRef: { templateId: 'song-session-v1', songId: 'test_song' },
  };
  return day;
};

describe('publishDay deck projection', () => {
  it('deck output passes the forbidden-substring firewall check', () => {
    const snapshot = publishDay(makeDeckDay());
    expect(findForbiddenSubstring(snapshot)).toBeNull();
  });

  it('whitelist-copies slides — unknown extra fields do not survive publish', () => {
    const day = makeDeckDay();
    // Simulate a future teacher-only field sneaking onto a slide object.
    (day.deck!.slides[0] as unknown as Record<string, unknown>).teacherGuide =
      'SECRET: teacher-only pacing guide';
    const snapshot = publishDay(day);
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain('SECRET');
    expect(serialized).not.toContain('teacherGuide');
  });

  it('preserves slide order, kinds, phases, and interaction references', () => {
    const snapshot = publishDay(makeDeckDay());
    expect(snapshot.deck).toBeDefined();
    const slides = snapshot.deck!.slides;
    expect(slides.map((s) => s.id)).toEqual([
      'sl-welcome',
      'sl-checkin',
      'sl-media',
      'sl-question',
    ]);
    expect(slides[1]).toMatchObject({
      kind: 'interaction',
      phase: 'respondReflectReset',
      interactionIds: ['ix-reflect-checkin'],
    });
    expect(slides[2]).toMatchObject({
      kind: 'media',
      media: { type: 'youtube', videoId: 'dQw4w9WgXcQ', startSec: 12 },
      sideMedia: { type: 'artistImage', songId: 'test_song' },
    });
    expect(snapshot.deck!.templateRef).toEqual({
      templateId: 'song-session-v1',
      songId: 'test_song',
    });
  });

  it('omits deck entirely for legacy Days', () => {
    const snapshot = publishDay(makeDay());
    expect('deck' in snapshot).toBe(false);
  });

  it('omits an empty-but-attached deck so the session does not brick into deck-mode', () => {
    // A teacher who clicks "Add interactive slides" then adds none (or deletes
    // them all) leaves an attached deck with zero slides. Publishing it would
    // flip the live session into deck-mode with no slides — every surface
    // stranded on "waiting for slides". The gate must drop it and fall back to
    // the legacy phase-based lesson.
    const day = makeDeckDay();
    day.deck!.slides = [];
    const snapshot = publishDay(day);
    expect('deck' in snapshot).toBe(false);
  });

  it('strips a legacy "/songs/<id>" slug from published prompts (no raw slug on student devices)', () => {
    // Days materialized before the structured song field carried the slug in
    // the Connect prompt. The published student/deck path must strip it too,
    // matching the Presentation-Mode (buildStudentView) path.
    const day = makeDay();
    day.cells.connectRegulate.presentation.prompt = {
      en: 'Class Playlist Shuffle.\n\nSong of the day: /songs/lovely_day',
      es: 'Mezcla de la lista.\n\nCanción del día: /songs/lovely_day',
    };
    const snapshot = publishDay(day);
    const prompt = snapshot.cells.connectRegulate.presentation.prompt;
    expect(prompt.en).toBe('Class Playlist Shuffle.');
    expect(prompt.en).not.toContain('/songs/');
    expect(prompt.es).not.toContain('/songs/');
  });
});
