import { cyclesIn } from './physics/wave';

// ── A sine wave on a lab's stage ───────────────────────────────────────────
// Drawn to a true, linear time scale: `windowMs` across the width, so twice the
// frequency is twice the cycles. `phase`, in cycles, only slides it along for
// the eye; the real wave would be a blur.

export interface WaveLine {
  hz: number;
  windowMs: number;
  /** In cycles. */
  phase: number;
  /** 0..1 of the band's half height. */
  amplitude?: number;
  color: string;
  lineWidth?: number;
}

/** The height of a wave at x (0..width), as −1..1 before its amplitude. */
const waveAt = (x: number, width: number, cycles: number, phase: number) =>
  Math.sin(2 * Math.PI * ((x / width) * cycles - phase));

export function drawWave(
  ctx: CanvasRenderingContext2D,
  line: WaveLine,
  band: { x: number; y: number; width: number; height: number },
) {
  const cycles = cyclesIn(line.hz, line.windowMs);
  const mid = band.y + band.height / 2;
  const reach = (band.height / 2) * 0.86 * (line.amplitude ?? 1);
  ctx.beginPath();
  // Half-pixel steps stay smooth at the finest wave the window allows.
  for (let x = 0; x <= band.width; x += 0.5) {
    const y = mid - waveAt(x, band.width, cycles, line.phase) * reach;
    if (x === 0) ctx.moveTo(band.x + x, y);
    else ctx.lineTo(band.x + x, y);
  }
  ctx.strokeStyle = line.color;
  ctx.lineWidth = line.lineWidth ?? 2;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** The band's centre line: where the air is at rest. */
export function drawRestLine(
  ctx: CanvasRenderingContext2D,
  band: { x: number; y: number; width: number; height: number },
) {
  const mid = Math.round(band.y + band.height / 2) + 0.5;
  ctx.beginPath();
  ctx.moveTo(band.x, mid);
  ctx.lineTo(band.x + band.width, mid);
  ctx.strokeStyle = 'rgb(255 255 255 / 0.14)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** Too tight to mark below this: the bracket would sit on its own label. */
const MIN_MARK_PX = 44;

/**
 * λ over one whole cycle, peak to peak, sliding with the wave. Skipped when the
 * cycles are too fine to bracket.
 */
export function drawWavelengthMark(
  ctx: CanvasRenderingContext2D,
  line: WaveLine,
  band: { x: number; y: number; width: number; height: number },
  font: string,
) {
  const cycles = cyclesIn(line.hz, line.windowMs);
  const span = band.width / cycles;
  if (span < MIN_MARK_PX || span > band.width * 0.9) return;
  // The first peak in view: sin = 1 at a quarter of a cycle past the phase.
  const firstPeak = (((line.phase + 0.25) % 1) + 1) % 1;
  let start = band.x + firstPeak * span;
  if (start + span > band.x + band.width) start -= span;
  if (start < band.x) start += span;
  if (start + span > band.x + band.width) return;
  const y = Math.round(band.y + 12) + 0.5;
  ctx.beginPath();
  ctx.moveTo(start, y - 4);
  ctx.lineTo(start, y + 4);
  ctx.moveTo(start, y);
  ctx.lineTo(start + span, y);
  ctx.moveTo(start + span, y - 4);
  ctx.lineTo(start + span, y + 4);
  ctx.strokeStyle = 'rgb(255 255 255 / 0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // On a little plate, so the wave doesn't run through the letter.
  const textX = start + span / 2;
  ctx.fillStyle = '#101012';
  ctx.fillRect(textX - 9, y - 8, 18, 16);
  ctx.font = font;
  ctx.fillStyle = 'rgb(255 255 255 / 0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('λ', textX, y);
}

/** A band's name in its corner, on a plate, so the wave passes behind it. */
export function drawBandLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  band: { x: number; y: number; width: number; height: number },
  font: string,
) {
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const width = ctx.measureText(label).width;
  const y = band.y + band.height - 16;
  ctx.fillStyle = 'rgb(16 16 18 / 0.85)';
  ctx.beginPath();
  ctx.roundRect(band.x + 6, y - 11, width + 14, 22, 11);
  ctx.fill();
  ctx.fillStyle = 'rgb(255 255 255 / 0.8)';
  ctx.fillText(label, band.x + 13, y);
}

/** A name on a plate at a place, kept inside the stage. */
export function drawTag(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  stageWidth: number,
) {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const half = ctx.measureText(text).width / 2 + 8;
  const cx = Math.min(stageWidth - half - 2, Math.max(half + 2, x));
  ctx.fillStyle = 'rgb(16 16 18 / 0.9)';
  ctx.beginPath();
  ctx.roundRect(cx - half, y - 11, half * 2, 22, 11);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, cx, y);
}

/** The app's type at a size in rem, for text on a canvas. */
export function canvasFont(canvas: HTMLCanvasElement, rem: number): string {
  const root = parseFloat(
    getComputedStyle(document.documentElement).fontSize || '16',
  );
  const family = getComputedStyle(canvas).fontFamily || 'sans-serif';
  return `${root * rem}px ${family}`;
}
