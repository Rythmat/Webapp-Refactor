/**
 * slideLayout — the pure, React-free core of the freeform slide layout.
 *
 * A slide's positionable blocks live on a fixed 1280×720 design canvas (px,
 * top-left origin). `slide.layout` stores only the blocks a teacher has touched;
 * everything else resolves from a per-kind default that reproduces the classic
 * arrangement. All values are numbers/booleans over a fixed key set, so the
 * layout is firewall-safe by construction (see publishDay.projectSlideLayout).
 */
import type {
  Slide,
  SlideBlockKey,
  SlideBlockRect,
  SlideKind,
  SlideLayout,
} from './types';

export const SLIDE_CANVAS = { w: 1280, h: 720 } as const;
export const MIN_BLOCK = { w: 96, h: 40 } as const;

/** Side/‌top safe margins (design px) — mirror SlideFrame's 4%/3% padding. */
const M = 64;
const CONTENT_W = SLIDE_CANVAS.w - M * 2; // 1152

/** Which blocks a slide kind can show (drives the re-add tray + defaults). */
export const blocksForKind = (slide: Slide): SlideBlockKey[] => {
  switch (slide.kind) {
    case 'content':
      return [
        'title',
        'prompt',
        'body',
        'media',
        'sideMedia',
        'launchTiles',
        ...(slide.phase === 'respondReflectReset'
          ? (['resetChecklist'] as const)
          : []),
      ];
    case 'media':
      return ['title', 'prompt', 'media', 'sideMedia'];
    case 'interaction':
      return ['title', 'prompt', 'media', 'interaction'];
    case 'app-route':
    case 'studio-collab':
    case 'showcase':
      return ['title', 'prompt', 'interaction'];
  }
};

/**
 * Default rects per kind — a clean arrangement close to the classic flow.
 * Media-bearing slides get a right-hand square; text stacks on the left.
 */
export const defaultLayoutForKind = (slide: Slide): SlideLayout => {
  const hasMedia = 'media' in slide && !!slide.media;
  if (hasMedia) {
    return {
      title: { x: M, y: 116, w: 664, h: 120 },
      prompt: { x: M, y: 244, w: 664, h: 96 },
      body: { x: M, y: 348, w: 664, h: 170 },
      media: { x: 760, y: 128, w: 456, h: 456 },
      // Second visual (e.g. a song's artist image) — mid-left, clear of media.
      sideMedia: { x: M, y: 356, w: 300, h: 230 },
      interaction: { x: M, y: 348, w: 664, h: 236 },
      launchTiles: { x: M, y: 600, w: CONTENT_W, h: 96 },
      resetChecklist: { x: M, y: 600, w: 664, h: 104 },
    };
  }
  return {
    title: { x: M, y: 130, w: CONTENT_W, h: 150 },
    prompt: { x: M, y: 292, w: CONTENT_W, h: 110 },
    body: { x: M, y: 414, w: CONTENT_W, h: 176 },
    media: { x: M, y: 292, w: 560, h: 300 },
    sideMedia: { x: 656, y: 292, w: 300, h: 230 },
    // Below the prompt (which ends at y≈402) so the question preview never
    // overlaps the prompt placeholder on the authoring canvas.
    interaction: { x: M, y: 414, w: CONTENT_W, h: 264 },
    launchTiles: { x: M, y: 604, w: CONTENT_W, h: 96 },
    resetChecklist: { x: M, y: 560, w: CONTENT_W, h: 130 },
  };
};

/** Stored layout merged OVER the kind default (stored rect wins per key). */
export const resolveLayout = (slide: Slide): SlideLayout => {
  const defaults = defaultLayoutForKind(slide);
  const stored = slide.layout ?? {};
  const out: SlideLayout = { ...defaults };
  for (const key of Object.keys(stored) as SlideBlockKey[]) {
    const rect = stored[key];
    if (rect) out[key] = { ...defaults[key], ...rect };
  }
  return out;
};

/** Clamp a rect to the canvas and enforce the minimum size. */
export const clampRect = (rect: SlideBlockRect): SlideBlockRect => {
  const w = Math.min(SLIDE_CANVAS.w, Math.max(MIN_BLOCK.w, Math.round(rect.w)));
  const h = Math.min(SLIDE_CANVAS.h, Math.max(MIN_BLOCK.h, Math.round(rect.h)));
  const x = Math.min(SLIDE_CANVAS.w - w, Math.max(0, Math.round(rect.x)));
  const y = Math.min(SLIDE_CANVAS.h - h, Math.max(0, Math.round(rect.y)));
  return { ...rect, x, y, w, h };
};

