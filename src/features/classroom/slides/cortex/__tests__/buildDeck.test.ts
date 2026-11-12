import { describe, expect, it } from 'vitest';
import { isCellPopulated } from '../../../content/applySeed';
import { PHASES, type PhaseKey } from '../../../phases';
import { newBlankDay } from '../../../plan/newBlankDay';
import { findForbiddenKey, publishDay } from '../../../publish/publishDay';
import type { Day, Interaction } from '../../../types';
import { slidesAreSectionOrdered } from '../../sections';
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

/** The Individual Project's tiles: the five places, in order. */
const FIVE_PLACES = [
  { module: 'learn', activityRef: 'learn:home' },
  { module: 'learn', activityRef: 'learn:songs' },
  { module: 'studio', activityRef: 'studio:library' },
  { module: 'studio', activityRef: 'studio:editor' },
  { module: 'globe', activityRef: 'globe:home' },
];

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
  const slide = (suffix: string): Slide => {
    const found = slides.find((s) => s.id.endsWith(`-slide-${suffix}`));
    expect(found, suffix).toBeDefined();
    return found!;
  };

  it('runs the six sections in order, one idea a slide', () => {
    expect(slides.map((s) => [s.section, s.phase, s.kind, s.presetId])).toEqual(
      [
        // The check-in is asked on the portrait (owner, 2026-11-10), so it
        // is the Connect slide, the lesson's first (owner, 2026-11-12).
        ['connect', 'connectRegulate', 'interaction', 'portrait-check-in'],
        // The song beside the class's questions (owner, 2026-11-12).
        ['showcase', 'connectRegulate', 'interaction', 'listen-questions'],
        ['showcase', 'connectRegulate', 'content', 'bleed'],
        ['groupProject', 'groupPractice', 'app-route', 'hero'],
        ['individualProject', 'creativeProjects', 'content', 'project-menu'],
        ['present', 'presentPerform', 'interaction', 'hero'],
        ['present', 'presentPerform', 'showcase', 'hero'],
        ['reflect', 'respondReflectReset', 'interaction', 'hero'],
        ['reflect', 'respondReflectReset', 'content', undefined],
      ],
    );
    expect(slidesAreSectionOrdered(slides)).toBe(true);
    const order = slides.map((s) => PHASES.indexOf(s.phase));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('closes with an exit question the class may see, then the room reset', () => {
    const [exit] = day.cells.respondReflectReset.presentation
      .interactions as Interaction[];
    expect(exit).toMatchObject({
      type: 'text',
      shareable: true,
      // The Daily Plan Template's exit ticket.
      question: { en: 'What emotion did you aim for today?' },
    });
    expect(slide('exit')).toMatchObject({
      kind: 'interaction',
      interactionIds: [exit.id],
      reveal: 'wall',
    });
    expect(
      (slide('reset') as { resetChecklist?: unknown[] }).resetChecklist?.length,
    ).toBeGreaterThan(0);
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

  it('asks the energy check-in on the portrait, kept off the projector', () => {
    const [checkIn] = day.cells.connectRegulate.presentation
      .interactions as Interaction[];
    expect(checkIn).toMatchObject({
      type: 'check-in',
      shareable: false,
      checkIn: { style: 'feelings', level: 'energy' },
      question: { en: 'How are you feeling today?' },
    });
    // No page of its own (owner, 2026-11-10): the portrait asks it.
    expect(slides[0]).toMatchObject({
      kind: 'interaction',
      presetId: 'portrait-check-in',
      interactionIds: [checkIn.id],
    });
    expect(slides.some((s) => s.id.endsWith('-slide-connection'))).toBe(false);
  });

  it('keeps a page of its own for the faces and the wheel', () => {
    const faces = applyCortexLessonToDay(
      newBlankDay('Ana Lux'),
      plan,
      choices('promoter', { checkInLevel: 'simple' }),
      'faces',
    );
    expect(faces.deck!.slides[0]).toMatchObject({
      section: 'connect',
      presetId: 'hero',
    });
    expect(faces.deck!.slides[1]).toMatchObject({
      kind: 'content',
      presetId: 'portrait',
    });
  });

  it('shows the subject in three slides: portrait, song, places', () => {
    // 1. The photo edge to edge, the name and a short bio (and the check-in).
    expect(slide('showcase')).toMatchObject({
      kind: 'interaction',
      presetId: 'portrait-check-in',
      title: { en: 'Ana Lux' },
      media: { type: 'artistImage', songId: 'night_drive' },
      accent: '#0a9396',
    });
    const bio = (slide('showcase') as { body?: { en: string } }).body?.en;
    expect(bio).toContain('Born in Motor City in 1950.');
    expect(bio!.split(/\s+/).length).toBeLessThanOrEqual(25);
    // 2. The song on the left, the class's questions on the right: how it
    //    makes them feel and what it says, then what they hear in it.
    const asked = (
      day.cells.connectRegulate.presentation.interactions as Interaction[]
    ).filter((i) => /-ix-listen-\d$/.test(i.id));
    expect(asked.map((i) => i.question.en)).toEqual([
      'How does this song make you feel?',
      'What does the song want us to feel?',
      'Which instruments do you hear?',
      'What do you think the tempo is?',
    ]);
    for (const q of asked) {
      expect(q).toMatchObject({ type: 'choice', shareable: true });
      expect(q.question.es).toBeTruthy();
      expect(q.choice!.options.length).toBeGreaterThanOrEqual(4);
      for (const o of q.choice!.options) expect(o.es).toBeTruthy();
    }
    expect(asked.map((q) => q.choice!.multi)).toEqual([
      false,
      false,
      true,
      false,
    ]);
    expect(slide('listen')).toMatchObject({
      kind: 'interaction',
      presetId: 'listen-questions',
      media: { type: 'youtube', videoId: 'nightDrive1', startSec: 12 },
      interactionIds: asked.map((q) => q.id),
      reveal: 'bars',
    });
    // 3. The globe, full screen, through their places from where they began.
    const places = slide('places') as {
      media?: { type: string; stops?: { label?: { en: string } }[] };
    };
    expect(places).toMatchObject({ presetId: 'bleed' });
    expect(places.media?.type).toBe('globePreview');
    expect(places.media?.stops?.[0]?.label?.en).toBe('Motor City · 1950');
    // Each place says why it matters to the subject, from where they began.
    expect(
      (places.media?.stops?.[0] as { story?: { title: { en: string } } }).story
        ?.title.en,
    ).toBe('Ana Lux is born in Motor City in 1950.');
    // Each place opens the Globe section's own map there.
    for (const stop of places.media?.stops ?? [])
      expect((stop as { ref?: string }).ref).toMatch(/^(place:|event:|at:)/);
    // …and the refs survive publishing.
    const published = publishDay(day).deck?.slides.find((s) =>
      s.id.endsWith('-slide-places'),
    ) as { media?: { stops?: { ref?: string }[] } } | undefined;
    expect(
      (published?.media?.stops?.[0] as { story?: unknown } | undefined)?.story,
    ).toBeDefined();
    expect(published?.media?.stops?.[0]?.ref).toBe(
      (places.media?.stops?.[0] as { ref?: string }).ref,
    );
  });

  it('adds the mood poll as a slide of its own when asked', () => {
    const withPoll = applyCortexLessonToDay(
      newBlankDay('Ana Lux'),
      plan,
      choices('promoter', { vibePoll: true }),
      'poll',
    );
    const vibe = (
      withPoll.cells.connectRegulate.presentation.interactions as Interaction[]
    ).find((i) => i.type === 'choice');
    expect(vibe).toMatchObject({
      shareable: true,
      choice: { options: [{ en: 'groovy' }, { en: 'uplifting' }] },
    });
    expect(
      withPoll.deck!.slides.find((s) => s.id.endsWith('-slide-vibe')),
    ).toMatchObject({
      section: 'connect',
      presetId: 'hero',
      interactionIds: [vibe!.id],
      reveal: 'bars',
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
    // The slide is the activity, big; its title and headline are kept for
    // the editor and the board, not drawn (the hero preset hides them).
    expect(slide('group').title.en).toBe('Group Project: Promoter');
    expect(slide('group')).toMatchObject({
      presetId: 'hero',
      prompt: { en: 'Map Ana Lux’s connections on the Globe.' },
    });
    expect(group.question.en).toBe(
      "Find 5 connections to Ana Lux on the Globe and build a mind map. Submit it when you're done.",
    );
  });

  it('times the Individual Project and offers the five places', () => {
    expect(slide('project')).toMatchObject({
      presetId: 'project-menu',
      timerSec: 1200,
      launchTiles: FIVE_PLACES,
    });
    // A menu, not an activity: nothing to answer in the cell.
    expect(day.cells.creativeProjects.presentation.interactions ?? []).toEqual(
      [],
    );
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

  it('puts the reasoning and the talking points in the teacher-only notes', () => {
    const notes = day.cells.connectRegulate.rationale.notes;
    expect(notes).toMatch(/^— Cortex lesson —\nFocus: Ana Lux \(artist\)/);
    expect(notes).toContain('Talking points:\n• Born in Motor City in 1950.');
    expect(notes).toContain('For the Teachers…');
    expect(JSON.stringify(day.deck)).not.toContain('Cortex lesson');
  });

  it('fills each part’s activity, CLOs, standards and assessment', () => {
    // The Daily Plan Template (owner's Pedagogy Knowledge Base).
    for (const phase of PHASES) {
      const r = day.cells[phase].rationale;
      expect(r.activityRefs?.length, phase).toBeGreaterThan(0);
      expect(r.cloRefs.length, phase).toBe(r.activityRefs?.length);
      expect(r.standards.length, phase).toBeGreaterThan(0);
      expect(r.assessment?.en, phase).toBeTruthy();
    }
    expect(day.cells.connectRegulate.rationale.standards).toContain(
      'MU:Re7.1.E.8a',
    );
    expect(day.cells.respondReflectReset.rationale.standards).toEqual([
      'MU:Re9.1.E.8a',
    ]);
    expect(day.cells.groupPractice.rationale.cloRefs).toContain(
      'clo-learn-historical-connections',
    );
    // None of it reaches a student.
    const published = JSON.stringify(publishDay(day));
    expect(published).not.toContain('MU:Re9.1');
    expect(published).not.toContain('clo-learn-');
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
      // The class does it together, at the teacher's pace.
      follow: true,
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
      follow: true,
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
    // The mood poll's own question (the song's questions are choices too).
    const choiceIn = (c: ReturnType<typeof buildCortexLessonContent>) =>
      (c.interactionsByPhase.connectRegulate ?? []).filter(
        (i) => i.type === 'choice' && i.id.endsWith('-ix-vibe'),
      );
    expect(choiceIn(off)).toHaveLength(0);
    const none = buildCortexLessonContent(
      'p',
      { ...plan, vibes: ['groovy'] },
      choices('promoter', { vibePoll: true }),
    );
    expect(choiceIn(none)).toHaveLength(0);
    expect(none.slides.some((s) => s.id.endsWith('-slide-vibe'))).toBe(false);
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

  it('has the six sections, waiting for a focus', () => {
    expect(deck.slides.map((s) => [s.section, s.title.en])).toEqual([
      ['connect', 'Check in'],
      ['showcase', 'Showcase'],
      ['groupProject', 'Group Project'],
      ['individualProject', 'Where will you work today?'],
      ['present', 'Present your progress'],
      ['reflect', 'Before you go'],
      ['reflect', 'Reset the room'],
    ]);
    expect(isUngeneratedCortexDeck(deck)).toBe(true);
    const generated = applyCortexLessonToDay(
      newBlankDay('x'),
      plan,
      choices('promoter'),
    );
    expect(isUngeneratedCortexDeck(generated.deck)).toBe(false);
  });

  it('asks how students arrive and what they take away, and still counts as empty', () => {
    const day = newBlankDay('Blank');
    expect(day.deck).toEqual(buildCortexLessonSkeleton(day.id));
    expectWired(day);
    expect(day.cells.connectRegulate.presentation.interactions).toEqual([
      expect.objectContaining({
        type: 'check-in',
        checkIn: { style: 'feelings', level: 'simple' },
      }),
    ]);
    // The starters are the lesson's frame: seeding still fills every cell.
    for (const phase of PHASES)
      expect(isCellPopulated(day.cells[phase]), phase).toBe(false);
  });

  it('replaces its starters when Cortex generates the lesson', () => {
    const day = applyCortexLessonToDay(
      newBlankDay('Gen'),
      plan,
      choices('promoter'),
    );
    const ids = PHASES.flatMap((p) =>
      (day.cells[p].presentation.interactions ?? []).map((i) => i.id),
    );
    expect(ids.some((id) => /-cx-ix-(feelings|exit)$/.test(id))).toBe(false);
    expectWired(day);
  });

  it('offers the five places on the Individual Project', () => {
    const project = deck.slides[3];
    expect(project).toMatchObject({
      section: 'individualProject',
      presetId: 'project-menu',
      launchTiles: FIVE_PLACES,
    });
  });
});
