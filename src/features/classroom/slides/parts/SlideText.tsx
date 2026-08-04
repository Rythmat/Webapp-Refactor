/**
 * Shared title / prompt / body text blocks — used by both the present body
 * (SlidePresentBody) and the live per-kind renderers (ContentSlide) so a slide's
 * text looks identical whether it's authored, presented, or projected. Sizes
 * come from the per-surface `--slide-*-fz` tokens; 'both' mode stacks the ES
 * line via `secondaryLine`. An optional per-block `SlideBlockStyle` scales the
 * font, toggles bold, and sets paragraph alignment (teacher text-format tool).
 */
import { cn } from '@/components/utilities';
import { pickLocalized, secondaryLine } from '../../presentation/localized';
import type { LocalizedText, StudentLanguage } from '../../types';
import type { SlideBlockStyle } from '../types';

/** Scale a `--slide-*-fz` token by the block's fontScale (× an optional base). */
const scaledFz = (token: string, scale: number | undefined, base = 1): string =>
  `calc(${token} * ${(scale ?? 1) * base})`;

export const SlideTitle = ({
  title,
  language,
  style,
}: {
  title: LocalizedText;
  language: StudentLanguage;
  style?: SlideBlockStyle;
}) => {
  const alt = secondaryLine(title, language);
  const weight = style?.bold ? 'font-bold' : 'font-semibold';
  return (
    <div className="flex flex-col gap-2">
      <h1
        className={cn('leading-tight text-white', weight)}
        style={{
          fontSize: scaledFz('var(--slide-title-fz)', style?.fontScale),
          textAlign: style?.align,
        }}
      >
        {pickLocalized(title, language)}
      </h1>
      {alt && (
        <p
          className={cn('text-white/50', style?.bold && 'font-bold')}
          style={{
            fontSize: scaledFz('var(--slide-title-fz)', style?.fontScale, 0.5),
            textAlign: style?.align,
          }}
        >
          {alt}
        </p>
      )}
    </div>
  );
};

export const SlidePrompt = ({
  prompt,
  language,
  style,
}: {
  prompt: LocalizedText;
  language: StudentLanguage;
  style?: SlideBlockStyle;
}) => {
  const alt = secondaryLine(prompt, language);
  return (
    <div className="flex flex-col gap-1">
      <p
        className={cn('text-white/85', style?.bold && 'font-bold')}
        style={{
          fontSize: scaledFz('var(--slide-prompt-fz)', style?.fontScale),
          lineHeight: 1.4,
          textAlign: style?.align,
        }}
      >
        {pickLocalized(prompt, language)}
      </p>
      {alt && (
        <p
          className={cn('text-white/50', style?.bold && 'font-bold')}
          style={{
            fontSize: scaledFz(
              'var(--slide-prompt-fz)',
              style?.fontScale,
              0.75,
            ),
            lineHeight: 1.4,
            textAlign: style?.align,
          }}
        >
          {alt}
        </p>
      )}
    </div>
  );
};

export const SlideBody = ({
  body,
  language,
  style,
}: {
  body: LocalizedText;
  language: StudentLanguage;
  style?: SlideBlockStyle;
}) => {
  const alt = secondaryLine(body, language);
  return (
    <div className="flex flex-col gap-2">
      <p
        className={cn('text-white/75', style?.bold && 'font-bold')}
        style={{
          fontSize: scaledFz('var(--slide-body-fz)', style?.fontScale),
          lineHeight: 1.5,
          textAlign: style?.align,
        }}
      >
        {pickLocalized(body, language)}
      </p>
      {alt && (
        <p
          className={cn('text-white/40', style?.bold && 'font-bold')}
          style={{
            fontSize: scaledFz('var(--slide-body-fz)', style?.fontScale, 0.85),
            lineHeight: 1.5,
            textAlign: style?.align,
          }}
        >
          {alt}
        </p>
      )}
    </div>
  );
};
