/**
 * SLIDE_GRID — the one canonical layout for every slide, every surface.
 *
 * WHY A GRID AND NOT FREEFORM RECTS
 *
 * Requirement 1 of the Teacher Office brief is "a standardized position for all
 * content on the slides". The previous model stored an `{x,y,w,h}` per block,
 * which meant three competing sources of truth (two `hasMedia` branches in
 * `defaultLayoutForKind`, eight hand-tuned tables in `slideTemplates`, and
 * templates that set no layout at all) and defaults that SELF-COLLIDE. It also
 * put free-form geometry into published data, which the Rule 1 whitelist then
 * had to carry.
 *
 * Here, an element stores only `{zone, order, hidden?, z?}`. Rectangles are
 * DERIVED. That is what keeps layout data free of free text, which is what
 * keeps `publishDay`'s whitelist projection trivially safe — and it is what
 * makes "the same slide looks the same on all four surfaces" a static property
 * rather than a thing to remember.
 *
 * THE INVARIANT THIS FILE EXISTS TO GUARANTEE
 *
 * No content zone may enter the footer band (y >= 620). The footer is reserved
 * on EVERY slide, not only slides that happen to carry an interaction, so that
 * adding an interaction later can never reflow the content above it.
 * `slideGrid.test.ts` asserts this for every zone and every preset, so it is a
 * compile-time-ish guarantee rather than a runtime condition.
 *
 * Pure: no React, no storage, no DOM. Fully unit-testable.
 */

/**
 * The fixed design canvas. Every surface fits this with one uniform scale.
 *
 * Re-exported from `slideLayout` rather than redeclared: a second literal here
 * would make two sources of truth for the one number every surface scales by.
 */
export { SLIDE_CANVAS } from './slideLayout';

/** Outer margin. */
export const M = 64;

/** Positions snap to this in the editor. */
export const SNAP = 8;

/** Content may only live here. */
export const SAFE_AREA = { x: M, y: 96, right: 1216, bottom: 604 } as const;

/**
 * The reserved interaction band. Chrome only — never content.
 * Strip content sits at 64,636,928,68, leaving room for the page number.
 */
export const FOOTER_BAND = { x: 0, y: 620, w: 1280, h: 100 } as const;

export interface ZoneRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ZoneRole = 'chrome' | 'content' | 'footer';

/**
 * How multiple elements share one zone.
 * - `single`: a second element is a validation error.
 * - `column`: stacked vertically in `order`, 16px gap.
 * - `row`: laid out horizontally, capped by `max`.
 */
export type ZoneFlow = 'single' | 'column' | 'row';

export interface ZoneSpec {
  rect: ZoneRect;
  role: ZoneRole;
  flow: ZoneFlow;
  /** Only meaningful for `row`. */
  max?: number;
  /** Which middle-band family this zone belongs to; `any` combines freely. */
  family: ZoneFamily;
}

/**
 * Middle-band families are MUTUALLY EXCLUSIVE. A slide picks exactly one.
 * `any` zones (title, utilityTopRight, subtitle) combine per the rules below.
 */
export type ZoneFamily =
  | 'any'
  | 'body'
  | 'bodyShort'
  | 'split'
  | 'hero'
  | 'rows'
  | 'cta'
  | 'centreStack'
  | 'chrome';

/** Vertical gap between stacked elements in a `column` zone. */
export const ZONE_GAP = 16;

