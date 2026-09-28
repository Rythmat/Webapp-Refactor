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
import { deckFromCells } from '../slides/deckFromCells';
import { isZoneName } from '../slides/slideGrid';
import {
  SLIDE_BLOCK_KEYS,
  type ContentHref,
  type EmbedDescriptor,
  type Slide,
  type SlideElement,
  type SlideBlockRect,
  type SlideBlockStyle,
  type SlideDeck,
  type SlideLayout,
  type SlideMedia,
  type SlideTextStyle,
} from '../slides/types';
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

/**
 * The shape version of a published snapshot. Bump whenever `publishDay`'s
 * projection changes in a way a stored snapshot cannot be read through — P2's
 * slide-grid `elements` array is the first such change.
 *
 * Records below this version are re-projected from their source Day when it is
 * available (the authoring teacher's own browser), and otherwise rendered as-is
 * after sanitizing. See `migrateSnapshot.ts`.
 *
 * v1 → v2 (P2): slides gained zone-assigned `elements` and `presetId`; the deck
 * gained `layoutLock`. A v1 snapshot is NOT broken by this — and it cannot be
 * re-projected for the reader who matters most, because a STUDENT has no source
 * Day. That is exactly why `slides/migrateDeckV1.resolveElements` derives
 * elements lazily from the stored `layout` at render: a v1 snapshot renders
 * through the same stage as a v2 one, without being rewritten.
 */
export const SNAPSHOT_VERSION = 2;

export interface DaySnapshot {
  dayId: string;
  label: string;
  cells: Record<PhaseKey, CellSnapshot>;
  /**
   * Shape version, stamped at publish time. Optional on the type ONLY because
   * snapshots persisted before P0 do not carry it; `migrateSnapshot` normalizes
   * a missing value to 1. Every snapshot this build writes has it.
   */
  snapshotVersion?: number;
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
    case 'globePathway':
      return { type: 'globePathway', pathwayId: media.pathwayId };
    case 'chordChart':
      return { type: 'chordChart', songId: media.songId };
    case 'scaleKeyboard':
      return { type: 'scaleKeyboard', mode: media.mode, key: media.key };
  }
};

/** Whitelist-copy a layout rect — numbers/booleans only, never spread. */
const projectBlockRect = (r: SlideBlockRect): SlideBlockRect => ({
  x: r.x,
  y: r.y,
  w: r.w,
  h: r.h,
  ...(r.z !== undefined ? { z: r.z } : {}),
  ...(r.hidden !== undefined ? { hidden: r.hidden } : {}),
});

/** Whitelist-copy a slide layout, iterating the fixed key allow-list. */
const projectSlideLayout = (layout: SlideLayout): SlideLayout => {
  const out: SlideLayout = {};
  for (const key of SLIDE_BLOCK_KEYS) {
    const rect = layout[key];
    if (rect) out[key] = projectBlockRect(rect);
  }
  return out;
};

/** Whitelist-copy a block text style — number/boolean/enum only, never spread. */
const projectBlockStyle = (s: SlideBlockStyle): SlideBlockStyle => ({
  ...(s.fontScale !== undefined ? { fontScale: s.fontScale } : {}),
  ...(s.bold !== undefined ? { bold: s.bold } : {}),
  ...(s.align !== undefined ? { align: s.align } : {}),
});

/** Whitelist-copy per-block text style, iterating the fixed key allow-list. */
const projectTextStyle = (textStyle: SlideTextStyle): SlideTextStyle => {
  const out: SlideTextStyle = {};
  for (const key of SLIDE_BLOCK_KEYS) {
    const style = textStyle[key];
    if (style) out[key] = projectBlockStyle(style);
  }
  return out;
};

/** Whitelist-copy an element's style — numbers/booleans/enum tokens only. */
const projectElementStyle = (
  style: NonNullable<SlideElement['style']>,
): NonNullable<SlideElement['style']> => ({
  ...(style.fontScale !== undefined ? { fontScale: style.fontScale } : {}),
  ...(style.bold !== undefined ? { bold: style.bold } : {}),
  ...(style.align !== undefined ? { align: style.align } : {}),
});

