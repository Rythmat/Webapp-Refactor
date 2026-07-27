/**
 * Content slide — title / body / media composition (deck title card, section
 * headers, closing frames). The 'welcome' variant gets the biggest type and
 * a stronger glow (see .slide-frame--welcome in slides.css).
 */
import { pickLocalized, secondaryLine } from '../presentation/localized';
import type { Interaction, StudentLanguage } from '../types';
import type { SlideSlots } from './SlideRenderer';
import { SlideFrame } from './parts/SlideFrame';
import { SlideHeading } from './parts/SlideHeading';
import { SlideMediaPanel } from './parts/SlideMediaPanel';
import type { ContentSlide as ContentSlideModel, SlideSurface } from './types';

export interface ContentSlideProps {
  slide: ContentSlideModel;
  surface: SlideSurface;
  language: StudentLanguage;
  interactions: Interaction[];
  slots?: SlideSlots;
}

export const ContentSlide = ({
  slide,
  surface,
  language,
  slots,
}: ContentSlideProps) => {
  const isWelcome = slide.variant === 'welcome';
  const bodyText = slide.body ? pickLocalized(slide.body, language) : null;
  const bodyAlt = slide.body ? secondaryLine(slide.body, language) : null;

  return (
    <SlideFrame
      slide={slide}
      surface={surface}
      language={language}
      className={isWelcome ? 'slide-frame--welcome' : undefined}
    >
      <div
        className={`flex min-h-0 flex-1 flex-col gap-6 ${
          isWelcome ? 'items-center justify-center text-center' : ''
        }`}
      >
        <SlideHeading
          title={slide.title}
          prompt={slide.prompt}
          language={language}
        />

        {bodyText && (
          <div className="flex max-w-4xl flex-col gap-2">
            <p
              className="text-white/75"
              style={{ fontSize: 'var(--slide-body-fz)', lineHeight: 1.5 }}
            >
              {bodyText}
            </p>
            {bodyAlt && (
              <p
                className="text-white/40"
                style={{
                  fontSize: 'calc(var(--slide-body-fz) * 0.85)',
                  lineHeight: 1.5,
                }}
              >
                {bodyAlt}
              </p>
            )}
          </div>
        )}

        {slide.media && (
          <div className="flex min-h-0 w-full max-w-3xl flex-1 items-center">
            <SlideMediaPanel
              media={slide.media}
              language={language}
              interactive={surface === 'projector'}
              command={
                surface === 'projector' ? slots?.mediaCommand : undefined
              }
            />
          </div>
        )}
      </div>
    </SlideFrame>
  );
};