export const SLIDE_GRID = {
  // ── Chrome: rendered from deck/slide flags, never moved by a teacher ─────
  /** Objectives family only, opt-in per preset. */
  accentBar: {
    rect: { x: 0, y: 0, w: 16, h: 720 },
    role: 'chrome',
    flow: 'single',
    family: 'chrome',
  },
  /** Student phase label + accent dot. Visible unless hidePhaseLabel === true. */
  phaseChip: {
    rect: { x: 64, y: 32, w: 256, h: 56 },
    role: 'chrome',
    flow: 'single',
    family: 'chrome',
  },
  /** Deck flag; auto-used when a bottom-right logo would collide with the strip. */
  logoTop: {
    rect: { x: 552, y: 24, w: 176, h: 72 },
    role: 'chrome',
    flow: 'single',
    family: 'chrome',
  },
  /** Inside the footer band, drawn above the strip. */
  pageNumber: {
    rect: { x: 1104, y: 644, w: 112, h: 56 },
    role: 'chrome',
    flow: 'single',
    family: 'chrome',
  },
  /**
   * The interaction band. Interaction elements are valid ONLY here.
   *
   * `row`, max 2 — NOT `single`. The exit-poll slide stacks two interactions
   * (a text response and a check-in), which both shipping templates emit
   * (`songSession.ts` and `genreLesson.ts`). A `single` footer would reject
   * every exit poll the product ships. The strip is only 68px tall, so two
   * must sit side by side rather than stacked.
   */
  footer: {
    rect: { x: 0, y: 620, w: 1280, h: 100 },
    role: 'footer',
    flow: 'row',
    max: 2,
    family: 'chrome',
  },

  // ── Content ──────────────────────────────────────────────────────────────
  /** One link element ("lyrics / letra" in the teacher's real decks). */
  utilityTopRight: {
    rect: { x: 1032, y: 32, w: 184, h: 56 },
    role: 'content',
    flow: 'single',
    family: 'any',
  },
  title: {
    rect: { x: 64, y: 96, w: 1152, h: 104 },
    role: 'content',
    flow: 'single',
    family: 'any',
  },
  subtitle: {
    rect: { x: 64, y: 208, w: 1152, h: 72 },
    role: 'content',
    flow: 'single',
    family: 'any',
  },

  body: {
    rect: { x: 64, y: 288, w: 1152, h: 316 },
    role: 'content',
    flow: 'column',
    family: 'body',
  },

  bodyShort: {
    rect: { x: 64, y: 288, w: 1152, h: 232 },
    role: 'content',
    flow: 'column',
    family: 'bodyShort',
  },
  tileRow: {
    rect: { x: 64, y: 536, w: 1152, h: 68 },
    role: 'content',
    flow: 'row',
    max: 4,
    family: 'bodyShort',
  },

  left: {
    rect: { x: 64, y: 288, w: 560, h: 316 },
    role: 'content',
    flow: 'column',
    family: 'split',
  },
  right: {
    rect: { x: 656, y: 288, w: 560, h: 316 },
    role: 'content',
    flow: 'column',
    family: 'split',
  },
  /** 16:9 by construction (560 × 315). */
  mediaLeft: {
    rect: { x: 64, y: 288, w: 560, h: 315 },
    role: 'content',
    flow: 'single',
    family: 'split',
  },
  mediaRight: {
    rect: { x: 656, y: 288, w: 560, h: 315 },
    role: 'content',
    flow: 'single',
    family: 'split',
  },

  /** Centred 16:9; replaces subtitle + body. */
  heroMedia: {
    rect: { x: 292, y: 200, w: 696, h: 392 },
    role: 'content',
    flow: 'single',
    family: 'hero',
  },

  /** "What" — label column 160 wide, body from x=240. */
  rowA: {
    rect: { x: 64, y: 208, w: 1152, h: 120 },
    role: 'content',
    flow: 'row',
    max: 2,
    family: 'rows',
  },
  /** "How" — auto-derivable from the Day's five cells. */
  rowB: {
    rect: { x: 64, y: 352, w: 1152, h: 120 },
    role: 'content',
    flow: 'row',
    max: 2,
    family: 'rows',
  },
  /** "Why" */
  rowC: {
    rect: { x: 64, y: 496, w: 1152, h: 108 },
    role: 'content',
    flow: 'row',
    max: 2,
    family: 'rows',
  },

  /**
   * The call-to-action band. Widened from a single 448x128 slot to a row of up
   * to four: the preset it exists for is the teacher's "Project Menu", which
   * offers three or four routes, and a one-slot CTA could not express it. The
   * rect grows to the safe-area width so four cards fit without crowding.
   */
  ctaCenter: {
    rect: { x: 176, y: 352, w: 928, h: 128 },
    role: 'content',
    flow: 'row',
    max: 4,
    family: 'cta',
  },

  centerStackTop: {
    rect: { x: 288, y: 160, w: 704, h: 184 },
    role: 'content',
    flow: 'single',
    family: 'centreStack',
  },
  centerStackBottom: {
    rect: { x: 288, y: 360, w: 704, h: 184 },
    role: 'content',
    flow: 'single',
    family: 'centreStack',
  },
} as const satisfies Record<string, ZoneSpec>;

