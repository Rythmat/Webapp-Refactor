import type { DawPalette } from '@/daw/ui/tokens';

// ── Clip chrome (milestone 2.12) ────────────────────────────────────────────
//
// What a clip shows besides its notes or waveform, after Soundtrap's clips
// (anatomy §5, ST2): a header with its name and, on a pitched track, its key;
// trim zones on both edges; and on audio clips a fade handle in each top
// corner. Small helpers the canvas draws with and hit-tests against, kept out
// of Timeline.tsx so 3.3 can lift them out with the renderer.

/** The header band across a clip's top: its name and key. */
export const CLIP_HEADER_PX = 16;
/** How far in from each edge a press trims the clip instead of moving it. */
export const TRIM_ZONE_PX = 10;
/** An audio clip's fade handle: a square in a top corner. */
export const FADE_HANDLE_PX = 10;
/** Extra room around a fade handle that still grabs it. */
const FADE_HANDLE_SLOP = 3;
/** A clip narrower than this can only be moved from its left edge, so a
 *  thin clip stays draggable. */
const LEFT_TRIM_MIN_W = TRIM_ZONE_PX * 3;

const HEADER_FONT = "12px 'Glacial Indifference', system-ui, sans-serif";
const HEADER_FONT_BOLD =
  "bold 12px 'Glacial Indifference', system-ui, sans-serif";

export interface ChromeBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ClipZone =
  | 'fade-in'
  | 'fade-out'
  | 'trim-left'
  | 'trim-right'
  | 'body';

/** Where an audio clip's fades end, in px from its edges. */
export interface FadeSpan {
  inPx: number;
  outPx: number;
}

interface Square {
  x: number;
  y: number;
  size: number;
}

/**
 * The two fade handles: each sits where its fade ends (in the corner while
 * there is no fade), kept inside the clip.
 */
export function fadeHandles(
  box: ChromeBox,
  fades: FadeSpan,
): { in: Square; out: Square } {
  const size = FADE_HANDLE_PX;
  const lo = box.x + 1;
  const hi = box.x + box.w - size - 1;
  const place = (centre: number) =>
    Math.max(lo, Math.min(hi, centre - size / 2));
  const y = box.y + (CLIP_HEADER_PX - size) / 2;
  return {
    in: { x: place(box.x + fades.inPx + size / 2), y, size },
    out: { x: place(box.x + box.w - fades.outPx - size / 2), y, size },
  };
}

function inSquare(px: number, py: number, sq: Square): boolean {
  return (
    px >= sq.x - FADE_HANDLE_SLOP &&
    px <= sq.x + sq.size + FADE_HANDLE_SLOP &&
    py >= sq.y - FADE_HANDLE_SLOP &&
    py <= sq.y + sq.size + FADE_HANDLE_SLOP
  );
}

/**
 * What a press at (px, py) inside a clip grabs: a fade handle (audio clips,
 * `fades` given), a trim zone, or the clip itself. A fade handle wins over
 * the trim zone it sits in, so the corner squares stay usable.
 */
export function clipZoneAt(
  px: number,
  py: number,
  box: ChromeBox,
  fades?: FadeSpan,
): ClipZone {
  if (fades && box.w >= FADE_HANDLE_PX * 2 + 4) {
    const handles = fadeHandles(box, fades);
    const nearIn = inSquare(px, py, handles.in);
    const nearOut = inSquare(px, py, handles.out);
    if (nearIn && nearOut) {
      const dIn = Math.abs(px - (handles.in.x + FADE_HANDLE_PX / 2));
      const dOut = Math.abs(px - (handles.out.x + FADE_HANDLE_PX / 2));
      return dIn <= dOut ? 'fade-in' : 'fade-out';
    }
    if (nearIn) return 'fade-in';
    if (nearOut) return 'fade-out';
  }
  // A narrow clip keeps a body to grab: the right zone is at most a third
  // of it (the left one only shows on a clip three zones wide).
  const right = Math.min(TRIM_ZONE_PX, box.w / 3);
  if (px >= box.x + box.w - right) return 'trim-right';
  if (box.w > LEFT_TRIM_MIN_W && px <= box.x + TRIM_ZONE_PX) {
    return 'trim-left';
  }
  return 'body';
}

