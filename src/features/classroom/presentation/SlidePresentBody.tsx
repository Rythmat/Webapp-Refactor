/**
 * SlidePresentBody — the shared "present" rendering of a content slide, now on
 * top of the freeform `SlideStage`. It builds a per-block node map (title /
 * prompt / media / launch tiles / reset checklist) and hands it to SlideStage,
 * which positions each block from the slide's resolved layout at
 * `surface='present'` scale with the per-phase accent.
 *
 * Rendered by (1) read-only Presentation Mode, (2) the WYSIWYG editor canvas
 * (which passes `blockOverrides` with editable pieces + `editable`/selection
 * callbacks), and (3) filmstrip thumbnails — so "editing == presenting" holds
 * by construction. Media is always the static `SlideMediaPanel` here (a live
 * YouTube iframe belongs to the projector only).
 */
import type { ReactNode } from 'react';
import { STUDENT_PHASE_LABELS } from '../phases';
import { SlideMediaPanel } from '../slides/parts/SlideMediaPanel';
import { SlideStage } from '../slides/parts/SlideStage';
import { SlidePrompt, SlideTitle } from '../slides/parts/SlideText';
import type {
  ContentSlide,
  Slide,
  SlideBlockKey,
  SlideLayout,
} from '../slides/types';
import type { StudentLanguage } from '../types';
import { LaunchTile } from './LaunchTile';
import { ResetChecklist } from './ResetChecklist';
import { pickLocalized } from './localized';
import { PHASE_ACCENT_HEX } from './phaseAccent';

/**
 * Adapt ANY deck slide into a content-shaped slide for the static Present
 * board: title / prompt / media are shown, live interactive widgets are not.
 * Content slides pass through with their tiles + checklist intact. Layout is
 * carried so the arrangement survives.
 */
export const slideToPresentContent = (slide: Slide): ContentSlide => ({
  id: slide.id,
  kind: 'content',
  phase: slide.phase,
  title: slide.title,
  ...(slide.prompt !== undefined ? { prompt: slide.prompt } : {}),
  ...(slide.layout !== undefined ? { layout: slide.layout } : {}),
  ...(slide.accent !== undefined ? { accent: slide.accent } : {}),
  ...(slide.textStyle !== undefined ? { textStyle: slide.textStyle } : {}),
  ...(slide.hidePhaseLabel !== undefined
    ? { hidePhaseLabel: slide.hidePhaseLabel }
    : {}),
  ...('media' in slide && slide.media ? { media: slide.media } : {}),
  ...('sideMedia' in slide && slide.sideMedia
    ? { sideMedia: slide.sideMedia }
    : {}),
  ...(slide.kind === 'content' && slide.launchTiles
    ? { launchTiles: slide.launchTiles }
    : {}),
  ...(slide.kind === 'content' && slide.resetChecklist
    ? { resetChecklist: slide.resetChecklist }
    : {}),
});

interface SlidePresentBodyProps {
  slide: ContentSlide;
  language: StudentLanguage;
  /** Editor: replace specific read-only blocks with editable nodes. */
  blockOverrides?: Partial<Record<SlideBlockKey, ReactNode>>;
  editable?: boolean;
  selectedBlock?: SlideBlockKey | null;
  onSelectBlock?: (key: SlideBlockKey | null) => void;
  onLayoutChange?: (next: SlideLayout) => void;
  /**
   * Opt-in: mount live media players (a playable YouTube iframe) instead of a
   * static thumbnail. Presentation Mode passes this; thumbnails/editor don't.
   */
  playableMedia?: boolean;
}

export const SlidePresentBody = ({
  slide,
  language,
  blockOverrides,
  editable = false,
  selectedBlock = null,
  onSelectBlock,
  onLayoutChange,
  playableMedia = false,
}: SlidePresentBodyProps) => {
  const labelPrimary = pickLocalized(
    STUDENT_PHASE_LABELS[slide.phase],
    language,
  );

  const readOnly: Partial<Record<SlideBlockKey, ReactNode>> = {
    title: (
      <SlideTitle
        title={slide.title}
        language={language}
        style={slide.textStyle?.title}
      />
    ),
    ...(slide.prompt
      ? {
          prompt: (
            <SlidePrompt
              prompt={slide.prompt}
              language={language}
              style={slide.textStyle?.prompt}
            />
          ),
        }
      : {}),
    ...(slide.media
      ? {
          media: (
            <SlideMediaPanel
              media={slide.media}
              language={language}
              interactive={playableMedia}
            />
          ),
        }
      : {}),
    ...(slide.sideMedia
      ? {
          sideMedia: (
            <SlideMediaPanel
              media={slide.sideMedia}
              language={language}
              interactive={playableMedia}
            />
          ),
        }
      : {}),
    ...(slide.launchTiles && slide.launchTiles.length > 0
      ? {
          launchTiles: (
            <div className="flex flex-wrap gap-3">
              {slide.launchTiles.map((tile) => (
                <LaunchTile
                  key={tile.id}
                  tile={tile}
                  language={language}
                  phaseLabel={labelPrimary}
                />
              ))}
            </div>
          ),
        }
      : {}),
    ...(slide.resetChecklist && slide.resetChecklist.length > 0
      ? {
          resetChecklist: (
            <ResetChecklist items={slide.resetChecklist} language={language} />
          ),
        }
      : {}),
  };

  const blocks = { ...readOnly, ...(blockOverrides ?? {}) };

  return (
    <SlideStage
      slide={slide}
      surface="present"
      language={language}
      blocks={blocks}
      accent={slide.accent ?? PHASE_ACCENT_HEX[slide.phase]}
      editable={editable}
      selectedBlock={selectedBlock}
      onSelectBlock={onSelectBlock}
      onLayoutChange={onLayoutChange}
    />
  );
};