/** Whitelist-copy an embed. Exhaustive over EmbedDescriptor, no default. */
const projectEmbed = (embed: EmbedDescriptor): EmbedDescriptor => {
  switch (embed.type) {
    case 'image':
      return { type: 'image', assetId: embed.assetId };
    case 'atlasCard':
      return { type: 'atlasCard', ref: embed.ref };
    case 'youtube':
    case 'artistImage':
    case 'globePreview':
    case 'globePathway':
    case 'chordChart':
    case 'scaleKeyboard':
      return projectSlideMedia(embed);
  }
};

/** Whitelist-copy an href. Exhaustive over ContentHref, no default. */
const projectHref = (href: ContentHref): ContentHref => {
  switch (href.kind) {
    case 'atlas':
      return { kind: 'atlas', ref: href.ref };
    case 'external':
      return { kind: 'external', url: href.url, host: href.host };
  }
};

const projectLocalized = (t: LocalizedText): LocalizedText => ({
  en: t.en,
  ...(t.es !== undefined ? { es: t.es } : {}),
});

/**
 * Whitelist-copy one slide element.
 *
 * Exhaustive over the element-kind union with NO default, so adding an element
 * kind is a compile error here rather than a field that silently vanishes at
 * publish. Returns null when the element's zone is not a real zone — an unknown
 * zone is DROPPED, never carried into a snapshot.
 */
const projectElement = (element: SlideElement): SlideElement | null => {
  if (!isZoneName(element.zone)) return null;

  const base = {
    id: element.id,
    zone: element.zone,
    ...(element.order !== undefined ? { order: element.order } : {}),
    ...(element.hidden !== undefined ? { hidden: element.hidden } : {}),
    ...(element.z !== undefined ? { z: element.z } : {}),
    ...(element.style !== undefined
      ? { style: projectElementStyle(element.style) }
      : {}),
  };

  switch (element.kind) {
    case 'text':
      return {
        ...base,
        kind: 'text',
        role: element.role,
        text: projectLocalized(element.text),
        ...(element.secondary !== undefined
          ? { secondary: element.secondary }
          : {}),
      };
    case 'content':
      return {
        ...base,
        kind: 'content',
        embed: element.embed === null ? null : projectEmbed(element.embed),
        href: projectHref(element.href),
        label: projectLocalized(element.label),
        ...(element.caption !== undefined
          ? { caption: projectLocalized(element.caption) }
          : {}),
      };
    case 'checklist':
      return {
        ...base,
        kind: 'checklist',
        items: element.items.map(projectLocalized),
      };
    case 'interaction':
      return {
        ...base,
        kind: 'interaction',
        interactionId: element.interactionId,
        ...(element.reveal !== undefined ? { reveal: element.reveal } : {}),
        ...(element.drawTargetElementId !== undefined
          ? { drawTargetElementId: element.drawTargetElementId }
          : {}),
      };
  }
};

