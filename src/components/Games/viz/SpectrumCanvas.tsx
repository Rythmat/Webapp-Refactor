import { useRef, useEffect } from 'react';

interface SpectrumCanvasProps {
  /** Float32Array of FFT magnitude values (dB) */
  getData: () => Float32Array;
  /** Bar color */
  color?: string;
  /** Floor level in dB (values below this are clamped) */
  minDb?: number;
  /** Ceiling level in dB */
  maxDb?: number;
  className?: string;
}

/**
 * Renders a real-time FFT spectrum bar graph on a canvas element.
 * Themed to dark background with neon bar colors.
 */
export function SpectrumCanvas({
  getData,
  color = '#38bdf8',
  minDb = -100,
  maxDb = -10,
  className = '',
}: SpectrumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const { width, height } = canvas;
      const data = getData();
      const range = maxDb - minDb;

      ctx.clearRect(0, 0, width, height);

      const barCount = data.length;
      const barWidth = width / barCount;
      const gap = Math.max(1, barWidth * 0.15);

      for (let i = 0; i < barCount; i++) {
        const db = data[i];
        const normalized = Math.max(0, Math.min(1, (db - minDb) / range));
        const barHeight = normalized * height;

        const x = i * barWidth;
        const y = height - barHeight;

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.6 + normalized * 0.4;
        ctx.fillRect(x + gap / 2, y, barWidth - gap, barHeight);

        // Top highlight
        if (barHeight > 2) {
          ctx.fillStyle = '#fff';
          ctx.globalAlpha = 0.4;
          ctx.fillRect(x + gap / 2, y, barWidth - gap, 2);
        }
      }
      ctx.globalAlpha = 1;

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [getData, color, minDb, maxDb]);

  return (
    <canvas
      ref={canvasRef}
      width={512}
      height={128}
      className={`bg-transparent ${className}`}
    />
  );
}
