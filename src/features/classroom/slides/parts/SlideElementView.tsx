/**
 * Renders ONE slide element. The counterpart to `slideGrid`'s geometry: the
 * grid says where an element goes, this says what it looks like.
 *
 * Every surface goes through here, which is the whole point of P2 — the teacher
 * arranging a slide, the projector showing it, and the student device following
 * it now draw from one description instead of three per-kind flow layouts that
 * silently disagreed.
 *
 * FIREWALL: this file never imports a response hook, the aggregator or the
 * roster. Interactive content reaches an element only through the pre-gated
 * `slots` the owning surface injects (`SlideRenderer`'s `SlideSlots`).
 */
import type { ReactNode } from 'react';
import { InteractionPreview } from '../../presentation/InteractionPreview';
import { LaunchTile } from '../../presentation/LaunchTile';
import { ResetChecklist } from '../../presentation/ResetChecklist';
import type {
  Interaction,
  LaunchTile as LaunchTileRef,
  StudentLanguage,
} from '../../types';
import type { SlideSlots } from '../SlideRenderer';
import type { SlideElement, SlideMedia, SlideSurface } from '../types';
import { QuestionText } from './InteractionBand';
import { SlideMediaPanel } from './SlideMediaPanel';
import { SlideBody, SlidePrompt, SlideTitle } from './SlideText';

/** Embed types that are really `SlideMedia` and render through the media panel. */
const MEDIA_TYPES = new Set([
  'youtube',
  'artistImage',
  'globePreview',
  'globePathway',
  'chordChart',
  'scaleKeyboard',
]);

/**
 * The Atlas module an activityRef belongs to, from its namespace. `LaunchTile`
 * needs it for the eyebrow label and the fallback base; the resolver itself
 * keys off the namespace, not this tag.
 */
const moduleForRef = (ref: string): LaunchTileRef['module'] =>
  ref.startsWith('globe:')
    ? 'globe'
    : ref.startsWith('studio:')
      ? 'studio'
      : ref.startsWith('arcade:')
        ? 'arcade'
        : 'learn';

export interface SlideElementViewProps {
  element: SlideElement;
  surface: SlideSurface;
  language: StudentLanguage;
  /** Resolved interactions for this slide, by id — never fetched here. */
  interactionsById: Record<string, Interaction>;
  /** Interaction ids the owning stage already renders in the reveal band. */
  hiddenInteractionIds?: readonly string[];
  /**
   * The editor's substitute for THIS element, if it has one.
   *
   * The editor edits slide-level fields, so its controls are keyed by block
   * key; `blockKeyForElement` maps a derived element back to the field it came
   * from. Resolved by the stage so this component stays a pure renderer.
   */
  override?: ReactNode;
  slots?: SlideSlots;
  /** Mount live players (projector/present) instead of static thumbnails. */
  playableMedia?: boolean;
  /** The slide's phase label, for a launch tile's eyebrow. */
  phaseLabel: string;
}

export const SlideElementView = ({
  element,
  surface,
  language,
  interactionsById,
  hiddenInteractionIds,
  override,
  slots,
  playableMedia = false,
  phaseLabel,
}: SlideElementViewProps): ReactNode => {
  // The editor swaps in its own editable control for the piece it is editing,
  // so the canvas shows the slide in its REAL zones while staying editable.
  if (override !== undefined) return override;

  switch (element.kind) {
    case 'text': {
      // `label` shares the body renderer; only its zone differs.
      if (element.role === 'title') {
        return (
          <SlideTitle
            title={element.text}
            language={language}
            style={element.style}
          />
        );
      }
      if (element.role === 'subtitle') {
        return (
          <SlidePrompt
            prompt={element.text}
            language={language}
            style={element.style}
          />
        );
      }
      return (
        <SlideBody
          body={element.text}
          language={language}
          style={element.style}
        />
      );
    }

    case 'checklist':
      return <ResetChecklist items={element.items} language={language} />;

    case 'content': {
      const { embed } = element;
      if (embed === null) {
        // P3 replaces this with the real link card; until then an Atlas ref
        // still renders as a tile so nothing disappears from a slide.
        return (
          <LaunchTile
            tile={{
              id: element.id,
              module: moduleForRef(
                element.href.kind === 'atlas' ? element.href.ref : '',
              ),
              activityRef:
                element.href.kind === 'atlas' ? element.href.ref : '',
              label: element.label,
            }}
            language={language}
            phaseLabel={phaseLabel}
          />
        );
      }
      if (embed.type === 'atlasCard') {
        return (
          <LaunchTile
            tile={{
              id: element.id,
              module: moduleForRef(embed.ref),
              activityRef: embed.ref,
              label: element.label,
            }}
            language={language}
            phaseLabel={phaseLabel}
          />
        );
      }
      if (embed.type === 'image') {
        // P4 ships the asset pipeline; an unresolved asset must not blank the
        // slide, so it degrades to its label.
        return (
          <div className="flex h-full w-full items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] text-sm text-white/40">
            {element.label.en}
          </div>
        );
      }
      if (MEDIA_TYPES.has(embed.type)) {
        return (
          <SlideMediaPanel
            media={embed as SlideMedia}
            language={language}
            interactive={playableMedia}
            {...(slots?.mediaCommand ? { command: slots.mediaCommand } : {})}
          />
        );
      }
      return null;
    }

    case 'interaction': {
      const interaction = interactionsById[element.interactionId];
      if (!interaction) return null;
      // The band already carries this question (and the student's input).
      // Drawing the footer preview too would show it twice.
      if (hiddenInteractionIds?.includes(element.interactionId)) return null;
      // The student answers; every other surface shows the question and its
      // answer shape. The REVEAL is not here — it is painted over the slide's
      // middle band by SlideStage, because it needs far more room than the
      // footer strip Rule 9 confines interaction elements to.
      if (surface === 'student') {
        // The question comes WITH the input. When the band carries this
        // interaction the footer element renders nothing at all (above), so
        // reaching here means the band bowed out — and an input under no
        // question is a student guessing what they are answering.
        return (
          <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
            <QuestionText question={interaction.question} language={language} />
            {slots?.input?.(interaction)}
          </div>
        );
      }
      return (
        <InteractionPreview interactions={[interaction]} language={language} />
      );
    }
  }
  return null;
};