const projectSlide = (slide: Slide): Slide => {
  // Whitelist copy — do NOT spread `slide`. Same discipline as
  // projectInteraction: every field that reaches the snapshot is named here,
  // so future teacher-only extensions to Slide can't leak through publish.
  const common = {
    id: slide.id,
    phase: slide.phase,
    // Through `projectLocalized`, not by reference. `projectElement` already
    // does this for element text; the slide-level fields did not, so a
    // `LocalizedText` carrying an extra key kept it — the object is a teacher's
    // own data structure, and the firewall's whole premise is that we copy
    // named fields rather than trust what we were handed.
    title: projectLocalized(slide.title),
    ...(slide.prompt !== undefined
      ? { prompt: projectLocalized(slide.prompt) }
      : {}),
    ...(slide.timerSec !== undefined ? { timerSec: slide.timerSec } : {}),
    ...(slide.layout !== undefined
      ? { layout: projectSlideLayout(slide.layout) }
      : {}),
    ...(slide.accent !== undefined ? { accent: slide.accent } : {}),
    ...(slide.textStyle !== undefined
      ? { textStyle: projectTextStyle(slide.textStyle) }
      : {}),
    ...(slide.hidePhaseLabel !== undefined
      ? { hidePhaseLabel: slide.hidePhaseLabel }
      : {}),
    ...(slide.accentBar !== undefined ? { accentBar: slide.accentBar } : {}),
    ...(slide.presetId !== undefined ? { presetId: slide.presetId } : {}),
    // P2: the zone-assigned element list. Absent on legacy slides, which is
    // fine — `resolveElements` derives them at render from the stored `layout`.
    ...(slide.elements !== undefined
      ? {
          elements: slide.elements
            .map(projectElement)
            .filter((e): e is SlideElement => e !== null),
        }
      : {}),
  };
  switch (slide.kind) {
    case 'content':
      return {
        ...common,
        kind: 'content',
        ...(slide.variant !== undefined ? { variant: slide.variant } : {}),
        ...(slide.body !== undefined
          ? { body: projectLocalized(slide.body) }
          : {}),
        ...(slide.media !== undefined
          ? { media: projectSlideMedia(slide.media) }
          : {}),
        ...(slide.sideMedia !== undefined
          ? { sideMedia: projectSlideMedia(slide.sideMedia) }
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
      return {
        ...common,
        kind: 'app-route',
        interactionId: slide.interactionId,
      };
    case 'studio-collab':
      return { ...common, kind: 'studio-collab', grouping: slide.grouping };
    case 'showcase':
      return {
        ...common,
        kind: 'showcase',
        interactionId: slide.interactionId,
      };
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
  ...(deck.layoutLock !== undefined ? { layoutLock: deck.layoutLock } : {}),
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
    snapshotVersion: SNAPSHOT_VERSION,
    cells,
  };
  // Only attach a deck that actually has slides. An empty-but-present deck
  // (teacher clicked "Add interactive slides" then added none, or deleted them
  // all) must NOT flip the session into deck-mode — LiveSessionPage/ProjectorPage
  // branch to deck-mode on `snapshot.deck` truthiness alone, and an empty deck
  // would strand every surface on the "waiting for slides" screen with no
  // escape (clampSlideIndex is always -1). Falling through leaves the legacy
  // phase-based lesson intact.
  //
  // A Day with NO stored deck derives one from its cells rather than going out
  // deckless. New Days now ship the default deck, but Days created before that
  // — and Days materialized from curriculum stubs — have none, and `publishDay`
  // never derived one: the class fell back to the legacy phase board while the
  // teacher's own Present view (which derives a deck locally) showed slides.
  // Two screens in one room disagreeing, decided by whether anyone had happened
  // to open the slide editor.
  // ABSENT and EMPTY mean different things, and conflating them loses a real
  // teacher choice: an attached deck with zero slides is "I deleted my slides,
  // give me the phase board", and must still fall through.
  const deck = day.deck ?? deckFromCells(day);
  if (deck.slides.length > 0) {
    snapshot.deck = projectDeck(deck);
  }
  return snapshot;
};

/**
 * Rule 1 blacklist — the EXACT object keys that may never appear anywhere in a
 * published snapshot. Matching is `key === forbidden` (case-insensitively),
 * never `includes`.
 *
 * This used to be a substring list (`clo`, `impact`, `standard`, …). That was
 * too broad in both directions. It rejected legitimate content — a song id
 * `tears_of_a_clown` contains `clo`, an `atlas` interaction's
 * `expects: 'score'` is a literal value in the shipped type — and it would have
 * rejected innocuous future keys such as `onClose` or `standardLayout` while
 * still missing an exactly-named leak that happened not to contain a listed
 * fragment. Exact keys are both safer and more permissive, which is what lets
 * later phases add slide fields without playing substring roulette.
 *
 * Client uses this as a publish pre-flight; the server runs the same exact-key
 * check inside `POST /publish` per `docs/classroom-v2/backend-directions.md`
 * §5 Rule 1 (see the P0 row in `docs/classroom-v2/CONTRACT-DELTAS.md`).
 */
export const FORBIDDEN_KEYS = [
  // The teacher-only half of every Cell.
  'rationale',
  // CellRationale's own fields (src/features/classroom/types.ts).
  'assessment',
  'standards',
  'commonAnchors',
  'selCompetencies',
  'impactTags',
  'cloRefs',
  'activityRefs',
  'notes',
  'initiationStyle',
  'scaffoldLaneIds',
  'createdBy',
  'localContext',
  // Teacher-side pedagogy on the content bank's Activity / LessonSeed /
  // DaySeedPhase (src/features/classroom/content/types.ts, whose own firewall
  // note at the top of that file names these). `applySeed` copies from these
  // shapes into `cell.rationale`, so a bad projection could carry them through.
  // The first three were previously caught only incidentally, as substrings of
  // `clo`, `impact` and `rationale` — exact matching has to name them.
  'clos',
  'impactValues',
  'rationaleHints',
  'cloText',
  'cloIds',
  // Reserved for later phases so the firewall is never the thing that lags a
  // feature: P4 duplication provenance and P6 grading. Adding them now costs
  // nothing — no student-facing shape has ever carried these names.
  'duplicatedFrom',
  'score',
  'feedback',
  'rubricId',
  'returnedAt',
  'gradedAt',
] as const;

/**
 * @deprecated Renamed to {@link FORBIDDEN_KEYS}; the matcher is exact-key, not
 * substring. Kept for one cycle for the firewall test suites that import it.
 */
export const FORBIDDEN_SUBSTRINGS = FORBIDDEN_KEYS;

const FORBIDDEN_KEY_SET = new Set<string>(
  FORBIDDEN_KEYS.map((k) => k.toLowerCase()),
);

/** True when `key` is exactly a teacher-only field name (case-insensitively). */
export const isForbiddenKey = (key: string): boolean =>
  FORBIDDEN_KEY_SET.has(key.toLowerCase());

/**
 * Belt-and-suspenders backstop for the whitelist transform: recursively scan a
 * value's object KEYS for a teacher-only field name. Only keys are inspected —
 * a lesson titled "IMPACT Roles", a song "Tears of a Clown" and an atlas
 * interaction's `expects: 'score'` are all student-safe content VALUES, never
 * leaks. (The primary guarantee is the whitelist copy above; this catches
 * structural leaks.)
 */
export const findForbiddenKeyIn = (value: unknown): string | null => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = findForbiddenKeyIn(item);
      if (hit) return hit;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (isForbiddenKey(key)) return key;
      const hit = findForbiddenKeyIn((value as Record<string, unknown>)[key]);
      if (hit) return hit;
    }
  }
  return null;
};

