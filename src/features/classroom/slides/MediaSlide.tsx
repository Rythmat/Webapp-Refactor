/**
 * Media slide (step 3) — YouTube + featured visual + displayed prompt.
 *
 * The video is interactive ONLY on the projector surface (classroom reality:
 * one screen with speakers; the teacher clicks play on the projector
 * machine, which also sidesteps autoplay restrictions). Students get the
 * prompt + an animated "watch the screen" panel; the teacher gets a static
 * thumbnail + a "plays on the projector" note.
 */
import { pickLocalized, secondaryLine } from '../presentation/localized';
import type { Interaction, LocalizedText, StudentLanguage } from '../types';
import type { SlideSlots } from './SlideRenderer';
import { SlideFrame } from './parts/SlideFrame';
import { SlideHeading } from './parts/SlideHeading';
import { SlideMediaPanel } from './parts/SlideMediaPanel';
import { WatchTheScreen } from './parts/WatchTheScreen';
import type { MediaSlide as MediaSlideModel, SlideSurface } from './types';

const PLAYS_ON_PROJECTOR: LocalizedText = {
  en: 'Plays on the projector',
  es: 'Se reproduce en el proyector',
};

export interface MediaSlideProps {
  slide: MediaSlideModel;
  surface: SlideSurface;
  language: StudentLanguage;
  interactions: Interaction[];
  slots?: SlideSlots;
}

export const MediaSlide = ({
  slide,
  surface,
  language,
  slots,
}: MediaSlideProps) => {
  if (surface === 'student') {
    return (
      <SlideFrame slide={slide} surface={surface} language={language}>
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <SlideHeading
            title={slide.title}
            prompt={slide.prompt}
            language={language}
          />
          <div className="flex flex-1 items-center justify-center">
            <WatchTheScreen language={language} className="max-w-sm" />
          </div>
        </div>
      </SlideFrame>
    );
  }

  if (surface === 'teacher') {
    return (
      <SlideFrame slide={slide} surface={surface} language={language}>
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <SlideHeading
            title={slide.title}
            prompt={slide.prompt}
            language={language}
          />
          <div className="w-full max-w-md">
            <SlideMediaPanel
              media={slide.media}
              language={language}
              interactive={false}
            />
          </div>
          <p
            className="text-white/40"
            style={{ fontSize: 'var(--slide-body-fz)' }}
          >
            {pickLocalized(PLAYS_ON_PROJECTOR, language)}
            {secondaryLine(PLAYS_ON_PROJECTOR, language) && (
              <span> · {secondaryLine(PLAYS_ON_PROJECTOR, language)}</span>
            )}
          </p>
        </div>
      </SlideFrame>
    );
  }

  // Projector — two-zone ~62/38 layout, prompt in large type below.
  const promptText = slide.prompt
    ? pickLocalized(slide.prompt, language)
    : null;
  const promptAlt = slide.prompt ? secondaryLine(slide.prompt, language) : null;

  return (
    <SlideFrame slide={slide} surface={surface} language={language}>
      <div className="flex min-h-0 flex-1 flex-col gap-8">
        <SlideHeading title={slide.title} language={language} />

        <div className="flex min-h-0 flex-1 items-center gap-8">
          <div className="min-w-0 flex-[62]">
            <SlideMediaPanel
              media={slide.media}
              language={language}
              interactive
              command={slots?.mediaCommand}
            />
          </div>
          {slide.sideMedia && (
            <div className="min-w-0 flex-[38]">
              <SlideMediaPanel
                media={slide.sideMedia}
                language={language}
                interactive={false}
              />
            </div>
          )}
        </div>

        {promptText && (
          <div className="flex flex-col gap-2">
            <p
              className="text-white/90"
              style={{ fontSize: 'var(--slide-question-fz)', lineHeight: 1.3 }}
            >
              {promptText}
            </p>
            {promptAlt && (
              <p
                className="text-white/50"
                style={{
                  fontSize: 'calc(var(--slide-question-fz) * 0.6)',
                  lineHeight: 1.3,
                }}
              >
                {promptAlt}
              </p>
            )}
          </div>
        )}
      </div>
    </SlideFrame>
  );
};
