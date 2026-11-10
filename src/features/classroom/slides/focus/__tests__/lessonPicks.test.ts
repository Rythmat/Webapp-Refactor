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
    // The song and the globe follow it.
    expect(slides[at + 1]).toMatchObject({
      section: 'showcase',
      kind: 'interaction',
      presetId: 'bleed',
      media: { type: 'youtube' },
    });
    expect(slides[at + 2]).toMatchObject({
      section: 'showcase',
      presetId: 'bleed',
      media: { type: 'globePreview' },
    });
    expect(next.deck!.templateRef?.focusId).toBe(ana.id);
    expect(slides).toHaveLength(day.deck!.slides.length + 2);
    // The song's question is in the first phase's cell.
    const [listenId] = slideInteractionIds(slides[at + 1]);
    expect(
      next.cells.connectRegulate.presentation.interactions?.some(
        (i) => i.id === listenId,
      ),
    ).toBe(true);
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
    ).filter((i) => i.id.endsWith('-ix-listen'));
    expect(listens).toHaveLength(1);
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