export type ZoneName = keyof typeof SLIDE_GRID;

/**
 * The allow-list `publishDay` iterates. Publish validates an element's `zone`
 * against THIS, never `Object.keys(...)` of arbitrary data — an unknown zone is
 * dropped rather than carried into a snapshot.
 */
export const ZONE_NAMES = Object.keys(SLIDE_GRID) as ZoneName[];

export const isZoneName = (v: unknown): v is ZoneName =>
  typeof v === 'string' && (ZONE_NAMES as string[]).includes(v);

/** The zones each middle-band family owns. */
export const ZONE_FAMILIES: Record<
  Exclude<ZoneFamily, 'any' | 'chrome'>,
  ZoneName[]
> = {
  body: ['body'],
  bodyShort: ['bodyShort', 'tileRow'],
  split: ['left', 'right', 'mediaLeft', 'mediaRight'],
  hero: ['heroMedia'],
  rows: ['rowA', 'rowB', 'rowC'],
  cta: ['ctaCenter'],
  centreStack: ['centerStackTop', 'centerStackBottom'],
};

/**
 * `subtitle` only combines with families that leave its band free. `hero`,
 * `rows` and `centreStack` all begin inside y 208–280 and replace it — the
 * teacher's objectives and "Last 5" slides carry a title and their rows, never
 * a separate prompt line.
 */
export const SUBTITLE_COMPATIBLE: ZoneFamily[] = ['body', 'bodyShort', 'split'];

/**
 * NOTE on `cta`: the spec's rule justifies excluding a family from `subtitle`
 * by that family "beginning inside its band". `ctaCenter` starts at y=352, well
 * clear of the subtitle band which ends at 280 — so cta's exclusion is a DESIGN
 * choice (a call-to-action slide is title + CTA), not a geometric necessity.
 * Recorded here because the stated reason and the stated list disagree, and a
 * future reader should change this deliberately rather than as a "fix".
 */

/** `centreStack` is a full takeover: no title, no utility link. */
export const CENTRESTACK_EXCLUDES: ZoneName[] = ['title', 'utilityTopRight'];

export const zoneSpec = (zone: ZoneName): ZoneSpec => SLIDE_GRID[zone];

export const zoneRect = (zone: ZoneName): ZoneRect => SLIDE_GRID[zone].rect;

