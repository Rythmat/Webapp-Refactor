/**
 * The kind-switch dispatcher every surface renders through. Shared,
 * student-safe slide content lives in the slide components; response data
 * only ever arrives via the pre-gated `slots` injected by the owning
 * surface (student InteractionInput, projector `buildVizAggregate`
 * visualizations, teacher aggregates).
 *
 * Firewall invariant (grep-able): slide components never import the live
 * response hooks, the response aggregator, or the enrollment roster.
 */
import type { ReactNode } from 'react';
import type { Interaction, StudentLanguage } from '../types';
import { interactionVariant, mayRevealOn } from './interactionPolicy';
import { resolveElements } from './migrateDeckV1';
import { InteractionBand } from './parts/InteractionBand';
import { slideLiveLayer } from './parts/SlideLiveLayer';
import { SlideStage } from './parts/SlideStage';
import { SlideStudio } from './parts/SlideStudio';
import type { ProjectPlace } from './projectPlaces';
import { liveRectOf, projectsQuestion, stageKindOf } from './stage';
import { studioTutorialOf, type StudioFollow } from './studio/slideStudio';
import type { Slide, SlideSurface } from './types';

export interface SlideSlots {
  /** Student-surface input for one interaction (existing InteractionInput). */
  input?: (interaction: Interaction) => ReactNode;
  /** Student-surface launch affordance for an app-route slide's atlas interaction. */
  launch?: (interaction: Interaction) => ReactNode;
  /** Student-surface pairing affordance for a studio-collab slide. */
  pairAction?: ReactNode;
  /** Projector-surface "now presenting" frame for a showcase slide (from state.showcase). */
  showcaseFrame?: ReactNode;
  /** Projector-surface remote play/pause command for a media/content slide's video. */
  mediaCommand?: { action: 'play' | 'pause'; atSec?: number; cmdId: number };
  /** Reveal visualization for one interaction (projector/teacher). Return null when not revealed. */
  reveal?: (interaction: Interaction) => ReactNode;
  /** Small live status element (participation count etc.). */
  statusChip?: ReactNode;
  /**
   * The live session a Group Practice slide's Studio does its tutorial with
   * (Present leads it, the room's screen watches). Absent outside a session:
   * the Studio runs the tutorial on its own.
   */
  studioFollow?: StudioFollow;
  /**
   * Student-surface, in a live session: open one of the Individual
   * Project's places inside the lesson (live/workspace), so the lesson keeps
   * running around the student's work. Absent elsewhere: the places are
   * links (Present, previews) or pictures (the room's screen).
   */
  openPlace?: (place: ProjectPlace) => void;
}

export interface SlideRendererProps {
  slide: Slide;
  surface: SlideSurface;
  language: StudentLanguage;
  /** Interactions resolved via interactionsForSlide(snapshot, slide). */
  interactions: Interaction[];
  slots?: SlideSlots;
  /**
   * `'reflow'` renders the derived reading column instead of the fitted stage.
   * Only the student surface passes it, and only below 768px (Rule 11) — the
   * elements and the gating are identical either way.
   */
  layoutMode?: 'stage' | 'reflow';
  /**
   * A thumbnail or a small preview: stills only, so a filmstrip never mounts
   * video players or live maps.
   */
  still?: boolean;
}

