import { describe, expect, it } from 'vitest';
import { newBlankDay } from '../../../plan/newBlankDay';
import { publishDay, findForbiddenKey } from '../../../publish/publishDay';
import { fixture, fixtureCatalog } from '../../cortex/__tests__/fixture';
import { planCortexLesson } from '../../cortex/planLesson';
import { searchFocus } from '../../cortex/suggestFocus';
import { slideInteractionIds } from '../../deck';
import { sectionOf } from '../../sections';
import { relatedForFocus } from '../lessonFocus';
import { applyGroupPick, applyShowcasePick } from '../lessonPicks';

const graph = fixture();
const catalog = fixtureCatalog();
const [ana] = searchFocus(graph, catalog, 'Ana Lux');
const plan = planCortexLesson(graph, catalog, ana);

const slideIn = (day: ReturnType<typeof newBlankDay>, section: string) =>
  day.deck!.slides.find((s) => sectionOf(s) === section)!;

describe('choosing the Showcase', () => {
  it('redraws the Showcase slide and makes the lesson about its subject', () => {
    const day = newBlankDay('Lesson');
    const showcase = slideIn(day, 'showcase');
    const next = applyShowcasePick(day, showcase.id, plan);
    const slide = next.deck!.slides.find((s) => s.id === showcase.id)!;
    expect(slide).toMatchObject({
      kind: 'content',
      section: 'showcase',
      presetId: 'showcase',
      title: { en: 'Ana Lux' },
      media: { type: 'globePreview' },
      sideMedia: { type: 'artistImage' },
    });
    expect(next.deck!.templateRef?.focusId).toBe(ana.id);
    expect(next.deck!.slides).toHaveLength(day.deck!.slides.length);
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
