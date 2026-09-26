/**
 * Slide deck model for interactive live sessions (Pear Deck-class).
 *
 * A `SlideDeck` is an ordered presentation projection over a Day — it never
 * replaces the five-phase IMPACT model. Every slide is anchored to a
 * `PhaseKey` (the session's `currentPhase` is derived from the current
 * slide), and interaction-bearing slides reference `Interaction`s BY ID;
 * the Interactions themselves stay in `cells[phase].presentation.interactions`
 * so the response pipeline (aggregation, share/reveal, reports, CSV export,
 * simulation) keeps working unmodified.
 *
 * Firewall note: everything in this file is student-safe by construction —
 * LocalizedText and content refs only. Teacher-only guidance for a slide
 * belongs in the owning cell's `rationale`, never on a Slide. `publishDay`
 * whitelist-copies the deck into the snapshot; the Rule 1 forbidden-substring
 * test runs over deck content too.
 */
import type { PhaseKey } from '../phases';
import type { LaunchTile, LocalizedText } from '../types';
import type { ZoneName } from './slideGrid';

/** Visual media block usable on content / media / interaction slides. */
export type SlideMedia =
  | { type: 'youtube'; videoId: string; startSec?: number; loop?: boolean }
  /** Resolves `song.artistImageRef` → /artists/svg/*.webp, HexAvatar fallback. */
  | { type: 'artistImage'; songId: string }
  /** GlobeCdn props subset — the Pathways mini-globe. */
  | {
      type: 'globePreview';
      markers?: Array<{ location: [number, number]; size?: number }>;
      arcs?: Array<{ from: [number, number]; to: [number, number] }>;
    }
  /**
   * A specific globe *pathway* embedded as the dashboard-style preview: the
   * globe traces the pathway's stops beside a card that steps through them.
   * Only the (static, student-safe) pathway id is stored — the events, arcs and
   * card text are resolved at render, mirroring how `artistImage` resolves its
   * `songId`. `pathwayId` is a `HISTORICAL_MODULES` id.
   */
  | { type: 'globePathway'; pathwayId: string }
  /** Phase 2 — ChordChart embed for Song Chart slides. */
  | { type: 'chordChart'; songId: string }
  /**
   * The Learn Overview "Scale" keyboard for a mode in a key — a highlighted
   * piano + interval/notes text + Play Scale. Only the (static, student-safe)
   * mode slug + key URL token are stored (e.g. `ionian` + `c`); the scale is
   * computed at render. Used by the Theory Add-slide template.
   */
  | { type: 'scaleKeyboard'; mode: string; key: string };

/**
 * Freeform layout (Phase 4+). A slide's positionable "blocks" — teachers can
 * move / resize / hide each on the 16:9 canvas. Persisted per slide in
 * `SlideCommon.layout`; absent ⇒ the kind's default (flow) arrangement.
 *
 * Firewall note: this is student-safe by construction — the keys are a fixed
 * identifier set that collides with no `FORBIDDEN_KEYS` entry, and every value
 * is a number/boolean. It is whitelist-copied in
 * `publishDay.projectSlideLayout` (never spread).
 */
export type SlideBlockKey =
  | 'title'
  | 'prompt'
  | 'body'
  | 'media'
  | 'sideMedia'
  | 'launchTiles'
  | 'resetChecklist'
  | 'interaction';

/** Rect in design space — px within a fixed 1280×720 canvas, origin top-left. */
export interface SlideBlockRect {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Paint order; higher is on top. Defaults derive from key order. */
  z?: number;
  /** Teacher hid this block — removed on every surface (how title is removed). */
  hidden?: boolean;
}

/** Sparse per-slide arrangement. Absent keys fall back to the kind default. */
export type SlideLayout = Partial<Record<SlideBlockKey, SlideBlockRect>>;

/**
 * Per-block text formatting (font scale / bold / alignment).
 *
 * Firewall note: student-safe by construction — every value is a number, a
 * boolean, or an enum token (`left`/`center`/`right`), and no key matches a
 * `FORBIDDEN_KEYS` entry. Whitelist-copied in `publishDay.projectTextStyle`
 * (never spread), exactly like `SlideLayout`.
 */
export interface SlideBlockStyle {
  /** Multiplier on the block's resolved `--slide-<block>-fz` token (clamp 0.5–2). */
  fontScale?: number;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
}

/** Sparse per-block text style. Absent keys ⇒ the block's default styling. */
export type SlideTextStyle = Partial<Record<SlideBlockKey, SlideBlockStyle>>;

/** Canonical allow-list of block keys — the publish projector iterates THIS
 *  (never `Object.keys`) so a stray/forbidden key can never ride through. */
