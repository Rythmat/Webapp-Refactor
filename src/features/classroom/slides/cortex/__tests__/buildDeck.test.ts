import { describe, expect, it } from 'vitest';
import { PHASES, type PhaseKey } from '../../../phases';
import { newBlankDay } from '../../../plan/newBlankDay';
import { findForbiddenKey, publishDay } from '../../../publish/publishDay';
import type { Day, Interaction } from '../../../types';
import { presetFor } from '../../templates/presets';
import type { Slide } from '../../types';
import {
  CORTEX_LESSON_TEMPLATE_ID,
  applyCortexLessonToDay,
  buildCortexLessonContent,
  buildCortexLessonSkeleton,
  isUngeneratedCortexDeck,
  roleAvailable,
} from '../buildDeck';
import { planCortexLesson } from '../planLesson';
import { searchFocus } from '../suggestFocus';
import {
  DEFAULT_CORTEX_CHOICES,
  type CortexLessonChoices,
  type GroupRole,
} from '../types';
import { fixture, fixtureCatalog } from './fixture';

const graph = fixture();
const catalog = fixtureCatalog();
const ana = searchFocus(graph, catalog, 'Ana Lux')[0];
const plan = planCortexLesson(graph, catalog, ana);

const choices = (
  role: GroupRole,
  over: Partial<CortexLessonChoices> = {},
): CortexLessonChoices => ({ ...DEFAULT_CORTEX_CHOICES, role, ...over });

const interactionIdsOf = (slide: Slide): string[] =>
  slide.kind === 'interaction'
    ? slide.interactionIds
    : slide.kind === 'app-route' || slide.kind === 'showcase'
      ? [slide.interactionId]
      : [];

/** Every slide's interactions are in its own phase's cell. */
const expectWired = (day: Day) => {
  for (const slide of day.deck!.slides) {
    const inCell = new Set(
      (day.cells[slide.phase].presentation.interactions ?? []).map((i) => i.id),
    );
    for (const id of interactionIdsOf(slide))
      expect(inCell.has(id), `${slide.id} → ${id}`).toBe(true);
  }
};

