/**
 * Shared helpers for rendering LocalizedText inside Presentation Mode.
 *
 * `pickLocalized` implements the brief's per-field language resolution:
 *   - 'en' → English
 *   - 'es' → Spanish, falling back to English if `es` is missing
 *   - 'both' → English (the Focus / Board renders both stacked separately)
 */
import type { LocalizedText, StudentLanguage } from '../types';

export const pickLocalized = (
  text: LocalizedText,
  language: StudentLanguage,
): string => {
  if (language === 'es') {
    return text.es ?? text.en;
  }
  return text.en;
};

/**
 * When rendering `language === 'both'`, callers show two stacked strings:
 * the English on top and the Spanish underneath. Returns null for the
 * Spanish line when no translation exists so the caller can skip the
 * empty row.
 */
export const secondaryLine = (
  text: LocalizedText,
  language: StudentLanguage,
): string | null => {
  if (language === 'both' && text.es) return text.es;
  return null;
};
