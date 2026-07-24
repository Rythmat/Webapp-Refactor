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
import { AppRouteSlide } from './AppRouteSlide';
import { CheckInSlide } from './CheckInSlide';
import { ContentSlide } from './ContentSlide';
import { ExitPollSlide } from './ExitPollSlide';
import { MediaSlide } from './MediaSlide';
import { QuestionSlide } from './QuestionSlide';
import { ShowcaseSlide } from './ShowcaseSlide';
import { StudioCollabSlide } from './StudioCollabSlide';
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
}

export interface SlideRendererProps {
  slide: Slide;
  surface: SlideSurface;
  language: StudentLanguage;
  /** Interactions resolved via interactionsForSlide(snapshot, slide). */
  interactions: Interaction[];
  slots?: SlideSlots;
}

export const SlideRenderer = ({
  slide,
  surface,
  language,
  interactions,
  slots,
}: SlideRendererProps): JSX.Element => {
  switch (slide.kind) {
    case 'content':
      return (
        <ContentSlide
          slide={slide}
          surface={surface}
          language={language}
          interactions={interactions}
          slots={slots}
        />
      );
    case 'media':
      return (
        <MediaSlide
          slide={slide}
          surface={surface}
          language={language}
          interactions={interactions}
          slots={slots}
        />
      );
    case 'interaction': {
      const allCheckIn =
        interactions.length > 0 &&
        interactions.every((i) => i.type === 'check-in');
      if (allCheckIn) {
        return (
          <CheckInSlide
            slide={slide}
            surface={surface}
            language={language}
            interactions={interactions}
            slots={slots}
          />
        );
      }
      if (slide.phase === 'respondReflectReset' && interactions.length > 1) {
        return (
          <ExitPollSlide
            slide={slide}
            surface={surface}
            language={language}
            interactions={interactions}
            slots={slots}
          />
        );
      }
      return (
        <QuestionSlide
          slide={slide}
          surface={surface}
          language={language}
          interactions={interactions}
          slots={slots}
        />
      );
    }
    case 'app-route':
      return (
        <AppRouteSlide
          slide={slide}
          surface={surface}
          language={language}
          interactions={interactions}
          slots={slots}
        />
      );
    case 'studio-collab':
      return (
        <StudioCollabSlide
          slide={slide}
          surface={surface}
          language={language}
          slots={slots}
        />
      );
    case 'showcase':
      return (
        <ShowcaseSlide
          slide={slide}
          surface={surface}
          language={language}
          interactions={interactions}
          slots={slots}
        />
      );
  }
};
