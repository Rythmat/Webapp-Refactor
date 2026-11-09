/**
 * The slide's section, top-left on every surface: "1 · CONNECT". The lesson's
 * running order in the app's micro-label voice (bold small caps), with the
 * second language after it when the class sees both. Non-interactive, so it
 * never blocks the editor's selection beneath it.
 */
import { pickLocalized, secondaryLine } from '../../presentation/localized';
import type { StudentLanguage } from '../../types';
import { SECTION_LABEL, sectionNumber, sectionOf } from '../sections';
import type { Slide } from '../types';

export const SectionChip = ({
  slide,
  language,
}: {
  slide: Slide;
  language: StudentLanguage;
}) => {
  const section = sectionOf(slide);
  const label = pickLocalized(SECTION_LABEL[section], language);
  const alt = secondaryLine(SECTION_LABEL[section], language);
  return (
    <span
      data-section={section}
      className="inline-flex items-baseline gap-[0.5em] font-bold uppercase tracking-[0.08em] text-white/75"
      style={{ fontSize: 'var(--slide-label-fz)' }}
    >
      <span className="tabular-nums text-white/40">
        {sectionNumber(section)}
      </span>
      <span>
        {label}
        {alt && <span className="text-white/40"> · {alt}</span>}
      </span>
    </span>
  );
};

/** The section's name alone, for places that say it in a sentence. */
export const sectionLabelOf = (slide: Slide, language: StudentLanguage) =>
  pickLocalized(SECTION_LABEL[sectionOf(slide)], language);