describe('a generated Cortex lesson', () => {
  const day = applyCortexLessonToDay(
    newBlankDay('Ana Lux'),
    plan,
    choices('promoter'),
    'test',
  );
  const slides = day.deck!.slides;

  it('runs Connection, Showcase, Group Project, Individual Project, Present in phase order', () => {
    expect(slides.map((s) => [s.phase, s.kind])).toEqual([
      ['connectRegulate', 'interaction'],
      ['connectRegulate', 'content'],
      ['connectRegulate', 'media'],
      ['groupPractice', 'app-route'],
      ['creativeProjects', 'app-route'],
      ['presentPerform', 'interaction'],
      ['presentPerform', 'showcase'],
    ]);
    const order = slides.map((s) => PHASES.indexOf(s.phase));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("wires every slide to an interaction in its own phase's cell", () => {
    expectWired(day);
  });

  it('uses presets that claim each slide’s kind', () => {
    for (const slide of slides) {
      if (!slide.presetId) continue;
      expect(presetFor(slide.presetId)?.kinds, slide.id).toContain(slide.kind);
    }
  });

  it('opens with a check-in and the mood poll, the check-in kept off the projector', () => {
    const [checkIn, vibe] = day.cells.connectRegulate.presentation
      .interactions as Interaction[];
    expect(checkIn).toMatchObject({
      type: 'check-in',
      shareable: false,
      checkIn: { style: 'emoji' },
    });
    expect(vibe).toMatchObject({
      type: 'choice',
      shareable: true,
      choice: { options: [{ en: 'groovy' }, { en: 'uplifting' }] },
    });
    expect(slides[0]).toMatchObject({ prompt: { en: 'Today: Ana Lux' } });
  });

  it('shows the focus with its facts and portrait, then its song', () => {
    expect(slides[1]).toMatchObject({
      kind: 'content',
      presetId: 'artist-spotlight',
      title: { en: 'Ana Lux' },
      media: { type: 'artistImage', songId: 'night_drive' },
      accent: '#0a9396',
    });
    expect((slides[1] as { body?: { en: string } }).body?.en).toContain(
      'Born in Motor City in 1950.',
    );
    expect(slides[2]).toMatchObject({
      kind: 'media',
      media: { type: 'youtube', videoId: 'nightDrive1', startSec: 12 },
    });
  });

  it("sends the Promoter to the Globe's mind map with the board", () => {
    const [group] = day.cells.groupPractice.presentation
      .interactions as Interaction[];
    expect(group.atlas).toMatchObject({
      module: 'globe',
      activityRef: 'globe:mindmap',
      expects: 'artifact',
      board: { focus: 'artist:ana-lux', goal: 5 },
    });
    expect(slides[3].title.en).toBe('Group Project: Promoter');
  });

  it('times the Individual Project and opens the Studio library', () => {
    expect(slides[4]).toMatchObject({
      presetId: 'personal-project-time',
      timerSec: 1200,
    });
    const [project] = day.cells.creativeProjects.presentation
      .interactions as Interaction[];
    expect(project.atlas).toEqual({
      module: 'studio',
      activityRef: 'studio:library',
      expects: 'artifact',
    });
  });

  it('asks for progress for the teacher only, then offers the project', () => {
    const [progress, share] = day.cells.presentPerform.presentation
      .interactions as Interaction[];
    expect(progress).toMatchObject({ type: 'text', shareable: false });
    expect(share).toMatchObject({ type: 'showcase', shareable: false });
  });

  it('records where it came from', () => {
    expect(day.deck!.templateRef).toEqual({
      templateId: CORTEX_LESSON_TEMPLATE_ID,
      focusId: 'artist:ana-lux',
      role: 'promoter',
      seed: 0,
      songId: 'night_drive',
    });
    expect(day.deck!.title).toEqual({
      en: 'Ana Lux · Promoter',
      es: 'Ana Lux · Promotor',
    });
  });

  it('puts the reasoning in the teacher-only notes, never on a slide', () => {
    const notes = day.cells.connectRegulate.rationale.notes;
    expect(notes).toMatch(/^— Cortex lesson —\nFocus: Ana Lux \(artist\)/);
    expect(notes).toContain('For the Teachers…');
    expect(JSON.stringify(day.deck)).not.toContain('Cortex lesson');
  });

  it('publishes clean through the firewall', () => {
    expect(findForbiddenKey(publishDay(day))).toBeNull();
  });
});

describe('each group role', () => {
  it('sends the Producer to the genre’s Studio tutorial', () => {
    const content = buildCortexLessonContent('p', plan, choices('producer'));
    expect(content.interactionsByPhase.groupPractice?.[0].atlas).toEqual({
      module: 'studio',
      activityRef: 'studio:tutorial:rnb-mix-and-polish',
      expects: 'completion',
    });
  });

  it('honours a tutorial the teacher picked', () => {
    const content = buildCortexLessonContent(
      'p',
      plan,
      choices('producer', { tutorialId: 'hiphop-build-the-beat' }),
    );
    expect(
      content.interactionsByPhase.groupPractice?.[0].atlas?.activityRef,
    ).toBe('studio:tutorial:hiphop-build-the-beat');
  });

  it('sends the Performer to a Learn lesson of a connected song', () => {
    const content = buildCortexLessonContent(
      'p',
      plan,
      choices('performer', { performerRef: 'song:sunrise:lesson' }),
    );
    expect(content.interactionsByPhase.groupPractice?.[0].atlas).toEqual({
      module: 'learn',
      activityRef: 'song:sunrise:lesson',
      expects: 'completion',
    });
    expect(content.cellCopy.groupPractice?.prompt.en).toBe(
      'Open the lesson and play it together as a class: “Sunrise” — D Dorian.',
    );
  });

  it('refuses a role the focus cannot support', () => {
    const thin = { ...plan, promoter: null };
    expect(roleAvailable(thin, 'promoter')).toBe(false);
    expect(() =>
      buildCortexLessonContent('p', thin, choices('promoter')),
    ).toThrow(/promoter/);
  });

  it('leaves the mood poll out when asked, or when there are too few vibes', () => {
    const off = buildCortexLessonContent(
      'p',
      plan,
      choices('promoter', { vibePoll: false }),
    );
    expect(off.interactionsByPhase.connectRegulate).toHaveLength(1);
    const none = buildCortexLessonContent(
      'p',
      { ...plan, vibes: ['groovy'] },
      choices('promoter'),
    );
    expect(none.interactionsByPhase.connectRegulate).toHaveLength(1);
    expect(none.slides[0]).not.toHaveProperty('reveal');
  });
});

describe('regenerating a Day', () => {
  const teacherQuestion: Interaction = {
    id: 'teacher-own',
    type: 'text',
    question: { en: 'Your own question' },
    shareable: true,
    text: { maxLen: 100 },
  };

  it('replaces the earlier generated interactions and keeps the teacher’s own', () => {
    const base = newBlankDay('Ana Lux');
    const withOwn: Day = {
      ...base,
      cells: {
        ...base.cells,
        groupPractice: {
          ...base.cells.groupPractice,
          presentation: {
            ...base.cells.groupPractice.presentation,
            interactions: [teacherQuestion],
          },
        },
      },
    };
    const first = applyCortexLessonToDay(
      withOwn,
      plan,
      choices('promoter'),
      'one',
    );
    const second = applyCortexLessonToDay(
      first,
      plan,
      choices('producer'),
      'two',
    );
    const group = second.cells.groupPractice.presentation.interactions ?? [];
    expect(group.map((i) => i.id)).toEqual([
      'teacher-own',
      `${base.id}-cx-two-ix-group`,
    ]);
    for (const phase of PHASES) {
      const ids = (
        second.cells[phase as PhaseKey].presentation.interactions ?? []
      )
        .map((i) => i.id)
        .filter((id) => id.includes('-cx-one-'));
      expect(ids, phase).toEqual([]);
    }
    expectWired(second);
    // One generated notes block, however often it is regenerated.
    expect(
      second.cells.connectRegulate.rationale.notes.match(/— Cortex lesson —/g),
    ).toHaveLength(1);
  });

  it('keeps the board copy a teacher (or the Teach year) wrote', () => {
    const base = newBlankDay('Planned');
    const planned: Day = {
      ...base,
      cells: {
        ...base.cells,
        connectRegulate: {
          ...base.cells.connectRegulate,
          presentation: {
            ...base.cells.connectRegulate.presentation,
            prompt: { en: 'Listen to Night Drive as you come in.' },
          },
        },
      },
    };
    const day = applyCortexLessonToDay(planned, plan, choices('promoter'));
    expect(day.cells.connectRegulate.presentation.prompt.en).toBe(
      'Listen to Night Drive as you come in.',
    );
    expect(day.cells.connectRegulate.presentation.title.en).toBe('Connection');
  });
});

describe('the default deck of a new Day', () => {
  const deck = buildCortexLessonSkeleton('day-1');

  it('has the five parts, waiting for a focus', () => {
    expect(deck.slides.map((s) => [s.phase, s.title.en])).toEqual([
      ['connectRegulate', 'Check in'],
      ['connectRegulate', 'Showcase'],
      ['groupPractice', 'Group Project'],
      ['creativeProjects', 'Individual Project'],
      ['presentPerform', 'Present your progress'],
    ]);
    expect(isUngeneratedCortexDeck(deck)).toBe(true);
    const generated = applyCortexLessonToDay(
      newBlankDay('x'),
      plan,
      choices('promoter'),
    );
    expect(isUngeneratedCortexDeck(generated.deck)).toBe(false);
  });

  it('asks nothing of the cells: content slides only, so a new Day stays empty', () => {
    expect(deck.slides.every((s) => s.kind === 'content')).toBe(true);
    const day = newBlankDay('Blank');
    for (const phase of PHASES)
      expect(day.cells[phase].presentation.interactions).toBeUndefined();
    expect(day.deck).toEqual({
      ...buildCortexLessonSkeleton(day.id),
    });
  });

  it("opens the Studio library from the Individual Project's tile", () => {
    const project = deck.slides[3];
    expect(project).toMatchObject({
      presetId: 'project-menu',
      launchTiles: [{ module: 'studio', activityRef: 'studio:library' }],
    });
  });
});
