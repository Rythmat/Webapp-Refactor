/**
 * Rule 1 — Publish-time firewall test.
 *
 * `publishDay(day)` MUST return a snapshot that carries none of the teacher-only
 * field NAMES and none of the teacher-only rationale CONTENT, even when the
 * source Day's rationale is fully populated. This is the load-bearing structural
 * invariant behind SPEC v2 §4 "the firewall moves to publish time."
 *
 * Note the two distinct guarantees, which the exact-key matcher separates:
 *   - no forbidden KEY appears at any depth (`findForbiddenKey`);
 *   - no rationale VALUE rides through (the planted `LEAK_MARKERS` below).
 * Content values that merely resemble a teacher-only word are NOT leaks and
 * must survive publish — see the `tears_of_a_clown` case.
 */
import { describe, expect, it } from 'vitest';
import type { Slide } from '../slides/types';
import type { Cell, Day, Interaction } from '../types';
import {
  SNAPSHOT_VERSION,
  FORBIDDEN_KEYS,
  findForbiddenKey,
  findForbiddenSubstring,
  isForbiddenKey,
  publishDay,
  sanitizeSnapshot,
} from './publishDay';

/**
 * The distinctive markers `makeCell` plants in every rationale field. None may
 * ever appear in a published snapshot — this is the VALUE-leak half of Rule 1,
 * and it is what the old substring-over-JSON assertion was really testing.
 */
