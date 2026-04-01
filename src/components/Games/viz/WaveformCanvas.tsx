import { useRef, useEffect } from 'react';

interface WaveformCanvasProps {
  /** Float32Array of waveform samples (-1 to 1) */
  getData: () => Float32Array;
  /** Line color */
  color?: string;
  /** Line width */
  lineWidth?: number;
  className?: string;
}

/**
 * Renders a real-time waveform line on a canvas element.
 * Themed to dark background with neon line colors.
 */
export function WaveformCanvas({
  getData,
  color = '#a78bfa',
  lineWidth = 2,
  className = '',
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const { width, height } = canvas;
      const data = getData();

      ctx.clearRect(0, 0, width, height);

      // Glow effect
      ctx.shadowBlur = 8;
      ctx.shadowColor = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();

      const sliceWidth = width / data.length;
      let x = 0;

      for (let i = 0; i < data.length; i++) {
        const v = data[i];
        const y = ((v + 1) / 2) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }

      ctx.stroke();
      ctx.shadowBlur = 0;

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [getData, color, lineWidth]);

  return (
    <canvas
      ref={canvasRef}
      width={512}
      height={128}
      className={`bg-transparent ${className}`}
    />
  );
}
