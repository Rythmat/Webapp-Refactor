import { describe, expect, it, vi } from 'vitest';
import { newBlankDay } from '../../plan/newBlankDay';
import { pickLocalized } from '../../presentation/localized';
import type { Interaction } from '../../types';
import { applyCortexLessonToDay } from '../cortex/buildDeck';
import { loadLessonAtlas } from '../cortex/loadLessonAtlas';
import { planCortexLesson } from '../cortex/planLesson';
import { searchFocus } from '../cortex/suggestFocus';
import { DEFAULT_CORTEX_CHOICES } from '../cortex/types';
import { slideInteractionIds } from '../deck';
import { describeRef } from '../describeRef';
import { resolveElements } from '../migrateDeckV1';
import { SECTION_LABEL } from '../sections';
import { projectsQuestion, stageKindOf } from '../stage';
import type { Slide } from '../types';

/**
 * "Simple and clean, with no extra text at all" (owner, 2026-11-10), as a
 * test: the lesson being perfected first (Michael Jackson, Producer) built on
 * the real Atlas, and every word its slides put on the room's screen.
 *
 *   - a line is seven words at most; the portrait's bio 25;
 *   - one text a slide (the portrait: its name and its bio);
 *   - nothing a slide shows is a label (a section's name).
 */

vi.mock('@/content/contentStore', () => ({
  contentGeneration: 0,
  MUSIC_HISTORY: [],
}));

const LINE_WORDS = 7;
const BIO_WORDS = 25;

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/** What the room's screen shows for one slide, as its separate texts. */
const projectedTexts = (
  slide: Slide,
  interactions: readonly Interaction[],
): { role: string; text: string }[] => {
  const texts: { role: string; text: string }[] = [];
  for (const el of resolveElements(slide)) {
    if (el.hidden) continue;
    if (el.kind === 'text') texts.push({ role: el.role, text: el.text.en });
    if (el.kind === 'checklist')
      for (const item of el.items) texts.push({ role: 'item', text: item.en });
  }
  // The live layer: the question, or the class's activity by name.
  const ids = slideInteractionIds(slide);
  const own = interactions.filter((i) => ids.includes(i.id));
  if (slide.kind === 'interaction' && projectsQuestion(slide, 'projector'))
    for (const i of own)
      texts.push({ role: 'question', text: pickLocalized(i.question, 'en') });
  // A hero share slide says its own title until a project is featured.
  if (slide.kind === 'showcase' && stageKindOf(slide) === 'hero')
    texts.push({ role: 'heading', text: slide.title.en });
  if (slide.kind === 'app-route' && stageKindOf(slide) === 'hero')
    for (const i of own)
      if (i.atlas)
        texts.push({
          role: 'activity',
          text: describeRef(i.atlas.activityRef).title,
        });
  return texts;
};

describe('the first lesson, Michael Jackson · Producer', () => {
  it('puts few words on the room’s screen, and no labels', async () => {
    const { graph, catalog } = await loadLessonAtlas();
    const [mj] = searchFocus(graph, catalog, 'Michael Jackson');
    expect(mj?.id).toBe('artist:michael-jackson');
    const plan = planCortexLesson(graph, catalog, mj!);
    const day = applyCortexLessonToDay(
      newBlankDay('Michael Jackson'),
      plan,
      { ...DEFAULT_CORTEX_CHOICES, role: 'producer' },
      'budget',
    );
    const slides = day.deck!.slides;
    const interactions = Object.values(day.cells).flatMap(
      (c) => c.presentation.interactions ?? [],
    );

    // Ten slides: check-in; portrait, song, places; the class's tutorial;
    // own project; progress, show the class; exit ticket, reset.
    expect(slides).toHaveLength(10);

    const labels = new Set(
      Object.values(SECTION_LABEL).map((l) => l.en.toLowerCase()),
    );
    for (const slide of slides) {
      const texts = projectedTexts(slide, interactions);
      const portrait = stageKindOf(slide) === 'portrait';
      const textBlocks = texts.filter((t) => t.role !== 'item');
      expect(textBlocks.length, slide.id).toBeLessThanOrEqual(portrait ? 2 : 1);
      for (const { role, text } of texts) {
        expect(labels.has(text.toLowerCase()), `${slide.id}: "${text}"`).toBe(
          false,
        );
        const budget = portrait && role === 'body' ? BIO_WORDS : LINE_WORDS;
        expect(words(text), `${slide.id}: "${text}"`).toBeLessThanOrEqual(
          budget,
        );
      }
    }
  }, 60_000);
});