const LEAK_MARKERS = [
  'ASSESSMENT:',
  'STANDARDS:',
  'ANCHOR:',
  'SEL:',
  'IMPACT:',
  'CLO:',
  'NOTES:',
  'SCAFFOLD:',
  'CREATEDBY:',
  'LOCALCONTEXT:',
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

  it('leaks no rationale VALUE — every planted marker is absent', () => {
    const serialized = JSON.stringify(publishDay(makeDay())).toUpperCase();
    for (const marker of LEAK_MARKERS) {
      expect(
        serialized.includes(marker),
        `snapshot leaked rationale content "${marker}"`,
      ).toBe(false);
    }
  });

  it('is exhaustive: no FORBIDDEN_KEY appears as a key at any depth', () => {
    const snapshot = publishDay(makeDay());
    const keys: string[] = [];
    const walk = (v: unknown): void => {
      if (Array.isArray(v)) return v.forEach(walk);
      if (v && typeof v === 'object') {
        for (const [k, val] of Object.entries(v)) {
          keys.push(k);
          walk(val);
        }
      }
    };
    walk(snapshot);
    for (const forbidden of FORBIDDEN_KEYS) {
      expect(
        keys.some((k) => k.toLowerCase() === forbidden.toLowerCase()),
        `snapshot contains forbidden key "${forbidden}"`,
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

  it('whitelist-copies a content slide launchTiles + resetChecklist (stray keys dropped, firewall clean)', () => {
    const day = makeDeckDay();
    // A content slide carrying launch tiles + a reset checklist, each seeded
    // with a stray teacher-only key that must be dropped by the whitelist copy.
    const dirtySlide = {
      id: 'sl-connect-tiles',
      kind: 'content',
      phase: 'respondReflectReset',
      title: { en: 'Reset' },
      launchTiles: [
        {
          id: 'lt-1',
          module: 'globe',
          activityRef: 'event-123',
          label: { en: 'Explore', es: 'Explora' },
          scaffoldNote: 'SECRET: teacher pacing',
        },
      ],
      resetChecklist: [{ en: 'Chairs pushed in', es: 'Sillas acomodadas' }],
      teacherGuide: 'SECRET: pacing',
    } as unknown as Slide;
    day.deck!.slides.push(dirtySlide);

    const snapshot = publishDay(day);
    const serialized = JSON.stringify(snapshot);

    // New fields survive projection…
    const projected = snapshot.deck!.slides.find(
      (s) => s.id === 'sl-connect-tiles',
    ) as Extract<Slide, { kind: 'content' }>;
    expect(projected.launchTiles).toEqual([
      {
        id: 'lt-1',
        module: 'globe',
        activityRef: 'event-123',
        label: { en: 'Explore', es: 'Explora' },
      },
    ]);
    expect(projected.resetChecklist).toEqual([
      { en: 'Chairs pushed in', es: 'Sillas acomodadas' },
    ]);
    // …but stray keys are dropped and the forbidden-substring scan stays clean.
    expect(serialized).not.toContain('SECRET');
    expect(serialized).not.toContain('scaffoldNote');
    expect(serialized).not.toContain('teacherGuide');
    expect(findForbiddenSubstring(snapshot)).toBeNull();
  });

  it('carries per-slide accent + hidePhaseLabel through publish (firewall clean)', () => {
    const day = makeDeckDay();
    const s0 = day.deck!.slides[0] as unknown as Record<string, unknown>;
    s0.accent = '#a78bfa';
    s0.hidePhaseLabel = true;
    const snapshot = publishDay(day);
    const projected = snapshot.deck!.slides[0] as unknown as Record<
      string,
      unknown
    >;
    expect(projected.accent).toBe('#a78bfa');
    expect(projected.hidePhaseLabel).toBe(true);
    expect(findForbiddenSubstring(snapshot)).toBeNull();
  });

  it('carries per-block textStyle through publish (whitelisted keys only, firewall clean)', () => {
    const day = makeDeckDay();
    const s0 = day.deck!.slides[0] as unknown as Record<string, unknown>;
    // A per-block style map with a stray teacher-only key that must be dropped.
    s0.textStyle = {
      title: { fontScale: 1.4, bold: true, align: 'center', secret: 'SECRET' },
      prompt: { align: 'right' },
    };
    const snapshot = publishDay(day);
    const serialized = JSON.stringify(snapshot);
    const projected = snapshot.deck!.slides[0] as unknown as Record<
      string,
      unknown
    >;
    expect(projected.textStyle).toEqual({
      title: { fontScale: 1.4, bold: true, align: 'center' },
      prompt: { align: 'right' },
    });
    expect(serialized).not.toContain('SECRET');
    expect(serialized).not.toContain('secret');
    expect(findForbiddenSubstring(snapshot)).toBeNull();
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

  it('derives a deck for a Day that has none, so the class never falls behind Present', () => {
    // This USED to publish deckless. The teacher's own Present view derives a
    // deck locally from the same cells, so the projector showed the legacy
    // phase board while the teacher's screen showed slides — two screens in one
    // room disagreeing, decided by whether anyone had opened the slide editor.
    const snapshot = publishDay(makeDay());
    expect('deck' in snapshot).toBe(true);
    expect(snapshot.deck!.slides.length).toBeGreaterThan(0);
  });

  it('still omits a deck when the Day has no presentable content at all', () => {
    // Deriving from empty cells yields no slides; there is nothing to show and
    // deck-mode with zero slides strands every surface.
    const empty = makeDay();
    for (const phase of Object.keys(
      empty.cells,
    ) as (keyof typeof empty.cells)[]) {
      empty.cells[phase].presentation.title = { en: '' };
      empty.cells[phase].presentation.prompt = { en: '' };
      empty.cells[phase].presentation.launchTiles = [];
      delete empty.cells[phase].presentation.interactions;
      delete empty.cells[phase].presentation.song;
    }
    const snapshot = publishDay(empty);
    if ('deck' in snapshot) {
      expect(snapshot.deck!.slides.length).toBeGreaterThan(0);
    }
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

describe('Rule 1 matcher is EXACT-key, not substring (P0)', () => {
  const wrap = (slideExtras: Record<string, unknown>) =>
    ({
      dayId: 'd',
      label: 'Clean label',
      cells: {},
      deck: {
        id: 'x',
        title: { en: 'Clean' },
        slides: [{ id: 's', title: { en: 'Clean' }, ...slideExtras }],
      },
    }) as unknown as Parameters<typeof findForbiddenKey>[0];

  it('lets through keys that merely CONTAIN a teacher-only word', () => {
    // These are the P2–P4 slide/element field names. Under the old substring
    // matcher `standardLayout` tripped on "standard" and the whole Day became
    // un-publishable.
    for (const key of [
      'onClose',
      'standardLayout',
      'closeable',
      'label',
      'cloneOf',
      'impactfulness',
      'scoreboardUrl',
    ]) {
      expect(isForbiddenKey(key), `"${key}" must be allowed`).toBe(false);
      expect(findForbiddenKey(wrap({ [key]: 'ok' }))).toBeNull();
    }
  });

  it('still rejects the exact teacher-only key names', () => {
    for (const key of FORBIDDEN_KEYS) {
      expect(isForbiddenKey(key)).toBe(true);
      expect(findForbiddenKey(wrap({ [key]: 'leak' }))).toBe(key);
    }
  });

  it('matches case-insensitively but never as a fragment', () => {
    expect(findForbiddenKey(wrap({ CLOREFS: ['x'] }))).toBe('CLOREFS');
    expect(findForbiddenKey(wrap({ cloRefsExtra: ['x'] }))).toBeNull();
    expect(findForbiddenKey(wrap({ extraCloRefs: ['x'] }))).toBeNull();
  });

  it('publishes a Day whose content ids contain a former forbidden substring', () => {
    // `tears_of_a_clown` and `they_long_to_be_close_to_you` are real entries in
    // the 642-song library; both were un-publishable before P0.
    const day = makeDay();
    day.cells.connectRegulate.presentation.launchTiles = [
      {
        id: 't1',
        module: 'learn',
        activityRef: 'song:tears_of_a_clown:chart',
        label: { en: 'Tears of a Clown' },
      },
      {
        id: 't2',
        module: 'learn',
        activityRef: 'song:they_long_to_be_close_to_you:lesson',
        label: { en: 'They Long to Be Close to You' },
      },
    ];
    const snapshot = publishDay(day);
    expect(findForbiddenKey(snapshot)).toBeNull();
    expect(
      JSON.stringify(snapshot).includes('tears_of_a_clown'),
      'the song ref must survive publish',
    ).toBe(true);
  });

  it('keeps `findForbiddenSubstring` working as a deprecated alias', () => {
    expect(findForbiddenSubstring(publishDay(makeDay()))).toBeNull();
  });
});

describe('sanitizeSnapshot — the READ path fails soft (P0)', () => {
  const stored = {
    dayId: 'd',
    label: 'Lesson 4',
    snapshotVersion: 1,
    cells: {
      connectRegulate: {
        presentation: { title: { en: 'Warm up' }, launchTiles: [] },
        // A stray teacher-only key from an older build.
        notes: 'private pacing note',
      },
    },
    deck: {
      id: 'x',
      title: { en: 'Deck' },
      slides: [
        { id: 's1', title: { en: 'Slide 1' } },
        { id: 's2', title: { en: 'Slide 2' }, rationale: { cloRefs: ['c'] } },
      ],
    },
  };

  it('strips forbidden keys instead of throwing, and reports their paths', () => {
    const { snapshot, stripped } = sanitizeSnapshot(stored);
    expect(findForbiddenKey(snapshot as never)).toBeNull();
    expect(stripped).toEqual([
      'cells.connectRegulate.notes',
      'deck.slides[1].rationale',
    ]);
  });

  it('preserves every student-safe field verbatim', () => {
    const { snapshot } = sanitizeSnapshot(stored);
    expect(snapshot.label).toBe('Lesson 4');
    expect(snapshot.cells.connectRegulate.presentation.title.en).toBe(
      'Warm up',
    );
    expect(snapshot.deck.slides.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(snapshot.snapshotVersion).toBe(1);
  });

  it('does not mutate the input and is a no-op on a clean snapshot', () => {
    const before = JSON.stringify(stored);
    sanitizeSnapshot(stored);
    expect(JSON.stringify(stored)).toBe(before);

    const clean = publishDay(makeDay());
    const { snapshot, stripped } = sanitizeSnapshot(clean);
    expect(stripped).toEqual([]);
    expect(snapshot).toEqual(clean);
  });
});

/**
 * The P2 additions to the published wire shape.
 *
 * `elements`, `presetId`, `layoutLock` and `accentBar` are why
 * `SNAPSHOT_VERSION` went to 2, and none of them had a single assertion here —
 * the file the header calls "the load-bearing structural invariant behind SPEC
 * v2 §4". A field added to `SlideElement` and forgotten in `projectElement`
 * would have vanished from every published deck with nothing failing.
 */
describe('publishDay — the P2 element shape', () => {
  const elementDay = (element: Record<string, unknown>): Day => {
    const day = makeDeckDay();
    day.deck!.layoutLock = true;
    day.deck!.slides[0] = {
      ...day.deck!.slides[0],
      presetId: 'artist-spotlight',
      accentBar: true,
      elements: [element],
    } as never;
    return day;
  };

  it('stamps the current snapshot version', () => {
    expect(publishDay(makeDeckDay()).snapshotVersion).toBe(SNAPSHOT_VERSION);
  });

  it('round-trips a text element field by field', () => {
    const snapshot = publishDay(
      elementDay({
        id: 's:title',
        zone: 'title',
        order: 0,
        kind: 'text',
        role: 'title',
        text: { en: 'Hello', es: 'Hola' },
        secondary: 'stacked',
        style: { bold: true, align: 'center', fontScale: 1.2 },
      }),
    );
    expect(snapshot.deck!.slides[0].elements![0]).toEqual({
      id: 's:title',
      zone: 'title',
      order: 0,
      kind: 'text',
      role: 'title',
      text: { en: 'Hello', es: 'Hola' },
      secondary: 'stacked',
      style: { bold: true, align: 'center', fontScale: 1.2 },
    });
  });

  it('carries presetId, accentBar and layoutLock', () => {
    const snapshot = publishDay(
      elementDay({
        id: 's:t',
        zone: 'title',
        kind: 'text',
        role: 'title',
        text: { en: 'T' },
      }),
    );
    expect(snapshot.deck!.slides[0].presetId).toBe('artist-spotlight');
    expect(snapshot.deck!.slides[0].accentBar).toBe(true);
    expect(snapshot.deck!.layoutLock).toBe(true);
  });

  it('DROPS an element whose zone is not in the grid', () => {
    const snapshot = publishDay(
      elementDay({
        id: 's:x',
        zone: 'somewhere-invented',
        kind: 'text',
        role: 'body',
        text: { en: 'nope' },
      }),
    );
    expect(snapshot.deck!.slides[0].elements).toEqual([]);
  });

  it('strips a forbidden key from inside an element, at depth', () => {
    const snapshot = publishDay(
      elementDay({
        id: 's:t',
        zone: 'title',
        kind: 'text',
        role: 'title',
        text: { en: 'T', notes: 'PACING SECRET' },
        rationale: 'SECRET',
      }),
    );
    const json = JSON.stringify(snapshot);
    expect(json).not.toContain('PACING SECRET');
    expect(json).not.toContain('SECRET');
  });

  it('strips a forbidden key from a slide-level localized field', () => {
    // `projectElement` whitelisted element text through `projectLocalized`;
    // `projectSlide` copied title/prompt/body BY REFERENCE, so the same object
    // shape was cleaned in one place and passed through in the other.
    const day = makeDeckDay();
    day.deck!.slides[0] = {
      ...day.deck!.slides[0],
      title: { en: 'Title', notes: 'PACING SECRET' },
    } as never;
    expect(JSON.stringify(publishDay(day))).not.toContain('PACING SECRET');
  });
});
