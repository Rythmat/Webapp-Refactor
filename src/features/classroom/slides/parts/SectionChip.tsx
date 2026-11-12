/**
 * A slide's section name, for places that say it in a sentence (an AppCard's
 * accessible name). Slides themselves no longer show their section (owner,
 * 2026-11-10): the projector's `SectionProgress` line marks it without words.
 */
import { pickLocalized } from '../../presentation/localized';
import type { StudentLanguage } from '../../types';
import { SECTION_LABEL, sectionOf } from '../sections';
import type { Slide } from '../types';

/** The section's name alone, for places that say it in a sentence. */
export const sectionLabelOf = (slide: Slide, language: StudentLanguage) =>
  pickLocalized(SECTION_LABEL[sectionOf(slide)], language);
