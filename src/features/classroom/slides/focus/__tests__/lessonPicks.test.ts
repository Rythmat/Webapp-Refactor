import { describe, expect, it } from 'vitest';
import { newBlankDay } from '../../../plan/newBlankDay';
import { publishDay, findForbiddenKey } from '../../../publish/publishDay';
import { fixture, fixtureCatalog } from '../../cortex/__tests__/fixture';
import { applyCortexLessonToDay } from '../../cortex/buildDeck';
import { planCortexLesson } from '../../cortex/planLesson';
import { searchFocus } from '../../cortex/suggestFocus';
import { DEFAULT_CORTEX_CHOICES } from '../../cortex/types';
import { slideInteractionIds } from '../../deck';
import { sectionOf } from '../../sections';
import { relatedForFocus } from '../lessonFocus';
import {
  applyGroupPick,
  applyShowcasePick,
  isShowcasePortrait,
} from '../lessonPicks';

const graph = fixture();
const catalog = fixtureCatalog();
const [ana] = searchFocus(graph, catalog, 'Ana Lux');
const plan = planCortexLesson(graph, catalog, ana);

const slideIn = (day: ReturnType<typeof newBlankDay>, section: string) =>
  day.deck!.slides.find((s) => sectionOf(s) === section)!;

describe('choosing the Showcase', () => {
  it('redraws the Showcase as three slides and makes the lesson about its subject', () => {
    const day = newBlankDay('Lesson');
    const showcase = slideIn(day, 'showcase');
    const next = applyShowcasePick(day, showcase.id, plan);
    const slides = next.deck!.slides;
    const at = slides.findIndex((s) => s.id === showcase.id);
    expect(slides[at]).toMatchObject({
      kind: 'content',
      section: 'showcase',
      presetId: 'portrait',
      title: { en: 'Ana Lux' },
      media: { type: 'artistImage' },
    });
    // The song (beside the class's questions) and the globe follow it.
    expect(slides[at + 1]).toMatchObject({
      section: 'showcase',
      kind: 'interaction',
      presetId: 'listen-questions',
      media: { type: 'youtube' },
    });
    expect(slides[at + 2]).toMatchObject({
      section: 'showcase',
      presetId: 'bleed',
      media: { type: 'globePreview' },
    });
    expect(next.deck!.templateRef?.focusId).toBe(ana.id);
    expect(slides).toHaveLength(day.deck!.slides.length + 2);
    // The song's questions are in the first phase's cell.
    const listenIds = slideInteractionIds(slides[at + 1]);
    expect(listenIds).toHaveLength(4);
    const cell = new Set(
      next.cells.connectRegulate.presentation.interactions?.map((i) => i.id),
    );
    expect(listenIds.every((id) => cell.has(id))).toBe(true);
    expect(findForbiddenKey(publishDay(next))).toBeNull();
  });

  it('replaces the earlier subject’s song and globe rather than adding more', () => {
    const day = newBlankDay('Lesson');
    const showcase = slideIn(day, 'showcase');
    const once = applyShowcasePick(day, showcase.id, plan);
    const twice = applyShowcasePick(once, showcase.id, plan);
    expect(twice.deck!.slides).toHaveLength(once.deck!.slides.length);
    const listens = (
      twice.cells.connectRegulate.presentation.interactions ?? []
    ).filter((i) => /-ix-listen-\d$/.test(i.id));
    expect(listens).toHaveLength(4);
  });
});

describe('the portrait carrying the check-in', () => {
  const lesson = applyCortexLessonToDay(
    newBlankDay('Lesson'),
    plan,
    { ...DEFAULT_CORTEX_CHOICES, role: 'producer' },
    't',
  );

  it('is the lesson’s first slide, in Connect', () => {
    const [first] = lesson.deck!.slides;
    expect(isShowcasePortrait(first)).toBe(true);
    expect(sectionOf(first)).toBe('connect');
    expect(first.presetId).toBe('portrait-check-in');
  });

  it('is the slide a new subject redraws, keeping the check-in', () => {
    const portrait = lesson.deck!.slides[0];
    const next = applyShowcasePick(lesson, portrait.id, plan);
    const slides = next.deck!.slides;
    expect(slides).toHaveLength(lesson.deck!.slides.length);
    expect(slides[0]).toMatchObject({
      id: portrait.id,
      section: 'connect',
      presetId: 'portrait-check-in',
    });
    expect(slideInteractionIds(slides[0])).toEqual(
      slideInteractionIds(portrait),
    );
    expect(slides.filter(isShowcasePortrait)).toHaveLength(1);
  });
});

describe('choosing the Group Project', () => {
  const related = relatedForFocus(plan, graph);

  it('turns the placeholder into the class activity', () => {
    const day = newBlankDay('Lesson');
    const group = slideIn(day, 'groupProject');
    const ref = related.producer[0].ref;
    const next = applyGroupPick(day, group.id, plan, 'producer', ref);
    const slide = next.deck!.slides.find((s) => s.id === group.id)!;
    expect(slide).toMatchObject({
      kind: 'app-route',
      section: 'groupProject',
      title: { en: 'Group Project: Producer' },
    });
    const [id] = slideInteractionIds(slide);
    const ix = next.cells.groupPractice.presentation.interactions?.find(
      (i) => i.id === id,
    );
    expect(ix?.atlas).toMatchObject({ module: 'studio', activityRef: ref });
    expect(next.deck!.templateRef?.role).toBe('producer');
    expect(findForbiddenKey(publishDay(next))).toBeNull();
  });

  it("sends the Promoter on the subject's Globe tour, together", () => {
    const day = newBlankDay('Lesson');
    const group = slideIn(day, 'groupProject');
    const tour = related.promoter.find((o) => o.ref.startsWith('globe:tour:'))!;
    const next = applyGroupPick(
      day,
      group.id,
      plan,
      'promoter',
      tour.ref,
      tour.label,
    );
    const slide = next.deck!.slides.find((s) => s.id === group.id)!;
    const [id] = slideInteractionIds(slide);
    const ix = next.cells.groupPractice.presentation.interactions?.find(
      (i) => i.id === id,
    );
    expect(ix?.atlas).toEqual({
      module: 'globe',
      activityRef: tour.ref,
      expects: 'completion',
      follow: true,
    });
    expect(slide.prompt?.en).toContain(tour.label);
    // `follow` survives publish: the class's tabs need it.
    const published = publishDay(
      next,
    ).cells.groupPractice.presentation.interactions?.find((i) => i.id === id);
    expect(published?.atlas?.follow).toBe(true);
  });

  it('swaps an activity in place, keeping its interaction', () => {
    const day = newBlankDay('Lesson');
    const group = slideIn(day, 'groupProject');
    const first = applyGroupPick(
      day,
      group.id,
      plan,
      'producer',
      related.producer[0].ref,
    );
    const before = slideInteractionIds(
      first.deck!.slides.find((s) => s.id === group.id)!,
    );
    const second = applyGroupPick(
      first,
      group.id,
      plan,
      'performer',
      related.performer[0].ref,
    );
    const slide = second.deck!.slides.find((s) => s.id === group.id)!;
    expect(slideInteractionIds(slide)).toEqual(before);
    expect(
      second.cells.groupPractice.presentation.interactions?.filter(
        (i) => i.id === before[0],
      ),
    ).toHaveLength(1);
    expect(slide.title.en).toBe('Group Project: Performer');
  });
});
