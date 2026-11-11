import type { Day } from '../../types';
import {
  cortexGroupActivity,
  showcaseParts,
  CORTEX_LESSON_TEMPLATE_ID,
} from '../cortex/buildDeck';
import type { CortexLessonPlan, GroupRole } from '../cortex/types';
import { slideInteractionIds } from '../deck';
import { newInteractionId, setSlideInteractions } from '../deckEdit';
import type { Slide, SlideDeckTemplateRef } from '../types';

// ── What the picker writes (owner, 2026-11-10) ─────────────────────────────
// Choosing the Showcase sets the lesson's subject and redraws the Showcase
// slide for it; choosing a Group Project activity makes that slide run it,
// for the whole class together. Pure: Day in, Day out, so the editor and the
// tests share one path.

const withTemplateRef = (
  day: Day,
  patch: Partial<SlideDeckTemplateRef>,
): Day =>
  day.deck
    ? {
        ...day,
        deck: {
          ...day.deck,
          templateRef: {
            ...(day.deck.templateRef ?? {
              templateId: CORTEX_LESSON_TEMPLATE_ID,
            }),
            ...patch,
          },
        },
      }
    : day;

const replaceSlide = (day: Day, slideId: string, next: Slide): Day =>
  day.deck
    ? {
        ...day,
        deck: {
          ...day.deck,
          slides: day.deck.slides.map((s) => (s.id === slideId ? next : s)),
        },
      }
    : day;

/** The slide without its stored elements, so its preset lays it out. */
const withoutElements = <T extends Slide>(slide: T): T => {
  const copy = { ...slide };
  delete copy.elements;
  return copy;
};

/** A Showcase slide built from a subject: its video, or its globe. */
const isSubjectSlide = (slide: Slide): boolean =>
  slide.section === 'showcase' &&
  (slide.id.endsWith('-slide-listen') || slide.id.endsWith('-slide-places'));

/**
 * Make `slideId` the Showcase for a plan's subject, and the lesson about it
 * (owner, 2026-11-10: three slides). The slide becomes the subject's
 * portrait, keeping its id and timer; the video and globe slides an earlier
 * subject brought are replaced by this one's, right after it.
 */
export const applyShowcasePick = (
  day: Day,
  slideId: string,
  plan: CortexLessonPlan,
): Day => {
  const slide = day.deck?.slides.find((s) => s.id === slideId);
  if (!slide || !day.deck) return day;

  // The old subject's video and globe go, with any question they asked.
  let next = day;
  for (const old of day.deck.slides) {
    if (old.id === slideId || !isSubjectSlide(old)) continue;
    next = setSlideInteractions(next, old.id, []);
  }
  // A portrait that asks the class's check-in keeps it (and its answers);
  // any other question it had is dropped with it.
  const checkInId =
    slide.kind === 'interaction' && slide.presetId === 'portrait-check-in'
      ? slide.interactionIds[0]
      : undefined;
  if (!checkInId && slideInteractionIds(slide).length > 0)
    next = setSlideInteractions(next, slideId, []);

  const prefix = slideId.endsWith('-slide-showcase')
    ? slideId.slice(0, -'-slide-showcase'.length)
    : `${slideId}-sc`;
  const parts = showcaseParts(prefix, plan, checkInId);
  const [portrait, ...rest] = parts.slides;
  const first: Slide = {
    ...(portrait as Slide),
    id: slide.id,
    ...(slide.timerSec !== undefined ? { timerSec: slide.timerSec } : {}),
  };

  const deck = next.deck!;
  const slides: Slide[] = [];
  for (const s of deck.slides) {
    if (s.id !== slideId && isSubjectSlide(s)) continue;
    if (s.id === slideId) slides.push(first, ...rest);
    else slides.push(s);
  }
  next = { ...next, deck: { ...deck, slides } };
  // The video's question lives in the first phase's cell, like every other.
  const listen = rest.find((s) => s.id.endsWith('-slide-listen'));
  if (listen) next = setSlideInteractions(next, listen.id, parts.interactions);
  return withTemplateRef(next, { focusId: plan.focus.id });
};

/**
 * Make `slideId` the Group Project: the class does `ref` together, as
 * `role`. An activity slide keeps its interaction's id, so its responses and
 * anything pointing at it survive; a placeholder becomes an activity slide.
 */
export const applyGroupPick = (
  day: Day,
  slideId: string,
  plan: CortexLessonPlan,
  role: GroupRole,
  ref: string,
  /** The activity's name, from the picker (a Globe tour's title). */
  label?: string,
): Day => {
  const slide = day.deck?.slides.find((s) => s.id === slideId);
  if (!slide) return day;
  const id =
    slide.kind === 'app-route' ? slide.interactionId : newInteractionId();
  const activity = cortexGroupActivity(id, plan, role, ref, label);
  if (!activity) return day;
  const routed: Slide =
    slide.kind === 'app-route'
      ? {
          // A new preset lays the slide out afresh: stored elements would
          // keep the old layout.
          ...withoutElements(slide),
          presetId: 'hero',
          title: activity.title,
          prompt: activity.prompt,
        }
      : {
          id: slide.id,
          kind: 'app-route',
          phase: 'groupPractice',
          section: 'groupProject',
          presetId: 'hero',
          title: activity.title,
          prompt: activity.prompt,
          interactionId: id,
          ...(slide.timerSec !== undefined ? { timerSec: slide.timerSec } : {}),
        };
  const placed = replaceSlide(day, slideId, routed);
  return withTemplateRef(
    setSlideInteractions(placed, slideId, [activity.interaction]),
    { role },
  );
};
