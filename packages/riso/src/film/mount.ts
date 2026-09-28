/**
 * Mount a film onto a canvas and publish the `window.__riso` contract.
 *
 * This is the ONE place canvas sizing lives, and it deliberately contradicts the rest of the app.
 * `src/components/ui/hex-wave-background.tsx` clamps devicePixelRatio to 2 and sizes the backing
 * store to the parent — correct for an ambient canvas, wrong here. The halftone pitch is 4.6
 * DEVICE pixels, so a DPR-dependent backing store changes the dot lattice: on a 2x display the
 * screen comes out twice as fine and the print reads as a flat grey wash instead of a risograph.
 *
 * So the backing store is fixed at OUT and the CSS box is sized independently. On a retina display
 * the browser upscales 1080 into a 720px box, which is exactly what upstream does — and what the
 * tools' `deviceScaleFactor: size/css` trick compensates for when screenshotting.
 *
 * Playback reads a wall clock (`at = (now - epoch) / 1000`) rather than accumulating per-frame
 * deltas, because accumulated dt drifts and would make the picture disagree with an exported MP4.
 * That clock lives here, in the player — never inside a film, where it would break purity.
 */
import { CSS, OUT } from '../core/constants.ts';
import type { RisoFilm } from './contract.ts';

export interface MountOptions {
  /** CSS width/height in px. The backing store is always OUT and ignores DPR. */
  cssSize?: number;
  /** Publish window.__riso for the tools. Default true. */
  publish?: boolean;
  /** Honour ?t=12.5 on load. Default true. */
  readQuery?: boolean;
}

export interface Mounted {
  /** Render exactly the frame at t and stop. */
  seek(t: number): void;
  play(): void;
  pause(): void;
  readonly playing: boolean;
  destroy(): void;
}

export function mountFilm(
  canvas: HTMLCanvasElement,
  film: RisoFilm,
  { cssSize = CSS, publish = true, readQuery = true }: MountOptions = {},
): Mounted {
  canvas.width = OUT;
  canvas.height = OUT;
  canvas.style.width = `${cssSize}px`;
  canvas.style.height = `${cssSize}px`;
  // Never 'pixelated': the halftone is meant to be resampled smoothly into the CSS box.
  canvas.style.imageRendering = 'auto';

  let at = 0;
  let playing = false;
  let raf = 0;
  let epoch = 0;

  const clampT = (t: number): number => Math.min(Math.max(t, 0), film.duration);

  const seek = (t: number): void => {
    at = clampT(t);
    film.seek(at);
  };

  const tick = (now: number): void => {
    if (!playing) return;
    at = clampT((now - epoch) / 1000);
    film.seek(at);
    if (at >= film.duration) {
      playing = false;
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  const play = (): void => {
    if (playing) return;
    if (at >= film.duration) at = 0;
    playing = true;
    epoch = performance.now() - at * 1000;
    raf = requestAnimationFrame(tick);
  };

  const pause = (): void => {
    playing = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'ArrowRight') seek(at + (e.shiftKey ? 1 : 1 / 30));
    else if (e.key === 'ArrowLeft') seek(at - (e.shiftKey ? 1 : 1 / 30));
    else if (e.key === ' ') {
      e.preventDefault();
      playing ? pause() : play();
    } else return;
  };
  window.addEventListener('keydown', onKey);

  const start = readQuery
    ? Number(new URLSearchParams(location.search).get('t')) || 0
    : 0;
  seek(start);

  if (publish) {
    window.__riso = film;
    film.ready = true;
  }

  return {
    seek,
    play,
    pause,
    get playing() {
      return playing;
    },
    destroy() {
      pause();
      window.removeEventListener('keydown', onKey);
      if (publish && window.__riso === film) delete window.__riso;
    },
  };
}
