import type { Day } from '../../types';
import {
  cortexGroupActivity,
  showcaseSlideFields,
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

/**
 * Make `slideId` the Showcase for a plan's subject, and the lesson about it.
 * The slide keeps its id, phase, section and anything that describes the
 * slide rather than its content (timer, hidden label).
 */
export const applyShowcasePick = (
  day: Day,
  slideId: string,
  plan: CortexLessonPlan,
): Day => {
  const slide = day.deck?.slides.find((s) => s.id === slideId);
  if (!slide) return day;
  // A Showcase carries no question; any it had are dropped with it.
  const cleared =
    slideInteractionIds(slide).length > 0
      ? setSlideInteractions(day, slideId, [])
      : day;
  const next: Slide = {
    id: slide.id,
    kind: 'content',
    phase: 'connectRegulate',
    section: 'showcase',
    ...(slide.timerSec !== undefined ? { timerSec: slide.timerSec } : {}),
    ...(slide.hidePhaseLabel !== undefined
      ? { hidePhaseLabel: slide.hidePhaseLabel }
      : {}),
    ...showcaseSlideFields(plan),
  };
  return withTemplateRef(replaceSlide(cleared, slideId, next), {
    focusId: plan.focus.id,
  });
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
      ? { ...slide, title: activity.title, prompt: activity.prompt }
      : {
          id: slide.id,
          kind: 'app-route',
          phase: 'groupPractice',
          section: 'groupProject',
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
