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
 * Mapping: one `ContentSlide` per phase (blank title promotes the prompt into
 * the headline; launch tiles + the Reflect reset checklist carried onto the
 * slide), each stamped with its lesson section. The Connect cell's spotlight
 * — its song and its Globe / song tiles — becomes a Showcase slide of its
 * own, after Connect's. Losslessness: any interactions a cell already holds
 * are carried as `InteractionSlide`s referencing them by id, so backfilling a
 * legacy Day that had interactions but no deck drops nothing.
 */
import { stripLegacySongSlug } from '../legacySongSlug';
import { PHASES, STUDENT_PHASE_LABELS, type PhaseKey } from '../phases';
import type {
  Cell,
  Day,
  Interaction,
  LaunchTile,
  LocalizedText,
} from '../types';
import { SECTION_LABEL, type SlideSection } from './sections';
import type { ContentSlide, InteractionSlide, Slide, SlideDeck } from './types';

const hasText = (t: LocalizedText | undefined): boolean =>
  Boolean(t?.en?.trim());

/**
 * Projector aggregate style inferred from the interaction type: choice → bars,
 * text → wall, number → scale. Others (draw / check-in / atlas / showcase) have
 * no reveal viz, so `reveal` is omitted. The text token is 'words' rather than
 * 'cloud' for historical reasons — the firewall matches keys exactly now, so
 * either would publish cleanly.
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

/** Each phase's own section (Showcase is split out of Connect below). */
const SECTION_FOR: Record<PhaseKey, SlideSection> = {
  connectRegulate: 'connect',
  groupPractice: 'groupProject',
  creativeProjects: 'individualProject',
  presentPerform: 'present',
  respondReflectReset: 'reflect',
};

/** A tile that spotlights something (a Globe stop, a song): Showcase material. */
const isSpotlightTile = (tile: LaunchTile): boolean =>
  tile.module === 'globe' || tile.activityRef.startsWith('song:');

const contentSlideForPhase = (
  dayId: string,
  phaseKey: PhaseKey,
  cell: Cell,
): ContentSlide[] => {
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

  // Connect's song and spotlight tiles move to a Showcase slide of their own.
  const splitsShowcase = phaseKey === 'connectRegulate';
  const tiles = splitsShowcase
    ? presentation.launchTiles.filter((t) => !isSpotlightTile(t))
    : presentation.launchTiles;
  const spotlightTiles = splitsShowcase
    ? presentation.launchTiles.filter(isSpotlightTile)
    : [];
  const songMedia = song
    ? ({ type: 'artistImage', songId: song.id } as const)
    : undefined;

  const main: ContentSlide = {
    id: `${dayId}-present-${phaseKey}`,
    kind: 'content',
    phase: phaseKey,
    section: SECTION_FOR[phaseKey],
    title,
    ...(prompt ? { prompt } : {}),
    ...(songMedia && !splitsShowcase ? { media: songMedia } : {}),
    ...(tiles.length > 0 ? { launchTiles: [...tiles] } : {}),
    // Reflect-phase only, matching CellPresentation's contract.
    ...(phaseKey === 'respondReflectReset' &&
    presentation.resetChecklist?.length
      ? { resetChecklist: [...presentation.resetChecklist] }
      : {}),
  };
  if (!splitsShowcase || (!songMedia && spotlightTiles.length === 0)) {
    return [main];
  }
  const showcase: ContentSlide = {
    id: `${dayId}-present-showcase`,
    kind: 'content',
    phase: phaseKey,
    section: 'showcase',
    title: SECTION_LABEL.showcase,
    ...(songMedia ? { media: songMedia } : {}),
    ...(spotlightTiles.length > 0 ? { launchTiles: [...spotlightTiles] } : {}),
  };
  return [main, showcase];
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
      section: SECTION_FOR[phaseKey],
      title: interaction.question,
      interactionIds: [interaction.id],
      ...(reveal ? { reveal } : {}),
    };
  });

export const deckFromCells = (day: Day): SlideDeck => {
  const slides: Slide[] = [];
  for (const phaseKey of PHASES) {
    const cell = day.cells[phaseKey];
    const [main, showcase] = contentSlideForPhase(day.id, phaseKey, cell);
    // Connect's own slides (its check-ins) come before its Showcase.
    slides.push(main, ...interactionSlidesForPhase(day.id, phaseKey, cell));
    if (showcase) slides.push(showcase);
  }
  return {
    id: `${day.id}-deck`,
    title: { en: day.label },
    slides,
  };
};
