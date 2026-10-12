import { type RefObject, useEffect, useRef } from 'react';
import {
  meterAnalysers,
  meterSource,
  subscribeMeterFrames,
} from '@/daw/engine/meterBus';

// ── useSpectrumCanvas ────────────────────────────────────────────────────
// A spectrum display on the meter bus. The bus's analysers are tuned for
// metering and shared, so a spectrum never retunes them: it connects its
// own AnalyserNode to the source's (an AnalyserNode passes its input
// through) and reads that one. It draws once per bus frame, so only while
// the transport plays or the source has a signal, and once more, empty,
// when the bus comes to rest. The canvas follows its container's size
// (ResizeObserver, device pixels) and every buffer is reused.

export interface SpectrumFrame {
  ctx: CanvasRenderingContext2D;
  /** The canvas size in CSS pixels (the context is already scaled). */
  width: number;
  height: number;
  /** The byte frequency data (all zeros when at rest). */
  data: Uint8Array;
  sampleRate: number;
  /** True when the canvas was resized since the last draw. */
  resized: boolean;
}

export interface SpectrumOptions {
  fftSize?: number;
  smoothing?: number;
  /** Which of the source's channels to tap. Default 0 (the left). */
  channel?: number;
}

export function useSpectrumCanvas(
  key: string | null,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  containerRef: RefObject<HTMLElement | null>,
  draw: (frame: SpectrumFrame) => void,
  { fftSize = 2048, smoothing = 0.85, channel = 0 }: SpectrumOptions = {},
): void {
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!key || !canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let from: AnalyserNode | null = null;
    let own: AnalyserNode | null = null;
    let data = new Uint8Array(fftSize / 2);
    let sampleRate = 44100;
    let width = 0;
    let height = 0;
    let resized = true;

    const untap = () => {
      if (from && own) {
        try {
          from.disconnect(own);
        } catch {
          /* already disconnected (the engine was rebuilt) */
        }
      }
      from = null;
      own = null;
    };

    // Follow the source's analyser: the engine may build or rebuild it.
    const tap = () => {
      const shared = meterAnalysers(key)[channel] ?? null;
      if (shared === from) return;
      untap();
      if (!shared) return;
      const node = shared.context.createAnalyser();
      node.fftSize = fftSize;
      node.smoothingTimeConstant = smoothing;
      shared.connect(node);
      from = shared;
      own = node;
      sampleRate = shared.context.sampleRate;
      if (data.length !== node.frequencyBinCount) {
        data = new Uint8Array(node.frequencyBinCount);
      }
    };

    const paint = (read: boolean) => {
      if (width === 0 || height === 0) return;
      if (read) {
        tap();
        if (own) own.getByteFrequencyData(data);
        else data.fill(0);
      }
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawRef.current({ ctx, width, height, data, sampleRate, resized });
      resized = false;
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      resized = true;
      paint(false);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    // The source subscription keeps the bus probing this signal; the frame
    // subscription is the draw clock.
    const offSource = meterSource(key).subscribe(() => {});
    const offFrames = subscribeMeterFrames((running) => {
      if (running) {
        paint(true);
      } else {
        data.fill(0);
        paint(false);
      }
    });

    return () => {
      offFrames();
      offSource();
      observer.disconnect();
      untap();
    };
  }, [key, canvasRef, containerRef, fftSize, smoothing, channel]);
}