/**
 * Publish-time (WRITE path) pre-flight. Returns the first forbidden key found,
 * or null. Callers on the write path THROW on a hit — a leak must never be
 * persisted.
 */
export const findForbiddenKey = (snapshot: DaySnapshot): string | null =>
  findForbiddenKeyIn(snapshot);

/** @deprecated Renamed to {@link findForbiddenKey}. */
export const findForbiddenSubstring = findForbiddenKey;

export interface SanitizedSnapshot<T> {
  snapshot: T;
  /** Dot-paths of every key removed, e.g. `cells.groupPractice.rationale`. */
  stripped: string[];
}

/**
 * READ path counterpart to {@link findForbiddenKey}: structurally clone a
 * stored snapshot, dropping any forbidden key at any depth, and report what was
 * dropped.
 *
 * The write path throws; the read path must not. A teacher standing in front of
 * a class must never be blocked by a stray key in a snapshot published by an
 * older build — stripping it protects the student, blocking the lesson protects
 * nobody. Callers render the sanitized snapshot and report `stripped` to
 * telemetry.
 *
 * Pure and non-mutating: the input object is never modified.
 */
export const sanitizeSnapshot = <T>(snapshot: T): SanitizedSnapshot<T> => {
  const stripped: string[] = [];

  const walk = (value: unknown, path: string): unknown => {
    if (Array.isArray(value)) {
      return value.map((item, i) => walk(item, `${path}[${i}]`));
    }
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        const childPath = path ? `${path}.${key}` : key;
        if (isForbiddenKey(key)) {
          stripped.push(childPath);
          continue;
        }
        out[key] = walk(val, childPath);
      }
      return out;
    }
    return value;
  };

  return { snapshot: walk(snapshot, '') as T, stripped };
};
