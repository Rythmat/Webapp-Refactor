/**
 * `publishDay` — the transform that turns a teacher's local Day into an
 * immutable, student-safe snapshot for the server.
 *
 * This is Rule 1 of the firewall in code form: rationale never enters the
 * output object. Only the `presentation` block of each Cell is dereferenced,
 * so teacher-only fields (assessment / standards / rationale / notes /
 * initiationStyle / cloRefs / impactTags / scaffoldLaneIds / createdBy /
 * localContext) are structurally absent from the returned snapshot.
 *
 * Matches the `DaySnapshot` schema in `docs/classroom-v2/openapi.yaml`. Once
 * the server-side `POST /classrooms/:id/publish` endpoint ships, a companion
 * `postPublishedDay(classroomId, snapshot)` wrapper will POST this shape.
 * For now, `publishDay` is a pure transform.
 */
import { stripLegacySongSlug } from '../legacySongSlug';
import { PHASES, type PhaseKey } from '../phases';
import type { Slide, SlideDeck, SlideMedia } from '../slides/types';
import type {
  Cell,
  Day,
  Interaction,
  LaunchTile,
  LocalizedText,
} from '../types';

export interface CellSnapshot {
  presentation: {
    title: LocalizedText;
    prompt: LocalizedText;
    launchTiles: LaunchTile[];
    interactions?: Interaction[];
    resetChecklist?: LocalizedText[];
  };
}

export interface DaySnapshot {
  dayId: string;
  label: string;
  cells: Record<PhaseKey, CellSnapshot>;
  /** Interactive-slides deck; absent on legacy Days. Student-safe by construction. */
  deck?: SlideDeck;
}

const projectLaunchTile = (tile: LaunchTile): LaunchTile => ({
  id: tile.id,
  module: tile.module,
  activityRef: tile.activityRef,
  ...(tile.label !== undefined ? { label: tile.label } : {}),
});

const projectInteraction = (interaction: Interaction): Interaction => {
  // Whitelist copy — do NOT spread `interaction` in case future extensions
  // sneak teacher-only fields onto the Interaction type. Every field the
  // client emits is explicitly named here.
  const out: Interaction = {
    id: interaction.id,
    type: interaction.type,
    question: interaction.question,
    // Rule 2 belt: `check-in` is hard-`false` regardless of the source value.
    shareable: interaction.type === 'check-in' ? false : interaction.shareable,
  };
  if (interaction.choice) out.choice = interaction.choice;
  if (interaction.number) out.number = interaction.number;
  if (interaction.text) out.text = interaction.text;
  if (interaction.draw) out.draw = interaction.draw;
  if (interaction.checkIn) out.checkIn = interaction.checkIn;
  if (interaction.atlas) out.atlas = interaction.atlas;
  return out;
};

const projectSlideMedia = (media: SlideMedia): SlideMedia => {
  switch (media.type) {
    case 'youtube':
      return {
        type: 'youtube',
        videoId: media.videoId,
        ...(media.startSec !== undefined ? { startSec: media.startSec } : {}),
        ...(media.loop !== undefined ? { loop: media.loop } : {}),
      };
    case 'artistImage':
      return { type: 'artistImage', songId: media.songId };
    case 'globePreview':
      return {
        type: 'globePreview',
        ...(media.markers !== undefined
          ? {
              markers: media.markers.map((m) => ({
                location: m.location,
                ...(m.size !== undefined ? { size: m.size } : {}),
              })),
            }
          : {}),
        ...(media.arcs !== undefined
          ? { arcs: media.arcs.map((a) => ({ from: a.from, to: a.to })) }
          : {}),
      };
    case 'chordChart':
      return { type: 'chordChart', songId: media.songId };
  }
};

const projectSlide = (slide: Slide): Slide => {
  // Whitelist copy — do NOT spread `slide`. Same discipline as
  // projectInteraction: every field that reaches the snapshot is named here,
  // so future teacher-only extensions to Slide can't leak through publish.
  const common = {
    id: slide.id,
    phase: slide.phase,
    title: slide.title,
    ...(slide.prompt !== undefined ? { prompt: slide.prompt } : {}),
    ...(slide.timerSec !== undefined ? { timerSec: slide.timerSec } : {}),
  };
  switch (slide.kind) {
    case 'content':
      return {
        ...common,
        kind: 'content',
        ...(slide.variant !== undefined ? { variant: slide.variant } : {}),
        ...(slide.body !== undefined ? { body: slide.body } : {}),
        ...(slide.media !== undefined
          ? { media: projectSlideMedia(slide.media) }
          : {}),
        // Named whitelist copies — tiles through projectLaunchTile (drops any
        // stray key), checklist items rebuilt as {en,es?}. Never spread.
        ...(slide.launchTiles !== undefined
          ? { launchTiles: slide.launchTiles.map(projectLaunchTile) }
          : {}),
        ...(slide.resetChecklist !== undefined
          ? {
              resetChecklist: slide.resetChecklist.map((t) => ({
                en: t.en,
                ...(t.es !== undefined ? { es: t.es } : {}),
              })),
            }
          : {}),
      };
    case 'media':
      return {
        ...common,
        kind: 'media',
        media: projectSlideMedia(slide.media),
        ...(slide.sideMedia !== undefined
          ? { sideMedia: projectSlideMedia(slide.sideMedia) }
          : {}),
      };
    case 'interaction':
      return {
        ...common,
        kind: 'interaction',
        interactionIds: [...slide.interactionIds],
        ...(slide.media !== undefined
          ? { media: projectSlideMedia(slide.media) }
          : {}),
        ...(slide.reveal !== undefined ? { reveal: slide.reveal } : {}),
      };
    case 'app-route':
      return { ...common, kind: 'app-route', interactionId: slide.interactionId };
    case 'studio-collab':
      return { ...common, kind: 'studio-collab', grouping: slide.grouping };
    case 'showcase':
      return { ...common, kind: 'showcase', interactionId: slide.interactionId };
  }
};

