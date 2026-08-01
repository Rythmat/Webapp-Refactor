/**
 * SlideCanvas — the editable slide, rendered through the SAME `SlidePresentBody`
 * the projector/Present use, inside a `.presentation-root[data-age]` wrapper so
 * the type scale is identical to presenting. In EN/ES mode the title/prompt/
 * media/tiles/checklist become editable in place; in "Both" mode it renders the
 * read-only bilingual preview.
 */
import {
  SlidePresentBody,
  slideToPresentContent,
} from '../../presentation/SlidePresentBody';
import type { Slide, SlideMedia } from '../../slides/types';
import type {
  AgePreset,
  LaunchTile,
  LocalizedText,
  StudentLanguage,
} from '../../types';
import { EditableText } from './EditableText';
import { LaunchTileRowEditor } from './LaunchTileRowEditor';
import { ResetChecklistEditor } from './ResetChecklistEditor';
import { SlideMediaEditor } from './SlideMediaEditor';

type EditLanguage = 'en' | 'es';

interface SlideCanvasProps {
  slide: Slide;
  language: StudentLanguage;
  agePreset: AgePreset;
  onPatch: (patch: Partial<Slide>) => void;
}

const withLang = (
  lt: LocalizedText,
  lang: EditLanguage,
  value: string,
): LocalizedText => {
  const next: LocalizedText = { ...lt, [lang]: value };
  // Drop the `es` key when cleared so the fallback path stays clean.
  if (lang === 'es' && !value) delete next.es;
  return next;
};

export const SlideCanvas = ({
  slide,
  language,
  agePreset,
  onPatch,
}: SlideCanvasProps) => {
  const presentSlide = slideToPresentContent(slide);
  const editLang: EditLanguage | null = language === 'both' ? null : language;

  const body =
    editLang === null ? (
      // "Both" = read-only bilingual preview.
      <SlidePresentBody slide={presentSlide} language={language} />
    ) : (
      <SlidePresentBody
        slide={presentSlide}
        language={language}
        headingSlot={
          <div className="flex flex-1 flex-col gap-2">
            <EditableText
              value={slide.title[editLang] ?? ''}
              onChange={(v) => onPatch({ title: withLang(slide.title, editLang, v) })}
              placeholder="Slide title"
              fontSizeVar="var(--slide-title-fz)"
              className="font-semibold text-white"
              ariaLabel="Slide title"
            />
            <EditableText
              value={slide.prompt?.[editLang] ?? ''}
              onChange={(v) =>
                onPatch({
                  prompt: withLang(slide.prompt ?? { en: '' }, editLang, v),
                })
              }
              placeholder="Prompt or instruction…"
              fontSizeVar="var(--slide-prompt-fz)"
              className="text-white/85"
              ariaLabel="Slide prompt"
            />
          </div>
        }
        mediaSlot={
          'media' in slide ? (
            <SlideMediaEditor
              media={slide.media}
              language={language}
              onChange={(media: SlideMedia | undefined) => onPatch({ media })}
            />
          ) : null
        }
        launchTilesSlot={
          slide.kind === 'content' ? (
            <LaunchTileRowEditor
              tiles={slide.launchTiles ?? []}
              onChange={(tiles: LaunchTile[]) =>
                onPatch({ launchTiles: tiles.length ? tiles : undefined })
              }
            />
          ) : null
        }
        resetChecklistSlot={
          slide.kind === 'content' && slide.phase === 'respondReflectReset' ? (
            <ResetChecklistEditor
              items={slide.resetChecklist ?? []}
              onChange={(items: LocalizedText[]) =>
                onPatch({ resetChecklist: items.length ? items : undefined })
              }
            />
          ) : null
        }
      />
    );

  return (
    <div
      className="presentation-root relative flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#141416]"
      data-age={agePreset}
    >
      {body}
    </div>
  );
};
