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
import type { LocalizedText } from '../types';

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
  /** Phase 2 — ChordChart embed for Song Chart slides. */
  | { type: 'chordChart'; songId: string };

interface SlideCommon {
  id: string;
  /** IMPACT anchor — drives derived currentPhase, phase chip, report grouping. */
  phase: PhaseKey;
  title: LocalizedText;
  prompt?: LocalizedText;
  /** Teacher-set countdown seconds (Phase 4 UI; parameterized by templates now). */
  timerSec?: number;
}

/** Title card / section header / closing frame. */
export interface ContentSlide extends SlideCommon {
  kind: 'content';
  variant?: 'welcome' | 'section' | 'plain';
  body?: LocalizedText;
  media?: SlideMedia;
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
   * (word cloud), number → scale. NB: the word-cloud token is 'words', NOT
   * 'cloud' — 'cloud' contains the Rule 1 forbidden substring 'clo' and would
   * make any deck using it un-publishable (see publishDay.ts FORBIDDEN_SUBSTRINGS).
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
}
