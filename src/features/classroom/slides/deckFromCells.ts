/**
 * deckFromCells — derive a student-safe `SlideDeck` from a Day's five phase
 * cells. This is how a legacy (deckless) Day, or a freshly-created blank Day,
 * gets an initial deck so the slide editor + Presentation Mode always have a
 * deck to render.
 *
 * Pure and DETERMINISTIC: reads ONLY `cell.presentation` (never `rationale`, so
 * it is firewall-safe by construction) and emits stable, content-derived slide
 * ids, so deriving twice yields a deep-equal deck. Callers invoke it ONLY when
 * `!day.deck || day.deck.slides.length === 0` — it never overwrites a
 * hand-edited deck.
 *
 * Mapping (mirrors `presentation/phaseCellToSlide.ts`): one `ContentSlide` per
 * phase (blank title promotes the prompt into the headline; `song` → an
 * `artistImage` media block; launch tiles + the Reflect reset checklist carried
 * onto the slide). Losslessness: any interactions a cell already holds are
 * carried as `InteractionSlide`s referencing them by id, so backfilling a
 * legacy Day that had interactions but no deck drops nothing.
 */
import { stripLegacySongSlug } from '../legacySongSlug';
import { PHASES, STUDENT_PHASE_LABELS, type PhaseKey } from '../phases';
import type { Cell, Day, Interaction, LocalizedText } from '../types';
import type { ContentSlide, InteractionSlide, Slide, SlideDeck } from './types';

const hasText = (t: LocalizedText | undefined): boolean =>
  Boolean(t?.en?.trim());

/**
 * Projector aggregate style inferred from the interaction type: choice → bars,
 * text → wall, number → scale. Others (draw / check-in / atlas / showcase) have
 * no reveal viz, so `reveal` is omitted. Never emits 'cloud' (the Rule 1
 * forbidden substring 'clo').
 */
export const revealForInteraction = (
  interaction: Interaction,
): InteractionSlide['reveal'] => {
  switch (interaction.type) {
    case 'choice':
      return 'bars';
    case 'text':
      return 'wall';
    case 'number':
      return 'scale';
    default:
      return undefined;
  }
};

const contentSlideForPhase = (
  dayId: string,
  phaseKey: PhaseKey,
  cell: Cell,
): ContentSlide => {
  const { presentation } = cell;
  const { prompt: strippedPrompt, songId: recoveredSongId } =
    stripLegacySongSlug(presentation.prompt);

  // Title/prompt promotion (mirrors phaseCellToSlide): a blank title promotes
  // the prompt into the headline so the slide never renders an empty heading;
  // a truly empty phase is at least named by its student label.
  let title: LocalizedText;
  let prompt: LocalizedText | undefined;
  if (hasText(presentation.title)) {
    title = presentation.title;
    prompt = hasText(strippedPrompt) ? strippedPrompt : undefined;
  } else if (hasText(strippedPrompt)) {
    title = strippedPrompt;
    prompt = undefined;
  } else {
    title = STUDENT_PHASE_LABELS[phaseKey];
    prompt = undefined;
  }

  const song =
    presentation.song ??
    (recoveredSongId ? { id: recoveredSongId } : undefined);

  return {
    id: `${dayId}-present-${phaseKey}`,
    kind: 'content',
    phase: phaseKey,
    title,
    ...(prompt ? { prompt } : {}),
    ...(song
      ? { media: { type: 'artistImage', songId: song.id } as const }
      : {}),
    ...(presentation.launchTiles.length > 0
      ? { launchTiles: [...presentation.launchTiles] }
      : {}),
    // Reflect-phase only, matching CellPresentation's contract.
    ...(phaseKey === 'respondReflectReset' &&
    presentation.resetChecklist?.length
      ? { resetChecklist: [...presentation.resetChecklist] }
      : {}),
  };
};

const interactionSlidesForPhase = (
  dayId: string,
  phaseKey: PhaseKey,
  cell: Cell,
): InteractionSlide[] =>
  (cell.presentation.interactions ?? []).map((interaction) => {
    const reveal = revealForInteraction(interaction);
    return {
      id: `${dayId}-ix-${phaseKey}-${interaction.id}`,
      kind: 'interaction',
      phase: phaseKey,
      title: interaction.question,
      interactionIds: [interaction.id],
      ...(reveal ? { reveal } : {}),
    };
  });

export const deckFromCells = (day: Day): SlideDeck => {
  const slides: Slide[] = [];
  for (const phaseKey of PHASES) {
    const cell = day.cells[phaseKey];
    slides.push(contentSlideForPhase(day.id, phaseKey, cell));
    slides.push(...interactionSlidesForPhase(day.id, phaseKey, cell));
  }
  return {
    id: `${day.id}-deck`,
    title: { en: day.label },
    slides,
  };
};
