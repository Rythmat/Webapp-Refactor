/**
 * Bilingual slide heading — title plus optional prompt subtitle, rendered
 * per the presentation `localized.ts` conventions: 'en'/'es' pick one string
 * ('es' falls back to English), 'both' stacks the Spanish line underneath.
 * Type sizes come from the slide-frame's per-surface CSS tokens.
 */
import { pickLocalized, secondaryLine } from '../../presentation/localized';
import type { LocalizedText, StudentLanguage } from '../../types';

interface SlideHeadingProps {
  title: LocalizedText;
  prompt?: LocalizedText;
  language: StudentLanguage;
  className?: string;
}

export const SlideHeading = ({
  title,
  prompt,
  language,
  className,
}: SlideHeadingProps) => {
  const titleText = pickLocalized(title, language);
  const titleAlt = secondaryLine(title, language);
  const promptText = prompt ? pickLocalized(prompt, language) : null;
  const promptAlt = prompt ? secondaryLine(prompt, language) : null;

  return (
    <div className={`flex flex-col gap-2 ${className ?? ''}`}>
      <h1
        className="font-semibold leading-tight text-white"
        style={{ fontSize: 'var(--slide-title-fz)' }}
      >
        {titleText}
      </h1>
      {titleAlt && (
        <p
          className="text-white/50"
          style={{ fontSize: 'calc(var(--slide-title-fz) * 0.5)' }}
        >
          {titleAlt}
        </p>
      )}
      {promptText && (
        <p
          className="text-white/85"
          style={{ fontSize: 'var(--slide-prompt-fz)', lineHeight: 1.4 }}
        >
          {promptText}
        </p>
      )}
      {promptAlt && (
        <p
          className="text-white/50"
          style={{
            fontSize: 'calc(var(--slide-prompt-fz) * 0.75)',
            lineHeight: 1.4,
          }}
        >
          {promptAlt}
        </p>
      )}
    </div>
  );
};
