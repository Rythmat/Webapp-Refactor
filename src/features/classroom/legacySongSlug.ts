/**
 * Migration for Days materialized before the structured `presentation.song`
 * field existed: the old `seededDayFromStub` string-appended the song id to the
 * Connect prompt as `Song of the day: /songs/<id>` (EN) / `Canción del día:
 * /songs/<id>` (ES). Strip that trailing segment from any student-facing prompt
 * so the raw slug never renders, and recover the id where a caller wants it.
 *
 * Applied on BOTH student read paths — `buildStudentView` (Presentation Mode,
 * local Day) and `publishDay`/`fromPlannedDay` (published live-session + deck
 * surfaces) — so every surface agrees. No-op on prompts that never carried it
 * (all new Days: the materializer now writes the structured field).
 */
import type { LocalizedText } from './types';

export const LEGACY_SONG_SLUG_RE =
  /\s*\n+\s*(?:Song of the day|Canción del día):\s*\/songs\/([a-z0-9_-]+)\s*$/i;

export const stripLegacySongSlug = (
  text: LocalizedText,
): { prompt: LocalizedText; songId: string | null } => {
  let songId: string | null = null;
  const clean = (s: string): string => {
    const m = s.match(LEGACY_SONG_SLUG_RE);
    if (!m) return s;
    songId = songId ?? m[1];
    return s.replace(LEGACY_SONG_SLUG_RE, '');
  };
  const en = clean(text.en);
  const es = text.es !== undefined ? clean(text.es) : undefined;
  return {
    prompt: { en, ...(es !== undefined ? { es } : {}) },
    songId,
  };
};