/** `text` cut to `maxW` px with an ellipsis, or '' when nothing fits. */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
): string {
  if (maxW <= 0) return '';
  if (ctx.measureText(text).width <= maxW) return text;
  const ellipsis = '…';
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(text.slice(0, mid) + ellipsis).width <= maxW) lo = mid;
    else hi = mid - 1;
  }
  return lo === 0 ? '' : text.slice(0, lo).trimEnd() + ellipsis;
}

export interface ClipHeader {
  /** The clip's name, or its track's when it has none. */
  title: string;
  /** 'Am', 'C': on pitched clips whose key can be named. */
  keyLabel: string | null;
  muted: boolean;
  /** The track's colour, '#rrggbb'. */
  color: string;
  /** Room the left fade handle takes, so the title starts after it. */
  insetLeft?: number;
  insetRight?: number;
}

function rgbOf(hex: string): string {
  const h = hex.replace('#', '');
  const n = (i: number) => parseInt(h.substring(i, i + 2), 16) || 0;
  return `${n(0)}, ${n(2)}, ${n(4)}`;
}

/**
 * The header band: the track's colour behind the clip's name, its key in
 * bold after it, and "Muted" at the right end of a muted clip. The caller
 * has clipped to the clip's rounded box. Text stays at the 12 px floor and
 * is left out, not shrunk, when the clip is too narrow for it.
 */
export function drawClipHeader(
  ctx: CanvasRenderingContext2D,
  box: ChromeBox,
  header: ClipHeader,
  palette: DawPalette,
): void {
  const band = Math.min(CLIP_HEADER_PX, box.h);
  ctx.fillStyle = `rgba(${rgbOf(header.color)}, ${header.muted ? 0.14 : 0.34})`;
  ctx.fillRect(box.x, box.y, box.w, band);

  const left = box.x + 6 + (header.insetLeft ?? 0);
  let right = box.x + box.w - 6 - (header.insetRight ?? 0);
  const midY = box.y + band / 2 + 0.5;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  if (header.muted) {
    ctx.font = HEADER_FONT;
    const tag = 'Muted';
    const tagW = ctx.measureText(tag).width;
    if (right - left >= tagW + 24) {
      ctx.fillStyle = palette.text3;
      ctx.fillText(tag, right - tagW, midY);
      right -= tagW + 8;
    }
  }

  ctx.font = HEADER_FONT_BOLD;
  const key = header.keyLabel ? ` · ${header.keyLabel}` : '';
  const keyW = key ? ctx.measureText(key).width : 0;
  ctx.font = HEADER_FONT;
  const titleW = ctx.measureText(header.title).width;
  const room = right - left;
  ctx.fillStyle = header.muted ? palette.text3 : palette.text;
  if (key && titleW + keyW <= room) {
    ctx.fillText(header.title, left, midY);
    ctx.font = HEADER_FONT_BOLD;
    ctx.fillText(key, left + titleW, midY);
    return;
  }
  // Too narrow for both: the key is left out first, then the title is cut
  // short.
  const title = fitText(ctx, header.title, room);
  if (title) ctx.fillText(title, left, midY);
}

/**
 * The trim zones made visible: a short grip inside each edge, shown while
 * the clip is selected or under the pointer.
 */
export function drawTrimGrips(
  ctx: CanvasRenderingContext2D,
  box: ChromeBox,
  palette: DawPalette,
): void {
  const body = box.h - CLIP_HEADER_PX;
  if (body < 12 || box.w < TRIM_ZONE_PX * 2) return;
  const gripH = Math.min(18, body * 0.5);
  const y = box.y + CLIP_HEADER_PX + (body - gripH) / 2;
  ctx.fillStyle = `rgba(${palette.lineRgb}, 0.55)`;
  ctx.beginPath();
  ctx.roundRect(box.x + 3, y, 2, gripH, 1);
  ctx.roundRect(box.x + box.w - 5, y, 2, gripH, 1);
  ctx.fill();
}

/** The fade handles: a square in each top corner, at the fade's end. */
export function drawFadeHandles(
  ctx: CanvasRenderingContext2D,
  box: ChromeBox,
  fades: FadeSpan,
  palette: DawPalette,
): void {
  if (box.w < FADE_HANDLE_PX * 2 + 4) return;
  const handles = fadeHandles(box, fades);
  for (const sq of [handles.in, handles.out]) {
    ctx.fillStyle = palette.text;
    ctx.strokeStyle = palette.bg;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(sq.x + 0.5, sq.y + 0.5, sq.size - 1, sq.size - 1, 2);
    ctx.fill();
    ctx.stroke();
  }
}