export const SlideRenderer = ({
  slide,
  surface,
  language,
  interactions,
  slots,
  layoutMode,
  still = false,
}: SlideRendererProps): JSX.Element => {
  // ── P2 zone mode ────────────────────────────────────────────────────────
  // `content` and `media` are pure layout — no slide-level slots — so they are
  // the first kinds to render through the ONE stage on every surface. Before
  // this, a content slide went through SlideStage on the teacher's Present view
  // and through a SlideFrame flow column on the projector and the student
  // device, so the same slide looked different on each.
  //
  // The interaction-bearing kinds still use their own components: they carry
  // Rule 2 slot semantics (a check-in never reveals on a projected surface, an
  // exit poll filters what it projects) that must be modelled before, not
  // dropped during, the move.
  // ── P2 zone mode: ONE renderer, every kind, every surface ───────────────
  // Zones above the band are identical on all four surfaces; only the band
  // differs, and it is built from pre-gated slots. That is what makes the
  // Capstone's "Present and the projector agree zone for zone" structural
  // rather than a thing to keep re-checking.
  //
  // The three `interaction` variants (check-in / exit poll / question) are a
  // RUNTIME fan-out over one slide kind, not three kinds. `interactionPolicy`
  // holds that predicate and the Rule 2 gating the deleted per-kind components
  // each spelled out per surface, so the stage can render all of them and
  // still refuse to project a check-in.
  const variant =
    slide.kind === 'interaction'
      ? interactionVariant(slide, interactions)
      : null;

  const revealed =
    variant === null
      ? []
      : interactions
          .filter((i) => mayRevealOn(variant, surface, i))
          .map((i) => ({ i, node: slots?.reveal?.(i) ?? null }))
          .filter((r) => r.node !== null);

  /**
   * The interactions the BAND carries, so their footer elements stand down.
   *
   * Not just the `interaction` kind: `app-route` and `showcase` carry their
   * interaction in the band too (the launch affordance, the offer input) while
   * `migrateSlideV1` also derives a footer element for them — so a student saw
   * TWO controls for one question and could answer through either.
   * `studio-collab`'s pairing action is not an interaction at all, and
   * `content`/`media` have none.
   */
  const bandCarries =
    variant !== null
      ? interactions.map((i) => i.id)
      : slide.kind === 'app-route' || slide.kind === 'showcase'
        ? interactions.slice(0, 1).map((i) => i.id)
        : [];

  // A stage preset draws one thing big (`slides/stage.ts`); a full-screen
  // interaction slide asks its question on the students' devices only.
  const stage = stageKindOf(slide);
  // The Group Practice slide is the Studio itself on the room's screen and
  // Present (owner, 2026-11-10); a student's device keeps the tutorial's
  // card and launch, and a still its cover.
  const projected = surface === 'projector' || surface === 'present';
  const studioTutorial =
    projected && !still && layoutMode !== 'reflow'
      ? studioTutorialOf(slide, interactions)
      : null;
  // A split slide keeps its questions listed beside the video: a revealed
  // question's results take its own place in the list, not the whole band.
  const split = stage === 'split';
  const band =
    (revealed.length > 0 && !split) || studioTutorial ? null : variant !==
      null ? (
      projectsQuestion(slide, surface) ? (
        <InteractionBand
          interactions={interactions}
          surface={surface}
          language={language}
          slots={slots}
          teacherOnly={variant === 'check-in'}
          hero={stage === 'hero' || stage === 'bleed'}
          compact={Boolean(liveRectOf(slide))}
          list={split}
          {...(split && revealed.length > 0
            ? {
                reveals: Object.fromEntries(
                  revealed.map(({ i, node }) => [i.id, node]),
                ),
              }
            : {})}
        />
      ) : null
    ) : (
      slideLiveLayer({ slide, surface, language, interactions, slots, stage })
    );

  return (
    <SlideStage
      slide={slide}
      surface={surface}
      language={language}
      elements={resolveElements(slide)}
      interactionsById={Object.fromEntries(interactions.map((i) => [i.id, i]))}
      slots={slots}
      // The deleted `SlideFrame` applied the per-slide accent, and
      // and `SlideCanvas` still does — but SlideRenderer did not, so the
      // teacher picked a colour in the appearance menu, saw it on the editor
      // canvas, and the projector, the student device and Present all showed
      // the default. "Editing == presenting" failing in the one direction this
      // phase existed to fix.
      {...(slide.accent ? { accent: slide.accent } : {})}
      {...(layoutMode ? { layoutMode } : {})}
      {...(revealed.length > 0 && !split
        ? {
            reveal: (
              <div className="flex h-full w-full min-h-0 flex-col gap-4">
                {revealed.map(({ i, node }) => (
                  <div key={i.id} className="flex min-h-0 flex-1 flex-col">
                    {node}
                  </div>
                ))}
              </div>
            ),
          }
        : band
          ? { bandFallback: band }
          : {})}
      {...(bandCarries.length > 0 ? { bandInteractionIds: bandCarries } : {})}
      {...(studioTutorial
        ? {
            backdrop: (
              <SlideStudio
                tutorialId={studioTutorial}
                follow={slots?.studioFollow}
                inert={surface === 'projector'}
              />
            ),
          }
        : {})}
      liveBand={surface !== 'student'}
      playableMedia={
        !still && (surface === 'projector' || surface === 'present')
      }
      still={still}
      blocks={{}}
    />
  );
};
