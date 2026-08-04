/**
 * Content slide — title / prompt / body / media. On the big-screen surfaces
 * (projector / teacher) it renders through the freeform `SlideStage`, so a
 * teacher's arrangement + any hidden blocks carry to the live projector. On a
 * student phone it keeps a readable reflow column but still honors `hidden`
 * (a removed title is gone everywhere). The 'welcome' variant centers its text.
 */
import type { ReactNode } from 'react';
import { STUDENT_PHASE_LABELS } from '../phases';
import { LaunchTile } from '../presentation/LaunchTile';
import { ResetChecklist } from '../presentation/ResetChecklist';
import { pickLocalized } from '../presentation/localized';
import type { Interaction, StudentLanguage } from '../types';
import type { SlideSlots } from './SlideRenderer';
import { SlideFrame } from './parts/SlideFrame';
import { SlideMediaPanel } from './parts/SlideMediaPanel';
import { SlideStage } from './parts/SlideStage';
import { SlideBody, SlidePrompt, SlideTitle } from './parts/SlideText';
import { isBlockHidden } from './slideLayout';
import type {
  ContentSlide as ContentSlideModel,
  SlideBlockKey,
  SlideSurface,
} from './types';

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
  const phaseLabel = pickLocalized(STUDENT_PHASE_LABELS[slide.phase], language);

  // Student phone: readable reflow column, honoring hidden blocks.
  if (surface === 'student') {
    return (
      <SlideFrame slide={slide} surface={surface} language={language}>
        <div
          className={`flex min-h-0 flex-1 flex-col gap-6 ${
            isWelcome ? 'items-center justify-center text-center' : ''
          }`}
        >
          {!isBlockHidden(slide, 'title') && (
            <SlideTitle
              title={slide.title}
              language={language}
              style={slide.textStyle?.title}
            />
          )}
          {slide.prompt && !isBlockHidden(slide, 'prompt') && (
            <SlidePrompt
              prompt={slide.prompt}
              language={language}
              style={slide.textStyle?.prompt}
            />
          )}
          {slide.body && !isBlockHidden(slide, 'body') && (
            <SlideBody
              body={slide.body}
              language={language}
              style={slide.textStyle?.body}
            />
          )}
          {slide.media && !isBlockHidden(slide, 'media') && (
            <div className="flex min-h-0 w-full max-w-3xl flex-1 items-center">
              <SlideMediaPanel
                media={slide.media}
                language={language}
                interactive={false}
              />
            </div>
          )}
          {slide.sideMedia && !isBlockHidden(slide, 'sideMedia') && (
            <div className="w-full max-w-xs">
              <SlideMediaPanel
                media={slide.sideMedia}
                language={language}
                interactive={false}
              />
            </div>
          )}
          {slide.launchTiles &&
            slide.launchTiles.length > 0 &&
            !isBlockHidden(slide, 'launchTiles') && (
              <div className="flex flex-wrap gap-3">
                {slide.launchTiles.map((tile) => (
                  <LaunchTile
                    key={tile.id}
                    tile={tile}
                    language={language}
                    phaseLabel={phaseLabel}
                  />
                ))}
              </div>
            )}
          {slide.resetChecklist &&
            slide.resetChecklist.length > 0 &&
            !isBlockHidden(slide, 'resetChecklist') && (
              <ResetChecklist
                items={slide.resetChecklist}
                language={language}
              />
            )}
        </div>
      </SlideFrame>
    );
  }

  // Projector / teacher: freeform stage honoring the slide's layout.
  const blocks: Partial<Record<SlideBlockKey, ReactNode>> = {
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
    ...(slide.body
      ? {
          body: (
            <SlideBody
              body={slide.body}
              language={language}
              style={slide.textStyle?.body}
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
              interactive={surface === 'projector'}
              command={
                surface === 'projector' ? slots?.mediaCommand : undefined
              }
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
              interactive={false}
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
                  phaseLabel={phaseLabel}
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

  return (
    <SlideStage
      slide={slide}
      surface={surface}
      language={language}
      blocks={blocks}
      accent={slide.accent}
    />
  );
};
