/**
 * "Today's plan" template source — enrich an EXISTING Day (typically one
 * materialized from a curriculum DayStub via `seededDayFromStub`) with a Song
 * Session deck, instead of generating a fresh Day.
 *
 * Contract:
 *   - Returns a NEW Day; the input is never mutated.
 *   - Template interactions are APPENDED to the cells' existing interaction
 *     arrays — teacher-authored content is never clobbered.
 *   - Slide titles/prompts prefer the existing cell presentation copy when
 *     non-empty (phase seeds are already bilingual), falling back to the
 *     template's default copy.
 *   - `templateRef` carries curriculum provenance (unitSlug / dayStubSlug /
 *     themeId) for regenerate, analytics, and coverage reporting.
 *   - Without `opts.song` the artistless flow applies: generic welcome copy
 *     and no media slide.
 */
import type { Song } from '@/curriculum/types/songLibrary';
import { stripLegacySongSlug } from '../../legacySongSlug';
import { PHASES } from '../../phases';
import type { Day, DayCells, LocalizedText } from '../../types';
import type { Slide, SlideDeckTemplateRef } from '../types';
import {
  DEFAULT_SONG_SESSION_PARAMS,
  SONG_SESSION_TEMPLATE_ID,
  buildSongSessionContent,
  type SongSessionParams,
} from './songSession';

const hasText = (text: LocalizedText | undefined): boolean =>
  Boolean(text && text.en.trim() !== '');

/** Random suffix (same pattern as `newBlankDay`) so repeated enrichment of one Day can't collide ids. */
const enrichToken = (): string =>
  Math.floor(Math.random() * 1e6)
    .toString(36)
    .padStart(4, '0');

/** Prefer the owning cell's authored title/prompt over the template's copy. */
const preferCellCopy = (slide: Slide, cells: DayCells): Slide => {
  const { presentation } = cells[slide.phase];
  const prompt = hasText(presentation.prompt)
    ? stripLegacySongSlug(presentation.prompt).prompt
    : slide.prompt;
  return {
    ...slide,
    title: hasText(presentation.title) ? presentation.title : slide.title,
    ...(prompt !== undefined ? { prompt } : {}),
  };
};

export function enrichDayWithSongSessionDeck(
  day: Day,
  opts: {
    song?: Song;
    params?: Partial<SongSessionParams>;
    unitSlug?: string;
    dayStubSlug?: string;
    themeId?: string;
  },
): Day {
  const params: SongSessionParams = {
    ...DEFAULT_SONG_SESSION_PARAMS,
    ...opts.params,
  };
  const idPrefix = `${day.id}-ss-${enrichToken()}`;
  const { interactionsByPhase, slides } = buildSongSessionContent(
    idPrefix,
    params,
    opts.song,
  );

  // Append the template's interactions onto fresh cell copies; untouched
  // cells keep their existing references (structural sharing, no mutation).
  const cells = {} as DayCells;
  for (const phase of PHASES) {
    const cell = day.cells[phase];
    const appended = interactionsByPhase[phase];
    cells[phase] = appended
      ? {
          ...cell,
          presentation: {
            ...cell.presentation,
            interactions: [
              ...(cell.presentation.interactions ?? []),
              ...appended,
            ],
          },
        }
      : cell;
  }

  const templateRef: SlideDeckTemplateRef = {
    templateId: SONG_SESSION_TEMPLATE_ID,
    ...(opts.song !== undefined ? { songId: opts.song.id } : {}),
    ...(opts.unitSlug !== undefined ? { unitSlug: opts.unitSlug } : {}),
    ...(opts.dayStubSlug !== undefined
      ? { dayStubSlug: opts.dayStubSlug }
      : {}),
    ...(opts.themeId !== undefined ? { themeId: opts.themeId } : {}),
  };

  return {
    ...day,
    cells,
    deck: {
      id: `${idPrefix}-deck`,
      title: { en: day.label, es: day.label },
      slides: slides.map((slide) => preferCellCopy(slide, day.cells)),
      templateRef,
    },
  };
}