export const SLIDE_BLOCK_KEYS: readonly SlideBlockKey[] = [
  'title',
  'prompt',
  'body',
  'media',
  'sideMedia',
  'launchTiles',
  'resetChecklist',
  'interaction',
] as const;

// ── P2: the zone-based element model ────────────────────────────────────────
//
// Elements REPLACE freeform rects as the layout model. An element stores only
// `{zone, order, hidden?, z?}`; its rectangle is DERIVED from `SLIDE_GRID`.
// That is what keeps layout data free of free text, which in turn keeps
// `publishDay`'s whitelist projection trivially safe.
//
// `SlideElement.id` is an ELEMENT uid. It is NOT the response join key — that
// is `interactionId`, and confusing the two breaks response aggregation across
// live sessions and async assignments.

export interface SlideElementStyle {
  /** Clamped 0.5–2 at render; text shrinks to fit, then clips. */
  fontScale?: number;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface SlideElementBase {
  id: string;
  /** Enum token only — never free text, never a rect. */
  zone: ZoneName;
  /** Position within a `column`/`row` zone. Ties fall back to array order. */
  order?: number;
  hidden?: boolean;
  z?: number;
  style?: SlideElementStyle;
}

/**
 * What renders inline. Ids only — never a URL, never free text.
 *
 * P3 adds `hrefForEmbed`, which is TOTAL over this union, so an element that
 * has an embed can never lack a canonical link.
 */
export type EmbedDescriptor =
  | SlideMedia
  | { type: 'image'; assetId: string }
  | { type: 'atlasCard'; ref: string };

/** Where the content lives. Exactly one href per content element. */
export type ContentHref =
  | { kind: 'atlas'; ref: string }
  | { kind: 'external'; url: string; host: string };

export interface SlideContentElement extends SlideElementBase {
  kind: 'content';
  /** `null` renders as a link card. There is no third state. */
  embed: EmbedDescriptor | null;
  href: ContentHref;
  label: LocalizedText;
  caption?: LocalizedText;
}

export interface SlideTextElement extends SlideElementBase {
  kind: 'text';
  role: 'title' | 'subtitle' | 'body' | 'label';
  text: LocalizedText;
  /** Bilingual render mode within the same zone. `stacked` is the default. */
  secondary?: 'stacked' | 'inline' | 'off';
}

export interface SlideChecklistElement extends SlideElementBase {
  kind: 'checklist';
  items: LocalizedText[];
}

export interface SlideInteractionElement extends SlideElementBase {
  kind: 'interaction';
  /** The response join key. Re-keyed by every duplicate/copy operation. */
  interactionId: string;
  reveal?: 'bars' | 'wall' | 'words' | 'scale';
  /**
   * A draw interaction may annotate another element; the overlay renders at
   * THAT element's zone rect. This is how rhythm-grid and chord-chart
   * annotation slides actually work.
   */
  drawTargetElementId?: string;
}

export type SlideElement =
  | SlideTextElement
  | SlideContentElement
  | SlideChecklistElement
  | SlideInteractionElement;

export type SlideElementKind = SlideElement['kind'];

interface SlideCommon {
  id: string;
  /** IMPACT anchor — drives derived currentPhase, phase chip, report grouping. */
  phase: PhaseKey;
  title: LocalizedText;
  prompt?: LocalizedText;
  /** Teacher-set countdown seconds (Phase 4 UI; parameterized by templates now). */
  timerSec?: number;
  /**
   * @deprecated P2 replaced freeform rects with zone-assigned `elements`.
   *
   * READ-ONLY from here on: `migrateDeckV1` resolves each stored rect to its
   * nearest zone and then IGNORES the rect. Still present so existing decks and
   * already-published v1 snapshots render, and so the migration has something
   * to read. Nothing should write it.
   */
  readonly layout?: SlideLayout;
  /**
   * Zone-assigned content. Optional ON PURPOSE: legacy decks and already-
   * published v1 snapshots have none, and `resolveElements(slide)` derives them
   * lazily at render so both keep working. Present on everything this build
   * authors.
   */
  elements?: SlideElement[];
  /** The layout preset this slide was built from; "Reset to standard" re-applies it. */
  presetId?: string;
  /**
   * Per-slide accent override (a `#RRGGBB` hex) driving the radial glow + phase
   * chip dot. Undefined ⇒ the phase default (`PHASE_ACCENT_HEX`). Student-safe:
   * a hex string only (the UI never emits free text).
   */
  accent?: string;
  /**
   * Per-block text formatting (font scale / bold / alignment). Undefined ⇒ each
   * block's default styling. Student-safe: numeric/boolean/enum values only.
   */
  textStyle?: SlideTextStyle;
  /** Hide the phase-label chip ("Connect"/"Practice"/…) on this slide. */
  hidePhaseLabel?: boolean;
  /**
   * Draw the left accent bar (`SLIDE_GRID.accentBar`, tinted by the phase
   * accent). The objectives preset is built around it.
   *
   * A FLAG, not an element, and deliberately so: `accentBar` is a `chrome`
   * zone, and `validateLayout` refuses any element placed in a chrome zone.
   * Chrome is "rendered from deck/slide flags, never moved by a teacher"
   * (slideGrid.ts) — this is the flag that sentence refers to.
   */
  accentBar?: boolean;
}

/** Title card / section header / closing frame. */
export interface ContentSlide extends SlideCommon {
  kind: 'content';
  variant?: 'welcome' | 'section' | 'plain';
  body?: LocalizedText;
  media?: SlideMedia;
  /**
   * Optional second visual, positioned as its own freeform block — e.g. a
   * song's artist image beside its YouTube video. Same `SlideMedia` union.
   */
  sideMedia?: SlideMedia;
  /**
   * Atlas launch tiles surfaced on this slide (migrated off
   * `cell.presentation.launchTiles`, which the phase board used to render).
   * Student-safe: `{id, module, activityRef, label?}` refs only — resolved to
   * module deep-links at render time, no URLs baked in.
   */
  launchTiles?: LaunchTile[];
  /**
   * Reflect-phase reset checklist — ephemeral tick boxes rendered under the
   * slide body. Student-safe LocalizedText only.
   */
  resetChecklist?: LocalizedText[];
}

/** Step 3 — YouTube + featured visual + displayed prompt. Video plays on the projector only. */
export interface MediaSlide extends SlideCommon {
  kind: 'media';
  media: SlideMedia;
  /** Optional second visual (artist portrait or mini-globe beside the video). */
  sideMedia?: SlideMedia;
}

/**
 * Steps 2 / 4 / 8 — check-in, question, exit poll. Reuses `Interaction` as
 * THE response primitive. Usually one id; the exit poll stacks two (text +
 * check-in). Every id must exist in `cells[slide.phase].presentation.interactions`.
 */
export interface InteractionSlide extends SlideCommon {
  kind: 'interaction';
  interactionIds: string[];
  media?: SlideMedia;
  /**
   * Projector aggregate style on reveal: choice → bars, text → wall or 'words'
   * (word cloud), number → scale. The word-cloud token is 'words' (a value token,
   * chosen for clarity). NB: the Rule 1 firewall now scans object KEYS only (see
   * publishDay.ts findForbiddenSubstring), so a content value like 'cloud' no
   * longer trips it — the token stays 'words' for its own sake, not the firewall.
   */
  reveal?: 'bars' | 'wall' | 'words' | 'scale';
}

/** Step 5 (Phase 2) — routes students into a real module via an atlas-type Interaction. */
export interface AppRouteSlide extends SlideCommon {
  kind: 'app-route';
  interactionId: string;
}

/** Step 6 (Phase 3) — Studio creation stage. */
export interface StudioCollabSlide extends SlideCommon {
  kind: 'studio-collab';
  grouping: 'pairs' | 'solo';
}

/** Step 7 (Phase 3) — showcase stage; interactionId collects `offer` responses. */
export interface ShowcaseSlide extends SlideCommon {
  kind: 'showcase';
  interactionId: string;
}

export type Slide =
  | ContentSlide
  | MediaSlide
  | InteractionSlide
  | AppRouteSlide
  | StudioCollabSlide
  | ShowcaseSlide;

export type SlideKind = Slide['kind'];

/** Which surface is rendering — drives type scale + which slots mount.
 *  'present' = the legacy Presentation Mode board, converged onto this shell. */
export type SlideSurface = 'projector' | 'student' | 'teacher' | 'present';

/** Provenance for regenerate, analytics, and curriculum-coverage reporting. */
export interface SlideDeckTemplateRef {
  templateId: string;
  songId?: string;
  pathwayId?: string;
  unitSlug?: string;
  dayStubSlug?: string;
  gcmKey?: string;
  themeId?: string;
}

export interface SlideDeck {
  id: string;
  title: LocalizedText;
  /** Ordered. Template-guaranteed soft invariant: `slide.phase` is non-decreasing in PHASES order. */
  slides: Slide[];
  templateRef?: SlideDeckTemplateRef;
  /**
   * When true (the DEFAULT — treat `undefined` as locked), a teacher may switch
   * a slide's preset but not re-zone individual elements. Unlocked allows drag
   * between zones. There is no freeform positioning in either mode.
   */
  layoutLock?: boolean;
}