/** True when two rects overlap at all. */
export const rectsOverlap = (a: ZoneRect, b: ZoneRect): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const centroid = (r: ZoneRect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/**
 * The zones a legacy block may migrate INTO.
 *
 * Deliberately not "every content zone". `utilityTopRight` is a single-link
 * slot up in the chrome band — a migrating body block whose centroid drifted
 * high must never land there — and `footer` is excluded because only
 * interaction elements belong in it, and those pass `['footer']` explicitly.
 *
 * NOTE on precision: `left` and `mediaLeft` centroids are 0.5px apart
 * ((344,446) vs (344,445.5)), so a tie resolves by declaration order. Callers
 * that care about text-vs-media MUST pass an explicit candidate list rather
 * than relying on that margin — `migrateDeckV1` does.
 */
export const MIGRATION_TARGETS: readonly ZoneName[] = [
  'title',
  'subtitle',
  'body',
  'bodyShort',
  'tileRow',
  'left',
  'right',
  'mediaLeft',
  'mediaRight',
  'heroMedia',
  'rowA',
  'rowB',
  'rowC',
  'ctaCenter',
  'centerStackTop',
  'centerStackBottom',
];

/**
 * The nearest CONTENT zone to an arbitrary rect, by centroid distance.
 *
 * This is how v1 migration resolves a stored `{x,y,w,h}`: a block the teacher
 * dragged to the right half lands in `right`, not in whatever the preset
 * default happened to be. Deterministic — ties break by zone order.
 */
export const nearestZone = (
  rect: ZoneRect,
  candidates: readonly ZoneName[] = MIGRATION_TARGETS,
): ZoneName => {
  if (candidates.length === 0) {
    // Returning candidates[0] here would hand back `undefined` typed as a
    // ZoneName and strand the element at render.
    throw new Error('nearestZone requires at least one candidate zone');
  }
  const c = centroid(rect);
  let best = candidates[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const zone of candidates) {
    const zc = centroid(SLIDE_GRID[zone].rect);
    const d = (zc.x - c.x) ** 2 + (zc.y - c.y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = zone;
    }
  }
  return best;
};

// ── Validation and rect resolution ──────────────────────────────────────────

export interface LayoutIssue {
  /** Machine-readable so the editor can refuse a drag with a REASON. */
  code:
    | 'unknown-zone'
    | 'zone-is-chrome'
    | 'zone-overfull'
    | 'mixed-families'
    | 'subtitle-incompatible'
    | 'centrestack-exclusive'
    | 'interaction-outside-footer';
  message: string;
  elementId?: string;
  zone?: string;
}

/** The minimum an element must look like for validation. */
export interface ValidatableElement {
  id: string;
  zone: string;
  kind: string;
  hidden?: boolean;
}

/**
 * Every rule the grid promises, checked in one place.
 *
 * Returns issues rather than throwing: the editor uses it to refuse a drag with
 * an explanation, and `presets.test.ts` uses it to prove every shipped preset is
 * legal. A slide with issues is a bug in whatever produced it, not something to
 * paper over at render.
 */
export const validateLayout = (
  elements: readonly ValidatableElement[],
): LayoutIssue[] => {
  const issues: LayoutIssue[] = [];
  const visible = elements.filter((e) => !e.hidden);

  const byZone = new Map<string, ValidatableElement[]>();
  for (const el of visible) {
    if (!isZoneName(el.zone)) {
      issues.push({
        code: 'unknown-zone',
        message: `"${el.zone}" is not a zone in SLIDE_GRID.`,
        elementId: el.id,
        zone: el.zone,
      });
      continue;
    }
    const spec = SLIDE_GRID[el.zone];

    // Interaction elements are valid ONLY in the footer band.
    if (el.kind === 'interaction' && el.zone !== 'footer') {
      issues.push({
        code: 'interaction-outside-footer',
        message: `Interactions live in the footer band, not in "${el.zone}".`,
        elementId: el.id,
        zone: el.zone,
      });
    }
    // Chrome is rendered from flags; content may not be placed there.
    if (spec.role === 'chrome') {
      issues.push({
        code: 'zone-is-chrome',
        message: `"${el.zone}" is chrome and cannot hold content.`,
        elementId: el.id,
        zone: el.zone,
      });
    }

    byZone.set(el.zone, [...(byZone.get(el.zone) ?? []), el]);
  }

  // Zone capacity.
  for (const [zone, els] of byZone) {
    if (!isZoneName(zone)) continue;
    const spec = SLIDE_GRID[zone];
    const cap =
      spec.flow === 'single'
        ? 1
        : spec.flow === 'row'
          ? (spec.max ?? Infinity)
          : Infinity;
    if (els.length > cap) {
      issues.push({
        code: 'zone-overfull',
        message: `"${zone}" holds ${els.length} elements but allows ${cap}.`,
        zone,
      });
    }
  }

  // Middle-band families are mutually exclusive.
  const families = new Set<ZoneFamily>();
  for (const zone of byZone.keys()) {
    if (!isZoneName(zone)) continue;
    const fam = SLIDE_GRID[zone].family;
    if (fam !== 'any' && fam !== 'chrome') families.add(fam);
  }
  if (families.size > 1) {
    issues.push({
      code: 'mixed-families',
      message: `A slide may use one middle-band family; found ${[...families].join(' + ')}.`,
    });
  }

  const family = [...families][0];

  // `subtitle` only combines with families that leave its band free.
  if (
    byZone.has('subtitle') &&
    family &&
    !SUBTITLE_COMPATIBLE.includes(family)
  ) {
    issues.push({
      code: 'subtitle-incompatible',
      message: `A "${family}" slide replaces the subtitle band; move that text into the family's own zones.`,
      zone: 'subtitle',
    });
  }

  // `centreStack` is a full takeover.
  if (family === 'centreStack') {
    for (const excluded of CENTRESTACK_EXCLUDES) {
      if (byZone.has(excluded)) {
        issues.push({
          code: 'centrestack-exclusive',
          message: `A centre-stack slide cannot also use "${excluded}".`,
          zone: excluded,
        });
      }
    }
  }

  return issues;
};

export interface ResolvedElementRect<T> {
  element: T;
  rect: ZoneRect;
}

/**
 * Derive a rectangle for every visible element.
 *
 * This is the ONLY place a rect comes from. Elements never store geometry; a
 * `column` zone stacks its elements evenly with `ZONE_GAP`, a `row` zone splits
 * horizontally, and `single` fills the zone. Hidden elements are skipped —
 * which is how a removed title disappears on every surface at once.
 */
export const resolveElementRects = <
  T extends { id: string; zone: string; order?: number; hidden?: boolean },
>(
  elements: readonly T[],
): ResolvedElementRect<T>[] => {
  const out: ResolvedElementRect<T>[] = [];
  const byZone = new Map<ZoneName, T[]>();

  for (const el of elements) {
    if (el.hidden || !isZoneName(el.zone)) continue;
    byZone.set(el.zone, [...(byZone.get(el.zone) ?? []), el]);
  }

  for (const [zone, raw] of byZone) {
    const spec = SLIDE_GRID[zone];
    const { x, y, w, h } = spec.rect;
    // Stable: `order` first, then the original array position.
    const els = [...raw].sort(
      (a, b) =>
        (a.order ?? Number.MAX_SAFE_INTEGER) -
          (b.order ?? Number.MAX_SAFE_INTEGER) ||
        raw.indexOf(a) - raw.indexOf(b),
    );

    if (spec.flow === 'single' || els.length === 1) {
      for (const element of els) out.push({ element, rect: { x, y, w, h } });
      continue;
    }

    const n = els.length;
    const gaps = ZONE_GAP * (n - 1);
    if (spec.flow === 'row') {
      const each = (w - gaps) / n;
      els.forEach((element, i) =>
        out.push({
          element,
          rect: { x: x + i * (each + ZONE_GAP), y, w: each, h },
        }),
      );
    } else {
      const each = (h - gaps) / n;
      els.forEach((element, i) =>
        out.push({
          element,
          rect: { x, y: y + i * (each + ZONE_GAP), w, h: each },
        }),
      );
    }
  }

  return out;
};

/**
 * Where a revealed interaction's visualization renders.
 *
 * Rule 9 confines interaction ELEMENTS to the 100px `footer` strip, but a
 * reveal — bars, card wall, word cloud, scale — needs a body-sized area. None
 * of the four styles fits 100px. Rather than invent a zone nothing authors or
 * an element nothing publishes, the reveal is a surface-injected SLOT
 * (`SlideRenderer`'s `reveal`) rendered at the slide's occupied middle band.
 *
 * This generalises a mechanism the spec already relies on twice: Rule 9 renders
 * a draw interaction's overlay at another element's zone rect, and P5 puts the
 * projector join code in the footer band as surface-injected content.
 *
 * The band is the union of the slide's occupied MIDDLE-BAND zones — `title`,
 * `subtitle` and `utilityTopRight` are excluded (family `any`) so a reveal
 * never covers the slide's own heading. It is floored to the `body` rect,
 * which is what stops a `cta` slide handing a reveal a 448×128 box.
 *
 * Returns a rect only; the caller overlays it with a scrim and does NOT reflow
 * the band's elements — Rule 2 promises that showing an interaction never moves
 * the content above it.
 */
export const revealBandRect = (
  elements: readonly { zone: string; hidden?: boolean }[],
): ZoneRect => {
  const body = SLIDE_GRID.body.rect;

  const rects = elements
    .filter((e) => !e.hidden && isZoneName(e.zone))
    .map((e) => SLIDE_GRID[e.zone as ZoneName])
    // Middle-band zones only: `any` (title/subtitle/utility) and chrome are
    // not part of the band the reveal may take.
    .filter((spec) => spec.role === 'content' && spec.family !== 'any')
    .map((spec) => spec.rect);

  if (rects.length === 0) return body;

  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  const union: ZoneRect = { x, y, w: right - x, h: bottom - y };

  // A band smaller than `body` in either dimension gives the reveal less room
  // than the plainest slide would; fall back rather than cramp it.
  return union.w >= body.w && union.h >= body.h ? union : body;
};

/**
 * Re-apply a preset to a slide — the editor's "Reset to standard".
 *
 * Because elements are DERIVED, this only has to set `presetId` (and the
 * accent-bar flag the preset implies) and drop the teacher's freeform rects:
 * `migrateSlideV1` reads the preset on the next render. There is no element
 * list to rewrite, which is precisely why the derived model was chosen.
 *
 * `layout` is deprecated and declared read-only, so it is cleared by omission
 * rather than assignment — a slide that has been reset carries no stored rects
 * at all, and the preset is then the only thing deciding zones.
 */
export const resetToPreset = <
  T extends { presetId?: string; accentBar?: boolean; layout?: unknown },
>(
  slide: T,
  presetId: string,
  presetAccentBar = false,
): T => {
  const next = { ...slide, presetId } as T & { accentBar?: boolean };
  delete (next as { layout?: unknown }).layout;
  if (presetAccentBar) next.accentBar = true;
  else delete (next as { accentBar?: boolean }).accentBar;
  return next;
};

/**
 * Reading order for the student reflow below 768px.
 *
 * The spec states this order once (§Standardized Slide Grid rule 11) and it
 * covers only 13 of the 17 content zones. Coded verbatim it would drop
 * `bodyShort` — which carries the ONLY body text on the genre, studio and eras
 * add-slide templates — and `centerStackTop`/`centerStackBottom`, which are the
 * only content zones a centre-stack slide has, so a "Last 5" slide would reflow
 * to a blank screen. The four additions are marked below.
 *
 * `utilityTopRight` sits at y=32 beside the phase chip, so it reads before the
 * title rather than after the body — geometric order, not list order.
 *
 * `REFLOW_ORDER_TEST` in slideGrid.test.ts asserts this lists every content
 * zone exactly once, which is the property the spec's own list fails.
 */
export const REFLOW_ORDER: readonly ZoneName[] = [
  'phaseChip',
  'utilityTopRight', // + not in the spec's list
  'title',
  'subtitle',
  'rowA',
  'rowB',
  'rowC',
  'heroMedia',
  'mediaLeft',
  'left',
  'right',
  'mediaRight',
  'body',
  'bodyShort', // + not in the spec's list
  'centerStackTop', // + not in the spec's list
  'centerStackBottom', // + not in the spec's list
  'ctaCenter',
  'tileRow',
  'footer',
];

/**
 * Where the surface-injected live layer goes in the reflow.
 *
 * The spec's order ends with `footer`, which is where the interaction ELEMENT
 * lives — but on a student device the question and the input are not in the
 * footer at all: they are painted over the middle band by `SlideStage`. A
 * reflow that iterated zones alone would drop the one thing the student is
 * there to do. The band takes the middle band's place in the column, which is
 * directly after the subtitle.
 */
export const REFLOW_BAND_AFTER: ZoneName = 'subtitle';

/**
 * True when the slide authored content into its middle band.
 *
 * A reveal always overlays the band with a scrim — a shared aggregate is worth
 * covering a picture for, and it is transient. The PRE-reveal live layer (the
 * question, the student's input) is not: it is on screen for the whole slide,
 * so it may only take the band when the band is empty. A slide that authored a
 * picture there keeps it, and its interaction stays in the footer strip where
 * Rule 9 puts it.
 */
export const hasBandContent = (
  elements: readonly { zone: string; hidden?: boolean }[],
): boolean =>
  elements.some(
    (e) =>
      !e.hidden &&
      isZoneName(e.zone) &&
      SLIDE_GRID[e.zone as ZoneName].role === 'content' &&
      SLIDE_GRID[e.zone as ZoneName].family !== 'any',
  );

/** Inset between the reveal band's edge and its visualization, in design px. */
export const REVEAL_BAND_PADDING = 16;

/**
 * The height a reveal visualization can actually use, after the band's own
 * padding. Callers MUST pass this (not the raw band height) when sizing a
 * chart, or the last row sits under the padding and is clipped.
 */
export const revealContentHeight = (
  elements: readonly { zone: string; hidden?: boolean }[],
): number => revealBandRect(elements).h - REVEAL_BAND_PADDING * 2;