/** Snap a value to a grid step (default 8px design units). */
export const snap = (value: number, grid = 8): number =>
  Math.round(value / grid) * grid;

/** Translate a rect by a design-space delta. */
export const applyMove = (
  rect: SlideBlockRect,
  dx: number,
  dy: number,
): SlideBlockRect => ({ ...rect, x: rect.x + dx, y: rect.y + dy });

export type ResizeEdge = 'n' | 's' | 'e' | 'w';

/** Resize a rect by dragging one or more edges (design-space delta). */
export const applyResize = (
  rect: SlideBlockRect,
  edges: ResizeEdge[],
  dx: number,
  dy: number,
): SlideBlockRect => {
  let { x, y, w, h } = rect;
  if (edges.includes('e')) w = w + dx;
  if (edges.includes('s')) h = h + dy;
  if (edges.includes('w')) {
    w = w - dx;
    x = x + dx;
  }
  if (edges.includes('n')) {
    h = h - dy;
    y = y + dy;
  }
  return { ...rect, x, y, w, h };
};

/** Merge a single block rect into a slide's stored layout. */
export const withBlock = (
  layout: SlideLayout | undefined,
  key: SlideBlockKey,
  rect: SlideBlockRect,
): SlideLayout => ({ ...(layout ?? {}), [key]: rect });

/** Hide a block on every surface (seeding its rect from the resolved layout). */
export const hideBlock = (slide: Slide, key: SlideBlockKey): SlideLayout => {
  const base = resolveLayout(slide)[key] ?? defaultLayoutForKind(slide)[key];
  return withBlock(slide.layout, key, {
    ...(base ?? { x: M, y: M, w: 400, h: 120 }),
    hidden: true,
  });
};

/** Show a block, seeding its rect from the default when it was never placed. */
export const showBlock = (slide: Slide, key: SlideBlockKey): SlideLayout => {
  const base = slide.layout?.[key] ??
    defaultLayoutForKind(slide)[key] ?? { x: M, y: M, w: 400, h: 120 };
  return withBlock(slide.layout, key, { ...base, hidden: false });
};

const maxZ = (layout: SlideLayout): number =>
  Math.max(0, ...Object.values(layout).map((r) => r?.z ?? 0));

export const bringToFront = (slide: Slide, key: SlideBlockKey): SlideLayout => {
  const resolved = resolveLayout(slide);
  const base = resolved[key] ?? { x: M, y: M, w: 400, h: 120 };
  return withBlock(slide.layout, key, { ...base, z: maxZ(resolved) + 1 });
};

export const sendToBack = (slide: Slide, key: SlideBlockKey): SlideLayout => {
  const resolved = resolveLayout(slide);
  const base = resolved[key] ?? { x: M, y: M, w: 400, h: 120 };
  return withBlock(slide.layout, key, { ...base, z: -1 });
};

/** Is a block currently hidden on this slide? */
export const isBlockHidden = (slide: Slide, key: SlideBlockKey): boolean =>
  slide.layout?.[key]?.hidden === true;

/** Blocks the kind supports that are currently hidden — the re-add tray list. */
export const hiddenBlocks = (slide: Slide): SlideBlockKey[] =>
  blocksForKind(slide).filter((key) => isBlockHidden(slide, key));

/** On a kind change, keep only layout entries the new kind still supports. */
export const preserveLayoutOnKindChange = (
  layout: SlideLayout | undefined,
  nextKind: SlideKind,
  nextPhase: Slide['phase'],
): SlideLayout | undefined => {
  if (!layout) return undefined;
  // Build a minimal slide-like to reuse blocksForKind's kind/phase logic.
  const allowed = new Set(
    blocksForKind({ kind: nextKind, phase: nextPhase } as Slide),
  );
  const out: SlideLayout = {};
  for (const key of Object.keys(layout) as SlideBlockKey[]) {
    if (allowed.has(key) && layout[key]) out[key] = layout[key];
  }
  return Object.keys(out).length ? out : undefined;
};