/**
 * Whitelist-copy a deck. Exported so `buildStudentView` uses the same single
 * choke point — one place to audit what slide data can reach any student or
 * projector surface.
 */
export const projectDeck = (deck: SlideDeck): SlideDeck => ({
  id: deck.id,
  title: deck.title,
  slides: deck.slides.map(projectSlide),
  ...(deck.templateRef !== undefined
    ? {
        templateRef: {
          templateId: deck.templateRef.templateId,
          ...(deck.templateRef.songId !== undefined
            ? { songId: deck.templateRef.songId }
            : {}),
          ...(deck.templateRef.pathwayId !== undefined
            ? { pathwayId: deck.templateRef.pathwayId }
            : {}),
          ...(deck.templateRef.unitSlug !== undefined
            ? { unitSlug: deck.templateRef.unitSlug }
            : {}),
          ...(deck.templateRef.dayStubSlug !== undefined
            ? { dayStubSlug: deck.templateRef.dayStubSlug }
            : {}),
          ...(deck.templateRef.gcmKey !== undefined
            ? { gcmKey: deck.templateRef.gcmKey }
            : {}),
          ...(deck.templateRef.themeId !== undefined
            ? { themeId: deck.templateRef.themeId }
            : {}),
        },
      }
    : {}),
});

const projectCell = (cell: Cell): CellSnapshot => {
  const { presentation } = cell;
  const snapshot: CellSnapshot = {
    presentation: {
      title: presentation.title,
      // Strip any legacy "Song of the day: /songs/<id>" slug so the published
      // student/deck surfaces never render the raw slug (matches the
      // Presentation-Mode buildStudentView path). No-op on new Days.
      prompt: stripLegacySongSlug(presentation.prompt).prompt,
      launchTiles: presentation.launchTiles.map(projectLaunchTile),
    },
  };
  if (presentation.interactions?.length) {
    snapshot.presentation.interactions =
      presentation.interactions.map(projectInteraction);
  }
  if (presentation.resetChecklist?.length) {
    snapshot.presentation.resetChecklist = presentation.resetChecklist;
  }
  return snapshot;
};

/**
 * Transform a Day into a student-safe DaySnapshot ready for the server.
 *
 * Never reads `cell.rationale` — that's the load-bearing invariant. The
 * accompanying `publishDay.test.ts` proves it.
 */
export const publishDay = (day: Day): DaySnapshot => {
  const cells = {} as Record<PhaseKey, CellSnapshot>;
  for (const phaseKey of PHASES) {
    cells[phaseKey] = projectCell(day.cells[phaseKey]);
  }
  const snapshot: DaySnapshot = {
    dayId: day.id,
    label: day.label,
    cells,
  };
  // Only attach a deck that actually has slides. An empty-but-present deck
  // (teacher clicked "Add interactive slides" then added none, or deleted them
  // all) must NOT flip the session into deck-mode — LiveSessionPage/ProjectorPage
  // branch to deck-mode on `snapshot.deck` truthiness alone, and an empty deck
  // would strand every surface on the "waiting for slides" screen with no
  // escape (clampSlideIndex is always -1). Falling through leaves the legacy
  // phase-based lesson intact.
  if (day.deck && day.deck.slides.length > 0) {
    snapshot.deck = projectDeck(day.deck);
  }
  return snapshot;
};

export const FORBIDDEN_SUBSTRINGS = [
  'assessment',
  'rationale',
  'clo',
  'impact',
  'scaffold',
  'standard',
  'initiation',
  'createdby',
  'notes',
  'localcontext',
] as const;

/**
 * Belt-and-suspenders regex check on the stringified snapshot. Client uses
 * this only in tests; the server runs the same check inside `POST /publish`
 * per `docs/classroom-v2/backend-directions.md` §5 Rule 1.
 */
export const findForbiddenSubstring = (
  snapshot: DaySnapshot,
): string | null => {
  const serialized = JSON.stringify(snapshot).toLowerCase();
  for (const forbidden of FORBIDDEN_SUBSTRINGS) {
    if (serialized.includes(forbidden)) return forbidden;
  }
  return null;
};
