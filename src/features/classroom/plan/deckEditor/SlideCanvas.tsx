/**
 * SlideCanvas — the WYSIWYG editor surface, now freeform. It renders the slide
 * through the shared `SlideStage` (via `SlidePresentBody`) so what the teacher
 * arranges is exactly what presents. In EN/ES it injects editable blocks
 * (title/prompt/media/tiles/checklist) as `blockOverrides`; each block can be
 * dragged, resized, and hidden. In "Both" it's a read-only bilingual preview.
 * Layout edits flow through `onPatch({ layout })` → the deck autosave.
 */
import type { ReactNode } from 'react';
import { cn } from '@/components/utilities';
import {
  SlidePresentBody,
  slideToPresentContent,
} from '../../presentation/SlidePresentBody';
import { showBlock } from '../../slides/slideLayout';
import type {
  Slide,
  SlideBlockKey,
  SlideBlockStyle,
  SlideLayout,
  SlideMedia,
} from '../../slides/types';
import type {
  AgePreset,
  Interaction,
  LaunchTile,
  LocalizedText,
  StudentLanguage,
} from '../../types';
import { EditableText } from './EditableText';
import { HiddenComponentsTray } from './HiddenComponentsTray';
import { LaunchTileRowEditor } from './LaunchTileRowEditor';
import { ResetChecklistEditor } from './ResetChecklistEditor';
import { SlideAppearanceMenu } from './SlideAppearanceMenu';
import { SlideMediaEditor } from './SlideMediaEditor';

type EditLanguage = 'en' | 'es';

interface SlideCanvasProps {
  slide: Slide;
  language: StudentLanguage;
  agePreset: AgePreset;
  onPatch: (patch: Partial<Slide>) => void;
  /** Lifted to the parent so the toolbar's text-format tool can target it. */
  selectedBlock: SlideBlockKey | null;
  onSelectBlock: (key: SlideBlockKey | null) => void;
  /** The slide's resolved student responses, shown read-only on the canvas. */
  interactions?: Interaction[];
}

const withLang = (
  lt: LocalizedText,
  lang: EditLanguage,
  value: string,
): LocalizedText => {
  const next: LocalizedText = { ...lt, [lang]: value };
  if (lang === 'es' && !value) delete next.es;
  return next;
};

/** Editable-text className additions (bold / alignment) from a block style. */
const textStyleClass = (style?: SlideBlockStyle): string =>
  cn(
    style?.bold && 'font-bold',
    style?.align === 'center' && 'text-center',
    style?.align === 'right' && 'text-right',
  );

/** A `--slide-*-fz` token scaled by the block's fontScale (so edit == present). */
const scaledFontVar = (token: string, style?: SlideBlockStyle): string =>
  `calc(${token} * ${style?.fontScale ?? 1})`;

export const SlideCanvas = ({
  slide,
  language,
  agePreset,
  onPatch,
  selectedBlock,
  onSelectBlock,
  interactions,
}: SlideCanvasProps) => {
  const editLang: EditLanguage | null = language === 'both' ? null : language;
  const editable = editLang !== null;
  const present = slideToPresentContent(slide);

  const overrides: Partial<Record<SlideBlockKey, ReactNode>> | undefined =
    editLang !== null
      ? {
          title: (
            <EditableText
              value={slide.title[editLang] ?? ''}
              onChange={(v) =>
                onPatch({ title: withLang(slide.title, editLang, v) })
              }
              placeholder="Slide title"
              fontSizeVar={scaledFontVar(
                'var(--slide-title-fz)',
                slide.textStyle?.title,
              )}
              className={cn(
                'font-semibold text-white',
                textStyleClass(slide.textStyle?.title),
              )}
              ariaLabel="Slide title"
            />
          ),
          prompt: (
            <EditableText
              value={slide.prompt?.[editLang] ?? ''}
              onChange={(v) =>
                onPatch({
                  prompt: withLang(slide.prompt ?? { en: '' }, editLang, v),
                })
              }
              placeholder="Prompt or instruction…"
              fontSizeVar={scaledFontVar(
                'var(--slide-prompt-fz)',
                slide.textStyle?.prompt,
              )}
              className={cn(
                'text-white/85',
                textStyleClass(slide.textStyle?.prompt),
              )}
              ariaLabel="Slide prompt"
            />
          ),
          ...('media' in slide
            ? {
                media: (
                  <SlideMediaEditor
                    media={slide.media}
                    language={language}
                    onChange={(media: SlideMedia | undefined) =>
                      onPatch({ media })
                    }
                  />
                ),
              }
            : {}),
          ...('sideMedia' in slide && slide.sideMedia
            ? {
                sideMedia: (
                  <SlideMediaEditor
                    media={slide.sideMedia}
                    language={language}
                    onChange={(sideMedia: SlideMedia | undefined) =>
                      onPatch({ sideMedia })
                    }
                  />
                ),
              }
            : {}),
          ...(slide.kind === 'content'
            ? {
                launchTiles: (
                  <LaunchTileRowEditor
                    tiles={slide.launchTiles ?? []}
                    onChange={(tiles: LaunchTile[]) =>
                      onPatch({
                        launchTiles: tiles.length ? tiles : undefined,
                      })
                    }
                  />
                ),
              }
            : {}),
          ...(slide.kind === 'content' && slide.phase === 'respondReflectReset'
            ? {
                resetChecklist: (
                  <ResetChecklistEditor
                    items={slide.resetChecklist ?? []}
                    onChange={(items: LocalizedText[]) =>
                      onPatch({
                        resetChecklist: items.length ? items : undefined,
                      })
                    }
                  />
                ),
              }
            : {}),
        }
      : undefined;

  return (
    <div
      className="presentation-root relative flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#141416]"
      data-age={agePreset}
    >
      <SlidePresentBody
        slide={present}
        language={language}
        blockOverrides={overrides}
        editable={editable}
        selectedBlock={selectedBlock}
        onSelectBlock={onSelectBlock}
        onLayoutChange={(layout: SlideLayout) => onPatch({ layout })}
        interactions={interactions}
      />
      {editable && <SlideAppearanceMenu slide={slide} onPatch={onPatch} />}
      {editable && (
        <HiddenComponentsTray
          slide={slide}
          onShow={(key) => onPatch({ layout: showBlock(slide, key) })}
        />
      )}
    </div>
  );
};
