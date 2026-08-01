/**
 * SlidePresentBody — the single, shared "present" rendering of a content slide.
 * Composes `SlideFrame` + `SlideHeading` + a static `SlideMediaPanel` + the
 * launch-tile row + the reset checklist, at `surface='present'` scale with the
 * per-phase accent. It reads everything from ONE `ContentSlide` shape.
 *
 * This component is the reason "editing == presenting" holds by construction:
 * it is rendered by (1) read-only Presentation Mode (`PresentSlide`), (2) the
 * WYSIWYG editor canvas, and (3) the filmstrip thumbnails. Each caller may pass
 * `*Slot` overrides to swap a read-only piece for an editable one WITHOUT
 * duplicating the layout.
 *
 * IMPORTANT: it composes the slide parts directly rather than routing through
 * `SlideRenderer` — the latter would mount a live YouTube iframe for media at
 * `surface='present'`. Here media is always the static `SlideMediaPanel`.
 */
import type { CSSProperties, ReactNode } from 'react';
import { STUDENT_PHASE_LABELS } from '../phases';
import { SlideFrame } from '../slides/parts/SlideFrame';
import { SlideHeading } from '../slides/parts/SlideHeading';
import { SlideMediaPanel } from '../slides/parts/SlideMediaPanel';
import type { ContentSlide, Slide } from '../slides/types';
import type { LocalizedText, StudentLanguage } from '../types';
import { LaunchTile } from './LaunchTile';
import { pickLocalized } from './localized';
import { PHASE_ACCENT_HEX } from './phaseAccent';

/**
 * Adapt ANY deck slide into a content-shaped slide for the static Present
 * board: title / prompt / media are shown, live interactive widgets are not
 * (those render on the student devices + projector during a live session).
 * Content slides pass through with their launch tiles + reset checklist intact.
 */
export const slideToPresentContent = (slide: Slide): ContentSlide => ({
  id: slide.id,
  kind: 'content',
  phase: slide.phase,
  title: slide.title,
  ...(slide.prompt !== undefined ? { prompt: slide.prompt } : {}),
  ...('media' in slide && slide.media ? { media: slide.media } : {}),
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
  /** Override the read-only heading (editor injects an editable one). */
  headingSlot?: ReactNode;
  /** Override the whole media column, including its empty state. */
  mediaSlot?: ReactNode;
  /** Override the launch-tile row (editor injects add/edit affordances). */
  launchTilesSlot?: ReactNode;
  /** Override the reset checklist. */
  resetChecklistSlot?: ReactNode;
  /** Extra style merged onto the frame (accent is set automatically). */
  style?: CSSProperties;
  /** Extra content appended inside the frame body (e.g. editor toolbars). */
  children?: ReactNode;
}

export const SlidePresentBody = ({
  slide,
  language,
  headingSlot,
  mediaSlot,
  launchTilesSlot,
  resetChecklistSlot,
  style,
  children,
}: SlidePresentBodyProps) => {
  const accentStyle = {
    '--slide-accent': PHASE_ACCENT_HEX[slide.phase],
    ...(style ?? {}),
  } as CSSProperties;
  const labelPrimary = pickLocalized(STUDENT_PHASE_LABELS[slide.phase], language);

  const heading = headingSlot ?? (
    <SlideHeading
      title={slide.title}
      prompt={slide.prompt}
      language={language}
      className="flex-1"
    />
  );

  const media =
    mediaSlot ??
    (slide.media ? (
      <div className="w-full max-w-[min(38%,22rem)] shrink-0 self-center">
        <SlideMediaPanel media={slide.media} language={language} interactive={false} />
      </div>
    ) : null);

  const tiles =
    launchTilesSlot ??
    (slide.launchTiles && slide.launchTiles.length > 0 ? (
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
    ) : null);

  const checklist =
    resetChecklistSlot ??
    (slide.resetChecklist && slide.resetChecklist.length > 0 ? (
      <ResetChecklist items={slide.resetChecklist} language={language} />
    ) : null);

  return (
    <SlideFrame
      slide={slide}
      surface="present"
      language={language}
      style={accentStyle}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-8">
        {/* Headline + optional artwork, centred to fill the canvas. */}
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-8 lg:flex-row lg:items-center">
          {heading}
          {media}
        </div>
        {tiles}
        {checklist}
        {children}
      </div>
    </SlideFrame>
  );
};

interface ResetChecklistProps {
  items: LocalizedText[];
  language: StudentLanguage;
}

/**
 * Reflect-phase reset checklist. Check state is deliberately ephemeral — it
 * lives in the uncontrolled inputs and evaporates when the slide unmounts.
 */
const ResetChecklist = ({ items, language }: ResetChecklistProps) => (
  <ul className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
    {items.map((item, i) => (
      <li key={i}>
        <label className="flex cursor-pointer items-center gap-3 text-white/85">
          <input type="checkbox" className="size-5 accent-white" />
          <span style={{ fontSize: 'var(--slide-body-fz)' }}>
            {pickLocalized(item, language)}
          </span>
        </label>
      </li>
    ))}
  </ul>
);
